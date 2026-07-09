// Module registry + on/off state - the CRM control panel.
//
// Every workspace can turn modules on or off. Disabled modules vanish from the
// left nav (and their routes redirect home), so a small team can run a lean
// Rally and an enterprise can light up everything. The CRM spine (Command
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
