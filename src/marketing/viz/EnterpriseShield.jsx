// EnterpriseShield - the security posture arming itself. A shield pulses while
// four enterprise guarantees tick green one by one. Illustrates "serious from
// the first login". Reduced motion shows all checks passed. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const GUARDS = [
  ['users', 'Roles and permissions', 'Granular, per object'],
  ['command', 'SSO and SAML', 'SOC 2 Type II'],
  ['history', 'Full audit log', 'Every field, every change'],
  ['layers', 'One design system', 'Every surface consistent'],
];

export default function EnterpriseShield() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [checked, setChecked] = useState(reduced ? GUARDS.length : 0);

  useLoop(inView && !reduced, (T, done) => {
    setChecked(0);
    GUARDS.forEach((_, i) => T(() => setChecked(i + 1), 550 + i * 480));
    done();
  }, [], 2600);

  const armed = checked >= GUARDS.length;

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-shield-hero">
        <span className="vz-shield-ring" />
        <span className={`vz-shield-mark${armed ? ' is-armed' : ''}`}>
          <Icon name="shield" size={30} fill="none" />
        </span>
        <div className="vz-shield-copy">
          <div className="vz-shield-title">{armed ? 'Fully secured' : 'Securing workspace'}</div>
          <div className="vz-shield-sub">{checked}/{GUARDS.length} controls verified</div>
        </div>
      </div>

      <div className="vz-guards">
        {GUARDS.map(([ic, t, s], i) => {
          const on = i < checked;
          return (
            <div key={t} className={`vz-guard${on ? ' is-on' : ''}`}>
              <span className="vz-guard-ic"><Icon name={ic} size={16} /></span>
              <div className="vz-guard-txt">
                <span className="vz-guard-t">{t}</span>
                <span className="vz-guard-s">{s}</span>
              </div>
              <span className={`vz-guard-tick${on ? ' is-on' : ''}`}>
                {on && <Icon name="check" size={13} stroke={3} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
