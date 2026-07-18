// ============================================================
// ARDOVO DOCS STORE  (the generation suite - proposal / document builder)
// A PandaDoc-killer that is native, CRM-truth-bound, and versioned.
// A doc is an ordered list of blocks; each block carries a small
// config object. Pricing-table blocks bind LIVE to a deal's line
// items (store-depth) or a quote's lines (store-quote) so the money
// on the page is always the money in the CRM. Same local-first,
// deterministic-seed, pub/sub pattern as the rest of the store.
// SUPABASE: rally_docs (doc rows) + rally_doc_blocks (FK docId, order).
// ============================================================
import { useSyncExternalStore } from 'react';
import { getDeal, getCompany, getContactsForCompany, userName, getCurrentUser } from './store.js';
import { getDealExtras, lineItemTotal } from './store-depth.js';
import { getQuoteLines, lineQuoteTotal } from './store-quote.js';

const LS_KEY = 'rally_docs_v1';

let idc = Date.now();
const nid = (p) => `${p}_${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

/* ============================================================
   BLOCK CATALOG  (palette metadata + default config factory)
   ============================================================ */
export const BLOCK_TYPES = [
  { type: 'cover', label: 'Cover', icon: 'layers', blurb: 'Gradient title page' },
  { type: 'heading', label: 'Heading', icon: 'fileText', blurb: 'Section title' },
  { type: 'text', label: 'Text', icon: 'list', blurb: 'Rich paragraph' },
  { type: 'pricingTable', label: 'Pricing', icon: 'dollar', blurb: 'Live deal line items' },
  { type: 'team', label: 'Team', icon: 'users', blurb: 'Account team bios' },
  { type: 'testimonial', label: 'Testimonial', icon: 'sparkles', blurb: 'Customer quote' },
  { type: 'image', label: 'Image', icon: 'grid', blurb: 'Hero or figure' },
  { type: 'divider', label: 'Divider', icon: 'menu', blurb: 'Section break' },
  { type: 'signature', label: 'Signature', icon: 'edit', blurb: 'E-sign / accept block' },
  { type: 'cta', label: 'Call to action', icon: 'zap', blurb: 'Accept + next step' },
];
export const blockMeta = (type) => BLOCK_TYPES.find(b => b.type === type) || { type, label: type, icon: 'list' };

/* Resolve the account team from a deal: owner + up to 2 mapped stakeholders. */
function teamFromDeal(deal) {
  const members = [];
  if (deal) {
    const owner = userName(deal.ownerId);
    members.push({ name: owner, title: 'Account Executive', blurb: 'Your primary point of contact through close and onboarding.' });
    const ex = getDealExtras(deal.id);
    const co = getCompany(deal.companyId);
    const contacts = co ? getContactsForCompany(co.id) : [];
    for (const s of (ex.stakeholders || []).slice(0, 2)) {
      const c = contacts.find(x => x.id === s.contactId);
      if (c) members.push({ name: `${c.firstName} ${c.lastName}`, title: c.title || s.role, blurb: `${s.role} on the account.` });
    }
  }
  if (!members.length) {
    members.push({ name: getCurrentUser()?.name || 'Your team', title: 'Account Executive', blurb: 'Here to help you win.' });
  }
  return members;
}

/* Default config for a freshly added block, pre-filled from the doc's deal. */
export function defaultBlockConfig(type, ctx = {}) {
  const { deal, company } = ctx;
  const coName = company?.name || deal?.name?.split(' - ')[0] || 'Your Company';
  switch (type) {
    case 'cover':
      return {
        eyebrow: 'Proposal',
        title: deal ? `A partnership with ${coName}` : 'Proposal',
        subtitle: 'Prepared to move your revenue team forward with Ardovo.',
        preparedFor: coName,
        preparedBy: deal ? userName(deal.ownerId) : (getCurrentUser()?.name || 'Ardovo'),
      };
    case 'heading':
      return { text: 'Section heading', align: 'left' };
    case 'text':
      return { text: 'Write your narrative here. Speak to the outcome the customer wants, the plan to get there, and why now. Keep it tight and specific.' };
    case 'pricingTable':
      return { title: 'Investment', source: deal ? 'deal' : 'manual', dealId: deal?.id || null, quoteId: null, note: 'Billed annually. Pricing valid for 30 days.', lines: deal ? [] : [{ id: nid('dl'), name: 'Ardovo CRM', qty: 25, unitPrice: 1080 }] };
    case 'team':
      return { title: 'Your account team', members: teamFromDeal(deal) };
    case 'testimonial':
      return { quote: 'Ardovo paid for itself in the first quarter. Our reps finally trust the pipeline number.', author: 'VP of Revenue', role: 'Head of Revenue', company: 'A Ardovo customer' };
    case 'image':
      return { url: '', caption: '', height: 260 };
    case 'divider':
      return {};
    case 'signature':
      return { partyLabel: 'Authorized signature', name: '', title: '', dateLabel: 'Date' };
    case 'cta':
      return { headline: 'Ready to get started?', sub: 'Accept this proposal to lock in pricing and kick off onboarding this week.', buttonText: 'Accept proposal' };
    default:
      return {};
  }
}

/* ============================================================
   TEMPLATES  (block sequences for "New from template")
   ============================================================ */
export const TEMPLATES = [
  { key: 'blank', name: 'Blank', icon: 'plus', blurb: 'Start from an empty canvas', accent: '#5b4bf5' },
  { key: 'proposal', name: 'Sales proposal', icon: 'layers', blurb: 'Cover, story, pricing, team, sign', accent: '#5b4bf5' },
  { key: 'onepager', name: 'One-pager', icon: 'fileText', blurb: 'A tight single-scroll pitch', accent: '#0ea5a3' },
  { key: 'qbr', name: 'QBR', icon: 'chart', blurb: 'Quarterly business review', accent: '#8b3fd4' },
];

function templateBlocks(key, ctx) {
  const mk = (type) => ({ id: nid('blk'), type, config: defaultBlockConfig(type, ctx) });
  switch (key) {
    case 'proposal':
      return ['cover', 'heading', 'text', 'pricingTable', 'team', 'testimonial', 'signature', 'cta'].map(mk);
    case 'onepager': {
      const blocks = ['cover', 'text', 'pricingTable', 'cta'].map(mk);
      blocks[0].config = { ...blocks[0].config, eyebrow: 'One-pager' };
      blocks[1].config = { ...blocks[1].config, text: 'The problem, the plan, the payoff - in one scroll. Lead with the outcome your buyer cares about, then show the shortest path to it.' };
      return blocks;
    }
    case 'qbr': {
      const blocks = ['cover', 'heading', 'text', 'pricingTable', 'signature'].map(mk);
      blocks[0].config = { ...blocks[0].config, eyebrow: 'Quarterly business review', title: `${ctx.company?.name || 'Account'} - Quarterly Business Review`, subtitle: 'Results this quarter, health, and the plan for next.' };
      blocks[1].config = { ...blocks[1].config, text: 'This quarter at a glance' };
      blocks[2].config = { ...blocks[2].config, text: 'Adoption is up and the team is realizing value. Here is what we shipped together, where we are, and the roadmap for the next 90 days.' };
      blocks[3].config = { ...blocks[3].config, title: 'Expansion for next quarter' };
      return blocks;
    }
    case 'blank':
    default:
      return [mk('cover')];
  }
}

/* ============================================================
   SEED  (a couple of believable proposals so the gallery is alive)
   ============================================================ */
function buildSeed() {
  const docs = [];
  const flagship = getDeal('d_flagship');
  const flagCo = flagship ? getCompany(flagship.companyId) : null;
  const ctx = { deal: flagship, company: flagCo };

  // 1) A full sales proposal bound to the flagship deal (live pricing).
  const p1 = templateBlocks('proposal', ctx);
  docs.push({
    id: 'doc_seed_1',
    name: `${flagCo?.name || 'Vertex Robotics'} - Platform Proposal`,
    dealId: flagship?.id || null,
    accent: '#5b4bf5',
    blocks: p1,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });

  // 2) A crisp one-pager, teal accent, not deal-bound.
  const p2 = templateBlocks('onepager', { deal: null, company: null });
  docs.push({
    id: 'doc_seed_2',
    name: 'Ardovo - Executive One-Pager',
    dealId: null,
    accent: '#0ea5a3',
    blocks: p2,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });

  return { seededAt: nowISO(), docs };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetDocs() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useDocs() { return useSyncExternalStore(subscribe, () => state, () => state); }

/* ============================================================
   READ API
   ============================================================ */
export const getDocs = () => state.docs;
export const getDoc = (id) => state.docs.find(d => d.id === id);

/* Resolve a pricing-table block to concrete display lines + total, pulling LIVE
   from the CRM when bound to a deal or quote. Returns { lines, total, source }.
   Kept here so the canvas and the print render share one source of truth. */
export function resolvePricing(config = {}) {
  const src = config.source || (config.dealId ? 'deal' : config.quoteId ? 'quote' : 'manual');
  if (src === 'deal' && config.dealId) {
    const items = getDealExtras(config.dealId).lineItems || [];
    const lines = items.map(li => ({ id: li.id, name: li.name, qty: li.qty, unitPrice: li.unitPrice, term: li.term, discount: li.discount, total: lineItemTotal(li) }));
    return { source: 'deal', lines, total: lines.reduce((s, l) => s + l.total, 0) };
  }
  if (src === 'quote' && config.quoteId) {
    const items = getQuoteLines(config.quoteId) || [];
    const lines = items.map(li => ({ id: li.id, name: li.name, qty: li.qty, unitPrice: li.unitPrice, discount: li.discount, total: lineQuoteTotal(li) }));
    return { source: 'quote', lines, total: lines.reduce((s, l) => s + l.total, 0) };
  }
  const manual = (config.lines || []).map(l => ({ ...l, total: Math.round((Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discount) || 0) / 100)) }));
  return { source: 'manual', lines: manual, total: manual.reduce((s, l) => s + l.total, 0) };
}

/* ============================================================
   WRITE API
   ============================================================ */
export function createDoc({ name, dealId = null, template = 'blank', accent } = {}) {
  const deal = dealId ? getDeal(dealId) : null;
  const company = deal ? getCompany(deal.companyId) : null;
  const tpl = TEMPLATES.find(t => t.key === template) || TEMPLATES[0];
  const doc = {
    id: nid('doc'),
    name: name || (company ? `${company.name} - Proposal` : `${tpl.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
    dealId,
    accent: accent || tpl.accent || '#5b4bf5',
    blocks: templateBlocks(template, { deal, company }),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  commit({ ...state, docs: [doc, ...state.docs] });
  return { doc };
}

function patchDoc(id, mut) {
  const docs = state.docs.map(d => {
    if (d.id !== id) return d;
    const next = { ...d, blocks: [...d.blocks] };
    mut(next);
    next.updatedAt = nowISO();
    return next;
  });
  commit({ ...state, docs });
}

export function updateDoc(id, patch = {}) {
  patchDoc(id, (d) => { Object.assign(d, patch); });
  return { ok: true };
}

export function deleteDoc(id) {
  commit({ ...state, docs: state.docs.filter(d => d.id !== id) });
  return { ok: true };
}

export function addBlock(docId, type, atIndex) {
  const doc = getDoc(docId);
  const deal = doc?.dealId ? getDeal(doc.dealId) : null;
  const company = deal ? getCompany(deal.companyId) : null;
  const block = { id: nid('blk'), type, config: defaultBlockConfig(type, { deal, company }) };
  patchDoc(docId, (d) => {
    const idx = (atIndex == null || atIndex < 0 || atIndex > d.blocks.length) ? d.blocks.length : atIndex;
    d.blocks.splice(idx, 0, block);
  });
  return { block };
}

export function updateBlock(docId, blockId, patch = {}) {
  patchDoc(docId, (d) => {
    d.blocks = d.blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, ...patch } } : b);
  });
  return { ok: true };
}

export function removeBlock(docId, blockId) {
  patchDoc(docId, (d) => { d.blocks = d.blocks.filter(b => b.id !== blockId); });
  return { ok: true };
}

export function reorderBlock(docId, blockId, targetIndex) {
  patchDoc(docId, (d) => {
    const from = d.blocks.findIndex(b => b.id === blockId);
    if (from < 0) return;
    const [moved] = d.blocks.splice(from, 1);
    const idx = Math.max(0, Math.min(d.blocks.length, targetIndex));
    d.blocks.splice(idx, 0, moved);
  });
  return { ok: true };
}

/* Rebind (or unbind) a doc's pricing tables to a deal - used when the
   "Link to deal" dropdown changes so the money follows the CRM. */
export function linkDocToDeal(docId, dealId) {
  patchDoc(docId, (d) => {
    d.dealId = dealId || null;
    d.blocks = d.blocks.map(b => {
      if (b.type !== 'pricingTable') return b;
      return { ...b, config: { ...b.config, source: dealId ? 'deal' : 'manual', dealId: dealId || null } };
    });
  });
  return { ok: true };
}
