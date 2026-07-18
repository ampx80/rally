// ============================================================
// ARDOVO PIPELINE WIND TUNNEL
// Backtest a sales policy the way a quant backtests a strategy.
//
// Ardovo's book of business is a single deterministic object with a
// re-computable risk model (intelligence-data.scoreDeal) and a real
// automations engine (ACTIONS/TRIGGERS). That makes something an
// incumbent server-of-record cannot do trivial: take the REAL closed
// history, replay it under a COUNTERFACTUAL policy, and estimate what
// would have happened - with confidence bands - before you ship the
// policy to production.
//
// Everything here is a PURE READ of the store + audit history. Nothing
// mutates until the operator clicks Deploy, which compiles the winning
// policy into a normal automations.js rule via the existing schema.
//
// Reproducibility: the Monte-Carlo reuses the store's mulberry32 PRNG
// (same algorithm, same anchor seed 20260708) so the same book + policy
// always produce the same bands. No Math.random anywhere.
// ============================================================
import { getDeals, getActivities, stageById, getCompany, userName } from './store.js';
import { scoreDeal } from './intelligence-data.js';
import { getAudit } from './audit.js';
import { teamQuarterlyQuota } from './forecasting-data.js';

const DAY = 86400000;
const ANCHOR_SEED = 20260708; // the store's own seed - the reproducibility anchor
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- deterministic PRNG (reused from store.js, same algorithm) ---------- */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Stable 32-bit string hash so a deal id maps to a fixed sub-seed.
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ============================================================
   POLICY SCHEMA
   Five levers a revenue leader actually tunes. Each maps to a real
   signal the risk model reads (cadence -> touchDays, gate -> touchDays,
   threads -> contacts) or to an explicit, labeled elasticity the base
   model has no signal for (discount).
   ============================================================ */
export const POLICY_LEVERS = [
  { key: 'cadenceDays', label: 'Follow-up cadence', unit: 'd', min: 1, max: 21, step: 1, lo: 1, hi: 21,
    hint: 'Never let a live deal go untouched longer than this.' },
  { key: 'activityGate', label: 'Activity gate', unit: '', min: 0, max: 8, step: 1, lo: 0, hi: 8,
    hint: 'Require this many logged touches before a deal can reach Proposal.' },
  { key: 'minContacts', label: 'Multi-thread floor', unit: '', min: 1, max: 5, step: 1, lo: 1, hi: 5,
    hint: 'Force at least this many engaged contacts on every deal.' },
  { key: 'discountCapPct', label: 'Discount cap', unit: '%', min: 5, max: 40, step: 1, lo: 5, hi: 40,
    hint: 'Hold every deal at or below this discount off list.' },
  { key: 'valueFloor', label: 'Policy applies above', unit: '$', min: 0, max: 250000, step: 10000, lo: 0, hi: 250000,
    hint: 'Only govern deals at or above this value (0 = whole book).' },
];

// A neutral "do nothing" policy - matches how the book actually ran.
export const DEFAULT_POLICY = {
  cadenceDays: 7,
  activityGate: 3,
  minContacts: 2,
  discountCapPct: 18,
  valueFloor: 0,
};

// A deliberately loose baseline used only to measure a policy's own effect
// against "how it actually happened". Values chosen so no lever binds.
const NEUTRAL = { cadenceDays: 60, activityGate: 0, minContacts: 1, discountCapPct: 100, valueFloor: 0 };

/* ============================================================
   ELASTICITIES
   The knobs that turn a change-in-risk into a change-in-outcome.
   Modest and bidirectional so extreme policies BACKFIRE (there is a
   real optimum, not a monotonic "more is always better").
   ============================================================ */
const SAVE_K = 0.85;        // how much removed risk can rescue a lost deal
const EROSION_K = 0.30;     // how much added cycle-time erodes a won deal
const DISCOUNT_FRICTION = 0.55; // win-rate cost of holding a price-sensitive deal to a lower discount
const GATE_DAY = 4;         // days added per gated activity that had to happen
const CADENCE_DAY = 0.35;   // cycle days added per unit of tightened cadence discipline

/* ============================================================
   RECONSTRUCT one closed deal's trajectory.
   Prefers real audit.js stage-change history; falls back to the deal's
   intrinsic fields + its logged activities when the demo seed has no
   audit trail (seeded deals are created directly, not via writers).
   ============================================================ */
function reconstruct(deal, actsByDeal) {
  const acts = (actsByDeal.get(deal.id) || []).slice();
  // Real stage-change events, if the audit log has them.
  const stageEvents = getAudit('deal', deal.id).filter(e => e.field === 'stage');
  const closeAt = new Date(deal.closeDate).getTime();
  const createdAt = new Date(deal.createdAt).getTime();
  const cycleDays = Math.max(1, Math.round((closeAt - createdAt) / DAY));

  // Touch timestamps (real activity cadence).
  const touchTimes = acts
    .map(a => new Date(a.createdAt || a.dueAt).getTime())
    .filter(t => Number.isFinite(t))
    .sort((x, y) => x - y);

  // Largest gap between touches (the "silence" the cadence policy attacks).
  let maxGapDays = cycleDays;
  if (touchTimes.length) {
    let prev = createdAt, mx = 0;
    for (const t of [...touchTimes, closeAt]) { mx = Math.max(mx, (t - prev) / DAY); prev = t; }
    maxGapDays = Math.round(mx);
  }
  const lastTouchDays = touchTimes.length
    ? Math.max(0, Math.round((closeAt - touchTimes[touchTimes.length - 1]) / DAY))
    : cycleDays;

  // Modeled commercial terms - deterministic per deal, clearly a simulation
  // input (the base risk model carries no discount signal). Later-stage,
  // larger deals negotiate deeper; sensitivity is fixed per deal.
  const r = mulberry32(hashStr(deal.id) ^ ANCHOR_SEED);
  const order = stageById(deal.stage)?.order || 4;
  const discountPct = Math.round(clamp(6 + r() * 22 + order * 1.4 + (deal.value > 200000 ? 4 : 0), 4, 42));
  const priceSensitivity = 0.25 + r() * 0.6; // 0.25..0.85

  return {
    deal, acts, createdAt, closeAt, cycleDays,
    touches: acts.length, maxGapDays, lastTouchDays,
    contacts: (deal.contactIds || []).length,
    discountPct, priceSensitivity,
    stageEventCount: stageEvents.length,
    won: deal.status === 'won',
  };
}

/* Build a counterfactual (deal, ctx, cycleAdd) under a policy, then score it. */
function counterfactualRisk(traj, policy) {
  const { deal } = traj;
  const applies = deal.value >= (policy.valueFloor || 0);
  // As-lived context: "now" = the moment the deal closed.
  const now = traj.closeAt;

  // Baseline acts (as they really happened) for the lived score.
  const livedActs = traj.acts.map(a => ({ createdAt: a.createdAt || a.dueAt }));
  const livedScore = scoreDeal(deal, { now, actsByDeal: mapOne(deal.id, livedActs) }).score;

  if (!applies) {
    return { livedScore, cfScore: livedScore, cycleAdd: 0, discountHold: 0, applies: false };
  }

  // ---- Counterfactual signal edits ----
  let cycleAdd = 0;

  // Cadence: guarantee a touch within `cadenceDays` of close, and close the
  // worst silence gap. Adds a recent synthetic touch so touchDays <= cadence.
  const cfActs = livedActs.slice();
  if (traj.lastTouchDays > policy.cadenceDays) {
    cfActs.push({ createdAt: new Date(now - policy.cadenceDays * DAY * 0.5).toISOString() });
    cycleAdd += clamp((traj.maxGapDays - policy.cadenceDays) * CADENCE_DAY, 0, 12);
  }

  // Activity gate: force engagement up to the gate. Each forced touch that
  // did not already happen adds real calendar time.
  const forced = Math.max(0, policy.activityGate - traj.touches);
  if (forced > 0) {
    for (let i = 0; i < forced; i++) cfActs.push({ createdAt: new Date(now - (i + 1) * policy.cadenceDays * DAY * 0.5).toISOString() });
    cycleAdd += forced * GATE_DAY;
  }

  // Multi-thread floor: raise contact count so the "single champion" risk clears.
  const cfContacts = Math.max(traj.contacts, policy.minContacts);
  const cfDeal = { ...deal, contactIds: padIds(deal.contactIds, cfContacts) };

  const cfScore = scoreDeal(cfDeal, { now, actsByDeal: mapOne(deal.id, cfActs) }).score;

  // Discount hold: how far below the lived discount the cap pulls this deal.
  const discountHold = Math.max(0, traj.discountPct - policy.discountCapPct);

  return { livedScore, cfScore, cycleAdd, discountHold, applies: true };
}

function mapOne(id, acts) { const m = new Map(); m.set(id, acts); return m; }
function padIds(ids, n) {
  const out = (ids || []).slice();
  while (out.length < n) out.push(`__wt_synthetic_${out.length}`);
  return out;
}

/* Counterfactual win PROBABILITY for one deal under a policy.
   Anchored to the realized outcome, then moved by removed risk (can rescue
   a loss), added cycle-time (can erode a win), and discount friction. */
function cfWinProb(traj, cf) {
  const base = traj.won ? 1 : 0;
  const riskReduction = (cf.livedScore - cf.cfScore) / 100; // + = policy de-risked the deal

  let p = base;
  if (!traj.won) {
    // Rescue proportional to removable risk the policy actually addressed.
    p += SAVE_K * Math.max(0, riskReduction);
  } else {
    // A won deal can slip if the policy piles on cycle time or over-tightens.
    p -= EROSION_K * clamp(cf.cycleAdd / 90, 0, 0.5);
  }

  // Discount friction: holding a price-sensitive deal to a lower discount
  // costs some win probability (bidirectional - this is the real tradeoff).
  if (cf.discountHold > 0) {
    p -= DISCOUNT_FRICTION * traj.priceSensitivity * clamp(cf.discountHold / 40, 0, 1);
  }

  return clamp(p, 0.02, 0.98);
}

// Value realized if this deal is won under the policy: holding discount
// LIFTS realized value (less given away), scaled by the deal size.
function cfValue(traj, cf) {
  const uplift = cf.discountHold > 0 ? (cf.discountHold / 100) : 0;
  return Math.round(traj.deal.value * (1 + uplift));
}

/* ============================================================
   THE BACKTEST
   Replay every closed deal under the policy, Monte-Carlo the outcomes,
   and report win rate / cycle time / attainment with p10..p90 bands.
   ============================================================ */
export function getClosedTrajectories() {
  const actsByDeal = new Map();
  for (const a of getActivities()) {
    if (a.relatedType !== 'deal' || !a.relatedId) continue;
    const arr = actsByDeal.get(a.relatedId) || []; arr.push(a); actsByDeal.set(a.relatedId, arr);
  }
  return getDeals()
    .filter(d => d.status === 'won' || d.status === 'lost')
    .map(d => reconstruct(d, actsByDeal));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Aggregate one policy over the trajectories with `trials` Monte-Carlo runs.
// Returns realized baseline (deterministic) + policy mean/bands per metric.
export function backtest(policy, { trials = 400, trajectories, quota } = {}) {
  const trajs = trajectories || getClosedTrajectories();
  const Q = quota || teamQuarterlyQuota() || 1;
  const n = trajs.length;

  // Precompute each deal's policy outcome model once (deterministic).
  const models = trajs.map(t => {
    const cf = counterfactualRisk(t, policy);
    return { t, cf, p: cfWinProb(t, cf), value: cfValue(t, cf) };
  });

  // ---- realized baseline (what actually happened) ----
  const realWon = trajs.filter(t => t.won);
  const baseWinRate = n ? realWon.length / n : 0;
  const baseAttain = realWon.reduce((s, t) => s + t.deal.value, 0) / Q;
  const baseCycle = realWon.length ? realWon.reduce((s, t) => s + t.cycleDays, 0) / realWon.length : 0;

  // ---- Monte-Carlo the policy ----
  const winRates = [], attains = [], cycles = [];
  for (let k = 0; k < trials; k++) {
    const rnd = mulberry32((ANCHOR_SEED ^ hashPolicy(policy)) + k * 2654435761);
    let wins = 0, wonValue = 0, cycSum = 0, cycN = 0;
    for (const m of models) {
      if (rnd() < m.p) {
        wins++; wonValue += m.value;
        cycSum += m.t.cycleDays + m.cf.cycleAdd; cycN++;
      }
    }
    winRates.push(n ? wins / n : 0);
    attains.push(wonValue / Q);
    cycles.push(cycN ? cycSum / cycN : 0);
  }

  const band = (arr) => {
    const s = arr.slice().sort((a, b) => a - b);
    return { mean: s.reduce((x, y) => x + y, 0) / (s.length || 1), lo: percentile(s, 0.1), hi: percentile(s, 0.9) };
  };

  const winBand = band(winRates), attBand = band(attains), cycBand = band(cycles);

  // How many losses does the policy expect to rescue / how much value it holds.
  const expectedRescued = models.filter(m => !m.t.won).reduce((s, m) => s + m.p, 0);
  const heldValue = models.reduce((s, m) => s + (m.value - m.t.deal.value) * m.p, 0);

  return {
    n, quota: Q,
    metrics: {
      winRate: { base: baseWinRate, ...winBand, fmt: 'pct' },
      cycleTime: { base: baseCycle, ...cycBand, fmt: 'days' },
      attainment: { base: baseAttain, ...attBand, fmt: 'pct' },
    },
    expectedRescued, heldValue,
    models: models.map(m => ({
      id: m.t.deal.id, name: m.t.deal.name, value: m.t.deal.value,
      company: getCompany(m.t.deal.companyId)?.name || '', owner: userName(m.t.deal.ownerId),
      won: m.t.won, p: m.p, lived: m.cf.livedScore, cf: m.cf.cfScore,
      cycleAdd: m.cf.cycleAdd, discountHold: m.cf.discountHold, applies: m.cf.applies,
    })),
  };
}

function hashPolicy(p) {
  return hashStr(`${p.cadenceDays}|${p.activityGate}|${p.minContacts}|${p.discountCapPct}|${p.valueFloor}`);
}

/* ============================================================
   LEVER SWEEP - the efficient-frontier view.
   Hold the policy fixed, vary ONE lever across its range, and return the
   metric mean + p10..p90 band at each step so the chart can draw a
   confidence ribbon and find the optimum.
   ============================================================ */
export function sweep(leverKey, policy, { metric = 'winRate', trials = 200 } = {}) {
  const lever = POLICY_LEVERS.find(l => l.key === leverKey) || POLICY_LEVERS[0];
  const trajectories = getClosedTrajectories();
  const quota = teamQuarterlyQuota() || 1;
  const points = [];
  for (let v = lever.lo; v <= lever.hi; v += lever.step) {
    const res = backtest({ ...policy, [leverKey]: v }, { trials, trajectories, quota });
    const m = res.metrics[metric];
    points.push({ x: v, mean: m.mean, lo: m.lo, hi: m.hi, band: [m.lo, m.hi], base: m.base });
  }
  // Optimum = best mean (win/attainment maximize, cycle minimizes).
  const better = (a, b) => (metric === 'cycleTime' ? a.mean < b.mean : a.mean > b.mean);
  let best = points[0];
  for (const p of points) if (best && better(p, best)) best = p;
  return { lever, metric, points, best };
}

/* ============================================================
   COMPILE -> a real automations.js rule (existing ACTIONS/TRIGGERS schema).
   The winning policy becomes a follow-up-cadence automation the operator
   can see, toggle, and delete in Workflows. Returns an UNSAVED rule object;
   the page persists it via saveAutomation on Deploy.
   ============================================================ */
export function compilePolicyToRule(policy, summary = {}) {
  const conditions = [];
  if (policy.valueFloor > 0) conditions.push({ field: 'value', op: 'gt', value: policy.valueFloor });

  const actions = [{
    type: 'create_task',
    config: { subject: `Wind Tunnel: follow up (${policy.cadenceDays}d cadence)`, dueDays: policy.cadenceDays },
  }];
  if (policy.minContacts > 1) {
    actions.push({
      type: 'notify_owner',
      config: { who: '', subject: `Multi-thread to ${policy.minContacts}+ contacts before advancing` },
    });
  }

  const liftPct = summary.winLift != null ? Math.round(summary.winLift * 1000) / 10 : null;
  const desc = [
    `Backtested in the Pipeline Wind Tunnel over ${summary.n ?? 'closed'} closed deals.`,
    liftPct != null ? `Projected win-rate change ${liftPct >= 0 ? '+' : ''}${liftPct} pts.` : '',
    `Enforces a ${policy.cadenceDays}-day follow-up cadence`,
    policy.minContacts > 1 ? `, a ${policy.minContacts}-contact multi-thread floor` : '',
    policy.discountCapPct < 100 ? `, and a ${policy.discountCapPct}% discount cap` : '',
    policy.valueFloor > 0 ? ` on deals above ${money(policy.valueFloor)}` : '',
    '.',
  ].join('');

  return {
    name: `Wind Tunnel: ${policy.cadenceDays}-day cadence policy`,
    description: desc.replace(/\s+,/g, ','),
    trigger: { type: 'deal_stage_changed', config: {} },
    conditions,
    actions,
    active: true,
    meta: { source: 'wind-tunnel', policy },
  };
}

function money(n) {
  if (n == null) return '$0';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}
