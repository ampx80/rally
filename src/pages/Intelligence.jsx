// Intelligence - Rally's Revenue Intelligence surface. The screen a CRO opens
// every morning: forecast confidence, the ranked "moves that matter", deal
// risk scored and explained, anomalies the numbers are hiding, an operator
// leaderboard, win/loss patterns, and whitespace to grow into. Every figure is
// a pure derivation off the live book (src/lib/intelligence-data.js), so it
// stays true as deals move. Rivals Clari / Gong / InsightSquared, minus the
// bolt-on feel - it is native to the same store the pipeline runs on.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  useStore,
} from '../lib/store.js';
import {
  Card, SectionHeader, StatCard, Badge, Button, Tabs, AnimatedNumber, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  intelSummary, nextBestActions, winLossPatterns,
} from '../lib/intelligence-data.js';
import ForecastConfidence from '../components/intel/ForecastConfidence.jsx';
import RiskList from '../components/intel/RiskList.jsx';
import RepLeaderboard from '../components/intel/RepLeaderboard.jsx';
import AnomalyFeed from '../components/intel/AnomalyFeed.jsx';
import WhitespaceGrid from '../components/intel/WhitespaceGrid.jsx';
import '../components/intel/intel.css';

const GRID = '#e7e9ee';
const TIP_STYLE = {
  background: 'var(--paper)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)', padding: '.6rem .75rem', fontSize: '.86rem',
};
const TONE_COLOR = { ok: 'var(--ok)', accent: 'var(--accent)', warn: 'var(--warn)', risk: 'var(--risk)' };

function askRook(prompt) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } }));
}

/* ---------- Moves that matter ---------- */
function MovesThatMatter() {
  const navigate = useNavigate();
  const moves = useMemo(() => nextBestActions(7), []);
  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Prioritized"
        title="Moves that matter"
        sub="Every risk and opportunity ranked into one worklist by dollar impact. Start at the top."
        action={<Button variant="ghost" size="sm" onClick={() => askRook('What should I work on first today and why?')}><Icon name="sparkles" size={14} /> Ask Rook</Button>}
      />
      {moves.length === 0 ? (
        <div className="col center gap-2" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <Icon name="check" size={26} style={{ color: 'var(--ok)' }} />
          <div className="fw-6">Inbox zero on risk</div>
          <div className="muted t-sm">No high-impact moves outstanding. The book is in good shape.</div>
        </div>
      ) : (
        <div className="col gap-2">
          {moves.map((m, i) => (
            <button key={m.id} className="intel-move" onClick={() => navigate(m.to)}>
              <span className="intel-move__rank">{i + 1}</span>
              <span className="intel-move__ic" style={{ background: m.tint + '1a', color: m.tint }}>
                <Icon name={m.icon} size={17} />
              </span>
              <span className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                <span className="row gap-1" style={{ minWidth: 0 }}>
                  <span className="fw-7 clip">{m.title}</span>
                  <Badge className="t-xs" style={{ flex: 'none', background: m.tint + '1a', color: m.tint }}>{m.kind}</Badge>
                </span>
                <span className="t-sm muted clip">{m.reason}</span>
                <span className="t-xs muted">{m.meta}</span>
              </span>
              <span className="col" style={{ flex: 'none', textAlign: 'right', lineHeight: 1.2 }}>
                <span className="fw-8 tnum" style={{ color: m.tint }}>{m.impactLabel.split(' ')[0]}</span>
                <span className="t-xs muted">{m.impactLabel.split(' ').slice(1).join(' ')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Win / loss patterns ---------- */
function WinLossPatterns() {
  const p = useMemo(() => winLossPatterns(), []);
  const stats = [
    { label: 'Win rate', value: p.winRate + '%', sub: `${p.wonCount} won / ${p.lostCount} lost`, color: 'var(--accent)' },
    { label: 'Avg won deal', value: moneyK(p.avgWon), sub: p.sizeEdge ? `${p.sizeEdge > 0 ? '+' : ''}${p.sizeEdge}% vs lost` : 'won deal size', color: 'var(--ok)' },
    { label: 'Avg sales cycle', value: p.avgCycle + 'd', sub: 'create to close (won)', color: 'var(--info)' },
  ];
  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Patterns"
        title="Win / loss intelligence"
        sub="What the closed book teaches. Where you win, how big, and how fast."
      />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '.7rem' }}>
        {stats.map(s => (
          <div key={s.label} className="panel" style={{ padding: '.85rem 1rem' }}>
            <div className="stat-label">{s.label}</div>
            <div className="fw-8" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div className="t-xs muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {p.industries.length > 0 && (
        <div className="col gap-2">
          <div className="t-sm fw-6">Win rate by industry</div>
          <ResponsiveContainer width="100%" height={Math.max(180, p.industries.length * 42)}>
            <BarChart data={p.industries} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => v + '%'} tick={{ fontSize: 12, fill: 'var(--n-600)' }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis type="category" dataKey="industry" width={110} tick={{ fontSize: 12, fill: 'var(--n-600)' }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(91,75,245,.06)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={TIP_STYLE}>
                      <div className="fw-7" style={{ marginBottom: 4 }}>{d.industry}</div>
                      <div className="t-sm">{d.rate}% win rate</div>
                      <div className="t-sm muted">{d.won} won / {d.lost} lost</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="rate" radius={[0, 5, 5, 0]} maxBarSize={24}>
                {p.industries.map((d, i) => (
                  <Cell key={i} fill={d.rate >= 60 ? 'var(--ok)' : d.rate >= 40 ? 'var(--accent)' : 'var(--warn)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {p.bestIndustry && p.worstIndustry && p.bestIndustry !== p.worstIndustry && (
        <div className="intel-reason" data-tone="low">
          <span className="intel-bul" />
          <span className="t-sm">
            You convert <span className="fw-7">{p.bestIndustry.industry}</span> at {p.bestIndustry.rate}% but only <span className="fw-7">{p.worstIndustry.industry}</span> at {p.worstIndustry.rate}%. Lean pipeline toward what you win.
          </span>
        </div>
      )}
    </Card>
  );
}

/* ---------- Hero summary strip ---------- */
function HeroStrip() {
  const s = useMemo(() => intelSummary(), []);
  const cards = [
    { label: 'Open pipeline', value: s.openValue, format: moneyK, sub: `${s.openCount} deals in flight`, accent: 'var(--accent)', icon: 'deals' },
    { label: 'At-risk value', value: s.atRiskValue, format: moneyK, sub: `${s.atRiskCount} high-risk deals`, accent: 'var(--risk)', icon: 'shield' },
    { label: 'Forecast confidence', value: s.confidence, format: (n) => Math.round(n) + '%', sub: s.confidenceLabel, accent: TONE_COLOR[s.confidenceTone] || 'var(--accent)', icon: 'target' },
    { label: 'Healthy pipeline', value: s.healthyShare, format: (n) => Math.round(n) + '%', sub: 'of open value low-risk', accent: 'var(--ok)', icon: 'activity' },
  ];
  return (
    <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
      {cards.map(c => (
        <StatCard
          key={c.label}
          label={c.label}
          value={c.value}
          format={c.format}
          sub={c.sub}
          accent={c.accent}
          icon={<Icon name={c.icon} size={18} />}
        />
      ))}
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'risk', label: 'Deal risk' },
  { key: 'team', label: 'Team + win/loss' },
  { key: 'growth', label: 'Growth' },
];

export default function Intelligence() {
  useStore(); // re-derive on any store mutation
  const [tab, setTab] = useState('overview');

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        eyebrow="Revenue intelligence"
        title="Intelligence"
        sub="The analytics surface a revenue leader checks daily. Risk, forecast, and the moves that matter, live off your book."
        action={
          <div className="row gap-2">
            <Badge tone="accent"><span className="dot" style={{ background: 'var(--accent)' }} /> Live</Badge>
            <Button variant="primary" size="sm" onClick={() => askRook('Give me the state of the quarter: what is at risk and what should I do first?')}>
              <Icon name="sparkles" size={15} /> Brief me
            </Button>
          </div>
        }
      />

      <HeroStrip />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="col gap-3">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.15fr) minmax(300px,1fr)', gap: '1.15rem', alignItems: 'start' }}>
            <MovesThatMatter />
            <ForecastConfidence />
          </div>
          <AnomalyFeed />
        </div>
      )}

      {tab === 'risk' && (
        <div className="col gap-3">
          <RiskList />
          <AnomalyFeed />
        </div>
      )}

      {tab === 'team' && (
        <div className="col gap-3">
          <RepLeaderboard />
          <WinLossPatterns />
        </div>
      )}

      {tab === 'growth' && (
        <div className="col gap-3">
          <WhitespaceGrid />
          <MovesThatMatter />
        </div>
      )}
    </div>
  );
}
