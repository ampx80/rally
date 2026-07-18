// ============================================================
// ARDOVO GHOST DEALS  -  counterfactual regret over your own graveyard
// ------------------------------------------------------------
// For every deal you LOST, reconstruct the record as it stood the day it
// died, treat it as still-winnable, then fork that twin and toggle ONE
// grounded intervention at a time (re-engage with an exec review, bring in
// the economic buyer, reach proposal sooner, match the concession the
// winners gave). Each fork is re-scored with the EXACT same deterministic
// risk model the live Intelligence surface uses (scoreDeal), so the
// win-probability lift is measured, not hallucinated. The "ghost path" is
// the branch where you made the move you skipped; it is compared against the
// closest deal that actually WON so the divergence is real, not theatre.
//
// 100% additive + read-only: reads store deals/activities/contacts, the depth
// store's deal extras (committee roles, line-item discounts, loss reasons),
// and re-runs intelligence-data.scoreDeal on cloned twins. It never writes.
// SUPABASE: becomes an RPC over rally_deals x rally_activities with the same
// scoring UDF; the fork/replay stays client-side.
// ============================================================
import {
  getDeals, getDeal, getCompany, getContact, getContactsForCompany,
  getActivities, stageById, STAGES, contactName,
} from './store.js';
import { getDealExtras } from './store-depth.js';
import { scoreDeal } from './intelligence-data.js';

const DAY = 86400000;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* compact money, self-contained so this stays a pure data module */
function k(n) {
  if (n == null) return '$0';
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}

// Open pipeline stages in order (lead..negotiation) plus the won terminal.
const OPEN_ORDERED = STAGES.filter(s => s.type === 'open').sort((a, b) => a.order - b.order);
const WON_STAGE = STAGES.find(s => s.type === 'won');

// A deal's win probability as a monotonic function of its risk score. The risk
// model returns 0..96 (higher = more likely to slip); we invert it into a
// bounded win probability. Interventions only move win prob by moving risk, so
// every delta below is a pure consequence of re-running scoreDeal on a fork.
const winFromRisk = (risk) => clamp(Math.round(90 - risk * 0.85), 3, 92);

/* ---------- activity index (deal id -> activities) ---------- */
function actsByDealMap() {
  const map = new Map();
  for (const a of getActivities()) {
    if (a.relatedType !== 'deal' || !a.relatedId) continue;
    const arr = map.get(a.relatedId) || [];
    arr.push(a);
    map.set(a.relatedId, arr);
  }
  return map;
}

const actTime = (a) => new Date(a.createdAt || a.dueAt).getTime();

/* ============================================================
   GROUNDED SIGNALS  -  everything read from real fields
   ============================================================ */
function dealSignals(d, acts, extras) {
  const created = new Date(d.createdAt).getTime();
  const close = new Date(d.closeDate).getTime();
  const cycle = Math.max(1, Math.round((close - created) / DAY));
  let lastTouch = null, meetings = 0, execTouch = false, proposalTouch = false;
  for (const a of acts) {
    const t = actTime(a);
    if (lastTouch == null || t > lastTouch) lastTouch = t;
    const s = (a.subject || '').toLowerCase();
    if (a.type === 'meeting') meetings++;
    if (a.type === 'meeting' && /exec|review|deep dive|kickoff/.test(s)) execTouch = true;
    if (/proposal|pricing|contract|quote/.test(s)) proposalTouch = true;
  }
  const silenceDays = lastTouch == null ? cycle : Math.max(0, Math.round((close - lastTouch) / DAY));
  const stakeholders = extras.stakeholders || [];
  const contacts = (d.contactIds || []).length;
  return {
    industry: getCompany(d.companyId)?.industry || 'Other',
    value: d.value,
    cycle,
    contacts,
    committee: stakeholders.length || contacts,
    hasEB: stakeholders.some(s => s.role === 'Economic Buyer'),
    hasChampion: stakeholders.some(s => s.role === 'Champion'),
    activities: acts.length,
    meetings,
    execTouch,
    proposalTouch,
    silenceDays,
    lastTouch,
    maxDiscount: (extras.lineItems || []).reduce((m, li) => Math.max(m, li.discount || 0), 0),
    competitors: extras.competitors || [],
    lossReason: extras.lossReason || '',
  };
}

// Furthest stage the dead deal plausibly reached, inferred from real activity
// subjects + the logged loss reason (deterministic, no randomness).
function reachedStageId(d, acts, extras) {
  if (d.status === 'open') return d.stage;
  let order = 2; // qualified floor for a deal that closed lost
  const bump = (o) => { if (o > order) order = o; };
  for (const a of acts) {
    const s = (a.subject || '').toLowerCase();
    if (/contract|redline|msa|negotiat/.test(s)) bump(5);
    else if (/proposal|pricing|quote/.test(s)) bump(4);
    else if (/demo|technical|deep dive|discovery|review/.test(s)) bump(3);
    else if (/qualif|budget|intro/.test(s)) bump(2);
  }
  if (acts.length >= 5) bump(4);
  else if (acts.length >= 3) bump(3);
  const loss = (extras.lossReason || '').toLowerCase();
  if (/incumbent|salesforce|hubspot/.test(loss)) bump(4); // competed to the end
  if (/no budget|timing|no decision|stalled/.test(loss)) order = Math.min(order, 3); // stalled mid
  order = clamp(order, 2, 5);
  return (STAGES.find(s => s.order === order) || stageById('discovery')).id;
}

// Revive the dead deal as it stood at death, as a still-winnable open twin.
// closeDate is pushed out 21d so the reconstruction is not penalised for the
// trivial "it is past close" fact; the risk that remains is the REAL leak
// (went silent, single-threaded, sat too long in an early stage).
function reviveTwin(d, reached) {
  const close = new Date(d.closeDate).getTime();
  const st = stageById(reached);
  return {
    ...d,
    contactIds: [...(d.contactIds || [])],
    stage: reached,
    probability: st.probability,
    status: 'open',
    closeDate: new Date(close + 21 * DAY).toISOString(),
  };
}

// Re-run the real risk model on a twin with a supplied activity list.
function riskOf(twin, acts, now) {
  const map = new Map([[twin.id, acts]]);
  return scoreDeal(twin, { now, actsByDeal: map }).score;
}

// Rank company contacts not yet on the deal by how "decision-grade" they are,
// so multi-threading suggests the most valuable missing stakeholder.
function bestMissingContact(d) {
  const on = new Set(d.contactIds || []);
  const pool = getContactsForCompany(d.companyId).filter(c => !on.has(c.id));
  const rank = (c) => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    const title = (c.title || '').toLowerCase();
    let s = 0;
    if (tags.includes('economic buyer')) s += 6;
    if (tags.includes('decision maker')) s += 5;
    if (tags.includes('champion')) s += 4;
    if (/chief|cfo|coo|cto|ceo/.test(title)) s += 4;
    if (/vp|head|director/.test(title)) s += 2;
    return s;
  };
  return pool.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))[0] || null;
}

/* ============================================================
   CLOSEST WON ANALOG  (own-history similarity, not synthetic)
   ============================================================ */
function bandIndex(v) {
  if (v < 50000) return 0;
  if (v < 150000) return 1;
  if (v < 300000) return 2;
  return 3;
}
function analogDistance(a, b) {
  const industry = a.industry === b.industry ? 0 : 1;
  const value = Math.abs(bandIndex(a.value) - bandIndex(b.value)) / 3;
  const cycle = clamp(Math.abs(a.cycle - b.cycle) / 120, 0, 1);
  const committee = clamp(Math.abs(a.committee - b.committee) / 4, 0, 1);
  return industry * 2.6 + value * 1.6 + cycle * 1.0 + committee * 0.9;
}
const MAX_DIST = 2.6 + 1.6 + 1.0 + 0.9;

function wonAnalogPool(ctx) {
  if (ctx._wonPool) return ctx._wonPool;
  const pool = [];
  for (const d of getDeals()) {
    if (d.status !== 'won') continue;
    const acts = ctx.actsByDeal.get(d.id) || [];
    const extras = getDealExtras(d.id);
    pool.push({ deal: d, sig: dealSignals(d, acts, extras) });
  }
  ctx._wonPool = pool;
  return pool;
}

function closestAnalog(sig, ctx) {
  const pool = wonAnalogPool(ctx);
  let best = null, bestD = Infinity;
  for (const w of pool) {
    const dist = analogDistance(sig, w.sig);
    if (dist < bestD) { bestD = dist; best = w; }
  }
  if (!best) return null;
  return { ...best, similarity: Math.round(clamp(1 - bestD / MAX_DIST, 0, 1) * 100) };
}

// What the winning analog did that the dead deal did not - the real divergence.
function divergences(sig, analog) {
  if (!analog) return [];
  const a = analog.sig;
  const out = [];
  if (a.committee > sig.committee) {
    out.push({ icon: 'users', label: 'Stakeholders', mine: `${sig.committee}`, theirs: `${a.committee}`,
      text: `The win closed with ${a.committee} stakeholders mapped; this deal rode on ${sig.committee}.` });
  }
  if (a.execTouch && !sig.execTouch) {
    out.push({ icon: 'target', label: 'Executive air-cover', mine: 'none', theirs: 'yes',
      text: `The win logged an executive review. This deal never got one above the champion.` });
  }
  if (a.cycle < sig.cycle - 7) {
    out.push({ icon: 'clock', label: 'Sales cycle', mine: `${sig.cycle}d`, theirs: `${a.cycle}d`,
      text: `The win moved ${sig.cycle - a.cycle} days faster from open to close. Momentum compounds.` });
  }
  if (a.maxDiscount > sig.maxDiscount + 4) {
    out.push({ icon: 'dollar', label: 'Concession', mine: `${sig.maxDiscount}%`, theirs: `${a.maxDiscount}%`,
      text: `The win landed with a ${a.maxDiscount}% concession; this deal held at ${sig.maxDiscount}%.` });
  }
  if (a.hasEB && !sig.hasEB) {
    out.push({ icon: 'shield', label: 'Economic buyer', mine: 'unmapped', theirs: 'engaged',
      text: `The win had the economic buyer engaged; on this one the budget owner was never in the room.` });
  }
  return out;
}

/* ============================================================
   INTERVENTION SWEEP  (fork -> mutate one lever -> re-score)
   ============================================================ */
const CATEGORY = {
  momentum: { label: 'Momentum', color: 'var(--info)' },
  multithread: { label: 'Multithreading', color: 'var(--accent)' },
  velocity: { label: 'Velocity', color: 'var(--accent-teal)' },
  pricing: { label: 'Pricing', color: 'var(--warn)' },
};

function sweepInterventions(d, twin, acts, reached, deathTime, sig, analog, baseWin) {
  const reachedOrder = stageById(reached)?.order || 3;
  const out = [];
  const push = (o) => { if (o.delta > 0) out.push(o); };

  // 1. MOMENTUM - inject a late executive review, clearing the silence gap.
  if (sig.silenceDays > 14) {
    const injected = [...acts, {
      id: 'ghost_exec', type: 'meeting', subject: 'Executive review',
      createdAt: new Date(deathTime - 3 * DAY).toISOString(),
      dueAt: new Date(deathTime - 3 * DAY).toISOString(),
      relatedType: 'deal', relatedId: twin.id,
    }];
    const win = winFromRisk(riskOf(twin, injected, deathTime));
    push({
      key: 'momentum', category: 'momentum', label: 'Re-engage with an executive review',
      stageId: reached,
      detail: `The deal went quiet for ${sig.silenceDays} days before it died. A single executive review at ${stageById(reached)?.name} re-warms a cooling deal and buys a real next step.`,
      delta: Math.max(0, win - baseWin), win, basis: 'model',
    });
  }

  // 2. MULTITHREAD - add the strongest missing stakeholder (EB if none mapped).
  const add = bestMissingContact(d);
  if (add && (sig.contacts <= 1 || !sig.hasEB)) {
    const twin2 = { ...twin, contactIds: [...twin.contactIds, add.id] };
    const win = winFromRisk(riskOf(twin2, acts, deathTime));
    const ebGap = !sig.hasEB;
    push({
      key: 'multithread', category: 'multithread',
      label: ebGap ? 'Bring the economic buyer to the table' : 'Multi-thread a second champion',
      stageId: reachedOrder >= 4 ? reached : 'discovery',
      detail: ebGap
        ? `No economic buyer was ever mapped. ${contactName(add)}${add.title ? ` (${add.title})` : ''} at ${getCompany(d.companyId)?.name || 'the account'} was on the account and never brought in. A lone champion is a single point of failure.`
        : `The deal rode on ${sig.contacts} contact${sig.contacts === 1 ? '' : 's'}. Adding ${contactName(add)}${add.title ? ` (${add.title})` : ''} widens the base before it decides without you.`,
      delta: Math.max(0, win - baseWin), win, basis: 'model',
      addContact: { id: add.id, name: contactName(add), title: add.title || '' },
    });
  }

  // 3. VELOCITY - reach the next stage sooner, clearing an early-stage stall.
  if (reachedOrder <= 3 && sig.cycle > 60) {
    const nextOrder = Math.min(reachedOrder + 1, 4);
    const nextStage = STAGES.find(s => s.order === nextOrder) || stageById('proposal');
    const twin3 = { ...twin, stage: nextStage.id, probability: nextStage.probability };
    const win = winFromRisk(riskOf(twin3, acts, deathTime));
    push({
      key: 'velocity', category: 'velocity', label: `Reach ${nextStage.name} sooner`,
      stageId: reached,
      detail: `The deal sat ${sig.cycle} days and never got past ${stageById(reached)?.name}. Deals that stall in an early stage rarely recover - compressing the cycle to ${nextStage.name} keeps the buyer's urgency intact.`,
      delta: Math.max(0, win - baseWin), win, basis: 'model',
    });
  }

  // 4. PRICING - match the concession the closest win actually gave. Grounded
  // in real line-item discounts (not the risk model), so it is flagged 'pricing'.
  if (analog && analog.sig.maxDiscount > sig.maxDiscount + 4) {
    const gap = analog.sig.maxDiscount - sig.maxDiscount;
    const delta = clamp(Math.round(gap * 0.6), 0, 14);
    push({
      key: 'pricing', category: 'pricing', label: `Match the ${analog.sig.maxDiscount}% concession the winners gave`,
      stageId: reachedOrder >= 4 ? reached : 'proposal',
      detail: `Your closest win landed at a ${analog.sig.maxDiscount}% concession; this deal held at ${sig.maxDiscount}%. On a price-sensitive committee a ${gap}-point move can be the difference.`,
      delta, win: clamp(baseWin + delta, 3, 95), basis: 'pricing',
    });
  }

  return out.sort((a, b) => b.delta - a.delta || b.win - a.win);
}

/* ============================================================
   PER-DEAL GHOST  (used by the panel + the report)
   ============================================================ */
function computeGhost(d, ctx) {
  const acts = (ctx.actsByDeal.get(d.id) || []).slice().sort((a, b) => actTime(a) - actTime(b));
  const extras = getDealExtras(d.id);
  const sig = dealSignals(d, acts, extras);
  const reached = reachedStageId(d, acts, extras);
  const twin = reviveTwin(d, reached);
  const deathTime = d.status === 'open' ? Date.now() : new Date(d.closeDate).getTime();
  const baseWin = winFromRisk(riskOf(twin, acts, deathTime));
  const analog = closestAnalog(sig, ctx);
  const interventions = sweepInterventions(d, twin, acts, reached, deathTime, sig, analog, baseWin);
  const topFix = interventions[0] || null;
  const recoverable = topFix ? Math.round(d.value * topFix.delta / 100) : 0;
  const reachedOrder = stageById(reached)?.order || 3;

  // Normalised activity cadence for the replay (created -> death), plus the
  // point the deal went silent so the gap renders.
  const created = new Date(d.createdAt).getTime();
  const span = Math.max(1, deathTime - created);
  const dots = acts.map(a => ({ t: clamp((actTime(a) - created) / span, 0, 1), type: a.type }));
  const silenceFrac = sig.lastTouch ? clamp((sig.lastTouch - created) / span, 0, 1) : 0;

  return {
    deal: d,
    company: getCompany(d.companyId) || null,
    lost: d.status === 'lost',
    signals: sig,
    reached, reachedOrder,
    baselineWinProb: baseWin,
    interventions,
    topFix,
    recoverable,
    leakCategory: topFix ? topFix.category : null,
    analog,
    divergences: divergences(sig, analog),
    replay: { reachedOrder, dots, silenceFrac, divergenceStageOrder: topFix ? (stageById(topFix.stageId)?.order || reachedOrder) : reachedOrder },
  };
}

function newCtx() {
  return { actsByDeal: actsByDealMap() };
}

/* Public: full ghost path for one deal (panel). Returns null for deals that
   are not a graveyard/stall case (won deals, and healthy open deals with no
   recoverable leak) so the panel can cleanly hide. */
export function ghostForDeal(dealId) {
  const d = getDeal(dealId);
  if (!d) return null;
  if (d.status === 'won') return null;
  const g = computeGhost(d, newCtx());
  // Open deals only surface a ghost when there is a real, recoverable leak
  // (i.e. the deal is genuinely drifting toward the graveyard).
  if (d.status === 'open' && !g.topFix) return null;
  return g;
}

/* Public: the whole graveyard, ranked, with the systemic-leak read.
   Aggregates each lost deal's PRIMARY fix into a leak category so a CRO sees
   "you lost $X this quarter to <the one thing>". */
export function ghostRegretReport() {
  const ctx = newCtx();
  const lost = getDeals().filter(d => d.status === 'lost');
  const ghosts = lost.map(d => computeGhost(d, ctx)).sort((a, b) => b.recoverable - a.recoverable);

  const lostValue = lost.reduce((s, d) => s + d.value, 0);
  const recoverableValue = ghosts.reduce((s, g) => s + g.recoverable, 0);

  const leakMap = new Map();
  for (const g of ghosts) {
    if (!g.topFix) continue;
    const cat = g.topFix.category;
    const row = leakMap.get(cat) || { category: cat, label: CATEGORY[cat].label, color: CATEGORY[cat].color, value: 0, count: 0 };
    row.value += g.recoverable;
    row.count += 1;
    leakMap.set(cat, row);
  }
  const leaks = [...leakMap.values()].sort((a, b) => b.value - a.value);
  const topLeak = leaks[0] || null;

  return {
    lostCount: lost.length,
    lostValue,
    recoverableValue,
    recoverablePct: lostValue ? Math.round((recoverableValue / lostValue) * 100) : 0,
    winnableCount: ghosts.filter(g => g.topFix).length,
    leaks,
    topLeak,
    ghosts,
  };
}

/* Small helpers the UI reuses. */
export const ghostMoney = k;
export const ghostCategoryMeta = (cat) => CATEGORY[cat] || { label: cat, color: 'var(--n-600)' };
export const ghostOpenStages = OPEN_ORDERED;
export const ghostWonStage = WON_STAGE;
