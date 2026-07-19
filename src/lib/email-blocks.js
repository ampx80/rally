// ============================================================
// ARDOVO EMAIL BLOCK MODEL + RENDERER
//
// A best-in-class visual email is a BLOCK document that renders to email-safe,
// responsive HTML (nested tables, inline styles, 600px container) - not a canvas
// PNG. This is the core IP behind Ardova's drag-drop email builder: the same doc
// powers the editor preview and the real send (api/broadcast.js sends the
// rendered full-document HTML verbatim through the hardened Resend primitive).
//
// Merge tokens {firstName} / {company} are left verbatim in text; the send route
// interpolates them per recipient (mirrors marketing-campaigns.applyTokens).
//
// Block types: heading, text, button, image, divider, spacer, columns (2-up),
// social. Columns hold one simple element per side (text | image | button).
// ASCII only. NO em-dash / en-dash.
// ============================================================

let _idc = 1;
const nid = () => `b_${Date.now().toString(36)}_${(_idc++).toString(36)}`;

export const DEFAULT_SETTINGS = {
  bg: '#eef1f6',          // page background behind the email
  contentBg: '#ffffff',   // the email card
  contentWidth: 600,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  textColor: '#1a2030',
  linkColor: '#5b4bf5',
  accent: '#5b4bf5',
  preheader: '',
};

// Palette metadata for the builder "add block" menu.
export const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: 'fileText' },
  { type: 'text', label: 'Text', icon: 'list' },
  { type: 'button', label: 'Button', icon: 'bolt' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'columns', label: 'Two columns', icon: 'columns' },
  { type: 'divider', label: 'Divider', icon: 'more' },
  { type: 'spacer', label: 'Spacer', icon: 'move' },
  { type: 'social', label: 'Social', icon: 'share2' },
];

export function makeBlock(type) {
  const base = { id: nid(), type };
  switch (type) {
    case 'heading': return { ...base, text: 'Your headline here', level: 'h1', align: 'left', color: '', size: 26 };
    case 'text': return { ...base, text: 'Write your message here. Use {firstName} to personalize.', align: 'left', color: '', size: 15 };
    case 'button': return { ...base, text: 'Get started', href: 'https://', align: 'left', bg: '', color: '#ffffff', radius: 10 };
    case 'image': return { ...base, src: '', href: '', alt: 'Image', align: 'center', width: 100 };
    case 'divider': return { ...base, color: '#e5e9ef', thickness: 1 };
    case 'spacer': return { ...base, height: 24 };
    case 'social': return { ...base, align: 'center', links: [{ platform: 'x', href: 'https://' }, { platform: 'linkedin', href: 'https://' }, { platform: 'web', href: 'https://' }] };
    case 'columns': return { ...base, left: { type: 'text', text: 'Left column. {firstName}, here is the first point.', align: 'left', size: 15, color: '' }, right: { type: 'text', text: 'Right column. And the second point here.', align: 'left', size: 15, color: '' } };
    default: return base;
  }
}

export function blankEmailDoc() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    blocks: [
      makeBlock('heading'),
      makeBlock('text'),
      makeBlock('button'),
    ],
  };
}

/* ---------- escaping ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Attribute-safe URL: allow http(s)/mailto/tel + merge tokens; strip javascript:
function safeUrl(u) {
  const s = String(u || '').trim();
  if (/^javascript:/i.test(s)) return '#';
  return esc(s);
}
function textToHtml(t) {
  return esc(t).replace(/\r\n/g, '\n').split(/\n{2,}/).map(p => p.replace(/\n/g, '<br/>')).filter(x => x.length).join('</p><p style="margin:0 0 14px;">');
}

const SOCIAL_META = {
  x: { label: 'X', bg: '#0b0d14' }, twitter: { label: 'X', bg: '#0b0d14' },
  linkedin: { label: 'in', bg: '#0a66c2' }, facebook: { label: 'f', bg: '#1877f2' },
  instagram: { label: 'IG', bg: '#c13584' }, youtube: { label: 'YT', bg: '#ff0000' },
  web: { label: 'W', bg: '#5b4bf5' }, github: { label: 'GH', bg: '#24292e' },
};

/* ---------- render a single simple element (used top-level + in columns) ---------- */
function renderElement(el, s) {
  const font = s.fontFamily;
  const align = el.align || 'left';
  switch (el.type) {
    case 'heading': {
      const size = el.level === 'h2' ? (el.size || 20) : (el.size || 26);
      const color = el.color || s.textColor;
      return `<h1 style="margin:0;font-family:${font};font-size:${size}px;line-height:1.25;font-weight:800;color:${color};text-align:${align};letter-spacing:-0.01em;">${esc(el.text)}</h1>`;
    }
    case 'text': {
      const size = el.size || 15;
      const color = el.color || s.textColor;
      return `<div style="font-family:${font};font-size:${size}px;line-height:1.62;color:${color};text-align:${align};"><p style="margin:0 0 14px;">${textToHtml(el.text)}</p></div>`;
    }
    case 'button': {
      const bg = el.bg || s.accent;
      const color = el.color || '#ffffff';
      const radius = el.radius == null ? 10 : el.radius;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="margin:${align === 'center' ? '0 auto' : '0'};"><tr><td style="border-radius:${radius}px;background:${bg};">
        <a href="${safeUrl(el.href)}" style="display:inline-block;padding:13px 26px;font-family:${font};font-size:15px;font-weight:700;color:${color};text-decoration:none;border-radius:${radius}px;">${esc(el.text)}</a>
      </td></tr></table>`;
    }
    case 'image': {
      const w = Math.max(10, Math.min(100, Number(el.width) || 100));
      const img = `<img src="${safeUrl(el.src)}" alt="${esc(el.alt)}" width="${Math.round((s.contentWidth - 64) * w / 100)}" style="display:block;width:${w}%;max-width:100%;height:auto;border:0;outline:none;border-radius:8px;${align === 'center' ? 'margin:0 auto;' : align === 'right' ? 'margin-left:auto;' : ''}"/>`;
      const wrapped = el.href ? `<a href="${safeUrl(el.href)}" style="text-decoration:none;">${img}</a>` : img;
      if (!el.src) return `<div style="font-family:${font};font-size:13px;color:#9aa0b4;text-align:${align};padding:20px;border:1px dashed #cfd5e2;border-radius:8px;">Image placeholder (add an image URL)</div>`;
      return `<div style="text-align:${align};">${wrapped}</div>`;
    }
    case 'divider':
      return `<div style="border-top:${Math.max(1, el.thickness || 1)}px solid ${el.color || '#e5e9ef'};font-size:0;line-height:0;">&nbsp;</div>`;
    case 'spacer':
      return `<div style="height:${Math.max(1, Number(el.height) || 24)}px;font-size:0;line-height:0;">&nbsp;</div>`;
    case 'social': {
      const links = Array.isArray(el.links) ? el.links : [];
      const chips = links.map(l => {
        const m = SOCIAL_META[(l.platform || 'web').toLowerCase()] || SOCIAL_META.web;
        return `<a href="${safeUrl(l.href)}" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:${m.bg};color:#fff;border-radius:8px;text-decoration:none;font-family:${font};font-size:13px;font-weight:700;margin:0 4px;">${esc(m.label)}</a>`;
      }).join('');
      return `<div style="text-align:${align};">${chips}</div>`;
    }
    default:
      return '';
  }
}

/* ---------- render the full email document ---------- */
export function renderEmailHtml(doc, opts = {}) {
  const s = { ...DEFAULT_SETTINGS, ...(doc?.settings || {}) };
  const blocks = Array.isArray(doc?.blocks) ? doc.blocks : [];
  const cw = Math.max(320, Math.min(700, Number(s.contentWidth) || 600));
  const pad = 32;

  const rowsHtml = blocks.map((b) => {
    if (b.type === 'columns') {
      const left = renderElement({ ...b.left, align: b.left?.align || 'left' }, s);
      const right = renderElement({ ...b.right, align: b.right?.align || 'left' }, s);
      return `<tr><td style="padding:10px ${pad}px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="top" width="50%" style="padding-right:12px;">${left}</td>
          <td valign="top" width="50%" style="padding-left:12px;">${right}</td>
        </tr></table>
      </td></tr>`;
    }
    if (b.type === 'spacer' || b.type === 'divider') {
      return `<tr><td style="padding:6px ${pad}px;">${renderElement(b, s)}</td></tr>`;
    }
    return `<tr><td style="padding:10px ${pad}px;">${renderElement(b, s)}</td></tr>`;
  }).join('');

  const pre = s.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${s.bg};font-size:1px;line-height:1px;">${esc(s.preheader)}</div>`
    : '';

  const footer = opts.unsubscribeHtml || '';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${esc(opts.subject || 'Email')}</title>
</head>
<body style="margin:0;padding:0;background:${s.bg};font-family:${s.fontFamily};">
${pre}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${s.bg};">
  <tr><td align="center" style="padding:28px 12px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${cw}" style="width:100%;max-width:${cw}px;background:${s.contentBg};border-radius:16px;overflow:hidden;border:1px solid #e5e9ef;">
      <tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      ${rowsHtml}
      <tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    ${footer}
  </td></tr>
</table>
</body></html>`;
}

/* ---------- plain-text alternative ---------- */
export function emailToText(doc) {
  const blocks = Array.isArray(doc?.blocks) ? doc.blocks : [];
  const line = (el) => {
    if (!el) return '';
    switch (el.type) {
      case 'heading': return `${el.text}\n`;
      case 'text': return `${el.text}\n`;
      case 'button': return `${el.text}: ${el.href}\n`;
      case 'image': return el.alt ? `[${el.alt}]\n` : '';
      case 'social': return (el.links || []).map(l => l.href).filter(Boolean).join('  ') + '\n';
      default: return '';
    }
  };
  const out = [];
  for (const b of blocks) {
    if (b.type === 'columns') { out.push(line(b.left)); out.push(line(b.right)); }
    else if (b.type === 'divider' || b.type === 'spacer') out.push('');
    else out.push(line(b));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- starter templates ---------- */
export const EMAIL_TEMPLATES = [
  {
    id: 'announce', name: 'Product announcement', preview: 'Headline, story, CTA',
    build: () => ({
      version: 1, settings: { ...DEFAULT_SETTINGS },
      blocks: [
        { ...makeBlock('heading'), text: '{firstName}, something new from Ardovo', size: 27 },
        { ...makeBlock('text'), text: 'We just shipped something we think your team at {company} will love. Here is the short version and where to see it in action.' },
        { ...makeBlock('button'), text: 'See what is new', href: 'https://', align: 'left' },
        { ...makeBlock('divider') },
        { ...makeBlock('text'), text: 'Questions? Just reply to this email - a real person reads every one.', size: 14, color: '#6b7085' },
      ],
    }),
  },
  {
    id: 'newsletter', name: 'Two-column update', preview: 'Header + 2 columns + social',
    build: () => ({
      version: 1, settings: { ...DEFAULT_SETTINGS },
      blocks: [
        { ...makeBlock('heading'), text: 'The monthly update', size: 26, align: 'center' },
        { ...makeBlock('text'), text: 'Hi {firstName}, here is what happened this month and what is next.', align: 'center' },
        { ...makeBlock('columns') },
        { ...makeBlock('divider') },
        { ...makeBlock('social'), align: 'center' },
      ],
    }),
  },
  {
    id: 'plain', name: 'Simple letter', preview: 'Clean text + one button',
    build: () => ({
      version: 1, settings: { ...DEFAULT_SETTINGS, contentBg: '#ffffff' },
      blocks: [
        { ...makeBlock('text'), text: 'Hi {firstName},\n\nI wanted to reach out personally about {company}. We have been helping teams like yours run a tighter revenue motion, and I think there is a real fit here.\n\nWorth a 15-minute conversation?', size: 16 },
        { ...makeBlock('button'), text: 'Grab a time', href: 'https://', align: 'left' },
        { ...makeBlock('text'), text: 'Best,\nThe Ardovo team', size: 15, color: '#6b7085' },
      ],
    }),
  },
];

export function templateById(id) {
  const t = EMAIL_TEMPLATES.find(x => x.id === id);
  return t ? t.build() : blankEmailDoc();
}

// ============================================================
// SHARED DESIGNER  (Engine 6: Marketing Hub unification)
// ------------------------------------------------------------
// renderDoc is the single render entry point for the block-model
// designer across every channel. It keeps email output byte-for-byte
// identical (delegates straight to renderEmailHtml) while adding a
// full-width, browser-native LANDING renderer that speaks the exact
// same block vocabulary (heading, text, button, image, columns,
// divider, spacer, social). One document, one editor, two channels.
//
// Contract:
//   renderDoc(doc, opts?) -> string
//     opts.target = 'email'   (default) -> renderEmailHtml(doc, opts)
//                                           UNCHANGED email-safe HTML.
//     opts.target = 'landing' -> a responsive landing-page render.
//       opts.fragment = true  -> returns ONLY the inner content HTML
//                                 (no <!doctype>/<html>/<body>), for
//                                 inline injection into a React host
//                                 (see marketing/HostedLanding.jsx).
//       opts.fragment = false -> returns a full standalone HTML
//                                 document (used by the builder's
//                                 live-preview iframe).
// The same `doc.settings` drive both channels; landing widens the
// container (default 960px), floors the page background, and treats
// the first heading as a hero. ASCII only. NO em-dash / en-dash.
// ============================================================

// Landing pages are wider than email. A doc authored for landing may
// carry its own settings.contentWidth; otherwise we floor it wide.
const LANDING_DEFAULT_WIDTH = 960;

function landingSettings(doc) {
  const s = { ...DEFAULT_SETTINGS, ...(doc?.settings || {}) };
  // Only widen when the author has not deliberately set a wide width.
  const cw = Number(s.contentWidth) || 0;
  s.contentWidth = cw >= 700 ? cw : LANDING_DEFAULT_WIDTH;
  return s;
}

// Render one full-width landing row. Reuses renderElement so the block
// vocabulary and per-element styling are shared 1:1 with email. Spacers
// and dividers get tighter padding; a leading heading reads as a hero.
function renderLandingRow(b, s, index) {
  const padX = 'clamp(20px, 5vw, 56px)';
  if (b.type === 'columns') {
    const left = renderElement({ ...b.left, align: b.left?.align || 'left' }, s);
    const right = renderElement({ ...b.right, align: b.right?.align || 'left' }, s);
    return `<div style="padding:18px ${padX};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td valign="top" width="50%" style="padding-right:16px;">${left}</td>
        <td valign="top" width="50%" style="padding-left:16px;">${right}</td>
      </tr></table>
    </div>`;
  }
  if (b.type === 'spacer' || b.type === 'divider') {
    return `<div style="padding:8px ${padX};">${renderElement(b, s)}</div>`;
  }
  // A first-position heading renders larger (hero treatment) unless the
  // author fixed an explicit size.
  if (b.type === 'heading' && index === 0 && !b.size) {
    const hero = { ...b, size: b.level === 'h2' ? 34 : 48 };
    return `<div style="padding:clamp(28px, 6vw, 56px) ${padX} 12px;">${renderElement(hero, s)}</div>`;
  }
  return `<div style="padding:16px ${padX};">${renderElement(b, s)}</div>`;
}

// Full-width, responsive landing page from a block document.
export function renderLandingHtml(doc, opts = {}) {
  const s = landingSettings(doc);
  const blocks = Array.isArray(doc?.blocks) ? doc.blocks : [];
  const cw = Math.max(600, Math.min(1200, Number(s.contentWidth) || LANDING_DEFAULT_WIDTH));

  const rows = blocks.map((b, i) => renderLandingRow(b, s, i)).join('');
  const empty = blocks.length
    ? ''
    : `<div style="padding:64px 24px;text-align:center;color:#9aa0b4;font-family:${s.fontFamily};">This page has no content yet.</div>`;

  const inner = `<div class="ardovo-landing" style="max-width:${cw}px;margin:0 auto;background:${s.contentBg};border-radius:18px;overflow:hidden;box-shadow:0 30px 80px -40px rgba(13,17,23,.35);">
      ${rows || empty}
    </div>`;

  // Fragment: just the content, for inline injection into a React host.
  if (opts.fragment) {
    return `<div class="ardovo-landing-wrap" style="background:${s.bg};font-family:${s.fontFamily};color:${s.textColor};padding:clamp(20px, 5vw, 56px) 16px;box-sizing:border-box;">
      ${inner}
    </div>`;
  }

  // Standalone document, used by the builder's preview iframe.
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${esc(opts.subject || doc?.settings?.seoTitle || 'Landing page')}</title>
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:0;}
  img{max-width:100%;height:auto;}
  @media (max-width:640px){ .ardovo-landing table td{display:block !important;width:100% !important;padding:8px 0 !important;} }
</style>
</head>
<body style="margin:0;padding:0;background:${s.bg};font-family:${s.fontFamily};color:${s.textColor};">
<div style="padding:clamp(20px, 5vw, 56px) 16px;">
  ${inner}
</div>
</body></html>`;
}

// Single render entry point across channels. Email output is UNCHANGED.
export function renderDoc(doc, opts = {}) {
  const { target = 'email', ...rest } = opts || {};
  if (target === 'landing') return renderLandingHtml(doc, rest);
  return renderEmailHtml(doc, rest);
}

// A landing-friendly starter document (block vocabulary shared with email).
export function blankLandingDoc() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, bg: '#f4f6fb', contentBg: '#ffffff', contentWidth: LANDING_DEFAULT_WIDTH },
    blocks: [
      { ...makeBlock('heading'), text: 'A headline that earns the click', align: 'center' },
      { ...makeBlock('text'), text: 'One clear sentence on the promise. Say what changes for the visitor when they act. Personalize with {firstName} where it helps.', align: 'center', size: 18 },
      { ...makeBlock('button'), text: 'Get started', align: 'center' },
      makeBlock('divider'),
      { ...makeBlock('columns') },
    ],
  };
}
