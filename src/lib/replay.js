// ============================================================
// ARDOVO REPLAY & COACH  (local-first self-improvement engine)
//
// Quietly records YOUR OWN usage of Ardovo, then reviews it and coaches
// you to work faster. The whole thing is privacy-safe and client-only:
//   - We record ROUTE VISITS (which feature you were on) and DWELL TIME.
//   - We record optional coarse ACTION MARKERS other code can emit via a
//     window event ('ardova:track', { kind, label }).
//   - We NEVER record keystrokes, form values, record contents, names,
//     emails, or any PII. Only the path already in your address bar plus
//     labels you explicitly choose to emit.
//
// Everything lives in localStorage as a rolling log capped at ~500 events,
// so it survives reloads but never grows without bound. A single on/off
// toggle (default ON, one click to disable) gates all capture; when off,
// nothing is written.
//
// Same pub/sub shape as store.js / recent-pages.js (a subs Set + notify),
// so the Replay page re-renders live as you move around the product.
//
// Capture self-initializes on first import (browser only, idempotent). App.jsx
// imports this module globally, so capture is app-wide from load: every
// navigation in the session is recorded via popstate, the custom
// 'ardova:navigate' event, and a lightweight interval fallback that catches
// React Router pushState navigations (which do not fire popstate). The single
// on/off toggle gates ALL writes, so pausing truly records nothing.
//
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';
import { MODULES } from './modules.js';

/* ---------- storage keys ---------- */
const LOG_KEY = 'rally_replay_log_v1';
const ENABLED_KEY = 'rally_replay_enabled_v1';
const CAP = 500;               // rolling log ceiling (oldest events drop off)
const POLL_MS = 1200;          // interval fallback cadence for pushState nav
const MIN_DWELL_MS = 400;      // ignore sub-half-second flickers between routes

/* ============================================================
   FEATURE CATALOG
   A curated map of the routes worth coaching on, each with a short,
   human "why it helps" hint used in the coaching cards. This is the set
   used for "features touched vs never touched" and for deep links. We also
   fold in the full MODULES registry (read-only import) so the coverage
   percentage reflects the whole product, not just the curated shortlist.
   ============================================================ */
export const FEATURES = [
  // Core spine
  { key: 'command',      route: '/app',          label: 'Command Center', group: 'Core',         hint: 'Your daily launch pad with pipeline, tasks, and signals in one glance.' },
  { key: 'deals',        route: '/deals',        label: 'Deals',          group: 'Core',         hint: 'The pipeline board where every open opportunity lives.' },
  { key: 'contacts',     route: '/contacts',     label: 'Contacts',       group: 'Core',         hint: 'Every person you work with, enriched and searchable.' },
  { key: 'companies',    route: '/companies',    label: 'Companies',      group: 'Core',         hint: 'The accounts behind your deals and contacts.' },
  { key: 'activities',   route: '/activities',   label: 'My Day',         group: 'Core',         hint: 'Your calls, tasks, and meetings for today in one queue.' },
  { key: 'settings',     route: '/settings',     label: 'Settings',       group: 'Core',         hint: 'Preferences, modules, and workspace configuration.' },
  // Marquee intelligence
  { key: 'intelligence', route: '/intelligence', label: 'Intelligence',   group: 'Intelligence', marquee: true, hint: 'It flags at-risk deals and tells you which ones need a nudge before they slip.' },
  { key: 'forecasting',  route: '/forecasting',  label: 'Forecasting',    group: 'Intelligence', hint: 'It rolls your open pipeline into a weighted forecast so the quarter is one glance.' },
  { key: 'signals',      route: '/signals',      label: 'Signals',        group: 'Intelligence', hint: 'Predictive churn, expansion, and intent signals on your book.' },
  { key: 'twin',         route: '/twin',         label: 'Revenue Twin',   group: 'Intelligence', marquee: true, hint: 'A Monte Carlo digital twin that stress-tests your number thousands of ways.' },
  { key: 'attribution',  route: '/attribution',  label: 'Attribution',    group: 'Intelligence', hint: 'It shows which campaigns actually produced revenue, not just opens.' },
  { key: 'warroom',      route: '/warroom',      label: 'War Room',       group: 'Sell',         hint: 'A live war room for your biggest deals with the buying committee and a close plan.' },
  { key: 'boardroom',    route: '/boardroom',    label: 'The Boardroom',  group: 'Intelligence', marquee: true, hint: 'Your AI board of advisors pressure-tests the pipeline and your strategy.' },
  { key: 'handshake',    route: '/handshake',    label: 'Handshake',      group: 'Sell',         marquee: true, hint: 'It warms up intros through your network so cold outreach becomes a referral.' },
  { key: 'autopilot',    route: '/autopilot',    label: 'Autopilot',      group: 'Automate',     marquee: true, hint: 'An autonomous SDR that runs your repetitive follow-ups so My Day gets shorter.' },
  { key: 'campaigns',    route: '/campaigns',    label: 'Campaigns',      group: 'Marketing',    hint: 'Send and measure marketing campaigns to your audiences.' },
  { key: 'reports',      route: '/reports',      label: 'Reports',        group: 'Intelligence', hint: 'Build any report or dashboard from your live data.' },
  { key: 'canvas',       route: '/canvas',       label: 'Ask Canvas',     group: 'Intelligence', hint: 'Ask a question in plain language and get a generated analytics view.' },
];

// Fast lookups.
const FEATURE_BY_KEY = new Map(FEATURES.map(f => [f.key, f]));
// Longest-route-prefix first so /deals/123 resolves to Deals, not a shorter match.
const ROUTE_INDEX = [...FEATURES]
  .concat(MODULES.map(m => ({ key: 'mod:' + m.key, route: m.route, label: m.label, group: m.section, hint: m.desc })))
  .sort((a, b) => b.route.length - a.route.length);

// Total distinct product surfaces for coverage math (curated + all modules,
// de-duped by route).
const ALL_ROUTES = new Set([...FEATURES.map(f => f.route), ...MODULES.map(m => m.route)]);
export const TOTAL_SURFACES = ALL_ROUTES.size;

/* Map a raw pathname to a catalog feature (or a synthesized entry for
   uncatalogued product routes). Query strings and hashes are stripped, so
   nothing sensitive that a page might place in the URL is ever stored. */
export function featureForPath(path) {
  const clean = String(path || '/').split('?')[0].split('#')[0] || '/';
  const hit = ROUTE_INDEX.find(f => clean === f.route || clean.startsWith(f.route + '/'));
  if (hit) return { key: hit.key, route: hit.route, label: hit.label, group: hit.group, hint: hit.hint };
  // Uncatalogued: derive a friendly label from the first path segment.
  const seg = clean.split('/').filter(Boolean)[0] || 'app';
  const label = seg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { key: 'path:' + seg, route: '/' + seg, label, group: 'Other', hint: '' };
}

/* ============================================================
   PUB/SUB + PERSISTENCE
   ============================================================ */
const subs = new Set();
function notify() { subs.forEach(fn => { try { fn(); } catch {} }); }

function readLog() {
  try { const v = JSON.parse(localStorage.getItem(LOG_KEY)); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function readEnabled() {
  try { const v = localStorage.getItem(ENABLED_KEY); return v === null ? true : v === '1'; }
  catch { return true; }
}

let log = readLog();
let enabled = readEnabled();

function persistLog() { try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch {} }

/* ---------- reads ---------- */
export const getEvents = () => log;
export const isReplayEnabled = () => enabled;

/* ---------- writes ---------- */
export function setReplayEnabled(on) {
  enabled = !!on;
  try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0'); } catch {}
  notify();
}

export function clearReplay() {
  log = [];
  persistLog();
  lastPath = null; // let the next tick re-record where you are now
  notify();
}

function pushEvent(ev) {
  if (!enabled) return;
  log = [...log, ev].slice(-CAP);
  persistLog();
  notify();
}

/* Record a route visit. De-duped against the last recorded path and guarded
   by a minimum dwell so rapid redirects do not spam the log. When capture is
   paused this is a hard no-op: it must never mutate the log (not even the
   redirect-trim below), so "Pause" truly stops all writes. */
function recordRoute(rawPath) {
  if (!enabled) return;
  const clean = String(rawPath || '/').split('?')[0].split('#')[0] || '/';
  const last = log[log.length - 1];
  if (last && last.type === 'route' && last.path === clean) return;
  // If the previous route was entered less than MIN_DWELL_MS ago, treat this
  // as a redirect and replace it rather than stacking a near-zero segment.
  const f = featureForPath(clean);
  const now = Date.now();
  if (last && last.type === 'route' && now - last.t < MIN_DWELL_MS) {
    log = log.slice(0, -1);
  }
  pushEvent({ t: now, type: 'route', path: clean, feature: f.key, label: f.label });
}

/* Public: emit a coarse action marker. Other code can call this directly or
   dispatch window 'ardova:track' with detail { kind, label }. NO PII: pass a
   short kind ('create', 'export', 'search', ...) and a human label only. */
export function trackAction(kind, label) {
  if (!enabled) return;
  const k = String(kind || 'action').slice(0, 40);
  const l = String(label || '').slice(0, 80);
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const f = featureForPath(path);
  pushEvent({ t: Date.now(), type: 'action', kind: k, label: l, path: f.route, feature: f.key });
}

/* ============================================================
   CAPTURE (self-initializing, idempotent, lightweight)
   ============================================================ */
let started = false;
let lastPath = null;
let pollTimer = null;

function tick() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path !== lastPath) {
    lastPath = path;
    recordRoute(path);
  }
}

export function startReplayCapture() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Record wherever we are right now.
  lastPath = window.location.pathname;
  recordRoute(lastPath);

  // Back / forward buttons.
  window.addEventListener('popstate', tick);
  // Custom navigation event other code may dispatch on client-side nav.
  window.addEventListener('ardova:navigate', tick);
  // Coarse action markers.
  window.addEventListener('ardova:track', (e) => {
    const d = (e && e.detail) || {};
    trackAction(d.kind, d.label);
  });
  // Safety net for pushState navigations (Link clicks) that fire no event.
  // A single low-frequency interval; negligible cost, no layout work.
  pollTimer = window.setInterval(tick, POLL_MS);
}

/* ============================================================
   HEURISTICS
   Deterministic analysis of the rolling log. Works with zero API keys.
   ============================================================ */

// "Companion" relationships: if you spent real time in A but never opened B,
// B is probably the thing that would have made A faster or smarter.
const COMPANIONS = [
  { from: 'deals',      to: 'intelligence', minMs: 45000 },
  { from: 'deals',      to: 'forecasting',  minMs: 90000 },
  { from: 'deals',      to: 'warroom',      minMs: 120000 },
  { from: 'contacts',   to: 'handshake',    minMs: 45000 },
  { from: 'companies',  to: 'handshake',    minMs: 45000 },
  { from: 'campaigns',  to: 'attribution',  minMs: 45000 },
  { from: 'activities', to: 'autopilot',    minMs: 60000 },
  { from: 'reports',    to: 'canvas',       minMs: 45000 },
];

// Marquee features we most want people to discover.
const MARQUEE_KEYS = FEATURES.filter(f => f.marquee).map(f => f.key);

function fmtMin(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + ' sec';
  const min = Math.round(sec / 60);
  return min + ' min';
}

/* Build the ordered session timeline from the raw log. Each route event
   becomes a "stop" whose dwell runs until the next route event (or now for
   the final, current stop). Actions are bucketed into the stop they happened
   in. */
export function buildTimeline(events, now = Date.now()) {
  const stops = [];
  const routeEvents = events.filter(e => e.type === 'route');
  for (let i = 0; i < routeEvents.length; i++) {
    const ev = routeEvents[i];
    const next = routeEvents[i + 1];
    const end = next ? next.t : now;
    const dwellMs = Math.max(0, end - ev.t);
    stops.push({
      feature: ev.feature,
      label: ev.label,
      route: ev.path,
      enterT: ev.t,
      dwellMs,
      isCurrent: !next,
      actions: [],
    });
  }
  // Attach actions to the stop whose window contains them.
  for (const a of events.filter(e => e.type === 'action')) {
    let target = null;
    for (const s of stops) {
      const end = s.enterT + s.dwellMs;
      if (a.t >= s.enterT && a.t <= end + 1) target = s;
    }
    if (target) target.actions.push({ kind: a.kind, label: a.label, t: a.t });
  }
  return stops;
}

/* The full analysis object the page renders. Pure function of the log. */
export function analyzeSession(events = getEvents(), now = Date.now()) {
  const timeline = buildTimeline(events, now);
  const routeCount = events.filter(e => e.type === 'route').length;
  const actionCount = events.filter(e => e.type === 'action').length;

  // Aggregate dwell + visits per feature key.
  const agg = new Map();
  for (const s of timeline) {
    const cur = agg.get(s.feature) || { key: s.feature, label: s.label, route: s.route, dwellMs: 0, visits: 0 };
    cur.dwellMs += s.dwellMs;
    cur.visits += 1;
    agg.set(s.feature, cur);
  }
  const featuresUsed = [...agg.values()];
  const totalMs = timeline.reduce((sum, s) => sum + s.dwellMs, 0);

  // Coverage across the curated catalog (touched vs never touched).
  const touchedKeys = new Set(featuresUsed.map(f => f.key));
  const touched = FEATURES.filter(f => touchedKeys.has(f.key));
  const untouched = FEATURES.filter(f => !touchedKeys.has(f.key));

  // Broader coverage across all product surfaces (for the headline stat).
  const touchedRoutes = new Set(timeline.map(s => s.route));
  const surfacesTouched = [...touchedRoutes].filter(r => ALL_ROUTES.has(r)).length;

  const slowest = [...featuresUsed].sort((a, b) => b.dwellMs - a.dwellMs);
  const mostRevisited = [...featuresUsed].filter(f => f.visits >= 3).sort((a, b) => b.visits - a.visits);

  // Bounce detection: quick in-and-out stops (under 4s), excluding the current.
  const bounces = timeline.filter(s => !s.isCurrent && s.dwellMs > 0 && s.dwellMs < 4000).length;

  // A session is real if you visited two or more routes, fired any action, OR
  // sat on a single route long enough to coach on. The last clause keeps one
  // long focused stint (which records just one route event) from being hidden
  // behind the empty state.
  const hasSession = routeCount >= 2 || actionCount >= 1 || (routeCount >= 1 && totalMs >= 15000);

  const analysis = {
    hasSession,
    now,
    totalMs,
    routeCount,
    actionCount,
    timeline,
    featuresUsed,
    touched,
    untouched,
    slowest,
    mostRevisited,
    bounces,
    coverage: { touched: surfacesTouched, total: TOTAL_SURFACES },
  };
  analysis.cards = buildCards(analysis);
  return analysis;
}

/* Turn the analysis into personal, kind, actionable coaching cards. Every
   card carries a deep link to the feature it is about. */
export function buildCards(a) {
  const cards = [];
  const byKey = new Map(a.featuresUsed.map(f => [f.key, f]));
  const touchedKeys = new Set(a.featuresUsed.map(f => f.key));
  const feat = (k) => FEATURE_BY_KEY.get(k);

  // 1. Companion nudges: time spent in A, never opened B.
  for (const c of COMPANIONS) {
    const used = byKey.get(c.from);
    if (!used || used.dwellMs < c.minMs) continue;
    if (touchedKeys.has(c.to)) continue;
    const from = feat(c.from), to = feat(c.to);
    if (!from || !to) continue;
    cards.push({
      id: `companion-${c.from}-${c.to}`,
      tone: 'accent',
      icon: 'sparkles',
      title: `You spent ${fmtMin(used.dwellMs)} in ${from.label} but have not opened ${to.label} yet`,
      body: `${to.hint} Give it a look next time you are working ${from.label}.`,
      cta: { label: `Open ${to.label}`, to: to.route },
    });
    if (cards.length >= 2) break; // keep companion nudges from crowding out the rest
  }

  // 2. Revisit pattern: pin frequently revisited features.
  const topRevisit = a.mostRevisited[0];
  if (topRevisit) {
    cards.push({
      id: `revisit-${topRevisit.key}`,
      tone: 'info',
      icon: 'pin',
      title: `You came back to ${topRevisit.label} ${topRevisit.visits} times this session`,
      body: `If you live here, pin it with the recents dock in the bottom left so ${topRevisit.label} is always one click away.`,
      cta: { label: `Go to ${topRevisit.label}`, to: topRevisit.route },
    });
  }

  // 3. Slowest path: the feature that ate the most time.
  const slow = a.slowest[0];
  if (slow && slow.dwellMs >= 90000) {
    cards.push({
      id: `slowest-${slow.key}`,
      tone: 'warn',
      icon: 'clock',
      title: `${slow.label} was your slowest stop at ${fmtMin(slow.dwellMs)}`,
      body: `That is a lot of hunting. Ask Rook for what you need in a sentence, or hit Command K to jump straight to a record instead of scanning.`,
      cta: { label: `Back to ${slow.label}`, to: slow.route },
    });
  }

  // 4. Marquee discovery: features you have not tried yet.
  const untriedMarquee = MARQUEE_KEYS.map(feat).filter(f => f && !touchedKeys.has(f.key));
  if (untriedMarquee.length) {
    const names = untriedMarquee.slice(0, 2).map(f => f.label);
    const nameStr = names.length === 2 ? `${names[0]} or ${names[1]}` : names[0];
    const lead = untriedMarquee[0];
    cards.push({
      id: 'marquee-untried',
      tone: 'accent',
      icon: 'rocket',
      title: `You have not tried ${nameStr} yet`,
      body: `${lead.hint} It is one of the reasons teams move to Ardovo. Worth five minutes.`,
      cta: { label: `Try ${lead.label}`, to: lead.route },
    });
  }

  // 5. Bounce pattern: lots of quick in-and-outs.
  if (a.bounces >= 4) {
    cards.push({
      id: 'bounce',
      tone: 'info',
      icon: 'search',
      title: `You moved fast through ${a.bounces} screens`,
      body: `If you were hunting for something specific, Command K search jumps straight there without the clicking around.`,
      cta: { label: 'Open Command Center', to: '/app' },
    });
  }

  // 6. Positive reinforcement so the coaching stays kind, not naggy.
  if (a.coverage.touched >= 6) {
    cards.push({
      id: 'praise-explorer',
      tone: 'ok',
      icon: 'check',
      title: `Nice range: you touched ${a.coverage.touched} different surfaces`,
      body: `You are using Ardovo like a power user. Pin your top three in the recents dock and you will move even faster.`,
      cta: { label: 'Review your day', to: '/activities' },
    });
  } else if (a.hasSession) {
    // Gentle encouragement for a narrow session.
    const suggest = a.untouched.find(f => f.marquee) || a.untouched[0];
    if (suggest) {
      cards.push({
        id: 'encourage-explore',
        tone: 'ok',
        icon: 'radar',
        title: `You have been focused on a few screens`,
        body: `That is fine. When you have a minute, ${suggest.label} is worth a look: ${suggest.hint}`,
        cta: { label: `Peek at ${suggest.label}`, to: suggest.route },
      });
    }
  }

  return cards;
}

/* ============================================================
   REACT HOOK  (same pattern as store.js useStore)
   ============================================================ */
export function useReplay() {
  const [snap, setSnap] = useState(() => ({ events: log, enabled }));
  useEffect(() => {
    const fn = () => setSnap({ events: log, enabled });
    subs.add(fn);
    fn();
    return () => subs.delete(fn);
  }, []);
  return snap;
}

/* ---------- kick off capture on import (browser only) ---------- */
if (typeof window !== 'undefined') {
  // Defer one tick so we do not interfere with initial hydration.
  setTimeout(startReplayCapture, 0);
}

export { CAP, POLL_MS };
