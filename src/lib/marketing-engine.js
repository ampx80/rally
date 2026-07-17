// ============================================================
// RALLY MARKETING AUTOMATION ENGINE  (local-first, additive)
//
// A trigger / audience / send orchestration layer that sits over
// Rally's contacts (src/lib/store.js). An "automation" pairs an
// AUDIENCE SEGMENT (a pure filter over live contacts) with an
// email TEMPLATE (subject + body + merge tags). The engine can:
//
//   - resolve an audience to a live list of contacts
//   - compose a personalized send from a template + a contact
//   - decide who is DUE (audience minus anyone mailed inside the
//     throttle window, read from the events log = idempotency)
//   - dispatch: by default it RECORDS a simulated send into the
//     local marketing-events slice (demo-safe, zero network). When
//     called with { live:true } it POSTs the composed batch to
//     /api/marketing-run which routes every message through the
//     hardened server primitive api/_lib-email.js (Resend + retry +
//     idempotency + suppression, a safe no-op without RESEND_API_KEY).
//
// The marketing-events log (sends / opens / clicks) is a persisted
// localStorage slice so the UI has real analytics across reloads.
// Same local-first, deterministic-seed, Supabase-swappable pattern
// as store.js / sequences-data.js.
//
// ADDITIVE + env-gated: nothing here changes existing app behavior.
// The only network call lives behind an explicit { live:true } opt-in
// and the server it calls no-ops without RESEND_API_KEY.
//
// SUPABASE: rally_marketing_automations, rally_marketing_events.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getContacts, getCompany, contactName, getCurrentUser,
} from './store.js';

// Dedicated key. Used to share 'rally_marketing_v1' with marketing-campaigns.js,
// which silently overwrote automations with { campaigns } and crashed /automations.
const LS_KEY = 'rally_marketing_automations_v1';
const LS_LEGACY = 'rally_marketing_v1';
const DAY = 86400000;

// The cron-able server endpoint that actually sends (via _lib-email.js).
export const MARKETING_RUN_ENDPOINT = '/api/marketing-run';

/* ---------- lifecycle segments (mirror store.js lifecycleStage) ---------- */
export const AUDIENCE_STAGES = [
  { id: 'lead', label: 'Leads' },
  { id: 'sql', label: 'Working (SQL)' },
  { id: 'opportunity', label: 'Opportunities' },
  { id: 'customer', label: 'Customers' },
];
const stageLabel = (id) => AUDIENCE_STAGES.find(s => s.id === id)?.label || id;

export const TRIGGERS = {
  segment: { label: 'Audience segment', hint: 'Mails everyone in the segment, throttled so no one is over-mailed.' },
  manual: { label: 'Manual send', hint: 'Only sends when you run it by hand.' },
};

export const EVENT_TYPES = ['send', 'open', 'click'];

const uid = (() => { let n = Date.now(); return (p) => `${p}_${(n++).toString(36)}`; })();

/* ---------- deterministic PRNG (same family as store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   SEED  (a few believable automations + a live events log)
   ============================================================ */
function defaultAudience(over = {}) {
  return { stages: [], tags: [], owner: 'any', requireEmail: true, ...over };
}

function buildSeed() {
  const rnd = mulberry32(20260712);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();

  const automations = [
    {
      id: 'ma_welcome',
      name: 'New lead welcome nurture',
      description: 'A warm first touch the moment a lead lands in the book. Sets context and offers a working session.',
      active: true,
      trigger: 'segment',
      audience: defaultAudience({ stages: ['lead', 'sql'] }),
      template: {
        subject: 'Welcome to the conversation, {{firstName}}',
        preheader: 'A quick hello and one idea for {{company}}.',
        body: 'Hi {{firstName}},\n\nThanks for the interest in Rally. Teams like {{company}} usually come to us because forecasting feels like guesswork and the busywork never ends.\n\nWorth 20 minutes to show you how we compress it?\n\nBest,\n{{senderName}}',
        ctaLabel: 'Book 20 minutes',
        ctaUrl: 'https://rally.app/demo',
      },
      throttleDays: 21,
      dailyCap: 200,
      createdAt: now - 38 * DAY,
    },
    {
      id: 'ma_opp_checkin',
      name: 'Open opportunity check-in',
      description: 'Keeps momentum on active opportunities with a light, value-led nudge between rep touches.',
      active: true,
      trigger: 'segment',
      audience: defaultAudience({ stages: ['opportunity'] }),
      template: {
        subject: 'One number your board asks about, {{firstName}}',
        preheader: 'Pipeline coverage, win rate, net-new ARR - in one place.',
        body: 'Hi {{firstName}},\n\nAs {{company}} works through this evaluation, here is the one-pager on how revenue leaders report pipeline coverage, win rate, and net-new ARR in Rally.\n\nHappy to walk your team through it live.\n\n{{senderName}}',
        ctaLabel: 'See the metrics',
        ctaUrl: 'https://rally.app/features',
      },
      throttleDays: 14,
      dailyCap: 200,
      createdAt: now - 24 * DAY,
    },
    {
      id: 'ma_expansion',
      name: 'Customer expansion play',
      description: 'Proactive expansion touch for customers tagged for renewal or growth. Tees up the next conversation.',
      active: true,
      trigger: 'segment',
      audience: defaultAudience({ stages: ['customer'], tags: ['expansion', 'renewal'] }),
      template: {
        subject: 'An idea for {{company}} next quarter',
        preheader: 'A small expansion idea based on how your team uses Rally.',
        body: 'Hi {{firstName}},\n\nGreat to see {{company}} getting real value from Rally. Two teams your size recently expanded into forecasting and sequences and saw a quick lift.\n\nWant me to put together a short plan?\n\n{{senderName}}',
        ctaLabel: 'Review the plan',
        ctaUrl: 'https://rally.app/pricing',
      },
      throttleDays: 30,
      dailyCap: 100,
      createdAt: now - 15 * DAY,
    },
    {
      id: 'ma_reengage',
      name: 'Re-engage dormant leads',
      description: 'Break-up and reactivation touch for leads that went quiet. Draft, off by default.',
      active: false,
      trigger: 'segment',
      audience: defaultAudience({ stages: ['lead'] }),
      template: {
        subject: 'Still on your radar, {{firstName}}?',
        preheader: 'One number that might change your mind.',
        body: 'Hi {{firstName}},\n\nIt has been a while. Priorities shift. Is modernizing revenue ops at {{company}} still on the table this year?\n\nTeams that adopted Rally saw a 22 percent lift in meetings booked in 90 days. Happy to show you the playbook.\n\n{{senderName}}',
        ctaLabel: 'See the playbook',
        ctaUrl: 'https://rally.app/customers',
      },
      throttleDays: 45,
      dailyCap: 200,
      createdAt: now - 61 * DAY,
    },
  ];

  // Seed a believable events log for the active automations across ~21 days.
  const contacts = getContacts().filter(c => c.email);
  const events = [];
  for (const a of automations) {
    if (!a.active) continue;
    // Audience slice (pure filter, same logic as resolveAudience below).
    const pool = contacts.filter(c => matchesAudience(a.audience, c));
    const reach = Math.min(pool.length, int(10, 28));
    for (let i = 0; i < reach; i++) {
      const c = pool[i];
      const sentAt = now - int(1, 21) * DAY - int(0, 20) * 3600000;
      events.push({ id: uid('ev'), automationId: a.id, contactId: c.id, email: c.email, type: 'send', subject: a.template.subject, at: sentAt });
      // Opens follow a healthy fraction of sends.
      if (rnd() < 0.52) {
        events.push({ id: uid('ev'), automationId: a.id, contactId: c.id, email: c.email, type: 'open', subject: a.template.subject, at: sentAt + int(1, 40) * 60000 });
        // Clicks are a fraction of opens.
        if (rnd() < 0.34) {
          events.push({ id: uid('ev'), automationId: a.id, contactId: c.id, email: c.email, type: 'click', subject: a.template.subject, at: sentAt + int(41, 90) * 60000 });
        }
      }
    }
  }

  return { seededAt: now, automations, events };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let data = load();
const subs = new Set();

function normalize(s) {
  return {
    seededAt: s?.seededAt || Date.now(),
    automations: Array.isArray(s?.automations) ? s.automations : [],
    events: Array.isArray(s?.events) ? s.events : [],
  };
}

function load() {
  // Prefer the dedicated key.
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = normalize(JSON.parse(raw));
      if (s.automations.length) return s;
    }
  } catch {}
  // Migrate from the shared legacy key only when it still holds automations
  // (campaigns may have overwritten it with { campaigns }).
  try {
    const raw = localStorage.getItem(LS_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.automations) && parsed.automations.length) {
        const migrated = normalize(parsed);
        try { localStorage.setItem(LS_KEY, JSON.stringify(migrated)); } catch {}
        return migrated;
      }
    }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  data = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  subs.forEach(fn => fn(data));
}
export function resetMarketing() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  data = load();
  subs.forEach(fn => fn(data));
}

export function useMarketingEngine(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(data));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(data);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   READS
   ============================================================ */
export const getAutomations = () => (Array.isArray(data.automations) ? data.automations : []);
export const getAutomation = (id) => getAutomations().find(a => a.id === id);
export const getEvents = () => (Array.isArray(data.events) ? data.events : []);
export const eventsForAutomation = (id) => getEvents().filter(e => e.automationId === id);
export const eventsForContact = (id) => getEvents().filter(e => e.contactId === id);

/* ---------- audience (pure filter over live contacts) ---------- */
// Pure predicate so the seed, the UI preview, and the due calc all agree.
export function matchesAudience(audience = {}, contact) {
  if (!contact) return false;
  const a = { stages: [], tags: [], owner: 'any', requireEmail: true, ...audience };
  if (a.requireEmail && !contact.email) return false;
  if (a.stages.length && !a.stages.includes(contact.lifecycleStage)) return false;
  if (a.tags.length) {
    const ctags = contact.tags || [];
    if (!a.tags.some(t => ctags.includes(t))) return false;
  }
  if (a.owner && a.owner !== 'any' && contact.ownerId !== a.owner) return false;
  return true;
}

export function resolveAudience(audience) {
  return getContacts().filter(c => matchesAudience(audience, c));
}
export function audienceSize(audience) {
  return resolveAudience(audience).length;
}

/* ---------- template merge ---------- */
const MERGE_KEYS = ['firstName', 'lastName', 'fullName', 'company', 'title', 'senderName', 'senderEmail'];

export function mergeContext(contact, sender) {
  const co = contact?.companyId ? getCompany(contact.companyId) : null;
  const s = sender || getCurrentUser() || {};
  return {
    firstName: contact?.firstName || 'there',
    lastName: contact?.lastName || '',
    fullName: contact ? contactName(contact) : 'there',
    company: co?.name || 'your team',
    title: contact?.title || '',
    senderName: s?.name || 'the Rally team',
    senderEmail: s?.email || '',
  };
}

export function renderMergeTags(text, ctx) {
  if (!text) return '';
  let out = String(text);
  for (const k of MERGE_KEYS) {
    out = out.split(`{{${k}}}`).join(ctx[k] == null ? '' : String(ctx[k]));
  }
  return out;
}

// Turn a plain-text body into safe body-only HTML paragraphs. The server
// primitive (_lib-email.js) wraps this fragment in the Rally dark shell.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function bodyToHtml(text) {
  const paras = String(text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paras
    .map(p => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// Compose a personalized, send-ready message from an automation + a contact.
// Shape lines up 1:1 with the fields api/marketing-run.js forwards to sendEmail.
export function composeSend(automation, contact, { sender } = {}) {
  const ctx = mergeContext(contact, sender);
  const t = automation.template || {};
  const subject = renderMergeTags(t.subject || '', ctx);
  const bodyText = renderMergeTags(t.body || '', ctx);
  return {
    contactId: contact.id,
    to: contact.email,
    subject,
    bodyHtml: bodyToHtml(bodyText),
    text: bodyText,
    preheader: renderMergeTags(t.preheader || '', ctx),
    ctaLabel: t.ctaLabel || '',
    ctaUrl: t.ctaUrl || '',
    category: 'marketing',
    // Idempotency bucket: same automation + contact inside one throttle window
    // maps to one key, so a re-run inside the window is a server-side no-op too.
    idempotencyKey: `mkt|${automation.id}|${contact.id}|${throttleBucket(automation)}`,
  };
}

function throttleBucket(automation) {
  const win = Math.max(1, Number(automation.throttleDays) || 14) * DAY;
  return Math.floor(Date.now() / win);
}

/* ---------- due calc (audience minus recently mailed) ---------- */
// A contact is DUE if they are in the audience and have not been sent this
// automation within its throttle window (read straight from the events log).
export function dueRecipients(automation, { now = Date.now() } = {}) {
  if (!automation) return [];
  const win = Math.max(1, Number(automation.throttleDays) || 14) * DAY;
  const cutoff = now - win;
  const recent = new Set(
    eventsForAutomation(automation.id)
      .filter(e => e.type === 'send' && e.at >= cutoff)
      .map(e => e.contactId)
  );
  return resolveAudience(automation.audience).filter(c => !recent.has(c.id));
}

/* ---------- stats ---------- */
export function automationStats(automation) {
  const evs = eventsForAutomation(automation.id);
  const sent = evs.filter(e => e.type === 'send').length;
  const opened = evs.filter(e => e.type === 'open').length;
  const clicked = evs.filter(e => e.type === 'click').length;
  const recipients = audienceSize(automation.audience);
  const due = automation.active ? dueRecipients(automation).length : 0;
  return {
    sent, opened, clicked, recipients, due,
    openRate: sent ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent ? Math.round((clicked / sent) * 1000) / 10 : 0,
  };
}

export function fleetStats() {
  let sent = 0, opened = 0, clicked = 0, active = 0, due = 0;
  for (const a of getAutomations()) {
    const s = automationStats(a);
    sent += s.sent; opened += s.opened; clicked += s.clicked;
    if (a.active) { active++; due += s.due; }
  }
  return {
    sent, opened, clicked, active, due,
    openRate: sent ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent ? Math.round((clicked / sent) * 1000) / 10 : 0,
  };
}

/* ============================================================
   WRITES
   ============================================================ */
export function createAutomation({ name, description, trigger = 'segment', audience, template } = {}) {
  const a = {
    id: uid('ma'),
    name: (name || 'Untitled automation').trim(),
    description: (description || '').trim(),
    active: false,
    trigger: TRIGGERS[trigger] ? trigger : 'segment',
    audience: defaultAudience(audience || {}),
    template: {
      subject: 'A note for {{firstName}}',
      preheader: '',
      body: 'Hi {{firstName}},\n\n[Write your touch here. Merge tags {{company}} and {{senderName}} are supported.]\n\n{{senderName}}',
      ctaLabel: '',
      ctaUrl: '',
      ...(template || {}),
    },
    throttleDays: 14,
    dailyCap: 200,
    createdAt: Date.now(),
  };
  commit({ ...data, automations: [a, ...data.automations] });
  return a;
}

export function updateAutomation(id, patch) {
  const automations = data.automations.map(a => {
    if (a.id !== id) return a;
    const next = { ...a, ...patch };
    if (patch.audience) next.audience = defaultAudience({ ...a.audience, ...patch.audience });
    if (patch.template) next.template = { ...a.template, ...patch.template };
    return next;
  });
  commit({ ...data, automations });
  return automations.find(a => a.id === id);
}

export function toggleAutomation(id) {
  const a = getAutomation(id);
  if (!a) return null;
  return updateAutomation(id, { active: !a.active });
}

export function deleteAutomation(id) {
  commit({
    ...data,
    automations: data.automations.filter(a => a.id !== id),
    events: data.events.filter(e => e.automationId !== id),
  });
}

// Append one event to the persisted log. Used by simulated sends and by any
// future webhook bridge (open/click pixels) that records engagement.
export function recordEvent({ automationId, contactId, email, type = 'send', subject = '', at = Date.now() }) {
  if (!EVENT_TYPES.includes(type)) return null;
  const ev = { id: uid('ev'), automationId, contactId, email, type, subject, at };
  commit({ ...data, events: [ev, ...data.events] });
  return ev;
}

/* ============================================================
   ORCHESTRATION / DISPATCH
   ============================================================ */

// POST a composed batch to the server, which sends each message through the
// hardened primitive (api/_lib-email.js). Returns the server result. Guarded:
// any network / server error is swallowed into a { ok:false } so the UI never
// throws. Only ever called behind an explicit { live:true }.
export async function dispatchToApi(automationId, sends) {
  try {
    const res = await fetch(MARKETING_RUN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', automationId, sends }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, ...json };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'network' };
  }
}

// Run an automation over its DUE recipients.
//   dryRun  -> compute the batch, touch nothing (returns the plan).
//   live    -> POST to /api/marketing-run for a REAL send through Resend.
//   default -> record simulated 'send' events into the local log (demo-safe,
//              zero network) so the UI analytics move without emailing anyone.
// Always bounded by `limit` and the automation's dailyCap.
export async function runAutomation(automationId, { limit, dryRun = false, live = false, sender } = {}) {
  const a = getAutomation(automationId);
  if (!a) return { ok: false, error: 'unknown automation' };
  const cap = Math.max(0, Math.min(Number(limit ?? a.dailyCap ?? 200), Number(a.dailyCap ?? 200)));
  const recipients = dueRecipients(a).slice(0, cap);
  const sends = recipients.map(c => composeSend(a, c, { sender }));

  if (dryRun) {
    return { ok: true, dryRun: true, planned: sends.length, recipients: recipients.length, sends };
  }

  if (live) {
    const out = await dispatchToApi(automationId, sends);
    // Mirror confirmed server sends into the local log so the UI reflects them.
    if (out && out.ok && Array.isArray(out.results)) {
      for (const r of out.results) {
        if (r && r.ok && !r.idempotent_skip && !r.suppressed) {
          recordEvent({ automationId, contactId: r.contactId, email: r.to, type: 'send', subject: r.subject });
        }
      }
    }
    return { ok: !!(out && out.ok), live: true, planned: sends.length, ...out };
  }

  // Simulated send: record a 'send' event per recipient. No email leaves.
  for (const s of sends) {
    recordEvent({ automationId, contactId: s.contactId, email: s.to, type: 'send', subject: s.subject });
  }
  return { ok: true, simulated: true, sent: sends.length, recipients: recipients.length };
}
