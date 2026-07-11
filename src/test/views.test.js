// Views engine: filter operators, magic tokens, sorting, view CRUD + forking.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetViews, getViews, getView, createView, updateView, deleteView, duplicateView,
  applyView, opsForType, OPS_BY_TYPE, OP_LABEL,
} from '../lib/views.js';

beforeEach(() => { resetViews(); });

// Deal-shaped records exercised against the real deal field registry.
const past = new Date(Date.now() - 10 * 86400000).toISOString();
const future = new Date(Date.now() + 10 * 86400000).toISOString();
const nowIso = new Date().toISOString();
const deals = () => ([
  { id: 'd1', name: 'Alpha Corp', status: 'open', value: 300000, ownerId: 'u_1', stage: 'proposal', closeDate: past },
  { id: 'd2', name: 'Beta LLC',   status: 'won',  value: 50000,  ownerId: 'u_2', stage: 'won',      closeDate: future },
  { id: 'd3', name: 'Gamma',      status: 'open', value: 150000, ownerId: 'u_1', stage: 'lead',     closeDate: '' },
]);
const ids = (rows) => rows.map(r => r.id);
const applyFilters = (filters, ctx = {}) => applyView(deals(), { filters }, 'deal', ctx);

describe('opsForType', () => {
  it('routes numeric-ish types to currency ops', () => {
    expect(opsForType('currency')).toBe(OPS_BY_TYPE.currency);
    expect(opsForType('number')).toBe(OPS_BY_TYPE.currency);
    expect(opsForType('percent')).toBe(OPS_BY_TYPE.currency);
  });
  it('routes date-ish types to date ops and picklist/status to picklist ops', () => {
    expect(opsForType('datetime')).toBe(OPS_BY_TYPE.date);
    expect(opsForType('status')).toBe(OPS_BY_TYPE.picklist);
  });
  it('defaults unknown types to text ops', () => {
    expect(opsForType('somethingElse')).toBe(OPS_BY_TYPE.text);
    expect(OP_LABEL.contains).toBe('contains');
  });
});

describe('applyView filter operators', () => {
  it('is (equals) on a store column', () => {
    expect(ids(applyFilters([{ fieldKey: 'status', op: 'is', value: 'open' }]))).toEqual(['d1', 'd3']);
  });
  it('contains on text', () => {
    expect(ids(applyFilters([{ fieldKey: 'name', op: 'contains', value: 'corp' }]))).toEqual(['d1']);
  });
  it('gt on a storeKey-backed numeric field (amount -> value)', () => {
    expect(ids(applyFilters([{ fieldKey: 'amount', op: 'gt', value: 100000 }]))).toEqual(['d1', 'd3']);
  });
  it('between on a numeric field', () => {
    expect(ids(applyFilters([{ fieldKey: 'amount', op: 'between', value: [100000, 200000] }]))).toEqual(['d3']);
  });
  it('anyOf on stage', () => {
    expect(ids(applyFilters([{ fieldKey: 'stage', op: 'anyOf', value: ['proposal', 'won'] }]))).toEqual(['d1', 'd2']);
  });
  it('isEmpty on a blank value', () => {
    expect(ids(applyFilters([{ fieldKey: 'closeDate', op: 'isEmpty', value: null }]))).toEqual(['d3']);
  });
  it('before with the "today" magic token', () => {
    expect(ids(applyFilters([{ fieldKey: 'closeDate', op: 'before', value: 'today' }]))).toEqual(['d1']);
  });
  it('is with the "@me" magic token resolves to the current user', () => {
    const res = applyFilters([{ fieldKey: 'ownerId', op: 'is', value: '@me' }], { currentUserId: 'u_1' });
    expect(ids(res)).toEqual(['d1', 'd3']);
  });
  it('an unknown field key is a no-op filter (keeps every row)', () => {
    expect(ids(applyFilters([{ fieldKey: 'notARealField', op: 'is', value: 'x' }]))).toHaveLength(3);
  });
  it('combines multiple filters with AND', () => {
    const res = applyFilters([
      { fieldKey: 'status', op: 'is', value: 'open' },
      { fieldKey: 'amount', op: 'gt', value: 200000 },
    ]);
    expect(ids(res)).toEqual(['d1']);
  });
});

describe('applyView sorting', () => {
  it('sorts numerically descending', () => {
    const out = applyView(deals(), { filters: [], sort: { key: 'amount', dir: 'desc' } }, 'deal');
    expect(ids(out)).toEqual(['d1', 'd3', 'd2']);
  });
  it('sorts ascending by name', () => {
    const out = applyView(deals(), { filters: [], sort: { key: 'name', dir: 'asc' } }, 'deal');
    expect(ids(out)).toEqual(['d1', 'd2', 'd3']);
  });
  it('returns records unchanged when the view is null', () => {
    const rows = deals();
    expect(applyView(rows, null, 'deal')).toBe(rows);
  });
});

describe('view CRUD', () => {
  it('seeds system views per object type', () => {
    const dealViews = getViews('deal');
    expect(dealViews.length).toBeGreaterThan(0);
    expect(dealViews.every(v => v.system)).toBe(true);
    expect(getView('d_open')).toBeTruthy();
  });
  it('createView adds a user view', () => {
    const before = getViews('contact').length;
    const v = createView('contact', { name: 'VIPs' });
    expect(v.system).toBe(false);
    expect(getViews('contact')).toHaveLength(before + 1);
  });
  it('updateView on a system view forks a copy instead of mutating it', () => {
    const forked = updateView('d_open', { name: 'My open pipeline' });
    expect(forked.system).toBe(false);
    expect(getView('d_open').system).toBe(true); // original untouched
  });
  it('updateView on a user view patches in place', () => {
    const v = createView('deal', { name: 'Temp' });
    const patched = updateView(v.id, { name: 'Renamed' });
    expect(patched.name).toBe('Renamed');
  });
  it('duplicateView and deleteView', () => {
    const v = createView('deal', { name: 'Dupe me' });
    const copy = duplicateView(v.id);
    expect(copy.name).toMatch(/\(copy\)$/);
    deleteView(v.id);
    expect(getView(v.id)).toBeUndefined();
  });
});
