// Dashboards - live analytics off the Ardovo pipeline. Every number here is
// derived from the store's selectors, so it stays in sync with the book of
// business as deals move. Charts are real recharts, driven off live data.
import React, { useState, useEffect } from 'react';
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
import { Card, Badge, SectionHeader, Tabs, Button, Select, Field, Input, Modal, useToast, money, moneyK, relTime } from '../components/UI';
import { STAGE_COLOR, CHART_ACCENT, CHART_ACCENT_SOFT, CHART_NEUTRAL, CHART_GRID } from '../lib/stage-colors';
import { Icon } from '../components/icons';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import AnimatedStat from '../components/motion/AnimatedStat';
import EmptyState from '../components/motion/EmptyState';
import { SkeletonChart } from '../components/motion/Skeleton';
import { useInView } from '../components/motion/useInView';
import VizPreview from '../components/reports2/VizPreview';
import {
  allReports, allDashboards, subscribeDashboards, saveDashboard, deleteDashboard,
  runReport, reconcileDefinition,
} from '../lib/report-builder';
import '../components/reports2/reports2.css';

/* stage -> color + chart accents come from the shared palette
   (src/lib/stage-colors.js) so every surface stays in sync and teal. */
const ACCENT = CHART_ACCENT;
const GRID = CHART_GRID;
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

/* ---------- draw-on-view chart mount ----------
   Holds a shimmer placeholder until the chart scrolls into view, then mounts
   the real recharts so its own draw-in animation fires exactly when seen. */
function InViewChart({ height = 300, children }) {
  const [ref, seen] = useInView({ once: true });
  return <div ref={ref}>{seen ? children : <SkeletonChart height={height} />}</div>;
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

function OverviewTab() {
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
    { name: 'Won', value: wonCount, color: STAGE_COLOR.won },
    { name: 'Lost', value: lostCount, color: STAGE_COLOR.lost },
  ];

  /* ---- 4. Rep leaderboard (closed won) ---- */
  const repRows = repLeaderboard().filter(r => r.won > 0);
  const repData = repRows.map(r => ({ name: r.user.name.split(' ')[0], won: r.won, full: r.user.name }));

  /* ---- 5. Activity leaderboard ---- */
  const actRows = activityLeaderboard();
  const actData = actRows.map(r => ({ name: r.user.name.split(' ')[0], done: r.done, open: r.open, full: r.user.name }));

  /* ---- 6. Deals closing this month ---- */
  const closing = dealsClosingThisMonth();

  /* ---- KPI spark series, all off real pipeline data ---- */
  const pipelineSpark = pipelineByStage.map(d => d.value);
  const forecastSpark = weightedByStage.map(d => d.value);
  const openSpark = pipelineByStage.map(d => d.count);

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Pipeline overview"
        sub="Live off your pipeline. Every number here traces back to a record."
      />

      {/* KPI strip - each tile counts up + draws its sparkline when seen */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <AnimatedStat icon={<Icon name="chart" size={20} />} value={pipeline} format={moneyK}
          label="Pipeline" sub={`${openCount} open deals`} spark={pipelineSpark} />
        <AnimatedStat icon={<Icon name="target" size={20} />} value={forecast} format={moneyK}
          label="Weighted forecast" sub="value x probability" spark={forecastSpark} sparkColor="#0ea5a3" />
        <AnimatedStat icon={<Icon name="activity" size={20} />} value={rate} format={(v) => v + '%'}
          label="Win rate" sub={`${wonCount} won / ${lostCount} lost`} />
        <AnimatedStat icon={<Icon name="dollar" size={20} />} value={openCount}
          label="Open deals" sub={money(pipeline) + ' in flight'} spark={openSpark} sparkColor="#e0752d" />
      </div>

      {/* Charts grid: 2 per row on wide, stack on narrow */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>

        {/* 1. Pipeline by stage */}
        <Reveal>
        <ChartCard
          title="Pipeline by stage"
          explainer="Total open deal value sitting in each stage right now."
          note="Bar height = sum of open deal values in that stage. Hover for deal count."
        >
          <InViewChart height={300}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineByStage} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="stage" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
              <Tooltip
                cursor={{ fill: CHART_ACCENT_SOFT }}
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
          </InViewChart>
        </ChartCard>
        </Reveal>

        {/* 2. Weighted forecast by stage */}
        <Reveal delay={60}>
        <ChartCard
          title="Weighted forecast by stage"
          explainer="Each stage's value discounted by its win probability."
          note="Weighted = value x probability. Later stages convert more, so they carry more forecast per dollar."
        >
          <InViewChart height={300}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weightedByStage} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="stage" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={false} width={54} />
              <Tooltip
                cursor={{ fill: CHART_ACCENT_SOFT }}
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
          </InViewChart>
        </ChartCard>
        </Reveal>

        {/* 3. Win rate donut */}
        <Reveal delay={120}>
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
                  <span className="dot" style={{ background: STAGE_COLOR.won }} />
                  <span className="fw-6">{wonCount}</span><span className="muted t-sm">won</span>
                </div>
                <div className="row gap-1">
                  <span className="dot" style={{ background: STAGE_COLOR.lost }} />
                  <span className="fw-6">{lostCount}</span><span className="muted t-sm">lost</span>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
        </Reveal>

        {/* 4. Rep leaderboard (closed won) */}
        <Reveal>
        <ChartCard
          title="Rep leaderboard (closed won)"
          explainer="Total value each rep has closed and won."
          note="Sum of won deal value per owner. Click a bar to open that rep's closed pipeline is a next step."
        >
          <InViewChart height={Math.max(220, repData.length * 46)}>
          <ResponsiveContainer width="100%" height={Math.max(220, repData.length * 46)}>
            <BarChart data={repData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={moneyK} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                cursor={{ fill: CHART_ACCENT_SOFT }}
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
          </InViewChart>
        </ChartCard>
        </Reveal>

        {/* 5. Activity leaderboard */}
        <Reveal delay={60}>
        <ChartCard
          title="Activity leaderboard"
          explainer="Completed versus still-open activities per rep."
          note="Stacked bars: done (solid) + open (light). Notes are counted as done."
        >
          <InViewChart height={Math.max(220, actData.length * 46)}>
          <ResponsiveContainer width="100%" height={Math.max(220, actData.length * 46)}>
            <BarChart data={actData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                cursor={{ fill: CHART_ACCENT_SOFT }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div style={TIP_STYLE}>
                      {tipLabel(p.full)}
                      {tipRow('Done', p.done, ACCENT)}
                      {tipRow('Open', p.open, CHART_NEUTRAL)}
                    </div>
                  );
                }}
              />
              <Bar dataKey="done" stackId="a" fill={ACCENT} maxBarSize={26} />
              <Bar dataKey="open" stackId="a" fill={CHART_NEUTRAL} radius={[0, 5, 5, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
          </InViewChart>
        </ChartCard>
        </Reveal>

        {/* 6. Deals closing this month (list, not a chart) */}
        <Reveal delay={120}>
        <ChartCard
          title="Deals closing this month"
          explainer="Open deals with a close date inside the current month."
          note="Sorted by close date, soonest first. Click a deal to open its record."
        >
          {closing.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing closing this month"
              body="No open deals have a close date inside the current month. As deals get a close date this month, they will show up here."
            />
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
        </Reveal>
      </div>
    </div>
  );
}

/* ============================================================
   COMPOSER TAB - dashboards composed from saved report tiles
   Each tile references a saved report by id and re-runs it live off the
   store, so a dashboard is always current. Add tiles from the report
   library, resize half/full, remove, and manage multiple dashboards.
   ============================================================ */
function resolveReportDef(reportId) {
  const r = allReports().find(x => x.id === reportId);
  return r ? reconcileDefinition(r) : null;
}

function DashboardTile({ tile, onRemove, onResize }) {
  const def = resolveReportDef(tile.reportId);
  if (!def) {
    return (
      <Card className={'rb-dash-tile col gap-2' + (tile.size === 'full' ? ' rb-tile-full' : '')} style={{ gap: '.6rem' }}>
        <div className="row between">
          <span className="fw-7">Missing report</span>
          <Button variant="quiet" size="sm" onClick={onRemove} aria-label="Remove tile"><Icon name="trash" size={15} /></Button>
        </div>
        <div className="muted t-sm">This report was deleted. Remove the tile or add a new one.</div>
      </Card>
    );
  }
  const computed = runReport(def);
  return (
    <Card className={'rb-dash-tile col' + (tile.size === 'full' ? ' rb-tile-full' : '')} style={{ gap: '.75rem' }}>
      <div className="row between gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="fw-7 clip">{def.title}</span>
          <span className="muted t-xs">{computed.measureLabel} by {String(computed.dimLabel).toLowerCase()}</span>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="quiet" size="sm" onClick={onResize} title={tile.size === 'full' ? 'Make half width' : 'Make full width'}>
            <Icon name="grid" size={14} />
          </Button>
          <Button as={Link} to={`/report-builder?load=${def.id}`} variant="quiet" size="sm" title="Open in builder"><Icon name="edit" size={14} /></Button>
          <Button variant="quiet" size="sm" onClick={onRemove} title="Remove"><Icon name="trash" size={14} /></Button>
        </div>
      </div>
      <div style={{ minHeight: 200 }}>
        <VizPreview def={def} computed={computed} height={tile.size === 'full' ? 300 : 230} />
      </div>
    </Card>
  );
}

function AddTileModal({ open, onClose, onPick, existingIds }) {
  const reports = allReports();
  return (
    <Modal open={open} onClose={onClose} title="Add a report tile" width={640}>
      <div className="col gap-2">
        <div className="muted t-sm">Pick a saved report or starter to pin as a live tile.</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.75rem' }}>
          {reports.map(r => {
            const on = existingIds.includes(r.id);
            return (
              <Card key={r.id} hover={!on} className="col" style={{ gap: '.5rem', cursor: on ? 'default' : 'pointer', opacity: on ? .55 : 1 }}
                onClick={() => { if (!on) { onPick(r.id); onClose(); } }}>
                <div className="row between">
                  <span className="fw-7 clip">{r.title}</span>
                  {on ? <Badge>Added</Badge> : (r.starter ? <Badge>Starter</Badge> : <Badge tone="accent">Saved</Badge>)}
                </div>
                <span className="muted t-xs" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.desc || `${r.source} report`}</span>
              </Card>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function ComposerTab() {
  useStore(); // re-run tiles when the book of business changes
  const toast = useToast();
  const [dashboards, setDashboards] = useState(() => allDashboards());
  const [activeId, setActiveId] = useState(() => allDashboards()[0]?.id || null);
  const [addOpen, setAddOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => subscribeDashboards((list) => setDashboards(list.length ? list : allDashboards())), []);
  useEffect(() => { if (!dashboards.some(d => d.id === activeId)) setActiveId(dashboards[0]?.id || null); }, [dashboards, activeId]);

  const active = dashboards.find(d => d.id === activeId) || dashboards[0] || null;

  const createDashboard = () => {
    const d = saveDashboard({ title: `Dashboard ${dashboards.length + 1}`, tiles: [] });
    setActiveId(d.id);
    toast('Dashboard created');
  };
  const doRename = () => {
    if (!active) return;
    saveDashboard({ ...active, title: draftTitle.trim() || active.title });
    setRenaming(false);
    toast('Renamed');
  };
  const addTile = (reportId) => {
    if (!active) return;
    saveDashboard({ ...active, tiles: [...(active.tiles || []), { id: `tile_${Date.now().toString(36)}`, reportId, size: 'half' }] });
    toast('Tile added');
  };

  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2">
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <Select value={activeId || ''} onChange={e => setActiveId(e.target.value)} style={{ maxWidth: 260 }}>
            {dashboards.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
          <Button variant="ghost" size="sm" onClick={createDashboard}><Icon name="plus" size={15} /> New dashboard</Button>
          {active && (
            <>
              <Button variant="quiet" size="sm" onClick={() => { setDraftTitle(active.title); setRenaming(true); }}><Icon name="edit" size={14} /> Rename</Button>
              {!active.starter && dashboards.length > 1 && (
                <Button variant="quiet" size="sm" onClick={() => { if (confirm('Delete this dashboard?')) { deleteDashboard(active.id); toast('Dashboard deleted'); } }}><Icon name="trash" size={14} /> Delete</Button>
              )}
            </>
          )}
        </div>
        <div className="row gap-1">
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Icon name="fileText" size={15} /> Print / PDF</Button>
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={!active}><Icon name="plus" size={16} /> Add tile</Button>
        </div>
      </div>

      {active && active.desc && <div className="muted t-sm">{active.desc}</div>}

      {!active || (active.tiles || []).length === 0 ? (
        <EmptyState icon="chart" title="An empty canvas"
          body="Add report tiles to compose a dashboard. Every tile stays live off your pipeline."
          action={<Button onClick={() => setAddOpen(true)} disabled={!active}><Icon name="plus" size={16} /> Add your first tile</Button>} />
      ) : (
        <div className="rb-dash-grid">
          {(active.tiles || []).map(tile => (
            <DashboardTile key={tile.id} tile={tile}
              onRemove={() => saveDashboard({ ...active, tiles: active.tiles.filter(t => t.id !== tile.id) })}
              onResize={() => saveDashboard({ ...active, tiles: active.tiles.map(t => t.id === tile.id ? { ...t, size: t.size === 'full' ? 'half' : 'full' } : t) })} />
          ))}
        </div>
      )}

      <AddTileModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addTile} existingIds={(active?.tiles || []).map(t => t.reportId)} />
      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename dashboard" width={440}
        footer={<><Button variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button><Button onClick={doRename}><Icon name="check" size={16} /> Save</Button></>}>
        <Field label="Dashboard name"><Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} autoFocus /></Field>
      </Modal>
    </div>
  );
}

export default function Dashboards() {
  const [tab, setTab] = useState('overview');
  return (
    <PageTransition className="col gap-3">
      <SectionHeader
        title="Dashboards"
        sub="A live pipeline overview, plus custom dashboards you compose from saved reports."
        action={<Button as={Link} to="/report-builder" variant="ghost"><Icon name="pie" size={16} /> Build a report</Button>}
      />
      <Tabs tabs={[{ key: 'overview', label: 'Overview' }, { key: 'custom', label: 'My dashboards' }]} active={tab} onChange={setTab} />
      {tab === 'overview' ? <OverviewTab /> : <ComposerTab />}
    </PageTransition>
  );
}
