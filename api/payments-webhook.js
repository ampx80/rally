// /api/payments-webhook
//
// CUSTOMER PAYMENTS webhook (separate from api/billing-webhook, which handles
// Ardovo's OWN SaaS subscription). Receives Stripe events for money that
// Ardovo's customers collect from THEIR clients.
//
// POST: Stripe delivers events here. We verify the signature against
//   STRIPE_WEBHOOK_SECRET using node:crypto (the standard t=...,v1=... scheme,
//   no stripe npm SDK), and on:
//     checkout.session.completed  - a link/invoice checkout finished
//     invoice.paid                - a Stripe invoice was paid
//     invoice.payment_failed      - a recurring charge failed (dunning signal)
//   we record the outcome to a DURABLE LOG (rally_payment_events) so the money
//   state survives even though the browser store is client-only. The server
//   CANNOT touch the client store, so the client reconciles on load by reading
//   this log (GET below) and/or the Checkout return params. See
//   src/lib/payments-data.js reconcilePayment().
//
// GET (?since=ISO&limit=N): returns recent durable payment events so a client
//   can reconcile against server truth. { ok, configured, events }.
//
// Fire-and-forget contract: the durable write happens FIRST inside the try,
// before any other work, so an event is logged within the 5s SLA. On any crash
// we still answer Stripe with a 2xx (so it stops retrying a bug forever) and we
// log the failure. Missing env NEVER crashes. NO em-dash / en-dash. ASCII only.
//
// Env:
//   STRIPE_WEBHOOK_SECRET                      - required to verify signatures
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   - optional durable persistence
import crypto from 'node:crypto';

// Stripe signature verification needs the RAW body, so turn off Vercel's parser.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Verify a Stripe-Signature header. Implements the documented scheme:
//   header = "t=<unix>,v1=<hex hmac>[,v1=<hex hmac>...]"
//   signed_payload = "<t>.<raw body>"
//   expected = HMAC-SHA256(signed_payload, secret)
// Constant-time compare against every v1 candidate; tolerance guards replay.
function verifySignature(rawBody, header, secret, toleranceSec = 300) {
  if (!header || !secret) return { ok: false, reason: 'missing' };
  const parts = String(header).split(',').map((p) => p.trim());
  let t = null;
  const v1 = [];
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k === 't') t = v;
    else if (k === 'v1') v1.push(v);
  }
  if (!t || !v1.length) return { ok: false, reason: 'malformed' };
  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'malformed' };
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec) return { ok: false, reason: 'timestamp' };

  const signedPayload = `${t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  for (const cand of v1) {
    const candBuf = Buffer.from(cand, 'utf8');
    if (candBuf.length === expectedBuf.length && crypto.timingSafeEqual(candBuf, expectedBuf)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: 'signature' };
}

// SUPABASE: from('rally_payment_events').insert(row). Durable log of customer
// payment outcomes. When Supabase is not configured we log a single audit line
// (no PII) so the outcome is still observable, and return skipped.
async function persistEvent(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('[payments-webhook] no db; payment event', { type: row.type, invoice_id: row.invoice_id || null, link_id: row.link_id || null, status: row.status });
    return { ok: false, skipped: 'no-db' };
  }
  try {
    const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rally_payment_events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify([row]),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.warn('[payments-webhook] persist skipped:', resp.status, text.slice(0, 200));
      return { ok: false, error: `status-${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[payments-webhook] persist failed:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

// SUPABASE: from('rally_payment_events').select().gt('received_at', since).
async function readEvents({ since, limit }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { configured: false, events: [] };
  try {
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'received_at.desc');
    params.set('limit', String(Math.max(1, Math.min(200, limit || 50))));
    if (since) params.set('received_at', `gt.${since}`);
    const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rally_payment_events?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return { configured: true, events: [], error: `status-${resp.status}` };
    const events = await resp.json().catch(() => []);
    return { configured: true, events: Array.isArray(events) ? events : [] };
  } catch (e) {
    return { configured: true, events: [], error: e && e.message };
  }
}

// Flatten a verified Stripe event object into our durable row.
function rowFromEvent(event) {
  const obj = (event && event.data && event.data.object) || {};
  const meta = obj.metadata || {};
  const type = event.type;
  let status = 'paid';
  if (type === 'invoice.payment_failed') status = 'failed';
  const amountRaw = obj.amount_total != null ? obj.amount_total
    : obj.amount_paid != null ? obj.amount_paid
    : obj.amount_due != null ? obj.amount_due
    : null;
  return {
    event_id: event.id || null,
    type,
    status,
    invoice_id: meta.invoice_id || null,
    invoice_number: meta.invoice_number || null,
    link_id: meta.link_id || null,
    slug: meta.slug || null,
    kind: meta.kind || null,
    amount: amountRaw != null ? Math.round(amountRaw) / 100 : null,
    currency: obj.currency || null,
    stripe_object: obj.object || null,
    session_id: obj.object === 'checkout.session' ? obj.id : null,
    received_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  // Deliberately not withErrorHandling: a webhook must answer with an explicit
  // status Stripe understands and never surface secrets.
  if (req.method === 'GET') {
    const since = req.query && req.query.since ? String(req.query.since) : null;
    const limit = req.query && req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const { configured, events, error } = await readEvents({ since, limit });
    return res.status(200).json({ ok: true, configured, events, error: error || null });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      // Unconfigured: 200 so Stripe does not hammer retries at a dev endpoint.
      return res.status(200).json({ ok: false, configured: false, reason: 'webhook-secret-missing' });
    }

    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    const check = verifySignature(raw, sig, secret);
    if (!check.ok) {
      console.warn('[payments-webhook] signature rejected:', check.reason);
      return res.status(400).json({ error: 'Invalid signature', reason: check.reason });
    }

    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const HANDLED = new Set(['checkout.session.completed', 'invoice.paid', 'invoice.payment_failed']);
    if (HANDLED.has(event.type)) {
      // Durable write FIRST so the outcome is logged well within the 5s SLA.
      await persistEvent(rowFromEvent(event));
    }
    // Acknowledge everything (handled or not) so Stripe stops retrying.
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('[payments-webhook] handler error', e && e.message);
    // 200 so Stripe does not retry a bug forever; the failure is logged.
    return res.status(200).json({ received: true, error: 'handled' });
  }
}
