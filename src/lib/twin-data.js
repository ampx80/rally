// ============================================================
// ARDOVO - REVENUE DIGITAL TWIN  (twin-data.js)
// A self-contained Monte Carlo forecast engine + scenario store.
// Forecasting today is one lying number. The twin runs thousands of
// simulated quarter outcomes (each deal weighted by stage probability
// plus a deterministic pseudo-random draw) to produce a probability
// distribution of bookings (P10 / P50 / P90), not a point estimate.
//
// Local-first + deterministic: a fixed-seed mulberry32 builds a
// believable book of open pipeline, and every simulation re-seeds so
// the demo is byte-stable across reloads. No backend, no env, never
// throws on load. This module owns its OWN seeded deal set on purpose
// (it does not read store.js internals) so the twin is a pure sandbox.
// ASCII hyphen only. No em-dash or en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';

/* ---------- deterministic PRNG ---------- */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260712;          // fixed integer seed (stable demo)
const HORIZON_DAYS = 90;        // one quarter close window
const DEALS_PER_REP = 11;       // healthy in-flight capacity per rep
export const DEFAULT_ITERATIONS = 1600;
const LEVER_ITERATIONS = 520;

/* ---------- stage config (owned locally, not imported) ---------- */
export const TWIN_STAGES = [
  { id: 'qualified', name: 'Qualified', prob: 0.25, color: '#2563a8' },
  { id: 'discovery', name: 'Discovery', prob: 0.45, color: '#5b4bf5' },
  { id: 'proposal', name: 'Proposal', prob: 0.65, color: '#b3721a' },
  { id: 'negotiation', name: 'Negotiation', prob: 0.85, color: '#0ea5a3' },
];
const stageById = (id) => TWIN_STAGES.find(s => s.id === id) || TWIN_STAGES[0];

/* ---------- the revenue team (owns quota -> quarter plan) ---------- */
export const TWIN_REPS = [
  { id: 'r1', name: 'Jordan Avery', title: 'Senior AE', quotaYr: 2600000 },
  { id: 'r2', name: 'Nina Kapoor', title: 'Enterprise AE', quotaYr: 3400000 },
  { id: 'r3', name: 'Simone Diaz', title: 'Account Executive', quotaYr: 2500000 },
  { id: 'r4', name: 'Theo Bennett', title: 'Account Executive', quotaYr: 2400000 },
  { id: 'r5', name: 'Marcus Hale', title: 'Account Executive', quotaYr: 2800000 },
];
export const repById = (id) => TWIN_REPS.find(r => r.id === id);

/* Quarter plan = sum of rep quarterly quotas (annual / 4). This is the
   number the board expects. The twin measures the odds of clearing it. */
export const QUARTER_PLAN = Math.round(TWIN_REPS.reduce((s, r) => s + r.quotaYr, 0) / 4);

const CO_A = ['Vertex', 'Northwind', 'Meridian', 'Apex', 'Cobalt', 'Summit', 'Ironclad', 'Beacon', 'Cascade', 'Lumen', 'Arbor', 'Vantage', 'Keystone', 'Halcyon', 'Pinnacle', 'Sterling', 'Redwood', 'Fathom', 'Granite', 'Harbor', 'Juniper', 'Kestrel', 'Monarch', 'Solstice'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Freight', 'Retail', 'Energy', 'Partners', 'Dynamics', 'Analytics', 'Networks', 'Aerospace', 'Solutions'];
const KINDS = ['Platform rollout', 'Annual license', 'Enterprise expansion', 'Pilot to production', 'Renewal + upsell', 'New logo', 'Multi-year contract', 'Seat expansion', 'Migration project'];

/* ============================================================
   SEED - the book of open pipeline the twin simulates over.
   Built once, deterministically. Each deal carries the raw
   ingredients the engine needs: stage probability, value, and an
   expected days-to-close used for the cycle-time sensitivity.
   ============================================================ */
function buildDeals() {
  const rnd = mulberry32(SEED);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const usedCo = new Set();
  const deals = [];

  // Marquee deal, pinned first, keeps continuity with the rest of Ardovo.
  deals.push({
    id: 'td_flagship', company: 'Vertex Robotics', kind: 'Enterprise platform rollout',
    stage: 'negotiation', value: 420000, daysToClose: 21, repId: 'r1', flagship: true,
  });
  usedCo.add('Vertex Robotics');

  for (let i = 0; i < 43; i++) {
    let co, guard = 0;
    do { co = `${pick(CO_A)} ${pick(CO_B)}`; guard++; } while (usedCo.has(co) && guard < 24);
    usedCo.add(co);
    // weight toward mid-pipeline stages
    const r = rnd();
    const stage = r < 0.30 ? 'qualified' : r < 0.58 ? 'discovery' : r < 0.82 ? 'proposal' : 'negotiation';
    deals.push({
      id: `td_${i + 1}`,
      company: co,
      kind: pick(KINDS),
      stage,
      value: range(6, 92) * 5000,       // 30k .. 460k
      daysToClose: range(6, 120),       // expected close, days from now
      repId: pick(TWIN_REPS).id,
    });
  }
  return deals;
}

export const TWIN_DEALS = buildDeals();

/* Headline pipeline facts (baseline, before any scenario lever). */
export const OPEN_PIPELINE = TWIN_DEALS.reduce((s, d) => s + d.value, 0);
export const WEIGHTED_PIPELINE = Math.round(
  TWIN_DEALS.reduce((s, d) => s + d.value * stageById(d.stage).prob, 0)
);
export const AVG_DEAL = Math.round(OPEN_PIPELINE / TWIN_DEALS.length);

/* ============================================================
   SCENARIO STORE  (local-first pub/sub, mirrors store.js pattern)
   The six what-if levers. Each is a delta / policy the operator
   drags; the sim re-runs instantly against the shifted world.
   ============================================================ */
export const DEFAULT_SCENARIO = {
  winRateDelta: 0,     // percentage points added to every stage probability
  cycleTimeDelta: 0,   // percent change to sales-cycle length (slower = fewer land in-quarter)
  dealSizeDelta: 0,    // percent change to average deal size
  headcount: TWIN_REPS.length, // reps carrying the pipeline (capacity model)
  discountPolicy: 0,   // percent discount policy (wins more, books less per deal)
  leadVolumeDelta: 0,  // percent more net-new pipeline created this quarter
};

export const LEVER_META = [
  { key: 'winRateDelta', label: 'Win-rate delta', unit: 'pts', min: -15, max: 20, step: 1, icon: 'trendUp', hint: 'Points added to every deal probability.' },
  { key: 'dealSizeDelta', label: 'Avg deal size', unit: '%', min: -30, max: 40, step: 2, icon: 'dollar', hint: 'Scales the value of every open deal.' },
  { key: 'cycleTimeDelta', label: 'Cycle time', unit: '%', min: -40, max: 50, step: 2, icon: 'clock', hint: 'Longer cycles push deals out of the quarter.' },
  { key: 'discountPolicy', label: 'Discount policy', unit: '%', min: 0, max: 30, step: 1, icon: 'receipt', hint: 'Wins a few more, books less per deal.' },
  { key: 'leadVolumeDelta', label: 'Lead volume', unit: '%', min: -20, max: 60, step: 5, icon: 'funnel', hint: 'Net-new pipeline created this quarter.' },
  { key: 'headcount', label: 'Rep headcount', unit: 'reps', min: 2, max: 9, step: 1, icon: 'users', hint: 'Capacity carrying deals in flight.' },
];

const LS_KEY = 'rally_twin_scenario_v1';
let scenario = loadScenario();
const subs = new Set();

function loadScenario() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_SCENARIO, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SCENARIO };
}
function commit(next) {
  scenario = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(scenario)); } catch {}
  subs.forEach(fn => fn(scenario));
}
export function getScenario() { return scenario; }
export function setLever(key, value) {
  if (!(key in DEFAULT_SCENARIO)) return scenario;
  const v = Number(value);
  commit({ ...scenario, [key]: Number.isFinite(v) ? v : DEFAULT_SCENARIO[key] });
  return scenario;
}
export function setScenario(patch) { commit({ ...scenario, ...patch }); return scenario; }
export function resetScenario() { commit({ ...DEFAULT_SCENARIO }); return scenario; }

export function useTwinScenario() {
  const [snap, setSnap] = useState(scenario);
  useEffect(() => {
    const fn = (s) => setSnap(s);
    subs.add(fn); fn(scenario);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   THE ENGINE
   ============================================================ */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const logistic = (x) => 1 / (1 + Math.exp(-x));

/* Build the effective deal set for a scenario: the real open pipeline
   plus phantom net-new deals implied by the lead-volume lever. Phantom
   deals enter early-stage, late in the window, at a slightly-below-avg
   value - realistic upside that also consumes rep capacity. */
function scenarioDeals(sc) {
  const base = TWIN_DEALS;
  const extra = Math.round(base.length * (sc.leadVolumeDelta / 100));
  if (extra <= 0) return base;
  const rnd = mulberry32(SEED ^ 0x9e3779b9);
  const phantom = [];
  for (let i = 0; i < extra; i++) {
    phantom.push({
      id: `tp_${i}`,
      company: 'New pipeline',
      kind: 'Net-new (lead volume)',
      stage: rnd() < 0.6 ? 'qualified' : 'discovery',
      value: Math.round(AVG_DEAL * (0.6 + rnd() * 0.5)),
      daysToClose: 60 + Math.floor(rnd() * 45),   // lands near / past the edge
      repId: TWIN_REPS[i % TWIN_REPS.length].id,
      phantom: true,
    });
  }
  return base.concat(phantom);
}

/* Capacity factor: overloaded reps convert worse. Under capacity = 1.0. */
function capacityFactor(sc, dealCount) {
  const capacity = Math.max(1, sc.headcount) * DEALS_PER_REP;
  if (dealCount <= capacity) return 1;
  return clamp(capacity / dealCount, 0.55, 1);
}

/* Per-deal effective win probability + booked value under a scenario. */
function dealEconomics(d, sc, capFactor) {
  const base = stageById(d.stage).prob;
  // discounting wins a few more deals (bounded), win-rate lever adds points.
  let p = base + sc.winRateDelta / 100 + (sc.discountPolicy / 100) * 0.30;
  p = clamp(p, 0.02, 0.98);
  // cycle-time sensitivity: does this deal land inside the 90-day window?
  const adjusted = d.daysToClose * (1 + sc.cycleTimeDelta / 100);
  const inWindow = clamp(logistic((HORIZON_DAYS - adjusted) / 16), 0.04, 1);
  const pEff = clamp(p * inWindow * capFactor, 0, 0.995);
  const value = d.value * (1 + sc.dealSizeDelta / 100) * (1 - sc.discountPolicy / 100);
  return { pEff, value };
}

function percentile(sortedAsc, q) {
  if (!sortedAsc.length) return 0;
  const idx = clamp(Math.floor(q * (sortedAsc.length - 1)), 0, sortedAsc.length - 1);
  return sortedAsc[idx];
}

/* Run the Monte Carlo. Re-seeds every call so a given scenario always
   yields the same distribution (stable demo). Returns the percentile
   band, the attainment odds vs plan, and a binned histogram for the SVG. */
export function runMonteCarlo(sc = scenario, iterations = DEFAULT_ITERATIONS) {
  const deals = scenarioDeals(sc);
  const capFactor = capacityFactor(sc, deals.length);
  const econ = deals.map(d => dealEconomics(d, sc, capFactor));
  const rnd = mulberry32(SEED ^ 0x51ed270b);

  const sums = new Array(iterations);
  let winsTotal = 0;
  for (let it = 0; it < iterations; it++) {
    let sum = 0, wins = 0;
    for (let k = 0; k < econ.length; k++) {
      if (rnd() < econ[k].pEff) { sum += econ[k].value; wins++; }
    }
    sums[it] = sum;
    winsTotal += wins;
  }
  const sorted = sums.slice().sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1);
  const p10 = percentile(sorted, 0.10);
  const p50 = percentile(sorted, 0.50);
  const p90 = percentile(sorted, 0.90);
  const hitPlan = sums.reduce((n, v) => n + (v >= QUARTER_PLAN ? 1 : 0), 0);
  const attainmentProb = Math.round((hitPlan / iterations) * 100);

  // histogram
  const min = sorted[0], max = sorted[sorted.length - 1];
  const BINS = 34;
  const span = (max - min) || 1;
  const bins = new Array(BINS).fill(0).map((_, i) => ({
    x0: min + (span * i) / BINS,
    x1: min + (span * (i + 1)) / BINS,
    count: 0,
  }));
  for (const v of sorted) {
    let bi = Math.floor(((v - min) / span) * BINS);
    if (bi >= BINS) bi = BINS - 1; if (bi < 0) bi = 0;
    bins[bi].count++;
  }
  const peak = Math.max(...bins.map(b => b.count), 1);

  return {
    iterations, deals: deals.length,
    p10: Math.round(p10), p50: Math.round(p50), p90: Math.round(p90),
    mean: Math.round(mean), min: Math.round(min), max: Math.round(max),
    attainmentProb, plan: QUARTER_PLAN,
    planDelta: Math.round(p50 - QUARTER_PLAN),
    avgWins: +(winsTotal / iterations).toFixed(1),
    bins, peak,
  };
}

/* Rep-capacity model: deals in flight vs capacity, with overload flags.
   Uses the scenario's headcount + lead-volume so it moves with the sliders. */
export function capacityModel(sc = scenario) {
  const deals = scenarioDeals(sc);
  const headcount = Math.max(1, sc.headcount);
  const perRepCap = DEALS_PER_REP;
  // spread deals across the active reps (round-robin over the real rep list,
  // capped to headcount) so the picture reacts to hiring / cutting reps.
  const active = TWIN_REPS.slice(0, clamp(headcount, 1, TWIN_REPS.length));
  const rows = active.map(r => ({ ...r, inFlight: 0, capacity: perRepCap }));
  deals.forEach((d, i) => { rows[i % rows.length].inFlight++; });
  const totalCap = headcount * perRepCap;
  const totalLoad = deals.length;
  return {
    rows: rows.map(r => ({
      ...r,
      load: Math.round((r.inFlight / r.capacity) * 100),
      overloaded: r.inFlight > r.capacity,
    })).sort((a, b) => b.inFlight - a.inFlight),
    totalCap, totalLoad,
    utilization: Math.round((totalLoad / (totalCap || 1)) * 100),
    overloaded: totalLoad > totalCap,
    headcount,
  };
}

/* Rank the levers: which single realistic change moves P50 the most?
   Probes each lever with a sensible bump from the CURRENT scenario,
   holding the rest fixed, and measures the resulting P50 delta. */
export function rankLevers(sc = scenario, baseP50) {
  const base = baseP50 != null ? baseP50 : runMonteCarlo(sc, LEVER_ITERATIONS).p50;
  const probes = [
    { key: 'winRateDelta', label: 'Lift win rate +5 pts', bump: { winRateDelta: clamp(sc.winRateDelta + 5, -15, 20) }, icon: 'trendUp' },
    { key: 'dealSizeDelta', label: 'Grow deal size +10%', bump: { dealSizeDelta: clamp(sc.dealSizeDelta + 10, -30, 40) }, icon: 'dollar' },
    { key: 'cycleTimeDelta', label: 'Cut cycle time -15%', bump: { cycleTimeDelta: clamp(sc.cycleTimeDelta - 15, -40, 50) }, icon: 'clock' },
    { key: 'leadVolumeDelta', label: 'Add +20% lead volume', bump: { leadVolumeDelta: clamp(sc.leadVolumeDelta + 20, -20, 60) }, icon: 'funnel' },
    { key: 'discountPolicy', label: 'Loosen discount +10%', bump: { discountPolicy: clamp(sc.discountPolicy + 10, 0, 30) }, icon: 'receipt' },
    { key: 'headcount', label: 'Hire +1 rep', bump: { headcount: clamp(sc.headcount + 1, 2, 9) }, icon: 'users' },
  ];
  return probes
    .map(p => {
      const r = runMonteCarlo({ ...sc, ...p.bump }, LEVER_ITERATIONS);
      return { ...p, p50: r.p50, delta: Math.round(r.p50 - base), attainmentProb: r.attainmentProb };
    })
    .sort((a, b) => b.delta - a.delta);
}

/* Human-readable scenario summary (for the Rook handoff + chips). */
export function describeScenario(sc = scenario) {
  const parts = [];
  if (sc.winRateDelta) parts.push(`win rate ${sc.winRateDelta > 0 ? '+' : ''}${sc.winRateDelta} pts`);
  if (sc.dealSizeDelta) parts.push(`deal size ${sc.dealSizeDelta > 0 ? '+' : ''}${sc.dealSizeDelta}%`);
  if (sc.cycleTimeDelta) parts.push(`cycle ${sc.cycleTimeDelta > 0 ? '+' : ''}${sc.cycleTimeDelta}%`);
  if (sc.discountPolicy) parts.push(`discount ${sc.discountPolicy}%`);
  if (sc.leadVolumeDelta) parts.push(`lead volume ${sc.leadVolumeDelta > 0 ? '+' : ''}${sc.leadVolumeDelta}%`);
  if (sc.headcount !== DEFAULT_SCENARIO.headcount) parts.push(`${sc.headcount} reps`);
  return parts.length ? parts.join(', ') : 'baseline pipeline (no adjustments)';
}
