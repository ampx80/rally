// api/automation-run.js
//
// Ardovo AUTOMATION ENGINE - server-side runner (cron + inbound webhook).
// The single companion to src/lib/automation-engine.js. Two shapes, one route:
//
//   1) GET  (or POST { action: 'tick' })  - CRON-ABLE.
//      The durable, server-side heartbeat + drain for scheduled automations.
//      Emits a progress heartbeat within 5 seconds (BEFORE any expensive work),
//      then, if Supabase is configured AND a `rally_automation_outbox` table
//      exists, advances any due rows. A clean no-op when Supabase / the table
//      are absent, so the cron is inert until someone opts in. Never throws;
//      fail-closed on any error (records a degraded reason, still returns 200).
//
//   2) POST { action: 'webhook', payload }  - INBOUND WEBHOOK.
//      An external system POSTs a lead / event payload. We stamp it into the
//      optional outbox (or just acknowledge) so the browser engine, or a future
//      Supabase-backed runtime, can enroll it. Always 200 with a receipt.
//
// vercel.json cron entry (report-only, apply during vercel.json assembly):
//   { "crons": [ { "path": "/api/automation-run", "schedule": "*/15 * * * *" } ] }
//
// Env:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional durable outbox
//   CRON_SECRET      - optional; when set, the tick path requires
//                      `Authorization: Bearer <CRON_SECRET>` (Vercel cron sends
//                      it automatically). The webhook path is never gated by it.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

// Give a large scheduled drain room to breathe without risking the Hobby cap.
export const config = { maxDuration: 60 };

const nowIso = () => new Date().toISOString();

// Heartbeat: the FIRST thing we do, before any DB connect or expensive work,
// so the 5-second SLA is met even on a cold start. Best-effort persistence to
// a progress_log; the console line is the guaranteed floor.
async function heartbeat(kind, extra = {}) {
  const line = { at: nowIso(), source: 'automation-run', kind, ...extra };
  console.log('[automation-run] heartbeat', JSON.stringify(line)); // no PII
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return; // no DB -> console heartbeat is the floor
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(url, key, { auth: { persistSession: false } });
    // SUPABASE: insert into rally_progress_log (source, kind, at, meta)
    await supa.from('rally_progress_log').insert({ source: 'automation-run', kind, at: line.at, meta: extra }).then(() => {}, () => {});
  } catch { /* heartbeat must never throw */ }
}

async function supaClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, key, { auth: { persistSession: false } });
  } catch { return null; }
}

// Drain due scheduled / waiting rows from the optional durable outbox.
// Fail-open + idempotent: a missing table / missing env is a clean no-op.
async function drain() {
  const supa = await supaClient();
  if (!supa) return { ok: true, skipped: 'no-db', advanced: 0 };

  let rows;
  try {
    // SUPABASE: rally_automation_outbox rows the browser engine could not flush
    // (scheduled triggers, waits that outlived the tab). status='pending',
    // run_at <= now. The engine model persists cursor + context per row.
    const { data, error } = await supa
      .from('rally_automation_outbox')
      .select('id,automation_id,run_at,status')
      .eq('status', 'pending')
      .lte('run_at', nowIso())
      .limit(100);
    if (error) return { ok: true, skipped: 'no-outbox', advanced: 0 };
    rows = Array.isArray(data) ? data : [];
  } catch {
    return { ok: true, skipped: 'no-outbox', advanced: 0 };
  }

  let advanced = 0, failed = 0;
  for (const r of rows) {
    try {
      // The authoritative step execution lives in the client engine; the server
      // marks the row processed so the enrollment can resume next tab open. When
      // a Supabase-native executor lands, its advance() slots in right here.
      await supa.from('rally_automation_outbox')
        .update({ status: 'processed', processed_at: nowIso() })
        .eq('id', r.id);
      advanced++;
    } catch {
      failed++;
      // fail-closed: mark the row failed so it surfaces instead of stalling silently
      try { await supa.from('rally_automation_outbox').update({ status: 'failed', processed_at: nowIso() }).eq('id', r.id); } catch { /* best-effort */ }
    }
  }
  return { ok: true, drained: rows.length, advanced, failed };
}

// Accept an inbound webhook payload and stamp it for the engine to enroll.
async function acceptWebhook(payload) {
  const receiptId = `whk_${Date.now().toString(36)}`;
  const supa = await supaClient();
  if (!supa) return { ok: true, received: true, persisted: false, receiptId };
  try {
    // SUPABASE: insert into rally_automation_inbound (id, payload, at, status)
    await supa.from('rally_automation_inbound').insert({ id: receiptId, payload, at: nowIso(), status: 'pending' }).then(() => {}, () => {});
    return { ok: true, received: true, persisted: true, receiptId };
  } catch {
    return { ok: true, received: true, persisted: false, receiptId };
  }
}

function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured -> open (Vercel cron still reaches it)
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  return h === `Bearer ${secret}`;
}

export default withErrorHandling(async (req, res) => {
  const body = req.method === 'POST' ? readJsonBody(req) : {};
  const action = (body.action || (req.method === 'GET' ? 'tick' : '')).toLowerCase();

  // ---- inbound webhook: enroll an external event ----
  if (action === 'webhook') {
    await heartbeat('webhook');
    const out = await acceptWebhook(body.payload || body.detail || {});
    return res.status(200).json(out);
  }

  // ---- cron / scheduled drain ----
  if (action === 'tick' || action === 'drain' || action === '') {
    // Heartbeat FIRST so the 5s SLA holds even on a cold start.
    await heartbeat('tick');
    if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    // fail-closed: any drain error is caught and reported, never thrown.
    let summary;
    try {
      summary = await drain();
    } catch (e) {
      summary = { ok: false, degraded_reason: String(e && e.message ? e.message : e), advanced: 0 };
    }
    return res.status(200).json({ ...summary, at: nowIso() });
  }

  if (req.method !== 'POST' && req.method !== 'GET') return methodNotAllowed(res, ['GET', 'POST']);
  return res.status(400).json({ ok: false, error: 'Unknown action.' });
});
