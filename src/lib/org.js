// org.js - the org chart + rank system + persona views engine (local-first).
//
// Rank is a color-coded seniority spine (purple -> blue -> green as you descend),
// with two off-spine FUNCTION colors so a support or analyst node never reads as
// a rank tier. Every tier also carries an icon + label so it stays legible for
// colorblind users (color is never the only signal). People form a reporting
// tree (managerId); drag-and-drop reparents, with cycle prevention. Personas map
// a rank to a curated "what you see by default" view that can expand to the full
// system. Seeds from the real team (store.js getUsers). NO em-dash. ASCII only.
import { useEffect, useState } from 'react';
import { getUsers } from './store.js';

const LS_KEY = 'rally_org_v1';

// ---- Rank tiers (color-ranked). kind:'rank' = the seniority spine; 'function'
// = off-spine categorical roles (support, analyst) so yellow/olive never imply level.
export const RANKS = [
  { id: 'executive', label: 'Executive', level: 6, kind: 'rank', color: '#7c3aed', deep: '#4c1d95', icon: 'target', persona: 'executive', desc: 'C-suite. Sees the rollup, steers the company.' },
  { id: 'director', label: 'VP / Director', level: 5, kind: 'rank', color: '#4338ca', deep: '#312e81', icon: 'building', persona: 'executive', desc: 'Owns a function. Answers to the exec team.' },
  { id: 'manager', label: 'Manager', level: 4, kind: 'rank', color: '#1d4ed8', deep: '#1e3a8a', icon: 'users', persona: 'manager', desc: 'Runs a team. Coaches and forecasts.' },
  { id: 'lead', label: 'Team Lead', level: 3, kind: 'rank', color: '#0e7490', deep: '#155e75', icon: 'user', persona: 'manager', desc: 'Senior IC who guides a pod.' },
  { id: 'ic', label: 'Individual Contributor', level: 2, kind: 'rank', color: '#047857', deep: '#065f46', icon: 'deals', persona: 'ic', desc: 'Owns their book and does the work.' },
  { id: 'support', label: 'Support', level: 2, kind: 'function', color: '#b45309', deep: '#92400e', icon: 'inbox', persona: 'support', desc: 'Keeps customers unblocked. Tickets and SLAs.' },
  { id: 'analyst', label: 'Analyst / Reporting', level: 2, kind: 'function', color: '#4d7c0f', deep: '#3f6212', icon: 'chart', persona: 'analyst', desc: 'Turns data into decisions. Read-first.' },
];
export const rankById = (id) => RANKS.find(r => r.id === id) || RANKS[4];

// ---- Persona views: limited by default, expandable to the whole system.
export const PERSONAS = [
  { id: 'executive', label: 'Executive', color: '#7c3aed', icon: 'target',
    tagline: 'The rollup, not the firehose.',
    kpis: ['pipeline', 'forecast', 'wonMonth', 'winRate'],
    modules: [['/dashboards', 'Dashboards'], ['/forecasting', 'Forecast'], ['/intelligence', 'Intelligence'], ['/signals', 'Signals'], ['/twin', 'Revenue Twin']],
    hide: 'Rep-level task lists, ticket queues, and raw record editing.' },
  { id: 'admin', label: 'Admin', color: '#4338ca', icon: 'shield',
    tagline: 'The system, the people, the security.',
    kpis: ['people', 'modulesOn', 'openTickets', 'health'],
    modules: [['/team', 'Team'], ['/roles', 'Roles'], ['/permissions', 'Permissions'], ['/security-center', 'Security'], ['/email-center', 'Email Center'], ['/audit', 'Audit']],
    hide: 'Deal-by-deal pipeline, until you flip to the full view.' },
  { id: 'manager', label: 'Manager', color: '#1d4ed8', icon: 'users',
    tagline: 'Your team, and where to coach.',
    kpis: ['teamPipeline', 'openDeals', 'winRate', 'slipping'],
    modules: [['/deals', 'Deals'], ['/forecasting', 'Forecast'], ['/goals', 'Goals'], ['/reports', 'Reports']],
    hide: 'Company-wide finance, billing, and admin settings.' },
  { id: 'support', label: 'Support', color: '#b45309', icon: 'inbox',
    tagline: 'Tickets, SLAs, and happy customers.',
    kpis: ['openTickets', 'urgent', 'csat', 'solved'],
    modules: [['/tickets', 'Tickets'], ['/inbox', 'Inbox'], ['/kb', 'Knowledge base'], ['/surveys', 'Surveys'], ['/voice', 'Voice AI']],
    hide: 'Pipeline, forecast, and revenue dashboards.' },
  { id: 'analyst', label: 'Analyst', color: '#4d7c0f', icon: 'chart',
    tagline: 'Every number, sliceable.',
    kpis: ['pipeline', 'winRate', 'forecast', 'openDeals'],
    modules: [['/reports', 'Reports'], ['/dashboards', 'Dashboards'], ['/attribution', 'Attribution'], ['/intelligence', 'Intelligence']],
    hide: 'Write access to records - this is a reporting lens.' },
];
export const personaById = (id) => PERSONAS.find(p => p.id === id) || PERSONAS[0];

// Which rank a persona maps to, so we can auto-pick a landing persona per person.
export function personaForRank(rankId) {
  const r = rankById(rankId);
  return r.persona === 'ic' ? 'manager' : (PERSONAS.some(p => p.id === r.persona) ? r.persona : 'manager');
}

// Core routes always visible in scoped ("focus") mode - nobody is ever stranded.
export const CORE_ROUTES = new Set(['/app', '/notifications', '/settings', '/org', '/security-center']);

// Broad, usable nav allowlist per persona (scoped/focus mode). Wider than the
// handful of quick links so the focused nav is still a real workspace.
export const PERSONA_NAV = {
  executive: ['/dashboards', '/forecasting', '/intelligence', '/signals', '/twin', '/goals', '/reports', '/attribution', '/wind-tunnel', '/fork', '/deals', '/companies'],
  admin: ['/team', '/roles', '/permissions', '/email-center', '/audit', '/app-manager', '/integrations', '/developers', '/workspaces', '/sandboxes', '/datasync', '/import', '/duplicates', '/objects', '/marketplace', '/billing-plans'],
  manager: ['/deals', '/contacts', '/companies', '/forecasting', '/goals', '/reports', '/dashboards', '/territories', '/warroom', '/playbooks', '/leads', '/scheduler'],
  support: ['/tickets', '/inbox', '/conversations', '/kb', '/surveys', '/voice', '/service'],
  analyst: ['/reports', '/dashboards', '/attribution', '/intelligence', '/signals', '/twin', '/canvas', '/fork'],
};

export function routeAllowed(route, personaId) {
  if (!route) return true;
  if (CORE_ROUTES.has(route)) return true;
  const list = PERSONA_NAV[personaId];
  if (!list) return true;
  return list.some(r => route === r || route.startsWith(r + '/'));
}

// ---- seed the reporting tree from the real team + a couple of function roles.
function seedPeople() {
  let users = [];
  try { users = getUsers() || []; } catch { users = []; }
  const byRole = (r) => users.filter(u => u.role === r);
  const reps = byRole('rep');
  const mgr = byRole('manager')[0] || users[0];
  const people = [];
  // Top of house: the VP becomes the executive root.
  const rootId = mgr ? mgr.id : 'exec_root';
  people.push({ id: rootId, name: mgr?.name || 'Elena Ross', email: mgr?.email || 'elena@ardovo.com', title: mgr?.title || 'VP of Revenue', rankId: 'executive', managerId: null });
  // Promote the most senior rep to Manager under the exec.
  const seniorIdx = reps.findIndex(r => /senior|enterprise/i.test(r.title || ''));
  const manager = reps[seniorIdx >= 0 ? seniorIdx : 0];
  if (manager) people.push({ id: manager.id, name: manager.name, email: manager.email, title: 'Sales Manager', rankId: 'manager', managerId: rootId });
  // Everyone else reports to that manager as ICs (one becomes a lead).
  const rest = reps.filter(r => r.id !== manager?.id);
  rest.forEach((r, i) => people.push({ id: r.id, name: r.name, email: r.email, title: r.title, rankId: i === 0 ? 'lead' : 'ic', managerId: manager?.id || rootId }));
  // Add function roles so support + analyst colors are represented.
  people.push({ id: 'org_support', name: 'Priya Shah', email: 'priya@ardovo.com', title: 'Support Lead', rankId: 'support', managerId: rootId });
  people.push({ id: 'org_analyst', name: 'Dev Kumar', email: 'dev@ardovo.com', title: 'RevOps Analyst', rankId: 'analyst', managerId: rootId });
  return people;
}

// scoped=false by default: everyone can see the whole system until they opt into
// a focused persona view. "They have the opportunity to log into the whole system."
function freshState() { return { people: seedPeople(), persona: 'executive', scoped: false, seeded: true }; }

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p.people) && p.people.length) return { ...freshState(), ...p }; }
  } catch {}
  const seed = freshState();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

let state = load();
const subs = new Set();
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

// ---- selectors ----
export function getPeople() { return state.people; }
export function getPersona() { return state.persona; }
export const childrenOf = (id) => state.people.filter(p => p.managerId === id);
export const rootPeople = () => state.people.filter(p => !p.managerId || !state.people.some(x => x.id === p.managerId));
export function subtreeIds(id) {
  const out = new Set([id]);
  const walk = (pid) => state.people.filter(p => p.managerId === pid).forEach(c => { if (!out.has(c.id)) { out.add(c.id); walk(c.id); } });
  walk(id);
  return out;
}
export function wouldCycle(dragId, newManagerId) {
  if (dragId === newManagerId) return true;
  return subtreeIds(dragId).has(newManagerId); // cannot report into your own subtree
}

// ---- writers ----
export function setManager(id, newManagerId) {
  if (id === newManagerId || wouldCycle(id, newManagerId)) return false;
  commit({ ...state, people: state.people.map(p => p.id === id ? { ...p, managerId: newManagerId } : p) });
  return true;
}
export function setRank(id, rankId) {
  commit({ ...state, people: state.people.map(p => p.id === id ? { ...p, rankId } : p) });
}
export function updatePerson(id, patch) {
  commit({ ...state, people: state.people.map(p => p.id === id ? { ...p, ...patch } : p) });
}
export function addPerson({ name, title, rankId = 'ic', managerId = null }) {
  const person = { id: newId('org'), name: name || 'New teammate', title: title || '', email: '', rankId, managerId };
  commit({ ...state, people: [...state.people, person] });
  return person;
}
export function removePerson(id) {
  const target = state.people.find(p => p.id === id);
  const newMgr = target ? target.managerId : null;
  // reparent children to the removed person's manager, then drop the person.
  const people = state.people.filter(p => p.id !== id).map(p => p.managerId === id ? { ...p, managerId: newMgr } : p);
  commit({ ...state, people });
}
export function setPersona(persona) { commit({ ...state, persona }); }
export function getScoped() { return !!state.scoped; }
export function setScoped(on) { commit({ ...state, scoped: !!on }); }
export function resetOrg() { commit(freshState()); }

// ---- rank distribution (for the legend + insights) ----
export function rankCounts() {
  const map = {};
  RANKS.forEach(r => { map[r.id] = 0; });
  state.people.forEach(p => { map[p.rankId] = (map[p.rankId] || 0) + 1; });
  return map;
}

// ---- management-assistant insights (deterministic, colored by rank/severity) ----
// live = optional { repLeaderboard: [...], slipping: n } from the page so we can
// surface who is behind pace without importing heavy selectors here.
export function orgInsights(live = {}) {
  const people = state.people;
  const counts = rankCounts();
  const leaders = people.filter(p => ['executive', 'director', 'manager'].includes(p.rankId));
  const out = [];
  out.push({ tone: 'info', icon: 'users', title: `${people.length} people across ${RANKS.filter(r => counts[r.id]).length} tiers`, body: `Your org spans executive to individual contributor, with dedicated support and analyst functions. Tap any node to change a rank or reporting line.` });
  const execs = people.filter(p => p.rankId === 'executive');
  if (execs.length) out.push({ tone: 'exec', icon: 'target', title: `Leadership: ${leaders.map(l => l.name.split(' ')[0]).join(', ')}`, body: `${execs.length} at the top, ${counts.manager || 0} managers, ${counts.lead || 0} leads. Spans of control look healthy.` });
  // Widest span of control - a coaching signal.
  const spans = leaders.map(l => ({ l, n: childrenOf(l.id).length })).sort((a, b) => b.n - a.n);
  if (spans[0] && spans[0].n >= 4) out.push({ tone: 'warn', icon: 'activity', title: `${spans[0].l.name.split(' ')[0]} manages ${spans[0].n} directly`, body: `That is a wide span. Consider promoting a team lead to keep coaching quality high.` });
  // Behind-pace reps from live leaderboard.
  const lb = live.repLeaderboard || [];
  const behind = lb.filter(r => r.user && r.user.quota > 0 && r.won < r.user.quota * 0.35).map(r => r.user.name.split(' ')[0]);
  if (behind.length) out.push({ tone: 'warn', icon: 'deals', title: `Behind pace: ${behind.join(', ')}`, body: `These reps are tracking under 35% of quota. Good candidates for a coaching session or pipeline review.` });
  else if (lb.length) out.push({ tone: 'ok', icon: 'check', title: 'Team is on pace', body: 'No rep is dangerously behind quota right now. Keep the momentum.' });
  if (typeof live.slipping === 'number' && live.slipping > 0) out.push({ tone: 'warn', icon: 'activity', title: `${live.slipping} deals slipping`, body: 'Deals with a close date in the past. Worth a stand-up with the owners.' });
  out.push({ tone: 'info', icon: 'sparkles', title: 'Want the deep dive?', body: 'Hand any of this to Rook and it will pull the exact records, draft the coaching notes, or book the reviews.' });
  return out;
}

// ---- hook ----
export function useOrg(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
