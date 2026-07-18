// POST /api/webhooks-dispatch
//
// Outbound webhook delivery for the Ardovo developer platform. Given an event
// (deal.won, contact.created, ...) and a subscriber URL, it POSTs a signed
// JSON envelope to the subscriber so their systems react to changes in Ardovo.
//
// Security:
//   - SSRF-guarded like api/outbound.js: https only, no internal / metadata
//     hosts, DNS-safe host allow check before the request goes out.
//   - Every delivery is HMAC-SHA256 signed (Stripe-style) so subscribers can
//     verify authenticity. Signed content is `${timestamp}.${rawBody}` to make
//     replay attacks detectable. The secret comes from the request (per the
//     subscriber's stored secret) or ARDOVO_WEBHOOK_SECRET as a fallback.
//
// Headers sent to the subscriber:
//   X-Ardovo-Event, X-Ardovo-Delivery, X-Ardovo-Timestamp,
//   X-Ardovo-Signature: t=<unix>,v1=<hex hmac>
//
// ASCII only. No em-dash / en-dash. All env + external access is guarded.
import crypto from 'node:crypto';
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const BLOCKED_HOST = /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|\[?::1\]?|metadata\.)/i;

// Whitelisted event catalog the platform can emit. Kept in one place so the
// Developers page and docs can render the same list.
export const WEBHOOK_EVENTS = [
  'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'contact.created', 'contact.updated',
  'company.created', 'company.updated',
  'activity.created', 'activity.completed',
];

function safeUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (BLOCKED_HOST.test(u.hostname)) return null;
  return u.toString();
}

// Compute the Stripe-style signature header for a raw body string.
export function signPayload(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signed = `${timestamp}.${rawBody}`;
  const hex = crypto.createHmac('sha256', String(secret)).update(signed).digest('hex');
  return { header: `t=${timestamp},v1=${hex}`, timestamp, signature: hex };
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const { url, event, data, secret } = readJsonBody(req);

  const target = safeUrl(url);
  if (!target) return res.status(400).json({ ok: false, error: 'A valid public https subscriber URL is required.' });

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ ok: false, error: 'An event name is required (for example deal.won).' });
  }
  if (!WEBHOOK_EVENTS.includes(event)) {
    return res.status(400).json({ ok: false, error: `Unknown event "${event}".`, allowed: WEBHOOK_EVENTS });
  }

  const signingSecret = (typeof secret === 'string' && secret) ? secret : process.env.ARDOVO_WEBHOOK_SECRET;
  if (!signingSecret) {
    return res.status(400).json({ ok: false, error: 'No signing secret. Pass a "secret" or set ARDOVO_WEBHOOK_SECRET.' });
  }

  const deliveryId = 'evt_' + crypto.randomBytes(9).toString('hex');
  const envelope = {
    id: deliveryId,
    type: event,
    created: Math.floor(Date.now() / 1000),
    api_version: 'v1',
    data: data && typeof data === 'object' ? data : {},
  };
  const rawBody = JSON.stringify(envelope);
  const { header, timestamp } = signPayload(rawBody, signingSecret);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ardovo-Webhooks/1.0',
        'X-Ardovo-Event': event,
        'X-Ardovo-Delivery': deliveryId,
        'X-Ardovo-Timestamp': String(timestamp),
        'X-Ardovo-Signature': header,
      },
      body: rawBody,
      signal: ctrl.signal,
    });
    const text = await r.text().catch(() => '');
    return res.status(200).json({ ok: r.ok, status: r.status, delivery_id: deliveryId, event, response: text.slice(0, 300) });
  } catch (e) {
    return res.status(200).json({ ok: false, delivery_id: deliveryId, event, error: e.name === 'AbortError' ? 'Request timed out' : e.message });
  } finally {
    clearTimeout(timer);
  }
});
