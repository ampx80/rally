import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const clean = () => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|vapi|esm\.sh/i.test(e));

await page.goto(B + '/app', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
const startPath = await page.evaluate(() => location.pathname);
// launch straight into the pipeline lesson (route /deals) to prove the conductor navigates + spotlights
await page.evaluate(() => window.dispatchEvent(new CustomEvent('ardova:companion', { detail: { open: true, lessonId: 'pipeline' } })));
// let the conductor run a few beats (navigate + spotlight)
let navigated = false, spotlighted = false;
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(700);
  const p = await page.evaluate(() => location.pathname);
  if (p !== startPath) navigated = true;
  const spot = await page.locator('.tc-spotlight').count();
  if (spot > 0) spotlighted = true;
  if (navigated && spotlighted) break;
}
await page.screenshot({ path: 'tmp/shots/ardo-tour.png' });
const panel = await page.locator('.tc-panel, .tc-head').count();
console.log('tour', `navigated=${navigated} spotlighted=${spotlighted} panel=${panel} startPath=${startPath} errors=${clean().length}`);
console.log((navigated && panel && clean().length === 0) ? 'TOUR OK' : 'TOUR CHECK', clean().slice(0, 3).join(' | '));
await browser.close();
