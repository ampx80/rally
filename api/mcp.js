// Ardovo MCP endpoint - exposes Ardovo as a Model Context Protocol tool server so
// external agents (Cursor, Claude, ChatGPT) can discover and drive Ardovo.
//
//   GET  /api/mcp            -> the tool manifest (schemaVersion, name, tools[])
//   POST /api/mcp {method}   -> minimal JSON-RPC-ish surface:
//        { method: 'tools/list' }            -> { tools }
//        { method: 'tools/call', params }    -> routes to /api/agent semantics
//
// This is the "Headless 360" answer: the platform as tools, not a locked UI.
// Data mutations are returned as propose-confirm envelopes (Ardovo is local-first
// per user), so an agent proposes and the Ardovo client (or Supabase, when
// configured) executes. NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import { TOOLS, getTool } from './_lib-tools.js';

const manifest = () => ({
  schemaVersion: '2025-06-18',
  name: 'rally',
  title: 'Ardovo Agent Cloud',
  description: 'Read and operate a Ardovo revenue workspace: pipeline, deals, contacts, companies, forecasts, and grounded agent actions.',
  instructions: 'Use read tools to answer questions about the book of business. Write tools return a propose-confirm envelope the Ardovo client executes; never assume a write committed until confirmed.',
  tools: TOOLS.map(t => ({ name: t.name, description: `[${t.kind}] ${t.description}`, inputSchema: t.input })),
});

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') return res.status(200).json({ ok: true, ...manifest() });
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const body = readJsonBody(req);
  const method = body?.method || '';
  if (method === 'tools/list') {
    return res.status(200).json({ ok: true, tools: manifest().tools });
  }
  if (method === 'tools/call') {
    const name = body?.params?.name;
    const tool = getTool(name);
    if (!tool) return res.status(400).json({ ok: false, error: `Unknown tool: ${name}` });
    // Reads can be planned/answered by /api/agent; writes return an envelope.
    return res.status(200).json({
      ok: true,
      tool: name,
      kind: tool.kind,
      envelope: tool.kind === 'write'
        ? { type: 'propose', tool: name, args: body?.params?.arguments || {}, note: 'Execute via the Ardovo client (propose-confirm) or a configured Supabase writer.' }
        : { type: 'query', tool: name, args: body?.params?.arguments || {}, note: 'POST to /api/agent with a workspace snapshot to resolve read tools.' },
    });
  }
  return res.status(400).json({ ok: false, error: 'Unsupported method. Use tools/list or tools/call.' });
});
