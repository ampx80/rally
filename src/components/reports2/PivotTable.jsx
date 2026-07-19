// PivotTable - a true cross-tab. Rows are the primary dimension, columns are
// the second dimension's distinct values, and each cell is the aggregated
// measure at that row x column intersection. Adds row totals, column totals
// and a grand total (only when the aggregation makes a sum meaningful, i.e.
// count / sum; averages and min/max would be misleading to sum, so totals are
// suppressed there). Reads the SAME computed object runReport already returns
// (rows carry per-series keys), so no new engine code is needed. A heat shade
// on each cell makes the matrix scannable. ASCII only. NO em-dash / en-dash.
import React from 'react';
import { formatValue } from '../../lib/report-builder';

const ACCENT = '91, 75, 245';

function heat(intensity) {
  const a = 0.06 + Math.min(1, Math.max(0, intensity)) * 0.64;
  return { background: `rgba(${ACCENT}, ${a.toFixed(3)})`, color: a > 0.46 ? '#fff' : 'var(--ink)' };
}

export default function PivotTable({ computed }) {
  const { rows, series, valueFormat, measureLabel, dimLabel, secondaryLabel, agg } = computed;

  if (!rows.length) {
    return <div className="rb-muted" style={{ padding: '2.5rem 0', textAlign: 'center' }}>No data matches this definition yet. Adjust the fields, filters, or date range.</div>;
  }

  const showTotals = agg === 'sum' || agg === 'count' || agg == null;

  /* ---- single-dimension pivot degrades to dim x measure with a total ---- */
  if (!series.length) {
    const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
    const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    return (
      <div className="rb-pivot-wrap">
        <table className="rb-pivot">
          <thead>
            <tr>
              <th className="rb-pivot-rowhead">{dimLabel}</th>
              <th className="rb-pivot-num">{measureLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}>
                <td className="rb-pivot-rowhead">{r.label}</td>
                <td className="rb-pivot-cell rb-pivot-num" style={heat((Number(r.value) || 0) / max)}>{formatValue(r.value, valueFormat)}</td>
              </tr>
            ))}
          </tbody>
          {showTotals && (
            <tfoot>
              <tr>
                <td className="rb-pivot-rowhead rb-pivot-tot">Total</td>
                <td className="rb-pivot-num rb-pivot-tot">{formatValue(total, valueFormat)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  }

  /* ---- full cross-tab: rows x columns ---- */
  const colTotals = series.map(s => rows.reduce((sum, r) => sum + (Number(r[s]) || 0), 0));
  const grand = colTotals.reduce((s, v) => s + v, 0);
  // heat scale off the max cell across the whole matrix
  const cellMax = Math.max(1, ...rows.flatMap(r => series.map(s => Number(r[s]) || 0)));

  return (
    <div className="rb-pivot-wrap">
      <table className="rb-pivot">
        <thead>
          <tr>
            <th className="rb-pivot-rowhead" title={`${dimLabel} down, ${secondaryLabel} across`}>
              {dimLabel} \\ {secondaryLabel}
            </th>
            {series.map(s => <th key={s} className="rb-pivot-num">{s}</th>)}
            {showTotals && <th className="rb-pivot-num rb-pivot-tot">Total</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const rowTotal = series.reduce((sum, s) => sum + (Number(r[s]) || 0), 0);
            return (
              <tr key={r.label}>
                <td className="rb-pivot-rowhead">{r.label}</td>
                {series.map(s => {
                  const v = Number(r[s]) || 0;
                  return (
                    <td key={s} className="rb-pivot-cell rb-pivot-num" style={v ? heat(v / cellMax) : undefined}>
                      {v ? formatValue(v, valueFormat) : <span className="rb-pivot-zero">-</span>}
                    </td>
                  );
                })}
                {showTotals && <td className="rb-pivot-num rb-pivot-tot">{formatValue(rowTotal, valueFormat)}</td>}
              </tr>
            );
          })}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr>
              <td className="rb-pivot-rowhead rb-pivot-tot">Total</td>
              {colTotals.map((v, i) => <td key={series[i]} className="rb-pivot-num rb-pivot-tot">{formatValue(v, valueFormat)}</td>)}
              <td className="rb-pivot-num rb-pivot-tot rb-pivot-grand">{formatValue(grand, valueFormat)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
