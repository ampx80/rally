// ============================================================
// RALLY TEAM-DATA  (roles, permissions, territories, invites)
// Team.jsx owns the people/quota/attainment layer off the live
// store; this module owns the org-setup layer (RBAC + territories
// + pending invites) that has no home in store.js yet. Deterministic
// seed on first run, every mutation persists to localStorage so the
// setup stays alive across reloads. A tiny pub/sub mirrors store.js
// so components re-render on write.
// SUPABASE: rally_roles, rally_role_permissions, rally_territories,
// rally_territory_reps, rally_invites (all namespaced rally_*).
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers } from './store';

const LS_KEY = 'rally_team_setup_v1';

/* ---------- capabilities: the columns of the permission matrix ---------- */
// SUPABASE: rally_capabilities (static config).
export const CAPABILITIES = [
  { id: 'view_all', label: 'View all deals', desc: 'See every rep\'s pipeline, not just their own.' },
  { id: 'edit_deals', label: 'Edit deals', desc: 'Change deal stage, value, and close date.' },
  { id: 'delete_records', label: 'Delete records', desc: 'Permanently remove deals, contacts, companies.' },
  { id: 'export_data', label: 'Export data', desc: 'Download CRM data to CSV.' },
  { id: 'manage_users', label: 'Manage users', desc: 'Invite, deactivate, and re-role teammates.' },
  { id: 'approve_discounts', label: 'Approve discounts', desc: 'Sign off on non-standard pricing.' },
  { id: 'configure_modules', label: 'Configure modules', desc: 'Turn CRM modules and settings on or off.' },
];

/* ---------- default org: 5 roles down the side of the matrix ---------- */
// SUPABASE: rally_roles + rally_role_permissions join.
function defaultRoles() {
  const all = CAPABILITIES.map(c => c.id);
  return [
    { id: 'admin', name: 'Admin', system: true, perms: [...all] },
    { id: 'sales_manager', name: 'Sales Manager', system: true,
      perms: ['view_all', 'edit_deals', 'export_data', 'manage_users', 'approve_discounts'] },
    { id: 'account_executive', name: 'Account Executive', system: true,
      perms: ['edit_deals', 'export_data'] },
    { id: 'sdr', name: 'SDR', system: false, perms: ['edit_deals'] },
    { id: 'read_only', name: 'Read-only', system: false, perms: ['view_all'] },
  ];
}

/* ---------- default territories: named books of business ---------- */
// The store seeds 6 users (u_1..u_6). We assign reps deterministically so
// pipeline roll-ups are real from the first render. Managers stay unassigned.
// SUPABASE: rally_territories + rally_territory_reps join.
function defaultTerritories() {
  return [
    { id: 't_west', name: 'West Enterprise', segment: 'Enterprise - West', repIds: ['u_1', 'u_4'] },
    { id: 't_east', name: 'East Commercial', segment: 'Commercial - East', repIds: ['u_2', 'u_3'] },
    { id: 't_central', name: 'Central Mid-Market', segment: 'Mid-Market - Central', repIds: ['u_5'] },
  ];
}

function buildSeed() {
  return {
    seededAt: new Date().toISOString(),
    roles: defaultRoles(),
    territories: defaultTerritories(),
    invites: [],           // pending members added via the invite modal
    // map user id -> role id + territory label (org assignments, not in store.js)
    assignments: {
      u_1: { roleId: 'account_executive' },
      u_2: { roleId: 'account_executive' },
      u_3: { roleId: 'account_executive' },
      u_4: { roleId: 'account_executive' },
      u_5: { roleId: 'sdr' },
      u_6: { roleId: 'admin' },
    },
  };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors store.js shape)
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
export function getTeamState() { return state; }
export function resetTeamSetup() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useTeamStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getRoles = () => state.roles;
export const getRole = (id) => state.roles.find(r => r.id === id);
export const getTerritories = () => state.territories;
export const getInvites = () => state.invites;

export const capLabel = (id) => CAPABILITIES.find(c => c.id === id)?.label || id;

// Role assigned to a real store user (falls back to their store role).
export function roleForUser(userId) {
  const a = state.assignments[userId];
  if (a?.roleId) return getRole(a.roleId);
  const u = getUsers().find(x => x.id === userId);
  return getRole(u?.role === 'manager' ? 'sales_manager' : 'account_executive') || state.roles[0];
}

// Territory a rep is assigned to (first match), or null.
export function territoryForUser(userId) {
  return state.territories.find(t => (t.repIds || []).includes(userId)) || null;
}

// Does a role grant a capability? (permission-matrix cell state)
export const roleHasCap = (roleId, capId) => !!getRole(roleId)?.perms.includes(capId);

/* ============================================================
   WRITE API  (all persist)
   ============================================================ */
// Flip a single matrix cell on/off.
export function toggleRoleCap(roleId, capId) {
  const roles = state.roles.map(r => {
    if (r.id !== roleId) return r;
    const has = r.perms.includes(capId);
    return { ...r, perms: has ? r.perms.filter(p => p !== capId) : [...r.perms, capId] };
  });
  commit({ ...state, roles });
}

export function addRole(name) {
  const n = (name || '').trim();
  if (!n) return { error: 'name', message: 'Role name is required.' };
  if (state.roles.some(r => r.name.toLowerCase() === n.toLowerCase()))
    return { error: 'dup', message: 'A role with that name already exists.' };
  const role = { id: newId('role'), name: n, system: false, perms: [] };
  commit({ ...state, roles: [...state.roles, role] });
  return { role };
}

export function renameRole(roleId, name) {
  const n = (name || '').trim();
  if (!n) return { error: 'name', message: 'Role name is required.' };
  const roles = state.roles.map(r => (r.id === roleId ? { ...r, name: n } : r));
  commit({ ...state, roles });
  return { ok: true };
}

// Assign a real store user to a role.
export function assignUserRole(userId, roleId) {
  commit({ ...state, assignments: { ...state.assignments, [userId]: { ...state.assignments[userId], roleId } } });
}

export function addTerritory(name, segment) {
  const n = (name || '').trim();
  if (!n) return { error: 'name', message: 'Territory name is required.' };
  const t = { id: newId('t'), name: n, segment: (segment || '').trim(), repIds: [] };
  commit({ ...state, territories: [...state.territories, t] });
  return { territory: t };
}

// Replace a territory's rep roster (used by the assign modal).
export function setTerritoryReps(territoryId, repIds) {
  const territories = state.territories.map(t => (t.id === territoryId ? { ...t, repIds: [...repIds] } : t));
  commit({ ...state, territories });
}

// Invite a teammate: adds a pending member to the roster, persists.
export function inviteUser({ name, email, roleId }) {
  const nm = (name || '').trim();
  if (!nm) return { error: 'name', message: 'Name is required.' };
  const em = (email || '').trim();
  if (!em || !em.includes('@')) return { error: 'email', message: 'A valid email is required.' };
  const invite = {
    id: newId('inv'), name: nm, email: em,
    roleId: roleId || 'account_executive',
    status: 'pending', invitedAt: new Date().toISOString(),
  };
  commit({ ...state, invites: [invite, ...state.invites] });
  return { invite };
}

export function revokeInvite(id) {
  commit({ ...state, invites: state.invites.filter(i => i.id !== id) });
}
