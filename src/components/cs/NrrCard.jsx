// NRR / GRR headline with a revenue-movement waterfall. The two ratios are
// the money metrics a CS org lives on; the waterfall shows exactly how the
// book moved from starting ARR to net ARR (expansion up, contraction + churn
// down). Built on recharts so bars animate and tooltip live.
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from 'recharts';
import { Card, moneyK } from '../UI.jsx';

const TIP_STYLE = {
  background: 'var(--paper)', border: '1px solid var(--line-strong)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  padding: '.55rem .7rem', fontSize: '.85rem',
};

function Ratio({ label, value, tone, sub }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'risk' ? 'var(--risk)' : 'var(--accent-600)';
  return (
    <div className="col gap-1" style={{ minWidth: 0 }}>
      <div className="stat-label">{label}</div>
      <div className="tnum fw-8" style={{ fontSize: 'clamp(2rem, 4vw, 2.7rem)', lineHeight: 1, color }}>{value}%</div>
      <div className="t-xs muted">{sub}</div>
    </div>
  );
}

export default function NrrCard({ summary }) {
  const { startingArr, expansion, contraction, churn, endingArr, nrr, grr } = summary;

  // Waterfall: floating bars. Each bar carries [base, top] via an invisible
  // spacer segment plus the visible delta segment.
  const steps = [
    { name: 'Starting', type: 'total', value: startingArr },
    { name: 'Expansion', type: 'up', value: expansion },
    { name: 'Contraction', type: 'down', value: -contraction },
    { name: 'Churn', type: 'down', value: -churn },
    { name: 'Net ARR', type: 'total', value: endingArr },
  ];
  let running = 0;
  const data = steps.map(s => {
    if (s.type === 'total') {
      running = s.value;
      return { ...s, base: 0, bar: s.value, disp: s.value };
    }
    const start = running;
    running = running + s.value;
    const base = Math.min(start, running);
    const bar = Math.abs(s.value);
    return { ...s, base, bar, disp: s.value };
  });
  const COLOR = { total: 'var(--accent)', up: 'var(--ok)', down: 'var(--risk)' };

  return (
    <Card className="col" style={{ gap: '1.15rem' }}>
      <div className="col gap-1">
        <h4 style={{ margin: 0 }}>Net revenue retention</h4>
        <div className="muted t-sm">How the book moved this period. Expansion lifts, contraction and churn drag.</div>
      </div>

      <div className="row gap-3 wrap" style={{ alignItems: 'flex-end' }}>
        <Ratio label="NRR" value={nrr} tone={nrr >= 100 ? 'ok' : 'risk'} sub="net incl. expansion" />
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
        <Ratio label="GRR" value={grr} tone={grr >= 90 ? 'ok' : 'risk'} sub="gross, churn only" />
        <div className="col gap-1" style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span className="t-xs muted">Net ARR</span>
          <span className="tnum fw-8" style={{ fontSize: '1.35rem' }}>{moneyK(endingArr)}</span>
        </div>
      </div>

      <div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--n-600)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={0} />
            <YAxis tickFormatter={moneyK} tick={{ fontSize: 11, fill: 'var(--n-600)' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip
              cursor={{ fill: 'rgba(91,75,245,.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div style={TIP_STYLE}>
                    <div className="fw-7" style={{ marginBottom: 3 }}>{p.name}</div>
                    <div className="tnum">{p.type === 'total' ? moneyK(p.value) : (p.disp >= 0 ? '+' : '-') + moneyK(Math.abs(p.disp))}</div>
                  </div>
                );
              }}
            />
            {/* invisible base lifts the floating bars to their start */}
            <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="bar" stackId="w" radius={[4, 4, 0, 0]} maxBarSize={54}>
              {data.map((d, i) => <Cell key={i} fill={COLOR[d.type]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="row gap-3 wrap t-xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--accent)' }} />ARR base</span>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--ok)' }} />Expansion {moneyK(expansion)}</span>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--risk)' }} />Contraction {moneyK(contraction)}</span>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--risk)' }} />Churn {moneyK(churn)}</span>
      </div>
    </Card>
  );
}
