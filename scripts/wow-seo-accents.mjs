import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patch(rel, pairs) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const [a, b] of pairs) {
    const c = s.split(a).length - 1;
    if (c) { s = s.split(a).join(b); n += c; }
  }
  fs.writeFileSync(p, s);
  console.log(rel, n, 'replacements');
}

// Product chrome -> teal. Rook mark stays violet via a restore pass after.
const teal = [
  ['#5b4bf5', '#0e9f8f'],
  ['#6d5cf7', '#0e9f8f'],
  ['#4a3ce0', '#0b8578'],
  ['#a855f7', '#14b8a6'],
  ['#0e9f9a', '#0e9f8f'],
  ['rgba(91,75,245,', 'rgba(14,159,143,'],
  ['rgba(168,85,247,', 'rgba(20,184,166,'],
];

patch('src/marketing/seo/seo-visuals.css', teal);
patch('src/marketing/seo/SeoVisual.jsx', teal);
patch('src/marketing/seo/components.jsx', teal);

// Restore Rook-only violet chrome (AI lane).
patch('src/marketing/seo/seo-visuals.css', [
  [
    '.mkt .sv-rook-mark { width: 40px; height: 40px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #0e9f8f, #0b8578); box-shadow: 0 8px 18px -6px rgba(14,159,143,.6); animation: svkFloat 6s ease-in-out infinite; }',
    '.mkt .sv-rook-mark { width: 40px; height: 40px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #7c5cf7, #5b4bf5); box-shadow: 0 8px 18px -6px rgba(124,92,247,.55); animation: svkFloat 6s ease-in-out infinite; }',
  ],
  [
    '.mkt .sv-demo-chip { margin-left: auto; font-size: 9.5px; font-weight: 800; color: var(--m-accent); background: rgba(14,159,143,.1); padding: 3px 8px; border-radius: 999px; flex: none; }',
    '.mkt .sv-demo-chip { margin-left: auto; font-size: 9.5px; font-weight: 800; color: #7c5cf7; background: rgba(124,92,247,.12); padding: 3px 8px; border-radius: 999px; flex: none; }',
  ],
]);

console.log('done');
