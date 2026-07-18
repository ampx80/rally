// ============================================================
// ARDOVO INPUT SANITIZERS  (isomorphic: browser + serverless)
// Pure ES module, zero dependencies, no Node or DOM globals. Safe to import
// from React components AND from api/* serverless routes. Every helper is a
// pure function that never throws on bad input (it coerces instead).
//
// Purpose: one shared, audited place for the boring-but-critical work of
// clamping lengths, stripping control characters, escaping for safe display,
// and validating the handful of formats Ardovo accepts (email, http(s) url,
// slug, phone). NO em-dash / en-dash. ASCII only.
// ============================================================

// Control chars (C0 + DEL + C1) except tab/newline/carriage-return, plus the
// zero-width and BOM chars that get used to smuggle payloads past filters.
// Built from char codes so no literal control byte lives in the source.
const CONTROL_RE = new RegExp(
  '[' +
    '\\u0000-\\u0008' + // C0 before \t
    '\\u000B\\u000C' + // vertical tab, form feed
    '\\u000E-\\u001F' + // C0 after \r
    '\\u007F-\\u009F' + // DEL + C1
    '\\u200B-\\u200D' + // zero-width space / non-joiner / joiner
    '\\uFEFF' + // BOM / zero-width no-break space
  ']',
  'g',
);

// Coerce anything to a string without throwing. null / undefined become ''.
export function toStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return String(v); } catch { return ''; }
}

// Remove control + zero-width characters. Preserves normal whitespace.
export function stripControlChars(v) {
  return toStr(v).replace(CONTROL_RE, '');
}

// Collapse runs of whitespace to single spaces and trim the ends.
export function collapseWhitespace(v) {
  return toStr(v).replace(/\s+/g, ' ').trim();
}

// Clamp a string to a max length after stripping control chars and trimming.
// This is the workhorse used everywhere a free-text field is accepted.
export function clamp(v, max = 200) {
  const s = stripControlChars(v).trim();
  const n = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
  return n ? s.slice(0, n) : s;
}

// Same as clamp but also collapses internal whitespace (for names, titles,
// single-line fields where runs of spaces are never meaningful).
export function clampLine(v, max = 200) {
  const s = collapseWhitespace(stripControlChars(v));
  const n = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
  return n ? s.slice(0, n) : s;
}

// Escape the five HTML-significant characters for safe interpolation into an
// HTML context (email templates, server-rendered SEO pages, etc). React
// already escapes children, so this is for the NON-React string paths.
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(v) {
  return toStr(v).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Escape for safe inclusion inside a double-quoted HTML attribute value.
export function escapeAttr(v) {
  return escapeHtml(v).replace(/`/g, '&#96;');
}

// ---- Format validators (all return boolean, never throw) --------------------

// Pragmatic email check. Not RFC-complete on purpose: rejects whitespace,
// requires a single @, a dot in the domain, and clamps overall length.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(v) {
  const s = clamp(v, 254);
  return EMAIL_RE.test(s);
}

// Normalize an email for storage / comparison: trim, lowercase, clamp.
// Returns '' when the input is not a valid email.
export function normalizeEmail(v) {
  const s = clamp(v, 254).toLowerCase();
  return EMAIL_RE.test(s) ? s : '';
}

// True only for a well-formed absolute http(s) URL. Uses the URL parser so it
// cannot be fooled by malformed input. Does NOT check reachability or SSRF
// (see api/outbound.js safeUrl for the SSRF-blocking variant).
export function isHttpUrl(v) {
  const s = clamp(v, 2048);
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Return the normalized http(s) URL string, or '' if it is not one.
export function normalizeUrl(v) {
  const s = clamp(v, 2048);
  if (!s) return '';
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : '';
  } catch {
    return '';
  }
}

// Lowercase, hyphen-safe slug. Strips anything that is not a-z 0-9 or hyphen.
export function slugify(v, max = 80) {
  return clamp(v, max)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

// Keep only digits, plus, spaces, parens and hyphens; clamp. For phone display.
export function sanitizePhone(v, max = 40) {
  return clamp(v, max).replace(/[^\d+()\-.\s]/g, '');
}

// A digit string extracted from a phone (for comparison / storage).
export function phoneDigits(v) {
  return toStr(v).replace(/\D+/g, '').slice(0, 20);
}

// Clamp to an integer within [min, max]. Non-numeric input falls back to min.
export function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  if (Number.isFinite(min) && n < min) return min;
  if (Number.isFinite(max) && n > max) return max;
  return n;
}

// Convenience: run a plain object of string fields through clampLine with a
// per-key max map. Unknown keys are dropped. Handy for shaping request bodies.
//   shape({ name: '  Ann  ', bio: 'x'.repeat(999), evil: 1 }, { name: 120, bio: 500 })
//   -> { name: 'Ann', bio: 'xxx...(500)' }
export function shape(obj, maxByKey) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const key of Object.keys(maxByKey || {})) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = clampLine(obj[key], maxByKey[key]);
    }
  }
  return out;
}

export default {
  toStr, stripControlChars, collapseWhitespace, clamp, clampLine,
  escapeHtml, escapeAttr, isEmail, normalizeEmail, isHttpUrl, normalizeUrl,
  slugify, sanitizePhone, phoneDigits, clampInt, shape,
};
