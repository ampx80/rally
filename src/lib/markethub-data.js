// ============================================================
// ARDOVO MARKETING HUB  (local-first, additive, Supabase-swappable)
//
// The glue layer that turns Ardovo's scattered marketing surfaces
// (Campaigns, Sequences, Automations, Ads, Social, Funnels, Forms,
// Landing pages, Reviews) into ONE command center - and fills the
// last gap HubSpot charges $3,600/mo for: a real, configurable
// LEAD SCORING model with grades, decay and a live leaderboard.
//
// This module is READ-ONLY over the CRM stores (store.js) and the
// marketing automation engine (marketing-engine.js). The only thing
// it PERSISTS is the editable lead-scoring config (rules + bands +
// decay) in its own localStorage slice. Same deterministic-seed,
// pub/sub pattern as the rest of Ardovo, so it is 100% alive with
// zero backend and never white-screens on load.
//
// TWO KINDS OF DATA LIVE HERE, and they are NOT the same:
//   1. LIVE rollups (surfaceRollup / hubRollup / recentActivity /
//      scoredContacts / segmentOverview) - real counts read straight
//      from the marketing + CRM stores. This is what the page renders.
//   2. MODELED (demo) helpers (channelPerformance / marketingRoi /
//      spendRevenueSeries / funnelModel / attributionModel / topContent
//      / calendar) - deterministic SEEDED data, believable but
//      fabricated. They are NOT imported by the page and must never be
//      shown without a clear "Modeled (demo)" label. Each is marked
//      MODELED below.
//
// TDZ-safe: every helper used anywhere is a hoisted `function`
// declaration, and the persisted `store` is initialized at the very
// bottom, after all declarations. No const-arrow is referenced during
// module evaluation.
//
// ASCII only. NO em-dash / en-dash.
// SUPABASE: rally_lead_scoring (config), everything else derives live.
// ============================================================
import { useEffect, useState } from 'react';
import {
  getContacts, getDeals, getCompany, getContact, contactName,
} from './store.js';
import { getEvents } from './marketing-engine.js';
// Engine 6: the hub rolls up the REAL marketing stores. These are all
// leaf stores (none import markethub-data) so there is no import cycle.
import { getMarketingCampaigns, marketingStats } from './marketing-campaigns.js';
import { getSequences, fleetStats as sequenceFleet } from './sequences-data.js';
import { getForms, formStats } from './forms.js';
import { getLandingPages, landingStats } from './landing-pages.js';
import { getFunnels, funnelMetrics as funnelMetricsOf } from './funnels-data.js';
import { getAutomations, engineStats } from './automation-engine.js';
import { getLists, listStats } from './lists.js';

const LS_KEY = 'rally_markethub_v1';
const DAY = 86400000;

/* ============================================================
   DETERMINISTIC PRNG + small hash (same family as store.js)
   ============================================================ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strhash(s) {
  let h = 0;
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */
// Company size ramp (mirrors store.js SIZES, re-declared so we stay decoupled).
const SIZES = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
function sizeIndex(sz) { const i = SIZES.indexOf(sz); return i < 0 ? 0 : i; }

// Marketing channels. `marketing:false` (outbound) is excluded from spend/ROI
// so "marketing-sourced" stays honest.
export const CHANNELS = [
  { id: 'organic',  label: 'Organic Search', short: 'SEO', color: '#1a7f52', marketing: true },
  { id: 'paid',     label: 'Paid Search',    short: 'PPC', color: '#2563a8', marketing: true },
  { id: 'email',    label: 'Email',          short: 'EM',  color: '#5b4bf5', marketing: true },
  { id: 'social',   label: 'Social',         short: 'SO',  color: '#a855f7', marketing: true },
  { id: 'events',   label: 'Events',         short: 'EV',  color: '#e0752d', marketing: true },
  { id: 'referral', label: 'Referral',       short: 'RF',  color: '#0ea5a3', marketing: true },
  { id: 'content',  label: 'Content',        short: 'CT',  color: '#b3721a', marketing: true },
  { id: 'outbound', label: 'Outbound Sales', short: 'OB',  color: '#8b93a4', marketing: false },
];
export function channelById(id) { return CHANNELS.find(c => c.id === id) || CHANNELS[0]; }

// Weighted source mix so ~78% of deals are marketing-sourced (the winning story).
const SOURCE_MIX = [
  { id: 'organic', w: 18 }, { id: 'paid', w: 14 }, { id: 'email', w: 12 },
  { id: 'social', w: 10 }, { id: 'events', w: 8 }, { id: 'referral', w: 8 },
  { id: 'content', w: 8 }, { id: 'outbound', w: 22 },
];
// MODELED (demo) per-deal source. Inferred from a stable hash of the deal id,
// not a captured acquisition event. Stable across reloads, no writes. Feeds the
// modeled/demo rollups below only.
export function dealSource(deal) {
  const total = SOURCE_MIX.reduce((s, m) => s + m.w, 0);
  let r = strhash('src|' + (deal?.id || '')) % total;
  for (const m of SOURCE_MIX) { if (r < m.w) return channelById(m.id); r -= m.w; }
  return channelById('outbound');
}

// MODELED (demo) per-channel spend + leads. These are deterministic, believable
// SEEDS - not real ad-spend or lead data. They only feed the modeled/demo
// helpers below, which the Marketing Hub page does not render.
function seededSpend(id) { return 6000 + (strhash('spend|' + id) % 40) * 1000; }   // 6k..46k
function seededLeads(id) { return 55 + (strhash('leads|' + id) % 52) * 6; }        // 55..361

/* ============================================================
   LEAD SCORING - default configurable model
   ============================================================ */
// Serializable rules (no functions persisted). Evaluation maps target+value.
function defaultRules() {
  return {
    demographic: [
      { id: 'd_senior', label: 'Senior decision-maker title', target: 'titleKeyword', value: 'VP,Chief,Head,Director,CEO,CFO,CTO,COO', points: 18, enabled: true },
      { id: 'd_buyer',  label: 'Tagged economic buyer',       target: 'tag',          value: 'economic buyer', points: 14, enabled: true },
      { id: 'd_champ',  label: 'Champion identified',          target: 'tag',          value: 'champion',        points: 10, enabled: true },
      { id: 'd_ent',    label: 'Enterprise company size',      target: 'sizeGte',      value: '501-1000',        points: 14, enabled: true },
      { id: 'd_icp',    label: 'ICP industry',                 target: 'industryIn',   value: 'SaaS,Manufacturing,Financial Services,Healthcare', points: 8, enabled: true },
      { id: 'd_opp',    label: 'In an active opportunity',     target: 'lifecycle',    value: 'opportunity',     points: 12, enabled: true },
      { id: 'd_mail',   label: 'Reachable (has email)',        target: 'hasEmail',     value: '',                points: 4,  enabled: true },
    ],
    behavioral: [
      { id: 'b_click', label: 'Clicked an email link', event: 'click', pointsEach: 9, cap: 36, enabled: true },
      { id: 'b_open',  label: 'Opened a marketing email', event: 'open', pointsEach: 4, cap: 20, enabled: true },
      { id: 'b_send',  label: 'Received a nurture touch', event: 'send', pointsEach: 1, cap: 6, enabled: true },
    ],
    decayPerDay: 0.6,   // points shaved per day since last engagement
    bands: [
      { grade: 'A', min: 75, color: '#1a7f52' },
      { grade: 'B', min: 55, color: '#2563a8' },
      { grade: 'C', min: 35, color: '#b3721a' },
      { grade: 'D', min: 0,  color: '#8b93a4' },
    ],
  };
}

// Grade lookup from bands (bands are stored high-to-low).
export function gradeFor(score, bands) {
  const list = [...(bands || defaultRules().bands)].sort((a, b) => b.min - a.min);
  for (const b of list) if (score >= b.min) return b;
  return list[list.length - 1];
}

// Demographic predicate. Pure + serializable-driven.
function matchDemographic(rule, contact, company) {
  switch (rule.target) {
    case 'titleKeyword': {
      const t = (contact.title || '').toLowerCase();
      return (rule.value || '').split(',').some(k => { const s = k.trim().toLowerCase(); return s && t.includes(s); });
    }
    case 'tag':        return (contact.tags || []).includes(rule.value);
    case 'lifecycle':  return contact.lifecycleStage === rule.value;
    case 'industryIn': return !!company && (rule.value || '').split(',').map(s => s.trim()).includes(company.industry);
    case 'sizeGte':    return !!company && sizeIndex(company.size) >= sizeIndex(rule.value);
    case 'hasEmail':   return !!contact.email;
    default:           return false;
  }
}

// Score one contact against a rules config + a precomputed event map.
export function scoreContact(contact, rules, evByContact, now = Date.now()) {
  const company = contact.companyId ? getCompany(contact.companyId) : null;
  const hits = [];
  let demo = 0;
  for (const r of rules.demographic) {
    if (!r.enabled) continue;
    if (matchDemographic(r, contact, company)) { demo += r.points; hits.push({ label: r.label, points: r.points }); }
  }
  let beh = 0;
  const evs = (evByContact && evByContact.get(contact.id)) || [];
  for (const r of rules.behavioral) {
    if (!r.enabled) continue;
    const c = evs.filter(e => e.type === r.event).length;
    if (c > 0) { const p = Math.min(r.pointsEach * c, r.cap); beh += p; hits.push({ label: r.label, points: p, count: c }); }
  }
  // recency for decay: last open/click, else last activity, else assume cold.
  let lastAt = 0;
  for (const e of evs) if ((e.type === 'open' || e.type === 'click') && e.at > lastAt) lastAt = e.at;
  if (!lastAt && contact.lastActivityAt) lastAt = new Date(contact.lastActivityAt).getTime();
  const days = lastAt ? Math.max(0, (now - lastAt) / DAY) : 45;
  const raw = demo + beh;
  const decay = Math.min(raw, Math.round(days * (rules.decayPerDay || 0)));
  const score = Math.max(0, Math.min(100, raw - decay));
  return { score, demo, beh, decay, days: Math.round(days), grade: gradeFor(score, rules.bands), hits };
}

// Build a contactId -> events[] map once (cheap; a few hundred events).
function buildEventMap() {
  const map = new Map();
  // getEvents() can be undefined/non-iterable on a fresh store (marketing-engine
  // seeds events lazily), so default to an empty list rather than throwing.
  const events = (typeof getEvents === 'function' && getEvents()) || [];
  for (const e of events) {
    if (!map.has(e.contactId)) map.set(e.contactId, []);
    map.get(e.contactId).push(e);
  }
  return map;
}

// Score every contact and sort hottest first. Pure over live stores + rules.
export function scoredContacts(rules) {
  const evMap = buildEventMap();
  const now = Date.now();
  return getContacts()
    .map(c => ({ contact: c, ...scoreContact(c, rules, evMap, now) }))
    .sort((a, b) => b.score - a.score);
}

// Score distribution histogram (buckets of 10) + per-grade counts.
export function scoreDistribution(scored, rules) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 9, count: 0 }));
  const grades = {};
  for (const b of rules.bands) grades[b.grade] = { ...b, count: 0 };
  for (const s of scored) {
    buckets[Math.min(9, Math.floor(s.score / 10))].count++;
    if (grades[s.grade.grade]) grades[s.grade.grade].count++;
  }
  return { buckets, grades: Object.values(grades).sort((a, b) => b.min - a.min) };
}

/* ============================================================
   MODELED (DEMO) MARKETING ROLLUPS  -  SYNTHETIC, NOT RENDERED
   WARNING: the helpers in this section are NOT all-real. They blend the
   real per-deal roll-up with MODELED (seeded) spend / leads / ROI /
   attribution / calendar data. They are deterministic and believable but
   fabricated, and the Marketing Hub page does NOT import or render any of
   them (it renders only the live surfaceRollup / hubRollup further down).
   Any surface that ever shows these MUST label them "Modeled (demo)".
   Kept only for demo/prototype use. Do not present as real performance.
   ============================================================ */

// MODELED (demo). Per marketing-channel performance: real deal roll-up blended
// with MODELED (seeded) spend/leads. Spend, leads, CPL, CAC, ROI and conv are
// modeled, not measured.
export function channelPerformance() {
  const deals = getDeals();
  const by = {};
  for (const ch of CHANNELS) by[ch.id] = { deals: 0, pipeline: 0, wonRev: 0, won: 0 };
  for (const d of deals) {
    const ch = dealSource(d);
    const b = by[ch.id];
    b.deals++;
    if (d.status === 'open') b.pipeline += d.value;
    else if (d.status === 'won') { b.wonRev += d.value; b.won++; }
  }
  return CHANNELS.filter(c => c.marketing).map(ch => {
    const b = by[ch.id];
    const spend = seededSpend(ch.id);
    const leads = seededLeads(ch.id);
    return {
      ...ch, spend, leads,
      deals: b.deals, pipeline: b.pipeline, wonRev: b.wonRev, won: b.won,
      cpl: leads ? Math.round(spend / leads) : 0,
      cac: b.won ? Math.round(spend / b.won) : 0,
      roi: spend ? +(b.wonRev / spend).toFixed(2) : 0,
      conv: leads ? +((b.won / leads) * 100).toFixed(1) : 0,
    };
  }).sort((a, b) => b.pipeline - a.pipeline);
}

// MODELED (demo). Blended marketing spend / CAC / ROI, plus marketing-sourced
// pipeline share. Spend/CAC/ROI are modeled (seeded), not measured.
export function marketingRoi() {
  const chans = channelPerformance();
  const spend = chans.reduce((s, c) => s + c.spend, 0);
  const wonRev = chans.reduce((s, c) => s + c.wonRev, 0);
  const won = chans.reduce((s, c) => s + c.won, 0);
  const leads = chans.reduce((s, c) => s + c.leads, 0);
  const mktPipeline = chans.reduce((s, c) => s + c.pipeline, 0);
  const allPipeline = getDeals().filter(d => d.status === 'open').reduce((s, d) => s + d.value, 0);
  return {
    spend, wonRev, won, leads, mktPipeline, allPipeline,
    cac: won ? Math.round(spend / won) : 0,
    cpl: leads ? Math.round(spend / leads) : 0,
    roi: spend ? +(wonRev / spend).toFixed(2) : 0,
    sourcedShare: allPipeline ? Math.round((mktPipeline / allPipeline) * 100) : 0,
  };
}

// MODELED (demo). Deterministic 6-month spend vs revenue series - fabricated
// from seeds for a chart, not real month-by-month spend or revenue.
export function spendRevenueSeries() {
  const now = new Date();
  const chans = channelPerformance();
  const baseSpend = chans.reduce((s, c) => s + c.spend, 0);
  const baseRev = chans.reduce((s, c) => s + c.wonRev, 0) || baseSpend * 3;
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rnd = mulberry32(20260101 + d.getFullYear() * 100 + d.getMonth());
    const ramp = 0.62 + (5 - i) * 0.09;            // spend climbs over time
    const eff = 2.4 + rnd() * 1.8;                  // revenue multiple wobbles
    const spend = Math.round(baseSpend / 6 * ramp * (0.82 + rnd() * 0.36));
    const revenue = Math.round(spend * eff);
    out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), spend, revenue });
  }
  return out;
}

// MODELED (demo). Marketing funnel driven by the lead-scoring model. Visitor
// count is seeded (fabricated); the other tiers derive from scored contacts.
export function funnelModel(rules) {
  const scored = scoredContacts(rules);
  const contacts = getContacts();
  const leads = contacts.length;
  const mql = scored.filter(s => s.score >= 45).length;
  const sql = scored.filter(s => s.score >= 60).length;
  const opp = scored.filter(s => s.score >= 75).length;
  const custRaw = contacts.filter(c => c.lifecycleStage === 'customer').length;
  const visitors = Math.round(leads * 96 + strhash('visitors') % 1200);
  const cust = Math.min(custRaw, opp);
  const rows = [
    { key: 'visitors', label: 'Visitors',      value: visitors, color: '#8b93a4' },
    { key: 'leads',    label: 'Leads',         value: leads,    color: '#2563a8' },
    { key: 'mql',      label: 'MQLs',          value: mql,      color: '#5b4bf5' },
    { key: 'sql',      label: 'SQLs',          value: sql,      color: '#a855f7' },
    { key: 'opp',      label: 'Opportunities', value: opp,      color: '#0ea5a3' },
    { key: 'customer', label: 'Customers',     value: cust,     color: '#1a7f52' },
  ];
  return rows.map((r, i) => ({
    ...r,
    conv: i === 0 ? 100 : rows[i - 1].value ? +((r.value / rows[i - 1].value) * 100).toFixed(1) : 0,
  }));
}

// MODELED (demo). First / last / multi-touch attribution split by channel,
// derived from the modeled channelPerformance above (seeded leads + won rev).
export function attributionModel() {
  const chans = channelPerformance();
  const totLeads = chans.reduce((s, c) => s + c.leads, 0) || 1;
  const totWon = chans.reduce((s, c) => s + c.wonRev, 0) || 1;
  const rows = chans.map(c => {
    const first = c.leads / totLeads;
    const last = c.wonRev / totWon;
    return { channel: c, first, last, multi: (first + last) / 2 };
  });
  const totMulti = rows.reduce((s, r) => s + r.multi, 0) || 1;
  return rows.map(r => ({ ...r, multi: r.multi / totMulti })).sort((a, b) => b.multi - a.multi);
}

/* ---------- MODELED (demo) top-performing content ----------
   Fabricated titles + seeded views/leads. Not real content analytics. */
const CONTENT_SEED = [
  { title: 'The 2026 Revenue Operations Benchmark Report', type: 'Guide', channel: 'organic', to: '/landing-pages' },
  { title: 'How Vertex Robotics cut forecast error by 41%', type: 'Case study', channel: 'content', to: '/landing-pages' },
  { title: 'Pipeline coverage: the one number your board asks about', type: 'Blog', channel: 'organic', to: '/landing-pages' },
  { title: 'Webinar: Killing the Monday forecast call', type: 'Webinar', channel: 'events', to: '/scheduling' },
  { title: 'Lead scoring that sales actually trusts', type: 'Blog', channel: 'email', to: '/landing-pages' },
  { title: 'Free tool: CAC & payback calculator', type: 'Interactive', channel: 'paid', to: '/forms' },
];
export function topContent() {
  return CONTENT_SEED.map((c, i) => {
    const h = strhash('content|' + c.title);
    const views = 1800 + (h % 92) * 140;
    const leads = 40 + (h % 41) * 7;
    return {
      ...c, rank: i + 1, views, leads,
      cvr: +((leads / views) * 100).toFixed(1),
      color: channelById(c.channel).color,
    };
  }).sort((a, b) => b.leads - a.leads);
}

/* ============================================================
   MODELED (DEMO) CAMPAIGN CALENDAR  -  SYNTHETIC, NOT RENDERED
   Fabricated calendar items seeded per month so a calendar surface is
   never empty. These are not real scheduled campaigns. The Marketing Hub
   page does not render these; any surface that does MUST label them
   "Modeled (demo)". Deterministic per month, always "alive".
   ============================================================ */
export const CAL_TYPES = [
  { id: 'email',    label: 'Email',      color: '#5b4bf5', to: '/campaigns' },
  { id: 'social',   label: 'Social',     color: '#a855f7', to: '/social' },
  { id: 'ad',       label: 'Ad',         color: '#2563a8', to: '/ads' },
  { id: 'webinar',  label: 'Webinar',    color: '#e0752d', to: '/scheduling' },
  { id: 'sequence', label: 'Sequence',   color: '#0ea5a3', to: '/sequences' },
  { id: 'blog',     label: 'Content',    color: '#b3721a', to: '/landing-pages' },
];
export function calTypeById(id) { return CAL_TYPES.find(t => t.id === id) || CAL_TYPES[0]; }

const CAL_TITLES = {
  email:    ['Q3 nurture blast', 'Product update newsletter', 'Re-engagement send', 'Webinar invite', 'Customer story feature', 'Feature launch announce'],
  social:   ['LinkedIn thought-leadership', 'Customer quote carousel', 'Product teaser reel', 'Poll: forecasting pain', 'Hiring spotlight'],
  ad:       ['Google Search - ROI keywords', 'Meta retargeting refresh', 'LinkedIn ABM push', 'YouTube demo pre-roll'],
  webinar:  ['Live demo: Ardovo in 20 min', 'RevOps roundtable', 'Office hours with Rook'],
  sequence: ['New MQL fast-follow', 'Trial day-3 nudge', 'Dormant lead revival'],
  blog:     ['Benchmark report drop', 'How-to: lead scoring', 'Case study publish'],
};

// Items for a given calendar month. Seeded on year+month so it is stable but
// differs per month, and never empty.
export function calendarItemsFor(year, month) {
  const rnd = mulberry32(20260500 + year * 100 + month);
  const daysIn = new Date(year, month + 1, 0).getDate();
  const now = Date.now();
  const n = 15 + Math.floor(rnd() * 9);
  const items = [];
  for (let i = 0; i < n; i++) {
    const day = 1 + Math.floor(rnd() * daysIn);
    const type = CAL_TYPES[Math.floor(rnd() * CAL_TYPES.length)];
    const pool = CAL_TITLES[type.id];
    const title = pool[Math.floor(rnd() * pool.length)];
    const hour = 8 + Math.floor(rnd() * 9);
    const when = new Date(year, month, day, hour).getTime();
    items.push({
      id: `cal_${year}_${month}_${i}`,
      day, type: type.id, title, hour,
      status: when < now ? 'sent' : 'scheduled',
      to: type.to,
    });
  }
  return items.sort((a, b) => a.day - b.day || a.hour - b.hour);
}

// 6x7 grid cells for a month view (leading/trailing days flagged inMonth:false).
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());        // back up to the Sunday
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}

/* ============================================================
   SEGMENTS / AUDIENCES overview (live sizes)
   ============================================================ */
export function segmentOverview(rules) {
  const scored = scoredContacts(rules);
  const contacts = getContacts();
  const life = (stage) => contacts.filter(c => c.lifecycleStage === stage).length;
  return [
    { id: 'hot',      label: 'Hot leads (Grade A)',   desc: 'Ready for a rep. Route now.',           count: scored.filter(s => s.grade.grade === 'A').length, tone: 'ok',   to: '/leads' },
    { id: 'mql',      label: 'Marketing qualified',    desc: 'Score 55+. Hand to sales.',             count: scored.filter(s => s.score >= 55).length,         tone: 'accent', to: '/campaigns' },
    { id: 'new',      label: 'New leads',              desc: 'Fresh in the book, needs nurture.',      count: life('lead'),                                     tone: 'info', to: '/leads' },
    { id: 'opps',     label: 'Active opportunities',   desc: 'In-flight, keep the air cover.',         count: life('opportunity'),                              tone: 'default', to: '/deals' },
    { id: 'customers',label: 'Customers',              desc: 'Expansion + advocacy plays.',            count: life('customer'),                                 tone: 'ok',   to: '/success' },
    { id: 'cold',     label: 'Going cold (decay)',     desc: 'Score dropped, quiet 30+ days.',         count: scored.filter(s => s.days > 30 && s.score < 40).length, tone: 'warn', to: '/sequences' },
  ];
}

/* ---------- quick-launch deep links to every marketing surface ---------- */
export const QUICK_LAUNCH = [
  { label: 'Campaigns',     desc: 'Broadcast + nurture email',   to: '/campaigns',     icon: 'megaphone' },
  { label: 'Sequences',     desc: 'Multi-step cadences',         to: '/sequences',     icon: 'layers' },
  { label: 'Automations',   desc: 'Trigger-based journeys',      to: '/automations',   icon: 'send' },
  { label: 'Funnels',       desc: 'Conversion funnels',          to: '/funnels',       icon: 'funnel' },
  { label: 'Ads',           desc: 'Cross-channel paid media',    to: '/ads',           icon: 'globe' },
  { label: 'Social',        desc: 'Publish + schedule posts',    to: '/social',        icon: 'share2' },
  { label: 'Forms',         desc: 'Capture forms',               to: '/forms',         icon: 'list' },
  { label: 'Landing pages', desc: 'Standalone pages',            to: '/landing-pages', icon: 'grid' },
  { label: 'Reviews',       desc: 'Reputation + social proof',   to: '/reviews',       icon: 'star' },
  { label: 'Lists',         desc: 'Saved audiences',             to: '/lists',         icon: 'filter' },
];

/* ============================================================
   UNIFIED HUB ROLLUP  (Engine 6: real counts from real stores)
   THIS is the section the Marketing Hub page actually renders. Reads
   every marketing surface live. Nothing in this rollup is fabricated;
   counts come straight from each store's own getters/stats (unlike the
   MODELED demo helpers above, which are seeded and unrendered). Guarded
   so a not-yet-seeded store never white-screens the hub.
   ============================================================ */
function safe(fn, fallback) { try { const v = fn(); return v == null ? fallback : v; } catch { return fallback; } }

// Per-surface summary: the counts + the deep link for the hub cards.
export function surfaceRollup() {
  const camp = safe(() => marketingStats(), { total: 0, sent: 0, active: 0, openRate: 0 });
  const seq = safe(() => sequenceFleet(), { activeEnroll: 0, meetings: 0, emailsSent: 0, replyRate: 0 });
  const seqCount = safe(() => getSequences().length, 0);
  const eng = safe(() => engineStats(), { total: 0, active: 0, enrolled: 0, activeEnrollments: 0, completed: 0 });
  const forms = safe(() => formStats(), { total: 0, published: 0, submissions: 0, contacts: 0, views: 0 });
  const land = safe(() => landingStats(), { total: 0, published: 0, views: 0, submissions: 0, linked: 0 });
  const funnels = safe(() => getFunnels(), []);
  const funnelLive = funnels.filter(f => f.status === 'live').length;
  const funnelLeads = funnels.reduce((s, f) => s + safe(() => funnelMetricsOf(f).totalLeads, 0), 0);
  const lists = safe(() => listStats(), { total: 0, totalMembers: 0 });

  return [
    { key: 'campaigns', label: 'Campaigns', icon: 'megaphone', to: '/campaigns',
      metric: camp.total, metricLabel: `${camp.total} total`, sub: `${camp.sent} sent  |  ${pctStr(camp.openRate)} open` },
    { key: 'sequences', label: 'Sequences', icon: 'layers', to: '/sequences',
      metric: seqCount, metricLabel: `${seqCount} total`, sub: `${num(seq.activeEnroll)} active  |  ${num(seq.emailsSent)} sent` },
    { key: 'journeys', label: 'Journeys', icon: 'journeys', to: '/journeys',
      metric: eng.total, metricLabel: `${eng.total} total`, sub: `${eng.active} live  |  ${num(eng.activeEnrollments)} active` },
    { key: 'forms', label: 'Forms', icon: 'list', to: '/forms',
      metric: forms.total, metricLabel: `${forms.total} total`, sub: `${num(forms.submissions)} submissions  |  ${num(forms.contacts)} contacts` },
    { key: 'landing', label: 'Landing pages', icon: 'grid', to: '/landing-pages',
      metric: land.total, metricLabel: `${land.total} total`, sub: `${land.published} live  |  ${num(land.views)} views  |  ${num(land.submissions)} leads` },
    { key: 'funnels', label: 'Funnels', icon: 'funnel', to: '/funnels',
      metric: funnels.length, metricLabel: `${funnels.length} total`, sub: `${funnelLive} live  |  ${num(funnelLeads)} leads` },
    { key: 'lists', label: 'Lists', icon: 'filter', to: '/lists',
      metric: lists.total, metricLabel: `${lists.total} total`, sub: `${num(lists.totalMembers)} members` },
  ];
}
function pctStr(n) { return `${Math.round((n || 0) * 10) / 10}%`; }
function num(n) { return Math.round(n || 0).toLocaleString(); }

// Top-line hub KPIs derived from the surfaces above (all real).
export function hubRollup() {
  const camp = safe(() => marketingStats(), { sent: 0 });
  const land = safe(() => landingStats(), { views: 0, submissions: 0 });
  const forms = safe(() => formStats(), { submissions: 0, contacts: 0 });
  const eng = safe(() => engineStats(), { total: 0, active: 0, activeEnrollments: 0 });
  const seq = safe(() => sequenceFleet(), { activeEnroll: 0, emailsSent: 0 });
  const surfaces = surfaceRollup();
  return {
    surfaces,
    emailsSent: (camp.sent || 0) + (seq.emailsSent || 0),
    pageViews: land.views || 0,
    leadsCaptured: (forms.submissions || 0) + (land.submissions || 0),
    activeAutomations: eng.active || 0,
    activeEnrollments: (eng.activeEnrollments || 0) + (seq.activeEnroll || 0),
    liveSurfaces: surfaces.filter(s => s.metric > 0).length,
  };
}

// A real cross-surface activity feed, newest first. Only events that
// carry a real timestamp are included; falls back to an empty list.
export function recentActivity(limit = 12) {
  const out = [];
  const push = (at, icon, label, sub, to) => { const t = at ? new Date(at).getTime() : 0; if (t) out.push({ at: t, icon, label, sub, to }); };

  safe(() => getMarketingCampaigns(), []).forEach(c => {
    if (c.sentAt) push(c.sentAt, 'megaphone', `Campaign sent: ${c.name}`, `${num(c.metrics?.sent || 0)} recipients`, '/campaigns');
  });
  safe(() => getLandingPages(), []).forEach(p => {
    if (p.publishedAt) push(p.publishedAt, 'grid', `Page published: ${p.title}`, `/l/${p.slug}`, '/landing-pages');
    (p.submissions || []).slice(0, 3).forEach(s => push(s.at, 'inbox', `Lead on ${p.title}`, s.data?.email || 'New submission', '/landing-pages'));
  });
  safe(() => getForms(), []).forEach(f => {
    (f.submissions || []).slice(0, 3).forEach(s => push(s.at, 'list', `Form submission: ${f.name}`, 'New contact captured', '/forms'));
  });

  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (only the scoring config is persisted)
   ============================================================ */
let store = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rules) return parsed;
    }
  } catch {}
  const seed = { rules: defaultRules() };
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  store = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {}
  subs.forEach(fn => fn(store));
}

export function getRules() { return store.rules; }
export function resetScoring() { commit({ rules: defaultRules() }); }

export function setRulePoints(id, points) {
  const p = Math.max(0, Math.min(60, Math.round(Number(points) || 0)));
  const patch = (arr, field) => arr.map(r => (r.id === id ? { ...r, [field]: p } : r));
  const rules = store.rules;
  if (rules.demographic.some(r => r.id === id)) commit({ rules: { ...rules, demographic: patch(rules.demographic, 'points') } });
  else if (rules.behavioral.some(r => r.id === id)) commit({ rules: { ...rules, behavioral: patch(rules.behavioral, 'pointsEach') } });
}
export function toggleRule(id) {
  const rules = store.rules;
  const flip = (arr) => arr.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r));
  commit({ rules: { ...rules, demographic: flip(rules.demographic), behavioral: flip(rules.behavioral) } });
}
export function setDecay(v) {
  const decayPerDay = Math.max(0, Math.min(4, Number(v) || 0));
  commit({ rules: { ...store.rules, decayPerDay } });
}
export function setBandMin(grade, min) {
  const m = Math.max(0, Math.min(100, Math.round(Number(min) || 0)));
  commit({ rules: { ...store.rules, bands: store.rules.bands.map(b => (b.grade === grade ? { ...b, min: m } : b)) } });
}
// Add a lightweight custom demographic rule (title keyword based) so the builder
// is not read-only. Fully local + serializable.
export function addDemographicRule({ label, value, points }) {
  const rule = {
    id: 'd_' + strhash(label + value + Date.now()).toString(36),
    label: (label || 'Custom title rule').trim(),
    target: 'titleKeyword',
    value: (value || '').trim(),
    points: Math.max(0, Math.min(60, Math.round(Number(points) || 5))),
    enabled: true,
    custom: true,
  };
  commit({ rules: { ...store.rules, demographic: [...store.rules.demographic, rule] } });
  return rule;
}
export function removeRule(id) {
  const rules = store.rules;
  commit({ rules: {
    ...rules,
    demographic: rules.demographic.filter(r => r.id !== id),
    behavioral: rules.behavioral.filter(r => r.id !== id),
  } });
}

// Reactive hook. Re-renders on any scoring-config change.
export function useMarketHub(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(store));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(store);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- misc small helpers exported for the page ---------- */
export { contactName, getContact };
