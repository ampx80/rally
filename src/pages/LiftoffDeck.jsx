// ============================================================
// LIFTOFF DECK  (/liftoff/deck/:role in-app  +  /deck/:role public)
// ------------------------------------------------------------
// ONE beautiful, fully-loaded, layer-specific deck - the artifact
// every person in a 500-1000 org receives. Each layer sees only
// what it needs; the Master deck shows the whole company.
//
// Two render modes, one component:
//   - IN-APP  (default): rendered inside the Ardovo product shell at
//     /liftoff/deck/:role. Module cards deep-link to real routes,
//     the role switcher navigates in-app, Rook handoff is live.
//   - EMBED   (standalone): rendered chrome-free for an <iframe> on
//     the marketing site at /deck/:role (or with the `embed` prop /
//     ?embed=1). Self-contained scoped <style> with token fallbacks
//     (light + dark), a "Powered by Ardovo" footer, zero login.
//
// Resolution never 404s to a blank page: getDeck(role) first, then
// the seeded DEMO deck for that role, then the Master deck. The
// engine (src/lib/liftoff-data.js) is fully local-first + seeded, so
// this surface is alive on first load with no backend.
//
// ADDITIVE ONLY - this file is new. No existing file is edited.
// ASCII only. NO em-dash and NO en-dash anywhere.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  ROLES, getDeck, getDecks, getPlan, useLiftoff,
  formatKpi, moduleLabel, moduleRoute, roleMeta, DEMO_PLAN,
} from '../lib/liftoff-data.js';

/* ============================================================
   MOTION  -  reduced-motion aware count-up driven by an in-file
   IntersectionObserver. Numbers hold at rest until the tile scrolls
   into view, then ease to their target. Non-numeric values and the
   reduced-motion path render the final value immediately.
   ============================================================ */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch { return; }
    const h = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', h); else if (mq.removeListener) mq.removeListener(h); };
  }, []);
  return reduced;
}

function useCountUp(target, format, dur = 1150) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const numeric = typeof target === 'number' && isFinite(target);
  const decimals = numeric && !Number.isInteger(target) ? 1 : 0;
  const [val, setVal] = useState(numeric && !reduced ? 0 : target);
  const started = useRef(false);

  useEffect(() => {
    if (!numeric) { setVal(target); return; }
    if (reduced) { setVal(target); return; }
    const el = ref.current;
    if (!el) { setVal(target); return; }
    let raf, startT;
    const animate = () => {
      if (started.current) return;
      started.current = true;
      const step = (t) => {
        if (!startT) startT = t;
        const p = Math.min(1, (t - startT) / dur);
        setVal(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (typeof IntersectionObserver === 'undefined') {
      animate();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(); io.disconnect(); } });
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, numeric, reduced, dur]);

  const rounded = numeric ? (decimals ? Math.round(val * 10) / 10 : Math.round(val)) : target;
  const display = formatKpi(rounded, format);
  return { ref, display };
}

/* ============================================================
   RESOLUTION  -  never returns null. getDeck first, then the seeded
   DEMO deck for that role, then Master. Guarantees a populated deck
   for any role string, known or not.
   ============================================================ */
function resolveDeck(roleKey) {
  const live = getDeck(roleKey);
  if (live) return live;
  const demo = (DEMO_PLAN.decks || []).find((d) => d.role === roleKey);
  if (demo) return demo;
  return getDeck('master')
    || (DEMO_PLAN.decks || []).find((d) => d.role === 'master')
    || (DEMO_PLAN.decks || [])[0]
    || null;
}

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* Accent helpers - one confident color per layer, softened for fills. */
function accentSoft(accent, pct) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}
function trendGlyph(dir) {
  if (dir === 'up') return 'trendUp';
  if (dir === 'down') return 'arrowDown';
  return 'arrowRight';
}

/* ============================================================
   KPI HERO TILE  -  big animated number, hero-scale type.
   ============================================================ */
function KpiTile({ kpi, accent }) {
  const { ref, display } = useCountUp(kpi.value, kpi.format);
  return (
    <div
      ref={ref}
      className="lo-kpi card"
      style={{ padding: '1.3rem 1.4rem', position: 'relative', overflow: 'hidden' }}
    >
      <span aria-hidden style={{ position: 'absolute', top: -34, right: -34, width: 120, height: 120, borderRadius: '50%', background: accent, opacity: 0.09, filter: 'blur(10px)' }} />
      <div className="row between" style={{ position: 'relative', gap: '.5rem' }}>
        <span className="lo-kpi-label">{kpi.label}</span>
        <span style={{ color: accent, flex: 'none' }}><Icon name={trendGlyph(kpi.trendDir)} size={16} /></span>
      </div>
      <div className="lo-kpi-value" style={{ position: 'relative' }}>{display}</div>
      {kpi.hint && <div className="lo-kpi-hint" style={{ position: 'relative' }}>{kpi.hint}</div>}
    </div>
  );
}

/* ============================================================
   MODULE CARD  -  the surfaces this layer lives in.
   In-app: a real deep link. Embed: a static informational chip.
   ============================================================ */
function ModuleCard({ moduleKey, accent, embed }) {
  const label = moduleLabel(moduleKey);
  const to = moduleRoute(moduleKey);
  const inner = (
    <>
      <span className="lo-mod-glyph" style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 62%, #000 10%))` }}>
        <Icon name="grid" size={18} stroke={1.9} />
      </span>
      <div className="col" style={{ minWidth: 0, gap: 2 }}>
        <span className="lo-mod-label">{label}</span>
        <span className="lo-mod-route mono">{to}</span>
      </div>
      {!embed && <Icon name="arrowRight" size={16} className="lo-mod-arrow" />}
    </>
  );
  if (embed) {
    return <div className="lo-mod lo-mod-static">{inner}</div>;
  }
  return <Link to={to} className="lo-mod">{inner}</Link>;
}

/* ============================================================
   MAIN
   props:
     embed / standalone (bool)  -> force chrome-free embed mode
     role (string)              -> override the URL param (optional)
   ============================================================ */
export default function LiftoffDeck({ embed: embedProp = false, standalone = false, role: roleProp }) {
  useLiftoff((s) => s);                 // re-render on any Liftoff mutation
  const params = useParams();
  const location = useLocation();
  const [search] = useSearchParams();

  const roleKey = (roleProp || params.role || 'master').toLowerCase();

  // Embed is on when: told so by prop, ?embed=1, or served from the public
  // standalone /deck/ route (no product shell around it).
  const embed = !!(
    embedProp || standalone ||
    search.get('embed') === '1' ||
    location.pathname === '/deck' ||
    location.pathname.startsWith('/deck/')
  );

  const plan = getPlan();
  const company = (plan && plan.company && plan.company.name) || 'Your company';
  const deck = useMemo(() => resolveDeck(roleKey), [roleKey, plan]);

  if (!deck) return null; // engine guarantees this never happens; belt-and-suspenders

  const accent = deck.accent || '#5b4bf5';
  const meta = roleMeta(deck.role) || {};
  const isMaster = deck.role === 'master';
  const basePath = embed ? '/deck' : '/liftoff/deck';

  // Master shows the whole company: cards for every generated layer deck.
  const layerDecks = isMaster ? (getDecks() || []).filter((d) => d.role !== 'master') : [];

  const briefPrompt = `Give me a one-paragraph brief of the ${deck.label} Liftoff deck for ${company}: what it shows, why it matters to ${meta.audience || 'this team'}, and the first thing they should do.`;

  const Body = (
    <div className={`lo-deck${embed ? ' lo-deck-embed' : ''} page-in`}>
      {/* ---------- CINEMATIC HEADER ---------- */}
      <header
        className="lo-hero"
        style={{
          background: `linear-gradient(125deg, ${accent} 0%, color-mix(in srgb, ${accent} 68%, #0e1116 42%) 62%, #12151c 100%)`,
        }}
      >
        <span aria-hidden className="lo-hero-orb lo-hero-orb-a" style={{ background: `radial-gradient(circle, ${accentSoft('#ffffff', 26)}, transparent 70%)` }} />
        <span aria-hidden className="lo-hero-orb lo-hero-orb-b" style={{ background: `radial-gradient(circle, ${accentSoft(accent, 60)}, transparent 70%)` }} />
        <div className="lo-hero-inner">
          <div className="row wrap" style={{ gap: '.6rem', alignItems: 'center' }}>
            <span className="lo-hero-eyebrow">Liftoff deck</span>
            <span className="lo-hero-dot" aria-hidden />
            <span className="lo-hero-eyebrow lo-hero-eyebrow-soft">{company}</span>
          </div>
          <h1 className="lo-hero-headline">{deck.headline}</h1>
          <div className="row wrap" style={{ gap: '.5rem', marginTop: '1.1rem' }}>
            <span className="lo-hero-chip lo-hero-chip-solid">{deck.label}</span>
            {meta.audience && <span className="lo-hero-chip">For {meta.audience}</span>}
            <span className="lo-hero-chip">{(deck.kpis || []).length} key metrics</span>
            <span className="lo-hero-chip">{(deck.modules || []).length} modules</span>
          </div>
        </div>
      </header>

      <div className="lo-body">
        {/* ---------- WHY THIS DECK ---------- */}
        <section className="lo-why">
          <div className="lo-why-mark" style={{ background: accentSoft(accent, 14), color: accent }}>
            <Icon name="sparkles" size={20} />
          </div>
          <div className="col" style={{ gap: '.35rem', minWidth: 0 }}>
            <div className="lo-eyebrow" style={{ color: accent }}>Why this deck is built for you</div>
            <p className="lo-why-text">{deck.why}</p>
          </div>
        </section>

        {/* ---------- KPI HERO ROW ---------- */}
        <section className="lo-section">
          <div className="lo-section-head">
            <h2 className="lo-h2">The numbers that matter here</h2>
            <span className="lo-section-sub">Live, seeded from your rollout</span>
          </div>
          <div className="lo-kpi-grid stagger">
            {(deck.kpis || []).map((k, i) => (
              <KpiTile key={`${k.label}-${i}`} kpi={k} accent={accent} />
            ))}
          </div>
        </section>

        {/* ---------- MODULES THIS LAYER LIVES IN ---------- */}
        {(deck.modules || []).length > 0 && (
          <section className="lo-section">
            <div className="lo-section-head">
              <h2 className="lo-h2">Where this layer works</h2>
              <span className="lo-section-sub">{embed ? 'Modules switched on for this team' : 'Jump straight into any surface'}</span>
            </div>
            <div className="lo-mod-grid stagger">
              {deck.modules.map((mk) => (
                <ModuleCard key={mk} moduleKey={mk} accent={accent} embed={embed} />
              ))}
            </div>
          </section>
        )}

        {/* ---------- MASTER: EVERY LAYER ---------- */}
        {isMaster && layerDecks.length > 0 && (
          <section className="lo-section">
            <div className="lo-section-head">
              <h2 className="lo-h2">Every layer, one source of truth</h2>
              <span className="lo-section-sub">{layerDecks.length} scoped decks generated</span>
            </div>
            <div className="lo-layer-grid stagger">
              {layerDecks.map((d) => {
                const dm = roleMeta(d.role) || {};
                const card = (
                  <>
                    <span className="lo-layer-bar" style={{ background: d.accent }} />
                    <div className="col" style={{ gap: '.3rem', minWidth: 0 }}>
                      <span className="lo-layer-label">{d.label}</span>
                      <span className="lo-layer-aud">{dm.audience || ''}</span>
                      <span className="lo-layer-meta">{(d.kpis || []).length} metrics {'·'} {(d.modules || []).length} modules</span>
                    </div>
                    {!embed && <Icon name="arrowRight" size={16} className="lo-mod-arrow" />}
                  </>
                );
                return embed
                  ? <div key={d.role} className="lo-layer lo-mod-static">{card}</div>
                  : <Link key={d.role} to={`${basePath}/${d.role}`} className="lo-layer">{card}</Link>;
              })}
            </div>
          </section>
        )}

        {/* ---------- SECTIONS (prose + bullets) ---------- */}
        {(deck.sections || []).length > 0 && (
          <section className="lo-section lo-sections-grid">
            {deck.sections.map((s, i) => (
              <Card key={i} className="lo-sec-card">
                <div className="row" style={{ gap: '.6rem', alignItems: 'center', marginBottom: '.55rem' }}>
                  <span className="lo-sec-num" style={{ background: accentSoft(accent, 14), color: accent }}>{i + 1}</span>
                  <h3 className="lo-h3">{s.title}</h3>
                </div>
                {s.body && <p className="lo-sec-body">{s.body}</p>}
                {Array.isArray(s.bullets) && s.bullets.length > 0 && (
                  <ul className="lo-bullets">
                    {s.bullets.map((b, bi) => (
                      <li key={bi}>
                        <Icon name="check" size={15} style={{ color: accent, flex: 'none', marginTop: 3 }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </section>
        )}

        {/* ---------- NEXT ACTIONS ---------- */}
        {(deck.nextActions || []).length > 0 && (
          <section className="lo-section">
            <div className="lo-section-head">
              <h2 className="lo-h2">Your first moves</h2>
              <span className="lo-section-sub">Start here on day one</span>
            </div>
            <div className="lo-actions">
              {deck.nextActions.map((a, i) => {
                const rookable = /ask rook/i.test(a);
                return (
                  <div key={i} className="lo-action">
                    <span className="lo-action-num" style={{ borderColor: accentSoft(accent, 45), color: accent }}>{i + 1}</span>
                    <span className="lo-action-text">{a}</span>
                    {rookable && !embed && (
                      <button
                        type="button"
                        className="lo-action-rook"
                        onClick={() => askRook(a)}
                        style={{ color: accent, borderColor: accentSoft(accent, 40) }}
                      >
                        <Icon name="sparkles" size={14} /> Ask Rook
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------- ROLE SWITCHER ---------- */}
        <section className="lo-section lo-switch">
          <div className="lo-switch-head">
            <Icon name="layers" size={16} style={{ color: accent }} />
            <span>Preview another layer's deck</span>
          </div>
          <div className="lo-switch-chips">
            {ROLES.map((r) => {
              const on = r.key === deck.role;
              return (
                <Link
                  key={r.key}
                  to={`${basePath}/${r.key}`}
                  className={`lo-chip${on ? ' lo-chip-on' : ''}`}
                  style={on ? { background: r.accent, borderColor: r.accent, color: '#fff' } : { borderColor: accentSoft(r.accent, 38) }}
                  aria-current={on ? 'page' : undefined}
                >
                  <span className="lo-chip-dot" style={{ background: r.accent }} />
                  {r.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------- IN-APP CTA BAR (hidden in embed) ---------- */}
        {!embed && (
          <section className="lo-cta">
            <div className="col" style={{ gap: '.25rem', minWidth: 0 }}>
              <div className="lo-h3">Want Rook to walk your team through this deck?</div>
              <div className="lo-section-sub">One tap hands this layer to your AI operator.</div>
            </div>
            <div className="row wrap" style={{ gap: '.6rem' }}>
              <Button variant="ghost" onClick={() => askRook(briefPrompt)}>
                <Icon name="sparkles" size={16} /> Brief me
              </Button>
              <Button as={Link} to="/liftoff" variant="primary">
                <Icon name="rocket" size={16} /> Back to Liftoff
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* ---------- EMBED FOOTER ---------- */}
      {embed && (
        <footer className="lo-embed-footer">
          <span className="lo-embed-mark"><Icon name="zap" size={14} fill="currentColor" stroke={0} /></span>
          <span>Powered by <strong>Ardovo</strong></span>
          <span className="lo-embed-sep" aria-hidden>{'·'}</span>
          <span className="lo-embed-tag">Liftoff builds a deck like this for every layer of your company</span>
        </footer>
      )}
    </div>
  );

  // Embed mode gets a self-contained full-bleed root so it drops cleanly into
  // an iframe even without the app shell around it.
  return (
    <>
      <style>{SCOPED_CSS}</style>
      {embed ? <div className="lo-embed-root">{Body}</div> : Body}
    </>
  );
}

/* ============================================================
   SCOPED STYLE  -  everything the deck needs, prefixed .lo-*.
   Token fallbacks live on .lo-embed-root so the standalone route
   renders correctly (light + dark via prefers-color-scheme) even
   with no global stylesheet. In-app, the real design tokens win.
   ============================================================ */
const SCOPED_CSS = `
.lo-embed-root {
  --accent: #5b4bf5; --accent-600: #4a3ce0;
  --ink: #0e1116; --ink-2: #3a4150;
  --page: #f6f7f9; --paper: #ffffff;
  --line: #e7e9ee; --line-strong: #d4d8e0;
  --n-25: #fafbfc; --n-50: #f3f5f7; --n-100: #e9ecf1; --n-400: #98a1b0; --n-600: #5b6474;
  --r-sm: 7px; --r-md: 11px; --r-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(16,20,30,.06), 0 1px 3px rgba(16,20,30,.05);
  --shadow-md: 0 6px 18px rgba(16,20,30,.08), 0 2px 6px rgba(16,20,30,.05);
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  min-height: 100vh; background: var(--page); color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 17px; line-height: 1.5; -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .lo-embed-root {
    --ink: #eef1f6; --ink-2: #aeb8c6; --page: #0a0d13; --paper: #141924;
    --line: #232a38; --line-strong: #303a4b;
    --n-25: #171d29; --n-50: #1b212e; --n-100: #232a38; --n-400: #6d7889; --n-600: #97a1b2;
    --shadow-sm: 0 1px 2px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.3);
    --shadow-md: 0 6px 18px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.35);
  }
}

.lo-deck { --lo-maxw: 1080px; }
.lo-deck * { box-sizing: border-box; }
.lo-deck-embed { padding-bottom: 0; }

/* hero */
.lo-hero { position: relative; overflow: hidden; border-radius: var(--r-lg); color: #fff; }
.lo-deck-embed .lo-hero { border-radius: 0; }
.lo-hero-inner { position: relative; z-index: 2; max-width: var(--lo-maxw); margin: 0 auto; padding: clamp(2.2rem, 5vw, 3.6rem) clamp(1.25rem, 4vw, 2.4rem); }
.lo-hero-orb { position: absolute; border-radius: 50%; filter: blur(46px); pointer-events: none; z-index: 1; }
.lo-hero-orb-a { width: 420px; height: 420px; top: -160px; right: -60px; }
.lo-hero-orb-b { width: 360px; height: 360px; bottom: -180px; left: -80px; }
.lo-hero-eyebrow { font-size: .78rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #fff; }
.lo-hero-eyebrow-soft { color: rgba(255,255,255,.78); }
.lo-hero-dot { width: 5px; height: 5px; border-radius: 999px; background: rgba(255,255,255,.55); display: inline-block; }
.lo-hero-headline { margin: 1rem 0 0; font-weight: 800; letter-spacing: -.03em; line-height: 1.06; font-size: clamp(2.1rem, 5.2vw, 3.5rem); max-width: 20ch; text-wrap: balance; }
.lo-hero-chip { font-size: .86rem; font-weight: 600; padding: .34rem .8rem; border-radius: 999px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22); color: #fff; backdrop-filter: blur(4px); }
.lo-hero-chip-solid { background: rgba(255,255,255,.95); color: #12151c; border-color: transparent; font-weight: 700; }

/* body shell */
.lo-body { max-width: var(--lo-maxw); margin: 0 auto; padding: clamp(1.4rem, 3vw, 2.2rem) clamp(1.1rem, 4vw, 2.4rem) 3rem; display: flex; flex-direction: column; gap: clamp(1.8rem, 3.5vw, 2.8rem); }
.lo-eyebrow { font-size: .74rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.lo-h2 { font-size: clamp(1.3rem, 2.4vw, 1.65rem); font-weight: 800; letter-spacing: -.02em; margin: 0; color: var(--ink); }
.lo-h3 { font-size: 1.14rem; font-weight: 700; letter-spacing: -.01em; margin: 0; color: var(--ink); }
.lo-section { display: flex; flex-direction: column; gap: 1rem; }
.lo-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.lo-section-sub { font-size: .9rem; color: var(--n-600); }

/* why */
.lo-why { display: flex; gap: 1rem; padding: 1.3rem 1.4rem; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); }
.lo-why-mark { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; flex: none; }
.lo-why-text { margin: 0; font-size: clamp(1.02rem, 1.6vw, 1.16rem); line-height: 1.62; color: var(--ink-2); }

/* kpi */
.lo-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
.lo-kpi-label { font-size: .78rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--n-600); line-height: 1.25; }
.lo-kpi-value { font-weight: 800; letter-spacing: -.03em; line-height: 1; font-size: clamp(2.3rem, 4.2vw, 3.1rem); margin-top: .55rem; color: var(--ink); font-variant-numeric: tabular-nums; }
.lo-kpi-hint { margin-top: .5rem; font-size: .84rem; color: var(--n-600); }

/* modules */
.lo-mod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .8rem; }
.lo-mod { display: flex; align-items: center; gap: .8rem; padding: .85rem 1rem; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-sm); transition: transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s, border-color .16s; }
.lo-mod:not(.lo-mod-static):hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--line-strong); }
.lo-mod-glyph { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; flex: none; color: #fff; }
.lo-mod-label { font-weight: 700; font-size: 1rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lo-mod-route { font-size: .76rem; color: var(--n-600); }
.lo-mod-arrow { margin-left: auto; color: var(--n-400); flex: none; }

/* master layer grid */
.lo-layer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .8rem; }
.lo-layer { position: relative; display: flex; align-items: center; gap: .7rem; padding: 1rem 1.1rem 1rem 1.3rem; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-sm); overflow: hidden; transition: transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s, border-color .16s; }
.lo-layer:not(.lo-mod-static):hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--line-strong); }
.lo-layer-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.lo-layer-label { font-weight: 700; font-size: 1.02rem; color: var(--ink); }
.lo-layer-aud { font-size: .82rem; color: var(--n-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lo-layer-meta { font-size: .76rem; color: var(--n-400); }

/* sections */
.lo-sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.1rem; }
.lo-sec-card { padding: 1.35rem 1.45rem; }
.lo-sec-num { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; font-weight: 800; font-size: .95rem; flex: none; }
.lo-sec-body { margin: 0 0 .85rem; font-size: 1.02rem; line-height: 1.6; color: var(--ink-2); }
.lo-bullets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .55rem; }
.lo-bullets li { display: flex; gap: .55rem; align-items: flex-start; font-size: .98rem; line-height: 1.5; color: var(--ink); }

/* actions */
.lo-actions { display: flex; flex-direction: column; gap: .7rem; }
.lo-action { display: flex; align-items: center; gap: .9rem; padding: .95rem 1.1rem; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-sm); }
.lo-action-num { width: 30px; height: 30px; border-radius: 999px; border: 1.5px solid; display: grid; place-items: center; font-weight: 800; font-size: .95rem; flex: none; }
.lo-action-text { font-size: 1.04rem; font-weight: 600; color: var(--ink); flex: 1; min-width: 0; }
.lo-action-rook { display: inline-flex; align-items: center; gap: .35rem; font-size: .84rem; font-weight: 700; padding: .4rem .7rem; border-radius: 999px; border: 1px solid; background: transparent; cursor: pointer; flex: none; transition: background .14s; }
.lo-action-rook:hover { background: var(--n-50); }

/* switcher */
.lo-switch { gap: .8rem; }
.lo-switch-head { display: flex; align-items: center; gap: .5rem; font-size: .82rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--n-600); }
.lo-switch-chips { display: flex; flex-wrap: wrap; gap: .55rem; }
.lo-chip { display: inline-flex; align-items: center; gap: .45rem; padding: .5rem .9rem; border-radius: 999px; border: 1px solid var(--line-strong); background: var(--paper); font-size: .92rem; font-weight: 600; color: var(--ink); cursor: pointer; transition: transform .14s, box-shadow .14s, border-color .14s; }
.lo-chip:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.lo-chip-on { box-shadow: var(--shadow-sm); }
.lo-chip-dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
.lo-chip-on .lo-chip-dot { background: rgba(255,255,255,.9) !important; }

/* in-app cta */
.lo-cta { display: flex; align-items: center; justify-content: space-between; gap: 1.2rem; flex-wrap: wrap; padding: 1.4rem 1.5rem; border-radius: var(--r-lg); border: 1px solid var(--line); background: var(--n-25); }

/* embed footer */
.lo-embed-footer { display: flex; align-items: center; justify-content: center; gap: .5rem; flex-wrap: wrap; padding: 1.2rem 1.5rem 1.6rem; border-top: 1px solid var(--line); font-size: .9rem; color: var(--n-600); text-align: center; }
.lo-embed-footer strong { color: var(--ink); font-weight: 800; }
.lo-embed-mark { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: linear-gradient(135deg, #6d5cf7, #4a3ce0); color: #fff; flex: none; }
.lo-embed-sep { color: var(--n-400); }
.lo-embed-tag { color: var(--n-400); }

@media (max-width: 640px) {
  .lo-embed-root { font-size: 16px; }
  .lo-why { flex-direction: column; }
  .lo-cta { flex-direction: column; align-items: flex-start; }
  .lo-embed-tag { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lo-mod, .lo-layer, .lo-chip { transition: none !important; }
}
`;
