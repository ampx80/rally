// ============================================================
// ARDOVO PRICING CATALOG  (single source of truth)
// The one place that defines tiers, prices, the seat model, and
// the feature matrix. Both the browser (BillingPlans page, marketing
// Pricing) and the server (billing-checkout) read from here so the
// price a user sees is always the price we charge.
//
// This module is isomorphic: pure data + pure helpers, zero imports,
// no browser or node globals. Safe to import from api/*.js and src/*.
//
// Stripe price ids are NOT hardcoded here. Each paid plan names the
// ENV VARS that hold its live price ids (priceEnv). The server resolves
// process.env[...] at request time, so rotating a price id is an env
// change, never a code change. Missing env simply means checkout is not
// configured yet and the UI degrades to a demo flow.
// NO em-dash / en-dash. ASCII only.
// ============================================================

// Annual billing = 2 months free. Shown as a rounded per-month figure.
// round(monthly * 10 / 12) matches src/marketing/Pricing.jsx exactly.
export function annualPerMonth(monthly) {
  return Math.round((monthly * 10) / 12);
}

// Percent saved by paying annually (2 of 12 months free => ~17%).
export const ANNUAL_DISCOUNT_PCT = 17;
export const ANNUAL_DISCOUNT_LABEL = 'Save 17%';

// Billing cycles a paid plan supports.
export const CYCLES = ['monthly', 'annual'];

// ------------------------------------------------------------
// The tiers. Names, prices, and taglines mirror the marketing
// Pricing page so the in-app picker and the public page never drift.
// ------------------------------------------------------------
export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 0,
    unit: 'forever',
    line: 'For small teams getting started.',
    cta: 'Current plan',
    seatModel: 'flat',      // flat = one price regardless of seat count
    maxSeats: 3,
    popular: false,
    custom: false,
    priceEnv: {},           // free plan never touches Stripe
    features: [
      'Core CRM and contacts',
      'Full visual pipeline',
      'Up to 3 seats',
      'Rook basics',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 49,
    unit: 'per seat / mo',
    line: 'For teams running real revenue.',
    cta: 'Upgrade to Growth',
    seatModel: 'per_seat',  // per_seat = price multiplied by seat quantity
    maxSeats: null,
    popular: true,
    custom: false,
    priceEnv: {
      monthly: 'STRIPE_PRICE_GROWTH_MONTHLY',
      annual: 'STRIPE_PRICE_GROWTH_ANNUAL',
    },
    features: [
      'Everything in Starter',
      'Automations and sequences',
      'Dashboards and reporting',
      'Full Rook operator',
      'In-CRM projects',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: null,
    unit: 'talk to us',
    line: 'For orgs that need control and scale.',
    cta: 'Talk to us',
    seatModel: 'custom',
    maxSeats: null,
    popular: false,
    custom: true,
    priceEnv: {},           // negotiated; sales-assisted, not self-serve
    features: [
      'Everything in Growth',
      'RBAC and granular permissions',
      'SSO and SCIM provisioning',
      'Full audit log',
      'Priority support',
      'Dedicated success manager',
    ],
  },
];

export const DEFAULT_PLAN_ID = 'starter';

export function planById(id) {
  return PLANS.find((p) => p.id === id) || null;
}

// The per-month figure to display for a plan + cycle. Free -> 0,
// custom -> null (render "Custom"), paid -> monthly or annual rate.
export function perMonthPrice(plan, cycle = 'monthly') {
  if (!plan || plan.custom) return null;
  if (!plan.monthly) return 0;
  return cycle === 'annual' ? annualPerMonth(plan.monthly) : plan.monthly;
}

// A human price label, e.g. "$0", "$41", or "Custom".
export function priceLabel(plan, cycle = 'monthly') {
  if (!plan) return '';
  if (plan.custom) return 'Custom';
  const v = perMonthPrice(plan, cycle);
  return `$${v}`;
}

// The env-var name holding the Stripe price id for a plan + cycle.
// Server calls this then reads process.env[name]. Returns null for
// free / custom / unknown plans.
export function priceEnvVar(planOrId, cycle = 'monthly') {
  const plan = typeof planOrId === 'string' ? planById(planOrId) : planOrId;
  if (!plan || !plan.priceEnv) return null;
  return plan.priceEnv[cycle] || null;
}

// Whether a plan is a self-serve paid tier (has a Stripe path).
export function isPaidPlan(planOrId) {
  const plan = typeof planOrId === 'string' ? planById(planOrId) : planOrId;
  return !!(plan && !plan.custom && plan.monthly > 0);
}

// ------------------------------------------------------------
// FEATURE MATRIX for the in-app comparison table. Values are either
// a boolean (check / dash) or a short string (rendered as-is). Grouped
// so the picker can print section headers. Keep in sync with features[]
// above; this is the expanded, side-by-side view of the same promise.
// ------------------------------------------------------------
export const FEATURE_MATRIX = [
  {
    group: 'Core CRM',
    rows: [
      { label: 'Contacts, companies, deals', starter: true, growth: true, enterprise: true },
      { label: 'Visual pipeline', starter: true, growth: true, enterprise: true },
      { label: 'Seats included', starter: '3', growth: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Custom fields and views', starter: 'Basic', growth: true, enterprise: true },
    ],
  },
  {
    group: 'Automation and marketing',
    rows: [
      { label: 'Automations and sequences', starter: false, growth: true, enterprise: true },
      { label: 'Campaigns', starter: false, growth: true, enterprise: true },
      { label: 'In-CRM projects', starter: false, growth: true, enterprise: true },
    ],
  },
  {
    group: 'Intelligence',
    rows: [
      { label: 'Dashboards and reporting', starter: false, growth: true, enterprise: true },
      { label: 'Forecasting', starter: false, growth: true, enterprise: true },
      { label: 'Rook operator', starter: 'Basics', growth: 'Full', enterprise: 'Full' },
    ],
  },
  {
    group: 'Security and scale',
    rows: [
      { label: 'RBAC and granular permissions', starter: false, growth: 'Standard', enterprise: true },
      { label: 'SSO and SCIM provisioning', starter: false, growth: false, enterprise: true },
      { label: 'Full audit log', starter: false, growth: false, enterprise: true },
      { label: 'Priority support', starter: false, growth: false, enterprise: true },
      { label: 'Dedicated success manager', starter: false, growth: false, enterprise: true },
    ],
  },
];
