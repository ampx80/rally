// ============================================================
// RALLY CUSTOMER SUCCESS  (post-sale health engine)
// Derives a believable book-of-business health model from the
// existing CRM signals in store.js. Nothing here mutates the
// store except runPlaybook(), which logs a real activity so the
// action feels alive. Every account score is deterministic:
// a per-account PRNG seeded off the account id means the same
// book renders identically across reloads, yet each mutation to
// the underlying store (new deal, new activity) re-derives live.
//
// SUPABASE: a live build would read rally_health_scores +
// rally_renewals + rally_success_plays; here we synthesize them
// from rally_companies / rally_deals / rally_contacts /
// rally_activities so the demo needs no extra tables.
// ============================================================
import {
  getCompanies, getDeals, getContacts, getActivities,
  getCompany, userName, createActivity,
} from './store.js';

const DAY = 86400000;

/* ---------- deterministic per-account PRNG ---------- */
function hashStr(s = '') {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ---------- health bands ---------- */
export const BANDS = {
  healthy: { key: 'healthy', label: 'Healthy', tone: 'ok', color: 'var(--ok)', min: 72 },
  watch: { key: 'watch', label: 'Watch', tone: 'warn', color: 'var(--warn)', min: 45 },
  risk: { key: 'risk', label: 'At risk', tone: 'risk', color: 'var(--risk)', min: 0 },
};
export function bandFor(score) {
  if (score >= BANDS.healthy.min) return BANDS.healthy;
  if (score >= BANDS.watch.min) return BANDS.watch;
  return BANDS.risk;
}

/* ---------- playbook catalog ---------- */
// SUPABASE: rally_success_plays (config). Steps drive the runner UI.
export const PLAYBOOKS = [
  {
    id: 'save',
    name: 'Save Play',
    forBand: 'risk',
    blurb: 'Structured recovery for an account trending toward churn.',
    steps: [
      'Executive sponsor call booked within 48 hours',
      'Root-cause review of usage and support signals',
      'Joint success plan with 30-60-90 milestones',
      'Weekly check-ins until health clears Watch',
    ],
  },
  {
    id: 'reengage',
    name: 'Re-engage Play',
    forBand: 'watch',
    blurb: 'Re-light a quiet account before the renewal window opens.',
    steps: [
      'Send tailored value recap tied to their goals',
      'Book a product deep-dive with the day-to-day team',
      'Surface two unused features with quick wins',
      'Confirm renewal owner and timeline',
    ],
  },
  {
    id: 'qbr',
    name: 'QBR Play',
    forBand: 'any',
    blurb: 'Quarterly business review to prove value and set the next quarter.',
    steps: [
      'Pull ROI and adoption metrics for the period',
      'Align on outcomes achieved vs goals set',
      'Agree next-quarter success metrics',
      'Tee up expansion or multi-year conversation',
    ],
  },
  {
    id: 'expand',
    name: 'Expansion Play',
    forBand: 'healthy',
    blurb: 'Convert a thriving account into growth and multi-year commitment.',
    steps: [
      'Map new teams and use cases from usage data',
      'Build the expansion business case with the champion',
      'Loop in the AE for commercial framing',
      'Propose seat or module expansion at renewal',
    ],
  },
];
export const playbookById = (id) => PLAYBOOKS.find(p => p.id === id);

/* ---------- reason + signal copy pools ---------- */
function churnReasons(a) {
  const out = [];
  if (a.usageTrend <= -12) out.push(`Usage down ${Math.abs(a.usageTrend)}% quarter over quarter`);
  if (a.engagementDays >= 35) out.push(`No exec engagement in ${a.engagementDays} days`);
  if (a.supportTickets >= 3) out.push(`${a.supportTickets} open support escalations`);
  if (a.sentiment <= 45) out.push('Sentiment trending negative in recent notes');
  if (a.championLeft) out.push('Champion left the account');
  if (a.daysToRenewal >= 0 && a.daysToRenewal <= 45 && !a.qbrBooked) out.push(`Renewal in ${a.daysToRenewal} days, no QBR booked`);
  if (a.adoption <= 40) out.push(`Feature adoption at ${a.adoption}%`);
  if (!out.length) out.push('Health slipping below target band');
  return out.slice(0, 4);
}
function expansionSignals(a) {
  const out = [];
  if (a.seatUtilization >= 85) out.push(`Seat utilization at ${a.seatUtilization}%`);
  if (a.usageTrend >= 8) out.push(`Usage up ${a.usageTrend}% quarter over quarter`);
  if (a.newTeams >= 1) out.push(`${a.newTeams} new team${a.newTeams > 1 ? 's' : ''} onboarded`);
  if (a.hitCap) out.push('Hit plan usage cap this quarter');
  if (a.adoption >= 80) out.push(`Deep adoption at ${a.adoption}%`);
  if (!out.length) out.push('Consistent value realization');
  return out.slice(0, 4);
}

/* ---------- core: build one enriched account ---------- */
function buildAccount(co) {
  const rnd = mulberry32(hashStr(co.id));
  const r = () => rnd();
  const range = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  const deals = getDeals().filter(d => d.companyId === co.id);
  const wonArr = deals.filter(d => d.status === 'won').reduce((s, d) => s + d.value, 0);
  const openVal = deals.filter(d => d.status === 'open').reduce((s, d) => s + d.value, 0);
  // Contracted ARR: won business, else the marquee open deal, else a seeded floor.
  let arr = wonArr || (co.flagship ? Math.max(openVal, 420000) : 0);
  if (!arr) arr = range(8, 44) * 5000; // 40k .. 220k
  arr = Math.round(arr / 1000) * 1000;

  const contacts = getContacts().filter(c => c.companyId === co.id);
  const acts = getActivities().filter(x => x.companyId === co.id);
  const now = Date.now();
  const recentActs = acts.filter(x => now - new Date(x.createdAt).getTime() < 60 * DAY).length;
  const lastTouch = contacts.reduce((mx, c) => Math.max(mx, new Date(c.lastActivityAt || 0).getTime()), 0);
  const realEngagementDays = lastTouch ? Math.round((now - lastTouch) / DAY) : range(20, 70);

  // Signals (deterministic, believable, lightly grounded in real store data).
  const adoption = clamp(range(28, 96) + (recentActs > 3 ? 6 : 0), 5, 99);
  const usageTrend = range(-38, 30);
  const engagementDays = clamp(Math.round((realEngagementDays + range(0, 30)) / 2), 1, 80);
  const supportTickets = r() < 0.5 ? 0 : range(1, 6);
  const sentiment = clamp(range(24, 94) + (co.health === 'green' ? 8 : co.health === 'red' ? -12 : 0), 5, 99);
  const seatUtilization = clamp(range(38, 99), 5, 100);
  const championLeft = r() < 0.14;
  const newTeams = r() < 0.5 ? 0 : range(1, 3);
  const hitCap = r() < 0.28;
  const qbrBooked = r() < 0.5;

  // Health score: anchor on the company's coarse health, then let signals move it.
  const base = co.health === 'green' ? 76 : co.health === 'red' ? 32 : 54;
  const signalAdj =
    (adoption - 55) * 0.16 +
    usageTrend * 0.42 +
    (sentiment - 55) * 0.16 -
    supportTickets * 2.4 -
    Math.max(0, engagementDays - 28) * 0.34 -
    (championLeft ? 9 : 0);
  const jitter = (r() - 0.5) * 10;
  const score = Math.round(clamp(base + signalAdj + jitter, 5, 99));
  const band = bandFor(score);

  // Renewal date, seeded. Some already overdue for urgency in the queue.
  const renewalDays = range(-12, 330);
  const renewalDate = new Date(now + renewalDays * DAY).toISOString();
  const daysToRenewal = renewalDays;

  // Churn probability rises as health falls; support + usage sharpen it.
  const churnProb = clamp(
    (100 - score) / 155 + supportTickets * 0.018 + Math.max(0, -usageTrend) * 0.004 + (championLeft ? 0.08 : 0),
    0.02, 0.92,
  );

  // Expansion candidacy + upside.
  const isExpansion = band.key === 'healthy' && (adoption >= 70 || usageTrend >= 8 || seatUtilization >= 85);
  const expansionArr = isExpansion ? Math.round((arr * (0.1 + r() * 0.32)) / 1000) * 1000 : 0;
  // Small contraction risk on watch accounts (downsell pressure).
  const contractionArr = band.key === 'watch' && r() < 0.4 ? Math.round((arr * (0.05 + r() * 0.1)) / 1000) * 1000 : 0;
  const churnArr = band.key === 'risk' ? Math.round(arr * churnProb / 1000) * 1000 : 0;

  const a = {
    id: co.id,
    company: co,
    name: co.name,
    industry: co.industry,
    size: co.size,
    csmId: co.ownerId,
    csm: userName(co.ownerId),
    arr,
    score,
    band,
    // signals
    adoption, usageTrend, engagementDays, supportTickets, sentiment,
    seatUtilization, championLeft, newTeams, hitCap, qbrBooked,
    // renewal
    renewalDate, daysToRenewal,
    // risk + growth
    churnProb, churnArr, contractionArr,
    isExpansion, expansionArr,
    contactCount: contacts.length,
    lastTouchDays: engagementDays,
  };
  a.reasons = churnReasons(a);
  a.signals = expansionSignals(a);
  a.recommendedPlay = band.key === 'risk' ? 'save' : band.key === 'watch' ? 'reengage' : isExpansion ? 'expand' : 'qbr';
  return a;
}

/* ---------- who counts as a post-sale customer ---------- */
function isCustomer(co) {
  if (co.lifecycleStage === 'customer') return true;
  if (co.flagship) return true;
  return getDeals().some(d => d.companyId === co.id && d.status === 'won');
}

/* ---------- public API ---------- */
// The enriched book of business, sorted with the marquee account first,
// then by ARR. Pure over the store, so it re-derives on any mutation.
export function getCsAccounts() {
  const accts = getCompanies().filter(isCustomer).map(buildAccount);
  accts.sort((a, b) => {
    if (a.company.flagship) return -1;
    if (b.company.flagship) return 1;
    return b.arr - a.arr;
  });
  return accts;
}

export function getCsAccount(id) {
  const co = getCompany(id);
  if (!co || !isCustomer(co)) return null;
  return buildAccount(co);
}

// Portfolio headline: NRR / GRR, ARR, at-risk exposure, renewal load.
export function csSummary(accts = getCsAccounts()) {
  const startingArr = accts.reduce((s, a) => s + a.arr, 0);
  const expansion = accts.reduce((s, a) => s + a.expansionArr, 0);
  const contraction = accts.reduce((s, a) => s + a.contractionArr, 0);
  const churn = accts.reduce((s, a) => s + a.churnArr, 0);
  const endingArr = startingArr + expansion - contraction - churn;
  const nrr = startingArr ? Math.round(((startingArr + expansion - contraction - churn) / startingArr) * 100) : 0;
  const grr = startingArr ? Math.round(((startingArr - contraction - churn) / startingArr) * 100) : 0;
  const atRisk = accts.filter(a => a.band.key === 'risk');
  const watch = accts.filter(a => a.band.key === 'watch');
  const healthy = accts.filter(a => a.band.key === 'healthy');
  const expansionAccts = accts.filter(a => a.isExpansion);
  const avgHealth = accts.length ? Math.round(accts.reduce((s, a) => s + a.score, 0) / accts.length) : 0;
  const renewals90 = accts.filter(a => a.daysToRenewal >= 0 && a.daysToRenewal <= 90);
  const atRiskArr = atRisk.reduce((s, a) => s + a.arr, 0);
  return {
    startingArr, expansion, contraction, churn, endingArr,
    nrr, grr, avgHealth,
    count: accts.length,
    atRisk, watch, healthy, expansionAccts,
    atRiskCount: atRisk.length, watchCount: watch.length, healthyCount: healthy.length,
    expansionCount: expansionAccts.length, expansionArr: expansion,
    atRiskArr, renewals90, renewals90Count: renewals90.length,
    renewals90Arr: renewals90.reduce((s, a) => s + a.arr, 0),
  };
}

// Churn-risk queue: weighted exposure = ARR * churn probability. The order
// a CSM should work the book. Rook surfaces the same ranking.
export function churnQueue(accts = getCsAccounts()) {
  return accts
    .filter(a => a.band.key !== 'healthy')
    .map(a => ({ ...a, exposure: Math.round(a.arr * a.churnProb) }))
    .sort((a, b) => b.exposure - a.exposure);
}

// Renewal calendar buckets for the next ~4 months (plus an overdue bucket).
export function renewalBuckets(accts = getCsAccounts()) {
  const upcoming = accts
    .filter(a => a.daysToRenewal <= 150)
    .sort((a, b) => a.daysToRenewal - b.daysToRenewal);
  const buckets = new Map();
  const order = [];
  for (const a of upcoming) {
    const overdue = a.daysToRenewal < 0;
    const d = new Date(a.renewalDate);
    const key = overdue ? 'overdue' : `${d.getFullYear()}-${d.getMonth()}`;
    const label = overdue ? 'Overdue' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!buckets.has(key)) { buckets.set(key, { key, label, overdue, accts: [], arr: 0 }); order.push(key); }
    const b = buckets.get(key);
    b.accts.push(a);
    b.arr += a.arr;
  }
  return order.map(k => buckets.get(k));
}

// Expansion pipeline, highest upside first.
export function expansionQueue(accts = getCsAccounts()) {
  return accts.filter(a => a.isExpansion).sort((a, b) => b.expansionArr - a.expansionArr);
}

// Run a playbook against an account. Logs a real activity so the action
// persists and shows up on the account timeline. Returns the store result.
// SUPABASE: insert rally_play_runs + rally_activities in a transaction.
export function runPlaybook(accountId, playbookId) {
  const pb = playbookById(playbookId);
  const co = getCompany(accountId);
  if (!pb || !co) return { error: 'missing', message: 'Could not start playbook.' };
  const res = createActivity({
    type: 'task',
    subject: `${pb.name} kicked off for ${co.name}`,
    body: pb.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    dueAt: new Date(Date.now() + 2 * DAY).toISOString(),
    relatedType: 'company',
    relatedId: co.id,
    companyId: co.id,
  });
  return res.error ? res : { ok: true, activity: res.activity, playbook: pb };
}
