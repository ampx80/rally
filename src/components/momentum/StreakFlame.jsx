// Daily streak flame. Lit when the rep has an active streak, cold at zero.
// The flame glyph is inline SVG so it needs no icon-registry entry.
import React from 'react';

const FlameGlyph = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2c1.5 3 .5 5-1 6.5C9.3 10.2 8 11.7 8 14a4 4 0 0 0 8 0c0-1-.3-1.8-.7-2.5.9.5 1.7 1.4 1.7 3.1A5 5 0 0 1 7 15c0-3.5 2.5-5.2 3.8-7.2C11.7 6.3 12.3 4.2 12 2z" />
  </svg>
);

export default function StreakFlame({ streak = 0, best = 0, light = false }) {
  const lit = streak > 0;
  return (
    <div className="mo-flame" title={`Best streak: ${best} day${best === 1 ? '' : 's'}`}>
      <span className={`mo-flame__icon${lit ? '' : ' mo-flame__icon--cold'}`}>
        <FlameGlyph />
      </span>
      <span className="col" style={{ lineHeight: 1.15 }}>
        <span style={{ fontSize: '1.35rem', fontWeight: 800 }}>{streak}</span>
        <span className="t-xs" style={{ opacity: light ? .7 : .85 }}>day streak</span>
      </span>
    </div>
  );
}
