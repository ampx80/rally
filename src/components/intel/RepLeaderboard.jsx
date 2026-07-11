// RepLeaderboard - an operator grade, not a vanity bar. Ranks reps on a
// composite of closed-won, quota attainment, pipeline coverage, win rate,
// and the health of the deals they are carrying. The grade is the headline;
// the bars show what drives it.
import React, { useMemo } from 'react';
import { Card, SectionHeader, Avatar, Badge, ProgressBar, moneyK } from '../UI.jsx';
import { intelRepLeaderboard } from '../../lib/intelligence-data.js';

const GRADE_TONE = { A: 'ok', B: 'accent', C: 'warn', D: 'risk' };

export default function RepLeaderboard() {
  const rows = useMemo(() => intelRepLeaderboard(), []);
  const top = rows[0];

  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Team"
        title="Operator leaderboard"
        sub="A composite grade across attainment, pipeline, win rate, and deal health. Not just who closed the most."
      />

      <div className="col gap-2">
        {rows.map((r, i) => (
          <div key={r.userId} className="panel" style={{ padding: '.9rem 1rem' }}>
            <div className="row between wrap" style={{ gap: '.75rem' }}>
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <span className="intel-move__rank" style={i === 0 ? { background: 'var(--accent)', color: '#fff' } : undefined}>{i + 1}</span>
                <Avatar name={r.name} size={36} />
                <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                  <span className="fw-7 clip">{r.name}</span>
                  <span className="t-xs muted clip">{r.title}</span>
                </div>
              </div>
              <div className="row gap-3" style={{ flex: 'none', alignItems: 'center' }}>
                <div className="col" style={{ textAlign: 'right', lineHeight: 1.15 }}>
                  <span className="fw-8 tnum">{moneyK(r.wonVal)}</span>
                  <span className="t-xs muted">closed won</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="fw-8" style={{ fontSize: '1.5rem', lineHeight: 1, color: `var(--${GRADE_TONE[r.grade] === 'accent' ? 'accent' : GRADE_TONE[r.grade]})` }}>{r.grade}</div>
                  <div className="t-xs muted">grade</div>
                </div>
              </div>
            </div>

            {/* driver bars */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '.6rem', marginTop: '.7rem' }}>
              <Driver label="Attainment" value={r.attainment} suffix="%" color="var(--ok)" cap={120} />
              <Driver label="Pipeline" raw={moneyK(r.pipeline)} value={null} />
              <Driver label="Win rate" value={r.winRate} suffix="%" color="var(--accent)" />
              <Driver label="Deal health" value={r.health} suffix="%" color={r.health >= 66 ? 'var(--ok)' : r.health >= 40 ? 'var(--warn)' : 'var(--risk)'} />
            </div>
          </div>
        ))}
      </div>

      {top && (
        <div className="intel-reason" data-tone="low" style={{ paddingTop: '.3rem' }}>
          <span className="intel-bul" />
          <span className="t-sm">
            <span className="fw-7">{top.name}</span> leads the board at grade {top.grade}, carrying {moneyK(top.pipeline)} in open pipeline with {top.attainment}% of quota already booked.
          </span>
        </div>
      )}
    </Card>
  );
}

function Driver({ label, value, raw, suffix = '', color = 'var(--accent)', cap = 100 }) {
  return (
    <div className="col gap-1">
      <div className="row between">
        <span className="t-xs muted">{label}</span>
        <span className="tnum fw-7 t-sm">{raw != null ? raw : `${value}${suffix}`}</span>
      </div>
      {value != null && <ProgressBar value={Math.min(100, (value / cap) * 100)} height={6} color={color} />}
      {value == null && <div style={{ height: 6 }} />}
    </div>
  );
}
