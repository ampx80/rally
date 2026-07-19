import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/audit', { recursive: true });
const B = process.env.SHOOT_BASE || 'https://rally-psi-five.vercel.app';
const browser = await chromium.launch();
const shots = [
  { name: 'login-desktop', path: '/login', vp: { width: 1440, height: 900 } },
  { name: 'login-mobile', path: '/login', vp: { width: 390, height: 844 } },
  { name: 'recover-desktop', path: '/recover', vp: { width: 1440, height: 900 } },
  { name: 'loginhelp-desktop', path: '/login-help', vp: { width: 1440, height: 900 } },
];
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: s.vp });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(B + s.path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `tmp/audit/${s.name}.png`, fullPage: false });
  console.log(`${s.name} errs=${errs.length}`);
  await ctx.close();
}
await browser.close();
