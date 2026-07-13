// ============================================================
// RALLY SANDBOXES  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// Safe change management for serious teams. A HubSpot Enterprise
// staple that Rally ships in the box: spin up a sandbox (a full
// copy of your pipelines, automations, custom objects, fields and
// templates), make changes without touching live data, review a
// clean diff versus Production, then promote only the changes you
// approve. Test in a sandbox, promote to prod, zero surprises.
//
// This slice is ADDITIVE. It never touches store.js state; the
// environments, config snapshots, diffs and change logs live in
// their own deterministic-seed + pub/sub + localStorage store,
// mirroring store.js / reviews-data.js so it feels alive with zero
// backend. "Promote" is a SIMULATED apply: it logs change-tracking
// entries and marks the diff promoted, but never mutates any real
// data structure. A live sync provider is env-gated and absent by
// default, so the surface degrades to the local simulation.
//
// Live equivalent: rally_environments + rally_env_changes +
// rally_env_log tables; real cloning + promote route through
// api/sandbox-clone.js and api/sandbox-promote.js. ASCII only,
// NO em-dash, NO en-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_sandboxes_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (mirrors store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */

// The five kinds of configuration a sandbox copies from Production.
// `icon` names come from src/components/icons.jsx.
export const CONFIG_CATEGORIES = [
  { id: 'pipeline', label: 'Pipelines', singular: 'pipeline', icon: 'target', color: 'var(--accent)' },
  { id: 'automation', label: 'Automations', singular: 'automation', icon: 'workflow', color: 'var(--accent-teal)' },
  { id: 'object', label: 'Custom objects', singular: 'object', icon: 'box', color: 'var(--accent-purple)' },
  { id: 'field', label: 'Fields', singular: 'field', icon: 'sliders', color: 'var(--info)' },
  { id: 'template', label: 'Templates', singular: 'template', icon: 'fileText', color: 'var(--warn)' },
];
export const categoryById = (id) => CONFIG_CATEGORIES.find(c => c.id === id) || CONFIG_CATEGORIES[0];

// A change in a sandbox is one of three kinds versus Production.
export const CHANGE_TYPES = {
  added: { label: 'Added', tone: 'ok', color: 'var(--ok)', sign: '+' },
  modified: { label: 'Modified', tone: 'info', color: 'var(--info)', sign: '~' },
  removed: { label: 'Removed', tone: 'risk', color: 'var(--risk)', sign: '-' },
};

// Sandbox type. Standard mirrors prod data volume for realistic testing;
// development is a lean, config-only copy that spins up fast.
export const SANDBOX_TYPES = {
  standard: { label: 'Standard', tone: 'accent', blurb: 'Full copy of config plus a representative slice of records.' },
  development: { label: 'Development', tone: 'info', blurb: 'Lean config-only copy that provisions in seconds.' },
  production: { label: 'Production', tone: 'ok', blurb: 'The live environment your customers touch.' },
};

// Environment status -> badge tone + label.
export const ENV_STATUS = {
  active: { label: 'Active', tone: 'ok', dot: 'green' },
  syncing: { label: 'Syncing', tone: 'info', dot: 'yellow' },
  stale: { label: 'Sync overdue', tone: 'warn', dot: 'yellow' },
};

// Change-log entry kinds -> icon + accent.
export const LOG_KINDS = {
  created: { icon: 'plus', color: 'var(--accent)' },
  synced: { icon: 'rotateCcw', color: 'var(--info)' },
  edit: { icon: 'edit', color: 'var(--n-600)' },
  test: { icon: 'checkSquare', color: 'var(--accent-teal)' },
  promote: { icon: 'arrowUp', color: 'var(--ok)' },
  discard: { icon: 'trash', color: 'var(--risk)' },
  inbound: { icon: 'download', color: 'var(--ok)' },
};

const AUTHORS = ['Elena Ross', 'Jordan Avery', 'Nina Kapoor', 'Theo Bennett'];

// Production baseline. Object + config counts a sandbox clones from.
const PROD_COUNTS = { contacts: 1284, companies: 342, deals: 196, workflows: 48, records: 5120 };
const PROD_CONFIG = { pipeline: 4, automation: 48, object: 6, field: 84, template: 32 };

/* Static, fully-deterministic sandbox definitions. Timestamps are expressed as
   "days ago" offsets and resolved to ISO in buildSeed(). Each change carries a
   human-readable before/after so the diff reads like a real review. */
const SANDBOX_SEEDS = [
  {
    id: 'sb_pipeline',
    name: 'Q3 Pipeline Redesign',
    type: 'standard',
    owner: 'Elena Ross',
    createdAgo: 12,
    syncedAgo: 2,
    status: 'active',
    config: { pipeline: 4, automation: 48, object: 6, field: 86, template: 32 },
    counts: { contacts: 1284, companies: 342, deals: 196, workflows: 48, records: 5120 },
    changes: [
      { category: 'pipeline', type: 'modified', name: 'Enterprise Sales pipeline', detail: 'Inserted a Security Review stage after Proposal so infosec sign-off is tracked before Negotiation.', before: '6 stages', after: '7 stages', author: 'Elena Ross', ago: 3 },
      { category: 'field', type: 'added', name: 'Deal / Renewal Risk', detail: 'New single-select surfaced on every deal record and the forecast board.', before: 'Does not exist', after: 'Select (Low, Medium, High)', author: 'Elena Ross', ago: 4 },
      { category: 'field', type: 'modified', name: 'Deal / Forecast Category', detail: 'Renamed the picklist options to match the new board language.', before: 'Likely, Maybe, Longshot', after: 'Commit, Best Case, Pipeline', author: 'Nina Kapoor', ago: 5 },
      { category: 'automation', type: 'added', name: 'Slipping deal nudge', detail: 'Alerts the deal owner in Slack when a close date passes with the deal still open.', before: 'Does not exist', after: 'Enabled, 3 steps', author: 'Jordan Avery', ago: 2 },
      { category: 'template', type: 'modified', name: 'Proposal follow-up email', detail: 'Tightened the subject line and added a one-line value recap.', before: 'Following up on your proposal', after: 'Your proposal, and the number that matters', author: 'Theo Bennett', ago: 6 },
    ],
    log: [
      { kind: 'created', ago: 12, summary: 'Sandbox created from Production', author: 'Elena Ross' },
      { kind: 'edit', ago: 6, summary: 'Edited template: Proposal follow-up email', author: 'Theo Bennett' },
      { kind: 'edit', ago: 5, summary: 'Renamed Forecast Category options', author: 'Nina Kapoor' },
      { kind: 'edit', ago: 4, summary: 'Added field: Deal / Renewal Risk', author: 'Elena Ross' },
      { kind: 'edit', ago: 3, summary: 'Added Security Review stage to Enterprise Sales', author: 'Elena Ross' },
      { kind: 'test', ago: 3, summary: 'Ran 24 pipeline automation tests, all green', author: 'Jordan Avery' },
      { kind: 'edit', ago: 2, summary: 'Added automation: Slipping deal nudge', author: 'Jordan Avery' },
      { kind: 'synced', ago: 2, summary: 'Refreshed record data from Production', author: 'Elena Ross' },
    ],
  },
  {
    id: 'sb_automation',
    name: 'Automation QA',
    type: 'development',
    owner: 'Jordan Avery',
    createdAgo: 6,
    syncedAgo: 1,
    status: 'active',
    config: { pipeline: 4, automation: 51, object: 7, field: 84, template: 32 },
    counts: { contacts: 60, companies: 24, deals: 30, workflows: 51, records: 240 },
    changes: [
      { category: 'automation', type: 'modified', name: 'Post-demo follow-up', detail: 'Cut the send delay so reps reach buyers while the demo is still fresh.', before: 'Wait 1 day', after: 'Wait 2 hours', author: 'Jordan Avery', ago: 1 },
      { category: 'automation', type: 'modified', name: 'Lead round-robin', detail: 'Weighted assignment by live rep capacity instead of a flat rotation.', before: 'Even rotation', after: 'Weighted by open pipeline', author: 'Jordan Avery', ago: 2 },
      { category: 'automation', type: 'added', name: 'Won-deal handoff', detail: 'On close won, notifies Customer Success and spins up an onboarding project.', before: 'Does not exist', after: 'Enabled, 4 steps', author: 'Nina Kapoor', ago: 3 },
      { category: 'object', type: 'added', name: 'Onboarding Project', detail: 'New custom object to track post-sale delivery, linked to Company and Deal.', before: 'Does not exist', after: 'Object with 9 fields', author: 'Nina Kapoor', ago: 3 },
    ],
    log: [
      { kind: 'created', ago: 6, summary: 'Sandbox created from Production', author: 'Jordan Avery' },
      { kind: 'edit', ago: 3, summary: 'Added custom object: Onboarding Project', author: 'Nina Kapoor' },
      { kind: 'edit', ago: 3, summary: 'Added automation: Won-deal handoff', author: 'Nina Kapoor' },
      { kind: 'edit', ago: 2, summary: 'Reworked Lead round-robin weighting', author: 'Jordan Avery' },
      { kind: 'test', ago: 1, summary: 'Simulated 500 enrollments, no misfires', author: 'Jordan Avery' },
      { kind: 'edit', ago: 1, summary: 'Reduced Post-demo follow-up delay', author: 'Jordan Avery' },
      { kind: 'synced', ago: 1, summary: 'Refreshed config from Production', author: 'Jordan Avery' },
    ],
  },
  {
    id: 'sb_fields',
    name: 'Field Cleanup Staging',
    type: 'development',
    owner: 'Nina Kapoor',
    createdAgo: 22,
    syncedAgo: 9,
    status: 'stale',
    config: { pipeline: 4, automation: 48, object: 6, field: 82, template: 31 },
    counts: { contacts: 60, companies: 24, deals: 30, workflows: 48, records: 240 },
    changes: [
      { category: 'field', type: 'removed', name: 'Contact / Legacy Persona', detail: 'Deprecated free-text field replaced by the structured Persona picklist last quarter.', before: 'Text on Contact', after: 'Removed', author: 'Nina Kapoor', ago: 10 },
      { category: 'field', type: 'modified', name: 'Company / Segment', detail: 'Converted the messy free-text field into a governed picklist with five values.', before: 'Free text', after: 'Picklist (5 values)', author: 'Nina Kapoor', ago: 11 },
      { category: 'template', type: 'removed', name: 'Cold outreach v1', detail: 'Retired the old sequence template in favor of the v3 rewrite.', before: 'Active template', after: 'Removed', author: 'Theo Bennett', ago: 12 },
    ],
    log: [
      { kind: 'created', ago: 22, summary: 'Sandbox created from Production', author: 'Nina Kapoor' },
      { kind: 'edit', ago: 12, summary: 'Removed template: Cold outreach v1', author: 'Theo Bennett' },
      { kind: 'edit', ago: 11, summary: 'Converted Company / Segment to a picklist', author: 'Nina Kapoor' },
      { kind: 'edit', ago: 10, summary: 'Removed field: Contact / Legacy Persona', author: 'Nina Kapoor' },
      { kind: 'synced', ago: 9, summary: 'Refreshed config from Production', author: 'Nina Kapoor' },
    ],
  },
];

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260713);
  const now = Date.now();
  const DAY = 86400000;
  const iso = (daysAgo) => new Date(now - daysAgo * DAY).toISOString();
  const newLogId = () => 'lg_' + Math.floor(rnd() * 1e9).toString(36);

  const environments = [];
  const changes = {};
  const logs = {};

  // Production, pinned first. It has an inbound change log of past promotions.
  environments.push({
    id: 'prod',
    name: 'Production',
    type: 'production',
    isProd: true,
    status: 'active',
    owner: 'Workspace',
    createdAt: iso(410),
    lastSyncedAt: null,
    config: { ...PROD_CONFIG },
    counts: { ...PROD_COUNTS },
  });
  logs['prod'] = [
    { id: newLogId(), kind: 'inbound', at: iso(9), summary: 'Promoted 2 changes from Renewals Test: forecast fields', author: 'Elena Ross', count: 2 },
    { id: newLogId(), kind: 'inbound', at: iso(31), summary: 'Promoted 5 changes from Q2 Onboarding sandbox', author: 'Nina Kapoor', count: 5 },
  ];

  for (const s of SANDBOX_SEEDS) {
    environments.push({
      id: s.id,
      name: s.name,
      type: s.type,
      isProd: false,
      status: s.status,
      owner: s.owner,
      createdAt: iso(s.createdAgo),
      lastSyncedAt: iso(s.syncedAgo),
      config: { ...s.config },
      counts: { ...s.counts },
    });
    changes[s.id] = s.changes.map((c, i) => ({
      id: `ch_${s.id}_${i + 1}`,
      envId: s.id,
      category: c.category,
      type: c.type,
      name: c.name,
      detail: c.detail,
      before: c.before,
      after: c.after,
      author: c.author,
      at: iso(c.ago),
      promoted: false,
      promotedAt: null,
    }));
    logs[s.id] = s.log.map(l => ({
      id: newLogId(),
      kind: l.kind,
      at: iso(l.ago),
      summary: l.summary,
      author: l.author,
    }));
  }

  return { seededAt: new Date(now).toISOString(), environments, changes, logs };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetSandboxes() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useSandboxes(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* Env-gated live sync. Absent by default, so promote runs as a local
   simulation and never claims to mutate a real Production. */
export function hasSyncEnv() {
  try { return !!(import.meta.env && import.meta.env.VITE_SANDBOX_SYNC_URL); } catch { return false; }
}

/* ============================================================
   READ API   (each notes the live query)
   ============================================================ */
export const getEnvironments = () => state.environments;                     // SUPABASE: from('rally_environments').select()
export const getEnvironment = (id) => state.environments.find(e => e.id === id) || null;
export const getProduction = () => state.environments.find(e => e.isProd) || null;
export const getSandboxes = () => state.environments.filter(e => !e.isProd);
export const getChanges = (envId) => state.changes[envId] || [];
export const getPendingChanges = (envId) => (state.changes[envId] || []).filter(c => !c.promoted);
export const getLog = (envId) => (state.logs[envId] || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));

/* Roll-up for the environments list header. */
export function sandboxStats() {
  const sandboxes = getSandboxes();
  let pending = 0;
  for (const s of sandboxes) pending += getPendingChanges(s.id).length;
  const stale = sandboxes.filter(s => s.status === 'stale').length;
  const allLogs = Object.values(state.logs).flat();
  const lastPromote = allLogs
    .filter(l => l.kind === 'promote' || l.kind === 'inbound')
    .sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  return {
    total: state.environments.length,
    sandboxCount: sandboxes.length,
    pending,
    stale,
    lastPromoteAt: lastPromote ? lastPromote.at : null,
  };
}

/* Diff summary for one sandbox: pending counts by change type + by category. */
export function diffSummary(envId) {
  const pending = getPendingChanges(envId);
  const byType = { added: 0, modified: 0, removed: 0 };
  const byCategory = {};
  for (const c of pending) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }
  return { total: pending.length, byType, byCategory };
}

/* ============================================================
   WRITE API   (validated writers; SIMULATED promote)
   ============================================================ */

function pushLog(envId, kind, summary, extra = {}) {
  const entry = { id: newId('lg'), kind, at: new Date().toISOString(), summary, author: 'You', ...extra };
  const logs = { ...state.logs, [envId]: [entry, ...(state.logs[envId] || [])] };
  return logs;
}

// SUPABASE: insert env row + kick api/sandbox-clone.js to snapshot prod config.
export function createSandbox({ name, type = 'development' }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Give the sandbox a name.' };
  const prod = getProduction();
  const id = newId('sb');
  const isStd = type === 'standard';
  const env = {
    id,
    name: name.trim(),
    type: isStd ? 'standard' : 'development',
    isProd: false,
    status: 'active',
    owner: 'You',
    createdAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    config: { ...(prod ? prod.config : PROD_CONFIG) },
    // Development clones config only; standard mirrors a data slice.
    counts: isStd
      ? { ...(prod ? prod.counts : PROD_COUNTS) }
      : { contacts: 60, companies: 24, deals: 30, workflows: (prod ? prod.config.automation : 48), records: 240 },
  };
  const logs = {
    ...state.logs,
    [id]: [{ id: newId('lg'), kind: 'created', at: env.createdAt, summary: 'Sandbox created from Production', author: 'You' }],
  };
  commit({
    ...state,
    environments: [...state.environments, env],
    changes: { ...state.changes, [id]: [] },
    logs,
  });
  return { environment: env };
}

// SUPABASE: re-run the clone job to pull the latest prod config + data slice.
export function refreshFromProd(envId) {
  const env = getEnvironment(envId);
  if (!env || env.isProd) return { error: 'env', message: 'Pick a sandbox to refresh.' };
  const prod = getProduction();
  const next = state.environments.map(e => e.id === envId
    ? { ...e, status: 'active', lastSyncedAt: new Date().toISOString(), counts: e.type === 'standard' ? { ...(prod ? prod.counts : e.counts) } : e.counts }
    : e);
  const logs = pushLog(envId, 'synced', 'Refreshed from Production');
  commit({ ...state, environments: next, logs });
  return { ok: true };
}

/* Promote selected changes to Production. SIMULATED: marks the diff entries
   promoted, logs a promote entry on the sandbox and a mirrored inbound entry
   on Production, and NEVER mutates any real data structure. When a live sync
   provider is wired (hasSyncEnv) the same call would enqueue the real apply. */
export function promoteChanges(envId, changeIds = []) {
  const env = getEnvironment(envId);
  if (!env || env.isProd) return { error: 'env', message: 'Promote runs from a sandbox.' };
  const ids = new Set(changeIds);
  const list = state.changes[envId] || [];
  const selected = list.filter(c => ids.has(c.id) && !c.promoted);
  if (!selected.length) return { error: 'empty', message: 'Select at least one change to promote.' };
  const when = new Date().toISOString();
  const nextList = list.map(c => ids.has(c.id) && !c.promoted ? { ...c, promoted: true, promotedAt: when } : c);
  const summary = `Promoted ${selected.length} change${selected.length === 1 ? '' : 's'} to Production`;
  let logs = pushLog(envId, 'promote', summary, { count: selected.length });
  logs = {
    ...logs,
    prod: [{ id: newId('lg'), kind: 'inbound', at: when, summary: `Promoted ${selected.length} change${selected.length === 1 ? '' : 's'} from ${env.name}`, author: 'You', count: selected.length }, ...(logs['prod'] || [])],
  };
  commit({ ...state, changes: { ...state.changes, [envId]: nextList }, logs });
  return { ok: true, count: selected.length, simulated: !hasSyncEnv() };
}

// Discard a pending change so it never reaches the promote list.
export function discardChange(envId, changeId) {
  const list = state.changes[envId] || [];
  const target = list.find(c => c.id === changeId);
  if (!target) return { error: 'missing', message: 'Change not found.' };
  const nextList = list.filter(c => c.id !== changeId);
  const logs = pushLog(envId, 'discard', `Discarded change: ${target.name}`);
  commit({ ...state, changes: { ...state.changes, [envId]: nextList }, logs });
  return { ok: true };
}

// SUPABASE: from('rally_environments').delete().eq('id', id). Never prod.
export function deleteSandbox(envId) {
  const env = getEnvironment(envId);
  if (!env || env.isProd) return { error: 'env', message: 'Production cannot be deleted.' };
  const changes = { ...state.changes }; delete changes[envId];
  const logs = { ...state.logs }; delete logs[envId];
  commit({ ...state, environments: state.environments.filter(e => e.id !== envId), changes, logs });
  return { ok: true };
}
