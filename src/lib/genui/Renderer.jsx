// ============================================================
// GENERATIVE UI - RENDERER  (interprets a validated ui_spec)
// ------------------------------------------------------------
// Walks a SAFE spec (already run through validateSpec) and paints it
// with the Ardovo UI kit + recharts. It reads data only through the
// whitelisted resolvers in spec.js. It never evaluates a spec string as
// code. Action buttons either navigate to a real route or re-open Rook
// with a prompt (so any write stays behind the operator's confirm UI).
// ============================================================
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Card, Badge, Button, money, moneyK, shortDate } from '../../components/UI.jsx';
import { resolveData, resolveKpi, SELECTORS, KPIS } from './spec.js';

const ACCENT = '#5b4bf5';
const SERIES = ['#5b4bf5', '#0ea5a3', '#a855f7', '#b3721a', '#2563a8', '#1a7f52', '#c0392b', '#8b93a4'];
const STAGE_COLOR = { Lead: '#8b93a4', Qualified: '#2563a8', Discovery: '#5b4bf5', Proposal: '#b3721a', Negotiation: '#0ea5a3', 'Closed Won': '#1a7f52', 'Closed Lost': '#c0392b' };

/* ---------- value formatting ---------- */
function fmt(value, format) {
  if (value == null || value === '') return '-';
  switch (format) {
    case 'money': return money(value);
    case 'moneyK': return moneyK(value);
    case 'percent': return `${Math.round(Number(value))}%`;
    case 'number': return typeof value === 'number' ? value.toLocaleString() : value;
    case 'date': return shortDate(value);
    default: return String(value);
  }
}

/* ---------- themed chart tooltip ---------- */
function ChartTip({ active, payload, label, valueFormat }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.5rem .7rem', boxShadow: 'var(--shadow-lg)', fontSize: '.82rem' }}>
      <div className="fw-7" style={{ marginBottom: 2 }}>{label ?? payload[0]?.name}</div>
      <div style={{ color: 'var(--n-600)' }}>{fmt(payload[0].value, valueFormat)}</div>
    </div>
  );
}

/* ============================================================
   individual block renderers
   ============================================================ */
function StatTile({ kpi, value, label, format, sub, accent }) {
  const v = kpi ? resolveKpi(kpi) : value;
  const meta = kpi ? KPIS[kpi] : null;
  const f = format || meta?.format || 'number';
  const a = accent || ACCENT;
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ position: 'absolute', top: -28, right: -28, width: 100, height: 100, borderRadius: '50%', background: a, opacity: 0.09, filter: 'blur(6px)' }} />
      <div className="stat-label" style={{ position: 'relative' }}>{label || meta?.label || kpi}</div>
      <div className="stat-value" style={{ position: 'relative', fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', marginTop: 4 }}>{fmt(v, f)}</div>
      {sub && <div className="t-xs muted" style={{ position: 'relative', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function sortRows(rows, sortBy, sortDir) {
  if (!sortBy) return rows;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

function DataBlock({ block }) {
  const { rows, valueFormat } = resolveData(block.data);
  const cols = block.columns || SELECTORS[block.data.selector]?.columns || (rows[0] ? Object.keys(rows[0]).filter(k => k !== 'id').map(k => ({ key: k, label: k, format: 'text' })) : []);
  const sorted = sortRows(rows, block.sortBy, block.sortDir).slice(0, block.limit || 8);
  const colFmt = (c) => c.format || (c.key === 'value' ? valueFormat || 'money' : undefined);
  return (
    <Card className="col" style={{ gap: '.85rem', minWidth: 0 }}>
      {block.title && <h4 style={{ margin: 0 }}>{block.title}</h4>}
      {sorted.length === 0 ? (
        <div className="muted t-sm" style={{ padding: '1rem 0' }}>No matching records.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>{cols.map(c => <th key={c.key} style={{ textAlign: (colFmt(c) === 'money' || colFmt(c) === 'number' || colFmt(c) === 'percent') ? 'right' : 'left' }}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id || i}>
                  {cols.map(c => {
                    const f = colFmt(c);
                    const right = f === 'money' || f === 'number' || f === 'percent';
                    if (c.format === 'badge' || c.key === 'stage') {
                      return <td key={c.key}><Badge>{r[c.key] ?? '-'}</Badge></td>;
                    }
                    return <td key={c.key} style={{ textAlign: right ? 'right' : 'left', fontVariantNumeric: right ? 'tabular-nums' : undefined, fontWeight: c.key === 'name' ? 600 : undefined }}>{fmt(r[c.key], f)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ChartBlock({ block }) {
  const { rows, valueFormat } = resolveData(block.data);
  const data = rows.slice(0, block.limit || 12).map(r => ({ name: r.label ?? r.name ?? '-', value: Number(r.value) || 0 }));
  const axisTick = { fontSize: 12, fill: 'var(--n-600)' };
  const grid = 'var(--line)';
  const tip = <Tooltip content={<ChartTip valueFormat={valueFormat || 'number'} />} cursor={{ fill: 'rgba(91,75,245,.06)' }} />;

  let chart;
  if (block.chart === 'pie') {
    chart = (
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="78%" innerRadius="46%" paddingAngle={2} stroke="var(--paper)" strokeWidth={2}>
          {data.map((d, i) => <Cell key={i} fill={STAGE_COLOR[d.name] || SERIES[i % SERIES.length]} />)}
        </Pie>
        {tip}
      </PieChart>
    );
  } else if (block.chart === 'line' || block.chart === 'area') {
    const El = block.chart === 'area' ? AreaChart : LineChart;
    chart = (
      <El data={data} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
        <defs><linearGradient id="genuiArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: grid }} interval="preserveStartEnd" />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (Math.abs(v) >= 1000 ? moneyK(v).replace('$', '') : v)} />
        {tip}
        {block.chart === 'area'
          ? <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} fill="url(#genuiArea)" />
          : <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />}
      </El>
    );
  } else {
    chart = (
      <BarChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: grid }} interval={0} angle={data.length > 6 ? -18 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 52 : 30} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (Math.abs(v) >= 1000 ? moneyK(v).replace('$', '') : v)} />
        {tip}
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {data.map((d, i) => <Cell key={i} fill={STAGE_COLOR[d.name] || SERIES[i % SERIES.length]} />)}
        </Bar>
      </BarChart>
    );
  }

  return (
    <Card className="col" style={{ gap: '.85rem', minWidth: 0 }}>
      {block.title && <h4 style={{ margin: 0 }}>{block.title}</h4>}
      {data.length === 0
        ? <div className="muted t-sm" style={{ padding: '1rem 0' }}>No data to chart.</div>
        : <ResponsiveContainer width="100%" height={280} minWidth={0}>{chart}</ResponsiveContainer>}
    </Card>
  );
}

function TextBlock({ block }) {
  return (
    <Card className="col" style={{ gap: '.5rem' }}>
      {block.title && <h4 style={{ margin: 0 }}>{block.title}</h4>}
      <div className="muted" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{block.body}</div>
    </Card>
  );
}

function NoteBlock({ block }) {
  const tone = block.tone || 'info';
  const color = { info: 'var(--accent)', ok: 'var(--ok)', warn: 'var(--warn)', risk: 'var(--risk)', accent: 'var(--accent)' }[tone] || 'var(--accent)';
  return (
    <div className="card card-pad" style={{ borderLeft: `3px solid ${color}`, background: 'color-mix(in srgb, var(--paper) 92%, ' + color + ')' }}>
      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
        <span aria-hidden style={{ color, fontWeight: 800, lineHeight: 1.4 }}>!</span>
        <div style={{ lineHeight: 1.55 }}>{block.body}</div>
      </div>
    </div>
  );
}

function ActionsBlock({ block }) {
  const navigate = useNavigate();
  const run = (a) => {
    if (a.kind === 'navigate') { navigate(a.to); return; }
    // rook: hand the prompt to the docked operator; user still confirms any write.
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt: a.prompt } })); } catch {}
  };
  return (
    <div className="row gap-2 wrap">
      {block.actions.map((a, i) => (
        <Button key={i} variant={a.variant || (a.kind === 'rook' ? 'accent' : 'ghost')} onClick={() => run(a)}>{a.label}</Button>
      ))}
    </div>
  );
}

/* ============================================================
   Renderer - walks the spec and stitches the micro-app together.
   ============================================================ */
function BlockView({ block }) {
  switch (block.type) {
    case 'stat': return <StatTile {...block} />;
    case 'statRow':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`, gap: '1rem' }}>
          {block.stats.map((s, i) => <StatTile key={i} {...s} />)}
        </div>
      );
    case 'table': return <DataBlock block={block} />;
    case 'chart': return <ChartBlock block={block} />;
    case 'text': return <TextBlock block={block} />;
    case 'note': return <NoteBlock block={block} />;
    case 'actions': return <ActionsBlock block={block} />;
    default: return null;
  }
}

export default function Renderer({ spec }) {
  const blocks = useMemo(() => (spec && Array.isArray(spec.blocks) ? spec.blocks : []), [spec]);
  if (!spec) return null;
  return (
    <div className="col" style={{ gap: '1.15rem' }}>
      {(spec.title || spec.subtitle) && (
        <div className="col gap-1">
          {spec.title && <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{spec.title}</h2>}
          {spec.subtitle && <div className="muted t-sm">{spec.subtitle}</div>}
        </div>
      )}
      {blocks.map((b, i) => (
        <div key={i} className="genui-block" style={{ animationDelay: `${Math.min(i * 55, 440)}ms` }}>
          <BlockView block={b} />
        </div>
      ))}
    </div>
  );
}
