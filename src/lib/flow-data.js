// ============================================================
// RALLY FLOW  (visual workflow builder - local-first data layer)
// ------------------------------------------------------------
// The node-graph model, the palette of node types, a library of
// seeded recipe workflows, a localStorage-backed pub/sub store
// (mirrors src/lib/store.js exactly), and a deterministic run
// simulator that walks a sample record through a graph so the
// canvas can animate it.
//
// This is the heart of both HubSpot Workflows and GHL. Rally's
// version adds native AI nodes (Rook decides / drafts / qualifies)
// that no other builder ships.
//
// 100% functional with ZERO backend. Deterministic mulberry32 seed
// so the demo is byte-stable across reloads. ASCII only - NO
// em-dash or en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_flow_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (same primitive as store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   NODE TYPE CATALOG
   Every node the palette exposes. kind drives ports + the runner:
     trigger - graph entry, one output, no input
     action  - one input, one output
     branch  - one input, two outputs (yes / no)
   group buckets the left-rail palette. color follows the design
   tokens (indigo triggers, amber logic, teal comms, blue CRM,
   purple AI, slate timing).
   ============================================================ */
export const GROUPS = ['Triggers', 'Logic', 'Comms', 'CRM', 'AI', 'Timing'];

export const GROUP_META = {
  Triggers: { color: 'var(--accent)', hint: 'Start a flow when something happens' },
  Logic: { color: 'var(--warn)', hint: 'Branch and filter the path' },
  Comms: { color: 'var(--accent-teal)', hint: 'Reach out on any channel' },
  CRM: { color: 'var(--info)', hint: 'Change records in Rally' },
  AI: { color: 'var(--accent-purple)', hint: 'Hand the wheel to Rook' },
  Timing: { color: 'var(--n-600)', hint: 'Pause and schedule' },
};

export const NODE_TYPES = {
  // ---- Triggers ----
  form_submitted: { group: 'Triggers', kind: 'trigger', icon: 'list', color: 'var(--accent)', label: 'Form submitted', desc: 'Someone completes a Rally form', config: { form: 'Contact us' } },
  lead_created: { group: 'Triggers', kind: 'trigger', icon: 'funnel', color: 'var(--accent)', label: 'New lead', desc: 'A lead enters the CRM', config: { source: 'Any source' } },
  deal_stage: { group: 'Triggers', kind: 'trigger', icon: 'target', color: 'var(--accent)', label: 'Deal stage changed', desc: 'A deal moves into a stage', config: { stage: 'Closed Won' } },
  missed_call: { group: 'Triggers', kind: 'trigger', icon: 'phone', color: 'var(--accent)', label: 'Missed call', desc: 'An inbound call goes unanswered', config: { line: 'Main line' } },
  tag_added: { group: 'Triggers', kind: 'trigger', icon: 'plus', color: 'var(--accent)', label: 'Tag added', desc: 'A tag is applied to a record', config: { tag: 'champion' } },
  no_activity: { group: 'Triggers', kind: 'trigger', icon: 'clock', color: 'var(--accent)', label: 'Goes quiet', desc: 'No activity for a set number of days', config: { days: 30 } },

  // ---- Logic ----
  condition: { group: 'Logic', kind: 'branch', icon: 'gitBranch', color: 'var(--warn)', label: 'If / then branch', desc: 'Split the path on a rule', config: { field: 'score', op: 'greater than', value: '70' } },
  split: { group: 'Logic', kind: 'branch', icon: 'sliders', color: 'var(--warn)', label: 'A / B split', desc: 'Route a share down each path', config: { percent: '50' } },
  filter: { group: 'Logic', kind: 'action', icon: 'filter', color: 'var(--warn)', label: 'Filter', desc: 'Only continue if the record matches', config: { field: 'owner', op: 'is', value: 'me' } },

  // ---- Comms ----
  send_email: { group: 'Comms', kind: 'action', icon: 'mail', color: 'var(--accent-teal)', label: 'Send email', desc: 'Deliver a templated email', config: { subject: 'Quick note', body: 'Hi {{first_name}},' } },
  send_sms: { group: 'Comms', kind: 'action', icon: 'phone', color: 'var(--accent-teal)', label: 'Send SMS', desc: 'Text the contact', config: { body: 'Hi {{first_name}}, thanks for reaching out.' } },
  send_whatsapp: { group: 'Comms', kind: 'action', icon: 'send', color: 'var(--accent-teal)', label: 'WhatsApp', desc: 'Message on WhatsApp', config: { body: 'Hi {{first_name}} on WhatsApp.' } },
  start_sequence: { group: 'Comms', kind: 'action', icon: 'layers', color: 'var(--accent-teal)', label: 'Start sequence', desc: 'Enroll the contact in a cadence', config: { sequence: 'Enterprise nurture' } },
  notify_rep: { group: 'Comms', kind: 'action', icon: 'bell', color: 'var(--accent-teal)', label: 'Notify rep', desc: 'Ping the record owner', config: { channel: 'Slack' } },

  // ---- CRM ----
  create_task: { group: 'CRM', kind: 'action', icon: 'checkSquare', color: 'var(--info)', label: 'Create task', desc: 'Add a to-do for the owner', config: { subject: 'Follow up', due: 'in 1 day' } },
  update_field: { group: 'CRM', kind: 'action', icon: 'edit', color: 'var(--info)', label: 'Update field', desc: 'Set a value on the record', config: { field: 'lifecycle', value: 'opportunity' } },
  add_to_list: { group: 'CRM', kind: 'action', icon: 'filter', color: 'var(--info)', label: 'Add to list', desc: 'Drop into a static list', config: { list: 'Nurture' } },
  create_deal: { group: 'CRM', kind: 'action', icon: 'target', color: 'var(--info)', label: 'Create deal', desc: 'Open a new opportunity', config: { pipeline: 'Sales' } },
  webhook: { group: 'CRM', kind: 'action', icon: 'plug', color: 'var(--info)', label: 'Webhook', desc: 'POST the record to an external URL', config: { url: 'https://' } },

  // ---- AI (Rally exclusive) ----
  rook_decide: { group: 'AI', kind: 'branch', icon: 'sparkles', color: 'var(--accent-purple)', label: 'Rook decides', desc: 'Let Rook choose which path to take', config: { question: 'Is this lead sales-ready?' } },
  rook_draft: { group: 'AI', kind: 'action', icon: 'sparkles', color: 'var(--accent-purple)', label: 'Rook drafts', desc: 'Rook writes the message for you', config: { instruction: 'Warm re-engagement email' } },
  rook_qualify: { group: 'AI', kind: 'action', icon: 'sparkles', color: 'var(--accent-purple)', label: 'Rook qualifies', desc: 'Rook scores and enriches the lead', config: { rubric: 'Budget, authority, need, timing' } },

  // ---- Timing ----
  wait: { group: 'Timing', kind: 'action', icon: 'clock', color: 'var(--n-600)', label: 'Wait / delay', desc: 'Pause the path before continuing', config: { amount: '3', unit: 'days' } },
};

export const nodeMeta = (type) => NODE_TYPES[type] || { group: 'CRM', kind: 'action', icon: 'workflow', color: 'var(--n-600)', label: type, desc: '', config: {} };
export const typesByGroup = (g) => Object.entries(NODE_TYPES).filter(([, m]) => m.group === g).map(([type, m]) => ({ type, ...m }));

/* Ports a node exposes on its right edge. Branches fan out yes / no. */
export function outPorts(type) {
  const m = nodeMeta(type);
  if (m.kind === 'branch') return [
    { id: 'yes', label: type === 'split' ? 'A' : 'Yes', tone: 'ok' },
    { id: 'no', label: type === 'split' ? 'B' : 'No', tone: 'risk' },
  ];
  return [{ id: 'out', label: '', tone: 'accent' }];
}
export const hasInput = (type) => nodeMeta(type).kind !== 'trigger';

/* ============================================================
   RECIPE LIBRARY
   Prebuilt workflows the gallery can load onto the canvas. Each is
   a positioned graph. Positions are laid out on a lane grid so the
   connectors read cleanly the moment they load.
   ============================================================ */
const COL = [40, 280, 520, 760, 1000];   // x lanes
const ROW = [130, 40, 220, 330, 12];      // y offsets (index used per node)

// tiny graph builder: n(id, type, colIndex, rowY, config?)  e(from,to,port?)
function graph(nodes, edges) {
  return {
    nodes: nodes.map(([id, type, x, y, config]) => ({ id, type, x, y, config: { ...nodeMeta(type).config, ...(config || {}) } })),
    edges: edges.map(([from, to, fromPort], i) => ({ id: `e${i + 1}`, from, to, fromPort: fromPort || 'out' })),
  };
}

export const RECIPES = [
  {
    id: 'missed-call-textback',
    name: 'Missed-call text back',
    tagline: 'Turn a missed call into a booked conversation in seconds.',
    icon: 'phone', accent: 'var(--accent-teal)',
    ...graph(
      [
        ['n1', 'missed_call', COL[0], 130],
        ['n2', 'rook_draft', COL[1], 130, { instruction: 'Apologetic, warm text back offering a callback time' }],
        ['n3', 'send_sms', COL[2], 130, { body: 'Hi {{first_name}}, sorry we missed you. Want a call back at 2pm or 4pm?' }],
        ['n4', 'create_task', COL[3], 40, { subject: 'Call back missed caller', due: 'in 15 min' }],
        ['n5', 'add_to_list', COL[3], 220, { list: 'Missed calls' }],
      ],
      [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n3', 'n5']],
    ),
  },
  {
    id: 'new-lead-nurture',
    name: 'New-lead nurture',
    tagline: 'Rook qualifies every inbound lead, then routes the hot ones to a rep.',
    icon: 'funnel', accent: 'var(--accent)',
    ...graph(
      [
        ['n1', 'lead_created', COL[0], 130, { source: 'Website form' }],
        ['n2', 'rook_qualify', COL[1], 130],
        ['n3', 'condition', COL[2], 130, { field: 'score', op: 'greater than', value: '70' }],
        ['n4', 'notify_rep', COL[3], 40, { channel: 'Slack' }],
        ['n5', 'start_sequence', COL[3], 220, { sequence: 'Long-term nurture' }],
        ['n6', 'create_task', COL[4], 40, { subject: 'Personal outreach to hot lead', due: 'today' }],
      ],
      [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4', 'yes'], ['n3', 'n5', 'no'], ['n4', 'n6']],
    ),
  },
  {
    id: 'post-win-review',
    name: 'Post-win review ask',
    tagline: 'Every closed win becomes a testimonial and a referral.',
    icon: 'target', accent: 'var(--ok)',
    ...graph(
      [
        ['n1', 'deal_stage', COL[0], 130, { stage: 'Closed Won' }],
        ['n2', 'wait', COL[1], 130, { amount: '3', unit: 'days' }],
        ['n3', 'rook_draft', COL[2], 130, { instruction: 'Gracious review request referencing the win' }],
        ['n4', 'send_email', COL[3], 130, { subject: 'A quick favor', body: 'Hi {{first_name}}, so glad we got this across the line.' }],
        ['n5', 'notify_rep', COL[4], 130, { channel: 'Email' }],
      ],
      [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5']],
    ),
  },
  {
    id: 'cold-lead-reengage',
    name: 'Cold-lead re-engage',
    tagline: 'Wake up dormant leads and recycle the ones who stay quiet.',
    icon: 'rotateCcw', accent: 'var(--accent-purple)',
    ...graph(
      [
        ['n1', 'no_activity', COL[0], 130, { days: 45 }],
        ['n2', 'rook_draft', COL[1], 130, { instruction: 'Low-pressure break-up style re-engagement email' }],
        ['n3', 'send_email', COL[2], 130, { subject: 'Still worth a chat?', body: 'Hi {{first_name}}, should I close the loop or keep you posted?' }],
        ['n4', 'rook_decide', COL[3], 130, { question: 'Did the reply signal buying intent?' }],
        ['n5', 'notify_rep', COL[4], 40, { channel: 'Slack' }],
        ['n6', 'add_to_list', COL[4], 220, { list: 'Recycle in 90 days' }],
      ],
      [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5', 'yes'], ['n4', 'n6', 'no']],
    ),
  },
  {
    id: 'stale-deal-alert',
    name: 'Stale-deal alert',
    tagline: 'Catch slipping deals before the forecast does.',
    icon: 'bell', accent: 'var(--warn)',
    ...graph(
      [
        ['n1', 'no_activity', COL[0], 130, { days: 14 }],
        ['n2', 'condition', COL[1], 130, { field: 'value', op: 'greater than', value: '50000' }],
        ['n3', 'notify_rep', COL[2], 40, { channel: 'Slack' }],
        ['n4', 'send_email', COL[2], 220, { subject: 'Checking in', body: 'Hi {{first_name}}, where should we take this next?' }],
        ['n5', 'create_task', COL[3], 40, { subject: 'Rescue plan for slipping deal', due: 'today' }],
      ],
      [['n1', 'n2'], ['n2', 'n3', 'yes'], ['n2', 'n4', 'no'], ['n3', 'n5']],
    ),
  },
];

export const getRecipe = (id) => RECIPES.find(r => r.id === id);

/* deep-clone a graph and remap node + edge ids so a loaded recipe
   never collides with the ids already on a flow. */
function cloneGraph(g, seedId) {
  const map = {};
  let c = 0;
  const nodes = g.nodes.map(n => {
    const nid = `${seedId}n${++c}`;
    map[n.id] = nid;
    return { id: nid, type: n.type, x: n.x, y: n.y, config: { ...n.config } };
  });
  let ec = 0;
  const edges = g.edges.map(e => ({ id: `${seedId}e${++ec}`, from: map[e.from], to: map[e.to], fromPort: e.fromPort || 'out' }));
  return { nodes, edges };
}

/* ============================================================
   SEED  -  a few live flows so the canvas is alive on first paint
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(70720126);
  const spawn = (recipeId, name, status, runs) => {
    const r = getRecipe(recipeId);
    const g = cloneGraph(r, `s${Math.floor(rnd() * 100000).toString(36)}`);
    return {
      id: `flow_${recipeId}`,
      name, description: r.tagline, recipeId, status,
      runs, saves: Math.round(runs * (0.4 + rnd() * 0.3)),
      nodes: g.nodes, edges: g.edges,
      createdAt: new Date(1751932800000 - Math.floor(rnd() * 90) * 86400000).toISOString(),
    };
  };
  const flows = [
    spawn('missed-call-textback', 'Missed-call text back', 'live', 1284),
    spawn('new-lead-nurture', 'New-lead nurture', 'live', 942),
    spawn('post-win-review', 'Post-win review ask', 'live', 318),
    spawn('stale-deal-alert', 'Stale-deal alert', 'paused', 176),
  ];
  return { flows, activeId: flows[0].id, sims: 0, seededAt: new Date(1751932800000).toISOString() };
}

/* ============================================================
   PERSISTENCE + PUB/SUB   (mirrors store.js exactly)
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetFlows() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getFlowState() { return state; }

export function useFlowStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = 1000;
const newId = (p) => `${p}_${(idc++).toString(36)}${Math.floor((idc * 2654435761) % 46656).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getFlows = () => state.flows;
export const getFlow = (id) => state.flows.find(f => f.id === id);
export const getActiveFlow = () => getFlow(state.activeId) || state.flows[0];
export const getSimCount = () => state.sims || 0;

export function flowStats() {
  const flows = state.flows;
  const live = flows.filter(f => f.status === 'live').length;
  let actionNodes = 0, aiNodes = 0, totalRuns = 0;
  for (const f of flows) {
    totalRuns += f.runs || 0;
    for (const n of f.nodes) {
      const m = nodeMeta(n.type);
      if (m.kind !== 'trigger') actionNodes++;
      if (m.group === 'AI') aiNodes++;
    }
  }
  return { flows: flows.length, live, actionNodes, aiNodes, totalRuns };
}

/* ============================================================
   WRITE API   (every control routes through one of these)
   ============================================================ */
export function setActiveFlow(id) {
  if (!getFlow(id)) return { error: 'missing' };
  commit({ ...state, activeId: id });
  return { ok: true };
}

export function createFlow(name = 'Untitled workflow') {
  const f = {
    id: newId('flow'), name, description: 'Blank canvas', status: 'draft',
    runs: 0, saves: 0,
    nodes: [{ id: newId('n'), type: 'lead_created', x: 60, y: 140, config: { ...nodeMeta('lead_created').config } }],
    edges: [],
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, flows: [f, ...state.flows], activeId: f.id });
  return { flow: f };
}

export function loadRecipeToCanvas(recipeId) {
  const r = getRecipe(recipeId);
  if (!r) return { error: 'missing' };
  const g = cloneGraph(r, newId('r').replace(/[^a-z0-9]/gi, ''));
  const f = {
    id: newId('flow'), name: r.name, description: r.tagline, recipeId, status: 'draft',
    runs: 0, saves: 0, nodes: g.nodes, edges: g.edges, createdAt: new Date().toISOString(),
  };
  commit({ ...state, flows: [f, ...state.flows], activeId: f.id });
  return { flow: f };
}

export function renameFlow(id, name) {
  const f = getFlow(id); if (!f) return { error: 'missing' };
  f.name = name || f.name; commit({ ...state }); return { flow: f };
}
export function setFlowStatus(id, status) {
  const f = getFlow(id); if (!f) return { error: 'missing' };
  f.status = status; commit({ ...state }); return { flow: f };
}
export function deleteFlow(id) {
  const flows = state.flows.filter(f => f.id !== id);
  const activeId = state.activeId === id ? (flows[0]?.id || null) : state.activeId;
  commit({ ...state, flows, activeId });
  return { ok: true };
}

export function addNode(flowId, type, at) {
  const f = getFlow(flowId); if (!f) return { error: 'missing' };
  const n = { id: newId('n'), type, x: Math.round(at?.x ?? 120), y: Math.round(at?.y ?? 120), config: { ...nodeMeta(type).config } };
  f.nodes = [...f.nodes, n];
  commit({ ...state });
  return { node: n };
}
export function moveNode(flowId, nodeId, x, y) {
  const f = getFlow(flowId); if (!f) return;
  const n = f.nodes.find(n => n.id === nodeId); if (!n) return;
  n.x = Math.round(x); n.y = Math.round(y);
  commit({ ...state });
}
export function updateNodeConfig(flowId, nodeId, config) {
  const f = getFlow(flowId); if (!f) return { error: 'missing' };
  const n = f.nodes.find(n => n.id === nodeId); if (!n) return { error: 'missing' };
  n.config = { ...n.config, ...config };
  commit({ ...state });
  return { node: n };
}
export function removeNode(flowId, nodeId) {
  const f = getFlow(flowId); if (!f) return;
  f.nodes = f.nodes.filter(n => n.id !== nodeId);
  f.edges = f.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  commit({ ...state });
}
export function addEdge(flowId, from, to, fromPort = 'out') {
  const f = getFlow(flowId); if (!f) return { error: 'missing' };
  if (from === to) return { error: 'self' };
  if (!hasInput(getFlow(flowId).nodes.find(n => n.id === to)?.type)) return { error: 'trigger-input' };
  // one edge per (from, port); replace any existing
  f.edges = f.edges.filter(e => !(e.from === from && e.fromPort === fromPort));
  // no duplicate exact edge
  if (!f.edges.some(e => e.from === from && e.to === to && e.fromPort === fromPort)) {
    f.edges = [...f.edges, { id: newId('e'), from, to, fromPort }];
  }
  commit({ ...state });
  return { ok: true };
}
export function removeEdge(flowId, edgeId) {
  const f = getFlow(flowId); if (!f) return;
  f.edges = f.edges.filter(e => e.id !== edgeId);
  commit({ ...state });
}
export function bumpSim() { commit({ ...state, sims: (state.sims || 0) + 1 }); }

/* ============================================================
   RUN SIMULATOR
   Walk a deterministic sample record through the graph. Returns an
   ordered list of steps (for the run log) and the ordered edge ids
   traversed (for the animated token). Branch nodes are evaluated
   against the sample record so the path is stable but believable.
   ============================================================ */
export const SAMPLE_RECORD = {
  first_name: 'Priya', last_name: 'Shah', name: 'Priya Shah',
  company: 'Vertex Robotics', channel: 'inbound SMS',
  score: 82, value: 120000, owner: 'me', opened: true, replied: true, tag: 'champion',
};

function evalBranch(node, rec, rnd) {
  const type = node.type;
  if (type === 'rook_decide') return { port: 'yes', note: 'Rook read the signals and says yes, advance' };
  if (type === 'split') {
    const pct = Number(node.config.percent) || 50;
    const port = (rnd() * 100) < pct ? 'yes' : 'no';
    return { port, note: `Coin landed on path ${port === 'yes' ? 'A' : 'B'} (${pct}% / ${100 - pct}%)` };
  }
  // condition: compare a record field to a value
  const field = node.config.field || 'score';
  const op = node.config.op || 'greater than';
  const target = node.config.value;
  const actual = rec[field];
  let pass = false;
  const numA = Number(actual), numB = Number(target);
  if (op === 'greater than') pass = numA > numB;
  else if (op === 'less than') pass = numA < numB;
  else if (op === 'is') pass = String(actual).toLowerCase() === String(target).toLowerCase();
  else if (op === 'is not') pass = String(actual).toLowerCase() !== String(target).toLowerCase();
  else pass = !!actual;
  const shown = isFinite(numA) ? actual : `"${actual}"`;
  return { port: pass ? 'yes' : 'no', note: `${field} (${shown}) ${op} ${target} -> ${pass ? 'Yes' : 'No'}` };
}

function describe(node, rec) {
  const m = nodeMeta(node.type);
  const R = rec.first_name;
  const map = {
    missed_call: `Inbound ${rec.channel} from ${rec.name} went unanswered`,
    lead_created: `${rec.name} at ${rec.company} entered as a new lead`,
    form_submitted: `${rec.name} submitted the "${node.config.form}" form`,
    deal_stage: `${rec.company} deal moved to ${node.config.stage}`,
    tag_added: `Tag "${node.config.tag}" applied to ${rec.name}`,
    no_activity: `${rec.name} has been quiet for ${node.config.days} days`,
    rook_qualify: `Rook scored ${R} at ${rec.score}/100 - enriched with fit + intent`,
    rook_draft: `Rook drafted: "${node.config.instruction}"`,
    send_sms: `Texted ${R}: "${(node.config.body || '').slice(0, 44)}..."`,
    send_email: `Emailed ${R} with subject "${node.config.subject}"`,
    send_whatsapp: `WhatsApp sent to ${R}`,
    start_sequence: `Enrolled ${R} in the "${node.config.sequence}" sequence`,
    notify_rep: `Pinged the owner on ${node.config.channel}`,
    create_task: `Created task "${node.config.subject}" due ${node.config.due}`,
    update_field: `Set ${node.config.field} = ${node.config.value}`,
    add_to_list: `Added ${R} to the "${node.config.list}" list`,
    create_deal: `Opened a deal on the ${node.config.pipeline} pipeline`,
    webhook: `POSTed the record to ${node.config.url}`,
    filter: `Checked ${node.config.field} ${node.config.op} ${node.config.value}`,
    wait: `Waited ${node.config.amount} ${node.config.unit}`,
  };
  return map[node.type] || `${m.label} ran`;
}

export function runFlow(flow, rec = SAMPLE_RECORD) {
  if (!flow || !flow.nodes.length) return { steps: [], edgePath: [] };
  const rnd = mulberry32(424242);
  const byId = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
  let node = flow.nodes.find(n => nodeMeta(n.type).kind === 'trigger') || flow.nodes[0];
  const steps = [], edgePath = [];
  const seen = new Set();
  let guard = 0;
  while (node && guard++ < 40) {
    if (seen.has(node.id)) break;
    seen.add(node.id);
    const m = nodeMeta(node.type);
    const outs = flow.edges.filter(e => e.from === node.id);
    let chosen = null, branchNote = null;
    if (m.kind === 'branch') {
      const r = evalBranch(node, rec, rnd);
      branchNote = r.note;
      chosen = outs.find(e => e.fromPort === r.port) || outs[0];
    } else {
      chosen = outs[0];
    }
    steps.push({
      nodeId: node.id, type: node.type, group: m.group, icon: m.icon, color: m.color,
      label: m.label, note: branchNote || describe(node, rec),
    });
    if (!chosen) break;
    edgePath.push(chosen.id);
    node = byId[chosen.to];
  }
  return { steps, edgePath };
}
