// ============================================================
// /blog/:slug - the Rally reading experience. Big gradient title,
// author + meta, long-form prose with pull quotes, a read-progress
// bar, related posts, and a CTA. Sets title + meta + Article JSON-LD
// through the SEO head manager (imports head.js, does not modify it).
// If the slug is unknown, redirect to /blog. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, CtaBand } from './kit.jsx';
import { getPost, relatedPosts, wordCount } from './blog-data.js';
import { useSeoHead, orgLd, breadcrumbLd, SITE, BRAND } from './seo/head.js';
import './blog.css';

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const TAG_ICON = {
  'AI and CRM': 'sparkles',
  RevOps: 'workflow',
  Forecasting: 'trendUp',
  'Sales Process': 'target',
  Playbooks: 'layers',
  Migration: 'download',
  Email: 'mail',
};

const initials = (name) =>
  name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/* A read-progress bar wired to scroll position. */
function ReadBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div className="mkt-readbar" style={{ width: `${pct}%` }} aria-hidden />;
}

/* Pull a short quotable line out of a section so long posts get visual
   punctuation without hand-authoring a quote per section. Picks the first
   punchy sentence from the section's paragraphs. */
function pullQuoteFor(section) {
  for (const p of section.paragraphs || []) {
    const sentences = p.split(/(?<=\.)\s+/);
    for (const s of sentences) {
      const t = s.trim();
      if (t.length >= 60 && t.length <= 150) return t;
    }
  }
  return null;
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = getPost(slug);

  const canonical = post ? `${SITE}/blog/${post.slug}` : `${SITE}/blog`;

  useSeoHead(
    post
      ? {
          title: `${post.title} | ${BRAND}`,
          description: post.excerpt,
          canonical,
          jsonLd: [
            orgLd(),
            breadcrumbLd([
              { name: 'Home', href: '/' },
              { name: 'Blog', href: '/blog' },
              { name: post.title },
            ]),
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.excerpt,
              datePublished: post.date,
              dateModified: post.date,
              wordCount: wordCount(post),
              articleSection: post.tag,
              author: { '@type': 'Organization', name: BRAND },
              publisher: { '@type': 'Organization', name: BRAND },
              mainEntityOfPage: canonical,
            },
          ],
        }
      : {},
  );

  if (!post) return <Navigate to="/blog" replace />;

  const related = relatedPosts(post, 3);

  return (
    <>
      <ReadBar />

      <article>
        {/* Hero */}
        <div className="mkt-article-wide">
          <Reveal>
            <Link
              to="/blog"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--m-ink3)', fontWeight: 700, fontSize: 14.5, marginBottom: 20 }}
            >
              <Icon name="chevronRight" size={15} style={{ transform: 'rotate(180deg)' }} /> All posts
            </Link>
            <div className="mkt-article-hero" style={{ background: post.gradient }}>
              <span className="mkt-article-heroglyph"><Icon name={TAG_ICON[post.tag] || 'sparkles'} size={230} /></span>
              <span className="mkt-article-tag">
                <Icon name={TAG_ICON[post.tag] || 'sparkles'} size={13} /> {post.tag}
              </span>
              <h1 className="mkt-article-title">{post.title}</h1>
              <div className="mkt-article-meta">
                <span className="mkt-article-avatar">{initials(post.author)}</span>
                <span>{post.author}</span>
                <span className="mkt-article-metadot" />
                <span>{post.role}</span>
                <span className="mkt-article-metadot" />
                <span>{fmtDate(post.date)}</span>
                <span className="mkt-article-metadot" />
                <span>{post.readMins} min read</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Body */}
        <div className="mkt-article">
          <Reveal>
            <p className="mkt-article-lead">{post.excerpt}</p>
          </Reveal>

          <div className="mkt-prose-body">
            {post.sections.map((section, i) => {
              // Drop a pull quote before roughly every third section so long
              // reads get a visual beat without one on every heading.
              const quote = i > 0 && i % 3 === 0 ? pullQuoteFor(post.sections[i - 1]) : null;
              return (
                <React.Fragment key={i}>
                  {quote && (
                    <Reveal>
                      <blockquote className="mkt-pullquote">{quote}</blockquote>
                    </Reveal>
                  )}
                  <Reveal>
                    <div>
                      <span className="mkt-prose-kicker">{String(i + 1).padStart(2, '0')}</span>
                      <h2>{section.h}</h2>
                      {section.paragraphs.map((p, pi) => (
                        <p key={pi}>{p}</p>
                      ))}
                      {section.bullets && (
                        <ul>
                          {section.bullets.map((b, bi) => (
                            <li key={bi}>
                              <span className="mkt-prose-tick"><Icon name="check" size={18} stroke={2.4} /></span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Reveal>
                </React.Fragment>
              );
            })}
          </div>

          {/* Foot: attribution + back */}
          <Reveal>
            <div className="mkt-article-foot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mkt-article-avatar" style={{ background: post.gradient, border: 'none' }}>{initials(post.author)}</span>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 800, color: 'var(--m-ink)', fontSize: 15.5 }}>{post.author}</div>
                  <div className="mkt-dim" style={{ fontSize: 14 }}>{post.role}</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/blog')}
                className="mkt-btn mkt-btn-ghost"
                style={{ padding: '10px 18px' }}
              >
                <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back to the blog
              </button>
            </div>
          </Reveal>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mkt-section" style={{ paddingTop: 64, paddingBottom: 40 }}>
            <div className="mkt-wrap">
              <Reveal>
                <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Keep reading</div>
                <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)' }}>More from the Rally blog</h2>
              </Reveal>
              <div className="mkt-related-grid">
                {related.map((r, i) => (
                  <Reveal key={r.slug} delay={Math.min(i * 70, 240)} style={{ height: '100%' }}>
                    <Link to={`/blog/${r.slug}`} className="mkt-postcard" style={{ display: 'flex' }}>
                      <div className="mkt-postcard-art" style={{ background: r.gradient, height: 130 }}>
                        <span className="mkt-postcard-tag">{r.tag}</span>
                        <span className="mkt-postcard-glyph"><Icon name={TAG_ICON[r.tag] || 'sparkles'} size={82} /></span>
                      </div>
                      <div className="mkt-postcard-body">
                        <h3 className="mkt-postcard-title" style={{ fontSize: '1.14rem' }}>{r.title}</h3>
                        <div className="mkt-postcard-meta">
                          <span>{fmtDate(r.date)}</span>
                          <span className="mkt-meta-dot" />
                          <span>{r.readMins} min</span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      <CtaBand
        title="Run your revenue on Rally."
        sub="Everything alive on first load. Ask Rook and it does the work."
      />
    </>
  );
}
