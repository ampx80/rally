// ============================================================
// RALLY LEADS DATA  (local-first, deterministic)
// Owns the inbound/outbound lead book + the AI lead-scoring model.
// Seeds ~24 believable leads on first run, persists mutations to
// localStorage so the workspace stays alive across reloads.
// SUPABASE: rally_leads table; scoring runs as an edge function.
// ============================================================
import { getCompanies } from './store.js';

const LS_KEY = 'rally_leads_v1'; // bump to force a clean reseed

/* ---------- deterministic PRNG (mulberry32) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- config pools ---------- */
export const LEAD_STATUSES = ['New', 'Working', 'Qualified', 'Unqualified'];

// Source quality weights (0..1) drive part of the score.
export const SOURCES = {
  'Demo request': 0.98,
  'Referral': 0.92,
  'Webinar': 0.72,
  'Content download': 0.6,
  'Web form': 0.66,
  'Cold outbound': 0.34,
  'Event booth': 0.7,
  'Partner': 0.82,
  'LinkedIn': 0.5,
  'Pricing page': 0.9,
};
const SOURCE_KEYS = Object.keys(SOURCES);

// Title seniority weights (0..1). Higher = more buying authority.
const SENIORITY = [
  [/chief|cxo|ceo|cfo|coo|cro|cto|cmo|founder|owner|president/i, 1.0],
  [/vp|vice president|svp|head of/i, 0.85],
  [/director/i, 0.68],
  [/senior manager|principal|lead/i, 0.55],
  [/manager/i, 0.45],
  [/analyst|coordinator|specialist|associate/i, 0.28],
];
export function seniorityScore(title = '') {
  for (const [re, w] of SENIORITY) if (re.test(title)) return w;
  return 0.35;
}

// Company size buckets to a 0..1 weight (bigger = more ACV potential).
const SIZE_WEIGHT = { '1-50': 0.35, '51-200': 0.55, '201-500': 0.7, '501-1000': 0.82, '1001-5000': 0.92, '5000+': 1.0 };
export function sizeScore(size = '') { return SIZE_WEIGHT[size] ?? 0.5; }

// Recency: fresher leads score higher (decays over ~21 days).
export function recencyScore(createdAt) {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  if (days <= 1) return 1.0;
  if (days >= 21) return 0.2;
  return 1 - (days / 21) * 0.8;
}

/* ============================================================
   THE AI LEAD SCORE
   Deterministic weighted blend of five signals -> 0..100, plus a
   human-readable "why this score" breakdown of each contribution.
   ============================================================ */
const WEIGHTS = { seniority: 26, size: 20, source: 24, recency: 14, engagement: 16 };

export function scoreLead(lead) {
  const sen = seniorityScore(lead.title);
  const siz = sizeScore(lead.companySize);
  const src = SOURCES[lead.source] ?? 0.5;
  const rec = recencyScore(lead.createdAt);
  const eng = Math.max(0, Math.min(1, (lead.engagement ?? 0) / 10));

  const parts = [
    { key: 'seniority', label: 'Title seniority', detail: lead.title || 'Unknown title', pct: sen, points: sen * WEIGHTS.seniority, max: WEIGHTS.seniority },
    { key: 'size', label: 'Company size', detail: lead.companySize || 'Unknown size', pct: siz, points: siz * WEIGHTS.size, max: WEIGHTS.size },
    { key: 'source', label: 'Source quality', detail: lead.source, pct: src, points: src * WEIGHTS.source, max: WEIGHTS.source },
    { key: 'recency', label: 'Recency', detail: `${Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)}d old`, pct: rec, points: rec * WEIGHTS.recency, max: WEIGHTS.recency },
    { key: 'engagement', label: 'Engagement', detail: `${lead.engagement ?? 0} touches`, pct: eng, points: eng * WEIGHTS.engagement, max: WEIGHTS.engagement },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.points, 0));
  return { score: Math.max(1, Math.min(100, score)), parts };
}

export function scoreBand(score) {
  if (score >= 80) return { label: 'Hot', tone: 'risk', color: 'var(--risk)' };
  if (score >= 60) return { label: 'Warm', tone: 'warn', color: 'var(--warn)' };
  if (score >= 40) return { label: 'Cool', tone: 'info', color: 'var(--accent)' };
  return { label: 'Cold', tone: 'default', color: 'var(--n-400)' };
}

/* ============================================================
   SEED  (~24 leads, deterministic)
   ============================================================ */
const FIRST = ['Ava', 'Marcus', 'Priya', 'Diego', 'Hannah', 'Wei', 'Fatima', 'Owen', 'Sofia', 'Ethan', 'Zoe', 'Raj', 'Chloe', 'Kenji', 'Amara', 'Liam', 'Nora', 'Andre', 'Bianca', 'Tomas', 'Grace', 'Ivan', 'Mila', 'Cole'];
const LAST = ['Chen', 'Patel', 'Reyes', 'Kim', 'Okafor', 'Muller', 'Rossi', 'Larsen', 'Silva', 'Bennett', 'Foster', 'Haddad', 'Novak', 'Tanaka', 'Frost', 'Vance', 'Ortiz', 'Brooks', 'Mercer', 'Castillo', 'Ellison', 'Sullivan', 'Fischer', 'Kowalski'];
const TITLES = ['VP of Sales', 'Chief Revenue Officer', 'Director of Operations', 'Head of Procurement', 'CFO', 'Director of IT', 'VP Marketing', 'Operations Manager', 'Sales Analyst', 'Head of Finance', 'COO', 'Procurement Specialist', 'Director of Sales', 'RevOps Manager', 'VP Engineering', 'Marketing Coordinator'];
const CO_A = ['Vertex', 'Northwind', 'Meridian', 'Apex', 'Cobalt', 'Summit', 'Beacon', 'Cascade', 'Lumen', 'Vantage', 'Keystone', 'Pinnacle', 'Redwood', 'Fathom', 'Harbor', 'Juniper', 'Monarch', 'Nimbus', 'Solstice', 'Zenith'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Freight', 'Retail', 'Analytics', 'Networks', 'Bioscience', 'Foods', 'Solutions', 'Dynamics'];
const SIZES = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

function buildSeed() {
  const rnd = mulberry32(9070826);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;

  // Anchor a few leads to real companies in the book so conversion feels connected.
  const cos = getCompanies();
  const leads = [];
  const usedName = new Set();

  for (let i = 0; i < 24; i++) {
    const anchor = i < 6 && cos[i] ? cos[i] : null;
    let first, last, key;
    do { first = pick(FIRST); last = pick(LAST); key = first + last; } while (usedName.has(key));
    usedName.add(key);

    const coName = anchor ? anchor.name : `${pick(CO_A)} ${pick(CO_B)}`;
    const domain = anchor ? anchor.domain : coName.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    const companySize = anchor ? anchor.size : pick(SIZES);
    const source = pick(SOURCE_KEYS);
    const title = pick(TITLES);
    const createdAt = new Date(now - range(0, 26) * DAY - range(0, 23) * 3600000).toISOString();

    leads.push({
      id: `lead_${i + 1}`,
      firstName: first,
      lastName: last,
      name: `${first} ${last}`,
      title,
      company: coName,
      companyId: anchor ? anchor.id : null,
      companySize,
      source,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      phone: `(${range(200, 989)}) ${range(200, 989)}-${String(range(1000, 9999))}`,
      engagement: range(0, 10),
      status: pick(['New', 'New', 'New', 'Working', 'Working', 'Qualified', 'Unqualified']),
      createdAt,
    });
  }
  return { seededAt: new Date(now).toISOString(), leads };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let cache = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  cache = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch {}
  subs.forEach(fn => fn(cache.leads));
}

export function getLeads() { return cache.leads; }
export function subscribeLeads(fn) { subs.add(fn); return () => subs.delete(fn); }

let idc = Date.now();
const newId = () => `lead_${(idc++).toString(36)}`;

export function setLeadStatus(id, status) {
  const next = cache.leads.map(l => l.id === id ? { ...l, status } : l);
  commit({ ...cache, leads: next });
}

export function removeLead(id) {
  commit({ ...cache, leads: cache.leads.filter(l => l.id !== id) });
}

// Inject a fresh, high-quality lead (web-to-lead simulate button).
const SIM_FIRST = ['Dana', 'Elias', 'Naomi', 'Reza', 'Yuki', 'Paulo', 'Ingrid', 'Sana'];
const SIM_LAST = ['Whitfield', 'Ahmed', 'Berg', 'Costa', 'Delgado', 'Fournier', 'Grant', 'Holt'];
const SIM_TITLES = ['VP of Revenue', 'Chief Operating Officer', 'Director of Procurement', 'Head of Sales', 'VP Operations'];
export function simulateInboundLead() {
  const rnd = mulberry32((Date.now() & 0xffffff) ^ 0x51ac);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const first = pick(SIM_FIRST), last = pick(SIM_LAST);
  const coName = `${pick(CO_A)} ${pick(CO_B)}`;
  const domain = coName.toLowerCase().replace(/[^a-z]/g, '') + '.com';
  const lead = {
    id: newId(),
    firstName: first, lastName: last, name: `${first} ${last}`,
    title: pick(SIM_TITLES),
    company: coName, companyId: null,
    companySize: pick(['501-1000', '1001-5000', '5000+']),
    source: pick(['Demo request', 'Pricing page', 'Referral']),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    phone: `(${range(200, 989)}) ${range(200, 989)}-${String(range(1000, 9999))}`,
    engagement: range(4, 10),
    status: 'New',
    createdAt: new Date().toISOString(),
  };
  commit({ ...cache, leads: [lead, ...cache.leads] });
  return lead;
}
