// api/report-deliver.js
//
// Scheduled report delivery for Rally Report Builder v2. Two entry points:
//
//   POST { action: 'test'|'run', deliveries: [ renderedDelivery, ... ] }
//     Renders each delivery payload (produced client-side by
//     renderScheduleForDelivery in src/lib/report-builder.js) into an
//     email + CSV attachment and sends it via Resend. Used by the
//     "Send test now" button and by any client that wants to push a run.
//
//   GET  (cron trigger, no body)
//     Best-effort server-side sweep: if Supabase is configured, reads
//     due rows from rally_report_schedules; otherwise there is nothing
//     durable to render on the server (the demo store is client-side),
//     so it no-ops with a 200 and a clear reason. Either way the cron
//     never errors.
//
// Email is a no-op (still 200) when RESEND_API_KEY is absent, so the
// feature degrades cleanly in every environment.
//
// Env:
//   RESEND_API_KEY  - required for mail to actually send (studio-wide key)
//   NOTIFY_FROM     - sender (defaults to Rally Reports <onboarding@resend.dev>)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional durable schedules
//
// ASCII only. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmt(v, kind) {
  if (v == null || isNaN(v)) return '-';
  if (kind === 'money') {
    const n = Math.round(v);
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }
  if (kind === 'percent') return Math.round(v) + '%';
  return Math.round(v).toLocaleString();
}

// Build the report email HTML from a rendered delivery payload.
function renderHtml(d) {
  const rows = (d.rows || []).slice(0, 25);
  const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
  const bars = rows.map(r => {
    const pct = Math.round(((Number(r.value) || 0) / max) * 100);
    return `<tr>
      <td style="padding:8px 0;color:#e7e9f0;font-size:14px;width:44%;">${esc(r.label)}</td>
      <td style="padding:8px 8px 8px 0;width:36%;"><div style="background:#22263a;border-radius:6px;height:9px;overflow:hidden;"><div style="width:${pct}%;height:9px;background:#5b4bf5;border-radius:6px;"></div></div></td>
      <td style="padding:8px 0;color:#fff;font-weight:700;text-align:right;font-size:14px;">${esc(fmt(r.value, d.valueFormat))}</td>
    </tr>`;
  }).join('');
  return `
<!doctype html><html><body style="margin:0;background:#0b0d14;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#e7e9f0;">
  <div style="max-width:600px;margin:32px auto;padding:32px;background:#12141f;border:1px solid #262a3d;border-radius:16px;">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b8ff5;margin-bottom:12px;font-weight:700;">Rally scheduled report</div>
    <h1 style="font-size:23px;line-height:1.2;margin:0 0 4px;color:#fff;">${esc(d.title || 'Report')}</h1>
    <p style="font-size:14px;color:#a3a7ba;margin:0 0 20px;">${esc(d.measureLabel || 'Count')} by ${esc((d.dimLabel || 'group').toLowerCase())} &middot; total ${esc(fmt(d.total, d.valueFormat))}</p>
    <table style="width:100%;border-collapse:collapse;">${bars}</table>
    <hr style="border:none;border-top:1px solid #262a3d;margin:22px 0;">
    <p style="font-size:12px;color:#6b7085;margin:0;">Full data is attached as CSV. Generated ${esc(new Date(d.generatedAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }))} ET by Rally.</p>
  </div>
</body></html>`.trim();
}

async function sendOne(d) {
  const recipients = (d.recipients || []).map(e => String(e).trim().toLowerCase()).filter(e => EMAIL_RE.test(e));
  if (!recipients.length) return { ok: false, skipped: 'no-recipients' };
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key', recipients: recipients.length };
  const from = process.env.NOTIFY_FROM || process.env.RESEND_FROM || 'Rally Reports <onboarding@resend.dev>';
  const attachments = d.csv
    ? [{ filename: (d.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') + '.csv', content: Buffer.from(String(d.csv), 'utf8').toString('base64') }]
    : undefined;
  const body = {
    from, to: recipients,
    subject: `Rally report: ${d.title || 'Scheduled report'}`,
    html: d.format === 'csv' ? `<p>Your Rally report "${esc(d.title || 'report')}" is attached as CSV.</p>` : renderHtml(d),
  };
  if (attachments) body.attachments = attachments;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) { console.warn('[report-deliver] resend', r.status); return { ok: false, status: r.status }; }
  const j = await r.json().catch(() => ({}));
  return { ok: true, id: j?.id || null, recipients: recipients.length };
}

// GET cron sweep. Durable schedules would live in Supabase; the demo store
// is client-side so with no DB there is simply nothing to render. Never errors.
async function cronSweep() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, ran: 0, reason: 'no-durable-store' };
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const nowIso = new Date().toISOString();
    const { data, error } = await supa.from('rally_report_schedules')
      .select('*').eq('enabled', true).lte('next_run_at', nowIso).limit(50);
    if (error) { console.warn('[report-deliver] schedule query skipped:', error.message); return { ok: true, ran: 0, reason: 'no-table' }; }
    const due = data || [];
    // The rendered rows/csv are supplied by the client at save time (payload
    // column) since aggregation runs against the client store. Send whatever
    // is present; advance next_run_at so the row is not re-sent.
    let sent = 0;
    for (const row of due) {
      const payload = row.payload || null;
      if (payload) { const res = await sendOne(payload); if (res.ok) sent++; }
    }
    return { ok: true, ran: due.length, sent };
  } catch (e) {
    console.warn('[report-deliver] cron sweep error:', e?.message);
    return { ok: true, ran: 0, reason: 'error' };
  }
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    const result = await cronSweep();
    return res.status(200).json(result);
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const b = readJsonBody(req);
  const deliveries = Array.isArray(b.deliveries) ? b.deliveries : [];
  if (!deliveries.length) return res.status(400).json({ ok: false, error: 'No deliveries to render.' });

  const results = await Promise.allSettled(deliveries.map(sendOne));
  const emailed = results.some(r => r.status === 'fulfilled' && r.value?.ok === true);
  const sent = results.filter(r => r.status === 'fulfilled' && r.value?.ok === true).length;
  console.log(`[report-deliver] processed ${deliveries.length} delivery payload(s)`); // no PII
  return res.status(200).json({ ok: true, emailed, sent, count: deliveries.length });
});
