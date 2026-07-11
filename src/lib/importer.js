// ============================================================
// RALLY IMPORT / MIGRATION ENGINE - the Salesforce "Data Import
// Wizard" + "Data Loader" equivalent. Parses a CSV, auto-maps its
// columns onto the Rally field registry (with per-source presets for
// Salesforce / HubSpot / Pipedrive / Google exports), previews the
// mapping, dedupes, then writes real records through the store
// create/update writers so imported data behaves exactly like data
// entered by hand. Every created record is written to the audit log.
// ============================================================
import {
  getContacts, getCompanies, getDeals, getCurrentUser,
  createContact, updateContact, createCompany, updateCompany, createDeal, updateDeal,
} from './store.js';
import { getLeads, createLead } from './store-ext.js';
import { getFields, getField, setFieldValue } from './fields.js';
import { logChange } from './audit.js';

/* ---------------- CSV parsing (RFC-4180-ish: quotes, embedded commas
   and newlines, doubled quotes) ---------------- */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQuotes = false;
  text = text.replace(/^﻿/, ''); // strip BOM
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ''));
  if (!nonEmpty.length) return { headers: [], records: [] };
  const headers = nonEmpty[0].map(h => h.trim());
  const records = nonEmpty.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
  return { headers, records };
}

/* ---------------- target objects + their core create params ---------------- */
export const IMPORT_OBJECTS = [
  { id: 'contact', label: 'Contacts / People', icon: 'users',    core: ['firstName', 'lastName', 'email', 'phone', 'title'], dedupeKey: 'email' },
  { id: 'company', label: 'Companies / Accounts', icon: 'building', core: ['name', 'domain', 'industry', 'size', 'location'], dedupeKey: 'name' },
  { id: 'deal',    label: 'Deals / Opportunities', icon: 'target', core: ['name', 'value', 'stage', 'closeDate'], dedupeKey: 'name' },
  { id: 'lead',    label: 'Leads', icon: 'inbox', core: ['firstName', 'lastName', 'company', 'title', 'email'], dedupeKey: 'email' },
];
export const importObject = (id) => IMPORT_OBJECTS.find(o => o.id === id);

/* ---------------- migration sources (auto-map dictionaries) ----------------
   Keys are Rally field keys; values are header names those tools export. */
export const SOURCES = [
  { id: 'generic',   label: 'Generic CSV', hint: 'Any spreadsheet or CSV export.' },
  { id: 'salesforce',label: 'Salesforce',  hint: 'Report or Data Export CSV.' },
  { id: 'hubspot',   label: 'HubSpot',     hint: 'Contacts / Companies / Deals export.' },
  { id: 'pipedrive', label: 'Pipedrive',   hint: 'Persons / Organizations / Deals export.' },
  { id: 'google',    label: 'Google Contacts', hint: 'Google CSV / Outlook CSV.' },
];

// Per-field header aliases, merged across the common tools. Lowercased.
const ALIASES = {
  firstName: ['first name', 'firstname', 'first', 'given name', 'fname'],
  lastName:  ['last name', 'lastname', 'last', 'surname', 'family name', 'lname'],
  email:     ['email', 'email address', 'e-mail', 'email1', 'primary email', 'work email', 'email - value'],
  phone:     ['phone', 'phone number', 'mobile', 'mobile phone', 'work phone', 'phone - value', 'business phone'],
  title:     ['title', 'job title', 'position', 'role'],
  name:      ['name', 'company', 'company name', 'account name', 'organization', 'organization name', 'org name', 'deal name', 'opportunity name'],
  domain:    ['domain', 'website', 'company domain name', 'web', 'url'],
  industry:  ['industry', 'sector'],
  size:      ['size', 'employees', 'number of employees', 'company size', 'headcount'],
  location:  ['location', 'city', 'billing city', 'address', 'country', 'billing country'],
  value:     ['value', 'amount', 'deal value', 'deal amount', 'opportunity amount', 'expected revenue', 'weighted value'],
  stage:     ['stage', 'deal stage', 'stage name', 'pipeline stage', 'status'],
  closeDate: ['close date', 'closedate', 'expected close date', 'close', 'expected close'],
  company:   ['company', 'company name', 'organization', 'account name'],
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Auto-map CSV headers to Rally field keys for an object type. Matches by
   alias table first, then by exact field key/label, so unknown columns stay
   unmapped for the user to resolve. Returns { [header]: fieldKey | '' }. */
export function autoMap(objectType, headers) {
  const fields = getFields(objectType).filter(f => !f.computed);
  const byNorm = new Map();
  for (const f of fields) {
    byNorm.set(norm(f.key), f.key);
    byNorm.set(norm(f.label), f.key);
    for (const a of (ALIASES[f.key] || [])) byNorm.set(norm(a), f.key);
  }
  // lead uses store-ext fields not in the registry; seed its core directly
  if (objectType === 'lead') {
    for (const k of ['firstName', 'lastName', 'company', 'title', 'email', 'source']) {
      byNorm.set(norm(k), k);
      for (const a of (ALIASES[k] || [])) byNorm.set(norm(a), k);
    }
  }
  const used = new Set();
  const map = {};
  for (const h of headers) {
    const key = byNorm.get(norm(h));
    if (key && !used.has(key)) { map[h] = key; used.add(key); }
    else map[h] = '';
  }
  return map;
}

/* Target field options for the mapping dropdowns. */
export function targetFields(objectType) {
  if (objectType === 'lead') {
    return [
      { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
      { key: 'company', label: 'Company' }, { key: 'title', label: 'Title' },
      { key: 'email', label: 'Email' }, { key: 'source', label: 'Source' },
    ];
  }
  return getFields(objectType).filter(f => !f.computed).map(f => ({ key: f.key, label: f.label, required: f.required }));
}

/* ---------------- value coercion ---------------- */
function coerce(objectType, key, raw) {
  if (raw == null || raw === '') return raw;
  const fd = objectType !== 'lead' ? getField(objectType, key) : null;
  const type = fd?.type;
  if (key === 'value' || type === 'currency' || type === 'number' || type === 'duration') {
    const n = Number(String(raw).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : raw;
  }
  if (type === 'checkbox' || type === 'boolean') return /^(1|true|yes|y)$/i.test(String(raw).trim());
  if (type === 'multiselect' || type === 'tags') return String(raw).split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  return raw;
}

const dedupeSets = {
  contact: () => new Set(getContacts().map(c => (c.email || '').toLowerCase()).filter(Boolean)),
  company: () => new Set(getCompanies().map(c => norm(c.name)).filter(Boolean)),
  deal:    () => new Set(getDeals().map(d => norm(d.name)).filter(Boolean)),
  lead:    () => new Set(getLeads().map(l => (l.email || '').toLowerCase()).filter(Boolean)),
};

/* ---------------- the import runner ---------------- */
export function runImport({ objectType, records, mapping, dedupe = true }) {
  const obj = importObject(objectType);
  const core = new Set(obj.core);
  const seen = dedupe ? dedupeSets[objectType]() : new Set();
  const who = getCurrentUser()?.name || 'Import';
  let created = 0, skipped = 0;
  const errors = [];
  const createdIds = [];

  const activeCols = Object.entries(mapping).filter(([, key]) => key); // [header, fieldKey]

  records.forEach((row, idx) => {
    // assemble mapped { fieldKey: coercedValue }
    const mapped = {};
    for (const [header, key] of activeCols) {
      const v = coerce(objectType, key, row[header]);
      if (v !== '' && v != null) mapped[key] = v;
    }
    // dedupe
    const dk = obj.dedupeKey;
    const dval = dk === 'email' ? String(mapped.email || '').toLowerCase() : norm(mapped[dk] || '');
    if (dedupe && dval && seen.has(dval)) { skipped++; return; }

    try {
      let rec, id;
      if (objectType === 'contact') {
        if (!mapped.firstName && !mapped.lastName && !mapped.email) { skipped++; return; }
        const r = createContact({ firstName: mapped.firstName || mapped.email || 'Unknown', lastName: mapped.lastName || '', email: mapped.email, phone: mapped.phone, title: mapped.title });
        if (r.error) { errors.push(`Row ${idx + 2}: ${r.message}`); return; }
        rec = r.contact; id = rec.id;
      } else if (objectType === 'company') {
        if (!mapped.name) { skipped++; return; }
        const r = createCompany({ name: mapped.name, domain: mapped.domain, industry: mapped.industry, size: mapped.size, location: mapped.location });
        if (r.error) { errors.push(`Row ${idx + 2}: ${r.message}`); return; }
        rec = r.company; id = rec.id;
      } else if (objectType === 'deal') {
        if (!mapped.name) { skipped++; return; }
        const r = createDeal({ name: mapped.name, value: Number(mapped.value ?? mapped.amount) || 0, stage: mapped.stage, closeDate: mapped.closeDate });
        if (r.error) { errors.push(`Row ${idx + 2}: ${r.message}`); return; }
        rec = r.deal; id = rec.id;
      } else { // lead
        if (!mapped.firstName && !mapped.lastName && !mapped.email) { skipped++; return; }
        const r = createLead({ firstName: mapped.firstName || mapped.email || mapped.lastName || 'Lead', lastName: mapped.lastName || '', company: mapped.company || '', title: mapped.title || '', email: mapped.email || '', source: mapped.source || 'Import' });
        if (r.error) { errors.push(`Row ${idx + 2}: ${r.message}`); return; }
        rec = r.lead || r; id = rec.id;
      }

      // apply any non-core mapped fields through the field registry
      if (objectType !== 'lead') {
        let patch = {};
        for (const [key, value] of Object.entries(mapped)) {
          if (core.has(key)) continue;
          const fd = getField(objectType, key);
          if (!fd) continue;
          const p = setFieldValue(rec, fd, value);
          if (p.fieldValues) patch = { ...patch, fieldValues: { ...(patch.fieldValues || {}), ...p.fieldValues } };
          else patch = { ...patch, ...p };
        }
        if (Object.keys(patch).length) {
          if (objectType === 'contact') updateContact(id, patch);
          else if (objectType === 'company') updateCompany(id, patch);
          else if (objectType === 'deal') updateDeal(id, patch);
        }
      }

      logChange(objectType, id, 'imported', null, 'Imported from CSV', who);
      if (dedupe && dval) seen.add(dval);
      created++; createdIds.push(id);
    } catch (e) {
      errors.push(`Row ${idx + 2}: ${e?.message || 'failed to import'}`);
    }
  });

  return { created, skipped, errors, total: records.length, createdIds };
}
