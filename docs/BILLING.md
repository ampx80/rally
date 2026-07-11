# Rally billing (Stripe)

Subscription billing for Rally. Everything is additive and safe when Stripe env
is absent: the build never breaks, the API returns `{ configured: false }`, and
the in-app plan picker falls back to a local demo upgrade. No em-dash / en-dash.

## What ships

Single source of truth for pricing:

- `src/lib/plans.js` - the catalog: tiers (Starter / Growth / Enterprise),
  monthly and annual pricing, the seat model, and the feature matrix. Both the
  browser and the serverless routes read from here so a shown price always
  equals a charged price. Isomorphic (no imports), safe to import anywhere.

Serverless routes (all lazy-load `stripe`, all graceful when env is missing):

- `POST /api/billing-checkout` - creates a Stripe Checkout Session for a paid
  plan and returns its hosted `url`. Returns `{ configured: false }` when the
  secret key or the plan's price id env var is missing.
- `POST /api/billing-portal` - creates a Stripe Billing Portal session so a
  customer can manage or cancel their subscription.
- `POST /api/billing-webhook` - verifies the Stripe signature and persists
  subscription state. Handles `checkout.session.completed`,
  `customer.subscription.updated`, and `customer.subscription.deleted`.

Browser + UI:

- `src/lib/billing.js` - `startCheckout(planId, opts)`, `openPortal(opts)`, the
  `useBilling()` hook, and local plan state for the demo.
- `src/pages/BillingPlans.jsx` - the in-app plan picker (monthly/annual toggle,
  tier cards, current-plan highlight, full feature matrix, upgrade CTA).

## One-time setup

### 1. Install the dependency

`stripe` is not yet a dependency. Add it:

```
npm install stripe
```

The routes import it lazily (`await import('stripe')`), so the app still builds
and runs without it, but real checkout needs it installed.

### 2. Create products and prices in Stripe

In the Stripe Dashboard (or CLI), create one product ("Rally Growth") with two
recurring prices:

- Growth monthly - recurring, monthly, per seat. Copy the price id (`price_...`).
- Growth annual - recurring, yearly (or monthly billed annually), per seat.

Starter is free (no Stripe object). Enterprise is sales-assisted (no self-serve
price).

### 3. Set environment variables

Server-side (Vercel project settings, all environments):

| Var | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...`. Required for checkout, portal, and webhook. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the webhook endpoint. Required to verify webhook signatures. |
| `STRIPE_PRICE_GROWTH_MONTHLY` | `price_...` for Growth monthly. |
| `STRIPE_PRICE_GROWTH_ANNUAL` | `price_...` for Growth annual. |
| `APP_URL` | Optional. Canonical origin for success/cancel/return URLs (for example `https://rally-psi-five.vercel.app`). Falls back to the request host. |

The price id env var NAMES are declared per plan in `src/lib/plans.js`
(`priceEnv`). To add a new paid plan, add its `priceEnv` names there and set the
matching env vars; no route code changes.

### 4. Register the webhook

Point a Stripe webhook at `https://<your-domain>/api/billing-webhook` and
subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`. The route disables
Vercel's body parser (`export const config = { api: { bodyParser: false } }`) so
the raw body is available for signature verification.

Local testing:

```
stripe listen --forward-to localhost:3000/api/billing-webhook
stripe trigger checkout.session.completed
```

## How it ties to orgs

The webhook persists subscription state to a Supabase `orgs` table when
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise it logs the
resolved state (no PII). Rally does not yet have an orgs table, so today this is
a best-effort log. When orgs land, add these columns and the webhook lights up
with no code change:

```sql
alter table orgs add column if not exists stripe_customer_id text;
alter table orgs add column if not exists stripe_subscription_id text;
alter table orgs add column if not exists plan_id text default 'starter';
alter table orgs add column if not exists cycle text;
alter table orgs add column if not exists seats integer;
alter table orgs add column if not exists status text;
alter table orgs add column if not exists price_id text;
alter table orgs add column if not exists current_period_end timestamptz;
alter table orgs add column if not exists updated_at timestamptz;
```

Pass the org id from the client as `orgId` to `startCheckout`; it flows into the
Checkout Session metadata (`org_id`) and back through the webhook so the row is
matched by org id (falling back to `stripe_customer_id`). The portal route can
resolve a customer id from `orgs.stripe_customer_id` by `orgId`.

Until orgs exist, the browser tracks the current plan locally in
`localStorage['rally_billing_v1']` via `src/lib/billing.js`, which is what the
demo plan picker reads and writes.

## Wiring still required (outside the billing namespace)

These edits are intentionally left for the integrator (they touch shared files):

1. `npm install stripe`.
2. `src/App.jsx` - import `BillingPlans` and add a route, for example
   `<Route path="/billing-plans" element={<BillingPlans />} />`. Because the
   product app keys off the first path segment, also add `billing-plans` to the
   `PRODUCT_SEGS` set (or mount it under an existing product segment such as
   `/settings/plans`).
3. `src/App.jsx` nav - add a "Plans" item under the Revenue section pointing at
   the chosen route.
4. Set the Stripe env vars above in Vercel.
