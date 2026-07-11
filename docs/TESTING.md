# Testing

Rally ships with an automated unit-test suite built on [Vitest](https://vitest.dev).
The tests exercise the real business logic in `src/lib/*` and the programmatic-SEO
registry directly, with meaningful assertions (not smoke tests). A billion-dollar
app has tests; this is the guard rail.

## One-time setup

The test tooling is not yet in `package.json`. Add these devDependencies and the
`test` script, then install:

```jsonc
// package.json
"scripts": {
  "dev": "vite",
  "build": "vite build && node scripts/prerender-seo.mjs",
  "prerender": "node scripts/prerender-seo.mjs",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
},
"devDependencies": {
  // ...existing...
  "vitest": "^3.2.7",
  "jsdom": "^29.1.1",
  "@testing-library/react": "^16.3.2",
  "@testing-library/jest-dom": "^6.9.1"
}
```

```bash
npm install
```

> Coverage (`test:coverage`) additionally needs `@vitest/coverage-v8` at the same
> major version as `vitest`. Install it with `npm i -D @vitest/coverage-v8` if you
> want the coverage report; the base `test` run does not require it.

## Running

```bash
npm test                # single run, CI-friendly
npm run test:watch      # re-run on change while developing
npx vitest run          # same as npm test, no script needed
npx vitest run src/test/store.test.js   # a single file
```

## How it is wired

- **`vitest.config.js`** (separate from `vite.config.js` by design so the app
  build and the test harness never fight over plugins or ports). It sets the
  `jsdom` environment (so the local-first store modules get a real
  `window.localStorage`), enables `globals` (no per-file `import` of
  `describe/it/expect`), and loads the setup file.
- **`src/test/setup.js`** pulls in the `@testing-library/jest-dom` matchers,
  polyfills `localStorage` if the environment lacks it, and clears storage
  before and after every test so the deterministic seeds rebuild in isolation.
- Test files live under **`src/test/*.test.js`**, one per unit under test.

## What is covered (174 tests, 10 files)

| File | Unit under test | What it asserts |
| --- | --- | --- |
| `store.test.js` | `src/lib/store.js` | create/update Company, Contact, Deal (happy + error paths), value validation, `moveDealStage` stage/probability/status + system-note logging, activity toggle, derived selectors (pipeline value, weighted forecast, win rate, dealsByStage), and audit integration on updates. |
| `store-ext.test.js` | `src/lib/store-ext.js` | Lead + Quote creation and validation, monotonic quote numbering, numeric coercion, missing-id errors, and AR / campaign / ticket / lead roll-up selectors. |
| `importer.test.js` | `src/lib/importer.js` | `parseCsv` edge cases (quoted commas, embedded newlines, doubled quotes, BOM, blank rows, no trailing newline), `autoMap` alias resolution + no double-mapping, and `runImport` create counts, in-batch and cross-run dedupe, dedupe-off, and per-object routing (contact/company/deal/lead). |
| `mailboxes.test.js` | `src/lib/mailboxes.js` | `addMailbox` email + SMTP validation, password masking, first-connection-is-default, exclusive default switching, upsert on repeat, default promotion on remove, and `testMailbox`. |
| `fields.test.js` | `src/lib/fields.js` | Registry reads (system + custom merge), `addCustomField` validation + key-collision handling, `updateCustomField`/`removeCustomField`, the `setFieldValue`/`getFieldValue` patch logic (storeKey column vs record key vs `fieldValues`), and `validateValue` across types. |
| `rbac.test.js` | `src/lib/rbac.js` | `can`, the default grant matrix, override editing (and admin lock-out immunity), `canViewField`/`canEditField` rank-based field security, and active-role / view-as switching. |
| `automations.test.js` | `src/lib/automations.js` | `evaluateAutomation` simulation with numeric + text condition operators, `testAutomation` real execution, rule CRUD (save/toggle/duplicate/delete/addTemplate), and the human-readable summaries. |
| `views.test.js` | `src/lib/views.js` | `applyView` filter operators (is, contains, gt, between, anyOf, isEmpty, before, `@me`/`today` magic tokens, AND-combination), sorting, `opsForType` routing, and view CRUD with system-view forking. |
| `audit.test.js` | `src/lib/audit.js` | `logChange` entry shape + undefined-to-null coercion, `getAudit` per-record filtering and newest-first ordering, and reset. |
| `seo-registry.test.js` | `src/marketing/seo/registry.js` | The slug-uniqueness guard: `allSlugs()` has zero duplicates and `BY_SLUG` resolves exactly one entry per slug across ALL datasets, plus faceting (`byType`/`byGroup`/`categoriesFor`) and derived helpers (`stats`, `relatedFor`, `featured`). |

### The SEO slug guard (why it matters)

The raw dataset files under `src/marketing/seo/data/` intentionally contain
overlapping slugs (a topic can legitimately appear in more than one source list).
`registry.js` is the single dedup point, keeping the first occurrence of each slug.
`seo-registry.test.js` locks that contract: if a future dataset introduced a slug
that the dedup logic failed to collapse, the uniqueness assertion fails in CI
before a colliding `/pages/:slug` URL can ship.

## Conventions

- ASCII only. No em-dash or en-dash anywhere in test files or docs.
- Do not import from `src/App.jsx`; these are unit tests over `src/lib/*` and the
  SEO registry, not component/render tests.
- Each test resets the module it exercises (`resetStore()`, `resetExt()`,
  `resetFields()`, `resetAudit()`, `resetRbac()`, `resetAutomations()`,
  `resetViews()`) in `beforeEach` so the deterministic seeds start clean.
