// ============================================================
// RALLY MIGRATION - browser helpers
// The client side of "migrate straight from Salesforce / HubSpot".
// Talks to /api/migrate-* and funnels pulled records through the SAME
// import path a CSV upload uses: importer.autoMap builds the column
// mapping and importer.runImport writes the records through the store.
// So an API pull and a CSV upload converge on one code path. Additive:
// when a source is not configured the API returns { configured:false }
// and this module surfaces the "set up keys or use CSV" fallback.
// NO em-dash / en-dash.
// ============================================================
import { autoMap, runImport, importObject } from './importer.js';

// Source metadata for the UI. `objects` are the Rally importer object
// ids each source can migrate; labels come back live from the API too,
// but this gives the panel something to render before a connect.
export const MIGRATE_SOURCES = [
  {
    id: 'salesforce', label: 'Salesforce', accent: '#00A1E0',
    blurb: 'Pull Accounts, Contacts, Opportunities and Leads over the Salesforce REST API.',
    objects: ['company', 'contact', 'deal', 'lead'],
  },
  {
    id: 'hubspot', label: 'HubSpot', accent: '#FF7A59',
    blurb: 'Pull Companies, Contacts and Deals over the HubSpot CRM API.',
    objects: ['company', 'contact', 'deal'],
  },
];

export const migrateSource = (id) => MIGRATE_SOURCES.find(s => s.id === id);

// Field pre-maps: which Rally field keys each source object supplies.
// The pull endpoint already emits records keyed by these Rally keys, so
// the "map" is an identity map. Kept explicit here so the panel can show
// and (if ever needed) override the mapping before import. autoMap is the
// fallback so this stays correct even if the API adds columns.
export const PRE_MAPS = {
  salesforce: {
    contact: ['firstName', 'lastName', 'email', 'phone', 'title'],
    company: ['name', 'domain', 'industry', 'size', 'location'],
    deal: ['name', 'value', 'stage', 'closeDate'],
    lead: ['firstName', 'lastName', 'company', 'title', 'email'],
  },
  hubspot: {
    contact: ['firstName', 'lastName', 'email', 'phone', 'title'],
    company: ['name', 'domain', 'industry', 'size', 'location'],
    deal: ['name', 'value', 'stage', 'closeDate'],
  },
};

// Build the { header: fieldKey } mapping importer.runImport expects.
// Pulled headers ARE Rally field keys, so we prefer an identity map and
// fall back to importer.autoMap for anything unexpected.
export function buildMapping(objectType, headers) {
  const auto = autoMap(objectType, headers);
  const map = {};
  for (const h of headers) map[h] = auto[h] || h;
  return map;
}

// 1) Kick off an OAuth connect. Returns { configured, url?, message? }.
//    When configured, the caller should redirect the browser to `url`.
export async function connectSource(source) {
  try {
    const r = await fetch(`/api/migrate-start?source=${encodeURIComponent(source)}`);
    return await r.json();
  } catch (e) {
    return { configured: false, message: 'Could not reach the migration service. Import a CSV export instead.' };
  }
}

// Read the ?migrate=1&source=..&status=.. flag the callback redirects
// back with, so the panel knows a source just connected. Non-destructive
// read of the current URL (the panel clears it after reading).
export function readConnectFlag() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('migrate') !== '1') return null;
    return { source: q.get('source') || '', status: q.get('status') || '', message: q.get('message') || '' };
  } catch {
    return null;
  }
}

// 2) Pull an object from a connected source. Returns the raw API payload
//    plus a ready-to-import mapping. { connected, records, fields, mapping, ... }.
export async function pullObjects(source, objectType) {
  const r = await fetch(`/api/migrate-pull?source=${encodeURIComponent(source)}&object=${encodeURIComponent(objectType)}`);
  const data = await r.json();
  if (!data || data.connected === false) return { connected: false, message: (data && data.message) || 'Not connected.' };
  if (data.error) return { connected: true, error: data.error, records: [], count: 0 };
  const headers = data.headers || (data.fields || []).map(f => f.key);
  return {
    connected: true,
    source,
    objectType,
    label: data.label || importObject(objectType)?.label,
    fields: data.fields || [],
    headers,
    records: data.records || [],
    count: data.count || (data.records || []).length,
    hasMore: !!data.hasMore,
    mapping: buildMapping(objectType, headers),
  };
}

// 3) Import pulled records through the exact same importer the CSV path
//    uses. Returns importer.runImport's result ({ created, skipped, ... }).
export function importPulled({ objectType, records, mapping, dedupe = true }) {
  return runImport({ objectType, records, mapping, dedupe });
}
