// ============================================================
// /guides/:slug - the JUGGERNAUT page (isolated best-in-class SEO track).
// Renders a juggernaut ENTRY object for humans with the SAME blocks the
// static prerender emits (juggernaut-render.js), but makes the surfaces
// INTERACTIVE and cinematic: calculators recompute live, stats count up
// on scroll, every block reveals as you reach it, an aurora hero breathes,
// diagrams draw themselves in, a reading-progress bar tracks the top, and
// a sticky scrollspy table of contents follows the reader. 404-safe.
//
// Fully additive: touches none of the /pages system and does not change
// the static output (render.js), only the live hydrated experience.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSeoHead } from './seo/head.js';
import { getJuggernaut } from './seo/juggernaut-registry.js';
import {
  metaForJug, guideCanonical, jsonLdForJuggernaut,
  renderDiagram, computeCalc, formatValue, blockAnchor,
} from './seo/juggernaut-render.js';

/* ---------- hooks ---------- */
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const h = () => setR(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h); };
  }, []);
  return r;
}

/* Count up to a numeric target once the element scrolls into view. */
function useCountUpOnView(target, { format, prefix, suffix, unit, duration = 1300 } = {}) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [v, setV] = useState(reduced ? target : 0);
  const started = useRef(false);
  useEffect(() => {
    if (reduced) { setV(target); return; }
    const el = ref.current; if (!el || typeof IntersectionObserver === 'undefined') { setV(target); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          let raf, t0 = null;
          const tick = (t) => {
            if (t0 == null) t0 = t;
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setV(target * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, reduced, duration]);
  const display = formatValue(v, format, { prefix, suffix, unit });
  return [ref, display];
}

/* Reveal blocks as they scroll into view; safety net un-hides everything. */
function useReveal(rootRef, reduced) {
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const els = Array.from(root.querySelectorAll('.jug-reveal'));
    if (reduced || typeof IntersectionObserver === 'undefined') { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    const safety = setTimeout(() => els.forEach((el) => el.classList.add('in')), 1500);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, [rootRef, reduced]);
}

/* Fill a reading-progress bar as the article scrolls under the viewport. */
function useReadingProgress(rootRef, barRef) {
  useEffect(() => {
    const root = rootRef.current, bar = barRef.current;
    if (!root || !bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = total > 0 ? (scrolled / total) * 100 : (rect.bottom <= vh ? 100 : 0);
      bar.style.width = pct.toFixed(2) + '%';
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [rootRef, barRef]);
}

/* Track which section heading is active for the sticky TOC. */
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0] || null);
  useEffect(() => {
    if (!ids.length || typeof IntersectionObserver === 'undefined') return;
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, bestR = 0;
      for (const [id, r] of seen) { if (r > bestR) { bestR = r; best = id; } }
      if (best) setActive(best);
    }, { rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids.join('|')]);
  return active;
}

/* ---------- diagram (reuse the exact static SVG string) ---------- */
function Diagram({ block }) {
  const html = useMemo(() => renderDiagram(block), [block]);
  return <div className="jug-diagram-mount" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- animated stat card ---------- */
function AnimatedStat({ stat, animate }) {
  const isNum = typeof stat.value === 'number';
  const [ref, display] = useCountUpOnView(isNum ? stat.value : 0, {
    format: stat.format, prefix: stat.prefix, suffix: stat.suffix, unit: stat.unit,
  });
  const shown = (animate && isNum)
    ? display
    : (isNum ? formatValue(stat.value, stat.format, { prefix: stat.prefix, suffix: stat.suffix, unit: stat.unit })
      : `${stat.prefix || ''}${stat.value}${stat.suffix || ''}`);
  return (
    <div className={stat.hero ? 'jug-hero-stat' : 'jug-stat'} ref={animate ? ref : null}>
      <div className={stat.hero ? 'jug-hero-stat-value' : 'jug-stat-value'}>{shown}</div>
      <div className={stat.hero ? 'jug-hero-stat-label' : 'jug-stat-label'}>{stat.label}</div>
      {stat.trend && !stat.hero && <div className={`jug-stat-trend jug-trend-${stat.trendDir || 'up'}`}>{stat.trend}</div>}
    </div>
  );
}

/* ---------- live calculator ---------- */
function Calculator({ block }) {
  const initial = useMemo(() => {
    const o = {};
    for (const inp of block.inputs || []) o[inp.key] = inp.default;
    return o;
  }, [block]);
  const [values, setValues] = useState(initial);
  const results = useMemo(() => computeCalc(block, values), [block, values]);
  const set = (key, raw) => setValues((v) => ({ ...v, [key]: raw }));

  return (
    <section className="jug-block jug-reveal jug-calculator" id={block._id}>
      {block.title && <h2 className="jug-h">{block.title}</h2>}
      {block.intro && arr(block.intro).map((p, i) => <p key={i} className="jug-p">{p}</p>)}
      <div className="jug-calc-shell jug-calc-live">
        <div className="jug-calc-fields">
          {(block.inputs || []).map((inp) => (
            <label className="jug-calc-field" key={inp.key}>
              <span className="jug-calc-field-label">{inp.label}{inp.unit ? ` (${inp.unit})` : ''}</span>
              {inp.type === 'select' ? (
                <select value={values[inp.key]} onChange={(e) => set(inp.key, e.target.value)}>
                  {(inp.options || []).map((o) => {
                    const val = o.value ?? o; const label = o.label ?? o;
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>
              ) : inp.type === 'range' ? (
                <span className="jug-calc-range">
                  <input type="range" min={inp.min} max={inp.max} step={inp.step || 1}
                    value={values[inp.key]} onChange={(e) => set(inp.key, Number(e.target.value))} />
                  <output>{values[inp.key]}{inp.unit ? ` ${inp.unit}` : ''}</output>
                </span>
              ) : (
                <input type="number" min={inp.min} max={inp.max} step={inp.step || 1}
                  value={values[inp.key]} onChange={(e) => set(inp.key, Number(e.target.value))} />
              )}
            </label>
          ))}
        </div>
        <table className="jug-calc-outputs">
          <caption>Your results</caption>
          <tbody>
            {(block.outputs || []).map((o) => (
              <tr key={o.key} className={o.highlight ? 'is-key' : ''}>
                <th scope="row">{o.label}</th>
                <td>{formatValue(results[o.key], o.format, { prefix: o.prefix, suffix: o.suffix, unit: o.unit })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- matrix cell ---------- */
function Cell({ v }) {
  if (v === true) return <span className="jug-cell-yes">Yes</span>;
  if (v === false) return <span className="jug-cell-no">No</span>;
  if (v === 'partial') return <span className="jug-cell-partial">Partial</span>;
  return <span className="jug-cell-text">{v}</span>;
}

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/* ---------- block dispatch (React) ---------- */
function Block({ block }) {
  const id = block._id;
  const Head = ({ title }) => title ? (
    block.level === 3
      ? <h3 id={id} className="jug-h">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{title}</h3>
      : <h2 id={id} className="jug-h">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{title}</h2>
  ) : null;
  const R = 'jug-block jug-reveal';

  switch (block.type) {
    case 'richText':
      return <section className={`${R} jug-richtext`} id={id}><Head title={block.title} />
        {arr(block.body).map((p, i) => <p key={i} className={block.lead ? 'jug-lead' : 'jug-p'}>{p}</p>)}</section>;
    case 'heading':
      return block.level === 3
        ? <h3 id={id} className="jug-h jug-standalone jug-reveal">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{block.text}</h3>
        : <h2 id={id} className="jug-h jug-standalone jug-reveal">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{block.text}</h2>;
    case 'diagram':
      return <section className={R} id={id}>
        <figure className="jug-diagram" data-variant={block.variant}>
          {block.title && <figcaption className="jug-diagram-title">{block.title}</figcaption>}
          <div className="jug-diagram-canvas"><Diagram block={block} /></div>
          {block.caption && <figcaption className="jug-diagram-caption">{block.caption}</figcaption>}
        </figure></section>;
    case 'stat':
    case 'animatedStat': {
      const items = block.stats || [block];
      return <section className={R} id={id}><Head title={block.title} />
        <div className="jug-stat-row">
          {items.map((s, i) => <AnimatedStat key={i} stat={s} animate={block.type === 'animatedStat'} />)}
        </div></section>;
    }
    case 'calculator':
      return <Calculator block={block} />;
    case 'comparisonMatrix': {
      const hc = block.highlightCol;
      return <section className={R} id={id}><Head title={block.title} />
        <div className="jug-matrix-scroll"><table className="jug-matrix">
          <thead><tr><th scope="col">{block.rowHeader || 'Capability'}</th>
            {(block.columns || []).map((c, i) => <th scope="col" key={i} className={i === hc ? 'is-key' : ''}>{c}</th>)}</tr></thead>
          <tbody>{(block.rows || []).map((r, ri) => <tr key={ri}><th scope="row">{r.feature}</th>
            {(r.cells || []).map((v, ci) => <td key={ci} className={ci === hc ? 'is-key' : ''}><Cell v={v} /></td>)}</tr>)}</tbody>
        </table></div>
        {block.footnote && <p className="jug-footnote">{block.footnote}</p>}</section>;
    }
    case 'prosCons':
      return <section className={`${R} jug-proscons`} id={id}><Head title={block.title} />
        <div className="jug-pc-grid">
          <div className="jug-pc jug-pc-pro"><div className="jug-pc-head">{block.prosLabel || 'Pros'}</div>
            <ul>{(block.pros || []).map((p, i) => <li key={i}>{p}</li>)}</ul></div>
          <div className="jug-pc jug-pc-con"><div className="jug-pc-head">{block.consLabel || 'Cons'}</div>
            <ul>{(block.cons || []).map((p, i) => <li key={i}>{p}</li>)}</ul></div>
        </div></section>;
    case 'steps': {
      const Tag = block.ordered === false ? 'ul' : 'ol';
      return <section className={R} id={id}><Head title={block.title} />
        <Tag className="jug-steps">{(block.steps || []).map((s, i) => <li className="jug-step" key={i}>
          <div className="jug-step-title">{s.title}</div>
          {arr(s.body).map((p, j) => <p key={j} className="jug-p">{p}</p>)}
          {s.detail && <div className="jug-step-detail">{s.detail}</div>}
        </li>)}</Tag></section>;
    }
    case 'quote':
      return <figure className={`${R} jug-quote`} id={id}><blockquote>{block.text}</blockquote>
        {block.cite && <figcaption>{block.cite}{block.role ? `, ${block.role}` : ''}</figcaption>}</figure>;
    case 'callout':
      return <aside className={`${R} jug-callout jug-tone-${block.tone || 'accent'}`} id={id}>
        {block.title && <div className="jug-callout-title">{block.title}</div>}
        {arr(block.body).map((p, i) => <p key={i} className="jug-p">{p}</p>)}</aside>;
    case 'faq':
      return <section className={`${R} jug-faq`} id={id}><Head title={block.title || 'Frequently asked questions'} />
        <div className="jug-faq-list">{(block.items || []).map((f, i) => (
          <details className="jug-faq-item" key={i}><summary>{f.q}</summary>
            <div className="jug-faq-a">{arr(f.a).map((p, j) => <p key={j} className="jug-p">{p}</p>)}</div></details>
        ))}</div></section>;
    default:
      return null;
  }
}

/* ---------- sticky scrollspy table of contents ---------- */
function Toc({ items, active }) {
  if (items.length < 3) return null;
  return (
    <aside className="jug-toc" aria-label="On this page">
      <div className="jug-toc-head">On this page</div>
      <ol>{items.map((t) => (
        <li key={t.id} className={active === t.id ? 'active' : ''}>
          <a href={`#${t.id}`}>{t.title}</a>
        </li>
      ))}</ol>
    </aside>
  );
}

export default function Juggernaut() {
  const { slug } = useParams();
  const entry = getJuggernaut(slug);
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const barRef = useRef(null);

  const blocks = useMemo(() => (entry ? (entry.blocks || []).map((b, i) => ({ ...b, _id: blockAnchor(b, i) })) : []), [entry]);
  const tocItems = useMemo(() => blocks
    .filter((b) => (b.type === 'heading' ? b.text : b.title) && (b.level || 2) === 2)
    .map((b) => ({ id: b._id, title: b.type === 'heading' ? b.text : b.title })), [blocks]);
  const tocIds = useMemo(() => tocItems.map((t) => t.id), [tocItems]);

  const { title, description } = entry ? metaForJug(entry) : { title: '', description: '' };
  const jsonLd = useMemo(() => (entry ? jsonLdForJuggernaut(entry) : []), [entry]);
  useSeoHead(entry ? { title, description, canonical: guideCanonical(entry.slug), jsonLd, image: entry.ogImage } : {});

  useReveal(rootRef, reduced);
  useReadingProgress(rootRef, barRef);
  const active = useScrollSpy(tocIds);

  if (!entry) return <Navigate to="/guides" replace />;

  const metaBits = [entry.readingTime, entry.updated ? `Updated ${entry.updated}` : null, entry.author ? `By ${entry.author}` : null].filter(Boolean);

  return (
    <article className="mkt-wrap jug-wrap" ref={rootRef} style={{ paddingTop: 0, paddingBottom: 56, maxWidth: 1180 }}>
      <style>{JUG_CSS}</style>

      <div className="jug-progress" aria-hidden="true"><span ref={barRef} className="jug-progress-bar" /></div>

      <nav className="jug-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span className="jug-bc-sep">/</span>{' '}
        <a href="/guides">Guides</a>{entry.category ? <> <span className="jug-bc-sep">/</span> <a href="/guides">{entry.category}</a></> : null}{' '}
        <span className="jug-bc-sep">/</span> <span aria-current="page">{entry.h1 || entry.title}</span>
      </nav>

      <header className="jug-hero jug-reveal in">
        <div className="jug-aurora" aria-hidden="true"><span /><span /><span /></div>
        {(entry.eyebrow || entry.category) && <div className="jug-eyebrow">{entry.eyebrow || entry.category}</div>}
        <h1 className="jug-title">{entry.h1 || entry.title}</h1>
        {arr(entry.intro).map((p, i) => <p key={i} className="jug-lead">{p}</p>)}
        {metaBits.length > 0 && (
          <div className="jug-meta">{metaBits.map((m, i) => <React.Fragment key={i}>{i > 0 && <span className="jug-meta-dot">.</span>}<span>{m}</span></React.Fragment>)}</div>
        )}
        {arr(entry.heroStats).length > 0 && (
          <div className="jug-hero-stats">
            {entry.heroStats.map((s, i) => <AnimatedStat key={i} stat={{ ...s, hero: true }} animate />)}
          </div>
        )}
      </header>

      <div className="jug-layout">
        <div className="jug-main">
          <div className="jug-body">
            {blocks.map((b, i) => <Block key={i} block={b} />)}
          </div>

          {arr(entry.related).length > 0 && (
            <section className="jug-block jug-reveal jug-related">
              <h2 className="jug-h">Keep reading</h2>
              <ul>{entry.related.map((r) => {
                const s = typeof r === 'string' ? r : r.slug;
                const label = typeof r === 'string' ? r : (r.title || r.slug);
                return <li key={s}><a href={`/guides/${s}`}>{label}</a></li>;
              })}</ul>
            </section>
          )}

          <section className="jug-block jug-reveal jug-cta">
            <h2 className="jug-h">Run your revenue on Rally</h2>
            <p className="jug-p">Everything alive on first load. Ask Rook and it does the work.</p>
            <p><a className="jug-cta-btn" href="/app">Get started free</a> <a className="jug-cta-link" href="/guides">Browse all guides</a></p>
          </section>
        </div>

        {entry.toc !== false && <Toc items={tocItems} active={active} />}
      </div>
    </article>
  );
}

/* ============================================================
   SCOPED STYLES  (built on the marketing --m-* tokens)
   ============================================================ */
const JUG_CSS = `
.jug-wrap { color: var(--m-ink, #0d1117); position: relative; }
@keyframes jugRise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
@keyframes jugAurora { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(4%, -3%) scale(1.15); } 100% { transform: translate(0,0) scale(1); } }
@keyframes jugSweep { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.jug-reveal { opacity: 0; transform: translateY(22px); transition: opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1); will-change: opacity, transform; }
.jug-reveal.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .jug-reveal { opacity: 1 !important; transform: none !important; transition: none; } .jug-aurora { display: none; } }

/* reading progress */
.jug-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; background: transparent; pointer-events: none; }
.jug-progress-bar { display: block; height: 100%; width: 0%; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); box-shadow: 0 0 10px rgba(91,75,245,.5); transition: width .08s linear; }

.jug-breadcrumb { font-size: 14px; color: var(--m-ink3, #7c8399); margin: 30px 0 22px; }
.jug-breadcrumb a { color: var(--m-ink3, #7c8399); }
.jug-breadcrumb a:hover { color: var(--m-accent, #5b4bf5); }
.jug-bc-sep { opacity: .5; margin: 0 2px; }

/* hero with aurora */
.jug-hero { position: relative; margin-bottom: 40px; padding: 20px 0 8px; overflow: visible; }
.jug-aurora { position: absolute; inset: -60px -40px -20px; z-index: 0; overflow: hidden; filter: blur(48px); opacity: .5; pointer-events: none; }
.jug-aurora span { position: absolute; display: block; border-radius: 50%; }
.jug-aurora span:nth-child(1) { width: 420px; height: 420px; left: -60px; top: -120px; background: radial-gradient(circle, rgba(91,75,245,.55), transparent 68%); animation: jugAurora 14s ease-in-out infinite; }
.jug-aurora span:nth-child(2) { width: 360px; height: 360px; right: 0; top: -80px; background: radial-gradient(circle, rgba(168,85,247,.42), transparent 66%); animation: jugAurora 18s ease-in-out infinite reverse; }
.jug-aurora span:nth-child(3) { width: 320px; height: 320px; left: 30%; top: 40px; background: radial-gradient(circle, rgba(14,159,154,.34), transparent 66%); animation: jugAurora 22s ease-in-out infinite; }
.jug-hero > *:not(.jug-aurora) { position: relative; z-index: 1; }
.jug-eyebrow { display: inline-block; font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--m-accent, #5b4bf5); margin-bottom: 12px; margin-right: 8px; }
.jug-title { font-size: clamp(2.4rem, 5vw, 3.8rem); font-weight: 800; letter-spacing: -.035em; line-height: 1.03; color: var(--m-ink, #0d1117); margin: 0 0 20px; }
.jug-lead { font-size: clamp(1.18rem, 2vw, 1.45rem); line-height: 1.6; color: var(--m-ink2, #454c5e); max-width: 760px; margin: 0 0 14px; }
.jug-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: var(--m-ink3, #7c8399); font-weight: 600; margin-top: 16px; }
.jug-meta-dot { opacity: .5; }
.jug-hero-stats { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 30px; }
.jug-hero-stat { flex: 1 1 180px; min-width: 160px; border: 1px solid var(--m-line, #eceef4); border-radius: 16px; padding: 18px 20px; background: color-mix(in srgb, var(--m-panel, #fff) 78%, transparent); backdrop-filter: blur(6px); box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.jug-hero-stat:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(91,75,245,.5); border-color: color-mix(in srgb, var(--m-accent, #5b4bf5) 45%, var(--m-line, #eceef4)); }
.jug-hero-stat-value { font-size: clamp(1.9rem, 3vw, 2.7rem); font-weight: 800; letter-spacing: -.03em; line-height: 1; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; font-variant-numeric: tabular-nums; }
.jug-hero-stat-label { font-size: 14px; color: var(--m-ink3, #7c8399); font-weight: 600; margin-top: 8px; line-height: 1.4; }

/* two-column layout with sticky TOC rail */
.jug-layout { display: grid; grid-template-columns: minmax(0,1fr); gap: 48px; }
@media (min-width: 1040px) { .jug-layout { grid-template-columns: minmax(0,1fr) 232px; } }
.jug-main { min-width: 0; max-width: 800px; }

.jug-toc { display: none; }
@media (min-width: 1040px) {
  .jug-toc { display: block; position: sticky; top: 88px; align-self: start; border-left: 1px solid var(--m-line, #eceef4); padding-left: 18px; max-height: calc(100vh - 120px); overflow-y: auto; }
}
.jug-toc-head { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--m-ink3, #7c8399); margin-bottom: 12px; }
.jug-toc ol { margin: 0; padding: 0; list-style: none; }
.jug-toc li { margin: 0; border-left: 2px solid transparent; margin-left: -20px; padding-left: 18px; transition: border-color .2s ease; }
.jug-toc li a { display: block; color: var(--m-ink3, #7c8399); font-size: 14px; font-weight: 600; padding: 6px 0; line-height: 1.35; transition: color .2s ease; }
.jug-toc li:hover a { color: var(--m-ink2, #454c5e); }
.jug-toc li.active { border-left-color: var(--m-accent, #5b4bf5); }
.jug-toc li.active a { color: var(--m-accent, #5b4bf5); font-weight: 700; }

.jug-block { margin: 0 0 42px; scroll-margin-top: 90px; }
.jug-h { font-size: clamp(1.55rem, 2.6vw, 2.05rem); font-weight: 800; letter-spacing: -.02em; color: var(--m-ink, #0d1117); margin: 0 0 16px; line-height: 1.15; }
.jug-h .jug-eyebrow { display: block; margin-bottom: 6px; }
.jug-standalone { margin-top: 8px; }
.jug-p { font-size: 1.15rem; line-height: 1.72; color: var(--m-ink2, #454c5e); margin: 0 0 15px; max-width: 760px; }
.jug-richtext .jug-lead { font-size: 1.3rem; color: var(--m-ink, #0d1117); font-weight: 500; }

.jug-stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; }
.jug-stat { border: 1px solid var(--m-line, #eceef4); border-radius: 18px; padding: 22px 24px; background: var(--m-panel, #fff); box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.jug-stat:hover { transform: translateY(-4px); box-shadow: 0 20px 44px -24px rgba(91,75,245,.5); border-color: color-mix(in srgb, var(--m-accent, #5b4bf5) 40%, var(--m-line, #eceef4)); }
.jug-stat-value { font-size: clamp(2rem, 3.4vw, 2.9rem); font-weight: 800; letter-spacing: -.03em; line-height: 1; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; font-variant-numeric: tabular-nums; }
.jug-stat-label { font-size: 14.5px; color: var(--m-ink2, #454c5e); font-weight: 600; margin-top: 10px; line-height: 1.4; }
.jug-stat-trend { font-size: 12.5px; font-weight: 700; margin-top: 8px; }
.jug-trend-up { color: var(--m-teal, #0e9f9a); }
.jug-trend-down { color: #d9534f; }
.jug-trend-flat { color: var(--m-ink3, #7c8399); }

/* diagrams: draw in on reveal */
.jug-diagram { margin: 0; border: 1px solid var(--m-line, #eceef4); border-radius: 20px; padding: 24px; background: linear-gradient(180deg, var(--m-panel, #fff), var(--m-bg2, #f7f8fc)); box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); transition: transform .2s ease, box-shadow .2s ease; }
.jug-diagram:hover { transform: translateY(-3px); box-shadow: 0 22px 50px -26px rgba(13,17,23,.32); }
.jug-diagram-title { font-size: 15px; font-weight: 800; color: var(--m-ink, #0d1117); margin-bottom: 16px; }
.jug-diagram-canvas { overflow-x: auto; }
.jug-svg { width: 100%; height: auto; max-width: 100%; display: block; opacity: 0; transform: scale(.975); transition: opacity .8s ease .1s, transform .8s cubic-bezier(.22,.61,.36,1) .1s; }
.jug-reveal.in .jug-svg { opacity: 1; transform: none; }
.jug-diagram[data-variant="flow"] .jug-svg { min-width: 560px; }
.jug-diagram-caption { font-size: 13.5px; color: var(--m-ink3, #7c8399); margin-top: 16px; line-height: 1.5; }

.jug-calc-shell { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; border: 1px solid var(--m-line, #eceef4); border-radius: 20px; padding: 24px; background: linear-gradient(140deg, color-mix(in srgb, var(--m-accent,#5b4bf5) 6%, var(--m-bg2, #f7f8fc)), var(--m-bg2, #f7f8fc)); }
@media (max-width: 720px) { .jug-calc-shell { grid-template-columns: 1fr; } }
.jug-calc-fields { display: flex; flex-direction: column; gap: 16px; }
.jug-calc-field { display: flex; flex-direction: column; gap: 6px; }
.jug-calc-field-label { font-size: 14px; font-weight: 700; color: var(--m-ink2, #454c5e); }
.jug-calc-field input[type="number"], .jug-calc-field select { padding: 11px 13px; border: 1px solid var(--m-line2, #e0e3ec); border-radius: 10px; font-size: 16px; background: var(--m-panel, #fff); color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-calc-field input:focus, .jug-calc-field select:focus { outline: 2px solid var(--m-accent, #5b4bf5); outline-offset: 1px; border-color: var(--m-accent, #5b4bf5); }
.jug-calc-range { display: flex; align-items: center; gap: 12px; }
.jug-calc-range input[type="range"] { flex: 1; accent-color: var(--m-accent, #5b4bf5); }
.jug-calc-range output { font-size: 15px; font-weight: 700; color: var(--m-accent, #5b4bf5); min-width: 56px; text-align: right; }
.jug-calc-outputs { width: 100%; border-collapse: collapse; background: var(--m-panel, #fff); border-radius: 14px; overflow: hidden; border: 1px solid var(--m-line, #eceef4); box-shadow: 0 12px 30px -20px rgba(13,17,23,.3); }
.jug-calc-outputs caption { text-align: left; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--m-ink3, #7c8399); padding: 12px 16px 6px; caption-side: top; }
.jug-calc-outputs th, .jug-calc-outputs td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--m-line, #eceef4); font-size: 15.5px; }
.jug-calc-outputs th { color: var(--m-ink2, #454c5e); font-weight: 600; }
.jug-calc-outputs td { text-align: right; font-weight: 700; color: var(--m-ink, #0d1117); font-variant-numeric: tabular-nums; transition: color .2s ease; }
.jug-calc-outputs tr.is-key { background: linear-gradient(90deg, color-mix(in srgb, var(--m-accent,#5b4bf5) 10%, transparent), transparent); }
.jug-calc-outputs tr.is-key td { color: var(--m-accent, #5b4bf5); font-size: 19px; }
.jug-calc-outputs tr.is-key th { color: var(--m-ink, #0d1117); font-weight: 800; }
.jug-calc-outputs tr:last-child th, .jug-calc-outputs tr:last-child td { border-bottom: none; }

.jug-matrix-scroll { overflow-x: auto; border: 1px solid var(--m-line, #eceef4); border-radius: 18px; box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); }
.jug-matrix { width: 100%; border-collapse: collapse; min-width: 520px; }
.jug-matrix th, .jug-matrix td { padding: 15px 16px; text-align: center; border-bottom: 1px solid var(--m-line, #eceef4); font-size: 15px; }
.jug-matrix thead th { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--m-ink3, #7c8399); font-weight: 700; background: var(--m-bg2, #f7f8fc); }
.jug-matrix th[scope="row"] { text-align: left; color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-matrix tbody tr { transition: background .15s ease; }
.jug-matrix tbody tr:hover { background: color-mix(in srgb, var(--m-accent,#5b4bf5) 4%, transparent); }
.jug-matrix .is-key { background: linear-gradient(180deg, rgba(91,75,245,.1), rgba(91,75,245,.03)); }
.jug-matrix thead .is-key { color: var(--m-accent, #5b4bf5); background: rgba(91,75,245,.08); }
.jug-cell-yes { color: var(--m-teal, #0e9f9a); font-weight: 800; }
.jug-cell-no { color: var(--m-ink3, #7c8399); font-weight: 600; opacity: .7; }
.jug-cell-partial { color: #c8811a; font-weight: 700; }
.jug-cell-text { color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-footnote { font-size: 13px; color: var(--m-ink3, #7c8399); margin-top: 12px; }

.jug-pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 640px) { .jug-pc-grid { grid-template-columns: 1fr; } }
.jug-pc { border: 1px solid var(--m-line, #eceef4); border-radius: 18px; padding: 22px 24px; background: var(--m-panel, #fff); transition: transform .2s ease, box-shadow .2s ease; }
.jug-pc:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -24px rgba(13,17,23,.28); }
.jug-pc-pro { border-top: 3px solid var(--m-teal, #0e9f9a); }
.jug-pc-con { border-top: 3px solid #c8811a; }
.jug-pc-head { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 12px; }
.jug-pc-pro .jug-pc-head { color: var(--m-teal, #0e9f9a); }
.jug-pc-con .jug-pc-head { color: #c8811a; }
.jug-pc ul { margin: 0; padding-left: 4px; list-style: none; }
.jug-pc li { font-size: 15.5px; line-height: 1.6; color: var(--m-ink2, #454c5e); margin: 10px 0; padding-left: 26px; position: relative; }
.jug-pc-pro li::before { content: ""; position: absolute; left: 0; top: 7px; width: 13px; height: 8px; border-left: 2.5px solid var(--m-teal, #0e9f9a); border-bottom: 2.5px solid var(--m-teal, #0e9f9a); transform: rotate(-45deg); }
.jug-pc-con li::before { content: ""; position: absolute; left: 3px; top: 9px; width: 11px; height: 2.5px; background: #c8811a; border-radius: 2px; }

.jug-steps { margin: 0; padding-left: 0; list-style: none; counter-reset: jugstep; }
ol.jug-steps > .jug-step { counter-increment: jugstep; position: relative; padding: 4px 0 22px 60px; }
ol.jug-steps > .jug-step::before { content: counter(jugstep); position: absolute; left: 0; top: 0; width: 42px; height: 42px; border-radius: 13px; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 17px; box-shadow: 0 10px 22px -10px rgba(91,75,245,.7); }
ol.jug-steps > .jug-step:not(:last-child)::after { content: ""; position: absolute; left: 20px; top: 46px; bottom: 4px; width: 2px; background: linear-gradient(var(--m-accent,#5b4bf5), transparent); }
ul.jug-steps > .jug-step { padding: 4px 0 16px 24px; position: relative; }
ul.jug-steps > .jug-step::before { content: ""; position: absolute; left: 0; top: 9px; width: 10px; height: 10px; border-radius: 50%; background: var(--m-accent, #5b4bf5); }
.jug-step-title { font-size: 1.14rem; font-weight: 700; color: var(--m-ink, #0d1117); margin-bottom: 6px; }
.jug-step-detail { font-size: 14px; color: var(--m-ink3, #7c8399); margin-top: 4px; }

.jug-quote { margin: 0 0 42px; border-left: 4px solid var(--m-accent, #5b4bf5); padding: 8px 0 8px 26px; position: relative; }
.jug-quote blockquote { margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.6rem); line-height: 1.5; font-weight: 600; color: var(--m-ink, #0d1117); }
.jug-quote figcaption { margin-top: 14px; font-size: 14.5px; color: var(--m-ink3, #7c8399); font-weight: 600; }

.jug-callout { border-radius: 18px; padding: 22px 26px; border: 1px solid var(--m-line2, #e0e3ec); position: relative; overflow: hidden; }
.jug-callout::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); }
.jug-callout-title { font-size: 15px; font-weight: 800; margin-bottom: 8px; color: var(--m-ink, #0d1117); }
.jug-callout .jug-p { margin-bottom: 0; }
.jug-tone-accent { background: linear-gradient(120deg, rgba(91,75,245,.09), rgba(168,85,247,.05)); border-color: rgba(91,75,245,.22); }
.jug-tone-info { background: var(--m-bg2, #f7f8fc); }
.jug-tone-success { background: rgba(14,159,154,.08); border-color: rgba(14,159,154,.25); }
.jug-tone-warn { background: rgba(200,129,26,.09); border-color: rgba(200,129,26,.28); }

.jug-faq-list { display: flex; flex-direction: column; gap: 10px; }
.jug-faq-item { border: 1px solid var(--m-line, #eceef4); border-radius: 14px; padding: 4px 20px; background: var(--m-panel, #fff); transition: border-color .2s ease, box-shadow .2s ease; }
.jug-faq-item[open] { border-color: color-mix(in srgb, var(--m-accent,#5b4bf5) 35%, var(--m-line, #eceef4)); box-shadow: 0 12px 30px -22px rgba(91,75,245,.5); }
.jug-faq-item summary { cursor: pointer; font-size: 1.1rem; font-weight: 700; color: var(--m-ink, #0d1117); padding: 15px 0; list-style: none; position: relative; padding-right: 30px; }
.jug-faq-item summary::-webkit-details-marker { display: none; }
.jug-faq-item summary::after { content: "+"; position: absolute; right: 2px; top: 12px; font-size: 24px; color: var(--m-accent, #5b4bf5); font-weight: 300; transition: transform .2s ease; }
.jug-faq-item[open] summary::after { content: "+"; transform: rotate(45deg); }
.jug-faq-a { padding-bottom: 10px; }
.jug-faq-a .jug-p { margin-bottom: 8px; }

.jug-related ul { margin: 0; padding-left: 0; list-style: none; display: grid; gap: 8px; }
.jug-related li a { display: inline-flex; align-items: center; gap: 8px; color: var(--m-accent, #5b4bf5); font-weight: 700; font-size: 16px; }
.jug-related li a::before { content: "->"; opacity: .6; font-weight: 400; }

.jug-cta { border: 1px solid rgba(91,75,245,.22); border-radius: 24px; padding: 40px 32px; text-align: center; background: linear-gradient(135deg, rgba(91,75,245,.1), rgba(168,85,247,.06) 55%, rgba(14,159,154,.06)); position: relative; overflow: hidden; }
.jug-cta .jug-h { font-size: clamp(1.7rem, 3vw, 2.3rem); }
.jug-cta-btn { display: inline-block; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); background-size: 200% auto; color: #fff; font-weight: 700; padding: 14px 30px; border-radius: 13px; font-size: 16px; box-shadow: 0 14px 34px -14px rgba(91,75,245,.75); transition: transform .18s ease, background-position .5s ease; }
.jug-cta-btn:hover { transform: translateY(-2px); background-position: 100% 0; }
.jug-cta-link { display: inline-block; margin-left: 14px; color: var(--m-accent, #5b4bf5); font-weight: 700; padding: 14px 4px; }
`;
