// ============================================================
// ARDOVO MIGRATION ENGINE  (local-first, additive)
//
// The engine behind the Migration Wizard. Replaces the painful, months-long
// "conversion project" with a three-stage flow the customer never runs alone:
//
//   Development (Upload)  -> paste or upload a CSV export.
//   Testing (Review)      -> Ardovo analyzes it: unmapped columns, empty
//                            required fields, jammed data, and duplicates.
//                            The customer remaps and cleanses IN THE APP.
//   Staging (Ready)       -> a clean, previewed record set.
//   Production (Push)     -> committed to the live book via store writers.
//
// Nothing touches production until the customer clicks push. Pure functions +
// a small local job store (rally_migration_v1). ASCII only. NO em-dash.
// ============================================================
import { useEffect, useState } from 'react';
import { createContact, createCompany, getContacts, getCompanies } from './store.js';

const LS_KEY = 'rally_migration_v1';

/* ============================================================
   TARGET SCHEMAS  (what we are mapping INTO)
   ============================================================ */
export const TARGETS = {
  contact: {
    label: 'Contacts', icon: 'users',
    fields: [
      { key: 'firstName', label: 'First name', required: true },
      { key: 'lastName', label: 'Last name' },
      { key: 'email', label: 'Email', required: true, type: 'email' },
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'title', label: 'Title' },
      { key: 'company', label: 'Company' },
    ],
  },
  company: {
    label: 'Companies', icon: 'building',
    fields: [
      { key: 'name', label: 'Company name', required: true },
      { key: 'industry', label: 'Industry' },
      { key: 'size', label: 'Size' },
      { key: 'domain', label: 'Website' },
      { key: 'location', label: 'Location' },
    ],
  },
};

/* Synonyms used by auto-map to guess header -> field. */
const SYNONYMS = {
  firstName: ['first name', 'firstname', 'first', 'fname', 'given name', 'given', 'full name', 'fullname', 'name', 'contact name', 'contact'],
  lastName: ['last name', 'lastname', 'last', 'lname', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address', 'work email', 'mail', 'contact email'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel', 'work phone', 'direct'],
  title: ['title', 'job title', 'role', 'position', 'designation'],
  company: ['company', 'company name', 'account', 'account name', 'organization', 'organisation', 'employer', 'business'],
  name: ['name', 'company', 'company name', 'account', 'account name', 'organization'],
  industry: ['industry', 'sector', 'vertical'],
  size: ['size', 'company size', 'employees', 'headcount', 'employee count'],
  domain: ['website', 'domain', 'url', 'web', 'site'],
  location: ['location', 'city', 'address', 'region', 'country', 'state'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (s) => String(s || '').trim().toLowerCase();

/* ============================================================
   CSV PARSE  (handles quoted fields, commas, CRLF)
   ============================================================ */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  const s = String(text || '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const clean = rows.filter(r => r.some(x => String(x).trim() !== ''));
  if (!clean.length) return { headers: [], rows: [] };
  const headers = clean[0].map(h => String(h).trim());
  const dataRows = clean.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] == null ? '' : String(r[i]).trim()); });
    return obj;
  });
  return { headers, rows: dataRows };
}

/* ============================================================
   AUTO-MAP  header -> target field
   ============================================================ */
export function autoMap(headers, target = 'contact') {
  const fields = TARGETS[target].fields.map(f => f.key);
  const mapping = {};
  const used = new Set();
  for (const h of headers) {
    const nh = norm(h);
    let best = '';
    for (const f of fields) {
      if (used.has(f)) continue;
      const syn = SYNONYMS[f] || [f];
      if (syn.includes(nh) || syn.some(x => nh === x)) { best = f; break; }
    }
    if (!best) {
      for (const f of fields) {
        if (used.has(f)) continue;
        const syn = SYNONYMS[f] || [f];
        if (syn.some(x => nh.includes(x) || x.includes(nh))) { best = f; break; }
      }
    }
    if (best) { mapping[h] = best; used.add(best); }
    else mapping[h] = '';
  }
  return mapping;
}

/* ============================================================
   ANALYZE  -> the review report
   ============================================================ */
export function analyze({ headers, rows, mapping, target = 'contact' }) {
  const tfields = TARGETS[target].fields;
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const unmapped = headers.filter(h => !mapping[h]);
  const missingTargets = tfields.filter(f => f.required && !mappedFields.has(f.key)).map(f => f.label);

  // Reverse index: target field -> source header.
  const fieldToHeader = {};
  for (const [h, f] of Object.entries(mapping)) if (f) fieldToHeader[f] = h;

  // Fill rates per mapped field.
  const fillRates = {};
  for (const f of mappedFields) {
    const h = fieldToHeader[f];
    const filled = rows.filter(r => String(r[h] || '').trim() !== '').length;
    fillRates[f] = rows.length ? Math.round((filled / rows.length) * 100) : 0;
  }

  // Missing required VALUES (rows lacking a required mapped field).
  const requiredMapped = tfields.filter(f => f.required && mappedFields.has(f.key));
  let missingRequiredRows = 0;
  for (const r of rows) {
    if (requiredMapped.some(f => String(r[fieldToHeader[f.key]] || '').trim() === '')) missingRequiredRows++;
  }

  // Duplicates by email (contact) or name (company).
  const dupKeyField = target === 'contact' ? 'email' : 'name';
  const dupHeader = fieldToHeader[dupKeyField];
  const seen = new Map();
  let duplicateRows = 0;
  if (dupHeader) {
    for (const r of rows) {
      const k = norm(r[dupHeader]);
      if (!k) continue;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    for (const n of seen.values()) if (n > 1) duplicateRows += n - 1;
  }

  // Jammed data heuristics.
  const jammed = [];
  const emailH = fieldToHeader.email;
  if (emailH) {
    const multi = rows.filter(r => /[;,]/.test(r[emailH] || '')).length;
    const bad = rows.filter(r => { const v = String(r[emailH] || '').trim(); return v && !/[;,]/.test(v) && !EMAIL_RE.test(v); }).length;
    if (multi) jammed.push({ type: 'multi-email', field: 'email', count: multi, label: `${multi} rows have multiple emails jammed in one cell` });
    if (bad) jammed.push({ type: 'bad-email', field: 'email', count: bad, label: `${bad} rows have an email that is not valid` });
  }
  const firstH = fieldToHeader.firstName;
  if (target === 'contact' && firstH && !fieldToHeader.lastName) {
    const full = rows.filter(r => /\s/.test(String(r[firstH] || '').trim())).length;
    if (full) jammed.push({ type: 'full-name', field: 'firstName', count: full, label: `${full} rows look like a full name in one field - Ardovo can split them` });
  }
  const phoneH = fieldToHeader.phone;
  if (phoneH) {
    const messy = rows.filter(r => { const v = String(r[phoneH] || '').trim(); return v && /[a-zA-Z]/.test(v); }).length;
    if (messy) jammed.push({ type: 'bad-phone', field: 'phone', count: messy, label: `${messy} rows have letters in the phone number` });
  }

  const cleanRows = rows.length - missingRequiredRows;
  const readiness = rows.length ? Math.max(0, Math.round((cleanRows / rows.length) * 100) - Math.min(20, duplicateRows) - jammed.length * 2) : 0;

  return {
    total: rows.length,
    unmapped, missingTargets, fillRates, missingRequiredRows, duplicateRows, jammed,
    readiness: Math.max(0, Math.min(100, readiness)),
  };
}

/* ============================================================
   INFER TARGET  (guess contact vs company from the headers)
   Used when a customer drops a file without telling us what it is.
   ============================================================ */
export function inferTarget(headers = []) {
  const nh = headers.map(norm);
  const has = (list) => list.some(x => nh.some(h => h === x || h.includes(x)));
  const companyish = has(['company name', 'account name', 'industry', 'domain', 'website', 'employees', 'headcount']);
  const personish = has(['first name', 'last name', 'email', 'e-mail', 'job title', 'phone', 'mobile']);
  if (companyish && !personish) return 'company';
  return 'contact';
}

/* ============================================================
   CUSTOM FIELD SUGGESTIONS  (what to do with columns that do not map)
   Instead of dropping an unmapped column, Mira can propose creating a custom
   field on the target object so no data is lost. We infer a sensible type and
   report fill rate + samples so the customer can approve at a glance.
   ============================================================ */
const NUM_RE = /^-?\$?\s*[\d,]+(\.\d+)?%?$/;
const DATE_RE = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
function inferType(values) {
  const v = values.map(x => String(x || '').trim()).filter(Boolean);
  if (!v.length) return 'text';
  const all = (re) => v.every(x => re.test(x));
  const most = (fn) => v.filter(fn).length / v.length > 0.7;
  if (most(x => /^(true|false|yes|no|y|n|0|1)$/i.test(x))) return 'boolean';
  if (all(NUM_RE) || most(x => NUM_RE.test(x))) return 'number';
  if (most(x => DATE_RE.test(x))) return 'date';
  const distinct = new Set(v.map(x => x.toLowerCase()));
  if (distinct.size <= Math.max(2, Math.min(8, v.length / 4)) && distinct.size < v.length) return 'select';
  return 'text';
}
function toFieldKey(label) {
  return String(label || 'field').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}

// Return one suggestion per UNMAPPED, non-empty column.
export function suggestCustomFields({ headers = [], rows = [], mapping = {}, target = 'contact' } = {}) {
  const out = [];
  for (const h of headers) {
    if (mapping[h]) continue; // already mapped to a real field
    const values = rows.map(r => r[h]);
    const filled = values.filter(x => String(x || '').trim() !== '').length;
    if (!filled) continue; // nothing there, safe to skip
    const type = inferType(values);
    const samples = [...new Set(values.map(x => String(x || '').trim()).filter(Boolean))].slice(0, 4);
    const options = type === 'select'
      ? [...new Set(values.map(x => String(x || '').trim()).filter(Boolean))].slice(0, 20)
      : undefined;
    out.push({
      sourceHeader: h,
      key: toFieldKey(h),
      label: h.trim(),
      type,
      target,
      options,
      fillRate: rows.length ? Math.round((filled / rows.length) * 100) : 0,
      samples,
    });
  }
  return out;
}

/* ============================================================
   CUSTOM FIELD STORE  (definitions the migration "created" per object)
   Keyed by object type. Persisted so the wizard can show real custom fields
   that now exist on the Contact / Company / Deal / Quote view.
   ============================================================ */
const CF_KEY = 'rally_custom_fields_v1';
export const CUSTOM_TARGETS = [
  { key: 'contact', label: 'Contact view' },
  { key: 'company', label: 'Account view' },
  { key: 'deal', label: 'Deal view' },
  { key: 'quote', label: 'Quote view' },
];
function loadCustom() {
  try { const raw = localStorage.getItem(CF_KEY); if (raw) { const o = JSON.parse(raw); return (o && typeof o === 'object') ? o : {}; } } catch {}
  return {};
}
let customState = loadCustom();
const customSubs = new Set();
function commitCustom(next) {
  customState = next && typeof next === 'object' ? next : {};
  try { localStorage.setItem(CF_KEY, JSON.stringify(customState)); } catch {}
  customSubs.forEach(fn => fn(customState));
}
export function getCustomFields(target = 'contact') {
  return Array.isArray(customState[target]) ? customState[target] : [];
}
export function addCustomField(target, def) {
  const list = getCustomFields(target);
  const key = def.key || toFieldKey(def.label);
  if (list.some(f => f.key === key)) return list.find(f => f.key === key);
  const entry = { key, label: def.label || key, type: def.type || 'text', options: def.options || undefined, createdAt: new Date().toISOString(), source: 'migration' };
  commitCustom({ ...customState, [target]: [...list, entry] });
  return entry;
}
export function useCustomFields(target = 'contact') {
  const [snap, setSnap] = useState(() => getCustomFields(target));
  useEffect(() => { const fn = () => setSnap(getCustomFields(target)); customSubs.add(fn); fn(); return () => customSubs.delete(fn); }, [target]);
  return snap;
}

/* ============================================================
   BUILD STAGED RECORDS  (apply cleanse options, non-destructive)
   options: { splitNames, dedupe, fixEmails, dropMissingRequired }
   customMap: { sourceHeader: customFieldKey } - unmapped columns the customer
   chose to keep as custom fields. Their values ride along under rec.custom.
   ============================================================ */
export function buildStaged({ rows, mapping, target = 'contact', options = {}, customMap = {} } = {}) {
  const fieldToHeader = {};
  for (const [h, f] of Object.entries(mapping)) if (f) fieldToHeader[f] = h;
  const tfields = TARGETS[target].fields;
  const requiredKeys = tfields.filter(f => f.required).map(f => f.key);
  const customEntries = Object.entries(customMap).filter(([, k]) => k);

  let records = rows.map(r => {
    const rec = {};
    for (const f of tfields) {
      const h = fieldToHeader[f.key];
      rec[f.key] = h ? String(r[h] || '').trim() : '';
    }
    if (customEntries.length) {
      rec.custom = {};
      for (const [h, k] of customEntries) rec.custom[k] = String(r[h] || '').trim();
    }
    // Split a full name into first + last.
    if (options.splitNames && target === 'contact' && rec.firstName && !rec.lastName && /\s/.test(rec.firstName)) {
      const parts = rec.firstName.split(/\s+/);
      rec.firstName = parts.shift();
      rec.lastName = parts.join(' ');
    }
    // Normalize email: take the first, lowercase.
    if (options.fixEmails && rec.email) {
      rec.email = rec.email.split(/[;,]/)[0].trim().toLowerCase();
    }
    return rec;
  });

  // Drop rows missing a required value.
  const problems = { droppedMissing: 0, droppedDupes: 0 };
  if (options.dropMissingRequired) {
    const before = records.length;
    records = records.filter(rec => requiredKeys.every(k => String(rec[k] || '').trim() !== ''));
    problems.droppedMissing = before - records.length;
  }
  // Dedupe by email/name.
  if (options.dedupe) {
    const key = target === 'contact' ? 'email' : 'name';
    const seen = new Set();
    const before = records.length;
    records = records.filter(rec => {
      const k = norm(rec[key]);
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    problems.droppedDupes = before - records.length;
  }
  return { records, problems };
}

/* ============================================================
   APPLY TO PRODUCTION  (the only place writers fire)
   ============================================================ */
export function applyToProduction({ records, target = 'contact' }) {
  let created = 0, failed = 0;
  if (target === 'company') {
    for (const rec of records) {
      const r = createCompany({ name: rec.name, industry: rec.industry, size: rec.size, domain: rec.domain, location: rec.location, custom: rec.custom });
      if (r.company) created++; else failed++;
    }
    return { created, failed };
  }
  // contacts: upsert company by name, attach.
  const companyByName = new Map(getCompanies().map(c => [norm(c.name), c.id]));
  for (const rec of records) {
    let companyId = null;
    if (rec.company) {
      const key = norm(rec.company);
      companyId = companyByName.get(key) || null;
      if (!companyId) {
        const cr = createCompany({ name: rec.company });
        if (cr.company) { companyId = cr.company.id; companyByName.set(key, companyId); }
      }
    }
    const r = createContact({ firstName: rec.firstName, lastName: rec.lastName, email: rec.email, phone: rec.phone, title: rec.title, companyId, custom: rec.custom });
    if (r.contact) created++; else failed++;
  }
  return { created, failed };
}

/* ============================================================
   JOB STORE  (persist the wizard progress)
   ============================================================ */
function freshState() { return { jobs: [] }; }
function normalize(s) { return { jobs: Array.isArray(s?.jobs) ? s.jobs : [] }; }
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  return freshState();
}
let state = load();
const subs = new Set();
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function useMigrationJobs(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
let idc = Date.now();
export function recordJob(job) {
  const entry = { id: `job_${(idc++).toString(36)}`, at: new Date().toISOString(), ...job };
  commit({ jobs: [entry, ...state.jobs] });
  return entry;
}

/* A small sample export so the wizard is never a dead end without a file. */
export const SAMPLE_CSV = [
  'Full Name,Email,Phone,Job Title,Account',
  'Jordan Avery,jordan.avery@northwind.com,555-201-3345,VP Sales,Northwind Traders',
  'sam diaz,sam.diaz@atlasfreight.com; sam@personal.com,555 990 1188,Ops Lead,Atlas Freight',
  'Priya Rao,priya@cascadehealth.com,call me,CFO,Cascade Health',
  'Jordan Avery,jordan.avery@northwind.com,555-201-3345,VP Sales,Northwind Traders',
  'Owen Cole,owen(at)ironclad.com,555-777-2020,IT Director,Ironclad Aerospace',
].join('\n');
