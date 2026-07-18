// ============================================================
// ARDOVO DATA LAYER - ADAPTER CONTRACT + SHARED QUERY HELPERS
// ------------------------------------------------------------
// One narrow interface every backend implements. Pages never
// talk to a backend directly; they talk to an adapter. Today the
// LocalAdapter wraps the existing local-first stores (store.js +
// store-ext.js) so behavior is byte-for-byte identical to the
// current app. Flip VITE_DATA_BACKEND=supabase (with a configured
// client) and the SupabaseAdapter takes over with zero page edits.
//
// An adapter exposes:
//   list(entity, query)      -> Promise<{ data, error }>
//   get(entity, id)          -> Promise<{ data, error }>
//   create(entity, patch)    -> Promise<{ data, error }>
//   update(entity, id, patch)-> Promise<{ data, error }>
//   remove(entity, id)       -> Promise<{ data, error }>
//   subscribe(fn)            -> unsubscribe function
//
// Every method resolves to { data, error }. On success error is
// null; on failure data is null and error is { code, message }.
// All methods are async so the interface is uniform across a
// synchronous local store and an async network backend.
// ============================================================

// Canonical entity names. Same string is used by every adapter.
// Supabase tables are `rally_<entity>` (see supabase-adapter.js).
export const ENTITIES = [
  'users',
  'companies',
  'contacts',
  'deals',
  'activities',
  'leads',
  'products',
  'quotes',
  'invoices',
  'campaigns',
  'sequences',
  'tickets',
  'workflows',
];

export function isEntity(entity) {
  return ENTITIES.indexOf(entity) !== -1;
}

// Standard result shapes so callers can branch on `.error` uniformly.
export function ok(data) {
  return { data, error: null };
}
export function fail(code, message) {
  return { data: null, error: { code: code || 'error', message: message || 'Request failed.' } };
}

// A store writer error looks like { error: 'name', message: '...' }.
// Normalize it into the adapter's { data, error } contract.
export function fromWriter(result, key) {
  if (!result) return fail('unknown', 'No result returned.');
  if (result.error) return fail(String(result.error), result.message || 'Write failed.');
  const record = key && result[key] !== undefined ? result[key] : result;
  return ok(record);
}

// ------------------------------------------------------------
// Shared query helpers. `query` is an optional plain object:
//   { where: { field: value, ... },   // equality match (AND)
//     orderBy: 'field',
//     dir: 'asc' | 'desc',             // default 'asc'
//     limit: number }
// The LocalAdapter runs these in memory; the SupabaseAdapter
// translates the same shape into .eq / .order / .limit calls, so
// a page's query object is portable across both backends.
// ------------------------------------------------------------
export function matchesWhere(row, where) {
  if (!where) return true;
  for (const k of Object.keys(where)) {
    const want = where[k];
    if (Array.isArray(want)) {
      if (want.indexOf(row[k]) === -1) return false;
    } else if (row[k] !== want) {
      return false;
    }
  }
  return true;
}

export function applyQuery(rows, query) {
  let out = Array.isArray(rows) ? rows.slice() : [];
  if (!query) return out;
  if (query.where) out = out.filter((r) => matchesWhere(r, query.where));
  if (query.orderBy) {
    const key = query.orderBy;
    const dir = query.dir === 'desc' ? -1 : 1;
    out.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return av > bv ? dir : -dir;
    });
  }
  if (typeof query.limit === 'number' && query.limit >= 0) out = out.slice(0, query.limit);
  return out;
}

// Base class purely for documentation + a friendly default. Concrete
// adapters override every method. Calling an un-overridden method
// resolves to a clear "not implemented" error rather than throwing.
export class DataAdapter {
  constructor(name) {
    this.name = name || 'adapter';
  }
  // eslint-disable-next-line no-unused-vars
  async list(entity, query) {
    return fail('not_implemented', 'list() not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  async get(entity, id) {
    return fail('not_implemented', 'get() not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  async create(entity, patch) {
    return fail('not_implemented', 'create() not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  async update(entity, id, patch) {
    return fail('not_implemented', 'update() not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  async remove(entity, id) {
    return fail('not_implemented', 'remove() not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  subscribe(fn) {
    return () => {};
  }
}
