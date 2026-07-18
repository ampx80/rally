// Ardovo monitoring installer.
//
// initMonitoring() attaches the global error handlers exactly once and stamps a
// release/environment tag from the Vite build env. Call it a single time at
// boot (e.g. the top of src/main.jsx). It is idempotent - calling it again is a
// harmless no-op - and it NEVER throws.
//
// Handlers installed:
//   - window.onerror  (via addEventListener('error'))       -> uncaught errors
//   - unhandledrejection                                     -> rejected promises
//
// Both route into captureError() from monitoring.js, which dedupes, scrubs PII,
// and ships to Sentry or the telemetry sink (or no-ops when neither is set).
//
// ASCII only. NO em-dash / en-dash.
import { captureError, monitoringMode, monitoringSessionId } from './monitoring.js';

let installed = false;

// Guard against double-install across HMR / repeated imports by also tagging
// the window object (survives module re-eval in dev).
function alreadyInstalled() {
  if (installed) return true;
  try { if (typeof window !== 'undefined' && window.__rallyMonitorInstalled) return true; } catch { /* ignore */ }
  return false;
}
function markInstalled() {
  installed = true;
  try { if (typeof window !== 'undefined') window.__rallyMonitorInstalled = true; } catch { /* ignore */ }
}

function onError(event) {
  try {
    // Prefer the real Error object when the browser provides it.
    const err = event && event.error
      ? event.error
      : new Error((event && event.message) || 'Uncaught error');
    captureError(err, {
      handler: 'window.onerror',
      filename: event && event.filename ? String(event.filename).slice(0, 300) : undefined,
      lineno: event && typeof event.lineno === 'number' ? event.lineno : undefined,
      colno: event && typeof event.colno === 'number' ? event.colno : undefined,
    }, 'uncaught');
  } catch { /* never rethrow from a handler */ }
}

function onRejection(event) {
  try {
    const reason = event ? event.reason : undefined;
    const err = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : safe(reason));
    captureError(err, { handler: 'unhandledrejection' }, 'unhandledrejection');
  } catch { /* never rethrow */ }
}

function safe(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

// initMonitoring() - install once. Returns the active mode string for logging.
export function initMonitoring() {
  try {
    if (typeof window === 'undefined') return monitoringMode;
    if (alreadyInstalled()) return monitoringMode;
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    markInstalled();
    // One quiet breadcrumb in dev so it is obvious the monitor is live.
    try {
      if (import.meta.env && import.meta.env.DEV) {
        console.debug('[rally/monitor] installed', { mode: monitoringMode, session: monitoringSessionId });
      }
    } catch { /* ignore */ }
  } catch { /* installation must never break boot */ }
  return monitoringMode;
}

export default initMonitoring;
