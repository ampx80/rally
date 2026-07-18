// ============================================================
// ARDOVO AUTOPILOT  (local-first, deterministic worker sim)
//
// Autopilot is Ardovo's autonomous SDR/AE. It works a lead list end
// to end: researches each account (enrichment), drafts a personalized
// multi-channel opener (email + SMS + LinkedIn), sequences follow-ups,
// and books the meeting. Every proposed send lands in a governed
// APPROVAL QUEUE gated by a TRUST DIAL - a single slider from
// "draft only, I approve everything" up to "auto-send anything at or
// below risk threshold X". Humans stay in control; the agent still
// moves the pipeline while you sleep.
//
// This module mirrors src/lib/store.js exactly: a fixed-seed mulberry32
// PRNG builds a believable workqueue on first run, mutations persist to
// localStorage, and a pub/sub layer keeps the cockpit live. Zero backend
// required. A single env-gated hook (draftWithApi) reaches for
// /api/outreach-draft when it exists and degrades silently otherwise.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_autopilot_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (same shape as store.js) ---------- */
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
export const CHANNELS = {
  email: { label: 'Email', icon: 'mail', tint: 'var(--accent)' },
  sms: { label: 'SMS', icon: 'phone', tint: 'var(--accent-teal)' },
  linkedin: { label: 'LinkedIn', icon: 'users', tint: 'var(--info)' },
};
export const CHANNEL_KEYS = ['email', 'sms', 'linkedin'];

export const STEP_META = {
  opener: { label: 'Opener', order: 1 },
  followup: { label: 'Follow-up', order: 2 },
  breakup: { label: 'Break-up', order: 3 },
  booking: { label: 'Booking', order: 4 },
};

// Lead lifecycle inside the worker.
export const LEAD_STATUS = {
  researching: { label: 'Researching', tone: 'default' },
  queued: { label: 'Queued', tone: 'info' },
  awaiting: { label: 'Awaiting approval', tone: 'warn' },
  sequenced: { label: 'In sequence', tone: 'accent' },
  replied: { label: 'Replied', tone: 'ok' },
  booked: { label: 'Meeting booked', tone: 'ok' },
  paused: { label: 'Paused', tone: 'default' },
};

export function riskBand(risk) {
  if (risk <= 24) return { key: 'low', label: 'Low risk', tone: 'ok', color: 'var(--ok)' };
  if (risk <= 54) return { key: 'med', label: 'Medium risk', tone: 'warn', color: 'var(--warn)' };
  return { key: 'high', label: 'High risk', tone: 'risk', color: 'var(--risk)' };
}

// The trust dial maps a single 0-100 number to a posture.
export function trustPosture(threshold) {
  if (threshold <= 0) return { key: 'draft', label: 'Draft only', blurb: 'Autopilot drafts everything and sends nothing. You approve every action.' };
  if (threshold >= 100) return { key: 'full', label: 'Full autopilot', blurb: 'Autopilot sends every action it is confident in. You review the log after.' };
  return { key: 'governed', label: 'Governed autopilot', blurb: `Autopilot auto-sends any action at or below ${threshold} risk. Anything riskier waits for your approval.` };
}

/* ============================================================
   SEED POOLS
   ============================================================ */
const FIRST = ['Priya', 'Marcus', 'Elena', 'David', 'Sofia', 'Wei', 'Amara', 'Noah', 'Fatima', 'Diego', 'Chloe', 'Raj', 'Olivia', 'Kenji', 'Nina', 'Theo', 'Maya', 'Andre'];
const LAST = ['Chen', 'Okafor', 'Rossi', 'Kim', 'Silva', 'Patel', 'Bennett', 'Larsen', 'Haddad', 'Reyes', 'Foster', 'Vance', 'Mercer', 'Tanaka', 'Frost', 'Novak', 'Ellison', 'Brooks'];
const CO_A = ['Northwind', 'Meridian', 'Cobalt', 'Ironclad', 'Cascade', 'Lumen', 'Vantage', 'Keystone', 'Halcyon', 'Redwood', 'Fathom', 'Harbor', 'Kestrel', 'Solstice', 'Tidewater', 'Windward', 'Aster', 'Crestwood'];
const CO_B = ['Robotics', 'Logistics', 'Health', 'Systems', 'Labs', 'Freight', 'Energy', 'Analytics', 'Networks', 'Bioscience', 'Foods', 'Dynamics'];
const TITLES = ['VP of Sales', 'Chief Revenue Officer', 'Head of Procurement', 'Director of Operations', 'VP Engineering', 'COO', 'Director of IT', 'VP Marketing', 'Head of Finance', 'GM, Field Ops'];
const INDUSTRIES = ['SaaS', 'Manufacturing', 'Healthcare', 'Logistics', 'Financial Services', 'Energy', 'Retail', 'Biotech'];
const SIZES = ['51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const CITIES = ['San Francisco, CA', 'Austin, TX', 'Chicago, IL', 'Boston, MA', 'Denver, CO', 'Seattle, WA', 'Atlanta, GA', 'Columbus, OH'];

// Enrichment signal library. The worker "researches" and surfaces these.
const SIGNALS = [
  'Posted 6 open roles on the revenue team this month',
  'CEO mentioned "manual pipeline hygiene" on the last earnings call',
  'Migrated off a legacy CRM in Q2 (job posts reference the switch)',
  'Series C led by a growth fund closed 9 weeks ago',
  'Headcount up 22% year over year',
  'Two competitors already run Ardovo in the same vertical',
  'Opened a new regional office in the target territory',
  'Website now runs a demo-request form with no follow-up automation',
  'VP of Sales started 4 months ago and is rebuilding the stack',
  'Downloaded the buyer guide and revisited pricing twice',
  'Uses a scheduling tool but no autonomous outreach layer',
  'Board deck (public) lists "pipeline coverage" as the top risk',
];
const INTENTS = ['High', 'High', 'Medium', 'Medium', 'Rising', 'Warm'];
const TECH = ['Salesforce', 'HubSpot', 'Outreach', 'Salesloft', 'Marketo', 'Segment', 'Snowflake', 'Gong', 'Zoom', 'Slack'];

/* ---------- personalized draft generators (deterministic) ---------- */
function firstSignalShort(sig) {
  // Turn a research signal into a short clause for message copy.
  const map = {
    'Posted 6 open roles on the revenue team this month': 'the revenue team you are scaling',
    'CEO mentioned "manual pipeline hygiene" on the last earnings call': 'the manual pipeline work your CEO flagged',
    'Migrated off a legacy CRM in Q2 (job posts reference the switch)': 'the CRM change you made this year',
    'Series C led by a growth fund closed 9 weeks ago': 'the growth push after your Series C',
    'Headcount up 22% year over year': 'the pace you are hiring at',
    'Two competitors already run Ardovo in the same vertical': 'what teams like yours are doing in the space',
    'Opened a new regional office in the target territory': 'the new region you just opened',
    'Website now runs a demo-request form with no follow-up automation': 'the inbound demo requests coming in',
    'VP of Sales started 4 months ago and is rebuilding the stack': 'the stack rebuild underway',
    'Downloaded the buyer guide and revisited pricing twice': 'the evaluation you have been running',
    'Uses a scheduling tool but no autonomous outreach layer': 'the outbound gap in your current stack',
    'Board deck (public) lists "pipeline coverage" as the top risk': 'the pipeline coverage gap on your board deck',
  };
  return map[sig] || 'what your team is building';
}

function draftFor(channel, lead, step) {
  const clause = firstSignalShort(lead.topSignal);
  const co = lead.company;
  const fn = lead.firstName;
  if (channel === 'email') {
    if (step === 'opener') return {
      subject: `${co} + Ardovo: ${clause}`,
      body: `Hi ${fn},\n\nI was reading up on ${co} and noticed ${clause}. Teams hitting that exact moment usually feel it as reps drowning in follow-up instead of selling.\n\nArdovo runs an autonomous SDR that researches, drafts, and sequences outbound with a human approval step you control. Worth a 20-minute look?\n\nBest,\nJordan`,
    };
    if (step === 'followup') return {
      subject: `Re: ${co} + Ardovo`,
      body: `Hi ${fn},\n\nQuick follow-up. I put together a short view of how Ardovo would work ${clause} for a team your size. Happy to walk you through it live, or send the async version if that is easier.\n\nWhich do you prefer?\n\nJordan`,
    };
    return {
      subject: `Should I close the loop, ${fn}?`,
      body: `Hi ${fn},\n\nI do not want to crowd your inbox. If ${clause} is not a priority this quarter, just say the word and I will circle back later.\n\nOtherwise, here is my calendar for a quick 20.\n\nJordan`,
    };
  }
  if (channel === 'sms') {
    return {
      subject: 'SMS',
      body: `Hi ${fn}, Jordan at Ardovo here. Saw ${clause} at ${co} - we run an autonomous SDR with a human approval step. Open to a quick 20-min look this week? Reply STOP to opt out.`,
    };
  }
  // linkedin
  if (step === 'opener') return {
    subject: 'Connection note',
    body: `Hi ${fn}, following ${co}'s work - ${clause} caught my eye. I help revenue teams run outbound with an autonomous agent that still keeps a human in the loop. Would love to connect.`,
  };
  return {
    subject: 'LinkedIn message',
    body: `Thanks for connecting, ${fn}. Given ${clause}, I think Ardovo's approval-gated autopilot would land well with your team. Open to a short call? I can send a couple of times.`,
  };
}

function reasoningFor(lead, channel, step, risk) {
  const out = [];
  out.push(`Fit score ${lead.score}/100 - ${lead.title} at a ${lead.size} ${lead.industry} company matches your ICP.`);
  out.push(`Intent ${lead.intent}. Top signal: ${lead.topSignal.replace(/"/g, "'")}.`);
  out.push(`${CHANNELS[channel].label} chosen because ${channel === 'email' ? 'the address is verified and this is the first touch' : channel === 'linkedin' ? 'the contact is active on LinkedIn and email bounced risk is elevated' : 'the mobile is verified and prior emails went unopened'}.`);
  if (step === 'followup') out.push('This is follow-up 2 of the sequence; prior step was delivered with no reply after 3 days.');
  if (step === 'breakup') out.push('Break-up message - low downside, tends to reactivate 1 in 7 cold threads.');
  out.push(risk <= 24 ? 'Risk is low: opted-in territory, on-brand copy, within daily cap.' : risk <= 54 ? 'Risk is medium: net-new contact, no prior relationship - worth a glance before it sends.' : 'Risk is elevated: senior title, cold outreach, and a pricing claim in the copy - recommend a human read.');
  return out;
}

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(73310625);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const sampleN = (a, n) => {
    const copy = [...a]; const out = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    return out;
  };
  const now = Date.now();
  const MIN = 60000, HR = 3600000;
  const ago = (ms) => new Date(now - ms).toISOString();

  /* --- lead workqueue --- */
  const usedCo = new Set();
  const leads = [];
  for (let i = 0; i < 16; i++) {
    let co; let guard = 0;
    do { co = `${pick(CO_A)} ${pick(CO_B)}`; guard++; } while (usedCo.has(co) && guard < 20);
    usedCo.add(co);
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const signals = sampleN(SIGNALS, range(2, 4));
    const score = range(58, 97);
    const domain = co.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    leads.push({
      id: `apl_${i + 1}`,
      firstName, lastName,
      name: `${firstName} ${lastName}`,
      title: pick(TITLES),
      company: co,
      domain,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      phone: `(${range(200, 989)}) ${range(200, 989)}-${String(range(1000, 9999))}`,
      linkedin: `linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      industry: pick(INDUSTRIES),
      size: pick(SIZES),
      location: pick(CITIES),
      score,
      intent: pick(INTENTS),
      signals,
      topSignal: signals[0],
      techStack: sampleN(TECH, range(2, 4)),
      summary: '',
      status: 'queued',
      touches: 0,
    });
  }

  // Assign lifecycle spread so the board looks worked-through.
  const statusPlan = ['booked', 'replied', 'sequenced', 'sequenced', 'awaiting', 'awaiting', 'awaiting', 'queued', 'queued', 'researching', 'sequenced', 'replied', 'awaiting', 'paused', 'sequenced', 'awaiting'];
  leads.forEach((l, i) => { l.status = statusPlan[i] || 'queued'; l.touches = l.status === 'researching' ? 0 : range(1, 4); });

  /* --- decision queue: pending actions for the awaiting leads --- */
  const decisions = [];
  let di = 0;
  const awaiting = leads.filter(l => l.status === 'awaiting');
  // Fixed risk spread so the trust dial has low + medium + high to govern.
  const riskPlan = [14, 18, 22, 38, 46, 61, 72, 51];
  const channelPlan = ['email', 'linkedin', 'sms', 'email', 'email', 'email', 'linkedin', 'sms'];
  const stepPlan = ['opener', 'opener', 'followup', 'opener', 'followup', 'opener', 'breakup', 'followup'];
  awaiting.forEach((l, i) => {
    di++;
    const channel = channelPlan[i % channelPlan.length];
    const step = stepPlan[i % stepPlan.length];
    const risk = riskPlan[i % riskPlan.length];
    const draft = draftFor(channel, l, step);
    decisions.push({
      id: `dec_${di}`,
      leadId: l.id,
      channel, step, risk,
      confidence: Math.max(40, 100 - risk - range(0, 8)),
      draft,
      reasoning: reasoningFor(l, channel, step, risk),
      status: 'pending',
      createdAt: ago(range(6, 220) * MIN),
    });
  });

  /* --- overnight shift log --- */
  const shift = {
    label: 'Overnight shift',
    startedAt: ago(9 * HR),
    endedAt: ago(1 * HR),
    researched: 41,
    drafted: 33,
    autoSent: 18,
    queuedForApproval: decisions.length,
    replies: 5,
    booked: 2,
    steps: [
      { at: ago(9 * HR), text: 'Shift started. Pulled 41 leads from the "Q3 enterprise outbound" list.' },
      { at: ago(8 * HR + 20 * MIN), text: 'Researched 41 accounts and built enrichment cards (signals, intent, tech stack).' },
      { at: ago(7 * HR + 5 * MIN), text: 'Drafted 33 personalized openers across email, SMS, and LinkedIn.' },
      { at: ago(6 * HR + 10 * MIN), text: 'Auto-sent 18 actions inside the trust threshold. Held 8 for your approval.' },
      { at: ago(4 * HR + 40 * MIN), text: 'Sequenced follow-ups for 12 leads that went quiet after the opener.' },
      { at: ago(3 * HR + 15 * MIN), text: '5 replies came in overnight. Classified 3 positive, 1 neutral, 1 objection.' },
      { at: ago(2 * HR + 30 * MIN), text: 'Booked 2 meetings straight to the calendar. Handed the objection to you.' },
      { at: ago(1 * HR), text: 'Shift complete. 8 actions waiting in your approval queue.' },
    ],
  };

  /* --- live activity feed --- */
  const feedTemplates = [
    { icon: 'search', text: (l) => `Researched ${l.company} - ${l.signals.length} signals, intent ${l.intent}.` },
    { icon: 'edit', text: (l) => `Drafted a personalized opener for ${l.name} at ${l.company}.` },
    { icon: 'send', text: (l) => `Auto-sent an email to ${l.name} (risk within threshold).` },
    { icon: 'mail', text: (l) => `${l.firstName} at ${l.company} opened the opener twice.` },
    { icon: 'phone', text: (l) => `Sequenced an SMS follow-up for ${l.company}.` },
    { icon: 'check', text: (l) => `${l.name} replied. Classified as positive - routed to you.` },
    { icon: 'calendar', text: (l) => `Booked a 20-min intro with ${l.name} at ${l.company}.` },
  ];
  const feed = [];
  let fi = 0;
  for (let i = 0; i < 18; i++) {
    const l = pick(leads);
    const t = feedTemplates[i % feedTemplates.length];
    fi++;
    feed.push({ id: `fd_${fi}`, icon: t.icon, text: t.text(l), leadId: l.id, at: ago((i * 17 + range(2, 12)) * MIN), auto: t.icon === 'send' });
  }
  feed.sort((a, b) => new Date(b.at) - new Date(a.at));

  /* --- worker stats --- */
  const stats = {
    leadsWorked: 41,
    meetingsBooked: 7,
    replies: 23,
    sent: 186,
    autoSent: 118,
    approved: 68,
    timeSavedMin: 41 * 9 + 186 * 6,   // ~9 min research + ~6 min per touch
    // rolling 14-day sparks for the KPI tiles
    sparkWorked: [3, 5, 4, 8, 6, 9, 7, 11, 9, 13, 12, 16, 14, 18],
    sparkBooked: [0, 1, 0, 1, 1, 2, 1, 2, 3, 2, 4, 3, 5, 7],
    sparkReplies: [1, 2, 2, 3, 4, 3, 6, 5, 7, 8, 9, 11, 13, 16],
    sparkSaved: [12, 18, 22, 30, 34, 41, 47, 55, 61, 70, 78, 88, 97, 110],
  };

  /* --- trust settings (governed by default: humans stay in control) --- */
  const trust = {
    enabled: true,
    threshold: 30,        // auto-send anything at or below 30 risk
    channels: { email: true, sms: false, linkedin: true },
    dailyCap: 120,
    sentToday: 42,
    quietHours: true,
    doubleCheckPricing: true,
  };

  return { seededAt: new Date(now).toISOString(), trust, leads, decisions, feed, shift, stats };
}

/* ============================================================
   PERSISTENCE + PUB/SUB  (mirrors store.js)
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
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
export function resetAutopilot() { try { localStorage.removeItem(LS_KEY); } catch {} state = buildSeed(); try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} subs.forEach(fn => fn(state)); }
export function getAutopilotState() { return state; }

export function useAutopilot(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API + DERIVED SELECTORS (pure over state)
   ============================================================ */
export const getLeads = () => state.leads;
export const getLead = (id) => state.leads.find(l => l.id === id);
export const getDecisions = () => state.decisions;
export const pendingDecisions = () => state.decisions.filter(d => d.status === 'pending').sort((a, b) => a.risk - b.risk);
export const getFeed = () => state.feed;
export const getShift = () => state.shift;
export const getStats = () => state.stats;
export const getTrust = () => state.trust;

export const timeSavedHours = () => Math.round((state.stats.timeSavedMin / 60) * 10) / 10;

// Would a given decision auto-send at the current trust setting? This is the
// heart of the governed-autonomy model, shared by the dial preview and the
// approve-all-safe action.
export function wouldAutoSend(dec, trust = state.trust) {
  if (!trust.enabled) return false;
  if (!trust.channels[dec.channel]) return false;
  if (trust.threshold <= 0) return false;
  return dec.risk <= trust.threshold;
}
export function autoSendableCount(trust = state.trust) {
  return pendingDecisions().filter(d => wouldAutoSend(d, trust)).length;
}

export function statusCounts() {
  const out = {};
  for (const k of Object.keys(LEAD_STATUS)) out[k] = 0;
  for (const l of state.leads) out[l.status] = (out[l.status] || 0) + 1;
  return out;
}

/* ============================================================
   WRITE API  (every control on the page routes through here)
   ============================================================ */
function logFeed(icon, text, leadId, auto = false) {
  const ev = { id: newId('fd'), icon, text, leadId: leadId || null, at: new Date().toISOString(), auto };
  state.feed = [ev, ...state.feed].slice(0, 60);
}

export function setTrust(patch) {
  const next = { ...state.trust, ...patch };
  if (patch.channels) next.channels = { ...state.trust.channels, ...patch.channels };
  if (typeof next.threshold === 'number') next.threshold = Math.max(0, Math.min(100, Math.round(next.threshold)));
  commit({ ...state, trust: next });
  return next;
}
export function toggleChannel(ch) {
  return setTrust({ channels: { [ch]: !state.trust.channels[ch] } });
}

// Advance the lead + stats when a decision resolves as a send.
function markSent(dec, how) {
  const lead = getLead(dec.leadId);
  if (lead) {
    lead.touches = (lead.touches || 0) + 1;
    lead.status = dec.step === 'booking' ? 'booked' : 'sequenced';
  }
  state.stats = {
    ...state.stats,
    sent: state.stats.sent + 1,
    autoSent: state.stats.autoSent + (how === 'auto' ? 1 : 0),
    approved: state.stats.approved + (how === 'approve' ? 1 : 0),
    timeSavedMin: state.stats.timeSavedMin + 6,
  };
  state.trust = { ...state.trust, sentToday: (state.trust.sentToday || 0) + 1 };
}

export function approveDecision(id, how = 'approve') {
  const dec = state.decisions.find(d => d.id === id);
  if (!dec || dec.status !== 'pending') return { error: 'missing' };
  dec.status = how === 'auto' ? 'auto' : 'approved';
  dec.resolvedAt = new Date().toISOString();
  markSent(dec, how);
  const lead = getLead(dec.leadId);
  logFeed('send', `${how === 'auto' ? 'Auto-sent' : 'Sent'} a ${CHANNELS[dec.channel].label} ${STEP_META[dec.step]?.label.toLowerCase() || dec.step} to ${lead?.name || 'a lead'} at ${lead?.company || ''}.`.trim(), dec.leadId, how === 'auto');
  commit({ ...state });
  return { decision: dec };
}
export function rejectDecision(id) {
  const dec = state.decisions.find(d => d.id === id);
  if (!dec || dec.status !== 'pending') return { error: 'missing' };
  dec.status = 'rejected';
  dec.resolvedAt = new Date().toISOString();
  const lead = getLead(dec.leadId);
  if (lead && lead.status === 'awaiting') lead.status = 'paused';
  logFeed('x', `Rejected the draft for ${lead?.name || 'a lead'} at ${lead?.company || ''}. Nothing sent.`.trim(), dec.leadId);
  commit({ ...state });
  return { decision: dec };
}
export function editDecision(id, draft) {
  const dec = state.decisions.find(d => d.id === id);
  if (!dec) return { error: 'missing' };
  dec.draft = { ...dec.draft, ...draft };
  dec.edited = true;
  dec.risk = Math.max(0, dec.risk - 6);   // a human edit lowers risk
  commit({ ...state });
  return { decision: dec };
}

// Bulk approve everything the dial says is safe right now.
export function approveAllSafe() {
  const safe = pendingDecisions().filter(d => wouldAutoSend(d));
  for (const d of safe) {
    d.status = 'auto'; d.resolvedAt = new Date().toISOString();
    markSent(d, 'auto');
    const lead = getLead(d.leadId);
    logFeed('send', `Auto-sent a ${CHANNELS[d.channel].label} ${STEP_META[d.step]?.label.toLowerCase() || d.step} to ${lead?.name || 'a lead'}.`, d.leadId, true);
  }
  if (safe.length) commit({ ...state });
  return { count: safe.length };
}

export function pauseLead(id) {
  const l = getLead(id);
  if (!l) return { error: 'missing' };
  l.status = l.status === 'paused' ? 'queued' : 'paused';
  logFeed(l.status === 'paused' ? 'x' : 'check', `${l.status === 'paused' ? 'Paused' : 'Resumed'} Autopilot for ${l.name} at ${l.company}.`, id);
  commit({ ...state });
  return { lead: l };
}

// "Run shift" - simulate a fresh overnight pass. Deterministic given the same
// state: bumps counters, appends a couple of feed events, and surfaces one new
// decision card if there is a queued lead ready to be drafted. Never throws.
export function runShift() {
  const queued = state.leads.find(l => l.status === 'queued' || l.status === 'researching');
  const bumps = { researched: 3, drafted: 2 };
  if (queued) {
    queued.status = 'awaiting';
    queued.touches = (queued.touches || 0) + 1;
    const channel = CHANNEL_KEYS[(state.decisions.length) % CHANNEL_KEYS.length];
    const risk = 20 + (state.decisions.length * 7) % 55;
    const dec = {
      id: newId('dec'), leadId: queued.id, channel, step: 'opener', risk,
      confidence: Math.max(45, 100 - risk),
      draft: draftFor(channel, queued, 'opener'),
      reasoning: reasoningFor(queued, channel, 'opener', risk),
      status: 'pending', createdAt: new Date().toISOString(),
    };
    state.decisions = [dec, ...state.decisions];
    logFeed('search', `Researched ${queued.company} and drafted an opener. Queued for your approval.`, queued.id);
  } else {
    logFeed('search', 'Ran a shift pass. No new leads were ready to draft - workqueue is caught up.', null);
  }
  state.stats = { ...state.stats, leadsWorked: state.stats.leadsWorked + bumps.researched, drafted: (state.stats.drafted || 0) + bumps.drafted };
  commit({ ...state });
  return { queued: !!queued };
}

/* ============================================================
   ENV-GATED LIVE HOOK
   The local sim is fully self-sufficient. When a drafting API exists,
   this reaches for it and falls back silently to the deterministic
   draft so the UI never white-screens or hangs offline.
   ============================================================ */
export async function draftWithApi(lead, channel, step) {
  const fallback = draftFor(channel, lead, step);
  try {
    const res = await fetch('/api/outreach-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: { name: lead.name, title: lead.title, company: lead.company, signals: lead.signals }, channel, step }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (data && (data.body || data.draft?.body)) return data.draft || data;
    return fallback;
  } catch {
    return fallback;   // offline / no env - deterministic draft still shines
  }
}
