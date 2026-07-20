// ============================================================
// MIGRATION SESSION  -  the live, multi-person migration room.
//
// "Start migration" schedules a session and mints a join link. Everyone who
// opens the link lands on the SAME page at the same time, sees each other, and
// Mira presents the data together with them - like a meeting, but inside
// Ardovo, built around the data instead of a video tile.
//
// SYNC LAYER (graceful, honest):
//   - When Supabase is configured (VITE_SUPABASE_URL + ANON), we use a Realtime
//     channel with presence + broadcast, so people on different devices share
//     the room live.
//   - Otherwise we fall back to a BroadcastChannel, which syncs every tab/window
//     on this machine (great for a demo and for one facilitator driving), plus
//     localStorage so a refresh or late joiner rehydrates the room state.
// The UI does not care which path is active; it just calls the same methods.
//
// Local-first store: rally_migration_sessions_v1. ASCII only. No em-dash.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase, isConfigured } from './supabase-browser.js';
import { buildAgenda } from './migration-agent.js';

const LS_KEY = 'rally_migration_sessions_v1';
const ME_KEY = 'rally_migration_me';

/* ============================================================
   IDENTITY  (who am I in the room)
   ============================================================ */
const ADJ = ['Swift', 'Bright', 'Calm', 'Bold', 'Keen', 'Clear', 'Prime'];
const rid = () => Math.random().toString(36).slice(2, 9);
export function getSelf() {
  try {
    const raw = localStorage.getItem(ME_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.id) return o; }
  } catch {}
  const me = { id: rid(), name: `${ADJ[Math.floor(Math.random() * ADJ.length)]} guest` };
  try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch {}
  return me;
}
export function setSelfName(name) {
  const me = getSelf();
  const next = { ...me, name: String(name || '').trim() || me.name };
  try { localStorage.setItem(ME_KEY, JSON.stringify(next)); } catch {}
  return next;
}

/* ============================================================
   SESSION STORE  (local-first, subscribable)
   ============================================================ */
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o; } } catch {}
  return {};
}
let store = load();
const subs = new Set();
function commit(next) {
  store = next && typeof next === 'object' ? next : {};
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {}
  subs.forEach(fn => { try { fn(store); } catch {} });
}
// Cross-tab store sync so a session created in one tab shows in another.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === LS_KEY) { store = load(); subs.forEach(fn => { try { fn(store); } catch {} }); } });
}

export function listSessions() {
  return Object.values(store).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function getSession(id) { return id ? store[id] || null : null; }

export function createSession({ title, target = 'contact', scheduledAt = null, hostName, files = [] } = {}) {
  const self = getSelf();
  if (hostName) setSelfName(hostName);
  const id = rid() + rid();
  const code = String(Math.floor(1000 + Math.random() * 8999));
  const session = {
    id, code,
    title: String(title || 'Data migration session').trim(),
    target,
    scheduledAt: scheduledAt || null,
    hostId: self.id,
    hostName: (hostName || self.name),
    createdAt: new Date().toISOString(),
    stage: 'lobby',            // lobby -> live -> ended
    cursor: 0,                  // agenda index the presenter is on
    wizardStage: 'upload',      // mirrors the shared data stage
    agenda: buildAgenda(files),
    files: files.map(f => ({ name: f.name, target: f.target, rows: f.rows })),
    messages: [],
    caption: '',                // Mira's current spoken line, mirrored to all
    summary: null,              // shared analysis summary
  };
  commit({ ...store, [id]: session });
  return session;
}
export function updateSession(id, patch) {
  const cur = store[id]; if (!cur) return null;
  const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
  commit({ ...store, [id]: next });
  return next;
}
export function endSession(id) { return updateSession(id, { stage: 'ended' }); }

export function joinLink(id) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/migrate/session/${id}`;
}
export function usesLiveSync() { return isConfigured(); }

/* ============================================================
   SYNC CHANNEL  (Supabase Realtime -> BroadcastChannel fallback)
   Returns: { mode, broadcastState, sendMessage, close }
   Callers get onState / onMessage / onPresence callbacks.
   ============================================================ */
function openChannel(id, self, { onState, onMessage, onPresence } = {}) {
  const sb = getBrowserSupabase();
  // ---- Path A: Supabase Realtime (multi-device) ----
  if (sb) {
    try {
      const channel = sb.channel(`migration:${id}`, { config: { presence: { key: self.id } } });
      channel.on('presence', { event: 'sync' }, () => {
        const st = channel.presenceState();
        const people = [];
        Object.values(st).forEach(arr => arr.forEach(p => people.push({ id: p.id, name: p.name })));
        onPresence?.(dedupe(people));
      });
      channel.on('broadcast', { event: 'state' }, ({ payload }) => onState?.(payload));
      channel.on('broadcast', { event: 'message' }, ({ payload }) => onMessage?.(payload));
      channel.subscribe(async (status) => { if (status === 'SUBSCRIBED') { try { await channel.track({ id: self.id, name: self.name }); } catch {} } });
      return {
        mode: 'live',
        broadcastState: (patch) => { try { channel.send({ type: 'broadcast', event: 'state', payload: patch }); } catch {} },
        sendMessage: (msg) => { try { channel.send({ type: 'broadcast', event: 'message', payload: msg }); } catch {} },
        close: () => { try { sb.removeChannel(channel); } catch {} },
      };
    } catch { /* fall through to local */ }
  }
  // ---- Path B: BroadcastChannel (same-origin multi-tab) ----
  const peers = new Map();
  let bc = null;
  const emit = () => onPresence?.(dedupe([{ id: self.id, name: self.name }, ...[...peers.values()]]));
  const announce = () => { try { bc?.postMessage({ t: 'presence', p: { id: self.id, name: self.name }, at: Date.now() }); } catch {} };
  try {
    bc = new BroadcastChannel(`ardova-migration-${id}`);
    bc.onmessage = (e) => {
      const m = e.data || {};
      if (m.t === 'hello') { announce(); }
      else if (m.t === 'presence') { peers.set(m.p.id, { ...m.p, at: m.at }); emit(); }
      else if (m.t === 'bye') { peers.delete(m.p.id); emit(); }
      else if (m.t === 'state') { onState?.(m.payload); }
      else if (m.t === 'message') { onMessage?.(m.payload); }
    };
    try { bc.postMessage({ t: 'hello' }); } catch {}
    announce(); emit();
  } catch { emit(); }
  const hb = setInterval(announce, 3000);
  const prune = setInterval(() => {
    const now = Date.now(); let changed = false;
    for (const [k, v] of peers) if (now - v.at > 9000) { peers.delete(k); changed = true; }
    if (changed) emit();
  }, 4000);
  const bye = () => { try { bc?.postMessage({ t: 'bye', p: { id: self.id } }); } catch {} };
  if (typeof window !== 'undefined') window.addEventListener('pagehide', bye);
  return {
    mode: 'local',
    broadcastState: (patch) => { try { bc?.postMessage({ t: 'state', payload: patch }); } catch {} },
    sendMessage: (msg) => { try { bc?.postMessage({ t: 'message', payload: msg }); } catch {} },
    close: () => {
      clearInterval(hb); clearInterval(prune); bye();
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', bye);
      try { bc?.close(); } catch {}
    },
  };
}
function dedupe(list) { const m = new Map(); list.forEach(p => p && p.id && m.set(p.id, p)); return [...m.values()]; }

/* ============================================================
   useSession  -  the room's single source of truth for a component.
   Hydrates from the local store, joins the sync channel, mirrors host state to
   everyone, and exposes the actions the room UI needs.
   ============================================================ */
export function useSession(id) {
  const self = getSelf();
  const [session, setSession] = useState(() => getSession(id));
  const [participants, setParticipants] = useState([{ id: self.id, name: self.name }]);
  const chanRef = useRef(null);

  // Local store subscription (so host-side updates and refreshes stay in sync).
  useEffect(() => {
    const fn = () => setSession(getSession(id));
    subs.add(fn); fn();
    return () => subs.delete(fn);
  }, [id]);

  // Sync channel.
  useEffect(() => {
    if (!id) return;
    const chan = openChannel(id, self, {
      onState: (patch) => { setSession(prev => (prev ? { ...prev, ...patch } : prev)); },
      onMessage: (msg) => { setSession(prev => prev ? { ...prev, messages: [...(prev.messages || []).filter(m => m.id !== msg.id), msg].slice(-200) } : prev); },
      onPresence: (people) => setParticipants(people.length ? people : [{ id: self.id, name: self.name }]),
    });
    chanRef.current = chan;
    return () => { try { chan.close(); } catch {} chanRef.current = null; };
  }, [id]); // eslint-disable-line

  const isHost = session && session.hostId === self.id;

  // Host writes to the store AND broadcasts; guests only broadcast ephemeral
  // things (messages, reactions, presence). Store is the durable record.
  const patchShared = (patch) => {
    if (isHost) updateSession(id, patch);
    setSession(prev => (prev ? { ...prev, ...patch } : prev));
    chanRef.current?.broadcastState(patch);
  };
  const send = (kind, text) => {
    const msg = { id: rid(), kind, text, from: self.name, fromId: self.id, at: Date.now() };
    setSession(prev => prev ? { ...prev, messages: [...(prev.messages || []), msg].slice(-200) } : prev);
    if (isHost) updateSession(id, (s) => ({ messages: [...(s.messages || []), msg].slice(-200) }));
    chanRef.current?.sendMessage(msg);
    return msg;
  };

  return {
    self, session, participants, isHost,
    mode: chanRef.current?.mode || (usesLiveSync() ? 'live' : 'local'),
    actions: {
      start: () => patchShared({ stage: 'live', cursor: 0 }),
      end: () => patchShared({ stage: 'ended' }),
      setCursor: (i) => patchShared({ cursor: i }),
      next: () => patchShared({ cursor: Math.min(((session?.agenda?.length || 1) - 1), (session?.cursor || 0) + 1) }),
      prev: () => patchShared({ cursor: Math.max(0, (session?.cursor || 0) - 1) }),
      setWizardStage: (s) => patchShared({ wizardStage: s }),
      setCaption: (caption) => patchShared({ caption }),
      setSummary: (summary) => patchShared({ summary }),
      chat: (text) => send('chat', text),
      react: (emoji) => send('reaction', emoji),
      rename: (name) => { const me = setSelfName(name); setParticipants(p => dedupe([{ id: me.id, name: me.name }, ...p])); chanRef.current?.broadcastState({}); return me; },
    },
  };
}
