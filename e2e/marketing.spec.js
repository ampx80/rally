// ============================================================
// E2E: marketing homepage
// The public root is the marketing site (App.jsx routes "/" -> Home inside
// MarketingShell). Assert it loads and the hero is present. Public surface,
// no unlock needed.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { test, expect } from '@playwright/test';

test.describe('marketing homepage', () => {
  test('loads with the Rally hero present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Tab title is the Rally headline (set in index.html).
    await expect(page).toHaveTitle(/Rally/i);

    // The app mounts into #root and the marketing shell renders.
    await expect(page.locator('#root')).not.toBeEmpty();

    // Hero copy: the headline "Run your revenue on Rally" theme appears across
    // the marketing site; assert the brand + a primary CTA into the product.
    await expect(page.getByText(/Rally/i).first()).toBeVisible();

    // A link into the product app (the universal marketing CTA target).
    await expect(page.locator('a[href="/app"], a[href^="/app"]').first()).toBeVisible();
  });

  test('has no uncaught page errors on load', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});
