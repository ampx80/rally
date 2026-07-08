// Reports - the answers layer on top of the Rally pipeline. A featured
// "Sales velocity" report computes live off the store's selectors, and a
// report library gallery gives one-click access to every standard revenue
// report. Every preview is driven off real, plausible shapes so the surface
// feels like a shipping product, not a mockup.
import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  useStore, repLeaderboard, activityLeaderboard, pipelineValue, weightedForecast,
  winRate, openDeals, getDeals, getUsers,
} from '../lib/store';
import {
  Card, Button, Badge, SectionHeader, StatCard, Sparkline, MiniBars,
  useToast, money, moneyK,
} from '../components/UI';
import { Icon } from '../components/icons';

const ACCENT = '#5b4bf5';
const GRID = '#e7e9ee';
const AXIS_TICK = { fontSize: 12, fill: '#5b6474' };
const TIP_STYLE = {
  background: 'var(--paper)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  padding: '.6rem .75rem', fontSize: '.86rem',
};

/* Deterministic-ish plausible preview series so each report card reads as a
   real trend without pretending to be live data. Kept small + shapely. */
const PREVIEWS = {
  'Pipeline coverage': [2.1, 2.4, 2.2, 2.8, 3.1, 2.9, 3.4],
  'Win/loss analysis': [12, 9, 14, 11, 16, 13, 18],
  'Rep attainment': [61, 68, 72, 70, 78, 83, 88],
  'Lead source ROI': [3.2, 4.1, 3.8, 5.2, 4.9, 6.1, 6.8],
  'Sales cycle': [58, 54, 55, 49, 47, 44, 41],
  'Activity volume': [120, 142, 118, 165, 158, 190, 205],
  'AR aging': [88, 76, 64, 52, 40, 33, 28],
  'Campaign ROI': [1.8, 2.4, 2.1, 3.0, 3.6, 3.3, 4.2],
  'Forecast accuracy': [82, 79, 85, 88, 86, 91, 93],
};

const LIBRARY = [
  { title: 'Pipeline coverage', icon: 'target', desc: 'Open pipeline against quota, by rep and stage.', kind: 'spark' },
  { title: 'Win/loss analysis', icon: 'pie', desc: 'Why deals close - won versus lost, by reason.', kind: 'bars' },
  { title: 'Rep attainment', icon: 'users', desc: 'Each rep against quota, ranked by attainment.', kind: 'spark' },
  { title: 'Lead source ROI', icon: 'sparkles', desc: 'Revenue returned per dollar, by acquisition source.', kind: 'spark' },
  { title: 'Sales cycle', icon: 'chart', desc: 'Average days from created to closed, trending down.', kind: 'spark' },
  { title: 'Activity volume', icon: 'bolt', desc: 'Calls, emails and meetings logged across the team.', kind: 'bars' },
  { title: 'AR aging', icon: 'sliders', desc: 'Outstanding receivables bucketed by days past due.', kind: 'bars' },
  { title: 'Campaign ROI', icon: 'trendUp', desc: 'Pipeline and revenue sourced by each campaign.', kind: 'spark' },
  { title: 'Forecast accuracy', icon: 'check', desc: 'Committed forecast versus actual, period over period.', kind: 'spark' },
];

export default function Reports() {
  useStore(); // subscribe for reactivity
  const toast = useToast();

  /* ---- featured "Sales velocity" report, computed live ---- */
  const open = openDeals();
  const avgDeal = open.length ? open.reduce((s, d) => s + d.value, 0) / open.length : 0;
  const rate = winRate();
  const forecast = weightedForecast();
  const openCount = open.length;
  const pipeline = pipelineValue();

  /* pipeline by rep, from the leaderboard */
  const repRows = repLeaderboard().filter(r => r.pipeline > 0);
  const repData = repRows
    .map(r => ({ name: r.user.name.split(' ')[0], pipeline: r.pipeline, full: r.user.name, count: r.count }))
    .sort((a, b) => b.pipeline - a.pipeline);

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        title="Reports"
        sub="Answers, on demand."
        action={<Button variant="ghost" size="sm"><Icon name="download" size={16} /> Export all</Button>}
      />

      {/* ---------- FEATURED: Sales velocity ---------- */}
      <Card className="col" style={{ gap: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: ACCENT, opacity: .06, filter: 'blur(12px)' }} />
        <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: ACCENT + '18', color: ACCENT, flex: 'none' }}>
                <Icon name="bolt" size={17} />
              </span>
              <h4 style={{ margin: 0 }}>Sales velocity</h4>
              <Badge tone="accent">Featured</Badge>
            </div>
            <div className="muted t-sm">The health of pipeline in motion - deal size, conversion, and weighted value in one view.</div>
          </div>
          <Button size="sm" onClick={() => toast('Report generated')} style={{ flex: 'none' }}>
            <Icon name="sparkles" size={16} /> Run report
          </Button>
        </div>

        {/* 4 live StatCards */}
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <StatCard label="Avg deal size" value={avgDeal} format={moneyK} icon={<Icon name="target" size={18} />} sub="mean open deal value" />
          <StatCard label="Win rate" value={rate} format={(v) => Math.round(v) + '%'} icon={<Icon name="check" size={18} />} sub="won / (won + lost)" />
          <StatCard label="Weighted pipeline" value={forecast} format={moneyK} icon={<Icon name="trendUp" size={18} />} sub="value x probability" />
          <StatCard label="Open deals" value={openCount} icon={<Icon name="chart" size={18} />} sub={money(pipeline) + ' in flight'} />
        </div>

        {/* pipeline by rep */}
        <div className="col gap-1">
          <div className="row between">
            <span className="fw-7">Pipeline by rep</span>
            <span className="muted t-sm">open value each rep is carrying</span>
          </div>
          {repData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, repData.length * 46)}>
              <BarChart data={repData} layout="vertical" margin={{ top: 6, right: 18, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
                <Tooltip
                  cursor={{ fill: 'rgba(91,75,245,.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={TIP_STYLE}>
                        <div className="fw-7" style={{ marginBottom: 4 }}>{p.full}</div>
                        <div className="row between gap-2" style={{ minWidth: 150 }}>
                          <span className="row gap-1" style={{ color: 'var(--n-600)' }}><span className="dot" style={{ background: ACCENT }} />Pipeline</span>
                          <span className="fw-7 tnum">{moneyK(p.pipeline)}</span>
                        </div>
                        <div className="row between gap-2" style={{ minWidth: 150 }}>
                          <span style={{ color: 'var(--n-600)' }}>Open deals</span>
                          <span className="fw-7 tnum">{p.count}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pipeline" fill={ACCENT} radius={[0, 5, 5, 0]} maxBarSize={26}>
                  {repData.map((d, i) => <Cell key={d.name} fillOpacity={1 - i * 0.09} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="muted t-sm" style={{ padding: '1.5rem 0' }}>No open pipeline to chart yet.</div>
          )}
        </div>
      </Card>

      {/* ---------- Report library ---------- */}
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Report library</h4>
            <div className="muted t-sm">Standard revenue reports, ready to run.</div>
          </div>
          <Badge tone="default">{LIBRARY.length} reports</Badge>
        </div>

        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {LIBRARY.map((r) => {
            const series = PREVIEWS[r.title] || [];
            return (
              <Card key={r.title} hover className="col" style={{ gap: '.85rem', justifyContent: 'space-between' }}>
                <div className="col gap-2">
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: ACCENT + '14', color: ACCENT, flex: 'none' }}>
                      <Icon name={r.icon} size={18} />
                    </span>
                    <div style={{ opacity: .9 }}>
                      {r.kind === 'bars'
                        ? <MiniBars data={series} w={92} h={34} />
                        : <Sparkline data={series} w={92} h={34} />}
                    </div>
                  </div>
                  <div className="col gap-1" style={{ minWidth: 0 }}>
                    <span className="fw-7" style={{ fontSize: '1.02rem' }}>{r.title}</span>
                    <span className="muted t-sm">{r.desc}</span>
                  </div>
                </div>
                <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
                  <span className="t-xs muted">Standard</span>
                  <Button variant="ghost" size="sm" onClick={() => toast('Report generated')}>
                    Run report <Icon name="chevronRight" size={15} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
