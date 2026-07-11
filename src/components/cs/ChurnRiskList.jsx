// Churn-risk queue. Accounts ranked by weighted exposure (ARR x churn
// probability) - the order a CSM should actually work the book. Each row
// carries the reasons Rook flagged and a one-click "Run playbook" action.
import React from 'react';
import { Badge, Button, moneyK, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';

const BAND_COLOR = { healthy: 'var(--ok)', watch: 'var(--warn)', risk: 'var(--risk)' };

function RiskMeter({ prob }) {
  const pct = Math.round(prob * 100);
  const color = prob >= 0.55 ? 'var(--risk)' : prob >= 0.3 ? 'var(--warn)' : 'var(--ok)';
  return (
    <div className="col gap-1" style={{ minWidth: 66, flex: 'none' }}>
      <span className="tnum fw-7 t-sm" style={{ color }}>{pct}%</span>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--n-100)', overflow: 'hidden' }}>
        <div className="cs-bar-grow" style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export default function ChurnRiskList({ queue = [], onSelect, onRunPlaybook }) {
  if (!queue.length) {
    return (
      <div className="col center gap-1" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
        <Icon name="shield" size={28} style={{ color: 'var(--ok)' }} />
        <div className="fw-6">No accounts at risk</div>
        <div className="muted t-sm">Every customer is sitting in the healthy band.</div>
      </div>
    );
  }

  return (
    <div className="col gap-2">
      {queue.map((a, i) => (
        <div key={a.id} className="cs-row-in card" style={{
          animationDelay: `${Math.min(i * 40, 500)}ms`,
          padding: '.85rem 1rem',
          borderLeft: `4px solid ${BAND_COLOR[a.band.key]}`,
        }}>
          <div className="row between gap-3 wrap" style={{ alignItems: 'center' }}>
            <button onClick={() => onSelect?.(a)} className="col gap-1" style={{ textAlign: 'left', minWidth: 180, flex: '1 1 220px' }}>
              <span className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="fw-7 clip">{a.name}</span>
                <Badge tone={a.band.tone} className="t-xs">{a.band.label}</Badge>
              </span>
              <span className="t-sm muted clip">{a.industry} - CSM {a.csm}</span>
            </button>

            <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
              <div className="col gap-1" style={{ minWidth: 78, textAlign: 'right' }}>
                <span className="tnum fw-7">{moneyK(a.arr)}</span>
                <span className="t-xs muted">ARR</span>
              </div>
              <div className="col gap-1" style={{ minWidth: 82, textAlign: 'right' }}>
                <span className="tnum fw-7" style={{ color: 'var(--risk)' }}>{moneyK(a.exposure)}</span>
                <span className="t-xs muted">exposure</span>
              </div>
              <RiskMeter prob={a.churnProb} />
            </div>
          </div>

          <div className="row gap-2 wrap" style={{ marginTop: '.65rem' }}>
            {a.reasons.map((r, j) => (
              <span key={j} className="row gap-1 t-xs" style={{
                alignItems: 'center', color: 'var(--risk)',
                background: 'var(--risk-bg)', borderRadius: 999, padding: '.2rem .55rem',
              }}>
                <Icon name="zap" size={11} /> {r}
              </span>
            ))}
          </div>

          <div className="row between gap-2 wrap" style={{ marginTop: '.7rem', alignItems: 'center' }}>
            <span className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
              <Icon name="calendar" size={12} />
              Renews {a.daysToRenewal < 0 ? `${Math.abs(a.daysToRenewal)}d ago` : relTime(a.renewalDate)}
            </span>
            <Button size="sm" variant="primary" onClick={() => onRunPlaybook?.(a)}>
              <Icon name="rocket" size={14} /> Run playbook
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
