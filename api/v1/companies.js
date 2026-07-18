// Ardovo Public REST API - Companies resource
//   GET  /api/v1/companies             list (pagination + filters)
//   GET  /api/v1/companies?id=co_1     fetch one (or /api/v1/companies/co_1)
//   POST /api/v1/companies             create
//
// Auth: Authorization: Bearer rk_live_...   Rate limited per key.
// ASCII only. No em-dash / en-dash.
import { withErrorHandling } from '../_utils.js';
import {
  authenticate, rateLimit, sendData, sendError, ensureMethod,
  parseQuery, paginate, demoCompanies, newId, hasDatastore, DATASTORE_NOTE,
} from '../_lib-v1.js';
import { gateWrite } from '../_lib-authz.js';

function idFromPath(req) {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    const m = /\/companies\/([^/?]+)$/.exec(path);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return undefined;
}

export default withErrorHandling(async (req, res) => {
  if (!ensureMethod(req, res, ['GET', 'POST'])) return;

  const auth = await authenticate(req);
  if (!auth.ok) return sendError(res, auth.status, auth.code, auth.message);

  const rate = rateLimit('companies:' + (auth.principal?.id || auth.principal?.name || 'anon'));
  if (!rate.ok) return sendError(res, 429, 'rate_limited', 'API rate limit exceeded. Retry after the window resets.', { rate });

  const all = demoCompanies();

  if (req.method === 'GET') {
    const { limit, offset, get } = parseQuery(req);
    const id = idFromPath(req) || get('id');
    if (id) {
      const co = all.find(x => x.id === id);
      if (!co) return sendError(res, 404, 'not_found', `No company with id ${id}.`, { rate });
      return sendData(res, co, { rate });
    }
    const industry = get('industry');
    const health = get('health');
    const q = (get('q') || '').toLowerCase();
    let list = all;
    if (industry) list = list.filter(c => c.industry === industry);
    if (health) list = list.filter(c => c.health === health);
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.domain || '').toLowerCase().includes(q));
    const { page, meta } = paginate(list, { limit, offset });
    return sendData(res, page, { meta, rate });
  }

  // POST create. Server-enforced RBAC: writes need rep+ when auth is
  // configured; in demo mode (no Supabase) this is a no-op, so behavior is
  // identical to today. GET above stays open regardless.
  const gate = await gateWrite(req, 'rep');
  if (gate.blocked) return sendError(res, gate.status, gate.code, gate.error, { rate });

  const body = (req.body && typeof req.body === 'object') ? req.body
    : (typeof req.body === 'string' ? safeJson(req.body) : {});
  const name = String(body.name || '').trim();
  if (!name) return sendError(res, 422, 'validation_error', 'Field "name" is required.', { rate, details: { field: 'name' } });

  const record = {
    id: newId('co'),
    name,
    domain: String(body.domain || '').trim() || name.toLowerCase().replace(/[^a-z]/g, '') + '.com',
    industry: String(body.industry || 'SaaS').trim(),
    size: String(body.size || '51-200').trim(),
    location: String(body.location || '').trim(),
    health: ['green', 'yellow', 'red'].includes(body.health) ? body.health : 'green',
    createdAt: new Date().toISOString(),
  };
  const meta = hasDatastore() ? undefined : { note: DATASTORE_NOTE };
  return sendData(res, record, { status: 201, meta, rate });
});

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
