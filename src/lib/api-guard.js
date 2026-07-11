// ============================================================
// RALLY API GUARD  (reusable serverless middleware helpers)
// Pure Node ES module, zero dependencies. Composable guards for Vercel
// serverless routes (req, res). Wrap any handler with compose(...guards) to
// get method allow-listing, CORS, in-memory per-IP rate limiting, and body
// validation with a tiny schema validator.
//
// Import from an api/* route like:
//   import { withErrorHandling, methodNotAllowed } from './_utils.js';
//   import { compose, requireMethod, rateLimit, validateBody, cors } from '../src/lib/api-guard.js';
//
//   export default withErrorHandling(compose(
//     requireMethod('POST'),
//     rateLimit({ max: 10, windowMs: 60_000 }),
//     validateBody({ email: { type: 'email', required: true }, name: { type: 'string', max: 120 } }),
//   )(async (req, res) => {
//     const { email, name } = req.valid;   // validated + sanitized
//     ...
//   }));
//
// LIMITATION: the rate-limit store is in-memory and per warm instance. Vercel
// may run many concurrent instances, so this is a best-effort abuse brake, not
// a global quota. For hard, cross-instance limits use Upstash / Vercel KV.
// See docs/SECURITY.md. NO em-dash / en-dash. ASCII only.
// ============================================================

// ---- client IP -------------------------------------------------------------

// Best-effort client IP. On Vercel the left-most x-forwarded-for entry is the
// real client; the platform appends its own hops. Falls back to a socket
// address, then to a constant so a keyFn never returns undefined.
export function clientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length) return String(xff[0]).trim();
  const real = req.headers?.['x-real-ip'];
  if (typeof real === 'string' && real.length) return real.trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

// The route path, minus query string, used to scope a rate-limit bucket.
export function routeKey(req) {
  const url = req.url || '';
  const q = url.indexOf('?');
  return req.method + ' ' + (q === -1 ? url : url.slice(0, q));
}

// ---- body reader (mirrors _utils.readJsonBody, kept dependency-free) --------

function readBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } }
  return {};
}

// ---- guards ----------------------------------------------------------------
// A guard is `async (req, res) => boolean`. Return true when the guard has
// already sent the response and the chain must STOP. Return a falsy value to
// continue to the next guard / the handler.

// Reject any method not in the allow-list with a 405 + Allow header.
export function requireMethod(...allowed) {
  const list = allowed.flat().map((m) => String(m).toUpperCase());
  return (req, res) => {
    if (list.includes(String(req.method).toUpperCase())) return false;
    res.setHeader('Allow', list.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  };
}

// Same-origin-friendly CORS. Pass an array of allowed origins (exact strings)
// or '*'. Echoes an allowed Origin, handles the OPTIONS preflight with a 204.
// Default (no arg) is same-origin only: it sets nothing and lets requests pass,
// which is correct for a first-party SPA calling its own /api on one domain.
export function cors(allowedOrigins) {
  const allowAll = allowedOrigins === '*';
  const list = Array.isArray(allowedOrigins) ? allowedOrigins : [];
  return (req, res) => {
    const origin = req.headers?.origin;
    if (allowAll) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && list.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (String(req.method).toUpperCase() === 'OPTIONS') {
      res.status(204).end();
      return true;
    }
    return false;
  };
}

// ---- in-memory token-bucket rate limiter -----------------------------------

// One shared store across all rate-limit guards in this warm instance.
const buckets = new Map(); // key -> { tokens, updated }
let lastSweep = 0;

// Occasionally drop stale buckets so the Map does not grow without bound on a
// long-lived warm instance. Cheap: runs at most once every 60s.
function sweep(now, ttlMs) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now - b.updated > ttlMs) buckets.delete(k);
  }
}

// rateLimit({ max, windowMs, keyFn, burst }) OR rateLimit(keyFn, { ... }).
//   max      - sustained requests allowed per window (default 30)
//   windowMs - the window the max refills over (default 60_000)
//   burst    - bucket capacity / instantaneous ceiling (default = max)
//   keyFn    - (req) => string bucket key (default: clientIp + routeKey)
// Token bucket: refills at max/windowMs tokens per ms, capped at burst.
export function rateLimit(a, b) {
  const opts = (typeof a === 'function') ? { ...(b || {}), keyFn: a } : (a || {});
  const max = Number.isFinite(opts.max) && opts.max > 0 ? opts.max : 30;
  const windowMs = Number.isFinite(opts.windowMs) && opts.windowMs > 0 ? opts.windowMs : 60_000;
  const capacity = Number.isFinite(opts.burst) && opts.burst > 0 ? opts.burst : max;
  const refillPerMs = max / windowMs;
  const keyFn = typeof opts.keyFn === 'function'
    ? opts.keyFn
    : (req) => clientIp(req) + '|' + routeKey(req);

  return (req, res) => {
    const now = Date.now();
    sweep(now, windowMs * 4);
    const key = keyFn(req);
    let bucket = buckets.get(key);
    if (!bucket) { bucket = { tokens: capacity, updated: now }; buckets.set(key, bucket); }

    // Refill based on elapsed time, then cap.
    bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.updated) * refillPerMs);
    bucket.updated = now;

    // Advisory headers so clients can back off gracefully.
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, Math.floor(bucket.tokens - 1))));

    if (bucket.tokens < 1) {
      const waitMs = Math.ceil((1 - bucket.tokens) / refillPerMs);
      res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
      res.status(429).json({ error: 'Too many requests. Please slow down.', retryAfterMs: waitMs });
      return true;
    }
    bucket.tokens -= 1;
    return false;
  };
}

// ---- tiny schema validator -------------------------------------------------
// Schema shape: { field: { type, required, max, min, values, default } }
//   type: 'string' | 'email' | 'url' | 'number' | 'integer' | 'boolean' | 'slug'
//   required: boolean            - missing/empty fails when true
//   max: number                  - string: max length; number: max value
//   min: number                  - string: min length; number: min value
//   values: array                - enum allow-list (compared after coercion)
//   default: any                 - used when the field is absent
// On success attaches the cleaned object to req.valid and continues.
// On failure sends 400 { error, field } and stops.

// Control + zero-width strip, built from escapes so the source stays ASCII.
const CTRL_RE = new RegExp(
  '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]',
  'g',
);

function coerce(type, raw, spec) {
  switch (type) {
    case 'string':
    case 'slug': {
      let s = raw == null ? '' : String(raw);
      // strip control chars inline (kept dependency-free; mirrors sanitize.js)
      s = s.replace(CTRL_RE, '').trim();
      if (type === 'slug') s = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (Number.isFinite(spec.max)) s = s.slice(0, spec.max);
      return s;
    }
    case 'email': {
      const s = (raw == null ? '' : String(raw)).trim().toLowerCase().slice(0, 254);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
    }
    case 'url': {
      const s = (raw == null ? '' : String(raw)).trim().slice(0, 2048);
      try { const u = new URL(s); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : null; }
      catch { return null; }
    }
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case 'integer': {
      const n = Number(raw);
      return Number.isInteger(n) ? n : (Number.isFinite(n) ? Math.floor(n) : null);
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === 1 || raw === '1') return true;
      if (raw === 'false' || raw === 0 || raw === '0') return false;
      return null;
    }
    default:
      return raw;
  }
}

export function validateBody(schema) {
  const fields = Object.keys(schema || {});
  return (req, res) => {
    const body = readBody(req);
    const out = {};
    for (const name of fields) {
      const spec = schema[name] || {};
      const type = spec.type || 'string';
      const present = body[name] !== undefined && body[name] !== null && body[name] !== '';

      if (!present) {
        if (spec.required) {
          res.status(400).json({ error: 'Missing required field: ' + name, field: name });
          return true;
        }
        if (spec.default !== undefined) out[name] = spec.default;
        continue;
      }

      const val = coerce(type, body[name], spec);
      if (val === null) {
        res.status(400).json({ error: 'Invalid ' + type + ' for field: ' + name, field: name });
        return true;
      }

      // string length bounds
      if ((type === 'string' || type === 'slug') && Number.isFinite(spec.min) && val.length < spec.min) {
        res.status(400).json({ error: name + ' is too short', field: name });
        return true;
      }
      // numeric bounds
      if ((type === 'number' || type === 'integer')) {
        if (Number.isFinite(spec.min) && val < spec.min) {
          res.status(400).json({ error: name + ' is below the minimum', field: name });
          return true;
        }
        if (Number.isFinite(spec.max) && val > spec.max) {
          res.status(400).json({ error: name + ' is above the maximum', field: name });
          return true;
        }
      }
      // enum allow-list
      if (Array.isArray(spec.values) && !spec.values.includes(val)) {
        res.status(400).json({ error: name + ' is not an allowed value', field: name });
        return true;
      }

      out[name] = val;
    }
    req.valid = out;
    return false;
  };
}

// ---- composition -----------------------------------------------------------

// compose(...guards)(handler) -> a single (req, res) handler that runs each
// guard in order; the first guard to return true short-circuits (it already
// sent the response). If all pass, the wrapped handler runs. Compose the
// result with withErrorHandling from _utils.js for uniform error shaping.
export function compose(...guards) {
  const flat = guards.flat().filter(Boolean);
  return (handler) => async (req, res) => {
    for (const guard of flat) {
      const stop = await guard(req, res);
      if (stop) return undefined;
    }
    return handler(req, res);
  };
}

export default { clientIp, routeKey, requireMethod, cors, rateLimit, validateBody, compose };
