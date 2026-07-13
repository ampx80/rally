// ============================================================
// RALLY DATASYNC - Operations Hub (local-first, Supabase-swappable)
// ------------------------------------------------------------
// The data-operations layer HubSpot charges Ops Hub money for, bundled
// into Rally. Three jobs, one promise: keep the book of business clean,
// synced, and trustworthy enough to be the system of record.
//   1. Sync jobs   - two-way connections to a warehouse, Sheets, an ERP
//                    or a legacy CRM. Direction, cadence, records synced,
//                    health, and a sync-now action.
//   2. Field maps  - map an external column to a Rally field with a
//                    transform hint. Add, remove, toggle, retarget.
//   3. Data health - completeness by object, duplicate rate (tied to the
//                    Duplicates tool), formatting issues, stale records,
//                    a single health score and a fix-queue.
//   4. Scheduled   - programmable data jobs on a cadence.
//
// This slice is ADDITIVE. It never mutates store.js; it seeds its own
// deterministic world (mulberry32, fixed integer seed) and persists to
// localStorage so the demo is alive with ZERO backend. A real sync run
// is env-gated (VITE_SYNC_PROVIDER) and degrades to a local simulation.
// Live equivalent: rally_sync_jobs + rally_field_maps + rally_data_health
// tables; runs route through api/sync-run.js. ASCII only, NO em-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_datasync_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (mirrors store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */
// External systems Rally can sync with. Color + short drive every chip so
// a system reads the same everywhere.
export const SYSTEMS = [
  { id: 'snowflake', label: 'Snowflake', kind: 'Data warehouse', color: '#2aa9e0', short: 'SN' },
  { id: 'salesforce', label: 'Salesforce', kind: 'Legacy CRM', color: '#1798c1', short: 'SF' },
  { id: 'netsuite', label: 'NetSuite', kind: 'ERP', color: '#2f6fdb', short: 'NS' },
  { id: 'sheets', label: 'Google Sheets', kind: 'Spreadsheet', color: '#0f9d58', short: 'GS' },
  { id: 'segment', label: 'Segment', kind: 'Customer data platform', color: '#52bd94', short: 'SG' },
  { id: 'postgres', label: 'Postgres replica', kind: 'Database', color: '#4b7bab', short: 'PG' },
];
export const systemById = (id) => SYSTEMS.find(s => s.id === id) || SYSTEMS[0];

// Sync direction relative to Rally. Icons reuse the existing set.
export const DIRECTIONS = {
  in: { id: 'in', label: 'Inbound', desc: 'Into Rally', icon: 'arrowLeft', tone: 'info' },
  out: { id: 'out', label: 'Outbound', desc: 'Out of Rally', icon: 'arrowRight', tone: 'default' },
  two: { id: 'two', label: 'Two-way', desc: 'Bidirectional', icon: 'swap', tone: 'accent' },
};
export const directionById = (id) => DIRECTIONS[id] || DIRECTIONS.two;

export const SYNC_STATUS = {
  healthy: { label: 'Healthy', tone: 'ok', dot: 'var(--ok)' },
  erroring: { label: 'Erroring', tone: 'risk', dot: 'var(--risk)' },
  paused: { label: 'Paused', tone: 'default', dot: 'var(--n-400)' },
};
export const statusMeta = (id) => SYNC_STATUS[id] || SYNC_STATUS.healthy;

// Rally objects the sync + health engine understands.
export const OBJECTS = [
  { id: 'contacts', label: 'Contacts', icon: 'users' },
  { id: 'companies', label: 'Companies', icon: 'building' },
  { id: 'deals', label: 'Deals', icon: 'target' },
  { id: 'activities', label: 'Activities', icon: 'activity' },
];
export const objectById = (id) => OBJECTS.find(o => o.id === id) || OBJECTS[0];

// Rally target fields per object - the destinations offered in the map editor.
export const RALLY_FIELDS = {
  contacts: ['firstName', 'lastName', 'email', 'phone', 'title', 'companyId', 'lifecycleStage', 'ownerId'],
  companies: ['name', 'domain', 'industry', 'size', 'location', 'health'],
  deals: ['name', 'value', 'stage', 'probability', 'closeDate', 'ownerId'],
  activities: ['type', 'subject', 'dueAt', 'done', 'ownerId'],
};

export const TRANSFORMS = [
  'Direct copy', 'Lowercase', 'Uppercase code', 'Trim whitespace', 'Map picklist',
  'Parse date', 'Concat name', 'Currency to number', 'Normalize phone', 'Dedupe key',
];

// Suggested transform for a Rally field (deterministic, no fabrication).
function transformFor(field) {
  if (field === 'email') return 'Lowercase';
  if (field === 'phone') return 'Normalize phone';
  if (field === 'value') return 'Currency to number';
  if (field === 'closeDate' || field === 'dueAt') return 'Parse date';
  if (field === 'stage' || field === 'lifecycleStage' || field === 'health' || field === 'type') return 'Map picklist';
  if (field === 'name' || field === 'firstName' || field === 'lastName') return 'Trim whitespace';
  return 'Direct copy';
}

// Plausible external column names per Rally field.
const SRC_NAMES = {
  firstName: ['first_name', 'FirstName', 'fname'],
  lastName: ['last_name', 'LastName', 'lname'],
  email: ['email', 'Email', 'email_address', 'primary_email'],
  phone: ['phone', 'Phone', 'phone_number', 'mobile'],
  title: ['title', 'JobTitle', 'job_title', 'role'],
  companyId: ['account_id', 'company_ref', 'AccountId'],
  lifecycleStage: ['lifecycle', 'stage_c', 'status'],
  ownerId: ['owner', 'owner_id', 'OwnerId', 'rep'],
  name: ['name', 'Name', 'company_name', 'account_name'],
  domain: ['domain', 'website', 'web_url'],
  industry: ['industry', 'Industry', 'sector'],
  size: ['employees', 'headcount', 'company_size'],
  location: ['city', 'location', 'hq_city'],
  health: ['health', 'account_health', 'risk_tier'],
  value: ['amount', 'Amount', 'deal_value', 'acv'],
  stage: ['stage', 'StageName', 'pipeline_stage'],
  probability: ['probability', 'Probability', 'win_pct'],
  closeDate: ['close_date', 'CloseDate', 'expected_close'],
  type: ['type', 'activity_type'],
  subject: ['subject', 'Subject', 'summary'],
  dueAt: ['due_date', 'due_at', 'activity_date'],
  done: ['completed', 'is_done', 'closed'],
};

/* ============================================================
   SEED  (deterministic - fixed integer seed)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260713);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const ago = (ms) => new Date(now - ms).toISOString();
  const ahead = (ms) => new Date(now + ms).toISOString();

  /* --- sync jobs (curated, then metric-stamped) --- */
  const jobDefs = [
    { id: 'sync_snowflake', name: 'Snowflake analytics warehouse', systemId: 'snowflake', direction: 'out', status: 'healthy', frequency: 'Every 15 min', objects: ['contacts', 'companies', 'deals', 'activities'] },
    { id: 'sync_salesforce', name: 'Salesforce migration bridge', systemId: 'salesforce', direction: 'two', status: 'healthy', frequency: 'Real-time', objects: ['contacts', 'companies', 'deals'] },
    { id: 'sync_netsuite', name: 'NetSuite finance sync', systemId: 'netsuite', direction: 'in', status: 'erroring', frequency: 'Hourly', objects: ['companies', 'deals'] },
    { id: 'sync_sheets', name: 'RevOps board Google Sheet', systemId: 'sheets', direction: 'out', status: 'healthy', frequency: 'Every 6 hours', objects: ['deals'] },
    { id: 'sync_segment', name: 'Segment product events', systemId: 'segment', direction: 'in', status: 'healthy', frequency: 'Real-time', objects: ['contacts', 'activities'] },
    { id: 'sync_postgres', name: 'Postgres reporting replica', systemId: 'postgres', direction: 'out', status: 'paused', frequency: 'Daily 2:00 AM', objects: ['contacts', 'companies', 'deals', 'activities'] },
  ];

  const jobs = jobDefs.map((j) => {
    const recordsTotal = range(4, 42) * 1000;
    const errorCount = j.status === 'erroring' ? range(12, 140) : 0;
    const lastMs = j.status === 'paused'
      ? DAY * range(2, 6)
      : (j.frequency === 'Real-time' ? MIN * range(1, 5) : HOUR * range(1, 8));
    const recordsSynced = j.status === 'erroring'
      ? recordsTotal - range(240, 900)
      : recordsTotal - range(0, 60);
    return {
      ...j,
      recordsTotal,
      recordsSynced,
      errorCount,
      errorMsg: j.status === 'erroring' ? 'Auth token rejected on last pull. Reconnect the source to resume.' : '',
      lastSyncAt: ago(lastMs),
      nextSyncAt: j.status === 'paused' ? null : ahead(HOUR * range(1, 6)),
      latencyMs: range(120, 900),
      throughput: Array.from({ length: 12 }, () => range(22, 100)),
    };
  });

  /* --- field mappings per job --- */
  const mappings = {};
  for (const j of jobs) {
    const list = [];
    let mi = 0;
    for (const obj of j.objects) {
      for (const field of RALLY_FIELDS[obj]) {
        const keyField = ['email', 'name', 'value', 'firstName', 'subject', 'type'].includes(field);
        if (!keyField && rnd() < 0.26) continue;   // not every field mapped, for realism
        mi++;
        list.push({
          id: `${j.id}_m${mi}`,
          object: obj,
          source: pick(SRC_NAMES[field] || [field]),
          target: field,
          transform: transformFor(field),
          active: !(j.status !== 'paused' && rnd() < 0.07),
          coverage: keyField ? range(94, 100) : range(56, 99),
        });
      }
    }
    mappings[j.id] = list;
    j.mappingCount = list.length;
  }

  /* --- data health metrics --- */
  const objHealth = OBJECTS.map((o) => {
    const total = range(700, 4200);
    const pct = range(72, 98);
    const fields = RALLY_FIELDS[o.id];
    const shuffled = [...fields].sort(() => rnd() - 0.5);
    const missing = shuffled.slice(0, range(2, 3)).map((f) => ({ field: f, pct: range(4, 26) }));
    return { object: o.id, label: o.label, icon: o.icon, total, pct, filled: Math.round(total * pct / 100), missing };
  });
  const totalRecords = objHealth.reduce((a, o) => a + o.total, 0);
  const duplicateCount = range(46, 180);
  const duplicateRate = Number((duplicateCount / totalRecords * 100).toFixed(1));

  const formatting = [
    { id: 'fmt_email', label: 'Invalid email format', object: 'contacts', field: 'email', count: range(8, 42) },
    { id: 'fmt_phone', label: 'Phone numbers not E.164', object: 'contacts', field: 'phone', count: range(24, 96) },
    { id: 'fmt_url', label: 'Domains missing https', object: 'companies', field: 'domain', count: range(6, 30) },
    { id: 'fmt_case', label: 'Inconsistent name casing', object: 'contacts', field: 'firstName', count: range(10, 52) },
  ];
  const stale = OBJECTS.map((o) => ({ object: o.id, label: o.label, count: range(18, 160), days: 90 }));

  const fixQueue = [
    { id: 'fx_1', kind: 'duplicate', object: 'companies', title: 'Merge 12 duplicate accounts', count: 12, severity: 'high', autoFixable: true, detail: 'Same domain, different record ids from the Salesforce bridge.' },
    { id: 'fx_2', kind: 'missing', object: 'contacts', title: 'Backfill 214 missing email addresses', count: 214, severity: 'high', autoFixable: false, detail: 'Enrich from the Segment inbound connection.' },
    { id: 'fx_3', kind: 'format', object: 'contacts', title: 'Normalize 63 phone numbers to E.164', count: 63, severity: 'med', autoFixable: true, detail: 'Apply the Normalize phone transform on write.' },
    { id: 'fx_4', kind: 'stale', object: 'deals', title: 'Review 38 deals with no activity in 90 days', count: 38, severity: 'med', autoFixable: false, detail: 'Flag owners for a follow-up or close-lost.' },
    { id: 'fx_5', kind: 'picklist', object: 'deals', title: 'Remap 9 unknown stage values', count: 9, severity: 'low', autoFixable: true, detail: 'Unmapped values coming from Salesforce StageName.' },
    { id: 'fx_6', kind: 'format', object: 'companies', title: 'Fix 17 domains missing https', count: 17, severity: 'low', autoFixable: true, detail: 'Prepend the protocol on the domain field.' },
  ];

  /* --- scheduled data jobs (programmable automation) --- */
  const scheduled = [
    { id: 'job_snapshot', name: 'Warehouse snapshot', schedule: 'Every 15 min', action: 'Push changed rows to Snowflake', target: 'all', enabled: true, lastRun: ago(MIN * range(2, 14)) },
    { id: 'job_dedupe', name: 'Nightly dedupe sweep', schedule: 'Daily 1:00 AM', action: 'Detect and merge exact-domain duplicates', target: 'companies', enabled: true, lastRun: ago(HOUR * range(6, 20)) },
    { id: 'job_enrich', name: 'Enrichment backfill', schedule: 'Every 6 hours', action: 'Fill missing firmographics from Segment', target: 'companies', enabled: true, lastRun: ago(HOUR * range(1, 6)) },
    { id: 'job_validate', name: 'Format validator', schedule: 'Daily 3:00 AM', action: 'Scan email and phone formatting', target: 'contacts', enabled: true, lastRun: ago(HOUR * range(6, 22)) },
    { id: 'job_stale', name: 'Stale record flagger', schedule: 'Weekly Mon 6:00 AM', action: 'Tag records with no activity in 90 days', target: 'deals', enabled: false, lastRun: ago(DAY * range(3, 7)) },
  ];

  return {
    seededAt: new Date(now).toISOString(),
    jobs, mappings,
    health: { objects: objHealth, totalRecords, duplicateCount, duplicateRate, formatting, stale },
    fixQueue, scheduled,
  };
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
export function resetDataSync() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }

export function useDataSync(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []);
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API
   ============================================================ */
export const getSyncJobs = () => state.jobs;                          // SUPABASE: from('rally_sync_jobs').select()
export const getSyncJob = (id) => state.jobs.find(j => j.id === id) || null;
export const getMappings = (syncId) => state.mappings[syncId] || [];  // SUPABASE: from('rally_field_maps').select().eq('sync_id', id)
export const getHealth = () => state.health;                          // SUPABASE: from('rally_data_health').select()
export const getFixQueue = () => state.fixQueue;
export const getScheduled = () => state.scheduled;

// Single trust number the whole hub rolls up to. Derived from completeness,
// duplicate rate, stale volume, formatting issues and the open fix queue, so
// resolving a fix visibly raises the score.
export function healthScore() {
  const h = state.health;
  const compAvg = h.objects.reduce((a, o) => a + o.pct, 0) / (h.objects.length || 1);
  const dupPenalty = Math.min(20, h.duplicateRate * 2.2);
  const staleTotal = h.stale.reduce((a, s) => a + s.count, 0);
  const stalePenalty = Math.min(14, staleTotal / 60);
  const fmtTotal = h.formatting.reduce((a, f) => a + f.count, 0);
  const fmtPenalty = Math.min(10, fmtTotal / 40);
  const fixPenalty = state.fixQueue.reduce((a, f) => a + (f.severity === 'high' ? 3 : f.severity === 'med' ? 1.5 : 0.5), 0);
  const score = Math.round(compAvg - dupPenalty - stalePenalty - fmtPenalty - fixPenalty);
  return Math.max(0, Math.min(100, score));
}
export function scoreBand(score) {
  if (score >= 90) return { grade: 'Excellent', color: 'var(--ok)' };
  if (score >= 78) return { grade: 'Healthy', color: 'var(--ok)' };
  if (score >= 62) return { grade: 'Needs work', color: 'var(--warn)' };
  return { grade: 'At risk', color: 'var(--risk)' };
}

export function syncSummary() {
  const jobs = state.jobs;
  return {
    total: jobs.length,
    healthy: jobs.filter(j => j.status === 'healthy').length,
    erroring: jobs.filter(j => j.status === 'erroring').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    recordsSynced: jobs.reduce((a, j) => a + j.recordsSynced, 0),
    mappings: jobs.reduce((a, j) => a + (state.mappings[j.id]?.length || 0), 0),
  };
}

/* ============================================================
   WRITE API  (return { error, message } or the record)
   ============================================================ */
// SUPABASE: invoke api/sync-run.js; here we simulate a completed run.
export function runSync(id) {
  const j = getSyncJob(id);
  if (!j) return { error: 'missing', message: 'Sync connection not found.' };
  const before = j.recordsSynced;
  j.status = 'healthy';
  j.errorCount = 0;
  j.errorMsg = '';
  j.recordsSynced = j.recordsTotal;
  j.lastSyncAt = new Date().toISOString();
  j.nextSyncAt = new Date(Date.now() + 3600000).toISOString();
  j.throughput = [...j.throughput.slice(1), 55 + Math.floor((j.recordsTotal / 1000) % 45)];
  commit({ ...state, jobs: [...state.jobs] });
  return { job: j, synced: Math.max(0, j.recordsTotal - before), simulated: !hasSyncEnv() };
}

export function toggleSyncPause(id) {
  const j = getSyncJob(id);
  if (!j) return { error: 'missing', message: 'Sync connection not found.' };
  j.status = j.status === 'paused' ? 'healthy' : 'paused';
  j.nextSyncAt = j.status === 'paused' ? null : new Date(Date.now() + 3600000).toISOString();
  commit({ ...state, jobs: [...state.jobs] });
  return { job: j };
}

// SUPABASE: from('rally_field_maps').insert(row)
export function addMapping(syncId, { object, source, target, transform }) {
  if (!source || !source.trim()) return { error: 'source', message: 'Source field is required.' };
  if (!target) return { error: 'target', message: 'Pick a Rally field to map into.' };
  const list = state.mappings[syncId] || [];
  const m = { id: newId('map'), object: object || 'contacts', source: source.trim(), target, transform: transform || 'Direct copy', active: true, coverage: 100 };
  const mappings = { ...state.mappings, [syncId]: [...list, m] };
  const jobs = state.jobs.map(j => j.id === syncId ? { ...j, mappingCount: mappings[syncId].length } : j);
  commit({ ...state, mappings, jobs });
  return { mapping: m };
}
export function updateMapping(syncId, mapId, patch) {
  const list = state.mappings[syncId] || [];
  const mappings = { ...state.mappings, [syncId]: list.map(m => m.id === mapId ? { ...m, ...patch } : m) };
  commit({ ...state, mappings });
  return { ok: true };
}
export function toggleMapping(syncId, mapId) {
  const list = state.mappings[syncId] || [];
  const mappings = { ...state.mappings, [syncId]: list.map(m => m.id === mapId ? { ...m, active: !m.active } : m) };
  commit({ ...state, mappings });
  return { ok: true };
}
// SUPABASE: from('rally_field_maps').delete().eq('id', mapId)
export function removeMapping(syncId, mapId) {
  const list = state.mappings[syncId] || [];
  const mappings = { ...state.mappings, [syncId]: list.filter(m => m.id !== mapId) };
  const jobs = state.jobs.map(j => j.id === syncId ? { ...j, mappingCount: mappings[syncId].length } : j);
  commit({ ...state, mappings, jobs });
  return { ok: true };
}

export function resolveFix(fixId) {
  const fx = state.fixQueue.find(f => f.id === fixId);
  if (!fx) return { error: 'missing', message: 'Fix not found.' };
  commit({ ...state, fixQueue: state.fixQueue.filter(f => f.id !== fixId) });
  return { ok: true, fix: fx };
}

export function toggleScheduled(id) {
  const scheduled = state.scheduled.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
  commit({ ...state, scheduled });
  return { ok: true };
}
export function runScheduled(id) {
  const s0 = state.scheduled.find(s => s.id === id);
  if (!s0) return { error: 'missing', message: 'Job not found.' };
  const scheduled = state.scheduled.map(s => s.id === id ? { ...s, lastRun: new Date().toISOString() } : s);
  commit({ ...state, scheduled });
  return { ok: true };
}

/* ---------- env gate ---------- */
// A real sync run posts through the provider. Absent env, everything above
// runs as a local simulation and never throws.
export function hasSyncEnv() {
  try { return !!(import.meta && import.meta.env && import.meta.env.VITE_SYNC_PROVIDER); } catch { return false; }
}
