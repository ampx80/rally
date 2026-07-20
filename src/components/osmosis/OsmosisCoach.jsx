// OsmosisCoach - a single global overlay that delivers just-in-time
// contextual micro-coaching. The parent mounts this once (alongside the
// other global docks); it self-mounts all its behavior through effects and
// renders nothing but fixed-position overlays.
//
// Three surfaces, all non-annoying by design:
//   1. Smart tip bubble - first visit to a mapped route only, one per route
//      per session, remembered in localStorage, easily dismissed, killable
//      via the global toggle.
//   2. Self-contained spotlight - dims the page and rings the key element
//      for the current tip. Built here from scratch (does NOT import
//      TrainingMode).
//   3. "What can I do here?" popover - opens on the global "?" hotkey with
//      three contextual actions for the current route.
//
// Route changes are detected without touching App.jsx: subscribeRoute()
// listens to the patched History API, popstate, and a light interval.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import {
  tipForPath, actionsForPath, routeKeyFor,
  hasSeen, markSeen, wasSessionShown, markSessionShown,
  getEnabled, setEnabled, subscribeEnabled,
  getCurrentPath, subscribeRoute,
  navigateTo, openRook, openSearch,
} from '../../lib/osmosis.js';
import './osmosis.css';

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// First on-page element that matches any candidate selector and is visible.
function resolveEl(selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const s of list) {
    try {
      const el = document.querySelector(s);
      if (el && el.getClientRects && el.getClientRects().length) return el;
    } catch {}
  }
  return null;
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

const KIND_ICON = { rook: 'sparkles', cmdk: 'search', spot: 'eye', nav: 'arrowRight' };

// Always-present product chrome, appended as the last spotlight candidates so
// "Show me" never dims the page with nothing to point at.
const SPOT_FALLBACKS = ['.rl-topbar .btn.btn-primary', '.rl-content', 'main'];
function withFallbacks(sel) {
  const list = Array.isArray(sel) ? sel : [sel];
  return [...list, ...SPOT_FALLBACKS];
}

export default function OsmosisCoach() {
  const [enabled, setEnabledState] = useState(getEnabled());
  const [path, setPath] = useState(getCurrentPath());
  const [bubble, setBubble] = useState(null);      // tip object shown in the bubble
  const [spot, setSpot] = useState(null);          // { sel, label }
  const [spotRect, setSpotRect] = useState(null);  // measured rect of the target
  const [popOpen, setPopOpen] = useState(false);

  // Keep local enabled flag in sync with the global toggle (any surface).
  useEffect(() => subscribeEnabled(setEnabledState), []);

  // Detect route changes without App.jsx. Reset transient UI on navigate.
  useEffect(() => subscribeRoute((p) => {
    setPath(p);
    setSpot(null);
    setPopOpen(false);
  }), []);

  // Decide whether to show a first-visit tip for the current route.
  useEffect(() => {
    setBubble(null);
    if (!enabled) return undefined;
    const tip = tipForPath(path);
    if (!tip) return undefined;
    if (hasSeen(tip.key) || wasSessionShown(tip.key)) return undefined;
    // Small settle delay so the tip never fights the page transition. Re-check
    // everything at fire time in case the user has already moved on.
    const t = setTimeout(() => {
      if (getCurrentPath() !== path || !getEnabled()) return;
      if (hasSeen(tip.key) || wasSessionShown(tip.key)) return;
      markSessionShown(tip.key);
      setBubble(tip);
    }, 900);
    return () => clearTimeout(t);
  }, [path, enabled]);

  // Track the spotlight target's rect while the spotlight is open.
  useEffect(() => {
    if (!spot) { setSpotRect(null); return undefined; }
    const el = resolveEl(spot.sel);
    if (el) {
      try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); } catch {}
    }
    const update = () => {
      const found = resolveEl(spot.sel);
      if (!found) { setSpotRect(null); return; }
      const r = found.getBoundingClientRect();
      setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    const onWin = () => update();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    const iv = setInterval(update, 400);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
      clearInterval(iv);
    };
  }, [spot]);

  // Global "?" hotkey + Escape handling.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (spot) { setSpot(null); e.stopPropagation(); }
        else if (popOpen) { setPopOpen(false); e.stopPropagation(); }
        else if (bubble) { setBubble(null); }
        return;
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        setSpot(null);
        setPopOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spot, popOpen, bubble]);

  const openSpotlight = (sel, label) => {
    setBubble(null);
    setPopOpen(false);
    setSpot({ sel: withFallbacks(sel), label });
  };

  const runAction = (a) => {
    setPopOpen(false);
    if (a.kind === 'rook') return openRook();
    if (a.kind === 'cmdk') return openSearch();
    if (a.kind === 'nav') return navigateTo(a.to);
    if (a.kind === 'spot') return openSpotlight(a.sel, a.label);
  };

  const dismissBubble = () => setBubble(null);
  const gotIt = () => { if (bubble) markSeen(bubble.key); setBubble(null); };
  const showMe = () => {
    if (!bubble) return;
    markSeen(bubble.key);
    openSpotlight(bubble.spot, bubble.spotLabel || bubble.title);
  };

  const currentTip = tipForPath(path);
  const actions = actionsForPath(path);

  return (
    <>
      {/* ---------- Smart tip bubble ---------- */}
      {enabled && bubble && !spot && !popOpen && (
        <div className="osm-bubble" role="status" aria-live="polite">
          <div className="osm-bubble__top">
            <span className="osm-bubble__mark"><Icon name="sparkles" size={16} /></span>
            <div className="col" style={{ minWidth: 0, lineHeight: 1.15 }}>
              <span className="osm-bubble__eyebrow">Smart tip</span>
              <span className="osm-bubble__title">{bubble.title}</span>
            </div>
            <button className="osm-bubble__close" onClick={dismissBubble} aria-label="Dismiss tip">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="osm-bubble__body">{bubble.tip}</div>
          <div className="osm-bubble__row">
            <button className="osm-btn osm-btn--primary" onClick={showMe}>
              <Icon name="eye" size={14} /> Show me
            </button>
            <button className="osm-btn osm-btn--ghost" onClick={gotIt}>Got it</button>
            <span className="osm-bubble__hint">
              <span className="osm-kbd">?</span> for more
            </span>
          </div>
        </div>
      )}

      {/* ---------- Spotlight ---------- */}
      {spot && spotRect && (
        <>
          <div className="osm-spot-scrim" onClick={() => setSpot(null)} aria-hidden="true" />
          <div
            className="osm-spot-hole"
            style={{
              top: Math.max(4, spotRect.top - 6),
              left: Math.max(4, spotRect.left - 6),
              width: spotRect.width + 12,
              height: spotRect.height + 12,
            }}
          />
          <SpotTip rect={spotRect} label={spot.label} onDone={() => setSpot(null)} />
        </>
      )}

      {/* ---------- "What can I do here?" popover ---------- */}
      {popOpen && (
        <>
          <div className="osm-pop-scrim" onClick={() => setPopOpen(false)} aria-hidden="true" />
          <div className="osm-pop" role="dialog" aria-modal="true" aria-label="What can I do here?">
            <div className="osm-pop__head">
              <span className="osm-bubble__mark"><Icon name="sparkles" size={16} /></span>
              <div className="col" style={{ minWidth: 0 }}>
                <span className="osm-pop__head-title">What can I do here?</span>
                <span className="osm-pop__head-sub">
                  {currentTip ? currentTip.title : 'Ardovo'}
                </span>
              </div>
              <button className="osm-pop__close" onClick={() => setPopOpen(false)} aria-label="Close">
                <Icon name="x" size={17} />
              </button>
            </div>
            <div className="osm-pop__list">
              {actions.map((a, i) => (
                <button key={i} className="osm-pop__item" onClick={() => runAction(a)}>
                  <span className="osm-pop__ico"><Icon name={KIND_ICON[a.kind] || 'chevronRight'} size={16} /></span>
                  <span className="osm-pop__label">{a.label}</span>
                  <span className="osm-pop__chev"><Icon name="chevronRight" size={16} /></span>
                </button>
              ))}
            </div>
            <div className="osm-pop__foot">
              <span>Tips teach features as you explore.</span>
              <button
                className="osm-toggle"
                onClick={() => setEnabled(!enabled)}
                aria-pressed={enabled}
                aria-label={enabled ? 'Turn tips off' : 'Turn tips on'}
                title={enabled ? 'Turn tips off' : 'Turn tips on'}
              >
                Tips {enabled ? 'on' : 'off'}
                <span className={`osm-toggle__track${enabled ? ' is-on' : ''}`}>
                  <span className="osm-toggle__knob" />
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Spotlight caption. Positions itself below the target when there is room,
// otherwise above; horizontally clamped to the viewport.
function SpotTip({ rect, label, onDone }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const b = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    const belowTop = rect.top + rect.height + gap;
    const fitsBelow = belowTop + b.height + 8 < vh;
    const top = fitsBelow ? belowTop : Math.max(8, rect.top - b.height - gap);
    let left = rect.left + rect.width / 2 - b.width / 2;
    left = Math.max(8, Math.min(left, vw - b.width - 8));
    setPos({ top, left });
  }, [rect, label]);

  return (
    <div
      ref={ref}
      className="osm-spot-tip"
      role="dialog"
      aria-label={label}
      style={pos ? { top: pos.top, left: pos.left, visibility: 'visible' } : { top: -9999, left: -9999, visibility: 'hidden' }}
      onClick={onDone}
    >
      {label}
      <span className="osm-spot-tip__hint">Click anywhere to close</span>
    </div>
  );
}
