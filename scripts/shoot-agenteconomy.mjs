import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
let fail = 0;
const clean = (errs) => errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|handshake.*disabled/i.test(e));

async function check(name, path, action) {
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1200);
  let extra = '';
  if (action) { try { extra = await action(); } catch (e) { errs.push('ACTION ' + e.message); } }
  const crash = await page.getByText('Something went sideways').count();
  await page.screenshot({ path: 'tmp/shots/' + name + '.png', fullPage: true });
  const rel = clean(errs);
  if (crash || rel.length) fail++;
  console.log(name.padEnd(16), 'crash=' + crash, 'errors=' + rel.length, extra, rel.slice(0, 2).join(' | '));
  page.off('pageerror', onerr); page.off('console', oncon);
}

await check('handshake', '/handshake', async () => {
  await page.getByRole('button', { name: /Run negotiation/i }).first().click();
  await page.waitForTimeout(8500);
  const msgs = await page.locator('.hs-msg').count();
  const mandatesOn = await page.locator('.hs-mandate.on').count();
  const outcome = await page.locator('.hs-outcome').count();
  return `msgs=${msgs} mandatesOn=${mandatesOn} outcome=${outcome}`;
});

await check('boardroom', '/boardroom', async () => {
  await page.getByRole('button', { name: /Convene the council/i }).first().click();
  await page.waitForTimeout(7500);
  const seats = await page.locator('.br-seat').count();
  const lines = await page.locator('.br-line').count();
  const consensus = await page.locator('.br-consensus').count();
  const decisions = await page.locator('.br-decision').count();
  return `seats=${seats} lines=${lines} consensus=${consensus} decisions=${decisions}`;
});

await check('agent-economy', '/agent-economy', async () => {
  // scroll through so IntersectionObserver reveals fire, then capture each band
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= h; y += 700) { await page.evaluate(_y => window.scrollTo(0, _y), y); await page.waitForTimeout(220); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const ae = await page.locator('.ae').count();
  const pillars = await page.locator('.ae-pillar').count();
  const vs = await page.locator('.ae-vs-col').count();
  const chips = await page.locator('.ae-chip').count();
  const revealedPillars = await page.locator('.ae-pillar:visible').count();
  return `ae=${ae} pillars=${pillars} vs=${vs} chips=${chips} vis=${revealedPillars}`;
});

await check('home', '/', async () => {
  const band = await page.getByText('The buyer will bring their own AI').count();
  return `band=${band}`;
});

console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
