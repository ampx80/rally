// ============================================================
// ARDOVO REVENUE SIGNALS  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// Predictive revenue intelligence: churn risk, expansion
// propensity, and buyer intent surfaced as ONE prioritized action
// feed. Nobody else blends all three into a single stream of
// decision cards with a recommended play. This is the leapfrog on
// HubSpot Breeze Intelligence + GoHighLevel.
//
// This slice is ADDITIVE. It never mutates store.js; it seeds its
// own deterministic book of business and a scoring engine, and
// only READS the live CRM (company + user names) to feel wired in.
// Same mulberry32 + pub/sub + localStorage pattern as store.js so
// it is fully alive with zero backend. Any real enrichment call is
// env-gated (VITE_ENRICH_API) and degrades to the local model.
//
// Live equivalent: rally_accounts + rally_signals + rally_intent
// tables; the model would run in api/signals-score.js. Every score
// here is computed by a hoisted function so nothing throws during
// module-eval seeding. ASCII only, NO em-dash, NO en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getCompanies, getUsers } from './store.js';

const LS_KEY = 'rally_signals_v1';   // bump to force a clean reseed

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

// Every signal the engine can raise. `category` powers the feed filter
// (churn | expansion | intent | lifecycle), `tone` maps to Badge tones,
// `icon` reuses the shared icon set. Sign is +1 for opportunity, -1 for
// risk, 0 for neutral lifecycle - drives the value color in the UI.
export const SIGNAL_TYPES = {
  churn_risk: { id: 'churn_risk', label: 'Churn risk rising', icon: 'arrowDown', tone: 'risk', category: 'churn', sign: -1, weight: 1.0 },
  champion_left: { id: 'champion_left', label: 'Champion left', icon: 'logout', tone: 'risk', category: 'churn', sign: -1, weight: 1.1 },
  usage_drop: { id: 'usage_drop', label: 'Usage drop', icon: 'activity', tone: 'warn', category: 'churn', sign: -1, weight: 0.85 },
  competitor_mention: { id: 'competitor_mention', label: 'Competitor mention', icon: 'megaphone', tone: 'risk', category: 'churn', sign: -1, weight: 0.95 },
  expansion: { id: 'expansion', label: 'Expansion opportunity', icon: 'trendUp', tone: 'ok', category: 'expansion', sign: 1, weight: 1.0 },
  buyer_intent: { id: 'buyer_intent', label: 'Buyer intent spike', icon: 'zap', tone: 'accent', category: 'intent', sign: 1, weight: 0.9 },
  renewal: { id: 'renewal', label: 'Renewal approaching', icon: 'calendar', tone: 'info', category: 'lifecycle', sign: 0, weight: 0.7 },
};
export const signalMeta = (type) => SIGNAL_TYPES[type] || SIGNAL_TYPES.churn_risk;

export const FEED_FILTERS = [
  { value: 'all', label: 'All signals' },
  { value: 'churn', label: 'Churn' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'intent', label: 'Intent' },
  { value: 'lifecycle', label: 'Lifecycle' },
];

// Buyer-intent topics the enrichment layer watches. Anonymous spikes match a
// firmographic profile; known spikes resolve to an account in the book.
export const INTENT_TOPICS = [
  'Pricing and plans', 'Security and compliance', 'API and integrations',
  'Competitor comparison', 'ROI and business case', 'Enterprise tier',
  'Implementation and onboarding', 'Data migration',
];

export function bandFor(score) {
  if (score >= 75) return { label: 'Critical', color: 'var(--risk)', tone: 'risk' };
  if (score >= 55) return { label: 'Elevated', color: 'var(--warn)', tone: 'warn' };
  if (score >= 35) return { label: 'Watch', color: 'var(--info)', tone: 'info' };
  return { label: 'Stable', color: 'var(--ok)', tone: 'ok' };
}
export function expansionBand(score) {
  if (score >= 75) return { label: 'Hot', color: 'var(--ok)', tone: 'ok' };
  if (score >= 55) return { label: 'Warm', color: 'var(--accent)', tone: 'accent' };
  if (score >= 35) return { label: 'Nurture', color: 'var(--info)', tone: 'info' };
  return { label: 'Low', color: 'var(--n-400)', tone: 'default' };
}

/* ============================================================
   SCORING ENGINE  (all hoisted - safe to call during seeding)
   ============================================================ */
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function pctDelta(arr) {
  if (!arr || arr.length < 2) return 0;
  const a = arr[0], b = arr[arr.length - 1];
  if (!a) return 0;
  return Math.round(((b - a) / a) * 100);
}
function lastOf(arr) { return arr && arr.length ? arr[arr.length - 1] : 0; }

// Build an n-point trend from start to end with light deterministic jitter.
function trendArr(start, end, n, rnd, jitter = 4) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = start + (end - start) * t;
    const noise = (rnd() - 0.5) * jitter;
    out.push(Math.round(clamp(base + noise, 0, 100)));
  }
  out[n - 1] = Math.round(clamp(end, 0, 100));
  return out;
}

// Churn probability 0-100. Blends usage decline, health trajectory, champion
// engagement, support load, competitor pressure, login recency, renewal
// proximity and sentiment. Deterministic and monotonic in each risk factor.
export function computeChurnScore(a) {
  let s = 6;
  const uDelta = pctDelta(a.usageTrend);
  if (uDelta < 0) s += Math.min(34, -uDelta * 0.9);
  s += clamp((70 - lastOf(a.healthTrend)) * 0.5, 0, 28);
  if (a.championStatus === 'left') s += 26;
  else if (a.championStatus === 'quiet') s += 12;
  s += Math.min(16, (a.openTickets || 0) * 4);
  if (a.competitorMentioned) s += 12;
  s += clamp(((a.lastLoginDays || 0) - 7) * 0.7, 0, 14);
  if ((a.renewalInDays || 999) <= 45) s += 6;
  s += (100 - (a.sentiment ?? 70)) * 0.12;
  return Math.round(clamp(s, 2, 97));
}

// Expansion propensity 0-100. Blends seat utilization, usage growth, health,
// champion engagement and sentiment; competitor pressure discounts it.
export function computeExpansionScore(a) {
  let s = 8;
  const util = a.seats ? a.seatsUsed / a.seats : 0;
  if (util > 0.9) s += 32; else if (util > 0.78) s += 20; else s += util * 8;
  const uDelta = pctDelta(a.usageTrend);
  if (uDelta > 0) s += Math.min(28, uDelta * 0.85);
  s += clamp((lastOf(a.healthTrend) - 60) * 0.4, 0, 20);
  if (a.championStatus === 'engaged') s += 10;
  s += (a.sentiment ?? 70) * 0.1;
  if (a.competitorMentioned) s -= 10;
  if (a.championStatus === 'left') s -= 16;
  return Math.round(clamp(s, 3, 98));
}

// Ranked risk drivers behind a churn score (top 4). Each has a plain-language
// label and a 0-100 impact used for the driver bars on the radar.
export function churnDrivers(a) {
  const out = [];
  const uDelta = pctDelta(a.usageTrend);
  const hLast = lastOf(a.healthTrend);
  if (uDelta < 0) out.push({ label: `Weekly active usage down ${Math.abs(uDelta)}%`, impact: clamp(-uDelta * 1.7, 12, 100) });
  if (a.championStatus === 'left') out.push({ label: `Champion ${a.championName || 'contact'} left the account`, impact: 94 });
  else if (a.championStatus === 'quiet') out.push({ label: `Champion quiet for ${a.lastLoginDays}d`, impact: 56 });
  if ((a.openTickets || 0) >= 2) out.push({ label: `${a.openTickets} open support tickets`, impact: clamp(a.openTickets * 17, 22, 90) });
  if (a.competitorMentioned) out.push({ label: `Evaluating ${a.competitor || 'a competitor'}`, impact: 80 });
  if ((a.renewalInDays || 999) <= 45) out.push({ label: `Renewal in ${a.renewalInDays}d`, impact: clamp(74 - a.renewalInDays, 22, 82) });
  if (hLast < 55) out.push({ label: `Health score at ${hLast}`, impact: clamp(72 - hLast, 16, 86) });
  if ((a.sentiment ?? 70) < 55) out.push({ label: `Sentiment dipped to ${a.sentiment}`, impact: clamp(82 - a.sentiment, 15, 80) });
  return out.sort((x, y) => y.impact - x.impact).slice(0, 4);
}

// The expansion story: the strongest positive signal, a concrete offer, and
// the incremental ARR it would unlock.
export function expansionPlay(a) {
  const util = a.seats ? a.seatsUsed / a.seats : 0;
  const uDelta = pctDelta(a.usageTrend);
  if (util > 0.9) return { signal: `Seats ${Math.round(util * 100)}% consumed`, offer: `Add ${Math.max(5, Math.ceil(a.seats * 0.4))} seats`, value: Math.round(a.arr * 0.34) };
  if (uDelta > 22) return { signal: `Usage up ${uDelta}% this quarter`, offer: 'Upgrade to Enterprise tier', value: Math.round(a.arr * 0.5) };
  if (a.featureInterest) return { signal: `${a.featureInterest} adoption climbing`, offer: `Attach the ${a.featureInterest} module`, value: Math.round(a.arr * 0.28) };
  if (util > 0.78) return { signal: `Seats ${Math.round(util * 100)}% consumed`, offer: `Add ${Math.max(3, Math.ceil(a.seats * 0.25))} seats`, value: Math.round(a.arr * 0.22) };
  return { signal: 'Healthy multi-team footprint', offer: 'Cross-sell a premium add-on', value: Math.round(a.arr * 0.18) };
}

// Attach every derived field to a raw account. Pure + hoisted.
function deriveAccount(a) {
  const churnScore = computeChurnScore(a);
  const expansionScore = computeExpansionScore(a);
  const drivers = churnDrivers(a);
  const play = expansionPlay(a);
  const hLast = lastOf(a.healthTrend);
  const health = hLast >= 70 ? 'green' : hLast >= 50 ? 'yellow' : 'red';
  return {
    ...a,
    churnScore, expansionScore,
    drivers,
    expansionSignal: play.signal, suggestedOffer: play.offer, expansionValue: play.value,
    usageDelta: pctDelta(a.usageTrend),
    healthDelta: pctDelta(a.healthTrend),
    health,
    valueAtRisk: Math.round(a.arr * (churnScore / 100)),
  };
}

/* ============================================================
   SIGNAL BUILDERS  (hoisted; each returns a decision card)
   ============================================================ */
function confidenceFrom(base, rnd) { return Math.round(clamp(base + (rnd() - 0.5) * 6, 40, 99)); }

function buildSignalsForAccount(a, rnd, dayIso) {
  const out = [];
  const push = (type, extra) => {
    const meta = signalMeta(type);
    out.push({
      id: `sg_${a.id}_${type}`,
      type, category: meta.category,
      accountId: a.id, accountName: a.name, industry: a.industry, owner: a.owner,
      arr: a.arr,
      createdAt: dayIso(-(1 + Math.floor(rnd() * 12))),
      status: 'open',
      ...extra,
    });
  };

  // Churn family - champion loss dominates, else the composite risk card.
  if (a.championStatus === 'left') {
    push('champion_left', {
      confidence: confidenceFrom(88, rnd),
      value: -a.valueAtRisk,
      evidence: [
        `${a.championName} removed as primary contact 6 days ago`,
        `No executive sponsor identified on ${a.name}`,
        `Weekly active usage down ${Math.abs(a.usageDelta)}% since the change`,
      ],
      play: { title: 'Run a save play', detail: `Map a new champion this week. Ask Rook to draft a multithread email to the ${a.industry} ops and finance leads before renewal.`, cta: 'Draft multithread' },
      rookPrompt: `${a.name} just lost its champion ${a.championName}. Draft a multithread save play and identify two new potential champions from their org.`,
    });
  } else if (a.churnScore >= 60) {
    push('churn_risk', {
      confidence: confidenceFrom(a.churnScore, rnd),
      value: -a.valueAtRisk,
      evidence: a.drivers.slice(0, 3).map(d => d.label),
      play: { title: 'Open a retention play', detail: `Book a value review with the economic buyer. Lead with the ${a.drivers[0]?.label.toLowerCase() || 'usage'} data and a renewal incentive.`, cta: 'Book value review' },
      rookPrompt: `${a.name} has a churn risk of ${a.churnScore}. Summarize the top drivers and draft a retention play I can run this week.`,
    });
  }

  // Standalone usage drop (only when churn card did not already lead with it).
  if (a.usageDelta <= -20 && a.championStatus !== 'left' && a.churnScore < 60) {
    push('usage_drop', {
      confidence: confidenceFrom(70, rnd),
      value: -Math.round(a.arr * 0.18),
      evidence: [
        `Weekly active usage down ${Math.abs(a.usageDelta)}% over 8 weeks`,
        `Logins last seen ${a.lastLoginDays}d ago`,
        `${a.seatsUsed} of ${a.seats} seats active`,
      ],
      play: { title: 'Re-onboard the team', detail: 'Trigger an adoption sequence and offer a 30 minute enablement session for the quiet seats.', cta: 'Start adoption play' },
      rookPrompt: `${a.name} usage is falling. Draft a re-onboarding email and suggest which features to reintroduce.`,
    });
  }

  // Competitor mention.
  if (a.competitorMentioned) {
    push('competitor_mention', {
      confidence: confidenceFrom(76, rnd),
      value: -Math.round(a.arr * 0.4),
      evidence: [
        `${a.championName || 'A stakeholder'} mentioned ${a.competitor} on a recent call`,
        `Pricing page revisited 3 times this week`,
        `Renewal ${a.renewalInDays <= 120 ? `in ${a.renewalInDays}d` : 'this year'}`,
      ],
      play: { title: 'Send a competitive brief', detail: `Arm the champion with a ${a.competitor} switching-cost teardown and a loyalty offer before the evaluation hardens.`, cta: 'Send battlecard' },
      rookPrompt: `${a.name} is evaluating ${a.competitor}. Give me a battlecard and a counter-offer to protect the renewal.`,
    });
  }

  // Renewal approaching (lifecycle - fires when close and not already critical).
  if ((a.renewalInDays || 999) <= 40 && a.championStatus !== 'left') {
    push('renewal', {
      confidence: confidenceFrom(82, rnd),
      value: a.arr,
      evidence: [
        `${a.name} renews in ${a.renewalInDays} days`,
        `Health ${a.health}, churn probability ${a.churnScore}`,
        `${a.owner} is the account owner`,
      ],
      play: { title: 'Lock the renewal', detail: a.expansionScore >= 60 ? 'Bundle the renewal with the expansion below for a single multi-year signature.' : 'Confirm the paperwork path and pre-empt any procurement delay.', cta: 'Prep renewal' },
      rookPrompt: `${a.name} renews in ${a.renewalInDays} days. Build me a renewal plan and flag any risk to closing on time.`,
    });
  }

  // Expansion opportunity.
  if (a.expansionScore >= 64) {
    push('expansion', {
      confidence: confidenceFrom(a.expansionScore, rnd),
      value: a.expansionValue,
      evidence: [
        a.expansionSignal,
        `Health trending ${a.healthDelta >= 0 ? 'up' : 'down'} ${Math.abs(a.healthDelta)}%`,
        `${a.championName || 'Champion'} engaged, sentiment ${a.sentiment}`,
      ],
      play: { title: 'Open an expansion', detail: `${a.suggestedOffer}. Frame it against their ${a.expansionSignal.toLowerCase()} and book time with the economic buyer.`, cta: 'Build expansion quote' },
      rookPrompt: `${a.name} looks ready to expand (${a.suggestedOffer}). Draft the expansion pitch and estimate the ARR upside.`,
    });
  }

  // Buyer intent spike (known account).
  if (a.intentTopic) {
    push('buyer_intent', {
      confidence: confidenceFrom(a.intentScore || 72, rnd),
      value: Math.round(a.arr * 0.3),
      evidence: [
        `${a.intentSessions} research sessions on "${a.intentTopic}" this week`,
        `${a.intentTopic} interest up ${a.intentDelta}% vs baseline`,
        `Matches ${a.industry} buying pattern`,
      ],
      play: { title: 'Strike while intent is hot', detail: `Reach out today with content on ${a.intentTopic}. Intent decays fast - the first vendor to respond wins the frame.`, cta: 'Send intent play' },
      rookPrompt: `${a.name} is showing buyer intent around ${a.intentTopic}. Draft an outreach that meets them where they are researching.`,
    });
  }

  return out;
}

// A priority score so the feed ranks the highest-leverage cards first:
// confidence x type weight x a log-scaled dollar factor.
export function signalPriority(sig) {
  const meta = signalMeta(sig.type);
  const dollars = Math.abs(sig.value || 0);
  const dollarFactor = 1 + Math.log10(1 + dollars) / 6;
  return Math.round((sig.confidence || 50) * meta.weight * dollarFactor);
}

/* ============================================================
   SEED
   ============================================================ */
const OWNERS = ['Jordan Avery', 'Nina Kapoor', 'Simone Diaz', 'Theo Bennett', 'Marcus Hale'];
const COMPETITORS = ['HubSpot', 'Salesforce', 'GoHighLevel', 'Pipedrive', 'Zoho'];
const REGIONS = ['San Francisco, CA', 'Austin, TX', 'New York, NY', 'Chicago, IL', 'Denver, CO', 'Boston, MA', 'Seattle, WA', 'Atlanta, GA'];
const CHAMPIONS = ['Dana Whitfield', 'Marcus Bell', 'Priya Nair', 'Leah Okonkwo', 'Sam Ellison', 'Grace Whitman', 'Owen Radcliffe', 'Renee Faulkner', 'Victor Pham', 'Isabel Cortez'];

// Curated hero accounts guarantee a compelling, stable feed on first load.
// Each carries the RAW inputs the engine scores; nothing is precomputed.
function heroAccounts() {
  return [
    { name: 'Vertex Robotics', industry: 'Manufacturing', arr: 420000, seats: 120, seatsUsed: 114, championName: 'Dana Whitfield', championStatus: 'engaged', openTickets: 0, sentiment: 88, competitorMentioned: false, renewalInDays: 210, lastLoginDays: 1, featureInterest: 'Advanced Analytics', usageTrend: [61, 64, 66, 70, 74, 79, 85, 92], healthTrend: [72, 74, 76, 80, 83, 86, 88, 91], intentTopic: 'Enterprise tier', intentSessions: 14, intentDelta: 180, intentScore: 84 },
    { name: 'Northwind Freight', industry: 'Logistics', arr: 168000, seats: 60, seatsUsed: 22, championName: 'Leah Okonkwo', championStatus: 'left', openTickets: 3, sentiment: 41, competitorMentioned: true, competitor: 'Salesforce', renewalInDays: 34, lastLoginDays: 19, usageTrend: [78, 74, 70, 63, 55, 48, 40, 33], healthTrend: [70, 66, 60, 54, 48, 43, 39, 34] },
    { name: 'Cobalt Systems', industry: 'SaaS', arr: 96000, seats: 40, seatsUsed: 38, championName: 'Priya Nair', championStatus: 'engaged', openTickets: 1, sentiment: 82, competitorMentioned: false, renewalInDays: 96, lastLoginDays: 2, featureInterest: 'API access', usageTrend: [40, 44, 49, 55, 60, 66, 73, 80], healthTrend: [64, 67, 70, 73, 76, 80, 83, 86], intentTopic: 'API and integrations', intentSessions: 9, intentDelta: 120, intentScore: 74 },
    { name: 'Meridian Health', industry: 'Healthcare', arr: 240000, seats: 90, seatsUsed: 51, championName: 'Sam Ellison', championStatus: 'quiet', openTickets: 2, sentiment: 58, competitorMentioned: true, competitor: 'HubSpot', renewalInDays: 62, lastLoginDays: 12, usageTrend: [70, 68, 66, 61, 58, 55, 52, 49], healthTrend: [74, 71, 68, 64, 61, 58, 56, 53] },
    { name: 'Apex Capital', industry: 'Financial Services', arr: 310000, seats: 75, seatsUsed: 71, championName: 'Grace Whitman', championStatus: 'engaged', openTickets: 0, sentiment: 90, competitorMentioned: false, renewalInDays: 28, lastLoginDays: 1, featureInterest: 'Compliance suite', usageTrend: [58, 60, 63, 67, 70, 74, 78, 83], healthTrend: [78, 80, 82, 84, 86, 88, 90, 92] },
    { name: 'Ironclad Labs', industry: 'Biotech', arr: 132000, seats: 50, seatsUsed: 19, championName: 'Owen Radcliffe', championStatus: 'quiet', openTickets: 4, sentiment: 44, competitorMentioned: false, renewalInDays: 140, lastLoginDays: 23, usageTrend: [66, 60, 55, 48, 42, 37, 31, 26], healthTrend: [62, 57, 52, 47, 43, 39, 36, 32] },
    { name: 'Summit Retail Group', industry: 'Retail', arr: 88000, seats: 45, seatsUsed: 43, championName: 'Renee Faulkner', championStatus: 'engaged', openTickets: 1, sentiment: 79, competitorMentioned: false, renewalInDays: 175, lastLoginDays: 3, featureInterest: 'Automation', usageTrend: [50, 53, 56, 60, 64, 68, 72, 77], healthTrend: [68, 70, 72, 74, 77, 79, 81, 84], intentTopic: 'ROI and business case', intentSessions: 7, intentDelta: 95, intentScore: 68 },
    { name: 'Beacon Energy', industry: 'Energy', arr: 205000, seats: 80, seatsUsed: 44, championName: 'Victor Pham', championStatus: 'quiet', openTickets: 2, sentiment: 55, competitorMentioned: true, competitor: 'GoHighLevel', renewalInDays: 38, lastLoginDays: 14, usageTrend: [64, 62, 59, 55, 51, 48, 45, 42], healthTrend: [70, 67, 63, 59, 56, 53, 51, 48] },
  ];
}

// Firmographic pools for the generated tail of the book.
const CO_A = ['Cascade', 'Lumen', 'Arbor', 'Vantage', 'Keystone', 'Halcyon', 'Pinnacle', 'Sterling', 'Redwood', 'Harbor', 'Juniper', 'Monarch', 'Nimbus', 'Onyx', 'Solstice', 'Tidewater', 'Windward', 'Zenith'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Networks', 'Analytics', 'Industries', 'Foods', 'Partners', 'Dynamics'];
const INDUSTRIES = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy', 'Media', 'Real Estate', 'Construction'];

function buildSeed() {
  const rnd = mulberry32(0x516E41);   // "SIGNAL" - fixed seed, stable demo
  const now = Date.now();
  const DAY = 86400000;
  const dayIso = (n) => new Date(now + n * DAY).toISOString();
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  // Blend in a few real CRM company names so the book feels wired to Ardovo.
  let liveNames = [];
  try { liveNames = (getCompanies() || []).map(c => c.name).filter(Boolean); } catch {}

  const rawAccounts = [];
  let idx = 0;
  const addRaw = (raw) => {
    idx++;
    rawAccounts.push({ id: `acct_${idx}`, region: pick(REGIONS), owner: pick(OWNERS), ...raw });
  };

  // Heroes first (assigned round-robin owners for realism).
  heroAccounts().forEach((h, i) => addRaw({ ...h, owner: OWNERS[i % OWNERS.length] }));

  // Generated tail - archetype-weighted so the radars stay interesting.
  const usedNames = new Set(rawAccounts.map(a => a.name));
  for (let i = 0; i < 16; i++) {
    let name;
    if (liveNames.length && rnd() < 0.4) name = pick(liveNames);
    else name = `${pick(CO_A)} ${pick(CO_B)}`;
    let guard = 0;
    while (usedNames.has(name) && guard < 12) { name = `${pick(CO_A)} ${pick(CO_B)}`; guard++; }
    usedNames.add(name);

    const arche = rnd();
    let raw;
    if (arche < 0.3) {
      // expansion star
      const seats = range(30, 110);
      raw = {
        name, industry: pick(INDUSTRIES), arr: range(12, 60) * 5000,
        seats, seatsUsed: Math.round(seats * (0.82 + rnd() * 0.16)),
        championName: pick(CHAMPIONS), championStatus: 'engaged', openTickets: range(0, 1),
        sentiment: range(76, 93), competitorMentioned: false, renewalInDays: range(60, 260),
        lastLoginDays: range(1, 4), featureInterest: pick(['Automation', 'Advanced Analytics', 'API access', 'Compliance suite']),
        usageTrend: trendArr(range(44, 56), range(72, 90), 8, rnd), healthTrend: trendArr(range(66, 74), range(82, 92), 8, rnd),
      };
      if (rnd() < 0.5) { raw.intentTopic = pick(INTENT_TOPICS); raw.intentSessions = range(5, 12); raw.intentDelta = range(70, 160); raw.intentScore = range(64, 82); }
    } else if (arche < 0.58) {
      // churn risk
      const seats = range(30, 90);
      raw = {
        name, industry: pick(INDUSTRIES), arr: range(14, 64) * 5000,
        seats, seatsUsed: Math.round(seats * (0.2 + rnd() * 0.25)),
        championName: pick(CHAMPIONS), championStatus: rnd() < 0.35 ? 'left' : 'quiet', openTickets: range(1, 4),
        sentiment: range(38, 60), competitorMentioned: rnd() < 0.45, competitor: pick(COMPETITORS), renewalInDays: range(24, 150),
        lastLoginDays: range(9, 28),
        usageTrend: trendArr(range(62, 78), range(24, 44), 8, rnd), healthTrend: trendArr(range(60, 72), range(30, 50), 8, rnd),
      };
    } else if (arche < 0.72) {
      // renewal soon, stable
      const seats = range(40, 100);
      raw = {
        name, industry: pick(INDUSTRIES), arr: range(18, 70) * 5000,
        seats, seatsUsed: Math.round(seats * (0.55 + rnd() * 0.25)),
        championName: pick(CHAMPIONS), championStatus: 'engaged', openTickets: range(0, 2),
        sentiment: range(66, 84), competitorMentioned: rnd() < 0.2, competitor: pick(COMPETITORS), renewalInDays: range(18, 40),
        lastLoginDays: range(2, 7), featureInterest: pick(['Automation', 'API access']),
        usageTrend: trendArr(range(56, 66), range(60, 74), 8, rnd), healthTrend: trendArr(range(66, 74), range(70, 82), 8, rnd),
      };
    } else {
      // healthy steady
      const seats = range(25, 80);
      raw = {
        name, industry: pick(INDUSTRIES), arr: range(10, 50) * 5000,
        seats, seatsUsed: Math.round(seats * (0.55 + rnd() * 0.2)),
        championName: pick(CHAMPIONS), championStatus: 'engaged', openTickets: range(0, 1),
        sentiment: range(70, 86), competitorMentioned: false, renewalInDays: range(90, 300),
        lastLoginDays: range(1, 6),
        usageTrend: trendArr(range(52, 62), range(58, 70), 8, rnd), healthTrend: trendArr(range(68, 76), range(72, 84), 8, rnd),
      };
    }
    addRaw(raw);
  }

  const accounts = rawAccounts.map(deriveAccount);

  // Signals derived from the scored book.
  let signals = [];
  for (const a of accounts) signals = signals.concat(buildSignalsForAccount(a, rnd, dayIso));
  signals.sort((x, y) => signalPriority(y) - signalPriority(x));

  // Buyer-intent stream: known spikes (resolved to accounts) + anonymous spikes
  // matched to a firmographic profile (the classic enrichment surface).
  const intent = [];
  let ii = 0;
  for (const a of accounts) {
    if (a.intentTopic) {
      ii++;
      intent.push({
        id: `int_${ii}`, known: true, accountId: a.id, accountName: a.name,
        industry: a.industry, region: a.region, topic: a.intentTopic,
        score: a.intentScore || 72, sessions: a.intentSessions || range(5, 12),
        deltaPct: a.intentDelta || range(80, 160), firstSeenDays: range(1, 6),
      });
    }
  }
  // Anonymous spikes - a fit profile but no resolved account yet.
  const ANON_CO = ['A 500-person logistics firm', 'A regional healthcare network', 'A Series C fintech', 'A national retail chain', 'A manufacturing group', 'An enterprise media company', 'A construction holding co', 'A renewable energy operator'];
  for (let k = 0; k < 6; k++) {
    ii++;
    intent.push({
      id: `int_${ii}`, known: false, accountId: null, accountName: pick(ANON_CO),
      industry: pick(INDUSTRIES), region: pick(REGIONS), topic: pick(INTENT_TOPICS),
      score: range(52, 88), sessions: range(4, 16), deltaPct: range(90, 240), firstSeenDays: range(1, 5),
    });
  }
  intent.sort((x, y) => y.score - x.score);

  return { seededAt: new Date(now).toISOString(), accounts, signals, intent };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
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
export function resetSignals() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useSignals(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

/* ---------- env gate for real enrichment (degrades to the model) ---------- */
export function hasEnrichEnv() {
  try { return !!(import.meta.env && import.meta.env.VITE_ENRICH_API); } catch { return false; }
}

/* ============================================================
   READ API
   ============================================================ */
export const getAccounts = () => state.accounts;
export const getAccount = (id) => state.accounts.find(a => a.id === id) || null;
export const getSignals = () => state.signals;
export const getSignal = (id) => state.signals.find(s => s.id === id) || null;
export const getIntent = () => state.intent;
export const openSignals = () => state.signals.filter(s => s.status === 'open');

// Accounts ranked by churn probability (highest risk first).
export function churnRadar() {
  return [...state.accounts].sort((a, b) => b.churnScore - a.churnScore);
}
// Accounts ranked by expansion propensity (hottest first).
export function expansionRadar() {
  return [...state.accounts].sort((a, b) => b.expansionScore - a.expansionScore);
}

// Portfolio roll-up for the header KPI row. All pure over state.
export function signalStats() {
  const open = openSignals();
  const accounts = state.accounts;
  const atRisk = accounts.filter(a => a.churnScore >= 55);
  const arrAtRisk = atRisk.reduce((s, a) => s + a.valueAtRisk, 0);
  const expansionOpps = open.filter(s => s.type === 'expansion');
  const expansionPipeline = expansionOpps.reduce((s, a) => s + (a.value || 0), 0);
  const intentSpikes = state.intent.filter(i => i.score >= 55).length;
  const totalArr = accounts.reduce((s, a) => s + a.arr, 0);
  return {
    openCount: open.length,
    churnCount: open.filter(s => signalMeta(s.type).category === 'churn').length,
    expansionCount: expansionOpps.length,
    intentCount: open.filter(s => s.type === 'buyer_intent').length,
    atRiskAccounts: atRisk.length,
    arrAtRisk,
    expansionPipeline,
    intentSpikes,
    totalArr,
    avgChurn: accounts.length ? Math.round(accounts.reduce((s, a) => s + a.churnScore, 0) / accounts.length) : 0,
  };
}

// Signals attached to one account (any status), highest priority first.
export function signalsForAccount(id) {
  return state.signals.filter(s => s.accountId === id).sort((a, b) => signalPriority(b) - signalPriority(a));
}

/* ============================================================
   WRITE API   (status transitions on signals; pure + persisted)
   ============================================================ */
function setStatus(id, status, extra = {}) {
  const s = getSignal(id);
  if (!s) return { error: 'missing', message: 'Signal not found.' };
  Object.assign(s, { status, ...extra });
  commit({ ...state });
  return { signal: s };
}
// SUPABASE: update rally_signals set status='acted', acted_at=now() where id=?
export function actOnSignal(id) { return setStatus(id, 'acted', { actedAt: new Date().toISOString() }); }
// SUPABASE: update rally_signals set status='dismissed' where id=?
export function dismissSignal(id) { return setStatus(id, 'dismissed', { dismissedAt: new Date().toISOString() }); }
// Snooze for N days - the card leaves the open feed until it resurfaces.
export function snoozeSignal(id, days = 7) {
  return setStatus(id, 'snoozed', { snoozedUntil: new Date(Date.now() + days * 86400000).toISOString() });
}
// Reopen a dismissed/snoozed/acted card.
export function reopenSignal(id) { return setStatus(id, 'open', { snoozedUntil: null }); }
