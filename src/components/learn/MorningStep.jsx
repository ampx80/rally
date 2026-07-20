// One row of the "Learn in a morning" guided sequence. Shows a numbered or
// checked marker, the step title + description, a live meta chip, and an action
// button that is always live (start Ardo or jump to the right page).
// ASCII only. No em-dash / no en-dash.
import React from 'react';
import { Icon } from '../icons.jsx';

export default function MorningStep({
  index, title, desc, done, current, meta, actionLabel, onAction, last,
}) {
  return (
    <div className={`lh-step${done ? ' is-done' : ''}${current && !done ? ' is-current' : ''}`}>
      <div className="lh-step__rail" aria-hidden>
        <span className="lh-step__mark">{done ? <Icon name="check" size={15} /> : index}</span>
        {!last && <span className="lh-step__line" />}
      </div>
      <div className="lh-step__body">
        <div className="lh-step__title">
          {title}
          {meta && <span className="lh-step__meta">{meta}</span>}
        </div>
        <div className="lh-step__desc">{desc}</div>
      </div>
      <button type="button" className="lh-step__action" onClick={onAction}>
        {done ? 'Revisit' : actionLabel}
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}
