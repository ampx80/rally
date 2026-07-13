// ============================================================
// RALLY MOBILE - LOCAL-FIRST DATA STORE
// A deterministic seed builds a believable book of business so
// every screen renders rich content with NO network and NO auth.
// Domain shapes mirror the web repo (src/lib/store.js): companies,
// contacts, deals, activities, plus notifications + inbox threads.
// State persists to AsyncStorage; hooks re-render on mutation.
// SUPABASE: each collection maps to a rally_* table - swap the
// seed reader for a fetch layer later without touching screens.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LS_KEY = 'rally_mobile_state_v1'; // bump to force a clean reseed

/* ---------- deterministic PRNG (mulberry32) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG (mirrors web)
   ============================================================ */
export const STAGES = [
  { id: 'lead', name: 'Lead', order: 1, probability: 10, type: 'open' },
  { id: 'qualified', name: 'Qualified', order: 2, probability: 25, type: 'open' },
  { id: 'discovery', name: 'Discovery', order: 3, probability: 45, type: 'open' },
  { id: 'proposal', name: 'Proposal', order: 4, probability: 65, type: 'open' },
  { id: 'negotiation', name: 'Negotiation', order: 5, probability: 85, type: 'open' },
  { id: 'won', name: 'Closed Won', order: 6, probability: 100, type: 'won' },
  { id: 'lost', name: 'Closed Lost', order: 7, probability: 0, type: 'lost' },
];
export const OPEN_STAGES = STAGES.filter((s) => s.type === 'open');
export const stageById = (id) => STAGES.find((s) => s.id === id);

export const ACTIVITY_TYPES = ['task', 'call', 'email', 'meeting', 'note'];
export const ACTIVITY_META = {
  task: { label: 'Task', icon: 'checkbox-outline', tone: 'accent' },
  call: { label: 'Call', icon: 'call-outline', tone: 'good' },
  email: { label: 'Email', icon: 'mail-outline', tone: 'info' },
  meeting: { label: 'Meeting', icon: 'calendar-outline', tone: 'warn' },
  note: { label: 'Note', icon: 'document-text-outline', tone: 'neutral' },
};

const INDUSTRIES = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy', 'Media', 'Real Estate', 'Construction'];
const SIZES = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const TAGS = ['champion', 'decision maker', 'technical', 'economic buyer', 'blocker', 'renewal', 'expansion', 'inbound', 'referral'];
const FIRST = ['James', 'Maria', 'David', 'Sarah', 'Michael', 'Jennifer', 'Priya', 'Wei', 'Diego', 'Aisha', 'Noah', 'Olivia', 'Marcus', 'Sofia', 'Raj', 'Chloe', 'Kenji', 'Amara', 'Liam', 'Emma'];
const LAST = ['Chen', 'Patel', 'Rodriguez', 'Kim', 'Nguyen', 'Johnson', 'Garcia', 'Okafor', 'Rossi', 'Tanaka', 'Silva', 'Reyes', 'Novak', 'Foster', 'Bennett', 'Castillo', 'Larsen', 'Vance', 'Ortiz', 'Frost'];
const CO_A = ['Vertex', 'Northwind', 'Meridian', 'Apex', 'Cobalt', 'Summit', 'Ironclad', 'Beacon', 'Cascade', 'Lumen', 'Vantage', 'Keystone', 'Pinnacle', 'Sterling', 'Redwood', 'Fathom', 'Harbor', 'Kestrel', 'Monarch', 'Zenith'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Capital', 'Systems', 'Labs', 'Freight', 'Energy', 'Partners', 'Dynamics', 'Analytics', 'Networks', 'Bioscience', 'Solutions'];
const TITLES = ['VP of Sales', 'Chief Revenue Officer', 'Director of Operations', 'Head of Procurement', 'VP Engineering', 'CFO', 'COO', 'Director of IT', 'VP Marketing', 'Operations Manager', 'CTO', 'VP Product'];
const DEAL_KINDS = ['Platform rollout', 'Annual license', 'Enterprise expansion', 'Pilot to production', 'Renewal + upsell', 'New logo', 'Multi-year contract', 'Seat expansion'];
const CITIES = ['San Francisco, CA', 'Austin, TX', 'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Seattle, WA', 'Atlanta, GA', 'New York, NY'];

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260708);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const sampleN = (a, n) => {
    const copy = [...a];
    const out = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    return out;
  };
  const now = Date.now();
  const DAY = 86400000;
  const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

  const users = [
    { id: 'u_1', name: 'Jordan Avery', email: 'jordan@rally.app', role: 'rep', title: 'Senior Account Executive', quota: 900000 },
    { id: 'u_2', name: 'Simone Diaz', email: 'simone@rally.app', role: 'rep', title: 'Account Executive', quota: 750000 },
    { id: 'u_3', name: 'Theo Bennett', email: 'theo@rally.app', role: 'rep', title: 'Account Executive', quota: 750000 },
    { id: 'u_4', name: 'Nina Kapoor', email: 'nina@rally.app', role: 'rep', title: 'Enterprise AE', quota: 1200000 },
    { id: 'u_5', name: 'Marcus Hale', email: 'marcus@rally.app', role: 'rep', title: 'Account Executive', quota: 700000 },
    { id: 'u_6', name: 'Elena Ross', email: 'elena@rally.app', role: 'manager', title: 'VP of Revenue', quota: 0 },
  ];
  const repIds = users.filter((u) => u.role === 'rep').map((u) => u.id);
  const currentUserId = 'u_1';
  const userName = (id) => users.find((u) => u.id === id)?.name || 'Someone';

  /* --- companies --- */
  const companies = [];
  const usedNames = new Set();
  for (let i = 0; i < 30; i++) {
    let name;
    let guard = 0;
    do {
      name = `${pick(CO_A)} ${pick(CO_B)}`;
      guard++;
    } while (usedNames.has(name) && guard < 20);
    usedNames.add(name);
    companies.push({
      id: `co_${i + 1}`,
      name,
      domain: name.toLowerCase().replace(/[^a-z]/g, '') + '.com',
      industry: pick(INDUSTRIES),
      size: pick(SIZES),
      location: pick(CITIES),
      ownerId: pick(repIds),
      health: pick(['green', 'green', 'green', 'yellow', 'yellow', 'red']),
      createdAt: daysFromNow(-range(30, 400)),
    });
  }
  const flagship = {
    id: 'co_flagship',
    name: 'Vertex Robotics',
    domain: 'vertexrobotics.com',
    industry: 'Manufacturing',
    size: '1001-5000',
    location: 'Austin, TX',
    ownerId: currentUserId,
    health: 'green',
    createdAt: daysFromNow(-120),
    flagship: true,
  };
  companies.unshift(flagship);

  /* --- contacts --- */
  const contacts = [];
  let ci = 0;
  for (const co of companies) {
    const n = co.flagship ? 4 : range(1, 3);
    for (let k = 0; k < n; k++) {
      ci++;
      const first = pick(FIRST);
      const last = pick(LAST);
      contacts.push({
        id: `c_${ci}`,
        firstName: first,
        lastName: last,
        name: `${first} ${last}`,
        title: pick(TITLES),
        companyId: co.id,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${co.domain}`,
        phone: `(${range(200, 989)}) ${range(200, 989)}-${range(1000, 9999)}`,
        tags: sampleN(TAGS, range(1, 3)),
        ownerId: co.ownerId,
        createdAt: daysFromNow(-range(10, 300)),
      });
    }
  }
  const contactsByCo = (coId) => contacts.filter((c) => c.companyId === coId);
  const contactName = (id) => contacts.find((c) => c.id === id)?.name || 'Unknown';

  /* --- deals --- */
  const deals = [];
  let di = 0;
  for (const co of companies) {
    if (!co.flagship && chance(0.35)) continue;
    const count = co.flagship ? 1 : range(1, 2);
    for (let k = 0; k < count; k++) {
      di++;
      const r = rnd();
      let stageId;
      if (r < 0.16) stageId = 'lead';
      else if (r < 0.34) stageId = 'qualified';
      else if (r < 0.52) stageId = 'discovery';
      else if (r < 0.66) stageId = 'proposal';
      else if (r < 0.76) stageId = 'negotiation';
      else if (r < 0.9) stageId = 'won';
      else stageId = 'lost';
      const st = stageById(stageId);
      const value = range(15, 480) * 1000;
      const coContacts = contactsByCo(co.id);
      const closed = st.type !== 'open';
      deals.push({
        id: `d_${di}`,
        name: `${co.name} - ${pick(DEAL_KINDS)}`,
        companyId: co.id,
        contactIds: sampleN(coContacts, Math.min(coContacts.length, range(1, 3))).map((c) => c.id),
        value,
        stage: stageId,
        probability: st.probability,
        closeDate: closed ? daysFromNow(-range(2, 120)) : daysFromNow(range(3, 110)),
        ownerId: co.ownerId,
        status: st.type === 'open' ? 'open' : st.type,
        createdAt: daysFromNow(-range(5, 180)),
      });
    }
  }
  deals.unshift({
    id: 'd_flagship',
    name: 'Vertex Robotics - Enterprise platform rollout',
    companyId: 'co_flagship',
    contactIds: contactsByCo('co_flagship').slice(0, 3).map((c) => c.id),
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
    call: ['Discovery call', 'Follow-up call', 'Check-in call', 'Pricing discussion'],
    email: ['Send proposal', 'Follow up on demo', 'Share security docs', 'Recap next steps'],
    meeting: ['Product demo', 'Executive review', 'Technical deep-dive', 'Kickoff'],
    task: ['Update the forecast', 'Loop in solutions eng', 'Prep the deck', 'Confirm budget'],
    note: ['Champion is bought in', 'Waiting on legal', 'Competitor mentioned'],
  };
  for (const d of deals.filter((x) => x.status === 'open').slice(0, 18)) {
    const n = range(1, 3);
    for (let k = 0; k < n; k++) {
      ai++;
      const type = pick(ACTIVITY_TYPES);
      const overdue = chance(0.25);
      activities.push({
        id: `a_${ai}`,
        type,
        subject: pick(SUBJECTS[type]),
        body: '',
        done: chance(0.3),
        ownerId: d.ownerId,
        relatedType: 'deal',
        relatedId: d.id,
        companyId: d.companyId,
        dueAt: daysFromNow(overdue ? -range(1, 5) : range(0, 7)),
        createdAt: daysFromNow(-range(1, 20)),
      });
    }
  }
  // Marquee "my day" tasks anchored to the flagship.
  const fc = contactsByCo('co_flagship');
  const marquee = [
    { type: 'call', subject: 'Negotiation call with Vertex Robotics', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(0) },
    { type: 'task', subject: 'Send redlined MSA to Vertex legal', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(1) },
    { type: 'email', subject: 'Follow up with champion on timeline', relatedType: 'contact', relatedId: fc[0]?.id, companyId: 'co_flagship', dueAt: daysFromNow(0) },
    { type: 'meeting', subject: 'Executive review - final approval', relatedType: 'deal', relatedId: 'd_flagship', companyId: 'co_flagship', dueAt: daysFromNow(2) },
  ];
  for (const m of marquee) {
    ai++;
    activities.push({ id: `a_${ai}`, body: '', done: false, ownerId: currentUserId, createdAt: daysFromNow(-2), ...m });
  }

  /* --- notifications --- */
  const notifications = [];
  const won = deals.filter((d) => d.status === 'won').slice(0, 3);
  won.forEach((d, i) => {
    notifications.push({
      id: `n_won_${i}`,
      type: 'deal_won',
      title: `${d.ownerId === currentUserId ? 'You' : userName(d.ownerId)} closed ${d.name}`,
      body: 'Nice work. Revenue booked to the quarter.',
      at: daysFromNow(-range(0, 3)),
      read: false,
      target: { to: `/deal/${d.id}`, label: 'View deal' },
    });
  });
  activities
    .filter((a) => !a.done)
    .slice(0, 4)
    .forEach((a, i) => {
      notifications.push({
        id: `n_task_${i}`,
        type: 'task_due',
        title: `Due soon: ${a.subject}`,
        body: 'On your plate today.',
        at: daysFromNow(-range(0, 1)),
        read: i > 1,
        target: a.relatedType === 'deal' ? { to: `/deal/${a.relatedId}`, label: 'Open deal' } : null,
      });
    });
  notifications.push({
    id: 'n_mention_1',
    type: 'mention',
    title: 'Simone Diaz mentioned you on Vertex Robotics',
    body: 'Pricing looks tight - want your read here. @Jordan',
    at: daysFromNow(-0.2),
    read: false,
    target: { to: '/deal/d_flagship', label: 'View deal' },
  });

  /* --- inbox conversations --- */
  const conversations = [
    {
      id: 'conv_1',
      channel: 'email',
      subject: 'Re: Enterprise platform rollout - security review',
      companyId: 'co_flagship',
      contactId: fc[0]?.id,
      unread: true,
      updatedAt: daysFromNow(-0.1),
      messages: [
        { from: 'them', body: 'Hi - our security team finished reviewing the platform. Two questions before we can sign: do you support SCIM provisioning, and where is data residency for EU customers?' },
        { from: 'me', body: 'Great questions. Yes, SCIM 2.0 is supported on Enterprise, and we run an EU data region in Frankfurt with full residency. I can send the SOC 2 report today.' },
        { from: 'them', body: 'Perfect. Please send both over. If those check out we are ready to move to signature this week.' },
      ],
    },
    {
      id: 'conv_2',
      channel: 'chat',
      subject: 'Quick question on seat pricing',
      companyId: companies[1]?.id,
      contactId: contactsByCo(companies[1]?.id)[0]?.id,
      unread: false,
      updatedAt: daysFromNow(-0.5),
      messages: [
        { from: 'them', body: 'Hey! Quick one - if we add 40 more seats mid-contract, is it prorated or does it reset the term?' },
        { from: 'me', body: 'Prorated to your existing renewal date, no term reset. I can generate an order form whenever you are ready.' },
        { from: 'them', body: 'Amazing, that is exactly what I hoped. Let me confirm headcount with finance and circle back.' },
      ],
    },
    {
      id: 'conv_3',
      channel: 'email',
      subject: 'Following up on our demo',
      companyId: companies[2]?.id,
      contactId: contactsByCo(companies[2]?.id)[0]?.id,
      unread: true,
      updatedAt: daysFromNow(-1.2),
      messages: [
        { from: 'me', body: 'Thanks again for your time on the demo. You mentioned reporting was the top priority - I put together a short Loom on the custom dashboard builder. Want me to send it?' },
        { from: 'them', body: 'Yes please. Reporting is what will get this approved internally, so anything that shows that off is gold.' },
      ],
    },
    {
      id: 'conv_4',
      channel: 'email',
      subject: 'Contract redlines attached',
      companyId: companies[3]?.id,
      contactId: contactsByCo(companies[3]?.id)[0]?.id,
      unread: false,
      updatedAt: daysFromNow(-2.4),
      messages: [
        { from: 'them', body: 'Legal returned the MSA with a few redlines - mostly the liability cap and termination-for-convenience clause. Attaching the marked-up version.' },
        { from: 'me', body: 'Thanks. Our standard liability cap is 12 months of fees; I will confirm what we can flex and route it back to your team by end of day.' },
      ],
    },
  ];

  return {
    version: 1,
    currentUserId,
    users,
    companies,
    contacts,
    deals,
    activities,
    notifications,
    conversations,
  };
}

/* ============================================================
   STATE + PERSISTENCE (in-memory + AsyncStorage + subscribers)
   ============================================================ */
let state = null;
let hydrated = false;
const subs = new Set();

function emit() {
  subs.forEach((fn) => {
    try {
      fn(state);
    } catch {
      // ignore subscriber errors
    }
  });
}

async function persist() {
  try {
    await AsyncStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

// Ensure state exists synchronously (fresh seed) and hydrate from disk once.
function ensureState() {
  if (!state) state = buildSeed();
  if (!hydrated) {
    hydrated = true;
    AsyncStorage.getItem(LS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === 1) {
            state = parsed;
            emit();
          }
        }
      })
      .catch(() => {
        // keep the fresh seed
      });
  }
  return state;
}

function mutate(fn) {
  ensureState();
  fn(state);
  persist();
  emit();
}

/* ============================================================
   READ HELPERS (pure, safe on empty state)
   ============================================================ */
export function getCurrentUser() {
  const s = ensureState();
  return s.users.find((u) => u.id === s.currentUserId) || s.users[0];
}
export function getUser(id) {
  return ensureState().users.find((u) => u.id === id) || null;
}
export function getCompany(id) {
  return ensureState().companies.find((c) => c.id === id) || null;
}
export function getContact(id) {
  return ensureState().contacts.find((c) => c.id === id) || null;
}
export function getDeal(id) {
  return ensureState().deals.find((d) => d.id === id) || null;
}
export function contactName(id) {
  return getContact(id)?.name || 'Unknown';
}
export function companyName(id) {
  return getCompany(id)?.name || 'Unknown';
}

// Derived pipeline metrics for Home.
export function pipelineSummary() {
  const s = ensureState();
  const open = s.deals.filter((d) => d.status === 'open');
  const openValue = open.reduce((n, d) => n + d.value, 0);
  const weighted = open.reduce((n, d) => n + (d.value * d.probability) / 100, 0);
  const won = s.deals.filter((d) => d.status === 'won');
  const wonValue = won.reduce((n, d) => n + d.value, 0);
  const me = getCurrentUser();
  const quota = me?.quota || 0;
  return {
    openCount: open.length,
    openValue,
    weighted,
    wonCount: won.length,
    wonValue,
    quota,
    quotaPct: quota ? Math.min(100, Math.round((wonValue / quota) * 100)) : 0,
  };
}

/* ============================================================
   MUTATIONS
   ============================================================ */
export function toggleActivityDone(id) {
  mutate((s) => {
    const a = s.activities.find((x) => x.id === id);
    if (a) a.done = !a.done;
  });
}
// Additive: create a new activity/task and prepend it. Fills sensible
// defaults so a quick-add composer can pass just { subject, type, dueAt }.
// Persists + re-renders subscribers like every other mutation.
export function addActivity(input = {}) {
  let created = null;
  mutate((s) => {
    const type = ACTIVITY_TYPES.includes(input.type) ? input.type : 'task';
    created = {
      id: input.id || `a_user_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      type,
      subject: String(input.subject || '').trim() || 'Untitled task',
      body: input.body || '',
      done: false,
      ownerId: input.ownerId || s.currentUserId,
      relatedType: input.relatedType || null,
      relatedId: input.relatedId || null,
      companyId: input.companyId || null,
      dueAt: input.dueAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    s.activities.unshift(created);
  });
  return created;
}
export function moveDealStage(id, stage) {
  mutate((s) => {
    const d = s.deals.find((x) => x.id === id);
    const st = stageById(stage);
    if (d && st) {
      d.stage = stage;
      d.probability = st.probability;
      d.status = st.type === 'open' ? 'open' : st.type;
    }
  });
}
export function markNotificationRead(id) {
  mutate((s) => {
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  });
}
export function markAllNotificationsRead() {
  mutate((s) => s.notifications.forEach((n) => (n.read = true)));
}
export function resetStore() {
  state = buildSeed();
  persist();
  emit();
}

/* ============================================================
   HOOKS (screens use these)
   ============================================================ */
function useSlice(selector) {
  const [value, setValue] = useState(() => selector(ensureState()));
  useEffect(() => {
    const fn = (s) => setValue(selector(s));
    subs.add(fn);
    // resync in case disk hydration finished between render and subscribe
    fn(ensureState());
    return () => subs.delete(fn);
    // selector is stable per-hook by convention (defined inline once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export function useDeals(filter) {
  return useSlice((s) => {
    let list = s.deals;
    if (filter?.status) list = list.filter((d) => d.status === filter.status);
    if (filter?.stage) list = list.filter((d) => d.stage === filter.stage);
    if (filter?.ownerId) list = list.filter((d) => d.ownerId === filter.ownerId);
    return [...list].sort((a, b) => b.value - a.value);
  });
}
export function useContacts() {
  return useSlice((s) => [...s.contacts].sort((a, b) => a.name.localeCompare(b.name)));
}
export function useCompanies() {
  return useSlice((s) => [...s.companies]);
}
export function useActivities(filter) {
  return useSlice((s) => {
    let list = s.activities;
    if (filter?.relatedId) list = list.filter((a) => a.relatedId === filter.relatedId);
    if (filter?.open) list = list.filter((a) => !a.done);
    return [...list].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  });
}
export function useNotifications() {
  return useSlice((s) => [...s.notifications].sort((a, b) => new Date(b.at) - new Date(a.at)));
}
export function useUnreadCount() {
  return useSlice((s) => s.notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0));
}
export function useConversations() {
  return useSlice((s) => [...s.conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
}
export function usePipeline() {
  return useSlice(() => pipelineSummary());
}
export function useCurrentUser() {
  return useSlice((s) => s.users.find((u) => u.id === s.currentUserId) || s.users[0]);
}
