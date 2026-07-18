// ============================================================
// ARDOVO PIPELINE FORK  -  git for your entire pipeline
// ------------------------------------------------------------
// A branch is a structuredClone of the whole live store (a real,
// mutable digital twin of the book of business). You make speculative
// edits inside the twin (slide close dates, reassign a rep, apply a
// discount policy, advance stages), then diff it against `main` across
// the forecast + coverage + cash-in + per-rep attainment, and cherry
// pick which changes to actually commit back to the live store.
//
// NON-DESTRUCTIVE BY CONSTRUCTION. Nothing here mutates the live store
// until you commit. Branch metrics are computed by re-running the
// EXISTING engines (forecasting-data.js + intelligence-data.js) against
// the clone via store.withState(), which swaps the module state for one
// synchronous read and restores it. Committing replays the selected
// changes through the SAME writers (updateDeal / moveDealStage) a human
// uses, so audit + validation + pub-sub all fire normally.
//
// SUPABASE: a branch becomes a per-tenant copy-on-write snapshot; a
// commit becomes a keyed three-way merge back to rally_*.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getState, withState, getDeal, getUser, userName,
  updateDeal, moveDealStage, STAGES, stageById,
} from './store.js';
import { quarterRange, buildRollup, repQuarterlyQuotas } from './forecasting-data.js';
import { forecastConfidence } from './intelligence-data.js';

const LS_KEY = 'rally_forks_v1';

/* Branch accent palette (cycles). Kept off the reserved risk/ok tones. */
export const BRANCH_COLORS = ['#5b4bf5', '#0ea5a4', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#0284c7'];

/* deep clone the live state into an isolated twin */
function clone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- registry + pub/sub ---------- */
let branches = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a; }
  } catch {}
  return [];
}
function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(branches)); } catch {} }
function notify() { persist(); subs.forEach(fn => fn(branches)); }

let seq = Date.now();
const newId = () => `fork_${(seq++).toString(36)}`;

/* ---------- read ---------- */
export function listBranches() { return branches; }
export function getBranch(id) { return branches.find(b => b.id === id) || null; }

/* ---------- lifecycle ---------- */
export function createBranch(name, { note = '' } = {}) {
  const id = newId();
  const b = {
    id,
    name: (name && name.trim()) || `Branch ${branches.length + 1}`,
    note: note.trim(),
    color: BRANCH_COLORS[branches.length % BRANCH_COLORS.length],
    createdAt: new Date().toISOString(),
    baseAt: new Date().toISOString(),
    moves: [],
    state: clone(getState()),
  };
  branches = [b, ...branches];
  notify();
  return b;
}
export function deleteBranch(id) {
  branches = branches.filter(b => b.id !== id);
  notify();
}
export function renameBranch(id, name) {
  const b = getBranch(id);
  if (b) { b.name = (name && name.trim()) || b.name; notify(); }
}
/* re-clone from the current live store and drop all speculative edits */
export function resetBranch(id) {
  const b = getBranch(id);
  if (!b) return;
  b.state = clone(getState());
  b.baseAt = new Date().toISOString();
  b.moves = [];
  notify();
}

/* ============================================================
   SPECULATIVE EDITS  (mutate the isolated clone only)
   ============================================================ */
const DAY = 86400000;
const openDeals = (st) => st.deals.filter(d => d.status === 'open');

/* A single inline edit to one deal inside the twin. Mirrors the shape of a
   real stage/value change so downstream metrics read correctly, but writes
   nothing to the live store. */
export function editDeal(id, dealId, patch = {}) {
  const b = getBranch(id);
  if (!b) return;
  const d = b.state.deals.find(x => x.id === dealId);
  if (!d) return;
  if (patch.value != null) { const v = Number(patch.value); if (Number.isFinite(v) && v >= 0) d.value = v; }
  if (patch.ownerId != null) d.ownerId = patch.ownerId;
  if (patch.closeDate != null) d.closeDate = patch.closeDate;
  if (patch.stage != null) {
    const st = stageById(patch.stage);
    if (st) {
      d.stage = st.id;
      d.probability = st.probability;
      d.status = st.type === 'open' ? 'open' : st.type;
      if (st.type !== 'open' && !patch.closeDate) d.closeDate = new Date().toISOString();
    }
  }
  notify();
}

/* Macro "what-if" moves applied across the twin. Each returns a human label
   that is recorded on the branch so the studio can show its edit history. */
export const MOVES = {
  slip: {
    label: 'Slip close dates',
    apply: (st, { days = 14 } = {}) => {
      for (const d of openDeals(st)) d.closeDate = new Date(new Date(d.closeDate).getTime() + days * DAY).toISOString();
      return `Slid every open close date +${days}d`;
    },
  },
  pull: {
    label: 'Pull dates forward',
    apply: (st, { days = 14 } = {}) => {
      for (const d of openDeals(st)) d.closeDate = new Date(new Date(d.closeDate).getTime() - days * DAY).toISOString();
      return `Pulled every open close date -${days}d`;
    },
  },
  discount: {
    label: 'Apply discount policy',
    apply: (st, { pct = 10 } = {}) => {
      const m = 1 - Math.max(0, Math.min(90, pct)) / 100;
      for (const d of openDeals(st)) d.value = Math.round((d.value * m) / 1000) * 1000;
      return `Applied a ${pct}% discount across open pipeline`;
    },
  },
  boost: {
    label: 'Raise win probability',
    apply: (st, { floor = 60 } = {}) => {
      for (const d of openDeals(st)) if ((d.probability ?? 0) < floor) d.probability = floor;
      return `Set a ${floor}% probability floor on open deals`;
    },
  },
  advance: {
    label: 'Advance every deal one stage',
    apply: (st) => {
      const order = STAGES.map(s => s.id); // lead..won, lost last
      for (const d of openDeals(st)) {
        const i = order.indexOf(d.stage);
        // next stage, but never roll an open deal into "lost"
        const next = stageById(order[Math.min(i + 1, order.indexOf('won'))]);
        if (!next) continue;
        d.stage = next.id;
        d.probability = next.probability;
        d.status = next.type === 'open' ? 'open' : next.type;
        if (next.type !== 'open') d.closeDate = new Date().toISOString();
      }
      return 'Advanced every open deal one stage';
    },
  },
  reassign: {
    label: 'Reassign a rep book',
    apply: (st, { from, to } = {}) => {
      if (!from || !to || from === to) return null;
      let n = 0;
      for (const d of st.deals) if (d.ownerId === from) { d.ownerId = to; n++; }
      return `Reassigned ${n} deal${n === 1 ? '' : 's'} from ${userName(from)} to ${userName(to)}`;
    },
  },
};

export function applyMove(id, type, params = {}) {
  const b = getBranch(id);
  const spec = MOVES[type];
  if (!b || !spec) return;
  const label = spec.apply(b.state, params);
  if (label) {
    b.moves.push({ id: `${type}_${(seq++).toString(36)}`, type, label, ts: new Date().toISOString() });
    notify();
  }
}

/* ============================================================
   METRICS  (re-run the real engines against a given state)
   ============================================================ */
export function computeMetrics(st) {
  return withState(st, () => {
    const range = quarterRange('this');
    const roll = buildRollup(range);
    const conf = forecastConfidence();
    const quotas = repQuarterlyQuotas();
    const reps = roll.reps
      .filter(r => r.quota > 0)
      .map(r => ({
        userId: r.userId,
        name: userName(r.userId),
        quota: r.quota,
        booked: r.closed + r.commit,
        attainment: r.quota ? Math.round(((r.closed + r.commit) / r.quota) * 100) : 0,
      }))
      .sort((a, b) => b.attainment - a.attainment);
    return {
      weighted: roll.weighted,
      commit: roll.committed,
      best: roll.bestCase,
      pipeline: roll.pipeline,
      cashIn: roll.closedWon,
      confidence: conf.confidence,
      confidenceLabel: conf.label,
      confidenceTone: conf.tone,
      quota: conf.quota,
      gap: conf.gap,
      quarterLabel: range.label,
      reps,
    };
  });
}

/* the four headline lines the delta strip renders */
export function deltaLines(main, branch) {
  const line = (key, label, fmt, invertGood = false) => {
    const from = main[key], to = branch[key];
    const delta = to - from;
    return { key, label, from, to, delta, fmt, invertGood };
  };
  return [
    line('commit', 'Commit', 'money'),
    line('best', 'Best case', 'money'),
    line('weighted', 'Weighted', 'money'),
    line('cashIn', 'Cash in (won)', 'money'),
    line('pipeline', 'Coverage pipeline', 'money'),
    line('confidence', 'Confidence', 'pct'),
  ];
}

/* per-rep attainment, main vs branch, joined by rep id */
export function repDelta(main, branch) {
  const byId = new Map(main.reps.map(r => [r.userId, r]));
  const seen = new Set();
  const rows = [];
  for (const b of branch.reps) {
    const m = byId.get(b.userId);
    seen.add(b.userId);
    rows.push({
      userId: b.userId, name: b.name, quota: b.quota,
      mainAttain: m ? m.attainment : 0,
      branchAttain: b.attainment,
      delta: b.attainment - (m ? m.attainment : 0),
    });
  }
  for (const m of main.reps) if (!seen.has(m.userId)) {
    rows.push({ userId: m.userId, name: m.name, quota: m.quota, mainAttain: m.attainment, branchAttain: 0, delta: -m.attainment });
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/* ============================================================
   DIFF  (field-level, keyed by deal id)
   ============================================================ */
const TRACK = [
  { field: 'stage', label: 'Stage', kind: 'stage' },
  { field: 'value', label: 'Value', kind: 'money' },
  { field: 'probability', label: 'Win %', kind: 'pct' },
  { field: 'closeDate', label: 'Close date', kind: 'date' },
  { field: 'ownerId', label: 'Owner', kind: 'owner' },
  { field: 'status', label: 'Status', kind: 'text' },
];

export function diffDeals(mainState, branchState) {
  const mainById = new Map(mainState.deals.map(d => [d.id, d]));
  const branchById = new Map(branchState.deals.map(d => [d.id, d]));
  const out = [];

  for (const bd of branchState.deals) {
    const md = mainById.get(bd.id);
    if (!md) {
      out.push({ id: bd.id, name: bd.name, status: 'added', deal: bd, changes: [] });
      continue;
    }
    const changes = [];
    for (const t of TRACK) {
      if (md[t.field] !== bd[t.field]) changes.push({ ...t, from: md[t.field], to: bd[t.field] });
    }
    if (changes.length) out.push({ id: bd.id, name: bd.name, status: 'changed', deal: bd, changes, valueDelta: (bd.value || 0) - (md.value || 0) });
  }
  for (const md of mainState.deals) if (!branchById.has(md.id)) {
    out.push({ id: md.id, name: md.name, status: 'removed', deal: md, changes: [] });
  }
  // biggest dollar movers first
  return out.sort((a, b) => Math.abs(b.valueDelta || 0) - Math.abs(a.valueDelta || 0));
}

/* human label for a tracked value (used by the diff table + narrative) */
export function fmtField(kind, v) {
  if (v == null || v === '') return '-';
  if (kind === 'stage') return stageById(v)?.name || v;
  if (kind === 'owner') return userName(v);
  if (kind === 'money') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  if (kind === 'pct') return `${v}%`;
  if (kind === 'date') return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return String(v);
}

/* ============================================================
   COMMIT  (cherry-pick selected deals back through real writers)
   ============================================================ */
export function commitDeals(branchId, dealIds) {
  const b = getBranch(branchId);
  if (!b) return { committed: 0 };
  let committed = 0;
  for (const dealId of dealIds) {
    const live = getDeal(dealId);
    const bd = b.state.deals.find(d => d.id === dealId);
    if (!live || !bd) continue;
    if (bd.stage !== live.stage) moveDealStage(dealId, bd.stage, { silent: true });
    const patch = {};
    if (bd.value !== live.value) patch.value = bd.value;
    if (bd.ownerId !== live.ownerId) patch.ownerId = bd.ownerId;
    if (bd.closeDate !== live.closeDate) patch.closeDate = bd.closeDate;
    if (Object.keys(patch).length) updateDeal(dealId, patch);
    committed++;
  }
  return { committed };
}

/* ============================================================
   NARRATIVE  (grounded, deterministic; also a Rook prompt)
   ============================================================ */
const kMoney = (n) => {
  const a = Math.abs(n || 0);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
};

export function localNarrative(branch, main, branchMetrics, diff) {
  const dc = branchMetrics.commit - main.commit;
  const dcash = branchMetrics.cashIn - main.cashIn;
  const dconf = branchMetrics.confidence - main.confidence;
  const parts = [];
  parts.push(`Branch "${branch.name}" holds ${diff.length} changed deal${diff.length === 1 ? '' : 's'} against main.`);
  if (dc !== 0) parts.push(`Committed number moves ${dc > 0 ? 'up' : 'down'} ${kMoney(Math.abs(dc))} (${kMoney(main.commit)} to ${kMoney(branchMetrics.commit)}).`);
  else parts.push('The committed number is unchanged.');
  if (dcash !== 0) parts.push(`Cash-in this quarter shifts ${dcash > 0 ? '+' : '-'}${kMoney(Math.abs(dcash))}.`);
  parts.push(`Forecast confidence ${dconf === 0 ? 'holds at' : dconf > 0 ? 'rises to' : 'falls to'} ${branchMetrics.confidence}${dconf === 0 ? '' : ` (${dconf > 0 ? '+' : ''}${dconf} pts)`}.`);
  const top = diff.filter(d => d.status === 'changed').slice(0, 2).map(d => d.name);
  if (top.length) parts.push(`Biggest movers: ${top.join(', ')}.`);
  parts.push(dc >= 0 && dconf >= 0
    ? 'On these numbers this branch is accretive - worth cherry-picking the safe changes into main.'
    : 'This branch trades away forecast strength; commit only the changes you can defend.');
  return parts.join(' ');
}

export function narrativePrompt(branch, main, branchMetrics, diff) {
  const lines = deltaLines(main, branchMetrics)
    .map(l => `${l.label}: ${l.fmt === 'pct' ? main[l.key] + '% -> ' + branchMetrics[l.key] + '%' : kMoney(main[l.key]) + ' -> ' + kMoney(branchMetrics[l.key])}`)
    .join('; ');
  const moves = branch.moves.map(m => m.label).join('; ') || 'manual edits';
  const movers = diff.filter(d => d.status === 'changed').slice(0, 4).map(d => d.name).join(', ');
  return `I forked my pipeline into a branch called "${branch.name}". Edits applied: ${moves}. Versus main the metrics move like this: ${lines}. The deals that changed most: ${movers}. In two or three sentences, explain what this branch does to my quarter and whether I should commit it.`;
}

/* ---------- react hook ---------- */
export function useBranches() {
  const [snap, setSnap] = useState(branches);
  useEffect(() => {
    const fn = (b) => setSnap([...b]);
    subs.add(fn); fn(branches);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
