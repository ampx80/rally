import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5219';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
for (const p of ['/deals', '/contacts', '/forecasting', '/dashboards']) {
  await page.goto(B + p, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(700);
}
await page.waitForTimeout(800);
const tab = await page.locator('.rpd-tab').count();
if (tab) { await page.evaluate(() => document.querySelector('.rpd-tab')?.click()); await page.waitForTimeout(500); }
const panel = await page.locator('.rpd-panel').count();
const rows = await page.locator('.rpd-row').count();
await page.screenshot({ path: 'tmp/shots/recents.png' });
const relevant = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React/.test(e));
console.log('tab=' + tab, 'panel=' + panel, 'rows=' + rows, 'errors=' + relevant.length, relevant.slice(0, 3).join(' || '));
await browser.close();
