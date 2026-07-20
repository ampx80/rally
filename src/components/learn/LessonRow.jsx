// A clickable lesson row in the Learn Hub's role track. Clicking it launches
// Ardo straight INTO that lesson in one click: it fires the 'ardova:companion'
// event with { open, autoStart, lessonId }, which the docked TrainingCompanion
// turns into a real walkthrough (greet + navigate + spotlight + narrate), not
// just an opened dock.
//
// Back-compat: if a parent passes an onStart handler it wins (LearnHub passes
// startLesson(id)); otherwise we dispatch the launch event ourselves from the
// lessonId, so the row is never a dead button.
// ASCII only. No em/en dash.
import React from 'react';
import { Icon } from '../icons.jsx';

function launch(lessonId) {
  try {
    window.dispatchEvent(new CustomEvent('ardova:companion', {
      detail: { open: true, autoStart: true, lessonId },
    }));
  } catch {}
}

export default function LessonRow({ n, title, route, done, active, lessonId, onStart }) {
  const start = () => { if (onStart) onStart(); else if (lessonId) launch(lessonId); };
  return (
    <button
      type="button"
      className={`lh-lesson${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
      onClick={start}
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
