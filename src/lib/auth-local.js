// ============================================================
// ARDOVO AUTH (local-first accounts + session + TOTP 2FA)
//
// A real login/session layer that works with zero backend (localStorage), and
// is Supabase-swappable later. Accounts have an email, a salted SHA-256
// password hash, an optional TOTP second factor (RFC 6238, authenticator-app
// compatible), and map to a CRM user in store.js. Super admins are recognized
// by email (src/lib/access.js).
//
// ADDITIVE + non-breaking: the product still opens in demo via the access-code
// gate. When someone actually logs in here, the session drives RBAC (who am I,
// what role). getActor() resolves the current actor for permission checks and
// defaults to a privileged demo actor so nothing is locked before login.
//
// SECURITY NOTE: client-side SHA-256 is the local-first tier only; production
// auth should be Supabase / a real IdP. This module is structured so the UI
// (login, enroll 2FA) is identical when the backend is swapped in.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers, getCurrentUser } from './store.js';
import { isSuperAdminEmail } from './access.js';

const LS_KEY = 'rally_auth_v1';
const SESSION_KEY = 'rally_auth_session_v1';

/* ============================================================
   TOTP  (RFC 4226 / 6238, HMAC-SHA1, 30s, 6 digits) - pure Web Crypto
   ============================================================ */
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0; const out = [];
  for (const c of clean) { const idx = B32_ALPHABET.indexOf(c); if (idx < 0) continue; value = (value << 5) | idx; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; } }
  return new Uint8Array(out);
}
export function generateTotpSecret(len = 20) {
  const bytes = new Uint8Array(len);
  (crypto.getRandomValues ? crypto : window.crypto).getRandomValues(bytes);
  return base32Encode(bytes);
}
export function otpauthURI(email, secret, issuer = 'Ardovo') {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
  return new Uint8Array(sig);
}
function counterBytes(counter) {
  const b = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { b[i] = counter & 0xff; counter = Math.floor(counter / 256); }
  return b;
}
async function hotp(secretBytes, counter) {
  const h = await hmacSha1(secretBytes, counterBytes(counter));
  const o = h[h.length - 1] & 0xf;
  const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}
export async function totpNow(secretB32, t = Date.now()) {
  return hotp(base32Decode(secretB32), Math.floor(t / 1000 / 30));
}
export async function verifyTotp(secretB32, code, window = 1) {
  const bytes = base32Decode(secretB32);
  const c = Math.floor(Date.now() / 1000 / 30);
  const clean = String(code || '').replace(/\s/g, '');
  for (let w = -window; w <= window; w++) { if (await hotp(bytes, c + w) === clean) return true; }
  return false;
}

/* ============================================================
   PASSWORD HASH (salted SHA-256, local-first tier)
   ============================================================ */
function randHex(n = 16) {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function genRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => `${randHex(2)}-${randHex(2)}-${randHex(2)}`);
}

/* ============================================================
   ACCOUNT STORE
   ============================================================ */
function seed() {
  // One account per seeded CRM user, plus the super admins. No passwords set
  // yet (passwordless demo continue); a password can be set on first login.
  const accounts = getUsers().map(u => ({
    id: `acc_${u.id}`, storeUserId: u.id, email: (u.email || '').toLowerCase(), name: u.name,
    salt: '', passHash: '', twofa: { enabled: false, secret: '', recoveryCodes: [] },
    createdAt: new Date().toISOString(),
  }));
  const supers = ['nate@amptekgrowth.com', 'ampx80@gmail.com'];
  for (const em of supers) {
    if (!accounts.some(a => a.email === em)) {
      accounts.push({ id: `acc_${em.replace(/[^a-z]/g, '')}`, storeUserId: null, email: em, name: 'Nate Richard', salt: '', passHash: '', twofa: { enabled: false, secret: '', recoveryCodes: [] }, createdAt: new Date().toISOString() });
    }
  }
  return { accounts, policy: { enforce2faForAdmins: false }, seededAt: new Date().toISOString() };
}
function normalize(s) {
  return { accounts: Array.isArray(s?.accounts) ? s.accounts : [], policy: { enforce2faForAdmins: false, ...(s?.policy || {}) }, seededAt: s?.seededAt || null };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const s = normalize(JSON.parse(raw)); if (s.accounts.length) return s; } } catch {}
  const s = seed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  return s;
}
let state = load();
const subs = new Set();
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

let session = readSession();
function readSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function writeSession(s) { session = s; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {} subs.forEach(fn => fn(state)); }

export function getAccounts() { return state.accounts; }
export function getPolicy() { return state.policy; }
export function findAccount(email) { return state.accounts.find(a => a.email === String(email || '').toLowerCase()); }
export function currentAccount() { return session?.accountId ? state.accounts.find(a => a.id === session.accountId) || null : null; }
export function isAuthed() { return !!currentAccount(); }

export function useAuth(selector = (s) => ({ state: s, session, account: currentAccount() })) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}

/* ============================================================
   ACTOR RESOLUTION  (who am I, for RBAC)
   Logged-in account -> its store user + role source. In demo (no login),
   default to the store current user as a privileged Super Admin actor so the
   app is fully usable pre-login (matches access.js "admin open in demo").
   ============================================================ */
export function getActor() {
  const acc = currentAccount();
  if (acc) {
    const users = getUsers();
    const user = acc.storeUserId ? users.find(u => u.id === acc.storeUserId) : users.find(u => (u.email || '').toLowerCase() === acc.email);
    const isSuper = isSuperAdminEmail(acc.email);
    return { account: acc, user: user || { id: acc.id, name: acc.name, email: acc.email, role: isSuper ? 'manager' : 'rep' }, email: acc.email, isSuper, loggedIn: true };
  }
  // Demo actor: current CRM user, treated as super admin (Nate) so nothing is
  // locked before real login. Admin UIs offer "preview as role" to see gating.
  const u = getCurrentUser();
  return { account: null, user: u, email: u?.email || 'nate@amptekgrowth.com', isSuper: true, loggedIn: false };
}
export function useActor() {
  const [actor, setActor] = useState(getActor);
  useEffect(() => { const fn = () => setActor(getActor()); subs.add(fn); return () => subs.delete(fn); }, []);
  return actor;
}

/* ============================================================
   AUTH FLOWS
   ============================================================ */
export async function signUp({ email, name, password }) {
  email = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };
  if (!password || password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (findAccount(email)) return { ok: false, error: 'An account with that email already exists.' };
  const salt = randHex(16);
  const passHash = await hashPassword(password, salt);
  const acc = { id: `acc_${randHex(6)}`, storeUserId: null, email, name: name || email.split('@')[0], salt, passHash, twofa: { enabled: false, secret: '', recoveryCodes: [] }, createdAt: new Date().toISOString() };
  commit({ ...state, accounts: [...state.accounts, acc] });
  writeSession({ accountId: acc.id, at: Date.now() });
  return { ok: true, account: acc };
}

// Returns { ok, needs2fa, pendingId, error }. If the account has a password set
// it is verified; seeded passwordless accounts accept any password on first
// login and set it (demo convenience).
export async function login({ email, password }) {
  email = String(email || '').toLowerCase().trim();
  const acc = findAccount(email);
  if (!acc) return { ok: false, error: 'No account with that email.' };
  if (acc.passHash) {
    const h = await hashPassword(password || '', acc.salt);
    if (h !== acc.passHash) return { ok: false, error: 'Wrong password.' };
  } else {
    // First login for a seeded account: set the password they typed.
    if (!password || password.length < 8) return { ok: false, error: 'Set a password (min 8 chars) to secure this account.' };
    const salt = randHex(16); const passHash = await hashPassword(password, salt);
    commit({ ...state, accounts: state.accounts.map(a => a.id === acc.id ? { ...a, salt, passHash } : a) });
  }
  if (acc.twofa?.enabled) return { ok: true, needs2fa: true, pendingId: acc.id };
  writeSession({ accountId: acc.id, at: Date.now() });
  return { ok: true, account: acc };
}

export async function completeLogin2fa(pendingId, code) {
  const acc = state.accounts.find(a => a.id === pendingId);
  if (!acc || !acc.twofa?.enabled) return { ok: false, error: 'No pending 2FA.' };
  const okCode = await verifyTotp(acc.twofa.secret, code);
  const okRecovery = (acc.twofa.recoveryCodes || []).includes(String(code || '').trim());
  if (!okCode && !okRecovery) return { ok: false, error: 'That code did not match. Try again.' };
  if (okRecovery) { // burn the used recovery code
    commit({ ...state, accounts: state.accounts.map(a => a.id === acc.id ? { ...a, twofa: { ...a.twofa, recoveryCodes: a.twofa.recoveryCodes.filter(c => c !== String(code).trim()) } } : a) });
  }
  writeSession({ accountId: acc.id, at: Date.now() });
  return { ok: true, account: acc };
}

export function logout() { writeSession(null); }

/* ---------- 2FA enrollment ---------- */
// Start: returns a fresh secret + otpauth URI to show as a QR (not yet enabled).
export function beginEnroll2fa(accountId) {
  const acc = state.accounts.find(a => a.id === accountId);
  if (!acc) return null;
  const secret = generateTotpSecret();
  return { secret, uri: otpauthURI(acc.email, secret) };
}
// Confirm: verify a code against the pending secret, then enable + return codes.
export async function confirmEnroll2fa(accountId, secret, code) {
  const ok = await verifyTotp(secret, code);
  if (!ok) return { ok: false, error: 'Code did not verify. Check your authenticator app and try again.' };
  const recoveryCodes = genRecoveryCodes();
  commit({ ...state, accounts: state.accounts.map(a => a.id === accountId ? { ...a, twofa: { enabled: true, secret, recoveryCodes } } : a) });
  return { ok: true, recoveryCodes };
}
export function disable2fa(accountId) {
  commit({ ...state, accounts: state.accounts.map(a => a.id === accountId ? { ...a, twofa: { enabled: false, secret: '', recoveryCodes: [] } } : a) });
}
export function setEnforce2faForAdmins(on) {
  commit({ ...state, policy: { ...state.policy, enforce2faForAdmins: !!on } });
}

export function resetAuth() { commit(seed()); writeSession(null); }
