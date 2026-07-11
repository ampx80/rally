// ============================================================
// RALLY BROWSER SUPABASE CLIENT  (additive auth layer)
// Lazy, guarded client for real user authentication. This is a SEPARATE
// module from src/lib/supabase.js (which powers the local-first data store)
// so the auth foundation can land without touching anything already shipping.
//
// When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are absent (the default
// demo / coming-soon mode), getBrowserSupabase() returns null and
// isConfigured() returns false. Nothing here throws at import time, so the
// app keeps running in local-first / access-code-gate mode untouched.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  // import.meta.env is statically replaced by Vite at build time. Guard the
  // whole access so a non-Vite context (tests, SSR probes) never throws.
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_ANON_KEY };
  } catch {
    return { url: undefined, key: undefined };
  }
}

// True only when both public env vars are present. Cheap; call freely.
export function isConfigured() {
  const { url, key } = readEnv();
  return Boolean(url && key);
}

let _client = null;
let _tried = false;

// Lazy singleton. Constructs the client on first call only when configured;
// otherwise returns null every time. Never constructed at module top level.
export function getBrowserSupabase() {
  if (_client) return _client;
  if (_tried) return _client; // do not re-probe once we know env is missing
  _tried = true;
  const { url, key } = readEnv();
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

// Convenience value export. Evaluated once at import; null in local-first mode.
// The getBrowserSupabase() guard means this line does NOT construct a client
// unless the public env vars exist, so importing this module stays side-effect
// free in the demo build.
export const supabase = getBrowserSupabase();

export default supabase;
