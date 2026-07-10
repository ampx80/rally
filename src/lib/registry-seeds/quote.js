// Canonical Quote header field registry (spec Section 1.5 - 46 rows; the
// viewedAt / viewCount row splits into two fields = 47). Quote line items and
// sub-objects (quoteDocument, quoteEvent, quoteAttachment) ship in Wave 4.
import { f, sec } from './util.js';

export const QUOTE_FIELDS = [
  ...sec('Core', [
    f('name', 'Quote name', 'text'),
    f('number', 'Quote number', 'autoNumber', { computed: true, defaultVisible: true }),
    f('dealId', 'Deal', 'link', { linkTarget: 'deal', defaultVisible: true }),
    f('companyId', 'Company', 'link', { linkTarget: 'company', defaultVisible: true }),
    f('contactId', 'Recipient contact', 'link', { linkTarget: 'contact' }),
    f('billToContactId', 'Bill-to contact', 'link', { linkTarget: 'contact' }),
    f('status', 'Status', 'status', { picklist: 'quoteStatus', defaultVisible: true }),
    f('isPrimary', 'Primary (synced to deal)', 'boolean'),
    f('issueDate', 'Issue date', 'date', { storeKey: 'createdAt' }),
    f('expiresAt', 'Expires', 'date', { defaultVisible: true }),
    f('effectiveDate', 'Effective date', 'date'),
    f('termMonths', 'Term (months)', 'number', { computed: true }),
    f('currency', 'Currency', 'picklist', { options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }),
    f('exchangeRate', 'Exchange rate', 'number'),
    f('priceBookId', 'Price book', 'link', { linkTarget: 'priceBook' }),
    f('ownerId', 'Owner', 'user', { defaultVisible: true }),
  ]),
  ...sec('Content', [
    f('description', 'Description', 'textarea'),
    f('coverLetter', 'Cover letter', 'richtext'),
    f('executiveSummary', 'Executive summary', 'richtext'),
    f('terms', 'Terms and conditions', 'richtext'),
    f('customerMessage', 'Customer message', 'text'),
    f('poNumber', 'PO number', 'text'),
  ]),
  ...sec('Money', [
    f('subtotal', 'Subtotal', 'currency', { computed: true }),
    f('discountPercent', 'Discount %', 'percent'),
    f('discountAmount', 'Discount amount', 'currency'),
    f('totalPrice', 'Total price', 'currency', { computed: true }),
    f('taxAmount', 'Tax', 'currency'),
    f('shippingAmount', 'Shipping and handling', 'currency'),
    f('grandTotal', 'Grand total', 'currency', { computed: true, storeKey: 'amount', defaultVisible: true }),
  ]),
  ...sec('Addresses', [
    f('billingAddress', 'Billing address', 'address'),
    f('shippingAddress', 'Shipping address', 'address'),
    f('quoteToAddress', 'Quote-to address', 'address'),
    f('taxIds', 'Tax IDs', 'text', { multi: true }),
  ]),
  ...sec('Payment and signature', [
    f('paymentTerms', 'Payment terms', 'picklist', { picklist: 'paymentTerms' }),
    f('collectPayment', 'Collect payment', 'boolean'),
    f('paymentMethods', 'Payment methods', 'multiPicklist', { options: ['Card', 'ACH'] }),
    f('acceptanceMethod', 'Acceptance method', 'picklist', { options: ['E-signature', 'Print and sign', 'No signature'] }),
    f('signerContactIds', 'Signers', 'link', { linkTarget: 'contact', multi: true }),
    f('countersignerUserId', 'Countersigner', 'user'),
    f('signedAt', 'Signed at', 'datetime', { computed: true }),
  ]),
  ...sec('Approval and sharing', [
    f('approvalStatus', 'Approval status', 'picklist', { options: ['None', 'Pending', 'Approved', 'Rejected'] }),
    f('approverNotes', 'Approver notes', 'text'),
    f('publicUrl', 'Public URL', 'url', { computed: true }),
    f('passwordProtected', 'Password protected', 'boolean'),
    f('viewedAt', 'Last viewed', 'datetime', { computed: true }),
    f('viewCount', 'View count', 'number', { computed: true }),
    f('language', 'Language / locale', 'picklist', { options: [] }),
  ]),
];
