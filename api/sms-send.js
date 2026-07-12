// api/sms-send.js
//
// Rally's hardened, never-throws SMS SEND PRIMITIVE. Twilio-backed, env-gated.
// Adapted from Class Reunly's api/sms-triggers.js Twilio call and generalized
// into a standalone send endpoint that powers Rally alerts + automation SMS
// steps. The email sibling is api/_lib-email.js; this mirrors its guarantees
// for the SMS channel.
//
// POST body:
//   { to, body, from?, idempotencyKey?, category? }         (single)
//   { to: ['+1555...','+1444...'], body, ... }               (fan-out)
//
// Guarantees:
//   - NEVER throws into the caller. Always returns JSON, HTTP 200 on the send
//     path (withErrorHandling is a backstop for anything unforeseen).
//   - Twilio env missing -> { ok:false, configured:false, skipped:'no-twilio' }.
//     The LIVE APP HAS NO BEHAVIOR CHANGE until TWILIO_* are set.
//   - Retry/backoff on HTTP 429 + 5xx (same policy as _lib-email.js).
//   - Optional durable idempotency + logging via Supabase, FAIL-OPEN: if a
//     rally_sms_log row already exists for the idempotency key the message is
//     not resent; any DB error just sends without dedupe. No table required.
//
// Env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (or TWILIO_FROM_NUMBER)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   (optional dedupe + log)
//
// ASCII only. No em-dash / en-dash. ASCII hyphen only.

import crypto from 'node:crypto';
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const twilioUrl = (sid) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

function twilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM || process.env.TWILIO_FROM_NUMBER;
  return { sid, token, from, ok: Boolean(sid && token && from) };
}

// Light E.164-ish normalization. Never throws, never blocks - Twilio does the
// authoritative validation. Strips spaces/dashes/parens; keeps a leading +.
export function normalizePhone(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  const plus = s.startsWith('+');
  const digits = s.replace(/\D+/g, '');
  if (!digits) return '';
  if (plus) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;            // bare US 10-digit
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function backoffMs(attempt) { return Math.min(250 * 2 ** (attempt - 1), 4000) + Math.floor(Math.random() * 200); }

// Low-level Twilio POST with retry/backoff. Never throws.
async function twilioSend({ sid, token, from }, { to, body }, retries = 3) {
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  let attempt = 0;
  while (true) {
    attempt++;
    let r;
    try {
      r = await fetch(twilioUrl(sid), {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
    } catch (e) {
      if (attempt <= retries) { await sleep(backoffMs(attempt)); continue; }
      return { ok: false, error: (e && e.message) || 'network', attempts: attempt };
    }
    const json = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, sid: (json && json.sid) || null, status: r.status, attempts: attempt };
    const retryable = r.status === 429 || (r.status >= 500 && r.status < 600);
    if (retryable && attempt <= retries) {
      const ra = Number(r.headers.get('retry-after'));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 10000) : backoffMs(attempt));
      continue;
    }
    return { ok: false, error: (json && json.message) || `HTTP ${r.status}`, status: r.status, attempts: attempt };
  }
}

// ── optional Supabase dedupe + log (service-role, fail-open) ──────────────────
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

// Returns { id } (proceed), { skip:true } (already sent), or null (fail-open).
async function claimLog(supa, { idempotency_key, recipient, category }) {
  try {
    const { data, error } = await supa
      .from('rally_sms_log')
      .insert({ idempotency_key, recipient, category: category || null, status: 'queued' })
      .select('id')
      .single();
    if (!error && data) return { id: data.id };
    if (error && (error.code === '23505' || /duplicate key|unique/i.test(error.message || ''))) return { skip: true };
    return null; // any other DB error -> fail-open, send without dedupe
  } catch {
    return null;
  }
}
async function patchLog(supa, id, patch) {
  if (!supa || !id) return;
  try { await supa.from('rally_sms_log').update(patch).eq('id', id); } catch { /* best-effort */ }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const cfg = twilioConfig();
  const b = readJsonBody(req);

  const list = Array.isArray(b.to) ? b.to : [b.to];
  const recipients = [...new Set(list.map(normalizePhone).filter(Boolean))];
  const body = String(b.body == null ? '' : b.body).trim();

  // A no-recipient probe is a cheap way for the client to read config state.
  if (!recipients.length) return res.status(200).json({ ok: false, configured: cfg.ok, error: 'no-recipients' });
  if (!body) return res.status(200).json({ ok: false, configured: cfg.ok, error: 'no-body' });

  // Env-gated: without Twilio env the endpoint is a safe no-op. Nothing about
  // the live app changes until TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM are present.
  if (!cfg.ok) {
    return res.status(200).json({ ok: false, configured: false, skipped: 'no-twilio', recipients: recipients.length });
  }
  const activeCfg = b.from ? { ...cfg, from: b.from } : cfg;

  const supa = b.idempotencyKey ? await getSupa() : null;
  const results = [];
  for (const to of recipients) {
    const idem = b.idempotencyKey
      ? crypto.createHash('sha1').update(`${b.idempotencyKey}|${to}`).digest('hex')
      : null;
    let logId = null;
    if (supa && idem) {
      const claim = await claimLog(supa, { idempotency_key: idem, recipient: to, category: b.category });
      if (claim && claim.skip) { results.push({ to, ok: true, idempotent_skip: true }); continue; }
      if (claim && claim.id) logId = claim.id;
    }
    const r = await twilioSend(activeCfg, { to, body });
    await patchLog(supa, logId, {
      status: r.ok ? 'sent' : 'failed',
      provider_sid: r.sid || null,
      error_message: r.ok ? null : r.error,
      sent_at: r.ok ? new Date().toISOString() : null,
    });
    results.push(r.ok ? { to, ok: true, sid: r.sid || null } : { to, ok: false, error: r.error });
  }

  const sent = results.filter((r) => r.ok).length;
  return res.status(200).json({ ok: sent > 0, configured: true, sent, total: results.length, results });
});
