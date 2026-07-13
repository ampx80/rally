// ============================================================
// /guides/:slug - the JUGGERNAUT page (isolated best-in-class SEO track).
// Renders a juggernaut ENTRY object for humans with the SAME blocks the
// static prerender emits (juggernaut-render.js), but makes the surfaces
// INTERACTIVE: calculators take real input and recompute live, animated
// stats count up on scroll, FAQ items expand, and a sticky table of
// contents tracks the reading position. Sets full title + meta + JSON-LD
// via the shared head manager. 404-safe (redirects unknown slugs).
//
// This route is fully additive and touches none of the /pages system.
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
    const el = ref.current; if (!el) return;
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
    <div className="jug-stat" ref={animate ? ref : null}>
      <div className="jug-stat-value">{shown}</div>
      <div className="jug-stat-label">{stat.label}</div>
      {stat.trend && <div className={`jug-stat-trend jug-trend-${stat.trendDir || 'up'}`}>{stat.trend}</div>}
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
    <section className="jug-block jug-calculator" id={block._id}>
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
function Block({ block, index }) {
  const id = block._id;
  const Head = ({ title }) => title ? (
    block.level === 3
      ? <h3 id={id} className="jug-h">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{title}</h3>
      : <h2 id={id} className="jug-h">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{title}</h2>
  ) : null;

  switch (block.type) {
    case 'richText':
      return <section className="jug-block jug-richtext" id={id}><Head title={block.title} />
        {arr(block.body).map((p, i) => <p key={i} className={block.lead ? 'jug-lead' : 'jug-p'}>{p}</p>)}</section>;
    case 'heading':
      return block.level === 3
        ? <h3 id={id} className="jug-h jug-standalone">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{block.text}</h3>
        : <h2 id={id} className="jug-h jug-standalone">{block.eyebrow && <span className="jug-eyebrow">{block.eyebrow}</span>}{block.text}</h2>;
    case 'diagram':
      return <section className="jug-block" id={id}>
        <figure className="jug-diagram" data-variant={block.variant}>
          {block.title && <figcaption className="jug-diagram-title">{block.title}</figcaption>}
          <div className="jug-diagram-canvas"><Diagram block={block} /></div>
          {block.caption && <figcaption className="jug-diagram-caption">{block.caption}</figcaption>}
        </figure></section>;
    case 'stat':
    case 'animatedStat': {
      const items = block.stats || [block];
      return <section className="jug-block" id={id}><Head title={block.title} />
        <div className="jug-stat-row">
          {items.map((s, i) => <AnimatedStat key={i} stat={s} animate={block.type === 'animatedStat'} />)}
        </div></section>;
    }
    case 'calculator':
      return <Calculator block={block} />;
    case 'comparisonMatrix': {
      const hc = block.highlightCol;
      return <section className="jug-block" id={id}><Head title={block.title} />
        <div className="jug-matrix-scroll"><table className="jug-matrix">
          <thead><tr><th scope="col">{block.rowHeader || 'Capability'}</th>
            {(block.columns || []).map((c, i) => <th scope="col" key={i} className={i === hc ? 'is-key' : ''}>{c}</th>)}</tr></thead>
          <tbody>{(block.rows || []).map((r, ri) => <tr key={ri}><th scope="row">{r.feature}</th>
            {(r.cells || []).map((v, ci) => <td key={ci} className={ci === hc ? 'is-key' : ''}><Cell v={v} /></td>)}</tr>)}</tbody>
        </table></div>
        {block.footnote && <p className="jug-footnote">{block.footnote}</p>}</section>;
    }
    case 'prosCons':
      return <section className="jug-block jug-proscons" id={id}><Head title={block.title} />
        <div className="jug-pc-grid">
          <div className="jug-pc jug-pc-pro"><div className="jug-pc-head">{block.prosLabel || 'Pros'}</div>
            <ul>{(block.pros || []).map((p, i) => <li key={i}>{p}</li>)}</ul></div>
          <div className="jug-pc jug-pc-con"><div className="jug-pc-head">{block.consLabel || 'Cons'}</div>
            <ul>{(block.cons || []).map((p, i) => <li key={i}>{p}</li>)}</ul></div>
        </div></section>;
    case 'steps': {
      const Tag = block.ordered === false ? 'ul' : 'ol';
      return <section className="jug-block" id={id}><Head title={block.title} />
        <Tag className="jug-steps">{(block.steps || []).map((s, i) => <li className="jug-step" key={i}>
          <div className="jug-step-title">{s.title}</div>
          {arr(s.body).map((p, j) => <p key={j} className="jug-p">{p}</p>)}
          {s.detail && <div className="jug-step-detail">{s.detail}</div>}
        </li>)}</Tag></section>;
    }
    case 'quote':
      return <figure className="jug-block jug-quote" id={id}><blockquote>{block.text}</blockquote>
        {block.cite && <figcaption>{block.cite}{block.role ? `, ${block.role}` : ''}</figcaption>}</figure>;
    case 'callout':
      return <aside className={`jug-block jug-callout jug-tone-${block.tone || 'accent'}`} id={id}>
        {block.title && <div className="jug-callout-title">{block.title}</div>}
        {arr(block.body).map((p, i) => <p key={i} className="jug-p">{p}</p>)}</aside>;
    case 'faq':
      return <section className="jug-block jug-faq" id={id}><Head title={block.title || 'Frequently asked questions'} />
        <div className="jug-faq-list">{(block.items || []).map((f, i) => (
          <details className="jug-faq-item" key={i}><summary>{f.q}</summary>
            <div className="jug-faq-a">{arr(f.a).map((p, j) => <p key={j} className="jug-p">{p}</p>)}</div></details>
        ))}</div></section>;
    default:
      return null;
  }
}

/* ---------- table of contents ---------- */
function Toc({ blocks }) {
  const items = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => (b.type === 'heading' ? b.text : b.title) && (b.level || 2) === 2)
    .map(({ b, i }) => ({ id: b._id, title: b.type === 'heading' ? b.text : b.title }));
  if (items.length < 3) return null;
  return (
    <nav className="jug-toc" aria-label="On this page">
      <div className="jug-toc-head">On this page</div>
      <ol>{items.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.title}</a></li>)}</ol>
    </nav>
  );
}

export default function Juggernaut() {
  const { slug } = useParams();
  const entry = getJuggernaut(slug);

  // Assign stable anchor ids up front (parity with the static renderer).
  const blocks = useMemo(() => (entry ? (entry.blocks || []).map((b, i) => ({ ...b, _id: blockAnchor(b, i) })) : []), [entry]);
  const { title, description } = entry ? metaForJug(entry) : { title: '', description: '' };
  const jsonLd = useMemo(() => (entry ? jsonLdForJuggernaut(entry) : []), [entry]);
  useSeoHead(entry ? { title, description, canonical: guideCanonical(entry.slug), jsonLd, image: entry.ogImage } : {});

  if (!entry) return <Navigate to="/guides" replace />;

  const metaBits = [entry.readingTime, entry.updated ? `Updated ${entry.updated}` : null, entry.author ? `By ${entry.author}` : null].filter(Boolean);

  return (
    <article className="mkt-wrap jug-wrap" style={{ paddingTop: 40, paddingBottom: 56, maxWidth: 1040 }}>
      <style>{JUG_CSS}</style>

      <nav className="jug-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span className="jug-bc-sep">/</span>{' '}
        <a href="/guides">Guides</a>{entry.category ? <> <span className="jug-bc-sep">/</span> <a href="/guides">{entry.category}</a></> : null}{' '}
        <span className="jug-bc-sep">/</span> <span aria-current="page">{entry.h1 || entry.title}</span>
      </nav>

      <header className="jug-hero">
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

      {entry.toc !== false && <Toc blocks={blocks} />}

      <div className="jug-body">
        {blocks.map((b, i) => <Block key={i} block={b} index={i} />)}
      </div>

      {arr(entry.related).length > 0 && (
        <section className="jug-block jug-related">
          <h2 className="jug-h">Keep reading</h2>
          <ul>{entry.related.map((r) => {
            const s = typeof r === 'string' ? r : r.slug;
            const label = typeof r === 'string' ? r : (r.title || r.slug);
            return <li key={s}><a href={`/guides/${s}`}>{label}</a></li>;
          })}</ul>
        </section>
      )}

      <section className="jug-block jug-cta">
        <h2 className="jug-h">Run your revenue on Rally</h2>
        <p className="jug-p">Everything alive on first load. Ask Rook and it does the work.</p>
        <p><a className="jug-cta-btn" href="/app">Get started free</a> <a className="jug-cta-link" href="/guides">Browse all guides</a></p>
      </section>
    </article>
  );
}

/* ============================================================
   SCOPED STYLES  (built on the marketing --m-* tokens)
   ============================================================ */
const JUG_CSS = `
.jug-wrap { color: var(--m-ink, #0d1117); }
.jug-breadcrumb { font-size: 14px; color: var(--m-ink3, #7c8399); margin-bottom: 22px; }
.jug-breadcrumb a { color: var(--m-ink3, #7c8399); }
.jug-breadcrumb a:hover { color: var(--m-accent, #5b4bf5); }
.jug-bc-sep { opacity: .5; margin: 0 2px; }
.jug-hero { margin-bottom: 34px; }
.jug-eyebrow { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--m-accent, #5b4bf5); margin-bottom: 12px; margin-right: 8px; }
.jug-title { font-size: clamp(2.3rem, 4.6vw, 3.5rem); font-weight: 800; letter-spacing: -.03em; line-height: 1.05; color: var(--m-ink, #0d1117); margin: 0 0 18px; }
.jug-lead { font-size: clamp(1.16rem, 2vw, 1.42rem); line-height: 1.6; color: var(--m-ink2, #454c5e); max-width: 820px; margin: 0 0 14px; }
.jug-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: var(--m-ink3, #7c8399); font-weight: 600; margin-top: 14px; }
.jug-meta-dot { opacity: .5; }
.jug-hero-stats { display: flex; flex-wrap: wrap; gap: 30px; margin-top: 28px; }
.jug-hero-stat-value { font-size: clamp(1.9rem, 3vw, 2.7rem); font-weight: 800; letter-spacing: -.03em; line-height: 1; color: var(--m-ink, #0d1117); }
.jug-hero-stat-label { font-size: 14px; color: var(--m-ink3, #7c8399); font-weight: 600; margin-top: 6px; max-width: 220px; }

.jug-toc { border: 1px solid var(--m-line, #eceef4); border-radius: 14px; padding: 18px 22px; margin: 0 0 36px; background: var(--m-bg2, #f7f8fc); }
.jug-toc-head { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--m-ink3, #7c8399); margin-bottom: 10px; }
.jug-toc ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 32px; }
.jug-toc li { margin: 5px 0; }
.jug-toc a { color: var(--m-ink2, #454c5e); font-size: 15px; font-weight: 600; }
.jug-toc a:hover { color: var(--m-accent, #5b4bf5); }

.jug-body { }
.jug-block { margin: 0 0 40px; scroll-margin-top: 90px; }
.jug-h { font-size: clamp(1.5rem, 2.6vw, 2rem); font-weight: 800; letter-spacing: -.02em; color: var(--m-ink, #0d1117); margin: 0 0 16px; }
.jug-h .jug-eyebrow { display: block; margin-bottom: 6px; }
.jug-standalone { margin-top: 8px; }
.jug-p { font-size: 1.14rem; line-height: 1.68; color: var(--m-ink2, #454c5e); margin: 0 0 15px; max-width: 820px; }
.jug-richtext .jug-lead { font-size: 1.28rem; }

.jug-stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.jug-stat { border: 1px solid var(--m-line, #eceef4); border-radius: 16px; padding: 22px 24px; background: var(--m-panel, #fff); box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); }
.jug-stat-value { font-size: clamp(2rem, 3.4vw, 2.9rem); font-weight: 800; letter-spacing: -.03em; line-height: 1; color: var(--m-accent, #5b4bf5); }
.jug-stat-label { font-size: 14.5px; color: var(--m-ink2, #454c5e); font-weight: 600; margin-top: 10px; line-height: 1.4; }
.jug-stat-trend { font-size: 12.5px; font-weight: 700; margin-top: 8px; }
.jug-trend-up { color: var(--m-teal, #0e9f9a); }
.jug-trend-down { color: #d9534f; }

.jug-diagram { margin: 0; border: 1px solid var(--m-line, #eceef4); border-radius: 18px; padding: 22px; background: var(--m-panel, #fff); box-shadow: var(--m-shadow-sm, 0 1px 2px rgba(13,17,23,.06)); }
.jug-diagram-title { font-size: 15px; font-weight: 800; color: var(--m-ink, #0d1117); margin-bottom: 14px; }
.jug-diagram-canvas { overflow-x: auto; }
.jug-svg { width: 100%; height: auto; max-width: 100%; display: block; }
.jug-diagram[data-variant="flow"] .jug-svg { min-width: 560px; }
.jug-diagram-caption { font-size: 13.5px; color: var(--m-ink3, #7c8399); margin-top: 14px; line-height: 1.5; }

.jug-calc-shell { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; border: 1px solid var(--m-line, #eceef4); border-radius: 18px; padding: 22px; background: var(--m-bg2, #f7f8fc); }
@media (max-width: 720px) { .jug-calc-shell { grid-template-columns: 1fr; } .jug-toc ol { columns: 1; } .jug-pc-grid { grid-template-columns: 1fr !important; } }
.jug-calc-fields { display: flex; flex-direction: column; gap: 16px; }
.jug-calc-field { display: flex; flex-direction: column; gap: 6px; }
.jug-calc-field-label { font-size: 14px; font-weight: 700; color: var(--m-ink2, #454c5e); }
.jug-calc-field input[type="number"], .jug-calc-field select { padding: 11px 13px; border: 1px solid var(--m-line2, #e0e3ec); border-radius: 10px; font-size: 16px; background: var(--m-panel, #fff); color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-calc-field input:focus, .jug-calc-field select:focus { outline: 2px solid var(--m-accent, #5b4bf5); outline-offset: 1px; border-color: var(--m-accent, #5b4bf5); }
.jug-calc-range { display: flex; align-items: center; gap: 12px; }
.jug-calc-range input[type="range"] { flex: 1; accent-color: var(--m-accent, #5b4bf5); }
.jug-calc-range output { font-size: 15px; font-weight: 700; color: var(--m-accent, #5b4bf5); min-width: 56px; text-align: right; }
.jug-calc-outputs { width: 100%; border-collapse: collapse; background: var(--m-panel, #fff); border-radius: 12px; overflow: hidden; border: 1px solid var(--m-line, #eceef4); }
.jug-calc-outputs caption { text-align: left; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--m-ink3, #7c8399); padding: 12px 16px 6px; caption-side: top; }
.jug-calc-outputs th, .jug-calc-outputs td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--m-line, #eceef4); font-size: 15.5px; }
.jug-calc-outputs th { color: var(--m-ink2, #454c5e); font-weight: 600; }
.jug-calc-outputs td { text-align: right; font-weight: 700; color: var(--m-ink, #0d1117); font-variant-numeric: tabular-nums; }
.jug-calc-outputs tr.is-key td { color: var(--m-accent, #5b4bf5); font-size: 18px; }
.jug-calc-outputs tr.is-key th { color: var(--m-ink, #0d1117); font-weight: 800; }
.jug-calc-outputs tr:last-child th, .jug-calc-outputs tr:last-child td { border-bottom: none; }
.jug-calc-inputs { display: flex; flex-direction: column; gap: 10px; }
.jug-calc-input { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; padding: 8px 0; border-bottom: 1px dashed var(--m-line, #eceef4); }
.jug-calc-in-label { color: var(--m-ink2, #454c5e); font-weight: 600; }
.jug-calc-in-value { color: var(--m-ink, #0d1117); font-weight: 700; }

.jug-matrix-scroll { overflow-x: auto; border: 1px solid var(--m-line, #eceef4); border-radius: 16px; }
.jug-matrix { width: 100%; border-collapse: collapse; min-width: 520px; }
.jug-matrix th, .jug-matrix td { padding: 14px 16px; text-align: center; border-bottom: 1px solid var(--m-line, #eceef4); font-size: 15px; }
.jug-matrix thead th { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--m-ink3, #7c8399); font-weight: 700; }
.jug-matrix th[scope="row"] { text-align: left; color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-matrix .is-key { background: linear-gradient(180deg, rgba(91,75,245,.08), rgba(91,75,245,.03)); }
.jug-matrix thead .is-key { color: var(--m-accent, #5b4bf5); }
.jug-cell-yes { color: var(--m-teal, #0e9f9a); font-weight: 700; }
.jug-cell-no { color: var(--m-ink3, #7c8399); font-weight: 600; }
.jug-cell-partial { color: #c8811a; font-weight: 700; }
.jug-cell-text { color: var(--m-ink, #0d1117); font-weight: 600; }
.jug-footnote { font-size: 13px; color: var(--m-ink3, #7c8399); margin-top: 10px; }

.jug-pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.jug-pc { border: 1px solid var(--m-line, #eceef4); border-radius: 16px; padding: 20px 22px; background: var(--m-panel, #fff); }
.jug-pc-head { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 12px; }
.jug-pc-pro .jug-pc-head { color: var(--m-teal, #0e9f9a); }
.jug-pc-con .jug-pc-head { color: #c8811a; }
.jug-pc ul { margin: 0; padding-left: 20px; }
.jug-pc li { font-size: 15.5px; line-height: 1.6; color: var(--m-ink2, #454c5e); margin: 8px 0; }

.jug-steps { margin: 0; padding-left: 0; list-style: none; counter-reset: jugstep; }
.jug-steps.jug-steps { }
ol.jug-steps > .jug-step { counter-increment: jugstep; position: relative; padding: 4px 0 20px 54px; }
ol.jug-steps > .jug-step::before { content: counter(jugstep); position: absolute; left: 0; top: 0; width: 38px; height: 38px; border-radius: 11px; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 16px; }
ul.jug-steps > .jug-step { padding: 4px 0 16px 22px; position: relative; }
ul.jug-steps > .jug-step::before { content: ""; position: absolute; left: 0; top: 9px; width: 9px; height: 9px; border-radius: 50%; background: var(--m-accent, #5b4bf5); }
.jug-step-title { font-size: 1.12rem; font-weight: 700; color: var(--m-ink, #0d1117); margin-bottom: 6px; }
.jug-step-detail { font-size: 14px; color: var(--m-ink3, #7c8399); margin-top: 4px; }

.jug-quote { margin: 0 0 40px; border-left: 4px solid var(--m-accent, #5b4bf5); padding: 6px 0 6px 24px; }
.jug-quote blockquote { margin: 0; font-size: clamp(1.2rem, 2.2vw, 1.5rem); line-height: 1.5; font-weight: 600; color: var(--m-ink, #0d1117); }
.jug-quote figcaption { margin-top: 12px; font-size: 14.5px; color: var(--m-ink3, #7c8399); font-weight: 600; }

.jug-callout { border-radius: 16px; padding: 20px 24px; border: 1px solid var(--m-line2, #e0e3ec); }
.jug-callout-title { font-size: 15px; font-weight: 800; margin-bottom: 8px; color: var(--m-ink, #0d1117); }
.jug-callout .jug-p { margin-bottom: 0; }
.jug-tone-accent { background: linear-gradient(120deg, rgba(91,75,245,.07), rgba(168,85,247,.04)); border-color: rgba(91,75,245,.2); }
.jug-tone-info { background: var(--m-bg2, #f7f8fc); }
.jug-tone-success { background: rgba(14,159,154,.07); border-color: rgba(14,159,154,.25); }
.jug-tone-warn { background: rgba(200,129,26,.08); border-color: rgba(200,129,26,.28); }

.jug-faq-list { display: flex; flex-direction: column; gap: 10px; }
.jug-faq-item { border: 1px solid var(--m-line, #eceef4); border-radius: 12px; padding: 4px 18px; background: var(--m-panel, #fff); }
.jug-faq-item summary { cursor: pointer; font-size: 1.08rem; font-weight: 700; color: var(--m-ink, #0d1117); padding: 14px 0; list-style: none; position: relative; padding-right: 28px; }
.jug-faq-item summary::-webkit-details-marker { display: none; }
.jug-faq-item summary::after { content: "+"; position: absolute; right: 2px; top: 12px; font-size: 22px; color: var(--m-accent, #5b4bf5); font-weight: 400; }
.jug-faq-item[open] summary::after { content: "-"; }
.jug-faq-a { padding-bottom: 8px; }
.jug-faq-a .jug-p { margin-bottom: 8px; }

.jug-related ul { margin: 0; padding-left: 20px; }
.jug-related li { margin: 7px 0; }
.jug-related a { color: var(--m-accent, #5b4bf5); font-weight: 600; font-size: 16px; }

.jug-cta { border: 1px solid var(--m-line2, #e0e3ec); border-radius: 20px; padding: 32px; text-align: center; background: var(--m-bg2, #f7f8fc); }
.jug-cta-btn { display: inline-block; background: var(--m-grad, linear-gradient(100deg,#5b4bf5,#a855f7 46%,#0e9f9a)); color: #fff; font-weight: 700; padding: 13px 26px; border-radius: 12px; font-size: 16px; }
.jug-cta-link { display: inline-block; margin-left: 14px; color: var(--m-accent, #5b4bf5); font-weight: 700; padding: 13px 4px; }
`;
