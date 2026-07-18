import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5219';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(B + '/atlas', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2000);
const crash = await page.getByText('Something went sideways').count();
const dots = await page.locator('.atl-svg circle[data-point]').count();
const clusters = await page.locator('.atl-cluster').count();
await page.screenshot({ path: 'tmp/shots/atlas.png' });
// click a point to trigger look-alikes
if (dots) { await page.locator('.atl-svg circle[data-point]').first().click({ force: true }); await page.waitForTimeout(600); }
const nb = await page.locator('.atl-nb').count();
await page.screenshot({ path: 'tmp/shots/atlas-lookalike.png' });
// switch to predict mode + capture
await page.evaluate(() => { const b = [...document.querySelectorAll('.atl-seg-btn')].find(x => x.textContent === 'Predict'); b?.click(); });
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/shots/atlas-predict.png' });
const pred = selPredCount(await page.locator('.atl-pred').count());
function selPredCount(n) { return n; }
const relevant = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
console.log('crash=' + crash, 'points=' + dots, 'clusters=' + clusters, 'lookalikes=' + nb, 'predBlock=' + pred, 'errors=' + relevant.length, relevant.slice(0, 3).join(' || '));
await browser.close();
