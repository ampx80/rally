// /api/connect/tango  (GET or POST)  -- the Tango connector's server bridge.
//
// ENV-GATED + GRACEFUL by contract: this route NEVER throws and NEVER blocks a
// connect. When TANGO_API_KEY is not set it returns 200 with configured:false,
// which the client connector (src/lib/integrations/connectors/tango.js) reads
// as "run in deterministic demo mode". When it IS set, `action=meetings` does a
// bounded, best-effort pull of confirmed bookings from the Tango workspace and
// normalizes them to the shape the connector maps onto Rally activities; any
// failure degrades to live:false (still 200) so the client falls back cleanly.
//
// Actions (via ?action=):
//   verify   -> validate configuration (default for POST)
//   meetings -> pull confirmed bookings (live), or {live:false} + reason
//   status   -> configuration snapshot (default for GET)
//
// Env:
//   TANGO_API_KEY        server-held Tango API key (secret; gates everything)
//   TANGO_WORKSPACE_URL  optional workspace origin (defaults to the live app)
//
// No em-dash / en-dash anywhere. Secrets are read from env only, never echoed.
import { withErrorHandling, readJsonBody } from '../_utils.js';

const DEFAULT_ORIGIN = 'https://tango-theta.vercel.app';

function tangoConfig() {
  const apiKey = process.env.TANGO_API_KEY || '';
  const base = process.env.TANGO_WORKSPACE_URL || DEFAULT_ORIGIN;
  let origin = DEFAULT_ORIGIN;
  try { origin = new URL(base).origin; } catch { /* keep default */ }
  return { apiKey, origin, configured: Boolean(apiKey) };
}

// Wrap a promise so a slow Tango can never hang the function.
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Normalize Tango's booking rows to the connector's external-meeting shape.
function normalizeBookings(data) {
  const rows = Array.isArray(data) ? data
    : Array.isArray(data?.bookings) ? data.bookings
    : Array.isArray(data?.meetings) ? data.meetings
    : [];
  return rows.map((b) => {
    const guest = b.guest || {};
    const startsAt = typeof b.startsAt === 'number' ? b.startsAt
      : b.startsAt ? new Date(b.startsAt).getTime()
      : b.start ? new Date(b.start).getTime() : null;
    return {
      id: b.id || b.bookingId || null,
      eventTypeId: b.eventTypeId || null,
      title: b.title || b.eventTypeName || 'Meeting',
      duration: b.duration || null,
      startsAt,
      endsAt: b.endsAt ? new Date(b.endsAt).getTime() : null,
      status: b.status || 'confirmed',
      guestEmail: b.guestEmail || guest.email || null,
      guestName: b.guestName || guest.name || null,
      hostName: b.hostName || b.host || null,
      location: typeof b.location === 'string' ? b.location : (b.location?.type || null),
    };
  }).filter((m) => m.startsAt != null);
}

export default withErrorHandling(async (req, res) => {
  const action = (req.query?.action) || (req.method === 'POST' ? 'verify' : 'status');
  const cfg = tangoConfig();
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Not configured is a first-class graceful state, not an error.
  if (!cfg.configured) {
    return res.status(200).json({
      ok: true,
      action,
      configured: false,
      live: false,
      origin: cfg.origin,
      reason: 'TANGO_API_KEY not set. Rally uses deterministic demo meetings.',
    });
  }

  if (action === 'meetings') {
    const probe = (async () => {
      const r = await fetch(`${cfg.origin}/api/bookings?status=confirmed`, {
        headers: { authorization: `Bearer ${cfg.apiKey}`, accept: 'application/json' },
      });
      if (!r.ok) return { ok: true, action, configured: true, live: false, origin: cfg.origin, reason: `Tango responded ${r.status}` };
      const data = await r.json();
      const meetings = normalizeBookings(data);
      return { ok: true, action, configured: true, live: true, origin: cfg.origin, count: meetings.length, meetings };
    })();
    const result = await withTimeout(
      probe.catch((e) => ({ ok: true, action, configured: true, live: false, origin: cfg.origin, reason: (e?.message || 'fetch failed').slice(0, 140) })),
      4000,
      { ok: true, action, configured: true, live: false, origin: cfg.origin, reason: 'Tango timed out' }
    );
    return res.status(200).json(result);
  }

  // verify / status: prove configuration without leaking the key.
  if (req.method === 'POST') readJsonBody(req); // tolerate a JSON body on verify
  return res.status(200).json({
    ok: true,
    action,
    configured: true,
    live: true,
    origin: cfg.origin,
  });
});
