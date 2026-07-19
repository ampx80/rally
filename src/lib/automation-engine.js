// ============================================================
// ARDOVO AUTOMATION ENGINE  (the single execution engine)
// ------------------------------------------------------------
// ONE engine to replace the three parallel builders that used to
// live side by side (Workflows evaluate-only, automations.js
// client executor, Flow.jsx simulator). Everything that runs an
// automation - the Workflows builder, the Flow canvas, the server
// cron runner - now speaks this one vocabulary and this one
// enrollment model.
//
// An automation is:
//   { id, name, description, active, trigger:{type,config}, steps:[...] }
//
// A step is:
//   { id, type, config }
// where type is one of STEP_TYPES: send_email, create_task,
// create_activity, create_contact, update_record, wait, branch,
// goal, webhook, ai_step.
//
// Every entity that enters an automation gets an ENROLLMENT with a
// per-step history and a status (active / waiting / completed /
// failed). The client executor advances enrollments on real events
// plus a tick; api/automation-run.js is the server-side cron runner.
//
// Persistence is local-first (localStorage + pub/sub, mirroring
// store.js) with `// SUPABASE:` seams marking the live equivalents.
// ASCII only. NO em-dash or en-dash anywhere.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import {
  getDeals, getDeal, getContacts, getContact, getCompany,
  createContact, createActivity, updateDeal, updateContact, moveDealStage,
  userName, stageById, STAGES, useStore,
} from './store.js';

// SUPABASE: rally_automations (rules), rally_enrollments (one row per entity
//           in an automation), rally_enrollment_steps (append-only step log).
const LS_AUTOS = 'ardovo_engine_automations_v1';
const LS_ENROLL = 'ardovo_engine_enrollments_v1';
const LS_LOG = 'ardovo_engine_log_v1';
const LOG_CAP = 300;
const ENROLL_CAP = 400;

/* ============================================================
   TRIGGER VOCABULARY
   Each trigger knows its object, an icon, help copy, and (where it
   makes sense) how to pull a sample live record so the builder can
   preview and the Run test button has something real to enroll.
   ============================================================ */
export const TRIGGERS = {
  record_created: {
    type: 'record_created', label: 'Record is created', object: 'deal', icon: 'plus',
    title: 'When a record is created', sub: 'Fires when a new deal, contact, or company is added',
    config: { object: 'deal' },
    sample: (cfg) => firstOf(cfg?.object || 'deal'),
  },
  record_changed: {
    type: 'record_changed', label: 'Record stage or field changes', object: 'deal', icon: 'sliders',
    title: 'When a record changes', sub: 'Fires when a deal moves stage or a watched field changes',
    config: { object: 'deal', stage: '' },
    sample: (cfg) => firstOf(cfg?.object || 'deal'),
  },
  form_submit: {
    type: 'form_submit', label: 'Form is submitted', object: 'contact', icon: 'list',
    title: 'When a form is submitted', sub: "Listens for the 'rally:form-submit' event",
    config: { formName: 'Any form' },
    sample: () => ({ __synthetic: true, object: 'contact', email: 'new.lead@example.com', firstName: 'New', lastName: 'Lead', name: 'New Lead' }),
  },
  email_open: {
    type: 'email_open', label: 'Email is opened', object: 'contact', icon: 'mail',
    title: 'When an email is opened', sub: "Listens for the 'rally:email-open' event",
    config: {},
    sample: () => firstOf('contact'),
  },
  payment_received: {
    type: 'payment_received', label: 'Payment is received', object: 'contact', icon: 'dollar',
    title: 'When a payment is received', sub: "Listens for the 'rally:payment' event",
    config: { minAmount: 0 },
    sample: () => firstOf('contact'),
  },
  schedule: {
    type: 'schedule', label: 'On a schedule', object: 'deal', icon: 'calendar',
    title: 'On a recurring schedule', sub: 'Runs on a cron cadence via the server runner',
    config: { cron: '0 9 * * *', object: 'deal' },
    sample: (cfg) => firstOf(cfg?.object || 'deal'),
  },
  webhook: {
    type: 'webhook', label: 'Inbound webhook', object: 'contact', icon: 'plug',
    title: 'When an inbound webhook arrives', sub: 'An external system POSTs to /api/automation-run',
    config: {},
    sample: () => ({ __synthetic: true, object: 'contact', email: 'webhook.lead@example.com', firstName: 'Webhook', lastName: 'Lead', name: 'Webhook Lead' }),
  },
};
export const TRIGGER_LIST = Object.values(TRIGGERS);
export const triggerMeta = (type) => TRIGGERS[type] || TRIGGERS.record_created;

function firstOf(object) {
  if (object === 'deal') return getDeals()[0] || null;
  if (object === 'contact') return getContacts()[0] || null;
  if (object === 'company') { const c = getContacts()[0]; return c ? getCompany(c.companyId) : null; }
  return getDeals()[0] || null;
}

/* ============================================================
   OPERATORS  (used by the branch step)
   ============================================================ */
export const OPERATORS = {
  is_true: { id: 'is_true', label: 'is true', unary: true },
  is_false: { id: 'is_false', label: 'is false', unary: true },
  is_set: { id: 'is_set', label: 'is set', unary: true },
  eq: { id: 'eq', label: 'is equal to' },
  neq: { id: 'neq', label: 'is not' },
  gt: { id: 'gt', label: 'is greater than' },
  lt: { id: 'lt', label: 'is less than' },
};
export const OPERATOR_LIST = Object.values(OPERATORS);

// The fields a branch can test: event flags carried on the enrollment
// context plus a few record columns. Kept small and honest.
export const BRANCH_FIELDS = {
  email_opened: { label: 'Email was opened', type: 'bool' },
  payment_received: { label: 'Payment was received', type: 'bool' },
  payment_amount: { label: 'Payment amount', type: 'number' },
  value: { label: 'Deal value', type: 'number' },
  stage: { label: 'Deal stage', type: 'stage' },
  status: { label: 'Record status', type: 'text' },
  title: { label: 'Job title', type: 'text' },
};
export const BRANCH_FIELD_LIST = Object.entries(BRANCH_FIELDS).map(([id, f]) => ({ id, ...f }));

/* ============================================================
   STEP VOCABULARY
   kind: 'action' performs work; 'control' shapes the path.
   run(enrollment, cfg) executes against the live store / APIs and
   returns { ok, detail, to?, wait? }. Network calls are fire-and-
   forget so the executor stays synchronous, exactly like store.js.
   ============================================================ */
const dueInDays = (n) => new Date(Date.now() + (Number(n) || 0) * 86400000).toISOString();

function ctxEmail(ctx) { return (ctx.email || '').trim(); }
function ctxName(ctx) {
  const n = (ctx.name || `${ctx.firstName || ''} ${ctx.lastName || ''}`).trim();
  return n || ctxEmail(ctx) || 'this lead';
}
function subjectRecord(en) {
  // The store record this enrollment currently points at, if any.
  const e = en.entity || {};
  if (e.type === 'deal') return { record: getDeal(e.id), object: 'deal' };
  if (e.type === 'contact') return { record: getContact(e.id), object: 'contact' };
  if (e.type === 'company') return { record: getCompany(e.id), object: 'company' };
  return { record: null, object: e.type || 'lead' };
}

function interp(tpl, ctx) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}

function fireBroadcast(to, firstName, subject, body) {
  try {
    if (typeof fetch !== 'function') return;
    fetch('/api/broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ campaign: { name: 'Automation email', subject, body }, recipients: [{ email: to, firstName: firstName || '' }] }),
    }).catch(() => {});
  } catch { /* fire-and-forget */ }
}
function fireOutbound(url, message, payload) {
  try {
    if (typeof fetch !== 'function') return;
    fetch('/api/outbound', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ kind: 'webhook', url, message, payload }),
    }).catch(() => {});
  } catch { /* fire-and-forget */ }
}
function fireRook(prompt, context) {
  try {
    if (typeof fetch !== 'function') return false;
    fetch('/api/rook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ action: 'automation_step', prompt, context }),
    }).catch(() => {});
    return true;
  } catch { return false; }
}

export const STEP_TYPES = {
  create_contact: {
    type: 'create_contact', kind: 'action', label: 'Create or find contact', icon: 'user', tone: 'ok', minutes: 3,
    desc: 'Turn the enrolled lead into a real contact in the CRM.',
    run: (en, cfg) => {
      const ctx = en.context || {};
      const email = ctxEmail(ctx);
      // reuse an existing contact with the same email so we never duplicate
      const existing = email ? getContacts().find(c => (c.email || '').toLowerCase() === email.toLowerCase()) : null;
      let contact = existing;
      if (!contact) {
        const parts = ctxName(ctx).split(' ');
        const r = createContact({
          firstName: ctx.firstName || parts[0] || 'New',
          lastName: ctx.lastName || parts.slice(1).join(' ') || 'Lead',
          email, title: ctx.title || '', companyId: ctx.companyId || null,
          tags: ['inbound'],
        });
        if (r.error) return { ok: false, detail: `Could not create contact: ${r.message}` };
        contact = r.contact;
      }
      en.entity = { type: 'contact', id: contact.id, label: `${contact.firstName} ${contact.lastName}`.trim() };
      en.context = { ...ctx, contactId: contact.id, companyId: contact.companyId || ctx.companyId || null, email: contact.email || email };
      return { ok: true, detail: existing ? `Matched existing contact ${contact.firstName} ${contact.lastName}` : `Created contact ${contact.firstName} ${contact.lastName}`, to: `/app/contacts/${contact.id}` };
    },
  },

  send_email: {
    type: 'send_email', kind: 'action', label: 'Send an email', icon: 'mail', tone: 'info', minutes: 6,
    desc: 'Send a templated email through the hardened /api/broadcast sender.',
    run: (en, cfg) => {
      const ctx = en.context || {};
      const to = ctxEmail(ctx);
      const subject = interp(cfg.subject || 'A quick note from our team', ctx);
      const body = interp(cfg.body || 'Hi {firstName},\n\nThanks for connecting with us. We will be in touch shortly.', ctx);
      // Persist a real email activity so the rep sees it in the timeline.
      if (en.entity?.type === 'contact' || en.entity?.type === 'deal') {
        createActivity({
          type: 'email', subject: `Automation email: ${subject}`, body,
          done: !!to, relatedType: en.entity.type, relatedId: en.entity.id,
          ownerId: undefined,
        });
      }
      if (!to) return { ok: true, detail: `Drafted email "${subject}" (no address on file yet)` };
      fireBroadcast(to, ctx.firstName, subject, body);
      return { ok: true, detail: `Sent "${subject}" to ${to}`, to: '/app/activities' };
    },
  },

  create_task: {
    type: 'create_task', kind: 'action', label: 'Create a task', icon: 'checkSquare', tone: 'ok', minutes: 4,
    desc: 'Add a follow-up task for the owner on the enrolled record.',
    run: (en, cfg) => {
      const { record, object } = subjectRecord(en);
      const r = createActivity({
        type: 'task', subject: interp(cfg.subject || 'Follow up', en.context || {}),
        dueAt: dueInDays(cfg.dueDays ?? 1), done: false,
        relatedType: record ? object : null, relatedId: record ? record.id : null,
        companyId: en.context?.companyId || (record ? record.companyId : null) || null,
      });
      if (r.error) return { ok: false, detail: `Could not create task: ${r.message}` };
      return { ok: true, detail: `Created task "${r.activity.subject}"`, to: '/app/activities' };
    },
  },

  create_activity: {
    type: 'create_activity', kind: 'action', label: 'Log an activity', icon: 'activity', tone: 'ok', minutes: 2,
    desc: 'Write a note or logged activity onto the record timeline.',
    run: (en, cfg) => {
      const { record, object } = subjectRecord(en);
      const r = createActivity({
        type: cfg.activityType || 'note', subject: interp(cfg.subject || 'Automation note', en.context || {}),
        body: interp(cfg.body || '', en.context || {}), done: true,
        relatedType: record ? object : null, relatedId: record ? record.id : null,
        companyId: en.context?.companyId || (record ? record.companyId : null) || null,
      });
      if (r.error) return { ok: false, detail: `Could not log activity: ${r.message}` };
      return { ok: true, detail: `Logged "${r.activity.subject}"`, to: '/app/activities' };
    },
  },

  update_record: {
    type: 'update_record', kind: 'action', label: 'Update the record', icon: 'edit', tone: 'accent', minutes: 1,
    desc: 'Set a field or move a stage on the enrolled record.',
    run: (en, cfg) => {
      const { record, object } = subjectRecord(en);
      if (!record) return { ok: false, detail: 'No record to update yet' };
      const field = cfg.field || 'probability';
      if (object === 'deal' && field === 'stage') {
        const r = moveDealStage(record.id, cfg.value || 'qualified', { silent: false });
        if (r.error) return { ok: false, detail: `Could not move stage: ${r.message}` };
        return { ok: true, detail: `Moved to ${stageById(cfg.value)?.name || cfg.value}`, to: `/app/deals/${record.id}` };
      }
      const value = field === 'probability' || field === 'value' ? Number(cfg.value) : cfg.value;
      const r = object === 'deal' ? updateDeal(record.id, { [field]: value }) : updateContact(record.id, { [field]: value });
      if (r.error) return { ok: false, detail: `Could not update: ${r.message}` };
      return { ok: true, detail: `Set ${field} to ${value}`, to: object === 'deal' ? `/app/deals/${record.id}` : `/app/contacts/${record.id}` };
    },
  },

  webhook: {
    type: 'webhook', kind: 'action', label: 'Call a webhook', icon: 'plug', tone: 'info', minutes: 1,
    desc: 'POST the enrolled record to an external URL (Zapier, Make, your endpoint).',
    run: (en, cfg) => {
      if (!cfg.url) return { ok: false, detail: 'Add a webhook URL to call for real' };
      const { record, object } = subjectRecord(en);
      const payload = { object, id: record?.id || en.entity?.id || null, ...(en.context || {}) };
      fireOutbound(cfg.url, interp(cfg.message || '', en.context || {}), payload);
      let host = cfg.url; try { host = new URL(cfg.url).host; } catch { /* keep raw */ }
      return { ok: true, detail: `Sent to ${host}` };
    },
  },

  ai_step: {
    type: 'ai_step', kind: 'action', label: 'Run a Rook AI step', icon: 'sparkles', tone: 'accent', minutes: 5,
    desc: 'Hand the wheel to Rook: draft, decide, or enrich inside the flow.',
    run: (en, cfg) => {
      const prompt = interp(cfg.instruction || 'Summarize this record and suggest the next best action.', en.context || {});
      const dispatched = fireRook(prompt, { entity: en.entity, context: en.context });
      // Always log a real activity so the step is observable even offline.
      const { record, object } = subjectRecord(en);
      if (record) {
        createActivity({
          type: 'note', subject: 'Rook AI step', body: prompt, done: true,
          relatedType: object, relatedId: record.id, companyId: record.companyId || null,
        });
      }
      return { ok: true, detail: dispatched ? `Rook is running: "${prompt.slice(0, 48)}"` : `Rook step queued: "${prompt.slice(0, 48)}"` };
    },
  },

  wait: {
    type: 'wait', kind: 'control', label: 'Wait / delay', icon: 'clock', tone: 'amber', minutes: 0,
    desc: 'Pause the enrollment before the next step.',
    run: (en, cfg) => {
      const ms = waitMs(cfg);
      return { ok: true, wait: ms, detail: `Waiting ${waitLabel(cfg)}` };
    },
  },

  branch: {
    type: 'branch', kind: 'control', label: 'If / branch', icon: 'gitBranch', tone: 'amber', minutes: 0,
    desc: 'Continue only when a condition is met; otherwise the enrollment exits.',
    run: (en, cfg) => {
      const pass = evalBranch(en, cfg);
      const label = branchSummary(cfg);
      return { ok: true, branch: pass, detail: pass ? `Yes: ${label}` : `No: ${label} (exited)` };
    },
  },

  goal: {
    type: 'goal', kind: 'control', label: 'Goal reached', icon: 'flag', tone: 'ok', minutes: 0,
    desc: 'Mark the enrollment as having reached its goal and complete it.',
    run: (en, cfg) => ({ ok: true, goal: true, detail: cfg.label ? `Goal: ${cfg.label}` : 'Goal reached' }),
  },
};
export const STEP_LIST = Object.values(STEP_TYPES);
export const stepMeta = (type) => STEP_TYPES[type] || { type, kind: 'action', label: type, icon: 'zap', tone: 'info', minutes: 2, desc: '', run: () => ({ ok: false, detail: `Unknown step ${type}` }) };

/* ---------- wait helpers ---------- */
const UNIT_MS = { minutes: 60000, hours: 3600000, days: 86400000, seconds: 1000 };
export function waitMs(cfg = {}) {
  const amount = Number(cfg.amount);
  const unit = UNIT_MS[cfg.unit] ? cfg.unit : 'days';
  return Math.max(0, (Number.isFinite(amount) ? amount : 1) * UNIT_MS[unit]);
}
export function waitLabel(cfg = {}) {
  const amount = Number.isFinite(Number(cfg.amount)) ? Number(cfg.amount) : 1;
  const unit = UNIT_MS[cfg.unit] ? cfg.unit : 'days';
  return `${amount} ${amount === 1 ? unit.replace(/s$/, '') : unit}`;
}

/* ---------- branch evaluation ---------- */
function branchContext(en) {
  const ctx = { ...(en.context || {}) };
  const { record, object } = subjectRecord(en);
  if (record) {
    if (object === 'deal') { ctx.value = record.value; ctx.stage = record.stage; ctx.status = record.status; }
    if (object === 'contact') { ctx.title = record.title; ctx.status = record.status || record.lifecycleStage; }
  }
  return ctx;
}
export function evalBranch(en, cfg = {}) {
  const ctx = branchContext(en);
  const field = cfg.field || 'email_opened';
  const op = cfg.op || 'is_true';
  const actual = ctx[field];
  if (op === 'is_true') return actual === true || actual === 'true';
  if (op === 'is_false') return !(actual === true || actual === 'true');
  if (op === 'is_set') return actual != null && actual !== '';
  const meta = BRANCH_FIELDS[field];
  if (meta?.type === 'number') {
    const a = Number(actual), b = Number(cfg.value);
    if (op === 'gt') return a > b;
    if (op === 'lt') return a < b;
    if (op === 'eq') return a === b;
    if (op === 'neq') return a !== b;
  }
  const a = String(actual ?? '').toLowerCase();
  const b = String(cfg.value ?? '').toLowerCase();
  if (op === 'eq') return a === b;
  if (op === 'neq') return a !== b;
  return false;
}
export function branchSummary(cfg = {}) {
  const f = BRANCH_FIELDS[cfg.field || 'email_opened'];
  const op = OPERATORS[cfg.op || 'is_true'];
  const label = f?.label || cfg.field || 'condition';
  if (op?.unary) return `${label} ${op.label}`;
  const val = f?.type === 'stage' ? (stageById(cfg.value)?.name || cfg.value) : cfg.value;
  return `${label} ${op?.label || cfg.op} ${val}`;
}

/* ============================================================
   HUMAN-READABLE SUMMARIES  (shared by the builder + the canvas)
   ============================================================ */
function money(n) {
  if (n == null) return '$0';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
}
export function triggerSummary(a) {
  const t = TRIGGERS[a.trigger?.type];
  const cfg = a.trigger?.config || {};
  if (!t) return 'Custom trigger';
  if (a.trigger.type === 'record_created') return `${cap(cfg.object || 'deal')} is created`;
  if (a.trigger.type === 'record_changed') return cfg.stage ? `Deal moves to ${stageById(cfg.stage)?.name || cfg.stage}` : `${cap(cfg.object || 'deal')} changes`;
  if (a.trigger.type === 'form_submit') return cfg.formName && cfg.formName !== 'Any form' ? `Form "${cfg.formName}" submitted` : 'Any form is submitted';
  if (a.trigger.type === 'payment_received') return cfg.minAmount ? `Payment over ${money(cfg.minAmount)}` : 'Payment received';
  if (a.trigger.type === 'schedule') return `Schedule (${cfg.cron || '0 9 * * *'})`;
  return t.label;
}
export function stepSummary(step) {
  const cfg = step.config || {};
  switch (step.type) {
    case 'create_contact': return 'Create or find the contact';
    case 'send_email': return `Send email "${cfg.subject || 'A quick note'}"`;
    case 'create_task': return `Create task "${cfg.subject || 'Follow up'}"${cfg.dueDays != null ? ` (+${cfg.dueDays}d)` : ''}`;
    case 'create_activity': return `Log ${cfg.activityType || 'note'} "${cfg.subject || 'Note'}"`;
    case 'update_record': return cfg.field === 'stage' ? `Move stage to ${stageById(cfg.value)?.name || cfg.value || 'next'}` : `Set ${cfg.field || 'field'} to ${cfg.value}`;
    case 'webhook': return `Call webhook${cfg.url ? '' : ' (add URL)'}`;
    case 'ai_step': return `Rook: ${cfg.instruction || 'next best action'}`;
    case 'wait': return `Wait ${waitLabel(cfg)}`;
    case 'branch': return `If ${branchSummary(cfg)}`;
    case 'goal': return cfg.label ? `Goal: ${cfg.label}` : 'Goal reached';
    default: return stepMeta(step.type).label;
  }
}
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
export const minutesPerRun = (a) => (a.steps || []).reduce((s, x) => s + (STEP_TYPES[x.type]?.minutes || 2), 0);

export function entityLabel(entity) {
  if (!entity) return 'a record';
  return entity.label || entity.id || cap(entity.type || 'record');
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (automations)
   ============================================================ */
let autos = loadAutos();
const autoSubs = new Set();
function loadAutos() {
  try { const raw = localStorage.getItem(LS_AUTOS); if (raw) return JSON.parse(raw); } catch { /* fall through to seed */ }
  const seed = buildSeed();
  try { localStorage.setItem(LS_AUTOS, JSON.stringify(seed)); } catch { /* ignore quota */ }
  return seed;
}
function commitAutos(next) {
  autos = next;
  try { localStorage.setItem(LS_AUTOS, JSON.stringify(autos)); } catch { /* ignore quota */ }
  autoSubs.forEach(fn => fn(autos));
}
export function resetEngine() {
  try { localStorage.removeItem(LS_AUTOS); localStorage.removeItem(LS_ENROLL); localStorage.removeItem(LS_LOG); } catch { /* ignore */ }
  autos = loadAutos(); enrollments = []; logRows = [];
  commitEnroll(enrollments); commitLog(logRows); autoSubs.forEach(fn => fn(autos));
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

export function useEngine(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(autos));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); autoSubs.add(fn); fn(autos); return () => autoSubs.delete(fn); }, []);
  return snap;
}

export const getAutomations = () => autos.list;
export const getAutomation = (id) => autos.list.find(a => a.id === id);
export const engineStats = () => {
  const list = autos.list;
  const active = list.filter(a => a.active).length;
  const active_enr = enrollments.filter(e => e.status === 'active' || e.status === 'waiting').length;
  const completed = enrollments.filter(e => e.status === 'completed').length;
  const steps = list.reduce((s, a) => s + (a.steps || []).length, 0);
  return { total: list.length, active, steps, enrolled: enrollments.length, activeEnrollments: active_enr, completed };
};

export function newAutomationDraft() {
  return {
    id: null, name: '', description: '', active: false,
    trigger: { type: 'form_submit', config: { formName: 'Any form' } },
    steps: [{ id: newId('st'), type: 'create_contact', config: {} }],
  };
}

export function saveAutomation(rule) {
  const list = autos.list;
  const exists = rule.id && list.some(a => a.id === rule.id);
  const withIds = { ...rule, steps: (rule.steps || []).map(s => ({ ...s, id: s.id || newId('st') })) };
  let next;
  if (exists) {
    next = list.map(a => a.id === rule.id ? { ...a, ...withIds, updatedAt: new Date().toISOString() } : a);
  } else {
    const id = rule.id || newId('au');
    next = [{ createdAt: new Date().toISOString(), active: false, ...withIds, id }, ...list];
    rule = { ...rule, id };
  }
  commitAutos({ ...autos, list: next });
  return rule.id || next[0].id;
}
export function toggleAutomation(id) {
  commitAutos({ ...autos, list: autos.list.map(a => a.id === id ? { ...a, active: !a.active } : a) });
}
export function deleteAutomation(id) {
  commitAutos({ ...autos, list: autos.list.filter(a => a.id !== id) });
  // orphaned enrollments become read-only history; leave them for the log.
}
export function duplicateAutomation(id) {
  const src = getAutomation(id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = newId('au'); copy.name = `${src.name} (copy)`; copy.active = false;
  copy.steps = (copy.steps || []).map(s => ({ ...s, id: newId('st') }));
  copy.createdAt = new Date().toISOString();
  commitAutos({ ...autos, list: [copy, ...autos.list] });
  return copy.id;
}
export function addTemplate(tpl) {
  return saveAutomation({
    name: tpl.name, description: tpl.description,
    trigger: JSON.parse(JSON.stringify(tpl.trigger)),
    steps: (tpl.steps || []).map(s => ({ id: newId('st'), type: s.type, config: { ...(s.config || {}) } })),
    active: true, templateId: tpl.id,
  });
}

/* ============================================================
   ENROLLMENTS  (persisted, newest first, capped)
   ============================================================ */
let enrollments = loadEnroll();
const enrollSubs = new Set();
function loadEnroll() {
  try { const raw = localStorage.getItem(LS_ENROLL); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function commitEnroll(next) {
  enrollments = next.slice(0, ENROLL_CAP);
  try { localStorage.setItem(LS_ENROLL, JSON.stringify(enrollments)); } catch { /* ignore */ }
  enrollSubs.forEach(fn => fn(enrollments));
}
export function useEnrollments(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(enrollments));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); enrollSubs.add(fn); fn(enrollments); return () => enrollSubs.delete(fn); }, []);
  return snap;
}
export const getEnrollments = () => enrollments;
export const getEnrollmentsFor = (automationId) => enrollments.filter(e => e.automationId === automationId);
export const enrollmentPath = (en) => (en?.history || []);

function persistEnrollment(en) {
  const idx = enrollments.findIndex(e => e.id === en.id);
  const next = idx >= 0 ? enrollments.map(e => e.id === en.id ? en : e) : [en, ...enrollments];
  commitEnroll(next);
}

/* ============================================================
   STEP LOG  (append-only, capped, newest first)
   ============================================================ */
let logRows = loadLog();
const logSubs = new Set();
function loadLog() {
  try { const raw = localStorage.getItem(LS_LOG); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function commitLog(next) {
  logRows = next.slice(0, LOG_CAP);
  try { localStorage.setItem(LS_LOG, JSON.stringify(logRows)); } catch { /* ignore */ }
  logSubs.forEach(fn => fn(logRows));
}
export const getEngineLog = () => logRows;
export function clearEngineLog() { commitLog([]); }
export function useEngineLog(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(logRows));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); logSubs.add(fn); fn(logRows); return () => logSubs.delete(fn); }, []);
  return snap;
}
function log(en, stepType, status, detail) {
  const row = {
    id: newId('lg'), at: new Date().toISOString(),
    automationId: en.automationId, automationName: en.automationName,
    enrollmentId: en.id, entityLabel: entityLabel(en.entity),
    stepType, status, detail,
  };
  commitLog([row, ...logRows]);
}

/* ============================================================
   THE EXECUTOR
   advanceEnrollment walks the step list from the enrollment cursor,
   PERFORMING each step, until it hits a wait, a failed step, a
   branch exit, a goal, or the end. Fail-closed: an action that
   throws marks the enrollment failed and records why.
   ============================================================ */
let running = false; // re-entrancy guard so a store write inside a step cannot recurse

export function advanceEnrollment(enrollmentId) {
  const en = enrollments.find(e => e.id === enrollmentId);
  if (!en) return;
  const auto = getAutomation(en.automationId);
  const steps = (auto?.steps) || en.steps || [];
  if (en.status === 'completed' || en.status === 'failed') return;

  if (running) return;
  running = true;
  try {
    let guard = 0;
    while (en.cursor < steps.length && guard++ < 100) {
      const step = steps[en.cursor];
      const meta = stepMeta(step.type);
      let res;
      try {
        res = meta.run(en, step.config || {});
      } catch (err) {
        res = { ok: false, detail: `Step errored: ${err.message}` };
      }
      const at = new Date().toISOString();

      if (!res.ok) {
        en.history.push({ stepId: step.id, type: step.type, at, status: 'failed', detail: res.detail });
        en.status = 'failed';
        en.updatedAt = at;
        log(en, step.type, 'failed', res.detail);
        break;
      }

      // WAIT: pause here, resume on tick when due.
      if (res.wait && res.wait > 0) {
        en.history.push({ stepId: step.id, type: step.type, at, status: 'waiting', detail: res.detail });
        en.status = 'waiting';
        en.waitUntil = new Date(Date.now() + res.wait).toISOString();
        en.cursor += 1; // resume at the NEXT step after the wait
        en.updatedAt = at;
        log(en, step.type, 'waiting', res.detail);
        break;
      }

      // BRANCH: continue on pass, exit (complete) on fail.
      if (step.type === 'branch') {
        en.history.push({ stepId: step.id, type: step.type, at, status: res.branch ? 'passed' : 'exited', detail: res.detail });
        log(en, step.type, res.branch ? 'passed' : 'exited', res.detail);
        if (!res.branch) {
          en.status = 'completed';
          en.completedAt = at; en.updatedAt = at;
          break;
        }
        en.cursor += 1;
        continue;
      }

      // GOAL: complete immediately.
      if (res.goal) {
        en.history.push({ stepId: step.id, type: step.type, at, status: 'done', detail: res.detail });
        log(en, step.type, 'done', res.detail);
        en.status = 'completed'; en.goalReached = true;
        en.completedAt = at; en.updatedAt = at;
        break;
      }

      // ordinary action
      en.history.push({ stepId: step.id, type: step.type, at, status: 'done', detail: res.detail, to: res.to });
      log(en, step.type, 'done', res.detail);
      en.cursor += 1;
      en.status = 'active';
      en.updatedAt = at;
    }

    if (en.cursor >= steps.length && en.status !== 'failed' && en.status !== 'waiting') {
      en.status = 'completed';
      en.completedAt = en.completedAt || new Date().toISOString();
      en.updatedAt = new Date().toISOString();
    }
  } finally {
    running = false;
  }
  persistEnrollment(en);
  return en;
}

/* Create an enrollment for one entity and immediately advance it. */
export function enroll(automation, entity, context = {}) {
  const auto = typeof automation === 'string' ? getAutomation(automation) : automation;
  if (!auto) return null;
  const en = {
    id: newId('en'),
    automationId: auto.id, automationName: auto.name,
    entity, context: { ...context },
    status: 'active', cursor: 0,
    steps: JSON.parse(JSON.stringify(auto.steps || [])),
    history: [], waitUntil: null,
    enrolledAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  // seed a "enrolled" marker in the log so the path always has a head
  persistEnrollment(en);
  log(en, 'enroll', 'done', `Enrolled ${entityLabel(entity)}`);
  return advanceEnrollment(en.id);
}

/* Skip the current wait and resume now (Advance button in the UI). */
export function resumeEnrollment(enrollmentId) {
  const en = enrollments.find(e => e.id === enrollmentId);
  if (!en || en.status !== 'waiting') return en;
  en.status = 'active';
  en.waitUntil = null;
  persistEnrollment(en);
  return advanceEnrollment(en.id);
}

/* TICK: resume every waiting enrollment whose timer is due. Called on
   an interval by the client runtime and once per invocation by the
   server runner (api/automation-run.js). Returns how many resumed. */
export function tick(now = Date.now()) {
  let resumed = 0;
  const due = enrollments.filter(e => e.status === 'waiting' && e.waitUntil && new Date(e.waitUntil).getTime() <= now);
  for (const e of due) { e.status = 'active'; e.waitUntil = null; persistEnrollment(e); advanceEnrollment(e.id); resumed++; }
  return resumed;
}

/* ============================================================
   EVENT SURFACE
   The triggers that fire from real events. Each finds the active
   automations bound to that trigger and enrolls / advances.
   ============================================================ */
function activeByTrigger(type) { return autos.list.filter(a => a.active && a.trigger?.type === type); }

export function emitRecordCreated(object, record) {
  if (!record) return [];
  const out = [];
  for (const a of activeByTrigger('record_created')) {
    if ((a.trigger.config?.object || 'deal') !== object) continue;
    out.push(enroll(a, { type: object, id: record.id, label: labelFor(object, record) }, contextFor(object, record)));
  }
  return out.filter(Boolean);
}
export function emitRecordChanged(object, record, change = {}) {
  if (!record) return [];
  const out = [];
  for (const a of activeByTrigger('record_changed')) {
    const cfg = a.trigger.config || {};
    if ((cfg.object || 'deal') !== object) continue;
    if (cfg.stage && change.stage && change.stage !== cfg.stage) continue;
    out.push(enroll(a, { type: object, id: record.id, label: labelFor(object, record) }, { ...contextFor(object, record), ...change }));
  }
  return out.filter(Boolean);
}

/* Form submit: window 'rally:form-submit' -> enroll each matching automation.
   detail: { formName?, email, firstName?, lastName?, name?, ...fields } */
export function fireFormSubmit(detail = {}) {
  const out = [];
  for (const a of activeByTrigger('form_submit')) {
    const want = a.trigger.config?.formName;
    if (want && want !== 'Any form' && detail.formName && want !== detail.formName) continue;
    out.push(enroll(a, { type: 'lead', id: newId('lead'), label: detail.name || detail.email || 'New lead' }, { ...detail }));
  }
  return out.filter(Boolean);
}

/* Email open: window 'rally:email-open' -> flag matching live enrollments so a
   downstream branch can read email_opened, then resume any that are waiting.
   detail: { email?, contactId? } */
export function fireEmailOpen(detail = {}) {
  const email = (detail.email || '').toLowerCase();
  const touched = [];
  for (const e of enrollments) {
    if (e.status === 'completed' || e.status === 'failed') continue;
    const match = (detail.contactId && e.context?.contactId === detail.contactId) ||
      (email && (e.context?.email || '').toLowerCase() === email);
    if (!match) continue;
    e.context = { ...e.context, email_opened: true };
    e.history.push({ type: 'email_open', status: 'event', at: new Date().toISOString(), detail: 'Recipient opened the email' });
    persistEnrollment(e);
    log(e, 'email_open', 'event', 'Recipient opened the email');
    touched.push(e.id);
    if (e.status === 'waiting') resumeEnrollment(e.id);
  }
  // Also start any automations that trigger ON email open.
  for (const a of activeByTrigger('email_open')) {
    const c = detail.contactId ? getContact(detail.contactId) : getContacts().find(x => (x.email || '').toLowerCase() === email);
    if (c) enroll(a, { type: 'contact', id: c.id, label: `${c.firstName} ${c.lastName}`.trim() }, { ...contextFor('contact', c), email_opened: true });
  }
  return touched;
}

/* Payment: window 'rally:payment' -> enroll payment automations + flag live
   enrollments. detail: { email?, contactId?, amount } */
export function firePayment(detail = {}) {
  const email = (detail.email || '').toLowerCase();
  const amount = Number(detail.amount) || 0;
  for (const e of enrollments) {
    if (e.status === 'completed' || e.status === 'failed') continue;
    const match = (detail.contactId && e.context?.contactId === detail.contactId) ||
      (email && (e.context?.email || '').toLowerCase() === email);
    if (!match) continue;
    e.context = { ...e.context, payment_received: true, payment_amount: amount };
    e.history.push({ type: 'payment', status: 'event', at: new Date().toISOString(), detail: `Payment received: ${money(amount)}` });
    persistEnrollment(e);
    log(e, 'payment', 'event', `Payment received: ${money(amount)}`);
    if (e.status === 'waiting') resumeEnrollment(e.id);
  }
  const out = [];
  for (const a of activeByTrigger('payment_received')) {
    if (amount < Number(a.trigger.config?.minAmount || 0)) continue;
    const c = detail.contactId ? getContact(detail.contactId) : getContacts().find(x => (x.email || '').toLowerCase() === email);
    const entity = c ? { type: 'contact', id: c.id, label: `${c.firstName} ${c.lastName}`.trim() }
      : { type: 'lead', id: newId('lead'), label: detail.email || 'Payer' };
    out.push(enroll(a, entity, { email: detail.email || (c?.email || ''), payment_received: true, payment_amount: amount, contactId: c?.id || null }));
  }
  return out.filter(Boolean);
}

/* Inbound webhook (server relays; client can also drive it in the demo). */
export function fireWebhook(detail = {}) {
  const out = [];
  for (const a of activeByTrigger('webhook')) {
    out.push(enroll(a, { type: 'lead', id: newId('lead'), label: detail.name || detail.email || 'Webhook payload' }, { ...detail }));
  }
  return out.filter(Boolean);
}

function labelFor(object, r) {
  if (object === 'deal') return r.name;
  if (object === 'contact') return `${r.firstName} ${r.lastName}`.trim();
  if (object === 'company') return r.name;
  return r.id;
}
function contextFor(object, r) {
  if (object === 'deal') return { dealId: r.id, companyId: r.companyId, value: r.value, stage: r.stage, status: r.status, owner: userName(r.ownerId) };
  if (object === 'contact') return { contactId: r.id, companyId: r.companyId, email: r.email, firstName: r.firstName, lastName: r.lastName, title: r.title };
  if (object === 'company') return { companyId: r.id, name: r.name };
  return {};
}

/* ============================================================
   TEST RUNNER  -  enroll a real (or synthetic) record now and run
   the automation end to end, so the builder's Run test button
   produces an observable enrollment with a full path.
   ============================================================ */
export function testAutomation(id, overrides = {}) {
  const a = getAutomation(id);
  if (!a) return { ok: false, note: 'Automation not found' };
  const t = TRIGGERS[a.trigger?.type];
  const sample = t?.sample ? t.sample(a.trigger?.config || {}) : null;

  if (sample && sample.__synthetic) {
    const en = enroll(a, { type: 'lead', id: newId('lead'), label: sample.name || sample.email || 'Test lead' }, { ...sample, ...overrides });
    return { ok: !!en, enrollment: en, note: en ? null : 'Could not enroll' };
  }
  if (!sample) return { ok: false, note: 'No live record to test against yet' };
  const object = t.object;
  const en = enroll(a, { type: object, id: sample.id, label: labelFor(object, sample) }, { ...contextFor(object, sample), ...overrides });
  return { ok: !!en, enrollment: en, note: en ? null : 'Could not enroll' };
}

/* ============================================================
   CLIENT RUNTIME (hook)
   Mount once on the Workflows page. It:
   1) diffs the deal + contact snapshot to fire record_created /
      record_changed automations for real,
   2) listens for the form-submit / email-open / payment windows,
   3) ticks every few seconds so waits resume on their own.
   The re-entrancy guard prevents action-driven store writes from
   looping. onActivity(kind) lets the UI pulse when something fires.
   ============================================================ */
export function useEngineRuntime(onActivity) {
  const deals = useStore(s => s.deals);
  const contacts = useStore(s => s.contacts);
  const prev = useRef(null);
  const cb = useRef(onActivity);
  cb.current = onActivity;

  // record watcher
  useEffect(() => {
    const snap = {
      dealIds: new Set(deals.map(d => d.id)),
      dealStage: new Map(deals.map(d => [d.id, d.stage])),
      contactIds: new Set(contacts.map(c => c.id)),
    };
    if (prev.current) {
      let fired = [];
      for (const d of deals) if (!prev.current.dealIds.has(d.id)) fired = fired.concat(emitRecordCreated('deal', d));
      for (const c of contacts) if (!prev.current.contactIds.has(c.id)) fired = fired.concat(emitRecordCreated('contact', c));
      for (const d of deals) {
        const old = prev.current.dealStage.get(d.id);
        if (old && old !== d.stage) fired = fired.concat(emitRecordChanged('deal', d, { stage: d.stage, from: old }));
      }
      if (fired.length && cb.current) cb.current('record');
    }
    prev.current = snap;
  }, [deals, contacts]);

  // window event listeners
  useEffect(() => {
    const onForm = (e) => { const r = fireFormSubmit(e.detail || {}); if (r.length && cb.current) cb.current('form'); };
    const onOpen = (e) => { const r = fireEmailOpen(e.detail || {}); if (r.length && cb.current) cb.current('email'); };
    const onPay = (e) => { const r = firePayment(e.detail || {}); if (r.length && cb.current) cb.current('payment'); };
    const onHook = (e) => { const r = fireWebhook(e.detail || {}); if (r.length && cb.current) cb.current('webhook'); };
    window.addEventListener('rally:form-submit', onForm);
    window.addEventListener('rally:email-open', onOpen);
    window.addEventListener('rally:payment', onPay);
    window.addEventListener('rally:webhook', onHook);
    return () => {
      window.removeEventListener('rally:form-submit', onForm);
      window.removeEventListener('rally:email-open', onOpen);
      window.removeEventListener('rally:payment', onPay);
      window.removeEventListener('rally:webhook', onHook);
    };
  }, []);

  // tick loop
  useEffect(() => {
    const iv = setInterval(() => { const n = tick(); if (n && cb.current) cb.current('tick'); }, 4000);
    return () => clearInterval(iv);
  }, []);
}

/* ============================================================
   ENGINE TEMPLATES  (one-click starting points for the builder)
   The first one is the canonical acceptance scenario:
   form submit -> create contact -> wait -> send email ->
   if opened, create task.
   ============================================================ */
export const ENGINE_TEMPLATES = [
  {
    id: 'etpl_inbound_nurture', icon: 'list', tone: 'accent',
    name: 'Inbound form to first touch',
    description: 'A form submit creates the contact, waits a beat, sends a welcome email, and tasks the rep only if the lead opens it.',
    trigger: { type: 'form_submit', config: { formName: 'Any form' } },
    steps: [
      { type: 'create_contact', config: {} },
      { type: 'wait', config: { amount: 1, unit: 'minutes' } },
      { type: 'send_email', config: { subject: 'Thanks for reaching out', body: 'Hi {firstName},\n\nThanks for getting in touch. A specialist will follow up shortly.' } },
      { type: 'branch', config: { field: 'email_opened', op: 'is_true' } },
      { type: 'create_task', config: { subject: 'Call the engaged lead - they opened our email', dueDays: 0 } },
    ],
  },
  {
    id: 'etpl_won_onboarding', icon: 'target', tone: 'ok',
    name: 'Won deal kicks off onboarding',
    description: 'When a deal moves to Closed Won, log the win, create the kickoff task, and let Rook draft the welcome note.',
    trigger: { type: 'record_changed', config: { object: 'deal', stage: 'won' } },
    steps: [
      { type: 'create_activity', config: { activityType: 'note', subject: 'Deal won - onboarding started' } },
      { type: 'create_task', config: { subject: 'Schedule onboarding kickoff', dueDays: 1 } },
      { type: 'ai_step', config: { instruction: 'Draft a warm onboarding welcome email for this new customer.' } },
      { type: 'goal', config: { label: 'Onboarding launched' } },
    ],
  },
  {
    id: 'etpl_new_deal_research', icon: 'plus', tone: 'accent',
    name: 'Research every new deal',
    description: 'Every new deal gets a research task and a webhook so your data warehouse stays in sync.',
    trigger: { type: 'record_created', config: { object: 'deal' } },
    steps: [
      { type: 'create_task', config: { subject: 'Research account + map the buying committee', dueDays: 1 } },
      { type: 'webhook', config: { url: '', message: 'New deal created' } },
    ],
  },
  {
    id: 'etpl_payment_thanks', icon: 'dollar', tone: 'info',
    name: 'Payment received thank-you',
    description: 'When a payment lands, send a receipt-style thank-you and log it on the timeline.',
    trigger: { type: 'payment_received', config: { minAmount: 0 } },
    steps: [
      { type: 'send_email', config: { subject: 'Thank you for your payment', body: 'Hi {firstName},\n\nWe received your payment. Thank you for your business.' } },
      { type: 'create_activity', config: { activityType: 'note', subject: 'Payment received - receipt sent' } },
    ],
  },
];
export const templateById = (id) => ENGINE_TEMPLATES.find(t => t.id === id);

/* ============================================================
   SEED  -  a small, believable starting library so the builder and
   the canvas are alive on first paint. Deterministic (no random).
   ============================================================ */
function iso(daysFromNow) { return new Date(Date.now() + daysFromNow * 86400000).toISOString(); }
function buildSeed() {
  const list = [
    {
      id: 'au_inbound_nurture',
      name: 'Inbound form to first touch',
      description: 'Form submit creates the contact, waits, sends a welcome email, and tasks the rep if they open it.',
      active: true, createdAt: iso(-12),
      trigger: { type: 'form_submit', config: { formName: 'Any form' } },
      steps: [
        { id: 'st_ib1', type: 'create_contact', config: {} },
        { id: 'st_ib2', type: 'wait', config: { amount: 1, unit: 'minutes' } },
        { id: 'st_ib3', type: 'send_email', config: { subject: 'Thanks for reaching out', body: 'Hi {firstName},\n\nThanks for getting in touch. A specialist will follow up shortly.' } },
        { id: 'st_ib4', type: 'branch', config: { field: 'email_opened', op: 'is_true' } },
        { id: 'st_ib5', type: 'create_task', config: { subject: 'Call the engaged lead - they opened our email', dueDays: 0 } },
      ],
    },
    {
      id: 'au_won_onboarding',
      name: 'Won deal kicks off onboarding',
      description: 'A deal reaching Closed Won logs the win and creates the kickoff task.',
      active: true, createdAt: iso(-30),
      trigger: { type: 'record_changed', config: { object: 'deal', stage: 'won' } },
      steps: [
        { id: 'st_wo1', type: 'create_activity', config: { activityType: 'note', subject: 'Deal won - onboarding started' } },
        { id: 'st_wo2', type: 'create_task', config: { subject: 'Schedule onboarding kickoff', dueDays: 1 } },
        { id: 'st_wo3', type: 'goal', config: { label: 'Onboarding launched' } },
      ],
    },
    {
      id: 'au_new_deal_research',
      name: 'Research every new deal',
      description: 'Every brand-new deal gets an owner research task within a day.',
      active: false, createdAt: iso(-20),
      trigger: { type: 'record_created', config: { object: 'deal' } },
      steps: [
        { id: 'st_nd1', type: 'create_task', config: { subject: 'Research account + map the buying committee', dueDays: 1 } },
      ],
    },
  ];
  return { list, seededAt: iso(0) };
}
