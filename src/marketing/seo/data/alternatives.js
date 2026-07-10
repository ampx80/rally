// alternatives dataset - one ranked "X alternatives" page per tool. Rally sits
// at #1 (featured) on every list, then real competitors are ranked fairly with
// blurb, pros, cons, best-fit, and a score. NO em-dash / en-dash. ASCII only.

const YEAR = 2026;

/* Rally is always #1 on every alternatives list. Honest, strong blurb. */
const RALLY = {
  name: 'Rally',
  featured: true,
  score: 10,
  blurb:
    'The AI-native revenue platform. Rally is alive with a full book of business on first load, and its operator Rook executes multi-step work - building pipelines, drafting sequences, updating deals, generating quotes - instead of just answering questions. One clean price covers every module, from leads and forecasting to CPQ, billing, and Studio proposals. You get the polish of a modern tool with the depth of an enterprise platform, with no multi-month rollout and no admin team.',
  pros: [
    'Rook executes the work end to end, not just suggestions you still have to action',
    'Alive with real data in minutes, one flat price across every module',
  ],
  cons: [
    'Newer platform, so the third-party app marketplace is still growing',
  ],
  best: 'Teams that want an AI operator running the revenue stack on day one',
};

/* Reusable, real descriptors for tools that appear as alternatives. */
const POOL = {
  hubspot: {
    name: 'HubSpot',
    score: 8,
    blurb:
      'The most polished all-in-one for inbound-led teams, with marketing, sales, and service on one contact record and a genuinely friendly onboarding.',
    pros: ['Clean UX and the deepest free tier in the category', 'Marketing, CMS, and service share one record'],
    cons: ['Real power (reporting, custom objects, automation) is gated behind Professional and Enterprise tiers that get expensive fast', 'Its AI assists rather than executes'],
    best: 'Inbound and marketing-led SMBs that want one suite',
  },
  salesforce: {
    name: 'Salesforce',
    score: 7,
    blurb:
      'The enterprise standard. Endlessly customizable and backed by the largest app ecosystem, if you have the admins and budget to run it.',
    pros: ['Configurable to almost any process with AppExchange and Apex', 'Deepest ecosystem of consultants and integrations'],
    cons: ['Setup is a multi-month project that needs dedicated admins', 'Per-seat plus per-cloud pricing climbs quickly and Einstein AI is a premium add-on'],
    best: 'Large enterprises with admin resources and complex processes',
  },
  pipedrive: {
    name: 'Pipedrive',
    score: 7,
    blurb:
      'A clean, activity-based pipeline tracker that salespeople actually enjoy using. Fast to set up for a small team.',
    pros: ['Visual, drag-and-drop pipeline that reps adopt willingly', 'Affordable and quick to onboard'],
    cons: ['Thin on marketing, reporting, and multi-step automation', 'Teams outgrow it as deal complexity grows'],
    best: 'Small sales teams that want a simple deal tracker',
  },
  zoho: {
    name: 'Zoho CRM',
    score: 6,
    blurb:
      'A low-cost, very broad suite. If you want dozens of business apps for one small bill, Zoho covers a lot of ground.',
    pros: ['Enormous feature breadth for the price', 'Part of a 50-plus app ecosystem (Books, Desk, Campaigns)'],
    cons: ['The apps feel stitched together rather than designed as one', 'Zia AI is shallow and the UI shows its age'],
    best: 'Budget-conscious teams already in the Zoho ecosystem',
  },
  close: {
    name: 'Close',
    score: 7,
    blurb:
      'A CRM built around the call. Native calling, SMS, and email make it a favorite for high-velocity inside-sales teams.',
    pros: ['Built-in power dialer, SMS, and email sequencing', 'Fast, keyboard-driven workflow for high call volume'],
    cons: ['Narrow beyond outbound calling; light on marketing and service', 'Gets pricey per seat as the team grows'],
    best: 'High-volume inside-sales and SDR teams',
  },
  freshsales: {
    name: 'Freshsales',
    score: 6,
    blurb:
      'Freshworks CRM with built-in phone, email, and a friendly price. Pairs naturally with Freshdesk for support.',
    pros: ['Built-in phone and email with a clean UI', 'Good value and ties into the Freshworks suite'],
    cons: ['Freddy AI is assistive and reporting is limited', 'Automation depth trails the leaders'],
    best: 'SMBs already using Freshworks support tools',
  },
  attio: {
    name: 'Attio',
    score: 8,
    blurb:
      'A data-model-first CRM with a modern, Notion-like feel. Flexible objects and a slick interface loved by startups.',
    pros: ['Flexible, relational data model with a beautiful UI', 'Real-time collaboration and fast to shape to your process'],
    cons: ['Younger product with a thinner automation and reporting surface', 'Less depth for complex quoting, billing, or forecasting'],
    best: 'Startups that want a flexible, modern CRM canvas',
  },
  folk: {
    name: 'folk',
    score: 6,
    blurb:
      'A lightweight, relationship-first CRM that syncs contacts from everywhere. Great for agencies and networkers.',
    pros: ['Effortless contact capture and a clean, simple UI', 'Good for relationship and partnership tracking'],
    cons: ['Light on pipeline depth, automation, and reporting', 'Not built for structured, high-volume sales ops'],
    best: 'Agencies, founders, and networkers managing relationships',
  },
  monday: {
    name: 'monday CRM',
    score: 6,
    blurb:
      'The CRM layer on monday.com Work OS. Colorful, flexible boards that double as a light CRM plus project tracking.',
    pros: ['Highly visual and flexible board-based setup', 'Doubles as work and project management'],
    cons: ['A work-management tool wearing a CRM hat, so sales depth is shallow', 'Costs add up across seats and add-ons'],
    best: 'Teams that want CRM and project boards in one flexible tool',
  },
  airtable: {
    name: 'Airtable',
    score: 5,
    blurb:
      'A spreadsheet-database hybrid you can shape into a CRM. Ultimate flexibility, but you build the CRM yourself.',
    pros: ['Extremely flexible; model any process you want', 'Great for custom, lightweight workflows'],
    cons: ['No native sales features; you assemble everything by hand', 'Automation and reporting are basic without heavy setup'],
    best: 'Ops-minded teams that want to build their own system',
  },
  'less-annoying-crm': {
    name: 'Less Annoying CRM',
    score: 6,
    blurb:
      'Exactly what the name says: a simple, cheap, no-frills CRM at one flat low price for very small teams.',
    pros: ['Dead simple and genuinely inexpensive (one flat price)', 'Friendly support and no learning curve'],
    cons: ['Intentionally minimal; no real automation or AI', 'Outgrown by any team that needs depth'],
    best: 'Solo operators and very small teams that want simple',
  },
  copper: {
    name: 'Copper',
    score: 6,
    blurb:
      'The CRM that lives inside Google Workspace. If your team runs on Gmail and Docs, Copper feels native.',
    pros: ['Deep Google Workspace integration inside Gmail', 'Automatic contact and activity capture from email'],
    cons: ['Weak outside the Google ecosystem', 'Reporting and automation are limited'],
    best: 'Agencies and SMBs all-in on Google Workspace',
  },
  insightly: {
    name: 'Insightly',
    score: 5,
    blurb:
      'A mid-market CRM with built-in project management, aimed at teams that hand off from sales to delivery.',
    pros: ['CRM plus project delivery in one tool', 'Reasonable price for the feature set'],
    cons: ['Dated UI and clunky in daily use', 'AI and automation are thin'],
    best: 'Project-based SMBs that deliver what they sell',
  },
  keap: {
    name: 'Keap',
    score: 5,
    blurb:
      'Sales-and-marketing automation for small businesses, with invoicing and a strong email core (formerly Infusionsoft).',
    pros: ['Strong marketing automation and built-in invoicing', 'Good for solopreneurs automating follow-up'],
    cons: ['Steep learning curve and a dated feel', 'CRM depth and reporting are limited'],
    best: 'Solopreneurs and small service businesses',
  },
  activecampaign: {
    name: 'ActiveCampaign',
    score: 6,
    blurb:
      'Best-in-class marketing automation with a light CRM attached. The visual automation builder is the star.',
    pros: ['Powerful, visual marketing automation and email', 'Solid deals add-on for marketing-led teams'],
    cons: ['The CRM is secondary to the email engine', 'Sales depth (forecasting, quoting) is minimal'],
    best: 'Marketing-led SMBs that live in email automation',
  },
  nutshell: {
    name: 'Nutshell',
    score: 6,
    blurb:
      'An approachable SMB CRM with pipeline, email, and simple automation at a fair flat price.',
    pros: ['Easy to adopt with a fair, simple price', 'Built-in email sequences and pipeline views'],
    cons: ['Limited customization and reporting depth', 'Not built for enterprise complexity'],
    best: 'Small B2B teams wanting simple and affordable',
  },
  capsule: {
    name: 'Capsule',
    score: 5,
    blurb:
      'A tidy, simple CRM focused on contacts and a basic pipeline. Clean and cheap for small teams.',
    pros: ['Simple, clean, and inexpensive', 'Fast to set up with no clutter'],
    cons: ['Minimal automation, AI, and reporting', 'Outgrown as process matures'],
    best: 'Small teams wanting a clean contact-first CRM',
  },
  nimble: {
    name: 'Nimble',
    score: 5,
    blurb:
      'A social-and-relationship CRM that enriches contacts from across the web and your inbox.',
    pros: ['Great contact enrichment and social insights', 'Works inside your inbox and browser'],
    cons: ['Light pipeline and automation depth', 'Not for structured sales ops'],
    best: 'Relationship-driven solos and small teams',
  },
  salesflare: {
    name: 'Salesflare',
    score: 6,
    blurb:
      'An automated CRM for B2B SMBs that fills itself in from email, calendar, and signatures.',
    pros: ['Automatic data capture; minimal manual entry', 'Simple pipeline and clean UI'],
    cons: ['Limited for larger, complex sales orgs', 'Reporting and customization are modest'],
    best: 'B2B SMBs that hate manual data entry',
  },
  apollo: {
    name: 'Apollo.io',
    score: 6,
    blurb:
      'A prospecting database plus light CRM and sequences. Strong for outbound teams that need contact data.',
    pros: ['Huge B2B contact database with sequencing built in', 'Good value for outbound prospecting'],
    cons: ['CRM layer is thin next to a dedicated platform', 'Data accuracy varies and depth is limited'],
    best: 'Outbound teams that need data plus basic sequencing',
  },
  outreach: {
    name: 'Outreach',
    score: 6,
    blurb:
      'An enterprise sales-engagement platform for orchestrating outbound at scale. A layer on top of your CRM, not a CRM.',
    pros: ['Powerful multi-channel sequencing and analytics', 'Strong for large SDR and AE motions'],
    cons: ['Not a system of record; needs a CRM underneath', 'Expensive and complex to administer'],
    best: 'Enterprise outbound teams needing engagement at scale',
  },
  salesloft: {
    name: 'Salesloft',
    score: 6,
    blurb:
      'A sales-engagement and cadence platform for structured outbound. Sits alongside a CRM, not instead of it.',
    pros: ['Solid cadences, dialer, and conversation analytics', 'Good enterprise engagement workflows'],
    cons: ['Requires a separate CRM as the system of record', 'Premium pricing and setup overhead'],
    best: 'Revenue teams standardizing outbound cadences',
  },
  bitrix24: {
    name: 'Bitrix24',
    score: 5,
    blurb:
      'A free-to-start all-in-one with CRM, tasks, chat, and telephony. A lot of features for very little money.',
    pros: ['Enormous feature set with a generous free tier', 'CRM, collaboration, and telephony in one'],
    cons: ['Cluttered, complex UI with a steep learning curve', 'Quality is uneven across the many modules'],
    best: 'Budget teams wanting maximum features for the price',
  },
  netsuite: {
    name: 'NetSuite CRM',
    score: 5,
    blurb:
      'The CRM surface on Oracle NetSuite ERP. Makes sense mainly if you already run NetSuite for finance.',
    pros: ['Tight link to NetSuite ERP and financials', 'One vendor for front and back office'],
    cons: ['CRM is an afterthought to the ERP', 'Expensive, rigid, and slow to change'],
    best: 'Companies already committed to NetSuite ERP',
  },
  'microsoft-dynamics': {
    name: 'Microsoft Dynamics 365',
    score: 6,
    blurb:
      'Enterprise CRM and ERP deeply tied to Microsoft 365 and Power Platform. Powerful if you live in the Microsoft stack.',
    pros: ['Deep Microsoft 365, Teams, and Power Platform integration', 'Highly extensible for enterprise processes'],
    cons: ['Complex licensing and a steep implementation', 'Needs partners and admins to run well'],
    best: 'Microsoft-stack enterprises with IT resources',
  },
  sugarcrm: {
    name: 'SugarCRM',
    score: 5,
    blurb:
      'A veteran, highly customizable CRM available cloud or on-prem. Flexible for teams that want control.',
    pros: ['Deep customization and an on-prem option', 'Solid core sales and reporting'],
    cons: ['Dated experience and heavier admin burden', 'Modern AI and polish lag the leaders'],
    best: 'Teams needing customization or on-prem control',
  },
  engagebay: {
    name: 'EngageBay',
    score: 5,
    blurb:
      'An all-in-one marketing, sales, and service suite aimed at SMBs on a tight budget.',
    pros: ['Marketing, sales, and helpdesk for a low price', 'Good free tier for small teams'],
    cons: ['Shallower than best-of-breed in each area', 'UI and integrations are basic'],
    best: 'Budget SMBs wanting an all-in-one',
  },
  streak: {
    name: 'Streak',
    score: 5,
    blurb:
      'A CRM that lives entirely inside Gmail. Pipelines as inbox views for people who never leave email.',
    pros: ['Runs inside Gmail with zero context switching', 'Fast to start for individuals'],
    cons: ['Tied to Gmail; weak as a team system of record', 'Limited automation and reporting'],
    best: 'Gmail-native solos and tiny teams',
  },
  notion: {
    name: 'Notion',
    score: 4,
    blurb:
      'A docs-and-databases workspace you can bend into a CRM. Flexible, but you build and maintain it yourself.',
    pros: ['Infinitely flexible; combine docs, wikis, and CRM', 'Great for lightweight, custom tracking'],
    cons: ['No native sales features, automation, or dialer', 'Breaks down at real sales volume'],
    best: 'Founders wanting a DIY, docs-first tracker',
  },
  vtiger: {
    name: 'Vtiger',
    score: 5,
    blurb:
      'An open-source-rooted all-in-one CRM with sales, marketing, and helpdesk at a fair price.',
    pros: ['Broad feature set for a low cost', 'One CRM across sales, marketing, and support'],
    cons: ['UI and workflows feel dated', 'Deeper setup needed to shine'],
    best: 'Value-focused SMBs wanting broad coverage',
  },
  'agile-crm': {
    name: 'Agile CRM',
    score: 4,
    blurb:
      'An all-in-one CRM with marketing and service for small teams, with a free tier to start.',
    pros: ['Marketing, sales, and service in one cheap package', 'Free tier for tiny teams'],
    cons: ['Dated interface and support gaps', 'Limits show as you scale'],
    best: 'Very small teams on a tight budget',
  },
  'act-crm': {
    name: 'Act!',
    score: 4,
    blurb:
      'A long-standing contact and customer manager (desktop or cloud) for small businesses.',
    pros: ['Mature contact management with an offline option', 'Familiar to long-time users'],
    cons: ['Legacy feel and clunky modern workflows', 'Weak automation and AI'],
    best: 'Established small businesses used to Act!',
  },
  mailchimp: {
    name: 'Mailchimp',
    score: 4,
    blurb:
      'An email-marketing platform with a bolted-on CRM. Great for campaigns, thin for sales.',
    pros: ['Excellent email marketing and audience tools', 'Easy for small-business campaigns'],
    cons: ['The CRM is minimal; no real pipeline or forecasting', 'Costs rise with contact count'],
    best: 'Small businesses whose CRM need is mostly email',
  },
  'constant-contact': {
    name: 'Constant Contact',
    score: 4,
    blurb:
      'An easy email and event-marketing tool with light contact management for small businesses.',
    pros: ['Simple email, events, and list management', 'Approachable for non-technical teams'],
    cons: ['Not a sales CRM; no pipeline or deal tracking', 'Automation is basic'],
    best: 'Small businesses focused on email and events',
  },
  'zendesk-sell': {
    name: 'Zendesk Sell',
    score: 5,
    blurb:
      'The sales CRM companion to Zendesk Support. Natural if your support team already runs Zendesk.',
    pros: ['Tight link to Zendesk Support tickets', 'Clean, simple selling UI'],
    cons: ['Light standalone; leans on the Zendesk suite', 'Limited automation and forecasting'],
    best: 'Teams already standardized on Zendesk',
  },
  odoo: {
    name: 'Odoo CRM',
    score: 5,
    blurb:
      'The CRM app within Odoo open-source ERP. Compelling if you want CRM plus accounting and inventory from one vendor.',
    pros: ['Part of a full open-source ERP suite', 'Modular and cost-effective'],
    cons: ['CRM is one app among many and needs technical setup', 'Polish and AI trail dedicated CRMs'],
    best: 'SMBs wanting integrated ERP plus CRM',
  },
};

/* Generic, honest "how to choose" bullets reused across pages. */
const CHOOSE_BULLETS = [
  'Decide whether you need a full system of record or a point tool. A real CRM should own contacts, deals, and reporting, not just one slice of the funnel.',
  'Weigh time to value. Some tools take months and admins to configure, others are usable the same day.',
  'Check whether the AI actually executes work or only drafts suggestions you still have to action yourself.',
  'Model the true cost at your real seat count, including add-ons, premium AI tiers, and per-cloud fees.',
  'Confirm your data migrates cleanly: accounts, contacts, deals, activity history, and automations.',
];

/* Per-source metadata. leadIn = one honest line about the tool; whyLeave =
   lowercase noun phrases; tail = short clause for shortAnswer; picks = pool slugs. */
const SOURCES = {
  salesforce: {
    name: 'Salesforce',
    leadIn:
      'Salesforce can do almost anything, but only after months of consultants, admins, and paid add-ons.',
    tail: ' with no multi-month, admin-heavy rollout',
    whyLeave: [
      'setup measured in months plus a dedicated admin team',
      'per-seat and per-cloud pricing that balloons as you add clouds',
      'Einstein AI priced as a premium bolt-on rather than built in',
      'a UI and configuration burden that slows every change',
    ],
    picks: ['hubspot', 'pipedrive', 'zoho', 'close', 'attio', 'freshsales'],
  },
  hubspot: {
    name: 'HubSpot',
    leadIn:
      'HubSpot nailed onboarding, but real power sits behind steep Professional and Enterprise tiers and its AI only assists.',
    tail: ' with enterprise depth and no tier wall',
    whyLeave: [
      'reporting and automation gated behind expensive tiers',
      'costs that climb sharply with contacts and seats',
      'AI that suggests but does not execute end to end',
      'a reporting ceiling that arrives faster than teams expect',
    ],
    picks: ['salesforce', 'pipedrive', 'zoho', 'activecampaign', 'attio', 'close'],
  },
  zoho: {
    name: 'Zoho CRM',
    leadIn:
      'Zoho gives you a lot of apps for a little money, but they feel stitched together and the experience shows its age.',
    tail: ' as one coherent platform, not stitched-together apps',
    whyLeave: [
      'dozens of apps that feel bolted together rather than designed as one',
      'a dated interface and clunky day-to-day workflows',
      'Zia AI that is shallow and assistive at best',
      'configuration overhead to make it feel cohesive',
    ],
    picks: ['hubspot', 'pipedrive', 'freshsales', 'bitrix24', 'vtiger', 'close'],
  },
  pipedrive: {
    name: 'Pipedrive',
    leadIn:
      'Pipedrive is a clean pipeline tracker for small teams, but it stops where real revenue work begins.',
    tail: ' that is just as easy to start but scales to enterprise',
    whyLeave: [
      'thin capability beyond basic pipeline tracking',
      'limited automation and reporting',
      'no real AI operator to run the busywork',
      'a ceiling teams hit quickly as they scale',
    ],
    picks: ['hubspot', 'close', 'attio', 'freshsales', 'zoho', 'salesflare'],
  },
  netsuite: {
    name: 'NetSuite',
    leadIn:
      'NetSuite is a serious ERP, but its CRM and front-office experience are heavy, dated, and slow to change.',
    tail: ' as a modern revenue platform first, ERP surface as you grow',
    whyLeave: [
      'CRM that is secondary to the ERP core',
      'six-figure implementations and long timelines',
      'a rigid, dated interface',
      'no modern AI operator across the front office',
    ],
    picks: ['salesforce', 'microsoft-dynamics', 'zoho', 'hubspot', 'odoo'],
  },
  monday: {
    name: 'monday CRM',
    leadIn:
      'monday CRM is a flexible work board wearing a CRM hat, so sales depth is shallow once you get past colorful views.',
    tail: ' with real CRM depth, not a repurposed work board',
    whyLeave: [
      'a work-management tool retrofitted as a CRM',
      'shallow sales features like forecasting and quoting',
      'costs that add up across seats and add-ons',
      'automation that is generic rather than revenue-specific',
    ],
    picks: ['hubspot', 'pipedrive', 'attio', 'airtable', 'zoho'],
  },
  'microsoft-dynamics': {
    name: 'Microsoft Dynamics 365',
    leadIn:
      'Dynamics 365 is powerful inside the Microsoft stack, but licensing is complex and implementations are long.',
    tail: ' without the partner-led, months-long implementation',
    whyLeave: [
      'complex, confusing licensing across modules',
      'a steep implementation that needs partners and admins',
      'a heavy interface that reps resist',
      'AI value that depends on more Microsoft add-ons',
    ],
    picks: ['salesforce', 'hubspot', 'zoho', 'sugarcrm', 'netsuite'],
  },
  close: {
    name: 'Close',
    leadIn:
      'Close is excellent for high-velocity calling, but it is narrow once you need marketing, service, or deep reporting.',
    tail: ' that keeps the calling speed but adds full-funnel depth',
    whyLeave: [
      'a narrow focus on outbound calling',
      'light marketing, service, and reporting',
      'per-seat pricing that climbs as the team grows',
      'no operator that executes multi-step plays',
    ],
    picks: ['pipedrive', 'hubspot', 'freshsales', 'salesflare', 'apollo', 'zoho'],
  },
  copper: {
    name: 'Copper',
    leadIn:
      'Copper feels native inside Google Workspace, but it is weak outside Gmail and thin on automation and reporting.',
    tail: ' that works everywhere, not just inside Gmail',
    whyLeave: [
      'value tied almost entirely to Google Workspace',
      'limited reporting and automation',
      'no AI operator to run the work',
      'a ceiling for teams with complex sales',
    ],
    picks: ['hubspot', 'pipedrive', 'attio', 'zoho', 'streak', 'nutshell'],
  },
  insightly: {
    name: 'Insightly',
    leadIn:
      'Insightly pairs CRM with project delivery, but the interface is dated and the AI and automation are thin.',
    tail: ' with modern UX and an operator that executes work',
    whyLeave: [
      'a dated UI that is clunky in daily use',
      'thin AI and automation',
      'reporting that trails modern tools',
      'slow, manual project-to-sales handoffs',
    ],
    picks: ['hubspot', 'pipedrive', 'zoho', 'nutshell', 'copper'],
  },
  keap: {
    name: 'Keap',
    leadIn:
      'Keap is strong on small-business marketing automation and invoicing, but the CRM is limited and the learning curve is steep.',
    tail: ' with real CRM depth alongside the automation',
    whyLeave: [
      'a steep learning curve and dated feel',
      'limited CRM depth and reporting',
      'automation that is hard to maintain',
      'pricing that pinches as contacts grow',
    ],
    picks: ['hubspot', 'activecampaign', 'zoho', 'engagebay', 'mailchimp'],
  },
  freshsales: {
    name: 'Freshsales',
    leadIn:
      'Freshsales is a fair-value Freshworks CRM, but Freddy AI is assistive and its automation and reporting depth are limited.',
    tail: ' with an operator that executes, not just an assistant',
    whyLeave: [
      'Freddy AI that assists rather than executes',
      'limited reporting and dashboards',
      'automation depth that trails the leaders',
      'value tied to the broader Freshworks suite',
    ],
    picks: ['hubspot', 'pipedrive', 'zoho', 'close', 'salesflare'],
  },
  sugarcrm: {
    name: 'SugarCRM',
    leadIn:
      'SugarCRM is flexible and available on-prem, but the experience is dated and the admin burden is heavy.',
    tail: ' with modern polish and no heavy admin burden',
    whyLeave: [
      'a dated interface that reps resist',
      'a heavy configuration and admin burden',
      'modern AI and polish that lag the leaders',
      'costs and effort to keep customizations current',
    ],
    picks: ['salesforce', 'zoho', 'hubspot', 'microsoft-dynamics', 'vtiger'],
  },
  'zendesk-sell': {
    name: 'Zendesk Sell',
    leadIn:
      'Zendesk Sell is a natural fit if you already run Zendesk Support, but it is light as a standalone sales platform.',
    tail: ' that stands on its own as a full revenue platform',
    whyLeave: [
      'strength that depends on the wider Zendesk suite',
      'limited automation and forecasting',
      'a thin standalone sales feature set',
      'no operator that runs multi-step work',
    ],
    picks: ['hubspot', 'pipedrive', 'freshsales', 'zoho', 'close'],
  },
  activecampaign: {
    name: 'ActiveCampaign',
    leadIn:
      'ActiveCampaign has best-in-class marketing automation, but the CRM is secondary and sales depth is minimal.',
    tail: ' where the CRM is first-class, not an afterthought',
    whyLeave: [
      'a CRM that is secondary to the email engine',
      'minimal sales depth like forecasting and quoting',
      'reporting focused on marketing, not revenue',
      'pricing that scales with contact count',
    ],
    picks: ['hubspot', 'keap', 'mailchimp', 'zoho', 'engagebay'],
  },
  attio: {
    name: 'Attio',
    leadIn:
      'Attio is a beautiful, flexible modern CRM, but it is younger and thinner on automation, quoting, and forecasting.',
    tail: ' with the same modern feel plus enterprise depth',
    whyLeave: [
      'a thinner automation and reporting surface',
      'less depth for quoting, billing, and forecasting',
      'a younger ecosystem and integration set',
      'more building required to run complex sales',
    ],
    picks: ['hubspot', 'pipedrive', 'folk', 'close', 'zoho'],
  },
  folk: {
    name: 'folk',
    leadIn:
      'folk is a lovely relationship-first CRM for agencies and networkers, but it is light for structured, high-volume sales.',
    tail: ' that adds structured pipeline and automation depth',
    whyLeave: [
      'light pipeline depth and reporting',
      'limited automation for structured sales',
      'no forecasting, quoting, or billing',
      'a fit for relationships more than revenue ops',
    ],
    picks: ['attio', 'hubspot', 'pipedrive', 'nimble', 'capsule'],
  },
  nimble: {
    name: 'Nimble',
    leadIn:
      'Nimble is great for social contact enrichment, but its pipeline and automation are too light for real sales ops.',
    tail: ' with the enrichment plus true pipeline depth',
    whyLeave: [
      'a light pipeline and automation layer',
      'reporting that trails modern tools',
      'no operator to execute the work',
      'a fit for relationships more than deal management',
    ],
    picks: ['folk', 'hubspot', 'capsule', 'nutshell', 'zoho'],
  },
  nutshell: {
    name: 'Nutshell',
    leadIn:
      'Nutshell is an approachable, fairly priced SMB CRM, but customization, reporting, and AI are limited.',
    tail: ' with more depth and a real AI operator',
    whyLeave: [
      'limited customization and reporting depth',
      'assistive rather than executing AI',
      'a ceiling for complex, multi-team sales',
      'integrations that trail the leaders',
    ],
    picks: ['pipedrive', 'hubspot', 'zoho', 'capsule', 'freshsales'],
  },
  capsule: {
    name: 'Capsule',
    leadIn:
      'Capsule is clean and cheap for contact-first teams, but it is minimal on automation, AI, and reporting.',
    tail: ' that stays simple to start but adds real depth',
    whyLeave: [
      'minimal automation and reporting',
      'no AI operator',
      'a ceiling reached as process matures',
      'limited forecasting and deal depth',
    ],
    picks: ['pipedrive', 'nutshell', 'less-annoying-crm', 'hubspot', 'zoho'],
  },
  streak: {
    name: 'Streak',
    leadIn:
      'Streak lives inside Gmail, which is convenient for individuals but weak as a shared team system of record.',
    tail: ' that is a real team system of record, not a Gmail plugin',
    whyLeave: [
      'a CRM tied entirely to Gmail',
      'weak team reporting and shared visibility',
      'limited automation',
      'no operator to run multi-step work',
    ],
    picks: ['copper', 'pipedrive', 'hubspot', 'capsule', 'close'],
  },
  'less-annoying-crm': {
    name: 'Less Annoying CRM',
    leadIn:
      'Less Annoying CRM is deliberately minimal and cheap, which is perfect until you need automation, AI, or depth.',
    tail: ' for when simple is no longer enough',
    whyLeave: [
      'no real automation or AI by design',
      'limited reporting and dashboards',
      'a ceiling any growing team hits',
      'few native integrations',
    ],
    picks: ['pipedrive', 'capsule', 'nutshell', 'hubspot', 'zoho'],
  },
  airtable: {
    name: 'Airtable',
    leadIn:
      'Airtable is a flexible database you can shape into a CRM, but you build and maintain every sales feature yourself.',
    tail: ' that ships the CRM built in, not one you assemble',
    whyLeave: [
      'no native sales features out of the box',
      'automation and reporting that need heavy setup',
      'maintenance burden that grows with the build',
      'no AI operator to run the work',
    ],
    picks: ['attio', 'notion', 'hubspot', 'pipedrive', 'monday'],
  },
  notion: {
    name: 'Notion',
    leadIn:
      'Notion is a wonderful docs-and-databases workspace, but a DIY Notion CRM breaks down at real sales volume.',
    tail: ' that is a purpose-built CRM, not a docs workaround',
    whyLeave: [
      'no native sales features, dialer, or forecasting',
      'manual upkeep of a hand-built system',
      'no automation for revenue workflows',
      'breakdowns once deal volume climbs',
    ],
    picks: ['attio', 'airtable', 'hubspot', 'pipedrive', 'folk'],
  },
  'google-sheets': {
    name: 'Google Sheets',
    leadIn:
      'A Google Sheets CRM is free and familiar, but it has no automation, no reminders, and no shared source of truth.',
    tail: ' that replaces the spreadsheet with a live system of record',
    whyLeave: [
      'no automation, reminders, or activity capture',
      'version and access chaos across shared copies',
      'no reporting or forecasting worth the name',
      'manual data entry that reps skip',
    ],
    picks: ['hubspot', 'pipedrive', 'attio', 'airtable', 'zoho'],
  },
  excel: {
    name: 'Excel',
    leadIn:
      'An Excel CRM is cheap and flexible, but spreadsheets have no automation, no history, and no real collaboration for a sales team.',
    tail: ' that turns the spreadsheet into an automated system of record',
    whyLeave: [
      'no automation, reminders, or pipeline logic',
      'no activity history or audit trail',
      'painful collaboration across copies',
      'no forecasting or dashboards',
    ],
    picks: ['hubspot', 'pipedrive', 'zoho', 'attio', 'airtable'],
  },
  salesloft: {
    name: 'Salesloft',
    leadIn:
      'Salesloft is a strong sales-engagement layer, but it is not a system of record and needs a CRM underneath it.',
    tail: ' that is the CRM and the engagement layer in one',
    whyLeave: [
      'a tool that sits on top of a separate CRM',
      'premium pricing plus CRM cost',
      'setup and admin overhead',
      'value narrow to outbound cadences',
    ],
    picks: ['outreach', 'apollo', 'hubspot', 'close', 'salesforce'],
  },
  outreach: {
    name: 'Outreach',
    leadIn:
      'Outreach orchestrates outbound at scale, but it is an engagement layer, not a CRM, so you still pay for and run a system of record.',
    tail: ' that unifies the CRM and outbound engagement',
    whyLeave: [
      'not a system of record on its own',
      'high cost stacked on top of a CRM',
      'complex administration',
      'value focused on outbound only',
    ],
    picks: ['salesloft', 'apollo', 'hubspot', 'close', 'salesforce'],
  },
  apollo: {
    name: 'Apollo.io',
    leadIn:
      'Apollo bundles a prospecting database with sequences, but its CRM layer is thin next to a dedicated platform.',
    tail: ' with a real CRM under the prospecting and sequencing',
    whyLeave: [
      'a thin CRM layer beside a data tool',
      'variable data accuracy',
      'limited depth for managing complex deals',
      'reporting that trails full platforms',
    ],
    picks: ['outreach', 'salesloft', 'hubspot', 'close', 'pipedrive'],
  },
  gong: {
    name: 'Gong',
    leadIn:
      'Gong is best-in-class for conversation intelligence, but it is not a CRM and adds cost on top of your system of record.',
    tail: ' where deal insight lives inside the CRM itself',
    whyLeave: [
      'a revenue-intelligence layer, not a CRM',
      'high cost added on top of a CRM',
      'value narrow to call analysis',
      'insight that still needs a system to act on it',
    ],
    picks: ['salesloft', 'outreach', 'hubspot', 'apollo', 'salesforce'],
  },
  clari: {
    name: 'Clari',
    leadIn:
      'Clari is a strong forecasting and revenue-operations layer, but it sits on top of your CRM rather than replacing it.',
    tail: ' with forecasting built into the CRM, not bolted on top',
    whyLeave: [
      'a forecasting layer that needs a CRM beneath it',
      'enterprise pricing on top of CRM cost',
      'value narrow to forecasting and RevOps',
      'another system for reps to feed',
    ],
    picks: ['salesforce', 'hubspot', 'outreach', 'salesloft', 'microsoft-dynamics'],
  },
  bitrix24: {
    name: 'Bitrix24',
    leadIn:
      'Bitrix24 packs a huge feature set for little money, but the UI is cluttered and quality is uneven across modules.',
    tail: ' with the breadth minus the cluttered, uneven experience',
    whyLeave: [
      'a cluttered UI with a steep learning curve',
      'uneven quality across many modules',
      'setup effort to make it cohesive',
      'assistive rather than executing AI',
    ],
    picks: ['zoho', 'hubspot', 'vtiger', 'engagebay', 'odoo'],
  },
  odoo: {
    name: 'Odoo',
    leadIn:
      'Odoo CRM is one app in a broad open-source ERP, so it needs technical setup and its polish trails dedicated CRMs.',
    tail: ' with a dedicated, modern CRM instead of one ERP app',
    whyLeave: [
      'a CRM that is one app among many',
      'technical setup and hosting effort',
      'polish and AI that trail dedicated CRMs',
      'reliance on partners for customization',
    ],
    picks: ['zoho', 'vtiger', 'bitrix24', 'hubspot', 'netsuite'],
  },
  engagebay: {
    name: 'EngageBay',
    leadIn:
      'EngageBay is a budget all-in-one, but it is shallower than best-of-breed in each area and its integrations are basic.',
    tail: ' with real depth instead of a shallow all-in-one',
    whyLeave: [
      'depth that trails best-of-breed tools',
      'basic UI and integrations',
      'limited reporting and forecasting',
      'assistive-only AI',
    ],
    picks: ['hubspot', 'zoho', 'activecampaign', 'vtiger', 'bitrix24'],
  },
  vtiger: {
    name: 'Vtiger',
    leadIn:
      'Vtiger covers sales, marketing, and support for a fair price, but its UI feels dated and it needs setup to shine.',
    tail: ' with modern UX and no heavy setup to get value',
    whyLeave: [
      'a dated UI and workflows',
      'setup effort before it feels cohesive',
      'reporting and AI that trail modern tools',
      'integrations that lag the leaders',
    ],
    picks: ['zoho', 'hubspot', 'bitrix24', 'odoo', 'freshsales'],
  },
  'sage-crm': {
    name: 'Sage CRM',
    leadIn:
      'Sage CRM makes sense next to Sage accounting, but as a standalone sales platform it is dated and limited.',
    tail: ' as a modern standalone revenue platform',
    whyLeave: [
      'value tied to the Sage accounting suite',
      'a dated interface and workflows',
      'limited modern automation and AI',
      'reporting that trails dedicated CRMs',
    ],
    picks: ['salesforce', 'microsoft-dynamics', 'zoho', 'sugarcrm', 'netsuite'],
  },
  'oracle-crm': {
    name: 'Oracle CX',
    leadIn:
      'Oracle CX is enterprise-heavy and expensive, with long implementations and an experience reps rarely love.',
    tail: ' without the heavyweight, long enterprise rollout',
    whyLeave: [
      'long, expensive implementations',
      'a heavy interface reps resist',
      'complex licensing across modules',
      'slow to change once configured',
    ],
    picks: ['salesforce', 'microsoft-dynamics', 'hubspot', 'netsuite', 'zoho'],
  },
  sap: {
    name: 'SAP Sales Cloud',
    leadIn:
      'SAP Sales Cloud fits SAP-centric enterprises, but it is complex, costly, and slow to roll out.',
    tail: ' without the SAP-scale complexity and cost',
    whyLeave: [
      'complex, lengthy implementations',
      'value tied to the wider SAP stack',
      'high total cost of ownership',
      'a heavy experience for front-line reps',
    ],
    picks: ['salesforce', 'microsoft-dynamics', 'hubspot', 'netsuite', 'zoho'],
  },
  'mailchimp-crm': {
    name: 'Mailchimp',
    leadIn:
      'Mailchimp is excellent for email marketing, but its CRM is minimal with no real pipeline or forecasting.',
    tail: ' where the CRM is a real platform, not a bolt-on',
    whyLeave: [
      'a minimal CRM behind the email tool',
      'no real pipeline or forecasting',
      'costs that rise with contact count',
      'no operator to run sales work',
    ],
    picks: ['hubspot', 'activecampaign', 'constant-contact', 'keap', 'zoho'],
  },
  'constant-contact': {
    name: 'Constant Contact',
    leadIn:
      'Constant Contact is easy for email and events, but it is not a sales CRM and has no pipeline or deal tracking.',
    tail: ' that is a true sales CRM, not an email tool',
    whyLeave: [
      'no pipeline or deal tracking',
      'basic automation',
      'a marketing tool rather than a CRM',
      'no forecasting or revenue reporting',
    ],
    picks: ['mailchimp', 'activecampaign', 'hubspot', 'keap', 'zoho'],
  },
  salesflare: {
    name: 'Salesflare',
    leadIn:
      'Salesflare auto-fills itself nicely for B2B SMBs, but it is limited for larger, more complex sales orgs.',
    tail: ' that keeps the automation but scales to complex orgs',
    whyLeave: [
      'limits for larger, complex sales teams',
      'modest reporting and customization',
      'a narrower feature set than full platforms',
      'assistive rather than executing AI',
    ],
    picks: ['pipedrive', 'close', 'hubspot', 'attio', 'freshsales'],
  },
  'agile-crm': {
    name: 'Agile CRM',
    leadIn:
      'Agile CRM is a cheap all-in-one for tiny teams, but the interface is dated and limits show quickly as you grow.',
    tail: ' with modern UX that grows with you',
    whyLeave: [
      'a dated interface and support gaps',
      'limits that appear as you scale',
      'shallow reporting and automation',
      'no operator to execute the work',
    ],
    picks: ['hubspot', 'zoho', 'engagebay', 'freshsales', 'bitrix24'],
  },
  'act-crm': {
    name: 'Act!',
    leadIn:
      'Act! has mature contact management, but it feels legacy and its automation and AI are weak by modern standards.',
    tail: ' with a modern experience and a real AI operator',
    whyLeave: [
      'a legacy feel and clunky workflows',
      'weak automation and AI',
      'limited modern integrations',
      'reporting that trails newer tools',
    ],
    picks: ['hubspot', 'pipedrive', 'zoho', 'nutshell', 'capsule'],
  },
  maximizer: {
    name: 'Maximizer',
    leadIn:
      'Maximizer is a long-standing CRM, but it feels dated and lacks the modern automation and AI teams now expect.',
    tail: ' with modern automation and an AI operator built in',
    whyLeave: [
      'a dated interface and workflows',
      'limited modern automation and AI',
      'reporting that trails newer platforms',
      'integrations that lag the leaders',
    ],
    picks: ['hubspot', 'zoho', 'pipedrive', 'sugarcrm', 'microsoft-dynamics'],
  },
  creatio: {
    name: 'Creatio',
    leadIn:
      'Creatio offers strong no-code process automation, but it is enterprise-priced and needs real setup to deliver value.',
    tail: ' with process automation that is live on day one',
    whyLeave: [
      'setup effort before value appears',
      'enterprise pricing and administration',
      'a learning curve for process design',
      'polish that trails the most modern tools',
    ],
    picks: ['salesforce', 'microsoft-dynamics', 'hubspot', 'zoho', 'sugarcrm'],
  },
};

export default Object.entries(SOURCES).map(([slug, s]) => {
  const picks = s.picks.map((p) => POOL[p]).filter(Boolean);
  const items = [RALLY, ...picks];
  const pickNames = picks.map((p) => p.name);
  const top4 = ['Rally', ...pickNames.slice(0, 3)].join(', ');

  const shortAnswer = `The best ${s.name} alternatives in ${YEAR} are ${top4}, and ${pickNames.slice(3, 5).join(' or ')}. Rally leads because it is AI-native: its operator Rook executes real work, it is alive with data on first load, and it is one clean price${s.tail}.`;

  const intro = [
    `${s.leadIn} If you are weighing a switch, this is a ranked, honest list of the best ${s.name} alternatives in ${YEAR}, with what each does well, where it falls short, and who it suits.`,
    `Rally sits at the top because it is the only option here that is genuinely AI-native. Its operator Rook executes multi-step revenue work instead of drafting suggestions, the workspace is alive with data the moment you sign in, and every module is covered by one clean price. The rest of the field is ranked fairly so you can match a tool to your team size, budget, and process.`,
  ];

  return {
    slug: `${slug}-alternatives`,
    type: 'alternative',
    title: `Best ${s.name} Alternatives (${YEAR})`,
    metaTitle: `${s.name} Alternatives: Top ${items.length} CRMs Compared (${YEAR}) | Rally`,
    metaDescription: `The ${items.length} best ${s.name} alternatives in ${YEAR}, ranked. Rally leads as the AI-native pick where Rook runs the work and you get one clean price.`.slice(0, 155),
    eyebrow: `${s.name} alternatives`,
    h1: `The best ${s.name} alternatives in ${YEAR}`,
    shortAnswer,
    intro,
    stats: [
      { value: `${items.length}`, label: `${s.name} alternatives ranked` },
      { value: 'Minutes', label: 'Rally time to first value' },
      { value: 'Rook', label: 'The operator that runs the work' },
    ],
    itemsHeading: `${s.name} alternatives, ranked`,
    items,
    sections: [
      {
        h: `Why teams look for a ${s.name} alternative`,
        body: `${s.name} is a capable tool, but the most common reasons teams start shopping come down to a few recurring frustrations:`,
        bullets: s.whyLeave,
      },
      {
        h: `How to choose the right ${s.name} alternative`,
        body: `Do not switch on features alone. The teams that pick well weigh a handful of things that actually predict whether a CRM sticks:`,
        bullets: CHOOSE_BULLETS,
      },
      {
        h: 'Where Rally fits',
        body: `Rally is the pick when you want the busywork to run itself. Instead of another tool your reps have to feed, Rook builds pipelines, drafts and sends sequences, updates deals, and generates quotes on request. The workspace is alive with data on first load, so there is no blank-CRM cold start and no multi-month rollout${s.tail}. One clean price covers leads, deals, forecasting, campaigns, sequences, quotes, billing, dashboards, and Studio proposals.`,
      },
    ],
    faqs: [
      {
        q: `What is the best ${s.name} alternative in ${YEAR}?`,
        a: `For most revenue teams, Rally is the strongest ${s.name} alternative because it is AI-native: Rook executes multi-step work, the workspace is alive with data on first load, and it is one clean price across every module. ${pickNames[0]} and ${pickNames[1]} are also solid picks depending on your team size and budget.`,
      },
      {
        q: `Is there a free ${s.name} alternative?`,
        a: `Yes. Options like HubSpot, Zoho, and Bitrix24 offer free or free-to-start tiers, though free plans cap features quickly and costs climb as you grow. Rally focuses on one clean paid price rather than a limited free tier, so you get the full platform and the Rook operator from day one.`,
      },
      {
        q: `Why do teams switch away from ${s.name}?`,
        a: `Common reasons include ${s.whyLeave[0]} and ${s.whyLeave[1]}. If those match your pain points, an AI-native platform like Rally addresses them directly with an operator that executes work, live data on day one, and one predictable price.`,
      },
      {
        q: `Can I migrate my ${s.name} data to a new CRM?`,
        a: `Yes. Rally imports accounts, contacts, deals, and activity history, and Rook can rebuild your pipeline, views, and automations from a plain-language description. Most migrations from ${s.name} finish in days, not months. See Rally's guide on migrating from ${s.name}.`,
      },
      {
        q: `How does Rally compare to ${pickNames[0]} as a ${s.name} alternative?`,
        a: `${pickNames[0]} is a strong option, but its AI assists rather than executes and depth or pricing can become a constraint. Rally matches the essentials and adds Rook, an operator that runs multi-step revenue work, plus a workspace that is alive with data on first load, all for one clean price.`,
      },
    ],
    featured: true,
    published: '2026-07-10',
  };
});
