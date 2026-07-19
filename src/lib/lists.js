// ============================================================
// ARDOVO LISTS + SEGMENTATION  (local-first, Supabase-swappable)
// The audience layer that feeds every marketing send. A list is a
// named, resolvable audience over the contact book, in one of three
// kinds:
//   static  - an explicit membership snapshot (a frozen set of
//             contact ids the user hand-picks or imports).
//   active  - a saved-view filter (typed operators from views.js)
//             that RECOMPUTES membership every time it is read, so
//             the list stays live as the book of business changes.
//   segment - a saved DYNAMIC filter with AND/OR condition groups
//             (see SEGMENT ENGINE below). A superset of `active`:
//             instead of a single flat AND filter it combines
//             groups of conditions with all/any logic, so you can
//             express "customers in the US OR opps over 50k". Also
//             recomputes on every read. This is the Mailchimp /
//             HubSpot style segment builder.
//
// This slice is ADDITIVE. It builds ON the saved-view engine
// (src/lib/views.js applyView + typed operators) and only READS the
// core store (contacts + companies) to resolve membership. Nothing
// here mutates store.js / views.js state.
//
// The shared audience contract (consumed by AudiencePicker and any
// campaign/marketing tool) is the "audience descriptor":
//   { type: 'all' }                    -> every contact
//   { type: 'list',   listId }         -> a saved list's members
//   { type: 'filter', filters: [...] } -> an ad-hoc active filter
//
// Same pub/sub, deterministic-seed, localStorage-backed pattern as
// store.js / marketing-campaigns.js so it feels alive with no backend.
// Live equivalent would be a rally_lists table.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getContacts, getContact, getCompany, getCurrentUser } from './store.js';
import { applyView } from './views.js';
import { getField, getFieldValue } from './fields.js';

const LS_KEY = 'rally_lists_v1';   // bump to force a clean reseed
const nowIso = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------
   Resolution context. Filters can carry magic values (e.g. the
   ownerId '@me' token); applyView resolves them against ctx.
   ------------------------------------------------------------ */
function ctx() {
  const me = getCurrentUser();
  return { currentUserId: me ? me.id : null };
}

/* ============================================================
   SEGMENT ENGINE  (AND/OR dynamic filter over contacts)
   ------------------------------------------------------------
   A segment is the best-in-class audience primitive: groups of
   typed conditions combined with all/any (AND/OR) logic, resolved
   live against the contact book on every read.

   Shape (all fields optional, sane defaults applied by normSegment):
     {
       match: 'all' | 'any',        // how the GROUPS combine
       groups: [
         {
           match: 'all' | 'any',    // how CONDITIONS in the group combine
           conditions: [ { fieldKey, op, value } ]
         }
       ]
     }

   A one-group segment { match:'all', groups:[{ match:'all', conditions:[...] }] }
   is exactly a flat AND filter (behaves like an `active` list). The
   typed operators + the value-matching semantics mirror views.js so a
   segment condition behaves identically to a saved-view filter, but the
   evaluator lives here because views.js only exposes AND-combined
   applyView (matchFilter is private there).
   ============================================================ */
export const SEGMENT_MATCH = [
  { value: 'all', label: 'ALL (AND)' },
  { value: 'any', label: 'ANY (OR)' },
];
const DAY = 86400000;

export function emptySegment() {
  return { match: 'all', groups: [{ match: 'all', conditions: [] }] };
}

// Coerce any stored/partial segment into the canonical shape so the
// evaluator + UI never have to guard for missing pieces. Also accepts a
// legacy flat `conditions` (or `filters`) array as a single group.
export function normSegment(segment) {
  if (!segment || typeof segment !== 'object') return emptySegment();
  let groups = Array.isArray(segment.groups) ? segment.groups : null;
  if (!groups) {
    const flat = Array.isArray(segment.conditions) ? segment.conditions
      : Array.isArray(segment.filters) ? segment.filters : [];
    groups = [{ match: 'all', conditions: flat }];
  }
  return {
    match: segment.match === 'any' ? 'any' : 'all',
    groups: groups.map(g => ({
      match: g && g.match === 'any' ? 'any' : 'all',
      conditions: Array.isArray(g && g.conditions) ? g.conditions.filter(Boolean) : [],
    })),
  };
}

// Resolve the two magic tokens the view engine supports.
function resolveMagic(val, c) {
  if (val === '@me') return c.currentUserId;
  if (val === 'today') return Date.now();
  return val;
}

// Evaluate ONE typed condition against a contact. Same operator set +
// coercion rules as views.js matchFilter so segments and saved views agree.
function matchCondition(record, cond, context) {
  const fd = getField('contact', cond.fieldKey);
  if (!fd) return true;                      // unknown field -> non-restrictive
  const raw = getFieldValue(record, fd);
  const val = resolveMagic(cond.value, context);
  const s = (x) => String(x == null ? '' : x).toLowerCase();
  switch (cond.op) {
    case 'contains': return s(raw).includes(s(val));
    case 'notContains': return !s(raw).includes(s(val));
    case 'equals': case 'is': return s(raw) === s(val);
    case 'isNot': return s(raw) !== s(val);
    case 'anyOf': {
      const arr = Array.isArray(val) ? val.map(s) : [s(val)];
      const rv = Array.isArray(raw) ? raw.map(s) : [s(raw)];
      return rv.some(r => arr.includes(r));
    }
    case 'gt': return Number(raw) > Number(val);
    case 'lt': return Number(raw) < Number(val);
    case 'between': return Array.isArray(val) && Number(raw) >= Number(val[0]) && Number(raw) <= Number(val[1]);
    case 'before': return !!raw && new Date(raw).getTime() < new Date(val).getTime();
    case 'after': return !!raw && new Date(raw).getTime() > new Date(val).getTime();
    case 'lastNDays': return !!raw && (Date.now() - new Date(raw).getTime()) <= Number(val) * DAY;
    case 'thisMonth': {
      if (!raw) return false;
      const d = new Date(raw), n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }
    case 'isEmpty': return raw == null || raw === '' || (Array.isArray(raw) && !raw.length);
    case 'isNotEmpty': return !(raw == null || raw === '' || (Array.isArray(raw) && !raw.length));
    case 'isTrue': return raw === true || raw === 'true';
    case 'isFalse': return !(raw === true || raw === 'true');
    default: return true;
  }
}

function matchGroup(record, group, context) {
  const conds = group.conditions || [];
  if (!conds.length) return true;            // an empty group matches everyone
  return group.match === 'any'
    ? conds.some(cnd => matchCondition(record, cnd, context))
    : conds.every(cnd => matchCondition(record, cnd, context));
}

// Does a single contact satisfy the whole segment?
export function matchesSegment(segment, record, context = ctx()) {
  if (!record) return false;
  const seg = normSegment(segment);
  const groups = seg.groups.filter(g => (g.conditions || []).length);
  if (!groups.length) return true;           // no real conditions -> whole book
  return seg.match === 'any'
    ? groups.some(g => matchGroup(record, g, context))
    : groups.every(g => matchGroup(record, g, context));
}

// Total number of real (non-empty) conditions across all groups.
export function segmentConditionCount(segment) {
  return normSegment(segment).groups.reduce((n, g) => n + (g.conditions || []).length, 0);
}

// Resolve a segment (or a segment-backed list) to live contact records.
export function resolveSegmentMembers(segment) {
  const context = ctx();
  return getContacts().filter(c => matchesSegment(segment, c, context));
}
export function resolveSegmentRecipients(segment) { return contactsToRecipients(resolveSegmentMembers(segment)); }
export function segmentMemberCount(segment) { return resolveSegmentMembers(segment).length; }
export function segmentRecipientCount(segment) { return resolveSegmentRecipients(segment).length; }

// Human-readable one-liner for a segment (used on cards + audience labels).
export function describeSegment(segment) {
  const seg = normSegment(segment);
  const groups = seg.groups.filter(g => (g.conditions || []).length);
  if (!groups.length) return 'All contacts';
  const parts = groups.map(g => {
    const c = (g.conditions || []).length;
    return `${c} condition${c === 1 ? '' : 's'}`;
  });
  const joiner = seg.match === 'any' ? ' OR ' : ' AND ';
  return parts.length === 1 ? parts[0] : `(${parts.join(joiner)})`;
}

/* ------------------------------------------------------------
   Membership resolution
   static  -> map the frozen id snapshot back to live records (drop
              any that were since deleted, preserve snapshot order).
   active  -> run the saved-view filter over the current contacts.
   segment -> run the AND/OR segment engine over the current contacts.
   ------------------------------------------------------------ */
export function resolveListMembers(list) {
  if (!list) return [];
  if (list.kind === 'static') {
    const out = [];
    for (const id of list.contactIds || []) {
      const c = getContact(id);
      if (c) out.push(c);
    }
    return out;
  }
  if (list.kind === 'segment') {
    return resolveSegmentMembers(list.segment);
  }
  // active list: filters + optional sort, same engine the views use
  return applyView(getContacts(), { filters: list.filters || [], sort: list.sort || null }, 'contact', ctx());
}
export function resolveListMembersById(id) { return resolveListMembers(getList(id)); }
export function listCount(list) { return resolveListMembers(list).length; }
export function listCountById(id) { return resolveListMembers(getList(id)).length; }

/* Turn contact records into deduped, valid email recipients. Shape
   mirrors marketing-campaigns.js exactly ({ email, firstName, company })
   so a list can be handed straight to a broadcast / api/broadcast. */
export function contactsToRecipients(contacts) {
  const seen = new Set();
  const out = [];
  for (const c of contacts || []) {
    const email = (c.email || '').trim();
    if (!EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      email,
      firstName: c.firstName || '',
      company: (c.companyId && getCompany(c.companyId)?.name) || '',
    });
  }
  return out;
}
export function resolveListRecipients(list) { return contactsToRecipients(resolveListMembers(list)); }

/* ------------------------------------------------------------
   AUDIENCE DESCRIPTOR  (the shared contract for AudiencePicker)
   Every marketing tool resolves an audience through these two
   functions, so lists and ad-hoc filters are interchangeable.
   ------------------------------------------------------------ */
export const ALL_AUDIENCE = { type: 'all' };

export function resolveAudienceMembers(descriptor) {
  const d = descriptor || ALL_AUDIENCE;
  if (d.type === 'list') return resolveListMembersById(d.listId);
  if (d.type === 'segment') return resolveSegmentMembers(d.segment);
  if (d.type === 'filter') return applyView(getContacts(), { filters: d.filters || [], sort: null }, 'contact', ctx());
  // 'all' (or unknown) -> the whole book
  return getContacts();
}
export function resolveAudienceRecipients(descriptor) {
  return contactsToRecipients(resolveAudienceMembers(descriptor));
}
export function audienceMemberCount(descriptor) { return resolveAudienceMembers(descriptor).length; }
export function audienceRecipientCount(descriptor) { return resolveAudienceRecipients(descriptor).length; }

export function describeAudience(descriptor) {
  const d = descriptor || ALL_AUDIENCE;
  if (d.type === 'list') { const l = getList(d.listId); return l ? l.name : 'Deleted list'; }
  if (d.type === 'segment') return describeSegment(d.segment);
  if (d.type === 'filter') {
    const n = (d.filters || []).length;
    return n === 0 ? 'All contacts' : `Filtered (${n} condition${n === 1 ? '' : 's'})`;
  }
  return 'All contacts';
}

/* ============================================================
   SEED  (one static + one active list so the hub is not empty)
   ============================================================ */
function buildSeed() {
  // Static snapshot: the first handful of emailable contacts, frozen
  // at seed time. Real ids from the live store so membership is real.
  const emailable = getContacts().filter(c => EMAIL_RE.test((c.email || '').trim()));
  const vipIds = emailable.slice(0, 8).map(c => c.id);
  const lists = [
    {
      id: 'ls_vip',
      name: 'Launch VIP list',
      kind: 'static',
      description: 'Hand-picked accounts to email first when something ships.',
      color: '#5b4bf5',
      contactIds: vipIds,
      filters: [],
      sort: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'ls_mine',
      name: 'My contacts',
      kind: 'active',
      description: 'Everyone assigned to me. Recomputes as ownership changes.',
      color: '#0ea5a3',
      contactIds: [],
      filters: [{ fieldKey: 'ownerId', op: 'is', value: '@me' }],
      segment: null,
      sort: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'ls_hot',
      name: 'Hot buyers (segment)',
      kind: 'segment',
      description: 'Customers OR open opportunities. Any-of logic across two condition groups. Recomputes live.',
      color: '#e0752d',
      contactIds: [],
      filters: [],
      segment: {
        match: 'any',
        groups: [
          { match: 'all', conditions: [{ fieldKey: 'lifecycleStage', op: 'is', value: 'customer' }] },
          { match: 'all', conditions: [{ fieldKey: 'lifecycleStage', op: 'is', value: 'opportunity' }] },
        ],
      },
      sort: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
  return { seededAt: nowIso(), lists };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetLists() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

// Subscribe to the lists slice. NOTE: active-list counts also depend on the
// core store, so a component showing live counts should ALSO call useStore()
// so it re-renders when the book of business changes.
export function useLists(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `ls_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getLists = () => state.lists;
export const getList = (id) => state.lists.find(l => l.id === id) || null;

// Roll-up KPIs for the hub header.
export function listStats() {
  const ls = state.lists;
  const totalMembers = ls.reduce((s, l) => s + resolveListMembers(l).length, 0);
  return {
    total: ls.length,
    static: ls.filter(l => l.kind === 'static').length,
    active: ls.filter(l => l.kind === 'active').length,
    segment: ls.filter(l => l.kind === 'segment').length,
    totalMembers,
  };
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
function normKind(k) { return k === 'active' ? 'active' : k === 'segment' ? 'segment' : 'static'; }

// SUPABASE: from('rally_lists').insert(row).select().single()
export function createList({ name, kind = 'static', description = '', filters = [], contactIds = [], segment = null, sort = null, color = '#5b4bf5' } = {}) {
  if (!name || !name.trim()) return { error: 'name', message: 'Name your list.' };
  const k = normKind(kind);
  const l = {
    id: newId(),
    name: name.trim(),
    kind: k,
    description: String(description || ''),
    color: color || '#5b4bf5',
    // static lists carry the id snapshot; active lists carry the flat filter
    // set; segment lists carry the AND/OR segment definition.
    contactIds: k === 'static' ? [...new Set((contactIds || []).filter(Boolean))] : [],
    filters: k === 'active' ? (filters || []) : [],
    segment: k === 'segment' ? normSegment(segment) : null,
    sort: k === 'active' ? (sort || null) : null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, lists: [l, ...state.lists] });
  return { list: l };
}

export function updateList(id, patch = {}) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  const next = { ...l, ...patch };
  if (patch.kind != null) next.kind = normKind(patch.kind);
  if (typeof next.name === 'string') next.name = next.name.trim();
  if (!next.name) return { error: 'name', message: 'Name your list.' };
  if (Array.isArray(next.contactIds)) next.contactIds = [...new Set(next.contactIds.filter(Boolean))];
  if (patch.segment != null) next.segment = normSegment(patch.segment);
  next.updatedAt = nowIso();
  commit({ ...state, lists: state.lists.map(x => x.id === id ? next : x) });
  return { list: next };
}

export function deleteList(id) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  commit({ ...state, lists: state.lists.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicateList(id) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  const copy = {
    ...l,
    id: newId(),
    name: `${l.name} (copy)`,
    contactIds: [...(l.contactIds || [])],
    filters: (l.filters || []).map(f => ({ ...f })),
    segment: l.segment ? normSegment(l.segment) : null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, lists: [copy, ...state.lists] });
  return { list: copy };
}

/* ------------------------------------------------------------
   Static-list membership editing (no-ops on active lists, which
   derive membership from their filter and cannot be hand-edited).
   ------------------------------------------------------------ */
export function addToList(id, contactIds) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  if (l.kind !== 'static') return { error: 'kind', message: 'Active lists recompute their own membership.' };
  const add = Array.isArray(contactIds) ? contactIds : [contactIds];
  const merged = [...new Set([...(l.contactIds || []), ...add.filter(Boolean)])];
  return updateList(id, { contactIds: merged });
}
export function removeFromList(id, contactIds) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  if (l.kind !== 'static') return { error: 'kind', message: 'Active lists recompute their own membership.' };
  const drop = new Set(Array.isArray(contactIds) ? contactIds : [contactIds]);
  return updateList(id, { contactIds: (l.contactIds || []).filter(cid => !drop.has(cid)) });
}
export function setListMembers(id, contactIds) {
  const l = getList(id);
  if (!l) return { error: 'missing', message: 'List not found.' };
  if (l.kind !== 'static') return { error: 'kind', message: 'Active lists recompute their own membership.' };
  return updateList(id, { contactIds: Array.isArray(contactIds) ? contactIds : [] });
}

// Snapshot an active list (or an ad-hoc filter set) into a NEW static list,
// freezing the current membership. Handy for "lock in who is in this segment
// right now before I send". Additive convenience over createList.
export function snapshotToStaticList(name, source) {
  const members = Array.isArray(source)
    ? source
    : (source && source.filters)
      ? applyView(getContacts(), { filters: source.filters, sort: null }, 'contact', ctx())
      : resolveListMembers(source);
  return createList({ name, kind: 'static', contactIds: members.map(c => c.id) });
}
