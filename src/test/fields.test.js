// Field registry engine: reads, custom-field CRUD, value patch logic, validation.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetFields, getFields, getField, getSystemFields, getCustomFields,
  addCustomField, updateCustomField, removeCustomField,
  getFieldValue, setFieldValue, validateValue, getFieldSections,
  FIELD_TYPES, CUSTOM_FIELD_TYPES, typeHasOptions, OBJECT_TYPES,
} from '../lib/fields.js';

beforeEach(() => { resetFields(); });

describe('registry reads', () => {
  it('getFields merges system fields first, then custom', () => {
    const sysCount = getSystemFields('contact').length;
    addCustomField('contact', { label: 'Favorite Color', type: 'text' });
    const all = getFields('contact');
    expect(all.length).toBe(sysCount + 1);
    expect(all[all.length - 1].label).toBe('Favorite Color');
    expect(getCustomFields('contact')).toHaveLength(1);
  });
  it('getField finds by key', () => {
    expect(getField('deal', 'amount').storeKey).toBe('value');
    expect(getField('deal', 'nope')).toBeUndefined();
  });
  it('getFieldSections groups fields under section headers', () => {
    const sections = getFieldSections('contact');
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]).toHaveProperty('section');
    expect(Array.isArray(sections[0].fields)).toBe(true);
  });
  it('systemOnly types are excluded from the custom-field creator list', () => {
    expect(FIELD_TYPES.some(t => t.systemOnly)).toBe(true);
    expect(CUSTOM_FIELD_TYPES.some(t => t.systemOnly)).toBe(false);
    expect(typeHasOptions('picklist')).toBe(true);
    expect(typeHasOptions('text')).toBe(false);
  });
});

describe('addCustomField', () => {
  it('rejects an unknown object type', () => {
    expect(addCustomField('galaxy', { label: 'X', type: 'text' }).error).toBe('objectType');
  });
  it('requires a label', () => {
    expect(addCustomField('contact', { label: '  ', type: 'text' }).error).toBe('label');
  });
  it('requires a valid, non-systemOnly type', () => {
    expect(addCustomField('contact', { label: 'X', type: 'nope' }).error).toBe('type');
    expect(addCustomField('contact', { label: 'X', type: 'json' }).error).toBe('type'); // systemOnly
  });
  it('camelizes the label into a key', () => {
    const r = addCustomField('contact', { label: 'Preferred Contact Method', type: 'text' });
    expect(r.field.key).toBe('preferredContactMethod');
  });
  it('avoids key collisions by appending a number', () => {
    const a = addCustomField('company', { label: 'Region', type: 'text' });
    const b = addCustomField('company', { label: 'Region', type: 'text' });
    expect(a.field.key).toBe('region');
    expect(b.field.key).not.toBe('region');
    expect(b.field.key).toMatch(/^region\d+$/);
  });
  it('attaches options only to option-bearing types', () => {
    const pick = addCustomField('deal', { label: 'Tier', type: 'picklist', options: ['A', 'B'] });
    expect(pick.field.options).toEqual(['A', 'B']);
    const txt = addCustomField('deal', { label: 'Memo', type: 'text' });
    expect(txt.field.options).toBeUndefined();
  });
});

describe('updateCustomField + removeCustomField', () => {
  it('updates only whitelisted keys and re-trims the label', () => {
    const { field } = addCustomField('contact', { label: 'Old', type: 'text' });
    const r = updateCustomField('contact', field.id, { label: '  New Label  ', bogus: 'ignored' });
    expect(r.field.label).toBe('New Label');
    expect(r.field.bogus).toBeUndefined();
  });
  it('errors on a missing custom field', () => {
    expect(updateCustomField('contact', 'cf_missing', { label: 'X' }).error).toBe('missing');
    expect(removeCustomField('contact', 'cf_missing').error).toBe('missing');
  });
  it('removes a custom field', () => {
    const { field } = addCustomField('contact', { label: 'Temp', type: 'text' });
    expect(removeCustomField('contact', field.id).ok).toBe(true);
    expect(getCustomFields('contact')).toHaveLength(0);
  });
});

describe('setFieldValue / getFieldValue patch logic', () => {
  it('storeKey-backed field patches the legacy column', () => {
    const dealRecord = { value: 1000, name: 'D' };
    const amount = getField('deal', 'amount'); // storeKey: value
    expect(setFieldValue(dealRecord, amount, 5000)).toEqual({ value: 5000 });
    expect(getFieldValue(dealRecord, amount)).toBe(1000);
  });
  it('a field whose key is a record column patches that column', () => {
    const dealRecord = { name: 'D', probability: 20 };
    const prob = getField('deal', 'probability');
    expect(setFieldValue(dealRecord, prob, 55)).toEqual({ probability: 55 });
  });
  it('an unmapped field lands in fieldValues', () => {
    const contactRecord = { firstName: 'A' };
    const custom = addCustomField('contact', { label: 'Shoe Size', type: 'number' }).field;
    expect(setFieldValue(contactRecord, custom, 11)).toEqual({ fieldValues: { shoeSize: 11 } });
    const withVals = { firstName: 'A', fieldValues: { shoeSize: 11 } };
    expect(getFieldValue(withVals, custom)).toBe(11);
  });
  it('returns empty for a null record or field', () => {
    expect(setFieldValue(null, {}, 1)).toEqual({});
    expect(getFieldValue(null, {})).toBeUndefined();
  });
});

describe('validateValue', () => {
  const fd = (type, extra = {}) => ({ key: 'x', label: 'X', type, ...extra });
  it('flags a required empty value but allows optional empty', () => {
    expect(validateValue(fd('text', { required: true }), '').ok).toBe(false);
    expect(validateValue(fd('text'), '').ok).toBe(true);
  });
  it('validates numbers', () => {
    expect(validateValue(fd('number'), '42').ok).toBe(true);
    expect(validateValue(fd('number'), 'abc').ok).toBe(false);
  });
  it('bounds percent to 0..100 and rating to 0..5', () => {
    expect(validateValue(fd('percent'), 50).ok).toBe(true);
    expect(validateValue(fd('percent'), 150).ok).toBe(false);
    expect(validateValue(fd('rating'), 6).ok).toBe(false);
  });
  it('validates email + phone + url shapes', () => {
    expect(validateValue(fd('email'), 'a@b.com').ok).toBe(true);
    expect(validateValue(fd('email'), 'nope').ok).toBe(false);
    expect(validateValue(fd('phone'), '(555) 123-4567').ok).toBe(true);
    expect(validateValue(fd('phone'), '123').ok).toBe(false);
    expect(validateValue(fd('url'), 'https://rally.app').ok).toBe(true);
  });
  it('enforces picklist membership when options exist', () => {
    const pick = fd('picklist', { options: ['red', 'blue'] });
    expect(validateValue(pick, 'red').ok).toBe(true);
    expect(validateValue(pick, 'green').ok).toBe(false);
  });
  it('unknown field def is not ok', () => {
    expect(validateValue(null, 'x').ok).toBe(false);
  });
});

describe('object types', () => {
  it('exposes the nine object registries', () => {
    expect(OBJECT_TYPES.map(o => o.id)).toEqual(
      expect.arrayContaining(['contact', 'company', 'deal', 'quote', 'product', 'campaign', 'ticket', 'activity', 'invoice']),
    );
  });
});
