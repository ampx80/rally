// ============================================================
// ARDOVO AFFILIATES + PARTNERS  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// An affiliate army is distribution. GoHighLevel monetizes referral
// programs as a paid add-on; Ardovo bundles a full partner engine so
// every customer can turn happy users into a paid sales force.
//
// This slice is ADDITIVE. It owns its own state (partners, commission
// plans, payouts) and never touches store.js. It READS the live CRM
// only to anchor attributed revenue to real closed-won deals when it
// can. Same deterministic-seed + pub/sub + localStorage pattern as
// store.js / reviews-data.js so the demo is alive with zero backend.
//
// IMPORTANT: this NEVER moves money. Payouts are status changes only
// (pending -> approved -> paid). A live deploy would settle through a
// provider (Stripe Connect / PayPal Payouts) behind an env gate; with
// no env every action stays a local, inspectable state change.
//
// Live equivalent: rally_affiliates + rally_commission_plans +
// rally_affiliate_payouts tables; settlement via api/affiliate-payout.js.
// ASCII only, NO em-dash, NO en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals, getCompany } from './store.js';

const LS_KEY = 'rally_affiliates_v1';   // bump to force a clean reseed

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

// The public base for a partner's referral link. In production this is the
// customer's own tracked short domain; every click sets a cookie for the
// plan's window and attributes the resulting deal back to the partner.
export const REFERRAL_BASE = 'ardovo.com/r/';

// Commission plans ship seeded so the Plans tab is alive immediately.
// type: 'percent' pays a share of attributed revenue; 'flat' pays a fixed
// bounty per converted customer. recurrence: 'one-time' pays on the first
// deal; 'recurring' pays every renewal for the life of the account.
// cookieDays is the attribution window a click stays valid for.
export const DEFAULT_PLANS = [
  { id: 'pl_starter', name: 'Starter', type: 'percent', rate: 15, recurrence: 'one-time', cookieDays: 30, color: '#0ea5a3', desc: '15% of first-year revenue. The on-ramp every new partner starts on.' },
  { id: 'pl_growth', name: 'Growth', type: 'percent', rate: 25, recurrence: 'recurring', cookieDays: 60, color: '#5b4bf5', desc: '25% recurring for the life of the account. Rewards partners who send real revenue.' },
  { id: 'pl_elite', name: 'Elite', type: 'percent', rate: 30, recurrence: 'recurring', cookieDays: 90, color: '#a855f7', desc: '30% recurring plus a 90 day window. Reserved for top producers.' },
  { id: 'pl_founding', name: 'Founding Partner', type: 'flat', rate: 250, recurrence: 'one-time', cookieDays: 45, color: '#e0752d', desc: '$250 flat bounty per converted customer. Simple, predictable, easy to pitch.' },
];

export const RECURRENCE_META = {
  'one-time': { label: 'One-time', tone: 'default' },
  'recurring': { label: 'Recurring', tone: 'accent' },
};

// Partner lifecycle. pending = applied, not yet approved to earn.
export const STATUS_META = {
  active: { label: 'Active', tone: 'ok' },
  pending: { label: 'Pending', tone: 'warn' },
  paused: { label: 'Paused', tone: 'default' },
};

// Payout queue lifecycle. Money never moves here; this is the approval trail.
export const PAYOUT_STATUSES = ['pending', 'approved', 'paid'];
export const PAYOUT_META = {
  pending: { label: 'Pending', tone: 'warn' },
  approved: { label: 'Approved', tone: 'info' },
  paid: { label: 'Paid', tone: 'ok' },
};

export const PAYOUT_METHODS = ['ACH', 'PayPal', 'Wise', 'Stripe'];

/* ---------- hoisted helpers (safe to call during module-eval seeding) ---------- */
// These are function declarations (not const arrows) on purpose: buildSeed()
// runs at module load and calls them, so they must be hoisted (rule: no TDZ).
export function planById(id) {
  return DEFAULT_PLANS.find(p => p.id === id) || null;
}
export function commissionRateLabel(plan) {
  if (!plan) return '-';
  return plan.type === 'flat' ? `$${plan.rate}` : `${plan.rate}%`;
}
// Attributed commission a partner has earned on a given attributed revenue.
export function commissionForRevenue(plan, revenue, sales) {
  if (!plan) return 0;
  if (plan.type === 'flat') return Math.round((sales || 0) * plan.rate);
  return Math.round((revenue || 0) * (plan.rate / 100));
}
export function referralLink(aff) {
  return REFERRAL_BASE + (aff?.code || '');
}
function codeFromName(name, salt) {
  const base = String(name || 'partner').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'partner';
  return `${base}-${salt.toString(36).padStart(3, '0')}`;
}

/* ============================================================
   SEED
   ============================================================ */
const PARTNER_NAMES = [
  ['Maya Chen', 'Loop Digital'],
  ['Andre Okafor', 'Okafor Consulting'],
  ['Priya Raman', 'Northlight Agency'],
  ['Devon Marsh', 'Marsh Growth Co'],
  ['Sofia Bianchi', 'Bianchi Media'],
  ['Tyler Brooks', 'Brooks Automations'],
  ['Grace Nakamura', 'Kaizen Partners'],
  ['Hassan Idris', 'Idris Ventures'],
  ['Olivia Trent', 'Trent Creative'],
  ['Nathan Cole', 'Coldstart Labs'],
  ['Renee Faulkner', 'Faulkner & Co'],
  ['Miguel Santos', 'Santos SEO'],
  ['Kayla Monroe', 'Monroe Outbound'],
  ['Benjamin Frost', 'Frostline Media'],
];

function buildSeed() {
  const rnd = mulberry32(20260712);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const daysAgoIso = (d) => new Date(now - d * DAY).toISOString();

  // Weight partner quality: a couple of superstars, a healthy middle, a long tail.
  const planWeights = ['pl_elite', 'pl_growth', 'pl_growth', 'pl_growth', 'pl_starter', 'pl_starter', 'pl_starter', 'pl_founding'];

  const affiliates = PARTNER_NAMES.map(([name, company], i) => {
    const planId = i === 0 ? 'pl_elite' : i === 1 ? 'pl_growth' : pick(planWeights);
    const plan = planById(planId);
    const status = i < 10 ? 'active' : i < 12 ? 'paused' : 'pending';

    // Funnel: clicks -> signups -> paying sales. Superstars sit at the top.
    const tierBoost = planId === 'pl_elite' ? 2.4 : planId === 'pl_growth' ? 1.4 : 1;
    const clicks = status === 'pending' ? range(4, 40) : Math.round(range(120, 900) * tierBoost);
    const signups = Math.max(0, Math.round(clicks * (0.06 + rnd() * 0.05)));
    const sales = status === 'pending' ? 0 : Math.max(0, Math.round(signups * (0.28 + rnd() * 0.22)));
    const revenue = sales * range(3, 14) * 1000;   // avg 3k..14k per converted account
    const lifetime = commissionForRevenue(plan, revenue, sales);
    // Split lifetime commission into already-paid vs currently owed.
    const paid = Math.round(lifetime * (0.55 + rnd() * 0.3));
    const owed = Math.max(0, lifetime - paid);

    // 12-week click trend for the row sparkline (deterministic, gently rising).
    const spark = [];
    let base = Math.max(2, Math.round(clicks / 16));
    for (let w = 0; w < 12; w++) { base = Math.max(1, Math.round(base * (0.9 + rnd() * 0.35))); spark.push(base); }

    return {
      id: `af_${i + 1}`,
      name, company,
      email: `${name.toLowerCase().split(' ')[0]}@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      planId,
      code: codeFromName(name, 1001 + i),
      status,
      clicks, signups, sales, revenue,
      owed, paid,
      method: pick(PAYOUT_METHODS),
      spark,
      joinedAt: daysAgoIso(range(20, 360)),
      lastClickAt: status === 'pending' ? daysAgoIso(range(1, 8)) : daysAgoIso(range(0, 6)),
    };
  });

  // Guarantee a marquee partner pinned at the top with rich numbers.
  const heroPlan = planById('pl_elite');
  const heroSpark = [22, 28, 26, 34, 40, 44, 52, 58, 61, 70, 84, 96];
  const heroRevenue = 318000;
  const heroSales = 22;
  const heroLifetime = commissionForRevenue(heroPlan, heroRevenue, heroSales);
  affiliates.unshift({
    id: 'af_hero',
    name: 'Jordan Vale', company: 'Vale Revenue Studio',
    email: 'jordan@valerevenue.com',
    planId: 'pl_elite',
    code: 'valestudio-vip',
    status: 'active',
    clicks: 2140, signups: 168, sales: heroSales, revenue: heroRevenue,
    owed: Math.round(heroLifetime * 0.34),
    paid: heroLifetime - Math.round(heroLifetime * 0.34),
    method: 'ACH',
    spark: heroSpark,
    flagship: true,
    joinedAt: daysAgoIso(210),
    lastClickAt: daysAgoIso(0),
  });

  /* --- payouts --- one per partner with an owed or recently-settled balance --- */
  const payouts = [];
  let pi = 0;
  const periodOf = (d) => {
    const dt = new Date(now - d * DAY);
    return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  for (const a of affiliates) {
    if (a.owed > 0) {
      pi++;
      payouts.push({
        id: `po_${pi}`,
        affiliateId: a.id,
        amount: a.owed,
        status: rnd() < 0.4 ? 'approved' : 'pending',
        method: a.method,
        period: periodOf(range(1, 20)),
        createdAt: daysAgoIso(range(1, 18)),
        paidAt: null,
      });
    }
    // a settled historical payout so the "paid" column is not empty
    if (a.paid > 0 && rnd() < 0.7) {
      pi++;
      const amt = Math.round(a.paid * (0.4 + rnd() * 0.4));
      payouts.push({
        id: `po_${pi}`,
        affiliateId: a.id,
        amount: amt,
        status: 'paid',
        method: a.method,
        period: periodOf(range(30, 75)),
        createdAt: daysAgoIso(range(30, 70)),
        paidAt: daysAgoIso(range(28, 62)),
      });
    }
  }
  payouts.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));

  // 12-month attributed revenue trend for the dashboard hero spark.
  const trend = [];
  let tv = 14000;
  for (let m = 0; m < 12; m++) { tv = Math.round(tv * (1.02 + rnd() * 0.16)); trend.push(tv); }

  // The program identity shown in the partner portal + copy.
  const program = {
    name: 'Ardovo Partner Program',
    tagline: 'Turn your audience into recurring revenue.',
    defaultPlanId: 'pl_starter',
    autoApprove: false,
  };

  return { seededAt: new Date(now).toISOString(), affiliates, payouts, program, trend };
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
export function resetAffiliates() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getAffiliateState() { return state; }

export function useAffiliates(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getAffiliates = () => state.affiliates;
export const getAffiliate = (id) => state.affiliates.find(a => a.id === id) || null;
export const getPlans = () => DEFAULT_PLANS;
export const getPayouts = () => state.payouts;
export const getProgram = () => state.program;
export const affiliateName = (id) => getAffiliate(id)?.name || 'Partner';

// Live closed-won deals, surfaced as attribution proof that a partner program
// rides real revenue. Reads store.js so the demo stays anchored to the CRM.
export function attributedDealSamples(limit = 6) {
  try {
    return getDeals()
      .filter(d => d.status === 'won')
      .slice(0, limit)
      .map(d => ({ id: d.id, name: d.name, company: getCompany(d.companyId)?.name || '', value: d.value }));
  } catch { return []; }
}

/* ---------- roll-ups (all pure over state) ---------- */
export function affiliateStats() {
  const affs = state.affiliates;
  const active = affs.filter(a => a.status === 'active');
  const clicks = affs.reduce((s, a) => s + a.clicks, 0);
  const signups = affs.reduce((s, a) => s + a.signups, 0);
  const sales = affs.reduce((s, a) => s + a.sales, 0);
  const revenue = affs.reduce((s, a) => s + a.revenue, 0);
  const owed = affs.reduce((s, a) => s + a.owed, 0);
  const paid = affs.reduce((s, a) => s + a.paid, 0);
  const leaderboard = [...affs].filter(a => a.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return {
    count: affs.length,
    activeCount: active.length,
    pendingCount: affs.filter(a => a.status === 'pending').length,
    clicks, signups, sales, revenue, owed, paid,
    lifetime: owed + paid,
    clickToSignup: clicks ? signups / clicks : 0,
    signupToSale: signups ? sales / signups : 0,
    programRoi: (owed + paid) ? revenue / (owed + paid) : 0,
    trend: state.trend || [],
    leaderboard,
  };
}

export function payoutStats() {
  const p = state.payouts;
  const sumOf = (st) => p.filter(x => x.status === st).reduce((s, x) => s + x.amount, 0);
  return {
    total: p.length,
    pendingCount: p.filter(x => x.status === 'pending').length,
    approvedCount: p.filter(x => x.status === 'approved').length,
    paidCount: p.filter(x => x.status === 'paid').length,
    pendingAmt: sumOf('pending'),
    approvedAmt: sumOf('approved'),
    paidAmt: sumOf('paid'),
  };
}

// Partner-portal projection: exactly what a single affiliate sees when they
// log into their own dashboard. Never exposes other partners' numbers.
export function portalView(id) {
  const a = getAffiliate(id);
  if (!a) return null;
  const plan = planById(a.planId);
  const rank = [...state.affiliates]
    .filter(x => x.revenue > 0)
    .sort((x, y) => y.revenue - x.revenue)
    .findIndex(x => x.id === id);
  const myPayouts = state.payouts.filter(p => p.affiliateId === id);
  return {
    affiliate: a,
    plan,
    link: referralLink(a),
    rank: rank >= 0 ? rank + 1 : null,
    conv: a.clicks ? a.signups / a.clicks : 0,
    nextPayout: a.owed,
    payouts: myPayouts,
  };
}

// True when a real payout provider is configured. In the browser bundle the
// key is absent, so payouts stay local status changes - never move money.
export function hasPayoutEnv() {
  try { return !!(import.meta && import.meta.env && import.meta.env.VITE_PAYOUT_PROVIDER); } catch { return false; }
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */

// SUPABASE: from('rally_affiliates').insert(row).select().single()
export function createAffiliate({ name, company, email, planId, status = 'active' } = {}) {
  if (!name || !name.trim()) return { error: 'name', message: 'Partner name is required.' };
  const plan = planById(planId) || planById(state.program.defaultPlanId) || DEFAULT_PLANS[0];
  const aff = {
    id: newId('af'),
    name: name.trim(),
    company: (company || '').trim(),
    email: (email || '').trim() || `${name.trim().toLowerCase().split(' ')[0]}@partner.com`,
    planId: plan.id,
    code: codeFromName(company || name, 4000 + state.affiliates.length),
    status: STATUS_META[status] ? status : 'active',
    clicks: 0, signups: 0, sales: 0, revenue: 0, owed: 0, paid: 0,
    method: 'ACH',
    spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    joinedAt: new Date().toISOString(),
    lastClickAt: new Date().toISOString(),
  };
  commit({ ...state, affiliates: [aff, ...state.affiliates] });
  return { affiliate: aff };
}

export function setAffiliateStatus(id, status) {
  const a = getAffiliate(id);
  if (!a) return { error: 'missing', message: 'Partner not found.' };
  if (!STATUS_META[status]) return { error: 'status', message: 'Unknown status.' };
  const next = { ...a, status };
  commit({ ...state, affiliates: state.affiliates.map(x => x.id === id ? next : x) });
  return { affiliate: next };
}

export function setAffiliatePlan(id, planId) {
  const a = getAffiliate(id);
  if (!a) return { error: 'missing', message: 'Partner not found.' };
  if (!planById(planId)) return { error: 'plan', message: 'Unknown plan.' };
  const next = { ...a, planId };
  commit({ ...state, affiliates: state.affiliates.map(x => x.id === id ? next : x) });
  return { affiliate: next };
}

// Queue a payout for a partner's current owed balance. Zeroes owed and books
// it into the queue as 'pending'. NO money moves - this is the approval trail.
// SUPABASE/API: POST /api/affiliate-payout (settles via provider when env set).
export function queuePayout(affiliateId) {
  const a = getAffiliate(affiliateId);
  if (!a) return { error: 'missing', message: 'Partner not found.' };
  if (a.owed <= 0) return { error: 'amount', message: 'Nothing owed to this partner yet.' };
  const po = {
    id: newId('po'),
    affiliateId,
    amount: a.owed,
    status: 'pending',
    method: a.method || 'ACH',
    period: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  const nextAff = { ...a, owed: 0 };
  commit({
    ...state,
    affiliates: state.affiliates.map(x => x.id === affiliateId ? nextAff : x),
    payouts: [po, ...state.payouts],
  });
  return { payout: po };
}

// Advance one payout down the approval queue: pending -> approved -> paid.
// When a payout reaches 'paid' the amount is realized into the partner's
// lifetime paid total. Still no real transfer - env-gated in production.
export function advancePayout(id) {
  const p = state.payouts.find(x => x.id === id);
  if (!p) return { error: 'missing', message: 'Payout not found.' };
  const i = PAYOUT_STATUSES.indexOf(p.status);
  if (i < 0 || i >= PAYOUT_STATUSES.length - 1) return { payout: p };
  const status = PAYOUT_STATUSES[i + 1];
  const settled = status === 'paid';
  const next = { ...p, status, paidAt: settled ? new Date().toISOString() : p.paidAt };
  let affiliates = state.affiliates;
  if (settled) {
    affiliates = affiliates.map(a => a.id === p.affiliateId ? { ...a, paid: a.paid + p.amount } : a);
  }
  commit({ ...state, affiliates, payouts: state.payouts.map(x => x.id === id ? next : x) });
  return { payout: next, settled };
}

// Bulk-approve every pending payout (queue triage affordance).
export function approveAllPending() {
  const pend = state.payouts.filter(p => p.status === 'pending');
  if (!pend.length) return { count: 0 };
  commit({ ...state, payouts: state.payouts.map(p => p.status === 'pending' ? { ...p, status: 'approved' } : p) });
  return { count: pend.length };
}
