// ============================================================
// RALLY PRODUCTS + PRICE BOOK
// A local-first product catalog + multi-book pricing layer.
// A deterministic PRNG seeds a believable SaaS catalog (platform
// tiers, add-on modules, seats, services). Edits, new SKUs and
// active toggles persist to localStorage so the demo stays alive
// across reloads. Every function notes its live equivalent.
//   SUPABASE: rally_products, rally_price_books, rally_price_entries
// ============================================================

const LS_KEY = 'rally_products_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (matches store.js style) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- static config ---------- */
export const FAMILIES = ['Platform', 'Module', 'Seats', 'Services', 'Support'];
export const BILLING = ['monthly', 'annual', 'one-time'];
export const BILLING_LABEL = { monthly: 'Monthly', annual: 'Annual', 'one-time': 'One-time' };

// Three price books. Each carries a multiplier applied to the base list
// price; per-SKU overrides (seeded below) win over the multiplier.
export const PRICE_BOOKS = [
  { id: 'standard', name: 'Standard', mult: 1.0, note: 'List pricing for direct new-logo deals.' },
  { id: 'enterprise', name: 'Enterprise', mult: 1.35, note: 'Committed-volume enterprise agreements.' },
  { id: 'partner', name: 'Partner', mult: 0.8, note: 'Channel + reseller margin pricing.' },
];
export const priceBookById = (id) => PRICE_BOOKS.find(b => b.id === id) || PRICE_BOOKS[0];

/* ---------- seed catalog ---------- */
// [name, sku, family, billing, listPrice, description]
const CATALOG = [
  ['Rally Core Platform', 'PLT-CORE', 'Platform', 'annual', 18000, 'Foundational CRM: pipeline, contacts, activities, reporting.'],
  ['Rally Growth Platform', 'PLT-GROW', 'Platform', 'annual', 42000, 'Core plus forecasting, territories, and advanced automation.'],
  ['Rally Enterprise Platform', 'PLT-ENT', 'Platform', 'annual', 96000, 'Full suite: multi-org, governance, SSO, and unlimited pipelines.'],
  ['Revenue Intelligence', 'MOD-RI', 'Module', 'annual', 24000, 'AI deal scoring, risk signals, and next-best-action.'],
  ['CPQ + Quoting', 'MOD-CPQ', 'Module', 'annual', 19500, 'Configure, price, quote with approval workflows.'],
  ['Forecasting Suite', 'MOD-FCST', 'Module', 'annual', 15000, 'Weighted, AI, and manager-adjusted forecast rollups.'],
  ['Marketing Attribution', 'MOD-ATTR', 'Module', 'annual', 12500, 'Multi-touch attribution across campaigns and channels.'],
  ['Partner Portal', 'MOD-PRTL', 'Module', 'annual', 14000, 'Deal registration and co-sell for channel partners.'],
  ['Analytics Warehouse', 'MOD-DWH', 'Module', 'annual', 22000, 'Managed warehouse sync with 200+ prebuilt models.'],
  ['Platform Seat', 'SEAT-STD', 'Seats', 'monthly', 65, 'Per-user monthly seat for full platform access.'],
  ['Sales Seat', 'SEAT-SALES', 'Seats', 'monthly', 45, 'Per-user seat for reps: pipeline, activities, mobile.'],
  ['Read-only Seat', 'SEAT-VIEW', 'Seats', 'monthly', 15, 'View-and-report access for execs and finance.'],
  ['API Access Tier', 'SEAT-API', 'Seats', 'monthly', 900, 'Committed API throughput and webhook volume.'],
  ['Implementation - Standard', 'SVC-IMPL', 'Services', 'one-time', 25000, 'Guided onboarding, data migration, and admin training.'],
  ['Implementation - Enterprise', 'SVC-IMPL-E', 'Services', 'one-time', 85000, 'Dedicated architect, custom integrations, phased rollout.'],
  ['Solutions Consulting', 'SVC-SC', 'Services', 'one-time', 12000, 'Fixed-scope process design and workflow buildout.'],
  ['Premier Support', 'SUP-PREM', 'Support', 'annual', 18000, '24/7 support, 1-hour SLA, named technical manager.'],
  ['Sandbox + Training', 'SUP-SBX', 'Support', 'annual', 6000, 'Full-copy sandbox plus quarterly enablement sessions.'],
];

function buildSeed() {
  const rnd = mulberry32(20260709);
  const now = Date.now();
  const products = CATALOG.map(([name, sku, family, billing, list, description], i) => {
    // 12-point revenue sparkline, gently trending up with jitter.
    const base = 20 + Math.floor(rnd() * 40);
    const spark = [];
    let v = base;
    for (let m = 0; m < 12; m++) {
      v = Math.max(4, v + Math.round((rnd() - 0.35) * 10));
      spark.push(v);
    }
    // Seeded per-book overrides on a few marquee SKUs so books differ
    // beyond the flat multiplier (feels hand-negotiated).
    const overrides = {};
    if (family === 'Platform') {
      overrides.enterprise = Math.round(list * 1.3 / 1000) * 1000;
      overrides.partner = Math.round(list * 0.72 / 1000) * 1000;
    }
    return {
      id: `prod_${i + 1}`,
      name, sku, family, billing,
      list,
      description,
      active: !(sku === 'MOD-ATTR' || sku === 'SEAT-VIEW'), // a couple retired
      overrides,
      spark,
      createdAt: new Date(now - (CATALOG.length - i) * 86400000 * 9).toISOString(),
    };
  });
  return { seededAt: new Date(now).toISOString(), products };
}

/* ---------- persistence + pub/sub ---------- */
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
export function resetProducts() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function subscribeProducts(fn) { subs.add(fn); return () => subs.delete(fn); }
export function getProducts() { return state.products; }

let idc = Date.now();
const newId = () => `prod_${(idc++).toString(36)}`;

/* ---------- pricing ---------- */
// SUPABASE: coalesce(price_entries.price, list * price_books.mult)
export function priceFor(product, bookId) {
  if (!product) return 0;
  const book = priceBookById(bookId);
  const override = product.overrides && product.overrides[book.id];
  if (override != null) return override;
  return Math.round((product.list * book.mult) / (product.billing === 'monthly' ? 1 : 1000)) * (product.billing === 'monthly' ? 1 : 1000);
}

/* ---------- write API ---------- */
// SUPABASE: from('rally_products').insert(row).select().single()
export function createProduct({ name, sku, family, billing, list, description }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Product name is required.' };
  if (!sku || !sku.trim()) return { error: 'sku', message: 'A SKU is required.' };
  const val = Number(list);
  if (!Number.isFinite(val) || val < 0) return { error: 'list', message: 'Enter a valid list price.' };
  const p = {
    id: newId(),
    name: name.trim(),
    sku: sku.trim().toUpperCase(),
    family: FAMILIES.includes(family) ? family : 'Module',
    billing: BILLING.includes(billing) ? billing : 'annual',
    list: val,
    description: (description || '').trim(),
    active: true,
    overrides: {},
    spark: Array.from({ length: 12 }, (_, i) => 20 + i * 2),
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, products: [p, ...state.products] });
  return { product: p };
}

export function updateProduct(id, patch) {
  const p = state.products.find(x => x.id === id);
  if (!p) return { error: 'missing', message: 'Product not found.' };
  if (patch.list != null) {
    const v = Number(patch.list);
    if (!Number.isFinite(v) || v < 0) return { error: 'list', message: 'Enter a valid list price.' };
    patch.list = v;
  }
  if (patch.sku) patch.sku = patch.sku.trim().toUpperCase();
  Object.assign(p, patch);
  commit({ ...state });
  return { product: p };
}

export function toggleProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return { error: 'missing', message: 'Product not found.' };
  p.active = !p.active;
  commit({ ...state });
  return { product: p };
}

export function duplicateProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return { error: 'missing', message: 'Product not found.' };
  const copy = {
    ...p,
    id: newId(),
    name: `${p.name} (copy)`,
    sku: `${p.sku}-2`,
    overrides: { ...p.overrides },
    spark: [...p.spark],
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, products: [copy, ...state.products] });
  return { product: copy };
}
