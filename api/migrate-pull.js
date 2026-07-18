// GET /api/migrate-pull?source=salesforce|hubspot&object=contact|company|deal|lead
//
// Given a connected source (the sealed token cookie from
// /api/migrate-callback) and an object type, fetches records from the
// provider API, normalizes them to Ardovo record shapes keyed by Ardovo
// field keys, and returns them for the client to map + import through
// the EXISTING importer (importer.autoMap + importer.runImport). The
// fetch is paginated and bounded (best-effort): it stops at a page /
// record cap and returns whatever it has, with a hasMore flag, rather
// than risking a serverless timeout. If the token cookie is missing or
// expired it returns { connected:false } so the UI re-prompts connect.
// Additive + env-gated; never touches the CSV path. NO em-dash / en-dash.
import { withErrorHandling } from './_utils.js';
import {
  getProvider, isConfigured, cookieName, readCookie, openToken, SF_API_VERSION,
} from './_lib-migrate.js';

const MAX_PAGES = 20;
const MAX_RECORDS = 2000;
const PAGE_SIZE = 100;

async function pullSalesforce(objDef, token) {
  const instance = String(token.instanceUrl || '').replace(/\/+$/, '');
  if (!instance) throw new Error('Missing Salesforce instance URL. Reconnect the source.');
  const auth = { Authorization: `Bearer ${token.accessToken}` };
  const out = [];
  let hasMore = false;
  let url = `${instance}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(objDef.soql)}`;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetch(url, { headers: auth }).then(r => r.json());
    if (Array.isArray(data) && data[0] && data[0].errorCode) throw new Error(data[0].message || data[0].errorCode);
    if (data.error) throw new Error(data.error_description || data.error);
    for (const rec of (data.records || [])) {
      out.push(objDef.normalize(rec));
      if (out.length >= MAX_RECORDS) { hasMore = !data.done || !!data.nextRecordsUrl; return { records: out, hasMore }; }
    }
    if (data.done || !data.nextRecordsUrl) { hasMore = false; break; }
    url = `${instance}${data.nextRecordsUrl}`;
    if (page === MAX_PAGES - 1) hasMore = true;
  }
  return { records: out, hasMore };
}

async function pullHubspot(objDef, token) {
  const auth = { Authorization: `Bearer ${token.accessToken}` };
  const out = [];
  let hasMore = false;
  let after = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const p = new URLSearchParams({ limit: String(PAGE_SIZE), properties: objDef.hsProps.join(',') });
    if (after) p.set('after', after);
    const data = await fetch(`https://api.hubapi.com/crm/v3/objects/${objDef.hsObject}?${p}`, { headers: auth }).then(r => r.json());
    if (data.status === 'error') throw new Error(data.message || 'HubSpot API error.');
    for (const rec of (data.results || [])) {
      out.push(objDef.normalize(rec));
      if (out.length >= MAX_RECORDS) { hasMore = !!(data.paging && data.paging.next); return { records: out, hasMore }; }
    }
    after = data.paging && data.paging.next ? data.paging.next.after : '';
    if (!after) { hasMore = false; break; }
    if (page === MAX_PAGES - 1) hasMore = true;
  }
  return { records: out, hasMore };
}

export default withErrorHandling(async (req, res) => {
  const source = String((req.query && req.query.source) || '').toLowerCase();
  const objectType = String((req.query && req.query.object) || '').toLowerCase();
  const provider = getProvider(source);

  if (!provider) return res.status(200).json({ connected: false, message: 'Unknown migration source.' });
  if (!isConfigured(source)) {
    return res.status(200).json({ configured: false, connected: false, message: `${provider.label} API migration is not set up. Import a CSV export instead.` });
  }
  const objDef = provider.objects[objectType];
  if (!objDef) return res.status(200).json({ connected: true, error: `Object "${objectType}" is not supported for ${provider.label}.` });

  const token = openToken(source, readCookie(req, cookieName(source)));
  if (!token || !token.accessToken) {
    return res.status(200).json({ connected: false, message: `Reconnect ${provider.label} to pull data.` });
  }

  try {
    const { records, hasMore } = source === 'salesforce'
      ? await pullSalesforce(objDef, token)
      : await pullHubspot(objDef, token);

    // Drop fully-empty rows (best-effort; the importer would skip them anyway).
    const clean = records.filter(r => Object.values(r).some(v => v != null && String(v).trim() !== ''));

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      connected: true,
      source,
      object: objectType,
      label: objDef.label,
      fields: objDef.fields,          // [{ key, label }] in display order
      headers: objDef.fields.map(f => f.key),
      records: clean,                 // each row keyed by Ardovo field key
      count: clean.length,
      hasMore,
    });
  } catch (e) {
    // Best-effort: surface the failure without 500ing the wizard.
    return res.status(200).json({ connected: true, source, object: objectType, error: (e?.message || 'Pull failed.').slice(0, 180), records: [], count: 0 });
  }
});
