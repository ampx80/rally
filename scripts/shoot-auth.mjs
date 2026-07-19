import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const errs = [];
async function shot(path, file, actions) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${path} PAGEERR ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`${path} CONSOLE ${m.text()}`); });
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  if (actions) await actions(page);
  await page.screenshot({ path: `tmp/shots/${file}.png`, fullPage: false });
  await ctx.close();
}
await shot('/login', 'auth-login');
await shot('/login', 'auth-login-signup', async (p) => {
  await p.evaluate(() => { const b = [...document.querySelectorAll('.lg-alt button')].find(x => /create an account/i.test(x.textContent)); b && b.click(); });
  await p.waitForTimeout(400);
  await p.fill('input[autocomplete="new-password"]', 'sunshine');
  await p.waitForTimeout(900);
});
await shot('/recover', 'auth-recover');
await shot('/login-help', 'auth-loginhelp');
// mobile login
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(B + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'tmp/shots/auth-login-mobile.png', fullPage: false });
  await ctx.close();
}
const rel = errs.filter(e => !/CSP|favicon|manifest|Download the React|gsi|accounts\.google|pwnedpasswords|Failed to load resource/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 6).join(' || '));
await browser.close();
