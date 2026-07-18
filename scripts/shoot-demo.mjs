import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5219';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } }); // NO access granted
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(B + '/demo', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1000);
await page.getByText('Launch the live demo').click();
await page.waitForTimeout(2500);
const url1 = page.url();
const banner = await page.locator('.demo-banner').count();
await page.screenshot({ path: 'tmp/shots/demo-app.png' });

// Locked route should show the upsell, not the real page.
await page.goto(B + '/settings', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);
const locked = await page.getByText('This part is off in the demo').count();
await page.screenshot({ path: 'tmp/shots/demo-locked.png' });

const relevant = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React/.test(e));
console.log('afterLaunchURL=' + url1, 'banner=' + banner, 'lockedUpsell=' + locked, 'errors=' + relevant.length, relevant.slice(0, 3).join(' || '));
await browser.close();
