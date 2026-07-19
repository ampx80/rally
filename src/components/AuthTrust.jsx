// AuthTrust - a compact, honest trust strip for the auth pages. It anchors the
// otherwise-empty light panel and signals enterprise-grade security WITHOUT
// overpromising: every claim here is real in the product today or clearly
// marked in-progress. Two-factor + recovery codes, SSO (Google OIDC), the
// no-lockout recovery flow, and an honest "SOC 2 in progress" note.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Icon } from './icons.jsx';

const ITEMS = [
  { icon: 'shield', label: 'Two-factor + recovery codes' },
  { icon: 'key', label: 'SSO ready' },
  { icon: 'lifebuoy', label: 'Never locked out' },
  { icon: 'lock', label: 'SOC 2 Type II (in progress)' },
];

export default function AuthTrust() {
  return (
    <div className="atrust" aria-label="Security and trust">
      {ITEMS.map(i => (
        <span className="atrust-i" key={i.label}><Icon name={i.icon} size={13} /> {i.label}</span>
      ))}
      <style>{`
      .atrust { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 16px; max-width: 460px; margin: 0 auto; padding-top: 18px; }
      .atrust-i { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #8a92a3; white-space: nowrap; }
      .atrust-i svg { color: #0e9f8f; flex: none; }
      @media (max-width: 820px) { .atrust { display: none; } }
      `}</style>
    </div>
  );
}
