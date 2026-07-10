// DraftCompose - Rook writes the outreach. A follow-up email types itself from
// the account history, then flips to "ready to send" with a QBR deck attached.
// Illustrates "it writes the outreach". Reduced motion shows the finished draft.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const BODY = "Hi Jordan, thanks for the time today. Attached is the SOC 2 packet Legal asked for, plus a short QBR deck on where the rollout stands. To hold a Q3 start, can we lock the exec review for Thursday?";

export default function DraftCompose() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [typed, setTyped] = useState(reduced ? BODY.length : 0);
  const [ready, setReady] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setTyped(0); setReady(false);
    let i = 0;
    const type = () => {
      i += 1; setTyped(i);
      if (i < BODY.length) T(type, 12 + Math.random() * 18);
      else { T(() => setReady(true), 400); T(done, 2600); }
    };
    T(type, 500);
  }, [], 900);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-draft-head">
        <span className="vz-draft-tab is-on"><Icon name="mail" size={12} /> Email</span>
        <span className="vz-draft-tab"><Icon name="fileText" size={12} /> QBR .pptx</span>
        {ready && <span className="vz-draft-ready vz-pop"><Icon name="check" size={11} stroke={3} /> ready to send</span>}
      </div>

      <div className="vz-draft-subjectlabel">Subject</div>
      <div className="vz-draft-subject">Next steps on the Vertex platform rollout</div>

      <div className="vz-draft-body">
        {BODY.slice(0, typed)}
        {!ready && typed < BODY.length && <span className="m-cursor" />}
      </div>

      <div className="vz-draft-foot">
        <span className="vz-draft-to">To: Jordan Reyes, CFO</span>
        <span className={`vz-draft-send${ready ? ' is-on' : ''}`}>Send <Icon name="chevronRight" size={13} /></span>
      </div>
    </div>
  );
}
