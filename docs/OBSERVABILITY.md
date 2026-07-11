# Rally Observability

Production-grade error handling and observability for Rally. Everything here is
safe by default: with no environment configured, nothing hits the network, no
storage is touched, and no error is ever surfaced to a user. Turn features on
with a single flag when you are ready.

No em-dash or en-dash anywhere (platform rule). ASCII only.

## What is captured

| Surface | Source | What it records |
| --- | --- | --- |
| Render crashes | `src/components/ErrorBoundary.jsx` | React errors caught by the boundary, with component stack, routed through the logger |
| Structured logs | `src/lib/logger.js` | `debug` / `info` / `warn` / `error` lines with bound context; `warn` and `error` are eligible for the network sink |
| Product analytics | `src/lib/analytics.js` | `track(event, props)` events and `page(path)` views, PII-scrubbed |
| Backend errors | `api/_utils.js` `withErrorHandling` | Server route exceptions (already in place, unchanged) |
| Live status | `api/status.js` | Build info, warm-instance uptime, dependency checks |

### Privacy posture

- **Do-Not-Track is honored.** If the browser sets DNT, the logger network sink
  and analytics send nothing. Local console logging and the in-memory ring
  buffer still work for the developer.
- **No PII.** Analytics drops any prop key that looks like `email`, `name`,
  `phone`, `token`, `password`, `auth`, `card`, `ip`, etc., keeps only
  primitives, and caps string length. Page views send the path only, never
  query strings (which can carry ids or tokens).
- **Anonymous session id.** A per-tab `sessionStorage` id (`rally.sid`) groups
  records from one session. It is not a durable cross-site identifier.
- **Ring buffer.** The logger keeps the last 200 records in memory only. Call
  `logger.snapshot()` to dump them into a bug report. Nothing persists unless
  the sink is configured.

## Environment variables

All optional. Unset means the safe no-op path.

| Var | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_TELEMETRY` | client (build time) | off | Master switch for the browser sink. Set to `1` / `true` / `on` to enable POSTing logs + analytics to the telemetry endpoint. |
| `VITE_TELEMETRY_URL` | client (build time) | `/api/telemetry` | Override the sink URL (e.g. a separate collector). |
| `VITE_LOG_LEVEL` | client (build time) | `debug` in dev, `info` in prod | Minimum level recorded. One of `debug` / `info` / `warn` / `error` / `silent`. |
| `SUPABASE_URL` | server | unset | Enables durable storage of telemetry + the Supabase status check. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | unset | Paired with `SUPABASE_URL`. |

`VITE_*` vars are inlined at build time by Vite, so a change requires a rebuild
or redeploy. Server vars are read at request time.

The status endpoint additionally reads Vercel-provided build vars automatically
(`VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`,
`VERCEL_GIT_COMMIT_MESSAGE`, `VERCEL_URL`) - no setup needed.

## The telemetry table

Create `rally_telemetry` in Supabase to durably store what the browser sends.
Until it exists (or until `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are set),
`/api/telemetry` returns `200` and stores nothing.

```sql
create table if not exists rally_telemetry (
  id          bigint generated always as identity primary key,
  kind        text not null,               -- 'log' | 'event' | 'pageview'
  level       text,                        -- 'debug'|'info'|'warn'|'error' (logs only)
  name        text,                        -- log message or event/page name
  props       jsonb,                       -- bound context or scrubbed event props
  path        text,                        -- app path where it happened
  session_id  text,                        -- anonymous per-tab id
  ts          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Query helpers
create index if not exists rally_telemetry_kind_ts_idx on rally_telemetry (kind, ts desc);
create index if not exists rally_telemetry_level_ts_idx on rally_telemetry (level, ts desc);
create index if not exists rally_telemetry_session_idx on rally_telemetry (session_id);
```

The service role key writes server-side only. Do not expose it to the client
and do not add a permissive anon insert policy - the browser never writes to
this table directly, it always goes through `/api/telemetry`.

Optional retention (keep 90 days), run as a scheduled job if desired:

```sql
delete from rally_telemetry where ts < now() - interval '90 days';
```

## Wiring the ErrorBoundary into the app

`src/App.jsx` and `src/main.jsx` were intentionally not edited. To activate the
app-level boundary, wrap the app tree. Two equivalent options:

### Option A - wrap in `src/main.jsx` (recommended, catches the whole App)

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
```

### Option B - wrap the returned tree inside `src/App.jsx`

Add the import at the top:

```jsx
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary.jsx';
```

Then wrap the top-level return of `App()`:

```jsx
return (
  <ErrorBoundary>
    <div>
      <LaunchScreen />
      {/* ...existing shell... */}
    </div>
  </ErrorBoundary>
);
```

### Per-route isolation (optional, keeps the nav alive on a page crash)

Wrap the `<Routes>` content (or an individual page) with `RouteErrorBoundary`
so one broken screen shows a small inline card instead of blanking the shell:

```jsx
<main className="rl-content">
  <div key={loc.pathname} className="page-in">
    <RouteErrorBoundary key={loc.pathname}>
      <Routes location={loc}>
        {/* ...existing routes... */}
      </Routes>
    </RouteErrorBoundary>
  </div>
</main>
```

Passing `key={loc.pathname}` resets the boundary on navigation so a recovered
route does not stay stuck on the error card.

## Using the logger and analytics

```jsx
import { logger } from './lib/logger.js';
import { track, page, useTrack } from './lib/analytics.js';

// Structured logging with bound context
const log = logger.with({ area: 'deals' });
log.info('deal opened', { dealId });          // context merges
log.error('save failed', { code: err.code }); // eligible for the sink

// Product analytics (no PII)
track('deal_created', { stage: 'won', amountBand: 'gt_10k' });
page('/deals');

// In a component
function DealsPage() {
  const t = useTrack();
  useEffect(() => { t.page('/deals'); }, [t]);
  // ...
}
```

Route-change page views: if you want automatic page views, call `page()` from a
small effect keyed on `location.pathname` in `App.jsx` (not wired by default to
avoid editing App.jsx).

## Endpoints

- `GET /api/health` - existing fast env-wiring probe (unchanged).
- `GET /api/status` - build info, warm-instance uptime, dependency checks.
  `status` is `ok` unless a configured dependency is `down` or `timeout`.
- `GET /api/telemetry` - returns `{ ok, sink, configured }` to confirm wiring.
- `POST /api/telemetry` - batch sink for logs and events. Always `200`.

## Failure model (why this is safe)

- The logger and analytics swallow every network error and never rethrow. A
  down sink means dropped telemetry, never a broken UI.
- `sendBeacon` is used first (survives page unload); `fetch` with `keepalive`
  is the fallback. A flush also fires on `pagehide` / tab-hide.
- `/api/telemetry` accepts and drops when unconfigured, over-throttled, or the
  body is too large - it returns `200` in all cases so the client never enters
  a retry storm.
- `/api/status` bounds its Supabase ping with a 2.5s timeout so a slow
  dependency cannot hang the probe.
```
