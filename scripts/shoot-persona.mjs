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
await page.evaluate(() => localStorage.setItem('rally_access', 'granted'));
await page.goto(B + '/dashboards', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

// Open the persona bar dropdown
await page.evaluate(() => { const b = document.querySelector('.pbar-pill'); b && b.click(); });
await page.waitForTimeout(600);
await page.screenshot({ path: 'tmp/audit/persona-menu.png', fullPage: false });

// Pick Support persona (scopes nav)
await page.evaluate(() => { const b = [...document.querySelectorAll('.pbar-opt')].find(x => x.textContent.includes('Support')); b && b.click(); });
await page.waitForTimeout(900);
await page.screenshot({ path: 'tmp/audit/persona-scoped.png', fullPage: false });

// Open Atlas dock
await page.evaluate(() => { window.dispatchEvent(new CustomEvent('rally:atlas', { detail: { open: true } })); });
await page.waitForTimeout(900);
await page.screenshot({ path: 'tmp/audit/persona-atlas.png', fullPage: false });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime|api\//i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 6).join(' || '));
await browser.close();
