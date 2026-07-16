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

// Product chrome defaults: teal. Keep --m-accent token usage; rewrite hardcoded purple fallbacks.
const pairs = [
  ['#5b4bf5', '#0e9f8f'],
  ['#a855f7', '#14b8a6'],
  ['#0e9f9a', '#0e9f8f'],
  ['rgba(91,75,245,', 'rgba(14,159,143,'],
  ['rgba(168,85,247,', 'rgba(20,184,166,'],
  ['linear-gradient(100deg,#0e9f8f,#14b8a6 46%,#0e9f8f)', 'linear-gradient(100deg,#0e9f8f,#14b8a6 46%,#7c5cf7)'],
];

patch('src/marketing/Juggernaut.jsx', pairs);
patch('src/marketing/GuidesHub.jsx', [
  ['rgba(91,75,245,.1)', 'rgba(14,159,143,.1)'],
]);
patch('src/marketing/BookMeeting.jsx', [
  ["accentSoft: 'rgba(91,75,245,.14)'", "accentSoft: 'rgba(14,159,143,.14)'"],
  ["const AV = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];",
   "const AV = ['#0e9f8f', '#14b8a6', '#e0752d', '#c0392b', '#2563a8', '#7c5cf7', '#1a7f52', '#d4a017'];"],
  ["type?.color || '#5b4bf5'", "type?.color || '#0e9f8f'"],
  ['#4a3ce0', '#0b8578'],
  ["boxShadow: primary ? '0 8px 24px rgba(91,75,245,.32)' : 'none'",
   "boxShadow: primary ? '0 8px 24px rgba(14,159,143,.32)' : 'none'"],
]);
patch('src/marketing/HostedForm.jsx', [
  ["style.accent || '#5b4bf5'", "style.accent || '#0e9f8f'"],
]);
patch('src/marketing/HostedLanding.jsx', [
  ["const ACCENT = '#5b4bf5';", "const ACCENT = '#0e9f8f';"],
]);
patch('src/marketing/help/HelpArticle.jsx', [
  ['linear-gradient(135deg,#5b4bf5,#7c5cf7)', 'linear-gradient(135deg,#0e9f8f,#14b8a6)'],
  ['rgba(91,75,245,.6)', 'rgba(14,159,143,.55)'],
  ['rgba(91,75,245,.07)', 'rgba(14,159,143,.08)'],
  ['rgba(91,75,245,.2)', 'rgba(14,159,143,.2)'],
]);
patch('src/marketing/StatusPage.jsx', [
  ["checking:    { color: '#5b4bf5', bg: 'rgba(91,75,245,.12)',  label: 'Checking...', icon: 'clock' },",
   "checking:    { color: '#0e9f8f', bg: 'rgba(14,159,143,.12)',  label: 'Checking...', icon: 'clock' },"],
]);
patch('src/marketing/company.css', [
  ['rgba(91,75,245,.1)', 'rgba(14,159,143,.1)'],
]);

console.log('done');
