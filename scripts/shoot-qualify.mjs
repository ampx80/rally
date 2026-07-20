import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const clean = () => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|prequalify|Failed to load resource/i.test(e));
let fail = 0;

async function setSlider(v) {
  await page.evaluate((val) => {
    const el = document.querySelector('.qz-slider');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(200);
}
async function fillRequired() {
  await page.locator('.qz-opt', { hasText: 'Salesforce' }).first().click();
  await page.locator('.qz-opt', { hasText: '21-50' }).first().click();
  await page.locator('.qz-ta').fill('Every change breaks 20 things and admins hold us hostage.');
  await page.locator('input.qz-in').first().fill('Nate Richard');
  await page.getByPlaceholder('you@company.com').fill('nate@acmerobotics.com');
}

// HOT path
await page.goto(B + '/get-started', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(700);
await setSlider(9);
const label9 = await page.locator('.qz-slider-label').innerText().catch(() => '');
await fillRequired();
await page.locator('.qz-submit').click();
await page.waitForTimeout(1500);
const hotHead = await page.getByText(/exactly who we built this for/i).count();
const bookFrame = await page.locator('.qz-book-frame').count();
console.log('hot'.padEnd(12), `sliderLabel="${label9}" hotScreen=${hotHead} bookingWidget=${bookFrame}`);
if (!hotHead || !bookFrame) fail++;
await page.screenshot({ path: 'tmp/shots/qualify-hot.png', fullPage: true });

// WAITLIST path
await page.goto(B + '/get-started', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(500);
await setSlider(2);
const label2 = await page.locator('.qz-slider-label').innerText().catch(() => '');
await fillRequired();
await page.locator('.qz-submit').click();
await page.waitForTimeout(1200);
const waitHead = await page.getByText(/Thanks for the curiosity/i).count();
console.log('waitlist'.padEnd(12), `sliderLabel="${label2}" waitlistScreen=${waitHead}`);
if (!waitHead) fail++;

// ADMIN pipeline
await page.goto(B + '/qualify', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1000);
const crash = await page.getByText('Something went sideways').count();
const leadCards = await page.locator('.card').count();
console.log('admin'.padEnd(12), `crash=${crash} cards=${leadCards}`);
if (crash) fail++;

const rel = clean();
console.log('errors'.padEnd(12), rel.length, rel.slice(0, 3).join(' | '));
if (rel.length) fail++;
console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
