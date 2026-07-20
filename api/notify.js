// POST /api/notify
//
// The transactional send endpoint for Ardovo's Email Center. The client renders
// an email from the catalog (src/lib/email-catalog.js) and posts the finished
// HTML here; this route just hands it to the hardened shared send primitive
// (api/_lib-email.js sendEmail) so every system email inherits idempotency,
// suppression, and the rally_email_log / open-click-reply tracking.
//
// ADDITIVE + env-gated: without RESEND_API_KEY, sendEmail returns
// { skipped: 'no-api-key' } and this responds 200 { ok: true, emailed: false }.
// The Email Center logs the email locally regardless, so the tool always works.
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail } from './_lib-email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max = 4000) => String(s == null ? '' : s).slice(0, max);

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const toList = (Array.isArray(b.to) ? b.to : [b.to])
    .map((x) => clean(x, 160).trim().toLowerCase())
    .filter((x) => EMAIL_RE.test(x));
  if (!toList.length) return res.status(400).json({ ok: false, error: 'At least one valid recipient is required.' });

  const subject = clean(b.subject, 200) || 'Ardovo notification';
  const html = clean(b.html, 200000);
  if (!html) return res.status(400).json({ ok: false, error: 'Pre-rendered html is required.' });

  const eventKey = clean(b.eventKey, 80) || 'system';
  const category = clean(b.category, 80) || `system-${eventKey.split('.')[0] || 'notify'}`;
  const idempotencyKey = clean(b.idempotencyKey, 120) || undefined;

  // html is already the full branded document from the catalog, so send it as-is.
  const result = await sendEmail({ to: toList, subject, html, category, idempotencyKey });

  console.log(`[notify] ${eventKey} processed for ${toList.length} recipient(s)`); // no PII beyond count
  return res.status(200).json({ ok: true, emailed: result.ok === true, skipped: result.skipped || null });
});
