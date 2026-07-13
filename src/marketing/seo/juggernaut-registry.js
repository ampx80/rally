// ============================================================
// JUGGERNAUT REGISTRY  (isolated best-in-class SEO track)
// Aggregates every juggernaut ENTRY file under ./juggernauts into one
// deduped, slug-indexed set. This is a SEPARATE track from the ~1977
// thin /pages entries: juggernaut pages live at /guides/:slug and are
// large, interactive, deeply-researched surfaces.
//
// HOW PAGE-BUILDER AGENTS REGISTER A NEW GUIDE
// 1. Drop a file in src/marketing/seo/juggernauts/<slug>.js that
//    default-exports EITHER one entry object OR an array of entries
//    (see the block contract in juggernaut-render usage + the seed
//    file crm-for-startups.js for a full worked example).
// 2. Add one import + array push in the JUGGERNAUT_MODULES list below.
//    Keep it additive: append a line, never reorder or remove.
// That is the whole registration. The prerender and the /guides/:slug
// React route both read from here, so one edit lights the page up in
// the static build, the sitemap, llms.txt, and the live SPA.
//
// Import resilience: each module is wrapped so a single malformed or
// missing entry file cannot break the whole build. A bad module is
// skipped with a console.warn and every other guide still ships.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================

// --- registered guide modules (append new lines here) ------------------
import crmForStartups from './juggernauts/crm-for-startups.js';
import hubspotAlternative from './juggernauts/hubspot-alternative.js';
import crmRoiCalculator from './juggernauts/crm-roi-calculator.js';
import bestAiCrm from './juggernauts/best-ai-crm.js';

const JUGGERNAUT_MODULES = [
  crmForStartups,
  hubspotAlternative,
  crmRoiCalculator,
  bestAiCrm,
  // e.g. import aiSalesForecasting from './juggernauts/ai-sales-forecasting.js';
  //      then add: aiSalesForecasting,
];
// -----------------------------------------------------------------------

const REQUIRED_FIELDS = ['slug', 'title', 'blocks'];

function isValidEntry(e) {
  if (!e || typeof e !== 'object') return false;
  for (const f of REQUIRED_FIELDS) {
    if (f === 'blocks') { if (!Array.isArray(e.blocks)) return false; }
    else if (!e[f]) return false;
  }
  return true;
}

function collect() {
  const out = [];
  const seen = new Set();
  for (const mod of JUGGERNAUT_MODULES) {
    let entries;
    try {
      entries = Array.isArray(mod) ? mod : [mod];
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('juggernaut-registry: skipped a module,', err && err.message);
      continue;
    }
    for (const raw of entries) {
      if (!isValidEntry(raw)) {
        if (typeof console !== 'undefined') console.warn('juggernaut-registry: skipped invalid entry', raw && raw.slug);
        continue;
      }
      if (seen.has(raw.slug)) {
        if (typeof console !== 'undefined') console.warn('juggernaut-registry: duplicate slug ignored:', raw.slug);
        continue;
      }
      seen.add(raw.slug);
      out.push(normalize(raw));
    }
  }
  return out;
}

function normalize(raw) {
  return {
    category: 'Guides',
    updated: raw.updated || raw.published || '2026-07-13',
    published: raw.published || raw.updated || '2026-07-13',
    author: raw.author || 'Rally',
    toc: raw.toc !== false,
    ...raw,
  };
}

export const JUGGERNAUTS = collect();
export const bySlug = new Map(JUGGERNAUTS.map((e) => [e.slug, e]));
export const getJuggernaut = (slug) => bySlug.get(slug) || null;
export const juggernautSlugs = () => JUGGERNAUTS.map((e) => e.slug);

/* Lightweight list for sitemap / llms.txt / hub cards. */
export const juggernautSitemapList = () => JUGGERNAUTS.map((e) => ({
  slug: e.slug,
  title: e.title,
  updated: e.updated,
  summary: typeof e.intro === 'string' ? e.intro : Array.isArray(e.intro) ? e.intro[0] : (e.metaDescription || ''),
}));

export default JUGGERNAUTS;
