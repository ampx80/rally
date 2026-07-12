// Forecasting. The number the board actually asks for, built to beat Clari:
// a KPI rail (committed, best case, pipeline, weighted, quota, gap), a
// forecast-category roll-up model (Commit / Best Case / Pipeline / Omitted)
// with a stacked composed chart by month and a quota ReferenceLine, a
// sortable per-rep forecast table with attainment, a quarter selector, a
// forecast-vs-actual trend line, and a live roll-up: click a rep to drill
// into their open deals with category + close date, and re-categorize a
// deal inline (Clari-style pull-to-commit). All live over the seeded book;
// every figure recomputes as deals move stage, and category overrides
// persist to localStorage.
import React, { useMemo, useState } from 'react';
import {
  useStore, getDeals, getUsers, userName, stageById, getCompany,
} from '../lib/store.js';
import {
  Card, Avatar, SectionHeader, StatCard, ProgressBar, Badge, Segmented,
  Button, AnimatedNumber, moneyK, money, shortDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import PipelineSwitcher from '../components/PipelineSwitcher.jsx';
import { DEFAULT_PIPELINE_ID, dealInPipeline } from '../lib/pipelines.js';
import {
  ResponsiveContainer, ComposedChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts';
import {
  CATEGORIES, categoryById, quarterRange, buildRollup, monthlyCategoryBreakdown,
  forecastVsActual, repQuarterlyQuotas, teamQuarterlyQuota, categoryFor,
  defaultCategory, loadOverrides, saveOverride,
} from '../lib/forecasting-data.js';

const GRID = '#e7e9ee';
const tipStyle = {
  background: 'var(--paper)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  fontSize: '.9rem', padding: '.5rem .7rem',
};

const spark = (base) => {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    out.push(Math.round(base * (0.62 + 0.38 * t) * (1 + Math.sin(i * 1.5) * 0.04)));
  }
  out[7] = Math.round(base);
  return out;
};

export default function Forecasting() {
  useStore(); // re-render on any store mutation

  const [quarter, setQuarter] = useState('this');
  const [pipelineId, setPipelineId] = useState(DEFAULT_PIPELINE_ID);
  const [overrides, setOverrides] = useState(() => loadOverrides());
  const [selectedRep, setSelectedRep] = useState(null);
  const [sort, setSort] = useState({ key: 'attainment', dir: 'desc' });

  const range = useMemo(() => quarterRange(quarter), [quarter]);
  const quota = useMemo(() => teamQuarterlyQuota(), []);
  const quotas = useMemo(() => repQuarterlyQuotas(), []);

  // The roll-up engine, recomputed when the quarter or overrides change.
  const roll = useMemo(() => buildRollup(range, overrides), [range, overrides]);
  const monthly = useMemo(() => monthlyCategoryBreakdown(range, overrides), [range, overrides]);
  const trend = useMemo(() => forecastVsActual(6), []);

  const gap = quota - roll.committed; // positive = short of quota
  const attainPct = quota ? Math.round((roll.committed / quota) * 100) : 0;
  const monthlyQuota = quota / 3;

  /* ---------- per-rep table ---------- */
  const reps = useMemo(() => {
    const rows = roll.reps.map(r => {
      const attainment = r.quota ? Math.round((r.closed / r.quota) * 100) : 0;
      const projected = r.closed + r.commit;
      const projPct = r.quota ? Math.round((projected / r.quota) * 100) : 0;
      return { ...r, name: userName(r.userId), attainment, projected, projPct, gap: r.quota - projected };
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const av = sort.key === 'name' ? a.name : a[sort.key];
      const bv = sort.key === 'name' ? b.name : b[sort.key];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [roll, sort]);

  const toggleSort = (key) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' });
  const SortTh = ({ k, children, align = 'right' }) => (
    <th
      onClick={() => toggleSort(k)}
      style={{ textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      title="Sort"
    >
      <span className="row" style={{ gap: 3, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {children}
        <span style={{ opacity: sort.key === k ? 1 : 0.25, fontSize: '.7rem' }}>{sort.key === k && sort.dir === 'asc' ? '▲' : '▼'}</span>
      </span>
    </th>
  );

  /* ---------- drill-down deal list for the selected rep ---------- */
  const drillDeals = useMemo(() => {
    if (!selectedRep) return [];
    return getDeals()
      .filter(d => d.ownerId === selectedRep && d.status === 'open')
      .filter(d => dealInPipeline(d, pipelineId))
      .filter(d => {
        const t = new Date(d.closeDate).getTime();
        return t >= range.start.getTime() && t <= range.end.getTime();
      })
      .sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
  }, [selectedRep, range, overrides, pipelineId]);

  const setCategory = (dealId, catId) => {
    const next = saveOverride(dealId, catId);
    setOverrides({ ...next });
  };

  /* ---------- KPI cards ---------- */
  const kpis = [
    { label: 'Committed', value: roll.committed, icon: 'check', accent: 'var(--ok)', sparkColor: 'var(--ok)', sub: 'closed won + commit', hero: true },
    { label: 'Best case', value: roll.bestCase, icon: 'trendUp', accent: 'var(--accent)', sub: 'committed + best-case upside' },
    { label: 'Open pipeline', value: roll.pipeline, icon: 'deals', accent: '#0ea5a3', sparkColor: '#0ea5a3', sub: `${roll.reps.reduce((s, r) => s + r.count, 0)} deals this quarter` },
    { label: 'Weighted forecast', value: roll.weighted, icon: 'target', accent: '#8b3fd4', sparkColor: '#8b3fd4', sub: 'value x probability' },
    { label: 'Team quota', value: quota, icon: 'dollar', accent: 'var(--n-600)', sparkColor: 'var(--n-400)', sub: range.label },
    { label: gap > 0 ? 'Gap to quota' : 'Over quota', value: Math.abs(gap), icon: gap > 0 ? 'arrowDown' : 'arrowUp', accent: gap > 0 ? 'var(--risk)' : 'var(--ok)', sparkColor: gap > 0 ? 'var(--risk)' : 'var(--ok)', sub: `${attainPct}% attained` },
  ];

  return (
    <div className="fade-up">
      <SectionHeader
        title="Forecasting"
        sub="Roll deals into commit, best case, and pipeline. The number the board asks for, live off the book."
        action={
          <div className="row gap-2 wrap">
            <PipelineSwitcher value={pipelineId} onChange={setPipelineId} />
            <Segmented
              options={[{ value: 'this', label: 'This quarter' }, { value: 'next', label: 'Next quarter' }]}
              value={quarter}
              onChange={(v) => { setQuarter(v); setSelectedRep(null); }}
            />
          </div>
        }
      />

      {/* Hero committed number + attainment ring line */}
      <Card className="card-pad" style={{ marginBottom: '1.15rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'var(--accent)', opacity: .06, filter: 'blur(10px)' }} />
        <div className="row between wrap" style={{ gap: '1rem', position: 'relative' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">{range.label} committed forecast</div>
            <div style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', fontWeight: 800, lineHeight: 1.05 }}>
              <AnimatedNumber value={roll.committed} format={money} />
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 4 }}>
              <Badge tone={gap <= 0 ? 'ok' : attainPct >= 80 ? 'accent' : 'warn'}>{attainPct}% of {moneyK(quota)} quota</Badge>
              <span className="t-sm muted">
                {gap > 0 ? `${moneyK(gap)} to close the gap` : `${moneyK(-gap)} over target`}
              </span>
            </div>
          </div>
          <div style={{ minWidth: 260, flex: '1 1 260px', maxWidth: 380 }}>
            <div className="row between t-sm" style={{ marginBottom: 6 }}>
              <span className="fw-6">Attainment</span>
              <span className="muted">best case {moneyK(roll.bestCase)}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <ProgressBar value={Math.min(100, attainPct)} color={gap <= 0 ? 'var(--ok)' : 'var(--accent)'} height={14} />
              {/* best-case ghost marker */}
              <div style={{ position: 'absolute', top: -3, left: `${Math.min(100, quota ? (roll.bestCase / quota) * 100 : 0)}%`, transform: 'translateX(-50%)', width: 3, height: 20, background: 'var(--n-600)', borderRadius: 2 }} title="Best case" />
            </div>
            <div className="row between t-xs muted" style={{ marginTop: 6 }}>
              <span>closed {moneyK(roll.closedWon)}</span>
              <span>commit {moneyK(roll.cat.commit)}</span>
              <span>quota {moneyK(quota)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: '1.15rem' }}>
        {kpis.map(k => (
          <StatCard
            key={k.label}
            label={k.label}
            value={Math.round(k.value)}
            format={moneyK}
            sub={k.sub}
            spark={spark(Math.max(1, k.value))}
            sparkColor={k.sparkColor}
            accent={k.accent}
            icon={<Icon name={k.icon} size={18} />}
          />
        ))}
      </div>

      {/* Category roll-up by month */}
      <Card className="card-pad" style={{ marginBottom: '1.15rem' }}>
        <div className="row between wrap" style={{ marginBottom: '.6rem', gap: '.6rem' }}>
          <div className="col gap-1">
            <div className="eyebrow">Forecast roll-up</div>
            <h4 style={{ margin: 0 }}>Category value by month, {range.label}</h4>
          </div>
          <div className="row gap-2 wrap">
            {CATEGORIES.filter(c => c.id !== 'omitted').map(c => (
              <span key={c.id} className="row gap-1" style={{ alignItems: 'center' }}>
                <span className="dot" style={{ background: c.color }} />
                <span className="t-sm fw-6">{c.label}</span>
              </span>
            ))}
            <span className="row gap-1" style={{ alignItems: 'center' }}>
              <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--risk)' }} />
              <span className="t-sm fw-6">Monthly quota</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthly} margin={{ top: 18, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 13, fill: 'var(--n-600)' }} />
            <YAxis tickFormatter={moneyK} tickLine={false} axisLine={false} width={54} tick={{ fontSize: 12, fill: 'var(--n-600)' }} />
            <Tooltip cursor={{ fill: 'rgba(91,75,245,.06)' }} contentStyle={tipStyle} formatter={(v, n) => [money(v), n]} />
            <ReferenceLine y={monthlyQuota} stroke="var(--risk)" strokeDasharray="5 5" strokeWidth={1.5}
              label={{ value: `quota ${moneyK(monthlyQuota)}/mo`, position: 'right', fill: 'var(--risk)', fontSize: 11 }} />
            <Bar dataKey="commit" stackId="f" name="Commit" fill="var(--ok)" maxBarSize={70} />
            <Bar dataKey="best" stackId="f" name="Best Case" fill="var(--accent)" maxBarSize={70} />
            <Bar dataKey="pipeline" stackId="f" name="Pipeline" fill="var(--warn)" radius={[6, 6, 0, 0]} maxBarSize={70} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(280px, 1fr)', gap: '1.15rem', alignItems: 'start', marginBottom: '1.15rem' }}>
        {/* Rep forecast table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-pad row between wrap" style={{ paddingBottom: '.9rem', gap: '.5rem' }}>
            <div className="col gap-1">
              <div className="eyebrow">By rep</div>
              <h4 style={{ margin: 0 }}>Rep forecast + attainment</h4>
            </div>
            {selectedRep && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedRep(null)}>
                <Icon name="x" size={14} /> Clear filter
              </Button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <SortTh k="name" align="left">Rep</SortTh>
                  <SortTh k="quota">Quota</SortTh>
                  <SortTh k="closed">Closed</SortTh>
                  <SortTh k="commit">Commit</SortTh>
                  <SortTh k="best">Best case</SortTh>
                  <SortTh k="pipeline">Pipeline</SortTh>
                  <SortTh k="gap">Gap</SortTh>
                  <th style={{ width: 170 }}>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {reps.map(r => {
                  const on = selectedRep === r.userId;
                  return (
                    <tr
                      key={r.userId}
                      onClick={() => setSelectedRep(on ? null : r.userId)}
                      style={{ cursor: 'pointer', background: on ? 'rgba(91,75,245,.07)' : undefined }}
                    >
                      <td>
                        <span className="row gap-2" style={{ minWidth: 0 }}>
                          <Avatar name={r.name} size={28} />
                          <span className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                            <span className="fw-6 clip">{r.name}</span>
                            <span className="t-xs muted clip">{r.projPct}% projected</span>
                          </span>
                        </span>
                      </td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.quota)}</td>
                      <td className="tnum fw-6" style={{ textAlign: 'right' }}>{moneyK(r.closed)}</td>
                      <td className="tnum" style={{ textAlign: 'right', color: 'var(--ok)' }}>{moneyK(r.commit)}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.best)}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.pipeline)}</td>
                      <td className="tnum" style={{ textAlign: 'right', color: r.gap > 0 ? 'var(--risk)' : 'var(--ok)' }}>
                        {r.gap > 0 ? moneyK(r.gap) : '✓'}
                      </td>
                      <td>
                        <span className="row gap-2">
                          <span style={{ flex: 1 }}>
                            <ProgressBar
                              value={Math.min(100, r.attainment)}
                              color={r.attainment >= 100 ? 'var(--ok)' : r.attainment >= 60 ? 'var(--accent)' : 'var(--warn)'}
                              height={8}
                            />
                          </span>
                          <span className="tnum fw-6" style={{ width: 44, textAlign: 'right' }}>{r.attainment}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Forecast vs actual trend */}
        <Card className="card-pad">
          <div className="eyebrow">Accuracy</div>
          <h4 style={{ margin: '.2rem 0 .2rem' }}>Forecast vs actual</h4>
          <div className="t-sm muted" style={{ marginBottom: '.6rem' }}>Last 6 months, closed won vs called.</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 12, fill: 'var(--n-600)' }} />
              <YAxis tickFormatter={moneyK} tickLine={false} axisLine={false} width={46} tick={{ fontSize: 11, fill: 'var(--n-600)' }} />
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => [money(v), n === 'actual' ? 'Actual' : 'Forecast']} />
              <Line type="monotone" dataKey="forecast" name="forecast" stroke="var(--n-400)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="actual" name="actual" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="row gap-2 wrap" style={{ marginTop: '.5rem' }}>
            <span className="row gap-1"><span style={{ width: 14, height: 0, borderTop: '2.5px solid var(--accent)' }} /><span className="t-sm fw-6">Actual</span></span>
            <span className="row gap-1"><span style={{ width: 14, height: 0, borderTop: '2px dashed var(--n-400)' }} /><span className="t-sm fw-6">Forecast</span></span>
          </div>
        </Card>
      </div>

      {/* Roll-up drill: selected rep open deals with editable category */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-pad row between wrap" style={{ paddingBottom: '.9rem', gap: '.5rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Deal roll-up</div>
            <h4 style={{ margin: 0 }}>
              {selectedRep ? `${userName(selectedRep)} open deals, ${range.label}` : `Select a rep to drill in`}
            </h4>
          </div>
          {selectedRep && <Badge tone="accent">{drillDeals.length} deals</Badge>}
        </div>

        {!selectedRep ? (
          <div className="col center gap-2" style={{ padding: '2.4rem 1.5rem', textAlign: 'center' }}>
            <Icon name="filter" size={26} />
            <div className="muted" style={{ maxWidth: 460 }}>
              Click any rep in the table above to roll up their open deals for {range.label}, see each deal's forecast category and close date, and pull a deal into commit or push it out.
            </div>
          </div>
        ) : drillDeals.length === 0 ? (
          <div className="col center gap-2" style={{ padding: '2.4rem 1.5rem', textAlign: 'center' }}>
            <div className="muted">No open deals closing in {range.label} for this rep.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Stage</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>Prob</th>
                  <th style={{ textAlign: 'right' }}>Close</th>
                  <th style={{ width: 300 }}>Forecast category</th>
                </tr>
              </thead>
              <tbody>
                {drillDeals.map(d => {
                  const cat = categoryFor(d, overrides);
                  const meta = categoryById(cat);
                  const isOverride = !!overrides[d.id] && overrides[d.id] !== defaultCategory(d);
                  const co = getCompany(d.companyId);
                  return (
                    <tr key={d.id}>
                      <td style={{ maxWidth: 260 }}>
                        <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                          <span className="fw-6 clip">{d.name}</span>
                          <span className="t-xs muted clip">{co?.name || 'No account'}</span>
                        </div>
                      </td>
                      <td><Badge>{stageById(d.stage)?.name || d.stage}</Badge></td>
                      <td className="tnum fw-6" style={{ textAlign: 'right' }}>{money(d.value)}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{d.probability}%</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{shortDate(d.closeDate)}</td>
                      <td>
                        <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                          {CATEGORIES.map(c => {
                            const on = c.id === cat;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setCategory(d.id, c.id === defaultCategory(d) ? null : c.id)}
                                className="btn btn-sm"
                                title={c.desc}
                                style={{
                                  padding: '.28rem .55rem',
                                  background: on ? c.color : 'transparent',
                                  color: on ? '#fff' : 'var(--n-600)',
                                  border: on ? '1px solid transparent' : '1px solid var(--line)',
                                  fontWeight: on ? 700 : 600,
                                }}
                              >
                                {c.label}
                              </button>
                            );
                          })}
                          {isOverride && <Badge tone={meta.tone}>edited</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
