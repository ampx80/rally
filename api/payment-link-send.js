// POST /api/payment-link-send
//
// CUSTOMER PAYMENTS (separate from Ardovo's own SaaS billing in api/billing-*).
//
// Creates a shareable Stripe Checkout Session for a single product or amount
// and returns the hosted URL plus a copyable text-to-pay message. Dispatching
// the message over SMS is intentionally out of scope here (that is the job of
// api/sms-send.js); this endpoint's contract is: produce the payable link and
// a ready-to-send message string.
//
// Stripe is called over its REST API with fetch (no stripe npm SDK). Lazy +
// guarded: with no STRIPE_SECRET_KEY we return { ok:false, configured:false }
// with a 200 AND still return a copyable message that points at the local
// fallback link, so the UI degrades cleanly and never fakes a real charge.
// Missing env NEVER crashes. NO em-dash / en-dash. ASCII only.
//
// Body:
//   title           - what the payment is for (shown on Checkout)
//   amount          - MAJOR units (dollars), > 0
//   description     - optional line description
//   currency        - ISO code, default 'usd'
//   type            - 'one_time' | 'recurring'
//   interval        - 'monthly' | 'quarterly' | 'annual' (when recurring)
//   quantity        - integer >= 1 (default 1)
//   customer        - optional name, used in the copyable message
//   customerEmail   - optional prefill for the Checkout customer
//   phone           - optional; echoed back so the caller can text the link
//   linkId / slug   - optional local ids, stamped into metadata for reconcile
//   fallbackUrl     - optional local link used in the message when unconfigured
//   connectedAccountId - optional Stripe Connect acct_... for agency workspaces
//   successUrl / cancelUrl - optional redirect overrides
//
// Env:
//   STRIPE_SECRET_KEY   - required to actually create a session
//   APP_URL             - optional canonical origin for redirects
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const RECURRING = { monthly: 'month', quarterly: 'month', annual: 'year' };
const RECURRING_COUNT = { monthly: 1, quarterly: 3, annual: 1 };
const INTERVAL_WORD = { monthly: 'month', quarterly: 'quarter', annual: 'year' };

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

function money(n, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase(), maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${Number(n || 0).toLocaleString('en-US')}`;
  }
}

// Build the copyable text-to-pay message. Kept ASCII, no em-dash.
function payMessage({ customer, title, amount, currency, url, recurring, interval }) {
  const who = customer ? `Hi ${customer}, ` : 'Hi, ';
  const price = money(amount, currency);
  const cadence = recurring ? ` per ${INTERVAL_WORD[interval] || 'month'}` : '';
  return `${who}here is your secure payment link for ${title || 'your invoice'} (${price}${cadence}): ${url}`;
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const amount = Number(b.amount);
  const title = clean(b.title, 200) || 'Payment';
  const currency = clean(b.currency, 8).toLowerCase() || 'usd';
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, configured: null, error: 'A positive amount is required.' });
  }
  const recurring = b.type === 'recurring';
  const interval = recurring && RECURRING[b.interval] ? b.interval : (recurring ? 'monthly' : null);
  const quantity = Math.max(1, Math.min(100000, parseInt(b.quantity, 10) || 1));
  const customer = clean(b.customer, 120);
  const phone = clean(b.phone, 40);
  const origin = originOf(req);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Honest unconfigured path. Still hand back a copyable message that uses the
    // caller's local fallback link so text-to-pay works in the demo.
    const fallbackUrl = clean(b.fallbackUrl, 500) || `${origin}/pay`;
    return res.status(200).json({
      ok: false,
      configured: false,
      reason: 'stripe-key-missing',
      phone: phone || null,
      message: payMessage({ customer, title, amount, currency, url: fallbackUrl, recurring, interval }),
    });
  }

  const slug = clean(b.slug, 80);
  const linkId = clean(b.linkId, 120);
  const mode = recurring ? 'subscription' : 'payment';

  const price_data = {
    currency,
    product_data: { name: title, description: clean(b.description, 400) || undefined },
    unit_amount: Math.round(amount * 100),
  };
  if (recurring) price_data.recurring = { interval: RECURRING[interval], interval_count: RECURRING_COUNT[interval] };

  const successUrl = clean(b.successUrl, 500) ||
    `${origin}/payments?paid=${encodeURIComponent(slug || linkId || 'session')}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = clean(b.cancelUrl, 500) || `${origin}/payments?checkout=cancel`;

  const payload = {
    mode,
    line_items: [{ price_data, quantity }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: b.customerEmail ? clean(b.customerEmail, 200) : undefined,
    allow_promotion_codes: true,
    metadata: {
      app: 'rally-payments',
      kind: 'payment_link',
      link_id: linkId || '',
      slug: slug || '',
    },
  };
  if (recurring) {
    payload.subscription_data = { metadata: { app: 'rally-payments', link_id: linkId || '', slug: slug || '' } };
  } else {
    payload.payment_intent_data = { metadata: { app: 'rally-payments', link_id: linkId || '', slug: slug || '' } };
  }

  const account = clean(b.connectedAccountId, 80) || undefined;
  const session = await stripePost('/checkout/sessions', payload, { key, account });

  return res.status(200).json({
    ok: true,
    configured: true,
    url: session.url,
    id: session.id,
    mode,
    phone: phone || null,
    message: payMessage({ customer, title, amount, currency, url: session.url, recurring, interval }),
  });
});
