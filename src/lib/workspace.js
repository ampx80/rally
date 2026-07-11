// ============================================================
// RALLY WORKSPACE  (org provisioning + membership, local-first)
// The self-serve funnel needs a notion of "which org am I in and what
// can it do". This module owns that: create an org on signup, track the
// current workspace, invite members, and answer plan-gating questions
// via canUse(feature). It is local-first (persists to localStorage,
// pub/sub like src/lib/onboarding-data.js) and best-effort mirrors to
// Supabase when the browser client is configured, so nothing here throws
// or changes behavior when the DB env is absent.
//
// This module is DORMANT until a page (Welcome) or component (Paywall)
// imports it. Importing it is side-effect free beyond reading localStorage.
// Plan gating reads the shared catalog in src/lib/plans.js so it never
// drifts from pricing, and mirrors the chosen plan into src/lib/billing.js
// so the in-app plan picker and gates agree on the current tier.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { PLANS, DEFAULT_PLAN_ID, planById } from './plans.js';
import { getPlanState, setPlanState } from './billing.js';
import { getBrowserSupabase, isConfigured } from './supabase-browser.js';

const LS = 'rally_workspace_v1';

/* ---------- plan ranking + feature gating ---------- */
// Rank by position in the shared catalog (starter < growth < enterprise).
function planRank(id) {
  const i = PLANS.findIndex((p) => p.id === id);
  return i < 0 ? 0 : i;
}
export function planOrder() {
  return PLANS.map((p) => p.id);
}

// Minimum plan a feature requires. Anything not listed is treated as a
// Starter-tier capability (allowed for everyone) so an unknown key never
// hard-blocks a screen. Keep the growth/enterprise sets aligned with the
// FEATURE_MATRIX groups in plans.js.
export const FEATURE_MIN_PLAN = {
  // Starter (everyone)
  contacts: 'starter', companies: 'starter', deals: 'starter', leads: 'starter',
  pipeline: 'starter', rook_basics: 'starter', activities: 'starter',
  // Growth
  automations: 'growth', sequences: 'growth', campaigns: 'growth',
  projects: 'growth', dashboards: 'growth', reports: 'growth',
  forecasting: 'growth', rook_full: 'growth', custom_fields: 'growth',
  // Enterprise
  rbac: 'enterprise', sso: 'enterprise', scim: 'enterprise',
  audit_log: 'enterprise', priority_support: 'enterprise', success_manager: 'enterprise',
};

// The plan id a feature needs (defaults to starter for unknown keys).
export function requiredPlanFor(feature) {
  return FEATURE_MIN_PLAN[feature] || DEFAULT_PLAN_ID;
}

/* ---------- persistence + pub/sub ---------- */
const subs = new Set();

function hasWindow() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function newId(prefix) {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  } catch { /* ignore */ }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function defaults() {
  return { version: 1, workspaces: [], currentId: null };
}

function read() {
  if (!hasWindow()) return defaults();
  try {
    const raw = window.localStorage.getItem(LS);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* ignore malformed */ }
  return defaults();
}

let state = read();

function commit(next) {
  state = next;
  if (hasWindow()) {
    try { window.localStorage.setItem(LS, JSON.stringify(state)); } catch { /* ignore quota */ }
  }
  subs.forEach((fn) => { try { fn(state); } catch { /* ignore */ } });
  return state;
}

/* ---------- reads ---------- */
export function getWorkspaceState() { return state; }

export function getCurrentWorkspace() {
  if (!state.currentId) return null;
  return state.workspaces.find((w) => w.id === state.currentId) || null;
}

export function hasWorkspace() {
  return !!getCurrentWorkspace();
}

// The plan id the app should gate on. Prefer the current workspace, then the
// local billing state (so gating works in today's demo before any workspace
// exists), then the free default. Never throws.
export function effectivePlanId() {
  const w = getCurrentWorkspace();
  if (w && w.plan) return w.plan;
  try { return getPlanState().planId || DEFAULT_PLAN_ID; } catch { return DEFAULT_PLAN_ID; }
}

export function effectivePlan() {
  return planById(effectivePlanId()) || planById(DEFAULT_PLAN_ID);
}

// Can the current workspace use `feature`? True when the effective plan ranks
// at or above the feature's minimum plan. Unknown features default to allowed.
export function canUse(feature) {
  return planRank(effectivePlanId()) >= planRank(requiredPlanFor(feature));
}

// Seat headroom for the current plan. Free/Starter caps at plan.maxSeats;
// paid per-seat and custom plans are unlimited (null max => true).
export function canAddSeat() {
  const plan = effectivePlan();
  const w = getCurrentWorkspace();
  const used = (w?.members?.length || 1);
  if (!plan || plan.maxSeats == null) return true;
  return used < plan.maxSeats;
}

/* ---------- best-effort Supabase mirror (never blocks, never throws) ---------- */
// SUPABASE: orgs / org_members tables. When VITE_SUPABASE_* are set we mirror
// the local write so a live deploy has a real row; the local copy stays the
// source of truth for the demo. Failures are swallowed on purpose.
function mirrorOrg(ws) {
  if (!isConfigured()) return;
  const sb = getBrowserSupabase();
  if (!sb) return;
  try {
    Promise.resolve(
      sb.from('rally_orgs').upsert({
        id: ws.id,
        name: ws.name,
        plan_id: ws.plan,
        cycle: ws.cycle,
        owner_email: ws.ownerEmail || null,
        seats: ws.members?.length || 1,
      })
    ).catch(() => { /* dormant table or RLS; demo is unaffected */ });
  } catch { /* ignore */ }
}

/* ---------- writes ---------- */
// Provision a workspace and make it current. Returns the workspace object.
// opts: { name, plan, cycle, ownerEmail, ownerName }.
export function createWorkspace(opts = {}) {
  const name = String(opts.name || '').trim() || 'My Workspace';
  const plan = planById(opts.plan) ? opts.plan : DEFAULT_PLAN_ID;
  const cycle = opts.cycle === 'annual' ? 'annual' : 'monthly';
  const ownerEmail = String(opts.ownerEmail || '').trim().toLowerCase() || null;
  const ws = {
    id: newId('ws'),
    name,
    plan,
    cycle,
    ownerEmail,
    createdAt: new Date().toISOString(),
    members: [
      { email: ownerEmail || 'you@workspace', name: opts.ownerName || 'You', role: 'owner', status: 'active' },
    ],
  };
  commit({ ...state, workspaces: [...state.workspaces, ws], currentId: ws.id });
  // Keep the billing/plan picker in lockstep with the chosen tier.
  try { setPlanState({ planId: plan, cycle, seats: 1, demo: true }); } catch { /* ignore */ }
  mirrorOrg(ws);
  return ws;
}

export function setCurrentWorkspace(id) {
  if (!state.workspaces.some((w) => w.id === id)) return getCurrentWorkspace();
  commit({ ...state, currentId: id });
  const w = getCurrentWorkspace();
  if (w) { try { setPlanState({ planId: w.plan, cycle: w.cycle, seats: 1, demo: true }); } catch { /* ignore */ } }
  return w;
}

// Set the current workspace plan + cycle. Mirrors into billing so the plan
// picker and every gate read the same tier.
export function setWorkspacePlan(planId, cycle) {
  const w = getCurrentWorkspace();
  const plan = planById(planId) ? planId : DEFAULT_PLAN_ID;
  const cyc = cycle === 'annual' ? 'annual' : (w?.cycle || 'monthly');
  if (w) {
    const next = state.workspaces.map((x) => (x.id === w.id ? { ...x, plan, cycle: cyc } : x));
    commit({ ...state, workspaces: next });
    mirrorOrg({ ...w, plan, cycle: cyc });
  }
  try { setPlanState({ planId: plan, cycle: cyc, seats: 1, demo: true }); } catch { /* ignore */ }
  return getCurrentWorkspace();
}

// Add pending invites to the current workspace. Dedupes and lowercases.
// role defaults to 'member'. Returns the updated member list.
export function inviteMembers(emails = [], role = 'member') {
  const w = getCurrentWorkspace();
  if (!w) return [];
  const existing = new Set((w.members || []).map((m) => m.email));
  const clean = (Array.isArray(emails) ? emails : [emails])
    .map((e) => String(e || '').trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !existing.has(e));
  if (clean.length === 0) return w.members || [];
  const added = clean.map((email) => ({ email, name: email.split('@')[0], role, status: 'invited' }));
  const merged = [...(w.members || []), ...added];
  const next = state.workspaces.map((x) => (x.id === w.id ? { ...x, members: merged } : x));
  commit({ ...state, workspaces: next });
  return merged;
}

export function resetWorkspace() {
  commit(defaults());
}

/* ---------- hook ---------- */
// Reactive snapshot + bound helpers. Re-renders on any workspace mutation.
export function useWorkspace() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = (s) => setSnap({ ...s });
    subs.add(fn);
    // Cross-tab sync so a second tab picks up a new workspace.
    const onStorage = (e) => { if (e.key === LS) { state = read(); setSnap({ ...state }); } };
    if (hasWindow()) window.addEventListener('storage', onStorage);
    fn(state);
    return () => {
      subs.delete(fn);
      if (hasWindow()) window.removeEventListener('storage', onStorage);
    };
  }, []);
  const current = snap.currentId ? snap.workspaces.find((w) => w.id === snap.currentId) || null : null;
  return {
    ...snap,
    current,
    hasWorkspace: !!current,
    plan: effectivePlan(),
    planId: effectivePlanId(),
    canUse,
    canAddSeat,
    requiredPlanFor,
    createWorkspace,
    setCurrentWorkspace,
    setWorkspacePlan,
    inviteMembers,
  };
}
