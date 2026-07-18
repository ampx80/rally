// ============================================================
// ARDOVO DATA LAYER - ENTRY POINT
// ------------------------------------------------------------
// getDataLayer() returns the active adapter, chosen once by a flag:
//
//   VITE_DATA_BACKEND === 'supabase'  AND  Supabase is configured
//     -> SupabaseAdapter (multi-tenant, org-scoped, realtime)
//   otherwise
//     -> LocalAdapter (the existing local-first stores, unchanged)
//
// The default in every current build is LOCAL. There is no way to
// accidentally hit Supabase: the flag must be set AND the public env
// vars must be present. If the flag says supabase but the client is
// not configured, we log once and fall back to local so the app
// never breaks.
//
// useData(entity, query) is the React hook pages adopt incrementally.
// It returns { data, loading, error, refresh } plus create/update/
// remove helpers bound to the entity. It stays live in both backends:
// locally via the existing store pub/sub, remotely via Supabase
// realtime.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { useExt } from '../store-ext.js';
import { isConfigured as isSupabaseConfigured } from '../supabase-browser.js';
import { getLocalAdapter } from './local-adapter.js';
import { getSupabaseAdapter } from './supabase-adapter.js';

let _layer = null;
let _warned = false;

// The Supabase backend is active only when BOTH the flag is set and
// the client is configured. Either missing -> local backend.
export function isSupabaseSelected() {
  return flagWantsSupabase() && isSupabaseConfigured();
}

// Chooses and memoizes the adapter for the life of the page load.
export function getDataLayer() {
  if (_layer) return _layer;
  if (isSupabaseSelected()) {
    _layer = getSupabaseAdapter();
  } else {
    _layer = getLocalAdapter();
    if (!_warned && flagWantsSupabase()) {
      _warned = true;
      // eslint-disable-next-line no-console
      console.warn('[data-layer] VITE_DATA_BACKEND=supabase but the client is not configured; using local backend.');
    }
  }
  return _layer;
}

export function getBackendName() {
  return getDataLayer().name;
}

// True when the build asked for Supabase via the flag (regardless of
// whether the client is actually configured).
function flagWantsSupabase() {
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return env.VITE_DATA_BACKEND === 'supabase';
  } catch {
    return false;
  }
}

// Test/advanced hook: force a specific adapter (used by docs examples
// and any future backend switch). Pass null to re-resolve from flags.
export function __setDataLayer(layer) {
  _layer = layer;
}

// ------------------------------------------------------------
// useData(entity, query)
// ------------------------------------------------------------
// Reactive read for one entity. `data` is always an array (list
// result). Adopt it in place of direct getX()/useStore() calls; the
// write helpers replace direct createX()/updateX() calls.
//
// Reactivity model:
//  - useStore()/useExt() give a fresh state reference on every local
//    commit; we read those references so a re-render is guaranteed
//    when the local stores change (this is what keeps the LocalAdapter
//    path live without touching store.js).
//  - The adapter's own subscribe() drives the Supabase realtime path
//    (and adapter-routed local writes).
// Both feed the same effect that re-lists from the active adapter.
export function useData(entity, query) {
  const dl = getDataLayer();

  // Subscribe to the local stores so local commits re-render this hook.
  // Harmless in Supabase mode (those stores simply never change there).
  const coreRef = useStore((s) => s);
  const extRef = useExt((s) => s);

  // Stable key for the query so the effect only re-runs on real change.
  const queryKey = useMemo(() => (query ? JSON.stringify(query) : ''), [query]);

  const [state, setState] = useState({ data: [], loading: true, error: null });
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;

    const run = () => {
      dl.list(entity, query).then((res) => {
        if (cancelled || !aliveRef.current) return;
        if (res.error) setState({ data: [], loading: false, error: res.error });
        else setState({ data: res.data, loading: false, error: null });
      });
    };

    run();
    const unsub = dl.subscribe(run);

    return () => {
      cancelled = true;
      aliveRef.current = false;
      if (typeof unsub === 'function') unsub();
    };
    // coreRef/extRef change on every local commit, which re-runs the
    // effect and re-lists. queryKey covers query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, queryKey, coreRef, extRef]);

  const refresh = () => dl.list(entity, query).then((res) => {
    if (!aliveRef.current) return res;
    if (res.error) setState((s) => ({ ...s, loading: false, error: res.error }));
    else setState({ data: res.data, loading: false, error: null });
    return res;
  });

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
    create: (patch) => dl.create(entity, patch),
    update: (id, patch) => dl.update(entity, id, patch),
    remove: (id) => dl.remove(entity, id),
  };
}
