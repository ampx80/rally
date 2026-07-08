// Rook Juggernaut planner. One sentence in ("set up Acme as an enterprise
// account with a 120k deal and a first-call task Friday"), a complete, realistic
// account blueprint out: the company, its buying committee, an opportunity at a
// sensible stage, and the first activities. RookDock executes it live via the
// store writers, so the records are real the moment the build finishes.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';

export const config = { maxDuration: 60 };

const SCHEMA = {
  type: 'object',
  properties: {
    company: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        domain: { type: 'string' },
        industry: { type: 'string', description: 'one of: SaaS, Manufacturing, Healthcare, Financial Services, Logistics, Retail, Energy, Media, Real Estate, Construction, Biotech, Aerospace' },
        size: { type: 'string', description: 'one of: 1-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+' },
        location: { type: 'string', description: 'US city, State' },
        health: { type: 'string', enum: ['green', 'yellow', 'red'] },
      },
      required: ['name', 'industry', 'size'],
    },
    contacts: {
      type: 'array',
      description: '2 to 4 realistic members of the buying committee.',
      items: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['firstName', 'lastName', 'title'],
      },
    },
    deal: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'e.g. "Acme - Enterprise platform rollout"' },
        value: { type: 'number', description: 'dollars, realistic for the described deal' },
        stage: { type: 'string', enum: ['lead', 'qualified', 'discovery', 'proposal', 'negotiation'] },
        closeInDays: { type: 'number', description: 'days from today to expected close' },
      },
      required: ['name', 'value', 'stage'],
    },
    activities: {
      type: 'array',
      description: '3 to 6 first activities (mix of task, call, meeting, email). Honor any specific task the user named (e.g. a first-call task Friday).',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['task', 'call', 'email', 'meeting'] },
          subject: { type: 'string' },
          dueInDays: { type: 'number' },
        },
        required: ['type', 'subject', 'dueInDays'],
      },
    },
    summary: { type: 'string', description: 'one crisp sentence describing the account you stood up.' },
  },
  required: ['company', 'contacts', 'deal', 'activities'],
};

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const goal = (body.goal || '').trim();
  if (!goal) return res.status(400).json({ error: 'missing goal' });

  const system = [
    'You are Rook, an elite enterprise account executive inside Rally. From one sentence, design a complete, realistic new account: the company, its buying committee, one opportunity, and the first activities.',
    'Be concrete and believable, the way a seasoned AE would set it up. Pick a sensible industry, company size, and headquarters city. Infer a domain from the company name. Give the deal a realistic value and an appropriate early-to-mid stage unless the user implies otherwise. Contacts should be a real buying committee (economic buyer, champion, technical evaluator).',
    'Honor any specifics the user gave: an exact deal value, a named task or day, a stage. If they said a first-call task for Friday, include a call activity dated to the next Friday (use a dueInDays that lands on Friday from today).',
    'Absolute rule: never use an em dash or en dash. Use a normal hyphen.',
  ].join('\n');

  const out = await callAnthropic({
    system,
    prompt: `Account request: ${goal}\n\nDesign the full account blueprint and return it.`,
    schema: SCHEMA,
    maxTokens: 1800,
    model: 'claude-sonnet-4-6',
  });
  const plan = out?.data;
  if (!plan?.company?.name) return res.status(502).json({ error: 'planner returned nothing usable' });
  return res.status(200).json({ ok: true, plan });
});
