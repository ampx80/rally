// ============================================================
// RALLY TERRITORY + QUOTA DATA
// Enterprise sales-ops layer on top of the live store: territory
// design (geo x segment books), rep assignments, quota + capacity
// planning with ramp, attainment vs quota off REAL closed-won deals,
// coverage (white-space), and a balance/fairness score with a
// deterministic rebalance suggestion. Pure derivations over the
// store; territory rep rosters persist to localStorage (its own
// namespace) so a rebalance actually sticks across reloads. A tiny
// pub/sub mirrors store.js so components re-render on write.
// SUPABASE: rally_territories, rally_territory_reps, rally_quotas
// (per rep, per period), rally_ramp (hire date + ramp curve).
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers, getUser, getCompanies, getDeals } from './store.js';

const LS_KEY = 'rally_territory_v1';

/* ============================================================
   DIMENSIONS  (how a book of business is carved)
   ============================================================ */
export const REGIONS = ['West', 'Central', 'East'];
export const SEGMENTS = ['Enterprise', 'Mid-Market', 'Commercial'];

// State code -> region. Covers every city the store seeds.
const STATE_REGION = {
  CA: 'West', WA: 'West', OR: 'West', CO: 'West',
  TX: 'Central', IL: 'Central', OH: 'Central', TN: 'Central',
  GA: 'East', MA: 'East', NY: 'East', NC: 'East',
};
export function regionForLocation(loc = '') {
  const m = String(loc).trim().match(/,\s*([A-Z]{2})\b/);
  return (m && STATE_REGION[m[1]]) || 'West';
}

// Company headcount band -> go-to-market segment.
const SIZE_SEGMENT = {
  '1-50': 'Commercial', '51-200': 'Commercial',
  '201-500': 'Mid-Market', '501-1000': 'Mid-Market',
  '1001-5000': 'Enterprise', '5000+': 'Enterprise',
};
export function segmentForSize(size = '') {
  return SIZE_SEGMENT[size] || 'Mid-Market';
}

/* ============================================================
   RAMP  (new-hire productivity curve for capacity planning)
   ============================================================ */
// Store users have no hire date, so tenure lives here. rampMonths is
// the standard time-to-full-productivity. Two reps are intentionally
// mid-ramp so the capacity view shows a real coverage gap.
const RAMP_MONTHS = 6;
const REP_META = {
  u_1: { tenureMonths: 32 },
  u_2: { tenureMonths: 18 },
  u_3: { tenureMonths: 5 },   // ramping
  u_4: { tenureMonths: 44 },
  u_5: { tenureMonths: 3 },   // ramping
};
export function rampInfo(userId) {
  const tenure = REP_META[userId]?.tenureMonths ?? 24;
  const ramping = tenure < RAMP_MONTHS;
  const factor = ramping ? Math.max(0.2, Math.round((tenure / RAMP_MONTHS) * 100) / 100) : 1;
  return { tenureMonths: tenure, rampMonths: RAMP_MONTHS, ramping, factor };
}

/* ============================================================
   DEFAULT TERRITORY MAP
   ============================================================ */
// Six named books across region x segment. u_2 and u_4 each span two
// books on purpose (overloaded) so the balance score has teeth and the
// rebalance suggestion has something real to fix. Three region/segment
// combos are deliberately left uncovered (white space) so coverage < 100%.
function defaultTerritories() {
  return [
    { id: 't_west_ent', name: 'West Enterprise', region: 'West', segment: 'Enterprise', industry: 'Tech + Manufacturing', repIds: ['u_1', 'u_4'] },
    { id: 't_west_comm', name: 'West Commercial', region: 'West', segment: 'Commercial', industry: 'SaaS + Media', repIds: ['u_2'] },
    { id: 't_central_ent', name: 'Central Enterprise', region: 'Central', segment: 'Enterprise', industry: 'Energy + Logistics', repIds: ['u_3'] },
    { id: 't_central_mm', name: 'Central Mid-Market', region: 'Central', segment: 'Mid-Market', industry: 'Retail + Health', repIds: ['u_5'] },
    { id: 't_east_ent', name: 'East Enterprise', region: 'East', segment: 'Enterprise', industry: 'Financial Services', repIds: ['u_4'] },
    { id: 't_east_comm', name: 'East Commercial', region: 'East', segment: 'Commercial', industry: 'Biotech + SaaS', repIds: ['u_2'] },
  ];
}

function buildSeed() {
  return { seededAt: new Date().toISOString(), territories: defaultTerritories() };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors store.js / team-data.js)
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
export function getTerritoryState() { return state; }
export function resetTerritories() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useTerritoryStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

export const getTerritories = () => state.territories;
export const getTerritory = (id) => state.territories.find(t => t.id === id);

// Replace a territory's rep roster (used by assign modal + rebalance apply).
export function setTerritoryReps(territoryId, repIds) {
  const territories = state.territories.map(t => (t.id === territoryId ? { ...t, repIds: [...repIds] } : t));
  commit({ ...state, territories });
}

/* ============================================================
   PERIODS  (quota + attainment window)
   ============================================================ */
const clamp01 = (n) => Math.max(0, Math.min(1, n));

// which: 'year' (FY to date) or 'quarter' (current calendar quarter).
export function periodRange(which = 'year', ref = new Date()) {
  const y = ref.getFullYear();
  if (which === 'quarter') {
    const qi = Math.floor(ref.getMonth() / 3);
    const start = new Date(y, qi * 3, 1);
    const end = new Date(y, qi * 3 + 3, 0, 23, 59, 59);
    return { which, start, end, label: `Q${qi + 1} ${y}`, elapsedFrac: clamp01((ref - start) / (end - start)), quotaMult: 0.25 };
  }
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31, 23, 59, 59);
  return { which, start, end, label: `FY ${y}`, elapsedFrac: clamp01((ref - start) / (end - start)), quotaMult: 1 };
}
function inRange(dateStr, range) {
  const t = new Date(dateStr).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

// Period quota for a rep. Annual store quota scaled to the window and
// rounded to a clean 5k for the quarter. SUPABASE: rally_quotas.
export function repPeriodQuota(user, range) {
  if (!user || !user.quota || user.role !== 'rep') return 0;
  const raw = user.quota * (range?.quotaMult ?? 1);
  return range?.which === 'quarter' ? Math.round(raw / 5000) * 5000 : Math.round(raw);
}

/* ============================================================
   COVERAGE  (footprint match + white space)
   ============================================================ */
// A company sits in a territory when its region + segment match.
export function territoryForCompany(co, territories = state.territories) {
  const region = regionForLocation(co.location);
  const segment = segmentForSize(co.size);
  return territories.find(t => t.region === region && t.segment === segment) || null;
}

export function coverage(territories = state.territories) {
  const companies = getCompanies();
  let covered = 0;
  const gapCounts = {};
  for (const co of companies) {
    const t = territoryForCompany(co, territories);
    if (t) covered++;
    else {
      const key = `${regionForLocation(co.location)} / ${segmentForSize(co.size)}`;
      gapCounts[key] = (gapCounts[key] || 0) + 1;
    }
  }
  const total = companies.length;
  const gaps = Object.entries(gapCounts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return { total, covered, uncovered: total - covered, pct: total ? Math.round((covered / total) * 100) : 0, gaps };
}

/* ============================================================
   BALANCE / FAIRNESS SCORE
   ============================================================ */
// 100 = every territory carries the same accounts-per-rep load; the
// score falls as the spread (coefficient of variation) widens.
export function balanceFromLoads(loads = []) {
  const vals = loads.filter(v => Number.isFinite(v));
  if (vals.length < 2) return 100;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (mean <= 0) return 100;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
}

/* ============================================================
   THE MODEL  (one pass, pure over store + persisted rosters)
   ============================================================ */
export function buildTerritoryModel(which = 'year') {
  const range = periodRange(which);
  const territories = state.territories;
  const companies = getCompanies();
  const deals = getDeals();
  const allReps = getUsers().filter(u => u.role === 'rep');

  // per-rep primitives off the live book
  const repStat = {};
  for (const u of allReps) {
    const ramp = rampInfo(u.id);
    const quota = repPeriodQuota(u, range);
    let won = 0, pipeline = 0, openCount = 0;
    for (const d of deals) {
      if (d.ownerId !== u.id) continue;
      if (d.status === 'won' && inRange(d.closeDate, range)) won += d.value;
      else if (d.status === 'open') { pipeline += d.value; openCount++; }
    }
    const attainment = quota ? Math.round((won / quota) * 100) : 0;
    const expected = Math.round(range.elapsedFrac * 100);
    const pace = attainment - expected;           // + = ahead of pace
    const paceState = pace >= 5 ? 'ahead' : pace >= -12 ? 'ontrack' : 'behind';
    const capacity = Math.round(quota * ramp.factor);
    repStat[u.id] = { user: u, quota, won, pipeline, openCount, attainment, expected, pace, paceState, ramp, capacity };
  }

  // footprint accounts per territory
  const acctByTerr = {};
  for (const t of territories) acctByTerr[t.id] = [];
  for (const co of companies) {
    const t = territoryForCompany(co, territories);
    if (t) acctByTerr[t.id].push(co);
  }

  // territory roll-ups (from assigned reps' live books)
  const terrRows = territories.map(t => {
    const reps = (t.repIds || []).map(getUser).filter(Boolean);
    const accounts = acctByTerr[t.id] || [];
    const quota = reps.reduce((s, u) => s + (repStat[u.id]?.quota || 0), 0);
    const won = reps.reduce((s, u) => s + (repStat[u.id]?.won || 0), 0);
    const pipeline = reps.reduce((s, u) => s + (repStat[u.id]?.pipeline || 0), 0);
    const openCount = reps.reduce((s, u) => s + (repStat[u.id]?.openCount || 0), 0);
    const capacity = reps.reduce((s, u) => s + (repStat[u.id]?.capacity || 0), 0);
    const attainment = quota ? Math.round((won / quota) * 100) : 0;
    const loadPerRep = reps.length ? accounts.length / reps.length : accounts.length;
    return {
      ...t, reps, accountCount: accounts.length, accounts,
      repCount: reps.length, quota, won, pipeline, openCount, capacity, attainment,
      capacityGap: Math.max(0, quota - capacity), loadPerRep,
    };
  });

  // team totals off unique reps (a shared rep is counted once)
  const teamQuota = allReps.reduce((s, u) => s + (repStat[u.id]?.quota || 0), 0);
  const teamWon = allReps.reduce((s, u) => s + (repStat[u.id]?.won || 0), 0);
  const teamPipeline = allReps.reduce((s, u) => s + (repStat[u.id]?.pipeline || 0), 0);
  const teamCapacity = allReps.reduce((s, u) => s + (repStat[u.id]?.capacity || 0), 0);
  const teamAttainment = teamQuota ? Math.round((teamWon / teamQuota) * 100) : 0;

  const repRows = allReps.map(u => {
    const s = repStat[u.id];
    const terr = terrRows.find(t => (t.repIds || []).includes(u.id)) || null;
    return { ...s, territory: terr ? { id: terr.id, name: terr.name } : null };
  }).sort((a, b) => b.attainment - a.attainment);

  const balanceScore = balanceFromLoads(terrRows.map(t => t.loadPerRep));
  const cov = coverage(territories);

  const model = {
    range, territories: terrRows, repRows,
    totals: { teamQuota, teamWon, teamPipeline, teamCapacity, teamAttainment, capacityGap: Math.max(0, teamQuota - teamCapacity) },
    balanceScore, coverage: cov,
  };
  model.rebalance = suggestRebalance(model);
  return model;
}

/* ============================================================
   REBALANCE SUGGESTION  (deterministic, applyable)
   ============================================================ */
// Find the most overloaded book (accounts-per-rep) and move one rep
// into it from the least-loaded book that has a spare rep. Only
// surface it when the simulated move actually lifts the balance score.
export function suggestRebalance(model) {
  const rows = model.territories;
  if (rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => b.loadPerRep - a.loadPerRep);
  const receiver = sorted[0];                       // most overloaded
  const donors = sorted.filter(t => t.id !== receiver.id && t.repCount >= 2)
    .sort((a, b) => a.loadPerRep - b.loadPerRep);   // spare capacity, least loaded first

  const current = model.balanceScore;
  let best = null;
  for (const donor of donors) {
    const loads = rows.map(t => {
      if (t.id === receiver.id) return t.accountCount / (t.repCount + 1);
      if (t.id === donor.id) return t.accountCount / Math.max(1, t.repCount - 1);
      return t.loadPerRep;
    });
    const projected = balanceFromLoads(loads);
    if (!best || projected > best.projected) {
      const repId = donor.repIds[donor.repIds.length - 1];
      best = { donor, receiver, repId, projected };
    }
  }

  if (best && best.projected > current + 1) {
    const rep = getUser(best.repId);
    return {
      type: 'move_rep',
      repId: best.repId,
      repName: rep?.name || 'a rep',
      fromId: best.donor.id, fromName: best.donor.name,
      toId: best.receiver.id, toName: best.receiver.name,
      current, projected: best.projected,
      message: `Move ${rep?.name || 'a rep'} from ${best.donor.name} to ${best.receiver.name}. ${best.receiver.name} carries ${Math.round(best.receiver.loadPerRep)} accounts per rep versus ${Math.round(best.donor.loadPerRep)} in ${best.donor.name}.`,
    };
  }

  // No clean rep move: point at the biggest white-space gap instead.
  const gap = model.coverage.gaps[0];
  if (gap) {
    return {
      type: 'advisory',
      current, projected: current,
      message: `Books are balanced. Biggest opening is ${gap.count} uncovered ${gap.label} account${gap.count === 1 ? '' : 's'} with no territory. Add a book to capture the white space.`,
    };
  }
  return { type: 'balanced', current, projected: current, message: 'Territories are well balanced. No move needed.' };
}

// Apply a move_rep suggestion to the persisted rosters.
export function applyRebalance(sug) {
  if (!sug || sug.type !== 'move_rep') return { error: 'noop' };
  const from = getTerritory(sug.fromId);
  const to = getTerritory(sug.toId);
  if (!from || !to) return { error: 'missing' };
  setTerritoryReps(sug.fromId, (from.repIds || []).filter(id => id !== sug.repId));
  const toReps = to.repIds || [];
  if (!toReps.includes(sug.repId)) setTerritoryReps(sug.toId, [...toReps, sug.repId]);
  return { ok: true };
}
