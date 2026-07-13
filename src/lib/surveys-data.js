// ============================================================
// RALLY SURVEYS  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// Closed-loop feedback for the Success & Delivery hub: NPS, CSAT
// and CES surveys with automated follow-up. This is the Service
// Hub staple that feeds retention (a HubSpot paid tier, a flat
// GoHighLevel gap) - Rally bundles it in for free.
//
// A survey fires on a trigger (post-ticket-close, post-purchase,
// quarterly, or manual) through a channel (email, SMS, in-app),
// collects scored responses with verbatim comments, and rolls them
// up into an explainable score. Follow-up rules close the loop:
// a detractor opens a ticket, a promoter gets asked for a review.
//
// This slice is ADDITIVE. It never mutates store.js state; it only
// READS the live CRM (won deals) to power the post-purchase trigger
// preview. Same deterministic-seed + pub/sub + localStorage pattern
// as store.js / reviews-data.js so it feels alive with zero backend.
// Sending a real survey is env-gated and degrades to a local queue.
//
// Live equivalent: rally_surveys + rally_survey_responses tables; the
// actual send routes through api/survey-send.js (email + SMS + in-app).
// ASCII only, NO em-dash, NO en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals } from './store.js';

const LS_KEY = 'rally_surveys_v1';   // bump to force a clean reseed

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
// The three feedback methodologies Rally ships. Each carries the scale it uses,
// the metric label, and the sensible default question so the builder is never
// blank. Colors drive every chart + chip so a type reads the same everywhere.
export const SURVEY_TYPES = [
  {
    id: 'nps', label: 'NPS', full: 'Net Promoter Score', color: 'var(--accent)',
    scale: { min: 0, max: 10 }, unit: '', metricLabel: 'NPS', range: '-100 to 100',
    question: 'How likely are you to recommend us to a friend or colleague?',
    followUp: 'What is the main reason for your score?',
    blurb: 'Loyalty and word of mouth. The retention north star.',
    lowLabel: 'Not likely', highLabel: 'Very likely',
  },
  {
    id: 'csat', label: 'CSAT', full: 'Customer Satisfaction', color: 'var(--accent-teal)',
    scale: { min: 1, max: 5 }, unit: '%', metricLabel: 'CSAT', range: '0 to 100%',
    question: 'How satisfied were you with your recent experience?',
    followUp: 'Tell us more about what worked or what did not.',
    blurb: 'Moment-of-truth satisfaction, best fired right after a touch.',
    lowLabel: 'Very unsatisfied', highLabel: 'Very satisfied',
  },
  {
    id: 'ces', label: 'CES', full: 'Customer Effort Score', color: 'var(--accent-purple)',
    scale: { min: 1, max: 7 }, unit: '', metricLabel: 'CES', range: '1 to 7',
    question: 'How easy was it to get what you needed today?',
    followUp: 'What would have made it easier?',
    blurb: 'Effort predicts churn. Lower effort keeps customers.',
    lowLabel: 'Very difficult', highLabel: 'Very easy',
  },
];
export const typeById = (id) => SURVEY_TYPES.find(t => t.id === id) || SURVEY_TYPES[0];

// When a survey fires. post-purchase + post-ticket read real CRM events.
export const TRIGGERS = [
  { id: 'post-ticket', label: 'After a ticket closes', icon: 'lifebuoy', desc: 'Fires when a support ticket is resolved.' },
  { id: 'post-purchase', label: 'After a deal is won', icon: 'target', desc: 'Fires when a deal moves to closed won.' },
  { id: 'quarterly', label: 'Quarterly relationship', icon: 'calendar', desc: 'A recurring pulse every 90 days.' },
  { id: 'manual', label: 'Manual send', icon: 'send', desc: 'You choose the recipients and send on demand.' },
];
export const triggerById = (id) => TRIGGERS.find(t => t.id === id) || TRIGGERS[3];

export const CHANNELS = [
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'sms', label: 'SMS', icon: 'phone' },
  { id: 'in-app', label: 'In-app', icon: 'messages' },
];
export const channelById = (id) => CHANNELS.find(c => c.id === id) || CHANNELS[0];

// Customer segments, used to slice results. Plan tier is the sharpest cut for a
// SaaS book of business.
export const SEGMENTS = [
  { id: 'enterprise', label: 'Enterprise', color: 'var(--accent)' },
  { id: 'growth', label: 'Growth', color: 'var(--accent-teal)' },
  { id: 'starter', label: 'Starter', color: 'var(--accent-purple)' },
];
export const segmentById = (id) => SEGMENTS.find(s => s.id === id) || SEGMENTS[0];

// The three response roles, shared across all types. NPS names them directly;
// CSAT + CES map onto the same trio so every chart, color and follow-up rule is
// consistent. Sentiment is derived from the band, never fabricated.
export const BANDS = {
  promoter: { label: 'Promoter', short: 'Promoters', color: 'var(--ok)', tone: 'ok', sentiment: 'positive' },
  passive: { label: 'Passive', short: 'Passives', color: 'var(--warn)', tone: 'warn', sentiment: 'neutral' },
  detractor: { label: 'Detractor', short: 'Detractors', color: 'var(--risk)', tone: 'risk', sentiment: 'negative' },
};
export const SENTIMENT_META = {
  positive: { label: 'Positive', color: 'var(--ok)', tone: 'ok' },
  neutral: { label: 'Neutral', color: 'var(--warn)', tone: 'warn' },
  negative: { label: 'Negative', color: 'var(--risk)', tone: 'risk' },
};

// Follow-up actions a rule can take when a response lands in a band.
export const RULE_ACTIONS = {
  ticket: { label: 'Open a support ticket', icon: 'lifebuoy', tone: 'risk', verb: 'Ticket opened' },
  review: { label: 'Ask for a public review', icon: 'star', tone: 'ok', verb: 'Review requested' },
  notify: { label: 'Notify the account owner', icon: 'bell', tone: 'info', verb: 'Owner notified' },
  tips: { label: 'Send onboarding tips', icon: 'rocket', tone: 'accent', verb: 'Tips sent' },
};

/* ============================================================
   SCORING MATH  (hoisted function declarations - safe to call at
   seed time; rule 4). Every score is deterministic + explainable.
   ============================================================ */

// Which band a single score falls into, per type. NPS: 9-10 promoter, 7-8
// passive, 0-6 detractor. CSAT (1-5): 4-5 promoter, 3 passive, 1-2 detractor.
// CES (1-7): 6-7 promoter, 4-5 passive, 1-3 detractor.
export function bandOf(type, score) {
  if (typeof score !== 'number') return 'passive';
  if (type === 'nps') return score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
  if (type === 'csat') return score >= 4 ? 'promoter' : score === 3 ? 'passive' : 'detractor';
  return score >= 6 ? 'promoter' : score >= 4 ? 'passive' : 'detractor'; // ces
}
export function sentimentOf(type, score) { return BANDS[bandOf(type, score)].sentiment; }

// THE NPS COMPUTATION HELPER. Net Promoter Score = % promoters - % detractors,
// a whole number from -100 to 100. Hoisted so it is safe during seed.
export function npsScore(responses) {
  const scored = (responses || []).filter(r => typeof r.score === 'number');
  if (!scored.length) return 0;
  const promoters = scored.filter(r => r.score >= 9).length;
  const detractors = scored.filter(r => r.score <= 6).length;
  return Math.round(((promoters - detractors) / scored.length) * 100);
}

// Promoter / passive / detractor counts for any type (drives the segmented bar).
export function bandBreakdown(type, responses) {
  const scored = (responses || []).filter(r => typeof r.score === 'number');
  const out = { promoter: 0, passive: 0, detractor: 0, total: scored.length };
  for (const r of scored) out[bandOf(type, r.score)]++;
  return out;
}

// CSAT as the percent of responses that are satisfied (4-5 on a 1-5 scale).
export function csatScore(responses) {
  const scored = (responses || []).filter(r => typeof r.score === 'number');
  if (!scored.length) return 0;
  const satisfied = scored.filter(r => r.score >= 4).length;
  return Math.round((satisfied / scored.length) * 100);
}
// Raw average, on the type's own scale (5 for CSAT, 7 for CES).
export function avgScore(responses) {
  const scored = (responses || []).filter(r => typeof r.score === 'number');
  if (!scored.length) return 0;
  return Number((scored.reduce((s, r) => s + r.score, 0) / scored.length).toFixed(1));
}
// CES as the average effort score (1-7, higher is easier).
export function cesScore(responses) { return avgScore(responses); }

// The headline metric for a survey type, as a single number.
export function surveyMetric(type, responses) {
  if (type === 'nps') return npsScore(responses);
  if (type === 'csat') return csatScore(responses);
  return cesScore(responses);
}

// A grade band for the headline metric, for gauge color + label. Thresholds are
// per methodology so each reads on its own terms.
export function metricBand(type, value) {
  if (type === 'nps') {
    if (value >= 50) return { grade: 'Excellent', color: 'var(--ok)' };
    if (value >= 20) return { grade: 'Great', color: 'var(--accent)' };
    if (value >= 0) return { grade: 'Fair', color: 'var(--warn)' };
    return { grade: 'At risk', color: 'var(--risk)' };
  }
  if (type === 'csat') {
    if (value >= 90) return { grade: 'Excellent', color: 'var(--ok)' };
    if (value >= 75) return { grade: 'Strong', color: 'var(--accent)' };
    if (value >= 60) return { grade: 'Fair', color: 'var(--warn)' };
    return { grade: 'At risk', color: 'var(--risk)' };
  }
  // ces (1-7)
  if (value >= 6) return { grade: 'Effortless', color: 'var(--ok)' };
  if (value >= 5) return { grade: 'Easy', color: 'var(--accent)' };
  if (value >= 4) return { grade: 'Some effort', color: 'var(--warn)' };
  return { grade: 'High effort', color: 'var(--risk)' };
}

// Formatted metric string for display (adds the +/- sign for NPS, % for CSAT).
export function formatMetric(type, value) {
  if (type === 'nps') return (value > 0 ? '+' : '') + value;
  if (type === 'csat') return value + '%';
  return String(value);
}

// 6-month rolling score trend (oldest -> newest) for the sparkline.
export function scoreTrend(type, responses) {
  const now = Date.now();
  const MONTH = 30 * 86400000;
  const out = [];
  for (let m = 5; m >= 0; m--) {
    const hi = now - m * MONTH;
    const lo = hi - MONTH;
    const bucket = (responses || []).filter(r => { const t = new Date(r.createdAt).getTime(); return t > lo && t <= hi; });
    const v = bucket.length ? surveyMetric(type, bucket) : (out.length ? out[out.length - 1] : surveyMetric(type, responses));
    out.push(v);
  }
  return out;
}

/* ============================================================
   SEED  (deterministic, stable across reloads)
   ============================================================ */
const RESPONDENTS = [
  'Amara Okafor', 'Wei Zhang', 'Priya Nair', 'Devon Clarke', 'Sofia Marino',
  'Tyler Osei', 'Grace Whitman', 'Hassan Reyes', 'Olivia Brandt', 'Nathan Cole',
  'Rosa Delgado', 'Ben Fischer', 'Kayla Monroe', 'Andre Sloane', 'Meredith Lowe',
  'Victor Pham', 'Isabel Cortez', 'Danny Walsh', 'Fatima Yusuf', 'Owen Radcliffe',
  'Chloe Barrett', 'Samuel Ito', 'Renee Faulkner', 'Miguel Santos', 'Elena Ross',
  'Marcus Bell', 'Nadia Haddad', 'Theo Bennett', 'Simone Diaz', 'Raj Kapoor',
];
const COMPANIES = [
  'Vertex Robotics', 'Northwind Logistics', 'Meridian Health', 'Apex Capital',
  'Cobalt Systems', 'Summit Labs', 'Ironclad Freight', 'Beacon Retail',
  'Cascade Energy', 'Lumen Media', 'Arbor Partners', 'Vantage Group',
  'Keystone Dynamics', 'Halcyon Analytics', 'Pinnacle Industries', 'Sterling Networks',
];

// Verbatim comment pools keyed by band. B2B SaaS voice - the respondents are
// Rally's customers giving feedback about Rally. No two reads identical.
const COMMENTS = {
  promoter: [
    'The rollout was smooth and the ROI was obvious inside the first month. Already told two peers.',
    'Best vendor relationship we have right now. Support is fast and the product keeps getting better.',
    'Genuinely a joy to use. The whole team adopted it without any training at all.',
    'Migration was painless and the results spoke for themselves. Hard to imagine going back.',
    'Responsive, thoughtful, and the roadmap lines up with exactly what we needed.',
    'Our renewal was an easy yes. This has become core to how the revenue team works.',
    'Onboarding was the smoothest we have ever had with a platform this capable.',
  ],
  passive: [
    'Solid product overall. A few workflow gaps but nothing that blocks us day to day.',
    'It does the job well. We would love faster turnaround on our feature requests.',
    'Good value for what we pay. Onboarding took a little longer than expected but we got there.',
    'No major complaints. Reporting could be a touch more flexible for our use case.',
    'Happy enough. A couple of integrations were fiddly to set up at first.',
    'Reliable so far. Still learning the more advanced automation pieces.',
  ],
  detractor: [
    'Setup was more work than we were told and the first support reply took days.',
    'We hit a billing issue that took two weeks to sort out. That was frustrating.',
    'The product is capable but the handoff after the sale left us mostly on our own.',
    'Too many small bugs in the last release. It shook our confidence a bit.',
    'We are not seeing the value we expected yet. Communication has been thin.',
    'A key feature we were promised keeps slipping. Hard to plan around that.',
  ],
};

// Give a survey a plausible response volume, then draw scores that match a
// believable, mostly-healthy distribution with a real tail so the detractor
// follow-up path and the sentiment chart both have cases to work with.
function drawScore(type, rnd) {
  const r = rnd();
  if (type === 'nps') {
    if (r < 0.56) return 9 + Math.floor(rnd() * 2);   // 9-10 promoter
    if (r < 0.78) return 7 + Math.floor(rnd() * 2);   // 7-8 passive
    return Math.floor(rnd() * 7);                      // 0-6 detractor
  }
  if (type === 'csat') {
    if (r < 0.6) return 5;
    if (r < 0.8) return 4;
    if (r < 0.9) return 3;
    return 1 + Math.floor(rnd() * 2);                  // 1-2
  }
  // ces (1-7, higher = easier)
  if (r < 0.55) return 7;
  if (r < 0.75) return 6;
  if (r < 0.88) return 4 + Math.floor(rnd() * 2);      // 4-5
  return 1 + Math.floor(rnd() * 3);                    // 1-3
}

function buildSeed() {
  const rnd = mulberry32(0x5A2FEE);  // fixed seed -> stable demo across reloads
  const now = Date.now();
  const DAY = 86400000;
  const iso = (n) => new Date(now + n * DAY).toISOString();
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  // The four programs a healthy Success org runs. status: active | paused | draft
  const surveyDefs = [
    { id: 'sv_relationship', name: 'Relationship NPS', type: 'nps', trigger: 'quarterly', channel: 'email', status: 'active', n: 68, rate: 0.42 },
    { id: 'sv_support', name: 'Support CSAT', type: 'csat', trigger: 'post-ticket', channel: 'in-app', status: 'active', n: 84, rate: 0.51 },
    { id: 'sv_onboarding', name: 'Onboarding CES', type: 'ces', trigger: 'post-purchase', channel: 'email', status: 'active', n: 46, rate: 0.38 },
    { id: 'sv_product', name: 'Product NPS pulse', type: 'nps', trigger: 'quarterly', channel: 'in-app', status: 'paused', n: 33, rate: 0.29 },
  ];

  const surveys = [];
  const responses = [];
  let rid = 0;

  for (const def of surveyDefs) {
    const t = typeById(def.type);
    const sent = Math.round(def.n / def.rate);
    // Draw this survey's responses over the last ~6 months.
    for (let i = 0; i < def.n; i++) {
      rid++;
      const score = drawScore(def.type, rnd);
      const band = bandOf(def.type, score);
      const daysAgo = -Math.floor(1 + rnd() * 172);
      // Not every response has a verbatim; detractors + promoters comment more.
      const commentChance = band === 'passive' ? 0.4 : 0.78;
      const hasComment = rnd() < commentChance;
      const seg = (() => { const s = rnd(); return s < 0.32 ? 'enterprise' : s < 0.66 ? 'growth' : 'starter'; })();
      responses.push({
        id: `resp_${rid}`,
        surveyId: def.id,
        respondent: pick(RESPONDENTS),
        company: pick(COMPANIES),
        segment: seg,
        score,
        band,
        sentiment: BANDS[band].sentiment,
        comment: hasComment ? pick(COMMENTS[band]) : '',
        channel: def.channel,
        followedUp: false,
        followUpAction: null,
        createdAt: iso(daysAgo),
      });
    }
    surveys.push({
      id: def.id,
      name: def.name,
      type: def.type,
      question: t.question,
      followUp: t.followUp,
      trigger: def.trigger,
      channel: def.channel,
      status: def.status,
      sent,
      createdAt: iso(-Math.floor(120 + rnd() * 120)),
    });
  }

  // Pin one fresh, uncommented detractor at the very top of Support CSAT so the
  // follow-up path has an obvious hero action on first load.
  rid++;
  responses.unshift({
    id: 'resp_hero',
    surveyId: 'sv_support',
    respondent: 'Marcus Bell',
    company: 'Cobalt Systems',
    segment: 'enterprise',
    score: 2,
    band: 'detractor',
    sentiment: 'negative',
    comment: 'Two tickets in a row took days to get a first reply. The fix was fine once it came, but the wait on a production issue was rough.',
    channel: 'in-app',
    followedUp: false,
    followUpAction: null,
    createdAt: iso(-1),
  });

  // Follow-up rules that close the loop. `triggered` seeds a believable history.
  const rules = [
    { id: 'rule_detractor', when: 'detractor', action: 'ticket', enabled: true, triggered: 9 },
    { id: 'rule_promoter', when: 'promoter', action: 'review', enabled: true, triggered: 21 },
    { id: 'rule_passive', when: 'passive', action: 'notify', enabled: false, triggered: 0 },
  ];

  // A short log of already-closed loops so the rules tab is not empty.
  const followUps = [
    { id: 'fu_1', responseId: null, action: 'ticket', who: 'Priya Nair', note: 'Detractor on Support CSAT routed to a ticket.', at: iso(-3) },
    { id: 'fu_2', responseId: null, action: 'review', who: 'Grace Whitman', note: 'Promoter on Relationship NPS asked for a public review.', at: iso(-4) },
    { id: 'fu_3', responseId: null, action: 'review', who: 'Wei Zhang', note: 'Promoter on Relationship NPS asked for a public review.', at: iso(-6) },
  ];

  return { seededAt: new Date(now).toISOString(), surveys, responses, rules, followUps };
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
export function resetSurveys() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useSurveys(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getSurveys = () => state.surveys;
export const getSurvey = (id) => state.surveys.find(s => s.id === id) || null;
export const getResponses = () => state.responses;
export const getResponsesForSurvey = (id) => state.responses.filter(r => r.surveyId === id);
export const getRules = () => state.rules;
export const getFollowUps = () => state.followUps;

// Rolled-up stats for a single survey (drives the list cards + results).
export function surveyStats(id) {
  const s = getSurvey(id);
  if (!s) return null;
  const resp = getResponsesForSurvey(id);
  const t = typeById(s.type);
  const responded = resp.length;
  const responseRate = s.sent ? responded / s.sent : 0;
  const metric = surveyMetric(s.type, resp);
  const breakdown = bandBreakdown(s.type, resp);
  const trend = scoreTrend(s.type, resp);
  const now = Date.now();
  const MONTH = 30 * 86400000;
  const newThisMonth = resp.filter(r => new Date(r.createdAt).getTime() > now - MONTH).length;
  const needsFollowUp = resp.filter(r => r.band === 'detractor' && !r.followedUp).length;
  return {
    survey: s, type: t, responded, responseRate, metric,
    metricStr: formatMetric(s.type, metric), band: metricBand(s.type, metric),
    breakdown, trend, newThisMonth, needsFollowUp, avg: avgScore(resp),
  };
}

// Program-wide roll-up for the list header KPIs.
export function programStats() {
  const surveys = state.surveys;
  const resp = state.responses;
  const active = surveys.filter(s => s.status === 'active').length;
  const sent = surveys.reduce((a, s) => a + (s.sent || 0), 0);
  const responded = resp.length;
  const responseRate = sent ? responded / sent : 0;
  const detractorsOpen = resp.filter(r => r.band === 'detractor' && !r.followedUp).length;
  const loopsClosed = state.followUps.length + resp.filter(r => r.followedUp).length;
  // A blended sentiment split across every response, for the header pulse.
  const sentiment = {
    positive: resp.filter(r => r.sentiment === 'positive').length,
    neutral: resp.filter(r => r.sentiment === 'neutral').length,
    negative: resp.filter(r => r.sentiment === 'negative').length,
  };
  return { total: surveys.length, active, sent, responded, responseRate, detractorsOpen, loopsClosed, sentiment };
}

// Won deals from the live CRM, offered as a post-purchase trigger preview so the
// builder can show how many customers are queued behind a trigger. Read-only.
export function triggerAudience(trigger) {
  try {
    if (trigger === 'post-purchase') return getDeals().filter(d => d.status === 'won').length;
  } catch {}
  // Deterministic, believable counts for the other triggers (no live source).
  if (trigger === 'post-ticket') return 128;
  if (trigger === 'quarterly') return 412;
  return 0;
}

// True when a send provider is configured. Absent in the browser bundle, so
// sends stay local + queued - never throws, never fakes a delivery.
export function hasSendEnv() {
  try { return !!(import.meta && import.meta.env && import.meta.env.VITE_SURVEY_PROVIDER); } catch { return false; }
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
export function createSurvey({ name, type = 'nps', question, followUp, trigger = 'manual', channel = 'email', status = 'draft' } = {}) {
  const t = typeById(type);
  const nm = String(name || '').trim() || `${t.label} survey`;
  const sv = {
    id: newId('sv'),
    name: nm,
    type: t.id,
    question: String(question || '').trim() || t.question,
    followUp: String(followUp || '').trim() || t.followUp,
    trigger: triggerById(trigger).id,
    channel: channelById(channel).id,
    status,
    sent: 0,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, surveys: [sv, ...state.surveys] });
  return { survey: sv };
}
export function updateSurvey(id, patch = {}) {
  const s = getSurvey(id);
  if (!s) return { error: 'missing', message: 'Survey not found.' };
  const next = { ...s, ...patch };
  commit({ ...state, surveys: state.surveys.map(x => x.id === id ? next : x) });
  return { survey: next };
}
export function deleteSurvey(id) {
  const s = getSurvey(id);
  if (!s) return { error: 'missing', message: 'Survey not found.' };
  commit({ ...state, surveys: state.surveys.filter(x => x.id !== id), responses: state.responses.filter(r => r.surveyId !== id) });
  return { ok: true, id };
}
// Flip active <-> paused. A draft goes live (active) on first toggle.
export function toggleSurvey(id) {
  const s = getSurvey(id);
  if (!s) return { error: 'missing', message: 'Survey not found.' };
  const status = s.status === 'active' ? 'paused' : 'active';
  return updateSurvey(id, { status });
}

// Simulate a send wave for the demo: raises the sent count and marks the survey
// active. A live deploy posts through the provider (env-gated); with no env the
// wave is recorded locally so the funnel + response rate stay real.
export function sendSurvey(id, count = 25) {
  const s = getSurvey(id);
  if (!s) return { error: 'missing', message: 'Survey not found.' };
  const add = Math.max(1, Number(count) || 25);
  return updateSurvey(id, { sent: (s.sent || 0) + add, status: 'active' });
}

// Record a fresh response (demo affordance in Results). Deterministic band +
// sentiment. Fires any enabled follow-up rule for its band automatically.
export function recordResponse(surveyId, { score, comment = '', respondent = 'New respondent', company = '', segment = 'growth' } = {}) {
  const s = getSurvey(surveyId);
  if (!s) return { error: 'missing', message: 'Survey not found.' };
  const t = typeById(s.type);
  let val = Number(score);
  if (!Number.isFinite(val)) return { error: 'score', message: 'Enter a score.' };
  val = Math.max(t.scale.min, Math.min(t.scale.max, Math.round(val)));
  const band = bandOf(s.type, val);
  const resp = {
    id: newId('resp'),
    surveyId, respondent: String(respondent || '').trim() || 'New respondent',
    company: String(company || '').trim(),
    segment: segmentById(segment).id,
    score: val, band, sentiment: BANDS[band].sentiment,
    comment: String(comment || '').trim(),
    channel: s.channel, followedUp: false, followUpAction: null,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, responses: [resp, ...state.responses] });
  // Auto-close the loop if a rule covers this band.
  const rule = state.rules.find(r => r.when === band && r.enabled);
  if (rule) applyFollowUp(resp.id, rule.action);
  return { response: resp };
}

// Close the loop on one response: mark it handled and log the action. Used by
// the verbatim cards and by the auto rules. Idempotent per response.
export function applyFollowUp(responseId, action) {
  const r = state.responses.find(x => x.id === responseId);
  if (!r) return { error: 'missing', message: 'Response not found.' };
  if (r.followedUp) return { response: r, skipped: true };
  const act = RULE_ACTIONS[action] ? action : 'notify';
  const next = { ...r, followedUp: true, followUpAction: act };
  const log = {
    id: newId('fu'), responseId, action: act, who: r.respondent,
    note: `${BANDS[r.band].label} on ${getSurvey(r.surveyId)?.name || 'a survey'}: ${RULE_ACTIONS[act].verb}.`,
    at: new Date().toISOString(),
  };
  const rules = state.rules.map(rl => rl.when === r.band && rl.action === act ? { ...rl, triggered: (rl.triggered || 0) + 1 } : rl);
  commit({ ...state, responses: state.responses.map(x => x.id === responseId ? next : x), followUps: [log, ...state.followUps], rules });
  return { response: next, log };
}

// Scan every unhandled response in a rule's band and close the loop on all of
// them at once. Returns how many loops it closed.
export function runRule(ruleId) {
  const rule = state.rules.find(r => r.id === ruleId);
  if (!rule) return { error: 'missing', message: 'Rule not found.' };
  const targets = state.responses.filter(r => r.band === rule.when && !r.followedUp);
  let count = 0;
  for (const r of targets) { applyFollowUp(r.id, rule.action); count++; }
  return { count };
}

export function updateRule(id, patch = {}) {
  const rule = state.rules.find(r => r.id === id);
  if (!rule) return { error: 'missing', message: 'Rule not found.' };
  const next = { ...rule, ...patch };
  commit({ ...state, rules: state.rules.map(r => r.id === id ? next : r) });
  return { rule: next };
}
export function toggleRule(id) {
  const rule = state.rules.find(r => r.id === id);
  if (!rule) return { error: 'missing', message: 'Rule not found.' };
  return updateRule(id, { enabled: !rule.enabled });
}
