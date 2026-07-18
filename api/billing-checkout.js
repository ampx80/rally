// POST /api/billing-checkout
//
// Creates a Stripe Checkout Session for a paid Ardovo plan and returns its
// hosted URL. Everything Stripe is lazy + guarded: if STRIPE_SECRET_KEY (or the
// plan's price id env var) is missing, we return { configured: false } with a
// 200 so the browser can fall back to a local demo upgrade. Missing env NEVER
// crashes the build or the request. NO em-dash / en-dash. ASCII only.
//
// Body:
//   planId      - 'growth' (any self-serve paid plan id from src/lib/plans.js)
//   cycle       - 'monthly' | 'annual'   (default 'monthly')
//   seats       - integer >= 1 for per-seat plans (default 1)
//   email       - optional prefill for the checkout customer
//   orgId       - optional; stored in metadata so the webhook can map the sub
//   successUrl  - optional override; defaults to <origin>/settings?billing=success
//   cancelUrl   - optional override; defaults to <origin>/billing-plans?billing=cancel
//
// Env:
//   STRIPE_SECRET_KEY                - required to actually create a session
//   STRIPE_PRICE_GROWTH_MONTHLY      - live price id for Growth monthly
//   STRIPE_PRICE_GROWTH_ANNUAL       - live price id for Growth annual
//   APP_URL                          - optional canonical origin for redirects
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { planById, priceEnvVar, isPaidPlan } from '../src/lib/plans.js';

// Lazily create the Stripe client. Returns null when the key or the package is
// unavailable, so the caller degrades gracefully instead of throwing.
async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const mod = await import('stripe');
    const Stripe = mod.default || mod;
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.warn('[billing-checkout] stripe package not installed:', e?.message);
    return null;
  }
}

function originOf(req) {
  const env = (process.env.APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : 'https://rally-psi-five.vercel.app';
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const planId = String(b.planId || '').trim();
  const cycle = b.cycle === 'annual' ? 'annual' : 'monthly';
  const seats = Math.max(1, Math.min(1000, parseInt(b.seats, 10) || 1));
  const plan = planById(planId);

  if (!plan) return res.status(400).json({ configured: false, error: 'Unknown plan.' });
  if (!isPaidPlan(plan)) {
    // Free or custom tiers have no self-serve checkout.
    return res.status(400).json({ configured: false, error: `The ${plan.name} plan is not self-serve.` });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return res.status(200).json({ configured: false, reason: 'stripe-key-missing' });
  }

  const priceVar = priceEnvVar(plan, cycle);
  const priceId = priceVar ? process.env[priceVar] : null;
  if (!priceId) {
    return res.status(200).json({ configured: false, reason: 'price-id-missing', missingEnv: priceVar });
  }

  const origin = originOf(req);
  const successUrl = String(b.successUrl || `${origin}/settings?billing=success&plan=${plan.id}`);
  const cancelUrl = String(b.cancelUrl || `${origin}/billing-plans?billing=cancel`);
  const quantity = plan.seatModel === 'per_seat' ? seats : 1;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity }],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    customer_email: b.email ? String(b.email).slice(0, 200) : undefined,
    client_reference_id: b.orgId ? String(b.orgId).slice(0, 120) : undefined,
    subscription_data: {
      metadata: {
        app: 'rally',
        plan_id: plan.id,
        cycle,
        seats: String(quantity),
        org_id: b.orgId ? String(b.orgId).slice(0, 120) : '',
      },
    },
    metadata: {
      app: 'rally',
      plan_id: plan.id,
      cycle,
      org_id: b.orgId ? String(b.orgId).slice(0, 120) : '',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return res.status(200).json({ configured: true, url: session.url, id: session.id });
});
