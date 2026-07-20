// VizPreview - the live chart at the heart of the builder canvas. Renders a
// computed report (from runReport) as bar / line / area / donut / table / KPI,
// with multi-series support when a second dimension is present. Mirrors the
// look of the existing Reports charts so the product reads as one surface.
// ASCII only. NO em-dash / en-dash.
import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatValue } from '../../lib/report-builder';
import PivotTable from './PivotTable';
import './reports2.css';

const ACCENT = '#5b4bf5';
const GRID = 'var(--line)';
const SERIES_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#8b3fd4', '#2563a8', '#c0392b', '#1a7f52', '#d4a017'];
const AXIS_TICK = { fontSize: 12, fill: 'var(--n-600)' };
const TIP_STYLE = {
  background: 'var(--paper)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  padding: '.55rem .7rem', fontSize: '.84rem',
};

function CustomTip({ active, payload, label, fmt, measureLabel }) {
  if (!active || !payload || !payload.length) return null;
  // Pie slices do not pass a category `label`; fall back to the slice name.
  const title = (label != null && label !== '') ? label : (payload[0] && payload[0].name);
  return (
    <div style={TIP_STYLE}>
      <div className="fw-7" style={{ marginBottom: 4 }}>{title}</div>
      <div className="col gap-1" style={{ minWidth: 130 }}>
        {payload.map((p) => (
          <div key={p.dataKey} className="row between gap-2">
            <span className="row gap-1" style={{ alignItems: 'center', color: 'var(--n-600)' }}>
              <span className="dot" style={{ background: p.color || p.fill }} />
              {p.dataKey === 'value' ? measureLabel : p.dataKey}
            </span>
            <span className="fw-7 tnum">{formatValue(p.value, fmt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VizPreview({ def, computed, height = 320 }) {
  const { rows, series, valueFormat, measureLabel } = computed;
  const viz = def.viz || 'bar';
  const keys = series.length ? series : ['value'];
  const tickFmt = (v) => formatValue(v, valueFormat);

  if (!rows.length) {
    return <div className="rb-muted" style={{ padding: '2.5rem 0', textAlign: 'center' }}>No data matches this definition yet. Adjust the fields, filters, or date range.</div>;
  }

  /* ---- KPI single value ---- */
  if (viz === 'kpi') {
    return (
      <div className="rb-kpi">
        <div className="rb-muted">{measureLabel}</div>
        <div className="rb-kpi-value">{formatValue(computed.kpi, valueFormat)}</div>
        <div className="rb-muted">across {rows.length} {computed.dimLabel.toLowerCase()} groups, {computed.recordCount} records</div>
      </div>
    );
  }

  /* ---- pivot (cross-tab) ---- */
  if (viz === 'pivot') {
    return <PivotTable computed={computed} />;
  }

  /* ---- table ---- */
  if (viz === 'table') {
    const max = Math.max(...rows.map(r => r.value), 1);
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.92rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
              <th style={{ padding: '.55rem .5rem', color: 'var(--n-600)', fontWeight: 700 }}>{computed.dimLabel}</th>
              {keys.map(k => (
                <th key={k} style={{ padding: '.55rem .5rem', color: 'var(--n-600)', fontWeight: 700, textAlign: 'right' }}>{k === 'value' ? measureLabel : k}</th>
              ))}
              {!series.length && <th style={{ padding: '.55rem .5rem', color: 'var(--n-600)', fontWeight: 700, width: '30%' }}>Share</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '.5rem .5rem' }}>
                  <span className="row gap-2" style={{ alignItems: 'center' }}>
                    <span className="dot" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{r.label}
                  </span>
                </td>
                {keys.map(k => (
                  <td key={k} style={{ padding: '.5rem .5rem', textAlign: 'right', fontWeight: 700 }} className="tnum">{formatValue(r[k], valueFormat)}</td>
                ))}
                {!series.length && (
                  <td style={{ padding: '.5rem .5rem' }}>
                    <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: Math.round((r.value / max) * 100) + '%', height: '100%', background: SERIES_COLORS[i % SERIES_COLORS.length], borderRadius: 999 }} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ---- donut ----
     A pie shows one dimension. When a split-by (secondary dimension) is
     present, slice by that split series (each slice is the measure summed
     across every primary group for that series value) so the donut reflects
     the second dimension instead of silently ignoring it. A legend + the
     split label keep it honest. With no split, slice by the primary rows. */
  if (viz === 'pie') {
    const split = series.length > 0;
    const pieData = split
      ? series.map((k) => ({ name: k, value: rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) }))
      : rows.map((r) => ({ name: r.label, value: Number(r.value) || 0 }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={height * 0.19} outerRadius={height * 0.37} paddingAngle={2}
            label={({ name, value }) => `${name}: ${formatValue(value, valueFormat)}`}
            labelLine={false} style={{ fontSize: 12 }}>
            {pieData.map((d, i) => <Cell key={d.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTip fmt={valueFormat} measureLabel={measureLabel} />} />
          {split && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  /* ---- line / area ---- */
  if (viz === 'line' || viz === 'area') {
    const ChartTag = viz === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartTag data={rows} margin={{ top: 10, right: 20, left: 6, bottom: 4 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`rbArea${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.26} />
                <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
          <Tooltip content={<CustomTip fmt={valueFormat} measureLabel={measureLabel} />} cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {keys.map((k, i) => viz === 'area'
            ? <Area key={k} type="monotone" dataKey={k} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2.4} fill={`url(#rbArea${i})`} />
            : <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2.4} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />)}
        </ChartTag>
      </ResponsiveContainer>
    );
  }

  /* ---- bar (default) ---- */
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 10, right: 18, left: 6, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0}
          angle={rows.length > 6 ? -20 : 0} textAnchor={rows.length > 6 ? 'end' : 'middle'} height={rows.length > 6 ? 52 : 30} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
        <Tooltip content={<CustomTip fmt={valueFormat} measureLabel={measureLabel} />} cursor={{ fill: 'rgba(91,75,245,.06)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId={series.length ? 'a' : undefined}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={series.length ? [0, 0, 0, 0] : [5, 5, 0, 0]} maxBarSize={64}>
            {!series.length && rows.map((r, ri) => <Cell key={r.label} fillOpacity={1 - Math.min(ri * 0.05, 0.4)} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
