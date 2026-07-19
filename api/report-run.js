// api/report-run.js
//
// Server-side dataset / query layer for the Ardovo Report Builder. This is the
// Supabase-swappable seam behind the client engine in src/lib/report-builder.js:
// it takes a flat dataset (an array of records) plus a query (group-by, optional
// split-by, measure + aggregation, filters, and an optional computed formula)
// and returns the SAME `computed` shape the client renders (rows + series +
// totals). Because it aggregates any array of plain objects, it is decoupled
// from the CRM record shapes and can later be pointed at real rows read from
// Postgres (SUPABASE: select the source view, then run this reducer, or push the
// group-by down into SQL). Pure + deterministic. No secrets. Never throws on
// bad input - it validates and returns a 400 with a clear reason instead.
//
// POST body:
//   {
//     rows:    [ { ...flat record... }, ... ]   (required)
//     group:   "fieldName"                       (required)
//     split:   "fieldName" | null                (optional second dimension)
//     measure: "numericFieldName" | null         (optional; omit for count)
//     agg:     "count"|"sum"|"avg"|"min"|"max"    (default count)
//     computed:{ formula: "a * b / 100" } | null  (optional derived measure,
//                evaluated per row over numeric fields; used when measure ===
//                "__computed__")
//     valueFormat: "money"|"number"|"percent"     (default number, passthrough)
//     limit:   number                             (optional cap on group count)
//   }
//
// GET: a small self-describing health/usage payload.
//
// ASCII only. NO em-dash / en-dash.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const AGGS = new Set(['count', 'sum', 'avg', 'min', 'max']);

/* ---- safe formula evaluator (shunting-yard, no eval / Function) ---- */
const TOKEN_RE = /\s*([A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|[-+*/%()])/g;
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
function compileFormula(expr) {
  const src = String(expr || '');
  const toks = [];
  let m, last = 0;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    if (m.index !== last) return null;
    toks.push(m[1]);
    last = TOKEN_RE.lastIndex;
  }
  if (last !== src.length || !toks.length) return null;
  const output = [], ops = [];
  let expectValue = true;
  for (const t of toks) {
    if (/^[A-Za-z_]/.test(t) || /^\d/.test(t)) { output.push(t); expectValue = false; }
    else if (t === '(') { ops.push(t); expectValue = true; }
    else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
      if (!ops.length) return null;
      ops.pop(); expectValue = false;
    } else {
      if (expectValue && t === '-') output.push('0');
      while (ops.length && ops[ops.length - 1] !== '(' && PREC[ops[ops.length - 1]] >= PREC[t]) output.push(ops.pop());
      ops.push(t); expectValue = true;
    }
  }
  while (ops.length) { const o = ops.pop(); if (o === '(') return null; output.push(o); }
  return output;
}
function evalRpn(rpn, record) {
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
    else st.push(Number(record[t]) || 0);
  }
  const r = st.pop();
  return Number.isFinite(r) ? r : 0;
}

function aggregate(values, agg) {
  if (!values.length) return 0;
  if (agg === 'sum') return values.reduce((s, v) => s + v, 0);
  if (agg === 'avg') return values.reduce((s, v) => s + v, 0) / values.length;
  if (agg === 'min') return Math.min(...values);
  if (agg === 'max') return Math.max(...values);
  return values.length;
}

function passFilters(row, filters) {
  if (!Array.isArray(filters) || !filters.length) return true;
  for (const f of filters) {
    if (!f || !f.field || f.value == null || f.value === '') continue;
    const actual = row[f.field];
    const wanted = f.value;
    const op = f.op || 'is';
    if (op === 'is') { if (String(actual).toLowerCase() !== String(wanted).toLowerCase()) return false; }
    else if (op === 'isNot') { if (String(actual).toLowerCase() === String(wanted).toLowerCase()) return false; }
    else if (op === 'contains') { if (!String(actual).toLowerCase().includes(String(wanted).toLowerCase())) return false; }
    else if (op === 'gt') { if (!(Number(actual) > Number(wanted))) return false; }
    else if (op === 'lt') { if (!(Number(actual) < Number(wanted))) return false; }
  }
  return true;
}

function runQuery(body) {
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) return { error: 'Provide "rows" as an array of records.' };
  const group = body.group;
  if (!group || typeof group !== 'string') return { error: 'Provide "group" (the field to group by).' };
  const split = typeof body.split === 'string' && body.split ? body.split : null;
  const agg = AGGS.has(body.agg) ? body.agg : 'count';
  const measure = agg === 'count' ? null : (typeof body.measure === 'string' ? body.measure : null);
  const valueFormat = ['money', 'number', 'percent'].includes(body.valueFormat) ? body.valueFormat : 'number';
  const rpn = (measure === '__computed__' && body.computed?.formula) ? compileFormula(body.computed.formula) : null;
  if (measure === '__computed__' && !rpn) return { error: 'The computed formula is malformed.' };

  const measureOf = (r) => {
    if (agg === 'count') return 1;
    if (measure === '__computed__') return evalRpn(rpn, r);
    return Number(r[measure]) || 0;
  };
  const dimVal = (r, field) => { const v = r[field]; return v == null || v === '' ? 'Unknown' : String(v); };

  const filtered = rows.filter(r => passFilters(r, body.filters));
  const seriesSet = new Set();
  const buckets = new Map();
  for (const r of filtered) {
    const pk = dimVal(r, group);
    if (!buckets.has(pk)) buckets.set(pk, { values: [], series: new Map() });
    const b = buckets.get(pk);
    const mv = measureOf(r);
    b.values.push(mv);
    if (split) {
      const sk = dimVal(r, split);
      seriesSet.add(sk);
      if (!b.series.has(sk)) b.series.set(sk, []);
      b.series.get(sk).push(mv);
    }
  }

  const series = split ? [...seriesSet].sort((a, b) => a.localeCompare(b)) : [];
  let out = [];
  for (const [label, b] of buckets) {
    const row = { label, count: b.values.length, value: aggregate(b.values, agg) };
    for (const sk of series) { const vals = b.series.get(sk) || []; row[sk] = vals.length ? aggregate(vals, agg) : 0; }
    out.push(row);
  }
  out.sort((a, b) => b.value - a.value);
  if (Number.isFinite(body.limit) && body.limit > 0) out = out.slice(0, body.limit);

  const total = valueFormat === 'percent'
    ? (out.length ? out.reduce((s, r) => s + r.value, 0) / out.length : 0)
    : out.reduce((s, r) => s + r.value, 0);

  return {
    ok: true,
    rows: out,
    series,
    valueFormat,
    agg,
    recordCount: filtered.length,
    groupCount: out.length,
    total,
  };
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'report-run',
      usage: 'POST { rows, group, split?, measure?, agg, filters?, computed?, valueFormat?, limit? }',
      aggregations: [...AGGS],
    });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const body = readJsonBody(req);
  const result = runQuery(body);
  if (result.error) return res.status(400).json({ ok: false, error: result.error });
  return res.status(200).json(result);
});
