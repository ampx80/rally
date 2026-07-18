// ============================================================
// ARDOVO TASK QUEUES  (HubSpot-style work queues + focus mode)
// A queue is a saved FILTER over activities (src/lib/store.js):
// type, due window, owner scope, priority. Built-in queues are
// code-defined; custom queue defs persist to localStorage behind
// a pub/sub so pages re-render when the catalog changes. Nothing
// here owns activity data - membership resolves live off
// getActivities() and re-derives on every store mutation, and all
// writes go through the EXISTING store writers (updateActivity).
//
// SUPABASE: a live build would keep queue defs in rally_task_queues
// and resolve membership with a filtered select over
// rally_activities; here we synthesize it off the local store so
// the demo needs no extra tables. ASCII only, no em/en dashes.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getActivities, getActivity, getCurrentUser,
  getDeal, getContact, getCompany, contactName,
} from './store.js';

const DAY = 86400000;

/* ============================================================
   FILTER VOCABULARY  (drives the queue builder UI)
   ============================================================ */
// Notes are reference material, never queued as actionable work.
export const QUEUEABLE_TYPES = ['task', 'call', 'email', 'meeting'];

export const DUE_WINDOWS = [
  { id: 'overdue', label: 'Overdue only' },
  { id: 'today', label: 'Due today' },
  { id: 'week', label: 'Through this week' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'Any time' },
];
export const OWNER_SCOPES = [
  { id: 'me', label: 'Assigned to me' },
  { id: 'team', label: 'Whole team' },
];
export const PRIORITIES = [
  { id: 'any', label: 'Any priority' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export const PRIORITY_META = {
  high: { key: 'high', label: 'High', tone: 'risk', color: 'var(--risk)' },
  medium: { key: 'medium', label: 'Medium', tone: 'warn', color: 'var(--warn)' },
  low: { key: 'low', label: 'Low', tone: 'default', color: 'var(--n-400)' },
};

/* ---------- date bucketing (matches My day semantics) ---------- */
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
function endOfWeek() { const d = new Date(); d.setHours(23, 59, 59, 999); d.setDate(d.getDate() + (7 - d.getDay())); return d.getTime(); }

// Which coarse due bucket an activity sits in. No dueAt => treated as upcoming.
export function dueBucket(a) {
  const t = a && a.dueAt ? new Date(a.dueAt).getTime() : null;
  if (t == null) return 'upcoming';
  if (t < startOfToday()) return 'overdue';
  if (t <= endOfToday()) return 'today';
  if (t <= endOfWeek()) return 'week';
  return 'upcoming';
}
export const BUCKET_LABEL = { overdue: 'Overdue', today: 'Today', week: 'This week', upcoming: 'Upcoming' };
export const BUCKET_ORDER = ['overdue', 'today', 'week', 'upcoming'];

// Derived priority: honor an explicit activity.priority when present, else
// infer urgency from the due bucket (overdue high, today medium, else low).
export function priorityOf(a) {
  const p = (a && a.priority ? String(a.priority) : '').toLowerCase();
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  const b = dueBucket(a);
  if (b === 'overdue') return 'high';
  if (b === 'today') return 'medium';
  return 'low';
}

/* ---------- filter matchers ---------- */
function matchesWindow(a, win) {
  const b = dueBucket(a);
  switch (win) {
    case 'overdue': return b === 'overdue';
    case 'today': return b === 'overdue' || b === 'today';   // actionable now
    case 'week': return b === 'overdue' || b === 'today' || b === 'week';
    case 'upcoming': return b !== 'overdue';
    case 'all':
    default: return true;
  }
}
function matchesOwner(a, owner, me) {
  if (!owner || owner === 'team') return true;
  if (owner === 'me') return a.ownerId === me;
  return a.ownerId === owner; // explicit userId
}

const PRI_RANK = { high: 0, medium: 1, low: 2 };
function queueSort(x, y) {
  const dx = x.dueAt ? new Date(x.dueAt).getTime() : Infinity;
  const dy = y.dueAt ? new Date(y.dueAt).getTime() : Infinity;
  if (dx !== dy) return dx - dy;                 // soonest / most overdue first
  const px = PRI_RANK[priorityOf(x)] ?? 3, py = PRI_RANK[priorityOf(y)] ?? 3;
  if (px !== py) return px - py;
  return new Date(x.createdAt) - new Date(y.createdAt);
}

/* ============================================================
   RESOLUTION  (pure over the store, re-derives on every mutation)
   ============================================================ */
export function resolveQueue(def, opts = {}) {
  if (!def) return [];
  const me = opts.userId || getCurrentUser()?.id;
  const f = def.filter || {};
  const types = (Array.isArray(f.types) && f.types.length) ? f.types : QUEUEABLE_TYPES;
  const includeDone = !!f.includeDone && !opts.openOnly;
  const win = f.due || 'all';
  const owner = f.owner || 'me';
  const wantPri = f.priority && f.priority !== 'any' ? f.priority : null;

  const out = getActivities().filter(a => {
    if (!types.includes(a.type)) return false;
    if (!includeDone && a.done) return false;
    if (!matchesOwner(a, owner, me)) return false;
    if (!matchesWindow(a, win)) return false;
    if (wantPri && priorityOf(a) !== wantPri) return false;
    return true;
  });
  return out.sort(queueSort);
}

// Open-work counts for a queue badge: total, plus overdue/today splits.
export function queueStats(def, opts = {}) {
  const items = resolveQueue(def, { ...opts, openOnly: true });
  let overdue = 0, today = 0;
  for (const a of items) {
    const b = dueBucket(a);
    if (b === 'overdue') overdue++;
    else if (b === 'today') today++;
  }
  return { total: items.length, overdue, today };
}

// Group a resolved list into ordered due buckets for a scannable list view.
export function groupByBucket(items) {
  const map = { overdue: [], today: [], week: [], upcoming: [] };
  for (const a of items) map[dueBucket(a)].push(a);
  return BUCKET_ORDER.map(k => ({ key: k, label: BUCKET_LABEL[k], items: map[k] })).filter(g => g.items.length);
}

/* ---------- related-record context (for rows + focus card) ---------- */
export function relatedContext(a) {
  if (!a) return null;
  if (a.relatedType === 'deal') {
    const d = getDeal(a.relatedId);
    if (d) {
      const co = d.companyId ? getCompany(d.companyId) : null;
      return { kind: 'Deal', title: d.name, to: `/deals/${d.id}`, icon: 'target', meta: co ? co.name : null, value: d.value, stage: d.stage };
    }
  }
  if (a.relatedType === 'contact') {
    const c = getContact(a.relatedId);
    if (c) {
      const co = c.companyId ? getCompany(c.companyId) : null;
      return { kind: 'Contact', title: contactName(c), to: `/contacts/${c.id}`, icon: 'user', meta: [c.title, co && co.name].filter(Boolean).join(' at ') || null, email: c.email, phone: c.phone };
    }
  }
  const coId = a.relatedType === 'company' ? a.relatedId : a.companyId;
  if (coId) {
    const co = getCompany(coId);
    if (co) return { kind: 'Company', title: co.name, to: `/companies/${co.id}`, icon: 'building', meta: co.industry };
  }
  return null;
}

/* ---------- snooze presets (return an ISO string) ---------- */
function atHour(daysAhead, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
export const SNOOZE_PRESETS = [
  { id: 'later', label: 'Later today', to: () => { const d = new Date(); d.setHours(Math.max(d.getHours() + 3, 17), 0, 0, 0); return d.toISOString(); } },
  { id: 'tomorrow', label: 'Tomorrow', to: () => atHour(1, 9) },
  { id: 'week', label: 'Next week', to: () => atHour(7, 9) },
];

/* ============================================================
   QUEUE CATALOG  (built-ins in code, custom defs persisted)
   ============================================================ */
export const BUILTIN_QUEUES = [
  {
    id: 'today', name: 'My day', builtin: true, icon: 'sun', accent: 'var(--accent)',
    desc: 'Everything due today or overdue, assigned to you.',
    filter: { types: null, due: 'today', owner: 'me', priority: 'any' },
  },
  {
    id: 'overdue', name: 'Overdue', builtin: true, icon: 'clock', accent: 'var(--risk)',
    desc: 'Past-due work to clear before anything else.',
    filter: { types: null, due: 'overdue', owner: 'me', priority: 'any' },
  },
  {
    id: 'calls', name: 'Calls to make', builtin: true, icon: 'phone', accent: 'var(--accent-teal)',
    desc: 'Open calls on your plate, soonest first.',
    filter: { types: ['call'], due: 'all', owner: 'me', priority: 'any' },
  },
  {
    id: 'emails', name: 'Emails to send', builtin: true, icon: 'mail', accent: 'var(--info)',
    desc: 'Follow-up emails waiting to go out.',
    filter: { types: ['email'], due: 'all', owner: 'me', priority: 'any' },
  },
  {
    id: 'week', name: 'This week', builtin: true, icon: 'calendar', accent: 'var(--accent-purple)',
    desc: 'All open work through the end of the week.',
    filter: { types: null, due: 'week', owner: 'me', priority: 'any' },
  },
  {
    id: 'team-overdue', name: 'Team overdue', builtin: true, icon: 'users', accent: 'var(--warn)',
    desc: 'Overdue work across the whole team.',
    filter: { types: null, due: 'overdue', owner: 'team', priority: 'any' },
  },
];

const LS = 'rally_task_queues_v1';
const subs = new Set();
function loadCustom() {
  try { const r = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}
let custom = loadCustom();
function persist() {
  try { localStorage.setItem(LS, JSON.stringify(custom)); } catch {}
  subs.forEach(fn => fn());
}

export function getQueues() { return [...BUILTIN_QUEUES, ...custom]; }
export function getQueue(id) { return getQueues().find(q => q.id === id) || null; }
export function isBuiltin(id) { return BUILTIN_QUEUES.some(q => q.id === id); }

// Icons offered to a custom queue (existing glyphs only).
export const QUEUE_ICON_CHOICES = ['funnel', 'filter', 'target', 'phone', 'mail', 'calendar', 'clock', 'users', 'zap', 'bolt', 'sparkles', 'rocket', 'list', 'checkSquare'];

export function saveQueue(def) {
  if (!def || !def.name || !def.name.trim()) return { error: 'name', message: 'Give the queue a name.' };
  if (def.id && isBuiltin(def.id)) return { error: 'builtin', message: 'Built-in queues cannot be edited.' };
  const clean = {
    id: def.id || `q_${Date.now().toString(36)}`,
    name: def.name.trim(),
    builtin: false,
    icon: QUEUE_ICON_CHOICES.includes(def.icon) ? def.icon : 'funnel',
    accent: def.accent || 'var(--accent)',
    desc: (def.desc || '').trim(),
    filter: {
      types: Array.isArray(def.filter?.types) && def.filter.types.length
        ? def.filter.types.filter(t => QUEUEABLE_TYPES.includes(t))
        : null,
      due: DUE_WINDOWS.some(w => w.id === def.filter?.due) ? def.filter.due : 'all',
      owner: OWNER_SCOPES.some(o => o.id === def.filter?.owner) ? def.filter.owner : 'me',
      priority: PRIORITIES.some(p => p.id === def.filter?.priority) ? def.filter.priority : 'any',
      includeDone: !!def.filter?.includeDone,
    },
  };
  const i = custom.findIndex(q => q.id === clean.id);
  if (i >= 0) custom = custom.map(q => (q.id === clean.id ? clean : q));
  else custom = [...custom, clean];
  persist();
  return { queue: clean };
}

export function deleteQueue(id) {
  if (isBuiltin(id)) return { error: 'builtin', message: 'Built-in queues cannot be removed.' };
  custom = custom.filter(q => q.id !== id);
  persist();
  return { ok: true };
}

// Reactive catalog snapshot: re-renders subscribers when custom queues change.
export function useQueues() {
  const [snap, setSnap] = useState(getQueues);
  useEffect(() => {
    const fn = () => setSnap(getQueues());
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- focus-run helper (snapshot walk) ---------- */
// A focus run is a frozen ordered list of activity ids captured when the user
// enters focus mode, plus sets of ids already completed / snoozed / skipped.
// The current card is the first id still open and untouched; complete + snooze
// mutate the store (so the item drops out live) while skip only advances.
export function makeRun(def) {
  const list = resolveQueue(def, { openOnly: true });
  return { queueId: def.id, order: list.map(a => a.id), completed: new Set(), snoozed: new Set(), skipped: new Set() };
}
export function runCurrent(run) {
  if (!run) return null;
  for (const id of run.order) {
    if (run.completed.has(id) || run.snoozed.has(id) || run.skipped.has(id)) continue;
    const a = getActivity(id);
    if (a && !a.done) return a;
  }
  return null;
}
export function runProgress(run) {
  if (!run) return { total: 0, done: 0, snoozed: 0, skipped: 0, left: 0, pct: 0 };
  const total = run.order.length;
  const done = run.completed.size, snoozed = run.snoozed.size, skipped = run.skipped.size;
  const processed = done + snoozed + skipped;
  const left = Math.max(0, total - processed);
  return { total, done, snoozed, skipped, left, pct: total ? Math.round((processed / total) * 100) : 0 };
}
