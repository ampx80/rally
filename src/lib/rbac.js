// ============================================================
// RALLY RBAC  (spec Section 8 - Wave 8)
// Role-based access control: four roles, a capability matrix, an
// admin-editable grant table, field-level security, and a "view as"
// switcher so an admin can see the app exactly as a Rep or Viewer
// would. Everything is enforced through can() / canViewField() /
// canEditField() and persisted to rally_rbac_v1.
// SUPABASE: rally_roles + rally_role_grants + rally_field_security.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_rbac_v1';

/* ---------- roles (ranked; higher rank inherits nothing automatically,
   grants are explicit so the matrix is legible) ---------- */
export const ROLES = [
  { id: 'admin',   label: 'Admin',   rank: 4, color: '#5b4bf5', desc: 'Full control. Manages users, roles, fields, billing, and every record.' },
  { id: 'manager', label: 'Manager', rank: 3, color: '#0ea5a3', desc: 'Runs the team. Edits any record, approves quotes, sees all reports.' },
  { id: 'rep',     label: 'Rep',     rank: 2, color: '#2563a8', desc: 'Owns their book. Edits their records, builds quotes, runs their pipeline.' },
  { id: 'viewer',  label: 'Viewer',  rank: 1, color: '#8b93a4', desc: 'Read only. Sees dashboards and records but cannot change anything.' },
];
export const roleMeta = (id) => ROLES.find(r => r.id === id) || ROLES[3];

/* ---------- capabilities, grouped for the matrix UI ----------
   Each capability is one togglable permission. `sensitive` flags the
   destructive / admin ones so the matrix can accent them. */
export const CAPABILITIES = [
  // Records
  { id: 'records.view',      group: 'Records',    label: 'View records',        desc: 'See deals, contacts, and accounts.' },
  { id: 'records.edit',      group: 'Records',    label: 'Edit records',        desc: 'Change fields on records they can see.' },
  { id: 'records.editAll',   group: 'Records',    label: 'Edit any record',     desc: 'Edit records owned by other reps, not just their own.' },
  { id: 'records.delete',    group: 'Records',    label: 'Delete records',      desc: 'Permanently remove records.', sensitive: true },
  { id: 'records.reassign',  group: 'Records',    label: 'Reassign owner',      desc: 'Change who owns a deal or account.' },
  { id: 'records.export',    group: 'Records',    label: 'Export data',         desc: 'Download records as CSV.', sensitive: true },
  // Quotes
  { id: 'quotes.view',       group: 'Quotes',     label: 'View quotes',         desc: 'Open the quote book.' },
  { id: 'quotes.build',      group: 'Quotes',     label: 'Build quotes',        desc: 'Create and price quotes.' },
  { id: 'quotes.approve',    group: 'Quotes',     label: 'Approve + send',      desc: 'Push a quote past discount thresholds and send it.', sensitive: true },
  // Automation
  { id: 'workflows.view',    group: 'Automation', label: 'View workflows',      desc: 'See the automation library.' },
  { id: 'workflows.manage',  group: 'Automation', label: 'Manage workflows',    desc: 'Create, edit, and toggle automations.' },
  // Admin
  { id: 'fields.manage',     group: 'Admin',      label: 'Manage fields',       desc: 'Add and edit custom fields.', sensitive: true },
  { id: 'rbac.manage',       group: 'Admin',      label: 'Manage roles',        desc: 'Edit this permission matrix.', sensitive: true },
  { id: 'users.manage',      group: 'Admin',      label: 'Manage users',        desc: 'Invite, deactivate, and assign roles.', sensitive: true },
  { id: 'audit.view',        group: 'Admin',      label: 'View audit log',      desc: 'See the org-wide change history.', sensitive: true },
  { id: 'settings.manage',   group: 'Admin',      label: 'Manage settings',     desc: 'Edit workspace, pipeline, and branding.', sensitive: true },
];
export const CAP_GROUPS = [...new Set(CAPABILITIES.map(c => c.group))];

/* ---------- default grant matrix (role -> capabilities granted) ---------- */
const DEFAULTS = {
  admin: CAPABILITIES.map(c => c.id), // admin gets everything
  manager: [
    'records.view', 'records.edit', 'records.editAll', 'records.delete', 'records.reassign', 'records.export',
    'quotes.view', 'quotes.build', 'quotes.approve',
    'workflows.view', 'workflows.manage',
    'audit.view',
  ],
  rep: [
    'records.view', 'records.edit', 'records.reassign',
    'quotes.view', 'quotes.build',
    'workflows.view',
  ],
  viewer: [
    'records.view', 'quotes.view', 'workflows.view',
  ],
};

/* ---------- field-level security ----------
   Sensitive fields gated by a minimum role rank. A role can read/edit
   the field only if its rank >= the threshold. Demonstrates that RBAC
   reaches down to individual fields, not just pages. */
export const FIELD_SECURITY = [
  { objectType: 'deal',    key: 'amount',       label: 'Deal amount',       view: 'rep',     edit: 'rep' },
  { objectType: 'deal',    key: 'forecast',     label: 'Forecast category', view: 'rep',     edit: 'manager' },
  { objectType: 'company', key: 'annualRevenue',label: 'Annual revenue',    view: 'rep',     edit: 'manager' },
  { objectType: 'contact', key: 'personalEmail',label: 'Personal email',    view: 'manager', edit: 'admin' },
  { objectType: 'deal',    key: 'margin',       label: 'Deal margin',       view: 'manager', edit: 'admin' },
];

/* ============================================================
   STATE  (persisted: active/view-as role + grant overrides)
   ============================================================ */
function seed() {
  return {
    activeRole: 'admin',       // the role the workspace is being viewed as
    overrides: {},             // { [roleId]: { [capId]: bool } } sparse diffs vs DEFAULTS
  };
}
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return { ...seed(), ...JSON.parse(raw) }; } catch {}
  return seed();
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetRbac() { commit(seed()); }
export function useRbac(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

/* ---------- grant matrix (defaults merged with overrides) ---------- */
export function isGranted(roleId, capId) {
  const ov = state.overrides[roleId];
  if (ov && capId in ov) return !!ov[capId];
  return (DEFAULTS[roleId] || []).includes(capId);
}
/* full matrix snapshot for the UI: { [roleId]: { [capId]: bool } } */
export function getMatrix() {
  const m = {};
  for (const r of ROLES) { m[r.id] = {}; for (const c of CAPABILITIES) m[r.id][c.id] = isGranted(r.id, c.id); }
  return m;
}
export function grantCount(roleId) {
  return CAPABILITIES.reduce((n, c) => n + (isGranted(roleId, c.id) ? 1 : 0), 0);
}
export function setGrant(roleId, capId, on) {
  if (roleId === 'admin') return; // admin is always all-access, cannot be locked out
  const overrides = { ...state.overrides, [roleId]: { ...(state.overrides[roleId] || {}), [capId]: !!on } };
  commit({ ...state, overrides });
}
export function resetRole(roleId) {
  const overrides = { ...state.overrides }; delete overrides[roleId];
  commit({ ...state, overrides });
}
export const hasOverrides = (roleId) => !!state.overrides[roleId] && Object.keys(state.overrides[roleId]).length > 0;

/* ---------- active role / view-as ---------- */
export const getActiveRole = () => state.activeRole;
export function setActiveRole(roleId) {
  if (!ROLES.some(r => r.id === roleId)) return;
  commit({ ...state, activeRole: roleId });
}
export const isViewingAs = () => state.activeRole !== 'admin';

/* ---------- the enforcement primitives ---------- */
export function can(capId, roleId = state.activeRole) { return isGranted(roleId, capId); }

const rank = (roleId) => roleMeta(roleId).rank;
export function canViewField(objectType, key, roleId = state.activeRole) {
  const rule = FIELD_SECURITY.find(f => f.objectType === objectType && f.key === key);
  if (!rule) return true;
  return rank(roleId) >= rank(rule.view);
}
export function canEditField(objectType, key, roleId = state.activeRole) {
  if (!can('records.edit', roleId)) return false;
  const rule = FIELD_SECURITY.find(f => f.objectType === objectType && f.key === key);
  if (!rule) return true;
  return rank(roleId) >= rank(rule.edit);
}
