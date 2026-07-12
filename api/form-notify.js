// POST /api/form-notify
//
// Optional owner notification when a Rally hosted form (/f/:formId) is
// submitted. The form's owner enters a notify email in the builder; the
// public hosted page fires this endpoint after a successful submission.
//
// ADDITIVE + env-gated: without RESEND_API_KEY the shared send primitive
// (api/_lib-email.js sendEmail) returns { skipped: 'no-api-key' } and the
// route responds 200 { ok: true, emailed: false }. No behavior change to the
// live app until env is set. PII (the submitter's answers) is never logged.
//
// Env:
//   RESEND_API_KEY   - required for the email to actually send (studio-wide key)
//   RALLY_FROM / NOTIFY_FROM / RESEND_FROM - default sender
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, escapeHtml } from './_lib-email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max = 240) => String(s == null ? '' : s).trim().slice(0, max);

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const to = clean(b.to, 160).toLowerCase();
  if (!EMAIL_RE.test(to)) return res.status(400).json({ ok: false, error: 'A valid notify email is required.' });

  const formName = clean(b.formName, 120) || 'your form';
  const sourceUrl = clean(b.sourceUrl, 300);
  const fields = Array.isArray(b.fields) ? b.fields.slice(0, 60) : [];

  const rows = fields
    .map((f) => [clean(f && f.label, 120), clean(f && f.value, 2000)])
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:9px 14px 9px 0;color:#8a8fa3;width:160px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:9px 0;color:#fff;font-weight:600;">${escapeHtml(v)}</td></tr>`)
    .join('');

  const bodyHtml = `
    <h1 style="font-size:22px;line-height:1.25;margin:0 0 6px;color:#fff;">New submission on ${escapeHtml(formName)}</h1>
    <p style="font-size:15px;color:#a3a7ba;margin:0 0 20px;">A new lead just came through your Rally form. It has already been created as a contact in your pipeline.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows || '<tr><td style="color:#8a8fa3;">No fields captured.</td></tr>'}</table>`;

  const result = await sendEmail({
    to,
    subject: `New Rally form submission: ${formName}`,
    bodyHtml,
    eyebrow: 'Rally forms',
    category: 'form-notify',
    ctaUrl: sourceUrl || undefined,
    ctaLabel: sourceUrl ? 'View the form' : undefined,
  });

  console.log('[form-notify] submission notification processed'); // no PII
  return res.status(200).json({ ok: true, emailed: result.ok === true, skipped: result.skipped || null });
});
