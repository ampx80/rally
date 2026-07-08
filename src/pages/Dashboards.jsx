// Dashboards - live analytics off the Rally pipeline. Every number here is
// derived from the store's selectors, so it stays in sync with the book of
// business as deals move. Charts are real recharts, driven off live data.
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, LineChart, Line,
} from 'recharts';
import {
  useStore, OPEN_STAGES, dealsByStage, openDeals, pipelineValue, weightedForecast,
  winRate, repLeaderboard, activityLeaderboard, dealsClosingThisMonth, getDeals,
  getCompany, stageById,
} from '../lib/store';
import { Card, Stat, Badge, SectionHeader, money, moneyK, relTime } from '../components/UI';
import { Icon } from '../components/icons';

/* stage -> color (matches the shared palette) */
const STAGE_COLOR = {
  lead: '#8b93a4',
  qualified: '#2563a8',
  discovery: '#5b4bf5',
  proposal: '#b3721a',
  negotiation: '#0ea5a3',
  won: '#1a7f52',
  lost: '#c0392b',
};
const ACCENT = '#5b4bf5';
const GRID = '#e7e9ee';
const AXIS_TICK = { fontSize: 12, fill: '#5b6474' };

/* ---------- shared chart-card scaffold ---------- */
function ChartCard({ title, explainer, note, children }) {
  return (
    <Card className="col" style={{ gap: '1rem' }}>
      <div className="col gap-1" style={{ minWidth: 0 }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        {explainer && <div className="muted t-sm">{explainer}</div>}
      </div>
      <div>{children}</div>
      {note && <div className="t-xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>{note}</div>}
    </Card>
  );
}

/* ---------- shared tooltip look ---------- */
const TIP_STYLE = {
  background: 'var(--paper)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)',
  boxShadow: 'var(--shadow-md)',
  padding: '.6rem .75rem',
  fontSize: '.86rem',
};
function tipLabel(text) {
  return <div className="fw-7" style={{ marginBottom: 4 }}>{text}</div>;
}
function tipRow(label, value, color) {
  return (
    <div className="row between gap-2" style={{ minWidth: 150 }}>
      <span className="row gap-1" style={{ color: 'var(--n-600)' }}>
        {color && <span className="dot" style={{ background: color }} />}{label}
      </span>
      <span className="fw-7 tnum">{value}</span>
    </div>
  );
}

export default function Dashboards() {
  useStore(); // subscribe for reactivity
  const navigate = useNavigate();

  /* ---- KPI strip ---- */
  const pipeline = pipelineValue();
  const forecast = weightedForecast();
  const rate = winRate();
  const openCount = openDeals().length;

  /* ---- 1. Pipeline by stage ---- */
  const byStage = dealsByStage();
  const pipelineByStage = OPEN_STAGES.map(s => {
    const ds = byStage[s.id] || [];
    return { stage: s.name, id: s.id, value: ds.reduce((sum, d) => sum + d.value, 0), count: ds.length };
  });

  /* ---- 2. Weighted forecast by stage ---- */
  const weightedByStage = OPEN_STAGES.map(s => {
    const ds = byStage[s.id] || [];
    return { stage: s.name, id: s.id, value: ds.reduce((sum, d) => sum + d.value * (d.probability / 100), 0) };
  });

  /* ---- 3. Win rate donut ---- */
  const deals = getDeals();
  const wonCount = deals.filter(d => d.status === 'won').length;
  const lostCount = deals.filter(d => d.status === 'lost').length;
  const winData = [
    { name: 'Won', value: wonCount, color: '#1a7f52' },
    { name: 'Lost', value: lostCount, color: '#c0392b' },
  ];

  /* ---- 4. Rep leaderboard (closed won) ---- */
  const repRows = repLeaderboard().filter(r => r.won > 0);
  const repData = repRows.map(r => ({ name: r.user.name.split(' ')[0], won: r.won, full: r.user.name }));

  /* ---- 5. Activity leaderboard ---- */
  const actRows = activityLeaderboard();
  const actData = actRows.map(r => ({ name: r.user.name.split(' ')[0], done: r.done, open: r.open, full: r.user.name }));

  /* ---- 6. Deals closing this month ---- */
  const closing = dealsClosingThisMonth();

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        title="Dashboards"
        sub="Live off your pipeline. Every number here traces back to a record."
      />

      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Card>
          <Stat icon={<Icon name="chart" size={20} />} value={moneyK(pipeline)} label="Pipeline"
            sub={`${openCount} open deals`} />
        </Card>
        <Card>
          <Stat icon={<Icon name="target" size={20} />} value={moneyK(forecast)} label="Weighted forecast"
            sub="value x probability" />
        </Card>
        <Card>
          <Stat icon={<Icon name="activity" size={20} />} value={rate + '%'} label="Win rate"
            sub={`${wonCount} won / ${lostCount} lost`} />
        </Card>
        <Card>
          <Stat icon={<Icon name="dollar" size={20} />} value={openCount} label="Open deals"
            sub={money(pipeline) + ' in flight'} />
        </Card>
      </div>

      {/* Charts grid: 2 per row on wide, stack on narrow */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>

        {/* 1. Pipeline by stage */}
        <ChartCard
          title="Pipeline by stage"
          explainer="Total open deal value sitting in each stage right now."
          note="Bar height = sum of open deal values in that stage. Hover for deal count."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineByStage} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="stage" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
              <Tooltip
                cursor={{ fill: 'rgba(91,75,245,.06)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div style={TIP_STYLE}>
                      {tipLabel(p.stage)}
                      {tipRow('Value', moneyK(p.value), STAGE_COLOR[p.id])}
                      {tipRow('Deals', p.count)}
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={64}>
                {pipelineByStage.map((d) => <Cell key={d.id} fill={STAGE_COLOR[d.id]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Weighted forecast by stage */}
        <ChartCard
          title="Weighted forecast by stage"
          explainer="Each stage's value discounted by its win probability."
          note="Weighted = value x probability. Later stages convert more, so they carry more forecast per dollar."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weightedByStage} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="stage" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
              <Tooltip
                cursor={{ fill: 'rgba(91,75,245,.06)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div style={TIP_STYLE}>
                      {tipLabel(p.stage)}
                      {tipRow('Weighted', moneyK(p.value), ACCENT)}
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill={ACCENT} radius={[5, 5, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Win rate donut */}
        <ChartCard
          title="Win rate"
          explainer="Closed won versus closed lost across all deals."
          note="Win rate = won / (won + lost). Open deals are excluded until they close."
        >
          <div className="row gap-3 wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={240} minWidth={0} style={{ flex: '1 1 220px' }}>
              <PieChart>
                <Pie
                  data={winData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={62} outerRadius={92}
                  startAngle={90} endAngle={-270} paddingAngle={2} stroke="var(--paper)" strokeWidth={2}
                >
                  {winData.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={TIP_STYLE}>
                        {tipRow(p.name, p.value, p.color)}
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="col gap-2" style={{ flex: '0 0 auto', minWidth: 140 }}>
              <div>
                <div className="stat-value" style={{ color: ACCENT }}>{rate}%</div>
                <div className="stat-label">win rate</div>
              </div>
              <div className="col gap-1">
                <div className="row gap-1">
                  <span className="dot" style={{ background: '#1a7f52' }} />
                  <span className="fw-6">{wonCount}</span><span className="muted t-sm">won</span>
                </div>
                <div className="row gap-1">
                  <span className="dot" style={{ background: '#c0392b' }} />
                  <span className="fw-6">{lostCount}</span><span className="muted t-sm">lost</span>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* 4. Rep leaderboard (closed won) */}
        <ChartCard
          title="Rep leaderboard (closed won)"
          explainer="Total value each rep has closed and won."
          note="Sum of won deal value per owner. Click a bar to open that rep's closed pipeline is a next step."
        >
          <ResponsiveContainer width="100%" height={Math.max(220, repData.length * 46)}>
            <BarChart data={repData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
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
                      {tipLabel(p.full)}
                      {tipRow('Closed won', moneyK(p.won), ACCENT)}
                    </div>
                  );
                }}
              />
              <Bar dataKey="won" fill={ACCENT} radius={[0, 5, 5, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Activity leaderboard */}
        <ChartCard
          title="Activity leaderboard"
          explainer="Completed versus still-open activities per rep."
          note="Stacked bars: done (solid) + open (light). Notes are counted as done."
        >
          <ResponsiveContainer width="100%" height={Math.max(220, actData.length * 46)}>
            <BarChart data={actData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                cursor={{ fill: 'rgba(91,75,245,.06)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div style={TIP_STYLE}>
                      {tipLabel(p.full)}
                      {tipRow('Done', p.done, ACCENT)}
                      {tipRow('Open', p.open, '#d7dce3')}
                    </div>
                  );
                }}
              />
              <Bar dataKey="done" stackId="a" fill={ACCENT} maxBarSize={26} />
              <Bar dataKey="open" stackId="a" fill="#d7dce3" radius={[0, 5, 5, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Deals closing this month (list, not a chart) */}
        <ChartCard
          title="Deals closing this month"
          explainer="Open deals with a close date inside the current month."
          note="Sorted by close date, soonest first. Click a deal to open its record."
        >
          {closing.length === 0 ? (
            <div className="col center gap-1" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <Icon name="calendar" size={28} style={{ color: 'var(--n-400)' }} />
              <div className="fw-6">Nothing closing this month</div>
              <div className="muted t-sm">No open deals have a close date inside the current month.</div>
            </div>
          ) : (
            <div className="col" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {closing.map((d, i) => {
                const co = getCompany(d.companyId);
                const st = stageById(d.stage);
                return (
                  <Link
                    key={d.id}
                    to={`/deals/${d.id}`}
                    className="row between gap-2"
                    style={{
                      padding: '.7rem .1rem',
                      borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    <div className="col" style={{ minWidth: 0, gap: 2 }}>
                      <span className="fw-6 clip">{d.name}</span>
                      <span className="muted t-sm clip">{co ? co.name : 'No company'}</span>
                    </div>
                    <div className="row gap-2" style={{ flex: 'none' }}>
                      <Badge style={{ background: (STAGE_COLOR[d.stage] || ACCENT) + '1f', color: STAGE_COLOR[d.stage] || ACCENT }}>
                        {st ? st.name : d.stage}
                      </Badge>
                      <span className="fw-7 tnum" style={{ minWidth: 56, textAlign: 'right' }}>{moneyK(d.value)}</span>
                      <span className="muted t-sm" style={{ minWidth: 62, textAlign: 'right' }}>{relTime(d.closeDate)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
