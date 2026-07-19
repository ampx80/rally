import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1200 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
const clean = () => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech/i.test(e));
let fail = 0;

await page.goto(B + '/campaigns', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1000);

// open composer
await page.getByRole('button', { name: /New broadcast/i }).first().click();
await page.waitForTimeout(600);
await page.getByPlaceholder('Q4 product announcement').fill('Visual builder test');
await page.getByPlaceholder(/a quick idea for/i).fill('{firstName}, a fresh idea for {company}');

// switch to visual design
await page.getByRole('button', { name: 'Visual design' }).click();
await page.waitForTimeout(700);
const builder = await page.locator('.eb').count();
const blocks0 = await page.locator('.eb-block').count();
const srcdoc0 = await page.locator('.eb-frame').getAttribute('srcdoc');
const previewOk0 = !!srcdoc0 && /doctype/i.test(srcdoc0) && srcdoc0.length > 300;
console.log('open-visual'.padEnd(14), `builder=${builder} blocks=${blocks0} previewOk=${previewOk0} previewLen=${srcdoc0 ? srcdoc0.length : 0}`);
if (!builder || blocks0 < 1 || !previewOk0) fail++;

// add a Text block
await page.getByRole('button', { name: /Add block/i }).click();
await page.waitForTimeout(200);
await page.locator('.eb-menu button', { hasText: 'Text' }).first().click();
await page.waitForTimeout(300);
const blocks1 = await page.locator('.eb-block').count();
console.log('add-block'.padEnd(14), `blocks=${blocks1} (was ${blocks0})`);
if (blocks1 <= blocks0) fail++;

// edit the newly added block (already open after add): change text, confirm preview updates
await page.waitForTimeout(200);
const ta = page.locator('.eb-block.open textarea').first();
if (await ta.count()) { await ta.fill('UNIQUE_MARKER_XYZ content for {firstName}'); await page.waitForTimeout(300); }
const srcdoc1 = await page.locator('.eb-frame').getAttribute('srcdoc');
const reflected = !!srcdoc1 && srcdoc1.includes('UNIQUE_MARKER_XYZ');
console.log('edit-reflect'.padEnd(14), `markerInPreview=${reflected}`);
if (!reflected) fail++;

// apply a template
await page.getByRole('button', { name: /Templates/i }).click();
await page.waitForTimeout(200);
await page.locator('.eb-menu button', { hasText: 'Two-column update' }).first().click();
await page.waitForTimeout(400);
const hasCols = await page.locator('.eb-block', { hasText: 'Two columns' }).count();
console.log('template'.padEnd(14), `twoColBlockPresent=${hasCols > 0}`);
if (!hasCols) fail++;

// device toggle
await page.locator('.eb-device button').nth(1).click();
await page.waitForTimeout(200);
const mobile = await page.locator('.eb-frame-wrap.mobile').count();
console.log('device'.padEnd(14), `mobileFrame=${mobile}`);

await page.screenshot({ path: 'tmp/shots/email-builder.png', fullPage: true });
const rel = clean();
console.log('errors'.padEnd(14), rel.length, rel.slice(0, 3).join(' | '));
if (rel.length) fail++;
console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
