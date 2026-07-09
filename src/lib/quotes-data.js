// ============================================================
// RALLY QUOTES / CPQ DATA
// Seeds a product/price catalog + a book of quotes tied to real
// deals + companies from the main store. Persists mutations to
// localStorage so the CPQ surface feels alive across reloads.
// A deterministic PRNG builds the initial book on first run.
// SUPABASE: rally_products, rally_quotes, rally_quote_lines.
// ============================================================
import { getDeals, getCompanies } from './store.js';

const LS_KEY = 'rally_quotes_v1'; // bump to force a clean reseed

/* ---------- deterministic PRNG (matched to store style) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   PRODUCT / PRICE CATALOG (list prices, annual per-unit)
   SUPABASE: rally_products.select()
   ============================================================ */
export const PRODUCTS = [
  { id: 'p_platform', name: 'Rally Platform License', sku: 'RLY-PLT-01', unit: 'per seat / yr', price: 1200, category: 'Platform' },
  { id: 'p_seats_pro', name: 'Pro Seat Add-on', sku: 'RLY-SEAT-PRO', unit: 'per seat / yr', price: 480, category: 'Platform' },
  { id: 'p_ai', name: 'Rook AI Operator', sku: 'RLY-AI-ROOK', unit: 'per seat / yr', price: 600, category: 'AI' },
  { id: 'p_cpq', name: 'CPQ + Quoting Engine', sku: 'RLY-CPQ-01', unit: 'per org / yr', price: 24000, category: 'Modules' },
  { id: 'p_forecast', name: 'Forecasting + Analytics', sku: 'RLY-FCT-01', unit: 'per org / yr', price: 18000, category: 'Modules' },
  { id: 'p_api', name: 'API + Integrations Tier', sku: 'RLY-API-ENT', unit: 'per org / yr', price: 12000, category: 'Modules' },
  { id: 'p_onboard', name: 'Guided Onboarding', sku: 'RLY-SVC-ONB', unit: 'one-time', price: 15000, category: 'Services' },
  { id: 'p_success', name: 'Premier Success Plan', sku: 'RLY-SVC-CSM', unit: 'per year', price: 30000, category: 'Services' },
];
export const productById = (id) => PRODUCTS.find(p => p.id === id);

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'expired'];
export const STATUS_META = {
  draft: { label: 'Draft', tone: 'default' },
  sent: { label: 'Sent', tone: 'info' },
  accepted: { label: 'Accepted', tone: 'ok' },
  expired: { label: 'Expired', tone: 'risk' },
};

export const TAX_RATE = 0.0725; // 7.25% shown on preview
export const APPROVAL_THRESHOLD = 20; // discount % that triggers approval

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260709);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const iso = (d) => new Date(now + d * DAY).toISOString();

  const deals = getDeals();
  const companies = getCompanies();
  const coById = (id) => companies.find(c => c.id === id);

  // Prefer the flagship deal first, then a spread of higher-value deals.
  const flagship = deals.find(d => d.id === 'd_flagship');
  const rest = deals
    .filter(d => d.id !== 'd_flagship' && d.companyId)
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
  const chosen = [flagship, ...rest].filter(Boolean);

  // deterministic line-item builder targeting a rough deal value
  const buildLines = (target, seedIdx) => {
    const lines = [];
    // platform seats scale with target
    const seats = Math.max(10, Math.round(target / 4000 / 5) * 5);
    lines.push(mkLine('p_platform', seats, seedIdx % 3 === 0 ? 10 : 0));
    if ((seedIdx % 2) === 0) lines.push(mkLine('p_ai', seats, 0));
    // a module or two
    const modules = ['p_cpq', 'p_forecast', 'p_api'];
    lines.push(mkLine(modules[seedIdx % modules.length], 1, seedIdx % 4 === 0 ? 25 : 0));
    if (seedIdx % 3 === 1) lines.push(mkLine('p_onboard', 1, 0));
    return lines;
  };

  function mkLine(productId, qty, discountPct) {
    const p = productById(productId);
    return { id: `ql_${productId}_${Math.round(rnd() * 1e6)}`, productId, name: p.name, sku: p.sku, unitPrice: p.price, qty, discountPct: discountPct || 0 };
  }

  const owners = ['Jordan Avery', 'Simone Diaz', 'Theo Bennett', 'Nina Kapoor', 'Marcus Hale'];
  const quotes = [];
  let qn = 1042;

  chosen.slice(0, 7).forEach((d, i) => {
    const co = coById(d.companyId);
    if (!co) return;
    qn += range(1, 4);
    const isFlagship = d.id === 'd_flagship';
    const status = isFlagship ? 'sent'
      : i === 1 ? 'accepted'
      : i === 2 ? 'draft'
      : i === 5 ? 'expired'
      : pick(['sent', 'sent', 'accepted', 'draft']);
    const created = isFlagship ? -9 : -range(4, 70);
    const validDays = status === 'expired' ? -range(2, 14) : range(4, 45);
    quotes.push({
      id: `q_${qn}`,
      number: `Q-${qn}`,
      dealId: d.id,
      companyId: co.id,
      ownerName: isFlagship ? 'Jordan Avery' : pick(owners),
      status,
      term: (i % 3 === 0) ? 'monthly' : 'annual',
      lines: buildLines(d.value, i + (isFlagship ? 5 : 0)),
      notes: isFlagship ? 'Enterprise rollout - net-30, includes premier success.' : '',
      createdAt: iso(created),
      validUntil: iso(created + Math.abs(validDays) + (validDays < 0 ? 0 : 30)),
    });
  });
  // fix expired one to genuinely be in the past
  const exp = quotes.find(q => q.status === 'expired');
  if (exp) exp.validUntil = iso(-range(2, 12));

  return { seededAt: new Date(now).toISOString(), quotes };
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
export function resetQuotes() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getQuotes = () => state.quotes;                 // SUPABASE: rally_quotes.select()
export const getQuote = (id) => state.quotes.find(q => q.id === id);

/* ---------- pure math over a quote's lines ---------- */
export function lineTotal(l) {
  const gross = (Number(l.unitPrice) || 0) * (Number(l.qty) || 0);
  const disc = gross * ((Number(l.discountPct) || 0) / 100);
  return gross - disc;
}
export function quoteMath(q, { taxRate = TAX_RATE } = {}) {
  const lines = q.lines || [];
  const subtotalGross = lines.reduce((s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0), 0);
  const discountTotal = lines.reduce((s, l) => {
    const gross = (Number(l.unitPrice) || 0) * (Number(l.qty) || 0);
    return s + gross * ((Number(l.discountPct) || 0) / 100);
  }, 0);
  const subtotal = subtotalGross - discountTotal;
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  // blended discount % across the whole quote
  const blendedDiscountPct = subtotalGross ? (discountTotal / subtotalGross) * 100 : 0;
  // annual contract value: annualize monthly terms
  const acv = q.term === 'monthly' ? subtotal * 12 : subtotal;
  return { subtotalGross, discountTotal, subtotal, tax, grandTotal, blendedDiscountPct, acv };
}
export const needsApproval = (q) => quoteMath(q).blendedDiscountPct > APPROVAL_THRESHOLD;

export function quoteStats() {
  const qs = state.quotes;
  const totalQuoted = qs.reduce((s, q) => s + quoteMath(q).grandTotal, 0);
  const decided = qs.filter(q => q.status === 'accepted' || q.status === 'expired');
  const accepted = qs.filter(q => q.status === 'accepted');
  const acceptanceRate = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0;
  const avgDealSize = qs.length ? totalQuoted / qs.length : 0;
  const now = Date.now();
  const soon = now + 7 * 86400000;
  const expiringSoon = qs.filter(q => {
    if (q.status === 'accepted' || q.status === 'expired') return false;
    const t = new Date(q.validUntil).getTime();
    return t >= now && t <= soon;
  }).length;
  return { totalQuoted, acceptanceRate, avgDealSize, expiringSoon, count: qs.length };
}

/* ============================================================
   WRITE API
   ============================================================ */
// SUPABASE: rally_quotes.insert(row).select().single()
export function createQuote({ companyId, dealId, ownerName, term = 'annual', lines = [] }) {
  if (!companyId) return { error: 'company', message: 'Pick an account for the quote.' };
  const n = 1042 + state.quotes.length + Math.floor(Math.random() * 40);
  const created = new Date().toISOString();
  const q = {
    id: newId('q'),
    number: `Q-${n}`,
    dealId: dealId || null,
    companyId,
    ownerName: ownerName || 'Jordan Avery',
    status: 'draft',
    term,
    lines: lines.map(l => ({ ...l, id: l.id || newId('ql') })),
    notes: '',
    createdAt: created,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  commit({ ...state, quotes: [q, ...state.quotes] });
  return { quote: q };
}
export function updateQuote(id, patch) {
  const q = getQuote(id);
  if (!q) return { error: 'missing', message: 'Quote not found.' };
  Object.assign(q, patch);
  commit({ ...state });
  return { quote: q };
}
export function setQuoteStatus(id, status) {
  return updateQuote(id, { status });
}
export function addLine(id, productId) {
  const q = getQuote(id);
  if (!q) return { error: 'missing', message: 'Quote not found.' };
  const p = productById(productId);
  if (!p) return { error: 'product', message: 'Unknown product.' };
  const line = { id: newId('ql'), productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, qty: 1, discountPct: 0 };
  q.lines = [...(q.lines || []), line];
  commit({ ...state });
  return { quote: q };
}
export function updateLine(id, lineId, patch) {
  const q = getQuote(id);
  if (!q) return { error: 'missing', message: 'Quote not found.' };
  q.lines = (q.lines || []).map(l => {
    if (l.id !== lineId) return l;
    const next = { ...l, ...patch };
    if (patch.qty != null) next.qty = Math.max(0, Number(patch.qty) || 0);
    if (patch.discountPct != null) next.discountPct = Math.max(0, Math.min(100, Number(patch.discountPct) || 0));
    return next;
  });
  commit({ ...state });
  return { quote: q };
}
export function removeLine(id, lineId) {
  const q = getQuote(id);
  if (!q) return { error: 'missing', message: 'Quote not found.' };
  q.lines = (q.lines || []).filter(l => l.id !== lineId);
  commit({ ...state });
  return { quote: q };
}
export function subscribeQuotes(fn) { subs.add(fn); return () => subs.delete(fn); }
