// ============================================================
// ADMIN DATA  -  signup tracking store for the back-office admin panel.
// Local-first pub/sub (mirrors store.js): deterministic mulberry32 seed of
// realistic company signups, plus a live intake path. Liftoff completion and
// the SignUp page dispatch a window CustomEvent('rally:signup', {detail})
// which this module records, so real signups append to the seeded demo with
// zero backend. TDZ-safe: every helper used during module-eval seeding is a
// hoisted function declaration or a const declared above `let state = load()`.
// ASCII only. NO em-dash / en-dash.
// ============================================================

const LS_KEY = 'rally_admin_signups_v1';
const ANCHOR = '2026-07-13'; // deterministic seed reference date

export const PLANS = [
  { key: 'starter', label: 'Starter', seat: 29 },
  { key: 'growth', label: 'Growth', seat: 45 },
  { key: 'scale', label: 'Scale', seat: 65 },
  { key: 'enterprise', label: 'Enterprise', seat: 85 },
];
export const SOURCES = [
  { key: 'liftoff', label: 'Liftoff wizard' },
  { key: 'organic', label: 'Organic / SEO' },
  { key: 'marketing', label: 'Marketing site' },
  { key: 'referral', label: 'Referral' },
  { key: 'outbound', label: 'Outbound' },
  { key: 'partner', label: 'Partner' },
];
export const STATUSES = [
  { key: 'trial', label: 'Trial', tone: 'info' },
  { key: 'active', label: 'Active', tone: 'good' },
  { key: 'lead', label: 'Lead', tone: 'neutral' },
  { key: 'churned', label: 'Churned', tone: 'bad' },
];
const planMeta = (k) => PLANS.find(p => p.key === k) || PLANS[1];
export const planLabel = (k) => planMeta(k).label;
export const sourceLabel = (k) => (SOURCES.find(s => s.key === k) || { label: k }).label;
export const statusMeta = (k) => STATUSES.find(s => s.key === k) || STATUSES[0];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function daysBefore(anchorISO, n) {
  const d = new Date(anchorISO + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}
function mrrFor(plan, seats) { return planMeta(plan).seat * seats; }

const FIRST = ['Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Sophia', 'Mason', 'Ethan', 'Mia', 'Lucas', 'Amelia', 'Harper', 'Elijah', 'James', 'Ben', 'Chloe', 'Grace', 'Leo', 'Nora', 'Zoe', 'Owen', 'Ruby', 'Max', 'Ivy', 'Cole', 'Priya', 'Diego', 'Sana', 'Kofi', 'Mei'];
const LAST = ['Chen', 'Patel', 'Nguyen', 'Garcia', 'Kim', 'Rossi', 'Silva', 'Okafor', 'Novak', 'Reyes', 'Haddad', 'Larsen', 'Walsh', 'Bauer', 'Costa', 'Adeyemi', 'Park', 'Moreau', 'Bianchi', 'Fischer'];
const CO_A = ['North', 'Blue', 'Summit', 'Vertex', 'Apex', 'Bright', 'Iron', 'Cedar', 'Delta', 'Pioneer', 'Orbit', 'Cobalt', 'Harbor', 'Granite', 'Lumen', 'Nova', 'Meridian', 'Atlas', 'Beacon', 'Forge', 'Willow', 'Onyx', 'Crest', 'Pulse', 'Quartz', 'Sable', 'Terra', 'Vantage', 'Aster', 'Halcyon'];
const CO_B = ['Systems', 'Labs', 'Group', 'Health', 'Logistics', 'Financial', 'Digital', 'Works', 'Partners', 'Tech', 'Robotics', 'Analytics', 'Networks', 'Retail', 'Studio', 'Ventures', 'Supply', 'Cloud', 'Dynamics', 'Collective'];
const INDUSTRIES = ['SaaS', 'Financial Services', 'Healthcare', 'Manufacturing', 'Retail', 'Professional Services', 'Logistics', 'Media', 'Real Estate'];

function makeSignup(rng, i, anchor) {
  const fn = pick(rng, FIRST), ln = pick(rng, LAST);
  const company = `${pick(rng, CO_A)} ${pick(rng, CO_B)}`;
  const seats = pick(rng, [10, 15, 20, 25, 30, 40, 50, 75, 100, 120, 150, 200, 240, 300, 400]);
  const plan = seats >= 200 ? 'enterprise' : seats >= 75 ? 'scale' : seats >= 25 ? 'growth' : 'starter';
  // Weight signups toward the recent past for a realistic growth curve.
  const ageDays = Math.floor(Math.pow(rng(), 1.7) * 88);
  const r = rng();
  const status = ageDays > 60 ? (r < 0.12 ? 'churned' : 'active')
    : ageDays > 14 ? (r < 0.68 ? 'active' : r < 0.9 ? 'trial' : 'churned')
      : (r < 0.45 ? 'trial' : r < 0.62 ? 'lead' : 'active');
  const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com';
  return {
    id: 'su_' + (1000 + i),
    company,
    contact: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}@${domain}`,
    industry: pick(rng, INDUSTRIES),
    seats,
    plan,
    mrr: status === 'lead' ? 0 : mrrFor(plan, seats),
    source: pick(rng, ['liftoff', 'liftoff', 'organic', 'organic', 'marketing', 'referral', 'outbound', 'partner']),
    status,
    signedUpAt: daysBefore(anchor, ageDays),
    lastActiveAt: daysBefore(anchor, Math.max(0, ageDays - Math.floor(rng() * Math.min(ageDays, 6)))),
  };
}

function buildSeed() {
  const rng = mulberry32(20260713);
  const rows = [];
  for (let i = 0; i < 58; i++) rows.push(makeSignup(rng, i, ANCHOR));
  rows.sort((a, b) => (a.signedUpAt < b.signedUpAt ? 1 : -1));
  return { signups: rows, seededAt: ANCHOR };
}

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.signups)) return p; } } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

let state = load();
const subs = new Set();
function emit() { for (const fn of subs) { try { fn(state); } catch {} } }
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  emit();
}

/* ---------- reads ---------- */
export function getSignups() { return state.signups; }
export function getSignup(id) { return state.signups.find(s => s.id === id) || null; }

const DAY = 86400000;
function nowMs() { try { return new Date().getTime(); } catch { return new Date(ANCHOR + 'T12:00:00Z').getTime(); } }

export function adminMetrics() {
  const rows = state.signups;
  const now = nowMs();
  const since = (days) => rows.filter(s => now - new Date(s.signedUpAt).getTime() <= days * DAY).length;
  const paying = rows.filter(s => s.status === 'active' || s.status === 'trial');
  const mrr = rows.filter(s => s.status === 'active').reduce((a, s) => a + (s.mrr || 0), 0);
  const active = rows.filter(s => s.status === 'active').length;
  const trial = rows.filter(s => s.status === 'trial').length;
  const churned = rows.filter(s => s.status === 'churned').length;
  const leads = rows.filter(s => s.status === 'lead').length;
  const seats = rows.reduce((a, s) => a + (s.seats || 0), 0);
  // 14-day trend series (oldest to newest).
  const trend = [];
  for (let d = 13; d >= 0; d--) {
    const end = now - (d - 1) * DAY, start = now - d * DAY;
    trend.push(rows.filter(s => { const t = new Date(s.signedUpAt).getTime(); return t < end && t >= start; }).length);
  }
  const groupCount = (keyFn, defs) => defs.map(def => ({ ...def, count: rows.filter(s => keyFn(s) === def.key).length }));
  return {
    total: rows.length,
    today: since(1), week: since(7), month: since(30),
    mrr, arr: mrr * 12,
    arpa: active ? Math.round(mrr / active) : 0,
    active, trial, churned, leads,
    seats,
    convertible: paying.length,
    conversion: (active + churned) ? Math.round((active / (active + churned)) * 100) : 0,
    trend,
    bySource: groupCount(s => s.source, SOURCES),
    byPlan: groupCount(s => s.plan, PLANS),
    byStatus: groupCount(s => s.status, STATUSES),
  };
}

export function filterSignups({ q = '', range = 'all', source = 'all', plan = 'all', status = 'all', sort = 'recent' } = {}) {
  const now = nowMs();
  const rangeDays = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  const ql = q.trim().toLowerCase();
  let rows = state.signups.filter(s => {
    if (rangeDays && now - new Date(s.signedUpAt).getTime() > rangeDays * DAY) return false;
    if (source !== 'all' && s.source !== source) return false;
    if (plan !== 'all' && s.plan !== plan) return false;
    if (status !== 'all' && s.status !== status) return false;
    if (ql && !(`${s.company} ${s.contact} ${s.email} ${s.industry}`.toLowerCase().includes(ql))) return false;
    return true;
  });
  rows = rows.slice();
  if (sort === 'mrr') rows.sort((a, b) => (b.mrr || 0) - (a.mrr || 0));
  else if (sort === 'seats') rows.sort((a, b) => (b.seats || 0) - (a.seats || 0));
  else if (sort === 'company') rows.sort((a, b) => a.company.localeCompare(b.company));
  else rows.sort((a, b) => (a.signedUpAt < b.signedUpAt ? 1 : -1));
  return rows;
}

/* ---------- writes ---------- */
export function recordSignup(payload = {}) {
  const now = new Date();
  const seats = Number(payload.seats) || Number(digits(payload.seats)) || 1;
  const plan = payload.plan || (seats >= 200 ? 'enterprise' : seats >= 75 ? 'scale' : seats >= 25 ? 'growth' : 'starter');
  const company = String(payload.company || payload.companyName || 'New company').trim() || 'New company';
  const status = payload.status || 'trial';
  const row = {
    id: 'su_' + now.getTime(),
    company,
    contact: String(payload.contact || payload.name || 'New user').trim(),
    email: String(payload.email || '').trim(),
    industry: payload.industry || 'Other',
    seats,
    plan,
    mrr: status === 'lead' ? 0 : mrrFor(plan, seats),
    source: payload.source || 'liftoff',
    status,
    signedUpAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    isNew: true,
  };
  // Dedupe: same company + email within the store updates rather than duplicates.
  const existing = state.signups.find(s => s.email && s.email === row.email && s.company === row.company);
  if (existing) {
    commit({ ...state, signups: state.signups.map(s => s === existing ? { ...s, ...row, id: existing.id, signedUpAt: existing.signedUpAt } : s) });
    return existing.id;
  }
  commit({ ...state, signups: [row, ...state.signups] });
  return row.id;
}
function digits(v) { const m = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return m ? parseInt(m, 10) : null; }

export function setStatus(id, status) {
  commit({ ...state, signups: state.signups.map(s => s.id === id ? { ...s, status, mrr: status === 'lead' ? 0 : mrrFor(s.plan, s.seats) } : s) });
}
export function removeSignup(id) { commit({ ...state, signups: state.signups.filter(s => s.id !== id) }); }
export function resetAdmin() { commit(buildSeed()); }

/* ---------- react hook ---------- */
import { useState, useEffect } from 'react';
export function useAdmin(selector = (s) => s) {
  const [v, setV] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setV(() => selector(s));
    subs.add(fn);
    fn(state);
    return () => subs.delete(fn);
  }, []);
  return v;
}

/* ---------- live intake: Liftoff + SignUp dispatch window 'rally:signup' ---------- */
if (typeof window !== 'undefined' && !window.__rallyAdminBound) {
  window.__rallyAdminBound = true;
  try {
    window.addEventListener('rally:signup', (e) => {
      try { if (e && e.detail) recordSignup(e.detail); } catch {}
    });
  } catch {}
}
