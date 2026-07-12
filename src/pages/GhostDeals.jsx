// ============================================================
// GHOST DEALS  -  counterfactuals on your own history.
// The graveyard surface: every lost deal reconstructed as it stood
// the day it died, ranked by how much was recoverable, aggregated
// into the ONE systemic leak that cost the book the most. Pick any
// headstone and the cinematic GhostDealPanel replays it side by side
// with the closest deal that actually WON. A second strip surfaces
// OPEN deals already drifting toward the same fate, so the tool is a
// preventative, not just an autopsy.
//
// 100% additive + read-only. Every figure comes from src/lib/ghost-deals.js
// which reads the live store / depth store / intelligence scorer and never
// writes. Self-contained dark "cinema" stage (accent #5b4bf5) so it reads as
// a distinct lens on top of either theme. 60fps transform/opacity only,
// reduced-motion safe.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getDeals } from '../lib/store.js';
import { useDepth } from '../lib/store-depth.js';
import {
  ghostRegretReport, ghostForDeal, ghostMoney, ghostCategoryMeta,
} from '../lib/ghost-deals.js';
import GhostDealPanel from '../components/GhostDealPanel.jsx';
import { Icon } from '../components/icons.jsx';

/* Cinema palette - fixed dark spectral surface, theme-independent by design,
   matched to GhostDealPanel so the page and the panel read as one stage. */
const C = {
  bg: 'linear-gradient(160deg, #16172f 0%, #0c0d1c 56%, #191733 100%)',
  ink: '#efeefb',
  sub: '#c7c5e6',
  mut: '#9c9ac2',
  acc: '#8f7fff',
  accDeep: '#5b4bf5',
  accSoft: 'rgba(143,127,255,.16)',
  line: 'rgba(255,255,255,.09)',
  card: 'rgba(255,255,255,.045)',
  cardLine: 'rgba(140,124,255,.16)',
  lost: '#ff6f61',
  won: '#37d99a',
};

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Inject page keyframes once (reduced-motion safe via @media). */
let injected = false;
function ensurePageStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.id = 'ghost-deals-page-styles';
  el.textContent = `
@keyframes gdpRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes gdpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes gdpGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes gdpPulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
.gdp-rise { animation: gdpRise .5s cubic-bezier(.22,1,.36,1) both; }
.gdp-float { animation: gdpFloat 5s ease-in-out infinite; }
.gdp-grow { transform-origin: left center; animation: gdpGrow 1s cubic-bezier(.22,1,.36,1) both; }
.gdp-pulse { animation: gdpPulse 2.6s ease-in-out infinite; }
.gdp-card { transition: transform .18s cubic-bezier(.22,1,.36,1), border-color .18s, background .18s; will-change: transform; }
.gdp-card:hover { transform: translateY(-2px); border-color: rgba(143,127,255,.5) !important; }
.gdp-card:focus-visible { outline: 2px solid #8f7fff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .gdp-rise, .gdp-float, .gdp-grow, .gdp-pulse { animation: none !important; }
  .gdp-grow { transform: none !important; }
}`;
  document.head.appendChild(el);
}

function GhostMark({ size = 26, color = C.acc, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity }}>
      <path d="M12 2.5c-4 0-6.4 3-6.4 7v10.2c0 .7.8 1.1 1.4.7l1.4-1a1 1 0 0 1 1.2 0l1.2.9a1 1 0 0 0 1.2 0l1.2-.9a1 1 0 0 1 1.2 0l1.2.9a1 1 0 0 0 1.2 0l1.4-1c.6-.4 1.4 0 1.4.7"
        stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <path d="M12 2.5c-4 0-6.4 3-6.4 7v9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9.4" cy="10.5" r="1.15" fill={color} />
      <circle cx="14.6" cy="10.5" r="1.15" fill={color} />
    </svg>
  );
}

/* ---------- big headline stat ---------- */
function BigStat({ label, value, sub, color = C.ink, delay = 0 }) {
  return (
    <div className="gdp-rise col" style={{ minWidth: 0, lineHeight: 1.15, animationDelay: `${delay}ms` }}>
      <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: C.mut }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 'clamp(1.7rem, 3.6vw, 2.5rem)', color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: '.82rem', color: C.sub, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ---------- the systemic-leak breakdown ---------- */
function LeakBreakdown({ leaks, total }) {
  if (!leaks.length || !total) return null;
  return (
    <div className="col gap-2">
      <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.mut }}>
        Where the money leaked
      </div>
      <div className="col gap-2">
        {leaks.map((l, i) => {
          const pct = Math.round((l.value / total) * 100);
          return (
            <div key={l.category} className="row gap-2" style={{ alignItems: 'center' }}>
              <span style={{ width: 132, flex: 'none', fontSize: '.86rem', fontWeight: 700, color: C.sub }} className="clip">{l.label}</span>
              <div style={{ flex: 1, height: 12, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', minWidth: 0 }}>
                <div className="gdp-grow" style={{ height: '100%', width: `${Math.max(4, pct)}%`, borderRadius: 999, background: `linear-gradient(90deg, ${l.color}, ${C.accDeep})`, animationDelay: `${i * 90}ms`, boxShadow: `0 0 14px ${l.color}` }} />
              </div>
              <span style={{ flex: 'none', textAlign: 'right', width: 128, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 800, color: C.ink }}>{ghostMoney(l.value)}</span>
                <span style={{ fontSize: '.76rem', color: C.mut, marginLeft: 6 }}>{l.count} deal{l.count === 1 ? '' : 's'}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- a single headstone card in the graveyard list ---------- */
function GhostCard({ ghost, active, onPick }) {
  const meta = ghost.topFix ? ghostCategoryMeta(ghost.topFix.category) : { label: 'No recoverable path', color: C.mut };
  const target = ghost.topFix ? Math.min(95, ghost.baselineWinProb + ghost.topFix.delta) : ghost.baselineWinProb;
  return (
    <button
      type="button"
      onClick={() => onPick(ghost.deal.id)}
      className="gdp-card row gap-2"
      aria-pressed={active}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', alignItems: 'center',
        padding: '.8rem .9rem', borderRadius: 14,
        border: `1px solid ${active ? 'rgba(143,127,255,.55)' : C.cardLine}`,
        background: active ? 'linear-gradient(135deg, rgba(143,127,255,.16), rgba(255,255,255,.03))' : C.card,
        boxShadow: active ? '0 10px 30px rgba(91,75,245,.28)' : 'none',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, flex: 'none', background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
      <span className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
        <span style={{ fontWeight: 700, color: C.ink, fontSize: '.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ghost.company?.name || ghost.deal.name.split(' - ')[0]}
        </span>
        <span style={{ fontSize: '.78rem', color: C.mut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meta.label}{ghost.analog ? ` - ${ghost.analog.similarity}% match to a win` : ''}
        </span>
      </span>
      <span className="col" style={{ flex: 'none', textAlign: 'right', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 800, color: ghost.recoverable ? C.won : C.mut, fontVariantNumeric: 'tabular-nums' }}>
          {ghost.recoverable ? ghostMoney(ghost.recoverable) : '-'}
        </span>
        <span style={{ fontSize: '.72rem', color: C.mut, fontVariantNumeric: 'tabular-nums' }}>
          {ghost.baselineWinProb}% {'->'} {target}%
        </span>
      </span>
    </button>
  );
}

export default function GhostDeals() {
  const snap = useStore();
  useDepth();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  useEffect(() => { ensurePageStyles(); }, []);

  // Aggregate graveyard report (lost deals) + open deals already drifting.
  const report = useMemo(() => ghostRegretReport(), [snap]);
  const drifting = useMemo(() =>
    getDeals()
      .filter(d => d.status === 'open')
      .map(d => ghostForDeal(d.id))
      .filter(g => g && g.topFix)
      .sort((a, b) => b.recoverable - a.recoverable)
      .slice(0, 5),
  [snap]);

  const ranked = report.ghosts;              // lost deals, sorted by recoverable desc
  const [selectedId, setSelectedId] = useState(null);
  const selectedId2 = selectedId || ranked[0]?.deal.id || drifting[0]?.deal.id || null;
  const selectedGhost = useMemo(() => {
    if (!selectedId2) return null;
    return ranked.find(g => g.deal.id === selectedId2)
      || drifting.find(g => g.deal.id === selectedId2)
      || ghostForDeal(selectedId2);
  }, [selectedId2, ranked, drifting]);

  const pick = (id) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const nothing = ranked.length === 0 && drifting.length === 0;

  return (
    <div className="fade-up" style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* ================= HERO STAGE ================= */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: C.bg, border: `1px solid ${C.cardLine}`, color: C.ink, boxShadow: '0 24px 70px rgba(8,6,26,.5)' }}>
        {/* spectral glows */}
        <div aria-hidden style={{ position: 'absolute', top: -120, right: -60, width: 340, height: 340, borderRadius: '50%', background: `radial-gradient(circle, rgba(91,75,245,.32), transparent 66%)`, pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -140, left: -80, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, rgba(143,127,255,.16), transparent 68%)`, pointerEvents: 'none' }} />
        <span aria-hidden className="gdp-float" style={{ position: 'absolute', top: 26, right: 34, opacity: .5 }}><GhostMark size={96} color={C.acc} /></span>

        <div style={{ position: 'relative', padding: 'clamp(1.3rem, 3vw, 2.1rem)' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="row center" style={{ width: 44, height: 44, borderRadius: 13, background: C.accSoft, border: `1px solid ${C.cardLine}`, flex: 'none' }}>
              <GhostMark size={24} />
            </span>
            <div className="col" style={{ lineHeight: 1.15 }}>
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: C.acc }}>Ghost Deals</span>
              <h1 style={{ margin: 0, color: C.ink, fontSize: 'clamp(1.5rem, 3.4vw, 2.15rem)', letterSpacing: '-.02em' }}>
                Counterfactuals on your own history
              </h1>
            </div>
          </div>
          <p style={{ color: C.sub, fontSize: '.98rem', lineHeight: 1.55, maxWidth: 640, marginTop: '.7rem', marginBottom: 0 }}>
            Every deal you lost, revived as it stood the day it died and re-scored with the same risk model the live pipeline uses. The closest deal that actually won becomes the control. The divergence is the lesson.
          </p>

          {nothing ? (
            <div className="col gap-2" style={{ marginTop: '1.6rem', padding: '1.4rem', borderRadius: 16, border: `1px solid ${C.line}`, background: C.card }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="check" size={18} style={{ color: C.won }} />
                <span style={{ fontWeight: 800, color: C.ink }}>No graveyard yet</span>
              </div>
              <span style={{ color: C.sub, fontSize: '.9rem' }}>Nothing has been closed lost and nothing open is drifting. Every deal is still winnable.</span>
            </div>
          ) : (
            <>
              {/* regret headline stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.1rem', marginTop: '1.7rem', paddingTop: '1.4rem', borderTop: `1px solid ${C.line}` }}>
                <BigStat label="Lost this book" value={ghostMoney(report.lostValue)} sub={`${report.lostCount} deal${report.lostCount === 1 ? '' : 's'} closed lost`} color={C.lost} delay={0} />
                <BigStat label="Recoverable" value={ghostMoney(report.recoverableValue)} sub={`${report.recoverablePct}% of what was lost`} color={C.won} delay={70} />
                <BigStat label="Winnable again" value={String(report.winnableCount)} sub="had a graded recovery path" color={C.ink} delay={140} />
                {report.topLeak && (
                  <BigStat label="Top systemic leak" value={report.topLeak.label} sub={`${ghostMoney(report.topLeak.value)} across ${report.topLeak.count} deal${report.topLeak.count === 1 ? '' : 's'}`} color={C.acc} delay={210} />
                )}
              </div>

              {report.topLeak && report.recoverableValue > 0 && (
                <div className="gdp-rise" style={{ marginTop: '1.3rem', padding: '1rem 1.1rem', borderRadius: 14, border: `1px solid ${C.cardLine}`, background: 'linear-gradient(135deg, rgba(143,127,255,.12), rgba(255,255,255,.02))', animationDelay: '260ms' }}>
                  <div className="row gap-2" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Icon name="zap" size={16} style={{ color: C.acc, alignSelf: 'center' }} />
                    <span style={{ color: C.ink, fontSize: '1rem', lineHeight: 1.5 }}>
                      You bled <b style={{ color: C.acc }}>{ghostMoney(report.topLeak.value)}</b> this book to one thing: <b style={{ color: C.ink }}>{report.topLeak.label.toLowerCase()}</b>. Fix that pattern and {report.topLeak.count} deal{report.topLeak.count === 1 ? '' : 's'} like it stop leaking.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!nothing && (
        <>
          {/* ================= LEAK BREAKDOWN ================= */}
          {report.leaks.length > 0 && report.recoverableValue > 0 && (
            <div style={{ marginTop: '1.4rem', padding: 'clamp(1.1rem, 2.4vw, 1.5rem)', borderRadius: 18, background: C.bg, border: `1px solid ${C.cardLine}`, color: C.ink, boxShadow: '0 14px 44px rgba(8,6,26,.4)' }}>
              <LeakBreakdown leaks={report.leaks} total={report.recoverableValue} />
            </div>
          )}

          {/* ================= GRAVEYARD + REPLAY ================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: '1.4rem', marginTop: '1.4rem', alignItems: 'start' }} className="gd-graveyard-grid">
            {/* the graveyard list */}
            <div style={{ borderRadius: 18, background: C.bg, border: `1px solid ${C.cardLine}`, color: C.ink, boxShadow: '0 14px 44px rgba(8,6,26,.4)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.1rem .6rem' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.mut }}>The graveyard</div>
                <div style={{ fontSize: '.82rem', color: C.sub, marginTop: 3 }}>Ranked by recoverable value. Pick one to replay it.</div>
              </div>
              <div className="col gap-2" style={{ padding: '.4rem .8rem 1rem', maxHeight: 560, overflowY: 'auto' }}>
                {ranked.map(g => (
                  <GhostCard key={g.deal.id} ghost={g} active={g.deal.id === selectedId2} onPick={pick} />
                ))}
                {ranked.length === 0 && (
                  <div style={{ padding: '1rem', color: C.mut, fontSize: '.86rem' }}>No closed-lost deals in this book.</div>
                )}
              </div>

              {drifting.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.line}`, padding: '1rem 1.1rem .6rem' }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span className="gdp-pulse" style={{ width: 8, height: 8, borderRadius: 999, background: C.lost, boxShadow: `0 0 10px ${C.lost}` }} />
                    <div style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: C.mut }}>Drifting now</div>
                  </div>
                  <div style={{ fontSize: '.82rem', color: C.sub, marginTop: 3 }}>Open deals already on a ghost path.</div>
                </div>
              )}
              <div className="col gap-2" style={{ padding: drifting.length ? '.4rem .8rem 1rem' : 0 }}>
                {drifting.map(g => (
                  <GhostCard key={g.deal.id} ghost={g} active={g.deal.id === selectedId2} onPick={pick} />
                ))}
              </div>
            </div>

            {/* the cinematic replay for the selected deal */}
            <div ref={panelRef} style={{ minWidth: 0, scrollMarginTop: 84 }}>
              {selectedGhost
                ? <GhostDealPanel key={selectedGhost.deal.id} ghost={selectedGhost} />
                : (
                  <div style={{ padding: '2.4rem', borderRadius: 18, background: C.bg, border: `1px solid ${C.cardLine}`, color: C.sub, textAlign: 'center' }}>
                    Pick a deal from the graveyard to replay its ghost path.
                  </div>
                )}
            </div>
          </div>

          <div style={{ marginTop: '1.2rem', fontSize: '.78rem', color: 'var(--n-500, #8a8aa5)', lineHeight: 1.5, textAlign: 'center' }}>
            Read-only. Every counterfactual is mined deterministically from real activity, committee and pricing on your own deals, then re-scored with the same model the live pipeline uses. No synthetic data.
          </div>
        </>
      )}

      {/* one-column collapse on narrow viewports */}
      <style>{`@media (max-width: 900px){ .gd-graveyard-grid{ grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </div>
  );
}
