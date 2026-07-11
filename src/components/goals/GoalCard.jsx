// GoalCard - one goal (a level x metric) with a pacing ring. The ring shows
// attainment; its color is the pacing verdict (ahead / on-track / behind /
// hit). Below it, actual-of-target, a PaceBar with the time-elapsed marker,
// and the projected end-of-period landing. An edit affordance opens the
// GoalEditor. Pure presentation - the goal object comes from goals-data.
import React from 'react';
import { Badge, money, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { STATUS_META, metricById } from '../../lib/goals-data.js';
import PaceBar from './PaceBar.jsx';

/* pacing ring: two stacked arcs, the colored one drawn to attainment% */
function PaceRing({ pct, color, size = 96, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const off = circ - clamped * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth={stroke} />
        <circle
          className="gl-ring-arc"
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ '--gl-circ': circ, '--gl-off': off }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ fontWeight: 800, fontSize: size * 0.24 }}>{Math.round(clamped * 100)}%</span>
        <span className="t-xs muted" style={{ marginTop: 2 }}>of goal</span>
      </div>
    </div>
  );
}

export default function GoalCard({ goal, period, editable = true, onEdit }) {
  const m = metricById(goal.metric);
  const fmt = m.unit === 'money' ? moneyK : (v) => Math.round(v).toLocaleString();
  const sm = STATUS_META[goal.status] || STATUS_META['on-track'];
  const elapsed = period ? period.elapsed : 0;

  return (
    <div className="card card-pad gl-card gl-rise col gap-3" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.5rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="row gap-1" style={{ alignItems: 'center', color: m.color }}>
            <Icon name={m.icon} size={16} />
            <span className="fw-7 clip" style={{ color: 'var(--ink)' }}>{m.label}</span>
          </span>
          <Badge tone={sm.tone} style={{ flex: 'none' }}>{sm.label}</Badge>
        </div>
        {editable && (
          <button className="btn btn-quiet btn-sm" title="Edit target" onClick={() => onEdit?.(goal)} style={{ padding: '.3rem .45rem', flex: 'none' }}>
            <Icon name="edit" size={14} />
          </button>
        )}
      </div>

      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <PaceRing pct={goal.attainment} color={sm.color} />
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
            <span className="fw-8 tnum" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{fmt(goal.actual)}</span>
            <span className="muted t-sm">of {fmt(goal.target)}</span>
          </div>
          <span className="t-xs muted">
            Pace to {fmt(Math.round(goal.expected))} by now
          </span>
        </div>
      </div>

      <div className="col gap-1">
        <PaceBar attainment={goal.attainment} elapsed={elapsed} status={goal.status} />
        <div className="row between t-xs muted" style={{ marginTop: 2 }}>
          <span>Projected {fmt(Math.round(goal.projected))}</span>
          <span style={{ color: sm.color, fontWeight: 700 }}>{Math.round(goal.projectedPct * 100)}% of goal</span>
        </div>
      </div>
    </div>
  );
}
