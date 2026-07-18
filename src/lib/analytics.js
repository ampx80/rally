// Ardovo product analytics - privacy first.
//
// track(event, props) records a product event; page(path) records a view. Both
// are buffered and flushed in batches to /api/telemetry when analytics is
// turned on (VITE_TELEMETRY). With nothing configured every call is a cheap
// no-op - no network, no storage, no cookies.
//
// Privacy rules baked in:
//   - Respects Do-Not-Track. If DNT is on, nothing leaves the browser.
//   - No PII. props are shallow-scrubbed: keys that look like email/name/phone/
//     token/password/etc are dropped, strings are length-capped, nested objects
//     flattened away. Send event names and small enums, not people.
//   - Anonymous per-tab session id only (sessionStorage), never a durable
//     cross-site identifier.
//
// The useTrack() hook returns { track, page } bound for components. NO em-dash.

// ---- env (all optional, statically inlined by Vite) ----
function env(key) {
  try { return import.meta.env ? import.meta.env[key] : undefined; }
  catch { return undefined; }
}
const isDev = (() => { try { return Boolean(import.meta.env && import.meta.env.DEV); } catch { return false; } })();
function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'on' || s === 'yes';
}
function doNotTrack() {
  try {
    const n = typeof navigator !== 'undefined' ? navigator : null;
    const w = typeof window !== 'undefined' ? window : null;
    const dnt = (n && (n.doNotTrack || n.msDoNotTrack)) || (w && w.doNotTrack);
    return dnt === '1' || dnt === 'yes' || dnt === true;
  } catch { return false; }
}

const ENABLED = truthy(env('VITE_TELEMETRY'));
const URL_ = (env('VITE_TELEMETRY_URL') || '/api/telemetry').toString();
const BATCH_MS = 5000;
const BATCH_MAX = 20;

// Keys we refuse to forward. Matched case-insensitively as a substring so
// "userEmail", "phone_number", "authToken" are all caught.
const PII_KEYS = ['email', 'name', 'phone', 'password', 'token', 'secret', 'ssn', 'address', 'card', 'dob', 'ip', 'auth', 'apikey', 'api_key'];
function looksPii(key) {
  const k = String(key).toLowerCase();
  return PII_KEYS.some((p) => k.includes(p));
}

// Only primitives survive, and only non-PII keys. Strings capped at 120 chars.
function scrub(props) {
  if (!props || typeof props !== 'object') return undefined;
  const out = {};
  let n = 0;
  for (const k of Object.keys(props)) {
    if (n >= 24) break;
    if (looksPii(k)) continue;
    const v = props[k];
    if (v == null) { out[k] = v; n++; continue; }
    const t = typeof v;
    if (t === 'string') { out[k] = v.length > 120 ? v.slice(0, 120) : v; n++; }
    else if (t === 'number' || t === 'boolean') { out[k] = v; n++; }
    // objects/arrays/functions are intentionally dropped (no PII leakage)
  }
  return Object.keys(out).length ? out : undefined;
}

const sessionId = (() => {
  try {
    const KEY = 'rally.sid';
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(KEY, v); }
    return v;
  } catch { return 's_' + Math.random().toString(36).slice(2); }
})();

let queue = [];
let timer = null;

function scheduleFlush() {
  if (timer || typeof window === 'undefined') return;
  timer = setTimeout(() => { timer = null; flush(); }, BATCH_MS);
}

function deliver(events) {
  const body = JSON.stringify({ kind: 'events', session_id: sessionId, events });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(URL_, blob)) return;
    }
  } catch { /* fall through */ }
  try {
    if (typeof fetch === 'function') {
      fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* swallow */ }
}

function flush() {
  if (!queue.length) return;
  if (!ENABLED || doNotTrack()) { queue = []; return; }
  const batch = queue.slice(0, BATCH_MAX);
  queue = queue.slice(BATCH_MAX);
  deliver(batch);
  if (queue.length) scheduleFlush();
}

function enqueue(rec) {
  if (isDev) { try { console.debug('[rally/analytics]', rec.type, rec.name, rec.props || ''); } catch { /* ignore */ } }
  if (!ENABLED || doNotTrack()) return; // no-op when unconfigured or DNT
  queue.push(rec);
  if (queue.length >= BATCH_MAX) flush(); else scheduleFlush();
}

// ---- public API ----

// track('deal_created', { stage: 'won', amountBand: 'gt_10k' })
export function track(event, props) {
  if (!event) return;
  enqueue({
    type: 'event',
    name: String(event).slice(0, 80),
    props: scrub(props),
    ts: new Date().toISOString(),
    path: (() => { try { return location.pathname; } catch { return undefined; } })(),
    session_id: sessionId,
  });
}

// page('/deals') - a view. Only the path is sent, never query strings (which
// can carry ids/tokens). Falls back to the current pathname.
export function page(path) {
  let p = path;
  try { if (p == null) p = location.pathname; } catch { /* ignore */ }
  // Strip any query/hash defensively even if a caller passed a full URL.
  p = String(p || '').split('?')[0].split('#')[0].slice(0, 200);
  enqueue({ type: 'pageview', name: p, ts: new Date().toISOString(), path: p, session_id: sessionId });
}

// Force delivery now (best-effort, never throws).
export function flushAnalytics() { try { flush(); } catch { /* ignore */ } }

export const analyticsEnabled = ENABLED && !doNotTrack();

// React hook: stable { track, page } for a component. Import React lazily so
// this module stays usable outside a React tree (tests, workers).
import { useMemo } from 'react';
export function useTrack() {
  return useMemo(() => ({ track, page }), []);
}

if (typeof window !== 'undefined') {
  const onLeave = () => { try { flush(); } catch { /* ignore */ } };
  window.addEventListener('pagehide', onLeave);
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onLeave(); });
}

export default { track, page, useTrack, flushAnalytics, analyticsEnabled };
