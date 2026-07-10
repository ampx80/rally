# RALLY PARITY MAP - the canonical schema and build order

The master build spec for Rally. Synthesized 2026-07-09 from three exhaustive competitive
field extractions:

- `research/salesforce-master.md` (22 SF objects with full field tables, ~950 fields, 210-item feature checklist)
- `research/hubspot-pipedrive-master.md` (HubSpot ~400 default properties, Pipedrive, Close, Attio)
- `research/zoho-netsuite-monday-master.md` (Zoho, NetSuite quote-to-cash, Monday, Airtable, Notion, docgen landscape)

Every future agent wave implements AGAINST THIS FILE. If a field or feature is not here,
add it here first, then build it. ASCII hyphens only in this document and in all Rally output.

Legend used in every field table:

- Source parity column abbreviations: SF = Salesforce, HS = HubSpot, Z = Zoho, PD = Pipedrive,
  AT = Attio, NS = NetSuite, CL = Close, MO = Monday, FR = Freshsales.
- "Rally today" column: yes (field name in store), partial, no.
- Type vocabulary matches the custom-fields engine in Section 5.1. Every typed field below is
  expressible in that engine; canonical fields are just system-owned rows in the same registry.
- System audit tail exists on EVERY object and is not repeated per table:
  `id, createdAt, createdBy, updatedAt, updatedBy, deletedAt (soft delete), mergedIds[], recordSource, recordSourceDetail1/2/3, custom{}`.
  (HubSpot ships Record Source + 3 drill-down levels on every object; SF ships audit fields on
  every object; Rally does the union once, everywhere.)

---

## 0. DESIGN PRINCIPLES

1. **Single-entity status model (NetSuite's insight).** A person or company is ONE record
   forever. `lifecycleStage` advances (lead -> prospect -> customer); there is no lead
   conversion ceremony, no data copy, no ConvertedAccountId graveyard. Lead-specific fields
   (source, score, status, unqualified reason) live on the person/company and simply stop
   mattering after qualification. Freshsales and NetSuite both validate this; Salesforce's
   Lead->Account+Contact+Opportunity split is the misery Rally deletes.
2. **Every field optional-but-available (progressive disclosure).** The canonical schemas
   below are wide (Contact ~100 fields) but the record editor shows collapsed sections with
   filled-field counts. A new record needs a name and nothing else. Required-ness attaches to
   STAGE TRANSITIONS (Pipedrive required fields, HubSpot stage gating, Zoho Blueprint), never
   to record creation. Collect data when it becomes knowable.
3. **Custom fields engine underneath everything.** Canonical fields and custom fields are the
   same mechanism: a field registry per object with type, section, options, validation, and
   AI-fill policy. Canonical fields are system-seeded registry rows the user cannot delete but
   can hide. One editor, one storage path, one views engine over both.
4. **Every list is a saved view.** There is no hardcoded table anywhere. Collections render
   through the views engine (Section 4): filters + columns + sort + group + view type, saved,
   shared, and EXECUTABLE (a view can feed a sequence, a bulk edit, an export - Close's
   Smart Views insight).
5. **AI fills fields, humans confirm.** Every field carries an AI-fill affordance (sparkle).
   AI-written values land in a `pending` state with provenance; one click confirms, one click
   rejects. Engagement counters, rollups, and stage timestamps are system-computed and
   write-locked (HubSpot's counter discipline). The CRM should fill itself (Attio's
   email-sync backfill is the bar).
6. **The property skeleton ships on every object** (HubSpot's discipline): owner + team +
   sharing, record source with 3 drill-down levels, created/updated audit, merge lineage,
   activity rollups (lastActivityAt, nextActivityAt, counts), and per-stage
   entered/exited/elapsed timestamps auto-generated for every pipeline or lifecycle stage.
7. **Association labels beat junction objects.** Record-to-record links carry labels
   (buying role, billing contact, primary) that are filterable, automatable, reportable.
   Rally already does this with deal stakeholders; generalize it.
8. **No em-dash or en-dash anywhere.** ASCII hyphen only. All surfaces: schema, UI copy,
   generated docs, seeds, prompts.

---

## 1. CANONICAL OBJECT SCHEMAS

### 1.1 Contact (person)

Target hit: 135 canonical fields in 10 sections. HubSpot's ~170 contact properties are
condensed: the pure-analytics web/email telemetry collapses into the Engagement section
(system-computed block), per-stage timestamps are auto-generated (not enumerated), and
ads-sourced one-offs fold into custom fields.

Rally today (`src/lib/store.js` contacts): id, firstName, lastName, email, phone, title,
companyId, ownerId, tags, lastActivityAt, createdAt.

#### Section: Identity

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| salutation | picklist | SF:Salutation, Z:Salutation | no |
| firstName | text | SF:FirstName, HS:firstname, Z, PD, CL | yes |
| middleName | text | SF:MiddleName | no |
| lastName | text | SF:LastName, HS:lastname, Z, PD, CL | yes |
| suffix | text | SF:Suffix | no |
| nickname | text | HS (form fill), AT | no |
| pronouns | picklist | SF:Pronouns | no |
| genderIdentity | picklist | SF:GenderIdentity, HS ads | no |
| birthdate | date | SF:Birthdate, Z:Date of Birth, PD:Birthday | no |
| avatarUrl | url | SF:PhotoUrl, PD:Picture | no |

#### Section: Work

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| title | text | SF:Title, HS:jobtitle, Z:Title, PD, AT | yes |
| department | text | SF:Department, Z:Department | no |
| departmentGroup | picklist | SF:DepartmentGroup, HS:Job function | no |
| seniority | picklist | HS:Employment Seniority | no |
| employmentRole | picklist | HS:Employment Role | no |
| companyId | link(company) | SF:AccountId, HS assoc, Z:Account Name, PD:Organization, AT:Company | yes |
| companyName | text | HS:company (free text, pre-link) | no |
| additionalCompanyIds | link(company, multi) | SF:AccountContactRelation, HS assoc labels | no |
| reportsToId | link(contact) | SF:ReportsToId, Z:Reporting To | no |
| assistantName | text | SF:AssistantName, Z:Assistant | no |
| assistantPhone | phone | SF:AssistantPhone, Z:Asst Phone | no |

#### Section: Reach

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| email | email (unique-ish, dedupe key) | SF:Email, HS:email, Z:Email, PD (multi w/ labels), AT (unique) | yes |
| secondaryEmail | email | Z:Secondary Email, PD email labels, CL emails[] | no |
| workEmail | email | HS ads:Work email | no |
| emailDomain | text (derived) | HS:Email domain | no |
| phone | phone | SF:Phone, HS:phone, Z, PD (multi), CL | yes |
| mobilePhone | phone | SF:MobilePhone, HS:mobilephone, Z:Mobile | no |
| homePhone | phone | SF:HomePhone, Z:Home Phone | no |
| otherPhone | phone | SF:OtherPhone, Z:Other Phone | no |
| fax | phone | SF:Fax, HS:fax, Z:Fax | no |
| linkedinUrl | url | HS:LinkedIn URL, PD, AT:LinkedIn | no |
| twitterHandle | text | AT:Twitter, HS | no |
| facebookUrl | url | AT:Facebook | no |
| instagramHandle | text | AT:Instagram | no |
| otherUrls | url (multi) | CL:urls[], AT handles | no |
| messagingHandle | text | Z:Skype ID, PD:Instant messenger | no |
| websiteUrl | url | HS:website (contact's company site) | no |
| timezone | picklist | HS:Time zone, SF (user-level) | no |
| preferredLanguage | picklist | HS:hs_language | no |
| preferredChannel | picklist | Rally-native (email/phone/sms/linkedin) | no |

#### Section: Address (two blocks, structured)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| mailingStreet | text | SF:MailingStreet, Z:Mailing Street, HS:address | no |
| mailingStreet2 | text | HS:address2, CL:address_2 | no |
| mailingCity | text | SF:MailingCity, HS:city | no |
| mailingState | text | SF:MailingState, HS:state | no |
| mailingStateCode | picklist | SF:MailingStateCode, HS:State Code | no |
| mailingPostalCode | text | SF:MailingPostalCode, HS:zip | no |
| mailingCountry | text | SF:MailingCountry, HS:country | no |
| mailingCountryCode | picklist | SF:MailingCountryCode, HS:Country Code | no |
| mailingLatitude | number | SF:MailingLatitude, PD address parse | no |
| mailingLongitude | number | SF:MailingLongitude | no |
| otherStreet | text | SF:OtherStreet, Z:Other Address | no |
| otherCity | text | SF:OtherCity | no |
| otherState | text | SF:OtherState | no |
| otherPostalCode | text | SF:OtherPostalCode | no |
| otherCountry | text | SF:OtherCountry | no |

#### Section: Status and qualification (the lead block - see 1.4)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| lifecycleStage | picklist (stage-typed) | HS:lifecyclestage, NS entity status, FR lifecycle | no |
| leadStatus | picklist | SF:Lead.Status, HS:hs_lead_status, Z:Lead Status, PD lead labels | partial (leads store: status) |
| leadSource | picklist | SF:LeadSource, HS analytics source, Z:Lead Source, PD:Source, deal.leadSource | partial (leads store: source) |
| leadSourceDetail | text | HS:source drill-down 1, PD:origin | no |
| leadScore | number (AI/rules) | SF:ScoreIntelligence, HS:hubspotscore, Z scoring rules, PD deal score | partial (leads store: score) |
| likelihoodToClose | percent (AI, write-locked) | HS:Likelihood to close | no |
| priorityTier | picklist (AI) | HS:Contact priority | no |
| rating | picklist | SF:Rating (Hot/Warm/Cold), Z:Rating | no |
| persona | picklist | HS:hs_persona | no |
| buyingRole | picklist (multi) | SF:BuyerAttributes, HS:hs_buying_role | partial (deal stakeholders role) |
| unqualifiedReason | picklist | HS lead disqualify flow, Z junk status | no |
| qualifiedAt | datetime | NS status advance, HS date entered stage | no |
| becameCustomerAt | datetime | HS:closedate (contact) | no |

#### Section: Ownership and system

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| ownerId | link(user) | SF:OwnerId, HS:hubspot_owner_id, Z, PD, CL, AT | yes |
| ownerAssignedAt | datetime | HS:Owner assigned date | no |
| teamId | link(team) | HS:hubspot_team_id | no |
| sharedUserIds | link(user, multi) | HS:Shared users | no |
| followerIds | link(user, multi) | PD:Followers | no |
| visibility | picklist | PD:Visible to | no |
| tags | tags | Rally tags, PD:Label, HS deal tags | yes |
| isPriority | boolean (star) | SF:IsPriorityRecord | no |
| isUnworked | boolean (system) | HS:Contact unworked | no |

#### Section: Consent and privacy

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| emailOptOut | boolean | SF:HasOptedOutOfEmail, Z:Email Opt-out, HS unsubscribed | no |
| doNotCall | boolean | SF:DoNotCall | no |
| smsOptOut | boolean | HS SMS opt-out, CL | no |
| marketingStatus | picklist | HS:Marketing contact status, PD:Marketing status | no |
| gdprLegalBasis | picklist | HS:Legal basis | no |
| emailBounced | boolean (system) | SF:IsEmailBounced, HS:Invalid email | no |
| emailBouncedReason | text (system) | SF:EmailBouncedReason, HS:hard bounce reason | no |
| doubleOptInStatus | picklist | HS:confirmation status | no |

#### Section: Engagement (system-computed, write-locked - condenses HubSpot's ~60 analytics props)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| lastActivityAt | datetime | HS:notes_last_updated, SF:LastActivityDate, PD, AT:Last interaction | yes (lastActivityAt) |
| lastContactedAt | datetime | HS:notes_last_contacted | no |
| lastEngagedAt | datetime | HS:Last engagement date | no |
| nextActivityAt | datetime | HS:Next activity date, PD, AT:Next interaction | no |
| firstInteractionAt | datetime | AT:First interaction | no |
| connectionStrength | picklist (AI) | AT:Connection strength | no |
| strongestConnectionUserId | link(user) | AT:Strongest connection | no |
| activitiesCount | number | HS:Number of sales activities, PD:Total activities | no |
| timesContactedCount | number | HS:num_contacted_notes | no |
| emailsExchangedCount | number | PD:Email messages count | no |
| meetingsHeldCount | number | Rally-native rollup | no |
| leadResponseTime | duration (system) | HS:Lead response time | no |
| originalSource | picklist | HS:hs_analytics_source | no |
| originalSourceDetail1 | text | HS:source_data_1 | no |
| originalSourceDetail2 | text | HS:source_data_2 | no |
| latestSource | picklist | HS:hs_latest_source | no |
| latestSourceDetail1 | text | HS drill-down | no |
| latestSourceAt | datetime | HS:Latest Traffic Source Date | no |
| pageViewsCount | number | HS:hs_analytics_num_page_views | no |
| sessionsCount | number | HS:hs_analytics_num_visits | no |
| firstPageSeen | url | HS:hs_analytics_first_url | no |
| firstReferrer | url | HS:first_referrer | no |
| firstSeenAt | datetime | HS:Time first seen | no |
| lastSeenAt | datetime | HS:Time last seen | no |
| formSubmissionsCount | number | HS:num_conversion_events | no |
| firstConversion | text | HS:first_conversion_event_name | no |
| firstConversionAt | datetime | HS | no |
| recentConversion | text | HS:recent_conversion_event_name | no |
| recentConversionAt | datetime | HS | no |
| googleClickId | text | HS:gclid | no |
| facebookClickId | text | HS:fbclid | no |
| marketingEmailsDelivered | number | HS lifetime counter | no |
| marketingEmailsOpened | number | HS | no |
| marketingEmailsClicked | number | HS | no |
| lastMarketingEmailAt | datetime | HS:Last marketing email send/open | no |
| lastMeetingBookedAt | datetime | HS:meetings tool | no |
| lastNpsScore | number | HS:Last NPS survey rating | no |

#### Section: Deal rollups (system-computed)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| dealsCount | number | HS:num_associated_deals | no |
| openDealsCount | number | PD:Open deals | no |
| wonDealsCount | number | PD:Won deals | no |
| lostDealsCount | number | PD:Lost deals | no |
| totalRevenue | currency | HS:total_revenue | no |
| recentDealAmount | currency | HS | no |
| recentDealClosedAt | datetime | HS | no |
| firstDealCreatedAt | datetime | HS | no |
| daysToClose | number | HS:Days to close | no |

#### Section: Sequence and automation state (system)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| activeSequenceId | link(sequence) | HS:Currently in sequence, SF:ActionCadenceId | no |
| sequenceState | picklist | SF:ActionCadenceState | no |
| sequencesEnrolledCount | number | HS | no |
| lastSequenceEndedAt | datetime | HS | no |

Contact per-stage timestamps (`enteredAt/exitedAt/latestDuration/cumulativeDuration` per
lifecycleStage value) are AUTO-GENERATED by the stage engine, not registry rows (HS pattern).

Contact canonical field count: 135 (+ system audit tail + auto stage timestamps).

---

### 1.2 Company

Target hit: 94 canonical fields in 9 sections. Union of SF Account (~60), HS Company (~97),
Zoho Account, PD Organization, AT Company.

Rally today (`src/lib/store.js` companies): id, name, domain, industry, size, location,
ownerId, health, createdAt, flagship.

#### Section: Identity

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text (required) | SF:Name, HS:name, Z:Account Name, PD:Name, AT:Name | yes |
| domain | text (unique, dedupe + enrichment key) | HS:domain, AT:Domains | yes |
| additionalDomains | text (multi) | AT:Domains (multi) | no |
| website | url | SF:Website, HS:website, Z, PD | partial (domain) |
| logoUrl | url | SF:PhotoUrl, enrichment | no |
| legalName | text | NS entity legal name | no |
| tradestyle | text (DBA) | SF:Tradestyle | no |
| tickerSymbol | text | SF:TickerSymbol, Z:Ticker Symbol | no |
| isPublic | boolean | HS:is_public | no |
| ownership | picklist | SF:Ownership, Z:Ownership | no |
| foundedYear | number | SF:YearStarted, HS:founded_year, AT:Foundation date | no |
| description | textarea | SF:Description, HS:description, Z, CL, AT | no |
| aboutUs | textarea | HS:about_us | no |
| quickContext | richtext | HS:Quick context | no |

#### Section: Classification

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| industry | picklist (32-value SF list, Section 2.1) | SF:Industry, HS:industry, Z, PD | yes (12 custom values today) |
| industryGroup | picklist | HS:Industry group | no |
| categories | picklist (multi, enriched) | AT:Categories | no |
| sicCode | text | SF:Sic, Z:SIC Code | no |
| sicDescription | text | SF:SicDesc | no |
| naicsCode | text | SF:NaicsCode | no |
| naicsDescription | text | SF:NaicsDesc | no |
| companyType | picklist (relationship to us) | SF:Type, HS:type, Z:Account Type | no |
| lifecycleStage | picklist (stage-typed) | HS:lifecyclestage, NS entity status | no |
| leadStatus | picklist | HS:hs_lead_status (company) | no |
| rating | picklist | SF:Rating, Z:Rating | no |
| icpTier | picklist | HS:hs_ideal_customer_profile | no |
| isTargetAccount | boolean | HS:hs_is_target_account | no |
| accountNumber | text | SF:AccountNumber, Z:Account Number | no |
| site | text (location label) | SF:Site, Z:Account Site | no |

#### Section: Scale (firmographics)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| employees | number | SF:NumberOfEmployees, HS:numberofemployees, Z, PD | partial (size buckets) |
| employeeRange | picklist | HS:Employee range, AT:Employee range | yes (size) |
| annualRevenue | currency | SF:AnnualRevenue, HS:annualrevenue, Z, PD | no |
| revenueRange | picklist | HS:Revenue range | no |
| estimatedArr | picklist (enriched range) | AT:Estimated ARR | no |
| totalMoneyRaised | currency | HS:total_money_raised, AT:Funding raised | no |

#### Section: Reach

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| phone | phone | SF:Phone, HS:phone, Z, PD | no |
| fax | phone | SF:Fax, Z:Fax | no |
| email | email (generic inbox) | Z:Email | no |
| linkedinUrl | url | HS:LinkedIn company page, PD, AT | no |
| twitterHandle | text | HS:Twitter handle, AT | no |
| facebookUrl | url | HS:Facebook company page, AT | no |
| timezone | picklist | HS:timezone | no |
| techStack | picklist (multi, enriched) | HS:web_technologies | no |

#### Section: Addresses (billing + shipping blocks)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| billingStreet | text | SF:BillingStreet, Z, HS:address | partial (location string) |
| billingStreet2 | text | HS:address2 | no |
| billingCity | text | SF:BillingCity, HS:city | partial (location) |
| billingState | text | SF:BillingState, HS:state | partial (location) |
| billingStateCode | picklist | SF:BillingStateCode | no |
| billingPostalCode | text | SF:BillingPostalCode, HS:zip | no |
| billingCountry | text | SF:BillingCountry, HS:country | no |
| billingCountryCode | picklist | SF:BillingCountryCode | no |
| billingLatitude | number | SF, PD parse | no |
| billingLongitude | number | SF, PD parse | no |
| shippingStreet | text | SF:ShippingStreet, Z | no |
| shippingCity | text | SF:ShippingCity | no |
| shippingState | text | SF:ShippingState | no |
| shippingPostalCode | text | SF:ShippingPostalCode | no |
| shippingCountry | text | SF:ShippingCountry | no |

#### Section: Hierarchy and relationships

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| parentCompanyId | link(company) | SF:ParentId, HS:hs_parent_company_id, Z:Parent Account | no |
| childCompaniesCount | number (system) | HS:Number of child companies | no |
| relatedCompanyIds | link(company, multi, labeled) | PD:Related organizations | no |
| territoryId | link(territory) | SF:Territory2, NS territory | no |

#### Section: Health and ownership

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| health | picklist (green/yellow/red) | Rally-native (HS CS health score) | yes |
| healthReason | text (AI) | Rally-native | no |
| ownerId | link(user) | SF:OwnerId, HS, Z, PD, AT | yes |
| ownerAssignedAt | datetime | HS | no |
| teamId | link(team) | HS | no |
| sharedUserIds | link(user, multi) | HS:Shared users | no |
| followerIds | link(user, multi) | PD:Followers | no |
| visibility | picklist | PD:Visible to | no |
| tags | tags | PD:Label | no |
| isPriority | boolean (star) | SF:IsPriorityRecord | no |

#### Section: Engagement and rollups (system-computed)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| lastActivityAt | datetime | HS, SF:LastActivityDate, PD | no |
| lastContactedAt | datetime | HS | no |
| nextActivityAt | datetime | HS, PD, AT | no |
| firstInteractionAt | datetime | AT | no |
| connectionStrength | picklist (AI) | AT | no |
| contactsCount | number | HS:Number of associated contacts, PD:People count | no |
| dealsCount | number | HS | no |
| openDealsCount | number | HS:Number of open deals, PD | no |
| wonDealsCount | number | PD | no |
| lostDealsCount | number | PD | no |
| totalRevenue | currency | HS:total_revenue | no |
| recentDealAmount | currency | HS | no |
| recentDealClosedAt | datetime | HS | no |
| firstContactCreatedAt | datetime | HS | no |
| firstDealCreatedAt | datetime | HS | no |
| daysToClose | number | HS | no |
| openTicketsCount | number | Rally-native rollup | no |
| becameCustomerAt | datetime | HS:closedate (company) | no |
| originalSource | picklist (from earliest contact) | HS company analytics | no |
| latestSource | picklist | HS | no |
| pageViewsCount | number | HS (summed across contacts) | no |
| formSubmissionsCount | number | HS | no |

Company canonical field count: 94 (+ audit tail + auto lifecycle-stage timestamps).

---

### 1.3 Deal (opportunity)

Target hit: 68 canonical fields in 9 sections, PLUS the depth sub-objects Rally already has
(line items, stakeholders, competitors, close plan, history) formalized in 1.3.1.

Rally today (`store.js` deals + `store-depth.js` dealExtras): id, name, companyId, contactIds,
value, stage, probability, closeDate, ownerId, status, createdAt; extras: lineItems,
stakeholders (role + influence), competitors, nextStep, nextStepDue, closePlan,
forecastCategory, winReason, lossReason, history.

#### Section: Core

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text (required) | SF:Name, HS:dealname, Z:Deal Name, PD:Title, AT | yes |
| companyId | link(company) | SF:AccountId, HS assoc, Z, PD:Organization, AT | yes |
| primaryContactId | link(contact) | SF:ContactId (primary role), PD:Contact person | partial (contactIds[0]) |
| contactIds | link(contact, multi, labeled by buyingRole) | SF:OpportunityContactRole, HS assoc, PD:Participants | yes |
| pipelineId | link(pipeline) | HS:pipeline, PD:Pipeline, Z pipelines | no (single pipeline) |
| stage | picklist (stage-typed, pipeline-scoped) | SF:StageName, HS:dealstage, Z:Stage, PD:Stage, AT | yes |
| status | picklist (open/won/lost, derived from stage) | PD:Status, SF:IsClosed/IsWon | yes |
| probability | percent (stage default, overrideable) | SF:Probability, HS, Z, PD | yes |
| forecastCategory | picklist (stage-implied, overrideable) | SF:ForecastCategory, HS:hs_manual_forecast_category, NS:Forecast Type | yes (dealExtras) |
| closeDate | date (required) | SF:CloseDate, HS:closedate, Z:Closing Date, PD:Expected close date | yes |
| ownerId | link(user) | all platforms | yes |
| description | textarea | SF, HS, Z | no |
| dealType | picklist | SF:Type, HS:dealtype, Z:Type | no |
| leadSource | picklist | SF:LeadSource, Z:Lead Source, PD:Source | no |
| campaignId | link(campaign) | SF:CampaignId, Z:Campaign Source | no |
| nextStep | text | SF:NextStep, HS:hs_next_step, Z:Next Step | yes (dealExtras) |
| nextStepDueAt | datetime | Rally-native (PD next activity) | yes (dealExtras) |
| priority | picklist | HS:hs_priority | no |

#### Section: Money (all amount variants)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| amount | currency | SF:Amount, HS:amount, Z:Amount, PD:Value | yes (value) |
| currency | picklist (ISO) | SF:CurrencyIsoCode, HS:deal_currency_code, PD:Currency | no |
| exchangeRate | number (snapshot) | HS:Exchange rate, NS | no |
| amountHome | currency (system) | HS:amount_in_home_currency | no |
| expectedRevenue | currency (system = amount x probability) | SF:ExpectedRevenue, Z:Expected Revenue, PD:Weighted value, CL:Expected Value | partial (computed in UI) |
| acv | currency | HS:hs_acv | partial (dealACV from line items) |
| arr | currency | HS:hs_arr | no |
| mrr | currency | HS:hs_mrr | no |
| tcv | currency (from line items) | HS:hs_tcv | no |
| oneTimeTotal | currency (system) | Rally-native split of line items | no |
| recurringTotal | currency (system) | Rally-native | no |
| closedAmount | currency (system) | HS:Closed amount | no |
| recurringRevenueType | picklist | HS:Recurring revenue deal type | no |
| recurringInactiveReason | picklist | HS | no |
| recurringInactiveAt | datetime | HS:Recurring revenue date | no |
| priceBookId | link(priceBook) | SF:Pricebook2Id | no |

#### Section: Health and AI (system-computed)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| dealScore | number (AI, write-locked) | HS:Deal score, PD:Deal score, SF:IqScore, Z Zia | no |
| stalledAt | datetime (system) | HS:Is Stalled After Timestamp | no |
| rottingAt | datetime (per-stage inactivity) | PD:Deal rotting | no |
| ageInDays | number (system) | SF:AgeInDays | no |
| daysInStage | number (system) | SF:LastStageChangeInDays, HS:Time in current stage | partial (dealInsight computes) |
| stageEnteredAt | datetime (system) | HS:Date entered current stage, SF:LastStageChangeDate | no |
| pushCount | number (system) | SF:PushCount | no |
| isSlipping | boolean (system: open + closeDate past) | SF Pipeline Inspection | partial (slippingDeals selector) |
| hasOverdueTask | boolean (system) | SF:HasOverdueTask | no |
| aiSummary | textarea (AI, provenance-stamped) | SF Einstein, HS Breeze, Z Zia | partial (dealInsight) |

#### Section: Team and splits

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| teamMembers | sublist {userId, role, accessLevel} | SF:OpportunityTeamMember | no |
| collaboratorIds | link(user, multi) | HS:Deal collaborator | no |
| splits | sublist {userId, percent, type(revenue/overlay), note} | SF:OpportunitySplit, HS:Deal split | no |
| followerIds | link(user, multi) | PD:Followers | no |

#### Section: Outcome

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| wonAt | datetime (system) | PD:Won time | partial (closeDate set on close) |
| lostAt | datetime (system) | PD:Lost time | partial |
| winReason | picklist + note | HS:Closed won reason | yes (dealExtras) |
| lossReason | picklist + note | HS:Closed lost reason, PD:Lost reason | yes (dealExtras) |
| lostToCompetitor | text | Rally-native (competitors list) | partial |

#### Section: Relations (quote-to-cash spine)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| primaryQuoteId | link(quote, synced) | SF:SyncedQuoteId | no |
| contractId | link(contract) | SF:ContractId | no |
| territoryId | link(territory) | SF:Territory2Id | no |

#### Section: Engagement rollups (system)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| lastActivityAt | datetime | SF, HS, PD | no |
| lastContactedAt | datetime | HS | no |
| nextActivityAt | datetime | HS, PD | no |
| activitiesCount | number | HS, PD:Total activities | no |
| doneActivitiesCount | number | PD:Done activities | no |
| timesContactedCount | number | HS | no |
| emailsExchangedCount | number | PD | no |
| nextMeetingAt | datetime | HS:Next Meeting Start Time | no |

#### Section: System

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| tags | tags | HS:Deal tags, PD:Label | no |
| visibility | picklist | PD:Visible to | no |
| approvalStatus | picklist | HS:Latest Approval Status | no |
| originatedFrom | picklist (lead convert/API/import/form/chat) | PD:origin | no |

Per-stage timestamps (enteredAt/exitedAt/latest/cumulative per stage of the deal's pipeline)
auto-generated by the stage engine. Stage history rows (below) power the audit view.

Deal canonical field count: 68 (+ sub-objects below + audit tail + auto stage timestamps).

#### 1.3.1 Deal sub-objects (Rally depth, formalized)

**dealLineItem** (SF OpportunityLineItem + PD product attach + HS line items):

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| dealId | link(deal) | all | yes |
| productId | link(product) | SF:Product2Id, PD, Z | yes |
| name | text (snapshot) | SF:Name | yes |
| description | text | SF:Description | no |
| quantity | number | SF:Quantity, Z, PD | yes (qty) |
| unitPrice | currency | SF:UnitPrice, Z:Unit Price | yes |
| listPrice | currency (snapshot from price book) | SF:ListPrice, Z:List Price | no |
| discountPercent | percent | SF:Discount, PD, Z | yes (discount) |
| discountAmount | currency | SF QLI:DiscountAmount | no |
| termMonths | number | Rally-native, HS term | yes (term) |
| billingFrequency | picklist | HS line item, PD:Billing frequency | partial (product.billing) |
| billingStartDate | date | HS:per-line billing start, PD | no |
| serviceDate | date | SF:ServiceDate | no |
| taxRate | percent | Z:Tax, NS:Tax Code | no |
| totalPrice | currency (system) | SF:TotalPrice, Z:Total | partial (lineItemTotal) |
| sortOrder | number | SF:SortOrder | no |
| lineKind | picklist (product/description/subtotal/discount/markup) | NS item types insight | no |

**dealStakeholder** (SF OpportunityContactRole + HS buying roles - Rally is already richer):

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| contactId | link(contact) | SF:ContactId | yes |
| role | picklist (buying role) | SF:Role, HS:hs_buying_role | yes |
| influence | picklist (high/med/low) | Rally-native | yes |
| sentiment | picklist (advocate/neutral/detractor) | Rally-native | no |
| isPrimary | boolean | SF:IsPrimary | no |
| notes | text | Rally-native | no |

**dealCompetitor**: name (yes), status (picklist: active/beat/lost-to) (no), notes (no),
battlecardUrl (no).

**closePlanStep**: label (yes), done (yes), dueDate (no), assigneeId (no), stakeholderId (no).

**dealHistory** (SF OpportunityHistory + OpportunityFieldHistory + PD changelog): at, who,
field, from, to - Rally has this shape today in dealExtras.history; extend to EVERY object
via the audit engine (Section 5.9).

---

### 1.4 Lead (a STATUS, not a table)

Per Design Principle 1, Rally has NO separate lead object in the target architecture. A
"lead" is a contact (and optionally a company) whose `lifecycleStage` is `lead` or earlier.
The Leads workspace (`store-ext.js` leads today) becomes a SAVED VIEW over contacts:
`lifecycleStage in (subscriber, lead, mql, sql) AND leadStatus != unqualified`.

Migration note: the current `store-ext.js` leads array (firstName, lastName, company, title,
email, source, status, score, ownerId) migrates into contacts with
`lifecycleStage = 'lead'`; the free-text `company` lands in `companyName` until a company
record is linked or created.

Lead-specific fields (all already enumerated in the Contact 1.1 Status section; repeated here
as the definitive lead block):

| Field | Lives on | Source parity | Rally today |
|---|---|---|---|
| lifecycleStage | contact + company | HS:lifecyclestage, NS entity status, FR lifecycle | no |
| leadStatus | contact + company | SF:Lead.Status, HS:hs_lead_status, Z:Lead Status | yes (leads.status) |
| leadSource | contact + company + deal | SF/HS/Z/PD | yes (leads.source) |
| leadSourceDetail | contact | HS drill-down, PD origin | no |
| leadScore | contact + company | SF Einstein, HS:hubspotscore, Z scoring rules | yes (leads.score) |
| scoreBreakdown | contact (system JSON: rule hits + AI factors) | Z scoring rules, SF Einstein factors | no |
| rating | contact + company | SF:Rating (Hot/Warm/Cold), PD lead labels | no |
| unqualifiedReason | contact | HS disqualify, Z junk reason | no |
| qualifiedAt | contact (system) | stage timestamp | no |
| assignedVia | contact (system: rule/round-robin/manual) | SF assignment rules, Z assignment | no |
| firstCampaignId | contact | SF campaign attribution | no |
| estimatedValue | contact (pre-deal sizing) | PD lead:Value | no |
| expectedCloseDate | contact (pre-deal) | PD lead:Expected close date | no |
| isArchived | contact | PD lead:Archived flag | no |

Qualification flow (replaces SF lead conversion): "Qualify" button on a lead-stage contact
does three things in place - (1) advances lifecycleStage to opportunity/customer track,
(2) links-or-creates the company from companyName/emailDomain, (3) optionally creates a deal
pre-filled with owner, source, campaign, estimatedValue. NOTHING is copied or archived; all
history stays on the same record. Disqualify sets leadStatus=unqualified + unqualifiedReason.

### 1.5 Quote

Union of SF Quote (~50 fields + QuoteDocument), HubSpot quote modules (live web page,
e-sign, payments, closing agent), Zoho Quote, NetSuite Estimate. Rally's quote is BOTH a
document (versioned PDF) and a live web page (HS insight) with events written back to the
deal timeline.

Rally today (`store-ext.js` quotes): id, number, companyId, companyName, amount, seats,
status, ownerId, createdAt, expiresAt.

#### Quote header (46 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text | SF:Name | no |
| number | autonumber (Q-XXXX) | SF:QuoteNumber, NS:tranId | yes |
| dealId | link(deal) | SF:OpportunityId, Z:Deal Name, NS:Opportunity | no |
| companyId | link(company) | SF:AccountId, Z:Account Name, NS:Customer | yes |
| contactId | link(contact, recipient) | SF:ContactId, Z:Contact Name | no |
| billToContactId | link(contact) | SF:BillToContactId, HS:Bill To | no |
| status | picklist (Section 2.8) | SF:Status, HS statuses, Z:Quote Stage, NS:Status | yes |
| isPrimary | boolean (synced to deal, exactly one) | SF:IsSyncing, CPQ:SBQQ__Primary__c | no |
| issueDate | date | HS:issue date, NS:tranDate | partial (createdAt) |
| expiresAt | date | SF:ExpirationDate, Z:Valid Till, NS:dueDate, HS:expiration | yes |
| effectiveDate | date (on acceptance / custom / delayed) | HS:Summary effective date | no |
| termMonths | number (auto-calculated) | HS:term length | no |
| currency | picklist | SF:CurrencyIsoCode, NS:Currency | no |
| exchangeRate | number | NS:Exchange Rate | no |
| priceBookId | link(priceBook) | SF:Pricebook2Id | no |
| ownerId | link(user) | SF:OwnerId, Z:Quote Owner, NS:Sales Rep | yes |
| description | textarea | SF:Description | no |
| coverLetter | richtext (AI-assist) | HS:cover letter module | no |
| executiveSummary | richtext (AI-assist) | HS:exec summary | no |
| terms | richtext | Z:Terms and Conditions, HS:terms module | no |
| customerMessage | text (printed on doc) | NS:Customer Message | no |
| poNumber | text (buyer-editable toggle) | HS:PO number, Order:PoNumber | no |
| subtotal | currency (system) | SF:Subtotal, Z:Sub Total, NS:Subtotal | no |
| discountPercent | percent (quote-level) | SF:Discount, Z:Discount, HS:total discount | no |
| discountAmount | currency (quote-level) | HS:total discount amount | no |
| totalPrice | currency (system, after line discounts) | SF:TotalPrice | no |
| taxAmount | currency | SF:Tax, NS:Tax Total | no |
| shippingAmount | currency | SF:ShippingHandling, NS:Shipping Cost | no |
| grandTotal | currency (system) | SF:GrandTotal, Z:Grand Total, NS:Total | yes (amount) |
| billingAddress | address block (structured) | SF:BillingAddress, NS subrecord | no |
| shippingAddress | address block | SF:ShippingAddress | no |
| quoteToAddress | address block | SF:QuoteToAddress | no |
| taxIds | text (multi, up to 3) | HS:Bill To tax IDs | no |
| paymentTerms | picklist (due on receipt / net 15/30/45/60/90) | HS:payment terms, NS:Terms | no |
| collectPayment | boolean | HS:payments toggle | no |
| paymentMethods | picklist (multi: card/ach) | HS:payment methods | no |
| acceptanceMethod | picklist (esign/print/no-signature) | HS:acceptance module | no |
| signerContactIds | link(contact, multi) | HS:buyer signers | no |
| countersignerUserId | link(user) | HS:countersigner | no |
| signedAt | datetime (system) | HS quote events | no |
| approvalStatus | picklist (none/pending/approved/rejected) | HS:quote approvals, CPQ Advanced Approvals | no |
| approverNotes | text | HS approval comments | no |
| publicUrl | url (system, live web page) | HS:share link | no |
| passwordProtected | boolean | HS:password | no |
| viewedAt / viewCount | datetime / number (system) | HS quote analytics, PD Smart Docs tracking | no |
| language / locale | picklist | HS:quote settings | no |

#### Quote line items (24 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| quoteId | link(quote) | SF:QuoteId | no |
| productId | link(product) | SF:Product2Id, Z:Product Name | no |
| dealLineItemId | link(dealLineItem, sync mapping) | SF:OpportunityLineItemId | no |
| lineNumber | autonumber | SF:LineNumber | no |
| name | text (snapshot) | SF mirrors | no |
| description | text | SF:Description, NS:Description | no |
| quantity | number | SF:Quantity, Z, NS | partial (seats) |
| unit | picklist | NS:Units, PD:Unit | no |
| unitPrice | currency | SF:UnitPrice, Z:Unit Price, NS:Rate | no |
| listPrice | currency (system snapshot) | SF:ListPrice, Z:List Price | no |
| priceLevel | picklist (base/wholesale/preferred/custom...) | NS:Price Level | no |
| discountPercent | percent | SF:Discount | no |
| discountAmount | currency | SF:DiscountAmount | no |
| subtotalPrice | currency (system) | SF:Subtotal | no |
| totalPrice | currency (system) | SF:TotalPrice, Z:Total, NS:Amount | no |
| taxRate | percent | Z:Tax, HS:per-line tax, NS:Tax Code | no |
| billingFrequency | picklist | SF RLM:BillingFrequency, HS | no |
| billingStartDate | date (ramp pricing via staggered dates) | HS:per-line billing start | no |
| termMonths | number | SF RLM:SubscriptionTerm | no |
| startDate / endDate | date | SF RLM | no |
| sellingModel | picklist (oneTime/evergreen/termDefined) | SF RLM:SellingModelType | no |
| sortOrder | number | SF:SortOrder | no |
| lineKind | picklist (product/description/subtotal/discount) | NS presentational items | no |
| groupLabel | text (line grouping on doc) | CPQ:QuoteLineGroup | no |

#### Quote sub-objects

- **quoteDocument** (versioned): quoteId, version (V1, V2...), pdfUrl, templateId,
  generatedAt, generatedBy. (SF QuoteDocument.)
- **quoteEvent** (system timeline): viewed, downloaded, accepted, signed, paid, commented,
  question-asked (each writes to the deal timeline - HS insight).
- **quoteAttachment**: fileId, inSigningPacket (boolean) - up to 10 (HS).

Quote flow (the canonical merge of SF + HS):
Draft -> (approval gate if discount/terms threshold) -> Approved -> Published/Shared
(live URL + PDF + email) -> Viewed -> Accepted/Signed (-> payment if enabled) -> deal
timeline events + optional auto contract/invoice creation. Exactly ONE primary quote syncs
line items bidirectionally with the deal (SF sync model).

Quote canonical field count: header 46, line 24 (+ 3 sub-objects).

### 1.6 Product, PriceBook, PriceBookEntry

Rally today (`store-ext.js` products): id, sku, name, category, price, billing, active.

#### Product (27 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text (required) | SF:Name, Z, PD, NS | yes |
| sku | text | SF:StockKeepingUnit, PD:Product code | yes |
| productCode | text | SF:ProductCode | partial (sku) |
| description | textarea | SF:Description, PD | no |
| family | picklist | SF:Family, Z, PD:Category | yes (category) |
| itemType | picklist (Section 2.10; NS item types condensed) | NS item types, SF:ProductClass | no |
| isActive | boolean | SF:IsActive, PD:Active flag | yes (active) |
| isArchived | boolean | SF:IsArchived | no |
| unitLabel | picklist (seat/user/GB/hour/unit) | NS:Units, PD:Unit | partial (billing string) |
| billingFrequency | picklist (oneTime/monthly/quarterly/annual) | PD:Billing frequency, HS | partial (billing) |
| billingType | picklist (flat/perSeat/usage) | Rally-native | partial |
| price | currency (base list price) | PD:Price, HS:price | yes |
| cost | currency (margin calc) | HS:cost, PD:Cost | no |
| directCost | currency | PD:Direct cost | no |
| taxCategory | picklist | PD:Tax, NS:Tax Code | no |
| currencyPrices | sublist {currency, price} | PD multi-currency price list | no |
| imageUrl | url | SF:DisplayUrl | no |
| externalId | text | SF:ExternalId | no |
| isBundle | boolean | NS:Kit/Assembly, SF:ProductClass=Bundle | no |
| bundleComponents | sublist {productId, qty, priceMode(included/sum)} | NS Kit vs Item Group | no |
| variantAxes | sublist (size/color axes) | NS Matrix Item | no |
| revenueScheduleType | picklist (none/divide/repeat) | SF schedules | no |
| revenueInstallments / installmentPeriod | number / picklist | SF:NumberOfRevenueInstallments | no |
| ownerId | link(user) | PD:Owner | no |
| visibility | picklist | PD:Visible to | no |
| soldOnlyWithOtherProducts | boolean | SF:IsSoldOnlyWithOtherProds | no |
| defaultTermMonths | number | Rally-native | no |

#### PriceBook (7 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text | SF:Pricebook2.Name | no |
| description | text | SF | no |
| isStandard | boolean (exactly one) | SF:IsStandard | no |
| isActive | boolean | SF:IsActive | no |
| currency | picklist | SF multicurrency | no |
| validFrom / validTo | date | SF:ValidFrom/ValidTo | no |
| companyIds | link(company, multi - customer-specific books) | NS customer-specific pricing | no |

#### PriceBookEntry (9 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| priceBookId | link(priceBook) | SF:Pricebook2Id | no |
| productId | link(product) | SF:Product2Id | no |
| unitPrice | currency | SF:UnitPrice, NS price matrix | no |
| currency | picklist | SF | no |
| isActive | boolean | SF | no |
| useStandardPrice | boolean | SF:UseStandardPrice | no |
| priceLevel | picklist (formula-derived from base: pct up/down) | NS price levels | no |
| quantityBreaks | sublist {minQty, price} | NS quantity pricing | no |
| discountScheduleId | link | CPQ discount schedules | no |

Pricing resolution order (NS + CPQ waterfall, simplified for Rally): customer-specific price
-> price book entry (level + quantity break) -> product base price -> manual override
(permission-gated). Every quote/deal line stores the resolved listPrice snapshot.

---

### 1.7 Campaign + CampaignMember

Rally today (`store-ext.js` campaigns): id, name, channel, status, sent, opened, clicked,
leads, revenue, budget, startAt.

#### Campaign (33 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| name | text (required) | SF:Name, Z, HS campaigns | yes |
| type | picklist (Section 2.11) | SF:Type, Rally channel | yes (channel) |
| status | picklist (Planned/In Progress/Completed/Aborted) | SF:Status | yes |
| isActive | boolean | SF:IsActive | partial (status) |
| description | textarea | SF:Description | no |
| startDate | date | SF:StartDate | yes (startAt) |
| endDate | date | SF:EndDate | no |
| parentCampaignId | link(campaign, hierarchy) | SF:ParentId, HS campaign nesting | no |
| ownerId | link(user) | SF:OwnerId | no |
| budgetedCost | currency | SF:BudgetedCost, HS budget | yes (budget) |
| actualCost | currency | SF:ActualCost, HS spend | no |
| expectedRevenue | currency | SF:ExpectedRevenue | no |
| expectedResponsePct | percent | SF:ExpectedResponse | no |
| numberSent | number | SF:NumberSent | yes (sent) |
| audienceDescription | text | Rally-native | no |
| utmCampaign / utmSource / utmMedium | text | HS/PD UTM attribution | no |
| ROLLUPS (system, write-locked): | | | |
| membersCount | number | SF:NumberOfContacts+Leads | no |
| respondedCount | number | SF:NumberOfResponses | no |
| leadsGeneratedCount | number | SF:NumberOfLeads | yes (leads) |
| qualifiedCount | number | SF:NumberOfConvertedLeads (Rally: qualified) | no |
| dealsCount | number | SF:NumberOfOpportunities | no |
| wonDealsCount | number | SF:NumberOfWonOpportunities | no |
| pipelineValue | currency | SF:AmountAllOpportunities | no |
| wonValue | currency | SF:AmountWonOpportunities | yes (revenue) |
| emailsDelivered | number | SF Pardot:TotalEmailsDelivered | yes (sent) |
| uniqueOpens | number | SF Pardot:UniqueEmailOpens | yes (opened) |
| uniqueClicks | number | SF Pardot:UniqueEmailTrackedLinkClicks | yes (clicked) |
| formViews / formSubmissions | number | SF Pardot | no |
| roi | percent (system: wonValue vs actualCost) | NS lead source ROI | no |
| hierarchyRollups | JSON (same 12 metrics across children) | SF Hierarchy* fields | no |

#### CampaignMember (10 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| campaignId | link(campaign) | SF:CampaignId | no |
| contactId | link(contact) | SF:LeadId/ContactId (single-entity: one link) | no |
| companyId | link(company, optional ABM) | SF:AccountId (accounts as members) | no |
| status | picklist (per-campaign editable set) | SF:Status via CampaignMemberStatus | no |
| hasResponded | boolean (system, from status) | SF:HasResponded | no |
| firstRespondedAt | date | SF:FirstRespondedDate | no |
| addedVia | picklist (manual/list/import/automation/form) | SF sources | no |
| emailsOpened / emailsClicked | number (system) | HS engagement | no |
| unsubscribedAt | datetime | HS | no |
| notes | text | Rally-native | no |

Per-campaign member status sets (SF CampaignMemberStatus): label, isResponded, isDefault,
sortOrder - editable per campaign, defaults Sent + Responded.

### 1.8 Ticket (Case)

Union of SF Case (~45) + HS Ticket (~56 incl. the SLA engine). Rally today
(`store-ext.js` tickets): id, number, subject, companyId, companyName, contactId,
contactName, priority, status, assigneeId, createdAt.

#### Ticket (48 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| number | autonumber | SF:CaseNumber, Rally number | yes |
| subject | text | SF:Subject, HS:subject | yes |
| description | textarea | SF:Description, HS:content | no |
| pipelineId | link(pipeline) | HS:hs_pipeline | no |
| status | picklist (stage-typed) | SF:Status, HS:hs_pipeline_stage | yes |
| priority | picklist (Low/Medium/High/Urgent) | SF:Priority, HS:hs_ticket_priority | yes |
| origin | picklist (email/phone/web/chat/form/api) | SF:Origin, HS:source_type | no |
| channelDetail | text | HS:originating channel account | no |
| type | picklist (question/problem/feature request) | SF:Type | no |
| category | picklist (AI-set) | HS:hs_ticket_category | no |
| reason | picklist | SF:Reason | no |
| resolution | picklist + note | HS:Resolution | no |
| language | picklist (AI-detected) | SF:Language, HS | no |
| companyId | link(company) | SF:AccountId, HS assoc | yes |
| contactId | link(contact) | SF:ContactId | yes |
| assigneeId | link(user) | SF:OwnerId, HS:hubspot_owner_id | yes |
| teamId | link(team) | HS:Assigned teams | no |
| parentTicketId | link(ticket) | SF:ParentId | no |
| dealId | link(deal, optional) | Rally-native | no |
| productId | link(product) | SF:ProductId | no |
| suppliedName / suppliedEmail | text/email (raw web-to-ticket) | SF:SuppliedName/Email | no |
| isEscalated | boolean | SF:IsEscalated | no |
| escalatedAt | datetime (system) | SF escalation rules | no |
| closedAt | datetime (system) | SF:ClosedDate, HS:closed_date | no |
| reopenedCount | number (system) | Rally-native | no |
| SLA ENGINE (HS set): | | | |
| firstResponseSlaDueAt | datetime (system) | HS:Time to first response SLA due date | no |
| firstResponseSlaStatus | picklist (active/due-soon/overdue/met) | HS:SLA ticket status | no |
| closeSlaDueAt | datetime (system) | HS:Time to close SLA due date | no |
| closeSlaStatus | picklist | HS | no |
| businessHoursId | link(businessHours) | SF:BusinessHoursId, HS working-hours aware | no |
| RESPONSE TELEMETRY (system): | | | |
| firstAgentReplyAt | datetime | HS:First agent email response date | no |
| lastAgentReplyAt | datetime | HS:Last response date | no |
| lastCustomerReplyAt | datetime | HS:Last customer reply date | no |
| timeToFirstReply | duration | HS:Time to first agent email reply | no |
| timeToFirstAssignment | duration | HS:Time to first rep assignment | no |
| timeToClose | duration | HS:Time to close | no |
| lastActivityAt / nextActivityAt | datetime | HS | no |
| activitiesCount / timesContactedCount | number | HS | no |
| csatScore / cesScore | number | HS:Last CES survey, SF CSAT surveys | no |
| surveyComment | text | HS | no |
| tags | tags | Rally | no |
| visibility | picklist | Rally | no |
| watcherIds | link(user, multi) | Rally-native | no |
| linkedTicketIds | link(ticket, multi) | SF related cases | no |
| kbArticleIds | link(article, multi) | SF Solutions/Knowledge | no |
| customerVisiblePortal | boolean | SF:IsVisibleInSelfService, HS portal | no |
| internalNotesThread | comments sublist {who, at, body, isPublic} | SF:CaseComment | no |

Per-status timestamps auto-generated (HS date entered/exited per status).

### 1.9 Activity (Task / Event / Call / Email / Note / SMS union)

One table, `type` discriminates; type-specific fields null when not applicable. Union of SF
Task (~35) + SF Event (~45) + PD Activity + HS engagement types + Close auto-logging.

Rally today (`store.js` activities): id, type (task/call/email/meeting/note), subject, body,
dueAt, done, relatedType, relatedId, companyId, ownerId, createdAt, system.

#### Activity (49 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| type | picklist (task/call/email/meeting/note/sms/linkedin/whatsapp/deadline/lunch + custom types) | SF:TaskSubtype/EventSubtype, PD:Type (custom types w/ icons), HS engagement types | yes (5 types) |
| subject | text | SF:Subject, PD:Subject | yes |
| body | richtext | SF:Description, PD:Note | yes |
| status | picklist (open/in-progress/waiting/deferred/done) | SF Task:Status | partial (done boolean) |
| done | boolean (derived) | PD:Done checkbox | yes |
| priority | picklist (high/normal/low) | SF Task:Priority | no |
| dueAt | datetime | SF:ActivityDate, PD:Due date + time | yes |
| completedAt | datetime (system) | SF:CompletedDateTime | no |
| ownerId | link(user, "assigned to") | SF:OwnerId, PD:Assigned to | yes |
| relatedType + relatedId | polymorphic link (contact/company/deal/ticket/project/quote) | SF:WhoId/WhatId, PD links | yes |
| companyId | link(company, derived) | SF:AccountId derived | yes |
| contactIds | link(contact, multi) | SF Shared Activities:TaskWhoIds (up to 50) | no |
| isSystem | boolean (auto-logged) | Rally system notes | yes (system) |
| reminderAt | datetime | SF:ReminderDateTime | no |
| tags | tags | Rally | no |
| EVENT/MEETING FIELDS: | | | |
| startAt / endAt | datetime | SF:StartDateTime/EndDateTime | no |
| durationMinutes | number | SF:DurationInMinutes, PD:Duration | no |
| isAllDay | boolean | SF:IsAllDayEvent | no |
| location | text | SF:Location, PD:Location | no |
| videoCallUrl | url | PD:Video call link (Zoom/Meet/Teams) | no |
| attendeeContactIds | link(contact, multi) + rsvp | SF EventRelation invitees, PD:Guests | no |
| attendeeUserIds | link(user, multi) | SF invitees | no |
| showAs | picklist (busy/free/oof) | SF:ShowAs | no |
| isPrivate | boolean | SF:IsPrivate | no |
| meetingOutcome | picklist (held/no-show/rescheduled/canceled) | HS meeting outcome | no |
| CALL FIELDS: | | | |
| callDirection | picklist (inbound/outbound/internal) | SF:CallType | no |
| callDurationSeconds | number | SF:CallDurationInSeconds | no |
| callOutcome | picklist (connected/voicemail/no-answer/busy/wrong-number) | SF:CallDisposition, HS call outcome | no |
| recordingUrl | url | CL call recording, HS | no |
| transcript | textarea (AI) | CL/HS conversation intelligence | no |
| callSummary | textarea (AI) | CL Chloe, HS Breeze | no |
| phoneNumber | phone | CL logging | no |
| EMAIL FIELDS: | | | |
| emailDirection | picklist (sent/received/logged) | HS email types | no |
| fromAddress / toAddresses / ccAddresses | email / multi | SF EmailMessage | no |
| emailSubject | text | SF EmailMessage | partial (subject) |
| openedAt / openCount | datetime / number (system) | HS/PD/CL open tracking | no |
| clickedAt / clickCount | datetime / number (system) | HS click tracking | no |
| repliedAt | datetime (system) | HS reply tracking | no |
| threadId | text (conversation grouping) | Gmail/Outlook sync | no |
| templateId | link(emailTemplate) | HS/PD/CL templates | no |
| sequenceId + sequenceStep | link + number (provenance) | HS/CL sequence sends | no |
| RECURRENCE (tasks + events): | | | |
| recurrenceRule | text (RRULE) | SF:Recurrence2PatternText (RRULE 512), classic Recurrence* family condensed | no |
| recurrenceParentId | link(activity) | SF:RecurrenceActivityId | no |
| recurrenceEndsAt | date | SF:RecurrenceEndDateOnly | no |
| regenerateMode | picklist (none/afterDue/afterDone) | SF:RecurrenceRegeneratedType | no |
| SOURCE: | | | |
| loggedVia | picklist (manual/email-sync/calendar-sync/dialer/api/sequence/import) | CL auto-log, AT sync | no |
| externalId | text (sync dedupe key) | SF:ClientGuid | no |

Activity canonical field count: 49. The activity timeline (Section 3) renders each type with
its own card: calls with recordings inline, emails expandable with open/click chips, meetings
with outcomes, notes pinned-able (HS/CL/PD granularity bar).

### 1.10 Order + Contract (essentials only)

Rally does not need SF Order Management's 20 adjustment-total fields. Essentials:

#### Contract (21 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| number | autonumber | SF:ContractNumber | no |
| companyId | link(company, required) | SF:AccountId | no |
| dealId | link(deal) | SF via opportunity | no |
| quoteId | link(quote, provenance) | HS post-acceptance contract | no |
| status | picklist (draft/in-approval/sent/signed/active/expired/terminated) | SF:Status + StatusCode | no |
| startDate | date | SF:StartDate | no |
| endDate | date (auto = start + term) | SF:EndDate | no |
| termMonths | number | SF:ContractTerm | no |
| value | currency | Rally-native (sum of lines) | no |
| ownerId | link(user) | SF:OwnerId | no |
| expirationNoticeDays | picklist (15/30/45/60/90/120) | SF:OwnerExpirationNotice | no |
| autoRenews | boolean | Rally-native | no |
| renewalTermMonths | number | SF:RenewalTerm2 | no |
| renewalUpliftPct | percent | CPQ renewal uplift | no |
| renewalDealId | link(deal, system-generated 90 days out) | CPQ renewals, Rally workflow seed | no |
| companySignerContactId + signedAt + signedTitle | link + datetime + text | SF:CustomerSignedId/Date/Title | no |
| internalSignerUserId + signedAt | link + datetime | SF:CompanySignedId/Date | no |
| specialTerms | textarea | SF:SpecialTerms | no |
| documentUrl | url (signed artifact) | e-sign rails | no |
| billingAddress / shippingAddress | address blocks | SF | no |
| description | textarea | SF | no |

#### Order (17 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| number | autonumber | SF:OrderNumber, NS:SO # | no |
| companyId | link(company, required) | SF:AccountId | no |
| dealId / quoteId / contractId | links (provenance chain) | SF:OpportunityId/QuoteId/ContractId, NS transform chain | no |
| status | picklist (draft/pending-approval/activated/fulfilled/billed/closed/canceled) | SF:Status, NS SO statuses | no |
| effectiveDate | date | SF:EffectiveDate | no |
| endDate | date | SF:EndDate | no |
| poNumber | text | SF:PoNumber | no |
| poDate | date | SF:PoDate | no |
| ownerId | link(user) | SF:OwnerId | no |
| currency | picklist | SF | no |
| totalAmount | currency (system rollup) | SF:TotalAmount | no |
| billingAddress / shippingAddress | address blocks | SF | no |
| activatedAt / activatedBy | datetime / link(user) | SF:ActivatedDate/ById | no |
| billingScheduleId | link (phased invoicing) | NS billing schedules | no |
| description | textarea | SF | no |
| lineItems | sublist (same shape as quote lines) | SF:OrderItem, NS item sublist | no |
| invoiceIds | link(invoice, multi, system) | NS chain | no |

The NetSuite transform chain, Rally-ized: Deal -> Quote (primary, synced) -> [accepted] ->
Order and/or Contract -> Invoice(s) -> Payment(s). Every arrow pre-fills the target from the
source, links back, and advances the source status. Full backward traceability: any invoice
traces to its order, quote, deal, campaign.

### 1.11 Invoice

Rally today (`store-ext.js` invoices): id, number, companyId, companyName, amount, status,
issuedAt, dueAt. NetSuite billing depth added:

#### Invoice (29 fields)

| Field | Type | Source parity | Rally today |
|---|---|---|---|
| number | autonumber (INV-XXXXX) | NS:tranId, Z:Invoice # | yes |
| companyId | link(company) | NS:Customer, Z:Account Name | yes |
| contactId | link(contact, billing contact) | Z:Contact Name | no |
| dealId / quoteId / orderId / contractId | links (provenance) | NS transform chain, Z:Sales Order | no |
| status | picklist (draft/open/sent/partially-paid/paid/overdue/void/written-off) | Rally + NS + Z:Status | yes (4 of 8) |
| issueDate | date | Z:Invoice Date, NS:tranDate | yes (issuedAt) |
| dueDate | date | Z:Due Date, NS terms-derived | yes (dueAt) |
| paymentTerms | picklist (net 15/30/45/60/90, due on receipt) | NS:Terms | no |
| currency | picklist | NS | no |
| exchangeRate | number | NS | no |
| subtotal | currency (system) | NS | no |
| discountAmount | currency | NS:Discount Item | no |
| taxAmount | currency | NS:Tax Total | no |
| shippingAmount | currency | NS:Shipping Cost | no |
| totalAmount | currency (system) | NS:Total | yes (amount) |
| amountPaid | currency (system) | NS payments applied | no |
| amountDue | currency (system) | NS | no |
| paidAt | datetime (system) | NS payment | no |
| billingAddress | address block | NS subrecord | no |
| poNumber | text | NS | no |
| memo | text (printed) | NS:Memo | no |
| customerMessage | text | NS:Customer Message | no |
| billingScheduleId | link (installment N of M) | NS billing schedules | no |
| installmentNumber / installmentCount | number | NS | no |
| recurringProfileId | link (subscription billing) | NS/HS subscriptions | no |
| lineItems | sublist (same line shape) | NS item sublist, Z Invoiced Items | no |
| payments | sublist {at, amount, method, reference} | NS:Customer Payment | no |
| sentAt / viewedAt | datetime (system) | Rally doc events | no |
| pdfUrl | url (generated artifact, versioned) | generation suite | no |

Object schema totals: Contact 135, Company 94, Deal 68 (+ sub-objects: line item 17,
stakeholder 6, competitor 4, close plan step 5, history 5), Lead block 14 (on
contact/company), Quote 46 + 24 line, Product 27 + PriceBook 7 + Entry 9,
Campaign 30 + Member 10, Ticket 47, Activity 47, Contract 21, Order 17, Invoice 29.
Canonical field total: ~648 rows across 18 tables (several rows carry 2-3 fields, so
~680 individual fields).

---

## 2. PICKLIST LIBRARY

Every canonical picklist with its seed values. All picklists are org-editable (add/rename/
reorder/deactivate) EXCEPT the ones marked restricted (system logic depends on them).
Stage-typed picklists (marked STAGE) automatically generate per-value entered/exited/elapsed
timestamps and support kanban grouping.

### 2.1 Industry (the 32-value Salesforce standard list - shared by contact + company)

Agriculture, Apparel, Banking, Biotechnology, Chemicals, Communications, Construction,
Consulting, Education, Electronics, Energy, Engineering, Entertainment, Environmental,
Finance, Food and Beverage, Government, Healthcare, Hospitality, Insurance, Machinery,
Manufacturing, Media, Not For Profit, Recreation, Retail, Shipping, Technology,
Telecommunications, Transportation, Utilities, Other.
(Rally's current 12 seed values map in: SaaS -> Technology, Financial Services -> Finance,
Logistics -> Shipping, Real Estate -> add as org value, Biotech -> Biotechnology,
Aerospace -> add as org value.)

### 2.2 Lifecycle stage (STAGE, on contact + company)

| Value | Meaning | Parity |
|---|---|---|
| subscriber | Opted in, nothing more | HS:Subscriber |
| lead | Raw top of funnel | HS:Lead, NS:Lead |
| mql | Marketing qualified | HS:MQL |
| sql | Sales qualified / working | HS:SQL |
| opportunity | Has an open deal | HS:Opportunity, NS:Prospect |
| customer | Has won business | HS:Customer, NS:Customer |
| evangelist | Advocate/referrer | HS:Evangelist |
| other | Partner, vendor, press... | HS:Other |

### 2.3 Lead status

New, Attempting to contact, Contacted, Engaged, Nurture, Qualified, Unqualified.
(Union of SF Open-Not Contacted/Working-Contacted, HS New/Open/In Progress/Attempted to
Contact/Connected/Open Deal/Unqualified/Bad Timing, Z attempted/contacted/junk.)

### 2.4 Lead source (shared by contact, company, deal)

Website, Web form, Organic search, Paid search, Paid social, Organic social, Email marketing,
Event, Webinar, Referral, Partner, Outbound, Purchased list, Chat, Phone inquiry, Direct,
Other. (Union of SF Web/Phone Inquiry/Partner Referral/Purchased List/Other + HS traffic
source taxonomy + Rally's current 8 leads-store values.)

### 2.5 Unqualified reason

No budget, No authority, No need, Bad timing, Wrong fit / not ICP, Competitor customer,
Unresponsive, Spam / junk, Duplicate.

### 2.6 Deal pipeline stages (STAGE, restricted flags; per-pipeline editable)

Default Sales pipeline (Rally's current stages, kept):

| Stage | Probability | Type | Forecast category | Rotting days |
|---|---|---|---|---|
| Lead | 10 | open | pipeline | 21 |
| Qualified | 25 | open | pipeline | 21 |
| Discovery | 45 | open | best_case | 30 |
| Proposal | 65 | open | best_case | 21 |
| Negotiation | 85 | open | commit | 14 |
| Closed Won | 100 | won | closed | - |
| Closed Lost | 0 | lost | omitted | - |

Per-stage config (SF OpportunityStage + PD stage anatomy): name, order, probability,
type (open/won/lost, restricted), forecastCategory default, rottingDays, requiredFields[]
(stage-entry gating), keyFields[] (path display), guidance (rich text). Multiple pipelines
per org (HS/PD/Z); each deal points at one pipeline.

### 2.7 Forecast category (restricted)

| Value | Label | Parity |
|---|---|---|
| omitted | Omitted | SF:Omitted, NS:Omitted |
| pipeline | Pipeline | SF:Pipeline, HS:Pipeline |
| best_case | Best case | SF:BestCase, HS:Best case, NS:Upside |
| commit | Commit | SF:Commit, HS:Commit, NS:Most Likely |
| closed | Closed | SF:Closed, HS:Closed won |

### 2.8 Quote status (restricted transitions)

Draft, Pending approval, Approved, Rejected, Published, Viewed, Accepted, Signed, Expired,
Voided, Archived. (Union of SF Draft/Needs Review/In Review/Approved/Rejected/Presented/
Accepted/Denied + HS Draft/Pending approval/Approved/Shared/Accepted/Expired/Voided/
Archived/Recalled + Z Quote Stage + NS Open/Processed/Voided/Expired/Closed.)

### 2.9 Deal type

New business, Existing business - expansion, Existing business - renewal,
Existing business - upgrade, Existing business - downgrade, Existing business - replacement.
(SF Type + HS dealtype + HS recurring revenue deal types.)

### 2.10 Product item type (NS 16 types condensed to what a revenue platform sells)

Service, Subscription, License / seat, Physical good, Digital good, Bundle (own price),
Group (sum of parts), Usage / metered, Fee / other charge, Discount line, Description line.

### 2.11 Campaign type

Email, Webinar, Event / conference, Trade show, Advertisement, Paid social, Paid search,
Direct mail, Telemarketing, PR, Partner / co-marketing, Referral program, ABM, Content /
nurture, Other. (SF 12 defaults + Rally's current channels.)

### 2.12 Campaign status

Planned, In progress, Scheduled, Completed, Aborted, Draft. (SF + Rally current.)

### 2.13 Campaign member status (per-campaign editable; seed set)

Added, Sent, Opened, Clicked, Responded (isResponded), Registered, Attended (isResponded),
No-show, Converted (isResponded), Unsubscribed.

### 2.14 Ticket status (STAGE, per-pipeline; seed set)

New, Open, Waiting on customer, Waiting on us, Escalated, Solved, Closed.
(SF New/Working/Escalated/Closed + HS pipeline statuses + Rally open/pending/solved.)

### 2.15 Ticket priority (restricted - SLA rules key off it)

Low, Medium, High, Urgent. (HS set; SF has High/Medium/Low; Rally already matches HS.)

### 2.16 Ticket origin

Email, Phone, Web form, Chat, Portal, API, In person, Social. (SF Phone/Email/Web + HS
Chat/Email/Form/Phone.)

### 2.17 Rating (contact, company)

Hot, Warm, Cold. (SF/Z; PD lead labels map Hot/Warm/Cold.)

### 2.18 Company type (relationship to us)

Prospect, Customer, Former customer, Partner, Reseller, Vendor, Competitor, Investor, Press,
Other. (SF Type + HS type union.)

### 2.19 Company ownership

Public, Private, Subsidiary, Nonprofit, Government, Other. (SF Ownership.)

### 2.20 Employee ranges

1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10000+.
(Standard LinkedIn-style buckets; supersedes Rally's current 6 buckets - migrate 1-50 into
1-10/11-50 by employees count when known.)

### 2.21 Revenue ranges

Under 1M, 1M-10M, 10M-50M, 50M-100M, 100M-500M, 500M-1B, 1B+.

### 2.22 Buying role (deal stakeholders + contact.buyingRole)

Champion, Economic buyer, Decision maker, Technical evaluator, Influencer, End user,
Executive sponsor, Legal and compliance, Procurement, Blocker, Other.
(Union of SF OpportunityContactRole 9 values + SF BuyerAttributes 8 + HS hs_buying_role 9 +
Rally's current 6 STAKEHOLDER_ROLES - Rally keeps its richer influence + sentiment axes.)

### 2.23 Influence (stakeholder)

High, Medium, Low. (Rally-native, keep.)

### 2.24 Task status

Open, In progress, Waiting on someone, Deferred, Done. (SF TaskStatus 5 defaults.)

### 2.25 Task priority

High, Normal, Low. (SF TaskPriority.)

### 2.26 Call outcome

Connected, Left voicemail, No answer, Busy, Wrong number, Gatekeeper. (HS call outcomes +
CL dispositions.)

### 2.27 Meeting outcome

Held, No-show, Rescheduled, Canceled. (HS meeting outcomes.)

### 2.28 Activity type (extensible with custom types + icons - PD insight)

Task, Call, Email, Meeting, Note, SMS, LinkedIn, WhatsApp, Deadline, Lunch.

### 2.29 Win reasons (org-editable; Rally seed kept)

Product fit, Champion drove it, Better AI / automation, Faster time to value,
Price / packaging, Executive alignment, Relationship, Compliance / security.

### 2.30 Loss reasons (org-editable; Rally seed kept)

Went with incumbent, No budget / timing, Lost to competitor (+ which), No decision / stalled,
Missing capability, Price, Champion left, Security / legal blocked.

### 2.31 Invoice status (restricted)

Draft, Open, Sent, Partially paid, Paid, Overdue, Void, Written off.

### 2.32 Order status (restricted)

Draft, Pending approval, Activated, Partially fulfilled, Fulfilled, Billed, Closed, Canceled.
(SF Draft/Activated + NS Pending Approval -> Billed chain.)

### 2.33 Contract status (restricted)

Draft, In approval, Sent for signature, Signed, Active, Expiring soon (system), Expired,
Terminated. (SF Draft/InApproval/Activated + e-sign states.)

### 2.34 Payment terms

Due on receipt, Net 15, Net 30, Net 45, Net 60, Net 90. (HS/NS.)

### 2.35 Health (company - Rally-native, keep)

Green, Yellow, Red.

### 2.36 Visibility (record-level, PD model)

Private (owner only), Team, Everyone.

### 2.37 Marketing contact status

Subscribed, Unsubscribed, Bounced, Archived, Non-marketing. (PD Campaigns + HS marketing
contact status.)

### 2.38 Forecast type / rollup basis

Revenue by close date, Quantity, Line-item revenue by service date, Splits revenue, Overlay.
(SF ForecastingType flavors - Rally ships the first, schema allows the rest.)

### 2.39 Billing frequency

One-time, Monthly, Quarterly, Semi-annual, Annual. (HS/PD/NS.)

### 2.40 Project task status (STAGE - Rally projects, keep + extend)

Todo, Doing, Blocked, Review, Done. (Rally's 4 + review; Monday status column pattern:
every value carries a color + optional done-state flag.)

---

## 3. RECORD PAGE SPEC (beats Lightning)

The one Rally record page component (`RecordPage`) renders every object from its field
registry + page config. No per-object hand-rolled detail pages.

### 3.1 Anatomy (top to bottom)

1. **Header / highlights strip** (SF compact layout + PD summary block):
   record icon + name, up to 7 KEY FIELDS inline-editable, action bar
   (Edit, Follow, AI summarize, object actions like Qualify / New Quote / Log call,
   overflow: merge, delete, change owner, export). Sticky on scroll.
2. **Path / stage bar** (SF Path + PD progress bar): horizontal chevrons for ANY stage-typed
   field (deal stage, lifecycle stage, ticket status, quote status). Each chevron shows
   days-in-stage on hover; current stage shows its keyFields[] + guidance popover; advancing
   into a stage with requiredFields[] opens the stage-gate modal (HS board gating). Closed
   stages behind a "Close" split button. Confetti on won (SF celebration, tasteful).
3. **Three-column body** (HS layout, the proven winner):
   - LEFT (30%): field sections from the registry, collapsible, in section order, each
     header shows filled/total count (progressive disclosure). Inline edit EVERY field
     (pencil on hover). AI-fill sparkle per empty field; "Fill with AI" per section.
     Write-locked system fields render with a lock + provenance tooltip.
   - CENTER (45%): tab set (per-object below). First tab is always the unified TIMELINE:
     composer at top (Note / Task / Call / Email / Meeting quick-log), then Upcoming +
     Overdue block (SF), then history grouped by month (SF), filterable by type + user
     (HS), pinned items float (HS). Each activity type gets its typed card (1.9).
   - RIGHT (25%): related panels (association cards, HS-style), each with count, first 3-6
     rows, inline "+ New" carrying context, View All -> saved view.
4. **Record = workspace** (Notion insight): every record has a free-form notes/doc area
   (rich text blocks) as a tab, not a modal.

### 3.2 Per-object configuration

| Object | Highlights (7) | Tabs | Right-rail panels |
|---|---|---|---|
| Contact | name, title, company, email, phone, lifecycleStage, owner | Timeline, Details, Deals, Docs/Notes, Emails | Company card, Deals, Open tasks, Tickets, Campaigns, Sequences enrolled, Files |
| Company | name, domain, industry, employees, health, owner, openDealsCount | Timeline, Details, Contacts, Deals, Tickets, Invoices, Notes | Hierarchy (parent/children), Key contacts (org chart via reportsTo), Open deals, Open tickets, AR summary (open/overdue invoices), Files |
| Deal | name, amount, stage, closeDate, probability, forecastCategory, owner | Timeline, Details, Line items, Stakeholders (buying committee map), Quotes, Files/Notes, History | Company card, Close plan checklist, Competitors, AI insight panel (dealInsight - keep), Next step + due, Contacts on deal |
| Lead-stage contact | name, companyName, title, leadScore, leadStatus, leadSource, owner | Timeline, Details, Notes | Qualify action card (the 1.4 flow), Score breakdown, Campaign touches, Similar/duplicate warning |
| Quote | number, name, deal, grandTotal, status, expiresAt, owner | Preview (live doc), Line items, Details, Activity/events, Versions | Deal card, Approval status, Signers + status, Payment status, Documents (V1..Vn) |
| Ticket | number, subject, status, priority, SLA countdown, assignee, company | Conversation (threaded), Details, Timeline | Contact + company cards, SLA clocks (first response + close), Linked tickets, KB suggestions (AI), CSAT |
| Campaign | name, type, status, startDate, budgetedCost, roi, owner | Performance (funnel: sent>opened>clicked>responded>deals>won), Members, Details, Timeline | Hierarchy, Attributed deals, Attributed revenue, UTM links |
| Product | name, sku, family, price, billingFrequency, itemType, isActive | Details, Pricing (price book entries + quantity breaks), Usage (deals/quotes referencing) | Price books, Bundles containing this, Revenue rollup |
| Invoice | number, company, totalAmount, amountDue, status, dueDate, issueDate | Preview (doc), Line items, Details, Payments | Company card, Provenance chain (deal>quote>order), Payment history, Reminders sent |
| Project | name, owner, progress, dueDate, health, - , - | Board (kanban), Table, Timeline/Gantt, Calendar, Workload, Doc | Linked company/deal, Members, Recent updates |

### 3.3 Behaviors (non-negotiable)

- Inline edit everywhere: field save on blur/enter, optimistic, per-field undo toast.
- Every field: hover shows source/provenance (manual / AI / import / enrichment / system).
- AI-fill: sparkle -> suggests value + evidence -> pending chip -> confirm/reject. Bulk
  "review AI suggestions" tray per record.
- Duplicate warning card when fuzzy match detected (SF potential duplicates).
- Keyboard: e = edit, / = search, cmd-k = command palette (AT keyboard-first bar).
- Every related list row navigates AND hover-previews (SF quick links).
- Record follow -> in-app notifications on changes (SF/PD followers).
- Empty states always offer: create manually, import, or ask AI to find/fill.
- Mobile: sections collapse to accordion, timeline is default tab.

---

## 4. VIEWS ENGINE SPEC

One engine renders every collection in Rally. A view is a saved, shareable, EXECUTABLE query.

### 4.1 SavedView schema

| Field | Type | Notes |
|---|---|---|
| id / name / emoji | ids | |
| collection | enum | contacts, companies, deals, activities, tickets, quotes, invoices, products, campaigns, projects, projectTasks, or any custom object |
| viewType | enum | table, kanban, timeline, gantt, calendar, cards, workload, chart, map, funnel |
| filters | JSON | field + operator + value groups with AND/OR nesting (SF filter logic, HS advanced filters); relative dates (this month, last 30d); "my records" token; cross-object hops (deals where company.industry = X) |
| columns | array | field ids + width + order; supports fields from linked records (mirror columns, MO) |
| sort | array | multi-key |
| groupBy | field id | any picklist/link/user field; per-group aggregates (sum/avg/count of any numeric column - MO column summary) |
| kanbanConfig | JSON | lane field (any stage/picklist), card fields, lane aggregate (sum amount - SF kanban), WIP hints |
| calendarConfig | JSON | date or date-range field driving placement |
| timelineConfig | JSON | start/end fields, group rows by owner/group, dependency display |
| chartConfig | JSON | chart type + measure + dimension (list view charts, SF) |
| visibility | enum | private / team / everyone (SF list view sharing) |
| ownerId, isPinned, isDefault | | pinned default per user (SF) |
| rowHeight, hiddenFields | | Airtable view ergonomics |

### 4.2 View types (union of SF + PD + MO + Airtable + Notion)

| View type | Source parity | Spec |
|---|---|---|
| Table | all | Inline edit every cell (AT bar: spreadsheet-grade), bulk select up to 200 + mass actions (change owner, stage, tags, delete, add to campaign/sequence, export), sticky first column, column resize/reorder, per-group aggregates, footer summaries |
| Kanban | SF list kanban, HS board, PD pipeline, MO, AT (any status attr) | Group by ANY picklist/stage/user field on ANY collection; drag = field update (with stage-gate modal when required fields missing); lane totals (sum any currency field); card face configurable; deal cards carry next-activity status icon (PD green/yellow/red/gray) + rotting red tint |
| Timeline | MO timeline | Horizontal bars by date-range field, grouped rows |
| Gantt | MO gantt | Timeline + dependencies (blockedBy field type) + milestones + critical path + baseline snapshot |
| Calendar | SF calendars, MO, Airtable | Month/week/day from any date field; activities calendar is this view over dueAt/startAt |
| Cards / gallery | Airtable gallery, MO cards | Image-forward cards |
| Workload | MO workload | Capacity per person per week from an effort field vs per-user capacity; overallocation flag |
| Chart | MO chart, SF list charts | Aggregation of the filtered set (bar/line/pie/funnel/number) - a dashboard widget IS a saved chart view |
| Map | MO map | Pins from address lat/lng |
| Funnel | PD/CL funnel | Stage-to-stage conversion + velocity over the filtered set |
| Forecast | PD forecast view | Kanban over close-month columns with weighted totals |

### 4.3 Views are executable (Close Smart Views insight)

Any saved view exposes actions over its CURRENT result set: bulk edit, enroll in sequence,
add to campaign, export CSV, feed to automation ("for every record entering this view..."),
generate doc/deck from view, subscribe (email me new entrants - NS saved search alerts).
View membership change (record enters/leaves) is a first-class automation trigger.

### 4.4 Monday's load-bearing column types as Rally field types

These four become first-class field types in the custom fields engine (5.1), available on
every object including projects:

1. **status** (stage-typed picklist): colored labels, done-state flag per label, drives
   kanban + progress rollups + per-value timestamps.
2. **people** (user link, single/multi): drives workload view, "assign me" automations,
   notification routing.
3. **timeline** (date range): start+end in one field, drives timeline/gantt/calendar.
4. **connect** (record link, any object) + **mirror** (lookup through a connect field):
   Airtable linked-record + lookup/rollup; two-way by construction (AT relationship
   attributes).

### 4.5 Boards spec (Projects 2.0 - the Monday-killer inside Rally)

Rally today (`store-depth.js` projects): id, name, color, ownerId, companyId, tasks
(title, assigneeId, status, priority, due).

Target model: Project (board) -> Group (colored section) -> Task (item) -> Subtask
(one nesting level, own columns - MO subitems). Task canonical columns: title, status
(2.40), assignees (people, multi), timeline (start/end), due date, priority, effort
(number, feeds workload), tags, connect (link to deal/company/contact/ticket), mirror
columns through connects, formula columns, files, progress (weighted status rollup from
subtasks), lastUpdatedBy/At, autoNumber. Custom columns via the same fields engine.
Groups: collapsible, colored, drag between, group summaries. Item card pop-out: updates
thread (comments, @mentions, files, checklists), activity log of every cell change, columns
tab. Board views: table (default), kanban, timeline, gantt, calendar, workload, chart, form
(public intake creating items). Board automations use the same engine as CRM (Section 5.6)
with the MO recipe seeds: status-done -> move to group; date arrived + not done -> notify
owner; every Monday 9am -> create item; all subtasks done -> parent done; button column ->
run automation. Project templates (board + groups + tasks + automations) - onboarding
template auto-instantiated on deal won (Rally's cross-object edge no one else has).

---

## 5. PLATFORM ENGINES SPEC

### 5.1 Custom fields engine (the foundation - Wave 1)

Field registry row: `{ id, objectType, key, label, type, section, sectionOrder, fieldOrder,
options[] (id, label, color, isDone, probability...), linkTarget, formula, rollupConfig,
defaultValue, required (create-level, rare), requiredAtStages[], unique, aiFillPolicy
(auto/suggest/off), aiPrompt, helpText, isSystem, isHidden, permissions, createdBy }`.

Canonical field types (25 - union of Airtable 30, Monday 40, HS/PD/SF/Notion types, deduped):

| # | Type | Covers |
|---|---|---|
| 1 | text | SF string, HS text, MO text, AT text |
| 2 | textarea | SF textarea, MO long text |
| 3 | richtext | Airtable rich long text, Notion text, HS rich text |
| 4 | number | int/decimal w/ precision, unit formatting (MO numbers) |
| 5 | currency | currency + code, multi-currency aware |
| 6 | percent | SF percent |
| 7 | duration | Airtable duration, HS time-in-stage |
| 8 | boolean | checkbox everywhere |
| 9 | picklist | single select, colored options |
| 10 | multiPicklist | multi select |
| 11 | status | stage-typed picklist (4.4) - done flags, timestamps, kanban |
| 12 | date | date only |
| 13 | datetime | timestamp |
| 14 | timeline | date range (MO) |
| 15 | email | validated, mailto |
| 16 | phone | validated, country code, click-to-call |
| 17 | url | link + display text |
| 18 | address | structured block (street/street2/city/state/postal/country/lat/lng) |
| 19 | user | people type, single/multi (MO people) |
| 20 | link | record reference, single/multi, any object, optional labels (connect) |
| 21 | mirror | lookup through a link field (MO mirror, Airtable lookup) |
| 22 | rollup | aggregate through a link (Airtable rollup: SUM/COUNT/MIN/MAX/AVG/ARRAYUNIQUE) |
| 23 | formula | computed, read-only (5.2) |
| 24 | rating | 1-5 stars (AT/Airtable) |
| 25 | files | attachments (Airtable attachment, MO files) |
| + | autoNumber, tags, ai | autoNumber per object; tags (account-global, MO); ai (prompt-per-record autofill - Airtable AI field, Notion AI props, MO AI columns) |

Storage: canonical fields as typed columns where they exist today; everything else in a
`custom` JSON map per record, indexed via the registry. The record editor, views engine,
filters, imports, automations, and API all read the registry - a custom field is
indistinguishable from a canonical one everywhere.

### 5.2 Formula + rollup fields

- Formula language: spreadsheet-style functions over sibling fields + linked-record hops
  (Airtable function library as the reference set: IF, AND/OR, DATETIME_DIFF, CONCAT, ROUND,
  REGEX_MATCH, SWITCH...). Typed output (number/text/date/bool). Read-only, recomputed on
  dependency change. Formulas CAN drive automations (fixes Monday's dead-end formula
  column).
- Rollups: through any link field, aggregations SUM/COUNT/AVG/MIN/MAX/EARLIEST/LATEST/
  UNIQUE, with an optional filter on the child set (SF roll-up summary + filter). All the
  system rollup fields in Section 1 (dealsCount, totalRevenue...) are implemented ON this
  engine, just system-owned.

### 5.3 Validation rules

Per object: `{ condition (formula), errorMessage, errorField, active }` - SF validation
rules. Evaluated on save; stage-gate requiredAtStages evaluated on stage transition
(PD required fields / Zoho Blueprint transition conditions). Ship seed rules: closeDate not
in past on open deal create, probability 0-100, email format, amount >= 0.

### 5.4 Duplicate detection + merge

- Matching rules: exact on email/domain, fuzzy on name+company (SF matching rules).
- On create/edit: warn-with-list or block (SF duplicate rules); potential-duplicates card
  on record pages.
- Merge wizard: pick survivor, field-by-field chooser, relations re-parented, mergedIds
  lineage kept (HS merge, SF merge). Org-wide duplicate scan job (SF duplicate jobs).

### 5.5 Import / export

- CSV import wizard: upload -> header mapping to registry fields (auto-suggest by label) ->
  dedupe strategy (skip/update/create anyway, match on email/domain/externalId - SF upsert)
  -> dry-run preview -> import log with per-row errors (PD/Airtable import ergonomics).
- Export: any saved view to CSV; full object export; API bulk endpoints.

### 5.6 Automation engine (the visual-mock workflows become real - Wave 5)

Model: `{ trigger, conditions[], actions[], active, runLog }` - sentence-grammar composer
(MO) with real branching (HS if/then up to N branches, AND/OR condition groups, random
split), delays (HS: fixed, until date field, until day/time), and goal-exit criteria (HS).

Trigger vocabulary (union of SF Flow / HS enrollment / MO / PD / Zoho):

| Category | Triggers |
|---|---|
| Record | created, updated (any/specific field), deleted, stage/status changed (to/from), owner changed, tag added |
| View/list | record enters saved view, record leaves saved view (Close Smart View + HS list membership) |
| Date | date field arrives, X days before/after date field, recurring schedule (cron: daily/weekly/monthly at time) |
| Activity | activity logged (type filter), email opened/clicked/replied, meeting booked/held, call outcome set, form submitted |
| Engagement | no activity in N days (stalled/rotting), score crossed threshold, SLA breached/warning |
| Commerce | quote viewed/accepted/signed, payment received, invoice overdue |
| External | webhook received, API call |
| Manual | button field clicked (MO button), run-from-record action, enrolled by user |

Action vocabulary (union of HS 60+ workflow actions / MO / SF Flow / Zoho):

| Category | Actions |
|---|---|
| Records | create record (any object, field mapping), update field(s), copy field, clear field, increment/decrement, create linked record (task/note/deal/ticket/project-from-template), delete/archive record, connect records, apply/remove association label |
| Routing | assign owner (specific/round-robin/least-loaded/by-territory-rule), rotate, add follower, move to group/board |
| Comms | send email (template + merge fields), send internal notification (in-app), notify Slack/Teams webhook, send SMS, enroll in sequence, unenroll from sequence, add to campaign, set marketing status |
| Flow control | if/then branch, AND/OR condition branch, random split, delay (fixed/until date/until day-time), go to action, go to workflow, exit on goal met |
| Approvals | request approval (5.7), wait for approval outcome |
| AI | prompt step (generate/classify/extract/summarize into a field - HS Breeze custom prompt, MO AI blocks), score record, draft email for rep review |
| Data ops | webhook out (POST with payload mapping), format/clean data, run custom function (JS, sandboxed - Airtable script action tier) |
| Docs | generate document from template (quote PDF, proposal), create doc from template (MO) |

Management surface: per-run log with per-action status (HS action logs), version history,
test mode with sample record, health flags (at-risk/erroring workflows), folders, metering.
Seed recipes = the 8 already named in Rally's workflows store (round-robin lead assignment,
big-deal Slack alert, renewal auto-create, overdue invoice reminder, enrich on create,
stalled-deal task, trial welcome, urgent-ticket escalation) - these become the shipped
templates, actually executable.

### 5.7 Approval processes

`{ entryCondition (formula: e.g. discountPercent > 20), steps[] (approverId/role/manager-of-
owner, order, parallel flag), onApprove actions, onReject actions, recall, comments }` -
SF approval processes simplified + HS quote approvals + CPQ discount thresholds. Approvable:
quotes, deals (stage gate), discounts, custom. Approve/reject from notification (email or
in-app) without opening the record.

### 5.8 RBAC (one clean model - not SF's five-layer cake)

- **Roles**: admin, manager, rep, read-only, custom. A role = object permissions matrix
  (per object: none/view/create/edit/delete/export) + feature grants (manage fields,
  manage automations, manage users, bulk delete, view revenue analytics).
- **Record visibility**: org default per object (private/team/everyone - SF OWD reduced),
  ownership + manager-hierarchy rollup (managers see their team's records), record-level
  visibility field (2.36), explicit shares (sharedUserIds).
- **Field-level security**: per role, hide or read-only any registry field (SF FLS - needed
  for comp-sensitive amount fields).
- **Scoped restrictions**: own-records-only toggle per role per object (NS restriction).
- Teams: users belong to teams; team used for visibility, routing, reporting.

### 5.9 Audit log

Every field change on every object: `{ at, userId (or system/ai/automation:id), objectType,
recordId, field, from, to }` - generalizes dealExtras.history. Surfaces: History tab per
record (PD changelog in-UI), org audit view (admin, filterable), stage-history reports
(SF OpportunityHistory), automation run provenance. Retention: full for paid, 90d free tier.

### 5.10 API surface

- REST: CRUD per object (`/api/v1/{collection}`), field registry introspection
  (`/api/v1/schema/{collection}` - the registry IS the API contract), saved-view execution
  (`/api/v1/views/{id}/records`), bulk upsert (externalId match), search.
- Webhooks: subscribe to record events (created/updated/deleted/stage-changed) per object.
- Auth: API keys per workspace + per-key scopes mirroring RBAC roles.
- Rate limits + changelog versioning (`/v1/`). SF's moat is its API; Rally needs this
  before an integration ecosystem can exist.

---

## 6. GENERATION SUITE SPEC (clears the docgen landscape)

The landscape conclusion (zoho-netsuite-monday-master.md section 5): no incumbent generates
good documents natively; PandaDoc's existence is the proof. Rally's generation suite is
native, CRM-truth-bound, and versioned.

### 6.1 Quote / invoice PDF (Wave 4)

The document must contain (union of SF quote template + HS quote modules + NS templates):
- Header: logo (brand kit), company name + address, doc title, number, issue date,
  expiration date, currency, optional PO number.
- Parties: seller block (name/company/phone/email), buyer block (contact + company),
  bill-to block (billing contact, address, up to 3 tax IDs).
- Cover letter / executive summary section (rich text, AI-drafted from deal context).
- Line-item table: columns configurable (product, description, qty, unit price, list price,
  discount, term, billing start, tax, total); grouping by groupLabel; presentational lines
  (subtotal/description rows - NS item-type insight); ramp/installment display.
- Totals block: subtotal, discount, tax, shipping, GRAND TOTAL; recurring vs one-time
  split; per-billing-period preview ("$X due at signing, $Y/month thereafter").
- Terms and conditions rich text (from terms library snippets), payment terms.
- Signature block: e-sign fields per signer + countersigner, or print-and-sign lines.
- Footer: page numbers, legal footer, validity note.
- Every generated PDF = a version row (quoteDocument V1..Vn - SF), regenerable when data
  changes, diff note between versions.

The quote is ALSO a live web page (HS insight): hosted URL, optional password, view
tracking per section, accept button, e-sign flow, payment collection (card/ACH), embedded
AI agent answering buyer questions from deal/product knowledge (HS closing agent), and
every buyer event (viewed/accepted/signed/paid/question) written to the deal timeline.

### 6.2 Proposal / document builder (PandaDoc-killer scope)

- Block editor: text, image, pricing table (bound to deal line items - live), quote block,
  signature block, video embed, page break, two-column, testimonial, team bios.
- Templates + content library (reusable sections, terms snippets, case studies).
- Merge fields from any registry field ({{deal.amount}}, {{contact.firstName}},
  {{company.name}}) with fallbacks.
- AI drafting: "write a proposal for this deal" -> pulls deal, stakeholders, competitors,
  close plan, products -> drafts every section for human edit.
- Approval flow before send (5.7); send as tracked link + PDF; per-page view-time
  analytics (PandaDoc's key metric); e-sign native; expiration + auto-reminders.
- Every doc: versioned, linked to the deal, status (draft/sent/viewed/signed), regenerable.

### 6.3 PPTX deck generation (nobody in the landscape does this)

- Deck types: QBR deck (account health, usage, tickets, roadmap), pipeline review deck
  (forecast, stage movement, top deals, risks), proposal deck (problem/solution/pricing/
  plan), win-loss readout.
- Data binding: every number on a slide traces to a saved view or record field at generation
  time; regenerate refreshes numbers.
- Brand kit: logo, colors, fonts applied to a slide-master; Gamma-class layout quality.
- Output: real .pptx (editable) + PDF; stored as versioned artifacts on the record.

### 6.4 Dashboards / reports builder (Wave 7 completes; widgets exist from Wave 3)

- A dashboard = grid of widgets; every widget = a saved chart view (4.2) or one of:
  number/KPI tile (with vs-last-period delta - NS KPI portlet), funnel, leaderboard,
  battery/stacked progress (MO), table, text/markdown, embed.
- Report builder: pick collection -> filters -> group rows (up to 3) + columns -> summarize
  (sum/avg/min/max) -> chart it (SF summary/matrix reports simplified); formula columns;
  conditional highlighting; drill-through to the underlying saved view ALWAYS.
- Scheduling: email a dashboard/report snapshot daily/weekly (SF subscriptions);
  alert when a metric crosses a threshold (NS saved-search alerts).
- Forecast module keeps its dedicated grid: period x category x owner, quota vs attainment,
  manager adjustments with notes (SF collaborative forecasts, simplified to one level).

### 6.5 Graphics + artifacts

- On-brand one-pagers, battle cards, social cards from brand kit + record data (Canva
  territory, CRM-aware).
- Code artifacts: ROI calculators, landing pages, embeds generated from deal/product truth -
  beyond the entire category; ships last, flag-gated.

---

## 7. BUILD ORDER (agent waves)

Each wave lists: files to touch, store changes, pages, acceptance bar. Waves are ordered so
every wave ships user-visible value and no wave rewrites a prior wave's output.

### Wave 1 - Custom fields engine + canonical schemas in the store

- Files: NEW `src/lib/fields.js` (registry + types + sections + seed canonical registries
  for all 12 objects from Section 1), NEW `src/lib/registry-seeds/*.js` (one per object),
  EXTEND `store.js` / `store-ext.js` / `store-depth.js` (add `custom{}` map + audit tail to
  every record; widen seeds to populate a representative 30% of new canonical fields so
  pages look alive), NEW `src/lib/audit.js` (generalized history), NEW `src/lib/picklists.js`
  (Section 2 library).
- Store changes: contacts/companies/deals gain every Section 1 field (null-defaulted);
  leads array migrates into contacts with lifecycleStage='lead' (keep a `getLeads()` shim
  reading the view); stages become per-pipeline config with rottingDays + requiredFields;
  system rollups (counts, lastActivityAt) computed by a `recompute()` pass on commit.
- Pages: none new (foundation wave), but nothing breaks - all current pages keep working.
- Acceptance bar: every field in Section 1 exists in the registry with correct type +
  section; a custom field created via `createField()` shows up in filters and the record
  `custom` map; picklist library matches Section 2 exactly; em-dash scan of all new files
  passes.

### Wave 2 - Record pages (full-field editors)

- Files: NEW `src/components/RecordPage.jsx` (+ FieldSection, FieldEditor per type,
  HighlightsBar, StageBar, RelatedPanel, TimelineTab), REWIRE `ContactDetail`,
  `CompanyDetail`, `DealDetail` pages onto RecordPage; NEW settings page
  `src/pages/settings/Fields.jsx` (field manager UI: add/edit/reorder/hide fields,
  sections, picklist values).
- Store: pageConfig per object (highlights, tabs, panels from 3.2) in fields.js.
- Acceptance bar: a Salesforce admin cannot name a missing field on Contact, Company, or
  Deal - every Section 1.1-1.3 field is visible in its section, inline-editable, with
  progressive disclosure and AI-fill affordances rendered (AI can be stubbed); stage bar
  gates on requiredAtStages.

### Wave 3 - Views engine + saved views

- Files: NEW `src/lib/views.js` (SavedView store + query executor over registry fields),
  NEW `src/components/views/` (ViewShell, TableView, KanbanView, CalendarView, CardsView,
  FilterBuilder, ColumnPicker, BulkBar), REWIRE Contacts/Companies/Deals/Tickets/Quotes/
  Invoices/Products/Leads index pages onto ViewShell.
- Acceptance bar: any collection renders as table or kanban grouped by any picklist; filter
  builder does AND/OR groups + relative dates + my-records; views save/share/pin; bulk edit
  200 records; kanban drag updates the field and respects stage gates; the Leads page is
  literally a saved view over contacts.

### Wave 4 - Quote-to-cash deep

- Files: EXTEND `store-ext.js` (quote header/lines per 1.5, invoice per 1.11, NEW contracts
  + orders per 1.10, priceBooks + entries per 1.6), NEW `src/lib/pricing.js` (resolution
  waterfall), NEW QuoteEditor page (header + line grid + totals math), NEW quote PDF
  generator (6.1) + public quote page route, invoice generator, provenance chain UI.
- Acceptance bar: create quote from deal (lines copied), exactly one primary quote syncs
  bidirectionally; totals math matches Section 1.5 (subtotal -> discounts -> tax/shipping ->
  grand total); PDF contains every 6.1 element; quote statuses drive deal timeline events;
  accepted quote one-clicks into contract + invoice; invoice knows amountPaid/amountDue.

### Wave 5 - Automation engine executable

- Files: REWRITE `src/lib/workflows` portion of store-ext into NEW `src/lib/automation.js`
  (trigger bus on store commits + scheduler + action executors per 5.6), NEW
  WorkflowBuilder page (sentence composer + branch canvas), run-log UI.
- Acceptance bar: the 8 seeded recipes actually execute against store events (round-robin
  assigns, stalled-deal creates a task, overdue invoice flips status + notifies); runs are
  logged per action; a user composes trigger + condition + 2 actions without docs; view-
  membership triggers fire.

### Wave 6 - Boards 2.0 (projects)

- Files: EXTEND `store-depth.js` projects into groups/items/subitems with column registry
  (reuse fields engine), NEW board views (gantt + workload + form added to views engine),
  updates thread + activity log per item, project templates + deal-won auto-instantiation.
- Acceptance bar: a Monday user cannot name a missing load-bearing column type (status,
  people, timeline, connect, mirror, formula all work on a board); subtasks roll up;
  the 5 seed automation recipes work on boards; won deal spawns onboarding project from
  template with the company/deal connected.

### Wave 7 - Generation suite

- Files: NEW `src/lib/generate/` (docBuilder, pdf, pptx, brandKit), proposal block editor
  page, deck generator flows (QBR, pipeline review), dashboards builder upgrade per 6.4,
  report scheduler.
- Acceptance bar: proposal builder produces a tracked, signable doc bound to live deal
  data; QBR deck generates as editable pptx with every number traceable to a view; a
  dashboard widget always drills to its saved view; metric threshold alerts fire.

### Wave 8 - RBAC + audit

- Files: NEW `src/lib/rbac.js` (roles matrix per 5.8, visibility resolver wrapped around
  every store read), NEW settings pages (Roles, Teams, Audit log), field-level security
  enforcement in RecordPage + views, org audit view over `audit.js`.
- Acceptance bar: a rep sees only permitted records/fields in every view, record page,
  export, and API response; manager sees team rollup; admin audit view answers "who changed
  this field and when" for any record; approvals (5.7) respect roles.

Cross-wave rules: every wave updates seeds so demo data exercises the new surface; every
wave adds its objects/fields to THIS file first if they deviate; no em-dashes; every list
ships as a saved view from Wave 3 onward; AI-fill affordances render from Wave 2 even where
the model call is stubbed.

---

END OF SPEC. Counts: ~648 canonical field rows (~680 fields) across 18 field tables,
40 picklists, 25 + 3 field types, 11 view types, 8 trigger categories + 8 action
categories, 8 build waves.
