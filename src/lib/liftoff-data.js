// ============================================================
// RALLY LIFTOFF  (AI onboarding wizard - local-first engine)
// ------------------------------------------------------------
// Liftoff interviews a brand-new customer org, decides which of
// Rally's ~60 toggleable modules to switch on, and generates a
// tailored "deck" for every LAYER of the company (exec, manager,
// sales, sdr, marketing, cs, finance, ops, revops, support) plus a
// MASTER deck that shows the whole picture. A 500-1000 person org
// gets full transparency while each person sees only what they need.
//
// LOCAL-FIRST: fully alive on first load with SEEDED deterministic
// data and ZERO backend. A fixed mulberry32 seed drives believable
// numbers; a pre-generated DEMO plan means every surface is populated
// before the user answers a single question. Any AI call is env-gated
// and degrades silently to the deterministic generator.
//
// TDZ-SAFE: every helper used while the module evaluates (to build
// DEMO_PLAN at the bottom) is a hoisted `function` declaration, and
// every data table it reads is a const declared ABOVE the call site.
//
// ADDITIVE: this file imports nothing it mutates and edits no existing
// file. Wiring (routes, nav) is applied by the integrator.
//
// SUPABASE: rally_liftoff_intake + rally_liftoff_plans + rally_decks.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_liftoff_v1';   // bump to force a clean reseed

/* ============================================================
   DETERMINISTIC PRNG + tiny utils  (all hoisted - safe at seed)
   ============================================================ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  const str = String(s || 'rally');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function clampNum(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(lo, Math.min(hi, n));
}
function asArray(v) { return Array.isArray(v) ? v : v == null ? [] : [v]; }
function titleOr(v, fallback) { const s = String(v == null ? '' : v).trim(); return s || fallback; }
function uniq(arr) { return [...new Set(arr)]; }

/* ============================================================
   INTAKE STEPS  (the wizard script - one sharp question at a time)
   ============================================================ */
export const INTAKE_STEPS = [
  {
    key: 'companyName',
    question: 'First - what should we call your company?',
    help: 'This names the workspace and every deck Liftoff builds for your team.',
    type: 'text',
    placeholder: 'e.g. Northwind Systems',
  },
  {
    key: 'industry',
    question: 'What industry are you in?',
    help: 'It shapes the language and benchmarks in every layer of your rollout.',
    type: 'single',
    options: [
      { value: 'SaaS', label: 'Software / SaaS' },
      { value: 'Financial Services', label: 'Financial services' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Manufacturing', label: 'Manufacturing' },
      { value: 'Retail', label: 'Retail / e-commerce' },
      { value: 'Professional Services', label: 'Professional services' },
      { value: 'Logistics', label: 'Logistics / supply chain' },
      { value: 'Media', label: 'Media / agency' },
      { value: 'Real Estate', label: 'Real estate' },
      { value: 'Other', label: 'Something else' },
    ],
  },
  {
    key: 'headcount',
    question: 'How many people work at {company}?',
    help: 'Everyone in the company - not just the folks who will log in.',
    type: 'number',
    min: 1, max: 200000, unit: 'people',
    placeholder: '620',
  },
  {
    key: 'seats',
    question: 'And how many of them will actually use Rally?',
    help: 'Your paid seats. Liftoff sizes pipeline, quotas, and workload from this.',
    type: 'number',
    min: 1, max: 200000, unit: 'seats',
    placeholder: '240',
  },
  {
    key: 'sells',
    question: 'In one line - what does {company} sell?',
    help: 'A sentence is plenty. It tells Rook how to talk about your business.',
    type: 'text',
    placeholder: 'A workforce analytics platform for mid-market operations teams',
  },
  {
    key: 'salesMotion',
    question: 'How do deals actually get won here?',
    help: 'Your dominant motion. Pick the one that closes the most revenue today.',
    type: 'single',
    options: [
      { value: 'self-serve', label: 'Self-serve', hint: 'Customers sign up and pay on their own.' },
      { value: 'inside sales', label: 'Inside sales', hint: 'Reps sell over the phone, email, and video.' },
      { value: 'field', label: 'Field sales', hint: 'Named reps working large, in-person deals.' },
      { value: 'hybrid', label: 'Hybrid', hint: 'A blend - self-serve funnel feeding a sales team.' },
    ],
  },
  {
    key: 'departments',
    question: 'Which teams will live inside Rally?',
    help: 'Pick every group that touches a customer. Liftoff builds a deck for each.',
    type: 'multi',
    options: [
      { value: 'Executive', label: 'Executive' },
      { value: 'Sales', label: 'Sales' },
      { value: 'SDR/BDR', label: 'SDR / BDR' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Customer Success', label: 'Customer Success' },
      { value: 'Finance/Accounting', label: 'Finance / Accounting' },
      { value: 'Operations', label: 'Operations' },
      { value: 'RevOps', label: 'RevOps' },
      { value: 'Support', label: 'Support' },
      { value: 'Product', label: 'Product' },
    ],
  },
  {
    key: 'replacing',
    question: 'What are you replacing?',
    help: 'Whatever your teams touch today. This maps your data and cuts your tool spend.',
    type: 'multi',
    options: [
      { value: 'Salesforce', label: 'Salesforce' },
      { value: 'HubSpot', label: 'HubSpot' },
      { value: 'Pipedrive', label: 'Pipedrive' },
      { value: 'Outreach', label: 'Outreach / Salesloft' },
      { value: 'Gong', label: 'Gong / conversation AI' },
      { value: 'Marketo', label: 'Marketo / Pardot' },
      { value: 'Zendesk', label: 'Zendesk / support desk' },
      { value: 'QuickBooks', label: 'QuickBooks / billing' },
      { value: 'Spreadsheets', label: 'Spreadsheets' },
      { value: 'Nothing', label: 'Nothing yet - first CRM' },
    ],
    suggestions: ['Salesforce', 'Outreach', 'Spreadsheets'],
  },
  {
    key: 'goals',
    question: 'What has to be true 90 days from now?',
    help: 'Choose the outcomes that matter most. They rank which modules light up first.',
    type: 'multi',
    options: [
      { value: 'grow pipeline', label: 'Grow pipeline', hint: 'More qualified opportunities in flight.' },
      { value: 'forecast accuracy', label: 'Forecast accuracy', hint: 'A number leadership can trust.' },
      { value: 'faster onboarding', label: 'Faster onboarding', hint: 'New customers live sooner.' },
      { value: 'reduce churn', label: 'Reduce churn', hint: 'Keep and grow the base.' },
      { value: 'unify data', label: 'Unify data', hint: 'One source of truth, no silos.' },
      { value: 'cut tool cost', label: 'Cut tool cost', hint: 'Consolidate the stack.' },
    ],
    suggestions: ['grow pipeline', 'forecast accuracy', 'unify data'],
  },
  {
    key: 'timeline',
    question: 'How fast do you want to be live?',
    help: 'Liftoff phases the rollout to hit this without breaking your teams.',
    type: 'single',
    options: [
      { value: 'this week', label: 'This week', hint: 'Aggressive - core spine first.' },
      { value: '30 days', label: 'Within 30 days', hint: 'The sweet spot for most orgs.' },
      { value: 'this quarter', label: 'This quarter', hint: 'Phased, team by team.' },
      { value: 'phased', label: 'Phased over 6 months', hint: 'Careful migration off legacy tools.' },
    ],
  },
  {
    key: 'team',
    question: 'Who is driving the rollout with you?',
    help: 'Your implementation crew. Liftoff assigns each of them a layer to own.',
    type: 'chips',
    options: [
      { value: 'Exec sponsor', label: 'Exec sponsor' },
      { value: 'RevOps lead', label: 'RevOps lead' },
      { value: 'Sales manager', label: 'Sales manager' },
      { value: 'Marketing ops', label: 'Marketing ops' },
      { value: 'CS lead', label: 'CS lead' },
      { value: 'Finance lead', label: 'Finance lead' },
      { value: 'IT / Admin', label: 'IT / Admin' },
    ],
    suggestions: ['Exec sponsor', 'RevOps lead', 'IT / Admin'],
  },
];

/* Steps whose answer must be present for the intake to count as complete.
   'team' is optional-nice-to-have, everything else is required. */
const REQUIRED_STEPS = INTAKE_STEPS.filter(s => s.key !== 'team').map(s => s.key);

/* ============================================================
   ROLES  (the layers a deck is generated for)
   audience = who reads it, focus = the one job the deck does.
   ============================================================ */
export const ROLES = [
  { key: 'master',    label: 'Master deck',       audience: 'Whole company',            focus: 'The full picture - every module, org-wide numbers, every layer summarized.', accent: '#5b4bf5' },
  { key: 'exec',      label: 'Executive',         audience: 'CEO, founders, board',      focus: 'Company-wide revenue, forecast, and growth in one screen.',                accent: '#8b3fd4' },
  { key: 'manager',   label: 'Sales leadership',  audience: 'VPs and sales managers',    focus: 'Team pipeline, quota pacing, and where deals are stuck.',                  accent: '#0ea5a3' },
  { key: 'sales',     label: 'Account executive', audience: 'Quota-carrying reps',       focus: 'My pipeline, my deals, my next actions - nothing else.',                   accent: '#2563a8' },
  { key: 'sdr',       label: 'SDR / BDR',         audience: 'Pipeline builders',         focus: 'Fresh leads, active sequences, and meetings booked.',                      accent: '#e0752d' },
  { key: 'marketing', label: 'Marketing',         audience: 'Demand and growth',         focus: 'Campaign performance, MQLs, and pipeline sourced.',                        accent: '#d4a017' },
  { key: 'cs',        label: 'Customer Success',   audience: 'CSMs and onboarding',      focus: 'Health, renewals, churn risk, and onboarding speed.',                      accent: '#1a7f52' },
  { key: 'finance',   label: 'Finance / Accounting', audience: 'Controllers and CFO',    focus: 'Revenue, MRR, AR aging, invoices, and payments.',                          accent: '#0e7490' },
  { key: 'ops',       label: 'Operations',        audience: 'Ops and enablement',        focus: 'Automation live, hours saved, and data health.',                           accent: '#c0392b' },
  { key: 'revops',    label: 'RevOps',            audience: 'Revenue operations',        focus: 'Forecast accuracy, pipeline coverage, and data integrity.',                accent: '#7c3aed' },
  { key: 'support',   label: 'Support',           audience: 'Help desk and service',     focus: 'Open tickets, response time, CSAT, and self-serve deflection.',             accent: '#b3721a' },
];
export const roleMeta = (key) => ROLES.find(r => r.key === key) || null;

/* ============================================================
   MODULE CATALOG  (subset of the Rally registry that Liftoff can
   recommend). key -> { label, route, section }. Mirrors the labels +
   routes in src/lib/modules.js so views deep-link to real surfaces.
   ============================================================ */
const MODULE_CATALOG = {
  // core spine (always recommended as the foundation)
  deals:        { label: 'Deals',            route: '/deals',        section: 'Sell' },
  contacts:     { label: 'Contacts',         route: '/contacts',     section: 'Sell' },
  companies:    { label: 'Companies',        route: '/companies',    section: 'Sell' },
  dashboards:   { label: 'Dashboards',       route: '/dashboards',   section: 'Intelligence' },
  reports:      { label: 'Reports',          route: '/reports',      section: 'Intelligence' },
  roles:        { label: 'Roles',            route: '/roles',        section: 'Admin' },
  permissions:  { label: 'Permissions',      route: '/permissions',  section: 'Admin' },
  // sell
  leads:        { label: 'Leads',            route: '/leads',        section: 'Sell' },
  forecasting:  { label: 'Forecasting',      route: '/forecasting',  section: 'Sell' },
  goals:        { label: 'Goals',            route: '/goals',        section: 'Sell' },
  // marketing
  campaigns:    { label: 'Campaigns',        route: '/campaigns',    section: 'Marketing' },
  sequences:    { label: 'Sequences',        route: '/sequences',    section: 'Marketing' },
  funnels:      { label: 'Funnels',          route: '/funnels',      section: 'Marketing' },
  ads:          { label: 'Ads',              route: '/ads',          section: 'Marketing' },
  social:       { label: 'Social',           route: '/social',       section: 'Marketing' },
  reviews:      { label: 'Reviews',          route: '/reviews',      section: 'Marketing' },
  journeys:     { label: 'Journeys',         route: '/journeys',     section: 'Marketing' },
  markethub:    { label: 'Marketing Hub',    route: '/markethub',    section: 'Marketing' },
  attribution:  { label: 'Attribution',      route: '/attribution',  section: 'Intelligence' },
  // revenue
  quotes:       { label: 'Quotes',           route: '/quotes',       section: 'Revenue' },
  products:     { label: 'Products',         route: '/products',     section: 'Revenue' },
  invoices:     { label: 'Billing',          route: '/invoices',     section: 'Revenue' },
  payments:     { label: 'Payments',         route: '/payments',     section: 'Revenue' },
  signatures:   { label: 'Signatures',       route: '/signatures',   section: 'Revenue' },
  // deliver + service
  projects:     { label: 'Projects',         route: '/projects',     section: 'Deliver' },
  success:      { label: 'Customer success', route: '/success',      section: 'Deliver' },
  tickets:      { label: 'Support tickets',  route: '/tickets',      section: 'Service' },
  kb:           { label: 'Knowledge base',   route: '/kb',           section: 'Service' },
  surveys:      { label: 'Surveys',          route: '/surveys',      section: 'Service' },
  conversations:{ label: 'Conversations',    route: '/conversations',section: 'Service' },
  voice:        { label: 'Voice AI',         route: '/voice',        section: 'Service' },
  // intelligence
  intelligence: { label: 'Intelligence',     route: '/intelligence', section: 'Intelligence' },
  twin:         { label: 'Revenue Twin',     route: '/twin',         section: 'Intelligence' },
  signals:      { label: 'Signals',          route: '/signals',      section: 'Intelligence' },
  // data + automate
  grid:         { label: 'Grid',             route: '/grid',         section: 'Data' },
  drive:        { label: 'Drive',            route: '/drive',        section: 'Files' },
  sheets:       { label: 'Sheets',           route: '/sheets',       section: 'Files' },
  objects:      { label: 'Custom objects',   route: '/objects',      section: 'Data' },
  datasync:     { label: 'Data sync',        route: '/datasync',     section: 'Data' },
  workflows:    { label: 'Workflows',        route: '/workflows',    section: 'Automate' },
  autopilot:    { label: 'Autopilot',        route: '/autopilot',    section: 'Automate' },
  workspaces:   { label: 'Workspaces',       route: '/workspaces',   section: 'Admin' },
};
export const moduleLabel = (key) => (MODULE_CATALOG[key] && MODULE_CATALOG[key].label) || key;
export const moduleRoute = (key) => (MODULE_CATALOG[key] && MODULE_CATALOG[key].route) || '/';

/* Foundation - the spine every org gets on day one, no matter what. */
const FOUNDATION = ['deals', 'contacts', 'companies', 'dashboards', 'reports', 'roles', 'permissions'];

/* Department -> the modules that team lives in. */
const DEPT_MODULES = {
  'Executive':          ['dashboards', 'reports', 'forecasting', 'intelligence', 'goals'],
  'Sales':              ['deals', 'contacts', 'companies', 'forecasting', 'quotes', 'goals'],
  'SDR/BDR':            ['leads', 'sequences', 'contacts', 'conversations', 'goals'],
  'Marketing':          ['campaigns', 'sequences', 'ads', 'social', 'funnels', 'markethub', 'attribution', 'journeys', 'reviews'],
  'Customer Success':   ['success', 'projects', 'surveys', 'signals', 'tickets'],
  'Finance/Accounting': ['invoices', 'payments', 'products', 'quotes', 'reports'],
  'Operations':         ['workflows', 'autopilot', 'datasync', 'grid', 'sheets', 'drive'],
  'RevOps':             ['forecasting', 'attribution', 'intelligence', 'twin', 'signals', 'reports', 'datasync', 'objects', 'goals'],
  'Support':            ['tickets', 'kb', 'conversations', 'surveys', 'voice'],
  'Product':            ['objects', 'grid', 'surveys', 'signals', 'sheets'],
};

/* Goal -> modules that move that outcome. */
const GOAL_MODULES = {
  'grow pipeline':     ['leads', 'sequences', 'campaigns', 'funnels', 'ads', 'goals'],
  'forecast accuracy': ['forecasting', 'twin', 'intelligence', 'signals'],
  'faster onboarding': ['projects', 'success', 'kb'],
  'reduce churn':      ['success', 'signals', 'surveys', 'tickets'],
  'unify data':        ['datasync', 'objects', 'grid', 'drive', 'sheets'],
  'cut tool cost':     ['workflows', 'autopilot', 'dashboards', 'reports'],
};

/* Sales motion -> modules that fit how deals get won. */
const MOTION_MODULES = {
  'self-serve':   ['funnels', 'payments', 'invoices', 'products', 'journeys'],
  'inside sales': ['leads', 'sequences', 'conversations', 'voice'],
  'field':        ['deals', 'quotes', 'signatures', 'projects'],
  'hybrid':       ['leads', 'sequences', 'quotes', 'forecasting', 'payments'],
};

/* Which activated modules surface inside each layer's deck. master = all. */
const ROLE_AFFINITY = {
  exec:      ['dashboards', 'reports', 'forecasting', 'intelligence', 'goals', 'signals', 'twin'],
  manager:   ['deals', 'forecasting', 'goals', 'contacts', 'companies', 'quotes', 'reports'],
  sales:     ['deals', 'contacts', 'companies', 'quotes', 'goals', 'sequences'],
  sdr:       ['leads', 'sequences', 'contacts', 'conversations', 'goals'],
  marketing: ['campaigns', 'sequences', 'ads', 'social', 'funnels', 'markethub', 'attribution', 'journeys', 'reviews'],
  cs:        ['success', 'projects', 'surveys', 'signals', 'tickets', 'kb'],
  finance:   ['invoices', 'payments', 'products', 'quotes', 'reports'],
  ops:       ['workflows', 'autopilot', 'datasync', 'grid', 'sheets', 'drive', 'objects'],
  revops:    ['forecasting', 'attribution', 'intelligence', 'twin', 'signals', 'reports', 'datasync', 'objects', 'goals'],
  support:   ['tickets', 'kb', 'conversations', 'surveys', 'voice'],
};

/* ============================================================
   MODULE RECOMMENDATION  (deterministic mapping - hoisted)
   Departments + goals + sales motion drive which module keys switch
   on, and carry a human reason for the "why this is on" explanation.
   ============================================================ */
function motionLabel(m) {
  const map = { 'self-serve': 'Self-serve', 'inside sales': 'Inside sales', 'field': 'Field sales', 'hybrid': 'Hybrid' };
  return map[m] || 'Your';
}
function recommendModules(intake) {
  const depts = asArray(intake.departments);
  const goals = asArray(intake.goals);
  const motion = intake.salesMotion || 'hybrid';
  const reasons = new Map(); // key -> Set(reason)
  function add(key, reason) {
    if (!MODULE_CATALOG[key]) return;
    if (!reasons.has(key)) reasons.set(key, new Set());
    reasons.get(key).add(reason);
  }
  FOUNDATION.forEach(k => add(k, 'Core foundation'));
  for (const d of depts) (DEPT_MODULES[d] || []).forEach(k => add(k, `${d} team`));
  for (const g of goals) (GOAL_MODULES[g] || []).forEach(k => add(k, `Goal: ${g}`));
  (MOTION_MODULES[motion] || []).forEach(k => add(k, `${motionLabel(motion)} motion`));

  const order = Object.keys(MODULE_CATALOG);
  return [...reasons.entries()]
    .map(([key, set]) => ({
      key,
      label: moduleLabel(key),
      section: MODULE_CATALOG[key].section,
      reason: [...set].slice(0, 2).join(' + '),
      foundation: FOUNDATION.includes(key),
    }))
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

/* ============================================================
   METRICS  (deterministic, believable numbers per org - hoisted)
   Seeded off a hash of the company + its size so a given org always
   sees the same book, but two different orgs look genuinely different.
   ============================================================ */
function deriveMetrics(intake) {
  const seats = clampNum(intake.seats, 1, 200000) || 25;
  const headcount = clampNum(intake.headcount, seats, 400000) || seats * 3;
  const rnd = mulberry32(hashStr(`${titleOr(intake.companyName, 'rally')}:${seats}:${headcount}`));
  const between = (a, b) => a + rnd() * (b - a);
  const ri = (a, b) => Math.round(between(a, b));

  const salesReps = Math.max(4, Math.round(seats * between(0.28, 0.4)));
  const avgDeal = ri(18000, 72000);
  const dealsOpen = Math.max(12, Math.round(seats * between(1.2, 1.9)));
  const pipeline = dealsOpen * avgDeal;
  const winRate = ri(23, 37);
  const weighted = Math.round(pipeline * (winRate / 100) * between(1.05, 1.3));
  const arr = Math.round(pipeline * between(0.75, 1.1));
  const mrr = Math.round(arr / 12);
  const quotaAttain = ri(84, 108);
  const forecastAcc = ri(79, 93);
  const qoqGrowth = ri(7, 24);
  const nrr = ri(104, 124);
  const grossChurn = ri(4, 10);
  const healthGreen = ri(61, 80);
  const csat = ri(88, 96);
  const cycleDays = ri(34, 78);
  const rampDays = ri(28, 58);
  const coverageX = Number(between(2.6, 4.3).toFixed(1));

  const newLeads = Math.round(seats * between(5, 11));
  const mql = Math.round(newLeads * between(0.35, 0.55));
  const meetingsBooked = Math.round(seats * between(1.4, 2.6));
  const sequencesActive = Math.max(6, Math.round(seats * between(0.2, 0.4)));
  const emailsWk = Math.round(seats * between(120, 240));
  const connectRate = ri(9, 21);
  const activitiesWk = Math.round(seats * between(9, 16));
  const roas = Number(between(2.8, 6.4).toFixed(1));
  const pipelineSourced = Math.round(pipeline * between(0.22, 0.4));
  const attributionCov = ri(72, 94);
  const funnelConv = Number(between(1.8, 4.6).toFixed(1));

  const ar = Math.round(arr * between(0.07, 0.14));
  const invoicesOpen = Math.max(8, Math.round(seats * between(0.3, 0.6)));
  const dso = ri(28, 52);
  const collectedPct = ri(88, 97);
  const renewalsDue = Math.max(4, Math.round(seats * between(0.08, 0.16)));
  const expansionArr = Math.round(arr * between(0.06, 0.16));
  const onboardDays = ri(9, 24);

  const toolsCut = Math.max(1, asArray(intake.replacing).filter(t => t && t !== 'Nothing').length || ri(3, 6));
  const hoursSaved = Math.round(seats * between(0.6, 1.4));
  const workflowsLive = Math.max(6, Math.round(seats * between(0.15, 0.35)));
  const dataHealth = ri(86, 98);
  const recordsSynced = Math.round(headcount * between(180, 520));

  const ticketsOpen = Math.max(6, Math.round(seats * between(0.35, 0.75)));
  const firstResponseMin = ri(6, 34);
  const autoResolvePct = ri(38, 68);
  const backlog = Math.max(3, Math.round(ticketsOpen * between(0.4, 0.9)));

  const myPipeline = Math.round(pipeline / salesReps);
  const myQuota = quotaAttain;
  const myOpenDeals = Math.max(3, Math.round(dealsOpen / salesReps));

  return {
    seats, headcount, salesReps, avgDeal, dealsOpen, pipeline, winRate, weighted, arr, mrr,
    quotaAttain, forecastAcc, qoqGrowth, nrr, grossChurn, healthGreen, csat, cycleDays, rampDays, coverageX,
    newLeads, mql, meetingsBooked, sequencesActive, emailsWk, connectRate, activitiesWk, roas, pipelineSourced,
    attributionCov, funnelConv, ar, invoicesOpen, dso, collectedPct, renewalsDue, expansionArr, onboardDays,
    toolsCut, hoursSaved, workflowsLive, dataHealth, recordsSynced,
    ticketsOpen, firstResponseMin, autoResolvePct, backlog, myPipeline, myQuota, myOpenDeals,
  };
}

/* KPI factory - keeps the deck specs terse. format is a token the UI maps
   (money | moneyK | percent | number | days | mins | x | ratio). */
function kpi(label, value, format, hint, trendDir) {
  return { label, value, format: format || 'number', hint: hint || '', trendDir: trendDir || 'flat' };
}

/* A convenience formatter the UI agents may reuse so a KPI renders the same
   everywhere. Never throws; unknown formats fall back to a localized number. */
export function formatKpi(value, format) {
  if (value == null) return '-';
  const n = Number(value);
  switch (format) {
    case 'money':   return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : String(value);
    case 'moneyK':
      if (!Number.isFinite(n)) return String(value);
      if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
      if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
      return '$' + n;
    case 'percent': return Number.isFinite(n) ? `${n}%` : String(value);
    case 'days':    return Number.isFinite(n) ? `${n}d` : String(value);
    case 'mins':    return Number.isFinite(n) ? `${n}m` : String(value);
    case 'x':       return Number.isFinite(n) ? `${n}x` : String(value);
    case 'ratio':   return Number.isFinite(n) ? `${n}x` : String(value);
    default:        return Number.isFinite(n) ? n.toLocaleString() : String(value);
  }
}

/* ============================================================
   DECK BUILDERS  (one per layer - all hoisted)
   Each returns { headline, why, kpis, sections, nextActions, views }.
   buildDeck() wraps them with role meta + the scoped module list.
   ============================================================ */
function viewsFor(keys, activeSet) {
  return keys
    .filter(k => activeSet.has(k))
    .map(k => ({ label: moduleLabel(k), to: moduleRoute(k) }));
}
function scopedModules(roleKey, activeKeys) {
  if (roleKey === 'master') return activeKeys.slice();
  const aff = ROLE_AFFINITY[roleKey] || [];
  const set = new Set(activeKeys);
  return aff.filter(k => set.has(k));
}

function deckExec(name, m) {
  return {
    headline: `${name}, one number leadership can trust`,
    why: `This is the board view of ${name}. It rolls every rep, region, and product line into a single revenue picture, so you walk into any meeting knowing pipeline, forecast, and growth cold. No spreadsheet reconciliation - the number here is the number.`,
    kpis: [
      kpi('Annual recurring revenue', m.arr, 'moneyK', 'Live ARR across the book', 'up'),
      kpi('QoQ growth', m.qoqGrowth, 'percent', 'Quarter over quarter', 'up'),
      kpi('Weighted forecast', m.weighted, 'moneyK', 'Probability-adjusted pipeline', 'up'),
      kpi('Forecast accuracy', m.forecastAcc, 'percent', 'Called vs closed, trailing', 'up'),
      kpi('Net revenue retention', m.nrr, 'percent', 'Expansion minus churn', 'up'),
      kpi('Win rate', m.winRate, 'percent', 'Closed-won of closed', 'flat'),
    ],
    sections: [
      { title: 'The whole company on one screen', body: `Every layer below reports up into this deck. When a rep moves a deal or Finance books a payment, this number updates in real time.`, bullets: ['Revenue, forecast, and growth without a data pull', 'Drill from a headline straight into the deal that moved it', 'Rook briefs you in plain language before every board meeting'] },
      { title: 'Where the risk is', body: `Rally flags the deals and accounts most likely to move the number the wrong way, so your attention goes where it matters.`, bullets: ['Slipping deals surfaced before they slip', 'Churn signals on your largest accounts', 'Forecast gap to plan, updated nightly'] },
    ],
    nextActions: ['Set the company revenue target for the quarter', 'Assign each layer below an owner', 'Ask Rook for a one-paragraph board summary'],
  };
}
function deckManager(name, m) {
  return {
    headline: `Your team's pipeline, pacing, and pressure points`,
    why: `Built for the people who carry the number for a team. See every rep's book at a glance, catch the deals stuck in a stage too long, and know today whether the team is pacing to quota - not on the last day of the quarter.`,
    kpis: [
      kpi('Team pipeline', m.pipeline, 'moneyK', 'Open across the team', 'up'),
      kpi('Quota attainment', m.quotaAttain, 'percent', 'Team pace to target', 'up'),
      kpi('Open deals', m.dealsOpen, 'number', 'In flight now', 'flat'),
      kpi('Win rate', m.winRate, 'percent', 'Team closed-won rate', 'flat'),
      kpi('Activities / week', m.activitiesWk, 'number', 'Calls, emails, meetings', 'up'),
      kpi('Avg cycle', m.cycleDays, 'days', 'Lead to close', 'down'),
    ],
    sections: [
      { title: 'Coach from the deal, not the spreadsheet', body: `Every rep's pipeline is one click away, with the deals that need you flagged first.`, bullets: ['1:1s built from live pipeline, not stale notes', 'Deals idle past their stage SLA surfaced automatically', 'Forecast roll-up you can defend upward'] },
      { title: 'Pace, not panic', body: `Quota pacing updates daily so a slow week is a conversation, not a quarter-end surprise.`, bullets: ['Per-rep attainment vs plan', 'Coverage ratio against remaining quota', 'One-tap nudge to Rook to draft a deal-review agenda'] },
    ],
    nextActions: ['Review the three most-slipped deals with their owners', 'Confirm this quarter\'s team quota split', 'Schedule pipeline reviews from the live board'],
  };
}
function deckSales(name, m) {
  return {
    headline: `Just your deals, your day, your next move`,
    why: `A rep should never wonder what to do next. This deck is only your book - your pipeline, the deals that need attention today, and the actions Rally already teed up. Everything else in ${name} stays out of your way.`,
    kpis: [
      kpi('My pipeline', m.myPipeline, 'moneyK', 'Open deals you own', 'up'),
      kpi('Quota attainment', m.myQuota, 'percent', 'Your pace to target', 'up'),
      kpi('Open deals', m.myOpenDeals, 'number', 'Yours in flight', 'flat'),
      kpi('Meetings booked', Math.max(2, Math.round(m.meetingsBooked / m.salesReps)), 'number', 'This week', 'up'),
      kpi('Win rate', m.winRate, 'percent', 'Your close rate', 'flat'),
    ],
    sections: [
      { title: 'Your day, already planned', body: `Rally sorts your tasks by which deal they move most, so the first thing you touch is the highest-leverage one.`, bullets: ['Today\'s calls, emails, and follow-ups in priority order', 'Every deal shows its next best action', 'Log activity in one tap, from anywhere'] },
      { title: 'Close with the whole story', body: `Open any deal and see the full history - emails, calls, quotes, and the buying committee - without hunting.`, bullets: ['Contact and company context on every deal', 'Draft the follow-up with Rook', 'Send a quote without leaving the record'] },
    ],
    nextActions: ['Clear today\'s task queue', 'Advance your closest deal one stage', 'Ask Rook to draft your top follow-up email'],
  };
}
function deckSdr(name, m) {
  return {
    headline: `Fresh leads in, meetings out`,
    why: `The top of the funnel is a rhythm, and this deck keeps the beat. See new leads the moment they land, work the sequences that are converting, and watch meetings booked climb - the one number that matters for a pipeline builder.`,
    kpis: [
      kpi('New leads', m.newLeads, 'number', 'This month', 'up'),
      kpi('Meetings booked', m.meetingsBooked, 'number', 'This month', 'up'),
      kpi('Active sequences', m.sequencesActive, 'number', 'Running now', 'flat'),
      kpi('Emails / week', m.emailsWk, 'number', 'Sent across the team', 'up'),
      kpi('Connect rate', m.connectRate, 'percent', 'Replies per touch', 'up'),
    ],
    sections: [
      { title: 'Never guess who to call next', body: `Leads are scored and stack-ranked, so your first dial is your best dial.`, bullets: ['AI-scored inbound inbox', 'One-click convert to a qualified opportunity', 'Sequences pause the moment a lead replies'] },
      { title: 'A cadence that runs itself', body: `Multi-step email and task sequences keep every lead warm without you tracking a spreadsheet.`, bullets: ['Templated touches with personalization', 'Task reminders that route to your day', 'Rook drafts the opener from the lead\'s context'] },
    ],
    nextActions: ['Work today\'s top-scored leads', 'Enroll new leads into a sequence', 'Ask Rook to personalize your outreach opener'],
  };
}
function deckMarketing(name, m) {
  return {
    headline: `From campaign spend to pipeline sourced`,
    why: `Marketing finally gets to prove it. This deck ties every campaign, ad, and email to the pipeline it created, so you defend budget with sourced revenue - not impressions. See what is working and double down while it is still hot.`,
    kpis: [
      kpi('MQLs', m.mql, 'number', 'Marketing-qualified this month', 'up'),
      kpi('Pipeline sourced', m.pipelineSourced, 'moneyK', 'Attributed to marketing', 'up'),
      kpi('Blended ROAS', m.roas, 'x', 'Return on ad spend', 'up'),
      kpi('Attribution coverage', m.attributionCov, 'percent', 'Touches mapped to revenue', 'up'),
      kpi('Funnel conversion', m.funnelConv, 'percent', 'Visit to lead', 'up'),
    ],
    sections: [
      { title: 'Every touch, tied to revenue', body: `Multi-touch attribution connects the first click to the closed deal, so you know which channel actually pays.`, bullets: ['Sourced and influenced pipeline side by side', 'Channel and campaign ROI without a data team', 'Hand hot leads to sales the instant they qualify'] },
      { title: 'Launch, measure, repeat', body: `Campaigns, sequences, ads, and social live in one place with results that update live.`, bullets: ['Audience lists that sync from the CRM', 'Journey orchestration across channels', 'Rook drafts campaign copy on brand'] },
    ],
    nextActions: ['Double budget on your top-ROAS channel', 'Sync a new audience list to a campaign', 'Ask Rook for a campaign brief'],
  };
}
function deckCs(name, m) {
  return {
    headline: `Keep the base, grow the base`,
    why: `Retention is the quiet engine of ${name}. This deck puts health scores, upcoming renewals, and churn signals in front of your CSMs early enough to act - and shows how fast new customers get to value. Save one logo and this deck pays for the whole rollout.`,
    kpis: [
      kpi('Net revenue retention', m.nrr, 'percent', 'Expansion minus churn', 'up'),
      kpi('Gross churn', m.grossChurn, 'percent', 'Lost logos, trailing', 'down'),
      kpi('Accounts healthy', m.healthGreen, 'percent', 'Green health score', 'up'),
      kpi('Renewals due', m.renewalsDue, 'number', 'Next 90 days', 'flat'),
      kpi('CSAT', m.csat, 'percent', 'Post-interaction score', 'up'),
      kpi('Onboarding time', m.onboardDays, 'days', 'Signature to live', 'down'),
    ],
    sections: [
      { title: 'See churn before it happens', body: `Signals watch product usage, support load, and engagement to flag at-risk accounts weeks early.`, bullets: ['Health scores on every account', 'Renewal runway with owner and amount', 'Expansion signals surfaced for the reps'] },
      { title: 'Onboard faster, standardize the win', body: `Delivery projects turn every kickoff into a repeatable playbook so time-to-value keeps dropping.`, bullets: ['Onboarding projects with milestones', 'Surveys that trigger on lifecycle events', 'Rook drafts the QBR from account history'] },
    ],
    nextActions: ['Reach out to every red-health account this week', 'Confirm owners on the next renewal cohort', 'Ask Rook to draft a save play for an at-risk account'],
  };
}
function deckFinance(name, m) {
  return {
    headline: `Revenue that ties out, cash that collects`,
    why: `Finance was called out for a reason - the books have to be right. This deck derives revenue, MRR, and AR from the same source of truth the sales team works in, so quotes, invoices, and payments reconcile automatically. Close the month faster, chase cash sooner.`,
    kpis: [
      kpi('ARR', m.arr, 'moneyK', 'Recognized recurring revenue', 'up'),
      kpi('MRR', m.mrr, 'moneyK', 'Monthly recurring revenue', 'up'),
      kpi('AR outstanding', m.ar, 'moneyK', 'Owed to you now', 'down'),
      kpi('Open invoices', m.invoicesOpen, 'number', 'Awaiting payment', 'flat'),
      kpi('Days sales outstanding', m.dso, 'days', 'Average collection time', 'down'),
      kpi('Collected', m.collectedPct, 'percent', 'Of billed, trailing', 'up'),
    ],
    sections: [
      { title: 'One source, no reconciliation', body: `A deal, its quote, its invoice, and its payment are the same object - so revenue reports tie out with no manual matching.`, bullets: ['Quote to invoice to payment in one thread', 'AR aging by account and owner', 'MRR and ARR waterfalls that always agree'] },
      { title: 'Collect on time', body: `Payment links and automated reminders shorten the gap between billed and banked.`, bullets: ['Text-to-pay and payment links', 'Dunning reminders on overdue invoices', 'Rook drafts a polite collections note'] },
    ],
    nextActions: ['Send reminders on invoices past due', 'Reconcile this month\'s recognized revenue', 'Ask Rook to summarize AR aging'],
  };
}
function deckOps(name, m) {
  return {
    headline: `Automate the busywork, trust the data`,
    why: `Operations makes the whole thing run. This deck shows the automations doing the manual work for you, the hours that buys back, and whether the data underneath is clean. Every tool you consolidate into Rally is one less integration to babysit.`,
    kpis: [
      kpi('Hours saved / week', m.hoursSaved, 'number', 'Automation vs manual', 'up'),
      kpi('Workflows live', m.workflowsLive, 'number', 'Rules running now', 'up'),
      kpi('Tools consolidated', m.toolsCut, 'number', 'Replaced by Rally', 'up'),
      kpi('Data health', m.dataHealth, 'percent', 'Complete and de-duped', 'up'),
      kpi('Records synced', m.recordsSynced, 'number', 'Across the workspace', 'flat'),
    ],
    sections: [
      { title: 'The stack, consolidated', body: `Everything the team used to stitch together lives in one system, so there is one place to admin and one bill to pay.`, bullets: ['No-code workflows for routing and handoffs', 'Autopilot handles the repetitive SDR work', 'Two-way data sync with a health monitor'] },
      { title: 'Clean data, by default', body: `Duplicate detection, field validation, and sync health keep the source of truth actually true.`, bullets: ['Data health score with the gaps listed', 'Custom objects for anything Rally does not model', 'Rook builds a workflow from a plain-English rule'] },
    ],
    nextActions: ['Turn on routing for new inbound', 'Review the data-health gaps', 'Ask Rook to build a workflow from a rule'],
  };
}
function deckRevops(name, m) {
  return {
    headline: `The number, and the machine behind it`,
    why: `RevOps owns whether leadership can trust the forecast. This deck watches forecast accuracy, pipeline coverage, and data integrity together - the three things that make a call defensible. Model scenarios, tighten the funnel, and keep the whole revenue engine honest.`,
    kpis: [
      kpi('Forecast accuracy', m.forecastAcc, 'percent', 'Called vs closed', 'up'),
      kpi('Pipeline coverage', m.coverageX, 'x', 'Pipeline vs remaining quota', 'up'),
      kpi('Data health', m.dataHealth, 'percent', 'Fields complete', 'up'),
      kpi('Attribution coverage', m.attributionCov, 'percent', 'Revenue mapped to source', 'up'),
      kpi('Win rate', m.winRate, 'percent', 'Blended, org-wide', 'flat'),
      kpi('Avg cycle', m.cycleDays, 'days', 'Lead to close', 'down'),
    ],
    sections: [
      { title: 'A forecast you can defend', body: `Weighted roll-ups, a Monte Carlo revenue twin, and predictive signals turn the forecast from a gut call into a model.`, bullets: ['Scenario planning on live pipeline', 'Revenue twin ranges, not single points', 'Signals flag deals the model distrusts'] },
      { title: 'Keep the engine honest', body: `Attribution, data sync, and custom objects give you the full funnel from first touch to recognized revenue.`, bullets: ['End-to-end attribution coverage', 'Data-integrity checks on every stage', 'Rook models a what-if in seconds'] },
    ],
    nextActions: ['Reconcile the committed forecast to the model', 'Fix the lowest data-health objects', 'Ask Rook to run a downside scenario'],
  };
}
function deckSupport(name, m) {
  return {
    headline: `Answer faster, deflect more, keep them happy`,
    why: `Support is where reputation is won or lost. This deck keeps open tickets, response time, and CSAT in view, and shows how much the knowledge base is deflecting on its own. Every question the KB answers is one your team never has to.`,
    kpis: [
      kpi('Open tickets', m.ticketsOpen, 'number', 'In the queue now', 'down'),
      kpi('First response', m.firstResponseMin, 'mins', 'Average time to reply', 'down'),
      kpi('CSAT', m.csat, 'percent', 'Post-resolution score', 'up'),
      kpi('Auto-resolved', m.autoResolvePct, 'percent', 'Deflected by self-serve', 'up'),
      kpi('Backlog', m.backlog, 'number', 'Older than SLA', 'down'),
    ],
    sections: [
      { title: 'One queue, every channel', body: `Email, chat, and voice land in a single inbox, so nothing falls through and every reply has full context.`, bullets: ['Unified conversations across channels', 'Ticket history tied to the customer record', 'Voice AI handles the routine calls'] },
      { title: 'Let the docs do the work', body: `A self-serve knowledge base and surveys turn resolved tickets into content that deflects the next one.`, bullets: ['KB articles that answer before a ticket opens', 'CSAT and CES surveys on resolution', 'Rook drafts a KB article from a solved ticket'] },
    ],
    nextActions: ['Clear the tickets past SLA', 'Publish a KB article for the top question', 'Ask Rook to draft a reply for the oldest ticket'],
  };
}
function deckMaster(name, m, plan) {
  const layerNames = plan.decks.filter(d => d.role !== 'master').map(d => d.label);
  return {
    headline: `${name}, running on Rally end to end`,
    why: `This is the master view - the whole company in one place. Every layer below rolls up here, every module you activated is visible, and every person sees only the deck built for them. That is how a ${m.headcount}-person org stays transparent without drowning anyone in noise.`,
    kpis: [
      kpi('Pipeline', m.pipeline, 'moneyK', 'Open across the org', 'up'),
      kpi('Weighted forecast', m.weighted, 'moneyK', 'Probability-adjusted', 'up'),
      kpi('ARR', m.arr, 'moneyK', 'Recurring revenue', 'up'),
      kpi('Win rate', m.winRate, 'percent', 'Org-wide', 'flat'),
      kpi('Active modules', plan.activatedModules.length, 'number', 'Switched on for you', 'up'),
      kpi('Paid seats', m.seats, 'number', 'People with a login', 'flat'),
    ],
    sections: [
      { title: 'Every layer, one source of truth', body: `Liftoff generated ${layerNames.length} scoped decks so each team gets exactly its view: ${layerNames.join(', ')}.`, bullets: layerNames.map(n => `${n} deck - live and scoped`) },
      { title: 'The stack you turned on', body: `${plan.activatedModules.length} modules are active, mapped from your departments, goals, and how you sell.`, bullets: plan.activatedModules.slice(0, 8).map(mod => `${mod.label} - ${mod.reason}`) },
      { title: 'Rollout plan', body: `You asked to be live ${timelinePhrase(plan.company.timeline)}. Liftoff phases the spine first, then lights up each team's modules so nothing breaks.`, bullets: ['Core spine live on day one', 'Team modules activated in priority order', 'Rook available to every layer from the start'] },
    ],
    nextActions: [`Publish decks to all ${m.seats} seats`, 'Assign each layer an owner from your rollout team', 'Ask Rook to walk any team through their deck'],
  };
}

function timelinePhrase(t) {
  const map = { 'this week': 'this week', '30 days': 'within 30 days', 'this quarter': 'this quarter', 'phased': 'phased over six months' };
  return map[t] || 'soon';
}

function buildDeck(roleKey, name, m, activeKeys, plan) {
  const role = roleMeta(roleKey);
  const modules = scopedModules(roleKey, activeKeys);
  const activeSet = new Set(activeKeys);
  let spec;
  switch (roleKey) {
    case 'exec':      spec = deckExec(name, m); break;
    case 'manager':   spec = deckManager(name, m); break;
    case 'sales':     spec = deckSales(name, m); break;
    case 'sdr':       spec = deckSdr(name, m); break;
    case 'marketing': spec = deckMarketing(name, m); break;
    case 'cs':        spec = deckCs(name, m); break;
    case 'finance':   spec = deckFinance(name, m); break;
    case 'ops':       spec = deckOps(name, m); break;
    case 'revops':    spec = deckRevops(name, m); break;
    case 'support':   spec = deckSupport(name, m); break;
    default:          spec = deckMaster(name, m, plan); break;
  }
  const viewKeys = roleKey === 'master'
    ? ['dashboards', 'forecasting', 'intelligence', 'reports']
    : (ROLE_AFFINITY[roleKey] || []);
  const views = viewsFor(uniq(viewKeys), activeSet).slice(0, 5);
  return {
    role: roleKey,
    label: role ? role.label : roleKey,
    audience: role ? role.audience : '',
    accent: role ? role.accent : '#5b4bf5',
    headline: spec.headline,
    why: spec.why,
    kpis: spec.kpis,
    modules,
    views: views.length ? views : [{ label: 'Command center', to: '/' }],
    sections: spec.sections,
    nextActions: spec.nextActions,
  };
}

/* ============================================================
   generatePlan  (the deterministic engine - hoisted)
   intake -> { company, seats, activatedModules, decks, summary }
   Never throws on partial input; missing answers fall back to sane
   defaults so a half-finished intake still previews.
   ============================================================ */
export function generatePlan(intake = {}) {
  const safe = intake || {};
  const name = titleOr(safe.companyName, 'Your company');
  const m = deriveMetrics(safe);
  const activatedModules = recommendModules(safe);
  const activeKeys = activatedModules.map(a => a.key);

  const company = {
    name,
    industry: titleOr(safe.industry, 'SaaS'),
    headcount: m.headcount,
    seats: m.seats,
    sells: titleOr(safe.sells, 'its product'),
    salesMotion: safe.salesMotion || 'hybrid',
    timeline: safe.timeline || '30 days',
    replacing: asArray(safe.replacing).filter(Boolean),
    goals: asArray(safe.goals).filter(Boolean),
    departments: asArray(safe.departments).filter(Boolean),
    team: asArray(safe.team).filter(Boolean),
  };

  // Which layers get a deck: master always, plus the layers implied by the
  // chosen departments (mapped) - but never fewer than the core four.
  const deptToRole = {
    'Executive': 'exec', 'Sales': 'sales', 'SDR/BDR': 'sdr', 'Marketing': 'marketing',
    'Customer Success': 'cs', 'Finance/Accounting': 'finance', 'Operations': 'ops',
    'RevOps': 'revops', 'Support': 'support', 'Product': 'ops',
  };
  const roleSet = new Set(['master', 'exec', 'manager', 'sales']);
  for (const d of company.departments) if (deptToRole[d]) roleSet.add(deptToRole[d]);
  // If sales exists, a manager layer is implied; SDR implies sdr already handled.
  const orderedRoles = ROLES.map(r => r.key).filter(k => roleSet.has(k));

  const plan = {
    company,
    seats: m.seats,
    metrics: m,
    activatedModules,
    decks: [],
    summary: null,
    generatedAt: new Date().toISOString(),
    source: 'deterministic',
  };

  // Build role decks first, master last (master summarizes the others).
  for (const roleKey of orderedRoles.filter(k => k !== 'master')) {
    plan.decks.push(buildDeck(roleKey, name, m, activeKeys, plan));
  }
  const master = buildDeck('master', name, m, activeKeys, plan);
  plan.decks.unshift(master);

  plan.summary = {
    company: name,
    seats: m.seats,
    headcount: m.headcount,
    activeCount: activatedModules.length,
    deckCount: plan.decks.length,
    timeline: company.timeline,
    motion: company.salesMotion,
    topGoals: company.goals.slice(0, 3),
    replacing: company.replacing,
    headline: `${activatedModules.length} modules on, ${plan.decks.length} decks generated for ${m.seats} seats.`,
  };
  return plan;
}

/* ============================================================
   DEMO org  (a realistic 620-person B2B SaaS company) + its plan
   Pre-generated at module-eval so every surface is ALIVE on first
   load with zero input. Everything above is a hoisted function or a
   const declared before this point, so this call is TDZ-safe.
   ============================================================ */
export const DEMO_INTAKE = {
  companyName: 'Northwind Systems',
  industry: 'SaaS',
  headcount: 620,
  seats: 240,
  sells: 'A workforce analytics platform for mid-market operations teams',
  salesMotion: 'hybrid',
  departments: ['Executive', 'Sales', 'SDR/BDR', 'Marketing', 'Customer Success', 'Finance/Accounting', 'Operations', 'RevOps', 'Support'],
  replacing: ['Salesforce', 'Outreach', 'Gong', 'Zendesk', 'Marketo', 'Spreadsheets'],
  goals: ['grow pipeline', 'forecast accuracy', 'reduce churn', 'unify data'],
  timeline: '30 days',
  team: ['Exec sponsor', 'RevOps lead', 'Sales manager', 'Marketing ops', 'IT / Admin'],
};
export const DEMO_PLAN = generatePlan(DEMO_INTAKE);

/* ============================================================
   STORE  (local-first, pub/sub, localStorage) - mirrors store.js
   ============================================================ */
function freshState() {
  return { mode: 'welcome', intake: {}, plan: null, completedAt: null, seededAt: new Date().toISOString() };
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        mode: typeof p.mode === 'string' ? p.mode : 'welcome',
        intake: p.intake && typeof p.intake === 'object' ? p.intake : {},
        plan: p.plan && typeof p.plan === 'object' ? p.plan : null,
        completedAt: p.completedAt || null,
        seededAt: p.seededAt || new Date().toISOString(),
      };
    }
  } catch {}
  const s = freshState();
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  return s;
}

let state = loadState();
const subs = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => { try { fn(state); } catch {} });
}

/* ---------- writers ---------- */
export function saveAnswer(key, value) {
  if (!key) return state.intake;
  const intake = { ...state.intake, [key]: value };
  commit({ ...state, intake });
  return intake;
}
export function submitIntake() {
  const plan = generatePlan(state.intake);
  commit({ ...state, plan, mode: 'plan', completedAt: new Date().toISOString() });
  return plan;
}
export function resetLiftoff() {
  const s = freshState();
  commit(s);
  return s;
}
export function setMode(mode) {
  commit({ ...state, mode: typeof mode === 'string' ? mode : state.mode });
  return state.mode;
}

/* ---------- readers ---------- */
export function getMode() { return state.mode; }
export function getIntake() { return state.intake; }
export function getPlan() { return state.plan || DEMO_PLAN; }
export function isComplete() { return !!state.plan; }
export function isPreview() { return !state.plan; } // true when showing the demo plan
export function getDeck(role) {
  const plan = getPlan();
  return (plan.decks || []).find(d => d.role === role) || null;
}
export function getDecks() { return getPlan().decks || []; }
export function progress() {
  const answered = REQUIRED_STEPS.filter(k => {
    const v = state.intake[k];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== '';
  }).length;
  const total = REQUIRED_STEPS.length;
  return { answered, total, pct: total ? Math.round((answered / total) * 100) : 0 };
}

/* React hook - re-renders any subscriber on every mutation. */
export function useLiftoff(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}

/* ============================================================
   AI env-gate  (optional real generation, silent offline fallback)
   ============================================================ */
export function hasAiEnv() {
  try {
    const env = import.meta.env || {};
    return env.VITE_LIFTOFF_AI === 'true' || env.VITE_ROOK_PLAN === 'true' || env.VITE_AI_ENABLED === 'true';
  } catch { return false; }
}

/* Generate a plan with Rook when the env flag is set; otherwise return the
   deterministic plan. NEVER throws - any failure falls back silently so the
   wizard is fully functional offline. */
export async function generateWithRook(intake) {
  const fallback = () => generatePlan(intake);
  if (!hasAiEnv()) return fallback();
  try {
    const res = await fetch('/api/rook-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake }),
    });
    if (!res.ok) return fallback();
    const data = await res.json();
    if (data && Array.isArray(data.decks) && data.decks.length) {
      return { ...data, source: 'rook' };
    }
    return fallback();
  } catch {
    return fallback();
  }
}

/* ============================================================
   ROOK handoff  (dispatch the app-wide event RookDock listens for)
   ============================================================ */
export function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
