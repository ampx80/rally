// ============================================================
// JUGGERNAUT GUIDE
// Slug: sales-territory-management-guide -> live at /guides/sales-territory-management-guide
// ASCII only. No em-dash / en-dash. Valid JS.
// ============================================================

const entry = {
  slug: 'sales-territory-management-guide',
  title: 'Sales Territory Management: The Complete Guide',
  h1: 'Sales Territory Management: The Complete Guide',
  metaTitle: 'Sales Territory Management: The Complete Guide (2026) | Rally',
  metaDescription: 'A deep, practical guide to designing and balancing sales territories: potential vs capacity, a coverage and balance calculator, mapping methods, and how to keep territories fair as you grow.',
  eyebrow: 'RevOps Playbook',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A sales territory is simply the set of accounts a rep is responsible for. Territory management is the discipline of drawing those sets so that every worthwhile account gets covered, no rep is overloaded or starved, and the whole team can hit quota without stepping on each other. Done well, it is invisible. Done badly, it quietly caps your revenue and burns out your best people.',
    'This guide walks through how to design territories from scratch, how to balance them by potential and by capacity, and how to keep them fair as accounts move and reps come and go. It includes a live balance-and-coverage calculator, a mapping method that does not require a data-science team, and the honest trade-offs of every approach.',
  ],
  heroStats: [
    { value: 7, suffix: '%', label: 'Typical revenue lift from better territory design alone' },
    { value: 2, prefix: '~', suffix: 'x', label: 'Spread between best and worst territory on an unbalanced team' },
    { value: 30, prefix: '<', suffix: ' days', label: 'How often high-growth teams re-check territory balance' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What sales territory management actually is',
      body: [
        'Territory management answers one question for every account you sell to: whose job is it to win and keep this account? A territory can be drawn by geography (zip codes, states, regions), by industry vertical, by company size or segment, by named-account list, or by any blend of those. The dimension you choose matters far less than whether the resulting workloads are balanced and the coverage is complete.',
        'The goal is not perfectly equal territories. It is equally winnable territories. A rep with fifty enterprise accounts and a rep with five hundred small ones can both be set up to succeed if each book of business carries a similar amount of realistic opportunity relative to the effort it takes to work it.',
        'Two forces are always in tension. Potential is how much revenue a territory could produce. Capacity is how much a single rep can actually cover in the hours they have. Good territory design is the art of matching those two so that potential never sits uncovered and capacity is never wasted.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The one-sentence test',
      body: 'If you moved a rep from their territory to any other territory on the team, would their expected number change by more than about twenty percent? If yes, your territories are not balanced.',
    },
    {
      type: 'heading',
      text: 'How to design a territory from scratch',
      eyebrow: 'The method',
    },
    {
      type: 'steps',
      title: 'A repeatable territory design process',
      ordered: true,
      steps: [
        { title: 'Define the unit of assignment', body: 'Pick the smallest thing you assign: an account, a zip code, an industry code. Everything else is built by grouping these units, so choose one you have clean data for.' },
        { title: 'Score each unit for potential', body: 'Estimate revenue opportunity per unit using whatever signal you have: total addressable spend, employee count, current spend, or a simple tier. You do not need a perfect model, only a consistent one.' },
        { title: 'Estimate the effort to cover it', body: 'Some accounts take far more touches to win and keep than others. Weight enterprise and net-new higher than small and existing. This is the capacity side of the equation.' },
        { title: 'Set your target load per rep', body: 'Divide total potential and total effort by your number of reps to get the target each territory should carry. This is the line you are trying to balance against.' },
        { title: 'Group units into territories', body: 'Assemble units into books that each land near the target for both potential and effort, keeping geography or vertical contiguous so a rep is not context-switching all day.' },
        { title: 'Check coverage and rebalance', body: 'Confirm no high-value unit is unassigned and no rep is more than a set percentage off target. Adjust the outliers, then freeze the plan for a defined period so reps can build relationships.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'The layers of a territory model',
      caption: 'A clean territory model flows from raw accounts up to a coverage view, so every level ties back to the same source of truth.',
      data: {
        layers: [
          { label: 'Assignment units', nodes: ['Accounts', 'Zip codes', 'Verticals', 'Segments'] },
          { label: 'Scoring', nodes: ['Potential', 'Effort weight', 'Priority tier'] },
          { label: 'Territories', nodes: ['Books of business', 'Rep owner', 'Target load'] },
          { label: 'Coverage view', nodes: ['Balance report', 'Gaps', 'Overlaps'] },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Potential vs capacity: the core balancing act',
      body: [
        'Most territory problems come from balancing on only one axis. Split purely by potential and you can hand one rep a book that would take three people to cover. Split purely by account count and you can give one rep all the whales and another all the minnows, then wonder why quota attainment is lopsided.',
        'The fix is to balance on both at once. Give every unit two numbers: a potential score and an effort weight. A territory is well designed when its total potential is near the team average and its total effort is also near the team average. When those two agree across the team, quotas become fair and forecasts become believable.',
        'A practical shortcut is to divide potential by effort to get a coverage ratio for each territory. If one rep has far more coverable potential per unit of effort than another, that is your first candidate to rebalance. It usually points to an account that is in the wrong book, not a rep who is underperforming.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Balanced vs unbalanced: quota attainment by rep',
      caption: 'Same team, same accounts. The only difference is whether territories were balanced on potential and effort or drawn by gut feel.',
      data: {
        bars: [
          { label: 'Balanced: Rep A', value: 104, display: '104% of quota', highlight: true },
          { label: 'Balanced: Rep B', value: 98, display: '98% of quota', highlight: true },
          { label: 'Balanced: Rep C', value: 101, display: '101% of quota', highlight: true },
          { label: 'Unbalanced: Rep A', value: 142, display: '142% (over-served)' },
          { label: 'Unbalanced: Rep B', value: 71, display: '71% (starved)' },
          { label: 'Unbalanced: Rep C', value: 64, display: '64% (overloaded)' },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Why an over-served rep is also a problem',
      body: 'A rep at 142 percent looks like a hero, but it usually means real potential is being left on the table because one book holds more opportunity than one person can work. That uncovered upside is invisible in a quota report and shows up only as slower company growth.',
    },
    {
      type: 'calculator',
      title: 'Territory balance and coverage calculator',
      intro: 'Model how your potential and workload split across the team. Adjust the inputs on the live page to see your own target load per rep, your coverage ratio, and how far your biggest territory is likely to drift from balance.',
      inputs: [
        { key: 'accounts', label: 'Total accounts to cover', type: 'number', default: 1200, min: 10, max: 100000, step: 10 },
        { key: 'reps', label: 'Number of reps', type: 'number', default: 8, min: 1, max: 500, step: 1 },
        { key: 'potential', label: 'Total annual potential across all accounts', type: 'number', default: 9600000, min: 10000, max: 1000000000, step: 10000, unit: 'USD' },
        { key: 'touches', label: 'Touches to properly work one account per year', type: 'number', default: 18, min: 1, max: 500, step: 1 },
        { key: 'capacity', label: 'Touches one rep can make per year', type: 'number', default: 3000, min: 100, max: 100000, step: 50 },
        { key: 'skew', label: 'Real-world imbalance if drawn by gut feel', type: 'range', default: 35, min: 0, max: 100, step: 1, unit: '%' },
      ],
      outputs: [
        { key: 'accountsPerRep', label: 'Target accounts per territory', expr: 'accounts / reps', format: 'decimal:0' },
        { key: 'potentialPerRep', label: 'Target potential per territory', expr: 'potential / reps', format: 'currency' },
        { key: 'coverageRatio', label: 'Coverage ratio (capacity vs required touches)', expr: 'capacity / ((accounts / reps) * touches)', format: 'decimal:2', highlight: true },
        { key: 'coverableAccounts', label: 'Accounts one rep can truly cover', expr: 'min(accounts / reps, capacity / touches)', format: 'decimal:0' },
        { key: 'skewedPotential', label: 'Potential in your most loaded territory (gut-feel draw)', expr: 'potential / reps * (1 + skew / 100)', format: 'currency' },
        { key: 'leftUncovered', label: 'Potential at risk in that overloaded book', expr: 'max(0, (potential / reps * (1 + skew / 100)) - (potential / reps))', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'Read the coverage ratio first',
      body: 'A coverage ratio below 1.0 means the average rep cannot make enough touches to properly work their assigned accounts, so real opportunity will slip no matter how the map is drawn. The fix is fewer accounts per rep or more capacity, not a prettier boundary.',
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Where uncovered territory leaks revenue',
      caption: 'Typical drop-off when territories are overloaded and accounts go untouched for a quarter.',
      data: {
        stages: [
          { label: 'Accounts assigned', value: 1200, pct: 100 },
          { label: 'Actually contacted this quarter', value: 780, pct: 65 },
          { label: 'Worked past a first touch', value: 468, pct: 39 },
          { label: 'Active opportunity created', value: 216, pct: 18 },
          { label: 'Closed won', value: 84, pct: 7 },
        ],
      },
    },
    {
      type: 'heading',
      text: 'Mapping methods, from simple to advanced',
      eyebrow: 'How to draw the lines',
    },
    {
      type: 'richText',
      title: 'Geographic, vertical, and hybrid maps',
      body: [
        'Geographic territories assign accounts by location: a rep owns a state, a metro, or a cluster of zip codes. They are easy to explain, minimize travel for field teams, and make coverage gaps obvious on a map. Their weakness is that geography rarely lines up with where the money is, so a purely geographic split often needs a potential adjustment to avoid handing one rep a dense, high-value metro and another a sparse rural stretch.',
        'Vertical or segment territories assign by what the account is rather than where it is: a rep owns healthcare, or mid-market, or all named strategic accounts. This builds real expertise and lets reps speak the buyers language, which lifts win rates. The cost is coordination, because two reps may both want to sell into the same parent company, so you need clear rules for overlaps.',
        'Most mature teams run a hybrid: verticals inside regions, or named accounts carved out of an otherwise geographic map. The hybrid captures the win-rate benefit of specialization while keeping coverage legible. Whatever you choose, write down the assignment rule so a new account can be routed to the right rep automatically instead of by a weekly argument.',
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'How a new account gets routed to the right territory',
      caption: 'A written assignment rule turns routing into an instant, repeatable step instead of a manual decision.',
      data: {
        nodes: [
          { label: 'New account', sub: 'created or imported' },
          { label: 'Scored', sub: 'potential + tier' },
          { label: 'Matched to rule', sub: 'region or vertical' },
          { label: 'Assigned to rep', sub: 'owner set' },
          { label: 'Balance re-checked', sub: 'flags overloads' },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'What good territory design is worth',
      stats: [
        { value: 7, format: 'decimal:0', suffix: '%', label: 'Typical revenue lift from rebalancing alone, no new headcount', trend: 'industry-typical range 2 to 7%', trendDir: 'up' },
        { value: 30, format: 'decimal:0', suffix: '%', label: 'Of selling time lost to non-selling work on badly routed books', trend: 'reclaimable', trendDir: 'down' },
        { value: 2, format: 'decimal:0', suffix: 'x', label: 'Common spread between top and bottom territory before balancing', trend: 'closes to near 1x', trendDir: 'down' },
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Territory design approaches compared',
      rowHeader: 'Factor',
      columns: ['Balanced model in a live CRM', 'Spreadsheet by hand', 'Geographic only'],
      highlightCol: 0,
      rows: [
        { feature: 'Balances potential and effort', cells: [true, 'partial', false] },
        { feature: 'Flags overloaded books automatically', cells: [true, false, false] },
        { feature: 'Routes new accounts by rule', cells: [true, false, 'partial'] },
        { feature: 'Detects coverage gaps', cells: [true, 'partial', true] },
        { feature: 'Rebalances without a data project', cells: [true, false, false] },
        { feature: 'Time to redraw territories', cells: ['Hours', 'Days', 'Days'] },
        { feature: 'Keeps history when reps change', cells: [true, false, false] },
      ],
      footnote: 'Approaches assume the same underlying account data; the difference is how the model is built and maintained. Verify any vendor claims against your own configuration.',
    },
    {
      type: 'prosCons',
      title: 'The honest trade-offs of redrawing territories',
      prosLabel: 'Why rebalance',
      consLabel: 'What to watch',
      pros: [
        'Quota becomes fair, so attainment reflects skill instead of luck of the draw.',
        'Uncovered high-value accounts finally get worked.',
        'Forecasts get more believable because no book is secretly overloaded.',
        'Reps stop context-switching across incoherent account lists.',
      ],
      cons: [
        'Every reshuffle disrupts relationships reps have already built.',
        'Reps fear losing a hot account, so change management matters as much as the math.',
        'Comp and quota must move with the territory or you create new unfairness.',
        'Rebalancing too often prevents anyone from developing their accounts, so set a cadence and hold it.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A healthy territory review cadence',
      caption: 'Balance is not a one-time project. High-growth teams check it on a rhythm and only redraw when the drift is real.',
      data: {
        milestones: [
          { date: 'Monthly', label: 'Balance check', body: 'Scan for books drifting past the threshold' },
          { date: 'Quarterly', label: 'Coverage review', body: 'Confirm no high-value account is going untouched' },
          { date: 'Annually', label: 'Full redraw', body: 'Rescore potential and reset targets' },
          { date: 'On change', label: 'Event-based fix', body: 'Rep leaves, big account lands, new segment opens' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'How Rally handles territory management',
      body: [
        'Rally is an AI-native CRM that is alive on first load, so your accounts, potential scores, and owners are a working model from the start rather than an empty grid you configure for weeks. Because every account, contact, and deal lives in one source of truth, a balance report and a coverage view are just two ways of reading the same data instead of a separate spreadsheet you have to reconcile.',
        'Rook, the built-in operator, can route a new account to the right territory the moment it appears, flag a book that has drifted past your balance threshold, and surface high-value accounts that have gone untouched for too long. You keep the judgment calls; the busywork of scoring, routing, and re-checking runs itself. And it is all one flat price per seat across every module, so growing the team does not mean re-pricing the tool.',
        'None of that replaces the thinking in this guide. The method here works in any CRM, or even a careful spreadsheet. The difference is how much of the ongoing maintenance you have to do by hand versus how much the system does for you between reviews.',
      ],
    },
    {
      type: 'quote',
      text: 'We stopped guessing whose account was whose. Balance and coverage are one report now, so the quarterly territory fight turned into a fifteen minute check.',
      cite: 'A Rally customer',
      role: 'Head of RevOps, growth-stage B2B',
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What is the difference between potential and capacity in territory design?', a: 'Potential is how much revenue a territory could produce. Capacity is how many accounts a single rep can actually work in the hours they have. Good territory design matches the two so that no potential sits uncovered and no capacity is wasted. Balancing on only one of them is the most common cause of lopsided quota attainment.' },
        { q: 'How do I know if my territories are balanced?', a: 'Give every account a potential score and an effort weight, then total both for each rep. Territories are balanced when both totals land near the team average, usually within about twenty percent. If moving a rep to another book would change their expected number by more than that, the map needs work.' },
        { q: 'How often should I redraw sales territories?', a: 'Check balance monthly, review coverage quarterly, and do a full redraw about once a year or when a triggering event happens, such as a rep leaving or a big new segment opening. Redrawing too often prevents reps from building the relationships that actually win accounts.' },
        { q: 'Should territories be geographic or by industry?', a: 'Geographic maps are simple and minimize travel but rarely match where the money is. Vertical maps build expertise and lift win rates but need clear overlap rules. Most mature teams run a hybrid, such as verticals inside regions or named accounts carved out of a geographic map. Pick the one your data supports and write down the assignment rule.' },
        { q: 'What does the coverage ratio in the calculator mean?', a: 'It compares how many touches a rep can make in a year against how many their assigned accounts actually require. A ratio below 1.0 means the average rep physically cannot work their whole book, so opportunity will slip no matter how the boundaries are drawn. The fix is fewer accounts per rep or more capacity.' },
        { q: 'Can I manage territories in a spreadsheet instead of a CRM?', a: 'Yes, and the method in this guide works in one. The limitation is maintenance. A spreadsheet will not route new accounts by rule, flag a book that has drifted out of balance, or show you which high-value accounts are going untouched. A live CRM keeps balance and coverage current between reviews instead of only at the moment you last edited the sheet.' },
      ],
    },
  ],
  related: ['sales-quota-setting-guide', 'revenue-operations-guide', 'sales-pipeline-management'],
};

export default entry;
