// ============================================================
// E2E GLOBAL SETUP
// Seeds the product-app unlock. The coming-soon gate unlocks purely off a
// localStorage flag (src/gate/ComingSoon.jsx: rally_access === 'granted'),
// so we write a Playwright storageState file that stamps that key for the
// preview origin. The "product" project loads it, so gated specs land
// straight in the Command Center without a network unlock call.
//
// We write the JSON directly rather than launching a browser so this works
// regardless of webServer/globalSetup start ordering and needs no live
// server. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BASE_URL, AUTH_STATE, ACCESS_KEY, ACCESS_VALUE } from './constants.js';

export default async function globalSetup() {
  const origin = new URL(BASE_URL).origin;
  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: ACCESS_KEY, value: ACCESS_VALUE }],
      },
    ],
  };
  await mkdir(dirname(AUTH_STATE), { recursive: true });
  await writeFile(AUTH_STATE, JSON.stringify(state, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`e2e global-setup: seeded ${ACCESS_KEY}=${ACCESS_VALUE} for ${origin} -> ${AUTH_STATE}`);
}
