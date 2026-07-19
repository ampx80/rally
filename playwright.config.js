// ============================================================
// RALLY PLAYWRIGHT CONFIG  (end-to-end tests)
// Runs the specs in e2e/ against a real production build served by
// `vite preview` on a fixed port. Additive: none of these files are
// imported by the app, so `npm run build` stays green with or without
// Playwright installed. Chromium only, CI-friendly (retries + trace).
//
// Prereqs (see e2e/README.md): the dist/ build must exist. In CI we run
// `npm run build` first; locally the webServer block builds implicitly via
// preview only if dist already exists, so run `npm run build` once first.
//
// Two projects:
//   - "public"  : marketing + /pages specs, no auth state (public surface)
//   - "product" : gated product specs, loads the seeded rally_access unlock
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, PORT, AUTH_STATE } from './e2e/constants.js';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // Only *.spec.js files are tests; constants/global-setup are helpers.
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // Seeds the storageState the "product" project loads (unlock code).
  globalSetup: './e2e/global-setup.js',

  projects: [
    {
      name: 'public',
      testMatch: ['**/marketing.spec.js', '**/seo-pages.spec.js', '**/marketing-routes.spec.js'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'product',
      testMatch: ['**/product-gate.spec.js', '**/product-smoke.spec.js'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE },
    },
  ],

  // Serve the built app. In CI, `npm run build` runs before this. Locally,
  // ensure dist/ exists first (run `npm run build`). reuseExistingServer lets
  // you keep a `vite preview` running between local runs.
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
