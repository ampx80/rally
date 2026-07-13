// ============================================================
// JUGGERNAUT GUIDE  (isolated best-in-class SEO track)
// Slug: sales-forecasting-guide -> live at /guides/sales-forecasting-guide
// Deep, quotable guide to sales forecasting: methods, formulas,
// a live weighted-pipeline calculator, accuracy-over-time bars,
// and a forecast-call runbook. NO em-dash / en-dash. ASCII only.
// ============================================================

const entry = {
  slug: 'sales-forecasting-guide',
  title: 'Sales Forecasting: Methods, Formulas, and a Calculator',
  h1: 'Sales Forecasting: Methods, Formulas, and a Free Calculator',
  metaTitle: 'Sales Forecasting Guide (2026): Methods, Weighted-Pipeline Formula, and Calculator | Rally',
  metaDescription: 'A practical guide to sales forecasting: the main methods compared, the weighted-pipeline formula with a live calculator, how forecast accuracy improves over time, and how to run a forecast call.',
  eyebrow: 'Revenue Playbook',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '13 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A sales forecast is a prediction of how much revenue your team will close in a defined period, built from the deals in your pipeline and what history says about how those deals behave. The best method for most teams is a weighted pipeline forecast cross-checked against a stage-based roll-up, then reconciled deal by deal on a weekly forecast call. That combination is accurate enough to plan against and simple enough that reps will actually keep it current.',
    'This guide gives you the working parts: the main forecasting methods and when each one fits, the weighted-pipeline formula with a calculator you can run against your own numbers, why forecast accuracy climbs as a deal ages, and a step-by-step runbook for the forecast call itself. Everything here is useful whether you forecast in a spreadsheet or in a CRM that does the math for you.',
  ],
  heroStats: [
    { value: 45, suffix: '%', label: 'Of forecasted deals typically slip or die by close date' },
    { value: 80, prefix: '>', suffix: '%', label: 'Achievable forecast accuracy with weekly deal-level review' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'One flat price on Rally, forecasting included' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What a sales forecast actually is',
      body: [
        'A forecast is not a quota and it is not a wish. A quota is what you commit to hit; a forecast is your honest, evidence-based estimate of what will happen. When the two get blurred, forecasts drift upward to please the number and lose all predictive value. Keep them separate: the forecast answers "what is the truth about this quarter," and the plan answers "what do we do about it."',
        'Every forecast is built from two ingredients: the deals currently in your pipeline, and a probability that each one closes in the period. The methods below differ mainly in where that probability comes from. It can be a gut call, a fixed number attached to each stage, a rate learned from your own history, or a distribution produced by a simulation. The more that probability is grounded in observed data instead of optimism, the more the forecast holds up.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'The core equation',
      body: 'Forecast = the sum across open deals of (deal value x probability of closing this period). Every method in this guide is a different way of estimating that probability. Get the probability honest and the forecast follows.',
    },
    {
      type: 'heading',
      text: 'The four ways teams forecast',
      eyebrow: 'Methods',
    },
    {
      type: 'richText',
      title: 'From gut feel to simulation',
      body: [
        'Gut-feel forecasting is a rep or manager eyeballing the pipeline and calling a number. It is fast and it captures context a formula misses, but it is unauditable, it swings with mood, and it does not scale past a handful of deals. Use it as a sanity check, never as the system of record.',
        'Stage-weighted forecasting assigns a fixed close probability to each pipeline stage: maybe 10 percent at "qualified," 40 percent at "proposal," 70 percent at "negotiation." You multiply each deal value by its stage weight and add them up. It is transparent, easy to explain, and a huge step up from guessing, but the weights are only as good as the stages, and a deal that has been stuck in "negotiation" for ninety days still counts as 70 percent unless someone intervenes.',
        'AI and simulation forecasting learns close probabilities from your own history, per deal, using signals like age in stage, engagement, deal size, source, and how similar past deals resolved. The strongest versions run a Monte Carlo simulation over the whole pipeline to produce a range and a confidence level rather than a single fragile point estimate. This is where an AI-native platform earns its keep: the operator reads every deal every day, not once a week on a call.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Forecasting methods compared',
      rowHeader: 'Property',
      columns: ['Gut feel', 'Stage-weighted', 'AI / simulation'],
      highlightCol: 2,
      rows: [
        { feature: 'Grounded in your own data', cells: [false, 'partial', true] },
        { feature: 'Per-deal probability', cells: [false, false, true] },
        { feature: 'Accounts for deal age and stall', cells: ['partial', false, true] },
        { feature: 'Produces a range, not just a point', cells: [false, false, true] },
        { feature: 'Auditable and explainable', cells: [false, true, true] },
        { feature: 'Effort to maintain', cells: ['Low', 'Medium', 'Low once wired'] },
        { feature: 'Holds up past ~30 open deals', cells: [false, 'partial', true] },
        { feature: 'Improves automatically over time', cells: [false, false, true] },
      ],
      footnote: 'Most healthy teams run stage-weighted as the baseline and layer AI scoring on top, using gut feel only to challenge outliers on the forecast call.',
    },
    {
      type: 'heading',
      text: 'The weighted-pipeline formula',
      eyebrow: 'Do the math',
    },
    {
      type: 'richText',
      title: 'How to compute a weighted forecast by hand',
      body: [
        'The weighted pipeline forecast is the workhorse formula. For each open deal, multiply its value by the close probability of its current stage. Sum those weighted values and you have the expected revenue from your current pipeline. Add any revenue already closed this period and you have your total forecast.',
        'A worked example: suppose you have four open deals. A 20,000 deal at "proposal" (40 percent) contributes 8,000. A 50,000 deal at "negotiation" (70 percent) contributes 35,000. A 10,000 deal at "qualified" (10 percent) contributes 1,000. A 15,000 deal at "verbal yes" (90 percent) contributes 13,500. The weighted pipeline is 57,500. If you have already closed 30,000 this quarter, your forecast is 87,500. The formula rewards discipline: it stops one giant early-stage deal from making the quarter look safe when it is not.',
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The weighted-forecast pipeline, deal by deal',
      data: {
        nodes: [
          { label: 'Deal value', sub: 'e.g. 50,000' },
          { label: 'x stage weight', sub: '70% at negotiation' },
          { label: '= weighted value', sub: '35,000 expected' },
          { label: 'Sum all deals', sub: 'weighted pipeline' },
          { label: '+ already closed', sub: 'total forecast' },
        ],
      },
    },
    {
      type: 'calculator',
      title: 'Weighted-pipeline forecast calculator',
      intro: 'Enter your open pipeline and the average close probability across your deals to see the weighted forecast, the gap to quota, and how much pipeline you still need. Adjust the inputs on the live page to model your own quarter.',
      inputs: [
        { key: 'openPipeline', label: 'Total open pipeline value', type: 'number', default: 500000, min: 0, max: 100000000, step: 5000, unit: 'USD' },
        { key: 'avgProb', label: 'Average close probability across deals', type: 'range', default: 35, min: 1, max: 95, step: 1, unit: '%' },
        { key: 'closedSoFar', label: 'Revenue already closed this period', type: 'number', default: 120000, min: 0, max: 100000000, step: 5000, unit: 'USD' },
        { key: 'quota', label: 'Quota for the period', type: 'number', default: 400000, min: 0, max: 100000000, step: 5000, unit: 'USD' },
      ],
      outputs: [
        { key: 'weighted', label: 'Weighted pipeline', expr: 'openPipeline * (avgProb / 100)', format: 'currency' },
        { key: 'forecast', label: 'Total forecast this period', expr: 'closedSoFar + openPipeline * (avgProb / 100)', format: 'currency', highlight: true },
        { key: 'gap', label: 'Gap to quota (positive means short)', expr: 'quota - (closedSoFar + openPipeline * (avgProb / 100))', format: 'currency' },
        { key: 'pipelineNeeded', label: 'Extra pipeline needed to cover the gap', expr: 'max(0, (quota - (closedSoFar + openPipeline * (avgProb / 100))) / (avgProb / 100))', format: 'currency' },
      ],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The pipeline-coverage rule of thumb',
      body: 'If your average close probability is 33 percent, you need roughly 3x your remaining quota in open pipeline just to break even on the math. Teams that consistently hit quota usually run 3x to 4x coverage. Less than that and the forecast is fragile no matter how good the method.',
    },
    {
      type: 'heading',
      text: 'Why accuracy improves as a deal ages',
      eyebrow: 'Accuracy over time',
    },
    {
      type: 'richText',
      title: 'A forecast is a moving target that sharpens',
      body: [
        'Early in a quarter your forecast is mostly assumption. Deals are young, few signals have arrived, and a single large opportunity can swing the number. As the period progresses, deals advance or stall, buyers reveal intent, and the pipeline resolves toward reality. A forecast taken in week one and a forecast taken in the final week are not the same instrument, and treating an early forecast as gospel is a classic planning mistake.',
        'The practical lesson is to forecast a range early and a point late. Report a low, expected, and high case in the first weeks, then narrow the band as evidence accumulates. This is exactly what a simulation-based approach produces natively, and it is why a system that re-scores every deal daily beats one that is only touched on Fridays. The chart below shows the typical arc of forecast accuracy as a period unfolds.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Typical forecast accuracy by point in the quarter',
      caption: 'Illustrative of the usual pattern: confidence is low early and climbs as deals resolve. Your exact numbers depend on cycle length.',
      data: {
        bars: [
          { label: 'Week 1', value: 45, display: '~45%' },
          { label: 'Week 4', value: 60, display: '~60%' },
          { label: 'Week 8', value: 74, display: '~74%' },
          { label: 'Final week', value: 90, display: '~90%', highlight: true },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'What sloppy forecasting costs',
      stats: [
        { value: 45, format: 'number', suffix: '%', label: 'Of committed deals typically slip out of the period or die', trend: 'industry-typical', trendDir: 'down' },
        { value: 1.7, format: 'decimal:1', suffix: 'x', label: 'Overstatement common on gut-only forecasts vs actuals', trend: 'vs weighted method', trendDir: 'up' },
        { value: 80, format: 'number', suffix: '%', label: 'Accuracy reachable with weekly deal-level inspection', trend: 'with discipline', trendDir: 'up' },
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'How an AI-native forecast is wired',
      caption: 'One source of truth feeds scoring and simulation, so the forecast updates itself instead of waiting for a Friday spreadsheet.',
      data: {
        layers: [
          { label: 'Signals', nodes: ['Stage', 'Age', 'Engagement', 'Deal size', 'Source'] },
          { label: 'Scoring', nodes: ['Per-deal probability', 'Stall detection', 'Slip risk'] },
          { label: 'Roll-up', nodes: ['Weighted pipeline', 'Monte Carlo range', 'Confidence'] },
          { label: 'Surfaces', nodes: ['Forecast view', 'Deal risk flags', 'Rep commits'] },
        ],
      },
    },
    {
      type: 'heading',
      text: 'How to run a forecast call',
      eyebrow: 'Runbook',
    },
    {
      type: 'steps',
      title: 'The weekly forecast call, step by step',
      ordered: true,
      steps: [
        { title: 'Start from the number, not the deals', body: 'Open with the current forecast versus quota and versus last week. If it moved, the rest of the call is explaining why. This frames every deal as either supporting or threatening the commit.' },
        { title: 'Inspect the commit and best-case tiers', body: 'Reps categorize deals as commit (will close), best case (could close), and pipeline (too early). Only pressure-test commit and best case; do not waste the call on early-stage deals.' },
        { title: 'Challenge every commit with a next step', body: 'For each committed deal ask one question: what is the concrete next step and its date? A commit with no dated next step is not a commit, it is a hope. Downgrade it.' },
        { title: 'Hunt for slip risk explicitly', body: 'Flag deals with no activity in the last week, deals stuck in a stage past the historical average, and deals where the champion has gone quiet. These are your most likely misses.' },
        { title: 'Reconcile the roll-up to reality', body: 'Compare the mechanical weighted forecast to the sum of rep commits. When they diverge sharply, one of them is wrong; find out which and adjust.' },
        { title: 'Record commitments and move on', body: 'Log the agreed forecast, the deals at risk, and the actions owed before next week. The forecast call is worthless if nothing is written down and checked next time.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A tight 30-minute forecast call',
      data: {
        milestones: [
          { date: '0:00', label: 'Number vs quota vs last week', body: 'Set the frame' },
          { date: '0:05', label: 'Commit tier review', body: 'Next step and date on each' },
          { date: '0:18', label: 'Slip-risk sweep', body: 'Stalled and quiet deals' },
          { date: '0:26', label: 'Log commits and actions', body: 'Written, owned, dated' },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'Weighted pipeline forecasting: the honest trade-offs',
      prosLabel: 'Why it works',
      consLabel: 'What to watch',
      pros: [
        'Transparent math anyone on the team can audit and explain.',
        'Stops one giant early-stage deal from masking a weak quarter.',
        'Easy to compute in a spreadsheet or automate fully in a CRM.',
        'Improves immediately when you tighten stage definitions.',
      ],
      cons: [
        'Fixed stage weights ignore how long a deal has been stuck.',
        'Garbage stage hygiene makes the whole number meaningless.',
        'A point estimate hides risk that a range would reveal.',
        'It only forecasts existing pipeline, not deals not yet created.',
      ],
    },
    {
      type: 'quote',
      text: 'The forecast stopped being a Friday argument and became a number we could plan against, because the system re-scored every deal daily instead of waiting for us to guess.',
      cite: 'A Rally customer',
      role: 'VP Sales, mid-market SaaS',
    },
    {
      type: 'richText',
      title: 'Where Rally fits',
      body: [
        'Rally is an AI-native revenue platform where forecasting is not a bolt-on report you assemble by hand. Rook, the built-in operator, reads every deal continuously, scores close probability from your own history, flags slip risk before the forecast call, and rolls the pipeline up into a weighted forecast and a simulated range that update as reality changes. You still run the call and make the commit; the platform removes the spreadsheet ritual underneath it.',
        'You do not have to buy Rally to use this guide. The weighted formula, the coverage rule, and the forecast-call runbook work in any tool. But if you are tired of a forecast that is only as fresh as your last manual roll-up, a system that keeps the math current on its own, at one flat price with forecasting included, is the shortcut. Rally is alive with a working pipeline on first load, so you can pressure-test your own numbers in minutes.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What is the most accurate sales forecasting method?', a: 'For most teams, a weighted pipeline forecast cross-checked against per-deal AI scoring and reconciled on a weekly forecast call. Pure gut feel is unauditable and pure stage weighting ignores deal age; combining a mechanical roll-up with data-driven probability and human review is the accuracy sweet spot.' },
        { q: 'What is the weighted pipeline formula?', a: 'For each open deal, multiply its value by the close probability of its current stage, then sum those weighted values and add any revenue already closed in the period. That total is your forecast. The formula keeps a single large early-stage deal from making a weak quarter look safe.' },
        { q: 'How much pipeline coverage do I need to hit quota?', a: 'It depends on your average close rate. If deals close at about 33 percent, you need roughly 3x your remaining quota in open pipeline just to cover it mathematically. Teams that reliably hit target usually carry 3x to 4x coverage to absorb slippage.' },
        { q: 'Why does my forecast get more accurate later in the quarter?', a: 'Early on, deals are young and few signals have arrived, so any estimate is mostly assumption. As the period unfolds, deals advance, stall, or die and buyers reveal intent, so the pipeline resolves toward reality. Forecast a range early and narrow it to a point as evidence accumulates.' },
        { q: 'How often should I update the forecast?', a: 'Reps should keep pipeline current continuously, and the team should reconcile it on a weekly forecast call. AI-native platforms re-score deals daily so the number never goes stale between calls, which is the main advantage over a manual weekly roll-up.' },
        { q: 'Can I forecast without a CRM?', a: 'Yes, a spreadsheet with the weighted formula works for a small pipeline. It breaks down past roughly thirty open deals or a few reps, where keeping stage hygiene and probabilities current by hand becomes the bottleneck. That is the point where a CRM that computes the forecast for you pays off.' },
      ],
    },
  ],
  related: ['sales-pipeline-management', 'revenue-operations-guide', 'best-ai-sales-tools'],
};

export default entry;
