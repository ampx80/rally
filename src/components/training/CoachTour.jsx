// CoachTour - the unrushed, voice-led guided walkthrough. Someone who does not
// know software can pick a module and be walked through it one step at a time:
// the coach navigates to the right screen, HIGHLIGHTS the exact element while
// it talks (out loud via TTS), and WAITS. Nothing auto-advances - the learner
// moves at their own pace with Back / Next, and can click the real UI the whole
// time (the highlight never blocks it). Finishing marks the module complete.
//
// Global + event-driven: fire window 'rally:coach' with { moduleId } to start.
// Feature-detected TTS, reduced-motion safe. NO em-dash / en-dash. ASCII only.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { celebrate } from '../../lib/celebrate.js';
import { getModule, markStepDone, logStep, logAsk, markModuleComplete } from '../../lib/training.js';

const ttsOK = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function CoachTour() {
  const nav = useNavigate();
  const loc = useLocation();
  const [tour, setTour] = useState(null);      // { module, i }
  const [anchor, setAnchor] = useState(null);   // { top,left,width,height } or null (centered)
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const tourRef = useRef(null);
  useEffect(() => { tourRef.current = tour; }, [tour]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const speak = useCallback((text) => {
    if (!ttsOK || mutedRef.current || !text) { setSpeaking(false); return; }
    try {
      const s = window.speechSynthesis; s.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[*_`#>]/g, '').slice(0, 320));
      u.rate = 1.0; u.pitch = 1.02;
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      s.speak(u);
    } catch { setSpeaking(false); }
  }, []);

  const measure = useCallback((selector) => {
    if (!selector) { setAnchor(null); return; }
    let el = null;
    try { el = document.querySelector(selector); } catch { el = null; }
    if (!el) { setAnchor(null); return; }
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch {}
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { setAnchor(null); return; }
    setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  const showStep = useCallback((mod, i) => {
    const step = mod.steps[i];
    if (!step) return;
    const needNav = step.to && step.to !== window.location.pathname;
    if (needNav) nav(step.to);
    // Let the destination render, then locate + narrate.
    const delay = needNav ? 650 : 160;
    setTimeout(() => {
      measure(step.highlight);
      setTimeout(() => measure(step.highlight), 500); // second pass after layout settles
      speak(step.detail || step.title);
    }, delay);
  }, [nav, measure, speak]);

  const start = useCallback((moduleId) => {
    const module = getModule(moduleId);
    if (!module || !module.steps?.length) return;
    try { window.dispatchEvent(new CustomEvent('rally:training', { detail: { on: true } })); } catch {}
    setTour({ module, i: 0 });
    setTimeout(() => showStep(module, 0), 60);
  }, [showStep]);

  useEffect(() => {
    const onCoach = (e) => { const id = e.detail?.moduleId; if (id) start(id); };
    window.addEventListener('rally:coach', onCoach);
    return () => window.removeEventListener('rally:coach', onCoach);
  }, [start]);

  // Keep the highlight glued to the element as the page scrolls/resizes.
  useEffect(() => {
    if (!tour) return;
    const reposition = () => {
      const step = tour.module.steps[tour.i];
      if (!step?.highlight) return;
      try { const el = document.querySelector(step.highlight); if (el) { const r = el.getBoundingClientRect(); setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height }); } } catch {}
    };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition);
    return () => { window.removeEventListener('scroll', reposition); window.removeEventListener('resize', reposition); };
  }, [tour]);

  const exit = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    try { window.dispatchEvent(new CustomEvent('rally:training', { detail: { on: false } })); } catch {}
    setTour(null); setAnchor(null); setSpeaking(false);
  }, []);

  const go = useCallback((dir) => {
    const t = tourRef.current; if (!t) return;
    const step = t.module.steps[t.i];
    // Record the step just completed when moving forward.
    if (dir > 0 && step) { logStep(t.module.id, step.title); markStepDone(t.module.id, t.i); if (step.ask) logAsk(step.ask); }
    const ni = t.i + dir;
    if (ni < 0) return;
    if (ni >= t.module.steps.length) {
      markModuleComplete(t.module.id);
      try { celebrate({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 80 }); } catch {}
      exit();
      return;
    }
    setTour({ ...t, i: ni });
    showStep(t.module, ni);
  }, [showStep, exit]);

  // Keyboard: arrows + escape for accessibility / power users.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') { e.preventDefault(); exit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, go, exit]);

  if (!tour) return null;
  const { module: mod, i } = tour;
  const step = mod.steps[i];
  const last = i === mod.steps.length - 1;

  // Coach card placement: below the anchor if room, else above, else bottom-center.
  const pad = 10;
  let ring = null, cardStyle = { left: '50%', bottom: 28, transform: 'translateX(-50%)' };
  if (anchor) {
    ring = { top: Math.max(4, anchor.top - pad), left: Math.max(4, anchor.left - pad), width: anchor.width + pad * 2, height: anchor.height + pad * 2 };
    const below = anchor.top + anchor.height + 320 < window.innerHeight;
    const cardLeft = Math.min(Math.max(16, anchor.left), window.innerWidth - 380);
    cardStyle = below
      ? { top: anchor.top + anchor.height + 16, left: cardLeft }
      : { top: Math.max(16, anchor.top - 300), left: cardLeft };
  }

  return (
    <div className="co-root" role="dialog" aria-label="Guided training">
      {/* dim + persistent highlight ring (pointer-events none: the learner can click the real element) */}
      {ring && <div className="co-ring" style={ring} aria-hidden />}
      {!ring && <div className="co-dim" aria-hidden />}

      <div className="co-card" style={cardStyle}>
        <div className="co-card-head">
          <span className="co-mark" data-speaking={speaking}>
            <Icon name="sparkles" size={15} />
            {speaking && <span className="co-wave"><i /><i /><i /></span>}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="co-eyebrow">{mod.title} - step {i + 1} of {mod.steps.length}</div>
            <div className="co-title">{step.title}</div>
          </div>
          <button className="co-x" onClick={exit} aria-label="Exit training"><Icon name="x" size={16} /></button>
        </div>

        {step.detail && <div className="co-detail">{step.detail}</div>}

        {step.ask && (
          <button className="co-show" onClick={() => { logAsk(step.ask); window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt: step.ask, training: true } })); }}>
            <Icon name="sparkles" size={13} /> Show me: "{step.ask}"
          </button>
        )}

        <div className="co-dots">
          {mod.steps.map((_, d) => <span key={d} className={`co-dot${d === i ? ' is-on' : ''}${d < i ? ' is-done' : ''}`} />)}
        </div>

        <div className="co-foot">
          <div className="co-pace">Take your time. Continue when you are ready.</div>
          <div className="co-controls">
            {ttsOK && <button className="co-btn co-btn-ghost" onClick={() => setMuted(m => !m)} title={muted ? 'Unmute voice' : 'Mute voice'}><Icon name={muted ? 'volumeX' : 'volume2'} size={15} /></button>}
            {ttsOK && !muted && <button className="co-btn co-btn-ghost" onClick={() => speak(step.detail || step.title)} title="Replay"><Icon name="rotateCcw" size={15} /></button>}
            <button className="co-btn co-btn-ghost" onClick={() => go(-1)} disabled={i === 0}>Back</button>
            <button className="co-btn co-btn-primary" onClick={() => go(1)}>{last ? 'Finish' : 'Next'} <Icon name="chevronRight" size={15} /></button>
          </div>
        </div>
      </div>

      <CoachStyles />
    </div>
  );
}

function CoachStyles() {
  return (
    <style>{`
    .co-root { position: fixed; inset: 0; z-index: 80; pointer-events: none; }
    .co-dim { position: fixed; inset: 0; background: rgba(13,15,25,.42); }
    .co-ring { position: fixed; border-radius: 12px; border: 2px solid var(--ai, #7c5cf7); pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 26px 6px rgba(124,92,247,.75); transition: all .3s cubic-bezier(.22,1,.36,1);
      animation: coRing 1.8s ease-in-out infinite; }
    @keyframes coRing { 0%,100% { box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 20px 4px rgba(124,92,247,.6); } 50% { box-shadow: 0 0 0 9999px rgba(13,15,25,.5), 0 0 32px 9px rgba(124,92,247,.95); } }

    .co-card { position: fixed; width: min(360px, calc(100vw - 32px)); z-index: 82; pointer-events: auto;
      background: var(--paper, #fff); border: 1px solid var(--line, #e5e9ed); border-radius: 16px; padding: 16px;
      box-shadow: 0 30px 70px -22px rgba(16,20,30,.55), 0 0 0 1px rgba(124,92,247,.15); animation: coIn .28s cubic-bezier(.22,1,.36,1); }
    @keyframes coIn { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
    .co-card-head { display: flex; align-items: flex-start; gap: 10px; }
    .co-mark { position: relative; width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai, #7c5cf7), var(--ai-600, #6647e0)); box-shadow: var(--ai-glow, 0 8px 24px rgba(124,92,247,.28)); }
    .co-mark[data-speaking="true"] { animation: coPulse 1.4s ease-in-out infinite; }
    @keyframes coPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(124,92,247,.5); } 50% { box-shadow: 0 0 0 6px rgba(124,92,247,0); } }
    .co-wave { position: absolute; bottom: -3px; right: -3px; display: inline-flex; gap: 1.5px; align-items: flex-end; height: 10px; background: var(--paper,#fff); border-radius: 4px; padding: 1px 2px; }
    .co-wave i { width: 2px; background: var(--ai, #7c5cf7); border-radius: 2px; animation: coBar .8s ease-in-out infinite; }
    .co-wave i:nth-child(1){ height: 5px; } .co-wave i:nth-child(2){ height: 9px; animation-delay: .15s; } .co-wave i:nth-child(3){ height: 4px; animation-delay: .3s; }
    @keyframes coBar { 0%,100% { transform: scaleY(.5); } 50% { transform: scaleY(1); } }
    .co-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--ai-600, #6647e0); }
    .co-title { font-size: 16px; font-weight: 800; color: var(--ink, #10141e); line-height: 1.25; margin-top: 2px; }
    .co-x { border: none; background: transparent; color: var(--n-400, #98a1b0); cursor: pointer; padding: 3px; border-radius: 7px; flex: none; }
    .co-x:hover { background: var(--n-100, #eee); color: var(--ink); }
    .co-detail { font-size: 14px; line-height: 1.55; color: var(--ink-2, #454c5e); margin-top: 10px; }
    .co-show { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-family: inherit; font-size: 12.5px; font-weight: 700;
      color: var(--ai-600, #6647e0); background: var(--ai-50, #f0ecfe); border: 1px solid rgba(124,92,247,.28); border-radius: 9px; padding: 7px 11px; cursor: pointer; }
    .co-dots { display: flex; gap: 5px; margin: 14px 0 12px; flex-wrap: wrap; }
    .co-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--n-200, #d7dce3); }
    .co-dot.is-done { background: var(--ai-600, #6647e0); }
    .co-dot.is-on { background: var(--ai, #7c5cf7); box-shadow: 0 0 0 3px rgba(124,92,247,.2); }
    .co-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .co-pace { font-size: 11.5px; color: var(--n-400, #98a1b0); max-width: 120px; line-height: 1.3; }
    .co-controls { display: flex; align-items: center; gap: 6px; }
    .co-btn { display: inline-flex; align-items: center; gap: 4px; font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; border-radius: 9px; padding: 8px 12px; border: 1px solid var(--line-strong, #d0d6de); background: var(--paper, #fff); color: var(--ink, #10141e); }
    .co-btn-ghost { padding: 8px 10px; color: var(--n-600, #5b6474); }
    .co-btn-ghost:hover { color: var(--ink); border-color: var(--ai, #7c5cf7); }
    .co-btn-primary { border-color: transparent; color: #fff; background: linear-gradient(100deg, var(--ai, #7c5cf7), var(--ai-600, #6647e0)); box-shadow: var(--ai-glow, 0 8px 24px rgba(124,92,247,.28)); }
    .co-btn:disabled { opacity: .5; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .co-ring, .co-mark, .co-wave i, .co-card { animation: none !important; } }
    `}</style>
  );
}
