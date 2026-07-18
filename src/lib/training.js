// ============================================================
// ARDOVO TRAINING ENGINE  (local-first, additive)
//
// Replaces the human implementation trainer. A library of guided modules,
// a "training mode" that turns Rook into a patient teacher, and Zoom-style
// session tracking: every training session records the modules touched and
// steps completed, then produces a summary you can revisit. Each user gets
// their own path.
//
// Local-first (localStorage rally_training_v1) with the store.js pub/sub
// shape. No backend required. ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_training_v1';

/* ============================================================
   MODULE LIBRARY
   Each step can deep-link (`to`) and/or seed a Rook prompt (`ask`) that the
   Training page fires into the voice/chat operator.
   ============================================================ */
export const MODULES = [
  {
    id: 'orientation', title: 'Get oriented in Ardovo', icon: 'home', minutes: 4, level: 'Start here',
    blurb: 'The command spine, the home cockpit, and how to get anywhere fast.',
    steps: [
      { title: 'The command spine', detail: 'The 72px rail on the left carries your primary destinations. Hover any icon for its drawer, or open Apps for the full catalog.', to: '/app' },
      { title: 'Your home cockpit', detail: 'The home screen leads with Rook Live and the moves that matter today. This is where every morning starts.', to: '/app', ask: 'What should I focus on today?' },
      { title: 'Ask Rook for anything', detail: 'The operator is docked bottom-right on every screen. Ask a question or tell it to take you somewhere.', ask: 'Take me to the deals pipeline' },
    ],
  },
  {
    id: 'pipeline', title: 'Work your pipeline', icon: 'target', minutes: 6, level: 'Core',
    blurb: 'Deals, stages, the kanban board, and moving work forward.',
    steps: [
      { title: 'See every deal', detail: 'The pipeline shows every open deal by stage. Drag a card to move a stage, or open a deal for the full picture.', to: '/deals' },
      { title: 'Open a deal', detail: 'A deal page carries the company, buying committee, activity, and next steps - assembled for you.', to: '/deals', ask: 'Which deals are slipping?' },
      { title: 'Advance the work', detail: 'Rook can move a stage or draft a follow-up for you. Just ask.', ask: 'Draft a follow-up for my biggest open deal' },
    ],
  },
  {
    id: 'forecasting', title: 'Read the forecast', icon: 'trendUp', minutes: 5, level: 'Core',
    blurb: 'Weighted forecast, coverage, and the scenarios leaders ask about.',
    steps: [
      { title: 'Open forecasting', detail: 'Commit, best case, and full pipeline in one place, live off the book.', to: '/forecasting' },
      { title: 'Ask for the number', detail: 'Rook knows your forecast cold. Ask and it answers with the math.', ask: 'What is my weighted forecast this quarter?' },
    ],
  },
  {
    id: 'reports', title: 'Build a report', icon: 'pie', minutes: 7, level: 'Core',
    blurb: 'From a blank canvas to a saved report your team can use.',
    steps: [
      { title: 'Open the report builder', detail: 'Start from a template or a blank report. Pick the object, the columns, and the filters.', to: '/report-builder' },
      { title: 'Describe what you need', detail: 'Tell Rook the report you want in plain language and it assembles it.', ask: 'Build a report of open deals over 100k closing this quarter by owner' },
      { title: 'Save and share', detail: 'Saved reports live under Reports and feed dashboards.', to: '/reports' },
    ],
  },
  {
    id: 'rook', title: 'Master Rook', icon: 'sparkles', minutes: 6, level: 'Power up',
    blurb: 'The AI operator: ask, build, and stand up whole accounts by voice.',
    steps: [
      { title: 'Turn on voice mode', detail: 'Open Rook and hit the voice button. Speak naturally - Rook listens, answers out loud, and can take you anywhere.', ask: 'Find the Vertex Robotics account' },
      { title: 'Stand up an account', detail: 'One sentence builds a company, buying committee, a deal, and first tasks.', ask: 'Set up Northwind Freight as an enterprise account with a 180k deal and a first-call task Friday' },
      { title: 'Ask about the business', detail: 'Rook is grounded in your whole workspace. Ask anything.', ask: 'Which accounts have we not touched in 30 days?' },
    ],
  },
  {
    id: 'data', title: 'Bring your data in', icon: 'swap', minutes: 8, level: 'Setup',
    blurb: 'Import, map, cleanse, and go live without a year-long project.',
    steps: [
      { title: 'Open the migration wizard', detail: 'Upload your export and Ardovo analyzes it: unmapped columns, empty fields, jammed data, and duplicates.', to: '/migrate' },
      { title: 'Cleanse in review', detail: 'Fix and remap right in the app before anything touches production. You do not do this alone in a spreadsheet.', to: '/migrate' },
      { title: 'Stage and go live', detail: 'Review, stage, then push to production when it is clean.', to: '/migrate' },
    ],
  },
];

export function getModule(id) { return MODULES.find(m => m.id === id) || null; }

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function freshState() { return { sessions: [], active: null }; }
function normalize(s) {
  return { sessions: Array.isArray(s?.sessions) ? s.sessions : [], active: s?.active || null };
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
   SESSION LIFECYCLE
   ============================================================ */
export function startSession(moduleId = null) {
  const active = {
    id: newId('ts'),
    startedAt: new Date().toISOString(),
    moduleIds: moduleId ? [moduleId] : [],
    steps: [],       // { moduleId, stepTitle, at }
    asks: [],        // prompts sent to Rook during training
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
  const started = new Date(a.startedAt);
  const durationMin = Math.max(1, Math.round((ended - started) / 60000));
  const modules = a.moduleIds.map(id => getModule(id)?.title || id);
  const session = {
    id: a.id,
    startedAt: a.startedAt,
    endedAt: ended.toISOString(),
    durationMin,
    moduleIds: a.moduleIds,
    stepsCompleted: a.steps.length,
    asks: a.asks.length,
    summary: buildSummary(modules, a.steps.length, durationMin, a.asks),
  };
  commit({ sessions: [session, ...state.sessions], active: null });
  return session;
}
export function cancelSession() { commit({ ...state, active: null }); }

function buildSummary(modules, stepsCompleted, durationMin, asks) {
  const modText = modules.length
    ? `Covered ${modules.length} module${modules.length === 1 ? '' : 's'}: ${modules.join(', ')}.`
    : 'Freeform session.';
  const stepText = `${stepsCompleted} step${stepsCompleted === 1 ? '' : 's'} completed in ${durationMin} minute${durationMin === 1 ? '' : 's'}.`;
  const askText = asks.length ? ` Asked Rook ${asks.length} question${asks.length === 1 ? '' : 's'}, including "${asks[0].prompt}".` : '';
  return `${modText} ${stepText}${askText}`;
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
