/* ============================================================
   INSTALL PROMPT
   Tasteful, dismissible "Install Ardovo" banner. Renders ONLY when the
   browser has offered installation (beforeinstallprompt), the app is
   not already installed, and the user has not dismissed it. Dismissal
   is remembered (localStorage, via useInstallPrompt).
   Self-contained: inline styles on design-system CSS vars, no new deps.
   Safe to mount anywhere once (e.g. inside the app shell). Returns null
   when there is nothing to show.
   NO em-dash / en-dash. ASCII hyphen only.
   ============================================================ */

import React from 'react';
import { useInstallPrompt } from '../lib/pwa.js';

export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Ardovo"
      style={{
        position: 'fixed',
        zIndex: 1200,
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
        transform: 'translateX(-50%)',
        width: 'min(440px, calc(100vw - 24px))',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'var(--paper, #fff)',
        color: 'var(--ink, #0e1116)',
        border: '1px solid var(--line, #e7e9ee)',
        borderRadius: 'var(--r-lg, 16px)',
        boxShadow: 'var(--shadow-lg, 0 24px 60px rgba(16,20,30,.18))',
      }}
    >
      <img
        src="/icons/icon.svg"
        alt=""
        width={44}
        height={44}
        style={{ borderRadius: 12, flexShrink: 0, display: 'block' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}>Install Ardovo</div>
        <div style={{ fontSize: 15, color: 'var(--ink-2, #3a4150)', lineHeight: 1.3 }}>
          Add Ardovo to your home screen for a faster, full-screen app.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={promptInstall}
          style={{
            appearance: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 15,
            padding: '9px 16px',
            borderRadius: 'var(--r-pill, 999px)',
            background: 'var(--accent, #5b4bf5)',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          title="Not now"
          style={{
            appearance: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            width: 34,
            height: 34,
            borderRadius: 'var(--r-pill, 999px)',
            background: 'transparent',
            color: 'var(--ink-2, #3a4150)',
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
