// POST /api/monitor-report
//
// A server-side sink for Ardovo error reports, and an alternative to the browser
// posting straight to Sentry. It accepts one or more normalized error records
// and fans them out in priority order:
//   1. If SENTRY_DSN (server var) is set, forward each as a Sentry envelope.
//   2. Else if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, insert into the
//      `rally_errors` table.
//   3. Else 200 no-op (nothing configured -> accept and drop).
//
// It NEVER surfaces an error to the caller: like /api/telemetry it always
// returns 200 so the browser cannot enter a retry storm. Payloads are bounded
// (row cap + body-size guard) and PII-safe (the client already scrubs; we clamp
// and re-scrub free text defensively here too).
//
// Accepted body shapes (all optional fields tolerated):
//   { errors: [ { name, message, stack, ctx, path, ts, kind, release, environment, session_id } ] }
//   { error:  { ...one record... } }        // single
//   { ...one record... }                     // bare single record
//
// GET returns a tiny status so you can confirm wiring. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const MAX_ROWS = 25;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MSG = 1000;
const MAX_STACK = 4000;

// ---- PII-safe clamps (defensive; client scrubs first) ----
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONGNUM_RE = /\b\d[\d\s-]{10,}\d\b/g;
function scrubText(s) {
  if (s == null) return null;
  let out = String(s);
  try { out = out.replace(EMAIL_RE, '[email]').replace(LONGNUM_RE, '[number]'); } catch { /* ignore */ }
  return out;
}
const clampStr = (v, max) => (v == null ? null : scrubText(String(v)).slice(0, max));

function clampJson(obj) {
  if (obj == null || typeof obj !== 'object') return null;
  try {
    const s = JSON.stringify(obj);
    if (s.length > 4000) return { _truncated: true };
    // Re-scrub any string leaves for stray PII, then reparse.
    return JSON.parse(scrubText(s));
  } catch { return null; }
}

function normTs(ts) {
  const d = ts ? new Date(ts) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Pull records out of whatever shape arrived.
function toRecords(body) {
  let list = [];
  if (Array.isArray(body.errors)) list = body.errors;
  else if (body.error && typeof body.error === 'object') list = [body.error];
  else if (body.message || body.name || body.stack) list = [body]; // bare record
  const out = [];
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    out.push({
      kind: clampStr(r.kind, 40) || 'error',
      name: clampStr(r.name, 120) || 'Error',
      message: clampStr(r.message, MAX_MSG) || '',
      stack: clampStr(r.stack, MAX_STACK),
      ctx: clampJson(r.ctx),
      path: clampStr(r.path, 200),
      release: clampStr(r.release, 120),
      environment: clampStr(r.environment, 60),
      session_id: clampStr(r.session_id || body.session_id, 80),
      ts: normTs(r.ts),
    });
  }
  return out.slice(0, MAX_ROWS);
}

// ---- Sentry (server-side forward) ----
function parseDsn(dsn) {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '').split('/').filter(Boolean).pop();
    if (!publicKey || !projectId) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${projectId}/envelope/`, publicKey, projectId, dsn };
  } catch { return null; }
}

function eventId() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function toFrames(stack) {
  if (!stack) return undefined;
  const frames = [];
  for (const line of String(stack).split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/(?:at\s+)?(.*?)\s*[@(]?\s*((?:https?|file|webpack|blob):[^\s)]+|[^\s)]+):(\d+):(\d+)\)?/);
    if (m) frames.push({ function: (m[1] || '?').slice(0, 200) || '?', filename: (m[2] || '').slice(0, 300), lineno: Number(m[3]) || undefined, colno: Number(m[4]) || undefined, in_app: true });
  }
  return frames.length ? frames.reverse().slice(-40) : undefined;
}

function buildEnvelope(rec, dsn) {
  const id = eventId();
  const header = { event_id: id, sent_at: new Date().toISOString(), dsn };
  const itemHeader = { type: 'event' };
  const frames = toFrames(rec.stack);
  const event = {
    event_id: id,
    timestamp: Date.parse(rec.ts) / 1000 || Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    logger: 'rally.monitoring.server',
    release: rec.release || undefined,
    environment: rec.environment || undefined,
    transaction: rec.path || undefined,
    tags: { session: rec.session_id || undefined, kind: rec.kind, path: rec.path || undefined },
    extra: rec.ctx || undefined,
    exception: { values: [{ type: rec.name, value: rec.message, stacktrace: frames ? { frames } : undefined }] },
  };
  return [JSON.stringify(header), JSON.stringify(itemHeader), JSON.stringify(event)].join('\n');
}

async function forwardToSentry(records, target) {
  const url = `${target.endpoint}?sentry_key=${encodeURIComponent(target.publicKey)}&sentry_version=7&sentry_client=rally-monitor-server%2F1.0`;
  let sent = 0;
  for (const rec of records) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope' }, body: buildEnvelope(rec, target.dsn) });
      if (r && r.ok) sent++;
    } catch (e) { console.warn('[monitor-report] sentry forward failed:', e?.message); }
  }
  return { sink: 'sentry', sent };
}

// ---- Supabase (durable fallback) ----
async function insertToSupabase(records) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { sink: 'none', stored: false, reason: 'no-db' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supa.from('rally_errors').insert(records.map((r) => ({
      kind: r.kind, name: r.name, message: r.message, stack: r.stack,
      ctx: r.ctx, path: r.path, release: r.release, environment: r.environment,
      session_id: r.session_id, ts: r.ts,
    })));
    if (error) { console.warn('[monitor-report] insert skipped:', error.message); return { sink: 'supabase', stored: false, reason: 'insert-error' }; }
    return { sink: 'supabase', stored: true };
  } catch (e) {
    console.warn('[monitor-report] persist failed:', e?.message);
    return { sink: 'supabase', stored: false, reason: 'exception' };
  }
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    const sentry = Boolean(process.env.SENTRY_DSN);
    const db = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return res.status(200).json({ ok: true, sink: sentry ? 'sentry' : (db ? 'rally_errors' : 'none'), configured: sentry || db });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  // Size guard - oversized bodies are accepted-and-dropped (still 200).
  try {
    const len = Number(req.headers?.['content-length'] || 0);
    if (len && len > MAX_BODY_BYTES) return res.status(200).json({ ok: true, accepted: 0, reason: 'too-large' });
  } catch { /* ignore */ }

  const records = toRecords(readJsonBody(req));
  if (!records.length) return res.status(200).json({ ok: true, accepted: 0 });

  const target = parseDsn(process.env.SENTRY_DSN);
  let result;
  if (target) result = await forwardToSentry(records, target);
  else result = await insertToSupabase(records);

  return res.status(200).json({ ok: true, accepted: records.length, ...result });
});
