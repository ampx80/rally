// POST /api/billing-webhook
//
// Stripe webhook receiver. Verifies the signature against STRIPE_WEBHOOK_SECRET,
// then persists subscription state so the app knows which plan an org is on.
// Handles:
//   checkout.session.completed        - a checkout finished, sub is active
//   customer.subscription.updated     - plan / seats / status changed
//   customer.subscription.deleted     - canceled, revert toward free
//
// Everything Stripe is lazy + guarded. If STRIPE_SECRET_KEY or
// STRIPE_WEBHOOK_SECRET is missing we return { configured: false } with a 200
// (so Stripe does not hammer retries at an unconfigured endpoint) and log. If
// Supabase is not configured we log the resolved state instead of persisting.
// Missing env NEVER crashes. PII is not logged. NO em-dash / en-dash. ASCII only.
//
// Env:
//   STRIPE_SECRET_KEY                          - required to construct events
//   STRIPE_WEBHOOK_SECRET                      - required to verify signatures
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   - optional durable persistence

// Stripe signature verification needs the RAW request body, so we turn off
// Vercel's automatic body parser for this route only.
export const config = { api: { bodyParser: false } };

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const mod = await import('stripe');
    const Stripe = mod.default || mod;
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.warn('[billing-webhook] stripe package not installed:', e?.message);
    return null;
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Map a Stripe subscription (or checkout session) into the flat state we store.
function stateFromSubscription(sub) {
  const item = sub?.items?.data?.[0];
  const meta = sub?.metadata || {};
  return {
    stripe_subscription_id: sub?.id || null,
    stripe_customer_id: typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id || null,
    plan_id: meta.plan_id || null,
    cycle: meta.cycle || null,
    seats: item?.quantity != null ? item.quantity : (meta.seats ? parseInt(meta.seats, 10) : null),
    status: sub?.status || null,
    current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    price_id: item?.price?.id || null,
    updated_at: new Date().toISOString(),
  };
}

// Best-effort upsert of subscription state onto the orgs table. Keyed by
// org id (from metadata) when present, else by stripe_customer_id. Silent
// no-op when Supabase is not configured or the write fails.
async function persist(orgId, state) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[billing-webhook] no db; resolved plan state', { plan_id: state.plan_id, status: state.status, seats: state.seats });
    return { ok: false, skipped: 'no-db' };
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    if (orgId) {
      const { error } = await supa.from('orgs').update(state).eq('id', orgId);
      if (error) { console.warn('[billing-webhook] org update skipped:', error.message); return { ok: false, error: error.message }; }
      return { ok: true, by: 'org_id' };
    }
    if (state.stripe_customer_id) {
      const { error } = await supa.from('orgs').update(state).eq('stripe_customer_id', state.stripe_customer_id);
      if (error) { console.warn('[billing-webhook] customer update skipped:', error.message); return { ok: false, error: error.message }; }
      return { ok: true, by: 'customer_id' };
    }
    return { ok: false, skipped: 'no-key' };
  } catch (e) {
    console.warn('[billing-webhook] persist failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

export default async function handler(req, res) {
  // Deliberately not using withErrorHandling: a webhook must always answer with
  // an explicit 2xx/4xx that Stripe understands, and never surface secrets.
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

    const stripe = await getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) {
      return res.status(200).json({ configured: false, reason: !stripe ? 'stripe-key-missing' : 'webhook-secret-missing' });
    }

    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (e) {
      console.warn('[billing-webhook] signature verification failed:', e?.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        const orgId = s.client_reference_id || s.metadata?.org_id || null;
        // Expand the subscription for full item/plan detail when possible.
        let sub = null;
        if (s.subscription) {
          try { sub = await stripe.subscriptions.retrieve(s.subscription); } catch (e) { console.warn('[billing-webhook] sub retrieve failed:', e?.message); }
        }
        const state = sub ? stateFromSubscription(sub) : {
          stripe_subscription_id: s.subscription || null,
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer?.id || null,
          plan_id: s.metadata?.plan_id || null,
          cycle: s.metadata?.cycle || null,
          status: 'active',
          updated_at: new Date().toISOString(),
        };
        await persist(orgId, state);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await persist(sub.metadata?.org_id || null, stateFromSubscription(sub));
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const state = stateFromSubscription(sub);
        state.status = 'canceled';
        state.plan_id = 'starter'; // revert to the free floor
        await persist(sub.metadata?.org_id || null, state);
        break;
      }
      default:
        // Acknowledge everything else so Stripe stops retrying.
        break;
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('[billing-webhook] handler error', e?.message);
    // 200 so Stripe does not retry a bug forever; we have logged it.
    return res.status(200).json({ received: true, error: 'handled' });
  }
}
