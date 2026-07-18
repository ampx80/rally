// ============================================================
// ARDOVO NOTIFICATIONS  (local-first, deterministic, pub/sub)
// The connective tissue a daily-active app needs: one persisted
// notification feed derived from real event sources already in the
// store - the org audit log (stage moves, reassignments, field
// edits), deals that closed won, tasks coming due or overdue, and
// @mentions from teammates. Mutations (read / read-all) persist to
// localStorage so the bell badge stays honest across reloads.
//
// Shape of a notification:
//   { id, key, type, actor, title, body, at, read, target: { to, label } }
//   - key    stable dedupe id so a source event maps to exactly one row
//   - type   one of NOTIF_TYPES (drives icon + color + filter)
//   - actor  display name of who caused it (for the avatar)
//   - target { to, label } deep-link into the record it is about
//
// SUPABASE: rally_notifications (per-user rows, realtime channel);
// the generator below becomes a set of triggers / an edge function.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getDeals, getActivities, getUsers, getCurrentUser, userName,
  getDeal, getContact, getCompany, contactName, stageById,
} from './store.js';
import { getAuditLog } from './audit.js';
import { getLeads } from './leads-data.js';

const LS_KEY = 'rally_notifications_v1'; // bump to force a clean rebuild
const CAP = 60;

/* ---------- type registry: icon + color + filter label ---------- */
export const NOTIF_TYPES = {
  mention:  { label: 'Mentions',    icon: 'users',    color: 'var(--accent)' },
  deal_won: { label: 'Deals won',   icon: 'target',   color: 'var(--ok)' },
  task_due: { label: 'Tasks due',   icon: 'clock',    color: 'var(--warn)' },
  stage:    { label: 'Stage moves', icon: 'trendUp',  color: 'var(--accent-600)' },
  assigned: { label: 'Assignments', icon: 'user',     color: '#2563a8' },
  lead:     { label: 'New leads',   icon: 'funnel',   color: '#0ea5a3' },
  update:   { label: 'Updates',     icon: 'fileText', color: 'var(--n-500)' },
};
export const notifMeta = (type) => NOTIF_TYPES[type] || NOTIF_TYPES.update;

/* Filter order shown in the page + dropdown (skips empty ones there). */
export const NOTIF_FILTERS = ['mention', 'deal_won', 'task_due', 'stage', 'assigned', 'lead', 'update'];

const HOUR = 3600000;
const DAY = 86400000;

/* ============================================================
   THE GENERATOR
   Derive a believable, current feed from live store data. Every
   item carries a stable `key` so reconcile() can add newly-seen
   events on later loads without clobbering read state.
   ============================================================ */
function deriveFeed() {
  const me = getCurrentUser();
  const meId = me?.id;
  const meName = me?.name || 'You';
  const out = [];
  const now = Date.now();

  const push = (n) => { if (n) out.push(n); };
  const dealLink = (d) => ({ to: `/deals/${d.id}`, label: d.name });

  /* --- 1. Deals closed won (celebration items) --- */
  try {
    const won = getDeals()
      .filter(d => d.status === 'won')
      .sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate))
      .slice(0, 6);
    for (const d of won) {
      const owner = userName(d.ownerId);
      push({
        key: `won:${d.id}`,
        type: 'deal_won',
        actor: owner,
        title: `${d.ownerId === meId ? 'You' : owner} closed ${d.name}`,
        body: `Closed won`,
        amount: d.value,
        at: d.closeDate,
      target: dealLink(d),
      });
    }
  } catch {}

  /* --- 2. Audit-log events: stage moves, reassignments, edits --- */
  try {
    const log = getAuditLog();
    let updates = 0;
    for (const e of log) {
      if (e.objectType !== 'deal') {
        // a light trickle of non-deal edits keeps the "Updates" tab alive
        if (e.field && updates < 4 && (e.objectType === 'company' || e.objectType === 'contact')) {
          const label = e.objectType === 'company' ? getCompany(e.recordId)?.name
            : contactName(getContact(e.recordId));
          if (!label) continue;
          updates++;
          push({
            key: `audit:${e.id}`,
            type: 'update',
            actor: e.who,
            title: `${e.who} updated ${prettyField(e.field)} on ${label}`,
            body: valueLine(e),
            at: e.at,
            target: e.objectType === 'company'
              ? { to: `/companies/${e.recordId}`, label }
              : { to: `/contacts/${e.recordId}`, label },
          });
        }
        continue;
      }
      const d = getDeal(e.recordId);
      if (!d) continue;
      if (e.field === 'stage') {
        const to = stageById(e.to)?.name || e.to;
        const from = stageById(e.from)?.name || e.from;
        push({
          key: `audit:${e.id}`,
          type: 'stage',
          actor: e.who,
          title: `${e.who} moved ${d.name} to ${to}`,
          body: from ? `from ${from}` : '',
          at: e.at,
          target: dealLink(d),
        });
      } else if (e.field === 'ownerId') {
        push({
          key: `audit:${e.id}`,
          type: 'assigned',
          actor: e.who,
          title: `${d.name} was assigned to ${userName(e.to)}`,
          body: `by ${e.who}`,
          at: e.at,
          target: dealLink(d),
        });
      } else if (e.field && updates < 4) {
        updates++;
        push({
          key: `audit:${e.id}`,
          type: 'update',
          actor: e.who,
          title: `${e.who} updated ${prettyField(e.field)} on ${d.name}`,
          body: valueLine(e),
          at: e.at,
          target: dealLink(d),
        });
      }
    }
  } catch {}

  /* --- 3. Tasks coming due / overdue for the current user --- */
  try {
    const soon = now + 3 * DAY;
    const tasks = getActivities()
      .filter(a => a.ownerId === meId && !a.done && a.type !== 'note' && a.dueAt)
      .filter(a => new Date(a.dueAt).getTime() <= soon)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
      .slice(0, 8);
    for (const a of tasks) {
      const t = new Date(a.dueAt).getTime();
      const overdue = t < now && !sameDay(t, now);
      const rel = relatedLabel(a);
      push({
        key: `due:${a.id}`,
        type: 'task_due',
        actor: 'Ardovo',
        title: overdue ? `Overdue: ${a.subject}` : `Due soon: ${a.subject}`,
        body: rel ? rel.label : '',
        at: a.dueAt,
        // surface reminders relative to now so they sort into Today
        sortAt: overdue ? now - HOUR : now + HOUR,
        target: rel ? rel.target : null,
        overdue,
      });
    }
  } catch {}

  /* --- 4. @mentions from teammates (synthesized, believable) --- */
  try {
    const mates = getUsers().filter(u => u.id !== meId && u.role === 'rep');
    const openDeals = getDeals().filter(d => d.status === 'open')
      .sort((a, b) => b.value - a.value).slice(0, 5);
    const lines = [
      (name, deal) => `${name} mentioned you on ${deal.name}`,
      (name, deal) => `${name} left a note for you on ${deal.name}`,
      (name, deal) => `${name} asked you to review ${deal.name}`,
    ];
    const notes = [
      `Can you jump on the next call? @${meName}`,
      `Pricing looks tight - want your read here. @${meName}`,
      `Legal sent redlines, tagging you. @${meName}`,
      `Champion asked for you specifically. @${meName}`,
      `Nice work moving this one. @${meName}`,
    ];
    const n = Math.min(4, openDeals.length, mates.length);
    for (let i = 0; i < n; i++) {
      const mate = mates[i % mates.length];
      const deal = openDeals[i];
      push({
        key: `mention:${deal.id}:${mate.id}`,
        type: 'mention',
        actor: mate.name,
        title: lines[i % lines.length](mate.name, deal),
        body: notes[i % notes.length],
        // recent, spread across the last day and a half
        at: new Date(now - (2 + i * 7) * HOUR).toISOString(),
        target: { to: `/deals/${deal.id}`, label: deal.name },
        mention: true,
      });
    }
  } catch {}

  /* --- 5. Fresh inbound leads --- */
  try {
    const fresh = getLeads()
      .filter(l => l.status === 'New')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    for (const l of fresh) {
      push({
        key: `lead:${l.id}`,
        type: 'lead',
        actor: l.name,
        title: `New lead: ${l.name}`,
        body: `${l.title} at ${l.company}`,
        at: l.createdAt,
        target: { to: `/leads`, label: 'Leads' },
      });
    }
  } catch {}

  // Normalize + sort newest first using sortAt when present (reminders).
  for (const n of out) n.sortAt = n.sortAt || new Date(n.at).getTime();
  out.sort((a, b) => b.sortAt - a.sortAt);
  return out.slice(0, CAP);
}

/* ---------- small formatting helpers ---------- */
function prettyField(field = '') {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
}
function valueLine(e) {
  const to = e.to == null || e.to === '' ? null : String(e.to);
  return to ? (to.length > 48 ? to.slice(0, 45) + '...' : to) : 'cleared';
}
function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}
function relatedLabel(a) {
  if (a.relatedType === 'deal') { const d = getDeal(a.relatedId); if (d) return { label: d.name, target: { to: `/deals/${d.id}`, label: d.name } }; }
  if (a.relatedType === 'contact') { const c = getContact(a.relatedId); if (c) return { label: contactName(c), target: { to: `/contacts/${c.id}`, label: contactName(c) } }; }
  if (a.companyId) { const co = getCompany(a.companyId); if (co) return { label: co.name, target: { to: `/companies/${co.id}`, label: co.name } }; }
  return null;
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let items = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const merged = reconcile(saved);
      persist(merged);
      return merged;
    }
  } catch {}
  const seed = deriveFeed().map(n => ({ ...n, id: n.key, read: false }));
  persist(seed);
  return seed;
}

/* Add any newly-derived events (deal just won, new audit rows, new
   tasks) as unread, preserving read state on everything already seen. */
function reconcile(saved = []) {
  const byKey = new Map(saved.map(n => [n.key, n]));
  const derived = deriveFeed();
  const merged = [];
  for (const d of derived) {
    const prev = byKey.get(d.key);
    merged.push(prev ? { ...d, id: prev.id, read: prev.read } : { ...d, id: d.key, read: false });
    byKey.delete(d.key);
  }
  // Keep any manually-pushed items that are not part of the derived set.
  for (const leftover of byKey.values()) {
    if (leftover && leftover.manual) merged.push(leftover);
  }
  merged.sort((a, b) => (b.sortAt || new Date(b.at).getTime()) - (a.sortAt || new Date(a.at).getTime()));
  return merged.slice(0, CAP);
}

function persist(next) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
}
function commit(next) {
  items = next;
  persist(items);
  subs.forEach(fn => fn(items));
}

/* ---------- read API ---------- */
export function getNotifications() { return items; }
export function unreadCount() { return items.reduce((n, x) => n + (x.read ? 0 : 1), 0); }
export function resetNotifications() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  items = load();
  subs.forEach(fn => fn(items));
}

/* ---------- write API ---------- */
export function markRead(id) {
  commit(items.map(n => n.id === id ? { ...n, read: true } : n));
}
export function markUnread(id) {
  commit(items.map(n => n.id === id ? { ...n, read: false } : n));
}
export function markAllRead() {
  commit(items.map(n => n.read ? n : { ...n, read: true }));
}

let idc = Date.now();
/* Push a live notification (e.g. Rook finishes a build). Marked manual so
   reconcile() never drops it. */
export function pushNotification({ type = 'update', actor = 'Ardovo', title, body = '', target = null }) {
  if (!title) return null;
  const n = {
    id: `nt_${(idc++).toString(36)}`, key: `manual:${idc}`,
    type, actor, title, body, target,
    at: new Date().toISOString(), sortAt: Date.now(),
    read: false, manual: true,
  };
  commit([n, ...items].slice(0, CAP));
  return n;
}

/* ---------- reactive hook ---------- */
export function useNotifications(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(items));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(items);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
