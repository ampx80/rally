// Shared internals for the Ardovo public REST API (api/v1/*). Owns the pieces
// every versioned endpoint needs so the three resource routes stay thin and
// behave identically: response envelopes, API-key auth, a best-effort rate
// limiter, pagination + filtering, and a deterministic server-side demo
// dataset that mirrors the shapes in src/lib/store.js.
//
// Auth model (documented boundary): the live API validates the Bearer token
// against a keys store. Priority is (1) Supabase `rally_api_keys` when the
// service env is present, then (2) an env-seeded allow-list (ARDOVO_API_KEYS /
// ARDOVO_API_KEY). When NEITHER is configured we are in pure-demo mode and
// accept a single well-known demo key so the docs + curl examples work out of
// the box. A real configured key disables the demo key. Browser-created keys
// (src/lib/apikeys.js) live in localStorage for the console demo and do not
// authenticate against this server unless mirrored into the keys store.
//
// ASCII only. No em-dash / en-dash. All env + external access is guarded.
import crypto from 'node:crypto';

export const API_VERSION = 'v1';
export const DEMO_KEY = 'rk_live_demo_rally'; // only accepted when no keys are configured

/* ---------- request id (for support + tracing) ---------- */
export function requestId() {
  try { return 'req_' + crypto.randomBytes(9).toString('hex'); }
  catch { return 'req_' + Math.random().toString(16).slice(2, 20); }
}

/* ---------- response envelopes ---------- */
export function sendData(res, data, { status = 200, meta, rate } = {}) {
  applyRate(res, rate);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const body = { data };
  if (meta) body.meta = meta;
  body.request_id = requestId();
  return res.status(status).json(body);
}

export function sendError(res, status, code, message, { rate, details } = {}) {
  applyRate(res, rate);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error, request_id: requestId() });
}

/* ---------- rate limiting (best effort; per warm instance) ----------
   Serverless instances are ephemeral so this is a soft ceiling, not a hard
   quota. It still returns honest, standard headers and a real 429 when a
   single warm instance is hammered. A production build swaps the Map for a
   shared store (Upstash / Redis) behind the same helper. */
const RATE_LIMIT = 120;      // requests
const RATE_WINDOW = 60_000;  // per 60s
const buckets = new Map();

export function rateLimit(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start >= RATE_WINDOW) { b = { start: now, count: 0 }; buckets.set(key, b); }
  b.count += 1;
  const remaining = Math.max(0, RATE_LIMIT - b.count);
  const reset = Math.ceil((b.start + RATE_WINDOW) / 1000);
  // keep the map from growing without bound on a long-lived instance
  if (buckets.size > 5000) { for (const [k, v] of buckets) if (now - v.start >= RATE_WINDOW) buckets.delete(k); }
  return { ok: b.count <= RATE_LIMIT, limit: RATE_LIMIT, remaining, reset };
}

function applyRate(res, rate) {
  if (!rate) return;
  res.setHeader('X-RateLimit-Limit', String(rate.limit));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(rate.reset));
  if (!rate.ok) res.setHeader('Retry-After', String(Math.max(1, rate.reset - Math.floor(Date.now() / 1000))));
}

/* ---------- API key auth ---------- */
function configuredKeys() {
  const out = new Set();
  const raw = process.env.ARDOVO_API_KEYS || process.env.ARDOVO_API_KEY || '';
  for (const k of String(raw).split(',').map(s => s.trim()).filter(Boolean)) out.add(k);
  return out;
}

function bearerFrom(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  if (m) return m[1].trim();
  // also accept X-Api-Key for convenience
  const x = req.headers?.['x-api-key'];
  return x ? String(x).trim() : '';
}

async function keyInSupabase(token) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null; // not configured
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    // Match on plaintext key or a sha256 hash column, whichever the table uses.
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const { data, error } = await supa
      .from('rally_api_keys')
      .select('id,name,revoked,active,key,key_hash')
      .or(`key.eq.${token},key_hash.eq.${hash}`)
      .limit(1);
    if (error) { console.warn('[v1 auth] supabase lookup skipped:', error.message); return null; }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return { found: false };
    const revoked = row.revoked === true || row.active === false;
    return { found: true, revoked, principal: { id: row.id || null, name: row.name || null } };
  } catch (e) {
    console.warn('[v1 auth] supabase error:', e?.message);
    return null; // treat as "store unavailable", fall through to env seed
  }
}

// Returns { ok:true, principal } or { ok:false, status, code, message }.
export async function authenticate(req) {
  const token = bearerFrom(req);
  if (!token) return { ok: false, status: 401, code: 'missing_api_key', message: 'Provide an API key as an Authorization: Bearer rk_... header.' };
  if (!/^rk_(live|test)_[A-Za-z0-9_-]{6,}$/.test(token)) {
    return { ok: false, status: 401, code: 'invalid_api_key', message: 'Malformed API key. Keys look like rk_live_xxxxxxxx.' };
  }

  // 1) Supabase keys store, when configured.
  const supa = await keyInSupabase(token);
  if (supa && supa.found === true) {
    if (supa.revoked) return { ok: false, status: 401, code: 'revoked_api_key', message: 'This API key has been revoked.' };
    return { ok: true, principal: supa.principal || { id: null, name: null }, source: 'supabase' };
  }

  // 2) Env-seeded allow-list.
  const env = configuredKeys();
  if (env.size > 0) {
    if (env.has(token)) return { ok: true, principal: { id: null, name: 'env-key' }, source: 'env' };
    // If Supabase is also configured and returned found:false, honor that miss.
    return { ok: false, status: 401, code: 'invalid_api_key', message: 'Unknown API key.' };
  }

  // 3) Pure demo mode: no keys configured anywhere. Accept the documented demo key.
  if (!supa) {
    if (token === DEMO_KEY) return { ok: true, principal: { id: 'demo', name: 'Demo key' }, source: 'demo' };
    return { ok: false, status: 401, code: 'invalid_api_key', message: `No keys are configured on this deployment. Use the demo key ${DEMO_KEY} or provision ARDOVO_API_KEY.` };
  }
  // Supabase configured but key not found there and no env seed.
  return { ok: false, status: 401, code: 'invalid_api_key', message: 'Unknown API key.' };
}

/* ---------- pagination + filtering ---------- */
export function parseQuery(req) {
  let q = req.query && typeof req.query === 'object' ? req.query : null;
  if (!q) {
    try { q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); } catch { q = {}; }
  }
  const first = (v) => Array.isArray(v) ? v[0] : v;
  const limitRaw = parseInt(first(q.limit), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25;
  const offsetRaw = parseInt(first(q.offset), 10);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const get = (k) => { const v = first(q[k]); return v == null ? undefined : String(v); };
  return { limit, offset, get, raw: q };
}

// Slice a filtered array into a data page + pagination meta envelope.
export function paginate(all, { limit, offset }) {
  const total = all.length;
  const page = all.slice(offset, offset + limit);
  return {
    page,
    meta: {
      pagination: {
        total,
        count: page.length,
        limit,
        offset,
        has_more: offset + page.length < total,
        next_offset: offset + page.length < total ? offset + limit : null,
      },
    },
  };
}

/* ============================================================
   SERVER-SIDE DEMO DATASET
   Deterministic mirror of the client seed shapes (src/lib/store.js) so the
   public API returns believable data without a datastore. Read-only source of
   truth; POST creates echo a constructed record (see DATASTORE_NOTE).
   ============================================================ */
export const DATASTORE_NOTE =
  'Demo mode: this deployment has no datastore configured, so writes are validated and echoed but not persisted. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist.';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAGES = [
  { id: 'lead', probability: 10, type: 'open' },
  { id: 'qualified', probability: 25, type: 'open' },
  { id: 'discovery', probability: 45, type: 'open' },
  { id: 'proposal', probability: 65, type: 'open' },
  { id: 'negotiation', probability: 85, type: 'open' },
  { id: 'won', probability: 100, type: 'won' },
  { id: 'lost', probability: 0, type: 'lost' },
];
export const STAGE_IDS = STAGES.map(s => s.id);
const stageById = (id) => STAGES.find(s => s.id === id);

const CO_A = ['Vertex', 'Northwind', 'Meridian', 'Apex', 'Cobalt', 'Summit', 'Ironclad', 'Beacon', 'Cascade', 'Lumen', 'Arbor', 'Vantage', 'Keystone', 'Halcyon', 'Pinnacle', 'Sterling'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Freight', 'Analytics', 'Networks', 'Dynamics'];
const INDUSTRIES = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy'];
const SIZES = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const CITIES = ['San Francisco, CA', 'Austin, TX', 'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Seattle, WA'];
const FIRST = ['James', 'Maria', 'David', 'Sarah', 'Michael', 'Jennifer', 'Priya', 'Wei', 'Diego', 'Aisha', 'Noah', 'Olivia'];
const LAST = ['Chen', 'Patel', 'Rodriguez', 'Kim', 'Nguyen', 'Johnson', 'Okafor', 'Rossi', 'Silva', 'Foster'];
const TITLES = ['VP of Sales', 'Chief Revenue Officer', 'Director of Operations', 'CFO', 'VP Engineering', 'Head of Procurement'];
const DEAL_KINDS = ['Platform rollout', 'Annual license', 'Enterprise expansion', 'Pilot to production', 'Renewal + upsell', 'New logo'];

let _seed = null;
function buildDemo() {
  if (_seed) return _seed;
  const rnd = mulberry32(20260708);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

  const companies = [];
  const used = new Set();
  for (let i = 0; i < 16; i++) {
    let name, guard = 0;
    do { name = `${pick(CO_A)} ${pick(CO_B)}`; guard++; } while (used.has(name) && guard < 20);
    used.add(name);
    companies.push({
      id: `co_${i + 1}`,
      name,
      domain: name.toLowerCase().replace(/[^a-z]/g, '') + '.com',
      industry: pick(INDUSTRIES),
      size: pick(SIZES),
      location: pick(CITIES),
      health: pick(['green', 'green', 'yellow', 'red']),
      createdAt: daysFromNow(-range(30, 400)),
    });
  }

  const contacts = [];
  let ci = 0;
  for (const co of companies) {
    const n = range(1, 3);
    for (let k = 0; k < n; k++) {
      ci++;
      const firstName = pick(FIRST), lastName = pick(LAST);
      contacts.push({
        id: `c_${ci}`,
        firstName, lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${co.domain}`,
        phone: `(${range(200, 989)}) ${range(200, 989)}-${String(range(1000, 9999))}`,
        title: pick(TITLES),
        companyId: co.id,
        createdAt: daysFromNow(-range(10, 300)),
      });
    }
  }

  const deals = [];
  let di = 0;
  for (const co of companies) {
    const n = range(0, 2);
    for (let k = 0; k < n; k++) {
      di++;
      const r = rnd();
      const stageId = r < 0.18 ? 'lead' : r < 0.36 ? 'qualified' : r < 0.54 ? 'discovery' : r < 0.68 ? 'proposal' : r < 0.8 ? 'negotiation' : r < 0.92 ? 'won' : 'lost';
      const st = stageById(stageId);
      const closed = st.type !== 'open';
      deals.push({
        id: `d_${di}`,
        name: `${co.name} - ${pick(DEAL_KINDS)}`,
        companyId: co.id,
        value: range(8, 96) * 5000,
        stage: stageId,
        probability: st.probability,
        status: st.type === 'open' ? 'open' : st.type,
        closeDate: closed ? daysFromNow(-range(2, 120)) : daysFromNow(range(3, 110)),
        createdAt: daysFromNow(-range(5, 180)),
      });
    }
  }

  _seed = { companies, contacts, deals };
  return _seed;
}

export const demoDeals = () => buildDemo().deals;
export const demoContacts = () => buildDemo().contacts;
export const demoCompanies = () => buildDemo().companies;

// Whether a real datastore is wired for this deployment.
export const hasDatastore = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ---------- id + timestamp helpers for POST creates ---------- */
export function newId(prefix) {
  let rand = '';
  try { rand = crypto.randomBytes(6).toString('hex'); }
  catch { rand = Math.random().toString(16).slice(2, 14); }
  return `${prefix}_${rand}`;
}

/* ---------- method guard for resource routes ---------- */
export function ensureMethod(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  sendError(res, 405, 'method_not_allowed', `Method ${req.method} is not allowed on this endpoint.`);
  return false;
}
