// ============================================================
// RALLY TEST SETUP  (loaded by vitest.config.js setupFiles)
// - Pulls in @testing-library/jest-dom matchers (toBeInTheDocument, etc).
// - jsdom already provides window.localStorage; we add a defensive polyfill
//   for any environment that lacks it so the local-first store modules never
//   throw at import time.
// - Clears localStorage before every test so the deterministic seeds in
//   store.js / store-ext.js / automations.js rebuild from scratch and one
//   test's mutations never bleed into the next.
// ============================================================
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

beforeEach(() => {
  try { localStorage.clear(); } catch {}
});

afterEach(() => {
  try { localStorage.clear(); } catch {}
});
