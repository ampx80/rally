// OSMOSIS - just-in-time contextual micro-coaching.
//
// The product teaches itself as you explore: the first time you land on a
// feature you get one friendly, one-sentence smart tip with a "Show me"
// spotlight. No onboarding meeting, no tour to sit through. Everything here
// is local-first (localStorage + in-memory pub/sub) with zero dependencies,
// modeled on the same tiny store pattern as src/lib/theme.js.
//
// Public surface:
//   - TIPS, tipForPath, actionsForPath, routeKeyFor
//   - hasSeen / markSeen / resetSeen           (first-visit memory)
//   - markSessionShown / wasSessionShown       (max one tip per route/session)
//   - getEnabled / setEnabled / toggleEnabled / subscribeEnabled  (global off switch)
//   - getCurrentPath / subscribeRoute          (route detection without App.jsx)
//   - navigateTo / openRook / openSearch       (contextual action helpers)

const SEEN_KEY = 'ardova_osmosis_seen_v1';
const ENABLED_KEY = 'ardova_osmosis_enabled_v1';

// ---------------------------------------------------------------------------
// Enabled state (global "turn off tips" toggle) - pub/sub like theme.js.
// ---------------------------------------------------------------------------
const enabledSubs = new Set();
let enabled = readEnabled();

function readEnabled() {
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}
export function getEnabled() { return enabled; }
export function setEnabled(next) {
  enabled = !!next;
  try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0'); } catch {}
  enabledSubs.forEach(fn => { try { fn(enabled); } catch {} });
}
export function toggleEnabled() { setEnabled(!enabled); }
export function subscribeEnabled(fn) { enabledSubs.add(fn); return () => enabledSubs.delete(fn); }

// ---------------------------------------------------------------------------
// First-visit memory (persisted) + per-session guard (in-memory).
// ---------------------------------------------------------------------------
function readSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; }
}
function writeSeen(map) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch {}
}
export function hasSeen(key) { return !!readSeen()[key]; }
export function markSeen(key) { const m = readSeen(); m[key] = 1; writeSeen(m); }
export function resetSeen() { writeSeen({}); sessionShown.clear(); }

const sessionShown = new Set();
export function wasSessionShown(key) { return sessionShown.has(key); }
export function markSessionShown(key) { sessionShown.add(key); }

// ---------------------------------------------------------------------------
// Route detection without touching App.jsx.
//
// React Router drives navigation through the History API. We patch
// pushState / replaceState once so every SPA navigation emits a custom
// 'ardova:navigate' event, listen to 'popstate' for back/forward, and keep a
// lightweight interval as a belt-and-suspenders fallback. Consumers read the
// path from window.location.pathname.
// ---------------------------------------------------------------------------
const NAV_EVENT = 'ardova:navigate';
let watchInstalled = false;

function installRouteWatch() {
  if (watchInstalled || typeof window === 'undefined') return;
  watchInstalled = true;
  const fire = () => { try { window.dispatchEvent(new Event(NAV_EVENT)); } catch {} };
  const wrap = (name) => {
    const orig = history[name];
    if (typeof orig !== 'function' || orig.__osmosisWrapped) return;
    const patched = function (...args) {
      const r = orig.apply(this, args);
      fire();
      return r;
    };
    patched.__osmosisWrapped = true;
    try { history[name] = patched; } catch {}
  };
  wrap('pushState');
  wrap('replaceState');
}

export function getCurrentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

// Subscribe to route changes. Calls cb(pathname) whenever the path changes.
// Combines the patched history events, popstate, and an interval fallback.
export function subscribeRoute(cb) {
  if (typeof window === 'undefined') return () => {};
  installRouteWatch();
  let last = getCurrentPath();
  const check = () => {
    const now = getCurrentPath();
    if (now !== last) { last = now; try { cb(now); } catch {} }
  };
  window.addEventListener('popstate', check);
  window.addEventListener(NAV_EVENT, check);
  window.addEventListener('hashchange', check);
  const iv = setInterval(check, 500);
  return () => {
    window.removeEventListener('popstate', check);
    window.removeEventListener(NAV_EVENT, check);
    window.removeEventListener('hashchange', check);
    clearInterval(iv);
  };
}

// ---------------------------------------------------------------------------
// Contextual action helpers (used by "Show me" and the "?" popover).
// ---------------------------------------------------------------------------

// SPA navigate without useNavigate: push + notify React Router via popstate.
export function navigateTo(to) {
  if (typeof window === 'undefined' || !to) return;
  try {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new Event(NAV_EVENT));
    window.scrollTo(0, 0);
  } catch {}
}

// Rook is the app-wide AI surface; App.jsx listens for this event.
export function openRook() {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } })); } catch {}
}

// Trigger the global command palette by replaying its Cmd/Ctrl+K shortcut.
export function openSearch() {
  try {
    const mac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, ctrlKey: !mac, metaKey: mac }));
  } catch {}
}

// ---------------------------------------------------------------------------
// The curated tip map, keyed by route prefix. Longest prefix wins so
// '/deals/:id' still resolves to the '/deals' family.
//
// Each entry:
//   title  - short feature name for the bubble header
//   tip    - ONE crisp, genuinely useful sentence
//   spot   - ordered selector candidates for the "Show me" spotlight; the
//            first element that exists on the page is highlighted
//   spotLabel - short caption shown on the spotlight
//   actions   - up to 3 contextual moves for the "?" popover:
//       kind 'spot' (+ sel, label), 'nav' (+ to, label), 'rook', 'cmdk'
//
// Selectors lean on the stable product chrome (the route-aware primary CTA in
// the topbar, the page H1, the icon spine, the Ask Rook chip) so a tip never
// points at nothing. Page-specific selectors are listed first with chrome as
// the reliable fallback.
// ---------------------------------------------------------------------------
const CTA = '.rl-topbar .btn.btn-primary';
const H1 = '.page-h1';
const FIRST_CARD = '.rl-content .card';
const SPINE = '.spine-nav';
const ROOK = '.ask-rook-chip';

export const TIPS = {
  '/app': {
    title: 'Command Center',
    tip: 'This is your home base: every number here is a live shortcut, so click a stat to jump straight into the records behind it.',
    spot: [H1, FIRST_CARD], spotLabel: 'Your daily briefing lives here',
    actions: [
      { kind: 'rook', label: 'Ask Rook what needs attention today' },
      { kind: 'nav', to: '/forecasting', label: 'See the forecast' },
      { kind: 'nav', to: '/activities', label: 'Open my day' },
    ],
  },
  '/deals': {
    title: 'Deals pipeline',
    tip: 'Drag a deal between stage columns to update it instantly, or hit the top-right button to add a new one.',
    spot: [CTA, '.kanban', H1], spotLabel: 'Add a deal here',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add a deal' },
      { kind: 'nav', to: '/forecasting', label: 'Roll it up in the forecast' },
      { kind: 'rook', label: 'Ask Rook which deals are at risk' },
    ],
  },
  '/leads': {
    title: 'Leads',
    tip: 'New and unworked leads land here first; qualify the hot ones and they graduate into deals.',
    spot: [CTA, H1], spotLabel: 'Capture a lead',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add a lead' },
      { kind: 'nav', to: '/deals', label: 'See the pipeline' },
      { kind: 'nav', to: '/qualify', label: 'Tune qualification rules' },
    ],
  },
  '/contacts': {
    title: 'Contacts',
    tip: 'Every person you work with lives here; open a contact to see their full timeline of emails, calls, and deals.',
    spot: [CTA, H1], spotLabel: 'Add a contact',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add a contact' },
      { kind: 'nav', to: '/companies', label: 'Jump to companies' },
      { kind: 'cmdk', label: 'Search for a specific person' },
    ],
  },
  '/companies': {
    title: 'Companies',
    tip: 'Companies group all their contacts and deals in one place, so open one to see the whole account at a glance.',
    spot: [CTA, H1], spotLabel: 'Add a company',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add a company' },
      { kind: 'nav', to: '/contacts', label: 'Jump to contacts' },
      { kind: 'rook', label: 'Ask Rook to summarize an account' },
    ],
  },
  '/activities': {
    title: 'My day',
    tip: 'This is your prioritized to-do list of calls, emails, and meetings; clear the top item first and work down.',
    spot: [CTA, H1], spotLabel: 'Log or book from here',
    actions: [
      { kind: 'nav', to: '/inbox', label: 'Open the inbox' },
      { kind: 'rook', label: 'Ask Rook to plan my day' },
      { kind: 'nav', to: '/deals', label: 'Back to the pipeline' },
    ],
  },
  '/forecasting': {
    title: 'Forecasting',
    tip: 'Adjust each deal category and Ardovo re-rolls the number in real time, so you can pressure-test the quarter before commit.',
    spot: [H1, FIRST_CARD], spotLabel: 'Your live forecast',
    actions: [
      { kind: 'rook', label: 'Ask Rook if the quarter will land' },
      { kind: 'nav', to: '/deals', label: 'See the deals behind it' },
      { kind: 'nav', to: '/reports', label: 'Build a report' },
    ],
  },
  '/campaigns': {
    title: 'Campaigns',
    tip: 'Build a campaign once, pick your audience, and Ardovo tracks opens, clicks, and pipeline sourced back to it.',
    spot: [CTA, H1], spotLabel: 'Launch a campaign',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to start a campaign' },
      { kind: 'nav', to: '/sequences', label: 'Set up a sequence' },
      { kind: 'nav', to: '/lists', label: 'Manage audiences' },
    ],
  },
  '/sequences': {
    title: 'Sequences',
    tip: 'Sequences send a timed series of touches automatically and pause the moment a prospect replies.',
    spot: [CTA, H1], spotLabel: 'Create a sequence',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to build one' },
      { kind: 'nav', to: '/campaigns', label: 'See campaigns' },
      { kind: 'nav', to: '/automations', label: 'Open automations' },
    ],
  },
  '/automations': {
    title: 'Marketing automations',
    tip: 'Set a trigger and the actions that follow, and this runs your busywork 24/7 without you lifting a finger.',
    spot: [CTA, H1], spotLabel: 'Add an automation',
    actions: [
      { kind: 'nav', to: '/flow', label: 'Open the visual builder' },
      { kind: 'nav', to: '/journeys', label: 'See journeys' },
      { kind: 'rook', label: 'Ask Rook to draft an automation' },
    ],
  },
  '/workflows': {
    title: 'Workflows',
    tip: 'Workflows automate what happens inside your CRM: when this changes, do that, no code required.',
    spot: [CTA, H1], spotLabel: 'Build a workflow',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add one' },
      { kind: 'nav', to: '/workflows/library', label: 'Browse templates' },
      { kind: 'nav', to: '/flow', label: 'Open the flow builder' },
    ],
  },
  '/reports': {
    title: 'Reports',
    tip: 'Start from a template or a blank canvas; every report is drillable, so click a bar to see the records inside it.',
    spot: [CTA, H1], spotLabel: 'Create a report',
    actions: [
      { kind: 'nav', to: '/report-builder', label: 'Open the report builder' },
      { kind: 'nav', to: '/dashboards', label: 'Pin it to a dashboard' },
      { kind: 'rook', label: 'Ask Rook to build a report' },
    ],
  },
  '/dashboards': {
    title: 'Dashboards',
    tip: 'Dashboards pin your most-watched reports side by side and refresh live, so the whole team sees one truth.',
    spot: [CTA, H1], spotLabel: 'New dashboard',
    actions: [
      { kind: 'nav', to: '/reports', label: 'Add a report first' },
      { kind: 'nav', to: '/intelligence', label: 'See AI intelligence' },
      { kind: 'rook', label: 'Ask Rook for the headline' },
    ],
  },
  '/forms': {
    title: 'Forms',
    tip: 'Design a form, share its link, and every submission creates or updates a contact in Ardovo automatically.',
    spot: [CTA, H1], spotLabel: 'Build a form',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to build a form' },
      { kind: 'nav', to: '/landing-pages', label: 'Pair it with a landing page' },
      { kind: 'nav', to: '/lists', label: 'Route entries to a list' },
    ],
  },
  '/landing-pages': {
    title: 'Landing pages',
    tip: 'Spin up a hosted page in minutes, drop a form on it, and start capturing leads with no developer needed.',
    spot: [CTA, H1], spotLabel: 'Create a page',
    actions: [
      { kind: 'nav', to: '/forms', label: 'Add a form' },
      { kind: 'nav', to: '/campaigns', label: 'Drive traffic with a campaign' },
      { kind: 'rook', label: 'Ask Rook for page copy' },
    ],
  },
  '/payments': {
    title: 'Payments',
    tip: 'Send a text-to-pay link and get paid on the spot; every payment reconciles against its invoice for you.',
    spot: [CTA, H1], spotLabel: 'Take a payment',
    actions: [
      { kind: 'nav', to: '/invoices', label: 'See invoices' },
      { kind: 'nav', to: '/quotes', label: 'Start from a quote' },
      { kind: 'rook', label: 'Ask Rook what is unpaid' },
    ],
  },
  '/invoices': {
    title: 'Billing',
    tip: 'Generate an invoice from a deal or quote and send it in a click; overdue ones surface at the top automatically.',
    spot: [CTA, H1], spotLabel: 'New invoice',
    actions: [
      { kind: 'nav', to: '/payments', label: 'Collect a payment' },
      { kind: 'nav', to: '/quotes', label: 'Turn a quote into an invoice' },
      { kind: 'rook', label: 'Ask Rook about aging receivables' },
    ],
  },
  '/quotes': {
    title: 'Quotes',
    tip: 'Assemble a quote from your product catalog, send it for e-signature, and convert it to an invoice when it is won.',
    spot: [CTA, H1], spotLabel: 'Build a quote',
    actions: [
      { kind: 'nav', to: '/products', label: 'Manage the catalog' },
      { kind: 'nav', to: '/signatures', label: 'Send for signature' },
      { kind: 'nav', to: '/invoices', label: 'Convert to invoice' },
    ],
  },
  '/products': {
    title: 'Products',
    tip: 'Your price book lives here; anything you add becomes a line item you can drop into quotes and deals.',
    spot: [CTA, H1], spotLabel: 'Add a product',
    actions: [
      { kind: 'spot', sel: [CTA], label: 'Show me how to add a product' },
      { kind: 'nav', to: '/quotes', label: 'Use it in a quote' },
      { kind: 'nav', to: '/invoices', label: 'Bill for it' },
    ],
  },
  '/inbox': {
    title: 'Inbox',
    tip: 'Every email, DM, and reply threads next to the matching contact here, so nothing falls through the cracks.',
    spot: [CTA, H1], spotLabel: 'Compose from here',
    actions: [
      { kind: 'nav', to: '/conversations', label: 'Open all conversations' },
      { kind: 'nav', to: '/activities', label: 'See my day' },
      { kind: 'rook', label: 'Ask Rook to draft a reply' },
    ],
  },
  '/conversations': {
    title: 'Conversations',
    tip: 'This is your omni-channel inbox: email, SMS, chat, and social land in one thread per person.',
    spot: [H1, CTA], spotLabel: 'Unified conversations',
    actions: [
      { kind: 'nav', to: '/inbox', label: 'Open the email inbox' },
      { kind: 'nav', to: '/voice', label: 'See Voice AI' },
      { kind: 'rook', label: 'Ask Rook to summarize a thread' },
    ],
  },
  '/voice': {
    title: 'Voice AI',
    tip: 'Rook can place and take calls for you, transcribe them, and log the outcome straight onto the record.',
    spot: [H1, CTA], spotLabel: 'Voice AI hub',
    actions: [
      { kind: 'rook', label: 'Ask Rook to make a call' },
      { kind: 'nav', to: '/conversations', label: 'See conversations' },
      { kind: 'nav', to: '/activities', label: 'Review logged calls' },
    ],
  },
  '/agent-cloud': {
    title: 'Agent Cloud',
    tip: 'This is mission control for your AI agents: see what each one is doing, pause it, or hand it a new job.',
    spot: [H1, FIRST_CARD], spotLabel: 'Your agent fleet',
    actions: [
      { kind: 'nav', to: '/agent-studio', label: 'Build an agent' },
      { kind: 'nav', to: '/cloud-agents', label: 'See running agents' },
      { kind: 'rook', label: 'Ask Rook to assign a task' },
    ],
  },
  '/agent-studio': {
    title: 'Agent Studio',
    tip: 'Compose a custom agent step by step here: give it a goal, tools, and guardrails, then deploy it to the cloud.',
    spot: [CTA, H1], spotLabel: 'Design an agent',
    actions: [
      { kind: 'nav', to: '/agent-cloud', label: 'See the fleet' },
      { kind: 'nav', to: '/agent-evals', label: 'Test it in evals' },
      { kind: 'nav', to: '/agent-api', label: 'Wire up the API' },
    ],
  },
  '/handshake': {
    title: 'Handshake',
    tip: 'This is the agent-to-agent deal room: the buyer\'s AI negotiates terms with yours, and you approve the outcome.',
    spot: [H1, FIRST_CARD], spotLabel: 'Agent negotiation room',
    actions: [
      { kind: 'rook', label: 'Ask Rook to open a negotiation' },
      { kind: 'nav', to: '/deals', label: 'See the underlying deal' },
      { kind: 'nav', to: '/boardroom', label: 'Take it to the Boardroom' },
    ],
  },
  '/boardroom': {
    title: 'The Boardroom',
    tip: 'An autonomous revenue council debates your real book and files a decision memo, so you get a board-level read in seconds.',
    spot: [H1, FIRST_CARD], spotLabel: 'Autonomous revenue council',
    actions: [
      { kind: 'rook', label: 'Ask Rook to convene the board' },
      { kind: 'nav', to: '/forecasting', label: 'See the forecast it debates' },
      { kind: 'nav', to: '/signals', label: 'Check the signals' },
    ],
  },
  '/intelligence': {
    title: 'Intelligence',
    tip: 'Ardovo surfaces the patterns you would miss: risk, momentum, and next-best actions across the whole book.',
    spot: [H1, FIRST_CARD], spotLabel: 'AI intelligence feed',
    actions: [
      { kind: 'rook', label: 'Ask Rook what changed this week' },
      { kind: 'nav', to: '/signals', label: 'See predictive signals' },
      { kind: 'nav', to: '/dashboards', label: 'Pin an insight' },
    ],
  },
  '/signals': {
    title: 'Signals',
    tip: 'Predictive signals flag which accounts are heating up or cooling off before it shows in the numbers.',
    spot: [H1, FIRST_CARD], spotLabel: 'Predictive signals',
    actions: [
      { kind: 'nav', to: '/intelligence', label: 'Open intelligence' },
      { kind: 'nav', to: '/deals', label: 'Act on a hot deal' },
      { kind: 'rook', label: 'Ask Rook what to do next' },
    ],
  },
  '/twin': {
    title: 'Revenue Twin',
    tip: 'Your digital twin simulates the quarter under different plays, so you can test a decision before you make it.',
    spot: [H1, FIRST_CARD], spotLabel: 'Simulate the quarter',
    actions: [
      { kind: 'nav', to: '/forecasting', label: 'Compare to the forecast' },
      { kind: 'rook', label: 'Ask Rook to run a scenario' },
      { kind: 'nav', to: '/wind-tunnel', label: 'Stress-test in Wind Tunnel' },
    ],
  },
  '/atlas': {
    title: 'Atlas',
    tip: 'Atlas maps your whole revenue landscape in one view so you can spot white space and coverage gaps.',
    spot: [H1, FIRST_CARD], spotLabel: 'Your revenue map',
    actions: [
      { kind: 'nav', to: '/territories', label: 'Manage territories' },
      { kind: 'nav', to: '/signals', label: 'Overlay signals' },
      { kind: 'rook', label: 'Ask Rook where the gaps are' },
    ],
  },
  '/flow': {
    title: 'Flow builder',
    tip: 'Drag nodes onto the canvas and connect them to design any automation visually, no code needed.',
    spot: [H1, FIRST_CARD], spotLabel: 'Visual flow canvas',
    actions: [
      { kind: 'nav', to: '/workflows', label: 'See saved workflows' },
      { kind: 'nav', to: '/automations', label: 'Open marketing automations' },
      { kind: 'rook', label: 'Ask Rook to sketch a flow' },
    ],
  },
  '/journeys': {
    title: 'Journeys',
    tip: 'Journeys orchestrate a customer\'s whole path across channels, branching on how each person responds.',
    spot: [CTA, H1], spotLabel: 'Build a journey',
    actions: [
      { kind: 'nav', to: '/automations', label: 'See automations' },
      { kind: 'nav', to: '/campaigns', label: 'Feed it from a campaign' },
      { kind: 'rook', label: 'Ask Rook to map a journey' },
    ],
  },
  '/goals': {
    title: 'Goals',
    tip: 'Set a target and Ardovo tracks pace against it live, flagging early whether you are ahead or behind.',
    spot: [CTA, H1], spotLabel: 'Set a goal',
    actions: [
      { kind: 'nav', to: '/forecasting', label: 'Compare to the forecast' },
      { kind: 'nav', to: '/dashboards', label: 'Watch it on a dashboard' },
      { kind: 'rook', label: 'Ask Rook if I will hit it' },
    ],
  },
  '/team': {
    title: 'Team',
    tip: 'Invite teammates and set what each can see and do; roles keep the right data in the right hands.',
    spot: [CTA, H1], spotLabel: 'Invite a teammate',
    actions: [
      { kind: 'nav', to: '/roles', label: 'Configure roles' },
      { kind: 'nav', to: '/permissions', label: 'Set permissions' },
      { kind: 'nav', to: '/goals', label: 'Assign goals' },
    ],
  },
  '/settings': {
    title: 'Settings',
    tip: 'This is where you shape Ardovo to your process: fields, pipelines, branding, and the modules you want on.',
    spot: [H1, FIRST_CARD], spotLabel: 'Tune your workspace',
    actions: [
      { kind: 'nav', to: '/app-manager', label: 'Turn modules on or off' },
      { kind: 'nav', to: '/integrations', label: 'Connect your tools' },
      { kind: 'nav', to: '/team', label: 'Manage the team' },
    ],
  },
  '/integrations': {
    title: 'Integrations',
    tip: 'Connect your email, calendar, and stack in a click so Ardovo becomes the single source of truth.',
    spot: [H1, FIRST_CARD], spotLabel: 'Connect an app',
    actions: [
      { kind: 'nav', to: '/datasync', label: 'Manage data sync' },
      { kind: 'nav', to: '/developers', label: 'Use the API' },
      { kind: 'nav', to: '/settings', label: 'Back to settings' },
    ],
  },
  '/workspaces': {
    title: 'Workspaces',
    tip: 'Run multiple brands or clients side by side; each workspace is fully isolated with its own data and team.',
    spot: [CTA, H1], spotLabel: 'Add a workspace',
    actions: [
      { kind: 'nav', to: '/team', label: 'Manage the team' },
      { kind: 'nav', to: '/roles', label: 'Set roles' },
      { kind: 'rook', label: 'Ask Rook to compare workspaces' },
    ],
  },
  '/playbooks': {
    title: 'Playbooks',
    tip: 'Codify your winning motion into a repeatable playbook so every rep runs the same proven steps.',
    spot: [CTA, H1], spotLabel: 'Create a playbook',
    actions: [
      { kind: 'nav', to: '/deals', label: 'Apply it to a deal' },
      { kind: 'nav', to: '/sequences', label: 'Pair it with a sequence' },
      { kind: 'rook', label: 'Ask Rook to draft a playbook' },
    ],
  },
  '/warroom': {
    title: 'War Room',
    tip: 'The War Room puts your must-win deals under one lens with risks, stakeholders, and next moves in view.',
    spot: [H1, FIRST_CARD], spotLabel: 'Deal cockpit',
    actions: [
      { kind: 'nav', to: '/deals', label: 'See all deals' },
      { kind: 'nav', to: '/handshake', label: 'Open a negotiation' },
      { kind: 'rook', label: 'Ask Rook for the win plan' },
    ],
  },
  '/genesis': {
    title: 'Genesis',
    tip: 'Describe your business in plain language and Genesis generates your pipeline, fields, and automations for you.',
    spot: [H1, FIRST_CARD], spotLabel: 'Generative setup',
    actions: [
      { kind: 'rook', label: 'Ask Rook to set me up' },
      { kind: 'nav', to: '/liftoff', label: 'Run the Liftoff wizard' },
      { kind: 'nav', to: '/settings', label: 'Fine-tune settings' },
    ],
  },
  '/liftoff': {
    title: 'Liftoff',
    tip: 'A guided intake turns your answers into activated modules plus a tailored deck for every role on the team.',
    spot: [H1, FIRST_CARD], spotLabel: 'Onboarding wizard',
    actions: [
      { kind: 'nav', to: '/genesis', label: 'Generate a workspace' },
      { kind: 'nav', to: '/academy', label: 'Learn in the Academy' },
      { kind: 'rook', label: 'Ask Rook to guide me' },
    ],
  },
  '/autopilot': {
    title: 'Autopilot',
    tip: 'Autopilot works your inbound and outbound like an autonomous SDR, booking meetings while you sleep.',
    spot: [H1, FIRST_CARD], spotLabel: 'Autonomous SDR',
    actions: [
      { kind: 'rook', label: 'Ask Rook to start prospecting' },
      { kind: 'nav', to: '/sequences', label: 'Review the outreach' },
      { kind: 'nav', to: '/leads', label: 'See sourced leads' },
    ],
  },
  '/reviews': {
    title: 'Reviews',
    tip: 'Request, monitor, and respond to reviews across sites from one place to keep your reputation strong.',
    spot: [CTA, H1], spotLabel: 'Request a review',
    actions: [
      { kind: 'nav', to: '/surveys', label: 'Send a survey' },
      { kind: 'nav', to: '/social', label: 'Share the wins' },
      { kind: 'rook', label: 'Ask Rook to draft a response' },
    ],
  },
  '/social': {
    title: 'Social',
    tip: 'Plan and schedule posts across channels here, then track what actually drove pipeline.',
    spot: [CTA, H1], spotLabel: 'Schedule a post',
    actions: [
      { kind: 'nav', to: '/campaigns', label: 'Tie it to a campaign' },
      { kind: 'nav', to: '/reviews', label: 'Amplify a review' },
      { kind: 'rook', label: 'Ask Rook for post ideas' },
    ],
  },
  '/funnels': {
    title: 'Funnels',
    tip: 'Chain landing pages, forms, and follow-up into one funnel and watch conversion at every step.',
    spot: [CTA, H1], spotLabel: 'Build a funnel',
    actions: [
      { kind: 'nav', to: '/landing-pages', label: 'Edit the pages' },
      { kind: 'nav', to: '/forms', label: 'Add a form' },
      { kind: 'rook', label: 'Ask Rook where it leaks' },
    ],
  },
  '/grid': {
    title: 'Grid',
    tip: 'Grid is a spreadsheet-fast view of any records, so you can bulk-edit rows without leaving Ardovo.',
    spot: [H1, FIRST_CARD], spotLabel: 'Spreadsheet view',
    actions: [
      { kind: 'nav', to: '/sheets', label: 'Open Sheets' },
      { kind: 'nav', to: '/contacts', label: 'Grid your contacts' },
      { kind: 'rook', label: 'Ask Rook to clean the data' },
    ],
  },
  '/sheets': {
    title: 'Sheets',
    tip: 'A full spreadsheet backed by your live CRM data, with formulas that stay in sync as records change.',
    spot: [H1, FIRST_CARD], spotLabel: 'Live spreadsheet',
    actions: [
      { kind: 'nav', to: '/grid', label: 'Open the Grid' },
      { kind: 'nav', to: '/reports', label: 'Turn it into a report' },
      { kind: 'rook', label: 'Ask Rook to add a formula' },
    ],
  },
  '/drive': {
    title: 'Drive',
    tip: 'Store every file next to the deal or contact it belongs to, so the right document is always one click away.',
    spot: [CTA, H1], spotLabel: 'Upload a file',
    actions: [
      { kind: 'nav', to: '/deals', label: 'Attach to a deal' },
      { kind: 'nav', to: '/studio', label: 'Create a document' },
      { kind: 'rook', label: 'Ask Rook to find a file' },
    ],
  },
  '/surveys': {
    title: 'Surveys',
    tip: 'Send NPS, CSAT, or CES in a click and Ardovo scores the responses and flags detractors for follow-up.',
    spot: [CTA, H1], spotLabel: 'Send a survey',
    actions: [
      { kind: 'nav', to: '/reviews', label: 'Turn fans into reviews' },
      { kind: 'nav', to: '/success', label: 'See customer health' },
      { kind: 'rook', label: 'Ask Rook to read the results' },
    ],
  },
  '/success': {
    title: 'Customer success',
    tip: 'Health scores flag which accounts need love before they churn, so you can act while it still matters.',
    spot: [H1, FIRST_CARD], spotLabel: 'Account health',
    actions: [
      { kind: 'nav', to: '/surveys', label: 'Send a health survey' },
      { kind: 'nav', to: '/tickets', label: 'Check open tickets' },
      { kind: 'rook', label: 'Ask Rook who is at risk' },
    ],
  },
  '/tickets': {
    title: 'Support tickets',
    tip: 'Every support request threads to its contact here, so you answer with the full history in front of you.',
    spot: [CTA, H1], spotLabel: 'Open a ticket',
    actions: [
      { kind: 'nav', to: '/service', label: 'Open the Service Hub' },
      { kind: 'nav', to: '/kb', label: 'Link a help article' },
      { kind: 'rook', label: 'Ask Rook to draft a reply' },
    ],
  },
  '/studio': {
    title: 'Studio',
    tip: 'Draft proposals and docs from smart templates that pull live deal data, so they are always accurate.',
    spot: [CTA, H1], spotLabel: 'Create a document',
    actions: [
      { kind: 'nav', to: '/signatures', label: 'Send for signature' },
      { kind: 'nav', to: '/quotes', label: 'Attach a quote' },
      { kind: 'rook', label: 'Ask Rook to draft it' },
    ],
  },
};

// Ordered list of prefixes, longest first, so nested paths resolve correctly.
const PREFIXES = Object.keys(TIPS).sort((a, b) => b.length - a.length);

// Universal fallback actions used to pad the "?" popover to three.
const UNIVERSAL_ACTIONS = [
  { kind: 'rook', label: 'Ask Rook anything' },
  { kind: 'cmdk', label: 'Search or jump to anything' },
  { kind: 'spot', sel: [SPINE, '.rl-rail'], label: 'Tour the sidebar' },
];

export function routeKeyFor(pathname = getCurrentPath()) {
  for (const p of PREFIXES) {
    if (pathname === p || pathname.startsWith(p + '/')) return p;
  }
  return null;
}

export function tipForPath(pathname = getCurrentPath()) {
  const key = routeKeyFor(pathname);
  return key ? { key, ...TIPS[key] } : null;
}

// Up to three contextual actions for the "?" popover, padded with universal
// moves so the popover is always genuinely useful even on unmapped routes.
export function actionsForPath(pathname = getCurrentPath()) {
  const tip = tipForPath(pathname);
  const base = (tip && tip.actions) ? tip.actions.slice(0, 3) : [];
  const out = [...base];
  for (const a of UNIVERSAL_ACTIONS) {
    if (out.length >= 3) break;
    if (!out.some(x => x.kind === a.kind && x.label === a.label)) out.push(a);
  }
  return out.slice(0, 3);
}
