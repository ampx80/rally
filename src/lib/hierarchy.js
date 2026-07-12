// ============================================================
// RALLY ACCOUNT HIERARCHY  (sub-companies / parent-child engine)
// Additive selectors + roll-up over the live core store. A company
// carries a `parentCompanyId` (declared in registry-seeds/company.js);
// this module reads that field, walks the parent/child graph, and
// rolls child pipeline / AR / revenue / contacts up the parent chain.
// It writes ONLY through the existing updateCompany() writer in
// store.js, never mutating store internals or the seed array. Cycle
// guards protect every traversal and every parent assignment.
// SUPABASE: rally_companies.parent_company_id (self-referential FK);
// rollups become a recursive CTE / materialized view server-side.
// ============================================================
import {
  getCompanies, getCompany, getDealsForCompany, getContactsForCompany,
  updateCompany,
} from './store.js';
import { getInvoices } from './invoices-data.js';

const SEED_FLAG = 'rally_hierarchy_seeded_v1';

/* ============================================================
   FIELD ACCESS
   parentCompanyId may live as a top-level column (how setParentCompany
   writes it) or inside record.fieldValues (how the registry-driven
   detail panel may persist a link field). Read both, top-level wins.
   ============================================================ */
export function parentIdOf(co) {
  if (!co) return null;
  const top = co.parentCompanyId;
  const fv = co.fieldValues ? co.fieldValues.parentCompanyId : null;
  return (top != null ? top : fv) || null;
}

/* Map of parentId -> [child company]. Built fresh per call so it always
   reflects the current store snapshot (cheap; the book is small). */
function childrenIndex() {
  const idx = new Map();
  for (const c of getCompanies()) {
    const pid = parentIdOf(c);
    if (!pid) continue;
    if (!idx.has(pid)) idx.set(pid, []);
    idx.get(pid).push(c);
  }
  return idx;
}

/* AR outstanding (sent + overdue invoice totals) keyed by companyId. */
function arIndex() {
  const m = new Map();
  for (const inv of getInvoices()) {
    if (inv.status === 'sent' || inv.status === 'overdue') {
      m.set(inv.companyId, (m.get(inv.companyId) || 0) + inv.total);
    }
  }
  return m;
}

/* ============================================================
   SELECTORS  (all pure over the store, all cycle-guarded)
   ============================================================ */

// Immediate parent company, or null.
export function getParent(coId) {
  const pid = parentIdOf(getCompany(coId));
  return pid ? (getCompany(pid) || null) : null;
}

// Direct children of a company.
export function getChildren(coId) {
  return getCompanies().filter(c => parentIdOf(c) === coId);
}

// Ancestors from immediate parent (index 0) up to the root (last).
export function getAncestors(coId) {
  const out = [];
  const seen = new Set([coId]);
  let cur = getParent(coId);
  while (cur && !seen.has(cur.id)) {
    out.push(cur);
    seen.add(cur.id);
    cur = getParent(cur.id);
  }
  return out;
}

// Every company beneath coId, at any depth (flattened, cycle-safe).
export function getDescendants(coId) {
  const idx = childrenIndex();
  const out = [];
  const seen = new Set([coId]);
  const stack = [...(idx.get(coId) || [])];
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    for (const k of (idx.get(c.id) || [])) if (!seen.has(k.id)) stack.push(k);
  }
  return out;
}

// Companies that sit at the top of a tree: no parent, or a dangling
// parent id whose company no longer exists.
export function getRootCompanies() {
  return getCompanies().filter(c => {
    const pid = parentIdOf(c);
    return !pid || !getCompany(pid);
  });
}

// Top-most ancestor of a company (or the company itself if it is a root).
export function getRootOf(coId) {
  const anc = getAncestors(coId);
  return anc.length ? anc[anc.length - 1] : (getCompany(coId) || null);
}

// Nested tree { company, children:[...] } rooted at coId, cycle-guarded.
export function buildTree(coId, _seen) {
  const seen = _seen || new Set();
  const co = getCompany(coId);
  if (!co || seen.has(coId)) return null;
  seen.add(coId);
  const children = getChildren(coId)
    .map(c => buildTree(c.id, seen))
    .filter(Boolean);
  return { company: co, children };
}

/* ============================================================
   ROLL-UP  (self metrics + everything beneath, up the chain)
   Mirrors forecasting-data.js buildRollup: a pure accumulate pass.
   ============================================================ */
function metricsFor(coId, invByCo) {
  let openPipeline = 0, wonRevenue = 0, openDeals = 0;
  for (const d of getDealsForCompany(coId)) {
    if (d.status === 'open') { openPipeline += d.value; openDeals++; }
    else if (d.status === 'won') wonRevenue += d.value;
  }
  return {
    openPipeline,
    wonRevenue,
    openDeals,
    contacts: getContactsForCompany(coId).length,
    ar: invByCo.get(coId) || 0,
  };
}

// Roll a company's own numbers plus all of its descendants' numbers.
// Returns { self, roll, childCount, descendantCount }. `self` is the
// account alone; `roll` is the account + every sub-account combined.
export function rollupFor(coId) {
  const invByCo = arIndex();
  const self = metricsFor(coId, invByCo);
  const descendants = getDescendants(coId);
  const roll = { ...self };
  for (const d of descendants) {
    const m = metricsFor(d.id, invByCo);
    roll.openPipeline += m.openPipeline;
    roll.wonRevenue += m.wonRevenue;
    roll.openDeals += m.openDeals;
    roll.contacts += m.contacts;
    roll.ar += m.ar;
  }
  return {
    self,
    roll,
    childCount: getChildren(coId).length,
    descendantCount: descendants.length,
  };
}

// Lightweight open-pipeline sum for a subtree (self + descendants),
// used by the tree UI for per-node badges without touching invoices.
export function subtreeOpenPipeline(coId) {
  let sum = 0;
  const ids = [coId, ...getDescendants(coId).map(c => c.id)];
  for (const id of ids) {
    for (const d of getDealsForCompany(id)) if (d.status === 'open') sum += d.value;
  }
  return sum;
}

/* ============================================================
   WRITE  (through the existing updateCompany writer only)
   ============================================================ */
// Set (or clear) a company's parent. Guards: parent must exist, cannot
// be the company itself, and cannot be one of the company's descendants
// (which would form a cycle). Pass a falsy parentId to detach to top level.
export function setParentCompany(childId, parentId) {
  const child = getCompany(childId);
  if (!child) return { error: 'missing', message: 'Company not found.' };
  const pid = parentId || null;
  if (pid === childId) return { error: 'cycle', message: 'A company cannot be its own parent.' };
  if (pid) {
    if (!getCompany(pid)) return { error: 'missing', message: 'Parent company not found.' };
    const descIds = new Set(getDescendants(childId).map(c => c.id));
    if (descIds.has(pid)) return { error: 'cycle', message: 'That would create a circular hierarchy.' };
  }
  return updateCompany(childId, { parentCompanyId: pid });
}

/* ============================================================
   IDEMPOTENT DEMO SEED
   Wires 2 real seeded accounts under the flagship and one a level
   deeper, producing a 3-level example hierarchy. Runs once (guarded by
   a localStorage flag) and NEVER clobbers a company that already has a
   parent, so it is safe to call on every mount.
   ============================================================ */
export function seedHierarchyExamples() {
  try { if (localStorage.getItem(SEED_FLAG)) return { skipped: true }; } catch {}
  // [childId, parentId] - flagship is the HQ, co_1/co_2 are subsidiaries,
  // co_3 is a division under co_2.
  const plan = [
    ['co_1', 'co_flagship'],
    ['co_2', 'co_flagship'],
    ['co_3', 'co_2'],
  ];
  let seeded = 0;
  for (const [childId, parentId] of plan) {
    const child = getCompany(childId);
    const parent = getCompany(parentId);
    if (!child || !parent) continue;
    if (parentIdOf(child)) continue; // never overwrite an existing link
    const r = setParentCompany(childId, parentId);
    if (r && !r.error) seeded++;
  }
  try { localStorage.setItem(SEED_FLAG, '1'); } catch {}
  return { seeded };
}
