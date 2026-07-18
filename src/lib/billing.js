// ============================================================
// ARDOVO BILLING  (browser helpers)
// Thin client over the /api/billing-* routes with a local demo fallback.
// When Stripe is configured server-side, startCheckout redirects to the
// hosted Checkout and openPortal redirects to the Billing Portal. When it
// is NOT configured (the API returns { configured: false }), we record the
// chosen plan locally so the demo still feels real and never dead-ends.
//
// Local plan state lives in localStorage under BILLING_KEY and is the source
// of truth for "current plan" in the demo. A live deployment would read the
// org's real subscription instead; swap getPlanState for that when orgs land.
// Safe on the server (guards typeof window). NO em-dash / en-dash. ASCII only.
// ============================================================
import { useEffect, useState } from 'react';
import { DEFAULT_PLAN_ID, planById } from './plans.js';

const BILLING_KEY = 'rally_billing_v1';
const listeners = new Set();

function hasWindow() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function read() {
  if (!hasWindow()) return { planId: DEFAULT_PLAN_ID, cycle: 'monthly', seats: 1, demo: true };
  try {
    const raw = window.localStorage.getItem(BILLING_KEY);
    if (!raw) return { planId: DEFAULT_PLAN_ID, cycle: 'monthly', seats: 1, demo: true };
    const parsed = JSON.parse(raw);
    return { planId: parsed.planId || DEFAULT_PLAN_ID, cycle: parsed.cycle || 'monthly', seats: parsed.seats || 1, demo: parsed.demo !== false };
  } catch {
    return { planId: DEFAULT_PLAN_ID, cycle: 'monthly', seats: 1, demo: true };
  }
}

function write(next) {
  const state = { ...read(), ...next };
  if (hasWindow()) {
    try { window.localStorage.setItem(BILLING_KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
  }
  listeners.forEach((fn) => { try { fn(state); } catch { /* ignore */ } });
  return state;
}

// The current plan state for the demo. { planId, cycle, seats, demo }.
export function getPlanState() {
  return read();
}

// The full plan object the workspace is currently on.
export function getCurrentPlan() {
  return planById(read().planId) || planById(DEFAULT_PLAN_ID);
}

// Set the local plan flag (used by the demo fallback and after a known upgrade).
export function setPlanState(next) {
  return write(next);
}

async function postJson(url, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return await r.json().catch(() => ({}));
  } catch (e) {
    return { configured: false, reason: 'network', error: e?.message };
  }
}

// Start an upgrade. Redirects to Stripe Checkout when configured; otherwise
// records the plan locally and returns { demo: true } so the caller can toast.
// opts: { cycle, seats, email, orgId }.
export async function startCheckout(planId, opts = {}) {
  const cycle = opts.cycle === 'annual' ? 'annual' : 'monthly';
  const seats = Math.max(1, parseInt(opts.seats, 10) || 1);
  const res = await postJson('/api/billing-checkout', {
    planId, cycle, seats, email: opts.email, orgId: opts.orgId,
  });
  if (res && res.configured && res.url) {
    if (hasWindow()) window.location.assign(res.url);
    return { ok: true, redirected: true };
  }
  // Not configured (or a soft error): fall back to a local demo upgrade.
  write({ planId, cycle, seats, demo: true });
  return { ok: true, demo: true, reason: res?.reason || 'not-configured' };
}

// Open the Stripe Billing Portal when configured. opts: { customerId, orgId }.
export async function openPortal(opts = {}) {
  const res = await postJson('/api/billing-portal', {
    customerId: opts.customerId, orgId: opts.orgId,
  });
  if (res && res.configured && res.url) {
    if (hasWindow()) window.location.assign(res.url);
    return { ok: true, redirected: true };
  }
  return { ok: false, demo: true, reason: res?.reason || 'not-configured' };
}

// React hook: current plan state, live across changes in this tab.
export function useBilling() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const fn = (s) => setState(s);
    listeners.add(fn);
    // Cross-tab sync.
    const onStorage = (e) => { if (e.key === BILLING_KEY) setState(read()); };
    if (hasWindow()) window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(fn);
      if (hasWindow()) window.removeEventListener('storage', onStorage);
    };
  }, []);
  return {
    ...state,
    plan: planById(state.planId) || planById(DEFAULT_PLAN_ID),
    startCheckout,
    openPortal,
    setPlanState,
  };
}
