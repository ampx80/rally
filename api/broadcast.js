// api/broadcast.js
//
// POST /api/broadcast
//
// Sends a Marketing-hub campaign (a broadcast email) to a resolved audience
// list. Adapted from Class Reunly's api/workspace-blast.js but re-skinned for
// Rally: it routes EVERY message through Rally's hardened send primitive
// (api/_lib-email.js -> sendEmail) so Resend rate limits (429), transient
// 5xx/network blips, idempotency and suppression are all handled for free.
//
// Body:
//   campaign    { id?, name?, subject, body, type? }   (subject + body required)
//   recipients  [{ email, firstName?, company? }, ...]  (required, non-empty)
//   test        boolean   - when true, send ONE preview to `testEmail`
//   testEmail   string    - required when test is true
//   replyTo     string    - optional reply-to address
//
// Merge tokens {firstName} and {company} are interpolated per recipient in both
// the subject and the body. The body is authored as plain text; it is escaped
// and converted to HTML paragraphs, an unsubscribe footer is appended, then the
// whole thing is wrapped in Rally's dark branded shell by sendEmail.
//
// Not-configured-clean: with no RESEND_API_KEY the endpoint still returns 200
// with { ok: true, configured: false, sent: 0 } so the feature degrades
// cleanly in every environment (never blocks the UI, never throws).
//
// Env:
//   RESEND_API_KEY   - required for mail to actually send (studio-wide key)
//   RALLY_FROM / NOTIFY_FROM / RESEND_FROM - default sender (via _lib-email)
//   RALLY_UNSUBSCRIBE_EMAIL - List-Unsubscribe mailbox (optional)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional dedupe + suppression
//
// ASCII only. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { sendEmail, escapeHtml, sleep, idempotencyKey } from './_lib-email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 1000;         // hard ceiling per broadcast (function budget)
const PACE_MS = 90;                  // gap between sends; retry path covers bursts

// Paced sends over a large list can take a couple of minutes; give it room.
export const config = { maxDuration: 300 };

// Interpolate {firstName} / {company} (brace-wrapped, case-insensitive). Missing
// vars fall back to friendly defaults so no literal token ever ships. Mirrors
// applyTokens in src/lib/marketing-campaigns.js exactly.
function applyTokens(text, vars = {}) {
  if (text == null) return '';
  const first = (vars.firstName && String(vars.firstName).trim()) || 'there';
  const company = (vars.company && String(vars.company).trim()) || 'your team';
  return String(text)
    .replace(/\{\s*firstName\s*\}/gi, first)
    .replace(/\{\s*company\s*\}/gi, company);
}

// Plain-text body -> escaped HTML. Blank lines split paragraphs; single
// newlines become <br/>. Keeps the author's line breaks intact + safe.
function bodyToHtml(text) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map((b) => `<p style="margin:0 0 16px;">${escapeHtml(b).replace(/\n/g, '<br/>')}</p>`)
    .filter(Boolean)
    .join('');
}

function unsubscribeFooter(unsubUrl) {
  return `<div style="margin-top:24px;font-size:12px;color:#6b7085;line-height:1.5;">
    You are receiving this because you are a contact of ours.
    <a href="${escapeHtml(unsubUrl)}" style="color:#8b8ff5;text-decoration:underline;">Unsubscribe</a>.
  </div>`;
}

// Normalize + validate + dedupe the recipient list.
function cleanRecipients(list) {
  const seen = new Set();
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    const email = String(r?.email == null ? '' : r.email).trim();
    if (!EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      email,
      firstName: String(r?.firstName == null ? '' : r.firstName).slice(0, 120),
      company: String(r?.company == null ? '' : r.company).slice(0, 160),
    });
  }
  return out;
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const b = readJsonBody(req);
  const campaign = b.campaign || {};
  const subject = String(campaign.subject == null ? '' : campaign.subject).trim();
  const body = String(campaign.body == null ? '' : campaign.body);
  const isTest = b.test === true;
  const replyTo = b.replyTo && EMAIL_RE.test(String(b.replyTo).trim()) ? String(b.replyTo).trim() : undefined;

  if (!subject) return res.status(400).json({ ok: false, error: 'A subject is required.' });
  if (!body.trim()) return res.status(400).json({ ok: false, error: 'A message body is required.' });

  // Build the recipient list. A test send targets exactly one address with
  // sample-ish vars; a real send uses the supplied audience list.
  let recipients;
  if (isTest) {
    const testEmail = String(b.testEmail == null ? '' : b.testEmail).trim();
    if (!EMAIL_RE.test(testEmail)) return res.status(400).json({ ok: false, error: 'A valid test email is required.' });
    recipients = [{ email: testEmail, firstName: 'there', company: 'your team' }];
  } else {
    recipients = cleanRecipients(b.recipients);
    if (!recipients.length) return res.status(400).json({ ok: false, error: 'No valid recipients in this audience.' });
    if (recipients.length > MAX_RECIPIENTS) recipients = recipients.slice(0, MAX_RECIPIENTS);
  }

  const configured = !!process.env.RESEND_API_KEY;
  const base = (process.env.APP_BASE_URL || (req.headers?.host ? `https://${req.headers.host}` : 'https://rally.app')).replace(/\/+$/, '');
  const unsubMail = process.env.RALLY_UNSUBSCRIBE_EMAIL || process.env.NOTIFY_EMAIL || 'unsubscribe@rally.app';
  const campaignId = String(campaign.id || 'adhoc').slice(0, 64);

  // Not-configured-clean: report a clean no-op so the client can inform the
  // user and keep the campaign as a draft (never a false "sent").
  if (!configured) {
    console.log(`[broadcast] not configured (no RESEND_API_KEY); ${recipients.length} recipient(s) would send`); // no PII
    return res.status(200).json({
      ok: true, configured: false, total: recipients.length, sent: 0, failed: 0, skipped: recipients.length,
      message: 'Email sending is not configured. Set RESEND_API_KEY to send live.',
    });
  }

  let sent = 0, failed = 0, skipped = 0;
  const results = [];

  for (const r of recipients) {
    const vars = { firstName: r.firstName, company: r.company };
    const renderedSubject = applyTokens(subject, vars);
    const unsubUrl = `mailto:${unsubMail}?subject=${encodeURIComponent(`Unsubscribe ${r.email}`)}`;
    const bodyHtml = bodyToHtml(applyTokens(body, vars)) + unsubscribeFooter(unsubUrl);
    const text = `${applyTokens(body, vars)}\n\nUnsubscribe: ${unsubUrl}`;

    // idempotencyKey scoped to (campaign, recipient, subject) so a retry or a
    // double-click never double-sends the same broadcast to the same person.
    const idem = isTest ? undefined : idempotencyKey([campaignId, r.email.toLowerCase(), renderedSubject]);

    const out = await sendEmail({
      to: r.email,
      subject: renderedSubject,
      bodyHtml,
      text,
      replyTo,
      idempotencyKey: idem,
      category: 'marketing-broadcast',
      preheader: renderedSubject,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
      tags: [
        { name: 'kind', value: 'rally-broadcast' },
        { name: 'campaign', value: campaignId },
      ],
    });

    if (out.ok && (out.suppressed || out.idempotent_skip)) {
      skipped++;
      results.push({ email: r.email, status: 'skipped' });
    } else if (out.ok) {
      sent++;
      results.push({ email: r.email, status: 'sent', id: out.id || null });
    } else {
      failed++;
      results.push({ email: r.email, status: 'failed', error: out.error || out.skipped || 'send failed' });
    }

    if (!isTest && recipients.length > 1) await sleep(PACE_MS);
  }

  console.log(`[broadcast] campaign ${campaignId}: sent ${sent}, failed ${failed}, skipped ${skipped} of ${recipients.length}`); // no PII

  // Every recipient failed on a real (non-test) send -> surface the first error
  // so the UI can show the actual provider rejection (e.g. domain not verified).
  if (!isTest && sent === 0 && failed > 0) {
    const firstErr = results.find(r => r.status === 'failed')?.error || 'unknown';
    return res.status(422).json({ ok: false, configured: true, total: recipients.length, sent: 0, failed, skipped, error: `Send failed. ${firstErr}` });
  }

  return res.status(200).json({
    ok: true, configured: true, test: isTest,
    total: recipients.length, sent, failed, skipped,
    results: isTest ? results : undefined,
  });
});
