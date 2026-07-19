// ============================================================
// ARDOVO TRAINING ENGINE  (local-first, additive)
//
// Replaces the human implementation trainer. A role- and permission-based
// module library (from a 2026 best-practice curriculum), per-module completion
// tracking, manager-added custom modules, a "training mode" that turns Rook
// into a patient teacher that navigates and highlights the UI, and Zoom-style
// session archives (a concise summary up front, the full notes behind it).
//
// PERMISSION MODEL: a user must complete the module for any area they can use.
// Modules carry roles[] and (when permissionGated) a gateArea. We resolve a
// user's REQUIRED path from ROLE_TRACKS: rep -> AE track, manager -> manager
// track, plus the universal track everyone takes. Permission-gated modules are
// required only for users who hold the grant (managers hold all grants here).
//
// Local-first (localStorage rally_training_v1), store.js pub/sub shape.
// Internal keys stay rally_* by design. ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { getCurrentUser, getUsers, userName } from './store.js';

const LS_KEY = 'rally_training_v1';

export const ROLES = [
  { key: 'everyone', label: 'Everyone (universal onboarding)' },
  { key: 'sdr', label: 'SDR / BDR' },
  { key: 'ae', label: 'Account Executive' },
  { key: 'manager', label: 'Sales Manager / VP' },
  { key: 'csm', label: 'Customer Success' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'revops', label: 'RevOps / Admin' },
  { key: 'finance', label: 'Finance / Billing' },
  { key: 'support', label: 'Support / Service' },
  { key: 'exec', label: 'Executive' },
];

const S = (title, extra = {}) => ({ title, ...extra }); // step helper

/* ============================================================
   MODULE LIBRARY  (role-scoped, microlearning-sized, sequenced)
   step: { title, detail?, to?, ask?, highlight? }
   ============================================================ */
export const MODULES = [
  // ---------- Universal onboarding (everyone) ----------
  {
    id: 'u-command-spine', title: 'Navigating the command spine', area: 'Command Center', icon: 'home', minutes: 6, level: 'Start here', roles: ['everyone'],
    blurb: 'Get oriented on the home cockpit and the rail that connects every area of Ardovo.',
    steps: [
      S('Open the home cockpit and read the daily brief', { detail: 'The moves that matter today lead the screen. This is where every morning starts.', to: '/app' }),
      S('Walk the command spine', { detail: 'The icon rail on the left carries your primary destinations; hover for its drawer, or open Apps for the full catalog.', to: '/app', highlight: 'nav, .rl-rail' }),
      S('You navigate by command, not by URL', { detail: 'The spine plus Rook plus search get you anywhere in two keystrokes.' }),
    ],
  },
  {
    id: 'u-search-recents-pins', title: 'Search, recent pages, and pinning', area: 'Command Center', icon: 'search', minutes: 5, level: 'Start here', roles: ['everyone'],
    blurb: 'Move fast: global search, the recent-pages tray, and pinning the pages you live in.',
    steps: [
      S('Open search with Ctrl or Cmd + K', { detail: 'Jump to any contact, company, or deal by name.', highlight: '.topbar-search, [data-cmdk]' }),
      S('Reopen a recent page', { detail: 'Bottom-left keeps your last few pages so you can jump back.', highlight: '.rpd-tab, .rpd-panel' }),
      S('Pin the pages you live in', { detail: 'Pin a record or view so it anchors bottom-left - no more tab sprawl.', highlight: '.rpd-panel' }),
    ],
  },
  {
    id: 'u-ask-rook', title: 'Asking Rook', area: 'Rook', icon: 'sparkles', minutes: 6, level: 'Start here', roles: ['everyone'],
    blurb: 'Meet Rook, the AI operator: ask questions and hand off tasks with confirm-and-undo safety.',
    steps: [
      S('Open Rook and ask a question', { detail: 'Rook is docked bottom-right on every screen and knows your book cold.', ask: 'Which deals close this month?', highlight: '.rook-fab' }),
      S('Hand Rook a task', { detail: 'Ask it to create a contact or log a note; review the proposed action before it runs.', ask: 'Add a contact named Dana Lopez at Northwind Freight' }),
      S('Rook proposes, you approve', { detail: 'Nothing writes silently at default autonomy, and every write is reversible.' }),
    ],
  },
  {
    id: 'u-voice-mode', title: 'Voice mode', area: 'Rook', icon: 'mic', minutes: 5, level: 'Start here', roles: ['everyone'],
    blurb: 'Drive Ardovo hands-free between meetings and in the car.',
    steps: [
      S('Start voice mode from Rook', { detail: 'Hit the voice button and just talk - Rook listens, answers out loud, and can take you places or highlight things.', ask: 'Take me to the deals pipeline' }),
      S('Dictate a command and watch the transcript', { detail: 'Log a call outcome by voice and confirm Rook read it back right.' }),
      S('When to use voice vs typing', { detail: 'Voice for quick logging and navigation on the move; typing for bulk edits and precision.' }),
    ],
  },
  {
    id: 'u-my-day', title: 'My Day and activities', area: 'Activities', icon: 'activity', minutes: 6, level: 'Start here', roles: ['everyone'],
    blurb: 'Run your day from one queue: tasks, calls, emails, and reminders.',
    steps: [
      S('Open My Day and triage today', { detail: 'Due tasks and overdue items in one queue.', to: '/activities' }),
      S('Log a call, email, and note on a record', { to: '/activities' }),
      S('Complete, snooze, and reschedule a task'),
      S('Set a follow-up and confirm it lands back on My Day'),
    ],
  },
  {
    id: 'u-context-layer', title: 'The context layer', area: 'Context', icon: 'radar', minutes: 6, level: 'Core', roles: ['everyone'],
    blurb: "Ardovo's unified memory - the shared context that makes Rook and Atlas smart.",
    steps: [
      S("Open a record's context timeline", { detail: 'Email, calendar, and note history unified in one place.', to: '/contacts' }),
      S('Ask Rook about the record', { detail: 'Watch it cite the context it can see.', ask: 'Summarize my relationship with this account' }),
      S('Visibility and privacy', { detail: 'What the context layer stores and who can see it.' }),
    ],
  },

  // ---------- Core selling ----------
  {
    id: 'contacts-core', title: 'Working contacts', area: 'Contacts', icon: 'users', minutes: 8, level: 'Core', roles: ['sdr', 'ae', 'csm', 'marketing', 'support', 'revops'],
    blurb: 'Create, enrich, and organize people records without duplicates.',
    steps: [
      S('Create a new contact', { to: '/contacts' }),
      S('Dedupe and merge two duplicate contacts'),
      S('Build and save a filtered view'),
      S('Relate the contact to a company and log activity'),
    ],
  },
  {
    id: 'companies-core', title: 'Companies and accounts', area: 'Companies', icon: 'building', minutes: 7, level: 'Core', roles: ['sdr', 'ae', 'csm', 'revops', 'support'],
    blurb: 'Manage account records, hierarchies, and the people and deals attached.',
    steps: [
      S('Create or enrich a company record', { to: '/companies' }),
      S('Set a parent/child hierarchy for a multi-entity account'),
      S('Review associated contacts and deals from the company view'),
      S('Fill the account-plan fields (segment, owner, notes)'),
    ],
  },
  {
    id: 'leads-core', title: 'Leads and qualification', area: 'Leads', icon: 'funnel', minutes: 8, level: 'Core', roles: ['sdr', 'marketing', 'revops'],
    blurb: 'Work inbound and outbound leads, score them, and convert cleanly.',
    steps: [
      S('Create a lead and review the queue', { to: '/leads' }),
      S('Read the lead score and complete qualification fields'),
      S('Work a lead: contact attempt, disposition, next step'),
      S('Convert a qualified lead into contact, company, and deal'),
    ],
  },
  {
    id: 'deals-pipeline-core', title: 'Deals and the pipeline kanban', area: 'Deals', icon: 'target', minutes: 9, level: 'Core', roles: ['sdr', 'ae', 'manager', 'csm', 'revops'],
    blurb: 'Run opportunities on the board: create, move stages, keep them clean.',
    steps: [
      S('Open the pipeline board and create a deal', { to: '/deals' }),
      S('Drag a deal across stages and read the exit criteria'),
      S('Edit amount, close date, and next step'),
      S('Switch board/table views and filter by owner or stage'),
    ],
  },
  {
    id: 'deals-advanced', title: 'Deal execution and hygiene', area: 'Deals', icon: 'target', minutes: 8, level: 'Power up', roles: ['ae', 'manager'],
    blurb: 'Advance real deals: qualification depth, buying committee, risk, Rook nudges.',
    steps: [
      S('Keep next-step and close-date discipline', { detail: 'See why it drives the forecast.', to: '/deals' }),
      S('Fill qualification: pain, metrics, decision process, competition'),
      S('Assign contact roles (champion, economic buyer, blocker)'),
      S('Act on a Rook deal nudge', { ask: 'Which of my deals are stalled and missing a next step?' }),
    ],
  },
  {
    id: 'atlas-map', title: 'Atlas: deal map and win prediction', area: 'Atlas', icon: 'radar', minutes: 8, level: 'Power up', roles: ['ae', 'manager', 'revops', 'exec'],
    blurb: 'Read the semantic deal map and win-probability signals, and act before deals slip.',
    steps: [
      S('Open Atlas and read the deal map', { to: '/atlas' }),
      S('Interpret a win-probability score and its drivers', { to: '/atlas' }),
      S('Act on an at-risk signal (engagement drop, single-threaded)'),
      S('How Atlas prediction differs from a rep-entered category'),
    ],
  },
  {
    id: 'forecasting-rep', title: 'Forecasting for reps', area: 'Forecasting', icon: 'trendUp', minutes: 6, level: 'Core', roles: ['ae', 'csm'],
    blurb: 'Categorize your deals, roll up your number, submit an honest forecast.',
    steps: [
      S('Set each deal category: commit, best case, pipeline', { to: '/forecasting' }),
      S('Roll up your number and see the gap to quota'),
      S('Reconcile your commit against the Atlas prediction'),
      S('Submit your forecast for the period'),
    ],
  },
  {
    id: 'forecasting-manager', title: 'Forecasting, goals, and territories', area: 'Forecasting', icon: 'trendUp', minutes: 9, level: 'Power up', roles: ['manager', 'revops', 'exec'],
    blurb: 'Run the team roll-up, apply judgment, manage quotas and territories.',
    steps: [
      S('Review each rep submission in the roll-up', { to: '/forecasting' }),
      S('Apply a category override and record the reason'),
      S('Set quotas and goals for the team or a rep'),
      S('Review forecast accuracy vs actuals, then submit the team number'),
    ],
  },
  {
    id: 'quotes-core', title: 'Quotes and CPQ', area: 'Quotes', icon: 'receipt', minutes: 7, level: 'Core', roles: ['ae', 'revops', 'finance'],
    blurb: 'Turn a deal into a clean, approved, signable quote.',
    steps: [
      S('Build a quote from an existing deal', { to: '/quotes' }),
      S('Add products and line items, apply a discount', { ask: 'Build a quote from my largest open deal' }),
      S('Route the quote through approval'),
      S('Send for e-signature, then convert to an invoice'),
    ],
  },
  {
    id: 'sequences-core', title: 'Sequences and cadences', area: 'Sequences', icon: 'layers', minutes: 8, level: 'Core', roles: ['sdr', 'ae', 'csm', 'marketing'],
    blurb: 'Build and run multi-step outreach and read the engagement metrics.',
    steps: [
      S('Build a multi-step cadence (email, call, task)', { to: '/sequences' }),
      S('Add personalization tokens and an A/B variant'),
      S('Enroll contacts and set pause-on-reply rules'),
      S('Monitor reply, open, and completion metrics'),
    ],
  },
  {
    id: 'sales-admin-prequal', title: 'Pre-qualification and sales admin', area: 'Sales admin', icon: 'funnel', minutes: 7, level: 'Power up', roles: ['sdr', 'manager', 'revops'],
    blurb: 'Speed-to-lead, qualification framework, and clean SDR to AE handoffs.',
    steps: [
      S('Review the qualification framework and required pre-qual fields', { to: '/leads' }),
      S('Work a pre-qual queue and honor the speed-to-lead SLA'),
      S('Record a disqualification with a standardized reason'),
      S('Execute a clean handoff from SDR to AE'),
    ],
  },

  // ---------- Analytics + marketing ----------
  {
    id: 'reports-core', title: 'Building reports', area: 'Reports', icon: 'pie', minutes: 7, level: 'Core', roles: ['ae', 'manager', 'csm', 'marketing', 'revops', 'finance', 'exec', 'support'],
    blurb: 'Answer your own data questions: filter, group, save, share, drill in.',
    steps: [
      S('Build a report with filters, groups, and columns', { to: '/report-builder', ask: 'Build a report of open deals over 100k closing this quarter by owner' }),
      S('Save and share the report with your team', { to: '/reports' }),
      S('Schedule a recurring delivery'),
      S('Drill from a summary row into the records'),
    ],
  },
  {
    id: 'dashboards-core', title: 'Dashboards', area: 'Dashboards', icon: 'chart', minutes: 6, level: 'Core', roles: ['manager', 'revops', 'exec', 'marketing'],
    blurb: 'Assemble a role dashboard from reports and pin it for your team.',
    steps: [
      S('Assemble tiles from saved reports', { to: '/dashboards' }),
      S('Set global filters and a date range'),
      S('Share and pin the dashboard to the home cockpit'),
      S('Build a role view (leaderboard, funnel, or forecast)'),
    ],
  },
  {
    id: 'campaigns-core', title: 'Campaigns and attribution', area: 'Campaigns', icon: 'megaphone', minutes: 8, level: 'Core', roles: ['marketing', 'revops'],
    blurb: 'Run campaigns end to end and prove influence on pipeline.',
    steps: [
      S('Create a campaign with members, channel, and budget', { to: '/campaigns' }),
      S('Track engagement against the campaign'),
      S('Configure attribution so it ties to deals'),
      S('Measure ROI and push results to a dashboard'),
    ],
  },

  // ---------- Money (permission-gated) ----------
  {
    id: 'billing-core', title: 'Invoices and billing', area: 'Invoices', icon: 'dollar', minutes: 8, level: 'Core', roles: ['finance', 'revops'], permissionGated: true, gateArea: 'billing',
    blurb: 'Create invoices, collect payment, keep revenue clean.',
    steps: [
      S('Create an invoice from a quote or deal', { to: '/invoices' }),
      S('Set terms and taxes, send with a payment link'),
      S('Track payment status and remind on overdue'),
      S('Issue a refund or credit note'),
    ],
  },
  {
    id: 'products-catalog', title: 'Products and price books', area: 'Products', icon: 'box', minutes: 6, level: 'Power up', roles: ['revops', 'finance'], permissionGated: true, gateArea: 'products',
    blurb: 'Maintain the catalog that quotes and invoices draw from.',
    steps: [
      S('Add a product with SKU, description, and price', { to: '/products' }),
      S('Configure price books and currencies'),
      S('Create a bundle and a discount rule'),
      S('Deactivate an old product instead of deleting it'),
    ],
  },

  // ---------- Agents + automation ----------
  {
    id: 'rook-operator', title: 'Rook as operator (advanced)', area: 'Rook', icon: 'sparkles', minutes: 7, level: 'Power up', roles: ['sdr', 'ae', 'manager', 'csm', 'revops', 'support'],
    blurb: 'Move from asking Rook to delegating: multi-step tasks, autonomy, and audit.',
    steps: [
      S('Give Rook a multi-step task across records', { ask: 'Set up Northwind Freight as an enterprise account with a 180k deal and a first-call task Friday' }),
      S('Review the plan and audit trail before it runs'),
      S('Set the autonomy dial and understand reversibility'),
      S('Approve, then reverse an action and confirm the audit entry'),
    ],
  },
  {
    id: 'agent-cloud-core', title: 'Agent Cloud: autonomous agents', area: 'Agent Cloud', icon: 'sparkles', minutes: 9, level: 'Admin', roles: ['revops', 'manager', 'exec'], permissionGated: true, gateArea: 'agent_cloud',
    blurb: 'Deploy and govern autonomous agents that work pipeline while you sleep.',
    steps: [
      S('An autonomous agent vs a one-off Rook task', { to: '/agent-cloud' }),
      S('Deploy a starter agent with a defined scope'),
      S('Set autonomy, reversibility, and guardrails', { to: '/agent-cloud' }),
      S('Monitor runs and use the pause/kill switch'),
    ],
  },
  {
    id: 'cloud-agents-mcp', title: 'Cloud Agents, MCP, and headless', area: 'Cloud Agents', icon: 'command', minutes: 10, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'developer',
    blurb: 'Expose Ardovo to external agents and run it headless via MCP.',
    steps: [
      S('Headless/MCP access and when to use it vs the UI', { to: '/agent-api' }),
      S('Connect an MCP client and expose a scoped tool set'),
      S('Create a least-privilege auth token'),
      S('Run a headless job and read its audit trail'),
    ],
  },
  {
    id: 'automations-core', title: 'Automations and workflows', area: 'Automations', icon: 'workflow', minutes: 9, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'automations',
    blurb: 'Build trigger-condition-action workflows safely.',
    steps: [
      S('The trigger / condition / action model', { to: '/automations' }),
      S('Build a lead-routing or assignment workflow'),
      S('Dry-run in test mode before enabling'),
      S('Add error handling and review run logs'),
    ],
  },

  // ---------- Admin + setup (permission-gated) ----------
  {
    id: 'import-data', title: 'Importing data', area: 'Import', icon: 'download', minutes: 6, level: 'Core', roles: ['revops', 'marketing', 'sdr'], permissionGated: true, gateArea: 'import',
    blurb: 'Bring lists in cleanly with mapping, dedupe, and an error report.',
    steps: [
      S('Upload a CSV', { to: '/import' }),
      S('Map columns and set dedupe rules'),
      S('Validate and preview before committing'),
      S('Commit and review the skipped-row report'),
    ],
  },
  {
    id: 'migration-wizard', title: 'Migration wizard', area: 'Migration', icon: 'swap', minutes: 10, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'migration',
    blurb: 'Move a full org off Salesforce or HubSpot with mapping, dry-run, rollback.',
    steps: [
      S('Open the wizard and select the source', { to: '/migrate' }),
      S('Map objects and fields to Ardovo', { to: '/migrate' }),
      S('Run a dry-run and resolve validation errors'),
      S('Execute and verify record counts and relationships'),
    ],
  },
  {
    id: 'context-admin', title: 'Context layer administration', area: 'Context', icon: 'radar', minutes: 7, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'context_admin',
    blurb: 'Configure the sources and policies behind the context layer.',
    steps: [
      S('Connect inbox, calendar, and document sources', { to: '/context' }),
      S('Set visibility and retention policies'),
      S('Configure PII redaction rules'),
      S('How governed context feeds Rook without leaking data'),
    ],
  },
  {
    id: 'settings-core', title: 'Org settings and customization', area: 'Settings', icon: 'settings', minutes: 6, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'settings',
    blurb: 'Configure the org: branding, currencies, fields, and layouts.',
    steps: [
      S('Set org profile, branding, and business hours', { to: '/settings' }),
      S('Configure currencies and locale defaults'),
      S('Add a field and adjust a record layout'),
      S('Set notification defaults'),
    ],
  },
  {
    id: 'team-management', title: 'Team management', area: 'Team', icon: 'users', minutes: 6, level: 'Admin', roles: ['revops', 'manager'], permissionGated: true, gateArea: 'team',
    blurb: 'Invite, structure, and offboard users and manage seats.',
    steps: [
      S('Invite a new user', { to: '/team' }),
      S('Assign a role and a reporting manager'),
      S('Review seats and license usage', { to: '/dashboards' }),
      S('Offboard a departing user and reassign their records'),
    ],
  },
  {
    id: 'permissions-roles', title: 'Permissions and roles', area: 'Permissions', icon: 'lock', minutes: 8, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'permissions',
    blurb: 'Control who can see and do what, and the training-gating rule.',
    steps: [
      S('Review the role model and profiles', { to: '/permissions' }),
      S('Set object- and field-level security for a role'),
      S('Configure record sharing and visibility'),
      S('Granting an area also assigns its training module', { to: '/roles' }),
    ],
  },
  {
    id: 'integrations-core', title: 'Integrations', area: 'Integrations', icon: 'plug', minutes: 7, level: 'Admin', roles: ['revops'], permissionGated: true, gateArea: 'integrations',
    blurb: 'Connect email, calendar, chat, payments, and the warehouse.',
    steps: [
      S('Connect email and calendar', { to: '/integrations' }),
      S('Connect Slack or Teams for notifications'),
      S('Connect a payments provider or the warehouse'),
      S('Manage API keys and webhooks, confirm health'),
    ],
  },

  // ---------- Manager + leadership ----------
  {
    id: 'manager-adoption', title: 'Coaching and adoption visibility', area: 'Dashboards', icon: 'trendUp', minutes: 7, level: 'Power up', roles: ['manager', 'revops', 'exec'],
    blurb: 'Use Ardovo to coach: see training completion, competency, and adoption.',
    steps: [
      S('Open the adoption dashboard for your team', { to: '/dashboards' }),
      S('Review training completion and competency by rep'),
      S('Spot an at-risk rep from adoption plus Atlas signals'),
      S('Set team expectations for hygiene and Rook usage'),
    ],
  },
];

// Required order per role. Gated ids are required only with the matching grant.
export const ROLE_TRACKS = {
  everyone: ['u-command-spine', 'u-search-recents-pins', 'u-ask-rook', 'u-voice-mode', 'u-my-day', 'u-context-layer'],
  sdr: ['leads-core', 'contacts-core', 'companies-core', 'sequences-core', 'sales-admin-prequal', 'deals-pipeline-core', 'rook-operator', 'import-data'],
  ae: ['contacts-core', 'companies-core', 'deals-pipeline-core', 'deals-advanced', 'atlas-map', 'forecasting-rep', 'quotes-core', 'sequences-core', 'reports-core', 'rook-operator'],
  manager: ['deals-pipeline-core', 'deals-advanced', 'atlas-map', 'forecasting-manager', 'reports-core', 'dashboards-core', 'manager-adoption', 'sales-admin-prequal', 'rook-operator', 'team-management'],
  csm: ['contacts-core', 'companies-core', 'deals-pipeline-core', 'sequences-core', 'forecasting-rep', 'reports-core', 'rook-operator'],
  marketing: ['contacts-core', 'leads-core', 'campaigns-core', 'sequences-core', 'reports-core', 'dashboards-core', 'import-data'],
  revops: ['contacts-core', 'companies-core', 'deals-pipeline-core', 'atlas-map', 'forecasting-manager', 'reports-core', 'dashboards-core', 'sales-admin-prequal', 'rook-operator', 'automations-core', 'products-catalog', 'import-data', 'migration-wizard', 'context-admin', 'settings-core', 'team-management', 'permissions-roles', 'integrations-core', 'agent-cloud-core', 'cloud-agents-mcp'],
  finance: ['billing-core', 'products-catalog', 'quotes-core', 'reports-core'],
  support: ['contacts-core', 'companies-core', 'reports-core', 'rook-operator'],
  exec: ['dashboards-core', 'reports-core', 'forecasting-manager', 'atlas-map', 'manager-adoption', 'agent-cloud-core'],
};

// store role -> curriculum track
const TRACK_FOR = { manager: 'manager', rep: 'ae' };
// Managers hold all permission grants in this model; reps hold the base set.
function hasGrant(_gateArea, role) { return role === 'manager'; }

/* ============================================================
   PERSISTENCE + PUB/SUB
   state = { sessions[], active, progress{moduleId:{done[],completedAt}}, custom[] }
   ============================================================ */
function freshState() { return { sessions: [], active: null, progress: {}, custom: [], groups: [] }; }
function normalize(s) {
  return {
    sessions: Array.isArray(s?.sessions) ? s.sessions : [],
    active: s?.active || null,
    progress: (s && typeof s.progress === 'object' && s.progress) || {},
    custom: Array.isArray(s?.custom) ? s.custom : [],
    groups: Array.isArray(s?.groups) ? s.groups : [],
  };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  const seed = freshState();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
let state = load();
const subs = new Set();
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function getTraining() { return state; }
export function useTraining(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   MODULES: catalog, roles, completion
   ============================================================ */
export function allModules() { return [...MODULES, ...state.custom]; }
export function getModule(id) { return allModules().find(m => m.id === id) || null; }

export function currentRole() {
  const u = getCurrentUser();
  return u?.role === 'manager' ? 'manager' : (u?.role || 'rep');
}
export function isManager() { return currentRole() === 'manager'; }

// The user's REQUIRED path: universal track + their role track, gated modules
// only if they hold the grant, plus any custom modules assigned to them.
export function requiredFor(role = currentRole()) {
  const trackKey = TRACK_FOR[role] || 'ae';
  const ids = [...(ROLE_TRACKS.everyone || []), ...(ROLE_TRACKS[trackKey] || [])];
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = getModule(id);
    if (!m) continue;
    if (m.permissionGated && !hasGrant(m.gateArea, role)) continue;
    out.push(m);
  }
  for (const m of state.custom) {
    const roles = m.roles || ['all'];
    if (roles.includes('all') || roles.includes(role) || roles.includes(trackKey)) out.push(m);
  }
  return out;
}

export function moduleProgress(moduleId) {
  const m = getModule(moduleId);
  const total = m ? m.steps.length : 0;
  const p = state.progress[moduleId] || { done: [], completedAt: null };
  const done = Array.isArray(p.done) ? p.done.length : 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, completedAt: p.completedAt || null, complete: !!p.completedAt };
}
export function isModuleComplete(moduleId) { return !!(state.progress[moduleId] && state.progress[moduleId].completedAt); }

export function markStepDone(moduleId, stepIndex) {
  const m = getModule(moduleId);
  if (!m) return;
  const prev = state.progress[moduleId] || { done: [], completedAt: null };
  const done = prev.done.includes(stepIndex) ? prev.done : [...prev.done, stepIndex];
  const completedAt = done.length >= m.steps.length ? (prev.completedAt || new Date().toISOString()) : prev.completedAt;
  const newlyComplete = completedAt && !prev.completedAt;
  commit({ ...state, progress: { ...state.progress, [moduleId]: { done, completedAt } } });
  if (newlyComplete) syncModuleComplete(moduleId);
}
export function markModuleComplete(moduleId) {
  const m = getModule(moduleId);
  if (!m) return;
  const already = isModuleComplete(moduleId);
  commit({ ...state, progress: { ...state.progress, [moduleId]: { done: m.steps.map((_, i) => i), completedAt: new Date().toISOString() } } });
  if (!already) syncModuleComplete(moduleId);
}
export function resetModule(moduleId) {
  const { [moduleId]: _drop, ...rest } = state.progress;
  commit({ ...state, progress: rest });
}

export function completionStats(role = currentRole()) {
  const req = requiredFor(role);
  const done = req.filter(m => isModuleComplete(m.id)).length;
  return { required: req.length, done, pct: req.length ? Math.round((done / req.length) * 100) : 0 };
}

/* ---------- manager-added custom modules ---------- */
export function addCustomModule({ title, area = 'Custom', icon = 'book', minutes = 5, level = 'Core', roles = ['all'], blurb = '', steps = [] } = {}) {
  const mod = {
    id: newId('mod'), title: title || 'New module', area, icon, minutes: Number(minutes) || 5, level, roles,
    blurb, steps: steps.length ? steps : [{ title: 'Step one', detail: 'Describe what to learn.' }], custom: true,
  };
  commit({ ...state, custom: [mod, ...state.custom] });
  return mod;
}
export function removeCustomModule(id) {
  commit({ ...state, custom: state.custom.filter(m => m.id !== id) });
}

/* ============================================================
   SESSION LIFECYCLE (Zoom-style archive: concise + full notes)
   ============================================================ */
export function startSession(moduleId = null) {
  const u = getCurrentUser();
  const active = {
    id: newId('ts'), startedAt: new Date().toISOString(),
    userName: u?.name || 'You', userRole: currentRole(),
    moduleIds: moduleId ? [moduleId] : [], steps: [], asks: [],
  };
  commit({ ...state, active });
  return active;
}
export function isActive() { return !!state.active; }

export function logStep(moduleId, stepTitle) {
  if (!state.active) startSession(moduleId);
  const a = state.active || getTraining().active;
  const moduleIds = a.moduleIds.includes(moduleId) ? a.moduleIds : [...a.moduleIds, moduleId];
  const steps = [...a.steps, { moduleId, stepTitle, at: new Date().toISOString() }];
  commit({ ...state, active: { ...a, moduleIds, steps } });
}
export function logAsk(prompt) {
  if (!state.active) return;
  commit({ ...state, active: { ...state.active, asks: [...state.active.asks, { prompt, at: new Date().toISOString() }] } });
}

export function endSession() {
  const a = state.active;
  if (!a) return null;
  const ended = new Date();
  const durationMin = Math.max(1, Math.round((ended - new Date(a.startedAt)) / 60000));
  const modules = a.moduleIds.map(id => getModule(id)?.title || id);
  const session = {
    id: a.id, startedAt: a.startedAt, endedAt: ended.toISOString(), durationMin,
    userName: a.userName, userRole: a.userRole,
    moduleIds: a.moduleIds, stepsCompleted: a.steps.length, asks: a.asks.length,
    summary: buildSummary(modules, a.steps.length, durationMin, a.asks),
    notes: buildNotes(a, modules, durationMin),
    aiNotes: null,
  };
  commit({ sessions: [session, ...state.sessions], active: null });
  return session;
}
export function cancelSession() { commit({ ...state, active: null }); }
export function updateSession(id, patch) {
  commit({ ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, ...patch } : s) });
}

function buildSummary(modules, stepsCompleted, durationMin, asks) {
  const modText = modules.length ? `Covered ${modules.length} module${modules.length === 1 ? '' : 's'}: ${modules.join(', ')}.` : 'Freeform session.';
  const stepText = `${stepsCompleted} step${stepsCompleted === 1 ? '' : 's'} in ${durationMin} minute${durationMin === 1 ? '' : 's'}.`;
  const askText = asks.length ? ` Asked Rook ${asks.length} question${asks.length === 1 ? '' : 's'}.` : '';
  return `${modText} ${stepText}${askText}`;
}
function buildNotes(a, modules, durationMin) {
  const lines = [];
  lines.push(`Training session - ${a.userName} (${a.userRole}) - ${durationMin} min`);
  lines.push(`Modules: ${modules.join(', ') || 'none'}`);
  if (a.steps.length) {
    lines.push('', 'Walkthrough:');
    a.steps.forEach((s, i) => lines.push(`  ${i + 1}. [${getModule(s.moduleId)?.title || s.moduleId}] ${s.stepTitle}`));
  }
  if (a.asks.length) {
    lines.push('', 'Questions asked:');
    a.asks.forEach(q => lines.push(`  - "${q.prompt}"`));
  }
  return lines.join('\n');
}

export function trainingStats() {
  const s = state.sessions;
  return {
    sessions: s.length,
    minutes: s.reduce((a, x) => a + (x.durationMin || 0), 0),
    steps: s.reduce((a, x) => a + (x.stepsCompleted || 0), 0),
    modulesTouched: new Set(s.flatMap(x => x.moduleIds || [])).size,
  };
}

/* ============================================================
   TEAM ROSTER  (manager "who trained on what")
   The current user's numbers are real (from progress). Teammates get a
   deterministic seeded profile so the manager dashboard is populated in the
   local-first demo; a Supabase-backed /api/training-progress can replace the
   seed with live cross-user data when configured.
   ============================================================ */
function hashPct(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return 34 + (h % 63); }
function daysAgoIso(n) { return new Date(Date.now() - n * 86400000).toISOString(); }

// Live cross-user completions, hydrated from /api/training-progress (Supabase)
// when configured. Null until fetched; teammate numbers fall back to a seed.
let liveProgress = null; // array of { user_id, module_id, completed_at, ... }
function liveRowsFor(userId) { return liveProgress ? liveProgress.filter(r => r.user_id === userId) : null; }

// Fire-and-forget: record a completion to the shared backend so managers see
// real cross-user data. No-ops silently when the backend is not configured.
export function syncModuleComplete(moduleId) {
  const m = getModule(moduleId); const u = getCurrentUser();
  if (!m || !u) return;
  try {
    fetch('/api/training-progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, userName: u.name, role: currentRole(), moduleId, moduleTitle: m.title, completedAt: new Date().toISOString() }),
    }).catch(() => {});
  } catch {}
}

// Hook: pull the team's live completions once and re-render when they arrive.
export function useTeamProgress() {
  const [, bump] = useState(0);
  useEffect(() => {
    let ok = true;
    fetch('/api/training-progress').then(r => r.json()).then(d => {
      if (ok && d?.ok && Array.isArray(d.rows) && d.rows.length) { liveProgress = d.rows; bump(x => x + 1); }
    }).catch(() => {});
    return () => { ok = false; };
  }, []);
  return !!liveProgress;
}

export function teamRoster() {
  const me = getCurrentUser();
  const users = getUsers();
  return users.map(u => {
    const role = u.role === 'manager' ? 'manager' : 'rep';
    const req = requiredFor(role);
    const required = req.length;
    const reqIds = new Set(req.map(m => m.id));
    let doneCount, lastActiveAt;
    if (me && u.id === me.id) {
      doneCount = req.filter(m => isModuleComplete(m.id)).length;
      const last = state.sessions[0];
      lastActiveAt = last ? last.endedAt : (doneCount ? daysAgoIso(0) : null);
    } else {
      const rows = liveRowsFor(u.id);
      if (rows && rows.length) {
        doneCount = rows.filter(r => reqIds.has(r.module_id)).length;
        lastActiveAt = rows.map(r => r.completed_at).sort().slice(-1)[0] || null;
      } else {
        doneCount = Math.round((hashPct(u.id) / 100) * required);
        lastActiveAt = daysAgoIso((hashPct(u.id + 'x') % 21));
      }
    }
    const pct = required ? Math.round((doneCount / required) * 100) : 0;
    return {
      id: u.id, name: u.name, title: u.title, role,
      required, done: doneCount, pct,
      lastActiveAt, atRisk: pct < 50,
      isMe: !!(me && u.id === me.id),
    };
  });
}

export function teamStats() {
  const r = teamRoster();
  const n = r.length || 1;
  return {
    people: r.length,
    avgPct: Math.round(r.reduce((s, x) => s + x.pct, 0) / n),
    fullyTrained: r.filter(x => x.pct >= 100).length,
    atRisk: r.filter(x => x.atRisk).length,
  };
}

// Which required modules a member has completed. Real for me, live for
// teammates who have synced, seeded otherwise - drives the coverage matrix.
export function memberModuleStatus(userId) {
  const me = getCurrentUser();
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return [];
  const role = u.role === 'manager' ? 'manager' : 'rep';
  const req = requiredFor(role);
  if (me && u.id === me.id) return req.map(m => ({ id: m.id, title: m.title, area: m.area, complete: isModuleComplete(m.id) }));
  const rows = liveRowsFor(u.id);
  if (rows && rows.length) {
    const done = new Set(rows.map(r => r.module_id));
    return req.map(m => ({ id: m.id, title: m.title, area: m.area, complete: done.has(m.id) }));
  }
  const doneCount = Math.round((hashPct(u.id) / 100) * req.length);
  return req.map((m, i) => ({ id: m.id, title: m.title, area: m.area, complete: i < doneCount }));
}

/* ---------- certificate when the whole required path is done ---------- */
export function myCertificate() {
  const stats = completionStats();
  if (stats.required === 0 || stats.done < stats.required) return null;
  const u = getCurrentUser();
  return { name: u?.name || 'You', role: currentRole(), modules: stats.required, issuedAt: new Date().toISOString() };
}

/* ============================================================
   GROUP TRAINING SESSIONS (schedule, run, dictate, summarize)
   ============================================================ */
export function getGroups() { return state.groups; }
export function createGroup({ title, moduleIds = [], participants = [], scheduledAt = null } = {}) {
  const u = getCurrentUser();
  const g = {
    id: newId('grp'), title: title || 'Team training',
    moduleIds, participants, facilitator: u?.name || 'You',
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: 'scheduled', notes: [], transcript: '', summary: '', actionItems: [],
    attendance: [], createdAt: new Date().toISOString(),
  };
  commit({ ...state, groups: [g, ...state.groups] });
  return g;
}
export function updateGroup(id, patch) {
  commit({ ...state, groups: state.groups.map(g => g.id === id ? { ...g, ...patch } : g) });
  return state.groups.find(g => g.id === id) || null;
}
export function startGroup(id) { return updateGroup(id, { status: 'live', startedAt: new Date().toISOString() }); }
export function addGroupNote(id, text) {
  if (!text || !text.trim()) return;
  const g = state.groups.find(x => x.id === id); if (!g) return;
  const note = { text: text.trim(), at: new Date().toISOString(), by: getCurrentUser()?.name || 'You' };
  updateGroup(id, { notes: [...(g.notes || []), note] });
}
export function endGroup(id, { summary = '', actionItems = [] } = {}) {
  const g = state.groups.find(x => x.id === id); if (!g) return null;
  const transcript = (g.notes || []).map(n => `[${new Date(n.at).toLocaleTimeString()}] ${n.by}: ${n.text}`).join('\n');
  return updateGroup(id, {
    status: 'done', endedAt: new Date().toISOString(),
    transcript,
    summary: summary || `Group training "${g.title}" covered ${g.moduleIds.length} module(s) with ${g.participants.length} participant(s). ${g.notes?.length || 0} notes captured.`,
    actionItems,
  });
}
export function deleteGroup(id) { commit({ ...state, groups: state.groups.filter(g => g.id !== id) }); }
