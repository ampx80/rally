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
  // approval-flow meta (NOT part of QUOTE_FLOW; used for badges + timeline dots only)
  pending: { label: 'Approval pending', tone: 'warn', blurb: 'Discount needs a manager' },
  approved: { label: 'Approved', tone: 'ok', blurb: 'Discount signed off' },
  rejected: { label: 'Approval declined', tone: 'risk', blurb: 'Discount not approved' },
};

/* Discount % above which a quote needs manager approval before it can be sent.
   Compared against the effective (all-in) discount percentage of the quote. */
export const DISCOUNT_APPROVAL_THRESHOLD = 15;

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
  return { seededAt: nowISO(), extras, templates: seedTemplates() };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate older persisted state that predates quote templates.
      if (!Array.isArray(parsed.templates)) parsed.templates = seedTemplates();
      return parsed;
    }
  } catch {}
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
/* Order-level discount lives on the extras record. Old seeds predate it, so
   always read through this default (type: pct|amt, value: number). */
export function getQuoteOrderDiscount(quoteId) {
  const od = getQuoteExtras(quoteId).orderDiscount;
  return od && (od.type === 'amt' || od.type === 'pct') ? od : { type: 'pct', value: 0 };
}
/* Approval record (default 'none'). Old seeds predate it. */
export function getQuoteApproval(quoteId) {
  const ap = getQuoteExtras(quoteId).approval;
  return ap && ap.status ? ap : { status: 'none', threshold: DISCOUNT_APPROVAL_THRESHOLD };
}
export const getQuoteLines = (quoteId) => getQuoteExtras(quoteId).lineItems || [];
export const getQuoteTimeline = (quoteId) => getQuoteExtras(quoteId).timeline || [];

/* Per-line discount as a dollar amount. discountType 'amt' treats `discount`
   as a flat dollar amount off the whole line; anything else (incl. legacy
   lines with no discountType) treats it as a percent. Capped at gross. */
export function lineDiscountAmount(li) {
  const gross = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
  const d = Number(li.discount) || 0;
  if (li.discountType === 'amt') return Math.min(Math.max(0, d), gross);
  return gross * (clamp(d, 0, 100) / 100);
}

/* pure line math: gross - lineDiscount + lineTax (order discount applied at
   the quote level, not here, so the per-line "Amount" reads cleanly). */
export function lineQuoteTotal(li) {
  const gross = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
  const net = gross - lineDiscountAmount(li);
  const tax = net * ((Number(li.tax) || 0) / 100);
  return net + tax;
}

// SUPABASE: computed server-side or via a view over rally_quote_lines.
export function quoteTotals(quoteId) {
  const lines = getQuoteLines(quoteId);
  let subtotal = 0, lineDiscountTotal = 0;
  const nets = [];
  for (const li of lines) {
    const gross = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
    const disc = lineDiscountAmount(li);
    subtotal += gross;
    lineDiscountTotal += disc;
    nets.push({ net: gross - disc, taxRate: (Number(li.tax) || 0) / 100 });
  }
  const netAfterLines = subtotal - lineDiscountTotal;
  const od = getQuoteOrderDiscount(quoteId);
  const orderDiscountAmt = od.type === 'amt'
    ? Math.min(Math.max(0, Number(od.value) || 0), netAfterLines)
    : netAfterLines * (clamp(Number(od.value) || 0, 0, 100) / 100);
  // Prorate the order discount across lines so per-line tax stays correct.
  const factor = netAfterLines > 0 ? (netAfterLines - orderDiscountAmt) / netAfterLines : 0;
  let taxTotal = 0;
  for (const n of nets) taxTotal += n.net * factor * n.taxRate;
  const discountTotal = lineDiscountTotal + orderDiscountAmt;
  const shipping = Number(getQuoteExtras(quoteId).shipping) || 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shipping;
  const effectiveDiscountPct = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;
  return { subtotal, discountTotal, lineDiscountTotal, orderDiscountAmt, taxTotal, shipping, grandTotal, effectiveDiscountPct };
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
    discountType: line.discountType === 'amt' ? 'amt' : 'pct',
    tax: Number(line.tax) || 0,
  };
  patchExtras(quoteId, ex => { ex.lineItems = [...(ex.lineItems || []), item]; });
  invalidateApproval(quoteId);
  return { line: item };
}

/* Add a catalog product as a line (from getProducts). */
export function addQuoteProduct(quoteId, productId) {
  const p = getProducts().find(x => x.id === productId);
  if (!p) return { error: 'product', message: 'Unknown product.' };
  return addQuoteLine(quoteId, {
    productId: p.id, name: p.name, description: `${p.category} - ${p.billing}`,
    qty: 1, unitPrice: p.price, discount: 0, discountType: 'pct', tax: 0,
  });
}

// SUPABASE: rally_quote_lines.update(patch).eq('id', lineId)
export function updateQuoteLine(quoteId, lineId, patch = {}) {
  let discChanged = false;
  patchExtras(quoteId, ex => {
    ex.lineItems = (ex.lineItems || []).map(li => {
      if (li.id !== lineId) return li;
      const next = { ...li, ...patch };
      if (patch.qty != null) next.qty = Math.max(0, Number(patch.qty) || 0);
      if (patch.unitPrice != null) next.unitPrice = Math.max(0, Number(patch.unitPrice) || 0);
      const dtype = next.discountType === 'amt' ? 'amt' : 'pct';
      next.discountType = dtype;
      if (patch.discount != null) next.discount = dtype === 'amt' ? Math.max(0, Number(patch.discount) || 0) : clamp(Number(patch.discount) || 0, 0, 100);
      if (patch.tax != null) next.tax = clamp(Number(patch.tax) || 0, 0, 100);
      if (patch.discount != null || patch.discountType != null || patch.qty != null || patch.unitPrice != null) discChanged = true;
      return next;
    });
  });
  if (discChanged) invalidateApproval(quoteId);
  return { ok: true };
}

export function removeQuoteLine(quoteId, lineId) {
  patchExtras(quoteId, ex => { ex.lineItems = (ex.lineItems || []).filter(li => li.id !== lineId); });
  invalidateApproval(quoteId);
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
   WRITE API  (order-level discount)
   ============================================================ */
// SUPABASE: rally_quotes.update({ order_discount_type, order_discount_value })
export function setQuoteOrderDiscount(quoteId, patch = {}) {
  patchExtras(quoteId, ex => {
    const cur = (ex.orderDiscount && (ex.orderDiscount.type === 'amt' || ex.orderDiscount.type === 'pct'))
      ? ex.orderDiscount : { type: 'pct', value: 0 };
    const type = patch.type === 'amt' ? 'amt' : (patch.type === 'pct' ? 'pct' : cur.type);
    let value = patch.value != null ? Math.max(0, Number(patch.value) || 0) : cur.value;
    if (type === 'pct') value = clamp(value, 0, 100);
    ex.orderDiscount = { type, value };
  });
  invalidateApproval(quoteId);
  return { ok: true };
}

/* ============================================================
   APPROVAL FLOW  (discount above threshold needs a manager)
   ============================================================ */
/* Rich approval snapshot the UI reads: current effective discount, whether it
   crosses the threshold, and whether the quote is blocked from sending. */
export function quoteApprovalInfo(quoteId) {
  const totals = quoteTotals(quoteId);
  const ap = getQuoteApproval(quoteId);
  const threshold = ap.threshold != null ? ap.threshold : DISCOUNT_APPROVAL_THRESHOLD;
  const effectivePct = totals.effectiveDiscountPct;
  const overThreshold = effectivePct > threshold + 1e-9;
  const approvedPct = ap.approvedPct != null ? ap.approvedPct : 0;
  // An approval only covers up to the discount that was signed off. If the
  // discount later grew, the approval goes stale and re-approval is needed.
  const staleApproval = ap.status === 'approved' && effectivePct > approvedPct + 1e-9;
  const covered = ap.status === 'approved' && !staleApproval;
  const blocked = overThreshold && !covered;
  return {
    threshold, effectivePct, overThreshold, blocked, staleApproval,
    status: ap.status || 'none', requestedBy: ap.requestedBy, decidedBy: ap.decidedBy,
    note: ap.note || '', approvedPct: ap.approvedPct,
  };
}

// SUPABASE: rally_quotes.update({ approval_status:'pending', ... }) + event insert
export function requestQuoteApproval(quoteId, note = '') {
  const info = quoteApprovalInfo(quoteId);
  patchExtras(quoteId, ex => {
    ex.approval = {
      status: 'pending', threshold: info.threshold, requestedBy: who(),
      requestedAt: nowISO(), note: note || '',
      effectivePct: Math.round(info.effectivePct * 10) / 10,
    };
    ex.timeline = [{ id: nid('qe'), at: nowISO(), status: 'pending', who: who(),
      note: `Approval requested (${(Math.round(info.effectivePct * 10) / 10)}% discount)` }, ...(ex.timeline || [])];
  });
  return { ok: true, status: 'pending' };
}

// SUPABASE: rally_quotes.update({ approval_status, approved_by }) + event insert
export function decideQuoteApproval(quoteId, approve, note = '') {
  const info = quoteApprovalInfo(quoteId);
  const status = approve ? 'approved' : 'rejected';
  patchExtras(quoteId, ex => {
    const prev = (ex.approval && ex.approval.status) ? ex.approval : { threshold: info.threshold };
    ex.approval = {
      ...prev, status, threshold: info.threshold, decidedBy: who(), decidedAt: nowISO(),
      note: note || '', approvedPct: approve ? Math.round(info.effectivePct * 10) / 10 : prev.approvedPct,
    };
    ex.timeline = [{ id: nid('qe'), at: nowISO(), status, who: who(),
      note: approve ? `Discount approved (${(Math.round(info.effectivePct * 10) / 10)}%)` : 'Discount declined' }, ...(ex.timeline || [])];
  });
  return { ok: true, status };
}

/* Any change that moves the discount silently invalidates a prior decision so
   an approved quote can't be re-discounted behind the approver's back. We only
   downgrade approved->stale implicitly (via approvedPct in quoteApprovalInfo);
   a pending request is cleared so the approver re-reviews the new number. */
function invalidateApproval(quoteId) {
  const ex = state.extras[quoteId];
  if (!ex || !ex.approval) return;
  if (ex.approval.status === 'pending') {
    patchExtras(quoteId, e => { e.approval = { ...e.approval, status: 'none' }; });
  }
}

/* ============================================================
   QUOTE TEMPLATES  (named starting configurations)
   ============================================================ */
// SUPABASE: rally_quote_templates (name, lines jsonb, terms, notes, order_discount).
export const getQuoteTemplates = () => state.templates || [];

function seedTemplates() {
  const products = getProducts();
  const byCat = (cat) => products.find(p => p.category === cat);
  const byName = (n) => products.find(p => p.name === n);
  const L = (p, qty, discount = 0, discountType = 'pct', tax = 0) => p ? {
    productId: p.id, name: p.name, description: `${p.category} - ${p.billing}`,
    qty, unitPrice: p.price, discount, discountType, tax,
  } : null;
  const platform = byName('Rally CRM') || byCat('Platform');
  const platformEnt = byName('Rally CRM Enterprise') || platform;
  const rook = byName('Rook AI Operator') || byCat('AI');
  const cpq = byName('Rally CPQ') || byCat('Revenue');
  const analytics = byName('Rally Analytics Plus') || byCat('Intelligence');
  const implStd = byName('Implementation - Standard') || byCat('Services');
  const implEnt = byName('Implementation - Enterprise');
  const support = byName('Premier Support');
  const tpl = (id, name, description, lines, terms, orderDiscount) => ({
    id, name, description, lines: lines.filter(Boolean), terms: terms || DEFAULT_TERMS,
    notes: '', orderDiscount: orderDiscount || { type: 'pct', value: 0 }, createdAt: nowISO(), seeded: true,
  });
  return [
    tpl('qt_seed_newlogo', 'New logo - Platform starter',
      'Land a new customer on Core with services and support.',
      [L(platform, 25), L(rook, 25, 10), L(implStd, 1)]),
    tpl('qt_seed_expansion', 'Expansion - add CPQ + Analytics',
      'Grow an existing account with revenue and intelligence modules.',
      [L(cpq, 40, 10), L(analytics, 1), L(rook, 40, 5)], undefined, { type: 'pct', value: 5 }),
    tpl('qt_seed_enterprise', 'Enterprise - full rollout',
      'Committed enterprise deal: Enterprise platform, all modules, white-glove services.',
      [L(platformEnt, 150, 12), L(rook, 150, 12), L(cpq, 150, 12), L(analytics, 1), L(implEnt, 1), L(support, 1)],
      undefined, { type: 'pct', value: 8 }),
  ];
}

// SUPABASE: rally_quote_templates.insert(row)
export function saveQuoteTemplate(quoteId, name) {
  const ex = getQuoteExtras(quoteId);
  const q = quoteById(quoteId);
  const tpl = {
    id: nid('qt'),
    name: (name || 'Untitled template').trim() || 'Untitled template',
    description: `Saved from ${q ? q.number : 'a quote'}`,
    lines: (ex.lineItems || []).map(l => ({
      productId: l.productId || null, name: l.name, description: l.description || '',
      qty: l.qty, unitPrice: l.unitPrice, discount: l.discount || 0,
      discountType: l.discountType === 'amt' ? 'amt' : 'pct', tax: l.tax || 0,
    })),
    terms: ex.terms || DEFAULT_TERMS,
    notes: '',
    orderDiscount: getQuoteOrderDiscount(quoteId),
    createdAt: nowISO(),
    seeded: false,
  };
  commit({ ...state, templates: [tpl, ...(state.templates || [])] });
  return { template: tpl };
}

export function deleteQuoteTemplate(tplId) {
  commit({ ...state, templates: (state.templates || []).filter(t => t.id !== tplId) });
  return { ok: true };
}

/* Apply a template to a quote. mode 'replace' swaps the line set and pulls in
   the template's terms + order discount; 'append' just adds its lines. */
export function applyQuoteTemplate(quoteId, tplId, mode = 'replace') {
  const tpl = getQuoteTemplates().find(t => t.id === tplId);
  if (!tpl) return { error: 'template', message: 'Template not found.' };
  const newLines = (tpl.lines || []).map(l => ({
    id: nid('ql'), productId: l.productId || null, name: l.name || 'Line item',
    description: l.description || '', qty: Number(l.qty) || 1, unitPrice: Number(l.unitPrice) || 0,
    discount: Number(l.discount) || 0, discountType: l.discountType === 'amt' ? 'amt' : 'pct',
    tax: Number(l.tax) || 0,
  }));
  patchExtras(quoteId, ex => {
    ex.lineItems = mode === 'append' ? [...(ex.lineItems || []), ...newLines] : newLines;
    if (mode !== 'append') {
      if (tpl.terms != null) ex.terms = tpl.terms;
      if (tpl.orderDiscount) ex.orderDiscount = { ...tpl.orderDiscount };
    }
    ex.timeline = [{ id: nid('qe'), at: nowISO(), status: 'draft', who: who(),
      note: `Applied template "${tpl.name}"` }, ...(ex.timeline || [])];
  });
  invalidateApproval(quoteId);
  return { ok: true, count: newLines.length };
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
