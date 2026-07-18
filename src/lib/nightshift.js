// ============================================================
// ARDOVO NIGHT SHIFT  +  DIFF OF RECORD  +  MANDATE
// A reversible autonomous operator with an IAM envelope.
//
// Rook works the whole pipeline overnight: it advances deals whose
// evidence outran their stage, drafts follow-ups into a STAGED outbox
// (nothing auto-sends), and creates next-best tasks. In the morning it
// hands you a git-style "Diff of Record": every proposed change as a
// reversible entry you approve / reject / approve-all, each carrying its
// provenance (the real signals that triggered it) and a rationale.
//
// The Mandate is the IAM envelope: deal-size caps, per-deal touch
// budgets, a no-discount rule, and per-capability switches. Anything
// outside the lines does NOT execute. It auto-escalates as a decision
// card (src/lib/notifications-data.js) for a human to handle.
//
// GUARANTEES (why this is safe enough to ship autonomy):
//   1. compute() is a PURE READ of the live store + intelligence-data.js.
//      It writes NOTHING. It only stages proposals in this slice.
//   2. No existing store writer is ever called until the user approves a
//      specific proposal in the Diff of Record UI.
//   3. Every applied mutation stores its INVERSE, so a one-click Revert
//      replays the exact undo through the normal writers (audited).
//
// This module is ADDITIVE and self-contained. Its own state persists to
// localStorage (rally_nightshift_v1) with the same pub/sub shape as the
// rest of the local-first stores, so the UI stays reactive.
//
// SUPABASE: rally_nightshift_runs + rally_nightshift_proposals (per-user
// rows). compute() becomes an edge function on a nightly cron; the
// mandate lives in rally_nightshift_mandate; escalations fan out to
// rally_notifications.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getDeal, stageById, STAGES, moveDealStage, createActivity, deleteActivity,
} from './store.js';
import { dealScores } from './intelligence-data.js';
import { pushNotification } from './notifications-data.js';

const LS_KEY = 'rally_nightshift_v1';
const DAY = 86400000;

/* Open stages in order, used to compute a "next stage" for an advance. */
const OPEN_ORDERED = STAGES.filter(s => s.type === 'open').sort((a, b) => a.order - b.order);

/* ---------- compact money (self-contained, matches the app) ---------- */
function k(n) {
  if (n == null) return '$0';
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}

/* ============================================================
   THE MANDATE  (IAM envelope defaults)
   ============================================================ */
export const DEFAULT_MANDATE = {
  enabled: true,            // master autonomy switch
  maxDealValue: 250000,     // Rook will not mutate deals above this size
  maxTouchesPerDeal: 2,     // per-deal action budget per run
  maxProposalsPerRun: 12,   // total volume cap
  allowStageAdvance: true,  // may advance a stage when evidence outran it
  allowDrafts: true,        // may stage a follow-up draft (never sends)
  allowTasks: true,         // may create a next-best task
  noDiscount: true,         // never propose a price concession (informational guard)
};

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function freshState() {
  return { mandate: { ...DEFAULT_MANDATE }, lastRunAt: null, proposals: [], escalations: [] };
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        mandate: { ...DEFAULT_MANDATE, ...(s.mandate || {}) },
        lastRunAt: s.lastRunAt || null,
        proposals: Array.isArray(s.proposals) ? s.proposals : [],
        escalations: Array.isArray(s.escalations) ? s.escalations : [],
      };
    }
  } catch {}
  return freshState();
}

let state = load();
const subs = new Set();
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function getNightShift() { return state; }
export function getMandate() { return state.mandate; }
export function resetNightShift() { commit(freshState()); }

export function useNightShift(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   MANDATE WRITES
   ============================================================ */
export function updateMandate(patch) {
  const mandate = { ...state.mandate, ...patch };
  commit({ ...state, mandate });
  return mandate;
}

/* ============================================================
   COMPUTE  (the overnight pass - PURE READ, writes nothing)
   Builds staged proposals + escalations from the live book. Every
   proposal carries a `forward` descriptor (executed only on approve)
   and enough provenance for the Diff of Record to show receipts.
   ============================================================ */

/* Build the candidate proposals for one scored deal (no mandate applied
   yet). Returns an array of "raw" proposals, richest signal first. */
function candidatesForDeal(s) {
  const d = s.deal;
  const st = stageById(d.stage);
  const f = s.factors;
  const companyName = s.company?.name || d.name;
  const owner = s.owner;
  const out = [];

  // 1. STAGE ADVANCE - evidence outran the stage. Healthy, multi-threaded,
  //    recently active, not high-risk, sitting below Negotiation.
  const nextStage = OPEN_ORDERED.find(x => x.order === (st?.order || 0) + 1);
  if (
    nextStage && (st?.order || 0) >= 2 && (st?.order || 0) <= 4 &&
    s.tier !== 'high' && f.contacts >= 2 && f.touchDays <= 12 && f.prob >= (st?.probability || 0)
  ) {
    out.push({
      kind: 'advance',
      dealId: d.id, dealName: d.name, companyName, owner, value: d.value,
      title: `Advance ${st.name} -> ${nextStage.name}`,
      before: st.name,
      after: nextStage.name,
      rationale: `The evidence has outrun the stage: ${f.prob}% win probability, ${f.contacts} stakeholders engaged, active ${f.touchDays === 0 ? 'today' : f.touchDays + 'd ago'}. Rook would move it forward to keep the record honest.`,
      provenance: [
        `Stage ${st.name} at ${f.prob}% (stage floor ${st.probability}%).`,
        `${f.contacts} contacts engaged - multi-threaded.`,
        `Last activity ${f.touchDays === 0 ? 'today' : f.touchDays + ' days ago'}.`,
        ...(s.positives || []),
      ],
      forward: { op: 'moveDealStage', dealId: d.id, stageId: nextStage.id },
    });
  }

  // 2. DRAFT FOLLOW-UP (staged outbox, never auto-sends) - cold or at-risk.
  if (s.tier === 'high' || f.touchDays >= 12) {
    const draftBody = buildDraft(s, companyName);
    out.push({
      kind: 'draft',
      dealId: d.id, dealName: d.name, companyName, owner, value: d.value,
      title: `Draft follow-up to ${companyName}`,
      before: 'No follow-up queued',
      after: 'Follow-up staged (not sent)',
      rationale: `Momentum has cooled - ${f.touchDays === Infinity ? 'no activity on record' : 'no touch in ' + f.touchDays + 'd'}. Rook drafted a re-engagement note. Nothing sends; approving only logs the draft as a task on the deal.`,
      provenance: [
        s.reasons?.[0] || 'Deal has gone quiet.',
        `Risk score ${s.score} (${s.tier}).`,
        `Owner: ${owner}.`,
      ],
      draft: draftBody,
      forward: {
        op: 'createActivity',
        activity: {
          type: 'email',
          subject: `Follow up: ${companyName}`,
          body: draftBody,
          done: false,
          relatedType: 'deal',
          relatedId: d.id,
          companyId: d.companyId,
          ownerId: d.ownerId,
          nightShift: true,
        },
      },
    });
  }

  // 3. NEXT-BEST TASK - single-threaded big deal, or a rescue on high risk.
  if (f.contacts <= 1 && d.value >= 100000) {
    out.push(taskProposal(s, companyName, owner,
      `Multi-thread ${companyName}`,
      `Add a second stakeholder on ${d.name}`,
      `A ${k(d.value)} deal is riding on ${f.contacts || 'no'} contact. Rook would open a task to widen the relationship before it decides without you.`,
      [`Only ${f.contacts || 0} contact on a ${k(d.value)} deal.`, s.reasons?.[0] || 'Single point of failure.']));
  } else if (s.tier === 'high') {
    out.push(taskProposal(s, companyName, owner,
      `Rescue ${companyName}`,
      `Rescue call: ${d.name}`,
      `This deal is drifting (risk ${s.score}). Rook would put a hands-on save on your list before the forecast call.`,
      [s.reasons?.[0] || 'Deal is at risk.', `Risk score ${s.score}.`]));
  }

  return out;
}

function taskProposal(s, companyName, owner, title, subject, rationale, provenance) {
  const d = s.deal;
  return {
    kind: 'task',
    dealId: d.id, dealName: d.name, companyName, owner, value: d.value,
    title,
    before: 'No task',
    after: `Task: ${subject}`,
    rationale,
    provenance,
    forward: {
      op: 'createActivity',
      activity: {
        type: 'task',
        subject,
        body: '',
        done: false,
        dueAt: new Date(Date.now() + 2 * DAY).toISOString(),
        relatedType: 'deal',
        relatedId: d.id,
        companyId: d.companyId,
        ownerId: d.ownerId,
        nightShift: true,
      },
    },
  };
}

/* A short, grounded re-engagement draft. Deterministic, no fabrication of
   facts the store does not have. */
function buildDraft(s, companyName) {
  const f = s.factors;
  const gap = f.touchDays === Infinity ? 'a while' : `${f.touchDays} days`;
  return [
    `Hi - circling back on ${companyName}.`,
    ``,
    `It has been ${gap} since we last connected and I want to make sure ${s.deal.name.replace(companyName + ' - ', '')} still has what it needs to move. Where are you on the internal timeline, and is there anyone else I should be looping in?`,
    ``,
    `Happy to grab 20 minutes this week.`,
  ].join('\n');
}

/* Does a proposal fit inside the Mandate? Returns { ok } or { ok:false, reason }. */
function checkMandate(p, mandate, touchesUsed) {
  if (p.kind === 'advance' && !mandate.allowStageAdvance) return { ok: false, reason: 'Stage advances are disabled in your Mandate.' };
  if (p.kind === 'draft' && !mandate.allowDrafts) return { ok: false, reason: 'Drafting is disabled in your Mandate.' };
  if (p.kind === 'task' && !mandate.allowTasks) return { ok: false, reason: 'Task creation is disabled in your Mandate.' };
  // Deal-size cap governs writes that touch the deal itself (advance/task).
  if ((p.kind === 'advance' || p.kind === 'task') && p.value > mandate.maxDealValue) {
    return { ok: false, reason: `${k(p.value)} exceeds the ${k(mandate.maxDealValue)} deal-size cap in your Mandate.` };
  }
  if ((touchesUsed[p.dealId] || 0) >= mandate.maxTouchesPerDeal) {
    return { ok: false, reason: `Per-deal touch budget (${mandate.maxTouchesPerDeal}) already spent on this deal.` };
  }
  return { ok: true };
}

/* Run the overnight pass. Pure read: stages proposals + escalations into
   this slice and fans escalations out as decision cards. Returns a summary. */
export function runNightShift() {
  const mandate = state.mandate;
  const at = new Date().toISOString();

  if (!mandate.enabled) {
    commit({ ...state, lastRunAt: at });
    return { staged: 0, escalated: 0, disabled: true };
  }

  const scores = dealScores();
  const staged = [];
  const escalations = [];
  const touchesUsed = {};

  for (const s of scores) {
    if (staged.length >= mandate.maxProposalsPerRun) break;
    const cands = candidatesForDeal(s);
    for (const c of cands) {
      if (staged.length >= mandate.maxProposalsPerRun) break;
      const verdict = checkMandate(c, mandate, touchesUsed);
      if (verdict.ok) {
        touchesUsed[c.dealId] = (touchesUsed[c.dealId] || 0) + 1;
        staged.push({
          ...c,
          id: newId('nsp'),
          status: 'staged',
          inverse: null,
          createdAt: at,
          appliedAt: null,
          revertedAt: null,
        });
      } else {
        escalations.push({
          id: newId('nse'),
          dealId: c.dealId, dealName: c.dealName, companyName: c.companyName,
          value: c.value, kind: c.kind, title: c.title,
          reason: verdict.reason, rationale: c.rationale,
          createdAt: at,
        });
      }
    }
  }

  // Fan escalations out as decision cards (one card, deduped per run).
  if (escalations.length) {
    try {
      pushNotification({
        type: 'update',
        actor: 'Rook',
        title: `Night Shift escalated ${escalations.length} change${escalations.length === 1 ? '' : 's'} for your call`,
        body: `${escalations.length} proposed change${escalations.length === 1 ? '' : 's'} fell outside your Mandate and need a human. Review them in Night Shift.`,
        target: { to: '/night-shift', label: 'Night Shift' },
      });
    } catch {}
  }

  commit({ ...state, lastRunAt: at, proposals: staged, escalations });
  return { staged: staged.length, escalated: escalations.length, at };
}

/* ============================================================
   APPLY / REVERT  (the only place writers are ever called)
   ============================================================ */

/* Execute a forward descriptor through the normal store writers. Returns
   the concrete inverse descriptor so a later Revert is exact. */
function execForward(op) {
  if (op.op === 'moveDealStage') {
    const d = getDeal(op.dealId);
    const prevStage = d?.stage;                 // capture BEFORE the write
    const res = moveDealStage(op.dealId, op.stageId);
    if (res?.error) return { error: res.message };
    return { inverse: { op: 'moveDealStage', dealId: op.dealId, stageId: prevStage } };
  }
  if (op.op === 'createActivity') {
    const res = createActivity(op.activity);
    if (res?.error) return { error: res.message };
    return { inverse: { op: 'deleteActivity', activityId: res.activity.id } };
  }
  return { error: 'Unknown operation.' };
}

/* Execute an inverse descriptor (the undo). */
function execInverse(op) {
  if (op.op === 'moveDealStage') {
    const res = moveDealStage(op.dealId, op.stageId);
    return res?.error ? { error: res.message } : { ok: true };
  }
  if (op.op === 'deleteActivity') {
    const res = deleteActivity(op.activityId);
    // A missing activity means it is already gone - treat as reverted.
    return { ok: true, softMissing: !!res?.error };
  }
  return { error: 'Unknown inverse.' };
}

/* Approve one staged proposal: fire its writer, record the inverse. */
export function approveProposal(id) {
  const p = state.proposals.find(x => x.id === id);
  if (!p || p.status !== 'staged') return { error: 'Not a staged proposal.' };
  const r = execForward(p.forward);
  if (r.error) return { error: r.error };
  const proposals = state.proposals.map(x => x.id === id
    ? { ...x, status: 'approved', inverse: r.inverse, appliedAt: new Date().toISOString() }
    : x);
  commit({ ...state, proposals });
  return { ok: true };
}

/* Reject one staged proposal (no writer fires - it just leaves the queue). */
export function rejectProposal(id) {
  const proposals = state.proposals.map(x => x.id === id && x.status === 'staged'
    ? { ...x, status: 'rejected' } : x);
  commit({ ...state, proposals });
  return { ok: true };
}

/* Revert an approved proposal by replaying its stored inverse write. */
export function revertProposal(id) {
  const p = state.proposals.find(x => x.id === id);
  if (!p || p.status !== 'approved' || !p.inverse) return { error: 'Nothing to revert.' };
  const r = execInverse(p.inverse);
  if (r.error) return { error: r.error };
  const proposals = state.proposals.map(x => x.id === id
    ? { ...x, status: 'reverted', revertedAt: new Date().toISOString() }
    : x);
  commit({ ...state, proposals });
  return { ok: true };
}

/* Approve every currently-staged proposal (the "approve-all" path). Each
   still fires its own writer and stores its own inverse, so a mass approve
   is still reversible entry-by-entry. */
export function approveAll() {
  let n = 0;
  for (const p of state.proposals.filter(x => x.status === 'staged')) {
    const r = approveProposal(p.id);
    if (r.ok) n++;
  }
  return { approved: n };
}

/* Clear rejected/reverted noise from the ledger (keeps active + approved). */
export function dismissProposal(id) {
  const proposals = state.proposals.filter(x => x.id !== id);
  commit({ ...state, proposals });
  return { ok: true };
}

/* ---------- read helpers for the UI ---------- */
export function nightShiftSummary() {
  const p = state.proposals;
  const staged = p.filter(x => x.status === 'staged');
  const approved = p.filter(x => x.status === 'approved');
  const atStake = staged.reduce((s, x) => s + (x.value || 0), 0);
  return {
    lastRunAt: state.lastRunAt,
    staged: staged.length,
    approved: approved.length,
    reverted: p.filter(x => x.status === 'reverted').length,
    rejected: p.filter(x => x.status === 'rejected').length,
    escalated: state.escalations.length,
    atStake,
    dealsTouched: new Set(staged.map(x => x.dealId)).size,
  };
}
export { k as fmtMoney };
