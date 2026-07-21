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
import {
  createContact, createCompany, createDeal, getContacts, getCompanies,
  deleteContact, deleteCompany, deleteDeal,
} from './store.js';
import { parseAny, fuzzyAutoMap, inferColumnType } from './migration-parse.js';
import {
  normalizeValue, validateRecord, fuzzyDedupe, linkAcrossDatasets,
  beginBatch, recordCreated, commitBatch, listBatches, getBatch, undoBatch, useBatches,
} from './migration-quality.js';

// Re-export the deeper engine so the wizard imports from one place.
export { parseAny, inferColumnType, normalizeValue, validateRecord, useBatches, listBatches, getBatch };

const LS_KEY = 'rally_migration_v1';

/* ============================================================
   TARGET SCHEMAS  (what we are mapping INTO)
   ============================================================ */
export const TARGETS = {
  contact: {
    label: 'Contacts', icon: 'users',
    fields: [
      { key: 'firstName', label: 'First name', required: true, type: 'name', synonyms: ['first name', 'firstname', 'first', 'fname', 'given name', 'given', 'full name', 'fullname', 'name', 'contact name', 'contact'] },
      { key: 'lastName', label: 'Last name', type: 'name', synonyms: ['last name', 'lastname', 'last', 'lname', 'surname', 'family name'] },
      { key: 'email', label: 'Email', required: true, type: 'email', synonyms: ['email', 'e-mail', 'email address', 'work email', 'mail', 'contact email'] },
      { key: 'phone', label: 'Phone', type: 'phone', synonyms: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel', 'work phone', 'direct'] },
      { key: 'title', label: 'Title', type: 'text', synonyms: ['title', 'job title', 'role', 'position', 'designation'] },
      { key: 'company', label: 'Company', type: 'text', synonyms: ['company', 'company name', 'account', 'account name', 'organization', 'organisation', 'employer', 'business'] },
    ],
  },
  company: {
    label: 'Companies', icon: 'building',
    fields: [
      { key: 'name', label: 'Company name', required: true, type: 'text', synonyms: ['name', 'company', 'company name', 'account', 'account name', 'organization', 'organisation', 'business'] },
      { key: 'industry', label: 'Industry', type: 'text', synonyms: ['industry', 'sector', 'vertical'] },
      { key: 'size', label: 'Size', type: 'text', synonyms: ['size', 'company size', 'employees', 'headcount', 'employee count'] },
      { key: 'domain', label: 'Website', type: 'url', synonyms: ['website', 'domain', 'url', 'web', 'site'] },
      { key: 'location', label: 'Location', type: 'text', synonyms: ['location', 'city', 'address', 'region', 'country', 'state'] },
    ],
  },
  deal: {
    label: 'Deals', icon: 'target',
    fields: [
      { key: 'name', label: 'Deal name', required: true, type: 'text', synonyms: ['deal', 'deal name', 'opportunity', 'opportunity name', 'name', 'title'] },
      { key: 'company', label: 'Account', type: 'text', synonyms: ['company', 'account', 'account name', 'company name', 'organization', 'customer', 'client'] },
      { key: 'value', label: 'Value', type: 'currency', synonyms: ['value', 'amount', 'deal value', 'deal size', 'revenue', 'acv', 'arr', 'mrr', 'price', 'total'] },
      { key: 'stage', label: 'Stage', type: 'select', synonyms: ['stage', 'status', 'deal stage', 'pipeline stage', 'phase'] },
      { key: 'closeDate', label: 'Close date', type: 'date', synonyms: ['close date', 'closing date', 'expected close', 'close', 'won date', 'expected close date'] },
      { key: 'contactEmail', label: 'Primary contact email', type: 'email', synonyms: ['contact', 'contact email', 'primary contact', 'email', 'owner email'] },
    ],
  },
};

// Deal stage strings map onto Ardovo pipeline stage ids.
const STAGE_SYNS = {
  lead: ['lead', 'new', 'open', 'prospect', 'prospecting'],
  qualified: ['qualified', 'sql', 'mql', 'discovery', 'demo'],
  proposal: ['proposal', 'quote', 'proposed', 'proposal sent'],
  negotiation: ['negotiation', 'negotiating', 'contract', 'contract sent', 'commit'],
  won: ['won', 'closed won', 'closedwon', 'closed-won', 'win', 'closed'],
  lost: ['lost', 'closed lost', 'closedlost', 'closed-lost', 'dead', 'no', 'churned'],
};
function mapStage(v) {
  const n = norm(v);
  if (!n) return 'lead';
  for (const [id, list] of Object.entries(STAGE_SYNS)) if (list.some(x => n === x || n.includes(x))) return id;
  return 'lead';
}

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
// Kept for back-compat. Now delegates to parseAny, which also handles TSV,
// semicolon/pipe delimited, quoted fields, CRLF, and JSON arrays.
export function parseCsv(text) {
  const r = parseAny(text || '');
  return { headers: r.headers, rows: r.rows };
}

/* ============================================================
   AUTO-MAP  header -> target field
   ============================================================ */
export function autoMap(headers, target = 'contact', rows = []) {
  return mapDetails(headers, target, rows).mapping;
}

// Full mapping detail: mapping + per-header confidence (0..1) + a human reason
// + the runner-up field, powered by value-aware fuzzy matching. The wizard uses
// confidence to show how sure Mira is and to surface "did you mean" fixes.
export function mapDetails(headers, target = 'contact', rows = []) {
  const fields = (TARGETS[target]?.fields || []).map(f => ({
    key: f.key, label: f.label, required: !!f.required, type: f.type, synonyms: f.synonyms,
  }));
  try {
    return fuzzyAutoMap(headers, fields, { rows });
  } catch {
    const mapping = {}; headers.forEach(h => { mapping[h] = ''; });
    return { mapping, confidence: {}, reasons: {}, secondBest: {} };
  }
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

  let normalized = 0;
  let records = rows.map(r => {
    const rec = {};
    for (const f of tfields) {
      const h = fieldToHeader[f.key];
      let v = h ? String(r[h] || '').trim() : '';
      // Deep-normalize typed values (phone, url, date, currency, boolean, and
      // email when the fix-emails toggle is on). splitNames handles names below.
      if (v && f.type && f.type !== 'name' && f.type !== 'text' && f.type !== 'select') {
        if (f.type !== 'email' || options.fixEmails !== false) {
          const res = normalizeValue(f.type, v);
          if (res && res.value !== undefined && res.value !== null) {
            if (res.changed) normalized++;
            v = res.value === '' ? '' : String(res.value);
          }
        }
      }
      rec[f.key] = v;
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
    return rec;
  });

  const problems = { droppedMissing: 0, droppedDupes: 0, normalized };
  // Drop rows missing a required value.
  if (options.dropMissingRequired) {
    const before = records.length;
    records = records.filter(rec => requiredKeys.every(k => String(rec[k] || '').trim() !== ''));
    problems.droppedMissing = before - records.length;
  }
  // Fuzzy-merge duplicates (same email, or close name + same account). Falls
  // back to an exact key pass if the fuzzy engine is unavailable.
  if (options.dedupe) {
    try {
      const res = fuzzyDedupe(records, { target });
      problems.droppedDupes = (res.merged || []).length;
      if (Array.isArray(res.unique)) records = res.unique;
    } catch {
      const key = target === 'contact' ? 'email' : 'name';
      const seen = new Set(); const before = records.length;
      records = records.filter(rec => { const k = norm(rec[key]); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; });
      problems.droppedDupes = before - records.length;
    }
  }
  return { records, problems };
}

/* ============================================================
   CROSS-FILE RELATIONSHIP LINKING
   When several files are dropped (contacts + accounts + deals), find the real
   relationships between them so the customer sees "312 of 340 contacts link to
   an account". files: [{ id, name, target, headers, rows, mapping }].
   ============================================================ */
function mapRows(file) {
  const fieldToHeader = {};
  for (const [h, k] of Object.entries(file.mapping || {})) if (k) fieldToHeader[k] = h;
  return (file.rows || []).map(r => {
    const o = {};
    for (const [k, h] of Object.entries(fieldToHeader)) o[k] = String(r[h] || '').trim();
    if (o.contactEmail && !o.email) o.email = o.contactEmail;
    return o;
  });
}
export function analyzeLinks(files = []) {
  const datasets = (files || []).map(f => ({ id: f.id, name: f.name, target: f.target, rows: mapRows(f) }));
  try { return linkAcrossDatasets(datasets); } catch { return { links: [], summary: [] }; }
}

/* ============================================================
   APPLY TO PRODUCTION  (the only place writers fire)
   ============================================================ */
export function applyToProduction({ records, target = 'contact' }) {
  const batchId = beginBatch({ target, total: records.length });
  let created = 0, failed = 0;

  if (target === 'company') {
    for (const rec of records) {
      const r = createCompany({ name: rec.name, industry: rec.industry, size: rec.size, domain: rec.domain, location: rec.location, custom: rec.custom });
      if (r.company) { created++; recordCreated(batchId, 'company', r.company.id); } else failed++;
    }
    commitBatch(batchId, { created, failed });
    return { created, failed, batchId };
  }

  if (target === 'deal') {
    const companyByName = new Map(getCompanies().map(c => [norm(c.name), c.id]));
    const contactByEmail = new Map(getContacts().filter(c => c.email).map(c => [norm(c.email), c.id]));
    for (const rec of records) {
      let companyId = null;
      if (rec.company) {
        const key = norm(rec.company);
        companyId = companyByName.get(key) || null;
        if (!companyId) { const cr = createCompany({ name: rec.company }); if (cr.company) { companyId = cr.company.id; companyByName.set(key, companyId); recordCreated(batchId, 'company', cr.company.id); } }
      }
      const contactIds = [];
      if (rec.contactEmail) { const cid = contactByEmail.get(norm(rec.contactEmail)); if (cid) contactIds.push(cid); }
      const value = Number(String(rec.value == null ? '' : rec.value).replace(/[^0-9.\-]/g, '')) || 0;
      const r = createDeal({ name: rec.name, companyId, contactIds, value, stage: mapStage(rec.stage), closeDate: rec.closeDate || undefined });
      if (r.deal) { created++; recordCreated(batchId, 'deal', r.deal.id); } else failed++;
    }
    commitBatch(batchId, { created, failed });
    return { created, failed, batchId };
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
        if (cr.company) { companyId = cr.company.id; companyByName.set(key, companyId); recordCreated(batchId, 'company', cr.company.id); }
      }
    }
    const r = createContact({ firstName: rec.firstName, lastName: rec.lastName, email: rec.email, phone: rec.phone, title: rec.title, companyId, custom: rec.custom });
    if (r.contact) { created++; recordCreated(batchId, 'contact', r.contact.id); } else failed++;
  }
  commitBatch(batchId, { created, failed });
  return { created, failed, batchId };
}

/* ============================================================
   ROLLBACK  -  undo a whole migration batch (deletes what it created).
   Decoupled from the store via a deleters map; the batch ledger tracks ids.
   ============================================================ */
export function undoMigration(batchId) {
  return undoBatch(batchId, { contact: deleteContact, company: deleteCompany, deal: deleteDeal });
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
