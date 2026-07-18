// ============================================================
// ARDOVO RBAC  (spec Section 8 - Wave 8)
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

/* ---------- the enforcement primitives ----------
   can() now also honors permission sets layered on a role (see the
   enterprise-depth section below). With no sets assigned the result is
   identical to the base grant, so existing behavior is unchanged. */
export function can(capId, roleId = state.activeRole) {
  return isGranted(roleId, capId) || grantedBySet(roleId, capId);
}

/* rank consults custom roles too, falling back to the base meta. */
const rank = (roleId) => (allRoleMeta(roleId)?.rank ?? roleMeta(roleId).rank);
/* combined field rule: a custom (ext) rule wins, else the base rule. */
function fieldRule(objectType, key) {
  return ext.fls.find(f => f.objectType === objectType && f.key === key)
      || FIELD_SECURITY.find(f => f.objectType === objectType && f.key === key)
      || null;
}
export function canViewField(objectType, key, roleId = state.activeRole) {
  const rule = fieldRule(objectType, key);
  if (!rule) return true;
  return rank(roleId) >= rank(rule.view);
}
export function canEditField(objectType, key, roleId = state.activeRole) {
  if (!can('records.edit', roleId)) return false;
  const rule = fieldRule(objectType, key);
  if (!rule) return true;
  return rank(roleId) >= rank(rule.edit);
}

/* ============================================================
   ENTERPRISE PERMISSIONS DEPTH  (additive layer)
   Permission sets (named capability bundles layered on a base role),
   custom / cloned roles, extended field-level security, and a simple
   record-sharing model. Persisted in its OWN key (rally_rbac_ext_v1)
   so the base matrix in rally_rbac_v1 is never touched. Everything
   below is additive: with no custom roles, no permission-set
   assignments, and no extra FLS rules, every base-role result is
   byte-for-byte identical to before this section existed.
   SUPABASE: rally_permission_sets + rally_role_sets +
   rally_field_security + rally_sharing_rules.
   ============================================================ */
const EXT_KEY = 'rally_rbac_ext_v1';

/* Starter permission sets - the same idea as HubSpot permission sets /
   Salesforce permission set groups: a reusable bundle of extra
   capabilities you layer onto any base role without editing the role. */
const DEFAULT_SETS = [
  { id: 'set_deal_desk',  label: 'Deal Desk',  color: '#b3721a', desc: 'Approve and send quotes past discount thresholds, plus data export.', caps: ['quotes.approve', 'records.export'] },
  { id: 'set_data_admin', label: 'Data Admin', color: '#0ea5a3', desc: 'Manage custom fields and bulk-export records.',                       caps: ['fields.manage', 'records.export'] },
  { id: 'set_revops',     label: 'RevOps',     color: '#5b4bf5', desc: 'Own automations and read the org-wide audit log.',                     caps: ['workflows.manage', 'audit.view'] },
];

/* Record-sharing model: per-object default visibility scope. */
export const SHARE_OBJECTS = [
  { id: 'deal',    label: 'Deals' },
  { id: 'company', label: 'Companies' },
  { id: 'contact', label: 'Contacts' },
];
export const SHARE_SCOPES = [
  { id: 'owner',    label: 'Owner only', icon: 'user',  desc: 'Only the record owner (plus Manager and Admin) can see it.' },
  { id: 'team',     label: 'Team',       icon: 'users', desc: 'Everyone with a Rep role or higher can see it.' },
  { id: 'everyone', label: 'Everyone',   icon: 'eye',   desc: 'Every user, including Viewers, can see it.' },
];
export const scopeMeta = (id) => SHARE_SCOPES.find(s => s.id === id) || SHARE_SCOPES[1];

/* palette offered when minting a custom role */
export const ROLE_COLORS = ['#5b4bf5', '#0ea5a3', '#b3721a', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];

function extSeed() {
  return {
    customRoles: [],                                   // [{ id,label,color,desc,rank,base }]
    sets: DEFAULT_SETS,                                // permission sets (bundles)
    assignments: {},                                   // { [roleId]: [setId] }
    fls: [],                                           // extra field rules [{ id,objectType,key,label,view,edit }]
    sharing: { deal: 'team', company: 'team', contact: 'team' },
  };
}
let ext = extLoad();
const extSubs = new Set();
function extLoad() {
  try {
    const raw = localStorage.getItem(EXT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const s = extSeed();
      return {
        ...s, ...p,
        customRoles: Array.isArray(p.customRoles) ? p.customRoles : [],
        sets: Array.isArray(p.sets) ? p.sets : DEFAULT_SETS,
        assignments: p.assignments && typeof p.assignments === 'object' ? p.assignments : {},
        fls: Array.isArray(p.fls) ? p.fls : [],
        sharing: { ...s.sharing, ...(p.sharing || {}) },
      };
    }
  } catch {}
  return extSeed();
}
function extCommit(next) {
  ext = next;
  try { localStorage.setItem(EXT_KEY, JSON.stringify(ext)); } catch {}
  extSubs.forEach(fn => fn(ext));
  subs.forEach(fn => fn(state)); // wake base-matrix subscribers too (shared page)
}
export function resetRbacExt() { extCommit(extSeed()); }
/* hook that re-renders on BOTH base and ext changes so a single page can
   drive the whole permission model. */
export function useRbacExt(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(ext));
  useEffect(() => {
    const fn = () => setSnap(selector(ext));
    extSubs.add(fn); subs.add(fn); fn();
    return () => { extSubs.delete(fn); subs.delete(fn); };
  }, []);
  return snap;
}

/* ---------- roles: base four + custom ---------- */
export const getCustomRoles = () => ext.customRoles;
export const getAllRoles = () => [...ROLES, ...ext.customRoles];
export function allRoleMeta(id) { return getAllRoles().find(r => r.id === id) || null; }
export const isCustomRole = (id) => ext.customRoles.some(r => r.id === id);

/* Create a role by cloning an existing role's grant matrix. The clone
   gets its OWN grant overrides (copied from the source) so editing one
   never affects the other. */
export function createRole({ label, color, desc, base = 'rep' }) {
  const clean = String(label || '').trim();
  if (!clean) return { error: true, message: 'Give the role a name.' };
  const id = 'role_' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + Math.random().toString(36).slice(2, 6);
  const src = allRoleMeta(base) || roleMeta('rep');
  const newRole = { id, label: clean, color: color || ROLE_COLORS[0], desc: desc || `Cloned from ${src.label}.`, rank: Math.max(1, (src.rank || 2)), base };
  // copy the source role's effective base grants into explicit overrides on the new role
  const copied = {};
  for (const c of CAPABILITIES) copied[c.id] = isGranted(base, c.id);
  const overrides = { ...state.overrides, [id]: copied };
  commit({ ...state, overrides });                       // grants land in the base store (reuses setGrant machinery)
  extCommit({ ...ext, customRoles: [...ext.customRoles, newRole] });
  return { role: newRole };
}
export function updateRole(id, patch) {
  if (!isCustomRole(id)) return { error: true, message: 'Base roles cannot be renamed.' };
  extCommit({ ...ext, customRoles: ext.customRoles.map(r => r.id === id ? { ...r, ...patch } : r) });
  return { ok: true };
}
export function removeRole(id) {
  if (!isCustomRole(id)) return { error: true, message: 'Base roles cannot be deleted.' };
  const overrides = { ...state.overrides }; delete overrides[id];
  const assignments = { ...ext.assignments }; delete assignments[id];
  const nextState = { ...state, overrides };
  if (state.activeRole === id) nextState.activeRole = 'admin';  // never strand the view-as on a deleted role
  commit(nextState);
  extCommit({ ...ext, customRoles: ext.customRoles.filter(r => r.id !== id), assignments });
  return { ok: true };
}

/* ---------- permission sets ---------- */
export const getSets = () => ext.sets;
export const setMeta = (id) => ext.sets.find(s => s.id === id) || null;
export function createSet({ label, desc, color, caps = [] }) {
  const clean = String(label || '').trim();
  if (!clean) return { error: true, message: 'Give the permission set a name.' };
  const id = 'set_' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + Math.random().toString(36).slice(2, 6);
  const set = { id, label: clean, desc: desc || '', color: color || ROLE_COLORS[1], caps: [...new Set(caps)] };
  extCommit({ ...ext, sets: [...ext.sets, set] });
  return { set };
}
export function updateSet(id, patch) {
  extCommit({ ...ext, sets: ext.sets.map(s => s.id === id ? { ...s, ...patch, caps: patch.caps ? [...new Set(patch.caps)] : s.caps } : s) });
  return { ok: true };
}
export function toggleSetCap(id, capId, on) {
  const set = setMeta(id); if (!set) return;
  const caps = on ? [...new Set([...set.caps, capId])] : set.caps.filter(c => c !== capId);
  updateSet(id, { caps });
}
export function removeSet(id) {
  const assignments = {};
  for (const [rid, list] of Object.entries(ext.assignments)) assignments[rid] = (list || []).filter(s => s !== id);
  extCommit({ ...ext, sets: ext.sets.filter(s => s.id !== id), assignments });
  return { ok: true };
}

/* ---------- set <-> role assignment ---------- */
export const setsForRole = (roleId) => ext.assignments[roleId] || [];
export function hasSet(roleId, setId) { return setsForRole(roleId).includes(setId); }
export function toggleRoleSet(roleId, setId, on) {
  const cur = setsForRole(roleId);
  const next = on ? [...new Set([...cur, setId])] : cur.filter(s => s !== setId);
  extCommit({ ...ext, assignments: { ...ext.assignments, [roleId]: next } });
}
/* is capId granted to roleId via ANY assigned permission set? */
export function grantedBySet(roleId, capId) {
  for (const sid of setsForRole(roleId)) {
    const s = setMeta(sid);
    if (s && s.caps.includes(capId)) return true;
  }
  return false;
}
/* full effective grant = base matrix OR any assigned set. */
export function effectiveGranted(roleId, capId) { return isGranted(roleId, capId) || grantedBySet(roleId, capId); }
export function effectiveGrantCount(roleId) {
  return CAPABILITIES.reduce((n, c) => n + (effectiveGranted(roleId, c.id) ? 1 : 0), 0);
}

/* ---------- extended field-level security ---------- */
export const getExtraFieldRules = () => ext.fls;
/* all rules the UI should display: base (locked) + custom (editable). */
export function getAllFieldRules() {
  return [
    ...FIELD_SECURITY.map(r => ({ ...r, id: 'base:' + r.objectType + ':' + r.key, locked: true })),
    ...ext.fls.map(r => ({ ...r, locked: false })),
  ];
}
export function addFieldRule({ objectType, key, label, view = 'rep', edit = 'manager' }) {
  const k = String(key || '').trim();
  if (!objectType || !k) return { error: true, message: 'Pick an object and a field key.' };
  if (FIELD_SECURITY.some(f => f.objectType === objectType && f.key === k) || ext.fls.some(f => f.objectType === objectType && f.key === k))
    return { error: true, message: 'That field already has a security rule.' };
  const rule = { id: 'fls_' + Math.random().toString(36).slice(2, 8), objectType, key: k, label: label || k, view, edit };
  extCommit({ ...ext, fls: [...ext.fls, rule] });
  return { rule };
}
export function updateFieldRule(id, patch) {
  extCommit({ ...ext, fls: ext.fls.map(f => f.id === id ? { ...f, ...patch } : f) });
  return { ok: true };
}
export function removeFieldRule(id) {
  extCommit({ ...ext, fls: ext.fls.filter(f => f.id !== id) });
  return { ok: true };
}

/* ---------- record sharing model ---------- */
export const getSharing = () => ext.sharing;
export const recordScope = (objectType) => ext.sharing[objectType] || 'team';
export function setSharing(objectType, scope) {
  if (!SHARE_SCOPES.some(s => s.id === scope)) return;
  extCommit({ ...ext, sharing: { ...ext.sharing, [objectType]: scope } });
}
/* Would a viewer in `roleId` (owning nothing / owning ownerId) see this record?
   Manager+ always see everything; scope narrows what Reps/Viewers get. */
export function canSeeRecord(objectType, ownerId, viewerId, roleId = state.activeRole) {
  const scope = recordScope(objectType);
  if (scope === 'everyone') return true;
  if (rank(roleId) >= 3) return true;               // Manager + Admin: full visibility
  if (scope === 'team') return rank(roleId) >= 2;   // Reps see the whole team's book
  return ownerId != null && ownerId === viewerId;   // owner-only
}
