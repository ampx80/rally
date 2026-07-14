// ============================================================
// JUGGERNAUT GUIDE
// Slug: sales-quota-setting-guide -> live at /guides/sales-quota-setting-guide
// How to Set Sales Quotas That Work (2026). ASCII only. No em/en dash.
// ============================================================

const entry = {
  slug: 'sales-quota-setting-guide',
  title: 'How to Set Sales Quotas That Work (2026)',
  h1: 'How to Set Sales Quotas That Work: A 2026 Playbook',
  metaTitle: 'How to Set Sales Quotas That Work in 2026: Capacity Math, Calculator, and Process | Rally',
  metaDescription: 'A deep, practical guide to setting sales quotas in 2026: top-down vs bottom-up, capacity and coverage math with a live calculator, a step-by-step process, ramp and seasonality, and the trade-offs of getting it wrong.',
  eyebrow: 'RevOps Playbook',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A sales quota is a promise about the future written before the future arrives, and most of them are wrong on the day they are published. Set it too high and you burn out reps, inflate the forecast, and watch attrition climb. Set it too low and you leave revenue on the table and pay commissions on numbers that never stretched anyone.',
    'The fix is not a better guess. It is a repeatable method that reconciles two views: the number the business needs from the top down, and the number the team can actually produce from the bottom up. This guide walks through both, gives you the capacity and coverage math to check them against each other, and shows how to keep quotas honest through ramp, seasonality, and territory change.',
  ],
  heroStats: [
    { value: 60, prefix: '~', suffix: '%', label: 'Typical share of reps who hit quota in a healthy year' },
    { value: 3, suffix: 'x', label: 'Pipeline coverage most teams aim for against quota' },
    { value: 90, prefix: '~', suffix: '%', label: 'Attainment a well-set quota targets at the median' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What a quota is really for',
      body: [
        'A quota is not a wish, and it is not a punishment. It is a planning instrument with three jobs: translate a company revenue goal into per-rep targets, give each rep a clear line between winning and missing, and make the forecast believable enough to run the business on. When a quota does all three, the number on the plan and the number in the bank start to agree.',
        'The single most useful benchmark to hold in your head is that in a healthy sales org, roughly half to two thirds of reps should hit quota in a normal year. If almost everyone hits, the number is too soft and you are underpaying yourself in growth. If almost nobody hits, the number is fantasy, and the first casualty is trust, followed quickly by your best reps walking out the door.',
        'Everything else in this guide is in service of landing in that healthy band on purpose rather than by luck.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The reconciliation rule',
      body: 'Never ship a quota that only survives one direction of math. A number the CFO needs from the top down is a hypothesis until the bottom-up capacity math says the team can carry it. When the two disagree, you have a hiring, pricing, or expectations problem to solve before quotas go out, not after.',
    },
    {
      type: 'heading',
      text: 'Top-down vs bottom-up',
      eyebrow: 'Two ways to reach a number',
    },
    {
      type: 'richText',
      title: 'The two methods, and why you need both',
      body: [
        'Top-down starts with the company goal. Finance sets a revenue target, you subtract expected renewals and expansion, and whatever gap remains is new-business quota to be divided across the team. It is fast, it ties directly to the board plan, and it is completely blind to whether the field can actually deliver it.',
        'Bottom-up starts with the rep. You take realistic capacity per person, the number of deals one seller can genuinely work given ramp, territory, and lead flow, multiply by average deal size and expected win rate, and roll it up. It is grounded in reality but it can quietly under-serve an ambitious growth plan if you let comfortable assumptions creep in.',
        'The mature move is to run both independently and then negotiate the gap. Top-down keeps you honest about ambition; bottom-up keeps you honest about physics. The final quota lives where a defensible version of each can meet.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Top-down vs bottom-up quota setting',
      rowHeader: 'Dimension',
      columns: ['Top-down', 'Bottom-up', 'Reconciled'],
      highlightCol: 2,
      rows: [
        { feature: 'Starting point', cells: ['Company revenue goal', 'Per-rep capacity', 'Both, negotiated'] },
        { feature: 'Ties to the board plan', cells: [true, 'partial', true] },
        { feature: 'Grounded in field reality', cells: [false, true, true] },
        { feature: 'Speed to produce', cells: ['Fast', 'Slow', 'Moderate'] },
        { feature: 'Risk if used alone', cells: ['Unreachable targets', 'Under-ambition', 'Lowest'] },
        { feature: 'Exposes hiring gaps', cells: [false, true, true] },
        { feature: 'Rep buy-in', cells: ['Low', 'High', 'High'] },
        { feature: 'Recommended as sole method', cells: [false, false, true] },
      ],
      footnote: 'Reconciled means running both methods independently, then resolving the gap through hiring, pricing, or goal adjustment before quotas ship.',
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The reconciliation loop',
      caption: 'Two independent numbers meet in the middle, and the gap gets solved before publication.',
      data: {
        nodes: [
          { label: 'Revenue goal', sub: 'top-down' },
          { label: 'Capacity model', sub: 'bottom-up' },
          { label: 'Compare gap', sub: 'where they differ' },
          { label: 'Solve gap', sub: 'hire, price, adjust' },
          { label: 'Publish quota', sub: 'both agree' },
        ],
      },
    },
    {
      type: 'heading',
      text: 'The capacity and coverage math',
      eyebrow: 'How the numbers actually work',
    },
    {
      type: 'richText',
      title: 'Capacity math from the ground up',
      body: [
        'Rep capacity is the honest ceiling on what one seller can produce in a period. Start with selling days, subtract the time real life removes (onboarding, training, admin, holidays, PTO), and you are left with true productive selling time. Multiply the deals that time can carry by average deal size and win rate to get capacity in revenue.',
        'Coverage is the companion metric. Because not every deal in the pipeline closes, you need more pipeline than quota, usually around three times, to give a rep a fair shot. If quota is 1 million and your win rate is roughly one in three, you need on the order of 3 million in qualified pipeline flowing to that rep to make the number reachable. When coverage is thin, the quota is unreachable no matter how motivated the rep is.',
        'The calculator below turns these relationships into numbers you can adjust. It is a model, not a promise, but it will tell you fast whether a proposed quota is grounded or aspirational.',
      ],
    },
    {
      type: 'calculator',
      title: 'Quota capacity and coverage calculator',
      intro: 'Model whether a proposed quota is reachable given your deal size, win rate, and lead flow. Adjust the inputs on the live page to match your team.',
      inputs: [
        { key: 'quota', label: 'Annual quota per rep', type: 'number', default: 1000000, min: 10000, max: 20000000, step: 10000, unit: 'USD' },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 25000, min: 100, max: 5000000, step: 100, unit: 'USD' },
        { key: 'winRate', label: 'Win rate on qualified deals', type: 'range', default: 25, min: 1, max: 80, step: 1, unit: '%' },
        { key: 'leads', label: 'Qualified opportunities per rep, per month', type: 'number', default: 12, min: 1, max: 500, step: 1 },
        { key: 'ramp', label: 'Ramp discount for the period', type: 'range', default: 0, min: 0, max: 60, step: 5, unit: '%' },
      ],
      outputs: [
        { key: 'dealsNeeded', label: 'Deals to close per year', expr: 'quota / deal', format: 'decimal:0' },
        { key: 'oppsNeeded', label: 'Qualified opps needed per year', expr: 'quota / deal / (winRate / 100)', format: 'decimal:0' },
        { key: 'coverageNeeded', label: 'Pipeline coverage needed', expr: 'quota / (winRate / 100)', format: 'currency' },
        { key: 'oppsSupplied', label: 'Qualified opps supplied per year', expr: 'leads * 12', format: 'decimal:0' },
        { key: 'effectiveQuota', label: 'Reachable quota at this lead flow', expr: 'leads * 12 * (winRate / 100) * deal * (1 - ramp / 100)', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Read the calculator this way',
      body: 'If the reachable quota lands well below the annual quota, the number is unreachable at that lead flow no matter the rep. Fix it by increasing qualified pipeline, raising deal size, improving win rate, or lowering the quota. The one thing that never fixes it is asking harder.',
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Pipeline coverage against a 1M quota at different win rates',
      caption: 'Lower win rates demand dramatically more pipeline to make the same quota reachable.',
      data: {
        bars: [
          { label: '40% win rate', value: 2.5, display: '2.5M pipeline' },
          { label: '33% win rate', value: 3.0, display: '3.0M pipeline', highlight: true },
          { label: '25% win rate', value: 4.0, display: '4.0M pipeline' },
          { label: '20% win rate', value: 5.0, display: '5.0M pipeline' },
        ],
      },
    },
    {
      type: 'heading',
      text: 'A quota-setting process you can repeat',
      eyebrow: 'Do it the same way every time',
    },
    {
      type: 'steps',
      title: 'Seven steps from company goal to published quota',
      ordered: true,
      steps: [
        { title: 'Anchor the company number', body: 'Start with the board-approved revenue goal for the year, then split it into retention, expansion, and net-new. Only the net-new portion becomes sales quota.' },
        { title: 'Build the capacity model', body: 'For each role, estimate productive selling time, deals per rep, average deal size, and win rate. Roll it up to a bottom-up team number that ignores the goal entirely.' },
        { title: 'Check coverage', body: 'Confirm that expected qualified pipeline is roughly three times quota, adjusted for your real win rate. If coverage is thin, the quota is fiction until marketing and prospecting close the gap.' },
        { title: 'Reconcile the two views', body: 'Compare top-down and bottom-up. Close any gap with concrete levers: hire more reps, raise price, improve conversion, or revise the goal. Do not paper over it with optimism.' },
        { title: 'Apply ramp and seasonality', body: 'Discount new hires on a ramp schedule and shape monthly targets to your real demand curve. A flat one-twelfth per month quota ignores how your business actually buys.' },
        { title: 'Stress-test attainment', body: 'Model the quota against last year. If it implies almost everyone or almost nobody hits, adjust until a healthy band, roughly half to two thirds, lands in reach.' },
        { title: 'Publish, then commit to a review cadence', body: 'Ship the number with the reasoning, and schedule a mid-period review. Quotas set once and never revisited drift out of reality fast.' },
      ],
    },
    {
      type: 'animatedStat',
      title: 'Benchmarks worth calibrating against',
      stats: [
        { value: 60, format: 'decimal:0', suffix: '%', label: 'Reps who hit quota in a healthy year (typical)', trend: 'target band 50-66%', trendDir: 'flat' },
        { value: 3, format: 'decimal:0', suffix: 'x', label: 'Pipeline coverage most teams target against quota', trend: 'higher when win rate is low', trendDir: 'up' },
        { value: 90, format: 'decimal:0', suffix: '%', label: 'Median attainment a well-set quota aims for', trend: 'stretch, not impossible', trendDir: 'flat' },
      ],
    },
    {
      type: 'heading',
      text: 'Ramp and seasonality',
      eyebrow: 'Quotas change over time',
    },
    {
      type: 'richText',
      title: 'Why a flat quota is almost always wrong',
      body: [
        'A new rep cannot carry a full number on day one. Ramp is the period, often three to nine months depending on deal complexity, before a seller reaches full productivity. Quota for a ramping rep should step up on a schedule that mirrors the sales cycle, so a rep hired in Q1 might carry a fraction of full quota in their first months and reach full load only once early pipeline has time to close.',
        'Seasonality is the other reason flat quotas lie. Very few businesses sell evenly across twelve months. If your buyers go quiet in summer and rush to sign before year-end, a flat one-twelfth-per-month quota will look like failure in July and easy in December, when in truth the rep is performing exactly to the real demand curve. Shape monthly targets to the pattern in your own historical data.',
        'Both adjustments come straight out of your CRM if the data is clean. Ramp schedules key off hire dates; seasonality keys off two or three years of closed-won by month. This is exactly the kind of derivation an AI-native platform can keep current automatically instead of leaving it to a quarterly spreadsheet.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A typical new-hire ramp schedule',
      caption: 'Quota steps up as early pipeline matures, rather than starting at full load.',
      data: {
        milestones: [
          { date: 'Month 1', label: '0% of full quota', body: 'Onboarding and training' },
          { date: 'Month 2-3', label: '25% of full quota', body: 'First pipeline built' },
          { date: 'Month 4-6', label: '50-75% of full quota', body: 'Early deals closing' },
          { date: 'Month 7+', label: '100% of full quota', body: 'Fully ramped' },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'From qualified opportunity to quota credit',
      caption: 'Only a fraction of qualified pipeline converts, which is why coverage has to exceed quota.',
      data: {
        stages: [
          { label: 'Qualified opportunities', value: 100, pct: 100 },
          { label: 'Reached proposal', value: 55, pct: 55 },
          { label: 'In negotiation', value: 38, pct: 38 },
          { label: 'Closed won', value: 25, pct: 25 },
          { label: 'Retained to full term', value: 22, pct: 22 },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'Setting quotas aggressively vs conservatively',
      prosLabel: 'A stretch quota can',
      consLabel: 'But watch for',
      pros: [
        'Signal ambition and pull performance upward when paired with real pipeline.',
        'Keep top reps engaged rather than coasting on an easy number.',
        'Align the field with a genuine growth plan the board is counting on.',
        'Surface capacity gaps early, so hiring happens before the miss.',
      ],
      cons: [
        'Unreachable numbers crush morale and drive your best reps to leave.',
        'Inflated quotas produce an inflated forecast the business cannot trust.',
        'Commission plans tied to fantasy attainment get renegotiated mid-year, which is corrosive.',
        'Sandbagging appears when reps sense the number is arbitrary rather than earned.',
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'How quota, capacity, and forecast connect in one system',
      caption: 'When pipeline, quota, and attainment share one source of truth, the numbers tie out.',
      data: {
        layers: [
          { label: 'Inputs', nodes: ['Hire dates', 'Deal size', 'Win rate', 'Lead flow'] },
          { label: 'Models', nodes: ['Capacity', 'Coverage', 'Ramp', 'Seasonality'] },
          { label: 'Operator', nodes: ['Reconcile', 'Flag risk', 'Recalc'] },
          { label: 'Surfaces', nodes: ['Quota', 'Forecast', 'Attainment'] },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'Where a live CRM earns its keep',
      body: 'Quotas rot when the inputs live in a spreadsheet nobody refreshes. Rally keeps deal size, win rate, ramp, and coverage current from the same source of truth the pipeline runs on, so a quota you set in January still reflects reality in June. Rook, the built-in operator, flags when coverage drops below the level a quota needs and drafts the adjustment before the quarter is lost. One flat price, alive on first load, verify current pricing on the site.',
    },
    {
      type: 'quote',
      text: 'The quarter we started reconciling top-down against real capacity, our forecast stopped lying to us. We set a harder number and hit it, because for once it was actually reachable.',
      cite: 'A Rally customer',
      role: 'VP Sales, mid-market SaaS',
    },
    {
      type: 'richText',
      title: 'Common quota mistakes to avoid',
      body: [
        'The most frequent error is publishing a top-down number with no bottom-up check, which produces a quota that looks great on the plan and is physically impossible in the field. The second is a flat monthly split that ignores ramp and seasonality, so managers spend the first half of the year explaining misses that were baked in by the math. The third is setting quotas once and never revisiting them, letting them drift as territories, pricing, and lead flow change underneath.',
        'The antidote to all three is the same: treat quota as a living model tied to real CRM data, reconcile the two directions of math before you publish, and review on a cadence. A quota that is transparent about its own reasoning earns buy-in, and buy-in is what turns a number on a page into results in the pipeline.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What percentage of reps should hit quota?', a: 'In a healthy sales organization, roughly half to two thirds of reps hit quota in a normal year. If nearly everyone hits, the number is too soft and you are leaving growth on the table. If almost nobody hits, the quota is unreachable and you will lose trust and then people.' },
        { q: 'How much pipeline coverage do I need against quota?', a: 'A common rule of thumb is about three times quota in qualified pipeline, but the right multiple depends on your win rate. At a one-in-three win rate, three times is reasonable; at a one-in-five win rate you need closer to five times. Always derive coverage from your real conversion data rather than a generic number.' },
        { q: 'Should I use top-down or bottom-up quota setting?', a: 'Use both. Build a top-down number from the company revenue goal and an independent bottom-up number from per-rep capacity, then reconcile the gap with concrete levers before publishing. Relying on either method alone produces quotas that are unreachable or under-ambitious.' },
        { q: 'How do I handle quota for a newly hired rep?', a: 'Apply a ramp schedule instead of full quota from day one. Depending on sales-cycle length, a new rep might carry zero in month one, a quarter of full quota by month three, and reach full load somewhere between months four and nine once their early pipeline has time to close.' },
        { q: 'How often should quotas be reviewed?', a: 'Publish quotas with the reasoning intact and schedule at least a mid-period review. Territories, pricing, lead flow, and headcount all change through the year, and a quota set once and never revisited drifts out of reality. A living model tied to CRM data stays honest with far less effort.' },
        { q: 'What is the biggest quota-setting mistake?', a: 'Shipping a number that only survives one direction of math. A top-down target the CFO needs is a hypothesis until the bottom-up capacity and coverage math confirms the team can carry it. When the two disagree, solve the gap through hiring, pricing, or goal adjustment before quotas go out, not after reps have already missed.' },
      ],
    },
  ],
  related: ['sales-forecasting-guide', 'sales-compensation-plans-guide', 'sales-kpis-and-metrics'],
};

export default entry;
