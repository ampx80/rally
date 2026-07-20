// ============================================================
// ARDOVA SKILL GRAPH  (local-first, pub/sub)
// ------------------------------------------------------------
// The data spine behind Skill Map (src/pages/SkillMap.jsx): a
// game-like "tech tree" of every Ardova skill. Skills are grouped
// by product area, wired with prerequisites into a DAG, and carry
// a per-user mastery level (locked / learning / proficient /
// mastered).
//
// Mastery advances by DOING. Where the real book of business
// carries a signal (deals exist, activities logged, open pipeline
// to forecast) we read it straight from the store (read-only) and
// let it raise a skill's level automatically. Everywhere else the
// user advances by launching the lesson and marking a rep as
// practiced; those marks persist to localStorage per user so the
// map feels alive across reloads.
//
// The store here is intentionally standalone (no store.js writes):
// it only tracks practice marks. All CRM signals are pure reads.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getDeals, getContacts, getCompanies, getActivities, getUsers,
} from './store.js';

/* ============================================================
   AREAS  (constellation clusters, each a distinct colour)
   ============================================================ */
export const AREAS = [
  { id: 'pipeline',    label: 'Pipeline',        icon: 'target',     color: '#0e9f8f' },
  { id: 'contacts',    label: 'Contacts',        icon: 'users',      color: '#2f6fed' },
  { id: 'forecasting', label: 'Forecasting',     icon: 'trendUp',    color: '#1a9f5a' },
  { id: 'marketing',   label: 'Marketing/Email', icon: 'megaphone',  color: '#e0752d' },
  { id: 'automation',  label: 'Automation',      icon: 'zap',        color: '#7c5cf7' },
  { id: 'reporting',   label: 'Reporting',       icon: 'chart',      color: '#d4a017' },
  { id: 'payments',    label: 'Payments',        icon: 'creditCard', color: '#e0518a' },
  { id: 'agents',      label: 'Agents/AI',       icon: 'sparkles',   color: '#12a5c9' },
  { id: 'admin',       label: 'Admin',           icon: 'shield',     color: '#7a8699' },
];
export const AREA_BY_ID = new Map(AREAS.map(a => [a.id, a]));
export const areaColor = (id) => AREA_BY_ID.get(id)?.color || '#7a8699';

/* ============================================================
   MASTERY LEVELS
   ============================================================ */
export const LEVELS = {
  locked:     { key: 'locked',     label: 'Locked',     order: 0, value: 0, color: '#9aa3b2' },
  learning:   { key: 'learning',   label: 'Learning',   order: 1, value: 1, color: '#d4a017' },
  proficient: { key: 'proficient', label: 'Proficient', order: 2, value: 2, color: '#2f6fed' },
  mastered:   { key: 'mastered',   label: 'Mastered',   order: 3, value: 3, color: '#1a9f5a' },
};
export const LEVEL_ORDER = ['locked', 'learning', 'proficient', 'mastered'];
export const levelValue = (lvl) => LEVELS[lvl]?.value ?? 0;

// Progress thresholds. A skill is unlocked when every prerequisite is at
// least proficient. Once unlocked its progress (0..1+) maps to a level:
const PROFICIENT_AT = 0.5;   // half-way = proficient
const MASTERED_AT = 1.0;     // full = mastered
const PRACTICE_STEP = 0.45;  // each "mark practiced" adds this much progress

/* ============================================================
   SKILLS  (the nodes). Each: id, label, area, prereqs[], route,
   desc, and an optional signal() that reads the real book of
   business for the given user and returns progress in 0..1.
   route is where the skill "lives"; clicking a node can navigate
   there and/or fire the ardova:companion lesson.
   ============================================================ */
export const SKILLS = [
  /* ---------- Pipeline ---------- */
  { id: 'pl-deals', area: 'pipeline', label: 'Track deals', route: '/deals', prereqs: [],
    desc: 'Open the pipeline board and keep every opportunity current.',
    signal: (c) => Math.min(1, c.deals.length / 3) },
  { id: 'pl-stages', area: 'pipeline', label: 'Move deal stages', route: '/deals', prereqs: ['pl-deals'],
    desc: 'Advance deals through the stages and read stage probability.',
    signal: (c) => {
      const stages = new Set(c.deals.map(d => d.stage));
      const won = c.deals.filter(d => d.status === 'won').length;
      return Math.min(1, (stages.size + won) / 4);
    } },
  { id: 'pl-work', area: 'pipeline', label: 'Work a deal', route: '/deals', prereqs: ['pl-deals'],
    desc: 'Log calls, notes and next steps against a live deal.',
    signal: (c) => Math.min(1, c.activities.filter(a => a.relatedType === 'deal').length / 4) },
  { id: 'pl-leads', area: 'pipeline', label: 'Qualify leads', route: '/leads', prereqs: ['pl-deals'],
    desc: 'Triage the inbound lead inbox and convert the good ones.' },
  { id: 'pl-playbooks', area: 'pipeline', label: 'Apply playbooks', route: '/playbooks', prereqs: ['pl-stages'],
    desc: 'Run guided-selling playbooks so every rep sells the same way.' },
  { id: 'pl-warroom', area: 'pipeline', label: 'Run a war room', route: '/warroom', prereqs: ['pl-stages', 'pl-work'],
    desc: 'Map the buying committee and drive a close plan on a marquee deal.' },

  /* ---------- Contacts ---------- */
  { id: 'ct-contacts', area: 'contacts', label: 'Manage contacts', route: '/contacts', prereqs: [],
    desc: 'Keep people records clean, tagged and owned.',
    signal: (c) => Math.min(1, c.contacts.length / 5) },
  { id: 'ct-companies', area: 'contacts', label: 'Manage companies', route: '/companies', prereqs: [],
    desc: 'Build the account book with health, industry and size.',
    signal: (c) => Math.min(1, c.companies.length / 4) },
  { id: 'ct-activities', area: 'contacts', label: 'Log activities', route: '/activities', prereqs: ['ct-contacts'],
    desc: 'Run your day from the task queue: calls, emails and meetings.',
    signal: (c) => Math.min(1, c.activities.length / 6) },
  { id: 'ct-conversations', area: 'contacts', label: 'Unified inbox', route: '/conversations', prereqs: ['ct-contacts'],
    desc: 'Handle every channel from one omni-inbox thread.' },
  { id: 'ct-success', area: 'contacts', label: 'Customer success', route: '/success', prereqs: ['ct-companies'],
    desc: 'Watch health scores and drive renewals before they slip.' },

  /* ---------- Forecasting ---------- */
  { id: 'fc-forecast', area: 'forecasting', label: 'Read the forecast', route: '/forecasting', prereqs: ['pl-stages'],
    desc: 'Understand weighted forecast, commit and quota attainment.',
    signal: (c) => Math.min(1, c.deals.filter(d => d.status === 'open').length / 3) },
  { id: 'fc-goals', area: 'forecasting', label: 'Set goals', route: '/goals', prereqs: ['fc-forecast'],
    desc: 'Define quotas and pace the team against them.' },
  { id: 'fc-territories', area: 'forecasting', label: 'Design territories', route: '/territories', prereqs: ['fc-forecast'],
    desc: 'Carve the book of business into balanced territories.' },
  { id: 'fc-intel', area: 'forecasting', label: 'Revenue intelligence', route: '/intelligence', prereqs: ['fc-forecast'],
    desc: 'Turn pipeline signals into a prioritized action list.' },
  { id: 'fc-twin', area: 'forecasting', label: 'Revenue twin', route: '/twin', prereqs: ['fc-intel'],
    desc: 'Run a Monte Carlo digital twin of the whole quarter.' },

  /* ---------- Marketing / Email ---------- */
  { id: 'mk-forms', area: 'marketing', label: 'Capture with forms', route: '/forms', prereqs: [],
    desc: 'Build lead-capture forms that feed the CRM.' },
  { id: 'mk-lists', area: 'marketing', label: 'Segment lists', route: '/lists', prereqs: ['ct-contacts'],
    desc: 'Slice the database into audiences you can market to.' },
  { id: 'mk-campaigns', area: 'marketing', label: 'Launch campaigns', route: '/campaigns', prereqs: ['ct-contacts'],
    desc: 'Plan and send a marketing campaign to an audience.' },
  { id: 'mk-sequences', area: 'marketing', label: 'Build sequences', route: '/sequences', prereqs: ['mk-campaigns'],
    desc: 'Automate multi-step email and task cadences.',
    signal: (c) => Math.min(1, c.activities.filter(a => a.type === 'email').length / 3) },
  { id: 'mk-social', area: 'marketing', label: 'Plan social', route: '/social', prereqs: ['mk-campaigns'],
    desc: 'Schedule multi-channel social posts alongside campaigns.' },

  /* ---------- Automation ---------- */
  { id: 'au-workflows', area: 'automation', label: 'Automate workflows', route: '/workflows', prereqs: ['pl-stages'],
    desc: 'Ship no-code rules that move work forward automatically.' },
  { id: 'au-queue', area: 'automation', label: 'Task queues', route: '/queue', prereqs: ['ct-activities'],
    desc: 'Route work into shared queues so nothing is dropped.' },
  { id: 'au-flow', area: 'automation', label: 'Visual flow builder', route: '/flow', prereqs: ['au-workflows'],
    desc: 'Compose branching automations on the visual canvas.' },
  { id: 'au-nightshift', area: 'automation', label: 'Night shift ops', route: '/night-shift', prereqs: ['au-workflows'],
    desc: 'Let Ardova run reversible operations overnight.' },
  { id: 'au-autopilot', area: 'automation', label: 'Autopilot SDR', route: '/autopilot', prereqs: ['au-workflows', 'mk-sequences'],
    desc: 'Hand the SDR motion to an autonomous agent on a trust dial.' },

  /* ---------- Reporting ---------- */
  { id: 'rp-dashboards', area: 'reporting', label: 'Build dashboards', route: '/dashboards', prereqs: ['fc-forecast'],
    desc: 'Assemble live KPI dashboards the team runs on.' },
  { id: 'rp-reports', area: 'reporting', label: 'Custom reports', route: '/reports', prereqs: ['rp-dashboards'],
    desc: 'Author custom reports with the drag-and-drop builder.' },
  { id: 'rp-attribution', area: 'reporting', label: 'Attribution', route: '/attribution', prereqs: ['rp-reports', 'mk-campaigns'],
    desc: 'Credit revenue across every touch with multi-touch models.' },

  /* ---------- Payments ---------- */
  { id: 'pm-products', area: 'payments', label: 'Product catalog', route: '/products', prereqs: [],
    desc: 'Maintain the product and price book behind every quote.' },
  { id: 'pm-quotes', area: 'payments', label: 'Build quotes', route: '/quotes', prereqs: ['pm-products', 'pl-stages'],
    desc: 'Configure, price and quote with approvals (CPQ).' },
  { id: 'pm-payments', area: 'payments', label: 'Collect payments', route: '/payments', prereqs: ['pm-quotes'],
    desc: 'Send payment links and text-to-pay to close the loop.' },
  { id: 'pm-invoices', area: 'payments', label: 'Invoice and AR', route: '/invoices', prereqs: ['pm-quotes'],
    desc: 'Issue invoices and manage AR aging, MRR and ARR.' },

  /* ---------- Agents / AI ---------- */
  { id: 'ai-rook', area: 'agents', label: 'Partner with Rook', route: '/app', rook: true, prereqs: [],
    desc: 'Ask Rook, Ardova\'s copilot, to do real work for you.' },
  { id: 'ai-signals', area: 'agents', label: 'Act on signals', route: '/signals', prereqs: ['fc-forecast'],
    desc: 'Work churn, expansion and intent signals as one feed.' },
  { id: 'ai-agentcloud', area: 'agents', label: 'Agent Cloud', route: '/agent-cloud', prereqs: ['ai-rook'],
    desc: 'Deploy and supervise a fleet of task-running agents.' },
  { id: 'ai-boardroom', area: 'agents', label: 'The Boardroom', route: '/boardroom', prereqs: ['ai-signals', 'fc-twin'],
    desc: 'Convene the autonomous revenue council on the real book.' },
  { id: 'ai-handshake', area: 'agents', label: 'Agent handshake', route: '/handshake', prereqs: ['ai-agentcloud'],
    desc: 'Let our agent negotiate with the buyer\'s agent, deal to deal.' },

  /* ---------- Admin ---------- */
  { id: 'ad-settings', area: 'admin', label: 'Configure Ardova', route: '/settings', prereqs: [],
    desc: 'Tune the workspace, modules and defaults.' },
  { id: 'ad-team', area: 'admin', label: 'Manage the team', route: '/team', prereqs: [],
    desc: 'Invite users and set up the revenue org.' },
  { id: 'ad-import', area: 'admin', label: 'Import data', route: '/import', prereqs: ['ct-contacts'],
    desc: 'Bulk-import and map records into the CRM.' },
  { id: 'ad-roles', area: 'admin', label: 'Roles and permissions', route: '/roles', prereqs: ['ad-team'],
    desc: 'Lock down access with per-module and per-field rules.' },
  { id: 'ad-audit', area: 'admin', label: 'Audit and governance', route: '/audit', prereqs: ['ad-roles'],
    desc: 'Trace every change with the org-wide audit log.' },
];
export const SKILL_BY_ID = new Map(SKILLS.map(s => [s.id, s]));
export const skillsForArea = (areaId) => SKILLS.filter(s => s.area === areaId);

/* ---------- tier (longest prereq chain depth) attached at load ---------- */
(function computeTiers() {
  const depth = new Map();
  const resolve = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 0; // cycle guard (graph is a DAG, this is belt-and-suspenders)
    seen.add(id);
    const s = SKILL_BY_ID.get(id);
    const d = !s || !s.prereqs.length ? 0 : 1 + Math.max(...s.prereqs.map(p => resolve(p, seen)));
    depth.set(id, d);
    return d;
  };
  for (const s of SKILLS) s.tier = resolve(s.id);
})();
export const MAX_TIER = Math.max(...SKILLS.map(s => s.tier));

/* ============================================================
   PROGRESS STORE  (practice marks, local-first + pub/sub)
   shape: { [userId]: { [skillId]: count } }
   ============================================================ */
const LS_KEY = 'ardova_skillmap_v1';
const subs = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
}
let progress = load();

function commit(next) {
  progress = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch {}
  subs.forEach(fn => fn(progress));
}

export function getProgress() { return progress; }

export function practiceCount(skillId, userId) {
  return progress?.[userId]?.[skillId] || 0;
}

// Advance a skill by one practiced rep for a user. Returns the new count.
export function markPracticed(skillId, userId) {
  if (!SKILL_BY_ID.has(skillId) || !userId) return 0;
  const forUser = { ...(progress[userId] || {}) };
  forUser[skillId] = (forUser[skillId] || 0) + 1;
  commit({ ...progress, [userId]: forUser });
  return forUser[skillId];
}

// Wipe practice marks for a user (map "reset my progress"). Signals remain.
export function resetProgress(userId) {
  if (!userId) return;
  const next = { ...progress };
  delete next[userId];
  commit(next);
}

// Reactive snapshot so the whole map re-renders on any practice mark.
export function useSkillmap() {
  const [snap, setSnap] = useState(progress);
  useEffect(() => {
    const fn = (p) => setSnap({ ...p });
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   MASTERY ENGINE
   ============================================================ */
// Per-user CRM signal context, filtered to what that user owns so the team
// coverage view shows real, differentiated mastery across the seeded book.
function contextFor(userId) {
  return {
    deals: getDeals().filter(d => d.ownerId === userId),
    contacts: getContacts().filter(c => c.ownerId === userId),
    companies: getCompanies().filter(c => c.ownerId === userId),
    activities: getActivities().filter(a => a.ownerId === userId),
  };
}

function rawProgress(skill, ctx, userId) {
  let p = 0;
  if (typeof skill.signal === 'function') {
    const s = skill.signal(ctx);
    if (Number.isFinite(s)) p += Math.max(0, Math.min(1, s));
  }
  p += practiceCount(skill.id, userId) * PRACTICE_STEP;
  return p;
}

function levelFromProgress(p) {
  if (p >= MASTERED_AT) return 'mastered';
  if (p >= PROFICIENT_AT) return 'proficient';
  return 'learning';
}

// Compute every skill's resolved state for one user. Prereqs gate unlocking:
// a skill is locked until all of its prereqs are proficient or better. We
// fixpoint-iterate because a skill's lock depends on its prereqs' levels.
export function userSkillState(userId) {
  const ctx = contextFor(userId);
  const raw = {};
  for (const s of SKILLS) raw[s.id] = rawProgress(s, ctx, userId);

  const level = {};
  for (const s of SKILLS) level[s.id] = 'locked';

  let changed = true;
  let guard = 0;
  while (changed && guard < SKILLS.length + 2) {
    changed = false;
    guard++;
    for (const s of SKILLS) {
      const unlocked = s.prereqs.every(p => levelValue(level[p]) >= LEVELS.proficient.value);
      const next = unlocked ? levelFromProgress(raw[s.id]) : 'locked';
      if (next !== level[s.id]) { level[s.id] = next; changed = true; }
    }
  }

  const state = {};
  for (const s of SKILLS) {
    const unlocked = level[s.id] !== 'locked';
    // "next to unlock": reachable now, not yet proficient. These pulse on the map.
    const isNext = unlocked && level[s.id] === 'learning';
    state[s.id] = {
      id: s.id,
      level: level[s.id],
      progress: Math.min(1, raw[s.id]),
      unlocked,
      isNext,
      practiced: practiceCount(s.id, userId),
      // prereqs that are not yet proficient (what blocks a locked node)
      missing: s.prereqs.filter(p => levelValue(level[p]) < LEVELS.proficient.value),
    };
  }
  return state;
}

// Overall mastery: share of the max possible level points, 0..100.
export function overallMastery(userId, state) {
  const st = state || userSkillState(userId);
  const earned = SKILLS.reduce((sum, s) => sum + levelValue(st[s.id].level), 0);
  const max = SKILLS.length * LEVELS.mastered.value;
  return max ? Math.round((earned / max) * 100) : 0;
}

// Per-area rollup for one user: counts by level + coverage pct.
export function areaStats(userId, state) {
  const st = state || userSkillState(userId);
  return AREAS.map(area => {
    const list = skillsForArea(area.id);
    const counts = { locked: 0, learning: 0, proficient: 0, mastered: 0 };
    let earned = 0;
    for (const s of list) { const l = st[s.id].level; counts[l]++; earned += levelValue(l); }
    const pct = list.length ? Math.round((earned / (list.length * LEVELS.mastered.value)) * 100) : 0;
    return { area, total: list.length, counts, pct };
  });
}

// Suggested next skills to work on: unlocked, not yet mastered, lowest progress
// first, so the map can nudge the user toward the frontier.
export function nextUp(userId, state, limit = 4) {
  const st = state || userSkillState(userId);
  return SKILLS
    .filter(s => st[s.id].unlocked && st[s.id].level !== 'mastered')
    .sort((a, b) => st[a.id].progress - st[b.id].progress)
    .slice(0, limit)
    .map(s => ({ skill: s, ...st[s.id] }));
}

/* ============================================================
   TEAM COVERAGE  (manager lens: rows = members, cols = areas)
   ============================================================ */
export function teamCoverage() {
  const users = getUsers();
  return users.map(user => {
    const state = userSkillState(user.id);
    const areas = {};
    for (const a of areaStats(user.id, state)) areas[a.area.id] = a;
    return {
      user,
      state,
      areas,
      overall: overallMastery(user.id, state),
    };
  });
}

// Team average coverage per area (spot the org-wide gaps at a glance).
export function teamAreaAverages(rows) {
  const data = rows || teamCoverage();
  const out = {};
  for (const a of AREAS) {
    const vals = data.map(r => r.areas[a.id]?.pct || 0);
    out[a.id] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  }
  return out;
}

/* ============================================================
   CONSTELLATION LAYOUT  (pure, deterministic radial tech-tree)
   Areas fan out as sectors around a centre; within a sector a
   skill's radius grows with its tier (roots near the core,
   advanced skills at the rim). Returns positions in a fixed
   viewBox so the SVG map and any minimap stay in sync.
   ============================================================ */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function constellationLayout(w = 1000, h = 760) {
  const cx = w / 2;
  const cy = h / 2;
  const innerR = Math.min(w, h) * 0.14;
  const outerR = Math.min(w, h) * 0.44;
  const sector = (2 * Math.PI) / AREAS.length;
  const pos = {};

  AREAS.forEach((area, ai) => {
    const areaAngle = -Math.PI / 2 + ai * sector;
    const list = skillsForArea(area.id).slice().sort((a, b) => a.tier - b.tier);
    const band = sector * 0.72;
    const n = list.length;
    list.forEach((s, k) => {
      const frac = n === 1 ? 0.5 : k / (n - 1);
      const angle = areaAngle + (frac - 0.5) * band;
      const tierFrac = MAX_TIER ? s.tier / MAX_TIER : 0;
      const jitter = ((hash(s.id) % 100) / 100 - 0.5) * 22;
      const r = innerR + tierFrac * (outerR - innerR) + jitter;
      pos[s.id] = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle,
        r,
      };
    });
  });

  return { pos, cx, cy, innerR, outerR, sector, w, h };
}
