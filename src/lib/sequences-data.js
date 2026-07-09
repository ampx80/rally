// ============================================================
// RALLY SEQUENCES DATA  (local-first, deterministic seed)
// Owns cadence definitions + per-contact enrollments for the
// /sequences page. Persists to localStorage so the demo stays
// alive across reloads. Reads live contacts/users from store.js
// only for enrollment; sequence definitions live here.
// SUPABASE: rally_sequences, rally_sequence_steps,
//           rally_sequence_enrollments.
// ============================================================
import { useEffect, useState } from 'react';
import { getContacts } from './store.js';

const LS_KEY = 'rally_sequences_v1';   // bump to force a clean reseed

export const STEP_TYPES = {
  email: { label: 'Email', icon: 'mail', color: '#5b4bf5' },
  call: { label: 'Call task', icon: 'phone', color: '#0ea5a3' },
  linkedin: { label: 'LinkedIn', icon: 'users', color: '#2563a8' },
  task: { label: 'Task', icon: 'checkSquare', color: '#e0752d' },
};
export const stepMeta = (type) => STEP_TYPES[type] || STEP_TYPES.task;

const uid = (() => { let n = Date.now(); return (p) => `${p}_${(n++).toString(36)}`; })();

/* ---------- deterministic PRNG (same family as store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   SEED  (4-5 realistic cadences with multi-step timelines)
   ============================================================ */
function step(type, delay, subject, body) {
  return { id: uid('st'), type, delay, subject, body };
}

function buildSeed() {
  const rnd = mulberry32(770511);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  const sequences = [
    {
      id: 'seq_inbound',
      name: 'New inbound follow-up',
      description: 'Fast, warm touches for hand-raisers who filled out a form or booked a demo.',
      active: true,
      createdAt: Date.now() - 41 * 86400000,
      steps: [
        step('email', 0, 'Thanks for reaching out, {{firstName}}',
          'Hi {{firstName}},\n\nThanks for your interest in Rally. I saw {{company}} is scaling its revenue team and would love to show you how we compress the busywork.\n\nDo you have 20 minutes this week?\n\nBest,\n{{senderName}}'),
        step('call', 1, 'Call {{firstName}} - discovery',
          'Warm inbound. Reference the form fill. Goal: confirm pain + book working session. Keep it under 10 minutes.'),
        step('email', 3, 'A quick idea for {{company}}',
          'Hi {{firstName}},\n\nHad a thought after reviewing {{company}}. Two of your peers cut ramp time in half with Rally sequences. Worth a look?\n\n{{senderName}}'),
        step('linkedin', 5, 'Connect with {{firstName}} on LinkedIn',
          'Send a personalized connection note. Reference the demo interest, no pitch.'),
        step('email', 7, 'Should I close the loop, {{firstName}}?',
          'Hi {{firstName}},\n\nDont want to crowd your inbox. If now is not the moment just say the word and I will follow up next quarter.\n\n{{senderName}}'),
      ],
    },
    {
      id: 'seq_enterprise',
      name: 'Enterprise outbound',
      description: 'Multi-threaded, patient cadence for named enterprise accounts and VP+ buyers.',
      active: true,
      createdAt: Date.now() - 63 * 86400000,
      steps: [
        step('linkedin', 0, 'Engage {{firstName}} - warm the account',
          'Like + thoughtfully comment on a recent post from {{firstName}} or {{company}}. No connect yet.'),
        step('email', 2, 'Rethinking pipeline at {{company}}',
          'Hi {{firstName}},\n\nEnterprise revenue leaders tell us forecasting is guesswork. Rally gives {{company}} a single source of truth your board will trust.\n\nWorth 25 minutes?\n\n{{senderName}}'),
        step('call', 4, 'Call {{firstName}} - executive intro',
          'VP+ cold call. Lead with a peer proof point, not features. Book a 30-minute exec briefing.'),
        step('email', 7, 'The 3 metrics your board asks about',
          'Hi {{firstName}},\n\nAttached is the one-pager on how enterprise teams like {{company}} report pipeline coverage, win rate, and net-new ARR in Rally.\n\n{{senderName}}'),
        step('linkedin', 9, 'Send {{firstName}} a connection request',
          'Now connect, referencing the email thread. Short and specific.'),
        step('task', 12, 'Multi-thread {{company}} - find a champion',
          'Map 2 more stakeholders at {{company}}. Enroll the champion in this sequence next.'),
      ],
    },
    {
      id: 'seq_renewal',
      name: 'Renewal nudge',
      description: 'Proactive touches 60 days out to secure renewals and tee up expansion.',
      active: true,
      createdAt: Date.now() - 28 * 86400000,
      steps: [
        step('email', 0, 'Your Rally renewal is coming up, {{firstName}}',
          'Hi {{firstName}},\n\nYour {{company}} contract renews soon. Quick heads up so there are no surprises. Can we grab 15 minutes to review value delivered?\n\n{{senderName}}'),
        step('call', 3, 'Renewal check-in with {{firstName}}',
          'Review usage + wins. Surface any risk. Ask about seats or new teams to expand into.'),
        step('email', 6, 'Recap + a small idea for next year',
          'Hi {{firstName}},\n\nGreat catching up. Here is the value recap for {{company}} and one expansion idea for the coming year.\n\n{{senderName}}'),
        step('task', 8, 'Send renewal paperwork to {{company}}',
          'Draft renewal order form. Loop in the economic buyer if different from {{firstName}}.'),
      ],
    },
    {
      id: 'seq_reengage',
      name: 'Re-engage cold',
      description: 'Break-up and reactivation touches for opportunities that went quiet.',
      active: false,
      createdAt: Date.now() - 74 * 86400000,
      steps: [
        step('email', 0, 'Still on your radar, {{firstName}}?',
          'Hi {{firstName}},\n\nIt has been a while. Priorities shift. Is modernizing revenue ops at {{company}} still on the table this year?\n\n{{senderName}}'),
        step('email', 4, 'One number that might change your mind',
          'Hi {{firstName}},\n\nTeams that adopted Rally saw a 22% lift in meetings booked in 90 days. Happy to show you the playbook behind it.\n\n{{senderName}}'),
        step('call', 7, 'Reactivation call to {{firstName}}',
          'Low-pressure check-in. If no answer, leave a 20-second voicemail referencing the email.'),
        step('email', 11, 'Closing the file, {{firstName}}',
          'Hi {{firstName}},\n\nI will stop reaching out for now. If things change, my door is open. Wishing {{company}} a strong quarter.\n\n{{senderName}}'),
      ],
    },
    {
      id: 'seq_event',
      name: 'Event lead follow-up',
      description: 'Strike-while-hot cadence for booth scans and conference conversations.',
      active: true,
      createdAt: Date.now() - 12 * 86400000,
      steps: [
        step('email', 0, 'Great meeting you at the booth, {{firstName}}',
          'Hi {{firstName}},\n\nEnjoyed chatting about {{company}} revenue goals. As promised, here is the demo link and a slot to go deeper.\n\n{{senderName}}'),
        step('linkedin', 1, 'Connect with {{firstName}} post-event',
          'Send connection with a note referencing the specific conversation topic.'),
        step('call', 3, 'Follow-up call with {{firstName}}',
          'Reference the event. Confirm the pain we discussed is a priority and book the demo.'),
        step('email', 6, 'Did the timing work out, {{firstName}}?',
          'Hi {{firstName}},\n\nCircling back on the demo for {{company}}. Grab any time that works here and I will make it useful.\n\n{{senderName}}'),
      ],
    },
  ];

  // Deterministic seeded analytics per step (open/reply counts scale with reach).
  for (const seq of sequences) {
    let reach = int(120, 340);
    seq.steps = seq.steps.map((s, i) => {
      const sent = Math.max(6, Math.round(reach));
      const opened = s.type === 'email' ? Math.round(sent * (0.42 + rnd() * 0.34)) : 0;
      const replied = s.type === 'email' ? Math.round(opened * (0.14 + rnd() * 0.16)) : Math.round(sent * (0.08 + rnd() * 0.1));
      reach = reach * (0.6 + rnd() * 0.22); // funnel decays down the timeline
      return { ...s, sent, opened, replied };
    });
  }

  // Deterministic seeded enrollments over the first slice of real contacts.
  const contacts = getContacts();
  const STATUS = ['active', 'active', 'active', 'replied', 'finished'];
  const enrollments = [];
  let ptr = 0;
  for (const seq of sequences) {
    const count = int(4, Math.min(9, Math.max(4, contacts.length)));
    for (let k = 0; k < count && contacts.length; k++) {
      const contact = contacts[(ptr++) % contacts.length];
      const status = STATUS[int(0, STATUS.length - 1)];
      const stepIndex = status === 'finished'
        ? seq.steps.length
        : status === 'replied'
          ? int(1, seq.steps.length)
          : int(0, Math.max(0, seq.steps.length - 1));
      enrollments.push({
        id: uid('en'),
        sequenceId: seq.id,
        contactId: contact.id,
        status,
        stepIndex,
        enrolledAt: Date.now() - int(1, 40) * 86400000,
      });
    }
  }

  return { seededAt: Date.now(), sequences, enrollments };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let data = load();
const subs = new Set();

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  data = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  subs.forEach(fn => fn(data));
}

export function useSequenceStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(data));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(data);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- reads ---------- */
export const getSequences = () => data.sequences;
export const getSequence = (id) => data.sequences.find(s => s.id === id);
export const getEnrollments = () => data.enrollments;
export const enrollmentsForSequence = (seqId) => data.enrollments.filter(e => e.sequenceId === seqId);

// Aggregate stats for a single sequence (used on cards + detail header).
export function sequenceStats(seq) {
  const enr = enrollmentsForSequence(seq.id);
  const active = enr.filter(e => e.status === 'active').length;
  const replied = enr.filter(e => e.status === 'replied').length;
  const finished = enr.filter(e => e.status === 'finished').length;
  const sent = seq.steps.reduce((s, st) => s + (st.sent || 0), 0);
  const emailSteps = seq.steps.filter(s => s.type === 'email');
  const opened = emailSteps.reduce((s, st) => s + (st.opened || 0), 0);
  const emailSent = emailSteps.reduce((s, st) => s + (st.sent || 0), 0);
  const totalReplied = seq.steps.reduce((s, st) => s + (st.replied || 0), 0);
  const openRate = emailSent ? Math.round((opened / emailSent) * 100) : 0;
  const replyRate = sent ? Math.round((totalReplied / sent) * 100) : 0;
  // Meetings booked: a believable slice of replies convert to meetings.
  const meetings = Math.round((replied + finished) * 0.55) + Math.round(totalReplied * 0.12);
  return {
    enrolled: enr.length, active, replied, finished,
    sent, opened, openRate, replyRate, meetings,
  };
}

// Fleet-wide roll-up for the header StatCards.
export function fleetStats() {
  const seqs = data.sequences;
  let activeEnroll = 0, meetings = 0, emailsSent = 0, replies = 0, sent = 0;
  for (const seq of seqs) {
    const s = sequenceStats(seq);
    activeEnroll += s.active;
    meetings += s.meetings;
    emailsSent += seq.steps.filter(st => st.type === 'email').reduce((a, st) => a + (st.sent || 0), 0);
    replies += seq.steps.reduce((a, st) => a + (st.replied || 0), 0);
    sent += s.sent;
  }
  const replyRate = sent ? Math.round((replies / sent) * 1000) / 10 : 0;
  return { activeEnroll, meetings, emailsSent, replyRate };
}

/* ---------- writes ---------- */
export function createSequence({ name, description }) {
  const seq = {
    id: uid('seq'),
    name: (name || 'Untitled sequence').trim(),
    description: (description || '').trim(),
    active: false,
    createdAt: Date.now(),
    steps: [
      { ...step('email', 0, 'Intro to {{firstName}}',
        'Hi {{firstName}},\n\n[Write your opening touch here. Merge tags {{company}} and {{senderName}} are supported.]'),
        sent: 0, opened: 0, replied: 0 },
    ],
  };
  commit({ ...data, sequences: [seq, ...data.sequences] });
  return seq;
}

export function updateSequence(id, patch) {
  const sequences = data.sequences.map(s => s.id === id ? { ...s, ...patch } : s);
  commit({ ...data, sequences });
  return sequences.find(s => s.id === id);
}

export function toggleSequence(id) {
  const seq = getSequence(id);
  return updateSequence(id, { active: !seq.active });
}

export function deleteSequence(id) {
  commit({
    ...data,
    sequences: data.sequences.filter(s => s.id !== id),
    enrollments: data.enrollments.filter(e => e.sequenceId !== id),
  });
}

function replaceSteps(seqId, steps) {
  return updateSequence(seqId, { steps });
}

export function addStep(seqId, { type = 'email', delay = 2, subject = '', body = '' }) {
  const seq = getSequence(seqId);
  const steps = [...seq.steps, {
    ...step(type, Number(delay) || 0, subject || 'New step', body),
    sent: 0, opened: 0, replied: 0,
  }];
  return replaceSteps(seqId, steps);
}

export function updateStep(seqId, stepId, patch) {
  const seq = getSequence(seqId);
  if (patch.delay != null) patch.delay = Number(patch.delay) || 0;
  const steps = seq.steps.map(s => s.id === stepId ? { ...s, ...patch } : s);
  return replaceSteps(seqId, steps);
}

export function deleteStep(seqId, stepId) {
  const seq = getSequence(seqId);
  return replaceSteps(seqId, seq.steps.filter(s => s.id !== stepId));
}

export function moveStep(seqId, stepId, dir) {
  const seq = getSequence(seqId);
  const steps = [...seq.steps];
  const i = steps.findIndex(s => s.id === stepId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= steps.length) return seq;
  [steps[i], steps[j]] = [steps[j], steps[i]];
  return replaceSteps(seqId, steps);
}

// Enroll a set of contacts; skips contacts already enrolled in this sequence.
export function enrollContacts(seqId, contactIds) {
  const existing = new Set(enrollmentsForSequence(seqId).map(e => e.contactId));
  const fresh = contactIds
    .filter(id => !existing.has(id))
    .map(id => ({
      id: uid('en'),
      sequenceId: seqId,
      contactId: id,
      status: 'active',
      stepIndex: 0,
      enrolledAt: Date.now(),
    }));
  if (!fresh.length) return 0;
  commit({ ...data, enrollments: [...fresh, ...data.enrollments] });
  return fresh.length;
}

export function unenroll(enrollmentId) {
  commit({ ...data, enrollments: data.enrollments.filter(e => e.id !== enrollmentId) });
}

// Merge-tag preview against a real contact + sender.
export function renderTemplate(text, { contact, companyName, senderName }) {
  if (!text) return '';
  return text
    .replaceAll('{{firstName}}', contact?.firstName || 'there')
    .replaceAll('{{lastName}}', contact?.lastName || '')
    .replaceAll('{{company}}', companyName || 'your team')
    .replaceAll('{{senderName}}', senderName || 'the Rally team')
    .replaceAll('{{title}}', contact?.title || '');
}
