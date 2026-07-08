// Lazy Supabase client. Never constructed at module top level. When env is
// absent (the default demo), every store function falls back to the local
// seed in store.js. To go live: set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY,
// then swap each store fn body for the query in its // SUPABASE: note. The
// function signatures never change.
import { createClient } from '@supabase/supabase-js';

let _client = null;
export function getSupabase() {
  if (_client) return _client;
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: true } });
  return _client;
}
export const hasBackend = () =>
  Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
