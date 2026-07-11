// PaceBar - the at-a-glance "are we ahead or behind" bar. The fill is
// attainment (actual / target); a vertical marker sits at the time-elapsed
// point (where you SHOULD be by now). Fill past the marker = ahead of pace,
// short of it = behind. Colored by the goal's pacing status.
import React from 'react';
import { STATUS_META } from '../../lib/goals-data.js';

export default function PaceBar({ attainment = 0, elapsed = 0, status = 'on-track', height = 10, showMark = true }) {
  const fillPct = Math.max(0, Math.min(100, attainment * 100));
  const markPct = Math.max(0, Math.min(100, elapsed * 100));
  const color = STATUS_META[status]?.color || 'var(--accent)';
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ background: 'var(--n-100)', borderRadius: 999, height, overflow: 'hidden', width: '100%' }}>
        <div className="gl-pace-fill" style={{ width: `${fillPct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      {showMark && (
        <div
          className="gl-pace-mark"
          title={`Pace line - ${Math.round(markPct)}% of the period elapsed`}
          style={{
            position: 'absolute', top: -3, left: `${markPct}%`,
            width: 3, height: height + 6, background: 'var(--ink)',
            borderRadius: 2, transform: 'translateX(-50%)', opacity: .9,
          }}
        />
      )}
    </div>
  );
}
