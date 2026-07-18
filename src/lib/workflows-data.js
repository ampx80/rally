// ============================================================
// ARDOVO WORKFLOW AUTOMATION ENGINE - feature state + evaluator
// Self-contained. Owns the workflow rule definitions, their
// localStorage persistence, a deterministic seed, and a REAL
// evaluator that runs rules against the live store data
// (getDeals / getContacts / getCompanies / getActivities).
// No Math.random at load - the seed is fixed so the library
// looks identical on every cold start.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getDeals, getContacts, getActivities,
} from './store.js';

const LS_KEY = 'rally_workflows_v1';

/* ============================================================
   VOCABULARY - the building blocks the visual builder exposes.
   ============================================================ */

// TRIGGERS: each knows how to pull the candidate record set from the
// live store, and describes itself for the builder canvas.
export const TRIGGERS = {
  deal_stage_changed: {
    id: 'deal_stage_changed', label: 'Deal stage changes', object: 'deal', icon: 'deals',
    title: 'When a deal stage changes', sub: 'Fires each time a deal moves in the pipeline',
    // candidates: deals currently sitting in the configured stage (if any)
    candidates: (cfg) => getDeals().filter(d => !cfg?.stage || d.stage === cfg.stage),
  },
  deal_created: {
    id: 'deal_created', label: 'Deal is created', object: 'deal', icon: 'plus',
    title: 'When a deal is created', sub: 'Fires on every new opportunity',
    candidates: () => getDeals(),
  },
  deal_value_over: {
    id: 'deal_value_over', label: 'Deal value over threshold', object: 'deal', icon: 'dollar',
    title: 'When a high-value deal is created', sub: 'Fires when a new deal clears the amount you set',
    candidates: () => getDeals().filter(d => d.status === 'open'),
  },
  activity_overdue: {
    id: 'activity_overdue', label: 'Activity becomes overdue', object: 'activity', icon: 'clock',
    title: 'When an activity goes overdue', sub: 'Checked continuously against due dates',
    candidates: () => getActivities().filter(a => !a.done && a.dueAt && new Date(a.dueAt).getTime() < Date.now()),
  },
  contact_created: {
    id: 'contact_created', label: 'Contact is created', object: 'contact', icon: 'users',
    title: 'When a contact is created', sub: 'Fires on new people entering the CRM',
    candidates: () => getContacts(),
  },
};
export const TRIGGER_LIST = Object.values(TRIGGERS);

// FIELD accessors per object type - used by conditions. Each returns a
// comparable value from the record.
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

// ACTIONS: what a rule does. Each has an estimate of minutes saved per run,
// used for the "time saved" KPI.
export const ACTIONS = {
  create_task: { id: 'create_task', label: 'Create a task', icon: 'checkSquare', tone: 'ok', minutes: 4, verb: 'task created for' },
  send_email: { id: 'send_email', label: 'Draft an email', icon: 'mail', tone: 'info', minutes: 6, verb: 'email drafted for' },
  move_stage: { id: 'move_stage', label: 'Move deal stage', icon: 'deals', tone: 'accent', minutes: 2, verb: 'stage advanced for' },
  notify_owner: { id: 'notify_owner', label: 'Notify the owner', icon: 'bell', tone: 'accent', minutes: 1, verb: 'owner notified for' },
  add_tag: { id: 'add_tag', label: 'Add a tag', icon: 'layers', tone: 'info', minutes: 1, verb: 'tag applied to' },
  create_activity: { id: 'create_activity', label: 'Log an activity', icon: 'activity', tone: 'ok', minutes: 2, verb: 'activity logged for' },
};
export const ACTION_LIST = Object.values(ACTIONS);

/* ============================================================
   EVALUATION - the REAL engine. Runs a rule against live store
   data and returns which records match every condition.
   ============================================================ */
function compare(op, actual, expected, type) {
  if (op === 'set') return actual != null && actual !== '';
  if (type === 'number') {
    const a = Number(actual), b = Number(expected);
    if (op === 'gt') return a > b;
    if (op === 'lt') return a < b;
    if (op === 'eq') return a === b;
    if (op === 'neq') return a !== b;
  }
  const a = String(actual ?? '').toLowerCase();
  const b = String(expected ?? '').toLowerCase();
  if (op === 'eq') return a === b;
  if (op === 'neq') return a !== b;
  return false;
}

// Returns { matched: [records], total: N } - genuine evaluation.
export function evaluateRule(rule) {
  const trig = TRIGGERS[rule.trigger];
  if (!trig) return { matched: [], total: 0, object: 'record' };
  let pool = trig.candidates(rule.triggerConfig || {}) || [];
  const total = pool.length;
  const fields = FIELDS_BY_OBJECT[trig.object] || {};

  // deal_value_over folds its threshold into an implicit condition
  const conds = [...(rule.conditions || [])];
  if (rule.trigger === 'deal_value_over' && rule.triggerConfig?.amount != null) {
    conds.unshift({ field: 'value', op: 'gt', value: rule.triggerConfig.amount });
  }

  const matched = pool.filter((rec) => {
    return conds.every((c) => {
      const f = fields[c.field];
      if (!f) return true;
      return compare(c.op, f.get(rec), c.value, f.type);
    });
  });
  return { matched, total, object: trig.object };
}

// Human label for a record (for the simulate panel).
export function recordLabel(rec, object) {
  if (object === 'deal') return rec.name;
  if (object === 'contact') return `${rec.firstName} ${rec.lastName}`.trim();
  if (object === 'activity') return rec.subject;
  return rec.id;
}

// Minutes saved per run of a rule = sum of its actions' minute estimates.
export function minutesPerRun(rule) {
  return (rule.actions || []).reduce((s, a) => s + (ACTIONS[a.type]?.minutes || 2), 0);
}

/* ============================================================
   SEED - a believable starting library. Deterministic.
   ============================================================ */
function buildSeed() {
  const rules = [
    {
      id: 'wf_negotiation_proposal',
      name: 'Proposal push on Negotiation',
      description: 'When a deal enters Negotiation, create a "Send proposal" task for the owner.',
      trigger: 'deal_stage_changed',
      triggerConfig: { stage: 'negotiation' },
      conditions: [],
      actions: [
        { type: 'create_task', config: { subject: 'Send updated proposal', dueDays: 1 } },
        { type: 'notify_owner', config: {} },
      ],
      active: true, runs: 214, lastRun: iso(-0.15),
    },
    {
      id: 'wf_bigdeal_vp',
      name: 'Notify the VP on deals over $100k',
      description: 'When a deal over $100,000 is created, alert the VP of Revenue and log it.',
      trigger: 'deal_value_over',
      triggerConfig: { amount: 100000 },
      conditions: [],
      actions: [
        { type: 'notify_owner', config: { who: 'VP of Revenue' } },
        { type: 'create_activity', config: { subject: 'Deal desk review - high value' } },
      ],
      active: true, runs: 68, lastRun: iso(-0.5),
    },
    {
      id: 'wf_overdue_nudge',
      name: 'Rescue overdue follow-ups',
      description: 'When an activity goes overdue, draft a follow-up email and re-task the owner.',
      trigger: 'activity_overdue',
      triggerConfig: {},
      conditions: [{ field: 'type', op: 'neq', value: 'note' }],
      actions: [
        { type: 'send_email', config: { template: 'Overdue follow-up' } },
        { type: 'create_task', config: { subject: 'Re-engage - task went overdue', dueDays: 0 } },
      ],
      active: true, runs: 431, lastRun: iso(-0.05),
    },
    {
      id: 'wf_new_contact_welcome',
      name: 'Welcome new contacts',
      description: 'When a contact is created, draft an intro email and log a research task.',
      trigger: 'contact_created',
      triggerConfig: {},
      conditions: [],
      actions: [
        { type: 'send_email', config: { template: 'New contact intro' } },
        { type: 'add_tag', config: { tag: 'inbound' } },
      ],
      active: false, runs: 122, lastRun: iso(-2.4),
    },
    {
      id: 'wf_advance_qualified',
      name: 'Auto-advance qualified leads',
      description: 'When a Lead-stage deal clears 25% probability, move it to Qualified and notify the owner.',
      trigger: 'deal_stage_changed',
      triggerConfig: { stage: 'lead' },
      conditions: [{ field: 'probability', op: 'gt', value: 20 }],
      actions: [
        { type: 'move_stage', config: { to: 'qualified' } },
        { type: 'notify_owner', config: {} },
      ],
      active: true, runs: 57, lastRun: iso(-1.1),
    },
    {
      id: 'wf_enterprise_tag',
      name: 'Tag enterprise-sized opportunities',
      description: 'When a deal over $250k is created, tag it and start a deal-desk review activity.',
      trigger: 'deal_value_over',
      triggerConfig: { amount: 250000 },
      conditions: [],
      actions: [
        { type: 'add_tag', config: { tag: 'enterprise' } },
        { type: 'create_task', config: { subject: 'Loop in solutions engineer', dueDays: 2 } },
      ],
      active: false, runs: 19, lastRun: iso(-5.2),
    },
  ];
  // seeded actions-run counter for the month (deterministic, looks alive)
  return { rules, actionsThisMonth: 1284, seededAt: iso(0) };
}

function iso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString();
}

/* ============================================================
   PREBUILT TEMPLATES - one-click add to the library.
   ============================================================ */
export const TEMPLATES = [
  {
    icon: 'target', tone: 'accent',
    name: 'Onboarding kickoff on Closed Won',
    description: 'When a deal reaches Closed Won, log an onboarding task for the owner.',
    trigger: 'deal_stage_changed', triggerConfig: { stage: 'won' },
    conditions: [],
    actions: [{ type: 'create_task', config: { subject: 'Start onboarding checklist', dueDays: 1 } }, { type: 'notify_owner', config: {} }],
  },
  {
    icon: 'clock', tone: 'info',
    name: 'Chase stalled activities',
    description: 'When any activity goes overdue, draft a nudge email to keep the deal moving.',
    trigger: 'activity_overdue', triggerConfig: {},
    conditions: [{ field: 'type', op: 'neq', value: 'note' }],
    actions: [{ type: 'send_email', config: { template: 'Gentle nudge' } }],
  },
  {
    icon: 'dollar', tone: 'accent',
    name: 'Deal-desk review over $150k',
    description: 'When a deal over $150,000 is created, notify the owner and log a review.',
    trigger: 'deal_value_over', triggerConfig: { amount: 150000 },
    conditions: [],
    actions: [{ type: 'notify_owner', config: {} }, { type: 'create_activity', config: { subject: 'Deal desk review' } }],
  },
  {
    icon: 'users', tone: 'ok',
    name: 'Research every new contact',
    description: 'When a contact is created, log a research task so no lead goes cold.',
    trigger: 'contact_created', triggerConfig: {},
    conditions: [],
    actions: [{ type: 'create_task', config: { subject: 'Research new contact', dueDays: 1 } }, { type: 'add_tag', config: { tag: 'inbound' } }],
  },
  {
    icon: 'deals', tone: 'accent',
    name: 'Fast-track proposals',
    description: 'When a deal enters Proposal, draft the proposal email for the owner.',
    trigger: 'deal_stage_changed', triggerConfig: { stage: 'proposal' },
    conditions: [],
    actions: [{ type: 'send_email', config: { template: 'Proposal cover note' } }, { type: 'create_task', config: { subject: 'Send proposal', dueDays: 1 } }],
  },
  {
    icon: 'layers', tone: 'info',
    name: 'Flag expansion opportunities',
    description: 'When a deal over $50k is created, tag it for the expansion motion.',
    trigger: 'deal_value_over', triggerConfig: { amount: 50000 },
    conditions: [],
    actions: [{ type: 'add_tag', config: { tag: 'expansion' } }],
  },
];

/* ============================================================
   PERSISTENCE + PUB/SUB (mirrors store.js patterns)
   ============================================================ */
let wstate = wload();
const subs = new Set();

function wload() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  wstate = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(wstate)); } catch {}
  subs.forEach(fn => fn(wstate));
}

let idc = Date.now();
const newId = () => `wf_${(idc++).toString(36)}`;

export function useWorkflows(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(wstate));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(wstate);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- READ ---------- */
export const getWorkflows = () => wstate.rules;
export const getActionsThisMonth = () => wstate.actionsThisMonth;

/* ---------- WRITE ---------- */
export function toggleWorkflow(id) {
  const rules = wstate.rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
  commit({ ...wstate, rules });
}

export function saveWorkflow(rule) {
  const exists = wstate.rules.some(r => r.id === rule.id);
  let rules;
  if (exists) {
    rules = wstate.rules.map(r => r.id === rule.id ? { ...r, ...rule } : r);
  } else {
    const fresh = { runs: 0, lastRun: null, active: true, ...rule, id: rule.id || newId() };
    rules = [fresh, ...wstate.rules];
  }
  commit({ ...wstate, rules });
  return rule.id || rules[0].id;
}

export function deleteWorkflow(id) {
  commit({ ...wstate, rules: wstate.rules.filter(r => r.id !== id) });
}

export function duplicateWorkflow(id) {
  const src = wstate.rules.find(r => r.id === id);
  if (!src) return null;
  const copy = { ...src, id: newId(), name: `${src.name} (copy)`, active: false, runs: 0, lastRun: null };
  commit({ ...wstate, rules: [copy, ...wstate.rules] });
  return copy.id;
}

export function addTemplate(tpl) {
  const rule = {
    id: newId(), name: tpl.name, description: tpl.description,
    trigger: tpl.trigger, triggerConfig: { ...tpl.triggerConfig },
    conditions: (tpl.conditions || []).map(c => ({ ...c })),
    actions: (tpl.actions || []).map(a => ({ ...a })),
    active: true, runs: 0, lastRun: null,
  };
  commit({ ...wstate, rules: [rule, ...wstate.rules] });
  return rule.id;
}

// Record a real run: bump the rule's run count + lastRun + the month counter
// by however many records the evaluation actually matched.
export function recordRun(id, count) {
  const rules = wstate.rules.map(r => r.id === id
    ? { ...r, runs: r.runs + count, lastRun: new Date().toISOString() }
    : r);
  commit({ ...wstate, rules, actionsThisMonth: wstate.actionsThisMonth + count });
}
