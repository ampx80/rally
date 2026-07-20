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
await page.waitForTimeout(1000);

// Party mode: poke Ardo 5x fast.
const guide = page.locator('.lg-aside .ag-char').first();
for (let i = 0; i < 5; i++) { await guide.click({ force: true }); await page.waitForTimeout(120); }
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/fun-party.png' });

// Returning greeting: seed localStorage and reload.
await page.evaluate(() => localStorage.setItem('ardovo_last_user', JSON.stringify({ email: 'jordan@ardovo.com', name: 'Jordan' })));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tmp/audit/fun-returning.png' });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 5).join(' || '));
await browser.close();
