// Renewal calendar. Buckets the book by renewal month (plus an overdue
// column) for the next ~5 months, each column carrying its accounts and the
// ARR up for renewal. A slim timeline bar across the top gives the at-a-glance
// distribution; the columns give the workable detail.
import React from 'react';
import { Badge, moneyK, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';

const BAND_COLOR = { healthy: 'var(--ok)', watch: 'var(--warn)', risk: 'var(--risk)' };

export default function RenewalTimeline({ buckets = [], onSelect }) {
  const totalArr = buckets.reduce((s, b) => s + b.arr, 0) || 1;

  if (!buckets.length) {
    return (
      <div className="col center gap-1" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
        <Icon name="calendar" size={28} style={{ color: 'var(--n-400)' }} />
        <div className="fw-6">No renewals in the next five months</div>
        <div className="muted t-sm">The book is clear through the window.</div>
      </div>
    );
  }

  return (
    <div className="col gap-3">
      {/* distribution bar */}
      <div className="row" style={{ height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
        {buckets.map((b, i) => (
          <div key={b.key} className="cs-bar-grow" title={`${b.label}: ${moneyK(b.arr)}`}
            style={{
              width: `${(b.arr / totalArr) * 100}%`,
              background: b.overdue ? 'var(--risk)' : i % 2 ? 'var(--accent-300)' : 'var(--accent)',
              animationDelay: `${i * 90}ms`,
            }} />
        ))}
      </div>

      <div className="row gap-3" style={{ overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
        {buckets.map((b) => (
          <div key={b.key} className="col gap-2" style={{ flex: '0 0 232px', minWidth: 232 }}>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="fw-7" style={{ color: b.overdue ? 'var(--risk)' : 'var(--ink)' }}>{b.label}</span>
              <span className="tnum t-sm muted">{b.accts.length} - {moneyK(b.arr)}</span>
            </div>
            <div className="col gap-2">
              {b.accts.map((a, i) => (
                <button key={a.id} onClick={() => onSelect?.(a)} className="cs-row-in card"
                  style={{
                    animationDelay: `${i * 40}ms`,
                    textAlign: 'left', padding: '.6rem .7rem',
                    borderLeft: `3px solid ${BAND_COLOR[a.band.key]}`,
                    display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
                  }}>
                  <span className="row between" style={{ gap: 6 }}>
                    <span className="clip fw-6" style={{ fontSize: '.86rem', minWidth: 0 }}>{a.name}</span>
                    <span className="tnum fw-7 t-sm" style={{ flex: 'none' }}>{moneyK(a.arr)}</span>
                  </span>
                  <span className="row between" style={{ gap: 6 }}>
                    <Badge tone={a.band.tone} className="t-xs">{a.band.label} {a.score}</Badge>
                    <span className="t-xs muted" style={{ flex: 'none' }}>
                      {a.daysToRenewal < 0 ? `${Math.abs(a.daysToRenewal)}d overdue` : relTime(a.renewalDate)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
