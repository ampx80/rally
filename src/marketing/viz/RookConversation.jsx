// RookConversation - the Rook page centerpiece. A grounded question is asked,
// Rook thinks, then a real answer types out with live numbers and one-tap
// actions that spring in. Loops. Illustrates "a grounded question in, real
// numbers and one-tap actions out". Reduced motion shows the answered thread.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const Q = 'How is the Northwind account trending, and what should I do next?';
const A = "Northwind has 3 open deals worth $284k. Momentum is up: 12 touches in 14 days and the CFO opened your proposal twice. The Vertex platform deal ($156k) is your best move. It is stuck at Legal, waiting on the security packet.";
const ACTIONS = ['Send the security packet', 'Draft the CFO follow-up', 'Build the QBR deck'];

export default function RookConversation() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView(0.3);
  const [qTyped, setQTyped] = useState(reduced ? Q.length : 0);
  const [think, setThink] = useState(false);
  const [aTyped, setATyped] = useState(reduced ? A.length : 0);
  const [actions, setActions] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setQTyped(0); setThink(false); setATyped(0); setActions(false);
    let qi = 0;
    const typeQ = () => {
      qi += 1; setQTyped(qi);
      if (qi < Q.length) T(typeQ, 26 + Math.random() * 24);
      else { T(() => setThink(true), 260); T(startA, 1250); }
    };
    const startA = () => {
      setThink(false);
      let ai = 0;
      const typeA = () => {
        ai += 1; setATyped(ai);
        if (ai < A.length) T(typeA, 12 + Math.random() * 16);
        else { T(() => setActions(true), 240); T(done, 3200); }
      };
      typeA();
    };
    T(typeQ, 420);
  }, [], 900);

  const aDone = aTyped >= A.length;

  return (
    <div className="vz-convo vz-frame-glow" ref={ref} aria-hidden>
      <div className="vz-convo-head">
        <span className="vz-rook-mark"><Icon name="sparkles" size={16} fill="#fff" stroke={0} /></span>
        <span className="vz-convo-name">Rook</span>
        <span className="vz-convo-role">revenue operator</span>
        <span className="vz-live-dot" style={{ marginLeft: 'auto' }} />
      </div>

      <div className="vz-convo-thread">
        <div className="vz-msg-user">
          <div className="vz-bubble-user">
            {Q.slice(0, qTyped)}
            {!think && qTyped < Q.length && <span className="m-cursor" />}
          </div>
        </div>

        {(think || aTyped > 0) && (
          <div className="vz-msg-rook vz-arrive">
            <span className="vz-rook-mark vz-rook-mark-sm"><Icon name="sparkles" size={13} fill="#fff" stroke={0} /></span>
            <div className="vz-bubble-rook">
              {think ? (
                <span className="m-think"><span /><span /><span /></span>
              ) : (
                <>
                  <span dangerouslySetInnerHTML={{ __html: highlight(A.slice(0, aTyped)) }} />
                  {!aDone && <span className="m-cursor" />}
                  {actions && (
                    <div className="vz-rook-actions">
                      {ACTIONS.map((a, i) => (
                        <span key={a} className={`vz-abtn${i === 0 ? ' vz-abtn-primary' : ''} vz-pop`} style={{ animationDelay: `${i * 90}ms` }}>
                          <Icon name="zap" size={12} /> {a}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="vz-convo-input">
        <span className="vz-convo-placeholder">Ask Rook anything about your revenue...</span>
        <span className="vz-convo-icons"><Icon name="mic" size={16} /><Icon name="send" size={16} /></span>
      </div>
    </div>
  );
}

// Bold the live figures as they stream in (only whole matched tokens).
function highlight(text) {
  return text
    .replace(/(\$284k|\$156k|3 open deals|12 touches)/g, '<b class="vz-hl">$1</b>')
    .replace(/(Vertex platform|Legal)/g, '<b>$1</b>');
}
