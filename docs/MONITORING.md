# Rally Error Monitoring

The "did something break" layer that sits above the structured logger
(`docs/OBSERVABILITY.md`). It captures uncaught errors, unhandled promise
rejections, and anything the app hands it via `captureError(err, ctx)`, then
dedupes, scrubs PII, and ships each error to a sink.

Everything here is **additive and env-gated**. With no environment configured,
capture is a cheap no-op: nothing hits the network, nothing is stored, and no
error is ever surfaced to a user. Turn it on with one env var when ready.

No em-dash or en-dash anywhere (platform rule). ASCII only.

## Files

| File | Role |
| --- | --- |
| `src/lib/monitoring.js` | The monitor: `captureError(err, ctx)` / `captureMessage(msg, ctx)`, dedupe, PII scrub, dual-mode sink. |
| `src/lib/monitoring-init.js` | `initMonitoring()` - idempotent installer that attaches the global handlers and stamps release/env. Call once at boot. |
| `api/monitor-report.js` | Server sink alternative: forwards to Sentry server-side, else inserts into `rally_errors`, else 200 no-op. |

## How it decides where errors go

The client picks a mode once, at module load:

1. **`sentry`** - `VITE_SENTRY_DSN` is set and parses. Each error is POSTed to
   that project's Sentry envelope endpoint (`.../api/<projectId>/envelope/`) in
   the minimal event format Sentry accepts (exception values + parsed stack
   frames + release/environment tags).
2. **`telemetry`** - no DSN, but `VITE_TELEMETRY` is on. The error is formatted
   as a `logs` batch (level `error`) and sent to the existing `/api/telemetry`
   sink, so it lands in `rally_telemetry` right alongside the logger output.
   Override the URL with `VITE_MONITOR_URL` (defaults to `/api/telemetry`).
3. **`none`** - neither is configured. Pure no-op (dev console echo only).

Do-Not-Track is honored for the network sink in both active modes.

## Environment variables

All optional. Unset means the safe no-op path.

| Var | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_SENTRY_DSN` | client (build time) | unset | Sentry project DSN. When set, the browser ships errors straight to Sentry. Format `https://<publicKey>@<host>/<projectId>`. |
| `VITE_TELEMETRY` | client (build time) | off | Fallback switch. With no DSN, turning this on routes errors to `/api/telemetry` (same flag the logger + analytics use). |
| `VITE_MONITOR_URL` | client (build time) | `/api/telemetry` | Override the fallback sink URL (e.g. point it at `/api/monitor-report`). |
| `VITE_RELEASE` | client (build time) | unset | Release tag stamped on each error (e.g. a git sha). |
| `VITE_ENV` | client (build time) | `production` (`development` in dev) | Environment tag. |
| `SENTRY_DSN` | server | unset | Server-side DSN for `/api/monitor-report`. When set, the route forwards reports to Sentry server-side. |
| `SUPABASE_URL` | server | unset | With the service key, enables durable storage of reports in `rally_errors`. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | unset | Paired with `SUPABASE_URL`. |

`VITE_*` vars are inlined at build time by Vite - a change requires a rebuild or
redeploy. Server vars are read at request time.

### Two ways to run

- **Client -> Sentry directly (simplest).** Set `VITE_SENTRY_DSN`. Errors go
  straight from the browser to Sentry. No server route or DB needed.
- **Client -> your server -> Sentry/DB (keeps the DSN off the client).** Leave
  `VITE_SENTRY_DSN` unset, set `VITE_TELEMETRY=1` and
  `VITE_MONITOR_URL=/api/monitor-report`, then set `SENTRY_DSN` (server) OR the
  Supabase vars. The browser only ever talks to your own origin; the route
  forwards to Sentry or writes `rally_errors`.

## The `rally_errors` table

Create this in Supabase to durably store what `/api/monitor-report` receives
when no `SENTRY_DSN` is set. Until it exists (or until the Supabase vars are
set), the route returns `200` and stores nothing.

```sql
create table if not exists rally_errors (
  id          bigint generated always as identity primary key,
  kind        text not null default 'error',   -- 'error'|'uncaught'|'unhandledrejection'|'message'
  name        text,                             -- error name/type
  message     text,                             -- scrubbed error message
  stack       text,                             -- scrubbed stack (bounded)
  ctx         jsonb,                            -- scrubbed context
  path        text,                             -- app path where it happened
  release     text,                             -- release tag (git sha etc.)
  environment text,                             -- 'production' | 'preview' | ...
  session_id  text,                             -- anonymous per-tab id
  ts          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists rally_errors_ts_idx on rally_errors (ts desc);
create index if not exists rally_errors_kind_ts_idx on rally_errors (kind, ts desc);
create index if not exists rally_errors_session_idx on rally_errors (session_id);
create index if not exists rally_errors_env_ts_idx on rally_errors (environment, ts desc);
```

The service role key writes server-side only. Do not expose it to the client and
do not add a permissive anon insert policy - the browser never writes here
directly, it always goes through `/api/monitor-report`.

Optional retention (keep 90 days), run as a scheduled job if desired:

```sql
delete from rally_errors where ts < now() - interval '90 days';
```

## Privacy posture

Identical to the analytics/telemetry layer:

- **Do-Not-Track honored.** If the browser sets DNT, the network sink sends
  nothing (dev console echo still works).
- **No PII.** Context objects are scrubbed: any key that looks like `email`,
  `name`, `phone`, `token`, `password`, `auth`, `card`, `ip`, etc. is dropped,
  only primitives survive, strings are capped. Error messages and stacks are
  additionally text-scrubbed for emails and long digit runs (`[email]`,
  `[number]`). The server route re-scrubs defensively.
- **Anonymous session id.** Reuses the per-tab `rally.sid` from
  `sessionStorage`, shared with the logger and analytics. Not a durable
  cross-site identifier.
- **Deduped + bounded.** Identical errors within a 15s window are dropped; the
  dedupe map is capped. The server caps rows per request and body size.

## Wiring (report only - no shared files were edited)

`src/main.jsx`, `src/App.jsx`, and `src/components/ErrorBoundary.jsx` were
intentionally not edited. Two small wire-ups activate the monitor:

### 1. Install the global handlers once at boot

Add to the top of `src/main.jsx` (before `createRoot(...)`):

```jsx
import { initMonitoring } from './lib/monitoring-init.js';

initMonitoring(); // idempotent, no-op when nothing is configured
```

That attaches `window.onerror` and `unhandledrejection` handlers, which is all
that is needed to catch the bulk of runtime errors.

### 2. (Optional) Report React render crashes from the ErrorBoundary

`ErrorBoundary.jsx` already logs crashes through the structured logger. To also
send them to the monitor, add one call in its `componentDidCatch`:

```jsx
import { captureError } from '../lib/monitoring.js';

// inside componentDidCatch(error, info):
try {
  captureError(error, {
    scope: this.props.scope || 'app',
    componentStack: info?.componentStack ? String(info.componentStack).slice(0, 1200) : undefined,
  }, 'react-render');
} catch { /* monitoring never rethrows */ }
```

### 3. Capture handled errors anywhere

```jsx
import { captureError, captureMessage } from './lib/monitoring.js';

try {
  await saveDeal(deal);
} catch (err) {
  captureError(err, { area: 'deals', dealStage: deal.stage }); // no PII
  showToast('Could not save. We are on it.');
}

captureMessage('checkout took over 10s', { area: 'billing' });
```

## How it composes with the rest of observability

| Layer | File | Captures |
| --- | --- | --- |
| Structured logs | `src/lib/logger.js` | `debug`/`info`/`warn`/`error` lines; warn+error eligible for `/api/telemetry`. |
| Product analytics | `src/lib/analytics.js` | `track()` / `page()`, PII-scrubbed, to `/api/telemetry`. |
| **Error monitoring** | `src/lib/monitoring.js` | **Uncaught errors, rejections, `captureError()`, to Sentry or the telemetry sink.** |
| Telemetry sink | `api/telemetry.js` | Server sink for logs + analytics -> `rally_telemetry`. |
| Error sink | `api/monitor-report.js` | Server sink for errors -> Sentry or `rally_errors`. |
| Live status | `api/status.js` | Build info, uptime, dependency checks. |

The logger and the monitor are complementary: the logger is a rolling record of
what happened (and ships warn/error to telemetry when `VITE_TELEMETRY` is on),
the monitor is a dedicated error channel with stack parsing and a Sentry path.
Both reuse the same `rally.sid` session id, so an error in Sentry / `rally_errors`
can be correlated with the log lines in `rally_telemetry` for the same session.

### Flipping it on

- **Fastest path (browser -> Sentry):** set `VITE_SENTRY_DSN`, redeploy. Done.
- **Keep the DSN server-side:** set `VITE_TELEMETRY=1` +
  `VITE_MONITOR_URL=/api/monitor-report` on the client, and `SENTRY_DSN` (or the
  Supabase vars + the `rally_errors` table) on the server, redeploy.
- **Just want it in your own DB:** set `VITE_TELEMETRY=1` (uses the existing
  `/api/telemetry` sink and `rally_telemetry` table, no extra route needed) OR
  point `VITE_MONITOR_URL` at `/api/monitor-report` and create `rally_errors`.
- Confirm wiring with `GET /api/monitor-report` (returns the active sink) and
  `GET /api/status`.

## Failure model (why this is safe)

- `captureError` / `captureMessage` swallow every error internally and never
  rethrow. A broken or unreachable sink means a dropped report, never a broken
  UI.
- `initMonitoring()` is idempotent (guards on a module flag and a `window`
  marker) and wrapped so a failure during install cannot break boot.
- `sendBeacon` is tried first (survives page unload); `fetch` with `keepalive`
  is the fallback.
- `/api/monitor-report` always returns `200` - unconfigured, oversized, or a
  failed Sentry/DB write all accept-and-drop so the client never retry-storms.
