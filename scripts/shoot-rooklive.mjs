import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:4174';
const OUT = 'tmp/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); } catch {} });

const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(BASE + '/app', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/rooklive-app.png`, fullPage: false });

const hasRookLive = await page.locator('.rl').count();
const agents = await page.locator('.rl-agent').count();
const props = await page.locator('.rl-prop').count();
console.log('rooklive present:', hasRookLive, 'agents:', agents, 'proposals shown:', props);
console.log('console errors:', errors.length);
errors.slice(0, 12).forEach((e) => console.log('  ERR', e));

await browser.close();
console.log('done');
