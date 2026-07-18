// ============================================================
// JUGGERNAUT GUIDE
// Slug: sales-compensation-plans-guide -> live at /guides/sales-compensation-plans-guide
// Sales Compensation Plans: The Complete 2026 Guide.
// NO em-dash / en-dash anywhere. ASCII only.
// ============================================================

const entry = {
  slug: 'sales-compensation-plans-guide',
  title: 'Sales Compensation Plans: The Complete 2026 Guide',
  h1: 'Sales Compensation Plans: How to Design One That Actually Drives Revenue',
  metaTitle: 'Sales Compensation Plans: The Complete 2026 Guide (with OTE Calculator) | Ardovo',
  metaDescription: 'A deep, practical guide to designing sales compensation plans in 2026: base vs variable, commission structures, accelerators, OTE math, a live calculator, plan-type comparison, and a step-by-step design process.',
  eyebrow: 'RevOps Playbook',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A sales compensation plan is the single most powerful behavior lever a revenue leader controls. It decides which deals reps chase, which they ignore, and whether they stay past their second year. Get it right and the plan runs the team for you. Get it wrong and you pay top dollar for the exact behavior you did not want.',
    'This guide walks through every moving part of a modern comp plan: the base-to-variable split, how commission structures actually work, when to use accelerators and decelerators, how to calculate on-target earnings, and a repeatable process for designing a plan your reps trust and your finance team can afford. It leads with the answer, then gives you the math to model your own.',
  ],
  heroStats: [
    { value: 50, suffix: '/50', label: 'Typical base-to-variable split for a closing AE role' },
    { value: 5, prefix: '~', suffix: 'x', label: 'Common quota-to-OTE ratio target for a healthy plan' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'One flat Ardovo price, every module included' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What a sales compensation plan actually is',
      body: [
        'A sales compensation plan is the written formula that turns selling activity into pay. At minimum it defines a base salary, a variable component tied to results, a quota the variable pays against, and the rules that connect them. The best plans do one thing above all else: they make the rewarded behavior obvious to a rep on their first read.',
        'The mistake most teams make is treating comp as a finance spreadsheet instead of a product. Your reps are the users. If the plan is confusing, back-loaded, or feels rigged, the smartest people on your team will optimize against it or leave. A plan a rep can explain to a friend in one sentence beats a mathematically perfect plan nobody trusts.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The one-sentence test',
      body: 'If a new rep cannot answer "what do I have to do this month to hit my number, and exactly what does it pay" in under a minute, your plan is too complicated to motivate anyone.',
    },
    {
      type: 'heading',
      text: 'The building blocks of every comp plan',
      eyebrow: 'Foundations',
    },
    {
      type: 'richText',
      title: 'Base, variable, and OTE',
      body: [
        'Every plan starts with three numbers. Base salary is the fixed pay a rep earns regardless of results. Variable pay, usually commission, is the at-risk portion earned by hitting targets. On-target earnings, or OTE, is the sum of the two when a rep hits exactly 100 percent of quota. If a rep has a 70,000 base and 70,000 of variable at target, their OTE is 140,000 at a 50/50 split.',
        'The split between base and variable signals how much of the outcome the rep controls. Roles with a short, transactional sales cycle and clear individual attribution lean aggressive, often 50/50 or even 40/60. Roles where the rep influences but does not solely close, such as complex enterprise or team-sold motions, carry more base, often 60/40 or 70/30. The rule of thumb: the more directly a rep controls the outcome, the more of their pay should ride on it.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Typical base-to-variable split by role',
      caption: 'Variable percentage of OTE. More individual control over the close usually means more pay at risk. Verify against current market data for your region and segment.',
      data: {
        bars: [
          { label: 'SDR / BDR', value: 25, display: '75 / 25' },
          { label: 'Enterprise AE', value: 40, display: '60 / 40' },
          { label: 'Mid-market AE', value: 45, display: '55 / 45' },
          { label: 'Closing AE', value: 50, display: '50 / 50', highlight: true },
          { label: 'Inside / SMB AE', value: 55, display: '45 / 55' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Quota, the pay curve, and the quota-to-OTE ratio',
      body: [
        'Quota is the annual or period target a rep must produce. The relationship between quota and OTE is one of the most important sanity checks in plan design. A widely used benchmark is a quota that is roughly four to six times a rep OTE. If a rep earns 140,000 OTE, a healthy quota often lands somewhere near 700,000 in bookings, giving the company enough gross margin to fund the comp, management, and overhead. Ratios far below this signal you are overpaying for output; ratios far above it signal quotas nobody can hit.',
        'The pay curve is how commission behaves as a rep moves from zero to quota and beyond. A flat curve pays the same commission rate on every dollar. A tiered curve changes the rate at thresholds. The shape you choose determines whether reps sandbag, push for the extra deal, or coast once they clear plan.',
      ],
    },
    {
      type: 'heading',
      text: 'Commission structures and how to choose',
      eyebrow: 'Mechanics',
    },
    {
      type: 'comparisonMatrix',
      title: 'Comp plan types compared',
      rowHeader: 'Plan type',
      columns: ['Best for', 'Motivates', 'Watch out for', 'Complexity'],
      highlightCol: 0,
      rows: [
        { feature: 'Flat commission rate', cells: ['Transactional, high-volume sales', 'Steady effort on every deal', 'No push past quota', 'Low'] },
        { feature: 'Tiered with accelerators', cells: ['Growth roles, closing AEs', 'Overperformance past 100%', 'Cost spikes on big months', 'Medium'] },
        { feature: 'Base plus bonus (MBO)', cells: ['New markets, strategic roles', 'Specific milestones', 'Weak link to revenue', 'Medium'] },
        { feature: 'Draw against commission', cells: ['New reps ramping', 'Survival during ramp', 'Debt if reps miss', 'Medium'] },
        { feature: 'Gross-margin commission', cells: ['Discount-prone sales', 'Protecting price', 'Harder for reps to model', 'High'] },
        { feature: 'Pure commission', cells: ['Independent, 1099 sellers', 'Maximum hustle', 'High churn, no floor', 'Low'] },
      ],
      footnote: 'Complexity reflects how hard the plan is for a rep to model in their head and for ops to administer accurately.',
    },
    {
      type: 'richText',
      title: 'Accelerators, decelerators, and caps',
      body: [
        'An accelerator raises the commission rate once a rep passes a threshold, usually 100 percent of quota. A plan might pay 10 percent up to quota and 15 percent on everything above it. Accelerators are the single best tool for pulling extra production out of your top performers, because the marginal deal is suddenly worth more to the rep than it costs you in margin. Most healthy plans have them.',
        'A decelerator does the opposite, lowering the rate below a floor to discourage sandbagging or to protect margin on low performers. Caps put a hard ceiling on earnings. Caps are controversial: they protect finance from windfall payouts but they also tell your best rep to stop selling in November, which is almost never what you want. If you must cap, cap on unusual one-time events, not on sustained overperformance.',
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'How an accelerator changes rep behavior',
      caption: 'The marginal deal above quota is worth more, so reps push instead of coasting.',
      data: {
        nodes: [
          { label: '0 to 100% quota', sub: 'base commission rate' },
          { label: 'Crosses 100%', sub: 'accelerator triggers' },
          { label: 'Higher rate', sub: 'on every extra dollar' },
          { label: 'Rep pushes', sub: 'chases the next deal' },
          { label: 'Overperformance', sub: 'company and rep win' },
        ],
      },
    },
    {
      type: 'calculator',
      title: 'Commission and OTE calculator',
      intro: 'Model what a rep earns at different attainment levels, including an accelerator above quota. Adjust the inputs on the live page to match your own plan.',
      inputs: [
        { key: 'base', label: 'Base salary', type: 'number', default: 70000, min: 0, max: 500000, step: 1000, unit: 'USD' },
        { key: 'variable', label: 'Variable at target (OTE minus base)', type: 'number', default: 70000, min: 0, max: 500000, step: 1000, unit: 'USD' },
        { key: 'quota', label: 'Annual quota (bookings)', type: 'number', default: 700000, min: 10000, max: 20000000, step: 10000, unit: 'USD' },
        { key: 'attainment', label: 'Quota attainment', type: 'range', default: 100, min: 0, max: 250, step: 5, unit: '%' },
        { key: 'accel', label: 'Accelerator multiplier above 100%', type: 'range', default: 150, min: 100, max: 300, step: 10, unit: '%' },
      ],
      outputs: [
        { key: 'ote', label: 'On-target earnings (OTE)', expr: 'base + variable', format: 'currency' },
        { key: 'baseRate', label: 'Commission rate at target', expr: 'variable / quota * 100', format: 'decimal:1', suffix: '%' },
        { key: 'bookings', label: 'Bookings produced', expr: 'quota * attainment / 100', format: 'currency' },
        { key: 'commission', label: 'Commission earned', expr: 'variable * min(attainment, 100) / 100 + variable * max(attainment - 100, 0) / 100 * accel / 100', format: 'currency' },
        { key: 'totalPay', label: 'Total pay (base + commission)', expr: 'base + variable * min(attainment, 100) / 100 + variable * max(attainment - 100, 0) / 100 * accel / 100', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'animatedStat',
      title: 'Why plan design pays for itself',
      stats: [
        { value: 32, suffix: '%', label: 'Of reps typically miss quota in a given year, often a plan-design problem not a talent problem', trend: 'industry-typical', trendDir: 'up' },
        { value: 18, format: 'currency', prefix: '$', suffix: 'k', label: 'Rough cost to backfill a departed rep once ramp and lost pipeline are counted', trend: 'per departure', trendDir: 'up' },
        { value: 2.5, format: 'decimal:1', suffix: 'x', label: 'How much faster overperformance compounds when accelerators are set correctly', trend: 'vs flat rate', trendDir: 'up' },
      ],
    },
    {
      type: 'heading',
      text: 'A repeatable design process',
      eyebrow: 'Build it',
    },
    {
      type: 'steps',
      title: 'How to design a comp plan in seven steps',
      ordered: true,
      steps: [
        { title: 'Start from the business goal', body: 'Name the one outcome the plan must drive this year: new logos, expansion, margin, or retention. A plan that rewards everything rewards nothing.' },
        { title: 'Set the OTE against market', body: 'Benchmark total pay for the role and segment so you attract and keep the talent you need. Verify current market data rather than relying on last year.' },
        { title: 'Choose the base-to-variable split', body: 'Match the split to how much the rep controls the close. More control means more pay at risk.' },
        { title: 'Set quota from the ratio, not a wish', body: 'Work back from a quota-to-OTE ratio your gross margin can fund, usually four to six times OTE. Sanity check that a strong rep can realistically hit it.' },
        { title: 'Pick the commission structure', body: 'Flat, tiered, margin-based, or bonus. Add accelerators above quota. Avoid caps unless you are protecting against one-time windfalls.' },
        { title: 'Model the extremes', body: 'Run the plan at 50, 100, and 150 percent attainment for a low, average, and star rep. Confirm the payouts are both motivating and affordable.' },
        { title: 'Write it plainly and commit for the period', body: 'One page, plain language, worked examples. Then hold it stable for the quarter or year. Nothing kills trust faster than mid-period changes that claw back earned pay.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Where comp plans quietly lose money',
      caption: 'Typical leakage between what the plan intends and what reps actually do when the design is off.',
      data: {
        stages: [
          { label: 'Reps who read the plan fully', value: 1000, pct: 100 },
          { label: 'Reps who understand the math', value: 620, pct: 62 },
          { label: 'Reps who trust it will pay out', value: 430, pct: 43 },
          { label: 'Reps who let it change behavior', value: 280, pct: 28 },
          { label: 'Reps who overperform because of it', value: 120, pct: 12 },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The clawback trap',
      body: 'Changing quotas or rates mid-period, or clawing back commission on a deal that later churns without a clear written rule, is the fastest way to lose your best reps. Decide the churn and clawback rules up front, write them into the plan, and never surprise a rep with a rule that was not there when they sold the deal.',
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'What it takes to run comp accurately',
      caption: 'Accurate payouts depend on clean deal data flowing straight into the comp calculation. One source of truth removes the reconciliation fight.',
      data: {
        layers: [
          { label: 'Source of truth', nodes: ['Deals', 'Stages', 'Close dates', 'Amounts'] },
          { label: 'Comp rules', nodes: ['Quota', 'Rates', 'Accelerators', 'Splits'] },
          { label: 'Calculation', nodes: ['Attainment', 'Commission', 'Draws', 'Clawbacks'] },
          { label: 'Surfaces', nodes: ['Rep statement', 'Manager view', 'Finance report'] },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Where the CRM comes in',
      body: [
        'A comp plan is only as trustworthy as the data it pays against. If deal amounts, close dates, and stages live in a spreadsheet that reps and ops reconcile by hand, every payout becomes an argument. The single biggest operational win in sales comp is having deals flow into one system of record that feeds the commission calculation directly, so attainment is never in dispute.',
        'Ardovo is built as that source of truth. Because it is AI-native and alive on first load, pipeline data is captured automatically and stays current, and Rook, the built-in operator, can surface attainment, flag deals that put a payout at risk, and keep rep-facing numbers honest without a Friday reconciliation ritual. One flat price includes every module, so there is no add-on tax as your comp needs grow. Whatever CRM you run, the principle holds: pay off clean data from one source, not a spreadsheet nobody trusts.',
      ],
    },
    {
      type: 'prosCons',
      title: 'Simple plans vs complex plans',
      prosLabel: 'Keep it simple',
      consLabel: 'When complexity earns its keep',
      pros: [
        'Reps can model their pay in their head, so the plan actually changes behavior.',
        'Ops can administer it accurately with fewer disputes and errors.',
        'A single clear metric focuses the whole team on the year goal.',
        'Faster to explain to new hires, which speeds ramp.',
      ],
      cons: [
        'Multiple products or motions may genuinely need different metrics.',
        'Margin-sensitive sales may require gross-margin commission to protect price.',
        'Strategic roles sometimes need MBO milestones revenue cannot capture yet.',
        'Complexity is only worth it if the behavior it buys exceeds the confusion it creates.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'The comp plan calendar',
      caption: 'A healthy annual rhythm keeps the plan fair without destabilizing reps mid-period.',
      data: {
        milestones: [
          { date: 'Q4 prior', label: 'Design and model', body: 'Benchmark pay, set quotas from the ratio, model extremes' },
          { date: 'Jan', label: 'Roll out and sign', body: 'One-page plan, worked examples, every rep signs' },
          { date: 'Ongoing', label: 'Report attainment live', body: 'No surprises, statements always current' },
          { date: 'Mid-year', label: 'Adjust quota only if broken', body: 'Fix clearly wrong quotas, never claw back earned pay' },
          { date: 'Q4', label: 'Review and redesign', body: 'What behavior did the plan actually buy?' },
        ],
      },
    },
    {
      type: 'quote',
      text: 'The best comp plan is the one your rep can explain to their spouse over dinner. If it takes a spreadsheet to understand, it will not change how anyone sells.',
      cite: 'A veteran sales leader',
      role: 'VP of Sales, B2B software',
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What is a good base-to-variable split for a sales rep?', a: 'It depends on how much the rep controls the close. A common closing-AE benchmark is 50/50, meaning half the OTE is base and half is at-risk variable. SDRs often sit around 75/25 because they influence but do not close, while enterprise reps in team-sold motions often carry more base at 60/40. Match the split to individual control over the outcome.' },
        { q: 'How do you calculate OTE?', a: 'On-target earnings is base salary plus the variable pay a rep earns at exactly 100 percent of quota. A 70,000 base with 70,000 of variable at target is a 140,000 OTE. It is the number you benchmark against the market to stay competitive, not the number a rep is guaranteed to earn.' },
        { q: 'What quota-to-OTE ratio should I target?', a: 'A widely used benchmark is a quota roughly four to six times a rep OTE, so the gross margin on their bookings can fund comp, management, and overhead with room left over. Ratios well below that mean you are overpaying for output; ratios well above it usually mean quotas nobody can realistically hit. Always sanity check against your own margins.' },
        { q: 'Should a comp plan have a cap on earnings?', a: 'Usually not on sustained overperformance. Caps tell your best reps to stop selling once they clear the ceiling, which is the opposite of what you want. Use accelerators to reward overperformance instead. If you must limit exposure, cap only on unusual one-time windfalls, and write the rule into the plan up front.' },
        { q: 'What is an accelerator in a commission plan?', a: 'An accelerator increases the commission rate once a rep passes a threshold, typically 100 percent of quota. For example, a rep might earn 10 percent up to quota and 15 percent on everything above it. Accelerators make the marginal deal above target worth more to the rep than it costs you in margin, which is why they pull extra production from top performers.' },
        { q: 'How often should you change a sales comp plan?', a: 'Redesign on an annual cadence and hold the plan stable within the period. Mid-year changes are acceptable only to fix a clearly broken quota, and even then you never claw back pay a rep already earned under the old rules. Frequent or retroactive changes destroy the trust that makes the plan work in the first place.' },
      ],
    },
  ],
  related: ['sales-quota-setting-guide', 'sales-kpis-and-metrics', 'revenue-operations-guide'],
};

export default entry;
