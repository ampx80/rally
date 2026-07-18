import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:4176';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const routes = [['get-started', '/get-started'], ['qualify', '/qualify'], ['migrate', '/migrate'], ['training', '/training']];
for (const [name, path] of routes) {
  errs.length = 0;
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const crash = await page.getByText('Something went sideways').count();
  await page.screenshot({ path: 'tmp/shots/' + name + '.png' });
  const relevant = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React/.test(e));
  console.log(name, 'crash=' + crash, 'errors=' + relevant.length, relevant.slice(0, 3).join(' || '));
}
await page.goto(B + '/app', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
await page.locator('.rook-fab').click();
await page.waitForTimeout(600);
const voiceBtn = await page.locator('button[aria-label="Voice mode"]').count();
const trainBtn = await page.locator('button[aria-label="Training mode"]').count();
console.log('rook voiceBtn=' + voiceBtn, 'trainBtn=' + trainBtn);
await browser.close();
