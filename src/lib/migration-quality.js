// ============================================================
// MIGRATION QUALITY  -  the data-cleaning + relationship + safety brain
// for the Ardovo migration engine.
//
// This module has five layers. Layers 1-4 are 100% PURE functions (no I/O,
// no globals, no localStorage, never throw). Layer 5 (the batch ledger) is
// the ONLY part allowed to touch localStorage. This keeps the cleaning and
// analysis logic deterministic and unit-testable, while the ledger stays a
// thin, undo-able audit trail decoupled from the app's data store.
//
// Browser-safe. ASCII only. Normal hyphen only (no em-dash / en-dash).
// No external dependencies. Only 'react' is imported (for the useBatches hook).
//
// ------------------------------------------------------------
// EXPORTS + SHAPES
// ------------------------------------------------------------
// NORMALIZERS (pure). Each takes a raw string, returns:
//   { value, changed:boolean, note?:string }
//   - empty input                 -> { value:'', changed:false }
//   - never throws
//   - note is a short human reason, present only when it changed or flagged.
//   normEmail(raw)
//   normPhone(raw, opts={defaultCountry:'US'})
//   normUrl(raw)
//   normDate(raw)          -> value is ISO 'YYYY-MM-DD' on success
//   normCurrency(raw)      -> value is a Number, or '' when unparseable
//   normName(raw)
//   normWhitespace(raw)
//   normBoolean(raw)       -> value is true | false | ''
//   normalizeValue(type, raw, opts)   dispatcher, same return shape
//
// VALIDATION (pure)
//   validateRecord(rec, fields)
//     fields = [{ key, label, required?, type? }]
//     -> { errors:[{field,msg}], warnings:[{field,msg}], score:0..100 }
//
// FUZZY DEDUPE (pure)
//   fuzzyDedupe(records, opts)
//     opts = { target:'contact'|'company'|'deal', keyFields?, threshold?=0.86 }
//     -> { unique:[], merged:[{intoIndex,fromIndex,score,reason}], groups:[[i...]] }
//
// CROSS-FILE LINKING (pure)
//   linkAcrossDatasets(datasets)
//     datasets = [{ id, name, target, rows:[recordObj] }]
//     -> { links:[{fromFile,fromRowIndex,toFile,toRowIndex,type,by}],
//          summary:[{from,to,type,matched,total}] }
//
// UNDO-ABLE BATCH LEDGER (localStorage: rally_migration_batches_v1)
//   beginBatch(meta) -> batchId
//   recordCreated(batchId, target, id)
//   commitBatch(batchId, extra?)
//   listBatches() -> newest-first array
//   getBatch(id)
//   undoBatch(batchId, deleters) -> { removed, errors }
//   useBatches() -> React hook returning listBatches(), live-updating
//
// ------------------------------------------------------------
// INLINE EXAMPLES (not executed):
//   // normEmail('  JANE(at)Acme.com ') -> { value:'jane@acme.com', changed:true, note:'fixed (at) to @' }
//   // normPhone('call 415.555.0100')   -> { value:'+14155550100', changed:true, note:'removed letters from phone' }
//   // normDate('03/04/2021')           -> { value:'2021-03-04', changed:true, note:'read as MM/DD (US); could also be DD/MM' }
//   // normCurrency('$1,234.50')        -> { value:1234.5, changed:true }
//   // fuzzyDedupe(rows,{target:'contact'}).merged -> [{intoIndex:0,fromIndex:3,score:0.95,reason:'same email'}]
//   // const id = beginBatch({target:'contact',fileName:'crm.csv',total:340});
//   // recordCreated(id,'contact', newId); commitBatch(id,{created:340,failed:0});
//   // undoBatch(id, { contact:(x)=>store.removeContact(x) }) -> { removed:340, errors:[] }
// ============================================================
import { useEffect, useState } from 'react';

/* ============================================================
   SMALL INTERNAL HELPERS (pure)
   ============================================================ */

// Coerce anything to a safe trimmed string. Never throws.
function s(raw) {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  try { return String(raw); } catch { return ''; }
}

// Empty-input shortcut used by every normalizer.
function empty() { return { value: '', changed: false }; }

// Title Case a single token, preserving a few known lowercase particles only
// when they are interior tokens. Kept intentionally simple.
function titleToken(tok) {
  if (!tok) return tok;
  // Handle hyphenated (Mary-Jane) and apostrophe (O'Brien) parts.
  return tok
    .split('-')
    .map((part) => part
      .split("'")
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
      .join("'"))
    .join('-');
}

// Levenshtein edit distance (iterative, two-row). Pure, bounded, no throw.
function levenshtein(a, b) {
  a = s(a); b = s(b);
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[bl];
}

// Similarity ratio in 0..1 based on edit distance. 1 = identical.
function simRatio(a, b) {
  a = s(a).toLowerCase().trim();
  b = s(b).toLowerCase().trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Best-effort mojibake repair for the common UTF-8-read-as-Latin1 cases.
// We match on char codes so this source file stays pure ASCII.
function fixMojibake(str) {
  if (!str) return str;
  // 0x00C2 (A-circumflex) commonly precedes a stray byte in mis-decoded text.
  const Acirc = String.fromCharCode(0x00c2);
  const Atilde = String.fromCharCode(0x00c3);
  const nbsp = String.fromCharCode(0x00a0);
  let out = str;
  // "A-circumflex + nbsp" or lone "A-circumflex" before punctuation -> space/drop.
  out = out.split(Acirc + nbsp).join(' ');
  out = out.split(Acirc).join('');
  // Smart quotes / dashes sequences beginning with A-tilde: drop the marker byte.
  out = out.split(Atilde).join('');
  // Replace a raw non-breaking space with a normal space.
  out = out.split(nbsp).join(' ');
  return out;
}

/* ============================================================
   LAYER 1  -  NORMALIZERS (pure)
   ============================================================ */

// normEmail: trim, take first of a multi list, lowercase, strip <>, fix (at)/[at].
export function normEmail(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  let v = orig.trim();
  let changed = false;
  const notes = [];

  // Take the first address if several are separated by ; or ,
  if (/[;,]/.test(v)) {
    v = v.split(/[;,]/)[0].trim();
    changed = true;
    notes.push('kept first of multiple emails');
  }

  // Strip surrounding angle brackets (e.g. "Name <a@b.com>" remnants).
  const brack = v.match(/<([^>]+)>/);
  if (brack) { v = brack[1].trim(); changed = true; }
  v = v.replace(/[<>]/g, '');

  // Fix obfuscated "(at)" / "[at]" -> "@" and " dot " -> "."
  const beforeAt = v;
  v = v.replace(/\s*[\(\[]\s*at\s*[\)\]]\s*/gi, '@');
  v = v.replace(/\s+at\s+/gi, '@');
  if (v !== beforeAt) { changed = true; notes.push('fixed (at) to @'); }
  const beforeDot = v;
  v = v.replace(/\s*[\(\[]\s*dot\s*[\)\]]\s*/gi, '.');
  if (v !== beforeDot) { changed = true; }

  v = v.replace(/\s+/g, '');
  const lower = v.toLowerCase();
  if (lower !== v) { v = lower; changed = true; }

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (!valid) notes.push('does not look like an email');

  if (v === orig && !notes.length) return { value: v, changed: false };
  const out = { value: v, changed: changed || v !== orig };
  if (notes.length) out.note = notes.join('; ');
  return out;
}

// normPhone: reduce to digits (+ leading plus), format 10-digit US to E.164-ish.
export function normPhone(raw, opts = { defaultCountry: 'US' }) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  const defaultCountry = (opts && opts.defaultCountry) || 'US';
  const notes = [];

  const hadLetters = /[a-zA-Z]/.test(orig);
  const hasPlus = orig.trim().startsWith('+');
  let digits = orig.replace(/[^0-9]/g, '');

  // Strip a single leading US "1" trunk when it yields a clean 10-digit body.
  let value = '';
  if (hasPlus) {
    value = '+' + digits;
  } else if (defaultCountry === 'US' && digits.length === 11 && digits.charAt(0) === '1') {
    value = '+' + digits;
  } else if (defaultCountry === 'US' && digits.length === 10) {
    value = '+1' + digits;
  } else if (digits.length > 0) {
    value = '+' + digits;
  } else {
    value = '';
  }

  if (hadLetters) notes.push('removed letters from phone');
  if (digits.length > 0 && digits.length < 10 && !hasPlus) notes.push('phone looks incomplete');
  if (digits.length === 0) notes.push('no digits found in phone');

  const changed = value !== orig.trim();
  const out = { value, changed };
  if (notes.length) out.note = notes.join('; ');
  return out;
}

// normUrl: add https:// when missing, lowercase host, strip trailing slash.
export function normUrl(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  let v = orig.trim();
  let changed = false;
  const notes = [];

  const looksLikeDomain = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}/.test(v);
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//.test(v);

  if (!hasScheme) {
    if (looksLikeDomain || v.startsWith('www.')) {
      v = 'https://' + v.replace(/^\/+/, '');
      changed = true;
    } else {
      notes.push('does not look like a url');
    }
  }

  // Lowercase only the scheme + host, leave the path/query casing intact.
  const m = v.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*:\/\/)([^\/?#]+)(.*)$/);
  if (m) {
    const scheme = m[1].toLowerCase();
    const host = m[2].toLowerCase();
    let rest = m[3];
    if (rest === '/') rest = '';
    if (rest.length > 1 && rest.endsWith('/')) rest = rest.replace(/\/+$/, '');
    const rebuilt = scheme + host + rest;
    if (rebuilt !== v) changed = true;
    v = rebuilt;
  }

  const out = { value: v, changed: changed || v !== orig };
  if (notes.length) out.note = notes.join('; ');
  return out;
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function validYmd(y, m, d) {
  if (!(y >= 1000 && y <= 9999)) return false;
  if (!(m >= 1 && m <= 12)) return false;
  const days = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d >= 1 && d <= days[m - 1];
}
function iso(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

// normDate: parse common formats to ISO 'YYYY-MM-DD'. Prefer MM/DD on ambiguity.
export function normDate(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  const t = orig.trim();
  const fail = () => ({ value: orig, changed: false, note: 'could not read date' });

  // ISO or YYYY-MM-DD (also YYYY/MM/DD). Take the date part of a timestamp.
  let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (validYmd(y, mo, d)) {
      const value = iso(y, mo, d);
      return { value, changed: value !== orig };
    }
    return fail();
  }

  // Mon DD YYYY  /  DD Mon YYYY  (comma optional)
  m = t.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const d = +m[2], y = +m[3];
    if (mo && validYmd(y, mo, d)) return { value: iso(y, mo, d), changed: true };
    return fail();
  }
  m = t.match(/^(\d{1,2})\.?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/);
  if (m) {
    const d = +m[1], mo = MONTHS[m[2].slice(0, 3).toLowerCase()], y = +m[3];
    if (mo && validYmd(y, mo, d)) return { value: iso(y, mo, d), changed: true };
    return fail();
  }

  // Numeric slash/dash/dot: A/B/YYYY or A/B/YY
  m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/);
  if (m) {
    let a = +m[1], b = +m[2];
    let y = +m[3];
    if (m[3].length === 2) y = y >= 70 ? 1900 + y : 2000 + y;

    // Decide month vs day. Prefer MM/DD (US). Flag ambiguity when both plausible.
    let mo, d, ambiguous = false;
    if (a > 12 && b <= 12) { mo = b; d = a; }          // must be DD/MM
    else if (b > 12 && a <= 12) { mo = a; d = b; }     // must be MM/DD
    else if (a <= 12 && b <= 12) { mo = a; d = b; ambiguous = a !== b; } // prefer MM/DD
    else { return fail(); }

    if (!validYmd(y, mo, d)) {
      // Retry with the other interpretation before giving up.
      if (validYmd(y, d, mo)) { const tmp = mo; mo = d; d = tmp; }
      else return fail();
    }
    const value = iso(y, mo, d);
    const out = { value, changed: value !== orig };
    if (ambiguous) out.note = 'read as MM/DD (US); could also be DD/MM';
    return out;
  }

  return fail();
}

// normCurrency: strip symbols + separators, handle (500) as -500 and trailing %.
export function normCurrency(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  let t = orig.trim();
  const notes = [];

  const negParen = /^\(.*\)$/.test(t);
  if (negParen) t = t.slice(1, -1).trim();
  const hasTrailingPct = /%\s*$/.test(t);
  if (hasTrailingPct) t = t.replace(/%\s*$/, '').trim();

  const leadingMinus = /^-/.test(t);
  // Keep digits and a decimal point; drop currency symbols, commas, spaces, letters.
  const cleaned = t.replace(/[^0-9.]/g, '');
  if (cleaned === '' || cleaned === '.') {
    return { value: '', changed: true, note: 'could not read a number' };
  }
  // Collapse multiple dots to the first one (defensive).
  const firstDot = cleaned.indexOf('.');
  let numStr = cleaned;
  if (firstDot !== -1) {
    numStr = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  let num = parseFloat(numStr);
  if (!isFinite(num)) return { value: '', changed: true, note: 'could not read a number' };
  if (negParen || leadingMinus) num = -Math.abs(num);
  if (hasTrailingPct) notes.push('had a trailing percent sign');
  if (negParen) notes.push('parentheses read as negative');

  const out = { value: num, changed: true };
  if (notes.length) out.note = notes.join('; ');
  return out;
}

// normName: trim, collapse spaces, Title Case. Note only when changed.
export function normName(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  const collapsed = fixMojibake(orig).replace(/\s+/g, ' ').trim();
  const value = collapsed.split(' ').map(titleToken).join(' ');
  const changed = value !== orig;
  const out = { value, changed };
  if (changed) out.note = 'cleaned name formatting';
  return out;
}

// normWhitespace: trim, collapse internal whitespace, best-effort mojibake fix.
export function normWhitespace(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  const fixedMoji = fixMojibake(orig);
  const value = fixedMoji.replace(/\s+/g, ' ').trim();
  const changed = value !== orig;
  const out = { value, changed };
  if (changed && fixedMoji !== orig) out.note = 'repaired garbled characters';
  return out;
}

// normBoolean: map common truthy/falsy words. Unknown -> '' with a note.
export function normBoolean(raw) {
  const orig = s(raw);
  if (!orig.trim()) return empty();
  const t = orig.trim().toLowerCase();
  const yes = ['yes', 'y', 'true', 't', '1', 'on', 'checked'];
  const no = ['no', 'n', 'false', 'f', '0', 'off', 'unchecked'];
  if (yes.indexOf(t) !== -1) return { value: true, changed: true };
  if (no.indexOf(t) !== -1) return { value: false, changed: true };
  return { value: '', changed: true, note: 'could not read a yes/no value' };
}

// normalizeValue: dispatcher. Unknown/text -> normWhitespace.
export function normalizeValue(type, raw, opts) {
  const kind = s(type).toLowerCase().trim();
  switch (kind) {
    case 'email': return normEmail(raw);
    case 'phone':
    case 'tel': return normPhone(raw, opts);
    case 'url':
    case 'website':
    case 'link': return normUrl(raw);
    case 'date':
    case 'datetime': return normDate(raw);
    case 'currency':
    case 'money': return normCurrency(raw);
    case 'number':
    case 'numeric':
    case 'int':
    case 'float': {
      const c = normCurrency(raw);
      return c;
    }
    case 'boolean':
    case 'bool':
    case 'checkbox': return normBoolean(raw);
    case 'name':
    case 'fullname':
    case 'person': return normName(raw);
    case 'text':
    case 'string':
    default: return normWhitespace(raw);
  }
}

/* ============================================================
   LAYER 2  -  VALIDATION (pure)
   ============================================================ */

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

// validateRecord: required checks + type checks -> errors, warnings, score 0..100.
export function validateRecord(rec, fields) {
  const errors = [];
  const warnings = [];
  const record = rec && typeof rec === 'object' ? rec : {};
  const list = Array.isArray(fields) ? fields : [];

  for (const f of list) {
    if (!f || !f.key) continue;
    const key = f.key;
    const label = f.label || key;
    const type = s(f.type).toLowerCase();
    const val = record[key];

    if (f.required && isEmpty(val)) {
      errors.push({ field: key, msg: `${label} is required` });
      continue;
    }
    if (isEmpty(val)) continue;

    if (type === 'email') {
      const e = normEmail(val);
      if (e.note && e.note.indexOf('does not look like an email') !== -1) {
        errors.push({ field: key, msg: `${label} is not a valid email` });
      }
    } else if (type === 'url' || type === 'website' || type === 'link') {
      const u = normUrl(val);
      if (u.note && u.note.indexOf('does not look like a url') !== -1) {
        errors.push({ field: key, msg: `${label} is not a valid url` });
      }
    } else if (type === 'phone' || type === 'tel') {
      const p = normPhone(val);
      if (p.note && p.note.indexOf('incomplete') !== -1) {
        warnings.push({ field: key, msg: `${label} looks incomplete` });
      }
    } else if (type === 'date' || type === 'datetime') {
      const d = normDate(val);
      if (d.note && d.note.indexOf('could not read') !== -1) {
        errors.push({ field: key, msg: `${label} is not a readable date` });
      } else if (d.note && d.note.indexOf('could also be') !== -1) {
        warnings.push({ field: key, msg: `${label} is an ambiguous date (MM/DD vs DD/MM)` });
      }
    } else if (type === 'number' || type === 'currency' || type === 'money' || type === 'numeric') {
      const n = normCurrency(val);
      if (n.value === '') {
        warnings.push({ field: key, msg: `${label} is not a readable number` });
      }
    }

    // Generic suspicious-value warnings.
    if (typeof val === 'string') {
      if (/^\s|\s$/.test(val)) warnings.push({ field: key, msg: `${label} has stray whitespace` });
      if (/(.)\1{6,}/.test(val)) warnings.push({ field: key, msg: `${label} has a suspicious repeated character run` });
      if (/^(n\/?a|null|undefined|none|unknown|test)$/i.test(val.trim())) {
        warnings.push({ field: key, msg: `${label} looks like a placeholder value` });
      }
    }
  }

  // Weighted score: errors cost more than warnings, floored at 0.
  const penalty = errors.length * 20 + warnings.length * 6;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return { errors, warnings, score };
}

/* ============================================================
   LAYER 3  -  FUZZY DEDUPE (pure)
   ============================================================ */

// Read a field by trying several likely key spellings (case-insensitive).
function pick(rec, names) {
  if (!rec || typeof rec !== 'object') return '';
  const lowerMap = {};
  for (const k of Object.keys(rec)) lowerMap[k.toLowerCase()] = rec[k];
  for (const n of names) {
    const hit = lowerMap[n.toLowerCase()];
    if (!isEmpty(hit)) return s(hit);
  }
  return '';
}

function emailKey(rec) {
  const e = normEmail(pick(rec, ['email', 'emailaddress', 'email_address', 'e-mail', 'workemail', 'work_email']));
  return e.value && /@/.test(e.value) ? e.value : '';
}
function domainFromEmail(email) {
  const at = email.indexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}
function domainKey(rec) {
  const raw = pick(rec, ['domain', 'website', 'url', 'site', 'web']);
  if (raw) {
    const u = normUrl(raw);
    const m = u.value.match(/^[a-z]+:\/\/([^\/?#]+)/i);
    if (m) return m[1].toLowerCase().replace(/^www\./, '');
    const bare = s(raw).toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '').trim();
    if (bare) return bare;
  }
  const e = emailKey(rec);
  const d = domainFromEmail(e);
  // Ignore common consumer mailbox domains as a company signal.
  const consumer = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
  return d && consumer.indexOf(d) === -1 ? d : '';
}
function nameKey(rec) {
  const first = pick(rec, ['firstname', 'first_name', 'first', 'givenname', 'given_name']);
  const last = pick(rec, ['lastname', 'last_name', 'last', 'surname', 'familyname', 'family_name']);
  if (first || last) return normName(`${first} ${last}`).value.toLowerCase().trim();
  const full = pick(rec, ['name', 'fullname', 'full_name', 'contact', 'contactname']);
  return normName(full).value.toLowerCase().trim();
}
function companyKey(rec) {
  const c = pick(rec, ['company', 'companyname', 'company_name', 'account', 'accountname', 'organization', 'org', 'employer']);
  return normName(c).value.toLowerCase().trim();
}
function dealNameKey(rec) {
  const n = pick(rec, ['name', 'title', 'dealname', 'deal_name', 'deal']);
  return s(n).toLowerCase().replace(/\s+/g, ' ').trim();
}

function completeness(rec) {
  if (!rec || typeof rec !== 'object') return 0;
  let count = 0;
  for (const k of Object.keys(rec)) if (!isEmpty(rec[k])) count++;
  return count;
}

// fuzzyDedupe: signature-first, then fuzzy fallback within a target type.
export function fuzzyDedupe(records, opts) {
  const rows = Array.isArray(records) ? records : [];
  const options = opts || {};
  const target = s(options.target).toLowerCase() || 'contact';
  const threshold = typeof options.threshold === 'number' ? options.threshold : 0.86;
  const n = rows.length;

  const result = { unique: [], merged: [], groups: [] };
  if (n === 0) return result;

  // parent[i] is the survivor index for record i (union-find-ish, flat).
  const parent = new Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;

  const mergeInto = (survivor, victim, score, reason) => {
    if (parent[victim] === victim && survivor !== victim) {
      parent[victim] = survivor;
      result.merged.push({ intoIndex: survivor, fromIndex: victim, score: Math.round(score * 100) / 100, reason });
      return true;
    }
    return false;
  };

  // Pre-compute signatures once.
  const sig = rows.map((r) => ({
    email: emailKey(r),
    domain: domainKey(r),
    name: nameKey(r),
    company: companyKey(r),
    dealName: dealNameKey(r),
    complete: completeness(r),
  }));

  // Choose the survivor between two indices: most complete, tie -> lower index.
  const chooseSurvivor = (a, b) => {
    if (sig[a].complete !== sig[b].complete) return sig[a].complete > sig[b].complete ? a : b;
    return a < b ? a : b;
  };

  // ---- Pass 1: strong signature buckets (exact) ----
  const strongBucket = new Map();
  for (let i = 0; i < n; i++) {
    let key = '';
    if (target === 'contact') key = sig[i].email ? 'e:' + sig[i].email : '';
    else if (target === 'company') key = sig[i].domain ? 'd:' + sig[i].domain : '';
    else if (target === 'deal') key = ''; // deals rarely have a single strong key
    if (!key) continue;
    if (!strongBucket.has(key)) strongBucket.set(key, []);
    strongBucket.get(key).push(i);
  }
  for (const [key, idxs] of strongBucket) {
    if (idxs.length < 2) continue;
    let survivor = idxs[0];
    for (let k = 1; k < idxs.length; k++) survivor = chooseSurvivor(survivor, idxs[k]);
    const reason = key.charAt(0) === 'e' ? 'same email' : 'same domain';
    for (const idx of idxs) if (idx !== survivor) mergeInto(survivor, idx, 1, reason);
  }

  // ---- Pass 2: fuzzy fallback among still-unmerged records ----
  const roots = [];
  for (let i = 0; i < n; i++) if (parent[i] === i) roots.push(i);

  for (let x = 0; x < roots.length; x++) {
    const i = roots[x];
    if (parent[i] !== i) continue;
    for (let y = x + 1; y < roots.length; y++) {
      const j = roots[y];
      if (parent[j] !== j) continue;

      let score = 0;
      let reason = '';
      if (target === 'contact') {
        // Fuzzy name AND same company (or empty companies on both sides).
        const nameSim = simRatio(sig[i].name, sig[j].name);
        const sameCompany = sig[i].company && sig[j].company
          ? simRatio(sig[i].company, sig[j].company) >= 0.9
          : (!sig[i].company && !sig[j].company);
        if (sig[i].name && sig[j].name && nameSim >= threshold && sameCompany) {
          score = nameSim; reason = 'similar name at same company';
        }
      } else if (target === 'company') {
        const nameSim = simRatio(sig[i].name || sig[i].company, sig[j].name || sig[j].company);
        const a = sig[i].company || sig[i].name;
        const b = sig[j].company || sig[j].name;
        const cSim = simRatio(a, b);
        const best = Math.max(nameSim, cSim);
        if (a && b && best >= threshold) { score = best; reason = 'similar company name'; }
      } else if (target === 'deal') {
        const nSim = simRatio(sig[i].dealName, sig[j].dealName);
        const sameCompany = sig[i].company && sig[j].company
          ? simRatio(sig[i].company, sig[j].company) >= 0.9 : false;
        if (sig[i].dealName && sig[j].dealName && nSim >= threshold && sameCompany) {
          score = nSim; reason = 'similar deal at same company';
        }
      }

      if (score >= threshold && reason) {
        const survivor = chooseSurvivor(i, j);
        const victim = survivor === i ? j : i;
        mergeInto(survivor, victim, score, reason);
        if (survivor === j) break; // i got merged away; stop scanning j-row for i
      }
    }
  }

  // ---- Build groups + unique output ----
  const groupMap = new Map();
  for (let i = 0; i < n; i++) {
    const root = parent[i];
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root).push(i);
  }
  for (const [root, idxs] of groupMap) {
    idxs.sort((a, b) => a - b);
    result.groups.push(idxs);
    result.unique.push(rows[root]);
  }
  // Keep unique in original survivor order (by first index of each group).
  result.groups.sort((a, b) => a[0] - b[0]);
  result.unique = result.groups.map((g) => rows[parent[g[0]]]);

  return result;
}

/* ============================================================
   LAYER 4  -  CROSS-FILE LINKING (pure)
   ============================================================ */

function datasetDomainIndex(rows) {
  // Map normalized domain -> rowIndex, and normalized company name -> rowIndex.
  const byDomain = new Map();
  const byName = new Map();
  rows.forEach((r, i) => {
    const d = domainKey(r);
    if (d && !byDomain.has(d)) byDomain.set(d, i);
    const nm = companyNameForCompanyRow(r);
    if (nm && !byName.has(nm)) byName.set(nm, i);
  });
  return { byDomain, byName };
}
function companyNameForCompanyRow(r) {
  const n = pick(r, ['name', 'companyname', 'company_name', 'company', 'account', 'accountname', 'organization', 'org']);
  return normName(n).value.toLowerCase().trim();
}
function contactEmailIndex(rows) {
  const byEmail = new Map();
  rows.forEach((r, i) => { const e = emailKey(r); if (e && !byEmail.has(e)) byEmail.set(e, i); });
  return byEmail;
}

// linkAcrossDatasets: find real relationships across normalized datasets.
export function linkAcrossDatasets(datasets) {
  const out = { links: [], summary: [] };
  const sets = Array.isArray(datasets) ? datasets.filter((d) => d && Array.isArray(d.rows)) : [];
  if (sets.length < 2) return out;

  const byTarget = { contact: [], company: [], deal: [] };
  for (const d of sets) {
    const t = s(d.target).toLowerCase();
    if (t === 'contact' || t === 'contacts') byTarget.contact.push(d);
    else if (t === 'company' || t === 'companies' || t === 'account' || t === 'accounts') byTarget.company.push(d);
    else if (t === 'deal' || t === 'deals' || t === 'opportunity' || t === 'opportunities') byTarget.deal.push(d);
  }

  const companyDatasets = byTarget.company;

  const addLink = (fromFile, fromRowIndex, toFile, toRowIndex, type, by) => {
    out.links.push({ fromFile, fromRowIndex, toFile, toRowIndex, type, by });
  };

  // Helper: find a matching company row across all company datasets.
  const findCompany = (nameStr, domainStr) => {
    const nm = normName(s(nameStr)).value.toLowerCase().trim();
    const dm = s(domainStr).toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '').trim();
    for (const cds of companyDatasets) {
      const idx = cds.__index || (cds.__index = datasetDomainIndex(cds.rows));
      if (dm && idx.byDomain.has(dm)) return { file: cds.id || cds.name, row: idx.byDomain.get(dm), by: 'domain' };
      if (nm && idx.byName.has(nm)) return { file: cds.id || cds.name, row: idx.byName.get(nm), by: 'name' };
    }
    return null;
  };

  // ---- contacts -> companies ----
  for (const cds of byTarget.contact) {
    let matched = 0;
    const total = cds.rows.length;
    cds.rows.forEach((r, i) => {
      const companyName = pick(r, ['company', 'companyname', 'company_name', 'account', 'accountname', 'organization', 'org', 'employer']);
      const dom = domainFromEmail(emailKey(r));
      const consumer = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
      const useDom = dom && consumer.indexOf(dom) === -1 ? dom : '';
      if (!companyName && !useDom) return;
      const hit = findCompany(companyName, useDom);
      if (hit) { addLink(cds.id || cds.name, i, hit.file, hit.row, 'contact-company', hit.by); matched++; }
    });
    if (companyDatasets.length) {
      out.summary.push({ from: cds.name || cds.id, to: companyLabel(companyDatasets), type: 'contact-company', matched, total });
    }
  }

  // ---- deals -> companies ----
  for (const dds of byTarget.deal) {
    let matched = 0;
    const total = dds.rows.length;
    dds.rows.forEach((r, i) => {
      const companyName = pick(r, ['company', 'companyname', 'company_name', 'account', 'accountname', 'organization', 'org']);
      if (!companyName) return;
      const hit = findCompany(companyName, '');
      if (hit) { addLink(dds.id || dds.name, i, hit.file, hit.row, 'deal-company', hit.by); matched++; }
    });
    if (companyDatasets.length) {
      out.summary.push({ from: dds.name || dds.id, to: companyLabel(companyDatasets), type: 'deal-company', matched, total });
    }
  }

  // ---- deals -> contacts ----
  const contactDatasets = byTarget.contact;
  for (const dds of byTarget.deal) {
    let matched = 0;
    const total = dds.rows.length;
    dds.rows.forEach((r, i) => {
      const email = emailKey(r) || normEmail(pick(r, ['contact', 'contactemail', 'contact_email', 'primarycontact', 'primary_contact'])).value;
      if (!email || !/@/.test(email)) return;
      for (const cds of contactDatasets) {
        const idx = cds.__emailIndex || (cds.__emailIndex = contactEmailIndex(cds.rows));
        if (idx.has(email)) { addLink(dds.id || dds.name, i, cds.id || cds.name, idx.get(email), 'deal-contact', 'email'); matched++; break; }
      }
    });
    if (contactDatasets.length) {
      out.summary.push({ from: dds.name || dds.id, to: contactLabel(contactDatasets), type: 'deal-contact', matched, total });
    }
  }

  // Clean the transient indexes we cached on the dataset objects (stay pure-ish:
  // we never mutate the caller's row data, only remove our own scratch keys).
  for (const d of sets) { delete d.__index; delete d.__emailIndex; }

  return out;
}
function companyLabel(companyDatasets) {
  return companyDatasets.length === 1 ? (companyDatasets[0].name || companyDatasets[0].id) : 'companies';
}
function contactLabel(contactDatasets) {
  return contactDatasets.length === 1 ? (contactDatasets[0].name || contactDatasets[0].id) : 'contacts';
}

/* ============================================================
   LAYER 5  -  UNDO-ABLE BATCH LEDGER (the ONLY localStorage user)
   ============================================================ */

const LS_KEY = 'rally_migration_batches_v1';
const subs = new Set();

function loadStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o; }
  } catch {}
  return {};
}
function saveStore(store) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {}
  subs.forEach((fn) => { try { fn(); } catch {} });
}
// Cross-tab sync so a batch begun in one tab shows up in another.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) subs.forEach((fn) => { try { fn(); } catch {} });
  });
}

function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

// beginBatch: open a new ledger entry, return its id.
export function beginBatch(meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  const store = loadStore();
  const id = rid();
  store[id] = {
    id,
    target: s(m.target) || 'record',
    fileName: m.fileName ? s(m.fileName) : '',
    createdAt: new Date().toISOString(),
    finishedAt: null,
    total: typeof m.total === 'number' ? m.total : null,
    counts: { created: 0, failed: 0 },
    items: {},        // { target: [id, id, ...] }
    undone: false,
  };
  saveStore(store);
  return id;
}

// recordCreated: append a created record id under its target bucket.
export function recordCreated(batchId, target, id) {
  if (!batchId || id === null || id === undefined) return;
  const store = loadStore();
  const b = store[batchId];
  if (!b) return;
  const t = s(target) || 'record';
  if (!Array.isArray(b.items[t])) b.items[t] = [];
  b.items[t].push(s(id));
  b.counts.created = (b.counts.created || 0) + 1;
  saveStore(store);
}

// commitBatch: stamp finishedAt and merge any extra counts/fields.
export function commitBatch(batchId, extra) {
  if (!batchId) return null;
  const store = loadStore();
  const b = store[batchId];
  if (!b) return null;
  b.finishedAt = new Date().toISOString();
  if (extra && typeof extra === 'object') {
    if (typeof extra.created === 'number') b.counts.created = extra.created;
    if (typeof extra.failed === 'number') b.counts.failed = extra.failed;
    // Any other scalar extras land at the top level for the UI.
    for (const k of Object.keys(extra)) {
      if (k === 'created' || k === 'failed') continue;
      b[k] = extra[k];
    }
  }
  saveStore(store);
  return b;
}

// listBatches: newest-first snapshot for the UI.
export function listBatches() {
  const store = loadStore();
  return Object.values(store).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// getBatch: single batch by id, or null.
export function getBatch(id) {
  if (!id) return null;
  const store = loadStore();
  return store[id] || null;
}

// undoBatch: call the matching deleter for every recorded id. Stays decoupled
// from the app's data store: the caller passes a deleters map keyed by target,
// so this ledger never imports store.js and never assumes how records are stored.
export function undoBatch(batchId, deleters) {
  const result = { removed: 0, errors: [] };
  if (!batchId) { result.errors.push('no batchId'); return result; }
  const store = loadStore();
  const b = store[batchId];
  if (!b) { result.errors.push('batch not found'); return result; }
  const map = deleters && typeof deleters === 'object' ? deleters : {};

  for (const target of Object.keys(b.items || {})) {
    const ids = Array.isArray(b.items[target]) ? b.items[target] : [];
    const del = map[target];
    if (typeof del !== 'function') {
      if (ids.length) result.errors.push(`no deleter for "${target}" (${ids.length} left)`);
      continue;
    }
    for (const id of ids) {
      try { del(id); result.removed++; }
      catch (e) { result.errors.push(`failed to remove ${target}:${id}`); }
    }
  }

  b.undone = true;
  b.undoneAt = new Date().toISOString();
  saveStore(store);
  return result;
}

// useBatches: React hook. Returns listBatches() and re-renders on any change.
export function useBatches() {
  const [batches, setBatches] = useState(() => listBatches());
  useEffect(() => {
    const fn = () => setBatches(listBatches());
    subs.add(fn);
    fn();
    return () => { subs.delete(fn); };
  }, []);
  return batches;
}
