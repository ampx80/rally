// ============================================================
// /pages - the programmatic-SEO mega-directory + HTML sitemap.
// Groups every generated page under labeled categories (Compare /
// Solutions / Learn), surfaces the link-magnet pages up top, and offers
// an instant client-side search. This is the primary internal-link
// equity distributor: hub -> category -> leaf. Also indexes the product
// screens. NO em-dash / en-dash.
// Teal #0e9f8f product accent; violet reserved for Rook/AI only.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, CtaBand } from './kit.jsx';
import { HeroStats, CategoryTiles, Constellation } from './viz2/PagesHubViz.jsx';
import { ENTRIES, GROUP_ORDER, categoriesFor, featured, stats } from './seo/registry.js';
import { useSeoHead, orgLd, breadcrumbLd, SITE } from './seo/head.js';

const PRODUCT_LINKS = [
  ['Command center', '/app'], ['Leads', '/leads'], ['Deals', '/deals'], ['Contacts', '/contacts'],
  ['Companies', '/companies'], ['Forecasting', '/forecasting'], ['Projects', '/projects'],
  ['Quotes', '/quotes'], ['Studio', '/studio'], ['Dashboards', '/dashboards'], ['Workflows', '/workflows'],
  ['Audit log', '/audit'], ['Settings', '/settings'],
];
const MARKETING_LINKS = [
  ['Product / Features', '/features'], ['Rook AI operator', '/product/rook'],
  ['Pricing', '/pricing'], ['Security', '/security'], ['Manifesto', '/manifesto'],
];

const GROUP_META = {
  Compare:   { icon: 'command',  blurb: 'Comparisons, alternatives, and researched best-of rankings.' },
  Solutions: { icon: 'target',   blurb: 'Rally for your industry, team, use case, and stack.' },
  Learn:     { icon: 'fileText', blurb: 'Definitions, playbooks, and ready-to-use templates.' },
};

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

function Directory({ entries }) {
  return (
    <div style={{ columns: '260px 3', columnGap: 28 }}>
      {entries.map((e) => (
        <Link key={e.slug} to={`/pages/${e.slug}`}
          style={{ display: 'block', breakInside: 'avoid', padding: '7px 0', color: 'var(--m-ink2)', fontSize: 15, lineHeight: 1.35 }}>
          <span style={{ color: 'var(--m-teal)' }}>-</span> {e.title}
        </Link>
      ))}
    </div>
  );
}

export default function PagesHub() {
  const [q, setQ] = useState('');
  const s = useMemo(() => stats(), []);
  const feat = useMemo(() => featured(6), []);
  const needle = q.trim().toLowerCase();

  const heroStats = useMemo(() => [
    { value: s.total, suffix: '+', label: 'total pages', grad: true },
    { value: s.categories, label: 'categories' },
    { value: (s.byType.ranking || 0) + (s.byType.versus || 0), label: 'comparisons + rankings' },
  ], [s]);

  const groupTiles = useMemo(() => GROUP_ORDER.map((group) => {
    const cats = categoriesFor(group);
    const count = cats.reduce((n, c) => n + c.entries.length, 0);
    const gm = GROUP_META[group] || {};
    return { name: group, count, icon: gm.icon || 'layers', blurb: gm.blurb, to: `/pages#${group.toLowerCase()}` };
  }).filter((t) => t.count > 0), []);

  const filtered = useMemo(() => {
    if (!needle) return null;
    return ENTRIES.filter(e => e.title.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle)).slice(0, 60);
  }, [needle]);

  const trail = [{ name: 'Home', href: '/' }, { name: 'Pages' }];
  useSeoHead({
    title: `All pages - ${s.total}+ CRM guides, comparisons, and rankings | Rally`,
    description: `Browse ${s.total}+ pages on CRM, sales, and revenue operations: comparisons, alternatives, best-of rankings, industry guides, definitions, and playbooks.`,
    canonical: `${SITE}/pages`,
    jsonLd: [orgLd(), breadcrumbLd(trail), {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Rally', url: SITE,
      potentialAction: { '@type': 'SearchAction', target: `${SITE}/pages?q={query}`, 'query-input': 'required name=query' },
    }],
  });

  return (
    <div>
      {/* Hero */}
      <section className="mkt-hero" style={{ paddingBottom: 28, overflow: 'hidden' }}>
        <Constellation />
        <div className="mkt-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <span className="mkt-pill" style={{ marginBottom: 22 }}><span className="mkt-dot" /> The Rally library</span>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto', letterSpacing: '-.03em', lineHeight: 1.05 }}>
              Everything about running <span className="mkt-grad m-shine">revenue</span>, in one place
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 640, margin: '22px auto 0' }}>
              {s.total}+ researched pages: comparisons, alternatives, best-of rankings, industry playbooks, and plain-English definitions. Built for humans and the models they ask.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ margin: '36px 0 8px' }}>
              <HeroStats stats={heroStats} />
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ maxWidth: 560, margin: '24px auto 0', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--m-teal)' }}><Icon name="search" size={20} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search 1000+ pages..."
                style={SEARCH_INPUT} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Search results */}
      {filtered && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <h2 className="mkt-h3" style={{ marginBottom: 18 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{q}"</h2>
            {filtered.length === 0 ? <p className="mkt-body">Nothing matched. Try a competitor name, an industry, or a term like "pipeline".</p> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filtered.map(e => (
                  <Link key={e.slug} to={`/pages/${e.slug}`} style={{
                    ...PANEL,
                    display: 'block',
                    padding: '16px 20px',
                    textDecoration: 'none',
                  }}>
                    <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{e.category}</div>
                    <div style={{ fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.3, fontSize: 16.5 }}>{e.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Browse by category */}
      {!filtered && groupTiles.length > 0 && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <Reveal>
              <p className="mkt-eyebrow" style={{ marginBottom: 10 }}>Directory</p>
              <h2 className="mkt-h2" style={{ marginBottom: 8 }}>Browse by category</h2>
              <p className="mkt-lead" style={{ marginBottom: 28, maxWidth: 560 }}>Three shelves, every page filed. Jump straight to the one you need.</p>
            </Reveal>
            <CategoryTiles tiles={groupTiles} />
          </div>
        </section>
      )}

      {/* Featured link-magnet pages */}
      {!filtered && feat.length > 0 && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <Reveal>
              <p className="mkt-eyebrow" style={{ marginBottom: 10 }}>Start here</p>
              <h2 className="mkt-h2" style={{ marginBottom: 8 }}>Most useful, first</h2>
              <p className="mkt-lead" style={{ marginBottom: 28, maxWidth: 560 }}>The comparisons and rankings buyers actually search for.</p>
            </Reveal>
            <div className="mkt-grid mkt-grid-3">
              {feat.map((e, i) => (
                <Reveal key={e.slug} delay={Math.min(i * 60, 300)}>
                  <Link to={`/pages/${e.slug}`} style={{
                    ...PANEL,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: '22px 22px 20px',
                    textDecoration: 'none',
                    borderColor: 'rgba(14,159,143,.22)',
                  }}>
                    <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name={e.icon} size={22} /></span>
                    <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{e.category}</div>
                    <div style={{ fontWeight: 800, fontSize: 17.5, color: 'var(--m-ink)', lineHeight: 1.28, flex: 1 }}>{e.title}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16, color: 'var(--m-accent)', fontWeight: 700, fontSize: 14 }}>Read <Icon name="chevronRight" size={14} /></span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Grouped directory */}
      {!filtered && GROUP_ORDER.map(group => {
        const cats = categoriesFor(group);
        if (!cats.length) return null;
        const gm = GROUP_META[group] || {};
        return (
          <section key={group} id={group.toLowerCase()} className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)', scrollMarginTop: 90 }}>
            <div className="mkt-wrap">
              <Reveal style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
                <span className="mkt-icon" style={{ flex: 'none' }}><Icon name={gm.icon || 'layers'} size={22} /></span>
                <div>
                  <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.65rem,3vw,2.25rem)', letterSpacing: '-.02em' }}>{group}</h2>
                  <p className="mkt-dim" style={{ margin: '4px 0 0' }}>{gm.blurb}</p>
                </div>
              </Reveal>
              {cats.map(({ category, entries }) => (
                <div key={category} style={{ marginTop: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, borderBottom: '1px solid var(--m-line)', paddingBottom: 8 }}>
                    <h3 className="mkt-h3" style={{ fontSize: '1.15rem' }}>{category}</h3>
                    <span className="mkt-dim" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--m-teal)' }}>{entries.length}</span>
                  </div>
                  <Directory entries={entries} />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Product + marketing index */}
      {!filtered && (
        <section className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)' }}>
          <div className="mkt-wrap">
            <div className="mkt-grid mkt-grid-2" style={{ gap: 32 }}>
              <div style={{ ...PANEL, padding: '24px 26px' }}>
                <h3 className="mkt-h3" style={{ marginBottom: 14, fontSize: '1.15rem' }}>The product</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {PRODUCT_LINKS.map(([l, to]) => (
                    <Link key={to} to={to} style={{ color: 'var(--m-ink2)', fontSize: 15, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--m-teal)' }}>-</span> {l}
                    </Link>
                  ))}
                </div>
              </div>
              <div style={{ ...PANEL, padding: '24px 26px' }}>
                <h3 className="mkt-h3" style={{ marginBottom: 14, fontSize: '1.15rem' }}>Company</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {MARKETING_LINKS.map(([l, to]) => (
                    <Link key={to} to={to} style={{ color: 'var(--m-ink2)', fontSize: 15, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: to.includes('rook') ? '#7c5cf7' : 'var(--m-teal)' }}>-</span> {l}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </div>
  );
}
