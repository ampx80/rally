// AuthGuide.jsx - "Ardo", the friendly login concierge character. A lightweight
// SVG + CSS mascot (no Lottie, no deps) that makes signing in feel human:
//  - greets on load, breathes + blinks while idle
//  - pupils follow the cursor / focused field
//  - covers its eyes when you reveal your password (peek)
//  - "thinks" while submitting, celebrates on success, gentle shrug on error
//  - a speech bubble delivers plain-language, encouraging guidance
// Teal body (product), violet antenna spark (the AI accent). Respects
// prefers-reduced-motion (holds still, pupils centered). NO em-dash. ASCII only.
import React, { useEffect, useId, useRef, useState } from 'react';

// mood: 'greet' | 'idle' | 'peek' | 'thinking' | 'happy' | 'oops' | 'listening'
//       | 'wink' | 'love' | 'dizzy' (the last three are poke reactions)
const POKE_QUIPS = [
  'Hehe, that tickles.', 'Boop! Right back at ya.', "Careful, I'm delicate hardware.",
  'Poke me again, I dare you.', 'Whoa, hi there!', "Ow. Kidding - do it again.",
  'You found the secret button.', 'Beep boop. That is robot for hi.',
];
const POKE_MOODS = ['wink', 'love', 'happy', 'dizzy'];
// Accessories that replace the antenna (a hat sits where the antenna would be).
const HAT_ACCESSORIES = ['santa', 'party', 'spooky', 'night'];

export default function AuthGuide({ mood = 'idle', message = '', size = 132, compact = false, onPoke, accessory = '' }) {
  const rootRef = useRef(null);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [override, setOverride] = useState(null); // poke reaction { mood, message }
  const pokeRef = useRef(0);
  // Unique gradient ids per instance. Two AuthGuides can be mounted at once
  // (desktop aside + mobile card, one hidden via display:none). Shared ids
  // would collide and a paint server inside a display:none subtree does not
  // render, washing out the visible instance. useId keeps every fill real.
  const rid = useId().replace(/[:]/g, '');
  const gBody = `${rid}-body`, gFace = `${rid}-face`, gGlow = `${rid}-glow`;
  const reduce = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const effMood = override?.mood || mood;
  const effMsg = override ? override.message : message;

  // Poke: click Ardo for a random playful reaction that briefly overrides state.
  const poke = () => {
    if (reduce) return;
    setOverride({
      mood: POKE_MOODS[Math.floor(Math.random() * POKE_MOODS.length)],
      message: POKE_QUIPS[Math.floor(Math.random() * POKE_QUIPS.length)],
    });
    clearTimeout(pokeRef.current);
    pokeRef.current = setTimeout(() => setOverride(null), 1700);
    try { onPoke && onPoke(); } catch {}
  };
  useEffect(() => () => clearTimeout(pokeRef.current), []);

  // Re-pop the speech bubble whenever the (effective) message changes.
  useEffect(() => { setBubbleKey(k => k + 1); }, [effMsg]);

  // Cursor-follow: set --px/--py (-1..1) on the root so pupils translate.
  useEffect(() => {
    if (reduce) return;
    const el = rootRef.current; if (!el) return;
    let raf = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
      tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 0.9)));
      ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 0.9)));
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0; el.style.setProperty('--px', tx.toFixed(3)); el.style.setProperty('--py', ty.toFixed(3));
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, [reduce]);

  const eyesClosed = effMood === 'happy';
  const eyesSquint = effMood === 'peek';
  const worried = effMood === 'oops';
  const think = effMood === 'thinking';
  const listen = effMood === 'listening';
  const wink = effMood === 'wink';
  const love = effMood === 'love';
  const dizzy = effMood === 'dizzy';

  const glow = effMood === 'happy' ? '#0e9f8f' : effMood === 'oops' ? '#e8973a'
    : love ? '#ff5d8f' : listen ? '#7c5cf7' : '#14b8a6';

  return (
    <div ref={rootRef} className={`ag-root${reduce ? ' ag-reduce' : ''}`} style={{ '--ag-size': `${size}px`, '--ag-glow': glow }}>
      <div className={`ag-char ag-${effMood}${reduce ? '' : ' ag-pokeable'}`} onClick={poke} title="Poke me">
        {!compact && !reduce && (
          <div className="ag-rings" aria-hidden><span /><span /><i /></div>
        )}
        <div className="ag-shadow" aria-hidden />
        <svg viewBox="0 0 160 160" className="ag-svg" role="img" aria-label="Ardo, your login guide">
          <defs>
            <linearGradient id={gBody} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#12c3b0" />
              <stop offset="1" stopColor="#0b8578" />
            </linearGradient>
            <linearGradient id={gFace} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#04231f" />
              <stop offset="1" stopColor="#062b26" />
            </linearGradient>
            <radialGradient id={gGlow} cx="0.5" cy="0.4" r="0.6">
              <stop offset="0" stopColor="var(--ag-glow)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--ag-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* aura */}
          <circle className="ag-aura" cx="80" cy="86" r="66" fill={`url(#${gGlow})`} />

          {/* antenna + AI spark (violet) - hidden when Ardo wears a hat */}
          {!HAT_ACCESSORIES.includes(accessory) && (
            <>
              <line x1="80" y1="30" x2="80" y2="14" stroke="#0b8578" strokeWidth="4" strokeLinecap="round" />
              <circle className="ag-spark" cx="80" cy="11" r="6" fill="#7c5cf7" />
            </>
          )}

          {/* head */}
          <rect x="24" y="30" width="112" height="98" rx="30" fill={`url(#${gBody})`} />
          <rect x="24" y="30" width="112" height="98" rx="30" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2" />

          {/* face screen */}
          <rect x="38" y="46" width="84" height="64" rx="20" fill={`url(#${gFace})`} />

          {/* eyes */}
          {eyesClosed ? (
            <g stroke="#7ff2e4" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M54 82 q9 -12 18 0" />
              <path d="M88 82 q9 -12 18 0" />
            </g>
          ) : love ? (
            <g fill="#ff5d8f" className="ag-love">
              <path d="M63 70 c-3 -5 -11 -3 -11 3 c0 5 7 9 11 12 c4 -3 11 -7 11 -12 c0 -6 -8 -8 -11 -3 z" />
              <path d="M97 70 c-3 -5 -11 -3 -11 3 c0 5 7 9 11 12 c4 -3 11 -7 11 -12 c0 -6 -8 -8 -11 -3 z" />
            </g>
          ) : dizzy ? (
            <g stroke="#7ff2e4" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M57 70 l12 12 M69 70 l-12 12" />
              <path d="M91 70 l12 12 M103 70 l-12 12" />
            </g>
          ) : wink ? (
            <g>
              <g className="ag-eye">
                <ellipse cx="63" cy="76" rx="12" ry="13" fill="#e8fffb" />
                <circle className="ag-pupil" cx="63" cy="76" r="6" fill="#062b26" />
              </g>
              <path d="M88 80 q9 -12 18 0" stroke="#7ff2e4" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
          ) : think ? (
            <g fill="#7ff2e4" className="ag-think">
              <circle cx="63" cy="74" r="6" />
              <circle cx="97" cy="74" r="6" />
            </g>
          ) : (
            <g className={`ag-eyes${eyesSquint ? ' ag-eyes-squint' : ''}`}>
              <g className="ag-eye">
                <ellipse cx="63" cy="76" rx="12" ry={eyesSquint ? 4 : 13} fill="#e8fffb" />
                {!eyesSquint && <circle className="ag-pupil" cx="63" cy={worried ? 80 : 76} r="6" fill="#062b26" />}
              </g>
              <g className="ag-eye">
                <ellipse cx="97" cy="76" rx="12" ry={eyesSquint ? 4 : 13} fill="#e8fffb" />
                {!eyesSquint && <circle className="ag-pupil" cx="97" cy={worried ? 80 : 76} r="6" fill="#062b26" />}
              </g>
              {worried && (
                <g stroke="#7ff2e4" strokeWidth="3" strokeLinecap="round">
                  <path d="M52 60 l16 5" /><path d="M108 60 l-16 5" />
                </g>
              )}
            </g>
          )}

          {/* mouth */}
          {(effMood === 'happy' || love) ? (
            <path d="M66 96 q14 16 28 0" fill="none" stroke="#7ff2e4" strokeWidth="5" strokeLinecap="round" />
          ) : worried ? (
            <path d="M70 100 q10 -6 20 0" fill="none" stroke="#7ff2e4" strokeWidth="4" strokeLinecap="round" />
          ) : dizzy ? (
            <path d="M68 99 q6 -6 12 0 q6 6 12 0" fill="none" stroke="#7ff2e4" strokeWidth="4" strokeLinecap="round" />
          ) : wink ? (
            <path d="M68 97 q12 9 24 -1" fill="none" stroke="#7ff2e4" strokeWidth="4" strokeLinecap="round" />
          ) : listen ? (
            <circle cx="80" cy="99" r="6" fill="none" stroke="#7ff2e4" strokeWidth="4" className="ag-mouth-o" />
          ) : (
            <path d="M70 98 q10 8 20 0" fill="none" stroke="#7ff2e4" strokeWidth="4" strokeLinecap="round" />
          )}

          {/* waving hand on greet */}
          {effMood === 'greet' && (
            <g className="ag-hand"><circle cx="132" cy="96" r="11" fill={`url(#${gBody})`} stroke="rgba(255,255,255,.2)" strokeWidth="2" /></g>
          )}

          {/* seasonal outfit (drawn last so it layers on top) */}
          {accessory === 'santa' && (
            <g className="ag-hat">
              <path d="M50 34 Q58 6 104 12 L108 32 Z" fill="#e23b4e" />
              <circle cx="107" cy="11" r="7" fill="#fff" />
              <rect x="44" y="30" width="72" height="11" rx="5.5" fill="#fff" />
            </g>
          )}
          {accessory === 'party' && (
            <g className="ag-hat">
              <path d="M80 0 L64 34 L96 34 Z" fill="#7c5cf7" />
              <path d="M80 4 L72 20 M84 12 L78 26" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
              <circle cx="80" cy="1" r="5" fill="#f5b83d" />
            </g>
          )}
          {accessory === 'spooky' && (
            <g className="ag-hat" fill="#161227">
              <path d="M80 -2 L64 32 L96 32 Z" />
              <rect x="50" y="30" width="60" height="8" rx="4" />
              <rect x="72" y="20" width="16" height="5" fill="#7c5cf7" />
            </g>
          )}
          {accessory === 'night' && (
            <g className="ag-hat">
              <path d="M46 34 Q54 6 102 14 Q116 17 96 31 Z" fill="#3b5bdb" />
              <rect x="42" y="30" width="72" height="10" rx="5" fill="#e8ecff" />
              <circle cx="106" cy="15" r="6" fill="#fff" />
            </g>
          )}
          {accessory === 'shades' && (
            <g className="ag-shades">
              <rect x="46" y="66" width="30" height="19" rx="8" fill="#0a0a12" />
              <rect x="84" y="66" width="30" height="19" rx="8" fill="#0a0a12" />
              <line x1="76" y1="72" x2="84" y2="72" stroke="#0a0a12" strokeWidth="4" />
              <line x1="52" y1="70" x2="60" y2="70" stroke="#3a3a52" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>

        {(effMood === 'happy' || love) && !reduce && (
          <div className={`ag-confetti${love ? ' ag-confetti-love' : ''}`} aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => <span key={i} style={{ '--i': i }} />)}
          </div>
        )}
      </div>

      {effMsg && (
        <div key={bubbleKey} className={`ag-bubble${compact ? ' ag-bubble-c' : ''}`}>
          {effMsg}
        </div>
      )}

      <style>{`
        .ag-root { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; --px: 0; --py: 0; }
        .ag-char { position: relative; width: var(--ag-size); height: var(--ag-size); }
        .ag-pokeable { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .ag-pokeable:active .ag-svg { transform: scale(.94); }
        .ag-dizzy .ag-svg { animation: agWobble .6s ease-in-out; }
        @keyframes agWobble { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-9deg); } 75% { transform: rotate(9deg); } }
        .ag-love .ag-love path { animation: agBeat .5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes agBeat { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
        .ag-confetti-love span { background: #ff5d8f !important; border-radius: 50% !important; }
        .ag-svg { position: relative; z-index: 1; width: 100%; height: 100%; display: block; overflow: visible; animation: agFloat 5.5s ease-in-out infinite; }

        /* orbiting energy rings behind Ardo (desktop presence) */
        .ag-rings { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .ag-rings span, .ag-rings i { position: absolute; top: 50%; left: 50%; border-radius: 50%; transform: translate(-50%, -50%); }
        .ag-rings span:nth-child(1) { width: 148%; height: 148%; border: 1.5px dashed rgba(20,184,166,.4); animation: agSpin 16s linear infinite; }
        .ag-rings span:nth-child(2) { width: 196%; height: 196%; border: 1.5px dashed rgba(124,92,247,.32); animation: agSpin 26s linear infinite reverse; }
        .ag-rings i { width: 148%; height: 148%; animation: agSpin 16s linear infinite; }
        .ag-rings i::before { content: ''; position: absolute; top: -4px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #14b8a6; box-shadow: 0 0 10px 2px rgba(20,184,166,.8); }
        @keyframes agSpin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        .ag-reduce .ag-svg { animation: none; }
        @keyframes agFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(1deg); } }

        .ag-aura { animation: agAura 4s ease-in-out infinite; transform-origin: 80px 86px; }
        @keyframes agAura { 0%,100% { opacity: .7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
        .ag-reduce .ag-aura { animation: none; }

        .ag-spark { animation: agSpark 2.4s ease-in-out infinite; transform-origin: 80px 11px; filter: drop-shadow(0 0 6px #7c5cf7); }
        @keyframes agSpark { 0%,100% { opacity: .8; r: 6px; } 50% { opacity: 1; r: 7px; } }
        .ag-reduce .ag-spark { animation: none; }

        /* pupils follow cursor via --px/--py */
        .ag-pupil { transform: translate(calc(var(--px) * 5px), calc(var(--py) * 4px)); transition: transform .12s ease-out; }

        /* blink only when eyes are open + not squinting/worried spin */
        .ag-eyes:not(.ag-eyes-squint) .ag-eye { animation: agBlink 4.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes agBlink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.12); } }
        .ag-reduce .ag-eye { animation: none; }

        .ag-think circle { animation: agThink 1s ease-in-out infinite; }
        .ag-think circle:last-child { animation-delay: .28s; }
        @keyframes agThink { 0%,100% { opacity: .35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4px); } }

        .ag-mouth-o { animation: agTalk 1.1s ease-in-out infinite; transform-origin: 80px 99px; }
        @keyframes agTalk { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.55); } }

        .ag-hand { animation: agWave 1.1s ease-in-out infinite; transform-origin: 132px 96px; }
        @keyframes agWave { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(18deg); } }

        .ag-oops .ag-svg { animation: agShake .5s ease-in-out; }
        @keyframes agShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }

        .ag-shadow { position: absolute; left: 50%; bottom: -6px; width: 56%; height: 12px; transform: translateX(-50%); background: radial-gradient(closest-side, rgba(4,35,31,.35), transparent); border-radius: 50%; animation: agShadow 5.5s ease-in-out infinite; }
        @keyframes agShadow { 0%,100% { transform: translateX(-50%) scaleX(1); opacity: .5; } 50% { transform: translateX(-50%) scaleX(.82); opacity: .32; } }
        .ag-reduce .ag-shadow { animation: none; }

        .ag-confetti { position: absolute; inset: 0; pointer-events: none; }
        .ag-confetti span { position: absolute; top: 40%; left: 50%; width: 7px; height: 7px; border-radius: 2px; opacity: 0;
          background: hsl(calc(var(--i) * 40), 80%, 60%); animation: agPop .9s ease-out forwards; animation-delay: calc(var(--i) * 20ms); }
        @keyframes agPop { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(calc((var(--i) - 5) * 26px), -60px) scale(.4) rotate(220deg); } }

        .ag-bubble { position: relative; max-width: 320px; background: #fff; color: #0d1220; border: 1px solid rgba(14,159,143,.22);
          border-radius: 16px; padding: 13px 16px; font-size: 15px; line-height: 1.5; font-weight: 600; text-align: center;
          box-shadow: 0 14px 34px -18px rgba(11,133,120,.6); animation: agBubbleIn .34s cubic-bezier(.22,1.4,.36,1) both; }
        .ag-bubble::before { content: ''; position: absolute; top: -8px; left: 50%; transform: translateX(-50%) rotate(45deg);
          width: 14px; height: 14px; background: #fff; border-left: 1px solid rgba(14,159,143,.22); border-top: 1px solid rgba(14,159,143,.22); }
        .ag-bubble-c { font-size: 13.5px; padding: 10px 13px; max-width: 260px; }
        @keyframes agBubbleIn { 0% { opacity: 0; transform: translateY(6px) scale(.94); } 100% { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
