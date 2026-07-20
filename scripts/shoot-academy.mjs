import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const clean = (errs) => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|vapi|esm\.sh|Stripe|not configured/i.test(e));
let fail = 0;

async function check(name, path, action) {
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  try { await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 }); await page.waitForTimeout(1400); }
  catch (e) { errs.push('NAV ' + e.message); }
  let extra = '';
  if (action) { try { extra = await action(); } catch (e) { errs.push('ACTION ' + e.message); } }
  const crash = await page.getByText('Something went sideways').count();
  const rel = clean(errs);
  if (crash || rel.length) fail++;
  console.log(name.padEnd(16), 'crash=' + crash, 'errors=' + rel.length, extra, rel.slice(0, 2).join(' | '));
  page.off('pageerror', onerr); page.off('console', oncon);
}

await check('arena', '/arena');
await check('momentum', '/momentum');
await check('replay', '/replay');
await check('skills', '/skills');
await check('app+companion', '/app', async () => {
  // companion + osmosis are globally mounted here; exercise the companion launcher
  await page.waitForTimeout(600);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ardova:companion', { detail: { open: true } })));
  await page.waitForTimeout(900);
  // best-effort: some new fixed panel is now on screen
  const panels = await page.locator('[class*="companion"], [class*="ardo"]').count();
  await page.screenshot({ path: 'tmp/shots/academy-companion.png' });
  return `companionNodes=${panels}`;
});
await check('deals-regress', '/deals');
await check('campaigns-regress', '/campaigns');

console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
