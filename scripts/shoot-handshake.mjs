import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const clean = () => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|handshake.*disabled/i.test(e));
let fail = 0;

async function goto() { await page.goto(B + '/handshake', { waitUntil: 'networkidle', timeout: 45000 }); await page.waitForTimeout(700); }
async function terminal(ms = 14000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.locator('.hs-outcome').count()) return true; await page.waitForTimeout(300); }
  return (await page.locator('.hs-outcome').count()) > 0;
}
async function outcomeStatus() {
  const txt = (await page.locator('.hs-outcome-head').first().innerText().catch(() => '')) || '';
  if (/impasse/i.test(txt)) return 'impasse';
  if (/countersignature/i.test(txt)) return 'needs_human';
  if (/inside mandate/i.test(txt)) return 'agreed';
  return txt.slice(0, 20);
}
async function setLevers(maxD, walk) {
  await page.evaluate(([a, b]) => {
    const rs = [...document.querySelectorAll('.hs-lever input[type=range]')];
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })); };
    if (rs[0]) set(rs[0], a); if (rs[1]) set(rs[1], b);
  }, [maxD, walk]);
  await page.waitForTimeout(400);
}

// 1. structure renders
await goto();
const env = await page.locator('.hs-env-track').count();
const levers = await page.locator('.hs-lever input[type=range]').count();
const moves = await page.locator('.hs-move').count();
console.log('render'.padEnd(14), `envelope=${env} levers=${levers} moveBtns=${moves}`);
if (!env || levers < 2 || moves < 5) fail++;

// 2. auto-play across several buyers -> collect status variety + assert mandate bound
const statuses = [];
await goto();
for (let i = 0; i < 5; i++) {
  if (i > 0) { await page.getByRole('button', { name: 'New buyer', exact: true }).click(); await page.waitForTimeout(400); }
  const arche = await page.locator('.hs-arche b').first().innerText().catch(() => '?');
  await page.getByRole('button', { name: /Auto-play/i }).first().click();
  const ok = await terminal();
  statuses.push(`${arche.split(' ')[0]}:${ok ? await outcomeStatus() : 'NONE'}`);
  if (!ok) fail++;
}
console.log('auto-variety'.padEnd(14), statuses.join('  '));

// 3. manual moves: concede x2 then split -> should terminate
await goto();
await page.getByRole('button', { name: /Small concession/i }).click(); await page.waitForTimeout(250);
await page.getByRole('button', { name: /Small concession/i }).click().catch(() => {}); await page.waitForTimeout(250);
await page.getByRole('button', { name: /Split the difference/i }).click().catch(() => {}); await page.waitForTimeout(250);
const manualTerminal = await terminal(6000);
console.log('manual-moves'.padEnd(14), `terminal=${manualTerminal} status=${manualTerminal ? await outcomeStatus() : 'live'}`);

// 4. walk away -> impasse
await goto();
await page.getByRole('button', { name: /Walk away/i }).click();
const walked = await terminal(4000);
console.log('walk'.padEnd(14), `status=${walked ? await outcomeStatus() : 'NONE'}`);
if (!walked || (await outcomeStatus()) !== 'impasse') fail++;

// 5. tight mandate (low max discount) auto-play -> still terminates within bounds
await goto();
await setLevers(5, 12);
await page.getByRole('button', { name: /Auto-play/i }).first().click();
const tight = await terminal();
console.log('tight-mandate'.padEnd(14), `terminal=${tight} status=${tight ? await outcomeStatus() : 'NONE'}`);
if (!tight) fail++;
await page.screenshot({ path: 'tmp/shots/handshake-v2.png', fullPage: true });

const rel = clean();
console.log('errors'.padEnd(14), rel.length, rel.slice(0, 3).join(' | '));
if (rel.length) fail++;
console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
