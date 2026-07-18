import { chromium } from 'playwright';
const B = process.env.SHOOT_BASE || 'http://localhost:5219';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.grantPermissions(['microphone']);
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto(B + '/app', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(3000);
await page.evaluate(() => document.querySelector('.rook-fab')?.click());
await page.waitForTimeout(600);
// click voice-mode toggle
await page.evaluate(() => document.querySelector('button[aria-label="Voice mode"]')?.click());
await page.waitForTimeout(2500);
// toggle training too
await page.evaluate(() => document.querySelector('button[aria-label="Training mode"]')?.click());
await page.waitForTimeout(500);
const voiceOn = await page.locator('button[aria-label="Voice mode"].is-live').count();
const relevant = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|realtime|getUserMedia|Permission|NotAllowed|media/i.test(e));
console.log('voiceToggledLive=' + voiceOn, 'realErrors=' + relevant.length, relevant.slice(0, 4).join(' || '));
await browser.close();
