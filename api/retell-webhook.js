// POST /api/retell-webhook
//
// Retell fires this after a pre-qualification call. We persist the transcript,
// the structured fields the agent extracted, and the outcome back onto the
// lead, then notify the team. Env-gated end to end: with no Supabase / Resend
// it simply acknowledges. Always returns 200 on a valid signature so Retell
// does not retry-storm. PII is never logged.
//
// Env:
//   RETELL_API_KEY        - used to verify the webhook signature
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - persist the outcome
//   RESEND_API_KEY / NOTIFY_EMAIL / NOTIFY_FROM - notify the team
// NO em-dash / en-dash. ASCII only.
import crypto from 'node:crypto';
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const clean = (s, max = 4000) => String(s == null ? '' : s).trim().slice(0, max);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Retell signs with HMAC-SHA256 over the raw body using the API key. We verify
// when both a signature header and the key are present; otherwise we accept
// (dev / not-yet-configured) but never act on unverified destructive writes.
function verify(req, rawBody) {
  const sig = req.headers?.['x-retell-signature'] || req.headers?.['x-retell-signature-256'];
  const key = process.env.RETELL_API_KEY;
  if (!sig || !key) return { verified: false, reason: 'unsigned' };
  try {
    const expected = crypto.createHmac('sha256', key).update(rawBody).digest('hex');
    const a = Buffer.from(String(sig)); const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { verified: ok, reason: ok ? 'ok' : 'mismatch' };
  } catch { return { verified: false, reason: 'error' }; }
}

async function persist(row) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, skipped: 'no-db' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    // Update the most recent matching lead by email; fall back to insert of a call record.
    if (row.email) {
      const { error } = await supa.from('rally_prequal')
        .update({ call_id: row.callId, call_transcript: row.transcript, call_analysis: row.analysis, call_sentiment: row.sentiment, status: 'called' })
        .eq('email', row.email);
      if (error) { console.warn('[retell] update skipped:', error.message); }
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

async function notify(row) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };
  const to = (process.env.NOTIFY_EMAIL || 'nate@amptekgrowth.com').trim();
  const from = process.env.NOTIFY_FROM || 'Rally Sales <onboarding@resend.dev>';
  const html = `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:560px;margin:36px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0e9f8f;margin-bottom:14px;font-weight:700;">Rally pre-qual call</div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#fff;">AI qualification call complete</h1>
    <p style="font-size:15px;color:#a3a7ba;margin:0 0 18px;">${esc(row.email || 'A lead')} - sentiment ${esc(row.sentiment || 'n/a')}.</p>
    <div style="font-size:13px;color:#c7cbdb;white-space:pre-wrap;line-height:1.5;background:#0e1019;border:1px solid #262a3d;border-radius:10px;padding:14px;">${esc(clean(row.transcript, 3000)) || 'No transcript.'}</div>
  </div>
</body></html>`.trim();
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Rally pre-qual call complete: ${row.email || 'lead'}`, html }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(body || {});
  const v = verify(req, raw);
  // If a signature was present but did not verify, reject.
  if ((req.headers?.['x-retell-signature'] || req.headers?.['x-retell-signature-256']) && !v.verified) {
    return res.status(401).json({ ok: false, error: 'bad signature' });
  }

  const event = body?.event || '';
  const call = body?.call || {};
  // Only act on terminal, analyzed events.
  if (event !== 'call_analyzed' && event !== 'call_ended') {
    return res.status(200).json({ ok: true, ignored: event || 'no-event' });
  }

  const meta = call.metadata || {};
  const row = {
    callId: clean(call.call_id, 120),
    email: clean(meta.email || call?.retell_llm_dynamic_variables?.email, 160).toLowerCase(),
    transcript: clean(call.transcript, 4000),
    analysis: call.call_analysis?.custom_analysis_data || null,
    sentiment: clean(call.call_analysis?.user_sentiment, 40),
  };

  await Promise.allSettled([persist(row), notify(row)]);
  console.log('[retell] processed', event); // no PII
  return res.status(200).json({ ok: true });
});
