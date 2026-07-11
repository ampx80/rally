// Step progress indicator for the onboarding wizard. Nodes flip to a checked
// state as steps complete, the active node pings, and the connecting line
// fills with a spring easing. Reads ONBOARDING_STEPS so it never drifts from
// the page. NO em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons.jsx';
import { ONBOARDING_STEPS } from '../../lib/onboarding-data.js';

export default function ProgressRail({ step }) {
  const total = ONBOARDING_STEPS.length;
  return (
    <div>
      <div className="ob-rail" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}
        aria-label={`Step ${step + 1} of ${total}`}>
        {ONBOARDING_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="ob-rail-seg" style={{ flex: i === total - 1 ? 'none' : 1 }}>
              <span className={`ob-rail-node${done ? ' done' : ''}${active ? ' active' : ''}`}>
                {done ? <Icon name="check" size={14} stroke={3} /> : i + 1}
              </span>
              {i < total - 1 && (
                <span className="ob-rail-line">
                  <span className="ob-rail-line-fill" style={{ width: done ? '100%' : '0%' }} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="ob-rail-labels">
        {ONBOARDING_STEPS.map((s, i) => (
          <span key={s.key} className={`ob-rail-label${i <= step ? ' on' : ''}`}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}
