// Scorecard - a rep's weekly activity + output cadence. One row per metric
// (calls, meetings, emails, pipeline created, revenue won) with a mini
// progress bar against that week's target, plus a rolled-up weekly score
// badge. Data from repScorecard(); pure presentation here.
import React from 'react';
import { Avatar, Badge, ProgressBar, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';

function scoreTone(score) {
  if (score >= 100) return 'ok';
  if (score >= 70) return 'accent';
  return 'warn';
}
function barColor(pct) {
  if (pct >= 1) return 'var(--ok)';
  if (pct >= 0.6) return 'var(--accent)';
  return 'var(--warn)';
}

export default function Scorecard({ user, card }) {
  if (!user || !card) return null;
  const { rows, score } = card;
  return (
    <div className="card card-pad gl-card gl-rise col gap-3">
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar name={user.name} size={40} />
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <span className="fw-7 clip">{user.name}</span>
            <span className="t-xs muted clip">{user.title}</span>
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', flex: 'none' }}>
          <Badge tone={scoreTone(score)}>{score}</Badge>
          <span className="t-xs muted" style={{ marginTop: 2 }}>week score</span>
        </div>
      </div>

      <div className="col gap-2">
        {rows.map((r) => {
          const fmt = r.unit === 'money' ? moneyK : (v) => Math.round(v).toLocaleString();
          return (
            <div key={r.id} className="col gap-1">
              <div className="row between" style={{ alignItems: 'center' }}>
                <span className="row gap-1 t-sm" style={{ alignItems: 'center', color: 'var(--n-600)' }}>
                  <Icon name={r.icon} size={13} /> {r.label}
                </span>
                <span className="t-sm tnum">
                  <span className="fw-7" style={{ color: 'var(--ink)' }}>{fmt(r.actual)}</span>
                  <span className="muted"> / {fmt(r.target)}</span>
                </span>
              </div>
              <ProgressBar value={Math.min(100, r.pct * 100)} color={barColor(r.pct)} height={6} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
