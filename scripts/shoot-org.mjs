import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/audit', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 1050 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(B + '/app', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => localStorage.setItem('rally_access', 'granted'));
await page.goto(B + '/org', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tmp/audit/org-chart.png', fullPage: false });

// Views tab
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Views'); b && b.click(); });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tmp/audit/org-views.png', fullPage: false });

// Toggle See everything
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('See everything')); b && b.click(); });
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/org-views-full.png', fullPage: false });

// Guide tab
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Guide'); b && b.click(); });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tmp/audit/org-guide.png', fullPage: false });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime|api\//i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 6).join(' || '));
await browser.close();
