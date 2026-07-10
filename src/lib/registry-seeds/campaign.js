// Canonical Campaign field registry (spec Section 1.7 - 33 fields; the UTM
// and formViews/formSubmissions rows split into individual fields).
// CampaignMember ships as its own table in a later wave.
import { f, sec } from './util.js';

export const CAMPAIGN_FIELDS = [
  ...sec('Core', [
    f('name', 'Campaign name', 'text', { required: true, defaultVisible: true }),
    f('type', 'Type', 'picklist', { picklist: 'campaignType', storeKey: 'channel', defaultVisible: true }),
    f('status', 'Status', 'picklist', { picklist: 'campaignStatus', defaultVisible: true }),
    f('isActive', 'Active', 'boolean'),
    f('description', 'Description', 'textarea'),
    f('startDate', 'Start date', 'date', { storeKey: 'startAt', defaultVisible: true }),
    f('endDate', 'End date', 'date'),
    f('parentCampaignId', 'Parent campaign', 'link', { linkTarget: 'campaign' }),
    f('ownerId', 'Owner', 'user'),
  ]),
  ...sec('Budget and reach', [
    f('budgetedCost', 'Budgeted cost', 'currency', { storeKey: 'budget' }),
    f('actualCost', 'Actual cost', 'currency'),
    f('expectedRevenue', 'Expected revenue', 'currency'),
    f('expectedResponsePct', 'Expected response %', 'percent'),
    f('numberSent', 'Number sent', 'number', { storeKey: 'sent' }),
    f('audienceDescription', 'Audience description', 'text'),
  ]),
  ...sec('Attribution', [
    f('utmCampaign', 'UTM campaign', 'text'),
    f('utmSource', 'UTM source', 'text'),
    f('utmMedium', 'UTM medium', 'text'),
  ]),
  ...sec('Rollups', [
    f('membersCount', 'Members', 'rollup', { computed: true }),
    f('respondedCount', 'Responded', 'rollup', { computed: true }),
    f('leadsGeneratedCount', 'Leads generated', 'rollup', { computed: true, storeKey: 'leads' }),
    f('qualifiedCount', 'Qualified', 'rollup', { computed: true }),
    f('dealsCount', 'Deals', 'rollup', { computed: true }),
    f('wonDealsCount', 'Won deals', 'rollup', { computed: true }),
    f('pipelineValue', 'Pipeline value', 'currency', { computed: true }),
    f('wonValue', 'Won value', 'currency', { computed: true, storeKey: 'revenue' }),
    f('emailsDelivered', 'Emails delivered', 'number', { computed: true }),
    f('uniqueOpens', 'Unique opens', 'number', { computed: true, storeKey: 'opened' }),
    f('uniqueClicks', 'Unique clicks', 'number', { computed: true, storeKey: 'clicked' }),
    f('formViews', 'Form views', 'number', { computed: true }),
    f('formSubmissions', 'Form submissions', 'number', { computed: true }),
    f('roi', 'ROI', 'percent', { computed: true }),
    f('hierarchyRollups', 'Hierarchy rollups', 'json', { computed: true }),
  ]),
];
