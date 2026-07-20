import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/audit', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5256';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

// Seed a returning user + a 5-day streak, then load with the Santa outfit override.
await page.goto(B + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem('ardovo_last_user', JSON.stringify({ email: 'jordan@ardovo.com', name: 'Jordan' }));
  localStorage.setItem('ardovo_streak', JSON.stringify({ last: new Date().toDateString(), count: 5 }));
});
await page.goto(B + '/login?ardo=santa', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1300);
await page.screenshot({ path: 'tmp/audit/flair-santa.png' });

// Shades outfit
await page.goto(B + '/login?ardo=shades', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tmp/audit/flair-shades.png' });

// Party outfit
await page.goto(B + '/login?ardo=party', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tmp/audit/flair-party.png' });

const rel = errs.filter(e => !/favicon|manifest|gsi|accounts\.google|Failed to load resource|realtime/i.test(e));
console.log('errors=' + rel.length, rel.slice(0, 5).join(' || '));
await browser.close();
