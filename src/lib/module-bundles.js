// Preset packaging bundles for the App Manager.
//
// Salesforce and NetSuite hide packaging behind a sales rep and a quote. Rally
// lets an admin flip a whole product shape in one click: run lean, grow into
// more, or light up the full enterprise suite. Each bundle names a set of
// module keys to ENABLE; every other toggleable module is turned OFF. The CRM
// spine (Command center, Deals, Contacts, Companies, My day, Settings) is not
// a toggleable module, so it is never touched by a bundle.
//
// Forward-compatible: applyBundle iterates the LIVE MODULES registry, so keys a
// bundle names that do not exist yet are simply skipped, and new modules the
// integrator adds fall on the correct side of each bundle by membership.
import { MODULES, setModule, isModuleOn } from './modules.js';

// Lean sales team: capture, close, bill. No delivery, no service desk, no
// enterprise governance. The Rally you can run on day one.
const STARTER = [
  'leads', 'forecasting', 'campaigns', 'sequences',
  'products', 'quotes', 'invoices',
  'dashboards', 'inbox',
];

// Growth org: full go-to-market plus delivery and reporting. Everything a
// scaling revenue team touches, minus the heavy admin and lab surfaces.
const GROWTH = [
  ...STARTER,
  'goals', 'territories', 'scheduler', 'playbooks', 'warroom',
  'automations', 'forms', 'landingPages', 'lists', 'reviews', 'social',
  'funnels', 'ads', 'attribution', 'canvas', 'queue',
  'projects', 'success', 'scheduling', 'tickets', 'service', 'kb',
  'academy', 'surveys', 'conversations', 'voice',
  'signatures', 'payments', 'affiliates', 'studio', 'film',
  'reports', 'intelligence', 'signals', 'twin',
  'workflows', 'flow', 'autopilot', 'nightShift', 'sms',
  'integrations',
];

export const BUNDLES = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Lean revenue team',
    desc: 'Capture, close, and bill. The essentials to run pipeline from day one, nothing to configure away.',
    accent: 'var(--accent-teal)',
    icon: 'rocket',
    enable: STARTER,
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scaling go-to-market',
    desc: 'Full marketing, delivery, service, and reporting layered on the sales core. Where most teams live.',
    accent: 'var(--accent)',
    icon: 'trendUp',
    enable: GROWTH,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Everything, governed',
    desc: 'Every module on: workspaces, sandboxes, permissions, developers, custom objects, and the full intelligence lab.',
    accent: 'var(--accent-purple)',
    icon: 'shield',
    enable: 'all',
  },
];

export function bundleById(id) {
  return BUNDLES.find(b => b.id === id) || null;
}

// True if the module key should be ON under this bundle.
export function bundleWants(bundle, key) {
  if (!bundle) return true;
  return bundle.enable === 'all' || bundle.enable.includes(key);
}

// Flip the entire registry to match a bundle. Returns { on, off } counts.
export function applyBundle(id) {
  const bundle = bundleById(id);
  if (!bundle) return { on: 0, off: 0 };
  let on = 0, off = 0;
  MODULES.forEach(m => {
    const want = bundleWants(bundle, m.key);
    setModule(m.key, want);
    if (want) on++; else off++;
  });
  return { on, off };
}

// Which bundle (if any) exactly matches the current enabled set. Compares only
// against the live registry so it stays correct as MODULES grows. Returns the
// bundle id, or null for a hand-tuned "Custom" configuration.
export function matchedBundleId(snap = {}) {
  const isOn = (key) => snap[key] !== false;
  for (const b of BUNDLES) {
    const ok = MODULES.every(m => isOn(m.key) === bundleWants(b, m.key));
    if (ok) return b.id;
  }
  return null;
}

// How far the current config sits from a bundle (count of modules that differ).
// Powers the "3 changes from Growth" hint on each bundle card.
export function bundleDrift(bundle, snap = {}) {
  if (!bundle) return 0;
  const isOn = (key) => snap[key] !== false;
  return MODULES.reduce((n, m) => n + (isOn(m.key) === bundleWants(bundle, m.key) ? 0 : 1), 0);
}

// Convenience for callers that only have a live check available.
export function currentlyOn(key) { return isModuleOn(key); }
