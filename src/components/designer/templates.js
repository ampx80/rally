// designer/templates.js
// Ready-made, fully-editable starting layouts. Picking a template REPLACES the
// canvas with that layout, prefilled from an optional `vars` object. Every
// element it drops is a normal editable element (drag, restyle, delete).
//
// GENERIC: no product-specific parsing. Pass a plain `vars` object for text
// substitution:
//   { eyebrow, title, subtitle, body, date, time, location, cta, url }
// Every field is optional and falls back to a tasteful placeholder.
//
// ASCII hyphen only anywhere in this file.

import { makeText, makeRect, makeLine, deDash } from './model';
import { paletteForTheme } from './backgrounds';

const W = 1080;
const cx = (w, canvasW = W) => Math.round((canvasW - w) / 2);
const U = (s) => deDash(String(s || '')).toUpperCase();
const ACCENT = '#5b4bf5';

// Perceived luminance of a hex color, and a text color that reads on top of it.
function lum(hex) {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h || '000000', 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
const readableOn = (hex) => (lum(hex) > 150 ? '#0f172a' : '#f8fafc');

const joinLines = (arr) => arr.filter(Boolean).map(deDash).join('\n');

// Normalize an optional vars object into a full field set with placeholders.
function fields(vars) {
  const v = vars || {};
  return {
    eyebrow: deDash(v.eyebrow || ''),
    title: deDash(v.title || 'Your headline'),
    subtitle: deDash(v.subtitle || ''),
    body: deDash(v.body || ''),
    date: deDash(v.date || ''),
    time: deDash(v.time || ''),
    location: deDash(v.location || ''),
    cta: deDash(v.cta || 'Learn more'),
    url: deDash(v.url || 'yoursite.com'),
  };
}

/* -------------------------------------------------------------------------- */
/* Hand-tuned starter templates                                               */
/* -------------------------------------------------------------------------- */

function blank(d) {
  return {
    v: 3, canvas: 'portrait',
    background: { type: 'gradient', gradient: { angle: 120, from: '#1e293b', to: '#0f172a' } },
    elements: [
      makeText({ text: d.title, x: cx(860), y: 560, width: 860, fontFamily: 'Playfair Display', fontSize: 96, fill: '#f8fafc', fontWeight: 'bold', shadowEnabled: false }),
    ],
  };
}

function hero(d) {
  return {
    v: 3, canvas: 'portrait',
    background: { type: 'gradient', gradient: { angle: 135, from: '#5b4bf5', to: '#1e1b4b' } },
    elements: [
      d.eyebrow ? makeText({ text: U(d.eyebrow), x: cx(900), y: 180, width: 900, fontFamily: 'Montserrat', fontSize: 34, fill: '#c7d2fe', letterSpacing: 4, fontWeight: 'bold', shadowEnabled: false }) : null,
      makeText({ text: d.title, x: cx(920), y: 320, width: 920, fontFamily: 'Playfair Display', fontSize: 132, fill: '#ffffff', fontWeight: 'bold', lineHeight: 1.02, shadowEnabled: false }),
      d.subtitle ? makeText({ text: d.subtitle, x: cx(860), y: 640, width: 860, fontFamily: 'Montserrat', fontSize: 42, fill: '#e0e7ff', lineHeight: 1.4, shadowEnabled: false }) : null,
      d.body ? makeText({ text: d.body, x: cx(840), y: 780, width: 840, fontFamily: 'Montserrat', fontSize: 34, fill: '#c7d2fe', lineHeight: 1.5, shadowEnabled: false }) : null,
      makeRect({ x: cx(720), y: 1120, width: 720, height: 116, boxFill: '#ffffff', stroke: '#ffffff', strokeWidth: 0, cornerRadius: 58, shadowEnabled: false }),
      makeText({ text: joinLines([d.cta, d.url]), x: cx(720), y: 1146, width: 720, fontFamily: 'Montserrat', fontSize: 32, fill: '#3b2fd6', fontWeight: 'bold', lineHeight: 1.2, shadowEnabled: false }),
    ].filter(Boolean),
  };
}

function promo(d) {
  return {
    v: 3, canvas: 'portrait',
    background: { type: 'gradient', gradient: { angle: 135, from: '#0f172a', to: '#091528' } },
    elements: [
      makeText({ text: U(d.eyebrow || 'Limited time'), x: 90, y: 150, width: 900, align: 'left', fontFamily: 'Oswald', fontSize: 40, fill: ACCENT, letterSpacing: 3, fontWeight: 'bold', shadowEnabled: false }),
      makeText({
        text: U(d.title), x: 84, y: 290, width: 940, align: 'left', fontFamily: 'Bebas Neue', fontSize: 200, fill: '#0f172a',
        boxEnabled: true, boxFill: ACCENT, stroke: ACCENT, strokeWidth: 0, cornerRadius: 10, padding: 24,
        lineHeight: 0.95, shadowEnabled: true, shadowColor: '#000000', shadowBlur: 24, shadowOpacity: 0.4, shadowOffsetY: 10,
      }),
      d.body ? makeText({ text: d.body, x: 90, y: 720, width: 900, align: 'left', fontFamily: 'Montserrat', fontSize: 44, fill: '#ffffff', fontWeight: 'bold', lineHeight: 1.4, shadowEnabled: false }) : null,
      d.subtitle ? makeText({ text: d.subtitle, x: 90, y: 900, width: 900, align: 'left', fontFamily: 'Montserrat', fontSize: 36, fill: '#c7d2e8', lineHeight: 1.4, shadowEnabled: false }) : null,
      makeRect({ x: 90, y: 1120, width: 760, height: 120, boxFill: ACCENT, stroke: ACCENT, strokeWidth: 0, cornerRadius: 60, shadowEnabled: false }),
      makeText({ text: U(d.cta + '  ' + d.url), x: 90, y: 1152, width: 760, align: 'center', fontFamily: 'Oswald', fontSize: 34, fill: '#ffffff', fontWeight: 'bold', letterSpacing: 1, shadowEnabled: false }),
    ].filter(Boolean),
  };
}

function event(d) {
  return {
    v: 3, canvas: 'portrait',
    background: { type: 'solid', color: '#F6F0E2' },
    elements: [
      makeRect({ x: 60, y: 60, width: 960, height: 1230, boxFill: 'rgba(0,0,0,0)', stroke: '#0f172a', strokeWidth: 2, cornerRadius: 6, shadowEnabled: false }),
      makeRect({ x: 78, y: 78, width: 924, height: 1194, boxFill: 'rgba(0,0,0,0)', stroke: ACCENT, strokeWidth: 1, cornerRadius: 4, shadowEnabled: false }),
      makeText({ text: U(d.eyebrow || 'You are invited'), x: cx(760), y: 190, width: 760, fontFamily: 'Cinzel', fontSize: 30, fill: ACCENT, letterSpacing: 8, fontWeight: 'bold', shadowEnabled: false }),
      makeText({ text: d.title, x: cx(860), y: 320, width: 860, fontFamily: 'Playfair Display', fontSize: 112, fill: '#0f172a', fontWeight: 'bold', lineHeight: 1.05, shadowEnabled: false }),
      d.subtitle ? makeText({ text: d.subtitle, x: cx(820), y: 560, width: 820, fontFamily: 'EB Garamond', fontSize: 46, italic: true, fill: '#3a3226', lineHeight: 1.3, shadowEnabled: false }) : null,
      makeLine({ x: cx(300), y: 680, width: 300, stroke: ACCENT, strokeWidth: 2 }),
      makeText({ text: joinLines([d.date, d.time, d.location]), x: cx(820), y: 730, width: 820, fontFamily: 'EB Garamond', fontSize: 42, fill: '#3a3226', lineHeight: 1.5, shadowEnabled: false }),
      makeText({ text: joinLines([d.cta, d.url]), x: cx(760), y: 1090, width: 760, fontFamily: 'EB Garamond', fontSize: 38, fill: ACCENT, lineHeight: 1.4, fontWeight: 'bold', shadowEnabled: false }),
    ].filter(Boolean),
  };
}

/* -------------------------------------------------------------------------- */
/* Generated gallery: layout recipes x styled backgrounds x font pairings      */
/* -------------------------------------------------------------------------- */
// Each recipe is a full portrait layout that reads its colors + fonts from a
// resolved STYLE. Combined with a curated set of theme backgrounds + font
// pairings this produces a varied, tasteful gallery. Every template is still a
// normal editable document (drag, restyle, delete) and is prefilled from `vars`.

function styleFromTheme(themeKey, fonts) {
  const pal = paletteForTheme(themeKey) || { dark: true, from: '#1e293b', to: '#0f172a', accent: ACCENT, accent2: '#8b7cff' };
  const dark = pal.dark;
  return {
    bg: { type: 'theme', key: themeKey, opacity: 1, tint: { color: '#000000', alpha: 0 } },
    dark,
    ink: dark ? '#f8fafc' : '#12233f',
    sub: dark ? '#d8e0ee' : '#4a4335',
    accent: pal.accent,
    accent2: pal.accent2 || pal.accent,
    ...fonts,
  };
}

const doc = (s, elements) => ({ v: 3, canvas: 'portrait', background: s.bg, elements: elements.filter(Boolean) });

function rFrame(d, s) {
  return doc(s, [
    makeRect({ x: 46, y: 46, width: 988, height: 1258, boxFill: 'rgba(0,0,0,0)', stroke: s.accent, strokeWidth: 2, cornerRadius: 20, shadowEnabled: false }),
    makeRect({ x: 64, y: 64, width: 952, height: 1222, boxFill: 'rgba(0,0,0,0)', stroke: s.accent, strokeWidth: 1, cornerRadius: 16, shadowEnabled: false }),
    d.eyebrow ? makeText({ text: U(d.eyebrow), x: cx(860), y: 150, width: 860, fontFamily: s.body, fontSize: 32, fill: s.accent, letterSpacing: 5, fontWeight: 'bold', shadowEnabled: false }) : null,
    makeText({ text: d.title, x: cx(860), y: 300, width: 860, fontFamily: s.heading, fontSize: 118, fill: s.ink, fontWeight: 'bold', shadowEnabled: false }),
    d.subtitle ? makeText({ text: d.subtitle, x: cx(820), y: 560, width: 820, fontFamily: s.script, fontSize: 56, italic: true, fill: s.accent, shadowEnabled: false }) : null,
    makeLine({ x: cx(360), y: 660, width: 360, stroke: s.accent, strokeWidth: 2 }),
    makeText({ text: joinLines([d.date, d.time, d.location, d.body]), x: cx(860), y: 710, width: 860, fontFamily: s.body, fontSize: 40, fill: s.ink, lineHeight: 1.5, shadowEnabled: false }),
    makeText({ text: U(d.cta), x: cx(760), y: 1090, width: 760, fontFamily: s.body, fontSize: 28, fill: s.accent, letterSpacing: 3, fontWeight: 'bold', shadowEnabled: false }),
    makeText({ text: d.url, x: cx(860), y: 1150, width: 860, fontFamily: s.body, fontSize: 34, fill: s.ink, fontWeight: 'bold', shadowEnabled: false }),
  ]);
}

function rModern(d, s) {
  const pill = readableOn(s.accent);
  return doc(s, [
    d.eyebrow ? makeText({ text: U(d.eyebrow), x: 90, y: 150, width: 900, align: 'left', fontFamily: s.body, fontSize: 34, fill: s.accent, letterSpacing: 3, fontWeight: 'bold', shadowEnabled: false }) : null,
    makeText({ text: U(d.title), x: 84, y: 280, width: 930, align: 'left', fontFamily: s.heading, fontSize: 150, fill: s.ink, fontWeight: 'bold', lineHeight: 0.98, shadowEnabled: false }),
    makeLine({ x: 96, y: 650, width: 360, stroke: s.accent, strokeWidth: 4 }),
    makeText({ text: joinLines([d.subtitle, d.date, d.time, d.location, d.body]), x: 90, y: 710, width: 900, align: 'left', fontFamily: s.body, fontSize: 40, fill: s.ink, lineHeight: 1.5, shadowEnabled: false }),
    makeRect({ x: 90, y: 1120, width: 760, height: 104, boxFill: s.accent, stroke: s.accent, strokeWidth: 0, cornerRadius: 52, shadowEnabled: false }),
    makeText({ text: U(d.cta + '  ' + d.url), x: 90, y: 1150, width: 760, align: 'center', fontFamily: s.body, fontSize: 30, fill: pill, fontWeight: 'bold', letterSpacing: 1, shadowEnabled: false }),
  ]);
}

function rMinimal(d, s) {
  return doc(s, [
    d.eyebrow ? makeText({ text: U(d.eyebrow), x: cx(860), y: 240, width: 860, fontFamily: s.body, fontSize: 28, fill: s.accent, letterSpacing: 6, fontWeight: 'bold', shadowEnabled: false }) : null,
    makeText({ text: d.title, x: cx(880), y: 460, width: 880, fontFamily: s.heading, fontSize: 104, fill: s.ink, shadowEnabled: false }),
    makeLine({ x: cx(200), y: 700, width: 200, stroke: s.accent, strokeWidth: 2 }),
    makeText({ text: joinLines([d.subtitle, d.date, d.time, d.location, d.body]), x: cx(820), y: 770, width: 820, fontFamily: s.body, fontSize: 36, fill: s.sub, lineHeight: 1.55, shadowEnabled: false }),
    makeText({ text: d.url, x: cx(820), y: 1120, width: 820, fontFamily: s.body, fontSize: 30, fill: s.accent, fontWeight: 'bold', letterSpacing: 1, shadowEnabled: false }),
  ]);
}

function rScript(d, s) {
  return doc(s, [
    d.eyebrow ? makeText({ text: d.eyebrow, x: cx(820), y: 170, width: 820, fontFamily: s.body, fontSize: 36, fill: s.accent, letterSpacing: 2, shadowEnabled: false }) : null,
    makeText({ text: d.title, x: cx(940), y: 280, width: 940, fontFamily: s.script, fontSize: 152, fill: s.ink, shadowEnabled: false }),
    makeLine({ x: cx(300), y: 570, width: 300, stroke: s.accent, strokeWidth: 2 }),
    d.subtitle ? makeText({ text: d.subtitle, x: cx(820), y: 610, width: 820, fontFamily: s.body, fontSize: 40, italic: true, fill: s.sub, shadowEnabled: false }) : null,
    makeText({ text: joinLines([d.date, d.time, d.location, d.body]), x: cx(820), y: 710, width: 820, fontFamily: s.body, fontSize: 40, fill: s.ink, lineHeight: 1.5, shadowEnabled: false }),
    makeText({ text: joinLines([d.cta, d.url]), x: cx(760), y: 1090, width: 760, fontFamily: s.body, fontSize: 36, fill: s.accent, lineHeight: 1.4, fontWeight: 'bold', shadowEnabled: false }),
  ]);
}

const RECIPES = {
  frame: { label: 'Frame', build: rFrame },
  modern: { label: 'Modern', build: rModern },
  minimal: { label: 'Minimal', build: rMinimal },
  script: { label: 'Script', build: rScript },
};

// Curated font pairings (all families exist in fontCatalog.js).
const FS = {
  playfairMont: { heading: 'Playfair Display', body: 'Montserrat', script: 'Cormorant Garamond' },
  cinzelJosefin: { heading: 'Cinzel', body: 'Josefin Sans', script: 'Cormorant Garamond' },
  bodoniLora: { heading: 'Bodoni Moda', body: 'Lora', script: 'Cormorant Garamond' },
  marcellusEB: { heading: 'Marcellus', body: 'EB Garamond', script: 'Pinyon Script' },
  dmserifDmsans: { heading: 'DM Serif Display', body: 'DM Sans', script: 'Great Vibes' },
  bebasMont: { heading: 'Bebas Neue', body: 'Montserrat', script: 'Dancing Script' },
  antonInter: { heading: 'Anton', body: 'Inter', script: 'Bebas Neue' },
  cormorantscMont: { heading: 'Cormorant SC', body: 'Mulish', script: 'Allura' },
};

// Curated (background theme, mood category, font pairing, layouts) definitions.
const STYLES = [
  { theme: 'elegant-navyGold', cat: 'Elegant', fonts: FS.playfairMont, recipes: ['frame', 'minimal'] },
  { theme: 'elegant-burgundy', cat: 'Elegant', fonts: FS.bodoniLora, recipes: ['frame', 'minimal'] },
  { theme: 'elegant-emerald', cat: 'Elegant', fonts: FS.marcellusEB, recipes: ['frame', 'minimal'] },
  { theme: 'minimal-midnight', cat: 'Modern', fonts: FS.dmserifDmsans, recipes: ['modern', 'minimal'] },
  { theme: 'geometric-midnight', cat: 'Modern', fonts: FS.antonInter, recipes: ['modern', 'minimal'] },
  { theme: 'minimal-charcoal', cat: 'Minimal', fonts: FS.dmserifDmsans, recipes: ['minimal', 'modern'] },
  { theme: 'minimal-ivory', cat: 'Minimal', fonts: FS.marcellusEB, recipes: ['minimal', 'script'] },
  { theme: 'bold-navyGold', cat: 'Bold', fonts: FS.bebasMont, recipes: ['modern', 'minimal'] },
  { theme: 'bold-emerald', cat: 'Bold', fonts: FS.antonInter, recipes: ['modern'] },
  { theme: 'floral-blush', cat: 'Floral', fonts: FS.cormorantscMont, recipes: ['script', 'minimal'] },
  { theme: 'floral-sage', cat: 'Floral', fonts: FS.marcellusEB, recipes: ['script', 'minimal'] },
  { theme: 'artdeco-navyGold', cat: 'Art Deco', fonts: FS.cinzelJosefin, recipes: ['frame', 'minimal'] },
];

function buildGenerated() {
  const out = [];
  for (const st of STYLES) {
    const pal = paletteForTheme(st.theme);
    const palLabel = pal?.label || 'Theme';
    for (const rk of st.recipes) {
      const recipe = RECIPES[rk];
      if (!recipe) continue;
      const key = `gen-${st.theme}-${rk}`;
      const name = `${palLabel} ${recipe.label}`;
      const style = styleFromTheme(st.theme, st.fonts);
      out.push({ key, name, category: st.cat, build: (d) => recipe.build(d, style) });
    }
  }
  return out;
}

// The 4 hand-tuned starters (blank, hero, promo, event).
const ORIGINALS = [
  { key: 'blank', name: 'Blank', category: 'Basic', build: blank },
  { key: 'hero', name: 'Hero', category: 'Marketing', build: hero },
  { key: 'promo', name: 'Promo', category: 'Marketing', build: promo },
  { key: 'event', name: 'Event', category: 'Event', build: event },
];

export const TEMPLATES = [...ORIGINALS, ...buildGenerated()];

// Preferred category order for the gallery filter.
export const TEMPLATE_CATEGORIES = ['Basic', 'Marketing', 'Event', 'Elegant', 'Modern', 'Bold', 'Minimal', 'Floral', 'Art Deco'];

const TEMPLATE_BY_KEY = TEMPLATES.reduce((m, t) => { m[t.key] = t; return m; }, {});

// Build a template document by key, prefilled from an optional `vars` object.
export function buildTemplate(key, vars) {
  const t = TEMPLATE_BY_KEY[key] || TEMPLATES[0];
  return t.build(fields(vars));
}

// A sensible first-run demo document (Hero), prefilled from `vars`.
export function demoDoc(vars) {
  return hero(fields(vars));
}
