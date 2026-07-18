// ============================================================
// RECENT PAGES  (local-first quick-nav: recent + pinned pages)
//
// A bottom-left dock remembers where you have been and lets you pin the
// pages you live on. Pure client state, three localStorage keys, pub/sub
// in the same shape as store.js (subs Set + notify). Ported from The Way
// HQ's PageDock, adapted to Ardovo's conventions (tokens, Icon, routes).
// NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';

const RECENT_KEY = 'rally_recent_pages_v1';
const PINNED_KEY = 'rally_pinned_pages_v1';
const OPEN_KEY = 'rally_pagedock_open_v1';
const MAX_RECENT = 8;

function readArr(key) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function readBool(key) { try { return localStorage.getItem(key) === '1'; } catch { return false; } }

let recent = readArr(RECENT_KEY);   // [{ path, label, ts }]
let pinned = readArr(PINNED_KEY);   // [{ path, label }]
let open = readBool(OPEN_KEY);

const subs = new Set();
function notify() { subs.forEach(fn => fn()); }
function persist(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ---------- reads ---------- */
export const getRecent = () => recent;
export const getPinned = () => pinned;
export const isOpen = () => open;
export const isPinned = (path) => pinned.some(p => p.path === path);

/* ---------- writes (each persists + notifies) ---------- */
export function recordVisit(path, label) {
  if (!path) return;
  recent = [{ path, label, ts: Date.now() }, ...recent.filter(p => p.path !== path)].slice(0, MAX_RECENT);
  persist(RECENT_KEY, recent);
  notify();
}
export function togglePin(item) {
  const exists = pinned.some(p => p.path === item.path);
  pinned = exists ? pinned.filter(p => p.path !== item.path) : [...pinned, { path: item.path, label: item.label }];
  persist(PINNED_KEY, pinned);
  notify();
}
export function setOpen(v) {
  open = !!v;
  try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch {}
  notify();
}

/* ---------- hook (same pattern as store.js useStore) ---------- */
export function useRecentPages() {
  const [snap, setSnap] = useState(() => ({ recent, pinned, open }));
  useEffect(() => {
    const fn = () => setSnap({ recent, pinned, open });
    subs.add(fn); fn();
    return () => subs.delete(fn);
  }, []);
  return snap;
}

export { MAX_RECENT };
