// concierge.js - config + helpers for the "call a human/AI for login help"
// front door. Everything is env-driven so surfaces render ONLY when real:
// no dead phone button, no fake widget. When Nate provisions a VAPI number and
// drops the env vars in, the login page lights up a live concierge with zero
// code changes. NO em-dash / en-dash. ASCII only.

// E.164 number a user can dial for login help, e.g. "+14155551234".
export const HELP_NUMBER = import.meta.env.VITE_LOGIN_HELP_NUMBER || '';
// Fallback support email (we always have one so there is never a dead end).
export const HELP_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'help@ardovo.com';
// VAPI web widget (in-browser voice) - only when a public key + assistant exist.
export const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '';
export const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || '';

export const hasPhone = () => !!HELP_NUMBER;
export const hasVoiceWidget = () => !!(VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID);

// Pretty-print a US-ish E.164 number for display. Non-US formats fall back to
// the raw string so we never mangle an international number.
export function formatPhone(n) {
  const s = String(n || '');
  const m = s.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return s;
}

export function telHref(n = HELP_NUMBER) { return `tel:${String(n).replace(/[^\d+]/g, '')}`; }
