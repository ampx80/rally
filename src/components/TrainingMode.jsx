// TrainingMode - the on-screen layer for Ardovo's AI trainer. Two things:
//   1. A pulsing "TRAINING MODE" badge whenever training is active, so it is
//      unmistakable you are in a guided session.
//   2. A spotlight that highlights any element on the page by CSS selector -
//      the trainer (or a training step) fires window event 'rally:highlight'
//      with { selector, label } and this dims the page and rings the target.
//
// Purely presentational + event-driven. Feature-detected, reduced-motion safe.
// NO em-dash / en-dash. ASCII only.
import React, { useEffect, useState, useCallback } from 'react';

// Helper any surface can call (training steps, voice tools, Rook).
export function highlightElement(selector, label = '') {
  try { window.dispatchEvent(new CustomEvent('rally:highlight', { detail: { selector, label } })); } catch {}
}
export function setTrainingMode(on) {
  try { window.dispatchEvent(new CustomEvent('rally:training', { detail: { on: !!on } })); } catch {}
}

export default function TrainingMode() {
  const [on, setOn] = useState(false);
  const [spot, setSpot] = useState(null); // { rect, label }

  useEffect(() => {
    const onTrain = (e) => setOn(!!e.detail?.on);
    window.addEventListener('rally:training', onTrain);
    return () => window.removeEventListener('rally:training', onTrain);
  }, []);

  const place = useCallback((selector, label) => {
    try {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) { setSpot(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Let the scroll settle, then measure.
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) { setSpot(null); return; }
        setSpot({ rect: { top: r.top, left: r.left, width: r.width, height: r.height }, label });
      }, 260);
    } catch { setSpot(null); }
  }, []);

  useEffect(() => {
    const onHi = (e) => place(e.detail?.selector, e.detail?.label || '');
    window.addEventListener('rally:highlight', onHi);
    return () => window.removeEventListener('rally:highlight', onHi);
  }, [place]);

  // Auto-clear the spotlight after a few seconds or on scroll/resize.
  useEffect(() => {
    if (!spot) return;
    const clear = () => setSpot(null);
    const t = setTimeout(clear, 4200);
    window.addEventListener('scroll', clear, { passive: true });
    window.addEventListener('resize', clear);
    return () => { clearTimeout(t); window.removeEventListener('scroll', clear); window.removeEventListener('resize', clear); };
  }, [spot]);

  if (!on && !spot) return null;

  const pad = 8;
  const box = spot ? {
    top: Math.max(4, spot.rect.top - pad), left: Math.max(4, spot.rect.left - pad),
    width: spot.rect.width + pad * 2, height: spot.rect.height + pad * 2,
  } : null;
  const labelBelow = box && box.top < 90;

  return (
    <>
      {on && (
        <div className="tm-badge" role="status" aria-live="polite">
          <span className="tm-badge-dot" /> Training mode
        </div>
      )}

      {spot && box && (
        <div className="tm-spot-layer" aria-hidden>
          <div className="tm-spot-ring" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />
          {spot.label && (
            <div className="tm-spot-label" style={{
              top: labelBelow ? box.top + box.height + 10 : Math.max(8, box.top - 40),
              left: Math.min(Math.max(8, box.left), window.innerWidth - 280),
            }}>{spot.label}</div>
          )}
        </div>
      )}

      <style>{`
      .tm-badge { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 70;
        display: inline-flex; align-items: center; gap: 8px; padding: 7px 15px; border-radius: 999px;
        font-size: 12.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #fff;
        background: linear-gradient(100deg, var(--ai, #7c5cf7), var(--ai-600, #6647e0)); box-shadow: 0 8px 24px -6px rgba(124,92,247,.7);
        animation: tmPulse 2s ease-in-out infinite; }
      .tm-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 0 rgba(255,255,255,.7); animation: tmDot 1.6s ease-out infinite; }
      @keyframes tmPulse { 0%,100% { box-shadow: 0 8px 24px -6px rgba(124,92,247,.6); } 50% { box-shadow: 0 8px 30px -4px rgba(124,92,247,.95); } }
      @keyframes tmDot { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.7); } 70% { box-shadow: 0 0 0 7px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }

      .tm-spot-layer { position: fixed; inset: 0; z-index: 69; pointer-events: none; }
      .tm-spot-ring { position: fixed; border-radius: 12px; border: 2px solid var(--ai, #7c5cf7);
        box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 22px 4px rgba(124,92,247,.7); transition: all .28s cubic-bezier(.22,1,.36,1);
        animation: tmRing 1.6s ease-in-out infinite; }
      @keyframes tmRing { 0%,100% { box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 18px 3px rgba(124,92,247,.6); } 50% { box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 28px 7px rgba(124,92,247,.95); } }
      .tm-spot-label { position: fixed; max-width: 260px; z-index: 71; background: var(--ai-600, #6647e0); color: #fff;
        font-size: 13px; font-weight: 700; line-height: 1.35; padding: 8px 12px; border-radius: 10px; box-shadow: 0 10px 28px -8px rgba(0,0,0,.5); }

      @media (prefers-reduced-motion: reduce) { .tm-badge, .tm-badge-dot, .tm-spot-ring { animation: none !important; } }
      `}</style>
    </>
  );
}
