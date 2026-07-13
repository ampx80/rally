// ============================================================
// RALLY JOURNEYS  (local-first, additive, Supabase-swappable)
//
// Customer journey orchestration - the visual builder behind
// enterprise marketing (HubSpot / Salesforce Marketing Cloud).
// A "journey" is a directed graph of nodes:
//
//   entry (trigger) -> delay -> branch (if/else) -> actions
//   actions: email, sms, campaign, task, lifecycle, notify,
//            list, and Rook AI decision (Rally-only).
//
// This module owns the graph MODEL, a deterministic enrollment
// simulator (how many contacts sit at each step + conversion +
// revenue), a template gallery, a single-contact test-run path,
// and a localStorage-backed store with pub/sub. Zero network,
// deterministic seed, never throws on load.
//
// TDZ-SAFE: every helper touched during module-eval seeding is a
// hoisted `function` declaration and every const it reads is
// declared above the `let data = load()` line at the bottom.
//
// SUPABASE: rally_journeys (graph JSON per row) + a derived
// rally_journey_enrollments table for live stats.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { AUDIENCE_STAGES } from './marketing-engine.js';

const LS_KEY = 'rally_journeys_v1';   // bump to force a clean reseed
const DAY = 86400000;

/* Canvas geometry - node cards + the grid the builder lays out on. */
export const NODE_W = 232;
export const NODE_H = 78;
export const COL = 300;   // horizontal spacing between branch columns
export const ROW = 132;   // vertical spacing between steps

/* ============================================================
   NODE LIBRARY  (type -> label, icon, color, category)
   ============================================================ */
export const NODE_LIBRARY = {
  entry:     { label: 'Entry trigger',        icon: 'funnel',      color: '#5b4bf5', cat: 'trigger' },
  delay:     { label: 'Wait / delay',         icon: 'clock',       color: '#b3721a', cat: 'flow' },
  branch:    { label: 'If / else branch',     icon: 'gitBranch',   color: '#2563a8', cat: 'flow' },
  email:     { label: 'Send email',           icon: 'mail',        color: '#5b4bf5', cat: 'action' },
  sms:       { label: 'Send SMS',             icon: 'messages',    color: '#0ea5a3', cat: 'action' },
  campaign:  { label: 'Add to campaign',      icon: 'megaphone',   color: '#a855f7', cat: 'action' },
  task:      { label: 'Create task',          icon: 'checkSquare', color: '#1a7f52', cat: 'action' },
  lifecycle: { label: 'Update lifecycle',     icon: 'target',      color: '#2563a8', cat: 'action' },
  notify:    { label: 'Notify owner',         icon: 'bell',        color: '#b3721a', cat: 'action' },
  list:      { label: 'Add / remove list',    icon: 'filter',      color: '#5b6474', cat: 'action' },
  rook:      { label: 'Rook AI decision',     icon: 'sparkles',    color: '#5b4bf5', cat: 'ai' },
};

// The palette the builder offers when adding a step (entry is fixed, one only).
export const ADDABLE_TYPES = ['email', 'sms', 'delay', 'branch', 'task', 'lifecycle', 'campaign', 'notify', 'list', 'rook'];

export const ENTRY_TRIGGERS = [
  { id: 'signup', label: 'Contact signs up' },
  { id: 'form', label: 'Submits a form' },
  { id: 'stage', label: 'Enters lifecycle stage' },
  { id: 'tag', label: 'Gets tagged' },
  { id: 'deal_created', label: 'Deal is created' },
  { id: 'deal_stage', label: 'Deal enters stage' },
  { id: 'cart', label: 'Abandons cart' },
  { id: 'demo', label: 'Books / attends demo' },
  { id: 'inactive', label: 'Goes inactive' },
  { id: 'renewal', label: 'Renewal date approaches' },
];

export const DELAY_UNITS = [
  { id: 'hours', label: 'hours' },
  { id: 'days', label: 'days' },
  { id: 'weeks', label: 'weeks' },
];

// Properties a branch can test (contact/behavior/deal signals).
export const BRANCH_PROPS = [
  { id: 'opened_email', label: 'Opened previous email', kind: 'behavior' },
  { id: 'clicked_email', label: 'Clicked previous email', kind: 'behavior' },
  { id: 'visited_pricing', label: 'Visited pricing page', kind: 'behavior' },
  { id: 'lifecycle', label: 'Lifecycle stage', kind: 'property' },
  { id: 'has_open_deal', label: 'Has an open deal', kind: 'property' },
  { id: 'deal_value', label: 'Deal value over threshold', kind: 'property' },
  { id: 'is_customer', label: 'Is a customer', kind: 'property' },
  { id: 'replied', label: 'Replied to a touch', kind: 'behavior' },
];

export const LIST_ACTIONS = [
  { id: 'add', label: 'Add to list' },
  { id: 'remove', label: 'Remove from list' },
];

export const JOURNEY_STATUSES = [
  { id: 'draft', label: 'Draft', tone: 'default' },
  { id: 'live', label: 'Live', tone: 'ok' },
  { id: 'paused', label: 'Paused', tone: 'warn' },
];
export const statusMeta = (id) => JOURNEY_STATUSES.find(s => s.id === id) || JOURNEY_STATUSES[0];

/* ============================================================
   DETERMINISTIC PRNG (same family as store.js / marketing-engine)
   ============================================================ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}
const uid = (() => { let n = 918273; return (p) => `${p}_${(n++).toString(36)}`; })();

/* ============================================================
   GRAPH HELPERS (all hoisted - safe to call during seeding)
   ============================================================ */
function mkNode(id, type, x, y, config = {}) {
  return { id, type, x, y, config };
}
function mkEdge(from, to, branch = null) {
  return { id: `e_${from}_${to}${branch ? '_' + branch : ''}`, from, to, branch };
}

// Fraction of arrivals that continue downstream (rest exit / drop off).
function passFraction(type) {
  switch (type) {
    case 'entry': return 1;
    case 'branch': return 1;
    case 'delay': return 0.985;
    case 'email': return 0.9;
    case 'sms': return 0.94;
    case 'rook': return 0.97;
    default: return 0.99; // task, lifecycle, campaign, notify, list
  }
}
// Fraction of arrivals currently paused AT this node (live enrollment count).
function sittingFraction(type) {
  switch (type) {
    case 'entry': return 0;
    case 'branch': return 0;
    case 'delay': return 0.34;
    case 'email': return 0.07;
    case 'sms': return 0.05;
    case 'rook': return 0.06;
    default: return 0.03;
  }
}

function outgoing(journey, nodeId) {
  return journey.edges.filter(e => e.from === nodeId);
}
function nodeById(journey, id) {
  return journey.nodes.find(n => n.id === id);
}

// Kahn topological order from the entry node. Cycle-safe: any node not
// resolved (a cycle or an orphan) is appended at the end so the walk always
// terminates and every node gets a slot.
function topoOrder(journey) {
  const indeg = {};
  for (const n of journey.nodes) indeg[n.id] = 0;
  for (const e of journey.edges) if (indeg[e.to] != null) indeg[e.to]++;
  const queue = journey.nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
  // Prefer the entry node first for a stable, top-down order.
  const entry = journey.nodes.find(n => n.type === 'entry');
  if (entry && !queue.includes(entry.id)) queue.unshift(entry.id);
  const seen = new Set();
  const order = [];
  let guard = 0;
  while (queue.length && guard++ < 5000) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const e of outgoing(journey, id)) {
      if (indeg[e.to] != null) indeg[e.to]--;
      if (!seen.has(e.to) && (indeg[e.to] <= 0)) queue.push(e.to);
    }
  }
  for (const n of journey.nodes) if (!seen.has(n.id)) order.push(n.id);
  return order;
}

/* ============================================================
   ENROLLMENT SIMULATION (deterministic per journey)
   Distributes a seeded enrolled count through the graph and
   reports, per node: arrived / sitting / passed. Terminal nodes
   (no outgoing edge) collect completions = goal reached.
   ============================================================ */
export function simulateEnrollment(journey) {
  const rnd = mulberry32(hashStr(journey.id) ^ (journey.nodes.length * 2654435761));
  const entry = journey.nodes.find(n => n.type === 'entry') || journey.nodes[0];
  const perNode = {};
  for (const n of journey.nodes) perNode[n.id] = { arrived: 0, sitting: 0, passed: 0 };
  if (!entry) return { perNode, enrolled: 0, active: 0, completed: 0, conversion: 0, revenue: 0 };

  const enrolled = typeof journey._enrolled === 'number'
    ? journey._enrolled
    : 120 + Math.floor(rnd() * 5200);
  const avgValue = 900 + Math.floor(rnd() * 3600);

  perNode[entry.id].arrived = enrolled;
  const order = topoOrder(journey);
  let completed = 0;
  let sittingTotal = 0;

  for (const id of order) {
    const node = nodeById(journey, id);
    if (!node) continue;
    const cell = perNode[id];
    const inc = cell.arrived;
    const sitting = Math.round(inc * sittingFraction(node.type));
    const passed = Math.max(0, Math.round((inc - sitting) * passFraction(node.type)));
    cell.sitting = sitting;
    cell.passed = passed;
    sittingTotal += sitting;

    const outs = outgoing(journey, id);
    if (!outs.length) {
      // Terminal node: everyone who passed through reached the end (goal).
      completed += passed;
      continue;
    }
    if (node.type === 'branch') {
      // Split by a seeded yes/no ratio; unlabeled edges share the remainder.
      const yesShare = 0.42 + rnd() * 0.32; // 42%..74% take the yes path
      const yes = outs.find(e => e.branch === 'yes');
      const no = outs.find(e => e.branch === 'no');
      if (yes && no) {
        perNode[yes.to].arrived += Math.round(passed * yesShare);
        perNode[no.to].arrived += passed - Math.round(passed * yesShare);
      } else {
        for (const e of outs) perNode[e.to].arrived += Math.round(passed / outs.length);
      }
    } else {
      // Fan-out: each downstream edge receives the passed cohort.
      for (const e of outs) perNode[e.to].arrived += passed;
    }
  }

  const conversion = enrolled ? Math.round((completed / enrolled) * 1000) / 10 : 0;
  const revenue = completed * avgValue;
  return { perNode, enrolled, active: sittingTotal, completed, conversion, revenue };
}

// Single-contact walk for the animated test run. Follows real edges; at a
// branch it takes the higher-weighted path (seeded), guarded against cycles.
export function testRunPath(journey, { takeYes = null } = {}) {
  const entry = journey.nodes.find(n => n.type === 'entry') || journey.nodes[0];
  if (!entry) return [];
  const rnd = mulberry32(hashStr(journey.id + '|run'));
  const path = [];
  const seen = new Set();
  let cur = entry.id;
  let guard = 0;
  while (cur && guard++ < 200) {
    if (seen.has(cur)) break;
    seen.add(cur);
    path.push(cur);
    const node = nodeById(journey, cur);
    const outs = outgoing(journey, cur);
    if (!outs.length) break;
    if (node && node.type === 'branch') {
      const yes = outs.find(e => e.branch === 'yes');
      const no = outs.find(e => e.branch === 'no');
      const goYes = takeYes != null ? takeYes : rnd() < 0.6;
      const chosen = (goYes ? yes : no) || outs[0];
      cur = chosen.to;
    } else {
      cur = outs[0].to;
    }
  }
  return path;
}

/* ============================================================
   TEMPLATE GALLERY  (each returns a full laid-out graph)
   ============================================================ */
function humanDelay(cfg) {
  return `${cfg.amount} ${cfg.unit}`;
}

// A vertical stem laid out down the center column, with branches splitting
// left (no) and right (yes). x is the LEFT edge of the node card.
const CX = COL;                 // center column left-x
const XL = CX - COL;            // left column
const XR = CX + COL;            // right column
const Y0 = 40;

function tplWelcome() {
  const nodes = [
    mkNode('n_entry', 'entry', CX, Y0, { trigger: 'signup', label: 'New signup' }),
    mkNode('n_email1', 'email', CX, Y0 + ROW, { subject: 'Welcome to Rally, {{firstName}}', template: 'Welcome' }),
    mkNode('n_wait1', 'delay', CX, Y0 + ROW * 2, { amount: 2, unit: 'days' }),
    mkNode('n_branch', 'branch', CX, Y0 + ROW * 3, { prop: 'opened_email' }),
    mkNode('n_yes', 'email', XR, Y0 + ROW * 4, { subject: 'Your quick-start guide', template: 'Getting started' }),
    mkNode('n_task', 'task', XR, Y0 + ROW * 5, { title: 'CSM: personal onboarding intro', owner: 'owner' }),
    mkNode('n_no', 'email', XL, Y0 + ROW * 4, { subject: 'A nudge to get you going', template: 'Re-nudge' }),
    mkNode('n_rook', 'rook', XL, Y0 + ROW * 5, { instruction: 'Decide the best next touch based on engagement.' }),
    mkNode('n_life', 'lifecycle', CX, Y0 + ROW * 6, { stage: 'sql' }),
  ];
  const edges = [
    mkEdge('n_entry', 'n_email1'),
    mkEdge('n_email1', 'n_wait1'),
    mkEdge('n_wait1', 'n_branch'),
    mkEdge('n_branch', 'n_yes', 'yes'),
    mkEdge('n_branch', 'n_no', 'no'),
    mkEdge('n_yes', 'n_task'),
    mkEdge('n_no', 'n_rook'),
    mkEdge('n_task', 'n_life'),
    mkEdge('n_rook', 'n_life'),
  ];
  return { nodes, edges, goal: { label: 'Contact activated', metric: 'activation' }, exit: ['Becomes a customer', 'Unsubscribes'] };
}

function tplAbandonedCart() {
  const nodes = [
    mkNode('n_entry', 'entry', CX, Y0, { trigger: 'cart', label: 'Cart abandoned' }),
    mkNode('n_wait1', 'delay', CX, Y0 + ROW, { amount: 1, unit: 'hours' }),
    mkNode('n_sms', 'sms', CX, Y0 + ROW * 2, { message: 'Still thinking it over, {{firstName}}? Your cart is saved.' }),
    mkNode('n_wait2', 'delay', CX, Y0 + ROW * 3, { amount: 1, unit: 'days' }),
    mkNode('n_branch', 'branch', CX, Y0 + ROW * 4, { prop: 'clicked_email' }),
    mkNode('n_yes', 'notify', XR, Y0 + ROW * 5, { who: 'owner', note: 'Warm cart - reach out' }),
    mkNode('n_no', 'email', XL, Y0 + ROW * 5, { subject: 'A little something to finish up', template: 'Incentive' }),
    mkNode('n_list', 'list', XL, Y0 + ROW * 6, { action: 'add', list: 'Cart recovery' }),
  ];
  const edges = [
    mkEdge('n_entry', 'n_wait1'),
    mkEdge('n_wait1', 'n_sms'),
    mkEdge('n_sms', 'n_wait2'),
    mkEdge('n_wait2', 'n_branch'),
    mkEdge('n_branch', 'n_yes', 'yes'),
    mkEdge('n_branch', 'n_no', 'no'),
    mkEdge('n_no', 'n_list'),
  ];
  return { nodes, edges, goal: { label: 'Purchase completed', metric: 'purchase' }, exit: ['Completes checkout', '7 days elapse'] };
}

function tplReengage() {
  const nodes = [
    mkNode('n_entry', 'entry', CX, Y0, { trigger: 'inactive', label: 'No activity 60 days' }),
    mkNode('n_email1', 'email', CX, Y0 + ROW, { subject: 'Still on your radar, {{firstName}}?', template: 'Break-up 1' }),
    mkNode('n_wait1', 'delay', CX, Y0 + ROW * 2, { amount: 4, unit: 'days' }),
    mkNode('n_branch', 'branch', CX, Y0 + ROW * 3, { prop: 'opened_email' }),
    mkNode('n_yes', 'campaign', XR, Y0 + ROW * 4, { campaign: 'Reactivation nurture' }),
    mkNode('n_no', 'email', XL, Y0 + ROW * 4, { subject: 'Should we close your file?', template: 'Break-up 2' }),
    mkNode('n_rook', 'rook', XL, Y0 + ROW * 5, { instruction: 'Score revival odds; suppress if unlikely.' }),
  ];
  const edges = [
    mkEdge('n_entry', 'n_email1'),
    mkEdge('n_email1', 'n_wait1'),
    mkEdge('n_wait1', 'n_branch'),
    mkEdge('n_branch', 'n_yes', 'yes'),
    mkEdge('n_branch', 'n_no', 'no'),
    mkEdge('n_no', 'n_rook'),
  ];
  return { nodes, edges, goal: { label: 'Re-engaged', metric: 'reengagement' }, exit: ['Books a meeting', 'Marked lost'] };
}

function tplPostDemo() {
  const nodes = [
    mkNode('n_entry', 'entry', CX, Y0, { trigger: 'demo', label: 'Demo attended' }),
    mkNode('n_task', 'task', CX, Y0 + ROW, { title: 'AE: send recap + next steps', owner: 'owner' }),
    mkNode('n_email1', 'email', CX, Y0 + ROW * 2, { subject: 'Great talking today, {{firstName}}', template: 'Demo recap' }),
    mkNode('n_wait1', 'delay', CX, Y0 + ROW * 3, { amount: 3, unit: 'days' }),
    mkNode('n_branch', 'branch', CX, Y0 + ROW * 4, { prop: 'has_open_deal' }),
    mkNode('n_yes', 'notify', XR, Y0 + ROW * 5, { who: 'owner', note: 'Deal open - advance to proposal' }),
    mkNode('n_no', 'email', XL, Y0 + ROW * 5, { subject: 'The proof teams like yours ask for', template: 'Case study' }),
    mkNode('n_life', 'lifecycle', CX, Y0 + ROW * 6, { stage: 'opportunity' }),
  ];
  const edges = [
    mkEdge('n_entry', 'n_task'),
    mkEdge('n_task', 'n_email1'),
    mkEdge('n_email1', 'n_wait1'),
    mkEdge('n_wait1', 'n_branch'),
    mkEdge('n_branch', 'n_yes', 'yes'),
    mkEdge('n_branch', 'n_no', 'no'),
    mkEdge('n_yes', 'n_life'),
    mkEdge('n_no', 'n_life'),
  ];
  return { nodes, edges, goal: { label: 'Opportunity created', metric: 'opportunity' }, exit: ['Deal reaches proposal', '30 days elapse'] };
}

function tplRenewal() {
  const nodes = [
    mkNode('n_entry', 'entry', CX, Y0, { trigger: 'renewal', label: '90 days to renewal' }),
    mkNode('n_notify', 'notify', CX, Y0 + ROW, { who: 'owner', note: 'Renewal window opened' }),
    mkNode('n_email1', 'email', CX, Y0 + ROW * 2, { subject: 'Your year with Rally, {{firstName}}', template: 'Value recap' }),
    mkNode('n_wait1', 'delay', CX, Y0 + ROW * 3, { amount: 2, unit: 'weeks' }),
    mkNode('n_branch', 'branch', CX, Y0 + ROW * 4, { prop: 'deal_value' }),
    mkNode('n_yes', 'task', XR, Y0 + ROW * 5, { title: 'CSM: exec business review', owner: 'owner' }),
    mkNode('n_no', 'campaign', XL, Y0 + ROW * 5, { campaign: 'Self-serve renewal' }),
    mkNode('n_rook', 'rook', CX, Y0 + ROW * 6, { instruction: 'Predict churn risk and recommend the save play.' }),
  ];
  const edges = [
    mkEdge('n_entry', 'n_notify'),
    mkEdge('n_notify', 'n_email1'),
    mkEdge('n_email1', 'n_wait1'),
    mkEdge('n_wait1', 'n_branch'),
    mkEdge('n_branch', 'n_yes', 'yes'),
    mkEdge('n_branch', 'n_no', 'no'),
    mkEdge('n_yes', 'n_rook'),
    mkEdge('n_no', 'n_rook'),
  ];
  return { nodes, edges, goal: { label: 'Renewed', metric: 'renewal' }, exit: ['Renewal booked', 'Churned'] };
}

export const TEMPLATES = [
  { id: 'welcome', name: 'Welcome onboarding', tagline: 'Turn a fresh signup into an activated user.', icon: 'rocket', accent: '#5b4bf5', build: tplWelcome },
  { id: 'abandoned', name: 'Abandoned cart', tagline: 'Win back the checkout that stalled.', icon: 'box', accent: '#0ea5a3', build: tplAbandonedCart },
  { id: 'reengage', name: 'Re-engagement', tagline: 'Reawaken quiet contacts before they churn.', icon: 'rotateCcw', accent: '#a855f7', build: tplReengage },
  { id: 'postdemo', name: 'Post-demo nurture', tagline: 'Keep momentum from the demo to the deal.', icon: 'target', accent: '#2563a8', build: tplPostDemo },
  { id: 'renewal', name: 'Renewal', tagline: 'Protect revenue in the renewal window.', icon: 'shield', accent: '#1a7f52', build: tplRenewal },
];
export const templateById = (id) => TEMPLATES.find(t => t.id === id);

/* ============================================================
   SEED  (a believable book of journeys)
   ============================================================ */
function makeJourney(id, name, status, tplId, enrolled, createdDaysAgo) {
  const g = templateById(tplId).build();
  return {
    id, name, status,
    templateId: tplId,
    nodes: g.nodes, edges: g.edges,
    goal: g.goal, exit: g.exit,
    _enrolled: enrolled,
    createdAt: Date.now() - createdDaysAgo * DAY,
    updatedAt: Date.now() - Math.floor(createdDaysAgo / 2) * DAY,
  };
}

function buildSeed() {
  const journeys = [
    makeJourney('j_welcome', 'New customer onboarding', 'live', 'welcome', 4820, 96),
    makeJourney('j_postdemo', 'Post-demo nurture', 'live', 'postdemo', 1360, 54),
    makeJourney('j_renewal', 'Enterprise renewal play', 'live', 'renewal', 640, 38),
    makeJourney('j_reengage', 'Win-back dormant leads', 'paused', 'reengage', 2210, 71),
    makeJourney('j_cart', 'Abandoned checkout recovery', 'draft', 'abandoned', 0, 6),
  ];
  return { seededAt: Date.now(), journeys };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let data = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.journeys)) return s; }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  data = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  subs.forEach(fn => fn(data));
}
export function resetJourneys() { try { localStorage.removeItem(LS_KEY); } catch {} data = load(); subs.forEach(fn => fn(data)); }

export function useJourneys(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(data));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(data);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   READS
   ============================================================ */
export const getJourneys = () => data.journeys;
export const getJourney = (id) => data.journeys.find(j => j.id === id);

// Fleet roll-up across every journey (deterministic, from the sim).
export function fleetStats() {
  let enrolled = 0, active = 0, completed = 0, revenue = 0, live = 0, convWeighted = 0;
  for (const j of data.journeys) {
    const s = simulateEnrollment(j);
    enrolled += s.enrolled; active += s.active; completed += s.completed; revenue += s.revenue;
    convWeighted += s.conversion * s.enrolled;
    if (j.status === 'live') live++;
  }
  return {
    enrolled, active, completed, revenue, live,
    total: data.journeys.length,
    conversion: enrolled ? Math.round((convWeighted / enrolled) * 10) / 10 : 0,
  };
}

// A small deterministic 7-point trend for a journey card sparkline.
export function journeyTrend(journey) {
  const rnd = mulberry32(hashStr(journey.id + '|spark'));
  const s = simulateEnrollment(journey);
  const base = Math.max(4, s.active / 7);
  const out = [];
  let v = base * (0.7 + rnd() * 0.4);
  for (let i = 0; i < 7; i++) { v = Math.max(1, v * (0.85 + rnd() * 0.4)); out.push(Math.round(v)); }
  return out;
}

/* ============================================================
   WRITES
   ============================================================ */
export function createJourney({ name, templateId = 'welcome', status = 'draft' } = {}) {
  const tpl = templateById(templateId) || TEMPLATES[0];
  const g = tpl.build();
  const j = {
    id: uid('j'),
    name: (name || `Untitled ${tpl.name.toLowerCase()}`).trim(),
    status,
    templateId,
    nodes: g.nodes, edges: g.edges, goal: g.goal, exit: g.exit,
    _enrolled: 0,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  commit({ ...data, journeys: [j, ...data.journeys] });
  return j;
}

export function createBlankJourney({ name = 'New journey', trigger = 'signup' } = {}) {
  const nodes = [mkNode('n_entry', 'entry', CX, Y0, { trigger, label: ENTRY_TRIGGERS.find(t => t.id === trigger)?.label || 'Entry' })];
  const j = {
    id: uid('j'), name: name.trim(), status: 'draft', templateId: null,
    nodes, edges: [], goal: { label: 'Goal reached', metric: 'custom' }, exit: ['Goal reached'],
    _enrolled: 0, createdAt: Date.now(), updatedAt: Date.now(),
  };
  commit({ ...data, journeys: [j, ...data.journeys] });
  return j;
}

function writeJourney(id, mutate) {
  const journeys = data.journeys.map(j => {
    if (j.id !== id) return j;
    const next = { ...j, nodes: [...j.nodes], edges: [...j.edges], updatedAt: Date.now() };
    mutate(next);
    return next;
  });
  commit({ ...data, journeys });
  return journeys.find(j => j.id === id);
}

export function updateJourney(id, patch) {
  return writeJourney(id, (j) => { Object.assign(j, patch); });
}
export function setJourneyStatus(id, status) {
  if (!JOURNEY_STATUSES.some(s => s.id === status)) return getJourney(id);
  return writeJourney(id, (j) => { j.status = status; });
}
export function deleteJourney(id) {
  commit({ ...data, journeys: data.journeys.filter(j => j.id !== id) });
}
export function duplicateJourney(id) {
  const src = getJourney(id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid('j');
  copy.name = `${src.name} (copy)`;
  copy.status = 'draft';
  copy._enrolled = 0;
  copy.createdAt = Date.now(); copy.updatedAt = Date.now();
  commit({ ...data, journeys: [copy, ...data.journeys] });
  return copy;
}

/* ---------- node / edge writers ---------- */
export function updateNode(journeyId, nodeId, patch) {
  return writeJourney(journeyId, (j) => {
    j.nodes = j.nodes.map(n => n.id === nodeId ? { ...n, ...patch, config: patch.config ? { ...n.config, ...patch.config } : n.config } : n);
  });
}
export function moveNode(journeyId, nodeId, x, y) {
  return writeJourney(journeyId, (j) => {
    j.nodes = j.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n);
  });
}

// Insert a node after `afterId`. If `afterId` already has a child on this
// branch, the new node is spliced BETWEEN them (parent -> new -> oldChild) so
// the journey stays connected. Branch nodes take a `branch` ('yes'|'no').
export function addNode(journeyId, afterId, type, { branch = null } = {}) {
  let created = null;
  writeJourney(journeyId, (j) => {
    const parent = j.nodes.find(n => n.id === afterId);
    if (!parent) return;
    const lib = NODE_LIBRARY[type];
    const nid = uid('n');
    // Position: below the parent, offset toward the branch side.
    const dx = branch === 'yes' ? COL : branch === 'no' ? -COL : 0;
    const node = mkNode(nid, type, parent.x + dx, parent.y + ROW, defaultConfig(type));
    // Existing edges leaving the parent on this branch get rerouted through the new node.
    const rerouted = j.edges.filter(e => e.from === afterId && (branch ? e.branch === branch : e.branch == null));
    j.edges = j.edges.filter(e => !(e.from === afterId && (branch ? e.branch === branch : e.branch == null)));
    j.edges.push(mkEdge(afterId, nid, branch));
    for (const e of rerouted) j.edges.push(mkEdge(nid, e.to));
    // A branch node needs two outgoing slots; leave them open for the user to fill.
    j.nodes.push(node);
    created = node;
  });
  return created;
}

// Remove a node and heal the graph: every parent reconnects to every child,
// preserving the parent's branch label. Entry nodes cannot be deleted.
export function deleteNode(journeyId, nodeId) {
  return writeJourney(journeyId, (j) => {
    const node = j.nodes.find(n => n.id === nodeId);
    if (!node || node.type === 'entry') return;
    const parents = j.edges.filter(e => e.to === nodeId);
    const children = j.edges.filter(e => e.from === nodeId);
    j.edges = j.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    for (const p of parents) {
      for (const c of children) {
        if (!j.edges.some(e => e.from === p.from && e.to === c.to && e.branch === p.branch)) {
          j.edges.push(mkEdge(p.from, c.to, p.branch));
        }
      }
    }
    j.nodes = j.nodes.filter(n => n.id !== nodeId);
  });
}

// Connect two existing nodes (used when wiring an open branch slot by hand).
export function connectNodes(journeyId, fromId, toId, branch = null) {
  return writeJourney(journeyId, (j) => {
    if (fromId === toId) return;
    if (j.edges.some(e => e.from === fromId && e.to === toId && e.branch === branch)) return;
    j.edges.push(mkEdge(fromId, toId, branch));
  });
}

export function defaultConfig(type) {
  switch (type) {
    case 'email': return { subject: 'A note for {{firstName}}', template: 'Custom' };
    case 'sms': return { message: 'Quick note for you, {{firstName}}.' };
    case 'delay': return { amount: 2, unit: 'days' };
    case 'branch': return { prop: 'opened_email' };
    case 'task': return { title: 'Follow up', owner: 'owner' };
    case 'lifecycle': return { stage: 'sql' };
    case 'campaign': return { campaign: 'Nurture' };
    case 'notify': return { who: 'owner', note: 'Journey milestone reached' };
    case 'list': return { action: 'add', list: 'Journey members' };
    case 'rook': return { instruction: 'Choose the best next step for this contact.' };
    default: return {};
  }
}

/* ---------- human-readable node summary (for cards + config) ---------- */
export function nodeSummary(node) {
  const c = node.config || {};
  switch (node.type) {
    case 'entry': return c.label || ENTRY_TRIGGERS.find(t => t.id === c.trigger)?.label || 'Entry trigger';
    case 'email': return c.subject || 'Send email';
    case 'sms': return c.message ? truncate(c.message, 46) : 'Send SMS';
    case 'delay': return `Wait ${humanDelay(c)}`;
    case 'branch': return BRANCH_PROPS.find(p => p.id === c.prop)?.label || 'If / else';
    case 'task': return c.title || 'Create task';
    case 'lifecycle': return `Set stage: ${AUDIENCE_STAGES.find(s => s.id === c.stage)?.label || c.stage}`;
    case 'campaign': return c.campaign ? `Add to ${c.campaign}` : 'Add to campaign';
    case 'notify': return c.note || 'Notify owner';
    case 'list': return `${c.action === 'remove' ? 'Remove from' : 'Add to'} ${c.list || 'list'}`;
    case 'rook': return c.instruction ? truncate(c.instruction, 46) : 'Rook AI decision';
    default: return NODE_LIBRARY[node.type]?.label || node.type;
  }
}
function truncate(s, n) { const str = String(s || ''); return str.length > n ? str.slice(0, n - 1) + '…' : str; }

/* ---------- Rook bridge ---------- */
// Fire the app-wide Rook event. Guarded so it never throws on load.
export function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
