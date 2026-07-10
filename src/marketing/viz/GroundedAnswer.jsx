// GroundedAnswer - the receipts. Rook scans the live records it is about to cite,
// each one ticking verified in turn, then states the grounded conclusion.
// Illustrates "every answer traces back to a real record". Reduced motion shows
// all sources verified. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const RECORDS = [
  ['target', 'Deal', 'Vertex platform'],
  ['building', 'Company', 'Northwind Corp'],
  ['user', 'Contact', 'J. Reyes, CFO'],
  ['activity', 'Activity', 'Proposal opened 2x'],
];

export default function GroundedAnswer() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [scan, setScan] = useState(reduced ? RECORDS.length : 0);
  const [answer, setAnswer] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setScan(0); setAnswer(false);
    RECORDS.forEach((_, i) => T(() => setScan(i + 1), 450 + i * 420));
    T(() => setAnswer(true), 450 + RECORDS.length * 420 + 200);
    done();
  }, [], 2600);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="search" size={15} /> Grounded in your records</span>
        <span className="vz-chip vz-chip-idle">{scan}/{RECORDS.length}</span>
      </div>

      <div className="vz-records">
        {RECORDS.map(([ic, kind, name], i) => {
          const on = i < scan;
          return (
            <div key={name} className={`vz-record${on ? ' is-on' : ''}`}>
              <span className="vz-record-ic"><Icon name={ic} size={15} /></span>
              <div className="vz-record-txt">
                <span className="vz-record-kind">{kind}</span>
                <span className="vz-record-name">{name}</span>
              </div>
              <span className={`vz-record-tick${on ? ' is-on' : ''}`}>
                {on && <Icon name="check" size={13} stroke={3} />}
              </span>
            </div>
          );
        })}
      </div>

      <div className={`vz-grounded-answer${answer ? ' is-in' : ''}`}>
        <Icon name="sparkles" size={13} /> The proposal is with Legal. Send the security packet to unblock it.
      </div>
    </div>
  );
}
