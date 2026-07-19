// ============================================================
// EMAIL EVENTS STORE  (local-first, backend-hydratable)
// The engagement data layer behind the per-recipient timeline +
// click map. Real events arrive server-side through
// api/resend-webhook.js (open / click / bounce / complaint) and
// land in Supabase (rally_email_events). This store gives the UI a
// live, offline-capable view of that stream:
//
//   - Seeds a believable event history against the real contact
//     book (store.js) so the timeline + click map are never empty
//     in the local-first demo.
//   - hydrateFromApi() best-effort GETs /api/marketing-cron?action=events
//     and MERGES real events on top of the seed (dedupe by id).
//     A missing / unconfigured backend is a clean no-op.
//
// Same pub/sub + deterministic-seed pattern as the rest of Ardovo.
// SUPABASE: rally_email_events.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getContacts, getCompany, contactName } from '../../lib/store.js';

const LS_KEY = 'rally_email_events_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 86400000;

// The event types the timeline understands. `sent` is a synthetic anchor so a
// recipient's story starts at the send; the rest map 1:1 to Resend events.
export const EVENT_META = {
  sent: { label: 'Sent', icon: 'send', color: '#8a90a2' },
  opened: { label: 'Opened', icon: 'eye', color: '#0ea5a3' },
  clicked: { label: 'Clicked', icon: 'bolt', color: '#5b4bf5' },
  bounced: { label: 'Bounced', icon: 'rotateCcw', color: '#c0392b' },
  complained: { label: 'Complaint', icon: 'flag', color: '#e0752d' },
};
export const eventMeta = (t) => EVENT_META[t] || { label: t, icon: 'mail', color: '#8a90a2' };

const uid = (() => { let n = Date.now(); return (p) => `${p}_${(n++).toString(36)}`; })();

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small set of believable campaign links for the click map.
const LINKS = [
  'https://ardovo.com/demo',
  'https://ardovo.com/pricing',
  'https://ardovo.com/features',
  'https://ardovo.com/customers',
];
const SUBJECTS = [
  'Welcome to the conversation',
  'One number your board asks about',
  'An idea for next quarter',
  'Great meeting you at the booth',
];

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(514229);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const contacts = getContacts().filter(c => EMAIL_RE.test((c.email || '').trim()));
  const events = [];
  const reach = Math.min(contacts.length, 26);

  for (let i = 0; i < reach; i++) {
    const c = contacts[i];
    const company = c.companyId ? (getCompany(c.companyId)?.name || '') : '';
    const subject = SUBJECTS[i % SUBJECTS.length];
    const base = now - int(1, 20) * DAY - int(0, 22) * 3600000;
    const common = { email: c.email.toLowerCase(), name: contactName(c), company, subject, contactId: c.id };
    events.push({ id: uid('ee'), type: 'sent', ...common, at: base });

    const roll = rnd();
    if (roll < 0.08) {
      // a small slice bounce or complain
      events.push({ id: uid('ee'), type: rnd() < 0.6 ? 'bounced' : 'complained', ...common, at: base + int(1, 8) * 60000 });
      continue;
    }
    if (rnd() < 0.62) {
      events.push({ id: uid('ee'), type: 'opened', ...common, at: base + int(2, 90) * 60000 });
      if (rnd() < 0.4) {
        events.push({ id: uid('ee'), type: 'clicked', link: LINKS[int(0, LINKS.length - 1)], ...common, at: base + int(91, 180) * 60000 });
      }
      // some opens happen more than once
      if (rnd() < 0.3) events.push({ id: uid('ee'), type: 'opened', ...common, at: base + int(181, 600) * 60000 });
    }
  }
  return { seededAt: now, events, hydratedAt: null };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function normalize(s) {
  return {
    seededAt: s?.seededAt || Date.now(),
    events: Array.isArray(s?.events) ? s.events : [],
    hydratedAt: s?.hydratedAt || null,
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const s = normalize(JSON.parse(raw)); if (s.events.length) return s; } } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetEmailEvents() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useEmailEvents(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

/* ============================================================
   READS
   ============================================================ */
export const getEmailEvents = () => (Array.isArray(state.events) ? state.events : []);

// One row per recipient with a rolled-up engagement summary, most-recent first.
export function recipientSummaries() {
  const map = new Map();
  for (const e of getEmailEvents()) {
    const key = e.email;
    if (!key) continue;
    let r = map.get(key);
    if (!r) { r = { email: key, name: e.name || key, company: e.company || '', sent: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, lastAt: 0 }; map.set(key, r); }
    if (r[e.type] != null) r[e.type] += 1;
    if (e.name && (!r.name || r.name === key)) r.name = e.name;
    if (e.company && !r.company) r.company = e.company;
    r.lastAt = Math.max(r.lastAt, e.at || 0);
  }
  return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
}

export function eventsForRecipient(email) {
  const key = String(email || '').toLowerCase();
  return getEmailEvents().filter(e => e.email === key).sort((a, b) => (a.at || 0) - (b.at || 0));
}

// Aggregate clicked events into a link -> { clicks, recipients } click map.
export function clickMap() {
  const links = new Map();
  for (const e of getEmailEvents()) {
    if (e.type !== 'clicked' || !e.link) continue;
    let row = links.get(e.link);
    if (!row) { row = { link: e.link, clicks: 0, recipients: new Set() }; links.set(e.link, row); }
    row.clicks += 1;
    if (e.email) row.recipients.add(e.email);
  }
  return [...links.values()]
    .map(r => ({ link: r.link, clicks: r.clicks, recipients: r.recipients.size }))
    .sort((a, b) => b.clicks - a.clicks);
}

// Fleet engagement roll-up for the header.
export function engagementStats() {
  let sent = 0, opened = 0, clicked = 0, bounced = 0, complained = 0;
  const openedRecipients = new Set();
  const clickedRecipients = new Set();
  for (const e of getEmailEvents()) {
    if (e.type === 'sent') sent += 1;
    else if (e.type === 'opened') { opened += 1; if (e.email) openedRecipients.add(e.email); }
    else if (e.type === 'clicked') { clicked += 1; if (e.email) clickedRecipients.add(e.email); }
    else if (e.type === 'bounced') bounced += 1;
    else if (e.type === 'complained') complained += 1;
  }
  return {
    sent, opened, clicked, bounced, complained,
    uniqueOpens: openedRecipients.size,
    uniqueClicks: clickedRecipients.size,
    openRate: sent ? Math.round((openedRecipients.size / sent) * 1000) / 10 : 0,
    clickRate: sent ? Math.round((clickedRecipients.size / sent) * 1000) / 10 : 0,
  };
}

/* ============================================================
   WRITES + BACKEND HYDRATION
   ============================================================ */
// Merge a batch of events, deduped by id. Used by hydrateFromApi + simulate.
export function ingestEvents(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  const seen = new Set(getEmailEvents().map(e => e.id));
  const fresh = rows.filter(r => r && r.id && !seen.has(r.id));
  if (!fresh.length) return 0;
  commit({ ...state, events: [...fresh, ...state.events] });
  return fresh.length;
}

// Map a raw rally_email_events row (snake_case) into the store's event shape.
function fromApiRow(row) {
  const type = String(row.type || '').replace(/^email\./, '');
  return {
    id: row.id != null ? `api_${row.id}` : `api_${row.resend_id}_${type}_${row.created_at}`,
    email: String(row.email || '').toLowerCase(),
    name: row.email || '',
    company: '',
    type,
    link: row.link || null,
    at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    resendId: row.resend_id || null,
  };
}

// Best-effort: pull real events from the backend and merge them on top of the
// seed. A missing / unconfigured endpoint is a silent no-op (local-first).
export async function hydrateFromApi() {
  if (typeof fetch !== 'function') return { ok: false, skipped: 'no-fetch' };
  try {
    const res = await fetch('/api/marketing-cron?action=events&limit=500');
    if (!res.ok) return { ok: false, skipped: `http-${res.status}` };
    const json = await res.json().catch(() => ({}));
    if (!json || json.configured === false || !Array.isArray(json.events)) return { ok: true, merged: 0, configured: !!(json && json.configured) };
    const merged = ingestEvents(json.events.map(fromApiRow));
    commit({ ...state, hydratedAt: Date.now() });
    return { ok: true, merged, configured: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'network' };
  }
}

// Record a local engagement event (used by the "simulate" affordance so the UI
// is demonstrable without a live provider). Never leaves the browser.
export function simulateEvent({ email, name = '', type = 'opened', link = null, at = Date.now() } = {}) {
  const key = String(email || '').toLowerCase();
  if (!EMAIL_RE.test(key)) return null;
  const ev = { id: uid('ee'), email: key, name: name || key, company: '', type, link, at };
  commit({ ...state, events: [ev, ...state.events] });
  return ev;
}
