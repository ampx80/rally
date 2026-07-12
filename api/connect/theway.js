// POST /api/connect/theway   (GET also accepted)
// ============================================================
// Rally  <-  The Way   delivery-projects bridge (env-gated).
// The server-side half of the The Way connector (see
// src/lib/integrations/connectors/theway.js). Proxies The Way's
// projects list into Rally so the CRM can show live post-sale
// delivery status on a deal / company record.
//
// ENV GATE (non-negotiable, per platform contract):
//   THEWAY_API_KEY   - secret held server-side ONLY. If ABSENT the
//                      bridge returns a graceful not-connected state
//                      ( { connected:false, configured:false } ), 200,
//                      NEVER an error. The client falls back to seeded
//                      demo projects. Nothing throws.
//   THEWAY_BASE_URL  - optional. Origin of the The Way workspace.
//                      Defaults to the canonical production URL.
//   THEWAY_ORG_ID    - optional. Scope the pull to one The Way org.
//
// ADDITIVE + SAFE: read-only proxy. Every failure path returns 200
// with { projects: [] } so the caller can degrade cleanly. No em-dash.
// ============================================================
import { withErrorHandling, methodNotAllowed, readJsonBody } from '../_utils.js';

const DEFAULT_BASE = 'https://thewayhq.vercel.app';

function originOf(url, fallback) {
  try { return new URL(url).origin; } catch { return fallback; }
}

// Slim a raw the_way_projects row down to what the Rally connector normalizes.
function slim(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: r.id != null ? String(r.id) : null,
    name: r.name || 'Untitled project',
    status: r.status || r.current_status || 'In Progress',
    ryg_status: r.ryg_status || r.ryg || 'green',
    project_manager: r.project_manager || r.pm || '',
    current_status: r.current_status || '',
    updated_at: r.updated_at || r.created_at || null,
    progress: r.progress ?? r.percent_complete ?? null,
    total_tasks: r.total_tasks ?? r.task_count ?? null,
    open_tasks: r.open_tasks ?? null,
  };
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return methodNotAllowed(res, ['GET', 'POST']);
  }

  const apiKey = process.env.THEWAY_API_KEY || '';
  const base = originOf(process.env.THEWAY_BASE_URL || DEFAULT_BASE, DEFAULT_BASE);
  const orgId = process.env.THEWAY_ORG_ID || '';

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Env gate: no secret -> graceful not-connected (never an error).
  if (!apiKey) {
    return res.status(200).json({
      connected: false, configured: false,
      reason: 'THE_WAY_NOT_CONFIGURED', projects: [],
    });
  }

  const body = req.method === 'POST' ? readJsonBody(req) : (req.query || {});
  const action = body.action || 'projects';
  if (action !== 'projects') {
    return res.status(200).json({ connected: true, configured: true, ok: false, reason: 'UNKNOWN_ACTION', projects: [] });
  }

  try {
    const url = new URL('/api/projects', base);
    url.searchParams.set('limit', '50');
    url.searchParams.set('order', 'updated_at.desc');
    if (orgId) url.searchParams.set('org_id', `eq.${orgId}`);

    const upstream = await fetch(url.toString(), {
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        accept: 'application/json',
      },
    });
    if (!upstream.ok) {
      return res.status(200).json({ connected: true, configured: true, ok: false, error: `upstream ${upstream.status}`, projects: [] });
    }
    const payload = await upstream.json().catch(() => []);
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
    const projects = list.map(slim).filter(Boolean);
    return res.status(200).json({ connected: true, configured: true, ok: true, count: projects.length, projects });
  } catch (e) {
    return res.status(200).json({ connected: true, configured: true, ok: false, error: String(e?.message || 'bridge error').slice(0, 140), projects: [] });
  }
});
