// designer/backgrounds.js
// A large, curated background library for the visual designer. Every theme is
// generated as a single full-canvas SVG string, so it scales to any resolution
// and stays tiny (a few KB) instead of shipping hundreds of binaries. Themes are
// procedural: a motif (florals, geometric, art-deco, watercolor, confetti,
// stripes, frames, starbursts, etc.) rendered over a curated palette. That gives
// 70+ tasteful, design-appropriate backgrounds from a small amount of code.
//
// One render path: the Konva <Background> asks a theme for svg(w, h), rasterizes
// it to an image at high intrinsic resolution, and draws it full-bleed. Opacity
// and tint are applied on top in Konva. Because the source is an SVG the browser
// decodes at the requested pixel size, export stays crisp.
//
// ASCII hyphen only anywhere in this file.

export const BG_CATEGORIES = [
  'Elegant', 'Minimal', 'Floral', 'Geometric', 'Art Deco',
  'Watercolor', 'Confetti', 'Vintage', 'Bold', 'Seasonal',
];

/* -------------------------------------------------------------------------- */
/* Seeded RNG so scatter motifs are stable across every render                */
/* -------------------------------------------------------------------------- */

function seedFromKey(k) {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Palettes                                                                   */
/* -------------------------------------------------------------------------- */
// dark=true means light text reads best on this background.

const PALETTES = {
  navyGold:   { label: 'Navy and gold', dark: true,  from: '#13294f', to: '#050912', angle: 135, accent: '#E6BE56', accent2: '#F2CC63' },
  royal:      { label: 'Royal purple',  dark: true,  from: '#241a52', to: '#0a0718', angle: 135, accent: '#C9A9F0', accent2: '#E6BE56' },
  emerald:    { label: 'Emerald',       dark: true,  from: '#0a3a2a', to: '#02120b', angle: 135, accent: '#E6BE56', accent2: '#7fd6b0' },
  burgundy:   { label: 'Burgundy',      dark: true,  from: '#4a0d16', to: '#170609', angle: 135, accent: '#E6BE56', accent2: '#e79aa8' },
  charcoal:   { label: 'Charcoal',      dark: true,  from: '#2b2f38', to: '#0b0e14', angle: 135, accent: '#c9ccd4', accent2: '#E6BE56' },
  midnight:   { label: 'Midnight blue', dark: true,  from: '#0E2348', to: '#091528', angle: 135, accent: '#7fb0ff', accent2: '#E6BE56' },
  forest:     { label: 'Forest',        dark: true,  from: '#16351f', to: '#08130c', angle: 135, accent: '#d8c48a', accent2: '#9ed9a8' },
  wine:       { label: 'Wine',          dark: true,  from: '#3d1030', to: '#160510', angle: 135, accent: '#e6a3c8', accent2: '#E6BE56' },
  slate:      { label: 'Slate',         dark: true,  from: '#293241', to: '#0b1220', angle: 135, accent: '#9fb3cc', accent2: '#E6BE56' },
  teal:       { label: 'Deep teal',     dark: true,  from: '#0b3a44', to: '#04161a', angle: 135, accent: '#f0d59a', accent2: '#7fd6d6' },

  blush:      { label: 'Blush',         dark: false, from: '#fff1f5', to: '#f7d3e0', angle: 135, accent: '#c98aa6', accent2: '#b23a6e' },
  champagne:  { label: 'Champagne',     dark: false, from: '#fbf3de', to: '#e6cf9c', angle: 135, accent: '#b9922e', accent2: '#8A6D1E' },
  ivory:      { label: 'Ivory',         dark: false, from: '#fbfaf3', to: '#efe9d8', angle: 135, accent: '#b9922e', accent2: '#0E2348' },
  sage:       { label: 'Sage',          dark: false, from: '#eef2e6', to: '#cfdcc0', angle: 135, accent: '#6f8a5b', accent2: '#3f5a3f' },
  dustyBlue:  { label: 'Dusty blue',    dark: false, from: '#eef3f8', to: '#c8d8e8', angle: 135, accent: '#5a7fa6', accent2: '#0E2348' },
  lavender:   { label: 'Lavender',      dark: false, from: '#f4f0fb', to: '#ddd0f0', angle: 135, accent: '#8a6fbf', accent2: '#5a3f8a' },
  peach:      { label: 'Peach',         dark: false, from: '#fff2ea', to: '#f7d3bd', angle: 135, accent: '#d98a5a', accent2: '#b2543a' },
  mint:       { label: 'Mint',          dark: false, from: '#eafaf2', to: '#c4ead6', angle: 135, accent: '#4fae86', accent2: '#2f6a52' },
  rosegold:   { label: 'Rose gold',     dark: false, from: '#f7e3db', to: '#e6b7a3', angle: 135, accent: '#b2543a', accent2: '#8A6D1E' },
  cream:      { label: 'Cream',         dark: false, from: '#faf6ec', to: '#f0e6cf', angle: 135, accent: '#0E2348', accent2: '#b9922e' },
};

const P = (k) => PALETTES[k];

/* -------------------------------------------------------------------------- */
/* SVG building blocks                                                        */
/* -------------------------------------------------------------------------- */

function gradDef(id, angle, from, to) {
  const a = ((angle || 135) * Math.PI) / 180;
  const x1 = (0.5 - Math.cos(a) / 2).toFixed(4), y1 = (0.5 - Math.sin(a) / 2).toFixed(4);
  const x2 = (0.5 + Math.cos(a) / 2).toFixed(4), y2 = (0.5 + Math.sin(a) / 2).toFixed(4);
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
}

function baseFill(w, h, pal) {
  const defs = gradDef('bgg', pal.angle, pal.from, pal.to);
  const rect = `<rect width="${w}" height="${h}" fill="url(#bgg)"/>`;
  return { defs, rect };
}

function vignette(w, h, pal) {
  const c = pal.dark ? '#000000' : '#000000';
  const op = pal.dark ? 0.34 : 0.05;
  return `<radialGradient id="vg" cx="0.5" cy="0.42" r="0.8">` +
    `<stop offset="0.55" stop-color="${c}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${c}" stop-opacity="${op}"/></radialGradient>` +
    `<rect width="${w}" height="${h}" fill="url(#vg)"/>`;
}

const R = (n, d = 1) => Number(n.toFixed(d));

/* -------------------------------------------------------------------------- */
/* Motifs: (w, h, pal, rng) -> svg body string                                */
/* -------------------------------------------------------------------------- */

const motifs = {
  plain(w, h, pal) {
    return vignette(w, h, pal);
  },

  frame(w, h, pal) {
    const m = Math.round(Math.min(w, h) * 0.045);
    const m2 = m + Math.round(Math.min(w, h) * 0.012);
    const a = pal.accent;
    const corner = (x, y, sx, sy) =>
      `<path d="M ${x} ${y + sy * 60} L ${x} ${y} L ${x + sx * 60} ${y}" fill="none" stroke="${a}" stroke-width="${R(Math.min(w, h) * 0.006)}"/>`;
    return vignette(w, h, pal) +
      `<rect x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}" fill="none" stroke="${a}" stroke-width="${R(Math.min(w, h) * 0.004)}" stroke-opacity="0.9"/>` +
      `<rect x="${m2}" y="${m2}" width="${w - m2 * 2}" height="${h - m2 * 2}" fill="none" stroke="${a}" stroke-width="${R(Math.min(w, h) * 0.0015)}" stroke-opacity="0.6"/>` +
      corner(m2 + 14, m2 + 14, 1, 1) + corner(w - m2 - 14, m2 + 14, -1, 1) +
      corner(m2 + 14, h - m2 - 14, 1, -1) + corner(w - m2 - 14, h - m2 - 14, -1, -1);
  },

  dots(w, h, pal) {
    const s = Math.round(Math.min(w, h) / 14);
    const op = pal.dark ? 0.16 : 0.5;
    return `<pattern id="dots" width="${s}" height="${s}" patternUnits="userSpaceOnUse">` +
      `<circle cx="${s / 2}" cy="${s / 2}" r="${R(s * 0.11)}" fill="${pal.accent}" fill-opacity="${op}"/></pattern>` +
      `<rect width="${w}" height="${h}" fill="url(#dots)"/>` + vignette(w, h, pal);
  },

  confetti(w, h, pal, rng) {
    const n = Math.round((w * h) / 26000);
    const cols = [pal.accent, pal.accent2, pal.dark ? '#ffffff' : pal.from];
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = R(rng() * w), y = R(rng() * h), rot = R(rng() * 360);
      const c = cols[Math.floor(rng() * cols.length)];
      const sz = R(Math.min(w, h) * (0.008 + rng() * 0.014));
      const op = R(0.45 + rng() * 0.4, 2);
      const kind = rng();
      if (kind < 0.4) s += `<rect x="${x}" y="${y}" width="${sz * 2.4}" height="${sz}" rx="${sz * 0.3}" fill="${c}" fill-opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;
      else if (kind < 0.75) s += `<circle cx="${x}" cy="${y}" r="${sz * 0.9}" fill="${c}" fill-opacity="${op}"/>`;
      else s += `<path d="M ${x} ${y - sz} L ${x + sz} ${y + sz} L ${x - sz} ${y + sz} Z" fill="${c}" fill-opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;
    }
    return s + vignette(w, h, pal);
  },

  stripes(w, h, pal) {
    const s = Math.round(Math.min(w, h) / 12);
    const op = pal.dark ? 0.09 : 0.22;
    return `<pattern id="st" width="${s}" height="${s}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="${s / 2}" height="${s}" fill="${pal.accent}" fill-opacity="${op}"/></pattern>` +
      `<rect width="${w}" height="${h}" fill="url(#st)"/>` + vignette(w, h, pal);
  },

  chevron(w, h, pal) {
    const s = Math.round(Math.min(w, h) / 9);
    const op = pal.dark ? 0.1 : 0.22;
    return `<pattern id="cv" width="${s}" height="${s}" patternUnits="userSpaceOnUse">` +
      `<path d="M 0 ${s * 0.6} L ${s / 2} ${s * 0.2} L ${s} ${s * 0.6} L ${s} ${s * 0.85} L ${s / 2} ${s * 0.45} L 0 ${s * 0.85} Z" fill="${pal.accent}" fill-opacity="${op}"/></pattern>` +
      `<rect width="${w}" height="${h}" fill="url(#cv)"/>` + vignette(w, h, pal);
  },

  grid(w, h, pal) {
    const s = Math.round(Math.min(w, h) / 12);
    const op = pal.dark ? 0.12 : 0.28;
    const sw = R(Math.min(w, h) * 0.0016);
    return `<pattern id="gr" width="${s}" height="${s}" patternUnits="userSpaceOnUse">` +
      `<path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${pal.accent}" stroke-width="${sw}" stroke-opacity="${op}"/></pattern>` +
      `<rect width="${w}" height="${h}" fill="url(#gr)"/>` + vignette(w, h, pal);
  },

  triangles(w, h, pal, rng) {
    const cols = Math.round(w / (Math.min(w, h) / 7));
    const rows = Math.round(h / (Math.min(w, h) / 7));
    const cw = w / cols, ch = h / rows;
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * ch;
      const op = R(0.04 + rng() * 0.12, 3);
      const col = rng() > 0.5 ? pal.accent : pal.accent2;
      const up = (r + c) % 2 === 0;
      const pts = up
        ? `${x} ${y + ch} ${x + cw} ${y + ch} ${x + cw / 2} ${y}`
        : `${x} ${y} ${x + cw} ${y} ${x + cw / 2} ${y + ch}`;
      s += `<polygon points="${pts}" fill="${col}" fill-opacity="${op}"/>`;
    }
    return s + vignette(w, h, pal);
  },

  artdeco(w, h, pal) {
    const cx = w / 2, cy = 0;
    const a = pal.accent, a2 = pal.accent2;
    const rays = 18, len = Math.hypot(w, h);
    let s = '';
    for (let i = 0; i <= rays; i++) {
      const ang = (Math.PI * (i / rays));
      const x2 = cx + Math.cos(ang) * len, y2 = cy + Math.sin(ang) * len;
      if (i % 2 === 0) s += `<path d="M ${cx} ${cy} L ${R(x2)} ${R(y2)} L ${R(cx + Math.cos(ang + Math.PI / rays) * len)} ${R(cy + Math.sin(ang + Math.PI / rays) * len)} Z" fill="${a}" fill-opacity="0.06"/>`;
    }
    for (let i = 1; i <= 5; i++) {
      const rr = (Math.min(w, h) * 0.12) * i;
      s += `<path d="M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 0 ${cx + rr} ${cy}" fill="none" stroke="${a2}" stroke-width="${R(Math.min(w, h) * 0.003)}" stroke-opacity="0.5"/>`;
    }
    // Bottom mirror fan.
    let bottom = `<g transform="translate(${w} ${h}) rotate(180)">`;
    for (let i = 0; i <= rays; i += 2) {
      const ang = (Math.PI * (i / rays));
      bottom += `<path d="M ${w / 2} 0 L ${R(w / 2 + Math.cos(ang) * len)} ${R(Math.sin(ang) * len)} L ${R(w / 2 + Math.cos(ang + Math.PI / rays) * len)} ${R(Math.sin(ang + Math.PI / rays) * len)} Z" fill="${a}" fill-opacity="0.05"/>`;
    }
    bottom += '</g>';
    return s + bottom + vignette(w, h, pal);
  },

  starburst(w, h, pal) {
    const cx = w / 2, cy = h / 2, len = Math.hypot(w, h);
    const rays = 40;
    let s = '';
    for (let i = 0; i < rays; i++) {
      const ang = (2 * Math.PI * i) / rays;
      const spread = Math.PI / rays;
      const x1 = cx + Math.cos(ang) * len, y1 = cy + Math.sin(ang) * len;
      const x2 = cx + Math.cos(ang + spread) * len, y2 = cy + Math.sin(ang + spread) * len;
      if (i % 2 === 0) s += `<path d="M ${cx} ${cy} L ${R(x1)} ${R(y1)} L ${R(x2)} ${R(y2)} Z" fill="${pal.accent}" fill-opacity="0.06"/>`;
    }
    return s + vignette(w, h, pal);
  },

  waves(w, h, pal) {
    const a = pal.accent, a2 = pal.accent2;
    let s = '';
    const layers = 5;
    for (let l = 0; l < layers; l++) {
      const y0 = h * (0.35 + l * 0.14);
      const amp = Math.min(w, h) * 0.05;
      const col = l % 2 ? a2 : a;
      let d = `M 0 ${R(y0)}`;
      const seg = 4;
      for (let i = 1; i <= seg; i++) {
        const x = (w * i) / seg;
        const cx1 = (w * (i - 0.5)) / seg;
        const yy = y0 + (i % 2 ? amp : -amp);
        d += ` Q ${R(cx1)} ${R(yy)} ${R(x)} ${R(y0)}`;
      }
      d += ` L ${w} ${h} L 0 ${h} Z`;
      s += `<path d="${d}" fill="${col}" fill-opacity="${pal.dark ? 0.08 : 0.16}"/>`;
    }
    return s + vignette(w, h, pal);
  },

  floral(w, h, pal) {
    const s = Math.round(Math.min(w, h) / 5);
    const a = pal.accent, a2 = pal.accent2;
    const op = pal.dark ? 0.16 : 0.42;
    const petal = (cx, cy, r) => {
      let p = '';
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI * 2 * k) / 6;
        const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
        p += `<ellipse cx="${R(px)}" cy="${R(py)}" rx="${R(r * 0.55)}" ry="${R(r * 0.28)}" fill="${a}" fill-opacity="${op}" transform="rotate(${R((ang * 180) / Math.PI)} ${R(px)} ${R(py)})"/>`;
      }
      p += `<circle cx="${cx}" cy="${cy}" r="${R(r * 0.28)}" fill="${a2}" fill-opacity="${op + 0.1}"/>`;
      return p;
    };
    const tile = petal(s / 2, s / 2, s * 0.2) + petal(0, 0, s * 0.16) + petal(s, s, s * 0.16) +
      petal(s, 0, s * 0.16) + petal(0, s, s * 0.16);
    return `<pattern id="fl" width="${s}" height="${s}" patternUnits="userSpaceOnUse">${tile}</pattern>` +
      `<rect width="${w}" height="${h}" fill="url(#fl)"/>` + vignette(w, h, pal);
  },

  watercolor(w, h, pal, rng) {
    const n = 7;
    const cols = [pal.accent, pal.accent2, pal.dark ? pal.from : '#ffffff'];
    let blobs = '';
    for (let i = 0; i < n; i++) {
      const cx = R(rng() * w), cy = R(rng() * h);
      const rr = R(Math.min(w, h) * (0.18 + rng() * 0.22));
      const c = cols[Math.floor(rng() * cols.length)];
      blobs += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${c}" fill-opacity="${R(0.1 + rng() * 0.14, 3)}"/>`;
    }
    return `<filter id="wc" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${R(Math.min(w, h) * 0.05)}"/></filter>` +
      `<g filter="url(#wc)">${blobs}</g>` + vignette(w, h, pal);
  },

  terrazzo(w, h, pal, rng) {
    const n = Math.round((w * h) / 14000);
    const cols = [pal.accent, pal.accent2, pal.dark ? '#ffffff' : '#0E2348', pal.from];
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = R(rng() * w), y = R(rng() * h);
      const c = cols[Math.floor(rng() * cols.length)];
      const sz = R(Math.min(w, h) * (0.004 + rng() * 0.01));
      const op = pal.dark ? R(0.18 + rng() * 0.2, 2) : R(0.35 + rng() * 0.35, 2);
      s += `<circle cx="${x}" cy="${y}" r="${sz}" fill="${c}" fill-opacity="${op}"/>`;
    }
    return s + vignette(w, h, pal);
  },

  vintage(w, h, pal, rng) {
    // Paper base + speckle + faded double frame (yearbook feel).
    let speck = '';
    const n = Math.round((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      speck += `<circle cx="${R(rng() * w)}" cy="${R(rng() * h)}" r="${R(rng() * Math.min(w, h) * 0.0016)}" fill="#000000" fill-opacity="${R(rng() * 0.05, 3)}"/>`;
    }
    const m = Math.round(Math.min(w, h) * 0.05);
    const a = pal.accent;
    return speck +
      `<radialGradient id="pv" cx="0.5" cy="0.5" r="0.75"><stop offset="0.5" stop-color="#5a4a2a" stop-opacity="0"/><stop offset="1" stop-color="#3a2e15" stop-opacity="0.16"/></radialGradient>` +
      `<rect width="${w}" height="${h}" fill="url(#pv)"/>` +
      `<rect x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}" fill="none" stroke="${a}" stroke-width="${R(Math.min(w, h) * 0.0035)}" stroke-opacity="0.55"/>` +
      `<rect x="${m + 10}" y="${m + 10}" width="${w - m * 2 - 20}" height="${h - m * 2 - 20}" fill="none" stroke="${a}" stroke-width="${R(Math.min(w, h) * 0.0012)}" stroke-opacity="0.4"/>`;
  },
};

/* -------------------------------------------------------------------------- */
/* Theme catalog assembly                                                     */
/* -------------------------------------------------------------------------- */

function makeTheme(key, label, category, palKey, motif, motifName) {
  const pal = P(palKey);
  return {
    key,
    label,
    category,
    dark: pal.dark,
    palette: palKey,
    svg(w, h) {
      const rng = mulberry32(seedFromKey(key));
      const { defs, rect } = baseFill(w, h, pal);
      const body = motif(w, h, pal, rng);
      // defs and body may both contain <defs>-style elements; SVG tolerates
      // gradient/pattern/filter definitions placed inline before use.
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
        `<defs>${defs}</defs>${rect}${body}</svg>`;
    },
  };
}

const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function build() {
  const themes = [];
  const add = (category, palKeys, motifName) => {
    for (const pk of palKeys) {
      const pal = P(pk);
      const key = `${category.toLowerCase().replace(/\s+/g, '')}-${pk}`;
      const label = `${pal.label} ${category}`;
      themes.push(makeTheme(key, label, category, pk, motifs[motifName], motifName));
    }
  };

  const dark = ['navyGold', 'royal', 'emerald', 'burgundy', 'midnight', 'wine', 'forest', 'slate', 'teal', 'charcoal'];
  const light = ['blush', 'champagne', 'ivory', 'sage', 'dustyBlue', 'lavender', 'peach', 'mint', 'rosegold', 'cream'];
  const both = [...dark, ...light];

  add('Elegant', ['navyGold', 'royal', 'emerald', 'burgundy', 'champagne', 'blush', 'ivory', 'wine'], 'frame');
  add('Minimal', ['midnight', 'charcoal', 'slate', 'ivory', 'dustyBlue', 'sage', 'cream', 'lavender'], 'plain');
  add('Floral', ['blush', 'sage', 'champagne', 'lavender', 'emerald', 'navyGold', 'peach', 'mint'], 'floral');
  add('Geometric', ['midnight', 'slate', 'dustyBlue', 'charcoal', 'teal', 'ivory', 'forest', 'mint'], 'grid');
  add('Art Deco', ['navyGold', 'royal', 'burgundy', 'emerald', 'wine', 'champagne'], 'artdeco');
  add('Watercolor', ['blush', 'lavender', 'dustyBlue', 'sage', 'peach', 'mint', 'royal', 'teal'], 'watercolor');
  add('Confetti', ['navyGold', 'royal', 'midnight', 'blush', 'champagne', 'emerald', 'wine', 'peach'], 'confetti');
  add('Vintage', ['champagne', 'ivory', 'cream', 'rosegold', 'sage', 'peach'], 'vintage');
  add('Bold', ['navyGold', 'burgundy', 'royal', 'emerald', 'wine', 'midnight', 'forest', 'teal'], 'starburst');

  // A few extra Geometric variety with different motifs.
  themes.push(makeTheme('geometric-navyGold-dots', 'Navy and gold Dots', 'Geometric', 'navyGold', motifs.dots, 'dots'));
  themes.push(makeTheme('geometric-blush-dots', 'Blush Dots', 'Geometric', 'blush', motifs.dots, 'dots'));
  themes.push(makeTheme('geometric-emerald-chevron', 'Emerald Chevron', 'Geometric', 'emerald', motifs.chevron, 'chevron'));
  themes.push(makeTheme('geometric-champagne-chevron', 'Champagne Chevron', 'Geometric', 'champagne', motifs.chevron, 'chevron'));
  themes.push(makeTheme('geometric-royal-triangles', 'Royal Triangles', 'Geometric', 'royal', motifs.triangles, 'triangles'));
  themes.push(makeTheme('geometric-dustyBlue-triangles', 'Dusty blue Triangles', 'Geometric', 'dustyBlue', motifs.triangles, 'triangles'));
  themes.push(makeTheme('bold-navyGold-stripes', 'Navy and gold Stripes', 'Bold', 'navyGold', motifs.stripes, 'stripes'));
  themes.push(makeTheme('bold-peach-stripes', 'Peach Stripes', 'Bold', 'peach', motifs.stripes, 'stripes'));
  themes.push(makeTheme('bold-teal-waves', 'Teal Waves', 'Bold', 'teal', motifs.waves, 'waves'));
  themes.push(makeTheme('bold-blush-waves', 'Blush Waves', 'Bold', 'blush', motifs.waves, 'waves'));
  themes.push(makeTheme('minimal-champagne-terrazzo', 'Champagne Terrazzo', 'Minimal', 'champagne', motifs.terrazzo, 'terrazzo'));
  themes.push(makeTheme('minimal-mint-terrazzo', 'Mint Terrazzo', 'Minimal', 'mint', motifs.terrazzo, 'terrazzo'));

  // Seasonal: hand-tuned pairings.
  themes.push(makeTheme('seasonal-spring', 'Spring Bloom', 'Seasonal', 'sage', motifs.floral, 'floral'));
  themes.push(makeTheme('seasonal-summer', 'Summer Bright', 'Seasonal', 'mint', motifs.confetti, 'confetti'));
  themes.push(makeTheme('seasonal-autumn', 'Autumn Warmth', 'Seasonal', 'peach', motifs.waves, 'waves'));
  themes.push(makeTheme('seasonal-winter', 'Winter Frost', 'Seasonal', 'dustyBlue', motifs.dots, 'dots'));
  themes.push(makeTheme('seasonal-newyear', 'New Year Gold', 'Seasonal', 'navyGold', motifs.confetti, 'confetti'));
  themes.push(makeTheme('seasonal-holiday', 'Holiday Evergreen', 'Seasonal', 'forest', motifs.starburst, 'starburst'));
  themes.push(makeTheme('seasonal-valentine', 'Sweetheart', 'Seasonal', 'blush', motifs.floral, 'floral'));
  themes.push(makeTheme('seasonal-gala', 'Black Tie Gala', 'Seasonal', 'charcoal', motifs.artdeco, 'artdeco'));

  return themes;
}

export const BG_THEMES = build();
export const BG_BY_KEY = BG_THEMES.reduce((m, t) => { m[t.key] = t; return m; }, {});

export function getTheme(key) {
  return BG_BY_KEY[key] || null;
}

// The color palette (dark flag, gradient stops, accents, label) behind a theme.
// Used by the template generator to pick text colors that read on the theme.
export function paletteForTheme(key) {
  const t = BG_BY_KEY[key];
  return t ? PALETTES[t.palette] : null;
}

export { PALETTES };

// Data URL for a theme at a given pixel size (used for Konva image + swatches).
export function themeDataUrl(theme, w, h) {
  const svg = theme.svg(w, h);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function themesByCategory() {
  const out = {};
  for (const c of BG_CATEGORIES) out[c] = [];
  for (const t of BG_THEMES) (out[t.category] || (out[t.category] = [])).push(t);
  return out;
}
