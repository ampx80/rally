// CSV import engine: RFC-4180-ish parsing, header auto-mapping, dedupe runner.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getContacts, getCompanies } from '../lib/store.js';
import { resetExt, getLeads } from '../lib/store-ext.js';
import { resetAudit } from '../lib/audit.js';
import {
  parseCsv, autoMap, targetFields, runImport,
  IMPORT_OBJECTS, importObject, SOURCES,
} from '../lib/importer.js';

beforeEach(() => { resetStore(); resetExt(); resetAudit(); });

describe('parseCsv', () => {
  it('parses headers and trims cell whitespace', () => {
    const { headers, records } = parseCsv('First Name, Email\n Ada , ada@x.com \n');
    expect(headers).toEqual(['First Name', 'Email']);
    expect(records).toEqual([{ 'First Name': 'Ada', Email: 'ada@x.com' }]);
  });
  it('honors quoted fields with embedded commas', () => {
    const { records } = parseCsv('name,location\n"Vertex, Inc","Austin, TX"');
    expect(records[0].name).toBe('Vertex, Inc');
    expect(records[0].location).toBe('Austin, TX');
  });
  it('honors embedded newlines inside quotes', () => {
    const { records } = parseCsv('name,note\n"Acme","line1\nline2"');
    expect(records[0].note).toBe('line1\nline2');
  });
  it('unescapes doubled quotes', () => {
    const { records } = parseCsv('name\n"She said ""hi"""');
    expect(records[0].name).toBe('She said "hi"');
  });
  it('strips a leading BOM from the first header', () => {
    const { headers } = parseCsv('﻿name,email\nA,a@x.com');
    expect(headers[0]).toBe('name');
  });
  it('drops fully blank rows', () => {
    const { records } = parseCsv('name\nA\n\n   \nB');
    expect(records.map(r => r.name)).toEqual(['A', 'B']);
  });
  it('returns empty shape for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], records: [] });
    expect(parseCsv('   \n  ')).toEqual({ headers: [], records: [] });
  });
  it('handles a final field with no trailing newline', () => {
    const { records } = parseCsv('a,b\n1,2');
    expect(records[0]).toEqual({ a: '1', b: '2' });
  });
});

describe('autoMap', () => {
  it('maps known aliases to Ardovo field keys and leaves unknowns blank', () => {
    const map = autoMap('contact', ['First Name', 'Last Name', 'Email Address', 'Job Title', 'Mystery Column']);
    expect(map['First Name']).toBe('firstName');
    expect(map['Last Name']).toBe('lastName');
    expect(map['Email Address']).toBe('email');
    expect(map['Job Title']).toBe('title');
    expect(map['Mystery Column']).toBe('');
  });
  it('never maps two headers onto the same target key', () => {
    const map = autoMap('contact', ['Email', 'E-mail']); // both alias to email
    const hits = Object.values(map).filter(v => v === 'email');
    expect(hits).toHaveLength(1);
  });
  it('maps lead-only fields (company, source) that live outside the registry', () => {
    const map = autoMap('lead', ['Company', 'Source', 'First Name']);
    expect(map['Company']).toBe('company');
    expect(map['Source']).toBe('source');
    expect(map['First Name']).toBe('firstName');
  });
  it('maps company + deal core aliases', () => {
    expect(autoMap('company', ['Account Name', 'Website'])['Account Name']).toBe('name');
    // The deal registry field key is 'amount' (its storeKey is the legacy
    // 'value' column), so a header of "Amount" resolves to the field key.
    expect(autoMap('deal', ['Opportunity Name', 'Amount'])['Opportunity Name']).toBe('name');
    expect(autoMap('deal', ['Amount'])['Amount']).toBe('amount');
  });
});

describe('metadata helpers', () => {
  it('exposes four import objects with dedupe keys', () => {
    expect(IMPORT_OBJECTS.map(o => o.id).sort()).toEqual(['company', 'contact', 'deal', 'lead']);
    expect(importObject('contact').dedupeKey).toBe('email');
    expect(importObject('company').dedupeKey).toBe('name');
  });
  it('targetFields for lead is the fixed store-ext set', () => {
    expect(targetFields('lead').map(f => f.key)).toContain('source');
  });
  it('lists migration sources including salesforce + hubspot', () => {
    const ids = SOURCES.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['generic', 'salesforce', 'hubspot', 'pipedrive', 'google']));
  });
});

describe('runImport', () => {
  const mapping = { 'First Name': 'firstName', 'Last Name': 'lastName', Email: 'email' };
  const rows = [
    { 'First Name': 'Nora', 'Last Name': 'Ives', Email: 'nora@imp.com' },
    { 'First Name': 'Kade', 'Last Name': 'Orr', Email: 'kade@imp.com' },
  ];

  it('creates contacts and returns an accurate summary', () => {
    const before = getContacts().length;
    const res = runImport({ objectType: 'contact', records: rows, mapping });
    expect(res.created).toBe(2);
    expect(res.skipped).toBe(0);
    expect(res.total).toBe(2);
    expect(res.errors).toEqual([]);
    expect(res.createdIds).toHaveLength(2);
    expect(getContacts()).toHaveLength(before + 2);
  });

  it('dedupes by email on a second run', () => {
    runImport({ objectType: 'contact', records: rows, mapping });
    const res = runImport({ objectType: 'contact', records: rows, mapping });
    expect(res.created).toBe(0);
    expect(res.skipped).toBe(2);
  });

  it('dedupes duplicate emails within a single batch', () => {
    const dupRows = [
      { 'First Name': 'Same', 'Last Name': 'One', Email: 'same@imp.com' },
      { 'First Name': 'Same', 'Last Name': 'Two', Email: 'same@imp.com' },
    ];
    const res = runImport({ objectType: 'contact', records: dupRows, mapping });
    expect(res.created).toBe(1);
    expect(res.skipped).toBe(1);
  });

  it('can be told not to dedupe', () => {
    runImport({ objectType: 'contact', records: rows, mapping });
    const res = runImport({ objectType: 'contact', records: rows, mapping, dedupe: false });
    expect(res.created).toBe(2);
  });

  it('skips rows with no identifying data', () => {
    const res = runImport({
      objectType: 'contact',
      records: [{ 'First Name': '', 'Last Name': '', Email: '' }],
      mapping,
    });
    expect(res.created).toBe(0);
    expect(res.skipped).toBe(1);
  });

  it('imports companies, requiring a name', () => {
    const before = getCompanies().length;
    const res = runImport({
      objectType: 'company',
      records: [{ Name: 'Importa Corp' }, { Name: '' }],
      mapping: { Name: 'name' },
    });
    expect(res.created).toBe(1);
    expect(res.skipped).toBe(1);
    expect(getCompanies()).toHaveLength(before + 1);
  });

  it('imports deals with a coerced numeric value', () => {
    const res = runImport({
      objectType: 'deal',
      records: [{ Name: 'Imported Deal', Amount: '$25,000', Stage: 'proposal' }],
      mapping: { Name: 'name', Amount: 'value', Stage: 'stage' },
    });
    expect(res.created).toBe(1);
  });

  it('imports leads through the store-ext writer', () => {
    const before = getLeads().length;
    const res = runImport({
      objectType: 'lead',
      records: [{ 'First Name': 'Lena', Company: 'Leadco', Email: 'lena@leadco.com' }],
      mapping: { 'First Name': 'firstName', Company: 'company', Email: 'email' },
    });
    expect(res.created).toBe(1);
    expect(getLeads()).toHaveLength(before + 1);
  });
});
