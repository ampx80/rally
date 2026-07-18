// ============================================================
// ARDOVO FORMS ENGINE  (local-first, Supabase-swappable)
// A HubSpot-class form engine. A form is a named collection of
// typed fields, each field optionally MAPPED to a contact property.
// A public hosted page (/f/:formId) renders the form; on submit it
// CREATES a real contact through the core store and LOGS the raw
// submission back onto the form. Owners also get an embed snippet
// (iframe) and a hosted link they can share anywhere.
//
// This slice is ADDITIVE. It only READS field defs from the contact
// registry (for the property picker) and WRITES contacts through the
// existing store writers (createContact / updateContact). It never
// mutates store.js / fields.js state directly.
//
// Same pub/sub, deterministic-seed, localStorage-backed pattern as
// store.js / lists.js / marketing-campaigns.js so it feels alive with
// no backend. Live equivalent would be a rally_forms table +
// rally_form_submissions table.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { createContact, updateContact, getContact } from './store.js';

const LS_KEY = 'rally_forms_v1';   // bump to force a clean reseed
const nowIso = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------
   FIELD TYPES  (the palette the builder offers). Kept small and
   contact-shaped so a mapped field lands cleanly on a record.
   ------------------------------------------------------------ */
export const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];
export const fieldTypeLabel = (t) => FIELD_TYPES.find(x => x.value === t)?.label || t;
export const typeNeedsOptions = (t) => t === 'select';

/* ------------------------------------------------------------
   CONTACT PROPERTY MAP TARGETS.
   Core keys pass straight into createContact(); the rest are patched
   on afterward via updateContact (real registry columns / fieldValues).
   '__none' = collected + logged on the submission, but not written to
   the contact record.
   ------------------------------------------------------------ */
export const CONTACT_PROPERTIES = [
  { key: 'firstName', label: 'First name', core: true },
  { key: 'lastName', label: 'Last name', core: true },
  { key: 'email', label: 'Email', core: true },
  { key: 'phone', label: 'Phone', core: true },
  { key: 'title', label: 'Job title', core: true },
  { key: 'companyName', label: 'Company', core: false },
  { key: 'leadSource', label: 'Lead source', core: false },
  { key: 'lifecycleStage', label: 'Lifecycle stage', core: false },
  { key: '__none', label: 'Do not map (collect only)', core: false },
];
const CORE_KEYS = new Set(CONTACT_PROPERTIES.filter(p => p.core).map(p => p.key));
export const propertyLabel = (k) => CONTACT_PROPERTIES.find(p => p.key === k)?.label || k;

/* Sensible default map target for a freshly added field, by type. */
export function defaultMapForType(type) {
  if (type === 'email') return 'email';
  if (type === 'phone') return 'phone';
  return '__none';
}

/* ------------------------------------------------------------
   SLUG + ID helpers
   ------------------------------------------------------------ */
function slugify(s) {
  return String(s || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}
function uniqueFieldId(base, taken) {
  let id = base, n = 2;
  const set = new Set(taken);
  while (set.has(id)) id = `${base}_${n++}`;
  return id;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* A blank field the builder can hydrate. */
export function blankField(type = 'text') {
  return {
    id: newId('fld'),
    label: '',
    type,
    required: false,
    placeholder: '',
    help: '',
    options: [],
    mapTo: defaultMapForType(type),
  };
}

/* ============================================================
   SEED  (two published forms so the hub is never empty)
   ============================================================ */
function buildSeed() {
  const contactForm = {
    id: 'form_contact_sales',
    name: 'Contact sales',
    slug: 'contact-sales',
    status: 'published',
    description: 'Route inbound demo requests straight into the pipeline.',
    style: { accent: '#5b4bf5', theme: 'dark', buttonLabel: 'Request a demo', successTitle: 'Thanks, we will be in touch.', successBody: 'A member of the team will reach out within one business day.' },
    notifyEmail: '',
    fields: [
      { id: 'f_first', label: 'First name', type: 'text', required: true, placeholder: 'Jordan', help: '', options: [], mapTo: 'firstName' },
      { id: 'f_last', label: 'Last name', type: 'text', required: false, placeholder: 'Rivera', help: '', options: [], mapTo: 'lastName' },
      { id: 'f_email', label: 'Work email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email' },
      { id: 'f_company', label: 'Company', type: 'text', required: false, placeholder: 'Acme Inc', help: '', options: [], mapTo: 'companyName' },
      { id: 'f_size', label: 'Team size', type: 'select', required: false, placeholder: '', help: '', options: ['1-10', '11-50', '51-200', '201-1000', '1000+'], mapTo: '__none' },
      { id: 'f_notes', label: 'What are you looking to solve?', type: 'textarea', required: false, placeholder: '', help: 'Optional, helps us prep the call.', options: [], mapTo: '__none' },
    ],
    submissions: [
      { id: 'sub_seed_1', at: new Date(Date.now() - 2 * 86400000).toISOString(), data: { f_first: 'Dana', f_last: 'Okafor', f_email: 'dana@northloop.io', f_company: 'Northloop', f_size: '51-200', f_notes: 'Evaluating a Salesforce replacement.' }, contactId: null },
      { id: 'sub_seed_2', at: new Date(Date.now() - 6 * 3600000).toISOString(), data: { f_first: 'Marco', f_last: 'Bianchi', f_email: 'marco@vela.co', f_company: 'Vela', f_size: '11-50', f_notes: 'Want to see Rook live.' }, contactId: null },
    ],
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: nowIso(),
  };
  const newsletter = {
    id: 'form_newsletter',
    name: 'Newsletter signup',
    slug: 'newsletter',
    status: 'published',
    description: 'A single-field capture for the footer and blog.',
    style: { accent: '#0ea5a3', theme: 'dark', buttonLabel: 'Subscribe', successTitle: 'You are on the list.', successBody: 'Watch your inbox for the next drop.' },
    notifyEmail: '',
    fields: [
      { id: 'n_email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email' },
    ],
    submissions: [
      { id: 'sub_seed_3', at: new Date(Date.now() - 26 * 3600000).toISOString(), data: { n_email: 'reader@substack.example' }, contactId: null },
    ],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: nowIso(),
  };
  return { seededAt: nowIso(), forms: [contactForm, newsletter] };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetForms() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

// Subscribe to the forms slice. Submission -> contact resolution also depends
// on the core store; a view that resolves created contacts should also call
// useStore() so it re-renders when the book of business changes.
export function useForms(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

/* ============================================================
   READ API
   ============================================================ */
export const getForms = () => state.forms;
export const getForm = (id) => state.forms.find(f => f.id === id) || null;
export const getFormBySlug = (slug) => state.forms.find(f => f.slug === slug) || null;

// Accept either an id or a slug (hosted URLs may carry either).
export function resolveForm(idOrSlug) {
  return getForm(idOrSlug) || getFormBySlug(idOrSlug);
}

export function formStats() {
  const fs = state.forms;
  const submissions = fs.reduce((s, f) => s + (f.submissions ? f.submissions.length : 0), 0);
  const contacts = fs.reduce((s, f) => s + (f.submissions || []).filter(x => x.contactId).length, 0);
  return {
    total: fs.length,
    published: fs.filter(f => f.status === 'published').length,
    submissions,
    contacts,
  };
}
export const formSubmissionCount = (f) => (f && f.submissions ? f.submissions.length : 0);

/* ============================================================
   HOSTED URL + EMBED SNIPPET
   origin defaults to the live location when available.
   ============================================================ */
function safeOrigin(origin) {
  if (origin) return String(origin).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location) return window.location.origin;
  return 'https://ardovo.com';
}
export function hostedUrl(form, origin) {
  if (!form) return '';
  return `${safeOrigin(origin)}/f/${form.id}`;
}
export function embedSnippet(form, origin) {
  if (!form) return '';
  const url = hostedUrl(form, origin);
  const title = String(form.name || 'Ardovo form').replace(/"/g, '&quot;');
  return [
    `<!-- Ardovo form: ${title} -->`,
    `<iframe src="${url}"`,
    `        title="${title}"`,
    `        width="100%" height="640" loading="lazy"`,
    `        style="border:0;max-width:560px;width:100%;background:transparent;"></iframe>`,
  ].join('\n');
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
const normStatus = (s) => (s === 'published' ? 'published' : 'draft');

// SUPABASE: from('rally_forms').insert(row).select().single()
export function createForm({ name = '', description = '', fields = null, style = null, status = 'draft', notifyEmail = '' } = {}) {
  const nm = String(name || '').trim();
  if (!nm) return { error: 'name', message: 'Name your form.' };
  const f = {
    id: newId('form'),
    name: nm,
    slug: uniqueSlug(slugify(nm)),
    status: normStatus(status),
    description: String(description || ''),
    style: {
      accent: (style && style.accent) || '#5b4bf5',
      theme: (style && style.theme) || 'dark',
      buttonLabel: (style && style.buttonLabel) || 'Submit',
      successTitle: (style && style.successTitle) || 'Thanks for reaching out.',
      successBody: (style && style.successBody) || 'We will be in touch shortly.',
    },
    notifyEmail: String(notifyEmail || '').trim(),
    fields: Array.isArray(fields) && fields.length ? fields.map(normField) : [
      { id: 'f_email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email' },
    ],
    submissions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, forms: [f, ...state.forms] });
  return { form: f };
}

function uniqueSlug(base) {
  const taken = new Set(state.forms.map(f => f.slug));
  let slug = base, n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

// Normalize an inbound field def (from the builder) into the stored shape.
export function normField(raw = {}) {
  const type = FIELD_TYPES.some(t => t.value === raw.type) ? raw.type : 'text';
  const label = String(raw.label || '').trim() || 'Untitled field';
  return {
    id: raw.id || newId('fld'),
    label,
    type,
    required: !!raw.required,
    placeholder: String(raw.placeholder || ''),
    help: String(raw.help || ''),
    options: typeNeedsOptions(type)
      ? (Array.isArray(raw.options) ? raw.options.map(o => String(o).trim()).filter(Boolean) : [])
      : [],
    mapTo: raw.mapTo && CONTACT_PROPERTIES.some(p => p.key === raw.mapTo) ? raw.mapTo : '__none',
  };
}

export function updateForm(id, patch = {}) {
  const f = getForm(id);
  if (!f) return { error: 'missing', message: 'Form not found.' };
  const next = { ...f, ...patch };
  if (typeof next.name === 'string') next.name = next.name.trim();
  if (!next.name) return { error: 'name', message: 'Name your form.' };
  if (patch.status != null) next.status = normStatus(patch.status);
  if (Array.isArray(patch.fields)) next.fields = patch.fields.map(normField);
  if (patch.style) next.style = { ...f.style, ...patch.style };
  if (typeof patch.notifyEmail === 'string') next.notifyEmail = patch.notifyEmail.trim();
  // Preserve identity fields the caller should not clobber.
  next.id = f.id; next.slug = f.slug; next.submissions = f.submissions; next.createdAt = f.createdAt;
  next.updatedAt = nowIso();
  commit({ ...state, forms: state.forms.map(x => x.id === id ? next : x) });
  return { form: next };
}

export function deleteForm(id) {
  const f = getForm(id);
  if (!f) return { error: 'missing', message: 'Form not found.' };
  commit({ ...state, forms: state.forms.filter(x => x.id !== id) });
  return { ok: true, id };
}

export function duplicateForm(id) {
  const f = getForm(id);
  if (!f) return { error: 'missing', message: 'Form not found.' };
  const copy = {
    ...f,
    id: newId('form'),
    name: `${f.name} (copy)`,
    slug: uniqueSlug(slugify(`${f.name}-copy`)),
    status: 'draft',
    fields: (f.fields || []).map(x => ({ ...x, options: [...(x.options || [])] })),
    submissions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, forms: [copy, ...state.forms] });
  return { form: copy };
}

export function setFormStatus(id, status) { return updateForm(id, { status }); }

/* ------------------------------------------------------------
   SUBMISSION -> CONTACT
   Validate against the field defs, then create a real contact via the
   store from the mapped values and log the raw submission. Returns
   { ok, contact, submission } or { error, message, errors }.
   ------------------------------------------------------------ */
export function validateSubmission(form, values = {}) {
  const errors = {};
  for (const fd of form.fields || []) {
    const v = values[fd.id];
    const empty = v == null || v === '' || v === false;
    if (fd.required && empty && fd.type !== 'checkbox') { errors[fd.id] = `${fd.label} is required.`; continue; }
    if (fd.required && fd.type === 'checkbox' && !v) { errors[fd.id] = `${fd.label} is required.`; continue; }
    if (empty) continue;
    if (fd.type === 'email' && !EMAIL_RE.test(String(v))) { errors[fd.id] = 'Enter a valid email address.'; continue; }
    if (fd.type === 'phone' && String(v).replace(/\D/g, '').length < 7) { errors[fd.id] = 'Enter a valid phone number.'; continue; }
    if (fd.type === 'number' && !Number.isFinite(Number(v))) { errors[fd.id] = 'Enter a number.'; continue; }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// Pull mapped values into { core, extra } buckets for the store writers.
function bucketValues(form, values) {
  const core = {}; const extra = {};
  for (const fd of form.fields || []) {
    const mapTo = fd.mapTo;
    if (!mapTo || mapTo === '__none') continue;
    const v = values[fd.id];
    if (v == null || v === '') continue;
    if (CORE_KEYS.has(mapTo)) core[mapTo] = v;
    else extra[mapTo] = v;
  }
  return { core, extra };
}

// Best-effort first-name derivation so createContact (which requires a first
// name) always succeeds from a public submission that may only carry an email.
function deriveFirstName(core, values, form) {
  if (core.firstName && String(core.firstName).trim()) return String(core.firstName).trim();
  // Any text field literally labeled "name" -> use its first token.
  const nameField = (form.fields || []).find(f => /name/i.test(f.label) && (f.type === 'text'));
  if (nameField && values[nameField.id]) return String(values[nameField.id]).trim().split(/\s+/)[0];
  const email = core.email || Object.values(values).find(v => EMAIL_RE.test(String(v)));
  if (email) return String(email).split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/)[0] || 'Lead';
  return 'New lead';
}

export function submitForm(idOrSlug, values = {}) {
  const form = resolveForm(idOrSlug);
  if (!form) return { error: 'missing', message: 'Form not found.' };
  const v = validateSubmission(form, values);
  if (!v.ok) return { error: 'validation', message: 'Please fix the highlighted fields.', errors: v.errors };

  const { core, extra } = bucketValues(form, values);
  core.firstName = deriveFirstName(core, values, form);

  let contactId = null;
  const created = createContact({
    firstName: core.firstName,
    lastName: core.lastName || '',
    email: core.email || '',
    phone: core.phone || '',
    title: core.title || '',
  });
  if (created && created.contact) {
    contactId = created.contact.id;
    // Direct registry columns + a leadSource stamp + a back-reference so the
    // record shows where it came from. fieldValues carries anything else mapped.
    const patch = {
      leadSource: extra.leadSource || `Form: ${form.name}`,
      lifecycleStage: extra.lifecycleStage || 'lead',
      fieldValues: { formId: form.id, formName: form.name },
    };
    if (extra.companyName) patch.companyName = extra.companyName;
    updateContact(contactId, patch);
  }

  const submission = {
    id: newId('sub'),
    at: nowIso(),
    data: { ...values },
    contactId,
  };
  const next = { ...form, submissions: [submission, ...(form.submissions || [])], updatedAt: nowIso() };
  commit({ ...state, forms: state.forms.map(x => x.id === form.id ? next : x) });
  return { ok: true, contact: created ? created.contact : null, submission };
}

// Resolve the created contact record for a submission (or null).
export function submissionContact(submission) {
  return submission && submission.contactId ? getContact(submission.contactId) : null;
}

// Fire-and-forget owner notification. Never throws, never blocks the visitor.
// Env-gated end to end: the /api/form-notify route is a safe no-op without
// RESEND_API_KEY (api/_lib-email.js returns { skipped: 'no-api-key' }).
export function notifyOwner(form, values, origin) {
  if (!form || !form.notifyEmail || typeof fetch !== 'function') return;
  const labeled = (form.fields || [])
    .filter(fd => values[fd.id] != null && values[fd.id] !== '')
    .map(fd => ({ label: fd.label, value: String(values[fd.id]) }));
  try {
    fetch('/api/form-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: form.notifyEmail, formName: form.name, fields: labeled, sourceUrl: hostedUrl(form, origin) }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never blocks the submit */ }
}
