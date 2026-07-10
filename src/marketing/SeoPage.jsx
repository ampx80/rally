// ============================================================
// /pages/:slug - the universal generated-page renderer.
// One flexible React template turns any normalized registry entry into
// a full, crawlable, animated page: breadcrumb, hero + stat row, a
// short-answer TL;DR callout (for AI overviews + LLMs), structured
// body, data/comparison tables, ranked lists, FAQ, and a dense related-
// pages module. Sets title + meta + JSON-LD via the head manager, so
// each page ships full structured data. NO em-dash / en-dash.
// ============================================================
import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Reveal, MktButton, CtaBand } from './kit.jsx';
import { getEntry, relatedFor, TYPE_META } from './seo/registry.js';
import {
  Breadcrumb, Prose, Paragraphs, KeyPoints, Steps, CompareTable, ProsCons,
  RankedList, ValueGrid, Faq, Related, InlineCta, BulletList,
} from './seo/components.jsx';
import {
  useSeoHead, metaFor, canonicalFor, orgLd, breadcrumbLd, faqLd, articleLd,
  definedTermLd, itemListLd,
} from './seo/head.js';

function StatRow({ stats }) {
  const list = stats || [];
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', marginTop: 26 }}>
      {list.map((s, i) => (
        <div key={i}>
          <div className="mkt-stat-value" style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)' }}>{s.value}</div>
          <div className="mkt-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ShortAnswer({ text }) {
  if (!text) return null;
  return (
    <Reveal className="mkt-card" style={{ marginTop: 28, borderLeft: '4px solid var(--m-accent)', background: 'linear-gradient(120deg, rgba(91,75,245,.05), transparent)' }}>
      <div className="mkt-eyebrow" style={{ marginBottom: 8 }}>Short answer</div>
      <p className="mkt-body" style={{ margin: 0, fontSize: 17.5, color: 'var(--m-ink)', maxWidth: 780 }}>{text}</p>
    </Reveal>
  );
}

export default function SeoPage() {
  const { slug } = useParams();
  const entry = getEntry(slug);
  if (!entry) return <Navigate to="/pages" replace />;

  const meta = TYPE_META[entry.type] || {};
  const { title, description } = metaFor(entry);
  const related = relatedFor(entry, 6);
  const trail = [
    { name: 'Home', href: '/' },
    { name: 'Pages', href: '/pages' },
    { name: entry.category, href: `/pages?group=${encodeURIComponent(entry.group)}` },
    { name: entry.h1 || entry.title },
  ];

  const jsonLd = [
    orgLd(),
    breadcrumbLd(trail),
    articleLd(entry),
    faqLd(entry.faqs),
    entry.type === 'glossary' ? definedTermLd(entry) : null,
    (entry.type === 'ranking' || entry.type === 'alternative') ? itemListLd(entry) : null,
  ].filter(Boolean);

  useSeoHead({ title, description, canonical: canonicalFor(entry.slug), jsonLd });

  const stats = entry.stats || (entry.stat ? [entry.stat] : []);

  return (
    <article className="mkt-wrap" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 1000 }}>
      <Breadcrumb trail={trail} />

      {/* Hero */}
      <header>
        {entry.eyebrow && <div className="mkt-eyebrow" style={{ marginBottom: 12 }}>{entry.eyebrow}</div>}
        {!entry.eyebrow && <div className="mkt-eyebrow" style={{ marginBottom: 12 }}>{entry.category}</div>}
        <h1 className="mkt-h1" style={{ fontSize: 'clamp(2.1rem,4.6vw,3.4rem)', maxWidth: 900 }}>{entry.h1 || entry.title}</h1>
        {entry.intro && <div style={{ marginTop: 18 }}><Paragraphs text={entry.intro} className="mkt-lead" /></div>}
        <StatRow stats={stats} />
      </header>

      <ShortAnswer text={entry.shortAnswer} />

      {/* Glossary key points */}
      <KeyPoints points={entry.keyPoints} />

      {/* Primary table up high for comparison/versus pages */}
      {entry.table && (entry.type === 'comparison' || entry.type === 'versus') && (
        <Prose h={entry.tableHeading || 'Side by side'}>
          <CompareTable table={entry.table} highlightCol={entry.highlightCol ?? 1} />
        </Prose>
      )}

      {/* Ranked list (rankings + alternatives) */}
      {entry.items && entry.items.length > 0 && (
        <Prose h={entry.itemsHeading || (entry.type === 'alternative' ? 'The best alternatives' : 'The ranking')}>
          <RankedList items={entry.items} showRank={entry.type !== 'alternative' ? true : entry.showRank !== false} />
        </Prose>
      )}

      {/* Solution value props */}
      {entry.valueProps && <Prose h={entry.valuePropsHeading || 'What you get'}><ValueGrid items={entry.valueProps} /></Prose>}

      {/* How-to steps */}
      {entry.steps && entry.steps.length > 0 && (
        <Prose h={entry.stepsHeading || 'Step by step'}><Steps steps={entry.steps} /></Prose>
      )}

      {/* Free-form prose sections */}
      {entry.sections && entry.sections.map((s, i) => (
        <Prose key={i} h={s.h}>
          <Paragraphs text={s.body} />
          {s.bullets && <BulletList items={s.bullets} />}
          {s.table && <CompareTable table={s.table} highlightCol={s.highlightCol ?? 1} />}
        </Prose>
      ))}

      {/* Secondary data table for non-comparison types */}
      {entry.table && !(entry.type === 'comparison' || entry.type === 'versus') && (
        <Prose h={entry.tableHeading || 'By the numbers'}>
          <CompareTable table={entry.table} highlightCol={entry.highlightCol ?? -1} />
        </Prose>
      )}

      {/* Comparison honesty + verdict */}
      {(entry.pros || entry.cons) && (
        <Prose h={entry.prosConsHeading || 'The honest take'}>
          <ProsCons pros={entry.pros} cons={entry.cons} proLabel={entry.proLabel} conLabel={entry.conLabel} />
        </Prose>
      )}
      {entry.verdict && (
        <Reveal className="mkt-card mkt-card-glow" style={{ marginTop: 30 }}>
          <div className="mkt-eyebrow" style={{ marginBottom: 8 }}>The verdict</div>
          <Paragraphs text={entry.verdict} className="mkt-body" />
        </Reveal>
      )}

      <InlineCta />

      <Faq faqs={entry.faqs} />
      <Related items={related} />

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <Link to="/pages" style={{ color: 'var(--m-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Browse all {meta.category ? meta.category.toLowerCase() : 'pages'} and more
        </Link>
      </div>
    </article>
  );
}
