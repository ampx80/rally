// ============================================================
// RALLY BILLING DATA  (local-first, deterministic)
// Seeds a believable invoice ledger tied to REAL companies + deals
// from the core store, then persists status/line changes to
// localStorage so the billing surface stays alive across reloads.
// Read-only over store.js; owns its own rally_invoices_v1 slice.
// SUPABASE: rally_invoices + rally_invoice_lines tables.
// ============================================================
import { useEffect, useState } from 'react';
import { getCompanies, getDeals, getCompany, getDeal } from './store.js';

const LS_KEY = 'rally_invoices_v1';

/* ---------- deterministic PRNG (own stream, stable seed) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
const TAX_RATE = 0.0825; // blended sales tax used across the ledger

const LINE_KINDS = [
  { label: 'Platform license (annual)', unit: 'seat', min: 40, max: 320, price: 240 },
  { label: 'Implementation + onboarding', unit: 'project', min: 1, max: 1, price: 28000 },
  { label: 'Premium support tier', unit: 'year', min: 1, max: 1, price: 14000 },
  { label: 'Data migration', unit: 'project', min: 1, max: 1, price: 9500 },
  { label: 'API + integration add-on', unit: 'module', min: 1, max: 6, price: 3200 },
  { label: 'Training workshop', unit: 'session', min: 1, max: 8, price: 1800 },
  { label: 'Advanced analytics module', unit: 'module', min: 1, max: 3, price: 6400 },
];

/* Build line items whose taxed total lands near a target amount, so an
   invoice generated from a deal actually reconciles to the deal value. */
function buildLines(rnd, targetTotal) {
  const targetSub = targetTotal / (1 + TAX_RATE);
  const lines = [];
  let sub = 0;
  const n = 2 + Math.floor(rnd() * 3);
  const pool = [...LINE_KINDS];
  for (let i = 0; i < n && pool.length; i++) {
    const kind = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const qty = kind.min + Math.floor(rnd() * (kind.max - kind.min + 1));
    lines.push({ label: kind.label, qty, unit: kind.unit, price: kind.price, amount: qty * kind.price });
    sub += qty * kind.price;
  }
  // Reconcile: adjust the first line so subtotal matches the target.
  const delta = Math.round(targetSub - sub);
  if (lines.length) {
    lines[0].amount = Math.max(kindFloor(lines[0]), lines[0].amount + delta);
    lines[0].qty = Math.max(1, Math.round(lines[0].amount / lines[0].price));
    lines[0].amount = lines[0].qty * lines[0].price;
  }
  return lines;
}
function kindFloor(l) { return l.price; }

export function linesSubtotal(lines) { return (lines || []).reduce((s, l) => s + l.amount, 0); }
export function invoiceTax(lines) { return Math.round(linesSubtotal(lines) * TAX_RATE); }
export function invoiceTotal(lines) { return linesSubtotal(lines) + invoiceTax(lines); }

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260709);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

  const companies = getCompanies();
  const deals = getDeals();
  const wonDeals = deals.filter(d => d.status === 'won');

  const invoices = [];
  let seq = 1040;
  const nextNumber = () => `INV-${seq++}`;

  // 1) Every won deal bills a paid or sent invoice (revenue already earned).
  for (const d of wonDeals) {
    const lines = buildLines(rnd, d.value);
    const total = invoiceTotal(lines);
    const issuedAgo = 4 + Math.floor(rnd() * 150);
    const termDays = pick([15, 30, 30, 45, 60]);
    const paid = rnd() < 0.62;
    const issuedAt = daysFromNow(-issuedAgo);
    const dueAt = new Date(now - issuedAgo * DAY + termDays * DAY).toISOString();
    const overdue = !paid && new Date(dueAt).getTime() < now;
    invoices.push(makeInvoice({
      number: nextNumber(), companyId: d.companyId, dealId: d.id,
      lines, total, issuedAt, dueAt, termDays,
      status: paid ? 'paid' : overdue ? 'overdue' : 'sent',
      paidAt: paid ? daysFromNow(-(Math.max(1, issuedAgo - Math.floor(rnd() * termDays)))) : null,
      rnd,
    }));
  }

  // 2) A spread of standalone invoices across other accounts for volume,
  //    guaranteeing every status is represented (paid / sent / overdue / draft).
  const others = companies.filter(c => !wonDeals.some(d => d.companyId === c.id));
  const targetTotal = 20;
  const statuses = ['paid', 'sent', 'overdue', 'draft', 'sent', 'paid', 'overdue'];
  let si = 0;
  for (const co of others) {
    if (invoices.length >= targetTotal) break;
    if (rnd() < 0.45) continue;
    const status = statuses[si++ % statuses.length];
    const base = (8 + Math.floor(rnd() * 80)) * 2500;
    const lines = buildLines(rnd, base);
    const total = invoiceTotal(lines);
    const issuedAgo = 2 + Math.floor(rnd() * 120);
    const termDays = pick([15, 30, 45]);
    const issuedAt = status === 'draft' ? daysFromNow(0) : daysFromNow(-issuedAgo);
    const dueAt = status === 'draft'
      ? daysFromNow(termDays)
      : new Date(now - issuedAgo * DAY + termDays * DAY).toISOString();
    invoices.push(makeInvoice({
      number: status === 'draft' ? nextNumber() : nextNumber(),
      companyId: co.id, dealId: null, lines, total, issuedAt, dueAt, termDays,
      status,
      paidAt: status === 'paid' ? daysFromNow(-(Math.max(1, issuedAgo - 5))) : null,
      rnd,
    }));
  }

  // Guarantee at least one of each status + a fresh draft for the demo.
  ensureStatus(invoices, 'draft', rnd, companies, nextNumber, now);
  ensureStatus(invoices, 'overdue', rnd, companies, nextNumber, now);

  invoices.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  return { seededAt: new Date(now).toISOString(), nextSeq: seq, invoices };
}

function makeInvoice({ number, companyId, dealId, lines, total, issuedAt, dueAt, termDays, status, paidAt, rnd }) {
  const co = getCompany(companyId);
  const issuedTs = new Date(issuedAt).getTime();
  const timeline = [{ label: 'Draft created', at: new Date(issuedTs - 2 * DAY).toISOString() }];
  if (status !== 'draft') timeline.push({ label: 'Invoice sent', at: issuedAt });
  if (status === 'overdue') timeline.push({ label: 'Marked overdue', at: dueAt });
  if (status === 'paid' && paidAt) timeline.push({ label: 'Payment received', at: paidAt });
  return {
    id: 'inv_' + number.replace(/\W/g, '').toLowerCase(),
    number,
    companyId,
    companyName: co?.name || 'Unknown account',
    dealId,
    lines,
    subtotal: linesSubtotal(lines),
    tax: invoiceTax(lines),
    total,
    amount: total, // convenience alias for list rendering
    issuedAt,
    dueAt,
    termDays,
    status,
    paidAt,
    poNumber: 'PO-' + (1000 + Math.floor((rnd ? rnd() : 0.5) * 8999)),
    timeline,
    createdAt: issuedAt,
  };
}

function ensureStatus(invoices, status, rnd, companies, nextNumber, now) {
  if (invoices.some(i => i.status === status)) return;
  const co = companies[Math.floor(rnd() * companies.length)];
  const base = (10 + Math.floor(rnd() * 40)) * 2500;
  const lines = buildLines(rnd, base);
  const termDays = 30;
  const issuedAt = status === 'draft' ? new Date(now).toISOString() : new Date(now - 50 * DAY).toISOString();
  const dueAt = status === 'draft'
    ? new Date(now + termDays * DAY).toISOString()
    : new Date(now - 10 * DAY).toISOString();
  invoices.push(makeInvoice({
    number: nextNumber(), companyId: co.id, dealId: null, lines,
    total: invoiceTotal(lines), issuedAt, dueAt, termDays, status, paidAt: null, rnd,
  }));
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let bill = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  bill = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(bill)); } catch {}
  subs.forEach(fn => fn(bill));
}

/* React binding - re-render on any billing commit. */
export function useInvoices(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(bill));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(bill);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   READ API
   ============================================================ */
export const getInvoices = () => bill.invoices;
export const getInvoice = (id) => bill.invoices.find(i => i.id === id);

export const isOutstanding = (i) => i.status === 'sent' || i.status === 'overdue';

export function arOutstanding() {
  return bill.invoices.filter(isOutstanding).reduce((s, i) => s + i.total, 0);
}
export function arOverdue() {
  return bill.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
}
export function totalBilled() {
  return bill.invoices.filter(i => i.status !== 'draft').reduce((s, i) => s + i.total, 0);
}
export function paidThisMonth() {
  const now = new Date();
  return bill.invoices.filter(i => {
    if (i.status !== 'paid' || !i.paidAt) return false;
    const d = new Date(i.paidAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, i) => s + i.total, 0);
}
export function collectedToDate() {
  return bill.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
}

/* MRR/ARR estimate from recurring-style lines on non-draft invoices.
   Annual license + support lines amortize to a monthly run rate. */
export function mrrEstimate() {
  let arr = 0;
  for (const i of bill.invoices) {
    if (i.status === 'draft') continue;
    for (const l of i.lines) {
      if (/license|support|analytics|add-on/i.test(l.label)) arr += l.amount;
    }
  }
  return Math.round(arr / 12);
}
export function arrEstimate() { return mrrEstimate() * 12; }

/* Revenue by month (billed, last 6 months incl. current). */
export function revenueByMonth(months = 6) {
  const now = new Date();
  const out = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0 });
  }
  const idx = Object.fromEntries(out.map((m, i) => [m.key, i]));
  for (const i of bill.invoices) {
    if (i.status === 'draft') continue;
    const d = new Date(i.issuedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in idx) out[idx[key]].value += i.total;
  }
  return out;
}

/* AR aging buckets by days past due (only unpaid + sent/overdue). */
export function agingBuckets() {
  const now = Date.now();
  const buckets = [
    { key: '0-30', label: 'Current (0-30)', value: 0, color: 'var(--ok)' },
    { key: '31-60', label: '31-60 days', value: 0, color: 'var(--warn)' },
    { key: '61-90', label: '61-90 days', value: 0, color: 'var(--accent)' },
    { key: '90+', label: '90+ days', value: 0, color: 'var(--risk)' },
  ];
  for (const i of bill.invoices) {
    if (!isOutstanding(i)) continue;
    const past = Math.floor((now - new Date(i.dueAt).getTime()) / DAY);
    const b = past <= 30 ? 0 : past <= 60 ? 1 : past <= 90 ? 2 : 3;
    buckets[b].value += i.total;
  }
  return buckets;
}

/* ============================================================
   WRITE API
   ============================================================ */
export function markPaid(id) {
  const inv = getInvoice(id);
  if (!inv) return { error: 'missing' };
  const at = new Date().toISOString();
  const next = { ...bill, invoices: bill.invoices.map(i =>
    i.id === id ? { ...i, status: 'paid', paidAt: at, timeline: [...i.timeline, { label: 'Payment received', at }] } : i) };
  commit(next);
  return { invoice: getInvoice(id) };
}

export function markSent(id) {
  const inv = getInvoice(id);
  if (!inv) return { error: 'missing' };
  const at = new Date().toISOString();
  const next = { ...bill, invoices: bill.invoices.map(i =>
    i.id === id ? { ...i, status: 'sent', issuedAt: at, timeline: [...i.timeline, { label: 'Invoice sent', at }] } : i) };
  commit(next);
  return { invoice: getInvoice(id) };
}

export function logReminder(id) {
  const inv = getInvoice(id);
  if (!inv) return { error: 'missing' };
  const at = new Date().toISOString();
  const next = { ...bill, invoices: bill.invoices.map(i =>
    i.id === id ? { ...i, timeline: [...i.timeline, { label: 'Reminder sent', at }] } : i) };
  commit(next);
  return { invoice: getInvoice(id) };
}

/* Create a draft invoice from a won (or any) deal, reconciled to its value. */
export function createInvoiceFromDeal(dealId) {
  const d = getDeal(dealId);
  if (!d) return { error: 'deal', message: 'Deal not found.' };
  const rnd = mulberry32(Math.abs(hash(dealId)) + Date.now() % 100000);
  const lines = buildLines(rnd, d.value);
  const now = Date.now();
  const number = `INV-${bill.nextSeq}`;
  const inv = makeInvoice({
    number,
    companyId: d.companyId,
    dealId: d.id,
    lines,
    total: invoiceTotal(lines),
    issuedAt: new Date(now).toISOString(),
    dueAt: new Date(now + 30 * DAY).toISOString(),
    termDays: 30,
    status: 'draft',
    paidAt: null,
    rnd,
  });
  commit({ ...bill, nextSeq: bill.nextSeq + 1, invoices: [inv, ...bill.invoices] });
  return { invoice: inv };
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

export function resetInvoices() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  bill = load();
  subs.forEach(fn => fn(bill));
}
