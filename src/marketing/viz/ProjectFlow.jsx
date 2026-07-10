// ProjectFlow - a team board inside the CRM. A delivery task advances To do ->
// In progress -> Done on a loop, and the connected revenue modules light up in
// sequence to show one system end to end. Illustrates "the whole revenue motion,
// one system". Reduced motion shows it complete. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const COLS = [
  { name: 'To do', cards: ['Q3 QBR deck'] },
  { name: 'In progress', cards: ['Renewal terms'] },
  { name: 'Done', cards: ['Kickoff call'] },
];
const MODULES = [['megaphone', 'Outreach'], ['receipt', 'Quotes'], ['dollar', 'Billing'], ['checkSquare', 'Service']];

export default function ProjectFlow() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [pos, setPos] = useState(reduced ? 2 : 0);
  const [lit, setLit] = useState(reduced ? MODULES.length : 0);

  useLoop(inView && !reduced, (T, done) => {
    setPos(0); setLit(0);
    T(() => setPos(1), 1100);
    T(() => setPos(2), 2200);
    MODULES.forEach((_, i) => T(() => setLit(i + 1), 700 + i * 420));
    done();
  }, [], 2400);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="layers" size={15} /> Customer projects</span>
        <span className="vz-chip vz-chip-idle">Onboard Vertex</span>
      </div>

      <div className="vz-board vz-board-tight">
        {COLS.map((col, ci) => (
          <div key={col.name} className={`vz-col${ci === pos ? ' is-active' : ''}`}>
            <div className="vz-col-head vz-col-head-sm">{col.name}</div>
            <div className="vz-col-body">
              {ci === pos && (
                <div className="vz-task vz-task-live vz-spring" key={`live-${pos}`}>
                  <span className="vz-task-mark"><Icon name={pos === 2 ? 'check' : 'target'} size={12} stroke={pos === 2 ? 3 : 2} /></span>
                  Onboard Vertex
                </div>
              )}
              {col.cards.map(c => (
                <div key={c} className="vz-task vz-task-idle">{c}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="vz-modrow">
        {MODULES.map(([ic, label], i) => (
          <span key={label} className={`vz-modchip${i < lit ? ' is-on' : ''}`}>
            <Icon name={ic} size={13} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
