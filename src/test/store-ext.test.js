// Platform-extension store: leads, quotes, invoices, derived AR/campaign math.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getCompanies } from '../lib/store.js';
import {
  resetExt, getLeads, getQuotes, getInvoices, getProducts,
  createLead, updateLead, createQuote, updateQuote,
  updateTicket, toggleWorkflow, updateInvoice,
  arOutstanding, arOverdue, arPaid, campaignRevenue, campaignLeads,
  openTickets, qualifiedLeads,
} from '../lib/store-ext.js';

beforeEach(() => { resetStore(); resetExt(); });

describe('createLead', () => {
  it('requires a first name', () => {
    expect(createLead({ firstName: '' }).error).toBe('firstName');
  });
  it('creates a lead with a composed name and defaults', () => {
    const before = getLeads().length;
    const r = createLead({ firstName: 'Pat', lastName: 'Ling', company: 'Ling Co' });
    expect(r.lead.name).toBe('Pat Ling');
    expect(r.lead.status).toBe('new');
    expect(r.lead.source).toBe('Inbound');
    expect(getLeads()).toHaveLength(before + 1);
    expect(getLeads()[0].id).toBe(r.lead.id);
  });
  it('updateLead patches and errors on a missing id', () => {
    const { lead } = createLead({ firstName: 'Upd' });
    expect(updateLead(lead.id, { status: 'qualified' }).lead.status).toBe('qualified');
    expect(updateLead('l_missing', { status: 'x' }).error).toBe('missing');
  });
});

describe('createQuote', () => {
  it('requires a companyId', () => {
    expect(createQuote({}).error).toBe('companyId');
  });
  it('assigns a monotonically increasing quote number and resolves the account name', () => {
    const co = getCompanies()[0];
    const highest = getQuotes()
      .map(q => parseInt(String(q.number).replace(/\D/g, ''), 10))
      .filter(Number.isFinite);
    const expectedNext = (highest.length ? Math.max(...highest) : 2400) + 1;
    const r = createQuote({ companyId: co.id, amount: 12000, seats: 40 });
    expect(r.quote.number).toBe('Q-' + expectedNext);
    expect(r.quote.companyName).toBe(co.name);
    expect(r.quote.amount).toBe(12000);
  });
  it('coerces amount/seats to numbers and defaults status to draft', () => {
    const co = getCompanies()[0];
    const r = createQuote({ companyId: co.id, amount: '999', seats: '3' });
    expect(r.quote.amount).toBe(999);
    expect(r.quote.seats).toBe(3);
    expect(r.quote.status).toBe('draft');
  });
  it('updateQuote errors on a missing id', () => {
    expect(updateQuote('q_missing', { status: 'sent' }).error).toBe('missing');
  });
});

describe('light writers', () => {
  it('updateTicket / toggleWorkflow / updateInvoice error on missing ids', () => {
    expect(updateTicket('tk_missing', {}).error).toBe('missing');
    expect(toggleWorkflow('wf_missing').error).toBe('missing');
    expect(updateInvoice('inv_missing', {}).error).toBe('missing');
  });
});

describe('derived money + funnel selectors', () => {
  it('arOutstanding = open + overdue invoice totals', () => {
    const expected = getInvoices()
      .filter(i => i.status === 'open' || i.status === 'overdue')
      .reduce((s, i) => s + i.amount, 0);
    expect(arOutstanding()).toBe(expected);
  });
  it('arOverdue is a subset of arOutstanding', () => {
    expect(arOverdue()).toBeLessThanOrEqual(arOutstanding());
  });
  it('arPaid sums only paid invoices', () => {
    const expected = getInvoices().filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    expect(arPaid()).toBe(expected);
  });
  it('campaign roll-ups match the seeded campaigns', () => {
    expect(campaignRevenue()).toBeGreaterThan(0);
    expect(campaignLeads()).toBeGreaterThan(0);
  });
  it('openTickets excludes solved, qualifiedLeads are all qualified', () => {
    expect(openTickets().every(t => t.status !== 'solved')).toBe(true);
    expect(qualifiedLeads().every(l => l.status === 'qualified')).toBe(true);
  });
  it('seeds a product catalog with sku + price', () => {
    const products = getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('sku');
    expect(typeof products[0].price).toBe('number');
  });
});
