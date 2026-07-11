// Rally structured logger.
//
// A tiny, dependency-free logger for the browser. Four things it does:
//   1. Levels (debug/info/warn/error) with a numeric floor so noise is cheap.
//   2. Context binding - logger.with({ area: 'deals' }) returns a child that
//      stamps that context onto every line (parent context merges in).
//   3. An in-memory ring buffer (last N records) you can dump for a bug report
//      via logger.snapshot(). Nothing is ever sent anywhere unless configured.
//   4. Optional best-effort POST of warn/error records to /api/telemetry when
//      VITE_TELEMETRY is turned on. Failures are swallowed - logging must never
//      throw, never surface a network error, never block the app.
//
// Safe/no-op posture: with no env configured you still get console output in
// dev and the ring buffer, but zero network traffic. NO em-dash / en-dash.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

// import.meta.env is statically replaced by Vite; guard so a non-Vite runtime
// (tests, SSR probes) never explodes on the access.
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

// Do-not-track: respected for the network sink only (local logging still runs).
function doNotTrack() {
  try {
    const n = typeof navigator !== 'undefined' ? navigator : null;
    const w = typeof window !== 'undefined' ? window : null;
    const dnt = (n && (n.doNotTrack || n.msDoNotTrack)) || (w && w.doNotTrack);
    return dnt === '1' || dnt === 'yes' || dnt === true;
  } catch { return false; }
}

// ---- config (read once, all optional) ----
const TELEMETRY_ON = truthy(env('VITE_TELEMETRY'));
const TELEMETRY_URL = (env('VITE_TELEMETRY_URL') || '/api/telemetry').toString();
const MIN_LEVEL = (() => {
  const want = String(env('VITE_LOG_LEVEL') || (isDev ? 'debug' : 'info')).toLowerCase();
  return LEVELS[want] != null ? LEVELS[want] : LEVELS.info;
})();
const RING_MAX = 200;      // records kept in memory
const POST_MIN_LEVEL = LEVELS.warn; // only warn/error go to the network
const BATCH_MS = 4000;     // flush cadence
const BATCH_MAX = 20;      // records per flush

// ---- state ----
const ring = [];           // circular-ish buffer (shift when full)
let queue = [];            // records waiting to be POSTed
let timer = null;
// Stable-per-tab id so records from one session can be grouped. Not PII.
const sessionId = (() => {
  try {
    const KEY = 'rally.sid';
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(KEY, v); }
    return v;
  } catch { return 's_' + Math.random().toString(36).slice(2); }
})();

function pushRing(rec) {
  ring.push(rec);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
}

function scheduleFlush() {
  if (timer || typeof window === 'undefined') return;
  timer = setTimeout(() => { timer = null; flush(); }, BATCH_MS);
}

// Best-effort delivery. sendBeacon first (survives unload), fetch+keepalive as
// fallback. Every path is wrapped so a failure is silent.
function deliver(records) {
  const body = JSON.stringify({ kind: 'logs', session_id: sessionId, records });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(TELEMETRY_URL, blob)) return;
    }
  } catch { /* fall through to fetch */ }
  try {
    if (typeof fetch === 'function') {
      fetch(TELEMETRY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
        .catch(() => {});
    }
  } catch { /* swallow */ }
}

function flush() {
  if (!queue.length) return;
  if (!TELEMETRY_ON || doNotTrack()) { queue = []; return; }
  const batch = queue.slice(0, BATCH_MAX);
  queue = queue.slice(BATCH_MAX);
  deliver(batch);
  if (queue.length) scheduleFlush();
}

// Trim a value so a stray huge object never bloats the buffer or a request.
function safeContext(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  const out = {};
  let n = 0;
  for (const k of Object.keys(obj)) {
    if (n++ >= 24) break;
    const v = obj[k];
    if (v == null) { out[k] = v; continue; }
    if (typeof v === 'string') out[k] = v.length > 500 ? v.slice(0, 500) + '...' : v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (v instanceof Error) out[k] = { name: v.name, message: v.message };
    else { try { out[k] = JSON.parse(JSON.stringify(v)); } catch { out[k] = String(v); } }
  }
  return out;
}

const consoleFor = (level) =>
  (level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? (console.debug || console.log) : (console.info || console.log));

function record(baseContext, level, message, context) {
  const lvl = LEVELS[level] != null ? LEVELS[level] : LEVELS.info;
  if (lvl < MIN_LEVEL) return;

  const merged = { ...(baseContext || {}), ...(safeContext(context) || {}) };
  const rec = {
    ts: new Date().toISOString(),
    level,
    msg: typeof message === 'string' ? message : String(message),
    ctx: Object.keys(merged).length ? merged : undefined,
    session_id: sessionId,
    path: (() => { try { return typeof location !== 'undefined' ? location.pathname : undefined; } catch { return undefined; } })(),
  };
  pushRing(rec);

  if (isDev) {
    const c = consoleFor(level);
    try { rec.ctx ? c(`[rally] ${rec.msg}`, rec.ctx) : c(`[rally] ${rec.msg}`); } catch { /* ignore */ }
  }

  if (TELEMETRY_ON && !doNotTrack() && lvl >= POST_MIN_LEVEL) {
    queue.push(rec);
    if (queue.length >= BATCH_MAX) flush(); else scheduleFlush();
  }
}

// Flush on the way out so buffered warn/error records are not lost on navigate.
if (typeof window !== 'undefined') {
  const onLeave = () => { try { flush(); } catch { /* ignore */ } };
  window.addEventListener('pagehide', onLeave);
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onLeave(); });
}

function make(baseContext) {
  return {
    debug: (msg, ctx) => record(baseContext, 'debug', msg, ctx),
    info: (msg, ctx) => record(baseContext, 'info', msg, ctx),
    warn: (msg, ctx) => record(baseContext, 'warn', msg, ctx),
    error: (msg, ctx) => record(baseContext, 'error', msg, ctx),
    // Bind more context; returns a child logger.
    with: (ctx) => make({ ...(baseContext || {}), ...(safeContext(ctx) || {}) }),
    // Snapshot the in-memory ring buffer (newest last). For bug reports.
    snapshot: () => ring.slice(),
    // Force a delivery now (best-effort). Returns nothing, never throws.
    flush: () => { try { flush(); } catch { /* ignore */ } },
    sessionId,
    configured: TELEMETRY_ON,
  };
}

export const logger = make(null);
export default logger;
