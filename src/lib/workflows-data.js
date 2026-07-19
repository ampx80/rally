// ============================================================
// ARDOVO WORKFLOWS DATA  (consolidation adapter)
// ------------------------------------------------------------
// This module used to be a THIRD, evaluate-only automation engine
// (its own rule shape, its own localStorage store, an evaluateRule
// that matched records but never executed anything). It ran in
// parallel with the real executor and the Flow simulator. That
// parallel builder is gone. There is now ONE engine
// (src/lib/automation-engine.js) that both the Workflows builder and
// the Flow canvas run on.
//
// This file is kept as a thin re-export so any lingering importer
// resolves to the single engine instead of a divergent copy. New code
// should import from './automation-engine.js' directly. ASCII only,
// no long dashes.
// ============================================================
export * from './automation-engine.js';
