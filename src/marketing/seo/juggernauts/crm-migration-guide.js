// ============================================================
// JUGGERNAUT GUIDE  (isolated best-in-class SEO track)
// Slug: crm-migration-guide -> live at /guides/crm-migration-guide
// Practical playbook for migrating a CRM with zero lost deals.
// Copies the worked-example shape in crm-for-startups.js.
// NO em-dash / en-dash. ASCII only.
// ============================================================

const entry = {
  slug: 'crm-migration-guide',
  title: 'How to Migrate Your CRM Without Losing a Deal',
  h1: 'How to Migrate Your CRM Without Losing a Deal',
  metaTitle: 'CRM Migration Guide (2026): Phases, Checklist, Cutover, and a Downtime Calculator | Ardovo',
  metaDescription: 'A practical, step-by-step CRM migration playbook: the phases and timeline, a pre-migration checklist, data mapping and dedupe, a weekend cutover plan, the real risks, and a downtime calculator.',
  eyebrow: 'Operations Playbook',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A CRM migration goes wrong in exactly one way: a deal that was safe in the old system becomes invisible in the new one, and nobody notices until the buyer stops replying. Every other risk is a variation on that theme. The goal of a migration is not a clean database. It is a pipeline where not a single open deal loses its owner, its next step, or its history on the day you switch.',
    'This guide is the playbook for making that switch safely. It covers the phases and a realistic timeline, a pre-migration checklist you can run down before touching a byte, how to map and dedupe records without merging two real companies into one, how to run the cutover over a single weekend, the risks that actually bite, and a calculator to size the effort and downtime before you commit a date.',
  ],
  heroStats: [
    { value: 0, suffix: ' deals', label: 'The only acceptable number of open deals lost in a cutover' },
    { value: 3, prefix: '~', suffix: ' weeks', label: 'Typical end-to-end timeline for a mid-size migration' },
    { value: 1, prefix: '<', suffix: ' weekend', label: 'Time the new system needs to be live once you start the cutover' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'The one rule that makes a migration safe',
      body: [
        'Treat your old CRM as read-only truth until the new one has proven it holds every open deal. A migration is not a delete-and-replace. It is a copy, a reconcile, and only then a switch. As long as the old system still contains the untouched original of every record, any mistake in the new system is recoverable, because you can always go back and compare.',
        'That single discipline, keep the source system frozen and intact until reconciliation passes, is what separates a boring migration from a lost quarter. It costs you nothing except one extra week of paying for two tools at once, and it removes the failure mode that actually hurts: a corrupted or half-loaded record you cannot rebuild because the original is already gone.',
        'Everything else in this guide, the checklist, the dedupe, the cutover timing, is in service of that rule. If you remember nothing else, remember that you never destroy the old until the new is proven, and you prove it by counting.',
      ],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The number that must match',
      body: 'Before you turn off the old CRM, the count of open deals and their total pipeline value in the new system must equal the old system to the dollar. If those two numbers do not tie out, you are not done, no matter how good the new UI looks.',
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'The five phases of a CRM migration',
      caption: 'A realistic three-week timeline for a mid-size team. Small teams compress this; large or heavily customized orgs stretch it.',
      data: {
        milestones: [
          { date: 'Week 1', label: 'Audit and plan', body: 'Inventory data, owners, and integrations. Freeze schema changes.' },
          { date: 'Week 2', label: 'Map and clean', body: 'Field mapping, dedupe, and a full test import into a sandbox.' },
          { date: 'Week 2-3', label: 'Dry run', body: 'Import a copy, reconcile counts, and let reps validate their own deals.' },
          { date: 'Weekend', label: 'Cutover', body: 'Freeze old, final delta import, switch integrations, go live.' },
          { date: 'Week 3+', label: 'Stabilize', body: 'Run both in parallel read-only, watch, and decommission the old.' },
        ],
      },
    },
    {
      type: 'heading',
      text: 'Before you touch a single record',
      eyebrow: 'Pre-migration checklist',
    },
    {
      type: 'steps',
      title: 'The pre-migration checklist',
      ordered: true,
      steps: [
        { title: 'Inventory what you actually have', body: 'Export a full record count per object: leads, contacts, companies, deals, activities, notes, and attachments. These are your target numbers. Reconciliation later means matching them exactly.' },
        { title: 'Freeze schema changes in the old system', body: 'Stop adding custom fields, pipelines, or automations in the tool you are leaving. A moving target cannot be mapped. Announce a change freeze to whoever administers it.' },
        { title: 'List every integration and inbound feed', body: 'Web forms, marketing automation, billing, calendar, dialers, Zapier flows, and any API writing into the CRM. Each one is a pipe you will re-point during cutover. A missed feed silently drops leads on the floor.' },
        { title: 'Decide what does not come with you', body: 'Dead leads older than a defined cutoff, duplicate junk, test records, and abandoned custom fields nobody reads. Migrating garbage just makes the new system feel like the old one. Archive it, do not import it.' },
        { title: 'Name a single owner and a rollback trigger', body: 'One person owns the go or no-go call. Write down in advance the specific condition that aborts the cutover and reverts to the old system, so nobody has to improvise that decision at 2am on Saturday.' },
        { title: 'Communicate the freeze window to the team', body: 'Reps need to know the exact hours the CRM is read-only, where to log deals in the meantime, and when the new system opens. Surprise downtime is how deals get worked in a spreadsheet and then lost.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'Data mapping: from old object to new',
      caption: 'Every field in the old system lands in exactly one place, gets transformed, or is deliberately dropped. Nothing is left unclassified.',
      data: {
        nodes: [
          { label: 'Old field', sub: 'source column' },
          { label: 'Classify', sub: 'keep, transform, drop' },
          { label: 'Map', sub: 'to new field' },
          { label: 'Transform', sub: 'format and picklists' },
          { label: 'New field', sub: 'validated' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Data mapping and deduplication',
      body: [
        'Mapping is the unglamorous heart of a migration. For every field in the old system you make one of three decisions: it maps cleanly to a field in the new one, it needs a transform first, or it gets dropped. The trap is the silent fourth option, a field that just does not make the jump because nobody noticed it. That is how a rep loses the note that said the buyer only takes calls after 4pm. Build the map as an explicit spreadsheet: source field, destination field, transform rule, owner. If a row has no destination, that must be a deliberate choice, not an accident.',
        'Transforms are where formats bite. Picklist values that were free text become a fixed set, dates change format, phone numbers gain or lose country codes, and owner names must match real user accounts in the new system or the records land ownerless. Ownerless open deals are invisible deals, so map every old owner to a new user before you import, and hard-fail any record whose owner does not resolve.',
        'Deduplication is the other half. Old CRMs accumulate the same company under three spellings and the same person under two emails. Dedupe on stable keys, a normalized email or a domain plus a normalized company name, not on display text that varies. And be conservative: a false merge that fuses two genuinely different companies is far harder to unwind after go-live than a leftover duplicate you clean up next week. When in doubt, do not merge. Flag it for a human.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Always test the import into a sandbox first',
      body: 'Never let your first real import be into production. Load a full copy into a sandbox or a fresh workspace, reconcile the counts, and have two or three reps open their own deals and confirm the history is intact. Fix the mapping, then do it again. The dry run is not optional, it is the cheapest insurance you will buy.',
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Reconciliation: proving nothing was lost',
      caption: 'After the test import, every stage must tie back to the source. A gap here is a record that vanished, and you find it now, not after go-live.',
      data: {
        stages: [
          { label: 'Records in old CRM', value: 12000, pct: 100 },
          { label: 'Deliberately archived', value: 2400, pct: 20 },
          { label: 'Queued for import', value: 9600, pct: 80 },
          { label: 'Imported successfully', value: 9600, pct: 80 },
          { label: 'Reconciled and owner-matched', value: 9600, pct: 80 },
        ],
      },
    },
    {
      type: 'heading',
      text: 'The weekend cutover',
      eyebrow: 'Go-live',
    },
    {
      type: 'steps',
      title: 'The cutover runbook',
      ordered: true,
      steps: [
        { title: 'Friday evening: freeze the old system', body: 'Set the old CRM to read-only or announce a hard stop on edits. From this moment the old system is a frozen snapshot. Any deal activity happens in a designated holding doc until the new system is live.' },
        { title: 'Export the final delta', body: 'Pull everything that changed since your dry-run export. This delta is small because most of the data was already loaded and validated during the dry run. You are only catching the last few days of edits.' },
        { title: 'Load and reconcile one last time', body: 'Import the delta into the new system and re-run the count and pipeline-value reconciliation. Open deals and total value must equal the frozen old system to the dollar before you proceed.' },
        { title: 'Re-point every integration', body: 'Switch web forms, marketing automation, billing, calendar, and API feeds to write into the new CRM. Send a test lead through each pipe and confirm it lands. A form still posting to the dead system is a silent leak.' },
        { title: 'Open the doors and watch', body: 'Let reps in. Keep the old system available read-only for a week so anyone can cross-check a deal. Watch new-lead flow and follow-up activity closely for the first 48 hours, which is when a missed integration shows up.' },
        { title: 'Decommission only after parallel proof', body: 'After a week of clean parallel running with counts still tied out, export a final archive of the old system and turn it off. Not before. The archive is your permanent safety net.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'What gets re-pointed at cutover',
      caption: 'Every inbound pipe that fed the old CRM must feed the new one, or leads land in a system nobody is watching.',
      data: {
        layers: [
          { label: 'Inbound feeds', nodes: ['Web forms', 'Marketing', 'Calendar', 'Dialer'] },
          { label: 'Switch target', nodes: ['Old CRM (frozen)', 'New CRM (live)'] },
          { label: 'Core data', nodes: ['Leads', 'Contacts', 'Companies', 'Deals'] },
          { label: 'Downstream', nodes: ['Billing', 'Reports', 'Forecast'] },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'The real risks, and how to blunt each one',
      prosLabel: 'What can go right',
      consLabel: 'What can go wrong (and the fix)',
      pros: [
        'A frozen source system means every mistake is recoverable by comparison.',
        'A dry run into a sandbox catches mapping errors before they reach reps.',
        'Dollar-for-dollar reconciliation proves no open deal was lost.',
        'A week of parallel running turns go-live into a checkable claim, not a leap of faith.',
      ],
      cons: [
        'Ownerless records: unmapped owners create invisible deals. Fix by hard-failing any record whose owner does not resolve to a real user.',
        'False merges: aggressive dedupe fuses two real companies. Fix by deduping on stable keys and flagging ambiguous matches for a human.',
        'Dropped integrations: a form still posting to the old system leaks leads. Fix by testing every pipe end to end at cutover.',
        'Lost history: notes and activities left behind gut the context reps rely on. Fix by mapping activities and attachments explicitly, not just the deal record.',
        'Cutover during business hours: edits made mid-migration get stranded. Fix by cutting over on a weekend with a clear freeze window.',
      ],
    },
    {
      type: 'calculator',
      title: 'Migration effort and downtime calculator',
      intro: 'Size the job before you commit a date. This models the rough hours of hands-on migration work and the freeze window your team should plan around. Adjust the inputs on the live page to match your own data.',
      inputs: [
        { key: 'records', label: 'Total records to migrate (thousands)', type: 'number', default: 10, min: 1, max: 2000, step: 1, unit: 'k' },
        { key: 'fields', label: 'Custom fields to map', type: 'number', default: 40, min: 0, max: 500, step: 1 },
        { key: 'integrations', label: 'Integrations to re-point', type: 'number', default: 6, min: 0, max: 50, step: 1 },
        { key: 'dupeRate', label: 'Estimated duplicate rate', type: 'range', default: 12, min: 0, max: 50, step: 1, unit: '%' },
        { key: 'reps', label: 'Reps who must validate their deals', type: 'number', default: 8, min: 1, max: 500, step: 1 },
      ],
      outputs: [
        { key: 'mapHours', label: 'Field mapping and transform hours', expr: 'fields * 0.4 + 4', format: 'decimal:0' },
        { key: 'dedupeHours', label: 'Dedupe and cleanup hours', expr: 'records * (dupeRate / 100) * 0.6 + 3', format: 'decimal:0' },
        { key: 'integrationHours', label: 'Integration re-point hours', expr: 'integrations * 1.5', format: 'decimal:0' },
        { key: 'totalHours', label: 'Estimated hands-on hours', expr: 'fields * 0.4 + 4 + records * (dupeRate / 100) * 0.6 + 3 + integrations * 1.5 + reps * 0.5', format: 'decimal:0', highlight: true },
        { key: 'freezeHours', label: 'Recommended freeze window (hours)', expr: 'min(48, max(6, records * 0.3 + integrations * 0.8))', format: 'decimal:0' },
      ],
    },
    {
      type: 'animatedStat',
      title: 'Where migrations typically slip',
      stats: [
        { value: 30, format: 'percent', label: 'Of migration effort is usually cleanup and dedupe, not the import itself', trend: 'plan for it', trendDir: 'flat' },
        { value: 1, format: 'number', suffix: ' pipe', prefix: '~', label: 'A single missed integration is the most common post-cutover leak', trend: 'test every feed', trendDir: 'up' },
        { value: 7, format: 'number', suffix: ' days', label: 'Recommended parallel-run period before decommissioning the old CRM', trend: 'do not rush it', trendDir: 'flat' },
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'What makes the destination CRM easy or hard to migrate into',
      rowHeader: 'Migration factor',
      columns: ['Ardovo', 'Legacy CRM', 'Spreadsheet'],
      highlightCol: 0,
      rows: [
        { feature: 'Guided import with mapping preview', cells: [true, 'partial', false] },
        { feature: 'Sandbox or reset workspace for a dry run', cells: [true, 'partial', false] },
        { feature: 'Built-in dedupe on stable keys', cells: [true, 'partial', false] },
        { feature: 'Live and usable on first load', cells: [true, false, true] },
        { feature: 'AI operator validates and enriches on import', cells: [true, false, false] },
        { feature: 'Time from import to working pipeline', cells: ['Minutes', 'Weeks', 'None'] },
        { feature: 'One flat price during a dual-run overlap', cells: [true, false, true] },
      ],
      footnote: 'Legacy CRM column reflects a typical seat-plus-add-on configuration with migration tooling gated behind higher tiers or paid services.',
    },
    {
      type: 'quote',
      text: 'We froze the old system Friday, reconciled the counts twice, and reps were working their real pipeline in the new tool Monday morning. Not one open deal went missing.',
      cite: 'A Ardovo customer',
      role: 'RevOps lead, mid-market SaaS',
    },
    {
      type: 'richText',
      title: 'Why the destination matters as much as the process',
      body: [
        'A disciplined process protects you no matter what you migrate into. But the destination system decides how much of that discipline you have to enforce by hand. A CRM that is alive on first load, with a guided import that previews your mapping, built-in dedupe, and an operator that validates and enriches records as they land, removes whole categories of manual work and whole classes of error.',
        'This is where Ardovo is built for the switch rather than against it. It is live and usable the moment your data lands, so there is no blank-database configuration phase between import and value. Rook, the built-in AI operator, checks owners, flags likely duplicates, and fills gaps as records come in, so reconciliation is a confirmation rather than a scavenger hunt. And because Ardovo is one flat price across every module, the week you run both systems in parallel does not trigger a per-seat penalty on the tool you are still turning off.',
        'None of that replaces the rule at the top of this guide. You still freeze the old system, still reconcile to the dollar, still run in parallel before you decommission. A good destination just means the safe path is also the fast one.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'How long does a CRM migration take?', a: 'For a mid-size team, plan on roughly three weeks end to end: about a week to audit and plan, a week to map and clean the data with a full test import, and a weekend cutover followed by a week of parallel running. The actual switch happens over a single weekend. Small teams compress this and heavily customized orgs stretch it, but the phases stay the same.' },
        { q: 'How do I make sure I do not lose any deals?', a: 'Keep the old system frozen and read-only until you have proven the new one holds everything. The proof is reconciliation: the count of open deals and their total pipeline value in the new system must equal the old system to the dollar before you turn anything off. Then run both in parallel for about a week so you can cross-check any deal.' },
        { q: 'Should I migrate all of my historical data?', a: 'No. Deliberately leave behind dead leads past a defined cutoff, duplicate junk, test records, and custom fields nobody uses. Archive that data, do not import it. Migrating garbage just recreates the mess you were trying to escape. Bring the open pipeline, active accounts, and the history and notes attached to them.' },
        { q: 'What is the safest time to run the cutover?', a: 'A weekend, with a clearly communicated freeze window. You want the lowest possible volume of live edits during the switch, and you want reps to know exactly when the system is read-only and where to log anything urgent in the meantime. Cutting over mid-week during business hours is how edits get stranded between the two systems.' },
        { q: 'What is the most common thing that goes wrong?', a: 'A missed integration. A web form, marketing tool, or API feed keeps writing into the old system after cutover, so new leads land somewhere nobody is watching. Prevent it by inventorying every inbound feed before you start and sending a test record through each one at cutover to confirm it lands in the new CRM.' },
        { q: 'Do I need to pay for two CRMs at once?', a: 'For a short overlap, yes, and it is worth it. Running both systems in parallel for about a week is what lets you verify nothing was lost before you decommission the old one. Choosing a destination with one flat price, like Ardovo, keeps that overlap from triggering a per-seat penalty on the tool you are shutting down.' },
      ],
    },
  ],
  related: ['crm-vs-spreadsheet', 'salesforce-alternative', 'revenue-operations-guide'],
};

export default entry;
