// GET /api/status
//
// A richer status probe than /api/health. Where /api/health answers "is env
// wired", /api/status answers "how is this instance doing right now":
//   - build info (git sha/ref, Vercel env + region, node version)
//   - process uptime for this warm instance (uptime-ish; serverless recycles)
//   - dependency checks: which integrations are configured, plus an optional
//     best-effort live ping of Supabase (bounded by a short timeout so a slow
//     dependency can never hang the probe)
//
// Always returns 200 with a JSON snapshot. The top-level `status` is 'ok' when
// no configured dependency is failing, 'degraded' when a configured dependency
// is down, and each check reports its own state. Safe/no-op when unconfigured:
// a missing integration is 'not-configured', not an error. NO em-dash / en-dash.
import { withErrorHandling } from './_utils.js';

const START = Date.now();

function buildInfo() {
  const e = process.env;
  return {
    app: 'rally',
    env: e.VERCEL_ENV || (e.NODE_ENV || 'development'),
    region: e.VERCEL_REGION || null,
    commit: e.VERCEL_GIT_COMMIT_SHA ? String(e.VERCEL_GIT_COMMIT_SHA).slice(0, 7) : null,
    branch: e.VERCEL_GIT_COMMIT_REF || null,
    commitMessage: e.VERCEL_GIT_COMMIT_MESSAGE ? String(e.VERCEL_GIT_COMMIT_MESSAGE).slice(0, 140) : null,
    deploymentUrl: e.VERCEL_URL || null,
    node: process.version,
  };
}

// process.uptime() is per warm instance. Report both it and our own module-load
// delta so a reader understands this is instance-scoped, not app-wide uptime.
function uptime() {
  let procUp = null;
  try { procUp = Math.round(process.uptime()); } catch { /* ignore */ }
  return {
    instanceSeconds: procUp,
    sinceModuleLoadSeconds: Math.round((Date.now() - START) / 1000),
    note: 'Serverless instances recycle; this is warm-instance uptime, not fleet uptime.',
  };
}

// Wrap a promise so a hung dependency cannot stall the whole probe.
function withTimeout(promise, ms, onTimeout) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(onTimeout), ms)),
  ]);
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { name: 'supabase', state: 'not-configured' };
  const started = Date.now();
  try {
    const probe = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supa = createClient(url, key, { auth: { persistSession: false } });
      // HEAD-style count against a known table; cheap and read-only.
      const { error } = await supa.from('rally_telemetry').select('*', { count: 'exact', head: true });
      // A missing-table error still proves connectivity; only treat network/
      // auth failures as down.
      if (error && !/relation|does not exist|not find|schema cache/i.test(error.message || '')) {
        return { name: 'supabase', state: 'down', detail: error.message.slice(0, 120) };
      }
      return { name: 'supabase', state: 'up', latencyMs: Date.now() - started };
    })();
    return await withTimeout(probe, 2500, { name: 'supabase', state: 'timeout', latencyMs: Date.now() - started });
  } catch (e) {
    return { name: 'supabase', state: 'down', detail: (e?.message || 'error').slice(0, 120) };
  }
}

// Config-only checks (no network) for integrations we do not want to ping.
function configCheck(name, present) {
  return { name, state: present ? 'configured' : 'not-configured' };
}

export default withErrorHandling(async (req, res) => {
  const e = process.env;
  const [supabase] = await Promise.all([checkSupabase()]);

  const checks = [
    supabase,
    configCheck('anthropic', Boolean(e.ANTHROPIC_API_KEY)),
    configCheck('resend', Boolean(e.RESEND_API_KEY)),
    configCheck('telemetry-sink', Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY)),
  ];

  // Overall status is degraded only if a configured dependency is actually
  // failing. not-configured / configured never degrade the probe.
  const failing = checks.some((c) => c.state === 'down' || c.state === 'timeout');
  const status = failing ? 'degraded' : 'ok';

  // No-cache so a monitor always sees the live snapshot.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({
    status,
    time: new Date().toISOString(),
    build: buildInfo(),
    uptime: uptime(),
    checks,
  });
});
