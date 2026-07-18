// ============================================================
// JUGGERNAUT GUIDE PAGE  (isolated best-in-class SEO track)
// Slug: b2b-sales-process -> live at /guides/b2b-sales-process
// The B2B Sales Process: A Complete 2026 Playbook.
// Register centrally in ../juggernaut-registry.js (integrator handles it).
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================

const entry = {
  slug: 'b2b-sales-process',
  title: 'The B2B Sales Process: A Complete 2026 Playbook',
  h1: 'The B2B Sales Process: A Complete 2026 Playbook',
  metaTitle: 'The B2B Sales Process in 2026: Stages, Playbook, Cycle-Time Math | Ardovo',
  metaDescription: 'A deep, practical guide to the modern B2B sales process: the stages end to end, who sits on the buying committee, a stage-by-stage playbook, cycle-time math you can model, and the trade-offs of every sales motion.',
  eyebrow: 'Revenue Playbook',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A B2B sales process is the repeatable set of stages a company uses to turn a stranger into a paying customer, with a defined exit criterion at every step so you always know what has to be true to move a deal forward. The difference between teams that hit plan and teams that guess is almost never talent. It is whether the process is written down, measured, and actually run.',
    'This guide walks the process end to end: the stages, the buying committee you are really selling to, what to do at each step, how to model your own cycle time and where it leaks, and the honest trade-offs between the common sales motions. It is built to be useful whether you are writing your first playbook or tightening one that has drifted.',
  ],
  heroStats: [
    { value: 6.8, format: 'decimal:1', label: 'Typical buyers on a B2B purchase decision' },
    { value: 25, prefix: '~', suffix: '%', label: 'Of B2B deals end in no decision, not a loss to a rival' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'Ardovo: one flat price, every module' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What a B2B sales process actually is',
      body: [
        'A sales process is not a set of activities your reps happen to do. It is a series of buyer-verifiable milestones, each with an explicit exit criterion, that a deal must pass through in order. "Sent a proposal" is an activity. "Buyer confirmed budget is approved and named the signer" is a milestone. Processes built on activities feel busy and forecast badly. Processes built on milestones are boring, honest, and predictable.',
        'The reason this matters in B2B specifically is that the purchase is rarely one persons choice. You are selling to a committee, across weeks or months, and the deal advances only when the buying group internally advances. A good process mirrors the buyers journey rather than your internal handoffs, so every stage answers a simple question: what has to be true, on the buyers side, for this to be real.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The stage-definition test',
      body: 'If you cannot state the one thing the buyer must do or confirm to leave a stage, that stage is decoration. Every stage needs a verifiable exit criterion owned by the buyer, not by your rep.',
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The B2B sales process, end to end',
      caption: 'Seven stages, each with a buyer-side exit criterion. The names vary by company; the shape rarely does.',
      data: {
        nodes: [
          { label: 'Prospect', sub: 'fit identified' },
          { label: 'Connect', sub: 'first real conversation' },
          { label: 'Qualify', sub: 'need + budget confirmed' },
          { label: 'Discover', sub: 'problem mapped' },
          { label: 'Propose', sub: 'solution + price agreed' },
          { label: 'Negotiate', sub: 'terms + signer set' },
          { label: 'Close', sub: 'signed, handed off' },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'A representative B2B funnel, stage to stage',
      caption: 'Illustrative conversion for a mid-market motion. Your own rates are the only ones that matter; the shape shows where most teams leak.',
      data: {
        stages: [
          { label: 'Qualified leads', value: 1000, pct: 100 },
          { label: 'Connected', value: 550, pct: 55 },
          { label: 'Qualified opportunity', value: 300, pct: 30 },
          { label: 'Discovery complete', value: 190, pct: 19 },
          { label: 'Proposal sent', value: 120, pct: 12 },
          { label: 'Closed won', value: 42, pct: 4 },
        ],
      },
    },
    {
      type: 'richText',
      title: 'The two biggest leaks are not where you think',
      body: [
        'Most teams obsess over the last stage, the negotiate-to-close drop, because it is the most visible and the most emotional. But the largest recoverable losses almost always sit earlier: in slow or missed follow-up right after a lead qualifies, and in shallow discovery that lets unqualified deals march to proposal and then stall. A deal that reaches proposal without a confirmed problem and a named economic buyer is not a late-stage deal. It is an early-stage deal wearing a costume.',
        'The other silent killer is the no-decision. Roughly a quarter of forecasted B2B deals end not because a competitor won, but because the buying committee could not build internal consensus to change anything at all. You beat no-decision in discovery, by quantifying the cost of the status quo, not in negotiation by discounting.',
      ],
    },
    {
      type: 'heading',
      text: 'Who you are really selling to',
      eyebrow: 'The buying committee',
    },
    {
      type: 'richText',
      title: 'The buying committee, decoded',
      body: [
        'The single most expensive mistake in B2B is running a great process with one enthusiastic contact who turns out to have no authority to buy. A typical purchase decision now involves roughly six to seven people, and larger or riskier deals pull in more. Your job is not to charm your champion. It is to help your champion sell internally to everyone else in the room when you are not there.',
        'Every committee contains a recurring cast of roles. A person can hold more than one, and the roles matter far more than titles. Map them explicitly on every real opportunity, and treat any deal where you cannot name the economic buyer as unqualified, no matter how warm the champion feels.',
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'The roles on a B2B buying committee',
      caption: 'Titles vary; these functions recur on nearly every deal. Map each to a named person before you call an opportunity qualified.',
      data: {
        layers: [
          { label: 'Drives it', nodes: ['Champion', 'Initiator'] },
          { label: 'Approves it', nodes: ['Economic buyer', 'Financial approver'] },
          { label: 'Judges it', nodes: ['Technical evaluator', 'End user'] },
          { label: 'Can block it', nodes: ['Security', 'Legal', 'Procurement'] },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Champion versus economic buyer',
      body: 'The champion wants the outcome and fights for you internally. The economic buyer controls the budget and can say yes when everyone else says maybe. You need both. A champion without access to the economic buyer is a coaching relationship, not a deal.',
    },
    {
      type: 'heading',
      text: 'The stage-by-stage playbook',
      eyebrow: 'What to actually do',
    },
    {
      type: 'steps',
      title: 'Running each stage well',
      ordered: true,
      steps: [
        { title: 'Prospect: earn the first conversation', body: 'Target accounts that match your best current customers, not everyone with a pulse. Lead with a specific, researched observation about their business, not a feature list. Exit criterion: a real reply or a booked meeting, not an opened email.' },
        { title: 'Connect: diagnose before you pitch', body: 'The first live conversation is for confirming there is a problem worth solving and that this person cares about it. Ask more than you tell. Exit criterion: the buyer agrees there is a problem and agrees to a next step with a date.' },
        { title: 'Qualify: confirm it is real', body: 'Establish need, the cost of inaction, budget reality, timeline, and who else must be involved. Frameworks like MEDDICC or a simple pain-authority-budget-timeline check exist to force these questions. Exit criterion: economic buyer named and a compelling reason to act now.' },
        { title: 'Discover: map the problem in their words', body: 'Go deep on the current process, what it costs, what a fix is worth, and what has blocked change before. Quantify it. This is where you defeat no-decision. Exit criterion: a shared, written understanding of the problem and its dollar impact.' },
        { title: 'Propose: sell the outcome, priced to value', body: 'Tie every part of the solution back to a problem the buyer confirmed. Present price in the context of the cost of inaction you already quantified. Give your champion the internal-selling materials they need. Exit criterion: buyer agrees the solution fits and the price is workable.' },
        { title: 'Negotiate: remove friction, protect value', body: 'Surface procurement, security, and legal early so they do not ambush you at the finish. Trade concessions, never give them. Confirm the signer and the signing path. Exit criterion: terms agreed and a mutual close plan with dates.' },
        { title: 'Close and hand off: make the first 90 days great', body: 'Signing is the midpoint, not the finish. A clean handoff to onboarding protects the renewal and the referral. Exit criterion: signed agreement and a scheduled kickoff with success owned by a named person.' },
      ],
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'The mutual action plan',
      body: 'From qualification onward, build a shared close plan with the buyer: the steps, owners, and dates on both sides that lead to a signature. Deals with a written mutual action plan close at meaningfully higher rates because the buyer has co-authored their own path to yes.',
    },
    {
      type: 'animatedStat',
      title: 'Why process discipline pays',
      stats: [
        { value: 6.8, format: 'decimal:1', label: 'Typical people involved in a B2B buying decision', trend: 'up from ~5 a decade ago', trendDir: 'up' },
        { value: 25, format: 'percent', label: 'Share of forecasted deals that end in no decision', trend: 'the real rival is inertia', trendDir: 'flat' },
        { value: 3, format: 'decimal:0', suffix: 'x', label: 'Range by which fast lead follow-up can raise qualification odds', trend: 'minutes beat hours', trendDir: 'up' },
      ],
    },
    {
      type: 'heading',
      text: 'Model your own cycle time',
      eyebrow: 'The math',
    },
    {
      type: 'richText',
      title: 'Cycle time is a lever, not a fact',
      body: [
        'Sales cycle length feels like a fixed property of your market, but most of it is self-inflicted: slow follow-up between stages, discovery that has to be redone because it was skipped, and proposals that trigger a fresh round of internal questions because the committee was never mapped. Every day a deal sits idle is a day a competitor, a reorg, or a frozen budget can kill it.',
        'The model below turns your stage count, your average time between stages, and your active deal load into an annual throughput estimate, then shows what shaving idle days off each transition is worth. Adjust the inputs on the live page to fit your own motion.',
      ],
    },
    {
      type: 'calculator',
      title: 'Sales cycle and throughput calculator',
      intro: 'Estimate your cycle length and what compressing it is worth. All arithmetic runs on your inputs; nothing is stored.',
      inputs: [
        { key: 'stages', label: 'Stages in your process', type: 'number', default: 7, min: 3, max: 12, step: 1 },
        { key: 'daysPerStage', label: 'Average days a deal sits in each stage', type: 'number', default: 9, min: 1, max: 60, step: 1, unit: 'days' },
        { key: 'activeDeals', label: 'Active deals a rep carries at once', type: 'number', default: 20, min: 1, max: 200, step: 1 },
        { key: 'winRate', label: 'Overall win rate', type: 'range', default: 22, min: 1, max: 80, step: 1, unit: '%' },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 18000, min: 100, max: 2000000, step: 500, unit: 'USD' },
        { key: 'trim', label: 'Idle days removed per stage', type: 'range', default: 3, min: 0, max: 30, step: 1, unit: 'days' },
      ],
      outputs: [
        { key: 'cycleNow', label: 'Current cycle length', expr: 'stages * daysPerStage', format: 'decimal:0', highlight: false },
        { key: 'cycleNew', label: 'Compressed cycle length', expr: 'stages * max(daysPerStage - trim, 1)', format: 'decimal:0' },
        { key: 'cyclesNow', label: 'Deal cycles per rep per year (today)', expr: 'activeDeals * (365 / (stages * daysPerStage))', format: 'decimal:0' },
        { key: 'cyclesNew', label: 'Deal cycles per rep per year (compressed)', expr: 'activeDeals * (365 / (stages * max(daysPerStage - trim, 1)))', format: 'decimal:0' },
        { key: 'addedRevenue', label: 'Added revenue per rep per year', expr: '(activeDeals * (365 / (stages * max(daysPerStage - trim, 1))) - activeDeals * (365 / (stages * daysPerStage))) * (winRate / 100) * deal', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Where cycle time actually goes',
      caption: 'Illustrative idle days per transition. The waiting between stages, not the meetings, is where cycles are won or lost.',
      data: {
        bars: [
          { label: 'Lead to first contact', value: 4, display: '4 days' },
          { label: 'Contact to qualified', value: 7, display: '7 days' },
          { label: 'Qualified to proposal', value: 12, display: '12 days' },
          { label: 'Proposal to signed', value: 21, display: '21 days', highlight: true },
        ],
      },
    },
    {
      type: 'heading',
      text: 'Choosing a sales motion',
      eyebrow: 'Trade-offs',
    },
    {
      type: 'richText',
      title: 'The motion has to match the deal',
      body: [
        'The same seven-stage skeleton runs very differently depending on your price point and buyer. A self-serve motion compresses the whole process into a product experience. A transactional inside-sales motion runs it over a few calls. An enterprise field motion stretches it across quarters and many stakeholders. Picking the wrong motion for your deal size is one of the most expensive strategic errors in B2B, because it silently sets your cost of sale against your gross margin.',
        'The rule of thumb: the annual contract value has to comfortably fund the human touch the motion requires. Low-price, high-volume products cannot afford a field team. High-price, high-complexity products cannot survive on self-serve alone. Most durable companies run a hybrid, letting product-led signals feed a human motion for the accounts worth the touch.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'B2B sales motions compared',
      rowHeader: 'Dimension',
      columns: ['Self-serve / PLG', 'Inside sales', 'Field / enterprise'],
      highlightCol: 0,
      rows: [
        { feature: 'Typical deal size', cells: ['Under $5k', '$5k to $50k', '$50k and up'] },
        { feature: 'Cycle length', cells: ['Minutes to days', 'Days to weeks', 'Months to quarters'] },
        { feature: 'Human touch', cells: ['Minimal', 'Calls and demos', 'On-site, multi-thread'] },
        { feature: 'Committee size', cells: ['1 to 2', '2 to 5', '6 to 12+'] },
        { feature: 'Cost of sale', cells: ['Lowest', 'Moderate', 'Highest'] },
        { feature: 'Best when', cells: ['Fast value, low risk', 'Clear repeatable pain', 'High risk, high value'] },
      ],
      footnote: 'Bands are typical, not rules. Many companies blend motions, using product signals to route only the highest-value accounts to a human.',
    },
    {
      type: 'prosCons',
      title: 'Running a heavier, human-led motion',
      prosLabel: 'What it buys you',
      consLabel: 'What it costs you',
      pros: [
        'You can navigate large buying committees and complex risk.',
        'Discovery is deep enough to defeat no-decision and price to value.',
        'A skilled rep can expand a deal well beyond its self-serve ceiling.',
        'Relationships built in the sale protect the renewal and referral.',
      ],
      cons: [
        'Cost of sale is high, so small deals lose money on it.',
        'Cycles are long, so forecasting error compounds.',
        'It depends on rep skill, which is hard to hire and slow to ramp.',
        'Without a written process it becomes unmanageable at scale.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A healthy enterprise deal, quarter view',
      caption: 'Milestones, not activities. Each date marks a buyer-verified step, not a rep task.',
      data: {
        milestones: [
          { date: 'Week 1', label: 'First conversation and problem agreed', body: 'Buyer confirms the pain is real and worth time' },
          { date: 'Week 3', label: 'Qualified with economic buyer named', body: 'Budget reality and compelling event confirmed' },
          { date: 'Week 6', label: 'Discovery complete, impact quantified', body: 'Shared written value case, cost of inaction sized' },
          { date: 'Week 9', label: 'Proposal and mutual action plan', body: 'Solution mapped to confirmed problems, dates set' },
          { date: 'Week 12', label: 'Signed and handed to onboarding', body: 'Kickoff scheduled, success owner named' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'Where the CRM and an AI operator fit',
      body: [
        'A written process only pays off if the system of record enforces it. That means stages with real exit criteria, not free-text status; committee roles captured as fields, not as notes a manager has to excavate; and follow-up that does not depend on a rep remembering. The gap between the process on the wall and the process in the data is exactly where deals leak.',
        'This is the case Ardovo is built for. It is AI-native, so the Rook operator watches every open deal, flags the ones going cold, drafts the next touch, keeps the committee map current, and rolls up a forecast by stage and probability without a Friday spreadsheet ritual. It is alive on first load rather than an empty database asking to be configured for a month, and it is one flat price across every module, so the tool that runs your process at five reps still runs it at fifty. As always, verify current pricing and packaging before you buy, and if your motion is pure self-serve with no human stages, a lighter tool may be all you need.',
      ],
    },
    {
      type: 'quote',
      text: 'The best forecast is not a confidence number a rep types in. It is a stage a buyer has verifiably passed.',
      cite: 'The Ardovo Team',
      role: 'On why process beats optimism',
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What are the stages of a B2B sales process?', a: 'Most processes have five to seven stages: prospect, connect, qualify, discover, propose, negotiate, and close. Names vary by company, but the shape is consistent. What matters is that each stage has a buyer-verifiable exit criterion, so you always know what has to be true to move a deal forward.' },
        { q: 'How is B2B selling different from B2C?', a: 'B2B purchases are made by a committee, not one person, and typically involve six to seven stakeholders across weeks or months with formal budget, security, and procurement checks. That makes multi-threading, deep discovery, and mapping the buying committee far more important than in most consumer sales.' },
        { q: 'What is the biggest reason B2B deals are lost?', a: 'More often than losing to a competitor, deals die in no decision: the buying committee cannot build internal consensus to change anything. You beat no-decision in discovery by quantifying the cost of the status quo, not in negotiation by discounting.' },
        { q: 'How do I shorten my sales cycle?', a: 'Most cycle time is idle time between stages, not meeting time. Follow up faster after a lead qualifies, do discovery deeply enough that proposals do not trigger a fresh round of questions, map the buying committee early, and build a mutual action plan with dates. Compressing idle days per stage compounds across every deal.' },
        { q: 'Which sales methodology should I use?', a: 'Frameworks like MEDDICC, SPIN, or Challenger are tools to force good habits, not religions. MEDDICC helps qualify complex enterprise deals; a simple pain-authority-budget-timeline check is often enough for transactional ones. Pick one that fits your deal size, then actually run it consistently, which matters more than the choice.' },
        { q: 'When should I add a CRM to enforce the process?', a: 'As soon as one person can no longer hold every open deal and its next step in their head, usually around the first few reps or the first few hundred leads. Choose a CRM that encodes your stages as real exit criteria and, ideally, has an AI operator that flags cold deals and drafts follow-up so the process runs even when a rep forgets.' },
      ],
    },
  ],
  related: ['sales-pipeline-management', 'sales-forecasting-guide', 'lead-management-guide'],
};

export default entry;
