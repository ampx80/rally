// XP bar showing progress from the current level toward the next, plus the
// running XP total. Works on the dark hero (default) or a light card.
import React from 'react';

export default function XpBar({ level, light = false }) {
  const pct = level.isMax ? 100 : level.pctToNext;
  const nextLabel = level.isMax
    ? 'Max level reached'
    : `${level.xpToNext} XP to ${level.next.name}`;
  return (
    <div className="mo-xp">
      <div className="row between t-sm" style={{ marginBottom: 6, opacity: light ? 1 : .95 }}>
        <span className="fw-6">{level.name}</span>
        <span className="tnum">{nextLabel}</span>
      </div>
      <div className={`mo-xp__track${light ? ' mo-xp__track--light' : ''}`}>
        <div
          className={`mo-xp__fill${light ? ' mo-xp__fill--accent' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="row between t-xs" style={{ marginTop: 5, opacity: light ? .7 : .8 }}>
        <span className="tnum">{level.xp} XP total</span>
        {!level.isMax && <span className="tnum">{level.xpIntoLevel} / {level.xpForLevel}</span>}
      </div>
    </div>
  );
}
