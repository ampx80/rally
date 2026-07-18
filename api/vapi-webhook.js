// POST /api/vapi-webhook
//
// Vapi posts a server message after each call. On the end-of-call-report we
// pull the transcript, summary, any structured data the assistant captured,
// the recording, and the outcome, then (1) persist it onto the lead in
// Supabase and (2) email the team the call result. Everything is env-gated and
// always returns 200 on a valid message so Vapi does not retry-storm.
//
// Point your Vapi Server URL at this endpoint and keep the
// "end-of-call-report" server message enabled (it already is).
//
// Env:
//   VAPI_SERVER_SECRET  - optional; if set, the X-Vapi-Secret header must match
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - persist onto the lead
//   RESEND_API_KEY / NOTIFY_EMAIL / NOTIFY_FROM - email the team
// NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const clean = (s, max = 6000) => String(s == null ? '' : (typeof s === 'object' ? JSON.stringify(s) : s)).trim().slice(0, max);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function persist(row) {
  if (!row.email || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, skipped: 'no-db-or-email' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supa.from('rally_prequal')
      .update({ call_id: row.callId, call_transcript: row.transcript, call_summary: row.summary, call_analysis: row.structured, call_recording: row.recording, call_ended_reason: row.endedReason, status: 'called' })
      .eq('email', row.email);
    if (error) { console.warn('[vapi] db update skipped:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

async function notify(row) {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };
  const to = (process.env.NOTIFY_EMAIL || 'nate@amptekgrowth.com').trim();
  const from = process.env.NOTIFY_FROM || 'Rally Sales <onboarding@resend.dev>';
  const rows = [
    ['Lead', row.email || row.phone], ['Outcome', row.endedReason], ['Recording', row.recording],
  ].filter(([, v]) => v);
  const html = `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:600px;margin:36px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0e9f8f;margin-bottom:14px;font-weight:700;">Rally pre-qual call</div>
    <h1 style="font-size:22px;margin:0 0 6px;color:#fff;">AI qualification call complete</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:10px 0 18px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#8a8fa3;width:110px;vertical-align:top;">${esc(k)}</td><td style="padding:7px 0;color:#fff;font-weight:600;word-break:break-all;">${esc(v)}</td></tr>`).join('')}
    </table>
    ${row.summary ? `<div style="font-size:13px;color:#c7cbdb;line-height:1.5;background:#0e1019;border:1px solid #262a3d;border-radius:10px;padding:14px;margin-bottom:14px;"><b style="color:#8b8ff5;">Summary</b><br/>${esc(row.summary)}</div>` : ''}
    <div style="font-size:12.5px;color:#aeb2c4;white-space:pre-wrap;line-height:1.5;background:#0e1019;border:1px solid #262a3d;border-radius:10px;padding:14px;max-height:420px;overflow:auto;"><b style="color:#8b8ff5;">Transcript</b><br/>${esc(clean(row.transcript, 4000)) || 'No transcript.'}</div>
  </div>
</body></html>`.trim();
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Rally call complete: ${row.email || row.phone || 'lead'}`, html }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e?.message }; }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  // Optional shared-secret check (Vapi sends the configured secret header).
  const secret = process.env.VAPI_SERVER_SECRET;
  if (secret) {
    const got = req.headers?.['x-vapi-secret'] || req.headers?.['x-vapi-signature'];
    if (got !== secret) return res.status(401).json({ ok: false, error: 'bad secret' });
  }

  const body = readJsonBody(req);
  const msg = body?.message || body || {};
  const type = msg.type || '';
  if (type !== 'end-of-call-report') return res.status(200).json({ ok: true, ignored: type || 'no-type' });

  const call = msg.call || {};
  const vars = call.assistantOverrides?.variableValues || msg.assistantOverrides?.variableValues || {};
  const analysis = msg.analysis || {};
  const artifact = msg.artifact || {};
  const row = {
    callId: clean(call.id || msg.callId, 120),
    email: clean(vars.email, 160).toLowerCase(),
    phone: clean(call.customer?.number || vars.phone, 40),
    transcript: clean(artifact.transcript || msg.transcript, 6000),
    summary: clean(analysis.summary || msg.summary, 3000),
    structured: analysis.structuredData || null,
    recording: clean(artifact.recordingUrl || msg.recordingUrl || msg.stereoRecordingUrl, 400),
    endedReason: clean(msg.endedReason, 80),
  };

  await Promise.allSettled([persist(row), notify(row)]);
  console.log('[vapi] processed end-of-call-report'); // no PII
  return res.status(200).json({ ok: true });
});
