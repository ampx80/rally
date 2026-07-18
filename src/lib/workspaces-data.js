// ============================================================
// ARDOVO WORKSPACES DATA  (agency sub-accounts + white-label + rebilling)
// The distribution layer. Every Ardovo customer can run Ardovo AS an
// agency: spin up client sub-accounts, resell under their own brand
// (custom domain, logo, colors, product name, login page), and mark
// up usage (messaging, AI, calls) for margin. This is the wedge that
// turns one customer into a channel - the thing GoHighLevel is kept
// around for that HubSpot has no answer to.
//
// Local-first, deterministic seed (mulberry32, fixed integer), own
// localStorage namespace, tiny pub/sub that mirrors store.js so
// components re-render on write. Nothing here touches the core store.
// SUPABASE: rally_agency (1 row per reseller), rally_workspaces,
// rally_snapshots, rally_rebilling_config.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_workspaces_v1';

/* ---------- deterministic PRNG (same shape as store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */

// Resale plans the agency sells to its clients. price = what the CLIENT
// pays the agency each month. wholesale = what the agency pays Ardovo for
// that seat tier. The gap is the subscription margin.
// SUPABASE: rally_plans (per agency, resale price is agency-editable).
export const PLANS = [
  { id: 'starter', name: 'Starter', price: 97, wholesale: 29, seats: 3, color: 'var(--n-600)' },
  { id: 'growth', name: 'Growth', price: 297, wholesale: 79, seats: 10, color: 'var(--accent)' },
  { id: 'scale', name: 'Scale', price: 597, wholesale: 149, seats: 25, color: 'var(--accent-teal)' },
];
export const planById = (id) => PLANS.find(p => p.id === id) || PLANS[0];

// Ardovo wholesale unit cost (what the agency pays for usage). The agency
// sets a markup multiplier per meter; the client is billed base * markup.
// SUPABASE: rally_meter_rates (platform-set) + rally_rebilling_config.
export const METERS = [
  { id: 'messaging', name: 'Messaging', unit: 'msg', base: 0.008, icon: 'send', color: 'var(--accent)' },
  { id: 'ai', name: 'AI credits', unit: 'credit', base: 0.015, icon: 'sparkles', color: 'var(--accent-purple)' },
  { id: 'calls', name: 'Voice calls', unit: 'min', base: 0.020, icon: 'phone', color: 'var(--accent-teal)' },
];
export const meterById = (id) => METERS.find(m => m.id === id);

export const STATUSES = {
  active: { label: 'Active', tone: 'ok' },
  trial: { label: 'Trial', tone: 'info' },
  paused: { label: 'Paused', tone: 'warn' },
};

/* pools for the seeded book of client workspaces */
const CLIENTS = [
  { name: 'Summit Dental Group', industry: 'Healthcare' },
  { name: 'Riverside Fitness Co', industry: 'Fitness' },
  { name: 'Bloom Med Spa', industry: 'Wellness' },
  { name: 'Apex Roofing', industry: 'Home Services' },
  { name: 'Coastal Law Partners', industry: 'Legal' },
  { name: 'Green Valley Landscaping', industry: 'Home Services' },
  { name: 'Bright Smile Orthodontics', industry: 'Healthcare' },
  { name: 'Ironpeak Gym', industry: 'Fitness' },
  { name: 'Harbor Realty Group', industry: 'Real Estate' },
  { name: 'Nova HVAC Services', industry: 'Home Services' },
  { name: 'Lumen Aesthetics', industry: 'Wellness' },
  { name: 'Cedar and Co Salon', industry: 'Beauty' },
];
const OWNERS = ['Jordan Avery', 'Simone Diaz', 'Theo Bennett', 'Nina Kapoor'];
const CARD_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#2563a8', '#8b3fd4', '#1a7f52', '#c0392b', '#d4a017'];

function initialsOf(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const now = Date.now();
  const DAY = 86400000;
  const daysAgo = (d) => new Date(now - d * DAY).toISOString();

  // The reseller agency. This is "you" running Ardovo as your own product.
  const agency = {
    name: 'Northbeam Growth Partners',
    productName: 'Northbeam CRM',
    domain: 'app.northbeam.io',
    supportEmail: 'support@northbeam.io',
    accent: '#5b4bf5',
    logoText: 'NB',
    logoColor: '#5b4bf5',
    loginHeadline: 'Sign in to Northbeam CRM',
    loginSubtext: 'Your growth command center.',
    rebill: { messaging: 2.5, ai: 3.0, calls: 2.0 },
    liveDomain: true,
  };

  // Reusable configuration snapshots. Conceptually these are Genesis
  // blueprints scoped to a whole workspace: pipelines + automations +
  // templates + dashboards saved once, deployed into any new client in
  // one click. deployCount proves the leverage.
  const snapshots = [
    { id: 'snap_medspa', name: 'Med Spa Launch Kit', blueprint: 'genesis:med-spa', featured: true,
      description: 'Booking-to-rebook pipeline, no-show winback, review requests, membership upsell. The whole aesthetics playbook, prewired.',
      includes: { pipelines: 3, automations: 9, templates: 14, dashboards: 4, sequences: 6 }, deployCount: 7, createdAt: daysAgo(120) },
    { id: 'snap_homeserv', name: 'Home Services Engine', blueprint: 'genesis:home-services',
      description: 'Speed-to-lead SMS, estimate follow-up, job-done review ask, seasonal reactivation. Built for roofers, HVAC, landscaping.',
      includes: { pipelines: 2, automations: 11, templates: 10, dashboards: 3, sequences: 5 }, deployCount: 5, createdAt: daysAgo(96) },
    { id: 'snap_fitness', name: 'Fitness Membership Flow', blueprint: 'genesis:fitness',
      description: 'Trial-to-member nurture, class reminders, churn-risk radar, referral loop. Turns a gym into a retention machine.',
      includes: { pipelines: 2, automations: 8, templates: 9, dashboards: 3, sequences: 4 }, deployCount: 4, createdAt: daysAgo(64) },
    { id: 'snap_pro', name: 'Professional Services Base', blueprint: 'genesis:pro-services',
      description: 'Consult booking, proposal-to-signature pipeline, matter intake, quarterly check-in. Law, accounting, agencies.',
      includes: { pipelines: 3, automations: 7, templates: 12, dashboards: 4, sequences: 5 }, deployCount: 3, createdAt: daysAgo(38) },
  ];
  const snapIds = snapshots.map(s => s.id);

  // The client sub-accounts. Each carries its own health, plan, usage,
  // and last-activity so the agency grid reads like a real book.
  const workspaces = CLIENTS.map((c, i) => {
    const status = i === 0 ? 'active' : chance(0.14) ? 'trial' : chance(0.1) ? 'paused' : 'active';
    const plan = pick(['starter', 'growth', 'growth', 'scale', 'growth', 'scale']);
    const p = planById(plan);
    const health = status === 'paused' ? 'red' : pick(['green', 'green', 'green', 'yellow', 'yellow', 'red']);
    const seatsUsed = Math.min(p.seats, range(1, p.seats));
    // usage scales loosely with plan tier so bigger clients bill more.
    const mult = plan === 'scale' ? 1.9 : plan === 'growth' ? 1 : 0.45;
    const usage = {
      messaging: Math.round(range(4000, 26000) * mult),
      ai: Math.round(range(900, 7200) * mult),
      calls: Math.round(range(300, 3400) * mult),
    };
    // a 6-point monthly volume trend for the sparkline (deterministic walk)
    const trend = [];
    let v = range(40, 70);
    for (let k = 0; k < 6; k++) { v = Math.max(18, Math.min(100, v + range(-12, 16))); trend.push(v); }
    return {
      id: `ws_${i + 1}`,
      name: c.name,
      industry: c.industry,
      planId: plan,
      status,
      health,
      seats: p.seats,
      seatsUsed,
      usage,
      trend,
      contacts: range(180, 4200),
      deals: range(6, 90),
      automations: range(3, 14),
      ownerName: pick(OWNERS),
      color: CARD_COLORS[i % CARD_COLORS.length],
      domain: i % 3 === 0 ? `crm.${c.name.toLowerCase().replace(/[^a-z]+/g, '')}.com` : '',
      snapshotId: pick(snapIds),
      lastActivityAt: daysAgo(range(0, status === 'paused' ? 40 : 9)),
      createdAt: daysAgo(range(20, 340)),
    };
  });

  return { seededAt: new Date(now).toISOString(), agency, snapshots, workspaces };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors store.js / territory-data.js)
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
export function getWorkspacesState() { return state; }
export function resetWorkspaces() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useWorkspacesStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getAgency = () => state.agency;
export const getWorkspaces = () => state.workspaces;
export const getWorkspace = (id) => state.workspaces.find(w => w.id === id);
export const getSnapshots = () => state.snapshots;
export const getSnapshot = (id) => state.snapshots.find(s => s.id === id);

/* ============================================================
   REBILLING ECONOMICS  (pure derivations, per workspace + rollup)
   ============================================================ */

// What the agency pays Ardovo for this client's usage this month.
export function baseUsageCost(ws) {
  if (!ws) return 0;
  return METERS.reduce((s, m) => s + (ws.usage?.[m.id] || 0) * m.base, 0);
}
// What the client is billed for usage (base * the agency markup).
export function billedUsage(ws, rebill = state.agency.rebill) {
  if (!ws) return 0;
  return METERS.reduce((s, m) => s + (ws.usage?.[m.id] || 0) * m.base * (rebill?.[m.id] ?? 1), 0);
}
// Per-meter breakdown for the detail view + margin table.
export function usageBreakdown(ws, rebill = state.agency.rebill) {
  return METERS.map(m => {
    const units = ws?.usage?.[m.id] || 0;
    const base = units * m.base;
    const markup = rebill?.[m.id] ?? 1;
    const billed = base * markup;
    return { ...m, units, base, markup, billed, margin: billed - base };
  });
}

// Full monthly economics for one client workspace.
export function workspaceEconomics(ws, rebill = state.agency.rebill) {
  const plan = planById(ws.planId);
  const subRevenue = plan.price;
  const usageRevenue = billedUsage(ws, rebill);
  const mrr = subRevenue + usageRevenue;
  const rallyCost = plan.wholesale + baseUsageCost(ws);
  const margin = mrr - rallyCost;
  const marginPct = mrr > 0 ? Math.round((margin / mrr) * 100) : 0;
  return { plan, subRevenue, usageRevenue, mrr, rallyCost, margin, marginPct, usageMargin: usageRevenue - baseUsageCost(ws) };
}

// Agency-wide rollup across billable (active + trial) workspaces.
export function agencyRollup(rebill = state.agency.rebill) {
  const billable = state.workspaces.filter(w => w.status !== 'paused');
  let mrr = 0, rallyCost = 0, subRevenue = 0, usageRevenue = 0;
  for (const w of billable) {
    const e = workspaceEconomics(w, rebill);
    mrr += e.mrr; rallyCost += e.rallyCost; subRevenue += e.subRevenue; usageRevenue += e.usageRevenue;
  }
  const margin = mrr - rallyCost;
  const marginPct = mrr > 0 ? Math.round((margin / mrr) * 100) : 0;
  const health = { green: 0, yellow: 0, red: 0 };
  for (const w of state.workspaces) health[w.health] = (health[w.health] || 0) + 1;
  return {
    count: state.workspaces.length,
    billable: billable.length,
    trial: state.workspaces.filter(w => w.status === 'trial').length,
    paused: state.workspaces.filter(w => w.status === 'paused').length,
    mrr, arr: mrr * 12, rallyCost, subRevenue, usageRevenue, margin, marginPct,
    health,
  };
}

/* ============================================================
   WRITE API  (validated writers, return record or { error, message })
   ============================================================ */

// Create a client sub-account, optionally deploying a snapshot into it.
// SUPABASE: from('rally_workspaces').insert(row); if snapshot, clone its
// pipelines/automations/templates/dashboards into the new workspace.
export function createWorkspace({ name, industry = 'Other', planId = 'growth', snapshotId = null, status = 'trial', ownerName }) {
  if (!name || !name.trim()) return { error: 'name', message: 'A workspace name is required.' };
  const p = planById(planId);
  const idx = state.workspaces.length;
  const ws = {
    id: newId('ws'),
    name: name.trim(),
    industry,
    planId: p.id,
    status,
    health: 'green',
    seats: p.seats,
    seatsUsed: 1,
    usage: { messaging: 0, ai: 0, calls: 0 },
    trend: [22, 24, 26, 30, 34, 40],
    contacts: 0,
    deals: 0,
    automations: snapshotId ? (getSnapshot(snapshotId)?.includes.automations || 0) : 0,
    ownerName: ownerName || OWNERS[0],
    color: CARD_COLORS[idx % CARD_COLORS.length],
    domain: '',
    snapshotId: snapshotId || null,
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  let snapshots = state.snapshots;
  if (snapshotId) {
    snapshots = snapshots.map(s => (s.id === snapshotId ? { ...s, deployCount: (s.deployCount || 0) + 1 } : s));
  }
  commit({ ...state, workspaces: [ws, ...state.workspaces], snapshots });
  return { workspace: ws };
}

// Clone an existing client (same plan + config, fresh empty book).
export function cloneWorkspace(id) {
  const src = getWorkspace(id);
  if (!src) return { error: 'missing', message: 'Workspace not found.' };
  const idx = state.workspaces.length;
  const ws = {
    ...src,
    id: newId('ws'),
    name: `${src.name} (Copy)`,
    status: 'trial',
    health: 'green',
    seatsUsed: 1,
    usage: { messaging: 0, ai: 0, calls: 0 },
    trend: [20, 22, 25, 28, 33, 38],
    contacts: 0,
    deals: 0,
    domain: '',
    color: CARD_COLORS[idx % CARD_COLORS.length],
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, workspaces: [ws, ...state.workspaces] });
  return { workspace: ws };
}

export function updateWorkspace(id, patch) {
  const ws = getWorkspace(id);
  if (!ws) return { error: 'missing', message: 'Workspace not found.' };
  const workspaces = state.workspaces.map(w => (w.id === id ? { ...w, ...patch } : w));
  commit({ ...state, workspaces });
  return { workspace: workspaces.find(w => w.id === id) };
}
export function setWorkspacePlan(id, planId) {
  const p = planById(planId);
  return updateWorkspace(id, { planId: p.id, seats: p.seats });
}
export function setWorkspaceStatus(id, status) {
  return updateWorkspace(id, { status, health: status === 'paused' ? 'red' : getWorkspace(id)?.health });
}
// SUPABASE: from('rally_workspaces').delete().eq('id', id) (soft-delete in prod).
export function deleteWorkspace(id) {
  const ws = getWorkspace(id);
  if (!ws) return { error: 'missing', message: 'Workspace not found.' };
  commit({ ...state, workspaces: state.workspaces.filter(w => w.id !== id) });
  return { ok: true, id };
}

// White-label + branding. Patch the single agency config row.
export function updateAgency(patch) {
  commit({ ...state, agency: { ...state.agency, ...patch } });
  return { agency: state.agency };
}
// Rebilling markup multipliers (per meter). Clamped to a sane range.
export function updateRebill(patch) {
  const rebill = { ...state.agency.rebill };
  for (const [k, v] of Object.entries(patch)) {
    const n = Number(v);
    if (Number.isFinite(n)) rebill[k] = Math.max(1, Math.min(6, Math.round(n * 100) / 100));
  }
  commit({ ...state, agency: { ...state.agency, rebill } });
  return { rebill };
}

// Save the current live workspace configuration as a reusable snapshot.
// SUPABASE: insert rally_snapshots with a serialized config payload.
export function saveSnapshot({ name, description, includes }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Name the snapshot.' };
  const snap = {
    id: newId('snap'),
    name: name.trim(),
    blueprint: 'genesis:custom',
    description: (description || '').trim() || 'A saved workspace configuration ready to deploy into any new client.',
    includes: includes || { pipelines: 2, automations: 6, templates: 8, dashboards: 3, sequences: 4 },
    deployCount: 0,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, snapshots: [snap, ...state.snapshots] });
  return { snapshot: snap };
}
