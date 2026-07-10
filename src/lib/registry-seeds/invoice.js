// Canonical Invoice field registry (spec Section 1.11 - 29 rows; provenance,
// installment, and sent/viewed rows split into individual fields = 34).
import { f, sec } from './util.js';

export const INVOICE_FIELDS = [
  ...sec('Core', [
    f('number', 'Invoice number', 'autoNumber', { computed: true, defaultVisible: true }),
    f('companyId', 'Company', 'link', { linkTarget: 'company', defaultVisible: true }),
    f('contactId', 'Billing contact', 'link', { linkTarget: 'contact' }),
    f('dealId', 'Deal', 'link', { linkTarget: 'deal' }),
    f('quoteId', 'Quote', 'link', { linkTarget: 'quote' }),
    f('orderId', 'Order', 'link', { linkTarget: 'order' }),
    f('contractId', 'Contract', 'link', { linkTarget: 'contract' }),
    f('status', 'Status', 'status', { picklist: 'invoiceStatus', defaultVisible: true }),
    f('issueDate', 'Issue date', 'date', { storeKey: 'issuedAt', defaultVisible: true }),
    f('dueDate', 'Due date', 'date', { storeKey: 'dueAt', defaultVisible: true }),
    f('paymentTerms', 'Payment terms', 'picklist', { picklist: 'paymentTerms' }),
  ]),
  ...sec('Money', [
    f('currency', 'Currency', 'picklist', { options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }),
    f('exchangeRate', 'Exchange rate', 'number'),
    f('subtotal', 'Subtotal', 'currency', { computed: true }),
    f('discountAmount', 'Discount', 'currency'),
    f('taxAmount', 'Tax', 'currency'),
    f('shippingAmount', 'Shipping', 'currency'),
    f('totalAmount', 'Total', 'currency', { computed: true, storeKey: 'amount', defaultVisible: true }),
    f('amountPaid', 'Amount paid', 'currency', { computed: true }),
    f('amountDue', 'Amount due', 'currency', { computed: true }),
    f('paidAt', 'Paid at', 'datetime', { computed: true }),
  ]),
  ...sec('Billing detail', [
    f('billingAddress', 'Billing address', 'address'),
    f('poNumber', 'PO number', 'text'),
    f('memo', 'Memo (printed)', 'text'),
    f('customerMessage', 'Customer message', 'text'),
    f('billingScheduleId', 'Billing schedule', 'link', { linkTarget: 'billingSchedule' }),
    f('installmentNumber', 'Installment number', 'number'),
    f('installmentCount', 'Installment count', 'number'),
    f('recurringProfileId', 'Recurring profile', 'link', { linkTarget: 'recurringProfile' }),
  ]),
  ...sec('Lines and delivery', [
    f('lineItems', 'Line items', 'sublist'),
    f('payments', 'Payments', 'sublist'),
    f('sentAt', 'Sent at', 'datetime', { computed: true }),
    f('viewedAt', 'Viewed at', 'datetime', { computed: true }),
    f('pdfUrl', 'PDF', 'url', { computed: true }),
  ]),
];
