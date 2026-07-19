import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1050 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
// Real sign-in through the form so a 'signin' event is logged.
await page.goto(B + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('input[autocomplete="email"]', 'jordan@ardovo.com');
await page.fill('input[autocomplete="current-password"]', 'ardovo-team-2026');
await page.evaluate(() => { const b = [...document.querySelectorAll('.lg-submit')][0]; b && b.click(); });
await page.waitForTimeout(1800);
await page.goto(B + '/security-center', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
// scroll to the activity log
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/shots/security-log.png', fullPage: false });
const rel = errs.filter(e => !/CSP|favicon|manifest|Download the React|404|realtime|gsi|accounts\.google|Failed to load resource/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 5).join(' || '));
await browser.close();
