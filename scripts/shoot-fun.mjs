import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/audit', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(B + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);

// Poke Ardo (desktop aside character) a few times to catch a reaction.
const guide = page.locator('.lg-aside .ag-char').first();
await guide.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/fun-poke.png' });

// Sign in for real, capture the warp mid-transition (nav fires at ~1150ms).
await page.fill('input[autocomplete="email"]', 'jordan@ardovo.com');
await page.fill('input[autocomplete="current-password"]', 'ardovo-team-2026');
await page.evaluate(() => { document.querySelector('.lg-submit')?.click(); });
await page.waitForTimeout(520);
await page.screenshot({ path: 'tmp/audit/fun-warp.png' });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 5).join(' || '));
await browser.close();
