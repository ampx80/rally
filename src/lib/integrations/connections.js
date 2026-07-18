// ============================================================
// ARDOVO CONNECTIONS  (local-first, pub/sub - mirrors modules.js)
// The per-workspace on/off + status state for every integration.
// Same shape as the module registry: a private `state` object,
// a Set of subscribers, a persisted localStorage key, and a
// reactive useConnections() hook so nav/settings/timeline re-render
// the moment a connection flips.
//
// SECURITY INVARIANT (non-negotiable):
//   Secrets NEVER touch client storage. Only connection STATUS and
//   NON-SECRET metadata persist here. Any field flagged secret in a
//   registry descriptor - plus anything whose key matches the secret
//   name pattern - is stripped before write. Real auth is held server
//   side; this store only remembers "connected, as of when, pointing
//   at which workspace URL".
//
// Connection record shape (per integration id):
//   { id, status, metadata, connectedAt, updatedAt, error }
//   status: 'disconnected' | 'connecting' | 'connected' | 'error'
//
// SUPABASE: rally_connections (per-workspace rows, realtime channel).
// Secret material lives in a server-only vault, never in these rows.
// ============================================================
import { useState, useEffect } from 'react';
import { integrationById, nonSecretFieldKeys } from './registry.js';

const LS = 'rally_connections_v1';

// Any metadata key matching this is treated as a secret and dropped.
const SECRET_KEY_RE = /(secret|token|password|api[-_]?key|apikey|client[-_]?secret|access[-_]?token|refresh[-_]?token|credential|private)/i;

const subs = new Set();

function read() {
  try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { return {}; }
}
let state = read();

function persist() {
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

/* Strip every secret from a metadata bag before it can be persisted.
   Two gates: (1) the registry descriptor's secret:true allow-list, so
   the SAFE keys are known explicitly; (2) a defense-in-depth name-pattern
   scrub for anything that smells like a credential regardless of descriptor.
   The result is a plain object safe to write to localStorage. */
export function sanitizeMetadata(id, metadata = {}) {
  const safeKeys = new Set(nonSecretFieldKeys(id)); // descriptor allow-list
  const out = {};
  for (const [k, v] of Object.entries(metadata || {})) {
    if (SECRET_KEY_RE.test(k)) continue;            // pattern gate
    if (safeKeys.size && !safeKeys.has(k)) {
      // Unknown key on a known descriptor: keep only if clearly not secret.
      // (Descriptorless ids fall through to the pattern gate above.)
      if (!integrationById(id)) out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/* ---------- reads ---------- */
export function getConnections() { return state; }
export function getConnection(id) { return state[id] || null; }
export function connectionStatus(id) { return state[id]?.status || 'disconnected'; }
export function isConnected(id) { return connectionStatus(id) === 'connected'; }
export function connectedIds() {
  return Object.keys(state).filter(id => state[id]?.status === 'connected');
}
export function connectedCount() { return connectedIds().length; }

/* ---------- writes ---------- */

// Low-level: merge a patch onto a connection record and notify.
// metadata in the patch is always run through sanitizeMetadata first.
export function setConnection(id, patch = {}) {
  const prev = state[id] || { id, status: 'disconnected', metadata: {}, connectedAt: null };
  const { metadata, ...rest } = patch;
  const nextMeta = metadata
    ? { ...prev.metadata, ...sanitizeMetadata(id, metadata) }
    : prev.metadata;
  const next = { ...prev, ...rest, id, metadata: nextMeta, updatedAt: new Date().toISOString() };
  state = { ...state, [id]: next };
  persist();
  return next;
}

// Mark a connection connected. `metadata` is sanitized - pass secrets and
// they are dropped here, so a caller can hand the raw connect form straight in.
export function connect(id, metadata = {}) {
  return setConnection(id, {
    status: 'connected',
    metadata,
    connectedAt: new Date().toISOString(),
    error: null,
  });
}

// Optimistic in-flight state while server-side auth completes.
export function beginConnecting(id, metadata = {}) {
  return setConnection(id, { status: 'connecting', metadata, error: null });
}

// Record a failed connect/sync so the UI can show a retry affordance.
export function setConnectionError(id, message = 'Connection failed') {
  return setConnection(id, { status: 'error', error: String(message) });
}

// Remove a connection entirely (disconnect). Wipes the local record; the
// server is responsible for revoking any held secret.
export function disconnect(id) {
  if (!state[id]) return null;
  const next = { ...state };
  delete next[id];
  state = next;
  persist();
  return null;
}

/* ---------- reactive hook (mirrors useModules) ---------- */
export function useConnections() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = (s) => setSnap({ ...s });
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
