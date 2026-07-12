// ============================================================
// RALLY DUPLICATE MANAGEMENT + MERGE  (the HubSpot/Salesforce
// "Manage duplicates" tool). Rally only dedupes on IMPORT today
// (src/lib/importer.js drops rows that collide with the book).
// This slice finds the duplicates that already LIVE in the book
// of business and gives you a real, reversible-by-construction
// MERGE that keeps a master record, fills its blank fields from
// the duplicate, moves the duplicate's activities / deals /
// associations onto the master through the EXISTING store writers,
// then removes the duplicate.
//
// ADDITIVE + read-only over the store for detection. It NEVER
// mutates a record on load. The only mutations happen inside
// mergeContacts / mergeCompanies, and those go exclusively through
// the existing store writers (updateContact / updateDeal /
// updateActivity / updateCompany / deleteContact / deleteCompany)
// and the associations writers (updateAssociation /
// removeAssociation). Dismissals ("not a duplicate") persist to
// their own localStorage slice (rally_dedupe_v1) with the same
// pub/sub pattern as store.js / associations.js, so they never
// touch the core book.
//
// Detection is deterministic: the same seeded book scores the same
// way every reload, so the inbox demos with real content. The
// seeded book has no exact email/domain collisions, so scoring is
// fuzzy: exact keys score highest, then same-name-same-company,
// then cross-company same-name and shared-brand company clusters
// surface as lower-confidence "possible" groups for human review.
//
// SUPABASE: a live build would persist rally_dedupe_dismissals and
// run the same scoring server-side (or in a pg trigger) over
// rally_contacts / rally_companies.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getContacts, getCompanies,
  getContact, getCompany,
  contactName,
  getDealsForContact, getDealsForCompany,
  getContactsForCompany,
  getActivities, getActivitiesForRecord,
  updateContact, updateDeal, updateActivity, updateCompany,
  deleteContact, deleteCompany,
} from './store.js';
import {
  associationsFor, associationCount,
  updateAssociation, removeAssociation,
} from './associations.js';

/* ============================================================
   NORMALIZATION HELPERS
   ============================================================ */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normEmail = (e) => String(e || '').trim().toLowerCase();
const emailDomain = (e) => { const at = String(e || '').indexOf('@'); return at >= 0 ? e.slice(at + 1).toLowerCase() : ''; };
const digits = (p) => String(p || '').replace(/\D+/g, '');
const domainRoot = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const fullName = (c) => norm(`${c?.firstName || ''} ${c?.lastName || ''}`);
const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Legal suffixes stripped when comparing company names. Brand words like
// "group" / "partners" / "holdings" are deliberately kept - they distinguish
// real, different companies in the book.
const LEGAL_SUFFIX = new Set(['inc', 'llc', 'corp', 'corporation', 'ltd', 'co', 'plc', 'gmbh', 'sa', 'ag', 'lp', 'llp', 'incorporated', 'limited']);
function normCompanyName(name) {
  const toks = norm(name).split(' ').filter(Boolean);
  while (toks.length > 1 && LEGAL_SUFFIX.has(toks[toks.length - 1])) toks.pop();
  return toks.join(' ');
}

// Compact normalized Levenshtein similarity, 0..1. Used as a soft signal for
// near-identical names (typos, spacing, abbreviations).
function strSim(a = '', b = '') {
  a = String(a); b = String(b);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  const dist = prev[n];
  return 1 - dist / Math.max(m, n);
}

function sameLastAndInitial(a, b) {
  const la = norm(a?.lastName), lb = norm(b?.lastName);
  if (!la || la !== lb) return false;
  const fa = norm(a?.firstName)[0], fb = norm(b?.firstName)[0];
  return !!fa && fa === fb;
}

/* ============================================================
   MATCH TIERS
   ============================================================ */
export const TIERS = {
  exact: { key: 'exact', label: 'Likely duplicate', tone: 'risk', rank: 3 },
  strong: { key: 'strong', label: 'Probable match', tone: 'warn', rank: 2 },
  possible: { key: 'possible', label: 'Possible match', tone: 'info', rank: 1 },
};
export const tierMeta = (t) => TIERS[t] || TIERS.possible;
export const CONTACT_FLOOR = 56;
export const COMPANY_FLOOR = 52;

/* ============================================================
   PAIR SCORERS  -> { score, tier, reasons[] }
   ============================================================ */
export function scoreContactPair(a, b) {
  const reasons = [];
  let base = 0, tier = 'possible';
  const ea = normEmail(a.email), eb = normEmail(b.email);
  const fa = fullName(a), fb = fullName(b);
  const pa = digits(a.phone), pb = digits(b.phone);

  if (ea && eb && ea === eb) {
    base = 100; tier = 'exact'; reasons.push('Same email address');
  } else if (fa && fb && fa === fb) {
    if (a.companyId && a.companyId === b.companyId) {
      base = 92; tier = 'strong'; reasons.push('Same name, same company');
    } else if (ea && eb && emailDomain(ea) === emailDomain(eb)) {
      base = 80; tier = 'strong'; reasons.push('Same name, same email domain');
    } else {
      base = 66; tier = 'possible'; reasons.push('Same full name');
    }
  } else {
    const sim = strSim(fa, fb);
    if (a.companyId && a.companyId === b.companyId && sameLastAndInitial(a, b)) {
      base = 58; tier = 'possible'; reasons.push('Similar name, same company');
    } else if (fa && fb && sim >= 0.9) {
      base = 56; tier = 'possible'; reasons.push('Very similar names');
    }
  }

  let score = base;
  if (base > 0 && base < 100 && pa && pb && pa === pb) {
    score = Math.min(100, score + 8); reasons.push('Same phone number');
  }
  if (base > 0 && base < 92 && a.companyId && a.companyId === b.companyId &&
      !reasons.some(r => r.toLowerCase().includes('company'))) {
    score = Math.min(100, score + 6); reasons.push('Same company');
  }
  return { score, tier, reasons };
}

export function scoreCompanyPair(a, b) {
  const reasons = [];
  let base = 0, tier = 'possible';
  const da = domainRoot(a.domain), db = domainRoot(b.domain);
  const na = normCompanyName(a.name), nb = normCompanyName(b.name);

  if (da && db && da === db) {
    base = 100; tier = 'exact'; reasons.push('Same website domain');
  } else if (na && nb && na === nb) {
    base = 98; tier = 'exact'; reasons.push('Identical company name');
  } else {
    const ta = na.split(' ').filter(Boolean);
    const tb = nb.split(' ').filter(Boolean);
    const sa = new Set(ta), sb = new Set(tb);
    const inter = [...sa].filter(x => sb.has(x)).length;
    const uni = new Set([...sa, ...sb]).size;
    const jac = uni ? inter / uni : 0;
    const subset = sa.size && sb.size && ([...sa].every(x => sb.has(x)) || [...sb].every(x => sa.has(x)));
    const lead = ta[0] && ta[0] === tb[0];
    const sim = strSim(na, nb);
    if (subset) {
      base = 82; tier = 'strong'; reasons.push('One name contains the other');
    } else if (sim >= 0.86) {
      base = 76; tier = 'strong'; reasons.push('Very similar names');
    } else if (lead && jac >= 0.5) {
      base = 68; tier = 'possible'; reasons.push('Shared brand and words');
    } else if (lead) {
      base = 54; tier = 'possible'; reasons.push(`Shares brand name "${cap(ta[0])}"`);
    } else if (sim >= 0.72) {
      base = 52; tier = 'possible'; reasons.push('Similar names');
    }
  }

  let score = base;
  if (base > 0 && base < 98) {
    if (a.location && a.location === b.location) { score = Math.min(100, score + 4); reasons.push('Same location'); }
    if (a.industry && a.industry === b.industry) { score = Math.min(100, score + 3); }
  }
  return { score, tier, reasons };
}

/* ============================================================
   GROUPING  (blocking -> pairwise score -> union-find clusters)
   ============================================================ */
function buildGroups(records, keyFn, scoreFn, floor, objectType) {
  const buckets = new Map();
  for (const r of records) {
    for (const k of keyFn(r)) {
      if (!k) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }
  }
  const parent = new Map();
  records.forEach(r => parent.set(r.id, r.id));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };

  const seen = new Set();
  const pairs = [];
  for (const arr of buckets.values()) {
    if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const pk = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (seen.has(pk)) continue;
        seen.add(pk);
        const res = scoreFn(a, b);
        if (res.score >= floor) pairs.push({ a, b, ...res });
      }
    }
  }
  for (const p of pairs) {
    const ra = find(p.a.id), rb = find(p.b.id);
    if (ra !== rb) parent.set(ra, rb);
  }

  const agg = new Map();
  for (const p of pairs) {
    const root = find(p.a.id);
    let g = agg.get(root);
    if (!g) { g = { score: 0, tier: 'possible', reasons: new Set(), ids: new Set() }; agg.set(root, g); }
    if (p.score > g.score) { g.score = p.score; g.tier = p.tier; }
    p.reasons.forEach(r => g.reasons.add(r));
    g.ids.add(p.a.id); g.ids.add(p.b.id);
  }

  const byId = new Map(records.map(r => [r.id, r]));
  const groups = [];
  for (const g of agg.values()) {
    const ids = [...g.ids].sort();
    const members = ids.map(id => byId.get(id)).filter(Boolean);
    if (members.length < 2) continue;
    groups.push({
      id: `dg_${objectType}_${ids.join('_')}`,
      key: `${objectType}:${ids.join('_')}`,
      objectType,
      score: g.score,
      tier: g.tier,
      reasons: [...g.reasons],
      memberIds: ids,
      members,
    });
  }
  // Deterministic order: strongest tier first, then score, then id.
  groups.sort((x, y) =>
    tierMeta(y.tier).rank - tierMeta(x.tier).rank ||
    y.score - x.score ||
    x.id.localeCompare(y.id));
  return groups;
}

function contactKeys(c) {
  const keys = [];
  const e = normEmail(c.email); if (e) keys.push('e:' + e);
  const f = fullName(c); if (f) keys.push('f:' + f);
  const p = digits(c.phone); if (p.length >= 7) keys.push('p:' + p);
  if (c.companyId && norm(c.lastName)) keys.push('lc:' + c.companyId + ':' + norm(c.lastName));
  return keys;
}
function companyKeys(co) {
  const keys = [];
  const d = domainRoot(co.domain); if (d) keys.push('d:' + d);
  const n = normCompanyName(co.name); if (n) { keys.push('n:' + n); const lead = n.split(' ')[0]; if (lead) keys.push('b:' + lead); }
  return keys;
}

/* ============================================================
   PUBLIC DETECTION API  (pure over the store; re-derives on any
   mutation because it reads live getContacts() / getCompanies())
   ============================================================ */
export function findContactDuplicates({ includeDismissed = false } = {}) {
  const groups = buildGroups(getContacts(), contactKeys, scoreContactPair, CONTACT_FLOOR, 'contact');
  return includeDismissed ? groups : groups.filter(g => !isDismissed(g.key));
}
export function findCompanyDuplicates({ includeDismissed = false } = {}) {
  const groups = buildGroups(getCompanies(), companyKeys, scoreCompanyPair, COMPANY_FLOOR, 'company');
  return includeDismissed ? groups : groups.filter(g => !isDismissed(g.key));
}
export function findDuplicates(objectType, opts) {
  return objectType === 'company' ? findCompanyDuplicates(opts) : findContactDuplicates(opts);
}

// Portfolio headline for the inbox stat tiles.
export function dedupeSummary() {
  const contactGroups = findContactDuplicates();
  const companyGroups = findCompanyDuplicates();
  const dupRecords = (gs) => gs.reduce((s, g) => s + (g.memberIds.length - 1), 0);
  return {
    contactGroups: contactGroups.length,
    companyGroups: companyGroups.length,
    totalGroups: contactGroups.length + companyGroups.length,
    contactDupRecords: dupRecords(contactGroups),
    companyDupRecords: dupRecords(companyGroups),
    mergeable: dupRecords(contactGroups) + dupRecords(companyGroups),
    dismissed: getDismissed().length,
  };
}

/* ============================================================
   RECORD REFERENCE COUNTS  (what a merge would move). Read-only.
   ============================================================ */
export function recordRefs(objectType, id) {
  if (objectType === 'company') {
    const acts = getActivities().filter(a => a.companyId === id).length;
    return {
      contacts: getContactsForCompany(id).length,
      deals: getDealsForCompany(id).length,
      activities: acts,
      associations: associationCount('company', id),
    };
  }
  return {
    deals: getDealsForContact(id).length,
    activities: getActivitiesForRecord('contact', id).length,
    associations: associationCount('contact', id),
  };
}

// Count non-blank fields on a record - used to preselect the richest master.
function completeness(objectType, rec) {
  const fields = objectType === 'company'
    ? ['name', 'domain', 'industry', 'size', 'location', 'health']
    : ['firstName', 'lastName', 'email', 'phone', 'title', 'companyId'];
  let n = 0;
  for (const f of fields) if (!isBlank(rec[f])) n++;
  if (rec.fieldValues) n += Object.values(rec.fieldValues).filter(v => !isBlank(v)).length;
  if (Array.isArray(rec.tags)) n += rec.tags.length ? 1 : 0;
  return n;
}

// The record the UI preselects as master: most linked (deals+activities+
// associations), then most complete, then flagship, then oldest. Returns an id.
export function suggestMaster(objectType, members) {
  let best = null, bestScore = -Infinity;
  for (const m of members) {
    const refs = recordRefs(objectType, m.id);
    const linkScore = (refs.deals + refs.activities + refs.associations + (refs.contacts || 0));
    const s = linkScore * 100 + completeness(objectType, m) * 4 +
      (m.flagship ? 1000 : 0) +
      (m.createdAt ? -new Date(m.createdAt).getTime() / 1e11 : 0);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best ? best.id : (members[0] && members[0].id);
}

// Read-only preview of the effect of merging dupIds into masterId.
export function mergePreview(objectType, masterId, dupIds) {
  const getRec = objectType === 'company' ? getCompany : getContact;
  const master = getRec(masterId);
  if (!master) return null;
  const fillFields = objectType === 'company'
    ? ['domain', 'industry', 'size', 'location', 'lifecycleStage']
    : ['email', 'phone', 'title', 'companyId', 'lifecycleStage'];
  const filled = new Set();
  let deals = 0, activities = 0, associations = 0, contacts = 0;
  for (const dupId of dupIds) {
    const dup = getRec(dupId);
    if (!dup) continue;
    for (const f of fillFields) if (isBlank(master[f]) && !isBlank(dup[f])) filled.add(f);
    const refs = recordRefs(objectType, dupId);
    deals += refs.deals; activities += refs.activities; associations += refs.associations;
    if (objectType === 'company') contacts += refs.contacts || 0;
  }
  return {
    master, removes: dupIds.length,
    fieldsFilled: [...filled],
    deals, activities, associations, contacts,
  };
}

/* ============================================================
   ASSOCIATION REPOINT  (direction-agnostic; dedups + drops
   self-links). Goes through the associations writers only.
   ============================================================ */
function repointAssociations(type, dupId, masterId) {
  const key = (t, i, l) => `${t}|${i}|${String(l || '').toLowerCase()}`;
  const existing = new Set(associationsFor(type, masterId).map(e => {
    const isFrom = e.fromType === type && e.fromId === masterId;
    const ot = isFrom ? e.toType : e.fromType;
    const oi = isFrom ? e.toId : e.fromId;
    return key(ot, oi, e.label);
  }));
  let moved = 0;
  for (const e of associationsFor(type, dupId)) {
    const dupIsFrom = e.fromType === type && e.fromId === dupId;
    const ot = dupIsFrom ? e.toType : e.fromType;
    const oi = dupIsFrom ? e.toId : e.fromId;
    if (ot === type && oi === masterId) { removeAssociation(e.id); continue; } // would self-link
    const k = key(ot, oi, e.label);
    if (existing.has(k)) { removeAssociation(e.id); moved++; continue; } // master already has it
    updateAssociation(e.id, dupIsFrom ? { fromId: masterId } : { toId: masterId });
    existing.add(k);
    moved++;
  }
  return moved;
}

/* ============================================================
   MERGE  (the real mutation - only ever from an explicit click).
   Keeps master, fills blanks, moves refs via existing writers,
   removes the duplicate. Returns { ok, moved } or { error }.
   ============================================================ */
export function mergeContacts(masterId, dupId) {
  if (masterId === dupId) return { error: 'self', message: 'Pick a different record to merge.' };
  const master = getContact(masterId);
  const dup = getContact(dupId);
  if (!master) return { error: 'master', message: 'Master contact not found.' };
  if (!dup) return { error: 'dup', message: 'Duplicate contact not found.' };

  // 1. fill blank master fields from the duplicate
  const patch = {};
  for (const f of ['email', 'phone', 'title', 'companyId', 'lifecycleStage']) {
    if (isBlank(master[f]) && !isBlank(dup[f])) patch[f] = dup[f];
  }
  const tags = Array.from(new Set([...(master.tags || []), ...(dup.tags || [])]));
  if (tags.length !== (master.tags || []).length) patch.tags = tags;
  if (dup.fieldValues) {
    const fv = { ...(master.fieldValues || {}) };
    let changed = false;
    for (const [k, v] of Object.entries(dup.fieldValues)) if (isBlank(fv[k]) && !isBlank(v)) { fv[k] = v; changed = true; }
    if (changed) patch.fieldValues = fv;
  }
  if (Object.keys(patch).length) updateContact(masterId, patch);

  // 2. move deals (replace dup in contactIds with master, deduped)
  let deals = 0;
  for (const d of getDealsForContact(dupId)) {
    const ids = (d.contactIds || []).filter(x => x !== dupId);
    if (!ids.includes(masterId)) ids.push(masterId);
    updateDeal(d.id, { contactIds: ids });
    deals++;
  }

  // 3. move activities anchored on the duplicate contact
  let activities = 0;
  for (const a of getActivitiesForRecord('contact', dupId)) {
    updateActivity(a.id, { relatedId: masterId });
    activities++;
  }

  // 4. move associations
  const associations = repointAssociations('contact', dupId, masterId);

  // 5. remove the duplicate
  deleteContact(dupId);

  return { ok: true, moved: { deals, activities, associations, fieldsFilled: Object.keys(patch) } };
}

export function mergeCompanies(masterId, dupId) {
  if (masterId === dupId) return { error: 'self', message: 'Pick a different record to merge.' };
  const master = getCompany(masterId);
  const dup = getCompany(dupId);
  if (!master) return { error: 'master', message: 'Master company not found.' };
  if (!dup) return { error: 'dup', message: 'Duplicate company not found.' };

  // 1. fill blank master fields
  const patch = {};
  for (const f of ['domain', 'industry', 'size', 'location', 'lifecycleStage']) {
    if (isBlank(master[f]) && !isBlank(dup[f])) patch[f] = dup[f];
  }
  if (dup.fieldValues) {
    const fv = { ...(master.fieldValues || {}) };
    let changed = false;
    for (const [k, v] of Object.entries(dup.fieldValues)) if (isBlank(fv[k]) && !isBlank(v)) { fv[k] = v; changed = true; }
    if (changed) patch.fieldValues = fv;
  }
  if (Object.keys(patch).length) updateCompany(masterId, patch);

  // 2. move contacts
  let contacts = 0;
  for (const c of getContactsForCompany(dupId)) {
    updateContact(c.id, { companyId: masterId });
    contacts++;
  }

  // 3. move deals
  let deals = 0;
  for (const d of getDealsForCompany(dupId)) {
    updateDeal(d.id, { companyId: masterId });
    deals++;
  }

  // 4. move activities (by companyId, plus company-anchored relatedId)
  let activities = 0;
  for (const a of getActivities()) {
    const p = {};
    if (a.companyId === dupId) p.companyId = masterId;
    if (a.relatedType === 'company' && a.relatedId === dupId) p.relatedId = masterId;
    if (Object.keys(p).length) { updateActivity(a.id, p); activities++; }
  }

  // 5. move associations
  const associations = repointAssociations('company', dupId, masterId);

  // 6. remove the duplicate
  deleteCompany(dupId);

  return { ok: true, moved: { contacts, deals, activities, associations, fieldsFilled: Object.keys(patch) } };
}

// Merge a whole group: fold every non-master member into the master.
export function mergeGroup(objectType, masterId, memberIds) {
  const dupIds = memberIds.filter(id => id !== masterId);
  const merge = objectType === 'company' ? mergeCompanies : mergeContacts;
  const total = { contacts: 0, deals: 0, activities: 0, associations: 0, fieldsFilled: [], removed: 0 };
  for (const dupId of dupIds) {
    const r = merge(masterId, dupId);
    if (r.error) return { error: r.error, message: r.message, partial: total };
    total.contacts += r.moved.contacts || 0;
    total.deals += r.moved.deals || 0;
    total.activities += r.moved.activities || 0;
    total.associations += r.moved.associations || 0;
    total.fieldsFilled = Array.from(new Set([...total.fieldsFilled, ...(r.moved.fieldsFilled || [])]));
    total.removed++;
  }
  return { ok: true, moved: total };
}

// Convenient display name for a record, either type.
export function recordLabel(objectType, rec) {
  if (!rec) return 'Deleted record';
  return objectType === 'company' ? rec.name : contactName(rec);
}

/* ============================================================
   DISMISSALS  ("not a duplicate")  - own localStorage slice.
   ============================================================ */
const LS_KEY = 'rally_dedupe_v1';
let dstate = loadDismissed();
const subs = new Set();

function loadDismissed() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { dismissed: [] };
}
function commit(next) {
  dstate = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(dstate)); } catch {}
  subs.forEach(fn => fn(dstate));
}
export function resetDedupe() { try { localStorage.removeItem(LS_KEY); } catch {} dstate = loadDismissed(); subs.forEach(fn => fn(dstate)); }

export function useDedupe(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(dstate));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(dstate); return () => subs.delete(fn); }, []);
  return snap;
}

export const getDismissed = () => dstate.dismissed || [];
export const isDismissed = (key) => (dstate.dismissed || []).some(d => d.key === key);

export function dismissGroup(group) {
  if (!group || isDismissed(group.key)) return { ok: true };
  const entry = { key: group.key, objectType: group.objectType, memberIds: group.memberIds, at: new Date().toISOString() };
  commit({ ...dstate, dismissed: [entry, ...(dstate.dismissed || [])] });
  return { ok: true };
}
export function restoreDismissed(key) {
  commit({ ...dstate, dismissed: (dstate.dismissed || []).filter(d => d.key !== key) });
  return { ok: true };
}
