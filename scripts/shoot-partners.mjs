import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
fs.mkdirSync('tmp/audit', { recursive: true });
const file = 'file:///' + path.resolve('public/partners.html').replace(/\\/g, '/');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(file, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tmp/audit/partners-gate.png' });

// wrong password
await page.fill('#pw', 'wrongkey');
await page.click('#gateForm button[type="submit"]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'tmp/audit/partners-error.png' });

// correct password
await page.fill('#pw', 'john2026');
await page.click('#gateForm button[type="submit"]');
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tmp/audit/partners-hero.png' });

// scroll to capability index
await page.evaluate(() => document.getElementById('suites').scrollIntoView());
await page.waitForTimeout(1400);
await page.screenshot({ path: 'tmp/audit/partners-suites.png' });

// open a demo modal
await page.evaluate(() => { document.querySelector('[data-demo="rook"]').click(); });
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tmp/audit/partners-modal.png' });

const rel = errs.filter(e => !/favicon|manifest|tailwindcss\.com should not be used in production/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 6).join(' || '));
await browser.close();
