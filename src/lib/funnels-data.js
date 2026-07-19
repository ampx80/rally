// ============================================================
// ARDOVO FUNNELS  (local-first, Supabase-swappable)
//
// Engine 6 (Marketing Hub unification): a funnel is an ordered set of
// steps, and each step points at a REAL marketing asset - a landing page
// (authored with the shared visual designer) or a form. Conversion is no
// longer a PRNG simulation: every count is derived from tracked events on
// the referenced asset (landing page views + submissions, form views +
// completions). When an asset has no tracked events yet, the funnel shows
// 0 / empty rather than a fabricated number.
//
// This module owns the funnel/step store (funnel structure only) and the
// pure metric derivation that reads the landing-pages + forms stores. It
// PERSISTS only the funnel definitions; all counts come live from those
// stores, so the funnel is always as honest as the real traffic.
//
// TDZ-safe: helpers used during seeding are hoisted `function`
// declarations, and the persisted `state` is initialized at the bottom.
// SUPABASE: rally_funnels (steps JSON per row); counts derive live from
// rally_landing_pages + rally_forms analytics. No em/en dashes anywhere.
// ============================================================
import { useEffect, useState } from 'react';
import { getLandingPages, getLandingPage } from './landing-pages.js';
import { getForms, getForm, formAnalytics, formSubmissionCount } from './forms.js';

const LS_KEY = 'rally_funnels_v2';   // v2: asset-referencing model (was PRNG sim)

/* ============================================================
   STEP KINDS  (a step references a landing page or a form)
   ============================================================ */
export const STEP_KINDS = {
  landing: { key: 'landing', label: 'Landing page', icon: 'grid',   color: '#5b4bf5', route: '/landing-pages', blurb: 'A page built with the shared designer' },
  form:    { key: 'form',    label: 'Form',         icon: 'list',   color: '#0ea5a3', route: '/forms',         blurb: 'A lead-capture form' },
};
export const STEP_KIND_LIST = Object.values(STEP_KINDS);
export function stepKindMeta(kind) { return STEP_KINDS[kind] || STEP_KINDS.landing; }

export const STATUSES = [
  { id: 'live',   label: 'Live',   tone: 'ok' },
  { id: 'draft',  label: 'Draft',  tone: 'default' },
  { id: 'paused', label: 'Paused', tone: 'warn' },
];
export const statusMeta = (id) => STATUSES.find(s => s.id === id) || STATUSES[1];

/* ============================================================
   ASSET RESOLUTION + METRICS  (pure, read from real stores)
   ============================================================ */

// Resolve a step to its live asset + tracked counts. `entered` is how many
// visitors reached the step's asset; `converted` is how many took the
// asset's conversion action (a landing lead / a form completion). Both are
// REAL tracked counters, never simulated. A missing asset reports 0 + a flag.
export function resolveStep(step) {
  const kind = stepKindMeta(step.kind);
  if (step.kind === 'form') {
    const form = step.refId ? getForm(step.refId) : null;
    if (!form) return { kind, exists: false, name: step.name || 'Unlinked form', entered: 0, converted: 0, to: '/forms', asset: null };
    const a = formAnalytics(form) || {};
    const entered = Number.isFinite(a.views) && a.views > 0 ? a.views : (a.starts || 0);
    const converted = Number.isFinite(a.completions) ? a.completions : formSubmissionCount(form);
    return { kind, exists: true, name: form.name, entered, converted, to: `/f/${form.slug || form.id}`, editTo: '/forms', asset: form };
  }
  // landing
  const page = step.refId ? getLandingPage(step.refId) : null;
  if (!page) return { kind, exists: false, name: step.name || 'Unlinked page', entered: 0, converted: 0, to: '/landing-pages', asset: null };
  return {
    kind, exists: true, name: page.title,
    entered: page.views || 0,
    converted: (page.submissions || []).length,
    published: !!page.published,
    to: page.published ? `/l/${page.slug}` : '/landing-pages',
    editTo: '/landing-pages',
    asset: page,
  };
}

// Per-funnel metrics from REAL tracked counts. Returns a row per step plus
// the overall end-to-end figure. No fabricated numbers: when the referenced
// assets have zero tracked traffic, everything reads 0.
export function funnelMetrics(funnel) {
  const steps = funnel.steps || [];
  const rows = steps.map((s, i) => {
    const r = resolveStep(s);
    // Step conversion = converted / entered for this step's own asset.
    const stepRate = r.entered ? (r.converted / r.entered) * 100 : 0;
    return { step: s, index: i, ...r, stepRate };
  });
  // Flow rate from one step to the next uses the tracked hand-off:
  // next.entered / this.converted (capped at 100 for display honesty).
  rows.forEach((row, i) => {
    if (i === 0) { row.flowRate = 100; return; }
    const prev = rows[i - 1];
    row.flowRate = prev.converted ? Math.min(100, (row.entered / prev.converted) * 100) : 0;
  });
  const topEntered = rows.length ? rows[0].entered : 0;
  const endConverted = rows.length ? rows[rows.length - 1].converted : 0;
  const totalLeads = rows.reduce((s, r) => s + r.converted, 0);
  const endToEnd = topEntered ? (endConverted / topEntered) * 100 : 0;
  const hasTraffic = rows.some(r => r.entered > 0 || r.converted > 0);
  const missing = rows.filter(r => !r.exists).length;
  return { rows, topEntered, endConverted, totalLeads, endToEnd, hasTraffic, missing, stepCount: rows.length };
}

// Aggregate across a set of funnels (grid header KPIs) - all real counts.
export function portfolioMetrics(funnels) {
  let visitors = 0, converted = 0, leads = 0, live = 0;
  for (const f of funnels) {
    if (f.status === 'live') live += 1;
    const m = funnelMetrics(f);
    visitors += m.topEntered;
    converted += m.endConverted;
    leads += m.totalLeads;
  }
  const conv = visitors ? (converted / visitors) * 100 : 0;
  return { visitors, converted, leads, conv, count: funnels.length, live };
}

/* ============================================================
   SEED  (funnels wired to the seeded landing pages + first form)
   ============================================================ */
function firstFormId() {
  try { const fs = getForms(); return fs && fs.length ? fs[0].id : null; } catch { return null; }
}
function landingIdBySlug(slug) {
  try { const p = getLandingPages().find(x => x.slug === slug); return p ? p.id : null; } catch { return null; }
}

let _sc = 0;
function seedStepId() { _sc += 1; return 'fst_' + _sc.toString(36); }

function buildSeed() {
  const now = Date.now();
  const formId = firstFormId();
  const rookId = landingIdBySlug('meet-rook');
  const webinarId = landingIdBySlug('q4-pipeline-webinar');

  const funnels = [
    {
      id: 'fnl_rook', name: 'Rook demo funnel', status: 'live', accent: '#5b4bf5',
      steps: [
        { id: seedStepId(), kind: 'landing', refId: rookId, name: 'Meet Rook' },
        ...(formId ? [{ id: seedStepId(), kind: 'form', refId: formId, name: 'Request a walkthrough' }] : []),
      ],
      createdAt: now - 30 * 86400000, updatedAt: now - 2 * 86400000,
    },
    {
      id: 'fnl_webinar', name: 'Q4 webinar funnel', status: 'draft', accent: '#0ea5a3',
      steps: [
        { id: seedStepId(), kind: 'landing', refId: webinarId, name: 'Close Q4 strong' },
      ],
      createdAt: now - 10 * 86400000, updatedAt: now - 5 * 86400000,
    },
  ];
  return { seededAt: now, funnels };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.funnels)) return normalize(s); }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function normalize(s) {
  return {
    seededAt: s.seededAt || Date.now(),
    funnels: (s.funnels || []).map(f => ({
      id: f.id, name: f.name || 'Untitled funnel',
      status: f.status || 'draft', accent: f.accent || '#5b4bf5',
      steps: Array.isArray(f.steps) ? f.steps.map(st => ({ id: st.id, kind: st.kind === 'form' ? 'form' : 'landing', refId: st.refId || null, name: st.name || '' })) : [],
      createdAt: f.createdAt || Date.now(), updatedAt: f.updatedAt || Date.now(),
    })),
  };
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function getFunnelState() { return state; }
export function resetFunnels() { try { localStorage.removeItem(LS_KEY); } catch {} state = buildSeed(); try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} subs.forEach(fn => fn(state)); }

export function useFunnels(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = 1000;
function newId(p) { idc += 1; return `${p}_${idc.toString(36)}`; }

/* ============================================================
   READ API
   ============================================================ */
export const getFunnels = () => state.funnels;
export const getFunnel = (id) => state.funnels.find(f => f.id === id);
export function getStep(funnelId, stepId) {
  const f = getFunnel(funnelId);
  return f ? (f.steps || []).find(s => s.id === stepId) : null;
}

/* ============================================================
   WRITE API   (validated writers; return record or { error })
   ============================================================ */
export function createFunnel({ name, status = 'draft', accent = '#5b4bf5' } = {}) {
  const f = {
    id: newId('fnl'), name: (name || 'Untitled funnel').trim(),
    status, accent, steps: [], createdAt: Date.now(), updatedAt: Date.now(),
  };
  commit({ ...state, funnels: [f, ...state.funnels] });
  return { funnel: f };
}

export function updateFunnel(id, patch) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  Object.assign(f, patch, { updatedAt: Date.now() });
  commit({ ...state });
  return { funnel: f };
}

export function deleteFunnel(id) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  commit({ ...state, funnels: state.funnels.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicateFunnel(id) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const copy = JSON.parse(JSON.stringify(f));
  copy.id = newId('fnl');
  copy.name = f.name + ' (copy)';
  copy.status = 'draft';
  copy.createdAt = Date.now(); copy.updatedAt = Date.now();
  copy.steps = copy.steps.map(s => ({ ...s, id: newId('fst') }));
  commit({ ...state, funnels: [copy, ...state.funnels] });
  return { funnel: copy };
}

// Add a step referencing an asset. `refId` is a landing page id or form id.
export function addStep(funnelId, { kind = 'landing', refId = null, name = '' } = {}, afterStepId = null) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const step = { id: newId('fst'), kind: kind === 'form' ? 'form' : 'landing', refId: refId || null, name };
  const steps = [...f.steps];
  const at = afterStepId ? steps.findIndex(s => s.id === afterStepId) : steps.length - 1;
  steps.splice((at < 0 ? steps.length - 1 : at) + 1, 0, step);
  f.steps = steps; f.updatedAt = Date.now();
  commit({ ...state });
  return { step };
}

export function updateStep(funnelId, stepId, patch) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  Object.assign(s, patch);
  f.updatedAt = Date.now();
  commit({ ...state });
  return { step: s };
}

export function removeStep(funnelId, stepId) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  f.steps = f.steps.filter(s => s.id !== stepId);
  f.updatedAt = Date.now();
  commit({ ...state });
  return { ok: true };
}

// Move a step up (-1) or down (+1) in the flow.
export function moveStep(funnelId, stepId, dir) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const steps = [...f.steps];
  const i = steps.findIndex(s => s.id === stepId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= steps.length) return { error: 'bounds' };
  const tmp = steps[i]; steps[i] = steps[j]; steps[j] = tmp;
  f.steps = steps; f.updatedAt = Date.now();
  commit({ ...state });
  return { ok: true };
}
