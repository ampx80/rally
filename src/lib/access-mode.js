// ============================================================
// RALLY ACCESS MODE  (single source of truth for how the app gates)
// One module decides whether the product is reached via today's shared
// access-code gate ('code', the default) or per-user Supabase auth
// ('supabase'). Everything that gates the app should read from here so the
// switch lives in exactly one place.
//
// SAFETY / INERT CONTRACT: this module NEVER throws and ALWAYS defaults to
// today's behavior. authMode() returns 'supabase' ONLY when both
// VITE_AUTH_MODE === 'supabase' AND the browser Supabase client is
// configured. With the env var unset, set to anything else, or the Supabase
// public vars absent, it returns 'code' and the app behaves exactly as it
// does now (the coming-soon access-code gate). Importing this module is
// side-effect free beyond reading localStorage.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { isConfigured } from './supabase-browser.js';
import { useSession, getSession } from './auth.js';

// Mirrors gate/ComingSoon.jsx ACCESS_KEY on purpose so this module has zero
// coupling to the gate component (it can be imported anywhere without pulling
// in the gate's CSS). If the gate key ever changes, change it here too.
const ACCESS_KEY = 'rally_access';
// Fired by AuthGate after grantAccess() so same-tab listeners refresh (the
// native 'storage' event only fires in OTHER tabs).
export const ACCESS_EVENT = 'rally:access-change';

function readEnvMode() {
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return String(env.VITE_AUTH_MODE || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

function accessGranted() {
  try { return localStorage.getItem(ACCESS_KEY) === 'granted'; } catch { return false; }
}

// 'supabase' only when explicitly selected AND the client is configured;
// otherwise 'code' (today's behavior). Never throws.
export function authMode() {
  return readEnvMode() === 'supabase' && isConfigured() ? 'supabase' : 'code';
}

export function isSupabaseMode() {
  return authMode() === 'supabase';
}

// Best-effort synchronous read of a persisted Supabase session. supabase-js
// stores the session under a `sb-<ref>-auth-token` localStorage key with
// persistSession: true. We only need a cheap "is there a live-looking token"
// signal for the first paint; useAccessState() confirms it reactively. Never
// throws.
function hasCachedSupabaseSession() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.*-auth-token$/.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token || parsed?.currentSession?.access_token;
      const expiresAt = parsed?.expires_at || parsed?.currentSession?.expires_at;
      if (!token) continue;
      if (expiresAt && Number(expiresAt) * 1000 < Date.now()) continue;
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

// Synchronous "is the user allowed into the product". Session OR access-code.
// In code mode this is exactly the access-code check (today's behavior). In
// supabase mode the access code is still honored (so an operator with a code
// is never locked out) and a cached session also passes. Never throws.
export function isSignedIn() {
  if (accessGranted()) return true;
  if (isSupabaseMode()) return hasCachedSupabaseSession();
  return false;
}

// Imperatively mark the access code as granted (used by the gate) and notify
// same-tab listeners. Mirrors gate/ComingSoon.grantAccess but decoupled.
export function grantAccessCode() {
  try { localStorage.setItem(ACCESS_KEY, 'granted'); } catch { /* ignore */ }
  notifyAccessChange();
}

export function notifyAccessChange() {
  try { window.dispatchEvent(new CustomEvent(ACCESS_EVENT)); } catch { /* ignore */ }
}

// Reactive gate state for components. Shape:
//   { mode, signedIn, loading, configured, session, user, hasCode }
// - mode:       'code' | 'supabase'
// - signedIn:   session OR access-code
// - loading:    true only while a supabase session is being resolved
// - configured: supabase public env present
// In code mode this resolves immediately (loading:false) and tracks the
// access code across grants and other tabs, so it is a faithful, non-throwing
// stand-in for today's isUnlocked() state.
export function useAccessState() {
  const mode = authMode();
  const configured = isConfigured();
  // Supabase session subscription (stable signed-out state when unconfigured).
  const sess = useSession();
  const [hasCode, setHasCode] = useState(accessGranted);

  useEffect(() => {
    const refresh = () => setHasCode(accessGranted());
    const onStorage = (e) => { if (!e || e.key === ACCESS_KEY) refresh(); };
    window.addEventListener(ACCESS_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    refresh();
    return () => {
      window.removeEventListener(ACCESS_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (mode === 'supabase') {
    const signedIn = hasCode || !!sess.session;
    return {
      mode,
      configured,
      session: sess.session,
      user: sess.user,
      hasCode,
      loading: sess.loading && !hasCode,
      signedIn,
    };
  }
  // Code mode: no async, access-code is the whole story.
  return {
    mode,
    configured,
    session: null,
    user: null,
    hasCode,
    loading: false,
    signedIn: hasCode,
  };
}

// Promise form of the current session for non-React callers. Resolves null in
// code / unconfigured mode. Never throws.
export async function resolveSession() {
  if (!isSupabaseMode()) return null;
  try { return await getSession(); } catch { return null; }
}
