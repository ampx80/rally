// ============================================================
// RALLY DEMO MODE  (session-scoped, additive, safe)
//
// Lets a prospect walk the REAL app as a clearly-labeled demo instead of a
// scripted tour. A marketing CTA calls enterDemo(): it grants the access code
// (so the gate opens) and sets a session flag. In the product shell a demo
// ribbon is always visible, sensitive/config surfaces are locked + blurred in
// the nav, and landing on a locked route shows an upsell instead of the page.
// Exiting clears both flags.
//
// Session-scoped on purpose (sessionStorage): closing the tab ends the demo,
// and it never persists a fake account. NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { grantAccessCode, notifyAccessChange } from './access-mode.js';

const DEMO_KEY = 'rally_demo';
const ACCESS_KEY = 'rally_access';
export const DEMO_EVENT = 'rally:demo-change';

export function isDemo() {
  try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch { return false; }
}

export function enterDemo() {
  try { sessionStorage.setItem(DEMO_KEY, '1'); } catch {}
  // Open the product gate for this session so the demo can render the real app.
  grantAccessCode();
  try { window.dispatchEvent(new CustomEvent(DEMO_EVENT)); } catch {}
}

export function exitDemo() {
  try { sessionStorage.removeItem(DEMO_KEY); } catch {}
  // Only pull the access code if it was demo that granted it (best-effort).
  try { localStorage.removeItem(ACCESS_KEY); } catch {}
  notifyAccessChange();
  try { window.dispatchEvent(new CustomEvent(DEMO_EVENT)); } catch {}
}

// Config / admin / billing surfaces a prospect should not poke in a demo.
// These are locked (blurred in nav, upsell on the page).
export const LOCKED_ROUTES = new Set([
  '/settings', '/team', '/permissions', '/roles', '/admin', '/integrations',
  '/billing-plans', '/invoices', '/payments', '/developers', '/datasync',
  '/import', '/migrate', '/qualify', '/objects', '/sandboxes', '/app-manager',
]);

export function isLockedPath(pathname = '') {
  const seg = '/' + (String(pathname).split('/')[1] || '');
  return LOCKED_ROUTES.has(seg);
}

// Reactive demo flag for components.
export function useDemo() {
  const [on, setOn] = useState(isDemo);
  useEffect(() => {
    const refresh = () => setOn(isDemo());
    window.addEventListener(DEMO_EVENT, refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => { window.removeEventListener(DEMO_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return on;
}
