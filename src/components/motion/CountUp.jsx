// CountUp - a number that eases from its previous value to the target,
// firing the first time it scrolls into view (IntersectionObserver via
// useInView) rather than on mount, so the count-up actually gets seen.
// rAF easing (cubic ease-out) with a setTimeout safety net so the final
// value always lands even under throttled frames. Pass `trigger` to let a
// parent drive the reveal (e.g. AnimatedStat shares one observer for the
// number + its sparkline). ASCII only. No em-dash / en-dash.
import React, { useEffect, useRef, useState } from 'react';
import { useInView, prefersReducedMotion } from './useInView';

export default function CountUp({ value, format, dur = 1100, trigger, className = '', style }) {
  const numeric = typeof value === 'number' && isFinite(value);
  const useOwn = trigger === undefined;
  const [ownRef, ownIn] = useInView({ once: true });
  const inView = useOwn ? ownIn : !!trigger;

  const [n, setN] = useState(numeric && !prefersReducedMotion ? 0 : value);
  const fromRef = useRef(numeric ? 0 : value);

  useEffect(() => {
    if (!numeric) { setN(value); fromRef.current = value; return; }
    if (!inView) return;
    if (prefersReducedMotion) { setN(value); fromRef.current = value; return; }

    const from = fromRef.current;
    let raf, startT;
    const step = (t) => {
      if (!startT) startT = t;
      const p = Math.min(1, (t - startT) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    const fb = setTimeout(() => { setN(value); fromRef.current = value; }, dur + 140);
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [numeric, inView, value, dur]);

  const out = numeric
    ? (format ? format(Math.round(n)) : Math.round(n).toLocaleString())
    : n;

  return <span ref={useOwn ? ownRef : undefined} className={className} style={style}>{out}</span>;
}
