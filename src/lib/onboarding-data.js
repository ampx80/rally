// ============================================================
// RALLY ONBOARDING STATE  (local-first, reactive)
// One module owns the first-run experience state: the wizard's
// per-step answers, completion, dismissal, and a "Getting started"
// checklist that reflects REAL progress by comparing live store
// counts against a baseline captured the first time onboarding runs.
// Mirrors the pub/sub shape of src/lib/modules.js so nav + widgets
// re-render on change. NO em-dash / en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals, getContacts, getCompanies, useStore } from './store.js';

const LS = 'rally_onboarding_v1';

/* The wizard steps, in order. Kept here so the page and the progress
   rail read one source of truth. */
export const ONBOARDING_STEPS = [
  { key: 'welcome',  label: 'Welcome' },
  { key: 'team',     label: 'Your team' },
  { key: 'modules',  label: 'Modules' },
  { key: 'data',     label: 'Your data' },
  { key: 'invite',   label: 'Invite' },
  { key: 'ready',    label: 'Ready' },
];

export const ROLES = [
  { id: 'ae',        label: 'Sales rep / AE',      icon: 'target',   blurb: 'Own a pipeline and close deals.' },
  { id: 'manager',   label: 'Sales leader',        icon: 'trendUp',  blurb: 'Coach the team and call the forecast.' },
  { id: 'founder',   label: 'Founder / Owner',     icon: 'rocket',   blurb: 'Run the whole revenue engine.' },
  { id: 'revops',    label: 'RevOps / Admin',      icon: 'sliders',  blurb: 'Configure the system for everyone.' },
  { id: 'marketing', label: 'Marketing',           icon: 'megaphone',blurb: 'Drive demand and hand off leads.' },
  { id: 'cs',        label: 'Customer success',    icon: 'users',    blurb: 'Onboard and grow customers.' },
];

export const TEAM_SIZES = ['Just me', '2-10', '11-50', '51-200', '200+'];

export const USE_CASES = [
  { id: 'pipeline',  label: 'Manage my pipeline',   icon: 'funnel' },
  { id: 'forecast',  label: 'Forecast revenue',     icon: 'trendUp' },
  { id: 'outbound',  label: 'Run outbound',         icon: 'send' },
  { id: 'onboard',   label: 'Onboard customers',    icon: 'grid' },
  { id: 'migrate',   label: 'Replace another CRM',  icon: 'download' },
];

/* ---------- baseline (captured once, powers REAL progress) ---------- */
function snapshotCounts() {
  try {
    return {
      deals: getDeals().length,
      contacts: getContacts().length,
      companies: getCompanies().length,
    };
  } catch {
    return { deals: 0, contacts: 0, companies: 0 };
  }
}

function defaults() {
  return {
    version: 1,
    completed: false,
    dismissedChecklist: false,
    currentStep: 0,
    profile: { role: '', teamSize: '', useCase: '' },
    dataChoice: '',        // 'import' | 'sample' | ''
    dataReady: false,      // chose sample data or ran an import
    invited: [],           // emails invited during onboarding
    metRook: false,        // opened the AI operator at least once
    startedAt: null,
    completedAt: null,
    baseline: snapshotCounts(),
  };
}

/* ---------- persistence + pub/sub ---------- */
const subs = new Set();
function read() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  const seed = defaults();
  seed.startedAt = new Date().toISOString();
  try { localStorage.setItem(LS, JSON.stringify(seed)); } catch {}
  return seed;
}
let state = read();

function commit(next) {
  state = next;
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function getOnboardingState() { return state; }

export function setOnboardingState(patch) {
  commit({ ...state, ...(typeof patch === 'function' ? patch(state) : patch) });
  return state;
}

export function resetOnboarding() {
  try { localStorage.removeItem(LS); } catch {}
  state = read();
  subs.forEach(fn => fn(state));
}

/* ---------- targeted writers ---------- */
export function setProfile(patch) {
  commit({ ...state, profile: { ...state.profile, ...patch } });
}
export function setDataChoice(choice) {
  commit({ ...state, dataChoice: choice, dataReady: state.dataReady || choice === 'sample' });
}
export function markDataReady() {
  commit({ ...state, dataReady: true });
}
export function addInvites(emails = []) {
  const clean = emails.map(e => String(e).trim().toLowerCase()).filter(Boolean);
  const next = Array.from(new Set([...(state.invited || []), ...clean]));
  commit({ ...state, invited: next });
}
export function markRookMet() {
  if (state.metRook) return;
  commit({ ...state, metRook: true });
}
export function goToStep(i) {
  commit({ ...state, currentStep: Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, i)) });
}
export function completeOnboarding() {
  commit({ ...state, completed: true, completedAt: new Date().toISOString(), currentStep: ONBOARDING_STEPS.length - 1 });
}
export function dismissChecklist() {
  commit({ ...state, dismissedChecklist: true });
}
export function restartOnboarding() {
  commit({ ...defaults(), baseline: snapshotCounts(), startedAt: new Date().toISOString() });
}

/* ---------- first-run routing helper ---------- */
// True when the wizard has never been finished and was not skipped away.
export function shouldShowOnboarding() {
  return !state.completed && !state.dismissedChecklist;
}

/* ============================================================
   GETTING-STARTED CHECKLIST  (reflects real progress)
   Each item's `done` blends recorded wizard answers with live
   store deltas vs the captured baseline, so importing data or
   creating a deal in the real app ticks the box on its own.
   ============================================================ */
function recordsGrew(s) {
  const now = snapshotCounts();
  const b = s.baseline || { deals: 0, contacts: 0, companies: 0 };
  return (now.contacts + now.companies + now.deals) > (b.contacts + b.companies + b.deals);
}
function dealsGrew(s) {
  const now = snapshotCounts();
  const b = s.baseline || { deals: 0 };
  return now.deals > b.deals;
}

export function computeChecklist(s = state) {
  const profileDone = !!(s.profile?.role && s.profile?.teamSize);
  const dataDone = !!s.dataReady || recordsGrew(s);
  const dealDone = dealsGrew(s);
  const inviteDone = (s.invited?.length || 0) > 0;
  const rookDone = !!s.metRook;
  return [
    { key: 'profile', label: 'Set up your workspace', desc: 'Tell Rally about your team and goals.',
      done: profileDone, cta: { label: 'Finish setup', to: '/onboarding' } },
    { key: 'data', label: 'Bring in your data', desc: 'Import from a CSV or explore with sample data.',
      done: dataDone, cta: { label: 'Import data', to: '/import' } },
    { key: 'deal', label: 'Create your first deal', desc: 'Add a live opportunity to your pipeline.',
      done: dealDone, cta: { label: 'New deal', to: '/deals?new=1' } },
    { key: 'invite', label: 'Invite your team', desc: 'Rally is better with your whole revenue org.',
      done: inviteDone, cta: { label: 'Invite people', to: '/team' } },
    { key: 'rook', label: 'Meet Rook, your AI operator', desc: 'Ask a question or let Rook build an account.',
      done: rookDone, cta: { label: 'Open Rook', action: 'rook' } },
  ];
}

export function checklistProgress(s = state) {
  const items = computeChecklist(s);
  const done = items.filter(i => i.done).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

/* ---------- hooks ---------- */
// Reactive snapshot of the onboarding slice.
export function useOnboarding() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = (s) => setSnap({ ...s });
    subs.add(fn);
    fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

// Checklist recomputed on BOTH onboarding changes and store changes, so a
// deal created anywhere in the app ticks its box without a reload.
export function useChecklist() {
  const onb = useOnboarding();
  useStore(); // subscribe to store mutations (deals/contacts/companies)
  const items = computeChecklist(onb);
  const done = items.filter(i => i.done).length;
  return { items, done, total: items.length, pct: Math.round((done / items.length) * 100), onb };
}
