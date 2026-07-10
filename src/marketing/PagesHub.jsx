// ============================================================
// /pages - the programmatic-SEO mega-directory + HTML sitemap.
// Groups every generated page under labeled categories (Compare /
// Solutions / Learn), surfaces the link-magnet pages up top, and offers
// an instant client-side search. This is the primary internal-link
// equity distributor: hub -> category -> leaf. Also indexes the product
// screens. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import { ENTRIES, GROUP_ORDER, categoriesFor, featured, stats, TYPE_META } from './seo/registry.js';
import { useSeoHead, orgLd, breadcrumbLd, canonicalFor, SITE } from './seo/head.js';

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

function Directory({ entries }) {
  return (
    <div style={{ columns: '260px 3', columnGap: 28 }}>
      {entries.map((e) => (
        <Link key={e.slug} to={`/pages/${e.slug}`}
          style={{ display: 'block', breakInside: 'avoid', padding: '7px 0', color: 'var(--m-ink2)', fontSize: 15, lineHeight: 1.35 }}>
          <span style={{ color: 'var(--m-ink3)' }}>-</span> {e.title}
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
      <section className="mkt-hero" style={{ paddingBottom: 24 }}>
        <div className="mkt-wrap">
          <Reveal>
            <span className="mkt-pill" style={{ marginBottom: 20 }}><span className="mkt-dot" /> The Rally library</span>
            <h1 className="mkt-h1" style={{ maxWidth: 900, margin: '0 auto' }}>
              Everything about running <span className="mkt-grad m-shine">revenue</span>, in one place
            </h1>
            <p className="mkt-lead" style={{ maxWidth: 660, margin: '20px auto 0' }}>
              {s.total}+ researched pages: comparisons, alternatives, best-of rankings, industry playbooks, and plain-English definitions. Built for humans and the models they ask.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', margin: '30px 0 8px' }}>
              <div><div className="mkt-stat-value">{s.total}+</div><div className="mkt-stat-label">total pages</div></div>
              <div><div className="mkt-stat-value">{s.categories}</div><div className="mkt-stat-label">categories</div></div>
              <div><div className="mkt-stat-value">{(s.byType.ranking || 0) + (s.byType.versus || 0)}</div><div className="mkt-stat-label">comparisons + rankings</div></div>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ maxWidth: 560, margin: '22px auto 0', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--m-ink3)' }}><Icon name="search" size={20} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search 1000+ pages..."
                style={{ width: '100%', padding: '15px 18px 15px 50px', borderRadius: 14, border: '1px solid var(--m-line2)', fontSize: 16, boxShadow: 'var(--m-shadow-md)', background: '#fff', color: 'var(--m-ink)', fontFamily: 'inherit' }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Search results */}
      {filtered && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <h2 className="mkt-h3" style={{ marginBottom: 16 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{q}"</h2>
            {filtered.length === 0 ? <p className="mkt-body">Nothing matched. Try a competitor name, an industry, or a term like "pipeline".</p> : (
              <div className="mkt-grid mkt-grid-3">
                {filtered.map(e => (
                  <Link key={e.slug} to={`/pages/${e.slug}`} className="mkt-card" style={{ display: 'block' }}>
                    <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>{e.category}</div>
                    <div style={{ fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.3 }}>{e.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured link-magnet pages */}
      {!filtered && feat.length > 0 && (
        <section className="mkt-section-sm">
          <div className="mkt-wrap">
            <Reveal><h2 className="mkt-h2" style={{ marginBottom: 6 }}>Most useful, first</h2>
              <p className="mkt-lead" style={{ marginBottom: 24 }}>The comparisons and rankings buyers actually search for.</p></Reveal>
            <div className="mkt-grid mkt-grid-3">
              {feat.map((e, i) => (
                <Reveal key={e.slug} delay={Math.min(i * 60, 300)}>
                  <Link to={`/pages/${e.slug}`} className="mkt-card mkt-card-glow" style={{ display: 'block', height: '100%' }}>
                    <span className="mkt-icon" style={{ marginBottom: 14 }}><Icon name={e.icon} size={22} /></span>
                    <div className="mkt-eyebrow" style={{ fontSize: 11, marginBottom: 6 }}>{e.category}</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--m-ink)', lineHeight: 1.28 }}>{e.title}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 14, color: 'var(--m-accent)', fontWeight: 700, fontSize: 14 }}>Read <Icon name="chevronRight" size={14} /></span>
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
          <section key={group} className="mkt-section-sm" style={{ borderTop: '1px solid var(--m-line)' }}>
            <div className="mkt-wrap">
              <Reveal style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 6 }}>
                <span className="mkt-icon" style={{ flex: 'none' }}><Icon name={gm.icon || 'layers'} size={22} /></span>
                <div><h2 className="mkt-h2" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)' }}>{group}</h2>
                  <p className="mkt-dim" style={{ margin: 0 }}>{gm.blurb}</p></div>
              </Reveal>
              {cats.map(({ category, entries }) => (
                <div key={category} style={{ marginTop: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, borderBottom: '1px solid var(--m-line)', paddingBottom: 8 }}>
                    <h3 className="mkt-h3" style={{ fontSize: '1.2rem' }}>{category}</h3>
                    <span className="mkt-dim" style={{ fontSize: 14 }}>{entries.length}</span>
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
            <div className="mkt-grid mkt-grid-2">
              <div>
                <h3 className="mkt-h3" style={{ marginBottom: 14 }}>The product</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {PRODUCT_LINKS.map(([l, to]) => <Link key={to} to={to} style={{ color: 'var(--m-ink2)', fontSize: 15 }}>- {l}</Link>)}
                </div>
              </div>
              <div>
                <h3 className="mkt-h3" style={{ marginBottom: 14 }}>Company</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {MARKETING_LINKS.map(([l, to]) => <Link key={to} to={to} style={{ color: 'var(--m-ink2)', fontSize: 15 }}>- {l}</Link>)}
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
