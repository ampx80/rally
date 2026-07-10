// ============================================================
// SEO HEAD MANAGER  (programmatic SEO engine)
// A tiny, dependency-free head manager for the SPA. Sets <title>,
// meta description, canonical, Open Graph + Twitter tags, and injects
// JSON-LD structured data so every generated page is crawlable by
// search engines AND legible to LLMs. Restores the previous head on
// unmount so navigating between pages never leaks stale tags.
// NO em-dash / en-dash anywhere.
// ============================================================
import { useEffect } from 'react';

const SITE = 'https://rally-psi-five.vercel.app';
const BRAND = 'Rally';
const DEFAULT_TITLE = 'Rally - The AI Revenue Platform and CRM';

function upsertMeta(attr, key, content) {
  if (content == null) return null;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  const created = !el;
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  const prev = el.getAttribute('content');
  el.setAttribute('content', content);
  return { el, created, prev, attr };
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  const created = !el;
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  const prev = el.getAttribute('href');
  el.setAttribute('href', href);
  return { el, created, prev };
}

export const canonicalFor = (slug) => `${SITE}/pages/${slug}`;

/* Build the full <title> and description strings for an entry. */
export function metaFor(entry) {
  const title = entry.metaTitle || `${entry.title} | ${BRAND}`;
  let description = entry.metaDescription
    || (typeof entry.intro === 'string' ? entry.intro : Array.isArray(entry.intro) ? entry.intro[0] : '')
    || `${entry.title} - on Rally, the AI-native revenue platform.`;
  if (description.length > 158) {
    const cut = description.slice(0, 158);
    description = cut.slice(0, cut.lastIndexOf(' ')) + '...';
  }
  return { title, description };
}

/* Apply title + meta + canonical + OG + JSON-LD for the lifetime of a page. */
export function useSeoHead({ title, description, canonical, jsonLd, image } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const cleanups = [];
    const track = (r) => { if (r) cleanups.push(r); };
    track(upsertMeta('name', 'description', description));
    track(upsertLink('canonical', canonical || SITE));
    track(upsertMeta('property', 'og:title', title));
    track(upsertMeta('property', 'og:description', description));
    track(upsertMeta('property', 'og:type', 'article'));
    track(upsertMeta('property', 'og:url', canonical || SITE));
    track(upsertMeta('property', 'og:site_name', BRAND));
    track(upsertMeta('name', 'twitter:card', 'summary_large_image'));
    track(upsertMeta('name', 'twitter:title', title));
    track(upsertMeta('name', 'twitter:description', description));
    if (image) { track(upsertMeta('property', 'og:image', image)); track(upsertMeta('name', 'twitter:image', image)); }

    // JSON-LD structured data (one or many graphs).
    const graphs = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    const scripts = graphs.map((g) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(g);
      document.head.appendChild(s);
      return s;
    });

    return () => {
      document.title = prevTitle;
      // Restore or remove each mutated tag.
      cleanups.forEach(({ el, created, prev }) => {
        if (created) el.remove();
        else if (prev != null) el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', prev);
      });
      scripts.forEach(s => s.remove());
    };
  }, [title, description, canonical, JSON.stringify(jsonLd || null), image]);
}

/* ---------- JSON-LD builders ---------- */
export const orgLd = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE,
  description: 'The AI-native revenue platform and CRM. Run your revenue on Rally.',
  brand: BRAND,
});

export function breadcrumbLd(trail) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name,
      item: t.href ? (t.href.startsWith('http') ? t.href : SITE + t.href) : undefined,
    })),
  };
}

export function faqLd(faqs) {
  if (!faqs || !faqs.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function articleLd(entry) {
  const { title, description } = metaFor(entry);
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description, about: entry.title,
    author: { '@type': 'Organization', name: BRAND },
    publisher: { '@type': 'Organization', name: BRAND },
    datePublished: entry.published || '2026-07-10',
    dateModified: entry.updated || '2026-07-10',
    mainEntityOfPage: canonicalFor(entry.slug),
  };
}

export function definedTermLd(entry) {
  return {
    '@context': 'https://schema.org', '@type': 'DefinedTerm',
    name: entry.term || entry.title,
    description: typeof entry.intro === 'string' ? entry.intro : (entry.definition || ''),
    inDefinedTermSet: `${SITE}/pages`,
  };
}

export function itemListLd(entry) {
  if (!entry.items || !entry.items.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: entry.title, numberOfItems: entry.items.length,
    itemListElement: entry.items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name,
    })),
  };
}

export { SITE, BRAND, DEFAULT_TITLE };
