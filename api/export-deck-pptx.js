// Generate a real QBR deck (.pptx) from an account's live data. The client
// posts a compact company payload (built from the store); this assembles a
// branded PowerPoint and streams it back for download. Deterministic - built
// from data, not guessed.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';
import PptxGenJS from 'pptxgenjs';

export const config = { maxDuration: 30 };

const INDIGO = '5B4BF5';
const INK = '0E1116';
const SLATE = '3A4150';
const PAGE = 'F6F7F9';
const LINE = 'E7E9EE';

const money = (n) => {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};
const dateStr = (d) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '-'; } };

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = readJsonBody(req);
  const co = body.company || {};
  const name = co.name || 'Account';
  const deals = Array.isArray(co.deals) ? co.deals : [];
  const contacts = Array.isArray(co.contacts) ? co.contacts : [];
  const openDeals = deals.filter(d => d.status === 'open');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'RALLY', width: 13.333, height: 7.5 });
  pptx.layout = 'RALLY';
  pptx.author = 'Rally';
  pptx.company = 'Rally';
  pptx.title = `${name} - Quarterly Business Review`;

  // --- Slide 1: title ---
  const s1 = pptx.addSlide();
  s1.background = { color: INK };
  s1.addText('RALLY', { x: 0.6, y: 0.5, w: 4, h: 0.4, color: INDIGO, fontSize: 14, bold: true, charSpacing: 3 });
  s1.addText('Quarterly Business Review', { x: 0.6, y: 2.4, w: 12, h: 0.6, color: 'A99FF9', fontSize: 22, bold: true });
  s1.addText(name, { x: 0.6, y: 3.0, w: 12, h: 1.4, color: 'FFFFFF', fontSize: 54, bold: true });
  const meta = [co.industry, co.size ? co.size + ' employees' : null, co.location].filter(Boolean).join('   |   ');
  s1.addText(meta, { x: 0.62, y: 4.5, w: 12, h: 0.5, color: 'C7CBD6', fontSize: 16 });
  s1.addText(`Prepared ${dateStr(Date.now())}${co.owner ? '  by ' + co.owner : ''}`, { x: 0.62, y: 6.6, w: 12, h: 0.4, color: '8B93A4', fontSize: 12 });

  // --- Slide 2: account snapshot (KPIs) ---
  const s2 = pptx.addSlide();
  s2.background = { color: PAGE };
  s2.addText('Account snapshot', { x: 0.6, y: 0.5, w: 12, h: 0.6, color: INK, fontSize: 26, bold: true });
  const kpis = [
    { label: 'OPEN PIPELINE', value: money(co.openPipeline || openDeals.reduce((a, d) => a + (d.value || 0), 0)) },
    { label: 'OPEN DEALS', value: String(openDeals.length) },
    { label: 'CLOSED WON', value: money(co.won || deals.filter(d => d.status === 'won').reduce((a, d) => a + (d.value || 0), 0)) },
    { label: 'CONTACTS', value: String(contacts.length) },
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.05;
    s2.addShape(pptx.ShapeType.roundRect, { x, y: 1.5, w: 2.8, h: 2.0, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 }, rectRadius: 0.1 });
    s2.addText(k.value, { x, y: 1.9, w: 2.8, h: 0.9, color: INK, fontSize: 34, bold: true, align: 'center' });
    s2.addText(k.label, { x, y: 2.8, w: 2.8, h: 0.4, color: SLATE, fontSize: 12, bold: true, align: 'center', charSpacing: 1 });
  });
  const healthColor = co.health === 'red' ? 'C0392B' : co.health === 'yellow' ? 'B3721A' : '1A7F52';
  s2.addText([{ text: 'Account health: ', options: { color: SLATE } }, { text: (co.health || 'green').toUpperCase(), options: { color: healthColor, bold: true } }], { x: 0.6, y: 3.9, w: 8, h: 0.5, fontSize: 16 });

  // --- Slide 3: opportunities table ---
  const s3 = pptx.addSlide();
  s3.background = { color: PAGE };
  s3.addText('Opportunities', { x: 0.6, y: 0.5, w: 12, h: 0.6, color: INK, fontSize: 26, bold: true });
  const rows = [[
    { text: 'Deal', options: { bold: true, color: 'FFFFFF', fill: { color: INDIGO } } },
    { text: 'Value', options: { bold: true, color: 'FFFFFF', fill: { color: INDIGO }, align: 'right' } },
    { text: 'Stage', options: { bold: true, color: 'FFFFFF', fill: { color: INDIGO } } },
    { text: 'Close', options: { bold: true, color: 'FFFFFF', fill: { color: INDIGO } } },
  ]];
  const shown = deals.slice(0, 10);
  if (shown.length === 0) rows.push([{ text: 'No opportunities on this account yet.', options: { colspan: 4, color: SLATE, italic: true } }]);
  shown.forEach(d => rows.push([
    { text: d.name || '-', options: { color: INK } },
    { text: money(d.value), options: { color: INK, align: 'right', bold: true } },
    { text: d.stage || '-', options: { color: SLATE } },
    { text: dateStr(d.closeDate), options: { color: SLATE } },
  ]));
  s3.addTable(rows, { x: 0.6, y: 1.4, w: 12.1, colW: [6.1, 2.0, 2.5, 1.5], border: { type: 'solid', color: LINE, pt: 1 }, fontSize: 13, rowH: 0.42, valign: 'middle' });

  // --- Slide 4: buying committee ---
  const s4 = pptx.addSlide();
  s4.background = { color: PAGE };
  s4.addText('Buying committee', { x: 0.6, y: 0.5, w: 12, h: 0.6, color: INK, fontSize: 26, bold: true });
  if (contacts.length === 0) {
    s4.addText('No contacts mapped yet. Add the economic buyer, champion, and technical evaluator.', { x: 0.6, y: 1.5, w: 11, h: 0.6, color: SLATE, fontSize: 15, italic: true });
  } else {
    contacts.slice(0, 8).forEach((c, i) => {
      const col = i % 2, rowi = Math.floor(i / 2);
      const x = 0.6 + col * 6.1, y = 1.5 + rowi * 1.15;
      s4.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.8, h: 1.0, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 }, rectRadius: 0.08 });
      s4.addText(c.name || '-', { x: x + 0.25, y: y + 0.14, w: 5.3, h: 0.4, color: INK, fontSize: 16, bold: true });
      s4.addText([{ text: c.title || '', options: { color: INDIGO, bold: true } }, { text: c.email ? '   ' + c.email : '', options: { color: SLATE } }], { x: x + 0.25, y: y + 0.55, w: 5.3, h: 0.35, fontSize: 12 });
    });
  }

  // --- Slide 5: next steps ---
  const s5 = pptx.addSlide();
  s5.background = { color: INK };
  s5.addText('Recommended next steps', { x: 0.6, y: 0.6, w: 12, h: 0.6, color: 'FFFFFF', fontSize: 26, bold: true });
  const topDeal = openDeals.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  const steps = [
    topDeal ? `Advance ${topDeal.name} (${money(topDeal.value)}) - confirm the path to a signed agreement.` : 'Open a new opportunity to build pipeline on this account.',
    contacts.length < 3 ? 'Map the full buying committee (economic buyer, champion, technical evaluator).' : 'Confirm the champion and align the economic buyer on value.',
    'Schedule the executive review and lock a mutual close plan with dates.',
    'Document success criteria and the business case for renewal and expansion.',
  ];
  steps.forEach((t, i) => {
    s5.addText(String(i + 1), { x: 0.7, y: 1.7 + i * 1.05, w: 0.6, h: 0.6, color: INK, fill: { color: INDIGO }, fontSize: 20, bold: true, align: 'center', valign: 'middle' });
    s5.addText(t, { x: 1.5, y: 1.7 + i * 1.05, w: 11, h: 0.7, color: 'E6E9F0', fontSize: 16, valign: 'middle' });
  });
  s5.addText('Generated by Rally - run your revenue on Rally.', { x: 0.6, y: 6.9, w: 12, h: 0.4, color: '8B93A4', fontSize: 11 });

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^a-z0-9]+/gi, '-')}-QBR.pptx"`);
  return res.status(200).send(buf);
});
