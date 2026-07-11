// ============================================================
// RALLY TEST RUNNER CONFIG
// A standalone Vitest config (separate from vite.config.js by design so
// the app build and the test harness never fight over plugins/ports).
// jsdom gives us window.localStorage so the local-first store modules load
// exactly as they do in the browser. globals:true exposes describe/it/expect
// without per-file imports. setup.js loads jest-dom matchers + a reset hook.
// Run: npx vitest run   (watch: npx vitest)
// ============================================================
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    // Each test file gets a clean module registry + fresh localStorage so the
    // deterministic seeds rebuild in isolation and cross-file state never leaks.
    isolate: true,
    restoreMocks: true,
  },
});
