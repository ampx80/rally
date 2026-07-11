// ============================================================
// HELP CENTER CONTENT + SEARCH
// The single source of truth for Rally's Help Center. Real,
// Rally-specific articles grouped into categories. Consumed by
// HelpCenter.jsx, HelpArticle.jsx, and the in-app HelpWidget.
//
// Article shape:
//   { slug, category, title, summary, updated, read, keywords,
//     sections: [{ h, blocks: [...] }], faqs?: [{q,a}], related?: [slug] }
//
// A block is one of:
//   'a plain paragraph string'
//   { steps: ['do this', 'then this'] }      -> ordered list
//   { bullets: ['point', 'point'] }          -> unordered list
//   { note: 'a callout / tip' }              -> highlighted aside
//
// NO em-dash / en-dash anywhere. ASCII hyphen only.
// ============================================================

export const CATEGORIES = [
  { name: 'Getting started', icon: 'rocket',   blurb: 'Set up your workspace and learn the essentials.' },
  { name: 'Importing data',  icon: 'download',  blurb: 'Bring your contacts, companies, and deals into Rally.' },
  { name: 'Deals + pipeline', icon: 'target',   blurb: 'Track opportunities from first touch to closed won.' },
  { name: 'Rook AI',         icon: 'sparkles',  blurb: 'Put the AI operator to work across your revenue.' },
  { name: 'Quotes + billing', icon: 'receipt',  blurb: 'Quote, invoice, and get paid without leaving Rally.' },
  { name: 'Automations',     icon: 'workflow',  blurb: 'Automate the busywork with workflows and sequences.' },
  { name: 'Admin + security', icon: 'shield',   blurb: 'Manage roles, permissions, and your data.' },
  { name: 'Integrations',    icon: 'plug',      blurb: 'Connect Rally to email, calendar, and your stack.' },
];

export const ARTICLES = [
  // ---------------------------------------------------------- Getting started
  {
    slug: 'getting-started-rally',
    category: 'Getting started',
    title: 'Getting started with Rally',
    summary: 'Create your workspace, load your data, and close your first deal in under an hour.',
    updated: '2026-07-10', read: 4,
    keywords: ['setup', 'onboarding', 'first steps', 'account', 'new', 'begin', 'workspace'],
    sections: [
      { h: 'What Rally is', blocks: [
        'Rally is an AI-native revenue platform: CRM, quoting, billing, forecasting, and automation in one place, with an AI operator named Rook that can do the work for you. Everything is alive on first load, so you are never staring at an empty screen.',
      ] },
      { h: 'Your first 30 minutes', blocks: [
        { steps: [
          'Sign in at /app and finish the short onboarding to name your workspace and pick your currency and pipeline template.',
          'Import your contacts and companies from a CSV or connect your old CRM (see Importing data).',
          'Connect your email and calendar so activity logs itself against the right records.',
          'Invite your team and assign roles from Settings > Team.',
          'Ask Rook to build your first deal: open the Rook dock and type "create a deal for Acme worth 40k closing next month".',
        ] },
      ] },
      { h: 'Find your way around', blocks: [
        'The left rail groups the product into Sell, Marketing, Deliver, Retain, Service, Revenue, Intelligence, Automate, and Admin. The Command center at /app is your daily home base.',
        { note: 'Press Cmd+K (Ctrl+K on Windows) anywhere to search records, jump to any screen, or run a command without touching the mouse.' },
      ] },
    ],
    faqs: [
      { q: 'Do I need a credit card to start?', a: 'No. You can set up your workspace, import data, and explore the full product before choosing a plan.' },
      { q: 'How long does setup take?', a: 'Most teams are importing data and working deals within the first hour. Rook can automate most of the manual setup.' },
    ],
    related: ['command-center-tour', 'invite-your-team', 'import-csv'],
  },
  {
    slug: 'command-center-tour',
    category: 'Getting started',
    title: 'Tour the command center',
    summary: 'The command center is your daily home base. Here is what every panel does and how to make it yours.',
    updated: '2026-07-10', read: 3,
    keywords: ['command center', 'dashboard', 'home', 'overview', 'my day', 'widgets'],
    sections: [
      { h: 'What you see on load', blocks: [
        'The command center at /app opens on a live snapshot of your revenue: pipeline value by stage, deals that need attention today, your open tasks, and a Rook briefing that summarizes what changed since you last logged in.',
        { bullets: [
          'Pipeline summary: total open value, weighted forecast, and win rate trend.',
          'Needs attention: deals with no next step, stalled deals, and quotes waiting on a signature.',
          'My day: your calls, meetings, and tasks, pulled from Activities.',
          'Rook briefing: a plain-English read on momentum and risks, refreshed each morning.',
        ] },
      ] },
      { h: 'Make it yours', blocks: [
        'Every metric tile is clickable and drills into the filtered list behind the number, so you always know where a figure comes from. Use the theme toggle in the top bar to switch between light and dark.',
        { note: 'If a section is not relevant to your team, an admin can turn the matching module off in Settings and it disappears from the rail and the command center.' },
      ] },
    ],
    related: ['getting-started-rally', 'forecasting-basics', 'meet-rook'],
  },
  {
    slug: 'invite-your-team',
    category: 'Getting started',
    title: 'Invite your team and set roles',
    summary: 'Add teammates, assign roles, and control who can see and change what.',
    updated: '2026-07-10', read: 3,
    keywords: ['invite', 'team', 'users', 'seats', 'roles', 'members', 'add people'],
    sections: [
      { h: 'Send invites', blocks: [
        { steps: [
          'Go to Settings > Team.',
          'Click Invite and enter one or more email addresses.',
          'Pick a role for each person (see Roles and permissions).',
          'Send. Invitees get an email link and land in a short onboarding the first time they sign in.',
        ] },
      ] },
      { h: 'Assign ownership', blocks: [
        'Records in Rally have an owner. When you invite a rep you can reassign leads, deals, and accounts to them in bulk from any list view: select the rows, then use the owner action in the toolbar.',
        { note: 'Reassigning does not lose history. The audit log records who changed ownership and when.' },
      ] },
    ],
    related: ['roles-and-permissions', 'audit-log', 'getting-started-rally'],
  },

  // ---------------------------------------------------------- Importing data
  {
    slug: 'import-csv',
    category: 'Importing data',
    title: 'Import contacts and companies from CSV',
    summary: 'Map your spreadsheet columns to Rally fields and import cleanly, with duplicates caught automatically.',
    updated: '2026-07-10', read: 4,
    keywords: ['import', 'csv', 'spreadsheet', 'upload', 'contacts', 'companies', 'excel', 'mapping'],
    sections: [
      { h: 'Prepare your file', blocks: [
        'Export your data to a CSV with a header row. One row per record. Rally reads common column names automatically, but you can map anything by hand in the next step.',
        { bullets: [
          'Contacts: name, email, phone, title, company, owner.',
          'Companies: name, domain, industry, size, owner.',
          'Keep emails and domains clean so Rally can link contacts to the right company and catch duplicates.',
        ] },
      ] },
      { h: 'Run the import', blocks: [
        { steps: [
          'Open Import data from the Admin section of the rail.',
          'Choose the record type and drop in your CSV.',
          'Confirm the column mapping. Rally pre-fills the obvious matches and flags anything it is unsure about.',
          'Review the preview, including any duplicate warnings, then start the import.',
        ] },
        { note: 'Large files import in the background. You can keep working and Rally will notify you when it finishes.' },
      ] },
    ],
    faqs: [
      { q: 'What happens to duplicates?', a: 'Rally matches on email and domain and flags likely duplicates before import so you can merge instead of creating a second record. See Find and merge duplicate records.' },
      { q: 'Can I undo an import?', a: 'Yes. Each import is tracked as a batch, so an admin can roll back a bad import from Import data.' },
    ],
    related: ['migrate-from-your-crm', 'deduplicate-records', 'getting-started-rally'],
  },
  {
    slug: 'migrate-from-your-crm',
    category: 'Importing data',
    title: 'Migrate from Salesforce, HubSpot, or Pipedrive',
    summary: 'Move contacts, companies, deals, and history off your old CRM without dropping data.',
    updated: '2026-07-10', read: 5,
    keywords: ['migrate', 'migration', 'salesforce', 'hubspot', 'pipedrive', 'switch', 'move', 'transfer'],
    sections: [
      { h: 'Plan the move', blocks: [
        'Migrate in the order records depend on each other so links survive: companies first, then contacts, then deals, then activities and notes. Rally re-links records by email and domain as it goes.',
      ] },
      { h: 'Two ways to migrate', blocks: [
        { bullets: [
          'Export and import: export each object from your old CRM to CSV and import them in order (see Import contacts and companies from CSV). Best when you want full control of the mapping.',
          'Ask Rook: paste an export or point Rook at a connected source and ask it to map fields, clean values, and stage the import for your review.',
        ] },
      ] },
      { h: 'After the import', blocks: [
        { steps: [
          'Spot check a handful of accounts to confirm contacts, deals, and owners linked correctly.',
          'Rebuild your pipeline stages to match how your team actually sells (see Customize your pipeline stages).',
          'Reconnect email and calendar so future activity logs itself.',
          'Turn on any workflows and sequences you relied on before.',
        ] },
        { note: 'Keep your old CRM read-only for a couple of weeks as a safety net before you fully switch off.' },
      ] },
    ],
    related: ['import-csv', 'deduplicate-records', 'customize-pipeline-stages'],
  },
  {
    slug: 'deduplicate-records',
    category: 'Importing data',
    title: 'Find and merge duplicate records',
    summary: 'Keep one clean record per person and company. Merge duplicates without losing history.',
    updated: '2026-07-10', read: 3,
    keywords: ['duplicate', 'merge', 'dedupe', 'clean', 'data quality', 'combine'],
    sections: [
      { h: 'How Rally spots duplicates', blocks: [
        'Rally matches contacts on email and companies on domain, and surfaces likely duplicates during import and as you create records. A duplicate warning appears inline so you can merge before the mess grows.',
      ] },
      { h: 'Merge two records', blocks: [
        { steps: [
          'Open either record and choose Merge, or select two rows in a list view and use the merge action.',
          'Pick which record is the primary. Its owner and key fields win by default.',
          'Review the field-by-field preview and choose a value where the two disagree.',
          'Confirm. Related deals, activities, notes, and files move onto the surviving record.',
        ] },
        { note: 'Merges are recorded in the audit log and the surviving record keeps the full combined history.' },
      ] },
    ],
    related: ['import-csv', 'migrate-from-your-crm', 'data-security'],
  },

  // ---------------------------------------------------------- Deals + pipeline
  {
    slug: 'create-and-manage-deals',
    category: 'Deals + pipeline',
    title: 'Create and manage deals',
    summary: 'Add opportunities, keep them moving, and never leave a deal without a next step.',
    updated: '2026-07-10', read: 4,
    keywords: ['deals', 'opportunities', 'pipeline', 'create deal', 'stage', 'close date', 'amount'],
    sections: [
      { h: 'Create a deal', blocks: [
        { steps: [
          'Click New deal from the top bar, or open Deals and add one from the board.',
          'Link a company and the contacts involved, set an amount and a close date, and choose a stage.',
          'Add the next step so the deal never goes quiet.',
        ] },
        { note: 'Faster: open the Rook dock and say "create a deal for Northwind, 25k, closing end of quarter". Rook fills in the record and links the account.' },
      ] },
      { h: 'Move deals through the pipeline', blocks: [
        'The Deals board is a kanban by stage. Drag a card to advance it, or open a deal to update fields, log activity, attach a quote, and see the full timeline. The card header always stays readable, even in narrow columns.',
        { bullets: [
          'Weighted value updates as you change stage and amount.',
          'Deals with no next step are flagged as needing attention on the command center.',
          'Everything you change is captured in the deal timeline and the audit log.',
        ] },
      ] },
    ],
    faqs: [
      { q: 'How do I mark a deal won or lost?', a: 'Move it to the Closed won or Closed lost stage. Rally records the close date and, for lost deals, prompts for a reason you can report on later.' },
    ],
    related: ['customize-pipeline-stages', 'forecasting-basics', 'build-a-quote'],
  },
  {
    slug: 'customize-pipeline-stages',
    category: 'Deals + pipeline',
    title: 'Customize your pipeline stages',
    summary: 'Shape the pipeline around how your team actually sells, with your own stages and win probabilities.',
    updated: '2026-07-10', read: 3,
    keywords: ['pipeline', 'stages', 'customize', 'probability', 'sales process', 'kanban', 'configure'],
    sections: [
      { h: 'Edit your stages', blocks: [
        { steps: [
          'Go to Settings and open the pipeline configuration.',
          'Rename, reorder, add, or remove stages so they match your real process.',
          'Set a win probability for each stage. Rally uses it to weight your forecast.',
          'Save. The Deals board and forecast update immediately.',
        ] },
      ] },
      { h: 'Good stage design', blocks: [
        { bullets: [
          'Name stages after buyer actions, not internal tasks, so a glance at the board tells you what is true.',
          'Keep it to five to seven stages. Too many and reps stop keeping them accurate.',
          'Make the exit criteria for each stage obvious so two reps would stage the same deal the same way.',
        ] },
        { note: 'You can run more than one pipeline if you sell in distinct motions, for example new business and renewals.' },
      ] },
    ],
    related: ['create-and-manage-deals', 'forecasting-basics'],
  },
  {
    slug: 'forecasting-basics',
    category: 'Deals + pipeline',
    title: 'Forecast revenue with Rally',
    summary: 'Turn your pipeline into a number you can commit to, with weighted and AI-adjusted forecasts.',
    updated: '2026-07-10', read: 4,
    keywords: ['forecast', 'forecasting', 'revenue', 'quota', 'pipeline coverage', 'commit', 'projection'],
    sections: [
      { h: 'How the forecast is built', blocks: [
        'Forecasting at /forecasting rolls your open deals into a projection by close date. You can view raw pipeline, weighted pipeline (amount times stage probability), and Rook\'s AI-adjusted call, which factors in deal age, engagement, and how similar deals actually closed.',
      ] },
      { h: 'Work your forecast', blocks: [
        { bullets: [
          'Compare commit, best case, and pipeline against quota for the period.',
          'Watch pipeline coverage: the ratio of open pipeline to your target. Under 3x usually means you need more top of funnel.',
          'Drill into any number to see the exact deals behind it. No figure in Rally is a black box.',
        ] },
        { note: 'Ask Rook "what is my risk to forecast this quarter" and it will point at the specific deals dragging the number down.' },
      ] },
    ],
    faqs: [
      { q: 'What is weighted pipeline?', a: 'Each deal amount multiplied by the win probability of its stage, summed up. It is a more honest number than raw pipeline because it discounts early-stage deals.' },
    ],
    related: ['customize-pipeline-stages', 'create-and-manage-deals', 'meet-rook'],
  },

  // ---------------------------------------------------------- Rook AI
  {
    slug: 'meet-rook',
    category: 'Rook AI',
    title: 'Meet Rook, your AI operator',
    summary: 'Rook is the AI built into every corner of Rally. It does the work, not just the chat.',
    updated: '2026-07-10', read: 3,
    keywords: ['rook', 'ai', 'operator', 'assistant', 'agent', 'copilot', 'automation'],
    sections: [
      { h: 'What Rook is', blocks: [
        'Rook is an AI operator that lives in every module of Rally. Open the Rook dock from anywhere and ask in plain language. Instead of just answering, Rook takes action: it creates records, drafts emails, builds quotes, updates deals, and pulls reports, then shows you exactly what it did.',
      ] },
      { h: 'Where to find it', blocks: [
        { bullets: [
          'The Rook dock is available on every product screen, docked out of the way of your work.',
          'Rook is grounded in your live data, so answers reflect the real state of your pipeline, not a stale snapshot.',
          'Every action Rook takes is written to the audit log with your name on it, so you stay in control.',
        ] },
        { note: 'New to Rook? Start with "summarize my pipeline" or "what needs my attention today".' },
      ] },
    ],
    related: ['rook-commands', 'rook-guardrails', 'command-center-tour'],
  },
  {
    slug: 'rook-commands',
    category: 'Rook AI',
    title: 'What you can ask Rook to do',
    summary: 'A practical menu of things Rook can do for you across sales, quoting, and reporting.',
    updated: '2026-07-10', read: 4,
    keywords: ['rook', 'commands', 'prompts', 'examples', 'ask', 'what can rook do', 'ai tasks'],
    sections: [
      { h: 'Records and pipeline', blocks: [
        { bullets: [
          '"Create a deal for Acme worth 40k closing next month and link Jane Doe."',
          '"Move the Northwind deal to Negotiation and set a follow up for Friday."',
          '"Which deals have gone quiet for more than two weeks?"',
          '"Log a call with the Contoso champion and summarize what we discussed."',
        ] },
      ] },
      { h: 'Quotes, email, and reporting', blocks: [
        { bullets: [
          '"Build a quote for Acme: 25 seats of Pro annual with a 10 percent discount."',
          '"Draft a follow up email to the Contoso deal referencing our last call."',
          '"Show me win rate by rep this quarter."',
          '"What is my forecast risk and which deals are dragging it down?"',
        ] },
        { note: 'Rook always shows a preview of what it is about to change so you can approve, tweak, or cancel before anything is saved.' },
      ] },
    ],
    related: ['meet-rook', 'rook-guardrails', 'workflow-basics'],
  },
  {
    slug: 'rook-guardrails',
    category: 'Rook AI',
    title: 'How Rook stays accurate and safe',
    summary: 'Rook is grounded in your data, previews its actions, and logs everything. Here is how the guardrails work.',
    updated: '2026-07-10', read: 3,
    keywords: ['rook', 'safety', 'accuracy', 'guardrails', 'grounding', 'trust', 'hallucination', 'permissions'],
    sections: [
      { h: 'Grounded, not guessing', blocks: [
        'Rook answers from your live Rally data, not from a general memory of the internet. When it does not have enough to go on, it says so and asks, instead of inventing an answer.',
      ] },
      { h: 'You stay in control', blocks: [
        { bullets: [
          'Preview before commit: Rook shows the exact records and fields it will change and waits for your go-ahead.',
          'Permissions apply: Rook can only touch what your role can touch. It cannot see or change data you are not allowed to.',
          'Full audit trail: every Rook action is written to the audit log with a timestamp and the user who ran it.',
        ] },
        { note: 'If Rook ever gets something wrong, you can undo the action and the original state is restored from the record history.' },
      ] },
    ],
    related: ['meet-rook', 'data-security', 'audit-log'],
  },

  // ---------------------------------------------------------- Quotes + billing
  {
    slug: 'build-a-quote',
    category: 'Quotes + billing',
    title: 'Build and send a quote',
    summary: 'Turn a deal into a branded quote with line items, discounts, and a signature request.',
    updated: '2026-07-10', read: 4,
    keywords: ['quote', 'proposal', 'line items', 'discount', 'send quote', 'signature', 'cpq'],
    sections: [
      { h: 'Create the quote', blocks: [
        { steps: [
          'Open a deal and choose New quote, or start from Quotes directly.',
          'Add line items from your product catalog. Pricing, terms, and taxes pull in automatically.',
          'Apply any discount, at the line level or across the whole quote.',
          'Preview the branded document, then send it for review or signature.',
        ] },
        { note: 'Ask Rook to draft the whole quote in one line: "quote Acme for 25 Pro seats annual with 10 percent off".' },
      ] },
      { h: 'Track and close', blocks: [
        'Once sent, the quote shows its status on the deal: viewed, accepted, or signed. When a quote is accepted, Rally can create the invoice so nothing falls through the cracks between sales and billing.',
        { bullets: [
          'Version quotes safely: sending a revision keeps the old one for the record.',
          'Signed quotes link back to the deal and forward to billing.',
        ] },
      ] },
    ],
    related: ['products-and-pricing', 'invoices-and-payments', 'create-and-manage-deals'],
  },
  {
    slug: 'products-and-pricing',
    category: 'Quotes + billing',
    title: 'Set up your product catalog and pricing',
    summary: 'Define what you sell once, then quote and invoice it consistently everywhere.',
    updated: '2026-07-10', read: 3,
    keywords: ['products', 'catalog', 'pricing', 'sku', 'price book', 'billing frequency', 'plans'],
    sections: [
      { h: 'Add your products', blocks: [
        { steps: [
          'Open Products from the Revenue section of the rail.',
          'Add each product or plan with a name, price, and billing frequency (one time, monthly, or annual).',
          'Set any tiers, units, or optional add ons you sell.',
        ] },
      ] },
      { h: 'Keep pricing consistent', blocks: [
        'Because quotes and invoices both draw from the same catalog, a price change flows everywhere and your documents stay consistent. Discounts are applied on the quote, so your list price stays intact for reporting.',
        { note: 'Selling in more than one currency? Set a currency on the product and Rally keeps quotes and invoices in the right one.' },
      ] },
    ],
    related: ['build-a-quote', 'invoices-and-payments'],
  },
  {
    slug: 'invoices-and-payments',
    category: 'Quotes + billing',
    title: 'Invoices and getting paid',
    summary: 'Send invoices from accepted quotes, track what is owed, and see cash flowing into your revenue picture.',
    updated: '2026-07-10', read: 3,
    keywords: ['invoice', 'billing', 'payment', 'paid', 'accounts receivable', 'collect', 'overdue'],
    sections: [
      { h: 'From quote to invoice', blocks: [
        'When a quote is accepted, create the invoice in a click. Line items, terms, and taxes carry over, so billing matches exactly what the customer agreed to.',
      ] },
      { h: 'Track what you are owed', blocks: [
        { bullets: [
          'See every invoice by status: draft, sent, paid, or overdue, from the Billing screen.',
          'Overdue invoices surface on the command center so collections do not slip.',
          'Paid invoices feed your revenue reporting so pipeline and cash tell one story.',
        ] },
        { note: 'Ask Rook "what is overdue and who do I need to chase" to get a prioritized list in seconds.' },
      ] },
    ],
    related: ['build-a-quote', 'products-and-pricing', 'forecasting-basics'],
  },

  // ---------------------------------------------------------- Automations
  {
    slug: 'workflow-basics',
    category: 'Automations',
    title: 'Automate work with Workflows',
    summary: 'Build if-this-then-that automations that handle the repetitive work for you.',
    updated: '2026-07-10', read: 4,
    keywords: ['workflow', 'automation', 'trigger', 'action', 'rules', 'automate', 'no code'],
    sections: [
      { h: 'How workflows work', blocks: [
        'A workflow is a trigger plus one or more actions. When the trigger fires, Rally runs the actions automatically. No code, no waiting. Build them at /workflows.',
        { bullets: [
          'Trigger: something happens, for example a deal enters a stage or a lead is created.',
          'Conditions: optional filters, for example only when amount is over 50k.',
          'Actions: what Rally does, for example assign an owner, create a task, or send an email.',
        ] },
      ] },
      { h: 'Build your first one', blocks: [
        { steps: [
          'Open Workflows and create a new one.',
          'Choose a trigger, such as "deal moved to Negotiation".',
          'Add conditions if you only want it to run some of the time.',
          'Add actions, such as "create a follow up task for the owner" and "notify the manager".',
          'Turn it on. You can test with a single record first.',
        ] },
        { note: 'Not sure where to start? Ask Rook "automate a task whenever a deal has no next step for three days" and it will draft the workflow for you.' },
      ] },
    ],
    related: ['workflow-triggers-actions', 'sequences-and-cadences', 'meet-rook'],
  },
  {
    slug: 'sequences-and-cadences',
    category: 'Automations',
    title: 'Run sales sequences and cadences',
    summary: 'Put outreach on autopilot with multi-step email and task sequences that pause when a prospect replies.',
    updated: '2026-07-10', read: 3,
    keywords: ['sequence', 'cadence', 'outreach', 'follow up', 'email steps', 'prospecting', 'nurture'],
    sections: [
      { h: 'Sequences vs workflows', blocks: [
        'Use a sequence for time-based outreach to a person: a series of emails and call or task steps spaced over days. Use a workflow for event-based automation on records. They work well together.',
      ] },
      { h: 'Build and enroll', blocks: [
        { steps: [
          'Open Sequences and create a new one.',
          'Add steps: emails with delays between them, plus call or task reminders for the human touches.',
          'Enroll contacts from any list view, or let a workflow enroll them automatically.',
          'The sequence pauses for anyone who replies, so you never send a "just following up" after they already answered.',
        ] },
        { note: 'Keep sequences short and human. Three to five steps that sound like you beat a ten step blast every time.' },
      ] },
    ],
    related: ['workflow-basics', 'connect-email-calendar'],
  },
  {
    slug: 'workflow-triggers-actions',
    category: 'Automations',
    title: 'Triggers and actions reference',
    summary: 'The building blocks you can combine to automate almost anything in Rally.',
    updated: '2026-07-10', read: 3,
    keywords: ['triggers', 'actions', 'reference', 'workflow', 'events', 'automation building blocks'],
    sections: [
      { h: 'Common triggers', blocks: [
        { bullets: [
          'Record created: a new lead, contact, company, deal, or quote.',
          'Field changed: a deal stage, amount, owner, or status changes.',
          'Time based: a close date approaches or a record sits untouched for N days.',
          'Quote or invoice event: a quote is accepted or an invoice becomes overdue.',
        ] },
      ] },
      { h: 'Common actions', blocks: [
        { bullets: [
          'Create a task or activity and assign it to the owner or a manager.',
          'Update fields: set an owner, stage, priority, or status.',
          'Send an email or enroll the contact in a sequence.',
          'Notify a person or channel, or ask Rook to draft a next step.',
        ] },
        { note: 'Chain multiple actions in one workflow. They run in order, so you can update a record and then notify someone about the change.' },
      ] },
    ],
    related: ['workflow-basics', 'sequences-and-cadences'],
  },

  // ---------------------------------------------------------- Admin + security
  {
    slug: 'roles-and-permissions',
    category: 'Admin + security',
    title: 'Roles and permissions',
    summary: 'Control who can see and change what with roles that match how your team is structured.',
    updated: '2026-07-10', read: 4,
    keywords: ['roles', 'permissions', 'access', 'admin', 'manager', 'rep', 'security', 'visibility'],
    sections: [
      { h: 'The default roles', blocks: [
        { bullets: [
          'Admin: full access, including settings, team, billing, and configuration.',
          'Manager: sees the whole team\'s data and reporting, manages their reports\' records.',
          'Rep: works their own records and shared data, without admin settings.',
          'Read only: can view but not change, useful for execs and finance.',
        ] },
      ] },
      { h: 'Assign and refine', blocks: [
        { steps: [
          'Open Settings > Team and set a role on each person.',
          'Use ownership and territory rules to control which records a rep sees.',
          'Review access periodically, especially after someone changes teams or leaves.',
        ] },
        { note: 'Rook always respects the acting user\'s permissions. It can never surface or change data the person is not allowed to touch.' },
      ] },
    ],
    related: ['invite-your-team', 'data-security', 'audit-log'],
  },
  {
    slug: 'data-security',
    category: 'Admin + security',
    title: 'How Rally protects your data',
    summary: 'Encryption, access controls, and a full audit trail keep your revenue data safe.',
    updated: '2026-07-10', read: 3,
    keywords: ['security', 'data', 'encryption', 'privacy', 'compliance', 'protection', 'backup', 'trust'],
    sections: [
      { h: 'How your data is protected', blocks: [
        { bullets: [
          'Encryption in transit and at rest, so your data is protected on the wire and on disk.',
          'Role-based access control, so people only see what their role allows.',
          'A complete audit log of who changed what and when.',
          'Record history, so changes can be reviewed and reverted.',
        ] },
      ] },
      { h: 'Your responsibilities', blocks: [
        'Security is shared. Use strong, unique passwords, keep roles tight, and remove access promptly when someone leaves. Review the audit log regularly for anything unexpected.',
        { note: 'For the current live status of the platform and its dependencies, see the public status page at /status.' },
      ] },
    ],
    related: ['roles-and-permissions', 'audit-log', 'rook-guardrails'],
  },
  {
    slug: 'audit-log',
    category: 'Admin + security',
    title: 'Track changes with the audit log',
    summary: 'Every meaningful change in Rally is recorded. Here is how to read and use the audit log.',
    updated: '2026-07-10', read: 3,
    keywords: ['audit', 'log', 'history', 'changes', 'accountability', 'who changed', 'tracking'],
    sections: [
      { h: 'What gets logged', blocks: [
        'The audit log at /audit records who did what and when: record creates and edits, ownership changes, merges, deletes, permission changes, and every action Rook takes on a user\'s behalf.',
      ] },
      { h: 'Investigate a change', blocks: [
        { steps: [
          'Open the Audit log from the Admin section.',
          'Filter by user, record, or date range to narrow in.',
          'Open an entry to see the before and after values of the change.',
        ] },
        { note: 'When a record looks wrong, the audit log tells you the exact change and who made it, so you can fix the cause, not just the symptom.' },
      ] },
    ],
    related: ['data-security', 'roles-and-permissions', 'rook-guardrails'],
  },

  // ---------------------------------------------------------- Integrations
  {
    slug: 'connect-email-calendar',
    category: 'Integrations',
    title: 'Connect email and calendar',
    summary: 'Log emails and meetings automatically against the right records, and send from Rally.',
    updated: '2026-07-10', read: 3,
    keywords: ['email', 'calendar', 'gmail', 'outlook', 'sync', 'connect', 'activity logging'],
    sections: [
      { h: 'Connect your accounts', blocks: [
        { steps: [
          'Open Integrations from the Admin section.',
          'Connect your email and calendar provider and grant access.',
          'Choose what to sync: emails to and from your contacts, and meetings on your calendar.',
        ] },
      ] },
      { h: 'What you get', blocks: [
        { bullets: [
          'Emails and meetings log themselves against the matching contact and deal, so the timeline stays complete without manual effort.',
          'Send emails from inside Rally and have them tracked automatically.',
          'Sequences send through your connected mailbox so replies come back to you.',
        ] },
        { note: 'Only correspondence with people already in Rally is logged. Personal email stays private.' },
      ] },
    ],
    related: ['sequences-and-cadences', 'available-integrations'],
  },
  {
    slug: 'api-and-webhooks',
    category: 'Integrations',
    title: 'Build with the Rally API and webhooks',
    summary: 'Read and write your data programmatically, and get notified in real time when things change.',
    updated: '2026-07-10', read: 4,
    keywords: ['api', 'webhooks', 'developers', 'integration', 'rest', 'token', 'automation', 'build'],
    sections: [
      { h: 'Get an API key', blocks: [
        { steps: [
          'Open the Developers area from the Admin section of the rail.',
          'Create an API key and store it somewhere safe. Treat it like a password.',
          'Use the key to authenticate requests to the Rally API.',
        ] },
        { note: 'Never paste an API key into client-side code or a public repo. Keys carry the permissions of the account that created them.' },
      ] },
      { h: 'Webhooks for real-time events', blocks: [
        'Register a webhook to receive a POST whenever something happens in Rally, for example a deal is won or an invoice is paid. Your endpoint gets the event payload so you can react in your own systems without polling.',
        { bullets: [
          'Subscribe only to the events you need.',
          'Verify the signature on incoming webhooks to confirm they came from Rally.',
          'Respond quickly and process asynchronously so a slow handler never blocks delivery.',
        ] },
      ] },
    ],
    related: ['available-integrations', 'connect-email-calendar'],
  },
  {
    slug: 'available-integrations',
    category: 'Integrations',
    title: 'Available integrations',
    summary: 'Connect Rally to the tools your team already uses across email, calendar, and the wider stack.',
    updated: '2026-07-10', read: 2,
    keywords: ['integrations', 'apps', 'connect', 'stack', 'tools', 'marketplace', 'zapier'],
    sections: [
      { h: 'Native connections', blocks: [
        { bullets: [
          'Email and calendar: log activity automatically and send from Rally.',
          'Meeting and calling tools: capture calls and notes onto the right records.',
          'Data enrichment: keep contacts and companies fresh.',
        ] },
      ] },
      { h: 'Build your own', blocks: [
        'If a tool you use is not a native connection yet, the API and webhooks let you wire it up. Many teams also bridge Rally to other apps through general automation platforms.',
        { note: 'Manage every connection in one place from Integrations, and see exactly what each one can access.' },
      ] },
    ],
    related: ['connect-email-calendar', 'api-and-webhooks'],
  },
];

// ---------------------------------------------------------- helpers

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}

export function articlesByCategory(category) {
  return ARTICLES.filter((a) => a.category === category);
}

// Flatten every text bit of an article into one lowercase haystack for search.
function haystack(a) {
  const parts = [a.title, a.summary, a.category, ...(a.keywords || [])];
  (a.sections || []).forEach((s) => {
    if (s.h) parts.push(s.h);
    (s.blocks || []).forEach((b) => {
      if (typeof b === 'string') parts.push(b);
      else if (b.steps) parts.push(...b.steps);
      else if (b.bullets) parts.push(...b.bullets);
      else if (b.note) parts.push(b.note);
    });
  });
  (a.faqs || []).forEach((f) => { parts.push(f.q, f.a); });
  return parts.join(' \n ').toLowerCase();
}

// Lightweight scored search. Title/summary/keyword hits rank above body hits.
export function searchArticles(query, limit = 8) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const a of ARTICLES) {
    const title = a.title.toLowerCase();
    const summary = a.summary.toLowerCase();
    const keys = (a.keywords || []).join(' ').toLowerCase();
    const body = haystack(a);
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 10;
      if (keys.includes(t)) score += 6;
      if (summary.includes(t)) score += 4;
      else if (body.includes(t)) score += 2;
    }
    // Exact-phrase bonus.
    if (title.includes(q)) score += 8;
    if (score > 0) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((s) => s.a);
}

// Related articles: explicit `related` slugs first, then same-category fill.
export function relatedArticles(article, n = 3) {
  if (!article) return [];
  const out = [];
  const seen = new Set([article.slug]);
  for (const slug of article.related || []) {
    const r = getArticle(slug);
    if (r && !seen.has(r.slug)) { out.push(r); seen.add(r.slug); }
  }
  if (out.length < n) {
    for (const r of articlesByCategory(article.category)) {
      if (out.length >= n) break;
      if (!seen.has(r.slug)) { out.push(r); seen.add(r.slug); }
    }
  }
  return out.slice(0, n);
}

// All FAQs across articles (used for the Help Center FAQ JSON-LD).
export function allFaqs() {
  const faqs = [];
  ARTICLES.forEach((a) => (a.faqs || []).forEach((f) => faqs.push(f)));
  return faqs;
}
