// Store CRUD + validation + derived selectors + audit integration.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetStore, getState, getCompany, getContact, getDeal,
  createCompany, updateCompany,
  createContact, updateContact,
  createDeal, updateDeal, moveDealStage,
  createActivity, toggleActivity, updateActivity,
  getActivitiesForRecord, stageById, STAGES, OPEN_STAGES,
  openDeals, pipelineValue, weightedForecast, winRate, dealsByStage,
} from '../lib/store.js';
import { resetAudit, getAudit } from '../lib/audit.js';

beforeEach(() => { resetStore(); resetAudit(); });

describe('static config', () => {
  it('has 7 ordered stages with won at probability 100 and lost at 0', () => {
    expect(STAGES).toHaveLength(7);
    expect(stageById('won').probability).toBe(100);
    expect(stageById('lost').probability).toBe(0);
    expect(OPEN_STAGES.every(s => s.type === 'open')).toBe(true);
    expect(stageById('nope')).toBeUndefined();
  });
});

describe('createCompany', () => {
  it('creates a company and prepends it to state', () => {
    const before = getState().companies.length;
    const r = createCompany({ name: '  Acme Rockets  ', industry: 'Aerospace' });
    expect(r.error).toBeUndefined();
    expect(r.company.name).toBe('Acme Rockets'); // trimmed
    expect(r.company.industry).toBe('Aerospace');
    expect(r.company.domain).toBe('acmerockets.com'); // derived
    expect(getState().companies).toHaveLength(before + 1);
    expect(getState().companies[0].id).toBe(r.company.id); // prepended
    expect(getCompany(r.company.id)).toBeTruthy();
  });
  it('rejects a blank name with a field-scoped error', () => {
    const r = createCompany({ name: '   ' });
    expect(r).toEqual({ error: 'name', message: expect.any(String) });
    expect(r.company).toBeUndefined();
  });
  it('applies sensible defaults', () => {
    const r = createCompany({ name: 'Defaults Co' });
    expect(r.company.industry).toBe('SaaS');
    expect(r.company.size).toBe('51-200');
    expect(r.company.health).toBe('green');
    expect(r.company.lifecycleStage).toBe('lead');
  });
});

describe('updateCompany + audit', () => {
  it('patches a field and writes an audit entry for the change', () => {
    const { company } = createCompany({ name: 'Auditable Inc', health: 'green' });
    const r = updateCompany(company.id, { health: 'red' });
    expect(r.company.health).toBe('red');
    const log = getAudit('company', company.id);
    const healthChange = log.find(e => e.field === 'health');
    expect(healthChange).toMatchObject({ from: 'green', to: 'red', objectType: 'company' });
  });
  it('does not log when the value is unchanged', () => {
    const { company } = createCompany({ name: 'Nochange Inc', health: 'green' });
    updateCompany(company.id, { health: 'green' });
    expect(getAudit('company', company.id).filter(e => e.field === 'health')).toHaveLength(0);
  });
  it('errors on a missing company', () => {
    expect(updateCompany('co_does_not_exist', { health: 'red' }).error).toBe('missing');
  });
  it('persists registry-driven fieldValues through the patch', () => {
    const { company } = createCompany({ name: 'Custom Fields Co' });
    updateCompany(company.id, { fieldValues: { annualRevenue: 5000000 } });
    expect(getCompany(company.id).fieldValues.annualRevenue).toBe(5000000);
  });
});

describe('createContact', () => {
  it('requires a first name', () => {
    expect(createContact({ firstName: '' }).error).toBe('firstName');
  });
  it('derives email from the company domain when omitted', () => {
    const { company } = createCompany({ name: 'Mailco', domain: 'mailco.com' });
    const r = createContact({ firstName: 'Dana', lastName: 'Vale', companyId: company.id });
    expect(r.contact.email).toBe('dana.vale@mailco.com');
    expect(r.contact.lifecycleStage).toBe(company.lifecycleStage);
  });
  it('orphan contact (no company) defaults lifecycleStage to lead', () => {
    const r = createContact({ firstName: 'Solo' });
    expect(r.contact.companyId).toBeNull();
    expect(r.contact.lifecycleStage).toBe('lead');
  });
});

describe('createDeal validation', () => {
  it('requires a name', () => {
    expect(createDeal({ name: '', value: 1000 }).error).toBe('name');
  });
  it('rejects a negative or non-numeric value', () => {
    expect(createDeal({ name: 'Bad', value: -5 }).error).toBe('value');
    expect(createDeal({ name: 'Bad', value: 'abc' }).error).toBe('value');
  });
  it('creates an open deal with stage-derived probability + status', () => {
    const r = createDeal({ name: 'New Logo', value: 50000, stage: 'proposal' });
    expect(r.deal.probability).toBe(stageById('proposal').probability);
    expect(r.deal.status).toBe('open');
  });
  it('a won stage yields a won status', () => {
    const r = createDeal({ name: 'Closed', value: 10000, stage: 'won' });
    expect(r.deal.status).toBe('won');
  });
  it('an unknown stage falls back to lead', () => {
    const r = createDeal({ name: 'Fallback', value: 10000, stage: 'bogus' });
    expect(r.deal.stage).toBe('lead');
  });
});

describe('updateDeal + moveDealStage', () => {
  it('validates value on update', () => {
    const { deal } = createDeal({ name: 'Movable', value: 1000 });
    expect(updateDeal(deal.id, { value: -1 }).error).toBe('value');
    expect(updateDeal(deal.id, { value: 2000 }).deal.value).toBe(2000);
  });
  it('moveDealStage updates stage, probability, status and logs a system note', () => {
    const { deal } = createDeal({ name: 'Progressing', value: 1000, stage: 'lead' });
    const r = moveDealStage(deal.id, 'won');
    expect(r.deal.stage).toBe('won');
    expect(r.deal.status).toBe('won');
    expect(r.deal.probability).toBe(100);
    const acts = getActivitiesForRecord('deal', deal.id);
    expect(acts.some(a => a.system && /Stage moved/.test(a.subject))).toBe(true);
  });
  it('moveDealStage is silent when asked', () => {
    const { deal } = createDeal({ name: 'Quiet', value: 1000, stage: 'lead' });
    moveDealStage(deal.id, 'qualified', { silent: true });
    expect(getActivitiesForRecord('deal', deal.id).some(a => a.system)).toBe(false);
  });
  it('rejects an unknown stage', () => {
    const { deal } = createDeal({ name: 'X', value: 1 });
    expect(moveDealStage(deal.id, 'nope').error).toBe('stage');
  });
});

describe('activities', () => {
  it('requires a subject', () => {
    expect(createActivity({ type: 'task', subject: '' }).error).toBe('subject');
  });
  it('toggles done and errors on a missing id', () => {
    const { activity } = createActivity({ type: 'task', subject: 'Ring back' });
    expect(activity.done).toBe(false);
    expect(toggleActivity(activity.id).activity.done).toBe(true);
    expect(toggleActivity(activity.id).activity.done).toBe(false);
    expect(toggleActivity('a_missing').error).toBe('missing');
  });
  it('updateActivity merges a patch', () => {
    const { activity } = createActivity({ type: 'task', subject: 'Edit me' });
    expect(updateActivity(activity.id, { subject: 'Edited' }).activity.subject).toBe('Edited');
  });
});

describe('derived selectors', () => {
  it('pipelineValue equals the sum of open deal values', () => {
    const sum = openDeals().reduce((s, d) => s + d.value, 0);
    expect(pipelineValue()).toBe(sum);
  });
  it('weightedForecast never exceeds pipelineValue', () => {
    expect(weightedForecast()).toBeLessThanOrEqual(pipelineValue());
  });
  it('winRate is a 0..100 integer', () => {
    const wr = winRate();
    expect(wr).toBeGreaterThanOrEqual(0);
    expect(wr).toBeLessThanOrEqual(100);
    expect(Number.isInteger(wr)).toBe(true);
  });
  it('dealsByStage buckets every stage id', () => {
    const map = dealsByStage();
    for (const s of STAGES) expect(Array.isArray(map[s.id])).toBe(true);
  });
});
