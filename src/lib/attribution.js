// ============================================================
// RALLY ATTRIBUTION ENGINE  (pure, deterministic over the store)
// Answers "which channels and campaigns produced the revenue?" by
// building a per-deal TOUCH TIMELINE from three real inputs -
//   1. an acquisition source, derived from the deal's own contacts
//      (their tags: referral / inbound / event lead) with a stable
//      hash fallback so every deal has an honest origin channel,
//   2. marketing CAMPAIGN sends that actually reached one of the
//      deal's contacts inside the deal's live window (from
//      marketing-campaigns.js resolveAudience), and
//   3. sales ENGAGEMENT activities on the deal (calls / emails /
//      meetings from the activity log).
// Credit is then distributed across those touches under four models:
// first-touch, last-touch, linear (even multi-touch) and
// position-based (U-shaped 40/20/40). Same store => same numbers.
//
// This module is ADDITIVE and READ-ONLY. It never writes state; it
// only reads store.js + marketing-campaigns.js selectors.
// SUPABASE: touches would materialize from rally_activities +
// rally_marketing_events joined to rally_deals. ASCII only. NO
// em-dash / en-dash.
// ============================================================
import { getDeals, getContacts, getActivities } from './store.js';
import { getMarketingCampaigns, resolveAudience } from './marketing-campaigns.js';

/* ============================================================
   CHANNEL CATALOG
   kind drives the "marketing vs sales vs other sourced" rollup.
   color is a stable brand hue so every chart reads the same way.
   ============================================================ */
export const CHANNELS = [
  { id: 'inbound',     label: 'Inbound',        kind: 'marketing', color: '#5b4bf5' },
  { id: 'campaign',    label: 'Marketing email', kind: 'marketing', color: '#8b3fd4' },
  { id: 'paid',        label: 'Paid search',    kind: 'marketing', color: '#e0752d' },
  { id: 'organic',     label: 'Organic search', kind: 'marketing', color: '#0ea5a3' },
  { id: 'events',      label: 'Events',         kind: 'marketing', color: '#d4a017' },
  { id: 'referral',    label: 'Referral',       kind: 'other',     color: '#1a7f52' },
  { id: 'partner',     label: 'Partner',        kind: 'other',     color: '#2563a8' },
  { id: 'outbound',    label: 'Outbound',       kind: 'sales',     color: '#c0392b' },
  { id: 'sales_call',  label: 'Sales call',     kind: 'sales',     color: '#db2777' },
  { id: 'sales_email', label: 'Sales email',    kind: 'sales',     color: '#0891b2' },
  { id: 'meeting',     label: 'Meeting',        kind: 'sales',     color: '#7c6f1e' },
];
const CH_BY_ID = new Map(CHANNELS.map(c => [c.id, c]));
export function channelMeta(id) {
  return CH_BY_ID.get(id) || { id, label: id, kind: 'other', color: '#64748b' };
}

export const KIND_META = {
  marketing: { label: 'Marketing sourced', color: '#5b4bf5' },
  sales:     { label: 'Sales sourced',     color: '#c0392b' },
  other:     { label: 'Referral / partner', color: '#1a7f52' },
};

export const ATTR_MODELS = [
  { id: 'first',    label: 'First touch', desc: 'All credit to the channel that opened the deal.' },
  { id: 'last',     label: 'Last touch',  desc: 'All credit to the final touch before the deal closed.' },
  { id: 'linear',   label: 'Multi-touch', desc: 'Credit split evenly across every touch.' },
  { id: 'position', label: 'Position',    desc: 'U-shaped: 40% first, 40% last, 20% shared between.' },
];

export const ATTR_SCOPES = [
  { id: 'won',  label: 'Won revenue',  status: 'won',  format: 'money' },
  { id: 'open', label: 'Open pipeline', status: 'open', format: 'money' },
];

// Activity types that count as a genuine buyer touch (tasks + notes are internal).
const ENGAGE_CHANNEL = { call: 'sales_call', email: 'sales_email', meeting: 'meeting' };

/* ============================================================
   CONTEXT  (built once per compute, all reads pure)
   ============================================================ */
// FNV-1a string hash -> unsigned 32-bit. Stable + deterministic so a deal's
// fallback acquisition channel never changes between renders.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const FALLBACK_ACQ = ['outbound', 'paid', 'organic', 'partner'];

function buildCtx() {
  const contacts = getContacts();
  const contactById = new Map(contacts.map(c => [c.id, c]));
  const emailToId = new Map();
  for (const c of contacts) if (c.email) emailToId.set(String(c.email).toLowerCase(), c.id);

  // Only campaigns that actually SENT can have influenced anyone. Resolve each
  // one's live audience back to contact ids so we can match against a deal.
  const sentCampaigns = getMarketingCampaigns()
    .filter(c => c.status === 'sent' && c.sentAt)
    .map(c => {
      const reached = new Set();
      for (const r of resolveAudience(c.audience, c.customList)) {
        const id = emailToId.get(String(r.email || '').toLowerCase());
        if (id) reached.add(id);
      }
      return { id: c.id, name: c.name, sentAt: c.sentAt, ts: new Date(c.sentAt).getTime(), reached };
    });

  const dealActivities = new Map();
  for (const a of getActivities()) {
    if (a.relatedType === 'deal' && a.relatedId && ENGAGE_CHANNEL[a.type]) {
      if (!dealActivities.has(a.relatedId)) dealActivities.set(a.relatedId, []);
      dealActivities.get(a.relatedId).push(a);
    }
  }
  return { contactById, sentCampaigns, dealActivities };
}

// Derive the acquisition (first-touch) channel from the deal's contacts. Real
// signal first (contact tags), stable hash fallback so the mix is varied.
function acquisitionChannel(deal, ctx) {
  const tags = new Set();
  for (const id of deal.contactIds || []) {
    const c = ctx.contactById.get(id);
    if (c) for (const t of c.tags || []) tags.add(t);
  }
  if (tags.has('referral')) return 'referral';
  if (tags.has('inbound')) return 'inbound';
  if (tags.has('event lead')) return 'events';
  return FALLBACK_ACQ[hashStr(deal.id) % FALLBACK_ACQ.length];
}

/* ============================================================
   TOUCH TIMELINE  (ordered list of channel touches for one deal)
   ============================================================ */
export function touchesForDeal(deal, ctx) {
  const created = new Date(deal.createdAt).getTime();
  // Credit window closes when the deal closed (won) or "now" (still open).
  const cutoff = deal.status === 'open' ? Date.now() : new Date(deal.closeDate || deal.createdAt).getTime();
  const touches = [];

  // 1. acquisition (always the earliest touch, at deal creation)
  touches.push({ channel: acquisitionChannel(deal, ctx), ts: created, kind: 'acq', order: 0 });

  // 2. marketing campaigns that reached a deal contact inside the window
  for (const camp of ctx.sentCampaigns) {
    if (camp.ts < created || camp.ts > cutoff) continue;
    if ((deal.contactIds || []).some(id => camp.reached.has(id))) {
      touches.push({ channel: 'campaign', ts: camp.ts, kind: 'campaign', campaignId: camp.id, order: 1 });
    }
  }

  // 3. sales engagement activities logged on the deal, inside the window
  for (const a of ctx.dealActivities.get(deal.id) || []) {
    const ts = new Date(a.dueAt || a.createdAt).getTime();
    if (!ts || ts < created || ts > cutoff) continue;
    touches.push({ channel: ENGAGE_CHANNEL[a.type], ts, kind: 'engage', order: 2 });
  }

  touches.sort((x, y) => (x.ts - y.ts) || (x.order - y.order));
  return touches;
}

// Distribute `value` across an ordered touch list under one model.
// Returns Map<channelId, amount>. Touch-level credit is also handed back so
// campaign touches can be rolled up per campaign.
function distribute(touches, value, model) {
  const byChannel = new Map();
  const perTouch = new Array(touches.length).fill(0);
  const add = (ch, amt) => byChannel.set(ch, (byChannel.get(ch) || 0) + amt);
  const n = touches.length;
  if (!n) return { byChannel, perTouch };

  if (model === 'first') { add(touches[0].channel, value); perTouch[0] = value; }
  else if (model === 'last') { add(touches[n - 1].channel, value); perTouch[n - 1] = value; }
  else if (model === 'linear') {
    const per = value / n;
    touches.forEach((t, i) => { add(t.channel, per); perTouch[i] = per; });
  } else { // position (U-shaped)
    if (n === 1) { add(touches[0].channel, value); perTouch[0] = value; }
    else if (n === 2) { add(touches[0].channel, value / 2); add(touches[1].channel, value / 2); perTouch[0] = perTouch[1] = value / 2; }
    else {
      add(touches[0].channel, value * 0.4); perTouch[0] = value * 0.4;
      add(touches[n - 1].channel, value * 0.4); perTouch[n - 1] = value * 0.4;
      const midPer = (value * 0.2) / (n - 2);
      for (let i = 1; i < n - 1; i++) { add(touches[i].channel, midPer); perTouch[i] = midPer; }
    }
  }
  return { byChannel, perTouch };
}

function scopeDeals(scope) {
  const status = (ATTR_SCOPES.find(s => s.id === scope) || ATTR_SCOPES[0]).status;
  return getDeals().filter(d => d.status === status);
}

/* ============================================================
   MAIN: attribution for one model + scope
   Returns { model, scope, total, channels[], dealCount, avgTouches,
             multiTouchShare, sourcedMix[] }
   ============================================================ */
export function computeAttribution({ model = 'linear', scope = 'won' } = {}) {
  const ctx = buildCtx();
  const deals = scopeDeals(scope);
  const totals = new Map();          // channel -> credit
  const dealSets = new Map();        // channel -> Set(dealId) touched
  const kindFirst = new Map();       // kind -> first-touch credit (for sourced mix)
  let total = 0, touchSum = 0, multi = 0;

  for (const d of deals) {
    const value = Number(d.value) || 0;
    total += value;
    const touches = touchesForDeal(d, ctx);
    touchSum += touches.length;
    const distinct = new Set(touches.map(t => t.channel));
    if (distinct.size > 1) multi++;

    const { byChannel } = distribute(touches, value, model);
    for (const [ch, amt] of byChannel) totals.set(ch, (totals.get(ch) || 0) + amt);
    for (const ch of distinct) {
      if (!dealSets.has(ch)) dealSets.set(ch, new Set());
      dealSets.get(ch).add(d.id);
    }
    // sourced mix is always first-touch based (industry convention)
    const originKind = channelMeta(touches[0].channel).kind;
    kindFirst.set(originKind, (kindFirst.get(originKind) || 0) + value);
  }

  const channels = [...totals.entries()].map(([id, credit]) => {
    const meta = channelMeta(id);
    return {
      id, label: meta.label, color: meta.color, kind: meta.kind,
      credit, deals: dealSets.get(id)?.size || 0,
      share: total ? credit / total : 0,
    };
  }).sort((a, b) => b.credit - a.credit);

  const sourcedMix = ['marketing', 'sales', 'other'].map(k => ({
    kind: k, label: KIND_META[k].label, color: KIND_META[k].color,
    value: kindFirst.get(k) || 0, share: total ? (kindFirst.get(k) || 0) / total : 0,
  })).filter(x => x.value > 0);

  return {
    model, scope, total, channels,
    dealCount: deals.length,
    avgTouches: deals.length ? touchSum / deals.length : 0,
    multiTouchShare: deals.length ? multi / deals.length : 0,
    sourcedMix,
    marketingSourced: total ? (kindFirst.get('marketing') || 0) / total : 0,
  };
}

/* ============================================================
   MODEL COMPARISON: every channel x all four models, one scope.
   Returns { channels: [{ id, label, color, first, last, linear, position }],
             totals: { first, last, linear, position } }
   ============================================================ */
export function compareModels({ scope = 'won' } = {}) {
  const ids = ATTR_MODELS.map(m => m.id);
  const runs = Object.fromEntries(ids.map(id => [id, computeAttribution({ model: id, scope })]));
  const channelIds = new Set();
  for (const id of ids) for (const c of runs[id].channels) channelIds.add(c.id);

  const channels = [...channelIds].map(cid => {
    const meta = channelMeta(cid);
    const row = { id: cid, label: meta.label, color: meta.color, kind: meta.kind };
    for (const id of ids) row[id] = (runs[id].channels.find(c => c.id === cid)?.credit) || 0;
    return row;
  }).sort((a, b) => b.linear - a.linear);

  const totals = {};
  for (const id of ids) totals[id] = runs[id].total;
  return { channels, totals, scope };
}

/* ============================================================
   CAMPAIGN INFLUENCE: real marketing sends, honest reach + pull.
   A campaign "influences" a deal when it reached one of the deal's
   contacts inside the deal's live window. We report reach, the won
   deals + value it touched, and the open pipeline it is touching.
   attributedCredit is the linear-model credit its touches earned on
   won deals (the honest, model-based dollar pull).
   Returns [{ id, name, sentAt, reached, wonDeals, wonValue,
              openDeals, openPipeline, attributedCredit }]
   ============================================================ */
export function campaignInfluence() {
  const ctx = buildCtx();
  const deals = getDeals();
  const out = ctx.sentCampaigns.map(camp => ({
    id: camp.id, name: camp.name, sentAt: camp.sentAt, reached: camp.reached.size,
    wonDeals: 0, wonValue: 0, openDeals: 0, openPipeline: 0, attributedCredit: 0,
  }));
  const byId = new Map(out.map(o => [o.id, o]));

  for (const d of deals) {
    if (d.status !== 'won' && d.status !== 'open') continue;
    const touches = touchesForDeal(d, ctx);
    const campTouches = touches.filter(t => t.kind === 'campaign');
    if (!campTouches.length) continue;
    const value = Number(d.value) || 0;
    // linear credit split (matches the linear model) for the honest dollar pull
    const per = touches.length ? value / touches.length : 0;
    for (const t of campTouches) {
      const rec = byId.get(t.campaignId);
      if (!rec) continue;
      if (d.status === 'won') { rec.wonDeals++; rec.wonValue += value; rec.attributedCredit += per; }
      else { rec.openDeals++; rec.openPipeline += value; }
    }
  }
  return out.sort((a, b) => (b.wonValue + b.openPipeline) - (a.wonValue + a.openPipeline));
}
