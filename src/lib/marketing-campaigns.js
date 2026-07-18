// ============================================================
// ARDOVO MARKETING CAMPAIGNS  (local-first, Supabase-swappable)
// The broadcast + nurture layer of Ardovo's Marketing hub. A
// campaign is an authored email (or nurture) targeted at a live
// audience resolved from the real CRM stores (contacts + leads),
// with a status lifecycle and per-send metrics. Same pub/sub,
// deterministic-seed, localStorage-backed pattern as store.js /
// store-ext.js so nothing here needs a backend to feel alive.
//
// This slice is ADDITIVE. It does not touch store.js or
// store-ext.js state; it only READS them to resolve audiences.
// Live equivalent would be a rally_marketing_campaigns table; the
// actual send routes through api/broadcast.js -> api/_lib-email.js.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getContacts, getCompany } from './store.js';
import { getLeads } from './store-ext.js';

// Dedicated key. Used to share 'rally_marketing_v1' with marketing-engine.js,
// which caused whichever module loaded last to wipe the other's slice.
const LS_KEY = 'rally_marketing_campaigns_v1';
const LS_LEGACY = 'rally_marketing_v1';

/* ---------- merge tokens ---------- */
// The two supported tokens across subject + body. Kept tiny + explicit so the
// UI can advertise exactly what is available and the API can mirror it 1:1.
export const MERGE_TOKENS = [
  { token: '{firstName}', label: 'First name', sample: 'Jordan' },
  { token: '{company}', label: 'Company', sample: 'Vertex Robotics' },
];

// Replace {firstName} / {company} (case-insensitive, brace-wrapped) in a string.
// Unknown tokens are left untouched. A missing var falls back to a friendly
// default so a broadcast never renders a literal "{firstName}" in an inbox.
export function applyTokens(text, vars = {}) {
  if (text == null) return '';
  const first = (vars.firstName && String(vars.firstName).trim()) || 'there';
  const company = (vars.company && String(vars.company).trim()) || 'your team';
  return String(text)
    .replace(/\{\s*firstName\s*\}/gi, first)
    .replace(/\{\s*company\s*\}/gi, company);
}

/* ============================================================
   AUDIENCES  (resolved live against the CRM stores)
   Each returns [{ email, firstName, company }] with valid, unique emails.
   ============================================================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactRecipients(pred) {
  const out = [];
  for (const c of getContacts()) {
    if (pred && !pred(c)) continue;
    const email = (c.email || '').trim();
    if (!EMAIL_RE.test(email)) continue;
    out.push({
      email,
      firstName: c.firstName || '',
      company: (c.companyId && getCompany(c.companyId)?.name) || '',
    });
  }
  return out;
}

function leadRecipients(pred) {
  const out = [];
  for (const l of getLeads()) {
    if (pred && !pred(l)) continue;
    const email = (l.email || '').trim();
    if (!EMAIL_RE.test(email)) continue;
    out.push({ email, firstName: l.firstName || '', company: l.company || '' });
  }
  return out;
}

// The pickable audiences. `resolve` reads the live stores every call so counts
// and recipient lists always reflect the current book of business.
export const AUDIENCES = [
  { id: 'all-contacts', label: 'All contacts', hint: 'Everyone in your contact book', resolve: () => contactRecipients() },
  { id: 'customers', label: 'Customers', hint: 'Contacts at customer accounts', resolve: () => contactRecipients(c => c.lifecycleStage === 'customer') },
  { id: 'opportunities', label: 'Open opportunities', hint: 'Contacts with an active deal', resolve: () => contactRecipients(c => c.lifecycleStage === 'opportunity') },
  { id: 'all-leads', label: 'All leads', hint: 'Top-of-funnel leads', resolve: () => leadRecipients() },
  { id: 'qualified-leads', label: 'Qualified leads', hint: 'Leads marked qualified', resolve: () => leadRecipients(l => l.status === 'qualified') },
  { id: 'working-leads', label: 'Working leads', hint: 'Leads in active follow-up', resolve: () => leadRecipients(l => l.status === 'working') },
  { id: 'custom', label: 'Custom list', hint: 'Paste emails, comma or line separated', resolve: () => [] },
];

export function audienceById(id) {
  return AUDIENCES.find(a => a.id === id) || AUDIENCES[0];
}

// Parse a free-text blob of emails into recipients. Dedupes + validates.
export function parseCustomList(text) {
  const seen = new Set();
  const out = [];
  for (const tok of String(text || '').split(/[\s,;]+/)) {
    const email = tok.trim();
    if (!EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ email, firstName: email.split('@')[0], company: '' });
  }
  return out;
}

// Resolve a campaign's audience to a deduped recipient list. For 'custom' the
// campaign carries a `customList` string; every other audience reads the store.
export function resolveAudience(audienceId, customList = '') {
  const rows = audienceId === 'custom' ? parseCustomList(customList) : audienceById(audienceId).resolve();
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = (r.email || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function audienceCount(audienceId, customList = '') {
  return resolveAudience(audienceId, customList).length;
}

/* ============================================================
   SEED
   ============================================================ */
function emptyMetrics() {
  return { recipients: 0, sent: 0, opened: 0, clicked: 0, failed: 0 };
}

function buildSeed() {
  const now = Date.now();
  const DAY = 86400000;
  const iso = (n) => new Date(now + n * DAY).toISOString();
  // Two illustrative campaigns so the hub is not empty on first run. The 'sent'
  // one carries modest, freshly-sent metrics (engagement would arrive later via
  // provider webhooks, so opens/clicks start low). Everything here is local demo
  // content, consistent with the rest of Ardovo's seeded book of business.
  const campaigns = [
    {
      id: 'mc_launch',
      name: 'Rook GA announcement',
      type: 'email',
      subject: '{firstName}, meet Rook - your AI revenue operator',
      body: 'Hi {firstName},\n\nRook is now generally available for every team at {company}. It drafts the follow-ups, keeps the pipeline honest, and never lets a deal go dark.\n\nWant a 15-minute look at what it can do for your revenue team?\n\nTalk soon,\nThe Ardovo team',
      audience: 'all-contacts',
      customList: '',
      status: 'sent',
      scheduledAt: null,
      sentAt: iso(-3),
      metrics: { recipients: 128, sent: 128, opened: 41, clicked: 12, failed: 0 },
      createdAt: iso(-6),
      updatedAt: iso(-3),
    },
    {
      id: 'mc_reengage',
      name: 'Reengage cold accounts',
      type: 'nurture',
      subject: '{company} - still worth a conversation?',
      body: 'Hi {firstName},\n\nWe spoke a while back about helping {company} run a tighter revenue motion. The timing may be better now.\n\nIf it is worth a fresh look, just reply and I will send a few times.\n\nBest,\nThe Ardovo team',
      audience: 'working-leads',
      customList: '',
      status: 'draft',
      scheduledAt: null,
      sentAt: null,
      metrics: emptyMetrics(),
      createdAt: iso(-2),
      updatedAt: iso(-2),
    },
  ];
  return { seededAt: new Date(now).toISOString(), campaigns };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function normalize(s) {
  return {
    seededAt: s?.seededAt || Date.now(),
    campaigns: Array.isArray(s?.campaigns) ? s.campaigns : [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = normalize(JSON.parse(raw));
      if (s.campaigns.length) return s;
    }
  } catch {}
  // Migrate from the shared legacy key only when it still holds campaigns.
  try {
    const raw = localStorage.getItem(LS_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.campaigns) && parsed.campaigns.length) {
        const migrated = normalize(parsed);
        try { localStorage.setItem(LS_KEY, JSON.stringify(migrated)); } catch {}
        return migrated;
      }
    }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetMarketing() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  state = load();
  subs.forEach(fn => fn(state));
}

// Subscribe to the marketing slice. Note: audience counts also depend on the
// core CRM stores, so a component that shows live counts should ALSO subscribe
// to those (useStore / useExt) to re-render when the book of business changes.
export function useMarketing(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `mc_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getMarketingCampaigns = () => (Array.isArray(state.campaigns) ? state.campaigns : []);
export const getMarketingCampaign = (id) => getMarketingCampaigns().find(c => c.id === id) || null;

// Roll-up KPIs for the hub header.
export function marketingStats() {
  const cs = getMarketingCampaigns();
  const sent = cs.reduce((s, c) => s + (c.metrics?.sent || 0), 0);
  const opened = cs.reduce((s, c) => s + (c.metrics?.opened || 0), 0);
  const clicked = cs.reduce((s, c) => s + (c.metrics?.clicked || 0), 0);
  return {
    total: cs.length,
    active: cs.filter(c => c.status === 'sending' || c.status === 'scheduled').length,
    sent,
    opened,
    clicked,
    openRate: sent > 0 ? (opened / sent) * 100 : 0,
    clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
  };
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
function normType(t) { return t === 'nurture' ? 'nurture' : 'email'; }

// SUPABASE: from('rally_marketing_campaigns').insert(row).select().single()
export function createCampaign({ name, type = 'email', subject = '', body = '', audience = 'all-contacts', customList = '' } = {}) {
  if (!name || !name.trim()) return { error: 'name', message: 'Name your campaign.' };
  const nowIso = new Date().toISOString();
  const c = {
    id: newId(),
    name: name.trim(),
    type: normType(type),
    subject: String(subject || ''),
    body: String(body || ''),
    audience: audienceById(audience).id,
    customList: String(customList || ''),
    status: 'draft',
    scheduledAt: null,
    sentAt: null,
    metrics: emptyMetrics(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  commit({ ...state, campaigns: [c, ...state.campaigns] });
  return { campaign: c };
}

export function updateCampaign(id, patch = {}) {
  const c = getMarketingCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  const next = { ...c, ...patch };
  if (patch.type != null) next.type = normType(patch.type);
  next.updatedAt = new Date().toISOString();
  commit({ ...state, campaigns: state.campaigns.map(x => x.id === id ? next : x) });
  return { campaign: next };
}

export function deleteCampaign(id) {
  const c = getMarketingCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  commit({ ...state, campaigns: state.campaigns.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicateCampaign(id) {
  const c = getMarketingCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  const nowIso = new Date().toISOString();
  const copy = {
    ...c,
    id: newId(),
    name: `${c.name} (copy)`,
    status: 'draft',
    scheduledAt: null,
    sentAt: null,
    metrics: emptyMetrics(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  commit({ ...state, campaigns: [copy, ...state.campaigns] });
  return { campaign: copy };
}

// Mark a campaign scheduled for a future send. Additive status transition.
export function scheduleCampaign(id, whenIso) {
  const c = getMarketingCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  return updateCampaign(id, { status: 'scheduled', scheduledAt: whenIso || new Date(Date.now() + 86400000).toISOString() });
}

// Record the outcome of a real send (from api/broadcast.js). recipients is the
// resolved audience size, sent is how many the provider accepted, failed the
// rest. Opens/clicks start at 0 and would be updated by provider webhooks. When
// nothing was accepted (e.g. sending not configured) the campaign stays 'draft'
// so the UI never claims a send that did not happen.
export function recordSend(id, { recipients = 0, sent = 0, failed = 0 } = {}) {
  const c = getMarketingCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  const delivered = Math.max(0, Number(sent) || 0);
  const status = delivered > 0 ? 'sent' : c.status;
  const metrics = {
    recipients: Math.max(c.metrics?.recipients || 0, Number(recipients) || 0),
    sent: (c.metrics?.sent || 0) + delivered,
    opened: c.metrics?.opened || 0,
    clicked: c.metrics?.clicked || 0,
    failed: (c.metrics?.failed || 0) + (Math.max(0, Number(failed) || 0)),
  };
  return updateCampaign(id, { status, sentAt: delivered > 0 ? new Date().toISOString() : c.sentAt, scheduledAt: null, metrics });
}
