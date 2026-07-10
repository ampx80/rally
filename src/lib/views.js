// ============================================================
// RALLY VIEWS ENGINE  (Wave 3)
// Every list is a saved, executable view: a set of filters +
// columns + sort + visualization over an object type. System
// views ship seeded; user views persist to rally_views_v1. The
// Leads page is literally the "Leads" saved view on contacts,
// completing the no-lead-conversion model.
// SUPABASE: rally_views (per-user + shared views).
// ============================================================
import { useEffect, useState } from 'react';
import { getField, getFieldValue } from './fields.js';

const LS_KEY = 'rally_views_v1';
const now = () => new Date().toISOString();

/* ------------------------------------------------------------
   Filter operators, typed by field kind
   ------------------------------------------------------------ */
export const OPS_BY_TYPE = {
  text: ['contains', 'notContains', 'equals', 'isEmpty', 'isNotEmpty'],
  longtext: ['contains', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'gt', 'lt', 'between', 'isEmpty'],
  currency: ['equals', 'gt', 'lt', 'between', 'isEmpty'],
  percent: ['equals', 'gt', 'lt', 'between'],
  date: ['before', 'after', 'lastNDays', 'thisMonth', 'isEmpty'],
  datetime: ['before', 'after', 'lastNDays', 'thisMonth'],
  picklist: ['is', 'isNot', 'anyOf', 'isEmpty'],
  status: ['is', 'isNot', 'anyOf'],
  multiPicklist: ['anyOf', 'isEmpty'],
  boolean: ['isTrue', 'isFalse'],
  user: ['is', 'isNot', 'isEmpty'],
};
export const OP_LABEL = {
  contains: 'contains', notContains: 'does not contain', equals: 'is', is: 'is', isNot: 'is not',
  anyOf: 'is any of', gt: 'greater than', lt: 'less than', between: 'between',
  before: 'before', after: 'after', lastNDays: 'in the last N days', thisMonth: 'this month',
  isEmpty: 'is empty', isNotEmpty: 'is not empty', isTrue: 'is checked', isFalse: 'is unchecked',
};
export function opsForType(type) {
  if (['number', 'currency', 'percent', 'duration'].includes(type)) return OPS_BY_TYPE.currency;
  if (['date', 'datetime', 'timeline'].includes(type)) return OPS_BY_TYPE.date;
  if (['picklist', 'status'].includes(type)) return OPS_BY_TYPE.picklist;
  return OPS_BY_TYPE[type] || OPS_BY_TYPE.text;
}

/* ------------------------------------------------------------
   Seeded system views
   ------------------------------------------------------------ */
const DAY = 86400000;
function seedViews() {
  const v = (id, objectType, name, extra) => ({ id, objectType, name, system: true, filters: [], sort: null, viz: 'table', columns: null, ...extra });
  return [
    // Contacts (Leads becomes a saved view on the single contact object)
    v('c_all', 'contact', 'All contacts', { columns: ['name', 'title', 'companyId', 'email', 'lifecycleStage', 'ownerId', 'lastActivityAt'] }),
    v('c_mine', 'contact', 'My contacts', { filters: [{ fieldKey: 'ownerId', op: 'is', value: '@me' }] }),
    v('c_leads', 'contact', 'Leads', { filters: [{ fieldKey: 'lifecycleStage', op: 'anyOf', value: ['lead', 'mql', 'sql', 'subscriber'] }], columns: ['name', 'title', 'companyId', 'leadStatus', 'leadScore', 'leadSource', 'ownerId'] }),
    v('c_recent', 'contact', 'Recently active', { sort: { key: 'lastActivityAt', dir: 'desc' } }),
    // Companies
    v('co_all', 'company', 'All accounts', { columns: ['name', 'industry', 'size', 'health', 'ownerId', 'location'] }),
    v('co_mine', 'company', 'My accounts', { filters: [{ fieldKey: 'ownerId', op: 'is', value: '@me' }] }),
    v('co_risk', 'company', 'At risk', { filters: [{ fieldKey: 'health', op: 'is', value: 'red' }] }),
    // Deals
    v('d_open', 'deal', 'Open pipeline', { filters: [{ fieldKey: 'status', op: 'is', value: 'open' }], sort: { key: 'value', dir: 'desc' }, columns: ['name', 'companyId', 'stage', 'value', 'probability', 'closeDate', 'ownerId'] }),
    v('d_closing', 'deal', 'Closing this month', { filters: [{ fieldKey: 'status', op: 'is', value: 'open' }, { fieldKey: 'closeDate', op: 'thisMonth', value: null }], sort: { key: 'closeDate', dir: 'asc' } }),
    v('d_slipping', 'deal', 'Slipping', { filters: [{ fieldKey: 'status', op: 'is', value: 'open' }, { fieldKey: 'closeDate', op: 'before', value: 'today' }], sort: { key: 'closeDate', dir: 'asc' } }),
    v('d_won', 'deal', 'Won', { filters: [{ fieldKey: 'status', op: 'is', value: 'won' }], sort: { key: 'closeDate', dir: 'desc' } }),
  ];
}
const SYSTEM_VIEWS = seedViews();

/* ------------------------------------------------------------
   Persistence + pub/sub
   ------------------------------------------------------------ */
let userViews = load();
const subs = new Set();
function load() { try { const r = localStorage.getItem(LS_KEY); if (r) return JSON.parse(r); } catch {} return []; }
function commit(next) { userViews = next; try { localStorage.setItem(LS_KEY, JSON.stringify(userViews)); } catch {} subs.forEach(fn => fn(userViews)); }
export function resetViews() { try { localStorage.removeItem(LS_KEY); } catch {} userViews = []; subs.forEach(fn => fn(userViews)); }

export function getViews(objectType) {
  return [...SYSTEM_VIEWS.filter(v => v.objectType === objectType), ...userViews.filter(v => v.objectType === objectType)];
}
export function getView(id) { return SYSTEM_VIEWS.find(v => v.id === id) || userViews.find(v => v.id === id); }
export function useViews(objectType) {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force(n => n + 1); subs.add(fn); return () => subs.delete(fn); }, []);
  return getViews(objectType);
}

let idc = Date.now();
const nid = () => `uv_${(idc++).toString(36)}`;
export function createView(objectType, def = {}) {
  const view = { id: nid(), objectType, name: def.name || 'New view', system: false, filters: def.filters || [], columns: def.columns || null, sort: def.sort || null, viz: def.viz || 'table', groupBy: def.groupBy || null, createdAt: now() };
  commit([...userViews, view]);
  return view;
}
export function updateView(id, patch) {
  const v = userViews.find(x => x.id === id);
  if (!v) { // editing a system view forks it
    const sys = SYSTEM_VIEWS.find(x => x.id === id);
    if (sys) return createView(sys.objectType, { ...sys, name: sys.name + ' (copy)', ...patch });
    return null;
  }
  commit(userViews.map(x => x.id === id ? { ...x, ...patch } : x));
  return getView(id);
}
export function deleteView(id) { commit(userViews.filter(x => x.id !== id)); }
export function duplicateView(id) {
  const v = getView(id); if (!v) return null;
  return createView(v.objectType, { ...v, name: v.name + ' (copy)' });
}

/* ------------------------------------------------------------
   Filter evaluation + view application
   ------------------------------------------------------------ */
function resolveMagic(val, ctx) {
  if (val === '@me') return ctx.currentUserId;
  if (val === 'today') return Date.now();
  return val;
}
function matchFilter(record, filter, objectType, ctx) {
  const fd = getField(objectType, filter.fieldKey);
  if (!fd) return true;
  const raw = getFieldValue(record, fd);
  const val = resolveMagic(filter.value, ctx);
  const s = (x) => String(x ?? '').toLowerCase();
  switch (filter.op) {
    case 'contains': return s(raw).includes(s(val));
    case 'notContains': return !s(raw).includes(s(val));
    case 'equals': case 'is': return s(raw) === s(val);
    case 'isNot': return s(raw) !== s(val);
    case 'anyOf': { const arr = Array.isArray(val) ? val.map(s) : [s(val)]; const rv = Array.isArray(raw) ? raw.map(s) : [s(raw)]; return rv.some(r => arr.includes(r)); }
    case 'gt': return Number(raw) > Number(val);
    case 'lt': return Number(raw) < Number(val);
    case 'between': return Array.isArray(val) && Number(raw) >= Number(val[0]) && Number(raw) <= Number(val[1]);
    case 'before': return raw && new Date(raw).getTime() < Number(new Date(val).getTime ? new Date(val) : val);
    case 'after': return raw && new Date(raw).getTime() > Number(new Date(val).getTime ? new Date(val) : val);
    case 'lastNDays': return raw && (Date.now() - new Date(raw).getTime()) <= Number(val) * DAY;
    case 'thisMonth': { if (!raw) return false; const d = new Date(raw), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
    case 'isEmpty': return raw == null || raw === '' || (Array.isArray(raw) && !raw.length);
    case 'isNotEmpty': return !(raw == null || raw === '' || (Array.isArray(raw) && !raw.length));
    case 'isTrue': return raw === true || raw === 'true';
    case 'isFalse': return !(raw === true || raw === 'true');
    default: return true;
  }
}
export function applyView(records, view, objectType, ctx = {}) {
  if (!view) return records;
  let out = records.filter(r => (view.filters || []).every(f => matchFilter(r, f, objectType, ctx)));
  if (view.sort && view.sort.key) {
    const fd = getField(objectType, view.sort.key);
    const dir = view.sort.dir === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => {
      const av = fd ? getFieldValue(a, fd) : a[view.sort.key];
      const bv = fd ? getFieldValue(b, fd) : b[view.sort.key];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      const ad = Date.parse(av), bd = Date.parse(bv);
      if (!Number.isNaN(ad) && !Number.isNaN(bd)) return (ad - bd) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return out;
}
