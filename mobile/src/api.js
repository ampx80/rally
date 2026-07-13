// ============================================================
// RALLY MOBILE - API CLIENT
// A tiny, resilient fetch wrapper around the Rally web API.
// - Base URL comes from app config extra.apiBaseUrl (env-overridable).
// - Every call is try/catch wrapped: it returns { ok, data, error }
//   and NEVER throws, so a screen can render an offline fallback.
// - Successful GETs are cached to AsyncStorage; when the network
//   fails we serve the last cached body (cache-first-on-failure).
// ============================================================
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_BASE = 'https://rally-psi-five.vercel.app';
const CACHE_PREFIX = 'rally_api_cache:';
const DEFAULT_TIMEOUT = 12000;

// Resolve base URL: config extra wins, then any legacy manifest field, then default.
export const API_BASE =
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  Constants?.manifest?.extra?.apiBaseUrl ||
  DEFAULT_BASE;

// Auth token is set by src/auth.js after sign-in. Kept in-module so every
// request picks it up without threading it through call sites.
let authToken = null;
export function setAuthToken(token) {
  authToken = token || null;
}

function url(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCache(key, data) {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // cache is best-effort; ignore write failures
  }
}

// Core request. Returns { ok, status, data, error, fromCache }.
async function request(path, { method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT, cache } = {}) {
  const cacheKey = cache || (method === 'GET' ? path : null);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url(path), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timer);

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      return { ok: false, status: res.status, data, error: `HTTP ${res.status}` };
    }

    if (cacheKey) writeCache(cacheKey, data);
    return { ok: true, status: res.status, data, fromCache: false };
  } catch (err) {
    clearTimeout(timer);
    // Network / timeout / abort: try to serve cached data if we have any.
    if (cacheKey) {
      const cached = await readCache(cacheKey);
      if (cached) {
        return { ok: true, status: 0, data: cached.data, fromCache: true, error: String(err?.message || err) };
      }
    }
    return { ok: false, status: 0, data: null, error: String(err?.message || err) };
  }
}

export function get(path, opts) {
  return request(path, { ...opts, method: 'GET' });
}

export function post(path, body, opts) {
  return request(path, { ...opts, method: 'POST', body });
}

export function put(path, body, opts) {
  return request(path, { ...opts, method: 'PUT', body });
}

export function del(path, opts) {
  return request(path, { ...opts, method: 'DELETE' });
}

// Liveness probe against the web API's health route. Never throws.
export async function ping() {
  const r = await get('/api/health', { timeout: 5000, cache: null });
  return r.ok;
}

export async function clearApiCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignore
  }
}

export default { get, post, put, del, ping, API_BASE, setAuthToken, clearApiCache };
