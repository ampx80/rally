// ============================================================
// RALLY LANDING PAGES  (local-first, Supabase-swappable)
// The "CMS-lite" layer of Rally's Marketing hub: a block-based
// landing-page builder. A page is an ordered list of blocks
// (hero / text / image / form / cta), a slug, a published flag,
// and any captured form submissions. Same pub/sub, localStorage-
// backed pattern as store.js / marketing-campaigns.js so nothing
// here needs a backend to feel alive.
//
// This slice is ADDITIVE. It does not touch any existing store; a
// form submission optionally creates a CRM lead via store-ext's
// createLead(), which is the only outward write and is itself
// additive. Live equivalent would be a rally_landing_pages table.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_landing_pages_v1';   // bump to force a clean reseed

/* ============================================================
   BLOCK TYPES  (the CMS-lite palette)
   Each block is { id, type, ...fields }. `type` is one of these.
   The builder advertises exactly this palette; the renderer maps
   1:1. Keep field shapes stable.
   ============================================================ */
export const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero', icon: 'zap', hint: 'Headline, sub, and a primary call to action' },
  { type: 'text', label: 'Text', icon: 'fileText', hint: 'A heading and a paragraph of copy' },
  { type: 'image', label: 'Image', icon: 'eye', hint: 'A hosted image with a caption' },
  { type: 'form', label: 'Lead form', icon: 'inbox', hint: 'Capture a visitor as a CRM lead' },
  { type: 'cta', label: 'Call to action', icon: 'megaphone', hint: 'A conversion band with a button' },
];

export function blockLabel(type) {
  return (BLOCK_TYPES.find(b => b.type === type) || {}).label || type;
}

// Default field set for a freshly-added block of each type. Copy is intentional
// placeholder starter content the author replaces; nothing here fabricates a
// real number or metric.
export function newBlock(type) {
  const id = newBlockId();
  switch (type) {
    case 'hero':
      return {
        id, type: 'hero',
        eyebrow: 'New launch',
        headline: 'A headline that earns the click',
        sub: 'One clear sentence on the promise. Say what changes for the visitor when they act.',
        ctaLabel: 'Get started',
        ctaHref: '/app',
        align: 'center',
      };
    case 'text':
      return {
        id, type: 'text',
        heading: 'Why it matters',
        body: 'Two or three sentences of supporting copy. Keep it concrete and specific to the offer on this page.',
        align: 'left',
      };
    case 'image':
      return { id, type: 'image', url: '', alt: '', caption: '' };
    case 'form':
      return {
        id, type: 'form',
        heading: 'Get the details',
        sub: 'Tell us where to send it and we will be in touch.',
        submitLabel: 'Send it to me',
        successMessage: 'Thanks. Check your inbox shortly.',
        source: 'Landing page',
        fields: [
          { key: 'firstName', label: 'First name', type: 'text', required: true },
          { key: 'email', label: 'Work email', type: 'email', required: true },
          { key: 'company', label: 'Company', type: 'text', required: false },
        ],
      };
    case 'cta':
      return {
        id, type: 'cta',
        headline: 'Ready when you are',
        sub: 'Start free. No card required.',
        buttonLabel: 'Get started',
        buttonHref: '/app',
        style: 'band',
      };
    default:
      return { id, type: 'text', heading: '', body: '', align: 'left' };
  }
}

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
   One published (so /l/:slug demos immediately), one draft.
   ============================================================ */
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
      accent: '#5b4bf5',
      views: 0,
      blocks: [
        {
          id: 'b_hero_1', type: 'hero',
          eyebrow: 'AI revenue operator',
          headline: 'Meet Rook. Your revenue runs itself.',
          sub: 'Rook drafts the follow-ups, keeps the pipeline honest, and never lets a deal go dark. See it work on your data in fifteen minutes.',
          ctaLabel: 'Book a live look',
          ctaHref: '#form',
          align: 'center',
        },
        {
          id: 'b_text_1', type: 'text',
          heading: 'Built AI-native from the first commit',
          body: 'Every record is alive on first load. Ask Rook and it does the work: enriches the account, writes the next touch, and forecasts the quarter. No plugins, no bolt-ons.',
          align: 'left',
        },
        {
          id: 'b_form_1', type: 'form',
          heading: 'See Rook on your pipeline',
          sub: 'Tell us where to send the invite and we will set up a live walkthrough.',
          submitLabel: 'Request my walkthrough',
          successMessage: 'Thanks. A member of the team will reach out to schedule your walkthrough.',
          source: 'Landing: Meet Rook',
          fields: [
            { key: 'firstName', label: 'First name', type: 'text', required: true },
            { key: 'email', label: 'Work email', type: 'email', required: true },
            { key: 'company', label: 'Company', type: 'text', required: false },
          ],
        },
        {
          id: 'b_cta_1', type: 'cta',
          headline: 'Run your revenue on Rally',
          sub: 'Start free. Everything alive on first load.',
          buttonLabel: 'Get started',
          buttonHref: '/app',
          style: 'band',
        },
      ],
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
      accent: '#5b4bf5',
      views: 0,
      blocks: [
        {
          id: 'b_hero_2', type: 'hero',
          eyebrow: 'Live webinar',
          headline: 'Close Q4 strong',
          sub: 'A thirty-minute working session on the moves that actually move a number in the last stretch of the quarter.',
          ctaLabel: 'Save my seat',
          ctaHref: '#form',
          align: 'center',
        },
        {
          id: 'b_form_2', type: 'form',
          heading: 'Save your seat',
          sub: 'We will send the calendar invite and the replay link.',
          submitLabel: 'Save my seat',
          successMessage: 'You are on the list. Watch your inbox for the invite.',
          source: 'Landing: Q4 webinar',
          fields: [
            { key: 'firstName', label: 'First name', type: 'text', required: true },
            { key: 'email', label: 'Work email', type: 'email', required: true },
          ],
        },
      ],
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
      ...p,
      blocks: Array.isArray(p.blocks) ? p.blocks : [],
      submissions: Array.isArray(p.submissions) ? p.submissions : [],
      views: Number.isFinite(p.views) ? p.views : 0,
      seo: p.seo && typeof p.seo === 'object' ? p.seo : { title: '', description: '' },
      published: !!p.published,
    })),
  };
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
let bidc = Date.now() + 1;
function newBlockId() { return `b_${(bidc++).toString(36)}`; }

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
  return {
    total: ps.length,
    published: ps.filter(p => p.published).length,
    drafts: ps.filter(p => !p.published).length,
    views: ps.reduce((s, p) => s + (p.views || 0), 0),
    submissions: ps.reduce((s, p) => s + (p.submissions?.length || 0), 0),
  };
}

/* ============================================================
   WRITE API  (validated writers; return { error, message } or record)
   ============================================================ */

// SUPABASE: from('rally_landing_pages').insert(row).select().single()
export function createPage({ title, slug } = {}) {
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
    accent: '#5b4bf5',
    views: 0,
    blocks: [newBlock('hero'), newBlock('form')],
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
    // Fresh block ids so edits to the copy never touch the original.
    blocks: (p.blocks || []).map(b => ({ ...b, id: newBlockId() })),
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

/* ---------- block writers ---------- */
export function addBlock(pageId, type, atIndex = null) {
  const p = getLandingPage(pageId);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const block = newBlock(type);
  const blocks = [...(p.blocks || [])];
  if (atIndex == null || atIndex < 0 || atIndex > blocks.length) blocks.push(block);
  else blocks.splice(atIndex, 0, block);
  return updatePage(pageId, { blocks });
}

export function updateBlock(pageId, blockId, patch = {}) {
  const p = getLandingPage(pageId);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const blocks = (p.blocks || []).map(b => b.id === blockId ? { ...b, ...patch } : b);
  return updatePage(pageId, { blocks });
}

export function removeBlock(pageId, blockId) {
  const p = getLandingPage(pageId);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const blocks = (p.blocks || []).filter(b => b.id !== blockId);
  return updatePage(pageId, { blocks });
}

// Move a block up (-1) or down (+1) in the stack.
export function moveBlock(pageId, blockId, dir) {
  const p = getLandingPage(pageId);
  if (!p) return { error: 'missing', message: 'Page not found.' };
  const blocks = [...(p.blocks || [])];
  const i = blocks.findIndex(b => b.id === blockId);
  if (i < 0) return { error: 'missing', message: 'Block not found.' };
  const j = i + (dir < 0 ? -1 : 1);
  if (j < 0 || j >= blocks.length) return { page: p };
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return updatePage(pageId, { blocks });
}

/* ---------- form submission ---------- */
// Record a submission captured by a hosted form. Additive: appends to the
// page's submissions log. The hosted page also creates a CRM lead separately.
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
