// Shared in-view hook for the Ardovo in-app motion system, built to NEVER
// leave content hidden. Three layers, in order:
//   1. A synchronous first-paint bounding-rect check so anything already on
//      (or near) screen reveals immediately, with no wait for the observer.
//   2. An IntersectionObserver for true scroll-triggered reveals, fired
//      EARLY via a positive bottom rootMargin so content is not delayed.
//   3. A scroll fallback + safety timer so that even in environments where
//      the observer callback never runs (throttled / offscreen render
//      contexts), content still reveals - hidden content is never acceptable.
// prefers-reduced-motion reports in-view instantly. ASCII only. No em/en dash.
import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EARLY = 0.18; // reveal a beat before the element reaches the fold

export function useInView({
  rootMargin = '0px 0px 18% 0px', // positive bottom => fire early
  threshold = 0,
  once = true,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) { setInView(true); return; }
    const el = ref.current;
    if (!el) { setInView(true); return; }

    let done = false;
    const reveal = () => { if (!done) { done = true; setInView(true); } };

    // Layer 1: is it already visible (with the early margin)? Reveal now.
    const visibleNow = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const margin = vh * EARLY;
      return r.bottom > 0 && r.top < vh + margin && r.right > 0 && r.left < vw;
    };
    if (visibleNow()) { reveal(); return; }

    // Layer 2: observe for scroll-in.
    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { reveal(); if (once) io.unobserve(entry.target); }
          else if (!once) setInView(false);
        }
      }, { rootMargin, threshold });
      io.observe(el);
    }

    // Layer 3: scroll fallback (works even if the observer never fires) plus a
    // safety timer so content can never be stranded hidden.
    const onScroll = () => { if (visibleNow()) { reveal(); cleanupScroll(); } };
    const cleanupScroll = () => window.removeEventListener('scroll', onScroll, true);
    window.addEventListener('scroll', onScroll, true);
    const fb = setTimeout(reveal, io ? 1600 : 0);

    return () => { if (io) io.disconnect(); clearTimeout(fb); cleanupScroll(); };
  }, [rootMargin, threshold, once]);

  return [ref, inView];
}
