// ============================================================
// ARDOVO IDENTITY RESOLUTION  (email/domain -> Ardovo record)
// The join that makes an inbound integration event land on the
// RIGHT contact, company, and deal instead of floating free. Given
// an email (and/or a domain and a name) from an external system,
// resolve() returns the best matching Ardovo ids. When nothing
// matches, the record goes into a local-first "Unlinked" tray so a
// human can adopt it later - no inbound event is ever silently lost.
//
// Read side is pure over the store (getContacts/getCompanies/getDeals),
// so it always reflects live data. The Unlinked tray is its own
// pub/sub store (mirrors modules.js) persisted to localStorage.
//
// SUPABASE: resolve() becomes a matching query (contacts by email,
// companies by domain); the tray becomes rally_unlinked (per-workspace
// rows a rep can resolve from an inbox-style view).
// ============================================================
import { useState, useEffect } from 'react';
import { getContacts, getCompanies, getDeals } from '../store.js';

/* ---------- helpers ---------- */
const norm = (s) => (s || '').trim().toLowerCase();
const domainOf = (email) => {
  const at = norm(email).split('@')[1] || '';
  return at.replace(/^www\./, '');
};
const bareDomain = (d) => norm(d).replace(/^www\./, '').replace(/\/.*$/, '');

/* ---------- core resolution (pure over the store) ---------- */

// Exact-email contact match. Returns the contact record or null.
export function contactByEmail(email) {
  const e = norm(email);
  if (!e) return null;
  return getContacts().find(c => norm(c.email) === e) || null;
}

// Company match by email domain or an explicit domain. Returns record or null.
export function companyByDomain(domainOrEmail) {
  const d = domainOrEmail.includes('@') ? domainOf(domainOrEmail) : bareDomain(domainOrEmail);
  if (!d) return null;
  return getCompanies().find(co => bareDomain(co.domain) === d) || null;
}

// The most relevant open deal for a company (marquee first, then most recent).
// Falls back to the latest deal of any status so an event still attaches.
export function dealForCompany(companyId) {
  if (!companyId) return null;
  const deals = getDeals().filter(d => d.companyId === companyId);
  if (!deals.length) return null;
  const open = deals.filter(d => d.status === 'open');
  const pool = open.length ? open : deals;
  return pool.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

/* Resolve an external identity to Ardovo ids.
   Input:  { email, domain, name }
   Output: {
     contactId, companyId, dealId,   // best matches (any may be null)
     matched,                        // true if we found at least a company
     confidence,                     // 'contact' | 'company' | 'none'
     relatedType, relatedId          // convenience target for an activity
   }
   Strategy: email->contact is the strongest signal (also yields its company);
   otherwise fall back to domain->company; then pick that company's best deal. */
export function resolve({ email, domain, name } = {}) {
  const contact = contactByEmail(email);
  let company = null;
  if (contact && contact.companyId) company = getCompanies().find(c => c.id === contact.companyId) || null;
  if (!company) company = companyByDomain(email || domain || '');

  const companyId = company?.id || null;
  const deal = companyId ? dealForCompany(companyId) : null;

  const confidence = contact ? 'contact' : company ? 'company' : 'none';
  // Prefer anchoring an inbound activity to the deal, then contact, then company.
  let relatedType = null, relatedId = null;
  if (deal)        { relatedType = 'deal';    relatedId = deal.id; }
  else if (contact){ relatedType = 'contact'; relatedId = contact.id; }
  else if (company){ relatedType = 'company'; relatedId = company.id; }

  return {
    contactId: contact?.id || null,
    companyId,
    dealId: deal?.id || null,
    matched: !!(contact || company),
    confidence,
    relatedType,
    relatedId,
    name: name || (contact ? `${contact.firstName} ${contact.lastName}` : null),
  };
}

// ============================================================
// UNLINKED TRAY  (local-first pub/sub - mirrors modules.js)
// Inbound records with no Ardovo match park here until a human links
// or dismisses them. Nothing inbound is lost; the tray badge nags.
// Row shape: { id, source, receivedAt, email, domain, name, event,
//              payload, note }
// ============================================================
const LS = 'rally_unlinked_v1';
const subs = new Set();
function readTray() {
  try { const v = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
let tray = readTray();
function persistTray() {
  try { localStorage.setItem(LS, JSON.stringify(tray)); } catch {}
  subs.forEach(fn => fn(tray));
}
let uidc = Date.now();

export function getUnlinked() { return tray; }
export function unlinkedCount() { return tray.length; }

// Park an unmatched inbound record. `source` is the integration id.
export function addUnlinked({ source, email, domain, name, event, payload, note } = {}) {
  const row = {
    id: `unlnk_${(uidc++).toString(36)}`,
    source: source || null,
    receivedAt: new Date().toISOString(),
    email: email || null,
    domain: domain || (email ? email.split('@')[1] : null) || null,
    name: name || null,
    event: event || null,
    payload: payload || null,
    note: note || null,
  };
  tray = [row, ...tray];
  persistTray();
  return row;
}

// Remove a row once it has been adopted or dismissed. Returns the removed row.
export function removeUnlinked(id) {
  const row = tray.find(r => r.id === id) || null;
  if (row) { tray = tray.filter(r => r.id !== id); persistTray(); }
  return row;
}

// Convenience: try to resolve a parked row again (data may have changed since).
export function reResolveUnlinked(id) {
  const row = tray.find(r => r.id === id);
  if (!row) return null;
  return resolve({ email: row.email, domain: row.domain, name: row.name });
}

// Reactive tray snapshot for a badge or an inbox-style resolve view.
export function useUnlinked() {
  const [snap, setSnap] = useState(tray);
  useEffect(() => {
    const fn = (t) => setSnap([...t]);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
