// ============================================================
// ARDOVO MOMENTUM  (local-first, Supabase-swappable)
// A gamified, adaptive competence ramp. A rep proves mastery by
// doing REAL work inside the CRM, not by watching videos. Every
// quest is verified by reading live state from src/lib/store.js
// (read-only) and comparing it to a per-user baseline captured on
// first run. Where no store read exists, the quest deep-links to
// the feature and accepts an explicit "mark done".
//
// XP, levels, daily streaks, role-based ramp paths, and a manager
// leaderboard all derive from that verified progress. A tiny
// pub/sub (mirroring store.js / goals-data.js) re-renders any
// subscriber on write. Everything persists to localStorage so the
// ramp stays alive across reloads.
//
// SUPABASE: rally_momentum (user_id, role, completed jsonb, marked
// jsonb, baseline jsonb, streak, best_streak, last_active, seen_level).
// ASCII hyphen only. No em-dash or en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getCurrentUser, getUsers,
  getDeals, getContacts, getCompanies, getActivities,
} from './store.js';

const LS_KEY = 'rally_momentum_v1';

/* ============================================================
   LEVELS  (XP thresholds -> named tiers with a badge)
   ============================================================ */
export const LEVELS = [
  { level: 1, name: 'Newcomer',  badge: 'I',   color: 'var(--n-600)',        blurb: 'Just landed. Learning the room.' },
  { level: 2, name: 'Rookie',    badge: 'II',  color: 'var(--info)',         blurb: 'Moving on your own. The basics are yours.' },
  { level: 3, name: 'Operator',  badge: 'III', color: 'var(--accent)',       blurb: 'Running the system without a map.' },
  { level: 4, name: 'Closer',    badge: 'IV',  color: 'var(--accent-purple)',blurb: 'Turning motion into won deals.' },
  { level: 5, name: 'Rainmaker', badge: 'V',   color: 'var(--warn)',         blurb: 'Pipeline follows you around.' },
  { level: 6, name: 'Legend',    badge: 'VI',  color: 'var(--ok)',           blurb: 'Fully ramped. Teach the next one.' },
];
const LEVEL_XP = [0, 120, 300, 520, 800, 1120]; // min XP for level index+1

export function levelForXp(xp = 0) {
  let idx = 0;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const floor = LEVEL_XP[idx];
  const ceil = next ? LEVEL_XP[idx + 1] : floor;
  const span = Math.max(1, ceil - floor);
  const into = xp - floor;
  return {
    ...cur,
    next,
    xp,
    xpIntoLevel: into,
    xpForLevel: next ? span : 0,
    xpToNext: next ? Math.max(0, ceil - xp) : 0,
    pctToNext: next ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 100,
    isMax: !next,
  };
}

/* ============================================================
   ROLES  (each owns an ordered ramp path)
   ============================================================ */
export const ROLES = [
  { id: 'ae',      label: 'Account Executive', short: 'AE',      icon: 'deals',    desc: 'Own deals end to end and close them.' },
  { id: 'sdr',     label: 'Sales Development',  short: 'SDR',     icon: 'megaphone',desc: 'Build pipeline through outbound motion.' },
  { id: 'manager', label: 'Sales Manager',      short: 'Manager', icon: 'users',    desc: 'Coach the team and read the numbers.' },
  { id: 'revops',  label: 'Revenue Ops',        short: 'RevOps',  icon: 'workflow', desc: 'Wire the system the whole team runs on.' },
];
export const roleById = (id) => ROLES.find(r => r.id === id) || ROLES[0];

/* ---------- ramp tiers (the shape of every path) ---------- */
export const TIERS = [
  { tier: 1, name: 'Day one basics',  blurb: 'Get moving in your first morning.' },
  { tier: 2, name: 'Proficient',      blurb: 'Do the core job without help.' },
  { tier: 3, name: 'Power user',      blurb: 'Compound the platform into results.' },
];

/* ============================================================
   QUEST CATALOG
   A quest is EITHER store-verified (has a `metric`, proven by a
   real read from store.js) or manual (deep-links to the feature
   and accepts an explicit mark-done). `delta` is how much a
   store metric must rise above the user baseline to count for the
   person ramping. `target` is the absolute count used to score
   OTHER reps on the manager leaderboard (we cannot know their
   baseline, so we read what they actually own).
   ============================================================ */
const Q = {
  tour: {
    id: 'tour', title: 'Take the tour', icon: 'home', xp: 40, tier: 1,
    desc: 'Open the Command Center and get the lay of the land.',
    route: '/app', cta: 'Open Command Center', manual: true,
  },
  addCompany: {
    id: 'addCompany', title: 'Add your first company', icon: 'building', xp: 60, tier: 1,
    desc: 'Create an account you are working.',
    route: '/companies', cta: 'Add a company', metric: 'companies', delta: 1, target: 3,
  },
  addContact: {
    id: 'addContact', title: 'Add a contact', icon: 'user', xp: 60, tier: 1,
    desc: 'Put a real human into your book of business.',
    route: '/contacts', cta: 'Add a contact', metric: 'contacts', delta: 1, target: 4,
  },
  firstDeal: {
    id: 'firstDeal', title: 'Create your first deal', icon: 'deals', xp: 90, tier: 1,
    desc: 'Open a pipeline opportunity you can drive.',
    route: '/deals', cta: 'Create a deal', metric: 'deals', delta: 1, target: 3,
  },
  logActivity: {
    id: 'logActivity', title: 'Log an activity', icon: 'activity', xp: 60, tier: 1,
    desc: 'Book a call, email, meeting, or task.',
    route: '/activities', cta: 'Log an activity', metric: 'activities', delta: 1, target: 5,
  },
  completeTask: {
    id: 'completeTask', title: 'Close out a task', icon: 'checkSquare', xp: 70, tier: 2,
    desc: 'Mark an activity done and clear it off your plate.',
    route: '/activities', cta: 'Work your tasks', metric: 'doneActivities', delta: 1, target: 3,
  },
  advanceStage: {
    id: 'advanceStage', title: 'Advance a deal', icon: 'trendUp', xp: 100, tier: 2,
    desc: 'Move a deal forward a stage on the board.',
    route: '/deals', cta: 'Open the pipeline', metric: 'stageMoves', delta: 1, target: 2,
  },
  handshake: {
    id: 'handshake', title: 'Run a Handshake', icon: 'sparkles', xp: 90, tier: 2,
    desc: 'Let the agent qualify and hand off a live opportunity.',
    route: '/handshake', cta: 'Start a Handshake', manual: true,
  },
  sequence: {
    id: 'sequence', title: 'Start a sequence', icon: 'send', xp: 80, tier: 2,
    desc: 'Put a prospect into a multi-touch cadence.',
    route: '/sequences', cta: 'Open sequences', manual: true,
  },
  lesson: {
    id: 'lesson', title: 'Complete a lesson', icon: 'book', xp: 70, tier: 2,
    desc: 'Finish one Academy lesson to sharpen the craft.',
    route: '/academy', cta: 'Open Academy', manual: true,
  },
  campaign: {
    id: 'campaign', title: 'Send a campaign', icon: 'megaphone', xp: 90, tier: 3,
    desc: 'Launch a marketing campaign to an audience.',
    route: '/campaigns', cta: 'Open campaigns', manual: true,
  },
  report: {
    id: 'report', title: 'Build a report', icon: 'chart', xp: 90, tier: 3,
    desc: 'Assemble a report you can read every morning.',
    route: '/reports', cta: 'Open reports', manual: true,
  },
  dashboard: {
    id: 'dashboard', title: 'Pin a dashboard', icon: 'pie', xp: 80, tier: 3,
    desc: 'Build a live KPI dashboard leaders will trust.',
    route: '/dashboards', cta: 'Open dashboards', manual: true,
  },
  buildPipeline: {
    id: 'buildPipeline', title: 'Build real pipeline', icon: 'layers', xp: 140, tier: 3,
    desc: 'Have three or more deals live in your pipeline.',
    route: '/deals', cta: 'Grow your pipeline', metric: 'deals', delta: 3, target: 3,
  },
  multiThread: {
    id: 'multiThread', title: 'Multi-thread an account', icon: 'share2', xp: 120, tier: 3,
    desc: 'Reach five or more contacts across your accounts.',
    route: '/contacts', cta: 'Add more contacts', metric: 'contacts', delta: 5, target: 5,
  },
  winDeal: {
    id: 'winDeal', title: 'Win a deal', icon: 'star', xp: 200, tier: 3,
    desc: 'Move an opportunity all the way to Closed Won.',
    route: '/deals', cta: 'Close a deal', metric: 'wonDeals', delta: 1, target: 1,
  },
  setGoal: {
    id: 'setGoal', title: 'Set a goal', icon: 'target', xp: 80, tier: 1,
    desc: 'Define a target so pacing has something to measure.',
    route: '/goals', cta: 'Open Goals', manual: true,
  },
  reviewTeam: {
    id: 'reviewTeam', title: 'Review the team', icon: 'users', xp: 90, tier: 2,
    desc: 'Open the team roster and read where everyone stands.',
    route: '/team', cta: 'Open Team', manual: true,
  },
  forecast: {
    id: 'forecast', title: 'Read the forecast', icon: 'trendUp', xp: 100, tier: 2,
    desc: 'Open Forecasting and sanity-check the call.',
    route: '/forecasting', cta: 'Open Forecasting', manual: true,
  },
  workflow: {
    id: 'workflow', title: 'Ship a workflow', icon: 'workflow', xp: 120, tier: 3,
    desc: 'Automate one repetitive step for the whole team.',
    route: '/workflows', cta: 'Open Workflows', manual: true,
  },
  importData: {
    id: 'importData', title: 'Import records', icon: 'upload', xp: 90, tier: 2,
    desc: 'Bring existing data into the CRM cleanly.',
    route: '/import', cta: 'Open Import', manual: true,
  },
};

/* ---------- role paths (ordered; tier drives the grouping) ---------- */
const ROLE_PATHS = {
  ae:      ['tour', 'addCompany', 'addContact', 'firstDeal', 'logActivity',
            'completeTask', 'advanceStage', 'handshake', 'lesson',
            'buildPipeline', 'multiThread', 'winDeal'],
  sdr:     ['tour', 'addCompany', 'addContact', 'logActivity', 'firstDeal',
            'completeTask', 'sequence', 'handshake', 'lesson',
            'multiThread', 'campaign', 'buildPipeline'],
  manager: ['tour', 'setGoal', 'addContact', 'firstDeal',
            'reviewTeam', 'forecast', 'advanceStage', 'lesson',
            'report', 'dashboard', 'winDeal'],
  revops:  ['tour', 'addCompany', 'importData', 'logActivity',
            'completeTask', 'forecast', 'lesson',
            'workflow', 'report', 'dashboard', 'buildPipeline'],
};

export function questsForRole(roleId) {
  return (ROLE_PATHS[roleId] || ROLE_PATHS.ae).map(id => Q[id]).filter(Boolean);
}

/* ============================================================
   STORE READS  (per-owner counts, all from store.js)
   ============================================================ */
function ownedCount(userId, metric) {
  switch (metric) {
    case 'deals':          return getDeals().filter(d => d.ownerId === userId).length;
    case 'wonDeals':       return getDeals().filter(d => d.ownerId === userId && d.status === 'won').length;
    case 'openDeals':      return getDeals().filter(d => d.ownerId === userId && d.status === 'open').length;
    case 'contacts':       return getContacts().filter(c => c.ownerId === userId).length;
    case 'companies':      return getCompanies().filter(c => c.ownerId === userId).length;
    case 'activities':     return getActivities().filter(a => a.ownerId === userId).length;
    case 'doneActivities': return getActivities().filter(a => a.ownerId === userId && a.done).length;
    case 'stageMoves':     return getActivities().filter(a => a.ownerId === userId && typeof a.subject === 'string' && a.subject.indexOf('Stage moved:') === 0).length;
    default:               return 0;
  }
}

const METRICS = ['deals', 'wonDeals', 'openDeals', 'contacts', 'companies', 'activities', 'doneActivities', 'stageMoves'];
function snapshotBaseline(userId) {
  const base = {};
  for (const m of METRICS) base[m] = ownedCount(userId, m);
  return base;
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
const subs = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') return { role: 'ae', progress: {}, ...s };
    }
  } catch {}
  return { role: 'ae', progress: {} };
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function useMomentum(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- role selection ---------- */
export function getRole() { return state.role || 'ae'; }
export function setRole(roleId) {
  if (!roleById(roleId)) return;
  commit({ ...state, role: roleId });
}

/* ---------- per-user progress ---------- */
function currentUserId() { return getCurrentUser()?.id || 'u_1'; }

function blankProgress(userId) {
  return {
    baseline: snapshotBaseline(userId),
    completed: {},   // questId -> timestamp
    marked: {},      // questId -> true (manual mark-done)
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    seenLevel: 1,
  };
}

export function ensureProgress(userId = currentUserId()) {
  if (!state.progress[userId]) {
    commit({ ...state, progress: { ...state.progress, [userId]: blankProgress(userId) } });
  }
  return state.progress[userId];
}

export function getProgress(userId = currentUserId()) {
  return state.progress[userId] || blankProgress(userId);
}

/* ============================================================
   QUEST STATUS  (the verification model in one place)
   For the person ramping we prove NEW work: the store metric must
   have risen `delta` above the baseline OR the quest was manually
   marked OR it was already stamped complete. Once true we stamp a
   timestamp so the win is permanent even if a record is later
   removed (you proved it once).
   ============================================================ */
export function isQuestAchieved(quest, userId = currentUserId()) {
  const p = getProgress(userId);
  if (p.completed[quest.id]) return true;
  if (p.marked[quest.id]) return true;
  if (quest.metric) {
    const now = ownedCount(userId, quest.metric);
    const base = (p.baseline && p.baseline[quest.metric]) || 0;
    return (now - base) >= (quest.delta || 1);
  }
  return false;
}

export function questStatus(quest, userId = currentUserId()) {
  return isQuestAchieved(quest, userId) ? 'done' : 'todo';
}

/* Progress toward a store-verified quest (0..1) for a nicer UI. */
export function questProgress(quest, userId = currentUserId()) {
  const p = getProgress(userId);
  if (p.completed[quest.id] || p.marked[quest.id]) return 1;
  if (!quest.metric) return 0;
  const now = ownedCount(userId, quest.metric);
  const base = (p.baseline && p.baseline[quest.metric]) || 0;
  const need = quest.delta || 1;
  return Math.max(0, Math.min(1, (now - base) / need));
}

/* ============================================================
   RECONCILE  (stamp newly-completed quests, detect a level up)
   Call on mount and whenever the store changes. Returns the list
   of quests that just crossed the finish line plus level info so
   the page can celebrate exactly once.
   ============================================================ */
export function reconcile(userId = currentUserId()) {
  ensureProgress(userId);
  const p = { ...getProgress(userId) };
  const completed = { ...p.completed };
  const quests = questsForRole(getRole());
  const newlyCompleted = [];

  for (const q of quests) {
    if (completed[q.id]) continue;
    if (p.marked[q.id] || (q.metric && (ownedCount(userId, q.metric) - ((p.baseline && p.baseline[q.metric]) || 0)) >= (q.delta || 1))) {
      completed[q.id] = Date.now();
      newlyCompleted.push(q);
    }
  }
  if (newlyCompleted.length) {
    commit({ ...state, progress: { ...state.progress, [userId]: { ...p, completed } } });
  }

  const curLevel = levelForXp(totalXp(getRole(), userId)).level;
  const seen = getProgress(userId).seenLevel || 1;
  return { newlyCompleted, leveledUp: curLevel > seen, level: curLevel };
}

/* Manual mark-done for quests with no store read. */
export function markQuest(questId, userId = currentUserId()) {
  ensureProgress(userId);
  const p = getProgress(userId);
  if (p.marked[questId] && p.completed[questId]) return;
  const marked = { ...p.marked, [questId]: true };
  const completed = { ...p.completed };
  if (!completed[questId]) completed[questId] = Date.now();
  commit({ ...state, progress: { ...state.progress, [userId]: { ...p, marked, completed } } });
}

/* Undo a manual mark-done (store-verified quests cannot be undone). */
export function unmarkQuest(questId, userId = currentUserId()) {
  const q = Q[questId];
  if (!q || q.metric) return; // only manual quests are reversible
  const p = getProgress(userId);
  const marked = { ...p.marked }; delete marked[questId];
  const completed = { ...p.completed }; delete completed[questId];
  commit({ ...state, progress: { ...state.progress, [userId]: { ...p, marked, completed } } });
}

export function ackLevel(level, userId = currentUserId()) {
  const p = getProgress(userId);
  if ((p.seenLevel || 1) >= level) return;
  commit({ ...state, progress: { ...state.progress, [userId]: { ...p, seenLevel: level } } });
}

export function resetMomentum(userId = currentUserId()) {
  const progress = { ...state.progress };
  progress[userId] = blankProgress(userId);
  commit({ ...state, progress });
}

/* ============================================================
   DAILY STREAK
   A day counts once the rep is active (opens the ramp or completes
   a quest). Consecutive local days extend the flame; a gap resets
   it to one. Best streak is remembered.
   ============================================================ */
function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad), db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

export function pingStreak(userId = currentUserId()) {
  ensureProgress(userId);
  const p = getProgress(userId);
  const today = dayKey();
  if (p.lastActiveDay === today) return p.streak;
  let streak = 1;
  if (p.lastActiveDay && daysBetween(p.lastActiveDay, today) === 1) streak = (p.streak || 0) + 1;
  const bestStreak = Math.max(p.bestStreak || 0, streak);
  commit({ ...state, progress: { ...state.progress, [userId]: { ...p, streak, bestStreak, lastActiveDay: today } } });
  return streak;
}

/* ============================================================
   DERIVED SUMMARIES
   ============================================================ */
export function totalXp(roleId = getRole(), userId = currentUserId()) {
  const quests = questsForRole(roleId);
  return quests.reduce((sum, q) => sum + (isQuestAchieved(q, userId) ? q.xp : 0), 0);
}
export function maxXp(roleId = getRole()) {
  return questsForRole(roleId).reduce((s, q) => s + q.xp, 0);
}

export function rampSummary(roleId = getRole(), userId = currentUserId()) {
  const quests = questsForRole(roleId);
  const done = quests.filter(q => isQuestAchieved(q, userId));
  const xp = done.reduce((s, q) => s + q.xp, 0);
  const lvl = levelForXp(xp);
  return {
    total: quests.length,
    done: done.length,
    percent: quests.length ? Math.round((done.length / quests.length) * 100) : 0,
    xp,
    maxXp: maxXp(roleId),
    level: lvl,
    badgesEarned: done.length,
  };
}

/* The single most useful thing to do next: first incomplete quest,
   lowest tier first, keeping the authored order within a tier. */
export function nextBestQuest(roleId = getRole(), userId = currentUserId()) {
  const quests = questsForRole(roleId);
  const todo = quests.filter(q => !isQuestAchieved(q, userId));
  if (!todo.length) return null;
  todo.sort((a, b) => (a.tier - b.tier));
  return todo[0];
}

/* Quests grouped by tier for the ramp path view. */
export function rampByTier(roleId = getRole(), userId = currentUserId()) {
  const quests = questsForRole(roleId);
  return TIERS.map(t => {
    const items = quests.filter(q => q.tier === t.tier);
    const done = items.filter(q => isQuestAchieved(q, userId)).length;
    return { ...t, items, done, total: items.length, complete: items.length > 0 && done === items.length };
  }).filter(g => g.total > 0);
}

/* ============================================================
   MANAGER VIEW  (team ramp leaderboard)
   Scored off REAL store ownership so no one has to sit through a
   check-in meeting. We can only read what other reps actually own
   (not their baseline), so a rep's ramp here is the share of the
   role's store-verifiable quests their live records satisfy.
   ============================================================ */
export function teamRamp(roleId = getRole()) {
  const meId = currentUserId();
  const storeQuests = questsForRole(roleId).filter(q => q.metric);
  const total = storeQuests.length || 1;
  const rows = getUsers().filter(u => u.role === 'rep').map(u => {
    const doneQuests = storeQuests.filter(q => ownedCount(u.id, q.metric) >= (q.target || 1));
    const done = doneQuests.length;
    const xp = doneQuests.reduce((s, q) => s + q.xp, 0);
    const percent = Math.round((done / total) * 100);
    const status = percent >= 80 ? 'ramped' : percent >= 40 ? 'ramping' : 'behind';
    return { user: u, done, total, percent, xp, level: levelForXp(xp), status, isMe: u.id === meId };
  });
  rows.sort((a, b) => b.percent - a.percent || b.xp - a.xp);
  return rows;
}

export const RAMP_STATUS = {
  ramped:  { label: 'Ramped',  tone: 'ok',      color: 'var(--ok)' },
  ramping: { label: 'Ramping', tone: 'accent',  color: 'var(--accent)' },
  behind:  { label: 'Behind',  tone: 'warn',    color: 'var(--warn)' },
};

/* Whether the current viewer can see the manager leaderboard. */
export function isManagerView() {
  const u = getCurrentUser();
  return !!u && (u.role === 'manager' || getRole() === 'manager');
}
