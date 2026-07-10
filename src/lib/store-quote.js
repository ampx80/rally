// ============================================================
// RALLY QUOTE STORE  (quote-to-cash depth layer)
// Layers rich quote line items + pricing math + a status flow on
// top of the platform quotes that live in store-ext.js. Same
// local-first, deterministic-seed, pub/sub pattern as the rest of
// the store. The quote RECORD (number, company, owner, status,
// expiresAt, amount) stays in store-ext (rally_ext_v1); the line
// items, terms/notes/shipping, and status timeline live here
// (rally_quote_v1), keyed by quote id. Every existing quote is
// seeded with 2-4 believable line items so it opens alive.
// SUPABASE: rally_quote_lines, rally_quote_events (FK quoteId).
// ============================================================
import { useSyncExternalStore } from 'react';
import { getQuotes, getProducts, createQuote, updateQuote } from './store-ext.js';
import { getCompany, getDeal, getCurrentUser, userName } from './store.js';
import { getDealExtras } from './store-depth.js';
import { logChange } from './audit.js';

const LS_KEY = 'rally_quote_v1';

/* ---------- deterministic PRNG (seeded per-quote for stable lines) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------- status model (draft -> sent -> accepted, + expired) ---------- */
export const QUOTE_FLOW = ['draft', 'sent', 'accepted'];
export const QUOTE_STATUS_META = {
  draft: { label: 'Draft', tone: 'default', blurb: 'Building the quote' },
  sent: { label: 'Sent', tone: 'info', blurb: 'Delivered to the customer' },
  accepted: { label: 'Accepted', tone: 'ok', blurb: 'Signed and won' },
  expired: { label: 'Expired', tone: 'risk', blurb: 'Validity window passed' },
};

export const DEFAULT_TERMS =
  'This quote is valid until the expiration date shown above. Prices are in USD and exclude applicable taxes unless itemized. Payment terms are net 30 from acceptance. Billed annually unless noted.';

/* ============================================================
   SEED  (line items + timeline for every existing quote)
   ============================================================ */
function pickDisc(rnd) { return rnd() < 0.42 ? [5, 10, 10, 15, 20][Math.floor(rnd() * 5)] : 0; }
function pickTax(rnd) { return rnd() < 0.5 ? 0 : [7.25, 8, 8.5][Math.floor(rnd() * 3)]; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function sampleN(arr, n, rnd) {
  const copy = [...arr], out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

let idc = Date.now();
const nid = (p) => `${p}_${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

function mkLine(product, qty, unitPrice, discount, tax) {
  return {
    id: nid('ql'),
    productId: product ? product.id : null,
    name: product ? product.name : 'Custom line',
    description: product ? `${product.category} - ${product.billing}` : '',
    qty: Number(qty) || 1,
    unitPrice: Number(unitPrice) || 0,
    discount: Number(discount) || 0,
    tax: Number(tax) || 0,
  };
}

function seedLines(q, products, rnd) {
  if (!products.length) return [mkLine(null, 25, 1200, 0, 0)];
  const platform = products.find(p => p.category === 'Platform') || products[0];
  const seats = Math.max(5, q.seats || (15 + Math.floor(rnd() * 120)));
  const anchorUnit = clamp(Math.round((q.amount || seats * 1200) / seats), 240, 3200);
  const lines = [mkLine(platform, seats, anchorUnit, pickDisc(rnd), 0)];
  const pool = products.filter(p => p.id !== platform.id);
  const nAdd = 1 + Math.floor(rnd() * 3); // 1-3 add-ons -> 2-4 total
  for (const p of sampleN(pool, nAdd, rnd)) {
    const seat = /seat/.test(p.billing);
    const qty = seat ? Math.max(1, Math.round(seats * (0.2 + rnd() * 0.5)))
      : (p.billing === 'one-time' ? 1 : 1 + Math.floor(rnd() * 3));
    lines.push(mkLine(p, qty, p.price, pickDisc(rnd), pickTax(rnd)));
  }
  return lines;
}

function seedTimeline(q) {
  const who = userName(q.ownerId);
  const tl = [{ id: nid('qe'), at: q.createdAt || nowISO(), status: 'draft', who, note: 'Quote created' }];
  if (q.status === 'sent' || q.status === 'accepted' || q.status === 'expired') {
    tl.unshift({ id: nid('qe'), at: q.createdAt || nowISO(), status: 'sent', who, note: 'Sent to customer' });
  }
  if (q.status === 'accepted') {
    tl.unshift({ id: nid('qe'), at: nowISO(), status: 'accepted', who: q.companyName || 'Customer', note: 'Accepted by customer' });
  }
  if (q.status === 'expired') {
    tl.unshift({ id: nid('qe'), at: nowISO(), status: 'expired', who: 'system', note: 'Validity window lapsed' });
  }
  return tl;
}

function buildSeed() {
  const products = getProducts();
  const quotes = getQuotes();
  const extras = {};
  for (const q of quotes) {
    const rnd = mulberry32(hashSeed(q.id));
    extras[q.id] = {
      lineItems: seedLines(q, products, rnd),
      terms: DEFAULT_TERMS,
      notes: q.status === 'sent' ? 'Reviewed with the buying committee. Awaiting signature.' : '',
      shipping: 0,
      timeline: seedTimeline(q),
    };
  }
  return { seededAt: nowISO(), extras };
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
export function resetQuoteStore() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function subscribeQuoteStore(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useQuoteStore() { return useSyncExternalStore(subscribeQuoteStore, () => state, () => state); }

const who = () => getCurrentUser()?.name || 'You';

/* ============================================================
   READ API
   ============================================================ */
export const quoteById = (id) => getQuotes().find(q => q.id === id);
export function getQuoteExtras(quoteId) {
  if (!state.extras[quoteId]) {
    state.extras = { ...state.extras, [quoteId]: { lineItems: [], terms: DEFAULT_TERMS, notes: '', shipping: 0, timeline: [] } };
  }
  return state.extras[quoteId];
}
export const getQuoteLines = (quoteId) => getQuoteExtras(quoteId).lineItems || [];
export const getQuoteTimeline = (quoteId) => getQuoteExtras(quoteId).timeline || [];

/* pure line math: gross - lineDiscount + lineTax */
export function lineQuoteTotal(li) {
  const gross = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
  const net = gross - gross * ((Number(li.discount) || 0) / 100);
  const tax = net * ((Number(li.tax) || 0) / 100);
  return net + tax;
}

// SUPABASE: computed server-side or via a view over rally_quote_lines.
export function quoteTotals(quoteId) {
  const lines = getQuoteLines(quoteId);
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  for (const li of lines) {
    const gross = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
    const disc = gross * ((Number(li.discount) || 0) / 100);
    const net = gross - disc;
    subtotal += gross;
    discountTotal += disc;
    taxTotal += net * ((Number(li.tax) || 0) / 100);
  }
  const shipping = Number(getQuoteExtras(quoteId).shipping) || 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shipping;
  return { subtotal, discountTotal, taxTotal, shipping, grandTotal };
}

/* ============================================================
   WRITE API  (line items)
   ============================================================ */
function patchExtras(quoteId, mut) {
  const ex = { ...getQuoteExtras(quoteId) };
  mut(ex);
  commit({ ...state, extras: { ...state.extras, [quoteId]: ex } });
}

// SUPABASE: rally_quote_lines.insert(row)
export function addQuoteLine(quoteId, line = {}) {
  const item = {
    id: nid('ql'),
    productId: line.productId || null,
    name: line.name || 'Custom line',
    description: line.description || '',
    qty: Number(line.qty) || 1,
    unitPrice: Number(line.unitPrice) || 0,
    discount: Number(line.discount) || 0,
    tax: Number(line.tax) || 0,
  };
  patchExtras(quoteId, ex => { ex.lineItems = [...(ex.lineItems || []), item]; });
  return { line: item };
}

/* Add a catalog product as a line (from getProducts). */
export function addQuoteProduct(quoteId, productId) {
  const p = getProducts().find(x => x.id === productId);
  if (!p) return { error: 'product', message: 'Unknown product.' };
  return addQuoteLine(quoteId, {
    productId: p.id, name: p.name, description: `${p.category} - ${p.billing}`,
    qty: 1, unitPrice: p.price, discount: 0, tax: 0,
  });
}

// SUPABASE: rally_quote_lines.update(patch).eq('id', lineId)
export function updateQuoteLine(quoteId, lineId, patch = {}) {
  patchExtras(quoteId, ex => {
    ex.lineItems = (ex.lineItems || []).map(li => {
      if (li.id !== lineId) return li;
      const next = { ...li, ...patch };
      if (patch.qty != null) next.qty = Math.max(0, Number(patch.qty) || 0);
      if (patch.unitPrice != null) next.unitPrice = Math.max(0, Number(patch.unitPrice) || 0);
      if (patch.discount != null) next.discount = clamp(Number(patch.discount) || 0, 0, 100);
      if (patch.tax != null) next.tax = clamp(Number(patch.tax) || 0, 0, 100);
      return next;
    });
  });
  return { ok: true };
}

export function removeQuoteLine(quoteId, lineId) {
  patchExtras(quoteId, ex => { ex.lineItems = (ex.lineItems || []).filter(li => li.id !== lineId); });
  return { ok: true };
}

/* Move a line to targetIndex (drag reorder). */
export function reorderQuoteLine(quoteId, lineId, targetIndex) {
  patchExtras(quoteId, ex => {
    const arr = [...(ex.lineItems || [])];
    const from = arr.findIndex(li => li.id === lineId);
    if (from < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(clamp(targetIndex, 0, arr.length), 0, moved);
    ex.lineItems = arr;
  });
  return { ok: true };
}

/* ============================================================
   WRITE API  (meta + status)
   ============================================================ */
export function setQuoteMeta(quoteId, patch = {}) {
  const { terms, notes, shipping, expiresAt } = patch;
  if (expiresAt !== undefined) updateQuote(quoteId, { expiresAt }); // lives on the store-ext record
  patchExtras(quoteId, ex => {
    if (terms !== undefined) ex.terms = terms;
    if (notes !== undefined) ex.notes = notes;
    if (shipping !== undefined) ex.shipping = Math.max(0, Number(shipping) || 0);
  });
  return { ok: true };
}

// SUPABASE: rally_quotes.update({status}) + rally_quote_events.insert(event) + audit row.
export function setQuoteStatus(quoteId, status) {
  const q = quoteById(quoteId);
  if (!q) return { error: 'missing', message: 'Quote not found.' };
  const from = q.status;
  updateQuote(quoteId, { status });
  if (from !== status) logChange('quote', quoteId, 'status', from, status, who());
  patchExtras(quoteId, ex => {
    ex.timeline = [{ id: nid('qe'), at: nowISO(), status, who: who(), note: `Marked ${QUOTE_STATUS_META[status]?.label || status}` }, ...(ex.timeline || [])];
  });
  return { ok: true, status };
}

/* ============================================================
   CREATE  (from a deal, or blank against an account)
   ============================================================ */
// SUPABASE: rally_quotes.insert + bulk rally_quote_lines.insert (sync from deal lines).
export function createQuoteFromDeal(dealId) {
  const deal = getDeal(dealId);
  if (!deal) return { error: 'deal', message: 'Pick a deal to quote from.' };
  const co = getCompany(deal.companyId);
  const dealLines = (getDealExtras(dealId).lineItems || []);
  const products = getProducts();
  let lineItems = dealLines.map(dl => ({
    id: nid('ql'),
    productId: dl.productId || null,
    name: dl.name || 'Line item',
    description: '',
    qty: Number(dl.qty) || 1,
    unitPrice: Math.round((Number(dl.unitPrice) || 0) * (Number(dl.term) || 1)),
    discount: Number(dl.discount) || 0,
    tax: 0,
  }));
  if (!lineItems.length) {
    const rnd = mulberry32(hashSeed(dealId + ':new'));
    lineItems = seedLines({ seats: Math.round((deal.value || 60000) / 1200), amount: deal.value }, products, rnd);
  }
  const amount = lineItems.reduce((s, li) => s + lineQuoteTotal(li), 0);
  const res = createQuote({ companyId: deal.companyId, dealId, ownerId: deal.ownerId, amount: Math.round(amount), seats: deal.seats || 0, status: 'draft' });
  if (res.error) return res;
  const q = res.quote;
  commit({
    ...state,
    extras: {
      ...state.extras,
      [q.id]: {
        lineItems,
        terms: DEFAULT_TERMS,
        notes: '',
        shipping: 0,
        timeline: [{ id: nid('qe'), at: nowISO(), status: 'draft', who: who(), note: `Created from ${deal.name}` }],
      },
    },
  });
  return { quote: q };
}

/* Blank quote against an account with one starter platform line. */
export function createBlankQuote({ companyId } = {}) {
  if (!companyId) return { error: 'companyId', message: 'Pick an account for the quote.' };
  const res = createQuote({ companyId, status: 'draft' });
  if (res.error) return res;
  const q = res.quote;
  const products = getProducts();
  const platform = products.find(p => p.category === 'Platform') || products[0];
  const starter = platform ? [mkLine(platform, 25, platform.price, 0, 0)] : [];
  commit({
    ...state,
    extras: {
      ...state.extras,
      [q.id]: {
        lineItems: starter, terms: DEFAULT_TERMS, notes: '', shipping: 0,
        timeline: [{ id: nid('qe'), at: nowISO(), status: 'draft', who: who(), note: 'Quote created' }],
      },
    },
  });
  return { quote: q };
}
