# PWA (installable app + offline shell)

Rally is an installable Progressive Web App. This is additive and SEO-safe: the
service worker keeps navigations, prerendered `/pages/*`, and `/api/*` fresh, and
never runs in dev.

## Files (all additive, in the PWA namespace)

| File | Purpose |
|---|---|
| `public/manifest.webmanifest` | App identity: name, `short_name` Rally, `start_url` `/app`, `display` standalone, theme `#12151c` / background `#f6f7f9`, icons. |
| `public/icons/icon.svg` | App icon, `purpose: any` (`sizes: any`, scalable). |
| `public/icons/icon-maskable.svg` | Maskable icon (full-bleed, safe-zone padded) for Android adaptive icons. |
| `public/sw.js` | Conservative service worker (see strategy below). |
| `src/lib/pwa.js` | `registerSW()`, `onSWUpdate()`, `applySWUpdate()`, `useInstallPrompt()`, `useSWUpdate()`. |
| `src/components/InstallPrompt.jsx` | Dismissible "Install Rally" banner, shown only when installable. |

Files under `public/` are copied to `dist/` verbatim by Vite, so `vite build`
(then `prerender-seo.mjs`) ships them unchanged. No config change needed.

## Service worker strategy (never cache-trap HTML)

- Navigations (`mode === 'navigate'`): NETWORK-FIRST, offline fallback to the
  cached app shell (`/app`). Content is always fresh online.
- `/api/*`: NETWORK-ONLY. Never cached, so live data is never stale.
- `/pages/*` (prerendered SEO): NETWORK-FIRST, cache fallback only offline.
  Crawlers and humans always get the freshest content when online.
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`: NETWORK-FIRST.
- Other same-origin assets (hashed `/assets/*`, icons, manifest): CACHE-FIRST
  with a background refresh so a redeploy self-heals.
- Cross-origin (Google Fonts, CDNs): passthrough, never cached.
- Only GET + same-origin + 200 `basic` responses are ever stored. Versioned
  cache (`rally-v1`) with old-version cleanup on activate. `skipWaiting` +
  `clients.claim`. Bump `VERSION` in `sw.js` to force a clean cache rollover.

Production-only: `registerSW()` returns early unless `import.meta.env.PROD`, so
the SW never registers in `vite dev` and cannot interfere with HMR or the SPA.

## Required wiring (NOT applied here - apply these three edits)

These touch files this task must not edit; apply them manually.

### 1. `index.html` - add inside `<head>` (after the existing meta tags)

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#12151c" />
    <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
    <link rel="apple-touch-icon" href="/icons/icon.svg" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Rally" />
```

### 2. `src/main.jsx` - register the SW

Add the import near the other imports:

```js
import { registerSW } from './lib/pwa.js';
```

Then, after `createRoot(...).render(...)`, call:

```js
registerSW();
```

`registerSW()` is idempotent, production-guarded, and feature-detected, so it is
safe to call unconditionally.

### 3. Mount the install banner (once, inside the authenticated app shell)

In `src/App.jsx`, import and render `InstallPrompt` inside the app shell (the
tree that renders `/app` and friends), e.g. near the top of the shell layout:

```jsx
import InstallPrompt from './components/InstallPrompt.jsx';
// ...
<InstallPrompt />
```

It returns `null` unless the browser fired `beforeinstallprompt` and the user has
not installed or dismissed it, so placement is low-risk.

## Optional: update-available toast

`useSWUpdate()` returns `{ updateReady, applyUpdate }`. When a new SW version is
waiting, render a small "New version available - Refresh" toast whose button
calls `applyUpdate()` (posts `SKIP_WAITING`, the SW takes over, the page reloads
once via the `controllerchange` handler). Wire wherever toasts live.

## Notes

- Icons are SVG (`sizes: any`), which Chromium accepts for installability. If you
  want raster fallbacks for older targets, add `icon-192.png` / `icon-512.png`
  under `public/icons/` and list them in the manifest alongside the SVGs.
- CSP already permits PWA: `manifest-src 'self'`, `worker-src 'self' blob:`,
  `img-src 'self' data: https:` in `vercel.json`. No CSP change required.
```
