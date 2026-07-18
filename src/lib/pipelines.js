// ============================================================
// ARDOVO PIPELINES  (multi-pipeline registry - additive)
// A persisted registry of deal pipelines, each with its own ordered
// stages. The DEFAULT pipeline's stages are an exact clone of the
// canonical STAGES in store.js, so every existing deal (which has no
// pipelineId) belongs to it and every existing view behaves exactly
// as before. Extra pipelines (e.g. Renewals) are opt-in: a deal only
// leaves the default pipeline once it carries a pipelineId.
//
// Shape: { id, name, isDefault?, stages: [{ id, name, order, probability, type }] }
// SUPABASE: rally_pipelines (config) + rally_stages (child, per-pipeline).
// ============================================================
import { useEffect, useState } from 'react';
import { STAGES } from './store.js';

const LS_KEY = 'rally_pipelines_v1';   // bump to force a clean reseed

export const DEFAULT_PIPELINE_ID = 'default';

/* ============================================================
   SEED  (default mirrors STAGES exactly; one extra example)
   ============================================================ */
function buildSeed() {
  return [
    {
      id: DEFAULT_PIPELINE_ID,
      name: 'Sales Pipeline',
      isDefault: true,
      // Exact clone of the canonical stages so nothing changes for
      // pipeline-less deals. Cloned (not referenced) so edits to a
      // pipeline never mutate the shared STAGES config.
      stages: STAGES.map(s => ({ ...s })),
    },
    {
      id: 'renewals',
      name: 'Renewals',
      stages: [
        { id: 'renewal_upcoming', name: 'Upcoming', order: 1, probability: 20, type: 'open' },
        { id: 'renewal_outreach', name: 'Outreach', order: 2, probability: 40, type: 'open' },
        { id: 'renewal_review', name: 'Contract review', order: 3, probability: 60, type: 'open' },
        { id: 'renewal_negotiation', name: 'Negotiation', order: 4, probability: 80, type: 'open' },
        { id: 'renewal_renewed', name: 'Renewed', order: 5, probability: 100, type: 'won' },
        { id: 'renewal_churned', name: 'Churned', order: 6, probability: 0, type: 'lost' },
      ],
    },
  ];
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let pipelines = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      try { localStorage.setItem(LS_KEY, JSON.stringify(parsed)); } catch {}
      return parsed;
    }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

/* Idempotent migration: guarantee a default pipeline always exists and
   sits first, so pipeline-less deals always resolve. Never overwrites a
   default the user may have edited; only backfills a missing one. */
function migrate(list) {
  if (!Array.isArray(list)) return buildSeed();
  const hasDefault = list.some(p => p && (p.id === DEFAULT_PIPELINE_ID || p.isDefault));
  if (!hasDefault) {
    const seededDefault = buildSeed().find(p => p.id === DEFAULT_PIPELINE_ID);
    return [seededDefault, ...list];
  }
  // Keep the default pinned first for stable switcher ordering.
  const def = list.find(p => p.id === DEFAULT_PIPELINE_ID || p.isDefault);
  const rest = list.filter(p => p !== def);
  return [def, ...rest];
}

function commit(next) {
  pipelines = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(pipelines)); } catch {}
  subs.forEach(fn => fn(pipelines));
}

export function resetPipelines() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  pipelines = load();
  subs.forEach(fn => fn(pipelines));
}

export function usePipelines(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(pipelines));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(pipelines);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = Date.now();
const newId = (p = 'pl') => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API + HELPERS
   ============================================================ */
export const getPipelines = () => pipelines;
export const getPipeline = (id) => pipelines.find(p => p.id === id) || null;
export const getDefaultPipeline = () =>
  pipelines.find(p => p.id === DEFAULT_PIPELINE_ID || p.isDefault) || pipelines[0];

/* Stages for a pipeline id, ordered. Falls back to the default pipeline
   when the id is missing or unknown, so callers always get a usable list. */
export function stagesFor(pipelineId) {
  const p = getPipeline(pipelineId) || getDefaultPipeline();
  return (p?.stages || []).slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

/* The pipeline a deal belongs to. Deals without a pipelineId belong to
   the default pipeline (that is the whole existing book of business). */
export function pipelineOf(deal) {
  if (deal && deal.pipelineId) return getPipeline(deal.pipelineId) || getDefaultPipeline();
  return getDefaultPipeline();
}

/* Convenience: does a deal belong to a given pipeline id? Treats an
   absent pipelineId as the default pipeline. */
export function dealInPipeline(deal, pipelineId) {
  const id = (deal && deal.pipelineId) || DEFAULT_PIPELINE_ID;
  const target = getPipeline(pipelineId) ? pipelineId : DEFAULT_PIPELINE_ID;
  return id === target;
}

/* ============================================================
   WRITE API   (return { error, message } or the record)
   ============================================================ */
function normalizeStages(stages) {
  if (!Array.isArray(stages)) return [];
  return stages.map((s, i) => ({
    id: s.id || newId('st'),
    name: (s.name || `Stage ${i + 1}`).trim(),
    order: s.order ?? i + 1,
    probability: Number.isFinite(Number(s.probability)) ? Number(s.probability) : 0,
    type: s.type || 'open',
  }));
}

export function createPipeline({ name, stages }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Pipeline name is required.' };
  const p = {
    id: newId('pl'),
    name: name.trim(),
    stages: normalizeStages(stages && stages.length ? stages : STAGES.map(s => ({ ...s }))),
  };
  commit([...pipelines, p]);
  return { pipeline: p };
}

export function updatePipeline(id, patch = {}) {
  const p = getPipeline(id);
  if (!p) return { error: 'missing', message: 'Pipeline not found.' };
  const next = { ...p };
  if (patch.name != null) {
    if (!patch.name.trim()) return { error: 'name', message: 'Pipeline name is required.' };
    next.name = patch.name.trim();
  }
  if (patch.stages != null) next.stages = normalizeStages(patch.stages);
  commit(pipelines.map(x => (x.id === id ? next : x)));
  return { pipeline: next };
}

export function addStage(pipelineId, stage = {}) {
  const p = getPipeline(pipelineId);
  if (!p) return { error: 'missing', message: 'Pipeline not found.' };
  const order = (p.stages.reduce((m, s) => Math.max(m, s.order ?? 0), 0)) + 1;
  const st = normalizeStages([{ ...stage, order: stage.order ?? order }])[0];
  const next = { ...p, stages: [...p.stages, st] };
  commit(pipelines.map(x => (x.id === pipelineId ? next : x)));
  return { pipeline: next, stage: st };
}

/* Move a stage to a new index within its pipeline, renumbering `order`
   1..N so the board and forecast render in the intended sequence. */
export function reorderStage(pipelineId, stageId, newIndex) {
  const p = getPipeline(pipelineId);
  if (!p) return { error: 'missing', message: 'Pipeline not found.' };
  const ordered = p.stages.slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const from = ordered.findIndex(s => s.id === stageId);
  if (from === -1) return { error: 'stage', message: 'Stage not found.' };
  const clamped = Math.max(0, Math.min(ordered.length - 1, newIndex));
  const [moved] = ordered.splice(from, 1);
  ordered.splice(clamped, 0, moved);
  const renumbered = ordered.map((s, i) => ({ ...s, order: i + 1 }));
  const next = { ...p, stages: renumbered };
  commit(pipelines.map(x => (x.id === pipelineId ? next : x)));
  return { pipeline: next };
}
