// Ardovo error boundaries.
//
// <ErrorBoundary> is the app-level net: wrap the whole tree so a render crash
// shows a calm, on-brand apology instead of a white screen. It logs the crash
// through the structured logger (which best-effort ships it to /api/telemetry
// when configured) and offers Reload + Report actions.
//
// <RouteErrorBoundary> is a lighter variant for wrapping a single route/page so
// one broken screen does not take down the shell (nav stays usable). Same
// logging, smaller inline card, a "Try again" that resets the boundary in place.
//
// Both are plain React class components (error boundaries must be classes) and
// depend only on the logger. Styling uses the existing CSS variables so it
// tracks light/dark automatically. NO em-dash / en-dash.
import React from 'react';
import { logger } from '../lib/logger.js';

const log = logger.with({ area: 'error-boundary' });

// Build a copyable diagnostic bundle: the error, where it happened, and the
// recent in-memory log ring. No PII is added here beyond whatever the app
// already logged. Kept small enough to paste into an email or issue.
function buildReport(error, info, scope) {
  let url = '';
  try { url = location.href; } catch { /* ignore */ }
  let ua = '';
  try { ua = navigator.userAgent; } catch { /* ignore */ }
  return {
    scope,
    when: new Date().toISOString(),
    url,
    userAgent: ua,
    session: log.sessionId,
    error: { name: error?.name || 'Error', message: error?.message || String(error), stack: error?.stack || null },
    componentStack: info?.componentStack || null,
    recentLogs: (() => { try { return log.snapshot().slice(-40); } catch { return []; } })(),
  };
}

async function copyReport(report) {
  const text = JSON.stringify(report, null, 2);
  try {
    if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

function tinyToast(msg) {
  try {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:.75rem 1.25rem;border-radius:10px;font-weight:600;background:#111827;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.28)';
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2200);
  } catch { /* ignore */ }
}

const wrap = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' };
const card = {
  maxWidth: 460, width: '100%', textAlign: 'center',
  background: 'var(--paper, #fff)', color: 'var(--ink, #14161d)',
  border: '1px solid var(--line, #e6e8ef)', borderRadius: 'var(--r-lg, 18px)',
  boxShadow: 'var(--shadow-lg, 0 20px 50px rgba(20,24,40,.14))', padding: '2.25rem 2rem',
};
const mark = {
  width: 52, height: 52, borderRadius: 14, margin: '0 auto 1.1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff',
  fontSize: 26, boxShadow: '0 10px 26px rgba(91,75,245,.35)',
};
const btnRow = { display: 'flex', gap: '.65rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' };
const btnBase = { fontWeight: 700, fontSize: '.95rem', padding: '.6rem 1.15rem', borderRadius: 'var(--r-sm, 10px)', cursor: 'pointer', border: '1px solid transparent' };
const btnPrimary = { ...btnBase, background: 'var(--accent, #5b4bf5)', color: '#fff' };
const btnGhost = { ...btnBase, background: 'transparent', color: 'var(--n-600, #5b6070)', border: '1px solid var(--line-strong, #d3d7e2)' };

class BaseBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleReport = this.handleReport.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Log through the structured logger (ships to telemetry when configured).
    try {
      log.error('React render crash', {
        scope: this.props.scope || 'app',
        name: error?.name,
        message: error?.message,
        componentStack: info?.componentStack ? String(info.componentStack).slice(0, 1200) : undefined,
      });
    } catch { /* logging must never rethrow */ }
    // Let a host wire in extra handling (e.g. a toast) if it wants.
    try { this.props.onError && this.props.onError(error, info); } catch { /* ignore */ }
  }

  handleReload() {
    try { location.reload(); } catch { /* ignore */ }
  }

  handleReset() {
    // Reset in place so a transient error can recover without a full reload.
    this.setState({ error: null, info: null });
    try { this.props.onReset && this.props.onReset(); } catch { /* ignore */ }
  }

  async handleReport() {
    const report = buildReport(this.state.error, this.state.info, this.props.scope || 'app');
    try { log.flush(); } catch { /* ignore */ }
    const ok = await copyReport(report);
    tinyToast(ok ? 'Diagnostics copied. Paste them to us and we will jump on it.' : 'Could not copy automatically. Please screenshot this screen.');
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Custom fallback override, if a host passed one.
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error: this.state.error, reset: this.handleReset, reload: this.handleReload, report: this.handleReport });
    }

    const compact = this.props.variant === 'route';
    if (compact) {
      return (
        <div style={{ ...wrap, minHeight: '40vh' }}>
          <div style={{ ...card, maxWidth: 420, padding: '1.75rem 1.5rem' }}>
            <div style={{ ...mark, width: 44, height: 44, fontSize: 22 }} aria-hidden>!</div>
            <h3 style={{ margin: '0 0 .4rem', fontSize: '1.15rem' }}>This screen hit a snag</h3>
            <p style={{ margin: 0, color: 'var(--n-600, #5b6070)', fontSize: '.95rem', lineHeight: 1.5 }}>
              The rest of Ardovo is fine. You can retry this view or head back.
            </p>
            <div style={btnRow}>
              <button style={btnPrimary} onClick={this.handleReset}>Try again</button>
              <button style={btnGhost} onClick={this.handleReport}>Copy details</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={wrap} role="alert" aria-live="assertive">
        <div style={card}>
          <div style={mark} aria-hidden>!</div>
          <h2 style={{ margin: '0 0 .5rem', fontSize: '1.4rem', letterSpacing: '-.01em' }}>Something went sideways</h2>
          <p style={{ margin: 0, color: 'var(--n-600, #5b6070)', fontSize: '1rem', lineHeight: 1.55 }}>
            Ardovo hit an unexpected error and stopped this view to keep your data safe.
            Reloading usually clears it. If it keeps happening, send us the details and
            we will get on it fast.
          </p>
          <div style={btnRow}>
            <button style={btnPrimary} onClick={this.handleReload}>Reload Ardovo</button>
            <button style={btnGhost} onClick={this.handleReport}>Report the problem</button>
          </div>
          <p style={{ margin: '1.1rem 0 0', fontSize: '.78rem', color: 'var(--n-500, #8a8fa3)' }}>
            Reference {log.sessionId}
          </p>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary(props) {
  return <BaseBoundary scope="app" {...props} />;
}

export function RouteErrorBoundary(props) {
  return <BaseBoundary scope="route" variant="route" {...props} />;
}

export default ErrorBoundary;
