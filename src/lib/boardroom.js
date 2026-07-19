// ============================================================
// ARDOVO BOARDROOM - the Autonomous Revenue Council.
//
// Salesforce Summer '26 shipped "Agent Network" - a manager agent delegating to
// specialist agents. Ardovo goes further: a standing C-suite of agents that
// convene over your REAL pipeline, argue their positions from live revenue
// intelligence, reach a consensus, and file a decision memo you approve or
// override. Not a chatbot round-table - each seat reads a different slice of the
// book (forecast, risk, coverage, expansion, exposure) and defends it.
//
// Fully grounded + deterministic (intelligence-data.js), local-first
// (localStorage rally_boardroom_v1), pub/sub like store.js. Every decision is a
// propose-confirm: nothing touches the CRM until a human files the memo.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { pipelineValue, weightedForecast, winRate, createActivity } from './store.js';
import { teamQuarterlyQuota } from './forecasting-data.js';
import {
  intelSummary, forecastConfidence, pipelineAnomalies, dealScores,
  whitespaceSignals, nextBestActions, winLossPatterns,
} from './intelligence-data.js';

const LS_KEY = 'rally_boardroom_v1';
const k = (n) => `$${n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : Math.round(n)}`;

export const SEATS = [
  { id: 'cro', title: 'Chief Revenue Agent', icon: 'target', domain: 'The number' },
  { id: 'revops', title: 'RevOps Agent', icon: 'workflow', domain: 'Pipeline hygiene' },
  { id: 'dealdesk', title: 'Deal Desk Agent', icon: 'shield', domain: 'Risk + rescue' },
  { id: 'demand', title: 'Demand Gen Agent', icon: 'megaphone', domain: 'Coverage' },
  { id: 'retention', title: 'Retention Agent', icon: 'users', domain: 'Expansion' },
  { id: 'finance', title: 'Finance Agent', icon: 'dollar', domain: 'Exposure' },
];

/* ============================================================
   convene() - run the council over the live book. Deterministic.
   ============================================================ */
export function convene() {
  const sum = intelSummary();
  const conf = forecastConfidence();
  const anomalies = pipelineAnomalies();
  const scores = dealScores();
  const white = whitespaceSignals();
  const moves = nextBestActions(8);
  const wl = winLossPatterns();

  const pipeline = pipelineValue();
  const weighted = weightedForecast();
  const quota = teamQuarterlyQuota() || 0;
  const coverage = quota ? pipeline / quota : 0;
  const highRisk = scores.filter(s => s.tier === 'high');
  const topRisk = highRisk[0] || scores[0] || null;
  const expansion = white.filter(w => w.kind === 'expansion');
  const expansionPot = expansion.reduce((s, w) => s + (w.potential || 0), 0);
  const highAnoms = anomalies.filter(a => a.severity === 'high');

  const vote = (v) => v; // 'press' | 'hold' | 'defend'

  const seats = [
    {
      ...SEATS[0],
      stance: sum.confidence >= 70 ? 'bull' : sum.confidence >= 50 ? 'neutral' : 'bear',
      confidence: sum.confidence,
      argument: `Weighted forecast is ${k(weighted)} against a ${k(quota)} quota, confidence ${sum.confidence}% (${sum.confidenceLabel}). ${k(sum.atRiskValue)} of open pipeline sits in the high-risk tier. ${sum.confidence >= 70 ? 'We are positioned to make the number if we protect what is committed.' : 'We are short of a clean call and cannot coast.'}`,
      recommendation: sum.confidence >= 70 ? 'Protect committed deals; do not chase discounts.' : 'Defend the base and pull best-case into commit with evidence.',
      vote: vote(sum.confidence >= 70 ? 'press' : 'defend'),
    },
    {
      ...SEATS[1],
      stance: highAnoms.length ? 'bear' : anomalies.length ? 'neutral' : 'bull',
      confidence: Math.max(30, 90 - anomalies.length * 12),
      argument: anomalies.length
        ? `${anomalies.length} anomaly signal${anomalies.length === 1 ? '' : 's'} in the book, ${highAnoms.length} high severity. Top: ${anomalies[0].title}. ${anomalies[0].detail}`
        : 'The book is clean: no slippage, concentration, or activity deserts worth flagging this cycle.',
      recommendation: anomalies.length ? `Fix data integrity first: ${anomalies[0].title.toLowerCase()}.` : 'Hold the line on hygiene; no intervention needed.',
      vote: vote(highAnoms.length ? 'defend' : 'hold'),
    },
    {
      ...SEATS[2],
      stance: highRisk.length >= 3 ? 'bear' : highRisk.length ? 'neutral' : 'bull',
      confidence: topRisk ? topRisk.score : 40,
      argument: topRisk
        ? `${highRisk.length} deal${highRisk.length === 1 ? '' : 's'} in the high-risk tier. The one that keeps me up: ${topRisk.company?.name || topRisk.deal.name} (${k(topRisk.deal.value)}, risk ${topRisk.score}). ${topRisk.reasons?.[0] || 'It is drifting.'}`
        : 'No deals in the high-risk tier right now. We can play offense.',
      recommendation: topRisk ? `Run a save play on ${topRisk.company?.name || topRisk.deal.name} this week.` : 'Reallocate rescue capacity to advancing mid-stage deals.',
      vote: vote(highRisk.length >= 3 ? 'defend' : highRisk.length ? 'hold' : 'press'),
    },
    {
      ...SEATS[3],
      stance: coverage >= 3 ? 'bull' : coverage >= 2 ? 'neutral' : 'bear',
      confidence: Math.min(95, Math.round(coverage * 28)),
      argument: `Pipeline coverage is ${coverage.toFixed(1)}x quota (${k(pipeline)} open vs ${k(quota)}). ${coverage >= 3 ? 'Coverage is healthy; the constraint is conversion, not volume.' : 'Coverage is thin - we do not have enough at-bats to absorb normal slippage.'}`,
      recommendation: coverage >= 3 ? 'Shift spend from net-new to acceleration of existing pipeline.' : 'Open the top of funnel now; we need more qualified pipeline this quarter.',
      vote: vote(coverage >= 3 ? 'hold' : 'press'),
    },
    {
      ...SEATS[4],
      stance: expansionPot > 0 ? 'bull' : 'neutral',
      confidence: expansion.length ? Math.min(90, 45 + expansion.length * 8) : 40,
      argument: expansion.length
        ? `${expansion.length} customer account${expansion.length === 1 ? '' : 's'} with no open deal represent ${k(expansionPot)} of untapped expansion. Cheapest revenue we have is the base we already won.`
        : 'No obvious whitespace this cycle; every customer already has an open motion.',
      recommendation: expansion.length ? `Open expansion plays on ${expansion.slice(0, 2).map(w => w.company?.name).filter(Boolean).join(' and ') || 'top customers'}.` : 'Protect renewals; no new expansion motions to open.',
      vote: vote(expansion.length ? 'press' : 'hold'),
    },
    {
      ...SEATS[5],
      stance: sum.atRiskValue > sum.openValue * 0.35 ? 'bear' : 'neutral',
      confidence: Math.max(35, Math.round(sum.healthyShare)),
      argument: `${sum.healthyShare}% of open pipeline is healthy; ${k(sum.atRiskValue)} is exposed. Historical win rate is ${wl.winRate}% at an average won deal of ${k(wl.avgWon || 0)}. Discounting into a thin quarter erodes margin we do not get back.`,
      recommendation: sum.atRiskValue > sum.openValue * 0.35 ? 'Cap discretionary discounting; require desk approval past policy.' : 'Hold pricing discipline; exposure is within tolerance.',
      vote: vote(sum.atRiskValue > sum.openValue * 0.35 ? 'defend' : 'hold'),
    },
  ];

  // Consensus - tally the room.
  const tally = seats.reduce((m, s) => { m[s.vote] = (m[s.vote] || 0) + 1; return m; }, {});
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || 'hold';
  const consensusMeta = {
    press: { headline: 'Press the advantage', rationale: 'The room reads a book strong enough to lean into. Reallocate toward acceleration and expansion, protect the committed base.' },
    hold: { headline: 'Hold and tighten', rationale: 'Mixed signals. No dramatic move. Fix the leaks, keep pricing discipline, and convert what we have.' },
    defend: { headline: 'Defend the quarter', rationale: 'Risk and exposure outweigh momentum. Protect committed deals, fix hygiene first, and do not buy the number with margin.' },
  }[winner];

  // Decision memo - the real prioritized worklist becomes proposed decisions.
  const decisions = moves.slice(0, 5).map((m) => ({
    id: m.id, title: `${m.kind}: ${m.title}`, detail: m.reason, impact: m.impact, impactLabel: m.impactLabel,
    owner: m.meta || 'Deal owner', to: m.to || null, sub: m.sub || '',
    // propose-confirm: filing the memo logs a directed task on the record
    action: { kind: 'task', subject: `Boardroom directive: ${m.kind} - ${m.title}`, body: m.reason, to: m.to },
  }));

  const debate = buildDebate(seats, consensusMeta, { sum, coverage, quota, weighted });

  return {
    id: `bd_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    headline: consensusMeta.headline,
    rationale: consensusMeta.rationale,
    vote: winner, tally,
    seats, debate, decisions,
    metrics: {
      pipeline, weighted, quota, coverage: Math.round(coverage * 10) / 10,
      confidence: sum.confidence, atRisk: sum.atRiskValue, openValue: sum.openValue,
      highRisk: highRisk.length, expansionPot,
    },
    filed: false,
  };
}

function buildDebate(seats, consensus, ctx) {
  const lines = [];
  lines.push({ speaker: 'Chair', seat: 'cro', text: `Council convened over the live book. ${k(ctx.weighted)} weighted against ${k(ctx.quota)}, confidence ${ctx.sum.confidence}%. Positions, please.` });
  for (const s of seats.slice(1)) {
    lines.push({ speaker: s.title, seat: s.id, text: s.argument, stance: s.stance });
  }
  // one cross-talk beat between coverage and finance
  const demand = seats.find(s => s.id === 'demand');
  const finance = seats.find(s => s.id === 'finance');
  if (demand && finance) {
    lines.push({ speaker: finance.title, seat: 'finance', text: `To ${demand.title.split(' ')[0]}'s point on coverage: opening funnel is fine, but not by discounting the deals already in flight. Volume cannot be bought with margin.`, stance: 'bear' });
  }
  lines.push({ speaker: 'Chair', seat: 'cro', text: `Heard. The room lands on: ${consensus.headline}. ${consensus.rationale} Filing the memo for human sign-off.`, stance: 'chair' });
  return lines;
}

/* ---------- persistence + pub/sub ---------- */
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.sessions)) return { sessions: s.sessions, draft: s.draft || null, lastAutoAt: s.lastAutoAt || null }; }
  } catch {}
  return { sessions: [], draft: null, lastAutoAt: null };
}
let state = load();
const subs = new Set();
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function useBoardroom(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
export const getSessions = () => state.sessions;
export const lastSession = () => state.sessions[0] || null;

// The freshest memo for at-a-glance surfaces (Command Center): the standing
// auto-convened draft, else the most recently filed memo.
export const latestBrief = () => state.draft || state.sessions[0] || null;

// Auto-convene on a nightly-ish cadence so a fresh memo is always waiting. Runs
// deterministically off the live book, persists an UNFILED draft (no CRM writes
// until a human files it). Re-convenes only when the draft is older than ~18h.
export function autoConvene(force = false) {
  const now = Date.now();
  if (!force && state.draft && state.lastAutoAt && (now - state.lastAutoAt) < 18 * 3600 * 1000) return state.draft;
  const s = convene();
  commit({ ...state, draft: s, lastAutoAt: now });
  return s;
}

// File the memo: persist the session and commit each accepted decision as a
// directed task on the record. This is the human countersignature step.
export function fileMemo(session, acceptedIds = null) {
  if (!session) return { ok: false };
  const accepted = session.decisions.filter(d => !acceptedIds || acceptedIds.includes(d.id));
  let committed = 0;
  for (const d of accepted) {
    try {
      const relatedId = d.to && d.to.startsWith('/deals/') ? d.to.split('/deals/')[1] : null;
      createActivity({ type: 'task', subject: d.action.subject, body: d.action.body || '', relatedType: relatedId ? 'deal' : null, relatedId, done: false, system: true });
      committed++;
    } catch {}
  }
  const filed = { ...session, filed: true, filedAt: new Date().toISOString(), committed, acceptedIds: accepted.map(a => a.id) };
  const clearDraft = state.draft && state.draft.id === session.id;
  commit({ ...state, sessions: [filed, ...state.sessions].slice(0, 40), draft: clearDraft ? null : state.draft });
  return { ok: true, committed };
}

export { k as fmtMoney };
