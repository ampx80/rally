import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5333';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(B + '/training', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);
// launch the guided coach for the first module
await page.evaluate(() => { const b = document.querySelector('.tn-steps'); }); // ensure page loaded
await page.evaluate(() => { window.dispatchEvent(new CustomEvent('rally:coach', { detail: { moduleId: 'u-command-spine' } })); });
await page.waitForTimeout(1800);
const card1 = await page.locator('.co-card').count();
const ring1 = await page.locator('.co-ring').count();
const title1 = await page.locator('.co-title').first().textContent().catch(() => '');
await page.screenshot({ path: 'tmp/shots/coach-1.png' });
// advance
await page.locator('.co-btn-primary').click();
await page.waitForTimeout(1600);
const eyebrow2 = await page.locator('.co-eyebrow').first().textContent().catch(() => '');
await page.screenshot({ path: 'tmp/shots/coach-2.png' });
const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speechSynthesis|not-allowed/i.test(e));
console.log('card=' + card1, 'ring=' + ring1, 'step1="' + (title1 || '').slice(0, 30) + '"', 'afterNext="' + (eyebrow2 || '').slice(0, 40) + '"', 'errors=' + rel.length, rel.slice(0, 3).join(' | '));
await browser.close();
