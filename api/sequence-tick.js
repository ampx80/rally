// api/sequence-tick.js
//
// Rally SEQUENCES runner - the real send surface behind the Sequences page.
// Two shapes, one route:
//
//   1) POST { action: 'send', to, subject, text, idempotencyKey, ... }
//      The browser-side cadence engine (src/lib/sequences-data.js) calls this
//      for every DUE email step. We compose the Rally dark shell and hand the
//      message to the hardened sendEmail() primitive (Resend + retry/backoff +
//      idempotency + suppression). A safe NO-OP without RESEND_API_KEY.
//
//   2) GET  (or POST { action: 'tick' })  - CRON-ABLE.
//      Durable safety-net drain: if Supabase is configured AND a
//      `rally_sequence_outbox` table exists, send any due, still-pending rows
//      and flip them to 'sent'. Idempotent (status flip + per-row idempotency
//      key). No-op when RESEND / Supabase / the table are absent, so the cron
//      is inert until someone opts in by provisioning the outbox. Never throws.
//
// vercel.json cron entry (report-only, apply during vercel.json assembly):
//   { "crons": [ { "path": "/api/sequence-tick", "schedule": "0 * * * *" } ] }
//
// Env:
//   RESEND_API_KEY   - required to actually deliver (studio-wide key)
//   RALLY_FROM / NOTIFY_FROM / RESEND_FROM - default sender (via sendEmail)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional outbox + dedupe
//   CRON_SECRET      - optional; when set, the tick/drain path requires
//                      `Authorization: Bearer <CRON_SECRET>` (Vercel cron sends
//                      it automatically). The 'send' path is never gated by it.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, escapeHtml, EMAIL_RE } from './_lib-email.js';

const clean = (s, max = 4000) => String(s == null ? '' : s).trim().slice(0, max);

// Plain sequence body -> a lightweight branded fragment. Blank lines become
// paragraph breaks, single newlines become <br/>. Wrapped in the Rally shell
// by sendEmail (via bodyHtml).
function textToBodyHtml(text) {
  const safe = escapeHtml(String(text || ''));
  const paras = safe.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br/>')).filter(Boolean);
  if (!paras.length) return '';
  return paras.map(p => `<p style="margin:0 0 14px;">${p}</p>`).join('');
}

// Send one composed step email through the hardened primitive.
async function sendStep(row) {
  const to = clean(row.to, 160).toLowerCase();
  if (!EMAIL_RE.test(to)) return { ok: false, skipped: 'no-email' };
  const subject = clean(row.subject, 300) || 'A quick note';
  const text = clean(row.text, 8000);
  return sendEmail({
    to,
    subject,
    bodyHtml: textToBodyHtml(text),
    text: text || undefined,
    category: 'sequence',
    eyebrow: clean(row.sequenceName, 80) || 'Rally sequence',
    idempotencyKey: row.idempotencyKey ? clean(row.idempotencyKey, 200) : undefined,
  });
}

// Cron drain of the optional durable outbox. Fail-open + idempotent. Returns a
// small summary; treats a missing table / missing env as a clean no-op.
async function drainOutbox() {
  if (!process.env.RESEND_API_KEY) return { ok: true, skipped: 'no-api-key', sent: 0 };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: true, skipped: 'no-db', sent: 0 };

  let supa;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supa = createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return { ok: true, skipped: 'no-db-client', sent: 0 };
  }

  let rows;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supa
      .from('rally_sequence_outbox')
      .select('id,to_email,subject,body_text,sequence_name,idempotency_key')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso)
      .limit(100);
    if (error) return { ok: true, skipped: 'no-outbox', sent: 0 };
    rows = Array.isArray(data) ? data : [];
  } catch {
    return { ok: true, skipped: 'no-outbox', sent: 0 };
  }

  let sent = 0, failed = 0, skipped = 0;
  for (const r of rows) {
    const out = await sendStep({
      to: r.to_email, subject: r.subject, text: r.body_text,
      sequenceName: r.sequence_name, idempotencyKey: r.idempotency_key,
    });
    const status = out.ok ? 'sent' : (out.skipped ? 'skipped' : 'failed');
    if (out.ok) sent++; else if (out.skipped) skipped++; else failed++;
    try {
      await supa.from('rally_sequence_outbox')
        .update({ status, sent_at: new Date().toISOString(), error_message: out.error || null })
        .eq('id', r.id);
    } catch { /* best-effort; idempotency key still guards a re-drain */ }
  }
  return { ok: true, drained: rows.length, sent, failed, skipped };
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

  // ---- browser cadence engine: send one due email step ----
  if (action === 'send') {
    const out = await sendStep(body);
    return res.status(200).json({
      ok: !!out.ok,
      id: out.id || null,
      skipped: out.skipped || null,
      idempotent_skip: out.idempotent_skip || false,
      error: out.ok ? null : (out.error || null),
    });
  }

  // ---- cron / durable drain ----
  if (action === 'tick' || action === 'drain' || action === '') {
    if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const summary = await drainOutbox();
    return res.status(200).json(summary);
  }

  if (req.method !== 'POST' && req.method !== 'GET') return methodNotAllowed(res, ['GET', 'POST']);
  return res.status(400).json({ ok: false, error: 'Unknown action.' });
});
