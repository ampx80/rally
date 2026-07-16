// ============================================================
// GUIDES HUB  ->  /guides
// Pillar page for the isolated juggernaut track. Lists every deep guide
// as a card and links to /guides/<slug>. Marketing (public) route.
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSeoHead, SITE } from './seo/head.js';
import { JUGGERNAUTS } from './seo/juggernaut-registry.js';

const introFor = (e) =>
  typeof e.intro === 'string' ? e.intro : Array.isArray(e.intro) ? e.intro[0] : (e.metaDescription || '');

export default function GuidesHub() {
  const guides = useMemo(
    () => [...JUGGERNAUTS].sort((a, b) => String(a.category || '').localeCompare(String(b.category || ''))),
    []
  );

  useSeoHead({
    title: 'Guides: In-Depth Revenue and CRM Playbooks | Rally',
    description:
      'Deep, practical guides on running revenue: CRM buying, AI CRM, competitor comparisons, calculators, and playbooks. Best-in-class, regularly updated.',
    canonical: `${SITE}/guides`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Rally Guides',
      url: `${SITE}/guides`,
      hasPart: guides.map((e) => ({ '@type': 'Article', name: e.title, url: `${SITE}/guides/${e.slug}` })),
    },
  });

  const groups = useMemo(() => {
    const m = new Map();
    for (const e of guides) {
      const k = e.category || 'Guides';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return [...m.entries()];
  }, [guides]);

  return (
    <div className="guides-hub" style={{ maxWidth: 1080, margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
      <style>{`
        .guides-hub .gh-eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; font-weight: 700; color: var(--accent); }
        .guides-hub h1 { font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.08; margin: .5rem 0 .75rem; letter-spacing: -.02em; }
        .guides-hub .gh-sub { font-size: 1.2rem; color: var(--ink-2); max-width: 62ch; }
        .guides-hub .gh-cat { font-size: 1.15rem; font-weight: 700; margin: 2.4rem 0 1rem; }
        .guides-hub .gh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .guides-hub .gh-card { display: block; border: 1px solid var(--line); border-radius: 16px; padding: 1.25rem; background: var(--panel, #fff); text-decoration: none; color: inherit; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
        .guides-hub .gh-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px -14px rgba(0,0,0,.25); border-color: var(--accent-300, var(--accent)); }
        .guides-hub .gh-card h3 { font-size: 1.12rem; line-height: 1.25; margin: .5rem 0 .4rem; }
        .guides-hub .gh-card p { font-size: 1rem; color: var(--ink-2); margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .guides-hub .gh-meta { display: flex; gap: .5rem; align-items: center; font-size: .78rem; color: var(--ink-2); }
        .guides-hub .gh-tag { display: inline-block; font-size: .72rem; font-weight: 700; color: var(--accent); background: var(--accent-50, rgba(14,159,143,.1)); padding: .15rem .5rem; border-radius: 999px; }
      `}</style>

      <div className="gh-eyebrow">Rally Guides</div>
      <h1>Revenue and CRM playbooks, done right</h1>
      <p className="gh-sub">
        Deep, practical, regularly updated guides on choosing and running the software that runs your revenue.
        Comparisons, calculators, and playbooks built to be the best page on the internet for their question.
      </p>

      {groups.map(([cat, items]) => (
        <section key={cat}>
          <h2 className="gh-cat">{cat}</h2>
          <div className="gh-grid">
            {items.map((e) => (
              <Link key={e.slug} className="gh-card" to={`/guides/${e.slug}`}>
                <div className="gh-meta">
                  <span className="gh-tag">{e.category || 'Guide'}</span>
                  {e.readingTime ? <span>{e.readingTime}</span> : null}
                </div>
                <h3>{e.title}</h3>
                <p>{introFor(e)}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
