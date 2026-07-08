// Rook - the Rally AI operator brain. Given the conversation plus a live
// snapshot of the user's book of business (sent from the client store), Rook
// answers grounded questions, links to the right screen, and proposes actions
// the client executes with one click. Rook proposes; the user confirms; the
// store writers do the work. Rook never mutates data itself.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 45 };

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Warm, sharp, concise answer (2-4 sentences). Plain language, no filler.' },
    nav: {
      type: ['object', 'null'],
      description: 'A single page link if you reference a screen. null otherwise.',
      properties: { label: { type: 'string' }, to: { type: 'string' } },
    },
    actions: {
      type: 'array',
      description: '0 to 3 action buttons for the client to run.',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['navigate', 'create_company', 'create_contact', 'create_deal', 'log_activity', 'move_stage', 'draft_email', 'generate_deck', 'build_account'] },
          label: { type: 'string' },
          to: { type: 'string', description: 'for navigate' },
          goal: { type: 'string', description: 'for build_account: one sentence describing the account to stand up' },
          company: { type: 'object', properties: { name: { type: 'string' }, domain: { type: 'string' }, industry: { type: 'string' }, size: { type: 'string' }, location: { type: 'string' }, health: { type: 'string' } } },
          contact: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, title: { type: 'string' }, companyId: { type: 'string' } } },
          deal: { type: 'object', properties: { name: { type: 'string' }, companyId: { type: 'string' }, value: { type: 'number' }, stage: { type: 'string' }, closeDate: { type: 'string' } } },
          activity: { type: 'object', properties: { type: { type: 'string' }, subject: { type: 'string' }, dueInDays: { type: 'number' }, relatedType: { type: 'string' }, relatedId: { type: 'string' } } },
          deal_id: { type: 'string', description: 'for move_stage' },
          stage: { type: 'string', description: 'for move_stage: one of lead,qualified,discovery,proposal,negotiation,won,lost' },
          email: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } } },
          company_id: { type: 'string', description: 'for generate_deck' },
        },
        required: ['kind', 'label'],
      },
    },
    suggestions: { type: 'array', items: { type: 'string' }, description: '2 to 3 natural follow-up prompts.' },
  },
  required: ['reply', 'actions', 'suggestions'],
};

function fmtMoney(n) {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
}

function snapshotToText(s) {
  if (!s) return 'No snapshot provided.';
  const lines = [];
  lines.push(`Signed in as: ${s.currentUser?.name || 'the user'} (${s.currentUser?.title || 'rep'}).`);
  if (s.totals) lines.push(`Pipeline: ${fmtMoney(s.totals.pipeline)} open across ${s.totals.openDeals} deals. Weighted forecast: ${fmtMoney(s.totals.forecast)}. Win rate: ${s.totals.winRate}%.`);
  if (s.stageBreakdown) lines.push('By stage: ' + s.stageBreakdown.map(b => `${b.stage} ${b.count} (${fmtMoney(b.value)})`).join(', ') + '.');
  if (s.focus) lines.push(`The user is currently viewing this ${s.focus.type}: ${JSON.stringify(s.focus)}.`);
  if (Array.isArray(s.companies) && s.companies.length) {
    lines.push('COMPANIES (id | name | industry | health | open pipeline):');
    for (const c of s.companies.slice(0, 45)) lines.push(`- ${c.id} | ${c.name} | ${c.industry} | ${c.health} | ${fmtMoney(c.openPipeline)}`);
  }
  if (Array.isArray(s.deals) && s.deals.length) {
    lines.push('OPEN DEALS (id | name | value | stage | prob | close | owner):');
    for (const d of s.deals.slice(0, 60)) lines.push(`- ${d.id} | ${d.name} | ${fmtMoney(d.value)} | ${d.stage} | ${d.probability}% | ${d.closeDate?.slice(0, 10)} | ${d.owner}`);
  }
  if (Array.isArray(s.slipping) && s.slipping.length) {
    lines.push('SLIPPING (open, past close date): ' + s.slipping.slice(0, 12).map(d => `${d.name} (${fmtMoney(d.value)}, was due ${d.closeDate?.slice(0, 10)})`).join('; ') + '.');
  }
  if (Array.isArray(s.myDay) && s.myDay.length) {
    lines.push('MY DAY (open tasks): ' + s.myDay.slice(0, 12).map(a => `${a.type}: ${a.subject} (due ${a.due?.slice(0, 10)})`).join('; ') + '.');
  }
  return lines.join('\n');
}

const SYSTEM = (snapText, path) => [
  'You are Rook, the AI operator inside Rally, an AI-native revenue platform (CRM + pipeline + activities + dashboards).',
  'You are a sharp, calm revenue chief of staff: you know the book of business cold, answer in plain language, and turn intent into action. Never invent companies, deals, or numbers - only reference the SNAPSHOT below. When you use an id in an action, use the exact id from the snapshot.',
  '',
  'PAGES (attach a navigate action or nav link whenever you mention a screen):',
  '- Command center: /   | Deals pipeline: /deals   | a specific deal: /deals/<dealId>',
  '- Contacts: /contacts | a contact: /contacts/<contactId>',
  '- Companies: /companies | a company: /companies/<companyId>',
  '- My day (activities): /activities   | Dashboards: /dashboards',
  '',
  'HOW TO RESPOND:',
  '- ALWAYS LINK PAGES: any time you name a screen or a specific record, attach a navigate action (kind:"navigate", label, to). Never mention a destination without a button to it.',
  '- GROUNDED Q&A: answer questions like "which deals are slipping?", "what is my forecast?", "who have we not contacted at Vertex?" straight from the snapshot. Cite real names and numbers.',
  '- ACTIONS (propose, user confirms). To create a company use create_company with a company object. To create a person use create_contact (include companyId if known). To create a deal use create_deal (value in dollars, stage one of lead/qualified/discovery/proposal/negotiation, companyId if known). To log a task/call/email/meeting use log_activity (activity: type, subject, dueInDays, relatedType deal|contact|company, relatedId). To advance a deal use move_stage (deal_id + stage). To draft an email use draft_email (email: to, subject, body - write a real, ready-to-send follow-up grounded in the deal/contact). To build a QBR deck use generate_deck (company_id).',
  '- CAPTURE DETAILS FIRST: if the user wants to create something but key details are missing, ask ONE short clarifying question in reply and propose nothing yet. For a deal you need at least a name/company and a value.',
  '- JUGGERNAUT: if the user wants to "set up", "stand up", "onboard", or "create a whole account" (a company plus contacts plus a deal plus first tasks), do NOT use the individual create actions. Return a SINGLE build_account action with a one-sentence goal capturing everything they said. Tell them in reply you will build the whole account and to hit the button.',
  '- Keep reply tight (2-4 sentences). Offer 2 to 3 suggestions.',
  'Absolute rule: never use an em dash or en dash. Use a normal hyphen.',
  '',
  'SNAPSHOT:',
  snapText,
  path ? `\nThe user is currently on route: ${path}` : '',
].join('\n');

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const snapshot = body.snapshot || null;
  const path = body.context?.path || '';
  if (!messages.length) return res.status(400).json({ error: 'messages required' });

  const convo = messages.filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'User' : 'Rook'}: ${m.content}`).join('\n');

  const out = await callAnthropic({
    system: SYSTEM(snapshotToText(snapshot), path),
    prompt: `Conversation so far:\n${convo}\n\nRespond as Rook to the latest user message.`,
    schema: SCHEMA,
    maxTokens: 1300,
    model: 'claude-sonnet-4-6',
  });
  const data = out?.data || {};
  return res.status(200).json({
    ok: true,
    reply: data.reply || 'I am here. Ask me about your pipeline, or tell me what to build.',
    nav: data.nav || null,
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 3) : [],
    suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [],
  });
});
