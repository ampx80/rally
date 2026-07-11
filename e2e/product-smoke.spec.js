// ============================================================
// E2E: product smoke tests (a couple of core screens)
// Runs in the "product" project (unlock seeded via storageState). Opens two
// representative product routes and asserts they render without a JS crash.
// Network-level noise (e.g. /api/* not running under `vite preview`) is
// filtered out; genuine uncaught exceptions (pageerror) fail the test.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { test, expect } from '@playwright/test';

// console.error lines we consider benign under a static preview (no backend).
const BENIGN = [
  /\/api\//i,
  /Failed to load resource/i,
  /Failed to fetch/i,
  /net::ERR/i,
  /favicon/i,
  /fonts\.g(oogleapis|static)\.com/i,
  /Content Security Policy/i,
];

const SCREENS = [
  { route: '/deals', label: 'Deals' },
  { route: '/intelligence', label: 'Intelligence' },
];

for (const { route, label } of SCREENS) {
  test(`${label} (${route}) renders without console errors`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (BENIGN.some((re) => re.test(text))) return;
      consoleErrors.push(text);
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });

    // Gate is not showing and the product content area painted.
    await expect(page.getByText('Request early access')).toHaveCount(0);
    await expect(page.locator('.rl-content')).toBeVisible();
    // Product screens use SectionHeader (renders an h3); accept any heading.
    await expect(page.locator('.rl-content h1, .rl-content h2, .rl-content h3').first()).toBeVisible();

    // No uncaught JS exceptions, and no non-benign console errors.
    expect(pageErrors, `uncaught errors on ${route}: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console errors on ${route}: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
}
