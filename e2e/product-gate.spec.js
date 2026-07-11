// ============================================================
// E2E: product gate unlock flow
// The product app under /app is gated by a coming-soon screen unless
// localStorage rally_access === 'granted' (src/gate/ComingSoon.jsx). This
// spec runs in the "product" project, which loads the storageState seeded
// by global-setup, so /app should render the Command Center directly.
// A control assertion confirms that WITHOUT the flag the gate shows.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { test, expect } from '@playwright/test';

test.describe('product gate', () => {
  test('unlocked session renders the Command Center at /app', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    // The coming-soon gate must NOT be present when unlocked.
    await expect(page.getByText('Request early access')).toHaveCount(0);

    // The app chrome renders: the top bar search affordance and the sidebar
    // brand strip only exist inside the unlocked product shell.
    await expect(page.getByText('Search or jump to...')).toBeVisible();
    await expect(page.getByText('REVENUE PLATFORM')).toBeVisible();

    // Still on /app after the gate resolves.
    await expect(page).toHaveURL(/\/app$/);
  });

  test('control: without the unlock flag the gate is shown', async ({ browser }) => {
    // Fresh context with NO storageState -> gate should appear.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Request early access')).toBeVisible();
    await expect(page.getByText('Search or jump to...')).toHaveCount(0);
    await ctx.close();
  });
});
