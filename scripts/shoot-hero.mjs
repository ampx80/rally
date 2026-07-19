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
await page.goto(B + '/', { waitUntil: 'networkidle', timeout: 60000 });
// let the hero build once
await page.waitForTimeout(2600);
await page.screenshot({ path: 'tmp/shots/hero-top.png', clip: { x: 0, y: 0, width: 1440, height: 950 } });
const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 3).join(' || '));
await browser.close();
