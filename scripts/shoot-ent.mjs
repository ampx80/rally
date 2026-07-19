import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const shots = [['/enterprise', 'enterprise'], ['/ai-trust', 'ai-trust'], ['/security/faq', 'compliance']];
for (const [path, name] of shots) {
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `tmp/shots/${name}.png`, fullPage: false });
}
const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime|gsi|accounts\.google/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 4).join(' || '));
await browser.close();
