// ============================================================
// RALLY ADS  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// Cross-channel ad manager + reporting. The gap Rally closes vs
// HubSpot Marketing Hub (parity) and GoHighLevel (a real weakness):
// owners run paid media in four separate dashboards - Google Ads,
// Meta (Facebook + Instagram), LinkedIn and TikTok - and none of them
// know which click became a closed-won deal. Rally unifies spend,
// results and ROAS in one board AND ties every dollar back to the CRM
// pipeline, so the loop closes from click to closed-won.
//
// This slice is ADDITIVE. It owns its own campaigns + creatives with
// the same deterministic-seed + pub/sub + localStorage pattern as
// store.js, and it only READS the live CRM (won deals) to power the
// attribution tie-in. A real ad-platform sync is env-gated and stays
// dormant offline (degrades to the seeded local board).
//
// Live equivalent: rally_ad_campaigns + rally_ad_creatives tables; the
// platform sync would route through api/ads-sync.js (Google/Meta/
// LinkedIn/TikTok marketing APIs). ASCII only, NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals, getCompany } from './store.js';

const LS_KEY = 'rally_ads_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (mirrors store.js) ---------- */
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
// The four ad networks Rally unifies. Color drives every chart + chip so a
// channel reads the same everywhere; `short` is the square glyph label.
export const CHANNELS = [
  { id: 'google', label: 'Google Ads', short: 'G', color: '#4285f4', note: 'Search + YouTube' },
  { id: 'meta', label: 'Meta', short: 'M', color: '#e1306c', note: 'Facebook + Instagram' },
  { id: 'linkedin', label: 'LinkedIn', short: 'in', color: '#0a66c2', note: 'B2B sponsored' },
  { id: 'tiktok', label: 'TikTok', short: 'T', color: '#14b8a6', note: 'Spark + in-feed' },
];
export const channelById = (id) => CHANNELS.find(c => c.id === id) || CHANNELS[0];

// Campaign objectives, shared with the create-campaign modal.
export const OBJECTIVES = [
  { id: 'leads', label: 'Lead generation' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'retargeting', label: 'Retargeting' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'awareness', label: 'Brand awareness' },
];
export const objectiveById = (id) => OBJECTIVES.find(o => o.id === id) || OBJECTIVES[0];

export const STATUS_META = {
  active: { label: 'Active', tone: 'ok' },
  paused: { label: 'Paused', tone: 'warn' },
  ended: { label: 'Ended', tone: 'default' },
};

// Per-channel benchmark rates that shape believable seeded metrics. These are
// realistic order-of-magnitude paid-media rates, not fabricated CRM data.
const CHANNEL_RATES = {
  google: { cpc: 2.9, ctr: 0.046, conv: 0.085, roas: 4.3 },
  meta: { cpc: 1.5, ctr: 0.021, conv: 0.055, roas: 3.1 },
  linkedin: { cpc: 8.8, ctr: 0.013, conv: 0.11, roas: 2.7 },
  tiktok: { cpc: 1.1, ctr: 0.030, conv: 0.038, roas: 2.1 },
};

/* Env-gated real platform sync. Dormant offline; when the marketing-API env is
   wired the board would pull live spend/results instead of the seeded set. */
export function hasAdsSyncEnv() {
  try { return !!(import.meta && import.meta.env && import.meta.env.VITE_ADS_PROVIDER); } catch { return false; }
}

/* ============================================================
   DERIVED METRIC MATH  (hoisted function declarations so they are
   safe to call anywhere; pure over a single campaign-like row)
   ============================================================ */
export function ctr(c) { return c && c.impressions ? c.clicks / c.impressions : 0; }
export function cpc(c) { return c && c.clicks ? c.spend / c.clicks : 0; }
export function cpm(c) { return c && c.impressions ? (c.spend / c.impressions) * 1000 : 0; }
export function cpl(c) { return c && c.leads ? c.spend / c.leads : 0; }
export function roas(c) { return c && c.spend ? c.revenue / c.spend : 0; }
export function pctChange(cur, prev) { if (!prev) return cur ? 100 : 0; return Math.round(((cur - prev) / prev) * 100); }

/* ============================================================
   SEED
   ============================================================ */
// Hand-authored campaign spine (reads better than random names); metrics are
// filled deterministically from the channel benchmark rates + fixed-seed noise.
const CAMPAIGN_SPINE = [
  { channel: 'google', name: 'Branded Search - Always On', objective: 'conversions', budget: 6500, status: 'active', audience: 'People searching Rally + brand terms' },
  { channel: 'google', name: 'Non-brand Demand Gen', objective: 'leads', budget: 9000, status: 'active', audience: 'In-market: CRM, sales software, revenue ops' },
  { channel: 'google', name: 'Competitor Conquesting', objective: 'leads', budget: 4200, status: 'active', audience: 'Searchers on rival CRM keywords' },
  { channel: 'google', name: 'YouTube Explainer Pre-roll', objective: 'awareness', budget: 3400, status: 'active', audience: 'Business + productivity viewers, US' },
  { channel: 'meta', name: 'Retargeting - Site Visitors', objective: 'retargeting', budget: 3800, status: 'active', audience: 'Visited pricing or demo in last 30 days' },
  { channel: 'meta', name: 'Lookalike Prospecting', objective: 'leads', budget: 5200, status: 'active', audience: '1% lookalike of closed-won accounts' },
  { channel: 'meta', name: 'Instagram Reels - Awareness', objective: 'awareness', budget: 2400, status: 'paused', audience: 'Founders + operators, 25-45' },
  { channel: 'linkedin', name: 'Enterprise ABM - Decision Makers', objective: 'leads', budget: 7800, status: 'active', audience: 'VP+ Revenue at 500-5000 employee firms' },
  { channel: 'linkedin', name: 'Lead Gen Forms - Book a Demo', objective: 'conversions', budget: 5600, status: 'active', audience: 'RevOps + Sales leaders, North America' },
  { channel: 'linkedin', name: 'Sponsored Content - Thought Leadership', objective: 'awareness', budget: 3200, status: 'active', audience: 'GTM community + newsletter engagers' },
  { channel: 'tiktok', name: 'Spark Ads - Product Demo', objective: 'awareness', budget: 2600, status: 'active', audience: 'SMB owners, business-hashtag viewers' },
  { channel: 'tiktok', name: 'Founder Story - Boosted', objective: 'traffic', budget: 1800, status: 'paused', audience: 'Startup + entrepreneur interest' },
];

// Creative spine, each anchored to a campaign index in CAMPAIGN_SPINE.
const CREATIVE_SPINE = [
  { campaign: 0, headline: 'The CRM that runs your revenue for you', format: 'Responsive search', thumb: '🔍' },
  { campaign: 1, headline: 'Close the loop from click to closed-won', format: 'Responsive search', thumb: '🎯' },
  { campaign: 3, headline: '60 seconds: how Rally replaces four tools', format: 'Video', thumb: '🎬' },
  { campaign: 4, headline: 'Still thinking it over? See a live pipeline', format: 'Single image', thumb: '🖼️' },
  { campaign: 5, headline: 'Teams like yours grew pipeline 3x', format: 'Carousel', thumb: '🗂️' },
  { campaign: 6, headline: 'Your revenue, on autopilot', format: 'Reel', thumb: '📱' },
  { campaign: 7, headline: 'One operator per rep. Meet Rook.', format: 'Single image', thumb: '🤖' },
  { campaign: 8, headline: 'Book a demo without leaving LinkedIn', format: 'Lead gen form', thumb: '📝' },
  { campaign: 10, headline: 'Watch a deal build itself', format: 'Spark ad', thumb: '⚡' },
];

function buildSeed() {
  const rnd = mulberry32(20260713);
  const now = Date.now();
  const DAY = 86400000;
  const iso = (d) => new Date(now + d * DAY).toISOString();
  const jitter = (lo, hi) => lo + rnd() * (hi - lo);

  const campaigns = CAMPAIGN_SPINE.map((s, i) => {
    const rate = CHANNEL_RATES[s.channel];
    const active = s.status === 'active';
    // 6 monthly points of spend + attributed revenue (oldest -> newest).
    const spendSpark = [];
    const revSpark = [];
    for (let m = 0; m < 6; m++) {
      // paused campaigns taper their most recent months toward zero.
      const recency = m / 5;
      const factor = active ? jitter(0.82, 1.08) : (recency < 0.6 ? jitter(0.85, 1.0) : jitter(0.05, 0.22));
      const mSpend = Math.round((s.budget * factor) / 10) * 10;
      const roasM = rate.roas * jitter(0.68, 1.5);
      const mRev = Math.round((mSpend * roasM) / 50) * 50;
      spendSpark.push(mSpend);
      revSpark.push(mRev);
    }
    const spend = spendSpark.reduce((a, b) => a + b, 0);
    const revenue = revSpark.reduce((a, b) => a + b, 0);
    const clicks = Math.max(1, Math.round((spend / rate.cpc) * jitter(0.9, 1.12)));
    const impressions = Math.max(clicks, Math.round((clicks / rate.ctr) * jitter(0.9, 1.15)));
    const leads = Math.max(0, Math.round(clicks * rate.conv * jitter(0.8, 1.25)));
    return {
      id: `ad_${i + 1}`,
      name: s.name,
      channel: s.channel,
      objective: s.objective,
      status: s.status,
      budget: s.budget,
      audience: s.audience,
      spend, revenue, impressions, clicks, leads,
      spendSpark, revSpark,
      createdAt: iso(-Math.round(jitter(35, 220))),
    };
  });

  const byName = {};
  campaigns.forEach(c => { byName[c.name] = c; });

  const creatives = CREATIVE_SPINE.map((cr, i) => {
    const camp = campaigns[cr.campaign];
    const rate = CHANNEL_RATES[camp.channel];
    const impressions = Math.round(camp.impressions * jitter(0.18, 0.42));
    const ctrV = rate.ctr * jitter(0.7, 1.9);
    const clicks = Math.max(1, Math.round(impressions * ctrV));
    const spend = Math.round(clicks * rate.cpc * jitter(0.9, 1.1));
    const conversions = Math.max(0, Math.round(clicks * rate.conv * jitter(0.7, 1.4)));
    return {
      id: `cr_${i + 1}`,
      campaignId: camp.id,
      channel: camp.channel,
      headline: cr.headline,
      format: cr.format,
      thumb: cr.thumb,
      impressions, clicks, spend, conversions,
    };
  });

  return { seededAt: new Date(now).toISOString(), campaigns, creatives };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

let state = load();
const subs = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetAds() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useAds(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getCampaigns = () => state.campaigns;
export const getCampaign = (id) => state.campaigns.find(c => c.id === id) || null;
export const getCreatives = () => state.creatives;

// Roll-up across a set of campaigns (defaults to all). Returns absolute totals
// plus the blended derived metrics so the overview tiles never drift.
export function rollup(list = state.campaigns) {
  const t = list.reduce((a, c) => ({
    spend: a.spend + c.spend,
    revenue: a.revenue + c.revenue,
    impressions: a.impressions + c.impressions,
    clicks: a.clicks + c.clicks,
    leads: a.leads + c.leads,
  }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0 });
  return {
    ...t,
    ctr: ctr(t), cpc: cpc(t), cpm: cpm(t), cpl: cpl(t), roas: roas(t),
    campaigns: list.length,
    active: list.filter(c => c.status === 'active').length,
  };
}

// Overview snapshot: totals + a spend-vs-revenue monthly series + last-month
// trend for the headline tiles.
export function adsOverview() {
  const total = rollup();
  const series = monthlySeries();
  const last = series[series.length - 1] || { spend: 0, revenue: 0 };
  const prev = series[series.length - 2] || { spend: 0, revenue: 0 };
  return {
    ...total,
    series,
    trend: {
      spend: pctChange(last.spend, prev.spend),
      revenue: pctChange(last.revenue, prev.revenue),
      roas: pctChange(last.spend ? last.revenue / last.spend : 0, prev.spend ? prev.revenue / prev.spend : 0),
    },
  };
}

// 6-month spend-vs-revenue series, summed across the given campaigns. Month
// labels are computed at read time (display only) so the chart always reads as
// the trailing six months.
export function monthlySeries(list = state.campaigns) {
  const spend = new Array(6).fill(0);
  const revenue = new Array(6).fill(0);
  for (const c of list) {
    (c.spendSpark || []).forEach((v, i) => { spend[i] += v; });
    (c.revSpark || []).forEach((v, i) => { revenue[i] += v; });
  }
  const labels = [];
  const d = new Date();
  for (let m = 5; m >= 0; m--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - m, 1);
    labels.push(dt.toLocaleDateString('en-US', { month: 'short' }));
  }
  return labels.map((label, i) => ({ label, spend: spend[i], revenue: revenue[i] }));
}

// Per-channel breakdown cards. One row per network, sorted by spend.
export function channelBreakdown() {
  return CHANNELS.map(ch => {
    const list = state.campaigns.filter(c => c.channel === ch.id);
    const r = rollup(list);
    return { ...ch, ...r, list };
  }).sort((a, b) => b.spend - a.spend);
}

// Best-performing creatives, ranked by click-through rate (a real ad-quality
// signal). Each row derives its own CTR + CPC.
export function bestCreatives() {
  return state.creatives
    .map(cr => ({ ...cr, ctr: ctr(cr), cpc: cpc(cr) }))
    .sort((a, b) => b.ctr - a.ctr);
}

/* ---------- ATTRIBUTION TIE-IN ----------
   Reads the live CRM (store.js) and deterministically attributes each
   closed-won deal to an ad channel, so paid media ties back to real pipeline
   revenue. Deterministic: a fixed-seed PRNG walks deals in id order, weighted
   toward the channels that spend the most. This is the "click to closed-won"
   loop that neither Google, Meta, LinkedIn nor TikTok can see on their own. */
export function attributedDeals() {
  let won = [];
  try { won = getDeals().filter(d => d.status === 'won'); } catch { won = []; }
  won = [...won].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // Weighted channel wheel by spend share so bigger spenders source more deals.
  const spendByCh = {};
  let totalSpend = 0;
  for (const ch of CHANNELS) { spendByCh[ch.id] = 0; }
  for (const c of state.campaigns) { spendByCh[c.channel] += c.spend; totalSpend += c.spend; }
  const wheel = [];
  let acc = 0;
  for (const ch of CHANNELS) {
    acc += totalSpend ? spendByCh[ch.id] / totalSpend : 0.25;
    wheel.push({ id: ch.id, upto: acc });
  }

  const rnd = mulberry32(424242);
  const rows = won.map(d => {
    const r = rnd();
    const hit = wheel.find(w => r <= w.upto) || wheel[wheel.length - 1];
    let company = '';
    try { company = getCompany(d.companyId)?.name || ''; } catch {}
    return { dealId: d.id, name: d.name, company, value: d.value, channel: hit.id };
  });

  const byChannel = CHANNELS.map(ch => {
    const list = rows.filter(r => r.channel === ch.id);
    return { ...ch, count: list.length, revenue: list.reduce((s, r) => s + r.value, 0), deals: list };
  });

  const spend = totalSpend;
  const revenue = rows.reduce((s, r) => s + r.value, 0);
  return {
    rows,
    byChannel,
    totalRevenue: revenue,
    totalDeals: rows.length,
    blendedRoas: spend ? revenue / spend : 0,
  };
}

/* ============================================================
   WRITE API  (validated writers)
   ============================================================ */
// SUPABASE: from('rally_ad_campaigns').insert(row).select().single()
export function createCampaign({ name, channel = 'google', objective = 'leads', budget, audience = '' }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Campaign name is required.' };
  const b = Number(budget);
  if (!Number.isFinite(b) || b <= 0) return { error: 'budget', message: 'Enter a monthly budget.' };
  const ch = channelById(channel).id;
  const c = {
    id: newId('ad'),
    name: name.trim(),
    channel: ch,
    objective: objectiveById(objective).id,
    status: 'active',
    budget: b,
    audience: audience.trim(),
    spend: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0,
    spendSpark: new Array(6).fill(0),
    revSpark: new Array(6).fill(0),
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, campaigns: [c, ...state.campaigns] });
  return { campaign: c };
}

// SUPABASE: update status. Flips active <-> paused (the pause/enable toggle).
export function toggleCampaign(id) {
  const c = getCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  c.status = c.status === 'active' ? 'paused' : 'active';
  commit({ ...state });
  return { campaign: c };
}
export function setCampaignStatus(id, status) {
  const c = getCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  if (!STATUS_META[status]) return { error: 'status', message: 'Unknown status.' };
  c.status = status;
  commit({ ...state });
  return { campaign: c };
}
export function updateCampaign(id, patch = {}) {
  const c = getCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  if (patch.budget != null) {
    const b = Number(patch.budget);
    if (!Number.isFinite(b) || b <= 0) return { error: 'budget', message: 'Enter a valid budget.' };
    patch = { ...patch, budget: b };
  }
  Object.assign(c, patch);
  commit({ ...state });
  return { campaign: c };
}
// SUPABASE: from('rally_ad_campaigns').delete().eq('id', id). Safe on unknown id.
export function deleteCampaign(id) {
  const c = getCampaign(id);
  if (!c) return { error: 'missing', message: 'Campaign not found.' };
  commit({
    ...state,
    campaigns: state.campaigns.filter(x => x.id !== id),
    creatives: state.creatives.filter(x => x.campaignId !== id),
  });
  return { ok: true, id };
}
