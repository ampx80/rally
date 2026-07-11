// ============================================================
// POST or GET /api/auth-session
//
// Optional server-side helper that validates a Supabase access token (JWT) and
// returns the authenticated user. Use it from any serverless route that needs
// to trust "who is calling" instead of relying on the client.
//
// Send the token either as an Authorization: Bearer <jwt> header or as
// { token } in a POST body. On a valid token: { ok:true, user:{...} }.
// On a missing/invalid token: 401. When Supabase env is absent (local-first /
// demo), returns 503 { ok:false, configured:false } and never throws.
//
// Env (server): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already on Vercel).
// The service role key stays server-side only; it is never shipped to the
// client. NO em-dash / en-dash. ASCII only.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling, readJsonBody } from './_utils.js';

let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _admin;
}

function readToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (req.method === 'POST') {
    const body = readJsonBody(req);
    if (body && body.token) return String(body.token).trim();
  }
  return '';
}

export default withErrorHandling(async (req, res) => {
  const admin = getAdmin();
  if (!admin) {
    // Local-first / demo build. No auth backend to validate against.
    return res.status(503).json({ ok: false, configured: false, error: 'Auth is not configured on the server.' });
  }

  const token = readToken(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Missing bearer token.' });

  // getUser(jwt) verifies the token signature + expiry against the project.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }

  const u = data.user;
  return res.status(200).json({
    ok: true,
    configured: true,
    user: {
      id: u.id,
      email: u.email || null,
      name: u.user_metadata?.name || u.user_metadata?.full_name || null,
      role: u.role || null,
      createdAt: u.created_at || null,
    },
  });
});
