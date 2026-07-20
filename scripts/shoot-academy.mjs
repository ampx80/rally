import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const clean = (errs) => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|Vapi|vapi|esm\.sh|Failed to load resource|net::ERR/i.test(e));
let fail = 0;

async function check(name, path, action) {
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  try { await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 }); await page.waitForTimeout(1300); }
  catch (e) { errs.push('NAV ' + e.message); }
  let extra = '';
  if (action) { try { extra = await action(); } catch (e) { errs.push('ACTION ' + e.message); } }
  const crash = await page.getByText('Something went sideways').count();
  const rel = clean(errs);
  if (crash || rel.length) fail++;
  console.log(name.padEnd(14), 'crash=' + crash, 'errors=' + rel.length, extra, rel.slice(0, 2).join(' | '));
  page.off('pageerror', onerr); page.off('console', oncon);
}

await check('learn', '/learn', async () => {
  const tiles = await page.locator('.card, [class*=learn]').count();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ardova:companion', { detail: { open: true, lessonId: 'ae-1' } })));
  await page.waitForTimeout(700);
  const panel = await page.locator('.tc-head, .tc-panel').count();
  await page.screenshot({ path: 'tmp/shots/learn-hub.png', fullPage: true });
  return `tiles=${tiles} companionOpened=${panel}`;
});
await check('arena', '/arena', async () => { const m = await page.locator('.card, [class*=arena]').count(); return `nodes=${m}`; });
await check('momentum', '/momentum', async () => { const m = await page.locator('.card, [class*=momentum]').count(); return `nodes=${m}`; });
await check('replay', '/replay', async () => { const m = await page.locator('.card, [class*=replay]').count(); return `nodes=${m}`; });
await check('skills', '/skills', async () => { const m = await page.locator('svg, [class*=skill]').count(); return `nodes=${m}`; });
await check('companion', '/app', async () => {
  const launcher = await page.locator('.tc-launcher').count();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ardova:companion')));
  await page.waitForTimeout(900);
  const panel = await page.locator('.tc-head, .tc-panel').count();
  await page.screenshot({ path: 'tmp/shots/companion.png' });
  return `launcher=${launcher} panelOpened=${panel}`;
});

console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
