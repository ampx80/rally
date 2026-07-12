// Cinematic Deal Film - the screening room.
//
// Turns any deal (or the whole quarter) into a scored, narrated,
// scene-by-scene film built from its REAL history: the cold open, the
// committee assembling, the stage advances, the risk or the save, the
// verdict, and (on a loss) a forensic autopsy. Every frame ties back to a
// real record via src/lib/deal-film.js (pure, read-only). This page is the
// projector: a timed scene player with kinetic typography, an animated
// value/probability curve with a moving playhead, a POV re-cut selector,
// a timeline scrubber, optional SpeechSynthesis voiceover, and a
// downloadable still-frame poster.
//
// 60fps, GPU-only motion. Under prefers-reduced-motion it falls back to a
// static storyboard (every scene laid out at once, no autoplay). Purely
// additive: reads the live store; writes nothing. ASCII only, hyphen only.
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageTitle, Card, Button, Badge, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { useStore, getDeals } from '../lib/store.js';
import { useDepth } from '../lib/store-depth.js';
import {
  buildDealFilm, buildQuarterFilm, listFilmableDeals, recutNarration, filmDuration,
} from '../lib/deal-film.js';
import { celebrate } from '../lib/celebrate.js';
import './deal-film.css';

/* stage-local bright tones (the cinema is always dark, in both app themes) */
const TONE = { accent: '#7c6cff', ok: '#34d399', warn: '#fbbf24', risk: '#fb7185', neutral: '#9aa4b8', info: '#38bdf8' };
const toneColor = (t) => TONE[t] || TONE.accent;
const outcomeTone = (o) => (o === 'won' ? 'ok' : o === 'lost' ? 'risk' : 'accent');
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, f) => a + (b - a) * f;

function usePrefersReducedMotion() {
  const [r, setR] = useState(() => typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => setR(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return r;
}

/* ============================================================
   CURVE  - animated probability journey with a moving playhead
   ============================================================ */
function CurveChart({ curve, revealFrac, big = false }) {
  const pathRef = useRef(null);
  const [len, setLen] = useState(0);
  const W = 300, H = big ? 150 : 120, padX = 16, padY = 18;
  const geom = useMemo(() => {
    const n = curve.length;
    const xs = curve.map((_, i) => (n <= 1 ? W / 2 : padX + (W - 2 * padX) * (i / (n - 1))));
    const ys = curve.map((c) => (H - padY) - (H - 2 * padY) * (clamp01((c.prob || 0) / 100)));
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L ${xs[n - 1].toFixed(1)} ${H - padY} L ${xs[0].toFixed(1)} ${H - padY} Z`;
    return { xs, ys, line, area, n };
  }, [curve, H]);

  useEffect(() => {
    if (pathRef.current) { try { setLen(pathRef.current.getTotalLength()); } catch { setLen(0); } }
  }, [geom.line]);

  const rf = clamp01(revealFrac);
  const t = rf * (geom.n - 1);
  const i = Math.min(geom.n - 2, Math.max(0, Math.floor(t)));
  const f = geom.n <= 1 ? 0 : t - i;
  const px = geom.n <= 1 ? geom.xs[0] : lerp(geom.xs[i], geom.xs[i + 1], f);
  const py = geom.n <= 1 ? geom.ys[0] : lerp(geom.ys[i], geom.ys[i + 1], f);
  const reachedTo = Math.round(t + 0.0001);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={big ? 150 : 120} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id="dfArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--df-tone)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--df-tone)" stopOpacity="0" />
        </linearGradient>
        <clipPath id="dfReveal"><rect x="0" y="0" width={padX + (W - 2 * padX) * rf + 2} height={H} /></clipPath>
      </defs>
      {/* baseline */}
      <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      {/* filled area (revealed) */}
      <path d={geom.area} fill="url(#dfArea)" clipPath="url(#dfReveal)" />
      {/* full ghost line */}
      <path d={geom.line} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* revealed line via dashoffset */}
      <path ref={pathRef} d={geom.line} fill="none" stroke="var(--df-tone)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray={len || 1} strokeDashoffset={(len || 0) * (1 - rf)} style={{ filter: 'drop-shadow(0 0 6px var(--df-tone))' }} />
      {/* nodes */}
      {geom.xs.map((x, idx) => {
        const reached = idx <= reachedTo;
        const c = toneColor(curve[idx]?.tone);
        return (
          <circle key={idx} cx={x} cy={geom.ys[idx]} r={reached ? 3.4 : 2.4}
            fill={reached ? c : '#20283a'} stroke={reached ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.18)'} strokeWidth={reached ? 1.2 : 1} />
        );
      })}
      {/* playhead */}
      <circle className="df-curve-tip" cx={px} cy={py} r="5.5" fill="#fff" />
      <circle cx={px} cy={py} r="9" fill="none" stroke="var(--df-tone)" strokeWidth="1.5" opacity="0.55" />
    </svg>
  );
}

/* ============================================================
   SCENE  - kinetic typography + big stat
   ============================================================ */
function SceneView({ scene, animate }) {
  const words = String(scene.title || '').split(' ');
  return (
    <div className={`df-scene${animate ? ' df-anim' : ''}`}>
      <div className="df-scene-inner">
        {scene.eyebrow && (
          <div className="df-eyebrow">
            <span className="df-badge"><Icon name={scene.icon || 'sparkles'} size={15} /></span>
            {scene.eyebrow}
          </div>
        )}
        <h2 className="df-title">
          {words.map((w, i) => (
            <span key={i} className="df-word" style={{ animationDelay: `${0.06 * i + 0.05}s` }}>{w}{i < words.length - 1 ? ' ' : ''}</span>
          ))}
        </h2>
        {scene.headline && <div className="df-headline">{scene.headline}</div>}
        {scene.chips && scene.chips.length > 0 && (
          <div className="df-chips">
            {scene.chips.map((c, i) => (
              <span key={i} className="df-chip" style={{ animationDelay: `${0.1 + 0.06 * i}s` }}>{c}</span>
            ))}
          </div>
        )}
        {scene.lessons && scene.lessons.length > 0 && (
          <div className="df-lessons">
            {scene.lessons.map((l, i) => (
              <div key={i} className="df-lesson" style={{ animationDelay: `${0.14 + 0.1 * i}s` }}>
                <b>{i + 1}</b><span>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {scene.stat && (
        <div className="df-stat">
          <div className="df-stat-value">{scene.stat.value}</div>
          <div className="df-stat-label">{scene.stat.label}</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PLAYER
   ============================================================ */
function Player({ film, reduced }) {
  const toast = useToast();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0);      // 0..1 within current scene
  const [playing, setPlaying] = useState(!reduced);
  const [pov, setPov] = useState(film.defaultPov);
  const [voice, setVoice] = useState(false);
  const elapsedRef = useRef(0);
  const celebratedRef = useRef({});

  const scenes = film.scenes;
  const scene = scenes[sceneIdx] || scenes[0];
  const tone = toneColor(scene.tone);
  const hasVoice = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Narration per POV (deterministic), or an AI re-cut when fetched.
  const [aiCut, setAiCut] = useState(null);           // { [pov]: string[] }
  const [aiLoading, setAiLoading] = useState(false);
  const baseNar = useMemo(() => recutNarration(film, pov), [film, pov]);
  const narration = (aiCut && aiCut[pov]) || baseNar;
  const captionText = narration[sceneIdx] || '';

  // carry-forward curve target per scene
  const targets = useMemo(() => {
    let last = 0;
    return scenes.map((s) => { if (s.curveIndex != null) last = s.curveIndex; return last; });
  }, [scenes]);
  const fromT = sceneIdx === 0 ? 0 : targets[sceneIdx - 1];
  const revealNode = lerp(fromT, targets[sceneIdx], easeInOut(progress));
  const revealFrac = film.curve.length > 1 ? revealNode / (film.curve.length - 1) : 1;

  const goTo = useCallback((i) => {
    const n = Math.max(0, Math.min(scenes.length - 1, i));
    elapsedRef.current = 0;
    setProgress(0);
    setSceneIdx(n);
  }, [scenes.length]);

  const restart = useCallback(() => { goTo(0); setPlaying(!reduced); }, [goTo, reduced]);

  // reset when the film changes
  useEffect(() => { elapsedRef.current = 0; setSceneIdx(0); setProgress(0); setPov(film.defaultPov); setAiCut(null); setPlaying(!reduced); }, [film, reduced]);

  // rAF clock for the current scene
  useEffect(() => {
    if (!playing || reduced) return;
    const dur = scene.duration || 4800;
    let raf = 0;
    let start = performance.now() - elapsedRef.current;
    const loop = (now) => {
      const el = now - start;
      if (el >= dur) {
        elapsedRef.current = 0;
        setProgress(1);
        setSceneIdx((i) => {
          if (i < scenes.length - 1) return i + 1;
          setPlaying(false);
          return i;
        });
        return;
      }
      elapsedRef.current = el;
      setProgress(el / dur);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, sceneIdx, scene, scenes.length, reduced]);

  // celebrate on the win verdict
  useEffect(() => {
    if (reduced || !playing) return;
    if (scene.celebrate && !celebratedRef.current[sceneIdx]) {
      celebratedRef.current[sceneIdx] = true;
      try { celebrate({ count: 130, spread: 1.2 }); } catch {}
    }
  }, [sceneIdx, scene, playing, reduced]);

  // SpeechSynthesis voiceover, tied to the active scene while playing
  useEffect(() => {
    if (!hasVoice) return;
    window.speechSynthesis.cancel();
    if (!voice || !playing || reduced) return;
    const text = narration[sceneIdx];
    if (!text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch {}
    return () => { try { window.speechSynthesis.cancel(); } catch {} };
  }, [sceneIdx, voice, playing, pov, aiCut, reduced, hasVoice]);

  useEffect(() => () => { if (hasVoice) { try { window.speechSynthesis.cancel(); } catch {} } }, [hasVoice]);

  // Optional: ask Rook (Claude) to re-narrate. Falls back silently offline.
  const rookNarrate = useCallback(async () => {
    setAiLoading(true);
    try {
      const payload = {
        title: film.title, subtitle: film.subtitle, kind: film.kind, outcome: film.outcome,
        facts: film.facts,
        povs: film.povs.map((p) => p.id),
        scenes: scenes.map((s) => ({ kind: s.kind, eyebrow: s.eyebrow, title: s.title, headline: s.headline, base: s.narration?.rep || '' })),
      };
      const r = await fetch('/api/deal-film', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('offline');
      const data = await r.json();
      if (data && data.narration && typeof data.narration === 'object') {
        setAiCut(data.narration);
        toast('Rook re-cut the narration', 'ok');
      } else { throw new Error('empty'); }
    } catch {
      toast('Rook narration needs a live workspace. Playing the deterministic cut.', 'warn');
    } finally { setAiLoading(false); }
  }, [film, scenes, toast]);

  // poster
  const [posterOpen, setPosterOpen] = useState(false);

  const totalMs = useMemo(() => filmDuration(film), [film]);
  const cumBefore = useMemo(() => {
    const arr = []; let acc = 0;
    for (const s of scenes) { arr.push(acc); acc += (s.duration || 4800); }
    return arr;
  }, [scenes]);

  return (
    <div className="df-wrap" style={{ '--df-tone': tone }}>
      <div className="df-stage">
        <div className={`df-screen${scene.freeze ? ' df-freeze' : ''}`}>
          <div className="df-bg" style={{ '--df-tone': tone }}>
            <div className="df-bg-wash" />
            <div className="df-bg-grid" />
            <div className="df-bg-grain" />
            <div className="df-bg-vignette" />
          </div>
          <div className="df-bar top" />
          <div className="df-bar bot" />

          {film.curve && film.curve.length > 1 && (
            <div className="df-curve" style={{ '--df-tone': tone }}>
              <CurveChart curve={film.curve} revealFrac={revealFrac} />
            </div>
          )}

          {/* keyed so CSS enter-animations retrigger each scene */}
          <div key={sceneIdx} style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
            <SceneView scene={scene} animate={!reduced} />
          </div>

          {captionText && (
            <div className="df-caption"><span>{captionText}</span></div>
          )}
        </div>

        {/* transport */}
        <div className="df-transport" style={{ '--df-tone': tone }}>
          <div className="df-scrub" role="group" aria-label="Scene timeline">
            {scenes.map((s, i) => {
              const cls = i < sceneIdx ? 'done' : i > sceneIdx ? 'future' : 'current';
              const w = (s.duration || 4800) / totalMs;
              return (
                <button key={s.id} className={`df-seg ${cls}`} style={{ '--w': w }} title={`Act ${i + 1}`}
                  onClick={() => { goTo(i); }} aria-label={`Jump to act ${i + 1}`}>
                  <i style={{ transform: `scaleX(${i < sceneIdx ? 1 : i === sceneIdx ? progress : 0})` }} />
                </button>
              );
            })}
          </div>
          <div className="df-controls">
            <button className="df-btn df-play" onClick={() => { if (sceneIdx === scenes.length - 1 && progress >= 1) restart(); else setPlaying((p) => !p); }}
              aria-label={playing ? 'Pause' : 'Play'} disabled={reduced} title={reduced ? 'Reduced motion: storyboard mode' : (playing ? 'Pause' : 'Play')}>
              <Icon name={playing ? 'clock' : 'rocket'} size={20} />
            </button>
            <button className="df-btn icon" onClick={() => goTo(sceneIdx - 1)} disabled={sceneIdx === 0} aria-label="Previous scene"><Icon name="arrowLeft" size={17} /></button>
            <button className="df-btn icon" onClick={() => goTo(sceneIdx + 1)} disabled={sceneIdx >= scenes.length - 1} aria-label="Next scene"><Icon name="arrowRight" size={17} /></button>
            <button className="df-btn icon" onClick={restart} aria-label="Restart"><Icon name="rotateCcw" size={16} /></button>
            <span className="df-scene-count">Act {sceneIdx + 1} of {scenes.length}</span>

            <span className="df-spacer" />

            <div className="df-pov" role="group" aria-label="Point of view">
              {film.povs.map((p) => (
                <button key={p.id} data-on={pov === p.id} onClick={() => setPov(p.id)} title={`Re-cut from: ${p.label}`}>{p.label}</button>
              ))}
            </div>
            {hasVoice && (
              <button className="df-btn icon" data-on={voice} onClick={() => setVoice((v) => !v)} aria-label="Toggle voiceover" title="Narrated voiceover">
                <Icon name={voice ? 'mic' : 'mic'} size={17} />
              </button>
            )}
            <button className="df-btn" onClick={rookNarrate} disabled={aiLoading} title="Ask Rook to re-write the narration">
              <Icon name="sparkles" size={16} /> {aiLoading ? 'Rook...' : 'Rook cut'}
            </button>
            <button className="df-btn" onClick={() => setPosterOpen(true)} title="Still-frame poster + share">
              <Icon name="download" size={16} /> Poster
            </button>
          </div>
        </div>
      </div>

      {posterOpen && <PosterModal film={film} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}

/* ============================================================
   POSTER  - a shareable still frame (download SVG + copy link)
   ============================================================ */
function buildPosterSVG(film) {
  const tone = toneColor(outcomeTone(film.outcome));
  const p = film.poster || {};
  const curve = (p.curve || film.curve || []);
  const W = 1200, H = 630, padX = 90, baseY = 470, topY = 250;
  const n = curve.length;
  const pts = curve.map((c, i) => {
    const x = n <= 1 ? W / 2 : padX + (W - 2 * padX) * (i / (n - 1));
    const y = baseY - (baseY - topY) * clamp01((c.prob || 0) / 100);
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(0)} ${y.toFixed(0)}`).join(' ');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dots = pts.map(([x, y]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="${tone}" stroke="#fff" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05070d"/><stop offset="100%" stop-color="#0d1220"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="12%" r="80%">
      <stop offset="0%" stop-color="${tone}" stop-opacity="0.5"/><stop offset="60%" stop-color="${tone}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tone}" stop-opacity="0.3"/><stop offset="100%" stop-color="${tone}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <path d="${line} L ${(W - padX).toFixed(0)} ${baseY} L ${padX} ${baseY} Z" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="${tone}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}
  <text x="90" y="120" fill="${tone}" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="800" letter-spacing="6">RALLY . DEAL FILM</text>
  <text x="90" y="196" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="72" font-weight="800" letter-spacing="-2">${esc((p.headline || film.title).slice(0, 34))}</text>
  <text x="90" y="238" fill="#c6cede" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="500">${esc(p.entity || film.subtitle)}${p.meta ? '   .   ' + esc(p.meta) : ''}</text>
  <text x="90" y="560" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="88" font-weight="800" letter-spacing="-3">${esc(p.value || '')}</text>
  <text x="90" y="600" fill="${tone}" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="2">${esc((p.tagline || '').toUpperCase())}</text>
</svg>`;
}

function PosterModal({ film, onClose }) {
  const toast = useToast();
  const svg = useMemo(() => buildPosterSVG(film), [film]);
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const shareId = film.kind === 'quarter' ? 'quarter' : film.dealId;
  const shareUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/film?deal=' + encodeURIComponent(shareId);

  const download = () => {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `deal-film-${shareId}.svg`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { toast('Could not export poster', 'risk'); }
  };
  const copyLink = async () => {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(shareUrl);
      else { const t = document.createElement('textarea'); t.value = shareUrl; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
      toast('Share link copied', 'ok');
    } catch { toast('Copy failed', 'risk'); }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(4,6,12,.7)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 96vw)', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div className="row between" style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="fileText" size={18} />
            <strong>Still-frame poster</strong>
          </div>
          <button className="btn btn-quiet" onClick={onClose} aria-label="Close" style={{ padding: '.35rem' }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: '1.2rem', background: 'var(--n-50)' }}>
          <img src={dataUrl} alt="Deal film poster" style={{ width: '100%', borderRadius: 'var(--r-md)', display: 'block', border: '1px solid var(--line)' }} />
        </div>
        <div className="row between" style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '.6rem' }}>
          <span className="t-sm muted clip" style={{ maxWidth: 320 }}>{shareUrl}</span>
          <div className="row gap-2">
            <Button variant="ghost" onClick={copyLink}><Icon name="copy" size={15} /> Copy link</Button>
            <Button onClick={download}><Icon name="download" size={15} /> Download poster</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STORYBOARD  - static fallback (reduced motion / browse)
   ============================================================ */
function Storyboard({ film }) {
  return (
    <div className="df-wrap">
      <div className="df-board">
        {film.curve && film.curve.length > 1 && (
          <div className="df-board-scene" style={{ '--df-tone': toneColor(film.accentTone) }}>
            <div className="df-board-num"><Icon name="trendUp" size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="df-eyebrow" style={{ color: toneColor(film.accentTone) }}>The arc</div>
              <div style={{ maxWidth: 420 }}><CurveChart curve={film.curve} revealFrac={1} big /></div>
            </div>
          </div>
        )}
        {film.scenes.map((s, i) => (
          <div key={s.id} className="df-board-scene" style={{ '--df-tone': toneColor(s.tone) }}>
            <div className="df-board-num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {s.eyebrow && <div className="df-eyebrow" style={{ color: toneColor(s.tone) }}><span className="df-badge"><Icon name={s.icon || 'sparkles'} size={14} /></span>{s.eyebrow}</div>}
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: '#fff', letterSpacing: '-.02em' }}>{s.title}</div>
              {s.headline && <div className="df-headline" style={{ marginTop: '.3rem' }}>{s.headline}</div>}
              {s.chips && s.chips.length > 0 && <div className="df-chips">{s.chips.map((c, j) => <span key={j} className="df-chip">{c}</span>)}</div>}
              {s.lessons && s.lessons.length > 0 && <div className="df-lessons">{s.lessons.map((l, j) => <div key={j} className="df-lesson"><b>{j + 1}</b><span>{l}</span></div>)}</div>}
              {narrationLine(s) && <div style={{ marginTop: '.7rem', color: '#aeb8c6', fontSize: '.96rem', lineHeight: 1.5 }}>{narrationLine(s)}</div>}
            </div>
            {s.stat && (
              <div className="df-board-stat">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.9rem', color: '#fff' }}>{s.stat.value}</div>
                <div style={{ fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.06em', color: toneColor(s.tone), fontWeight: 700 }}>{s.stat.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
const narrationLine = (s) => s.narration?.rep || '';

/* ============================================================
   PICKER  - the reel
   ============================================================ */
function PosterCard({ item, onPlay }) {
  const tone = toneColor(item.status === 'won' ? 'ok' : item.status === 'lost' ? 'risk' : 'accent');
  return (
    <button className="df-poster-card" style={{ '--df-tone': tone }} onClick={onPlay} aria-label={`Play the film for ${item.name}`}>
      <span className="df-poster-glow" />
      <span className="df-poster-play"><Icon name="rocket" size={16} /></span>
      <span className="df-poster-body">
        <span style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: tone, marginBottom: '.35rem' }}>
          {item.status === 'won' ? 'Closed won' : item.status === 'lost' ? 'The autopsy' : item.stage}
        </span>
        <span style={{ display: 'block', fontWeight: 800, fontSize: '1.06rem', color: '#fff', lineHeight: 1.16, marginBottom: '.2rem' }} className="clip">{item.name}</span>
        <span style={{ display: 'block', fontSize: '.85rem', color: '#aeb8c6' }} className="clip">{item.company || 'Rally'}   .   {item.valueLabel}</span>
      </span>
    </button>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function DealFilm() {
  const reduced = usePrefersReducedMotion();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  // subscribe to store + depth so the film rebuilds on any data change
  useStore();
  useDepth();

  const reel = useMemo(() => listFilmableDeals(24), []);
  const requested = sp.get('deal');
  const selected = requested || (reel[0] ? reel[0].id : 'quarter');

  const film = useMemo(() => {
    try { return selected === 'quarter' ? buildQuarterFilm() : buildDealFilm(selected); }
    catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, getDeals().length]);

  const pick = useCallback((id) => {
    setSp((prev) => { const n = new URLSearchParams(prev); n.set('deal', id); return n; }, { replace: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [setSp, reduced]);

  const isQuarter = selected === 'quarter';

  return (
    <div className="col gap-4" style={{ maxWidth: 1160, margin: '0 auto' }}>
      <PageTitle
        eyebrow="Cinematic"
        title="Deal Film"
        sub="Any deal, or the whole quarter, auto-edited into a scored, narrated film from its real history. Every frame ties to a record."
        action={(
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <Button variant={isQuarter ? 'primary' : 'ghost'} onClick={() => pick('quarter')}>
              <Icon name="trendUp" size={16} /> The Quarter
            </Button>
            {!isQuarter && film && (
              <Badge tone={film.outcome === 'won' ? 'ok' : film.outcome === 'lost' ? 'risk' : 'accent'}>
                {film.outcome === 'won' ? 'Closed won' : film.outcome === 'lost' ? 'Closed lost' : 'Open'}
              </Badge>
            )}
          </div>
        )}
      />

      {!film ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2rem' }}>🎬</div>
            <h3 style={{ marginTop: '.6rem' }}>That film is not available</h3>
            <p className="muted">The deal may have been removed. Pick another from the reel below.</p>
            <div style={{ marginTop: '1rem' }}><Button onClick={() => pick('quarter')}>Play the quarter</Button></div>
          </div>
        </Card>
      ) : reduced ? (
        <div>
          <p className="t-sm muted" style={{ margin: '0 0 .8rem' }}>Reduced motion is on, so here is the full storyboard. Every act, laid out at once.</p>
          <Storyboard film={film} />
        </div>
      ) : (
        <Player key={film.id} film={film} reduced={reduced} />
      )}

      {/* the reel */}
      <div style={{ marginTop: '1.6rem' }}>
        <div className="row between" style={{ alignItems: 'flex-end', marginBottom: '.8rem' }}>
          <div>
            <div className="eyebrow">The reel</div>
            <h3 style={{ margin: '.15rem 0 0' }}>Now showing</h3>
          </div>
          <span className="t-sm muted">{reel.length} deals ready to screen</span>
        </div>
        <div className="df-pickgrid stagger">
          <button className="df-poster-card" style={{ '--df-tone': toneColor('accent') }} onClick={() => pick('quarter')} aria-label="Play the quarter film">
            <span className="df-poster-glow" />
            <span className="df-poster-play"><Icon name="rocket" size={16} /></span>
            <span className="df-poster-body">
              <span style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: toneColor('accent'), marginBottom: '.35rem' }}>Feature presentation</span>
              <span style={{ display: 'block', fontWeight: 800, fontSize: '1.06rem', color: '#fff', lineHeight: 1.16, marginBottom: '.2rem' }}>The Quarter</span>
              <span style={{ display: 'block', fontSize: '.85rem', color: '#aeb8c6' }}>The whole book, one arc</span>
            </span>
          </button>
          {reel.map((d) => (
            <PosterCard key={d.id} item={d} onPlay={() => pick(d.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
