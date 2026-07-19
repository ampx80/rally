// designer/richtext.js
// The rich-text engine that gives every text element true per-word and
// per-character styling (font, size, color, bold, italic, underline, letter
// spacing) while keeping ONE renderer (Konva) so PNG/JPG export stays
// pixel-accurate and captures the real fonts.
//
// WHY A RUN MODEL: Konva's Text node cannot mix fonts/sizes/colors within one
// node. So a text element stores its content as an ordered array of RUNS
// (spans). Each run carries the characters plus any style OVERRIDES; anything a
// run does not override inherits the element-level default. We then LAY OUT the
// runs ourselves (measure every glyph, wrap into lines, align) and render each
// line as one or more positioned single-line Konva.Text nodes - one node per
// contiguous same-style segment. Because it is still Konva, stage.toDataURL()
// captures it exactly at any pixelRatio.
//
// Editing happens in a contenteditable overlay (native caret + selection); the
// selection offsets map back onto this run model, so styling a word or a single
// character is just applying a style patch to a plain-text character range.
//
// ASCII hyphen only anywhere in this file.

/* -------------------------------------------------------------------------- */
/* Run model helpers                                                          */
/* -------------------------------------------------------------------------- */

// The style keys a run may override. Everything else inherits from the element.
export const RUN_KEYS = ['fontFamily', 'fontSize', 'fill', 'bold', 'italic', 'underline', 'letterSpacing'];

// Element-level defaults resolved from the element record.
export function elDefaults(el) {
  return {
    fontFamily: el.fontFamily || 'Playfair Display',
    fontSize: el.fontSize || 48,
    fill: el.fill || '#111111',
    bold: el.fontWeight === 'bold',
    italic: !!el.italic,
    underline: !!el.underline,
    letterSpacing: el.letterSpacing || 0,
  };
}

// Resolve a run's effective style against the element defaults.
export function resolveStyle(run, def) {
  return {
    fontFamily: run.fontFamily ?? def.fontFamily,
    fontSize: run.fontSize ?? def.fontSize,
    fill: run.fill ?? def.fill,
    bold: run.bold ?? def.bold,
    italic: run.italic ?? def.italic,
    underline: run.underline ?? def.underline,
    letterSpacing: run.letterSpacing ?? def.letterSpacing,
  };
}

// Get the run array for an element, migrating a plain-text element on the fly.
export function getRuns(el) {
  if (Array.isArray(el.richText) && el.richText.length) return el.richText;
  return [{ text: el.text != null ? String(el.text) : '' }];
}

export function runsToText(runs) {
  return runs.map((r) => r.text || '').join('');
}

// A run's style-override subset (no text), used for coalescing / equality.
function overridesOf(run) {
  const o = {};
  for (const k of RUN_KEYS) if (run[k] !== undefined) o[k] = run[k];
  return o;
}

function sameOverrides(a, b) {
  for (const k of RUN_KEYS) if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Per-character expand / coalesce (the basis for all editing ops)            */
/* -------------------------------------------------------------------------- */

// Expand runs into [{ ch, ov }] where ov is the override object for that char.
function expand(runs) {
  const out = [];
  for (const run of runs) {
    const ov = overridesOf(run);
    const t = run.text || '';
    for (const ch of t) out.push({ ch, ov });
  }
  return out;
}

// Coalesce a per-char array back into minimal runs.
function coalesce(chars) {
  const runs = [];
  for (const c of chars) {
    const last = runs[runs.length - 1];
    if (last && sameOverrides(last, c.ov)) {
      last.text += c.ch;
    } else {
      runs.push({ text: c.ch, ...c.ov });
    }
  }
  return runs.length ? runs : [{ text: '' }];
}

/* -------------------------------------------------------------------------- */
/* Editing operations (all operate on plain-text character offsets)           */
/* -------------------------------------------------------------------------- */

// Apply a style patch (subset of RUN_KEYS -> value, or value===null to clear)
// to the character range [start, end). Returns new runs.
export function applyStyleToRange(runs, start, end, patch) {
  const chars = expand(runs);
  const lo = Math.max(0, Math.min(start, end));
  const hi = Math.min(chars.length, Math.max(start, end));
  for (let i = lo; i < hi; i++) {
    const ov = { ...chars[i].ov };
    for (const k of Object.keys(patch)) {
      if (patch[k] === null || patch[k] === undefined) delete ov[k];
      else ov[k] = patch[k];
    }
    chars[i] = { ch: chars[i].ch, ov };
  }
  return coalesce(chars);
}

// Insert text at index, inheriting the style at that boundary (or a supplied
// override object). Returns new runs.
export function insertText(runs, index, text, ov) {
  const chars = expand(runs);
  const at = Math.max(0, Math.min(index, chars.length));
  const inherit = ov || (chars[at - 1]?.ov) || (chars[at]?.ov) || {};
  const ins = [...text].map((ch) => ({ ch, ov: { ...inherit } }));
  chars.splice(at, 0, ...ins);
  return coalesce(chars);
}

export function deleteRange(runs, start, end) {
  const chars = expand(runs);
  const lo = Math.max(0, Math.min(start, end));
  const hi = Math.min(chars.length, Math.max(start, end));
  chars.splice(lo, hi - lo);
  return coalesce(chars);
}

// Clear a given override key across ALL runs (used when styling the whole box
// via the element default, so no run keeps a stale per-word override).
export function clearOverrideAll(runs, keys) {
  const ks = Array.isArray(keys) ? keys : [keys];
  return runs.map((r) => {
    const c = { ...r };
    for (const k of ks) delete c[k];
    return c;
  });
}

// Summarize the styles present across a character range, for the toolbar to
// show the active values. Returns { fontFamily, fontSize, ... , mixed:{...} }.
export function styleOfRange(runs, def, start, end) {
  const chars = expand(runs);
  const lo = Math.max(0, Math.min(start, end));
  const hi = Math.min(chars.length, Math.max(start, end));
  const eff = [];
  if (hi <= lo) {
    // Collapsed caret: use the char just before, else element default.
    const c = chars[lo - 1] || chars[lo];
    eff.push(resolveStyle(c ? c.ov : {}, def));
  } else {
    for (let i = lo; i < hi; i++) eff.push(resolveStyle(chars[i].ov, def));
  }
  const first = eff[0] || def;
  const mixed = {};
  const out = {};
  for (const k of RUN_KEYS) {
    out[k] = first[k];
    mixed[k] = eff.some((s) => s[k] !== first[k]);
  }
  return { ...out, mixed };
}

/* -------------------------------------------------------------------------- */
/* Layout engine                                                              */
/* -------------------------------------------------------------------------- */

let _measureCtx = null;
function measureCtx() {
  if (_measureCtx) return _measureCtx;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  _measureCtx = c.getContext('2d');
  return _measureCtx;
}

export function cssFont(style) {
  const parts = [];
  if (style.italic) parts.push('italic');
  parts.push(style.bold ? '700' : '400');
  parts.push(`${Math.max(1, style.fontSize)}px`);
  parts.push(`"${style.fontFamily}"`);
  return parts.join(' ');
}

function measureChar(ctx, ch, style) {
  if (!ctx) return style.fontSize * 0.5;
  ctx.font = cssFont(style);
  return ctx.measureText(ch).width;
}

// Tokenize a per-char array (with resolved styles) into words/spaces/breaks.
function tokenize(chars) {
  const tokens = [];
  let cur = null;
  const flush = () => { if (cur) { tokens.push(cur); cur = null; } };
  for (const c of chars) {
    if (c.ch === '\n') { flush(); tokens.push({ type: 'break' }); continue; }
    const isSpace = c.ch === ' ' || c.ch === '\t';
    const type = isSpace ? 'space' : 'word';
    if (!cur || cur.type !== type) { flush(); cur = { type, chars: [c] }; }
    else cur.chars.push(c);
  }
  flush();
  return tokens;
}

// Lay out the element's runs into positioned segments. Returns:
//   { lines: [{ top, height, segments:[{ text, x, width, style, fontSize }] }],
//     width, height, contentWidth }
// All coordinates are in element-local pixels (the caller places the group at
// el.x/el.y and offsets by padding, which is already applied here).
export function layoutText(el, opts = {}) {
  const ctx = opts.ctx || measureCtx();
  const def = elDefaults(el);
  const runs = getRuns(el);
  const padding = el.padding || 0;
  const lineHeightMul = el.lineHeight || 1.2;
  const align = el.align || 'left';
  const maxWidth = Math.max(10, (el.width || 200) - padding * 2);

  // Expand to per-char with resolved style + measured advance.
  const chars = [];
  for (const run of runs) {
    const st = resolveStyle(run, def);
    const t = run.text || '';
    for (const ch of t) chars.push({ ch, style: st });
  }
  if (!chars.length) chars.push({ ch: '', style: resolveStyle({}, def) });

  const tokens = tokenize(chars);
  const advance = (c) => measureChar(ctx, c.ch, c.style) + (c.style.letterSpacing || 0);
  const tokenWidth = (tok) => (tok.chars ? tok.chars.reduce((s, c) => s + advance(c), 0) : 0);

  // Greedy line break. Each raw line records whether it ends a paragraph
  // (hard newline or end of text) so justify can leave the last line ragged.
  const rawLines = [];
  let line = []; // array of tokens
  let lineW = 0;
  const pushLine = (endsParagraph) => { rawLines.push({ toks: line, endsParagraph: !!endsParagraph }); line = []; lineW = 0; };

  for (const tok of tokens) {
    if (tok.type === 'break') { pushLine(true); continue; }
    const w = tokenWidth(tok);
    if (tok.type === 'space') {
      // A space only counts if the line already has content.
      if (line.length === 0) continue;
      line.push(tok); lineW += w; continue;
    }
    // word
    if (lineW + w > maxWidth && line.length > 0) {
      // Drop a trailing space token before wrapping (soft wrap, not paragraph end).
      if (line[line.length - 1]?.type === 'space') { lineW -= tokenWidth(line[line.length - 1]); line.pop(); }
      pushLine(false);
    }
    // If a single word is wider than the line, it still goes on its own line.
    line.push(tok); lineW += w;
  }
  pushLine(true);

  const isSpaceCh = (c) => c.ch === ' ' || c.ch === '\t';

  // Build positioned segments per line.
  const lines = [];
  let y = padding;
  for (const raw of rawLines) {
    const toks = raw.toks;
    // Flatten this line's chars in order.
    const lineChars = [];
    for (const tok of toks) if (tok.chars) for (const c of tok.chars) lineChars.push(c);
    // Trim a trailing space for width/alignment purposes.
    while (lineChars.length && (lineChars[lineChars.length - 1].ch === ' ' || lineChars[lineChars.length - 1].ch === '\t')) {
      lineChars.pop();
    }
    const maxFs = lineChars.reduce((m, c) => Math.max(m, c.style.fontSize), def.fontSize);
    const lineHeightPx = maxFs * lineHeightMul;
    const centerY = y + lineHeightPx / 2;

    // Base advances + natural line width.
    const adv = lineChars.map((c) => advance(c));
    const baseContentW = adv.reduce((s, a) => s + a, 0);

    // Justify: distribute the slack across word gaps (spaces). The last line of
    // a paragraph (hard break / end of text) stays ragged, matching standard
    // justify behavior. A line with no interior spaces cannot justify, so it
    // falls back to its natural (left) width.
    let spaceCount = 0;
    for (const c of lineChars) if (isSpaceCh(c)) spaceCount++;
    const justifyThisLine = align === 'justify' && !raw.endsParagraph && spaceCount > 0 && baseContentW < maxWidth;
    const extraPerSpace = justifyThisLine ? (maxWidth - baseContentW) / spaceCount : 0;

    // Same-style contiguous segments. When justifying, break segments at spaces
    // so the distributed slack becomes real inter-word gaps (the invisible space
    // glyph is drawn at its natural width, the extra pushes the next word right).
    const segsRaw = [];
    for (let i = 0; i < lineChars.length; i++) {
      const c = lineChars[i];
      const sp = isSpaceCh(c);
      const w = adv[i] + (sp ? extraPerSpace : 0);
      const last = segsRaw[segsRaw.length - 1];
      const canMerge = last && sameStyle(last.style, c.style) && !(justifyThisLine && (sp || last.isSpace));
      if (canMerge) { last.text += c.ch; last.width += w; }
      else segsRaw.push({ text: c.ch, style: c.style, width: w, isSpace: sp });
    }
    const contentW = segsRaw.reduce((s, seg) => s + seg.width, 0);
    let startX = padding;
    if (align === 'center') startX = padding + (maxWidth - contentW) / 2;
    else if (align === 'right') startX = padding + (maxWidth - contentW);

    let x = startX;
    const segments = segsRaw.map((seg) => {
      const s = { text: seg.text, x, width: seg.width, style: seg.style, top: centerY - seg.style.fontSize / 2, fontSize: seg.style.fontSize };
      x += seg.width;
      return s;
    });
    lines.push({ top: y, height: lineHeightPx, centerY, segments, contentWidth: justifyThisLine ? baseContentW : contentW });
    y += lineHeightPx;
  }

  const contentWidth = lines.reduce((m, l) => Math.max(m, l.contentWidth), 0);
  const height = y + padding;
  return { lines, width: el.width || 200, height, contentWidth };
}

function sameStyle(a, b) {
  return a.fontFamily === b.fontFamily && a.fontSize === b.fontSize && a.fill === b.fill &&
    a.bold === b.bold && a.italic === b.italic && a.underline === b.underline &&
    a.letterSpacing === b.letterSpacing;
}

// Text on a circular arc (single line). curve in [-100, 100]: positive arcs the
// text upward (a smile), negative downward. Returns per-character placements
// with a center offset so each glyph is centered on its arc point.
export function layoutCurved(el, opts = {}) {
  const ctx = opts.ctx || measureCtx();
  const def = elDefaults(el);
  const runs = getRuns(el);
  const padding = el.padding || 0;
  const chars = [];
  for (const run of runs) {
    const st = resolveStyle(run, def);
    for (const ch of (run.text || '')) if (ch !== '\n') chars.push({ ch, style: st });
  }
  if (!chars.length) chars.push({ ch: ' ', style: resolveStyle({}, def) });

  const widths = chars.map((c) => measureChar(ctx, c.ch, c.style) + (c.style.letterSpacing || 0));
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const maxFs = chars.reduce((m, c) => Math.max(m, c.style.fontSize), def.fontSize);
  const cx = (el.width || 200) / 2;

  const curve = Math.max(-100, Math.min(100, el.curve || 0));
  const spread = (curve / 100) * (Math.PI * 0.9); // up to ~160 degrees of arc
  const out = [];

  if (Math.abs(spread) < 0.001) {
    let x = ((el.width || 200) - total) / 2;
    const y = padding + maxFs / 2;
    for (let i = 0; i < chars.length; i++) {
      out.push({ ch: chars[i].ch, x: x + widths[i] / 2, y, w: widths[i], rotation: 0, style: chars[i].style });
      x += widths[i];
    }
    return { chars: out, height: padding * 2 + maxFs * 1.3 };
  }

  const radius = total / Math.abs(spread);
  const dir = spread > 0 ? 1 : -1;
  const startAngle = -Math.PI / 2 - (dir * Math.abs(spread)) / 2;
  const centerY = dir > 0 ? padding + maxFs / 2 + radius : padding + maxFs / 2 - radius + (radius - radius * Math.cos(spread / 2)) + maxFs;

  let acc = 0;
  for (let i = 0; i < chars.length; i++) {
    const mid = acc + widths[i] / 2;
    const ang = startAngle + dir * (mid / radius);
    const px = cx + Math.cos(ang) * radius;
    const py = centerY + Math.sin(ang) * radius;
    const rot = (ang * 180) / Math.PI + 90;
    out.push({ ch: chars[i].ch, x: px, y: py, w: widths[i], rotation: rot, style: chars[i].style });
    acc += widths[i];
  }
  const sag = radius * (1 - Math.cos(Math.abs(spread) / 2));
  return { chars: out, height: padding * 2 + maxFs * 1.3 + sag };
}

// All font families referenced by an element's runs (for font loading/export).
export function familiesInEl(el) {
  const def = elDefaults(el);
  const set = new Set([def.fontFamily]);
  for (const r of getRuns(el)) if (r.fontFamily) set.add(r.fontFamily);
  return [...set];
}
