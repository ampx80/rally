// Ardovo accessibility toolkit. Additive, framework-light hooks the product
// surfaces (Modal, CommandK, RookDock, toasts, route changes) can adopt to hit
// WCAG 2.1 AA keyboard + screen-reader behavior. No dependencies beyond React.
// ASCII only. NO em-dash / en-dash.

import { useEffect, useRef, useCallback, useState } from 'react';

// Elements that can receive keyboard focus. Used by the focus trap and by any
// caller that needs to find the first/last tabbable node in a region.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
  );
}

/*
  useFocusTrap(ref, active)
  Traps Tab / Shift+Tab focus inside the referenced container while `active`.
  On activate: remembers the previously focused element and moves focus to the
  first focusable node inside (or the container itself). On deactivate: restores
  focus to where it was, so dismissing a dialog returns the user to the trigger.

  Usage:
    const ref = useRef(null);
    useFocusTrap(ref, open);
    return open ? <div ref={ref} role="dialog" aria-modal="true">...</div> : null;
*/
export function useFocusTrap(ref, active = true) {
  const prevFocus = useRef(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    prevFocus.current = document.activeElement;

    const focusFirst = () => {
      const items = getFocusable(node);
      if (items.length) items[0].focus();
      else {
        node.setAttribute('tabindex', '-1');
        node.focus();
      }
    };
    // Defer so the node is painted (matches CommandK's setTimeout-to-focus).
    const t = setTimeout(focusFirst, 20);

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable(node);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) { e.preventDefault(); last.focus(); }
      } else {
        if (activeEl === last || !node.contains(activeEl)) { e.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      node.removeEventListener('keydown', onKey);
      const prev = prevFocus.current;
      if (prev && typeof prev.focus === 'function') {
        // Restore focus to the trigger on close.
        setTimeout(() => prev.focus(), 0);
      }
    };
  }, [ref, active]);
}

/*
  useEscapeKey(handler, active)
  Calls `handler` on Escape while active. Registered on document (capture-free)
  so it works no matter where focus sits inside the dialog. Handler ref is kept
  fresh without re-binding the listener.
*/
export function useEscapeKey(handler, active = true) {
  const cb = useRef(handler);
  cb.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === 'Escape') cb.current?.(e); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}

// -------- aria-live announcer (singleton regions) --------
// One polite region + one assertive region are lazily appended to <body>.
// announce(msg) updates the region text; screen readers read it without moving
// focus. Use for toasts, route-change titles, async results, filter counts.
let politeRegion = null;
let assertiveRegion = null;

function ensureRegion(assertive) {
  if (typeof document === 'undefined') return null;
  const existing = assertive ? assertiveRegion : politeRegion;
  if (existing && document.body.contains(existing)) return existing;
  const el = document.createElement('div');
  el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', assertive ? 'alert' : 'status');
  // Visually hidden but available to assistive tech. Inline so it needs no CSS.
  el.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);border:0;white-space:nowrap;';
  document.body.appendChild(el);
  if (assertive) assertiveRegion = el; else politeRegion = el;
  return el;
}

export function announce(message, { assertive = false } = {}) {
  const region = ensureRegion(assertive);
  if (!region) return;
  // Clear first so repeating the same string still re-announces.
  region.textContent = '';
  window.requestAnimationFrame(() => { region.textContent = String(message); });
}

/*
  useAnnouncer()
  Returns a stable announce(message, { assertive }) callback. Thin wrapper over
  the module-level announcer so components get a hook-friendly API.

  Route-change usage (in App, on location change):
    const say = useAnnouncer();
    useEffect(() => { say(document.title || 'Page changed'); }, [pathname]);

  Toast usage (drop-in for useToast in UI.jsx):
    say('Deal saved', { assertive: true });
*/
export function useAnnouncer() {
  return useCallback((message, opts) => announce(message, opts), []);
}

// -------- prefers-reduced-motion --------
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
  usePrefersReducedMotion()
  Live boolean that flips if the OS setting changes. Use to short-circuit
  JS-driven animation (count-up numbers, animated sparkline transitions) that
  the CSS @media block cannot reach.

    const reduced = usePrefersReducedMotion();
    if (reduced) { setN(value); return; } // skip the rAF tween
*/
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
