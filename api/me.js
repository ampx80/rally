// ============================================================
// GET /api/me
// ============================================================
// Returns the caller's server-resolved identity: user id, org, role, and
// the fully resolved capability list (defaults merged with per-org
// rally_role_grants overrides). The client calls this so its RBAC UI is
// backed by server truth instead of trusting localStorage alone.
//
// Guarded / demo mode: when Supabase is not configured this returns a
// synthetic demo identity (admin, every capability) with configured:false,
// so the SPA behaves EXACTLY as it does today with no auth backend.
//
// ASCII only. No em-dash / en-dash.
// ============================================================
import { withErrorHandling, methodNotAllowed } from './_utils.js';
import {
  authenticate, resolveCapabilities, authConfigured, CAPABILITY_IDS,
} from './_lib-authz.js';

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  // Demo / local-first: no auth backend. Mirror the client default (admin)
  // so the UI is unchanged. configured:false tells the client it is a demo.
  if (!authConfigured()) {
    return res.status(200).json({
      ok: true,
      configured: false,
      demo: true,
      identity: {
        userId: null,
        orgId: null,
        role: 'admin',
        email: null,
        source: 'demo',
        capabilities: CAPABILITY_IDS.slice(),
      },
    });
  }

  const identity = await authenticate(req);
  if (!identity.ok) {
    const status = identity.status || 401;
    return res.status(status).json({
      ok: false,
      configured: true,
      error: identity.error || 'Not authenticated.',
      code: identity.code || 'unauthorized',
    });
  }

  const capabilities = await resolveCapabilities(identity);
  return res.status(200).json({
    ok: true,
    configured: true,
    identity: {
      userId: identity.userId,
      orgId: identity.orgId,
      role: identity.role,
      email: identity.email || null,
      name: identity.name || null,
      source: identity.source,
      capabilities,
    },
  });
});
