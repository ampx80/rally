// ============================================================
// RALLY FUNNELS  (local-first, Supabase-swappable)
// A visual funnel + website builder - GoHighLevel's flagship,
// the single biggest gap Rally had. A funnel is an ordered set
// of steps (Opt-in -> Sales -> Order -> Upsell -> Thank you);
// each step is a page of stacked blocks with a live conversion
// rate. This module owns the funnels/steps/blocks store, a
// deterministic conversion simulation, and the template gallery.
// A fixed-seed PRNG builds a believable book of funnels on first
// run; mutations persist to localStorage so the demo feels alive.
// Every function used during module-eval seeding is a hoisted
// `function` declaration (no TDZ hazard). No em/en dashes anywhere.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_funnels_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (mulberry32, fixed seed) ---------- */
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

// Step archetypes. Each step in a funnel is one of these. `purchase`
// steps carry a price and contribute revenue when a visitor advances.
// SUPABASE: rally_funnel_step_types (config table).
export const STEP_TYPES = {
  optin:    { key: 'optin',    label: 'Opt-in',       icon: 'inbox',    color: '#5b4bf5', purchase: false, blurb: 'Capture the lead' },
  sales:    { key: 'sales',    label: 'Sales page',   icon: 'fileText', color: '#0ea5a3', purchase: false, blurb: 'Make the pitch' },
  vsl:      { key: 'vsl',      label: 'VSL',          icon: 'eye',      color: '#a855f7', purchase: false, blurb: 'Video sales letter' },
  webinar:  { key: 'webinar',  label: 'Webinar',      icon: 'megaphone',color: '#e0752d', purchase: false, blurb: 'Live or evergreen' },
  calendar: { key: 'calendar', label: 'Booking',      icon: 'calendar', color: '#2563a8', purchase: false, blurb: 'Book the call' },
  order:    { key: 'order',    label: 'Order form',   icon: 'receipt',  color: '#1a7f52', purchase: true,  blurb: 'Take the payment' },
  upsell:   { key: 'upsell',   label: 'Upsell',       icon: 'trendUp',  color: '#c0392b', purchase: true,  blurb: 'One-click bump' },
  downsell: { key: 'downsell', label: 'Downsell',     icon: 'arrowDown',color: '#b3721a', purchase: true,  blurb: 'Save the no' },
  thankyou: { key: 'thankyou', label: 'Thank you',    icon: 'check',    color: '#8b3fd4', purchase: false, blurb: 'Confirm + deliver' },
};
export const STEP_TYPE_LIST = Object.values(STEP_TYPES);
export function stepMeta(type) { return STEP_TYPES[type] || STEP_TYPES.optin; }

// Block archetypes for the page-block editor. `fields` are the editable
// copy slots; the preview renders each block from these values.
export const BLOCK_TYPES = {
  hero:        { key: 'hero',        label: 'Hero',        icon: 'sparkles', fields: ['eyebrow', 'headline', 'subhead'] },
  video:       { key: 'video',       label: 'Video',       icon: 'eye',      fields: ['headline', 'caption'] },
  form:        { key: 'form',        label: 'Form',        icon: 'list',     fields: ['headline', 'button'] },
  bullets:     { key: 'bullets',     label: 'Bullets',     icon: 'check',    fields: ['headline', 'items'] },
  pricing:     { key: 'pricing',     label: 'Pricing',     icon: 'dollar',   fields: ['headline', 'price', 'note'] },
  testimonial: { key: 'testimonial', label: 'Testimonial', icon: 'star',     fields: ['quote', 'author'] },
  text:        { key: 'text',        label: 'Text',        icon: 'fileText', fields: ['headline', 'body'] },
  cta:         { key: 'cta',         label: 'Call to action', icon: 'zap',   fields: ['headline', 'button'] },
};
export function blockMeta(type) { return BLOCK_TYPES[type] || BLOCK_TYPES.text; }

// Traffic-source palette for the analytics tab.
export const TRAFFIC_SOURCES = [
  { key: 'meta',    label: 'Meta Ads',      color: '#5b4bf5' },
  { key: 'google',  label: 'Google Ads',    color: '#0ea5a3' },
  { key: 'organic', label: 'Organic search',color: '#1a7f52' },
  { key: 'email',   label: 'Email list',    color: '#e0752d' },
  { key: 'social',  label: 'Social',        color: '#a855f7' },
  { key: 'direct',  label: 'Direct',        color: '#8b93a4' },
];

/* ============================================================
   TEMPLATE GALLERY
   The five funnels marketers actually build. Each template is an
   ordered list of step archetypes plus a believable conversion
   profile. Building a funnel from a template instantiates real
   steps + default blocks so it is editable the second it lands.
   ============================================================ */
export const TEMPLATES = [
  {
    id: 'lead-magnet', name: 'Lead Magnet', icon: 'inbox', accent: '#5b4bf5',
    category: 'List building',
    tagline: 'Trade a free resource for an email. The fastest list builder there is.',
    baseConv: 42, avgOrder: 0,
    steps: [
      { type: 'optin', name: 'Free guide opt-in' },
      { type: 'thankyou', name: 'Download + confirm' },
    ],
  },
  {
    id: 'webinar', name: 'Webinar', icon: 'megaphone', accent: '#e0752d',
    category: 'High ticket',
    tagline: 'Register, show up, watch, buy. The classic high-ticket engine.',
    baseConv: 8, avgOrder: 1500,
    steps: [
      { type: 'optin', name: 'Webinar registration' },
      { type: 'thankyou', name: 'Confirmation + calendar' },
      { type: 'webinar', name: 'Live webinar' },
      { type: 'order', name: 'Offer + order form' },
      { type: 'thankyou', name: 'Welcome aboard' },
    ],
  },
  {
    id: 'product-launch', name: 'Product Launch', icon: 'rocket', accent: '#0ea5a3',
    category: 'Ecommerce',
    tagline: 'Landing to sales to order to upsell. The full four-step cash machine.',
    baseConv: 5, avgOrder: 297,
    steps: [
      { type: 'optin', name: 'Launch landing page' },
      { type: 'sales', name: 'Long-form sales page' },
      { type: 'order', name: 'Order form' },
      { type: 'upsell', name: 'One-click upsell' },
      { type: 'thankyou', name: 'Order confirmed' },
    ],
  },
  {
    id: 'appointment', name: 'Appointment', icon: 'calendar', accent: '#2563a8',
    category: 'Services',
    tagline: 'Opt-in, qualify, book. Fill a calendar without a single manual reply.',
    baseConv: 18, avgOrder: 0,
    steps: [
      { type: 'optin', name: 'Strategy call opt-in' },
      { type: 'calendar', name: 'Pick a time' },
      { type: 'thankyou', name: 'Call booked' },
    ],
  },
  {
    id: 'vsl', name: 'VSL Funnel', icon: 'eye', accent: '#a855f7',
    category: 'Direct response',
    tagline: 'A video sales letter that sells while you sleep, straight to checkout.',
    baseConv: 4, avgOrder: 497,
    steps: [
      { type: 'vsl', name: 'Video sales letter' },
      { type: 'order', name: 'Checkout' },
      { type: 'upsell', name: 'Order bump upsell' },
      { type: 'thankyou', name: 'Thank you' },
    ],
  },
];
export function templateById(id) { return TEMPLATES.find(t => t.id === id); }

/* ============================================================
   BLOCK + STEP FACTORIES  (hoisted; used during seeding)
   ============================================================ */

let _bc = 0;   // block id counter (deterministic during seed)
function nextBlockId() { _bc += 1; return 'blk_' + _bc.toString(36); }

// Default block stack for a step archetype. Every block ships with real,
// editable copy so a fresh step never looks empty.
function defaultBlocks(type, stepName) {
  const B = (t, fields) => ({ id: nextBlockId(), type: t, ...fields });
  switch (type) {
    case 'optin':
      return [
        B('hero', { eyebrow: 'Free download', headline: 'The 7-figure funnel checklist', subhead: 'Steal the exact 21-point checklist our top funnels pass before they go live.' }),
        B('form', { headline: 'Where should we send it?', button: 'Send me the checklist' }),
        B('testimonial', { quote: 'We shipped in a weekend and doubled opt-ins the first week.', author: 'Priya Nair, Founder at Lumen Labs' }),
      ];
    case 'sales':
      return [
        B('hero', { eyebrow: 'Introducing', headline: 'The system that turns cold traffic into customers', subhead: 'Everything you need to launch, measure, and scale a funnel that actually converts.' }),
        B('bullets', { headline: 'What you get', items: 'Proven page templates|Built-in split testing|Live conversion tracking|One-click upsells' }),
        B('testimonial', { quote: 'Went from 1.2% to 5.4% on the same ad spend. It paid for itself day one.', author: 'Marcus Hale, Growth at Vertex' }),
        B('cta', { headline: 'Ready to launch?', button: 'Get instant access' }),
      ];
    case 'vsl':
      return [
        B('hero', { eyebrow: 'Watch this first', headline: 'How we 3x conversions without more traffic', subhead: 'A 12-minute walkthrough of the exact funnel doing it right now.' }),
        B('video', { headline: 'Press play', caption: 'Your video sales letter goes here. Auto-plays muted, captions on.' }),
        B('cta', { headline: 'Want the same result?', button: 'Yes, show me how' }),
      ];
    case 'webinar':
      return [
        B('hero', { eyebrow: 'Live training', headline: 'The 3 shifts behind every funnel that scales', subhead: 'A 45-minute live session with a real teardown at the end.' }),
        B('video', { headline: 'You are live', caption: 'Webinar stream embeds here. Chat and offer reveal fire on cue.' }),
        B('cta', { headline: 'The offer is open', button: 'Claim your seat now' }),
      ];
    case 'calendar':
      return [
        B('hero', { eyebrow: 'Almost there', headline: 'Pick a time that works for you', subhead: 'Grab a 30-minute strategy call. No pressure, just a real plan.' }),
        B('text', { headline: 'What to expect', body: 'We review your current funnel, find the biggest leak, and map the fix. Bring your numbers.' }),
        B('cta', { headline: 'Lock in your slot', button: 'Confirm my time' }),
      ];
    case 'order':
      return [
        B('hero', { eyebrow: 'Checkout', headline: 'You are one step away', subhead: 'Secure your access below. 30-day money-back guarantee, no questions.' }),
        B('pricing', { headline: 'Your order', price: '$297', note: 'One-time payment. Instant access.' }),
        B('form', { headline: 'Payment details', button: 'Complete my order' }),
      ];
    case 'upsell':
      return [
        B('hero', { eyebrow: 'Wait, one more thing', headline: 'Add the done-for-you templates?', subhead: 'Skip the build. 40 proven pages, installed in your account in one click.' }),
        B('pricing', { headline: 'Special one-time offer', price: '$97', note: 'Only on this page, only right now.' }),
        B('cta', { headline: 'Add to my order', button: 'Yes, add it for $97' }),
      ];
    case 'downsell':
      return [
        B('hero', { eyebrow: 'How about this', headline: 'Get just the top 10 templates', subhead: 'Not ready for the full pack? Grab the essentials for a fraction.' }),
        B('pricing', { headline: 'Lite offer', price: '$37', note: 'Same guarantee, smaller commitment.' }),
        B('cta', { headline: 'Add the lite pack', button: 'Yes, add it for $37' }),
      ];
    case 'thankyou':
    default:
      return [
        B('hero', { eyebrow: 'You are in', headline: stepName && /confirm|welcome/i.test(stepName) ? 'Welcome aboard' : 'Check your inbox', subhead: 'Everything you need is on its way. Watch for an email in the next two minutes.' }),
        B('text', { headline: 'What happens next', body: 'We just sent your access and a short getting-started guide. Add us to your contacts so nothing lands in spam.' }),
        B('cta', { headline: 'While you wait', button: 'Explore your dashboard' }),
      ];
  }
}

// Build a live step from a template step-def, giving it a per-step
// conversion rate and (for purchase steps) a price.
function makeStep(def, i, rnd, tmpl) {
  const meta = stepMeta(def.type);
  const isLast = false;
  // conversion to next step: opt-ins convert high, sales pages middling,
  // upsells low. A little seeded jitter keeps each funnel distinct.
  const base = {
    optin: 46, sales: 38, vsl: 34, webinar: 52, calendar: 64,
    order: 28, upsell: 22, downsell: 18, thankyou: 100,
  }[def.type] ?? 40;
  const jitter = Math.round((rnd() - 0.5) * 10);
  const convRate = Math.max(6, Math.min(96, base + jitter));
  let price = 0;
  if (meta.purchase) {
    if (def.type === 'order') price = tmpl?.avgOrder || 297;
    else if (def.type === 'upsell') price = Math.round(((tmpl?.avgOrder || 297) * 0.33) / 1) || 97;
    else if (def.type === 'downsell') price = Math.round(((tmpl?.avgOrder || 297) * 0.15) / 1) || 37;
  }
  return {
    id: 'step_' + (i + 1) + '_' + Math.floor(rnd() * 1e6).toString(36),
    type: def.type,
    name: def.name,
    convRate,
    price,
    blocks: defaultBlocks(def.type, def.name),
  };
}

// Instantiate all steps for a template.
function stepsFromTemplate(tmpl, rnd) {
  return tmpl.steps.map((def, i) => makeStep(def, i, rnd, tmpl));
}

/* ============================================================
   CONVERSION SIMULATION  (pure, deterministic)
   Given a funnel's top-of-funnel visitors and per-step conversion
   rates, flow visitors through every step, compute drop-off, and
   attribute revenue at purchase steps. This is the math that makes
   the whole builder feel real.
   ============================================================ */
export function funnelMetrics(funnel) {
  const steps = funnel.steps || [];
  const rows = [];
  let visitors = funnel.visitors || 0;
  let revenue = 0;
  let orders = 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const last = i === steps.length - 1;
    const rate = last ? 100 : s.convRate;
    const advancing = last ? visitors : Math.round(visitors * (rate / 100));
    const dropoff = visitors - advancing;
    const meta = stepMeta(s.type);
    // A purchase step earns from everyone who advances through it.
    const stepRevenue = meta.purchase ? advancing * (s.price || 0) : 0;
    if (meta.purchase) orders += advancing;
    revenue += stepRevenue;
    rows.push({ step: s, index: i, visitorsIn: visitors, advancing, dropoff, rate, revenue: stepRevenue, purchase: meta.purchase });
    visitors = advancing;
  }
  const inTop = funnel.visitors || 0;
  const converted = visitors;
  const endToEnd = inTop ? (converted / inTop) * 100 : 0;
  const rpv = inTop ? revenue / inTop : 0;   // revenue per visitor
  const aov = orders ? revenue / orders : 0;  // average order value
  return { rows, revenue, orders, visitorsIn: inTop, converted, endToEnd, rpv, aov };
}

// Aggregate metrics across a set of funnels (grid header KPIs).
export function portfolioMetrics(funnels) {
  let visitors = 0, revenue = 0, converted = 0, live = 0;
  for (const f of funnels) {
    if (f.status === 'live') live += 1;
    const m = funnelMetrics(f);
    visitors += m.visitorsIn;
    revenue += m.revenue;
    converted += m.converted;
  }
  const conv = visitors ? (converted / visitors) * 100 : 0;
  return { visitors, revenue, converted, conv, count: funnels.length, live };
}

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(70713);   // fixed integer seed
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  // Which templates become your live/draft funnels, with a custom name,
  // status, and top-of-funnel traffic.
  const blueprint = [
    { tmpl: 'product-launch', name: 'Q3 Course Launch', status: 'live',   visitors: 18400 },
    { tmpl: 'webinar',        name: 'Scale Summit Webinar', status: 'live', visitors: 9200 },
    { tmpl: 'lead-magnet',    name: 'Funnel Checklist Opt-in', status: 'live', visitors: 24600 },
    { tmpl: 'vsl',            name: 'Evergreen VSL', status: 'paused', visitors: 6100 },
    { tmpl: 'appointment',    name: 'Strategy Call Funnel', status: 'draft', visitors: 3200 },
  ];

  const funnels = blueprint.map((bp, i) => {
    const tmpl = templateById(bp.tmpl);
    const steps = stepsFromTemplate(tmpl, rnd);
    // 30-day daily visitor series for the sparkline, trending gently up.
    const trend = [];
    let v = (bp.visitors / 30) * 0.7;
    for (let d = 0; d < 30; d++) {
      v = v * (1 + (rnd() - 0.42) * 0.12);
      trend.push(Math.max(1, Math.round(v)));
    }
    // Traffic-source split (deterministic weights per funnel).
    const weights = TRAFFIC_SOURCES.map(() => 0.3 + rnd());
    const wsum = weights.reduce((a, b) => a + b, 0);
    const sources = TRAFFIC_SOURCES.map((s, k) => ({
      key: s.key, label: s.label, color: s.color,
      visitors: Math.round(bp.visitors * (weights[k] / wsum)),
    })).sort((a, b) => b.visitors - a.visitors);

    // A/B split test on a mid-funnel step (deterministic).
    const abIndex = Math.min(steps.length - 2, 1);
    const abStep = steps[abIndex];
    const bLift = (rnd() - 0.35) * 0.4;   // variant B lift factor
    const aConv = abStep ? abStep.convRate : 30;
    const bConv = Math.max(5, Math.min(96, Math.round(aConv * (1 + bLift))));
    const abSplit = Math.round(bp.visitors * 0.5);
    const ab = abStep ? {
      stepId: abStep.id, stepName: abStep.name,
      a: { name: 'Control', conv: aConv, visitors: abSplit },
      b: { name: 'Variant B', conv: bConv, visitors: bp.visitors - abSplit },
    } : null;

    return {
      id: 'fnl_' + (i + 1),
      name: bp.name,
      templateId: bp.tmpl,
      accent: tmpl.accent,
      status: bp.status,
      visitors: bp.visitors,
      createdAt: Date.now() - range(20, 180) * 86400000,
      steps,
      trend,
      sources,
      ab,
    };
  });

  return { seededAt: Date.now(), funnels };
}

/* ============================================================
   PERSISTENCE + PUB/SUB   (mirrors src/lib/store.js)
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function getFunnelState() { return state; }
export function resetFunnels() { try { localStorage.removeItem(LS_KEY); } catch {} state = buildSeed(); try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} subs.forEach(fn => fn(state)); }

export function useFunnels(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

// Mutation-time id generator (not used during seeding).
let idc = 1000;
function newId(p) { idc += 1; return `${p}_${idc.toString(36)}`; }

/* ============================================================
   READ API
   ============================================================ */
export const getFunnels = () => state.funnels;
export const getFunnel = (id) => state.funnels.find(f => f.id === id);
export function getStep(funnelId, stepId) {
  const f = getFunnel(funnelId);
  return f ? (f.steps || []).find(s => s.id === stepId) : null;
}

/* ============================================================
   WRITE API   (validated writers; return record or { error })
   ============================================================ */

// SUPABASE: from('rally_funnels').insert(row).select().single()
export function createFunnel({ name, templateId, status = 'draft', visitors }) {
  const tmpl = templateById(templateId) || TEMPLATES[0];
  const rnd = mulberry32((idc + name.length + Date.now()) | 0);
  const steps = stepsFromTemplate(tmpl, rnd);
  const startVisitors = Number.isFinite(visitors) ? visitors : 0;
  const trend = [];
  let v = Math.max(1, startVisitors / 30) * 0.7;
  for (let d = 0; d < 30; d++) { v = Math.max(1, v * (1 + (rnd() - 0.42) * 0.12)); trend.push(Math.round(v)); }
  const weights = TRAFFIC_SOURCES.map(() => 0.3 + rnd());
  const wsum = weights.reduce((a, b) => a + b, 0);
  const sources = TRAFFIC_SOURCES.map((s, k) => ({ key: s.key, label: s.label, color: s.color, visitors: Math.round(startVisitors * (weights[k] / wsum)) })).sort((a, b) => b.visitors - a.visitors);
  const f = {
    id: newId('fnl'), name: (name || 'Untitled funnel').trim(),
    templateId: tmpl.id, accent: tmpl.accent, status,
    visitors: startVisitors, createdAt: Date.now(),
    steps, trend, sources, ab: null,
  };
  commit({ ...state, funnels: [f, ...state.funnels] });
  return { funnel: f };
}

export function updateFunnel(id, patch) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  Object.assign(f, patch);
  commit({ ...state });
  return { funnel: f };
}

export function deleteFunnel(id) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  commit({ ...state, funnels: state.funnels.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicateFunnel(id) {
  const f = getFunnel(id);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const copy = JSON.parse(JSON.stringify(f));
  copy.id = newId('fnl');
  copy.name = f.name + ' (copy)';
  copy.status = 'draft';
  copy.createdAt = Date.now();
  copy.steps = copy.steps.map((s, i) => ({ ...s, id: 'step_' + (i + 1) + '_' + newId('s') }));
  commit({ ...state, funnels: [copy, ...state.funnels] });
  return { funnel: copy };
}

// Add a step of `type` after `afterStepId` (or at the end).
export function addStep(funnelId, type, afterStepId) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const meta = stepMeta(type);
  const step = {
    id: newId('step'), type: meta.key, name: meta.label,
    convRate: { optin: 46, sales: 38, vsl: 34, webinar: 52, calendar: 64, order: 28, upsell: 22, downsell: 18, thankyou: 100 }[meta.key] ?? 40,
    price: meta.purchase ? (type === 'order' ? 297 : type === 'upsell' ? 97 : 37) : 0,
    blocks: defaultBlocks(meta.key, meta.label),
  };
  const steps = [...f.steps];
  const at = afterStepId ? steps.findIndex(s => s.id === afterStepId) : steps.length - 1;
  steps.splice((at < 0 ? steps.length - 1 : at) + 1, 0, step);
  f.steps = steps;
  commit({ ...state });
  return { step };
}

export function removeStep(funnelId, stepId) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  if (f.steps.length <= 1) return { error: 'min', message: 'A funnel needs at least one step.' };
  f.steps = f.steps.filter(s => s.id !== stepId);
  commit({ ...state });
  return { ok: true };
}

// Move a step up (-1) or down (+1) in the flow.
export function moveStep(funnelId, stepId, dir) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const steps = [...f.steps];
  const i = steps.findIndex(s => s.id === stepId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= steps.length) return { error: 'bounds' };
  const tmp = steps[i]; steps[i] = steps[j]; steps[j] = tmp;
  f.steps = steps;
  commit({ ...state });
  return { ok: true };
}

export function updateStep(funnelId, stepId, patch) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  if (patch.convRate != null) patch = { ...patch, convRate: Math.max(1, Math.min(100, Number(patch.convRate) || 0)) };
  if (patch.price != null) patch = { ...patch, price: Math.max(0, Number(patch.price) || 0) };
  Object.assign(s, patch);
  commit({ ...state });
  return { step: s };
}

// Edit a single block's copy fields.
export function updateBlock(funnelId, stepId, blockId, patch) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  const b = (s.blocks || []).find(x => x.id === blockId);
  if (!b) return { error: 'missing', message: 'Block not found.' };
  Object.assign(b, patch);
  commit({ ...state });
  return { block: b };
}

export function addBlock(funnelId, stepId, type) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  const meta = blockMeta(type);
  const fresh = {};
  for (const fld of meta.fields) fresh[fld] = '';
  const block = { id: newId('blk'), type: meta.key, ...fresh };
  s.blocks = [...(s.blocks || []), block];
  commit({ ...state });
  return { block };
}

export function removeBlock(funnelId, stepId, blockId) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  s.blocks = (s.blocks || []).filter(b => b.id !== blockId);
  commit({ ...state });
  return { ok: true };
}

export function moveBlock(funnelId, stepId, blockId, dir) {
  const f = getFunnel(funnelId);
  if (!f) return { error: 'missing', message: 'Funnel not found.' };
  const s = f.steps.find(x => x.id === stepId);
  if (!s) return { error: 'missing', message: 'Step not found.' };
  const blocks = [...(s.blocks || [])];
  const i = blocks.findIndex(b => b.id === blockId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return { error: 'bounds' };
  const t = blocks[i]; blocks[i] = blocks[j]; blocks[j] = t;
  s.blocks = blocks;
  commit({ ...state });
  return { ok: true };
}

// Promote the winning A/B variant into the step's live conversion rate.
export function promoteVariant(funnelId, which) {
  const f = getFunnel(funnelId);
  if (!f || !f.ab) return { error: 'missing', message: 'No test running.' };
  const step = f.steps.find(s => s.id === f.ab.stepId);
  if (!step) return { error: 'missing', message: 'Step not found.' };
  const winner = which === 'b' ? f.ab.b : f.ab.a;
  step.convRate = winner.conv;
  f.ab = null;
  commit({ ...state });
  return { ok: true, conv: winner.conv };
}
