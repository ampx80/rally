// Count-up + reduced-motion helpers for the Command Center cockpit.
// Kept local to the home surface so the shared UI kit stays untouched.
// The existing UI.jsx useCountUp is not exported, so we own a small
// version here that also honors prefers-reduced-motion.
import React, { useEffect, useState } from 'react';

/* Live-reactive prefers-reduced-motion flag. */
export function useReducedMotion() {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const [reduced, setReduced] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return reduced;
}

/* Flips false -> true one frame after mount. Handy to drive width/height
   transitions from a zero baseline (progress bars, etc.). */
export function useMounted() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return ready;
}

/* Ease-out count from 0 to `value` on mount (and whenever value changes).
   Non-numeric values render as-is. rAF with a timeout backstop so the final
   value always lands even if frames are throttled. */
export function useCountUp(value, { dur = 1100, delay = 0 } = {}) {
  const numeric = typeof value === 'number' && isFinite(value);
  const reduced = useReducedMotion();
  const [n, setN] = useState(numeric && !reduced ? 0 : value);
  useEffect(() => {
    if (!numeric || reduced) { setN(value); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const id = setTimeout(() => { raf = requestAnimationFrame(step); }, delay);
    const fb = setTimeout(() => setN(value), delay + dur + 90);
    return () => { clearTimeout(id); clearTimeout(fb); cancelAnimationFrame(raf); };
  }, [value, numeric, reduced, dur, delay]);
  return numeric ? n : value;
}

/* Formatted count-up number. Pass a format fn (e.g. moneyK). */
export function CountNumber({ value, format, dur, delay, className, style }) {
  const n = useCountUp(value, { dur, delay });
  const out = typeof n === 'number'
    ? (format ? format(n) : Math.round(n).toLocaleString())
    : n;
  return <span className={className} style={style}>{out}</span>;
}
