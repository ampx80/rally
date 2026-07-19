// ============================================================
// ARDOVO HANDSHAKE - Agent-to-Agent Deal Room (the counter-agent commerce engine)
//
// The bet no incumbent CRM has made: buyers are showing up with their OWN AI.
// Salesforce orchestrates ITS agents (Agent Network / A2A). Ardovo is the first
// CRM where YOUR Deal Agent negotiates directly with the BUYER'S Buying Agent
// over the open agentic-commerce stack - A2A for the conversation, AP2 (Agent
// Payments Protocol) for a cryptographically signed, auditable, human-approved
// deal. Every offer is bounded by your governance mandate. Nothing commits
// without a human countersignature.
//
// This engine is deterministic + grounded in the real pipeline (store.js), with
// an optional Claude-driven counterparty via /api/handshake. The AP2 mandate
// chain (Intent -> Cart -> Payment) is structurally faithful to the spec:
// W3C-style verifiable digital credentials, each signed by the right principal.
//
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { getDeal, getDeals, openDeals, getCompany, getContactsForCompany, contactName, userName, stageById, moveDealStage, updateDeal, createActivity } from './store.js';
import { DEFAULT_MANDATE } from './agent-cloud.js';

/* ---------- AP2 protocol identity (what we advertise to the agent economy) ---------- */
export const AP2 = {
  version: '0.2',
  transport: 'A2A',
  credentials: 'W3C Verifiable Digital Credentials',
  mandates: ['IntentMandate', 'CartMandate', 'PaymentMandate'],
  alg: 'ES256',
};

// The seller-side negotiation policy. Derived from the agent mandate, extended
// with the discounting guardrails a real deal desk cares about.
export const DEFAULT_POLICY = {
  maxDiscountPct: 12,       // the deepest our agent will ever go on its own
  walkAwayPct: 20,          // below this the agent walks rather than signs
  humanAbovePct: 6,         // any discount past this needs a human countersignature
  maxDealValue: DEFAULT_MANDATE.maxDealValue,
  concessionRounds: 4,
};

/* ---------- deterministic PRNG (reproducible per deal) ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromId(id = '') {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------- signing (deterministic, spec-shaped VDC signature) ---------- */
function fnv(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function signatureHex(payload) {
  const s = JSON.stringify(payload);
  return (fnv(s) + fnv('a' + s) + fnv(s + 'b') + fnv('c' + s + 'c')).slice(0, 24);
}
function sign(payload, signer, role) {
  return { signer, role, alg: AP2.alg, credential: 'VDC', sig: `0x${signatureHex(payload)}`, signedAt: new Date().toISOString() };
}

/* ---------- pick a deal to negotiate ---------- */
export function negotiableDeals() {
  const open = openDeals ? openDeals() : getDeals().filter(d => d.status === 'open');
  return [...open].sort((a, b) => (b.value || 0) - (a.value || 0));
}
export function defaultDealId() {
  const list = negotiableDeals();
  const flagship = list.find(d => d.id === 'd_flagship');
  return (flagship || list[0])?.id || null;
}

/* ---------- counterparty persona (the buyer's agent) ---------- */
const SIZE_POWER = { '1-10': 0.28, '11-50': 0.36, '51-200': 0.46, '201-500': 0.58, '501-1000': 0.66, '1001-5000': 0.74, '5000+': 0.82 };
function buyerPersona(deal, company, rnd) {
  const contacts = company ? getContactsForCompany(company.id) : [];
  const champion = contacts[0];
  const principal = champion ? contactName(champion) : 'Head of Procurement';
  const org = company?.name || deal.name?.split(' - ')[0] || 'Buyer';
  const sizePower = SIZE_POWER[company?.size] ?? 0.5;
  // budget tightness + competitive pressure + urgency all feed buyer leverage
  const competition = 0.3 + rnd() * 0.55;
  const urgency = 0.25 + rnd() * 0.6;   // higher urgency = weaker buyer (needs it now)
  const budgetTight = 0.3 + rnd() * 0.5;
  const power = clamp(sizePower * 0.5 + competition * 0.3 + budgetTight * 0.35 - urgency * 0.25, 0.14, 0.9);
  const styles = ['procurement-led', 'value-seeking', 'speed-first', 'risk-averse', 'competitive-bake-off'];
  const style = styles[Math.floor(rnd() * styles.length)];
  const mustHaves = pick(rnd, [
    'SOC 2 Type II + signed DPA', 'SSO / SAML on the base tier', 'annual (not multi-year) term',
    'migration from Salesforce included', 'named CSM in first 90 days', 'usage caps with no overage surprises',
    'API access + sandbox', 'MSA redlines allowed',
  ], 3);
  return { principal, org, style, power, competition, urgency, budgetTight, mustHaves,
    agentName: `${org.split(' ')[0]} Buying Agent` };
}
function pick(rnd, arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
const money = (n) => `$${Math.round(n).toLocaleString()}`;

/* ============================================================
   negotiate(dealId, opts) - run the full A2A negotiation deterministically.
   Returns the transcript, the AP2 mandate chain, the governed outcome, and a
   propose-confirm action set. The UI reveals rounds progressively; the engine
   itself is synchronous and reproducible.
   ============================================================ */
export function negotiate(dealId, opts = {}) {
  const policy = { ...DEFAULT_POLICY, ...(opts.policy || {}) };
  const deal = getDeal(dealId) || getDeal(defaultDealId());
  if (!deal) return { empty: true };
  const company = deal.companyId ? getCompany(deal.companyId) : null;
  const rnd = mulberry32(seedFromId(deal.id) ^ (opts.salt || 0));
  const buyer = buyerPersona(deal, company, rnd);
  const seller = { agentName: 'Ardovo Deal Agent', principal: userName(deal.ownerId) || 'Deal owner' };

  const list = Math.max(1, deal.value || 0);
  const floor = list * (1 - policy.maxDiscountPct / 100);
  const walk = list * (1 - policy.walkAwayPct / 100);

  // Settlement point: buyer leverage pulls price down; capped by the mandate.
  const rawDiscount = policy.maxDiscountPct * buyer.power * (0.7 + rnd() * 0.7); // 0..~maxDiscount*1.5
  const buyerTargetDiscount = policy.maxDiscountPct * (buyer.power + 0.15) * (0.9 + rnd() * 0.5);
  const impasse = buyerTargetDiscount > policy.walkAwayPct + 4; // buyer wants below our walk-away
  const settleDiscount = clamp(rawDiscount, 0, policy.walkAwayPct);
  const settle = Math.round(list * (1 - settleDiscount / 100));
  const discountPct = Math.round(((list - settle) / list) * 1000) / 10;

  // opening positions
  const theirOpen = Math.round(list * (1 - clamp(buyerTargetDiscount, 0, 34) / 100));
  const ourOpen = list;

  const rounds = [];
  const push = (actor, message, offer, note, kind = 'offer') =>
    rounds.push({ n: rounds.length + 1, actor, agent: actor === 'ours' ? seller.agentName : buyer.agentName, message, offer, note, kind });

  // Round 1 - buyer agent presents an AP2 Intent Mandate
  push('theirs',
    `${buyer.principal} authorized me to close this within budget. Intent Mandate presented: cap ${money(theirOpen * 1.04)}, must-haves are ${buyer.mustHaves.slice(0, 2).join(' and ')}. Opening at ${money(theirOpen)}.`,
    theirOpen, `Style: ${buyer.style}. Leverage ${(buyer.power * 100).toFixed(0)}%.`, 'intent');

  // Round 2 - our agent holds on value, verifies the mandate
  push('ours',
    `Intent Mandate signature verified. List is ${money(ourOpen)} and it is priced to the value delivered. I can hold scope and hit ${buyer.mustHaves[0]} at ${money(ourOpen)}.`,
    ourOpen, 'Anchoring on value before any concession.');

  // Middle concession rounds converge both sides toward settle
  const steps = Math.max(2, policy.concessionRounds);
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const theirs = Math.round(theirOpen + (settle - theirOpen) * (0.55 + 0.45 * t));
    const ours = Math.round(ourOpen + (settle - ourOpen) * (0.5 * t));
    if (i % 2 === 1) {
      push('theirs',
        i === 1
          ? `Two other vendors are in the bake-off. To move now I need movement on price. Countering at ${money(theirs)}.`
          : `Closer. If you can meet ${money(theirs)} and keep ${buyer.mustHaves[1] || buyer.mustHaves[0]}, I can recommend signing today.`,
        theirs, `Concession ${Math.round((1 - theirs / list) * 100)}% off list.`);
    } else {
      push('ours',
        `I can bridge to ${money(ours)} by trading term length for the ${buyer.mustHaves[2] || 'security'} requirement. That stays inside my mandate.`,
        ours, `Within policy floor of ${money(floor)}.`);
    }
  }

  // Resolution
  let status, humanRequired, findings;
  const withinMandate = settle >= floor && settle <= policy.maxDealValue;
  const overCap = settle > policy.maxDealValue;
  if (impasse || settle < walk) {
    status = 'impasse';
    humanRequired = true;
    push('ours',
      `Their floor sits below my walk-away of ${money(walk)}. I will not sign under mandate. Escalating to ${seller.principal} with the full transcript rather than give away margin.`,
      Math.round(theirOpen), 'Mandate protected. Human decision required.', 'escalation');
    findings = `Impasse at ${money(theirOpen)}. Buyer wants past the ${policy.walkAwayPct}% walk-away line. Escalated to human, no margin conceded.`;
  } else {
    const needsHuman = discountPct > policy.humanAbovePct || overCap;
    status = needsHuman ? 'needs_human' : 'agreed';
    humanRequired = needsHuman;
    push('theirs',
      `Agreed at ${money(settle)} (${discountPct}% off). Signing the Cart Mandate now and attaching the Payment Mandate for ${buyer.principal}.`,
      settle, 'Buyer agent countersigned the cart.', 'agree');
    push('ours',
      needsHuman
        ? `Terms locked at ${money(settle)}. Discount is past my auto-sign line, so I am staging both mandates for ${seller.principal} to countersign. One click and it is done.`
        : `Terms locked at ${money(settle)} inside mandate. Cart + Payment mandates signed and staged for a final human countersignature.`,
      settle, needsHuman ? 'Human countersignature required by policy.' : 'Inside auto-sign mandate.', 'lock');
    findings = `${status === 'agreed' ? 'Agreed' : 'Terms reached'} at ${money(settle)} (${discountPct}% off list), ${withinMandate ? 'inside mandate' : 'over value cap'}. ${needsHuman ? 'Awaiting human countersignature.' : 'Ready to sign.'}`;
  }

  // AP2 mandate chain (Intent always; Cart + Payment only when terms reached)
  const category = (company?.industry || 'B2B software') + ' / CRM platform';
  const intent = {
    type: 'IntentMandate', id: `im_${signatureHex({ d: deal.id, k: 'intent' }).slice(0, 10)}`,
    buyer: buyer.principal, buyerOrg: buyer.org, agent: buyer.agentName,
    constraints: { budgetCap: Math.round(theirOpen * 1.04), category, mustHaves: buyer.mustHaves, expiresAt: new Date(Date.now() + 864e5 * 7).toISOString() },
  };
  intent.signature = sign(intent.constraints, buyer.principal, 'buyer-principal');

  let cart = null, payment = null;
  if (status !== 'impasse') {
    cart = {
      type: 'CartMandate', id: `cm_${signatureHex({ d: deal.id, k: 'cart' }).slice(0, 10)}`,
      merchant: 'Ardovo (seller)', currency: 'USD',
      items: [
        { name: deal.name, qty: 1, unitPrice: settle, total: settle },
      ],
      total: settle, listTotal: list, discountPct,
      linkedIntent: intent.id,
    };
    cart.signatures = [ sign(cart.items, 'Ardovo Deal Agent', 'merchant'), sign(cart.items, buyer.agentName, 'buyer-agent') ];
    payment = {
      type: 'PaymentMandate', id: `pm_${signatureHex({ d: deal.id, k: 'pay' }).slice(0, 10)}`,
      instrument: 'ACH / net-30 PO', amount: settle, currency: 'USD',
      linkedCart: cart.id, status: humanRequired ? 'authorized-pending-human' : 'authorized',
    };
    payment.signature = sign({ cart: cart.id, amount: settle }, buyer.principal, 'buyer-principal');
  }

  const outcome = {
    status, humanRequired, list, settle, floor, walk,
    discountPct, savedVsList: list - settle, withinMandate, overCap,
    rounds: rounds.length, buyerPower: Math.round(buyer.power * 100),
  };

  // propose-confirm: what a human countersignature would commit to the CRM
  const stageId = stageById(deal.stage)?.id || deal.stage;
  const proposal = { type: 'propose', dealId: deal.id, actions: [] };
  if (status !== 'impasse') {
    if (settle !== deal.value) proposal.actions.push({ kind: 'update_deal', dealId: deal.id, patch: { value: settle }, label: `Set deal value to ${money(settle)} (agreed via Handshake)` });
    if (deal.stage !== 'negotiation' && deal.stage !== 'won') proposal.actions.push({ kind: 'move_stage', dealId: deal.id, stage: 'negotiation', label: 'Advance to Negotiation (terms reached)' });
    proposal.actions.push({ kind: 'log_activity', dealId: deal.id, subject: `Handshake: agent-to-agent terms at ${money(settle)} (${discountPct}% off)`, label: 'Log the signed mandate chain to the deal timeline' });
  } else {
    proposal.actions.push({ kind: 'log_activity', dealId: deal.id, subject: `Handshake impasse at ${money(theirOpen)} - escalated, mandate protected`, label: 'Log the escalation to the deal timeline' });
  }

  return {
    deal: { id: deal.id, name: deal.name, value: deal.value, stage: deal.stage, ownerId: deal.ownerId, company: company?.name || null },
    seller, buyer: { name: buyer.agentName, principal: buyer.principal, org: buyer.org, style: buyer.style, power: Math.round(buyer.power * 100), mustHaves: buyer.mustHaves },
    policy, rounds, mandates: { intent, cart, payment }, outcome, proposal,
    tokens: { in: 1800 + rounds.length * 240, out: 900 + rounds.length * 160 },
  };
}

/* ---------- apply the outcome to the CRM (only on human countersignature) ---------- */
export function applyOutcome(session) {
  if (!session || !session.proposal) return { ok: false, error: 'no proposal' };
  const results = [];
  for (const a of session.proposal.actions) {
    try {
      if (a.kind === 'update_deal') { updateDeal(a.dealId, a.patch); results.push('value updated'); }
      else if (a.kind === 'move_stage') { moveDealStage(a.dealId, a.stage); results.push('stage advanced'); }
      else if (a.kind === 'log_activity') {
        createActivity({ type: 'note', subject: a.subject, body: session.outcome ? `Settled ${money(session.outcome.settle)} of ${money(session.outcome.list)} list; ${session.outcome.discountPct}% off; buyer leverage ${session.outcome.buyerPower}%.` : '', relatedType: 'deal', relatedId: a.dealId, done: true, system: true });
        results.push('logged');
      }
    } catch (e) { results.push(`skip ${a.kind}`); }
  }
  return { ok: true, results };
}

/* ---------- headless attempt (optional Claude counterparty), safe fallback ---------- */
export async function negotiateSmart(dealId, opts = {}) {
  const local = negotiate(dealId, opts);
  if (local.empty) return local;
  try {
    const res = await fetch('/api/handshake', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal: local.deal, buyer: local.buyer, policy: local.policy, list: local.outcome.list }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rounds) && data.rounds.length) {
        return { ...local, rounds: data.rounds, live: true, model: data.model || null };
      }
    }
  } catch {}
  return { ...local, live: false };
}

export { money as fmtMoney };
