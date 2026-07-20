// ============================================================
// ARDOVA QUALIFYING ENGINE  (early-release, hand-picked customers)
//
// We are opening Ardova to a hand-picked first cohort: people genuinely
// desperate to leave Salesforce. They convert, they tolerate rough edges, and
// they evangelize. The whole flow exists to surface exactly those people and
// route them to us instantly.
//
// The hero question IS the score: "How badly do you want to leave Salesforce?"
// on a 1-10 slider. Urgency is a first-class field on every submission so the
// pipeline sorts by how bad they want out.
//
//   urgency >= 7  -> HOT      (white-glove booking + instant alert to Nate)
//   urgency 4-6   -> NURTURE  (capture + sequence, no call slot yet)
//   urgency <= 3  -> WAITLIST (capture + thank you, no priority)
//
// Local-first (localStorage rally_prequal_v1), pub/sub like store.js. The server
// capture + alert + persistence live behind /api/prequalify and env-gate
// themselves. ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_prequal_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'pm.me', 'hey.com',
]);
export function emailDomain(email) {
  const m = String(email || '').toLowerCase().trim().match(/@([^@]+)$/);
  return m ? m[1] : '';
}
export function isValidEmail(email) { return EMAIL_RE.test(String(email || '').trim()); }
export function isBusinessEmail(email) {
  return isValidEmail(email) && !FREE_EMAIL_DOMAINS.has(emailDomain(email));
}

/* ---------- the hero: urgency ---------- */
// Sub-label that reveals as they drag the 1-10 slider.
export function urgencyLabel(u) {
  const n = Number(u) || 0;
  if (n >= 10) return 'Get me the hell out';
  if (n >= 9) return 'Ready to switch';
  if (n >= 7) return 'Actively looking';
  if (n >= 4) return 'Frustrated';
  return 'Just curious';
}
// The whole point: route by how bad they want out.
export function routeFor(u) {
  const n = Number(u) || 0;
  if (n >= 7) return 'hot';
  if (n >= 4) return 'nurture';
  return 'waitlist';
}
export const ROUTE_META = {
  hot: { label: 'HOT', tone: 'ok', color: '#0e9f8f' },
  nurture: { label: 'Nurture', tone: 'warn', color: '#e0752d' },
  waitlist: { label: 'Waitlist', tone: 'default', color: '#7c5cf7' },
};

/* ---------- supporting question options ---------- */
export const CURRENT_TOOLS = [
  { value: 'salesforce', label: 'Salesforce' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'gohighlevel', label: 'GoHighLevel' },
  { value: 'zoho', label: 'Zoho' },
  { value: 'spreadsheets', label: 'Spreadsheets' },
  { value: 'other', label: 'Something else' },
];
export const SEAT_OPTIONS = [
  { value: '1-5', label: '1-5' },
  { value: '6-20', label: '6-20' },
  { value: '21-50', label: '21-50' },
  { value: '51-200', label: '51-200' },
  { value: '200+', label: '200+' },
];
export const toolLabel = (v) => (CURRENT_TOOLS.find(t => t.value === v) || {}).label || v || '';

/* ============================================================
   CONFIG (admin-editable copy + routing knobs)
   ============================================================ */
export function defaultConfig() {
  return {
    headline: 'How badly do you want to leave Salesforce?',
    subhead: 'We are hand-picking the first companies onto Ardova. Be honest - the more you want out, the faster we move.',
    hotThreshold: 7,
    nurtureThreshold: 4,
    aeTitle: 'migration lead',
    bookingUrl: '/meet/intro-call',   // real in-app booking (BookMeeting) - always books
    calendlyUrl: '',                  // optional - if set, embed Calendly for HOT leads
    // Questions-based fit scoring (drives QualifyConfig + scored submissions).
    qualifyThreshold: 60,
    reviewThreshold: 35,
    requireBusinessEmail: true,
    voiceEnabled: false,
    questions: [
      { id: 'q_tool', label: 'What are you using today?', type: 'select', required: true, options: [
        { value: 'salesforce', label: 'Salesforce', points: 30 },
        { value: 'hubspot', label: 'HubSpot', points: 20 },
        { value: 'spreadsheets', label: 'Spreadsheets', points: 15 },
        { value: 'nothing', label: 'Nothing yet', points: 10 },
      ] },
      { id: 'q_seats', label: 'How many seats do you need?', type: 'select', required: true, options: [
        { value: '1-10', label: '1-10', points: 10 },
        { value: '11-50', label: '11-50', points: 20 },
        { value: '51-200', label: '51-200', points: 30 },
        { value: '200+', label: '200+', points: 40 },
      ] },
      { id: 'q_urgency', label: 'How soon do you need to switch?', type: 'select', required: true, options: [
        { value: 'now', label: 'Immediately', points: 30 },
        { value: 'quarter', label: 'This quarter', points: 20 },
        { value: 'exploring', label: 'Just exploring', points: 5 },
      ] },
      { id: 'q_pain', label: 'What is driving the change?', type: 'text', required: false, options: [] },
    ],
  };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function freshState() { return { config: defaultConfig(), submissions: [] }; }
function normalize(s) {
  const base = freshState();
  const config = { ...base.config, ...(s?.config || {}) };
  if (!config.bookingUrl || config.bookingUrl === '/meet/rally-ae') config.bookingUrl = base.config.bookingUrl;
  return { config, submissions: Array.isArray(s?.submissions) ? s.submissions : [] };
}
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch {}
  const seed = freshState();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
let state = load();
const subs = new Set();
function commit(next) {
  state = normalize(next);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function getPrequalConfig() { return state.config; }
export function getSubmissions() { return state.submissions; }
export function resetPrequal() { commit(freshState()); }
export function usePrequal(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   WRITES
   ============================================================ */
export function recordSubmission(payload = {}) {
  const urgency = Math.max(1, Math.min(10, Math.round(Number(payload.urgency) || 1)));
  const route = routeFor(urgency);
  // Derived fit fields so the scored pipeline view has sensible values even for
  // urgency-only submissions from the live /get-started form.
  const businessEmail = isBusinessEmail(payload.email);
  const pct = typeof payload.pct === 'number' ? payload.pct : Math.round(urgency * 10);
  const tier = payload.tier || (route === 'hot' ? 'qualified' : route === 'nurture' ? 'review' : 'low');
  const sub = {
    id: newId('lead'),
    name: payload.name || '',
    email: payload.email || '',
    phone: payload.phone || '',
    company: payload.company || '',
    urgency,
    urgencyLabel: urgencyLabel(urgency),
    currentTool: payload.currentTool || '',
    seats: payload.seats || '',
    pain: payload.pain || '',
    route,
    tier, pct, businessEmail,
    leadSource: payload.leadSource || 'get-started',
    status: 'new',            // new | booked | called | won | lost
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, submissions: [sub, ...state.submissions] });
  return { submission: sub, route, urgency };
}
export function updateSubmission(id, patch) {
  const submissions = state.submissions.map(s => s.id === id ? { ...s, ...patch } : s);
  commit({ ...state, submissions });
  return submissions.find(s => s.id === id) || null;
}
export function deleteSubmission(id) {
  commit({ ...state, submissions: state.submissions.filter(s => s.id !== id) });
}
export function updateConfig(patch) {
  commit({ ...state, config: { ...state.config, ...patch } });
  return state.config;
}

/* ---------- funnel stats (sorted by how bad they want out) ---------- */
export function funnelStats() {
  const s = state.submissions;
  const by = (r) => s.filter(x => x.route === r).length;
  const avg = s.length ? Math.round((s.reduce((a, x) => a + (x.urgency || 0), 0) / s.length) * 10) / 10 : 0;
  const qualified = s.filter(x => (x.tier ? x.tier === 'qualified' : x.route === 'hot')).length;
  return {
    total: s.length,
    hot: by('hot'), nurture: by('nurture'), waitlist: by('waitlist'),
    qualified,
    qualifyRate: s.length ? Math.round((qualified / s.length) * 100) : 0,
    booked: s.filter(x => x.status === 'booked' || x.status === 'won').length,
    avgUrgency: avg,
    hotRate: s.length ? Math.round((by('hot') / s.length) * 100) : 0,
  };
}
// Submissions sorted hottest-first (urgency desc, then newest).
export function submissionsByUrgency() {
  return [...state.submissions].sort((a, b) => (b.urgency || 0) - (a.urgency || 0) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

/* ============================================================
   QUESTIONS-BASED FIT SCORING (drives QualifyConfig)
   ============================================================ */
// Highest score a respondent could earn: sum of the top option in each
// choice question. Text questions do not score.
export function maxPossibleScore(config = state.config) {
  return (config.questions || []).reduce((sum, q) => {
    if (q.type !== 'select' || !(q.options && q.options.length)) return sum;
    return sum + Math.max(0, ...q.options.map(o => Number(o.points) || 0));
  }, 0);
}
export function addQuestion() {
  const q = { id: newId('q'), label: 'New question', type: 'select', required: false, options: [{ value: 'opt1', label: 'Option 1', points: 10 }] };
  commit({ ...state, config: { ...state.config, questions: [...(state.config.questions || []), q] } });
  return q;
}
export function updateQuestion(id, patch) {
  const questions = (state.config.questions || []).map(q => q.id === id ? { ...q, ...patch } : q);
  commit({ ...state, config: { ...state.config, questions } });
  return questions.find(q => q.id === id) || null;
}
export function removeQuestion(id) {
  commit({ ...state, config: { ...state.config, questions: (state.config.questions || []).filter(q => q.id !== id) } });
}
