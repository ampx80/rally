// ============================================================
// SEO PAGE PRIMITIVES  (programmatic SEO engine)
// The shared building blocks every generated page composes from:
// breadcrumb, hero, prose sections, key-points, step list, comparison
// table, ranked list, pros/cons, FAQ accordion, related-pages module.
// One flexible renderer (SeoArticle) turns a normalized data entry into
// a full, unique, animated page - so 1000+ pages share one high bar.
// Scoped under .mkt. NO em-dash / en-dash.
// ============================================================
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { Reveal, MktButton } from '../kit.jsx';

const pageHref = (slug) => `/pages/${slug}`;

/* ---------- breadcrumb ---------- */
export function Breadcrumb({ trail }) {
  return (
    <nav className="mkt-crumb" aria-label="Breadcrumb"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 14, color: 'var(--m-ink3)', fontWeight: 600, marginBottom: 18 }}>
      {trail.map((t, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <Icon name="chevronRight" size={13} />}
          {t.href ? <Link to={t.href} style={{ color: i === trail.length - 1 ? 'var(--m-ink)' : 'var(--m-ink3)' }}>{t.name}</Link>
            : <span style={{ color: 'var(--m-ink)' }}>{t.name}</span>}
        </span>
      ))}
    </nav>
  );
}

/* ---------- section shell ---------- */
export function Prose({ h, children, id }) {
  return (
    <Reveal as="section" className="mkt-prose" style={{ marginTop: 40 }}>
      {h && <h2 id={id} className="mkt-h3" style={{ marginBottom: 14, fontSize: 'clamp(1.4rem,2.6vw,1.9rem)' }}>{h}</h2>}
      {children}
    </Reveal>
  );
}

/* Render a body value that may be a string or array of paragraphs. */
export function Paragraphs({ text, className = 'mkt-body' }) {
  const arr = Array.isArray(text) ? text : [text];
  return arr.filter(Boolean).map((p, i) => (
    <p key={i} className={className} style={{ marginTop: i ? 14 : 0, maxWidth: 760 }}>{p}</p>
  ));
}

/* ---------- key points (glossary takeaways) ---------- */
export function KeyPoints({ points }) {
  if (!points || !points.length) return null;
  return (
    <Reveal className="mkt-card" style={{ marginTop: 30, borderColor: 'rgba(91,75,245,.2)', background: 'linear-gradient(180deg, rgba(91,75,245,.04), transparent)' }}>
      <div className="mkt-eyebrow" style={{ marginBottom: 12 }}>Key takeaways</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {points.map((p, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="mkt-icon" style={{ width: 26, height: 26, borderRadius: 8, flex: 'none', marginTop: 2 }}><Icon name="check" size={15} /></span>
            <span className="mkt-body" style={{ margin: 0 }}>{p}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/* ---------- numbered steps (how-to) ---------- */
export function Steps({ steps }) {
  if (!steps || !steps.length) return null;
  return (
    <div className="m-cascade" style={{ display: 'grid', gap: 16, marginTop: 22 }}>
      {steps.map((s, i) => (
        <div key={i} className="mkt-card" style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 18, alignItems: 'flex-start' }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, color: '#fff', background: 'linear-gradient(135deg,#6d5cf7,#4a3ce0)', boxShadow: '0 8px 20px -8px rgba(91,75,245,.6)' }}>{i + 1}</span>
          <div>
            <h3 className="mkt-h3" style={{ fontSize: '1.2rem', marginBottom: 6 }}>{s.h}</h3>
            <Paragraphs text={s.body} />
            {s.bullets && <BulletList items={s.bullets} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BulletList({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 10 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--m-teal)', marginTop: 3, flex: 'none' }}><Icon name="check" size={16} /></span>
          <span className="mkt-body" style={{ margin: 0 }}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- comparison table ---------- */
export function CompareTable({ table, highlightCol = 1 }) {
  if (!table || !table.rows) return null;
  const cell = (v, col) => {
    if (v === true) return <span className="mkt-yes"><Icon name="check" size={17} /></span>;
    if (v === false) return <span className="mkt-no"><Icon name="x" size={16} /></span>;
    return <span style={{ fontWeight: col === highlightCol ? 700 : 500 }}>{v}</span>;
  };
  return (
    <Reveal className="mkt-glass" style={{ marginTop: 24, overflowX: 'auto' }}>
      <table className="mkt-table" style={{ minWidth: 560 }}>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} style={i === highlightCol ? { color: 'var(--m-accent)', fontWeight: 800 } : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((v, ci) => (
                <td key={ci} style={ci === highlightCol ? { background: 'rgba(91,75,245,.04)' } : undefined}>
                  {ci === 0 ? <strong style={{ color: 'var(--m-ink)' }}>{v}</strong> : cell(v, ci)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Reveal>
  );
}

/* ---------- pros / cons ---------- */
export function ProsCons({ pros, cons, proLabel = 'Strengths', conLabel = 'Where it falls short' }) {
  if (!pros && !cons) return null;
  return (
    <div className="mkt-grid mkt-grid-2" style={{ marginTop: 22 }}>
      {pros && (
        <Reveal className="mkt-card" style={{ borderColor: 'rgba(14,159,154,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--m-teal)', fontWeight: 800 }}><Icon name="check" size={18} /> {proLabel}</div>
          <BulletList items={pros} />
        </Reveal>
      )}
      {cons && (
        <Reveal delay={80} className="mkt-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--m-ink3)', fontWeight: 800 }}><Icon name="x" size={18} /> {conLabel}</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {cons.map((c, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--m-ink3)', marginTop: 3, flex: 'none' }}><Icon name="x" size={15} /></span>
                <span className="mkt-body" style={{ margin: 0 }}>{c}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );
}

/* ---------- ranked list (best-of + alternatives) ---------- */
export function RankedList({ items, showRank = true }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      {items.map((it, i) => (
        <Reveal key={i} delay={Math.min(i * 40, 240)} className={`mkt-card${it.featured ? ' mkt-card-glow' : ''}`}
          style={{ display: 'grid', gridTemplateColumns: showRank ? '52px 1fr' : '1fr', gap: 18, alignItems: 'flex-start' }}>
          {showRank && (
            <span style={{ width: 46, height: 46, borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18,
              color: i === 0 ? '#fff' : 'var(--m-ink)', background: i === 0 ? 'linear-gradient(135deg,#6d5cf7,#4a3ce0)' : 'var(--m-bg2)', border: '1px solid var(--m-line2)' }}>
              {i + 1}
            </span>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h3 className="mkt-h3" style={{ fontSize: '1.25rem' }}>{it.name}</h3>
              {it.featured && <span className="mkt-pill" style={{ padding: '3px 12px', fontSize: 12 }}><span className="mkt-dot" /> Editor's pick</span>}
              {it.score != null && <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--m-accent)', fontSize: 18 }}>{it.score}<span style={{ color: 'var(--m-ink3)', fontSize: 13, fontWeight: 600 }}>/10</span></span>}
            </div>
            {it.blurb && <Paragraphs text={it.blurb} />}
            {(it.pros || it.cons) && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
                {it.pros && <div style={{ minWidth: 220, flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--m-teal)', fontSize: 13, marginBottom: 6 }}>Pros</div><BulletList items={it.pros} /></div>}
                {it.cons && <div style={{ minWidth: 220, flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--m-ink3)', fontSize: 13, marginBottom: 6 }}>Cons</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>{it.cons.map((c, ci) => <li key={ci} className="mkt-body" style={{ margin: 0, fontSize: 15 }}>- {c}</li>)}</ul></div>}
              </div>
            )}
            {it.best && <p className="mkt-dim" style={{ marginTop: 12, fontSize: 14 }}><strong style={{ color: 'var(--m-ink2)' }}>Best for:</strong> {it.best}</p>}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- value-prop grid (solution pages) ---------- */
export function ValueGrid({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="mkt-grid mkt-grid-3" style={{ marginTop: 24 }}>
      {items.map((v, i) => (
        <Reveal key={i} delay={Math.min(i * 50, 260)} className="mkt-card">
          <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name={v.icon || 'sparkles'} size={22} /></span>
          <h3 className="mkt-h3" style={{ fontSize: '1.15rem', marginBottom: 8 }}>{v.h}</h3>
          <p className="mkt-body" style={{ margin: 0, fontSize: 15.5 }}>{v.body}</p>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- FAQ accordion ---------- */
export function Faq({ faqs }) {
  const [open, setOpen] = useState(0);
  if (!faqs || !faqs.length) return null;
  return (
    <Reveal as="section" style={{ marginTop: 48 }}>
      <h2 className="mkt-h3" style={{ marginBottom: 16, fontSize: 'clamp(1.4rem,2.6vw,1.9rem)' }}>Frequently asked questions</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="mkt-card" style={{ padding: 0, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                <span style={{ fontWeight: 700, fontSize: 16.5, color: 'var(--m-ink)' }}>{f.q}</span>
                <span style={{ flex: 'none', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', color: 'var(--m-accent)' }}><Icon name="chevronDown" size={20} /></span>
              </button>
              <div style={{ maxHeight: isOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height .3s var(--glide)' }}>
                <div className="mkt-body" style={{ padding: '0 22px 20px', margin: 0 }}>{f.a}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

/* ---------- related pages (internal linking) ---------- */
export function Related({ items }) {
  if (!items || !items.length) return null;
  return (
    <Reveal as="section" style={{ marginTop: 52 }}>
      <h2 className="mkt-h3" style={{ marginBottom: 16, fontSize: 'clamp(1.3rem,2.4vw,1.7rem)' }}>Keep reading</h2>
      <div className="mkt-grid mkt-grid-3">
        {items.map((r, i) => (
          <Link key={i} to={pageHref(r.slug)} className="mkt-card" style={{ display: 'block' }}>
            <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>{r.category}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--m-ink)', lineHeight: 1.3 }}>{r.title}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, color: 'var(--m-accent)', fontWeight: 700, fontSize: 14 }}>Read <Icon name="chevronRight" size={14} /></span>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- in-content CTA to the product ---------- */
export function InlineCta({ title = 'See it live in Rally', sub = 'Every screen is alive on first load. Ask Rook and it runs the work.', to = '/app', cta = 'Get started free' }) {
  return (
    <Reveal className="mkt-card" style={{ marginTop: 40, background: 'linear-gradient(120deg, rgba(91,75,245,.06), rgba(14,159,154,.05))', borderColor: 'rgba(91,75,245,.22)', display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 240 }}>
        <h3 className="mkt-h3" style={{ fontSize: '1.3rem', marginBottom: 6 }}>{title}</h3>
        <p className="mkt-body" style={{ margin: 0 }}>{sub}</p>
      </div>
      <MktButton to={to} size="lg">{cta} <Icon name="chevronRight" size={18} /></MktButton>
    </Reveal>
  );
}

export { pageHref };
