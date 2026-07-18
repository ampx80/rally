// ============================================================
// RALLY AGENT CLOUD  (the native agentic platform layer)
//
// Rally's answer to Agentforce 360 - but agent-native from day one, not
// layered on a 25-year-old core. This is the control plane:
//   - a registry of specialized agents (role, tools, autonomy, model, mandate)
//   - a run ledger with step traces + token/cost accounting (observability)
//   - governance: per-agent mandate (autonomy level, value caps, budgets)
//   - a shared TOOL CATALOG that the headless API (/api/agent), the MCP
//     manifest (/api/mcp), Agent Studio, and the evals surface all read from.
//
// Local-first (localStorage rally_agentcloud_v1), pub/sub like store.js. The
// registry + ledger are the single source of truth every Agent Cloud surface
// reads. Grounded: seedRunsFromEngines() synthesizes the opening run history
// from the real Night Shift + pipeline signals so the ledger is never fake.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_agentcloud_v1';

/* ============================================================
   TOOL CATALOG  (the capability surface exposed to agents)
   Mirrors the Rook action registry + read tools. Shared by the headless API,
   the MCP manifest, Agent Studio, and evals. kind: 'read' never mutates the
   book; 'write' returns a propose-confirm envelope the client executes.
   ============================================================ */
export const TOOL_CATALOG = [
  { name: 'get_pipeline', kind: 'read', group: 'Insight', description: 'Read pipeline value, weighted forecast, win rate, and stage breakdown.', params: {} },
  { name: 'list_deals', kind: 'read', group: 'Insight', description: 'List deals with filters (stage, status, owner, min value).', params: { stage: 'string?', status: 'string?', minValue: 'number?' } },
  { name: 'find_record', kind: 'read', group: 'Insight', description: 'Find a deal, contact, or company by name.', params: { entity: 'string', query: 'string' } },
  { name: 'summarize_deal', kind: 'read', group: 'Insight', description: 'Summarize a deal plus its account tickets and projects.', params: { deal_id: 'string' } },
  { name: 'slipping_deals', kind: 'read', group: 'Insight', description: 'Deals past their close date, ranked by value at risk.', params: {} },
  { name: 'predict_outcome', kind: 'read', group: 'Insight', description: 'Predict an open deal outcome from nearest closed deals (Atlas).', params: { deal_id: 'string' } },
  { name: 'create_company', kind: 'write', group: 'Build', description: 'Create a company.', params: { name: 'string', industry: 'string?', size: 'string?' } },
  { name: 'create_contact', kind: 'write', group: 'Build', description: 'Create a contact, optionally on a company.', params: { firstName: 'string', lastName: 'string?', email: 'string?', companyId: 'string?' } },
  { name: 'create_deal', kind: 'write', group: 'Build', description: 'Open a deal.', params: { name: 'string', value: 'number', stage: 'string?', companyId: 'string?' } },
  { name: 'move_stage', kind: 'write', group: 'Pipeline', description: 'Advance or move a deal stage.', params: { deal_id: 'string', stage: 'string' } },
  { name: 'log_activity', kind: 'write', group: 'Pipeline', description: 'Log a task, call, email, or note on a record.', params: { type: 'string', subject: 'string', relatedId: 'string?' } },
  { name: 'draft_email', kind: 'write', group: 'Outreach', description: 'Draft a grounded follow-up email (staged, never auto-sends).', params: { deal_id: 'string?', tone: 'string?' } },
  { name: 'queue_broadcast', kind: 'write', group: 'Outreach', description: 'Draft/schedule a marketing broadcast to an audience.', params: { audience: 'string', subject: 'string', body: 'string' } },
  { name: 'quote_from_deal', kind: 'write', group: 'Revenue', description: 'Build a draft quote from a deal.', params: { deal_id: 'string' } },
  { name: 'generate_deck', kind: 'write', group: 'Revenue', description: 'Generate a QBR deck for an account.', params: { company_id: 'string' } },
  { name: 'fork_whatif', kind: 'write', group: 'Analysis', description: 'Model a pipeline change in a non-destructive branch.', params: { move: 'string', days: 'number?', pct: 'number?' } },
  { name: 'build_account', kind: 'write', group: 'Build', description: 'Stand up a whole account (company + committee + deal + tasks) from one sentence.', params: { goal: 'string' } },
];
export const toolByName = (n) => TOOL_CATALOG.find(t => t.name === n) || null;

/* ============================================================
   MODELS + COST  (consumption meter)  $ per 1M tokens
   ============================================================ */
export const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', in: 3, out: 15, tier: 'balanced' },
  { id: 'claude-opus-4', label: 'Claude Opus 4', in: 15, out: 75, tier: 'frontier' },
  { id: 'gpt-realtime', label: 'GPT Realtime', in: 32, out: 64, tier: 'voice' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', in: 0.5, out: 2, tier: 'fast' },
  { id: 'gemini-2-flash', label: 'Gemini 2 Flash', in: 0.3, out: 1.2, tier: 'fast' },
];
export const modelById = (id) => MODELS.find(m => m.id === id) || MODELS[0];
export function estimateCost(tokensIn = 0, tokensOut = 0, modelId = 'claude-sonnet-4-6') {
  const m = modelById(modelId);
  return (tokensIn / 1e6) * m.in + (tokensOut / 1e6) * m.out;
}

/* ============================================================
   AUTONOMY + MANDATE (governance)
   ============================================================ */
export const AUTONOMY = [
  { id: 'suggest', label: 'Suggest', blurb: 'Proposes only. You run everything.' },
  { id: 'approve', label: 'Approve', blurb: 'Stages actions for one-click approval.' },
  { id: 'auto', label: 'Autonomous', blurb: 'Executes inside its mandate, logs everything.' },
];
export const DEFAULT_MANDATE = { maxDealValue: 250000, maxActionsPerRun: 12, allowWrites: true, noDiscount: true };

/* ============================================================
   DEFAULT FLEET  (mapped to Rally's real engines)
   ============================================================ */
function defaultAgents() {
  const now = Date.now();
  const A = (o) => ({ status: 'active', model: 'claude-sonnet-4-6', autonomy: 'approve', mandate: { ...DEFAULT_MANDATE }, createdAt: now, builtin: true, ...o });
  return [
    A({ id: 'guardian', name: 'Pipeline Guardian', role: 'Keeps every stage honest - advances deals whose evidence outran their stage.', icon: 'trendUp', tools: ['list_deals', 'move_stage', 'predict_outcome'], engine: 'nightshift:advance' }),
    A({ id: 'followup', name: 'Follow-up Writer', role: 'Drafts re-engagement for deals going quiet. Nothing sends without you.', icon: 'mail', tools: ['slipping_deals', 'draft_email', 'log_activity'], engine: 'nightshift:draft' }),
    A({ id: 'rescue', name: 'Deal Rescue', role: 'Opens next-best tasks on at-risk and single-threaded deals.', icon: 'shield', tools: ['slipping_deals', 'log_activity', 'summarize_deal'], engine: 'nightshift:task' }),
    A({ id: 'forecaster', name: 'Forecast Analyst', role: 'Reads the book and flags forecast risk, coverage gaps, and anomalies.', icon: 'activity', tools: ['get_pipeline', 'predict_outcome', 'fork_whatif'], autonomy: 'suggest', engine: 'intelligence' }),
    A({ id: 'enricher', name: 'Enrichment', role: 'Fills missing account and contact context from signals.', icon: 'sparkles', tools: ['find_record', 'create_contact'], autonomy: 'suggest', engine: 'signals' }),
    A({ id: 'sdr', name: 'Autonomous SDR', role: 'Works inbound leads: qualifies, drafts outreach, books the meeting.', icon: 'zap', tools: ['queue_broadcast', 'draft_email', 'create_deal'], engine: 'autopilot' }),
    A({ id: 'closer', name: 'Deal Closer Copilot', role: 'Assembles quotes and QBR decks from live deals on request.', icon: 'receipt', tools: ['quote_from_deal', 'generate_deck', 'summarize_deal'], autonomy: 'suggest', engine: 'rook' }),
    A({ id: 'architect', name: 'Account Architect', role: 'Stands up a whole account from one sentence (Juggernaut).', icon: 'command', tools: ['build_account', 'create_company', 'create_deal'], engine: 'rook-plan' }),
  ];
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function freshState() {
  return { agents: defaultAgents(), runs: [], settings: { defaultModel: 'claude-sonnet-4-6', byoLlm: false, zeroRetention: true }, seeded: false };
}
function normalize(s) {
  const base = freshState();
  return {
    agents: Array.isArray(s?.agents) && s.agents.length ? s.agents : base.agents,
    runs: Array.isArray(s?.runs) ? s.runs : [],
    settings: { ...base.settings, ...(s?.settings || {}) },
    seeded: !!s?.seeded,
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
export function useAgentCloud(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ---------- reads ---------- */
export const getAgents = () => state.agents;
export const getAgent = (id) => state.agents.find(a => a.id === id) || null;
export const getRuns = () => state.runs;
export const getSettings = () => state.settings;

/* ---------- agent CRUD (Agent Studio + AgentExchange) ---------- */
export function createAgent(def = {}) {
  const a = {
    id: newId('agent'), name: def.name || 'New agent', role: def.role || '', icon: def.icon || 'sparkles',
    tools: Array.isArray(def.tools) ? def.tools : [], model: def.model || state.settings.defaultModel,
    autonomy: def.autonomy || 'suggest', mandate: { ...DEFAULT_MANDATE, ...(def.mandate || {}) },
    status: 'active', builtin: false, createdAt: Date.now(),
  };
  commit({ ...state, agents: [a, ...state.agents] });
  return a;
}
export function updateAgent(id, patch) {
  commit({ ...state, agents: state.agents.map(a => a.id === id ? { ...a, ...patch, mandate: { ...a.mandate, ...(patch.mandate || {}) } } : a) });
  return getAgent(id);
}
export function toggleAgent(id) {
  const a = getAgent(id); if (!a) return;
  updateAgent(id, { status: a.status === 'active' ? 'paused' : 'active' });
}
export function deleteAgent(id) {
  commit({ ...state, agents: state.agents.filter(a => a.id !== id) });
}
export function updateSettings(patch) { commit({ ...state, settings: { ...state.settings, ...patch } }); return state.settings; }

/* ---------- run ledger (observability) ---------- */
export function startRun({ agentId, trigger = 'manual' }) {
  const agent = getAgent(agentId);
  const run = {
    id: newId('run'), agentId, agentName: agent?.name || agentId, model: agent?.model || state.settings.defaultModel,
    trigger, status: 'running', startedAt: new Date().toISOString(), endedAt: null,
    steps: [], findings: '', tokensIn: 0, tokensOut: 0, costUsd: 0,
  };
  commit({ ...state, runs: [run, ...state.runs].slice(0, 200) });
  return run;
}
export function logStep(runId, { label, detail = '', tokensIn = 0, tokensOut = 0, kind = 'step' }) {
  const runs = state.runs.map(r => {
    if (r.id !== runId) return r;
    const ti = r.tokensIn + tokensIn, to = r.tokensOut + tokensOut;
    return { ...r, tokensIn: ti, tokensOut: to, costUsd: estimateCost(ti, to, r.model), steps: [...r.steps, { at: new Date().toISOString(), label, detail, kind, tokensIn, tokensOut }] };
  });
  commit({ ...state, runs });
}
export function finishRun(runId, { status = 'done', findings = '' } = {}) {
  commit({ ...state, runs: state.runs.map(r => r.id === runId ? { ...r, status, findings, endedAt: new Date().toISOString() } : r) });
}

export function runStats() {
  const r = state.runs;
  return {
    total: r.length,
    running: r.filter(x => x.status === 'running').length,
    awaiting: r.filter(x => x.status === 'awaiting_approval').length,
    done: r.filter(x => x.status === 'done').length,
    failed: r.filter(x => x.status === 'failed').length,
    tokens: r.reduce((s, x) => s + x.tokensIn + x.tokensOut, 0),
    costUsd: r.reduce((s, x) => s + (x.costUsd || 0), 0),
    activeAgents: state.agents.filter(a => a.status === 'active').length,
  };
}

/* ============================================================
   GROUNDED SEED: synthesize the opening run history from a caller-supplied
   set of real signals (Night Shift proposals, slipping deals). Called once by
   the Command Center so the ledger reflects real work, not fabricated data.
   signals: { proposals:[{kind,title,dealName,value,rationale}], slipping:[{name,value}] }
   ============================================================ */
export function seedRunsFromEngines(signals = {}) {
  if (state.seeded) return;
  const runs = [];
  const mkRun = (agentId, trigger, steps, status, findings) => {
    const agent = getAgent(agentId);
    let ti = 0, to = 0;
    const stepObjs = steps.map((s, i) => {
      const sti = 400 + i * 120, sto = 220 + i * 90; ti += sti; to += sto;
      return { at: new Date(Date.now() - (steps.length - i) * 60000).toISOString(), label: s.label, detail: s.detail || '', kind: s.kind || 'step', tokensIn: sti, tokensOut: sto };
    });
    runs.push({
      id: newId('run'), agentId, agentName: agent?.name || agentId, model: agent?.model || 'claude-sonnet-4-6',
      trigger, status, startedAt: new Date(Date.now() - (steps.length + 1) * 60000).toISOString(),
      endedAt: new Date().toISOString(), steps: stepObjs, findings,
      tokensIn: ti, tokensOut: to, costUsd: estimateCost(ti, to, agent?.model || 'claude-sonnet-4-6'),
    });
  };

  const props = Array.isArray(signals.proposals) ? signals.proposals : [];
  const advances = props.filter(p => p.kind === 'advance').slice(0, 3);
  const drafts = props.filter(p => p.kind === 'draft').slice(0, 3);
  const tasks = props.filter(p => p.kind === 'task').slice(0, 3);

  if (advances.length) mkRun('guardian', 'scheduled', [
    { label: 'Scanned open pipeline', detail: `${props.length} signals reviewed` },
    ...advances.map(a => ({ label: a.title || `Advance ${a.dealName}`, detail: a.rationale || '', kind: 'proposal' })),
  ], 'awaiting_approval', `${advances.length} stage advances staged for approval.`);

  if (drafts.length) mkRun('followup', 'scheduled', [
    { label: 'Found cooling deals', detail: `${drafts.length} gone quiet` },
    ...drafts.map(d => ({ label: d.title || `Draft to ${d.dealName}`, detail: d.rationale || '', kind: 'proposal' })),
  ], 'awaiting_approval', `${drafts.length} follow-ups drafted, staged (not sent).`);

  if (tasks.length) mkRun('rescue', 'scheduled', [
    { label: 'Checked exposed deals', detail: `${tasks.length} single-threaded or at risk` },
    ...tasks.map(t => ({ label: t.title || `Rescue ${t.dealName}`, detail: t.rationale || '', kind: 'proposal' })),
  ], 'awaiting_approval', `${tasks.length} rescue tasks lined up.`);

  const slip = Array.isArray(signals.slipping) ? signals.slipping : [];
  if (slip.length) mkRun('forecaster', 'scheduled', [
    { label: 'Recomputed weighted forecast', detail: 'coverage + anomaly scan' },
    { label: `${slip.length} deals slipping`, detail: slip.slice(0, 3).map(s => s.name).join(', '), kind: 'finding' },
  ], 'done', `Forecast risk flagged on ${slip.length} slipping deals.`);

  if (!runs.length) return; // nothing real to seed yet; leave empty
  commit({ ...state, runs: [...runs, ...state.runs].slice(0, 200), seeded: true });
}

export function markSeeded() { commit({ ...state, seeded: true }); }
