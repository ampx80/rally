# Rally Authorization (server-enforced auth + RBAC)

Before this, Rally's RBAC lived only in the client (`src/lib/rbac.js`). That
governs what the UI *shows*, but any caller could hit the API directly and
bypass it. This document describes the server-side layer that makes the API
itself enforce identity, org scope, and role, so the client RBAC is a
convenience rather than the only line of defense.

Everything here is **additive and env-gated**: with no Supabase/API keys
configured the deployment stays in demo mode and behaves exactly as it did
before. No lockout, no new failure modes.

## Files

| File | Role |
|---|---|
| `api/_lib-authz.js` | Server authorization library: identity resolution + `authenticate` / `requireRole` / `requireOrg` / `can` / `resolveCapabilities` / `gateWrite`. |
| `api/me.js` | `GET /api/me` returns the caller's resolved identity + org + role + capability list (server truth for the UI). |
| `api/v1/deals.js`, `contacts.js`, `companies.js` | Public REST write paths now call `gateWrite(req, 'rep')` on POST. |
| `src/lib/rbac.js` | Client RBAC (unchanged). Source of the role ranks + capability matrix that the server mirrors. |
| `api/_lib-v1.js` | Existing API-key auth, reused by the authz library for machine principals. |
| `api/auth-session.js` | Existing Supabase JWT validator (pattern the authz JWT path follows). |

## Identity model

`authenticate(req)` resolves one identity from the `Authorization: Bearer`
header (or `X-Api-Key`). Two token shapes are accepted:

1. **Supabase JWT** (anything not shaped like an API key). Validated with
   `supabase.auth.getUser(token)` using the server-only service role key. The
   user's `{ orgId, role }` come from a `rally_memberships` lookup (active
   memberships, most-recently-joined, or the one matching an `X-Rally-Org` /
   `?org_id=` hint). `source: 'supabase'`.
2. **Rally API key** (`rk_live_...` / `rk_test_...`). Validated by reusing
   `api/_lib-v1.js` `authenticate`, so both entry points agree on which keys
   are valid. A key is a trusted server-issued secret, so it is granted the
   role in `RALLY_API_KEY_ROLE` (default `admin`) and is org-agnostic
   (`orgId: null`). `source: 'api-key'`.

### Return shapes

```
// success
{ ok: true,  configured: true,  userId, orgId, role, email, source }
// demo mode (Supabase not configured, JWT path)
{ ok: false, configured: false, error: 'auth-not-configured' }
// auth failure (configured but bad/missing/expired credential)
{ ok: false, configured: true,  status, code, error }
```

`authenticate` never throws. The `auth-not-configured` marker is how callers
detect demo mode and keep working without a backend.

## Primitives

- `requireRole(identity, minRole)` - `true` when `rank(identity.role) >= rank(minRole)`.
  Ranks: `admin 4 > manager 3 > rep 2 > viewer 1`.
- `requireOrg(identity, orgId, { allowUnscoped })` - `true` when the identity is
  scoped to that org. API-key principals (no org) pass only when
  `allowUnscoped: true`.
- `can(identity, capabilityId, overrides?)` - mirror of `rbac.js` `can()`. Uses
  the default grant matrix, optionally overlaid with a per-org overrides map.
- `resolveCapabilities(identity)` - the identity's full granted-capability list,
  defaults merged with per-org `rally_role_grants` rows when a backend + org are
  available. Backs `GET /api/me`.
- `gateWrite(req, minRole = 'rep')` - the route guard. Returns
  `{ blocked: false }` in demo mode or on a sufficient role, and
  `{ blocked: true, status, code, error }` otherwise.

## How client RBAC and server RBAC stay in sync

`src/lib/rbac.js` and `api/_lib-authz.js` share **three** definitions that MUST
be kept identical:

| Concept | `src/lib/rbac.js` | `api/_lib-authz.js` |
|---|---|---|
| Role ranks | `ROLES` (`rank` field) | `ROLE_RANK` |
| Capability ids | `CAPABILITIES` (`id` field) | `CAPABILITY_IDS` |
| Default grants | `DEFAULTS` | `DEFAULT_GRANTS` |

The server copies (does not import) these because `rbac.js` is a browser module
(`localStorage`, React hooks) that must not be pulled into a serverless
function. When you change a role, capability, or default grant in `rbac.js`,
make the identical edit in `_lib-authz.js`. Per-org overrides that an admin sets
in the matrix UI persist to `rally_role_grants`; `resolveCapabilities` reads
that table so the server honors the same edits the UI shows.

The client should call `GET /api/me` and treat its `capabilities` array as the
authority for what to enable, rather than trusting the local `rbac_v1`
localStorage state alone. Local state remains a fast default and the "view as"
switcher; server truth wins on any real write.

## Enforcement matrix

Behavior depends only on whether auth is configured
(`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, or API keys for the key path).

| Route / method | Demo (unconfigured) | Configured |
|---|---|---|
| `GET /api/v1/*` (deals/contacts/companies) | Open (API-key or demo key) | Open to any valid API key (read stays open by design) |
| `POST /api/v1/deals` | Allowed (echoed, not persisted) | Requires role `rep`+ (JWT membership) or a valid API key (`RALLY_API_KEY_ROLE`) |
| `POST /api/v1/contacts` | Allowed | Requires `rep`+ |
| `POST /api/v1/companies` | Allowed | Requires `rep`+ |
| `GET /api/me` | Returns demo admin identity (`configured:false`) | Returns real identity + role + capabilities, or 401 |

Blocked writes return the standard v1 error envelope:
`{ error: { code, message }, request_id }` with `403 insufficient_role` (role
too low) or `401` (missing/invalid credential).

### Row-level backstop

`gateWrite` is a coarse role gate at the API edge. The fine-grained,
per-record, per-org rules still live in `supabase/rls.sql` (org membership,
owner-based edit, manager+ delete) and apply to every write that reaches the
database. The two layers are complementary: `gateWrite` rejects unauthorized
writes early with a clear role error; RLS is the authoritative last word once a
row is actually touched.

## Environment variables

| Var | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side JWT validation + membership/role lookups. Absent => demo mode. |
| `RALLY_API_KEYS` / `RALLY_API_KEY` | Env-seeded API key allow-list (via `_lib-v1.js`). |
| `RALLY_API_KEY_ROLE` | Role assigned to API-key principals. Default `admin`. Set to `rep` to scope machine writes to non-admin actions. |

## Wiring notes for the rest of the app

These are additive suggestions; the wave did not touch `App.jsx`, `store.js`,
`index.css`, `package.json`, `vercel.json`, or `src/lib/rbac.js`.

- **Client:** on load (and after sign-in) call `GET /api/me`; if
  `configured === true`, hydrate `rbac.js` active role + capabilities from the
  response so the UI reflects server truth. In demo mode (`configured:false`)
  keep the existing local default.
- **Authenticated fetches:** send the Supabase access token as
  `Authorization: Bearer <jwt>` on API calls that should be attributed to the
  signed-in user. Multi-workspace users can pass `X-Rally-Org: <org_id>`.
- **Future write routes:** import `gateWrite` from `../_lib-authz.js` and call
  it on the mutating branch, exactly as the v1 resource routes do.
