// ============================================================
// E2E SHARED CONSTANTS
// Single source of truth for the port, base URL, and the seeded
// storageState path. Imported by both playwright.config.js and the
// global-setup so they can never drift out of sync.
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
export const PORT = Number(process.env.E2E_PORT || 4173);
export const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

// storageState file the product project loads. Written by global-setup.
export const AUTH_STATE = 'e2e/.auth/state.json';

// The localStorage key/value the product app's coming-soon gate checks
// (see src/gate/ComingSoon.jsx -> isUnlocked / grantAccess).
export const ACCESS_KEY = 'rally_access';
export const ACCESS_VALUE = 'granted';

// A slug that prerender-seo.mjs is guaranteed to emit (first registry entry).
export const SAMPLE_SEO_SLUG = 'best-crm-software';
