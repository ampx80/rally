// ============================================================
// ARDOVO MEETINGS SCHEDULER  (native in-app Calendly)
// A HubSpot Sales Hub gap Ardovo closes natively: booking types
// (duration, buffers, weekly availability windows, round-robin
// across owners), a public booking page, and deterministic slot
// generation. Booking a meeting writes a REAL activity of type
// 'meeting' through store.createActivity so it lands on the record
// timeline + My Day queue like every other touch.
//
// Same local-first, deterministic-seed, pub/sub pattern as the rest
// of the store (rally_scheduler_v1). The booking TYPES + booked
// MEETINGS live here; the meeting activity lives in the core store.
// SUPABASE: rally_booking_types, rally_booked_meetings (FK typeId).
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { useSyncExternalStore } from 'react';
import {
  getUsers, getUser, userName, getCurrentUser,
  getContacts, getContact, getCompany,
  createActivity, deleteActivity,
} from './store.js';

const LS_KEY = 'rally_scheduler_v1';

/* ---------- deterministic PRNG ---------- */
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
export const WEEKDAYS = [
  { dow: 0, key: 'sun', short: 'Sun', label: 'Sunday' },
  { dow: 1, key: 'mon', short: 'Mon', label: 'Monday' },
  { dow: 2, key: 'tue', short: 'Tue', label: 'Tuesday' },
  { dow: 3, key: 'wed', short: 'Wed', label: 'Wednesday' },
  { dow: 4, key: 'thu', short: 'Thu', label: 'Thursday' },
  { dow: 5, key: 'fri', short: 'Fri', label: 'Friday' },
  { dow: 6, key: 'sat', short: 'Sat', label: 'Saturday' },
];

export const LOCATION_META = {
  video: { label: 'Video call', blurb: 'A video link is sent on confirmation.', icon: 'activity' },
  phone: { label: 'Phone call', blurb: 'We call the number you provide.', icon: 'phone' },
  'in-person': { label: 'In person', blurb: 'Meet at the location below.', icon: 'building' },
};

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];

// A weekday-keyed availability map: { 1: [{start,end}], ... }. Mon-Fri 9-5 default.
export function defaultAvailability() {
  const a = {};
  for (const d of WEEKDAYS) a[d.dow] = (d.dow >= 1 && d.dow <= 5) ? [{ start: '09:00', end: '17:00' }] : [];
  return a;
}

/* ---------- id + time helpers ---------- */
let idc = Date.now();
const nid = (p) => `${p}_${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

export function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'meeting';
}
function uniqueSlug(base, taken) {
  let slug = slugify(base); let n = 2;
  while (taken.has(slug)) { slug = `${slugify(base)}-${n++}`; }
  return slug;
}
function parseHM(hm) {
  const [h, m] = String(hm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function atLocalMinutes(year, month, day, minutes) {
  const d = new Date(year, month, day, 0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}
const DAY_MS = 86400000;

/* ============================================================
   SEED  (2-3 booking types + a believable book of upcoming
   meetings so the page + every public link demo alive)
   ============================================================ */
function buildSeed() {
  const rnd = mulberry32(20260712);
  const users = getUsers() || [];
  const reps = users.filter(u => u.role === 'rep');
  const pool = (reps.length ? reps : users).map(u => u.id);
  const primary = pool[0] || 'u_1';
  const two = pool.slice(0, 2);
  const three = pool.slice(0, 3);

  const taken = new Set();
  const mkType = (name, description, durationMin, ownerIds, extra = {}) => {
    const slug = uniqueSlug(name, taken); taken.add(slug);
    return {
      id: nid('bt'), slug, name, description,
      durationMin,
      bufferBeforeMin: extra.bufferBeforeMin ?? 0,
      bufferAfterMin: extra.bufferAfterMin ?? 10,
      ownerIds: ownerIds.length ? ownerIds : [primary],
      location: extra.location || 'video',
      locationDetail: extra.locationDetail || '',
      color: extra.color || '#5b4bf5',
      minNoticeHours: extra.minNoticeHours ?? 4,
      maxDaysOut: extra.maxDaysOut ?? 21,
      availability: extra.availability || defaultAvailability(),
      active: true,
      rrIndex: 0,
      createdAt: nowISO(),
    };
  };

  const types = [
    mkType('Intro call', 'A quick 15 minute intro to see if Ardovo is a fit for your revenue team.', 15, [primary], { bufferAfterMin: 5, color: '#5b4bf5' }),
    mkType('Product demo', 'A guided 30 minute walkthrough of Ardovo with a solutions expert. Bring your questions.', 30, three, { bufferAfterMin: 10, color: '#0ea5a3' }),
    mkType('Strategy session', 'A 45 minute working session to map Ardovo to your pipeline and rollout plan.', 45, two, { bufferBeforeMin: 5, bufferAfterMin: 15, color: '#a855f7', minNoticeHours: 24 }),
  ];

  // A handful of already-booked meetings across the next two weeks so the
  // owner calendar reads full. Display-only historical seed (no activity is
  // created for seeds; only live bookMeeting() writes a store activity).
  const contacts = (getContacts() || []).filter(c => c.email);
  const meetings = [];
  const firstNames = ['Ava', 'Marcus', 'Priya', 'Diego', 'Lena', 'Omar', 'Sofia', 'Ethan', 'Naomi', 'Ivan'];
  const lastNames = ['Whitfield', 'Barros', 'Nomura', 'Feldman', 'Ortega', 'Sattar', 'Klein', 'Duval', 'Okonkwo', 'Reyes'];
  for (let i = 0; i < 7; i++) {
    const type = types[Math.floor(rnd() * types.length)];
    const ownerId = type.ownerIds[Math.floor(rnd() * type.ownerIds.length)];
    const dayOffset = 1 + Math.floor(rnd() * 12);
    const hour = 9 + Math.floor(rnd() * 7);
    const base = new Date();
    const s = atLocalMinutes(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour * 60);
    const e = new Date(s.getTime() + type.durationMin * 60000);
    const contact = contacts.length && rnd() < 0.6 ? contacts[Math.floor(rnd() * contacts.length)] : null;
    const guestName = contact ? `${contact.firstName} ${contact.lastName}` : `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const guestEmail = contact ? contact.email : `${guestName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
    meetings.push({
      id: nid('bm'), typeId: type.id, ownerId,
      startAt: s.toISOString(), endAt: e.toISOString(),
      guestName, guestEmail, guestNotes: '',
      contactId: contact ? contact.id : null,
      companyId: contact ? (contact.companyId || null) : null,
      activityId: null, status: 'confirmed', createdAt: nowISO(), seeded: true,
    });
  }
  meetings.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  return { types, meetings };
}

/* ============================================================
   STORE  (load / commit / subscribe)
   ============================================================ */
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.types)) return p; } } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetSchedulerStore() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
export function subscribeScheduler(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useScheduler() { return useSyncExternalStore(subscribeScheduler, () => state, () => state); }
export function getSchedulerState() { return state; }

/* ============================================================
   READ API
   ============================================================ */
export const getBookingTypes = () => state.types;                            // SUPABASE: from('rally_booking_types').select()
export const getActiveBookingTypes = () => state.types.filter(t => t.active);
export const bookingTypeById = (id) => state.types.find(t => t.id === id);
export const bookingTypeBySlug = (slug) => state.types.find(t => t.slug === slug && t.active) || state.types.find(t => t.slug === slug);
export const getMeetings = () => state.meetings;                             // SUPABASE: from('rally_booked_meetings').select()
export const meetingsForType = (typeId) => state.meetings.filter(m => m.typeId === typeId);
export const activeMeetings = () => state.meetings.filter(m => m.status === 'confirmed');

export function upcomingMeetings(limit = 0) {
  const now = Date.now();
  const list = activeMeetings()
    .filter(m => new Date(m.startAt).getTime() >= now - 60 * 60000)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  return limit ? list.slice(0, limit) : list;
}

export function typeOwners(type) {
  return (type?.ownerIds || []).map(id => getUser(id)).filter(Boolean);
}

// Public share link for a booking type. origin defaults to the live location.
function safeOrigin(origin) {
  if (origin) return String(origin).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location) return window.location.origin;
  return 'https://ardovo.com';
}
export function schedulerLink(type, origin) {
  if (!type) return '';
  return `${safeOrigin(origin)}/meet/${type.slug}`;
}

/* ============================================================
   SLOT GENERATION  (deterministic, pure over availability +
   existing meetings + the current clock)
   ============================================================ */
// The window an existing meeting occupies, expanded by its type buffers.
function meetingBlock(m) {
  const t = bookingTypeById(m.typeId);
  const before = (t?.bufferBeforeMin || 0) * 60000;
  const after = (t?.bufferAfterMin || 0) * 60000;
  return { start: new Date(m.startAt).getTime() - before, end: new Date(m.endAt).getTime() + after };
}
function ownerBusy(ownerId, startMs, endMs) {
  for (const m of state.meetings) {
    if (m.status !== 'confirmed' || m.ownerId !== ownerId) continue;
    const b = meetingBlock(m);
    if (startMs < b.end && b.start < endMs) return true;
  }
  return false;
}
// A slot is offerable if AT LEAST ONE owner in the pool is free for it.
function firstFreeOwner(type, startMs, endMs, fromIndex = 0) {
  const pool = type.ownerIds || [];
  if (!pool.length) return null;
  for (let i = 0; i < pool.length; i++) {
    const idx = (fromIndex + i) % pool.length;
    const ownerId = pool[idx];
    if (!ownerBusy(ownerId, startMs, endMs)) return { ownerId, idx };
  }
  return null;
}
function slotAvailable(type, startMs, endMs) {
  const before = (type.bufferBeforeMin || 0) * 60000;
  const after = (type.bufferAfterMin || 0) * 60000;
  return !!firstFreeOwner(type, startMs - before, endMs + after, 0);
}

/**
 * Generate available slots for a booking type as a flat, time-sorted array of
 * { startAt, endAt, dayKey, label }. Respects min notice, max days out, the
 * per-weekday windows, duration + after-buffer stepping, and owner collisions.
 */
export function generateSlots(type, opts = {}) {
  if (!type) return [];
  const now = Date.now();
  const earliest = now + (type.minNoticeHours || 0) * 3600000;
  const days = Math.max(1, Math.min(opts.days || type.maxDaysOut || 21, 60));
  const start = opts.from ? new Date(opts.from) : new Date();
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const windows = (type.availability && type.availability[d.getDay()]) || [];
    for (const w of windows) {
      const wStart = parseHM(w.start); const wEnd = parseHM(w.end);
      const step = Math.max(5, (type.durationMin || 30) + (type.bufferAfterMin || 0));
      for (let mnt = wStart; mnt + (type.durationMin || 30) <= wEnd; mnt += step) {
        const s = atLocalMinutes(d.getFullYear(), d.getMonth(), d.getDate(), mnt);
        const e = new Date(s.getTime() + (type.durationMin || 30) * 60000);
        if (s.getTime() < earliest) continue;
        if (!slotAvailable(type, s.getTime(), e.getTime())) continue;
        out.push({
          startAt: s.toISOString(), endAt: e.toISOString(),
          dayKey: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        });
      }
    }
  }
  return out;
}

// Slots grouped by local day, for the public calendar: [{ dayKey, date, slots }]
export function slotsByDay(type, opts = {}) {
  const flat = generateSlots(type, opts);
  const map = new Map();
  for (const s of flat) {
    if (!map.has(s.dayKey)) map.set(s.dayKey, { dayKey: s.dayKey, date: s.startAt, slots: [] });
    map.get(s.dayKey).slots.push(s);
  }
  return Array.from(map.values());
}

// The soonest offerable slot across a set of types (for a headline stat).
export function nextOpenSlot(types = getActiveBookingTypes()) {
  let best = null;
  for (const t of types) {
    const s = generateSlots(t, { days: t.maxDaysOut || 21 })[0];
    if (s && (!best || new Date(s.startAt) < new Date(best.startAt))) best = { ...s, typeId: t.id };
  }
  return best;
}

/* ============================================================
   WRITE API
   ============================================================ */
export function createBookingType(patch = {}) {
  const users = getUsers() || [];
  const fallbackOwner = getCurrentUser()?.id || users[0]?.id;
  const taken = new Set(state.types.map(t => t.slug));
  const name = (patch.name || 'New meeting type').trim();
  const type = {
    id: nid('bt'),
    slug: uniqueSlug(patch.slug || name, taken),
    name,
    description: patch.description || '',
    durationMin: Number(patch.durationMin) || 30,
    bufferBeforeMin: Number(patch.bufferBeforeMin) || 0,
    bufferAfterMin: patch.bufferAfterMin == null ? 10 : Number(patch.bufferAfterMin),
    ownerIds: (patch.ownerIds && patch.ownerIds.length ? patch.ownerIds : [fallbackOwner]).filter(Boolean),
    location: patch.location || 'video',
    locationDetail: patch.locationDetail || '',
    color: patch.color || '#5b4bf5',
    minNoticeHours: patch.minNoticeHours == null ? 4 : Number(patch.minNoticeHours),
    maxDaysOut: patch.maxDaysOut == null ? 21 : Number(patch.maxDaysOut),
    availability: patch.availability || defaultAvailability(),
    active: patch.active !== false,
    rrIndex: 0,
    createdAt: nowISO(),
  };
  commit({ ...state, types: [...state.types, type] });
  return { type };
}

export function updateBookingType(id, patch = {}) {
  const t = bookingTypeById(id);
  if (!t) return { error: 'missing', message: 'Booking type not found.' };
  let slug = t.slug;
  if (patch.slug && patch.slug !== t.slug) {
    const taken = new Set(state.types.filter(x => x.id !== id).map(x => x.slug));
    slug = uniqueSlug(patch.slug, taken);
  }
  const next = { ...t, ...patch, slug, id: t.id, rrIndex: t.rrIndex, createdAt: t.createdAt };
  commit({ ...state, types: state.types.map(x => x.id === id ? next : x) });
  return { type: next };
}

export function toggleBookingType(id) {
  const t = bookingTypeById(id);
  if (!t) return { error: 'missing' };
  return updateBookingType(id, { active: !t.active });
}

// Additive delete (brand-new store). Also cancels the type's future meetings.
export function deleteBookingType(id) {
  const t = bookingTypeById(id);
  if (!t) return { error: 'missing' };
  const now = Date.now();
  for (const m of state.meetings) {
    if (m.typeId === id && m.status === 'confirmed' && new Date(m.startAt).getTime() >= now && m.activityId) {
      try { deleteActivity(m.activityId); } catch {}
    }
  }
  commit({
    ...state,
    types: state.types.filter(x => x.id !== id),
    meetings: state.meetings.map(m => m.typeId === id && new Date(m.startAt).getTime() >= now ? { ...m, status: 'cancelled' } : m),
  });
  return { ok: true, id };
}

/**
 * Book a meeting on a type. Assigns a free owner by round-robin, resolves the
 * guest to an existing contact by email when possible, and writes a REAL
 * activity (type 'meeting') onto the record timeline via store.createActivity.
 */
export function bookMeeting({ typeId, slug, startAt, guestName, guestEmail, guestNotes = '', phone = '' }) {
  const type = typeId ? bookingTypeById(typeId) : bookingTypeBySlug(slug);
  if (!type) return { error: 'type', message: 'That meeting type is no longer available.' };
  if (!startAt) return { error: 'slot', message: 'Pick a time to continue.' };
  const name = String(guestName || '').trim();
  const email = String(guestEmail || '').trim();
  if (!name) return { error: 'name', message: 'Your name is required.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'email', message: 'A valid email is required.' };

  const s = new Date(startAt);
  if (isNaN(s.getTime())) return { error: 'slot', message: 'That time is invalid.' };
  const startMs = s.getTime();
  const endMs = startMs + (type.durationMin || 30) * 60000;
  if (startMs < Date.now()) return { error: 'past', message: 'That time is in the past. Pick another slot.' };

  // Re-check availability + assign an owner via round-robin (skip busy owners).
  const before = (type.bufferBeforeMin || 0) * 60000;
  const after = (type.bufferAfterMin || 0) * 60000;
  const free = firstFreeOwner(type, startMs - before, endMs + after, type.rrIndex || 0);
  if (!free) return { error: 'taken', message: 'That slot was just taken. Pick another time.' };
  const ownerId = free.ownerId;

  // Resolve guest -> existing contact by email so the meeting lands on the
  // right record timeline when we know them.
  const contact = (getContacts() || []).find(c => c.email && c.email.toLowerCase() === email.toLowerCase()) || null;
  const companyId = contact ? (contact.companyId || null) : null;

  const loc = LOCATION_META[type.location]?.label || 'Meeting';
  const subject = `${type.name} with ${name}`;
  const bodyLines = [
    `${loc}, ${type.durationMin} min, booked via Ardovo scheduler.`,
    `Guest: ${name} <${email}>`,
    phone ? `Phone: ${phone}` : '',
    type.location === 'in-person' && type.locationDetail ? `Where: ${type.locationDetail}` : '',
    guestNotes ? `Notes: ${guestNotes}` : '',
  ].filter(Boolean);

  let activityId = null;
  try {
    const res = createActivity({
      type: 'meeting',
      subject,
      body: bodyLines.join('\n'),
      dueAt: s.toISOString(),
      ownerId,
      relatedType: contact ? 'contact' : undefined,
      relatedId: contact ? contact.id : undefined,
      companyId: companyId || undefined,
    });
    activityId = res?.activity?.id || null;
  } catch { /* activity is best-effort; the booking still stands */ }

  const meeting = {
    id: nid('bm'), typeId: type.id, ownerId,
    startAt: s.toISOString(), endAt: new Date(endMs).toISOString(),
    guestName: name, guestEmail: email, guestNotes, phone,
    contactId: contact ? contact.id : null, companyId,
    activityId, status: 'confirmed', createdAt: nowISO(),
  };
  const nextTypes = state.types.map(t => t.id === type.id
    ? { ...t, rrIndex: ((free.idx + 1) % Math.max(1, (t.ownerIds || []).length)) }
    : t);
  commit({ ...state, types: nextTypes, meetings: [meeting, ...state.meetings] });
  return { meeting, owner: getUser(ownerId), type };
}

export function cancelMeeting(id) {
  const m = state.meetings.find(x => x.id === id);
  if (!m) return { error: 'missing' };
  if (m.activityId) { try { deleteActivity(m.activityId); } catch {} }
  commit({ ...state, meetings: state.meetings.map(x => x.id === id ? { ...x, status: 'cancelled' } : x) });
  return { ok: true, id };
}

/* ============================================================
   DISPLAY HELPERS
   ============================================================ */
export function meetingRecordLabel(m) {
  if (m.contactId) {
    const c = getContact(m.contactId);
    if (c) return { name: `${c.firstName} ${c.lastName}`, to: `/contacts/${c.id}` };
  }
  if (m.companyId) {
    const co = getCompany(m.companyId);
    if (co) return { name: co.name, to: `/companies/${co.id}` };
  }
  return { name: m.guestName || m.guestEmail || 'Guest', to: null };
}

export { userName };
