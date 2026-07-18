// ============================================================
// ARDOVO CONVERSATIONS  (local-first, Supabase-swappable)
// One unified omni-channel inbox: SMS, email, WhatsApp, Instagram
// DM, Facebook Messenger, Google Business messages, and voice/call
// transcripts all merge into ONE thread per contact. This is the
// single feature SMBs never leave GoHighLevel for - Ardovo does it
// with Rook drafting replies and missed-call text-back built in.
//
// Mirrors src/lib/store.js exactly: a deterministic PRNG seeds a
// believable book of conversations on first run; every mutation
// persists to localStorage and notifies subscribers so the demo
// feels alive across reloads. Live sends are env-gated to
// /api/sms-send + /api/outbound and degrade silently when offline.
// Every function carries a // SUPABASE: note (tables rally_*).
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { getUsers, getCurrentUser, userName } from './store.js';

const LS_KEY = 'rally_conversations_v1'; // bump to force a clean reseed

/* ---------- deterministic PRNG (same as store.js) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   CHANNELS  (config; SUPABASE: rally_channels)
   Brand tints are used only for the small channel glyph + chip so
   each medium is instantly recognizable in a mixed thread.
   ============================================================ */
export const CHANNELS = {
  sms:       { id: 'sms',       label: 'SMS',       verb: 'Text',      color: '#0ea5a3', handleKind: 'phone' },
  email:     { id: 'email',     label: 'Email',     verb: 'Email',     color: '#2563a8', handleKind: 'email' },
  whatsapp:  { id: 'whatsapp',  label: 'WhatsApp',  verb: 'WhatsApp',  color: '#25a366', handleKind: 'phone' },
  instagram: { id: 'instagram', label: 'Instagram', verb: 'DM',        color: '#c13584', handleKind: 'handle' },
  messenger: { id: 'messenger', label: 'Messenger', verb: 'Message',   color: '#0084ff', handleKind: 'handle' },
  gbm:       { id: 'gbm',       label: 'Google',    verb: 'Message',   color: '#b3721a', handleKind: 'handle' },
  call:      { id: 'call',      label: 'Call',      verb: 'Call',      color: '#c0392b', handleKind: 'phone' },
};
export const CHANNEL_ORDER = ['sms', 'email', 'whatsapp', 'instagram', 'messenger', 'gbm', 'call'];
export const channelMeta = (id) => CHANNELS[id] || CHANNELS.sms;

/* ============================================================
   MISSED-CALL TEXT-BACK  (the automation that recovers lost leads)
   SUPABASE: rally_automations row, event = inbound_call_missed.
   ============================================================ */
export const MISSED_CALL_RECIPE = {
  id: 'missed-call-textback',
  name: 'Missed-call text-back',
  trigger: 'Inbound call goes unanswered',
  action: 'Ardovo texts the caller back within 30 seconds',
  windowLabel: '30s',
  recoveryRate: 87, // percent of missed callers who reply to the text
  template: (first, rep, biz) =>
    `Hi ${first || 'there'}, this is ${rep || 'the team'} at ${biz || 'Ardovo'}. Sorry we missed your call! ` +
    `I can help right here over text - what can I do for you?`,
};

/* ============================================================
   QUICK REPLIES / SNIPPETS  (SUPABASE: rally_snippets)
   ============================================================ */
export const QUICK_REPLIES = [
  { id: 'q_thanks', label: 'Thanks', body: 'Thanks so much - really appreciate you reaching out. Let me pull that up.' },
  { id: 'q_book', label: 'Book a call', body: 'Happy to walk you through it live. Here is my calendar: ardovo.com/meet - grab any slot that works.' },
  { id: 'q_pricing', label: 'Send pricing', body: 'Sending pricing over now. Plans start at $99/mo and scale with your team - want me to tailor a quote?' },
  { id: 'q_followup', label: 'Follow up', body: 'Just circling back on this - are you still looking to move forward? No rush, just keeping it warm.' },
  { id: 'q_hours', label: 'Hours', body: 'We are around Mon-Fri 8a-6p CT, and I keep an eye on messages after hours too. What works for you?' },
];

/* ============================================================
   SEED
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const H = 3600000, D = 86400000, M = 60000;
  const ago = (ms) => new Date(now - ms).toISOString();

  const reps = getUsers().filter(u => u.role === 'rep');
  const repId = (i) => (reps[i % reps.length] || reps[0]).id;
  const me = getCurrentUser()?.id || (reps[0] && reps[0].id);

  let mid = 0;
  const msg = (channel, dir, body, atMs, extra = {}) => ({
    id: `m_${++mid}`, channel, dir, body, at: ago(atMs), kind: extra.kind || 'text', ...extra,
  });

  /* -------- marquee threads (hand-authored, fully deterministic) -------- */
  const conversations = [];

  // 1) Vertex Robotics - the flagship enterprise account, rich cross-channel.
  conversations.push({
    id: 'cv_vertex',
    contactName: 'Priya Nair',
    handle: '+1 (512) 555-0142',
    igHandle: '@priya.builds',
    title: 'VP of Operations',
    company: 'Vertex Robotics',
    companyId: 'co_flagship',
    dealId: 'd_flagship',
    deal: { name: 'Enterprise platform rollout', value: 420000, stage: 'Negotiation' },
    tags: ['champion', 'economic buyer'],
    assignedTo: me,
    pinned: true,
    unread: 2,
    channels: ['email', 'call', 'sms', 'whatsapp'],
    activity: [
      { label: 'Deal moved to Negotiation', at: ago(2 * D) },
      { label: 'Proposal opened 4 times', at: ago(30 * H) },
      { label: 'Redlined MSA sent to legal', at: ago(6 * H) },
    ],
    messages: [
      msg('email', 'in', 'Following up after the exec review - the team loved the rollout plan. Can you send the redlined MSA so legal can start their pass this week?', 3 * D, { author: 'Priya Nair', subject: 'Re: Vertex x Ardovo - next steps' }),
      msg('email', 'out', 'Absolutely, Priya. Redlines attached with the security addendum. I flagged the two clauses your team raised - both accepted. Want to grab 20 minutes Thursday to close the loop?', 3 * D - 2 * H, { author: 'Jordan Avery', subject: 'Re: Vertex x Ardovo - next steps' }),
      msg('call', 'in', 'Inbound call - 6m 12s. Transcript summary: Priya confirmed budget is approved for Q3. Wants SSO + audit log in the base tier. Asked about onboarding timeline (4 weeks). Positive, ready to sign pending legal.', 30 * H, { kind: 'voice', duration: '6:12', outcome: 'connected' }),
      msg('sms', 'out', 'Great call just now - sending the onboarding timeline over email. You are going to love how fast go-live is.', 29 * H),
      msg('sms', 'in', 'Perfect. Legal is reviewing today, should have signature by Friday.', 20 * H),
      msg('whatsapp', 'in', 'One more thing - can we add two seats for the EMEA team to the order? Same terms.', 5 * H),
      msg('whatsapp', 'out', 'Done - updated the order to include the two EMEA seats at the same per-seat rate. Revised quote is in your inbox.', 4 * H),
      msg('sms', 'in', 'You are the best. Signing Friday. 🎉', 90 * M),
    ],
  });

  // 2) Northwind Freight - Instagram inbound lead from an event.
  conversations.push({
    id: 'cv_northwind',
    contactName: 'Marco Ruiz',
    handle: '@marco.logistics',
    title: 'Head of Dispatch',
    company: 'Northwind Freight',
    companyId: null,
    tags: ['event lead', 'inbound'],
    assignedTo: null,
    pinned: false,
    unread: 1,
    channels: ['instagram', 'sms'],
    activity: [{ label: 'Lead captured from Instagram', at: ago(3 * H) }],
    messages: [
      msg('instagram', 'in', 'Saw your booth at FreightCon - the AI dispatch demo was wild. Do you integrate with our TMS? We run about 140 trucks.', 3 * H, { author: 'Marco Ruiz' }),
      msg('instagram', 'in', 'Also whats pricing look like for a fleet our size?', 2.8 * H, { author: 'Marco Ruiz' }),
    ],
  });

  // 3) Cascade Health - Google Business Messages inbound.
  conversations.push({
    id: 'cv_cascade',
    contactName: 'Dr. Lena Boyd',
    handle: 'Cascade Health (Google)',
    title: 'Director of Clinical Ops',
    company: 'Cascade Health',
    companyId: null,
    tags: ['inbound'],
    assignedTo: repId(1),
    pinned: false,
    unread: 0,
    channels: ['gbm', 'email'],
    activity: [{ label: 'Message via Google Business Profile', at: ago(26 * H) }],
    messages: [
      msg('gbm', 'in', 'Hi - found you on Google. We are evaluating a patient-outreach platform for a 6-clinic pilot. Are you HIPAA-ready?', 26 * H, { author: 'Dr. Lena Boyd' }),
      msg('gbm', 'out', 'Hi Dr. Boyd - yes, Ardovo supports a signed BAA and HIPAA-eligible messaging. I would love to scope the pilot with you. Want me to send a short overview by email?', 25 * H, { author: 'Simone Diaz' }),
      msg('gbm', 'in', 'Please do - lena.boyd@cascadehealth.com', 24 * H, { author: 'Dr. Lena Boyd' }),
      msg('email', 'out', 'Overview + a HIPAA one-pager attached, as promised. Happy to set up a 6-clinic pilot on a 30-day trial - no card required.', 23 * H, { author: 'Simone Diaz', subject: 'Ardovo for Cascade Health - pilot overview' }),
    ],
  });

  // 4) Ironclad Aerospace - the missed-call text-back showcase.
  conversations.push({
    id: 'cv_ironclad',
    contactName: 'Sam Whitfield',
    handle: '+1 (206) 555-0178',
    title: 'Procurement Lead',
    company: 'Ironclad Aerospace',
    companyId: null,
    tags: ['inbound', 'recovered'],
    assignedTo: me,
    pinned: false,
    unread: 1,
    channels: ['call', 'sms'],
    recovered: true,
    activity: [
      { label: 'Missed call recovered by text-back', at: ago(2 * D) },
      { label: 'Replied within 4 minutes', at: ago(2 * D - 4 * M) },
    ],
    messages: [
      msg('call', 'in', 'Missed call - 0:00, no voicemail. Caller: +1 (206) 555-0178.', 2 * D, { kind: 'voice', duration: '0:00', outcome: 'missed' }),
      msg('sms', 'out', 'Hi Sam, this is Jordan at Ardovo. Sorry we missed your call! I can help right here over text - what can I do for you?', 2 * D - 30000, { auto: true, kind: 'text', autoLabel: 'Missed-call text-back' }),
      msg('sms', 'in', 'Oh perfect, texting is easier anyway. We need quoting for a 50-seat rollout. Can you send options?', 2 * D - 4 * M),
      msg('sms', 'out', 'On it - putting together 50-seat options now. Quick q: annual or monthly billing preference?', 2 * D - 3 * M),
      msg('sms', 'in', 'Annual. And can we get SSO?', 40 * M),
    ],
  });

  /* -------- generated threads (deterministic via rnd) -------- */
  const genPeople = [
    { name: 'Amara Okafor', title: 'Operations Manager', company: 'Beacon Systems' },
    { name: 'Diego Castillo', title: 'VP Marketing', company: 'Solstice Media' },
    { name: 'Wei Tanaka', title: 'CFO', company: 'Harbor Capital' },
    { name: 'Fatima Haddad', title: 'Director of IT', company: 'Kestrel Labs' },
    { name: 'Noah Frost', title: 'General Manager', company: 'Redwood Retail' },
  ];
  const genOpeners = {
    sms: 'Hey - is the starter plan enough for a 12-person team or should we look at Pro?',
    email: 'We are comparing a few platforms this quarter. Could you share a feature breakdown vs your competitors?',
    whatsapp: 'Quick one - does your scheduling handle round-robin across 5 reps?',
    messenger: 'Hi! Are you the folks with the AI receptionist? A friend recommended you.',
    gbm: 'Found you on Google Maps - do you offer onboarding help for a non-technical team?',
    instagram: 'Loved your reel on missed-call text-back. Does it work with our existing number?',
  };
  const genReplies = [
    'Great question - short answer yes. Let me send specifics so you can see it in action.',
    'Happy to help with that. Want me to set up a quick working session this week?',
    'Totally doable on your current plan. I will drop a walkthrough link in a sec.',
  ];
  for (let i = 0; i < genPeople.length; i++) {
    const p = genPeople[i];
    const ch = pick(['sms', 'email', 'whatsapp', 'messenger', 'gbm', 'instagram']);
    const meta = channelMeta(ch);
    const first = p.name.split(' ')[0];
    const handle = meta.handleKind === 'phone'
      ? `+1 (${range(200, 989)}) 555-0${range(100, 199)}`
      : meta.handleKind === 'email'
        ? `${first.toLowerCase()}@${p.company.toLowerCase().replace(/[^a-z]/g, '')}.com`
        : `@${first.toLowerCase()}.${p.company.toLowerCase().split(' ')[0]}`;
    const startedAt = range(6, 96) * H;
    const answered = rnd() < 0.6;
    const messages = [msg(ch, 'in', genOpeners[ch], startedAt, { author: p.name })];
    if (answered) {
      messages.push(msg(ch, 'out', pick(genReplies), startedAt - range(1, 3) * H, { author: userName(repId(i)) }));
    }
    conversations.push({
      id: `cv_gen_${i + 1}`,
      contactName: p.name,
      handle,
      title: p.title,
      company: p.company,
      companyId: null,
      tags: rnd() < 0.5 ? ['inbound'] : [],
      assignedTo: rnd() < 0.5 ? repId(i) : null,
      pinned: false,
      unread: answered ? 0 : 1,
      channels: [ch],
      activity: [{ label: `First touch via ${meta.label}`, at: ago(startedAt) }],
      messages,
    });
  }

  return { seededAt: new Date(now).toISOString(), conversations };
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
export function resetConversations() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function getConversationsState() { return state; }

export function useConversations(selector = (s) => s) {
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
   READ API
   ============================================================ */
export const getConversations = () => state.conversations;                       // SUPABASE: from('rally_conversations').select()
export const getConversation = (id) => state.conversations.find(c => c.id === id);
export const lastMessage = (c) => (c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null);

/* Derived KPIs for the inbox header (all pure over state). */
export function inboxStats() {
  const list = state.conversations;
  const unread = list.reduce((s, c) => s + (c.unread || 0), 0);
  const open = list.length;
  const recoveries = list.filter(c => (c.messages || []).some(m => m.auto)).length;
  // A believable, stable "avg first response" derived from the seed shape.
  const responded = list.filter(c => (c.messages || []).some(m => m.dir === 'out'));
  const avgMins = responded.length ? Math.max(2, Math.round(240 / responded.length)) : 0;
  return { unread, open, recoveries, avgMins };
}

export function channelBreakdown() {
  const map = {};
  for (const id of CHANNEL_ORDER) map[id] = 0;
  for (const c of state.conversations) for (const m of (c.messages || [])) map[m.channel] = (map[m.channel] || 0) + 1;
  return map;
}

/* ============================================================
   AI DRAFT  (Rook suggests a reply, deterministic + offline)
   Reads the last inbound message and composes a grounded reply in
   Rook's voice. No network needed; the live model upgrade swaps
   this for /api/rook when ANTHROPIC_API_KEY is wired.
   ============================================================ */
export function aiDraftFor(conv) {
  if (!conv) return '';
  const rep = getCurrentUser()?.name?.split(' ')[0] || 'the team';
  const first = (conv.contactName || 'there').split(' ')[0];
  const inbound = [...(conv.messages || [])].reverse().find(m => m.dir === 'in');
  const text = (inbound?.body || '').toLowerCase();
  const dealLine = conv.deal ? ` on the ${conv.deal.name}` : '';

  if (/pric|cost|quote|plan|\$/.test(text))
    return `Hi ${first} - happy to put numbers to it. For a team your size I would start you on Pro at $99/mo, and I can tailor a quote${dealLine} today. Want it annual or monthly?`;
  if (/sso|hipaa|security|audit|complian/.test(text))
    return `Great question, ${first}. Yes - SSO, audit logs, and a signed BAA are all supported. I will send the security overview now and we can scope it live whenever works.`;
  if (/integrat|tms|api|connect/.test(text))
    return `Yes ${first}, we integrate with that - it takes about 10 minutes with our native connector. Want me to send a short walkthrough or set up a working session?`;
  if (/seat|team|rollout|fleet|clinic|trucks/.test(text))
    return `Love it, ${first}. A rollout that size is right in our wheelhouse${dealLine}. I will draft options now - do you prefer annual billing so I can lock the best per-seat rate?`;
  if (/book|call|demo|meet|time|calendar/.test(text))
    return `Absolutely, ${first}. Grab any slot that works at ardovo.com/meet and I will come ready with a tailored walkthrough. Looking forward to it.`;
  return `Thanks ${first} - on it. Give me a moment to pull the details together and I will follow right up. Anything specific you want me to prioritize?`;
}

/* ============================================================
   ENV-GATED LIVE SEND  (dormant + crash-safe when offline)
   SUPABASE / Twilio: POST /api/sms-send (SMS + call text-back),
   POST /api/outbound (email + social channels). Never awaited on
   the critical path; the message is already in the local store.
   ============================================================ */
function dispatchExternal(channel, handle, body) {
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    if (env.VITE_MESSAGING_LIVE !== 'true') return; // dormant until wired
    const endpoint = (channel === 'sms' || channel === 'call') ? '/api/sms-send' : '/api/outbound';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, to: handle, body }),
    }).catch(() => {});
  } catch { /* offline / no env - silently no-op */ }
}

/* ============================================================
   WRITE API  (validated writers; local-first, then env-gated send)
   ============================================================ */
export function sendMessage(convId, { channel, body, author } = {}) {
  const c = getConversation(convId);
  if (!c) return { error: 'missing', message: 'Conversation not found.' };
  const text = (body || '').trim();
  if (!text) return { error: 'body', message: 'Type a message first.' };
  const ch = CHANNELS[channel] ? channel : (c.channels[0] || 'sms');
  const m = {
    id: newId('m'), channel: ch, dir: 'out', body: text, kind: 'text',
    at: new Date().toISOString(), author: author || getCurrentUser()?.name || 'You',
  };
  const messages = [...(c.messages || []), m];
  const channels = c.channels.includes(ch) ? c.channels : [...c.channels, ch];
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, messages, channels } : x) });
  dispatchExternal(ch, c.handle, text); // env-gated, fire-and-forget
  return { message: m };
}

export function markRead(convId) {
  const c = getConversation(convId);
  if (!c || !c.unread) return { ok: true };
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, unread: 0 } : x) });
  return { ok: true };
}

export function assignConversation(convId, userId) {
  const c = getConversation(convId);
  if (!c) return { error: 'missing', message: 'Conversation not found.' };
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, assignedTo: userId || null } : x) });
  return { ok: true };
}

export function togglePin(convId) {
  const c = getConversation(convId);
  if (!c) return { error: 'missing', message: 'Conversation not found.' };
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, pinned: !x.pinned } : x) });
  return { ok: true, pinned: !c.pinned };
}

export function addTag(convId, tag) {
  const c = getConversation(convId);
  if (!c || !tag) return { ok: false };
  if ((c.tags || []).includes(tag)) return { ok: true };
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, tags: [...(x.tags || []), tag] } : x) });
  return { ok: true };
}

/* Missed-call text-back demo. Appends a missed inbound call, then the
   automated outbound SMS that recovers the lead - exactly what fires in
   production the instant a call goes unanswered. Reversible-safe. */
export function simulateMissedCall(convId) {
  const c = getConversation(convId);
  if (!c) return { error: 'missing', message: 'Conversation not found.' };
  const nowIso = new Date().toISOString();
  const first = (c.contactName || 'there').split(' ')[0];
  const rep = getCurrentUser()?.name?.split(' ')[0] || 'the team';
  const call = {
    id: newId('m'), channel: 'call', dir: 'in', kind: 'voice',
    body: `Missed call - 0:00, no voicemail. Caller: ${c.handle}.`,
    duration: '0:00', outcome: 'missed', at: nowIso,
  };
  const textback = {
    id: newId('m'), channel: 'sms', dir: 'out', kind: 'text', auto: true,
    autoLabel: 'Missed-call text-back',
    body: MISSED_CALL_RECIPE.template(first, rep, 'Ardovo'),
    at: new Date(Date.now() + 30000).toISOString(),
    author: getCurrentUser()?.name || 'Ardovo',
  };
  const messages = [...(c.messages || []), call, textback];
  const channels = Array.from(new Set([...c.channels, 'call', 'sms']));
  const activity = [{ label: 'Missed call recovered by text-back', at: nowIso }, ...(c.activity || [])];
  commit({ ...state, conversations: state.conversations.map(x => x.id === convId ? { ...x, messages, channels, activity, recovered: true } : x) });
  dispatchExternal('sms', c.handle, textback.body); // env-gated
  return { ok: true, textback };
}
