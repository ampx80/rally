// ============================================================
// GhostDealPanel - the cinematic "ghost path" for a single deal.
// Renders the counterfactual branch where you made the move you skipped,
// side by side with what actually happened, anchored to the closest deal
// that really WON. Self-contained "cinema" dark surface (accent #5b4bf5)
// so it reads as a distinct, jaw-dropping lens on top of either theme.
// Pure read-only: everything comes from src/lib/ghost-deals.js. The one
// action asks Rook (opens the operator dock) - it never writes.
// ============================================================
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, stageById } from '../lib/store.js';
import { useDepth } from '../lib/store-depth.js';
import {
  ghostForDeal, ghostMoney, ghostCategoryMeta, ghostOpenStages, ghostWonStage,
} from '../lib/ghost-deals.js';
import { Icon } from './icons.jsx';

/* Cinema palette - fixed dark spectral surface, theme-independent by design. */
const C = {
  bg: 'linear-gradient(158deg, #14152e 0%, #0d0e1e 58%, #17162f 100%)',
  card: 'rgba(255,255,255,.045)',
  cardLine: 'rgba(140,124,255,.16)',
  ink: '#efeefb',
  sub: '#c7c5e6',
  mut: '#9c9ac2',
  acc: '#8f7fff',
  accSoft: 'rgba(143,127,255,.16)',
  lost: '#ff6f61',
  won: '#37d99a',
  line: 'rgba(255,255,255,.09)',
};

/* Inject keyframes once (reduced-motion safe via @media). */
let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.id = 'ghost-deals-styles';
  el.textContent = `
@keyframes ghostDraw { from { stroke-dashoffset: var(--gdl, 600); } to { stroke-dashoffset: 0; } }
@keyframes ghostPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.14); opacity: .82; } }
@keyframes ghostFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes ghostRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.gd-draw { stroke-dasharray: var(--gdl, 600); animation: ghostDraw 1.5s var(--ease, cubic-bezier(.22,1,.36,1)) both; }
.gd-pulse { transform-box: fill-box; transform-origin: center; animation: ghostPulse 2.4s ease-in-out infinite; }
.gd-float { animation: ghostFloat 4.5s ease-in-out infinite; }
.gd-rise { animation: ghostRise .5s var(--ease, cubic-bezier(.22,1,.36,1)) both; }
.gd-fix { transition: transform .18s var(--ease, cubic-bezier(.22,1,.36,1)), background .18s, border-color .18s; }
.gd-fix:hover { transform: translateY(-2px); border-color: rgba(143,127,255,.5) !important; }
@media (prefers-reduced-motion: reduce) {
  .gd-draw, .gd-pulse, .gd-float, .gd-rise { animation: none !important; }
  .gd-draw { stroke-dashoffset: 0 !important; }
}`;
  document.head.appendChild(el);
}

function GhostMark({ size = 22, color = C.acc }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2.5c-4 0-6.4 3-6.4 7v10.2c0 .7.8 1.1 1.4.7l1.4-1a1 1 0 0 1 1.2 0l1.2.9a1 1 0 0 0 1.2 0l1.2-.9a1 1 0 0 1 1.2 0l1.2.9a1 1 0 0 0 1.2 0l1.4-1c.6-.4 1.4 0 1.4.7"
        stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <path d="M12 2.5c-4 0-6.4 3-6.4 7v9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9.4" cy="10.5" r="1.15" fill={color} />
      <circle cx="14.6" cy="10.5" r="1.15" fill={color} />
    </svg>
  );
}

/* ---------- the replay: what happened vs the ghost path ---------- */
function Replay({ ghost }) {
  const stages = ghostOpenStages;             // lead..negotiation
  const wonStage = ghostWonStage;             // closed won
  const maxOrder = 6;                          // won terminal
  const W = 720, H = 210, PADL = 26, PADR = 26;
  const x = (order) => PADL + ((order - 1) / (maxOrder - 1)) * (W - PADL - PADR);
  const yThis = 150, yGhost = 66;

  const reachedOrder = ghost.reachedOrder;
  const divOrder = Math.min(ghost.replay.divergenceStageOrder, reachedOrder);
  const xReached = x(reachedOrder);
  const xDiv = x(divOrder);
  const xWon = x(maxOrder);

  // shared solid path (what happened), left -> reached
  const solid = `M ${x(1)} ${yThis} L ${xReached} ${yThis}`;
  // ghost branch: emanate from the divergence node on lane A, curve to lane B, run to won
  const ghostPath = `M ${xDiv} ${yThis} C ${xDiv + 46} ${yThis} ${xDiv + 10} ${yGhost} ${xDiv + 60} ${yGhost} L ${xWon} ${yGhost}`;
  const ghostLen = 620;

  // activity cadence dots along lane A + silence shading
  const created = x(1);
  const dots = ghost.replay.dots.map((d, i) => ({ x: created + d.t * (xReached - created), type: d.type, i }));
  const silX = created + ghost.replay.silenceFrac * (xReached - created);

  const fix = ghost.topFix;
  const fixColor = fix ? ghostCategoryMeta(fix.category).color : C.acc;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: '100%' }} role="img"
        aria-label={`Replay: this deal reached ${stageById(ghost.reached)?.name} and was lost; the ghost path branches at the divergence stage and reaches Closed Won.`}>
        <defs>
          <linearGradient id="gdGhost" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.acc} stopOpacity=".5" />
            <stop offset="70%" stopColor={C.acc} stopOpacity="1" />
            <stop offset="100%" stopColor={C.won} stopOpacity="1" />
          </linearGradient>
          <filter id="gdGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* stage grid ticks */}
        {[...stages, wonStage].map((s) => (
          <g key={s.id}>
            <line x1={x(s.order)} y1={40} x2={x(s.order)} y2={168} stroke={C.line} strokeWidth="1" strokeDasharray="2 5" />
            <text x={x(s.order)} y={188} textAnchor="middle" fontSize="11" fontWeight="600"
              fill={s.order === reachedOrder ? C.lost : s.order === divOrder ? C.acc : C.mut}>
              {s.name.replace('Closed ', '')}
            </text>
          </g>
        ))}

        {/* lane labels */}
        <text x={PADL} y={yGhost - 20} fontSize="10.5" fontWeight="700" letterSpacing=".12em" fill={C.acc}>GHOST PATH</text>
        <text x={PADL} y={yThis + 34} fontSize="10.5" fontWeight="700" letterSpacing=".12em" fill={C.mut}>WHAT HAPPENED</text>

        {/* silence shading on lane A */}
        {ghost.signals.silenceDays > 14 && silX < xReached - 4 && (
          <line x1={silX} y1={yThis} x2={xReached} y2={yThis} stroke={C.lost} strokeWidth="7" strokeOpacity=".16" strokeLinecap="round" />
        )}

        {/* lane A: what happened (solid) */}
        <path d={solid} stroke={C.sub} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".9" />
        {stages.filter(s => s.order <= reachedOrder).map(s => (
          <circle key={s.id} cx={x(s.order)} cy={yThis} r="4.5" fill="#0d0e1e" stroke={C.sub} strokeWidth="2" />
        ))}
        {/* activity dots */}
        {dots.map(d => (
          <circle key={d.i} cx={d.x} cy={yThis} r="2.6" fill={C.acc} opacity=".8" />
        ))}
        {/* LOST terminal */}
        <circle cx={xReached} cy={yThis} r="11" fill={C.lost} filter="url(#gdGlow)" />
        <path d={`M ${xReached - 4} ${yThis - 4} L ${xReached + 4} ${yThis + 4} M ${xReached + 4} ${yThis - 4} L ${xReached - 4} ${yThis + 4}`} stroke="#fff" strokeWidth="2" strokeLinecap="round" />

        {/* ghost branch (dashed, glowing, drawn) */}
        <path d={ghostPath} className="gd-draw" style={{ '--gdl': ghostLen }} stroke="url(#gdGhost)" strokeWidth="3"
          fill="none" strokeLinecap="round" strokeDasharray="7 6" filter="url(#gdGlow)" opacity=".95" />
        {/* WON terminal */}
        <circle cx={xWon} cy={yGhost} r="11" fill={C.won} filter="url(#gdGlow)" />
        <path d={`M ${xWon - 4.5} ${yGhost} L ${xWon - 1} ${yGhost + 3.5} L ${xWon + 5} ${yGhost - 3.5}`} stroke="#062" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* divergence node + label */}
        <g className="gd-pulse">
          <circle cx={xDiv} cy={yThis} r="7" fill="none" stroke={fixColor} strokeWidth="2.5" />
          <circle cx={xDiv} cy={yThis} r="3" fill={fixColor} />
        </g>
        <g className="gd-float">
          <circle cx={xDiv} cy={40} r="3.5" fill={fixColor} />
          <text x={xDiv} y={30} textAnchor={xDiv > W - 150 ? 'end' : 'middle'} fontSize="11" fontWeight="700" fill={C.ink}>
            Divergence
          </text>
        </g>
      </svg>
    </div>
  );
}

function LiftBar({ base, delta }) {
  const target = Math.min(95, base + delta);
  return (
    <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${target}%`, background: `linear-gradient(90deg, ${C.acc}, ${C.won})`, opacity: .5, borderRadius: 999, transition: 'width .8s var(--ease)' }} />
      <div style={{ position: 'absolute', inset: 0, width: `${base}%`, background: C.sub, borderRadius: 999, transition: 'width .8s var(--ease)' }} />
    </div>
  );
}

function FixRow({ fix, recovered }) {
  const meta = ghostCategoryMeta(fix.category);
  return (
    <div className="gd-fix" style={{ display: 'flex', gap: '.7rem', alignItems: 'center', padding: '.7rem .8rem', borderRadius: 12, border: `1px solid ${C.cardLine}`, background: C.card }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, flex: 'none', boxShadow: `0 0 10px ${meta.color}` }} />
      <div style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: '.94rem' }}>{fix.label}</div>
        <div style={{ color: C.mut, fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 1 }}>{meta.label}{fix.basis === 'pricing' ? ' - pricing lever' : ''}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none', lineHeight: 1.15 }}>
        <div style={{ fontWeight: 800, color: C.won, fontVariantNumeric: 'tabular-nums' }}>+{fix.delta} pts</div>
        <div style={{ color: C.sub, fontSize: '.78rem', fontVariantNumeric: 'tabular-nums' }}>{ghostMoney(recovered)}</div>
      </div>
    </div>
  );
}

export default function GhostDealPanel({ deal, ghost: ghostProp }) {
  useStore(); useDepth();
  const navigate = useNavigate();
  useEffect(() => { ensureStyles(); }, []);
  const ghost = useMemo(() => ghostProp || (deal ? ghostForDeal(deal.id) : null), [ghostProp, deal]);

  if (!ghost || !ghost.topFix) return null;
  const { topFix, baselineWinProb, recoverable, analog, divergences, interventions, signals, company } = ghost;
  const target = Math.min(95, baselineWinProb + topFix.delta);
  const rest = interventions.slice(1);

  const askRook = () => {
    const g = ghost.deal;
    const prompt = `On the ${company?.name || g.name} deal (${ghostMoney(g.value)}, ${ghost.lost ? 'closed lost' : 'at risk'}), the ghost analysis says the highest-leverage move was: "${topFix.label}" at the ${stageById(topFix.stageId)?.name} stage (about +${topFix.delta} points of win probability). Draft the specific play to run that move.`;
    window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } }));
  };

  return (
    <div className="gd-rise" style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: C.bg, border: `1px solid ${C.cardLine}`, color: C.ink, boxShadow: '0 20px 60px rgba(10,8,30,.45)' }}>
      {/* spectral glow */}
      <div aria-hidden style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${C.accSoft}, transparent 68%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', padding: 'clamp(1.1rem, 2.4vw, 1.6rem)' }}>
        {/* header */}
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start', marginBottom: '1.1rem' }}>
          <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
            <span className="gd-float row center" style={{ width: 40, height: 40, borderRadius: 12, background: C.accSoft, border: `1px solid ${C.cardLine}`, flex: 'none' }}>
              <GhostMark size={22} />
            </span>
            <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: C.acc }}>Ghost path</span>
              <span style={{ fontWeight: 800, fontSize: '1.12rem', color: C.ink }}>
                {ghost.lost ? 'The branch where this deal lived' : 'Where this deal is heading'}
              </span>
            </div>
          </div>
          {analog && (
            <div style={{ flex: 'none', textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontSize: '.72rem', color: C.mut, textTransform: 'uppercase', letterSpacing: '.06em' }}>Closest win</div>
              <div style={{ fontWeight: 700, color: C.sub, fontSize: '.9rem' }}>{analog.deal.name.split(' - ')[0]}</div>
              <div style={{ fontSize: '.76rem', color: C.acc, fontWeight: 700 }}>{analog.similarity}% match</div>
            </div>
          )}
        </div>

        {/* win-prob lift */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '1rem', alignItems: 'center', marginBottom: '1.1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.4rem)', color: C.sub, fontVariantNumeric: 'tabular-nums' }}>{baselineWinProb}%</span>
              <Icon name="chevronRight" size={18} style={{ color: C.mut }} />
              <span style={{ fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.4rem)', color: C.won, fontVariantNumeric: 'tabular-nums' }}>{target}%</span>
              <span style={{ fontWeight: 800, color: C.won, fontSize: '.95rem', background: 'rgba(55,217,154,.14)', padding: '.15rem .5rem', borderRadius: 999 }}>+{topFix.delta} pts</span>
            </div>
            <div style={{ marginTop: '.35rem' }}><LiftBar base={baselineWinProb} delta={topFix.delta} /></div>
            <div style={{ fontSize: '.82rem', color: C.mut, marginTop: '.4rem' }}>
              Reconstructed win probability the day it {ghost.lost ? 'died' : 'stalled'}, then re-scored with the one move applied.
            </div>
          </div>
          <div style={{ flex: 'none', textAlign: 'right', paddingLeft: '.5rem', borderLeft: `1px solid ${C.line}` }}>
            <div style={{ fontSize: '.72rem', color: C.mut, textTransform: 'uppercase', letterSpacing: '.06em' }}>Recoverable</div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(1.4rem,3vw,1.9rem)', color: C.acc, fontVariantNumeric: 'tabular-nums' }}>{ghostMoney(recoverable)}</div>
            <div style={{ fontSize: '.74rem', color: C.mut }}>of {ghostMoney(ghost.deal.value)}</div>
          </div>
        </div>

        {/* replay */}
        <div style={{ borderRadius: 14, background: 'rgba(255,255,255,.03)', border: `1px solid ${C.line}`, padding: '.5rem .25rem .3rem' }}>
          <Replay ghost={ghost} />
        </div>

        {/* recommended intervention */}
        <div style={{ marginTop: '1.1rem', borderRadius: 14, border: `1px solid ${C.cardLine}`, background: 'linear-gradient(135deg, rgba(143,127,255,.12), rgba(255,255,255,.02))', padding: '1rem 1.05rem' }}>
          <div className="row between wrap gap-2" style={{ alignItems: 'center', marginBottom: '.5rem' }}>
            <span className="row gap-2" style={{ alignItems: 'center' }}>
              <Icon name="zap" size={16} style={{ color: C.acc }} />
              <span style={{ fontWeight: 800, color: C.ink }}>Recommended intervention</span>
            </span>
            <span style={{ fontSize: '.74rem', color: C.mut }}>at {stageById(topFix.stageId)?.name}</span>
          </div>
          <div style={{ fontWeight: 700, color: C.ink, fontSize: '1.02rem', marginBottom: '.3rem' }}>{topFix.label}</div>
          <div style={{ color: C.sub, fontSize: '.88rem', lineHeight: 1.55 }}>{topFix.detail}</div>
          <div className="row gap-2 wrap" style={{ marginTop: '.85rem' }}>
            <button onClick={askRook} className="row gap-1" style={{ padding: '.55rem .9rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', color: '#fff', background: `linear-gradient(135deg, ${C.acc}, #6d5cf7)`, boxShadow: '0 8px 22px rgba(109,92,247,.4)' }}>
              <Icon name="sparkles" size={15} /> Draft the play with Rook
            </button>
            <button onClick={() => navigate(`/deals/${ghost.deal.id}`)} className="row gap-1" style={{ padding: '.55rem .9rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', color: C.sub, background: 'rgba(255,255,255,.05)', border: `1px solid ${C.cardLine}` }}>
              Open deal <Icon name="chevronRight" size={15} />
            </button>
          </div>
        </div>

        {/* divergences vs the winner */}
        {divergences.length > 0 && (
          <div style={{ marginTop: '1.1rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.mut, marginBottom: '.6rem' }}>
              What the closest win did differently
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '.6rem' }}>
              {divergences.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '.6rem', padding: '.7rem .75rem', borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
                  <Icon name={d.icon} size={16} style={{ color: C.acc, flex: 'none', marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row gap-1" style={{ alignItems: 'baseline', fontSize: '.82rem' }}>
                      <span style={{ fontWeight: 700, color: C.ink }}>{d.label}</span>
                    </div>
                    <div style={{ fontSize: '.78rem', color: C.sub, lineHeight: 1.45, marginTop: 2 }}>
                      <span style={{ color: C.lost, fontWeight: 700 }}>{d.mine}</span>
                      <Icon name="chevronRight" size={11} style={{ color: C.mut, margin: '0 2px', verticalAlign: 'middle' }} />
                      <span style={{ color: C.won, fontWeight: 700 }}>{d.theirs}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* other interventions ranked */}
        {rest.length > 0 && (
          <div style={{ marginTop: '1.1rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.mut, marginBottom: '.6rem' }}>
              Other moves swept
            </div>
            <div className="col gap-2">
              {rest.map((f) => <FixRow key={f.key} fix={f} recovered={Math.round(ghost.deal.value * f.delta / 100)} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '.74rem', color: C.mut, lineHeight: 1.5 }}>
          Counterfactuals are grounded: each fork branches from this deal's real activity, committee and pricing at a real divergence stage, then is re-scored with the same model the live pipeline uses. No synthetic data.
        </div>
      </div>
    </div>
  );
}
