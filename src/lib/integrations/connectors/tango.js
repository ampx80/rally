// ============================================================
// ARDOVO x TANGO CONNECTOR  (native scheduling connector)
// The first concrete connector built on the integration backbone
// (connector.js / registry.js / connections.js / resolve-link.js).
// Tango is Nate's scheduling app (the Calendly killer). This connector
// surfaces BOOKED MEETINGS from Tango as Ardovo activities of type
// `meeting`, stamped with provenance (source:'tango' + a deep link back
// into Tango) so they land on the right contact / company / deal timeline
// with a "via Tango" chip. It also exposes upcoming availability so a rep
// can hand a guest the next open times without leaving Ardovo.
//
// LOCAL-FIRST + GRACEFUL:
//   - connect() records a local connection and hands back a deep link into
//     Tango's authorize screen. It best-effort pings the server bridge
//     (api/connect/tango.js) which is ENV-GATED: when TANGO_API_KEY is not
//     set the bridge returns configured:false and the connector quietly
//     runs in DEMO mode (deterministic seeded meetings) so it always demos.
//   - sync() pulls booked meetings (live via the bridge when configured,
//     else the deterministic demo set derived from real Ardovo contacts),
//     resolves each to a Ardovo record via resolve-link, and writes a
//     de-duplicated activity. Nothing inbound is lost: an unmatched guest
//     parks in the Unlinked tray.
//
// The demo generator is DETERMINISTIC (seeded by contact email) so the same
// contact always shows the same meetings across the panel, the page, and a
// re-run of sync (which is how de-dup by externalId stays stable).
//
// SUPABASE: sync() becomes a pull from tango_bookings via the bridge; the
// written rows are ordinary rally_activities carrying source/external_id.
// ============================================================
import { Connector } from '../connector.js';
import { getConnection } from '../connections.js';
import { resolve as resolveIdentity, addUnlinked } from '../resolve-link.js';
import { getContacts, getContactsForCompany, getActivities, createActivity } from '../../store.js';

export const TANGO_ID = 'tango';
const DEFAULT_ORIGIN = 'https://tango-theta.vercel.app';

// Local mirror of Tango's marquee event types (id + display + duration).
// Kept in-repo so the connector is self-contained: Tango is a separate app,
// never imported. When the live bridge is wired these are only demo seeds.
const EVENT_TYPES = [
  { id: 'et_intro',    name: 'Intro Call',          duration: 30 },
  { id: 'et_demo',     name: 'Product Demo',        duration: 45 },
  { id: 'et_sales',    name: 'Sales Consultation',  duration: 30 },
  { id: 'et_strategy', name: 'Strategy Session',    duration: 60 },
  { id: 'et_consult',  name: '1:1 Consulting',      duration: 60 },
];
const HOSTS = ['Nate Rivera', 'Sarah Chen', 'Diego Alvarez', 'Priya Nair'];
const LOCATIONS = ['Zoom', 'Google Meet', 'Microsoft Teams'];

/* ---------- deterministic PRNG (mulberry32 over an FNV-1a hash) ---------- */
function hashStr(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngFor(seed) {
  const next = mulberry32(hashStr(seed));
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

/* ---------- time helpers (local, no external tz dep) ---------- */
function dayKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// A business-hour instant `dayOffset` days from now (weekends nudged to a weekday).
function slotTime(dayOffset, rng) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  const wd = d.getDay();
  if (wd === 6) d.setDate(d.getDate() + (dayOffset >= 0 ? 2 : -1));
  else if (wd === 0) d.setDate(d.getDate() + (dayOffset >= 0 ? 1 : -2));
  d.setHours(9 + rng.int(8), rng.chance(0.5) ? 0 : 30, 0, 0);
  return d.getTime();
}
function originOf(url) {
  try { return new URL(url).origin; } catch { return DEFAULT_ORIGIN; }
}

/* ============================================================
   DETERMINISTIC DEMO MEETINGS (shared by the panel + the page)
   Seeded by the guest's email so a record's meetings are stable.
   Meetings are keyed to REAL Ardovo contacts so resolve() always
   matches in demo mode (guestEmail === contact.email).
   ============================================================ */

// Booked meetings for one contact: 0-2 rows, a stable id per (contact,index).
export function meetingsForContact(contact) {
  if (!contact || !contact.email) return [];
  const email = String(contact.email).toLowerCase();
  const rng = rngFor('tango:' + email);
  if (!rng.chance(0.45)) return [];                 // ~45% of contacts have Tango history
  const host = rng.pick(HOSTS);
  const location = rng.pick(LOCATIONS);
  const guestName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
    || contact.name || contact.email;
  const n = rng.chance(0.4) ? 2 : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const et = rng.pick(EVENT_TYPES);
    const upcoming = i === 0 ? rng.chance(0.6) : rng.chance(0.3);
    const dayOffset = upcoming ? (1 + rng.int(13)) : -(1 + rng.int(40));
    const startsAt = slotTime(dayOffset, rng);
    const status = upcoming ? 'confirmed'
      : rng.chance(0.82) ? 'completed'
      : rng.chance(0.6) ? 'cancelled' : 'no_show';
    const id = 'bk_' + hashStr(`${email}#${i}#${et.id}`).toString(36);
    out.push({
      id, eventTypeId: et.id, title: et.name, duration: et.duration,
      startsAt, endsAt: startsAt + et.duration * 60000, status,
      guestEmail: contact.email, guestName, hostName: host, location,
      contactId: contact.id || null, companyId: contact.companyId || null,
    });
  }
  return out.sort((a, b) => a.startsAt - b.startsAt);
}

// Union of the meetings of a company's contacts.
export function meetingsForCompany(company, contacts) {
  const list = Array.isArray(contacts) && contacts.length
    ? contacts
    : (company && company.id ? getContactsForCompany(company.id) : []);
  const out = [];
  for (const c of list) out.push(...meetingsForContact(c));
  return out.sort((a, b) => a.startsAt - b.startsAt);
}

// Convenience dispatch for a record of either type.
export function meetingsForRecord(recordType, record, contacts) {
  if (recordType === 'company') return meetingsForCompany(record, contacts);
  return meetingsForContact(record);
}

// Next open booking slots (host availability), forward-looking from now.
// Deterministic per calendar day so the strip is stable within a day.
export function upcomingAvailability(count = 5) {
  const out = [];
  const now = Date.now();
  for (let day = 1; day < 21 && out.length < count; day++) {
    const d = new Date(now + day * 86400000);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const rng = rngFor('tango-avail:' + dayKey(d));
    const hours = [9, 11, 13, 15, 16].slice().sort(() => rng.next() - 0.5).slice(0, 1 + rng.int(2)).sort((a, b) => a - b);
    for (const h of hours) {
      if (out.length >= count) break;
      const t = new Date(d);
      t.setHours(h, rng.chance(0.5) ? 0 : 30, 0, 0);
      out.push({ startsAt: t.getTime(), duration: 30, label: '30 min' });
    }
  }
  return out;
}

// Split a meeting list into upcoming (confirmed, future) and recent (past).
export function splitMeetings(meetings, now = Date.now()) {
  const upcoming = meetings.filter(m => m.startsAt >= now && m.status === 'confirmed')
    .sort((a, b) => a.startsAt - b.startsAt);
  const recent = meetings.filter(m => m.startsAt < now || m.status !== 'confirmed')
    .sort((a, b) => b.startsAt - a.startsAt);
  return { upcoming, recent };
}

/* ============================================================
   THE CONNECTOR
   ============================================================ */
export class TangoConnector extends Connector {
  constructor() { super(TANGO_ID); }

  /* ---- deep links into Tango ---- */
  workspaceUrl() { return getConnection(this.id)?.metadata?.workspaceUrl || DEFAULT_ORIGIN; }
  origin() { return originOf(this.workspaceUrl()); }
  // Per-booking manage/deep-link page in Tango (public reschedule/cancel view).
  bookingUrl(bookingId) { return `${this.origin()}/m/${encodeURIComponent(bookingId)}`; }
  // Where a rep sends a guest to grab a time.
  bookUrl() { return this.origin() + '/'; }
  // The screen a workspace admin lands on to authorize Ardovo from inside Tango.
  authorizeUrl() { return `${this.origin()}/app/integrations?connect=rally`; }

  /* ---- lifecycle: verify via the (env-gated) bridge, then record locally ---- */
  async connect(metadata = {}) {
    let bridge = { configured: false, live: false };
    try {
      const r = await fetch('/api/connect/tango?action=verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceUrl: metadata.workspaceUrl || null }),
      });
      if (r.ok) bridge = await r.json();
    } catch { /* route absent / offline -> demo mode, still connect locally */ }
    const record = await super.connect(metadata); // secrets stripped inside connections.js
    return { ...record, bridge, deepLink: this.authorizeUrl(), authorizeUrl: this.authorizeUrl() };
  }

  /* ---- pull booked meetings (live bridge when configured, else demo) ---- */
  async fetchMeetings() {
    if (this.isConnected()) {
      try {
        const r = await fetch('/api/connect/tango?action=meetings');
        if (r.ok) {
          const data = await r.json();
          if (data && data.live && Array.isArray(data.meetings) && data.meetings.length) {
            return data.meetings.map(normalizeExternal);
          }
        }
      } catch { /* fall through to deterministic demo */ }
    }
    return this.demoMeetings();
  }

  // Deterministic demo set: every Ardovo contact with Tango history, so a
  // sync lands meetings on real timelines and always resolves cleanly.
  demoMeetings() {
    const out = [];
    for (const c of getContacts()) out.push(...meetingsForContact(c));
    return out;
  }

  /* ---- normalize one external meeting into a Ardovo activity draft ---- */
  mapRecord(m) {
    const cancelled = m.status === 'cancelled' || m.status === 'canceled';
    const noShow = m.status === 'no_show';
    return {
      // meeting.canceled maps to a note (per registry); everything else is a meeting.
      type: cancelled ? 'note' : 'meeting',
      subject: cancelled
        ? `Canceled: ${m.title}`
        : noShow
          ? `No-show: ${m.title}`
          : `${m.title} with ${m.hostName || 'Tango host'}`,
      body: meetingBody(m),
      dueAt: new Date(m.startsAt).toISOString(),
      done: m.status === 'completed',
      ...this.via(m.id, this.bookingUrl(m.id)),
    };
  }

  /* ---- the sync: booked meetings -> resolved, de-duplicated activities ---- */
  async sync() {
    const meetings = await this.fetchMeetings();
    // De-dup against activities we already imported (source + externalId).
    const seen = new Set(
      getActivities().filter(a => a.source === this.id && a.externalId != null).map(a => String(a.externalId))
    );
    let imported = 0, linked = 0, unlinked = 0, skipped = 0;
    for (const m of meetings) {
      if (seen.has(String(m.id))) { skipped++; continue; }
      const who = resolveIdentity({ email: m.guestEmail, name: m.guestName });
      if (who.matched && who.relatedType) {
        const draft = this.mapRecord(m);
        const res = createActivity({
          ...draft,
          relatedType: who.relatedType,
          relatedId: who.relatedId,
          companyId: who.companyId,
        });
        if (res && res.activity) { imported++; linked++; seen.add(String(m.id)); }
      } else {
        addUnlinked({ source: this.id, email: m.guestEmail, name: m.guestName, event: 'meeting.booked', payload: m });
        unlinked++;
      }
    }
    return { imported, linked, unlinked, skipped, total: meetings.length };
  }

  /* ---- inbound webhook: one Tango event -> timeline (or the Unlinked tray) ---- */
  handleWebhook(payload = {}) {
    const event = payload.event || payload.type || 'meeting.booked';
    const b = payload.booking || payload.data || payload;
    const m = normalizeExternal(b);
    const who = resolveIdentity({ email: m.guestEmail, name: m.guestName });
    if (!who.matched || !who.relatedType) {
      return addUnlinked({ source: this.id, email: m.guestEmail, name: m.guestName, event, payload: m });
    }
    const draft = this.mapRecord({ ...m, status: eventToStatus(event, m.status) });
    return createActivity({
      ...draft,
      relatedType: who.relatedType,
      relatedId: who.relatedId,
      companyId: who.companyId,
    });
  }

  /* ---- availability passthrough (for panels/pages) ---- */
  availability(count = 5) { return upcomingAvailability(count); }
}

/* ---------- helpers shared by connector + bridge normalization ---------- */
function meetingBody(m) {
  const when = new Date(m.startsAt).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const bits = [
    `${m.title || 'Meeting'} - ${m.duration || 30} min`,
    m.hostName ? `Host: ${m.hostName}` : null,
    m.guestName ? `Guest: ${m.guestName}` : null,
    m.location ? `Where: ${m.location}` : null,
    `When: ${when}`,
    'Booked via Tango.',
  ].filter(Boolean);
  return bits.join('\n');
}

function eventToStatus(event, fallback) {
  const e = String(event || '');
  if (e.includes('cancel')) return 'cancelled';
  if (e.includes('complete')) return 'completed';
  if (e.includes('reschedul')) return 'confirmed';
  if (e.includes('book')) return 'confirmed';
  return fallback || 'confirmed';
}

// Map a raw external booking (from the live bridge or a webhook) to the
// normalized shape mapRecord() expects. Defensive: fields may be missing.
export function normalizeExternal(b = {}) {
  const guest = b.guest || {};
  const startsAt = typeof b.startsAt === 'number' ? b.startsAt
    : b.startsAt ? new Date(b.startsAt).getTime()
    : b.start ? new Date(b.start).getTime()
    : Date.now();
  const duration = b.duration || (b.endsAt && startsAt ? Math.round((new Date(b.endsAt).getTime() - startsAt) / 60000) : 30);
  return {
    id: b.id || b.bookingId || 'bk_' + hashStr(JSON.stringify(b)).toString(36),
    eventTypeId: b.eventTypeId || null,
    title: b.title || b.eventTypeName || 'Meeting',
    duration,
    startsAt,
    endsAt: b.endsAt ? new Date(b.endsAt).getTime() : startsAt + duration * 60000,
    status: b.status || 'confirmed',
    guestEmail: b.guestEmail || guest.email || null,
    guestName: b.guestName || guest.name || null,
    hostName: b.hostName || b.host || null,
    location: typeof b.location === 'string' ? b.location : (b.location?.type || null),
  };
}

/* ---------- singleton accessor ---------- */
let _singleton = null;
export function getTangoConnector() {
  if (!_singleton) _singleton = new TangoConnector();
  return _singleton;
}
