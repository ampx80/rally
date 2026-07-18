// ============================================================
// JUGGERNAUT: hubspot-alternative -> /guides/hubspot-alternative
// Highest-intent competitor-alternative page. ASCII only, no em/en dash.
// ============================================================

const entry = {
  slug: 'hubspot-alternative',
  title: 'The Best HubSpot Alternative in 2026',
  h1: 'The Best HubSpot Alternative in 2026: A Buyer Guide',
  metaTitle: 'The Best HubSpot Alternative in 2026: Comparison, Pricing Calculator, Migration | Ardovo',
  metaDescription: 'A practical, honest guide to replacing HubSpot in 2026: where teams outgrow it, a feature comparison matrix, a total-cost calculator, and a weekend migration plan.',
  eyebrow: 'Competitor Guide',
  category: 'Comparisons',
  author: 'The Ardovo Team',
  readingTime: '12 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'HubSpot is a genuinely good product that becomes a genuinely expensive one. The trap is not the sticker price. It is the way seats, tiers, and add-ons compound as you grow, until the tool you bought to save money is the line item you defend in every budget review.',
    'This guide is for the team that already knows HubSpot and wants an honest read on when to leave, what to replace it with, and how to switch without losing a quarter. No fluff, a real comparison matrix, and a calculator you can run against your own contract.',
  ],
  heroStats: [
    { value: 3, prefix: '', suffix: 'x', label: 'Typical bill growth from Starter to Pro plus add-ons' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'Ardovo: one flat price, every module included' },
    { value: 1, prefix: '', suffix: ' weekend', label: 'Realistic migration window for most teams' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'When teams actually outgrow HubSpot',
      body: [
        'Almost nobody leaves HubSpot because it cannot do the job. They leave for one of three reasons: the price crosses a line that no longer maps to value, the marketing and sales data never quite tie out across hubs, or they want an AI that does the work instead of a chatbot that suggests it.',
        'If none of those are true for you, stay. If one of them is, the cost of staying is quietly compounding, because every seat you add and every add-on you switch on raises the floor you can never go back below.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The real question',
      body: 'It is not "can HubSpot do this." It is "am I paying enterprise prices for a stack I have to assemble and reconcile myself." If yes, an all-in-one alternative pays for itself fast.',
    },
    {
      type: 'comparisonMatrix',
      title: 'Ardovo vs HubSpot: capability and cost',
      rowHeader: 'Capability',
      columns: ['Ardovo', 'HubSpot'],
      highlightCol: 0,
      rows: [
        { feature: 'CRM, marketing, CPQ, and billing in one price', cells: [true, false] },
        { feature: 'AI operator that executes multi-step work', cells: [true, 'partial'] },
        { feature: 'Alive with working data on first load', cells: [true, false] },
        { feature: 'Marketing automation and journeys', cells: [true, true] },
        { feature: 'Forecasting and revenue intelligence included', cells: [true, 'partial'] },
        { feature: 'Per-seat pricing that climbs with headcount', cells: [false, true] },
        { feature: 'Paid add-ons for core features', cells: [false, true] },
        { feature: 'Reports tie out across every module', cells: [true, 'partial'] },
      ],
      footnote: 'HubSpot column reflects a typical Professional-tier configuration with common add-ons. Partial means available but gated behind a higher tier or add-on.',
    },
    {
      type: 'heading',
      text: 'What switching actually costs (and saves)',
      eyebrow: 'Total cost of ownership',
    },
    {
      type: 'calculator',
      title: 'HubSpot vs Ardovo cost calculator',
      intro: 'Model your real spend. Adjust the inputs on the live page to match your contract.',
      inputs: [
        { key: 'seats', label: 'Paid seats', type: 'number', default: 12, min: 1, max: 2000, step: 1 },
        { key: 'hsSeat', label: 'HubSpot cost per seat, per month', type: 'number', default: 90, min: 0, max: 5000, step: 5, unit: 'USD' },
        { key: 'addons', label: 'HubSpot add-ons per month (Ops, reporting, etc.)', type: 'number', default: 800, min: 0, max: 100000, step: 50, unit: 'USD' },
        { key: 'rallySeat', label: 'Ardovo cost per seat, per month', type: 'range', default: 45, min: 10, max: 200, step: 5, unit: 'USD' },
      ],
      outputs: [
        { key: 'hsYear', label: 'HubSpot per year', expr: '(seats * hsSeat + addons) * 12', format: 'currency' },
        { key: 'rallyYear', label: 'Ardovo per year', expr: 'seats * rallySeat * 12', format: 'currency' },
        { key: 'savings', label: 'Estimated savings per year', expr: '(seats * hsSeat + addons) * 12 - seats * rallySeat * 12', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'animatedStat',
      title: 'Why the bill grows faster than the team',
      stats: [
        { value: 40, format: 'decimal:0', suffix: '%', label: 'Of a typical HubSpot bill that is add-ons, not seats', trend: 'grows with usage', trendDir: 'up' },
        { value: 0, format: 'number', prefix: '$', label: 'Ardovo add-on cost for core CRM, marketing, and CPQ', trend: 'included', trendDir: 'flat' },
        { value: 2, format: 'decimal:0', suffix: ' days', label: 'Median time-to-live for a Ardovo migration', trend: 'vs weeks of onboarding', trendDir: 'down' },
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A weekend migration plan',
      data: {
        milestones: [
          { date: 'Fri', label: 'Export from HubSpot', body: 'Contacts, companies, deals, notes' },
          { date: 'Sat AM', label: 'Import to Ardovo', body: 'Field mapping, dedupe on the way in' },
          { date: 'Sat PM', label: 'Rebuild automations', body: 'Journeys and sequences, guided' },
          { date: 'Sun', label: 'Verify and cut over', body: 'Reports tie out, team trained' },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'The honest trade-offs',
      prosLabel: 'Why teams switch',
      consLabel: 'What to plan for',
      pros: [
        'One flat price instead of seats plus add-ons that climb as you grow.',
        'CRM, marketing, CPQ, and billing that share one source of truth.',
        'An AI operator that executes work, not just a suggestion engine.',
        'Live on day one instead of weeks of hub-by-hub setup.',
      ],
      cons: [
        'Migrating automations is real work, even when it is guided.',
        'A large HubSpot content library needs a deliberate content export.',
        'Teams deeply embedded in the HubSpot app marketplace should audit integrations first.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'Is there a HubSpot alternative that includes marketing and CRM in one price?', a: 'Yes. Ardovo bundles CRM, marketing automation, journeys, CPQ, and billing under one flat per-seat price, with no core-feature add-ons, so the bill stays predictable as you grow.' },
        { q: 'How hard is it to migrate off HubSpot?', a: 'For most teams it is a weekend. Export contacts, companies, and deals, import with field mapping and dedupe, rebuild automations with a guided journey builder, then verify reports before cutover.' },
        { q: 'Will I lose my automations?', a: 'No. You rebuild them, and a visual journey builder with AI decision steps usually makes them simpler than the original. Plan a few hours for a complex account.' },
        { q: 'Does Ardovo have an AI like HubSpot Breeze?', a: 'Ardovo goes further. Rook is an AI operator that executes multi-step revenue work end to end, with a trust dial, rather than only drafting suggestions for a human to run.' },
        { q: 'Is Ardovo cheaper than HubSpot?', a: 'For most teams, meaningfully. Use the calculator above with your real seat count and add-on spend. The savings come from bundling add-ons and flat per-seat pricing.' },
      ],
    },
  ],
  related: ['crm-roi-calculator', 'best-ai-crm', 'crm-for-startups'],
};

export default entry;
