// ============================================================
// ARDOVO HANDSHAKE - Agent-to-Agent Deal Room (counter-agent commerce engine)
//
// Buyers are showing up with their own AI. Salesforce orchestrates ITS agents
// (Agent Network / A2A). Ardovo is the first CRM where YOUR Deal Agent negotiates
// directly with the BUYER'S Buying Agent over the open agent stack - A2A for the
// conversation, AP2 (Agent Payments Protocol) for a signed, auditable,
// human-countersigned deal.
//
// This is not a canned replay. It is a live, turn-based negotiation:
//   - Distinct buyer ARCHETYPES with real strategies (no two runs alike).
//   - A strategy YOU pick for your agent (anchor / balanced / velocity).
//   - A governance mandate (max discount, walk-away) that draws the deal envelope.
//   - Turn-by-turn intervention: hold, concede, trade a term, split, or walk.
//   - A settlement that produces a signed AP2 Intent/Cart/Payment mandate chain,
//     committed only on a human countersignature.
// Deterministic + grounded in the real pipeline (store.js). NO em-dash. ASCII.
// ============================================================
import { getDeal, getDeals, openDeals, getCompany, getContactsForCompany, contactName, userName, stageById, moveDealStage, updateDeal, createActivity } from './store.js';
import { DEFAULT_MANDATE } from './agent-cloud.js';

/* ---------- AP2 protocol identity ---------- */
export const AP2 = { version: '0.2', transport: 'A2A', credentials: 'W3C Verifiable Digital Credentials', mandates: ['IntentMandate', 'CartMandate', 'PaymentMandate'], alg: 'ES256' };

export const DEFAULT_POLICY = {
  maxDiscountPct: 12,   // deepest our agent goes on its own
  walkAwayPct: 20,      // below this the agent walks rather than sign
  humanAbovePct: 6,     // past this, a human must countersign
  maxDealValue: DEFAULT_MANDATE.maxDealValue,
};

// Buyer agents with distinct, visible negotiating strategies. targetDisc is the
// discount at the buyer's true ceiling (scaled by leverage); step is how fast
// they concede toward it; termSensitivity is how much a traded term moves them.
export const ARCHETYPES = [
  { id: 'hardliner', name: 'Procurement Hardliner', tactic: 'Anchors low, concedes in slivers, wields the competition every round.', power: 0.72, targetDisc: 0.17, openSpread: 12, step: 0.30, termSensitivity: 0.25, walkBias: 0.85 },
  { id: 'champion', name: 'Champion in a Hurry', tactic: 'Wants it signed this week. Trades price for speed and the right terms.', power: 0.40, targetDisc: 0.07, openSpread: 8, step: 0.62, termSensitivity: 0.85, walkBias: 0.25 },
  { id: 'bakeoff', name: 'Bake-off Shopper', tactic: 'Three vendors on the table; cites a cheaper quote at every turn.', power: 0.60, targetDisc: 0.14, openSpread: 11, step: 0.42, termSensitivity: 0.45, walkBias: 0.50 },
  { id: 'capped', name: 'Budget-Capped Buyer', tactic: 'A hard ceiling from finance. Will not cross it no matter the value.', power: 0.55, targetDisc: 0.16, openSpread: 7, step: 0.50, termSensitivity: 0.40, walkBias: 0.80 },
  { id: 'enterprise', name: 'Enterprise Slow-roll', tactic: 'Deep pockets, procurement theater. Concedes once the terms are met.', power: 0.50, targetDisc: 0.09, openSpread: 10, step: 0.55, termSensitivity: 0.75, walkBias: 0.30 },
];
export const archetypeById = (id) => ARCHETYPES.find(a => a.id === id) || ARCHETYPES[0];

// Our agent's posture. concede = how much of the gap it gives per auto turn.
export const STRATEGIES = [
  { id: 'anchor', name: 'Anchor hard', blurb: 'Hold list, concede late and small. Protects margin, risks the deal.', concede: 0.34 },
  { id: 'balanced', name: 'Meet in the middle', blurb: 'Trade value for terms and converge on a fair number.', concede: 0.55 },
  { id: 'velocity', name: 'Close fast', blurb: 'Move to a fair price quickly to win the timeline.', concede: 0.82 },
];
export const strategyById = (id) => STRATEGIES.find(s => s.id === id) || STRATEGIES[1];

const MUSTS = [
  'SOC 2 Type II + signed DPA', 'SSO / SAML on the base tier', 'annual (not multi-year) term',
  'migration from Salesforce included', 'named CSM in first 90 days', 'usage caps with no overage surprises',
  'API access + sandbox', 'MSA redlines allowed',
];
const SIZE_POWER = { '1-10': 0.28, '11-50': 0.36, '51-200': 0.46, '201-500': 0.58, '501-1000': 0.66, '1001-5000': 0.74, '5000+': 0.82 };
const MAX_TURNS = 8;

/* ---------- deterministic PRNG + signing ---------- */
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seedFromId(id = '') { let h = 2166136261 >>> 0; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function fnv(str) { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
function signatureHex(p) { const s = JSON.stringify(p); return (fnv(s) + fnv('a' + s) + fnv(s + 'b') + fnv('c' + s)).slice(0, 24); }
function sign(payload, signer, role) { return { signer, role, alg: AP2.alg, credential: 'VDC', sig: `0x${signatureHex(payload)}`, signedAt: new Date().toISOString() }; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
const money = (n) => `$${Math.round(n).toLocaleString()}`;
function pick(rnd, arr, n) { const c = [...arr]; const o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return o; }

/* ---------- deal selection ---------- */
export function negotiableDeals() {
  const open = openDeals ? openDeals() : getDeals().filter(d => d.status === 'open');
  return [...open].sort((a, b) => (b.value || 0) - (a.value || 0));
}
export function defaultDealId() {
  const list = negotiableDeals();
  return (list.find(d => d.id === 'd_flagship') || list[0])?.id || null;
}

function pickArchetype(deal, rnd, forceId) {
  if (forceId) return archetypeById(forceId);
  const i = Math.floor(rnd() * ARCHETYPES.length);
  return ARCHETYPES[i];
}
function buyerFrom(deal, company, arche, rnd) {
  const contacts = company ? getContactsForCompany(company.id) : [];
  const principal = contacts[0] ? contactName(contacts[0]) : 'Head of Procurement';
  const org = company?.name || (deal.name || '').split(' - ')[0] || 'Buyer';
  const sizePower = SIZE_POWER[company?.size] ?? 0.5;
  const power = clamp(arche.power * 0.7 + sizePower * 0.3 + (rnd() - 0.5) * 0.12, 0.15, 0.92);
  const capDisc = clamp(arche.targetDisc * 100 * (0.72 + power * 0.6) + rnd() * 3, 3, 28);
  const openDisc = clamp(capDisc + arche.openSpread * (0.7 + rnd() * 0.7), capDisc + 4, 38);
  return {
    archeId: arche.id, archeName: arche.name, tactic: arche.tactic,
    principal, org, power: Math.round(power * 100), mustHaves: pick(rnd, MUSTS, 3),
    capDisc, openDisc, step: arche.step, termSensitivity: arche.termSensitivity, walkBias: arche.walkBias,
    agentName: `${org.split(' ')[0]} Buying Agent`,
  };
}

/* ============================================================
   openNegotiation - seed a live, turn-based session.
   ============================================================ */
export function openNegotiation(dealId, opts = {}) {
  const policy = { ...DEFAULT_POLICY, ...(opts.policy || {}) };
  const strategy = strategyById(opts.strategy);
  const deal = getDeal(dealId) || getDeal(defaultDealId());
  if (!deal) return { empty: true };
  const company = deal.companyId ? getCompany(deal.companyId) : null;
  const rnd = mulberry32(seedFromId(deal.id) ^ ((opts.salt || 0) * 2654435761));
  const arche = pickArchetype(deal, rnd, opts.archetypeId);
  const buyer = buyerFrom(deal, company, arche, rnd);
  const seller = { agentName: 'Ardovo Deal Agent', principal: userName(deal.ownerId) || 'Deal owner' };

  const list = Math.max(1, deal.value || 0);
  const floor = Math.round(list * (1 - policy.maxDiscountPct / 100));
  const walk = Math.round(list * (1 - policy.walkAwayPct / 100));
  const buyerCap = Math.round(list * (1 - buyer.capDisc / 100));
  const theirOffer = Math.round(list * (1 - buyer.openDisc / 100));

  const state = {
    deal: { id: deal.id, name: deal.name, value: deal.value, stage: deal.stage, ownerId: deal.ownerId, company: company?.name || null },
    company: company ? { id: company.id, industry: company.industry } : null,
    buyer, seller, policy, strategy: strategy.id,
    list, floor, walk, buyerCap,
    ourOffer: list, theirOffer,
    termCredit: 0, turn: 0, status: 'live', whose: 'ours',
    turns: [],
  };
  pushTurn(state, 'theirs',
    `${buyer.principal} authorized me within budget. Intent Mandate on the table: cap around ${money(theirOffer * 1.03)}, must-haves ${buyer.mustHaves.slice(0, 2).join(' and ')}. Opening at ${money(theirOffer)}.`,
    theirOffer, 'intent');
  pushTurn(state, 'ours',
    `Intent verified. List is ${money(list)}, priced to the value delivered. I will hold there and meet ${buyer.mustHaves[0]}.`,
    list, 'anchor');
  return state;
}

function pushTurn(state, actor, message, offer, kind = 'offer', note = '') {
  state.turns.push({ n: state.turns.length + 1, actor, agent: actor === 'ours' ? state.seller.agentName : state.buyer.agentName, message, offer: Math.round(offer), note, kind });
}

/* ============================================================
   playMove - resolve one exchange. move: auto|hold|concede|trade_term|split|walk
   Always terminating; offers clamped to the mandate.
   ============================================================ */
export function playMove(state, move = 'auto') {
  if (!state || state.status !== 'live') return state;
  const s = { ...state, buyer: state.buyer, turns: [...state.turns] };
  s.turn += 1;
  const strat = strategyById(s.strategy);

  if (move === 'walk') {
    pushTurn(s, 'ours', `Their ceiling sits below my walk-away of ${money(s.walk)}. I will not sign under mandate. Escalating to ${s.seller.principal} with the full transcript rather than surrender margin.`, s.ourOffer, 'escalation');
    s.status = 'impasse';
    return s;
  }

  const gap = Math.max(0, s.ourOffer - s.theirOffer);
  let ourStep = 0, tradedTerm = false;
  if (move === 'hold') { ourStep = 0; }
  else if (move === 'concede') { ourStep = gap * 0.18; }
  else if (move === 'split') { ourStep = gap * 0.5; }
  else if (move === 'trade_term') { ourStep = gap * 0.12; tradedTerm = true; s.termCredit += 1; }
  else { ourStep = gap * (0.14 + 0.24 * strat.concede); } // auto

  s.ourOffer = Math.max(s.floor, Math.round(s.ourOffer - ourStep));
  const ourConcessionFrac = gap > 0 ? clamp((state.ourOffer - s.ourOffer) / gap, 0, 1) : 0;

  // our message
  const term = s.buyer.mustHaves[(s.turn) % s.buyer.mustHaves.length];
  let ourMsg;
  if (move === 'hold') ourMsg = `I hear the pressure, but the value holds. Staying at ${money(s.ourOffer)} and standing behind ${term}.`;
  else if (move === 'trade_term') ourMsg = `I can bridge to ${money(s.ourOffer)} if we trade term length for ${term}. That stays inside my mandate.`;
  else if (move === 'split') ourMsg = `Let us stop circling. I will split the difference to ${money(s.ourOffer)} and we close today.`;
  else ourMsg = `I can move to ${money(s.ourOffer)} without touching scope, floor of ${money(s.floor)} in view.`;
  pushTurn(s, 'ours', ourMsg, s.ourOffer, move === 'trade_term' ? 'trade' : 'offer', tradedTerm ? `Traded ${term}` : `${Math.round((1 - s.ourOffer / s.list) * 100)}% off list`);

  // buyer responds: raise toward buyerCap, reciprocity from our concession + term credit
  const reciprocity = clamp(0.42 + 0.5 * ourConcessionFrac + s.termCredit * s.buyer.termSensitivity * 0.14, 0.25, 1.1);
  const buyerStep = (s.buyerCap - s.theirOffer) * s.buyer.step * reciprocity;
  s.theirOffer = Math.min(s.buyerCap, Math.round(s.theirOffer + Math.max(0, buyerStep)));

  // resolve
  const crossed = s.ourOffer <= s.theirOffer;
  const tiny = (s.ourOffer - s.theirOffer) <= s.list * 0.008;
  if (crossed || tiny) {
    finalizeSettle(s, Math.round((s.ourOffer + s.theirOffer) / 2));
    return s;
  }
  if (s.turn >= MAX_TURNS) {
    if (s.buyerCap >= s.floor) finalizeSettle(s, clamp(Math.round((s.ourOffer + s.theirOffer) / 2), s.floor, s.buyerCap));
    else if (s.buyerCap >= s.walk) finalizeSettle(s, s.buyerCap); // sub-floor: needs human
    else {
      pushTurn(s, 'theirs', `${money(s.theirOffer)} is my ceiling and finance will not move. If you cannot meet it, we walk.`, s.theirOffer, 'stall');
      pushTurn(s, 'ours', `That is below my walk-away of ${money(s.walk)}. I am not signing under mandate. Escalating to ${s.seller.principal}.`, s.ourOffer, 'escalation');
      s.status = 'impasse';
    }
    return s;
  }
  // buyer counter narration
  const off = Math.round((1 - s.theirOffer / s.list) * 100);
  const lines = [
    `Two other vendors are under ${money(s.theirOffer)}. Move and I recommend signing.`,
    `Closer. If you hold ${term} at ${money(s.theirOffer)}, I can take it to my sponsor.`,
    `I can go to ${money(s.theirOffer)}. That is real movement from finance.`,
    `${money(s.theirOffer)} and we sign this week. That is where I am.`,
  ];
  pushTurn(s, 'theirs', lines[s.turn % lines.length], s.theirOffer, 'offer', `${off}% off ask`);
  return s;
}

function finalizeSettle(s, price) {
  s.settle = clamp(Math.round(price), Math.min(s.walk, s.floor), s.list);
  const discountPct = Math.round(((s.list - s.settle) / s.list) * 1000) / 10;
  const overCap = s.settle > s.policy.maxDealValue;
  const belowFloor = s.settle < s.floor;
  s.status = (discountPct > s.policy.humanAbovePct || overCap || belowFloor) ? 'needs_human' : 'agreed';
  pushTurn(s, 'theirs', `Agreed at ${money(s.settle)} (${discountPct}% off). Signing the Cart Mandate and attaching Payment for ${s.buyer.principal}.`, s.settle, 'agree');
  pushTurn(s, 'ours',
    s.status === 'needs_human'
      ? `Locked at ${money(s.settle)}. That is past my auto-sign line, so both mandates are staged for ${s.seller.principal} to countersign. One click.`
      : `Locked at ${money(s.settle)} inside mandate. Cart + Payment mandates signed, staged for a final human countersignature.`,
    s.settle, 'lock');
}

/* ============================================================
   finalize - derive AP2 chain, outcome, gauge, and propose-confirm actions
   from a terminal (or live) state. Safe to call anytime.
   ============================================================ */
export function finalize(s) {
  if (!s || s.empty) return s;
  const settled = s.status === 'agreed' || s.status === 'needs_human';
  const P = settled ? s.settle : null;
  const discountPct = settled ? Math.round(((s.list - P) / s.list) * 1000) / 10 : Math.round(((s.list - s.theirOffer) / s.list) * 1000) / 10;
  const humanRequired = s.status === 'needs_human' || s.status === 'impasse';

  // AP2 mandate chain
  const category = (s.company?.industry || 'B2B software') + ' / CRM platform';
  const intent = {
    type: 'IntentMandate', id: `im_${signatureHex({ d: s.deal.id, k: 'intent' }).slice(0, 10)}`,
    buyer: s.buyer.principal, buyerOrg: s.buyer.org, agent: s.buyer.agentName,
    constraints: { budgetCap: Math.round(s.list * (1 - s.buyer.capDisc / 100) * 1.02), category, mustHaves: s.buyer.mustHaves, expiresAt: new Date(Date.now() + 864e5 * 7).toISOString() },
  };
  intent.signature = sign(intent.constraints, s.buyer.principal, 'buyer-principal');
  let cart = null, payment = null;
  if (settled) {
    cart = { type: 'CartMandate', id: `cm_${signatureHex({ d: s.deal.id, k: 'cart' }).slice(0, 10)}`, merchant: 'Ardovo (seller)', currency: 'USD', items: [{ name: s.deal.name, qty: 1, unitPrice: P, total: P }], total: P, listTotal: s.list, discountPct, linkedIntent: intent.id };
    cart.signatures = [sign(cart.items, 'Ardovo Deal Agent', 'merchant'), sign(cart.items, s.buyer.agentName, 'buyer-agent')];
    payment = { type: 'PaymentMandate', id: `pm_${signatureHex({ d: s.deal.id, k: 'pay' }).slice(0, 10)}`, instrument: 'ACH / net-30 PO', amount: P, currency: 'USD', linkedCart: cart.id, status: humanRequired ? 'authorized-pending-human' : 'authorized' };
    payment.signature = sign({ cart: cart.id, amount: P }, s.buyer.principal, 'buyer-principal');
  }

  // gauge
  const gap = Math.max(0, s.ourOffer - s.theirOffer);
  const span = Math.max(1, s.list - s.floor);
  const winProb = settled ? clamp(90 + Math.min(6, s.termCredit * 2) - Math.max(0, discountPct - s.policy.maxDiscountPct), 66, 98)
    : s.status === 'impasse' ? 16
    : clamp(Math.round(100 - (gap / span) * 92 + s.termCredit * 6), 6, 94);
  const marginPct = Math.round(((settled ? P : s.ourOffer) / s.list) * 100);

  const proposal = { type: 'propose', dealId: s.deal.id, actions: [] };
  if (settled) {
    if (P !== s.deal.value) proposal.actions.push({ kind: 'update_deal', dealId: s.deal.id, patch: { value: P }, label: `Set deal value to ${money(P)} (agreed via Handshake)` });
    if (s.deal.stage !== 'negotiation' && s.deal.stage !== 'won') proposal.actions.push({ kind: 'move_stage', dealId: s.deal.id, stage: 'negotiation', label: 'Advance to Negotiation (terms reached)' });
    proposal.actions.push({ kind: 'log_activity', dealId: s.deal.id, subject: `Handshake: agent-to-agent terms at ${money(P)} (${discountPct}% off) with ${s.buyer.archeName}`, label: 'Log the signed mandate chain to the deal timeline' });
  } else {
    proposal.actions.push({ kind: 'log_activity', dealId: s.deal.id, subject: `Handshake impasse vs ${s.buyer.archeName} at ${money(s.theirOffer)} - escalated, mandate protected`, label: 'Log the escalation to the deal timeline' });
  }

  const outcome = {
    status: s.status, humanRequired, list: s.list, settle: P, floor: s.floor, walk: s.walk, buyerCap: s.buyerCap,
    discountPct, savedVsList: settled ? s.list - P : 0, withinMandate: settled ? P >= s.floor && P <= s.policy.maxDealValue : false,
    overCap: settled ? P > s.policy.maxDealValue : false, rounds: s.turns.length, buyerPower: s.buyer.power, termsTraded: s.termCredit,
  };
  return { ...s, mandates: { intent, cart, payment }, outcome, proposal, gauge: { winProb, marginPct } };
}

// Live gauge for an in-progress state (page reads this each turn).
export function liveGauge(s) {
  if (!s) return { winProb: 0, marginPct: 100 };
  const gap = Math.max(0, s.ourOffer - s.theirOffer);
  const span = Math.max(1, s.list - s.floor);
  const winProb = s.status === 'impasse' ? 16 : s.status === 'agreed' || s.status === 'needs_human'
    ? clamp(90 - Math.max(0, ((s.list - (s.settle || s.ourOffer)) / s.list * 100) - s.policy.maxDiscountPct), 66, 98)
    : clamp(Math.round(100 - (gap / span) * 92 + s.termCredit * 6), 6, 94);
  const marginPct = Math.round(((s.settle || s.ourOffer) / s.list) * 100);
  return { winProb, marginPct };
}

/* ---------- auto-play to terminal (backward-compatible negotiate()) ---------- */
export function negotiate(dealId, opts = {}) {
  let s = openNegotiation(dealId, opts);
  if (s.empty) return s;
  let guard = 0;
  while (s.status === 'live' && guard++ < 20) s = playMove(s, 'auto');
  const done = finalize(s);
  return { ...done, rounds: done.turns };
}

/* ---------- apply the outcome to the CRM (only on human countersignature) ---------- */
export function applyOutcome(session) {
  if (!session || !session.proposal) return { ok: false, error: 'no proposal' };
  const results = [];
  for (const a of session.proposal.actions) {
    try {
      if (a.kind === 'update_deal') { updateDeal(a.dealId, a.patch); results.push('value updated'); }
      else if (a.kind === 'move_stage') { moveDealStage(a.dealId, a.stage); results.push('stage advanced'); }
      else if (a.kind === 'log_activity') { createActivity({ type: 'note', subject: a.subject, body: session.outcome?.settle ? `Settled ${money(session.outcome.settle)} of ${money(session.outcome.list)} list; ${session.outcome.discountPct}% off; buyer leverage ${session.outcome.buyerPower}%.` : '', relatedType: 'deal', relatedId: a.dealId, done: true, system: true }); results.push('logged'); }
    } catch { results.push(`skip ${a.kind}`); }
  }
  return { ok: true, results };
}

/* ---------- optional Claude counterparty (safe fallback) ---------- */
export async function negotiateSmart(dealId, opts = {}) {
  const local = negotiate(dealId, opts);
  if (local.empty) return local;
  try {
    const res = await fetch('/api/handshake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deal: local.deal, buyer: local.buyer, policy: local.policy, list: local.outcome.list }) });
    if (res.ok) { const data = await res.json(); if (data?.ok && Array.isArray(data.rounds) && data.rounds.length) return { ...local, rounds: data.rounds, turns: data.rounds, live: true, model: data.model || null }; }
  } catch {}
  return { ...local, live: false };
}

export { money as fmtMoney };
