// Role-based access control: capability matrix, grants, field-level security.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetRbac, can, canViewField, canEditField,
  isGranted, getMatrix, grantCount, setGrant, resetRole, hasOverrides,
  getActiveRole, setActiveRole, isViewingAs,
  ROLES, CAPABILITIES, FIELD_SECURITY, roleMeta,
} from '../lib/rbac.js';

beforeEach(() => { resetRbac(); });

describe('roles + capabilities', () => {
  it('ranks admin highest and viewer lowest', () => {
    expect(roleMeta('admin').rank).toBe(4);
    expect(roleMeta('viewer').rank).toBe(1);
    expect(roleMeta('bogus').id).toBe('viewer'); // fallback
    expect(ROLES).toHaveLength(4);
    expect(CAPABILITIES.length).toBeGreaterThan(0);
  });
});

describe('can()', () => {
  it('grants admin everything by default', () => {
    for (const c of CAPABILITIES) expect(can(c.id, 'admin')).toBe(true);
  });
  it('reflects the default matrix for a rep', () => {
    expect(can('records.edit', 'rep')).toBe(true);
    expect(can('records.delete', 'rep')).toBe(false);
    expect(can('rbac.manage', 'rep')).toBe(false);
  });
  it('viewer can only view', () => {
    expect(can('records.view', 'viewer')).toBe(true);
    expect(can('records.edit', 'viewer')).toBe(false);
  });
  it('defaults to the active role when none is passed', () => {
    setActiveRole('viewer');
    expect(getActiveRole()).toBe('viewer');
    expect(isViewingAs()).toBe(true);
    expect(can('records.edit')).toBe(false);
    setActiveRole('admin');
    expect(isViewingAs()).toBe(false);
  });
});

describe('grant matrix editing', () => {
  it('getMatrix returns a full role x capability grid', () => {
    const m = getMatrix();
    expect(m.admin['records.delete']).toBe(true);
    expect(m.viewer['records.edit']).toBe(false);
  });
  it('grantCount matches isGranted tallies', () => {
    const count = CAPABILITIES.filter(c => isGranted('rep', c.id)).length;
    expect(grantCount('rep')).toBe(count);
  });
  it('setGrant overrides a default and hasOverrides flips', () => {
    expect(hasOverrides('rep')).toBe(false);
    setGrant('rep', 'records.delete', true);
    expect(isGranted('rep', 'records.delete')).toBe(true);
    expect(hasOverrides('rep')).toBe(true);
    resetRole('rep');
    expect(isGranted('rep', 'records.delete')).toBe(false);
    expect(hasOverrides('rep')).toBe(false);
  });
  it('admin cannot be locked out of a capability', () => {
    setGrant('admin', 'records.delete', false);
    expect(isGranted('admin', 'records.delete')).toBe(true);
  });
});

describe('field-level security', () => {
  it('gates view by role rank', () => {
    // personalEmail requires manager to view
    expect(canViewField('contact', 'personalEmail', 'rep')).toBe(false);
    expect(canViewField('contact', 'personalEmail', 'manager')).toBe(true);
  });
  it('an unsecured field is viewable by anyone', () => {
    expect(canViewField('deal', 'name', 'viewer')).toBe(true);
  });
  it('edit requires both records.edit and sufficient rank', () => {
    // deal.amount: view rep / edit rep
    expect(canEditField('deal', 'amount', 'rep')).toBe(true);
    // deal.forecast: edit manager -> a rep cannot edit
    expect(canEditField('deal', 'forecast', 'rep')).toBe(false);
    expect(canEditField('deal', 'forecast', 'manager')).toBe(true);
    // viewer lacks records.edit entirely
    expect(canEditField('deal', 'amount', 'viewer')).toBe(false);
  });
  it('FIELD_SECURITY rules are well-formed', () => {
    for (const rule of FIELD_SECURITY) {
      expect(rule).toHaveProperty('objectType');
      expect(rule).toHaveProperty('view');
      expect(rule).toHaveProperty('edit');
    }
  });
});
