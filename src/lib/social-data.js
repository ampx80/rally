// ============================================================
// ARDOVO SOCIAL  (local-first, Supabase-swappable)
// The multi-channel social planner. One place to write a post once,
// tune it per network, preview every card, and schedule + recycle it
// across Facebook, Instagram, LinkedIn, X, Google Business and TikTok.
//
// Same pub/sub, deterministic-seed, localStorage-backed pattern as
// store.js / marketing-campaigns.js so the whole surface is alive with
// ZERO backend. A real publish would route through api/social-publish.js
// per connected network; here every action mutates the local slice.
//
// This slice is ADDITIVE. It does not touch store.js state. It only
// READS the CRM (contacts) to greet the composer with a friendly name.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_social_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (fixed seed, never Date.now/Math.random) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   NETWORKS  (the six channels the planner speaks natively)
   Each carries a brand color (white glyph reads on it in light AND
   dark), a short glyph, and the platform character limit used by the
   live preview counter.
   ============================================================ */
export const NETWORKS = [
  { id: 'facebook',  label: 'Facebook',        glyph: 'FB', color: '#1877F2', limit: 63206, kind: 'Feed post' },
  { id: 'instagram', label: 'Instagram',       glyph: 'IG', color: '#C13584', limit: 2200,  kind: 'Feed + reel' },
  { id: 'linkedin',  label: 'LinkedIn',        glyph: 'LI', color: '#0A66C2', limit: 3000,  kind: 'Company update' },
  { id: 'x',         label: 'X',               glyph: 'X',  color: '#202632', limit: 280,   kind: 'Post' },
  { id: 'google',    label: 'Google Business', glyph: 'GB', color: '#34A853', limit: 1500,  kind: 'Business post' },
  { id: 'tiktok',    label: 'TikTok',          glyph: 'TT', color: '#EE1D52', limit: 2200,  kind: 'Video caption' },
];
export const networkById = (id) => NETWORKS.find(n => n.id === id) || null;

export const STATUSES = {
  draft:     { label: 'Draft',     tone: 'default' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  published: { label: 'Published', tone: 'ok' },
};

/* Best-time heatmap axes. Seven days x six dayparts. */
export const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HEAT_SLOTS = ['6a', '9a', '12p', '3p', '6p', '9p'];

/* ============================================================
   AI CAPTION SIM  (deterministic, offline stand-in for Rook)
   Rook drafts the caption + hashtags from a topic and tone. The live
   build swaps this for api/rook.js; the shape it returns is identical
   so the composer never changes. Deterministic hash -> stable output.
   ============================================================ */
const HASH_POOL = {
  launch: ['#ProductLaunch', '#NewRelease', '#ShipIt', '#BuiltForYou'],
  sale: ['#Deal', '#LimitedTime', '#DontMissOut', '#SaveNow'],
  hiring: ['#NowHiring', '#JoinUs', '#Careers', '#WeAreHiring'],
  event: ['#Event', '#SaveTheDate', '#JoinUs', '#Community'],
  tip: ['#ProTip', '#HowTo', '#Insights', '#Growth'],
  story: ['#BehindTheScenes', '#OurStory', '#TeamArdovo', '#Culture'],
  default: ['#Revenue', '#GrowthOps', '#ArdovoUp', '#PipelineHealth'],
};
const TONE_OPENERS = {
  bold:      ['Big news:', 'Stop scrolling.', 'This changes things.', 'Here it is:'],
  friendly:  ['Hey friends,', 'We have got something for you.', 'Quick one for you:', 'Good news:'],
  expert:    ['A pattern we keep seeing:', 'The data is clear:', 'What high-growth teams do:', 'Worth a read:'],
  playful:   ['Plot twist:', 'Okay, real talk.', 'You did not hear it from us, but', 'Warning: mildly exciting.'],
};
const TONE_CLOSERS = {
  bold:      ['Move first.', 'The window is now.', 'Do not wait.', 'Lead the pack.'],
  friendly:  ['Tell us what you think.', 'We would love your take.', 'Reply and say hi.', 'Here to help.'],
  expert:    ['Details in the thread.', 'Numbers do not lie.', 'Study it, then ship it.', 'Learn more below.'],
  playful:   ['You are welcome.', 'No cap.', 'Screenshot this one.', 'Send it to a friend.'],
};
export const CAPTION_TONES = ['bold', 'friendly', 'expert', 'playful'];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
function topicKey(topic) {
  const t = (topic || '').toLowerCase();
  if (/launch|release|ship|new/.test(t)) return 'launch';
  if (/sale|deal|discount|off|promo/.test(t)) return 'sale';
  if (/hir|job|role|team member/.test(t)) return 'hiring';
  if (/event|webinar|meetup|conference/.test(t)) return 'event';
  if (/tip|how|guide|learn|advice/.test(t)) return 'tip';
  if (/story|behind|culture|founder/.test(t)) return 'story';
  return 'default';
}

// Deterministically draft a caption + hashtags. Rook's local voice.
export function rookCaption({ topic = '', tone = 'friendly', network = 'linkedin' } = {}) {
  const key = topicKey(topic);
  const seedN = hashStr(`${topic}|${tone}|${network}`);
  const rnd = mulberry32(seedN || 7);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const opener = pick(TONE_OPENERS[tone] || TONE_OPENERS.friendly);
  const closer = pick(TONE_CLOSERS[tone] || TONE_CLOSERS.friendly);
  const subject = (topic || 'our latest update').trim();
  const net = networkById(network);
  const body = {
    launch: `${subject} is here, and it was built to make your day easier.`,
    sale: `${subject} - for a limited time, this is the moment to act.`,
    hiring: `We are growing the team around ${subject}. Know someone great?`,
    event: `${subject} is coming up. Save your spot before it fills.`,
    tip: `One thing that quietly moves the needle on ${subject}.`,
    story: `The real story behind ${subject}, straight from the team.`,
    default: `A quick note on ${subject} that we think you will like.`,
  }[key];
  // X gets a tight single-line variant to respect 280 chars.
  const isShort = network === 'x';
  const hashes = (HASH_POOL[key] || HASH_POOL.default);
  const chosen = isShort ? hashes.slice(0, 2) : hashes.slice(0, 3);
  const caption = isShort
    ? `${opener} ${body} ${closer}`
    : `${opener}\n\n${body}\n\n${closer}`;
  return {
    caption: caption.slice(0, net ? net.limit : 2200),
    hashtags: chosen,
    tone,
    network,
  };
}

/* A small palette of standalone hashtag ideas for the chip tray. */
export function hashtagIdeas(topic = '') {
  const key = topicKey(topic);
  const base = HASH_POOL[key] || HASH_POOL.default;
  return [...new Set([...base, ...HASH_POOL.default])].slice(0, 8);
}

/* ============================================================
   SEED  (a believable content calendar around today)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);          // FIXED integer seed
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  // Anchor scheduled times to a clean daypart on a day offset from today so the
  // calendar always renders content around "now" without any random seeding of
  // the clock itself.
  const at = (dayOffset, hour) => {
    const d = new Date(now + dayOffset * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const COPY = [
    { topic: 'Rook AI operator launch', tone: 'bold', text: 'Big news: Rook, your always-on revenue operator, is live. It drafts the follow-ups, keeps the pipeline honest, and never lets a deal go dark.\n\nMeet your new teammate.' },
    { topic: 'Q3 growth webinar', tone: 'expert', text: 'The data is clear: teams that review pipeline weekly close 34% more. Join our Q3 growth webinar and we will walk the exact cadence.\n\nSave your seat below.' },
    { topic: 'Customer story - Vertex Robotics', tone: 'friendly', text: 'Good news: Vertex Robotics cut their sales cycle from 71 to 44 days with one shared source of truth. Here is how they did it.' },
    { topic: 'Hiring account executives', tone: 'friendly', text: 'We are growing the team. If you love closing and hate busywork, come build the future of revenue with us.\n\nRoles in the comments.' },
    { topic: 'Pipeline hygiene tip', tone: 'expert', text: 'One thing that quietly moves the needle: close-date discipline. Every slipped date is a forecast you cannot trust. Fix the date, fix the number.' },
    { topic: 'Behind the scenes at Ardovo', tone: 'playful', text: 'Plot twist: our best feature ideas come from support tickets. Here is a peek at how a complaint became a roadmap item in 48 hours.' },
    { topic: 'Year-end offer', tone: 'bold', text: 'Stop scrolling. Lock in 2026 pricing before the new plans land. Two weeks left, then the window closes.' },
    { topic: 'New reporting dashboards', tone: 'friendly', text: 'Quick one for you: the new dashboards ship today. Board-ready in a click, no spreadsheet gymnastics required.' },
    { topic: 'Founder note on focus', tone: 'expert', text: 'Worth a read: the one metric we stopped chasing this quarter, and the three we doubled down on instead.' },
    { topic: 'Community meetup', tone: 'friendly', text: 'RevOps friends in Austin - we are hosting a small meetup next month. Good people, better tacos. Come say hi.' },
    { topic: 'Product tip - keyboard shortcuts', tone: 'playful', text: 'Okay, real talk. You are clicking too much. Here are five shortcuts that will give you an hour back this week.' },
    { topic: 'Case study - 3x reply rate', tone: 'expert', text: 'A pattern we keep seeing: personalized first lines triple reply rates. We pulled the numbers from 1,200 sequences.' },
  ];

  const NET_IDS = NETWORKS.map(n => n.id);
  const posts = [];
  let pi = 0;

  // Spread posts from about 12 days ago to 20 days out. Past ones are published
  // (with modest metrics), near-future ones scheduled, a couple left as drafts.
  const schedule = [
    { off: -12, hour: 9,  nets: ['linkedin', 'x'],                 status: 'published' },
    { off: -10, hour: 12, nets: ['instagram', 'facebook'],         status: 'published' },
    { off: -8,  hour: 15, nets: ['linkedin'],                      status: 'published' },
    { off: -6,  hour: 9,  nets: ['x', 'facebook', 'linkedin'],     status: 'published' },
    { off: -4,  hour: 18, nets: ['instagram', 'tiktok'],           status: 'published' },
    { off: -2,  hour: 12, nets: ['linkedin', 'google'],            status: 'published' },
    { off: -1,  hour: 9,  nets: ['x'],                             status: 'published' },
    { off: 0,   hour: 15, nets: ['linkedin', 'instagram'],         status: 'scheduled' },
    { off: 1,   hour: 9,  nets: ['facebook', 'x'],                 status: 'scheduled' },
    { off: 2,   hour: 12, nets: ['instagram', 'tiktok'],           status: 'scheduled' },
    { off: 3,   hour: 18, nets: ['linkedin'],                      status: 'scheduled' },
    { off: 5,   hour: 9,  nets: ['x', 'facebook'],                 status: 'scheduled' },
    { off: 7,   hour: 15, nets: ['linkedin', 'google', 'x'],       status: 'scheduled' },
    { off: 9,   hour: 12, nets: ['instagram'],                     status: 'scheduled' },
    { off: 12,  hour: 9,  nets: ['linkedin'],                      status: 'draft' },
    { off: 14,  hour: 18, nets: ['tiktok', 'instagram'],           status: 'draft' },
  ];

  schedule.forEach((s, i) => {
    pi++;
    const c = COPY[i % COPY.length];
    const published = s.status === 'published';
    const metrics = {};
    if (published) {
      for (const nid of s.nets) {
        const base = { facebook: 1400, instagram: 2600, linkedin: 1800, x: 900, google: 600, tiktok: 5200 }[nid] || 1000;
        const reach = base + range(-200, 900);
        const eng = Math.round(reach * (0.02 + rnd() * 0.06));
        metrics[nid] = { reach, likes: Math.round(eng * 0.7), comments: Math.round(eng * 0.15), shares: Math.round(eng * 0.15), clicks: Math.round(reach * (0.01 + rnd() * 0.03)) };
      }
    }
    posts.push({
      id: `sp_${pi}`,
      topic: c.topic,
      content: c.text,
      tone: c.tone,
      networks: s.nets,
      overrides: {},                 // per-network text overrides (network id -> string)
      media: i % 3 === 0 ? 'image' : (i % 5 === 0 ? 'video' : null),
      status: s.status,
      scheduledAt: at(s.off, s.hour),
      evergreen: i === 2 || i === 4 || i === 10,   // a few flagged for the recycle queue
      metrics,
      createdAt: at(s.off - 3, 8),
      publishedAt: published ? at(s.off, s.hour) : null,
    });
  });

  /* --- per-network analytics roll-up (28-day trailing) --- */
  const analytics = {};
  for (const n of NETWORKS) {
    const spark = Array.from({ length: 14 }, () => range(40, 100));
    const followersBase = { facebook: 8200, instagram: 14300, linkedin: 6400, x: 3100, google: 900, tiktok: 21800 }[n.id] || 2000;
    const reach = Math.round((followersBase * (0.9 + rnd())) );
    const engRate = 1.5 + rnd() * 5;   // percent
    analytics[n.id] = {
      followers: followersBase + range(-100, 400),
      reach,
      engagements: Math.round(reach * (engRate / 100)),
      engagementRate: Number(engRate.toFixed(1)),
      posts: posts.filter(p => p.networks.includes(n.id)).length,
      followerGrowth: Number((rnd() * 8 - 1).toFixed(1)),   // percent, can dip negative
      spark,
    };
  }

  /* --- best-time heatmap (7 days x 6 slots), 0..100 intensity --- */
  const heat = HEAT_DAYS.map((_, di) =>
    HEAT_SLOTS.map((_, si) => {
      // Weekday midday + early evening peak; weekends flatter. Deterministic.
      const middayBoost = (si === 2 || si === 4) ? 30 : 0;
      const weekdayBoost = di < 5 ? 20 : -5;
      return Math.max(4, Math.min(100, 30 + middayBoost + weekdayBoost + range(-12, 18)));
    })
  );

  return { seededAt: new Date(now).toISOString(), posts, analytics, heat };
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
export function resetSocial() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useSocial(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = 1000;
const newId = () => `sp_${(idc++).toString(36)}_${Math.floor((state.posts?.length || 0)).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getPosts = () => state.posts;
export const getPost = (id) => state.posts.find(p => p.id === id) || null;
export const getAnalytics = () => state.analytics;
export const getHeat = () => state.heat;

// Resolve the text that ships to a given network (override or base content).
export function textForNetwork(post, networkId) {
  if (!post) return '';
  const o = post.overrides && post.overrides[networkId];
  return (o && o.trim()) ? o : (post.content || '');
}

export function scheduledPosts() {
  return state.posts
    .filter(p => p.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}
export function draftPosts() {
  return state.posts.filter(p => p.status === 'draft')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function evergreenPosts() {
  return state.posts.filter(p => p.evergreen)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function postsOnDay(dateIso) {
  const d = new Date(dateIso);
  return state.posts.filter(p => {
    const pd = new Date(p.scheduledAt);
    return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth() && pd.getDate() === d.getDate();
  }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// Header roll-up KPIs.
export function socialStats() {
  const posts = state.posts;
  const now = new Date();
  const publishedThisMonth = posts.filter(p => {
    if (p.status !== 'published' || !p.publishedAt) return false;
    const d = new Date(p.publishedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  let totalReach = 0, totalEng = 0;
  for (const nid of Object.keys(state.analytics)) {
    totalReach += state.analytics[nid].reach || 0;
    totalEng += state.analytics[nid].engagements || 0;
  }
  return {
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    publishedThisMonth,
    evergreen: posts.filter(p => p.evergreen).length,
    totalReach,
    avgEngagementRate: totalReach > 0 ? Number(((totalEng / totalReach) * 100).toFixed(1)) : 0,
  };
}

// Channel comparison rows for the analytics tab.
export function channelRows() {
  return NETWORKS.map(n => ({ network: n, ...(state.analytics[n.id] || {}) }));
}

// The single best posting slot from the heatmap (Rook's recommendation).
export function bestSlot() {
  let best = { day: 0, slot: 0, value: -1 };
  state.heat.forEach((row, di) => row.forEach((v, si) => { if (v > best.value) best = { day: di, slot: si, value: v }; }));
  return { ...best, dayLabel: HEAT_DAYS[best.day], slotLabel: HEAT_SLOTS[best.slot] };
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
// SUPABASE: from('rally_social_posts').insert(row).select().single()
export function createPost({ topic = '', content = '', tone = 'friendly', networks = [], overrides = {}, media = null, scheduledAt, evergreen = false, status } = {}) {
  if (!content || !content.trim()) return { error: 'content', message: 'Write something to post first.' };
  if (!networks || networks.length === 0) return { error: 'networks', message: 'Pick at least one network.' };
  const nowIso = new Date().toISOString();
  const when = scheduledAt || new Date(Date.now() + 86400000).toISOString();
  const resolved = status || (scheduledAt ? 'scheduled' : 'draft');
  const p = {
    id: newId(),
    topic: (topic || '').trim(),
    content: content.trim(),
    tone,
    networks: networks.filter(n => networkById(n)),
    overrides: overrides || {},
    media: media || null,
    status: resolved,
    scheduledAt: when,
    evergreen: !!evergreen,
    metrics: {},
    createdAt: nowIso,
    publishedAt: null,
  };
  commit({ ...state, posts: [p, ...state.posts] });
  return { post: p };
}

export function updatePost(id, patch = {}) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  const next = { ...p, ...patch };
  commit({ ...state, posts: state.posts.map(x => x.id === id ? next : x) });
  return { post: next };
}

export function deletePost(id) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  commit({ ...state, posts: state.posts.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicatePost(id) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  const nowIso = new Date().toISOString();
  const copy = { ...p, id: newId(), status: 'draft', scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(), metrics: {}, publishedAt: null, createdAt: nowIso };
  commit({ ...state, posts: [copy, ...state.posts] });
  return { post: copy };
}

export function schedulePost(id, whenIso) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  return updatePost(id, { status: 'scheduled', scheduledAt: whenIso || p.scheduledAt || new Date(Date.now() + 86400000).toISOString() });
}

export function toggleEvergreen(id) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  return updatePost(id, { evergreen: !p.evergreen });
}

// Local "publish now" - marks published and seeds fresh, modest metrics. A real
// build routes to api/social-publish.js per network; this keeps the demo honest
// (opens/clicks start low, as they would before provider webhooks arrive).
export function publishNow(id) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  const rnd = mulberry32(hashStr(id) || 3);
  const metrics = {};
  for (const nid of p.networks) {
    const base = { facebook: 1200, instagram: 2200, linkedin: 1500, x: 700, google: 500, tiktok: 4000 }[nid] || 900;
    const reach = base + Math.floor(rnd() * 600);
    const eng = Math.round(reach * (0.02 + rnd() * 0.05));
    metrics[nid] = { reach, likes: Math.round(eng * 0.7), comments: Math.round(eng * 0.15), shares: Math.round(eng * 0.15), clicks: Math.round(reach * 0.02) };
  }
  return updatePost(id, { status: 'published', publishedAt: new Date().toISOString(), metrics });
}

// Recycle an evergreen post: clone it into a fresh draft scheduled for the next
// open weekday slot so proven content keeps working without a rewrite.
export function recyclePost(id) {
  const p = getPost(id);
  if (!p) return { error: 'missing', message: 'Post not found.' };
  const nowIso = new Date().toISOString();
  // Next day at 9am local.
  const d = new Date(Date.now() + 86400000);
  d.setHours(9, 0, 0, 0);
  const copy = { ...p, id: newId(), status: 'scheduled', scheduledAt: d.toISOString(), metrics: {}, publishedAt: null, createdAt: nowIso };
  commit({ ...state, posts: [copy, ...state.posts] });
  return { post: copy };
}
