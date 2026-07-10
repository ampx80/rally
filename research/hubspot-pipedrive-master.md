# HubSpot / Pipedrive / Close / Attio master extraction

Competitive-intelligence extraction for Rally. All data from public vendor docs, captured 2026-07-09.
Primary sources cited inline. ASCII hyphens only throughout.

---

## 1. HUBSPOT DEFAULT PROPERTIES

Source pages (knowledge.hubspot.com):
- Contacts: https://knowledge.hubspot.com/properties/hubspots-default-contact-properties
- Companies: https://knowledge.hubspot.com/properties/hubspot-crm-default-company-properties
- Deals: https://knowledge.hubspot.com/properties/hubspots-default-deal-properties
- Tickets: https://knowledge.hubspot.com/properties/hubspots-default-ticket-properties

Internal API names (hs_*, lifecyclestage, etc.) noted where publicly documented via the CRM Properties API.

### 1.1 Contact default properties (150+)

#### Contact information

| Property | Type | Notes |
|---|---|---|
| First name (firstname) | text | |
| Last name (lastname) | text | |
| Email (email) | text (unique) | Primary dedupe key alongside Record ID |
| Email domain | text | Auto-derived from email |
| Phone number (phone) | phone | Primary phone |
| Mobile phone number (mobilephone) | phone | |
| Fax number (fax) | phone | |
| Salutation | text | Title used to address contact |
| Job title (jobtitle) | text | |
| Employment Role | enum | Contact's job role (enrichment) |
| Employment Sub Role | enum | Second-level job role |
| Employment Seniority | enum | Job seniority (enrichment) |
| Company name (company) | text | Free-text, separate from associated company record |
| Industry | text | |
| Annual revenue (annualrevenue) | number | Of contact's company |
| Number of employees (numemployees) | number | Of contact's company |
| Website URL (website) | text | Contact's company website |
| LinkedIn URL | text | |
| Street address (address) | text | Includes unit number |
| City (city) | text | |
| State/Region (state) | text | |
| State/Region Code | text | Two-letter code |
| Postal code (zip) | text | |
| Country/Region (country) | text | |
| Country/Region Code | text | Two-letter code (alpha-2) |
| Time zone | enum | |
| Preferred language (hs_language) | enum | Communication language |
| Persona (hs_persona) | enum | Buyer persona assignment |
| Lifecycle stage (lifecyclestage) | enum | Subscriber, Lead, MQL, SQL, Opportunity, Customer, Evangelist, Other; customizable |
| Lead status (hs_lead_status) | enum | Position within buying cycle as a lead (New, Open, In Progress, Open Deal, Unqualified, Attempted to Contact, Connected, Bad Timing by default) |
| Contact owner (hubspot_owner_id) | user | Assigned owner |
| Owner assigned date (hubspot_owner_assigneddate) | datetime | |
| HubSpot team (hubspot_team_id) | enum | Main team of owner |
| Shared teams / Shared users | enum | Extra record-level access grants |
| Contact unworked? | bool | Owner has not engaged yet |
| HubSpot score (hubspotscore) | score | Manual lead scoring output |
| Likelihood to close | number | Predictive AI score: probability of becoming customer in 90 days |
| Contact priority | enum | Predictive tiering into four tiers (very high to low) |
| Legal basis for processing contact's data | enum | GDPR |
| Marketing contact status | enum | Marketing vs non-marketing (billing tier) |
| Marketing contact status source type / source name | enum | What set the status |
| Marketing contact until next update | bool | Scheduled downgrade flag |
| Enrichment opt out / opt out timestamp | bool / datetime | Breeze enrichment controls |
| Has been enriched | bool | |
| Currently enrolled in prospecting agent | bool | Breeze AI agent |
| Prospecting agent last enrolled / total enrolled count | datetime / number | |
| Brands | enum | Multi-brand accounts |
| Message | text | Default form comments field |
| Member email | text | Private content membership |
| Record ID (hs_object_id) | number | Immutable unique id |
| Merged Contact IDs | text | IDs merged into this record |
| Create date (createdate) | datetime | |
| Created by user ID | number | |
| Updated by user ID | number | |
| Last modified date (lastmodifieddate) | datetime | Any property change |
| Record Source + Record Source Detail 1/2/3 | enum/text | How record was created, 3 drill-down levels |
| Date of first engagement / Description / ID / Type of first engagement | datetime/text | First owner engagement telemetry |
| Lead response time | number | Creation to first qualifying engagement |
| Time between contact creation and deal creation | number | |
| Time between contact creation and deal close | number | |

#### Contact activity + sales engagement

| Property | Type | Notes |
|---|---|---|
| Last activity date (notes_last_updated) | datetime | Any logged note/call/email/meeting/message/chat |
| Last contacted (notes_last_contacted) | datetime | Outbound touches only |
| Last engagement date | datetime | Opens, clicks, revisits, bookings, form submits |
| Next activity date | datetime | Upcoming scheduled activity |
| Number of sales activities | number | |
| Number of times contacted (num_contacted_notes) | number | |
| Currently in sequence | bool | Sales sequence enrollment |
| Last sequence enrolled / enrolled date / ended date | id / datetime | |
| Number of sequences enrolled | number | |
| Recent sales email opened / clicked / replied date | datetime | 1:1 email engagement |
| Date of last meeting booked in meetings tool | datetime | |
| Campaign / Medium / Source of last booking in meetings tool | text | UTM attribution of meeting booking |
| Last NPS survey rating / comment / date | number/text/datetime | Feedback tool |

#### Email (marketing) engagement

| Property | Type | Notes |
|---|---|---|
| Marketing emails delivered / opened / clicked / bounced | number | Lifetime counters |
| First marketing email send / open / click / reply date | datetime | |
| Last marketing email send / open / click / reply date | datetime | |
| Last marketing email name | text | |
| Sends since last engagement | number | Graymail suppression input |
| Unsubscribed from all email | bool | |
| Opted out of email: [subscription type] | bool | One per subscription type |
| Marketing email confirmation status | enum | Double opt-in state |
| Invalid email address | bool | |
| Email hard bounce reason | text | |
| Email address quarantined | bool | Anti-abuse |

#### Web analytics history (hs_analytics_*)

| Property | Type | Notes |
|---|---|---|
| Original Traffic Source (hs_analytics_source) | enum | Organic search, Paid search, Email, Social, Referrals, Other campaigns, Direct, Offline |
| Original Traffic Source drill-down 1 / 2 (hs_analytics_source_data_1/2) | text | e.g. campaign, keyword |
| Latest Traffic Source (hs_latest_source) | enum | Same taxonomy, most recent session |
| Latest Traffic Source drill-down 1 / 2 | text | |
| Latest Traffic Source Date | datetime | |
| First page seen (hs_analytics_first_url) | text | |
| Last page seen (hs_analytics_last_url) | text | |
| First referring site (hs_analytics_first_referrer) | text | |
| Last referring site (hs_analytics_last_referrer) | text | |
| Number of page views (hs_analytics_num_page_views) | number | Lifetime |
| Number of sessions (hs_analytics_num_visits) | number | |
| Average page views (hs_analytics_average_page_views) | number | Per session |
| Number of event completions (hs_analytics_num_event_completions) | number | |
| Event revenue (hs_analytics_revenue) | number | |
| Time first seen / Time last seen | datetime | First/last pageview |
| Time of first session / Time of last session | datetime | |
| First touch converting campaign / Last touch converting campaign | id | Campaign attribution |

#### Conversion information

| Property | Type | Notes |
|---|---|---|
| First conversion (first_conversion_event_name) | text | First form submitted (page + form name) |
| First conversion date | datetime | |
| Recent conversion (recent_conversion_event_name) | text | Last form submitted |
| Recent conversion date | datetime | |
| Number of form submissions (num_conversion_events) | number | Includes scheduling pages |
| Number of unique forms submitted (num_unique_conversion_events) | number | |
| Google ad click ID (hs_google_click_id / gclid) | text | Paid attribution |
| Facebook click ID (hs_facebook_click_id / fbclid) | text | |
| IP city / IP country / IP country code / IP state/region / IP state code / IP timezone | text | Geo from last-seen IP |

#### Deal rollups on contact

| Property | Type | Notes |
|---|---|---|
| Buying role (hs_buying_role) | enum (multi) | Blocker, Budget Holder, Champion, Decision Maker, End User, Executive Sponsor, Influencer, Legal & Compliance, Other |
| Close date (closedate) | datetime | Date became Customer |
| Days to close | number | Create to customer |
| First deal created date | datetime | |
| Number of associated deals (num_associated_deals) | number | |
| Recent deal amount / Recent deal close date | number / datetime | Last closed-won |
| Total revenue (total_revenue) | number | Sum of closed-won deals |

#### Lifecycle-stage timestamps (auto-generated per stage)

| Property | Type | Notes |
|---|---|---|
| Date entered [stage] (hs_date_entered_*) | datetime | One per lifecycle stage |
| Date exited [stage] (hs_date_exited_*) | datetime | |
| Latest time in [stage] | number (sec) | |
| Cumulative time in [stage] | number (sec) | |

#### Ads-sourced properties (lead ad forms)

Date of birth, Gender, Marital status, Relationship status, Military status, Work email, Job function, Seniority, Company size, Degree, Field of study, School, Start date, Graduation date.

#### Private content / membership

Domain to which registration email was sent, Email confirmed, Membership notes, Registered at, Status, Time registration email was sent.

Contact total: ~170 distinct default properties (before per-stage and per-subscription expansions).

### 1.2 Company default properties (~97)

#### Company information

| Property | Type | Notes |
|---|---|---|
| Company name (name) | text | |
| Company domain name (domain) | text | Primary dedupe key; drives enrichment |
| Website URL (website) | text | |
| Description (description) | text | Mission/goals statement |
| About us (about_us) | text | Short description |
| Quick context | rich text | Free-form notes property |
| Industry (industry) | enum | HubSpot Insights taxonomy |
| Industry group | enum | Second-tier classification |
| Type (type) | enum | Prospect, Partner, Reseller, Vendor, Other (relationship to you) |
| Annual revenue (annualrevenue) | number | Actual or estimated |
| Revenue range | enum | Bucketed estimate |
| Total money raised (total_money_raised) | number | |
| Is public (is_public) | bool | Publicly traded |
| Year founded (founded_year) | number | |
| Number of employees (numberofemployees) | number | |
| Employee range | enum | Bucketed |
| Web Technologies (web_technologies) | enum (multi) | Tech stack detected |
| Phone number (phone) | phone | |
| Street address (address) / Street address 2 (address2) | text | |
| City (city) / State/Region (state) / State/Region Code | text | |
| Postal code (zip) / Country/Region (country) / Country/Region code | text | |
| Time zone (timezone) | text | |
| Lifecycle stage (lifecyclestage) | enum | Same taxonomy as contacts |
| Lead status (hs_lead_status) | enum | Sales/prospecting status |
| Ideal Customer Profile Tier (hs_ideal_customer_profile) | enum | Tier 1/2/3 ICP fit |
| Target account (hs_is_target_account) | bool | ABM flag |
| Owner (hubspot_owner_id) | user | |
| Owner assigned date | datetime | |
| Owner's main team | enum | |
| Shared teams / Shared users | enum | |
| Parent company (hs_parent_company_id) | id | Company hierarchy |
| Number of child companies | number | |
| Brands | enum | |
| LinkedIn company page / Linkedin handle / LinkedIn bio | text | |
| Facebook company page / Facebook fans | text / number | |
| Twitter handle / Twitter bio / Twitter followers | text / number | |
| Google Plus page | text | Legacy |
| Record ID (hs_object_id) | number | |
| Merged Company IDs | text | |
| Create date (createdate) | datetime | |
| Created by user ID / Updated by user ID | number | |
| Last modified date | datetime | |
| Record Source + Detail 1/2/3 | enum/text | |
| Close date (closedate) | datetime | Became customer |
| Has been enriched | bool | |

#### Activity + rollups

| Property | Type | Notes |
|---|---|---|
| Last activity date | datetime | |
| Last contacted | datetime | |
| Last Engagement Date | datetime | |
| Next activity date | datetime | |
| First contact create date | datetime | |
| First deal created date | datetime | |
| Number of associated contacts | number | |
| Number of associated deals | number | |
| Number of open deals | number | |
| Recent deal amount / Recent deal close date | number / datetime | |
| Total revenue | number | All closed-won deals |
| Days to close | number | |

#### Analytics + conversion (aggregated from associated contacts)

| Property | Type | Notes |
|---|---|---|
| Original Traffic Source + drill-down 1/2 | enum/text | From earliest-activity contact |
| Latest Traffic Source + data 1/2 + Date | enum/text/datetime | From most recent contact session |
| First touch / Last touch converting campaign | id | |
| Number of page views / Number of sessions | number | Summed across contacts |
| Time first seen / Time last seen | datetime | |
| Time of first session / Time of last session | datetime | |
| First conversion + date | text/datetime | Any associated contact |
| Recent conversion + date | text/datetime | |
| Number of form submissions | number | All associated contacts |

#### Lifecycle-stage timestamps

Date entered [stage], Date exited [stage], Latest time in [stage], Cumulative time in [stage] - auto-generated per lifecycle stage, same as contacts.

Company total: ~97 default properties before per-stage expansion.

### 1.3 Deal default properties (~75)

#### Deal information

| Property | Type | Notes |
|---|---|---|
| Deal name (dealname) | text | |
| Deal stage (dealstage) | enum | Pipeline-scoped stages; each stage carries a win probability |
| Pipeline (pipeline) | enum | Determines available stages |
| Deal owner (hubspot_owner_id) | user | |
| Deal type (dealtype) | enum | New Business / Existing Business by default |
| Deal description (description) | text | |
| Deal probability (hs_deal_stage_probability) | number | Stage-derived probability |
| Forecast probability (hs_forecast_probability) | number | Rep-set custom % |
| Forecast amount (hs_forecast_amount) | number | Amount x forecast probability |
| Forecast category (hs_manual_forecast_category) | enum | Not forecasted, Pipeline, Best case, Commit, Closed won |
| Weighted amount | number | Amount x stage probability |
| Deal score | number | HubSpot AI deal-health score |
| Priority (hs_priority) | enum | Low/Medium/High |
| Next step (hs_next_step) | text | Rep-maintained free text |
| Deal tags | enum (multi) | Tag ids |
| Deal collaborator | user (multi) | Non-owner participants |
| Deal split added | bool | Commission splits between users |
| Close date (closedate) | datetime | Expected or actual |
| Create date (createdate) | datetime | |
| Closed won reason / Closed lost reason | text/enum | |
| Is Closed Won / Is closed lost | bool | Computed from stage |
| Deal Status | enum | Won / Lost / Open (reporting) |
| Closed amount | number | Amount when closed-won (reporting) |
| Days to close | number | Create date to close date |
| HubSpot team | enum | Owner's primary team |
| Shared teams / Shared users | enum | |
| Brands | enum | |
| Number of associated contacts | number | |
| Next Meeting ID / Name / Start Time | id/text/datetime | |
| Latest Approval Status | enum | Deal approvals feature |
| Record ID / Merged Deal IDs | number/text | |
| Created by / Updated by user ID | number | |
| Last modified date | datetime | |
| Record Source + Detail 1/2/3 | enum/text | |
| Owner assigned date | datetime | |

#### Deal revenue (amount variants)

| Property | Type | Notes |
|---|---|---|
| Amount (amount) | number | Total value in deal currency |
| Amount in company currency (amount_in_home_currency) | number | Multi-currency conversion |
| Currency (deal_currency_code) | enum | |
| Exchange rate | number | Snapshot used for conversion |
| Annual contract value (hs_acv) | number | 12-month value |
| Annual recurring revenue (hs_arr) | number | |
| Monthly recurring revenue (hs_mrr) | number | |
| Total contract value (hs_tcv) | number | From associated line items |
| Recurring revenue amount | number | Recurring-revenue tracking feature |
| Recurring revenue deal type | enum | New business, Renewal, Upgrade, Downgrade |
| Recurring revenue date | datetime | Churn date (revenue stops) |
| Recurring revenue inactive reason | enum | |

#### Deal activity

| Property | Type | Notes |
|---|---|---|
| Last activity date | datetime | |
| Last contacted | datetime | |
| Next activity date | datetime | |
| Number of Sales Activities | number | |
| Number of times contacted | number | |
| Date of last meeting booked in meetings tool | datetime | |
| Campaign / Medium / Source of last booking in meetings tool | text | UTM |

#### Stage timing + AI

| Property | Type | Notes |
|---|---|---|
| Date entered current stage | datetime | |
| Time in current stage | number | |
| Date entered [stage id] / Date exited [stage id] | datetime | Per pipeline stage |
| Latest time in [stage id] / Cumulative time in [stage id] | number | Per pipeline stage |
| Average Deal Owner Duration In Current Stage | number | Owner's closed-won average for this stage |
| Is Stalled After Timestamp | datetime | Set when time-in-stage exceeds owner's closed-won average by 20% - powers deal "stalled" flags |

#### Analytics (from associated contacts)

Original Traffic Source + drill-downs 1/2, Latest Traffic Source + drill-downs 1/2 + Date.

Deal total: ~75 default properties before per-stage expansion.

### 1.4 Ticket default properties (~56)

| Property | Type | Notes |
|---|---|---|
| Ticket name (subject) | text | Short summary |
| Ticket description (content) | text | |
| Pipeline (hs_pipeline) | enum | |
| Ticket status (hs_pipeline_stage) | enum | Stage within pipeline |
| Priority (hs_ticket_priority) | enum | Low, Medium, High, Urgent |
| Category (hs_ticket_category) | enum | Auto-set by AI |
| Language | enum | Auto-detected by AI |
| Resolution | enum | Action taken to resolve |
| Source (source_type) | enum | Chat, Email, Form, Phone |
| Originating channel type / channel account | enum/text | Connected-channel granularity |
| Outbound ticket | bool | Created from outbound message |
| Owner (hubspot_owner_id) | user | Synced with conversation owner |
| Owner assigned date | datetime | |
| Owner's main team | enum | |
| Assigned teams | enum | Auto-assignment output |
| Shared teams / Shared users | enum | |
| Brands | enum | |
| Create date (createdate) | datetime | |
| Close date (closed_date) | datetime | Auto-set on closed status |
| Last Closed Date | datetime | |
| Record ID / Merged Ticket IDs | number/text | |
| Created by / Updated by user ID | number | |
| Last modified date | datetime | |
| Record Source + Detail 1/2/3 | enum/text | |
| Number of associated companies | number | |
| Number of times contacted | number | |
| Number of Sales Activities | number | |
| Last activity date / Last contacted date | datetime | |
| Next activity date | datetime | |
| Last response date | datetime | Agent or bot |
| First agent email response date | datetime | |
| Last customer reply date | datetime | |
| Time to close | number | |
| Time to first agent email reply | number | |
| Time to first rep assignment | number | |
| Time to first response SLA due date / SLA ticket status / in SLA hours | datetime/enum/number | SLA engine |
| Time to close SLA due date / SLA ticket status / in SLA hours | datetime/enum/number | SLA engine |
| Last CES survey rating / comment / date | number/text/datetime | Customer effort score |
| Date entered / exited [status id], Latest / Cumulative time in [status id] | datetime/number | Per pipeline status |

Ticket total: ~56 default properties before per-status expansion.

### 1.5 Property model observations

- Every object gets the same skeleton: identity fields, owner + team + sharing, Record Source with 3 drill-down levels, created/updated audit, merge lineage, activity rollups (last activity, last contacted, next activity, counts), and per-stage entered/exited/latest/cumulative timestamps auto-generated for every pipeline stage or lifecycle stage.
- Attribution is first + last touch everywhere: Original vs Latest Traffic Source with two drill-down levels each, propagated from contacts up to companies and deals.
- Predictive/AI properties ship as defaults: Likelihood to close, Contact priority, Deal score, Is Stalled After Timestamp, AI-set ticket Category and Language.
- Counters are lifetime-cumulative and write-locked (set by system, not editable).

---

## 2. HUBSPOT FEATURES PER HUB

### 2.1 Sales Hub

Sources: hubspot.com/products/sales, knowledge.hubspot.com (sequences, playbooks, quotes, meetings, calling, forecast docs).

- Sequences: automated 1:1 email + task series; auto-unenroll on reply/meeting; enroll from record, list, or workflow; A/B step testing; send-time recommendations; sequence analytics (open/click/reply/meeting rates per step)
- Templates: reusable 1:1 emails with personalization tokens; usage analytics
- Snippets: short reusable text blocks invoked with # shortcut in emails/notes/chat
- Documents: tracked file links; per-page view analytics; alerts on open
- Meetings scheduler: personal + group + round-robin booking links; embedded calendar pages; UTM-tracked bookings; routing forms
- Calling: in-app VoIP calling, call recording, transcription, logging to record; third-party calling integrations (Aircall etc.)
- Conversation intelligence: AI call transcription, tracked terms, coaching insights on recorded calls
- Playbooks: interactive cards on records (discovery guides, battlecards, qualification scripts) with structured question capture writing back to properties
- Quotes + CPQ: quote generation with line items, e-sign, payments (Section 3)
- Products library + line items: product catalog with price, cost, margin, recurring billing frequency, term
- Deal pipelines: multiple pipelines, drag-and-drop board, stage-probability defaults, required properties per stage (stage-gating), pipeline automation rules per stage
- Deal boards: kanban with inline editing, board cards configurable, deal tags color-coding, stalled-deal flags
- Forecasting: forecast categories, manual forecast submissions with roll-up hierarchy, forecast vs quota tracking, AI forecast (projection based on historical closed-won patterns)
- Goals: rep quotas for revenue, deals created, calls, meetings; team roll-ups
- Prospecting workspace: unified daily queue - tasks, sequences due, meeting outcomes, lead review
- Leads object: dedicated lead-stage object on top of contacts (qualify/disqualify flow, lead pipelines) in prospecting workspace
- Lead scoring: manual score property criteria +/-, plus AI predictive scoring (Likelihood to close, Contact priority)
- Email tracking: open + click notifications in real time; activity feed
- Email scheduling, send-later, and inbox connection (Gmail/Outlook/Exchange 2-way sync)
- Tasks: task queues, sequential task execution mode, task reminders, repeating tasks
- Buyer intent: website-visit intent signals by target account (Breeze Intelligence credits)
- Account-based selling: target accounts home, ICP tier property, buying-role labels on deal-contact associations
- Sales analytics: deal funnels, sales activity reports, rep leaderboards, deal change history reports, waterfall + pipeline snapshot reports
- Approvals: deal/quote approval workflows (Latest Approval Status property)
- Commission/deal splits: split deal credit between users
- Multi-currency: per-deal currency + exchange-rate table
- Breeze AI: prospecting agent (auto-research + auto-outreach), AI email drafting, record summarization, guided actions

### 2.2 Marketing Hub

- Marketing email: drag-and-drop editor, smart content (per list/lifecycle/device), personalization tokens, A/B testing, AI subject line + body generation, send-time optimization, automated (workflow-sent) emails, RSS emails
- Subscription types + preference center; double opt-in; GDPR consent capture
- Forms: standalone/embedded/pop-up forms, progressive fields, dependent fields, hidden fields, non-HubSpot form tracking, form follow-up emails
- Landing pages: template marketplace, drag-and-drop editor, smart content, adaptive (AI) testing
- Website pages + blog + hosting (CMS features bundled at Pro+)
- CTAs: pop-ups, banners, embedded buttons with per-CTA analytics
- Campaigns: umbrella object tying emails, forms, ads, social, workflows, assets; campaign-level attribution reporting, budget vs actual spend tracking, campaign calendar
- Ads: Google/Facebook/LinkedIn account sync, ad audience sync (from lists), lead-ad form sync into contacts, ad conversion events, ROI reporting down to contact level
- Social: publishing + scheduling to LinkedIn/Facebook/Instagram/X, social monitoring streams, social reports
- SEO: topic clusters + pillar pages, on-page SEO recommendations, integration with Search Console
- SMS marketing (add-on): 1:many SMS sends, opt-out handling, SMS in workflows
- Marketing events object: webinar integrations (Zoom etc.), attendance properties
- Lists: active (dynamic) + static lists; list membership as trigger everywhere; AND/OR filter builder across any object/activity/behavior
- Behavioral events: custom tracked events (Enterprise), event-based triggers
- Lead scoring: score properties; predictive scoring
- Attribution reporting: multi-touch revenue attribution models (first touch, last touch, linear, U-shaped, W-shaped, full path, J-shaped), contact-create and deal-create attribution
- ABM tools: target accounts, ICP tiers, account overview
- Buyer intent + enrichment via Breeze Intelligence credits
- Customer journey analytics (Enterprise): multi-step funnel visualization
- Marketing SMS + WhatsApp channels in workflows
- Breeze AI: content agent (blog/landing page/email generation), AI images, content remix, social post generation

### 2.3 Service Hub

- Help desk workspace: unified ticket queue across channels (email, chat, messenger, WhatsApp, SMS, calling, forms), real-time ticket list with SLA countdowns
- Conversations inbox: shared team inbox, chatflows (live chat + bots), round-robin conversation routing
- Tickets: multiple pipelines, automation per status, ticket splitting/merging
- SLAs: first-response and time-to-close SLA rules by priority/pipeline, working-hours aware, SLA status properties + breach reporting
- Knowledge base: versioned articles, categories, per-article analytics, search analytics, multi-language article variants
- Customer portal: ticket portal for end customers (view/reply to their tickets), SSO/membership auth
- Feedback surveys: NPS, CSAT, CES (post-support), and custom surveys; email/link/web delivery; survey-triggered workflows
- Customer success workspace (seats): book of business per CSM, account health scores, usage signals, renewal pipeline
- Customer agent (Breeze AI): AI chat agent answering from knowledge base + content, handoff to human
- Coaching + QA: conversation intelligence on support calls
- Recurring services / scheduling: meetings links for support
- Reporting: ticket volume, resolution time, agent performance, CSAT dashboards, SLA attainment

### 2.4 Operations Hub (now largely folded into Data Hub naming)

- Data sync: 2-way, real-time sync with 100+ apps, field mapping, filtered sync, historical sync
- Data quality command center: duplicate detection (AI), formatting-issue detection (names, phones), property monitoring
- Bulk data automations: fix formatting in workflows (Format data action)
- Programmable automation: Custom code workflow actions (JavaScript/Python), webhooks in workflows
- Scheduled workflow triggers (cron-like)
- Datasets (Enterprise): curated, calculated field collections for reporting
- Snowflake data share (Enterprise)
- Custom report builder across all objects + events
- Data model overview tool; custom objects (Enterprise)
- AI data agents: research agent, custom prompt agent, smart properties (auto-filled AI properties)

### 2.5 Workflows engine (cross-hub automation)

Source: https://knowledge.hubspot.com/workflows/choose-your-workflow-actions

Workflow object types: contact, company, deal, ticket, quote, conversation, feedback submission, subscription, payment, invoice, lead, custom object, goal - plus scheduled and event-based.

Enrollment trigger types:
- Filter criteria met (property values, list membership, form submissions, page views, email engagement, ad interactions, event completions, association properties)
- Event occurred (behavioral event, email open/click, form submit, ad click, call logged, etc.)
- Schedule (recurring date/time trigger)
- Webhook received (Operations Hub)
- Manual enrollment (from record, from list, from another workflow Go-to)
- Re-enrollment rules per trigger

Action catalog (full list):

| Category | Actions |
|---|---|
| Delay | Set amount of time; Until a date property; Until a calendar date; Until event occurs; Until day(s) of week; Until time of day |
| Branch | If/then based on single property or action output (value-equals branching, up to 250 branches); AND/OR filter-criteria branches; Random split by percentage |
| Go-to | Go to another action (jump); Go to another workflow |
| Communications | Send marketing email (automated); Send internal email notification; Send in-app notification; Send internal marketing email; Enroll in sequence; Unenroll from sequence; Send survey; Send WhatsApp message; Send SMS; Assign conversation owner |
| CRM | Create record (contact/company/deal/ticket/lead/custom); Edit record (set/copy/clear property); Increase or decrease property value; Create task; Create note; Add line item to deal; Delete contact; Rotate record to owner; Rotate conversation owners; Manage communication subscriptions; Validate and format phone number; Enrich record; Create associations; Apply / Update / Remove association labels; Edit or create record in another account; Track / Stop tracking intent signals |
| AI (Breeze) | Data agent custom prompt; Data agent research; Fill smart property; Summarize record; Infer value prop + ICP; Enroll/unenroll in prospecting agent; Assign to customer agent; Use a custom LLM |
| Marketing | Add/remove from ads audience; Add to campaign; Add/remove from static list; Set marketing contact status; Add participant to marketing event |
| Data ops | Custom code (JS); Format data; Send webhook |
| Connected apps | Slack notification; Create Slack channel; Google Chat notification; Zoom webinar registration; Asana task; Trello card; Salesforce task; Salesforce campaign; NetSuite sales order; DocuSign template send |

Workflow management features: goal criteria (auto-unenroll + conversion reporting), suppression lists, unenrollment triggers, action logs, per-action metrics, version history, folder organization, health monitoring (at-risk workflows), test mode, copy-to-other-object.

---

## 3. HUBSPOT QUOTE PROCESS (end to end)

Sources: https://knowledge.hubspot.com/quotes/create-and-send-quotes , /quotes/set-up-quotes , /quotes/create-quote-templates , /quotes/manage-quotes , /cpq/getting-started-with-hubspot-cpq

### 3.1 Setup (admin)

- Quote settings: branding/brand kits, sender email addresses, default payment terms, default expiration period
- Quote templates: reusable module layouts + default content; template-level branding (logo, colors)
- Quote approvals: require approval when conditions met (e.g. discount threshold); approvers get notification, can approve/reject with comments
- Products library feeds line items (SKU, price, cost, billing frequency, term)

### 3.2 Quote creation entry points

Deal record, quotes index (Commerce > Quotes), Breeze Assistant, or a workflow action. Deal owner becomes quote owner; creator is the quote sender.

### 3.3 Quote editor modules and fields

| Module | Fields / options |
|---|---|
| Header | Logo (brand kit or upload); quote reference + editable label; issue date; expiration date; currency label; optional PO number (with buyer-editable toggle) |
| Parties | Seller (name, phone, company); Buyer (1+ contacts + company, required); Bill To (separate billing contact/company, address, up to 3 tax IDs) |
| Cover letter / exec summary | Title; rich text (Breeze AI assist); up to 10 attachments (PDF/DOC/DOCX, 40MB), each optionally "in signing" (part of the signed packet) |
| Summary | Effective date (on agreement / custom / delayed start); term length (auto-calculated); total discount (amount, %, or both); total contract value |
| Line items | Product from library or custom; quantity; unit price; tiered pricing display; per-line billing start date (effective date / custom / delayed); per-line tax rate or automated sales-tax category; unit discount (% or currency); ramp pricing via staggered billing dates; table columns configurable (up to 7 columns, more properties as rows) |
| Terms | Title; rich text (AI assist); attachments with "in signing" option |
| Payments - billing | Enable billing toggle; payment terms (due on receipt / net terms); automatic vs manual collection |
| Payments - payment methods | Accept online payments toggle; method checkboxes (credit card, ACH); processing-fee pass-through checkboxes; collect billing address; collect shipping address; store payment method for future charges |
| Acceptance | Title + description; method = Print and sign (buyer + countersigner), E-signature (buyer signer(s), reassignment permission, countersigner), or Accept without signature (acceptance requested from chosen contacts) |
| Closing agent | Breeze AI agent embedded in the buyer-facing quote page; answers buyer questions from uploaded knowledge files; knowledge-score indicator |
| Settings | Language; locale (date/address formatting); password protection |

### 3.4 Publish, send, accept

1. Optional approval gate: Request approval with note; quote locked until approved.
2. Share: finalizes quote to Shared status. Distribution: copy link, download PDF, or send quote email (To auto-populated, up to 9 Cc, From personal/team email, subject, template, documents/meeting links/snippets, rich message).
3. Buyer flow: optional password; Accept quote button; full-name confirmation; e-sign flow if enabled; Set up payment button if payments enabled.
4. Statuses: Draft > Pending approval > Approved > Shared/Published > Accepted (or Expired / Voided / Archived / Recalled).
5. Post-acceptance automation: contract record creation, invoice/subscription generation, automatic charging on billing dates.
6. Management: filter, countersign, recall, archive, void, delete, mark as signed, export; quote activity tracking + reports; up to 10 file attachments per quote.

Signals for Rally: the quote is a live web page, not a PDF - with an embedded AI agent, payments, and e-sign in one artifact, and every event (view/accept/sign/pay) written back to the deal timeline.

---

## 4. PIPEDRIVE

Sources: https://support.pipedrive.com/en/article/data-fields-in-pipedrive , /en/article/import-fields , /en/article/deal-detail-view , /en/article/what-types-of-custom-fields-are-there , /en/article/required-fields , /en/article/important-fields , https://www.pipedrive.com/en/features , https://developers.pipedrive.com/docs/api/v1/DealFields

Field model: three tiers - Default fields (pre-built, name/type locked, cannot delete), System fields (system-generated: add time, counts of emails exchanged, etc., read-only), Custom fields (user-created, count limited by plan). Person, organization, and product type fields are always required when used. Deal/lead defaults are grouped under a "summary" field group.

### 4.1 Deal default + system fields

| Field | Type | Notes |
|---|---|---|
| Title | text | Required (API: title) |
| Value | monetary | Numeric value + separate ISO currency code field |
| Currency | enum | Paired with value |
| Pipeline | enum | Required; determines stages |
| Stage | enum | Required (stage_id); each stage has name, win probability, rotting-days threshold |
| Status | enum | open / won / lost / deleted |
| Probability | number | Deal-level %; overrides stage probability when enabled |
| Expected close date | date | Drives forecast placement |
| Label | enum | Color-coded deal label(s) |
| Owner | user | |
| Contact person | person link | |
| Organization | org link | |
| Source / channel + origin | enum | Where the deal came from (lead conversion, API, import, chatbot, web form...) |
| Lost reason | text/enum | Prompted on marking lost; can be standardized list |
| Won time / Lost time / Close time | datetime | System-set |
| Add time (created) / Update time | datetime | System |
| Next activity date / Last activity date | datetime | System rollups |
| Total activities / Done activities | number | System counters |
| Email messages count | number | System counter |
| Products quantity / count | number | From attached products (line items) |
| Weighted value | monetary | Value x probability (pipeline weighted view) |
| Deal rotting indicator | flag | Deal turns red after N inactive days per stage |
| Visible to | enum | Visibility group (owner only / owner's group / entire company) |
| Followers | users | Multi-user watch list |
| Participants | persons | Additional people on the deal |
| Deal score (AI) | number | AI win-likelihood scoring on newer plans |

### 4.2 Lead fields (Leads Inbox)

Same core shape as deals before conversion: Title, Value + currency, Expected close date, Owner, Label (Hot/Warm/Cold color labels), Source (Prospector, chatbot, live chat, web form, manual, import, API), linked Person + Organization, Note, Add time, Next activity, Archived flag, Visible to. Leads convert 1-click to deals carrying fields across.

### 4.3 Person default + system fields

| Field | Type | Notes |
|---|---|---|
| Name | text | First + last (splittable) |
| Email | email (multi) | Labels: work / home / other |
| Phone | phone (multi) | Labels: work / home / mobile / other; click-to-call |
| Organization | org link | |
| Label | enum | Color label |
| Owner | user | |
| Marketing status | enum | Subscribed / unsubscribed / bounced / archived (Campaigns consent) |
| Birthday, Job title, Notes, Instant messenger, Postal address | various | Appear after contact sync is enabled (per data-fields article) |
| Picture | image | |
| Visible to | enum | Visibility group |
| Add time / Update time | datetime | System |
| Next / Last activity date | datetime | System |
| Open deals / Won deals / Lost deals counts | number | System rollups |
| Total activities / Email messages count | number | System |
| Followers | users | |

### 4.4 Organization default + system fields

| Field | Type | Notes |
|---|---|---|
| Name | text | Required |
| Address | address | Default field; Google Maps autocomplete with parsed sub-fields (street, city, state, country, zip, lat/long) |
| Label | enum | |
| Owner | user | |
| Website, LinkedIn profile, Industry, Annual revenue, Number of employees | text/number | Importable org fields (per import-fields article; populated by Smart Contact Data enrichment) |
| People count | number | System |
| Open deals / Won / Lost deal counts | number | System |
| Add / Update time, Next / Last activity | datetime | System |
| Visible to | enum | |
| Followers | users | |
| Related organizations | relation | Parent/child/related org linking |

### 4.5 Product fields

Name, Product code, Category, Description, Unit, Tax %, Price (per currency - multi-currency price list), Cost, Direct cost, Billing frequency (one-time / recurring), Owner, Active flag, Visible to. When attached to a deal: quantity, item price, discount (% or amount), tax, sum, billing start date, revenue schedule for recurring.

### 4.6 Activity fields

Subject, Type (Call, Meeting, Task, Deadline, Email, Lunch + custom activity types with icons), Due date, Due time, Duration, Assigned to (user), Done checkbox, Note, Description (calendar body), Location, Free/busy setting, Video call link (Zoom/Meet/Teams), Guests (attendees), linked Deal or Lead or Project, linked Person + Organization. Calendar 2-way sync; activities are THE unit of Pipedrive's activity-based selling methodology (always schedule the next activity; UI nags when a deal has no next activity).

### 4.7 Pipeline mechanics

- Multiple pipelines; per-stage: name, probability %, rotting days
- Kanban pipeline view with drag-and-drop between stages; deal cards show title, value, person/org, expected close date, next-activity status icon (green scheduled / yellow due / red overdue / gray none)
- Weighted view toggle: pipeline totals by value x probability
- Deal rotting: card turns red after stage-specific inactivity window
- Required fields (admin rule): make any field required when a deal enters a stage or is marked won/lost
- Important fields: per-pipeline, per-stage "please fill this" prompts surfaced in the summary
- Stage-change automation triggers; changelog audit of every field change
- Forecast view: deals grouped by expected close month, with weighted totals
- Revenue projection + subscription/recurring revenue tracking on deals

### 4.8 Pipedrive feature checklist

| Area | Features |
|---|---|
| Automations | Visual trigger > condition > action workflows; delayed steps; email sending steps; sequence templates; automation on deal/person/org/activity/lead events; webhooks + open API |
| Insights | Custom dashboards; deal conversion/velocity/duration reports; activity reports; revenue forecast reports; goals (deals started/progressed/won, revenue, activities) per user/team/pipeline; AI report generation (type what you need, 15+ prompts); dashboard sharing links |
| LeadBooster add-on | Chatbot (site widget, qualifying playbooks), Live Chat, Prospector (B2B contact database with credits), Web Forms (shareable/embeddable forms feeding leads) |
| Web Visitors add-on | Reveal companies visiting your site, pages viewed, source |
| Smart Docs | Quote/proposal/contract documents from Google Docs/Slides/Sheets or PDF templates; deal-field merge tags; shared link tracking (open notifications); e-signatures; templates gallery; removes Pipedrive branding on higher plans |
| Projects add-on | Post-sale project boards (phases), tasks + subtasks, project templates, linked to deals/people/orgs |
| Campaigns add-on | Email marketing: drag-drop builder, segmentation by any Pipedrive field, engagement analytics, marketing consent statuses |
| Email | 2-way email sync; Smart BCC drop-box address; templates with merge fields; open + click tracking; scheduled send; group emailing; email-to-deal auto-linking |
| Scheduler | Booking links from availability; proposes times; syncs to activities |
| Caller | Built-in web calling on higher tiers; call recording; call logged as activity; mobile app calling |
| AI | AI Sales Assistant (next-best-action recommendations, win-probability signals, anomaly alerts); AI email writer + thread summarizer; AI-powered app recommendations; deal summarization |
| Data tools | Merge duplicates; bulk edit; import wizard with field mapping; export; Smart Contact Data enrichment (one-click person/org enrichment from web) |
| Platform | Marketplace (400+ apps); visibility groups; permission sets (admin/regular + custom); teams; multi-currency; SSO + 2FA + security center (login audit, device log, alert rules); mobile apps with offline, Focus View, nearby-clients map |

Custom field types (16): Text, Large text, Single option, Multiple options, Autocomplete, Numerical, Monetary, User, Organization, Person, Phone, Time, Time range, Date, Date range, Address. Numerical + Monetary support formula fields (Premium+ plans). Source: https://support.pipedrive.com/en/article/what-types-of-custom-fields-are-there

---

## 5. CLOSE + ATTIO

### 5.1 Close - object model

Sources: https://developer.close.com/api/resources/leads , https://help.close.com/docs/opportunities , https://help.close.com/docs/custom-fields , https://www.close.com/features

Model: LEAD-centric. A Lead = the company/account container. Contacts, Opportunities, Tasks, and all Activities nest under the Lead. "Leads are the most important object in Close" (developer.close.com).

Lead fields (per Close API):

| Field | Type | Notes |
|---|---|---|
| name / display_name | text | Company name |
| status_id / status_label | enum | Lead status; small editable status list (e.g. Potential, Bad Fit, Qualified) |
| description | text | |
| url | text | Company website |
| addresses[] | array | label, address_1, address_2, city, state, zipcode, country |
| contacts[] | array | Nested contact objects (below) |
| opportunities[] | array | Nested opportunity summaries |
| tasks[] | array | Open tasks |
| custom.FIELD_ID | any | Custom fields inlined on the lead |
| integration_links | array | Deep links to external tools |
| created_by / updated_by, date_created / date_updated | audit | |
| html_url, organization_id, id | system | |

Contact fields (nested): name, title, emails[] (type: office/home/other + address), phones[] (type: office/mobile/home/direct/fax/other + number), urls[], contact-level custom fields, date_created/updated.

Opportunity fields (help.close.com/docs/opportunities): Status (defaults: Demo Completed, Contract Sent, Proposal Sent, Won, Lost - customizable), Confidence (% likelihood; Expected Value = Value x Confidence), Value (one-time OR recurring monthly - annualized views), Estimated Close date (becomes won date), Contact (specific person on the lead), User (owner), Comments/Notes, file attachments, custom fields. Pipelines: multiple, segmented by product line or process; per-pipeline funnels + forecasting.

Custom fields: on Leads, Contacts, Opportunities, and Custom Activities; types include text, number, date, datetime, choices (single/multi), user, contact reference; shared custom-field schemas reusable across objects; per-field edit permissions. Custom Objects (newer) + Custom Activities (structured activity types with their own fields, e.g. "Demo held" with outcome fields).

### 5.2 Close - standout features (calling-first workflow)

| Area | Features |
|---|---|
| Calling | Built-in global calling; Power Dialer (auto-dials through a Smart View list); Predictive Dialer (multi-line, connects on human answer); call recording; voicemail drop (pre-recorded); call coaching = listen / whisper / barge; local presence numbers; call forwarding; transfers; custom caller ID |
| Email | Built-in 2-way sync; templates; open tracking; send later; bulk email a Smart View; undo send |
| SMS | Built-in SMS send/receive, templates, bulk SMS, SMS in workflows |
| Workflows (sequences) | Multichannel cadences mixing email + call + SMS steps with delays; auto-enroll via Smart View criteria; pause on reply/meeting; team-shared |
| Smart Views | Saved dynamic queries over leads/contacts (powerful search query language on any field/activity, e.g. calls fewer than 3 AND status Potential AND not contacted in 7 days); function as shared work queues; drive Power Dialer + bulk actions |
| Inbox | Unified personal queue: due tasks, missed calls, unanswered emails/SMS, reminders - zero-out workflow |
| Pipeline | Opportunity kanban + funnel reports; per-user and per-pipeline forecasting; expected-value math baked in |
| Reporting | Activity Comparison report (calls/emails/SMS per rep per period), Status Change report, Funnel report, Explorer; leaderboards |
| AI (Chloe) | Auto-calls new inbound leads within minutes; AI lead qualification conversations; meeting booking; call summaries + transcripts + action items; suggested next steps; cold-lead re-engagement; automatic deal-stage updates from activity |
| Data | Contact enrichment from LinkedIn/web; dedupe; import; API + 60+ integrations (Zapier, Gmail, Zoom, WhatsApp, HubSpot...) |
| UX | Keyboard-first, minimal-click design; every call/email/SMS logged automatically; built for high-volume outbound teams |

### 5.3 Attio - data model

Sources: https://attio.com/help/reference/managing-your-data/objects/manage-standard-objects , /help/reference/attio-101/attios-data-model/understanding-attio-data-model , /help/reference/managing-your-data/attributes/create-manage-attributes , https://docs.attio.com/docs/objects-and-lists

Model: fully flexible. Standard objects: People + Companies (on by default), Deals, Users, Workspaces (opt-in; Users/Workspaces model YOUR product's users for PLG motions). Custom objects freely creatable. Records live on objects; LISTS are curated subsets (e.g. "Q3 pipeline", "Fundraising") that can hold records from any object and carry their own list-scoped attributes; VIEWS are saved table/kanban configurations on objects or lists.

People system attributes: Record ID; Email addresses (unique, drives enrichment); Company (auto-linked by domain); Job title (enriched); Phone numbers; Description (enriched); Primary location (enriched); Facebook / LinkedIn / Twitter / AngelList / Instagram handles (enriched); Twitter follower count (enriched); First interaction (when + with); Last interaction (when + with); Next interaction (when + with); Connection strength; Strongest connection; Associated deals; Associated users; List entries; Next due task; Created at; Created by. Interaction + connection attributes are computed from synced email/calendar and are not editable.

Company system attributes: Record ID; Domains (unique, enrichment key); Name (enriched); Team (people auto-linked by email domain); Description (enriched); Categories (enriched multi-select); Primary location (enriched); social handles + Twitter follower count (enriched); Estimated ARR (enriched range); Funding raised (enriched); Foundation date (enriched); Employee range (enriched); First / Last / Next interaction (when + with); Connection strength; Strongest connection; Associated deals; Associated workspaces; List entries; Next due task; Created at; Created by.

Deal system attributes (deliberately minimal - everything else is custom): Record ID; Deal name (required); Deal owner (required); Deal stage (required status attribute, editable stage list, powers kanban); Deal value (currency); Associated company (one); Associated people (many); List entries; Next due task; Created at; Created by.

Users object: Record ID, User ID (required, unique), Primary email address (required, unique), Workspaces (many), Person (one), plus the standard system tail. Workspaces object: Record ID, Workspace ID (required, unique), Name, Users (many), Company (one), plus system tail.

Attribute types: Text (incl. URLs, multiline), Number, Currency (configurable format/decimals), Date, Timestamp (absolute or relative display), Status (required for kanban views), Select / Multi-select (color-coded), Checkbox, Rating (1-5 stars), Record reference (single or multi), Relationship (bidirectional, object-level only), User (workspace member owner/assignee), Location (city/state/country), Phone (validated with country code). Object attributes are workspace-wide; list attributes are list-scoped. Default values supported; required constraint (custom objects); unique constraint (custom objects + Deals/Users/Workspaces, case-sensitive).

### 5.4 Attio - standout features

- Email + calendar sync auto-creates person/company records and computes interaction history retroactively (the CRM fills itself from inbox history on day one)
- Communication intelligence: first/last/next interaction, connection strength, strongest connection - a relationship graph across the whole workspace
- Built-in enrichment for core firmographic/social fields
- Views: table (spreadsheet-grade inline editing) and kanban (any status attribute), per-view filters/sorts/grouping, shareable saved views
- Lists: multiple parallel processes over the same records with list-scoped attributes (the anti-"one pipeline per object" pattern)
- Workflows: visual node-based automation builder (triggers, conditions, branching, delays, record CRUD, Slack/webhook actions, AI prompt blocks)
- Sequences: multi-step email outreach with enrollment from lists/views
- Call intelligence: call recording + AI summaries linked to records
- Reports/dashboards: charts over any object/attribute, funnels + time series
- Real-time multiplayer UX (presence, instant sync), command-K palette, keyboard-first
- Notes (collaborative docs on records), tasks with assignees + due dates
- API-first: objects, attributes, lists, notes, tasks all CRUD-able; webhooks
- Permissions: workspace roles + per-list/object access levels
- Chrome extension + mobile apps; workspace templates gallery

---

## 6. UX PATTERNS WORTH STEALING

### 6.1 Record page layout

- HubSpot three-column record page: LEFT = identity card + configurable "About" property list (admin-curated per team, conditional property visibility); MIDDLE = tabbed activity timeline (Overview / Activities, filter by type + user, pinned items, collapsible cards); RIGHT = association cards (company, deals, tickets, attachments, quotes, playbooks) each with inline create. Admin-customizable record layouts per object AND per team, including custom tabs and embedded report cards.
- Pipedrive detail view: persistent SUMMARY block (deal score, value + products, probability, expected close, person/org) + pipeline PROGRESS BAR across the top showing stage and days-in-stage; FOCUS section (next activities, email drafts, pinned notes) above a filterable HISTORY (notes / activities / emails / files / documents / invoices / changelog). The changelog tab = full field-level audit trail in the UI.
- Close lead page: single scrolling thread of every touch (calls with recordings inline, emails expandable, SMS bubbles) + right rail with contacts and opportunities; built so a rep never leaves the page while dialing.
- Attio record page: left attribute panel (inline-editable, grouped), center timeline of interactions (emails/meetings auto-populated) + notes + tasks; feels like a fast spreadsheet-doc hybrid, not a form.

### 6.2 Views

- Board/kanban: HubSpot deal-board cards are admin-configurable and support stage-gating (required-property modal on drag between stages). Pipedrive cards carry the next-activity status icon (green scheduled / yellow due / red overdue / gray none) - instant "who needs attention" scan. Attio kanban works on ANY status attribute of any object, not just deals.
- Table: Attio sets the bar - true inline editing, bulk edit, column grouping with per-group aggregates. HubSpot index pages: saved views per user + shared views, quick filters + advanced filter panel, board/list toggle.
- Timeline/forecast: Pipedrive forecast view groups deals into close-month columns with weighted totals - a kanban over time instead of stages.
- Queue views: Close Smart Views are executable work queues (feed the dialer, bulk email, sequence enrollment) - a view is not just a report, it is a to-do list.

### 6.3 Association model

- HubSpot association labels: any record-to-record association can carry labels (built-in: Primary company; deal-contact buying roles like Champion / Decision Maker / Budget Holder; plus unlimited custom labels e.g. "Billing contact"). Labels are filterable in lists, usable in workflows (apply/update/remove label actions) and reports. Cardinality: one primary company per contact/deal/ticket; many-to-many everywhere else.
- Company hierarchies: parent/child companies with rollup counts (HubSpot); related organizations (Pipedrive).
- Attio relationship attributes: bidirectional by construction - define once, both sides render; record references can be single or multi with type constraints.
- Close nesting: contacts/opportunities/tasks physically nested inside the lead - one fetch renders the whole account; the trade-off is weak many-to-many.

### 6.4 Activity timeline granularity

- HubSpot logs distinct typed engagements: note, email (tracked / logged / marketing), call (recording + transcript), meeting (with outcome), task, SMS, WhatsApp, LinkedIn message, postal mail, chat/conversation session, form submission, page view, ad interaction, quote event (viewed/signed/paid), payment, playbook submission - each filterable and reportable with its own properties (call outcome, meeting outcome, email open/click).
- Every stage/status change is auto-timestamped into per-stage entered/exited/latest/cumulative properties - stage-velocity reporting needs zero setup.
- Pipedrive separates "what happened" (history) from "what is next" (focus); the empty-next-activity nag is the core behavioral loop of activity-based selling.
- Close auto-logs 100% of calls/emails/SMS with zero manual entry, then builds rep activity-comparison reports on top; the activity IS the data model.
- Attio computes the timeline retroactively from email/calendar sync - a new workspace starts with years of interaction history already populated.

### 6.5 Cross-cutting takeaways for Rally

1. Ship the HubSpot property skeleton on every object from day one: owner, team, record source + 3 source-detail levels, merge lineage, created/updated audit, activity rollups (last/next activity, counts), per-stage timing properties.
2. First-touch AND last-touch attribution as paired defaults (Original vs Latest source, each with 2 drill-down levels), propagated contact > company > deal.
3. Make stage a first-class typed attribute (Attio) so kanban works on anything; auto-generate entered/exited/elapsed timestamps per stage (HubSpot).
4. Views should be executable (Close): any saved filter can feed a sequence, a dialer, or a bulk action.
5. Deal-health signals as defaults, not add-ons: stalled flag vs the owner's own closed-won baseline (HubSpot Is Stalled After Timestamp), rotting timers (Pipedrive), AI deal score.
6. Association labels beat rigid junction objects: labeled edges (buying role, billing contact) are cheap, filterable, and automatable.
7. The quote is a live web page with e-sign + payments + an embedded AI agent, and every buyer event writes back to the deal timeline (HubSpot Commerce).
8. Self-filling CRM (Attio): email/calendar sync should backfill records + interaction history before the user creates anything manually.
9. Required-on-stage-entry beats required-on-create (Pipedrive Important/Required fields, HubSpot stage gating): collect data when it becomes knowable.
10. Counters everywhere: emails exchanged, activities done, times contacted - lifetime system counters on every object power rep analytics for free.
