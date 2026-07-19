// Ardovo Handshake - the agent-to-agent commerce endpoint.
//
//   GET  /api/handshake  -> an A2A Agent Card advertising Ardovo as a
//        negotiating MERCHANT agent, with the AP2 (Agent Payments Protocol)
//        extension declared. This is what a buyer's agent discovers when it
//        wants to transact: skills, the AP2 mandate chain we honor, and the
//        governance envelope every deal is bounded by.
//
//   POST /api/handshake  -> { deal, buyer, policy, list } a buyer agent (or the
//        Ardovo client) posts the negotiation context; Claude role-plays the
//        counterparty and returns a richer round-by-round transcript. Bounded:
//        the model never commits anything - the client stages an AP2 Cart +
//        Payment mandate for a human countersignature.
//
// Env-gated: without ANTHROPIC_API_KEY, POST returns { ok:false, disabled:true }
// so the client falls back to its deterministic engine. NO em-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 45 };

const AGENT_CARD = {
  protocolVersion: 'A2A/0.2',
  name: 'Ardovo Deal Agent',
  description: 'A negotiating merchant agent for the Ardovo revenue platform. Discovers buyer intent, negotiates commercial terms inside a governance mandate, and settles with a signed AP2 mandate chain that a human countersigns.',
  provider: { organization: 'Ardovo', url: 'https://rally-psi-five.vercel.app' },
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
  skills: [
    { id: 'negotiate_terms', name: 'Negotiate commercial terms', description: 'Exchange offers with a buyer agent inside a discount + value mandate.', tags: ['sales', 'negotiation', 'pricing'] },
    { id: 'verify_intent', name: 'Verify an AP2 Intent Mandate', description: 'Validate the buyer principal signature and budget constraints before negotiating.', tags: ['ap2', 'trust'] },
    { id: 'sign_cart', name: 'Countersign an AP2 Cart Mandate', description: 'Lock line items + price as a merchant-signed verifiable credential.', tags: ['ap2', 'commerce'] },
  ],
  extensions: {
    ap2: {
      version: '0.2',
      credentials: 'W3C Verifiable Digital Credentials',
      mandates: ['IntentMandate', 'CartMandate', 'PaymentMandate'],
      rails: ['card', 'ach', 'net-terms', 'stablecoin'],
      humanInLoop: 'Every settlement is staged for a human countersignature. The agent never auto-commits a payment.',
    },
  },
  governance: {
    note: 'Every offer this agent makes is bounded by a per-deal mandate (max discount, walk-away floor, value cap). Discounts past the human threshold are escalated, never auto-signed.',
  },
};

const SCHEMA = {
  type: 'object',
  properties: {
    rounds: {
      type: 'array',
      description: '5 to 8 alternating negotiation turns between the two agents, converging toward a settlement or an impasse.',
      items: {
        type: 'object',
        properties: {
          actor: { type: 'string', description: "'ours' for the Ardovo Deal Agent, 'theirs' for the buyer agent" },
          message: { type: 'string', description: 'what the agent says this turn (1-2 sentences, concrete, references price and terms)' },
          offer: { type: 'number', description: 'the price on the table after this turn' },
          note: { type: 'string', description: 'short annotation, e.g. concession percentage or mandate note' },
        },
        required: ['actor', 'message', 'offer'],
      },
    },
  },
  required: ['rounds'],
};

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, agentCard: AGENT_CARD });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ok: false, disabled: true, reason: 'no-key' });
  }

  const body = readJsonBody(req);
  const deal = body?.deal || {};
  const buyer = body?.buyer || {};
  const policy = body?.policy || {};
  const list = Number(body?.list || deal.value || 0);
  if (!list) return res.status(400).json({ ok: false, error: 'list price required' });

  const system = [
    'You simulate a live agent-to-agent B2B negotiation for the Ardovo CRM Handshake feature.',
    'There are two agents: OUR agent ("ours") is the Ardovo Deal Agent representing the seller; THEIR agent ("theirs") is the buyer\'s Buying Agent.',
    `List price is $${Math.round(list).toLocaleString()}. OUR mandate: max discount ${policy.maxDiscountPct || 12}%, walk away below ${policy.walkAwayPct || 20}% off, escalate to a human above ${policy.humanAbovePct || 6}% off.`,
    `The buyer principal is ${buyer.principal || 'a procurement lead'} at ${buyer.org || 'the buyer'}; buyer negotiating style is ${buyer.style || 'value-seeking'}; buyer must-haves: ${(buyer.mustHaves || []).join(', ') || 'security, annual term'}.`,
    'Rules: our agent anchors on value and never signs below the walk-away floor. Offers must converge realistically. End either in agreement (inside or just past the human line) or an impasse if the buyer wants below walk-away. Reference AP2 Intent/Cart/Payment mandates naturally. Keep each message tight and concrete. Never use an em dash or en dash.',
  ].join('\n');

  const out = await callAnthropic({
    system,
    prompt: `Produce the negotiation transcript as alternating rounds starting with the buyer agent ("theirs"). 6 to 8 turns. Converge toward a settlement consistent with the mandate.`,
    schema: SCHEMA,
    maxTokens: 1400,
    model: 'claude-sonnet-4-6',
  });
  const data = out?.data || {};
  const rounds = (Array.isArray(data.rounds) ? data.rounds : [])
    .filter(r => r && (r.actor === 'ours' || r.actor === 'theirs') && r.message)
    .slice(0, 8)
    .map((r, i) => ({ n: i + 1, actor: r.actor, agent: r.actor === 'ours' ? 'Ardovo Deal Agent' : (buyer.name || 'Buying Agent'), message: String(r.message).slice(0, 400), offer: Math.round(Number(r.offer) || list), note: String(r.note || '').slice(0, 120), kind: 'offer' }));

  if (!rounds.length) return res.status(200).json({ ok: false, disabled: true, reason: 'empty' });
  return res.status(200).json({ ok: true, rounds, model: 'claude-sonnet-4-6' });
});
