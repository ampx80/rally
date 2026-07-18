// Ardovo error monitoring - lightweight, privacy-first, env-gated.
//
// This is the "did something break" layer that sits above the structured
// logger. It captures uncaught errors (window.onerror), unhandled promise
// rejections, and anything the app hands it via captureError(err, ctx). Every
// captured error is deduped, PII-scrubbed, and shipped to a sink.
//
// Dual-mode sink:
//   - If VITE_SENTRY_DSN is set, each error is POSTed to that project's Sentry
//     envelope endpoint in the minimal event format Sentry accepts.
//   - Otherwise it falls back to the existing /api/telemetry sink (as a `logs`
//     batch with level 'error', so it lands in rally_telemetry alongside the
//     logger output). Override the fallback URL with VITE_MONITOR_URL.
//
// Safe/no-op posture: with NEITHER a DSN nor telemetry turned on, capture is a
// cheap no-op - nothing hits the network. Do-Not-Track is honored for the
// network sink. Every path is wrapped so monitoring NEVER throws into the app.
//
// ASCII only. NO em-dash / en-dash.

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

// ---- config (read once, all optional) ----
const SENTRY_DSN = String(env('VITE_SENTRY_DSN') || '').trim();
const TELEMETRY_ON = truthy(env('VITE_TELEMETRY'));
const FALLBACK_URL = (env('VITE_MONITOR_URL') || env('VITE_TELEMETRY_URL') || '/api/telemetry').toString();
const RELEASE = String(env('VITE_RELEASE') || env('VITE_VERCEL_GIT_COMMIT_SHA') || '').trim() || undefined;
const ENVIRONMENT = String(env('VITE_ENV') || env('VITE_VERCEL_ENV') || (isDev ? 'development' : 'production')).trim();

const DEDUPE_WINDOW_MS = 15_000; // drop identical errors seen within this window
const DEDUPE_MAX = 200;          // signatures retained (bounded memory)
const MAX_STACK = 4000;          // stack chars kept
const MAX_MSG = 1000;            // message chars kept

// Where errors go. sentry when a DSN parses, telemetry when the flag is on,
// otherwise 'none' (pure no-op). Computed once.
const sentryTarget = parseDsn(SENTRY_DSN);
const MODE = sentryTarget ? 'sentry' : (TELEMETRY_ON ? 'telemetry' : 'none');

// ---- PII scrubbing (same posture as analytics.js) ----
const PII_KEYS = ['email', 'name', 'phone', 'password', 'token', 'secret', 'ssn', 'address', 'card', 'dob', 'ip', 'auth', 'apikey', 'api_key'];
function looksPii(key) {
  const k = String(key).toLowerCase();
  return PII_KEYS.some((p) => k.includes(p));
}
// Redact obvious PII inside a free-text string (emails, long digit runs that
// look like cards/phones). Best-effort; keeps the string readable.
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONGNUM_RE = /\b\d[\d\s-]{10,}\d\b/g;
function scrubText(s) {
  if (s == null) return s;
  let out = String(s);
  try { out = out.replace(EMAIL_RE, '[email]').replace(LONGNUM_RE, '[number]'); } catch { /* ignore */ }
  return out;
}
// Only primitives survive, only non-PII keys, strings capped and text-scrubbed.
function scrubContext(props) {
  if (!props || typeof props !== 'object') return undefined;
  const out = {};
  let n = 0;
  for (const k of Object.keys(props)) {
    if (n >= 24) break;
    if (looksPii(k)) continue;
    const v = props[k];
    if (v == null) { out[k] = v; n++; continue; }
    const t = typeof v;
    if (t === 'string') { out[k] = scrubText(v).slice(0, 300); n++; }
    else if (t === 'number' || t === 'boolean') { out[k] = v; n++; }
    // objects/arrays/functions dropped (no PII leakage, keeps payload small)
  }
  return Object.keys(out).length ? out : undefined;
}

// ---- session id (shared convention with logger/analytics) ----
const sessionId = (() => {
  try {
    const KEY = 'rally.sid';
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(KEY, v); }
    return v;
  } catch { return 's_' + Math.random().toString(36).slice(2); }
})();

// ---- dedupe ----
const recent = new Map(); // signature -> lastSeen ms
function dedupeHit(sig) {
  const now = Date.now();
  const last = recent.get(sig);
  if (last != null && now - last < DEDUPE_WINDOW_MS) { recent.set(sig, now); return true; }
  recent.set(sig, now);
  if (recent.size > DEDUPE_MAX) {
    // Drop the oldest half so the map stays bounded.
    const entries = [...recent.entries()].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < entries.length / 2; i++) recent.delete(entries[i][0]);
  }
  return false;
}

// ---- normalize an error-ish input into a stable record ----
function toRecord(err, ctx, kind) {
  let name = 'Error';
  let message = '';
  let stack = null;
  if (err instanceof Error) {
    name = err.name || 'Error';
    message = err.message || String(err);
    stack = err.stack || null;
  } else if (err && typeof err === 'object') {
    name = err.name || 'Error';
    message = err.message != null ? String(err.message) : safeStringify(err);
    stack = err.stack || null;
  } else {
    message = String(err);
  }
  message = scrubText(message).slice(0, MAX_MSG);
  stack = stack ? scrubText(stack).slice(0, MAX_STACK) : null;

  let path = '';
  try { path = typeof location !== 'undefined' ? location.pathname : ''; } catch { /* ignore */ }

  return {
    kind: kind || 'error',
    name: String(name).slice(0, 120),
    message,
    stack,
    ctx: scrubContext(ctx),
    path,
    ts: new Date().toISOString(),
    session_id: sessionId,
    release: RELEASE,
    environment: ENVIRONMENT,
  };
}

function safeStringify(obj) {
  try { return JSON.stringify(obj).slice(0, MAX_MSG); } catch { return String(obj); }
}

// Signature for dedupe - name + first line of message + first stack frame.
function signatureOf(rec) {
  const firstFrame = (rec.stack || '').split('\n').find((l) => /at\s|@/.test(l)) || '';
  return (rec.name + '|' + rec.message.slice(0, 120) + '|' + firstFrame.trim().slice(0, 160));
}

// ================= Sentry envelope path =================
// Parse a DSN of the form https://PUBLIC_KEY@HOST/PROJECT_ID into the pieces we
// need to build the envelope endpoint. Returns null if it does not look valid.
function parseDsn(dsn) {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '').split('/').filter(Boolean).pop();
    if (!publicKey || !projectId) return null;
    const endpoint = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
    return { endpoint, publicKey, projectId };
  } catch { return null; }
}

// 32-char hex event id (Sentry requires this shape).
function eventId() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// Turn a "stack" string into Sentry stacktrace frames (best-effort, newest
// last as Sentry expects). We keep this minimal and never fail.
function toFrames(stack) {
  if (!stack) return undefined;
  const lines = String(stack).split('\n').map((l) => l.trim()).filter(Boolean);
  const frames = [];
  for (const line of lines) {
    // Matches "at fn (file:line:col)" and "fn@file:line:col" shapes.
    const m = line.match(/(?:at\s+)?(.*?)\s*[@(]?\s*((?:https?|file|webpack|blob):[^\s)]+|[^\s)]+):(\d+):(\d+)\)?/);
    if (m) {
      frames.push({
        function: (m[1] || '?').slice(0, 200) || '?',
        filename: (m[2] || '').slice(0, 300),
        lineno: Number(m[3]) || undefined,
        colno: Number(m[4]) || undefined,
        in_app: true,
      });
    }
  }
  if (!frames.length) return undefined;
  // Sentry renders frames oldest-first; reverse the JS convention (newest-first).
  return frames.reverse().slice(-40);
}

function buildSentryEnvelope(rec) {
  const id = eventId();
  const header = { event_id: id, sent_at: new Date().toISOString(), dsn: SENTRY_DSN };
  const itemHeader = { type: 'event' };
  const frames = toFrames(rec.stack);
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    logger: 'rally.monitoring',
    release: rec.release,
    environment: rec.environment,
    transaction: rec.path || undefined,
    tags: { session: rec.session_id, kind: rec.kind, path: rec.path || undefined },
    extra: rec.ctx || undefined,
    request: (() => { try { return { url: typeof location !== 'undefined' ? location.href : undefined }; } catch { return undefined; } })(),
    exception: {
      values: [{
        type: rec.name,
        value: rec.message,
        stacktrace: frames ? { frames } : undefined,
      }],
    },
  };
  return [JSON.stringify(header), JSON.stringify(itemHeader), JSON.stringify(event)].join('\n');
}

function shipToSentry(rec) {
  if (!sentryTarget) return;
  const url = `${sentryTarget.endpoint}?sentry_key=${encodeURIComponent(sentryTarget.publicKey)}&sentry_version=7&sentry_client=rally-monitor%2F1.0`;
  const body = buildSentryEnvelope(rec);
  postBeaconOrFetch(url, body, 'application/x-sentry-envelope');
}

// ================= telemetry fallback path =================
// Formats the error as a `logs` batch the existing /api/telemetry sink already
// understands (level 'error'), so it lands in rally_telemetry.
function shipToTelemetry(rec) {
  const record = {
    ts: rec.ts,
    level: 'error',
    msg: rec.message,
    ctx: {
      source: 'monitor',
      name: rec.name,
      kind: rec.kind,
      stack: rec.stack ? rec.stack.slice(0, 2000) : undefined,
      release: rec.release,
      environment: rec.environment,
      ...(rec.ctx || {}),
    },
    path: rec.path,
    session_id: rec.session_id,
  };
  const body = JSON.stringify({ kind: 'logs', session_id: sessionId, records: [record] });
  postBeaconOrFetch(FALLBACK_URL, body, 'application/json');
}

// ---- shared best-effort delivery (sendBeacon first, fetch+keepalive next) ----
function postBeaconOrFetch(url, body, contentType) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: contentType });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch { /* fall through to fetch */ }
  try {
    if (typeof fetch === 'function') {
      fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body, keepalive: true, mode: 'cors' }).catch(() => {});
    }
  } catch { /* swallow */ }
}

// ---- public capture API ----

// captureError(err, ctx) - the main entry point. Records, dedupes, scrubs, and
// ships. Returns nothing and NEVER throws.
export function captureError(err, ctx, kind) {
  try {
    if (MODE === 'none') { if (isDev) devEcho(err, ctx); return; }
    if (doNotTrack()) return; // network sink respects DNT
    const rec = toRecord(err, ctx, kind);
    if (dedupeHit(signatureOf(rec))) return;
    if (isDev) devEcho(err, ctx);
    if (MODE === 'sentry') shipToSentry(rec);
    else shipToTelemetry(rec);
  } catch { /* monitoring must never surface an error */ }
}

// captureMessage(message, ctx) - capture a non-Error condition worth watching.
export function captureMessage(message, ctx) {
  try { captureError(new Error(String(message)), ctx, 'message'); } catch { /* ignore */ }
}

function devEcho(err, ctx) {
  try {
    const c = console.error || console.log;
    ctx ? c('[rally/monitor]', err, ctx) : c('[rally/monitor]', err);
  } catch { /* ignore */ }
}

// Introspection (used by monitoring-init and tests). No behavior.
export const monitoringMode = MODE;                 // 'sentry' | 'telemetry' | 'none'
export const monitoringEnabled = MODE !== 'none' && !doNotTrack();
export const monitoringSessionId = sessionId;

export default { captureError, captureMessage, monitoringMode, monitoringEnabled, monitoringSessionId };
