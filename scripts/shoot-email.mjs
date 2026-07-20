import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/audit', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(B + '/app', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => { localStorage.setItem('rally_access', 'granted'); });
await page.goto(B + '/email-center', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tmp/audit/email-activity.png', fullPage: false });

// Catalog tab
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Catalog'); b && b.click(); });
await page.waitForTimeout(900);
await page.screenshot({ path: 'tmp/audit/email-catalog.png', fullPage: false });

// Preview a template
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Preview')); b && b.click(); });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'tmp/audit/email-preview.png', fullPage: false });

// Digests tab
await page.evaluate(() => { const m = document.querySelector('[aria-label="Close"], .modal-close'); m && m.click(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Digests'); b && b.click(); });
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/email-digests.png', fullPage: false });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime|429|api\/notify/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 6).join(' || '));
await browser.close();
