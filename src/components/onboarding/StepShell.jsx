// The premium frame every onboarding step renders inside: full-screen stage
// with ambient orbs, a glass card, brand mark, the progress rail, a persistent
// "Skip for now" affordance, and a consistent back/next footer. Step-specific
// content is passed as children; the footer is driven by props so each step
// stays consistent. NO em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons.jsx';
import { Button } from '../UI.jsx';
import ProgressRail from './ProgressRail.jsx';

export default function StepShell({
  step,
  onSkip,
  onBack,
  onNext,
  nextLabel = 'Continue',
  canNext = true,
  showBack = true,
  showNext = true,
  showRail = true,
  skipLabel = 'Skip for now',
  children,
}) {
  return (
    <div className="ob-stage">
      <div className="ob-orbs" aria-hidden><span className="a" /><span className="b" /><span className="c" /></div>
      <div className="ob-shell">
        <div className="ob-card">
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="ob-brand">
              <span className="ob-mark"><Icon name="zap" size={19} fill="#fff" stroke={0} /></span>
              Ardovo
            </span>
            {onSkip && <button className="ob-skip" onClick={onSkip}>{skipLabel}</button>}
          </div>

          {showRail && <ProgressRail step={step} />}

          <div key={step} className="ob-step">
            {children}
          </div>

          {(showBack || showNext) && (
            <div className="ob-foot">
              <div>
                {showBack
                  ? <Button variant="quiet" onClick={onBack}><Icon name="chevronRight" size={16} style={{ transform: 'scaleX(-1)' }} /> Back</Button>
                  : <span />}
              </div>
              {showNext && (
                <Button variant="accent" onClick={onNext} disabled={!canNext}>
                  {nextLabel} <Icon name="chevronRight" size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
