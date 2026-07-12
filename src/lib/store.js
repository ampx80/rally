// ============================================================
// RALLY DATA STORE  (local-first, Supabase-swappable)
// One module owns every CRM data shape + the read/write API.
// A deterministic PRNG builds a believable book of business on
// first run; mutations persist to localStorage so the demo feels
// alive across reloads. Every function carries a // SUPABASE: note
// describing the live equivalent (tables namespaced rally_*).
// ============================================================
import { useEffect, useState } from 'react';
import { logChange } from './audit.js';

const LS_KEY = 'rally_state_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG ---------- */
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

// SUPABASE: rally_stages (config table, per-pipeline). Order + probability.
export const STAGES = [
  { id: 'lead', name: 'Lead', order: 1, probability: 10, type: 'open' },
  { id: 'qualified', name: 'Qualified', order: 2, probability: 25, type: 'open' },
  { id: 'discovery', name: 'Discovery', order: 3, probability: 45, type: 'open' },
  { id: 'proposal', name: 'Proposal', order: 4, probability: 65, type: 'open' },
  { id: 'negotiation', name: 'Negotiation', order: 5, probability: 85, type: 'open' },
  { id: 'won', name: 'Closed Won', order: 6, probability: 100, type: 'won' },
  { id: 'lost', name: 'Closed Lost', order: 7, probability: 0, type: 'lost' },
];
export const OPEN_STAGES = STAGES.filter(s => s.type === 'open');
export const stageById = (id) => STAGES.find(s => s.id === id);

export const ACTIVITY_TYPES = ['task', 'call', 'email', 'meeting', 'note'];
export const ACTIVITY_META = {
  task: { label: 'Task', icon: 'CheckSquare' },
  call: { label: 'Call', icon: 'Phone' },
  email: { label: 'Email', icon: 'Mail' },
  meeting: { label: 'Meeting', icon: 'Calendar' },
  note: { label: 'Note', icon: 'FileText' },
};

const INDUSTRIES = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy', 'Media', 'Real Estate', 'Construction', 'Biotech', 'Aerospace'];
const SIZES = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const TAGS = ['champion', 'decision maker', 'technical', 'economic buyer', 'blocker', 'renewal', 'expansion', 'inbound', 'referral', 'event lead'];

/* name pools */
const FIRST = ['James', 'Maria', 'David', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Linda', 'William', 'Patricia', 'Daniel', 'Karen', 'Andre', 'Priya', 'Wei', 'Fatima', 'Diego', 'Aisha', 'Noah', 'Olivia', 'Liam', 'Emma', 'Marcus', 'Sofia', 'Ethan', 'Zoe', 'Raj', 'Chloe', 'Kenji', 'Amara'];
const LAST = ['Chen', 'Patel', 'Rodriguez', 'Kim', 'Nguyen', 'Johnson', 'Williams', 'Garcia', 'Okafor', 'Muller', 'Rossi', 'Andersson', 'Kowalski', 'Tanaka', 'Silva', 'Reyes', 'Novak', 'Haddad', 'Foster', 'Brooks', 'Sullivan', 'Bennett', 'Castillo', 'Fischer', 'Larsen', 'Mercer', 'Ellison', 'Vance', 'Ortiz', 'Frost'];
const CO_A = ['Vertex', 'Northwind', 'Meridian', 'Apex', 'Cobalt', 'Summit', 'Ironclad', 'Beacon', 'Cascade', 'Lumen', 'Arbor', 'Vantage', 'Keystone', 'Halcyon', 'Pinnacle', 'Sterling', 'Redwood', 'Copperline', 'Blueprint', 'Fathom', 'Granite', 'Harbor', 'Juniper', 'Kestrel', 'Lattice', 'Monarch', 'Nimbus', 'Onyx', 'Prairie', 'Quartz', 'Ridgeline', 'Solstice', 'Tidewater', 'Umbra', 'Vireo', 'Windward', 'Zenith', 'Aster', 'Bramble', 'Crestwood'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Freight', 'Retail', 'Energy', 'Media', 'Partners', 'Group', 'Dynamics', 'Analytics', 'Industries', 'Networks', 'Bioscience', 'Aerospace', 'Foods', 'Solutions'];
const TITLES = ['VP of Sales', 'Chief Revenue Officer', 'Director of Operations', 'Head of Procurement', 'VP Engineering', 'CFO', 'COO', 'Director of IT', 'VP Marketing', 'Head of Finance', 'Operations Manager', 'CTO', 'VP Product', 'Director of Sales', 'General Manager', 'Head of People'];
const DEAL_KINDS = ['Platform rollout', 'Annual license', 'Enterprise expansion', 'Pilot to production', 'Renewal + upsell', 'New logo', 'Multi-year contract', 'Department rollout', 'Seat expansion', 'Migration project'];
const CITIES = ['San Francisco, CA', 'Austin, TX', 'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Seattle, WA', 'Atlanta, GA', 'New York, NY', 'Portland, OR', 'Nashville, TN', 'Columbus, OH', 'Raleigh, NC'];

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260708);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const sampleN = (a, n) => {
    const copy = [...a]; const out = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    return out;
  };
  const now = Date.now();
  const DAY = 86400000;
  const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

  /* --- users (the revenue team) --- */
  const users = [
    { id: 'u_1', name: 'Jordan Avery', email: 'jordan@rally.app', role: 'rep', title: 'Senior Account Executive', quota: 900000 },
    { id: 'u_2', name: 'Simone Diaz', email: 'simone@rally.app', role: 'rep', title: 'Account Executive', quota: 750000 },
    { id: 'u_3', name: 'Theo Bennett', email: 'theo@rally.app', role: 'rep', title: 'Account Executive', quota: 750000 },
    { id: 'u_4', name: 'Nina Kapoor', email: 'nina@rally.app', role: 'rep', title: 'Enterprise AE', quota: 1200000 },
    { id: 'u_5', name: 'Marcus Hale', email: 'marcus@rally.app', role: 'rep', title: 'Account Executive', quota: 700000 },
    { id: 'u_6', name: 'Elena Ross', email: 'elena@rally.app', role: 'manager', title: 'VP of Revenue', quota: 0 },
  ];
  const repIds = users.filter(u => u.role === 'rep').map(u => u.id);
  const currentUserId = 'u_1';

  /* --- companies --- */
  const companies = [];
  const usedNames = new Set();
  for (let i = 0; i < 40; i++) {
    let name;
    let guard = 0;
    do { name = `${pick(CO_A)} ${pick(CO_B)}`; guard++; } while (usedNames.has(name) && guard < 20);
    usedNames.add(name);
    const domain = name.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    const health = pick(['green', 'green', 'green', 'yellow', 'yellow', 'red']);
    companies.push({
      id: `co_${i + 1}`,
      name,
      domain,
      industry: pick(INDUSTRIES),
      size: pick(SIZES),
      location: pick(CITIES),
      ownerId: pick(repIds),
      health,
      createdAt: daysFromNow(-range(30, 400)),
    });
  }
  // Flagship demo account, pinned first, rich and enterprise.
  const flagship = {
    id: 'co_flagship',
    name: 'Vertex Robotics',
    domain: 'vertexrobotics.com',
    industry: 'Manufacturing',
    size: '1001-5000',
    location: 'Austin, TX',
    ownerId: currentUserId,
    health: 'green',
    flagship: true,
    createdAt: daysFromNow(-210),
  };
  companies.unshift(flagship);

  /* --- contacts --- */
  const contacts = [];
  let ci = 0;
  for (const co of companies) {
    const n = co.flagship ? 5 : range(2, 4);
    for (let k = 0; k < n; k++) {
      ci++;
      const firstName = pick(FIRST);
      const lastName = pick(LAST);
      contacts.push({
        id: `c_${ci}`,
        firstName, lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${co.domain}`,
        phone: `(${range(200, 989)}) ${range(200, 989)}-${String(range(1000, 9999))}`,
        title: pick(TITLES),
        companyId: co.id,
        ownerId: co.ownerId,
        tags: sampleN(TAGS, range(0, 2)),
        lastActivityAt: daysFromNow(-range(0, 60)),
        createdAt: daysFromNow(-range(10, 300)),
      });
    }
  }

  /* --- deals --- */
  const deals = [];
  let di = 0;
  const contactsByCo = (coId) => contacts.filter(c => c.companyId === coId);
  for (const co of companies) {
    if (!co.flagship && chance(0.28)) continue; // not every company has an open deal
    const n = co.flagship ? 2 : (chance(0.25) ? 2 : 1);
    for (let k = 0; k < n; k++) {
      di++;
      const stage = pick(STAGES.map(s => s.id).filter(id => {
        // weight toward open stages; some closed
        return true;
      }));
      // weighted stage selection
      const r = rnd();
      let stageId;
      if (r < 0.16) stageId = 'lead';
      else if (r < 0.34) stageId = 'qualified';
      else if (r < 0.52) stageId = 'discovery';
      else if (r < 0.66) stageId = 'proposal';
      else if (r < 0.76) stageId = 'negotiation';
      else if (r < 0.90) stageId = 'won';
      else stageId = 'lost';
      const st = stageById(stageId);
      const value = range(8, 96) * 5000; // 40k..480k
      const coContacts = contactsByCo(co.id);
      const closed = st.type !== 'open';
      const closeDate = closed ? daysFromNow(-range(2, 120)) : daysFromNow(range(3, 110));
      deals.push({
        id: `d_${di}`,
        name: `${co.name} - ${pick(DEAL_KINDS)}`,
        companyId: co.id,
        contactIds: sampleN(coContacts, Math.min(coContacts.length, range(1, 3))).map(c => c.id),
        value,
        stage: stageId,
        probability: st.probability,
        closeDate,
        ownerId: co.ownerId,
        status: st.type === 'open' ? 'open' : st.type,
        createdAt: daysFromNow(-range(5, 180)),
      });
    }
  }
  // Guarantee the flagship has a marquee enterprise deal in Negotiation.
  deals.unshift({
    id: 'd_flagship',
    name: 'Vertex Robotics - Enterprise platform rollout',
    companyId: 'co_flagship',
    contactIds: contactsByCo('co_flagship').slice(0, 3).map(c => c.id),
    value: 420000,
    stage: 'negotiation',
    probability: 85,
    closeDate: daysFromNow(21),
    ownerId: currentUserId,
    status: 'open',
    createdAt: daysFromNow(-64),
  });

  /* --- activities --- */
  const activities = [];
  let ai = 0;
  const SUBJECTS = {
    call: ['Discovery call', 'Follow-up call', 'Check-in call', 'Pricing discussion', 'Stakeholder call'],
    email: ['Sent proposal', 'Follow-up email', 'Shared case study', 'Intro email', 'Contract sent'],
    meeting: ['Demo', 'Kickoff meeting', 'Technical deep dive', 'Executive review', 'QBR'],
    task: ['Send follow-up', 'Prepare proposal', 'Loop in solutions engineer', 'Draft SOW', 'Confirm budget', 'Schedule demo'],
    note: ['Call notes', 'Account context', 'Competitive intel', 'Next steps', 'Champion identified'],
  };
  const openDeals = deals.filter(d => d.status === 'open');
  // deal-anchored activities
  for (const d of deals) {
    const n = d.id === 'd_flagship' ? 8 : range(1, 4);
    for (let k = 0; k < n; k++) {
      ai++;
      const type = pick(ACTIVITY_TYPES);
      const past = chance(0.62);
      activities.push({
        id: `a_${ai}`,
        type,
        subject: pick(SUBJECTS[type]),
        body: '',
        dueAt: past ? daysFromNow(-range(1, 45)) : daysFromNow(range(0, 21)),
        done: past && type !== 'note' ? chance(0.8) : (type === 'note'),
        relatedType: 'deal',
        relatedId: d.id,
        companyId: d.companyId,
        ownerId: d.ownerId,
        createdAt: daysFromNow(-range(1, 60)),
      });
    }
  }
  // a few contact/company anchored tasks for "my day"
  for (let k = 0; k < 40; k++) {
    ai++;
    const c = pick(contacts);
    const type = pick(['task', 'call', 'email']);
    const upcoming = chance(0.6);
    activities.push({
      id: `a_${ai}`,
      type,
      subject: pick(SUBJECTS[type]),
      body: '',
      dueAt: upcoming ? daysFromNow(range(0, 14)) : daysFromNow(-range(1, 20)),
      done: !upcoming && chance(0.5),
      relatedType: 'contact',
      relatedId: c.id,
      companyId: c.companyId,
      ownerId: c.ownerId,
      createdAt: daysFromNow(-range(1, 30)),
    });
  }
  // Ensure the current user has a punchy "my day": a few open tasks due soon.
  const flagshipContacts = contactsByCo('co_flagship');
  const myDaySeed = [
    { type: 'call', subject: 'Negotiation call with Vertex Robotics', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(0) },
    { type: 'task', subject: 'Send redlined MSA to Vertex legal', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(1) },
    { type: 'email', subject: 'Follow up with champion on timeline', relatedType: 'contact', relatedId: flagshipContacts[0]?.id, companyId: 'co_flagship', dueAt: daysFromNow(0) },
    { type: 'meeting', subject: 'Executive review - final approval', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(2) },
  ];
  for (const m of myDaySeed) {
    ai++;
    activities.push({ id: `a_${ai}`, body: '', done: false, ownerId: currentUserId, createdAt: daysFromNow(-2), ...m });
  }

  return { seededAt: new Date(now).toISOString(), currentUserId, users, companies, contacts, deals, activities };
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
      const s = migrate(JSON.parse(raw));
      try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
      return s;
    }
  } catch {}
  const seed = migrate(buildSeed());
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

/* Wave 1 migration shim: single-entity status model (spec Section 0.1 + 1.4).
   Contacts + companies gain lifecycleStage, derived from existing data:
   won deal -> customer, open deal -> opportunity, otherwise sql (worked, in
   the book of business). Contacts inherit their company's stage; orphan
   contacts start at lead. record.fieldValues initializes lazily on first
   write. Idempotent - existing values are never overwritten. */
function migrate(s) {
  try {
    const wonCo = new Set(), openCo = new Set();
    for (const d of s.deals || []) {
      if (d.status === 'won') wonCo.add(d.companyId);
      else if (d.status === 'open') openCo.add(d.companyId);
    }
    for (const co of s.companies || []) {
      if (!co.lifecycleStage) co.lifecycleStage = wonCo.has(co.id) ? 'customer' : openCo.has(co.id) ? 'opportunity' : 'sql';
    }
    const coStage = new Map((s.companies || []).map(c => [c.id, c.lifecycleStage]));
    for (const c of s.contacts || []) {
      if (!c.lifecycleStage) c.lifecycleStage = c.companyId ? (coStage.get(c.companyId) || 'sql') : 'lead';
    }
  } catch {}
  return s;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetStore() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getState() { return state; }

export function useStore(selector = (s) => s) {
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
   READ API   (each notes the live query)
   ============================================================ */
export const getUsers = () => state.users;                                  // SUPABASE: from('rally_users').select()
export const getUser = (id) => state.users.find(u => u.id === id);
export const getCurrentUser = () => getUser(state.currentUserId);
export const userName = (id) => getUser(id)?.name || 'Unassigned';

export const getCompanies = () => state.companies;                          // SUPABASE: from('rally_companies').select()
export const getCompany = (id) => state.companies.find(c => c.id === id);

export const getContacts = () => state.contacts;                            // SUPABASE: from('rally_contacts').select()
export const getContact = (id) => state.contacts.find(c => c.id === id);
export const contactName = (c) => c ? `${c.firstName} ${c.lastName}` : 'Unknown';
export const getContactsForCompany = (coId) => state.contacts.filter(c => c.companyId === coId);

export const getDeals = () => state.deals;                                  // SUPABASE: from('rally_deals').select()
export const getDeal = (id) => state.deals.find(d => d.id === id);
export const getDealsForCompany = (coId) => state.deals.filter(d => d.companyId === coId);
export const getDealsForContact = (cId) => state.deals.filter(d => (d.contactIds || []).includes(cId));

export const getActivities = () => state.activities;                        // SUPABASE: from('rally_activities').select()
export const getActivity = (id) => state.activities.find(a => a.id === id);
export const getActivitiesForRecord = (type, id) =>
  state.activities.filter(a => a.relatedType === type && a.relatedId === id)
    .sort((a, b) => new Date(b.dueAt || b.createdAt) - new Date(a.dueAt || a.createdAt));

export const getStages = () => STAGES;

/* ---------- derived selectors (all pure over state) ---------- */
export function dealsByStage() {
  const map = {};
  for (const s of STAGES) map[s.id] = [];
  for (const d of state.deals) (map[d.stage] = map[d.stage] || []).push(d);
  return map;
}
export const openDeals = () => state.deals.filter(d => d.status === 'open');
export const pipelineValue = () => openDeals().reduce((s, d) => s + d.value, 0);
export const weightedForecast = () => openDeals().reduce((s, d) => s + d.value * (d.probability / 100), 0);
export function winRate() {
  const won = state.deals.filter(d => d.status === 'won').length;
  const closed = state.deals.filter(d => d.status === 'won' || d.status === 'lost').length;
  return closed ? Math.round((won / closed) * 100) : 0;
}
export function wonThisMonth() {
  const now = new Date();
  return state.deals.filter(d => {
    if (d.status !== 'won') return false;
    const dt = new Date(d.closeDate);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
}
export function dealsClosingThisMonth() {
  const now = new Date();
  return openDeals().filter(d => {
    const dt = new Date(d.closeDate);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
}
export function slippingDeals() {
  // open deals whose close date is already in the past
  const now = Date.now();
  return openDeals().filter(d => new Date(d.closeDate).getTime() < now)
    .sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
}
export function activityLeaderboard() {
  const map = {};
  for (const u of state.users.filter(u => u.role === 'rep')) map[u.id] = { user: u, done: 0, open: 0 };
  for (const a of state.activities) {
    if (!map[a.ownerId]) continue;
    if (a.done) map[a.ownerId].done++; else map[a.ownerId].open++;
  }
  return Object.values(map).sort((a, b) => b.done - a.done);
}
export function myDayQueue(userId = state.currentUserId) {
  return state.activities
    .filter(a => a.ownerId === userId && !a.done && a.type !== 'note')
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}
export function repLeaderboard() {
  const map = {};
  for (const u of state.users.filter(u => u.role === 'rep')) map[u.id] = { user: u, won: 0, pipeline: 0, count: 0 };
  for (const d of state.deals) {
    if (!map[d.ownerId]) continue;
    if (d.status === 'won') map[d.ownerId].won += d.value;
    if (d.status === 'open') { map[d.ownerId].pipeline += d.value; map[d.ownerId].count++; }
  }
  return Object.values(map).sort((a, b) => b.won - a.won);
}

/* ============================================================
   WRITE API   (validated writers, return { error, message } or record)
   ============================================================ */
function touchContact(id) {
  const c = getContact(id);
  if (c) c.lastActivityAt = new Date().toISOString();
}

/* Shared patch applier for update writers. Splits a `fieldValues` map out of
   the patch and merges it into record.fieldValues (initialized lazily) so
   registry-driven fields (src/lib/fields.js) persist alongside store columns.
   Every changed field is written to the org-wide audit log (src/lib/audit.js). */
function applyPatch(objectType, record, patch = {}) {
  const { fieldValues, ...rest } = patch;
  const who = getCurrentUser()?.name || 'You';
  for (const [k, v] of Object.entries(rest)) {
    if (record[k] !== v) logChange(objectType, record.id, k, record[k], v, who);
  }
  Object.assign(record, rest);
  if (fieldValues && typeof fieldValues === 'object') {
    if (!record.fieldValues) record.fieldValues = {};
    for (const [k, v] of Object.entries(fieldValues)) {
      if (record.fieldValues[k] !== v) logChange(objectType, record.id, k, record.fieldValues[k], v, who);
      record.fieldValues[k] = v;
    }
  }
}

// SUPABASE: from('rally_companies').insert(row).select().single()
export function createCompany({ name, domain, industry, size, location, ownerId, health = 'green', lifecycleStage = 'lead' }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Company name is required.' };
  const co = {
    id: newId('co'), name: name.trim(),
    domain: domain || name.toLowerCase().replace(/[^a-z]/g, '') + '.com',
    industry: industry || 'SaaS', size: size || '51-200', location: location || '',
    ownerId: ownerId || state.currentUserId, health, lifecycleStage,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, companies: [co, ...state.companies] });
  return { company: co };
}
export function updateCompany(id, patch) {
  const co = getCompany(id);
  if (!co) return { error: 'missing', message: 'Company not found.' };
  applyPatch('company', co, patch);
  commit({ ...state });
  return { company: co };
}

// SUPABASE: from('rally_contacts').insert(row).select().single()
export function createContact({ firstName, lastName, email, phone, title, companyId, ownerId, tags = [], lifecycleStage }) {
  if (!firstName || !firstName.trim()) return { error: 'firstName', message: 'First name is required.' };
  const co = companyId ? getCompany(companyId) : null;
  const c = {
    id: newId('c'),
    firstName: firstName.trim(), lastName: (lastName || '').trim(),
    email: email || (co ? `${firstName.toLowerCase()}.${(lastName || 'contact').toLowerCase()}@${co.domain}` : ''),
    phone: phone || '', title: title || '',
    companyId: companyId || null,
    ownerId: ownerId || state.currentUserId,
    lifecycleStage: lifecycleStage || (co ? co.lifecycleStage : 'lead') || 'lead',
    tags, lastActivityAt: new Date().toISOString(), createdAt: new Date().toISOString(),
  };
  commit({ ...state, contacts: [c, ...state.contacts] });
  return { contact: c };
}
export function updateContact(id, patch) {
  const c = getContact(id);
  if (!c) return { error: 'missing', message: 'Contact not found.' };
  applyPatch('contact', c, patch);
  commit({ ...state });
  return { contact: c };
}

// SUPABASE: from('rally_deals').insert(row).select().single()
export function createDeal({ name, companyId, contactIds = [], value, stage = 'lead', closeDate, ownerId }) {
  if (!name || !name.trim()) return { error: 'name', message: 'Deal name is required.' };
  const val = Number(value);
  if (!Number.isFinite(val) || val < 0) return { error: 'value', message: 'Enter a valid deal value.' };
  const st = stageById(stage) || stageById('lead');
  const co = companyId ? getCompany(companyId) : null;
  const d = {
    id: newId('d'), name: name.trim(),
    companyId: companyId || null, contactIds,
    value: val, stage: st.id, probability: st.probability,
    closeDate: closeDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    ownerId: ownerId || (co ? co.ownerId : state.currentUserId),
    status: st.type === 'open' ? 'open' : st.type,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, deals: [d, ...state.deals] });
  return { deal: d };
}
export function updateDeal(id, patch) {
  const d = getDeal(id);
  if (!d) return { error: 'missing', message: 'Deal not found.' };
  if (patch.value != null) {
    const v = Number(patch.value);
    if (!Number.isFinite(v) || v < 0) return { error: 'value', message: 'Enter a valid deal value.' };
    patch = { ...patch, value: v };
  }
  applyPatch('deal', d, patch);
  commit({ ...state });
  return { deal: d };
}

// SUPABASE: update stage + probability + status; insert a system activity row.
export function moveDealStage(id, stageId, { silent = false } = {}) {
  const d = getDeal(id);
  if (!d) return { error: 'missing', message: 'Deal not found.' };
  const st = stageById(stageId);
  if (!st) return { error: 'stage', message: 'Unknown stage.' };
  const from = stageById(d.stage);
  d.stage = st.id;
  d.probability = st.probability;
  d.status = st.type === 'open' ? 'open' : st.type;
  if (st.type !== 'open') d.closeDate = new Date().toISOString();
  const acts = state.activities;
  if (!silent) {
    acts.unshift({
      id: newId('a'), type: 'note',
      subject: `Stage moved: ${from?.name || '?'} -> ${st.name}`,
      body: '', dueAt: new Date().toISOString(), done: true,
      relatedType: 'deal', relatedId: d.id, companyId: d.companyId,
      ownerId: d.ownerId, createdAt: new Date().toISOString(), system: true,
    });
  }
  commit({ ...state, activities: acts });
  return { deal: d };
}

// SUPABASE: from('rally_activities').insert(row).select().single()
export function createActivity({ type = 'task', subject, body = '', dueAt, done = false, relatedType, relatedId, companyId, ownerId, ...rest }) {
  if (!subject || !subject.trim()) return { error: 'subject', message: 'A subject is required.' };
  const a = {
    ...rest,
    id: newId('a'), type,
    subject: subject.trim(), body,
    dueAt: dueAt || new Date().toISOString(), done,
    relatedType: relatedType || null, relatedId: relatedId || null,
    companyId: companyId || (relatedType === 'contact' ? getContact(relatedId)?.companyId : relatedType === 'deal' ? getDeal(relatedId)?.companyId : null) || null,
    ownerId: ownerId || state.currentUserId,
    createdAt: new Date().toISOString(),
  };
  if (a.relatedType === 'contact' && a.relatedId) touchContact(a.relatedId);
  commit({ ...state, activities: [a, ...state.activities] });
  return { activity: a };
}
export function toggleActivity(id) {
  const a = getActivity(id);
  if (!a) return { error: 'missing', message: 'Activity not found.' };
  a.done = !a.done;
  commit({ ...state });
  return { activity: a };
}
export function updateActivity(id, patch) {
  const a = getActivity(id);
  if (!a) return { error: 'missing', message: 'Activity not found.' };
  Object.assign(a, patch);
  commit({ ...state });
  return { activity: a };
}
