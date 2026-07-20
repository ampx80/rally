// ============================================================
// ARDOVO LANDING PAGES  (local-first, Supabase-swappable)
//
// Engine 6 (Marketing Hub unification): a landing page is now designed
// with the SAME block-model designer that powers email. Each page holds
// a `design` document (the email-blocks doc shape: settings + blocks of
// heading / text / button / image / columns / divider / spacer / social)
// edited through src/components/email/VisualEmailBuilder with target
// "landing", and rendered to a full-width responsive page via
// email-blocks.renderDoc(design, { target: 'landing' }).
//
// A page can LINK a real Ardovo form (by formId) so the hosted page
// captures leads through the same forms engine that Forms + funnels use.
// Views are tracked per hosted load (recordView); submissions are logged
// locally (recordSubmission) in addition to the form engine's own contact
// creation. Nothing here needs a backend to feel alive.
//
// This slice is ADDITIVE. It reads no protected store directly; the only
// outward write happens on the hosted page (createLead / submitForm),
// which are themselves additive. Live equivalent: a rally_landing_pages
// table with a JSON `design` column.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { blankLandingDoc, makeBlock } from './email-blocks.js';

const LS_KEY = 'rally_landing_pages_v2';   // v2: design-doc model (was blocks[])

/* ============================================================
   SLUG helpers
   ============================================================ */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'page';
}

// Return a slug unique across all pages (except the page being edited).
export function uniqueSlug(base, exceptId = null) {
  const root = slugify(base);
  const taken = new Set(state.pages.filter(p => p.id !== exceptId).map(p => p.slug));
  if (!taken.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

/* ============================================================
   SEED
   Two illustrative pages so the hub is not empty on first run.
   One published (so /l/:slug demos immediately), one draft. Both
   carry a real design doc built from the shared block vocabulary.
   ============================================================ */
function seedDesignRook() {
  const d = blankLandingDoc();
  d.settings = { ...d.settings, bg: '#0d1117', contentBg: '#ffffff', accent: '#5b4bf5', contentWidth: 960 };
  d.blocks = [
    { ...makeBlock('heading'), text: 'Meet Rook. Your revenue runs itself.', align: 'center' },
    { ...makeBlock('text'), text: 'Rook drafts the follow-ups, keeps the pipeline honest, and never lets a deal go dark. See it work on your data in fifteen minutes.', align: 'center', size: 19 },
    { ...makeBlock('button'), text: 'Book a live look', href: '#form', align: 'center' },
    makeBlock('divider'),
    { ...makeBlock('heading'), text: 'Built AI-native from the first commit', level: 'h2', align: 'left', size: 26 },
    { ...makeBlock('text'), text: 'Every record is alive on first load. Ask Rook and it does the work: enriches the account, writes the next touch, and forecasts the quarter. No plugins, no bolt-ons.', align: 'left', size: 17 },
  ];
  return d;
}

function seedDesignWebinar() {
  const d = blankLandingDoc();
  d.settings = { ...d.settings, bg: '#f4f6fb', contentBg: '#ffffff', accent: '#0ea5a3', contentWidth: 960 };
  d.blocks = [
    { ...makeBlock('heading'), text: 'Close Q4 strong', align: 'center' },
    { ...makeBlock('text'), text: 'A thirty-minute working session on the moves that actually move a number in the last stretch of the quarter.', align: 'center', size: 19 },
    { ...makeBlock('button'), text: 'Save my seat', href: '#form', align: 'center' },
  ];
  return d;
}

function buildSeed() {
  const now = Date.now();
  const DAY = 86400000;
  const iso = (n) => new Date(now + n * DAY).toISOString();
  const pages = [
    {
      id: 'lp_rook_demo',
      slug: 'meet-rook',
      title: 'Meet Rook',
      published: true,
      publishedAt: iso(-4),
      seo: { title: 'Meet Rook, your AI revenue operator', description: 'See how Rook runs your pipeline end to end. Book a live look.' },
      design: seedDesignRook(),
      formId: null,           // linkable in the editor
      ctaLabel: '',
      ctaHref: '',
      views: 0,
      submissions: [],
      createdAt: iso(-6),
      updatedAt: iso(-4),
    },
    {
      id: 'lp_q4_webinar',
      slug: 'q4-pipeline-webinar',
      title: 'Q4 pipeline webinar',
      published: false,
      publishedAt: null,
      seo: { title: 'Close Q4 strong: the pipeline webinar', description: 'A 30-minute working session on finishing the quarter.' },
      design: seedDesignWebinar(),
      formId: null,
      ctaLabel: '',
      ctaHref: '',
      views: 0,
      submissions: [],
      createdAt: iso(-2),
      updatedAt: iso(-2),
    },
  ];
  return { seededAt: new Date(now).toISOString(), pages };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  // SUPABASE: from('rally_landing_pages').select('*')
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

// Defensive normalize so an older/partial persisted blob never crashes a render.
function normalize(s) {
  const pages = Array.isArray(s?.pages) ? s.pages : [];
  return {
    seededAt: s?.seededAt || new Date().toISOString(),
    pages: pages.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title || 'Untitled page',
      published: !!p.published,
      publishedAt: p.publishedAt || null,
      // A design doc is required; fall back to a blank landing doc.
      design: normalizeDesign(p.design),
      formId: p.formId || null,
      ctaLabel: p.ctaLabel || '',
      ctaHref: p.ctaHref || '',
      seo: p.seo && typeof p.seo === 'object' ? p.seo : { title: '', description: '' },
      views: Number.isFinite(p.views) ? p.views : 0,
      submissions: Array.isArray(p.submissions) ? p.submissions : [],
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    })),
  };
}

function normalizeDesign(design) {
  if (design && Array.isArray(design.blocks)) return design;
  return blankLandingDoc();
}

function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function resetLandingPages() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

// Subscribe to the landing-pages slice.
export function useLanding(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `lp_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getLandingPages = () => state.pages;
export const getLandingPage = (id) => state.pages.find(p => p.id === id) || null;
export const getPageBySlug = (slug) => state.pages.find(p => p.slug === slug) || null;
// The public renderer only ever serves a PUBLISHED page.
export const getPublishedPageBySlug = (slug) => state.pages.find(p => p.slug === slug && p.published) || null;

export function landingStats() {
  const ps = state.pages;
  const views = ps.reduce((s, p) => s + (p.views || 0), 0);
  const submissions = ps.reduce((s, p) => s + (p.submissions?.length || 0), 0);
  return {
    total: ps.length,
    published: ps.filter(p => p.published).length,
    drafts: ps.filter(p => !p.published).length,
    linked: ps.filter(p => !!p.formId).length,
    views,
    submissions,
    convRate: views ? Math.round((submissions / views) * 1000) / 10 : 0,
  };
}

/* ============================================================
   WRITE API  (validated writers; return { error, message } or record)
   ============================================================ */

// SUPABASE: from('rally_landing_pages').insert(row).select().single()
export function createPage({ title, slug, design } = {}) {
  const name = String(title || '').trim();
  if (!name) return { error: 'title', message: 'Name your page.' };
  const nowIso = new Date().toISOString();
  const p = {
    id: newId(),
    slug: uniqueSlug(slug || name),
    title: name,
    published: false,
    publishedAt: null,
    seo: { title: name, description: '' },
    design: normalizeDesign(design) || blankLandingDoc(),
    formId: null,
    ctaLabel: '',
    ctaHref: '',
    views: 0,
    submissions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  commit({ ...state, pages: [p, ...state.pages] });
  return { page: p };
}

export function updatePage(id, patch = {}) {
  const p = getLandingPage(id);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const next = { ...p, ...patch };
  // A slug change must stay unique + url-safe.
  if (patch.slug != null && patch.slug !== p.slug) next.slug = uniqueSlug(patch.slug, id);
  if (patch.seo) next.seo = { ...p.seo, ...patch.seo };
  next.updatedAt = new Date().toISOString();
  commit({ ...state, pages: state.pages.map(x => x.id === id ? next : x) });
  return { page: next };
}

// Convenience: replace the page's shared-designer document.
// The shared visual builder writes the SEO description into
// design.settings.seoDescription, but the hosted page (HostedLanding) reads
// page.seo.description. Bridge them here so the one field the builder writes is
// exactly the one the hosted page renders - no divergent SEO copy.
export function setDesign(id, design) {
  const doc = normalizeDesign(design);
  const patch = { design: doc };
  const seoDesc = doc && doc.settings ? doc.settings.seoDescription : undefined;
  if (typeof seoDesc === 'string') patch.seo = { description: seoDesc };
  return updatePage(id, patch);
}

// Convenience: link / unlink a real Ardovo form (forms.js id) to the page.
export function linkForm(id, formId) {
  return updatePage(id, { formId: formId || null });
}

export function deletePage(id) {
  const p = getLandingPage(id);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  commit({ ...state, pages: state.pages.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicatePage(id) {
  const p = getLandingPage(id);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const nowIso = new Date().toISOString();
  const copy = {
    ...p,
    id: newId(),
    slug: uniqueSlug(`${p.slug}-copy`),
    title: `${p.title} (copy)`,
    published: false,
    publishedAt: null,
    views: 0,
    // Deep-copy the design so edits to the copy never touch the original.
    design: JSON.parse(JSON.stringify(p.design || blankLandingDoc())),
    submissions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  commit({ ...state, pages: [copy, ...state.pages] });
  return { page: copy };
}

// Publish / unpublish. Publishing stamps publishedAt (first time only) so the
// public /l/:slug route starts serving it.
export function setPublished(id, published) {
  const p = getLandingPage(id);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  return updatePage(id, {
    published: !!published,
    publishedAt: published ? (p.publishedAt || new Date().toISOString()) : p.publishedAt,
  });
}
export function togglePublished(id) {
  const p = getLandingPage(id);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  return setPublished(id, !p.published);
}

/* ---------- form submission + view tracking ---------- */
// Record a submission captured by a hosted page. Additive: appends to the
// page's submissions log. Hosted page also creates a real lead/contact.
export function recordSubmission(pageId, data = {}) {
  const p = getLandingPage(pageId);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const entry = { id: `s_${Date.now().toString(36)}`, data: { ...data }, at: new Date().toISOString() };
  const submissions = [entry, ...(p.submissions || [])].slice(0, 500);
  commit({ ...state, pages: state.pages.map(x => x.id === pageId ? { ...x, submissions } : x) });
  return { submission: entry };
}

// Increment a page's view counter (called once per hosted page load). Kept out
// of updatePage so a view never bumps updatedAt or re-orders the list.
export function recordView(pageId) {
  const p = getLandingPage(pageId);
  if (!p) return { ok: false };
  commit({ ...state, pages: state.pages.map(x => x.id === pageId ? { ...x, views: (x.views || 0) + 1 } : x) });
  return { ok: true };
}
