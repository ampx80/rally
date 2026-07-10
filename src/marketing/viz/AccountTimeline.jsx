// AccountTimeline - the account 360 assembling itself. The company header rolls
// up live totals, then every touch (email, call, meeting, note) streams into one
// timeline. Illustrates "the whole relationship on one screen". Reduced motion
// shows the full timeline. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop, CountUp } from './useAnim.jsx';
import './viz.css';

const TOUCHES = [
  ['mail', 'Emailed proposal to the CFO', '2h ago', '#5b4bf5'],
  ['phone', 'Discovery call, 32 minutes', 'Yesterday', '#0e9f9a'],
  ['calendar', 'Booked the exec review', '3d ago', '#a855f7'],
  ['fileText', 'Shared the security packet', '5d ago', '#2563a8'],
];

export default function AccountTimeline() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [shown, setShown] = useState(reduced ? TOUCHES.length : 0);

  useLoop(inView && !reduced, (T, done) => {
    setShown(0);
    TOUCHES.forEach((_, i) => T(() => setShown(i + 1), 500 + i * 460));
    done();
  }, [], 2600);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-acct-head">
        <span className="vz-acct-logo">NC</span>
        <div className="vz-acct-id">
          <div className="vz-acct-name">Northwind Corp</div>
          <div className="vz-acct-meta">Enterprise account</div>
        </div>
      </div>

      <div className="vz-acct-rollup">
        <div><span className="vz-roll-val"><CountUp to={3} /></span><span className="vz-roll-label">Open deals</span></div>
        <div><span className="vz-roll-val"><CountUp to={284} prefix="$" suffix="k" /></span><span className="vz-roll-label">Pipeline</span></div>
        <div><span className="vz-roll-val"><CountUp to={12} /></span><span className="vz-roll-label">Touches / 14d</span></div>
      </div>

      <div className="vz-tl-label">Activity timeline</div>
      <div className="vz-tl">
        {TOUCHES.map(([ic, t, when, color], i) => (
          <div key={t} className={`vz-tl-item${i < shown ? ' is-in' : ''}`}>
            <span className="vz-tl-rail">
              <span className="vz-tl-node" style={{ background: color }}><Icon name={ic} size={13} fill="none" /></span>
              {i < TOUCHES.length - 1 && <span className="vz-tl-line" />}
            </span>
            <div className="vz-tl-body">
              <div className="vz-tl-title">{t}</div>
              <div className="vz-tl-when">{when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
