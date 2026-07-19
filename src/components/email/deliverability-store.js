// ============================================================
// DELIVERABILITY STORE  (local-first, backend-hydratable)
// Backs the suppression manager + preference center. Real
// suppression lives in Supabase (rally_email_excluded /
// rally_email_unsubscribes) and is enforced by api/_lib-email.js on
// every send; this store mirrors it locally so the UI works with no
// backend and stays live during a session.
//
//   - suppression: manual excludes + unsubscribes + webhook-driven
//     bounces/complaints. syncFromApi() pulls the real lists from
//     /api/marketing-cron?action=suppression; writes go through
//     addSuppression/removeSuppression which POST to the same
//     endpoint AND update the local mirror (optimistic).
//   - preferences: the per-recipient topic subscription state a
//     preference center would persist. Local-only concept model.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_deliverability_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The subscription topics a recipient can manage in the preference center.
export const PREFERENCE_TOPICS = [
  { id: 'product', label: 'Product updates', hint: 'New features, releases, and improvements.' },
  { id: 'newsletter', label: 'Newsletter', hint: 'Our periodic roundup and best practices.' },
  { id: 'promotions', label: 'Offers and promotions', hint: 'Occasional pricing and upgrade offers.' },
  { id: 'events', label: 'Events and webinars', hint: 'Invitations to live sessions and events.' },
];

function buildSeed() {
  const now = Date.now();
  const iso = (n) => new Date(now - n * 86400000).toISOString();
  return {
    seededAt: now,
    suppression: [
      { email: 'bounced.mailbox@example.com', reason: 'hard-bounce', list: 'excluded', at: iso(4) },
      { email: 'not.interested@example.com', reason: 'complaint', list: 'unsubscribes', at: iso(9) },
    ],
    preferences: {},
    syncedAt: null,
  };
}

/* ---------- persistence + pub/sub ---------- */
let state = load();
const subs = new Set();

function normalize(s) {
  return {
    seededAt: s?.seededAt || Date.now(),
    suppression: Array.isArray(s?.suppression) ? s.suppression : [],
    preferences: s && typeof s.preferences === 'object' && s.preferences ? s.preferences : {},
    syncedAt: s?.syncedAt || null,
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetDeliverability() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useDeliverability(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

/* ---------- suppression reads ---------- */
export const getSuppression = () => (Array.isArray(state.suppression) ? state.suppression : []);
export function suppressionStats() {
  const all = getSuppression();
  return {
    total: all.length,
    excluded: all.filter(s => s.list === 'excluded').length,
    unsubscribes: all.filter(s => s.list === 'unsubscribes').length,
    bounces: all.filter(s => /bounce/i.test(s.reason || '')).length,
    complaints: all.filter(s => /complain/i.test(s.reason || '')).length,
  };
}
export function isSuppressed(email) {
  const key = String(email || '').toLowerCase();
  return getSuppression().some(s => s.email === key);
}

/* ---------- suppression writes (optimistic local + best-effort API) ---------- */
async function postSuppression(op, email, list, reason) {
  if (typeof fetch !== 'function') return { ok: false, skipped: 'no-fetch' };
  try {
    const res = await fetch('/api/marketing-cron', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suppression', op, email, list, reason }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok !== false, ...json };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'network' };
  }
}

export async function addSuppression(email, { list = 'excluded', reason = 'manual' } = {}) {
  const key = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(key)) return { error: 'email', message: 'Enter a valid email address.' };
  if (getSuppression().some(s => s.email === key && s.list === list)) return { error: 'dupe', message: 'Already suppressed.' };
  commit({ ...state, suppression: [{ email: key, reason, list, at: new Date().toISOString() }, ...state.suppression] });
  const api = await postSuppression('add', key, list, reason);   // best-effort durable write
  return { ok: true, email: key, configured: !!api.configured };
}

export async function removeSuppression(email, list) {
  const key = String(email || '').trim().toLowerCase();
  commit({ ...state, suppression: state.suppression.filter(s => !(s.email === key && (!list || s.list === list))) });
  const api = await postSuppression('remove', key, list, null);
  return { ok: true, email: key, configured: !!api.configured };
}

// Pull the real suppression lists from the backend and mirror them locally.
// A missing / unconfigured backend keeps the local mirror untouched.
export async function syncFromApi() {
  if (typeof fetch !== 'function') return { ok: false, skipped: 'no-fetch' };
  try {
    const res = await fetch('/api/marketing-cron?action=suppression');
    if (!res.ok) return { ok: false, skipped: `http-${res.status}` };
    const json = await res.json().catch(() => ({}));
    if (!json || json.configured === false) return { ok: true, configured: false };
    const merged = [
      ...(json.excluded || []).map(r => ({ email: String(r.email || '').toLowerCase(), reason: r.reason || 'excluded', list: 'excluded', at: r.created_at || new Date().toISOString() })),
      ...(json.unsubscribes || []).map(r => ({ email: String(r.email || '').toLowerCase(), reason: r.reason || 'unsubscribe', list: 'unsubscribes', at: r.created_at || new Date().toISOString() })),
    ].filter(r => EMAIL_RE.test(r.email));
    commit({ ...state, suppression: merged, syncedAt: Date.now() });
    return { ok: true, configured: true, count: merged.length };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'network' };
  }
}

/* ---------- preference center (concept model, local) ---------- */
// Returns the topic subscription state for a recipient. Default: subscribed to
// everything, not globally unsubscribed.
export function getPreferences(email) {
  const key = String(email || '').toLowerCase();
  const stored = state.preferences[key];
  const topics = {};
  for (const t of PREFERENCE_TOPICS) topics[t.id] = stored?.topics?.[t.id] !== false;
  return { unsubscribedAll: !!stored?.unsubscribedAll || isSuppressed(key), topics };
}

export function setPreference(email, topicId, on) {
  const key = String(email || '').toLowerCase();
  if (!EMAIL_RE.test(key)) return;
  const cur = getPreferences(key);
  const topics = { ...cur.topics, [topicId]: !!on };
  commit({ ...state, preferences: { ...state.preferences, [key]: { ...state.preferences[key], topics, unsubscribedAll: cur.unsubscribedAll } } });
}

// RFC 8058 one-click unsubscribe (what the List-Unsubscribe-Post header triggers).
// Flips global unsubscribe + adds the address to the local suppression mirror.
export async function unsubscribeAll(email) {
  const key = String(email || '').toLowerCase();
  if (!EMAIL_RE.test(key)) return { error: 'email' };
  commit({ ...state, preferences: { ...state.preferences, [key]: { ...state.preferences[key], unsubscribedAll: true } } });
  return addSuppression(key, { list: 'unsubscribes', reason: 'preference-center' });
}

export async function resubscribeAll(email) {
  const key = String(email || '').toLowerCase();
  commit({ ...state, preferences: { ...state.preferences, [key]: { ...state.preferences[key], unsubscribedAll: false } } });
  return removeSuppression(key, 'unsubscribes');
}
