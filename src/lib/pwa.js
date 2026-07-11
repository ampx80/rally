/* ============================================================
   RALLY PWA HELPERS
   - registerSW()        : idempotent, production-only, guarded SW
                           registration + update detection.
   - onSWUpdate(cb)      : subscribe to "a new version is waiting".
   - applySWUpdate()     : tell the waiting SW to take over now.
   - useInstallPrompt()  : capture beforeinstallprompt, expose a
                           tasteful install trigger + dismissal memory.
   Safe to import anywhere. No side effects on import beyond a passive
   beforeinstallprompt listener (browser-only, guarded).
   NO em-dash / en-dash. ASCII hyphen only.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react';

var DISMISS_KEY = 'rally.pwa.install.dismissed';
var isBrowser = typeof window !== 'undefined';

/* ---------------- install prompt capture (module scope) ----------------
   beforeinstallprompt can fire before any React component mounts, so we
   grab it at module load and re-broadcast for late subscribers. */
var deferredPrompt = null;
var installReadyListeners = new Set();

if (isBrowser) {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // stop the mini-infobar; we present our own UI
    deferredPrompt = e;
    installReadyListeners.forEach(function (fn) { try { fn(); } catch (_) {} });
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
    installReadyListeners.forEach(function (fn) { try { fn(); } catch (_) {} });
  });
}

function isStandalone() {
  if (!isBrowser) return false;
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

/* ---------------- service worker registration ---------------- */
var swRegistered = false;
var updateListeners = new Set();
var waitingWorker = null;

function notifyUpdate(worker) {
  waitingWorker = worker || waitingWorker;
  updateListeners.forEach(function (fn) { try { fn(); } catch (_) {} });
}

/**
 * Register the service worker. Idempotent, production-only, feature-guarded.
 * Never runs in dev (import.meta.env.PROD is false), so it can never break
 * Vite HMR or the local SPA.
 */
export function registerSW() {
  if (!isBrowser) return;
  if (swRegistered) return;
  // Production only. In dev we never register (keeps HMR + SPA clean).
  try { if (!import.meta.env || !import.meta.env.PROD) return; } catch (_) { return; }
  if (!('serviceWorker' in navigator)) return;
  swRegistered = true;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      // A worker already waiting (update from a previous visit).
      if (reg.waiting && navigator.serviceWorker.controller) notifyUpdate(reg.waiting);

      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          // Installed while a controller exists => this is an update.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate(installing);
          }
        });
      });
    }).catch(function () { /* registration failures are non-fatal */ });

    // When the new SW takes control, reload once to get fresh assets.
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

/** Subscribe to update-available events. Returns an unsubscribe function. */
export function onSWUpdate(cb) {
  if (typeof cb !== 'function') return function () {};
  updateListeners.add(cb);
  if (waitingWorker) { try { cb(); } catch (_) {} }
  return function () { updateListeners.delete(cb); };
}

/** Activate the waiting worker now (triggers a one-time reload). */
export function applySWUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

/* ---------------- React hooks ---------------- */

/**
 * useInstallPrompt()
 * Returns { canInstall, installed, dismissed, promptInstall, dismiss }.
 * canInstall is true only when the browser fired beforeinstallprompt,
 * the app is not already installed, and the user has not dismissed us.
 */
export function useInstallPrompt() {
  var initialDismissed = false;
  try { initialDismissed = isBrowser && localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) {}

  var ready = useState(!!deferredPrompt);
  var hasPrompt = ready[0];
  var setHasPrompt = ready[1];

  var dis = useState(initialDismissed);
  var dismissed = dis[0];
  var setDismissed = dis[1];

  var inst = useState(isStandalone());
  var installed = inst[0];
  var setInstalled = inst[1];

  useEffect(function () {
    if (!isBrowser) return undefined;
    var sync = function () {
      setHasPrompt(!!deferredPrompt);
      setInstalled(isStandalone());
    };
    installReadyListeners.add(sync);
    var onInstalled = function () { setInstalled(true); };
    window.addEventListener('appinstalled', onInstalled);
    return function () {
      installReadyListeners.delete(sync);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  var promptInstall = useCallback(function () {
    if (!deferredPrompt) return Promise.resolve(null);
    var evt = deferredPrompt;
    var p = evt.prompt();
    return Promise.resolve(p).then(function () {
      return evt.userChoice;
    }).then(function (choice) {
      deferredPrompt = null;
      setHasPrompt(false);
      if (choice && choice.outcome === 'accepted') setInstalled(true);
      return choice;
    }).catch(function () {
      deferredPrompt = null;
      setHasPrompt(false);
      return null;
    });
  }, []);

  var dismiss = useCallback(function () {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
  }, []);

  return {
    canInstall: hasPrompt && !installed && !dismissed,
    installed: installed,
    dismissed: dismissed,
    promptInstall: promptInstall,
    dismiss: dismiss,
  };
}

/**
 * useSWUpdate()
 * Returns { updateReady, applyUpdate }. Optional convenience hook for a
 * "new version available - refresh" toast. Wire wherever you like.
 */
export function useSWUpdate() {
  var st = useState(false);
  var updateReady = st[0];
  var setUpdateReady = st[1];

  useEffect(function () {
    return onSWUpdate(function () { setUpdateReady(true); });
  }, []);

  return { updateReady: updateReady, applyUpdate: applySWUpdate };
}
