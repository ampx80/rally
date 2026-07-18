// migrations dataset - one "migrate from X to Ardovo" playbook per tool. Real,
// specific export steps, field mapping, Rook-assisted rebuild, validation, and
// go-live. NO em-dash / en-dash. ASCII hyphen only.

const YEAR = 2026;

/* What transfers, by source kind. */
const TRANSFERS = {
  crm: [
    'Accounts and companies with their fields and record owners',
    'Contacts with full details and email history where exported',
    'Deals and opportunities with stage, value, and close date',
    'Activity history: notes, calls, emails, and tasks',
    'Custom fields mapped to matching Ardovo custom fields',
  ],
  sheet: [
    'Every contact and company row becomes a Ardovo record',
    'Deal rows with stage, value, and close date if your sheet tracks them',
    'Any custom columns mapped to Ardovo custom fields',
    'Owner or rep assignment where the sheet records it',
  ],
  marketing: [
    'Contacts and companies with their fields',
    'Deal or opportunity data if you tracked it',
    'Tags and list membership mapped to Ardovo fields or segments',
    'Custom fields mapped to matching Ardovo custom fields',
  ],
  engagement: [
    'Prospects and accounts with their fields',
    'Deal data if your system of record holds it',
    'Custom fields mapped to matching Ardovo custom fields',
    'Activity and outcomes where they were exported',
  ],
};

const MIG = {
  salesforce: {
    name: 'Salesforce',
    kind: 'crm',
    exportBody:
      'In Salesforce, use the Data Export tool (Setup > Data > Data Export) or the Data Loader to pull Accounts, Contacts, Leads, Opportunities, and Activities as CSV. Include record IDs so relationships between objects can be rebuilt cleanly on import.',
    gotchas: [
      'Salesforce record IDs are not portable, so relationships are re-linked by email and account name on import. Export IDs anyway to spot-check the matches.',
      'Apex triggers, flows, and validation rules do not transfer. List your active automations first, then rebuild the ones you still need as Ardovo workflows.',
      'Managed-package fields often carry data you no longer use. Migration is the moment to leave that clutter behind.',
    ],
    timelineExtra: 'Larger Salesforce orgs with heavy customization sit at the two-week end; a clean mid-market instance can go live the same week.',
  },
  hubspot: {
    name: 'HubSpot',
    kind: 'crm',
    exportBody:
      'In HubSpot, go to Settings > Import & Export > Export, and export Contacts, Companies, Deals, and Engagements as CSV. You can also export directly from each object list view with your chosen columns.',
    gotchas: [
      'HubSpot workflows and sequences do not export as files. Screenshot or list your active ones, then rebuild them in Ardovo.',
      'Deal stages are pipeline-specific in HubSpot, so map each pipeline to a Ardovo pipeline during import.',
      'Marketing email history and form submissions live in the Marketing Hub; export what you need before downgrading or cancelling.',
    ],
    timelineExtra: 'Most HubSpot teams are live within a week; multiple pipelines and heavy workflow use push it toward two.',
  },
  zoho: {
    name: 'Zoho CRM',
    kind: 'crm',
    exportBody:
      'In Zoho CRM, use Setup > Data Administration > Export to download Leads, Contacts, Accounts, Deals, and Activities as CSV, or export each module from its list view.',
    gotchas: [
      'Zoho modules can hold overlapping data across apps (CRM, Campaigns, Desk). Decide which module is the source of truth before you export.',
      'Zoho blueprints and workflow rules do not transfer; rebuild the active ones as Ardovo workflows.',
      'Layout-specific and multi-module fields need mapping care so values land on the right Ardovo object.',
    ],
    timelineExtra: 'A single-module Zoho setup migrates in days; multi-app Zoho estates take longer to untangle.',
  },
  pipedrive: {
    name: 'Pipedrive',
    kind: 'crm',
    exportBody:
      'In Pipedrive, go to Settings > Export data, or use each list view export, to pull Organizations, People, Deals, and Activities as CSV or Excel.',
    gotchas: [
      'Pipedrive custom fields are per-object; confirm each maps to the right Ardovo object (company vs contact vs deal).',
      'Pipedrive automations and Smart Docs do not transfer; rebuild active automations in Ardovo.',
      'Lost and won deals both matter for reporting history, so export closed deals too, not just open ones.',
    ],
    timelineExtra: 'Pipedrive migrations are usually fast, often live within a few days given the simpler data model.',
  },
  netsuite: {
    name: 'NetSuite',
    kind: 'crm',
    exportBody:
      'In NetSuite, run saved searches for Customers, Contacts, and Opportunities and export the results to CSV, or use the CSV export on each list. Involve your NetSuite admin for the searches.',
    gotchas: [
      'NetSuite ties CRM records to financial records; decide which fields belong in the CRM versus staying in the ERP.',
      'SuiteFlow automations and scripts do not transfer; rebuild the sales-side ones in Ardovo.',
      'Permissions and role complexity in NetSuite do not map one to one, so plan Ardovo RBAC fresh.',
    ],
    timelineExtra: 'Front-office data moves in about a week; keep NetSuite for finance and let Ardovo own the revenue workflow.',
  },
  monday: {
    name: 'monday CRM',
    kind: 'crm',
    exportBody:
      'In monday CRM, export each board (Contacts, Accounts, Deals) to Excel from the board menu. Each item becomes a row with its column values.',
    gotchas: [
      'monday columns are loosely typed, so clean up status and date columns before import for a clean field mapping.',
      'monday automations (recipes) do not transfer; rebuild the sales ones as Ardovo workflows.',
      'Linked-board relationships flatten on export, so confirm contact-to-account links after import.',
    ],
    timelineExtra: 'A monday CRM migration is quick, often days, since the data is board-shaped and light.',
  },
  'microsoft-dynamics': {
    name: 'Microsoft Dynamics 365',
    kind: 'crm',
    exportBody:
      'In Dynamics 365, use Advanced Find or the export-to-Excel option on Accounts, Contacts, Leads, and Opportunities views, or export through the data management tools with admin help.',
    gotchas: [
      'Dynamics option-set (choice) fields export as labels or values; standardize them before mapping to Ardovo.',
      'Power Automate flows and business rules do not transfer; rebuild the active ones in Ardovo.',
      'Multi-entity relationships and custom entities need a clear mapping to Ardovo objects up front.',
    ],
    timelineExtra: 'Enterprise Dynamics instances land at the longer end; a focused sales unit can migrate in about a week.',
  },
  close: {
    name: 'Close',
    kind: 'crm',
    exportBody:
      'In Close, use the export option on Leads, Contacts, and Opportunities (Settings > Export, or the list-view export) to download CSVs, including your custom fields.',
    gotchas: [
      'Close nests contacts under leads; flatten that into companies and contacts for Ardovo on the way in.',
      'Call recordings and SMS threads are Close-specific; export what you must keep before cutover.',
      'Close sequences and Workflows do not transfer; rebuild them as Ardovo sequences.',
    ],
    timelineExtra: 'Close migrations are fast, often a few days, thanks to a straightforward data model.',
  },
  copper: {
    name: 'Copper',
    kind: 'crm',
    exportBody:
      'In Copper, export People, Companies, and Opportunities to CSV from each list, or through Settings. Copper also stores rich Google activity you may want to reference.',
    gotchas: [
      'Copper auto-captures Gmail activity; only exported fields transfer, so pull the notes and history you need.',
      'Copper workflow automations do not transfer; rebuild active ones in Ardovo.',
      'Custom fields are per-object; confirm mapping to the right Ardovo object.',
    ],
    timelineExtra: 'Copper data is light and moves quickly, usually within a few days.',
  },
  insightly: {
    name: 'Insightly',
    kind: 'crm',
    exportBody:
      'In Insightly, export Contacts, Organizations, and Opportunities (plus Projects if you use them) to CSV from each list view.',
    gotchas: [
      'Insightly links projects to opportunities; decide whether project delivery moves into Ardovo projects or stays separate.',
      'Insightly workflow automations do not transfer; rebuild the active ones in Ardovo.',
      'Custom fields and pick-lists need consistent values before mapping.',
    ],
    timelineExtra: 'A sales-only Insightly migration is quick; add project data and it takes a little longer.',
  },
  keap: {
    name: 'Keap',
    kind: 'marketing',
    exportBody:
      'In Keap, export Contacts, Companies, and Opportunities to CSV, and export your campaign and automation list separately for reference (automations are rebuilt, not imported).',
    gotchas: [
      'Keap campaign builder automations are complex and do not transfer; document the active ones, then rebuild in Ardovo.',
      'Keap tags carry a lot of meaning; map the important ones to Ardovo fields or segments.',
      'Invoicing history in Keap stays in Keap; export records you need for reference.',
    ],
    timelineExtra: 'Contact and deal data moves in days; rebuilding automations is what sets the timeline.',
  },
  freshsales: {
    name: 'Freshsales',
    kind: 'crm',
    exportBody:
      'In Freshsales, use the export option on Contacts, Accounts, and Deals to download CSVs with your custom fields included.',
    gotchas: [
      'Freshsales workflows and sales sequences do not transfer; rebuild the active ones in Ardovo.',
      'If you also use Freshdesk, decide which system owns which contact fields before export.',
      'Deal stages are pipeline-specific; map each pipeline to a Ardovo pipeline.',
    ],
    timelineExtra: 'Freshsales migrations are typically fast, live within a few days to a week.',
  },
  sugarcrm: {
    name: 'SugarCRM',
    kind: 'crm',
    exportBody:
      'In SugarCRM, export Accounts, Contacts, Leads, and Opportunities to CSV from each module list view. On-prem instances can also export from the database with admin help.',
    gotchas: [
      'Sugar customizations (Studio fields, logic hooks) do not transfer; rebuild the active logic as Ardovo workflows.',
      'On-prem Sugar may hold years of history; decide how far back you need to bring records.',
      'Module relationships need clear mapping to Ardovo objects.',
    ],
    timelineExtra: 'Heavily customized Sugar instances take longer; a standard setup migrates in about a week.',
  },
  'zendesk-sell': {
    name: 'Zendesk Sell',
    kind: 'crm',
    exportBody:
      'In Zendesk Sell, export Leads, Contacts, and Deals to CSV from each list, or through Settings > Data export.',
    gotchas: [
      'If Sell is linked to Zendesk Support, decide which system owns the contact record going forward.',
      'Smart Lists and automations do not transfer; rebuild the active ones in Ardovo.',
      'Lead-to-contact conversion history flattens on export; confirm records after import.',
    ],
    timelineExtra: 'Zendesk Sell data is light and usually migrates within a few days.',
  },
  excel: {
    name: 'Excel',
    kind: 'sheet',
    exportBody:
      'Your data is already in a spreadsheet, so the export step is cleanup. Make one header row, one record per row, consistent column names, and split contacts, companies, and deals into separate tabs or files before saving as CSV.',
    gotchas: [
      'Merged cells, multiple header rows, and totals rows break imports; strip them first.',
      'Dates and currency need consistent formats so values map cleanly.',
      'Duplicate rows are common in spreadsheets; Ardovo dedupes on email and domain, but tidy obvious duplicates first.',
    ],
    timelineExtra: 'A clean spreadsheet can be live in Ardovo the same day; the time is in tidying the data, not the import.',
  },
  'google-sheets': {
    name: 'Google Sheets',
    kind: 'sheet',
    exportBody:
      'Download each sheet as CSV (File > Download > Comma-separated values) after tidying headers so there is one header row and one record per row, split into contacts, companies, and deals.',
    gotchas: [
      'Formulas that reference other tabs export as values or errors; flatten to plain values first.',
      'Shared sheets often have inconsistent columns across copies; consolidate to one clean source.',
      'Deduplicate obvious repeats before import even though Ardovo dedupes on email and domain.',
    ],
    timelineExtra: 'Google Sheets data usually goes live the same day once headers are clean.',
  },
  airtable: {
    name: 'Airtable',
    kind: 'sheet',
    exportBody:
      'In Airtable, export each relevant table (Contacts, Companies, Deals) to CSV from the grid view menu (or the extension). Keep linked-record columns so relationships can be re-created.',
    gotchas: [
      'Airtable linked records export as names or IDs; confirm contact-to-company links after import.',
      'Attachments and rich-field types do not carry into a CRM; export the fields that matter as text.',
      'Airtable automations are base-specific and do not transfer; rebuild the useful ones in Ardovo.',
    ],
    timelineExtra: 'Airtable bases migrate quickly, usually within a day or two.',
  },
  notion: {
    name: 'Notion',
    kind: 'sheet',
    exportBody:
      'In Notion, export each CRM database to CSV (the ... menu > Export > CSV, choose comma-separated) for contacts, companies, and deals.',
    gotchas: [
      'Notion relations and rollups export as text; confirm links between records after import.',
      'Free-form page content inside records does not map to CRM fields; move the important notes into a notes field first.',
      'Property types are loose in Notion; standardize status and date columns before mapping.',
    ],
    timelineExtra: 'A Notion CRM database moves in a day or two once properties are tidy.',
  },
  nutshell: {
    name: 'Nutshell',
    kind: 'crm',
    exportBody:
      'In Nutshell, export People, Companies, and Leads to CSV from each list view with your custom fields included.',
    gotchas: [
      'Nutshell calls deals "leads"; map them to Ardovo deals during import.',
      'Nutshell email sequences do not transfer; rebuild active ones in Ardovo.',
      'Custom fields are per-object; confirm mapping targets.',
    ],
    timelineExtra: 'Nutshell migrations are quick, usually a few days.',
  },
  capsule: {
    name: 'Capsule',
    kind: 'crm',
    exportBody:
      'In Capsule, open the list view for People, Organizations, and Opportunities and export each to CSV.',
    gotchas: [
      'Capsule tags carry segmentation meaning; map key tags to Ardovo fields or segments.',
      'Capsule has light automation, so there is little to rebuild, but set up the Ardovo workflows you always wished you had.',
      'Confirm opportunity milestones map to your Ardovo pipeline stages.',
    ],
    timelineExtra: 'Capsule data is simple and typically goes live within a few days.',
  },
  streak: {
    name: 'Streak',
    kind: 'crm',
    exportBody:
      'In Streak, export each pipeline to CSV from the pipeline menu. Each box becomes a row with its column values, including stage and contact details.',
    gotchas: [
      'Streak stores much of its value inside Gmail threads; only exported columns transfer, so capture the fields you need.',
      'Boxes mix companies, contacts, and deals; split them into the right Ardovo objects on import.',
      'Streak has no shared automation to migrate; set up Ardovo workflows for the first time.',
    ],
    timelineExtra: 'Streak pipelines migrate fast, usually within a couple of days.',
  },
  'less-annoying-crm': {
    name: 'Less Annoying CRM',
    kind: 'crm',
    exportBody:
      'In Less Annoying CRM, use Settings > Export data to download Contacts, Companies, and Pipelines as CSV.',
    gotchas: [
      'There are no automations to migrate, so plan the Ardovo workflows you never had before.',
      'Pipeline statuses are simple text; map them to Ardovo pipeline stages.',
      'Notes are stored per contact; confirm they land in the Ardovo notes field.',
    ],
    timelineExtra: 'A Less Annoying CRM migration is one of the fastest, often live the same day.',
  },
  activecampaign: {
    name: 'ActiveCampaign',
    kind: 'marketing',
    exportBody:
      'In ActiveCampaign, export Contacts and Deals to CSV, and export your automation list for reference. Automations are rebuilt in Ardovo, not imported.',
    gotchas: [
      'ActiveCampaign automations are the core of the tool and do not transfer; document active ones, then rebuild the sales-side sequences in Ardovo.',
      'Tags drive a lot of logic; map the meaningful ones to Ardovo fields or segments.',
      'Deal pipelines are secondary in ActiveCampaign; confirm stage mapping to Ardovo.',
    ],
    timelineExtra: 'Contacts and deals move in days; the timeline is set by how many automations you rebuild.',
  },
  bitrix24: {
    name: 'Bitrix24',
    kind: 'crm',
    exportBody:
      'In Bitrix24, export Leads, Contacts, Companies, and Deals to CSV from each CRM list.',
    gotchas: [
      'Bitrix24 spans CRM, tasks, and chat; export only the CRM data and decide what collaboration data, if any, moves.',
      'Bitrix24 business processes and automations do not transfer; rebuild the active sales ones in Ardovo.',
      'Lead-to-deal conversion history flattens on export; confirm records after import.',
    ],
    timelineExtra: 'CRM-only Bitrix24 data migrates in days; untangling the wider suite adds time.',
  },
  odoo: {
    name: 'Odoo',
    kind: 'crm',
    exportBody:
      'In Odoo, use the export tool on Contacts, Companies, and CRM Leads/Opportunities to download CSV or Excel with the exact fields you select.',
    gotchas: [
      'Odoo links CRM to other modules (Sales, Invoicing); decide which fields belong in the CRM versus the ERP.',
      'Odoo automated actions and server actions do not transfer; rebuild the sales ones in Ardovo.',
      'Multi-company Odoo setups need a clear source-of-truth decision before export.',
    ],
    timelineExtra: 'Front-office Odoo data moves in about a week; keep Odoo for ERP if you rely on it.',
  },
  attio: {
    name: 'Attio',
    kind: 'crm',
    exportBody:
      'In Attio, export each list or object (People, Companies, Deals) to CSV from the record or list view.',
    gotchas: [
      'Attio has a flexible object model; confirm each custom object maps to the right Ardovo object.',
      'Attio automations are newer and do not transfer; rebuild the active ones in Ardovo.',
      'Relationship attributes export as references; confirm links after import.',
    ],
    timelineExtra: 'Attio data is modern and clean, so migrations are usually quick.',
  },
  folk: {
    name: 'folk',
    kind: 'crm',
    exportBody:
      'In folk, export each group or the People and Companies objects to CSV.',
    gotchas: [
      'folk is relationship-first, so deal data may be thin; set up your Ardovo pipeline fresh where needed.',
      'Groups map to Ardovo segments or fields rather than to a folder structure.',
      'Enriched contact data exports as fields; confirm the ones you rely on carried over.',
    ],
    timelineExtra: 'folk data is light and typically migrates within a day or two.',
  },
  salesflare: {
    name: 'Salesflare',
    kind: 'crm',
    exportBody:
      'In Salesflare, export Contacts, Accounts, and Opportunities to CSV from each list view.',
    gotchas: [
      'Salesflare auto-captures activity from email and calendar; only exported fields transfer, so pull the history you need.',
      'Salesflare workflows do not transfer; rebuild active ones in Ardovo.',
      'Confirm opportunity stages map to your Ardovo pipeline.',
    ],
    timelineExtra: 'Salesflare migrations are fast, usually within a few days.',
  },
  apollo: {
    name: 'Apollo.io',
    kind: 'engagement',
    exportBody:
      'In Apollo, export your saved Contacts, Accounts, and any deal data to CSV. Sequence content is rebuilt in Ardovo, and remember that Apollo prospecting data should be de-duplicated against your real book of business.',
    gotchas: [
      'Apollo mixes prospected data with your real accounts; import your qualified book, not the entire database.',
      'Apollo sequences do not transfer; rebuild the active ones as Ardovo sequences.',
      'Data accuracy varies, so validate emails and titles on the records you keep.',
    ],
    timelineExtra: 'Bringing in a qualified book from Apollo is quick; the care is in filtering out raw prospecting noise.',
  },
  outreach: {
    name: 'Outreach',
    kind: 'engagement',
    exportBody:
      'In Outreach, export Prospects and Accounts to CSV. Sequences are rebuilt in Ardovo, and if Outreach sat on top of a CRM, export the deal data from that system of record too.',
    gotchas: [
      'Outreach is an engagement layer, not a system of record; your deals likely live in a separate CRM you also need to export.',
      'Outreach sequences and rulesets do not transfer; rebuild the active ones as Ardovo sequences.',
      'Consolidating two systems (Outreach plus CRM) into Ardovo is the real work; plan the field mapping once.',
    ],
    timelineExtra: 'If you are collapsing Outreach plus a CRM into Ardovo, plan about one to two weeks; a lighter setup is faster.',
  },
  salesloft: {
    name: 'Salesloft',
    kind: 'engagement',
    exportBody:
      'In Salesloft, export People and Accounts to CSV. Cadences are rebuilt as Ardovo sequences, and export deal data from the underlying CRM if Salesloft was layered on one.',
    gotchas: [
      'Salesloft is a cadence layer, not a system of record; deals usually live in a separate CRM to export as well.',
      'Cadences and rulesets do not transfer; rebuild the active ones as Ardovo sequences.',
      'Combining Salesloft plus a CRM into one Ardovo workspace is the main effort; map fields once.',
    ],
    timelineExtra: 'Collapsing Salesloft plus a CRM into Ardovo takes about one to two weeks; a lighter migration is faster.',
  },
  engagebay: {
    name: 'EngageBay',
    kind: 'marketing',
    exportBody:
      'In EngageBay, export Contacts, Companies, and Deals to CSV from each list view.',
    gotchas: [
      'EngageBay spans marketing, sales, and service; decide which data moves and which stays.',
      'EngageBay automations do not transfer; rebuild the active sales ones in Ardovo.',
      'Tags and lists map to Ardovo fields or segments rather than transferring as-is.',
    ],
    timelineExtra: 'EngageBay CRM data moves in days; automation rebuild sets the pace.',
  },
  vtiger: {
    name: 'Vtiger',
    kind: 'crm',
    exportBody:
      'In Vtiger, export Organizations, Contacts, Leads, and Opportunities to CSV from each module.',
    gotchas: [
      'Vtiger workflows and approval processes do not transfer; rebuild the active ones in Ardovo.',
      'Vtiger spans sales, marketing, and helpdesk; export only the CRM data you need.',
      'Pick-list values should be standardized before mapping.',
    ],
    timelineExtra: 'A sales-focused Vtiger migration takes a few days to a week.',
  },
  'sage-crm': {
    name: 'Sage CRM',
    kind: 'crm',
    exportBody:
      'In Sage CRM, export Companies, People, and Opportunities to CSV, or have an admin run the export from the database.',
    gotchas: [
      'Sage CRM often links to Sage accounting; decide which fields belong in the CRM versus the finance system.',
      'Sage workflows and escalations do not transfer; rebuild the active sales ones in Ardovo.',
      'Legacy records may need trimming before import.',
    ],
    timelineExtra: 'A standard Sage CRM migration lands in about a week.',
  },
  'oracle-crm': {
    name: 'Oracle CX',
    kind: 'crm',
    exportBody:
      'In Oracle CX, export Accounts, Contacts, and Opportunities to CSV using the export or reporting tools, typically with admin help.',
    gotchas: [
      'Oracle CX is enterprise-heavy with complex object relationships; agree a clear mapping to Ardovo objects up front.',
      'Oracle process automation does not transfer; rebuild the active sales flows in Ardovo.',
      'Role and territory complexity does not map one to one, so plan Ardovo RBAC and views fresh.',
    ],
    timelineExtra: 'Enterprise Oracle instances land at the longer end; a focused business unit can migrate in about a week.',
  },
  sap: {
    name: 'SAP Sales Cloud',
    kind: 'crm',
    exportBody:
      'In SAP Sales Cloud, export Accounts, Contacts, and Opportunities to CSV or Excel using the export or report tools, usually with admin support.',
    gotchas: [
      'SAP data often ties into the wider SAP stack; decide which fields the CRM should own.',
      'SAP workflow and business logic do not transfer; rebuild the sales-side flows in Ardovo.',
      'Standardize option and status values before mapping to Ardovo.',
    ],
    timelineExtra: 'A scoped SAP Sales Cloud migration takes about one to two weeks depending on customization.',
  },
  mailchimp: {
    name: 'Mailchimp',
    kind: 'marketing',
    exportBody:
      'In Mailchimp, export your Audience (contacts) to CSV. Mailchimp has no real pipeline, so deals are set up fresh in Ardovo rather than imported.',
    gotchas: [
      'Mailchimp is email-first, so you are gaining a pipeline you never had; plan your Ardovo stages from scratch.',
      'Audience tags and merge fields map to Ardovo fields or segments.',
      'Campaign history stays in Mailchimp; export reports you want to keep for reference.',
    ],
    timelineExtra: 'Contacts import in a day; the setup time is designing the pipeline Ardovo gives you.',
  },
  'constant-contact': {
    name: 'Constant Contact',
    kind: 'marketing',
    exportBody:
      'In Constant Contact, export your contact lists to CSV. There is no sales pipeline to move, so deals start fresh in Ardovo.',
    gotchas: [
      'Constant Contact is an email tool, so you are adding true CRM structure; plan contacts, companies, and stages in Ardovo.',
      'Lists map to Ardovo segments or fields rather than transferring directly.',
      'Event and email history stays in Constant Contact; export what you need to keep.',
    ],
    timelineExtra: 'Contacts move in a day; the value comes from the CRM structure you build in Ardovo.',
  },
  'agile-crm': {
    name: 'Agile CRM',
    kind: 'crm',
    exportBody:
      'In Agile CRM, export Contacts, Companies, and Deals to CSV from each list view.',
    gotchas: [
      'Agile CRM campaigns and automations do not transfer; rebuild the active sales ones in Ardovo.',
      'Tags carry segmentation meaning; map the key ones to Ardovo fields or segments.',
      'Confirm deal milestones map to your Ardovo pipeline stages.',
    ],
    timelineExtra: 'Agile CRM data is light and migrates within a few days.',
  },
  'act-crm': {
    name: 'Act!',
    kind: 'crm',
    exportBody:
      'In Act!, export Contacts, Companies, and Opportunities to CSV, or use the export wizard from your database. Desktop databases can export directly from the local file.',
    gotchas: [
      'Act! desktop databases can hold years of history; decide how far back to bring records.',
      'Act! has limited automation, so there is little to rebuild; set up the Ardovo workflows you always wanted.',
      'Legacy custom fields may need cleanup before mapping.',
    ],
    timelineExtra: 'An Act! migration is usually quick once the export file is clean, often within a few days.',
  },
};

/* Build the ordered migration steps for one source. */
function buildSteps(s) {
  const dealBody =
    s.kind === 'sheet' || s.kind === 'marketing'
      ? `Bring in deal rows with their stage, value, close date, and owner if you track them. Map each stage to a Ardovo pipeline stage during import so nothing lands in the wrong column. If you did not track deals in ${s.name}, this is where Ardovo gives you a real pipeline for the first time.`
      : `Import open and recently won deals with their stage, value, close date, and owner. Map your ${s.name} stages to Ardovo pipeline stages during import so every deal lands in the right column, and include closed deals so your reporting history stays intact.`;

  const autoBody =
    s.kind === 'engagement'
      ? `Rebuild your ${s.name} cadences as Ardovo sequences. Engagement steps do not transfer between systems, so list your active cadences, then have Rook recreate them as Ardovo sequences with the same steps and timing. Most teams prune stale steps in the process.`
      : s.kind === 'marketing'
      ? `Recreate your ${s.name} campaigns and follow-up as Ardovo sequences and workflows. Automations do not transfer as files, so document the active ones, then have Rook rebuild the sales-side flows. Prune anything that was no longer firing.`
      : `Recreate your ${s.name} automations in Ardovo. Workflows and sequences do not transfer between systems, so list the active ones, then have Rook rebuild them as Ardovo workflows and sequences. Most teams take the chance to drop rules that were no longer firing.`;

  return [
    { h: `Export your data from ${s.name}`, body: s.exportBody },
    {
      h: 'Map your fields to Ardovo',
      body: `Line up your ${s.name} fields with Ardovo's objects: companies, contacts, deals, and any custom fields. Ardovo accepts a CSV per object and its importer suggests matches, so you mostly confirm rather than build a mapping from scratch. Decide now which fields are worth keeping and which legacy clutter to leave behind.`,
    },
    {
      h: 'Import accounts and contacts',
      body: `Import companies first, then contacts, so people link to the right accounts on the way in. Ardovo dedupes on email and domain and preserves record owners, so books of business stay intact rather than collapsing into one pile.`,
    },
    { h: 'Import deals and pipeline', body: dealBody },
    {
      h: 'Rebuild your pipeline, views, and dashboards with Rook',
      body: `This is where Ardovo saves the most time. Describe your process in plain language, for example "B2B pipeline with five stages, a manager forecast view, and a dashboard for pipeline by rep", and Rook builds the pipeline, saved views, and dashboards for you. No admin, no formula fields to hand-configure.`,
    },
    { h: 'Recreate automations and sequences', body: autoBody },
    {
      h: 'Validate, then go live',
      body: `Validate before you cut over. Spot-check record counts against ${s.name}, open a sample of deals to confirm stage and value, send a test from a sequence, and confirm dashboards total correctly. When it looks right, invite the team, set Ardovo as the system of record, and archive ${s.name}.`,
    },
  ];
}

export default Object.entries(MIG).map(([slug, s]) => {
  const steps = buildSteps(s);
  const transfers = TRANSFERS[s.kind];
  const timeline = `Most teams finish a ${s.name} migration in a few days to about two weeks, depending on data volume, custom fields, and how many automations you rebuild. ${s.timelineExtra}`;

  return {
    slug: `migrate-from-${slug}-to-rally`,
    type: 'migration',
    title: `How to Migrate From ${s.name} to Ardovo (${YEAR})`,
    metaTitle: `Migrate From ${s.name} to Ardovo: Step-by-Step Guide (${YEAR}) | Ardovo`,
    metaDescription: `Move from ${s.name} to Ardovo in days, not months. Export, map fields, import records, and let Rook rebuild your pipeline and automations. Full step-by-step.`.slice(0, 155),
    eyebrow: `Migrate from ${s.name}`,
    h1: `How to migrate from ${s.name} to Ardovo`,
    shortAnswer: `Migrating from ${s.name} to Ardovo takes most teams a few days. Export your companies, contacts, and deals, map them to Ardovo's objects, then let Rook rebuild your pipeline, views, and automations from a plain-language description. Your records and history transfer, so you go live without a long re-implementation.`,
    intro: [
      `Switching from ${s.name} to Ardovo is a data export, a field mapping, and a Rook-assisted rebuild, not a multi-month re-implementation. This guide walks the full path: what to export, how fields map, how to bring in accounts, contacts, and deals, and how Rook rebuilds your pipeline and automations so you are live fast.`,
      `The big difference from a normal CRM migration is the rebuild step. Instead of an admin hand-configuring stages, views, dashboards, and workflows, you describe what you want in plain language and Rook builds it. That is what turns a ${s.name} migration from a quarter-long project into a job measured in days.`,
    ],
    stats: [
      { value: '7', label: 'steps from export to go-live' },
      { value: 'Days', label: `typical ${s.name} switch, not months` },
      { value: 'Rook', label: 'rebuilds pipeline and automations' },
    ],
    stepsHeading: `Migrating from ${s.name} to Ardovo, step by step`,
    steps,
    sections: [
      {
        h: `What transfers from ${s.name}`,
        body: `Your core records and history come across. Here is what lands in Ardovo when you import cleanly:`,
        bullets: transfers,
      },
      {
        h: `Common ${s.name} migration gotchas`,
        body: `A few things trip people up moving off ${s.name}. Plan for these and the switch stays smooth:`,
        bullets: s.gotchas,
      },
      {
        h: `How long a ${s.name} migration takes`,
        body: timeline,
      },
    ],
    faqs: [
      {
        q: `How long does it take to migrate from ${s.name} to Ardovo?`,
        a: `Most teams go live within a few days to about two weeks. Data volume, the number of custom fields, and how many automations you rebuild set the pace. Rook doing the pipeline, view, dashboard, and workflow rebuild is what keeps a ${s.name} migration in days rather than a quarter.`,
      },
      {
        q: `Will I lose my ${s.name} data or history?`,
        a: `No. Ardovo imports your companies, contacts, deals, and the activity history you export, including closed deals so reporting stays intact. Keep your ${s.name} export files as a backup, and run both systems in parallel until you have validated the data in Ardovo.`,
      },
      {
        q: `Do custom fields and automations transfer from ${s.name}?`,
        a: `Custom fields map directly to Ardovo custom fields during import. Automations do not transfer as files between any two systems, so you list your active ${s.name} workflows and Rook rebuilds them as Ardovo workflows and sequences. Most teams prune stale automations in the process.`,
      },
      {
        q: `Can Rook set up my pipeline for me?`,
        a: `Yes. That is the point of the rebuild step. Describe your process in plain language and Rook builds the pipeline stages, saved views, forecast, and dashboards. You confirm and adjust rather than hand-configuring an admin console.`,
      },
      {
        q: `Can I run ${s.name} and Ardovo in parallel during the switch?`,
        a: `Yes, and you should. Import into Ardovo, validate record counts and a sample of deals, and keep ${s.name} read-only until the team is confident. Once dashboards total correctly and sequences send, set Ardovo as the system of record and archive ${s.name}.`,
      },
    ],
    published: '2026-07-10',
  };
});
