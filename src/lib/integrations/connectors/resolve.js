// ============================================================
// RESOLVE CONNECTOR  (concrete, extends the Connector contract)
// The first real connector built on the integration backbone. It
// surfaces SUPPORT TICKETS from Resolve (the sibling support/ticketing
// app, operator "Reva") against the RIGHT Ardovo company + contact, so
// revenue sees the full post-sale story next to the deal.
//
// Data strategy (local-first, additive, env-gated):
//   - NOT LIVE (no connection, or the server bridge is not configured):
//     deterministic seeded demo tickets, derived from the workspace's
//     own companies + contacts so the panels look real out of the box.
//     Same seed every run - no flicker, stable across reloads.
//   - LIVE (connection status == connected AND /api/connect/resolve
//     reports configured): sync() pulls real tickets from the workspace
//     Resolve API through the server bridge and maps them onto Ardovo ids.
//   The connector NEVER throws: an unconfigured or failing bridge simply
//   falls back to the demo set and records a non-fatal degraded reason.
//
// Provenance: every ticket carries source:'resolve' + externalUrl (a deep
// link into the Resolve workspace) via the base Connector.via() stamp, so
// ActivitySourceChip renders "via Resolve" wherever a ticket lands.
//
// SUPABASE: the local ticket cache becomes rally_support_tickets (per
// workspace, realtime), seeded/refreshed by the server sync job.
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { Connector } from '../connector.js';
import { integrationById } from '../registry.js';
import { getConnection, isConnected } from '../connections.js';
import { resolve as resolveIdentity, addUnlinked } from '../resolve-link.js';
import {
  getCompanies, getContactsForCompany, getContact, getCompany,
  contactName, createActivity,
} from '../../store.js';

export const RESOLVE_ID = 'resolve';
const DEFAULT_WORKSPACE_URL = 'https://resolve-nine-beryl.vercel.app';
const LS = 'rally_resolve_tickets_v1';

/* ---------- status + priority vocab (mirrors Resolve) ---------- */
// Ardovo-normalized ticket status. Resolve emits a wider set; we fold it
// into these five so the inbox + panels stay legible.
export const TICKET_STATUS = {
  needs_you:       { label: 'Needs you',      tone: 'risk',    group: 'open' },
  waiting:         { label: 'Waiting',        tone: 'warn',    group: 'open' },
  feature_request: { label: 'Feature request', tone: 'info',   group: 'open' },
  ai_resolved:     { label: 'AI resolved',    tone: 'accent',  group: 'resolved' },
  resolved:        { label: 'Resolved',       tone: 'ok',      group: 'resolved' },
};
export const TICKET_PRIORITY = {
  urgent: { label: 'Urgent', tone: 'risk',    rank: 0 },
  high:   { label: 'High',   tone: 'warn',    rank: 1 },
  normal: { label: 'Normal', tone: 'default', rank: 2 },
  low:    { label: 'Low',    tone: 'default', rank: 3 },
};
export const ticketStatusMeta = (s) => TICKET_STATUS[s] || { label: s || 'Open', tone: 'default', group: 'open' };
export const ticketPriorityMeta = (p) => TICKET_PRIORITY[p] || { label: p || 'Normal', tone: 'default', rank: 2 };
export const isOpenTicket = (t) => ticketStatusMeta(t.status).group === 'open';

/* Normalize a Resolve status / outcome into the Ardovo-normalized set. */
function normalizeStatus(status, aiOutcome, resolvedBy) {
  if (status && TICKET_STATUS[status]) return status;
  if (status === 'open' || status === 'triaging') return 'needs_you';
  if (status === 'closed') return 'resolved';
  if (aiOutcome === 'auto_resolved') return 'ai_resolved';
  if (aiOutcome === 'escalated') return 'needs_you';
  if (resolvedBy === 'ai') return 'ai_resolved';
  if (resolvedBy === 'human') return 'resolved';
  return 'needs_you';
}
function normalizePriority(p) {
  return TICKET_PRIORITY[p] ? p : 'normal';
}

/* ---------- deterministic demo generator ---------- */
// Small FNV-1a hash so each company gets a stable per-company seed.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ticket subject pool lifted from Resolve's own templates (ASCII only).
const SUBJECTS = [
  'Cannot log in, forgot my password',
  'How do I export all my data?',
  'Add three teammates to our workspace',
  'Where can I find last month invoice',
  'My card was declined',
  'Locked out, lost my authenticator phone',
  'Want to upgrade to the Pro plan',
  'How to set up a webhook for new events',
  'Need SSO with Okta for our team',
  'Change my timezone, timestamps are wrong',
  'The dashboard is showing a blank screen',
  'Everything is down, we cannot access anything',
  'I was charged twice this month, want a refund',
  'How do I import my contacts from a spreadsheet?',
  'Cancel our subscription',
  'How do I turn off email notifications?',
  'Does the mobile app work offline?',
  'Bulk import keeps failing on upload',
];
const CHANNELS = ['email', 'chat', 'form', 'in-app'];

// Subject-driven priority so the seed reads coherent (an outage is urgent,
// a double-charge is high, a how-to is low/normal).
function priorityForSubject(subject) {
  const s = subject.toLowerCase();
  if (s.includes('down') || s.includes('blank screen')) return 'urgent';
  if (s.includes('charged twice') || s.includes('declined') || s.includes('locked out')) return 'high';
  if (s.includes('cancel') || s.includes('refund')) return 'high';
  if (s.includes('how do i') || s.includes('how to') || s.includes('does the')) return 'low';
  return 'normal';
}

const DAY = 86400000;

// Build the deterministic demo ticket set from the workspace's real
// companies + contacts. Unhealthy accounts carry more tickets, which is
// exactly the story revenue wants to see next to a deal.
function buildDemoTickets() {
  const now = Date.now();
  const out = [];
  const companies = getCompanies();
  for (const co of companies) {
    const seed = hashStr('rsv:' + co.id);
    const rnd = mulberry32(seed);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const health = co.health || 'green';
    const base = co.flagship ? 3 : health === 'red' ? 3 : health === 'yellow' ? 2 : 1;
    const n = Math.max(0, base - (rnd() < 0.4 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0));
    if (n === 0) continue;
    const contacts = getContactsForCompany(co.id);
    for (let i = 0; i < n; i++) {
      const subject = SUBJECTS[Math.floor(rnd() * SUBJECTS.length)];
      const priority = priorityForSubject(subject);
      // Status distribution: most auto-resolved (the product thesis), some
      // in the human queue, a few resolved by a person, a couple waiting.
      const r = rnd();
      let status, resolvedBy = null, aiConfidence = null, csat = null;
      if (r < 0.44) { status = 'ai_resolved'; resolvedBy = 'ai'; aiConfidence = 78 + Math.floor(rnd() * 20); if (rnd() < 0.6) csat = pick([5, 5, 4, 5]); }
      else if (r < 0.66) { status = 'resolved'; resolvedBy = 'human'; if (rnd() < 0.5) csat = pick([5, 4, 4, 3]); }
      else if (r < 0.86) { status = 'needs_you'; aiConfidence = 38 + Math.floor(rnd() * 30); }
      else if (r < 0.94) { status = 'waiting'; }
      else { status = 'feature_request'; }
      const contact = contacts.length && rnd() < 0.75 ? contacts[Math.floor(rnd() * contacts.length)] : null;
      const ageDays = Math.round(rnd() * 26);
      const createdAt = new Date(now - ageDays * DAY - Math.floor(rnd() * DAY)).toISOString();
      const number = 1000 + (seed % 9000) + i;
      const externalId = `tkt_${co.id}_${i}`;
      out.push({
        id: `rsv_${co.id}_${i}`,
        externalId,
        number,
        subject,
        status,
        priority,
        channel: pick(CHANNELS),
        sentiment: status === 'needs_you' && priority !== 'low' ? (rnd() < 0.5 ? 'frustrated' : 'neutral') : 'neutral',
        resolvedBy,
        aiConfidence,
        csat,
        email: contact ? contact.email : null,
        companyId: co.id,
        contactId: contact ? contact.id : null,
        createdAt,
        updatedAt: createdAt,
        source: RESOLVE_ID,
        externalUrl: ticketUrl(externalId),
      });
    }
  }
  // Newest first, urgent floats up within a day.
  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

/* ---------- local-first ticket cache (pub/sub, mirrors modules.js) ---------- */
const subs = new Set();
function readCache() {
  try { const v = JSON.parse(localStorage.getItem(LS) || 'null'); return v && Array.isArray(v.rows) ? v : null; } catch { return null; }
}
// Shape: { rows: Ticket[], live: boolean, syncedAt: string|null, degraded: string|null }
let cache = readCache();
function persist() {
  try { localStorage.setItem(LS, JSON.stringify(cache)); } catch {}
  subs.forEach(fn => fn(cache));
}
// Seed lazily so the store is guaranteed loaded before we read companies.
function ensureSeeded(force = false) {
  if (force || !cache || !Array.isArray(cache.rows) || cache.rows.length === 0) {
    if (cache && cache.live && !force) return cache; // do not clobber a live sync
    cache = { rows: buildDemoTickets(), live: false, syncedAt: null, degraded: null };
    persist();
  }
  return cache;
}
function setLive(rows, degraded = null) {
  cache = { rows, live: true, syncedAt: new Date().toISOString(), degraded };
  persist();
}
function setDemo(degraded = null) {
  cache = { rows: buildDemoTickets(), live: false, syncedAt: new Date().toISOString(), degraded };
  persist();
}
// Upsert a single ticket (used by handleWebhook) without dropping the rest.
function upsertTicket(t) {
  ensureSeeded();
  const rows = cache.rows.slice();
  const i = rows.findIndex(x => x.id === t.id || (x.externalId && x.externalId === t.externalId));
  if (i >= 0) rows[i] = { ...rows[i], ...t };
  else rows.unshift(t);
  cache = { ...cache, rows };
  persist();
}

/* ---------- deep-link helpers ---------- */
export function resolveWorkspaceUrl() {
  const meta = getConnection(RESOLVE_ID)?.metadata || {};
  const url = (meta.workspaceUrl || '').trim();
  const base = url || integrationLogoBase() || DEFAULT_WORKSPACE_URL;
  return base.replace(/\/+$/, '');
}
function integrationLogoBase() {
  const domain = integrationById(RESOLVE_ID)?.logo;
  return domain ? `https://${domain}` : null;
}
// A ticket deep link into the Resolve agent workspace (/tickets/:id).
export function ticketUrl(externalId) {
  if (!externalId) return resolveWorkspaceUrl();
  return `${resolveWorkspaceUrl()}/tickets/${encodeURIComponent(externalId)}`;
}

/* ---------- the connector ---------- */
export class ResolveConnector extends Connector {
  constructor() { super(integrationById(RESOLVE_ID) || RESOLVE_ID); }

  workspaceUrl() { return resolveWorkspaceUrl(); }
  ticketUrl(id) { return ticketUrl(id); }

  // Normalize one external Resolve record into a Ardovo-shaped ticket with
  // resolved identity + provenance stamp. Pure; safe to call anywhere.
  mapRecord(r = {}) {
    const email = r.email || r.customerEmail || r.customer?.email || '';
    const link = this.resolveIdentity({ email, name: r.customerName || r.customer?.name });
    const externalId = String(r.id ?? r.number ?? r.externalId ?? '');
    const created = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
    return {
      id: `rsv_${externalId || Math.random().toString(36).slice(2)}`,
      externalId,
      number: r.number ?? null,
      subject: r.subject || '(no subject)',
      status: normalizeStatus(r.status, r.aiOutcome, r.resolvedBy),
      priority: normalizePriority(r.priority),
      channel: r.channel || 'email',
      sentiment: r.sentiment || 'neutral',
      resolvedBy: r.resolvedBy || (r.aiOutcome === 'auto_resolved' ? 'ai' : null),
      aiConfidence: typeof r.confidence === 'number' ? r.confidence : (r.aiConfidence ?? null),
      csat: r.csat ?? null,
      email: email || null,
      companyId: link.companyId,
      contactId: link.contactId,
      createdAt: created,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : created,
      ...this.via(externalId, this.ticketUrl(externalId)),
    };
  }

  // Pull tickets. Live path goes through the env-gated server bridge; any
  // miss falls back to the deterministic demo set. Returns count summary,
  // never throws.
  async sync() {
    if (this.isConnected()) {
      try {
        const res = await fetch('/api/connect/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'sync', workspaceUrl: this.workspaceUrl() }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.configured && data.connected && Array.isArray(data.tickets) && data.tickets.length) {
          const rows = data.tickets.map(r => this.mapRecord(r)).filter(Boolean)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setLive(rows);
          return { imported: rows.length, linked: rows.filter(r => r.companyId || r.contactId).length, live: true, source: 'resolve' };
        }
        // Configured but returned nothing usable, or not configured: demo.
        setDemo(data?.note || (data?.configured ? 'Resolve is connected but returned no tickets; showing sample data.' : 'Resolve bridge is not configured on the server; showing sample data.'));
        return { imported: cache.rows.length, linked: cache.rows.filter(r => r.companyId).length, live: false, source: 'demo', degraded: cache.degraded };
      } catch (e) {
        setDemo(e?.message || 'Could not reach the Resolve bridge; showing sample data.');
        return { imported: cache.rows.length, linked: cache.rows.filter(r => r.companyId).length, live: false, source: 'demo', degraded: cache.degraded };
      }
    }
    // Not connected: deterministic demo tickets.
    setDemo(null);
    return { imported: cache.rows.length, linked: cache.rows.filter(r => r.companyId).length, live: false, source: 'demo' };
  }

  // One inbound webhook from Resolve. Resolve identity, log a provenance-
  // stamped activity on the matched record, and upsert into the ticket
  // cache. Unmatched events park in the Unlinked tray - nothing is lost.
  handleWebhook(payload = {}) {
    const event = payload.event || payload.type || 'ticket.created';
    const ticket = payload.ticket || payload.data || payload;
    const email = ticket.email || ticket.customerEmail || ticket.customer?.email || '';
    const id = this.resolveIdentity({ email, name: ticket.customerName || ticket.customer?.name });
    const mapped = this.mapRecord(ticket);
    upsertTicket(mapped);
    if (!id.matched) {
      addUnlinked({ source: this.id, email, name: ticket.customerName || null, event, payload });
      return { parked: true, linked: false };
    }
    // Registry maps: escalated -> task (a human must act), everything else -> note.
    const type = event === 'ticket.escalated' ? 'task' : 'note';
    const r = createActivity({
      type,
      subject: `[Resolve] ${ticket.subject || event}`,
      relatedType: id.relatedType,
      relatedId: id.relatedId,
      companyId: id.companyId,
      done: type === 'note',
      ...this.via(mapped.externalId, mapped.externalUrl),
    });
    return { linked: true, activityId: r.activity?.id || null, ticketId: mapped.id };
  }
}

// Singleton the whole app shares.
export const resolveConnector = new ResolveConnector();

/* ---------- read API (pure over the cache) ---------- */
export function getResolveTickets() { return ensureSeeded().rows; }
export function getResolveCacheMeta() { const c = ensureSeeded(); return { live: c.live, syncedAt: c.syncedAt, degraded: c.degraded }; }
export function resolveTicketsForCompany(companyId) {
  if (!companyId) return [];
  return getResolveTickets().filter(t => t.companyId === companyId);
}
export function resolveTicketsForContact(contactId) {
  if (!contactId) return [];
  return getResolveTickets().filter(t => t.contactId === contactId);
}
export function resolveTicketStats(rows = getResolveTickets()) {
  const open = rows.filter(isOpenTicket).length;
  const aiResolved = rows.filter(t => t.status === 'ai_resolved').length;
  const resolved = rows.filter(t => ticketStatusMeta(t.status).group === 'resolved').length;
  const urgent = rows.filter(t => t.priority === 'urgent' && isOpenTicket(t)).length;
  const withCsat = rows.filter(t => t.csat != null);
  const csat = withCsat.length ? +(withCsat.reduce((s, t) => s + t.csat, 0) / withCsat.length).toFixed(1) : null;
  return { total: rows.length, open, aiResolved, resolved, urgent, csat };
}

/* ---------- lifecycle helpers (thin wrappers over the connector) ---------- */
export function isResolveConnected() { return isConnected(RESOLVE_ID); }
export async function connectResolve(metadata = {}) {
  const meta = { workspaceUrl: DEFAULT_WORKSPACE_URL, ...metadata };
  const out = await resolveConnector.connect(meta);
  return out;
}
export async function disconnectResolve() { return resolveConnector.disconnect(); }
export async function syncResolve() { return resolveConnector.sync(); }

/* ---------- reactive hook (mirrors useStore / useConnections) ---------- */
export function useResolveTickets(selector = (rows) => rows) {
  const [snap, setSnap] = useState(() => selector(ensureSeeded().rows));
  useEffect(() => {
    const fn = (c) => setSnap(selector(c.rows));
    subs.add(fn);
    fn(ensureSeeded());
    return () => subs.delete(fn);
    // eslint-disable-line react-hooks/exhaustive-deps
  }, []);
  return snap;
}

// Convenience labels re-exported for panels that only need naming.
export { contactName, getContact, getCompany };

// Seed once at module load (store.js is already initialized by import order),
// so render-time reads are side-effect-free. Guarded: never blocks import.
try { ensureSeeded(); } catch { /* store not ready; reads will seed lazily */ }
