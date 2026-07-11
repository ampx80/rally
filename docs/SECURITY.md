# Rally Security Hardening

SOC2-minded hardening for the Rally SPA (Vite) plus `api/*` serverless
functions on Vercel. This is the checklist enterprise buyers will ask about.
ASCII only, no em-dash / en-dash anywhere in this repo.

Status legend: [ ] not done, [x] shipped, [~] partial.

Deliverables that ship WITH this doc (already in the repo):

- `src/lib/api-guard.js` - composable serverless guards: `requireMethod`,
  `cors`, `rateLimit`, `validateBody`, `compose`, `clientIp`.
- `src/lib/sanitize.js` - isomorphic input sanitizers / validators.
- `api/csp-report.js` - CSP violation report sink (returns 204).

Everything below that touches `vercel.json` or existing `api/*` files is a
RECOMMENDATION with copy-paste-ready snippets. Applying them is a separate,
reviewed change.

---

## 1. Security headers (add to vercel.json)

Rally serves two surfaces from one domain: the Vite SPA (`index.html` +
hashed `/assets/*`) and prerendered static SEO pages under `/pages/*` that
carry inline `<script type="application/ld+json">` blocks. JSON-LD is a data
block, NOT executable script, so a strict `script-src` does not need
`unsafe-inline` for it to work.

Two things DO shape the policy:

1. The app uses React inline `style` props heavily and loads the Google Fonts
   stylesheet from `fonts.googleapis.com`. Both require `style-src` to allow
   `unsafe-inline` and the Google Fonts origins. (Inline style attributes
   cannot carry a nonce, so `unsafe-inline` on styles is unavoidable for a
   React-inline-style app. This is low risk: `style-src unsafe-inline` does
   not enable script execution.)
2. `script-src 'self'` is the goal. See the Vite modulepreload caveat in the
   notes below before shipping, or the first deploy may break.

Add this `headers` array to `vercel.json` (it currently has none). Keep the
existing `buildCommand`, `outputDirectory`, `framework`, and `rewrites` keys
exactly as they are; only ADD the `headers` key:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests; report-uri /api/csp-report"
        },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "X-Permitted-Cross-Domain-Policies", "value": "none" }
      ]
    }
  ]
}
```

Why each directive:

- `default-src 'self'` - deny by default; every other directive is a narrow
  allowance on top.
- `script-src 'self'` - only first-party hashed bundles run. No inline JS, no
  `unsafe-eval` (Vite production output does not use `eval`). JSON-LD data
  blocks are unaffected.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` - React
  inline styles + the Google Fonts stylesheet.
- `font-src 'self' https://fonts.gstatic.com data:` - Google Fonts files and
  any inlined data-URI fonts.
- `img-src 'self' data: https:` - app icons/data-URI images plus any https
  image (OG avatars, logos). Tighten to specific hosts if you enumerate them.
- `connect-src 'self' https://*.supabase.co wss://*.supabase.co` - same-origin
  `/api/*` (waitlist, unlock, outbound proxy, rook, telemetry) plus the
  optional direct browser Supabase client (`src/lib/supabase-browser.js`,
  anon key only). Drop the Supabase entries if the browser never talks to
  Supabase directly.
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` - no clickjacking; Rally
  is never embedded. (X-Frame-Options is the legacy belt to CSP's suspenders.)
- `form-action 'self'`, `base-uri 'self'`, `object-src 'none'` - block form
  exfiltration to third parties, `<base>` hijacking, and plugin content.
- `upgrade-insecure-requests` - defense in depth against mixed content.
- `report-uri /api/csp-report` - violations POST to the sink in this repo.
  When you adopt the Reporting API, also add a `Report-To` / `Reporting-Endpoints`
  header and `report-to csp` to the CSP.
- `Strict-Transport-Security` 2 years + preload - HTTPS only. Vercel already
  serves HTTPS; this makes it non-negotiable for browsers. Only add `preload`
  once you are ready to submit to hstspreload.org (it is hard to undo).
- `Permissions-Policy` - turn off device APIs the app never uses;
  `interest-cohort=()` opts out of FLoC-style profiling.
- `Cross-Origin-Opener-Policy: same-origin` - isolates the browsing context.

### Rollout: report-only first

Ship the CSP as report-only for a few days to catch anything the policy would
break, THEN switch to enforcing. Use the SAME value with the report-only key:

```json
{ "key": "Content-Security-Policy-Report-Only", "value": "<same value as above>" }
```

Watch `[csp-violation]` lines in Vercel function logs (from `api/csp-report.js`).
When clean, rename the header key to `Content-Security-Policy`.

### VITE MODULEPRELOAD CAVEAT (read before enforcing script-src 'self')

Vite injects a small INLINE module-preload polyfill script into `index.html`
by default. Under `script-src 'self'` (no `unsafe-inline`), the browser will
BLOCK that inline script and the SPA can fail to boot. Pick one fix before you
flip the CSP to enforcing:

- Preferred: disable the polyfill in `vite.config.js` (esnext targets do not
  need it):
  ```js
  build: { outDir: 'dist', sourcemap: false, modulePreload: { polyfill: false } }
  ```
  With the polyfill off there is no inline script and `script-src 'self'`
  holds. (This edit is outside the guard/sanitize deliverables; make it as a
  separate reviewed change.)
- Alternative: keep the polyfill and add its `sha256-...` hash to
  `script-src`. The hash is stable per Vite version and appears in the CSP
  console error the first time it is blocked; copy it in. It changes on Vite
  upgrades, so the polyfill-off route is lower maintenance.

Verify after deploy: load the app, open devtools console, confirm zero CSP
errors, and confirm a prerendered `/pages/*` page still renders its JSON-LD
without a violation. Run the site through securityheaders.com for an A/A+.

---

## 2. Which api routes need guards (and the snippet)

The guards live in `src/lib/api-guard.js`. From any route, import them
alongside the existing `_utils.js` helpers and wrap the handler. `compose`
runs guards in order and short-circuits on the first failure; keep
`withErrorHandling` on the outside for uniform error shaping.

Canonical pattern:

```js
import { withErrorHandling } from './_utils.js';
import { compose, requireMethod, rateLimit, validateBody } from '../src/lib/api-guard.js';

export default withErrorHandling(compose(
  requireMethod('POST'),
  rateLimit({ max: 10, windowMs: 60_000 }),
  validateBody({
    email: { type: 'email', required: true },
    name:  { type: 'string', max: 120 },
  }),
)(async (req, res) => {
  const { email, name } = req.valid; // validated + sanitized
  // ... existing handler body, now trusting req.valid ...
}));
```

Per-route recommendations (all are public, unauthenticated, and either send
email, spend money, hit third parties, or run AI, so all get a rate limit):

| Route | requireMethod | rateLimit (per IP) | validateBody schema |
|---|---|---|---|
| `api/unlock.js` | POST | `{ max: 5, windowMs: 60_000 }` (brute-force brake on the access code) | `{ code: { type: 'string', required: true, max: 200 } }` |
| `api/waitlist.js` | POST | `{ max: 5, windowMs: 60_000 }` | `{ email:{type:'email',required:true}, name:{type:'string',max:120}, phone:{type:'string',max:40}, company:{type:'string',max:160}, companySize:{type:'string',max:40}, industry:{type:'string',max:80}, sourceUrl:{type:'string',max:300} }` |
| `api/outbound.js` | POST | `{ max: 20, windowMs: 60_000 }` | `{ kind:{type:'string',max:20}, url:{type:'url',required:true}, message:{type:'string',max:2000} }` (keep the existing SSRF `safeUrl` check too) |
| `api/rook.js`, `api/rook-plan.js` | POST | `{ max: 15, windowMs: 60_000 }` (AI cost brake) | validate the prompt/message field with a generous `max` (e.g. 8000) |
| `api/telemetry.js` | POST | `{ max: 60, windowMs: 60_000 }` | clamp event name + props lengths |
| `api/billing-checkout.js`, `api/billing-portal.js` | POST | `{ max: 10, windowMs: 60_000 }` | validate the plan / price id against an allow-list via `values: [...]` |
| `api/oauth-start.js` | GET | `{ max: 20, windowMs: 60_000 }` | n/a (validate any `state`/`provider` query if present) |
| `api/csp-report.js` | POST | optional `{ max: 120, windowMs: 60_000 }` | n/a (already tolerant; browser-generated) |
| `api/export-deck-pptx.js` | POST | `{ max: 10, windowMs: 60_000 }` | clamp any title/text inputs |

Leave `api/billing-webhook.js` and `api/oauth-callback.js` WITHOUT
`validateBody`/`rateLimit` as written: the Stripe webhook must verify the
signature over the RAW body (a body validator that reparses can break the
signature check), and the OAuth callback is provider-driven. Add
`requireMethod` to both, and for the webhook keep signature verification as
the real gate.

IMPORTANT: `rateLimit` here is in-memory and PER warm serverless instance, so
under Vercel's autoscaling it is a best-effort abuse brake, not a global
quota. For hard, cross-instance limits (especially on `unlock` and paid AI
routes) back it with Upstash Redis or Vercel KV keyed by IP. The in-memory
version is still worth shipping: it stops trivial single-source floods for
free with zero infra.

---

## 3. Secrets handling (audit the client bundle)

Rule: anything prefixed `VITE_` is INLINED into the public JS bundle at build
time and is world-readable. Never put a secret behind a `VITE_` name.

Current state (good): a scan of `src/` finds no `VITE_` secret usage. The only
public env the browser can consume is the Supabase pair
(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) via
`src/lib/supabase-browser.js`. The anon key is designed to be public and MUST
be paired with Supabase Row Level Security. All real secrets stay server-side
and are read only inside `api/*` via `process.env`:

`ACCESS_CODE` / `RALLY_ACCESS_CODE`, `RALLY_API_KEY(S)`, `RESEND_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`.

Standing audit steps:

- [ ] CI check: fail the build if a secret-looking value appears in `dist/`.
      Grep the built assets for known secret prefixes and for any
      `VITE_*SECRET*` / `VITE_*KEY*` name that is not the Supabase anon key:
      ```sh
      grep -rIEl "sk_live_|sk_test_|SUPABASE_SERVICE_ROLE|whsec_|re_[A-Za-z0-9]" dist/ && exit 1 || true
      ```
- [ ] Confirm the `SUPABASE_SERVICE_ROLE_KEY` (full-access) is NEVER referenced
      in `src/`; only `api/*` may use it.
- [ ] Enforce Supabase RLS on every table the anon key can reach.
- [ ] Rotate `ACCESS_CODE`, Stripe, Resend, and Anthropic keys on any
      suspected exposure; store them only in Vercel Project env vars (not in
      the repo, not in `.env` committed files).
- [ ] Keep `.env*` in `.gitignore`; verify none are tracked.

---

## 4. Access gate limitations + path to real auth

The coming-soon gate (`src/gate/ComingSoon.jsx` + `api/unlock.js`) is a SOFT
gate, and the code says so. Its real, documented limits:

- It is a single SHARED passcode, not per-user identity. Anyone with the code
  is in; there is no revocation short of rotating `ACCESS_CODE`.
- On success the client stores `localStorage['rally_access'] = 'granted'`. That
  flag is trivially forgeable in devtools, so it only decides whether the
  browser shows the product SHELL. It grants NO server authority: every
  `api/*` route must enforce its own access independently and must never trust
  that localStorage flag.
- `api/unlock.js` already does the right things for a shared code: constant-ish
  time compare, a fixed 350ms delay to blunt brute force, and 503 when unset.
  Add the `rateLimit({ max: 5, windowMs: 60_000 })` guard (section 2) so the
  code cannot be sprayed quickly.

Path to real auth (enterprise requirement):

1. Turn on the Supabase browser auth foundation that already exists
   (`src/lib/supabase-browser.js`): email magic-link or SSO/SAML for
   enterprise. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
2. Enforce Row Level Security so a user only reads/writes their org's rows.
3. Have `api/*` routes verify the Supabase JWT (Authorization: Bearer) server
   side and derive identity/org from the verified token, not from any client
   flag. Add a `requireAuth` guard alongside the others once this lands.
4. For enterprise deals: SSO/SAML, SCIM provisioning, per-org RBAC (there is
   already `src/lib/rbac.js`), and an audit log (`src/lib/audit.js`) wired to
   durable storage.
5. Retire the shared access code once real accounts exist, or scope it to a
   demo tenant only.

---

## 5. Dependency + supply-chain notes

- [ ] `npm audit --production` in CI; fail on high/critical. Triage dev-only
      advisories separately.
- [ ] Pin dependencies and commit the lockfile; enable Dependabot or Renovate
      for reviewed bumps.
- [ ] Enable GitHub secret scanning + push protection on `ampx80/rally`.
- [ ] Keep the dependency surface tiny. The guard/sanitize libs and
      `api/csp-report.js` add ZERO new dependencies on purpose (pure Node /
      isomorphic). Prefer that bar for new server utilities.
- [ ] Review the small set of runtime deps (`@supabase/supabase-js`, `stripe`,
      `react`, Vite plugins) on each upgrade; watch for install scripts.
- [ ] Subresource concerns: the only third-party runtime origin is Google
      Fonts (CSS + font files), already scoped in the CSP. Adding any new CDN
      script would require a CSP `script-src` change and a deliberate review;
      default to bundling locally instead.
- [ ] Set `Cache-Control: no-store` on authenticated `api/*` JSON responses so
      sensitive data is not cached by intermediaries (add per-route when real
      auth lands).

---

## Quick verification checklist

- [ ] `node --check` passes on `src/lib/api-guard.js`, `src/lib/sanitize.js`,
      `api/csp-report.js` (all ASCII, zero deps).
- [ ] CSP shipped report-only, logs clean, then switched to enforcing.
- [ ] Vite modulepreload polyfill disabled (or its hash added) before enforce.
- [ ] `unlock` + `waitlist` + `outbound` + AI + billing routes wrapped with
      `requireMethod` + `rateLimit` + `validateBody`.
- [ ] No secret in `dist/`; `SUPABASE_SERVICE_ROLE_KEY` never in `src/`.
- [ ] securityheaders.com grade A or better.
