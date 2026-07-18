// ============================================================
// ARDOVO GRID  (the Airtable-killer engine, local-first)
// A Base holds Tables; a Table has Fields + Records shown in
// switchable Views. This module owns the full data model, a real
// mini formula engine (field refs, + - * /, IF/CONCAT/SUM/ROUND/
// ABS/MIN/MAX/AVERAGE/LEN/ROUND and & concat), rollup + lookup over
// linked records, filter (AND/OR groups) / sort (multi) / group-by,
// CSV import, deterministic rich seed, and a pub/sub store.
//
// Pipedrive bolted a weak table onto its CRM. Ardovo ships a full
// Airtable-class database INSIDE the CRM, linked to real records.
//
// TDZ SAFETY: `state = load()` runs at module eval and calls the
// seed, which calls helpers. Every helper it touches is a hoisted
// `function` declaration (or defined above the call), never a const
// arrow. Do not convert seed-path helpers to const arrows.
//
// SUPABASE: bases -> rally_grid_bases, tables -> rally_grid_tables,
// fields -> rally_grid_fields, records -> rally_grid_records (jsonb
// cells), views -> rally_grid_views. Namespaced rally_*.
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_grid_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   FIELD TYPE CATALOG
   ============================================================ */
export const FIELD_TYPES = [
  { id: 'text', label: 'Single line text', icon: 'fileText', group: 'Basic' },
  { id: 'longText', label: 'Long text', icon: 'list', group: 'Basic' },
  { id: 'number', label: 'Number', icon: 'chart', group: 'Number' },
  { id: 'currency', label: 'Currency', icon: 'dollar', group: 'Number' },
  { id: 'percent', label: 'Percent', icon: 'pie', group: 'Number' },
  { id: 'singleSelect', label: 'Single select', icon: 'chevronDown', group: 'Choice' },
  { id: 'multiSelect', label: 'Multiple select', icon: 'layers', group: 'Choice' },
  { id: 'date', label: 'Date', icon: 'calendar', group: 'Time' },
  { id: 'checkbox', label: 'Checkbox', icon: 'check', group: 'Choice' },
  { id: 'rating', label: 'Rating', icon: 'star', group: 'Choice' },
  { id: 'user', label: 'User', icon: 'user', group: 'People' },
  { id: 'url', label: 'URL', icon: 'globe', group: 'Contact' },
  { id: 'email', label: 'Email', icon: 'mail', group: 'Contact' },
  { id: 'phone', label: 'Phone', icon: 'phone', group: 'Contact' },
  { id: 'attachment', label: 'Attachment', icon: 'inbox', group: 'Media' },
  { id: 'formula', label: 'Formula', icon: 'bolt', group: 'Advanced' },
  { id: 'link', label: 'Linked record', icon: 'link', group: 'Advanced' },
  { id: 'rollup', label: 'Rollup', icon: 'layers', group: 'Advanced' },
  { id: 'lookup', label: 'Lookup', icon: 'eye', group: 'Advanced' },
  { id: 'autonumber', label: 'Autonumber', icon: 'chart', group: 'Advanced' },
  { id: 'createdTime', label: 'Created time', icon: 'clock', group: 'Advanced' },
];
export const fieldTypeMeta = (id) => FIELD_TYPES.find(t => t.id === id) || { id, label: id, icon: 'fileText' };
export const COMPUTED_TYPES = new Set(['formula', 'rollup', 'lookup', 'autonumber', 'createdTime']);
export const NUMERIC_TYPES = new Set(['number', 'currency', 'percent', 'rating', 'autonumber']);
export const isComputed = (t) => COMPUTED_TYPES.has(t);

/* Select-chip palette. Chips render as a translucent tint of the hue with the
   hue itself as text, which reads cleanly in both light and dark themes. */
export const SELECT_COLORS = [
  { id: 'blue', hex: '#2563a8' }, { id: 'teal', hex: '#0ea5a3' },
  { id: 'green', hex: '#1a7f52' }, { id: 'lime', hex: '#4d7c0f' },
  { id: 'amber', hex: '#b3721a' }, { id: 'orange', hex: '#e0752d' },
  { id: 'red', hex: '#c0392b' }, { id: 'pink', hex: '#d4489b' },
  { id: 'purple', hex: '#8b3fd4' }, { id: 'indigo', hex: '#5b4bf5' },
  { id: 'cyan', hex: '#0891b2' }, { id: 'gray', hex: '#5b6474' },
];
export function colorHex(id) { return (SELECT_COLORS.find(c => c.id === id) || SELECT_COLORS[0]).hex; }
export function chipStyle(colorId) {
  const hex = colorHex(colorId);
  return { background: hex + '22', color: hex, borderColor: hex + '44' };
}

/* Grid collaborators (local, standalone from the CRM users so Grid is
   self-contained). SUPABASE: rally_grid_collaborators or join rally_users. */
export const COLLABORATORS = [
  { id: 'gu_1', name: 'Jordan Avery' }, { id: 'gu_2', name: 'Simone Diaz' },
  { id: 'gu_3', name: 'Nina Kapoor' }, { id: 'gu_4', name: 'Marcus Hale' },
  { id: 'gu_5', name: 'Elena Ross' }, { id: 'gu_6', name: 'Theo Bennett' },
];
export const collaboratorName = (id) => COLLABORATORS.find(u => u.id === id)?.name || '';

/* ============================================================
   ID FACTORY
   ============================================================ */
let idc = 1;
function nid(p) { return `${p}_${(idc++).toString(36)}${Math.floor((typeof performance !== 'undefined' ? performance.now() : 0) % 1000)}`; }

/* ============================================================
   FORMULA ENGINE  (tokenizer + Pratt parser + evaluator, no eval)
   Supports: numbers, "strings", {Field Name} refs, bare field refs,
   + - * / %, unary -, comparisons (= <> != < > <= >=), & concat,
   parentheses, and functions IF CONCAT SUM ROUND ABS MIN MAX
   AVERAGE LEN UPPER LOWER TRUE FALSE.
   ============================================================ */
function tokenizeFormula(src) {
  const t = []; let i = 0; const s = String(src || '');
  const isDigit = (c) => c >= '0' && c <= '9';
  const isIdent = (c) => /[A-Za-z0-9_]/.test(c);
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '{') { let j = i + 1; let name = ''; while (j < s.length && s[j] !== '}') { name += s[j]; j++; } i = j + 1; t.push({ t: 'field', v: name.trim() }); continue; }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; let str = ''; while (j < s.length && s[j] !== q) { str += s[j]; j++; } i = j + 1; t.push({ t: 'str', v: str }); continue; }
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) { let num = ''; while (i < s.length && (isDigit(s[i]) || s[i] === '.')) { num += s[i]; i++; } t.push({ t: 'num', v: parseFloat(num) }); continue; }
    if (/[A-Za-z_]/.test(c)) { let name = ''; while (i < s.length && isIdent(s[i])) { name += s[i]; i++; } t.push({ t: 'name', v: name }); continue; }
    // multi-char operators
    const two = s.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>' || two === '!=' || two === '==') { t.push({ t: 'op', v: two === '==' ? '=' : two }); i += 2; continue; }
    if ('+-*/%&<>=(),'.includes(c)) { t.push({ t: c === '(' || c === ')' || c === ',' ? c : 'op', v: c }); i++; continue; }
    i++; // skip unknown
  }
  t.push({ t: 'eof' });
  return t;
}

function parseFormula(src) {
  const toks = tokenizeFormula(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (ch) => { if (peek().t === ch || peek().v === ch) return next(); throw new Error('formula parse'); };

  // precedence-climbing
  const BIN = { '&': 1, '=': 2, '<>': 2, '!=': 2, '<': 2, '>': 2, '<=': 2, '>=': 2, '+': 3, '-': 3, '*': 4, '/': 4, '%': 4 };
  function parseExpr(min) {
    let left = parseUnary();
    while (peek().t === 'op' && BIN[peek().v] != null && BIN[peek().v] >= min) {
      const op = next().v;
      const right = parseExpr(BIN[op] + 1);
      left = { k: 'bin', op, left, right };
    }
    return left;
  }
  function parseUnary() {
    if (peek().t === 'op' && peek().v === '-') { next(); return { k: 'neg', arg: parseUnary() }; }
    if (peek().t === 'op' && peek().v === '+') { next(); return parseUnary(); }
    return parsePrimary();
  }
  function parsePrimary() {
    const tk = peek();
    if (tk.t === 'num') { next(); return { k: 'num', v: tk.v }; }
    if (tk.t === 'str') { next(); return { k: 'str', v: tk.v }; }
    if (tk.t === 'field') { next(); return { k: 'field', v: tk.v }; }
    if (tk.t === '(') { next(); const e = parseExpr(1); expect(')'); return e; }
    if (tk.t === 'name') {
      next();
      const up = tk.v.toUpperCase();
      if (up === 'TRUE') return { k: 'num', v: 1 };
      if (up === 'FALSE') return { k: 'num', v: 0 };
      if (peek().t === '(') {
        next();
        const args = [];
        if (peek().t !== ')') { args.push(parseExpr(1)); while (peek().t === ',') { next(); args.push(parseExpr(1)); } }
        expect(')');
        return { k: 'call', fn: up, args };
      }
      // bare identifier => field reference by name
      return { k: 'field', v: tk.v };
    }
    next();
    return { k: 'num', v: 0 };
  }
  try { return parseExpr(1); } catch { return { k: 'str', v: '#ERROR' }; }
}

// Cache parsed ASTs by formula string.
const formulaCache = new Map();
function astFor(src) {
  if (formulaCache.has(src)) return formulaCache.get(src);
  const ast = parseFormula(src);
  formulaCache.set(src, ast);
  return ast;
}

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const str = (v) => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v));

function evalAst(node, resolve) {
  switch (node.k) {
    case 'num': return node.v;
    case 'str': return node.v;
    case 'field': return resolve(node.v);
    case 'neg': return -num(evalAst(node.arg, resolve));
    case 'bin': {
      const a = evalAst(node.left, resolve), b = evalAst(node.right, resolve);
      switch (node.op) {
        case '+': return num(a) + num(b);
        case '-': return num(a) - num(b);
        case '*': return num(a) * num(b);
        case '/': return num(b) === 0 ? 0 : num(a) / num(b);
        case '%': return num(b) === 0 ? 0 : num(a) % num(b);
        case '&': return str(a) + str(b);
        case '=': return (num(a) === num(b) || str(a) === str(b)) ? 1 : 0;
        case '<>': case '!=': return (num(a) !== num(b) && str(a) !== str(b)) ? 1 : 0;
        case '<': return num(a) < num(b) ? 1 : 0;
        case '>': return num(a) > num(b) ? 1 : 0;
        case '<=': return num(a) <= num(b) ? 1 : 0;
        case '>=': return num(a) >= num(b) ? 1 : 0;
        default: return 0;
      }
    }
    case 'call': {
      const a = node.args;
      switch (node.fn) {
        case 'IF': return truthy(evalAst(a[0], resolve)) ? (a[1] ? evalAst(a[1], resolve) : '') : (a[2] ? evalAst(a[2], resolve) : '');
        case 'CONCAT': return a.map(x => str(evalAst(x, resolve))).join('');
        case 'SUM': return a.reduce((s, x) => s + num(evalAst(x, resolve)), 0);
        case 'ROUND': { const v = num(evalAst(a[0], resolve)); const d = a[1] ? num(evalAst(a[1], resolve)) : 0; const f = Math.pow(10, d); return Math.round(v * f) / f; }
        case 'ABS': return Math.abs(num(evalAst(a[0], resolve)));
        case 'MIN': return Math.min(...a.map(x => num(evalAst(x, resolve))));
        case 'MAX': return Math.max(...a.map(x => num(evalAst(x, resolve))));
        case 'AVERAGE': return a.length ? a.reduce((s, x) => s + num(evalAst(x, resolve)), 0) / a.length : 0;
        case 'LEN': return str(evalAst(a[0], resolve)).length;
        case 'UPPER': return str(evalAst(a[0], resolve)).toUpperCase();
        case 'LOWER': return str(evalAst(a[0], resolve)).toLowerCase();
        default: return 0;
      }
    }
    default: return 0;
  }
}
function truthy(v) { if (typeof v === 'number') return v !== 0; if (typeof v === 'boolean') return v; return !!v && v !== '0'; }

/* ============================================================
   COMPUTED VALUES  (formula / rollup / lookup / autonumber / createdTime)
   computeCell returns the logical value for a field on a record:
   select -> option id, multiSelect/link -> array, formula/rollup ->
   scalar, lookup -> array of scalars, others -> stored value.
   ============================================================ */
export function rawCell(record, field) {
  const v = record.cells ? record.cells[field.id] : undefined;
  return v;
}

export function computeCell(table, record, field, seen) {
  if (!isComputed(field.type)) return rawCell(record, field);
  seen = seen || new Set();
  const key = field.id + ':' + record.id;
  if (seen.has(key)) return '#CYCLE';
  seen.add(key);
  if (field.type === 'createdTime') return record.createdTime;
  if (field.type === 'autonumber') return record.seq || 0;
  if (field.type === 'formula') {
    const ast = astFor(field.formula || '');
    const resolve = (name) => scalarByName(table, record, name, seen);
    const out = evalAst(ast, resolve);
    return out;
  }
  if (field.type === 'rollup' || field.type === 'lookup') {
    const linkField = table.fields.find(f => f.id === field.linkFieldId);
    if (!linkField) return field.type === 'lookup' ? [] : 0;
    const linkedTable = findTable(linkField.linkTableId);
    if (!linkedTable) return field.type === 'lookup' ? [] : 0;
    const ids = rawCell(record, linkField) || [];
    const targetId = field.type === 'rollup' ? field.rollupFieldId : field.lookupFieldId;
    const targetField = linkedTable.fields.find(f => f.id === targetId);
    const values = ids.map(rid => {
      const rec = linkedTable.records.find(r => r.id === rid);
      if (!rec || !targetField) return null;
      const raw = computeCell(linkedTable, rec, targetField, seen);
      // Lookups surface the human-facing value, not internal ids.
      if (field.type === 'lookup') {
        if (targetField.type === 'singleSelect') return optionLabel(targetField, raw);
        if (targetField.type === 'multiSelect') return (raw || []).map(id => optionLabel(targetField, id)).join(', ');
        if (targetField.type === 'user') return collaboratorName(raw);
        return raw;
      }
      return raw;
    }).filter(v => v != null && v !== '');
    if (field.type === 'lookup') return values;
    const fn = field.rollupFn || 'sum';
    const nums = values.map(num);
    switch (fn) {
      case 'sum': return nums.reduce((s, n) => s + n, 0);
      case 'avg': return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
      case 'min': return nums.length ? Math.min(...nums) : 0;
      case 'max': return nums.length ? Math.max(...nums) : 0;
      case 'count': return values.length;
      case 'concat': return values.map(str).join(', ');
      default: return nums.reduce((s, n) => s + n, 0);
    }
  }
  return rawCell(record, field);
}

/* Scalar a formula sees for {Field}: numeric for number-ish, option label for
   selects, count for link/multiSelect, string otherwise. */
function scalarByName(table, record, name, seen) {
  const field = table.fields.find(f => f.name.toLowerCase() === String(name).toLowerCase());
  if (!field) return 0;
  const val = computeCell(table, record, field, seen);
  if (field.type === 'singleSelect') return optionLabel(field, val);
  if (field.type === 'multiSelect') return Array.isArray(val) ? val.length : 0;
  if (field.type === 'link') return Array.isArray(val) ? val.length : 0;
  if (field.type === 'checkbox') return val ? 1 : 0;
  if (NUMERIC_TYPES.has(field.type)) return num(val);
  if (field.type === 'formula') return val;
  return val == null ? '' : val;
}

export function optionLabel(field, id) {
  const o = (field.options || []).find(x => x.id === id);
  return o ? o.label : '';
}
export function optionById(field, id) { return (field.options || []).find(x => x.id === id); }

/* Human-facing string for any cell (search, CSV export, calendar labels). */
export function cellText(table, record, field) {
  const v = computeCell(table, record, field);
  switch (field.type) {
    case 'singleSelect': return optionLabel(field, v);
    case 'multiSelect': return (v || []).map(id => optionLabel(field, id)).join(', ');
    case 'checkbox': return v ? 'checked' : '';
    case 'user': return collaboratorName(v);
    case 'rating': return v ? String(v) : '';
    case 'date': return v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    case 'createdTime': return v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    case 'currency': return v == null || v === '' ? '' : '$' + num(v).toLocaleString();
    case 'percent': return v == null || v === '' ? '' : num(v) + '%';
    case 'link': {
      const lf = table.fields.find(f => f.id === field.id);
      const lt = findTable(lf?.linkTableId);
      return (v || []).map(id => primaryText(lt, id)).filter(Boolean).join(', ');
    }
    case 'lookup': return (v || []).map(str).join(', ');
    case 'attachment': return (v || []).map(a => a.name).join(', ');
    default: return v == null ? '' : String(v);
  }
}

export function primaryText(table, recordId) {
  if (!table) return '';
  const rec = table.records.find(r => r.id === recordId);
  if (!rec) return '';
  const pf = table.fields.find(f => f.id === table.primaryFieldId) || table.fields[0];
  return String(computeCell(table, rec, pf) ?? '');
}

/* ============================================================
   FILTER / SORT / GROUP
   ============================================================ */
export const FILTER_OPS = {
  text: ['contains', 'notContains', 'is', 'isNot', 'isEmpty', 'isNotEmpty'],
  number: ['=', '!=', '>', '<', '>=', '<=', 'isEmpty', 'isNotEmpty'],
  select: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
  multi: ['hasAny', 'hasNone', 'isEmpty', 'isNotEmpty'],
  checkbox: ['is'],
  date: ['is', 'before', 'after', 'isEmpty', 'isNotEmpty'],
};
export const OP_LABEL = {
  contains: 'contains', notContains: 'does not contain', is: 'is', isNot: 'is not',
  isEmpty: 'is empty', isNotEmpty: 'is not empty', '=': '=', '!=': 'not =', '>': '>',
  '<': '<', '>=': '>=', '<=': '<=', hasAny: 'has any of', hasNone: 'has none of',
  before: 'is before', after: 'is after',
};
export function opsForField(field) {
  if (!field) return FILTER_OPS.text;
  if (NUMERIC_TYPES.has(field.type)) return FILTER_OPS.number;
  if (field.type === 'singleSelect' || field.type === 'user') return FILTER_OPS.select;
  if (field.type === 'multiSelect' || field.type === 'link') return FILTER_OPS.multi;
  if (field.type === 'checkbox') return FILTER_OPS.checkbox;
  if (field.type === 'date' || field.type === 'createdTime') return FILTER_OPS.date;
  return FILTER_OPS.text;
}

function matchCondition(table, record, cond) {
  const field = table.fields.find(f => f.id === cond.fieldId);
  if (!field) return true;
  const raw = computeCell(table, record, field);
  const empty = raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
  switch (cond.op) {
    case 'isEmpty': return empty;
    case 'isNotEmpty': return !empty;
    case 'contains': return cellText(table, record, field).toLowerCase().includes(String(cond.value || '').toLowerCase());
    case 'notContains': return !cellText(table, record, field).toLowerCase().includes(String(cond.value || '').toLowerCase());
    case 'is': return field.type === 'singleSelect' || field.type === 'user' ? raw === cond.value : cellText(table, record, field).toLowerCase() === String(cond.value || '').toLowerCase();
    case 'isNot': return field.type === 'singleSelect' || field.type === 'user' ? raw !== cond.value : cellText(table, record, field).toLowerCase() !== String(cond.value || '').toLowerCase();
    case '=': return num(raw) === num(cond.value);
    case '!=': return num(raw) !== num(cond.value);
    case '>': return num(raw) > num(cond.value);
    case '<': return num(raw) < num(cond.value);
    case '>=': return num(raw) >= num(cond.value);
    case '<=': return num(raw) <= num(cond.value);
    case 'hasAny': return Array.isArray(raw) && raw.includes(cond.value);
    case 'hasNone': return Array.isArray(raw) && !raw.includes(cond.value);
    case 'before': return raw && new Date(raw) < new Date(cond.value);
    case 'after': return raw && new Date(raw) > new Date(cond.value);
    default: return true;
  }
}

export function passesFilter(table, record, filter) {
  if (!filter || !filter.conditions || !filter.conditions.length) return true;
  const results = filter.conditions.map(c => matchCondition(table, record, c));
  return filter.conjunction === 'or' ? results.some(Boolean) : results.every(Boolean);
}

function compareRecords(table, a, b, sorts) {
  for (const s of sorts) {
    const field = table.fields.find(f => f.id === s.fieldId);
    if (!field) continue;
    let va, vb;
    if (NUMERIC_TYPES.has(field.type)) { va = num(computeCell(table, a, field)); vb = num(computeCell(table, b, field)); }
    else if (field.type === 'date' || field.type === 'createdTime') { va = new Date(computeCell(table, a, field) || 0).getTime(); vb = new Date(computeCell(table, b, field) || 0).getTime(); }
    else if (field.type === 'checkbox') { va = computeCell(table, a, field) ? 1 : 0; vb = computeCell(table, b, field) ? 1 : 0; }
    else { va = cellText(table, a, field).toLowerCase(); vb = cellText(table, b, field).toLowerCase(); }
    if (va < vb) return s.dir === 'desc' ? 1 : -1;
    if (va > vb) return s.dir === 'desc' ? -1 : 1;
  }
  return 0;
}

/* Returns the ordered + filtered record list for a view, plus a search filter. */
export function viewRecords(table, view, search) {
  let recs = table.records.slice();
  if (view && view.filter) recs = recs.filter(r => passesFilter(table, r, view.filter));
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    recs = recs.filter(r => table.fields.some(f => cellText(table, r, f).toLowerCase().includes(q)));
  }
  if (view && view.sorts && view.sorts.length) recs = recs.slice().sort((a, b) => compareRecords(table, a, b, view.sorts));
  return recs;
}

/* Group records by a field for the grid group-by and kanban. Returns
   [{ key, label, colorId, records }] with a trailing "empty" group. */
export function groupRecords(table, records, fieldId) {
  const field = table.fields.find(f => f.id === fieldId);
  if (!field) return [{ key: '__all', label: '', records }];
  const map = new Map();
  const order = [];
  const ensure = (key, label, colorId) => { if (!map.has(key)) { map.set(key, { key, label, colorId, records: [] }); order.push(key); } return map.get(key); };
  if (field.type === 'singleSelect') for (const o of field.options || []) ensure(o.id, o.label, o.colorId);
  for (const r of records) {
    const v = computeCell(table, r, field);
    if (field.type === 'singleSelect') { const g = v ? ensure(v, optionLabel(field, v), optionById(field, v)?.colorId) : ensure('__empty', 'Empty', 'gray'); g.records.push(r); }
    else if (field.type === 'user') { const g = v ? ensure(v, collaboratorName(v), 'indigo') : ensure('__empty', 'Empty', 'gray'); g.records.push(r); }
    else if (field.type === 'checkbox') { const g = ensure(v ? 'y' : 'n', v ? 'Checked' : 'Unchecked', v ? 'green' : 'gray'); g.records.push(r); }
    else { const label = cellText(table, r, field) || 'Empty'; const g = ensure(label || '__empty', label || 'Empty', 'gray'); g.records.push(r); }
  }
  // move empty to the end
  const groups = order.map(k => map.get(k)).filter(g => g.records.length || field.type === 'singleSelect');
  groups.sort((a, b) => (a.key === '__empty' ? 1 : 0) - (b.key === '__empty' ? 1 : 0));
  return groups;
}

/* ============================================================
   SEED  (4 rich bases)
   ============================================================ */
function mkField(def) {
  return {
    id: nid('fld'), name: 'Field', type: 'text', width: 168, hidden: false,
    options: undefined, ...def,
  };
}
function opts(pairs) { return pairs.map(([label, colorId]) => ({ id: nid('opt'), label, colorId })); }

function buildSeed() {
  const rnd = mulberry32(20260713);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const DAY = 86400000;
  // Fixed reference "now" so seeded dates are deterministic (no Date.now in seed).
  const NOW = Date.UTC(2026, 6, 13);
  const iso = (offDays) => new Date(NOW + offDays * DAY).toISOString();
  const dateOnly = (offDays) => new Date(NOW + offDays * DAY).toISOString().slice(0, 10);

  let seq = 1;
  const rec = (cells) => ({ id: nid('rec'), seq: seq++, createdTime: iso(-range(1, 90)), cells });

  const bases = [];

  /* ---------- BASE 1: Sales CRM (link + rollup + lookup showcase) ---------- */
  (function salesCRM() {
    // Accounts table
    const acOwner = mkField({ name: 'Owner', type: 'user', width: 150 });
    const acTier = mkField({ name: 'Tier', type: 'singleSelect', width: 120, options: opts([['Enterprise', 'purple'], ['Mid-Market', 'blue'], ['SMB', 'teal']]) });
    const acHealth = mkField({ name: 'Health', type: 'singleSelect', width: 120, options: opts([['Green', 'green'], ['Yellow', 'amber'], ['Red', 'red']]) });
    const acName = mkField({ name: 'Account', type: 'text', width: 190 });
    const acIndustry = mkField({ name: 'Industry', type: 'singleSelect', width: 150, options: opts([['Manufacturing', 'orange'], ['SaaS', 'indigo'], ['Healthcare', 'green'], ['Finance', 'blue'], ['Logistics', 'amber']]) });
    const acSite = mkField({ name: 'Website', type: 'url', width: 180 });
    const acDeals = mkField({ name: 'Deals', type: 'link', width: 220, linkTableId: null }); // set below
    const acPipeline = mkField({ name: 'Open pipeline', type: 'rollup', width: 150, linkFieldId: acDeals.id, rollupFieldId: null, rollupFn: 'sum' });
    const acWon = mkField({ name: 'Closed won', type: 'rollup', width: 140, linkFieldId: acDeals.id, rollupFieldId: null, rollupFn: 'sum' });

    // Deals table
    const dlName = mkField({ name: 'Deal', type: 'text', width: 210 });
    const dlValue = mkField({ name: 'Value', type: 'currency', width: 130 });
    const dlStage = mkField({ name: 'Stage', type: 'singleSelect', width: 150, options: opts([['Lead', 'gray'], ['Qualified', 'blue'], ['Discovery', 'indigo'], ['Proposal', 'amber'], ['Negotiation', 'teal'], ['Closed Won', 'green'], ['Closed Lost', 'red']]) });
    const dlProb = mkField({ name: 'Probability', type: 'percent', width: 130 });
    const dlWeighted = mkField({ name: 'Weighted', type: 'formula', width: 140, formula: '{Value} * {Probability} / 100' });
    const dlClose = mkField({ name: 'Close date', type: 'date', width: 140 });
    const dlOwner = mkField({ name: 'Owner', type: 'user', width: 150 });
    const dlAccount = mkField({ name: 'Account', type: 'link', width: 180, linkTableId: null });
    const dlIndustry = mkField({ name: 'Account industry', type: 'lookup', width: 160, linkFieldId: null, lookupFieldId: null });

    const accounts = { id: nid('tbl'), name: 'Accounts', icon: 'building', primaryFieldId: acName.id,
      fields: [acName, acTier, acIndustry, acHealth, acOwner, acSite, acDeals, acPipeline, acWon], records: [], views: [] };
    const deals = { id: nid('tbl'), name: 'Deals', icon: 'target', primaryFieldId: dlName.id,
      fields: [dlName, dlAccount, dlValue, dlStage, dlProb, dlWeighted, dlClose, dlOwner, dlIndustry], records: [], views: [] };

    // wire cross-table links now that ids exist
    acDeals.linkTableId = deals.id;
    dlAccount.linkTableId = accounts.id;
    acPipeline.rollupFieldId = dlValue.id;
    acWon.rollupFieldId = dlValue.id;
    dlIndustry.linkFieldId = dlAccount.id;
    dlIndustry.lookupFieldId = acIndustry.id;

    const CO = ['Vertex Robotics', 'Northwind Systems', 'Meridian Health', 'Apex Freight', 'Cobalt Labs', 'Summit Capital', 'Ironclad Media', 'Beacon Retail'];
    const accRecs = CO.map((name, i) => rec({
      [acName.id]: name,
      [acTier.id]: acTier.options[i % 3].id,
      [acIndustry.id]: acIndustry.options[i % acIndustry.options.length].id,
      [acHealth.id]: acHealth.options[range(0, 2)].id,
      [acOwner.id]: pick(COLLABORATORS).id,
      [acSite.id]: 'https://' + name.toLowerCase().replace(/[^a-z]/g, '') + '.com',
      [acDeals.id]: [],
    }));
    accounts.records = accRecs;

    const STAGES = dlStage.options;
    const KIND = ['Platform rollout', 'Annual license', 'Enterprise expansion', 'Pilot to production', 'Renewal + upsell', 'New logo'];
    const dealRecs = [];
    for (const acc of accRecs) {
      const n = range(1, 3);
      for (let k = 0; k < n; k++) {
        const st = STAGES[range(0, 6)];
        const val = range(8, 90) * 5000;
        const prob = { Lead: 10, Qualified: 25, Discovery: 45, Proposal: 65, Negotiation: 85, 'Closed Won': 100, 'Closed Lost': 0 }[st.label];
        const dr = rec({
          [dlName.id]: `${acc.cells[acName.id]} - ${pick(KIND)}`,
          [dlAccount.id]: [acc.id],
          [dlValue.id]: val,
          [dlStage.id]: st.id,
          [dlProb.id]: prob,
          [dlClose.id]: dateOnly(st.label.startsWith('Closed') ? -range(2, 60) : range(5, 90)),
          [dlOwner.id]: acc.cells[acOwner.id],
        });
        dealRecs.push(dr);
        acc.cells[acDeals.id].push(dr.id);
        // rollups reflect only open vs won by convention handled in UI copy; keep simple: pipeline = open sum
      }
    }
    deals.records = dealRecs;

    accounts.views = [
      gridView('All accounts', accounts),
      { id: nid('vw'), name: 'By tier', type: 'kanban', groupFieldId: acTier.id, coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [] },
      galleryView('Gallery', accounts),
    ];
    deals.views = [
      gridView('All deals', deals),
      { id: nid('vw'), name: 'Pipeline', type: 'kanban', groupFieldId: dlStage.id, coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [{ fieldId: dlValue.id, dir: 'desc' }] },
      { id: nid('vw'), name: 'Close calendar', type: 'calendar', dateFieldId: dlClose.id, hiddenFieldIds: [], filter: null, sorts: [] },
    ];

    bases.push({ id: nid('base'), name: 'Sales CRM', icon: 'target', colorId: 'indigo',
      desc: 'Accounts and deals, linked. Rollups sum each account pipeline; a lookup pulls industry across the link.',
      tables: [accounts, deals] });
  })();

  /* ---------- BASE 2: Content Calendar ---------- */
  (function content() {
    const title = mkField({ name: 'Title', type: 'text', width: 230 });
    const status = mkField({ name: 'Status', type: 'singleSelect', width: 140, options: opts([['Idea', 'gray'], ['Drafting', 'amber'], ['In review', 'blue'], ['Scheduled', 'purple'], ['Published', 'green']]) });
    const channels = mkField({ name: 'Channels', type: 'multiSelect', width: 200, options: opts([['Blog', 'indigo'], ['LinkedIn', 'blue'], ['X', 'gray'], ['Email', 'teal'], ['YouTube', 'red']]) });
    const owner = mkField({ name: 'Owner', type: 'user', width: 150 });
    const publish = mkField({ name: 'Publish date', type: 'date', width: 150 });
    const type = mkField({ name: 'Type', type: 'singleSelect', width: 130, options: opts([['Article', 'blue'], ['Video', 'red'], ['Social', 'teal'], ['Newsletter', 'amber']]) });
    const wordCount = mkField({ name: 'Word count', type: 'number', width: 130 });
    const readMins = mkField({ name: 'Read time', type: 'formula', width: 130, formula: 'ROUND({Word count} / 220, 0) & " min"' });
    const priority = mkField({ name: 'Priority', type: 'rating', width: 130 });
    const done = mkField({ name: 'Published?', type: 'checkbox', width: 120 });
    const brief = mkField({ name: 'Brief', type: 'longText', width: 260 });

    const TITLES = ['The AI-native revenue playbook', 'How Ardovo kills the CRM tab tax', 'Grid vs Airtable: a teardown', 'Forecasting without the spreadsheet', 'Rook: your revenue operator', 'From lead to cash in one system', '10 automations that print pipeline', 'Why linked records beat lookups', 'The death of the standalone database', 'A field guide to rollups', 'Kanban that actually moves deals', 'Ship your Q3 content in a day'];
    const tbl = { id: nid('tbl'), name: 'Editorial', icon: 'fileText', primaryFieldId: title.id,
      fields: [title, status, type, channels, owner, publish, wordCount, readMins, priority, done, brief], records: [], views: [] };
    tbl.records = TITLES.map((t, i) => rec({
      [title.id]: t,
      [status.id]: status.options[i % status.options.length].id,
      [type.id]: type.options[i % type.options.length].id,
      [channels.id]: [channels.options[i % 5].id, channels.options[(i + 2) % 5].id],
      [owner.id]: pick(COLLABORATORS).id,
      [publish.id]: dateOnly(range(-14, 24)),
      [wordCount.id]: range(4, 24) * 100,
      [priority.id]: range(1, 5),
      [done.id]: i % 5 === 4,
      [brief.id]: 'Angle: make the reader feel the CRM tab tax, then show the one-system payoff.',
    }));
    tbl.views = [
      gridView('Calendar grid', tbl),
      { id: nid('vw'), name: 'Board', type: 'kanban', groupFieldId: status.id, coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [] },
      { id: nid('vw'), name: 'Calendar', type: 'calendar', dateFieldId: publish.id, hiddenFieldIds: [], filter: null, sorts: [] },
      galleryView('Gallery', tbl),
    ];
    bases.push({ id: nid('base'), name: 'Content Calendar', icon: 'calendar', colorId: 'teal',
      desc: 'Plan, draft, and ship content. A formula turns word count into read time; the calendar view runs off publish date.',
      tables: [tbl] });
  })();

  /* ---------- BASE 3: Inventory ---------- */
  (function inventory() {
    const sku = mkField({ name: 'SKU', type: 'text', width: 120 });
    const product = mkField({ name: 'Product', type: 'text', width: 200 });
    const category = mkField({ name: 'Category', type: 'singleSelect', width: 150, options: opts([['Hardware', 'blue'], ['Accessory', 'teal'], ['Consumable', 'amber'], ['Software', 'purple']]) });
    const price = mkField({ name: 'Unit price', type: 'currency', width: 130 });
    const cost = mkField({ name: 'Unit cost', type: 'currency', width: 130 });
    const qty = mkField({ name: 'On hand', type: 'number', width: 120 });
    const reorderAt = mkField({ name: 'Reorder at', type: 'number', width: 120 });
    const stockValue = mkField({ name: 'Stock value', type: 'formula', width: 150, formula: '{On hand} * {Unit price}' });
    const margin = mkField({ name: 'Margin %', type: 'formula', width: 130, formula: 'ROUND(({Unit price} - {Unit cost}) / {Unit price} * 100, 1)' });
    const reorder = mkField({ name: 'Reorder?', type: 'formula', width: 130, formula: 'IF({On hand} < {Reorder at}, "Reorder", "OK")' });
    const supplier = mkField({ name: 'Supplier', type: 'singleSelect', width: 150, options: opts([['Acme Supply', 'indigo'], ['Globex', 'orange'], ['Initech', 'green'], ['Umbra Parts', 'red']]) });

    const PRODUCTS = ['Sensor Array X1', 'Control Module', 'Power Cell', 'Cable Loom', 'Mount Bracket', 'Firmware License', 'Cooling Fan', 'Display Panel', 'Battery Pack', 'Antenna Kit', 'Relay Board', 'Gasket Set'];
    const tbl = { id: nid('tbl'), name: 'Stock', icon: 'box', primaryFieldId: product.id,
      fields: [sku, product, category, supplier, price, cost, qty, reorderAt, stockValue, margin, reorder], records: [], views: [] };
    tbl.records = PRODUCTS.map((p, i) => {
      const price0 = range(20, 400); const cost0 = Math.round(price0 * (0.4 + rnd() * 0.35));
      return rec({
        [sku.id]: 'SKU-' + String(1000 + i),
        [product.id]: p,
        [category.id]: category.options[i % category.options.length].id,
        [supplier.id]: supplier.options[i % supplier.options.length].id,
        [price.id]: price0,
        [cost.id]: cost0,
        [qty.id]: range(0, 240),
        [reorderAt.id]: range(20, 60),
      });
    });
    tbl.views = [
      gridView('All stock', tbl),
      { id: nid('vw'), name: 'By category', type: 'kanban', groupFieldId: category.id, coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [] },
    ];
    bases.push({ id: nid('base'), name: 'Inventory', icon: 'box', colorId: 'orange',
      desc: 'Every row computes its own stock value, margin, and a reorder flag with IF(). Zero spreadsheet formulas to maintain.',
      tables: [tbl] });
  })();

  /* ---------- BASE 4: Applicant Tracker ---------- */
  (function ats() {
    const name = mkField({ name: 'Candidate', type: 'text', width: 180 });
    const role = mkField({ name: 'Role', type: 'singleSelect', width: 170, options: opts([['Account Executive', 'blue'], ['Solutions Engineer', 'indigo'], ['Product Designer', 'purple'], ['Backend Engineer', 'teal'], ['Customer Success', 'green']]) });
    const stage = mkField({ name: 'Stage', type: 'singleSelect', width: 150, options: opts([['Applied', 'gray'], ['Screen', 'blue'], ['Interview', 'amber'], ['Onsite', 'purple'], ['Offer', 'teal'], ['Hired', 'green'], ['Rejected', 'red']]) });
    const rating = mkField({ name: 'Rating', type: 'rating', width: 130 });
    const recruiter = mkField({ name: 'Recruiter', type: 'user', width: 150 });
    const applied = mkField({ name: 'Applied', type: 'date', width: 140 });
    const email = mkField({ name: 'Email', type: 'email', width: 200 });
    const phone = mkField({ name: 'Phone', type: 'phone', width: 150 });
    const resume = mkField({ name: 'Resume', type: 'url', width: 160 });
    const skills = mkField({ name: 'Skills', type: 'multiSelect', width: 200, options: opts([['SaaS', 'blue'], ['Enterprise', 'purple'], ['Outbound', 'amber'], ['Technical', 'teal'], ['Leadership', 'green']]) });
    const source = mkField({ name: 'Source', type: 'singleSelect', width: 140, options: opts([['Referral', 'green'], ['LinkedIn', 'blue'], ['Inbound', 'teal'], ['Agency', 'amber']]) });

    const FIRST = ['James', 'Maria', 'David', 'Priya', 'Wei', 'Fatima', 'Diego', 'Aisha', 'Noah', 'Olivia', 'Marcus', 'Sofia', 'Kenji', 'Amara'];
    const LAST = ['Chen', 'Patel', 'Rodriguez', 'Kim', 'Nguyen', 'Okafor', 'Rossi', 'Haddad', 'Foster', 'Brooks', 'Sullivan', 'Mercer'];
    const tbl = { id: nid('tbl'), name: 'Candidates', icon: 'users', primaryFieldId: name.id,
      fields: [name, role, stage, rating, recruiter, applied, source, skills, email, phone, resume], records: [], views: [] };
    tbl.records = Array.from({ length: 16 }).map((_, i) => {
      const fn = FIRST[i % FIRST.length]; const ln = LAST[(i * 3) % LAST.length];
      return rec({
        [name.id]: `${fn} ${ln}`,
        [role.id]: role.options[i % role.options.length].id,
        [stage.id]: stage.options[range(0, 6)].id,
        [rating.id]: range(2, 5),
        [recruiter.id]: pick(COLLABORATORS).id,
        [applied.id]: dateOnly(-range(1, 40)),
        [source.id]: source.options[i % source.options.length].id,
        [skills.id]: [skills.options[i % 5].id, skills.options[(i + 1) % 5].id],
        [email.id]: `${fn.toLowerCase()}.${ln.toLowerCase()}@mail.com`,
        [phone.id]: `(${range(200, 989)}) ${range(200, 989)}-${range(1000, 9999)}`,
        [resume.id]: 'https://resume.link/' + fn.toLowerCase() + ln.toLowerCase(),
      });
    });
    tbl.views = [
      { id: nid('vw'), name: 'Pipeline', type: 'kanban', groupFieldId: stage.id, coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [] },
      gridView('All candidates', tbl),
      galleryView('Gallery', tbl),
    ];
    bases.push({ id: nid('base'), name: 'Applicant Tracker', icon: 'users', colorId: 'purple',
      desc: 'Move candidates across stages on a drag-and-drop board, rate them with stars, and assign a recruiter.',
      tables: [tbl] });
  })();

  return { bases, activeBaseId: bases[0].id };
}

function gridView(name, table) {
  return { id: nid('vw'), name, type: 'grid', rowHeight: 'short', hiddenFieldIds: [], groupByFieldId: null, filter: null, sorts: [] };
}
function galleryView(name, table) {
  return { id: nid('vw'), name, type: 'gallery', coverFieldId: null, hiddenFieldIds: [], filter: null, sorts: [] };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.bases && s.bases.length) return s; }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

// State init at module eval. All helpers above are hoisted function
// declarations, so this is TDZ-safe.
let state = load();
const subs = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetGrid() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getGridState() { return state; }

export function useGridStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- reads ---------- */
export const getBases = () => state.bases;
export const getBase = (id) => state.bases.find(b => b.id === id);
export function findTable(tableId) {
  for (const b of state.bases) { const t = b.tables.find(x => x.id === tableId); if (t) return t; }
  return null;
}
export function findBaseOfTable(tableId) {
  return state.bases.find(b => b.tables.some(t => t.id === tableId)) || null;
}
export const visibleFields = (table, view) => {
  const hidden = new Set(view?.hiddenFieldIds || []);
  return table.fields.filter(f => !hidden.has(f.id));
};

/* Tables that a link field can point at (any table except itself). */
export function linkableTables(excludeTableId) {
  const out = [];
  for (const b of state.bases) for (const t of b.tables) if (t.id !== excludeTableId) out.push({ ...t, baseName: b.name });
  return out;
}

/* ============================================================
   WRITE API   (mutating helpers all commit + notify)
   ============================================================ */
function mutateTable(tableId, fn) {
  const bases = state.bases.map(b => ({
    ...b,
    tables: b.tables.map(t => (t.id === tableId ? fn({ ...t }) : t)),
  }));
  commit({ ...state, bases });
}

export function setActiveBase(baseId) { commit({ ...state, activeBaseId: baseId }); }

export function addBase(name) {
  const title = mkField({ name: 'Name', type: 'text', width: 220 });
  const notes = mkField({ name: 'Notes', type: 'longText', width: 260 });
  const status = mkField({ name: 'Status', type: 'singleSelect', width: 140, options: opts([['To do', 'gray'], ['Doing', 'amber'], ['Done', 'green']]) });
  const table = { id: nid('tbl'), name: 'Table 1', icon: 'grid', primaryFieldId: title.id,
    fields: [title, status, notes], records: [{ id: nid('rec'), seq: 1, createdTime: new Date().toISOString(), cells: {} }], views: [gridView('Grid view', {})] };
  const base = { id: nid('base'), name: (name || 'Untitled base').trim(), icon: 'grid', colorId: 'indigo', desc: '', tables: [table] };
  commit({ ...state, bases: [...state.bases, base], activeBaseId: base.id });
  return base;
}

export function addTable(baseId, name) {
  const title = mkField({ name: 'Name', type: 'text', width: 220 });
  const status = mkField({ name: 'Status', type: 'singleSelect', width: 140, options: opts([['To do', 'gray'], ['Doing', 'amber'], ['Done', 'green']]) });
  const table = { id: nid('tbl'), name: (name || 'New table').trim(), icon: 'grid', primaryFieldId: title.id,
    fields: [title, status], records: [{ id: nid('rec'), seq: 1, createdTime: new Date().toISOString(), cells: {} }], views: [gridView('Grid view', {})] };
  const bases = state.bases.map(b => (b.id === baseId ? { ...b, tables: [...b.tables, table] } : b));
  commit({ ...state, bases });
  return table;
}

export function renameTable(tableId, name) { mutateTable(tableId, (t) => ({ ...t, name: (name || t.name).trim() })); }

export function addField(tableId, def) {
  const field = mkField({
    name: (def.name || 'Field').trim(),
    type: def.type || 'text',
    width: def.width || 168,
    options: (def.type === 'singleSelect' || def.type === 'multiSelect') ? (def.options || opts([['Option 1', 'blue'], ['Option 2', 'teal'], ['Option 3', 'amber']])) : undefined,
    formula: def.type === 'formula' ? (def.formula || '') : undefined,
    linkTableId: def.type === 'link' ? (def.linkTableId || null) : undefined,
    linkFieldId: (def.type === 'rollup' || def.type === 'lookup') ? (def.linkFieldId || null) : undefined,
    rollupFieldId: def.type === 'rollup' ? (def.rollupFieldId || null) : undefined,
    rollupFn: def.type === 'rollup' ? (def.rollupFn || 'sum') : undefined,
    lookupFieldId: def.type === 'lookup' ? (def.lookupFieldId || null) : undefined,
  });
  mutateTable(tableId, (t) => ({ ...t, fields: [...t.fields, field] }));
  return field;
}

export function updateField(tableId, fieldId, patch) {
  mutateTable(tableId, (t) => ({ ...t, fields: t.fields.map(f => (f.id === fieldId ? { ...f, ...patch } : f)) }));
}

export function deleteField(tableId, fieldId) {
  mutateTable(tableId, (t) => {
    if (t.primaryFieldId === fieldId) return t; // never delete the primary field
    return { ...t, fields: t.fields.filter(f => f.id !== fieldId) };
  });
}

export function reorderField(tableId, fieldId, toIndex) {
  mutateTable(tableId, (t) => {
    const fields = t.fields.slice();
    const from = fields.findIndex(f => f.id === fieldId);
    if (from < 0) return t;
    const [moved] = fields.splice(from, 1);
    fields.splice(Math.max(0, Math.min(fields.length, toIndex)), 0, moved);
    return { ...t, fields };
  });
}

export function setFieldWidth(tableId, fieldId, width) {
  mutateTable(tableId, (t) => ({ ...t, fields: t.fields.map(f => (f.id === fieldId ? { ...f, width: Math.max(80, Math.round(width)) } : f)) }));
}

export function addRecord(tableId, cells) {
  let created;
  mutateTable(tableId, (t) => {
    const seq = t.records.reduce((m, r) => Math.max(m, r.seq || 0), 0) + 1;
    created = { id: nid('rec'), seq, createdTime: new Date().toISOString(), cells: cells || {} };
    return { ...t, records: [...t.records, created] };
  });
  return created;
}

export function duplicateRecord(tableId, recordId) {
  mutateTable(tableId, (t) => {
    const src = t.records.find(r => r.id === recordId);
    if (!src) return t;
    const seq = t.records.reduce((m, r) => Math.max(m, r.seq || 0), 0) + 1;
    const copy = { id: nid('rec'), seq, createdTime: new Date().toISOString(), cells: { ...src.cells } };
    const idx = t.records.findIndex(r => r.id === recordId);
    const records = t.records.slice(); records.splice(idx + 1, 0, copy);
    return { ...t, records };
  });
}

export function deleteRecord(tableId, recordId) {
  mutateTable(tableId, (t) => ({ ...t, records: t.records.filter(r => r.id !== recordId) }));
}

export function updateCell(tableId, recordId, fieldId, value) {
  mutateTable(tableId, (t) => ({
    ...t,
    records: t.records.map(r => (r.id === recordId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r)),
  }));
}

/* ---------- views ---------- */
export function addView(tableId, view) {
  const v = { id: nid('vw'), name: view.name || 'New view', type: view.type || 'grid', hiddenFieldIds: [], filter: null, sorts: [], groupByFieldId: null, rowHeight: 'short', ...view };
  mutateTable(tableId, (t) => ({ ...t, views: [...t.views, v] }));
  return v;
}
export function updateView(tableId, viewId, patch) {
  mutateTable(tableId, (t) => ({ ...t, views: t.views.map(v => (v.id === viewId ? { ...v, ...patch } : v)) }));
}
export function deleteView(tableId, viewId) {
  mutateTable(tableId, (t) => (t.views.length <= 1 ? t : { ...t, views: t.views.filter(v => v.id !== viewId) }));
}

/* ---------- select option writers ---------- */
export function addOption(tableId, fieldId, label, colorId) {
  const opt = { id: nid('opt'), label: (label || 'Option').trim(), colorId: colorId || pickColor() };
  mutateTable(tableId, (t) => ({ ...t, fields: t.fields.map(f => (f.id === fieldId ? { ...f, options: [...(f.options || []), opt] } : f)) }));
  return opt;
}
let colorTick = 0;
function pickColor() { const c = SELECT_COLORS[colorTick % SELECT_COLORS.length]; colorTick++; return c.id; }

/* ============================================================
   CSV IMPORT  (paste). First row = headers, mapped to text fields.
   Creates any missing fields, then a record per row.
   ============================================================ */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

export function importCsv(tableId, text) {
  const rows = parseCsv(text);
  if (rows.length < 1) return { error: 'empty', message: 'Nothing to import.' };
  const headers = rows[0].map(h => h.trim()).filter(Boolean);
  const table = findTable(tableId);
  if (!table) return { error: 'table', message: 'Table not found.' };
  const byName = new Map(table.fields.map(f => [f.name.toLowerCase(), f]));
  const created = [];
  // ensure a field exists for each header
  for (const h of headers) {
    if (!byName.has(h.toLowerCase())) {
      const f = addField(tableId, { name: h, type: 'text' });
      created.push(f);
      byName.set(h.toLowerCase(), f);
    }
  }
  const fresh = findTable(tableId);
  const map = new Map(fresh.fields.map(f => [f.name.toLowerCase(), f]));
  let added = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = {};
    headers.forEach((h, ci) => {
      const f = map.get(h.toLowerCase());
      if (!f) return;
      const raw = (rows[r][ci] || '').trim();
      if (raw === '') return;
      cells[f.id] = NUMERIC_TYPES.has(f.type) ? num(raw) : raw;
    });
    if (Object.keys(cells).length) { addRecord(tableId, cells); added++; }
  }
  return { ok: true, added, fields: created.length };
}

/* CSV export of a view (used by the toolbar Export). */
export function exportCsv(table, view, search) {
  const fields = visibleFields(table, view);
  const recs = viewRecords(table, view, search);
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = fields.map(f => esc(f.name)).join(',');
  const body = recs.map(r => fields.map(f => esc(cellText(table, r, f))).join(',')).join('\n');
  return head + '\n' + body;
}
