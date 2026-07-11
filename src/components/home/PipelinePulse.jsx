// Pipeline pulse - a mini funnel of open value by stage. Bars grow in on
// mount (scaleY, one frame) and brighten on hover. Click a column to jump
// into the board filtered on nothing fancy, just the pipeline.
import React from 'react';
import { moneyK } from '../UI.jsx';

export default function PipelinePulse({ stages = [], onOpen }) {
  const max = Math.max(1, ...stages.map(s => s.value));
  return (
    <div className="cc-pulse">
      {stages.map((s, i) => {
        const pct = Math.max(5, (s.value / max) * 100);
        return (
          <div key={s.id} className="cc-pulse-col" onClick={() => onOpen?.(s)}>
            <div className="cc-pulse-track">
              <div
                className="cc-pulse-bar"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(180deg, ${s.color}, ${s.color}bb)`,
                  animationDelay: `${i * 90}ms`,
                }}
              />
            </div>
            <div className="cc-pulse-meta col gap-1">
              <div className="row gap-1" style={{ alignItems: 'center' }}>
                <span className="dot" style={{ background: s.color }} />
                <span className="t-xs fw-6 clip">{s.name}</span>
              </div>
              <span className="t-sm fw-7 tnum">{moneyK(s.value)}</span>
              <span className="t-xs muted tnum">{s.count} deal{s.count === 1 ? '' : 's'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
