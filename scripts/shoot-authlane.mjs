import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5253';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const shots = [['login', '/login'], ['early-access', '/early-access'], ['security-center', '/security-center']];
for (const [name, path] of shots) {
  errs.length = 0;
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const crash = await page.getByText('Something went sideways').count();
  await page.screenshot({ path: 'tmp/shots/al-' + name + '.png' });
  const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
  console.log(name, 'crash=' + crash, 'errors=' + rel.length, rel.slice(0, 2).join(' || '));
}
// verify Security enroll flow: click first "Set up" and confirm a setup key appears
await page.goto(B + '/security-center', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
const setup = await page.locator('button:has-text("Set up")').first();
if (await setup.count()) { await setup.click(); await page.waitForTimeout(500); }
const keyShown = await page.locator('.sec-key-val').count();
await page.screenshot({ path: 'tmp/shots/al-2fa-enroll.png' });
console.log('2fa-enroll keyShown=' + keyShown);
await browser.close();
