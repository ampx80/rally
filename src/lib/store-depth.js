// ============================================================
// RALLY DEPTH STORE
// The real substance under the surface: rich Deal objects
// (line items, buying committee with roles + influence,
// competitors, close plan, win/loss reasons, full audit
// history) and the lightweight in-CRM Projects board (team
// work, Monday-style). Same local-first, deterministic pattern.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals, getDeal, getContactsForCompany, getUsers, contactName, userName, getCompany, stageById } from './store.js';
import { getProducts } from './store-ext.js';

const LS_KEY = 'rally_depth_v2';   // v2: Boards 2.0 - groups, subitems, rich columns

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STAKEHOLDER_ROLES = ['Champion', 'Economic Buyer', 'Decision Maker', 'Technical Evaluator', 'Influencer', 'Blocker'];
export const INFLUENCE = ['high', 'medium', 'low'];
const COMPETITORS = ['Salesforce', 'HubSpot', 'Zoho', 'Pipedrive', 'Microsoft Dynamics', 'Close', 'Copper', 'Insightly'];
const NEXT_STEPS = ['Confirm budget with economic buyer', 'Send redlined MSA to legal', 'Schedule executive review', 'Deliver technical deep dive', 'Align on mutual close plan', 'Get security review scheduled', 'Finalize pricing and seats'];
const WIN_REASONS = ['Product fit', 'Champion drove it', 'Better AI / automation', 'Faster time to value', 'Price / packaging', 'Executive alignment'];
const LOSS_REASONS = ['Went with incumbent', 'No budget / timing', 'Lost to Salesforce', 'Lost to HubSpot', 'No decision / stalled', 'Missing capability'];
const CLOSE_PLAN_STEPS = ['Discovery complete', 'Technical validation', 'Business case approved', 'Security review', 'Legal / MSA', 'Signature'];

const PROJECT_SEED = [
  { name: 'Vertex Robotics onboarding', color: '#5b4bf5' },
  { name: 'Q3 revenue team goals', color: '#0ea5a3' },
  { name: 'Cascade Health rollout', color: '#2563a8' },
  { name: 'New rep ramp - Simone', color: '#b3721a' },
  { name: 'Website + pricing relaunch', color: '#8b3fd4' },
  { name: 'Renewal saves - at-risk book', color: '#c0392b' },
];
const TASK_TITLES = ['Kickoff call', 'Build mutual action plan', 'Provision seats', 'Import historical data', 'Train the team', 'Configure pipeline stages', 'Set up integrations', 'Executive check-in', 'Draft success criteria', 'Review week 1 usage', 'Send welcome sequence', 'Schedule QBR', 'Migrate contacts', 'Approve budget', 'Finalize scope'];
const TASK_STATUS = ['todo', 'doing', 'blocked', 'done'];
const GROUP_NAMES = ['Planning', 'In progress', 'This week', 'Up next', 'Launch prep', 'Follow-ups', 'Backlog', 'Wrapping up'];
const GROUP_COLORS = ['#5b4bf5', '#0ea5a3', '#2563a8', '#b3721a', '#8b3fd4', '#c0392b', '#1a7f52', '#d4a017'];
const TAG_POOL = ['onboarding', 'urgent', 'customer', 'internal', 'q3', 'revenue', 'launch', 'design', 'quick-win', 'follow-up'];
const SUBITEM_TITLES = ['Draft the doc', 'Get sign-off', 'Send calendar invite', 'Review with team', 'Update the tracker', 'Confirm with client', 'Prep the deck', 'QA the flow', 'Loop in legal', 'Book the room'];

function buildSeed() {
  const rnd = mulberry32(20260710);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const sampleN = (a, n) => { const c = [...a], o = []; for (let i = 0; i < n && c.length; i++) o.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return o; };
  const now = Date.now();
  const DAY = 86400000;
  const d = (n) => new Date(now + n * DAY).toISOString();

  const products = getProducts();
  const seatProducts = products.filter(p => /seat/.test(p.billing));

  // Deal extras keyed by deal id
  const dealExtras = {};
  for (const deal of getDeals()) {
    const co = getCompany(deal.companyId);
    const coContacts = co ? getContactsForCompany(co.id) : [];
    // line items: 1-3 products roughly reconciling to the deal value
    const nLines = range(1, 3);
    const chosen = sampleN(products.length ? products : [{ id: 'p_x', name: 'Rally CRM', price: 90, billing: 'monthly/seat' }], nLines);
    let lineItems = chosen.map((p, i) => {
      const seat = /seat/.test(p.billing);
      const qty = seat ? range(20, 220) : (p.billing === 'one-time' ? 1 : range(1, 3));
      const term = /seat|monthly/.test(p.billing) ? 12 : 1;
      const discount = chance(0.4) ? pick([0, 5, 10, 15, 20]) : 0;
      return { id: `li_${deal.id}_${i}`, productId: p.id, name: p.name, qty, unitPrice: p.price, term, discount };
    });
    // stakeholders from the deal's contacts (or company contacts)
    const stakeContacts = (deal.contactIds && deal.contactIds.length ? deal.contactIds.map(id => coContacts.find(c => c.id === id)).filter(Boolean) : coContacts).slice(0, 4);
    const roles = [...STAKEHOLDER_ROLES];
    const stakeholders = stakeContacts.map((c, i) => ({
      contactId: c.id, role: i === 0 ? 'Champion' : (roles[i] || pick(STAKEHOLDER_ROLES)), influence: i === 0 ? 'high' : pick(INFLUENCE),
    }));
    const competitors = chance(0.55) ? sampleN(COMPETITORS, range(1, 2)) : [];
    const closed = deal.status !== 'open';
    dealExtras[deal.id] = {
      lineItems,
      stakeholders,
      competitors,
      nextStep: closed ? '' : pick(NEXT_STEPS),
      nextStepDue: closed ? null : d(range(1, 12)),
      closePlan: CLOSE_PLAN_STEPS.map((label, i) => ({ label, done: closed ? true : i < range(1, 4) })),
      forecastCategory: deal.stage === 'negotiation' || deal.stage === 'proposal' ? 'commit' : deal.stage === 'discovery' ? 'best_case' : 'pipeline',
      winReason: deal.status === 'won' ? pick(WIN_REASONS) : '',
      lossReason: deal.status === 'lost' ? pick(LOSS_REASONS) : '',
      history: [
        { id: `h_${deal.id}_0`, at: deal.createdAt, who: userName(deal.ownerId), field: 'created', from: null, to: 'Deal created' },
        { id: `h_${deal.id}_1`, at: d(-range(1, 30)), who: userName(deal.ownerId), field: 'stage', from: 'Qualified', to: stageById(deal.stage)?.name || 'Open' },
      ],
    };
  }

  // Projects (team boards) - Boards 2.0: colored groups, rich columns, subitems
  const users = getUsers();
  const projects = PROJECT_SEED.map((p, pi) => {
    const nGroups = range(2, 3);
    const groups = sampleN(GROUP_NAMES, nGroups).map((name, gi) => ({
      id: `pg_${pi}_${gi}`, name, color: GROUP_COLORS[(pi * 2 + gi) % GROUP_COLORS.length],
    }));
    const nTasks = range(6, 10);
    const tasks = [];
    for (let i = 0; i < nTasks; i++) {
      const status = pick(TASK_STATUS);
      const group = pick(groups);
      const primary = pick(users);
      const extra = chance(0.32) ? pick(users) : null;
      const assigneeIds = extra && extra.id !== primary.id ? [primary.id, extra.id] : [primary.id];
      const dueDays = range(-6, 26);
      const progress = status === 'done' ? 100 : status === 'todo' ? range(0, 15) : status === 'blocked' ? range(10, 45) : range(30, 85);
      const nSub = chance(0.45) ? range(1, 3) : 0;
      const subitems = [];
      for (let s = 0; s < nSub; s++) subitems.push({ id: `ps_${pi}_${i}_${s}`, title: pick(SUBITEM_TITLES), done: chance(0.5), assigneeId: pick(users).id });
      tasks.push({
        id: `pt_${pi}_${i}`, groupId: group.id, title: pick(TASK_TITLES),
        assigneeId: primary.id, assigneeIds, status,
        priority: pick(['low', 'medium', 'medium', 'high']),
        startDate: d(dueDays - range(2, 12)), due: d(dueDays),
        progress, number: chance(0.6) ? range(1, 13) : null,
        tags: chance(0.55) ? sampleN(TAG_POOL, range(1, 2)) : [],
        notes: '', subitems,
      });
    }
    return { id: `pj_${pi + 1}`, name: p.name, color: p.color, ownerId: pick(users).id, createdAt: d(-range(3, 40)), groups, tasks };
  });

  return { seededAt: new Date(now).toISOString(), dealExtras, projects };
}

/* Boards 2.0 normalizer: guarantees every project has >=1 group and every task
   carries the rich column shape, even for state written by an older build or by
   addTask before all fields were required. Idempotent + defensive. */
function normalizeTask(t, groupId) {
  return {
    startDate: null, progress: t.status === 'done' ? 100 : 0,
    number: null, notes: '',
    ...t,
    assigneeIds: Array.isArray(t.assigneeIds) && t.assigneeIds.length ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []),
    subitems: Array.isArray(t.subitems) ? t.subitems : [],
    tags: Array.isArray(t.tags) ? t.tags : [],
    groupId: groupId || t.groupId || null,
  };
}
function migrate(s) {
  if (!s || !Array.isArray(s.projects)) return s;
  for (const p of s.projects) {
    if (!Array.isArray(p.groups) || !p.groups.length) {
      p.groups = [{ id: `pg_${p.id}_0`, name: 'Tasks', color: p.color || '#5b4bf5' }];
    }
    const ids = new Set(p.groups.map(g => g.id));
    const first = p.groups[0].id;
    p.tasks = (p.tasks || []).map(t => normalizeTask(t, ids.has(t.groupId) ? t.groupId : first));
  }
  return s;
}

/* persistence + pub/sub */
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch {}
  const seed = migrate(buildSeed());
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetDepth() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function useDepth(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}
let idc = Date.now();
const nid = (p) => `${p}_${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

/* ---------- deal extras ---------- */
const EMPTY = () => ({ lineItems: [], stakeholders: [], competitors: [], nextStep: '', nextStepDue: null, closePlan: [], forecastCategory: 'pipeline', winReason: '', lossReason: '', history: [] });
export function getDealExtras(dealId) {
  if (!state.dealExtras[dealId]) { state.dealExtras[dealId] = EMPTY(); }
  return state.dealExtras[dealId];
}
function logHistory(dealId, field, from, to, who = 'You') {
  const ex = getDealExtras(dealId);
  ex.history = [{ id: nid('h'), at: nowISO(), who, field, from: from ?? null, to: to ?? null }, ...(ex.history || [])];
}
export const lineItemTotal = (li) => Math.round(li.qty * li.unitPrice * (li.term || 1) * (1 - (li.discount || 0) / 100));
export const dealACV = (dealId) => getDealExtras(dealId).lineItems.reduce((s, li) => s + lineItemTotal(li), 0);

export function addLineItem(dealId, { productId, name, qty = 1, unitPrice = 0, term = 12, discount = 0 }) {
  const ex = getDealExtras(dealId);
  ex.lineItems = [...ex.lineItems, { id: nid('li'), productId, name, qty: Number(qty) || 1, unitPrice: Number(unitPrice) || 0, term, discount: Number(discount) || 0 }];
  logHistory(dealId, 'line item', null, `added ${name}`);
  commit({ ...state }); return { ok: true };
}
export function updateLineItem(dealId, itemId, patch) {
  const ex = getDealExtras(dealId);
  ex.lineItems = ex.lineItems.map(li => li.id === itemId ? { ...li, ...patch, qty: patch.qty != null ? Number(patch.qty) : li.qty, discount: patch.discount != null ? Number(patch.discount) : li.discount } : li);
  commit({ ...state }); return { ok: true };
}
export function removeLineItem(dealId, itemId) {
  const ex = getDealExtras(dealId);
  ex.lineItems = ex.lineItems.filter(li => li.id !== itemId);
  commit({ ...state }); return { ok: true };
}
export function setStakeholder(dealId, contactId, role = 'Influencer', influence = 'medium') {
  const ex = getDealExtras(dealId);
  const existing = ex.stakeholders.find(s => s.contactId === contactId);
  if (existing) { existing.role = role; existing.influence = influence; }
  else ex.stakeholders = [...ex.stakeholders, { contactId, role, influence }];
  commit({ ...state }); return { ok: true };
}
export function removeStakeholder(dealId, contactId) {
  const ex = getDealExtras(dealId);
  ex.stakeholders = ex.stakeholders.filter(s => s.contactId !== contactId);
  commit({ ...state }); return { ok: true };
}
export function addCompetitor(dealId, name) {
  const ex = getDealExtras(dealId);
  if (name && !ex.competitors.includes(name)) ex.competitors = [...ex.competitors, name];
  commit({ ...state }); return { ok: true };
}
export function removeCompetitor(dealId, name) {
  const ex = getDealExtras(dealId);
  ex.competitors = ex.competitors.filter(c => c !== name);
  commit({ ...state }); return { ok: true };
}
export function updateDealMeta(dealId, patch) {
  const ex = getDealExtras(dealId);
  if (patch.nextStep != null && patch.nextStep !== ex.nextStep) logHistory(dealId, 'next step', ex.nextStep || null, patch.nextStep);
  Object.assign(ex, patch);
  commit({ ...state }); return { ok: true };
}
export function toggleClosePlanStep(dealId, index) {
  const ex = getDealExtras(dealId);
  if (ex.closePlan[index]) ex.closePlan[index].done = !ex.closePlan[index].done;
  commit({ ...state }); return { ok: true };
}
export const COMPETITOR_OPTIONS = COMPETITORS;

/* ---------- deal AI insight (deterministic, grounded) ---------- */
export function dealInsight(deal) {
  if (!deal) return null;
  const ex = getDealExtras(deal.id);
  const daysInStage = Math.max(0, Math.round((Date.now() - new Date(ex.history?.[0]?.at || deal.createdAt).getTime()) / 86400000));
  const notes = [];
  if (deal.status === 'open') {
    const overdue = new Date(deal.closeDate).getTime() < Date.now();
    if (overdue) notes.push({ tone: 'risk', text: `Past its close date and still open. Win rates drop sharply once a deal slips - push for a mutual close plan now.` });
    if (deal.stage === 'negotiation' && daysInStage > 30) notes.push({ tone: 'warn', text: `In Negotiation for ${daysInStage} days. Deals over 45 days here close 23% less often - name the blocker and set a date.` });
    if (!ex.stakeholders.some(s => s.role === 'Economic Buyer')) notes.push({ tone: 'warn', text: `No economic buyer mapped. Single-threaded deals are the top slip risk - find who controls the budget.` });
    if (ex.competitors.length) notes.push({ tone: 'info', text: `Competing against ${ex.competitors.join(', ')}. Lead with the AI operator and time-to-value - that is where they are weakest.` });
    if (!notes.length) notes.push({ tone: 'ok', text: `Healthy. ${ex.stakeholders.length} stakeholders mapped, clear next step. Keep the momentum.` });
  } else if (deal.status === 'won') {
    notes.push({ tone: 'ok', text: `Won on "${ex.winReason || 'strong fit'}". Graduate this account into an onboarding project and set the renewal 90 days out.` });
  } else {
    notes.push({ tone: 'risk', text: `Lost: ${ex.lossReason || 'no reason logged'}. Log it so the win/loss report can learn from it.` });
  }
  return { daysInStage, notes };
}

/* ---------- projects (in-CRM team board) ---------- */
export const getProjects = () => state.projects;
export const getProject = (id) => state.projects.find(p => p.id === id);
const groupMeta = (p, gid) => (p.groups || []).find(g => g.id === gid) || {};
export const getAllTasks = () => state.projects.flatMap(p => p.tasks.map(t => ({
  ...t, projectId: p.id, projectName: p.name, projectColor: p.color,
  groupName: groupMeta(p, t.groupId).name, groupColor: groupMeta(p, t.groupId).color,
})));
function findTask(taskId) {
  for (const p of state.projects) { const t = p.tasks.find(x => x.id === taskId); if (t) return { project: p, task: t }; }
  return null;
}

export function createProject({ name, color = '#5b4bf5', ownerId, companyId }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Project name is required.' };
  const p = {
    id: nid('pj'), name: name.trim(), color, ownerId: ownerId || getUsers()[0].id,
    companyId: companyId || null, createdAt: nowISO(),
    groups: [{ id: nid('pg'), name: 'This week', color }, { id: nid('pg'), name: 'Up next', color: '#0ea5a3' }],
    tasks: [],
  };
  commit({ ...state, projects: [p, ...state.projects] });
  return { project: p };
}

/* ---- tasks ---- */
export function addTask(projectId, { title, assigneeId, status = 'todo', priority = 'medium', due, groupId, startDate, progress, tags, number } = {}) {
  if (!title || !title.trim()) return { error: 'title', message: 'Task title is required.' };
  const p = getProject(projectId); if (!p) return { error: 'missing' };
  const gId = groupId && (p.groups || []).some(g => g.id === groupId) ? groupId : (p.groups?.[0]?.id || null);
  const aid = assigneeId || getUsers()[0].id;
  const task = {
    id: nid('pt'), groupId: gId, title: title.trim(),
    assigneeId: aid, assigneeIds: [aid], status, priority,
    startDate: startDate || null, due: due || new Date(Date.now() + 7 * 86400000).toISOString(),
    progress: progress != null ? progress : (status === 'done' ? 100 : 0),
    number: number != null ? number : null, tags: tags || [], notes: '', subitems: [],
  };
  p.tasks = [...p.tasks, task];
  commit({ ...state }); return { ok: true, task };
}
export function updateTask(taskId, patch) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  Object.assign(hit.task, patch);
  if (Array.isArray(patch.assigneeIds)) hit.task.assigneeId = patch.assigneeIds[0] || hit.task.assigneeId;
  if (patch.status === 'done' && patch.progress == null) hit.task.progress = 100;
  commit({ ...state }); return { ok: true };
}
export function moveTask(taskId, status) { return updateTask(taskId, { status }); }
export function deleteTask(taskId) {
  for (const p of state.projects) { const n = p.tasks.length; p.tasks = p.tasks.filter(x => x.id !== taskId); if (p.tasks.length !== n) { commit({ ...state }); return { ok: true }; } }
  return { error: 'missing' };
}

/* Generic column setter for inline table editing (status/people/timeline/etc). */
export function setTaskColumn(taskId, key, value) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  let v = value;
  if (key === 'progress') v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  else if (key === 'number') v = (value === '' || value == null) ? null : Number(value);
  hit.task[key] = v;
  if (key === 'assigneeIds' && Array.isArray(v)) hit.task.assigneeId = v[0] || hit.task.assigneeId;
  if (key === 'status' && v === 'done') hit.task.progress = 100;
  if (key === 'progress' && v === 100 && hit.task.status !== 'done') hit.task.status = 'done';
  commit({ ...state }); return { ok: true };
}

/* Reorder within a project's task list (drag reorder + optional group move). */
export function reorderTask(taskId, targetIndex, groupId) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  const p = hit.project;
  const arr = [...p.tasks];
  const from = arr.findIndex(t => t.id === taskId);
  if (from < 0) return { error: 'missing' };
  const [moved] = arr.splice(from, 1);
  if (groupId != null && (p.groups || []).some(g => g.id === groupId)) moved.groupId = groupId;
  const idx = Math.max(0, Math.min(arr.length, targetIndex));
  arr.splice(idx, 0, moved);
  p.tasks = arr;
  commit({ ...state }); return { ok: true };
}

/* ---- groups ---- */
export const getProjectGroups = (projectId) => getProject(projectId)?.groups || [];
export function addGroup(projectId, { name, color = '#5b4bf5' } = {}) {
  const p = getProject(projectId); if (!p) return { error: 'missing' };
  if (!name || !name.trim()) return { error: 'name', message: 'Group name is required.' };
  const g = { id: nid('pg'), name: name.trim(), color };
  p.groups = [...(p.groups || []), g];
  commit({ ...state }); return { group: g };
}
export function updateGroup(projectId, groupId, patch) {
  const p = getProject(projectId); if (!p) return { error: 'missing' };
  p.groups = (p.groups || []).map(g => g.id === groupId ? { ...g, ...patch } : g);
  commit({ ...state }); return { ok: true };
}
export function renameGroup(projectId, groupId, name) {
  if (!name || !name.trim()) return { error: 'name' };
  return updateGroup(projectId, groupId, { name: name.trim() });
}
export function removeGroup(projectId, groupId) {
  const p = getProject(projectId); if (!p) return { error: 'missing' };
  if ((p.groups || []).length <= 1) return { error: 'last', message: 'A project needs at least one group.' };
  const fallback = p.groups.find(g => g.id !== groupId)?.id;
  p.groups = p.groups.filter(g => g.id !== groupId);
  p.tasks = p.tasks.map(t => t.groupId === groupId ? { ...t, groupId: fallback } : t);
  commit({ ...state }); return { ok: true };
}

/* ---- subitems ---- */
export function addSubitem(taskId, { title, assigneeId } = {}) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  if (!title || !title.trim()) return { error: 'title' };
  hit.task.subitems = [...(hit.task.subitems || []), { id: nid('ps'), title: title.trim(), done: false, assigneeId: assigneeId || hit.task.assigneeId }];
  commit({ ...state }); return { ok: true };
}
export function toggleSubitem(taskId, subitemId) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  hit.task.subitems = (hit.task.subitems || []).map(s => s.id === subitemId ? { ...s, done: !s.done } : s);
  commit({ ...state }); return { ok: true };
}
export function removeSubitem(taskId, subitemId) {
  const hit = findTask(taskId); if (!hit) return { error: 'missing' };
  hit.task.subitems = (hit.task.subitems || []).filter(s => s.id !== subitemId);
  commit({ ...state }); return { ok: true };
}
