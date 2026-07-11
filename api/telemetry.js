// POST /api/telemetry
//
// The serverless sink for Rally's browser observability. The client (logger.js
// + analytics.js) sends two batch shapes here:
//   { kind: 'logs',   records: [ { ts, level, msg, ctx, path, session_id } ] }
//   { kind: 'events', events:  [ { type, name, props, path, ts, session_id } ] }
//
// Behavior:
//   - Best-effort persist to the Supabase table `rally_telemetry` when
//     SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set. If not configured, or
//     if the insert fails, we still return 200 - telemetry must never surface
//     an error to the browser or cause the client to retry-storm.
//   - Rate-limit friendly: per-request row cap, payload size guard, and a
//     cheap in-memory per-session throttle so a hot loop cannot flood the DB.
//   - No PII is stored beyond whatever the client already scrubbed; we do not
//     log request bodies and never echo them back.
//
// GET returns a tiny status so you can confirm the route is wired. NO em-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const MAX_ROWS = 50;          // rows accepted per request
const MAX_BODY_BYTES = 64 * 1024; // ignore anything larger (defensive)
const THROTTLE_WINDOW_MS = 10_000;
const THROTTLE_MAX = 120;     // rows per session per window

// Module-scope throttle map. Serverless instances are short-lived, so this is a
// soft guard (per warm instance), not a hard global limit. Good enough to blunt
// a runaway client without any external store.
const seen = new Map(); // session_id -> { count, resetAt }

function throttled(sessionId, incoming) {
  if (!sessionId) return false;
  const now = Date.now();
  let rec = seen.get(sessionId);
  if (!rec || now > rec.resetAt) { rec = { count: 0, resetAt: now + THROTTLE_WINDOW_MS }; seen.set(sessionId, rec); }
  rec.count += incoming;
  // Opportunistic cleanup so the map cannot grow unbounded on a warm instance.
  if (seen.size > 500) { for (const [k, v] of seen) { if (now > v.resetAt) seen.delete(k); } }
  return rec.count > THROTTLE_MAX;
}

const clampStr = (v, max) => (v == null ? null : String(v).slice(0, max));
const LEVELS = new Set(['debug', 'info', 'warn', 'error']);

// Normalize either shape into a common row for the table. Unknown fields are
// dropped. Whatever the client sent in ctx/props is stored as-is in a jsonb
// column after a size clamp (client already scrubbed PII).
function toRows(body) {
  const rows = [];
  const sid = clampStr(body.session_id, 80);

  if (Array.isArray(body.records)) {
    for (const r of body.records) {
      if (!r || typeof r !== 'object') continue;
      rows.push({
        kind: 'log',
        level: LEVELS.has(r.level) ? r.level : 'info',
        name: clampStr(r.msg, 300),
        props: clampJson(r.ctx),
        path: clampStr(r.path, 200),
        session_id: clampStr(r.session_id, 80) || sid,
        ts: normTs(r.ts),
      });
    }
  }
  if (Array.isArray(body.events)) {
    for (const e of body.events) {
      if (!e || typeof e !== 'object') continue;
      rows.push({
        kind: e.type === 'pageview' ? 'pageview' : 'event',
        level: null,
        name: clampStr(e.name, 200),
        props: clampJson(e.props),
        path: clampStr(e.path, 200),
        session_id: clampStr(e.session_id, 80) || sid,
        ts: normTs(e.ts),
      });
    }
  }
  return rows.slice(0, MAX_ROWS);
}

function normTs(ts) {
  const d = ts ? new Date(ts) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Keep jsonb payloads small and serializable; never store a giant blob.
function clampJson(obj) {
  if (obj == null || typeof obj !== 'object') return null;
  try {
    const s = JSON.stringify(obj);
    if (s.length > 4000) return { _truncated: true };
    return JSON.parse(s);
  } catch { return null; }
}

async function persist(rows) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { stored: false, reason: 'no-db' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supa.from('rally_telemetry').insert(rows.map((r) => ({
      kind: r.kind, level: r.level, name: r.name, props: r.props,
      path: r.path, session_id: r.session_id, ts: r.ts,
    })));
    if (error) { console.warn('[telemetry] insert skipped:', error.message); return { stored: false, reason: 'insert-error' }; }
    return { stored: true };
  } catch (e) {
    console.warn('[telemetry] persist failed:', e?.message);
    return { stored: false, reason: 'exception' };
  }
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, sink: 'rally_telemetry', configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  // Size guard - large bodies are dropped without work (still 200 / accepted).
  try {
    const len = Number(req.headers?.['content-length'] || 0);
    if (len && len > MAX_BODY_BYTES) return res.status(200).json({ ok: true, accepted: 0, reason: 'too-large' });
  } catch { /* ignore */ }

  const body = readJsonBody(req);
  const rows = toRows(body);
  if (!rows.length) return res.status(200).json({ ok: true, accepted: 0 });

  if (throttled(clampStr(body.session_id, 80), rows.length)) {
    // Accept without persisting so the client does not retry.
    return res.status(200).json({ ok: true, accepted: 0, throttled: true });
  }

  const result = await persist(rows);
  return res.status(200).json({ ok: true, accepted: rows.length, stored: result.stored });
});
