// api/nightshift-run.js
//
// Server-side entry point for Ardovo's Night Shift (the reversible
// autonomous operator). Two triggers, both env-gated and fail-safe:
//
//   GET  (cron trigger, no body)
//     The nightly "overnight pass". In the hosted product this reads the
//     book from Supabase, computes proposals, and stages them into
//     rally_nightshift_proposals for the morning Diff of Record. Ardovo's
//     demo store is client-side, so with no Supabase configured there is
//     nothing durable to compute on the server: it no-ops with a 200 and a
//     clear reason. The cron NEVER errors.
//
//   POST { action: 'ping' }
//     Lightweight health/echo used by the client to confirm the endpoint
//     is wired without triggering any compute.
//
// Design contract (LDS platform rule): this endpoint is safe to schedule.
// It performs NO autonomous send and NO destructive write. All it can ever
// do server-side is STAGE proposals for a human to approve in the UI - the
// same guarantee the client-side src/lib/nightshift.js enforces. If the
// durable path is unavailable it degrades to a no-op, never a stall with a
// silent failure.
//
// Env (all optional - absence degrades cleanly, never throws):
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - durable book + staging tables
//   NIGHTSHIFT_ENABLED - set to "false" to hard-disable the cron no-op path
//
// ASCII only. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const hasSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export default withErrorHandling(async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'POST') {
    const body = readJsonBody(req);
    if (body.action === 'ping') {
      return res.status(200).json({ ok: true, service: 'nightshift-run', durable: hasSupabase() });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action. Use { action: "ping" } or GET for the cron pass.' });
  }

  if (method !== 'GET') return methodNotAllowed(res, ['GET', 'POST']);

  // Hard kill-switch for the scheduled path.
  if (String(process.env.NIGHTSHIFT_ENABLED || '').toLowerCase() === 'false') {
    return res.status(200).json({ ok: true, ran: false, staged: 0, reason: 'Night Shift is disabled via NIGHTSHIFT_ENABLED.' });
  }

  // Without a durable backend there is no server-side book to operate on.
  // The client-side store computes the real Diff of Record in the app. This
  // keeps the cron honest and green in every environment.
  if (!hasSupabase()) {
    return res.status(200).json({
      ok: true,
      ran: false,
      staged: 0,
      reason: 'No durable store configured (SUPABASE_URL/SERVICE_ROLE_KEY absent). Night Shift computes proposals client-side in the app; the cron is a no-op here by design.',
      at: new Date().toISOString(),
    });
  }

  // Durable path placeholder: in the hosted product this is where the server
  // reads rally_deals, runs the same proposal logic as src/lib/nightshift.js,
  // and inserts staged (never applied) rows into rally_nightshift_proposals.
  // Left as an explicit, safe no-op until the live schema is provisioned so
  // this endpoint can be scheduled today without any risk of an autonomous
  // mutation.
  return res.status(200).json({
    ok: true,
    ran: false,
    staged: 0,
    reason: 'Supabase configured. Durable Night Shift staging is not provisioned yet; returning a safe no-op (no autonomous writes performed).',
    at: new Date().toISOString(),
  });
});
