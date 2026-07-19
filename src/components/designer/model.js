// designer/model.js
// The structured document model for the WYSIWYG visual designer (v3).
//
// A document is a background plus an ordered array of positioned elements. Array
// order IS z-order (index 0 = back). Everything is stored in DESIGN pixel
// coordinates against the chosen canvas size, so it re-opens identically and
// exports crisply at any resolution.
//
// A text element is a real BOX (fill + border + corner radius + shadow) with the
// text laid INSIDE it. The fill belongs to the box, not to each line, which is
// exactly what a Word-style bordered, filled text box should be.
//
// ASCII hyphen only anywhere in this file. Neutral defaults; the brand accent is
// #5b4bf5 and neutral ink is #0f172a.

let _uid = 0;
export const newId = (t = 'el') => `${t}_${Date.now().toString(36)}${(_uid++).toString(36)}`;

export const clone = (o) => JSON.parse(JSON.stringify(o));

// ASCII-hyphen only. Strip em/en dashes anywhere text is authored or seeded.
export const deDash = (s) => String(s == null ? '' : s).replace(/[\u2014\u2013]/g, '-');

// Neutral brand-agnostic defaults.
const INK = '#0f172a';
const ACCENT = '#5b4bf5';
const LIGHT = '#f8fafc';

/* -------------------------------------------------------------------------- */
/* Canvas sizes                                                               */
/* -------------------------------------------------------------------------- */

export const CANVAS_PRESETS = {
  portrait:  { w: 1080, h: 1350, label: 'Portrait', sub: 'Flyer / post' },
  square:    { w: 1080, h: 1080, label: 'Square',   sub: 'Instagram' },
  landscape: { w: 1350, h: 1080, label: 'Landscape', sub: 'Wide' },
  print5x7:  { w: 1500, h: 2100, label: '5 x 7 card', sub: 'Print' },
};

/* -------------------------------------------------------------------------- */
/* Fonts (large curated Google Fonts library, grouped in fontCatalog.js)      */
/* -------------------------------------------------------------------------- */

// FONTS keeps its legacy [family, category] shape for older consumers; the full
// grouped/searchable catalog lives in fontCatalog.js.
import { FONT_CATALOG, FONT_NAMES as CATALOG_NAMES } from './fontCatalog';

export const FONTS = FONT_CATALOG.map((f) => [f.name, f.category]);
export const FONT_NAMES = CATALOG_NAMES;

/* -------------------------------------------------------------------------- */
/* Background presets                                                          */
/* -------------------------------------------------------------------------- */

const grad = (angle, from, to) => ({ type: 'gradient', gradient: { angle, from, to } });
const solid = (color) => ({ type: 'solid', color });

export const BG_PRESETS = [
  { key: 'indigo', label: 'Indigo', bg: grad(120, '#5b4bf5', '#1e1b4b') },
  { key: 'midnight', label: 'Midnight', bg: grad(120, '#1e293b', '#0f172a') },
  { key: 'royal', label: 'Royal', bg: grad(120, '#241a52', '#05040d') },
  { key: 'emerald', label: 'Emerald', bg: grad(120, '#0a3a2a', '#02100b') },
  { key: 'crimson', label: 'Crimson', bg: grad(120, '#4a0d16', '#12060a') },
  { key: 'ink', label: 'Ink', bg: solid('#0f172a') },
  { key: 'slate', label: 'Slate', bg: grad(120, '#293241', '#0b1220') },
  { key: 'cream', label: 'Cream', bg: solid('#F5EFE1') },
  { key: 'champagne', label: 'Champagne', bg: grad(120, '#fbf3de', '#e6cf9c') },
  { key: 'blush', label: 'Blush', bg: grad(120, '#fff1f5', '#f7d3e0') },
  { key: 'sand', label: 'Sand', bg: solid('#E7DCC4') },
  { key: 'paperwhite', label: 'Paper', bg: solid('#FBFAF6') },
];

/* -------------------------------------------------------------------------- */
/* Element factories                                                           */
/* -------------------------------------------------------------------------- */

export const DEFAULT_SHADOW = {
  shadowEnabled: false,
  shadowColor: '#0b1220',
  shadowBlur: 18,
  shadowOffsetX: 0,
  shadowOffsetY: 10,
  shadowOpacity: 0.35,
};

// Default per-element text gradient (disabled). When enabled it paints the text
// (all runs) with one box-wide linear gradient, overriding run fill colors.
export const DEFAULT_TEXT_GRADIENT = { enabled: false, from: '#5b4bf5', to: '#3b2fd6', angle: 90 };

// Default image filters (all neutral / off).
export const DEFAULT_IMAGE_FILTERS = { grayscale: 0, sepia: 0, brightness: 1, contrast: 1, blur: 0 };

export function makeText(over = {}) {
  const el = {
    id: newId('text'),
    type: 'text',
    x: 140, y: 200, width: 800, height: 140, rotation: 0, opacity: 1,
    // text = plain-text mirror of richText (kept in sync). richText is the
    // source of truth for per-word / per-character styling.
    text: 'Double-click to edit',
    fontFamily: 'Playfair Display',
    fontSize: 64,
    fill: LIGHT,
    align: 'center',
    fontWeight: 'normal',   // 'normal' | 'bold' (element default)
    italic: false,
    underline: false,
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 24,
    // Box: a single container behind ALL text (fill belongs to the box).
    boxEnabled: false,
    boxFill: INK,
    stroke: ACCENT,
    strokeWidth: 0,
    cornerRadius: 16,
    textGradient: { ...DEFAULT_TEXT_GRADIENT },
    curve: 0,               // text-on-arc amount (-100..100), 0 = straight
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
  if (!Array.isArray(el.richText) || !el.richText.length) {
    el.richText = [{ text: el.text != null ? String(el.text) : '' }];
  } else {
    el.text = el.richText.map((r) => (r && r.text) || '').join('');
  }
  return el;
}

export function makeRect(over = {}) {
  return {
    id: newId('rect'),
    type: 'rect',
    x: 300, y: 300, width: 480, height: 320, rotation: 0, opacity: 1,
    boxFill: INK,
    stroke: ACCENT,
    strokeWidth: 3,
    cornerRadius: 18,
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
}

export function makeEllipse(over = {}) {
  return {
    id: newId('ellipse'),
    type: 'ellipse',
    x: 360, y: 360, width: 360, height: 360, rotation: 0, opacity: 1,
    boxFill: ACCENT,
    stroke: INK,
    strokeWidth: 0,
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
}

export function makeTriangle(over = {}) {
  return {
    id: newId('triangle'),
    type: 'triangle',
    x: 360, y: 360, width: 360, height: 320, rotation: 0, opacity: 1,
    boxFill: ACCENT,
    stroke: INK,
    strokeWidth: 0,
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
}

export function makeStar(over = {}) {
  return {
    id: newId('star'),
    type: 'star',
    x: 360, y: 360, width: 340, height: 340, rotation: 0, opacity: 1,
    points: 5,
    innerRatio: 0.5,
    boxFill: ACCENT,
    stroke: INK,
    strokeWidth: 0,
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
}

export function makeLine(over = {}) {
  return {
    id: newId('line'),
    type: 'line',
    x: 240, y: 500, width: 600, height: 0, rotation: 0, opacity: 1,
    stroke: ACCENT,
    strokeWidth: 4,
    lineCap: 'round',
    locked: false,
    ...over,
  };
}

export function makeImage(src, w = 400, h = 400, over = {}) {
  return {
    id: newId('image'),
    type: 'image',
    x: 340, y: 300, width: w, height: h, rotation: 0, opacity: 1,
    src,
    cornerRadius: 0,
    stroke: '#ffffff',
    strokeWidth: 0,
    filters: { ...DEFAULT_IMAGE_FILTERS },
    locked: false,
    ...DEFAULT_SHADOW,
    ...over,
  };
}

/* -------------------------------------------------------------------------- */
/* Blank / default documents                                                  */
/* -------------------------------------------------------------------------- */

export function blankDoc(canvasKey = 'portrait') {
  return {
    v: 3,
    canvas: canvasKey,
    background: grad(120, '#1e293b', '#0f172a'),
    elements: [],
  };
}

// Defensive normalizer so older/foreign blobs never crash the editor.
export function normalizeDoc(doc) {
  if (!doc || typeof doc !== 'object') return blankDoc();
  const canvas = CANVAS_PRESETS[doc.canvas] ? doc.canvas : 'portrait';
  const background = normalizeBg(doc.background);
  const elements = Array.isArray(doc.elements) ? doc.elements.map(normalizeEl).filter(Boolean) : [];
  return { v: 3, canvas, background, elements };
}

function normalizeBg(bg) {
  if (!bg || typeof bg !== 'object') return grad(120, '#1e293b', '#0f172a');
  if (bg.type === 'solid') return { type: 'solid', color: bg.color || INK };
  if (bg.type === 'image') return { type: 'image', image: { src: bg.image?.src || '', opacity: bg.image?.opacity ?? 1 }, color: bg.color || INK };
  if (bg.type === 'theme') {
    const tint = bg.tint && typeof bg.tint === 'object'
      ? { color: bg.tint.color || '#000000', alpha: clamp(num(bg.tint.alpha, 0), 0, 1) }
      : { color: '#000000', alpha: 0 };
    return { type: 'theme', key: String(bg.key || ''), opacity: clamp(num(bg.opacity, 1), 0, 1), tint };
  }
  const g = bg.gradient || {};
  return { type: 'gradient', gradient: { angle: Number.isFinite(+g.angle) ? +g.angle : 120, from: g.from || '#1e293b', to: g.to || '#0f172a' } };
}

// Sanitize a rich-text run array: keep only known keys, de-dash text.
function normalizeRuns(runs) {
  if (!Array.isArray(runs)) return null;
  const keys = ['fontFamily', 'fontSize', 'fill', 'bold', 'italic', 'underline', 'letterSpacing'];
  const out = runs.map((r) => {
    if (!r || typeof r !== 'object') return null;
    const run = { text: deDash(r.text != null ? String(r.text) : '') };
    for (const k of keys) if (r[k] !== undefined && r[k] !== null) run[k] = r[k];
    return run;
  }).filter(Boolean);
  return out.length ? out : null;
}

function normalizeEl(el) {
  if (!el || typeof el !== 'object' || !el.type) return null;
  const base = {
    id: el.id || newId(el.type),
    type: el.type,
    x: num(el.x, 100), y: num(el.y, 100),
    width: num(el.width, 200), height: num(el.height, 100),
    rotation: num(el.rotation, 0), opacity: clamp(num(el.opacity, 1), 0, 1),
    locked: !!el.locked,
  };
  if (el.type === 'text') {
    const merged = { ...makeText(), ...el, ...base };
    const runs = normalizeRuns(el.richText);
    merged.text = deDash(el.text ?? '');
    if (runs) {
      merged.richText = runs;
      merged.text = runs.map((r) => r.text || '').join('');
    } else {
      merged.richText = [{ text: merged.text }];
    }
    merged.textGradient = { ...DEFAULT_TEXT_GRADIENT, ...(el.textGradient || {}) };
    return merged;
  }
  if (el.type === 'rect') return { ...makeRect(), ...el, ...base };
  if (el.type === 'ellipse') return { ...makeEllipse(), ...el, ...base };
  if (el.type === 'triangle') return { ...makeTriangle(), ...el, ...base };
  if (el.type === 'star') return { ...makeStar(), ...el, ...base };
  if (el.type === 'line') return { ...makeLine(), ...el, ...base };
  if (el.type === 'image') {
    const merged = { ...makeImage(el.src), ...el, ...base };
    merged.filters = { ...DEFAULT_IMAGE_FILTERS, ...(el.filters || {}) };
    return merged;
  }
  return null;
}

const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
