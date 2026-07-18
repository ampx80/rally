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
await page.waitForTimeout(1500);
const band = page.locator('.ac-band');
await band.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
// hover a capability node so its link + description light up
const node = page.locator('.ac-node').nth(2);
if (await node.count()) { await node.hover(); await page.waitForTimeout(900); }
const canvas = await page.locator('.ac-canvas').count();
const nodes = await page.locator('.ac-node').count();
await band.screenshot({ path: 'tmp/shots/home-constellation.png' });
const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
console.log('canvas=' + canvas, 'nodes=' + nodes, 'errors=' + rel.length, rel.slice(0, 3).join(' || '));
await browser.close();
