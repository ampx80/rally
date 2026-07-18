// ============================================================
// ARDOVO CONTEXT LAYER  (governance state for the "Data 360" answer)
//
// The Context page visualizes every source an agent can ground on. This
// module owns the GOVERNANCE state for that layer: which sources are exposed
// to agents (read scope) and which PII sources are masked before an agent
// ever sees them. Local-first (localStorage rally_context_v1), pub/sub like
// store.js so every surface stays in sync. The book itself lives in
// store.js / store-ext.js; this only holds the governance envelope on top.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_context_v1';

// Sources that carry personally identifiable information. These default to
// masked so an agent grounds on structure, not raw PII, unless a human lifts
// the mask deliberately.
export const PII_SOURCES = ['contacts', 'leads'];

function defaults() {
  return { exposed: {}, masked: { contacts: true, leads: true } };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { exposed: parsed.exposed || {}, masked: parsed.masked || {} };
    }
  } catch {}
  const seed = defaults();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

let state = load();
const subs = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function useContextGov(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

export function getGov() { return state; }

// Exposed defaults to ON. A source is only hidden from agents when a human
// explicitly flips it off (stored as an explicit false).
export function isExposed(key) { return state.exposed[key] !== false; }
export function isMasked(key) { return !!state.masked[key]; }

export function toggleExpose(key) {
  const exposed = { ...state.exposed, [key]: !isExposed(key) };
  commit({ ...state, exposed });
  return isExposed(key);
}

export function toggleMask(key) {
  const masked = { ...state.masked, [key]: !isMasked(key) };
  commit({ ...state, masked });
  return isMasked(key);
}

export function resetGov() { commit(defaults()); }

/* ---------- small pure helpers shared by the page ---------- */

// Coverage as a whole-number percent of records that satisfy a predicate.
export function coveragePct(records, predicate) {
  if (!records || !records.length) return 0;
  let hit = 0;
  for (const r of records) { if (predicate(r)) hit++; }
  return Math.round((hit / records.length) * 100);
}

// Mask an email to its domain so agents can reason about the account without
// seeing the person. "maria.chen@vertex.com" -> "***@vertex.com".
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at === -1) return '***';
  return '***' + email.slice(at);
}

// Mask a person's name to initials. "Maria Chen" -> "M. C."
export function maskName(name) {
  if (!name || typeof name !== 'string') return '***';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '***';
  return parts.map(p => p[0].toUpperCase() + '.').join(' ');
}
