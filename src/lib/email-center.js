// email-center.js - the internal Ardovo email brain (local-first).
//
// This is the single place that: (1) decides whether an event should email
// (per-domain routing + quiet hours), (2) renders it via the catalog, (3) logs
// every send with its lifecycle (queued -> sent -> opened -> clicked -> replied
// / bounced / suppressed), and (4) threads replies back to the original send.
// The Email Center page reads all of this. When RESEND is configured, emitEmail
// also POSTs the pre-rendered HTML to /api/notify (the hardened Resend layer);
// offline it just logs so the tool is always populated and demoable.
//
// Ardovo (this, internal/transactional) is distinct from Mailchimp (outreach)
// and the marketing broadcast engine. This center sees every system email.
// NO em-dash / en-dash. ASCII hyphen only.
import { useEffect, useState } from 'react';
import { EVENTS, DOMAINS, DIGESTS, eventByKey, domainById, renderEmailHtml } from './email-catalog.js';

const LS_KEY = 'rally_email_center_v1';

function freshPrefs() {
  const domains = {};
  DOMAINS.forEach(d => { domains[d.id] = true; });
  const digests = {};
  DIGESTS.forEach(d => { digests[d.key] = d.cadence !== 'day'; }); // daily off by default (anti-harass)
  return {
    domains,
    digests,
    executives: ['nate@amptekgrowth.com'],
    quietHours: { enabled: true, start: 21, end: 7 }, // 9pm-7am: batch, do not ping
    provider: 'resend', // transactional provider (Mailchimp is outreach, separate)
    criticalBypassQuiet: true, // security/critical still go through
  };
}

function freshState() {
  return { log: [], prefs: freshPrefs(), connections: [], seeded: false };
}

// ---- demo seed so the center is alive on first open ----
function seedLog() {
  const now = Date.now();
  const H = 3600 * 1000;
  const recipients = ['nate@amptekgrowth.com', 'jordan@ardovo.com', 'nina@ardovo.com', 'sam@northwind.com', 'finance@ardovo.com'];
  const pick = (arr, i) => arr[i % arr.length];
  // A curated spread of real events with varied statuses + a couple of reply threads.
  const specs = [
    ['deal.won', 'sent', 'opened', 0.4],
    ['team.invite_sent', 'sent', 'opened', 1.5],
    ['team.invite_accepted', 'sent', 'sent', 2],
    ['developers.api_key_created', 'sent', 'clicked', 3],
    ['module.enabled', 'sent', 'sent', 5],
    ['invoice.paid', 'sent', 'opened', 6],
    ['invoice.overdue', 'sent', 'replied', 8],
    ['auth.2fa_enabled', 'sent', 'opened', 10],
    ['auth.signin_new_device', 'sent', 'clicked', 12],
    ['quote.accepted', 'sent', 'opened', 20],
    ['ticket.assigned', 'sent', 'sent', 22],
    ['inbox.sla_breached', 'sent', 'clicked', 26],
    ['signal.churn_critical', 'sent', 'replied', 30],
    ['report.delivered', 'sent', 'opened', 34],
    ['form.submitted', 'sent', 'clicked', 40],
    ['subscription.payment_failed', 'sent', 'opened', 46],
    ['nightshift.run_complete', 'sent', 'sent', 52],
    ['auth.signup', 'sent', 'opened', 60],
    ['import.completed', 'sent', 'sent', 68],
    ['workflow.enrollment_failed', 'sent', 'bounced', 74],
    ['lead.scored_high', 'sent', 'opened', 80],
    ['signature.completed', 'sent', 'clicked', 90],
    ['payment.link_paid', 'sent', 'sent', 100],
    ['success.churn_risk_elevated', 'suppressed', 'suppressed', 110],
  ];
  const log = [];
  specs.forEach(([key, , status], idx) => {
    const e = eventByKey(key); if (!e) return;
    const hoursAgo = specs[idx][3];
    const at = new Date(now - hoursAgo * H).toISOString();
    const to = [pick(recipients, idx)];
    const { subject } = renderEmailHtml(key);
    const id = `em_${(now - idx).toString(36)}`;
    const entry = {
      id, eventKey: key, domain: e.domain, severity: e.severity,
      to, subject, status, at,
      openedAt: ['opened', 'clicked', 'replied'].includes(status) ? new Date(now - (hoursAgo - 0.3) * H).toISOString() : null,
      clickedAt: ['clicked', 'replied'].includes(status) ? new Date(now - (hoursAgo - 0.5) * H).toISOString() : null,
      repliedAt: status === 'replied' ? new Date(now - (hoursAgo - 0.8) * H).toISOString() : null,
      test: false, threadId: id, parentId: null, link: null,
    };
    log.push(entry);
    // Reply thread child for replied ones.
    if (status === 'replied') {
      log.push({
        id: id + '_r', eventKey: key, domain: e.domain, severity: 'info',
        to: ['(inbound)'], from: to[0], subject: 'Re: ' + subject, status: 'reply',
        at: entry.repliedAt, openedAt: null, clickedAt: null, repliedAt: null,
        test: false, threadId: id, parentId: id, link: null,
        replyText: 'Thanks - looking into this now. Can we hop on a quick call?',
      });
    }
  });
  return log;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...freshState(), ...parsed, prefs: { ...freshPrefs(), ...(parsed.prefs || {}), domains: { ...freshPrefs().domains, ...(parsed.prefs?.domains || {}) }, digests: { ...freshPrefs().digests, ...(parsed.prefs?.digests || {}) } } };
    }
  } catch {}
  const seed = { ...freshState(), log: seedLog(), seeded: true };
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

let state = load();
const subs = new Set();
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

// ---- selectors ----
export function getLog() { return state.log; }
export function getPrefs() { return state.prefs; }
export function getConnections() { return state.connections; }

// ---- writers ----
export function updatePrefs(patch) { commit({ ...state, prefs: { ...state.prefs, ...patch } }); }
export function setDomainRouting(domainId, on) {
  commit({ ...state, prefs: { ...state.prefs, domains: { ...state.prefs.domains, [domainId]: !!on } } });
}
export function setDigest(key, on) {
  commit({ ...state, prefs: { ...state.prefs, digests: { ...state.prefs.digests, [key]: !!on } } });
}
export function clearLog() { commit({ ...state, log: [] }); }

function inQuietHours(prefs) {
  if (!prefs.quietHours?.enabled) return false;
  const h = new Date().getHours();
  const { start, end } = prefs.quietHours;
  return start > end ? (h >= start || h < end) : (h >= start && h < end);
}

// The emit layer: decide -> render -> log (-> send when live).
export function emitEmail(eventKey, tokens = {}, opts = {}) {
  const e = eventByKey(eventKey);
  if (!e) return null;
  const prefs = state.prefs;
  const domainOn = prefs.domains[e.domain] !== false;
  const isCritical = e.severity === 'critical';
  const quiet = inQuietHours(prefs) && !(isCritical && prefs.criticalBypassQuiet);
  const { subject, html } = renderEmailHtml(eventKey, tokens);
  const to = opts.to || [prefs.executives?.[0] || 'nate@amptekgrowth.com'];
  let status = 'sent';
  if (!domainOn) status = 'suppressed';
  else if (quiet) status = 'batched'; // held for the next digest window
  const id = newId('em');
  const entry = {
    id, eventKey, domain: e.domain, severity: e.severity, to, subject,
    status, at: new Date().toISOString(), openedAt: null, clickedAt: null, repliedAt: null,
    test: !!opts.test, threadId: id, parentId: null, link: opts.link || null,
  };
  commit({ ...state, log: [entry, ...state.log].slice(0, 500) });
  // Fire-and-forget live send (hardened Resend layer). Never blocks the UI.
  if (status === 'sent' && typeof fetch === 'function') {
    try {
      fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey, to, subject, html, category: `system-${e.domain}`, idempotencyKey: id }),
      }).catch(() => {});
    } catch {}
  }
  return entry;
}

// Send a preview/test of any catalog template to the owner.
export function sendTest(eventKey, to) {
  return emitEmail(eventKey, {}, { to: to ? [to] : undefined, test: true });
}

// Connect an email to a record (deal/contact/etc) - the "connect things" ask.
export function connectRecord(emailId, link) {
  commit({ ...state, log: state.log.map(x => x.id === emailId ? { ...x, link } : x) });
}

// ---- stats ----
export function stats() {
  const real = state.log.filter(x => x.status !== 'reply');
  const sent = real.filter(x => ['sent', 'opened', 'clicked', 'replied'].includes(x.status)).length;
  const opened = real.filter(x => ['opened', 'clicked', 'replied'].includes(x.status)).length;
  const replied = real.filter(x => x.status === 'replied').length;
  const problems = real.filter(x => ['bounced', 'suppressed', 'batched'].includes(x.status)).length;
  return {
    total: real.length, sent, opened, replied, problems,
    openRate: sent ? Math.round((opened / sent) * 100) : 0,
    replyRate: sent ? Math.round((replied / sent) * 100) : 0,
    templates: EVENTS.length,
  };
}

// ---- hook ----
export function useEmailCenter(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => { const fn = (s) => setSnap(selector(s)); subs.add(fn); fn(state); return () => subs.delete(fn); }, []); // eslint-disable-line
  return snap;
}
