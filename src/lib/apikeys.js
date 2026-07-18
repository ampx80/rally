// Browser-side API key management for the Ardovo developer console.
//
// This is the LOCAL DEMO store: keys are generated in the browser and kept in
// localStorage so the Developers page can demonstrate the full create / copy /
// reveal / revoke lifecycle without a backend. The full plaintext key is shown
// exactly once (at creation), then only a masked preview is retained - mirroring
// how real key vaults behave. Production keys are provisioned server-side and
// validated by api/_lib-v1.js against the keys store; a key created here only
// authenticates against the live API if it is mirrored into that store.
//
// ASCII only. No em-dash / en-dash.
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_api_keys_v1';

/* ---------- persistence + pub/sub ---------- */
let keys = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch {}
  return [];
}
function commit(next) {
  keys = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(keys)); } catch {}
  subs.forEach(fn => fn(keys));
}

/* ---------- key generation ---------- */
// rk_<env>_<32 url-safe chars>. Uses crypto when available, degrades to Math.
function randomToken(len = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  try {
    const buf = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  } catch {
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function newId() {
  return 'key_' + randomToken(12);
}

function mask(token) {
  // rk_live_ABCD............WXYZ
  const head = token.slice(0, 12);
  const tail = token.slice(-4);
  return `${head}...${tail}`;
}

/* ---------- read API ---------- */
export function listKeys() { return keys; }

/* ---------- write API ---------- */
// Returns the created record INCLUDING the one-time plaintext `secret`.
// The stored record keeps only the masked preview.
export function createKey({ name, env = 'live' } = {}) {
  const label = String(name || '').trim() || 'Untitled key';
  const prefix = env === 'test' ? 'rk_test_' : 'rk_live_';
  const secret = prefix + randomToken(32);
  const record = {
    id: newId(),
    name: label,
    env,
    preview: mask(secret),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  };
  commit([record, ...keys]);
  return { ...record, secret };
}

export function revokeKey(id) {
  const next = keys.map(k => k.id === id ? { ...k, revoked: true, revokedAt: new Date().toISOString() } : k);
  commit(next);
  return next.find(k => k.id === id) || null;
}

export function deleteKey(id) {
  commit(keys.filter(k => k.id !== id));
}

/* ---------- React hook ---------- */
export function useApiKeys() {
  const [snap, setSnap] = useState(keys);
  useEffect(() => {
    const fn = (k) => setSnap(k);
    subs.add(fn); fn(keys);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
