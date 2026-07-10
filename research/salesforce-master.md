# Salesforce master extraction

Competitive-intelligence build spec for Rally. Every standard object, field, tab, and feature
extracted from Salesforce public documentation. Compiled 2026-07-09.

Primary sources:
- Object Reference for the Salesforce Platform: https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_list.htm (per-object pages fetched via the docs content API, release 252.0 / Winter '26)
- Salesforce Help (record pages, quotes, CPQ): https://help.salesforce.com
- Trailhead (Lightning App Builder, record page anatomy): https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_recordpage
- CPQ overview: https://www.salesforce.com/sales/cpq/what-is-cpq/ and https://help.salesforce.com/s/articleView?id=sf.cpq_discounts.htm

Conventions used below:
- "reference" = lookup (foreign key) to another object.
- "compound" = read-only composite field assembled from component fields (addresses, names).
- System audit fields exist on EVERY object and are not repeated in each table:
  Id (18-char record id), CreatedById, CreatedDate, LastModifiedById, LastModifiedDate,
  SystemModstamp, IsDeleted (where applicable). Rally equivalent: id, created_by, created_at,
  updated_by, updated_at, deleted_at.

---

## 1. Objects inventory

Source: https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_list.htm

### Core sales objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| Lead | Lead | Unqualified prospect (person + company in one record) | Converts into Account + Contact + Opportunity |
| Account | Account | Company/organization (or Person Account = B2C person) | Parent of Contacts, Opportunities, Cases, Assets, Contracts, Orders |
| Contact | Contact | Person at an account | AccountId, ReportsToId (self), many-to-many to Opportunities via OpportunityContactRole |
| Opportunity | Opportunity | Deal / pending sale | AccountId, CampaignId, Pricebook2Id, SyncedQuoteId |
| OpportunityLineItem | OpportunityLineItem | Product line on an opportunity ("Opportunity Product") | OpportunityId, PricebookEntryId, Product2Id |
| OpportunityContactRole | OpportunityContactRole | Junction: contact's role on a deal | OpportunityId, ContactId, Role, IsPrimary |
| OpportunityTeamMember | OpportunityTeamMember | Sales team member on a deal | OpportunityId, UserId, TeamMemberRole, OpportunityAccessLevel |
| OpportunitySplit | OpportunitySplit | Revenue/overlay credit split | OpportunityId, SplitOwnerId, SplitPercentage, SplitTypeId |
| OpportunityStage | OpportunityStage | Metadata-ish object holding stage definitions | MasterLabel, DefaultProbability, ForecastCategoryName, IsClosed, IsWon, SortOrder |
| Partner / AccountPartner / OpportunityPartner | Partner | Partner relationships on accounts/opportunities | AccountFromId/AccountToId, Role, IsPrimary |
| AccountContactRelation | AccountContactRelation | Contact related to multiple accounts | AccountId, ContactId, Roles, IsDirect, IsActive |
| AccountTeamMember | AccountTeamMember | Account team member | AccountId, UserId, TeamMemberRole, access levels |

### Quote-to-cash objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| Quote | Quote | Proposed prices/terms snapshot of an opportunity | OpportunityId, AccountId, ContactId, Pricebook2Id, ContractId |
| QuoteLineItem | QuoteLineItem | Product line on a quote | QuoteId, PricebookEntryId, Product2Id, OpportunityLineItemId |
| QuoteDocument | QuoteDocument | Generated quote PDF stored against the quote | QuoteId, Document (blob), TemplateId |
| Product2 | Product2 | Sellable product/service catalog entry | Referenced by PricebookEntry, line items, Assets |
| Pricebook2 | Pricebook2 | Named price list (Standard + custom) | Contains PricebookEntry records |
| PricebookEntry | PricebookEntry | Price of one product in one price book + currency | Pricebook2Id, Product2Id, UnitPrice |
| Contract | Contract | Signed agreement with an account | AccountId, Pricebook2Id, OwnerId; referenced by Orders and Opportunities |
| Order | Order | Confirmed purchase (draft -> activated) | AccountId, ContractId, OpportunityId, QuoteId, Pricebook2Id |
| OrderItem | OrderItem | Product line on an order | OrderId, PricebookEntryId, Product2Id, QuoteLineItemId |
| Asset | Asset | Product a customer owns/has installed | AccountId, ContactId, Product2Id, ParentId (asset hierarchy) |

### Marketing objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| Campaign | Campaign | Marketing initiative (email, event, ads...) | ParentId (hierarchy); influences Leads/Contacts/Opportunities |
| CampaignMember | CampaignMember | Junction: lead/contact in a campaign + response status | CampaignId, LeadId/ContactId, Status |
| CampaignMemberStatus | CampaignMemberStatus | Per-campaign allowed member statuses | CampaignId, Label, HasResponded, IsDefault, SortOrder |
| CampaignInfluenceModel / CampaignInfluence | CampaignInfluence | Multi-touch attribution of campaigns to opportunities | CampaignId, OpportunityId, Influence % |

### Service objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| Case | Case | Customer issue/ticket | AccountId, ContactId, ParentId, AssetId, EntitlementId |
| CaseComment | CaseComment | Comment thread on a case | ParentId (Case), IsPublished |
| EmailMessage | EmailMessage | Email stored against case/records | ParentId, ActivityId, Incoming, To/From/Cc/Bcc |
| Entitlement / ServiceContract / ContractLineItem | - | SLA machinery (entitlement process, milestones) | AccountId, AssetId |
| Solution / Knowledge (Knowledge__kav) | - | Knowledge base articles | linked to Cases |

### Activity objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| Task | Task | To-do / call log / email log | WhoId (Lead/Contact), WhatId (almost any object), OwnerId (user or queue) |
| Event | Event | Calendar meeting/appointment | WhoId, WhatId, invitees (EventRelation), recurrence |
| ActivityHistory / OpenActivity | - | Read-only unions used by related lists | queried via subqueries only |
| EventRelation / TaskRelation | - | Shared-activities junctions (multiple whos) | EventId/TaskId, RelationId |

### Admin / platform objects (CRM-relevant)

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| User | User | A Salesforce user | ProfileId, UserRoleId, ManagerId |
| Profile | Profile | Base permission container + license | referenced by User |
| PermissionSet / PermissionSetGroup / PermissionSetAssignment | - | Additive permissions | AssigneeId (User) |
| UserRole | UserRole | Node in the role hierarchy (record visibility rollup) | ParentRoleId |
| Group / GroupMember | Group | Public groups + queues | queues own Leads/Cases/Tasks/custom objects |
| RecordType | RecordType | Per-object record subtype (layouts + picklists per type) | SobjectType, BusinessProcessId |
| Territory2 | Territory2 | Territory in Enterprise Territory Management | Territory2ModelId, ParentTerritory2Id |
| Territory2Model / Territory2Type / UserTerritory2Association / ObjectTerritory2Association | - | Territory model machinery | account/opportunity assignment |
| Report / Dashboard / ReportType | - | Analytics metadata | folders, subscriptions |
| ListView | ListView | Saved filtered view per object | SobjectType |
| EmailTemplate | EmailTemplate | Classic/Lightning email templates | FolderId |
| DuplicateRule / MatchingRule / DuplicateRecordSet / DuplicateRecordItem | - | Dedupe machinery | per object |
| AssignmentRule / AutoResponseRule / EscalationRule | - | Lead/Case routing automation | per object |
| ProcessInstance / ProcessInstanceStep / ProcessInstanceWorkitem | - | Approval process runtime records | TargetObjectId |
| Note / ContentNote / ContentDocument / ContentVersion / Attachment | - | Notes + files | ContentDocumentLink to any record |
| FeedItem / FeedComment | - | Chatter posts on records | ParentId |

### Forecasting objects

| Object | API name | What it is | Key relationships |
|---|---|---|---|
| ForecastingType | ForecastingType | A forecast "flavor" (revenue vs quantity, by role vs territory, monthly vs quarterly) | referenced by all forecasting rows |
| ForecastingItem | ForecastingItem | One cell of the forecast grid (owner x period x category) | ForecastingTypeId, OwnerId, ForecastCategoryName, amounts |
| ForecastingQuota | ForecastingQuota | Quota per user/territory per period | QuotaAmount, QuotaQuantity, PeriodId |
| ForecastingAdjustment | ForecastingAdjustment | Manager adjustment of a subordinate's forecast | ForecastingItemCategory, AdjustedAmount |
| ForecastingOwnerAdjustment | ForecastingOwnerAdjustment | Owner's adjustment of their own forecast | same shape as above |
| ForecastingFact | ForecastingFact | Read-only computed rollup row | links item to period/user |
| ForecastingCategoryMapping | ForecastingCategoryMapping | Maps opportunity ForecastCategory -> forecast rollup columns | ForecastingTypeId |
| Period | Period | Fiscal periods (month/quarter/year) | used by quotas + forecasts |

Object count in scope for Rally parity: 60+ standard objects (22 with full field tables below).

---

## 2. FIELD TABLES

Field tables below come from the per-object pages of the Object Reference, release 252.0, e.g.
https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
(swap `account` for each object name). System audit fields (Id, CreatedById, CreatedDate,
LastModifiedById, LastModifiedDate, SystemModstamp, IsDeleted) are implied on every table.

### 2.1 Lead (~50 user-facing standard fields)

Source: sforce_api_objects_lead.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| Address | address (compound) | Read-only composite of Street/City/State/PostalCode/Country + geo |
| AnnualRevenue | currency | Annual revenue of the lead's company |
| City | string(40) | |
| CleanStatus | picklist | Data.com: Matched, Different, Acknowledged, NotFound, Inactive, Pending, SelectMatch, Skipped |
| Company | string(255) | REQUIRED. If blank with person accounts enabled, converts to person account |
| CompanyDunsNumber | string(9) | D-U-N-S number (Data.com Prospector/Clean) |
| ConvertedAccountId | reference(Account) | Set on conversion; read-only |
| ConvertedContactId | reference(Contact) | Set on conversion; read-only |
| ConvertedOpportunityId | reference(Opportunity) | Set on conversion; read-only |
| ConvertedDate | date | Date lead was converted |
| Country | string(80) | |
| CountryCode | picklist | ISO code (state/country picklists enabled) |
| CurrencyIsoCode | picklist | Multicurrency orgs only |
| DandBCompanyId | reference | Dun & Bradstreet company record |
| Description | textarea(32k) | |
| Division | picklist | Divisions feature |
| Email | email | idLookup; drives bounce fields |
| EmailBouncedDate | dateTime | Bounce management |
| EmailBouncedReason | string | Bounce management |
| Fax | phone | |
| FirstName | string(40) | |
| GenderIdentity | picklist | |
| GeocodeAccuracy | picklist | Address, Block, City, County, ExtendedZip, NearAddress, Neighborhood, State, Street, Unknown, Zip |
| HasOptedOutOfEmail | boolean | Email Opt Out |
| HasOptedOutOfFax | boolean | Fax Opt Out |
| IndividualId | reference(Individual) | Data privacy (consent) record |
| Industry | picklist | Standard values: Agriculture, Apparel, Banking, Biotechnology, Chemicals, Communications, Construction, Consulting, Education, Electronics, Energy, Engineering, Entertainment, Environmental, Finance, Food & Beverage, Government, Healthcare, Hospitality, Insurance, Machinery, Manufacturing, Media, Not For Profit, Recreation, Retail, Shipping, Technology, Telecommunications, Transportation, Utilities, Other |
| IsConverted | boolean | Read-only after convert() |
| IsPriorityRecord | boolean | User flagged important (API 59+) |
| IsUnreadByOwner | boolean | "Unread by owner" flag after assignment |
| Jigsaw / JigsawContactId | string(20) | Data.com keys (legacy) |
| LastActivityDate | date | Most recent event or closed task |
| LastName | string(80) | REQUIRED |
| LastReferencedDate / LastViewedDate | dateTime | Recency tracking |
| Latitude / Longitude | double | Geolocation (-90..90 / -180..180) |
| LeadSource | picklist | Default values: Web, Phone Inquiry, Partner Referral, Purchased List, Other |
| MasterRecordId | reference(Lead) | Survivor after merge |
| MiddleName / Suffix | string(40) | Enabled via support |
| MobilePhone | phone | |
| Name | string(203, compound) | FirstName + MiddleName + LastName + Suffix; read-only |
| NumberOfEmployees | int | Label "Employees" |
| OwnerId | reference(User or Queue) | Polymorphic - leads can be queue-owned |
| PartnerAccountId | reference(Account) | PRM |
| Phone | phone | |
| PhotoUrl | url | Social profile image path |
| PostalCode | string(20) | |
| Rating | picklist | Hot, Warm, Cold |
| RecordTypeId | reference(RecordType) | |
| Salutation | picklist | Mr., Ms., Mrs., Dr., Prof. |
| ScoreIntelligenceId | reference | Einstein Lead Scoring record |
| State | string(80) | |
| StateCode | picklist | ISO state code |
| Status | picklist | REQUIRED. Default org values: Open - Not Contacted, Working - Contacted, Closed - Converted, Closed - Not Converted. Backed by LeadStatus object (MasterLabel, IsConverted, IsDefault, SortOrder) |
| Street | textarea | |
| Title | string(128) | |
| Website | url(255) | |
| Sales Engagement extras | - | ActionCadenceId, ActionCadenceAssigneeId, ActionCadenceState (Complete, Error, Initializing, Paused, Processing, Running), ActiveTrackerCount, FirstCallDateTime, FirstEmailDateTime, ActivityMetricId, ActivityMetricRollupId |

### 2.2 Contact (~60 user-facing standard fields)

Source: sforce_api_objects_contact.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| AccountId | reference(Account) | Contact's account; private contact if null |
| AssistantName | string(40) | |
| AssistantPhone | phone | Label "Asst. Phone" |
| Birthdate | date | Year ignored in filters/reports |
| BuyerAttributes | multipicklist | BusinessUser, Buyer, Champion, DecisionMaker, Detractor, Evaluator, ExecutiveSponsor, TechnicalExpert |
| CanAllowPortalSelfReg | boolean | Portal self-registration eligibility |
| CleanStatus | picklist | Matched, Different, Acknowledged, NotFound, Inactive, Pending, SelectMatch, Skipped |
| ContactSource | picklist | e.g. Auto Create (automatic contact creation) |
| CurrencyIsoCode | picklist | Multicurrency orgs |
| Department | string(80) | Free text |
| DepartmentGroup | picklist | chiefExecutive, customerSuccess, finance, humanResources, legal, marketing, other, sales, support, tech |
| Description | textarea(32k) | |
| DoNotCall | boolean | Privacy preference |
| Email | email | idLookup; bounce management fields below |
| EmailBouncedDate / EmailBouncedReason / IsEmailBounced | dateTime/string/boolean | Bounce management |
| Fax | phone | Label "Business Fax" |
| FirstName | string(40) | |
| GenderIdentity | picklist | |
| HasOptedOutOfEmail | boolean | Email Opt Out |
| HasOptedOutOfFax | boolean | Fax Opt Out |
| HomePhone | phone | |
| IndividualId | reference(Individual) | Data privacy record |
| IsPersonAccount | boolean | Read-only person-account indicator |
| IsPriorityRecord | boolean | API 59+ |
| Jigsaw / JigsawContactId | string | Data.com keys (legacy) |
| LastActivityDate | date | Most recent event/closed task |
| LastName | string(80) | REQUIRED |
| LastReferencedDate / LastViewedDate | dateTime | Recency |
| LeadSource | picklist | Same values as Lead.LeadSource; carried over on conversion |
| MailingAddress | address (compound) | MailingStreet (textarea), MailingCity(40), MailingState(80), MailingStateCode, MailingPostalCode(20), MailingCountry(80), MailingCountryCode, MailingLatitude, MailingLongitude, MailingGeocodeAccuracy |
| MasterRecordId | reference(Contact) | Merge survivor |
| MiddleName / Suffix | string(40) | |
| MobilePhone | phone | |
| Name | string(203, compound) | Read-only concatenation |
| OtherAddress | address (compound) | OtherStreet, OtherCity, OtherState(Code), OtherPostalCode, OtherCountry(Code), OtherLatitude/Longitude/GeocodeAccuracy |
| OtherPhone | phone | |
| OwnerId | reference(User) | |
| Phone | phone | Label "Business Phone" |
| PhotoUrl | url | |
| Pronouns | picklist | He/Him, He/They, Not Listed, She/Her, She/They, They/Them |
| RecordTypeId | reference(RecordType) | |
| ReportsToId | reference(Contact) | Self-lookup -> org chart |
| Salutation | picklist | Mr., Ms., Mrs., Dr., Prof. |
| ScoreIntelligenceId | reference | Einstein scoring |
| Title | string(128) | Job title |
| Sales Engagement extras | - | ActionCadenceId, ActionCadenceAssigneeId, ActionCadenceState, ActiveTrackerCount, FirstCallDateTime, FirstEmailDateTime, ActivityMetricId, ActivityMetricRollupId |

### 2.3 Account (~60 user-facing standard fields)

Source: sforce_api_objects_account.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| AccountNumber | string(40) | Free-text account number |
| AccountSource | picklist | Same value set as LeadSource (Web, Phone Inquiry, Partner Referral, Purchased List, Other) |
| AnnualRevenue | currency | Estimated annual revenue |
| BillingAddress | address (compound) | BillingStreet (textarea), BillingCity(40), BillingState(80), BillingStateCode, BillingPostalCode(20), BillingCountry(80), BillingCountryCode, BillingLatitude, BillingLongitude, BillingGeocodeAccuracy |
| ChannelProgramName / ChannelProgramLevelName | string | PRM channel programs (read-only) |
| CleanStatus | picklist | Data.com clean status (Matched, Different, Acknowledged, NotFound, Inactive, Pending, SelectMatch, Skipped) |
| Description | textarea(32k) | |
| DunsNumber | string(9) | D-U-N-S (business accounts) |
| Fax | phone | |
| Industry | picklist | Same 32-value standard industry list as Lead.Industry |
| IsCustomerPortal | boolean | Has portal/Experience Cloud users |
| IsPartner | boolean | Partner account flag |
| IsPersonAccount | boolean | Read-only |
| IsPriorityRecord | boolean | API 60+ |
| Jigsaw / JigsawCompanyId | string(20) | Data.com keys (legacy) |
| LastActivityDate | date | Most recent event/closed task |
| LastReferencedDate / LastViewedDate | dateTime | Recency |
| MasterRecordId | reference(Account) | Merge survivor |
| NaicsCode | string(8) | NAICS industry code |
| NaicsDesc | string(120) | NAICS description |
| Name | string(255) | REQUIRED. Person accounts concatenate name parts |
| NumberOfEmployees | int(8 digits) | Label "Employees" |
| OperatingHoursId | reference | Field Service |
| OwnerId | reference(User) | Needs Transfer Record perm to change |
| Ownership | picklist | Public, Private, Subsidiary, Other |
| ParentId | reference(Account) | Account hierarchy |
| Phone | phone(40) | |
| PhotoUrl | url | Social profile image |
| Rating | picklist | Hot, Warm, Cold |
| RecordTypeId | reference(RecordType) | |
| Salutation | picklist | Person accounts only |
| ShippingAddress | address (compound) | ShippingStreet(255), ShippingCity(40), ShippingState(80), ShippingStateCode, ShippingPostalCode(20), ShippingCountry(80), ShippingCountryCode, ShippingLatitude/Longitude/GeocodeAccuracy |
| Sic | string(20) | Standard Industrial Classification code |
| SicDesc | string(80) | SIC description |
| Site | string(80) | Account site/location label |
| TickerSymbol | string(20) | |
| Tradestyle | string(255) | "Doing business as" name |
| Type | picklist | Standard values: Prospect, Customer - Direct, Customer - Channel, Channel Partner / Reseller, Installation Partner, Technology Partner, Other (docs cite Customer, Competitor, Partner as examples) |
| Website | url(255) | |
| YearStarted | string(4) | Year legally established |
| Person-account passthrough | - | Person accounts expose Person* mirrors of contact fields (PersonEmail, PersonMobilePhone, PersonBirthdate, PersonMailingAddress, PersonTitle, PersonDepartment, PersonLeadSource, PersonAssistantName ...) |
| Sales Engagement extras | - | PersonActionCadenceId, PersonActionCadenceAssigneeId, PersonActionCadenceState (Complete, Error, Initializing, Paused, Processing, Running), PersonScheduledResumeDateTime, ActivityMetricId |
| Salesforce-to-Salesforce | - | ConnectionReceivedId, ConnectionSentId (also present on most CRM objects; omitted from other tables) |

### 2.4 Opportunity (~50 standard fields)

Source: sforce_api_objects_opportunity.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| AccountId | reference(Account) | |
| AgeInDays | int | Days since created (Pipeline Inspection, API 52+) |
| Amount | currency | Estimated total; auto-calculated from line items when products added |
| CampaignId | reference(Campaign) | Primary campaign source |
| CloseDate | date | REQUIRED |
| ContactId | reference(Contact) | Read-only, derived from primary OpportunityContactRole (API 46+) |
| ContractId | reference(Contract) | |
| CurrencyIsoCode | picklist | Must match price book currency if products used |
| Description | textarea(32k) | |
| ExpectedRevenue | currency | Read-only = Amount x Probability |
| Fiscal / FiscalQuarter / FiscalYear | string / int / int | Derived fiscal period of CloseDate |
| ForecastCategory | picklist (restricted) | BestCase, Closed, Forecast, MostLikely, Omitted, Pipeline; implied by StageName, overrideable |
| ForecastCategoryName | picklist | Display labels: Pipeline, Best Case, Most Likely, Commit, Closed, Omitted |
| HasOpenActivity | boolean | Open task/event exists (API 35+) |
| HasOpportunityLineItem | boolean | Read-only; products attached |
| HasOverdueTask | boolean | API 35+ |
| IqScore | int | Einstein Opportunity Score 1-99 |
| IsClosed | boolean | Read-only, driven by StageName |
| IsExcludedFromTerritory2Filter | boolean | Filter-based territory assignment |
| IsPriorityRecord | boolean | API 53+ |
| IsSplit | boolean | Read-only; splits enabled on this opp |
| IsWon | boolean | Read-only, driven by StageName |
| LastActivityDate / LastActivityInDays | date / int | Activity recency (LastActivityInDays API 52+) |
| LastAmountChangedHistoryId | reference(OpportunityHistory) | Pipeline Inspection deltas |
| LastCloseDateChangedHistoryId | reference(OpportunityHistory) | Pipeline Inspection deltas |
| LastStageChangeDate / LastStageChangeInDays | dateTime / int | Stage recency (API 52+) |
| LastReferencedDate / LastViewedDate | dateTime | Recency |
| LeadSource | picklist | Same values as Lead.LeadSource |
| Name | string(120) | REQUIRED |
| NextStep | string(255) | |
| OwnerId | reference(User) | REQUIRED, defaults to creator |
| PartnerAccountId | reference(Account) | PRM |
| Pricebook2Id | reference(Pricebook2) | Which price book the line items use |
| Probability | percent | Defaulted from stage, user-overrideable |
| PushCount | int | Times CloseDate pushed out by a month+ (API 53+) |
| RecordTypeId | reference(RecordType) | Different sales processes per record type |
| StageName | picklist | REQUIRED. Controls IsClosed/IsWon/ForecastCategory/Probability. Default org values (from OpportunityStage): Prospecting (10%), Qualification (10%), Needs Analysis (20%), Value Proposition (50%), Id. Decision Makers (60%), Perception Analysis (70%), Proposal/Price Quote (75%), Negotiation/Review (90%), Closed Won (100%, won), Closed Lost (0%, lost) |
| SyncedQuoteId | reference(Quote) | The one quote currently syncing with this opp |
| Territory2Id | reference(Territory2) | Enterprise Territory Management |
| TotalOpportunityQuantity | double | Quantity for quantity-based forecasting |
| Type | picklist | Standard values: Existing Customer - Upgrade, Existing Customer - Replacement, Existing Customer - Downgrade, New Customer (docs cite Existing Business / New Business as examples) |

Supporting: **OpportunityStage** rows define each stage: MasterLabel, ApiName, IsActive, IsClosed,
IsWon, DefaultProbability, ForecastCategory, ForecastCategoryName, SortOrder, Description.
**OpportunityHistory** (stage change audit: StageName, Amount, ExpectedRevenue, CloseDate,
Probability, ForecastCategory, PrevAmount, PrevCloseDate) and **OpportunityFieldHistory**
(generic field audit) power the Stage History related list.

### 2.5 OpportunityLineItem (Opportunity Product)

Source: sforce_api_objects_opportunitylineitem.htm

| Field | Type | Notes |
|---|---|---|
| OpportunityId | reference(Opportunity) | REQUIRED |
| PricebookEntryId | reference(PricebookEntry) | REQUIRED; the product+pricebook+currency tuple |
| Product2Id | reference(Product2) | Read-only mirror (API 30+) |
| ProductCode | string | Read-only mirror from Product2 |
| Name | string | Read-only, "Opportunity Product" display name |
| Quantity | double | REQUIRED (with UnitPrice); read-only when schedules exist |
| UnitPrice | currency | Sales price per unit; specify this OR TotalPrice |
| TotalPrice | currency | Line total; mutually exclusive with UnitPrice on insert |
| ListPrice | currency | Read-only = PricebookEntry.UnitPrice at add time |
| Subtotal | currency | Read-only; standard minus discounted pricing |
| Discount | percent | Line discount % |
| ServiceDate | date | Revenue-recognition/ship date, label "Date" |
| Description | string(255) | Line description |
| SortOrder | int | Display order |
| HasQuantitySchedule / HasRevenueSchedule / HasSchedule | boolean | Product schedules (installments) |
| CanUseQuantitySchedule / CanUseRevenueSchedule | boolean | Read-only capability flags |
| RecalculateTotalPrice | boolean | Recalc behavior on schedule rollup |
| CurrencyIsoCode | picklist | Mirrors opportunity currency |
| LastReferencedDate / LastViewedDate | dateTime | API 50+ |

### 2.6 OpportunityContactRole

Source: sforce_api_objects_opportunitycontactrole.htm

| Field | Type | Notes |
|---|---|---|
| OpportunityId | reference(Opportunity) | REQUIRED, not updatable |
| ContactId | reference(Contact) | REQUIRED |
| Role | picklist | Default values: Business User, Decision Maker, Economic Buyer, Economic Decision Maker, Evaluator, Executive Sponsor, Influencer, Technical Buyer, Other |
| IsPrimary | boolean | Exactly one primary contact per opportunity |
| CurrencyIsoCode | picklist | API 47+ |

### 2.7 Opportunity team + splits

- **OpportunityTeamMember**: OpportunityId, UserId, TeamMemberRole (picklist: Account Manager,
  Channel Manager, Executive Sponsor, Lead Qualifier, Pre-Sales Consultant, Sales Manager, Sales Rep),
  OpportunityAccessLevel (Read/Edit). Team selling must be enabled.
- **OpportunitySplit**: OpportunityId, SplitOwnerId (must be on the team), SplitTypeId,
  SplitPercentage, SplitAmount, SplitNote. **SplitType**: revenue splits (must total 100%) and
  overlay splits (any total). Source: sforce_api_objects_opportunitysplit.htm

### 2.8 Quote (~50 standard fields + 4 compound addresses)

Source: sforce_api_objects_quote.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| OpportunityId | reference(Opportunity) | REQUIRED at creation; quote belongs to one opp |
| Name | string(255) | REQUIRED |
| QuoteNumber | string | System-generated auto number |
| AccountId | reference(Account) | Copied from opportunity |
| ContactId | reference(Contact) | Quote recipient |
| BillToContactId | reference(Contact) | API 56+ |
| Email / Phone / Fax | email / phone / phone | Recipient contact info snapshot |
| Status | picklist | Default values: Draft, Needs Review, In Review, Approved, Rejected, Presented, Accepted, Denied (plus blank/None). Org defines which statuses count as final |
| ExpirationDate | date | Quote validity end |
| Description | textarea(32k) | |
| IsSyncing | boolean | True for the quote synced to the opportunity |
| Pricebook2Id | reference(Pricebook2) | |
| ContractId | reference(Contract) | |
| LineItemCount | int | Read-only count |
| Subtotal | currency | Sum of line subtotals before discount |
| Discount | percent | Read-only weighted overall discount |
| TotalPrice | currency | After line discounts, before tax/shipping |
| Tax | currency | Manually entered tax amount |
| ShippingHandling | currency | Manually entered shipping and handling |
| GrandTotal | currency | TotalPrice + Tax + ShippingHandling |
| TotalPriceWithTax / TotalTaxAmount | currency | Revenue Lifecycle Mgmt calculated fields (API 55+) |
| CalculationStatus | picklist | RLM pricing engine states: NotStarted, PriceCalculationQueued, CompletedWithPricing, CompletedWithTax, CompletedWithoutPricing, ConfigurationInProgress, ConfigurationFailed, PriceCalculationInProgress, PriceCalculationFailed, TaxCalculationInProcess, TaxCalculationWaiting, TaxCalculationFailed, TaxCalculationSuccess, SaveFailedOrIncomplete, Saving, ReconciliationInProgress, ReconciliationFailed, QuoteRequestPartiallySaved, QuoteRequestFailed |
| BillingAddress | address (compound) | BillingName + BillingStreet/City/State(Code)/PostalCode/Country(Code)/Lat/Long |
| ShippingAddress | address (compound) | ShippingName + same component set |
| QuoteToAddress | address (compound) | QuoteToName + same component set |
| AdditionalAddress | address (compound) | AdditionalName + same component set |
| RecordTypeId | reference(RecordType) | |
| RelatedWorkId | reference(WorkOrder) | Field Service |
| CurrencyIsoCode | picklist | Copied from opportunity |
| CanCreateQuoteLineItems | boolean | Reserved/unused |
| LastReferencedDate / LastViewedDate | dateTime | |

Related: **QuoteDocument** (QuoteId, Document base64 PDF, DisplayedFields, TemplateId) - one row
per generated quote PDF version.

### 2.9 QuoteLineItem (~40 standard fields)

Source: sforce_api_objects_quotelineitem.htm

| Field | Type | Notes |
|---|---|---|
| QuoteId | reference(Quote) | REQUIRED |
| PricebookEntryId | reference(PricebookEntry) | REQUIRED |
| Product2Id | reference(Product2) | REQUIRED (derived) |
| OpportunityLineItemId | reference(OpportunityLineItem) | Sync mapping to the opp line (API 40+) |
| LineNumber | string | Auto number "QL-XXXXX" |
| Quantity | double | REQUIRED |
| UnitPrice | currency | REQUIRED; sales price |
| ListPrice | currency | Read-only from price book |
| ListPriceTotal | currency | ListPrice x Quantity |
| Subtotal | currency | Quantity x UnitPrice |
| Discount | percent | 0-100 |
| DiscountAmount | currency | Fixed-amount discount (API 59+) |
| TotalPrice | currency | Subtotal minus discount |
| NetUnitPrice / NetTotalPrice | currency | After all adjustments (RLM, API 56+) |
| TotalLineAmount / TotalAdjustmentAmount | currency | RLM calculated (API 56+) |
| TotalPriceWithTax / TotalTaxAmount | currency | RLM tax (API 55+) |
| ServiceDate | date | Revenue/ship date |
| Description | string(255) | |
| SortOrder | int | Order in list and on PDF |
| HasQuantitySchedule / HasRevenueSchedule / HasSchedule | boolean | Mirrors opp line schedules |
| CurrencyIsoCode | picklist | Copied from quote |
| Subscription Mgmt / RLM extras | - | BillingFrequency, StartDate, EndDate (API 55+), StartQuantity/EndQuantity (API 60+), SellingModelType (OneTime, Evergreen, TermDefined), SubscriptionTerm + SubscriptionTermUnit (Months/Annual), PricingTerm/PricingTermUnit/PricingTermCount, PeriodBoundary + PeriodBoundaryDay + PeriodBoundaryStartMonth, ProrationPolicyId, ProductSellingModelId, ParentQuoteLineItemId, QuoteActionId, TaxTreatmentId, PartnerDiscountPercent, PartnerUnitPrice, PriceWaterfallIdentifier, StartingPriceTotal, StartingUnitPriceSource (Manual/System/Inherited), Status (In Progress, Pending, Approved, Rejected), ValidationResult |
| LastReferencedDate / LastViewedDate | dateTime | |

### 2.10 Product2 (~30 standard fields)

Source: sforce_api_objects_product2.htm

| Field | Type | Notes |
|---|---|---|
| Name | string(255) | REQUIRED; idLookup |
| ProductCode | string(255) | Org-defined code |
| StockKeepingUnit | string(180) | SKU; use with or instead of ProductCode |
| Description | textarea(4000) | |
| Family | picklist | Product family (org-defined values); used for reporting + schedules |
| IsActive | boolean | Only active products can be added to price books/opps |
| IsArchived | boolean | Archived products hidden but referenced |
| QuantityUnitOfMeasure | picklist | e.g. kilograms, liters, cases |
| DisplayUrl | url(1000) | External image/details link |
| ExternalId | string(255) | External-system key |
| ExternalDataSourceId | reference | External object plumbing |
| CanUseQuantitySchedule / CanUseRevenueSchedule | boolean | Enables default schedules |
| NumberOfQuantityInstallments / QuantityInstallmentPeriod / QuantityScheduleType | int / picklist / picklist | Default quantity schedule (Period: Daily, Weekly, Monthly, Quarterly, Yearly; Type: Divide, Repeat) |
| NumberOfRevenueInstallments / RevenueInstallmentPeriod / RevenueScheduleType | int / picklist / picklist | Default revenue schedule (same value sets) |
| RecalculateTotalPrice | boolean | Schedule rollup behavior |
| IsSerialized | boolean | Serial-number tracked |
| StockCheckMethod | picklist | ParentProduct, ChildProducts, DoNotCheck |
| TransferRecordMode | picklist | SendAndReceive, ReceiveOnly (serialized products) |
| Type | picklist | Base (Commerce, API 50+) |
| ProductClass | picklist (read-only) | Simple, Bundle, Set, VariationParent, Variation |
| ConfigureDuringSale | picklist | Bundle configurability (API 58+) |
| IsSoldOnlyWithOtherProds | boolean | Bundle-only product (API 58+) |
| BillingPolicyId / TaxPolicyId | reference | Subscription Management (API 55+) |
| CurrencyIsoCode | picklist | Multicurrency |
| LastReferencedDate / LastViewedDate | dateTime | |

### 2.11 Pricebook2

Source: sforce_api_objects_pricebook2.htm

| Field | Type | Notes |
|---|---|---|
| Name | string(255) | REQUIRED |
| Description | string(255) | |
| IsActive | boolean | Must be active to add to opportunities/quotes |
| IsStandard | boolean | Read-only; exactly one standard price book per org |
| IsArchived | boolean | |
| ValidFrom / ValidTo | dateTime | Price book validity window (API 55+, RLM) |
| LastReferencedDate / LastViewedDate | dateTime | |

Rules: every product needs a Standard Price (entry in the standard price book) BEFORE it can get
a custom price book entry. Opportunity/Quote picks ONE price book; all line items must come from it.

### 2.12 PricebookEntry

Source: sforce_api_objects_pricebookentry.htm

| Field | Type | Notes |
|---|---|---|
| Pricebook2Id | reference(Pricebook2) | REQUIRED; immutable after create |
| Product2Id | reference(Product2) | REQUIRED; immutable after create |
| UnitPrice | currency | REQUIRED; list price in this book |
| IsActive | boolean | |
| UseStandardPrice | boolean | When true, mirrors the standard price book price and UnitPrice is read-only |
| IsArchived | boolean | Read-only (API 45+) |
| Name / ProductCode | string | Read-only mirrors from Product2 |
| CurrencyIsoCode | picklist | One entry per currency per book per product in multicurrency orgs |
| ProductSellingModelId | reference | Subscription Management (API 55+) |
| ActivePriceAdjustmentQuantity | int | Count of price adjustment schedules (API 49+) |

### 2.13 Campaign (~40 core fields + ~30 rollups)

Source: sforce_api_objects_campaign.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| Name | string(80) | REQUIRED |
| IsActive | boolean | Shows in campaign lookups when active |
| Type | picklist | Default values: Advertisement, Banner Ads, Direct Mail, Email, Telemarketing, Seminar/Conference, Public Relations, Partners, Referral Program, Webinar, Trade Show, Other |
| Status | picklist | Default values: Planned, In Progress, Completed, Aborted |
| StartDate / EndDate | date | Responses after EndDate still counted |
| Description | textarea(32k) | |
| ParentId | reference(Campaign) | Campaign hierarchy |
| OwnerId | reference(User) | |
| RecordTypeId | reference(RecordType) | |
| CampaignMemberRecordTypeId | reference(RecordType) | Record type applied to members |
| BudgetedCost | currency | Planned spend |
| ActualCost | currency | Actual spend |
| ExpectedRevenue | currency | Projected return |
| ExpectedResponse | percent | Anticipated response rate |
| NumberSent | double | Individuals targeted |
| NumberOfLeads | int | Rollup: leads sourced |
| NumberOfConvertedLeads | int | Rollup |
| NumberOfContacts | int | Rollup |
| NumberOfResponses | int | Rollup: members with a responded status |
| NumberOfOpportunities | int | Rollup |
| NumberOfWonOpportunities | int | Rollup |
| AmountAllOpportunities | currency | Rollup: pipeline value |
| AmountWonOpportunities | currency | Rollup: won value |
| Hierarchy* rollups | currency/int/double | Same 12 metrics aggregated across the campaign hierarchy: HierarchyBudgetedCost, HierarchyActualCost, HierarchyExpectedRevenue, HierarchyNumberOfLeads, HierarchyNumberOfConvertedLeads, HierarchyNumberOfContacts, HierarchyNumberOfResponses, HierarchyNumberOfOpportunities, HierarchyNumberOfWonOpportunities, HierarchyAmountAllOpportunities, HierarchyAmountWonOpportunities, HierarchyNumberSent |
| Marketing Cloud Account Engagement (Pardot) metrics | int | TotalEmailsDelivered, UniqueEmailOpens, UniqueEmailTrackedLinkClicks, UniqueMarketingLinkClicks, TotalFormViews, TotalFormSubmissions, TotalLandingPageViews, TotalLandingPageFormSubmissions + Hierarchy* versions of each; TenantId (business unit) |
| BriefId / CampaignImageId | reference | Content brief; partner community image |
| LastActivityDate | date | |
| LastReferencedDate / LastViewedDate | dateTime | |
| CurrencyIsoCode | picklist | |

### 2.14 CampaignMember

Source: sforce_api_objects_campaignmember.htm

| Field | Type | Notes |
|---|---|---|
| CampaignId | reference(Campaign) | REQUIRED |
| LeadId | reference(Lead) | One of LeadId/ContactId required |
| ContactId | reference(Contact) | |
| LeadOrContactId | reference | Read-only polymorphic convenience (API 37+) |
| LeadOrContactOwnerId | reference(User/Group) | Read-only |
| AccountId | reference(Account) | Only with Accounts as Campaign Members enabled |
| Status | picklist | Per-campaign values via CampaignMemberStatus; org defaults: Sent, Responded (HasResponded flag on responded statuses) |
| HasResponded | boolean | Read-only; driven by Status |
| FirstRespondedDate | date | First time member hit a responded status |
| Salutation / FirstName / LastName / Name / Title | string | Read-only mirrors from the lead/contact |
| CompanyOrAccount | string | Read-only mirror |
| Street / City / State / PostalCode / Country | string | Read-only address mirrors |
| Email / Phone / Fax / MobilePhone | email/phone | Read-only mirrors |
| LeadSource | picklist | Read-only mirror |
| DoNotCall / HasOptedOutOfEmail / HasOptedOutOfFax | boolean | Read-only privacy mirrors |
| Description | textarea | Read-only mirror |
| Type | string | "Lead" or "Contact" (or Account) |
| RecordTypeId | reference | Member record type |
| CurrencyIsoCode | picklist | |

### 2.15 Case (~45 standard fields)

Source: sforce_api_objects_case.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| CaseNumber | string(30) | Auto number; cannot be set |
| Subject | string(255) | |
| Description | textarea(32k) | |
| Status | picklist | Default values: New, Working, Escalated, Closed (org-customizable; IsClosed derives from status definition in CaseStatus object) |
| Priority | picklist | Default values: High, Medium, Low |
| Origin | picklist | Default values: Phone, Email, Web |
| Type | picklist | Default values: Question, Problem, Feature Request |
| Reason | picklist | Why the case was created, e.g. Instructions not clear, User didn't attend training, Complex functionality, Existing problem, Installation, Equipment Complexity, Performance, Breakdown, Equipment Design, Feedback, Other |
| AccountId | reference(Account) | |
| ContactId | reference(Contact) | |
| ContactEmail / ContactPhone / ContactMobile / ContactFax | email/phone | Read-only mirrors from contact (API 38+) |
| OwnerId | reference(User or Queue) | Polymorphic; queues supported |
| ParentId | reference(Case) | Case hierarchy |
| AssetId | reference(Asset) | Product instance involved |
| AssetWarrantyId | reference | Warranty in play (Field Service) |
| ProductId | reference(Product2) | With entitlement management |
| EntitlementId | reference(Entitlement) | SLA entitlement |
| ServiceContractId | reference(ServiceContract) | |
| BusinessHoursId | reference(BusinessHours) | Drives escalation clocks |
| MilestoneStatus | string | Read-only entitlement milestone summary |
| SlaStartDate / SlaExitDate | dateTime | Entitlement process window (API 18+) |
| IsStopped / StopStartDate | boolean / dateTime | Entitlement process pause |
| IsClosed | boolean | Read-only, driven by Status |
| ClosedDate | dateTime | |
| IsClosedOnCreate | boolean | Closed at creation ("Save and Close") |
| IsEscalated | boolean | Escalation rules or manual |
| SuppliedName / SuppliedEmail / SuppliedPhone / SuppliedCompany | string/email | Raw web-to-case / email-to-case submitted values |
| SourceId | reference | Social post source |
| CommunityId | reference | Zone/community (API 24+) |
| FeedItemId / QuestionId | reference | Question-to-Case provenance |
| Comments | textarea(4000) | Write-only shortcut that inserts a CaseComment |
| HasCommentsUnreadByOwner / HasSelfServiceComments / IsSelfServiceClosed / IsVisibleInSelfService | boolean | Portal/self-service flags |
| Language | picklist | Einstein Case Classification |
| MasterRecordId | reference(Case) | Merge survivor |
| RecordTypeId | reference(RecordType) | Support processes per record type |
| CreatorName / CreatorFullPhotoUrl / CreatorSmallPhotoUrl | string | Chatter Answers provenance |
| LastReferencedDate / LastViewedDate | dateTime | |
| CurrencyIsoCode | picklist | |

Supporting objects: CaseComment (ParentId, CommentBody, IsPublished), CaseHistory,
CaseStatus (MasterLabel, IsClosed, IsDefault, SortOrder), CaseTeamMember/CaseTeamRole,
CaseSolution, CaseMilestone, ContactRequest.

### 2.16 Task (~35 standard fields)

Source: sforce_api_objects_task.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| Subject | combobox(255) | Free text + suggested values (Call, Send Letter, Send Quote...) |
| Status | picklist | REQUIRED. Default values: Not Started, In Progress, Completed, Waiting on someone else, Deferred (TaskStatus object defines IsClosed/IsDefault per value) |
| Priority | picklist | REQUIRED. Default values: High, Normal, Low (TaskPriority object; IsHighPriority derived) |
| ActivityDate | date | Due date (label "Due Date") |
| Description | textarea(32k) | Label "Comments" |
| WhoId | reference(Lead or Contact) | Polymorphic "Name" |
| WhatId | reference(many) | Polymorphic "Related To" (Account, Opportunity, Campaign, Case, Contract, Order, custom objects...) |
| AccountId | reference(Account) | Read-only, derived from WhoId/WhatId |
| OwnerId | reference(User or Queue) | Label "Assigned To"; task queues supported |
| Type | picklist | Optional; e.g. Call, Meeting, Email, Other |
| TaskSubtype | picklist (read-only at update) | Task, Email, ListEmail, Call, Cadence, LinkedIn |
| IsClosed | boolean | Read-only, driven by Status |
| CompletedDateTime | dateTime | Set when closed |
| IsHighPriority | boolean | Read-only, from Priority |
| CallType | picklist | Inbound, Internal, Outbound |
| CallDurationInSeconds | int | CTI |
| CallDisposition | string(255) | Call result (CTI) |
| CallObject | string(255) | CTI call id |
| IsReminderSet / ReminderDateTime | boolean / dateTime | Popup reminders |
| IsRecurrence | boolean | Classic recurring tasks |
| RecurrenceActivityId | reference(Task) | Master of the recurrence series |
| Recurrence fields | - | RecurrenceType (RecursDaily, RecursWeekly, RecursMonthly, RecursMonthlyNth, RecursYearly, RecursYearlyNth, RecursEveryWeekday), RecurrenceInterval, RecurrenceDayOfWeekMask (bitmask Sun=1..Sat=64), RecurrenceDayOfMonth, RecurrenceInstance (First, Second, Third, Fourth, Last), RecurrenceMonthOfYear, RecurrenceStartDateOnly, RecurrenceEndDateOnly, RecurrenceTimeZoneSidKey, RecurrenceRegeneratedType (None, After due date, After the task is closed) |
| IsArchived | boolean | Activities auto-archive after ~365 days |
| IsVisibleInSelfService | boolean | Portal visibility |
| TaskWhoIds | JunctionIdList | Shared Activities: up to 50 contacts per task |
| WhoCount / WhatCount | int | Shared-activity relation counts |
| CurrencyIsoCode | picklist | |

### 2.17 Event (~45 standard fields)

Source: sforce_api_objects_event.htm

| Field | Type | Notes |
|---|---|---|
| Subject | combobox(255) | Call, Email, Meeting, Send Letter/Quote, Other |
| StartDateTime / EndDateTime | dateTime | Timed events |
| ActivityDate / ActivityDateTime | date / dateTime | ActivityDate used when IsAllDayEvent, else ActivityDateTime |
| EndDate | date | Read-only date part of end (API 46+) |
| DurationInMinutes | int | Length |
| IsAllDayEvent | boolean | Switches date semantics |
| Location | string(255) | |
| Description | textarea(32k) | |
| WhoId | reference(Lead/Contact) | Polymorphic "Name" |
| WhatId | reference(many) | Polymorphic "Related To" |
| AccountId | reference | Read-only, derived |
| OwnerId | reference(User or Calendar) | Public calendars can own events |
| Type | picklist | Call, Email, Meeting, Other |
| EventSubtype | picklist | Event (read-only classification) |
| ShowAs | picklist | Busy, OutOfOffice, Free |
| IsPrivate | boolean | Hides details from other users |
| IsGroupEvent | boolean | Has invitees |
| GroupEventType | picklist | 0 non-group, 1 group, 2 proposed, 3 series pattern |
| AcceptedEventInviteeIds / DeclinedEventInviteeIds / UndecidedEventInviteeIds | JunctionIdList | Invitee RSVP state |
| EventWhoIds | JunctionIdList | Shared Activities multi-contact |
| WhoCount / WhatCount | int | |
| IsChild | boolean | Invitee copy of a group event |
| IsReminderSet / ReminderDateTime | boolean / dateTime | |
| IsRecurrence + Recurrence* (Classic) | - | Same recurrence field family as Task plus RecurrenceStartDateTime |
| IsRecurrence2 + Recurrence2* (Lightning) | - | IsRecurrence2Exception, IsRecurrence2Exclusion, Recurrence2PatternText (RRULE, 512 chars), Recurrence2PatternStartDate, Recurrence2PatternTimeZone, Recurrence2PatternVersion |
| IsClientManaged / ClientGuid | boolean / string | External calendar sync (Einstein Activity Capture) |
| IsArchived | boolean | |
| IsVisibleInSelfService | boolean | |
| CurrencyIsoCode / Division | picklist | |

### 2.18 Contract (~40 standard fields)

Source: sforce_api_objects_contract.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| ContractNumber | string(30) | Auto number |
| AccountId | reference(Account) | REQUIRED |
| Status | picklist | Values grouped into StatusCode categories. Defaults: Draft, In Approval Process, Activated |
| StatusCode | picklist (restricted) | Draft, InApproval, Activated |
| StartDate | date | Label "Contract Start Date" |
| EndDate | date | Calculated from StartDate + ContractTerm (read-only unless auto-calc disabled) |
| ContractTerm | int | Term in months |
| OwnerId | reference(User) | |
| OwnerExpirationNotice | picklist | 15, 30, 45, 60, 90, 120 days before expiration |
| Description | textarea(32k) | |
| SpecialTerms | textarea | |
| BillingAddress | address (compound) | BillingStreet/City/State(Code)/PostalCode/Country(Code)/Lat/Long/GeocodeAccuracy |
| ShippingAddress | address (compound) | Same component set |
| ActivatedById / ActivatedDate | reference(User) / dateTime | Activation audit |
| CompanySignedId / CompanySignedDate | reference(User) / date | Internal signer |
| CustomerSignedId / CustomerSignedTitle / CustomerSignedDate | reference(Contact) / string / date | Customer signer |
| LastApprovedDate | dateTime | |
| Pricebook2Id | reference(Pricebook2) | |
| RecordTypeId | reference(RecordType) | |
| PricingSource | picklist | LastTransaction, PriceBookListPrice (API 60+) |
| RenewalTerm2 / RenewalTermUnit | double / picklist | Renewal defaults: Annual, Months, Quarterly, Semi-Annual (API 60+) |
| LastActivityDate | date | |
| LastReferencedDate / LastViewedDate | dateTime | |
| CurrencyIsoCode | picklist | |

Contract lifecycle: Draft -> In Approval Process -> Activated; then expiration notices, renewals.
ContractContactRole (ContactId, ContractId, Role, IsPrimary) mirrors OpportunityContactRole.

### 2.19 Order (~55 standard fields)

Source: sforce_api_objects_order.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| OrderNumber | string(30) | Auto number |
| Name | string(80) | Optional label |
| AccountId | reference(Account) | REQUIRED |
| ContractId | reference(Contract) | Updatable only while Draft |
| OpportunityId | reference(Opportunity) | |
| QuoteId | reference(Quote) | Provenance from quote |
| OriginalOrderId | reference(Order) | For reduction orders |
| RelatedOrderId | reference(Order) | Change orders (Order Management) |
| Status | picklist | Backed by OrderStatus; defaults: Draft, Activated. StatusCode restricted to Draft/Activated |
| Type | picklist | Org-defined |
| EffectiveDate | date | Label "Order Start Date" |
| EndDate | date | Label "Order End Date" |
| OrderedDate | dateTime | When placed (API 48+) |
| IsReductionOrder | boolean | Read-only; reduces a prior order |
| ActivatedById / ActivatedDate | reference(User) / dateTime | |
| CompanyAuthorizedById / CompanyAuthorizedDate | reference(User) / date | |
| CustomerAuthorizedById / CustomerAuthorizedDate | reference(Contact) / date | |
| PoNumber | string(80) | Purchase order number |
| PoDate | date | |
| OrderReferenceNumber | string(80) | External reference |
| OwnerId | reference(User or Queue) | REQUIRED |
| Pricebook2Id | reference(Pricebook2) | REQUIRED for line items |
| BillingAddress | address (compound) | Full component set incl. lat/long/geocode |
| ShippingAddress | address (compound) | Full component set |
| BillToContactId / ShipToContactId | reference(Contact) | |
| BillingEmailAddress / BillingPhoneNumber | email / phone | Order Management (API 48+) |
| Description | textarea(32k) | |
| RecordTypeId | reference(RecordType) | |
| CurrencyIsoCode | picklist | ISO 4217 |
| TotalAmount | currency | Read-only rollup of line items |
| Order Management totals (API 48-49+, license-gated) | currency | GrandTotalAmount, TotalTaxAmount, TotalAdjustedProductAmount, TotalAdjustedProductTaxAmount, TotalAdjustedDeliveryAmount, TotalAdjustedDeliveryTaxAmount, TotalAdjDeliveryAmtWithTax, TotalAdjProductAmtWithTax, TotalProductAdjDistAmount, TotalProductAdjDistTaxAmount, TotalProductAdjDistAmtWithTax, TotalDeliveryAdjDistAmount, TotalDeliveryAdjDistTaxAmount, TotalDeliveryAdjDistAmtWithTax |
| TaxLocaleType | picklist | Gross vs Net tax calculation |
| SalesChannelId / SalesStoreId / OrderManagementReferenceIdentifier | reference / reference / string | Commerce integration |
| PaymentTermId | reference | Subscription Management (API 55+) |
| LastReferencedDate / LastViewedDate | dateTime | |

**OrderItem** (order line): OrderId, Product2Id, PricebookEntryId, OriginalOrderItemId (reductions),
Quantity, UnitPrice, ListPrice, TotalPrice, AvailableQuantity, Description, ServiceDate, EndDate,
QuoteLineItemId, OrderItemNumber (auto), plus Order Management adjustment/tax totals mirroring Order.

### 2.20 Asset (~55 standard fields)

Source: sforce_api_objects_asset.htm

| Field | Type | Notes / picklist values |
|---|---|---|
| Name | string(255) | REQUIRED |
| AccountId | reference(Account) | Required if no ContactId |
| ContactId | reference(Contact) | Required if no AccountId |
| Product2Id | reference(Product2) | What product this asset is |
| ProductCode / ProductDescription / ProductFamily / StockKeepingUnit | string/picklist | Read-only mirrors from product |
| SerialNumber | string(80) | |
| Status | picklist | Defaults: Purchased, Shipped, Installed, Registered, Obsolete |
| StatusReason | picklist | Not Ready, Off, Offline, Online, Paused, Standby (connected assets, API 49+) |
| DigitalAssetStatus | picklist | On, Off, Warning, Error |
| Price | currency | Price paid |
| Quantity | double | |
| PurchaseDate / InstallDate / UsageEndDate / ManufactureDate | date | Lifecycle dates |
| IsCompetitorProduct | boolean | Track competitor installs |
| IsInternal | boolean | Internally used asset |
| ParentId | reference(Asset) | Asset hierarchy |
| RootAssetId | reference(Asset) | Read-only top of hierarchy |
| AssetLevel | int | Depth in hierarchy |
| AssetProvidedById / AssetServicedById | reference(Account) | Manufacturer / servicer |
| AssetTypeId | reference | API 62+ |
| LocationId | reference(Location) | Field Service |
| Address | address (compound) | Street/City/State/PostalCode/Country + Latitude/Longitude/GeocodeAccuracy |
| OwnerId | reference(User) | |
| Description | textarea | |
| ExternalIdentifier / Uuid | string | External keys (API 49+) |
| Reliability metrics | percent/double | Availability, Reliability, AverageUptimePerDay, AveragetimeToRepair, AveragetimeBetweenFailure, SumDowntime, SumUnplannedDowntime, UptimeRecordStart/End, ConsequenceOfFailure (Insignificant, Minor, Moderate, Major, Critical) |
| Lifecycle-managed asset fields (API 50+) | - | HasLifecycleManagement, LifecycleStartDate, LifecycleEndDate, CurrentLifecycleEndDate, CurrentMrr, CurrentQuantity, CurrentAmount, TotalLifecycleAmount |
| Renewal fields | - | PricingSource (LastTransaction/PriceBookListPrice), RenewalPricingType (LastNegotiatedPrice/ListPrice), RenewalTerm, RenewalTermUnit (Annual/Months), QuantityIncreasePricingType (API 55-60+) |
| RecordTypeId | reference(RecordType) | |
| SalesStoreId | reference | Commerce (API 60+) |
| CurrencyIsoCode | picklist | |
| LastReferencedDate / LastViewedDate | dateTime | |

### 2.21 User (~70 commonly used standard fields)

Source: sforce_api_objects_user.htm

| Field | Type | Notes |
|---|---|---|
| Username | string(80) | REQUIRED; email-format login, globally unique |
| Email | email | REQUIRED |
| Alias | string(8) | REQUIRED |
| FirstName / MiddleName / LastName / Suffix | string | LastName required |
| Name | string (compound) | Read-only |
| CommunityNickname | string(40) | Experience Cloud handle |
| IsActive | boolean | Login enabled; licenses freed by deactivation, users never deleted |
| ProfileId | reference(Profile) | REQUIRED; base permissions + license |
| UserRoleId | reference(UserRole) | Role hierarchy node (record visibility) |
| ManagerId | reference(User) | Approval routing + org chart |
| DelegatedApproverId | reference(User/Group) | Approval delegate |
| Title | string(80) | |
| Department | string(80) | |
| Division | string(80) | |
| CompanyName | string(80) | |
| EmployeeNumber | string(20) | |
| Phone / MobilePhone / Fax / Extension | phone | |
| SenderEmail / SenderName / Signature | email/string/textarea | Outbound email identity |
| EmailPreferencesAutoBcc | boolean | |
| Address (compound) | address | Street, City(40), State(80) + StateCode, PostalCode(20), Country(80) + CountryCode, Latitude, Longitude, GeocodeAccuracy |
| TimeZoneSidKey | picklist | REQUIRED (e.g. America/Los_Angeles) |
| LocaleSidKey | picklist | REQUIRED; number/date formats |
| LanguageLocaleKey | picklist | REQUIRED; UI language |
| EmailEncodingKey | picklist | REQUIRED (UTF-8 etc.) |
| DefaultCurrencyIsoCode | picklist | Multicurrency default |
| CurrencyIsoCode | picklist | User's personal currency |
| ForecastEnabled | boolean | Allow Forecasting |
| DefaultDivision | picklist | Divisions feature |
| CallCenterId | reference | CTI |
| FederationIdentifier | string(512) | SAML SSO key |
| LastLoginDate | dateTime | Read-only |
| NumberOfFailedLogins | int | Read-only |
| ReceivesInfoEmails / ReceivesAdminInfoEmails | boolean | |
| UserPreferences* | boolean (many) | Dozens of UserPreferences flags (activity reminders, event notifications, Chatter digests...) |
| UserPermissions* | boolean (many) | Feature grants baked on user: UserPermissionsMarketingUser, UserPermissionsOfflineUser, UserPermissionsCallCenterAutoLogin, UserPermissionsInteractionUser (flows), UserPermissionsSupportUser, UserPermissionsKnowledgeUser, etc. |
| Photo/banner | url | FullPhotoUrl, MediumPhotoUrl, SmallPhotoUrl, IsProfilePhotoActive, BannerPhotoUrl, MediumBannerPhotoUrl, SmallBannerPhotoUrl |
| AboutMe / CurrentStatus / BadgeText | textarea/string | Chatter profile |
| DigestFrequency / DefaultGroupNotificationFrequency | picklist | Chatter email cadence |
| Portal fields | - | ContactId, AccountId, IsPortalEnabled, IsPortalSelfRegistered, PortalRole (Executive, Manager, User, PersonAccount), IsPartner, IsPrmSuperUser |
| IndividualId | reference(Individual) | Data privacy |
| JigsawImportLimitOverride | int | Data.com legacy |
| UserType | picklist (read-only) | Standard, PowerPartner, PowerCustomerSuccess, CustomerSuccess, Guest, CsnOnly |

Related admin objects: **Profile** (Name, UserLicenseId, PermissionsX booleans, object CRUD via
ObjectPermissions, FieldPermissions), **PermissionSet** (Label, License, same permission surface,
assigned via PermissionSetAssignment), **UserRole** (Name, ParentRoleId, OpportunityAccessForAccountOwner,
CaseAccessForAccountOwner, ContactAccessForAccountOwner, RollupDescription).

### 2.22 Territory management (Enterprise Territory Management)

Source: sforce_api_objects_territory2.htm

**Territory2**

| Field | Type | Notes |
|---|---|---|
| Name | string | Territory label |
| DeveloperName | string | REQUIRED unique API name |
| Description | string | |
| Territory2ModelId | reference(Territory2Model) | REQUIRED; which model this belongs to |
| Territory2TypeId | reference(Territory2Type) | REQUIRED; type + priority |
| ParentTerritory2Id | reference(Territory2) | Territory hierarchy |
| ForecastUserId | reference(User) | Territory forecast manager |
| AccountAccessLevel | picklist | Read, Edit, All (Read Only / Read-Write / Owner) |
| OpportunityAccessLevel | picklist | None(Private), Read, Edit |
| ContactAccessLevel | picklist | None(Private), Read, Edit |
| CaseAccessLevel | picklist | None(Private), Read, Edit |

Supporting: **Territory2Model** (Name, State: Planning/SimulationInProgress/SimulationComplete/
Active/Archived...), **Territory2Type** (Name, Priority), **UserTerritory2Association** (UserId,
Territory2Id, RoleInTerritory2), **ObjectTerritory2Association** (ObjectId=Account, Territory2Id,
AssociationCause Territory2Manual/Territory2RuleAssigned), **RuleTerritory2Association** +
ObjectTerritory2AssignmentRule/RuleItem (attribute-based account assignment rules),
Opportunity.Territory2Id for opportunity-territory assignment.

### 2.23 Forecasting objects (Collaborative Forecasts)

Sources: sforce_api_objects_forecastingitem.htm, forecastingquota.htm, forecastingtype.htm,
forecastingadjustment.htm

**ForecastingType**: DeveloperName/MasterLabel (e.g. OpportunityRevenue, OpportunityQuantity,
OpportunityLineItemRevenue, OpportunitySplitRevenue, OpportunityOverlayRevenue, custom types),
IsActive, IsAmount, IsQuantity, DateType (CloseDate, ProductDate, ScheduleDate), RoleType
(role hierarchy vs Territory2), HasProductFamily.

**ForecastingItem** (a forecast grid cell):

| Field | Type | Notes |
|---|---|---|
| ForecastingTypeId | reference | Which forecast flavor |
| PeriodId | reference(Period) | Month or quarter |
| OwnerId | reference(User) | Whose rollup |
| Territory2Id | reference | Territory forecasts |
| ProductFamily | picklist | When forecasting by product family |
| ForecastCategoryName | picklist | Pipeline, BestCase, MostLikely, Commit, Closed |
| ForecastAmount / ForecastQuantity | currency / double | Rollup without adjustments |
| OwnerOnlyAmount / OwnerOnlyQuantity | currency / double | Owner's own opportunities |
| AmountWithoutAdjustments / AmountWithoutManagerAdjustment | currency | Adjustment layering |
| HasAdjustment / HasOwnerAdjustment | boolean | |
| IsAmount / IsQuantity | boolean | |

**ForecastingQuota**: QuotaOwnerId, ForecastingTypeId, PeriodId, StartDate, QuotaAmount,
QuotaQuantity, CurrencyIsoCode, Territory2Id, ProductFamily.

**ForecastingAdjustment** (manager adjusts subordinate) and **ForecastingOwnerAdjustment**
(rep adjusts own number): ForecastingItemCategory, AdjustedAmount/AdjustedQuantity,
ForecastAdjustedByUserId, OwnerId, PeriodId, ForecastingTypeId, AdjustmentNote.

**ForecastingCategoryMapping** + ForecastingDisplayedFamily configure which opportunity
ForecastCategory rolls into which forecast column and which product families display.

---

## 3. RECORD PAGE ANATOMY (Lightning Experience)

Sources:
- https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_recordpage
- https://help.salesforce.com/s/articleView?id=platform.lightning_page_components.htm
- https://salesforcedictionary.com/terms/highlights-panel
- https://help.salesforce.com/s/articleView?id=000382430 (activity related lists vs timeline)

### 3.1 Universal page skeleton

Every standard Lightning record page is assembled from these components (Lightning App Builder):

- **Highlights panel** (top strip): record name + up to 7 key fields from the object's COMPACT
  LAYOUT, plus the action bar (Edit, Delete, Clone, Change Owner, Follow, Submit for Approval,
  object-specific actions like Convert / New Case / Log a Call). Not editable via page layout;
  driven entirely by the compact layout.
- **Path** (under highlights): horizontal chevron stages for any picklist (default: Lead.Status,
  Opportunity.StageName, plus Path on Cases/Orders/custom). Each stage can show "Key Fields"
  (up to 5) + "Guidance for Success" rich text. "Mark Stage as Complete" button advances.
  Closed Lost is hidden behind "Select Closed Stage" dialog. Celebration confetti configurable
  on chosen stages.
- **Tabs component** (center column), default tabs per object below. Common tabs: Activity,
  Chatter (Feed), Details, Related, News (accounts/contacts/leads/opps with News enabled).
- **Details tab**: full page layout sections (two-column), inline-editable fields with pencil
  icon; Dynamic Forms lets admins place individual fields + visibility rules directly on the page.
- **Activity timeline** (Activity tab or right column): upcoming & overdue section, then past
  activity grouped by month; filter by activity type/date/owner; composer actions: New Task,
  Log a Call, New Event, Email (send via Salesforce). Replaces classic Open Activities +
  Activity History related lists (which can still be added manually).
- **Chatter feed**: posts, polls, questions, @mentions, file attachments, record follow.
- **Related tab / Related lists**: each related list shows first 6 records + View All; list
  headers have New/action buttons. Related List Quick Links component shows hover previews.
- **Right sidebar** (default template): Activity + Chatter or key related lists.
- **Other standard components** available: Related Record, Related List - Single, Report Chart,
  Rich Text, Recent Items, Einstein Next Best Action, Recommendations, Flow, Visualforce, Tabs,
  Accordion, Quip, Topics, Files, Potential Duplicates alert, Twitter (retired), Trending Topics.

### 3.2 Account record page (default)

- Highlights (compact layout defaults): Account Name, Phone, Account Number, Website, Account Owner
- Tabs: Related / Details / News (with News enabled); Activity + Chatter in sidebar
- Default related lists: Contacts, Opportunities, Cases, Open Activities/Activity History (via
  timeline), Files, Notes & Attachments, Account Team, Contact Roles (person accts), Partners,
  Campaign History (person accounts), Orders, Contracts, Assets (via layout)
- Extra panels: Account Hierarchy (view icon), Duplicate/Potential Duplicates alert, News &
  Insights (account news), Recent Items, Billing/Shipping address map (with maps enabled)

### 3.3 Contact record page (default)

- Highlights: Name, Title, Account Name, Phone, Email, Contact Owner
- Tabs: Related / Details / News; Activity + Chatter
- Default related lists: Opportunities, Cases, Campaign History, Files, Notes & Attachments,
  Related Accounts (AccountContactRelation), Opportunity Contact Roles, Assets, Contact org
  chart via Reports To
- Einstein/insights: Email Insights, Activity Capture syncs emails/events into timeline

### 3.4 Opportunity record page (default)

- Highlights: Opportunity Name, Account Name, Close Date, Amount, Stage, Opportunity Owner
- Path on StageName with Key Fields + Guidance; "Mark Stage as Complete" / "Closed" split button
- Tabs: Activity / Details / Chatter (+ Related)
- Default related lists: Contact Roles, Products (Opportunity Line Items) with Add Products +
  Edit All, Quotes, Stage History, Notes & Attachments, Files, Partners, Competitors (classic),
  Campaign Influence, Opportunity Team, Splits (if enabled), Orders
- Extra: Einstein Opportunity Scoring panel (score + top factors), Deal Insights (Pipeline
  Inspection), Similar Opportunities, Big Deal Alerts, Kanban view from list views

### 3.5 Lead record page (default)

- Highlights: Name, Company, Title, Phone, Email, Lead Owner, Lead Status
- Path on Status ending in Converted stage -> opens **Convert Lead** modal (creates/matches
  Account + Contact + optional Opportunity, maps standard + custom fields per Lead Field Mapping)
- Tabs: Activity / Details / Chatter / News
- Default related lists: Campaign History, Files, Notes & Attachments, Duplicate alert card
- Extra: Einstein Lead Scoring (score + factors), lead assignment rules banner ("assign using
  active assignment rule" checkbox on save)

### 3.6 Case record page (Service Console default)

- Highlights: Case Number, Subject, Status, Priority, Case Owner + actions (Close Case, Change
  Status, Change Owner)
- Path on Status (optional), Case Feed = Chatter feed with case-specific publishers: Email
  (threaded), Log a Call, Case Comment, Change Status, Knowledge sidebar
- Tabs: Feed / Details / Related; console layout adds subtabs per case
- Default related lists: Case Comments, Case History, Emails, Open Activities/Activity History,
  Solutions/Knowledge (Articles), Attachments/Files, Case Team, Contact Roles, Related Cases
  (child cases), Milestones (entitlements), Live Chat Transcripts
- Extra: Case assignment rules, escalation banner, Einstein Case Classification (suggested
  field values), Macro widget, Quick Text

### 3.7 List views (all objects)

- Pinnable list views, editable filters (My X / All X / recently viewed default)
- Display formats: table (inline edit, resizable/sortable columns), **Kanban** (group by any
  picklist e.g. Stage, sum any currency field, drag cards between columns), split view (console)
- Mass actions from list: change owner, change status, add to campaign, mass email, mass delete
- List view charts (donut/bar/funnel over the current view), filter panel, search within view
- Row-level actions menu; up to 200 rows per page, keyboard navigation

---

## 4. QUOTE-TO-CASH

Sources:
- Native quotes: https://help.salesforce.com/s/articleView?id=sales.quotes_overview.htm
- Quote object: https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_quote.htm
- Quote PDFs and templates: https://help.salesforce.com/s/articleView?id=sales.quote_templates_parent.htm
- CPQ: https://www.salesforce.com/sales/cpq/what-is-cpq/ , https://help.salesforce.com/s/articleView?id=sf.cpq_discounts.htm

### 4.1 Native (Sales Cloud) quote flow

1. **Enable Quotes** (Quote Settings) and add the Quotes related list to Opportunity layouts.
2. **Create quote from opportunity**: New Quote copies AccountId, ContactId, opportunity line
   items (as quote line items), price book, currency into a new Quote (Status defaults to Draft).
3. **Edit quote lines**: quantity, sales price, line discount, service date, sort order; totals
   (Subtotal, Discount, TotalPrice) recompute; rep enters Tax + ShippingHandling manually;
   GrandTotal = TotalPrice + Tax + ShippingHandling.
4. **Quote statuses**: Draft -> Needs Review -> In Review -> Approved / Rejected -> Presented ->
   Accepted / Denied. Admin marks which status means "final" (gates PDF creation if configured).
5. **Generate PDF**: Create PDF button -> pick a Quote Template -> preview -> Save to Quote
   (stored as QuoteDocument, versioned "V1, V2..." in Quote PDFs related list) -> **Email Quote**
   attaches the PDF to an outbound email to the quote Contact.
6. **Quote sync**: Start Sync makes this the opportunity's SyncedQuoteId; from then on quote line
   items and opportunity products mirror each other bidirectionally (add/remove/change). Only ONE
   quote can sync at a time; syncing another prompts to stop the current sync. Won deal: the
   accepted quote's numbers are the opportunity's numbers.
7. **Downstream**: Opportunity -> Contract (term, signers, renewal) and/or Order (+OrderItems,
   activation), optionally created from the quote (Order.QuoteId, OrderItem.QuoteLineItemId).

### 4.2 Quote PDF template + contents

Quote Template editor (drag-and-drop, per-template):
- Header: logo image, company address, quote Name + QuoteNumber, dates
- Quote information section: any Quote fields (ExpirationDate, ContactId, Email, Phone, payment
  terms custom fields...) in configurable columns
- Bill To / Ship To / Quote To address blocks
- **Line items table**: columns from QuoteLineItem (Product Name, ProductCode, Description,
  Quantity, UnitPrice, Discount, TotalPrice...); optional grouping; column totals
- Totals block: Subtotal, Discount, TotalPrice, Tax, ShippingHandling, GrandTotal
- Rich-text sections: terms & conditions, notes; signature block (signature/date lines)
- Footer; conditional display is limited (a known gap CPQ fills)

### 4.3 Salesforce CPQ (SteelBrick, managed package `SBQQ__` namespace)

CPQ replaces native quotes with its own objects: SBQQ__Quote__c, SBQQ__QuoteLine__c,
SBQQ__QuoteLineGroup__c, SBQQ__ProductRule__c, SBQQ__PriceRule__c, SBQQ__DiscountSchedule__c,
SBQQ__QuoteTemplate__c, SBQQ__Subscription__c, SBQQ__ContractedPrice__c.

Pipeline: Opportunity -> primary Quote (SBQQ__Primary__c) -> configure -> price -> approve ->
generate document -> order/contract -> renew/amend.

- **Product configuration**: bundles (parent product + Product Options grouped into Features),
  option constraints (required/excluded), configuration attributes, nested bundles.
- **Product rules**: validation rules (block bad configs), selection rules (auto add/remove
  options), alert rules, dynamic option filters; error conditions + actions.
- **Guided selling**: step-by-step questionnaire (Quote Process + Process Inputs) that filters
  the product catalog to what fits the answers; recommended for large catalogs.
- **Pricing waterfall** per quote line: List price (price book) -> special pricing (contracted
  prices, block pricing, percent-of-total, cost+markup, option pricing) -> system discounts
  (volume via discount schedules, term discounts) -> additional discount (rep manual, % or amount)
  -> partner discount -> distributor discount -> net price. MDQ (multi-dimensional quoting)
  segments a line by year/quarter with per-segment pricing.
- **Price rules**: condition + action engine (set/inject prices, populate fields) evaluated on
  calculate; lookup tables supported; advanced quote calculator (JS plugin).
- **Discount schedules**: quantity or term tiers (range or slab/"cross order" aggregation),
  percent or amount per tier; attach to product or price book entry.
- **Approvals**: native approval processes, or Advanced Approvals add-on: approval chains,
  parallel approvers, smart approvals (re-approve only changed items), approval rules driven by
  discount thresholds/margin/terms; approve/reject from email.
- **Quote document generation**: CPQ Quote Templates: template sections, line columns,
  conditional content, terms library (Term Conditions), watermarks, e-signature integrations
  (DocuSign/Adobe Sign); output PDF/Word.
- **Contract generation**: "Contracted" checkbox on won opportunity/order generates a Contract +
  SBQQ__Subscription__c records for subscription lines (+ Assets for one-time lines);
  contracted prices lock negotiated pricing for the account.
- **Amendments**: Amend button on contract creates amendment quote pre-loaded with current
  subscriptions; deltas prorated automatically.
- **Renewals**: renewal opportunities + quotes auto-generated ahead of EndDate (renewal model:
  contract- or asset-based); uplift %, renewal pricing method (same price / list / uplift).
- **Orders from quotes**: split orders by quote line group/date; Billing add-on (Salesforce
  Billing) invoices, payment, revenue recognition.
- Note: Salesforce's strategic successor is **Revenue Cloud / Revenue Lifecycle Management
  (RLM)** built on core-platform Quote/QuoteLineItem with the CalculationStatus / price waterfall
  / ProductSellingModel fields captured in the tables above.

### 4.4 What Rally should copy (quote-to-cash essentials)

- One-click quote from deal with lines copied in; bidirectional sync to exactly one primary quote
- Status pipeline with a "final" gate before document generation
- Versioned PDF documents stored on the quote + email-with-attachment
- Template-driven PDF: logo, addresses, line table, totals, T&C rich text, signature block
- Discount at line (% and amount) + quote level; tax + shipping fields; grand total math
- Approval thresholds on discount %; contracted/negotiated prices per account; renewal generation

---

## 5. FEATURE CHECKLIST (Sales Cloud + platform)

Sources: https://help.salesforce.com (Sales Cloud + platform docs), https://trailhead.salesforce.com,
https://www.salesforce.com/sales/ feature pages. Flat checklist; [ ] = parity target for Rally.

### 5.1 Lists, views, and record UX

1. [ ] Saved list views per object with shareable visibility (private / groups / all)
2. [ ] List view filter builder (field + operator + value, AND/OR filter logic)
3. [ ] Pinned default list view per user
4. [ ] Kanban view generated from any list view (group-by picklist, sum currency, drag to move)
5. [ ] Split view (list + record side-by-side, console style)
6. [ ] List view charts (bar/donut/funnel over current view)
7. [ ] Inline edit in lists (multi-row apply to selected)
8. [ ] Inline edit on record detail with pencil icons
9. [ ] Mass select (up to 200) + mass actions: change owner, delete, add to campaign, mass email
10. [ ] Sortable, resizable, reorderable columns; column search
11. [ ] Recently viewed records auto-view per object
12. [ ] Global search with per-object filters, recent items, top results
13. [ ] Search across files, chatter, knowledge
14. [ ] Record highlights panel from compact layout
15. [ ] Path with key fields + guidance per stage
16. [ ] Celebration animation on configurable stage wins
17. [ ] Activity timeline with upcoming/overdue + monthly grouping + filters
18. [ ] Composer: New Task / Log Call / New Event / Send Email from any record
19. [ ] Related lists with quick create (New button carries context)
20. [ ] Related list quick links with hover preview
21. [ ] Record hover previews (mini highlights)
22. [ ] Breadcrumbs + recent items navigation
23. [ ] Favorites (star any page)
24. [ ] Customizable navigation bar per app; temporary tabs for unlisted objects
25. [ ] App Launcher with multiple Lightning apps (Sales, Service, custom)
26. [ ] Utility bar (persistent footer widgets: notes, history, dialer, macros)
27. [ ] Keyboard shortcuts; accessibility (WCAG) support
28. [ ] Printable view / print-friendly record pages
29. [ ] Full record page customization per object + per record type + per profile + per app
30. [ ] Dynamic Forms: field-level placement + conditional visibility on record pages
31. [ ] Dynamic actions: conditional action buttons
32. [ ] Mobile app parity (record pages, lists, approvals, dashboards) with offline briefcase

### 5.2 Data model + admin customization

33. [ ] Custom objects with relationships (lookup, master-detail, many-to-many via junction)
34. [ ] Custom fields: text, textarea, rich text, number, currency, percent, date, datetime, time, email, phone, url, checkbox, picklist, multi-select picklist, lookup, geolocation, auto-number, external id
35. [ ] Formula fields (cross-object, 15+ functions categories)
36. [ ] Roll-up summary fields (COUNT/SUM/MIN/MAX on master-detail children)
37. [ ] Validation rules (formula-based, per object, with custom error placement)
38. [ ] Global + object-specific picklist value sets; dependent picklists; restricted picklists
39. [ ] Record types: different picklist values + layouts + processes per subtype
40. [ ] Business processes: per-record-type stage/status sets (sales process, support process)
41. [ ] Page layouts per object/record type/profile; compact layouts; search layouts
42. [ ] Field-level security (visible/read-only per profile/perm set)
43. [ ] Field history tracking (20 fields/object, History related list)
44. [ ] Audit trail (setup audit trail, LastModified stamps)
45. [ ] External IDs + upsert
46. [ ] Encrypted fields (classic + Shield Platform Encryption)
47. [ ] Multi-currency with dated exchange rates; per-record CurrencyIsoCode
48. [ ] Divisions (data segmentation)
49. [ ] Fiscal years (standard + custom fiscal calendars)
50. [ ] State & country picklists (ISO-backed)
51. [ ] Address compound fields + geocoding (lat/long/accuracy)
52. [ ] Person accounts (B2C mode)
53. [ ] Account/contact/lead/case/opportunity merge (dedupe merge wizard)
54. [ ] Recycle bin (soft delete, 15-day restore)
55. [ ] Data import wizard + Data Loader (CSV, upsert, 5M rows)
56. [ ] Mass transfer, mass delete, mass reassign ownership tools
57. [ ] Schema Builder (visual ERD editor)
58. [ ] Big objects / archive storage
59. [ ] Custom metadata types + custom settings (config data)
60. [ ] Translation Workbench (multi-language labels + picklists)

### 5.3 Leads + marketing

61. [ ] Web-to-Lead HTML form generator (with reCAPTCHA)
62. [ ] Lead auto-assignment rules (rule entries, order, queues, default owner)
63. [ ] Lead auto-response rules (templated instant reply)
64. [ ] Lead queues + "Accept" from queue
65. [ ] Lead conversion: account/contact match-or-create + optional opportunity, activity carryover
66. [ ] Lead field mapping (standard auto-map + admin map for custom fields)
67. [ ] Conversion preserves campaign attribution (primary campaign source -> opportunity)
68. [ ] Lead status workflow with converted/unconverted terminal states
69. [ ] Einstein Lead Scoring (model-based score + reasons)
70. [ ] Duplicate rules on create/edit (block or alert) + matching rules (fuzzy match)
71. [ ] Potential duplicates card on record pages; duplicate record sets
72. [ ] Campaigns with hierarchy + rollup metrics (12 hierarchy rollups)
73. [ ] Campaign members with per-campaign status values (Sent/Responded + custom)
74. [ ] Add to campaign from lead/contact lists + reports
75. [ ] Campaign influence (primary source model + customizable multi-touch models)
76. [ ] Mass email + email templates (Classic letterhead, Lightning templates with merge fields)
77. [ ] Email tracking (opens), list email send with per-recipient merge
78. [ ] Marketing Cloud Account Engagement (Pardot) connector: engagement metrics on campaign

### 5.4 Accounts, contacts, opportunities

79. [ ] Account hierarchy viewer (parent/child tree)
80. [ ] Account teams with per-member access levels
81. [ ] Contacts to multiple accounts (AccountContactRelation with roles)
82. [ ] Contact org chart (Reports To)
83. [ ] Contact roles on opportunities/contracts/cases
84. [ ] Account/contact insights (News component)
85. [ ] Automated account fields (auto-fill company info on create)
86. [ ] Opportunity products with schedules (revenue/quantity installments)
87. [ ] Product catalog + product families
88. [ ] Multiple price books per business line; standard price enforcement
89. [ ] Opportunity teams + opportunity splits (revenue 100% + overlay)
90. [ ] Similar opportunities suggestions
91. [ ] Big deal alerts (threshold-triggered notification)
92. [ ] Opportunity stage history tracking + push count
93. [ ] Einstein Opportunity Scoring (1-99 + factors)
94. [ ] Einstein Deal Insights (Pipeline Inspection: at-risk flags, no-activity flags)
95. [ ] Pipeline Inspection view (stage-over-stage waterfall, changes since last week)
96. [ ] Sales Path per record type
97. [ ] Competitors tracking on deals
98. [ ] Partner roles on accounts/opportunities (PRM)
99. [ ] Quotas + attainment views
100. [ ] Contracts with approval + activation lifecycle
101. [ ] Orders with draft->activated lifecycle + reduction orders
102. [ ] Assets with hierarchy + lifecycle (install base)

### 5.5 Activities + productivity

103. [ ] Tasks with queues, recurrence, reminders, follow-ups
104. [ ] Events with invitees, recurrence (RRULE), Show As, private flag
105. [ ] Shared activities (one task/event on up to 50 contacts)
106. [ ] Calendar views (my calendar, others' calendars, public calendars, object calendars from any date field)
107. [ ] Einstein Activity Capture (Gmail/Outlook/Exchange email + calendar auto-sync)
108. [ ] Email integration side panels (Outlook/Gmail extensions with record context)
109. [ ] Send email through Salesforce w/ org-wide addresses, bounce management
110. [ ] Email templates with merge fields + attachments; enhanced letterheads
111. [ ] Salesforce Inbox (send later, tracking, availability sharing)
112. [ ] Sales Engagement (cadences): multi-step sequences (email/call/LinkedIn/task), work queue, cadence state per target, metrics
113. [ ] Sales Dialer / CTI voice (click-to-call, call logging, dispositions, recordings)
114. [ ] Notes (rich text, related to multiple records) + Files (versioned, shared, previews)
115. [ ] Chatter: feeds on records, groups, @mentions, follows, email digests
116. [ ] In-app + email notifications; custom notification types
117. [ ] Macros (multi-step canned actions) + Quick Text snippets
118. [ ] Meeting scheduler links (Salesforce Scheduler); availability booking

### 5.6 Automation

119. [ ] Flow Builder: record-triggered, scheduled, screen, autolaunched, platform-event flows
120. [ ] Flow elements: assignment, decision, loop, get/create/update/delete records, subflow, action calls, email, approvals
121. [ ] Scheduled paths + asynchronous paths on record-triggered flows
122. [ ] Approval processes: entry criteria, step chains, delegated approvers, email/mobile approve, recall, resubmit
123. [ ] Assignment rules (lead + case), escalation rules (case, time-based with business hours)
124. [ ] Auto-response rules (lead + case)
125. [ ] Workflow rules + Process Builder (retired; migrate to Flow) - field updates, email alerts, task creation, outbound messages
126. [ ] Email alerts + outbound messages (SOAP callout) as automation actions
127. [ ] Business hours + holidays calendars
128. [ ] Queues for lead/case/task/custom object ownership
129. [ ] Omni-Channel routing (skill-based, queue-based, capacity)
130. [ ] Apex triggers + classes (pro-code automation), Apex scheduled jobs, batch Apex
131. [ ] Platform events (pub/sub) + Change Data Capture streams
132. [ ] Scheduled reports + dashboard subscriptions
133. [ ] Next Best Action (rules + strategy driven recommendations)

### 5.7 Analytics

134. [ ] Report builder: tabular, summary, matrix, joined reports
135. [ ] Custom report types (object joins up to 4 levels, with/without related)
136. [ ] Row groupings (3) + column groupings (2), summarized fields (sum/avg/min/max)
137. [ ] Report formulas (summary + row-level), PARENTGROUPVAL/PREVGROUPVAL
138. [ ] Bucketing (ad-hoc categorization), report filters + cross filters (WITH/WITHOUT subquery)
139. [ ] Report charts (bar, column, stacked, line, donut, funnel, scatter, gauge)
140. [ ] Conditional highlighting; drill down to records
141. [ ] Dashboards: up to 20 components; chart/gauge/metric/table components
142. [ ] Dashboard filters (3), dynamic dashboards (run as viewer)
143. [ ] Dashboard subscriptions + report subscriptions with conditions
144. [ ] Embedded report charts on record pages
145. [ ] Historical trend reporting (snapshot fields on opportunities)
146. [ ] Reporting snapshots (scheduled data capture to custom object)
147. [ ] Einstein/CRM Analytics (Tableau CRM): datasets, lenses, stories, predictions
148. [ ] Forecasting: collaborative forecasts grid by period x category x owner
149. [ ] Forecast types: opportunity revenue/quantity, product family, line item, splits, overlay, territory, custom measure
150. [ ] Forecast categories: Pipeline / Best Case / Most Likely / Commit / Closed (customizable labels, Most Likely optional)
151. [ ] Manager adjustments + owner adjustments with adjustment notes + history
152. [ ] Quota upload + attainment %, forecast vs quota vs closed
153. [ ] Monthly/quarterly/weekly periods; cumulative vs individual columns
154. [ ] Single-category vs cumulative rollups; product date vs close date basis
155. [ ] Forecast hierarchy = role hierarchy or territory hierarchy; jump-to-user
156. [ ] Pipeline changes view (what moved since snapshot)

### 5.8 Security + sharing

157. [ ] Org-wide defaults per object (Private / Public Read Only / Public Read-Write / Controlled by Parent)
158. [ ] Role hierarchy (vertical access rollup, grant via hierarchy toggle)
159. [ ] Sharing rules (owner-based + criteria-based) to roles/groups/territories
160. [ ] Manual sharing (per-record share button)
161. [ ] Apex managed sharing (programmatic shares)
162. [ ] Teams (account/opportunity/case) as sharing vehicles
163. [ ] Profiles: object CRUD, field-level security, layouts, apps, login hours/IP ranges
164. [ ] Permission sets + permission set groups (additive, muting)
165. [ ] "View All / Modify All" per object; View All Data / Modify All Data
166. [ ] Delegated administration
167. [ ] Session settings, password policies, 2FA/MFA, SSO (SAML/OpenID), My Domain
168. [ ] Login IP ranges + login hours per profile
169. [ ] Field audit trail (Shield), event monitoring, transaction security policies
170. [ ] Restriction rules + scoping rules (record-level filtering beyond sharing)
171. [ ] Guest user security; Experience Cloud sharing sets
172. [ ] Data mask + sandbox seeding tools

### 5.9 Platform + ecosystem

173. [ ] REST API, SOAP API, Bulk API 2.0, Streaming/CometD, GraphQL API, Composite API
174. [ ] Metadata API + Tooling API (config as code), source-driven dev (SFDX)
175. [ ] Named credentials + external services (declarative callouts)
176. [ ] External objects (Salesforce Connect / OData live federation)
177. [ ] Canvas + Lightning Out (embed SF UI elsewhere)
178. [ ] Lightning Web Components + Aura (custom UI), Visualforce (legacy)
179. [ ] AppExchange: 7000+ managed packages installable into the org
180. [ ] Sandboxes: Developer, Developer Pro, Partial Copy, Full; change sets + deployment pipelines
181. [ ] Scratch orgs + unlocked packages
182. [ ] Multi-org / environment hub
183. [ ] Localization: 25+ fully supported languages, locale-aware formats, timezone handling
184. [ ] Trust: uptime status site, release notes 3x/year (Spring/Summer/Winter), backward-compatible API versioning
185. [ ] Data storage + file storage quotas w/ per-object usage breakdown
186. [ ] Duplicate jobs (org-wide dedupe scans)
187. [ ] Optimizer reports (org health)
188. [ ] In-app guidance + prompts, custom help, walkthroughs
189. [ ] Adoption dashboards; login history; API usage monitoring

### 5.10 Einstein / AI layer

190. [ ] Einstein Lead Scoring; Einstein Opportunity Scoring
191. [ ] Einstein Account Insights + Opportunity Insights (news, risk, sentiment)
192. [ ] Einstein Activity Capture + Email Insights
193. [ ] Einstein Forecasting (AI-predicted close of quarter, gap analysis)
194. [ ] Einstein Conversation Insights (call recordings, keywords, coaching)
195. [ ] Einstein Relationship Insights (network mapping)
196. [ ] Einstein Copilot / Agentforce (LLM assistant: summarize records, draft emails, answer org questions, take actions)
197. [ ] Prompt Builder (admin-authored LLM prompts grounded in record data)
198. [ ] Einstein GPT sales emails (auto-drafted outreach in context)
199. [ ] Case classification + routing predictions (Service)
200. [ ] Next Best Action recommendations on record pages

### 5.11 Service Cloud essentials (ticketing parity)

201. [ ] Email-to-Case (inbound email creates/threads cases; routing address per queue)
202. [ ] Web-to-Case form generator
203. [ ] Case assignment rules + queues + Omni-Channel routing
204. [ ] Case escalation rules (age-based, business-hours aware)
205. [ ] Entitlements + milestones (SLA timers with warning/violation actions)
206. [ ] Case feed publishers: email (threaded with original), portal comment, internal comment, log call, status change
207. [ ] Knowledge base with versioned articles, data categories, article suggestions on cases
208. [ ] Service console app: 3-column layout, subtabs, macros, quick text, softphone
209. [ ] CSAT via surveys; case teams; case merge (Lightning)
210. [ ] Live chat + messaging channels (SMS/WhatsApp/Facebook) attached to cases

---

## 6. RALLY GAP NOTES

Rally today (v1 live at rally-psi-five.vercel.app): contacts, companies, deals w/ line items +
stakeholders + competitors + close plan, leads, activities, campaigns, sequences, quotes (basic),
invoices, products, tickets, projects, workflows (visual mock), dashboards, reports, forecasting,
team. No custom fields, no RBAC.

### Where Rally already matches or beats Salesforce

| Salesforce concept | Rally equivalent | Notes |
|---|---|---|
| Lead / Contact / Account / Opportunity | leads / contacts / companies / deals | Core objects present |
| OpportunityLineItem | deal line items | Present |
| OpportunityContactRole | deal stakeholders | Rally's is richer if it captures sentiment/role notes |
| Competitors related list | deal competitors | Salesforce Classic-grade feature; Rally has it natively |
| Close plan | (no native SFDC equivalent - CPQ/partners add it) | DIFFERENTIATOR: keep |
| Sales Engagement cadences (add-on $$) | sequences | Rally has core included; Salesforce charges extra |
| Campaign + CampaignMember | campaigns | Check: member statuses + response tracking + ROI rollups |
| Task/Event + timeline | activities | Check: recurrence, reminders, calendar view |
| Quote + QuoteLineItem | quotes (basic) | Rally has invoices too; Salesforce needs Billing add-on |
| Product2/Pricebook | products | Check: multiple price books, currency per price |
| Case | tickets | Salesforce needs a second cloud for this; Rally includes it |
| Reports/Dashboards/Forecasting | dashboards, reports, forecasting | Depth gap, see below |
| Flow (declarative automation) | workflows (visual mock) | Rally's is a mock; SF's actually executes - biggest functional gap |

### Priority gaps (ordered by sales-cycle impact)

1. **Custom fields + validation rules** - the single biggest objection from any team migrating
   off Salesforce. Need: field builder (all basic types + picklists + lookups), required/unique
   flags, per-object layout control. (Section 5.2 items 33-42.)
2. **RBAC / sharing model** - Salesforce's profiles + roles + sharing rules are overkill, but
   Rally needs at least: roles (admin/manager/rep), record ownership, private-vs-team visibility,
   field-level hide for comp-sensitive data. (5.8.)
3. **Executable workflows** - convert the visual mock into a record-triggered engine:
   trigger (create/update/stage change) -> conditions -> actions (update field, create task,
   send email, notify, webhook). This unlocks assignment rules, escalations, auto-response. (5.6.)
4. **Lead conversion flow** - match-or-create company + contact + optional deal with field
   mapping and activity carryover; keep campaign attribution. (5.3 items 65-67.)
5. **Duplicate detection** - fuzzy matching on create + merge wizard. (5.3 items 70-71.)
6. **Kanban + list view engine** - saved views, filter builder, inline edit, mass actions,
   group-by-any-picklist kanban with sum. Salesforce's stickiest daily-driver UX. (5.1.)
7. **Quote-to-cash depth** - quote sync to deal, versioned PDF w/ templates, status gate,
   discount approvals. Rally already has invoices, so finishing quotes closes the loop CPQ-style
   without the CPQ tax. (Section 4.)
8. **Activity capture** - Gmail/Outlook email + calendar sync into the timeline; this is what
   makes the CRM feel alive without data entry. (5.5 items 107-108.)
9. **Forecast rigor** - categories (Pipeline/Best Case/Commit/Closed) driven by stage with
   override, manager adjustments, quota vs attainment. Rally has forecasting; add the
   adjustment + quota layer. (5.7 items 148-156.)
10. **Record page anatomy parity** - highlights panel, path with stage guidance, activity
    timeline + composer, related lists w/ quick create. Rally likely has most; audit against
    Section 3 per object.
11. **Reports engine depth** - custom report types (joins), groupings + summary formulas,
    scheduled email subscriptions, embedded charts on records. (5.7 items 134-146.)
12. **API surface** - public REST API + webhooks. Salesforce's ecosystem moat is the API;
    Rally needs one before an integrations marketplace can exist. (5.9 item 173.)

### Explicitly NOT worth copying (Salesforce baggage)

- Person accounts dual-model complexity (Rally: contacts can simply exist without a company)
- Profile + permission set + permission set group + muting permission layering (one clean RBAC
  model instead)
- Classic/Lightning dual UI, Workflow Rules/Process Builder/Flow triple-automation legacy
- Divisions, Data.com/Jigsaw legacy fields, Salesforce-to-Salesforce connection fields
- The CPQ managed-package split-brain (SBQQ objects duplicating native quotes) - build ONE
  quote model with CPQ-grade pricing hooks
- Per-seat add-on pricing for cadences, dialer, inbox, AI scoring - bundle as core Rally value

---

Extraction stats: 22 objects with full field tables, ~60 additional objects inventoried,
~950 fields captured across the tables (Account 60+, Contact 60+, Lead 55+, Opportunity 50+,
Quote 50+ w/ 4 compound addresses, QuoteLineItem 40+, Order 55+ w/ OM totals, Asset 55+,
User 70+, Campaign 70 incl. rollups, Case 45+, Task 35+, Event 45+, Contract 40+, plus
line items, pricing, territory, and forecasting objects), 210-item feature checklist,
12 prioritized Rally gaps.
