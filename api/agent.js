// Ardovo Headless Agent API - drive Ardovo without the browser.
//
//   GET  /api/agent          -> capabilities + tool catalog + contract
//   POST /api/agent          -> { input, snapshot? } an external agent posts a
//        goal plus (optionally) a workspace snapshot; Claude returns a grounded
//        reply plus structured tool_calls from the catalog. Read tools are
//        answered from the snapshot; write tools come back as propose-confirm
//        envelopes for the Ardovo client (or a Supabase writer) to execute.
//
// Env-gated: without ANTHROPIC_API_KEY it returns { ok:false, disabled:true }
// and still serves the catalog on GET. NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { callAnthropic } from './_lib-anthropic.js';
import { TOOLS } from './_lib-tools.js';

export const config = { maxDuration: 45 };

const CONTRACT = {
  post: { input: 'string (natural-language goal or question)', snapshot: 'optional workspace snapshot (same shape /api/rook accepts)' },
  response: { reply: 'string', tool_calls: '[{ tool, args, kind }]', envelopes: 'write tool_calls as propose-confirm items' },
};

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Concise grounded answer or plan (2-4 sentences).' },
    tool_calls: {
      type: 'array',
      description: '0 to 5 tool calls chosen from the catalog to satisfy the request.',
      items: {
        type: 'object',
        properties: {
          tool: { type: 'string', description: 'a tool name from the catalog' },
          args: { type: 'object', description: 'arguments for the tool' },
        },
        required: ['tool'],
      },
    },
  },
  required: ['reply', 'tool_calls'],
};

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true, name: 'Ardovo Headless Agent API',
      description: 'Operate a Ardovo workspace programmatically. Read tools answer from a posted snapshot; write tools return propose-confirm envelopes.',
      tools: TOOLS.map(t => ({ name: t.name, kind: t.kind, description: t.description })),
      contract: CONTRACT,
      mcp: '/api/mcp',
    });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ok: false, disabled: true, reason: 'no-key', tools: TOOLS.map(t => t.name) });
  }

  const body = readJsonBody(req);
  const input = String(body?.input || body?.prompt || '').slice(0, 4000);
  if (!input) return res.status(400).json({ ok: false, error: 'input is required' });
  const snapshot = body?.snapshot ? JSON.stringify(body.snapshot).slice(0, 60000) : 'No snapshot provided; answer from general capability and prefer read tools.';

  const system = [
    'You are the Ardovo headless agent. You operate a Ardovo revenue workspace through a fixed TOOL CATALOG. Choose tools to satisfy the caller.',
    'Rules: use read tools to answer questions from the SNAPSHOT; use write tools to propose changes (they will be confirmed by the client, nothing auto-commits). Never invent tools. Keep reply tight. Never use an em dash or en dash.',
    'TOOL CATALOG:',
    ...TOOLS.map(t => `- ${t.name} [${t.kind}]: ${t.description}`),
    'SNAPSHOT:',
    snapshot,
  ].join('\n');

  const out = await callAnthropic({
    system,
    prompt: `Caller request:\n${input}\n\nRespond with a grounded reply and the tool_calls needed.`,
    schema: SCHEMA,
    maxTokens: 1100,
    model: 'claude-sonnet-4-6',
  });
  const data = out?.data || {};
  const byName = new Map(TOOLS.map(t => [t.name, t]));
  const calls = (Array.isArray(data.tool_calls) ? data.tool_calls : [])
    .filter(c => byName.has(c.tool))
    .slice(0, 5)
    .map(c => ({ tool: c.tool, args: c.args || {}, kind: byName.get(c.tool).kind }));
  const envelopes = calls.filter(c => c.kind === 'write').map(c => ({ type: 'propose', tool: c.tool, args: c.args }));

  return res.status(200).json({
    ok: true,
    reply: data.reply || 'Done.',
    tool_calls: calls,
    envelopes,
  });
});
