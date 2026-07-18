// ============================================================
// ARDOVO AUTH GATE  (drop-in product gate + plan Paywall)
// AuthGate is the single wrapper the app puts around the product shell. It
// reads src/lib/access-mode.js and decides what to render:
//   - authMode() === 'supabase' (VITE_AUTH_MODE=supabase + Supabase env):
//       require a real session. While it resolves, show a quiet splash;
//       if signed out, render the real SignIn screen (which links to
//       SignUp / Welcome). An access code, if present, still passes.
//   - otherwise (the DEFAULT, today's behavior): render the existing
//       ComingSoon access-code gate until the code unlocks. This branch is
//       byte-for-byte the current experience, so an unset env var changes
//       nothing.
//
// Paywall is the feature-level companion: it gates a subtree behind a plan
// tier using workspace.canUse(feature) and shows an upgrade card otherwise.
//
// This file is additive and inert until App.jsx wraps the product shell in
// <AuthGate>. See the wiring notes reported alongside this change.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import ComingSoon from '../../gate/ComingSoon.jsx';
import SignIn from '../../pages/SignIn.jsx';
import { useAccessState, grantAccessCode } from '../../lib/access-mode.js';
import { useWorkspace, requiredPlanFor } from '../../lib/workspace.js';
import { planById } from '../../lib/plans.js';

// A minimal, dependency-light splash for the brief supabase session resolve.
// Matches the dark gate/auth backdrop so there is no flash of unstyled gate.
function GateSplash() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(1200px 600px at 50% -10%, #201b3d 0%, #0d0b1a 55%, #08070f 100%)',
      color: '#cfc9f0',
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,.18)', borderTopColor: '#8f7bff',
        animation: 'rally-spin .7s linear infinite',
      }} />
      <style>{'@keyframes rally-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

// The whole-product gate. Renders `children` (the product shell) only when the
// visitor is allowed in.
export default function AuthGate({ children }) {
  const { mode, signedIn, loading } = useAccessState();

  if (mode === 'supabase') {
    if (loading) return <GateSplash />;
    // Signed out: render the real auth screen. SignIn links to /signup and
    // /welcome, and lands in the product on success (session flips signedIn).
    if (!signedIn) return <SignIn />;
    return children;
  }

  // DEFAULT (code mode): the existing coming-soon access-code gate, unchanged.
  if (!signedIn) {
    return <ComingSoon onUnlock={grantAccessCode} />;
  }
  return children;
}

/* ============================================================
   PAYWALL  (feature-level plan gate)
   Wrap any plan-gated subtree:
     <Paywall feature="automations">...premium UI...</Paywall>
   Renders children when the current workspace plan can use the feature,
   otherwise an upgrade card pointing at the in-app plan picker. Purely
   additive: nothing renders a Paywall until a page opts in.
   ============================================================ */
export function Paywall({ feature, children, title, description, fallback }) {
  const ws = useWorkspace();
  if (ws.canUse(feature)) return children;
  if (fallback !== undefined) return fallback;
  return (
    <PaywallCard feature={feature} title={title} description={description} />
  );
}

// The upgrade prompt shown when a feature is above the current plan. Uses
// global product classes (card / btn) so it inherits the app theme, with
// inline fallbacks so it still reads well if a class is missing.
export function PaywallCard({ feature, title, description }) {
  const nav = useNavigate();
  const need = planById(requiredPlanFor(feature));
  const planName = need?.name || 'a higher';
  return (
    <div className="card" style={{
      maxWidth: 520, margin: '2rem auto', textAlign: 'center', padding: '2rem 1.75rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.85rem',
      border: '1px solid var(--line, #e6e6ef)', borderRadius: 16, background: 'var(--paper, #fff)',
    }}>
      <span style={{
        width: 52, height: 52, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'color-mix(in srgb, #5b4bf5 14%, transparent)', color: '#5b4bf5',
      }}>
        <Icon name="lock" size={24} />
      </span>
      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title || `Unlock this with ${planName}`}</h3>
      <p className="muted" style={{ margin: 0, lineHeight: 1.55, maxWidth: 400 }}>
        {description || `This feature is part of the ${planName} plan. Upgrade your workspace to turn it on for your team.`}
      </p>
      <button
        className="btn btn-primary"
        onClick={() => nav('/billing-plans')}
        style={{
          marginTop: '.4rem', display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '.7rem 1.2rem', borderRadius: 10, border: 0, cursor: 'pointer',
          background: 'linear-gradient(100deg, #6d5cf7, #4a3ce0)', color: '#fff', fontWeight: 700,
        }}
      >
        See plans <Icon name="chevronRight" size={16} />
      </button>
    </div>
  );
}
