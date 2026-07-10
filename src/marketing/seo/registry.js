// ============================================================
// SEO CONTENT REGISTRY  (programmatic SEO engine)
// Aggregates every generated-page dataset into one normalized, deduped
// index with fast lookup + automatic internal linking. Add a dataset
// file under ./data, register it in ./data/index.js, and every entry
// becomes a live page at /pages/:slug plus a card in the /pages hub and
// a row in sitemap.xml. NO em-dash / en-dash.
// ============================================================
import DATASETS from './data/index.js';

/* type -> presentation metadata (category label, hub grouping, blurb) */
export const TYPE_META = {
  glossary:    { category: 'Definitions',  group: 'Learn',    icon: 'fileText', blurb: 'Plain-English definitions of the terms revenue teams actually use.' },
  howto:       { category: 'Guides',       group: 'Learn',    icon: 'checkSquare', blurb: 'Step-by-step playbooks for running a modern revenue org.' },
  template:    { category: 'Templates',    group: 'Learn',    icon: 'copy',     blurb: 'Ready-to-use frameworks, scripts, and templates.' },
  usecase:     { category: 'Use cases',    group: 'Solutions', icon: 'target',  blurb: 'How teams put Rally to work for a specific job.' },
  industry:    { category: 'By industry',  group: 'Solutions', icon: 'building', blurb: 'The right CRM setup for your industry.' },
  role:        { category: 'By team',      group: 'Solutions', icon: 'users',   blurb: 'CRM built for your role and team size.' },
  feature:     { category: 'Features',     group: 'Solutions', icon: 'sparkles', blurb: 'Software for every part of the revenue engine.' },
  integration: { category: 'Integrations', group: 'Solutions', icon: 'plug',    blurb: 'Connect Rally to the tools you already run on.' },
  comparison:  { category: 'Rally vs',     group: 'Compare',  icon: 'command',  blurb: 'How Rally stacks up against the incumbents.' },
  versus:      { category: 'Head to head', group: 'Compare',  icon: 'command',  blurb: 'Neutral, side-by-side breakdowns of the tools you are weighing.' },
  alternative: { category: 'Alternatives', group: 'Compare',  icon: 'layers',  blurb: 'The best alternatives to every major platform.' },
  ranking:     { category: 'Rankings',     group: 'Compare',  icon: 'trendUp', blurb: 'Ranked, researched best-of lists for every buying scenario.' },
  migration:   { category: 'Migration',    group: 'Compare',  icon: 'rocket',  blurb: 'Move off legacy software without losing a thing.' },
};
export const GROUP_ORDER = ['Compare', 'Solutions', 'Learn'];

/* ---------- normalize + index ---------- */
function normalize(raw) {
  const meta = TYPE_META[raw.type] || { category: 'Resources', group: 'Learn', icon: 'fileText' };
  return {
    related: [],
    ...raw,
    category: raw.category || meta.category,
    group: meta.group,
    icon: raw.icon || meta.icon,
    updated: raw.updated || '2026-07-10',
  };
}

const seen = new Set();
export const ENTRIES = DATASETS
  .flat()
  .filter(e => e && e.slug && !seen.has(e.slug) && seen.add(e.slug))
  .map(normalize);

export const BY_SLUG = new Map(ENTRIES.map(e => [e.slug, e]));
export const getEntry = (slug) => BY_SLUG.get(slug) || null;
export const allSlugs = () => ENTRIES.map(e => e.slug);
export const byType = (type) => ENTRIES.filter(e => e.type === type);
export const byGroup = (group) => ENTRIES.filter(e => e.group === group);

export function categoriesFor(group) {
  const cats = new Map();
  for (const e of ENTRIES.filter(x => x.group === group)) {
    if (!cats.has(e.category)) cats.set(e.category, []);
    cats.get(e.category).push(e);
  }
  return [...cats.entries()].map(([category, entries]) => ({ category, entries }));
}

export function stats() {
  const byT = {};
  for (const e of ENTRIES) byT[e.type] = (byT[e.type] || 0) + 1;
  return { total: ENTRIES.length, byType: byT, categories: new Set(ENTRIES.map(e => e.category)).size };
}

/* Resolve related links: use explicit slugs, then fill from same category,
   then same group, up to `n`. Returns lightweight link objects. */
export function relatedFor(entry, n = 6) {
  const picked = [];
  const push = (e) => { if (e && e.slug !== entry.slug && !picked.some(p => p.slug === e.slug)) picked.push(e); };
  (entry.related || []).forEach(s => push(BY_SLUG.get(s)));
  ENTRIES.filter(e => e.category === entry.category).forEach(push);
  ENTRIES.filter(e => e.group === entry.group).forEach(push);
  return picked.slice(0, n).map(e => ({ slug: e.slug, title: e.title, category: e.category }));
}

/* Deterministic "featured" set for the hub (link-magnet pages first). */
export function featured(n = 8) {
  const order = ['ranking', 'versus', 'comparison', 'alternative'];
  return [...ENTRIES]
    .sort((a, b) => (order.indexOf(a.type) + 1 || 99) - (order.indexOf(b.type) + 1 || 99))
    .filter(e => e.featured || order.includes(e.type))
    .slice(0, n);
}
