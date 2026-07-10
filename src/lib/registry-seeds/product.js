// Canonical Product field registry (spec Section 1.6 - 27 rows; the
// revenueInstallments / installmentPeriod row splits into two fields = 28).
// PriceBook + PriceBookEntry ship in Wave 4.
import { f, sec } from './util.js';

export const PRODUCT_FIELDS = [
  ...sec('Identity', [
    f('name', 'Product name', 'text', { required: true, defaultVisible: true }),
    f('sku', 'SKU', 'text', { defaultVisible: true }),
    f('productCode', 'Product code', 'text'),
    f('description', 'Description', 'textarea'),
    f('family', 'Family', 'picklist', { options: [], storeKey: 'category', defaultVisible: true }),
    f('itemType', 'Item type', 'picklist', { picklist: 'productItemType' }),
    f('isActive', 'Active', 'boolean', { storeKey: 'active', defaultVisible: true }),
    f('isArchived', 'Archived', 'boolean'),
  ]),
  ...sec('Pricing', [
    f('unitLabel', 'Unit', 'picklist', { options: ['Seat', 'User', 'GB', 'Hour', 'Unit'] }),
    f('billingFrequency', 'Billing frequency', 'picklist', { picklist: 'billingFrequency' }),
    f('billingType', 'Billing type', 'picklist', { options: ['Flat', 'Per seat', 'Usage'] }),
    f('price', 'Base list price', 'currency', { defaultVisible: true }),
    f('cost', 'Cost', 'currency'),
    f('directCost', 'Direct cost', 'currency'),
    f('taxCategory', 'Tax category', 'picklist', { options: [] }),
    f('currencyPrices', 'Currency prices', 'sublist'),
    f('defaultTermMonths', 'Default term (months)', 'number'),
  ]),
  ...sec('Structure', [
    f('isBundle', 'Bundle', 'boolean'),
    f('bundleComponents', 'Bundle components', 'sublist'),
    f('variantAxes', 'Variant axes', 'sublist'),
    f('revenueScheduleType', 'Revenue schedule', 'picklist', { options: ['None', 'Divide', 'Repeat'] }),
    f('revenueInstallments', 'Revenue installments', 'number'),
    f('installmentPeriod', 'Installment period', 'picklist', { options: ['Monthly', 'Quarterly', 'Annual'] }),
    f('soldOnlyWithOtherProducts', 'Sold only with other products', 'boolean'),
  ]),
  ...sec('Media and system', [
    f('imageUrl', 'Image URL', 'url'),
    f('externalId', 'External id', 'text'),
    f('ownerId', 'Owner', 'user'),
    f('visibility', 'Visibility', 'picklist', { picklist: 'visibility' }),
  ]),
];
