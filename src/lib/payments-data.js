// ============================================================
// ARDOVO PAYMENTS  (local-first, Supabase + Stripe-swappable)
// ------------------------------------------------------------
// The commerce layer that turns Ardovo from a CRM into a money
// platform. Ardovo already sends invoices; Payments adds fast
// collection: a live volume dashboard, shareable payment links,
// text-to-pay straight to a contact's phone, a branded checkout
// preview, and recurring subscriptions with failed-payment
// dunning. Every surface is 100% functional against a
// deterministic seed with ZERO backend.
//
// This slice is ADDITIVE. It never mutates store.js state; it
// only READS the live CRM (contacts + companies) so seeded
// customers map to real accounts. Same deterministic-seed +
// pub/sub + localStorage pattern as store.js / reviews-data.js so
// it feels alive across reloads. Charging a card, firing a real
// text-to-pay, and provisioning a subscription are env-gated
// (Stripe) and degrade to a local queue when the env is absent.
//
// Live equivalent: rally_transactions + rally_payment_links +
// rally_subscriptions tables; the real charge routes through
// api/payments-charge.js (Stripe PaymentIntents), the text-to-pay
// through api/payment-link-send.js (SMS), and subscriptions
// through Stripe Billing webhooks. ASCII only, NO em-dash.
//
// TDZ NOTE: every helper called during module-eval seeding is a
// hoisted `function` declaration (or a const declared ABOVE the
// `let state = load()` line). Never a const arrow defined lower.
// ============================================================
import { useEffect, useState } from 'react';
import { getContacts, getCompanies, contactName } from './store.js';

const LS_KEY = 'rally_payments_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (mirrors store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */

// Transaction lifecycle. Color/tone drives every chip + chart so a
// status reads the same everywhere in the product.
export const TXN_STATUS_META = {
  succeeded: { label: 'Succeeded', tone: 'ok', color: 'var(--ok)' },
  pending: { label: 'Pending', tone: 'warn', color: 'var(--warn)' },
  failed: { label: 'Failed', tone: 'risk', color: 'var(--risk)' },
  refunded: { label: 'Refunded', tone: 'info', color: 'var(--info)' },
};

// Card brands we render. `short` is the wordmark shown on the row.
export const CARD_BRANDS = [
  { id: 'visa', label: 'Visa', short: 'VISA', color: '#1a1f71' },
  { id: 'mastercard', label: 'Mastercard', short: 'MC', color: '#eb001b' },
  { id: 'amex', label: 'Amex', short: 'AMEX', color: '#006fcf' },
  { id: 'ach', label: 'Bank (ACH)', short: 'ACH', color: '#1a7f52' },
];
export const brandById = (id) => CARD_BRANDS.find(b => b.id === id) || CARD_BRANDS[0];

// Channels a payment link goes out on.
export const LINK_CHANNELS = [
  { id: 'link', label: 'Shareable link', icon: 'link' },
  { id: 'sms', label: 'Text to pay', icon: 'phone' },
  { id: 'email', label: 'Email', icon: 'mail' },
];

// Payment-link lifecycle.
export const LINK_STATUS_META = {
  paid: { label: 'Paid', tone: 'ok' },
  pending: { label: 'Awaiting payment', tone: 'warn' },
  viewed: { label: 'Viewed', tone: 'info' },
  expired: { label: 'Expired', tone: 'default' },
};

// Subscription lifecycle.
export const SUB_STATUS_META = {
  active: { label: 'Active', tone: 'ok' },
  past_due: { label: 'Past due', tone: 'risk' },
  canceled: { label: 'Canceled', tone: 'default' },
  trialing: { label: 'Trialing', tone: 'accent' },
};

// Recurring intervals and how many months each spans (for MRR math).
export const INTERVALS = [
  { id: 'monthly', label: 'Monthly', months: 1 },
  { id: 'quarterly', label: 'Quarterly', months: 3 },
  { id: 'annual', label: 'Annual', months: 12 },
];
export const intervalMonths = (id) => (INTERVALS.find(i => i.id === id) || INTERVALS[0]).months;

// The subscription plan catalog. Amount is the per-interval price.
export const PLANS = [
  { id: 'starter', name: 'Starter', amount: 49, interval: 'monthly' },
  { id: 'growth', name: 'Growth', amount: 199, interval: 'monthly' },
  { id: 'scale', name: 'Scale', amount: 499, interval: 'monthly' },
  { id: 'enterprise', name: 'Enterprise', amount: 1500, interval: 'monthly' },
];

// The Ardovo customer's OWN brand shown on the checkout preview. Editable.
export const DEFAULT_BUSINESS = { name: 'Vertex Robotics', accent: '#5b4bf5', supportEmail: 'billing@vertexrobotics.com' };

const LINE_ITEMS = [
  'Platform rollout - milestone 1', 'Annual license renewal', 'Onboarding package',
  'Professional services - Q3', 'Seat expansion (25 seats)', 'Priority support add-on',
  'Implementation deposit', 'Custom integration build', 'Training workshop',
  'Data migration project', 'Advisory retainer', 'Overage - API usage',
];
const LINK_TITLES = [
  'Deposit invoice', 'Milestone 2 payment', 'Renewal balance', 'Setup fee',
  'Workshop booking', 'Consulting block', 'Expansion order', 'Final balance',
  'Retainer - monthly', 'Add-on purchase',
];
const FALLBACK_CUSTOMERS = [
  { name: 'Amelia Hartwell', company: 'Northwind Systems', phone: '(415) 555-0142' },
  { name: 'Marcus Bell', company: 'Cobalt Labs', phone: '(512) 555-0188' },
  { name: 'Priya Nair', company: 'Meridian Health', phone: '(303) 555-0119' },
  { name: 'Devon Clarke', company: 'Apex Freight', phone: '(206) 555-0173' },
  { name: 'Sofia Marino', company: 'Beacon Capital', phone: '(617) 555-0155' },
  { name: 'Tyler Osei', company: 'Cascade Media', phone: '(720) 555-0164' },
  { name: 'Grace Whitman', company: 'Lumen Retail', phone: '(404) 555-0131' },
  { name: 'Hassan Reyes', company: 'Arbor Energy', phone: '(646) 555-0127' },
];

/* Read customers from the live CRM so seeded payers map to real accounts.
   Hoisted `function` so it is safe to call during module-eval seeding.
   Falls back to a static pool if the CRM read throws for any reason. */
function crmCustomers() {
  try {
    const cos = getCompanies();
    const list = getContacts()
      .slice(0, 60)
      .map(c => {
        const co = cos.find(x => x.id === c.companyId);
        return { name: contactName(c), company: co ? co.name : 'Independent', phone: c.phone || '' };
      })
      .filter(c => c.name && c.name !== 'Unknown');
    if (list.length >= 8) return list;
  } catch {}
  return FALLBACK_CUSTOMERS;
}

/* Deterministic faux card number tail. */
function last4(rnd) { return String(1000 + Math.floor(rnd() * 9000)); }

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const iso = (d) => new Date(now + d * DAY).toISOString();

  const customers = crmCustomers();
  const cust = () => pick(customers);

  /* --- transactions (last ~45 days of collection) --- */
  const transactions = [];
  for (let i = 0; i < 46; i++) {
    const r = rnd();
    let status;
    if (r < 0.76) status = 'succeeded';
    else if (r < 0.86) status = 'failed';
    else if (r < 0.94) status = 'refunded';
    else status = 'pending';
    const brand = pick(CARD_BRANDS);
    const c = cust();
    const amount = range(4, 190) * 25; // $100 .. $4,750
    const daysAgo = -Math.floor(rnd() * 44);
    transactions.push({
      id: `tx_${i + 1}`,
      amount,
      status,
      customer: c.name,
      company: c.company,
      brand: brand.id,
      last4: last4(rnd),
      description: pick(LINE_ITEMS),
      kind: rnd() < 0.32 ? 'subscription' : (rnd() < 0.5 ? 'invoice' : 'payment_link'),
      createdAt: iso(daysAgo),
      refundedAmount: status === 'refunded' ? amount : 0,
      failCode: status === 'failed' ? pick(['card_declined', 'insufficient_funds', 'expired_card']) : null,
    });
  }
  // A marquee flagship enterprise payment, pinned recent + large.
  transactions.unshift({
    id: 'tx_flagship',
    amount: 42000,
    status: 'succeeded',
    customer: 'Nina Kapoor',
    company: 'Vertex Robotics',
    brand: 'visa',
    last4: '4242',
    description: 'Enterprise platform rollout - milestone 1',
    kind: 'payment_link',
    createdAt: iso(-1),
    refundedAmount: 0,
    failCode: null,
  });

  /* --- payment links + text-to-pay queue --- */
  const links = [];
  for (let i = 0; i < 11; i++) {
    const r = rnd();
    let status;
    if (r < 0.42) status = 'paid';
    else if (r < 0.68) status = 'pending';
    else if (r < 0.86) status = 'viewed';
    else status = 'expired';
    const channel = pick(LINK_CHANNELS).id;
    const c = cust();
    const amount = range(2, 120) * 25;
    const type = rnd() < 0.3 ? 'recurring' : 'one_time';
    const sentAgo = -Math.floor(1 + rnd() * 26);
    links.push({
      id: `pl_${i + 1}`,
      title: pick(LINK_TITLES),
      amount,
      description: pick(LINE_ITEMS),
      type,
      interval: type === 'recurring' ? pick(INTERVALS).id : null,
      channel,
      status,
      customer: c.name,
      company: c.company,
      phone: c.phone || '(555) 555-0100',
      slug: slugFor(i, rnd),
      createdAt: iso(sentAgo),
      paidAt: status === 'paid' ? iso(sentAgo + 1 + Math.floor(rnd() * 5)) : null,
    });
  }
  // A pinned live text-to-pay to the flagship champion, awaiting payment.
  links.unshift({
    id: 'pl_flagship',
    title: 'Vertex - milestone 2 deposit',
    amount: 21000,
    description: 'Enterprise platform rollout - milestone 2',
    type: 'one_time',
    interval: null,
    channel: 'sms',
    status: 'viewed',
    customer: 'Nina Kapoor',
    company: 'Vertex Robotics',
    phone: '(512) 555-0142',
    slug: 'vtx-m2-9x4k',
    createdAt: iso(0),
    paidAt: null,
  });

  /* --- subscriptions (recurring revenue book) --- */
  const subscriptions = [];
  for (let i = 0; i < 14; i++) {
    const r = rnd();
    let status;
    if (r < 0.72) status = 'active';
    else if (r < 0.84) status = 'past_due';
    else if (r < 0.93) status = 'trialing';
    else status = 'canceled';
    const plan = pick(PLANS);
    const interval = rnd() < 0.28 ? 'annual' : 'monthly';
    const amount = interval === 'annual' ? plan.amount * 12 * 0.85 : plan.amount;
    const c = cust();
    const startedAgo = -range(20, 520);
    subscriptions.push({
      id: `sub_${i + 1}`,
      customer: c.name,
      company: c.company,
      planId: plan.id,
      planName: plan.name,
      amount: Math.round(amount),
      interval,
      status,
      startedAt: iso(startedAgo),
      nextRenewal: status === 'canceled' ? null : iso(range(1, interval === 'annual' ? 120 : 28)),
      failedAttempts: status === 'past_due' ? range(1, 3) : 0,
      brand: pick(CARD_BRANDS).id,
      last4: last4(rnd),
    });
  }
  // A pinned enterprise subscription for the flagship account.
  subscriptions.unshift({
    id: 'sub_flagship',
    customer: 'Vertex Robotics',
    company: 'Vertex Robotics',
    planId: 'enterprise',
    planName: 'Enterprise',
    amount: 1500,
    interval: 'monthly',
    status: 'active',
    startedAt: iso(-210),
    nextRenewal: iso(12),
    failedAttempts: 0,
    brand: 'visa',
    last4: '4242',
  });

  /* --- business identity for the checkout preview --- */
  const business = { ...DEFAULT_BUSINESS };

  return { seededAt: new Date(now).toISOString(), transactions, links, subscriptions, business };
}

/* Deterministic short slug for a payment-link URL. Hoisted for seed safety. */
function slugFor(i, rnd) {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let k = 0; k < 6; k++) s += abc[Math.floor(rnd() * abc.length)];
  return `${s}`;
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetPayments() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getPaymentsState() { return state; }

export function usePayments(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* Is the live Stripe env wired? When absent, every mutation stays local and
   the UI shows a "test mode" affordance instead of hitting a real API. */
export function hasStripeEnv() {
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return Boolean(env.VITE_STRIPE_PUBLISHABLE_KEY || env.VITE_STRIPE_KEY);
  } catch { return false; }
}

/* ============================================================
   READ API
   ============================================================ */
export const getTransactions = () => state.transactions;
export const getTransaction = (id) => state.transactions.find(t => t.id === id) || null;
export const getLinks = () => state.links;
export const getLink = (id) => state.links.find(l => l.id === id) || null;
export const getSubscriptions = () => state.subscriptions;
export const getBusiness = () => state.business;

/* Public URL a payment link resolves to (visual - not a live route). */
export const linkUrl = (slug) => `pay.ardovo.com/${slug}`;

/* Normalize any recurring amount to a monthly figure for MRR. */
export function monthlyValue(amount, interval) {
  const m = intervalMonths(interval);
  return m ? amount / m : amount;
}

/* ---------- dashboard roll-ups (all pure over state) ---------- */
export function paymentStats() {
  const tx = state.transactions;
  const now = new Date();
  const inThisMonth = (d) => { const x = new Date(d); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); };

  const succeeded = tx.filter(t => t.status === 'succeeded');
  const failed = tx.filter(t => t.status === 'failed');
  const refunded = tx.filter(t => t.status === 'refunded');
  const pending = tx.filter(t => t.status === 'pending');

  const grossVolume = succeeded.reduce((s, t) => s + t.amount, 0);
  const volumeThisMonth = succeeded.filter(t => inThisMonth(t.createdAt)).reduce((s, t) => s + t.amount, 0);
  const refundTotal = refunded.reduce((s, t) => s + (t.refundedAmount || t.amount), 0);
  const netVolume = grossVolume - refundTotal;
  const processed = succeeded.length + failed.length;
  const successRate = processed ? succeeded.length / processed : 0;
  const avgTransaction = succeeded.length ? Math.round(grossVolume / succeeded.length) : 0;

  // MRR from active + past-due (past-due still counts until it churns) subs.
  const subs2 = state.subscriptions;
  const recurring = subs2.filter(s => s.status === 'active' || s.status === 'past_due');
  const mrr = Math.round(recurring.reduce((s, x) => s + monthlyValue(x.amount, x.interval), 0));
  const activeSubs = subs2.filter(s => s.status === 'active').length;
  const pastDue = subs2.filter(s => s.status === 'past_due');
  const canceled = subs2.filter(s => s.status === 'canceled').length;
  const churnRate = subs2.length ? canceled / subs2.length : 0;

  // 8-week volume series (oldest -> newest) for the trend bars.
  const WEEK = 7 * 86400000;
  const trend = [];
  for (let w = 7; w >= 0; w--) {
    const hi = Date.now() - w * WEEK;
    const lo = hi - WEEK;
    trend.push(succeeded.filter(t => { const ts = new Date(t.createdAt).getTime(); return ts > lo && ts <= hi; }).reduce((s, t) => s + t.amount, 0));
  }

  // Payout schedule: succeeded funds settle T+2, so recent succeeded volume is
  // "in transit" and pays out on the next business day.
  const inTransit = succeeded.filter(t => { const ts = new Date(t.createdAt).getTime(); return ts > Date.now() - 2 * 86400000; }).reduce((s, t) => s + t.amount, 0);
  const nextPayout = new Date(Date.now() + 86400000);
  const lastPayout = { amount: Math.round(grossVolume * 0.14), date: new Date(Date.now() - 2 * 86400000).toISOString() };

  return {
    grossVolume, volumeThisMonth, netVolume, refundTotal, refundCount: refunded.length,
    succeededCount: succeeded.length, failedCount: failed.length, pendingCount: pending.length,
    successRate, avgTransaction, trend,
    mrr, arr: mrr * 12, activeSubs, pastDueCount: pastDue.length, pastDue, churnRate,
    payout: { inTransit, nextPayout: nextPayout.toISOString(), last: lastPayout },
  };
}

export function linkStats() {
  const ls = state.links;
  const total = ls.length;
  const paid = ls.filter(l => l.status === 'paid');
  const pending = ls.filter(l => l.status === 'pending' || l.status === 'viewed');
  const collected = paid.reduce((s, l) => s + l.amount, 0);
  const outstanding = pending.reduce((s, l) => s + l.amount, 0);
  const conversion = total ? paid.length / total : 0;
  return { total, paidCount: paid.length, pendingCount: pending.length, collected, outstanding, conversion };
}

/* Recent transactions, newest first, optionally filtered by status. */
export function recentTransactions(limit = 12, status = 'all') {
  return state.transactions
    .filter(t => status === 'all' ? true : t.status === status)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

/* Subscriptions renewing within `days`, soonest first. */
export function upcomingRenewals(days = 30) {
  const horizon = Date.now() + days * 86400000;
  return state.subscriptions
    .filter(s => s.nextRenewal && new Date(s.nextRenewal).getTime() <= horizon && s.status !== 'canceled')
    .sort((a, b) => new Date(a.nextRenewal) - new Date(b.nextRenewal));
}

/* Subscriptions in dunning (failed payment, needs recovery). */
export function dunningQueue() {
  return state.subscriptions
    .filter(s => s.status === 'past_due')
    .sort((a, b) => b.failedAttempts - a.failedAttempts);
}

/* ============================================================
   WRITE API   (validated writers; local-first, Stripe-swappable)
   ============================================================ */

// SUPABASE/STRIPE: create a Stripe Payment Link + persist the row. When the
// Stripe env is absent this stays a local record so the demo is fully alive.
export function createLink({ title, amount, description, type = 'one_time', interval = 'monthly', channel = 'link', customer = '', company = '', phone = '' }) {
  const val = Number(amount);
  if (!title || !title.trim()) return { error: 'title', message: 'Give the link a title.' };
  if (!Number.isFinite(val) || val <= 0) return { error: 'amount', message: 'Enter a valid amount.' };
  if (channel === 'sms' && !phone.trim()) return { error: 'phone', message: 'A phone number is required to text to pay.' };
  const link = {
    id: newId('pl'),
    title: title.trim(),
    amount: Math.round(val),
    description: description || title.trim(),
    type,
    interval: type === 'recurring' ? interval : null,
    channel,
    status: channel === 'sms' || channel === 'email' ? 'pending' : 'pending',
    customer: customer.trim(),
    company: company.trim(),
    phone: phone.trim(),
    slug: newSlug(),
    createdAt: new Date().toISOString(),
    paidAt: null,
    live: hasStripeEnv(),
  };
  commit({ ...state, links: [link, ...state.links] });
  return { link };
}

/* Simulate a link being paid (in the demo this is the customer completing
   checkout). In production this is the Stripe webhook flipping the row. */
export function markLinkPaid(id) {
  const l = getLink(id);
  if (!l) return { error: 'missing', message: 'Link not found.' };
  l.status = 'paid';
  l.paidAt = new Date().toISOString();
  const brand = pickBrand();
  // Record the matching transaction so the dashboard volume updates live.
  const tx = {
    id: newId('tx'), amount: l.amount, status: 'succeeded',
    customer: l.customer || 'Guest', company: l.company || '',
    brand, last4: String(1000 + Math.floor(deterministicTail(id) * 9000)),
    description: l.description, kind: 'payment_link',
    createdAt: new Date().toISOString(), refundedAmount: 0, failCode: null,
  };
  commit({ ...state, links: [...state.links], transactions: [tx, ...state.transactions] });
  return { link: l, transaction: tx };
}

export function expireLink(id) {
  const l = getLink(id);
  if (!l) return { error: 'missing', message: 'Link not found.' };
  l.status = 'expired';
  commit({ ...state, links: [...state.links] });
  return { link: l };
}

// STRIPE: issue a refund on the PaymentIntent. Local-first flips the row.
export function refundTransaction(id) {
  const t = getTransaction(id);
  if (!t) return { error: 'missing', message: 'Transaction not found.' };
  if (t.status !== 'succeeded') return { error: 'status', message: 'Only succeeded charges can be refunded.' };
  t.status = 'refunded';
  t.refundedAmount = t.amount;
  commit({ ...state, transactions: [...state.transactions] });
  return { transaction: t };
}

// STRIPE: retry a failed subscription charge (dunning recovery). In the demo
// the retry succeeds and the subscription returns to active.
export function retrySubscription(id) {
  const s = state.subscriptions.find(x => x.id === id);
  if (!s) return { error: 'missing', message: 'Subscription not found.' };
  s.status = 'active';
  s.failedAttempts = 0;
  s.nextRenewal = new Date(Date.now() + 30 * 86400000).toISOString();
  commit({ ...state, subscriptions: [...state.subscriptions] });
  return { subscription: s };
}

export function cancelSubscription(id) {
  const s = state.subscriptions.find(x => x.id === id);
  if (!s) return { error: 'missing', message: 'Subscription not found.' };
  s.status = 'canceled';
  s.nextRenewal = null;
  commit({ ...state, subscriptions: [...state.subscriptions] });
  return { subscription: s };
}

/* Update the checkout business identity (name/accent/support email). */
export function updateBusiness(patch) {
  commit({ ...state, business: { ...state.business, ...patch } });
  return { business: state.business };
}

/* ---------- small runtime helpers (post-seed; safe as const) ---------- */
function newSlug() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let k = 0; k < 6; k++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
function pickBrand() {
  const ids = CARD_BRANDS.map(b => b.id);
  return ids[Math.floor(Math.random() * ids.length)];
}
// Stable 0..1 from a string id (used for a deterministic faux last4 on markPaid).
function deterministicTail(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10000) / 10000;
}
