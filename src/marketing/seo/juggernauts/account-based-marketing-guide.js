// ============================================================
// JUGGERNAUT GUIDE  (isolated best-in-class SEO track)
// Slug: account-based-marketing-guide -> live at /guides/account-based-marketing-guide
// Registered centrally in ../juggernaut-registry.js by the integrator.
// NO em-dash / en-dash. ASCII only.
// ============================================================

const entry = {
  slug: 'account-based-marketing-guide',
  title: 'Account-Based Marketing (ABM): The Complete Guide',
  h1: 'Account-Based Marketing: The Complete Guide for 2026',
  metaTitle: 'Account-Based Marketing (ABM): The Complete 2026 Guide, Funnel, and Calculator | Ardovo',
  metaDescription: 'A deep, practical guide to account-based marketing in 2026: the flipped ABM funnel, how to tier target accounts, sales and marketing alignment, a TAM and pipeline calculator, and ABM vs demand gen compared.',
  eyebrow: 'Revenue Playbook',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'Account-based marketing flips the traditional funnel on its head. Instead of casting a wide net and hoping a few good-fit companies fall out the bottom, ABM starts with a named list of the accounts you most want to win and orchestrates sales and marketing around them from the very first touch.',
    'This guide is the practical playbook: what ABM actually is, how the flipped funnel works, how to tier your target accounts, how to get sales and marketing genuinely aligned, and how to size the prize with a TAM and pipeline model. It is written to be useful whether you run ABM inside a spreadsheet or an AI-native platform.',
  ],
  heroStats: [
    { value: 76, suffix: '%', label: 'Of ABM programs report higher ROI than other marketing' },
    { value: 3, suffix: 'x', label: 'Typical lift in deal size on named target accounts' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'One flat Ardovo price across every revenue module' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What account-based marketing actually is',
      body: [
        'Account-based marketing is a go-to-market strategy that treats a specific set of high-value accounts as markets of one. Rather than generating a large volume of leads and qualifying them down, you agree on the exact companies worth pursuing, then coordinate marketing, sales, and customer teams to engage the buying group inside each of those companies with relevant, personalized outreach.',
        'The shift is from lead-centric to account-centric. In classic demand generation the unit of work is a lead: a single person who filled out a form. In ABM the unit of work is an account: a company with a buying committee of five to ten people who must reach consensus. That reframing changes everything downstream, from how you measure success to how sales and marketing split the work.',
        'ABM is not new. What is new in 2026 is that the data and AI to run it well are finally accessible to teams that are not enterprise giants. Intent signals, firmographic enrichment, and an AI operator that can draft account-specific outreach mean a two-person team can run plays that used to require a dedicated ops function.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The one-line definition',
      body: 'ABM is picking the exact companies you want to win, then aligning sales and marketing to engage each one as a named account instead of a stream of anonymous leads.',
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'The flipped ABM funnel',
      caption: 'Traditional demand gen starts wide and narrows. ABM starts narrow, with named accounts, and expands engagement and revenue outward.',
      data: {
        stages: [
          { label: 'Identify target accounts', value: 100, pct: 100 },
          { label: 'Engage the buying group', value: 82, pct: 82 },
          { label: 'Activate a real opportunity', value: 54, pct: 54 },
          { label: 'Close and expand', value: 31, pct: 31 },
          { label: 'Advocate and refer', value: 18, pct: 18 },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Why the funnel flips',
      body: [
        'In a demand-gen funnel, the widest part is at the top: thousands of leads enter, and a small percentage survive to become customers. The metaphor is a filter. In ABM the widest part is at the bottom. You begin with a deliberately small set of accounts and the goal is to grow the relationship, the deal size, and the number of engaged stakeholders inside each one over time.',
        'This is why ABM teams do not obsess over lead volume. A program that touches fifty accounts and closes twelve of them, each worth six figures, beats a program that captures ten thousand leads and closes a hundred small deals. The math of a flipped funnel rewards depth over breadth, which is exactly why fit and prioritization matter so much before you spend a dollar.',
      ],
    },
    {
      type: 'heading',
      text: 'How to tier your target accounts',
      eyebrow: 'Prioritization',
    },
    {
      type: 'steps',
      title: 'Building your target account list, tier by tier',
      ordered: true,
      steps: [
        { title: 'Define your ideal customer profile', body: 'Start with the firmographic and behavioral traits of your best current customers: industry, size, tech stack, growth rate, and the pain you solve. This is the filter every account is measured against.' },
        { title: 'Pull the total addressable universe', body: 'List every company that matches the ICP, using enrichment and intent data. This is your raw pool before any prioritization. Do not personalize yet, just capture who could plausibly buy.' },
        { title: 'Score for fit and intent', body: 'Rank each account on how well it fits the ICP and whether it is showing buying signals right now. Fit tells you who is worth winning; intent tells you who is worth calling this quarter.' },
        { title: 'Tier one: strategic accounts', body: 'The top slice, often ten to fifty logos, get fully personalized, one-to-one treatment: custom content, named executive sponsors, and direct sales orchestration. These are your must-win accounts.' },
        { title: 'Tier two: lighthouse cluster', body: 'A larger group receives one-to-few plays: light personalization by industry or use case, shared campaigns, and coordinated but less bespoke outreach.' },
        { title: 'Tier three: programmatic', body: 'The broadest tier runs one-to-many: automated, segment-level campaigns with intent-triggered follow-up. When a tier-three account heats up, it gets promoted upward.' },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Fit and intent are two different axes',
      body: 'A perfect-fit account with no buying signal belongs in nurture. A weaker-fit account showing strong intent may still be worth a fast play. Score both, and let an account move between tiers as signals change.',
    },
    {
      type: 'animatedStat',
      title: 'What good ABM programs tend to see',
      stats: [
        { value: 76, format: 'number', suffix: '%', label: 'Of teams running ABM report it outperforms other marketing on ROI', trend: 'industry survey, typical', trendDir: 'up' },
        { value: 91, format: 'number', suffix: '%', label: 'Larger average deal size on target accounts vs non-target', trend: 'reported median lift', trendDir: 'up' },
        { value: 208, format: 'number', suffix: '%', label: 'More revenue attributed to tightly aligned sales and marketing teams', trend: 'vs poorly aligned peers', trendDir: 'up' },
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Where marketing spend concentrates by tier',
      caption: 'A healthy ABM budget mirrors the flipped funnel: the fewest accounts get the deepest investment per account.',
      data: {
        bars: [
          { label: 'Tier 1 (per account)', value: 100, display: 'Deepest spend', highlight: true },
          { label: 'Tier 2 (per account)', value: 45, display: 'Moderate' },
          { label: 'Tier 3 (per account)', value: 12, display: 'Programmatic' },
        ],
      },
    },
    {
      type: 'heading',
      text: 'Getting sales and marketing aligned',
      eyebrow: 'Operating model',
    },
    {
      type: 'richText',
      title: 'ABM lives or dies on alignment',
      body: [
        'The single most common reason ABM programs fail is that marketing builds a target list and sales ignores it, or sales chases accounts marketing never supports. ABM only works when both teams commit to the same named list, the same definitions, and a shared view of every account.',
        'Practically, that means one source of truth. When marketing sees engagement signals and sales sees deal stage in two different systems, the account view fractures and the plays fall out of sync. A modern platform keeps the account, its buying group, its intent signals, and its opportunity in one record so both teams are always looking at the same picture.',
        'The best programs run a weekly account review where sales and marketing sit together over the tier-one list: who moved, who went quiet, who needs air cover, and which play runs next. That cadence, more than any tool, is what turns a target list into pipeline.',
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'The aligned ABM operating stack',
      caption: 'One account record feeds both teams, so marketing signals and sales motion stay in sync instead of drifting apart.',
      data: {
        layers: [
          { label: 'Signals', nodes: ['Intent data', 'Web visits', 'Ad engagement', 'Form fills'] },
          { label: 'Account record', nodes: ['Firmographics', 'Buying group', 'Tier', 'Opportunity'] },
          { label: 'Orchestration', nodes: ['Route', 'Personalize', 'Sequence', 'Alert'] },
          { label: 'Shared surfaces', nodes: ['Account view', 'Pipeline', 'Reporting'] },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'How an account moves through an aligned play',
      data: {
        nodes: [
          { label: 'Account tiered', sub: 'fit + intent' },
          { label: 'Marketing warms', sub: 'ads + content' },
          { label: 'Signal fires', sub: 'intent spike' },
          { label: 'Sales engages', sub: 'named contact' },
          { label: 'Deal + expand', sub: 'shared record' },
        ],
      },
    },
    {
      type: 'quote',
      text: 'The moment sales and marketing worked one target list off one account view, our win rate on strategic logos roughly doubled. The list stopped being marketing homework and started being pipeline.',
      cite: 'A Ardovo customer',
      role: 'VP Revenue, B2B software',
    },
    {
      type: 'calculator',
      title: 'ABM TAM and pipeline calculator',
      intro: 'Size the prize before you commit budget. Estimate your addressable accounts, expected pipeline, and revenue from an ABM program. Adjust the inputs on the live page to model your own numbers.',
      inputs: [
        { key: 'accounts', label: 'Accounts matching your ICP (TAM)', type: 'number', default: 800, min: 10, max: 100000, step: 10 },
        { key: 'targetPct', label: 'Share you actively target', type: 'range', default: 20, min: 1, max: 100, step: 1, unit: '%' },
        { key: 'engageRate', label: 'Targeted accounts you engage', type: 'range', default: 45, min: 1, max: 100, step: 1, unit: '%' },
        { key: 'oppRate', label: 'Engaged accounts that open an opportunity', type: 'range', default: 30, min: 1, max: 100, step: 1, unit: '%' },
        { key: 'winRate', label: 'Opportunity win rate', type: 'range', default: 28, min: 1, max: 90, step: 1, unit: '%' },
        { key: 'acv', label: 'Average annual contract value', type: 'number', default: 42000, min: 500, max: 5000000, step: 500, unit: 'USD' },
      ],
      outputs: [
        { key: 'targeted', label: 'Accounts actively targeted', expr: 'accounts * (targetPct / 100)', format: 'decimal:0' },
        { key: 'engaged', label: 'Accounts engaged', expr: 'accounts * (targetPct / 100) * (engageRate / 100)', format: 'decimal:0' },
        { key: 'opps', label: 'Opportunities created', expr: 'accounts * (targetPct / 100) * (engageRate / 100) * (oppRate / 100)', format: 'decimal:0' },
        { key: 'wins', label: 'Deals won per cycle', expr: 'accounts * (targetPct / 100) * (engageRate / 100) * (oppRate / 100) * (winRate / 100)', format: 'decimal:0' },
        { key: 'pipeline', label: 'Pipeline created', expr: 'accounts * (targetPct / 100) * (engageRate / 100) * (oppRate / 100) * acv', format: 'currency' },
        { key: 'revenue', label: 'Revenue won per cycle', expr: 'accounts * (targetPct / 100) * (engageRate / 100) * (oppRate / 100) * (winRate / 100) * acv', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'richText',
      title: 'How to read the model',
      body: [
        'The calculator makes the flipped funnel concrete. Notice how a modest targeted list can still throw off serious pipeline when the conversion rates between stages are healthy, because each account is worth so much more than a stray lead. That is the ABM bargain: fewer accounts, far higher value per account.',
        'It also shows where to focus. If your engage rate is low, the problem is reach and relevance, not close skill. If opportunities are plentiful but wins are rare, the problem is fit or sales execution, not top of funnel. Model your own numbers and the weakest link becomes obvious.',
      ],
    },
    {
      type: 'heading',
      text: 'ABM vs demand generation',
      eyebrow: 'Strategy comparison',
    },
    {
      type: 'comparisonMatrix',
      title: 'ABM vs demand gen, compared honestly',
      rowHeader: 'Dimension',
      columns: ['Account-Based Marketing', 'Demand Generation'],
      highlightCol: 0,
      rows: [
        { feature: 'Unit of work', cells: ['Named account', 'Individual lead'] },
        { feature: 'Funnel shape', cells: ['Flipped, expands outward', 'Traditional, narrows down'] },
        { feature: 'Best for', cells: ['High ACV, complex sales', 'High volume, self-serve or SMB'] },
        { feature: 'Time to first result', cells: ['Slower, relationship-led', 'Faster, volume-led'] },
        { feature: 'Sales and marketing alignment', cells: ['Required to work', 'Helpful but not mandatory'] },
        { feature: 'Personalization depth', cells: ['High, per account', 'Low to moderate, per segment'] },
        { feature: 'Primary metric', cells: ['Account engagement and pipeline', 'Lead volume and cost per lead'] },
        { feature: 'Deal size impact', cells: [true, 'partial'] },
      ],
      footnote: 'Most mature revenue teams run both: demand gen fills the top of a broad funnel while ABM concentrates effort on the accounts that matter most. Treat them as complementary, not rival, strategies.',
    },
    {
      type: 'prosCons',
      title: 'When ABM is the right call, and when it is not',
      prosLabel: 'ABM fits when',
      consLabel: 'Stay with demand gen when',
      pros: [
        'Your deals are large, considered, and involve a buying committee.',
        'You can name the specific companies worth winning.',
        'Sales and marketing are willing to work one shared list.',
        'Customer lifetime value justifies deep per-account investment.',
      ],
      cons: [
        'You sell a low-price, high-volume, or self-serve product.',
        'Your addressable market is enormous and undifferentiated.',
        'You cannot yet identify which accounts are worth targeting.',
        'You need fast, broad pipeline more than deep, named wins.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A realistic first-90-days ABM rollout',
      data: {
        milestones: [
          { date: 'Week 1', label: 'Agree the ICP and tier-one list', body: 'Sales and marketing sign off together' },
          { date: 'Week 3', label: 'Unify the account view', body: 'One record per account, signals attached' },
          { date: 'Week 5', label: 'Launch tier-one plays', body: 'Personalized outreach and content live' },
          { date: 'Week 8', label: 'First account review cadence', body: 'Weekly joint review of movement' },
          { date: 'Week 12', label: 'Measure and expand', body: 'Engagement to pipeline, promote hot tier-three accounts' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Where an AI-native platform changes the ABM math',
      body: [
        'The historical barrier to ABM was labor. Personalizing outreach to fifty buying groups, watching intent across hundreds of accounts, and keeping sales and marketing on the same record used to demand a dedicated operations team. That is why ABM stayed the preserve of large enterprises.',
        'An AI-native revenue platform removes that barrier. Ardovo keeps every account, its buying group, its signals, and its opportunity in a single live record, so sales and marketing never drift out of sync. Its operator, Rook, enriches accounts, watches for intent spikes, drafts account-specific outreach, and flags which tier-one logos are going cold, all on one flat price rather than a stack of add-ons. That does not replace strategy, but it makes running a disciplined ABM program realistic for a team of two, not just a department of twenty. As always, verify current pricing and packaging before you plan a budget around it.',
      ],
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'The takeaway',
      body: 'ABM wins when the prize is worth the focus: name the accounts, tier them by fit and intent, align sales and marketing on one shared record, and measure engagement and pipeline instead of raw lead volume.',
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What is account-based marketing in simple terms?', a: 'ABM is a strategy where you pick the specific companies you most want as customers, then align sales and marketing to engage each one as a named account with personalized outreach, instead of chasing a large volume of anonymous leads.' },
        { q: 'How is ABM different from demand generation?', a: 'Demand gen treats the individual lead as the unit of work and starts with a wide funnel that narrows down. ABM treats the account as the unit of work and flips the funnel: you start with a small, named list and expand engagement, deal size, and revenue outward. Most mature teams run both together.' },
        { q: 'How do you tier target accounts?', a: 'Define your ideal customer profile, list every matching company, then score each on fit and current buying intent. The strongest slice becomes tier one with fully personalized one-to-one treatment, a larger group gets tier-two one-to-few plays, and the rest run programmatic one-to-many campaigns. Accounts move between tiers as signals change.' },
        { q: 'Why does ABM need sales and marketing alignment?', a: 'Because the unit of work is a whole account with a buying committee, both teams must work the same named list off the same shared record. When marketing signals and sales motion live in separate systems, the account view fractures and plays fall out of sync. One source of truth plus a weekly joint account review is what turns a target list into pipeline.' },
        { q: 'Is ABM only for large enterprises?', a: 'Historically yes, because personalizing outreach across many accounts took a dedicated ops team. Modern data and AI-native platforms now let a small team run tiered ABM plays, watch intent, and keep both teams aligned on one record, so ABM is realistic well below enterprise scale.' },
        { q: 'How do you measure ABM success?', a: 'Not by lead volume. Track account engagement, the number of active target accounts moving toward an opportunity, pipeline created on target accounts, average deal size versus non-target deals, and win rate on tier-one logos. The TAM and pipeline calculator on this page shows how those stage rates roll up into revenue.' },
      ],
    },
  ],
  related: ['revenue-operations-guide', 'lead-management-guide', 'sales-pipeline-management'],
};

export default entry;
