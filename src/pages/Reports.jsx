// Reports - the answers layer on top of Ardovo. A live KPI dashboard, a
// gallery of saved reports (seed + custom), a full report view with the
// right recharts chart plus a data table, and a "New report" builder that
// composes a report from a data source, metric, dimension and chart type
// with a live preview. Everything computes off the real store; custom
// report definitions persist to localStorage via ../lib/reports-data.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  useStore, getDeals, getContacts, getCompanies, getActivities, getUsers,
  pipelineValue, weightedForecast, winRate, openDeals, dealsClosingThisMonth,
  repLeaderboard, STAGES,
} from '../lib/store';
import {
  Card, Button, Badge, SectionHeader, Sparkline,
  Modal, Field, Input, Select, useToast, money, moneyK, shortDate,
} from '../components/UI';
import { Icon } from '../components/icons';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import AnimatedStat from '../components/motion/AnimatedStat';
import EmptyState from '../components/motion/EmptyState';
import { SkeletonChart } from '../components/motion/Skeleton';
import { useInView } from '../components/motion/useInView';
import {
  SOURCES, metricsFor, dimensionsFor, CHART_TYPES,
  computeReport, allReports, saveReport, duplicateReport, deleteReport,
  reportToCsv, downloadCsv,
} from '../lib/reports-data';

const ACCENT = '#5b4bf5';
const GRID = '#e7e9ee';
const AXIS_TICK = { fontSize: 12, fill: '#5b6474' };
const PIE_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#8b3fd4', '#2563a8', '#c0392b', '#1a7f52', '#d4a017'];
const TIP_STYLE = {
  background: 'var(--paper)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  padding: '.6rem .75rem', fontSize: '.86rem',
};

/* format a value per the report's metric type */
function fmt(v, kind) {
  if (kind === 'money') return moneyK(v);
  if (kind === 'percent') return Math.round(v) + '%';
  return typeof v === 'number' ? v.toLocaleString() : v;
}

/* ---- draw-on-view chart mount: shimmer placeholder until the chart is
   scrolled into view, then the real recharts mounts and draws itself in ---- */
function InViewChart({ height = 320, children }) {
  const [ref, seen] = useInView({ once: true });
  return <div ref={ref}>{seen ? children : <SkeletonChart height={height} />}</div>;
}

/* ---- shared chart renderer, drives every report view + preview ---- */
function ReportChart({ def, computed, height = 320 }) {
  const { rows, valueFormat } = computed;
  if (!rows.length) {
    return <div className="muted t-sm" style={{ padding: '2rem 0', textAlign: 'center' }}>No data to chart for this selection.</div>;
  }
  const tickFmt = (v) => valueFormat === 'money' ? moneyK(v) : valueFormat === 'percent' ? v + '%' : v;
  const CustomTip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
      <div style={TIP_STYLE}>
        <div className="fw-7" style={{ marginBottom: 4 }}>{p.label}</div>
        <div className="row between gap-2" style={{ minWidth: 140 }}>
          <span style={{ color: 'var(--n-600)' }}>{computed.metricLabel}</span>
          <span className="fw-7 tnum">{fmt(p.value, valueFormat)}</span>
        </div>
      </div>
    );
  };

  if (def.chart === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="label" cx="50%" cy="50%"
            innerRadius={height * 0.18} outerRadius={height * 0.36} paddingAngle={2}
            label={({ label, value }) => `${label}: ${fmt(value, valueFormat)}`}
            labelLine={false} style={{ fontSize: 12 }}>
            {rows.map((r, i) => <Cell key={r.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (def.chart === 'line' || def.chart === 'area') {
    const ChartTag = def.chart === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartTag data={rows} margin={{ top: 10, right: 20, left: 6, bottom: 4 }}>
          <defs>
            <linearGradient id="rptArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
          <Tooltip content={<CustomTip />} cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }} />
          {def.chart === 'area'
            ? <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} fill="url(#rptArea)" />
            : <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />}
        </ChartTag>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 10, right: 18, left: 6, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} angle={rows.length > 6 ? -20 : 0} textAnchor={rows.length > 6 ? 'end' : 'middle'} height={rows.length > 6 ? 52 : 30} />
        <YAxis tickFormatter={tickFmt} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
        <Tooltip content={<CustomTip />} cursor={{ fill: 'rgba(91,75,245,.06)' }} />
        <Bar dataKey="value" fill={ACCENT} radius={[5, 5, 0, 0]} maxBarSize={64}>
          {rows.map((r, i) => <Cell key={r.label} fillOpacity={1 - Math.min(i * 0.05, 0.4)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---- data table beneath every report ---- */
function ReportTable({ def, computed }) {
  const total = computed.valueFormat === 'percent'
    ? null
    : computed.rows.reduce((s, r) => s + r.value, 0);
  const dimLabel = (dimensionsFor(def.source).find(d => d.id === def.groupBy) || {}).label || 'Group';
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="rpt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.95rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
            <th style={{ padding: '.6rem .5rem', color: 'var(--n-600)', fontWeight: 700 }}>{dimLabel}</th>
            <th style={{ padding: '.6rem .5rem', color: 'var(--n-600)', fontWeight: 700, textAlign: 'right' }}>{computed.metricLabel}</th>
            <th style={{ padding: '.6rem .5rem', color: 'var(--n-600)', fontWeight: 700, width: '34%' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {computed.rows.map((r, i) => {
            const max = Math.max(...computed.rows.map(x => x.value), 1);
            const pct = Math.round((r.value / max) * 100);
            return (
              <tr key={r.label} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '.55rem .5rem' }}>
                  <span className="row gap-2" style={{ alignItems: 'center' }}>
                    <span className="dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {r.label}
                  </span>
                </td>
                <td style={{ padding: '.55rem .5rem', textAlign: 'right', fontWeight: 700 }} className="tnum">{fmt(r.value, computed.valueFormat)}</td>
                <td style={{ padding: '.55rem .5rem' }}>
                  <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 999 }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {total != null && (
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--line)' }}>
              <td style={{ padding: '.6rem .5rem', fontWeight: 700 }}>Total</td>
              <td style={{ padding: '.6rem .5rem', textAlign: 'right', fontWeight: 800 }} className="tnum">{fmt(total, computed.valueFormat)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ---- the builder modal (create / edit a custom report) ---- */
function BuilderModal({ open, onClose, initial, onSaved }) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title || 'My custom report');
  const [source, setSource] = useState(initial?.source || 'deals');
  const [metric, setMetric] = useState(initial?.metric || 'sum');
  const [groupBy, setGroupBy] = useState(initial?.groupBy || 'stage');
  const [chart, setChart] = useState(initial?.chart || 'bar');

  // keep metric + dimension valid whenever the source changes
  const metrics = metricsFor(source);
  const dims = dimensionsFor(source);
  const safeMetric = metrics.some(m => m.id === metric) ? metric : metrics[0].id;
  const safeDim = dims.some(d => d.id === groupBy) ? groupBy : dims[0].id;

  const def = { title, source, metric: safeMetric, groupBy: safeDim, chart };
  const computed = useMemo(() => computeReport(def), [source, safeMetric, safeDim]);

  const onSource = (s) => {
    setSource(s);
    const m = metricsFor(s); const d = dimensionsFor(s);
    if (!m.some(x => x.id === metric)) setMetric(m[0].id);
    if (!d.some(x => x.id === groupBy)) setGroupBy(d[0].id);
  };

  const doSave = () => {
    const saved = saveReport({ ...def, id: initial?.custom ? initial.id : null, custom: true });
    toast('Report saved to gallery');
    onSaved?.(saved);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New report" width={860}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={doSave}><Icon name="check" size={16} /> Save report</Button>
      </>}>
      <div className="row gap-3" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* controls */}
        <div className="col gap-2" style={{ flex: '1 1 260px', minWidth: 240 }}>
          <Field label="Report name"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name this report" /></Field>
          <Field label="Data source">
            <Select value={source} onChange={e => onSource(e.target.value)}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Metric">
            <Select value={safeMetric} onChange={e => setMetric(e.target.value)}>
              {metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Group by">
            <Select value={safeDim} onChange={e => setGroupBy(e.target.value)}>
              {dims.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Chart type">
            <div className="row gap-1 wrap">
              {CHART_TYPES.map(c => (
                <Button key={c} size="sm" variant={chart === c ? 'primary' : 'ghost'} onClick={() => setChart(c)} style={{ textTransform: 'capitalize' }}>
                  <Icon name={c === 'pie' ? 'pie' : c === 'bar' ? 'chart' : 'trendUp'} size={15} /> {c}
                </Button>
              ))}
            </div>
          </Field>
        </div>
        {/* live preview */}
        <div className="col gap-2" style={{ flex: '2 1 340px', minWidth: 300 }}>
          <div className="row between">
            <span className="fw-7">Live preview</span>
            <Badge tone="accent">{computed.rows.length} groups</Badge>
          </div>
          <Card pad style={{ minHeight: 300 }}>
            <ReportChart def={def} computed={computed} height={280} />
          </Card>
        </div>
      </div>
    </Modal>
  );
}

/* ---- full report view (chart + table + actions) ---- */
function ReportView({ def, onBack, onDuplicated, onDeleted }) {
  const toast = useToast();
  const computed = useMemo(() => computeReport(def), [def.source, def.metric, def.groupBy, def.chart]);

  return (
    <PageTransition className="col gap-3">
      <div className="row between wrap gap-2">
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: ACCENT + '18', color: ACCENT, flex: 'none' }}>
            <Icon name={def.icon || 'chart'} size={18} />
          </span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>{def.title}</h3>
            <span className="muted t-sm">{def.desc}</span>
          </div>
        </div>
        <div className="row gap-1 wrap" style={{ flex: 'none' }}>
          {def.custom && <Badge tone="accent">Custom</Badge>}
          <Button variant="ghost" size="sm" onClick={() => { downloadCsv(def.title, reportToCsv(def, computed)); toast('CSV exported'); }}>
            <Icon name="download" size={16} /> Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { const c = duplicateReport(def); toast('Report duplicated'); onDuplicated?.(c); }}>
            <Icon name="copy" size={16} /> Duplicate
          </Button>
          {def.custom && (
            <Button variant="ghost" size="sm" onClick={() => { deleteReport(def.id); toast('Report deleted'); onDeleted?.(); }}>
              <Icon name="x" size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      <Reveal>
      <Card className="col" style={{ gap: '1rem' }}>
        <InViewChart height={340}>
          <ReportChart def={def} computed={computed} height={340} />
        </InViewChart>
      </Card>
      </Reveal>

      <Reveal delay={80}>
      <Card className="col" style={{ gap: '.75rem' }}>
        <div className="row between">
          <span className="fw-7">Breakdown</span>
          <span className="muted t-sm">{computed.rows.length} rows</span>
        </div>
        <ReportTable def={def} computed={computed} />
      </Card>
      </Reveal>
    </PageTransition>
  );
}

/* ---- gallery card ---- */
function GalleryCard({ def, onOpen }) {
  const computed = useMemo(() => computeReport(def), [def.source, def.metric, def.groupBy]);
  const spark = computed.rows.map(r => r.value);
  const headline = computed.valueFormat === 'percent'
    ? fmt(Math.round(computed.rows.reduce((s, r) => s + r.value, 0) / (computed.rows.length || 1)), 'percent')
    : fmt(computed.rows.reduce((s, r) => s + r.value, 0), computed.valueFormat);
  return (
    <Card hover className="col" style={{ gap: '.85rem', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => onOpen(def)}>
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: ACCENT + '14', color: ACCENT, flex: 'none' }}>
            <Icon name={def.icon || 'chart'} size={18} />
          </span>
          <div style={{ opacity: .9 }}>{spark.length > 1 && <Sparkline data={spark} w={92} h={34} />}</div>
        </div>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="fw-7" style={{ fontSize: '1.02rem' }}>{def.title}</span>
          <span className="muted t-sm">{def.desc}</span>
        </div>
      </div>
      <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
        <span className="t-sm fw-7 tnum">{headline}</span>
        <span className="row gap-1 t-xs" style={{ color: ACCENT, fontWeight: 700 }}>
          {def.custom ? 'Custom' : 'Standard'} <Icon name="chevronRight" size={15} />
        </span>
      </div>
    </Card>
  );
}

export default function Reports() {
  useStore(); // subscribe for reactivity
  const [view, setView] = useState(null);   // active report def or null
  const [builder, setBuilder] = useState(false);
  const [galleryVersion, bumpGallery] = useState(0); // force gallery refresh after save/delete

  const reports = useMemo(() => allReports(), [galleryVersion]);
  const refresh = () => bumpGallery(v => v + 1);

  /* ---- dashboard KPIs, all live ---- */
  const pipeline = pipelineValue();
  const forecast = weightedForecast();
  const rate = winRate();
  const closingThis = dealsClosingThisMonth();
  const closingValue = closingThis.reduce((s, d) => s + d.value, 0);

  // sparkline series off real data (deal value trend by close month, forecast by rep)
  const monthSpark = useMemo(() => {
    const r = computeReport({ source: 'deals', metric: 'sum', groupBy: 'month', chart: 'area' });
    return r.rows.map(x => x.value);
  }, [galleryVersion]);
  const repForecast = useMemo(() => computeReport({ source: 'deals', metric: 'sum', groupBy: 'owner', chart: 'bar' }), [galleryVersion]);
  const winByRep = useMemo(() => computeReport({ source: 'deals', metric: 'winRate', groupBy: 'owner', chart: 'bar' }), [galleryVersion]);
  const dealsByIndustry = useMemo(() => computeReport({ source: 'deals', metric: 'count', groupBy: 'industry', chart: 'pie' }), [galleryVersion]);

  if (view) {
    return (
      <ReportView
        def={view}
        onBack={() => setView(null)}
        onDuplicated={(c) => { refresh(); setView(c); }}
        onDeleted={() => { refresh(); setView(null); }}
      />
    );
  }

  return (
    <PageTransition className="col gap-3">
      <SectionHeader
        title="Reports"
        sub="A live view of the business, plus a builder for any question you can ask."
        action={
          <>
            <Button as={Link} to="/report-builder" variant="ghost"><Icon name="pie" size={16} /> Build a report</Button>
            <Button onClick={() => setBuilder(true)}><Icon name="plus" size={16} /> New report</Button>
          </>
        }
      />

      {/* ---------- DASHBOARD: live KPIs (count up + spark draw on view) ---------- */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <AnimatedStat label="Open pipeline" value={pipeline} format={moneyK} icon={<Icon name="funnel" size={18} />} spark={monthSpark} sub={`${openDeals().length} open deals`} />
        <AnimatedStat label="Weighted forecast" value={forecast} format={moneyK} icon={<Icon name="trendUp" size={18} />} spark={monthSpark} sparkColor="#0ea5a3" sub="value x probability" />
        <AnimatedStat label="Win rate" value={rate} format={(v) => Math.round(v) + '%'} icon={<Icon name="target" size={18} />} sub="won / (won + lost)" />
        <AnimatedStat label="Closing this month" value={closingValue} format={moneyK} icon={<Icon name="dollar" size={18} />} sub={`${closingThis.length} deals in play`} />
      </div>

      {/* ---------- DASHBOARD: charts ---------- */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
        <Reveal>
        <Card className="col" style={{ gap: '.75rem' }}>
          <div className="row between">
            <span className="fw-7">Forecast by rep</span>
            <span className="muted t-sm">open pipeline each rep carries</span>
          </div>
          <InViewChart height={240}>
            <ReportChart def={{ chart: 'bar' }} computed={repForecast} height={240} />
          </InViewChart>
        </Card>
        </Reveal>
        <Reveal delay={60}>
        <Card className="col" style={{ gap: '.75rem' }}>
          <div className="row between">
            <span className="fw-7">Deals by industry</span>
            <span className="muted t-sm">where pipeline concentrates</span>
          </div>
          <InViewChart height={240}>
            <ReportChart def={{ chart: 'pie' }} computed={dealsByIndustry} height={240} />
          </InViewChart>
        </Card>
        </Reveal>
        <Reveal delay={120}>
        <Card className="col" style={{ gap: '.75rem' }}>
          <div className="row between">
            <span className="fw-7">Win rate by rep</span>
            <span className="muted t-sm">closed-won conversion</span>
          </div>
          <InViewChart height={240}>
            <ReportChart def={{ chart: 'bar' }} computed={winByRep} height={240} />
          </InViewChart>
        </Card>
        </Reveal>
      </div>

      {/* ---------- GALLERY ---------- */}
      <Reveal>
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Report library</h4>
            <div className="muted t-sm">Saved reports, ready to run. Open one, or build your own.</div>
          </div>
          <Badge tone="default">{reports.length} reports</Badge>
        </div>

        {reports.length === 0 ? (
          <EmptyState icon="chart" title="No reports yet" body="Build your first report and it will land right here, ready to run." action={<Button onClick={() => setBuilder(true)}><Icon name="plus" size={16} /> New report</Button>} />
        ) : (
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {reports.map(def => <GalleryCard key={def.id} def={def} onOpen={setView} />)}
          </div>
        )}
      </div>
      </Reveal>

      <BuilderModal
        open={builder}
        onClose={() => setBuilder(false)}
        onSaved={(saved) => { refresh(); setView(saved); }}
      />
    </PageTransition>
  );
}
