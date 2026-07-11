// ============================================================
// E2E: new marketing routes resolve (/blog, /about, /demo)
// These are public marketing routes wired in App.jsx. vite preview serves
// index.html (SPA fallback) with a 200; we also drive the router and assert
// real content renders, not just a status code.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { test, expect } from '@playwright/test';

const ROUTES = ['/blog', '/about', '/demo'];

for (const route of ROUTES) {
  test(`marketing route ${route} serves 200 and renders content`, async ({ page, request }) => {
    // Raw fetch: SPA fallback returns index.html with a 200 (never a 404).
    const res = await request.get(route);
    expect(res.status(), `${route} status`).toBe(200);

    // Drive the router and confirm the page paints real content.
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('h1, h2').first()).toBeVisible();
    expect(pageErrors, `page errors on ${route}: ${pageErrors.join(' | ')}`).toEqual([]);
  });
}
