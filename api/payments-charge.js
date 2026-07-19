// POST /api/payments-charge
//
// CUSTOMER PAYMENTS (the money Ardovo's customers collect from THEIR clients).
// This is deliberately SEPARATE from api/billing-* which bills Ardovo's own
// SaaS subscription. Do not confuse the two.
//
// Turns an invoice (or any set of line items) into a payable Stripe Checkout
// Session and returns the hosted URL. Ardovo never touches raw card data; the
// customer pays on Stripe's hosted page, and api/payments-webhook.js flips the
// invoice to paid in a durable log.
//
// Stripe is called over its REST API with fetch (no stripe npm SDK). Everything
// is lazy + guarded: if STRIPE_SECRET_KEY is missing we return
// { ok:false, configured:false } with a 200 so the browser can degrade to a
// clean "connect Stripe" state. Missing env NEVER crashes. NO em-dash. ASCII only.
//
// Body:
//   invoiceId       - optional; stamped into metadata so the webhook can reconcile
//   invoiceNumber   - optional human number (e.g. INV-1042) for the Stripe line
//   currency        - ISO code, default 'usd'
//   customerEmail   - optional prefill for the Checkout customer
//   lineItems[]     - [{ name, description?, amount, quantity?, recurring? }]
//                     amount is in MAJOR units (dollars). recurring is one of
//                     'monthly' | 'quarterly' | 'annual' to bill on a schedule.
//   connectedAccountId - optional Stripe Connect acct_... for agency workspaces
//   successUrl / cancelUrl - optional redirect overrides
//
// Env:
//   STRIPE_SECRET_KEY   - required to actually create a session
//   APP_URL             - optional canonical origin for redirects
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

// Map our interval vocabulary onto Stripe's recurring.interval enum.
const RECURRING = { monthly: 'month', quarterly: 'month', annual: 'year' };
const RECURRING_COUNT = { monthly: 1, quarterly: 3, annual: 1 };

// Recursively flatten a nested object into Stripe's bracket form-encoding, e.g.
// { line_items: [{ quantity: 1 }] } -> line_items[0][quantity]=1.
function stripeEncode(obj, prefix, out = []) {
  if (obj == null) return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => stripeEncode(v, prefix ? `${prefix}[${i}]` : String(i), out));
  } else if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      stripeEncode(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  }
  return out;
}

async function stripePost(path, payload, { key, account } = {}) {
  const headers = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (account) headers['Stripe-Account'] = account;
  const resp = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers,
    body: stripeEncode(payload).join('&'),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = (json && json.error && json.error.message) || `Stripe request failed (${resp.status})`;
    const err = new Error(msg);
    err.status = resp.status;
    err.stripe = json && json.error ? json.error : null;
    throw err;
  }
  return json;
}

function originOf(req) {
  const env = (process.env.APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : 'https://rally-psi-five.vercel.app';
}

const clean = (s, max = 240) => String(s == null ? '' : s).trim().slice(0, max);

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const rawLines = Array.isArray(b.lineItems) ? b.lineItems : [];
  const currency = clean(b.currency, 8).toLowerCase() || 'usd';

  // Normalize + validate line items up front so we fail closed on bad input
  // BEFORE we ever reach for Stripe.
  const lineItems = [];
  let recurringMode = null;
  for (const li of rawLines.slice(0, 40)) {
    const amount = Number(li && li.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const quantity = Math.max(1, Math.min(100000, parseInt(li && li.quantity, 10) || 1));
    const rec = li && li.recurring && RECURRING[li.recurring] ? li.recurring : null;
    if (rec) recurringMode = rec;
    lineItems.push({
      name: clean(li && li.name, 200) || 'Payment',
      description: clean(li && li.description, 400) || undefined,
      unit_amount: Math.round(amount * 100),
      quantity,
      recurring: rec,
    });
  }
  if (!lineItems.length) {
    return res.status(400).json({ ok: false, configured: null, error: 'At least one valid line item (name + positive amount) is required.' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Clean, honest unconfigured response. The UI shows a "connect Stripe"
    // state and keeps the invoice local instead of faking a success.
    return res.status(200).json({ ok: false, configured: false, reason: 'stripe-key-missing' });
  }

  const origin = originOf(req);
  const invoiceId = clean(b.invoiceId, 120);
  const invoiceNumber = clean(b.invoiceNumber, 60);
  const mode = recurringMode ? 'subscription' : 'payment';

  // A subscription checkout can only carry one recurring cadence, so all
  // recurring lines inherit the first one we saw.
  const stripeLines = lineItems.map((l) => {
    const price_data = {
      currency,
      product_data: { name: l.name, description: l.description },
      unit_amount: l.unit_amount,
    };
    if (mode === 'subscription') {
      const iv = l.recurring || recurringMode;
      price_data.recurring = { interval: RECURRING[iv], interval_count: RECURRING_COUNT[iv] };
    }
    return { price_data, quantity: l.quantity };
  });

  const successUrl = clean(b.successUrl, 500) ||
    `${origin}/invoices?paid=${encodeURIComponent(invoiceId || 'session')}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = clean(b.cancelUrl, 500) || `${origin}/invoices?checkout=cancel`;

  const payload = {
    mode,
    line_items: stripeLines,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: b.customerEmail ? clean(b.customerEmail, 200) : undefined,
    allow_promotion_codes: true,
    metadata: {
      app: 'rally-payments',
      kind: 'invoice',
      invoice_id: invoiceId || '',
      invoice_number: invoiceNumber || '',
    },
  };
  if (mode === 'payment') {
    payload.payment_intent_data = { metadata: { app: 'rally-payments', invoice_id: invoiceId || '' } };
  } else {
    payload.subscription_data = { metadata: { app: 'rally-payments', invoice_id: invoiceId || '' } };
  }

  const account = clean(b.connectedAccountId, 80) || undefined;
  const session = await stripePost('/checkout/sessions', payload, { key, account });

  return res.status(200).json({ ok: true, configured: true, url: session.url, id: session.id, mode });
});
