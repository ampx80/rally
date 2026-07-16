import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'marketing', 'marketing.css');
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  ['rgba(91,75,245,.35)', 'rgba(14,159,143,.35)'],
  ['rgba(91,75,245,.45)', 'rgba(14,159,143,.40)'],
  ['rgba(91,75,245,.12)', 'rgba(14,159,143,.12)'],
  ['rgba(91,75,245,.16)', 'rgba(14,159,143,.16)'],
  ['rgba(91,75,245,.5)', 'rgba(14,159,143,.45)'],
  ['rgba(91,75,245,.4)', 'rgba(14,159,143,.35)'],
  ['rgba(91,75,245,.1)', 'rgba(14,159,143,.10)'],
  ['rgba(91,75,245,.08)', 'rgba(14,159,143,.08)'],
  ['rgba(91,75,245,.2)', 'rgba(14,159,143,.20)'],
  ['rgba(91,75,245,.14)', 'rgba(14,159,143,.14)'],
  ['rgba(91,75,245,.22)', 'rgba(14,159,143,.22)'],
  ['rgba(91,75,245,.06)', 'rgba(14,159,143,.06)'],
  ['rgba(91,75,245,.03)', 'rgba(14,159,143,.03)'],
  ['rgba(168,85,247,.12)', 'rgba(20,184,166,.10)'],
  ['rgba(91,75,245,.16)', 'rgba(14,159,143,.16)'],
  ['#fbfaff', '#f7fbfa'],
];

for (const [a, b] of pairs) s = s.split(a).join(b);

// Keep Rook stage icon violet (AI). CTA band can stay violet as Rook brand moment.
// Product chrome (.mkt-card-glow, icons, nodes) already shifted via rgba pairs above.

fs.writeFileSync(p, s);
console.log('marketing accents cleaned', !s.includes('rgba(91,75,245'));
