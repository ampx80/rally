// Rally Public REST API - Contacts resource
//   GET  /api/v1/contacts            list (pagination + filters)
//   GET  /api/v1/contacts?id=c_1     fetch one (or /api/v1/contacts/c_1)
//   POST /api/v1/contacts            create
//
// Auth: Authorization: Bearer rk_live_...   Rate limited per key.
// ASCII only. No em-dash / en-dash.
import { withErrorHandling } from '../_utils.js';
import {
  authenticate, rateLimit, sendData, sendError, ensureMethod,
  parseQuery, paginate, demoContacts, newId, hasDatastore, DATASTORE_NOTE,
} from '../_lib-v1.js';
import { gateWrite } from '../_lib-authz.js';

function idFromPath(req) {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    const m = /\/contacts\/([^/?]+)$/.exec(path);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default withErrorHandling(async (req, res) => {
  if (!ensureMethod(req, res, ['GET', 'POST'])) return;

  const auth = await authenticate(req);
  if (!auth.ok) return sendError(res, auth.status, auth.code, auth.message);

  const rate = rateLimit('contacts:' + (auth.principal?.id || auth.principal?.name || 'anon'));
  if (!rate.ok) return sendError(res, 429, 'rate_limited', 'API rate limit exceeded. Retry after the window resets.', { rate });

  const all = demoContacts();

  if (req.method === 'GET') {
    const { limit, offset, get } = parseQuery(req);
    const id = idFromPath(req) || get('id');
    if (id) {
      const c = all.find(x => x.id === id);
      if (!c) return sendError(res, 404, 'not_found', `No contact with id ${id}.`, { rate });
      return sendData(res, c, { rate });
    }
    const companyId = get('company_id');
    const q = (get('q') || '').toLowerCase();
    let list = all;
    if (companyId) list = list.filter(c => c.companyId === companyId);
    if (q) list = list.filter(c => (`${c.firstName} ${c.lastName}`).toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
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
  const firstName = String(body.first_name || body.firstName || '').trim();
  if (!firstName) return sendError(res, 422, 'validation_error', 'Field "first_name" is required.', { rate, details: { field: 'first_name' } });
  const email = body.email ? String(body.email).trim() : '';
  if (email && !EMAIL_RE.test(email)) return sendError(res, 422, 'validation_error', 'Field "email" must be a valid email address.', { rate, details: { field: 'email' } });

  const record = {
    id: newId('c'),
    firstName,
    lastName: String(body.last_name || body.lastName || '').trim(),
    email,
    phone: String(body.phone || '').trim(),
    title: String(body.title || '').trim(),
    companyId: body.company_id || body.companyId || null,
    createdAt: new Date().toISOString(),
  };
  const meta = hasDatastore() ? undefined : { note: DATASTORE_NOTE };
  return sendData(res, record, { status: 201, meta, rate });
});

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
