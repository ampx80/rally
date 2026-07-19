// ============================================================
// ARDOVO FLOW DATA  (consolidation adapter)
// ------------------------------------------------------------
// This module used to be a SECOND, parallel automation runtime: its
// own node-graph model, its own localStorage store, and a fake run
// simulator that walked a hard-coded sample record through a graph.
// That parallel builder is gone. There is now ONE engine
// (src/lib/automation-engine.js) and Flow.jsx is a read-only canvas
// over it.
//
// This file is kept as a thin re-export so any lingering importer
// resolves to the single engine instead of a divergent copy. New code
// should import from './automation-engine.js' directly. ASCII only,
// no long dashes.
// ============================================================
export * from './automation-engine.js';
