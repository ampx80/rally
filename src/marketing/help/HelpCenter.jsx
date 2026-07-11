// ============================================================
// /help - the Help Center hub.
// Hero + instant search, category grid, and a full article
// directory grouped by category. Mirrors the PagesHub pattern so
// it feels native to the marketing site. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { Reveal, MktButton, CtaBand } from '../kit.jsx';
import { ARTICLES, CATEGORIES, articlesByCategory, searchArticles, allFaqs } from './help-data.js';
import { useSeoHead, orgLd, breadcrumbLd, faqLd, SITE } from '../seo/head.js';

function ArticleRow({ a }) {
  return (
    <Link to={`/help/${a.slug}`} className="mkt-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 18 }}>
      <span className="mkt-icon" style={{ width: 38, height: 38, borderRadius: 10, flex: 'none' }}>
        <Icon name="fileText" size={18} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.3 }}>{a.title}</span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 14.5, color: 'var(--m-ink2)', lineHeight: 1.5 }}>{a.summary}</span>
      </span>
    </Link>
  );
}

export default function HelpCenter() {
  const [q, setQ] = useState('');
  const needle = q.trim();
  const results = useMemo(() => (needle ? searchArticles(needle, 12) : null), [needle]);

  const trail = [{ name: 'Home', href: '/' }, { name: 'Help center' }];
  useSeoHead({
    title: 'Help center - guides and answers | Rally',
    description: `Browse ${ARTICLES.length}+ practical guides for Rally: getting started, importing data, deals and pipeline, Rook AI, quotes and billing, automations, admin, and integrations.`,
    canonical: `${SITE}/help`,
    jsonLd: [orgLd(), breadcrumbLd(trail), faqLd(allFaqs().slice(0, 10))],
  });

  return (
    <div>
      {/* Hero + search */}
      <section className="mkt-hero" style={{ paddingBottom: 28, overflow: 'hidden' }}>
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <span className="mkt-pill" style={{ marginBottom: 20 }}><span className="mkt-dot" /> Help center</span>
            <h1 className="mkt-h1" style={{ maxWidth: 820, margin: '0 auto', fontSize: 'clamp(2.4rem,5.5vw,4rem)' }}>
              How can we <span className="mkt-grad m-shine">help</span>?
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 620, margin: '18px auto 0' }}>
              Search the guides, or browse by topic. Still stuck? Ask Rook inside the app, or message our team.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ maxWidth: 580, margin: '30px auto 0', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--m-ink3)' }}><Icon name="search" size={20} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for a topic, feature, or question..."
                aria-label="Search the help center"
                style={{ width: '100%', padding: '15px 18px 15px 50px', borderRadius: 14, border: '1px solid var(--m-line2)', fontSize: 16, boxShadow: 'var(--m-shadow-md)', background: '#fff', color: 'var(--m-ink)', fontFamily: 'inherit' }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Search results */}
      {results && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <h2 className="mkt-h3" style={{ marginBottom: 18 }}>{results.length} result{results.length !== 1 ? 's' : ''} for "{needle}"</h2>
            {results.length === 0 ? (
              <p className="mkt-body">Nothing matched. Try a feature name like "quote", "import", or "Rook", or browse the topics below.</p>
            ) : (
              <div className="mkt-grid mkt-grid-2">
                {results.map(a => <ArticleRow key={a.slug} a={a} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Browse by topic */}
      {!results && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <Reveal>
              <h2 className="mkt-h2" style={{ marginBottom: 6 }}>Browse by topic</h2>
              <p className="mkt-lead" style={{ marginBottom: 26 }}>Eight shelves, every guide filed. Jump straight to what you need.</p>
            </Reveal>
            <div className="mkt-grid mkt-grid-4">
              {CATEGORIES.map((c, i) => {
                const count = articlesByCategory(c.name).length;
                return (
                  <Reveal key={c.name} delay={Math.min(i * 50, 320)}>
                    <a href={`#${c.name.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="mkt-card" style={{ display: 'block', height: '100%' }}>
                      <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name={c.icon} size={22} /></span>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)', lineHeight: 1.3 }}>{c.name}</div>
                      <p className="mkt-dim" style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>{c.blurb}</p>
                      <span style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--m-accent)' }}>{count} article{count !== 1 ? 's' : ''}</span>
                    </a>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Full directory grouped by category */}
      {!results && CATEGORIES.map(c => {
        const list = articlesByCategory(c.name);
        if (!list.length) return null;
        const id = c.name.toLowerCase().replace(/[^a-z]+/g, '-');
        return (
          <section key={c.name} id={id} className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)', scrollMarginTop: 90 }}>
            <div className="mkt-wrap">
              <Reveal style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                <span className="mkt-icon" style={{ flex: 'none' }}><Icon name={c.icon} size={22} /></span>
                <div>
                  <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)' }}>{c.name}</h2>
                  <p className="mkt-dim" style={{ margin: 0 }}>{c.blurb}</p>
                </div>
              </Reveal>
              <div className="mkt-grid mkt-grid-2">
                {list.map(a => <ArticleRow key={a.slug} a={a} />)}
              </div>
            </div>
          </section>
        );
      })}

      {/* Still need help */}
      {!results && (
        <section className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)' }}>
          <div className="mkt-wrap">
            <div className="mkt-grid mkt-grid-3">
              <div className="mkt-card" style={{ display: 'block' }}>
                <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name="sparkles" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>Ask Rook</div>
                <p className="mkt-dim" style={{ margin: '6px 0 14px', fontSize: 14.5, lineHeight: 1.5 }}>Inside the app, ask the AI operator in plain language. It answers from your live data.</p>
                <MktButton to="/app" variant="ghost">Open the app</MktButton>
              </div>
              <div className="mkt-card" style={{ display: 'block' }}>
                <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name="mail" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>Message us</div>
                <p className="mkt-dim" style={{ margin: '6px 0 14px', fontSize: 14.5, lineHeight: 1.5 }}>Email our team and we will get back to you. Real humans, fast answers.</p>
                <a href="mailto:support@rally.com" className="mkt-btn mkt-btn-ghost">Email support</a>
              </div>
              <div className="mkt-card" style={{ display: 'block' }}>
                <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name="activity" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>System status</div>
                <p className="mkt-dim" style={{ margin: '6px 0 14px', fontSize: 14.5, lineHeight: 1.5 }}>Check live platform status and uptime, updated in real time.</p>
                <MktButton to="/status" variant="ghost">View status</MktButton>
              </div>
            </div>
          </div>
        </section>
      )}

      <CtaBand title="Run your revenue on Rally." sub="Everything alive on first load. Ask Rook and it does the work." />
    </div>
  );
}
