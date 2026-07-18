// ============================================================
// ARDOVO TRAINING ENGINE  (local-first, additive)
//
// Replaces the human implementation trainer. A role/permission-based module
// library, per-module completion tracking, manager-added custom modules, a
// "training mode" that turns Rook into a patient teacher that can navigate and
// highlight the UI, and Zoom-style session archives (a concise summary up top,
// the full step-by-step notes behind it) so managers can see what was covered.
//
// PERMISSION MODEL: every user must complete the modules for the areas they
// can use. We proxy access by the user's role (rep vs manager) from store.js:
// modules tagged roles:['all'] apply to everyone; role-specific and
// permissionGated modules (team, permissions, settings, billing, migration,
// agent governance) are required only for managers/admins.
//
// Local-first (localStorage rally_training_v1) with the store.js pub/sub shape.
// Internal keys stay rally_* by design. ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getCurrentUser } from './store.js';

const LS_KEY = 'rally_training_v1';

/* ============================================================
   DEFAULT MODULE LIBRARY
   Each module: id, title, area, icon, minutes, level, roles[], blurb, steps[].
   permissionGated: only required for users with admin access (managers here).
   Each step may deep-link (`to`), seed a Rook prompt (`ask`), and/or point at a
   UI element to spotlight (`highlight` = a CSS selector).
   ============================================================ */
export const MODULES = [
  // ---------- Universal onboarding (everyone) ----------
  {
    id: 'orientation', title: 'Get oriented in Ardovo', area: 'home', icon: 'home', minutes: 4, level: 'Start here', roles: ['all'],
    blurb: 'The command spine, the home cockpit, and how to get anywhere fast.',
    steps: [
      { title: 'The command spine', detail: 'The icon rail on the left carries your primary destinations. Hover any icon for its drawer, or open Apps for the full catalog.', to: '/app', highlight: '.rl-rail, nav' },
      { title: 'Your home cockpit', detail: 'The home screen leads with the moves that matter today. This is where every morning starts.', to: '/app', ask: 'What should I focus on today?' },
      { title: 'Recent pages and pinning', detail: 'Bottom-left keeps your last few pages so you can jump back, and you can pin the ones you live in - no more tab sprawl.', highlight: '.rpd-tab, .rpd-panel' },
    ],
  },
  {
    id: 'ask-rook', title: 'Ask Rook (and talk to it)', area: 'rook', icon: 'sparkles', minutes: 5, level: 'Start here', roles: ['all'],
    blurb: 'The AI operator on every screen - by text or by voice.',
    steps: [
      { title: 'Open Rook', detail: 'Rook is docked bottom-right on every screen. Ask a question or tell it where to go.', ask: 'Take me to the deals pipeline', highlight: '.rook-fab' },
      { title: 'Turn on voice mode', detail: 'Hit the voice button and just talk. Rook listens, answers out loud, and can take you places or highlight things.', ask: 'Find the Vertex Robotics account' },
      { title: 'Search anything', detail: 'Press Ctrl or Cmd + K to jump to any record or screen instantly.', highlight: '[data-cmdk], .topbar-search' },
    ],
  },
  // ---------- Rep / seller core ----------
  {
    id: 'contacts-companies', title: 'Contacts and companies', area: 'contacts', icon: 'users', minutes: 6, level: 'Core', roles: ['all'],
    blurb: 'The people and accounts your revenue runs on.',
    steps: [
      { title: 'Open contacts', detail: 'Every person you work, with their company, owner, and last activity.', to: '/contacts' },
      { title: 'Open a company', detail: 'An account page rolls up its contacts, open pipeline, and health.', to: '/companies' },
      { title: 'Let Rook add one', detail: 'Rook can create a contact or a whole account from one sentence.', ask: 'Add a contact named Dana Lopez at Northwind Freight' },
    ],
  },
  {
    id: 'pipeline', title: 'Work your pipeline', area: 'deals', icon: 'target', minutes: 6, level: 'Core', roles: ['all'],
    blurb: 'Deals, stages, the kanban board, and moving work forward.',
    steps: [
      { title: 'See every deal', detail: 'The pipeline shows every open deal by stage. Drag a card to move a stage, or open a deal for the full picture.', to: '/deals' },
      { title: 'Open a deal', detail: 'A deal page carries the company, buying committee, activity, and next steps - assembled for you.', to: '/deals', ask: 'Which deals are slipping?' },
      { title: 'Advance the work', detail: 'Rook can move a stage or draft a follow-up for you. Just ask.', ask: 'Draft a follow-up for my biggest open deal' },
    ],
  },
  {
    id: 'activities', title: 'Run your day', area: 'activities', icon: 'activity', minutes: 4, level: 'Core', roles: ['all'],
    blurb: 'Tasks, calls, and the queue that keeps you on track.',
    steps: [
      { title: 'Open My Day', detail: 'Your due tasks and calls in one queue, quick-complete as you go.', to: '/activities' },
      { title: 'Ask what is on your plate', detail: 'Rook reads your day back to you and flags what matters.', ask: 'What is on my plate today?' },
    ],
  },
  {
    id: 'forecasting', title: 'Read the forecast', area: 'forecasting', icon: 'trendUp', minutes: 5, level: 'Core', roles: ['all'],
    blurb: 'Weighted forecast, coverage, and the scenarios leaders ask about.',
    steps: [
      { title: 'Open forecasting', detail: 'Commit, best case, and full pipeline in one place, live off the book.', to: '/forecasting' },
      { title: 'Ask for the number', detail: 'Rook knows your forecast cold. Ask and it answers with the math.', ask: 'What is my weighted forecast this quarter?' },
    ],
  },
  {
    id: 'quotes', title: 'Quotes and billing', area: 'quotes', icon: 'receipt', minutes: 5, level: 'Core', roles: ['all'],
    blurb: 'Turn a deal into a quote, and a quote into revenue.',
    steps: [
      { title: 'Open quotes', detail: 'Draft, send, and track quotes tied to deals.', to: '/quotes' },
      { title: 'Quote from a deal', detail: 'Rook can build a draft quote from a deal in one step.', ask: 'Build a quote from my largest open deal' },
    ],
  },
  // ---------- Power up (everyone, later) ----------
  {
    id: 'atlas', title: 'Atlas: the deal map', area: 'atlas', icon: 'radar', minutes: 6, level: 'Power up', roles: ['all'],
    blurb: 'See your whole book as a map and predict which deals win.',
    steps: [
      { title: 'Open Atlas', detail: 'Every deal placed by similarity, auto-clustered from the live book.', to: '/atlas' },
      { title: 'Predict outcomes', detail: 'Switch to Predict mode to see win-likelihood inferred from your own closed history.', to: '/atlas' },
    ],
  },
  {
    id: 'agent-cloud', title: 'Agent Cloud', area: 'agent-cloud', icon: 'sparkles', minutes: 7, level: 'Power up', roles: ['all'],
    blurb: 'Your fleet of AI agents working the book with your approval.',
    steps: [
      { title: 'Meet the fleet', detail: 'Specialized agents run your pipeline with full traces and human-in-the-loop control.', to: '/agent-cloud' },
      { title: 'Approve their work', detail: 'Agents stage changes; you approve or reject in one click. Everything is reversible.', to: '/agent-cloud' },
    ],
  },
  {
    id: 'reports', title: 'Build a report', area: 'reports', icon: 'pie', minutes: 7, level: 'Core', roles: ['all'],
    blurb: 'From a blank canvas to a saved report your team can use.',
    steps: [
      { title: 'Open the report builder', detail: 'Start from a template or a blank report. Pick the object, columns, and filters.', to: '/report-builder' },
      { title: 'Describe what you need', detail: 'Tell Rook the report you want in plain language and it assembles it.', ask: 'Build a report of open deals over 100k closing this quarter by owner' },
      { title: 'Save and share', detail: 'Saved reports live under Reports and feed dashboards.', to: '/reports' },
    ],
  },
  // ---------- Manager / admin (permission-gated) ----------
  {
    id: 'team', title: 'Manage your team', area: 'team', icon: 'users', minutes: 6, level: 'Admin', roles: ['manager'], permissionGated: true,
    blurb: 'Seats, quotas, and the leaderboard.',
    steps: [
      { title: 'Open the team', detail: 'Your reps, their quotas, and performance in one place.', to: '/team' },
      { title: 'Read the leaderboard', detail: 'Dashboards roll up attainment across the team.', to: '/dashboards' },
    ],
  },
  {
    id: 'permissions', title: 'Roles and permissions', area: 'permissions', icon: 'lock', minutes: 6, level: 'Admin', roles: ['manager'], permissionGated: true,
    blurb: 'Who can see and do what. The governance layer.',
    steps: [
      { title: 'Open permissions', detail: 'Define roles and what each can access.', to: '/permissions' },
      { title: 'Understand the model', detail: 'Access drives required training: anyone with access to an area must complete its module.', to: '/roles' },
    ],
  },
  {
    id: 'agent-governance', title: 'Govern the agents', area: 'agent-trust', icon: 'shield', minutes: 6, level: 'Admin', roles: ['manager'], permissionGated: true,
    blurb: 'Autonomy levels, mandates, model routing, and the trust layer.',
    steps: [
      { title: 'Set autonomy + mandate', detail: 'Each agent runs inside an envelope: what it can touch and how far it can act.', to: '/agent-cloud' },
      { title: 'Route models + trust', detail: 'Pick models per agent and keep zero-retention posture.', to: '/agent-trust' },
    ],
  },
  {
    id: 'migration', title: 'Migrate data in', area: 'migrate', icon: 'swap', minutes: 8, level: 'Admin', roles: ['manager'], permissionGated: true,
    blurb: 'Import, map, cleanse, and go live without a year-long project.',
    steps: [
      { title: 'Open the migration wizard', detail: 'Upload an export and Ardovo analyzes it: unmapped columns, empty fields, jammed data, duplicates.', to: '/migrate' },
      { title: 'Cleanse in review', detail: 'Fix and remap in the app before anything touches production.', to: '/migrate' },
      { title: 'Stage and go live', detail: 'Review, stage, then push to production when it is clean.', to: '/migrate' },
    ],
  },
];

/* ============================================================
   PERSISTENCE + PUB/SUB
   state = { sessions[], active, progress{moduleId:{done[],completedAt}}, custom[] }
   ============================================================ */
function freshState() { return { sessions: [], active: null, progress: {}, custom: [] }; }
function normalize(s) {
  return {
    sessions: Array.isArray(s?.sessions) ? s.sessions : [],
    active: s?.active || null,
    progress: (s && typeof s.progress === 'object' && s.progress) || {},
    custom: Array.isArray(s?.custom) ? s.custom : [],
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  const seed = freshState();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
let state = load();
const subs = new Set();
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function getTraining() { return state; }
export function useTraining(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   MODULES: catalog, roles, completion
   ============================================================ */
export function allModules() { return [...MODULES, ...state.custom]; }
export function getModule(id) { return allModules().find(m => m.id === id) || null; }

export function currentRole() {
  const u = getCurrentUser();
  return u?.role === 'manager' ? 'manager' : (u?.role || 'rep');
}
export function isManager() { return currentRole() === 'manager'; }

// Modules this user MUST complete: universal plus anything their access covers.
// Managers/admins inherit the permission-gated set; reps do not.
export function requiredFor(role = currentRole()) {
  return allModules().filter(m => {
    const roles = m.roles || ['all'];
    if (roles.includes('all')) return true;
    if (roles.includes(role)) return true;
    return false;
  });
}

export function moduleProgress(moduleId) {
  const m = getModule(moduleId);
  const total = m ? m.steps.length : 0;
  const p = state.progress[moduleId] || { done: [], completedAt: null };
  const done = Array.isArray(p.done) ? p.done.length : 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, completedAt: p.completedAt || null, complete: !!p.completedAt };
}
export function isModuleComplete(moduleId) { return !!(state.progress[moduleId] && state.progress[moduleId].completedAt); }

export function markStepDone(moduleId, stepIndex) {
  const m = getModule(moduleId);
  if (!m) return;
  const prev = state.progress[moduleId] || { done: [], completedAt: null };
  const done = prev.done.includes(stepIndex) ? prev.done : [...prev.done, stepIndex];
  const completedAt = done.length >= m.steps.length ? (prev.completedAt || new Date().toISOString()) : prev.completedAt;
  commit({ ...state, progress: { ...state.progress, [moduleId]: { done, completedAt } } });
}
export function markModuleComplete(moduleId) {
  const m = getModule(moduleId);
  if (!m) return;
  commit({ ...state, progress: { ...state.progress, [moduleId]: { done: m.steps.map((_, i) => i), completedAt: new Date().toISOString() } } });
}
export function resetModule(moduleId) {
  const { [moduleId]: _drop, ...rest } = state.progress;
  commit({ ...state, progress: rest });
}

// Completion rollup for the current user against their required set.
export function completionStats(role = currentRole()) {
  const req = requiredFor(role);
  const done = req.filter(m => isModuleComplete(m.id)).length;
  return { required: req.length, done, pct: req.length ? Math.round((done / req.length) * 100) : 0 };
}

/* ---------- manager-added custom modules ---------- */
export function addCustomModule({ title, area = 'custom', icon = 'book', minutes = 5, level = 'Core', roles = ['all'], blurb = '', steps = [] } = {}) {
  const mod = {
    id: newId('mod'), title: title || 'New module', area, icon, minutes: Number(minutes) || 5, level, roles,
    blurb, steps: steps.length ? steps : [{ title: 'Step one', detail: 'Describe what to learn.' }], custom: true,
  };
  commit({ ...state, custom: [mod, ...state.custom] });
  return mod;
}
export function removeCustomModule(id) {
  commit({ ...state, custom: state.custom.filter(m => m.id !== id) });
}

/* ============================================================
   SESSION LIFECYCLE (Zoom-style archive: concise + full notes)
   ============================================================ */
export function startSession(moduleId = null) {
  const u = getCurrentUser();
  const active = {
    id: newId('ts'), startedAt: new Date().toISOString(),
    userName: u?.name || 'You', userRole: currentRole(),
    moduleIds: moduleId ? [moduleId] : [], steps: [], asks: [],
  };
  commit({ ...state, active });
  return active;
}
export function isActive() { return !!state.active; }

export function logStep(moduleId, stepTitle) {
  if (!state.active) startSession(moduleId);
  const a = state.active || getTraining().active;
  const moduleIds = a.moduleIds.includes(moduleId) ? a.moduleIds : [...a.moduleIds, moduleId];
  const steps = [...a.steps, { moduleId, stepTitle, at: new Date().toISOString() }];
  commit({ ...state, active: { ...a, moduleIds, steps } });
}
export function logAsk(prompt) {
  if (!state.active) return;
  commit({ ...state, active: { ...state.active, asks: [...state.active.asks, { prompt, at: new Date().toISOString() }] } });
}

export function endSession() {
  const a = state.active;
  if (!a) return null;
  const ended = new Date();
  const durationMin = Math.max(1, Math.round((ended - new Date(a.startedAt)) / 60000));
  const modules = a.moduleIds.map(id => getModule(id)?.title || id);
  const session = {
    id: a.id, startedAt: a.startedAt, endedAt: ended.toISOString(), durationMin,
    userName: a.userName, userRole: a.userRole,
    moduleIds: a.moduleIds, stepsCompleted: a.steps.length, asks: a.asks.length,
    summary: buildSummary(modules, a.steps.length, durationMin, a.asks),
    notes: buildNotes(a, modules, durationMin),   // full behind-the-scenes notes
    aiNotes: null,                                 // filled by /api/training-summary when available
  };
  commit({ sessions: [session, ...state.sessions], active: null });
  return session;
}
export function cancelSession() { commit({ ...state, active: null }); }

export function updateSession(id, patch) {
  commit({ ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, ...patch } : s) });
}

function buildSummary(modules, stepsCompleted, durationMin, asks) {
  const modText = modules.length ? `Covered ${modules.length} module${modules.length === 1 ? '' : 's'}: ${modules.join(', ')}.` : 'Freeform session.';
  const stepText = `${stepsCompleted} step${stepsCompleted === 1 ? '' : 's'} in ${durationMin} minute${durationMin === 1 ? '' : 's'}.`;
  const askText = asks.length ? ` Asked Rook ${asks.length} question${asks.length === 1 ? '' : 's'}.` : '';
  return `${modText} ${stepText}${askText}`;
}
// The full, behind-the-scenes record (the "advanced note-taker" transcript).
function buildNotes(a, modules, durationMin) {
  const lines = [];
  lines.push(`Training session - ${a.userName} (${a.userRole}) - ${durationMin} min`);
  lines.push(`Modules: ${modules.join(', ') || 'none'}`);
  if (a.steps.length) {
    lines.push('', 'Walkthrough:');
    a.steps.forEach((s, i) => lines.push(`  ${i + 1}. [${getModule(s.moduleId)?.title || s.moduleId}] ${s.stepTitle}`));
  }
  if (a.asks.length) {
    lines.push('', 'Questions asked:');
    a.asks.forEach(q => lines.push(`  - "${q.prompt}"`));
  }
  return lines.join('\n');
}

export function trainingStats() {
  const s = state.sessions;
  return {
    sessions: s.length,
    minutes: s.reduce((a, x) => a + (x.durationMin || 0), 0),
    steps: s.reduce((a, x) => a + (x.stepsCompleted || 0), 0),
    modulesTouched: new Set(s.flatMap(x => x.moduleIds || [])).size,
  };
}
