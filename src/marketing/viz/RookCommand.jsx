// RookCommand - the operator in motion. A command bar types a real question,
// Rook thinks, then a grounded answer materializes with source records and
// one-tap actions. Illustrates "an operator, not a chatbot". Reduced motion
// shows the answered state. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const Q = 'Which deals slipped this quarter and why?';
const SOURCES = [['target', '3 deals'], ['activity', 'Legal stage'], ['fileText', 'SOC 2 packet']];
const ACTIONS = ['Send the packets', 'Draft follow-ups', 'Build the report'];

export default function RookCommand() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [typed, setTyped] = useState(reduced ? Q.length : 0);
  const [think, setThink] = useState(false);
  const [answered, setAnswered] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setTyped(0); setThink(false); setAnswered(false);
    let i = 0;
    const type = () => {
      i += 1; setTyped(i);
      if (i < Q.length) T(type, 34 + Math.random() * 30);
      else { T(() => setThink(true), 240); T(() => { setThink(false); setAnswered(true); }, 1200); }
    };
    T(type, 400);
    T(done, 5200);
  }, [], 900);

  return (
    <div className="vz-frame vz-frame-glow" ref={ref} aria-hidden>
      <div className="vz-rook-bar">
        <span className="vz-rook-mark"><Icon name="sparkles" size={16} fill="#fff" stroke={0} /></span>
        <div className="vz-rook-prompt">
          <span className="vz-rook-promptlabel">Ask Rook</span>
          <div className="vz-rook-typed">
            {Q.slice(0, typed)}
            {!answered && !think && typed < Q.length && <span className="m-cursor" />}
            {think && <span className="m-think vz-rook-think"><span /><span /><span /></span>}
          </div>
        </div>
        <span className="vz-rook-live"><span className="vz-live-dot" /> {answered ? 'Done' : 'Live'}</span>
      </div>

      {answered && (
        <div className="vz-rook-answer vz-spring">
          <div className="vz-rook-sources">
            {SOURCES.map(([ic, t], i) => (
              <span key={t} className="vz-source vz-pop" style={{ animationDelay: `${i * 90}ms` }}>
                <Icon name={ic} size={12} /> {t}
              </span>
            ))}
            <span className="vz-source-note">grounded in 3 records</span>
          </div>
          <p className="vz-rook-text">
            3 deals slipped, worth <b className="vz-hl">$213k</b>. All stalled at <b>Legal review</b> on the same blocker: the security questionnaire.
          </p>
          <div className="vz-rook-actions">
            {ACTIONS.map((a, i) => (
              <span key={a} className={`vz-abtn${i === 0 ? ' vz-abtn-primary' : ''} vz-pop`} style={{ animationDelay: `${300 + i * 90}ms` }}>
                {i === 0 && <Icon name="zap" size={12} />} {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
