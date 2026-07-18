// ============================================================
// ARDOVO PRE-QUALIFICATION ENGINE  (local-first, additive)
//
// The front door to Ardovo sales. A prospect fills a short form (name,
// business email, phone, company headcount, plus admin-configurable
// questions). The engine scores fit deterministically, decides
// qualified / review / not-a-fit, and routes: qualified -> book a call
// with an Account Executive (and optionally an instant AI voice
// qualifier); not-a-fit -> self-serve. Every submission is captured so
// the admin dashboard (src/pages/QualifyConfig.jsx) can review the
// funnel and tune the questions + scoring.
//
// SAFE + INERT: pure local store (localStorage rally_prequal_v1) with
// the same pub/sub shape as store.js. The optional server capture +
// voice trigger live behind /api/prequalify and env-gate themselves.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_prequal_v1';

/* Free / personal email domains never count as a business email. */
export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com',
  'pm.me', 'hey.com', 'fastmail.com', 'inbox.com', 'hushmail.com', 'ymail.co',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailDomain(email) {
  const m = String(email || '').toLowerCase().trim().match(/@([^@]+)$/);
  return m ? m[1] : '';
}
export function isValidEmail(email) { return EMAIL_RE.test(String(email || '').trim()); }
export function isBusinessEmail(email) {
  if (!isValidEmail(email)) return false;
  return !FREE_EMAIL_DOMAINS.has(emailDomain(email));
}

/* ============================================================
   DEFAULT CONFIG  (fully admin-editable)
   Each question carries per-option `points`. Fit score is the sum of the
   selected options' points, gated by the business-email requirement.
   ============================================================ */
export function defaultConfig() {
  return {
    headline: 'See if Ardovo is a fit',
    subhead: 'A 60-second pre-qualification. If it is a match, you book a call with a Ardovo account executive who tailors the walkthrough to your team.',
    requireBusinessEmail: true,
    // Fit thresholds against the summed points (max ~100).
    qualifyThreshold: 55,   // >= this -> qualified (book a call)
    reviewThreshold: 30,    // >= this and < qualify -> human review
    aeTitle: 'Senior Account Executive',
    bookingUrl: '/meet/rally-ae',
    voiceEnabled: true,     // offer the instant AI voice qualifier when qualified
    questions: [
      {
        id: 'headcount', label: 'How big is your company?', type: 'select', required: true,
        options: [
          { value: 'solo', label: 'Just me', points: 4 },
          { value: '2-10', label: '2-10', points: 10 },
          { value: '11-50', label: '11-50', points: 22 },
          { value: '51-200', label: '51-200', points: 28 },
          { value: '201-1000', label: '201-1000', points: 30 },
          { value: '1000+', label: '1000+', points: 30 },
        ],
      },
      {
        id: 'reps', label: 'How many people are in sales or revenue?', type: 'select', required: true,
        options: [
          { value: '1-2', label: '1-2', points: 6 },
          { value: '3-10', label: '3-10', points: 16 },
          { value: '11-30', label: '11-30', points: 22 },
          { value: '30+', label: '30+', points: 24 },
        ],
      },
      {
        id: 'currentCrm', label: 'What are you running today?', type: 'select', required: true,
        options: [
          { value: 'salesforce', label: 'Salesforce', points: 24 },
          { value: 'hubspot', label: 'HubSpot', points: 20 },
          { value: 'other-crm', label: 'Another CRM', points: 16 },
          { value: 'spreadsheets', label: 'Spreadsheets', points: 14 },
          { value: 'nothing', label: 'Nothing yet', points: 8 },
        ],
      },
      {
        id: 'timeline', label: 'When are you looking to make a change?', type: 'select', required: true,
        options: [
          { value: 'now', label: 'This month', points: 22 },
          { value: 'quarter', label: 'This quarter', points: 16 },
          { value: 'half', label: 'Next 6 months', points: 8 },
          { value: 'exploring', label: 'Just exploring', points: 3 },
        ],
      },
      {
        id: 'pain', label: 'What is the one thing you want to fix?', type: 'text', required: false,
        placeholder: 'Forecasting is guesswork, reps live in spreadsheets, adoption is dead...',
      },
    ],
  };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
function freshState() {
  return { config: defaultConfig(), submissions: [] };
}
function normalize(s) {
  const base = freshState();
  return {
    config: { ...base.config, ...(s?.config || {}), questions: Array.isArray(s?.config?.questions) ? s.config.questions : base.config.questions },
    submissions: Array.isArray(s?.submissions) ? s.submissions : [],
  };
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
   SCORING
   ============================================================ */
export function maxPossibleScore(config = state.config) {
  return (config.questions || []).reduce((sum, q) => {
    if (q.type !== 'select' || !Array.isArray(q.options) || !q.options.length) return sum;
    return sum + Math.max(...q.options.map(o => Number(o.points) || 0));
  }, 0);
}

// Score a set of answers against the config. Returns
// { score, pct, tier: 'qualified'|'review'|'low', reasons[], businessEmail }.
export function scoreAnswers(answers = {}, email = '', config = state.config) {
  const reasons = [];
  let score = 0;
  for (const q of (config.questions || [])) {
    if (q.type !== 'select') continue;
    const val = answers[q.id];
    const opt = (q.options || []).find(o => o.value === val);
    if (opt) {
      score += Number(opt.points) || 0;
      if ((Number(opt.points) || 0) >= 20) reasons.push(`${q.label.replace(/\?$/, '')}: ${opt.label}`);
    }
  }
  const max = maxPossibleScore(config) || 1;
  const businessEmail = isBusinessEmail(email);
  // Business email requirement is a hard gate on "qualified".
  let tier = 'low';
  if (score >= config.qualifyThreshold && (!config.requireBusinessEmail || businessEmail)) tier = 'qualified';
  else if (score >= config.reviewThreshold) tier = 'review';
  if (config.requireBusinessEmail && !businessEmail) {
    reasons.push('Personal email - a work email moves you to the front of the line.');
  }
  return { score, pct: Math.round((score / max) * 100), tier, reasons, businessEmail };
}

/* ============================================================
   WRITES
   ============================================================ */
export function recordSubmission(payload) {
  const config = state.config;
  const result = scoreAnswers(payload.answers, payload.email, config);
  const sub = {
    id: newId('sub'),
    name: payload.name || '',
    email: payload.email || '',
    phone: payload.phone || '',
    company: payload.company || '',
    answers: payload.answers || {},
    score: result.score,
    pct: result.pct,
    tier: result.tier,
    businessEmail: result.businessEmail,
    status: 'new',            // new | booked | called | won | lost
    voiceStatus: null,        // null | queued | completed
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, submissions: [sub, ...state.submissions] });
  return { submission: sub, result };
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
export function updateQuestion(qid, patch) {
  const questions = (state.config.questions || []).map(q => q.id === qid ? { ...q, ...patch } : q);
  commit({ ...state, config: { ...state.config, questions } });
}
export function addQuestion() {
  const q = { id: newId('q'), label: 'New question', type: 'select', required: false, options: [{ value: 'opt1', label: 'Option 1', points: 10 }] };
  commit({ ...state, config: { ...state.config, questions: [...(state.config.questions || []), q] } });
  return q;
}
export function removeQuestion(qid) {
  commit({ ...state, config: { ...state.config, questions: (state.config.questions || []).filter(q => q.id !== qid) } });
}

/* ---------- funnel stats for the admin dashboard ---------- */
export function funnelStats() {
  const subs = state.submissions;
  const by = (t) => subs.filter(s => s.tier === t).length;
  return {
    total: subs.length,
    qualified: by('qualified'),
    review: by('review'),
    low: by('low'),
    booked: subs.filter(s => s.status === 'booked' || s.status === 'won').length,
    qualifyRate: subs.length ? Math.round((by('qualified') / subs.length) * 100) : 0,
  };
}
