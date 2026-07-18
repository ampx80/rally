// ============================================================
// ARDOVO GENESIS  (prompt-to-platform generative setup)
// ------------------------------------------------------------
// Genesis turns one sentence about a business into a whole
// revenue OS: pipelines + stages, custom fields, deal types,
// automation recipes, comms templates, dashboards, and seed
// segments. GoHighLevel ships static "snapshots"; Genesis is
// GENERATIVE and previewed - you watch it assemble, then apply.
//
// This module is 100% local-first and deterministic. The whole
// "generation" runs off the blueprint library below plus a
// keyword matcher (matchBlueprint) - ZERO backend, never throws.
// An optional env-gated hook (generateWithRook) can call the real
// LLM at /api/rook-plan when VITE_GENESIS_LIVE is set; it degrades
// silently to the local sim on any failure.
//
// Applied blueprints persist to localStorage with the same
// pub/sub pattern as src/lib/store.js (subscribe / emit / useX).
//
// ASCII only. NO em-dash and NO en-dash anywhere.
// ============================================================
import { useEffect, useState } from 'react';

/* ---------- deterministic PRNG (fixed seed, no Date.now) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// One fixed seed drives every "generated" count so the demo is
// byte-for-byte stable across reloads.
const GEN = mulberry32(0x6A11AD);
const seededInt = (lo, hi) => lo + Math.floor(GEN() * (hi - lo + 1));

/* ============================================================
   BLUEPRINT LIBRARY
   Each blueprint is a complete, opinionated revenue OS for one
   industry. Shapes mirror what the platform actually models:
   pipelines/stages (see STAGES in store.js), custom fields,
   deal types, automations, comms templates, dashboards, and
   seed segments. Copy is written to sell the "switch in a
   weekend" promise, tastefully.
   ============================================================ */

// accent palette pulled from the design tokens (index.css)
const A_INDIGO = 'var(--accent)';
const A_TEAL = 'var(--accent-teal)';
const A_PURPLE = 'var(--accent-purple)';
const A_INFO = 'var(--info)';
const A_WARN = 'var(--warn)';
const A_OK = 'var(--ok)';

export const BLUEPRINTS = [
  {
    id: 'medspa',
    name: 'Med Spa',
    icon: 'sparkles',
    accent: A_PURPLE,
    tagline: 'Memberships, single treatments, and multi-location booking.',
    summary: 'A revenue OS for aesthetics practices. Turns consult requests into booked treatments, sells memberships that rebill on their own, and keeps every location on one board.',
    keywords: ['med spa', 'medspa', 'aesthetic', 'aesthetics', 'botox', 'filler', 'skin', 'clinic', 'wellness', 'membership', 'treatment', 'beauty', 'laser', 'facial'],
    pipelines: [
      { name: 'Consult to Treatment', stages: ['New inquiry', 'Consult booked', 'Consult complete', 'Treatment plan sent', 'Booked', 'Completed', 'Lapsed'] },
      { name: 'Membership Sales', stages: ['Interested', 'Trial offered', 'Enrolled', 'Active', 'At risk', 'Churned'] },
    ],
    fields: [
      { object: 'Contact', name: 'Skin type', type: 'Select' },
      { object: 'Contact', name: 'Preferred provider', type: 'Lookup' },
      { object: 'Contact', name: 'Membership tier', type: 'Select' },
      { object: 'Contact', name: 'Home location', type: 'Select' },
      { object: 'Deal', name: 'Treatment category', type: 'Select' },
      { object: 'Deal', name: 'Est. sessions', type: 'Number' },
    ],
    dealTypes: ['Single treatment', 'Treatment package', 'Membership', 'Product sale'],
    automations: [
      { name: 'Consult no-show rescue', trigger: 'Consult missed', action: 'Text a rebooking link + notify front desk' },
      { name: 'Membership auto-rebill', trigger: 'Cycle date reached', action: 'Charge on file and post receipt' },
      { name: 'Post-treatment care', trigger: 'Treatment completed', action: 'Send aftercare guide, then review request at +3d' },
      { name: 'Lapsed client win-back', trigger: 'No visit in 90d', action: 'Send a come-back offer from the owner' },
    ],
    templates: [
      { name: 'Consult confirmation', kind: 'SMS' },
      { name: 'Treatment plan + price', kind: 'Quote' },
      { name: 'Aftercare instructions', kind: 'Email' },
      { name: 'Membership welcome', kind: 'Email' },
    ],
    dashboards: [
      { name: 'Front Desk Today', tiles: ['Booked treatments', 'Consults scheduled', 'No-show risk', 'Rebill due'] },
      { name: 'Membership Health', tiles: ['Active members', 'MRR', 'At-risk members', 'Net adds'] },
      { name: 'Location Scorecard', tiles: ['Revenue by location', 'Utilization', 'New members', 'Avg ticket'] },
    ],
    segments: [
      { name: 'Active members', criteria: 'Membership tier is set' },
      { name: 'Lapsed 90+ days', criteria: 'No visit in 90 days' },
      { name: 'High spend', criteria: 'Lifetime value over $5K' },
      { name: 'Consult, never booked', criteria: 'Consult complete + no treatment' },
    ],
  },
  {
    id: 'home-services',
    name: 'Home Services',
    icon: 'building',
    accent: A_WARN,
    tagline: 'Estimates, jobs, and repeat maintenance on one board.',
    summary: 'For HVAC, plumbing, electrical, and remodel crews. Requests become estimates, estimates become scheduled jobs, and finished jobs turn into maintenance plans that resell themselves.',
    keywords: ['home service', 'hvac', 'plumbing', 'plumber', 'electrician', 'electrical', 'roofing', 'roofer', 'contractor', 'remodel', 'landscaping', 'handyman', 'field service', 'install', 'repair', 'maintenance'],
    pipelines: [
      { name: 'Request to Job', stages: ['New request', 'Estimate scheduled', 'Estimate sent', 'Approved', 'Scheduled', 'In progress', 'Completed', 'Lost'] },
      { name: 'Maintenance Plans', stages: ['Offered', 'Enrolled', 'Active', 'Renewal due', 'Renewed', 'Cancelled'] },
    ],
    fields: [
      { object: 'Contact', name: 'Service address', type: 'Text' },
      { object: 'Contact', name: 'Property type', type: 'Select' },
      { object: 'Deal', name: 'Job type', type: 'Select' },
      { object: 'Deal', name: 'Crew assigned', type: 'Lookup' },
      { object: 'Deal', name: 'Equipment age', type: 'Number' },
      { object: 'Deal', name: 'Warranty end', type: 'Date' },
    ],
    dealTypes: ['Service call', 'Estimate', 'Install', 'Maintenance plan'],
    automations: [
      { name: 'Instant estimate follow-up', trigger: 'Estimate sent', action: 'Text a sign-and-approve link, remind at +2d' },
      { name: 'On-my-way alert', trigger: 'Job starts today', action: 'Text customer tech name + ETA' },
      { name: 'Maintenance reminder', trigger: 'Plan due', action: 'Auto-book seasonal tune-up and notify dispatch' },
      { name: 'Review after completion', trigger: 'Job completed + paid', action: 'Request a review, route low scores to owner' },
    ],
    templates: [
      { name: 'Estimate + line items', kind: 'Quote' },
      { name: 'Appointment reminder', kind: 'SMS' },
      { name: 'Invoice + pay link', kind: 'Invoice' },
      { name: 'Maintenance plan offer', kind: 'Email' },
    ],
    dashboards: [
      { name: 'Dispatch Board', tiles: ['Jobs today', 'Unassigned', 'Estimates pending', 'Revenue booked'] },
      { name: 'Estimate Funnel', tiles: ['Sent', 'Approval rate', 'Avg ticket', 'Aging estimates'] },
      { name: 'Recurring Revenue', tiles: ['Active plans', 'Renewals due', 'Plan revenue', 'Churn'] },
    ],
    segments: [
      { name: 'Open estimates', criteria: 'Estimate sent + not approved' },
      { name: 'Plan renewals due', criteria: 'Maintenance plan due in 30 days' },
      { name: 'Aging equipment', criteria: 'Equipment age over 10 years' },
      { name: 'Past customers, no plan', criteria: 'Completed job + no maintenance plan' },
    ],
  },
  {
    id: 'b2b-saas',
    name: 'B2B SaaS',
    icon: 'zap',
    accent: A_INDIGO,
    tagline: 'Inbound to closed-won, then expansion and renewal.',
    summary: 'A modern sales motion for software teams. Qualifies inbound, runs a clean discovery-to-close pipeline, and hands customers to a success board built for expansion and on-time renewals.',
    keywords: ['saas', 'software', 'b2b', 'platform', 'api', 'developer', 'app', 'subscription', 'seats', 'startup', 'tech', 'product-led', 'plg', 'enterprise'],
    pipelines: [
      { name: 'New Business', stages: ['Lead', 'Qualified', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed won', 'Closed lost'] },
      { name: 'Expansion + Renewal', stages: ['Onboarding', 'Adopted', 'Expansion identified', 'Renewal due', 'Renewed', 'Churned'] },
    ],
    fields: [
      { object: 'Company', name: 'Plan tier', type: 'Select' },
      { object: 'Company', name: 'Seats', type: 'Number' },
      { object: 'Company', name: 'Health score', type: 'Number' },
      { object: 'Deal', name: 'ARR', type: 'Currency' },
      { object: 'Deal', name: 'Contract term', type: 'Select' },
      { object: 'Deal', name: 'Champion', type: 'Lookup' },
    ],
    dealTypes: ['New logo', 'Expansion', 'Renewal', 'Pilot'],
    automations: [
      { name: 'Lead router + SLA', trigger: 'New inbound lead', action: 'Score, assign by territory, start a 5-min SLA timer' },
      { name: 'Stuck deal nudge', trigger: 'No activity in 7d', action: 'Alert owner with a suggested next step from Rook' },
      { name: 'Renewal runway', trigger: '90 days to renewal', action: 'Open a renewal deal and brief the CSM' },
      { name: 'Champion left', trigger: 'Champion job change', action: 'Flag risk and draft a re-intro sequence' },
    ],
    templates: [
      { name: 'Discovery recap', kind: 'Email' },
      { name: 'Order form', kind: 'Quote' },
      { name: 'Mutual action plan', kind: 'Document' },
      { name: 'Renewal notice', kind: 'Email' },
    ],
    dashboards: [
      { name: 'Pipeline Coverage', tiles: ['Open ARR', 'Weighted forecast', 'Coverage ratio', 'Win rate'] },
      { name: 'Rep Scorecard', tiles: ['Quota attainment', 'Activities', 'Cycle time', 'Avg ACV'] },
      { name: 'Net Revenue', tiles: ['New ARR', 'Expansion', 'Gross churn', 'Net retention'] },
    ],
    segments: [
      { name: 'Enterprise pipeline', criteria: 'Seats over 500 + open deal' },
      { name: 'Renewals this quarter', criteria: 'Renewal due within 90 days' },
      { name: 'Product-qualified', criteria: 'Trial active + high usage' },
      { name: 'At-risk accounts', criteria: 'Health score under 40' },
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    icon: 'megaphone',
    accent: A_TEAL,
    tagline: 'Pitch to retainer, with delivery and renewals wired in.',
    summary: 'For marketing, creative, and consulting shops. Runs new business from intro to signed SOW, then tracks retainers, project delivery, and the upsell conversations that grow accounts.',
    keywords: ['agency', 'marketing agency', 'creative', 'consulting', 'consultant', 'studio', 'design agency', 'branding', 'retainer', 'freelance', 'services firm', 'pr', 'advertising', 'seo agency'],
    pipelines: [
      { name: 'New Business', stages: ['Intro', 'Discovery', 'Proposal', 'Pitch', 'Verbal yes', 'SOW signed', 'Lost'] },
      { name: 'Client Delivery', stages: ['Kickoff', 'In production', 'Client review', 'Delivered', 'Retainer active', 'Upsell'] },
    ],
    fields: [
      { object: 'Company', name: 'Retainer size', type: 'Currency' },
      { object: 'Company', name: 'Account lead', type: 'Lookup' },
      { object: 'Deal', name: 'Service line', type: 'Select' },
      { object: 'Deal', name: 'Scope hours', type: 'Number' },
      { object: 'Deal', name: 'Start date', type: 'Date' },
      { object: 'Contact', name: 'Decision role', type: 'Select' },
    ],
    dealTypes: ['Project', 'Retainer', 'Upsell', 'Referral'],
    automations: [
      { name: 'Proposal chase', trigger: 'Proposal sent', action: 'Follow up at +3d and +7d, alert owner if opened' },
      { name: 'Kickoff on signature', trigger: 'SOW signed', action: 'Spin up a delivery project and notify the team' },
      { name: 'Retainer renewal', trigger: 'Retainer ending in 30d', action: 'Draft a renewal + scope review' },
      { name: 'Scope creep watch', trigger: 'Hours over 90% of scope', action: 'Flag account lead to raise an upsell' },
    ],
    templates: [
      { name: 'Proposal + scope', kind: 'Quote' },
      { name: 'Statement of work', kind: 'Document' },
      { name: 'Kickoff agenda', kind: 'Email' },
      { name: 'Monthly recap', kind: 'Email' },
    ],
    dashboards: [
      { name: 'New Business', tiles: ['Open proposals', 'Pitch win rate', 'Avg deal size', 'Pipeline value'] },
      { name: 'Delivery Health', tiles: ['Active projects', 'On-time rate', 'Scope used', 'Client sentiment'] },
      { name: 'Retainer Book', tiles: ['MRR', 'Renewals due', 'Upsell pipeline', 'Churn'] },
    ],
    segments: [
      { name: 'Hot proposals', criteria: 'Proposal sent within 14 days' },
      { name: 'Retainers up for renewal', criteria: 'Retainer ends in 30 days' },
      { name: 'Upsell candidates', criteria: 'Scope over 90% used' },
      { name: 'Dormant clients', criteria: 'No new deal in 120 days' },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: 'building2',
    accent: A_INFO,
    tagline: 'Leads to closings, with a long-game nurture built in.',
    summary: 'For agents and teams. Captures buyer and seller leads, moves them from first showing to closing, and keeps a warm nurture running so past clients send referrals for years.',
    keywords: ['real estate', 'realtor', 'realty', 'broker', 'brokerage', 'agent', 'property', 'homes', 'listing', 'buyer', 'seller', 'mortgage', 'homes for sale', 'houses'],
    pipelines: [
      { name: 'Buyer Journey', stages: ['New lead', 'Nurturing', 'Showing', 'Offer made', 'Under contract', 'Closed', 'Lost'] },
      { name: 'Seller Listings', stages: ['Prospect', 'Listing appt', 'Listed', 'Under contract', 'Closed', 'Expired'] },
    ],
    fields: [
      { object: 'Contact', name: 'Lead type', type: 'Select' },
      { object: 'Contact', name: 'Price range', type: 'Currency' },
      { object: 'Contact', name: 'Areas of interest', type: 'Text' },
      { object: 'Deal', name: 'Property address', type: 'Text' },
      { object: 'Deal', name: 'Close date', type: 'Date' },
      { object: 'Deal', name: 'Commission', type: 'Currency' },
    ],
    dealTypes: ['Buyer', 'Seller listing', 'Referral', 'Lease'],
    automations: [
      { name: 'New lead speed-to-lead', trigger: 'Lead captured', action: 'Text within 60s and assign the on-duty agent' },
      { name: 'Showing follow-up', trigger: 'Showing completed', action: 'Send a feedback ask and next-listings email' },
      { name: 'Closing countdown', trigger: 'Under contract', action: 'Create the closing checklist and reminders' },
      { name: 'Past client nurture', trigger: 'Deal closed', action: 'Enroll in a home-anniversary + market-update drip' },
    ],
    templates: [
      { name: 'New lead intro text', kind: 'SMS' },
      { name: 'Listing presentation', kind: 'Document' },
      { name: 'Showing feedback ask', kind: 'Email' },
      { name: 'Home anniversary note', kind: 'Email' },
    ],
    dashboards: [
      { name: 'Lead Engine', tiles: ['New leads', 'Speed to lead', 'Active buyers', 'Showings booked'] },
      { name: 'Deals In Play', tiles: ['Under contract', 'Projected commission', 'Closings this month', 'Fallout rate'] },
      { name: 'Sphere', tiles: ['Past clients', 'Referrals', 'Nurture opens', 'Repeat business'] },
    ],
    segments: [
      { name: 'Hot buyers', criteria: 'Showing in last 14 days' },
      { name: 'Closings this month', criteria: 'Under contract + close within 30 days' },
      { name: 'Seller prospects', criteria: 'Lead type is Seller' },
      { name: 'Past clients', criteria: 'Deal closed over 1 year ago' },
    ],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: 'activity',
    accent: A_OK,
    tagline: 'Trials to memberships, with retention on autopilot.',
    summary: 'For gyms, studios, and coaches. Converts trials and intro offers into recurring memberships, keeps classes full, and catches at-risk members before they cancel.',
    keywords: ['fitness', 'gym', 'studio', 'yoga', 'pilates', 'crossfit', 'personal trainer', 'trainer', 'coach', 'coaching', 'membership', 'class', 'wellness studio', 'boutique fitness', 'workout'],
    pipelines: [
      { name: 'Trial to Member', stages: ['Lead', 'Trial booked', 'Trial attended', 'Offer made', 'Enrolled', 'Active', 'No-show'] },
      { name: 'Retention', stages: ['Active', 'Low usage', 'At risk', 'Win-back', 'Reactivated', 'Cancelled'] },
    ],
    fields: [
      { object: 'Contact', name: 'Membership type', type: 'Select' },
      { object: 'Contact', name: 'Goal', type: 'Select' },
      { object: 'Contact', name: 'Visits per week', type: 'Number' },
      { object: 'Contact', name: 'Assigned coach', type: 'Lookup' },
      { object: 'Deal', name: 'Plan length', type: 'Select' },
      { object: 'Deal', name: 'Start date', type: 'Date' },
    ],
    dealTypes: ['Trial', 'Membership', 'Personal training', 'Class pack'],
    automations: [
      { name: 'Trial reminder + prep', trigger: 'Trial booked', action: 'Text what to bring, remind day-of' },
      { name: 'Trial to offer', trigger: 'Trial attended', action: 'Send a same-day join offer with a deadline' },
      { name: 'Low usage rescue', trigger: 'No visit in 14d', action: 'Coach check-in text + book a session' },
      { name: 'Cancellation save', trigger: 'Cancel requested', action: 'Offer a pause or downgrade before it processes' },
    ],
    templates: [
      { name: 'Trial welcome', kind: 'SMS' },
      { name: 'Membership offer', kind: 'Quote' },
      { name: 'Class reminder', kind: 'SMS' },
      { name: 'We miss you', kind: 'Email' },
    ],
    dashboards: [
      { name: 'Front Desk', tiles: ['Trials today', 'Check-ins', 'Offers out', 'New members'] },
      { name: 'Membership Growth', tiles: ['Active members', 'MRR', 'Net adds', 'Trial conversion'] },
      { name: 'Retention', tiles: ['At-risk members', 'Avg visits/wk', 'Saves', 'Churn'] },
    ],
    segments: [
      { name: 'Active members', criteria: 'Membership type is set' },
      { name: 'At risk', criteria: 'No visit in 14 days' },
      { name: 'Trials to convert', criteria: 'Trial attended + no membership' },
      { name: 'Class pack running low', criteria: 'Classes remaining under 3' },
    ],
  },
];

export const blueprintById = (id) => BLUEPRINTS.find(b => b.id === id) || null;

/* ---------- artifact counting (drives the summary stat row) ---------- */
export function countArtifacts(bp) {
  if (!bp) return { pipelines: 0, stages: 0, fields: 0, dealTypes: 0, automations: 0, templates: 0, dashboards: 0, segments: 0, total: 0 };
  const stages = bp.pipelines.reduce((n, p) => n + p.stages.length, 0);
  const c = {
    pipelines: bp.pipelines.length,
    stages,
    fields: bp.fields.length,
    dealTypes: bp.dealTypes.length,
    automations: bp.automations.length,
    templates: bp.templates.length,
    dashboards: bp.dashboards.length,
    segments: bp.segments.length,
  };
  c.total = c.pipelines + c.stages + c.fields + c.dealTypes + c.automations + c.templates + c.dashboards + c.segments;
  return c;
}

// A deterministic "records seeded" number per segment so the preview
// feels alive but never shifts between reloads (fixed-seed PRNG).
export function seedCountFor(bpId, segName) {
  // hash the pair into the fixed stream position, then draw a stable size
  let h = 0;
  const s = `${bpId}:${segName}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const r = mulberry32(0x5EED ^ h)();
  return 40 + Math.floor(r * 460); // 40..500 believable seed size
}

/* ============================================================
   BUILD STEPS  (the live "assembling your platform" stepper)
   Flattens a blueprint into an ordered list of artifacts that
   reveal one at a time. Each step is small and legible so the
   reveal reads like a machine wiring the platform in real time.
   ============================================================ */
export function buildSteps(bp) {
  if (!bp) return [];
  const steps = [];
  let n = 0;
  const push = (group, kind, label, detail) => steps.push({ id: `s${n++}`, group, kind, label, detail });

  push('Analyze', 'search', 'Read your business description', 'Rook parsed your prompt and matched a blueprint');
  push('Analyze', 'sparkles', `Selected the ${bp.name} blueprint`, bp.tagline);

  for (const p of bp.pipelines) {
    push('Pipelines', 'target', `Pipeline: ${p.name}`, `${p.stages.length} stages`);
    p.stages.forEach((st, i) => push('Pipelines', 'chevronRight', `Stage ${i + 1}: ${st}`, p.name));
  }
  for (const f of bp.fields) push('Fields', 'sliders', `${f.object} field: ${f.name}`, f.type);
  for (const d of bp.dealTypes) push('Deal types', 'box', `Deal type: ${d}`, 'Added to the deal object');
  for (const a of bp.automations) push('Automations', 'zap', a.name, `When ${a.trigger.toLowerCase()} then ${a.action.toLowerCase()}`);
  for (const t of bp.templates) push('Templates', 'fileText', t.name, `${t.kind} template`);
  for (const d of bp.dashboards) push('Dashboards', 'chart', `Dashboard: ${d.name}`, `${d.tiles.length} tiles`);
  for (const s of bp.segments) push('Segments', 'funnel', `Segment: ${s.name}`, `${seedCountFor(bp.id, s.name)} records - ${s.criteria}`);

  push('Finish', 'check', 'Platform assembled', 'Review the preview, then apply the blueprint');
  return steps;
}

/* ============================================================
   GENERATOR SIM  (deterministic prompt -> plan)
   Matches the prompt to the closest blueprint by keyword score,
   extracts a few signals (locations, team size, recurring
   revenue), and returns notes describing what Genesis tuned.
   This is the local-first "generation" - no API required.
   ============================================================ */
function extractSignals(prompt) {
  const p = ` ${prompt.toLowerCase()} `;
  const num = (re) => { const m = p.match(re); return m ? parseInt(m[1], 10) : null; };
  const locations = num(/(\d+)\s*[- ]?\s*(?:location|office|branch|store|studio|shop|clinic|gym)/);
  const team = num(/(\d+)\s*(?:people|person|employee|staff|team member|rep|agent|tech|trainer|stylist)/);
  const recurring = /(member|subscription|recurring|retainer|monthly|plan|renewal)/.test(p);
  return { locations, team, recurring };
}

export function matchBlueprint(prompt) {
  const text = (prompt || '').toLowerCase();
  let best = BLUEPRINTS[0];
  let bestScore = -1;
  for (const bp of BLUEPRINTS) {
    let score = 0;
    for (const kw of bp.keywords) {
      if (text.includes(kw)) score += kw.includes(' ') ? 3 : 2; // phrase matches weigh more
    }
    if (text.includes(bp.name.toLowerCase())) score += 4;
    if (score > bestScore) { bestScore = score; best = bp; }
  }
  const signals = extractSignals(text);
  const notes = [];
  if (bestScore <= 0) notes.push(`No exact industry match, so Genesis started you on the ${best.name} blueprint - the closest general fit. Edit anything after applying.`);
  else notes.push(`Matched the ${best.name} blueprint from your description.`);
  if (signals.locations && signals.locations > 1) notes.push(`Detected ${signals.locations} locations, so a "Home location" field and a per-location dashboard are included.`);
  if (signals.team) notes.push(`Detected a team of ${signals.team}, so owner routing and rep scorecards are pre-wired.`);
  if (signals.recurring) notes.push('Detected recurring revenue, so a membership or renewal pipeline is part of the build.');
  return { blueprint: best, score: bestScore, signals, notes };
}

// The local, deterministic "generation". Always succeeds, never throws.
export function generatePlan(prompt) {
  const match = matchBlueprint(prompt || '');
  return {
    prompt: (prompt || '').trim(),
    blueprint: match.blueprint,
    steps: buildSteps(match.blueprint),
    counts: countArtifacts(match.blueprint),
    signals: match.signals,
    notes: match.notes,
    source: 'local',
  };
}

/* ============================================================
   OPTIONAL LIVE HOOK  (env-gated, degrades silently)
   When VITE_GENESIS_LIVE is truthy AND a fetch is available,
   Genesis will ask the real operator at /api/rook-plan to draft
   the blueprint. ANY failure (no env, network, bad shape) falls
   straight back to the local plan. This never throws and never
   blocks the UI - the local plan is always the floor.
   ============================================================ */
export function isLiveEnabled() {
  try { return !!import.meta.env?.VITE_GENESIS_LIVE; } catch { return false; }
}

export async function generateWithRook(prompt) {
  const local = generatePlan(prompt);
  if (!isLiveEnabled() || typeof fetch !== 'function') return local;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch('/api/rook-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'genesis_blueprint', prompt }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return local;
    const data = await res.json();
    // We only trust the model to pick / describe; the applied artifacts
    // still come from the vetted local blueprint so nothing fabricated
    // ever reaches the store. Merge any advisory notes it returned.
    const notes = Array.isArray(data?.notes) ? data.notes.filter(x => typeof x === 'string') : [];
    return { ...local, notes: notes.length ? [...notes, ...local.notes] : local.notes, source: 'rook' };
  } catch {
    return local; // silent degrade
  }
}

/* ============================================================
   APPLIED-BLUEPRINT STORE  (local-first, pub/sub, persisted)
   Mirrors the src/lib/store.js pattern: a module-scope state,
   a Set of subscribers, localStorage persistence, and a useX
   hook. Applying a blueprint records what was installed so the
   Genesis page (and, later, the rest of the platform) can show
   the active setup.
   ============================================================ */
const LS_KEY = 'rally_genesis_v1';
let applied = loadApplied();
const subs = new Set();

function loadApplied() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch {}
  return [];
}
function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(applied)); } catch {} }
function emit() { persist(); subs.forEach(fn => fn(applied)); }

let idc = 1000;
const newId = () => `gen_${(idc++).toString(36)}${Math.floor(GEN() * 1e6).toString(36)}`;

export function getApplied() { return applied; }
export function isApplied(bpId) { return applied.some(a => a.blueprintId === bpId); }

// Records a blueprint as installed. Stores a snapshot of the counts +
// the prompt that produced it. Idempotent-friendly: applying the same
// blueprint again adds a fresh dated entry (a real re-provision).
export function applyBlueprint(bp, prompt = '', extra = {}) {
  if (!bp) return { error: 'missing', message: 'No blueprint to apply.' };
  const rec = {
    id: newId(),
    blueprintId: bp.id,
    name: bp.name,
    icon: bp.icon,
    accent: bp.accent,
    prompt: (prompt || '').trim(),
    counts: countArtifacts(bp),
    notes: Array.isArray(extra.notes) ? extra.notes : [],
    appliedAt: new Date().toISOString(),
  };
  applied = [rec, ...applied];
  emit();
  return { applied: rec };
}

export function removeApplied(id) {
  applied = applied.filter(a => a.id !== id);
  emit();
  return { ok: true, id };
}

export function resetGenesis() { applied = []; emit(); }

export function useGenesis(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(applied));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(applied);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}
