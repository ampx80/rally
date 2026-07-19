import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
let fail = 0;
for (const [name, path] of [['training-admin', '/training-admin'], ['group-training', '/group-training']]) {
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1700);
  const crash = await page.getByText('Something went sideways').count();
  const deck = await page.locator('.adk').count();
  await page.screenshot({ path: 'tmp/shots/' + name + '.png' });
  const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech/i.test(e));
  if (crash || rel.length) fail++;
  console.log(name.padEnd(16), 'crash=' + crash, 'deck=' + deck, 'errors=' + rel.length, rel.slice(0, 2).join(' | '));
  page.off('pageerror', onerr); page.off('console', oncon);
}
console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
