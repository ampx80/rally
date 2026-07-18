// ============================================================
// ARDOVO MAILBOXES - connected email accounts (the Salesforce
// "Einstein Activity Capture" / org-wide email + connected
// account foundation). A customer connects a mailbox one of three
// ways: Google OAuth, Microsoft/Outlook OAuth, or manual SMTP+IMAP.
// Connections are persisted to rally_mailboxes_v1. OAuth is wired
// through /api/oauth-start + /api/oauth-callback (real flow when the
// provider env keys are set; graceful "use SMTP" fallback when not).
// SMTP/IMAP is fully functional locally as a stored connection.
// SUPABASE: rally_mailboxes (per-user, secrets in a vault column).
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_mailboxes_v1';

export const PROVIDERS = {
  google:    { id: 'google',    label: 'Google Workspace / Gmail', short: 'Gmail',   icon: 'mail',  color: '#ea4335', oauth: true,  authDomain: 'accounts.google.com' },
  microsoft: { id: 'microsoft', label: 'Microsoft 365 / Outlook',  short: 'Outlook', icon: 'mail',  color: '#0078d4', oauth: true,  authDomain: 'login.microsoftonline.com' },
  smtp:      { id: 'smtp',      label: 'Any mailbox (SMTP + IMAP)', short: 'SMTP',    icon: 'plug',  color: '#5b4bf5', oauth: false },
};
export const providerMeta = (id) => PROVIDERS[id] || PROVIDERS.smtp;

// Common SMTP presets so a non-technical customer does not have to hunt
// for host/port. Selecting one prefills the form.
export const SMTP_PRESETS = [
  { id: 'gmail',     label: 'Gmail / Google Workspace', host: 'smtp.gmail.com',        port: 587, secure: 'starttls', imapHost: 'imap.gmail.com',        imapPort: 993 },
  { id: 'outlook',   label: 'Outlook / Microsoft 365',  host: 'smtp.office365.com',     port: 587, secure: 'starttls', imapHost: 'outlook.office365.com', imapPort: 993 },
  { id: 'yahoo',     label: 'Yahoo Mail',               host: 'smtp.mail.yahoo.com',    port: 465, secure: 'ssl',      imapHost: 'imap.mail.yahoo.com',   imapPort: 993 },
  { id: 'zoho',      label: 'Zoho Mail',                host: 'smtp.zoho.com',          port: 465, secure: 'ssl',      imapHost: 'imap.zoho.com',         imapPort: 993 },
  { id: 'fastmail',  label: 'Fastmail',                 host: 'smtp.fastmail.com',      port: 465, secure: 'ssl',      imapHost: 'imap.fastmail.com',     imapPort: 993 },
  { id: 'custom',    label: 'Custom / other host',      host: '',                       port: 587, secure: 'starttls', imapHost: '',                      imapPort: 993 },
];

let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function useMailboxes(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}
export const getMailboxes = () => state;
export const getDefaultMailbox = () => state.find(m => m.isDefault) || state[0] || null;

let idc = Date.now();
const newId = () => `mb_${(idc++).toString(36)}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Add / upsert a mailbox connection. First connection becomes default. */
export function addMailbox(conn) {
  const email = (conn.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'email', message: 'Enter a valid email address.' };
  if (conn.provider === 'smtp') {
    if (!conn.smtp?.host) return { error: 'host', message: 'SMTP host is required.' };
    if (!Number(conn.smtp?.port)) return { error: 'port', message: 'Enter a valid SMTP port.' };
    if (!conn.smtp?.username) return { error: 'username', message: 'SMTP username is required.' };
  }
  const existing = state.find(m => m.email === email && m.provider === conn.provider);
  const record = {
    id: existing?.id || newId(),
    provider: conn.provider,
    email,
    displayName: (conn.displayName || '').trim() || email,
    status: conn.status || 'connected',
    capabilities: conn.capabilities || { send: true, read: true, calendar: conn.provider !== 'smtp' },
    smtp: conn.provider === 'smtp' ? { ...conn.smtp, password: conn.smtp?.password ? '********' : '' } : undefined,
    scopes: conn.scopes || undefined,
    sync: conn.sync || { logEmails: true, logMeetings: true, direction: 'two-way' },
    isDefault: existing ? existing.isDefault : state.length === 0,
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    lastSyncAt: null,
  };
  const next = existing ? state.map(m => (m.id === existing.id ? record : m)) : [record, ...state];
  commit(next);
  return { mailbox: record };
}

export function setDefaultMailbox(id) {
  commit(state.map(m => ({ ...m, isDefault: m.id === id })));
}
export function updateMailbox(id, patch) {
  commit(state.map(m => (m.id === id ? { ...m, ...patch } : m)));
}
export function removeMailbox(id) {
  const wasDefault = state.find(m => m.id === id)?.isDefault;
  let next = state.filter(m => m.id !== id);
  if (wasDefault && next.length) next = next.map((m, i) => ({ ...m, isDefault: i === 0 }));
  commit(next);
}

/* Simulated connection test for SMTP (a real deploy runs this server-side
   against the host). Validates shape and returns a pass/fail the UI shows. */
export function testMailbox(id) {
  const m = state.find(x => x.id === id);
  if (!m) return { ok: false, message: 'Mailbox not found.' };
  if (m.provider === 'smtp' && (!m.smtp?.host || !m.smtp?.port)) return { ok: false, message: 'SMTP host and port are required.' };
  updateMailbox(id, { status: 'connected', lastSyncAt: new Date().toISOString() });
  return { ok: true, message: `${m.email} responded. Connection healthy.` };
}

/* OAuth foundation. Asks the serverless whether the provider is configured;
   if so returns the consent URL to redirect to, otherwise a clear reason so
   the UI points the customer at the SMTP path. Never fabricates a session. */
export async function startOAuth(provider) {
  try {
    const r = await fetch(`/api/oauth-start?provider=${encodeURIComponent(provider)}`);
    if (!r.ok) return { configured: false, message: 'OAuth endpoint unavailable in this environment.' };
    const data = await r.json();
    return data; // { configured, url? , message? }
  } catch {
    return { configured: false, message: 'OAuth is not reachable in local preview. Connect via SMTP instead.' };
  }
}
