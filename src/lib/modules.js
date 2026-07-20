// Module registry + on/off state - the CRM control panel.
//
// Every workspace can turn modules on or off. Disabled modules vanish from the
// left nav (and their routes redirect home), so a small team can run a lean
// Ardovo and an enterprise can light up everything. The CRM spine (Command
// center, Deals, Contacts, Companies, My day, Settings) is always on and not
// listed here. State persists to localStorage; swap to a per-org column later.
import { useState, useEffect } from 'react';

const LS = 'rally_modules_v1';

// Toggleable modules, grouped by nav section. key maps to the nav route.
export const MODULES = [
  { key: 'leads',        label: 'Leads',        route: '/leads',        section: 'Sell',         desc: 'Inbound lead inbox with AI scoring and one-click convert.' },
  { key: 'forecasting',  label: 'Forecasting',  route: '/forecasting',  section: 'Sell',         desc: 'Weighted forecast, quota attainment, category roll-up.' },
  { key: 'campaigns',    label: 'Campaigns',    route: '/campaigns',    section: 'Marketing',    desc: 'Marketing campaigns and audiences.' },
  { key: 'sequences',    label: 'Sequences',    route: '/sequences',    section: 'Marketing',    desc: 'Multi-step email and task cadences.' },
  { key: 'projects',     label: 'Projects',     route: '/projects',     section: 'Deliver',      desc: 'Post-sale delivery and onboarding projects.' },
  { key: 'inbox',        label: 'Inbox',        route: '/inbox',        section: 'Service',      desc: 'Unified conversations inbox across channels.' },
  { key: 'products',     label: 'Products',     route: '/products',     section: 'Revenue',      desc: 'Product catalog and price books.' },
  { key: 'quotes',       label: 'Quotes',       route: '/quotes',       section: 'Revenue',      desc: 'CPQ - quotes, line items, approvals.' },
  { key: 'invoices',     label: 'Billing',      route: '/invoices',     section: 'Revenue',      desc: 'Invoices, AR aging, MRR and ARR.' },
  { key: 'dashboards',   label: 'Dashboards',   route: '/dashboards',   section: 'Intelligence', desc: 'Live KPI dashboards.' },
  { key: 'reports',      label: 'Reports',      route: '/reports',      section: 'Intelligence', desc: 'Custom report and dashboard builder.' },
  { key: 'workflows',    label: 'Workflows',    route: '/workflows',    section: 'Automate',     desc: 'No-code automation rules engine.' },
  { key: 'integrations', label: 'Integrations', route: '/integrations', section: 'Admin',        desc: 'Connect SAP, Jira, Gmail, and hundreds more.' },
  { key: 'team',         label: 'Team',         route: '/team',         section: 'Admin',        desc: 'Users, roles, permissions, territories.' },
  // Expanded registry (Wave 1-8) so every non-core module is toggleable and the
  // App Manager control panel lists the full product. Core spine (Command center,
  // Deals, Contacts, Companies, My day, Settings, Notifications) stays always-on
  // and is intentionally absent here.
  { key: 'goals',        label: 'Goals',            route: '/goals',         section: 'Sell',         desc: 'Quota and goal tracking with pacing.' },
  { key: 'territories',  label: 'Territories',      route: '/territories',   section: 'Sell',         desc: 'Territory design and book-of-business rollup.' },
  { key: 'scheduler',    label: 'Scheduler',        route: '/scheduler',     section: 'Sell',         desc: 'Meeting scheduling links and availability.' },
  { key: 'playbooks',    label: 'Playbooks',        route: '/playbooks',     section: 'Sell',         desc: 'Sales playbooks and guided selling.' },
  { key: 'warroom',      label: 'War Room',         route: '/warroom',       section: 'Sell',         desc: 'Live deal war room with buying committee and close plan.' },
  { key: 'automations',  label: 'Automations',      route: '/automations',   section: 'Marketing',    desc: 'Marketing automation recipes.' },
  { key: 'forms',        label: 'Forms',            route: '/forms',         section: 'Marketing',    desc: 'Lead capture forms.' },
  { key: 'landingPages', label: 'Landing pages',    route: '/landing-pages', section: 'Marketing',    desc: 'Hosted landing pages.' },
  { key: 'lists',        label: 'Lists',            route: '/lists',         section: 'Marketing',    desc: 'Segments and audience lists.' },
  { key: 'reviews',      label: 'Reviews',          route: '/reviews',       section: 'Marketing',    desc: 'Reputation and review engine.' },
  { key: 'social',       label: 'Social',           route: '/social',        section: 'Marketing',    desc: 'Multi-channel social planner.' },
  { key: 'funnels',      label: 'Funnels',          route: '/funnels',       section: 'Marketing',    desc: 'Funnel and website builder.' },
  { key: 'ads',          label: 'Ads',              route: '/ads',           section: 'Marketing',    desc: 'Cross-channel ad manager and ROAS.' },
  { key: 'journeys',     label: 'Journeys',         route: '/journeys',      section: 'Marketing',    desc: 'Customer journey orchestration.' },
  { key: 'markethub',    label: 'Marketing Hub',    route: '/markethub',     section: 'Marketing',    desc: 'Unified marketing command center and lead scoring.' },
  { key: 'success',      label: 'Customer success', route: '/success',       section: 'Deliver',      desc: 'Health scores and renewals.' },
  { key: 'scheduling',   label: 'Scheduling',       route: '/scheduling',    section: 'Deliver',      desc: 'Delivery and onboarding scheduling.' },
  { key: 'academy',      label: 'Academy',          route: '/academy',       section: 'Deliver',      desc: 'Courses, memberships, and client portal.' },
  { key: 'conversations',label: 'Conversations',    route: '/conversations', section: 'Service',      desc: 'Unified omni-channel inbox.' },
  { key: 'voice',        label: 'Voice AI',         route: '/voice',         section: 'Service',      desc: 'AI voice receptionist and call intelligence.' },
  { key: 'tickets',      label: 'Support tickets',  route: '/tickets',       section: 'Service',      desc: 'Ticketing and help desk.' },
  { key: 'service',      label: 'Service Hub',      route: '/service',       section: 'Service',      desc: 'Service operations hub.' },
  { key: 'kb',           label: 'Knowledge base',   route: '/kb',            section: 'Service',      desc: 'Self-serve knowledge base.' },
  { key: 'surveys',      label: 'Surveys',          route: '/surveys',       section: 'Service',      desc: 'NPS, CSAT, and CES surveys.' },
  { key: 'signatures',   label: 'Signatures',       route: '/signatures',    section: 'Revenue',      desc: 'E-signature and document signing.' },
  { key: 'payments',     label: 'Payments',         route: '/payments',      section: 'Revenue',      desc: 'Payment links, text-to-pay, subscriptions.' },
  { key: 'affiliates',   label: 'Affiliates',       route: '/affiliates',    section: 'Revenue',      desc: 'Affiliate and partner manager.' },
  { key: 'intelligence', label: 'Intelligence',     route: '/intelligence',  section: 'Intelligence', desc: 'Revenue intelligence workspace.' },
  { key: 'fork',         label: 'Pipeline Fork',    route: '/fork',          section: 'Intelligence', desc: 'Scenario forking of the pipeline.' },
  { key: 'windTunnel',   label: 'Wind Tunnel',      route: '/wind-tunnel',   section: 'Intelligence', desc: 'Stress-test deals under pressure.' },
  { key: 'ghostDeals',   label: 'Ghost Deals',      route: '/ghost-deals',   section: 'Intelligence', desc: 'Recover and replay lost deals.' },
  { key: 'attribution',  label: 'Attribution',      route: '/attribution',   section: 'Intelligence', desc: 'Multi-touch revenue attribution.' },
  { key: 'twin',         label: 'Revenue Twin',     route: '/twin',          section: 'Intelligence', desc: 'Monte Carlo revenue digital twin.' },
  { key: 'signals',      label: 'Signals',          route: '/signals',       section: 'Intelligence', desc: 'Predictive churn, expansion, and intent.' },
  { key: 'film',         label: 'Deal Film',        route: '/film',          section: 'Intelligence', desc: 'Replayable deal timeline.' },
  { key: 'genesis',      label: 'Genesis',          route: '/genesis',       section: 'Intelligence', desc: 'Generative platform setup.' },
  { key: 'canvas',       label: 'Ask Canvas',       route: '/canvas',        section: 'Intelligence', desc: 'Generative analytics canvas.' },
  { key: 'grid',         label: 'Grid',             route: '/grid',          section: 'Data',         desc: 'Airtable-class linked database inside the CRM.' },
  { key: 'flow',         label: 'Flow builder',     route: '/flow',          section: 'Automate',     desc: 'Visual workflow canvas.' },
  { key: 'autopilot',    label: 'Autopilot',        route: '/autopilot',     section: 'Automate',     desc: 'Autonomous SDR with a trust dial.' },
  { key: 'nightShift',   label: 'Night Shift',      route: '/night-shift',   section: 'Automate',     desc: 'Overnight autonomous operations.' },
  { key: 'sms',          label: 'SMS Alerts',       route: '/sms',           section: 'Automate',     desc: 'SMS alerting and routing.' },
  { key: 'queue',        label: 'Task queues',      route: '/queue',         section: 'Automate',     desc: 'Work queues for the team.' },
  { key: 'workspaces',   label: 'Workspaces',       route: '/workspaces',    section: 'Admin',        desc: 'Agency sub-accounts and white-label.' },
  { key: 'marketplace',  label: 'Marketplace',      route: '/marketplace',   section: 'Admin',        desc: 'Installable app marketplace.' },
  { key: 'sandboxes',    label: 'Sandboxes',        route: '/sandboxes',     section: 'Admin',        desc: 'Test environments and promote-to-prod.' },
  { key: 'roles',        label: 'Roles',            route: '/roles',         section: 'Admin',        desc: 'Deep per-module and per-field permissions.' },
  { key: 'permissions',  label: 'Permissions',      route: '/permissions',   section: 'Admin',        desc: 'Access control and sharing rules.' },
  { key: 'developers',   label: 'Developers',       route: '/developers',    section: 'Admin',        desc: 'API keys, webhooks, and SDKs.' },
  { key: 'emailCenter',  label: 'Email Center',     route: '/email-center',  section: 'Admin',        desc: 'Every transactional email, the template catalog, and executive digests.' },
  { key: 'billingPlans', label: 'Plans',            route: '/billing-plans', section: 'Admin',        desc: 'Subscription plans and billing.' },
  { key: 'audit',        label: 'Audit',            route: '/audit',         section: 'Admin',        desc: 'Audit log of every change.' },
  { key: 'datasync',     label: 'Data sync',        route: '/datasync',      section: 'Data',         desc: 'Two-way data sync and data health.' },
  { key: 'import',       label: 'Import',           route: '/import',        section: 'Data',         desc: 'Bulk import and mapping.' },
  { key: 'objects',      label: 'Custom objects',   route: '/objects',       section: 'Data',         desc: 'Custom objects and records.' },
  { key: 'duplicates',   label: 'Duplicates',       route: '/duplicates',    section: 'Data',         desc: 'Duplicate detection and merge.' },
  { key: 'studio',       label: 'Studio',           route: '/studio',        section: 'Files',        desc: 'Document studio and builder.' },
  { key: 'drive',        label: 'Drive',            route: '/drive',         section: 'Files',        desc: 'Native file storage and sharing.' },
  { key: 'sheets',       label: 'Sheets',           route: '/sheets',        section: 'Files',        desc: 'In-app spreadsheet with formulas.' },
];

const subs = new Set();
function read() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { return {}; } }
let state = read();

// Default ON: a module is enabled unless explicitly turned off.
export function isModuleOn(key) { return state[key] !== false; }

// Which module owns a route (null for core/unlisted routes, which always show).
export function moduleForRoute(route) {
  const m = MODULES.find(m => route === m.route || route.startsWith(m.route + '/'));
  return m ? m.key : null;
}

export function setModule(key, on) {
  state = { ...state, [key]: !!on };
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}

export function enabledCount() { return MODULES.filter(m => isModuleOn(m.key)).length; }

// Reactive snapshot so nav + settings re-render on toggle.
export function useModules() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = (s) => setSnap({ ...s });
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
