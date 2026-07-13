// ============================================================
// RALLY MOBILE - AUTH
// AuthProvider + useAuth. Token lives in expo-secure-store.
// The app is fully usable with NO login via demo/guest mode
// (isDemo === true), which is also the fallback whenever a real
// sign-in cannot reach the API. signIn/signOut are env-gated:
// if EXPO_PUBLIC_AUTH_LIVE is not set, they resolve to demo mode.
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { post, setAuthToken } from './api';

const TOKEN_KEY = 'rally_token';
const USER_KEY = 'rally_user';
const AUTH_LIVE = process.env.EXPO_PUBLIC_AUTH_LIVE === '1';

// The demo identity - mirrors the current user in the web seed (Jordan Avery).
const DEMO_USER = {
  id: 'u_1',
  name: 'Jordan Avery',
  email: 'jordan@rally.app',
  title: 'Senior Account Executive',
  role: 'rep',
  demo: true,
};

const AuthContext = createContext(null);

async function secureGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function secureSet(key, value) {
  try {
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore - device may not have secure store (web); auth still works in-memory
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore any persisted session on boot.
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await secureGet(TOKEN_KEY);
        const savedUser = await secureGet(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setAuthToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsDemo(false);
        }
      } catch {
        // fall through to logged-out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken || null);
    setAuthToken(nextToken || null);
    await secureSet(TOKEN_KEY, nextToken || null);
    await secureSet(USER_KEY, nextUser ? JSON.stringify(nextUser) : null);
  }, []);

  // Enter the app with no account. Always succeeds.
  const enterDemo = useCallback(async () => {
    setIsDemo(true);
    await persist(DEMO_USER, null);
    return { ok: true, demo: true };
  }, [persist]);

  // Real sign-in when AUTH_LIVE; otherwise resolves to demo so the app is usable.
  const signIn = useCallback(
    async (email, password) => {
      if (!AUTH_LIVE) {
        await enterDemo();
        return { ok: true, demo: true, note: 'Auth backend not enabled; entered demo mode.' };
      }
      try {
        const r = await post('/api/auth-session', { email, password }, { timeout: 10000 });
        if (r.ok && r.data?.token) {
          setIsDemo(false);
          await persist(r.data.user || { email }, r.data.token);
          return { ok: true };
        }
        return { ok: false, error: r.data?.error || 'Sign-in failed' };
      } catch (err) {
        return { ok: false, error: String(err?.message || err) };
      }
    },
    [enterDemo, persist]
  );

  const signOut = useCallback(async () => {
    setIsDemo(false);
    await persist(null, null);
  }, [persist]);

  const value = {
    user,
    token,
    isDemo,
    isAuthed: !!user, // demo counts as authed-enough to use the app
    loading,
    signIn,
    signOut,
    enterDemo,
    authLive: AUTH_LIVE,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
