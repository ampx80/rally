// Shared server-side tool catalog for Rally's headless + MCP layer. Kept in
// plain JS (no React) so serverless functions can import it. Mirrors the
// client TOOL_CATALOG in src/lib/agent-cloud.js. NO em-dash / en-dash.

export const TOOLS = [
  { name: 'get_pipeline', kind: 'read', description: 'Read pipeline value, weighted forecast, win rate, and stage breakdown.', input: { type: 'object', properties: {} } },
  { name: 'list_deals', kind: 'read', description: 'List deals with optional filters.', input: { type: 'object', properties: { stage: { type: 'string' }, status: { type: 'string' }, minValue: { type: 'number' } } } },
  { name: 'find_record', kind: 'read', description: 'Find a deal, contact, or company by name.', input: { type: 'object', properties: { entity: { type: 'string', enum: ['deal', 'contact', 'company', 'any'] }, query: { type: 'string' } }, required: ['query'] } },
  { name: 'summarize_deal', kind: 'read', description: 'Summarize a deal plus its account tickets and projects.', input: { type: 'object', properties: { deal_id: { type: 'string' } }, required: ['deal_id'] } },
  { name: 'slipping_deals', kind: 'read', description: 'Deals past their close date, ranked by value at risk.', input: { type: 'object', properties: {} } },
  { name: 'predict_outcome', kind: 'read', description: 'Predict an open deal outcome from nearest closed deals.', input: { type: 'object', properties: { deal_id: { type: 'string' } }, required: ['deal_id'] } },
  { name: 'create_company', kind: 'write', description: 'Create a company.', input: { type: 'object', properties: { name: { type: 'string' }, industry: { type: 'string' }, size: { type: 'string' } }, required: ['name'] } },
  { name: 'create_contact', kind: 'write', description: 'Create a contact, optionally on a company.', input: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, companyId: { type: 'string' } }, required: ['firstName'] } },
  { name: 'create_deal', kind: 'write', description: 'Open a deal.', input: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'number' }, stage: { type: 'string' }, companyId: { type: 'string' } }, required: ['name', 'value'] } },
  { name: 'move_stage', kind: 'write', description: 'Advance or move a deal stage.', input: { type: 'object', properties: { deal_id: { type: 'string' }, stage: { type: 'string' } }, required: ['deal_id', 'stage'] } },
  { name: 'log_activity', kind: 'write', description: 'Log a task, call, email, or note on a record.', input: { type: 'object', properties: { type: { type: 'string' }, subject: { type: 'string' }, relatedId: { type: 'string' } }, required: ['subject'] } },
  { name: 'draft_email', kind: 'write', description: 'Draft a grounded follow-up email (staged, never auto-sends).', input: { type: 'object', properties: { deal_id: { type: 'string' }, tone: { type: 'string' } } } },
  { name: 'queue_broadcast', kind: 'write', description: 'Draft or schedule a marketing broadcast to an audience.', input: { type: 'object', properties: { audience: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['audience', 'subject'] } },
  { name: 'quote_from_deal', kind: 'write', description: 'Build a draft quote from a deal.', input: { type: 'object', properties: { deal_id: { type: 'string' } }, required: ['deal_id'] } },
  { name: 'generate_deck', kind: 'write', description: 'Generate a QBR deck for an account.', input: { type: 'object', properties: { company_id: { type: 'string' } }, required: ['company_id'] } },
  { name: 'build_account', kind: 'write', description: 'Stand up a whole account from one sentence.', input: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'] } },
];

export const toolNames = () => TOOLS.map(t => t.name);
export const getTool = (n) => TOOLS.find(t => t.name === n) || null;
