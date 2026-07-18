import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5273';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
for (const [name, path] of [['agentcloud', '/agent-cloud'], ['cloudagents', '/cloud-agents'], ['agentapi', '/agent-api']]) {
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2200);
  const crash = await page.getByText('Something went sideways').count();
  const deck = await page.locator('.adk').count();
  const fabric = await page.locator('.afx').count();
  await page.screenshot({ path: 'tmp/shots/' + name + '.png' });
  const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
  console.log(name, 'crash=' + crash, 'deck=' + deck, 'fabric=' + fabric, 'errors=' + rel.length, rel.slice(0, 2).join(' | '));
  errs.length = 0;
}
await browser.close();
