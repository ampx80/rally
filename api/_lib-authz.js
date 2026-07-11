// ============================================================
// RALLY SERVER-SIDE AUTHORIZATION  (authz)
// ============================================================
// The server-truth companion to the client RBAC in src/lib/rbac.js.
// Client RBAC decides what the UI *shows*; this module decides what the
// API actually *allows*. They agree because the role ranks, capability
// ids, and default grant matrix below are copied verbatim from rbac.js
// (see docs/AUTHZ.md "staying in sync").
//
// Identity resolution accepts EITHER:
//   1. A Supabase access token (Authorization: Bearer <jwt>) -> getUser,
//      then a rally_memberships lookup for { orgId, role }.
//   2. A Rally API key (Authorization: Bearer rk_live_...) -> reuses the
//      api/_lib-v1.js key auth. Machine principals get a configurable role
//      (RALLY_API_KEY_ROLE, default 'admin') since a key is a trusted
//      server-issued secret.
//
// GUARDED / ADDITIVE: when Supabase is not configured this module NEVER
// throws. authenticate() returns { ok:false, configured:false,
// error:'auth-not-configured' } and the write gate becomes a no-op, so a
// demo deployment behaves EXACTLY as it did before this file existed.
//
// ASCII only. No em-dash / en-dash.
// ============================================================
import crypto from 'node:crypto';

/* ------------------------------------------------------------
   Role ranks + capability matrix (mirror of src/lib/rbac.js).
   Keep these three constants byte-for-byte in step with rbac.js.
   ------------------------------------------------------------ */
export const ROLE_RANK = { admin: 4, manager: 3, rep: 2, viewer: 1 };
export const ROLE_IDS = Object.keys(ROLE_RANK);

// Capability ids, mirror of CAPABILITIES in rbac.js (ids only).
export const CAPABILITY_IDS = [
  'records.view', 'records.edit', 'records.editAll', 'records.delete',
  'records.reassign', 'records.export',
  'quotes.view', 'quotes.build', 'quotes.approve',
  'workflows.view', 'workflows.manage',
  'fields.manage', 'rbac.manage', 'users.manage', 'audit.view', 'settings.manage',
];

// Default grant matrix, mirror of DEFAULTS in rbac.js.
export const DEFAULT_GRANTS = {
  admin: CAPABILITY_IDS.slice(), // admin gets everything
  manager: [
    'records.view', 'records.edit', 'records.editAll', 'records.delete', 'records.reassign', 'records.export',
    'quotes.view', 'quotes.build', 'quotes.approve',
    'workflows.view', 'workflows.manage',
    'audit.view',
  ],
  rep: [
    'records.view', 'records.edit', 'records.reassign',
    'quotes.view', 'quotes.build',
    'workflows.view',
  ],
  viewer: [
    'records.view', 'quotes.view', 'workflows.view',
  ],
};

export const rankOf = (role) => ROLE_RANK[role] || 0;

/* ------------------------------------------------------------
   Env / Supabase guards
   ------------------------------------------------------------ */
export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let _admin = null;
async function getAdmin() {
  if (_admin) return _admin;
  if (!authConfigured()) return null;
  const { createClient } = await import('@supabase/supabase-js');
  _admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

/* ------------------------------------------------------------
   Token extraction + classification
   ------------------------------------------------------------ */
function bearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  if (m) return m[1].trim();
  const x = req.headers?.['x-api-key'];
  return x ? String(x).trim() : '';
}

// An API key is the rk_live_/rk_test_ shape; anything else we treat as a JWT.
const API_KEY_RE = /^rk_(live|test)_[A-Za-z0-9_-]{6,}$/;
export const looksLikeApiKey = (token) => API_KEY_RE.test(String(token || ''));

// Optional org hint so a multi-workspace user can target a specific org.
function orgHint(req) {
  const h = req.headers?.['x-rally-org'];
  if (h) return String(Array.isArray(h) ? h[0] : h).trim();
  try {
    const u = new URL(req.url, 'http://x');
    const q = u.searchParams.get('org_id') || u.searchParams.get('orgId');
    if (q) return String(q).trim();
  } catch {}
  const b = req.body;
  if (b && typeof b === 'object' && (b.org_id || b.orgId)) return String(b.org_id || b.orgId).trim();
  return '';
}

/* ------------------------------------------------------------
   Membership lookup (JWT path): resolve { orgId, role } for a user.
   Picks the org hint when the user actually belongs to it, else the
   most-recently-joined active membership (mirrors rally_current_org()).
   ------------------------------------------------------------ */
async function resolveMembership(admin, userId, hint) {
  try {
    const { data, error } = await admin
      .from('rally_memberships')
      .select('org_id, role, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) { console.warn('[authz] membership lookup failed:', error.message); return { orgId: null, role: null }; }
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return { orgId: null, role: null };
    if (hint) {
      const match = rows.find(r => r.org_id === hint);
      if (match) return { orgId: match.org_id, role: match.role };
    }
    return { orgId: rows[0].org_id, role: rows[0].role };
  } catch (e) {
    console.warn('[authz] membership lookup error:', e?.message);
    return { orgId: null, role: null };
  }
}

/* ------------------------------------------------------------
   API-key validation (reuses api/_lib-v1.js so both entry points agree
   on which keys are valid). Machine principals get RALLY_API_KEY_ROLE.
   ------------------------------------------------------------ */
async function authenticateApiKey(req, token) {
  const { authenticate: keyAuth } = await import('./_lib-v1.js');
  const result = await keyAuth(req);
  if (!result.ok) {
    return { ok: false, configured: true, status: result.status || 401, code: result.code || 'invalid_api_key', error: result.message };
  }
  const role = ROLE_IDS.includes(process.env.RALLY_API_KEY_ROLE) ? process.env.RALLY_API_KEY_ROLE : 'admin';
  return {
    ok: true,
    configured: true,
    userId: result.principal?.id ? `apikey:${result.principal.id}` : 'apikey',
    orgId: orgHint(req) || null,
    role,
    email: null,
    source: 'api-key',
    principal: result.principal || null,
  };
}

/* ============================================================
   authenticate(req)
   -> success: { ok:true, configured:true, userId, orgId, role, email, source }
   -> demo:    { ok:false, configured:false, error:'auth-not-configured' }
   -> failure: { ok:false, configured:true, status, code, error }
   Never throws.
   ============================================================ */
export async function authenticate(req) {
  const token = bearerToken(req);

  // API keys can authenticate even against env-seeded / demo key stores, so
  // try that path first whenever the token has the key shape.
  if (looksLikeApiKey(token)) {
    try { return await authenticateApiKey(req, token); }
    catch (e) { console.warn('[authz] api-key auth error:', e?.message); return { ok: false, configured: authConfigured(), status: 401, code: 'invalid_api_key', error: 'API key could not be validated.' }; }
  }

  // JWT path needs a real Supabase backend. Without it we are in demo mode.
  const admin = await getAdmin();
  if (!admin) return { ok: false, configured: false, error: 'auth-not-configured' };

  if (!token) return { ok: false, configured: true, status: 401, code: 'missing_token', error: 'Missing bearer token.' };

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return { ok: false, configured: true, status: 401, code: 'invalid_token', error: 'Invalid or expired token.' };
    }
    const u = data.user;
    const { orgId, role } = await resolveMembership(admin, u.id, orgHint(req));
    return {
      ok: true,
      configured: true,
      userId: u.id,
      orgId,
      role,
      email: u.email || null,
      name: u.user_metadata?.name || u.user_metadata?.full_name || null,
      source: 'supabase',
    };
  } catch (e) {
    console.warn('[authz] getUser error:', e?.message);
    return { ok: false, configured: true, status: 401, code: 'invalid_token', error: 'Token validation failed.' };
  }
}

/* ------------------------------------------------------------
   Authorization primitives (operate on an identity from authenticate).
   ------------------------------------------------------------ */

// True when the identity's role rank meets or exceeds minRole.
export function requireRole(identity, minRole) {
  if (!identity || identity.ok !== true) return false;
  return rankOf(identity.role) >= rankOf(minRole);
}

// True when the identity is scoped to (a member of) the given org.
// A null orgId on the identity means "org not resolved"; only an exact
// match authorizes. API-key principals with no org can be allowed by
// passing allowUnscoped:true (a trusted server secret is org-agnostic).
export function requireOrg(identity, orgId, { allowUnscoped = false } = {}) {
  if (!identity || identity.ok !== true) return false;
  if (!orgId) return false;
  if (identity.orgId == null) return allowUnscoped && identity.source === 'api-key';
  return identity.orgId === orgId;
}

// Mirror of rbac.js can(): does this identity's role hold the capability?
// Uses the default grant matrix; pass an overrides map
// ({ [capId]: bool }) from rally_role_grants to honor per-org edits.
export function can(identity, capabilityId, overrides = null) {
  if (!identity || identity.ok !== true) return false;
  const role = identity.role;
  if (!role) return false;
  if (overrides && capabilityId in overrides) return !!overrides[capabilityId];
  return (DEFAULT_GRANTS[role] || []).includes(capabilityId);
}

/* ------------------------------------------------------------
   resolveCapabilities(identity): the identity's full granted-capability
   list, defaults merged with per-org rally_role_grants overrides when a
   backend + orgId are available. Used by api/me.js so the client can
   enforce server-truth RBAC in the UI.
   ------------------------------------------------------------ */
export async function resolveCapabilities(identity) {
  if (!identity || identity.ok !== true || !identity.role) return [];
  const base = new Set(DEFAULT_GRANTS[identity.role] || []);
  if (identity.role === 'admin') return CAPABILITY_IDS.slice(); // admin is always all-access

  if (authConfigured() && identity.orgId) {
    try {
      const admin = await getAdmin();
      const { data, error } = await admin
        .from('rally_role_grants')
        .select('capability, granted')
        .eq('org_id', identity.orgId)
        .eq('role', identity.role);
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.granted) base.add(row.capability);
          else base.delete(row.capability);
        }
      }
    } catch (e) {
      console.warn('[authz] role-grants lookup skipped:', e?.message);
    }
  }
  return CAPABILITY_IDS.filter(id => base.has(id));
}

/* ============================================================
   gateWrite(req, minRole) - the convenience guard for write routes.
   Additive + env-gated:
     - Supabase NOT configured  -> { blocked:false } (demo mode, no lockout)
     - configured + role >= min  -> { blocked:false, identity }
     - configured + bad/no auth  -> { blocked:true, status, code, error }
   A route calls this on its POST/PATCH/DELETE path only; GET stays open.
   ============================================================ */
export async function gateWrite(req, minRole = 'rep') {
  if (!authConfigured()) return { blocked: false, configured: false };

  const identity = await authenticate(req);

  // authenticate can still report unconfigured for the JWT path even when
  // the env is present but half-wired; treat that as demo (no lockout).
  if (identity.configured === false) return { blocked: false, configured: false };

  if (!identity.ok) {
    return { blocked: true, status: identity.status || 401, code: identity.code || 'unauthorized', error: identity.error || 'Authentication required.', identity };
  }
  if (!requireRole(identity, minRole)) {
    return {
      blocked: true,
      status: 403,
      code: 'insufficient_role',
      error: `This action requires the ${minRole} role or higher.`,
      identity,
    };
  }
  return { blocked: false, configured: true, identity };
}

export default {
  ROLE_RANK, ROLE_IDS, CAPABILITY_IDS, DEFAULT_GRANTS, rankOf,
  authConfigured, looksLikeApiKey, authenticate,
  requireRole, requireOrg, can, resolveCapabilities, gateWrite,
};
