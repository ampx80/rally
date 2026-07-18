// ============================================================
// ARDOVO FIELD REGISTRY ENGINE  (spec Section 5.1 - Wave 1)
// Canonical fields and custom fields are the same mechanism: a
// field registry per object with type, section, options, and
// validation. Canonical fields are system-seeded registry rows
// the user cannot delete but can hide. Custom fields persist to
// localStorage (rally_fields_v1) and merge into getFields() so a
// custom field is indistinguishable from a canonical one.
// Record values: fields backed by an existing store column read
// straight off the record; every other value lives in
// record.fieldValues = { key: value }.
// ============================================================
import { useEffect, useState } from 'react';
import { PICKLISTS } from './picklists.js';
import {
  CONTACT_FIELDS, COMPANY_FIELDS, DEAL_FIELDS, QUOTE_FIELDS, PRODUCT_FIELDS,
  CAMPAIGN_FIELDS, TICKET_FIELDS, ACTIVITY_FIELDS, INVOICE_FIELDS,
} from './registry-seeds/index.js';

const LS_KEY = 'rally_fields_v1';

/* ------------------------------------------------------------
   Field types (spec Section 5.1 - 25 canonical + autoNumber,
   tags, ai). sublist + json are system-only carriers for the
   structured spec fields; they are not offered in the custom
   field creator.
   ------------------------------------------------------------ */
export const FIELD_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'textarea', label: 'Long text' },
  { id: 'richtext', label: 'Rich text' },
  { id: 'number', label: 'Number' },
  { id: 'currency', label: 'Currency' },
  { id: 'percent', label: 'Percent' },
  { id: 'duration', label: 'Duration' },
  { id: 'boolean', label: 'Checkbox' },
  { id: 'picklist', label: 'Picklist' },
  { id: 'multiPicklist', label: 'Multi picklist' },
  { id: 'status', label: 'Status (stage-typed)' },
  { id: 'date', label: 'Date' },
  { id: 'datetime', label: 'Date and time' },
  { id: 'timeline', label: 'Timeline (date range)' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'url', label: 'URL' },
  { id: 'address', label: 'Address' },
  { id: 'user', label: 'User (people)' },
  { id: 'link', label: 'Record link' },
  { id: 'mirror', label: 'Mirror (lookup)' },
  { id: 'rollup', label: 'Rollup' },
  { id: 'formula', label: 'Formula' },
  { id: 'rating', label: 'Rating (1-5)' },
  { id: 'files', label: 'Files' },
  { id: 'autoNumber', label: 'Auto number' },
  { id: 'tags', label: 'Tags' },
  { id: 'ai', label: 'AI field' },
  { id: 'sublist', label: 'Sublist', systemOnly: true },
  { id: 'json', label: 'JSON', systemOnly: true },
];
export const CUSTOM_FIELD_TYPES = FIELD_TYPES.filter(t => !t.systemOnly);
export const fieldTypeLabel = (id) => FIELD_TYPES.find(t => t.id === id)?.label || id;
export const typeHasOptions = (type) => type === 'picklist' || type === 'multiPicklist' || type === 'status';

/* ------------------------------------------------------------
   Object types + system registries
   ------------------------------------------------------------ */
export const OBJECT_TYPES = [
  { id: 'contact', label: 'Contact' },
  { id: 'company', label: 'Company' },
  { id: 'deal', label: 'Deal' },
  { id: 'quote', label: 'Quote' },
  { id: 'product', label: 'Product' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'activity', label: 'Activity' },
  { id: 'invoice', label: 'Invoice' },
];
export const objectLabel = (id) => OBJECT_TYPES.find(o => o.id === id)?.label || id;

const SYSTEM_REGISTRY = {
  contact: CONTACT_FIELDS,
  company: COMPANY_FIELDS,
  deal: DEAL_FIELDS,
  quote: QUOTE_FIELDS,
  product: PRODUCT_FIELDS,
  campaign: CAMPAIGN_FIELDS,
  ticket: TICKET_FIELDS,
  activity: ACTIVITY_FIELDS,
  invoice: INVOICE_FIELDS,
};

/* ------------------------------------------------------------
   Custom field persistence + pub/sub
   Shape: { contact: [def, ...], company: [...], ... }
   SUPABASE: rally_fields (registry table, objectType + key unique)
   ------------------------------------------------------------ */
let custom = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
function commit(next) {
  custom = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(custom)); } catch {}
  subs.forEach(fn => fn(custom));
}
export function resetFields() { try { localStorage.removeItem(LS_KEY); } catch {} custom = {}; subs.forEach(fn => fn(custom)); }
export function useFields(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(custom));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(custom); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = () => `cf_${(idc++).toString(36)}`;

const camelize = (label) => {
  const words = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return 'field';
  return words[0] + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('');
};

/* ------------------------------------------------------------
   Registry reads
   ------------------------------------------------------------ */
export const getSystemFields = (objectType) => SYSTEM_REGISTRY[objectType] || [];
export const getCustomFields = (objectType) => custom[objectType] || [];
export const systemFieldCount = (objectType) => getSystemFields(objectType).length;

/* System fields first (spec section order), then custom fields. */
export function getFields(objectType) {
  return [...getSystemFields(objectType), ...getCustomFields(objectType)];
}
export function getField(objectType, key) {
  return getFields(objectType).find(fd => fd.key === key);
}

/* Sections in canonical order, custom-only sections appended.
   Returns [{ section, fields }] for progressive disclosure. */
export function getFieldSections(objectType) {
  const order = [];
  const bySection = new Map();
  for (const fd of getFields(objectType)) {
    const s = fd.section || 'Custom fields';
    if (!bySection.has(s)) { order.push(s); bySection.set(s, []); }
    bySection.get(s).push(fd);
  }
  return order.map(section => ({ section, fields: bySection.get(section) }));
}

/* ------------------------------------------------------------
   Custom field writers
   ------------------------------------------------------------ */
export function addCustomField(objectType, def = {}) {
  if (!SYSTEM_REGISTRY[objectType]) return { error: 'objectType', message: 'Unknown object type.' };
  const label = (def.label || '').trim();
  if (!label) return { error: 'label', message: 'A field label is required.' };
  const type = def.type && FIELD_TYPES.some(t => t.id === def.type && !t.systemOnly) ? def.type : null;
  if (!type) return { error: 'type', message: 'Pick a valid field type.' };
  const existingKeys = new Set(getFields(objectType).map(fd => fd.key));
  let key = def.key ? camelize(def.key) : camelize(label);
  let n = 2;
  while (existingKeys.has(key)) key = camelize(label) + n++;
  const field = {
    id: newId(), key, label, type,
    section: (def.section || '').trim() || 'Custom fields',
    fieldOrder: getCustomFields(objectType).length,
    options: typeHasOptions(type) ? (def.options || []) : undefined,
    linkTarget: type === 'link' ? (def.linkTarget || 'contact') : undefined,
    required: !!def.required,
    helpText: def.helpText || '',
    aiFillPolicy: def.aiFillPolicy || 'suggest',
    system: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...custom, [objectType]: [...getCustomFields(objectType), field] });
  return { field };
}

export function updateCustomField(objectType, id, patch = {}) {
  const list = getCustomFields(objectType);
  const fd = list.find(x => x.id === id);
  if (!fd) return { error: 'missing', message: 'Custom field not found.' };
  const allowed = ['label', 'section', 'options', 'type', 'required', 'helpText', 'aiFillPolicy', 'linkTarget'];
  const next = { ...fd };
  for (const k of allowed) if (patch[k] !== undefined) next[k] = patch[k];
  if (typeof next.label === 'string') next.label = next.label.trim();
  if (!next.label) return { error: 'label', message: 'A field label is required.' };
  if (!typeHasOptions(next.type)) delete next.options;
  else if (!next.options) next.options = [];
  commit({ ...custom, [objectType]: list.map(x => (x.id === id ? next : x)) });
  return { field: next };
}

export function removeCustomField(objectType, id) {
  const list = getCustomFields(objectType);
  if (!list.some(x => x.id === id)) return { error: 'missing', message: 'Custom field not found.' };
  commit({ ...custom, [objectType]: list.filter(x => x.id !== id) });
  return { ok: true };
}

/* ------------------------------------------------------------
   Record values
   System fields backed by a store column read off the record
   (fieldDef.storeKey maps legacy column names); every other
   value lives in record.fieldValues.
   ------------------------------------------------------------ */
export function getFieldValue(record, fieldDef) {
  if (!record || !fieldDef) return undefined;
  if (fieldDef.storeKey && Object.prototype.hasOwnProperty.call(record, fieldDef.storeKey)) return record[fieldDef.storeKey];
  if (Object.prototype.hasOwnProperty.call(record, fieldDef.key)) return record[fieldDef.key];
  return record.fieldValues ? record.fieldValues[fieldDef.key] : undefined;
}

/* Builds the patch for the store's update writers (updateContact,
   updateCompany, updateDeal...). Store-column fields patch the column;
   everything else patches record.fieldValues. */
export function setFieldValue(record, fieldDef, value) {
  if (!record || !fieldDef) return {};
  if (fieldDef.storeKey && Object.prototype.hasOwnProperty.call(record, fieldDef.storeKey)) return { [fieldDef.storeKey]: value };
  if (Object.prototype.hasOwnProperty.call(record, fieldDef.key)) return { [fieldDef.key]: value };
  return { fieldValues: { [fieldDef.key]: value } };
}

/* Option list for a picklist-ish field: inline options win, then the
   shared picklist library. Normalizes strings to { id, label }. */
export function getFieldOptions(fieldDef) {
  if (!fieldDef) return [];
  const raw = (fieldDef.options && fieldDef.options.length ? fieldDef.options : PICKLISTS[fieldDef.picklist]?.values) || [];
  return raw.map(o => (typeof o === 'string' ? { id: o, label: o } : o));
}

/* ------------------------------------------------------------
   Validation (spec 5.3 ships full rules later; this covers
   type-shape validation for Wave 1)
   ------------------------------------------------------------ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateValue(fieldDef, value) {
  if (!fieldDef) return { ok: false, message: 'Unknown field.' };
  const empty = value == null || value === '' || (Array.isArray(value) && !value.length);
  if (empty) {
    if (fieldDef.required) return { ok: false, message: `${fieldDef.label} is required.` };
    return { ok: true };
  }
  const label = fieldDef.label;
  switch (fieldDef.type) {
    case 'number': case 'currency': case 'duration': {
      if (!Number.isFinite(Number(value))) return { ok: false, message: `${label} must be a number.` };
      return { ok: true };
    }
    case 'percent': {
      const n = Number(value);
      if (!Number.isFinite(n)) return { ok: false, message: `${label} must be a number.` };
      if (n < 0 || n > 100) return { ok: false, message: `${label} must be between 0 and 100.` };
      return { ok: true };
    }
    case 'rating': {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 5) return { ok: false, message: `${label} must be 0 to 5.` };
      return { ok: true };
    }
    case 'boolean': {
      if (typeof value === 'boolean' || value === 'true' || value === 'false') return { ok: true };
      return { ok: false, message: `${label} must be true or false.` };
    }
    case 'email': {
      const list = Array.isArray(value) ? value : [value];
      if (list.every(v => EMAIL_RE.test(String(v)))) return { ok: true };
      return { ok: false, message: `${label} must be a valid email address.` };
    }
    case 'phone': {
      const digits = String(value).replace(/\D/g, '');
      if (digits.length >= 7) return { ok: true };
      return { ok: false, message: `${label} must be a valid phone number.` };
    }
    case 'url': {
      const list = Array.isArray(value) ? value : [value];
      if (list.every(v => /^(https?:\/\/)?[^\s]+\.[^\s]+$/i.test(String(v)))) return { ok: true };
      return { ok: false, message: `${label} must be a valid URL.` };
    }
    case 'date': case 'datetime': {
      if (!Number.isNaN(Date.parse(value))) return { ok: true };
      return { ok: false, message: `${label} must be a valid date.` };
    }
    case 'picklist': case 'status': {
      const opts = getFieldOptions(fieldDef);
      if (!opts.length) return { ok: true };
      if (opts.some(o => o.id === value || o.label === value)) return { ok: true };
      return { ok: false, message: `${label} must be one of its picklist values.` };
    }
    case 'multiPicklist': {
      const opts = getFieldOptions(fieldDef);
      const list = Array.isArray(value) ? value : [value];
      if (!opts.length) return { ok: true };
      if (list.every(v => opts.some(o => o.id === v || o.label === v))) return { ok: true };
      return { ok: false, message: `${label} contains a value outside its picklist.` };
    }
    case 'tags': {
      if (Array.isArray(value)) return { ok: true };
      return { ok: false, message: `${label} must be a list of tags.` };
    }
    default:
      return { ok: true };
  }
}
