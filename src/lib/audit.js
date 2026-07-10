// ============================================================
// RALLY AUDIT LOG  (spec Section 5.9 - Wave 1)
// One org-wide changelog: every field change on every object as
// { at, who, objectType, recordId, field, from, to }. Generalizes
// dealExtras.history to the whole platform. Persisted to
// localStorage (rally_audit_v1), newest first, capped at 2000
// entries FIFO (oldest fall off).
// SUPABASE: rally_audit (append-only table, index on objectType + recordId)
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_audit_v1';
const CAP = 2000;

let entries = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function commit(next) {
  entries = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch {}
  subs.forEach(fn => fn(entries));
}
export function resetAudit() { try { localStorage.removeItem(LS_KEY); } catch {} entries = []; subs.forEach(fn => fn(entries)); }
export function useAudit(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(entries));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(entries); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `au_${(idc++).toString(36)}`;

/* Record one field change. who = user name or 'system' / 'ai' /
   'automation:<id>'. Returns the entry. */
export function logChange(objectType, recordId, field, from, to, who = 'You') {
  const entry = {
    id: newId(), at: new Date().toISOString(), who,
    objectType, recordId, field,
    from: from === undefined ? null : from,
    to: to === undefined ? null : to,
  };
  commit([entry, ...entries].slice(0, CAP));
  return entry;
}

/* History for one record, newest first. */
export const getAudit = (objectType, recordId) =>
  entries.filter(e => e.objectType === objectType && e.recordId === recordId);

/* The whole org-wide log (admin surface, Wave 8). */
export const getAuditLog = () => entries;
