import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function swap(file, pairs) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log('updated', file);
  } else {
    console.log('noop', file);
  }
}

// Product chrome -> teal. Keep intentional Rook/AI violet where class names say rook.
const productPairs = [
  ['#5b4bf5', '#0e9f8f'],
  ['#4a3ce0', '#0b8578'],
  ['#6d5cf7', '#14b8a6'],
  ['#a855f7', '#7c5cf7'], // secondary: prefer AI violet over old magenta
  ['rgba(91,75,245,', 'rgba(14,159,143,'],
  ['rgba(168,85,247,', 'rgba(20,184,166,'],
  ['#0e9f9a', '#0e9f8f'],
];

// Demo chrome mark should stay teal (product). Rook sidebar stays violet - restore after.
swap('src/marketing/demo.css', productPairs);
swap('src/marketing/viz2/viz2.css', productPairs);
swap('src/marketing/InteractiveDemo.jsx', productPairs);
swap('src/marketing/DemoPage.jsx', [
  ["color: '#5b4bf5'", "color: '#0e9f8f'"],
  ["c: '#5b4bf5'", "c: '#0e9f8f'"],
  ["c: '#a855f7'", "c: '#7c5cf7'"],
  ["color: '#a855f7'", "color: '#0e9f8f'"],
  ["'#5b4bf5', 'Champion'", "'#0e9f8f', 'Champion'"],
  ["'#a855f7', 'Technical'", "'#7c5cf7', 'Technical'"],
  ["rgba(91,75,245,", "rgba(14,159,143,"],
  ['stopColor="#5b4bf5"', 'stopColor="#0e9f8f"'],
  ['stopColor="#a855f7"', 'stopColor="#14b8a6"'],
  ['stopColor="#0e9f9a"', 'stopColor="#7c5cf7"'],
  ['stopColor="rgba(91,75,245,.18)"', 'stopColor="rgba(14,159,143,.18)"'],
  ['stopColor="rgba(91,75,245,0)"', 'stopColor="rgba(14,159,143,0)"'],
]);

// Restore Rook-specific violet chrome in demo.css after blanket swap
let demo = fs.readFileSync(path.join(root, 'src/marketing/demo.css'), 'utf8');
demo = demo
  .replace(
    '.dmo-side-rook { display: flex; align-items: center; gap: 10px; padding: 10px 11px; border-radius: 11px; font-size: 13.5px; font-weight: 700; color: #fff; background: linear-gradient(120deg, #0e9f8f, #7c5cf7); box-shadow: 0 10px 22px -10px rgba(14,159,143,.6);',
    '.dmo-side-rook { display: flex; align-items: center; gap: 10px; padding: 10px 11px; border-radius: 11px; font-size: 13.5px; font-weight: 700; color: #fff; background: linear-gradient(120deg, #7c5cf7, #6647e0); box-shadow: 0 10px 22px -10px rgba(124,92,247,.6);'
  )
  .replace(
    '.dmo-side-rook.is-active { box-shadow: 0 14px 30px -10px rgba(14,159,143,.75);',
    '.dmo-side-rook.is-active { box-shadow: 0 14px 30px -10px rgba(124,92,247,.75);'
  );
fs.writeFileSync(path.join(root, 'src/marketing/demo.css'), demo);

console.log('demo accents done');
