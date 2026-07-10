// JuggernautBuild - one sentence, a whole account. The prompt sits at the top,
// then Rook builds the company, contacts, deal, close plan and intro email step
// by step, each ticking done, and a "Built in 2.4s" stamp lands. Illustrates the
// one-sentence account build. Reduced motion shows it built. NO em-dash.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const STEPS = [
  ['building', 'Created company Northwind Corp'],
  ['users', 'Added 3 contacts with roles'],
  ['target', 'Opened deal at $156k, Proposal'],
  ['checkSquare', 'Built a 6-step close plan'],
  ['mail', 'Drafted the intro email'],
];

export default function JuggernautBuild() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [done, setDone] = useState(reduced ? STEPS.length : 0);
  const [stamp, setStamp] = useState(reduced);

  useLoop(inView && !reduced, (T, finish) => {
    setDone(0); setStamp(false);
    STEPS.forEach((_, i) => T(() => setDone(i + 1), 500 + i * 420));
    T(() => setStamp(true), 500 + STEPS.length * 420 + 200);
    finish();
  }, [], 2600);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-jug-prompt">
        <Icon name="bolt" size={14} />
        <span>"Stand up the Northwind account for a $156k platform deal"</span>
      </div>

      <div className="vz-jug-steps">
        {STEPS.map(([ic, label], i) => {
          const on = i < done;
          return (
            <div key={label} className={`vz-jug-step${on ? ' is-on' : ''}`}>
              <span className={`vz-jug-check${on ? ' is-on' : ''}`}>
                {on ? <Icon name="check" size={12} stroke={3} /> : <Icon name={ic} size={12} />}
              </span>
              <span className="vz-jug-label">{label}</span>
            </div>
          );
        })}
      </div>

      <div className={`vz-jug-stamp${stamp ? ' is-in' : ''}`}>
        <span className="vz-jug-stampring"><Icon name="check" size={14} stroke={3} /></span>
        <span className="vz-jug-stamptxt">Built in 2.4s</span>
      </div>
    </div>
  );
}
