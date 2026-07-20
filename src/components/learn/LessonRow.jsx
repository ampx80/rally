// A clickable lesson row in the Learn Hub's role track. Clicking it launches
// Ardo straight into that lesson (via the onStart handler, which fires the
// 'ardova:companion' event with the lessonId). ASCII only. No em/en dash.
import React from 'react';
import { Icon } from '../icons.jsx';

export default function LessonRow({ n, title, route, done, active, onStart }) {
  return (
    <button
      type="button"
      className={`lh-lesson${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
      onClick={onStart}
      aria-label={`Start the lesson "${title}" with Ardo`}
    >
      <span className="lh-lesson__check" aria-hidden>
        {done ? <Icon name="check" size={14} /> : n}
      </span>
      <span className="lh-lesson__main">
        <span className="lh-lesson__title">{title}</span>
        <span className="lh-lesson__route">{route}</span>
      </span>
      <span className="lh-lesson__go">
        <Icon name="play" size={12} />
        <span className="lh-lesson__goLabel">Start with Ardo</span>
      </span>
    </button>
  );
}
