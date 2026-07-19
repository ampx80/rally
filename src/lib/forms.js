// ============================================================
// ARDOVO FORMS ENGINE  (local-first, Supabase-swappable)
// A best-in-class form engine built to beat Zoho Forms, Typeform,
// and HubSpot Forms. A form is a named collection of typed fields,
// each optionally MAPPED to a contact property, grouped into one or
// more STEPS, with per-field conditional (show/hide) logic.
//
// A public hosted page (/f/:formId) renders the form as a real,
// multi-step widget; on submit it CREATES or UPDATES a real contact
// through the core store, LOGS the submission back onto the form,
// dispatches window events so automations + a payment engine can
// react, and tracks per-form analytics (views, starts, completions,
// per-step drop-off).
//
// This slice is ADDITIVE. It only READS field defs from the contact
// registry (for the property picker) and WRITES contacts through the
// existing store writers (createContact / updateContact). It never
// mutates store.js / fields.js state directly.
//
// Same pub/sub, deterministic-seed, localStorage-backed pattern as
// store.js so it feels alive with no backend. Live equivalent would
// be a rally_forms table + rally_form_submissions table.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { createContact, updateContact, getContact, getContacts } from './store.js';

const LS_KEY = 'rally_forms_v2';   // bump to force a clean reseed
const RATE_KEY = 'rally_forms_rate_v1';
const nowIso = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------
   SPAM PROTECTION CONSTANTS
   Honeypot field name (rendered off-screen), the minimum plausible
   fill time (time-trap), and a client-side rate window.
   ------------------------------------------------------------ */
export const HONEYPOT_FIELD = '_ardovo_hp';
export const MIN_FILL_MS = 2500;
export const RATE_MAX = 5;
export const RATE_WINDOW_MS = 60000;

/* ------------------------------------------------------------
   FIELD TYPES  (the palette the builder offers).
   flags: opts   -> needs an options list (choice fields)
          static -> renders content, collects no value (heading)
          value  -> contributes a value to the submission
          map    -> can be mapped to a contact property
   ------------------------------------------------------------ */
export const FIELD_TYPES = [
  { value: 'text', label: 'Short text', icon: 'fileText', value_: true, map: true },
  { value: 'textarea', label: 'Long text', icon: 'fileText', value_: true, map: true },
  { value: 'email', label: 'Email', icon: 'mail', value_: true, map: true },
  { value: 'phone', label: 'Phone', icon: 'phone', value_: true, map: true },
  { value: 'number', label: 'Number', icon: 'dollar', value_: true, map: true },
  { value: 'select', label: 'Dropdown', icon: 'chevronDown', opts: true, value_: true, map: true },
  { value: 'radio', label: 'Radio (single choice)', icon: 'target', opts: true, value_: true, map: true },
  { value: 'checkboxes', label: 'Checkboxes (multi)', icon: 'checkSquare', opts: true, value_: true, map: true },
  { value: 'checkbox', label: 'Single checkbox', icon: 'check', value_: true, map: true },
  { value: 'date', label: 'Date', icon: 'calendar', value_: true, map: true },
  { value: 'file', label: 'File upload', icon: 'upload', value_: true, map: false },
  { value: 'hidden', label: 'Hidden field', icon: 'eyeOff', value_: true, map: true },
  { value: 'heading', label: 'Section heading', icon: 'list', static: true, value_: false, map: false },
  { value: 'payment', label: 'Payment', icon: 'creditCard', value_: true, map: false },
];
const TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t]));
export const fieldTypeLabel = (t) => TYPE_MAP[t]?.label || t;
export const fieldTypeIcon = (t) => TYPE_MAP[t]?.icon || 'fileText';
export const typeNeedsOptions = (t) => !!TYPE_MAP[t]?.opts;
export const typeIsStatic = (t) => !!TYPE_MAP[t]?.static;
export const typeCollectsValue = (t) => TYPE_MAP[t] ? !!TYPE_MAP[t].value_ : true;
export const typeIsMappable = (t) => !!TYPE_MAP[t]?.map;

/* ------------------------------------------------------------
   CONTACT PROPERTY MAP TARGETS.
   Core keys pass straight into createContact(); the rest are patched
   on afterward via updateContact. '__none' = collected + logged on
   the submission but not written to the contact record.
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
   CONDITIONAL LOGIC OPERATORS
   ------------------------------------------------------------ */
export const LOGIC_OPS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'filled', label: 'is answered' },
  { value: 'empty', label: 'is empty' },
];

/* ------------------------------------------------------------
   SLUG + ID helpers
   ------------------------------------------------------------ */
function slugify(s) {
  return String(s || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* A blank field the builder can hydrate. */
export function blankField(type = 'text') {
  const base = {
    id: newId('fld'),
    label: '',
    type,
    required: false,
    placeholder: '',
    help: '',
    options: typeNeedsOptions(type) ? ['Option 1', 'Option 2'] : [],
    mapTo: defaultMapForType(type),
    step: 0,
    visibleIf: null,
  };
  if (type === 'payment') { base.amount = 25; base.currency = 'USD'; base.amountEditable = false; }
  if (type === 'number') { base.min = ''; base.max = ''; }
  if (type === 'file') { base.accept = ''; base.multiple = false; }
  if (type === 'hidden') { base.defaultValue = ''; base.mapTo = 'leadSource'; }
  return base;
}

/* Normalize a raw conditional-logic rule (or null). */
export function normVisibleIf(raw) {
  if (!raw || !raw.field) return null;
  const op = LOGIC_OPS.some(o => o.value === raw.op) ? raw.op : 'eq';
  const needsValue = op !== 'filled' && op !== 'empty';
  return { field: String(raw.field), op, value: needsValue ? String(raw.value == null ? '' : raw.value) : '' };
}

// Normalize an inbound field def (from the builder) into the stored shape.
export function normField(raw = {}) {
  const type = TYPE_MAP[raw.type] ? raw.type : 'text';
  const label = String(raw.label || '').trim() || (type === 'heading' ? 'Section' : 'Untitled field');
  const f = {
    id: raw.id || newId('fld'),
    label,
    type,
    required: type === 'heading' ? false : !!raw.required,
    placeholder: String(raw.placeholder || ''),
    help: String(raw.help || ''),
    options: typeNeedsOptions(type)
      ? (Array.isArray(raw.options) ? raw.options.map(o => String(o).trim()).filter(Boolean) : [])
      : [],
    mapTo: typeIsMappable(type) && raw.mapTo && CONTACT_PROPERTIES.some(p => p.key === raw.mapTo) ? raw.mapTo : '__none',
    step: Math.max(0, parseInt(raw.step, 10) || 0),
    visibleIf: normVisibleIf(raw.visibleIf),
  };
  if (type === 'payment') {
    f.amount = Math.max(0, Number(raw.amount) || 0);
    f.currency = String(raw.currency || 'USD').toUpperCase().slice(0, 4) || 'USD';
    f.amountEditable = !!raw.amountEditable;
  }
  if (type === 'number') {
    f.min = raw.min === '' || raw.min == null ? '' : Number(raw.min);
    f.max = raw.max === '' || raw.max == null ? '' : Number(raw.max);
  }
  if (type === 'file') {
    f.accept = String(raw.accept || '');
    f.multiple = !!raw.multiple;
  }
  if (type === 'hidden') {
    f.defaultValue = String(raw.defaultValue || '');
  }
  return f;
}

/* ============================================================
   SEED  (three published forms so the hub is never empty; one is a
   multi-step form with a conditional field + a payment step)
   ============================================================ */
function blankAnalytics(seed = {}) {
  return { views: seed.views || 0, starts: seed.starts || 0, completions: seed.completions || 0, steps: seed.steps || {} };
}

function buildSeed() {
  const contactForm = {
    id: 'form_contact_sales',
    name: 'Contact sales',
    slug: 'contact-sales',
    status: 'published',
    description: 'Route inbound demo requests straight into the pipeline.',
    style: { accent: '#5b4bf5', theme: 'dark', width: 560, buttonLabel: 'Request a demo', successTitle: 'Thanks, we will be in touch.', successBody: 'A member of the team will reach out within one business day.' },
    notifyEmail: '',
    fields: [
      { id: 'f_first', label: 'First name', type: 'text', required: true, placeholder: 'Jordan', help: '', options: [], mapTo: 'firstName', step: 0, visibleIf: null },
      { id: 'f_last', label: 'Last name', type: 'text', required: false, placeholder: 'Rivera', help: '', options: [], mapTo: 'lastName', step: 0, visibleIf: null },
      { id: 'f_email', label: 'Work email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email', step: 0, visibleIf: null },
      { id: 'f_company', label: 'Company', type: 'text', required: false, placeholder: 'Acme Inc', help: '', options: [], mapTo: 'companyName', step: 0, visibleIf: null },
      { id: 'f_size', label: 'Team size', type: 'select', required: false, placeholder: '', help: '', options: ['1-10', '11-50', '51-200', '201-1000', '1000+'], mapTo: '__none', step: 0, visibleIf: null },
      { id: 'f_notes', label: 'What are you looking to solve?', type: 'textarea', required: false, placeholder: '', help: 'Optional, helps us prep the call.', options: [], mapTo: '__none', step: 0, visibleIf: null },
    ],
    submissions: [
      { id: 'sub_seed_1', at: new Date(Date.now() - 2 * 86400000).toISOString(), data: { f_first: 'Dana', f_last: 'Okafor', f_email: 'dana@northloop.io', f_company: 'Northloop', f_size: '51-200', f_notes: 'Evaluating a Salesforce replacement.' }, contactId: null },
      { id: 'sub_seed_2', at: new Date(Date.now() - 6 * 3600000).toISOString(), data: { f_first: 'Marco', f_last: 'Bianchi', f_email: 'marco@vela.co', f_company: 'Vela', f_size: '11-50', f_notes: 'Want to see Rook live.' }, contactId: null },
    ],
    analytics: blankAnalytics({ views: 214, starts: 41, completions: 28, steps: { 0: 41 } }),
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: nowIso(),
  };
  const newsletter = {
    id: 'form_newsletter',
    name: 'Newsletter signup',
    slug: 'newsletter',
    status: 'published',
    description: 'A single-field capture for the footer and blog.',
    style: { accent: '#0ea5a3', theme: 'dark', width: 480, buttonLabel: 'Subscribe', successTitle: 'You are on the list.', successBody: 'Watch your inbox for the next drop.' },
    notifyEmail: '',
    fields: [
      { id: 'n_email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email', step: 0, visibleIf: null },
    ],
    submissions: [
      { id: 'sub_seed_3', at: new Date(Date.now() - 26 * 3600000).toISOString(), data: { n_email: 'reader@substack.example' }, contactId: null },
    ],
    analytics: blankAnalytics({ views: 903, starts: 132, completions: 118, steps: { 0: 132 } }),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: nowIso(),
  };
  const onboarding = {
    id: 'form_onboarding',
    name: 'Workshop registration',
    slug: 'workshop-registration',
    status: 'published',
    description: 'A multi-step registration with conditional logic and a deposit.',
    style: { accent: '#e0752d', theme: 'dark', width: 600, buttonLabel: 'Complete registration', successTitle: 'You are registered.', successBody: 'Check your inbox for the calendar invite and receipt.' },
    notifyEmail: '',
    fields: [
      { id: 'o_head1', label: 'Tell us about you', type: 'heading', required: false, placeholder: '', help: 'Step 1 of 3', options: [], mapTo: '__none', step: 0, visibleIf: null },
      { id: 'o_first', label: 'First name', type: 'text', required: true, placeholder: 'Jordan', help: '', options: [], mapTo: 'firstName', step: 0, visibleIf: null },
      { id: 'o_email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email', step: 0, visibleIf: null },
      { id: 'o_head2', label: 'Your details', type: 'heading', required: false, placeholder: '', help: 'Step 2 of 3', options: [], mapTo: '__none', step: 1, visibleIf: null },
      { id: 'o_type', label: 'Are you registering as', type: 'radio', required: true, placeholder: '', help: '', options: ['Business', 'Individual'], mapTo: '__none', step: 1, visibleIf: null },
      { id: 'o_company', label: 'Company name', type: 'text', required: true, placeholder: 'Acme Inc', help: 'Shown only for business registrations.', options: [], mapTo: 'companyName', step: 1, visibleIf: { field: 'o_type', op: 'eq', value: 'Business' } },
      { id: 'o_head3', label: 'Secure your seat', type: 'heading', required: false, placeholder: '', help: 'Step 3 of 3', options: [], mapTo: '__none', step: 2, visibleIf: null },
      { id: 'o_deposit', label: 'Registration deposit', type: 'payment', required: true, placeholder: '', help: 'Refundable up to 48 hours before the workshop.', options: [], mapTo: '__none', step: 2, visibleIf: null, amount: 49, currency: 'USD', amountEditable: false },
      { id: 'o_consent', label: 'I agree to the workshop terms', type: 'checkbox', required: true, placeholder: '', help: '', options: [], mapTo: '__none', step: 2, visibleIf: null },
    ],
    submissions: [],
    analytics: blankAnalytics({ views: 156, starts: 47, completions: 19, steps: { 0: 47, 1: 33, 2: 22 } }),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: nowIso(),
  };
  return { seededAt: nowIso(), forms: [contactForm, newsletter, onboarding] };
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
  const views = fs.reduce((s, f) => s + ((f.analytics && f.analytics.views) || 0), 0);
  return {
    total: fs.length,
    published: fs.filter(f => f.status === 'published').length,
    submissions,
    contacts,
    views,
  };
}
export const formSubmissionCount = (f) => (f && f.submissions ? f.submissions.length : 0);

/* ============================================================
   STEPS + CONDITIONAL LOGIC (pure helpers)
   ============================================================ */
export function stepCount(form) {
  const fs = (form && form.fields) || [];
  if (!fs.length) return 1;
  return Math.max(1, ...fs.map(f => (parseInt(f.step, 10) || 0) + 1));
}
export function fieldsForStep(form, i) {
  return ((form && form.fields) || []).filter(f => (parseInt(f.step, 10) || 0) === i);
}
export const isMultiStep = (form) => stepCount(form) > 1;

// Evaluate a single field's show/hide rule against the current answers.
export function isFieldVisible(field, values = {}) {
  const c = field && field.visibleIf;
  if (!c || !c.field) return true;
  const raw = values[c.field];
  const isArr = Array.isArray(raw);
  const filled = !(raw == null || raw === '' || raw === false || (isArr && raw.length === 0));
  const sv = raw == null ? '' : (isArr ? raw.join(',') : String(raw));
  switch (c.op) {
    case 'filled': return filled;
    case 'empty': return !filled;
    case 'neq': return sv !== c.value;
    case 'contains':
      if (isArr) return raw.map(String).some(x => x.toLowerCase() === String(c.value).toLowerCase());
      return sv.toLowerCase().includes(String(c.value).toLowerCase());
    case 'eq':
    default: return sv === c.value;
  }
}

// A step is visible if it has at least one visible field (headings always show).
export function isStepVisible(form, i, values = {}) {
  const fs = fieldsForStep(form, i);
  if (!fs.length) return false;
  return fs.some(f => typeIsStatic(f.type) ? true : isFieldVisible(f, values));
}

// The ordered list of step indices that should currently be shown.
export function visibleSteps(form, values = {}) {
  const n = stepCount(form);
  const out = [];
  for (let i = 0; i < n; i++) if (isStepVisible(form, i, values)) out.push(i);
  return out.length ? out : [0];
}

/* ============================================================
   ANALYTICS
   ============================================================ */
function ensureAnalytics(f) {
  return (f && f.analytics) ? f.analytics : { views: 0, starts: 0, completions: 0, steps: {} };
}
function mutateAnalytics(idOrSlug, fn) {
  const form = resolveForm(idOrSlug);
  if (!form) return;
  const a = fn(ensureAnalytics(form));
  const next = { ...form, analytics: a };
  commit({ ...state, forms: state.forms.map(x => x.id === form.id ? next : x) });
}
// SUPABASE: from('rally_form_events').insert({ form_id, kind, step })
export function trackView(idOrSlug) { mutateAnalytics(idOrSlug, a => ({ ...a, views: (a.views || 0) + 1 })); }
export function trackStart(idOrSlug) { mutateAnalytics(idOrSlug, a => ({ ...a, starts: (a.starts || 0) + 1 })); }
export function trackStepReached(idOrSlug, step) {
  mutateAnalytics(idOrSlug, a => { const steps = { ...(a.steps || {}) }; steps[step] = (steps[step] || 0) + 1; return { ...a, steps }; });
}
export function trackCompletion(idOrSlug) { mutateAnalytics(idOrSlug, a => ({ ...a, completions: (a.completions || 0) + 1 })); }

// Computed analytics for the dashboard: views, starts, completions, rate, and
// per-step reached + drop-off.
export function formAnalytics(form) {
  const a = ensureAnalytics(form);
  const views = a.views || 0;
  const starts = a.starts || 0;
  const completions = a.completions != null ? a.completions : formSubmissionCount(form);
  const n = stepCount(form);
  const byStep = [];
  for (let i = 0; i < n; i++) {
    const reached = a.steps && a.steps[i] != null ? a.steps[i] : (i === 0 ? starts : 0);
    const prev = byStep.length ? byStep[byStep.length - 1].reached : reached;
    const dropOff = prev > 0 ? Math.max(0, Math.round(((prev - reached) / prev) * 100)) : 0;
    const label = (fieldsForStep(form, i).find(f => typeIsStatic(f.type))?.label) || `Step ${i + 1}`;
    byStep.push({ step: i, label, reached, dropOff });
  }
  const completionRate = starts ? Math.round((completions / starts) * 100)
    : (views ? Math.round((completions / views) * 100) : 0);
  return { views, starts, completions, completionRate, byStep };
}

/* ============================================================
   HOSTED URL + EMBED SNIPPET
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
  const width = Math.max(320, Number(form.style && form.style.width) || 560);
  return [
    `<!-- Ardovo form: ${title} -->`,
    `<iframe src="${url}"`,
    `        title="${title}"`,
    `        width="100%" height="720" loading="lazy"`,
    `        style="border:0;max-width:${width}px;width:100%;background:transparent;"></iframe>`,
  ].join('\n');
}

/* ============================================================
   WRITE API  (validated writers, return { error, message } or record)
   ============================================================ */
const normStatus = (s) => (s === 'published' ? 'published' : 'draft');

function normStyle(style) {
  const s = style || {};
  return {
    accent: s.accent || '#5b4bf5',
    theme: s.theme === 'light' ? 'light' : 'dark',
    width: Math.max(320, Math.min(900, Number(s.width) || 560)),
    buttonLabel: s.buttonLabel || 'Submit',
    successTitle: s.successTitle || 'Thanks for reaching out.',
    successBody: s.successBody || 'We will be in touch shortly.',
  };
}

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
    style: normStyle(style),
    notifyEmail: String(notifyEmail || '').trim(),
    fields: Array.isArray(fields) && fields.length ? fields.map(normField) : [
      { id: 'f_email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com', help: '', options: [], mapTo: 'email', step: 0, visibleIf: null },
    ],
    submissions: [],
    analytics: { views: 0, starts: 0, completions: 0, steps: {} },
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

export function updateForm(id, patch = {}) {
  const f = getForm(id);
  if (!f) return { error: 'missing', message: 'Form not found.' };
  const next = { ...f, ...patch };
  if (typeof next.name === 'string') next.name = next.name.trim();
  if (!next.name) return { error: 'name', message: 'Name your form.' };
  if (patch.status != null) next.status = normStatus(patch.status);
  if (Array.isArray(patch.fields)) next.fields = patch.fields.map(normField);
  if (patch.style) next.style = normStyle({ ...f.style, ...patch.style });
  if (typeof patch.notifyEmail === 'string') next.notifyEmail = patch.notifyEmail.trim();
  // Preserve identity + append-only fields the caller should not clobber.
  next.id = f.id; next.slug = f.slug; next.submissions = f.submissions; next.analytics = f.analytics; next.createdAt = f.createdAt;
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
    fields: (f.fields || []).map(x => ({ ...x, options: [...(x.options || [])], visibleIf: x.visibleIf ? { ...x.visibleIf } : null })),
    submissions: [],
    analytics: { views: 0, starts: 0, completions: 0, steps: {} },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commit({ ...state, forms: [copy, ...state.forms] });
  return { form: copy };
}

export function setFormStatus(id, status) { return updateForm(id, { status }); }

/* ------------------------------------------------------------
   SPAM PROTECTION
   ------------------------------------------------------------ */
// Fast, deterministic checks: honeypot must be empty; the visitor must not
// have submitted implausibly fast (time-trap).
export function spamCheck({ startedAt, honeypot } = {}) {
  if (honeypot) return { ok: false, reason: 'honeypot' };
  if (startedAt) {
    const dt = Date.now() - Number(startedAt);
    if (Number.isFinite(dt) && dt >= 0 && dt < MIN_FILL_MS) return { ok: false, reason: 'too-fast' };
  }
  return { ok: true };
}
export function rateLimited(formId, { max = RATE_MAX, windowMs = RATE_WINDOW_MS } = {}) {
  try {
    const raw = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
    const now = Date.now();
    const arr = (raw[formId] || []).filter(t => now - t < windowMs);
    return arr.length >= max;
  } catch { return false; }
}
export function recordSubmit(formId) {
  try {
    const raw = JSON.parse(localStorage.getItem(RATE_KEY) || '{}');
    const now = Date.now();
    const arr = (raw[formId] || []).filter(t => now - t < 300000);
    arr.push(now);
    raw[formId] = arr;
    localStorage.setItem(RATE_KEY, JSON.stringify(raw));
  } catch { /* storage blocked; rate limiting simply relaxes */ }
}

/* ------------------------------------------------------------
   VALIDATION
   Only validates fields that are visible + value-collecting.
   ------------------------------------------------------------ */
export function validateSubmission(form, values = {}) {
  const errors = {};
  for (const fd of form.fields || []) {
    if (typeIsStatic(fd.type) || fd.type === 'hidden') continue;
    if (!isFieldVisible(fd, values)) continue;
    const v = values[fd.id];
    const isArr = Array.isArray(v);
    const empty = v == null || v === '' || v === false || (isArr && v.length === 0);
    if (fd.required && empty) { errors[fd.id] = `${fd.label} is required.`; continue; }
    if (empty) continue;
    if (fd.type === 'email' && !EMAIL_RE.test(String(v))) { errors[fd.id] = 'Enter a valid email address.'; continue; }
    if (fd.type === 'phone' && String(v).replace(/\D/g, '').length < 7) { errors[fd.id] = 'Enter a valid phone number.'; continue; }
    if (fd.type === 'number') {
      const num = Number(v);
      if (!Number.isFinite(num)) { errors[fd.id] = 'Enter a number.'; continue; }
      if (fd.min !== '' && fd.min != null && num < Number(fd.min)) { errors[fd.id] = `Must be at least ${fd.min}.`; continue; }
      if (fd.max !== '' && fd.max != null && num > Number(fd.max)) { errors[fd.id] = `Must be at most ${fd.max}.`; continue; }
    }
    if (fd.type === 'payment') { const a = Number(v); if (!Number.isFinite(a) || a <= 0) { errors[fd.id] = 'Enter a valid amount.'; continue; } }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// Validate only the fields on one step (used for multi-step next-button gating).
export function validateStep(form, stepIndex, values = {}) {
  const only = new Set(fieldsForStep(form, stepIndex).map(f => f.id));
  const full = validateSubmission(form, values);
  const errors = {};
  for (const k of Object.keys(full.errors)) if (only.has(k)) errors[k] = full.errors[k];
  return { ok: Object.keys(errors).length === 0, errors };
}

/* ------------------------------------------------------------
   SUBMISSION -> CONTACT
   ------------------------------------------------------------ */
// Pull mapped values into { core, extra } buckets for the store writers.
function bucketValues(form, values) {
  const core = {}; const extra = {};
  for (const fd of form.fields || []) {
    const mapTo = fd.mapTo;
    if (!mapTo || mapTo === '__none') continue;
    if (!isFieldVisible(fd, values)) continue;
    let v = values[fd.id];
    if (Array.isArray(v)) v = v.join(', ');
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
  const nameField = (form.fields || []).find(f => /name/i.test(f.label) && (f.type === 'text'));
  if (nameField && values[nameField.id]) return String(values[nameField.id]).trim().split(/\s+/)[0];
  const email = core.email || Object.values(values).find(v => EMAIL_RE.test(String(v)));
  if (email) return String(email).split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/)[0] || 'Lead';
  return 'New lead';
}

function dispatchWindow(name, detail) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  } catch { /* non-browser or blocked; events are best-effort */ }
}

// Find an existing contact by email (case-insensitive) so a repeat submitter
// UPDATES rather than duplicates.
function findContactByEmail(email) {
  if (!email) return null;
  const target = String(email).trim().toLowerCase();
  if (!target) return null;
  try { return (getContacts() || []).find(c => (c.email || '').trim().toLowerCase() === target) || null; }
  catch { return null; }
}

// opts: { startedAt, honeypot, skipSpam, origin }
export function submitForm(idOrSlug, values = {}, opts = {}) {
  const form = resolveForm(idOrSlug);
  if (!form) return { error: 'missing', message: 'Form not found.' };

  // Spam protection (honeypot + time-trap + client rate limit).
  if (!opts.skipSpam) {
    const sc = spamCheck(opts);
    if (!sc.ok) return { error: 'spam', message: 'Submission blocked.', reason: sc.reason };
    if (rateLimited(form.id)) return { error: 'rate', message: 'Too many submissions. Please wait a minute and try again.' };
  }

  const v = validateSubmission(form, values);
  if (!v.ok) return { error: 'validation', message: 'Please fix the highlighted fields.', errors: v.errors };

  const { core, extra } = bucketValues(form, values);

  const patch = {
    leadSource: extra.leadSource || `Form: ${form.name}`,
    lifecycleStage: extra.lifecycleStage || 'lead',
    fieldValues: { formId: form.id, formName: form.name },
  };
  if (extra.companyName) patch.companyName = extra.companyName;

  let contactId = null;
  let contactRec = null;
  const existing = findContactByEmail(core.email);
  if (existing) {
    contactId = existing.id;
    const up = {};
    if (core.lastName) up.lastName = core.lastName;
    if (core.phone) up.phone = core.phone;
    if (core.title) up.title = core.title;
    updateContact(contactId, { ...up, ...patch });
    contactRec = getContact(contactId);
  } else {
    core.firstName = deriveFirstName(core, values, form);
    const created = createContact({
      firstName: core.firstName,
      lastName: core.lastName || '',
      email: core.email || '',
      phone: core.phone || '',
      title: core.title || '',
    });
    if (created && created.contact) {
      contactId = created.contact.id;
      updateContact(contactId, patch);
      contactRec = getContact(contactId) || created.contact;
    }
  }

  // Payment field -> hand off to the payment engine via a window event.
  const payField = (form.fields || []).find(f => f.type === 'payment' && isFieldVisible(f, values));
  if (payField) {
    const amount = Number(values[payField.id]);
    if (Number.isFinite(amount) && amount > 0) {
      dispatchWindow('rally:form-payment', { formId: form.id, amount, email: core.email || '', currency: payField.currency || 'USD' });
    }
  }

  const submission = {
    id: newId('sub'),
    at: nowIso(),
    data: { ...values },
    contactId,
  };
  // Persist the submission AND bump the completion counter in one commit.
  const a = ensureAnalytics(form);
  const next = {
    ...form,
    submissions: [submission, ...(form.submissions || [])],
    analytics: { ...a, completions: (a.completions || 0) + 1 },
    updatedAt: nowIso(),
  };
  commit({ ...state, forms: state.forms.map(x => x.id === form.id ? next : x) });
  recordSubmit(form.id);

  // Let automations react to the new lead.
  dispatchWindow('rally:form-submit', { formId: form.id, contactId, values: { ...values } });

  return { ok: true, contact: contactRec, submission };
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
    .filter(fd => typeCollectsValue(fd.type) && values[fd.id] != null && values[fd.id] !== '')
    .map(fd => ({ label: fd.label, value: Array.isArray(values[fd.id]) ? values[fd.id].join(', ') : String(values[fd.id]) }));
  try {
    fetch('/api/form-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: form.notifyEmail, formName: form.name, fields: labeled, sourceUrl: hostedUrl(form, origin) }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never blocks the submit */ }
}

// Fire-and-forget public capture to the server endpoint (server-side spam
// screen + future rally_form_submissions insert). Never blocks the visitor.
export function postSubmission(form, values, opts = {}) {
  if (!form || typeof fetch !== 'function') return;
  try {
    fetch('/api/form-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId: form.id,
        slug: form.slug,
        values,
        startedAt: opts.startedAt || null,
        honeypot: opts.honeypot || '',
        sourceUrl: hostedUrl(form, opts.origin),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* best-effort */ }
}
