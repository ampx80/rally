// ============================================================
// ARDO  -  the training companion mascot.
// A lively CSS + SVG character with four states:
//   idle      gentle float + blink
//   talking   bounce + mouth/eyes animate while speaking
//   thinking  head tilt + eyes look up + thought dots
//   celebrate happy bounce + sparkles
// prefers-reduced-motion is honored in companion.css (animations disabled).
// ASCII only. No em-dash / no en-dash.
// ============================================================
import React from 'react';

export default function Character({ state = 'idle', size = 120, className = '' }) {
  const s = ['idle', 'talking', 'thinking', 'celebrate'].includes(state) ? state : 'idle';
  return (
    <div
      className={`ardo ardo--${s} ${className}`}
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

      <svg className="ardo__svg" viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="ardoBody" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#8f79ff" />
            <stop offset="55%" stopColor="#6d5cf7" />
            <stop offset="100%" stopColor="#4a3ce0" />
          </radialGradient>
          <linearGradient id="ardoScreen" x1="0" y1="0" x2="0" y2="1">
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
          <rect x="22" y="20" width="76" height="72" rx="26" fill="url(#ardoBody)" />
          {/* glossy highlight */}
          <ellipse cx="45" cy="38" rx="16" ry="9" fill="rgba(255,255,255,.22)" />

          {/* face screen */}
          <rect x="33" y="34" width="54" height="42" rx="18" fill="url(#ardoScreen)" />

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

          {/* little arms */}
          <path className="ardo__arm ardo__arm--l" d="M22 60 q-10 4 -12 14" stroke="#5b4bf5" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path className="ardo__arm ardo__arm--r" d="M98 60 q10 4 12 14" stroke="#5b4bf5" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
