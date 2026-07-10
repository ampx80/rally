// Shared motion hooks for the viz2 marketing visuals. Reduced-motion aware,
// IntersectionObserver-gated, rAF count-up. No em-dash / en-dash.
import { useEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return reduced;
}

// Attach the returned ref to an element. `inView` flips true once, when it
// first scrolls into view. Great for one-shot entrance choreography.
export function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.unobserve(el); } });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px', ...(options || {}) });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

// Count from `start` to `target` when the ref scrolls into view. Returns
// [ref, value]. Honors reduced motion by snapping to the target.
export function useCountUp(target, opts) {
  const { duration = 1500, start = 0 } = opts || {};
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [val, setVal] = useState(reduced ? target : start);
  useEffect(() => {
    if (reduced) { setVal(target); return; }
    if (!inView) return;
    let raf;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const tick = () => {
      const p = Math.min(1, (now() - t0) / duration);
      setVal(start + (target - start) * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, target, duration, start]);
  return [ref, val];
}

// Reveal children one after another after the container enters view. Returns
// [ref, step] where step counts up 0..count. Used for ticking checklists,
// staging card assembly, timeline nodes lighting up.
export function useStagger(count, opts) {
  const { interval = 140, initialDelay = 120 } = opts || {};
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [step, setStep] = useState(reduced ? count : 0);
  useEffect(() => {
    if (reduced) { setStep(count); return; }
    if (!inView) return;
    const timers = [];
    for (let i = 1; i <= count; i++) {
      timers.push(setTimeout(() => setStep(i), initialDelay + i * interval));
    }
    return () => timers.forEach(clearTimeout);
  }, [inView, reduced, count, interval, initialDelay]);
  return [ref, step];
}
