// ============================================================
// ARDOVO PICKLIST LIBRARY  (spec: ARDOVO_PARITY_MAP.md Section 2)
// Every canonical picklist with its seed values. All picklists
// are org-editable (add/rename/reorder/deactivate) EXCEPT the
// ones marked restricted (system logic depends on them).
// Stage-typed picklists (stage: true) generate per-value
// entered/exited/elapsed timestamps and support kanban grouping.
// Deal pipeline stages (Section 2.6) live in store.js STAGES as
// per-pipeline config, not here.
// ASCII hyphens only in this file and everywhere in Ardovo.
// ============================================================

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const pl = (labels) => labels.map(l => (typeof l === 'string' ? { id: slug(l), label: l } : l));

/* 2.1 Industry - the 32-value Salesforce standard list (contact + company) */
export const INDUSTRIES = pl([
  'Agriculture', 'Apparel', 'Banking', 'Biotechnology', 'Chemicals', 'Communications',
  'Construction', 'Consulting', 'Education', 'Electronics', 'Energy', 'Engineering',
  'Entertainment', 'Environmental', 'Finance', 'Food and Beverage', 'Government',
  'Healthcare', 'Hospitality', 'Insurance', 'Machinery', 'Manufacturing', 'Media',
  'Not For Profit', 'Recreation', 'Retail', 'Shipping', 'Technology', 'Telecommunications',
  'Transportation', 'Utilities', 'Other',
]);

/* 2.2 Lifecycle stage (STAGE, contact + company) - the single-entity status model */
export const LIFECYCLE_STAGES = [
  { id: 'subscriber', label: 'Subscriber' },
  { id: 'lead', label: 'Lead' },
  { id: 'mql', label: 'MQL' },
  { id: 'sql', label: 'SQL' },
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'customer', label: 'Customer' },
  { id: 'evangelist', label: 'Evangelist' },
  { id: 'other', label: 'Other' },
];

/* 2.3 Lead status */
export const LEAD_STATUS = pl([
  'New', 'Attempting to contact', 'Contacted', 'Engaged', 'Nurture', 'Qualified', 'Unqualified',
]);

/* 2.4 Lead source (contact, company, deal) */
export const LEAD_SOURCE = pl([
  'Website', 'Web form', 'Organic search', 'Paid search', 'Paid social', 'Organic social',
  'Email marketing', 'Event', 'Webinar', 'Referral', 'Partner', 'Outbound', 'Purchased list',
  'Chat', 'Phone inquiry', 'Direct', 'Other',
]);

/* 2.5 Unqualified reason */
export const UNQUALIFIED_REASONS = pl([
  'No budget', 'No authority', 'No need', 'Bad timing', 'Wrong fit / not ICP',
  'Competitor customer', 'Unresponsive', 'Spam / junk', 'Duplicate',
]);

/* 2.7 Forecast category (restricted) */
export const FORECAST_CATEGORIES = [
  { id: 'omitted', label: 'Omitted' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'best_case', label: 'Best case' },
  { id: 'commit', label: 'Commit' },
  { id: 'closed', label: 'Closed' },
];

/* 2.8 Quote status (restricted transitions) */
export const QUOTE_STATUS = pl([
  'Draft', 'Pending approval', 'Approved', 'Rejected', 'Published', 'Viewed',
  'Accepted', 'Signed', 'Expired', 'Voided', 'Archived',
]);

/* 2.9 Deal type */
export const DEAL_TYPES = pl([
  'New business', 'Existing business - expansion', 'Existing business - renewal',
  'Existing business - upgrade', 'Existing business - downgrade', 'Existing business - replacement',
]);

/* 2.10 Product item type */
export const PRODUCT_ITEM_TYPES = pl([
  'Service', 'Subscription', 'License / seat', 'Physical good', 'Digital good',
  'Bundle (own price)', 'Group (sum of parts)', 'Usage / metered', 'Fee / other charge',
  'Discount line', 'Description line',
]);

/* 2.11 Campaign type */
export const CAMPAIGN_TYPES = pl([
  'Email', 'Webinar', 'Event / conference', 'Trade show', 'Advertisement', 'Paid social',
  'Paid search', 'Direct mail', 'Telemarketing', 'PR', 'Partner / co-marketing',
  'Referral program', 'ABM', 'Content / nurture', 'Other',
]);

/* 2.12 Campaign status */
export const CAMPAIGN_STATUS = pl(['Planned', 'In progress', 'Scheduled', 'Completed', 'Aborted', 'Draft']);

/* 2.13 Campaign member status (per-campaign editable; seed set) */
export const CAMPAIGN_MEMBER_STATUS = [
  { id: 'added', label: 'Added' },
  { id: 'sent', label: 'Sent' },
  { id: 'opened', label: 'Opened' },
  { id: 'clicked', label: 'Clicked' },
  { id: 'responded', label: 'Responded', isResponded: true },
  { id: 'registered', label: 'Registered' },
  { id: 'attended', label: 'Attended', isResponded: true },
  { id: 'no_show', label: 'No-show' },
  { id: 'converted', label: 'Converted', isResponded: true },
  { id: 'unsubscribed', label: 'Unsubscribed' },
];

/* 2.14 Ticket status (STAGE, per-pipeline; seed set) */
export const TICKET_STATUS = pl([
  'New', 'Open', 'Waiting on customer', 'Waiting on us', 'Escalated', 'Solved', 'Closed',
]);

/* 2.15 Ticket priority (restricted - SLA rules key off it) */
export const TICKET_PRIORITY = pl(['Low', 'Medium', 'High', 'Urgent']);

/* 2.16 Ticket origin */
export const TICKET_ORIGIN = pl(['Email', 'Phone', 'Web form', 'Chat', 'Portal', 'API', 'In person', 'Social']);

/* 2.17 Rating (contact, company) */
export const RATING = pl(['Hot', 'Warm', 'Cold']);

/* 2.18 Company type (relationship to us) */
export const COMPANY_TYPE = pl([
  'Prospect', 'Customer', 'Former customer', 'Partner', 'Reseller', 'Vendor',
  'Competitor', 'Investor', 'Press', 'Other',
]);

/* 2.19 Company ownership */
export const OWNERSHIP = pl(['Public', 'Private', 'Subsidiary', 'Nonprofit', 'Government', 'Other']);

/* 2.20 Employee ranges */
export const EMPLOYEE_RANGES = pl(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+']);

/* 2.21 Revenue ranges */
export const REVENUE_RANGES = pl(['Under 1M', '1M-10M', '10M-50M', '50M-100M', '100M-500M', '500M-1B', '1B+']);

/* 2.22 Buying role (deal stakeholders + contact.buyingRole) */
export const BUYING_ROLES = pl([
  'Champion', 'Economic buyer', 'Decision maker', 'Technical evaluator', 'Influencer',
  'End user', 'Executive sponsor', 'Legal and compliance', 'Procurement', 'Blocker', 'Other',
]);

/* 2.23 Influence (stakeholder) */
export const INFLUENCE = pl(['High', 'Medium', 'Low']);

/* 2.24 Task status */
export const TASK_STATUS = pl(['Open', 'In progress', 'Waiting on someone', 'Deferred', 'Done']);

/* 2.25 Task priority */
export const TASK_PRIORITY = pl(['High', 'Normal', 'Low']);

/* 2.26 Call outcome */
export const CALL_OUTCOMES = pl(['Connected', 'Left voicemail', 'No answer', 'Busy', 'Wrong number', 'Gatekeeper']);

/* 2.27 Meeting outcome */
export const MEETING_OUTCOMES = pl(['Held', 'No-show', 'Rescheduled', 'Canceled']);

/* 2.28 Activity type (extensible with custom types + icons) */
export const ACTIVITY_TYPES_FULL = pl([
  'Task', 'Call', 'Email', 'Meeting', 'Note', 'SMS', 'LinkedIn', 'WhatsApp', 'Deadline', 'Lunch',
]);

/* 2.29 Win reasons (org-editable) */
export const WIN_REASONS = pl([
  'Product fit', 'Champion drove it', 'Better AI / automation', 'Faster time to value',
  'Price / packaging', 'Executive alignment', 'Relationship', 'Compliance / security',
]);

/* 2.30 Loss reasons (org-editable) */
export const LOSS_REASONS = pl([
  'Went with incumbent', 'No budget / timing', 'Lost to competitor', 'No decision / stalled',
  'Missing capability', 'Price', 'Champion left', 'Security / legal blocked',
]);

/* 2.31 Invoice status (restricted) */
export const INVOICE_STATUS = pl([
  'Draft', 'Open', 'Sent', 'Partially paid', 'Paid', 'Overdue', 'Void', 'Written off',
]);

/* 2.32 Order status (restricted) */
export const ORDER_STATUS = pl([
  'Draft', 'Pending approval', 'Activated', 'Partially fulfilled', 'Fulfilled', 'Billed', 'Closed', 'Canceled',
]);

/* 2.33 Contract status (restricted) */
export const CONTRACT_STATUS = pl([
  'Draft', 'In approval', 'Sent for signature', 'Signed', 'Active', 'Expiring soon', 'Expired', 'Terminated',
]);

/* 2.34 Payment terms */
export const PAYMENT_TERMS = pl(['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90']);

/* 2.35 Health (company - Ardovo-native) */
export const HEALTH = pl(['Green', 'Yellow', 'Red']);

/* 2.36 Visibility (record-level) */
export const VISIBILITY = [
  { id: 'private', label: 'Private (owner only)' },
  { id: 'team', label: 'Team' },
  { id: 'everyone', label: 'Everyone' },
];

/* 2.37 Marketing contact status */
export const MARKETING_STATUS = pl(['Subscribed', 'Unsubscribed', 'Bounced', 'Archived', 'Non-marketing']);

/* 2.38 Forecast type / rollup basis */
export const FORECAST_TYPES = pl([
  'Revenue by close date', 'Quantity', 'Line-item revenue by service date', 'Splits revenue', 'Overlay',
]);

/* 2.39 Billing frequency */
export const BILLING_FREQUENCY = pl(['One-time', 'Monthly', 'Quarterly', 'Semi-annual', 'Annual']);

/* 2.40 Project task status (STAGE - Ardovo projects) */
export const PROJECT_TASK_STATUS = pl(['Todo', 'Doing', 'Blocked', 'Review', 'Done']);

/* ------------------------------------------------------------
   Registry: picklistId -> { label, values, restricted?, stage? }
   Field definitions reference these by id (fieldDef.picklist).
   ------------------------------------------------------------ */
export const PICKLISTS = {
  industry: { label: 'Industry', values: INDUSTRIES },
  lifecycleStage: { label: 'Lifecycle stage', values: LIFECYCLE_STAGES, stage: true },
  leadStatus: { label: 'Lead status', values: LEAD_STATUS },
  leadSource: { label: 'Lead source', values: LEAD_SOURCE },
  unqualifiedReason: { label: 'Unqualified reason', values: UNQUALIFIED_REASONS },
  forecastCategory: { label: 'Forecast category', values: FORECAST_CATEGORIES, restricted: true },
  quoteStatus: { label: 'Quote status', values: QUOTE_STATUS, restricted: true, stage: true },
  dealType: { label: 'Deal type', values: DEAL_TYPES },
  productItemType: { label: 'Product item type', values: PRODUCT_ITEM_TYPES },
  campaignType: { label: 'Campaign type', values: CAMPAIGN_TYPES },
  campaignStatus: { label: 'Campaign status', values: CAMPAIGN_STATUS },
  campaignMemberStatus: { label: 'Campaign member status', values: CAMPAIGN_MEMBER_STATUS },
  ticketStatus: { label: 'Ticket status', values: TICKET_STATUS, stage: true },
  ticketPriority: { label: 'Ticket priority', values: TICKET_PRIORITY, restricted: true },
  ticketOrigin: { label: 'Ticket origin', values: TICKET_ORIGIN },
  rating: { label: 'Rating', values: RATING },
  companyType: { label: 'Company type', values: COMPANY_TYPE },
  ownership: { label: 'Ownership', values: OWNERSHIP },
  employeeRange: { label: 'Employee range', values: EMPLOYEE_RANGES },
  revenueRange: { label: 'Revenue range', values: REVENUE_RANGES },
  buyingRole: { label: 'Buying role', values: BUYING_ROLES },
  influence: { label: 'Influence', values: INFLUENCE },
  taskStatus: { label: 'Task status', values: TASK_STATUS },
  taskPriority: { label: 'Task priority', values: TASK_PRIORITY },
  callOutcome: { label: 'Call outcome', values: CALL_OUTCOMES },
  meetingOutcome: { label: 'Meeting outcome', values: MEETING_OUTCOMES },
  activityType: { label: 'Activity type', values: ACTIVITY_TYPES_FULL },
  winReason: { label: 'Win reason', values: WIN_REASONS },
  lossReason: { label: 'Loss reason', values: LOSS_REASONS },
  invoiceStatus: { label: 'Invoice status', values: INVOICE_STATUS, restricted: true, stage: true },
  orderStatus: { label: 'Order status', values: ORDER_STATUS, restricted: true, stage: true },
  contractStatus: { label: 'Contract status', values: CONTRACT_STATUS, restricted: true, stage: true },
  paymentTerms: { label: 'Payment terms', values: PAYMENT_TERMS },
  health: { label: 'Health', values: HEALTH },
  visibility: { label: 'Visibility', values: VISIBILITY },
  marketingStatus: { label: 'Marketing status', values: MARKETING_STATUS },
  forecastType: { label: 'Forecast type', values: FORECAST_TYPES },
  billingFrequency: { label: 'Billing frequency', values: BILLING_FREQUENCY },
  projectTaskStatus: { label: 'Project task status', values: PROJECT_TASK_STATUS, stage: true },
};

export const getPicklist = (id) => PICKLISTS[id]?.values || [];
export const picklistLabel = (id, valueId) =>
  getPicklist(id).find(v => v.id === valueId)?.label || valueId || '';
