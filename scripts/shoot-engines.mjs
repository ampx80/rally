import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5344';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const clean = (errs) => errs.filter(e => !/CSP|Content Security Policy|upgrade-insecure|favicon|manifest|Download the React|404|realtime|speech|Stripe|resend|not configured/i.test(e));
let fail = 0;

const ROUTES = [
  ['forms', '/forms'], ['workflows', '/workflows'], ['flow', '/flow'],
  ['report-builder', '/report-builder'], ['reports', '/reports'], ['dashboards', '/dashboards'],
  ['payments', '/payments'], ['invoices', '/invoices'], ['products', '/products'],
  ['lists', '/lists'], ['automations', '/automations'], ['sequences', '/sequences'],
  ['markethub', '/markethub'], ['campaigns', '/campaigns'],
  ['landing-pages', '/landing-pages'], ['funnels', '/funnels'], ['journeys', '/journeys'], ['attribution', '/attribution'],
];

for (const [name, path] of ROUTES) {
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  try {
    await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1300);
  } catch (e) { errs.push('NAV ' + e.message); }
  const crash = await page.getByText('Something went sideways').count();
  const rel = clean(errs);
  if (crash || rel.length) fail++;
  console.log(name.padEnd(16), 'crash=' + crash, 'errors=' + rel.length, rel.slice(0, 2).join(' | '));
  page.off('pageerror', onerr); page.off('console', oncon);
}

// public hosted form (marketing shell, no gate)
{
  const errs = [];
  const onerr = e => errs.push('PAGEERR ' + e.message);
  const oncon = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('pageerror', onerr); page.on('console', oncon);
  try { await page.goto(B + '/forms', { waitUntil: 'networkidle', timeout: 30000 }); } catch {}
  page.off('pageerror', onerr); page.off('console', oncon);
}

await page.screenshot({ path: 'tmp/shots/engines-last.png' });
console.log(fail === 0 ? 'ALL CLEAN' : 'FAILURES ' + fail);
await browser.close();
