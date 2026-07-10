// AutomationFlow - a play that fires. The trigger lights up, a pulse travels
// down the wire, the condition evaluates true, then the action chips light up
// one after another. Illustrates the visual trigger -> if/then -> action builder.
// Reduced motion shows the whole play lit. NO em-dash / en-dash. ASCII only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const NODES = [
  { kind: 'Trigger', label: 'Deal moves to Closing', ic: 'zap' },
  { kind: 'Condition', label: 'Amount is over $50k', ic: 'workflow' },
  { kind: 'Actions', label: 'Run three actions', ic: 'send' },
];
const ACTIONS = [['bell', 'Notify the deal owner'], ['checkSquare', 'Create a close-plan task'], ['mail', 'Draft the exec email']];

export default function AutomationFlow() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [step, setStep] = useState(reduced ? 5 : 0); // 1 trig, 2 cond, 3 act, 4/5 chips

  useLoop(inView && !reduced, (T, done) => {
    setStep(0);
    T(() => setStep(1), 500);
    T(() => setStep(2), 1250);
    T(() => setStep(3), 2050);
    T(() => setStep(4), 2450);
    T(() => setStep(5), 2800);
    done();
  }, [], 2800);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="workflow" size={15} /> Automation</span>
        <span className={`vz-chip ${step >= 1 ? 'vz-chip-teal' : 'vz-chip-idle'}`}>
          <span className="vz-live-dot" /> {step >= 3 ? 'Fired' : step >= 1 ? 'Running' : 'Armed'}
        </span>
      </div>

      <div className="vz-flow">
        {NODES.map((n, i) => {
          const on = step >= i + 1;
          return (
            <React.Fragment key={n.kind}>
              <div className={`vz-fnode${on ? ' is-on' : ''}${step === i + 1 ? ' is-active' : ''}`}>
                <span className="vz-fnode-ic"><Icon name={n.ic} size={18} /></span>
                <div className="vz-fnode-txt">
                  <span className="vz-fnode-kind">{n.kind}</span>
                  <span className="vz-fnode-label">{n.label}</span>
                </div>
                {on && <span className="vz-fnode-tick"><Icon name="check" size={13} stroke={3} /></span>}
              </div>
              {i < NODES.length - 1 && (
                <div className="vz-wire">
                  <span className={`vz-wire-fill${step >= i + 2 ? ' is-full' : ''}`} />
                  {step === i + 1 && <span className="vz-wire-pulse" />}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="vz-actions">
          {ACTIONS.map(([ic, label], i) => (
            <div key={label} className={`vz-action${step >= 3 + i ? ' is-on' : ''}`}>
              <span className="vz-action-ic"><Icon name={ic} size={14} /></span>
              {label}
              <span className="vz-action-state">{step >= 3 + i ? 'done' : 'queued'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
