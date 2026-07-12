// src/lib/sms.js
//
// Browser helper for Rally SMS. The browser cannot reach Twilio directly, so
// everything routes through the same-origin /api/sms-send endpoint (Twilio,
// env-gated). Mirrors the fire-and-forget shape used by the automation outbound
// helpers in automations.js. NEVER throws.
//
//   sendSms({ to, body, idempotencyKey?, category? })  -> Promise<result>
//   broadcastSms(list, body, opts?)                    -> Promise<result>
//   fireSms({ to, body, category? })                   -> void  (fire-and-forget)
//   smsStatus()                                        -> Promise<{ configured }>
//   smsSegments(body)                                  -> { chars, segments, ... }
//   normalizePhone(raw) / validPhone(raw)
//   getAlertPhone() / setAlertPhone(v)                 -> account alert number
//
// With no TWILIO_* env the endpoint answers { configured:false } and callers
// surface a calm "not connected yet" state - no error, no behavior change.
// ASCII only. No em-dash / en-dash.

const ALERT_LS = 'rally_sms_alert_to_v1';
const GSM_SINGLE = 160;
const GSM_MULTI = 153;   // concatenated GSM-7 segments carry a UDH header
const UNI_SINGLE = 70;
const UNI_MULTI = 67;    // concatenated UCS-2 segments carry a UDH header

// Rough GSM-7 detection: anything outside this range (emoji, CJK, smart quotes)
// forces UCS-2 (unicode), which roughly halves the per-segment budget. Source
// stays pure ASCII by using \u escapes for the printable Latin-1 + euro range.
const GSM7 = /^[\n\r\t\u0020-\u007E\u00A0-\u00FF\u20AC]*$/;

export function smsSegments(body = '') {
  const s = String(body || '');
  const unicode = !GSM7.test(s);
  const chars = [...s].length;
  const single = unicode ? UNI_SINGLE : GSM_SINGLE;
  const multi = unicode ? UNI_MULTI : GSM_MULTI;
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi);
  return { chars, segments, encoding: unicode ? 'unicode' : 'gsm', perSegment: segments <= 1 ? single : multi };
}

export function normalizePhone(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  const plus = s.startsWith('+');
  const digits = s.replace(/\D+/g, '');
  if (!digits) return '';
  if (plus) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

export function validPhone(raw) {
  return /^\+\d{8,15}$/.test(normalizePhone(raw));
}

function toRecipients(to) {
  return [...new Set((Array.isArray(to) ? to : [to]).map(normalizePhone).filter(Boolean))];
}

async function post(payload) {
  if (typeof fetch !== 'function') return { ok: false, error: 'no-fetch' };
  try {
    const r = await fetch('/api/sms-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    return json || { ok: false, error: 'bad-response' };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'network' };
  }
}

export async function sendSms({ to, body, idempotencyKey, category } = {}) {
  const recipients = toRecipients(to);
  if (!recipients.length) return { ok: false, error: 'no-recipients' };
  if (!String(body || '').trim()) return { ok: false, error: 'no-body' };
  return post({ to: recipients, body: String(body), idempotencyKey, category });
}

export function broadcastSms(list, body, opts = {}) {
  return sendSms({ to: list, body, ...opts });
}

// Probe config without sending: a no-recipient POST returns { configured }.
export async function smsStatus() {
  const res = await post({});
  return { configured: !!(res && res.configured) };
}

// Fire-and-forget for the automation runtime: returns immediately, never awaits,
// never throws. Mirrors fireOutbound() in automations.js.
export function fireSms({ to, body, category } = {}) {
  try {
    const recipients = toRecipients(to);
    if (!recipients.length || !String(body || '').trim()) return;
    if (typeof fetch !== 'function') return;
    fetch('/api/sms-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ to: recipients, body: String(body), category: category || 'automation' }),
    }).catch(() => {});
  } catch { /* fire-and-forget */ }
}

// The account-wide alert number that SMS automations fall back to when a rule
// has no explicit recipient. Persisted per browser; swap to a per-org column
// later. Never throws.
export function getAlertPhone() {
  try { return localStorage.getItem(ALERT_LS) || ''; } catch { return ''; }
}
export function setAlertPhone(v) {
  const p = normalizePhone(v);
  try { if (p) localStorage.setItem(ALERT_LS, p); else localStorage.removeItem(ALERT_LS); } catch { /* ignore */ }
  return p;
}
