// ============================================================
// ARDOVO CUSTOM OBJECTS ENGINE
// User-defined object types (like HubSpot / Salesforce custom objects).
// A custom object is a runtime-defined record type: a name, plural, icon,
// and a list of fields built from the SAME field registry primitives as the
// nine built-in objects (src/lib/fields.js - FIELD_TYPES / typeHasOptions).
// Definitions AND records persist to a dedicated localStorage slice
// (rally_custom_objects_v1) with pub/sub, mirroring the store.js / fields.js
// pattern so hooks re-render on every mutation.
//
// ADDITIVE: the built-in objects in fields.js are untouched. This module owns
// everything the user creates. Record values live in record.fieldValues so the
// generic getFieldValue / setFieldValue readers from fields.js work verbatim.
// SUPABASE: rally_custom_objects (definitions) + rally_custom_records (rows,
// jsonb fieldValues), objectType + id unique.
// ASCII hyphens only.
// ============================================================
import { useEffect, useState } from 'react';
import { FIELD_TYPES, typeHasOptions } from './fields.js';

const LS_KEY = 'rally_custom_objects_v1';

/* Icon names that already exist in src/components/icons.jsx, offered as the
   object glyph picker. Kept in sync by hand - unknown names fall back to box. */
export const ICON_CHOICES = [
  'box', 'building', 'users', 'target', 'layers', 'grid', 'list', 'receipt',
  'fileText', 'shield', 'rocket', 'chart', 'pie', 'calendar', 'mail', 'phone',
  'key', 'clock', 'bolt', 'sparkles', 'megaphone', 'checkSquare', 'dollar',
];
export const DEFAULT_ICON = 'box';

/* ------------------------------------------------------------
   Persistence + pub/sub
   Shape: { objects: [def...], records: { [type]: [record...] } }
   ------------------------------------------------------------ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.objects) && s.records && typeof s.records === 'object') return s;
    }
  } catch {}
  return { objects: [], records: {} };
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function getState() { return state; }
export function resetCustomObjects() { commit({ objects: [], records: {} }); }

/* ------------------------------------------------------------
   ids + slugs
   ------------------------------------------------------------ */
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

const camelize = (label) => {
  const words = String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return 'field';
  return words[0] + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('');
};
const slugify = (name) => {
  const s = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'object';
};

/* ------------------------------------------------------------
   Hooks
   ------------------------------------------------------------ */
export function useCustomObjects(selector = (s) => s.objects) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return snap;
}
export function useObjectRecords(type) {
  return useCustomObjects((s) => s.records[type] || []);
}

/* ------------------------------------------------------------
   Definition reads
   ------------------------------------------------------------ */
export const getObjects = () => state.objects;
export const getObject = (type) => state.objects.find(o => o.type === type) || null;
export const getObjectById = (id) => state.objects.find(o => o.id === id) || null;

/* A custom object's fields, in the shape every field-registry consumer
   (FieldInput / formatFieldValue / getFieldValue) already understands. */
export const getObjectFields = (type) => getObject(type)?.fields || [];
export const primaryField = (obj) => obj?.fields.find(f => f.primary) || obj?.fields[0] || null;

/* Human title for a record - the value of the object's primary field. */
export function recordTitle(obj, record) {
  const pf = primaryField(obj);
  const v = pf && record?.fieldValues ? record.fieldValues[pf.key] : undefined;
  const s = v == null ? '' : String(v).trim();
  return s || 'Untitled';
}

/* ------------------------------------------------------------
   Field builder (shared by createObject + addField)
   ------------------------------------------------------------ */
function buildField(existingFields, def = {}, extra = {}) {
  const label = (def.label || '').trim();
  if (!label) return { error: 'label', message: 'A field label is required.' };
  const type = def.type && FIELD_TYPES.some(t => t.id === def.type && !t.systemOnly) ? def.type : null;
  if (!type) return { error: 'type', message: 'Pick a valid field type.' };
  const existingKeys = new Set(existingFields.map(f => f.key));
  let key = camelize(def.key || label);
  let n = 2;
  const base = key;
  while (existingKeys.has(key)) key = base + (n++);
  return {
    field: {
      id: newId('cof'), key, label, type,
      section: (def.section || '').trim() || 'Details',
      options: typeHasOptions(type) ? (def.options || []) : undefined,
      linkTarget: type === 'link' ? (def.linkTarget || 'contact') : undefined,
      required: !!def.required,
      helpText: def.helpText || '',
      createdAt: new Date().toISOString(),
      ...extra,
    },
  };
}

/* ------------------------------------------------------------
   Definition writers
   ------------------------------------------------------------ */
// SUPABASE: from('rally_custom_objects').insert(row)
export function createObject({ name, plural, icon, description } = {}) {
  const nm = (name || '').trim();
  if (!nm) return { error: 'name', message: 'An object name is required.' };
  let type = slugify(nm);
  if (state.objects.some(o => o.type === type)) {
    let n = 2; const base = type;
    while (state.objects.some(o => o.type === type)) type = `${base}-${n++}`;
  }
  // Every object starts with a required primary Name field so records have a
  // title everywhere (list, detail, links). The user adds fields on top.
  const nameField = buildField([], { label: 'Name', type: 'text', section: 'Details', required: true }, { primary: true, system: true }).field;
  const obj = {
    id: newId('obj'), type,
    name: nm,
    plural: (plural || '').trim() || (nm.endsWith('s') ? nm : nm + 's'),
    icon: ICON_CHOICES.includes(icon) ? icon : DEFAULT_ICON,
    description: (description || '').trim(),
    fields: [nameField],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  commit({ ...state, objects: [...state.objects, obj], records: { ...state.records, [type]: [] } });
  return { object: obj };
}

export function updateObject(type, patch = {}) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const next = { ...obj };
  if (patch.name !== undefined) { const v = String(patch.name).trim(); if (!v) return { error: 'name', message: 'An object name is required.' }; next.name = v; }
  if (patch.plural !== undefined) next.plural = String(patch.plural).trim() || next.name + 's';
  if (patch.icon !== undefined) next.icon = ICON_CHOICES.includes(patch.icon) ? patch.icon : next.icon;
  if (patch.description !== undefined) next.description = String(patch.description).trim();
  next.updatedAt = new Date().toISOString();
  commit({ ...state, objects: state.objects.map(o => o.type === type ? next : o) });
  return { object: next };
}

// SUPABASE: cascade delete rally_custom_records where objectType = type
export function deleteObject(type) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const records = { ...state.records }; delete records[type];
  commit({ ...state, objects: state.objects.filter(o => o.type !== type), records });
  return { ok: true, type };
}

/* ------------------------------------------------------------
   Field writers (per object)
   ------------------------------------------------------------ */
export function addField(type, def = {}) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const built = buildField(obj.fields, def);
  if (built.error) return built;
  const next = { ...obj, fields: [...obj.fields, built.field], updatedAt: new Date().toISOString() };
  commit({ ...state, objects: state.objects.map(o => o.type === type ? next : o) });
  return { field: built.field };
}

export function updateField(type, fieldId, patch = {}) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const fd = obj.fields.find(f => f.id === fieldId);
  if (!fd) return { error: 'missing', message: 'Field not found.' };
  const allowed = ['label', 'section', 'options', 'type', 'required', 'helpText', 'linkTarget'];
  const nextFd = { ...fd };
  // The primary field is the record title - keep it a required text field.
  for (const k of allowed) {
    if (patch[k] === undefined) continue;
    if (fd.primary && (k === 'type' || k === 'required')) continue;
    nextFd[k] = patch[k];
  }
  if (typeof nextFd.label === 'string') nextFd.label = nextFd.label.trim();
  if (!nextFd.label) return { error: 'label', message: 'A field label is required.' };
  if (!typeHasOptions(nextFd.type)) delete nextFd.options;
  else if (!nextFd.options) nextFd.options = [];
  const next = { ...obj, fields: obj.fields.map(f => f.id === fieldId ? nextFd : f), updatedAt: new Date().toISOString() };
  commit({ ...state, objects: state.objects.map(o => o.type === type ? next : o) });
  return { field: nextFd };
}

export function removeField(type, fieldId) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const fd = obj.fields.find(f => f.id === fieldId);
  if (!fd) return { error: 'missing', message: 'Field not found.' };
  if (fd.primary) return { error: 'primary', message: 'The primary name field cannot be deleted.' };
  const next = { ...obj, fields: obj.fields.filter(f => f.id !== fieldId), updatedAt: new Date().toISOString() };
  commit({ ...state, objects: state.objects.map(o => o.type === type ? next : o) });
  return { ok: true };
}

/* ------------------------------------------------------------
   Record reads + writers
   Values live in record.fieldValues so fields.js getFieldValue /
   setFieldValue read + patch them generically.
   ------------------------------------------------------------ */
export const getRecords = (type) => state.records[type] || [];
export const getRecord = (type, id) => (state.records[type] || []).find(r => r.id === id) || null;

// SUPABASE: from('rally_custom_records').insert({ objectType, fieldValues })
export function createRecord(type, values = {}) {
  const obj = getObject(type);
  if (!obj) return { error: 'missing', message: 'Object not found.' };
  const now = new Date().toISOString();
  const rec = { id: newId('rec'), fieldValues: { ...values }, createdAt: now, updatedAt: now };
  const list = [rec, ...(state.records[type] || [])];
  commit({ ...state, records: { ...state.records, [type]: list } });
  return { record: rec };
}

export function updateRecord(type, id, patch = {}) {
  const list = state.records[type] || [];
  const rec = list.find(r => r.id === id);
  if (!rec) return { error: 'missing', message: 'Record not found.' };
  const { fieldValues, ...rest } = patch;
  const next = { ...rec, ...rest, updatedAt: new Date().toISOString() };
  if (fieldValues && typeof fieldValues === 'object') {
    next.fieldValues = { ...(rec.fieldValues || {}), ...fieldValues };
  }
  commit({ ...state, records: { ...state.records, [type]: list.map(r => r.id === id ? next : r) } });
  return { record: next };
}

// SUPABASE: from('rally_custom_records').delete().eq('id', id)
export function deleteRecord(type, id) {
  const list = state.records[type] || [];
  if (!list.some(r => r.id === id)) return { error: 'missing', message: 'Record not found.' };
  commit({ ...state, records: { ...state.records, [type]: list.filter(r => r.id !== id) } });
  return { ok: true, id };
}
