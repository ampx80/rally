// ============================================================
// COMMAND CENTER  (the home page, /app)
// The revenue cockpit. A gradient greeting hero with a live Rook
// brief (the 3 moves that matter, count-up numbers), animated KPI
// tiles with sparklines + trend arrows, a pipeline pulse funnel, a
// live "Today" work queue with quick-complete, a team leaderboard,
// and recent wins + activity. First impression = category-defining.
// Motion lives in command-center.css, scoped to the .cc wrapper.
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useStore, getCurrentUser, getDeals, openDeals,
  pipelineValue, weightedForecast, winRate,
  dealsClosingThisMonth, slippingDeals, myDayQueue,
  dealsByStage, OPEN_STAGES, repLeaderboard, getActivities,
} from '../lib/store.js';
import { SectionHeader, moneyK } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import RookBrief from '../components/home/RookBrief.jsx';
import RookLive from '../components/home/RookLive.jsx';
import KpiTile from '../components/home/KpiTile.jsx';
import PipelinePulse from '../components/home/PipelinePulse.jsx';
import TodayPanel from '../components/home/TodayPanel.jsx';
import TeamLeaderboard from '../components/home/TeamLeaderboard.jsx';
import RecentWins from '../components/home/RecentWins.jsx';
import ActivityFeed from '../components/home/ActivityFeed.jsx';
import { STAGE_COLOR } from '../lib/stage-colors.js';
import './command-center.css';

// Decorative trend line for a KPI (the app's own modeled history off the seed).
function spark(seed, up = true) {
  const out = []; let v = 40 + (seed % 20);
  for (let i = 0; i < 12; i++) { v += (Math.sin(seed + i) * 6) + (up ? 2.2 : -1.4); out.push(Math.max(8, Math.round(v))); }
  return out;
}

export default function CommandCenter() {
  useStore(); // subscribe: any store mutation re-renders the cockpit
  const nav = useNavigate();
  const me = getCurrentUser();
  const first = (me?.name || 'there').split(' ')[0];
  const openRook = () => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } }));

  /* ---- live figures ---- */
  const pipeline = pipelineValue();
  const forecast = weightedForecast();
  const rate = winRate();
  const queue = myDayQueue();
  const closing = dealsClosingThisMonth();
  const slipping = slippingDeals();
  const open = openDeals();

  const now = new Date();
  const qtr = Math.floor(now.getMonth() / 3);
  const wonQuarter = getDeals().filter(d => {
    if (d.status !== 'won') return false;
    const dt = new Date(d.closeDate);
    return dt.getFullYear() === now.getFullYear() && Math.floor(dt.getMonth() / 3) === qtr;
  });
  const wonQuarterSum = wonQuarter.reduce((s, d) => s + d.value, 0);

  /* ---- Rook brief: the 3 moves that matter (with robust fallbacks) ---- */
  const marquee = [...closing].sort((a, b) => b.value - a.value)[0]
    || [...open].sort((a, b) => b.value - a.value)[0];
  const slipRisk = slipping.reduce((s, d) => s + d.value, 0);
  const moves = [
    marquee
      ? { key: 'close', icon: 'target', value: marquee.value, format: moneyK, label: `Advance ${marquee.name}`, to: `/deals/${marquee.id}` }
      : { key: 'close', icon: 'target', value: pipeline, format: moneyK, label: 'Open pipeline to work', to: '/deals' },
    slipping.length
      ? { key: 'slip', icon: 'clock', value: slipRisk, format: moneyK, label: `${slipping.length} deal${slipping.length === 1 ? '' : 's'} slipping, re-engage now`, to: '/deals' }
      : { key: 'forecast', icon: 'trendUp', value: forecast, format: moneyK, label: 'Weighted forecast on track', to: '/forecasting' },
    { key: 'today', icon: 'checkSquare', value: queue.length, format: (n) => String(Math.round(n)), label: queue.length ? `task${queue.length === 1 ? '' : 's'} due today` : 'tasks due, you are clear', to: '/activities' },
  ];

  /* ---- KPI tiles ---- */
  const kpis = [
    { key: 'pipe', label: 'Pipeline value', value: pipeline, format: moneyK, trend: 8, spark: spark(3), icon: <Icon name="target" size={18} />, accent: 'var(--accent)', to: '/deals' },
    { key: 'fcast', label: 'Weighted forecast', value: forecast, format: moneyK, trend: 5, spark: spark(7), icon: <Icon name="trendUp" size={18} />, accent: 'var(--info)', to: '/forecasting' },
    { key: 'wonq', label: 'Won this quarter', value: wonQuarterSum, format: moneyK, trend: 12, spark: spark(5, true), sparkColor: 'var(--ok)', icon: <Icon name="check" size={18} />, accent: 'var(--ok)', to: '/deals' },
    { key: 'winrate', label: 'Win rate', value: rate, format: (n) => `${Math.round(n)}%`, trend: 3, spark: spark(11), icon: <Icon name="pie" size={18} />, accent: 'var(--accent-300)', to: '/dashboards' },
  ];

  /* ---- pipeline pulse ---- */
  const byStage = dealsByStage();
  const pulseStages = OPEN_STAGES.map(s => {
    const list = byStage[s.id] || [];
    return { id: s.id, name: s.name, color: STAGE_COLOR[s.id], value: list.reduce((a, d) => a + d.value, 0), count: list.length };
  });

  /* ---- leaderboard + feeds ---- */
  const repRows = repLeaderboard().filter(r => r.won > 0 || r.pipeline > 0).slice(0, 5);
  const wins = getDeals()
    .filter(d => d.status === 'won')
    .sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate))
    .slice(0, 5);
  const recentActivity = getActivities()
    .filter(a => a.done)
    .sort((a, b) => new Date(b.dueAt || b.createdAt) - new Date(a.dueAt || a.createdAt))
    .slice(0, 6);

  return (
    <div className="cc page-in col gap-4" style={{ paddingBottom: '1rem' }}>
      {/* Hero + Rook brief */}
      <RookBrief name={first} moves={moves} onOpenRook={openRook} onMove={(m) => nav(m.to)} />

      {/* Rook Live - the agentic operator fleet, working the real book */}
      <RookLive />

      {/* KPI row */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {kpis.map((k, i) => {
          const { key, ...rest } = k;
          return <KpiTile key={key} {...rest} delay={i * 70} onClick={() => nav(k.to)} />;
        })}
      </div>

      {/* Pipeline pulse */}
      <div className="card card-pad cc-rise">
        <SectionHeader
          title="Pipeline pulse"
          sub="Open value by stage, live off the book"
          action={<Link to="/deals" className="link t-sm row gap-1">Open pipeline <Icon name="chevronRight" size={14} /></Link>}
        />
        <PipelinePulse stages={pulseStages} onOpen={() => nav('/deals')} />
      </div>

      {/* Today + team leaderboard */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <TodayPanel queue={queue} me={me} />
        <TeamLeaderboard
          rows={repRows}
          action={<Link to="/dashboards" className="link t-sm row gap-1">Dashboards <Icon name="chevronRight" size={14} /></Link>}
        />
      </div>

      {/* Recent wins + recent activity */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <RecentWins
          wins={wins}
          action={<Link to="/deals" className="link t-sm row gap-1">All deals <Icon name="chevronRight" size={14} /></Link>}
        />
        <ActivityFeed
          items={recentActivity}
          action={<Link to="/activities" className="link t-sm row gap-1">All activity <Icon name="chevronRight" size={14} /></Link>}
        />
      </div>

      {/* Ask Rook banner - the one deliberate violet surface on this page,
          so the AI affordance reads as a clear signal against the teal cockpit. */}
      <div className="row between gap-3 wrap" style={{ borderRadius: 'var(--r-lg)', padding: '1.6rem 1.75rem', color: '#fff', background: 'linear-gradient(120deg, var(--ai-600), var(--ai) 55%, #9b87fb)', boxShadow: 'var(--ai-glow)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="sparkles" size={22} fill="currentColor" stroke={0} />
            <span style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-.02em' }}>Let Rook do the work</span>
          </div>
          <span style={{ opacity: .92, maxWidth: 620 }}>Ask a question, build an entire account, or draft an email. Rook is docked bottom-right and knows your pipeline cold.</span>
        </div>
        <button onClick={openRook} className="btn" style={{ flex: 'none', background: '#fff', color: 'var(--ai-600)', fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>
          <Icon name="zap" size={17} fill="currentColor" stroke={0} /> Open Rook
        </button>
      </div>
    </div>
  );
}
