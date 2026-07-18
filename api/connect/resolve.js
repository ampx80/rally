// Resolve connector bridge (server side, env-gated).
//
// The client connector (src/lib/integrations/connectors/resolve.js) calls this
// to pull real support tickets from the workspace's Resolve instance. Secrets
// live ONLY here: the Resolve API key is read from the server env and never
// touches the browser or localStorage.
//
// CONTRACT (never throws to the client, never leaks a secret):
//   POST /api/connect/resolve  { action:'sync', workspaceUrl? }
//     - not configured (no RESOLVE_API_KEY):
//         200 { ok:true, configured:false, connected:false, tickets:[], note }
//     - configured + upstream ok:
//         200 { ok:true, configured:true, connected:true, tickets:[...] }
//     - configured + upstream failed:
//         200 { ok:true, configured:true, connected:false, degraded:true, tickets:[], note }
//   GET /api/connect/resolve   -> { ok, configured } wiring probe (no secret)
//
// This mirrors Resolve's own public REST shape (GET /api/tickets returns
// { object:'list', data:[...] }). Live per-workspace persistence for both
// apps arrives with the Supabase layer.
// NO em-dash or en-dash anywhere. ASCII hyphen only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from '../_utils.js';

const DEFAULT_WORKSPACE_URL = 'https://resolve-nine-beryl.vercel.app';

function apiKey() {
  return process.env.RESOLVE_API_KEY || '';
}
function configured() {
  return Boolean(apiKey());
}
function workspaceBase(body) {
  const fromBody = typeof body?.workspaceUrl === 'string' ? body.workspaceUrl.trim() : '';
  const base = process.env.RESOLVE_WORKSPACE_URL || fromBody || DEFAULT_WORKSPACE_URL;
  return base.replace(/\/+$/, '');
}

// Fold Resolve's public ticket shape into the fields the Ardovo connector maps.
function normalizeUpstream(row = {}) {
  return {
    id: row.id ?? row.number ?? null,
    number: row.number ?? null,
    subject: row.subject || '(no subject)',
    status: row.status || null,
    aiOutcome: row.aiOutcome || null,
    resolvedBy: row.resolvedBy || null,
    priority: row.priority || null,
    channel: row.channel || 'email',
    sentiment: row.sentiment || null,
    confidence: typeof row.confidence === 'number' ? row.confidence : (row.aiConfidence ?? null),
    csat: row.csat ?? null,
    email: row.email || row.customerEmail || null,
    customerName: row.customerName || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

// Pull tickets from the workspace Resolve API. Any failure resolves to a
// degraded (but honest) response instead of throwing.
async function pullTickets(base) {
  try {
    const res = await fetch(`${base}/api/tickets`, {
      method: 'GET',
      headers: { authorization: `Bearer ${apiKey()}`, accept: 'application/json' },
    });
    if (!res.ok) {
      return { connected: false, degraded: true, tickets: [], note: `Resolve API responded ${res.status}.` };
    }
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.tickets) ? data.tickets : Array.isArray(data) ? data : [];
    return { connected: true, degraded: false, tickets: list.map(normalizeUpstream) };
  } catch (e) {
    return { connected: false, degraded: true, tickets: [], note: 'Could not reach the Resolve API.' };
  }
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    // Wiring probe. Never returns the key, only whether it exists.
    return res.status(200).json({ ok: true, app: 'rally', connector: 'resolve', configured: configured() });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const body = readJsonBody(req);
  const action = typeof body.action === 'string' ? body.action : 'sync';

  if (!configured()) {
    // Env-gated: not configured is a graceful, expected state, not an error.
    return res.status(200).json({
      ok: true,
      configured: false,
      connected: false,
      tickets: [],
      note: 'RESOLVE_API_KEY is not set on the server. Add it to sync live tickets; the app shows sample data until then.',
    });
  }

  if (action !== 'sync') {
    return res.status(400).json({ ok: false, error: `Unknown action "${action}". Supported: sync.` });
  }

  const base = workspaceBase(body);
  const result = await pullTickets(base);
  return res.status(200).json({
    ok: true,
    configured: true,
    connected: result.connected,
    degraded: result.degraded || false,
    tickets: result.tickets,
    workspaceUrl: base,
    ...(result.note ? { note: result.note } : {}),
  });
});
