import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const errors = [];
const clean = (t) => /Content Security Policy|upgrade-insecure|favicon|Download the React/i.test(t);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error' && !clean(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERR ' + e.message));

const CSV = [
  'Full Name,Email,Phone,Job Title,Account,Lead Score,Region',
  'Jordan Avery,jordan@northwind.com,555-201-3345,VP Sales,Northwind,88,West',
  'sam diaz,sam@atlas.com; sam@personal.com,555 990 1188,Ops Lead,Atlas,72,East',
  'Priya Rao,priya@cascade.com,call me,CFO,Cascade,91,West',
  'Jordan Avery,jordan@northwind.com,555-201-3345,VP Sales,Northwind,88,West',
].join('\n');

// 1) Wizard intro + Mira greeting
await page.goto(B + '/migrate', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
const greet = await page.locator('.ms-msg--mira').count();
await page.screenshot({ path: 'tmp/shots/mig-1-intro.png' });

// 2) Upload a CSV with unmapped columns (Lead Score, Region) -> custom fields
await page.setInputFiles('input[type=file]', { name: 'contacts.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
await page.waitForTimeout(1500);
const customCard = await page.locator('[data-mw="custom"]').count();
const customRows = await page.locator('.mw-custom').count();
const miraReview = await page.locator('.ms-msg--mira').count();
await page.screenshot({ path: 'tmp/shots/mig-2-review.png', fullPage: true });

// 3) Keep custom fields via Mira action, then preview + push
const keepBtn = page.locator('.ms-act--primary', { hasText: /custom field/i }).first();
if (await keepBtn.count()) await keepBtn.click().catch(() => {});
await page.waitForTimeout(400);
await page.locator('button', { hasText: 'Preview clean data' }).first().click().catch(() => {});
await page.waitForTimeout(800);
const stagedTbl = await page.locator('.mw-table').count();
await page.screenshot({ path: 'tmp/shots/mig-3-preview.png' });
await page.locator('button', { hasText: /Push \d+ to production/ }).first().click().catch(() => {});
await page.waitForTimeout(900);
const complete = await page.locator('h2', { hasText: 'Migration complete' }).count();
await page.screenshot({ path: 'tmp/shots/mig-4-complete.png' });

// 4) Guided session room
await page.goto(B + '/migrate', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(600);
await page.locator('button', { hasText: 'Run a guided session' }).first().click().catch(() => {});
await page.waitForTimeout(1500);
const url = page.url();
const inRoom = /\/migrate\/session\//.test(url);
const presenter = await page.getByText(/Mira/).count();
await page.screenshot({ path: 'tmp/shots/mig-5-room.png', fullPage: true });
// host start
await page.locator('button', { hasText: /Start session/i }).first().click().catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: 'tmp/shots/mig-6-room-live.png' });

console.log(JSON.stringify({ greet, miraReview, customCard, customRows, stagedTbl, complete, inRoom, presenter, errors: errors.length }, null, 2));
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 8).join('\n')); }
console.log(errors.length ? 'HAS ERRORS' : 'CLEAN');
await browser.close();
