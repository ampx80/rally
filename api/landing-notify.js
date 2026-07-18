// api/landing-notify.js
//
// POST /api/landing-notify
//
// Best-effort team notification when a visitor submits a hosted landing-page
// form (see src/marketing/HostedLanding.jsx). Routes through Ardovo's hardened
// send primitive (api/_lib-email.js -> sendEmail) so Resend rate limits,
// transient blips, idempotency and suppression are handled for free.
//
// ENV-GATED + NEVER BLOCKS: with no RESEND_API_KEY the endpoint returns 200
// with { ok: true, configured: false, emailed: false } - a clean no-op. The
// hosted form already captured the lead locally before it called this, so a
// missing key (or a total failure here) never costs a submission.
//
// Body:
//   page        { slug, title }         - which page converted
//   submission  { <field>: <value>, ... } - the raw form values
//
// Env:
//   RESEND_API_KEY  - required for mail to actually send (studio-wide key)
//   NOTIFY_EMAIL    - recipient (defaults to nate@amptekgrowth.com)
//   NOTIFY_FROM / ARDOVO_FROM / RESEND_FROM - default sender (via _lib-email)
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, escapeHtml, idempotencyKey } from './_lib-email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max = 300) => String(s == null ? '' : s).trim().slice(0, max);

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const b = readJsonBody(req);
  const page = b.page || {};
  const pageTitle = clean(page.title, 160) || 'Landing page';
  const pageSlug = clean(page.slug, 80);
  const sub = (b.submission && typeof b.submission === 'object') ? b.submission : {};

  // Flatten submission into safe label/value rows. Drop empties.
  const rows = Object.entries(sub)
    .map(([k, v]) => [clean(k, 60), clean(v, 400)])
    .filter(([, v]) => v);
  if (!rows.length) return res.status(400).json({ ok: false, error: 'Empty submission.' });

  const leadEmail = clean(sub.email, 160).toLowerCase();
  const replyTo = EMAIL_RE.test(leadEmail) ? leadEmail : undefined;

  // Not-configured-clean: report a no-op so the caller never treats this as
  // a failure (it is purely a notification; the lead is already captured).
  if (!process.env.RESEND_API_KEY) {
    console.log(`[landing-notify] not configured (no RESEND_API_KEY); page=${pageSlug || 'unknown'}`); // no PII
    return res.status(200).json({ ok: true, configured: false, emailed: false });
  }

  const to = (process.env.NOTIFY_EMAIL || process.env.NOTIFY_DEFAULT_TO || 'nate@amptekgrowth.com').trim();
  const who = clean(sub.firstName || sub.name || sub.email || 'A visitor', 120);

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;color:#a3a7ba;">${escapeHtml(who)} just submitted the form on <strong style="color:#fff;">${escapeHtml(pageTitle)}</strong>${pageSlug ? ` (/l/${escapeHtml(pageSlug)})` : ''}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:9px 0;color:#8a8fa3;width:140px;vertical-align:top;text-transform:capitalize;">${escapeHtml(k)}</td><td style="padding:9px 0;color:#fff;font-weight:600;">${escapeHtml(v)}</td></tr>`).join('')}
    </table>`.trim();

  // Idempotency scoped to (page, email, minute) so a double submit inside the
  // same minute does not double-notify.
  const idem = idempotencyKey(['landing-notify', pageSlug || 'page', leadEmail || who, String(Math.floor(Date.now() / 60000))]);

  const out = await sendEmail({
    to,
    subject: `New lead from ${pageTitle}`,
    bodyHtml,
    replyTo,
    idempotencyKey: idem,
    category: 'landing-lead-notify',
    eyebrow: 'Landing page lead',
    preheader: `${who} converted on ${pageTitle}`,
    tags: [{ name: 'kind', value: 'rally-landing-notify' }],
  });

  console.log(`[landing-notify] page=${pageSlug || 'unknown'} emailed=${!!out.ok}`); // no PII
  return res.status(200).json({ ok: true, configured: true, emailed: !!out.ok });
});
