// auth-log.js - a lightweight, local-first security activity log. Humane
// security means the account owner can always SEE what happened: every sign-in,
// every 2FA change, every recovery-code use. It is also the audit trail every
// enterprise buyer asks for. Events are appended here by auth-local.js and
// surfaced in the Security console. Capped so it never grows unbounded.
// Server-backed later; the shape stays the same. NO em-dash. ASCII only.
import { useEffect, useState } from 'react';

const KEY = 'rally_auth_log_v1';
const CAP = 200;
const subs = new Set();

function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function write(list) {
  const capped = list.slice(0, CAP);
  try { localStorage.setItem(KEY, JSON.stringify(capped)); } catch {}
  subs.forEach(fn => fn(capped));
}

export function logAuthEvent(type, detail = {}) {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, at: new Date().toISOString(), ...detail };
  write([entry, ...read()]);
  return entry;
}
export function getAuthLog() { return read(); }
export function clearAuthLog() { write([]); }

export function useAuthLog() {
  const [list, setList] = useState(read);
  useEffect(() => { const fn = (l) => setList(l); subs.add(fn); setList(read()); return () => subs.delete(fn); }, []);
  return list;
}

// Presentation metadata: icon, label, and tone per event type.
const META = {
  signup: { icon: 'user', label: 'Account created', tone: 'ok' },
  signin: { icon: 'logout', label: 'Signed in', tone: 'default' },
  signin_failed: { icon: 'activity', label: 'Failed sign-in attempt', tone: 'warn' },
  twofa_enabled: { icon: 'shield', label: 'Two-factor enabled', tone: 'ok' },
  twofa_disabled: { icon: 'lock', label: 'Two-factor disabled', tone: 'warn' },
  twofa_recovery_used: { icon: 'key', label: 'Recovery code used', tone: 'warn' },
  recovery_codes_regenerated: { icon: 'key', label: 'Recovery codes regenerated', tone: 'default' },
  password_changed: { icon: 'lock', label: 'Password changed', tone: 'default' },
};
export function authEventMeta(type) { return META[type] || { icon: 'activity', label: type, tone: 'default' }; }

// Friendly method label for a sign-in event.
export function methodLabel(method) {
  return ({ password: 'password', google: 'Google', totp: 'authenticator', recovery_code: 'recovery code' })[method] || method || '';
}
