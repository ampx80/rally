// ============================================================
// RALLY DATA LAYER - SUPABASE ADAPTER
// ------------------------------------------------------------
// Multi-tenant persistence over Supabase. Same interface as the
// LocalAdapter, so pages that read/write through the data layer do
// not change when this backend is active. Every row is scoped by
// org_id for tenant isolation; every query filters on it and every
// insert stamps it. Realtime subscriptions push change notifications
// so useData() re-fetches live.
//
// Tables are `rally_<entity>` (rally_companies, rally_deals, ...).
// The client comes from ./supabase-browser.js (a lazy guard); this
// module never constructs a client at import time and is a no-op
// when Supabase is not configured.
//
// NOTE ON SHAPE: the local seed uses camelCase fields (companyId,
// closeDate). The live schema's column casing is a migration detail
// documented in docs/DATA_LAYER.md; this adapter passes patches
// through unchanged plus the org_id stamp, so the schema should
// define columns to match the field names the pages already send.
// ============================================================
import { getBrowserSupabase, isConfigured } from '../supabase-browser.js';
import { DataAdapter, ok, fail, isEntity } from './adapter.js';

const TABLE_PREFIX = 'rally_';
const tableFor = (entity) => TABLE_PREFIX + entity;

// The org this browser session reads/writes. Injected via env for now
// (single-tenant-per-deploy is the simplest safe default); a future
// auth layer can override by passing an org id to configureOrg().
let _orgId = readOrgId();
function readOrgId() {
  try {
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    return env.VITE_RALLY_ORG_ID || 'default';
  } catch {
    return 'default';
  }
}
export function configureOrg(orgId) {
  if (orgId) _orgId = String(orgId);
}
export function currentOrgId() {
  return _orgId;
}

function client() {
  return getBrowserSupabase();
}

// Translate a portable query object (see adapter.js) into a Supabase
// query builder, always scoped to the current org.
function buildQuery(entity, query) {
  const sb = client();
  let q = sb.from(tableFor(entity)).select('*').eq('org_id', _orgId);
  if (query && query.where) {
    for (const k of Object.keys(query.where)) {
      const v = query.where[k];
      q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v);
    }
  }
  if (query && query.orderBy) {
    q = q.order(query.orderBy, { ascending: query.dir !== 'desc' });
  }
  if (query && typeof query.limit === 'number' && query.limit >= 0) {
    q = q.limit(query.limit);
  }
  return q;
}

export class SupabaseAdapter extends DataAdapter {
  constructor() {
    super('supabase');
    this._channel = null;
    this._subs = new Set();
  }

  _guard(entity) {
    if (!isConfigured() || !client()) {
      return fail('not_configured', 'Supabase backend is selected but not configured.');
    }
    if (!isEntity(entity)) {
      return fail('unknown_entity', `Unknown entity "${entity}".`);
    }
    return null;
  }

  async list(entity, query) {
    const bad = this._guard(entity);
    if (bad) return bad;
    const { data, error } = await buildQuery(entity, query);
    if (error) return fail('list_failed', error.message);
    return ok(data || []);
  }

  async get(entity, id) {
    const bad = this._guard(entity);
    if (bad) return bad;
    const { data, error } = await client()
      .from(tableFor(entity))
      .select('*')
      .eq('org_id', _orgId)
      .eq('id', id)
      .maybeSingle();
    if (error) return fail('get_failed', error.message);
    return data ? ok(data) : fail('not_found', `${entity} ${id} not found.`);
  }

  async create(entity, patch) {
    const bad = this._guard(entity);
    if (bad) return bad;
    const row = { ...(patch || {}), org_id: _orgId };
    const { data, error } = await client()
      .from(tableFor(entity))
      .insert(row)
      .select()
      .single();
    if (error) return fail('create_failed', error.message);
    return ok(data);
  }

  async update(entity, id, patch) {
    const bad = this._guard(entity);
    if (bad) return bad;
    // org_id is never patchable; strip it if a caller passes it.
    const clean = { ...(patch || {}) };
    delete clean.org_id;
    const { data, error } = await client()
      .from(tableFor(entity))
      .update(clean)
      .eq('org_id', _orgId)
      .eq('id', id)
      .select()
      .single();
    if (error) return fail('update_failed', error.message);
    return ok(data);
  }

  async remove(entity, id) {
    const bad = this._guard(entity);
    if (bad) return bad;
    const { error } = await client()
      .from(tableFor(entity))
      .delete()
      .eq('org_id', _orgId)
      .eq('id', id);
    if (error) return fail('remove_failed', error.message);
    return ok({ id });
  }

  // One realtime channel for all rally_* changes in this org. Every
  // subscriber is notified on any insert/update/delete so useData()
  // can re-fetch. The channel is created lazily on the first
  // subscribe() and torn down when the last subscriber leaves.
  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    if (!isConfigured() || !client()) return () => {};
    this._subs.add(fn);
    if (!this._channel) {
      const sb = client();
      this._channel = sb
        .channel('rally_data_layer')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `org_id=eq.${_orgId}` },
          (payload) => {
            this._subs.forEach((s) => {
              try { s(payload); } catch { /* subscriber threw; ignore */ }
            });
          },
        )
        .subscribe();
    }
    return () => {
      this._subs.delete(fn);
      if (this._subs.size === 0 && this._channel) {
        try { client().removeChannel(this._channel); } catch { /* already gone */ }
        this._channel = null;
      }
    };
  }
}

let _instance = null;
export function getSupabaseAdapter() {
  if (!_instance) _instance = new SupabaseAdapter();
  return _instance;
}
