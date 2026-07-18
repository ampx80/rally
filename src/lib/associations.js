// ============================================================
// ARDOVO LABELED ASSOCIATIONS  (local-first, Supabase-swappable)
// A general record-linking model, in the spirit of HubSpot
// associations. One persisted table links ANY two records to each
// other with a human label, e.g.:
//   company -> contact   'decision maker'
//   company -> contact   'billing contact'
//   deal    -> contact   'technical buyer'
//   company -> company   'parent' / 'partner'
//
// Every row is a single directed edge (fromType/fromId ->
// toType/toId) carrying a `label`. Associations are MANY-TO-MANY:
// a record can be linked to any number of other records under any
// number of labels, and a pair can be linked under several labels.
// Resolution is direction-agnostic - associationsFor(type,id)
// returns every edge touching a record on EITHER end, so a panel
// mounted on the contact side sees the same link the company side
// created.
//
// This slice is ADDITIVE and READ-ONLY over the existing book of
// business. It NEVER mutates store.js / store-quote.js records; it
// only READS them to resolve display names and links, and persists
// its own edges to localStorage (rally_associations_v1). Same
// pub/sub + deterministic-seed pattern as store.js / lists.js so it
// feels alive with no backend. Live equivalent: a rally_associations
// table (from_type,from_id,to_type,to_id,label).
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getContact, contactName, getContacts,
  getCompany, getCompanies,
  getDeal, getDeals, getContactsForCompany,
} from './store.js';
import { quoteById } from './store-quote.js';
import { getQuotes } from './store-ext.js';

const LS_KEY = 'rally_associations_v1';   // bump to force a clean reseed
const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------
   Which record types can take part in an association. These are
   the object types with a resolver below. contact/company/deal/
   quote all have a detail route, so their links are navigable.
   ------------------------------------------------------------ */
export const ASSOCIABLE_TYPES = [
  { type: 'contact', label: 'Contact', plural: 'Contacts', icon: 'users' },
  { type: 'company', label: 'Company', plural: 'Companies', icon: 'building2' },
  { type: 'deal', label: 'Deal', plural: 'Deals', icon: 'deals' },
  { type: 'quote', label: 'Quote', plural: 'Quotes', icon: 'fileText' },
];
export const typeMeta = (type) =>
  ASSOCIABLE_TYPES.find(t => t.type === type) || { type, label: type, plural: type, icon: 'box' };
export const isAssociableType = (type) => ASSOCIABLE_TYPES.some(t => t.type === type);

/* Suggested labels (the picker offers these but any free text is allowed). */
export const ASSOCIATION_LABELS = [
  'decision maker', 'billing contact', 'technical buyer', 'economic buyer',
  'champion', 'influencer', 'primary contact', 'legal contact',
  'parent', 'child', 'partner', 'reseller', 'vendor', 'related',
];

/* ------------------------------------------------------------
   Record resolver. Given (type,id) return a display shape:
     { type, id, name, sub, to, icon, found }
   `to` is a route path when the type has a detail page, else null.
   A missing record still resolves (found:false) so a link to a
   since-deleted record degrades gracefully instead of throwing.
   ------------------------------------------------------------ */
function moneyShort(n) {
  if (n == null || isNaN(n)) return '';
  if (Math.abs(n) >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
}

export function resolveRecord(type, id) {
  const meta = typeMeta(type);
  let rec = null, name = '', sub = '', to = null;
  switch (type) {
    case 'contact': {
      rec = getContact(id);
      if (rec) {
        name = contactName(rec);
        const co = rec.companyId ? getCompany(rec.companyId) : null;
        sub = rec.title || (co ? co.name : '') || '';
        to = `/contacts/${id}`;
      }
      break;
    }
    case 'company': {
      rec = getCompany(id);
      if (rec) { name = rec.name; sub = rec.industry || rec.domain || ''; to = `/companies/${id}`; }
      break;
    }
    case 'deal': {
      rec = getDeal(id);
      if (rec) { name = rec.name; sub = moneyShort(rec.value); to = `/deals/${id}`; }
      break;
    }
    case 'quote': {
      rec = quoteById(id);
      if (rec) { name = rec.number || 'Quote'; sub = rec.companyName || rec.status || ''; to = `/quotes/${id}`; }
      break;
    }
    default:
      break;
  }
  if (!rec) return { type, id, name: 'Deleted record', sub: '', to: null, icon: meta.icon, found: false };
  return { type, id, name, sub, to, icon: meta.icon, found: true };
}

/* Candidate pool for a type, used by the picker search. Returns raw
   store records (resolved to display shape by searchRecords). */
function poolFor(type) {
  switch (type) {
    case 'contact': return getContacts();
    case 'company': return getCompanies();
    case 'deal': return getDeals();
    case 'quote': return getQuotes();
    default: return [];
  }
}

/* Search a type's records by free text, resolved to display shape,
   excluding one record (usually the record the panel is mounted on). */
export function searchRecords(type, query, { excludeType, excludeId, limit = 25 } = {}) {
  const q = (query || '').trim().toLowerCase();
  const out = [];
  for (const rec of poolFor(type)) {
    if (excludeType === type && excludeId === rec.id) continue;
    const r = resolveRecord(type, rec.id);
    if (!r.found) continue;
    if (q && !(`${r.name} ${r.sub}`.toLowerCase().includes(q))) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

/* ============================================================
   SEED  (a few associations off the flagship so the panels demo)
   Resolved from the LIVE store at load time (real ids), so the
   edges point at records that actually exist in the seeded book.
   Any edge whose endpoints do not resolve is dropped.
   ============================================================ */
function buildSeed() {
  const edges = [];
  const flagshipCo = getCompany('co_flagship');
  const flagshipContacts = getContactsForCompany('co_flagship');
  const flagshipDeal = getDeal('d_flagship');
  const otherCos = getCompanies().filter(c => c.id !== 'co_flagship');

  const add = (fromType, fromId, toType, toId, label) => {
    if (!fromId || !toId) return;
    edges.push({
      id: `as_seed_${edges.length + 1}`,
      fromType, fromId, toType, toId,
      label,
      note: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  };

  if (flagshipCo) {
    // Company -> its people, each under a distinct labeled role.
    if (flagshipContacts[0]) add('company', 'co_flagship', 'contact', flagshipContacts[0].id, 'decision maker');
    if (flagshipContacts[1]) add('company', 'co_flagship', 'contact', flagshipContacts[1].id, 'billing contact');
    if (flagshipContacts[2]) add('company', 'co_flagship', 'contact', flagshipContacts[2].id, 'champion');
    // Company -> company relationships.
    if (otherCos[0]) add('company', 'co_flagship', 'company', otherCos[0].id, 'partner');
    if (otherCos[1]) add('company', 'co_flagship', 'company', otherCos[1].id, 'parent');
  }
  if (flagshipDeal) {
    // Deal -> the buying committee.
    if (flagshipContacts[0]) add('deal', 'd_flagship', 'contact', flagshipContacts[0].id, 'decision maker');
    if (flagshipContacts[2]) add('deal', 'd_flagship', 'contact', flagshipContacts[2].id, 'technical buyer');
  }

  return { seededAt: nowIso(), associations: edges };
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
export function resetAssociations() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

// Subscribe to the associations slice. NOTE: resolved names/links also
// depend on the core store, so a component showing links should ALSO
// call useStore() so it re-renders when the underlying records change.
export function useAssociations(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `as_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getAssociations = () => state.associations;
export const getAssociation = (id) => state.associations.find(a => a.id === id) || null;

// Every edge touching (type,id) on EITHER end. Direction-agnostic.
export function associationsFor(type, id) {
  if (!type || !id) return [];
  return state.associations.filter(a =>
    (a.fromType === type && a.fromId === id) ||
    (a.toType === type && a.toId === id)
  );
}

// The associated records on the OTHER end of each edge, resolved to
// display shape. Optionally filter to one label.
//   -> [{ association, label, direction:'out'|'in', record }]
export function associatedRecords(type, id, { label } = {}) {
  const rows = associationsFor(type, id).filter(a => !label || a.label === label);
  return rows.map(a => {
    const isFrom = a.fromType === type && a.fromId === id;
    const otherType = isFrom ? a.toType : a.fromType;
    const otherId = isFrom ? a.toId : a.fromId;
    return {
      association: a,
      label: a.label,
      direction: isFrom ? 'out' : 'in',
      record: resolveRecord(otherType, otherId),
    };
  });
}

// Grouped by label for the panel: [{ label, items:[...] }], labels A-Z.
export function associationsGrouped(type, id) {
  const items = associatedRecords(type, id);
  const map = new Map();
  for (const it of items) {
    const key = it.label || 'related';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return [...map.entries()]
    .map(([label, its]) => ({ label, items: its }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function associationCount(type, id) { return associationsFor(type, id).length; }

/* Unordered endpoint+label identity, used to block duplicate edges
   regardless of which side created them. */
function sameLink(a, fromType, fromId, toType, toId, label) {
  const lbl = (label || '').trim().toLowerCase();
  if ((a.label || '').trim().toLowerCase() !== lbl) return false;
  const forward = a.fromType === fromType && a.fromId === fromId && a.toType === toType && a.toId === toId;
  const reverse = a.fromType === toType && a.fromId === toId && a.toType === fromType && a.toId === fromId;
  return forward || reverse;
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
// SUPABASE: from('rally_associations').insert(row).select().single()
export function createAssociation({ fromType, fromId, toType, toId, label = 'related', note = '' } = {}) {
  if (!fromType || !fromId) return { error: 'from', message: 'Missing source record.' };
  if (!toType || !toId) return { error: 'to', message: 'Pick a record to link.' };
  if (fromType === toType && fromId === toId) return { error: 'self', message: 'A record cannot be linked to itself.' };
  const lbl = (label || 'related').trim() || 'related';
  if (state.associations.some(a => sameLink(a, fromType, fromId, toType, toId, lbl))) {
    return { error: 'dup', message: 'That link already exists.' };
  }
  const a = {
    id: newId(),
    fromType, fromId, toType, toId,
    label: lbl,
    note: String(note || ''),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, associations: [a, ...state.associations] });
  return { association: a };
}

// Convenience: link two records by (type,id) tuples.
export function linkRecords(from, to, label = 'related', note = '') {
  return createAssociation({
    fromType: from?.type, fromId: from?.id,
    toType: to?.type, toId: to?.id,
    label, note,
  });
}

export function updateAssociation(id, patch = {}) {
  const a = getAssociation(id);
  if (!a) return { error: 'missing', message: 'Association not found.' };
  const next = { ...a, ...patch };
  if (typeof next.label === 'string') next.label = next.label.trim() || 'related';
  next.updatedAt = nowIso();
  commit({ ...state, associations: state.associations.map(x => x.id === id ? next : x) });
  return { association: next };
}

export function removeAssociation(id) {
  const a = getAssociation(id);
  if (!a) return { error: 'missing', message: 'Association not found.' };
  commit({ ...state, associations: state.associations.filter(x => x.id !== id) });
  return { ok: true, id };
}
// Alias for symmetry with the rest of the store CRUD naming.
export const deleteAssociation = removeAssociation;
