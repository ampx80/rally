import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:4321';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(B + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
// scroll so the constellation CTA + the theater card seam are both in view
await page.evaluate(() => { const cta = document.querySelector('.ac-cta'); if (cta) cta.scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(900);
// measure whether the bottom white fade overlaps the theater float card
const info = await page.evaluate(() => {
  const after = document.querySelector('.ac-band');
  const band = after.getBoundingClientRect();
  const float = document.querySelector('.m-float-a');
  const btn = document.querySelector('.ac-ghost');
  const bg = btn ? getComputedStyle(btn).backgroundColor : null;
  return {
    bandBottom: Math.round(band.bottom),
    floatTop: float ? Math.round(float.getBoundingClientRect().top) : null,
    ghostBg: bg,
  };
});
await page.screenshot({ path: 'tmp/shots/seam.png' });
const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
console.log(JSON.stringify({ info, errors: rel.length, sample: rel.slice(0, 3) }));
await browser.close();
