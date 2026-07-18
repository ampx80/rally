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
          kind: { type: 'string', enum: ['navigate', 'create_company', 'create_contact', 'create_deal', 'log_activity', 'move_stage', 'draft_email', 'generate_deck', 'build_account', 'queue_broadcast', 'quote_from_deal', 'suggest_meeting', 'summarize_deal', 'fork_whatif'] },
          label: { type: 'string' },
          to: { type: 'string', description: 'for navigate' },
          goal: { type: 'string', description: 'for build_account: one sentence describing the account to stand up' },
          company: { type: 'object', properties: { name: { type: 'string' }, domain: { type: 'string' }, industry: { type: 'string' }, size: { type: 'string' }, location: { type: 'string' }, health: { type: 'string' } } },
          contact: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, title: { type: 'string' }, companyId: { type: 'string' } } },
          deal: { type: 'object', properties: { name: { type: 'string' }, companyId: { type: 'string' }, value: { type: 'number' }, stage: { type: 'string' }, closeDate: { type: 'string' } } },
          activity: { type: 'object', properties: { type: { type: 'string' }, subject: { type: 'string' }, dueInDays: { type: 'number' }, relatedType: { type: 'string' }, relatedId: { type: 'string' } } },
          deal_id: { type: 'string', description: 'for move_stage, quote_from_deal, summarize_deal: the exact deal id from the snapshot' },
          stage: { type: 'string', description: 'for move_stage: one of lead,qualified,discovery,proposal,negotiation,won,lost' },
          email: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } } },
          company_id: { type: 'string', description: 'for generate_deck; also optional for suggest_meeting' },
          contact_id: { type: 'string', description: 'for suggest_meeting: the contact to hand times to (optional)' },
          broadcast: { type: 'object', description: 'for queue_broadcast: a ready-to-queue marketing email/nurture. Body may use {firstName} and {company} merge tokens.', properties: { name: { type: 'string' }, type: { type: 'string', enum: ['email', 'nurture'] }, subject: { type: 'string' }, body: { type: 'string' }, audience: { type: 'string', description: 'one of: all-contacts, customers, opportunities, all-leads, qualified-leads, working-leads' }, scheduleInDays: { type: 'number', description: 'omit to leave as a draft; set to schedule a future send' } } },
          fork: { type: 'object', description: 'for fork_whatif: a non-destructive pipeline branch + one macro move to model.', properties: { name: { type: 'string' }, move: { type: 'string', enum: ['slip', 'pull', 'discount', 'boost', 'advance'] }, days: { type: 'number', description: 'for slip/pull' }, pct: { type: 'number', description: 'for discount' }, floor: { type: 'number', description: 'for boost: probability floor' } } },
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

  if (s.counts) {
    const c = s.counts;
    lines.push('WORKSPACE TOTALS (exact counts - use these for any "how many" question):');
    lines.push(`- Contacts: ${c.contacts} | Companies: ${c.companies} | Deals: ${c.deals} (open ${c.openDeals}, won ${c.wonDeals}, lost ${c.lostDeals})`);
    lines.push(`- Activities: ${c.activities} (open tasks ${c.openTasks}) | Team members: ${c.users}`);
    lines.push(`- Leads: ${c.leads} (qualified ${c.qualifiedLeads}) | Products: ${c.products} | Quotes: ${c.quotes} | Invoices: ${c.invoices}`);
    lines.push(`- Campaigns: ${c.campaigns} | Sequences: ${c.sequences} | Tickets: ${c.tickets} (open ${c.openTickets}) | Workflows: ${c.workflows}`);
  }
  if (s.revenue) {
    const r = s.revenue;
    lines.push(`REVENUE: pipeline ${fmtMoney(r.pipeline)}, weighted forecast ${fmtMoney(r.forecast)}, win rate ${r.winRate}%, won this month ${fmtMoney(r.wonThisMonth)}. AR outstanding ${fmtMoney(r.arOutstanding)} (overdue ${fmtMoney(r.arOverdue)}), collected ${fmtMoney(r.collected)}. Campaign revenue influenced ${fmtMoney(r.campaignRevenue)}.`);
  }
  if (s.stageBreakdown) lines.push('Pipeline by stage: ' + s.stageBreakdown.map(b => `${b.stage} ${b.count} (${fmtMoney(b.value)})`).join(', ') + '.');
  if (s.focus) lines.push(`The user is currently viewing this ${s.focus.type}: ${JSON.stringify(s.focus)}.`);

  if (Array.isArray(s.companies) && s.companies.length) {
    lines.push(`COMPANIES (${s.companies.length}) [id | name | industry | size | health | owner | #contacts | open pipeline]:`);
    for (const c of s.companies) lines.push(`- ${c.id} | ${c.name} | ${c.industry} | ${c.size} | ${c.health} | ${c.owner} | ${c.contacts} | ${fmtMoney(c.openPipeline)}`);
  }
  if (Array.isArray(s.contacts) && s.contacts.length) {
    lines.push(`CONTACTS (${s.contacts.length}) [id | name | title | company | email | owner]:`);
    for (const c of s.contacts) lines.push(`- ${c.id} | ${c.name} | ${c.title || ''} | ${c.company || 'no company'} | ${c.email || ''} | ${c.owner}`);
  }
  if (Array.isArray(s.deals) && s.deals.length) {
    lines.push(`DEALS (${s.deals.length}) [id | name | company | value | stage | status | prob | close | owner]:`);
    for (const d of s.deals) lines.push(`- ${d.id} | ${d.name} | ${d.company || ''} | ${fmtMoney(d.value)} | ${d.stage} | ${d.status} | ${d.probability}% | ${d.closeDate?.slice(0, 10)} | ${d.owner}`);
  }
  if (s.activityByType) lines.push('Activities by type: ' + Object.entries(s.activityByType).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
  if (Array.isArray(s.slipping) && s.slipping.length) {
    lines.push('SLIPPING (open, past close date): ' + s.slipping.slice(0, 20).map(d => `${d.name} (${fmtMoney(d.value)}, was due ${d.closeDate?.slice(0, 10)})`).join('; ') + '.');
  }
  if (Array.isArray(s.myDay) && s.myDay.length) {
    lines.push('MY DAY (open tasks): ' + s.myDay.slice(0, 15).map(a => `${a.type}: ${a.subject} (due ${a.due?.slice(0, 10)})`).join('; ') + '.');
  }
  if (s.modules) {
    const mo = s.modules;
    if (mo.leads?.length) lines.push(`LEADS (${mo.leads.length}): ` + mo.leads.map(l => `${l.name} @ ${l.company} [${l.status}, score ${l.score}, ${l.source}]`).join('; ') + '.');
    if (mo.quotes?.length) lines.push(`QUOTES (${mo.quotes.length}): ` + mo.quotes.map(q => `${q.number} ${q.company} ${fmtMoney(q.amount)} [${q.status}]`).join('; ') + '.');
    if (mo.invoices?.length) lines.push(`INVOICES (${mo.invoices.length}): ` + mo.invoices.map(i => `${i.number} ${i.company} ${fmtMoney(i.amount)} [${i.status}]`).join('; ') + '.');
    if (mo.tickets?.length) lines.push(`TICKETS (${mo.tickets.length}): ` + mo.tickets.map(t => `#${t.number} ${t.subject} (${t.company}) [${t.priority}/${t.status}]`).join('; ') + '.');
    if (mo.campaigns?.length) lines.push(`CAMPAIGNS (${mo.campaigns.length}): ` + mo.campaigns.map(c => `${c.name} [${c.channel}, ${c.status}, ${fmtMoney(c.revenue)}, ${c.leads} leads]`).join('; ') + '.');
    if (mo.products?.length) lines.push(`PRODUCTS (${mo.products.length}): ` + mo.products.map(p => `${p.name} [${p.category}, ${fmtMoney(p.price)} ${p.billing}]`).join('; ') + '.');
    if (mo.workflows?.length) lines.push(`WORKFLOWS (${mo.workflows.length}): ` + mo.workflows.map(w => `${w.name} [${w.active ? 'on' : 'off'}]`).join('; ') + '.');
  }
  // Newer surfaces Rook can now reason over (all optional; present when the client sends them).
  if (Array.isArray(s.meetings) && s.meetings.length) {
    lines.push(`SCHEDULER - upcoming meetings booked via Tango (${s.meetings.length}): ` + s.meetings.slice(0, 15).map(m => `${m.title || 'Meeting'} with ${m.who || 'a guest'} on ${(m.startsAt || '').slice(0, 16).replace('T', ' ')} (${m.duration || 30} min)`).join('; ') + '.');
  }
  if (Array.isArray(s.availability) && s.availability.length) {
    lines.push('SCHEDULER - next open times to hand a prospect: ' + s.availability.slice(0, 6).map(a => (a.startsAt || '').slice(0, 16).replace('T', ' ')).join(', ') + '.');
  }
  if (Array.isArray(s.integrations)) {
    const on = s.integrations.filter(i => i.connected).map(i => i.name);
    const off = s.integrations.filter(i => !i.connected).map(i => i.name);
    lines.push(`INTEGRATIONS: connected [${on.join(', ') || 'none'}]; available but not connected [${off.join(', ') || 'none'}].`);
  }
  if (Array.isArray(s.projects) && s.projects.length) {
    lines.push(`PROJECTS (${s.projects.length}) [name | company | open tasks / total | owner]: ` + s.projects.map(p => `${p.name} | ${p.company || 'no account'} | ${p.openTasks}/${p.tasks} | ${p.owner || ''}`).join('; ') + '.');
  }
  return lines.join('\n');
}

// Appended to the base system prompt when the client is in a special mode.
const MODE_ADDON = {
  training: [
    '',
    'TRAINING MODE IS ON. You are now a patient, encouraging Rally trainer onboarding a brand-new user. Teach, do not just answer.',
    '- Explain the ONE next thing simply, then attach a navigate action so they can see it live. Prefer showing over telling.',
    '- Do exactly one step at a time. Never dump a long list. End with a short "want to try X next?" suggestion.',
    '- When they ask to be taken somewhere ("take me to the deal page", "show me reports"), attach the navigate action and confirm in one short sentence. Do not repeat yourself.',
    '- Assume no prior CRM knowledge. Be warm and brief.',
  ].join('\n'),
  voice: [
    '',
    'VOICE MODE IS ON. Your reply will be spoken aloud. Keep it to ONE or TWO short spoken sentences, conversational, no lists, no markdown, no URLs read out. If you are taking them somewhere, say so in a few words (the app navigates automatically).',
  ].join('\n'),
};

const SYSTEM = (snapText, path, mode, voice) => [
  'You are Rook, the AI operator inside Rally, an AI-native revenue platform. You can see the ENTIRE workspace below: the CRM (contacts, companies, deals, activities) plus leads, products, quotes, invoices, campaigns, sequences, tickets, and workflows.',
  'You are a sharp, calm revenue chief of staff. You know every record and every count cold. Answer in plain language, cite exact names and numbers from the SNAPSHOT, and turn intent into action. You have FULL access to the whole workspace - never say you cannot see something or lack access. Do not invent records; if something genuinely is not in the snapshot, say so plainly. When you use an id in an action, use the exact id from the snapshot.',
  '',
  'PAGES (attach a navigate action whenever you name a screen or record):',
  '- Command center: /   | Leads: /leads   | Deals: /deals   | a deal: /deals/<dealId>',
  '- Contacts: /contacts | a contact: /contacts/<contactId>   | Companies: /companies | a company: /companies/<companyId>',
  '- My day: /activities | Forecasting: /forecasting | Dashboards: /dashboards | Reports: /reports',
  '- Campaigns: /campaigns | Sequences: /sequences | Inbox (tickets): /inbox',
  '- Products: /products | Quotes: /quotes | a quote: /quotes/<quoteId> | Billing: /invoices | Workflows: /workflows | Team: /team',
  '- Marketing broadcasts: /campaigns | Marketing automations: /automations | Scheduling (meetings): /scheduling | Integrations: /integrations | Projects: /projects | Pipeline Fork studio: /fork',
  '',
  'HOW TO RESPOND:',
  '- COUNTS + INVENTORY: for any "how many", "how much", "list", or "what do we have" question, answer PRECISELY from WORKSPACE TOTALS and the full lists. Example: "You have 132 contacts across 41 companies." Be exact, never vague, never estimate when the exact number is right there.',
  '- GROUNDED Q&A: answer questions ("which deals are slipping?", "what is my forecast?", "who at Vertex have we not contacted?", "how many overdue invoices?") straight from the snapshot with real names and numbers.',
  '- ALWAYS LINK PAGES: any time you name a screen or a specific record, attach a navigate action (kind:"navigate", label, to).',
  '- ACTIONS (propose, user confirms): create_company, create_contact (companyId if known), create_deal (value in dollars, stage one of lead/qualified/discovery/proposal/negotiation, companyId if known), log_activity (activity: type, subject, dueInDays, relatedType deal|contact|company, relatedId), move_stage (deal_id + stage), draft_email (email: to, subject, body - a real ready-to-send follow-up grounded in the record), generate_deck (company_id).',
  '- MORE ACTIONS (propose, user confirms; each is grounded, nothing sends or mutates the book until the user clicks):',
  '  * queue_broadcast: draft and queue a marketing broadcast. Provide broadcast {name, type email|nurture, subject, body using {firstName}/{company} tokens, audience one of all-contacts/customers/opportunities/all-leads/qualified-leads/working-leads, scheduleInDays optional}. This creates a DRAFT (or scheduled) campaign on /campaigns - it never actually emails anyone until the user sends it there.',
  '  * quote_from_deal: build a real quote from a deal. Provide deal_id. It clones the deal line items into a new draft quote and opens it on /quotes.',
  '  * suggest_meeting: hand a prospect the next open times from the Scheduling calendar. Provide contact_id and/or company_id (optional). Read-only - it surfaces availability and a Tango booking link, it does not book anything.',
  '  * summarize_deal: summarize a deal plus its account tickets and projects. Provide deal_id. Read-only.',
  '  * fork_whatif: model a change in the non-destructive Pipeline Fork studio. Provide fork {name, move one of slip|pull|discount|boost|advance, plus days for slip/pull, pct for discount, floor for boost}. It spins up an isolated branch (a digital twin), applies the move, and reports the delta versus main. Nothing touches the live pipeline until the user commits inside the studio.',
  '- USE THE RIGHT ACTION: "email/blast/announce to leads or customers" -> queue_broadcast. "quote this deal / build a quote" -> quote_from_deal. "when can we meet / send times / book a call" -> suggest_meeting. "what is going on with <deal> / any support or delivery issues" -> summarize_deal. "what if we slip/discount/advance the pipeline" -> fork_whatif.',
  '- CAPTURE DETAILS FIRST: if the user wants to create something but key details are missing, ask ONE short clarifying question and propose nothing yet.',
  '- JUGGERNAUT: if the user wants to "set up", "stand up", "onboard", or "create a whole account", return a SINGLE build_account action with a one-sentence goal. Tell them you will build the whole account and to hit the button.',
  '- Keep reply tight (2-4 sentences). Offer 2 to 3 suggestions.',
  'Absolute rule: never use an em dash or en dash. Use a normal hyphen.',
  '',
  'SNAPSHOT:',
  snapText,
  path ? `\nThe user is currently on route: ${path}` : '',
  mode === 'training' ? MODE_ADDON.training : '',
  voice ? MODE_ADDON.voice : '',
].join('\n');

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const snapshot = body.snapshot || null;
  const path = body.context?.path || '';
  const mode = body.context?.mode || 'operator';
  const voice = !!body.context?.voice;
  if (!messages.length) return res.status(400).json({ error: 'messages required' });

  const convo = messages.filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'User' : 'Rook'}: ${m.content}`).join('\n');

  const out = await callAnthropic({
    system: SYSTEM(snapshotToText(snapshot), path, mode, voice),
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
