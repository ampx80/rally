// ============================================================
// /help - the Help Center hub.
// Hero + instant search, category grid, and a full article
// directory grouped by category. Mirrors the PagesHub pattern so
// it feels native to the marketing site. NO em-dash / en-dash.
// Teal #0e9f8f product accent; violet #7c5cf7 Rook/AI only.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { Reveal, MktButton, CtaBand } from '../kit.jsx';
import { ARTICLES, CATEGORIES, articlesByCategory, searchArticles, allFaqs } from './help-data.js';
import { useSeoHead, orgLd, breadcrumbLd, faqLd, SITE } from '../seo/head.js';

const PANEL = {
  background: 'linear-gradient(180deg, #fff, #fafcfb)',
  border: '1px solid var(--m-line)',
  borderRadius: 14,
  boxShadow: 'none',
};

const SEARCH_INPUT = {
  width: '100%',
  padding: '15px 18px 15px 50px',
  borderRadius: 12,
  border: '1px solid var(--m-line2)',
  fontSize: 16,
  background: '#fff',
  color: 'var(--m-ink)',
  fontFamily: 'inherit',
  boxShadow: 'none',
  outlineColor: '#0e9f8f',
};

function ArticleRow({ a }) {
  return (
    <Link to={`/help/${a.slug}`} style={{
      ...PANEL,
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
      padding: '18px 18px',
      textDecoration: 'none',
      height: '100%',
    }}>
      <span className="mkt-icon" style={{ width: 38, height: 38, borderRadius: 10, flex: 'none' }}>
        <Icon name="fileText" size={18} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.3, fontSize: 16 }}>{a.title}</span>
        <span style={{ display: 'block', marginTop: 5, fontSize: 14.5, color: 'var(--m-ink2)', lineHeight: 1.5 }}>{a.summary}</span>
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
      <section className="mkt-hero" style={{ paddingBottom: 32, overflow: 'hidden' }}>
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <span className="mkt-pill" style={{ marginBottom: 22 }}><span className="mkt-dot" /> Help center</span>
            <h1 className="mkt-h1" style={{ maxWidth: 820, margin: '0 auto', fontSize: 'clamp(2.5rem,5.5vw,4.1rem)', letterSpacing: '-.03em', lineHeight: 1.05 }}>
              How can we <span className="mkt-grad m-shine">help</span>?
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 580, margin: '20px auto 0' }}>
              Search the guides, or browse by topic. Still stuck? Ask Rook inside the app, or message our team.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ maxWidth: 580, margin: '32px auto 0', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--m-teal)' }}><Icon name="search" size={20} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search for a topic, feature, or question..."
                aria-label="Search the help center"
                style={SEARCH_INPUT} />
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
              <p className="mkt-eyebrow" style={{ marginBottom: 10 }}>Topics</p>
              <h2 className="mkt-h2" style={{ marginBottom: 8 }}>Browse by topic</h2>
              <p className="mkt-lead" style={{ marginBottom: 28, maxWidth: 520 }}>Eight shelves, every guide filed. Jump straight to what you need.</p>
            </Reveal>
            <div className="mkt-grid mkt-grid-4">
              {CATEGORIES.map((c, i) => {
                const count = articlesByCategory(c.name).length;
                const isRook = /rook|ai/i.test(c.name);
                return (
                  <Reveal key={c.name} delay={Math.min(i * 50, 320)}>
                    <a href={`#${c.name.toLowerCase().replace(/[^a-z]+/g, '-')}`} style={{
                      ...PANEL,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      padding: '20px 18px',
                      textDecoration: 'none',
                      borderColor: isRook ? 'rgba(124,92,247,.28)' : 'var(--m-line)',
                    }}>
                      <span className={isRook ? 'mkt-icon mkt-icon-violet' : 'mkt-icon'} style={{ marginBottom: 14 }}>
                        <Icon name={c.icon} size={22} />
                      </span>
                      <div style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--m-ink)', lineHeight: 1.3 }}>{c.name}</div>
                      <p className="mkt-dim" style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{c.blurb}</p>
                      <span style={{
                        display: 'inline-block',
                        marginTop: 14,
                        fontSize: 13,
                        fontWeight: 700,
                        color: isRook ? '#7c5cf7' : 'var(--m-accent)',
                      }}>{count} article{count !== 1 ? 's' : ''}</span>
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
        const isRook = /rook|ai/i.test(c.name);
        return (
          <section key={c.name} id={id} className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)', scrollMarginTop: 90 }}>
            <div className="mkt-wrap">
              <Reveal style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 22 }}>
                <span className={isRook ? 'mkt-icon mkt-icon-violet' : 'mkt-icon'} style={{ flex: 'none' }}>
                  <Icon name={c.icon} size={22} />
                </span>
                <div>
                  <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.65rem,3vw,2.25rem)', letterSpacing: '-.02em' }}>{c.name}</h2>
                  <p className="mkt-dim" style={{ margin: '4px 0 0' }}>{c.blurb}</p>
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
            <Reveal>
              <p className="mkt-eyebrow" style={{ marginBottom: 10 }}>Need more</p>
              <h2 className="mkt-h2" style={{ marginBottom: 28, fontSize: 'clamp(1.5rem,2.8vw,2rem)' }}>Still stuck?</h2>
            </Reveal>
            <div className="mkt-grid mkt-grid-3">
              <div style={{ ...PANEL, padding: '22px 20px', borderColor: 'rgba(124,92,247,.28)' }}>
                <span className="mkt-icon mkt-icon-violet" style={{ marginBottom: 14 }}><Icon name="sparkles" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>Ask Rook</div>
                <p className="mkt-dim" style={{ margin: '6px 0 16px', fontSize: 14.5, lineHeight: 1.5 }}>Inside the app, ask the AI operator in plain language. It answers from your live data.</p>
                <MktButton to="/app" variant="ghost">Open the app</MktButton>
              </div>
              <div style={{ ...PANEL, padding: '22px 20px' }}>
                <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name="mail" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>Message us</div>
                <p className="mkt-dim" style={{ margin: '6px 0 16px', fontSize: 14.5, lineHeight: 1.5 }}>Email our team and we will get back to you. Real humans, fast answers.</p>
                <a href="mailto:support@rally.com" className="mkt-btn mkt-btn-ghost">Email support</a>
              </div>
              <div style={{ ...PANEL, padding: '22px 20px' }}>
                <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name="activity" size={22} /></span>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--m-ink)' }}>System status</div>
                <p className="mkt-dim" style={{ margin: '6px 0 16px', fontSize: 14.5, lineHeight: 1.5 }}>Check live platform status and uptime, updated in real time.</p>
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
