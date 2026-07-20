import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
for (const [name, path, action] of [
  ['fx-learn', '/learn'], ['fx-skills', '/skills'], ['fx-momentum', '/momentum'],
  ['fx-handshake', '/handshake', async () => { await page.getByRole('button', { name: /Run negotiation|Auto-play/i }).first().click().catch(()=>{}); await page.waitForTimeout(6000); }],
  ['fx-markethub', '/markethub'], ['fx-arena', '/arena'],
]) {
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  if (action) await action();
  await page.screenshot({ path: `tmp/shots/${name}.png` });
  console.log('shot', name);
}
await browser.close();
