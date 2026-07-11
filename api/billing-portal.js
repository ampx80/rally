// POST /api/billing-portal
//
// Creates a Stripe Billing Portal session so a customer can manage their
// subscription (update card, change seats, cancel). Lazy + guarded: if
// STRIPE_SECRET_KEY is missing or we have no customer id, we return
// { configured: false } with a 200 and the browser falls back to a no-op /
// demo message. Missing env NEVER crashes. NO em-dash / en-dash. ASCII only.
//
// Body:
//   customerId - Stripe customer id (cus_...). Preferred.
//   orgId      - optional; if customerId is absent we look the customer up from
//                the orgs table (best-effort, only when Supabase is configured).
//   returnUrl  - optional override; defaults to <origin>/settings?tab=workspace
//
// Env:
//   STRIPE_SECRET_KEY                          - required
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   - optional customer lookup by org
//   APP_URL                                    - optional canonical origin
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const mod = await import('stripe');
    const Stripe = mod.default || mod;
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.warn('[billing-portal] stripe package not installed:', e?.message);
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

// Best-effort: resolve a Stripe customer id from the orgs table by org id.
async function customerFromOrg(orgId) {
  if (!orgId) return null;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supa.from('orgs').select('stripe_customer_id').eq('id', orgId).maybeSingle();
    if (error) { console.warn('[billing-portal] org lookup skipped:', error.message); return null; }
    return data?.stripe_customer_id || null;
  } catch (e) {
    console.warn('[billing-portal] org lookup failed:', e?.message);
    return null;
  }
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const b = readJsonBody(req);

  const stripe = await getStripe();
  if (!stripe) {
    return res.status(200).json({ configured: false, reason: 'stripe-key-missing' });
  }

  let customerId = b.customerId ? String(b.customerId).trim() : '';
  if (!customerId) customerId = (await customerFromOrg(b.orgId ? String(b.orgId).trim() : '')) || '';
  if (!customerId) {
    return res.status(200).json({ configured: false, reason: 'no-customer' });
  }

  const origin = originOf(req);
  const returnUrl = String(b.returnUrl || `${origin}/settings?tab=workspace`);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return res.status(200).json({ configured: true, url: session.url });
});
