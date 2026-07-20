// Self-contained confetti. Zero dependencies: a fixed overlay of small
// falling pieces colored from the design tokens. Renders on mount, cleans
// itself up after the animation, and never fires when the user prefers
// reduced motion (the overlay is also hidden by CSS as a belt-and-braces).
import React, { useEffect, useMemo, useState } from 'react';

const COLORS = [
  'var(--accent)', 'var(--accent-teal)', 'var(--accent-purple)',
  'var(--ok)', 'var(--warn)', 'var(--info)',
];

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export default function Confetti({ count = 130, duration = 2800, onDone }) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [pieces] = useState(() =>
    Array.from({ length: reduced ? 0 : count }).map((_, i) => {
      // Deterministic-enough spread without pulling in a PRNG.
      const r = (n) => ((Math.sin((i + 1) * n) + 1) / 2);
      return {
        id: i,
        left: r(12.9898) * 100,
        delay: r(78.233) * 0.5,
        dur: duration / 1000 + r(43.11) * 1.1,
        color: COLORS[i % COLORS.length],
        scale: 0.7 + r(9.71) * 0.9,
        rot: Math.round(r(4.42) * 360),
      };
    })
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), reduced ? 0 : duration + 900);
    return () => clearTimeout(t);
  }, [duration, onDone, reduced]);

  if (reduced || !pieces.length) return null;
  return (
    <div className="mo-confetti" aria-hidden="true">
      {pieces.map(p => (
        <i
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: `${Math.round(9 * p.scale)}px`,
            height: `${Math.round(14 * p.scale)}px`,
            background: p.color,
            '--dur': `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
