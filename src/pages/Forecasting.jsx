// Forecasting. The number the board actually asks for: commit, best case,
// and pipeline, computed straight off the open deals (value * probability).
// A KPI rail, a six-month weighted-forecast bar chart, a per-rep forecast
// table with quota attainment, and a category-mix donut. All live over the
// seeded book; every figure recomputes as deals move stage.
import React, { useMemo } from 'react';
import {
  useStore, openDeals, weightedForecast, pipelineValue, getDeals, getUsers,
  repLeaderboard, stageById, userName,
} from '../lib/store.js';
import {
  Card, Avatar, SectionHeader, StatCard, ProgressBar, Badge,
  moneyK, money,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie,
} from 'recharts';

const GRID = '#e7e9ee';
const weighted = (d) => d.value * (d.probability / 100);

export default function Forecasting() {
  useStore();

  const open = openDeals();

  const kpis = useMemo(() => {
    // Commit = weighted value of late-stage deals (negotiation + proposal).
    const commit = open
      .filter(d => d.stage === 'negotiation' || d.stage === 'proposal')
      .reduce((s, d) => s + weighted(d), 0);
    // Best case = commit + weighted discovery upside.
    const discovery = open
      .filter(d => d.stage === 'discovery')
      .reduce((s, d) => s + weighted(d), 0);
    const bestCase = commit + discovery;
    return {
      commit,
      bestCase,
      pipeline: pipelineValue(),
      weighted: weightedForecast(),
    };
  }, [open]);

  // Six months of weighted forecast, bucketed by close month.
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 0; i < 6; i++) {
      const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({
        key: `${dt.getFullYear()}-${dt.getMonth()}`,
        label: dt.toLocaleDateString('en-US', { month: 'short' }),
        full: dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        value: 0,
        count: 0,
      });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const d of open) {
      const cd = new Date(d.closeDate);
      const k = `${cd.getFullYear()}-${cd.getMonth()}`;
      if (k in idx) {
        buckets[idx[k]].value += weighted(d);
        buckets[idx[k]].count += 1;
      }
    }
    return buckets;
  }, [open]);

  // Per-rep forecast with attainment.
  const reps = useMemo(() => {
    const board = Object.fromEntries(repLeaderboard().map(r => [r.user.id, r]));
    const openByOwner = {};
    for (const d of open) {
      openByOwner[d.ownerId] = (openByOwner[d.ownerId] || 0) + weighted(d);
    }
    return getUsers()
      .filter(u => u.role === 'rep')
      .map(u => {
        const b = board[u.id] || { won: 0, pipeline: 0 };
        const attainment = u.quota ? Math.round((b.won / u.quota) * 100) : 0;
        return {
          user: u,
          quota: u.quota,
          won: b.won,
          pipeline: b.pipeline,
          weighted: openByOwner[u.id] || 0,
          attainment,
        };
      })
      .sort((a, b) => b.attainment - a.attainment);
  }, [open]);

  const mixData = [
    { name: 'Commit', value: Math.round(kpis.commit), color: 'var(--accent)' },
    { name: 'Best case upside', value: Math.max(0, Math.round(kpis.bestCase - kpis.commit)), color: '#0ea5a3' },
    { name: 'Remaining pipeline', value: Math.max(0, Math.round(kpis.pipeline - kpis.weighted)), color: '#a99ff9' },
  ];

  const spark = (base) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      out.push(Math.round(base * (0.62 + 0.38 * t) * (1 + Math.sin(i * 1.5) * 0.04)));
    }
    out[7] = Math.round(base);
    return out;
  };

  const fmtAxis = (v) => moneyK(v);
  const tipStyle = {
    background: 'var(--paper)', border: '1px solid var(--line)',
    borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
    fontSize: '.9rem', padding: '.5rem .7rem',
  };

  return (
    <div className="fade-up">
      <SectionHeader
        title="Forecasting"
        sub="Commit, best case, and pipeline, straight off the deals."
      />

      {/* KPI rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.15rem' }}>
        <StatCard
          label="Commit" value={kpis.commit} format={moneyK}
          sub="negotiation + proposal, weighted"
          spark={spark(kpis.commit)}
          icon={<Icon name="check" size={18} />}
        />
        <StatCard
          label="Best case" value={kpis.bestCase} format={moneyK}
          trend={9} spark={spark(kpis.bestCase)}
          sparkColor="#0ea5a3" accent="#0ea5a3"
          icon={<Icon name="trendUp" size={18} />}
        />
        <StatCard
          label="Pipeline" value={kpis.pipeline} format={moneyK}
          sub={`${open.length} open deals`}
          spark={spark(kpis.pipeline)}
          icon={<Icon name="deals" size={18} />}
        />
        <StatCard
          label="Weighted forecast" value={kpis.weighted} format={moneyK}
          trend={6} spark={spark(kpis.weighted)}
          icon={<Icon name="target" size={18} />}
        />
      </div>

      {/* Forecast by month */}
      <Card className="card-pad" style={{ marginBottom: '1.15rem' }}>
        <div className="row between" style={{ marginBottom: '.35rem' }}>
          <div className="col gap-1">
            <div className="eyebrow">Weighted forecast</div>
            <h4 style={{ margin: 0 }}>Forecast by month</h4>
          </div>
          <Badge tone="accent">next 6 months</Badge>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly} margin={{ top: 18, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }}
              tick={{ fontSize: 13, fill: 'var(--n-600)' }} />
            <YAxis tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={54}
              tick={{ fontSize: 12, fill: 'var(--n-600)' }} />
            <Tooltip
              cursor={{ fill: 'rgba(91,75,245,.06)' }}
              contentStyle={tipStyle}
              labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
              formatter={(v, _n, p) => [money(v), `${p?.payload?.count || 0} deals`]}
            />
            <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1.15rem', alignItems: 'start' }}>
        {/* Rep forecast table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-pad" style={{ paddingBottom: '.9rem' }}>
            <div className="eyebrow">By rep</div>
            <h4 style={{ margin: '.2rem 0 0' }}>Rep forecast</h4>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th style={{ textAlign: 'right' }}>Quota</th>
                  <th style={{ textAlign: 'right' }}>Closed won</th>
                  <th style={{ textAlign: 'right' }}>Open pipeline</th>
                  <th style={{ textAlign: 'right' }}>Weighted</th>
                  <th style={{ width: 200 }}>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {reps.map(r => (
                  <tr key={r.user.id}>
                    <td>
                      <span className="row gap-2" style={{ minWidth: 0 }}>
                        <Avatar name={r.user.name} size={28} />
                        <span className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                          <span className="fw-6 clip">{r.user.name}</span>
                          <span className="t-xs muted clip">{r.user.title}</span>
                        </span>
                      </span>
                    </td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.quota)}</td>
                    <td className="tnum fw-6" style={{ textAlign: 'right' }}>{moneyK(r.won)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.pipeline)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(r.weighted)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Category mix donut */}
        <Card className="card-pad">
          <div className="eyebrow">Category mix</div>
          <h4 style={{ margin: '.2rem 0 1rem' }}>Where the number comes from</h4>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={mixData} dataKey="value" nameKey="name"
                innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none"
              >
                {mixData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} formatter={(v, n) => [money(v), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="col gap-2" style={{ marginTop: '.4rem' }}>
            {mixData.map(s => (
              <div key={s.name} className="row between">
                <span className="row gap-2">
                  <span className="dot" style={{ background: s.color }} />
                  <span className="t-sm fw-6">{s.name}</span>
                </span>
                <span className="tnum t-sm">{moneyK(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
