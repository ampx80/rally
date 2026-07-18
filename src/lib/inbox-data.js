// ============================================================
// ARDOVO INBOX DATA  (local-first conversation threads)
// A deterministic seed builds believable email/chat threads tied to
// REAL seeded contacts, then read/reply/message state persists to its
// own localStorage key so replies survive reloads. Kept separate from
// store.js so the inbox owns its conversational data shape without
// touching the shared CRM store. Live equivalent lives in
// rally_threads / rally_messages tables.
// ============================================================
import { getContacts, getContact, getCompany, contactName, getCurrentUser } from './store.js';

const LS_KEY = 'rally_inbox_v1';

/* deterministic PRNG (same family as store.js) */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3600000;
const DAY = 86400000;

/* Conversation scripts. Each is a back-and-forth; `from` is 'them' or 'me'.
   `hoursAgo` is measured from the thread's anchor time so the transcript reads
   chronologically. Written to feel like a live B2B sales/support conversation. */
const SCRIPTS = [
  {
    channel: 'email', subject: 'Re: Enterprise platform rollout - security review',
    msgs: [
      { from: 'them', body: 'Hi - our security team finished reviewing the platform. Two questions before we can sign: do you support SCIM provisioning, and where is data residency for EU customers?' },
      { from: 'me', body: 'Great questions. Yes, SCIM 2.0 is supported on the Enterprise tier, and we run an EU data region in Frankfurt with full residency guarantees. I can send the SOC 2 report and a residency addendum today.' },
      { from: 'them', body: 'Perfect. Please send both over. If those check out we are ready to move to signature this week.' },
    ],
  },
  {
    channel: 'chat', subject: 'Quick question on seat pricing',
    msgs: [
      { from: 'them', body: 'Hey! Quick one - if we add 40 more seats mid-contract, is it prorated or does it reset the term?' },
      { from: 'me', body: 'Prorated to your existing renewal date, no term reset. I can generate an order form for the 40 seats whenever you are ready.' },
      { from: 'them', body: 'Amazing, that is exactly what I hoped. Let me confirm the headcount with finance and circle back.' },
    ],
  },
  {
    channel: 'email', subject: 'Following up on our demo',
    msgs: [
      { from: 'me', body: 'Thanks again for your time on the demo. You mentioned reporting was the top priority - I put together a short Loom walking through the custom dashboard builder. Want me to send it?' },
      { from: 'them', body: 'Yes please. Reporting is what will get this approved internally, so anything that shows that off is gold.' },
    ],
  },
  {
    channel: 'chat', subject: 'Integration timeline',
    msgs: [
      { from: 'them', body: 'What does a typical Salesforce integration timeline look like? Trying to set expectations with my exec team.' },
      { from: 'me', body: 'For a standard bidirectional sync, most teams are live in 2-3 weeks. Our solutions engineer handles the field mapping. I can get you a project plan draft.' },
    ],
  },
  {
    channel: 'email', subject: 'Contract redlines attached',
    msgs: [
      { from: 'them', body: 'Legal returned the MSA with a few redlines - mostly around the liability cap and the termination-for-convenience clause. Attaching the marked-up version.' },
      { from: 'me', body: 'Thanks, I will route these to our counsel. The liability cap adjustment is usually fine; the termination clause may need a call. Are you free Thursday?' },
      { from: 'them', body: 'Thursday at 2pm ET works. I will send an invite.' },
    ],
  },
  {
    channel: 'chat', subject: 'Renewal check-in',
    msgs: [
      { from: 'me', body: 'Your renewal is coming up in 60 days. Usage is up 34% year over year, which is great. Want to grab 20 minutes to talk expansion options?' },
      { from: 'them', body: 'Sure. We have been really happy. Send me a couple times next week.' },
    ],
  },
  {
    channel: 'email', subject: 'Onboarding kickoff scheduling',
    msgs: [
      { from: 'them', body: 'We signed! Very excited. Who do we work with on onboarding and how soon can we start provisioning users?' },
      { from: 'me', body: 'Congratulations and welcome aboard! Your onboarding lead is on our CS team and will reach out within 24 hours. You can start provisioning as soon as your workspace is live, which is today.' },
    ],
  },
  {
    channel: 'chat', subject: 'Need a hand with SSO setup',
    msgs: [
      { from: 'them', body: 'Trying to wire up Okta SSO and hitting a metadata mismatch error. Any pointers?' },
      { from: 'me', body: 'That is almost always the entity ID casing. Make sure the Okta entity ID matches ours exactly including https. Happy to hop on a screen share if that does not fix it.' },
    ],
  },
  {
    channel: 'email', subject: 'Budget approved - next steps',
    msgs: [
      { from: 'them', body: 'Good news, budget got approved for the platform this quarter. What do you need from us to get the paperwork moving?' },
      { from: 'me', body: 'Fantastic news! I just need the legal entity name, billing contact, and preferred start date. I will have an order form to you within the hour.' },
      { from: 'them', body: 'Sending those now. Thank you for making this easy.' },
    ],
  },
  {
    channel: 'chat', subject: 'Comparing you to a competitor',
    msgs: [
      { from: 'them', body: 'Being transparent - we are also evaluating one of your competitors. The main thing they lead with is price. How do you think about that?' },
      { from: 'me', body: 'Appreciate the candor. We are rarely the cheapest line item, but customers switch to us for the lower total cost of ownership - less admin overhead and higher adoption. I can share a side-by-side if useful.' },
    ],
  },
  {
    channel: 'email', subject: 'Pilot results look strong',
    msgs: [
      { from: 'me', body: 'Wanted to share the 30-day pilot numbers: 87% weekly active usage and a 22% reduction in manual reporting time. Strong signal for the full rollout. Shall we talk expansion?' },
      { from: 'them', body: 'These are better than we expected. Let me bring this to the steering committee Friday and I think we are a go.' },
    ],
  },
  {
    channel: 'chat', subject: 'Invoice question',
    msgs: [
      { from: 'them', body: 'Got the latest invoice but the seat count looks off by 5. Can you double check?' },
      { from: 'me', body: 'You are right, five seats were added last week and billed a cycle early. I am issuing a corrected invoice with the proration fixed. Sorry about that.' },
    ],
  },
  {
    channel: 'email', subject: 'Executive sponsor introduction',
    msgs: [
      { from: 'them', body: 'Our new VP wants to understand the platform before renewal. Could you put together a short executive briefing deck?' },
      { from: 'me', body: 'Absolutely. I will tailor a one-pager to your usage and outcomes and send it ahead of the meeting. Would an exec-level ROI summary be helpful too?' },
    ],
  },
  {
    channel: 'chat', subject: 'Feature request follow-up',
    msgs: [
      { from: 'them', body: 'The bulk-edit feature we asked about last quarter - any update on the roadmap?' },
      { from: 'me', body: 'Yes! It shipped to beta this week. I can flip it on for your workspace today if you want to try it before general availability.' },
    ],
  },
];

/* AI reply suggestions keyed loosely by intent, chosen by the last inbound msg. */
function suggestReply(thread) {
  const last = [...thread.messages].reverse().find(m => m.from === 'them');
  const text = (last?.body || '').toLowerCase();
  const who = thread.contactFirst || 'there';
  if (/price|pricing|seat|budget|invoice|cost/.test(text))
    return `Hi ${who}, thanks for the note. I have put the pricing details together and will send a formal order form shortly. Happy to jump on a quick call if it is easier to walk through the numbers live.`;
  if (/security|sso|scim|residency|soc|compliance/.test(text))
    return `Hi ${who}, great question. I will send over our security documentation today, including the SOC 2 report. Everything you flagged is fully supported on the Enterprise tier - happy to loop in our security lead if helpful.`;
  if (/contract|redline|legal|msa|sign|paperwork/.test(text))
    return `Hi ${who}, appreciate you sending this over. I will route it to our counsel today and come back with turnaround by end of week. Let us find 20 minutes to close out any open items so we can get to signature.`;
  if (/demo|roadmap|feature|pilot|integration|timeline/.test(text))
    return `Hi ${who}, thanks for the follow-up. I will put together the details and share them by tomorrow. If a short working session would move this faster, I am glad to set one up this week.`;
  return `Hi ${who}, thanks so much for reaching out. I will look into this and get back to you today with a clear next step. In the meantime, let me know if there is anything else I can pull together for you.`;
}

/* Build the seed: pick real contacts, attach a script to each. */
function buildSeed() {
  const rnd = mulberry32(778201);
  const contacts = getContacts();
  const me = getCurrentUser();
  const myName = me?.name || 'You';
  const now = Date.now();

  // Prefer contacts with recent activity; keep them stable + real.
  const pool = [...contacts]
    .sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0))
    .slice(0, 30);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const usedContacts = new Set();
  const chooseContact = () => {
    let guard = 0; let c;
    do { c = pick(pool); guard++; } while (c && usedContacts.has(c.id) && guard < 40);
    if (c) usedContacts.add(c.id);
    return c;
  };

  const threads = SCRIPTS.map((script, i) => {
    const contact = chooseContact() || contacts[i];
    if (!contact) return null;
    const anchorDaysAgo = Math.floor(rnd() * 9);          // 0..8 days ago
    const anchor = now - anchorDaysAgo * DAY - Math.floor(rnd() * 6) * HOUR;
    // space messages out backward from the anchor (last msg newest)
    const gap = 1 + Math.floor(rnd() * 20); // hours between messages
    const total = script.msgs.length;
    const messages = script.msgs.map((m, mi) => ({
      id: `im_${i}_${mi}`,
      from: m.from,
      body: m.from === 'me' ? m.body : m.body,
      at: new Date(anchor - (total - 1 - mi) * gap * HOUR).toISOString(),
    }));
    const lastMsg = messages[messages.length - 1];
    // Unread when the newest message is inbound (from them). ~half the threads.
    const unread = lastMsg.from === 'them';
    return {
      id: `thr_${i}`,
      contactId: contact.id,
      channel: script.channel,
      subject: script.subject,
      messages,
      unread,
      lastAt: lastMsg.at,
    };
  }).filter(Boolean);

  // sort newest activity first
  threads.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

  return {
    seededAt: new Date(now).toISOString(),
    myName,
    // seeded first-response metric (minutes) so the KPI is stable + believable
    avgFirstResponseMins: 42,
    resolvedToday: 6,
    threads,
  };
}

/* ---------- persistence + tiny pub/sub ---------- */
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
export function subscribeInbox(fn) { subs.add(fn); return () => subs.delete(fn); }

/* ---------- read API (enriched with live contact/company names) ---------- */
export function getThreads() {
  return data.threads.map(enrich).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}
function enrich(t) {
  const contact = getContact(t.contactId);
  const company = contact ? getCompany(contact.companyId) : null;
  const name = contactName(contact);
  return {
    ...t,
    contact,
    contactName: name,
    contactFirst: contact?.firstName || name.split(' ')[0],
    companyName: company?.name || '',
    companyId: company?.id || null,
    snippet: t.messages[t.messages.length - 1]?.body || '',
    awaitingReply: t.messages[t.messages.length - 1]?.from === 'them',
  };
}
export function getThread(id) {
  const t = data.threads.find(x => x.id === id);
  return t ? enrich(t) : null;
}
export function inboxStats() {
  const threads = getThreads();
  return {
    unread: threads.filter(t => t.unread).length,
    awaiting: threads.filter(t => t.awaitingReply).length,
    avgFirstResponseMins: data.avgFirstResponseMins,
    resolvedToday: data.resolvedToday,
  };
}
export { suggestReply };
export const myName = () => data.myName;

/* ---------- write API ---------- */
export function markRead(id) {
  const t = data.threads.find(x => x.id === id);
  if (!t || !t.unread) return;
  t.unread = false;
  commit({ ...data });
}
export function sendReply(id, body) {
  const t = data.threads.find(x => x.id === id);
  if (!t || !body || !body.trim()) return null;
  const msg = { id: `im_${id}_${t.messages.length}_${Date.now().toString(36)}`, from: 'me', body: body.trim(), at: new Date().toISOString() };
  t.messages = [...t.messages, msg];
  t.lastAt = msg.at;
  t.unread = false;
  commit({ ...data });
  return msg;
}
