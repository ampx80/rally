// Shared animation primitives for the marketing viz components.
// - useReducedMotion: honor prefers-reduced-motion (render final static state).
// - useInView: start/stop looping choreography only while the diagram is on screen.
// - useLoop: a cancellable setTimeout state machine that replays while in view.
// - CountUp: a number that eases to its target when it enters view.
// All motion is transform/opacity/SVG-stroke driven. NO em-dash / en-dash.
import React, { useEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return reduced;
}

// Returns [ref, inView]. inView flips true when at least `threshold` of the node
// is visible and false when it leaves, so loops can pause off screen.
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => setInView(e.isIntersecting)),
      { threshold, rootMargin: '0px 0px 14% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// Drive a looping timeline. `active` gates it (in view + motion allowed).
// `build(T, done)` schedules setTimeout beats via T(fn, ms); call done() at the
// end to schedule a replay after `loopGap`. Everything is cleaned up on exit.
export function useLoop(active, build, deps = [], loopGap = 3600) {
  const timers = useRef([]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const T = (fn, ms) => { const id = setTimeout(() => { if (!cancelled) fn(); }, ms); timers.current.push(id); return id; };
    const done = () => { T(run, loopGap); };
    function run() {
      if (cancelled) return;
      clearAll();
      build(T, done);
    }
    run();
    return () => { cancelled = true; clearAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps]);
}

// A number that counts up to `to` once it scrolls into view.
export function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1100, className, style }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView(0.5);
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) { setVal(to); return; }
    if (!inView) return;
    let start = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setVal(to * ease(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [inView, reduced, to, duration]);
  const shown = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return React.createElement("span",{ref,className,style},prefix,shown,suffix);
}
