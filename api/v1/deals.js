// Rally Public REST API - Deals resource
//   GET  /api/v1/deals            list (pagination + filters)
//   GET  /api/v1/deals?id=d_1     fetch one (or /api/v1/deals/d_1 if routed)
//   POST /api/v1/deals            create
//
// Auth: Authorization: Bearer rk_live_...   Rate limited per key.
// Response envelope: { data, meta?, request_id } or { error, request_id }.
// ASCII only. No em-dash / en-dash.
import { withErrorHandling } from '../_utils.js';
import {
  authenticate, rateLimit, sendData, sendError, ensureMethod,
  parseQuery, paginate, demoDeals, newId, hasDatastore, DATASTORE_NOTE, STAGE_IDS,
} from '../_lib-v1.js';

function idFromPath(req) {
  // Support both /api/v1/deals/d_1 (path) and ?id=d_1 (query).
  try {
    const path = new URL(req.url, 'http://x').pathname;
    const m = /\/deals\/([^/?]+)$/.exec(path);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return undefined;
}

export default withErrorHandling(async (req, res) => {
  if (!ensureMethod(req, res, ['GET', 'POST'])) return;

  const auth = await authenticate(req);
  if (!auth.ok) return sendError(res, auth.status, auth.code, auth.message);

  const rate = rateLimit('deals:' + (auth.principal?.id || auth.principal?.name || 'anon'));
  if (!rate.ok) return sendError(res, 429, 'rate_limited', 'API rate limit exceeded. Retry after the window resets.', { rate });

  const all = demoDeals();

  if (req.method === 'GET') {
    const { limit, offset, get } = parseQuery(req);
    const id = idFromPath(req) || get('id');
    if (id) {
      const deal = all.find(d => d.id === id);
      if (!deal) return sendError(res, 404, 'not_found', `No deal with id ${id}.`, { rate });
      return sendData(res, deal, { rate });
    }
    // filters
    const stage = get('stage');
    const status = get('status');
    const companyId = get('company_id');
    const minValue = get('min_value') != null ? Number(get('min_value')) : null;
    const q = (get('q') || '').toLowerCase();
    let list = all;
    if (stage) list = list.filter(d => d.stage === stage);
    if (status) list = list.filter(d => d.status === status);
    if (companyId) list = list.filter(d => d.companyId === companyId);
    if (minValue != null && Number.isFinite(minValue)) list = list.filter(d => d.value >= minValue);
    if (q) list = list.filter(d => d.name.toLowerCase().includes(q));
    const { page, meta } = paginate(list, { limit, offset });
    return sendData(res, page, { meta, rate });
  }

  // POST create
  const body = (req.body && typeof req.body === 'object') ? req.body
    : (typeof req.body === 'string' ? safeJson(req.body) : {});
  const name = String(body.name || '').trim();
  if (!name) return sendError(res, 422, 'validation_error', 'Field "name" is required.', { rate, details: { field: 'name' } });
  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 0) return sendError(res, 422, 'validation_error', 'Field "value" must be a non-negative number.', { rate, details: { field: 'value' } });
  const stage = body.stage ? String(body.stage) : 'lead';
  if (!STAGE_IDS.includes(stage)) return sendError(res, 422, 'validation_error', `Field "stage" must be one of: ${STAGE_IDS.join(', ')}.`, { rate, details: { field: 'stage' } });

  const record = {
    id: newId('d'),
    name,
    companyId: body.company_id || body.companyId || null,
    value,
    stage,
    status: stage === 'won' ? 'won' : stage === 'lost' ? 'lost' : 'open',
    closeDate: body.close_date || body.closeDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const meta = hasDatastore() ? undefined : { note: DATASTORE_NOTE };
  return sendData(res, record, { status: 201, meta, rate });
});

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
