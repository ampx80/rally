import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(B + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => localStorage.setItem('rally_access', 'granted'));
await page.goto(B + '/security-center', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
// Click the first "Set up" button to reveal QR enrollment.
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /set up/i.test(x.textContent));
  b && b.click();
});
await page.waitForTimeout(1400); // let QR data-url render
await page.screenshot({ path: 'tmp/shots/security-2fa.png', fullPage: false });
const rel = errs.filter(e => !/CSP|favicon|manifest|Download the React|404|realtime|gsi|accounts\.google|Failed to load resource/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 5).join(' || '));
await browser.close();
