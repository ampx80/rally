// ============================================================
// /blog - the Rally resources index. Featured post + filterable
// grid, reveal-on-scroll, sets head via the SEO head manager.
// Composes from kit.jsx (Reveal, MktButton, CtaBand) + blog.css.
// Does not edit kit/marketing.css/head.js. NO em-dash / en-dash.
// ============================================================
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, CtaBand } from './kit.jsx';
import { POSTS, TAGS } from './blog-data.js';
import { useSeoHead, canonicalFor, orgLd, SITE, BRAND } from './seo/head.js';
import './blog.css';

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* Icon that suits each tag, drawn from the existing icon set. */
const TAG_ICON = {
  'AI and CRM': 'sparkles',
  RevOps: 'workflow',
  Forecasting: 'trendUp',
  'Sales Process': 'target',
  Playbooks: 'layers',
  Migration: 'download',
  Email: 'mail',
};

function PostCard({ post, delay = 0 }) {
  return (
    <Reveal delay={delay} style={{ height: '100%' }}>
      <Link to={`/blog/${post.slug}`} className="mkt-postcard" style={{ display: 'flex' }}>
        <div className="mkt-postcard-art" style={{ background: post.gradient }}>
          <span className="mkt-postcard-tag">{post.tag}</span>
          <span className="mkt-postcard-glyph"><Icon name={TAG_ICON[post.tag] || 'sparkles'} size={92} /></span>
        </div>
        <div className="mkt-postcard-body">
          <h3 className="mkt-postcard-title">{post.title}</h3>
          <p className="mkt-postcard-excerpt">{post.excerpt}</p>
          <div className="mkt-postcard-meta">
            <span>{fmtDate(post.date)}</span>
            <span className="mkt-meta-dot" />
            <span>{post.readMins} min read</span>
          </div>
          <span className="mkt-postcard-read">Read the post <Icon name="chevronRight" size={15} /></span>
        </div>
      </Link>
    </Reveal>
  );
}

export default function Blog() {
  const [tag, setTag] = useState('All');

  useSeoHead({
    title: `The Rally Blog - Revenue, RevOps, and AI-native CRM | ${BRAND}`,
    description:
      'Long-form thinking on AI-native CRM, forecasting, RevOps, pipeline reviews, MEDDIC, migrations, and sales email. Insight from the team building Rally.',
    canonical: `${SITE}/blog`,
    jsonLd: [
      orgLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${BRAND} Blog`,
        url: `${SITE}/blog`,
        description: 'Revenue operations, forecasting, and AI-native CRM insight from the Rally team.',
        blogPost: POSTS.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          description: p.excerpt,
          datePublished: p.date,
          url: `${SITE}/blog/${p.slug}`,
          author: { '@type': 'Organization', name: BRAND },
        })),
      },
    ],
  });

  const featured = POSTS[0];
  const rest = POSTS.slice(1);

  const filtered = useMemo(
    () => (tag === 'All' ? rest : rest.filter((p) => p.tag === tag)),
    [tag, rest],
  );
  // When a tag is selected the featured post may not match; show a filtered
  // full list instead of the featured split so the filter always feels honest.
  const showFeatured = tag === 'All';
  const fullList = tag === 'All' ? rest : POSTS.filter((p) => p.tag === tag);

  return (
    <>
      <section className="mkt-blog-hero">
        <div className="mkt-wrap">
          <Reveal>
            <div className="mkt-eyebrow">Resources</div>
            <h1 className="mkt-h1" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)', marginTop: 14, maxWidth: '14ch' }}>
              Notes on running <span className="mkt-grad m-shine">revenue</span>
            </h1>
            <p className="mkt-lead" style={{ marginTop: 20, maxWidth: 640 }}>
              How modern teams sell, forecast, and operate. Written by the people building Rally, for
              the people who own the number.
            </p>
          </Reveal>

          {/* Tag filter */}
          <Reveal delay={80}>
            <div className="mkt-blog-filter" role="tablist" aria-label="Filter posts by topic">
              <button
                className={`mkt-blog-chip${tag === 'All' ? ' is-on' : ''}`}
                onClick={() => setTag('All')}
                role="tab"
                aria-selected={tag === 'All'}
              >
                All posts
              </button>
              {TAGS.map((t) => (
                <button
                  key={t}
                  className={`mkt-blog-chip${tag === t ? ' is-on' : ''}`}
                  onClick={() => setTag(t)}
                  role="tab"
                  aria-selected={tag === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured (only on the unfiltered view) */}
      {showFeatured && (
        <section className="mkt-section-sm" style={{ paddingTop: 8 }}>
          <div className="mkt-wrap">
            <Reveal>
              <Link to={`/blog/${featured.slug}`} className="mkt-featured">
                <div className="mkt-featured-art" style={{ background: featured.gradient }}>
                  <span className="mkt-featured-badge">Featured</span>
                  <span className="mkt-featured-glyph"><Icon name={TAG_ICON[featured.tag] || 'sparkles'} size={200} /></span>
                </div>
                <div className="mkt-featured-body">
                  <div className="mkt-eyebrow" style={{ color: 'var(--m-accent)' }}>{featured.tag}</div>
                  <h2 className="mkt-featured-title">{featured.title}</h2>
                  <p className="mkt-featured-excerpt">{featured.excerpt}</p>
                  <div className="mkt-postcard-meta" style={{ paddingTop: 20 }}>
                    <span>{featured.author}</span>
                    <span className="mkt-meta-dot" />
                    <span>{fmtDate(featured.date)}</span>
                    <span className="mkt-meta-dot" />
                    <span>{featured.readMins} min read</span>
                  </div>
                  <span className="mkt-postcard-read" style={{ fontSize: 15 }}>
                    Read the post <Icon name="chevronRight" size={16} />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="mkt-section" style={{ paddingTop: showFeatured ? 24 : 8 }}>
        <div className="mkt-wrap">
          {!showFeatured && (
            <Reveal>
              <div className="mkt-dim" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                {fullList.length} {fullList.length === 1 ? 'post' : 'posts'} in {tag}
              </div>
            </Reveal>
          )}
          <div className="mkt-blog-grid">
            {(showFeatured ? filtered : fullList).map((p, i) => (
              <PostCard key={p.slug} post={p} delay={Math.min(i * 60, 300)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaBand
        title="Stop reading about it. Run it."
        sub="Everything in these posts, alive on first load. Ask Rook and watch it do the work."
      />
    </>
  );
}
