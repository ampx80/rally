// ============================================================
// RALLY DRIVE  (local-first file engine, Supabase-swappable)
// A native, permissioned document store that lives INSIDE the
// revenue system of record - so contracts, decks and models stay
// attached to the accounts and deals they belong to, instead of
// scattered across a second Google Drive nobody keeps in sync.
//
// One module owns the folder tree, files, per-node permissions,
// shareable links, storage accounting, and the read/write API.
// A deterministic PRNG (mulberry32, fixed seed) builds a believable
// book of files on first run; mutations persist to localStorage so
// the demo stays alive across reloads. Every writer carries a
// // SUPABASE: note describing the live equivalent (rally_drive_*).
//
// TDZ SAFETY: everything called during the module-eval seed below
// (buildSeed -> load) is a hoisted `function` declaration, never a
// `const` arrow defined lower. Do not convert these to arrows.
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers, getUser, getCurrentUser } from './store.js';

const LS_KEY = 'rally_drive_v1';   // bump to force a clean reseed
const DAY = 86400000;
// Fixed epoch so seeded timestamps are deterministic (NO Date.now in seed).
const SEED_BASE = Date.parse('2026-07-08T17:00:00Z');
// Storage quota for the workspace (decimal GB, cloud-style).
export const QUOTA_BYTES = 25 * 1e9;

/* ---------- deterministic PRNG (hoisted) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   FILE-TYPE SYSTEM  (icon + color per kind)
   ============================================================ */
// icon names resolve against src/components/icons.jsx (existing + new).
export const FILE_TYPES = {
  folder: { label: 'Folder',       icon: 'folder',   color: '#5b4bf5' },
  image:  { label: 'Image',        icon: 'image',    color: '#0ea5a3' },
  pdf:    { label: 'PDF',          icon: 'fileText', color: '#c0392b' },
  doc:    { label: 'Document',     icon: 'fileText', color: '#2563a8' },
  sheet:  { label: 'Spreadsheet',  icon: 'grid',     color: '#1a7f52' },
  slide:  { label: 'Presentation', icon: 'pie',      color: '#b3721a' },
  video:  { label: 'Video',        icon: 'video',    color: '#a855f7' },
  zip:    { label: 'Archive',      icon: 'box',      color: '#5b6474' },
  other:  { label: 'File',         icon: 'fileText', color: '#8b93a4' },
};
export function typeMeta(t) { return FILE_TYPES[t] || FILE_TYPES.other; }

export const ROLES = [
  { id: 'viewer',    label: 'Viewer',    desc: 'Can view and download' },
  { id: 'commenter', label: 'Commenter', desc: 'Can view and comment' },
  { id: 'editor',    label: 'Editor',    desc: 'Can edit, share and delete' },
];
export function roleLabel(id) { return ROLES.find(r => r.id === id)?.label || id; }

/* ---------- byte + preview helpers (hoisted) ---------- */
export function fmtBytes(n) {
  if (n == null) return '-';
  if (n < 1000) return `${n} B`;
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)} KB`;
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)} MB`;
  return `${(n / 1e9).toFixed(1)} GB`;
}

// A deterministic inline-SVG thumbnail so seeded image files preview for real
// with zero network. Two-stop gradient + a soft geometric motif + a label.
function svgThumb(label, cA, cB, seed) {
  const r = mulberry32(seed | 0);
  const cx = 20 + Math.floor(r() * 60), cy = 20 + Math.floor(r() * 50);
  const rad = 30 + Math.floor(r() * 40);
  const rot = Math.floor(r() * 360);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 100 75'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${cA}'/><stop offset='1' stop-color='${cB}'/></linearGradient></defs>` +
    `<rect width='100' height='75' fill='url(#g)'/>` +
    `<circle cx='${cx}' cy='${cy}' r='${rad}' fill='#ffffff' opacity='0.14'/>` +
    `<rect x='55' y='42' width='40' height='40' rx='6' transform='rotate(${rot} 70 55)' fill='#ffffff' opacity='0.10'/>` +
    `<text x='6' y='68' font-family='Inter,Arial,sans-serif' font-size='7' font-weight='700' fill='#ffffff' opacity='0.92'>${label}</text>` +
    `</svg>`;
  // encodeURIComponent keeps it ascii-safe; no btoa dependency on unicode.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMG_PALETTE = [
  ['#5b4bf5', '#a855f7'], ['#0ea5a3', '#2563a8'], ['#b3721a', '#c0392b'],
  ['#1a7f52', '#0ea5a3'], ['#2563a8', '#5b4bf5'], ['#a855f7', '#c0392b'],
];

/* ============================================================
   SEED  (hand-authored realistic tree + deterministic detail)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(0x5A11E5);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const daysAgo = (d) => new Date(SEED_BASE - d * DAY).toISOString();

  // Users come from the shared CRM store so the people picker + owners are real.
  let users = [];
  try { users = getUsers() || []; } catch { users = []; }
  const userIds = users.length ? users.map(u => u.id) : ['u_1', 'u_2', 'u_3', 'u_4', 'u_5', 'u_6'];
  let me = 'u_1';
  try { me = getCurrentUser()?.id || userIds[0]; } catch { me = userIds[0]; }
  const others = userIds.filter(id => id !== me);
  const someoneElse = () => others.length ? pick(others) : me;

  const nodes = [];
  const permissions = {};   // nodeId -> [{ userId, role }]
  const shares = {};        // nodeId -> { enabled, access, token, createdAt }
  let counter = 0;
  const nextId = (p) => `${p}${(++counter).toString(36)}`;
  const token = () => 'lnk_' + Math.floor(rnd() * 1e9).toString(36) + counter.toString(36);

  const SIZE = {
    image: () => range(180, 4200) * 1000,
    pdf:   () => range(220, 7200) * 1000,
    doc:   () => range(28, 880) * 1000,
    sheet: () => range(22, 640) * 1000,
    slide: () => range(2200, 28000) * 1000,
    video: () => range(42, 780) * 1000 * 1000,
    zip:   () => range(6, 180) * 1000 * 1000,
    other: () => range(10, 1800) * 1000,
  };

  function addFolder(name, parentId, opt = {}) {
    const id = nextId('fld_');
    const madeAgo = opt.age ?? range(20, 260);
    nodes.push({
      id, name, kind: 'folder', parentId: parentId || null,
      ownerId: opt.ownerId || me,
      starred: !!opt.starred, trashed: false,
      color: opt.color || null,
      createdAt: daysAgo(madeAgo + range(1, 30)),
      modifiedAt: daysAgo(opt.modAge ?? range(0, madeAgo)),
      versions: [], activity: [],
    });
    return id;
  }

  function addFile(name, parentId, fileType, opt = {}) {
    const id = nextId('fil_');
    const size = opt.size ?? SIZE[fileType]();
    const madeAgo = opt.age ?? range(1, 200);
    const modAge = opt.modAge ?? Math.max(0, madeAgo - range(0, madeAgo));
    const owner = opt.ownerId || me;
    const preview = fileType === 'image'
      ? svgThumb(opt.label || name.replace(/\.[a-z0-9]+$/i, ''), ...pick(IMG_PALETTE), counter * 7 + 3)
      : null;
    // Seed a couple of versions on the richer files.
    const versions = [];
    const vN = opt.versions ?? (chance(0.4) ? range(2, 4) : 1);
    for (let v = vN; v >= 1; v--) {
      versions.push({
        id: `${id}_v${v}`, label: `v${v}`,
        size: v === vN ? size : Math.round(size * (0.7 + rnd() * 0.28)),
        at: daysAgo(modAge + (vN - v) * range(2, 18)),
        byId: v === vN ? owner : someoneElse(),
        current: v === vN,
      });
    }
    nodes.push({
      id, name, kind: 'file', parentId: parentId || null,
      fileType, size, preview,
      ownerId: owner,
      starred: !!opt.starred, trashed: !!opt.trashed,
      createdAt: daysAgo(madeAgo + range(1, 20)),
      modifiedAt: daysAgo(modAge),
      versions, activity: [],
      sheetKey: fileType === 'sheet' ? id : null,
    });
    return id;
  }

  function grant(nodeId, userId, role) {
    (permissions[nodeId] = permissions[nodeId] || []).push({ userId, role });
  }
  function linkShare(nodeId, access) {
    shares[nodeId] = { enabled: true, access, token: token(), createdAt: daysAgo(range(1, 40)) };
  }

  // ---- Root tree ---------------------------------------------------------
  const vertex = addFolder('Vertex Robotics', null, { starred: true, color: '#5b4bf5', age: 210 });
  const contracts = addFolder('Contracts', null, { age: 300 });
  const proposals = addFolder('Proposals', null, { age: 180 });
  const collateral = addFolder('Sales Collateral', null, { starred: true, age: 260 });
  const product = addFolder('Product & Enablement', null, { age: 220 });
  const qbr = addFolder('Quarterly Business Reviews', null, { age: 120 });
  const team = addFolder('Team', null, { age: 340, ownerId: someoneElse() });

  // ---- Vertex Robotics (flagship deal room) ------------------------------
  const vContracts = addFolder('Contracts', vertex, { age: 64 });
  const vProposal = addFolder('Proposal & Pricing', vertex, { age: 60 });
  const vTech = addFolder('Technical', vertex, { age: 55 });
  const vNotes = addFolder('Call Notes', vertex, { age: 40 });

  const msa = addFile('Vertex - Master Services Agreement (redline).pdf', vContracts, 'pdf',
    { starred: true, age: 21, modAge: 1, versions: 4 });
  addFile('Vertex - Order Form v3.pdf', vContracts, 'pdf', { age: 14, modAge: 2, versions: 3 });
  addFile('Vertex - Mutual NDA (signed).pdf', vContracts, 'pdf', { age: 58, modAge: 58 });
  const pricingModel = addFile('Vertex - Enterprise Pricing Model.xlsx', vProposal, 'sheet',
    { starred: true, age: 30, modAge: 0, versions: 3 });
  addFile('Vertex - Platform Rollout Proposal.pdf', vProposal, 'pdf', { age: 34, modAge: 6, versions: 2 });
  addFile('Vertex - Executive Deck.pptx', vProposal, 'slide', { age: 28, modAge: 3 });
  addFile('Architecture Review.pdf', vTech, 'pdf', { age: 45, modAge: 12 });
  addFile('Security Questionnaire (SOC2).xlsx', vTech, 'sheet', { age: 40, modAge: 20 });
  addFile('Integration Diagram.png', vTech, 'image', { age: 42, modAge: 11, label: 'Architecture' });
  addFile('Discovery Call - transcript.docx', vNotes, 'doc', { age: 38, modAge: 38 });
  addFile('Negotiation Call - notes.docx', vNotes, 'doc', { age: 3, modAge: 3 });
  addFile('Product Demo (recording).mp4', vTech, 'video', { age: 29, modAge: 29 });

  // ---- Contracts (org-wide) ----------------------------------------------
  const templates = addFolder('Templates', contracts, { age: 320 });
  const executed = addFolder('Executed', contracts, { age: 300 });
  addFile('MSA Template.docx', templates, 'doc', { age: 300, modAge: 40 });
  addFile('Order Form Template.docx', templates, 'doc', { age: 300, modAge: 44 });
  addFile('DPA Template.pdf', templates, 'pdf', { age: 260, modAge: 60 });
  addFile('Northwind - MSA (executed).pdf', executed, 'pdf', { age: 120, modAge: 120 });
  addFile('Meridian - Order Form (executed).pdf', executed, 'pdf', { age: 88, modAge: 88 });
  addFile('Apex Systems - Renewal (executed).pdf', executed, 'pdf', { age: 40, modAge: 40, ownerId: someoneElse() });

  // ---- Proposals ---------------------------------------------------------
  addFile('Cobalt Labs - Proposal.pdf', proposals, 'pdf', { age: 24, modAge: 24 });
  addFile('Summit Freight - Pilot Proposal.pdf', proposals, 'pdf', { age: 12, modAge: 5 });
  addFile('Beacon Health - Expansion Proposal.pdf', proposals, 'pdf', { age: 40, modAge: 18, ownerId: someoneElse() });
  addFile('Proposal ROI Calculator.xlsx', proposals, 'sheet', { starred: true, age: 60, modAge: 8 });

  // ---- Sales Collateral --------------------------------------------------
  const brand = addFolder('Brand & Logos', collateral, { age: 250 });
  const oneP = addFolder('One-Pagers', collateral, { age: 200 });
  addFile('Rally Overview Deck.pptx', collateral, 'slide', { starred: true, age: 120, modAge: 9, versions: 3 });
  addFile('Product Screenshots.zip', collateral, 'zip', { age: 90, modAge: 30 });
  addFile('Company Logo (primary).png', brand, 'image', { age: 240, modAge: 60, label: 'Rally' });
  addFile('Company Logo (mono).png', brand, 'image', { age: 240, modAge: 60, label: 'Rally mono' });
  addFile('Brand Guidelines.pdf', brand, 'pdf', { age: 200, modAge: 50 });
  addFile('Platform One-Pager.pdf', oneP, 'pdf', { age: 80, modAge: 20 });
  addFile('Security One-Pager.pdf', oneP, 'pdf', { age: 80, modAge: 22 });
  addFile('Customer Story - Northwind.pdf', oneP, 'pdf', { age: 70, modAge: 30 });

  // ---- Product & Enablement ----------------------------------------------
  addFile('Competitive Battlecards.xlsx', product, 'sheet', { starred: true, age: 60, modAge: 4 });
  addFile('Objection Handling Guide.docx', product, 'doc', { age: 90, modAge: 15 });
  addFile('Onboarding Playbook.pdf', product, 'pdf', { age: 110, modAge: 26 });
  addFile('Feature Roadmap.png', product, 'image', { age: 30, modAge: 7, label: 'Roadmap' });
  addFile('Enablement - New Hire Kickoff.mp4', product, 'video', { age: 75, modAge: 75, ownerId: someoneElse() });

  // ---- QBR ---------------------------------------------------------------
  addFile('Q2 Revenue Review.pptx', qbr, 'slide', { age: 20, modAge: 2, versions: 2 });
  addFile('Q2 Pipeline Snapshot.xlsx', qbr, 'sheet', { age: 20, modAge: 1 });
  addFile('Board Deck - July.pptx', qbr, 'slide', { starred: true, age: 8, modAge: 0, ownerId: me });

  // ---- Team (owned by others -> "shared with me") ------------------------
  addFile('Team Offsite Photos.zip', team, 'zip', { age: 45, modAge: 45, ownerId: someoneElse() });
  addFile('Comp Plan 2026.pdf', team, 'pdf', { age: 180, modAge: 30, ownerId: someoneElse() });
  addFile('Org Chart.png', team, 'image', { age: 60, modAge: 12, label: 'Org', ownerId: someoneElse() });

  // ---- Root-level loose files --------------------------------------------
  addFile('Welcome to Rally Drive.pdf', null, 'pdf', { starred: true, age: 2, modAge: 2 });
  const forecast = addFile('Q3 Forecast Model.xlsx', null, 'sheet', { starred: true, age: 5, modAge: 0, versions: 2 });

  // ---- Trash (a couple of restorable items) ------------------------------
  addFile('Old Pricing (deprecated).xlsx', proposals, 'sheet', { age: 200, modAge: 120, trashed: true });
  addFile('Draft Deck v1.pptx', collateral, 'slide', { age: 160, modAge: 100, trashed: true });

  // ---- Sharing: people + link permissions --------------------------------
  // The whole Vertex room is shared with the deal team as editors.
  grant(vertex, others[0] || me, 'editor');
  grant(vertex, others[1] || me, 'commenter');
  grant(msa, others[0] || me, 'editor');
  grant(msa, others[2] || me, 'viewer');
  grant(pricingModel, others[1] || me, 'commenter');
  grant(collateral, others[0] || me, 'viewer');
  grant(forecast, others[3] || me, 'commenter');
  // Files owned by teammates but shared TO me -> populate "Shared with me".
  linkShare(msa, 'viewer');
  linkShare(collateral, 'viewer');
  linkShare(forecast, 'commenter');

  // ---- Activity feed on the marquee contract -----------------------------
  const msaNode = nodes.find(n => n.id === msa);
  if (msaNode) {
    msaNode.activity = [
      { id: msa + '_a1', type: 'edit',    at: daysAgo(1),  byId: me,            text: 'uploaded version v4 (redline)' },
      { id: msa + '_a2', type: 'comment', at: daysAgo(2),  byId: others[0] || me, text: 'left a comment on section 7.2' },
      { id: msa + '_a3', type: 'share',   at: daysAgo(4),  byId: me,            text: 'shared with Vertex legal (link)' },
      { id: msa + '_a4', type: 'edit',    at: daysAgo(6),  byId: others[0] || me, text: 'uploaded version v3' },
      { id: msa + '_a5', type: 'view',    at: daysAgo(8),  byId: others[2] || me, text: 'viewed the document' },
    ];
  }

  return {
    seededAt: new Date(SEED_BASE).toISOString(),
    nodes, permissions, shares, quotaBytes: QUOTA_BYTES, currentUserId: me,
  };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.nodes) && s.nodes.length) return s;
    }
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetDrive() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getDriveState() { return state; }

export function useDrive(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

/* ============================================================
   READ API
   ============================================================ */
export const getNodes = () => state.nodes;                                   // SUPABASE: from('rally_drive_nodes').select()
export const getNode = (id) => state.nodes.find(n => n.id === id) || null;
export const currentUserId = () => state.currentUserId;

// Live (not-trashed) children of a folder, folders first then files, A-Z.
export function getChildren(parentId = null) {
  return state.nodes
    .filter(n => !n.trashed && (n.parentId || null) === (parentId || null))
    .sort(sortNodes('name', 'asc'));
}
export function childCount(folderId) {
  return state.nodes.filter(n => !n.trashed && n.parentId === folderId).length;
}
// Recursive count (for a folder card subtitle).
export function descendantCount(folderId) {
  let total = 0;
  const walk = (pid) => {
    for (const n of state.nodes) {
      if (n.trashed || n.parentId !== pid) continue;
      total++;
      if (n.kind === 'folder') walk(n.id);
    }
  };
  walk(folderId);
  return total;
}
// Total size of a folder subtree (bytes).
export function folderSize(folderId) {
  let total = 0;
  const walk = (pid) => {
    for (const n of state.nodes) {
      if (n.trashed || n.parentId !== pid) continue;
      if (n.kind === 'file') total += n.size || 0;
      else walk(n.id);
    }
  };
  walk(folderId);
  return total;
}

export function breadcrumb(nodeId) {
  const chain = [];
  let cur = nodeId ? getNode(nodeId) : null;
  let guard = 0;
  while (cur && guard++ < 50) { chain.unshift(cur); cur = cur.parentId ? getNode(cur.parentId) : null; }
  return chain; // [] at root
}

export function sortNodes(key = 'modifiedAt', dir = 'desc') {
  const s = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    // Folders always sort above files for name/kind sorts.
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    let av, bv;
    if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); return av < bv ? -s : av > bv ? s : 0; }
    if (key === 'size') { av = a.size || 0; bv = b.size || 0; }
    else { av = new Date(a.modifiedAt).getTime(); bv = new Date(b.modifiedAt).getTime(); }
    return (av - bv) * s;
  };
}

/* ---------- smart views ---------- */
export function recentFiles(limit = 40) {
  return state.nodes.filter(n => n.kind === 'file' && !n.trashed)
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)).slice(0, limit);
}
export function starredNodes() {
  return state.nodes.filter(n => n.starred && !n.trashed).sort(sortNodes('modifiedAt', 'desc'));
}
export function trashedNodes() {
  return state.nodes.filter(n => n.trashed).sort(sortNodes('modifiedAt', 'desc'));
}
// Shared with me: nodes I do not own that carry a permission for me OR a link.
export function sharedWithMe() {
  const me = state.currentUserId;
  return state.nodes.filter(n => {
    if (n.trashed || n.ownerId === me) return false;
    const perms = state.permissions[n.id] || [];
    return perms.some(p => p.userId === me) || perms.length > 0 || state.shares[n.id]?.enabled;
  }).sort(sortNodes('modifiedAt', 'desc'));
}

/* ---------- permissions + shares ---------- */
export const getPermissions = (nodeId) => state.permissions[nodeId] || [];
export const getShare = (nodeId) => state.shares[nodeId] || null;
// Everyone with any access (owner + explicit grants), for the detail panel.
export function accessList(nodeId) {
  const n = getNode(nodeId);
  if (!n) return [];
  const out = [{ userId: n.ownerId, role: 'owner' }];
  for (const p of getPermissions(nodeId)) if (p.userId !== n.ownerId) out.push(p);
  return out;
}
export function isSharedNode(nodeId) {
  return getPermissions(nodeId).length > 0 || !!state.shares[nodeId]?.enabled;
}

/* ---------- storage accounting ---------- */
export function storageStats() {
  const byType = {};
  let used = 0;
  for (const n of state.nodes) {
    if (n.kind !== 'file' || n.trashed) continue;
    used += n.size || 0;
    byType[n.fileType] = (byType[n.fileType] || 0) + (n.size || 0);
  }
  let trash = 0;
  for (const n of state.nodes) if (n.kind === 'file' && n.trashed) trash += n.size || 0;
  const quota = state.quotaBytes || QUOTA_BYTES;
  const breakdown = Object.entries(byType)
    .map(([type, bytes]) => ({ type, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
  return { used, trash, quota, pct: Math.min(100, (used / quota) * 100), breakdown };
}

// User directory passthrough for the people picker (from the CRM store).
export function driveUsers() { try { return getUsers() || []; } catch { return []; } }
export function driveUser(id) { try { return getUser(id); } catch { return null; } }

/* ============================================================
   WRITE API   (each notes the live query; returns record or {error})
   ============================================================ */
function logActivity(node, type, text) {
  const entry = { id: newId('act_'), type, at: nowISO(), byId: state.currentUserId, text };
  node.activity = [entry, ...(node.activity || [])].slice(0, 40);
}

// SUPABASE: from('rally_drive_nodes').insert({ kind:'folder', ... })
export function createFolder(name, parentId = null, ownerId) {
  const nm = (name || '').trim();
  if (!nm) return { error: 'name', message: 'Folder name is required.' };
  const node = {
    id: newId('fld_'), name: nm, kind: 'folder', parentId: parentId || null,
    ownerId: ownerId || state.currentUserId, starred: false, trashed: false, color: null,
    createdAt: nowISO(), modifiedAt: nowISO(), versions: [], activity: [],
  };
  commit({ ...state, nodes: [node, ...state.nodes] });
  return { node };
}

// SUPABASE: upload to storage bucket + insert row. Local-first stores name/type/
// size and a preview data-URL (images) so the file is real without a backend.
export function uploadFile({ name, parentId = null, fileType, size = 0, preview = null, ownerId }) {
  const nm = (name || '').trim();
  if (!nm) return { error: 'name', message: 'A file name is required.' };
  const ft = FILE_TYPES[fileType] ? fileType : inferType(nm);
  const node = {
    id: newId('fil_'), name: nm, kind: 'file', parentId: parentId || null,
    fileType: ft, size: Number(size) || 0, preview: preview || null,
    ownerId: ownerId || state.currentUserId, starred: false, trashed: false,
    createdAt: nowISO(), modifiedAt: nowISO(),
    versions: [{ id: newId('v_'), label: 'v1', size: Number(size) || 0, at: nowISO(), byId: ownerId || state.currentUserId, current: true }],
    activity: [], sheetKey: ft === 'sheet' ? null : null,
  };
  logActivity(node, 'edit', 'uploaded the file');
  commit({ ...state, nodes: [node, ...state.nodes] });
  return { node };
}

// Map an extension to a file type (used by the uploader).
export function inferType(name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'txt', 'rtf', 'pages', 'md'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slide';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  return 'other';
}

// SUPABASE: from('rally_drive_nodes').update({ name }).eq('id', id)
export function renameNode(id, name) {
  const n = getNode(id);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  const nm = (name || '').trim();
  if (!nm) return { error: 'name', message: 'Name cannot be empty.' };
  n.name = nm; n.modifiedAt = nowISO();
  logActivity(n, 'rename', `renamed to "${nm}"`);
  commit({ ...state });
  return { node: n };
}

// Guard against moving a folder into itself or its own descendant.
export function canMove(id, targetId) {
  if (id === targetId) return false;
  if (!targetId) return true;
  let cur = getNode(targetId);
  let guard = 0;
  while (cur && guard++ < 50) { if (cur.id === id) return false; cur = cur.parentId ? getNode(cur.parentId) : null; }
  return true;
}
// SUPABASE: from('rally_drive_nodes').update({ parent_id }).eq('id', id)
export function moveNode(id, targetId = null) {
  const n = getNode(id);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  if (!canMove(id, targetId)) return { error: 'move', message: 'Cannot move a folder into itself.' };
  n.parentId = targetId || null; n.modifiedAt = nowISO();
  logActivity(n, 'move', 'moved to a new folder');
  commit({ ...state });
  return { node: n };
}

export function toggleStar(id) {
  const n = getNode(id);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  n.starred = !n.starred;
  commit({ ...state });
  return { node: n };
}

// SUPABASE: soft-delete (trashed=true). Reversible via restoreNode.
export function trashNode(id) {
  const n = getNode(id);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  const ids = [id];
  if (n.kind === 'folder') { const walk = (pid) => { for (const c of state.nodes) if (c.parentId === pid) { ids.push(c.id); if (c.kind === 'folder') walk(c.id); } }; walk(id); }
  for (const nid of ids) { const t = getNode(nid); if (t) { t.trashed = true; t.modifiedAt = nowISO(); } }
  commit({ ...state });
  return { ok: true, count: ids.length };
}
export function restoreNode(id) {
  const n = getNode(id);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  // If the parent is gone/trashed, restore to root so it never orphans.
  const parent = n.parentId ? getNode(n.parentId) : null;
  if (n.parentId && (!parent || parent.trashed)) n.parentId = null;
  n.trashed = false; n.modifiedAt = nowISO();
  commit({ ...state });
  return { node: n };
}
export function emptyTrash() {
  const gone = new Set(state.nodes.filter(n => n.trashed).map(n => n.id));
  const permissions = { ...state.permissions }; const shares = { ...state.shares };
  for (const id of gone) { delete permissions[id]; delete shares[id]; }
  commit({ ...state, nodes: state.nodes.filter(n => !n.trashed), permissions, shares });
  return { ok: true };
}
// Permanently remove a single trashed node (and any descendants), plus its
// permission + link-share rows. Guarded: only acts on already-trashed items.
export function deleteNode(id) {
  const n = getNode(id);
  if (!n || !n.trashed) return { error: 'guard', message: 'Move to Trash first.' };
  const ids = [id];
  if (n.kind === 'folder') { const walk = (pid) => { for (const c of state.nodes) if (c.parentId === pid) { ids.push(c.id); if (c.kind === 'folder') walk(c.id); } }; walk(id); }
  const drop = new Set(ids);
  const permissions = { ...state.permissions }; const shares = { ...state.shares };
  for (const nid of ids) { delete permissions[nid]; delete shares[nid]; }
  commit({ ...state, nodes: state.nodes.filter(x => !drop.has(x.id)), permissions, shares });
  return { ok: true, count: ids.length };
}

/* ---------- sharing writers ---------- */
// SUPABASE: from('rally_drive_permissions').upsert({ node_id, user_id, role })
export function setPermission(nodeId, userId, role) {
  const n = getNode(nodeId);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  if (userId === n.ownerId) return { error: 'owner', message: 'This person owns the file.' };
  const list = (state.permissions[nodeId] || []).filter(p => p.userId !== userId);
  list.push({ userId, role });
  const permissions = { ...state.permissions, [nodeId]: list };
  logActivity(n, 'share', `shared with ${driveUser(userId)?.name || 'a teammate'} as ${roleLabel(role)}`);
  commit({ ...state, permissions });
  return { ok: true };
}
export function removePermission(nodeId, userId) {
  const list = (state.permissions[nodeId] || []).filter(p => p.userId !== userId);
  const permissions = { ...state.permissions, [nodeId]: list };
  commit({ ...state, permissions });
  return { ok: true };
}
// SUPABASE: from('rally_drive_shares').upsert({ node_id, enabled, access })
export function setLinkShare(nodeId, { enabled, access = 'viewer' } = {}) {
  const n = getNode(nodeId);
  if (!n) return { error: 'missing', message: 'Item not found.' };
  const existing = state.shares[nodeId];
  const share = enabled
    ? { enabled: true, access, token: existing?.token || newId('lnk_'), createdAt: existing?.createdAt || nowISO() }
    : { enabled: false, access, token: existing?.token || newId('lnk_'), createdAt: existing?.createdAt || nowISO() };
  const shares = { ...state.shares, [nodeId]: share };
  if (enabled && !existing?.enabled) logActivity(n, 'share', `created a ${roleLabel(access)} link`);
  commit({ ...state, shares });
  return { share };
}
export function shareUrl(nodeId) {
  const s = state.shares[nodeId];
  const t = s?.token || nodeId;
  return `https://rally.app/d/${t}`;
}
