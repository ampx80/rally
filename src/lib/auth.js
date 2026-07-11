// ============================================================
// RALLY AUTH  (additive real-auth layer over Supabase Auth)
// A thin, no-op-safe wrapper around Supabase Auth. Every function is safe to
// call whether or not Supabase is configured: when env is absent each call
// resolves to a clear { error: 'auth-not-configured', message } result instead
// of throwing, so the local-first / coming-soon build is never affected.
//
// Result shape is uniform:
//   success -> { user, session }   (session may be null right after signUp
//                                   when email confirmation is required)
//   failure -> { error, message }
//
// This layer does NOT wire itself into the app. It is dormant until a route
// renders SignIn / SignUp / ForgotPassword or a component calls useSession().
// See docs/AUTH.md for how to flip the app onto it. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getBrowserSupabase, isConfigured } from './supabase-browser.js';

const NOT_CONFIGURED = {
  error: 'auth-not-configured',
  message: 'Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign in.',
};

export { isConfigured } from './supabase-browser.js';

// Where the browser lands after an email link (magic confirm / password reset)
// or an OAuth round trip. Guarded for non-browser contexts.
function siteOrigin() {
  try { return window.location.origin; } catch { return ''; }
}
function redirectTo(path) {
  const o = siteOrigin();
  return o ? `${o}${path}` : undefined;
}

// Normalize any thrown/returned Supabase error into our uniform shape.
function fail(err, fallback) {
  const message = (err && (err.message || err.error_description)) || fallback || 'Something went wrong. Please try again.';
  return { error: err?.name || err?.code || 'auth-error', message };
}

/* ---------- Email + password ---------- */

// Create an account. `name` is stored in user_metadata so the app can greet
// the user before their profile row exists. If the project requires email
// confirmation, session is null and the caller should show a "check your
// inbox" state.
export async function signUp({ email, password, name } = {}) {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: String(email || '').trim(),
      password: String(password || ''),
      options: {
        data: name ? { name: String(name).trim(), full_name: String(name).trim() } : undefined,
        emailRedirectTo: redirectTo('/app'),
      },
    });
    if (error) return fail(error, 'Could not create your account.');
    return { user: data.user || null, session: data.session || null };
  } catch (e) {
    return fail(e, 'Could not create your account.');
  }
}

// Sign in with an existing email + password.
export async function signIn({ email, password } = {}) {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || ''),
    });
    if (error) return fail(error, 'Could not sign you in.');
    return { user: data.user || null, session: data.session || null };
  } catch (e) {
    return fail(e, 'Could not sign you in.');
  }
}

// Start an OAuth sign in (currently wired for Google). Returns immediately with
// a redirect URL; Supabase then navigates the browser to the provider.
export async function signInWithOAuth(provider = 'google') {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo('/app') },
    });
    if (error) return fail(error, `Could not start ${provider} sign in.`);
    return { url: data?.url || null };
  } catch (e) {
    return fail(e, `Could not start ${provider} sign in.`);
  }
}
export const signInWithGoogle = () => signInWithOAuth('google');

// Send a password reset email. The link lands on the app with a recovery
// session; a reset screen (not built here) would call supabase.auth.updateUser.
export async function resetPassword(email) {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim(), {
      redirectTo: redirectTo('/app'),
    });
    if (error) return fail(error, 'Could not send the reset email.');
    return { ok: true };
  } catch (e) {
    return fail(e, 'Could not send the reset email.');
  }
}

// Update the current user's password (used from a recovery session).
export async function updatePassword(password) {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { data, error } = await supabase.auth.updateUser({ password: String(password || '') });
    if (error) return fail(error, 'Could not update your password.');
    return { user: data.user || null };
  } catch (e) {
    return fail(e, 'Could not update your password.');
  }
}

/* ---------- Session ---------- */

export async function signOut() {
  const supabase = getBrowserSupabase();
  if (!supabase) return NOT_CONFIGURED;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return fail(error, 'Could not sign you out.');
    return { ok: true };
  } catch (e) {
    return fail(e, 'Could not sign you out.');
  }
}

// Current session (or null). Never throws; returns null in local-first mode.
export async function getSession() {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

/* ---------- React hook ---------- */

// Subscribe to auth state. Safe when unconfigured: returns a stable, resolved
// "signed out" state and never subscribes. Shape:
//   { session, user, loading, configured }
export function useSession() {
  const configured = isConfigured();
  const [state, setState] = useState({ session: null, user: null, loading: configured, configured });

  useEffect(() => {
    if (!configured) { setState({ session: null, user: null, loading: false, configured: false }); return; }
    const supabase = getBrowserSupabase();
    if (!supabase) { setState({ session: null, user: null, loading: false, configured: false }); return; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data?.session || null;
      setState({ session, user: session?.user || null, loading: false, configured: true });
    }).catch(() => { if (active) setState({ session: null, user: null, loading: false, configured: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!active) return;
      setState({ session: session || null, user: session?.user || null, loading: false, configured: true });
    });
    return () => { active = false; sub?.subscription?.unsubscribe?.(); };
  }, [configured]);

  return state;
}
