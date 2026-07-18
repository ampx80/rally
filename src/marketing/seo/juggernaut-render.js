// ============================================================
// JUGGERNAUT RENDER  (isolated best-in-class SEO track)
// Pure, dependency-free functions that turn a juggernaut ENTRY object
// into a static HTML string for the prerender step, and the shared
// JSON-LD builders + calculator evaluator + value formatter that the
// React page (Juggernaut.jsx) reuses so the static build and the live
// hydration render byte-for-byte the same content and math.
//
// This module imports NOTHING. It is safe to import from Node (the
// prerender) and from the browser bundle (the React page). It touches
// none of the existing /pages SEO system.
//
// ASCII only. NO em-dash / en-dash anywhere in code or output.
// ============================================================

export const SITE = 'https://rally-psi-five.vercel.app';
export const BRAND = 'Ardovo';
export const GUIDES_BASE = '/guides';

/* ---------- string + html helpers ---------- */
export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ldSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const paras = (v, cls) => asArray(v).filter(Boolean)
  .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`).join('');
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const guideCanonical = (slug) => `${SITE}${GUIDES_BASE}/${slug}`;

/* Give every block a stable anchor id (author id wins, else derive). */
export function blockAnchor(block, i) {
  if (block && block.id) return slugify(block.id);
  const t = block && (block.title || block.text || block.heading);
  return t ? `${slugify(t)}-${i}` : `section-${i}`;
}

/* ---------- meta ---------- */
export function metaForJug(entry) {
  const title = entry.metaTitle || `${entry.title} | ${BRAND}`;
  let description = entry.metaDescription
    || (typeof entry.intro === 'string' ? entry.intro : Array.isArray(entry.intro) ? entry.intro[0] : '')
    || `${entry.title} - the definitive guide from Ardovo, the AI-native revenue platform.`;
  if (description.length > 158) {
    const cut = description.slice(0, 158);
    description = cut.slice(0, cut.lastIndexOf(' ')) + '...';
  }
  return { title, description };
}

/* ============================================================
   SAFE EXPRESSION EVALUATOR  (shared by build + live calculators)
   Recursive-descent parser over a locked grammar: numbers,
   identifiers (resolved from a scope object), + - * / %, unary
   sign, parentheses, and a fixed function set. No eval, no
   new Function, no property access. Deterministic.
   ============================================================ */
const CALC_FNS = {
  min: Math.min, max: Math.max, round: Math.round, floor: Math.floor,
  ceil: Math.ceil, abs: Math.abs, sqrt: Math.sqrt,
  pow: Math.pow, clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
};

function tokenizeCalc(src) {
  const toks = [];
  const s = String(src);
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if ('+-*/%(),'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9._]/.test(s[j])) j++;
      toks.push({ t: 'num', v: parseFloat(s.slice(i, j).replace(/_/g, '')) });
      i = j; continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j++;
      toks.push({ t: 'id', v: s.slice(i, j) });
      i = j; continue;
    }
    // Unknown character: skip it rather than throw, keeps the build resilient.
    i++;
  }
  return toks;
}

/* Evaluate an arithmetic expression string against a numeric scope.
   Returns a number, or 0 on any parse problem (never throws). */
export function evalCalcExpr(expr, scope = {}) {
  if (typeof expr === 'number') return expr;
  if (expr == null) return 0;
  let toks;
  try { toks = tokenizeCalc(expr); } catch { return 0; }
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

  function parseExpr() {
    let v = parseTerm();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() && (peek().t === '*' || peek().t === '/' || peek().t === '%')) {
      const op = next().t;
      const r = parseFactor();
      if (op === '*') v = v * r;
      else if (op === '/') v = r === 0 ? 0 : v / r;
      else v = r === 0 ? 0 : v % r;
    }
    return v;
  }
  function parseFactor() {
    const tk = peek();
    if (tk && (tk.t === '+' || tk.t === '-')) { next(); const f = parseFactor(); return tk.t === '-' ? -f : f; }
    return parsePrimary();
  }
  function parsePrimary() {
    const tk = next();
    if (!tk) return 0;
    if (tk.t === 'num') return num(tk.v);
    if (tk.t === '(') { const v = parseExpr(); if (peek() && peek().t === ')') next(); return v; }
    if (tk.t === 'id') {
      // function call
      if (peek() && peek().t === '(') {
        next();
        const args = [];
        if (!(peek() && peek().t === ')')) {
          args.push(parseExpr());
          while (peek() && peek().t === ',') { next(); args.push(parseExpr()); }
        }
        if (peek() && peek().t === ')') next();
        const fn = CALC_FNS[tk.v];
        return fn ? num(fn(...args)) : 0;
      }
      // identifier lookup in scope
      return num(scope[tk.v]);
    }
    return 0;
  }
  const out = parseExpr();
  return typeof out === 'number' && isFinite(out) ? out : 0;
}

/* Compute every output of a calculator spec given an input-value map.
   Outputs can reference input keys AND previously-computed output keys
   (left to right), so authors can chain. Returns { key: number }. */
export function computeCalc(spec, values) {
  const scope = {};
  for (const inp of spec.inputs || []) {
    const raw = values && values[inp.key] != null ? values[inp.key] : inp.default;
    const n = typeof raw === 'number' ? raw : parseFloat(raw);
    scope[inp.key] = isFinite(n) ? n : 0;
  }
  const out = {};
  for (const o of spec.outputs || []) {
    scope[o.key] = evalCalcExpr(o.expr, scope);
    out[o.key] = scope[o.key];
  }
  return out;
}

/* ---------- value formatting (shared) ---------- */
function groupThousands(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function formatValue(n, format, opts = {}) {
  const { prefix = '', suffix = '', unit = '' } = opts;
  let value = typeof n === 'number' ? n : parseFloat(n);
  if (!isFinite(value)) value = 0;
  let body;
  let fmt = format || 'number';
  let decimals = 0;
  const m = /^decimal:(\d+)$/.exec(fmt);
  if (m) { fmt = 'decimal'; decimals = parseInt(m[1], 10); }
  if (fmt === 'currency') {
    const neg = value < 0; const abs = Math.abs(value);
    body = '$' + groupThousands(abs.toFixed(0));
    if (neg) body = '-' + body;
  } else if (fmt === 'currency2') {
    const neg = value < 0; const abs = Math.abs(value);
    const [ip, dp] = abs.toFixed(2).split('.');
    body = '$' + groupThousands(ip) + '.' + dp;
    if (neg) body = '-' + body;
  } else if (fmt === 'percent') {
    body = (Math.round(value * 10) / 10).toString() + '%';
  } else if (fmt === 'decimal') {
    const [ip, dp] = value.toFixed(decimals).split('.');
    body = groupThousands(ip) + (dp ? '.' + dp : '');
  } else { // number
    body = groupThousands(Math.round(value).toString());
  }
  return `${prefix}${body}${suffix}${unit ? ' ' + unit : ''}`;
}

/* ============================================================
   JSON-LD BUILDERS  (reusable by prerender + React page)
   ============================================================ */
export function jugArticleLd(entry) {
  const { title, description } = metaForJug(entry);
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description, about: entry.title,
    author: { '@type': 'Organization', name: entry.author || BRAND },
    publisher: { '@type': 'Organization', name: BRAND },
    datePublished: entry.published || entry.updated || '2026-07-13',
    dateModified: entry.updated || entry.published || '2026-07-13',
    mainEntityOfPage: guideCanonical(entry.slug),
    ...(entry.ogImage ? { image: entry.ogImage } : {}),
  };
}

export function jugBreadcrumbLd(entry) {
  const trail = [
    { name: 'Home', href: '/' },
    { name: 'Guides', href: GUIDES_BASE },
  ];
  if (entry.category) trail.push({ name: entry.category });
  trail.push({ name: entry.h1 || entry.title });
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name,
      item: t.href ? (t.href.startsWith('http') ? t.href : SITE + t.href) : undefined,
    })),
  };
}

export function jugFaqLd(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: list.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function jugHowToLd(howto) {
  if (!howto || !Array.isArray(howto.steps) || !howto.steps.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'HowTo',
    name: howto.name || 'How to',
    ...(howto.description ? { description: howto.description } : {}),
    step: howto.steps.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1,
      name: s.name || s.title || `Step ${i + 1}`,
      text: Array.isArray(s.text || s.body) ? asArray(s.text || s.body).join(' ') : (s.text || s.body || ''),
    })),
  };
}

/* Pull the first faq block + first howto-eligible steps block for schema. */
function firstFaqItems(entry) {
  if (Array.isArray(entry.faqs) && entry.faqs.length) return entry.faqs;
  const b = (entry.blocks || []).find((x) => x && x.type === 'faq' && Array.isArray(x.items));
  return b ? b.items : null;
}
function howToFrom(entry) {
  if (entry.howto && entry.howto.steps) return entry.howto;
  const b = (entry.blocks || []).find((x) => x && x.type === 'steps' && x.schema !== false && Array.isArray(x.steps));
  if (!b) return null;
  return { name: b.title || entry.title, steps: b.steps.map((s) => ({ name: s.title, text: s.body })) };
}

export function jsonLdForJuggernaut(entry) {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE,
      description: 'The AI-native revenue platform and CRM. Run your revenue on Ardovo.' },
    jugBreadcrumbLd(entry),
    jugArticleLd(entry),
    jugFaqLd(firstFaqItems(entry)),
    jugHowToLd(howToFrom(entry)),
  ].filter(Boolean);
}

/* ============================================================
   DIAGRAM RENDERERS  (deterministic inline SVG, theme-aware)
   All colors come from the marketing --m-* tokens so light and
   dark surfaces both read correctly. aria-hidden, decorative.
   ============================================================ */
function svgFlow(data) {
  const nodes = (data.nodes || []).slice(0, 6);
  if (!nodes.length) return '';
  const W = 120, GAP = 34, H = 120;
  const total = nodes.length * W + (nodes.length - 1) * GAP;
  let x = 0;
  const parts = nodes.map((n, i) => {
    const cx = x + W / 2;
    const rect = `<rect x="${x}" y="34" width="${W}" height="52" rx="12" fill="var(--m-bg2)" stroke="var(--m-line2)"/>`
      + `<text x="${cx}" y="${n.sub ? 60 : 65}" text-anchor="middle" fill="var(--m-ink)" font-size="13" font-weight="700">${esc(truncate(n.label, 15))}</text>`
      + (n.sub ? `<text x="${cx}" y="76" text-anchor="middle" fill="var(--m-ink3)" font-size="10">${esc(truncate(n.sub, 18))}</text>` : '');
    let arrow = '';
    if (i < nodes.length - 1) {
      const ax = x + W, ax2 = x + W + GAP;
      arrow = `<line x1="${ax}" y1="60" x2="${ax2 - 6}" y2="60" stroke="var(--m-accent)" stroke-width="2"/>`
        + `<path d="M${ax2 - 8} 55 L${ax2} 60 L${ax2 - 8} 65 Z" fill="var(--m-accent)"/>`;
    }
    x += W + GAP;
    return rect + arrow;
  }).join('');
  return `<svg class="jug-svg" viewBox="0 0 ${total} ${H}" role="img" aria-hidden="true" preserveAspectRatio="xMinYMid meet">${parts}</svg>`;
}
function svgFunnel(data) {
  const stages = (data.stages || []).slice(0, 6);
  if (!stages.length) return '';
  const max = Math.max(...stages.map((s) => Number(s.value) || 0), 1);
  const W = 460, rowH = 46, pad = 8;
  const H = stages.length * (rowH + pad) + pad;
  const parts = stages.map((s, i) => {
    const w = Math.max(70, Math.round((Number(s.value) || 0) / max * W));
    const y = pad + i * (rowH + pad);
    const xoff = (W - w) / 2;
    const pct = s.pct != null ? s.pct : Math.round((Number(s.value) || 0) / max * 100);
    return `<rect x="${xoff}" y="${y}" width="${w}" height="${rowH}" rx="9" fill="var(--m-accent)" opacity="${(1 - i * 0.12).toFixed(2)}"/>`
      + `<text x="${W / 2}" y="${y + 22}" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">${esc(truncate(s.label, 26))}</text>`
      + `<text x="${W / 2}" y="${y + 38}" text-anchor="middle" fill="#fff" font-size="11" opacity="0.9">${esc(String(s.value))} (${pct}%)</text>`;
  }).join('');
  return `<svg class="jug-svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${parts}</svg>`;
}
function svgArchitecture(data) {
  const layers = (data.layers || []).slice(0, 5);
  if (!layers.length) return '';
  const W = 480, rowH = 66, pad = 12;
  const H = layers.length * (rowH + pad) + pad;
  const parts = layers.map((L, i) => {
    const y = pad + i * (rowH + pad);
    const nodes = (L.nodes || []).slice(0, 5);
    const nW = nodes.length ? Math.floor((W - 150 - (nodes.length - 1) * 8) / nodes.length) : 0;
    const chips = nodes.map((n, j) => {
      const x = 150 + j * (nW + 8);
      return `<rect x="${x}" y="${y + 16}" width="${nW}" height="${rowH - 32}" rx="8" fill="var(--m-bg)" stroke="var(--m-line2)"/>`
        + `<text x="${x + nW / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" fill="var(--m-ink)" font-size="11" font-weight="600">${esc(truncate(n, Math.max(6, Math.floor(nW / 8))))}</text>`;
    }).join('');
    return `<rect x="0" y="${y}" width="${W}" height="${rowH}" rx="12" fill="var(--m-bg2)" stroke="var(--m-line)"/>`
      + `<text x="16" y="${y + rowH / 2 + 4}" fill="var(--m-accent)" font-size="12" font-weight="800">${esc(truncate(L.label, 16))}</text>`
      + chips;
  }).join('');
  return `<svg class="jug-svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${parts}</svg>`;
}
function svgComparisonBars(data) {
  const bars = (data.bars || []).slice(0, 8);
  if (!bars.length) return '';
  const max = Math.max(...bars.map((b) => Number(b.value) || 0), 1);
  const W = 480, rowH = 34, pad = 10, labelW = 130;
  const H = bars.length * (rowH + pad) + pad;
  const parts = bars.map((b, i) => {
    const y = pad + i * (rowH + pad);
    const w = Math.max(4, Math.round((Number(b.value) || 0) / max * (W - labelW - 60)));
    const fill = b.highlight ? 'var(--m-accent)' : 'var(--m-accent2)';
    return `<text x="0" y="${y + rowH / 2 + 4}" fill="var(--m-ink2)" font-size="12" font-weight="600">${esc(truncate(b.label, 18))}</text>`
      + `<rect x="${labelW}" y="${y + 6}" width="${W - labelW - 60}" height="${rowH - 12}" rx="6" fill="var(--m-line)"/>`
      + `<rect x="${labelW}" y="${y + 6}" width="${w}" height="${rowH - 12}" rx="6" fill="${fill}"/>`
      + `<text x="${W - 52}" y="${y + rowH / 2 + 4}" fill="var(--m-ink)" font-size="12" font-weight="700">${esc(b.display != null ? b.display : b.value)}</text>`;
  }).join('');
  return `<svg class="jug-svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${parts}</svg>`;
}
function svgTimeline(data) {
  const ms = (data.milestones || []).slice(0, 7);
  if (!ms.length) return '';
  const W = 480, rowH = 58, pad = 6, lineX = 90;
  const H = ms.length * (rowH + pad) + pad;
  let parts = `<line x1="${lineX}" y1="10" x2="${lineX}" y2="${H - 10}" stroke="var(--m-line2)" stroke-width="2"/>`;
  parts += ms.map((m, i) => {
    const y = pad + i * (rowH + pad) + rowH / 2;
    return `<circle cx="${lineX}" cy="${y}" r="7" fill="var(--m-accent)"/>`
      + (m.date ? `<text x="${lineX - 16}" y="${y + 4}" text-anchor="end" fill="var(--m-ink3)" font-size="11" font-weight="700">${esc(truncate(m.date, 10))}</text>` : '')
      + `<text x="${lineX + 18}" y="${y - 2}" fill="var(--m-ink)" font-size="13" font-weight="700">${esc(truncate(m.label, 34))}</text>`
      + (m.body ? `<text x="${lineX + 18}" y="${y + 15}" fill="var(--m-ink3)" font-size="11">${esc(truncate(m.body, 44))}</text>` : '');
  }).join('');
  return `<svg class="jug-svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${parts}</svg>`;
}
function truncate(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1).trimEnd() + '.' : s; }

export function renderDiagram(block) {
  const d = block.data || {};
  let svg = '';
  switch (block.variant) {
    case 'flow': svg = svgFlow(d); break;
    case 'funnel': svg = svgFunnel(d); break;
    case 'architecture': svg = svgArchitecture(d); break;
    case 'comparison-bars': svg = svgComparisonBars(d); break;
    case 'timeline': svg = svgTimeline(d); break;
    default: svg = svgFlow(d);
  }
  return `<figure class="jug-diagram" data-variant="${esc(block.variant || 'flow')}">`
    + (block.title ? `<figcaption class="jug-diagram-title">${esc(block.title)}</figcaption>` : '')
    + `<div class="jug-diagram-canvas">${svg}</div>`
    + (block.caption ? `<figcaption class="jug-diagram-caption">${esc(block.caption)}</figcaption>` : '')
    + `</figure>`;
}

/* ---------- cell rendering for matrices ---------- */
function matrixCell(v) {
  if (v === true) return `<span class="jug-cell-yes" aria-label="Yes">Yes</span>`;
  if (v === false) return `<span class="jug-cell-no" aria-label="No">No</span>`;
  if (v === 'partial' || v === 'partial') return `<span class="jug-cell-partial" aria-label="Partial">Partial</span>`;
  return `<span class="jug-cell-text">${esc(v)}</span>`;
}

/* ============================================================
   BLOCK -> STATIC HTML
   ============================================================ */
export function renderBlock(block, entry, i) {
  if (!block || !block.type) return '';
  const id = blockAnchor(block, i);
  const H = block.level === 3 ? 'h3' : 'h2';
  const head = (title) => title
    ? `<${H} id="${esc(id)}" class="jug-h">${block.eyebrow ? `<span class="jug-eyebrow">${esc(block.eyebrow)}</span>` : ''}${esc(title)}</${H}>`
    : '';

  switch (block.type) {
    case 'richText':
      return `<section class="jug-block jug-richtext">${head(block.title)}${paras(block.body, block.lead ? 'jug-lead' : 'jug-p')}</section>`;

    case 'heading':
      return `<${block.level === 3 ? 'h3' : 'h2'} id="${esc(id)}" class="jug-h jug-standalone">${block.eyebrow ? `<span class="jug-eyebrow">${esc(block.eyebrow)}</span>` : ''}${esc(block.text)}</${block.level === 3 ? 'h3' : 'h2'}>`;

    case 'diagram':
      return `<section class="jug-block" id="${esc(id)}">${renderDiagram(block)}</section>`;

    case 'stat':
    case 'animatedStat': {
      const items = block.stats || [block];
      const cards = items.map((s) => {
        const isNum = typeof s.value === 'number';
        const display = isNum
          ? formatValue(s.value, s.format, { prefix: s.prefix, suffix: s.suffix, unit: s.unit })
          : `${s.prefix || ''}${esc(s.value)}${s.suffix || ''}`;
        const attrs = (block.type === 'animatedStat' && isNum)
          ? ` data-countup="1" data-value="${s.value}" data-format="${esc(s.format || 'number')}"`
            + ` data-prefix="${esc(s.prefix || '')}" data-suffix="${esc(s.suffix || '')}" data-unit="${esc(s.unit || '')}"`
          : '';
        return `<div class="jug-stat"${attrs}>`
          + `<div class="jug-stat-value">${isNum ? esc(display) : display}</div>`
          + `<div class="jug-stat-label">${esc(s.label || '')}</div>`
          + (s.trend ? `<div class="jug-stat-trend jug-trend-${esc(s.trendDir || 'up')}">${esc(s.trend)}</div>` : '')
          + `</div>`;
      }).join('');
      return `<section class="jug-block" id="${esc(id)}">${head(block.title)}<div class="jug-stat-row">${cards}</div></section>`;
    }

    case 'calculator': {
      const defaults = {};
      for (const inp of block.inputs || []) defaults[inp.key] = inp.default;
      const results = computeCalc(block, defaults);
      const inputRows = (block.inputs || []).map((inp) => {
        const val = inp.default;
        const shown = inp.type === 'select'
          ? (((inp.options || []).find((o) => (o.value ?? o) === val) || {}).label || val)
          : `${val}${inp.unit ? ' ' + inp.unit : ''}`;
        return `<div class="jug-calc-input" data-key="${esc(inp.key)}"><span class="jug-calc-in-label">${esc(inp.label)}</span>`
          + `<span class="jug-calc-in-value">${esc(shown)}</span></div>`;
      }).join('');
      const outRows = (block.outputs || []).map((o) => {
        const display = formatValue(results[o.key], o.format, { prefix: o.prefix, suffix: o.suffix, unit: o.unit });
        return `<tr${o.highlight ? ' class="is-key"' : ''}><th scope="row">${esc(o.label)}</th>`
          + `<td data-out="${esc(o.key)}">${esc(display)}</td></tr>`;
      }).join('');
      // JSON spec for the React page + any external hydration. < escaped.
      const spec = ldSafe({ inputs: block.inputs || [], outputs: block.outputs || [], title: block.title || '' });
      return `<section class="jug-block jug-calculator" id="${esc(id)}" data-jug-calc="1">`
        + head(block.title)
        + (block.intro ? paras(block.intro, 'jug-p') : '')
        + `<div class="jug-calc-shell">`
        + `<div class="jug-calc-inputs" aria-hidden="false">${inputRows}</div>`
        + `<table class="jug-calc-outputs"><caption>Results at default values</caption><tbody>${outRows}</tbody></table>`
        + `</div>`
        + `<script type="application/json" class="jug-calc-spec">${spec}</script>`
        + `</section>`;
    }

    case 'comparisonMatrix': {
      const cols = block.columns || [];
      const hc = block.highlightCol;
      const thead = `<thead><tr><th scope="col">${esc(block.rowHeader || 'Capability')}</th>`
        + cols.map((c, i) => `<th scope="col"${i === hc ? ' class="is-key"' : ''}>${esc(c)}</th>`).join('') + `</tr></thead>`;
      const tbody = `<tbody>${(block.rows || []).map((r) => `<tr><th scope="row">${esc(r.feature)}</th>`
        + (r.cells || []).map((v, i) => `<td${i === hc ? ' class="is-key"' : ''}>${matrixCell(v)}</td>`).join('') + `</tr>`).join('')}</tbody>`;
      return `<section class="jug-block" id="${esc(id)}">${head(block.title)}<div class="jug-matrix-scroll"><table class="jug-matrix">${thead}${tbody}</table></div>`
        + (block.footnote ? `<p class="jug-footnote">${esc(block.footnote)}</p>` : '') + `</section>`;
    }

    case 'prosCons':
      return `<section class="jug-block jug-proscons" id="${esc(id)}">${head(block.title)}<div class="jug-pc-grid">`
        + `<div class="jug-pc jug-pc-pro"><div class="jug-pc-head">${esc(block.prosLabel || 'Pros')}</div><ul>${(block.pros || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`
        + `<div class="jug-pc jug-pc-con"><div class="jug-pc-head">${esc(block.consLabel || 'Cons')}</div><ul>${(block.cons || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`
        + `</div></section>`;

    case 'steps': {
      const tag = block.ordered === false ? 'ul' : 'ol';
      const items = (block.steps || []).map((s) => `<li class="jug-step"><div class="jug-step-title">${esc(s.title)}</div>${paras(s.body, 'jug-p')}${s.detail ? `<div class="jug-step-detail">${esc(s.detail)}</div>` : ''}</li>`).join('');
      return `<section class="jug-block" id="${esc(id)}">${head(block.title)}<${tag} class="jug-steps">${items}</${tag}></section>`;
    }

    case 'quote':
      return `<figure class="jug-block jug-quote" id="${esc(id)}"><blockquote>${esc(block.text)}</blockquote>`
        + (block.cite ? `<figcaption>${esc(block.cite)}${block.role ? `, ${esc(block.role)}` : ''}</figcaption>` : '') + `</figure>`;

    case 'callout':
      return `<aside class="jug-block jug-callout jug-tone-${esc(block.tone || 'accent')}" id="${esc(id)}">`
        + (block.title ? `<div class="jug-callout-title">${esc(block.title)}</div>` : '')
        + paras(block.body, 'jug-p') + `</aside>`;

    case 'faq':
      return `<section class="jug-block jug-faq" id="${esc(id)}">${head(block.title || 'Frequently asked questions')}<div class="jug-faq-list">`
        + (block.items || []).map((f) => `<details class="jug-faq-item"><summary>${esc(f.q)}</summary><div class="jug-faq-a">${paras(f.a, 'jug-p')}</div></details>`).join('')
        + `</div></section>`;

    default:
      return '';
  }
}

/* ---------- table of contents ---------- */
function tocFor(entry) {
  const items = [];
  (entry.blocks || []).forEach((b, i) => {
    const title = b && (b.type === 'heading' ? b.text : b.title);
    if (title && (b.level || 2) === 2) items.push({ id: blockAnchor(b, i), title });
  });
  if (items.length < 3) return '';
  return `<nav class="jug-toc" aria-label="On this page"><div class="jug-toc-head">On this page</div><ol>`
    + items.map((t) => `<li><a href="#${esc(t.id)}">${esc(t.title)}</a></li>`).join('') + `</ol></nav>`;
}

/* ---------- full body ---------- */
export function renderJuggernautBody(entry) {
  const trail = ['Home', 'Guides'].concat(entry.category ? [entry.category] : []).concat([entry.h1 || entry.title]);
  let h = `<nav class="jug-breadcrumb" aria-label="Breadcrumb">`
    + trail.map((t, i) => i < trail.length - 1
      ? `<a href="${i === 0 ? '/' : i === 1 ? GUIDES_BASE : GUIDES_BASE}">${esc(t)}</a> <span class="jug-bc-sep">/</span> `
      : `<span aria-current="page">${esc(t)}</span>`).join('') + `</nav>`;

  h += `<header class="jug-hero">`;
  if (entry.eyebrow || entry.category) h += `<div class="jug-eyebrow">${esc(entry.eyebrow || entry.category)}</div>`;
  h += `<h1 class="jug-title">${esc(entry.h1 || entry.title)}</h1>`;
  if (entry.intro) h += paras(entry.intro, 'jug-lead');
  const metaBits = [];
  if (entry.readingTime) metaBits.push(entry.readingTime);
  if (entry.updated) metaBits.push(`Updated ${entry.updated}`);
  if (entry.author) metaBits.push(`By ${entry.author}`);
  if (metaBits.length) h += `<div class="jug-meta">${metaBits.map((m) => `<span>${esc(m)}</span>`).join('<span class="jug-meta-dot">.</span>')}</div>`;
  if (Array.isArray(entry.heroStats) && entry.heroStats.length) {
    h += `<div class="jug-hero-stats">` + entry.heroStats.map((s) => {
      const isNum = typeof s.value === 'number';
      const display = isNum ? formatValue(s.value, s.format, { prefix: s.prefix, suffix: s.suffix, unit: s.unit }) : `${s.prefix || ''}${esc(s.value)}${s.suffix || ''}`;
      return `<div class="jug-hero-stat"><div class="jug-hero-stat-value">${isNum ? esc(display) : display}</div><div class="jug-hero-stat-label">${esc(s.label || '')}</div></div>`;
    }).join('') + `</div>`;
  }
  h += `</header>`;

  if (entry.toc !== false) h += tocFor(entry);

  h += `<div class="jug-body">`;
  (entry.blocks || []).forEach((b, i) => { h += renderBlock(b, entry, i); });
  h += `</div>`;

  if (Array.isArray(entry.related) && entry.related.length) {
    h += `<section class="jug-block jug-related"><h2 class="jug-h">Keep reading</h2><ul>`
      + entry.related.map((r) => {
        const slug = typeof r === 'string' ? r : r.slug;
        const label = typeof r === 'string' ? r : (r.title || r.slug);
        return `<li><a href="${GUIDES_BASE}/${esc(slug)}">${esc(label)}</a></li>`;
      }).join('') + `</ul></section>`;
  }

  h += `<section class="jug-block jug-cta"><h2 class="jug-h">Run your revenue on Ardovo</h2>`
    + `<p class="jug-p">Everything alive on first load. Ask Rook and it does the work.</p>`
    + `<p><a class="jug-cta-btn" href="/app">Get started free</a> <a class="jug-cta-link" href="${GUIDES_BASE}">Browse all guides</a></p></section>`;
  return h;
}

/* ---------- head tags string (for prerender) ---------- */
export function renderJuggernautHead(entry) {
  const { title, description } = metaForJug(entry);
  const canonical = guideCanonical(entry.slug);
  const ld = jsonLdForJuggernaut(entry);
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    entry.ogImage ? `<meta property="og:image" content="${esc(entry.ogImage)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    entry.ogImage ? `<meta name="twitter:image" content="${esc(entry.ogImage)}" />` : '',
    ...ld.map((g) => `<script type="application/ld+json">${ldSafe(g)}</script>`),
  ].filter(Boolean).join('\n    ');
}

/* ---------- full document (shell -> HTML), mirrors pageHtml() ---------- */
export function renderJuggernautDocument(shell, entry) {
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, renderJuggernautHead(entry))
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-prerender mkt-wrap jug-wrap">${renderJuggernautBody(entry)}</main></div>`);
}
