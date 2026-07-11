# Rally Public REST API (v1)

The Rally developer platform lets your systems read and write revenue data
programmatically. It ships three pieces:

1. A versioned REST API (`/api/v1/*`) for deals, contacts, and companies.
2. Signed outbound **webhooks** so you react the moment data changes.
3. **API key** management in the in-app Developers console (`/developers`).

Base URL: `https://<your-rally-host>` (the console fills in the real origin).
All examples below use the public demo key `rk_live_demo_rally`, which is
accepted only when the deployment has no keys configured.

ASCII only. No em-dash / en-dash.

---

## Authentication

Every request must carry an API key as a Bearer token:

```
Authorization: Bearer rk_live_xxxxxxxxxxxxxxxx
```

`X-Api-Key: rk_live_...` is also accepted.

Keys look like `rk_live_...` (production) or `rk_test_...` (sandbox). Mint and
revoke keys in the Developers console.

### How keys are validated (server)

`api/_lib-v1.js` resolves a key in priority order:

1. **Supabase** `rally_api_keys` table, when `SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` are set. Matches on a `key` or `key_hash`
   (sha256) column and honors a `revoked` / `active` flag.
2. **Env allow-list**: `RALLY_API_KEYS` (comma separated) or `RALLY_API_KEY`.
3. **Demo mode**: if no keys are configured anywhere, the single documented
   demo key `rk_live_demo_rally` is accepted so the docs work out of the box.
   Configuring any real key disables the demo key.

> Keys created in the browser console persist to `localStorage` for the demo.
> They only authenticate against the live API if mirrored into the keys store.

### Auth errors

| Status | code | when |
| --- | --- | --- |
| 401 | `missing_api_key` | no Authorization header |
| 401 | `invalid_api_key` | malformed or unknown key |
| 401 | `revoked_api_key` | key exists but was revoked |

---

## Conventions

### Response envelope

Single resource:

```json
{ "data": { "id": "d_1", "name": "..." }, "request_id": "req_9f2a..." }
```

Collection (paginated):

```json
{
  "data": [ { "id": "d_1" }, { "id": "d_2" } ],
  "meta": { "pagination": {
    "total": 24, "count": 10, "limit": 10, "offset": 0,
    "has_more": true, "next_offset": 10
  } },
  "request_id": "req_9f2a..."
}
```

Error:

```json
{
  "error": { "code": "validation_error", "message": "Field \"name\" is required.", "details": { "field": "name" } },
  "request_id": "req_9f2a..."
}
```

Every response includes a `request_id` for support and tracing.

### Pagination

| Param | Default | Max | Notes |
| --- | --- | --- | --- |
| `limit` | 25 | 100 | page size |
| `offset` | 0 | - | rows to skip |

Follow `meta.pagination.next_offset` until `has_more` is `false`.

### Rate limits

Each key is limited to **120 requests per rolling 60 second window**. Every
response carries the current budget:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1752192000
```

Exceeding the window returns `429` with `code: rate_limited` and a
`Retry-After` header (seconds).

### Errors

| Status | code | meaning |
| --- | --- | --- |
| 400 | `bad_request` | malformed request |
| 401 | `missing_api_key` / `invalid_api_key` / `revoked_api_key` | auth |
| 404 | `not_found` | no resource with that id |
| 405 | `method_not_allowed` | verb not supported on the endpoint |
| 422 | `validation_error` | a field failed validation (`details.field`) |
| 429 | `rate_limited` | rate limit exceeded |
| 500 | (message) | unexpected server error |

### Datastore note

When no datastore is configured, reads return a deterministic demo dataset and
writes are validated and echoed back (with a `meta.note`) but not persisted.
Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to persist writes.

---

## Deals

Deal object:

```json
{
  "id": "d_1",
  "name": "Vertex Robotics - Platform rollout",
  "companyId": "co_1",
  "value": 120000,
  "stage": "negotiation",
  "probability": 85,
  "status": "open",
  "closeDate": "2026-08-01T00:00:00.000Z",
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

Stages: `lead`, `qualified`, `discovery`, `proposal`, `negotiation`, `won`,
`lost`. `status` is `open`, `won`, or `lost`.

### GET /api/v1/deals

List deals.

| Filter | Description |
| --- | --- |
| `stage` | one stage id |
| `status` | `open` / `won` / `lost` |
| `company_id` | deals for one company |
| `min_value` | minimum deal value |
| `q` | substring match on name |
| `limit`, `offset` | pagination |

```bash
curl "https://<host>/api/v1/deals?limit=10&stage=negotiation" \
  -H "Authorization: Bearer rk_live_demo_rally"
```

### GET /api/v1/deals?id=d_1

Fetch one deal (also reachable as `/api/v1/deals/d_1`). Returns `404`
`not_found` if the id is unknown.

```bash
curl "https://<host>/api/v1/deals?id=d_1" \
  -H "Authorization: Bearer rk_live_demo_rally"
```

### POST /api/v1/deals

Create a deal.

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | non-empty |
| `value` | yes | non-negative number |
| `stage` | no | defaults to `lead` |
| `company_id` | no | associate to a company |
| `close_date` | no | ISO date; defaults to +30 days |

```bash
curl -X POST "https://<host>/api/v1/deals" \
  -H "Authorization: Bearer rk_live_demo_rally" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme - Platform rollout","value":120000,"stage":"proposal"}'
```

Returns `201` with the created object.

---

## Contacts

Contact object:

```json
{
  "id": "c_1",
  "firstName": "Jordan",
  "lastName": "Avery",
  "email": "jordan.avery@vertexrobotics.com",
  "phone": "(415) 555-0100",
  "title": "VP of Sales",
  "companyId": "co_1",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

### GET /api/v1/contacts

| Filter | Description |
| --- | --- |
| `company_id` | contacts at one company |
| `q` | match on name or email |
| `limit`, `offset` | pagination |

```bash
curl "https://<host>/api/v1/contacts?company_id=co_1" \
  -H "Authorization: Bearer rk_live_demo_rally"
```

### GET /api/v1/contacts?id=c_1

Fetch one contact (also `/api/v1/contacts/c_1`).

### POST /api/v1/contacts

| Field | Required | Notes |
| --- | --- | --- |
| `first_name` | yes | non-empty |
| `last_name` | no | |
| `email` | no | validated if present |
| `phone`, `title`, `company_id` | no | |

```bash
curl -X POST "https://<host>/api/v1/contacts" \
  -H "Authorization: Bearer rk_live_demo_rally" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jordan","last_name":"Avery","email":"jordan@acme.com"}'
```

---

## Companies

Company object:

```json
{
  "id": "co_1",
  "name": "Vertex Robotics",
  "domain": "vertexrobotics.com",
  "industry": "Manufacturing",
  "size": "1001-5000",
  "location": "Austin, TX",
  "health": "green",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### GET /api/v1/companies

| Filter | Description |
| --- | --- |
| `industry` | exact industry |
| `health` | `green` / `yellow` / `red` |
| `q` | match on name or domain |
| `limit`, `offset` | pagination |

```bash
curl "https://<host>/api/v1/companies?industry=SaaS" \
  -H "Authorization: Bearer rk_live_demo_rally"
```

### GET /api/v1/companies?id=co_1

Fetch one company (also `/api/v1/companies/co_1`).

### POST /api/v1/companies

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | non-empty |
| `domain` | no | derived from name if omitted |
| `industry`, `size`, `location` | no | |
| `health` | no | `green` (default), `yellow`, `red` |

```bash
curl -X POST "https://<host>/api/v1/companies" \
  -H "Authorization: Bearer rk_live_demo_rally" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Robotics","industry":"Manufacturing"}'
```

---

## Webhooks

Rally delivers a signed `POST` to your subscriber URL when an event fires. The
dispatcher (`api/webhooks-dispatch.js`) is SSRF-guarded: https only, and
internal / metadata hosts are rejected.

### Events

```
deal.created      deal.updated       deal.stage_changed
deal.won          deal.lost
contact.created   contact.updated
company.created   company.updated
activity.created  activity.completed
```

### Delivery payload

```json
{
  "id": "evt_1a2b3c...",
  "type": "deal.won",
  "created": 1752192000,
  "api_version": "v1",
  "data": { "id": "d_1", "value": 120000 }
}
```

### Delivery headers

| Header | Value |
| --- | --- |
| `X-Rally-Event` | event type, e.g. `deal.won` |
| `X-Rally-Delivery` | unique delivery id (`evt_...`) |
| `X-Rally-Timestamp` | unix seconds |
| `X-Rally-Signature` | `t=<unix>,v1=<hex hmac>` |

### Signature verification

The signature is `HMAC-SHA256(secret, "<timestamp>.<rawBody>")`, hex encoded
(Stripe-style). Verify against the raw request body before parsing:

```javascript
import crypto from 'node:crypto';

// header: X-Rally-Signature: t=<unix>,v1=<hex>
function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const expected = crypto
    .createHmac('sha256', secret)
    .update(parts.t + '.' + rawBody)
    .digest('hex');
  const ok = crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(parts.v1)
  );
  // also reject if Math.abs(now - parts.t) is too large (replay protection)
  return ok;
}
```

Reject the delivery if the signature does not match, and reject stale
timestamps to defend against replay.

### Triggering a delivery (server helper)

`POST /api/webhooks-dispatch` sends one signed delivery. The signing secret
comes from the request `secret` field or `RALLY_WEBHOOK_SECRET`.

```bash
curl -X POST "https://<host>/api/webhooks-dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.yourapp.com/webhooks/rally",
    "event": "deal.won",
    "secret": "whsec_...",
    "data": { "id": "d_1", "value": 120000 }
  }'
```

---

## Environment variables

| Var | Scope | Purpose |
| --- | --- | --- |
| `RALLY_API_KEY` / `RALLY_API_KEYS` | server | env-seeded API key allow-list |
| `SUPABASE_URL` | server | keys store + write persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | server | keys store + write persistence |
| `RALLY_WEBHOOK_SECRET` | server | default HMAC signing secret for webhooks |

All are optional. With none set, the API runs in demo mode with the demo key
and an in-memory dataset.
