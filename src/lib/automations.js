// ============================================================
// RALLY AUTOMATION ENGINE  (spec Section 5.6 - Wave 5)
// A REAL, executable automation runtime. Not a mock: when a
// trigger fires, matching active automations check their
// conditions and PERFORM their actions against the live store -
// creating tasks (createActivity), spinning up onboarding
// projects (store-depth createProject + addTask), setting deal
// fields (updateDeal), moving stages (moveDealStage), logging
// activities, and drafting emails (stub).
//
// Definition shape:
//   { id, name, description, active,
//     trigger: { type, config },
//     conditions: [{ field, op, value }],
//     actions:   [{ type, config }],
//     runs, lastRun }
//
// Persisted to localStorage (rally_automations_v1). A run log of
// the last 200 executions is persisted separately
// (rally_automation_runlog_v1). Pub/sub mirrors store.js so the
// UI reacts the instant an automation fires.
// SUPABASE: rally_automations + rally_automation_runs (append-only).
// ============================================================
import { useEffect, useRef, useState } from 'react';
import {
  getDeals, getDeal, getCompany, getContacts, getActivities,
  userName, stageById, STAGES,
  createActivity, updateDeal, moveDealStage, useStore,
} from './store.js';
import { createProject, addTask } from './store-depth.js';

const LS_RULES = 'rally_automations_v1';
const LS_LOG = 'rally_automation_runlog_v1';
const LOG_CAP = 200;

/* ============================================================
   VOCABULARY - the building blocks the visual builder exposes.
   Each trigger knows how to pull candidate records from the
   live store (used by the simulator + the test runner).
   ============================================================ */
export const TRIGGERS = {
  deal_stage_changed: {
    type: 'deal_stage_changed', label: 'Deal stage changes', object: 'deal', icon: 'deals',
    title: 'When a deal changes stage', sub: 'Fires each time a deal moves in the pipeline',
    candidates: (cfg) => getDeals().filter(d => !cfg?.stage || d.stage === cfg.stage),
  },
  deal_created: {
    type: 'deal_created', label: 'Deal is created', object: 'deal', icon: 'plus',
    title: 'When a deal is created', sub: 'Fires on every brand-new opportunity',
    candidates: () => getDeals(),
  },
  deal_value_over: {
    type: 'deal_value_over', label: 'High-value deal created', object: 'deal', icon: 'dollar',
    title: 'When a high-value deal lands', sub: 'Fires when a new deal clears the amount you set',
    candidates: (cfg) => getDeals().filter(d => d.status === 'open' && Number(d.value) > Number(cfg?.amount || 0)),
  },
  activity_overdue: {
    type: 'activity_overdue', label: 'Activity becomes overdue', object: 'activity', icon: 'clock',
    title: 'When an activity goes overdue', sub: 'Checked continuously against due dates',
    candidates: () => getActivities().filter(a => !a.done && a.dueAt && new Date(a.dueAt).getTime() < Date.now()),
  },
  contact_created: {
    type: 'contact_created', label: 'Contact is created', object: 'contact', icon: 'users',
    title: 'When a contact is created', sub: 'Fires on new people entering the CRM',
    candidates: () => getContacts(),
  },
};
export const TRIGGER_LIST = Object.values(TRIGGERS);

/* FIELD accessors per object - used by conditions. */
const DEAL_FIELDS = {
  value: { label: 'Deal value', type: 'number', get: (d) => d.value },
  stage: { label: 'Stage', type: 'stage', get: (d) => d.stage },
  probability: { label: 'Probability', type: 'number', get: (d) => d.probability },
  status: { label: 'Status', type: 'text', get: (d) => d.status },
  owner: { label: 'Owner', type: 'owner', get: (d) => d.ownerId },
};
const CONTACT_FIELDS = {
  title: { label: 'Job title', type: 'text', get: (c) => c.title },
  owner: { label: 'Owner', type: 'owner', get: (c) => c.ownerId },
  tagcount: { label: 'Tag count', type: 'number', get: (c) => (c.tags || []).length },
};
const ACTIVITY_FIELDS = {
  type: { label: 'Activity type', type: 'text', get: (a) => a.type },
  owner: { label: 'Owner', type: 'owner', get: (a) => a.ownerId },
};
export const FIELDS_BY_OBJECT = { deal: DEAL_FIELDS, contact: CONTACT_FIELDS, activity: ACTIVITY_FIELDS };

export const OPERATORS = {
  gt: { id: 'gt', label: 'is greater than', types: ['number'] },
  lt: { id: 'lt', label: 'is less than', types: ['number'] },
  eq: { id: 'eq', label: 'is equal to', types: ['number', 'text', 'stage', 'owner'] },
  neq: { id: 'neq', label: 'is not', types: ['number', 'text', 'stage', 'owner'] },
  set: { id: 'set', label: 'is set', types: ['text', 'stage', 'owner'] },
};

/* ACTIONS - each carries an execute() that PERFORMS the work
   against the live store and returns a run-log line. `record` is
   the subject (deal/contact/activity); `object` is its type. */
const dueInDays = (n) => new Date(Date.now() + (Number(n) || 0) * 86400000).toISOString();

/* ---------- outbound integration helpers ----------
   Workflow actions can reach OTHER systems (Slack, Teams, any webhook).
   The browser cannot POST to those endpoints directly (CORS), so we fire
   through the same-origin `/api/outbound` proxy which forwards server-side.
   Fire-and-forget: the runtime stays synchronous and the action logs that
   the call was dispatched. */
function recToPayload(record, object) {
  const co = record.companyId ? getCompany(record.companyId) : null;
  if (object === 'deal') return {
    object, id: record.id, name: record.name, value: record.value,
    stage: stageById(record.stage)?.name || record.stage, status: record.status,
    owner: userName(record.ownerId), company: co?.name || record.companyName || null,
  };
  if (object === 'contact') return {
    object, id: record.id, name: `${record.firstName || ''} ${record.lastName || ''}`.trim(),
    title: record.title, owner: userName(record.ownerId), company: co?.name || null,
  };
  return { object, id: record.id, subject: record.subject, owner: userName(record.ownerId), company: co?.name || null };
}
function interp(tpl, p) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? String(p[k]) : ''));
}
function fireOutbound(kind, url, message, payload) {
  try {
    if (typeof fetch !== 'function') return;
    fetch('/api/outbound', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ kind, url, message, payload }),
    }).catch(() => {});
  } catch {}
}

export const ACTIONS = {
  create_task: {
    id: 'create_task', label: 'Create a task', icon: 'checkSquare', tone: 'ok', minutes: 4,
    execute: (record, cfg, object) => {
      const r = createActivity({
        type: 'task', subject: cfg.subject || 'Follow up',
        dueAt: dueInDays(cfg.dueDays ?? 1), done: false,
        relatedType: object, relatedId: record.id,
        companyId: record.companyId || null, ownerId: record.ownerId,
      });
      if (r.error) return { type: 'create_task', ok: false, label: `Could not create task: ${r.message}` };
      return { type: 'create_task', ok: true, label: `Created task "${r.activity.subject}"`, recordId: r.activity.id, to: '/app/activities' };
    },
  },
  create_onboarding_project: {
    id: 'create_onboarding_project', label: 'Create onboarding project', icon: 'target', tone: 'accent', minutes: 30,
    execute: (record, cfg, object) => {
      const co = record.companyId ? getCompany(record.companyId) : null;
      const base = co?.name || record.name || 'New customer';
      const r = createProject({ name: `${base} onboarding`, companyId: record.companyId || null, ownerId: record.ownerId });
      if (r.error) return { type: 'create_onboarding_project', ok: false, label: `Could not create project: ${r.message}` };
      const seedTasks = cfg.tasks && cfg.tasks.length ? cfg.tasks : ['Kickoff call', 'Provision seats', 'Import historical data', 'Schedule success review'];
      let made = 0;
      for (const title of seedTasks) { const t = addTask(r.project.id, { title, assigneeId: record.ownerId }); if (t.ok) made++; }
      return { type: 'create_onboarding_project', ok: true, label: `Spun up "${r.project.name}" with ${made} tasks`, recordId: r.project.id, to: '/app/projects' };
    },
  },
  log_activity: {
    id: 'log_activity', label: 'Log an activity', icon: 'activity', tone: 'ok', minutes: 2,
    execute: (record, cfg, object) => {
      const r = createActivity({
        type: 'note', subject: cfg.subject || 'Automation note', done: true,
        relatedType: object, relatedId: record.id,
        companyId: record.companyId || null, ownerId: record.ownerId,
      });
      if (r.error) return { type: 'log_activity', ok: false, label: `Could not log activity: ${r.message}` };
      return { type: 'log_activity', ok: true, label: `Logged "${r.activity.subject}"`, recordId: r.activity.id, to: '/app/activities' };
    },
  },
  set_field: {
    id: 'set_field', label: 'Set a deal field', icon: 'sliders', tone: 'info', minutes: 1,
    execute: (record, cfg, object) => {
      if (object !== 'deal') return { type: 'set_field', ok: false, label: 'Set field only applies to deals' };
      const field = cfg.field || 'probability';
      const value = field === 'probability' || field === 'value' ? Number(cfg.value) : cfg.value;
      const r = updateDeal(record.id, { [field]: value });
      if (r.error) return { type: 'set_field', ok: false, label: `Could not set field: ${r.message}` };
      const f = DEAL_FIELDS[field];
      return { type: 'set_field', ok: true, label: `Set ${f?.label || field} to ${value}`, recordId: record.id, to: `/app/deals/${record.id}` };
    },
  },
  move_stage: {
    id: 'move_stage', label: 'Move deal stage', icon: 'deals', tone: 'accent', minutes: 2,
    execute: (record, cfg, object) => {
      if (object !== 'deal') return { type: 'move_stage', ok: false, label: 'Move stage only applies to deals' };
      const r = moveDealStage(record.id, cfg.to || 'qualified', { silent: false });
      if (r.error) return { type: 'move_stage', ok: false, label: `Could not move stage: ${r.message}` };
      return { type: 'move_stage', ok: true, label: `Moved to ${stageById(cfg.to)?.name || cfg.to}`, recordId: record.id, to: `/app/deals/${record.id}` };
    },
  },
  send_email: {
    id: 'send_email', label: 'Draft an email', icon: 'mail', tone: 'info', minutes: 6,
    execute: (record, cfg, object) => {
      // Stub: no real send. We persist a DRAFT email activity for the rep to review.
      const subject = cfg.subject || `Email: ${cfg.template || 'Follow-up'}`;
      const r = createActivity({
        type: 'email', subject, body: '(Drafted by automation - review before sending. Send is stubbed in the demo.)',
        done: false, relatedType: object, relatedId: record.id,
        companyId: record.companyId || null, ownerId: record.ownerId,
      });
      if (r.error) return { type: 'send_email', ok: false, label: `Could not draft email: ${r.message}` };
      return { type: 'send_email', ok: true, stub: true, label: `Drafted email "${subject}"`, recordId: r.activity.id, to: '/app/activities' };
    },
  },
  notify_owner: {
    id: 'notify_owner', label: 'Notify the owner', icon: 'bell', tone: 'accent', minutes: 1,
    execute: (record, cfg, object) => {
      const who = cfg.who || userName(record.ownerId);
      const r = createActivity({
        type: 'note', subject: `Notified ${who}`, done: true,
        relatedType: object, relatedId: record.id,
        companyId: record.companyId || null, ownerId: record.ownerId,
      });
      if (r.error) return { type: 'notify_owner', ok: false, label: `Could not notify: ${r.message}` };
      return { type: 'notify_owner', ok: true, label: `Notified ${who}`, recordId: r.activity.id, to: '/app/activities' };
    },
  },

  /* ----- integrations: reach other systems ----- */
  send_slack: {
    id: 'send_slack', label: 'Post to Slack', icon: 'bell', tone: 'accent', minutes: 1, integration: true,
    execute: (record, cfg, object) => {
      const p = recToPayload(record, object);
      const msg = interp(cfg.message || 'Rally: {name} ({owner})', p);
      if (!cfg.webhook) return { type: 'send_slack', ok: false, stub: true, label: 'Add a Slack Incoming Webhook URL to post for real' };
      fireOutbound('slack', cfg.webhook, msg, p);
      return { type: 'send_slack', ok: true, label: `Posted to Slack: "${msg.slice(0, 64)}"` };
    },
  },
  send_teams: {
    id: 'send_teams', label: 'Post to Microsoft Teams', icon: 'activity', tone: 'accent', minutes: 1, integration: true,
    execute: (record, cfg, object) => {
      const p = recToPayload(record, object);
      const msg = interp(cfg.message || 'Rally: {name} ({owner})', p);
      if (!cfg.webhook) return { type: 'send_teams', ok: false, stub: true, label: 'Add a Teams Incoming Webhook URL to post for real' };
      fireOutbound('teams', cfg.webhook, msg, p);
      return { type: 'send_teams', ok: true, label: `Posted to Teams: "${msg.slice(0, 64)}"` };
    },
  },
  post_webhook: {
    id: 'post_webhook', label: 'Send a webhook', icon: 'plug', tone: 'info', minutes: 1, integration: true,
    execute: (record, cfg, object) => {
      const p = recToPayload(record, object);
      if (!cfg.url) return { type: 'post_webhook', ok: false, stub: true, label: 'Add a webhook URL (Zapier, Make, or your endpoint)' };
      fireOutbound('webhook', cfg.url, interp(cfg.message || '', p), p);
      let host = cfg.url; try { host = new URL(cfg.url).host; } catch {}
      return { type: 'post_webhook', ok: true, label: `Sent ${object} to ${host}` };
    },
  },
  sync_record: {
    id: 'sync_record', label: 'Sync to another system', icon: 'plug', tone: 'info', minutes: 2, integration: true,
    execute: (record, cfg, object) => {
      // A real two-way sync needs an OAuth connection; in the demo it is queued.
      const target = cfg.target || 'HubSpot';
      return { type: 'sync_record', ok: true, stub: true, label: `Queued sync of ${object} to ${target}` };
    },
  },
  enrich_contact: {
    id: 'enrich_contact', label: 'Enrich from a data provider', icon: 'sparkles', tone: 'accent', minutes: 2, integration: true,
    execute: (record, cfg, object) => {
      const provider = cfg.provider || 'Clearbit';
      return { type: 'enrich_contact', ok: true, stub: true, label: `Requested enrichment from ${provider}` };
    },
  },
};
export const ACTION_LIST = Object.values(ACTIONS);

/* ============================================================
   SUMMARIES - human-readable renderers for the builder + flow.
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
  if (a.trigger.type === 'deal_value_over') return `New deal over ${money(cfg.amount)}`;
  if (a.trigger.type === 'deal_stage_changed' && cfg.stage) return `Deal moves to ${stageById(cfg.stage)?.name || cfg.stage}`;
  return t.label;
}
export function conditionSummaries(a) {
  const t = TRIGGERS[a.trigger?.type];
  const fields = FIELDS_BY_OBJECT[t?.object] || {};
  return (a.conditions || []).map(c => {
    const f = fields[c.field];
    const op = OPERATORS[c.op];
    const val = f?.type === 'stage' ? (stageById(c.value)?.name || c.value)
      : f?.type === 'owner' ? userName(c.value) : c.value;
    return `${f?.label || c.field} ${op?.label || c.op}${c.op === 'set' ? '' : ' ' + val}`;
  });
}
export function actionSummary(act) {
  const meta = ACTIONS[act.type];
  const cfg = act.config || {};
  if (act.type === 'create_task') return `Create task "${cfg.subject || 'Follow up'}"${cfg.dueDays != null ? ` (due +${cfg.dueDays}d)` : ''}`;
  if (act.type === 'create_onboarding_project') return 'Create onboarding project + kickoff tasks';
  if (act.type === 'log_activity') return `Log activity "${cfg.subject || 'Note'}"`;
  if (act.type === 'set_field') return `Set ${DEAL_FIELDS[cfg.field || 'probability']?.label || cfg.field} to ${cfg.value}`;
  if (act.type === 'move_stage') return `Move to ${stageById(cfg.to)?.name || cfg.to || 'next stage'}`;
  if (act.type === 'send_email') return `Draft email${cfg.template ? ` "${cfg.template}"` : ''}`;
  if (act.type === 'notify_owner') return `Notify ${cfg.who || 'the deal owner'}`;
  if (act.type === 'send_slack') return `Post to Slack${cfg.webhook ? '' : ' (add webhook)'}`;
  if (act.type === 'send_teams') return `Post to Microsoft Teams${cfg.webhook ? '' : ' (add webhook)'}`;
  if (act.type === 'post_webhook') return `Send a webhook${cfg.url ? '' : ' (add URL)'}`;
  if (act.type === 'sync_record') return `Sync to ${cfg.target || 'another system'}`;
  if (act.type === 'enrich_contact') return `Enrich from ${cfg.provider || 'a data provider'}`;
  return meta?.label || act.type;
}
export const minutesPerRun = (a) => (a.actions || []).reduce((s, x) => s + (ACTIONS[x.type]?.minutes || 2), 0);
export function recordLabel(rec, object) {
  if (object === 'deal') return rec.name;
  if (object === 'contact') return `${rec.firstName} ${rec.lastName}`.trim();
  if (object === 'activity') return rec.subject;
  return rec.id;
}

/* ============================================================
   CONDITION EVALUATION
   ============================================================ */
function compare(op, actual, expected, type) {
  if (op === 'set') return actual != null && actual !== '';
  if (type === 'number') {
    const x = Number(actual), y = Number(expected);
    if (op === 'gt') return x > y;
    if (op === 'lt') return x < y;
    if (op === 'eq') return x === y;
    if (op === 'neq') return x !== y;
  }
  const x = String(actual ?? '').toLowerCase();
  const y = String(expected ?? '').toLowerCase();
  if (op === 'eq') return x === y;
  if (op === 'neq') return x !== y;
  return false;
}
function passesConditions(a, record) {
  const t = TRIGGERS[a.trigger?.type];
  const fields = FIELDS_BY_OBJECT[t?.object] || {};
  return (a.conditions || []).every(c => {
    const f = fields[c.field];
    if (!f) return true;
    return compare(c.op, f.get(record), c.value, f.type);
  });
}

/* Simulate: which live records match this automation right now.
   Read-only - performs nothing. Used for live preview counts. */
export function evaluateAutomation(a) {
  const t = TRIGGERS[a.trigger?.type];
  if (!t) return { matched: [], total: 0, object: 'record' };
  const pool = t.candidates(a.trigger?.config || {}) || [];
  const matched = pool.filter(r => passesConditions(a, r));
  return { matched, total: pool.length, object: t.object };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (rules)
   ============================================================ */
let state = loadRules();
const subs = new Set();
function loadRules() {
  try { const raw = localStorage.getItem(LS_RULES); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_RULES, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_RULES, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetAutomations() { try { localStorage.removeItem(LS_RULES); } catch {} state = loadRules(); subs.forEach(fn => fn(state)); }

export function useAutomations(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `au_${(idc++).toString(36)}`;

export const getAutomations = () => state.rules;
export const getAutomation = (id) => state.rules.find(r => r.id === id);
export const runsTotal = () => state.rules.reduce((s, r) => s + (r.runs || 0), 0);

/* ---------- rule CRUD ---------- */
export function toggleAutomation(id) {
  commit({ ...state, rules: state.rules.map(r => r.id === id ? { ...r, active: !r.active } : r) });
}
export function saveAutomation(rule) {
  const exists = state.rules.some(r => r.id === rule.id);
  let rules;
  const id = rule.id || newId();
  if (exists) rules = state.rules.map(r => r.id === rule.id ? { ...r, ...rule } : r);
  else rules = [{ runs: 0, lastRun: null, active: true, ...rule, id }, ...state.rules];
  commit({ ...state, rules });
  return id;
}
export function deleteAutomation(id) {
  commit({ ...state, rules: state.rules.filter(r => r.id !== id) });
}
export function duplicateAutomation(id) {
  const src = state.rules.find(r => r.id === id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = newId(); copy.name = `${src.name} (copy)`; copy.active = false; copy.runs = 0; copy.lastRun = null;
  commit({ ...state, rules: [copy, ...state.rules] });
  return copy.id;
}
export function addTemplate(tpl) {
  const rule = {
    id: newId(), name: tpl.name, description: tpl.description,
    trigger: { type: tpl.trigger.type, config: { ...(tpl.trigger.config || {}) } },
    conditions: (tpl.conditions || []).map(c => ({ ...c })),
    actions: (tpl.actions || []).map(a => ({ type: a.type, config: { ...(a.config || {}) } })),
    active: true, runs: 0, lastRun: null,
  };
  commit({ ...state, rules: [rule, ...state.rules] });
  return rule.id;
}
function bumpRun(id) {
  commit({ ...state, rules: state.rules.map(r => r.id === id ? { ...r, runs: (r.runs || 0) + 1, lastRun: new Date().toISOString() } : r) });
}

/* ============================================================
   RUN LOG  (persisted, cap 200, newest first)
   ============================================================ */
let logState = loadLog();
const logSubs = new Set();
function loadLog() {
  try { const raw = localStorage.getItem(LS_LOG); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function commitLog(next) {
  logState = next.slice(0, LOG_CAP);
  try { localStorage.setItem(LS_LOG, JSON.stringify(logState)); } catch {}
  logSubs.forEach(fn => fn(logState));
}
export function getRunLog() { return logState; }
export function clearRunLog() { commitLog([]); }
export function useRunLog(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(logState));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); logSubs.add(fn); fn(logState); return () => logSubs.delete(fn); }, []);
  return snap;
}
function appendLog(entry) {
  const row = { id: `rl_${(idc++).toString(36)}`, at: new Date().toISOString(), ...entry };
  commitLog([row, ...logState]);
  return row;
}

/* ============================================================
   THE RUNTIME - runTrigger PERFORMS the actions for real.
   ============================================================ */
let firing = false; // re-entrancy guard (an action that moves a stage must not recurse forever)

function subjectFromContext(type, ctx) {
  const object = TRIGGERS[type]?.object || 'deal';
  if (object === 'deal') return { record: ctx.deal || (ctx.dealId ? getDeal(ctx.dealId) : null), object };
  return { record: ctx.record || null, object };
}
function triggerMatches(a, type, ctx, record) {
  const cfg = a.trigger?.config || {};
  if (type === 'deal_stage_changed') return !cfg.stage || cfg.stage === ctx.to;
  if (type === 'deal_value_over') return record && Number(record.value) > Number(cfg.amount || 0);
  return true;
}

/* Run every active automation bound to `type` against `context`.
   context: deal_stage_changed -> { dealId|deal, from, to }
            deal_created        -> { deal }
   Returns [{ automation, subject, actionsRun }] for the ones that fired. */
export function runTrigger(type, context = {}) {
  if (firing) return [];
  firing = true;
  const fired = [];
  try {
    const { record, object } = subjectFromContext(type, context);
    if (!record) return fired;
    const autos = state.rules.filter(a => a.active && a.trigger?.type === type);
    for (const a of autos) {
      if (!triggerMatches(a, type, context, record)) continue;
      if (!passesConditions(a, record)) continue;
      const actionsRun = (a.actions || []).map(act => {
        const meta = ACTIONS[act.type];
        if (!meta) return { type: act.type, ok: false, label: `Unknown action ${act.type}` };
        try { return meta.execute(record, act.config || {}, object); }
        catch (err) { return { type: act.type, ok: false, label: `Action errored: ${err.message}` }; }
      });
      bumpRun(a.id);
      appendLog({
        automationId: a.id, automationName: a.name, trigger: type,
        subjectLabel: recordLabel(record, object), subjectId: record.id,
        actionsRun, result: actionsRun.every(r => r.ok) ? 'fired' : 'partial',
      });
      fired.push({ automation: a, subject: record, actionsRun });
    }
  } finally { firing = false; }
  return fired;
}

/* Convenience emitters - call these from store writers (or the
   watcher below) when a real event happens. */
export function emitDealStageChanged(dealId, from, to) { return runTrigger('deal_stage_changed', { dealId, from, to }); }
export function emitDealCreated(deal) { return runTrigger('deal_created', { deal, dealId: deal?.id }); }

/* TEST RUNNER - the "Run test" button. Picks a real matching
   record (or the best candidate) and EXECUTES the automation
   live, creating real records + appending to the run log.
   Returns { ok, subject, object, actionsRun, note } or { ok:false }. */
export function testAutomation(id) {
  const a = getAutomation(id);
  if (!a) return { ok: false, note: 'Automation not found' };
  const t = TRIGGERS[a.trigger?.type];
  const pool = t?.candidates(a.trigger?.config || {}) || [];
  const matched = pool.filter(r => passesConditions(a, r));
  const record = matched[0] || pool[0] || null;
  const object = t?.object || 'deal';
  if (!record) return { ok: false, note: 'No live record to test against yet' };

  if (firing) return { ok: false, note: 'Already running' };
  firing = true;
  let actionsRun;
  try {
    actionsRun = (a.actions || []).map(act => {
      const meta = ACTIONS[act.type];
      if (!meta) return { type: act.type, ok: false, label: `Unknown action ${act.type}` };
      try { return meta.execute(record, act.config || {}, object); }
      catch (err) { return { type: act.type, ok: false, label: `Action errored: ${err.message}` }; }
    });
  } finally { firing = false; }

  bumpRun(a.id);
  appendLog({
    automationId: a.id, automationName: a.name, trigger: a.trigger?.type,
    subjectLabel: recordLabel(record, object), subjectId: record.id,
    actionsRun, result: 'test',
  });
  return { ok: true, subject: record, object, subjectLabel: recordLabel(record, object), actionsRun, matchedNow: matched.length > 0 };
}

/* LIVE WATCHER (hook) - a self-contained bridge that fires
   automations for REAL when deals change while mounted. Diffs
   the deal snapshot against the previous one: new deals ->
   emitDealCreated; stage changes -> emitDealStageChanged. The
   re-entrancy guard prevents action-driven changes from looping.
   Mount once (Workflows page). onFire is called after any run so
   the UI can pulse + count up. */
export function useAutomationWatcher(onFire) {
  const deals = useStore(s => s.deals);
  const prev = useRef(null);
  const cb = useRef(onFire);
  cb.current = onFire;
  useEffect(() => {
    const stages = new Map(deals.map(d => [d.id, d.stage]));
    const ids = new Set(deals.map(d => d.id));
    if (prev.current) {
      let firedAny = [];
      for (const d of deals) if (!prev.current.ids.has(d.id)) firedAny = firedAny.concat(emitDealCreated(d));
      for (const d of deals) {
        const old = prev.current.stages.get(d.id);
        if (old && old !== d.stage) firedAny = firedAny.concat(emitDealStageChanged(d.id, old, d.stage));
      }
      if (firedAny.length && cb.current) cb.current(firedAny);
    }
    prev.current = { ids, stages };
  }, [deals]);
}

/* ============================================================
   SEED - a believable starting library. At least 3 genuinely
   fire (create real projects / tasks / activities).
   ============================================================ */
function iso(daysFromNow) { return new Date(Date.now() + daysFromNow * 86400000).toISOString(); }
function buildSeed() {
  const rules = [
    {
      id: 'au_won_onboarding',
      name: 'Won deal kicks off onboarding',
      description: 'When a deal reaches Closed Won, spin up an onboarding project with kickoff tasks and alert the owner.',
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [
        { type: 'create_onboarding_project', config: {} },
        { type: 'create_task', config: { subject: 'Send welcome + schedule kickoff', dueDays: 1 } },
        { type: 'notify_owner', config: {} },
      ],
      active: true, runs: 42, lastRun: iso(-0.3),
    },
    {
      id: 'au_negotiation_followup',
      name: 'Follow-up task on Negotiation',
      description: 'When a deal enters Negotiation, create a follow-up task so momentum never stalls.',
      trigger: { type: 'deal_stage_changed', config: { stage: 'negotiation' } },
      conditions: [],
      actions: [
        { type: 'create_task', config: { subject: 'Confirm terms + set a signature date', dueDays: 2 } },
      ],
      active: true, runs: 118, lastRun: iso(-0.1),
    },
    {
      id: 'au_highvalue_alert',
      name: 'Alert on new high-value deals',
      description: 'When a new deal over $100k is created, log an alert activity and notify the owner.',
      trigger: { type: 'deal_value_over', config: { amount: 100000 } },
      conditions: [],
      actions: [
        { type: 'log_activity', config: { subject: 'High-value deal - deal desk review' } },
        { type: 'notify_owner', config: { who: 'VP of Revenue' } },
      ],
      active: true, runs: 61, lastRun: iso(-0.6),
    },
    {
      id: 'au_new_deal_research',
      name: 'Research every new deal',
      description: 'When any deal is created, log a research task so no opportunity goes cold.',
      trigger: { type: 'deal_created', config: {} },
      conditions: [],
      actions: [
        { type: 'create_task', config: { subject: 'Research account + map the buying committee', dueDays: 1 } },
      ],
      active: true, runs: 87, lastRun: iso(-0.9),
    },
    {
      id: 'au_proposal_email',
      name: 'Draft proposal note on Proposal',
      description: 'When a deal enters Proposal, draft the proposal cover email for the rep to review.',
      trigger: { type: 'deal_stage_changed', config: { stage: 'proposal' } },
      conditions: [],
      actions: [
        { type: 'send_email', config: { template: 'Proposal cover note' } },
        { type: 'create_task', config: { subject: 'Send proposal', dueDays: 1 } },
      ],
      active: false, runs: 24, lastRun: iso(-3.1),
    },
    {
      id: 'au_discovery_forecast',
      name: 'Mark Discovery deals best-case',
      description: 'When a deal enters Discovery, bump probability and log the momentum.',
      trigger: { type: 'deal_stage_changed', config: { stage: 'discovery' } },
      conditions: [],
      actions: [
        { type: 'set_field', config: { field: 'probability', value: 50 } },
        { type: 'log_activity', config: { subject: 'Entered Discovery - forecast updated' } },
      ],
      active: false, runs: 15, lastRun: iso(-5.4),
    },
  ];
  return { rules, seededAt: iso(0) };
}

/* ============================================================
   TEMPLATES - one-click add to the library (all executable).
   ============================================================ */
export const TEMPLATES = [
  {
    icon: 'target', tone: 'accent',
    name: 'Onboarding kickoff on Closed Won',
    description: 'Reaching Closed Won spins up an onboarding project and alerts the owner.',
    trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
    conditions: [],
    actions: [{ type: 'create_onboarding_project', config: {} }, { type: 'notify_owner', config: {} }],
  },
  {
    icon: 'dollar', tone: 'accent',
    name: 'Deal-desk review over $150k',
    description: 'A new deal over $150,000 logs a review activity and notifies the owner.',
    trigger: { type: 'deal_value_over', config: { amount: 150000 } },
    conditions: [],
    actions: [{ type: 'notify_owner', config: {} }, { type: 'log_activity', config: { subject: 'Deal desk review' } }],
  },
  {
    icon: 'deals', tone: 'accent',
    name: 'Fast-track proposals',
    description: 'Entering Proposal drafts the cover email and tasks the owner to send it.',
    trigger: { type: 'deal_stage_changed', config: { stage: 'proposal' } },
    conditions: [],
    actions: [{ type: 'send_email', config: { template: 'Proposal cover note' } }, { type: 'create_task', config: { subject: 'Send proposal', dueDays: 1 } }],
  },
  {
    icon: 'checkSquare', tone: 'ok',
    name: 'Never miss a new deal',
    description: 'Every new opportunity gets an owner research task within a day.',
    trigger: { type: 'deal_created', config: {} },
    conditions: [],
    actions: [{ type: 'create_task', config: { subject: 'Research new opportunity', dueDays: 1 } }],
  },
  {
    icon: 'clock', tone: 'info',
    name: 'Rescue overdue follow-ups',
    description: 'When an activity goes overdue, draft a nudge email to keep it moving.',
    trigger: { type: 'activity_overdue', config: {} },
    conditions: [{ field: 'type', op: 'neq', value: 'note' }],
    actions: [{ type: 'send_email', config: { template: 'Gentle nudge' } }],
  },
  {
    icon: 'bell', tone: 'accent',
    name: 'Advance to Negotiation with a nudge',
    description: 'Reaching Negotiation tasks the owner to confirm terms and set a close date.',
    trigger: { type: 'deal_stage_changed', config: { stage: 'negotiation' } },
    conditions: [],
    actions: [{ type: 'create_task', config: { subject: 'Confirm terms + set signature date', dueDays: 2 } }, { type: 'notify_owner', config: {} }],
  },
  {
    icon: 'bell', tone: 'accent',
    name: 'Post won deals to Slack',
    description: 'When a deal reaches Closed Won, post a message to your Slack channel. Paste a Slack Incoming Webhook and it posts for real.',
    trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
    conditions: [],
    actions: [{ type: 'send_slack', config: { webhook: '', message: 'Closed Won: {name} - {value} ({owner})' } }],
  },
  {
    icon: 'plug', tone: 'info',
    name: 'Send new deals to a webhook',
    description: 'Every new deal is POSTed as JSON to your Zapier, Make, or custom endpoint so you can sync it anywhere.',
    trigger: { type: 'deal_created', config: {} },
    conditions: [],
    actions: [{ type: 'post_webhook', config: { url: '' } }],
  },
  {
    icon: 'plug', tone: 'info',
    name: 'Sync high-value deals to HubSpot',
    description: 'A new deal over $100k is queued to sync into your system of record.',
    trigger: { type: 'deal_value_over', config: { amount: 100000 } },
    conditions: [],
    actions: [{ type: 'sync_record', config: { target: 'HubSpot' } }, { type: 'notify_owner', config: {} }],
  },
];
