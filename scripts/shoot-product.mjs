import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.SHOOT_BASE || 'https://rally-psi-five.vercel.app';
const OUT = 'tmp/shots';
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  ['app', '/app'],
  ['deals', '/deals'],
  ['forecasting', '/forecasting'],
  ['contacts', '/contacts'],
  ['dashboards', '/dashboards'],
  ['studio', '/studio'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
// Grant access before any app code runs.
await ctx.addInitScript(() => {
  try { localStorage.setItem('rally_access', 'granted'); } catch {}
});

const page = await ctx.newPage();
for (const [name, path] of pages) {
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log('shot', name, '->', path);
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}
await browser.close();
console.log('done');
