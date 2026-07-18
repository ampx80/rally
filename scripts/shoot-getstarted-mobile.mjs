import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:4318';
const browser = await chromium.launch();
// iPhone-ish viewport
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await page.goto(B + '/get-started', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(700);

// Fill the form like the friend did.
await page.fill('.gs-in[placeholder="Jordan Avery"]', 'Mike Ramsey');
await page.fill('.gs-in[placeholder="(555) 123 4567"]', '9183616733');
await page.fill('.gs-in[placeholder="you@company.com"]', 'ramsman68@gmail.com');
// answer required selects (pick a mid option in each question)
const groups = await page.locator('.gs-opts').count();
for (let i = 0; i < groups; i++) {
  const opts = page.locator('.gs-opts').nth(i).locator('.gs-opt');
  if (await opts.count()) await opts.nth(1).click();
}
await page.waitForTimeout(400);

// Overlap check: does the fit-signal meter box vertically overlap the form card?
const overlap = await page.evaluate(() => {
  const meter = document.querySelector('.gs-meter');
  const card = document.querySelector('.gs-card');
  if (!meter || !card) return { err: 'missing nodes' };
  const m = meter.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  // stacked layout: meter should sit fully above the form card (no vertical intersection)
  const vertOverlap = Math.max(0, Math.min(m.bottom, c.bottom) - Math.max(m.top, c.top));
  const asidePos = getComputedStyle(document.querySelector('.gs-aside')).position;
  return { vertOverlap: Math.round(vertOverlap), asidePos, meterBottom: Math.round(m.bottom), cardTop: Math.round(c.top) };
});

await page.screenshot({ path: 'tmp/shots/getstarted-mobile.png', fullPage: true });

// Now verify the booking link resolves (no "Booking link not found").
await page.goto(B + '/meet/intro-call', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(600);
const notFound = await page.locator('text=Booking link not found').count();
const hasPicker = await page.locator('text=Select a time').count();
await page.screenshot({ path: 'tmp/shots/getstarted-booking.png' });

const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
console.log(JSON.stringify({ overlap, bookingNotFound: notFound, bookingPicker: hasPicker, errors: rel.length, sample: rel.slice(0, 3) }));
await browser.close();
