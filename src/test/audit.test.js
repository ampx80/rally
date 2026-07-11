// Org-wide audit log: entry shape, per-record filtering, ordering, reset.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetAudit, logChange, getAudit, getAuditLog } from '../lib/audit.js';

beforeEach(() => { resetAudit(); });

describe('logChange', () => {
  it('returns a well-formed entry', () => {
    const e = logChange('deal', 'd_1', 'stage', 'lead', 'qualified', 'Jordan Avery');
    expect(e).toMatchObject({
      objectType: 'deal', recordId: 'd_1', field: 'stage',
      from: 'lead', to: 'qualified', who: 'Jordan Avery',
    });
    expect(e.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(e.at))).toBe(false);
  });
  it('coerces undefined from/to into null', () => {
    const e = logChange('company', 'co_1', 'imported', undefined, undefined);
    expect(e.from).toBeNull();
    expect(e.to).toBeNull();
  });
  it('defaults the actor to "You"', () => {
    expect(logChange('deal', 'd_9', 'value', 1, 2).who).toBe('You');
  });
});

describe('getAudit', () => {
  it('returns only entries for the requested record, newest first', () => {
    logChange('deal', 'd_1', 'stage', 'lead', 'qualified');
    logChange('deal', 'd_2', 'stage', 'lead', 'discovery');
    logChange('deal', 'd_1', 'value', 1000, 2000);
    const log = getAudit('deal', 'd_1');
    expect(log).toHaveLength(2);
    expect(log.every(e => e.recordId === 'd_1')).toBe(true);
    expect(log[0].field).toBe('value'); // most recent first
    expect(log[1].field).toBe('stage');
  });
  it('the org-wide log accumulates every change', () => {
    logChange('deal', 'd_1', 'stage', 'a', 'b');
    logChange('contact', 'c_1', 'title', 'x', 'y');
    expect(getAuditLog()).toHaveLength(2);
  });
  it('resetAudit clears the log', () => {
    logChange('deal', 'd_1', 'stage', 'a', 'b');
    resetAudit();
    expect(getAuditLog()).toHaveLength(0);
  });
});
