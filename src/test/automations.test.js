// Automation engine: simulation, condition operators, test runner, rule CRUD.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getDeals } from '../lib/store.js';
import { resetAutomations } from '../lib/automations.js';
import {
  getAutomations, getAutomation, evaluateAutomation, testAutomation,
  saveAutomation, toggleAutomation, deleteAutomation, duplicateAutomation, addTemplate,
  triggerSummary, actionSummary, conditionSummaries, minutesPerRun, recordLabel,
  TRIGGERS, TRIGGER_LIST, ACTIONS, OPERATORS, TEMPLATES, runsTotal,
} from '../lib/automations.js';

beforeEach(() => { resetStore(); resetAutomations(); });

describe('vocabulary', () => {
  it('exposes triggers, actions and operators', () => {
    expect(TRIGGER_LIST.length).toBeGreaterThan(0);
    expect(TRIGGERS.deal_value_over.object).toBe('deal');
    expect(ACTIONS.create_task.id).toBe('create_task');
    expect(OPERATORS.gt.types).toContain('number');
  });
  it('ships a seeded rule library', () => {
    expect(getAutomations().length).toBeGreaterThanOrEqual(6);
    expect(getAutomation('au_won_onboarding')).toBeTruthy();
    expect(runsTotal()).toBeGreaterThan(0);
  });
});

describe('evaluateAutomation (read-only simulation)', () => {
  it('counts candidate deals over an amount threshold', () => {
    const a = { trigger: { type: 'deal_value_over', config: { amount: 100000 } }, conditions: [] };
    const { matched, total, object } = evaluateAutomation(a);
    expect(object).toBe('deal');
    expect(matched.length).toBeLessThanOrEqual(total);
    expect(matched.every(d => d.status === 'open' && Number(d.value) > 100000)).toBe(true);
  });
  it('applies a numeric gt condition on top of the trigger pool', () => {
    const a = {
      trigger: { type: 'deal_value_over', config: { amount: 100000 } },
      conditions: [{ field: 'value', op: 'gt', value: 200000 }],
    };
    const { matched } = evaluateAutomation(a);
    expect(matched.every(d => Number(d.value) > 200000)).toBe(true);
  });
  it('applies a text eq condition (stage)', () => {
    const a = {
      trigger: { type: 'deal_created', config: {} },
      conditions: [{ field: 'stage', op: 'eq', value: 'negotiation' }],
    };
    const { matched } = evaluateAutomation(a);
    expect(matched.every(d => d.stage === 'negotiation')).toBe(true);
    // the seeded flagship deal is in negotiation, so there is at least one
    expect(matched.length).toBeGreaterThan(0);
  });
  it('returns an empty result for an unknown trigger', () => {
    expect(evaluateAutomation({ trigger: { type: 'nope' } }).matched).toEqual([]);
  });
});

describe('testAutomation (executes against a live record)', () => {
  it('fires the negotiation follow-up and creates a real task', () => {
    const res = testAutomation('au_negotiation_followup');
    expect(res.ok).toBe(true);
    expect(res.object).toBe('deal');
    expect(res.actionsRun.some(a => a.type === 'create_task' && a.ok)).toBe(true);
  });
  it('bumps the run counter', () => {
    const before = getAutomation('au_negotiation_followup').runs;
    testAutomation('au_negotiation_followup');
    expect(getAutomation('au_negotiation_followup').runs).toBe(before + 1);
  });
  it('fails cleanly for a missing automation', () => {
    expect(testAutomation('au_missing')).toMatchObject({ ok: false });
  });
});

describe('rule CRUD', () => {
  it('saveAutomation inserts a new rule and returns its id', () => {
    const before = getAutomations().length;
    const id = saveAutomation({ name: 'Brand new', trigger: { type: 'deal_created', config: {} }, actions: [] });
    expect(getAutomations()).toHaveLength(before + 1);
    expect(getAutomation(id).name).toBe('Brand new');
  });
  it('saveAutomation updates an existing rule in place', () => {
    const before = getAutomations().length;
    saveAutomation({ id: 'au_won_onboarding', name: 'Renamed onboarding' });
    expect(getAutomations()).toHaveLength(before); // no new row
    expect(getAutomation('au_won_onboarding').name).toBe('Renamed onboarding');
  });
  it('toggleAutomation flips active', () => {
    const before = getAutomation('au_won_onboarding').active;
    toggleAutomation('au_won_onboarding');
    expect(getAutomation('au_won_onboarding').active).toBe(!before);
  });
  it('duplicateAutomation clones as inactive with reset counters', () => {
    const copyId = duplicateAutomation('au_won_onboarding');
    const copy = getAutomation(copyId);
    expect(copy.active).toBe(false);
    expect(copy.runs).toBe(0);
    expect(copy.name).toMatch(/\(copy\)$/);
  });
  it('deleteAutomation removes a rule', () => {
    const before = getAutomations().length;
    deleteAutomation('au_won_onboarding');
    expect(getAutomations()).toHaveLength(before - 1);
    expect(getAutomation('au_won_onboarding')).toBeUndefined();
  });
  it('addTemplate materializes a template into an active rule', () => {
    const id = addTemplate(TEMPLATES[0]);
    expect(getAutomation(id).active).toBe(true);
    expect(getAutomation(id).trigger.type).toBe(TEMPLATES[0].trigger.type);
  });
});

describe('human-readable summaries', () => {
  it('triggerSummary formats a value-over trigger with money', () => {
    const a = { trigger: { type: 'deal_value_over', config: { amount: 100000 } } };
    expect(triggerSummary(a)).toMatch(/100K/);
  });
  it('actionSummary describes a create_task action', () => {
    expect(actionSummary({ type: 'create_task', config: { subject: 'Ping', dueDays: 2 } }))
      .toMatch(/Create task "Ping"/);
  });
  it('conditionSummaries renders each condition', () => {
    const a = {
      trigger: { type: 'deal_created', config: {} },
      conditions: [{ field: 'value', op: 'gt', value: 50000 }],
    };
    expect(conditionSummaries(a)[0]).toMatch(/Deal value/);
  });
  it('minutesPerRun sums per-action minutes', () => {
    const a = { actions: [{ type: 'create_task' }, { type: 'notify_owner' }] };
    const expected = ACTIONS.create_task.minutes + ACTIONS.notify_owner.minutes;
    expect(minutesPerRun(a)).toBe(expected);
  });
  it('recordLabel names deals, contacts and activities', () => {
    expect(recordLabel({ name: 'Big Deal' }, 'deal')).toBe('Big Deal');
    expect(recordLabel({ firstName: 'A', lastName: 'B' }, 'contact')).toBe('A B');
    expect(recordLabel({ subject: 'Call' }, 'activity')).toBe('Call');
  });
});
