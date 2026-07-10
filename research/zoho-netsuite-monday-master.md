# Zoho / NetSuite / Monday / Airtable master extraction

Competitive-intelligence extraction for Rally. Territory: Zoho CRM, NetSuite, Monday.com, Airtable, Notion databases, Freshsales, plus the document-generation landscape.
Compiled 2026-07-09. ASCII hyphens only. Source URLs inline.

---

## 1. ZOHO CRM

Primary source: https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields

### 1.1 Standard modules (complete list)

| Module | Purpose |
|---|---|
| Leads | Unqualified prospect: one person + one company, pre-conversion |
| Contacts | People, usually attached to an Account |
| Accounts | Companies / organizations |
| Deals | Opportunities with stage, amount, close date (was "Potentials") |
| Campaigns | Marketing campaigns; source attribution for leads/deals |
| Forecasts | Quota + forecast rollups by period, territory, or user |
| Cases | Support tickets |
| Solutions | Knowledge-base answers linked to Cases |
| Products | Sellable catalog items |
| Price Books | Per-customer / per-segment pricing lists on Products |
| Quotes | Quote docs with product line items |
| Sales Orders | Confirmed orders (post-quote, pre-invoice) |
| Invoices | Billing documents |
| Purchase Orders | Buy-side orders to Vendors |
| Vendors | Supplier records |
| Tasks / Calls / Meetings | The "Activities" trio |
| Reports | Report builder over any module |
| Dashboards | Chart/KPI canvases over reports |
| Documents | File library |

Key structural facts:
- Lead conversion splits one Lead into Contact + Account + (optional) Deal. Rally equivalent: a single person/company graph makes the lead-conversion ceremony unnecessary.
- Quotes -> Sales Orders -> Invoices share the same product line-item subform pattern (Product, Quantity, List Price, Discount, Tax, Total).
- Every module supports custom fields, layouts, and (paid tiers) custom modules.

### 1.2 Leads - field table

Source: https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields

| Field | Type | Notes |
|---|---|---|
| Lead Owner | Lookup (user) | Assignment target |
| Salutation | Picklist | |
| First Name | Text | Max 40 chars |
| Last Name | Text | Max 80 chars; REQUIRED |
| Title | Text | Max 100 chars |
| Company | Text | Max 100 chars; REQUIRED |
| Lead Source | Picklist | Web, referral, trade show, etc. |
| Lead Status | Picklist | Attempted-to-contact, contacted, junk, etc. |
| Industry | Picklist | |
| Rating | Picklist | Hot/warm/cold style |
| Annual Revenue | Currency | Decimal(16) |
| No. of Employees | Number | Integer(16) |
| Phone / Mobile / Fax | Text | Max 30 chars each |
| Email | Email | Max 100 chars |
| Secondary Email | Email | Max 100 chars |
| Skype ID | Text | 6-32 chars |
| Website | URL | Max 120 chars |
| Email Opt-out | Checkbox | Suppresses mailing |
| Street / City / State / Zip / Country | Text | Street 250, others 30 chars |
| Description | Textarea | 32,000 chars |
| Created By / Modified By | System datetime + user | Auto |

### 1.3 Contacts - field table

| Field | Type | Notes |
|---|---|---|
| Contact Owner | Lookup (user) | |
| Salutation | Picklist | |
| First Name | Text | Max 40 |
| Last Name | Text | Max 40; REQUIRED |
| Account Name | Lookup (Account) | The company link |
| Vendor Name | Lookup (Vendor) | Buy-side link |
| Lead Source | Picklist | Carried from lead conversion |
| Title | Text | Max 50 |
| Department | Text | Max 30 |
| Date of Birth | Date | |
| Reporting To | Lookup (Contact) | Org-chart edge inside the account |
| Phone / Mobile / Home Phone / Other Phone / Fax | Text | Max 50 each |
| Email / Secondary Email | Email | Max 100 |
| Assistant / Asst Phone | Text | |
| Skype ID | Text | 6-32 |
| Email Opt Out | Checkbox | |
| Mailing Address (Street/City/State/Zip/Country) | Text | Street 250, rest 30 |
| Other Address (Street/City/State/Zip/Country) | Text | Second address block |
| Description | Textarea | 32,000 |
| Created By / Modified By | System | Auto |

### 1.4 Accounts - field table

| Field | Type | Notes |
|---|---|---|
| Account Name | Text | Max 100; REQUIRED |
| Account Owner | Lookup (user) | |
| Parent Account | Lookup (Account) | Hierarchy edge |
| Website | URL | |
| Ticker Symbol | Text | Max 30 |
| Ownership | Picklist | Public/private/etc. |
| Industry | Picklist | |
| Account Type | Picklist | Customer/partner/prospect/etc. |
| Account Number | Number | Max 40 |
| Account Site | Text | Max 30 (location label) |
| Employees | Number | Integer(10) |
| Annual Revenue | Number | Integer(10) |
| SIC Code | Text | Integer(10) |
| Rating | Picklist | |
| Phone / Fax | Text | Max 30 |
| Email | Email | Max 100 |
| Billing Address (Street/City/State/Code/Country) | Text | Street 250, rest 30 |
| Shipping Address (Street/City/State/Code/Country) | Text | |
| Description | Textarea | 32,000 |
| Created By / Modified By | System | Auto |

### 1.5 Deals - field table

| Field | Type | Notes |
|---|---|---|
| Deal Owner | Lookup (user) | |
| Deal Name | Text | Max 120; REQUIRED |
| Account Name | Lookup (Account) | REQUIRED |
| Contact Name | Lookup (Contact) | |
| Type | Picklist | New Business / Existing Business |
| Lead Source | Picklist | |
| Campaign Source | Lookup (Campaign) | Attribution edge |
| Amount | Currency | |
| Closing Date | Date | REQUIRED |
| Stage | Picklist | REQUIRED; drives pipeline + probability |
| Probability | Number | 0-100, auto-set from stage, editable |
| Expected Revenue | Currency | CALCULATED = Amount x Probability |
| Next Step | Text | Max 100 |
| Description | Textarea | 32,000 |
| Created By / Modified By | System | Auto |

Notable: stage-probability mapping is configurable per pipeline; Zoho supports multiple pipelines per org (Deals module "Pipelines").

### 1.6 Quotes - field table (header + line items)

| Field | Type | Notes |
|---|---|---|
| Quote Owner | Lookup (user) | |
| Subject | Text | Max 50; REQUIRED |
| Deal Name (Potential) | Lookup (Deal) | Links quote to pipeline |
| Quote Stage | Picklist | Draft, Negotiation, Delivered, Confirmed, Closed Won/Lost |
| Valid Till | Date | Expiry |
| Contact Name | Lookup (Contact) | |
| Account Name | Lookup (Account) | REQUIRED |
| Carrier | Picklist | Shipping carrier |
| Shipping | Text | |
| Inventory Manager | Text | |
| Billing Address block | Text x5 | Street/City/State/Zip/Country |
| Shipping Address block | Text x5 | |
| Terms & Conditions | Textarea | |
| Description | Textarea | 32,000 |
| LINE ITEMS (Quoted Items subform): | | |
| Product Name | Lookup (Product) | REQUIRED per line |
| Quantity | Number | REQUIRED |
| Quantity in Stock | Number | Pulled from Product |
| Unit Price | Currency | REQUIRED |
| List Price | Currency | REQUIRED; from Price Book if applied |
| Discount | Percent or amount | Per line |
| Tax | Percent | Per line |
| Total | Currency | Line total; header rolls up Sub Total, Discount, Tax, Adjustment, Grand Total |

Sales Orders and Invoices reuse this same line-item anatomy with extra fields (SO#: Purchase Order, Due Date, Pending, Excise Duty, Sales Commission, Status; Invoice: Invoice Date, Due Date, Sales Commission, Status).

### 1.7 Zoho CRM features checklist (what Rally must absorb or beat)

Sources: https://www.zoho.com/crm/blueprint.html , https://www.zoho.com/crm/zia.html , https://www.zoho.com/crm/canvas.html , https://help.zoho.com/portal/en/kb/crm

- [ ] Blueprint - visual process designer that ENFORCES stage transitions: states + transitions + "before/during/after" conditions, mandatory fields per transition, SLA per state, approval steps mid-process. This is Zoho's moat for regulated sales processes.
- [ ] Zia AI - deal-win prediction, lead scoring, anomaly detection on trends, best time to contact, email sentiment, data-entry suggestions, voice assistant, workflow suggestions. Bolted on, not native: every Zia feature is a separate toggle over a legacy schema.
- [ ] Canvas - drag-drop custom record-detail UIs (design the record page per module/profile with a template gallery). Zoho's admission that CRM record pages are ugly by default.
- [ ] Workflow Rules - trigger (record action / datetime / score change) + conditions + instant actions (email alert, task, field update, webhook, custom function) + scheduled actions.
- [ ] Scoring Rules - additive lead/contact/account/deal scores from field values + email/call/survey/social touchpoints.
- [ ] Assignment Rules - round-robin or criteria-based owner assignment for inbound records.
- [ ] Cadences (formerly follow-up sequences) - multi-step email/call/task sequences with per-step wait + exit criteria.
- [ ] Approval Processes - field-change or record-creation approvals with escalation.
- [ ] Review Process - data-quality gate: incoming records held for manual review by criteria.
- [ ] Multiple Pipelines + Kanban view per picklist field.
- [ ] Portals - external login for customers/partners to see/edit chosen modules.
- [ ] Sandbox - config-only clone for testing changes before deploy (paid tiers).
- [ ] Territory Management, Multi-currency, Multi-org.
- [ ] CommandCenter - cross-module customer-journey orchestration (state machine spanning modules).
- [ ] Client Script, Functions (Deluge serverless), Widgets, REST API v8, webhooks.
- [ ] Email: IMAP two-way sync, mass email, templates with merge fields, email insights (open/click).
- [ ] Inventory suite inside CRM: Products, Price Books, Quotes, SO, PO, Invoices, Vendors (rare among CRMs; Zoho's quote-to-cash is native but shallow vs NetSuite).

Weaknesses Rally exploits:
- Fifteen-plus separate editors (layouts, blueprint, canvas, workflows, functions) that an admin must learn; Rally's operator does all of it conversationally.
- Zia is prediction-only; it cannot execute multi-step work.
- Quotes/Invoices render through legacy templates; no modern doc generation.

### 1.8 Freshsales (adjacent territory, brief)

Sources: https://support.freshsales.io/support/solutions/160485 , https://support.freshsales.io/support/solutions/articles/50000003237-what-is-cpq-add-on-how-does-the-add-on-work- , https://www.freshworks.com/crm/features/

- Modules: Contacts, Accounts, Deals, Products, Tasks, Appointments, Custom modules. Note: Freshsales MERGED leads into Contacts with "lifecycle stages" (Subscriber -> Lead -> MQL -> SQL -> Customer) - closer to Rally's single-person model than Zoho's separate Leads module.
- Custom fields on contacts/accounts/deals: text, number, date, dropdown, checklist, formula fields (https://crmsupport.freshworks.com/support/solutions/articles/50000002389).
- Freddy AI: dedupe, scoring, deal insights, email writing.
- CPQ is a paid ADD-ON with per-seat licenses assigned via roles: quote/contract/invoice docs from templates with merge placeholders + product catalog. Weak: template-based only, licensed separately, no free-form generation.
- Sales sequences, workflows, territories, multiple pipelines, Kanban views, built-in phone + chat (Freshworks suite tie-in).

---

## 2. NETSUITE

Primary sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N3673214.html (Estimate/Quote), https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1215966.html (Sales Orders), https://www.netsuite.com/portal/resource/articles/accounting/quote-to-cash-qtc-q2c.shtml , https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2222944.html (Item Types)

### 2.1 CRM capabilities checklist

NetSuite CRM is a module of the ERP, not a standalone product. Its power is that CRM records and financial records live in ONE database - the exact thesis Rally generalizes.

- [ ] Leads / Prospects / Customers are ONE record type (Entity) whose STATUS advances: Lead -> Prospect (has opportunity) -> Customer (has sale). No lead-conversion data copy at all - stage is a field, not a table move.
- [ ] Opportunities - expected close, projected total, probability, status (In Progress / Closed Won / Closed Lost), sales rep, forecast type (Omitted / Most Likely / Upside), linked estimates.
- [ ] Estimates (Quotes) - see 2.2.
- [ ] Activities: tasks, phone calls, events, CRM cases; email capture.
- [ ] Sales force automation: territories, quotas, forecasts (rep -> manager rollup with override), commission schedules (SuiteCommissions).
- [ ] Marketing: campaigns, email marketing, lead source ROI (campaign -> revenue because it is the same DB as invoices).
- [ ] Support: case management, case profiles, escalation rules, knowledge base.
- [ ] Partner relationship management (partner records, joint campaigns, partner commissions).
- [ ] Real-time dashboards with financial KPIs next to pipeline KPIs (see 2.6).

### 2.2 Estimate / Quote record - fields

Sources: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N3673214.html , https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1073352.html (Converting an Estimate), SOAP schema browser (estimate record)

Non-posting transaction: zero accounting impact until converted. Enabled at Setup > Company > Enable Features > Transactions.

Header fields:

| Field | Type | Notes |
|---|---|---|
| Customer (entity) | Lookup | Lead, prospect, or customer |
| Opportunity | Lookup | Estimate can be initialized FROM an opportunity |
| Title / Memo | Text | |
| Estimate # (tranId) | Auto-number | |
| Date (tranDate) | Date | |
| Expiration Date (dueDate/expectedclosedate) | Date | Quote expiry |
| Status | Picklist | Open, Processed, Voided, Expired, Closed |
| Probability | Percent | Feeds forecast alongside opportunity |
| Sales Rep | Lookup (employee) | |
| Sales Team | Sublist | Split credit percentages |
| Forecast Type | Picklist | Omitted / Most Likely / Upside |
| Class / Department / Location | Segments | GL segmentation even pre-posting |
| Currency + Exchange Rate | Currency | Multi-currency native |
| Terms | Lookup | Payment terms |
| Ship Method (shipMethod) | Lookup | Required before setting handlingCost |
| Shipping Cost / Handling Cost | Currency | handlingCost requires compatible shipMethod |
| Billing Address / Shipping Address | Address subrecord | Full structured address, not 5 text fields like Zoho |
| Subtotal / Discount Item / Discount Rate / Tax Total / Total | Currency | Computed |
| Sales Effective Date | Date | Commission timing |
| Message / Customer Message | Text | Printed on PDF |

Line (item sublist) fields:

| Field | Type | Notes |
|---|---|---|
| Item | Lookup (item) | Any item type - see 2.4 |
| Quantity | Number | |
| Units | Lookup | Unit-of-measure conversion |
| Description | Text | Defaults from item, editable |
| Price Level | Picklist | See 2.5 - the pricing engine hook |
| Rate | Currency | Unit price after price level |
| Amount | Currency | qty x rate |
| Tax Code | Lookup | Per-line tax |
| Inventory Detail | Subrecord | Serial/lot numbers when bin mgmt enabled |
| Expected Ship Date | Date | |

### 2.3 Quote-to-cash flow (the full chain Rally must own)

Source: https://www.netsuite.com/portal/resource/articles/accounting/quote-to-cash-qtc-q2c.shtml , https://trajectoryinc.com/blog/quote-to-cash-netsuite-order-management-system/

```
Opportunity (forecast, non-posting)
   -> Estimate/Quote (non-posting; print/email PDF; probability + expiry)
      -> Sales Order (the commitment; approval workflow; commits inventory; non-posting)
         -> Item Fulfillment (picks/packs/ships; posts to inventory + COGS)
            -> Invoice or Cash Sale (posts A/R + revenue; billing schedules for phased rev)
               -> Customer Payment (posts cash; applied to invoice)
                  -> [Return path: RMA -> Item Receipt -> Credit Memo -> Refund]
```

Flat facts:
- Every arrow is a "transform": target transaction is pre-filled from the source, links back, and drives status on the source (estimate becomes Processed).
- Sales Orders carry approval status (Pending Approval -> Pending Fulfillment -> Partially Fulfilled -> Pending Billing -> Billed -> Closed).
- Billing schedules let one SO invoice over time (subscriptions, milestones).
- Revenue recognition (ASC 606) attaches at the item/SO level - this is what no CRM-only product can do and why NetSuite survives despite terrible UX.
- The whole chain is auditable: any invoice traces to its SO, quote, opportunity, campaign.

### 2.4 Item types

Source: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2222944.html , https://blog.concentrus.com/item-types-in-netsuite

| Item type | Stocked? | Notes |
|---|---|---|
| Inventory Item | Yes | Qty on hand, locations, costing (FIFO/LIFO/avg/standard) |
| Serialized / Lot-Numbered Inventory | Yes | Per-unit or per-lot tracking |
| Non-Inventory Item (for sale / purchase / resale) | No | Digital goods, drop-ship |
| Service Item (for sale / purchase / resale) | No | Posts revenue, never inventory |
| Assembly / BOM Item | Yes | Built via work orders from a bill of materials |
| Kit/Package Item | Virtual | Bundle with its OWN price (independent of components), single invoice line |
| Item Group | Virtual | Bundle priced as SUM of member prices, explodes to member lines |
| Matrix Item | Yes | Parent + option axes (size, color) generating child items |
| Discount Item | n/a | Line-level or order-level discount as an "item" |
| Markup Item | n/a | Opposite of discount |
| Subtotal Item | n/a | Renders a subtotal row inside the line list |
| Description Item | n/a | Text-only line on the document |
| Other Charge Item | No | Fees, shipping-adjacent charges |
| Payment Item | n/a | Records payment on a cash sale |
| Gift Certificate Item | n/a | |
| Download Item | No | Digital file delivery |

Rally insight: NetSuite models even DOCUMENT LAYOUT concerns (subtotal, description lines) as items so the line list is the single source of truth for the printed quote. Rally's quote model should keep "presentational lines" as first-class citizens.

### 2.5 Pricing levels

- Every item carries a price matrix: Price Level x Currency x Quantity Break.
- Default levels: Base Price, then org-defined levels (e.g. Wholesale = Base -20%, Preferred = Base -10%, Online). Levels can be formula-derived from Base (percent markup/markdown) so one base change reprices everything.
- Quantity pricing: per-level quantity breaks (1-9, 10-49, 50+...).
- Customer-specific pricing: assign a default price level per customer, plus per-customer item price overrides.
- Custom price level ("Custom" on the line) allows ad-hoc rate entry, permission-gated.
- Promotions/discount engine (SuitePromotions) sits on top.

### 2.6 Platform machinery

- SuiteFlow (workflow engine): visual state-machine builder on any record type. States, transitions, conditions, actions (set field, send email, create record, lock record, add button, go-to-page), scheduled + event triggers, approval routing. Doc: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2900740.html
- Saved Searches: the query layer everything runs on - criteria + results columns + summary (group/sum/count/max) + formula columns (SQL-ish expressions) + highlighting + email alerts on new results + exposure as sublists, KPIs, and dashboard portlets. Rally's equivalent is "ask the operator", but saved searches prove the demand for persistent, alertable, computed views.
- Dashboards / KPIs: per-role home dashboards of portlets - KPI portlet (60+ standard KPIs: Sales, Forecast, Pipeline, Open Invoices, Bank Balance...), KPI Meter, Trend Graph, KPI Scorecard (compare periods, formulas across KPIs), Report Snapshot, Custom Search portlet, Reminders, Shortcuts. All date-range comparable (this period vs last).
- Roles/permissions model: Role = bundle of Permissions (each permission = record/transaction type + level None/View/Create/Edit/Full) + Center type (what the nav looks like) + restrictions (own-records-only, department/location/class/subsidiary scoping). Employees get multiple roles and switch between them; every role sees different dashboards, forms, and saved searches. Custom forms per role hide/show fields. This is the enterprise-grade permission bar Rally must clear for multi-seat teams.
- SuiteScript (JS on records: user event, scheduled, map/reduce, Suitelet pages, client scripts) + SuiteTalk (SOAP/REST) + SuiteAnalytics (SuiteQL / workbooks).

Weaknesses Rally exploits:
- UI is 2005-era; every screen is a form post. Speed of a single record edit is measured in seconds.
- Configuration requires consultants (SuiteFlow, saved search formulas, role matrices are specialist skills billed at $200+/hr).
- CRM half is an afterthought - reps live in it only because finance forces them to.
- No native document generation beyond "Advanced PDF/HTML Templates" (FreeMarker templates - see section 5).

---

## 3. MONDAY.COM ANATOMY (the project-board blueprint)

Primary sources: https://developer.monday.com/api-reference/reference/column-types-reference , https://support.monday.com/hc/en-us/articles/115005310285-Available-column-types-on-monday-com , https://support.monday.com/hc/en-us/articles/360001267945-The-board-views , https://support.monday.com/hc/en-us/articles/360002187819-The-Dashboards , https://support.monday.com/hc/en-us/articles/360001222900-Get-started-with-monday-automations

Object model: Workspace -> Board -> Group (colored row section) -> Item (row) -> Subitem (nested row with its own columns). Columns define the schema; Views render it; Automations mutate it; Dashboards aggregate across boards.

### 3.1 Every column type (complete, with API ids)

Source: https://developer.monday.com/api-reference/reference/column-types-reference

| # | Column | API id | What it stores |
|---|---|---|---|
| 1 | Name | name | The item's title; always first; supports updates/conversations icon |
| 2 | Status | status | Single label from a colored label set; THE workflow primitive; done-state flag per label |
| 3 | Text | text | Short free text |
| 4 | Long text | long_text | Multi-line text |
| 5 | Numbers | numbers | Number with unit/currency formatting + column summary (sum/avg/median/min/max/count) |
| 6 | Date | date | Date, optional time; deadline mode pairs with a status for overdue coloring |
| 7 | Timeline | timeline | Start-end date RANGE; feeds Gantt; deadline mode |
| 8 | People | people | One or more persons AND/OR teams assigned |
| 9 | Dropdown | dropdown | Multi-select labels |
| 10 | Checkbox | checkbox | Boolean |
| 11 | Link | link | URL + display text |
| 12 | Email | email | Mailto-clickable |
| 13 | Phone | phone | Click-to-call, country flag |
| 14 | Location | location | Address + lat/lng; feeds Map view |
| 15 | Country | country | Country picker |
| 16 | World clock | world_clock | A timezone's current time |
| 17 | Files | file | Attachments on the cell; feeds Files view/gallery |
| 18 | Rating | rating | 1-5 stars |
| 19 | Vote | vote | Team voting counter |
| 20 | Tags | tags | Account-global tags (cross-board, unlike dropdown) |
| 21 | Hour | hour | Time of day |
| 22 | Week | week | Week-of-year range |
| 23 | Timeline dependency | dependency | Links items that must finish before this starts; drives Gantt auto-shift (flexible/strict modes) |
| 24 | Formula | formula | Read-only computed cell (spreadsheet-style functions over sibling columns) |
| 25 | Auto number | auto_number | Sequential per board |
| 26 | Item ID | item_id | Immutable unique id |
| 27 | Creation log | creation_log | Who + when created (read-only) |
| 28 | Last updated | last_updated | Who + when last changed (read-only) |
| 29 | Progress tracking | progress | Weighted rollup of selected status columns into a percent bar |
| 30 | Time tracking | time_tracking | Start/stop stopwatch sessions per item |
| 31 | Button | button | Clickable button that fires an automation |
| 32 | Color picker | color_picker | Hex color value (design teams) |
| 33 | Connect boards | board_relation | Link item(s) on OTHER board(s); the cross-board relation primitive |
| 34 | Mirror | mirror | Read-through display of a column from connected items (lookup); summarizable |
| 35 | Subitems | subtasks | The nested-items control column |
| 36 | Monday doc | doc | Embeds a workdoc per cell |
| 37 | Integration | integration | Shows state synced by an integration recipe |
| 38 | Combo columns | (ui) | "Date + Status", "Timeline + Status", "Timeline + Numeric" merged displays |
| 39 | Person / Team (deprecated) | person, team | Superseded by People |
| 40 | AI columns (2025+) | ai | AI-filled text/summary/categorize/translate/sentiment cells that run a prompt per row |

Rally read: 4 of these carry the real load - status, people, date/timeline, connect+mirror. Everything else is formatting sugar. The column-summary footer (sum/avg per group) is monday's stealth spreadsheet.

### 3.2 Every view type

Sources: https://support.monday.com/hc/en-us/articles/360001267945-The-board-views , https://www.simonsezit.com/article/types-of-views-on-monday-com/

| View | Notes |
|---|---|
| Table (main) | The default grid; groups, collapsible, column summaries |
| Kanban | Cards by any status/people/dropdown column; WIP-style lanes; card fields configurable |
| Timeline | Horizontal bars per item by timeline column, grouped by group/people |
| Gantt | Timeline + dependencies + milestones + critical path + baseline (snapshot vs actual) |
| Calendar | Month/week/day by date or timeline column |
| Chart | Bar/line/pie/stacked aggregations of board data |
| Workload | Capacity view: effort (numbers column) per person per week vs capacity; overallocation red bubbles |
| Form | Public/internal form that creates items; required fields, conditional questions, branding |
| Cards / Gallery | Pinterest-style cards, image-forward |
| Map | Pins from location column |
| Files | Gallery of every file on the board |
| Table view (additional) / List | Simplified linear list |
| Blank view / Apps views | Marketplace-injected custom views |

Views are per-board tabs; each view carries its own filters, sort, and (optionally) locked "view-only" sharing link. Any view can be a default per person.

### 3.3 Automation anatomy + common recipes

Source: https://support.monday.com/hc/en-us/articles/360001222900-Get-started-with-monday-automations

Anatomy: TRIGGER (event or schedule) + optional CONDITIONS (only if...) + ACTION(S). Rendered as a fill-in-the-blanks sentence: "When STATUS changes to SOMETHING, notify SOMEONE." Users pick from prebuilt recipe cards or compose custom recipes from trigger/condition/action blocks. Runs metered by plan (250 to 250,000 actions/month).

Trigger vocabulary (complete-ish):
- status changes (to specific label / any), column changes, date arrives / X days before-after date, every time period (daily/weekly/monthly cron), item created, item moved to group/board, subitem created, name/person/number changes, button clicked, item deleted, update posted, form submitted, when date passed and status not done (overdue).

Action vocabulary:
- notify person, assign person / clear assignee, change status/column value, create item / subitem / update, move item to group/board, duplicate item, archive/delete item, create board from template, connect items, set date to today / push date by X, start/stop time tracking, send email (via integration), call a webhook, create a doc from template.

Canonical recipes (the ones every team runs):
1. When status changes to Done, move item to group Completed.
2. When date arrives and status is not Done, notify owner (overdue alarm).
3. Every Monday at 9am, create item "Weekly report" in group This Week.
4. When item created, assign creator and set date to today.
5. When status changes to Working on it, notify the manager.
6. When all subitems are Done, change parent status to Done (subitem rollup).
7. When column changes, create an update (audit trail).
8. When button clicked, duplicate item and move to board X (templated intake).
9. When form submitted, assign round-robin (via apps).
10. When status changes to Stuck, create item in Escalations board and connect boards.

Integration recipes use the same sentence grammar but bridge external tools: "When email received in Gmail, create an item"; Slack, Teams, Jira, GitHub, Salesforce, HubSpot, Outlook, Zoom, etc. (https://monday.com/integrations)

### 3.4 Dashboard widgets

Source: https://support.monday.com/hc/en-us/articles/360002187819-The-Dashboards

Dashboards aggregate up to 30 widgets across up to 50 boards (plan-dependent: 1/5/20/50 boards).

Widgets: Numbers (sum/avg KPIs), Chart (all chart types, multi-board), Battery (stacked progress of all statuses), Gantt, Timeline, Calendar, Workload, Table, List View, To-do list, Time Tracking, Overview, Countdown, Text, Quote of the day, Bookmarks, Embed Everything (iframe), Board Updates, I Was Mentioned, Bubble Chart, Playlist, YouTube, Llama Farm (gamified done-ness), Apps-market widgets.

### 3.5 The rest of the anatomy

- Workdocs (monday doc): block-based collaborative docs (like Notion-lite) with live board widgets embedded, doc templates, and the doc column embedding a doc per item. Source: https://support.monday.com/hc/en-us/sections/4406595582866-monday-workdocs
- Subitems: one level of nesting, own column schema per board, roll up to parent via formulas/automations/progress column. Source: https://support.monday.com/hc/en-us/articles/360011905480-All-about-subitems
- Groups: colored sections in a board (e.g. sprints, months, stages); collapsible; group-level summaries; items move between groups by drag or automation.
- Updates / activity log: every item has an Updates thread (comments, @mentions, files, emails via item email address, checklists inside updates) + an immutable Activity Log of every cell change (who/what/when). This is the "record timeline" bar Rally must match.
- Item card: pop-out per item with tabs (updates, files, activity log, columns).
- My Work: cross-board personal task list by date.
- Permissions: board types (main/shareable/private), board permission levels (edit everything / edit content / edit own rows / view only), column-level restrictions (enterprise), workspace roles.
- monday products (all on the same board engine): Work Management, monday CRM (sales pipeline boards + email sync + mass email + quotes via docs), monday dev (sprints, bug tracking, roadmaps, GitHub), monday service (ticketing, SLA), plus WorkForms + Canvas (whiteboard). The CRM is literally boards wearing a trench coat - deal stages are a status column; this is why its CRM depth is shallow (no real quote-to-cash, no ledger).
- monday AI (2025-2026): AI blocks in automations (categorize, summarize, extract, translate), AI columns, "digital workers" - still recipe-shaped, not agentic.

Weaknesses Rally exploits:
- No real relational database: connect-boards + mirror is a 2-hop lookup, no queries, no joins beyond one level, mirror columns break in automations and integrations constantly (community forum is full of this).
- Automation sentence grammar caps out fast; anything conditional-branchy needs 5 recipes or an app.
- Pricing per seat punishes whole-company rollout; viewers limited.
- Formula column can't write back, can't trigger automations (read-only dead end).
- Cross-board reporting requires dashboards with per-plan board caps.

---

## 4. AIRTABLE + NOTION PRIMITIVES (the embedded-database bar)

### 4.1 Airtable field types (complete)

Sources: https://support.airtable.com/docs/supported-field-types-in-airtable-overview , https://airtable.com/developers/web/api/model/field-type

| # | Field | Notes |
|---|---|---|
| 1 | Single line text | |
| 2 | Long text | Optional rich text (bold, lists, @mentions, checkboxes inline) |
| 3 | Attachment | Multiple files per cell; gallery previews |
| 4 | Checkbox | |
| 5 | Single select | Colored options |
| 6 | Multiple select | |
| 7 | User (collaborator) | Single or multiple workspace users |
| 8 | Date | Optional time, timezone handling |
| 9 | Phone number | |
| 10 | Email | |
| 11 | URL | |
| 12 | Number | Integer/decimal precision |
| 13 | Currency | Symbol + precision |
| 14 | Percent | |
| 15 | Duration | h:mm:ss formats |
| 16 | Rating | Stars/hearts, 1-10 max |
| 17 | Formula | Full function library over sibling fields (IF, DATETIME_DIFF, REGEX, ARRAYJOIN...) |
| 18 | Rollup | Aggregate a field across LINKED records (SUM, MAX, ARRAYUNIQUE...) |
| 19 | Count | Count of linked records |
| 20 | Lookup | Pull a field through a link |
| 21 | Linked record (Link to another record) | THE relational primitive; one- or two-way, single or multi; reverse field auto-created |
| 22 | Created time | Auto |
| 23 | Last modified time | Auto, can scope to specific fields |
| 24 | Created by | Auto |
| 25 | Last modified by | Auto |
| 26 | Autonumber | |
| 27 | Barcode | Mobile scanner input |
| 28 | Button | Opens URL / runs scripting extension / triggers Interface action |
| 29 | Sync source | Read-only fields arriving via synced tables |
| 30 | AI field (Airtable AI) | Prompt template over row fields; generate/summarize/categorize/translate per record |

### 4.2 Airtable machinery

- Views per table: Grid, Kanban, Calendar, Gallery, Timeline, Gantt, Form, List (with sub-levels). Each view = saved filter + sort + group + hidden fields + row height; personal vs collaborative vs locked views.
- Interface Designer: drag-drop app builder ON TOP of the base - pages (list, gallery, kanban, timeline, dashboard, record review, form), elements (charts, numbers, filters, buttons), per-interface permissions and record-level detail pages. This is Airtable's pivot from "spreadsheet-db" to "app platform" and the direct ancestor of what Rally's generated per-tenant UIs replace.
- Automations: trigger (record created/updated/matches conditions, form submitted, scheduled, webhook) -> up to 25 actions (create/update record, send email, Slack, run SCRIPT (full JS), call webhook, AI generate, conditional logic groups). 25-action + run-limit ceilings per plan.
- Sync: one-way table sync across bases/external sources (GCal, Jira, Salesforce...).
- Extensions: scripting, charts, page designer (a legacy doc-generation extension - see section 5).
- Record-level comments + revision history; per-base collaborators; field/table-level edit permissions (enterprise).

### 4.3 Notion database property types (complete)

Source: https://www.notion.com/help/database-properties

| # | Property | Notes |
|---|---|---|
| 1 | Text | Rich text |
| 2 | Number | Plus bar/ring "progress" display formats |
| 3 | Select | Single tag |
| 4 | Multi-select | |
| 5 | Status | Grouped To-do / In Progress / Complete with sub-options - a stage machine |
| 6 | Date | Date or range, optional time, reminders |
| 7 | Person | Workspace member(s) or group(s) |
| 8 | Files & media | |
| 9 | Checkbox | |
| 10 | URL | |
| 11 | Email | |
| 12 | Phone | |
| 13 | Formula | Notion formula language 2.0 (typed, lets/variables, list ops) |
| 14 | Relation | Cross-database links, one- or two-way |
| 15 | Rollup | Aggregate through a relation |
| 16 | Created time / Created by | Auto |
| 17 | Last edited time / Last edited by | Auto |
| 18 | ID | Auto-increment unique id with optional prefix |
| 19 | Button | Multi-step action per row (edit props, add pages, open link, confirm) |
| 20 | Place | Location/address (maps) |
| 21 | AI properties (Notion AI) | AI summary, AI translation, AI keywords, custom autofill - regenerate on page edit |

- Notion views: Table, Board (kanban), Timeline, Calendar, List, Gallery, Chart (2024+), Form (2024+), with per-view filter/sort/group and linked views of one source database embedded anywhere in any page.
- Every database ROW IS A PAGE (arbitrary block content inside each record) - the primitive Rally should steal for "record = workspace".
- Notion automations: database button + "when property changes -> edit props / add page / send Slack / send webhook / AI action" (simpler than Airtable's).

The bar these two set for Rally's embedded databases: linked records with rollups/lookups, saved multi-modal views, form intake, per-record pages, field-level history, AI-computed fields, and a no-code interface layer. Rally's edge: its operator BUILDS these schemas conversationally and they are born connected to CRM truth (companies, people, deals) instead of floating in a silo.

---

## 5. GENERATION LANDSCAPE (documents / PDFs / presentations in and around CRMs)

What incumbents actually offer today - the ceiling Rally's generation suite must clear.

### 5.1 Inside the CRMs

| Platform | Doc generation offering | Reality check |
|---|---|---|
| Salesforce | Quote PDFs from quote templates (classic templates engine); Salesforce CPQ ("Quote Document" with template sections); docgen otherwise delegated to AppExchange (Conga Composer, S-Docs, Nintex Drawloop). Source: https://help.salesforce.com/s/articleView?id=sales.quotes_templates_landing.htm | Template-merge only. Anything custom = buy Conga. No presentation generation at all. |
| Zoho CRM | Zoho Writer mail-merge templates (merge fields from CRM records -> PDF/DOCX, e-sign via Zoho Sign); Inventory templates for Quotes/Invoices (HTML template gallery per module). Source: https://help.zoho.com/portal/en/kb/writer | Best-in-suite of the incumbents because Writer is a real word processor, but still merge-field templating; no free-form or AI-native layout. |
| NetSuite | Advanced PDF/HTML Templates: FreeMarker + BFO/CSS templates per transaction type (quote, SO, invoice). Source: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2917077.html | Editing = writing FreeMarker in a rich-text editor that fights you. Consultant territory. Output is functional, ugly. |
| HubSpot | Quotes tool (3 hosted quote templates + custom via CMS dev), documents library (tracking only), no docgen engine. | Quote page is a hosted URL, not a designed document. |
| Freshsales | CPQ add-on: quote/contract docs from templates with placeholders, product catalog lines. Source: https://support.freshsales.io/support/solutions/articles/50000003237 | Paid add-on, per-seat license, template-merge only. |
| monday.com | Workdocs (collab docs, not client-facing PDFs); DocuGen / EasyDoc marketplace apps for template-merge; monday CRM added quote docs via docs+merge. | Docgen is outsourced to marketplace apps; no native PDF pipeline. |
| Airtable | Page Designer extension (drag-drop print layouts per record - legacy, not updated) + third parties (Documint, DocsAutomator, On2Air). | Page Designer is abandoned-ware; the ecosystem gap is filled by external SaaS. |
| Notion | Export page to PDF; no merge/templating engine; AI writes content in-page. | Not a document-generation player. |

### 5.2 The dedicated docgen category (what customers bolt on)

- PandaDoc - proposal/quote/contract builder: drag-drop blocks, pricing tables bound to CRM deals, templates + content library, e-sign, approval flows, analytics (view time per page). The category leader; effectively an admission that no CRM generates good documents. https://www.pandadoc.com
- Proposify, Qwilr (web-page proposals), Better Proposals - same category, design-forward.
- Conga (Composer + Contracts) and Nintex Drawloop - enterprise Salesforce docgen, template-merge at scale.
- DealHub, Responsive (RFPio) - CPQ + RFP response generation.
- e-sign rails: DocuSign / Dropbox Sign / Adobe Sign integrated by all of the above.
- Presentation side: Gamma, Tome, Beautiful.ai, Pitch - AI deck generation, ZERO CRM data awareness; Canva Docs + Canva's Salesforce-ish integrations for brand-kit graphics.

### 5.3 The scoping conclusion for Rally's generation suite

Checklist of what "beat the landscape" means concretely:
- [ ] Quote/proposal PDFs generated from live deal + line-item data with designed (not merge-field) layout - beats Salesforce/Zoho/NetSuite templates and the PandaDoc bolt-on in one move.
- [ ] PPTX/deck generation from CRM truth (QBR decks, pipeline reviews, proposal decks) - nobody in the table above does this; Gamma-class output with Rally-native data binding.
- [ ] On-brand graphics (social cards, one-pagers, battle cards) from a brand kit - Canva territory, CRM-aware.
- [ ] Drag-drop builder for when humans want control (the PandaDoc block editor, embedded).
- [ ] Code/artifact generation (landing pages, calculators, embeds) - beyond the entire category.
- [ ] E-sign + view analytics native, not integrated.
- [ ] Every generated artifact is a first-class record: versioned, linked to the deal, regenerable when data changes.

---

## 6. RALLY ABSORPTION MAP

For each platform: the 5 capabilities Rally must absorb to make it unnecessary.

### Zoho CRM
1. Core object graph (Leads-as-stage, Contacts, Accounts, Deals with multi-pipeline stages + calculated expected revenue).
2. Blueprint-grade process enforcement - guided, gated stage transitions with required fields and SLAs, but authored conversationally.
3. Workflow + assignment + scoring + cadence automation as one operator-managed system (Zoho ships them as 5 separate editors).
4. Quote-to-invoice line-item documents (Products, Price Books, Quotes, SO, Invoice) with real doc generation.
5. Zia-class intelligence (win prediction, best-time, anomaly) as ambient operator behavior, not toggled add-ons.

### NetSuite
1. The entity-status model (lead -> prospect -> customer as ONE record) - adopt outright; it is the correct design.
2. Quote-to-cash chain: estimate -> order -> fulfillment -> invoice -> payment with full backward traceability.
3. Item + price-level engine (item types incl. kits/groups, price levels x quantity breaks x currency, customer-specific pricing).
4. Saved-search power (persistent computed, alertable, embeddable queries) via the operator.
5. Role-grade permissions (record-type x level x scope restrictions) for enterprise seats.

### Monday.com
1. Board = group + item + subitem with the full column vocabulary (status, people, timeline, dependency, formula, connect/mirror) - Rally project boards must be a superset.
2. The view suite: table, kanban, gantt (dependencies + baseline + critical path), calendar, workload (capacity), form intake, chart.
3. Sentence-grammar automations - but with an operator that writes and maintains them, and real branching.
4. Cross-board dashboards (numbers, battery, chart, workload widgets) without board-count caps.
5. Updates thread + activity log on every item (the collaboration layer that makes people live in it).

### Airtable
1. Linked records + lookup + rollup + count - the relational spine, embedded next to CRM objects.
2. Full field-type vocabulary including formula, AI fields, attachments, barcode.
3. Multi-modal saved views per table (grid/kanban/calendar/gallery/timeline/list/form).
4. Interface-Designer-class custom UIs - except Rally GENERATES them from a sentence.
5. Script-capable automations with webhook in/out and sync from external sources.

### Notion
1. Record = page (arbitrary rich content inside any database row).
2. Linked views of one database embedded anywhere (docs, dashboards, wikis).
3. Status-with-groups property + formula 2.0 expressiveness.
4. AI properties that autofill/summarize per row.
5. The wiki/doc layer itself - meeting notes, playbooks, PRDs living beside (and linking to) structured records.

### Freshsales
1. Lifecycle-stage contact model (no separate leads module) - validates Rally's single-person design.
2. Built-in phone/chat/email channels on the record.
3. Sales sequences with exit criteria.
4. CPQ document generation - as a native free capability, not a licensed add-on.
5. Freddy-class dedupe/scoring as ambient hygiene.

---

## Appendix: source index

- Zoho standard modules & fields: https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields
- Zoho Blueprint: https://www.zoho.com/crm/blueprint.html ; Zia: https://www.zoho.com/crm/zia.html ; Canvas: https://www.zoho.com/crm/canvas.html
- NetSuite Estimate/Quote: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N3673214.html ; Converting an Estimate: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1073352.html
- NetSuite Sales Orders: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N1215966.html ; Item Types: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2222944.html
- NetSuite quote-to-cash: https://www.netsuite.com/portal/resource/articles/accounting/quote-to-cash-qtc-q2c.shtml ; https://trajectoryinc.com/blog/quote-to-cash-netsuite-order-management-system/ ; data model: https://www.m3ter.com/reference-architecture/appendix-b-netsuite-data-model
- monday column types (API): https://developer.monday.com/api-reference/reference/column-types-reference ; columns support: https://support.monday.com/hc/en-us/articles/115005310285-Available-column-types-on-monday-com
- monday board views: https://support.monday.com/hc/en-us/articles/360001267945-The-board-views ; automations: https://support.monday.com/hc/en-us/articles/360001222900-Get-started-with-monday-automations ; dashboards: https://support.monday.com/hc/en-us/articles/360002187819-The-Dashboards ; subitems: https://support.monday.com/hc/en-us/articles/360011905480-All-about-subitems
- Airtable field types: https://support.airtable.com/docs/supported-field-types-in-airtable-overview ; API field model: https://airtable.com/developers/web/api/model/field-type
- Notion database properties: https://www.notion.com/help/database-properties
- Freshsales modules: https://support.freshsales.io/support/solutions/160485 ; CPQ add-on: https://support.freshsales.io/support/solutions/articles/50000003237-what-is-cpq-add-on-how-does-the-add-on-work-
- Salesforce quote templates: https://help.salesforce.com/s/articleView?id=sales.quotes_templates_landing.htm ; NetSuite Advanced PDF/HTML Templates: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N2917077.html

