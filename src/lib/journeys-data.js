// ============================================================
// ARDOVO JOURNEYS  (thin view-model over the ONE automation engine)
//
// Engine 6 (Marketing Hub unification): Journeys is the customer-journey
// framing of Ardovo's single automation engine. There is NO second engine
// here. This module only adds journey-oriented VIEW helpers on top of
// src/lib/automation-engine.js (the same store that powers Workflows), and
// re-exports the engine primitives the Journeys page needs so the page has
// one clean import surface. Every enrollment count is the engine's own
// real enrollment data, not a simulation.
//
// SUPABASE: derives entirely from the engine's automations + enrollments.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import {
  getAutomations, getAutomation, engineStats,
  getEnrollments, getEnrollmentsFor,
  triggerSummary, stepSummary, stepMeta, triggerMeta,
  ENGINE_TEMPLATES, addTemplate, saveAutomation, newAutomationDraft,
  toggleAutomation, deleteAutomation, duplicateAutomation,
  testAutomation, enroll, tick,
  useEngine, useEnrollments, useEngineLog, useEngineRuntime,
  TRIGGERS, STEP_TYPES,
} from './automation-engine.js';

// Re-export the engine primitives the page uses (single import surface).
export {
  getAutomations, getAutomation, engineStats,
  getEnrollments, getEnrollmentsFor,
  triggerSummary, stepSummary, stepMeta, triggerMeta,
  ENGINE_TEMPLATES, addTemplate, saveAutomation, newAutomationDraft,
  toggleAutomation, deleteAutomation, duplicateAutomation,
  testAutomation, enroll, tick,
  useEngine, useEnrollments, useEngineLog, useEngineRuntime,
  TRIGGERS, STEP_TYPES,
};

/* ---------- journey framing over an engine automation ---------- */
export const JOURNEY_STATUSES = [
  { id: 'live',   label: 'Live',   tone: 'ok' },
  { id: 'paused', label: 'Paused', tone: 'warn' },
  { id: 'draft',  label: 'Draft',  tone: 'default' },
];
export function journeyStatusOf(a) {
  if (a.active) return 'live';
  return (a.steps && a.steps.length) ? 'paused' : 'draft';
}
export const journeyStatusMeta = (id) => JOURNEY_STATUSES.find(s => s.id === id) || JOURNEY_STATUSES[2];

// A journey view-model: the automation plus its REAL enrollment rollup.
export function journeyView(a) {
  const ens = getEnrollmentsFor(a.id) || [];
  const activeCount = ens.filter(e => e.status === 'active' || e.status === 'waiting').length;
  const completed = ens.filter(e => e.status === 'completed').length;
  const failed = ens.filter(e => e.status === 'failed').length;
  const enrolled = ens.length;
  return {
    id: a.id,
    name: a.name || 'Untitled journey',
    active: !!a.active,
    status: journeyStatusOf(a),
    steps: a.steps || [],
    trigger: a.trigger,
    triggerLabel: triggerSummary(a),
    enrolled, activeCount, completed, failed,
    conversion: enrolled ? Math.round((completed / enrolled) * 1000) / 10 : 0,
    updatedAt: a.updatedAt || a.createdAt,
  };
}

export function allJourneys() {
  return getAutomations().map(journeyView);
}

// Fleet rollup across every journey - all real engine data.
export function journeyRollup() {
  const list = getAutomations();
  const views = list.map(journeyView);
  const enrolled = views.reduce((s, v) => s + v.enrolled, 0);
  const completed = views.reduce((s, v) => s + v.completed, 0);
  const active = views.reduce((s, v) => s + v.activeCount, 0);
  return {
    total: list.length,
    live: list.filter(a => a.active).length,
    steps: list.reduce((s, a) => s + (a.steps ? a.steps.length : 0), 0),
    enrolled, active, completed,
    conversion: enrolled ? Math.round((completed / enrolled) * 1000) / 10 : 0,
  };
}
