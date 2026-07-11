// ============================================================
// E2E: programmatic-SEO surface (/pages hub + a leaf page)
// prerender-seo.mjs emits a static index.html per registry entry plus a
// hub at /pages, each with a real <title> and JSON-LD in the initial HTML.
// We assert against the RAW server response (page.request.get) so we are
// testing the prerendered output itself, not the post-hydration DOM.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { test, expect } from '@playwright/test';
import { SAMPLE_SEO_SLUG } from './constants.js';

test.describe('SEO prerender', () => {
  test('/pages hub renders and lists pages', async ({ page }) => {
    await page.goto('/pages', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toBeEmpty();
    // At least one leaf link into a generated page is present.
    await expect(page.locator('a[href^="/pages/"]').first()).toBeVisible();
  });

  test('/pages hub prerendered HTML has title + JSON-LD', async ({ request }) => {
    const res = await request.get('/pages');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<title>[^<]*Rally[^<]*<\/title>/i);
    expect(html).toContain('application/ld+json');
  });

  test(`sample page /pages/${SAMPLE_SEO_SLUG} prerendered HTML has title + JSON-LD`, async ({ request }) => {
    const res = await request.get(`/pages/${SAMPLE_SEO_SLUG}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // A non-empty, page-specific <title>.
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    expect(titleMatch, 'a <title> tag exists').not.toBeNull();
    expect((titleMatch?.[1] || '').trim().length).toBeGreaterThan(0);

    // JSON-LD structured data is embedded and parseable.
    expect(html).toContain('application/ld+json');
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    expect(ld, 'a JSON-LD script exists').not.toBeNull();
    expect(() => JSON.parse(ld[1])).not.toThrow();

    // Prerendered body content is present in the initial response.
    expect(html).toContain('seo-prerender');
  });

  test(`sample page /pages/${SAMPLE_SEO_SLUG} renders in the browser`, async ({ page }) => {
    await page.goto(`/pages/${SAMPLE_SEO_SLUG}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
