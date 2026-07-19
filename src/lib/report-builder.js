// ============================================================
// ARDOVO REPORT BUILDER v2 ENGINE
// A richer, drag-to-build report model layered on top of the live
// store. Where src/lib/reports-data.js owns the simple one-metric /
// one-dimension gallery, THIS module owns the v2 builder:
//   - a full report DEFINITION model (source, dimensions, measure,
//     filters, group-by, viz type, date range),
//   - a deterministic ENGINE that runs a definition over the live
//     store and returns chart-ready rows + multi-series data,
//   - a saved-report LIBRARY (localStorage rally_report_builder_v1)
//     with pub/sub so the page re-renders on save/delete,
//   - a COHORT analysis helper (retention / conversion by cohort
//     month), and
//   - SCHEDULED DELIVERY config (localStorage rally_report_schedules_v1).
// Pure + deterministic: same store + same definition => same output.
// SUPABASE: saved defs -> from('rally_report_defs'); schedules ->
// from('rally_report_schedules'). ASCII only. NO em-dash / en-dash.
// ============================================================
import {
  getDeals, getContacts, getCompanies, getActivities,
  userName, stageById, STAGES, getCompany,
} from './store.js';

const DEFS_KEY = 'rally_report_builder_v1';
const SCHED_KEY = 'rally_report_schedules_v1';

/* ============================================================
   FIELD CATALOG
   Each source exposes fields the builder can drag onto the canvas.
   role: 'dim'  -> a group-by dimension (buckets rows by a label)
         'measure' -> a numeric field that can be aggregated
         'date'    -> a timestamp usable for the date-range window
   ============================================================ */
export const SOURCES = [
  { id: 'deals', label: 'Deals', icon: 'target', noun: 'deal' },
  { id: 'contacts', label: 'Contacts', icon: 'users', noun: 'contact' },
  { id: 'companies', label: 'Companies', icon: 'building', noun: 'company' },
  { id: 'activities', label: 'Activities', icon: 'activity', noun: 'activity' },
];
export const sourceMeta = (id) => SOURCES.find(s => s.id === id) || SOURCES[0];

// type drives value formatting: 'money' | 'percent' | 'number' | 'text' | 'date'
export const FIELDS = {
  deals: [
    { id: 'stage', label: 'Stage', role: 'dim', type: 'text' },
    { id: 'owner', label: 'Owner', role: 'dim', type: 'text' },
    { id: 'status', label: 'Status', role: 'dim', type: 'text' },
    { id: 'leadSource', label: 'Lead source', role: 'dim', type: 'text', join: 'source' },
    { id: 'industry', label: 'Industry', role: 'dim', type: 'text', join: 'company' },
    { id: 'companySize', label: 'Company size', role: 'dim', type: 'text', join: 'company' },
    { id: 'health', label: 'Account health', role: 'dim', type: 'text', join: 'company' },
    { id: 'contactTitle', label: 'Primary contact title', role: 'dim', type: 'text', join: 'contact' },
    { id: 'engagementBand', label: 'Email engagement band', role: 'dim', type: 'text', join: 'activity' },
    { id: 'closeMonth', label: 'Close month', role: 'dim', type: 'text', temporal: true },
    { id: 'createdMonth', label: 'Created month', role: 'dim', type: 'text', temporal: true },
    { id: 'valueBand', label: 'Deal size band', role: 'dim', type: 'text' },
    { id: 'value', label: 'Deal value', role: 'measure', type: 'money' },
    { id: 'weighted', label: 'Weighted value', role: 'measure', type: 'money' },
    { id: 'probability', label: 'Probability', role: 'measure', type: 'percent' },
    { id: 'emailTouches', label: 'Email touches', role: 'measure', type: 'number', join: 'activity' },
    { id: 'meetingTouches', label: 'Meetings', role: 'measure', type: 'number', join: 'activity' },
    { id: 'activityCount', label: 'Total activities', role: 'measure', type: 'number', join: 'activity' },
    { id: 'daysOpen', label: 'Days open', role: 'measure', type: 'number' },
    { id: 'closeDate', label: 'Close date', role: 'date', type: 'date' },
    { id: 'createdAt', label: 'Created date', role: 'date', type: 'date' },
  ],
  contacts: [
    { id: 'owner', label: 'Owner', role: 'dim', type: 'text' },
    { id: 'industry', label: 'Industry', role: 'dim', type: 'text' },
    { id: 'title', label: 'Title', role: 'dim', type: 'text' },
    { id: 'lifecycleStage', label: 'Lifecycle stage', role: 'dim', type: 'text' },
    { id: 'createdMonth', label: 'Created month', role: 'dim', type: 'text', temporal: true },
    { id: 'createdAt', label: 'Created date', role: 'date', type: 'date' },
    { id: 'lastActivityAt', label: 'Last activity', role: 'date', type: 'date' },
  ],
  companies: [
    { id: 'industry', label: 'Industry', role: 'dim', type: 'text' },
    { id: 'owner', label: 'Owner', role: 'dim', type: 'text' },
    { id: 'size', label: 'Company size', role: 'dim', type: 'text' },
    { id: 'health', label: 'Health', role: 'dim', type: 'text' },
    { id: 'lifecycleStage', label: 'Lifecycle stage', role: 'dim', type: 'text' },
    { id: 'location', label: 'Location', role: 'dim', type: 'text' },
    { id: 'createdMonth', label: 'Created month', role: 'dim', type: 'text', temporal: true },
    { id: 'createdAt', label: 'Created date', role: 'date', type: 'date' },
  ],
  activities: [
    { id: 'type', label: 'Type', role: 'dim', type: 'text' },
    { id: 'owner', label: 'Owner', role: 'dim', type: 'text' },
    { id: 'done', label: 'Completed', role: 'dim', type: 'text' },
    { id: 'relatedType', label: 'Related to', role: 'dim', type: 'text' },
    { id: 'month', label: 'Month', role: 'dim', type: 'text', temporal: true },
    { id: 'dueAt', label: 'Due date', role: 'date', type: 'date' },
    { id: 'createdAt', label: 'Created date', role: 'date', type: 'date' },
  ],
};

export const AGGREGATIONS = [
  { id: 'count', label: 'Count', needsField: false },
  { id: 'sum', label: 'Sum', needsField: true },
  { id: 'avg', label: 'Average', needsField: true },
  { id: 'min', label: 'Minimum', needsField: true },
  { id: 'max', label: 'Maximum', needsField: true },
];

export const VIZ_TYPES = [
  { id: 'bar', label: 'Bar', icon: 'chart' },
  { id: 'line', label: 'Line', icon: 'trendUp' },
  { id: 'area', label: 'Area', icon: 'trendUp' },
  { id: 'pie', label: 'Donut', icon: 'pie' },
  { id: 'pivot', label: 'Pivot', icon: 'grid' },
  { id: 'table', label: 'Table', icon: 'list' },
  { id: 'kpi', label: 'Single value', icon: 'target' },
];

export const FILTER_OPS = [
  { id: 'is', label: 'is' },
  { id: 'isNot', label: 'is not' },
  { id: 'contains', label: 'contains' },
  { id: 'gt', label: 'greater than' },
  { id: 'lt', label: 'less than' },
];

export const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'last_90', label: 'Last 90 days' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
];

// Distinct dimension values present in the live store, for filter menus.
export function dimValueOptions(source, dim) {
  const ctx = buildCtx();
  const set = new Set();
  for (const r of recordsFor(source)) set.add(dimValue(r, source, dim, ctx));
  return [...set].sort((a, b) => String(a).localeCompare(String(b)));
}

export function fieldsFor(source) { return FIELDS[source] || FIELDS.deals; }
export function dimsFor(source) { return fieldsFor(source).filter(f => f.role === 'dim'); }
export function measureFieldsFor(source) { return fieldsFor(source).filter(f => f.role === 'measure'); }
export function dateFieldsFor(source) { return fieldsFor(source).filter(f => f.role === 'date'); }
export function fieldById(source, id) { return fieldsFor(source).find(f => f.id === id) || null; }

/* ============================================================
   VALUE RESOLUTION
   ============================================================ */
const cap = (s) => String(s || '').replace(/^\w/, c => c.toUpperCase());
const monthLabel = (iso) => {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (isNaN(d)) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};
const monthOrder = (iso) => { const d = new Date(iso || 0); return d.getFullYear() * 12 + d.getMonth(); };

/* ------------------------------------------------------------
   LEAD SOURCE (cross-object, deterministic, read-only)
   Mirrors the deterministic per-deal source mix used by the
   Marketing Hub (src/lib/markethub-data.js) so a deal's source is
   stable across reloads and consistent product-wide, WITHOUT taking
   a hard dependency on that module (kept self-contained + safe).
   ------------------------------------------------------------ */
const LEAD_SOURCE_MIX = [
  { label: 'Organic Search', w: 18 }, { label: 'Paid Search', w: 14 },
  { label: 'Email', w: 12 }, { label: 'Social', w: 10 },
  { label: 'Events', w: 8 }, { label: 'Referral', w: 8 },
  { label: 'Content', w: 8 }, { label: 'Outbound Sales', w: 22 },
];
function strhash(s) {
  let h = 0; const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function leadSourceFor(deal) {
  const total = LEAD_SOURCE_MIX.reduce((s, m) => s + m.w, 0);
  let r = strhash('src|' + (deal?.id || '')) % total;
  for (const m of LEAD_SOURCE_MIX) { if (r < m.w) return m.label; r -= m.w; }
  return 'Outbound Sales';
}

function engagementBand(touches) {
  const n = Number(touches) || 0;
  if (n === 0) return 'No engagement';
  if (n <= 2) return 'Low (1-2)';
  if (n <= 5) return 'Medium (3-5)';
  return 'High (6+)';
}

// One shared, read-only context per run. Precomputes the joins the deal
// dataset needs so grouping/aggregation stay O(1) per row: company lookup,
// primary-contact title, and per-deal activity engagement counts (a real
// deal -> activities join off the live store).
function buildCtx() {
  const companyMap = new Map(getCompanies().map(c => [c.id, c]));
  const contactMap = new Map();
  try { for (const c of getContacts()) contactMap.set(c.id, c); } catch {}
  const emailByDeal = new Map();
  const meetingByDeal = new Map();
  const actByDeal = new Map();
  try {
    for (const a of getActivities()) {
      if (a.relatedType !== 'deal' || !a.relatedId) continue;
      actByDeal.set(a.relatedId, (actByDeal.get(a.relatedId) || 0) + 1);
      if (a.type === 'email') emailByDeal.set(a.relatedId, (emailByDeal.get(a.relatedId) || 0) + 1);
      if (a.type === 'meeting') meetingByDeal.set(a.relatedId, (meetingByDeal.get(a.relatedId) || 0) + 1);
    }
  } catch {}
  return { companyMap, contactMap, emailByDeal, meetingByDeal, actByDeal };
}

function companyOf(row, ctx) {
  if (row.companyId) return ctx.companyMap.get(row.companyId) || null;
  return null;
}
function primaryContactTitle(row, ctx) {
  const ids = row.contactIds || [];
  for (const id of ids) { const c = ctx.contactMap.get(id); if (c && c.title) return c.title; }
  return 'Unknown';
}

function valueBand(v) {
  const n = Number(v) || 0;
  if (n < 25000) return 'Under 25K';
  if (n < 50000) return '25K - 50K';
  if (n < 100000) return '50K - 100K';
  if (n < 250000) return '100K - 250K';
  return '250K+';
}

// Resolve a dimension label for one record.
function dimValue(row, source, dim, ctx) {
  switch (dim) {
    case 'stage': return stageById(row.stage)?.name || cap(row.stage) || 'Unknown';
    case 'owner': return userName(row.ownerId);
    case 'status': return cap(row.status || 'open');
    case 'industry':
      if (source === 'companies') return row.industry || 'Unknown';
      return companyOf(row, ctx)?.industry || 'Unknown';
    case 'companySize':
      return companyOf(row, ctx)?.size || 'Unknown';
    case 'size': return row.size || 'Unknown';
    case 'health':
      if (source === 'companies') return cap(row.health || 'green');
      return cap(companyOf(row, ctx)?.health || 'green');
    case 'lifecycleStage': return cap(row.lifecycleStage || 'lead');
    case 'title': return row.title || 'Unknown';
    case 'location': return row.location || 'Unknown';
    case 'type': return cap(row.type || 'other');
    case 'done': return row.done ? 'Completed' : 'Open';
    case 'relatedType': return cap(row.relatedType || 'none');
    case 'leadSource': return leadSourceFor(row);
    case 'contactTitle': return primaryContactTitle(row, ctx);
    case 'engagementBand': return engagementBand(ctx.emailByDeal.get(row.id) || 0);
    case 'valueBand': return valueBand(row.value);
    case 'closeMonth': return monthLabel(row.closeDate);
    case 'createdMonth': return monthLabel(row.createdAt);
    case 'month': return monthLabel(row.dueAt || row.createdAt);
    default: return 'All';
  }
}

// Sort key for a dimension bucket (only meaningful for temporal dims).
function dimSort(row, dim) {
  if (dim === 'closeMonth') return monthOrder(row.closeDate);
  if (dim === 'createdMonth') return monthOrder(row.createdAt);
  if (dim === 'month') return monthOrder(row.dueAt || row.createdAt);
  return null;
}

const DAY_MS = 86400000;

// Numeric value of a BASE (non-computed) measure field for one record.
// ctx supplies the precomputed deal -> activity joins so engagement measures
// resolve without re-scanning activities per row.
function baseMeasureValue(row, source, field, ctx) {
  switch (field) {
    case 'value': return Number(row.value) || 0;
    case 'weighted': return (Number(row.value) || 0) * ((row.probability ?? 0) / 100);
    case 'probability': return Number(row.probability) || 0;
    case 'emailTouches': return ctx?.emailByDeal?.get(row.id) || 0;
    case 'meetingTouches': return ctx?.meetingByDeal?.get(row.id) || 0;
    case 'activityCount': return ctx?.actByDeal?.get(row.id) || 0;
    case 'daysOpen': {
      if (!row.createdAt) return 0;
      const end = row.status && row.status !== 'open' && row.closeDate ? new Date(row.closeDate).getTime() : Date.now();
      return Math.max(0, Math.round((end - new Date(row.createdAt).getTime()) / DAY_MS));
    }
    default: return 0;
  }
}

// Numeric value of a measure field, resolving computed fields (cf_*) against
// the definition's formula recipes. `def` is optional (only needed for cf_*).
function measureValue(row, source, field, ctx, def) {
  if (typeof field === 'string' && field.startsWith('cf_') && def) {
    const cf = (def.computed || []).find(c => c.id === field);
    if (cf) return evalComputed(cf, row, source, ctx, def);
    return 0;
  }
  return baseMeasureValue(row, source, field, ctx);
}

// The raw value used by filters (string or number).
function filterValue(row, source, fieldId, ctx, def) {
  const f = fieldById(source, fieldId) || (def && (def.computed || []).find(c => c.id === fieldId) && { role: 'measure' });
  if (!f) return '';
  if (f.role === 'measure') return measureValue(row, source, fieldId, ctx, def);
  if (f.role === 'date') return new Date(row[fieldId] || 0).getTime();
  return dimValue(row, source, fieldId, ctx);
}

/* ============================================================
   COMPUTED FIELDS
   User-defined measures expressed as a formula over the source's base
   numeric fields (e.g. "value * probability / 100", "value / emailTouches").
   Evaluated per record, then aggregated like any other measure. The formula
   is parsed with a small, SAFE shunting-yard evaluator (identifiers, numbers,
   + - * / % and parentheses). NO eval / Function - nothing arbitrary runs.
   A computed field id is always prefixed 'cf_' so it never collides with a
   base field. Division by zero yields 0 so the report never shows NaN.
   ============================================================ */

// Base numeric field ids selectable inside a formula, per source.
export function formulaVars(source) {
  return measureFieldsFor(source).filter(f => !String(f.id).startsWith('cf_'));
}

const TOKEN_RE = /\s*([A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|[-+*/%()])/g;
function tokenize(expr) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  let last = 0;
  while ((m = TOKEN_RE.exec(expr)) !== null) {
    if (m.index !== last) return null; // an unrecognized character slipped in
    out.push(m[1]);
    last = TOKEN_RE.lastIndex;
  }
  if (last !== expr.length) return null;
  return out;
}
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
// Compile a formula string to RPN once (returns null if malformed).
function compileFormula(expr) {
  const toks = tokenize(String(expr || ''));
  if (!toks || !toks.length) return null;
  const output = [], ops = [];
  let expectValue = true;
  for (const t of toks) {
    if (/^[A-Za-z_]/.test(t) || /^\d/.test(t)) {
      output.push(t); expectValue = false;
    } else if (t === '(') { ops.push(t); expectValue = true; }
    else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
      if (!ops.length) return null;
      ops.pop(); expectValue = false;
    } else { // operator
      if (expectValue && t === '-') { output.push('0'); } // unary minus
      while (ops.length && ops[ops.length - 1] !== '(' && PREC[ops[ops.length - 1]] >= PREC[t]) output.push(ops.pop());
      ops.push(t); expectValue = true;
    }
  }
  while (ops.length) { const o = ops.pop(); if (o === '(') return null; output.push(o); }
  return output;
}
export function validateFormula(expr, source) {
  const rpn = compileFormula(expr);
  if (!rpn) return { ok: false, error: 'Check the syntax of the formula.' };
  const known = new Set(formulaVars(source).map(v => v.id));
  for (const t of rpn) {
    if (/^[A-Za-z_]/.test(t) && !known.has(t)) return { ok: false, error: `Unknown field "${t}".` };
  }
  return { ok: true };
}
function evalRpn(rpn, vars) {
  const st = [];
  for (const t of rpn) {
    if (t in PREC) {
      const b = st.pop(), a = st.pop();
      let v = 0;
      if (t === '+') v = a + b; else if (t === '-') v = a - b;
      else if (t === '*') v = a * b; else if (t === '/') v = b === 0 ? 0 : a / b;
      else if (t === '%') v = b === 0 ? 0 : a % b;
      st.push(v);
    } else if (/^\d/.test(t)) st.push(Number(t));
    else st.push(Number(vars[t]) || 0);
  }
  const r = st.pop();
  return Number.isFinite(r) ? r : 0;
}
function evalComputed(cf, row, source, ctx, def) {
  const rpn = cf._rpn || (cf._rpn = compileFormula(cf.formula));
  if (!rpn) return 0;
  const vars = {};
  for (const v of formulaVars(source)) vars[v.id] = baseMeasureValue(row, source, v.id, ctx);
  return evalRpn(rpn, vars);
}

/* ============================================================
   DATE RANGE
   ============================================================ */
export function resolveRange(preset, ref = new Date()) {
  const now = ref.getTime();
  const DAY = 86400000;
  const y = ref.getFullYear(), m = ref.getMonth();
  switch (preset) {
    case 'this_month': return { start: new Date(y, m, 1).getTime(), end: new Date(y, m + 1, 0, 23, 59, 59).getTime() };
    case 'last_30': return { start: now - 30 * DAY, end: now + 365 * DAY };
    case 'last_90': return { start: now - 90 * DAY, end: now + 365 * DAY };
    case 'this_quarter': {
      const q = Math.floor(m / 3);
      return { start: new Date(y, q * 3, 1).getTime(), end: new Date(y, q * 3 + 3, 0, 23, 59, 59).getTime() };
    }
    case 'this_year': return { start: new Date(y, 0, 1).getTime(), end: new Date(y, 11, 31, 23, 59, 59).getTime() };
    default: return null; // all time
  }
}

/* ============================================================
   DEFINITION HELPERS
   ============================================================ */
export function emptyDefinition(source = 'deals') {
  const measure = source === 'deals'
    ? { field: 'value', agg: 'sum' }
    : { field: null, agg: 'count' };
  return {
    id: null,
    title: 'Untitled report',
    desc: '',
    source,
    dimensions: [dimsFor(source)[0].id],
    measure,
    computed: [],
    filters: [],
    viz: 'bar',
    dateRange: { field: dateFieldsFor(source)[0]?.id || null, preset: 'all' },
  };
}

// All measure fields the builder can pick, base fields plus any computed
// fields carried on the definition (surfaced in the measure dropdown +
// aggregation flow so a computed field behaves like a first-class measure).
export function measuresWithComputed(def) {
  const base = measureFieldsFor(def.source);
  const computed = (def.computed || []).map(c => ({ id: c.id, label: c.label, role: 'measure', type: c.type || 'number', computed: true }));
  return [...base, ...computed];
}

// Keep a definition internally valid after a source change.
export function reconcileDefinition(def) {
  const source = def.source || 'deals';
  const dims = dimsFor(source).map(d => d.id);
  // computed fields are validated against the source; malformed ones drop out
  const computed = (def.computed || [])
    .filter(c => c && c.id && String(c.id).startsWith('cf_') && compileFormula(c.formula))
    .map(({ _rpn, ...c }) => c);
  const measures = [...measureFieldsFor(source).map(m => m.id), ...computed.map(c => c.id)];
  const dates = dateFieldsFor(source).map(d => d.id);
  const nextDims = (def.dimensions || []).filter(d => dims.includes(d));
  if (!nextDims.length) nextDims.push(dims[0]);
  let measure = def.measure || { field: null, agg: 'count' };
  if (measure.agg !== 'count' && !measures.includes(measure.field)) {
    measure = measures.length ? { field: measures[0], agg: measure.agg } : { field: null, agg: 'count' };
  }
  if (measure.agg !== 'count' && !measure.field) measure = { field: null, agg: 'count' };
  const dateField = dates.includes(def.dateRange?.field) ? def.dateRange.field : (dates[0] || null);
  return {
    ...def,
    source,
    dimensions: nextDims.slice(0, 2),
    measure,
    computed,
    viz: def.viz || 'bar',
    dateRange: { field: dateField, preset: def.dateRange?.preset || 'all' },
    filters: (def.filters || []).filter(f => fieldById(source, f.field) || (f.field && String(f.field).startsWith('cf_') && computed.some(c => c.id === f.field))),
  };
}

/* ============================================================
   THE ENGINE
   Returns:
   {
     rows:    [{ label, value, sortKey, count, ...seriesKeys }],
     series:  [seriesKey, ...]  (empty -> single 'value' key),
     total, valueFormat, measureLabel, dimLabel,
     recordCount, kpi
   }
   ============================================================ */
function recordsFor(source) {
  if (source === 'contacts') return getContacts();
  if (source === 'companies') return getCompanies();
  if (source === 'activities') return getActivities();
  return getDeals();
}

function aggregate(values, agg) {
  if (!values.length) return 0;
  if (agg === 'sum') return values.reduce((s, v) => s + v, 0);
  if (agg === 'avg') return values.reduce((s, v) => s + v, 0) / values.length;
  if (agg === 'min') return Math.min(...values);
  if (agg === 'max') return Math.max(...values);
  return values.length; // count
}

function passFilters(row, source, filters, ctx, def) {
  if (!filters || !filters.length) return true;
  for (const f of filters) {
    if (!f.field || f.value == null || f.value === '') continue;
    const actual = filterValue(row, source, f.field, ctx, def);
    const wanted = f.value;
    const isNum = typeof actual === 'number';
    if (f.op === 'is') { if (String(actual).toLowerCase() !== String(wanted).toLowerCase()) return false; }
    else if (f.op === 'isNot') { if (String(actual).toLowerCase() === String(wanted).toLowerCase()) return false; }
    else if (f.op === 'contains') { if (!String(actual).toLowerCase().includes(String(wanted).toLowerCase())) return false; }
    else if (f.op === 'gt') { if (!(Number(actual) > Number(wanted))) return false; }
    else if (f.op === 'lt') { if (!(Number(actual) < Number(wanted))) return false; }
  }
  return true;
}

function passDate(row, dateField, range) {
  if (!range || !dateField) return true;
  const t = new Date(row[dateField] || 0).getTime();
  if (!t) return true;
  return t >= range.start && t <= range.end;
}

export function runReport(def) {
  const d = reconcileDefinition(def);
  const source = d.source;
  const ctx = buildCtx();
  const primary = d.dimensions[0];
  const secondary = d.dimensions[1] || null;
  const measure = d.measure || { field: null, agg: 'count' };
  const range = resolveRange(d.dateRange?.preset);
  const dateField = d.dateRange?.field;

  const records = recordsFor(source).filter(r =>
    passDate(r, dateField, range) && passFilters(r, source, d.filters, ctx, d));

  const measureField = measuresWithComputed(d).find(m => m.id === measure.field);
  const valueFormat = measure.agg === 'count' ? 'number'
    : (measureField?.type || 'number');
  const measureLabel = measure.agg === 'count'
    ? 'Count'
    : `${AGGREGATIONS.find(a => a.id === measure.agg)?.label || 'Sum'} of ${measureField?.label || 'value'}`;
  const dimLabel = (dimsFor(source).find(x => x.id === primary) || {}).label || 'Group';

  // series keys (secondary dim distinct labels)
  const seriesSet = new Set();
  // bucket: primaryLabel -> { sortKey, total: [], perSeries: Map<seriesKey, number[]> }
  const buckets = new Map();
  for (const r of records) {
    const pk = dimValue(r, source, primary, ctx);
    if (!buckets.has(pk)) buckets.set(pk, { sortKey: dimSort(r, primary), values: [], series: new Map() });
    const b = buckets.get(pk);
    const mv = measure.agg === 'count' ? 1 : measureValue(r, source, measure.field, ctx, d);
    b.values.push(mv);
    if (secondary) {
      const sk = dimValue(r, source, secondary, ctx);
      seriesSet.add(sk);
      if (!b.series.has(sk)) b.series.set(sk, []);
      b.series.get(sk).push(mv);
    }
  }

  const series = secondary ? [...seriesSet] : [];
  const rows = [];
  for (const [label, b] of buckets) {
    const row = { label, count: b.values.length, sortKey: b.sortKey };
    row.value = aggregate(b.values, measure.agg);
    for (const sk of series) {
      const vals = b.series.get(sk) || [];
      row[sk] = vals.length ? aggregate(vals, measure.agg) : 0;
    }
    rows.push(row);
  }

  // sort: temporal dims chronologically, stage in pipeline order, else value desc
  if (primary === 'stage') {
    const order = new Map(STAGES.map((s, i) => [s.name, i]));
    rows.sort((a, b) => (order.get(a.label) ?? 99) - (order.get(b.label) ?? 99));
  } else if (rows.some(r => r.sortKey != null)) {
    rows.sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
  } else {
    rows.sort((a, b) => b.value - a.value);
  }

  const total = valueFormat === 'percent'
    ? (rows.length ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0)
    : rows.reduce((s, r) => s + r.value, 0);

  const secondaryLabel = secondary ? ((dimsFor(source).find(x => x.id === secondary) || {}).label || 'Column') : null;
  return {
    rows, series, total, valueFormat, measureLabel, dimLabel,
    agg: measure.agg, secondaryLabel,
    recordCount: records.length,
    kpi: valueFormat === 'percent' ? total : rows.reduce((s, r) => s + r.value, 0),
  };
}

/* ---------- value formatting (shared with the page) ---------- */
export function formatValue(v, fmt) {
  if (v == null || isNaN(v)) return '-';
  if (fmt === 'money') {
    const n = Math.round(v);
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }
  if (fmt === 'percent') return Math.round(v) + '%';
  return Math.round(v).toLocaleString();
}

/* ---------- CSV export ---------- */
export function reportToCsv(def, computed) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = computed.series.length
    ? [computed.dimLabel, ...computed.series]
    : [computed.dimLabel, computed.measureLabel];
  const lines = [head.map(esc).join(',')];
  for (const r of computed.rows) {
    if (computed.series.length) lines.push([esc(r.label), ...computed.series.map(s => esc(r[s] ?? 0))].join(','));
    else lines.push([esc(r.label), esc(r.value)].join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   COHORT ANALYSIS
   Group records into monthly cohorts by their creation month, then
   for each month-offset measure how the cohort progresses. For deals
   the default metric is conversion (share of the cohort won by month
   N). For contacts / companies it is retention (share with activity
   in that later month, approximated by lastActivity recency). Pure.
   Returns { cohorts, maxOffset, metric, format, avgByOffset }.
   ============================================================ */
export const COHORT_METRICS = [
  { id: 'conversion', label: 'Deal conversion', sources: ['deals'], format: 'percent' },
  { id: 'value', label: 'Cumulative won value', sources: ['deals'], format: 'money' },
  { id: 'count', label: 'Records created', sources: ['deals', 'contacts', 'companies', 'activities'], format: 'number' },
];

export function cohortMetricsFor(source) {
  return COHORT_METRICS.filter(m => m.sources.includes(source));
}

function cohortKey(iso) {
  const d = new Date(iso || 0);
  return { key: d.getFullYear() * 12 + d.getMonth(), label: monthLabel(iso), y: d.getFullYear(), m: d.getMonth() };
}

export function cohortAnalysis({ source = 'deals', metric = 'conversion', maxOffset = 6 } = {}) {
  const records = recordsFor(source);
  const cohorts = new Map(); // cohortKey -> { label, key, members: [] }
  for (const r of records) {
    const ck = cohortKey(r.createdAt);
    if (!cohorts.has(ck.key)) cohorts.set(ck.key, { key: ck.key, label: ck.label, members: [] });
    cohorts.get(ck.key).members.push(r);
  }
  const sorted = [...cohorts.values()].sort((a, b) => a.key - b.key).slice(-8);
  const fmt = (COHORT_METRICS.find(m => m.id === metric) || {}).format || 'number';

  const out = sorted.map(c => {
    const size = c.members.length;
    const cells = [];
    for (let off = 0; off <= maxOffset; off++) {
      let value = 0, raw = 0;
      if (metric === 'conversion') {
        const cutoffKey = c.key + off;
        const won = c.members.filter(d => {
          if (d.status !== 'won') return false;
          const wk = cohortKey(d.closeDate).key;
          return wk <= cutoffKey;
        }).length;
        raw = won;
        value = size ? Math.round((won / size) * 100) : 0;
      } else if (metric === 'value') {
        const cutoffKey = c.key + off;
        raw = c.members.filter(d => d.status === 'won' && cohortKey(d.closeDate).key <= cutoffKey)
          .reduce((s, d) => s + (Number(d.value) || 0), 0);
        value = raw;
      } else { // count: creations in that offset month only (diagonal-friendly)
        const targetKey = c.key + off;
        raw = c.members.filter(d => cohortKey(d.createdAt).key === targetKey).length;
        value = off === 0 ? size : raw;
      }
      cells.push({ offset: off, value, raw });
    }
    return { key: c.key, label: c.label, size, cells };
  });

  // average per offset (across cohorts that have data at that offset)
  const avgByOffset = [];
  for (let off = 0; off <= maxOffset; off++) {
    const vals = out.map(c => c.cells[off]?.value).filter(v => v != null);
    avgByOffset.push(vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0);
  }

  return { cohorts: out, maxOffset, metric, format: fmt, avgByOffset };
}

/* ============================================================
   SAVED REPORT LIBRARY  (localStorage + pub/sub)
   ============================================================ */
const defSubs = new Set();
export function subscribeReports(fn) { defSubs.add(fn); return () => defSubs.delete(fn); }
function emitReports() { const list = loadReports(); defSubs.forEach(fn => fn(list)); }

export function loadReports() {
  try { const raw = localStorage.getItem(DEFS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function persistReports(list) {
  try { localStorage.setItem(DEFS_KEY, JSON.stringify(list)); } catch {}
  emitReports();
}

export function saveReport(def) {
  const list = loadReports();
  const id = def.id || `rb_${Date.now().toString(36)}`;
  const clean = {
    ...reconcileDefinition(def),
    id,
    title: (def.title || 'Untitled report').trim(),
    desc: (def.desc || '').trim(),
    savedAt: new Date().toISOString(),
  };
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) list[idx] = clean; else list.unshift(clean);
  persistReports(list);
  return clean;
}

export function deleteReport(id) {
  persistReports(loadReports().filter(r => r.id !== id));
  // cascade: drop schedules pointing at the deleted report
  const sched = loadSchedules().filter(s => s.reportId !== id);
  persistSchedules(sched);
}

export function duplicateReport(def) {
  return saveReport({ ...def, id: null, title: `${def.title} (copy)` });
}

export function getReport(id) { return loadReports().find(r => r.id === id) || null; }

/* ---------- starter reports (shown when the library is empty) ---------- */
export const STARTER_REPORTS = [
  {
    id: 'rb_starter_stage_owner', title: 'Pipeline by stage and owner', starter: true,
    desc: 'Open + closed value across stages, split by the rep who owns it.',
    source: 'deals', dimensions: ['stage', 'owner'], measure: { field: 'value', agg: 'sum' },
    filters: [], viz: 'bar', dateRange: { field: 'closeDate', preset: 'all' },
  },
  {
    id: 'rb_starter_size_band', title: 'Deal size distribution', starter: true,
    desc: 'How many deals sit in each value band.',
    source: 'deals', dimensions: ['valueBand'], measure: { field: null, agg: 'count' },
    filters: [], viz: 'bar', dateRange: { field: 'createdAt', preset: 'all' },
  },
  {
    id: 'rb_starter_won_month', title: 'Won value by close month', starter: true,
    desc: 'Revenue landing month over month.',
    source: 'deals', dimensions: ['closeMonth'], measure: { field: 'value', agg: 'sum' },
    filters: [{ field: 'status', op: 'is', value: 'Won' }], viz: 'area',
    dateRange: { field: 'closeDate', preset: 'all' },
  },
  {
    id: 'rb_starter_avg_deal_industry', title: 'Average deal size by industry', starter: true,
    desc: 'Mean deal value across verticals.',
    source: 'deals', dimensions: ['industry'], measure: { field: 'value', agg: 'avg' },
    filters: [], viz: 'bar', dateRange: { field: 'createdAt', preset: 'all' },
  },
];

// Library = saved reports first, starters filling in when the shelf is empty.
export function allReports() {
  const saved = loadReports();
  const savedIds = new Set(saved.map(r => r.id));
  const starters = STARTER_REPORTS.filter(s => !savedIds.has(s.id));
  return [...saved, ...starters];
}

/* ============================================================
   SCHEDULED DELIVERY CONFIG  (localStorage + pub/sub)
   A schedule renders a saved report on a cadence and emails it to a
   list of recipients. Runs are executed server-side by
   api/report-deliver.js (cron); the client owns the config + a
   "send test now" trigger. NO em-dash / en-dash.
   ============================================================ */
export const CADENCES = [
  { id: 'daily', label: 'Every weekday', desc: 'Monday to Friday' },
  { id: 'weekly', label: 'Weekly', desc: 'Every Monday morning' },
  { id: 'monthly', label: 'Monthly', desc: 'First of the month' },
];

const schedSubs = new Set();
export function subscribeSchedules(fn) { schedSubs.add(fn); return () => schedSubs.delete(fn); }
export function loadSchedules() {
  try { const raw = localStorage.getItem(SCHED_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function persistSchedules(list) {
  try { localStorage.setItem(SCHED_KEY, JSON.stringify(list)); } catch {}
  const snap = loadSchedules();
  schedSubs.forEach(fn => fn(snap));
}

// Compute the next run timestamp (ms) for a cadence from a reference date.
export function nextRun(cadence, hour = 8, ref = new Date()) {
  const d = new Date(ref);
  d.setSeconds(0, 0); d.setMinutes(0); d.setHours(hour);
  if (cadence === 'daily') {
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  } else if (cadence === 'weekly') {
    do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 1);
  } else { // monthly -> first of next month
    d.setMonth(d.getMonth() + 1, 1);
  }
  return d.getTime();
}

export function saveSchedule(s) {
  const list = loadSchedules();
  const id = s.id || `sch_${Date.now().toString(36)}`;
  const clean = {
    id,
    reportId: s.reportId,
    reportTitle: s.reportTitle || '',
    cadence: s.cadence || 'weekly',
    hour: s.hour ?? 8,
    recipients: (s.recipients || []).map(e => String(e).trim().toLowerCase()).filter(Boolean),
    format: s.format || 'summary',
    enabled: s.enabled !== false,
    createdAt: s.createdAt || new Date().toISOString(),
    lastRunAt: s.lastRunAt || null,
    nextRunAt: s.nextRunAt || nextRun(s.cadence || 'weekly', s.hour ?? 8),
  };
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = clean; else list.unshift(clean);
  persistSchedules(list);
  return clean;
}

export function deleteSchedule(id) {
  persistSchedules(loadSchedules().filter(s => s.id !== id));
}

export function toggleSchedule(id) {
  const list = loadSchedules();
  const s = list.find(x => x.id === id);
  if (s) { s.enabled = !s.enabled; persistSchedules(list); }
  return s;
}

// Render a schedule + its report into the compact payload the delivery
// endpoint emails. Pure over the store, so a cron can call this shape.
export function renderScheduleForDelivery(schedule) {
  const def = getReport(schedule.reportId) || STARTER_REPORTS.find(r => r.id === schedule.reportId);
  if (!def) return null;
  const computed = runReport(def);
  return {
    scheduleId: schedule.id,
    title: def.title,
    recipients: schedule.recipients,
    format: schedule.format,
    generatedAt: new Date().toISOString(),
    dimLabel: computed.dimLabel,
    measureLabel: computed.measureLabel,
    valueFormat: computed.valueFormat,
    total: computed.total,
    rows: computed.rows.slice(0, 25).map(r => ({ label: r.label, value: Math.round(r.value) })),
    csv: reportToCsv(def, computed),
  };
}

// Collect every schedule that is due at/after `now` (client-side helper
// for the "run due now" test button). SUPABASE: cron would query
// rally_report_schedules where next_run_at <= now().
export function dueSchedules(now = Date.now()) {
  return loadSchedules().filter(s => s.enabled && (s.nextRunAt || 0) <= now);
}

/* ============================================================
   DASHBOARDS  (localStorage + pub/sub)
   A dashboard is an ordered set of TILES. Each tile references a saved
   report by id and carries a width hint (half | full) so a dashboard can
   compose many reports into one at-a-glance canvas (the Zoho / Looker
   "dashboard of report tiles" model). Pure config; every tile re-runs its
   report live off the store on render, so numbers never go stale.
   SUPABASE: from('rally_dashboards'). ASCII only. NO em-dash / en-dash.
   ============================================================ */
const DASH_KEY = 'rally_report_dashboards_v1';
export const DEFAULT_DASHBOARD_ID = 'dash_default';

const dashSubs = new Set();
export function subscribeDashboards(fn) { dashSubs.add(fn); return () => dashSubs.delete(fn); }
export function loadDashboards() {
  try { const raw = localStorage.getItem(DASH_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function persistDashboards(list) {
  try { localStorage.setItem(DASH_KEY, JSON.stringify(list)); } catch {}
  const snap = loadDashboards();
  dashSubs.forEach(fn => fn(snap));
}

// Every workspace has at least one dashboard. If none is stored yet, seed a
// starter that composes the four starter reports so the canvas is never empty.
export function allDashboards() {
  const list = loadDashboards();
  if (list.length) return list;
  return [{
    id: DEFAULT_DASHBOARD_ID,
    title: 'Revenue overview',
    desc: 'A starter dashboard composed from the built-in report starters.',
    tiles: STARTER_REPORTS.map((r, i) => ({ id: `tile_${i}`, reportId: r.id, size: i === 0 ? 'full' : 'half' })),
    starter: true,
    createdAt: new Date().toISOString(),
  }];
}
export function getDashboard(id) { return allDashboards().find(d => d.id === id) || null; }

export function saveDashboard(dash) {
  const list = loadDashboards();
  const id = dash.id || `dash_${Date.now().toString(36)}`;
  const clean = {
    id,
    title: (dash.title || 'Untitled dashboard').trim(),
    desc: (dash.desc || '').trim(),
    tiles: (dash.tiles || []).map((t, i) => ({ id: t.id || `tile_${i}_${Date.now().toString(36)}`, reportId: t.reportId, size: t.size === 'full' ? 'full' : 'half' })),
    createdAt: dash.createdAt || new Date().toISOString(),
    savedAt: new Date().toISOString(),
  };
  const idx = list.findIndex(d => d.id === id);
  if (idx >= 0) list[idx] = clean; else list.unshift(clean);
  persistDashboards(list);
  return clean;
}
export function deleteDashboard(id) { persistDashboards(loadDashboards().filter(d => d.id !== id)); }

// Materialize a stored dashboard for the first time (turns the seeded starter
// into a real, editable row). Idempotent: returns the existing row if present.
function ensureDashboard(id) {
  const stored = loadDashboards();
  const found = stored.find(d => d.id === id);
  if (found) return found;
  const seed = allDashboards().find(d => d.id === id);
  if (seed) { const saved = saveDashboard(seed); return saved; }
  return saveDashboard({ id, title: 'My dashboard', tiles: [] });
}

// Add a report as a new tile on a dashboard (creating the dashboard if the
// only one is the seeded starter). Returns the updated dashboard.
export function addReportToDashboard(dashboardId, reportId, size = 'half') {
  const dash = ensureDashboard(dashboardId || DEFAULT_DASHBOARD_ID);
  const tiles = [...(dash.tiles || [])];
  if (!tiles.some(t => t.reportId === reportId)) {
    tiles.push({ id: `tile_${Date.now().toString(36)}`, reportId, size });
  }
  return saveDashboard({ ...dash, tiles });
}
export function removeTile(dashboardId, tileId) {
  const dash = ensureDashboard(dashboardId);
  return saveDashboard({ ...dash, tiles: (dash.tiles || []).filter(t => t.id !== tileId) });
}
export function setTileSize(dashboardId, tileId, size) {
  const dash = ensureDashboard(dashboardId);
  return saveDashboard({ ...dash, tiles: (dash.tiles || []).map(t => t.id === tileId ? { ...t, size } : t) });
}

/* ============================================================
   SHARE LINK  (read-only, in-app)
   A saved report is shareable via /reports?share=<id>. Reports.jsx reads
   the param and renders a chrome-light, read-only view. No new route is
   introduced (the shell owns routing); the link works for anyone who can
   reach the app + has the report in their library.
   ============================================================ */
export function shareUrlForReport(id) {
  if (typeof window === 'undefined') return `/reports?share=${id}`;
  return `${window.location.origin}/reports?share=${encodeURIComponent(id)}`;
}

/* ============================================================
   PDF / PRINT EXPORT  (client-side, zero dependencies)
   Renders the report to a clean, print-optimized HTML document in a new
   window and calls print(), which the browser turns into a PDF via
   "Save as PDF". No jsPDF, no server round-trip, no new npm dependency.
   ASCII only. NO em-dash / en-dash.
   ============================================================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function reportToHtml(def, computed) {
  const rows = computed.rows || [];
  const series = computed.series || [];
  const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
  let body;
  if (series.length) {
    const head = `<tr><th>${esc(computed.dimLabel)}</th>${series.map(s => `<th class="num">${esc(s)}</th>`).join('')}<th class="num">Total</th></tr>`;
    const trs = rows.map(r => {
      const rowTotal = series.reduce((s, k) => s + (Number(r[k]) || 0), 0);
      return `<tr><td>${esc(r.label)}</td>${series.map(k => `<td class="num">${esc(formatValue(r[k], computed.valueFormat))}</td>`).join('')}<td class="num tot">${esc(formatValue(rowTotal, computed.valueFormat))}</td></tr>`;
    }).join('');
    body = `<table><thead>${head}</thead><tbody>${trs}</tbody></table>`;
  } else {
    const trs = rows.map(r => {
      const pct = Math.round(((Number(r.value) || 0) / max) * 100);
      return `<tr><td>${esc(r.label)}</td><td class="bar"><div class="track"><div class="fill" style="width:${pct}%"></div></div></td><td class="num">${esc(formatValue(r.value, computed.valueFormat))}</td></tr>`;
    }).join('');
    body = `<table><thead><tr><th>${esc(computed.dimLabel)}</th><th></th><th class="num">${esc(computed.measureLabel)}</th></tr></thead><tbody>${trs}</tbody>
      <tfoot><tr><td class="tot">Total</td><td></td><td class="num tot">${esc(formatValue(computed.total, computed.valueFormat))}</td></tr></tfoot></table>`;
  }
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(def.title || 'Report')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #12141f; margin: 40px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #5b4bf5; font-weight: 700; }
  h1 { font-size: 26px; margin: 6px 0 2px; }
  .sub { color: #5b6474; font-size: 14px; margin: 0 0 4px; }
  .meta { color: #8b93a4; font-size: 12px; margin: 0 0 22px; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e7e9ee; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.tot, .tot { font-weight: 800; }
  .bar { width: 34%; }
  .track { background: #eef0f4; border-radius: 999px; height: 9px; overflow: hidden; }
  .fill { height: 9px; background: #5b4bf5; border-radius: 999px; }
  .foot { margin-top: 26px; color: #8b93a4; font-size: 11px; border-top: 1px solid #e7e9ee; padding-top: 10px; }
  @media print { body { margin: 18mm; } .noprint { display: none; } }
</style></head>
<body>
  <div class="eyebrow">Ardovo report</div>
  <h1>${esc(def.title || 'Report')}</h1>
  <p class="sub">${esc(def.desc || `${computed.measureLabel} by ${String(computed.dimLabel).toLowerCase()}`)}</p>
  <p class="meta">${esc(computed.measureLabel)} by ${esc(String(computed.dimLabel).toLowerCase())}${series.length ? ` split by ${esc(String(computed.secondaryLabel || '').toLowerCase())}` : ''} . ${rows.length} rows . ${computed.recordCount} records . Generated ${esc(generated)}</p>
  ${body}
  <div class="foot">Generated by Ardovo Reports. This is a point-in-time snapshot of live pipeline data.</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`;
}
// Open the print-ready report in a new window (user picks "Save as PDF").
export function printReport(def, computed) {
  const html = reportToHtml(def, computed);
  const w = window.open('', '_blank');
  if (!w) return false; // popup blocked
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
