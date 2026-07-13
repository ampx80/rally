// ============================================================
// RALLY ROLES + DEEP PERMISSIONS  (admin - "Roles")
// A permission model deeper than the base RBAC matrix: per-module
// x per-action x record-scope grants, per-field visibility rules,
// and per-object record-sharing scope - all keyed by role.
//
// This layers ON TOP of src/lib/rbac.js (never edits it). It reuses
// rbac's ROLE_COLORS + FIELD_SECURITY as seeds and mirrors rbac's
// scope vocabulary (own / team / all). Persisted in its OWN key
// (rally_roles_v1) so the base rbac stores are never touched.
//
// Local-first: seeds a full, believable permission book from a fixed
// PRNG with zero backend. Never throws on load, never white-screens.
// SUPABASE: rally_roles + rally_role_grants + rally_field_rules +
// rally_sharing_rules + rally_members.
// ============================================================
import { useEffect, useState } from 'react';
import { ROLE_COLORS, FIELD_SECURITY } from './rbac.js';

const LS_KEY = 'rally_roles_v1';

/* ---------- deterministic PRNG (hoisted; safe to call during seed) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC MODEL  (rows, columns, scopes, roles, fields)
   ============================================================ */

/* Matrix columns - the five CRUD + export verbs every enterprise tool
   gates. Export is called out because data exfiltration is the #1 thing
   security teams lock down (Pipedrive has no per-role export control). */
export const ACTIONS = [
  { id: 'create', label: 'Create', desc: 'Add new records.' },
  { id: 'read',   label: 'Read',   desc: 'Open and view records.' },
  { id: 'edit',   label: 'Edit',   desc: 'Change fields on records.' },
  { id: 'delete', label: 'Delete', desc: 'Permanently remove records.', sensitive: true },
  { id: 'export', label: 'Export', desc: 'Download records as CSV.', sensitive: true },
];
export const ACTION_IDS = ACTIONS.map(a => a.id);

/* Record-scope vocabulary (mirrors rbac own/team/all, plus explicit none).
   rank lets us compare "how much" a scope grants for the live preview. */
export const SCOPES = [
  { id: 'none', label: 'None',        rank: 0, color: 'var(--n-400)',  desc: 'No access.' },
  { id: 'own',  label: 'Own',         rank: 1, color: 'var(--info)',   desc: 'Only records this user owns.' },
  { id: 'team', label: 'Team',        rank: 2, color: 'var(--warn)',   desc: "The user's whole team book." },
  { id: 'all',  label: 'All',         rank: 3, color: 'var(--ok)',     desc: 'Every record in the org.' },
];
export const scopeMeta = (id) => SCOPES.find(s => s.id === id) || SCOPES[0];
export const nextScope = (id) => { const i = SCOPES.findIndex(s => s.id === id); return SCOPES[(i + 1) % SCOPES.length].id; };

/* Matrix rows - the modules / objects a role's access is carved across.
   Each maps to a real Rally surface so the preview reads true. */
export const MODULES = [
  { id: 'deals',      label: 'Deals',          icon: 'target',      objectKey: 'deal',    group: 'Sell' },
  { id: 'contacts',   label: 'Contacts',       icon: 'users',       objectKey: 'contact', group: 'Sell' },
  { id: 'companies',  label: 'Companies',      icon: 'building',     objectKey: 'company', group: 'Sell' },
  { id: 'leads',      label: 'Leads',          icon: 'funnel',      objectKey: 'lead',    group: 'Sell' },
  { id: 'quotes',     label: 'Quotes',         icon: 'receipt',     objectKey: 'quote',   group: 'Revenue' },
  { id: 'billing',    label: 'Billing',        icon: 'dollar',      objectKey: 'invoice', group: 'Revenue' },
  { id: 'grid',       label: 'Custom objects', icon: 'grid',        objectKey: 'object',  group: 'Data' },
  { id: 'drive',      label: 'Drive',          icon: 'fileText',    objectKey: 'file',    group: 'Data' },
  { id: 'marketing',  label: 'Marketing',      icon: 'megaphone',   objectKey: 'campaign',group: 'Grow' },
  { id: 'reports',    label: 'Reports',        icon: 'pie',         objectKey: 'report',  group: 'Analyze' },
  { id: 'automation', label: 'Automation',     icon: 'workflow',    objectKey: 'workflow',group: 'Operate' },
  { id: 'settings',   label: 'Settings',       icon: 'settings',    objectKey: 'setting', group: 'Operate' },
];
export const moduleMeta = (id) => MODULES.find(m => m.id === id) || null;

/* The seven roles every buyer expects out of the box (HubSpot gates most
   of these behind Enterprise; Rally ships them standard). system:true =
   cannot be deleted; owner is always all-access and cannot be locked out. */
export const SEED_ROLES = [
  { id: 'owner',      label: 'Owner',      rank: 6, color: '#5b4bf5', system: true,  locked: true,  desc: 'Founder-level. Full control of every record, field, and setting. Cannot be restricted.' },
  { id: 'admin',      label: 'Admin',      rank: 5, color: '#8b3fd4', system: true,  locked: false, desc: 'Runs the workspace. Manages users, fields, billing, and automations.' },
  { id: 'manager',    label: 'Manager',    rank: 4, color: '#0ea5a3', system: true,  locked: false, desc: 'Leads a team. Sees and edits the whole team book, approves quotes.' },
  { id: 'sales_rep',  label: 'Sales Rep',  rank: 3, color: '#2563a8', system: true,  locked: false, desc: 'Owns their book. Creates and edits their own deals and contacts.' },
  { id: 'marketing',  label: 'Marketing',  rank: 2, color: '#b3721a', system: true,  locked: false, desc: 'Runs campaigns and leads. Read access to pipeline, no billing.' },
  { id: 'support',    label: 'Support',    rank: 2, color: '#1a7f52', system: true,  locked: false, desc: 'Handles accounts post-sale. Reads records, edits contacts they own.' },
  { id: 'read_only',  label: 'Read-only',  rank: 1, color: '#8b93a4', system: true,  locked: false, desc: 'Dashboards and records, view only. Cannot change anything.' },
];

/* Sensitive fields the matrix reaches down into. Seeded partly from rbac's
   FIELD_SECURITY so the two models agree, plus a few extra revenue fields.
   viewRank / editRank = the minimum role rank granted view / edit by default. */
export const FIELDS = [
  { id: 'deal.amount',        module: 'deals',     label: 'Deal amount',    hint: 'Contract value',       viewRank: 3, editRank: 3 },
  { id: 'deal.margin',        module: 'deals',     label: 'Deal margin',    hint: 'Gross margin %',       viewRank: 4, editRank: 5 },
  { id: 'deal.forecast',      module: 'deals',     label: 'Forecast cat.',  hint: 'Commit / best case',   viewRank: 3, editRank: 4 },
  { id: 'contact.email',      module: 'contacts',  label: 'Contact email',  hint: 'Work email',           viewRank: 2, editRank: 3 },
  { id: 'contact.personal',   module: 'contacts',  label: 'Personal email', hint: 'PII',                  viewRank: 4, editRank: 5 },
  { id: 'contact.phone',      module: 'contacts',  label: 'Mobile phone',   hint: 'PII',                  viewRank: 3, editRank: 3 },
  { id: 'company.revenue',    module: 'companies', label: 'Annual revenue', hint: 'Firmographic',         viewRank: 3, editRank: 4 },
  { id: 'billing.total',      module: 'billing',   label: 'Invoice total',  hint: 'AR',                   viewRank: 4, editRank: 5 },
  { id: 'billing.card',       module: 'billing',   label: 'Card on file',   hint: 'PCI',                  viewRank: 5, editRank: 6 },
];
export const FIELD_ACCESS = [
  { id: 'hidden', label: 'Hidden',   color: 'var(--risk)', desc: 'The field is not shown at all.' },
  { id: 'view',   label: 'View',     color: 'var(--warn)', desc: 'Read only - cannot change it.' },
  { id: 'edit',   label: 'Editable', color: 'var(--ok)',   desc: 'Can read and change the value.' },
];
export const fieldAccessMeta = (id) => FIELD_ACCESS.find(f => f.id === id) || FIELD_ACCESS[0];
export const nextFieldAccess = (id) => { const i = FIELD_ACCESS.findIndex(f => f.id === id); return FIELD_ACCESS[(i + 1) % FIELD_ACCESS.length].id; };

/* Objects that carry record-sharing rules (org-wide default visibility). */
export const SHARE_OBJECTS = [
  { id: 'deals',     label: 'Deals' },
  { id: 'contacts',  label: 'Contacts' },
  { id: 'companies', label: 'Companies' },
  { id: 'leads',     label: 'Leads' },
];

/* Member name pools for deterministic seat seeding. */
const MEMBER_FIRST = ['Ava', 'Noah', 'Mia', 'Leo', 'Zara', 'Owen', 'Ivy', 'Rhys', 'Nora', 'Kai', 'Elle', 'Beau', 'Priya', 'Diego', 'Wei', 'Sana', 'Cole', 'Jade', 'Theo', 'Luna', 'Marco', 'Hana', 'Reid', 'Nina'];
const MEMBER_LAST = ['Reeves', 'Sato', 'Vance', 'Okafor', 'Bloom', 'Nash', 'Frost', 'Cortez', 'Lang', 'Meyer', 'Dial', 'Suzuki', 'Ortega', 'Kalb', 'Roy', 'Webb', 'Cho', 'Ives', 'Sharpe', 'Pike'];

/* ============================================================
   DEFAULT GRANT / FIELD / SHARE COMPUTATION  (all hoisted)
   Believable per-role defaults derived from role rank so the seeded
   book looks hand-tuned without a giant literal table.
   ============================================================ */

// Which module groups a role's job actually touches. Drives sensible zeros
// (Marketing has no billing, Support has no automation, etc.).
function roleTouchesModule(roleId, moduleId) {
  const m = moduleMeta(moduleId);
  const g = m ? m.group : '';
  if (roleId === 'owner' || roleId === 'admin') return true;
  if (roleId === 'manager') return moduleId !== 'settings' ? true : true;
  if (roleId === 'sales_rep') return ['Sell', 'Revenue', 'Analyze'].includes(g);
  if (roleId === 'marketing') return ['Grow', 'Sell', 'Analyze', 'Data'].includes(g) && moduleId !== 'billing';
  if (roleId === 'support')   return ['Sell', 'Data', 'Analyze'].includes(g) || moduleId === 'reports';
  if (roleId === 'read_only') return true; // sees, cannot act
  return true;
}

function baseScope(roleId, roleRank, moduleId, action) {
  // Owner is absolute.
  if (roleId === 'owner') return 'all';
  const m = moduleMeta(moduleId);
  const sensitive = moduleId === 'billing' || moduleId === 'settings' || moduleId === 'automation';
  const touches = roleTouchesModule(roleId, moduleId);

  // Read-only: read what it touches, nothing else.
  if (roleId === 'read_only') return action === 'read' && touches ? 'all' : 'none';

  if (!touches) return action === 'read' && roleRank >= 4 ? 'all' : 'none';

  // Admin: full control except record ownership is moot (all).
  if (roleId === 'admin') return action === 'delete' && sensitive ? 'all' : 'all';

  // Manager: whole team, all-org reads, delete limited on sensitive modules.
  if (roleId === 'manager') {
    if (action === 'read') return 'all';
    if (action === 'delete') return sensitive ? 'none' : 'team';
    if (action === 'export') return sensitive ? 'none' : 'team';
    if (sensitive && (moduleId === 'settings' || moduleId === 'automation')) return action === 'edit' ? 'team' : 'team';
    return 'team';
  }

  // Sales Rep: owns their book, reads the team's, no destructive on shared.
  if (roleId === 'sales_rep') {
    if (moduleId === 'reports') return action === 'read' ? 'all' : 'none';
    if (moduleId === 'quotes') { if (action === 'read') return 'team'; if (action === 'create' || action === 'edit') return 'own'; return 'none'; }
    if (action === 'read') return 'team';
    if (action === 'create' || action === 'edit') return 'own';
    if (action === 'delete') return 'own';
    if (action === 'export') return 'own';
    return 'own';
  }

  // Marketing: full on grow surfaces, read on pipeline.
  if (roleId === 'marketing') {
    if (m.group === 'Grow' || moduleId === 'leads') {
      if (action === 'delete') return 'team';
      if (action === 'export') return 'team';
      return 'all';
    }
    if (moduleId === 'contacts') { if (action === 'read') return 'all'; if (action === 'edit' || action === 'create') return 'team'; return 'none'; }
    if (action === 'read') return 'all';
    if (action === 'export') return 'team';
    return 'none';
  }

  // Support: reads everything it touches, edits contacts it owns.
  if (roleId === 'support') {
    if (moduleId === 'contacts') { if (action === 'read') return 'all'; if (action === 'edit') return 'own'; return 'none'; }
    if (action === 'read') return 'all';
    return 'none';
  }

  // Custom roles (unknown id): clone-from handles it; default to read-own.
  return action === 'read' ? 'team' : 'own';
}

function seedGrantsFor(roleId, roleRank) {
  const g = {};
  for (const m of MODULES) {
    g[m.id] = {};
    for (const a of ACTION_IDS) g[m.id][a] = baseScope(roleId, roleRank, m.id, a);
  }
  return g;
}

function baseFieldAccess(roleRank, field) {
  if (roleRank >= field.editRank) return 'edit';
  if (roleRank >= field.viewRank) return 'view';
  return 'hidden';
}
function seedFieldRulesFor(roleRank) {
  const r = {};
  for (const f of FIELDS) r[f.id] = baseFieldAccess(roleRank, f);
  return r;
}

function baseShare(roleId, roleRank) {
  const s = {};
  for (const o of SHARE_OBJECTS) {
    if (roleRank >= 4) s[o.id] = 'all';          // owner / admin / manager see all
    else if (roleId === 'read_only') s[o.id] = 'all';
    else if (roleId === 'marketing' || roleId === 'support') s[o.id] = 'team';
    else s[o.id] = 'own';                          // reps default to their own book
  }
  return s;
}

/* ============================================================
   SEED  (module-eval; every helper it calls is hoisted above)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(0x5b4bf5);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const roles = SEED_ROLES.map(r => ({ ...r, custom: false, createdAt: null }));

  // grants / field rules / sharing keyed by role id
  const grants = {}, fieldRules = {}, sharing = {};
  for (const r of roles) {
    grants[r.id] = seedGrantsFor(r.id, r.rank);
    fieldRules[r.id] = seedFieldRulesFor(r.rank);
    sharing[r.id] = baseShare(r.id, r.rank);
  }

  // seed members across roles (drives the member counts on the roles list)
  const distribution = { owner: 1, admin: 2, manager: 3, sales_rep: 9, marketing: 3, support: 3, read_only: 2 };
  const members = [];
  let mid = 1;
  const usedNames = new Set();
  for (const [roleId, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      let name = pick(MEMBER_FIRST) + ' ' + pick(MEMBER_LAST);
      let guard = 0;
      while (usedNames.has(name) && guard++ < 40) name = pick(MEMBER_FIRST) + ' ' + pick(MEMBER_LAST);
      usedNames.add(name);
      members.push({ id: 'mbr_' + (mid++), name, roleId });
    }
  }

  return { roles, grants, fieldRules, sharing, members, seq: 1 };
}

/* ============================================================
   STATE  (persisted; subscription store)
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const s = buildSeed();
      // shallow-merge so new seed roles / modules added later still appear
      return {
        roles: Array.isArray(p.roles) && p.roles.length ? p.roles : s.roles,
        grants: p.grants && typeof p.grants === 'object' ? { ...s.grants, ...p.grants } : s.grants,
        fieldRules: p.fieldRules && typeof p.fieldRules === 'object' ? { ...s.fieldRules, ...p.fieldRules } : s.fieldRules,
        sharing: p.sharing && typeof p.sharing === 'object' ? { ...s.sharing, ...p.sharing } : s.sharing,
        members: Array.isArray(p.members) ? p.members : s.members,
        seq: typeof p.seq === 'number' ? p.seq : s.seq,
      };
    }
  } catch {}
  return buildSeed();
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => { try { fn(state); } catch {} });
}
export function resetRolesData() { commit(buildSeed()); }

/* React hook - re-renders any subscriber on every mutation. */
export function useRolesData(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}

/* ============================================================
   ROLES  (list, counts, create, clone, update, delete)
   ============================================================ */
export const getRoles = () => state.roles;
export const roleById = (id) => state.roles.find(r => r.id === id) || null;
export function memberCount(roleId) { return state.members.filter(m => m.roleId === roleId).length; }
export function membersOf(roleId) { return state.members.filter(m => m.roleId === roleId); }
export const totalMembers = () => state.members.length;

function slugId(label) {
  const base = 'role_' + String(label || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  let id = base, n = 2;
  while (state.roles.some(r => r.id === id)) id = base + '_' + (n++);
  return id;
}

/* Create a role by cloning an existing role's full permission set (grants +
   field rules + sharing). The clone is independent - editing one never
   touches the other. Returns { role } or { error }. */
export function cloneRole(sourceId, label) {
  const src = roleById(sourceId);
  if (!src) return { error: true, message: 'Pick a role to clone.' };
  const clean = String(label || '').trim() || (src.label + ' copy');
  const id = slugId(clean);
  const seq = (state.seq || 1) + 1;
  const palette = ROLE_COLORS.filter(Boolean);
  const role = {
    id, label: clean, rank: Math.max(1, src.rank - (src.rank >= 5 ? 1 : 0)), color: palette[seq % palette.length] || src.color,
    system: false, locked: false, custom: true, clonedFrom: src.id,
    desc: 'Cloned from ' + src.label + '. Tune the matrix below.', createdAt: seedNow(),
  };
  commit({
    ...state,
    seq,
    roles: [...state.roles, role],
    grants: { ...state.grants, [id]: deepClone(state.grants[sourceId]) },
    fieldRules: { ...state.fieldRules, [id]: { ...state.fieldRules[sourceId] } },
    sharing: { ...state.sharing, [id]: { ...state.sharing[sourceId] } },
  });
  return { role };
}

/* Draft a fresh least-privilege role: read-only on everything, all sensitive
   fields hidden, own-scope sharing. This is what Rook produces for
   "draft a least-privilege role". Deterministic, no network. */
export function createLeastPrivilegeRole(label) {
  const clean = String(label || '').trim() || 'Scoped role';
  const id = slugId(clean);
  const seq = (state.seq || 1) + 1;
  const grants = {}, fieldRules = {}, sharing = {};
  for (const m of MODULES) { grants[m.id] = {}; for (const a of ACTION_IDS) grants[m.id][a] = a === 'read' ? 'own' : 'none'; }
  for (const f of FIELDS) fieldRules[f.id] = 'hidden';
  for (const o of SHARE_OBJECTS) sharing[o.id] = 'own';
  const palette = ROLE_COLORS.filter(Boolean);
  const role = {
    id, label: clean, rank: 1, color: palette[seq % palette.length] || '#8b93a4',
    system: false, locked: false, custom: true, leastPrivilege: true,
    desc: 'Least-privilege starter. Read-only on own records, every sensitive field hidden. Grant up from zero.',
    createdAt: seedNow(),
  };
  commit({
    ...state, seq,
    roles: [...state.roles, role],
    grants: { ...state.grants, [id]: grants },
    fieldRules: { ...state.fieldRules, [id]: fieldRules },
    sharing: { ...state.sharing, [id]: sharing },
  });
  return { role };
}

export function updateRole(id, patch) {
  const r = roleById(id);
  if (!r) return { error: true, message: 'Role not found.' };
  commit({ ...state, roles: state.roles.map(x => x.id === id ? { ...x, ...patch } : x) });
  return { ok: true };
}
export function removeRole(id) {
  const r = roleById(id);
  if (!r) return { error: true, message: 'Role not found.' };
  if (r.system) return { error: true, message: 'Built-in roles cannot be deleted.' };
  const grants = { ...state.grants }; delete grants[id];
  const fieldRules = { ...state.fieldRules }; delete fieldRules[id];
  const sharing = { ...state.sharing }; delete sharing[id];
  // reassign this role's members to read_only so no seat is orphaned
  const members = state.members.map(m => m.roleId === id ? { ...m, roleId: 'read_only' } : m);
  commit({ ...state, roles: state.roles.filter(x => x.id !== id), grants, fieldRules, sharing, members });
  return { ok: true };
}

/* ============================================================
   PERMISSION MATRIX  (module x action -> scope)
   ============================================================ */
export function getGrant(roleId, moduleId, action) {
  return state.grants[roleId]?.[moduleId]?.[action] ?? 'none';
}
export function getRoleGrants(roleId) { return state.grants[roleId] || {}; }
export function setGrant(roleId, moduleId, action, scope) {
  const r = roleById(roleId);
  if (r?.locked) return; // owner is immutable all-access
  if (!SCOPES.some(s => s.id === scope)) return;
  const cur = state.grants[roleId] || {};
  const mod = { ...(cur[moduleId] || {}), [action]: scope };
  commit({ ...state, grants: { ...state.grants, [roleId]: { ...cur, [moduleId]: mod } } });
}
/* Bulk helpers used by the row / column quick-actions. */
export function setModuleRow(roleId, moduleId, scope) {
  const r = roleById(roleId); if (r?.locked) return;
  const cur = state.grants[roleId] || {};
  const mod = {}; for (const a of ACTION_IDS) mod[a] = scope;
  commit({ ...state, grants: { ...state.grants, [roleId]: { ...cur, [moduleId]: mod } } });
}
export function setActionColumn(roleId, action, scope) {
  const r = roleById(roleId); if (r?.locked) return;
  const cur = state.grants[roleId] || {};
  const next = {};
  for (const m of MODULES) next[m.id] = { ...(cur[m.id] || {}), [action]: scope };
  commit({ ...state, grants: { ...state.grants, [roleId]: next } });
}
export function resetRoleGrants(roleId) {
  const r = roleById(roleId); if (!r) return;
  commit({ ...state, grants: { ...state.grants, [roleId]: seedGrantsFor(roleId, r.rank) } });
}

/* ============================================================
   FIELD-LEVEL RULES  (field -> hidden | view | edit)
   ============================================================ */
export function getFieldAccess(roleId, fieldId) {
  return state.fieldRules[roleId]?.[fieldId] ?? 'hidden';
}
export function setFieldAccess(roleId, fieldId, access) {
  const r = roleById(roleId); if (r?.locked) return;
  if (!FIELD_ACCESS.some(f => f.id === access)) return;
  const cur = state.fieldRules[roleId] || {};
  commit({ ...state, fieldRules: { ...state.fieldRules, [roleId]: { ...cur, [fieldId]: access } } });
}

/* ============================================================
   RECORD SHARING  (object -> own | team | all)
   ============================================================ */
export function getShare(roleId, objectId) { return state.sharing[roleId]?.[objectId] ?? 'own'; }
export function setShare(roleId, objectId, scope) {
  const r = roleById(roleId); if (r?.locked) return;
  if (!['own', 'team', 'all'].includes(scope)) return;
  const cur = state.sharing[roleId] || {};
  commit({ ...state, sharing: { ...state.sharing, [roleId]: { ...cur, [objectId]: scope } } });
}

/* ============================================================
   LIVE PREVIEW  ("what can this role see")
   Distills the whole permission book into a plain-language summary
   plus counts, so an admin can sanity-check a role at a glance.
   ============================================================ */
export function rolePreview(roleId) {
  const r = roleById(roleId);
  if (!r) return null;
  const g = state.grants[roleId] || {};
  const modules = MODULES.map(m => {
    const row = g[m.id] || {};
    const read = row.read || 'none';
    const canCreate = (row.create || 'none') !== 'none';
    const canEdit = (row.edit || 'none') !== 'none';
    const canDelete = (row.delete || 'none') !== 'none';
    const canExport = (row.export || 'none') !== 'none';
    const maxRank = Math.max(...ACTION_IDS.map(a => scopeMeta(row[a] || 'none').rank));
    return { id: m.id, label: m.label, icon: m.icon, read, canCreate, canEdit, canDelete, canExport, visible: maxRank > 0 };
  });
  const visibleModules = modules.filter(m => m.visible);
  const hiddenFields = FIELDS.filter(f => getFieldAccess(roleId, f.id) === 'hidden');
  const editableFields = FIELDS.filter(f => getFieldAccess(roleId, f.id) === 'edit');
  const canExportAny = modules.some(m => m.canExport);
  const canDeleteAny = modules.some(m => m.canDelete);
  const broadest = Math.max(0, ...SHARE_OBJECTS.map(o => scopeMeta(getShare(roleId, o.id)).rank));
  // a compact "least privilege" score: lower = tighter
  const totalCells = MODULES.length * ACTION_IDS.length;
  const grantedRank = MODULES.reduce((sum, m) => sum + ACTION_IDS.reduce((s, a) => s + scopeMeta((g[m.id] || {})[a] || 'none').rank, 0), 0);
  const openness = Math.round((grantedRank / (totalCells * 3)) * 100); // 0..100
  return {
    role: r,
    modules,
    visibleModules,
    hiddenFields,
    editableFields,
    canExportAny,
    canDeleteAny,
    sharingBreadth: broadest, // 0..3
    openness,
    memberCount: memberCount(roleId),
  };
}

/* ============================================================
   ROOK  (open the operator with a permission-authoring prompt)
   Dispatches the app-wide rally:rook CustomEvent. RookDock listens
   for it and opens with the prompt primed.
   ============================================================ */
export function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ---------- tiny local utils (hoisted) ---------- */
function deepClone(o) { try { return JSON.parse(JSON.stringify(o || {})); } catch { return {}; } }
// A stable "now" for createdAt that does not use Date.now during seeding
// (seeding never calls this); runtime creation may.
function seedNow() { return new Date().toISOString(); }
