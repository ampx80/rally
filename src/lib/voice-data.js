// ============================================================
// RALLY VOICE  (local-first, telephony-swappable)
// The AI receptionist + call intelligence data layer. One module
// owns every call-log shape, the receptionist config, a
// deterministic transcript / live-call simulator, and the
// read/write API. A fixed-seed PRNG builds a believable call
// history on first run; mutations persist to localStorage so the
// demo stays alive across reloads.
//
// Positioning baked into the copy: an AI that answers every call,
// qualifies the caller, books the appointment, and logs it - the
// missed-revenue killer for any business with a phone.
//
// LIVE TELEPHONY: every read/write notes its real equivalent
// (Supabase tables namespaced rally_voice_*). The real phone
// bridge is env-gated (see voiceEnv) and degrades silently to the
// seeded simulator when no telephony env is present.
// ============================================================
import { useEffect, useState } from 'react';
import { createActivity } from './store.js';

const LS_KEY = 'rally_voice_v1';   // bump to force a clean reseed

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

// Call outcomes. type drives badge tone + whether it counts as a
// rescued / booked call in the KPI selectors.
export const OUTCOMES = {
  booked:        { label: 'Appointment booked', tone: 'ok',     color: '#1a7f52' },
  'lead-captured': { label: 'Lead captured',    tone: 'accent', color: '#5b4bf5' },
  rescheduled:   { label: 'Rescheduled',        tone: 'info',   color: '#2563a8' },
  resolved:      { label: 'Resolved by AI',     tone: 'ok',     color: '#0ea5a3' },
  escalated:     { label: 'Escalated to human',  tone: 'warn',   color: '#b3721a' },
  voicemail:     { label: 'Voicemail to text',  tone: 'info',   color: '#2563a8' },
  missed:        { label: 'Missed',             tone: 'risk',   color: '#c0392b' },
};
export const outcomeMeta = (k) => OUTCOMES[k] || { label: k, tone: 'default', color: 'var(--n-400)' };

export const SENTIMENTS = {
  positive: { label: 'Positive', color: '#1a7f52', tone: 'ok' },
  neutral:  { label: 'Neutral',  color: '#8b93a4', tone: 'default' },
  negative: { label: 'At risk',  color: '#c0392b', tone: 'risk' },
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------- pools ---------- */
const CALLER_FIRST = ['Marcus', 'Deborah', 'Anthony', 'Grace', 'Victor', 'Helen', 'Isaac', 'Rosa', 'Curtis', 'Yvonne', 'Damon', 'Bianca', 'Reed', 'Talia', 'Owen', 'Marisol', 'Grant', 'Nadia', 'Curtis', 'Paloma'];
const CALLER_LAST = ['Feld', ' Transom'.trim(), 'Okonkwo', 'Beltran', 'Sasaki', 'Dunmore', 'Alvarez', 'Whitfield', 'Bauer', 'Nakamura', 'Cortez', 'Halloran', 'Vega', 'Rhodes', 'Ashby', 'Delgado', 'Prescott', 'Ibarra', 'Mercer', 'Vaughn'];
const CALL_COMPANIES = ['Copperline Freight', 'Meridian Health', 'Granite Systems', 'Harbor Labs', 'Solstice Retail', 'Beacon Capital', 'Ridgeline Energy', 'Aster Foods', 'Kestrel Logistics', 'Monarch Media', 'Prairie Partners', 'Tidewater Group'];
const KEYWORDS_POOL = ['pricing', 'demo', 'timeline', 'integration', 'contract', 'renewal', 'onboarding', 'competitor', 'budget', 'security', 'availability', 'support', 'trial', 'discount', 'implementation'];

// Intent library. est = [min, max] pipeline value the AI protected by
// answering (0 for service calls that carry no new revenue).
const INTENTS = [
  { key: 'book',      label: 'Book appointment',  outcome: 'booked',         est: [4000, 16000], sent: 'positive' },
  { key: 'pricing',   label: 'Pricing question',  outcome: 'lead-captured',  est: [5000, 24000], sent: 'positive' },
  { key: 'new-lead',  label: 'New lead inquiry',  outcome: 'lead-captured',  est: [6000, 30000], sent: 'positive' },
  { key: 'reschedule',label: 'Reschedule',        outcome: 'rescheduled',    est: [0, 0],        sent: 'neutral'  },
  { key: 'support',   label: 'Support question',  outcome: 'resolved',       est: [0, 0],        sent: 'neutral'  },
  { key: 'billing',   label: 'Billing dispute',   outcome: 'escalated',      est: [0, 0],        sent: 'negative' },
  { key: 'afterhours',label: 'After-hours inquiry', outcome: 'voicemail',    est: [3000, 12000], sent: 'neutral'  },
];

/* Build a short, believable transcript for a seeded call. Deterministic
   given the same rnd stream. Substitutes caller name + company so every
   row reads like a real recording, not lorem. */
function transcriptFor(intentKey, caller, company, rnd) {
  const ai = (t) => ({ who: 'ai', text: t });
  const cl = (t) => ({ who: 'caller', text: t });
  const first = caller.split(' ')[0];
  const base = {
    book: [
      cl(`Hi, I'd like to set up a demo for my team at ${company}.`),
      ai(`Happy to help, ${first}. I can book that right now - are mornings or afternoons better this week?`),
      cl('Afternoons work best.'),
      ai('Perfect. I have Thursday at 2:30 with an account executive. Shall I lock it in?'),
      cl('Yes, that works.'),
      ai("You're booked. I've sent a calendar invite and a confirmation text. Anything else?"),
      cl('That is everything, thanks.'),
    ],
    pricing: [
      cl(`I'm comparing options for ${company} - roughly what does this cost?`),
      ai('Pricing scales with seats and modules. For a team your size most land in the mid four figures monthly.'),
      cl('Good to know. Can someone send exact numbers?'),
      ai(`Absolutely. I've captured your details and flagged this as a hot lead - an AE will follow up today with a quote.`),
      cl('Appreciate it.'),
    ],
    'new-lead': [
      cl(`We found you online and wanted to learn more for ${company}.`),
      ai('Great to hear from you. What is the main outcome you are hoping to solve?'),
      cl('Mostly cutting down manual follow-up.'),
      ai('That is exactly our wheelhouse. I have logged your interest and routed you to the right specialist.'),
      cl('Thank you.'),
    ],
    reschedule: [
      cl('I need to move my appointment, something came up.'),
      ai(`No problem, ${first}. I see your Wednesday slot - what day works better?`),
      cl('Can we do Friday instead?'),
      ai('Done. Friday at 10 is set and your invite is updated.'),
    ],
    support: [
      cl('I am having trouble logging into my account.'),
      ai('Let us fix that. I can send a secure reset link to the email on file right now.'),
      cl('That would be great.'),
      ai('Sent. It should arrive within a minute. Anything else I can resolve?'),
      cl('No, that did it.'),
    ],
    billing: [
      cl('I was charged twice this month and I am not happy about it.'),
      ai('I understand, and I am sorry about that. This needs a human on billing - I am connecting you now and logging the details.'),
      cl('Okay, please hurry.'),
      ai('Transferring you to the billing team with your account notes attached.'),
    ],
    afterhours: [
      cl(`Hi, I know you are closed - I wanted info about ${company} pricing.`),
      ai('Thanks for calling after hours. I can still take everything down and have someone reach out first thing.'),
      cl('That would be perfect.'),
      ai('Got it. I have transcribed your request and texted you a confirmation. Talk soon.'),
    ],
  };
  return base[intentKey] || base.book;
}

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const HOUR = 3600000;

  const settings = {
    enabled: true,
    receptionistName: 'Rook Voice',
    voice: 'Ava - warm, professional',
    greeting: "Thanks for calling Vertex Robotics. This is the Rally AI receptionist. How can I help you today?",
    booking: { calendarLink: 'rally.app/book/vertex', defaultAe: 'Jordan Avery', durationMin: 30 },
    hours: DAYS.map((d, i) => ({
      day: d,
      closed: i === 0 || i === 6,
      open: '08:00',
      close: '18:00',
    })),
    afterHours: 'voicemail-to-text',   // 'voicemail-to-text' | 'book-anyway' | 'forward'
    escalation: {
      enabled: true,
      keywords: ['billing', 'refund', 'cancel', 'lawyer', 'complaint'],
      transferTo: 'Jordan Avery',
      transferNumber: '(512) 555-0100',
    },
    voicemailToText: true,
    smsFollowup: true,
    maxRings: 2,
  };

  /* --- call history --- */
  const calls = [];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const intent = INTENTS[range(0, INTENTS.length - 1)];
    const caller = `${pick(CALLER_FIRST)} ${pick(CALLER_LAST)}`;
    const company = pick(CALL_COMPANIES);
    // Most calls inbound + answered; a couple genuinely missed (spillover
    // beyond the AI) to keep the answer-rate honest and non-perfect.
    const missed = i >= N - 2;
    const direction = missed ? 'missed' : (rnd() < 0.16 ? 'outbound' : 'inbound');
    const outcome = missed ? 'missed' : intent.outcome;
    const duration = missed ? 0 : range(48, 340);   // seconds
    const startedAt = new Date(now - range(0, 13) * DAY - range(0, 23) * HOUR - range(0, 59) * 60000).toISOString();
    const est = intent.est[1] ? range(intent.est[0], intent.est[1]) : 0;
    const kw = [];
    const kn = range(2, 4);
    for (let k = 0; k < kn; k++) { const w = pick(KEYWORDS_POOL); if (!kw.includes(w)) kw.push(w); }
    const talkRatio = direction === 'outbound' ? range(38, 68) : range(28, 52); // rep/AI share %
    const summaries = {
      booked: `${caller} from ${company} called to book a demo. AI confirmed availability and locked a slot with ${settings.booking.defaultAe}.`,
      'lead-captured': `${caller} at ${company} asked about pricing and fit. AI qualified the need, captured contact details, and flagged a hot lead.`,
      rescheduled: `${caller} moved an existing appointment. AI found a new slot and updated the calendar invite automatically.`,
      resolved: `${caller} had a login issue. AI sent a secure reset link and confirmed resolution without a human.`,
      escalated: `${caller} raised a billing dispute. AI de-escalated, attached account notes, and transferred to a human.`,
      voicemail: `After-hours call from ${caller}. AI transcribed the request and texted a confirmation for morning follow-up.`,
      missed: `Inbound call spilled past the AI during a burst. Callback queued so no lead is lost.`,
    };
    const nextActions = {
      booked: 'Demo on the calendar - AE prepped',
      'lead-captured': 'AE to send quote today',
      rescheduled: 'Updated invite sent',
      resolved: 'Closed - no action needed',
      escalated: 'Billing to refund + follow up',
      voicemail: 'Callback first thing',
      missed: 'Auto-callback queued',
    };
    calls.push({
      id: `vc_${i + 1}`,
      direction,
      caller,
      number: `(${range(201, 989)}) 555-${String(range(1000, 9999))}`,
      company,
      intent: intent.label,
      intentKey: intent.key,
      outcome,
      sentiment: missed ? 'neutral' : intent.sent,
      startedAt,
      duration,
      estValue: outcome === 'booked' || outcome === 'lead-captured' || outcome === 'voicemail' ? est : 0,
      talkRatio,
      keywords: kw,
      summary: summaries[outcome],
      nextAction: nextActions[outcome],
      afterHours: intent.key === 'afterhours',
      recording: missed ? null : `rec_${i + 1}.mp3`,
      transcript: missed ? [] : transcriptFor(intent.key, caller, company, rnd),
      coaching: direction === 'outbound' ? [
        talkRatio > 55 ? 'Talk ratio high - ask more open questions and let the buyer speak.' : 'Balanced talk ratio - strong discovery.',
        'Named a clear next step before ending the call.',
      ] : [],
    });
  }
  // Sort newest first, but pin one marquee booked call to the top so the
  // log opens on a win.
  calls.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  return { seededAt: new Date(now).toISOString(), settings, calls };
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
export function resetVoice() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getVoiceState() { return state; }

export function useVoice(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

let idc = 1;
const newId = () => `vc_new_${(idc++).toString(36)}_${Math.floor((typeof performance !== 'undefined' ? performance.now() : 0))}`;

/* ---------- env gate for real telephony ---------- */
// LIVE TELEPHONY: a real bridge (Twilio / Vapi) is wired only when these
// env vars exist at build time. Absent, the whole feature runs on the
// seeded simulator and never calls out. Never throws.
export function voiceEnv() {
  try {
    const e = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return {
      connected: Boolean(e.VITE_VOICE_NUMBER && e.VITE_VOICE_PROVIDER),
      number: e.VITE_VOICE_NUMBER || null,
      provider: e.VITE_VOICE_PROVIDER || null,
    };
  } catch { return { connected: false, number: null, provider: null }; }
}

/* ============================================================
   READ API
   ============================================================ */
export const getCalls = () => state.calls;                       // LIVE: from('rally_voice_calls').select()
export const getCall = (id) => state.calls.find(c => c.id === id);
export const getSettings = () => state.settings;                 // LIVE: from('rally_voice_settings').single()
export const salesCalls = () => state.calls.filter(c => c.direction === 'outbound' || c.talkRatio != null && c.coaching?.length);

/* ---------- derived KPI selectors (pure over state) ---------- */
export function voiceStats() {
  const calls = state.calls;
  const answered = calls.filter(c => c.direction !== 'missed');
  const booked = calls.filter(c => c.outcome === 'booked');
  const leads = calls.filter(c => c.outcome === 'lead-captured');
  const rescued = calls.filter(c => c.afterHours || c.outcome === 'voicemail' || (c.direction === 'inbound' && (c.outcome === 'booked' || c.outcome === 'lead-captured')));
  const missed = calls.filter(c => c.direction === 'missed');
  const revenue = calls.reduce((s, c) => s + (c.estValue || 0), 0);
  const totalDur = answered.reduce((s, c) => s + c.duration, 0);
  const answerRate = calls.length ? Math.round((answered.length / calls.length) * 100) : 0;
  return {
    total: calls.length,
    answered: answered.length,
    booked: booked.length,
    leads: leads.length,
    rescued: rescued.length,
    missed: missed.length,
    revenue,
    answerRate,
    avgDuration: answered.length ? Math.round(totalDur / answered.length) : 0,
    afterHours: calls.filter(c => c.afterHours).length,
  };
}
export function sentimentSplit() {
  const out = { positive: 0, neutral: 0, negative: 0 };
  for (const c of state.calls) if (c.direction !== 'missed') out[c.sentiment] = (out[c.sentiment] || 0) + 1;
  return out;
}
export function outcomeSplit() {
  const out = {};
  for (const c of state.calls) out[c.outcome] = (out[c.outcome] || 0) + 1;
  return out;
}
// Daily volume for the last 14 days (for the sparkline / bars).
export function volumeSeries(days = 14) {
  const DAY = 86400000;
  const now = Date.now();
  const buckets = new Array(days).fill(0);
  for (const c of state.calls) {
    const idx = Math.floor((now - new Date(c.startedAt).getTime()) / DAY);
    if (idx >= 0 && idx < days) buckets[days - 1 - idx]++;
  }
  return buckets;
}
export function keywordCloud() {
  const map = {};
  for (const c of state.calls) for (const k of (c.keywords || [])) map[k] = (map[k] || 0) + 1;
  return Object.entries(map).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

/* ============================================================
   WRITE API
   ============================================================ */
export function updateSettings(patch) {                          // LIVE: update rally_voice_settings
  const settings = { ...state.settings, ...patch };
  commit({ ...state, settings });
  return { settings };
}
export function updateHours(dayIndex, patch) {
  const hours = state.settings.hours.map((h, i) => i === dayIndex ? { ...h, ...patch } : h);
  return updateSettings({ hours });
}
export function updateEscalation(patch) {
  return updateSettings({ escalation: { ...state.settings.escalation, ...patch } });
}

/* Log a completed call into the history. Used by the live-call demo when
   the operator saves the AI-handled call. Optionally mirrors an activity
   into the CRM timeline (the "auto-logged activity" moment) via the main
   store - fully additive, safe no-op if the store rejects it. */
export function logCall(call, { logActivity = true } = {}) {     // LIVE: insert rally_voice_calls (+ rally_activities)
  const rec = {
    id: newId(),
    direction: 'inbound',
    recording: 'rec_live.mp3',
    keywords: [],
    coaching: [],
    transcript: [],
    talkRatio: null,
    startedAt: new Date().toISOString(),
    ...call,
  };
  commit({ ...state, calls: [rec, ...state.calls] });
  let activity = null;
  if (logActivity) {
    try {
      const meta = outcomeMeta(rec.outcome);
      const r = createActivity({
        type: rec.outcome === 'booked' ? 'meeting' : rec.outcome === 'escalated' ? 'task' : 'call',
        subject: `${meta.label}: ${rec.caller} (${rec.company})`,
        body: rec.summary || '',
        done: rec.outcome !== 'booked',
        relatedType: null,
        relatedId: null,
      });
      activity = r.activity || null;
    } catch {}
  }
  return { call: rec, activity };
}

/* ============================================================
   LIVE-CALL DEMO SCENARIOS
   Deterministic scripted inbound calls the receptionist answers on
   screen. Each streams a transcript, reveals the detected intent
   mid-call, then resolves into a booked appointment / captured lead /
   after-hours voicemail plus the activity it auto-logs.
   ============================================================ */
export const DEMO_SCENARIOS = [
  {
    id: 'booking',
    label: 'Booking',
    hint: 'Inbound - during hours',
    caller: { name: 'Marcus Feld', number: '(512) 555-0143', company: 'Copperline Freight' },
    intent: 'Book a product demo',
    revealAt: 3,
    sentiment: 'positive',
    lines: [
      { who: 'caller', text: "Hi, I run ops at Copperline Freight. I'd love to see a demo for my team." },
      { who: 'ai', text: "Great to meet you, Marcus. I can set that up right now. Are mornings or afternoons better this week?" },
      { who: 'caller', text: "Afternoons are easier for us." },
      { who: 'ai', text: "Perfect. I have Thursday at 2:30 open with Jordan, one of our account executives. Want me to lock it in?" },
      { who: 'caller', text: "Yes, let's do it." },
      { who: 'ai', text: "You're all set. I've sent a calendar invite and a confirmation text to this number. Anything else I can help with?" },
      { who: 'caller', text: "That's everything, thank you." },
    ],
    result: {
      kind: 'booked',
      title: 'Demo booked - Thursday 2:30 PM',
      detail: 'With Jordan Avery - invite + confirmation text sent',
      estValue: 14000,
    },
    activity: { type: 'meeting', subject: 'Product demo - Copperline Freight (booked by AI receptionist)' },
  },
  {
    id: 'pricing',
    label: 'Hot lead',
    hint: 'Inbound - pricing intent',
    caller: { name: 'Rosa Delgado', number: '(415) 555-0199', company: 'Harbor Labs' },
    intent: 'Pricing + evaluation',
    revealAt: 2,
    sentiment: 'positive',
    lines: [
      { who: 'caller', text: "We're evaluating a few platforms for Harbor Labs. Roughly what does yours cost?" },
      { who: 'ai', text: "Happy to help. Pricing scales with seats and modules - most teams your size land in the mid four figures a month." },
      { who: 'caller', text: "Okay. Can someone send exact numbers and a comparison?" },
      { who: 'ai', text: "Absolutely. I've captured your details and flagged this as a priority lead. An account executive will follow up today with a tailored quote." },
      { who: 'caller', text: "Perfect, I appreciate it." },
    ],
    result: {
      kind: 'lead-captured',
      title: 'Hot lead captured',
      detail: 'Routed to Jordan Avery - quote promised today',
      estValue: 22000,
    },
    activity: { type: 'call', subject: 'Inbound pricing lead - Harbor Labs (qualified by AI receptionist)' },
  },
  {
    id: 'afterhours',
    label: 'After-hours',
    hint: 'Inbound - 9:47 PM, closed',
    caller: { name: 'Owen Prescott', number: '(303) 555-0161', company: 'Ridgeline Energy' },
    intent: 'After-hours inquiry',
    revealAt: 2,
    sentiment: 'neutral',
    lines: [
      { who: 'caller', text: "I know it's late and you're closed - I wanted to ask about getting Ridgeline set up." },
      { who: 'ai', text: "Thanks for calling after hours. I can still take everything down and make sure the right person reaches out first thing." },
      { who: 'caller', text: "That would be great. We're hoping to move quickly." },
      { who: 'ai', text: "Noted. I've transcribed your request, texted you a confirmation, and put you at the top of the morning callback list." },
      { who: 'caller', text: "Wonderful, thank you." },
    ],
    result: {
      kind: 'voicemail',
      title: 'After-hours lead saved',
      detail: 'Transcribed + confirmation text sent - callback queued 8:00 AM',
      estValue: 9000,
    },
    activity: { type: 'task', subject: 'After-hours callback - Ridgeline Energy (captured by AI receptionist)' },
  },
];
export const scenarioById = (id) => DEMO_SCENARIOS.find(s => s.id === id) || DEMO_SCENARIOS[0];

/* ---------- small formatters ---------- */
export function fmtDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
