# Rally Performance Audit

Scope: initial bundle / load performance of the SPA, focused on the eager-import
problem in `src/App.jsx`, the `recharts` and `pptxgenjs` heavy dependencies,
fonts, images, and how all of this interacts with the SEO prerender step
(`scripts/prerender-seo.mjs`). Enterprise buyers benchmark Lighthouse / Core Web
Vitals; the wins below target LCP, TBT, and total transfer on first load.

An additive helper ships with this audit:
`src/lib/lazy-routes.js` - `productPages`, `marketingPages`, `withSuspense`,
`PageFallback`, `lazyWithRetry`, and a declarative `ROUTE_SPLIT_MAP`. No existing
file was edited; the exact App.jsx diff is below.

---

## Finding 1 (highest impact) - the whole app ships in one bundle

### The problem
`src/App.jsx` lines 11-48 eager-import every screen at module top:

- 28 product pages (`CommandCenter` ... `DocBuilder`)
- 8 marketing pages (`Home` ... `SeoPage`)
- plus `CommandK`, `RookDock`, `LaunchScreen`, the marketing kit

Because they are static top-level imports, Vite/Rollup put them all in the entry
chunk. The very first paint - whether a visitor lands on marketing `/` or a
gated product route - downloads, parses, and evaluates JavaScript for screens
the user has not visited. Every page that statically imports `recharts`
(Reports, Dashboards, Forecasting, Invoices, and most marketing pages) or
`pptxgenjs` (DocBuilder) drags those libraries into that single chunk too. This
inflates Time to Interactive and Total Blocking Time across the board.

### The fix - convert routes to React.lazy
`src/lib/lazy-routes.js` already declares every page as a code-split chunk via
`lazyWithRetry(() => import('...'))`. Adopt it in `src/App.jsx`:

1. Delete the eager page imports (lines 11-38 for product pages, lines 40-47 for
   marketing pages). Keep `CommandK`, `RookDock`, `LaunchScreen`, `MarketingShell`,
   and the gate eager (they are part of the shell / first paint).

2. Add the registries + Suspense helper:
   ```jsx
   import { productPages, marketingPages, withSuspense } from './lib/lazy-routes.js';
   ```

3. Swap each `<Route element={<X />} />` for `withSuspense(...)`. Product block
   (lines 258-288) becomes:
   ```jsx
   <Route path="/app" element={withSuspense(productPages.CommandCenter)} />
   <Route path="/leads" element={withSuspense(productPages.Leads)} />
   <Route path="/deals" element={withSuspense(productPages.Deals)} />
   <Route path="/deals/:id" element={withSuspense(productPages.DealDetail)} />
   <Route path="/contacts" element={withSuspense(productPages.Contacts)} />
   <Route path="/contacts/:id" element={withSuspense(productPages.ContactDetail)} />
   <Route path="/companies" element={withSuspense(productPages.Companies)} />
   <Route path="/companies/:id" element={withSuspense(productPages.CompanyDetail)} />
   <Route path="/activities" element={withSuspense(productPages.Activities)} />
   <Route path="/forecasting" element={withSuspense(productPages.Forecasting)} />
   <Route path="/campaigns" element={withSuspense(productPages.Campaigns)} />
   <Route path="/sequences" element={withSuspense(productPages.Sequences)} />
   <Route path="/projects" element={withSuspense(productPages.Projects)} />
   <Route path="/inbox" element={withSuspense(productPages.Inbox)} />
   <Route path="/products" element={withSuspense(productPages.Products)} />
   <Route path="/quotes" element={withSuspense(productPages.Quotes)} />
   <Route path="/quotes/:id" element={withSuspense(productPages.QuoteDetail)} />
   <Route path="/studio" element={withSuspense(productPages.Studio)} />
   <Route path="/studio/:id" element={withSuspense(productPages.DocBuilder)} />
   <Route path="/invoices" element={withSuspense(productPages.Invoices)} />
   <Route path="/dashboards" element={withSuspense(productPages.Dashboards)} />
   <Route path="/reports" element={withSuspense(productPages.Reports)} />
   <Route path="/workflows" element={withSuspense(productPages.Workflows)} />
   <Route path="/integrations" element={withSuspense(productPages.Integrations)} />
   <Route path="/team" element={withSuspense(productPages.Team)} />
   <Route path="/audit" element={withSuspense(productPages.AuditLog)} />
   <Route path="/import" element={withSuspense(productPages.ImportData)} />
   <Route path="/settings" element={withSuspense(productPages.Settings)} />
   ```
   Marketing block (lines 227-235):
   ```jsx
   <Route path="/" element={withSuspense(marketingPages.Home)} />
   <Route path="/features" element={withSuspense(marketingPages.Features)} />
   <Route path="/product/rook" element={withSuspense(marketingPages.RookPage)} />
   <Route path="/pricing" element={withSuspense(marketingPages.Pricing)} />
   <Route path="/security" element={withSuspense(marketingPages.Security)} />
   <Route path="/manifesto" element={withSuspense(marketingPages.Manifesto)} />
   <Route path="/pages" element={withSuspense(marketingPages.PagesHub)} />
   <Route path="/pages/:slug" element={withSuspense(marketingPages.SeoPage)} />
   ```

`withSuspense` wraps each element in a `<Suspense>` with `PageFallback` (a quiet,
reduced-motion-aware, screen-reader-announced spinner sized to `min-height:60vh`
so the layout does not shift). `lazyWithRetry` guards against the stale-chunk
404 that code-split apps hit after a fresh deploy on an old open tab.

Optional: the existing `<div key={loc.pathname} className="page-in">` wrapper
already scopes one Suspense-per-route implicitly; if you prefer a single
boundary, wrap the whole `<Routes>` in one `<Suspense fallback={<PageFallback/>}>`
instead of per-route.

### Expected savings
Exact numbers need a `vite build` + `rollup-plugin-visualizer` run, but the shape
is: the entry chunk drops from "every screen + recharts + pptxgenjs" to
"shell + router + first route." `recharts` alone is roughly 250-400 KB
min+gzip-ish of its own weight and is imported by ~10 screens; `pptxgenjs` is
large and only DocBuilder needs it. Moving both behind lazy routes typically cuts
initial JS by more than half. Target: initial app JS well under 300 KB gzip,
DocBuilder/report screens paying their own cost only when opened.

---

## Finding 2 - recharts is duplicated across lazy chunks without a vendor split

Once pages are lazy, each chart page's chunk would inline its own copy of
`recharts` unless Rollup hoists it into a shared chunk. Because many routes use
it (see `heavy: 'recharts'` entries in `ROUTE_SPLIT_MAP`), configure a manual
vendor chunk so it is downloaded once and cached across navigations.

`vite.config.js` (currently minimal, lines 1-8) - add:
```js
export default defineConfig({
  plugins: [react()],
  server: { port: 5182, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          // pptxgenjs stays route-local: only DocBuilder imports it, so let it
          // ride that route's chunk rather than a shared vendor bundle.
        },
      },
    },
  },
});
```
This keeps `recharts` in one cacheable `vendor-charts` chunk shared by every
chart route, and isolates the React runtime so page chunks stay lean.

Deeper win (optional): several pages import the full barrel
`from 'recharts'` (for example `src/pages/Reports.jsx` lines 8-11). Recharts v2
is not fully tree-shakeable via the barrel; the vendor chunk above is the
pragmatic fix. If chart weight is still the bottleneck after measuring, evaluate
a lighter primitive (the app already hand-rolls `Sparkline`/`MiniBars`/`Ring` SVG
in `UI.jsx`, which cover many cases with zero dependency).

---

## Finding 3 - fonts are render-blocking third-party requests

`index.html` lines 12-14 load Inter (5 weights) + JetBrains Mono (2 weights) from
Google Fonts as a render-blocking `<link rel="stylesheet">`. It uses
`preconnect` + `display=swap` (good), but the stylesheet still blocks first paint
and adds a cross-origin dependency enterprise networks sometimes proxy or block.

Fixes, in order of impact:
1. Preload the one weight above the fold and keep swap:
   ```html
   <link rel="preload" as="style"
     href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" />
   ```
   Also trim the Inter weight list to the weights actually used (400/500/600/700/800
   are all referenced in CSS and inline styles, so keep those; drop any that a
   build audit shows unused).
2. Best: self-host the woff2 files under `public/fonts/` and add
   `@font-face` with `font-display: swap` to `src/index.css`. Removes the
   third-party round trip entirely, which helps LCP and satisfies buyers with
   strict CSP / no-external-request policies. The design tokens already fall back
   to `-apple-system, 'Segoe UI'` (`--font-body` line 60), so a swap is safe.

---

## Finding 4 - image and asset strategy

There are no `<img>`-heavy pages today (the UI leans on inline SVG icons and
recharts), which is good for LCP. To keep it that way as marketing grows:
- Serve any raster hero art as AVIF/WebP with explicit `width`/`height` to
  reserve layout space (prevents CLS).
- Mark decorative SVG `aria-hidden` (icons already do this) and inline small ones;
  lazy-load (`loading="lazy"` + `decoding="async"`) any below-the-fold raster.
- The `Avatar` component (`UI.jsx` lines 85-92) renders initials by default and
  only loads an `<img>` when `src` is passed - keep that default; it avoids N
  avatar requests on list pages.

---

## Finding 5 - prerender interplay (do not regress SEO)

`scripts/prerender-seo.mjs` runs after `vite build` and writes a real static HTML
file per marketing/SEO page (full content, meta, JSON-LD) that crawlers and LLMs
read in the initial response; the SPA then boots into `#root` and takes over for
humans. Two implications for the lazy-loading change:

1. Lazy-loading the marketing pages is SEO-safe. The crawler-facing content lives
   in the prerendered HTML, not the JS chunk, so deferring the React chunk for
   `SeoPage`/`Home` does not hide content from bots. Humans get the static HTML
   immediately, then the matching chunk hydrates.
2. Keep the first marketing paint fast: `Home` and `SeoPage` are the common
   landing routes. `ROUTE_SPLIT_MAP` marks `Home` `eager: true` as a hint - if a
   Suspense flash on the landing page is undesirable, keep `Home` eager-imported
   and lazy-load only the rest. Measure both.
3. Confirm the prerender still runs and the SPA still mounts after the router
   refactor: `npm run build` (which chains `prerender-seo.mjs`) then spot-check a
   prerendered `dist/pages/<slug>/index.html` for full content, and load the app
   to confirm chunks resolve.

---

## Suggested measurement pass

1. Baseline: `npm run build`, then add `rollup-plugin-visualizer` (dev-only) to
   see the entry chunk composition before/after.
2. Convert routes to lazy (Finding 1) + add `manualChunks` (Finding 2). Rebuild
   and compare entry chunk size and the number of chunks.
3. Lighthouse (mobile preset) on `/` and `/app`: watch LCP, TBT, and
   "Reduce unused JavaScript." The lazy split should clear most of the unused-JS
   flag.
4. Fonts (Finding 3): self-host, re-run Lighthouse, confirm LCP improvement and
   no external font request in the network panel.
