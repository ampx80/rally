import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5254';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
for (const [name, path] of [['home', '/'], ['app-gate', '/app'], ['login', '/login']]) {
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  const ardovo = (body.match(/Ardovo/g) || []).length;
  const rally = (body.match(/Rally/g) || []).length;
  const title = await page.title();
  await page.screenshot({ path: 'tmp/shots/rb-' + name + '.png' });
  console.log(`${name}: title="${title}" Ardovo=${ardovo} Rally=${rally}`);
}
await browser.close();
