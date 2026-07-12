// ============================================================
// RALLY LISTS + SEGMENTATION  (local-first, Supabase-swappable)
// The audience layer that feeds every marketing send. A list is a
// named, resolvable audience over the contact book, in one of two
// kinds:
//   static  - an explicit membership snapshot (a frozen set of
//             contact ids the user hand-picks or imports).
//   active  - a saved-view filter (typed operators from views.js)
//             that RECOMPUTES membership every time it is read, so
//             the list stays live as the book of business changes.
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

/* ------------------------------------------------------------
   Membership resolution
   static -> map the frozen id snapshot back to live records (drop
             any that were since deleted, preserve snapshot order).
   active -> run the saved-view filter over the current contacts.
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
    totalMembers,
  };
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
function normKind(k) { return k === 'active' ? 'active' : 'static'; }

// SUPABASE: from('rally_lists').insert(row).select().single()
export function createList({ name, kind = 'static', description = '', filters = [], contactIds = [], sort = null, color = '#5b4bf5' } = {}) {
  if (!name || !name.trim()) return { error: 'name', message: 'Name your list.' };
  const k = normKind(kind);
  const l = {
    id: newId(),
    name: name.trim(),
    kind: k,
    description: String(description || ''),
    color: color || '#5b4bf5',
    // static lists carry the id snapshot; active lists carry the filter set.
    contactIds: k === 'static' ? [...new Set((contactIds || []).filter(Boolean))] : [],
    filters: k === 'active' ? (filters || []) : [],
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
