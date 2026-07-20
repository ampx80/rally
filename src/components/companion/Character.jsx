// ============================================================
// ARDO  -  the training companion mascot.
// A lively CSS + SVG character with states:
//   idle       gentle float, breathe, blink, look-around, antenna sway
//   talking    bounce + mouth flap while speaking
//   thinking   head tilt + eyes look up + thought dots
//   listening  attentive lean + antenna pulse (waiting on you)
//   celebrate  happy bounce + cheeks + sparkles
// Plus two transient gesture classes the panel toggles:
//   ardo-pop    a quick delighted pop when a lesson is completed
//   ardo-point  a right-arm point-at-screen when a highlight fires
//
// Every instance mints UNIQUE gradient ids (via useId) so multiple Ardos on
// one page (launcher, header, stage, hero) never collide on a shared SVG id,
// which would otherwise be invalid DOM and blank out the fills.
// prefers-reduced-motion is honored in companion.css (animations disabled).
// ASCII only. No em-dash / no en-dash.
// ============================================================
import React, { useId } from 'react';

const STATES = ['idle', 'talking', 'thinking', 'listening', 'celebrate'];

export default function Character({ state = 'idle', size = 120, className = '' }) {
  const s = STATES.includes(state) ? state : 'idle';

  // Unique, DOM-safe ids for this instance's gradients.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bodyId = `ardoBody-${uid}`;
  const screenId = `ardoScreen-${uid}`;

  return (
    <div
      className={`ardo ardo--${s} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Ardo, your training companion (${s})`}
    >
      {/* sparkles for the celebrate state */}
      <span className="ardo__spark ardo__spark--1" aria-hidden>+</span>
      <span className="ardo__spark ardo__spark--2" aria-hidden>*</span>
      <span className="ardo__spark ardo__spark--3" aria-hidden>+</span>

      {/* thought dots for the thinking state */}
      <span className="ardo__think ardo__think--1" aria-hidden />
      <span className="ardo__think ardo__think--2" aria-hidden />
      <span className="ardo__think ardo__think--3" aria-hidden />

      {/* listening ripple */}
      <span className="ardo__ear ardo__ear--1" aria-hidden />
      <span className="ardo__ear ardo__ear--2" aria-hidden />

      <svg className="ardo__svg" viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id={bodyId} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#8f79ff" />
            <stop offset="55%" stopColor="#6d5cf7" />
            <stop offset="100%" stopColor="#4a3ce0" />
          </radialGradient>
          <linearGradient id={screenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1030" />
            <stop offset="100%" stopColor="#1b1d4a" />
          </linearGradient>
        </defs>

        {/* soft ground shadow */}
        <ellipse className="ardo__shadow" cx="60" cy="110" rx="30" ry="6" fill="rgba(12,16,26,.18)" />

        {/* antenna */}
        <g className="ardo__antenna">
          <line x1="60" y1="20" x2="60" y2="8" stroke="#4a3ce0" strokeWidth="3" strokeLinecap="round" />
          <circle className="ardo__antenna-tip" cx="60" cy="7" r="5" fill="#0e9f8f" />
        </g>

        {/* body */}
        <g className="ardo__bob">
          <rect x="22" y="20" width="76" height="72" rx="26" fill={`url(#${bodyId})`} />
          {/* glossy highlight */}
          <ellipse cx="45" cy="38" rx="16" ry="9" fill="rgba(255,255,255,.22)" />

          {/* face screen */}
          <rect x="33" y="34" width="54" height="42" rx="18" fill={`url(#${screenId})`} />

          {/* eyes */}
          <g className="ardo__eyes">
            <circle className="ardo__eye ardo__eye--l" cx="49" cy="52" r="6.5" fill="#8ff0e4" />
            <circle className="ardo__eye ardo__eye--r" cx="71" cy="52" r="6.5" fill="#8ff0e4" />
            <circle cx="51" cy="50" r="2" fill="#0d1030" className="ardo__pupil ardo__pupil--l" />
            <circle cx="73" cy="50" r="2" fill="#0d1030" className="ardo__pupil ardo__pupil--r" />
          </g>

          {/* mouth (animates while talking) */}
          <rect className="ardo__mouth" x="52" y="64" width="16" height="4" rx="2" fill="#8ff0e4" />

          {/* cheeks for the celebrate state */}
          <circle className="ardo__cheek ardo__cheek--l" cx="40" cy="62" r="4" fill="#ff7ab6" />
          <circle className="ardo__cheek ardo__cheek--r" cx="80" cy="62" r="4" fill="#ff7ab6" />

          {/* little arms (right arm extends for the point gesture) */}
          <path className="ardo__arm ardo__arm--l" d="M22 60 q-10 4 -12 14" stroke="#5b4bf5" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path className="ardo__arm ardo__arm--r" d="M98 60 q10 4 12 14" stroke="#5b4bf5" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle className="ardo__hand ardo__hand--r" cx="110" cy="74" r="4" fill="#5b4bf5" />
        </g>
      </svg>
    </div>
  );
}
