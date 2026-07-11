// ============================================================
// /help/:slug - a single help article.
// Clean reading layout, block renderer (paragraphs, steps,
// bullets, notes), an FAQ block, related articles, and a
// "still need help" CTA. NO em-dash / en-dash.
// ============================================================
import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { Reveal, MktButton } from '../kit.jsx';
import { getArticle, relatedArticles, CATEGORIES } from './help-data.js';
import { useSeoHead, orgLd, breadcrumbLd, faqLd, articleLd, SITE } from '../seo/head.js';

function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mkt-body" style={{ margin: '0 0 16px', fontSize: '1.12rem' }}>{block}</p>;
  }
  if (block.steps) {
    return (
      <ol style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', counterReset: 'hstep' }}>
        {block.steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '9px 0', counterIncrement: 'hstep' }}>
            <span style={{ flex: 'none', width: 28, height: 28, borderRadius: 999, background: 'linear-gradient(135deg,#5b4bf5,#7c5cf7)', color: '#fff', fontWeight: 800, fontSize: 14, display: 'grid', placeItems: 'center', boxShadow: '0 6px 14px -6px rgba(91,75,245,.6)' }}>{i + 1}</span>
            <span style={{ fontSize: '1.1rem', lineHeight: 1.55, color: 'var(--m-ink2)', paddingTop: 2 }}>{s}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.bullets) {
    return (
      <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
        {block.bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0' }}>
            <span style={{ flex: 'none', color: 'var(--m-teal)', marginTop: 3 }}><Icon name="check" size={18} /></span>
            <span style={{ fontSize: '1.1rem', lineHeight: 1.55, color: 'var(--m-ink2)' }}>{b}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.note) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', margin: '0 0 20px', padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(100deg, rgba(91,75,245,.07), rgba(14,159,154,.06))', border: '1px solid rgba(91,75,245,.2)' }}>
        <span style={{ flex: 'none', color: 'var(--m-accent)', marginTop: 1 }}><Icon name="sparkles" size={19} /></span>
        <span style={{ fontSize: '1.02rem', lineHeight: 1.55, color: 'var(--m-ink2)', fontWeight: 500 }}>{block.note}</span>
      </div>
    );
  }
  return null;
}

export default function HelpArticle() {
  const { slug } = useParams();
  const article = getArticle(slug);
  if (!article) return <Navigate to="/help" replace />;

  const cat = CATEGORIES.find(c => c.name === article.category);
  const related = relatedArticles(article, 3);
  const canonical = `${SITE}/help/${article.slug}`;

  const trail = [{ name: 'Home', href: '/' }, { name: 'Help center', href: '/help' }, { name: article.title }];
  const jsonLd = [
    orgLd(),
    breadcrumbLd(trail),
    { ...articleLd({ ...article, published: article.updated, updated: article.updated }), mainEntityOfPage: canonical },
  ];
  const fld = faqLd(article.faqs);
  if (fld) jsonLd.push(fld);

  useSeoHead({
    title: `${article.title} | Rally help`,
    description: article.summary,
    canonical,
    jsonLd,
  });

  return (
    <div>
      <article className="mkt-section" style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div className="mkt-wrap" style={{ maxWidth: 780 }}>
          {/* Breadcrumb */}
          <Reveal>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--m-ink3)', flexWrap: 'wrap', marginBottom: 18 }}>
              <Link to="/help" style={{ color: 'var(--m-accent)', fontWeight: 600 }}>Help center</Link>
              <Icon name="chevronRight" size={14} />
              <a href={`/help#${article.category.toLowerCase().replace(/[^a-z]+/g, '-')}`} style={{ color: 'var(--m-ink2)', fontWeight: 600 }}>{article.category}</a>
            </div>
            <h1 className="mkt-h1" style={{ fontSize: 'clamp(2rem,4.5vw,3rem)', lineHeight: 1.08, textAlign: 'left' }}>{article.title}</h1>
            <p className="mkt-lead" style={{ marginTop: 16, textAlign: 'left' }}>{article.summary}</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 18, fontSize: 14, color: 'var(--m-ink3)', fontWeight: 600 }}>
              {cat && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name={cat.icon} size={16} />{article.category}</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="clock" size={16} />{article.read} min read</span>
            </div>
          </Reveal>

          <hr className="mkt-rule" style={{ margin: '30px 0 8px' }} />

          {/* Body */}
          {article.sections.map((sec, i) => (
            <Reveal key={i} delay={Math.min(i * 40, 200)}>
              <section style={{ marginTop: 34 }}>
                {sec.h && <h2 className="mkt-h3" style={{ marginBottom: 16, fontSize: '1.5rem' }}>{sec.h}</h2>}
                {sec.blocks.map((b, j) => <Block key={j} block={b} />)}
              </section>
            </Reveal>
          ))}

          {/* FAQ */}
          {article.faqs && article.faqs.length > 0 && (
            <Reveal>
              <section style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--m-line)' }}>
                <h2 className="mkt-h3" style={{ marginBottom: 18, fontSize: '1.5rem' }}>Frequently asked</h2>
                {article.faqs.map((f, i) => (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, color: 'var(--m-ink)', fontSize: '1.1rem', marginBottom: 6 }}>{f.q}</div>
                    <p className="mkt-body" style={{ margin: 0, fontSize: '1.08rem' }}>{f.a}</p>
                  </div>
                ))}
              </section>
            </Reveal>
          )}

          {/* Still need help */}
          <Reveal>
            <div style={{ marginTop: 40, padding: '24px 26px', borderRadius: 18, border: '1px solid var(--m-line2)', background: 'var(--m-bg2)', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--m-ink)' }}>Still need help?</div>
                <p className="mkt-dim" style={{ margin: '6px 0 0', fontSize: 15 }}>Ask Rook inside the app, or message our team and a human will get back to you.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <MktButton to="/app">Ask Rook</MktButton>
                <a href="mailto:support@rally.com" className="mkt-btn mkt-btn-ghost">Email support</a>
              </div>
            </div>
          </Reveal>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)', paddingTop: 48 }}>
          <div className="mkt-wrap" style={{ maxWidth: 900 }}>
            <h2 className="mkt-h3" style={{ marginBottom: 20 }}>Related articles</h2>
            <div className="mkt-grid mkt-grid-3">
              {related.map(r => (
                <Link key={r.slug} to={`/help/${r.slug}`} className="mkt-card" style={{ display: 'block', height: '100%' }}>
                  <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>{r.category}</div>
                  <div style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--m-ink)', lineHeight: 1.3 }}>{r.title}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, color: 'var(--m-accent)', fontWeight: 700, fontSize: 14 }}>Read <Icon name="chevronRight" size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
