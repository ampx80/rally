// AutopilotMoves - the morning brief. Three ranked plays cascade in, each with
// the reason it matters, then Rook runs the top one and it flips to "running".
// Illustrates "proactive, not passive". Reduced motion shows all three surfaced.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const MOVES = [
  ['trendUp', 'Push Vertex to close', '$156k stalled at Legal for 6 days', '#5b4bf5'],
  ['clock', 'Re-engage Beacon', 'No touch in 11 days', '#a855f7'],
  ['dollar', 'Send the Orbit renewal', 'Contract expires in 3 weeks', '#0e9f9a'],
];

export default function AutopilotMoves() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [shown, setShown] = useState(reduced ? MOVES.length : 0);
  const [running, setRunning] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setShown(0); setRunning(false);
    MOVES.forEach((_, i) => T(() => setShown(i + 1), 400 + i * 380));
    T(() => setRunning(true), 400 + MOVES.length * 380 + 500);
    done();
  }, [], 2600);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="rocket" size={15} /> 3 moves to make today</span>
        <span className="vz-chip vz-chip-accent">Autopilot</span>
      </div>

      <div className="vz-moves">
        {MOVES.map(([ic, t, why, color], i) => {
          const on = i < shown;
          const isTop = i === 0;
          return (
            <div key={t} className={`vz-move${on ? ' is-in' : ''}${isTop && running ? ' is-running' : ''}`}>
              <span className="vz-move-rank" style={{ background: color }}>{i + 1}</span>
              <span className="vz-move-ic"><Icon name={ic} size={16} /></span>
              <div className="vz-move-txt">
                <span className="vz-move-t">{t}</span>
                <span className="vz-move-why">{why}</span>
              </div>
              <span className="vz-move-run">
                {isTop && running ? (<><span className="vz-live-dot" /> Running</>) : 'Run'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
