import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('tmp/shots', { recursive: true });
const B = process.env.SHOOT_BASE || 'http://localhost:5273';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rally_access', 'granted'); sessionStorage.setItem('rally_launched', '1'); } catch {} });
const page = await ctx.newPage();
const routes = [
  ['agent-studio', '/agent-studio'], ['context', '/context'], ['agent-evals', '/agent-evals'],
  ['agent-trust', '/agent-trust'], ['agent-exchange', '/agent-exchange'], ['experience', '/experience'],
  ['agent-api', '/agent-api'], ['vs-agentforce', '/vs-agentforce'],
];
let failures = 0;
for (const [name, path] of routes) {
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  const onc = m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); };
  page.on('console', onc);
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1600);
  const crash = await page.getByText('Something went sideways').count();
  await page.screenshot({ path: 'tmp/shots/fleet-' + name + '.png' });
  const rel = errs.filter(e => !/CSP|upgrade-insecure|favicon|manifest|Download the React|404|realtime/i.test(e));
  if (crash || rel.length) failures++;
  console.log(name.padEnd(15), 'crash=' + crash, 'errors=' + rel.length, rel.slice(0, 2).join(' | '));
  page.off('console', onc);
}
console.log(failures === 0 ? 'ALL CLEAN' : `FAILURES: ${failures}`);
await browser.close();
