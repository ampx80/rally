// api/_lib-email.js
//
// Rally's hardened, never-throws email SEND PRIMITIVE. Ported from Class
// Reunly's lib/resend.js + lib/send.js and re-skinned for Rally's dark
// palette. Every Rally route that sends mail should go through sendEmail()
// so a momentary Resend rate limit (HTTP 429, default 2 req/s) or a brief
// 5xx/network blip self-heals via retry-with-backoff instead of silently
// dropping the email.
//
// Public surface:
//   sendEmail({ to, subject, html, text, idempotencyKey, category, ... })
//   resendSend(payload, opts)     - low-level retry/backoff POST to Resend
//   brandedShell({ subject, bodyHtml, ctaUrl, ctaLabel, preheader })
//   sleep(ms)
//
// Guarantees:
//   - NEVER throws. Returns { ok, id?, skipped?, error?, ... } on every path.
//   - Missing RESEND_API_KEY   -> { ok: false, skipped: 'no-api-key' }.
//   - Missing Supabase env     -> sends WITHOUT dedupe / suppression.
//   - Supabase present         -> idempotency (rally_email_log UNIQUE
//                                 idempotency_key) + suppression
//                                 (rally_email_unsubscribes / rally_email_excluded).
//     Any DB error fails OPEN (send anyway) so a transient blip never blocks mail.
//
// A full-document html (starts with <!doctype or <html) is sent verbatim, so
// callers that already build their own branded document keep exact behavior;
// a body-only html (or bodyHtml) is wrapped in the Rally dark shell.
//
// Env:
//   RESEND_API_KEY   - required to actually send (studio-wide key)
//   RALLY_FROM / NOTIFY_FROM / RESEND_FROM - default sender
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - optional durable dedupe + suppression
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.

import crypto from 'node:crypto';

const ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function backoffMs(attempt, explicitMs) {
  if (explicitMs != null) return Math.min(explicitMs, 10000);
  const base = Math.min(250 * 2 ** (attempt - 1), 4000); // 250, 500, 1000, 2000, 4000
  return base + Math.floor(Math.random() * 200);
}

// ── low-level Resend POST with retry/backoff. Never throws. ───────────────────
export async function resendSend(payload, opts = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 0, error: 'no_resend', attempts: 0 };
  const maxRetries = Number.isFinite(opts.retries) ? opts.retries : 4;
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  if (opts.idempotencyKey) headers['Idempotency-Key'] = String(opts.idempotencyKey);

  let attempt = 0;
  while (true) {
    attempt++;
    let r;
    try {
      r = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (e) {
      if (attempt <= maxRetries) { await sleep(backoffMs(attempt, null)); continue; }
      return { ok: false, status: 0, error: (e && e.message) || 'network', attempts: attempt };
    }
    if (r.ok) {
      const data = await r.json().catch(() => ({}));
      return { ok: true, id: (data && data.id) || null, data, status: r.status, attempts: attempt };
    }
    const retryable = r.status === 429 || (r.status >= 500 && r.status < 600);
    const text = await r.text().catch(() => '');
    let msg = text.slice(0, 200);
    try { msg = JSON.parse(text).message || msg; } catch { /* keep raw */ }
    if (retryable && attempt <= maxRetries) {
      const ra = Number(r.headers.get('retry-after'));
      await sleep(backoffMs(attempt, Number.isFinite(ra) && ra > 0 ? ra * 1000 : null));
      continue;
    }
    return { ok: false, status: r.status, error: msg, attempts: attempt };
  }
}

// ── idempotency key helper ────────────────────────────────────────────────────
export function idempotencyKey(parts) {
  const arr = Array.isArray(parts) ? parts : [parts];
  return crypto.createHash('sha1').update(arr.map((p) => String(p == null ? '' : p)).join('|')).digest('hex');
}

// ── branded shell (Rally dark) ────────────────────────────────────────────────
// #0b0d14 page, #12141f card, #262a3d hairline, #5b4bf5 accent. Mirrors the
// inline styles already used by waitlist.js / report-deliver.js so previews and
// live mail read as one system. ASCII only.
export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function brandedShell({ subject, bodyHtml, ctaUrl, ctaLabel, preheader, eyebrow } = {}) {
  const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const bg = '#0b0d14';
  const card = '#12141f';
  const line = '#262a3d';
  const accent = '#5b4bf5';
  const accentSoft = '#8b8ff5';
  const ink = '#e7e9f0';
  const muted = '#a3a7ba';
  const dim = '#6b7085';
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${bg};font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>`
    : '';
  const cta = ctaUrl
    ? `<tr><td style="padding:6px 0 4px;">
         <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;font-family:${sans};">
           ${escapeHtml(ctaLabel || 'Open Rally')}
         </a>
       </td></tr>`
    : '';
  const eb = eyebrow
    ? `<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${accentSoft};margin-bottom:12px;font-weight:700;font-family:${sans};">${escapeHtml(eyebrow)}</div>`
    : '';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:${sans};color:${ink};line-height:1.6;">
${pre}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
      <tr><td style="padding:4px 4px 20px;">
        <span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6d5cf7,#4a3ce0);vertical-align:middle;"></span>
        <span style="font-size:19px;font-weight:800;letter-spacing:-.02em;color:#ffffff;vertical-align:middle;padding-left:9px;">Rally</span>
      </td></tr>
      <tr><td style="background:${card};border:1px solid ${line};border-radius:16px;padding:32px;">
        ${eb}
        <div style="font-size:15px;line-height:1.62;color:${ink};">
          ${bodyHtml || ''}
        </div>
        ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">${cta}</table>` : ''}
        <hr style="border:none;border-top:1px solid ${line};margin:24px 0 0;"/>
        <p style="font-size:12px;color:${dim};margin:16px 0 0;font-family:${sans};">Sent by Rally.</p>
      </td></tr>
      <tr><td align="center" style="padding:16px 8px 0;font-size:12px;color:${dim};font-family:${sans};">
        Rally &middot; the AI-native revenue platform
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Supabase helpers (service-role, via @supabase/supabase-js). Fail-open. ────
let _supa = null;
let _supaResolved = false;
async function getSupa() {
  if (_supaResolved) return _supa;
  _supaResolved = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { _supa = null; return null; }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _supa = createClient(url, key, { auth: { persistSession: false } });
  } catch {
    _supa = null;
  }
  return _supa;
}

// Return the subset of `recipients` that are on a suppression list (unsub or
// admin-excluded), lowercased. Fail-open: any error returns an empty set so a
// transient DB blip never blocks legitimate mail.
async function suppressedSet(supa, recipients) {
  const out = new Set();
  const lowered = recipients.map((e) => e.toLowerCase());
  if (!lowered.length) return out;
  for (const table of ['rally_email_unsubscribes', 'rally_email_excluded']) {
    try {
      const { data, error } = await supa.from(table).select('email').in('email', lowered);
      if (error || !Array.isArray(data)) continue;
      for (const row of data) if (row && row.email) out.add(String(row.email).toLowerCase());
    } catch { /* fail-open */ }
  }
  return out;
}

// INSERT a queued log row keyed by idempotency_key. Returns:
//   { row }           - inserted, proceed to send
//   { skip: true }    - a prior row is 'sent' or in-flight 'queued', do not resend
//   { row, retry }    - a prior row 'failed', reuse it and retry
//   null              - DB unavailable / error, fail-open (send without dedupe)
async function claimLog(supa, { idempotency_key, recipient, subject, category }) {
  try {
    const { data, error } = await supa
      .from('rally_email_log')
      .insert({ idempotency_key, recipient, subject: subject || null, category: category || null, status: 'queued' })
      .select('id')
      .single();
    if (!error && data) return { row: data };
    // Unique-constraint conflict on idempotency_key -> already claimed.
    if (error && (error.code === '23505' || /duplicate key|unique/i.test(error.message || ''))) {
      const { data: existing } = await supa
        .from('rally_email_log')
        .select('id,status')
        .eq('idempotency_key', idempotency_key)
        .limit(1)
        .maybeSingle();
      if (existing && existing.status === 'failed') {
        await supa.from('rally_email_log').update({ status: 'queued', error_message: null }).eq('id', existing.id);
        return { row: { id: existing.id }, retry: true };
      }
      return { skip: true };
    }
    // Any other DB error: fail-open, send without dedupe.
    return null;
  } catch {
    return null;
  }
}

async function patchLog(supa, id, patch) {
  if (!supa || !id) return;
  try { await supa.from('rally_email_log').update(patch).eq('id', id); } catch { /* best-effort */ }
}

function isFullDocument(html) {
  const s = String(html || '').trimStart().toLowerCase();
  return s.startsWith('<!doctype') || s.startsWith('<html');
}

// ── main: sendEmail ───────────────────────────────────────────────────────────
//
// sendEmail({
//   to,                       string | string[]  (required)
//   subject,                  string             (required)
//   html,                     full-doc -> sent verbatim; body-only -> wrapped
//   bodyHtml,                 body-only html, always wrapped in the Rally shell
//   text,                     plain-text alternative
//   idempotencyKey,           string  (when Supabase present -> dedupe)
//   category,                 string  (logged; e.g. 'waitlist', 'report')
//   from, replyTo, attachments, tags, headers,  passthrough to Resend
//   ctaUrl, ctaLabel, preheader, eyebrow,        used only when wrapping
// })
//
// Returns { ok, id?, status?, attempts?, skipped?, suppressed?, idempotent_skip?,
//           recipients?, error? }. Never throws.
export async function sendEmail(opts = {}) {
  try {
    const {
      to, subject, html, bodyHtml, text,
      idempotencyKey: idemKey = null, category = null,
      from, replyTo, attachments, tags, headers,
      ctaUrl, ctaLabel, preheader, eyebrow,
    } = opts;

    if (!process.env.RESEND_API_KEY) return { ok: false, skipped: 'no-api-key' };

    const list = Array.isArray(to) ? to : [to];
    let recipients = list.map((e) => String(e == null ? '' : e).trim()).filter(Boolean);
    if (!recipients.length) return { ok: false, skipped: 'no-recipients' };

    // Compose final html.
    //   wrap === false -> send html / bodyHtml verbatim (no shell). Use this to
    //                     preserve the EXACT output of a caller that already
    //                     builds its own markup.
    //   wrap === true  -> always apply the Rally shell.
    //   wrap undefined -> auto: a full document (starts with <!doctype/<html)
    //                     is sent verbatim; a body-only fragment is wrapped.
    const forceWrap = opts.wrap === true;
    const noWrap = opts.wrap === false;
    const rawHtml = html != null && String(html).trim() ? String(html) : '';
    const rawBody = bodyHtml != null && String(bodyHtml).trim() ? String(bodyHtml) : '';
    const rawText = text != null && String(text).trim() ? String(text) : '';
    const textAsHtml = () => `<p style="margin:0;">${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;

    let finalHtml = '';
    if (noWrap) {
      finalHtml = rawHtml || rawBody || (rawText ? textAsHtml() : '');
    } else if (rawBody) {
      finalHtml = brandedShell({ subject, bodyHtml: rawBody, ctaUrl, ctaLabel, preheader, eyebrow });
    } else if (rawHtml) {
      finalHtml = (!forceWrap && isFullDocument(rawHtml))
        ? rawHtml
        : brandedShell({ subject, bodyHtml: rawHtml, ctaUrl, ctaLabel, preheader, eyebrow });
    } else if (rawText) {
      finalHtml = brandedShell({ subject, bodyHtml: textAsHtml(), ctaUrl, ctaLabel, preheader, eyebrow });
    }
    if (!finalHtml) return { ok: false, skipped: 'no-content' };

    const supa = await getSupa();

    // Suppression (only with Supabase). Drop unsub / admin-excluded recipients.
    if (supa) {
      const supp = await suppressedSet(supa, recipients);
      if (supp.size) {
        recipients = recipients.filter((e) => !supp.has(e.toLowerCase()));
        if (!recipients.length) return { ok: true, suppressed: true, recipients: 0 };
      }
    }

    // Idempotency (only with Supabase AND a caller-supplied key). Without a key
    // there is no dedupe (behavior identical to a raw send).
    let logId = null;
    if (supa && idemKey) {
      const claim = await claimLog(supa, {
        idempotency_key: String(idemKey),
        recipient: recipients.join(','),
        subject, category,
      });
      if (claim && claim.skip) return { ok: true, idempotent_skip: true };
      if (claim && claim.row) logId = claim.row.id;
    }

    const fromAddr = from
      || process.env.RALLY_FROM || process.env.NOTIFY_FROM || process.env.RESEND_FROM
      || 'Rally <onboarding@resend.dev>';

    const payload = { from: fromAddr, to: recipients, subject: String(subject || ''), html: finalHtml };
    if (text != null && String(text).trim()) payload.text = String(text);
    const rt = replyTo || opts.reply_to;
    if (rt) payload.reply_to = rt;
    if (attachments) payload.attachments = attachments;
    if (tags) payload.tags = tags;
    if (headers) payload.headers = headers;

    const out = await resendSend(payload, idemKey ? { idempotencyKey: String(idemKey) } : {});

    if (!out.ok) {
      await patchLog(supa, logId, { status: 'failed', error_message: out.error || `HTTP ${out.status}`, sent_at: new Date().toISOString() });
      return { ok: false, status: out.status, error: out.error || `HTTP ${out.status}`, attempts: out.attempts };
    }

    await patchLog(supa, logId, { status: 'sent', resend_id: out.id || null, sent_at: new Date().toISOString() });
    return { ok: true, id: out.id || null, status: out.status, attempts: out.attempts, recipients: recipients.length };
  } catch (e) {
    // Absolute backstop: this primitive must never throw into a caller.
    return { ok: false, error: (e && e.message) || 'send_failed' };
  }
}

export { isFullDocument, EMAIL_RE };
