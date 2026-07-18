// ============================================================
// ARDOVO MARKETPLACE  (local-first, deterministic)
// The app ecosystem for Ardovo. A curated directory of installable
// integrations plus a real install store: one click flips an app
// to "Connected", persists to localStorage, and every surface that
// reads the store re-renders. An ecosystem is a moat - this is the
// module that makes Ardovo extensible and sticky.
//
// TDZ SAFETY: the catalog is enriched at module-eval time (APPS =
// buildCatalog()). Every helper it calls (mulberry32, luminance,
// textOn, deterministicStats, buildCatalog) is a HOISTED function
// declaration defined above the eval, never a const arrow. Do not
// convert these to arrows.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_marketplace_v1';   // bump to reset installs

/* ---------- deterministic PRNG (mirror of store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Relative luminance of a #rrggbb string, used to choose readable
   monogram text on a brand-colored tile (WCAG-ish). Hoisted. */
function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function textOn(hex) {
  try { return luminance(hex) > 0.62 ? '#0e1116' : '#ffffff'; } catch { return '#ffffff'; }
}

/* ============================================================
   CATEGORIES
   ============================================================ */
export const CATEGORIES = [
  { id: 'all', label: 'All apps', icon: 'grid', color: 'var(--accent)', blurb: 'Everything in the Ardovo ecosystem.' },
  { id: 'crm', label: 'CRM & Sales', icon: 'users', color: '#2563a8', blurb: 'Sync your book of business across every system of record.' },
  { id: 'comms', label: 'Comms', icon: 'messages', color: '#a855f7', blurb: 'Email, chat, voice and SMS, unified on the timeline.' },
  { id: 'payments', label: 'Payments', icon: 'dollar', color: '#1a7f52', blurb: 'Invoicing, billing and revenue recognition.' },
  { id: 'analytics', label: 'Analytics', icon: 'chart', color: '#b3721a', blurb: 'Product data and BI, joined to revenue.' },
  { id: 'productivity', label: 'Productivity', icon: 'checkSquare', color: '#0ea5a3', blurb: 'Calendars, docs, files and signatures.' },
  { id: 'ai', label: 'AI', icon: 'sparkles', color: '#5b4bf5', blurb: 'Models and copilots that plug into Rook.' },
  { id: 'vertical', label: 'Vertical', icon: 'layers', color: '#c0392b', blurb: 'Commerce, support and industry-specific tools.' },
];
export const catById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

/* ============================================================
   RAW CATALOG  (curated, brand-accurate)
   pricing kinds: 'free' | 'freemium' | 'paid' | 'usage' | 'native'
   ============================================================ */
const RAW = [
  // ---- Comms ----
  { id: 'slack', name: 'Slack', cat: 'comms', color: '#611f69', mono: 'SL', dev: 'Salesforce', pricing: 'freemium', blurb: 'Push deal alerts, win rooms and Rook briefings into channels.', tags: ['messaging', 'alerts'], featured: true },
  { id: 'gmail', name: 'Gmail', cat: 'comms', color: '#ea4335', mono: 'GM', dev: 'Google', pricing: 'free', blurb: 'Two-way email sync with auto-logging to the timeline.', tags: ['email', 'sync'], featured: true },
  { id: 'teams', name: 'Microsoft Teams', cat: 'comms', color: '#5059c9', mono: 'MT', dev: 'Microsoft', pricing: 'freemium', blurb: 'Meeting notes and call summaries flow straight to the deal.', tags: ['meetings', 'chat'] },
  { id: 'zoom', name: 'Zoom', cat: 'comms', color: '#2d8cff', mono: 'ZM', dev: 'Zoom Video', pricing: 'freemium', blurb: 'Record, transcribe and auto-summarize every sales call.', tags: ['video', 'meetings'], featured: true },
  { id: 'twilio', name: 'Twilio', cat: 'comms', color: '#f22f46', mono: 'TW', dev: 'Twilio', pricing: 'usage', blurb: 'Programmable SMS and voice for sequences and alerts.', tags: ['sms', 'voice'] },
  { id: 'intercom', name: 'Intercom', cat: 'comms', color: '#1f8ded', mono: 'IC', dev: 'Intercom', pricing: 'paid', blurb: 'Bring live chat conversations onto the contact record.', tags: ['chat', 'support'] },
  { id: 'front', name: 'Front', cat: 'comms', color: '#a857f5', mono: 'FR', dev: 'Front', pricing: 'paid', blurb: 'Shared inbox threads attached to the right account.', tags: ['inbox', 'email'] },
  { id: 'whatsapp', name: 'WhatsApp Business', cat: 'comms', color: '#25d366', mono: 'WA', dev: 'Meta', pricing: 'usage', blurb: 'Reach buyers on the channel they actually answer.', tags: ['messaging', 'mobile'] },

  // ---- Payments ----
  { id: 'stripe', name: 'Stripe', cat: 'payments', color: '#635bff', mono: 'ST', dev: 'Stripe', pricing: 'usage', blurb: 'Collect payment on closed-won and reconcile MRR live.', tags: ['payments', 'billing'], featured: true },
  { id: 'quickbooks', name: 'QuickBooks', cat: 'payments', color: '#2ca01c', mono: 'QB', dev: 'Intuit', pricing: 'paid', blurb: 'Push invoices to the ledger the moment a deal is won.', tags: ['accounting', 'invoices'], featured: true },
  { id: 'xero', name: 'Xero', cat: 'payments', color: '#13b5ea', mono: 'XE', dev: 'Xero', pricing: 'paid', blurb: 'Cloud accounting sync for invoices and paid status.', tags: ['accounting'] },
  { id: 'paypal', name: 'PayPal', cat: 'payments', color: '#003087', mono: 'PP', dev: 'PayPal', pricing: 'usage', blurb: 'Accept deposits and one-off payments on quotes.', tags: ['payments'] },
  { id: 'chargebee', name: 'Chargebee', cat: 'payments', color: '#ff7846', mono: 'CB', dev: 'Chargebee', pricing: 'paid', blurb: 'Subscription billing and dunning tied to deal stage.', tags: ['subscriptions', 'billing'] },
  { id: 'billcom', name: 'Bill', cat: 'payments', color: '#1a73e8', mono: 'BL', dev: 'BILL', pricing: 'paid', blurb: 'AP and AR automation wired to your revenue events.', tags: ['ap', 'ar'] },

  // ---- Analytics ----
  { id: 'segment', name: 'Segment', cat: 'analytics', color: '#52bd94', mono: 'SG', dev: 'Twilio', pricing: 'paid', blurb: 'Stream product events onto accounts to score intent.', tags: ['cdp', 'events'], featured: true },
  { id: 'ga', name: 'Google Analytics', cat: 'analytics', color: '#e8710a', mono: 'GA', dev: 'Google', pricing: 'free', blurb: 'Attribute web sessions to pipeline and closed revenue.', tags: ['web', 'attribution'] },
  { id: 'mixpanel', name: 'Mixpanel', cat: 'analytics', color: '#7856ff', mono: 'MP', dev: 'Mixpanel', pricing: 'freemium', blurb: 'Product usage signals that flag expansion and churn risk.', tags: ['product', 'events'] },
  { id: 'amplitude', name: 'Amplitude', cat: 'analytics', color: '#1f6fff', mono: 'AM', dev: 'Amplitude', pricing: 'freemium', blurb: 'Behavioral cohorts pushed to the customer success view.', tags: ['product', 'cohorts'] },
  { id: 'looker', name: 'Looker', cat: 'analytics', color: '#4285f4', mono: 'LK', dev: 'Google Cloud', pricing: 'paid', blurb: 'Embed governed BI dashboards next to your reports.', tags: ['bi', 'dashboards'] },
  { id: 'tableau', name: 'Tableau', cat: 'analytics', color: '#1f457e', mono: 'TB', dev: 'Salesforce', pricing: 'paid', blurb: 'Send Ardovo datasets to Tableau for deep exploration.', tags: ['bi', 'viz'] },

  // ---- Productivity ----
  { id: 'gcal', name: 'Google Calendar', cat: 'productivity', color: '#4285f4', mono: 'GC', dev: 'Google', pricing: 'free', blurb: 'Two-way calendar sync with automatic meeting logging.', tags: ['calendar', 'sync'], featured: true },
  { id: 'calendly', name: 'Calendly', cat: 'productivity', color: '#006bff', mono: 'CL', dev: 'Calendly', pricing: 'freemium', blurb: 'Round-robin booking links that create the deal for you.', tags: ['scheduling'] },
  { id: 'notion', name: 'Notion', cat: 'productivity', color: '#111111', mono: 'NO', dev: 'Notion Labs', pricing: 'freemium', blurb: 'Sync account plans and notes to your Notion workspace.', tags: ['docs', 'notes'] },
  { id: 'asana', name: 'Asana', cat: 'productivity', color: '#f06a6a', mono: 'AS', dev: 'Asana', pricing: 'freemium', blurb: 'Spin up onboarding tasks the instant a deal closes.', tags: ['tasks', 'projects'] },
  { id: 'trello', name: 'Trello', cat: 'productivity', color: '#0079bf', mono: 'TR', dev: 'Atlassian', pricing: 'freemium', blurb: 'Mirror deal stages onto a Trello board for delivery.', tags: ['tasks', 'kanban'] },
  { id: 'airtable', name: 'Airtable', cat: 'productivity', color: '#fcb400', mono: 'AT', dev: 'Airtable', pricing: 'freemium', blurb: 'Sync any object to a flexible Airtable base.', tags: ['database', 'sync'] },
  { id: 'dropbox', name: 'Dropbox', cat: 'productivity', color: '#0061ff', mono: 'DB', dev: 'Dropbox', pricing: 'freemium', blurb: 'Attach contracts and collateral straight from Dropbox.', tags: ['files', 'storage'] },
  { id: 'docusign', name: 'DocuSign', cat: 'productivity', color: '#d4472b', mono: 'DS', dev: 'DocuSign', pricing: 'paid', blurb: 'Send, track and countersign contracts without leaving Ardovo.', tags: ['esign', 'contracts'], featured: true },
  { id: 'zapier', name: 'Zapier', cat: 'productivity', color: '#ff4a00', mono: 'ZP', dev: 'Zapier', pricing: 'freemium', blurb: 'Connect Ardovo to 7,000+ apps with no-code automations.', tags: ['automation', 'nocode'], featured: true },

  // ---- AI ----
  { id: 'openai', name: 'OpenAI', cat: 'ai', color: '#10a37f', mono: 'OA', dev: 'OpenAI', pricing: 'usage', blurb: 'Bring GPT models to Rook for drafting and enrichment.', tags: ['llm', 'copilot'], featured: true },
  { id: 'anthropic', name: 'Anthropic Claude', cat: 'ai', color: '#d97757', mono: 'AN', dev: 'Anthropic', pricing: 'usage', blurb: 'Route Rook reasoning through Claude for long-context work.', tags: ['llm', 'copilot'], featured: true },
  { id: 'perplexity', name: 'Perplexity', cat: 'ai', color: '#20808d', mono: 'PX', dev: 'Perplexity', pricing: 'freemium', blurb: 'Live web research on accounts, cited inline for reps.', tags: ['research', 'search'] },
  { id: 'elevenlabs', name: 'ElevenLabs', cat: 'ai', color: '#1a1a2e', mono: 'EL', dev: 'ElevenLabs', pricing: 'usage', blurb: 'Natural voice for Ardovo Voice AI and call summaries.', tags: ['voice', 'tts'] },

  // ---- CRM ----
  { id: 'salesforce', name: 'Salesforce', cat: 'crm', color: '#00a1e0', mono: 'SF', dev: 'Salesforce', pricing: 'paid', blurb: 'Bi-directional sync to migrate off or run side by side.', tags: ['crm', 'migration'] },
  { id: 'hubspot', name: 'HubSpot', cat: 'crm', color: '#ff7a59', mono: 'HS', dev: 'HubSpot', pricing: 'freemium', blurb: 'Import contacts, companies and deals in a few clicks.', tags: ['crm', 'import'] },
  { id: 'pipedrive', name: 'Pipedrive', cat: 'crm', color: '#017737', mono: 'PD', dev: 'Pipedrive', pricing: 'paid', blurb: 'One-click migration of pipelines and activity history.', tags: ['crm', 'migration'] },
  { id: 'linkedin', name: 'LinkedIn Sales Navigator', cat: 'crm', color: '#0a66c2', mono: 'LI', dev: 'Microsoft', pricing: 'paid', blurb: 'Prospect insights and warm intros on every contact.', tags: ['prospecting', 'social'] },

  // ---- Vertical ----
  { id: 'shopify', name: 'Shopify', cat: 'vertical', color: '#95bf47', mono: 'SH', dev: 'Shopify', pricing: 'paid', blurb: 'Turn store orders into accounts, contacts and revenue.', tags: ['commerce', 'ecom'], featured: true },
  { id: 'mailchimp', name: 'Mailchimp', cat: 'vertical', color: '#ffe01b', mono: 'MC', dev: 'Intuit', pricing: 'freemium', blurb: 'Sync audiences and campaign engagement to contacts.', tags: ['marketing', 'email'] },
  { id: 'zendesk', name: 'Zendesk', cat: 'vertical', color: '#03363d', mono: 'ZD', dev: 'Zendesk', pricing: 'paid', blurb: 'Support tickets surfaced on the account health view.', tags: ['support', 'tickets'] },

  // ---- Ardovo-native ----
  { id: 'tango', name: 'Tango Scheduling', cat: 'productivity', color: '#5b4bf5', mono: 'TA', dev: 'Ardovo', pricing: 'native', native: true, blurb: 'Native AI scheduling. Barge-in voice booking and no-show radar built in.', tags: ['scheduling', 'native'], featured: true },
  { id: 'resolve', name: 'Resolve Support', cat: 'vertical', color: '#0ea5a3', mono: 'RS', dev: 'Ardovo', pricing: 'native', native: true, blurb: 'AI-first support that auto-resolves most tickets with zero humans.', tags: ['support', 'native'], featured: true },
  { id: 'theway', name: 'The Way HQ', cat: 'vertical', color: '#a855f7', mono: 'WY', dev: 'Ardovo', pricing: 'native', native: true, blurb: 'External-constraint command center for permits and long-lead procurement.', tags: ['ops', 'native'] },
  { id: 'rook', name: 'Rook AI', cat: 'ai', color: '#5b4bf5', mono: 'RK', dev: 'Ardovo', pricing: 'native', native: true, blurb: 'The AI operator at the core of Ardovo. Always on, already installed.', tags: ['ai', 'native'], featured: true, core: true },
];

/* ---------- pricing display ---------- */
export const PRICING_LABEL = {
  free: 'Free',
  freemium: 'Free plan + paid',
  paid: 'Paid plans',
  usage: 'Usage-based',
  native: 'Included with Ardovo',
};

/* Permission templates per category, so every app shows realistic scopes. */
const PERMS = {
  crm: ['Read contacts, companies and deals', 'Write records on sync', 'Read your org schema'],
  comms: ['Read and send messages on your behalf', 'Read contact identities', 'Log conversations to the timeline'],
  payments: ['Read invoices and payment status', 'Create charges on won deals', 'Read customer billing profiles'],
  analytics: ['Read product and web events', 'Read account identities', 'Write intent scores to records'],
  productivity: ['Read and write calendar and files', 'Create tasks and documents', 'Read contact details'],
  ai: ['Send record context to the model', 'Read notes and activity', 'Draft content on your behalf'],
  vertical: ['Read orders and tickets', 'Create accounts and contacts', 'Write status back to Ardovo'],
};

/* Deterministic public stats for one app (rating, installs, reviews, spark).
   Keyed by index so values are stable across reloads. Hoisted. */
function deterministicStats(idx) {
  const rnd = mulberry32(9000 + idx * 7);
  const rating = Math.round((4.2 + rnd() * 0.75) * 10) / 10;   // 4.2 .. 4.95
  const installs = Math.round(1200 + Math.pow(rnd(), 1.6) * 84000); // long tail
  const reviews = Math.round(40 + rnd() * 900);
  const spark = Array.from({ length: 12 }, () => Math.round(20 + rnd() * 80));
  return { rating, installs, reviews, spark };
}

/* Build the enriched, read-only catalog at module eval. Hoisted. */
function buildCatalog() {
  return RAW.map((a, i) => {
    const st = deterministicStats(i);
    return {
      ...a,
      textColor: textOn(a.color),
      priceLabel: PRICING_LABEL[a.pricing] || 'Free',
      permissions: PERMS[a.cat] || PERMS.crm,
      verified: !!a.native || st.installs > 22000,
      ...st,
    };
  });
}

export const APPS = buildCatalog();
export const appById = (id) => APPS.find(a => a.id === id) || null;

/* ============================================================
   INSTALL STORE  (localStorage-backed pub/sub, mirrors store.js)
   ============================================================ */
let mstate = loadInstalls();
const subs = new Set();

/* Hoisted so it is safe if ever called during eval. Rook AI is a core
   app - seeded as always-installed on first run. */
function loadInstalls() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = {
    installed: {
      rook: { installedAt: '2026-01-04T00:00:00.000Z', enabled: true },
      gmail: { installedAt: '2026-02-11T00:00:00.000Z', enabled: true },
      slack: { installedAt: '2026-03-02T00:00:00.000Z', enabled: true },
      stripe: { installedAt: '2026-03-19T00:00:00.000Z', enabled: true },
    },
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(mstate)); } catch {}
  subs.forEach(fn => fn(mstate));
}

export function getInstalls() { return mstate; }
export function isInstalled(id) { return !!mstate.installed[id]; }
export function isEnabled(id) { return !!mstate.installed[id]?.enabled; }
export const installedCount = () => Object.keys(mstate.installed).length;

export function installedApps() {
  return APPS
    .filter(a => mstate.installed[a.id])
    .map(a => ({ ...a, ...mstate.installed[a.id] }))
    .sort((x, y) => new Date(y.installedAt) - new Date(x.installedAt));
}

// SUPABASE: from('rally_installed_apps').insert({ app_id, org_id, config })
export function installApp(id) {
  const app = appById(id);
  if (!app) return { error: 'missing', message: 'Unknown app.' };
  if (mstate.installed[id]) return { ok: true, already: true, app };
  mstate = {
    ...mstate,
    installed: { ...mstate.installed, [id]: { installedAt: new Date().toISOString(), enabled: true } },
  };
  persist();
  maybeSync(app, 'install');
  return { ok: true, app };
}

// SUPABASE: from('rally_installed_apps').delete().eq('app_id', id)
export function uninstallApp(id) {
  const app = appById(id);
  if (app?.core) return { error: 'core', message: 'Rook AI is core to Ardovo and cannot be removed.' };
  if (!mstate.installed[id]) return { ok: true, already: true };
  const next = { ...mstate.installed };
  delete next[id];
  mstate = { ...mstate, installed: next };
  persist();
  return { ok: true };
}

// SUPABASE: update rally_installed_apps set enabled = ...
export function toggleEnabled(id) {
  const cur = mstate.installed[id];
  if (!cur) return { error: 'missing' };
  mstate = { ...mstate, installed: { ...mstate.installed, [id]: { ...cur, enabled: !cur.enabled } } };
  persist();
  return { ok: true, enabled: !cur.enabled };
}

export function resetMarketplace() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  mstate = loadInstalls();
  subs.forEach(fn => fn(mstate));
}

/* ---------- live-connect stub (env-gated, degrades silently) ---------- */
export function hasConnectEnv() {
  try { return !!(import.meta?.env?.VITE_MARKETPLACE_CONNECT); } catch { return false; }
}
// Fire-and-forget real handshake when an OAuth base is configured. Never
// throws, never blocks the local install; absent env is a silent no-op.
function maybeSync(app, action) {
  if (!hasConnectEnv()) return;
  try {
    const base = import.meta.env.VITE_MARKETPLACE_CONNECT;
    fetch(`${base}/connect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: app.id, action }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/* ---------- React hook ---------- */
export function useInstalls() {
  const [snap, setSnap] = useState(mstate);
  useEffect(() => {
    const fn = (s) => setSnap(s);
    subs.add(fn); fn(mstate);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ============================================================
   DERIVED SELECTORS (render-time, pure)
   ============================================================ */
export function featuredApps() { return APPS.filter(a => a.featured); }
export function appsInCategory(catId) {
  return catId === 'all' ? APPS : APPS.filter(a => a.cat === catId);
}
export function categoryCounts() {
  const out = {};
  for (const c of CATEGORIES) out[c.id] = c.id === 'all' ? APPS.length : APPS.filter(a => a.cat === c.id).length;
  return out;
}
export function searchApps(list, q) {
  const term = (q || '').trim().toLowerCase();
  if (!term) return list;
  return list.filter(a =>
    a.name.toLowerCase().includes(term) ||
    a.dev.toLowerCase().includes(term) ||
    a.blurb.toLowerCase().includes(term) ||
    (a.tags || []).some(t => t.includes(term)) ||
    catById(a.cat).label.toLowerCase().includes(term)
  );
}
export function sortApps(list, mode) {
  const l = [...list];
  if (mode === 'installs') return l.sort((a, b) => b.installs - a.installs);
  if (mode === 'rating') return l.sort((a, b) => b.rating - a.rating || b.installs - a.installs);
  if (mode === 'name') return l.sort((a, b) => a.name.localeCompare(b.name));
  // default: featured then installs
  return l.sort((a, b) => (b.featured === true) - (a.featured === true) || b.installs - a.installs);
}

/* Total ecosystem installs, for the hero stat. */
export function totalInstallReach() { return APPS.reduce((s, a) => s + a.installs, 0); }

export function formatInstalls(n) {
  if (n == null) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* Rook affordance - dispatch a prompt to the operator dock. */
export function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
