// Quota + attainment roll-up. A hero team number (won vs quota, gap,
// pace) plus a grouped bar chart of quota vs closed-won per territory.
import React from 'react';
import { Card, Badge, ProgressBar, AnimatedNumber, money, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts';
import './terr.css';

const GRID = '#e7e9ee';
const tipStyle = {
  background: 'var(--paper)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-md)',
  fontSize: '.9rem', padding: '.5rem .7rem',
};

export default function QuotaAttainment({ model }) {
  const { totals, range } = model;
  const attain = totals.teamAttainment;
  const gap = totals.teamQuota - totals.teamWon;
  const expectedPct = Math.round(range.elapsedFrac * 100);
  const onTrack = attain >= expectedPct - 5;

  const data = model.territories.map(t => ({
    name: t.name.replace(' Enterprise', ' Ent').replace(' Commercial', ' Comm').replace(' Mid-Market', ' MM'),
    quota: t.quota, won: t.won,
    color: t.attainment >= 100 ? 'var(--ok)' : t.attainment >= 60 ? 'var(--accent)' : 'var(--warn)',
  }));

  return (
    <div className="col gap-3">
      <Card className="card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'var(--accent)', opacity: .06, filter: 'blur(10px)' }} />
        <div className="row between wrap" style={{ gap: '1rem', position: 'relative' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">{range.label} team attainment</div>
            <div style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.05 }}>
              <AnimatedNumber value={totals.teamWon} format={money} />
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 4 }}>
              <Badge tone={gap <= 0 ? 'ok' : onTrack ? 'accent' : 'warn'}>{attain}% of {moneyK(totals.teamQuota)} quota</Badge>
              <span className="t-sm muted">
                {gap > 0 ? `${moneyK(gap)} to quota` : `${moneyK(-gap)} over target`} - {expectedPct}% of period elapsed
              </span>
            </div>
          </div>
          <div style={{ minWidth: 260, flex: '1 1 260px', maxWidth: 400 }}>
            <div className="row between t-sm" style={{ marginBottom: 6 }}>
              <span className="fw-6">Attainment</span>
              <span className="muted">open pipeline {moneyK(totals.teamPipeline)}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <ProgressBar value={Math.min(100, attain)} color={gap <= 0 ? 'var(--ok)' : 'var(--accent)'} height={14} />
              <div style={{ position: 'absolute', top: -3, left: `${Math.min(100, expectedPct)}%`, transform: 'translateX(-50%)', width: 3, height: 20, background: 'var(--n-600)', borderRadius: 2 }} title={`Expected ${expectedPct}%`} />
            </div>
            <div className="row between t-xs muted" style={{ marginTop: 6 }}>
              <span>won {moneyK(totals.teamWon)}</span>
              <span>pace {expectedPct}%</span>
              <span>quota {moneyK(totals.teamQuota)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="card-pad">
        <div className="row between wrap" style={{ marginBottom: '.6rem', gap: '.6rem' }}>
          <div className="col gap-1">
            <div className="eyebrow">By territory</div>
            <h4 style={{ margin: 0 }}>Quota vs closed-won</h4>
          </div>
          <div className="row gap-2 wrap">
            <span className="row gap-1" style={{ alignItems: 'center' }}><span className="terr-dot" style={{ background: 'var(--n-100)', border: '1px solid var(--line-strong)' }} /><span className="t-sm fw-6">Quota</span></span>
            <span className="row gap-1" style={{ alignItems: 'center' }}><span className="terr-dot" style={{ background: 'var(--accent)' }} /><span className="t-sm fw-6">Won</span></span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 4 }} barGap={2}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fontSize: 12, fill: 'var(--n-600)' }} interval={0} />
            <YAxis tickFormatter={moneyK} tickLine={false} axisLine={false} width={54} tick={{ fontSize: 12, fill: 'var(--n-600)' }} />
            <Tooltip cursor={{ fill: 'rgba(91,75,245,.06)' }} contentStyle={tipStyle} formatter={(v, n) => [money(v), n === 'won' ? 'Closed won' : 'Quota']} />
            <Bar dataKey="quota" name="quota" fill="var(--n-100)" radius={[5, 5, 0, 0]} maxBarSize={46} />
            <Bar dataKey="won" name="won" radius={[5, 5, 0, 0]} maxBarSize={46}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
