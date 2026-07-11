// ============================================================
// RALLY GOALS DATA  (company / team / rep goals + pacing + scorecards)
// Goals.jsx renders the exec + manager cockpit off the live store;
// this module owns the goal-setting layer (targets per level per
// metric) that has no home in store.js yet. Deterministic seed on
// first run, every target edit persists to localStorage so goals stay
// alive across reloads. A tiny pub/sub mirrors store.js / team-data.js
// so components re-render on write.
//
// The whole point is PACING: an actual is always measured against what
// the target says you should have by NOW (target x time-elapsed), so a
// modest number early in the quarter can still read "ahead of pace".
// Every actual is computed live off getDeals()/getActivities(); only
// the targets (and the team roster) are persisted here.
// SUPABASE: rally_goals (level, scope, metric, period, target),
// rally_goal_teams, rally_goal_team_reps (all namespaced rally_*).
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers, getDeals, getActivities } from './store.js';

const LS_KEY = 'rally_goals_v1';

/* ---------- the four metrics every level is measured on ---------- */
// SUPABASE: rally_goal_metrics (static config).
export const GOAL_METRICS = [
  { id: 'revenue',    label: 'Revenue',     short: 'Rev',   unit: 'money', icon: 'dollar',   color: 'var(--ok)',     desc: 'Closed-won booked in the period.' },
  { id: 'logos',      label: 'New logos',   short: 'Logos', unit: 'count', icon: 'building', color: 'var(--accent)', desc: 'Net-new customer accounts won.' },
  { id: 'activities', label: 'Activities',  short: 'Acts',  unit: 'count', icon: 'activity', color: '#0ea5a3',       desc: 'Completed calls, emails, meetings, tasks.' },
  { id: 'pipeline',   label: 'Pipeline gen', short: 'Pipe', unit: 'money', icon: 'trendUp',  color: '#8b3fd4',       desc: 'New open pipeline created in the period.' },
];
export const metricById = (id) => GOAL_METRICS.find(m => m.id === id) || GOAL_METRICS[0];

/* ---------- goal status colors (pacing verdict) ---------- */
export const STATUS_META = {
  hit:        { label: 'Goal hit',      tone: 'ok',      color: 'var(--ok)' },
  ahead:      { label: 'Ahead of pace', tone: 'ok',      color: 'var(--ok)' },
  'on-track': { label: 'On track',      tone: 'accent',  color: 'var(--accent)' },
  behind:     { label: 'Behind pace',   tone: 'warn',    color: 'var(--warn)' },
};

/* ---------- default teams: books of business under the company ---------- */
// The store seeds reps u_1..u_5 (u_6 is the manager). We split them into two
// named teams so team-level goals roll up from real owners on first render.
// SUPABASE: rally_goal_teams + rally_goal_team_reps join.
function defaultTeams() {
  return [
    { id: 'tm_ent', name: 'Enterprise', segment: 'Enterprise + strategic', repIds: ['u_1', 'u_4'], color: '#5b4bf5' },
    { id: 'tm_com', name: 'Commercial', segment: 'Mid-market + commercial', repIds: ['u_2', 'u_3', 'u_5'], color: '#0ea5a3' },
  ];
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors store.js / team-data.js shape)
   ============================================================ */
let state = load();
const subs = new Set();

function buildSeed() {
  const teams = defaultTeams();
  const goals = {};
  // Seed a concrete target for every level x metric so goals are editable
  // out of the gate. Missing keys still fall back to computeDefaultTarget.
  const stash = (level, scope) => {
    for (const m of GOAL_METRICS) goals[goalKey(level, scope, m.id)] = computeDefaultTarget(level, scope, m.id, teams);
  };
  stash('company', '_');
  for (const t of teams) stash('team', t.id);
  for (const u of getUsers().filter(u => u.role === 'rep')) stash('rep', u.id);
  return { seededAt: new Date().toISOString(), teams, goals };
}

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
export function getGoalsState() { return state; }
export function resetGoals() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useGoalsStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   PERIOD + WEEK WINDOWS
   ============================================================ */
// Current quarter, with the time-elapsed fraction that drives all pacing.
export function currentPeriod(ref = new Date()) {
  const y = ref.getFullYear();
  const qi = Math.floor(ref.getMonth() / 3);
  const start = new Date(y, qi * 3, 1);
  const end = new Date(y, qi * 3 + 3, 0, 23, 59, 59);
  const now = ref.getTime();
  const span = end.getTime() - start.getTime();
  const elapsed = Math.max(0, Math.min(1, (now - start.getTime()) / span));
  const daysTotal = Math.round(span / 86400000);
  const daysElapsed = Math.max(0, Math.round((now - start.getTime()) / 86400000));
  return { start, end, label: `Q${qi + 1} ${y}`, elapsed, daysTotal, daysElapsed, daysLeft: Math.max(0, daysTotal - daysElapsed) };
}

// Current week, Monday to Sunday, for the scorecards.
export function currentWeek(ref = new Date()) {
  const d = new Date(ref);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
  return { start, end, label: 'This week', daysLeft: 6 - day };
}

export function inRange(dateStr, win) {
  if (!dateStr || !win) return false;
  const t = new Date(dateStr).getTime();
  return t >= win.start.getTime() && t <= win.end.getTime();
}

/* ============================================================
   ROSTER + DEFAULT TARGETS
   ============================================================ */
export const getTeams = () => state.teams;
export const getTeam = (id) => state.teams.find(t => t.id === id);

// The rep ids that a given level+scope rolls up.
function repsFor(level, scope, teams = state.teams) {
  const all = getUsers().filter(u => u.role === 'rep').map(u => u.id);
  if (level === 'company') return all;
  if (level === 'rep') return all.includes(scope) ? [scope] : [];
  const t = (teams || []).find(t => t.id === scope);
  return t ? (t.repIds || []).filter(id => all.includes(id)) : [];
}

// A rep's quarterly revenue target, derived from their annual quota with a
// clean 5k rounding. Falls back to a sensible default for quota-less users.
function repRevenueTarget(repId) {
  const u = getUsers().find(x => x.id === repId);
  const annual = u && u.quota ? u.quota : 800000;
  return Math.round((annual / 4) / 5000) * 5000;
}

// Deterministic default target for a level+metric. Revenue + pipeline roll up
// from rep revenue targets; logos + activities scale with headcount.
export function computeDefaultTarget(level, scope, metric, teams = state.teams) {
  const reps = repsFor(level, scope, teams);
  if (reps.length === 0) return 0;
  switch (metric) {
    case 'revenue':    return reps.reduce((s, id) => s + repRevenueTarget(id), 0);
    case 'pipeline':   return reps.reduce((s, id) => s + repRevenueTarget(id) * 3, 0);
    case 'logos':      return reps.length * 8;
    case 'activities': return reps.length * 240;
    default:           return 0;
  }
}

export const goalKey = (level, scope, metric) => `${level}:${scope}:${metric}`;

// Persisted target if edited, else the computed default.
export function getGoalTarget(level, scope, metric) {
  const v = state.goals[goalKey(level, scope, metric)];
  return typeof v === 'number' && isFinite(v) ? v : computeDefaultTarget(level, scope, metric);
}

/* ============================================================
   ACTUALS  (live off the store, never fabricated)
   ============================================================ */
export function computeActual(level, scope, metric, period = currentPeriod()) {
  const reps = new Set(repsFor(level, scope));
  if (reps.size === 0) return 0;
  const deals = getDeals();
  switch (metric) {
    case 'revenue':
      return deals
        .filter(d => d.status === 'won' && reps.has(d.ownerId) && inRange(d.closeDate, period))
        .reduce((s, d) => s + d.value, 0);
    case 'logos': {
      const cos = new Set();
      for (const d of deals) if (d.status === 'won' && reps.has(d.ownerId) && inRange(d.closeDate, period)) cos.add(d.companyId);
      return cos.size;
    }
    case 'pipeline':
      return deals
        .filter(d => d.status === 'open' && reps.has(d.ownerId) && inRange(d.createdAt, period))
        .reduce((s, d) => s + d.value, 0);
    case 'activities':
      return getActivities()
        .filter(a => a.done && reps.has(a.ownerId) && inRange(a.dueAt || a.createdAt, period)).length;
    default:
      return 0;
  }
}

/* ============================================================
   PACING  (the ahead / on-track / behind engine)
   ============================================================ */
export function pacing(actual, target, period = currentPeriod()) {
  const expected = target * period.elapsed;
  const attainment = target > 0 ? actual / target : 0;
  const paceIndex = expected > 0 ? actual / expected : (actual > 0 ? 2 : 1);
  const projected = period.elapsed > 0 ? actual / period.elapsed : actual;
  const projectedPct = target > 0 ? projected / target : 0;
  let status;
  if (attainment >= 1) status = 'hit';
  else if (paceIndex >= 1.02) status = 'ahead';
  else if (paceIndex >= 0.92) status = 'on-track';
  else status = 'behind';
  return { expected, attainment, paceIndex, projected, projectedPct, status };
}

// One fully-resolved goal: target + live actual + pacing verdict.
export function getGoal(level, scope, metric, period = currentPeriod()) {
  const target = getGoalTarget(level, scope, metric);
  const actual = computeActual(level, scope, metric, period);
  return { key: goalKey(level, scope, metric), level, scope, metric, target, actual, ...pacing(actual, target, period) };
}

// Every metric for a level, in config order.
export function goalsForScope(level, scope, period = currentPeriod()) {
  return GOAL_METRICS.map(m => getGoal(level, scope, m.id, period));
}

/* ============================================================
   LEADERBOARD  (rep ranking + movement)
   ============================================================ */
// Deterministic prior-period score wobble so rank movement arrows are stable
// across reloads without needing real snapshot history.
function priorWobble(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 131 + id.charCodeAt(i)) | 0;
  return 0.78 + (Math.abs(h) % 44) / 100; // 0.78 .. 1.21
}

export function repGoalLeaderboard(metric = 'revenue', period = currentPeriod()) {
  const reps = getUsers().filter(u => u.role === 'rep');
  const rows = reps.map(u => {
    const g = getGoal('rep', u.id, metric, period);
    return { userId: u.id, name: u.name, title: u.title, ...g };
  });
  rows.sort((a, b) => (b.attainment - a.attainment) || (b.actual - a.actual));
  const prior = rows
    .map(r => ({ id: r.userId, s: r.attainment * priorWobble(r.userId) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.id);
  return rows.map((r, i) => {
    const prevRank = prior.indexOf(r.userId) + 1;
    return { ...r, rank: i + 1, prevRank, movement: prevRank - (i + 1) };
  });
}

/* ============================================================
   WEEKLY SCORECARD  (per rep, activity + output cadence)
   ============================================================ */
export function repScorecard(repId, week = currentWeek()) {
  const acts = getActivities().filter(a => a.ownerId === repId && a.done && inRange(a.dueAt || a.createdAt, week));
  const byType = (t) => acts.filter(a => a.type === t).length;
  const deals = getDeals();
  const pipeline = deals
    .filter(d => d.ownerId === repId && d.status === 'open' && inRange(d.createdAt, week))
    .reduce((s, d) => s + d.value, 0);
  const revenue = deals
    .filter(d => d.ownerId === repId && d.status === 'won' && inRange(d.closeDate, week))
    .reduce((s, d) => s + d.value, 0);
  const revT = repRevenueTarget(repId);
  const rows = [
    { id: 'calls',    label: 'Calls',           unit: 'count', icon: 'phone',    actual: byType('call'),    target: 40 },
    { id: 'meetings', label: 'Meetings',        unit: 'count', icon: 'calendar', actual: byType('meeting'), target: 8 },
    { id: 'emails',   label: 'Emails',          unit: 'count', icon: 'mail',     actual: byType('email'),   target: 60 },
    { id: 'pipeline', label: 'Pipeline created', unit: 'money', icon: 'trendUp', actual: pipeline,          target: Math.round((revT * 3 / 13) / 5000) * 5000 },
    { id: 'revenue',  label: 'Revenue won',     unit: 'money', icon: 'dollar',   actual: revenue,           target: Math.round((revT / 13) / 5000) * 5000 },
  ];
  const scored = rows.map(r => ({ ...r, pct: r.target > 0 ? r.actual / r.target : 0 }));
  const avgPct = scored.reduce((s, r) => s + Math.min(1.5, r.pct), 0) / scored.length;
  const score = Math.round(avgPct * 100);
  return { rows: scored, score };
}

/* ============================================================
   WRITE API  (all persist)
   ============================================================ */
export function setGoalTarget(level, scope, metric, target) {
  const v = Number(target);
  if (!Number.isFinite(v) || v < 0) return { error: 'target', message: 'Enter a valid target (0 or more).' };
  commit({ ...state, goals: { ...state.goals, [goalKey(level, scope, metric)]: Math.round(v) } });
  return { ok: true, target: Math.round(v) };
}

// Revert a single goal back to its computed default (removes the override).
export function clearGoalTarget(level, scope, metric) {
  const goals = { ...state.goals };
  delete goals[goalKey(level, scope, metric)];
  commit({ ...state, goals });
  return { ok: true };
}
