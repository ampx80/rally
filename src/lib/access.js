// ============================================================
// ACCESS  -  super-admin gating for back-office surfaces (/admin, etc).
// ampx80@gmail.com is the designated super admin. Enforcement is keyed off
// the real Supabase session email, so it activates automatically the moment
// auth is turned on. Before auth is configured (demo / pre-launch), admin is
// open so the panel is usable now. ASCII only. NO em-dash / en-dash.
// ============================================================
import { useSession } from './auth.js';

// The people allowed into the back office. Lowercase. Add more super admins here.
export const SUPER_ADMINS = new Set([
  'ampx80@gmail.com',
  'nate@amptekgrowth.com',
]);

export function isSuperAdminEmail(email) {
  return !!email && SUPER_ADMINS.has(String(email).trim().toLowerCase());
}

// Returns { allowed, reason, configured, loading }.
// - auth not configured (pre-launch/demo): allowed (so /admin works today).
// - configured + session email is a super admin: allowed.
// - configured + logged in as someone else: denied.
// - configured + not logged in: denied.
export function useAdminAccess() {
  const { user, configured, loading } = useSession();
  if (!configured) return { allowed: true, reason: 'demo', configured: false, loading: false };
  if (loading) return { allowed: false, reason: 'loading', configured: true, loading: true };
  if (isSuperAdminEmail(user && user.email)) return { allowed: true, reason: 'super-admin', configured: true, loading: false, email: user.email };
  return { allowed: false, reason: user ? 'not-super-admin' : 'signed-out', configured: true, loading: false, email: user && user.email };
}

export function useIsSuperAdmin() { return useAdminAccess().allowed; }
