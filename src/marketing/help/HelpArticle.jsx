// ============================================================
// /help/:slug - a single help article.
// Clean reading layout, block renderer (paragraphs, steps,
// bullets, notes), an FAQ block, related articles, and a
// "still need help" CTA. NO em-dash / en-dash.
// Teal #0e9f8f product accent; violet #7c5cf7 Rook/AI only.
// ============================================================
import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { Reveal, MktButton } from '../kit.jsx';
import { getArticle, relatedArticles, CATEGORIES } from './help-data.js';
import { useSeoHead, orgLd, breadcrumbLd, faqLd, articleLd, SITE } from '../seo/head.js';

const PANEL = {
  background: 'linear-gradient(180deg, #fff, #fafcfb)',
  border: '1px solid var(--m-line)',
  borderRadius: 14,
  boxShadow: 'none',
};

function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mkt-body" style={{ margin: '0 0 16px', fontSize: '1.12rem', lineHeight: 1.65 }}>{block}</p>;
  }
  if (block.steps) {
    return (
      <ol style={{ margin: '0 0 22px', padding: 0, listStyle: 'none', counterReset: 'hstep' }}>
        {block.steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 0', counterIncrement: 'hstep', borderBottom: i < block.steps.length - 1 ? '1px solid var(--m-line)' : 'none' }}>
            <span style={{
              flex: 'none',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#0e9f8f,#14b8a6)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 6px 14px -6px rgba(14,159,143,.5)',
            }}>{i + 1}</span>
            <span style={{ fontSize: '1.08rem', lineHeight: 1.55, color: 'var(--m-ink2)', paddingTop: 2 }}>{s}</span>
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
            <span style={{ fontSize: '1.08rem', lineHeight: 1.55, color: 'var(--m-ink2)' }}>{b}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.note) {
    return (
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        margin: '0 0 22px',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'linear-gradient(100deg, rgba(14,159,143,.07), transparent)',
        border: '1px solid rgba(14,159,143,.2)',
        borderLeft: '3px solid #0e9f8f',
      }}>
        <span style={{ flex: 'none', color: 'var(--m-accent)', marginTop: 1 }}><Icon name="sparkles" size={18} /></span>
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
  const isRookCat = cat && /rook|ai/i.test(cat.name);

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
      <article className="mkt-section" style={{ paddingTop: 52, paddingBottom: 40 }}>
        <div className="mkt-wrap" style={{ maxWidth: 740 }}>
          {/* Breadcrumb */}
          <Reveal>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--m-ink3)', flexWrap: 'wrap', marginBottom: 20 }}>
              <Link to="/help" style={{ color: 'var(--m-accent)', fontWeight: 600 }}>Help center</Link>
              <Icon name="chevronRight" size={14} />
              <a href={`/help#${article.category.toLowerCase().replace(/[^a-z]+/g, '-')}`} style={{ color: 'var(--m-ink2)', fontWeight: 600 }}>{article.category}</a>
            </div>
            <h1 className="mkt-h1" style={{ fontSize: 'clamp(2.05rem,4.5vw,3.05rem)', lineHeight: 1.08, textAlign: 'left', letterSpacing: '-.03em' }}>{article.title}</h1>
            <p className="mkt-lead" style={{ marginTop: 16, textAlign: 'left', maxWidth: '52ch' }}>{article.summary}</p>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--m-ink3)', fontWeight: 600, flexWrap: 'wrap' }}>
              {cat && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: isRookCat ? '#7c5cf7' : 'var(--m-teal)' }}>
                  <Icon name={cat.icon} size={16} />{article.category}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="clock" size={16} />{article.read} min read</span>
            </div>
          </Reveal>

          <hr style={{ margin: '32px 0 4px', border: 'none', borderTop: '1px solid var(--m-line)' }} />

          {/* Body */}
          {article.sections.map((sec, i) => (
            <Reveal key={i} delay={Math.min(i * 40, 200)}>
              <section style={{ marginTop: 36 }}>
                {sec.h && <h2 className="mkt-h3" style={{ marginBottom: 16, fontSize: '1.45rem', letterSpacing: '-.02em' }}>{sec.h}</h2>}
                {sec.blocks.map((b, j) => <Block key={j} block={b} />)}
              </section>
            </Reveal>
          ))}

          {/* FAQ */}
          {article.faqs && article.faqs.length > 0 && (
            <Reveal>
              <section style={{ marginTop: 44, paddingTop: 32, borderTop: '1px solid var(--m-line)' }}>
                <h2 className="mkt-h3" style={{ marginBottom: 20, fontSize: '1.45rem', letterSpacing: '-.02em' }}>Frequently asked</h2>
                {article.faqs.map((f, i) => (
                  <div key={i} style={{
                    marginBottom: 0,
                    padding: '16px 0',
                    borderBottom: i < article.faqs.length - 1 ? '1px solid var(--m-line)' : 'none',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--m-ink)', fontSize: '1.08rem', marginBottom: 6 }}>{f.q}</div>
                    <p className="mkt-body" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6 }}>{f.a}</p>
                  </div>
                ))}
              </section>
            </Reveal>
          )}

          {/* Still need help */}
          <Reveal>
            <div style={{
              ...PANEL,
              marginTop: 44,
              padding: '22px 24px',
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              flexWrap: 'wrap',
              borderColor: 'rgba(14,159,143,.22)',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--m-ink)' }}>Still need help?</div>
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
            <h2 className="mkt-h3" style={{ marginBottom: 20, letterSpacing: '-.02em' }}>Related articles</h2>
            <div className="mkt-grid mkt-grid-3">
              {related.map(r => (
                <Link key={r.slug} to={`/help/${r.slug}`} style={{
                  ...PANEL,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  padding: '18px 18px',
                  textDecoration: 'none',
                }}>
                  <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>{r.category}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--m-ink)', lineHeight: 1.3, flex: 1 }}>{r.title}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, color: 'var(--m-accent)', fontWeight: 700, fontSize: 14 }}>Read <Icon name="chevronRight" size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
