// CohortGrid - a heatmap table for cohort analysis. Rows are monthly
// cohorts (by creation month), columns are months-since, cell color scales
// with the metric (conversion %, cumulative won value, or creations). Reads
// a computed object from cohortAnalysis(). ASCII only. NO em-dash / en-dash.
import React from 'react';
import { formatValue } from '../../lib/report-builder';
import './reports2.css';

// Interpolate a cell background from a 0..1 intensity, on the accent hue.
function cellStyle(intensity, empty) {
  if (empty) return { background: 'var(--n-100)' };
  const a = 0.14 + Math.min(1, Math.max(0, intensity)) * 0.86;
  return { background: `rgba(91, 75, 245, ${a.toFixed(3)})`, color: a > 0.5 ? '#fff' : 'var(--ink)' };
}

export default function CohortGrid({ computed }) {
  const { cohorts, maxOffset, format, avgByOffset } = computed;
  if (!cohorts.length) {
    return <div className="rb-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>Not enough history to build cohorts yet.</div>;
  }
  // max value across cells for color scaling (percent tops at 100)
  const globalMax = format === 'percent'
    ? 100
    : Math.max(1, ...cohorts.flatMap(c => c.cells.map(x => x.value)));

  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);
  return (
    <div className="rb-cohort-wrap">
      <table className="rb-cohort">
        <thead>
          <tr>
            <th className="rb-cohort-rowhead">Cohort</th>
            <th>Size</th>
            {offsets.map(o => <th key={o}>{o === 0 ? 'Month 0' : `+${o}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(c => (
            <tr key={c.key}>
              <td className="rb-cohort-rowhead fw-7">{c.label}</td>
              <td className="rb-cohort-size" style={{ textAlign: 'center' }}>{c.size}</td>
              {c.cells.map(cell => {
                const empty = c.size === 0;
                return (
                  <td key={cell.offset} className="rb-cohort-cell" style={cellStyle(cell.value / globalMax, empty)}>
                    {empty ? <span className="rb-cohort-empty">-</span> : formatValue(cell.value, format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="rb-cohort-rowhead fw-7" style={{ color: 'var(--n-600)' }}>Average</td>
            <td />
            {avgByOffset.map((v, i) => (
              <td key={i} className="rb-cohort-cell" style={{ ...cellStyle(v / globalMax), opacity: .85 }}>{formatValue(v, format)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
