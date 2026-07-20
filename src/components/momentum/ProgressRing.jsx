// The big animated competence ring. Fills from 0 to `value` percent with a
// smooth stroke sweep (disabled under reduced motion by CSS). The center
// shows the ramp percent and a short caption. Pure SVG, no dependencies.
import React, { useEffect, useState } from 'react';

export default function ProgressRing({
  value = 0,
  size = 168,
  stroke = 14,
  color = '#fff',
  caption = 'ramped',
  onLight = false,
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Animate the sweep in on mount and whenever the value changes.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);
  const off = c - (shown / 100) * c;

  return (
    <div className="mo-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(clamped)} percent ramped`}>
        <circle
          className="mo-ring__track"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          strokeWidth={stroke}
          style={onLight ? { stroke: 'var(--n-100)' } : undefined}
        />
        <circle
          className="mo-ring__fill"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
        />
      </svg>
      <div className="mo-ring__center" style={{ color: onLight ? 'var(--ink)' : '#fff' }}>
        <span className="mo-ring__pct" style={{ fontSize: size * 0.26 }}>{Math.round(clamped)}%</span>
        <span className="mo-ring__cap">{caption}</span>
      </div>
    </div>
  );
}
