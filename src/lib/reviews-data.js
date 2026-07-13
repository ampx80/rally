// ============================================================
// RALLY REPUTATION + REVIEWS  (local-first, Supabase-swappable)
// ------------------------------------------------------------
// The reputation engine of Rally's Marketing hub. A whole product
// that local SMBs buy separately (monitoring + ask-after-win +
// an AI responder) - Rally bundles it. Reviews stream in from
// Google / Facebook / Yelp, a review-request campaign asks happy
// customers right after a won deal or completed job, and an AI
// responder drafts an on-brand reply the operator approves + posts.
//
// This slice is ADDITIVE. It never touches store.js state; it only
// READS the live CRM (won deals + companies) to power the "ask after
// a win" trigger. Same deterministic-seed + pub/sub + localStorage
// pattern as store.js / marketing-campaigns.js so it feels alive with
// zero backend. Posting a reply + firing a real ask are env-gated and
// degrade to a local queue when the provider env is absent.
//
// Live equivalent: rally_reviews + rally_review_requests tables; the
// actual publish routes through api/reviews-post.js and the ask
// through api/review-request.js (SMS + email). ASCII only, NO em-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getDeals, getCompany } from './store.js';

const LS_KEY = 'rally_reviews_v1';   // bump to force a clean reseed

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
// The review sites Rally monitors. Color drives every chart + chip so a
// source reads the same everywhere. `handle` is what the widget/publish
// link would target once the provider env is wired.
export const SOURCES = [
  { id: 'google', label: 'Google', color: '#4285f4', short: 'G', handle: 'g.page/northstar-home' },
  { id: 'facebook', label: 'Facebook', color: '#2563a8', short: 'f', handle: 'fb.com/northstarhome' },
  { id: 'yelp', label: 'Yelp', color: '#c0392b', short: 'Y', handle: 'yelp.com/biz/northstar-home' },
];
export const sourceById = (id) => SOURCES.find(s => s.id === id) || SOURCES[0];

export const CHANNELS = [
  { id: 'sms', label: 'SMS', icon: 'phone' },
  { id: 'email', label: 'Email', icon: 'mail' },
];

// Request funnel stages, in order. A request advances sent -> opened ->
// clicked -> completed (left a review). Bounced is a terminal failure.
export const REQUEST_STATUSES = ['sent', 'opened', 'clicked', 'completed', 'bounced'];
export const REQUEST_META = {
  sent: { label: 'Sent', tone: 'default' },
  opened: { label: 'Opened', tone: 'info' },
  clicked: { label: 'Clicked', tone: 'accent' },
  completed: { label: 'Reviewed', tone: 'ok' },
  bounced: { label: 'Bounced', tone: 'risk' },
};

// Sentiment is derived from the star rating, never fabricated.
export function sentimentOf(rating) {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}
export const SENTIMENT_META = {
  positive: { label: 'Positive', color: 'var(--ok)', tone: 'ok' },
  neutral: { label: 'Neutral', color: 'var(--warn)', tone: 'warn' },
  negative: { label: 'Negative', color: 'var(--risk)', tone: 'risk' },
};

/* The default business identity the reputation engine represents. This is the
   Rally customer's OWN local brand (reviews are FROM their customers ABOUT
   them). Editable from the widget config. */
export const DEFAULT_BUSINESS = 'Northstar Home Services';

/* ============================================================
   SEED
   ============================================================ */
const REVIEWERS = [
  'Amelia Hartwell', 'Marcus Bell', 'Priya Nair', 'Devon Clarke', 'Sofia Marino',
  'Tyler Osei', 'Grace Whitman', 'Hassan Reyes', 'Olivia Brandt', 'Nathan Cole',
  'Rosa Delgado', 'Ben Fischer', 'Kayla Monroe', 'Andre Sloane', 'Meredith Lowe',
  'Victor Pham', 'Isabel Cortez', 'Danny Walsh', 'Fatima Yusuf', 'Owen Radcliffe',
  'Chloe Barrett', 'Samuel Ito', 'Renee Faulkner', 'Miguel Santos',
];

// Believable, source-plausible review bodies keyed by rating band. No two
// pulls read identically thanks to a specifics fragment appended per review.
const BODY_5 = [
  'Absolutely the best experience we have had with any contractor. On time, spotless, and the pricing was exactly what was quoted.',
  'The technician was professional and walked me through everything. Booking was effortless and they texted me updates the whole way.',
  'Fixed a problem two other companies missed. Fair price, zero mess, and genuinely kind people. We will not call anyone else.',
  'Same-day service and it actually worked. The follow-up text asking if everything was still good sealed it for me.',
  'From the quote to the cleanup it was flawless. You can tell this is a team that cares about the work and the customer.',
];
const BODY_4 = [
  'Great work overall and very responsive. Took a little longer than the estimate but the result was worth it.',
  'Solid job and friendly crew. Would have loved a heads up call before arrival, but the work itself was excellent.',
  'Happy with the repair and the price was reasonable. One small follow-up needed but they handled it quickly.',
  'Really good service. The online booking is a nice touch. Docked a star only because parking notes were unclear.',
];
const BODY_3 = [
  'The work was fine in the end but scheduling got moved twice, which was frustrating with a young kid at home.',
  'Decent job. Communication could be better - I had to call to confirm the appointment window.',
  'Got the problem solved but the first visit did not fully fix it. The second tech was great though.',
];
const BODY_2 = [
  'Showed up outside the window and I had to reschedule my afternoon. The repair holds so far but the experience was stressful.',
  'Pricing came in higher than the phone quote. The work is okay but I expected more transparency up front.',
];
const BODY_1 = [
  'Waited all day and no one came. I understand things happen but a phone call would have gone a long way.',
];
const SPECIFICS = [
  'Water heater install.', 'HVAC tune-up.', 'Emergency drain clear.', 'Panel upgrade.',
  'Furnace repair.', 'AC replacement.', 'Leak detection.', 'Seasonal maintenance plan.',
  'Thermostat swap.', 'Sump pump replacement.',
];

function bodyFor(rating, rnd) {
  const pool = rating === 5 ? BODY_5 : rating === 4 ? BODY_4 : rating === 3 ? BODY_3 : rating === 2 ? BODY_2 : BODY_1;
  const base = pool[Math.floor(rnd() * pool.length)];
  const spec = SPECIFICS[Math.floor(rnd() * SPECIFICS.length)];
  return `${spec} ${base}`;
}

// A couple of pre-written owner replies so the stream is not all unanswered on
// first run (shows the "posted" state + response-rate metric with real data).
const SEED_REPLIES = {
  0: 'Amelia, this made our whole team smile. Thank you for trusting us with your water heater install - we are always one text away if you need anything.',
  2: 'Priya, thank you for the kind words and for noticing the follow-up. We built that check-in text because your peace of mind is the job. See you at the next tune-up.',
};

function buildSeed() {
  const rnd = mulberry32(0x5EED12); // fixed seed -> stable demo across reloads
  const now = Date.now();
  const DAY = 86400000;
  const iso = (n) => new Date(now + n * DAY).toISOString();
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  /* --- reviews across the three sources --- */
  // Weighted toward 4-5 stars (a healthy local brand) with a realistic tail so
  // the AI responder + sentiment chart have negative cases to handle.
  const ratingFor = () => {
    const r = rnd();
    if (r < 0.58) return 5;
    if (r < 0.82) return 4;
    if (r < 0.92) return 3;
    if (r < 0.975) return 2;
    return 1;
  };
  const reviews = [];
  const nameShuffle = [...REVIEWERS];
  for (let i = 0; i < 22; i++) {
    const rating = ratingFor();
    const source = pick(SOURCES).id;
    const author = nameShuffle[i % nameShuffle.length];
    const daysAgo = -Math.floor(1 + rnd() * 168); // last ~6 months
    const responded = SEED_REPLIES[i] != null || (rating >= 4 && rnd() < 0.45);
    reviews.push({
      id: `rv_${i + 1}`,
      source,
      author,
      rating,
      body: bodyFor(rating, rnd),
      sentiment: sentimentOf(rating),
      verified: rnd() < 0.8,
      helpful: Math.floor(rnd() * 14),
      createdAt: iso(daysAgo),
      responded,
      response: SEED_REPLIES[i] || (responded ? 'Thank you so much for taking the time to share this. It means the world to our team and we are grateful for your trust.' : ''),
      respondedAt: responded ? iso(daysAgo + 1) : null,
      aiDraft: null,          // a pending AI-drafted reply awaiting approval
    });
  }
  // Pin one fresh, unanswered 2-star at the top so the AI responder has an
  // obvious hero action on first load (the "recover a detractor" moment).
  reviews.unshift({
    id: 'rv_hero',
    source: 'google',
    author: 'Marcus Bell',
    rating: 2,
    body: 'Furnace repair. The tech was knowledgeable but the arrival window slipped by two hours and no one called. The furnace works now, but the wait on a cold morning was rough.',
    sentiment: 'negative',
    verified: true,
    helpful: 3,
    createdAt: iso(-1),
    responded: false,
    response: '',
    respondedAt: null,
    aiDraft: null,
  });

  /* --- review-request campaigns (ask-after-win queue) --- */
  const REQ_NAMES = ['Grace Whitman', 'Hassan Reyes', 'Owen Radcliffe', 'Chloe Barrett', 'Samuel Ito', 'Renee Faulkner', 'Danny Walsh', 'Isabel Cortez', 'Victor Pham', 'Meredith Lowe', 'Kayla Monroe', 'Andre Sloane'];
  const requests = [];
  for (let i = 0; i < REQ_NAMES.length; i++) {
    const r = rnd();
    // Funnel weighting: most open, a healthy share convert, a couple bounce.
    let status;
    if (r < 0.1) status = 'bounced';
    else if (r < 0.28) status = 'sent';
    else if (r < 0.5) status = 'opened';
    else if (r < 0.66) status = 'clicked';
    else status = 'completed';
    const channel = rnd() < 0.55 ? 'sms' : 'email';
    const sentAgo = -Math.floor(1 + rnd() * 30);
    requests.push({
      id: `rq_${i + 1}`,
      customer: REQ_NAMES[i],
      channel,
      job: pick(SPECIFICS).replace('.', ''),
      status,
      source: pick(SOURCES).id,     // which site we pointed them to
      sentAt: iso(sentAgo),
      completedAt: status === 'completed' ? iso(sentAgo + 1 + Math.floor(rnd() * 4)) : null,
    });
  }

  /* --- widget config --- */
  const widget = {
    business: DEFAULT_BUSINESS,
    theme: 'light',           // light | dark | auto
    layout: 'carousel',       // carousel | grid | badge
    minRating: 4,
    sources: ['google', 'facebook', 'yelp'],
    showRating: true,
    accent: '#5b4bf5',
  };

  // Auto-ask automation: fire a request N days after a deal is won / job done.
  const automation = { enabled: true, delayDays: 2, channel: 'sms', minDealValue: 0 };

  return { seededAt: new Date(now).toISOString(), reviews, requests, widget, automation };
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
export function resetReviews() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useReviews(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getReviews = () => state.reviews;
export const getReview = (id) => state.reviews.find(r => r.id === id) || null;
export const getRequests = () => state.requests;
export const getWidget = () => state.widget;
export const getAutomation = () => state.automation;

// Won deals from the live CRM, offered as "ask after a win" trigger sources.
// Reads store.js so the queue stays anchored to real revenue events.
export function wonDealTriggers() {
  try {
    return getDeals()
      .filter(d => d.status === 'won')
      .slice(0, 40)
      .map(d => ({ id: d.id, name: d.name, company: getCompany(d.companyId)?.name || '', value: d.value }));
  } catch { return []; }
}

/* ---------- reputation roll-ups (all pure over state) ---------- */
export function reviewStats() {
  const rs = state.reviews;
  const total = rs.length;
  const sum = rs.reduce((s, r) => s + r.rating, 0);
  const avg = total ? sum / total : 0;
  const distribution = [1, 2, 3, 4, 5].map(star => rs.filter(r => r.rating === star).length);
  const responded = rs.filter(r => r.responded).length;
  const responseRate = total ? responded / total : 0;

  const bySource = SOURCES.map(s => {
    const list = rs.filter(r => r.source === s.id);
    const ssum = list.reduce((a, r) => a + r.rating, 0);
    return { ...s, count: list.length, avg: list.length ? ssum / list.length : 0 };
  });

  const sentiment = {
    positive: rs.filter(r => r.sentiment === 'positive').length,
    neutral: rs.filter(r => r.sentiment === 'neutral').length,
    negative: rs.filter(r => r.sentiment === 'negative').length,
  };

  // 6-month rolling average rating (oldest -> newest) for the trend spark.
  const now = Date.now();
  const MONTH = 30 * 86400000;
  const trend = [];
  for (let m = 5; m >= 0; m--) {
    const hi = now - m * MONTH;
    const lo = hi - MONTH;
    const inBucket = rs.filter(r => { const t = new Date(r.createdAt).getTime(); return t > lo && t <= hi; });
    const bsum = inBucket.reduce((a, r) => a + r.rating, 0);
    trend.push(inBucket.length ? Number((bsum / inBucket.length).toFixed(2)) : (trend.length ? trend[trend.length - 1] : Number(avg.toFixed(2))));
  }

  const monthAgo = now - MONTH;
  const newThisMonth = rs.filter(r => new Date(r.createdAt).getTime() > monthAgo).length;
  const needsReply = rs.filter(r => !r.responded).length;

  return {
    total, avg, distribution, responded, responseRate, bySource, sentiment,
    trend, newThisMonth, needsReply,
    score: reputationScore({ avg, responseRate, newThisMonth, total }),
  };
}

// A single 0-100 reputation score. Deterministic + explainable: rating drives
// most of it, then response rate, freshness, and volume. No randomness.
export function reputationScore({ avg, responseRate, newThisMonth, total }) {
  const ratingPart = (avg / 5) * 70;              // up to 70
  const responsePart = responseRate * 16;          // up to 16
  const freshPart = Math.min(newThisMonth / 6, 1) * 9;  // up to 9
  const volumePart = Math.min(total / 25, 1) * 5;  // up to 5
  return Math.round(ratingPart + responsePart + freshPart + volumePart);
}

// Grade band for the score, for the ring label + color.
export function scoreBand(score) {
  if (score >= 85) return { grade: 'Excellent', color: 'var(--ok)' };
  if (score >= 70) return { grade: 'Strong', color: 'var(--accent)' };
  if (score >= 55) return { grade: 'Fair', color: 'var(--warn)' };
  return { grade: 'At risk', color: 'var(--risk)' };
}

export function requestStats() {
  const q = state.requests;
  const count = (st) => q.filter(r => r.status === st).length;
  const sent = q.length - count('bounced');
  const opened = q.filter(r => ['opened', 'clicked', 'completed'].includes(r.status)).length;
  const clicked = q.filter(r => ['clicked', 'completed'].includes(r.status)).length;
  const completed = count('completed');
  return {
    total: q.length,
    sent, opened, clicked, completed,
    bounced: count('bounced'),
    openRate: sent ? opened / sent : 0,
    conversion: sent ? completed / sent : 0,
  };
}

/* ============================================================
   AI RESPONDER  (deterministic local draft; env-gated real post)
   ------------------------------------------------------------
   Drafts an on-brand reply. A real deployment would call
   /api/reviews-draft (Claude) when ANTHROPIC_API_KEY is present;
   with no env we synthesize a warm, specific, on-brand reply here so
   the feature is fully functional offline. The output is NEVER posted
   automatically - the operator approves, edits, then posts.
   ============================================================ */
function firstName(full) { return String(full || '').trim().split(/\s+/)[0] || 'there'; }
function jobFromBody(body) {
  const m = SPECIFICS.find(s => String(body || '').includes(s.replace('.', '')));
  return m ? m.replace('.', '').toLowerCase() : 'your visit';
}

export function draftReply(review, business = state.widget.business || DEFAULT_BUSINESS) {
  if (!review) return '';
  const name = firstName(review.author);
  const job = jobFromBody(review.body);
  const sign = `\n\n- The ${business} team`;
  if (review.rating >= 5) {
    return `${name}, thank you so much - reviews like this are exactly why we do the work. We are thrilled the ${job} went perfectly and our crew earned your trust. We are one call away whenever you need us again.${sign}`;
  }
  if (review.rating === 4) {
    return `Thanks for the kind words, ${name}. We are glad the ${job} landed well, and we hear you on where we can be sharper. We are already tightening that up so the next visit is a clean five stars.${sign}`;
  }
  if (review.rating === 3) {
    return `${name}, thank you for the honest feedback. Getting the ${job} right the first time is the standard we hold ourselves to, and we clearly have room to do better on communication. A manager will reach out to make sure everything is fully resolved.${sign}`;
  }
  return `${name}, we owe you an apology. That is not the experience ${business} promises, and the miss on your ${job} is on us. Please expect a call today from our service manager - we want to make this right and earn back your confidence.${sign}`;
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */

// Generate + stash an AI draft on a review (does NOT publish).
// SUPABASE/API: POST /api/reviews-draft -> Claude; falls back to draftReply().
export function generateDraft(id) {
  const r = getReview(id);
  if (!r) return { error: 'missing', message: 'Review not found.' };
  const draft = draftReply(r);
  const next = { ...r, aiDraft: draft };
  commit({ ...state, reviews: state.reviews.map(x => x.id === id ? next : x) });
  return { review: next, draft };
}

// Approve + post a reply. Local-first: marks the review responded and clears
// the pending draft. A live deploy would publish via the provider API when the
// env token is present (env-gated) and otherwise keep it queued locally.
// SUPABASE/API: POST /api/reviews-post { reviewId, source, body }.
export function postReply(id, text) {
  const r = getReview(id);
  if (!r) return { error: 'missing', message: 'Review not found.' };
  const body = String(text || '').trim();
  if (!body) return { error: 'body', message: 'Write a reply before posting.' };
  const posted = hasPublishEnv();
  const next = {
    ...r,
    responded: true,
    response: body,
    respondedAt: new Date().toISOString(),
    aiDraft: null,
    postPending: !posted,   // true when kept in local queue (no provider env)
  };
  commit({ ...state, reviews: state.reviews.map(x => x.id === id ? next : x) });
  return { review: next, posted };
}

// True when a review-posting provider is configured. In the browser bundle the
// key is absent, so posting stays local + queued - never throws, never fakes.
export function hasPublishEnv() {
  try { return !!(import.meta && import.meta.env && import.meta.env.VITE_REVIEWS_PROVIDER); } catch { return false; }
}

// Fire a review-request campaign to one or more customers. Local-first: the
// asks enter the queue as 'sent'. A live deploy sends SMS + email via the
// provider when env is present; with no env they stay queued so the funnel is
// still real + inspectable. SUPABASE/API: POST /api/review-request.
export function sendRequests({ customers = [], channel = 'sms', source = 'google', job = '' } = {}) {
  const list = (Array.isArray(customers) ? customers : [customers]).map(s => String(s || '').trim()).filter(Boolean);
  if (!list.length) return { error: 'customers', message: 'Add at least one customer to ask.' };
  const nowIso = new Date().toISOString();
  const made = list.map(name => ({
    id: newId('rq'),
    customer: name,
    channel: channel === 'email' ? 'email' : 'sms',
    job: String(job || '').trim() || 'recent service',
    status: 'sent',
    source: sourceById(source).id,
    sentAt: nowIso,
    completedAt: null,
  }));
  commit({ ...state, requests: [...made, ...state.requests] });
  return { requests: made, count: made.length };
}

// Advance a single request one step down the funnel (demo affordance for the
// queue rows - simulates the recipient opening / clicking / reviewing).
export function advanceRequest(id) {
  const q = state.requests;
  const r = q.find(x => x.id === id);
  if (!r) return { error: 'missing', message: 'Request not found.' };
  const order = ['sent', 'opened', 'clicked', 'completed'];
  const i = order.indexOf(r.status);
  if (i < 0 || i >= order.length - 1) return { request: r };
  const status = order[i + 1];
  const next = { ...r, status, completedAt: status === 'completed' ? new Date().toISOString() : r.completedAt };
  commit({ ...state, requests: q.map(x => x.id === id ? next : x) });
  return { request: next };
}

export function updateWidget(patch = {}) {
  const next = { ...state.widget, ...patch };
  commit({ ...state, widget: next });
  return { widget: next };
}

export function updateAutomation(patch = {}) {
  const next = { ...state.automation, ...patch };
  commit({ ...state, automation: next });
  return { automation: next };
}

// Reviews to surface in the embeddable widget, honoring its filters.
export function widgetReviews(widget = state.widget, limit = 6) {
  const w = widget || state.widget;
  return state.reviews
    .filter(r => r.rating >= (w.minRating || 1) && (w.sources || []).includes(r.source))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}
