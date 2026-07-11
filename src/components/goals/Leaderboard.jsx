// Leaderboard - reps ranked by attainment on the selected metric, with
// week-over-week rank movement. Rows come from repGoalLeaderboard(); this is
// pure presentation. Top three get a medal chip; movement shows an up / down
// / flat arrow. Attainment bar is colored by the pacing status.
import React from 'react';
import { Avatar, Badge, ProgressBar, money, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { STATUS_META, metricById } from '../../lib/goals-data.js';

function Movement({ delta }) {
  if (!delta) return <span className="t-xs muted" title="No change" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>-</span>;
  const up = delta > 0;
  return (
    <span className="t-xs fw-7" title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} from last week`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: up ? 'var(--ok)' : 'var(--risk)' }}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} />{Math.abs(delta)}
    </span>
  );
}

function medalClass(rank) {
  return rank === 1 ? 'gl-medal-1' : '';
}
function medalStyle(rank) {
  if (rank === 1) return {}; // shimmer handled by gl-medal-1
  if (rank === 2) return { background: '#c3c8d2', color: '#2b3040' };
  if (rank === 3) return { background: '#d8a06a', color: '#3a2408' };
  return { background: 'var(--n-100)', color: 'var(--n-600)' };
}

export default function Leaderboard({ rows = [], metric = 'revenue' }) {
  const m = metricById(metric);
  const fmt = m.unit === 'money' ? moneyK : (v) => Math.round(v).toLocaleString();
  return (
    <div className="col">
      {rows.map((r) => {
        const sm = STATUS_META[r.status] || STATUS_META['on-track'];
        return (
          <div key={r.userId} className="gl-lead-row row gap-3"
            style={{ alignItems: 'center', padding: '.7rem .5rem', borderTop: '1px solid var(--line)' }}>
            <span className={`row center t-sm fw-8 ${medalClass(r.rank)}`}
              style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', ...medalStyle(r.rank) }}>
              {r.rank}
            </span>
            <Avatar name={r.name} size={38} />
            <div className="col" style={{ minWidth: 0, flex: '1 1 140px', gap: 3 }}>
              <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <span className="fw-7 clip">{r.name}</span>
                <Movement delta={r.movement} />
              </span>
              <span className="row gap-2" style={{ alignItems: 'center' }}>
                <span style={{ flex: 1, maxWidth: 220 }}>
                  <ProgressBar value={Math.min(100, r.attainment * 100)} color={sm.color} height={7} />
                </span>
                <span className="t-xs muted" style={{ flex: 'none' }}>{Math.round(r.attainment * 100)}%</span>
              </span>
            </div>
            <div className="col" style={{ textAlign: 'right', flex: 'none', lineHeight: 1.2 }}>
              <span className="fw-7 tnum">{fmt(r.actual)}</span>
              <span className="t-xs muted">of {fmt(r.target)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
