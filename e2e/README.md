# Rally end-to-end tests (Playwright)

End-to-end coverage for the marketing site, the programmatic-SEO surface, and
the gated product app. These specs are additive: nothing here is imported by
the app, so `npm run build` stays green whether or not Playwright is installed.

## What is covered

| Spec | Project | Checks |
| --- | --- | --- |
| `marketing.spec.js` | public | Homepage loads, Rally hero + `/app` CTA present, no uncaught page errors |
| `seo-pages.spec.js` | public | `/pages` hub renders + lists pages; hub and a sample leaf (`/pages/best-crm-software`) have a real `<title>` and parseable JSON-LD in the raw prerendered HTML |
| `marketing-routes.spec.js` | public | `/blog`, `/about`, `/demo` return 200 and render content |
| `product-gate.spec.js` | product | Seeded unlock lands on the Command Center at `/app`; control case (no flag) shows the coming-soon gate |
| `product-smoke.spec.js` | product | `/deals` and `/intelligence` render without console/page errors |

## How the product unlock works

The product app under `/app` is gated by `src/gate/ComingSoon.jsx`, which
unlocks when `localStorage['rally_access'] === 'granted'`. `global-setup.js`
writes a Playwright `storageState` file (`e2e/.auth/state.json`) that stamps
that key for the preview origin. The `product` project loads it, so gated
specs start already unlocked. No `/api/unlock` network call is needed.

## Running locally

Playwright is NOT in `package.json` yet (a lockfile exists; deps are reported,
not added). To run these locally once the deps below are added:

```
npm run e2e:install     # one time: installs the Chromium browser binary
npm run build           # produce dist/ (preview serves the built app)
npm run e2e             # runs the specs against `vite preview` on :4173
```

`playwright.config.js` starts `vite preview --port 4173 --strictPort` for you
and reuses an already-running preview locally. The build must exist first
because preview serves `dist/`.

## Dependencies to add (do NOT edit package.json blindly; a lockfile exists)

devDependency:

```
@playwright/test@^1.48.0
```

package.json scripts:

```json
"e2e": "playwright test",
"e2e:install": "playwright install --with-deps chromium"
```

Install with a lockfile-aware command, for example:

```
npm install --save-dev @playwright/test@^1.48.0
```

## CI

`.github/workflows/ci.yml` runs three jobs:

- `build` (required gate) - `npm ci` + `npm run build`. This is green today.
- `lint` - `node --check` across every `api/*.js` (the module smoke test).
- `test` (resilient / opt-in) - runs Vitest and Playwright, but is guarded so
  it is a no-op until the test deps land in `package.json`. It never blocks the
  build gate.

Once `@playwright/test` (and, if you want the unit job, `vitest`) are in
`package.json`, the guarded steps light up automatically.
