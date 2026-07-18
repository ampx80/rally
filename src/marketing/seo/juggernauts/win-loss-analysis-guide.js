// ============================================================
// JUGGERNAUT GUIDE
// Slug: win-loss-analysis-guide -> live at /guides/win-loss-analysis-guide
// ASCII only. No em-dash / en-dash. Valid JS.
// ============================================================

const entry = {
  slug: 'win-loss-analysis-guide',
  title: 'Win-Loss Analysis: The Complete Guide',
  h1: 'Win-Loss Analysis: How to Learn Why You Really Win and Lose',
  metaTitle: 'Win-Loss Analysis: The Complete Guide for 2026 (Steps, Questions, Calculator) | Ardovo',
  metaDescription: 'A deep, practical guide to win-loss analysis: why it matters, how to run it step by step, the exact questions to ask, a win-rate and insight calculator, and a feedback-loop architecture that turns findings into a higher win rate.',
  eyebrow: 'Revenue Intelligence',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'Win-loss analysis is the practice of systematically interviewing buyers after a deal closes, won or lost, to learn why the decision actually went the way it did. Not why your rep thinks it went that way, and not what the CRM notes say. Why the buyer says it did.',
    'It is the single highest-leverage thing most revenue teams are not doing well. Reps guess at loss reasons in a dropdown, marketing writes messaging from a whiteboard, and product prioritizes from the loudest customer. Win-loss replaces all of that guessing with a repeatable signal. This guide covers why it matters, how to run a program step by step, the exact questions to ask, and how to close the loop so the findings actually raise your win rate instead of gathering dust in a slide.',
  ],
  heroStats: [
    { value: 15, suffix: '%', label: 'Typical win-rate lift teams report after a real win-loss program' },
    { value: 6, prefix: '~', label: 'Interviews per quarter to spot a durable pattern' },
    { value: 80, suffix: '%', label: 'Of loss reasons in a CRM dropdown that are wrong or too shallow' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What win-loss analysis actually is',
      body: [
        'Win-loss analysis is a structured way to answer one question: what really drives the decisions in your pipeline? You gather evidence directly from the people who made the call, both the buyers who chose you and the ones who chose a competitor or chose to do nothing, and you look for patterns across enough of them that the signal separates from the noise.',
        'The output is not a single anecdote. It is a set of themes, ranked by how often they appear and how much they moved the deal, that tells you where you are strong, where you are quietly losing, and what to change. Done well, it is the closest thing a revenue team has to a controlled experiment on its own go-to-market.',
        'The reason it works is that the buyer knows something your team does not. Your rep saw one side of the deal. The buyer saw every vendor, ran the internal debate, and knows the real reason the check got signed. Win-loss is how you get access to that knowledge on purpose instead of by accident.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The gap this closes',
      body: 'Ask three reps why a deal was lost and you get three stories, usually "price." Ask the buyer and you often hear something else entirely: a missing integration, a weak second demo, or a champion who left. Win-loss is how you find out which one is true.',
    },
    {
      type: 'heading',
      text: 'Why it matters more than teams assume',
      eyebrow: 'The case',
    },
    {
      type: 'richText',
      title: 'The compounding cost of guessing',
      body: [
        'Every decision downstream of "why do we win and lose" is built on your answer to that question. Messaging, pricing, discounting, product roadmap, sales training, competitive battlecards, and where you spend marketing dollars all inherit the assumption. If the assumption is wrong, every one of those investments is subtly aimed at the wrong target.',
        'The classic example is price. Reps overwhelmingly report price as the top loss reason, because it is the easy, blameless answer and it is what the buyer said out loud to be polite. Buyers interviewed independently name price far less often. The real drivers are usually trust, a specific missing capability, a stronger competing demo, or an internal champion who could not build consensus. Discounting to fix a problem that was never about price just trains your market to wait for a discount.',
        'Win-loss matters because it corrects that error at the source. A modest, honest correction to your top three win drivers and top three loss drivers ripples through every deal after it. That is why teams that run it consistently report win-rate gains in the low double digits, not from one big change but from many small ones aimed correctly.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'What buyers say drove the loss vs what reps report',
      caption: 'Illustrative pattern from typical B2B win-loss programs. Reps over-index on price; buyers name product fit, trust, and process far more often.',
      data: {
        bars: [
          { label: 'Product fit / missing capability', value: 34, display: '34% (buyers)', highlight: true },
          { label: 'Trust and vendor confidence', value: 24, display: '24% (buyers)', highlight: true },
          { label: 'Sales process and responsiveness', value: 21, display: '21% (buyers)', highlight: true },
          { label: 'Price', value: 14, display: '14% (buyers)' },
          { label: 'Price (as reported by reps)', value: 52, display: '52% (reps)' },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Read the bars carefully',
      body: 'The last bar is the same loss reason, price, as logged by reps in the CRM. It is nearly four times the rate buyers actually cite. That single gap is the entire argument for talking to buyers directly.',
    },
    {
      type: 'heading',
      text: 'How to run a win-loss program',
      eyebrow: 'The method',
    },
    {
      type: 'steps',
      title: 'Seven steps from first interview to a higher win rate',
      ordered: true,
      steps: [
        { title: 'Decide what you want to learn', body: 'Pick two or three questions worth changing your business over. Are we losing to a specific competitor? Is a missing feature costing us? Is a certain segment slipping? A focused program beats a survey that asks everything and decides nothing.' },
        { title: 'Set your sampling rules', body: 'Do not interview only losses. Wins teach you what to protect. Aim for a mix, prioritize deals above a revenue threshold and recently closed, and always include the no-decision deals, which hold some of the most useful lessons.' },
        { title: 'Reach out fast and neutrally', body: 'Request the interview within two to three weeks of the decision, while memory is fresh. Have someone other than the deal owner reach out so the buyer speaks freely, and be explicit that the goal is to learn, not to reopen the deal.' },
        { title: 'Interview with an open script', body: 'Use a consistent question set so you can compare across deals, but ask open questions and follow the buyer down the interesting paths. Twenty to thirty minutes is plenty. Record with consent so you analyze words, not paraphrases.' },
        { title: 'Code every interview into themes', body: 'Tag each interview against a stable taxonomy: product, price, trust, process, timing, champion, competitor. Consistent coding is what turns a stack of anecdotes into a chart you can rank and act on.' },
        { title: 'Rank findings by frequency and impact', body: 'A theme that appears often and swings large deals outranks a loud one-off. Separate the systemic patterns from the interesting exceptions before you take anything to leadership.' },
        { title: 'Close the loop and re-measure', body: 'Route each finding to the team that owns the fix, ship the change, and watch the win rate for that segment or competitor over the next two quarters. A finding that never changes a behavior was a waste of the interview.' },
      ],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The most common failure',
      body: 'Programs die not from bad interviews but from a broken final step. Findings get presented once, everyone nods, and nothing changes. Assign an owner to every theme and put the re-measurement on a calendar, or do not bother starting.',
    },
    {
      type: 'heading',
      text: 'What to ask',
      eyebrow: 'The interview',
    },
    {
      type: 'richText',
      title: 'The questions that surface the real reason',
      body: [
        'The goal of the interview is to reconstruct the decision as the buyer experienced it, in order. Start wide and let them narrate the journey before you narrow in. The single most valuable question is often the simplest: walk me through how you made this decision, from the first time you realized you had this problem.',
        'From there, probe the moments that mattered. What were your top two or three criteria, and how did we rank on each? Who else was in the room, and what did they care about? Was there a moment we lost you, or won you? If you had to name the one thing that tipped it, what was it? For losses, ask what the winning vendor did that you did not, and what we would have needed to do to win. For no-decisions, ask what would have had to be true for you to act at all.',
        'End every interview the same way: is there anything I did not ask that I should have? Some of the sharpest insights arrive in the last ninety seconds, after the buyer has relaxed and the formal questions are done.',
      ],
    },
    {
      type: 'prosCons',
      title: 'Interview do and do not',
      prosLabel: 'Do',
      consLabel: 'Do not',
      pros: [
        'Ask open questions and stay silent long enough for the real answer.',
        'Use a consistent core script so deals are comparable.',
        'Have a neutral interviewer, not the deal owner, run it.',
        'Record with consent and analyze the actual words.',
        'Always include no-decision and won deals, not just losses.',
      ],
      cons: [
        'Do not lead the witness toward the answer you are hoping for.',
        'Do not let it become a discount negotiation or a save attempt.',
        'Do not accept "price" at face value; ask price relative to what.',
        'Do not rely on the rep memory of why the deal went sideways.',
        'Do not interview only the deals that closed last week.',
      ],
    },
    {
      type: 'quote',
      text: 'We thought we were losing on price. Six honest interviews later it was obvious we were losing on a missing integration and a weak second demo. We stopped discounting, fixed the demo, and our win rate against our main competitor climbed within a quarter.',
      cite: 'A Ardovo customer',
      role: 'VP Sales, B2B software',
    },
    {
      type: 'heading',
      text: 'Turn the analysis into math',
      eyebrow: 'Calculator',
    },
    {
      type: 'calculator',
      title: 'Win-rate and insight-value calculator',
      intro: 'Estimate your current win rate and what a modest, correctly aimed lift from win-loss findings is worth per year. Adjust the inputs on the live page to model your own numbers.',
      inputs: [
        { key: 'deals', label: 'Deals worked per year', type: 'number', default: 400, min: 10, max: 20000, step: 10 },
        { key: 'winRate', label: 'Current win rate', type: 'range', default: 22, min: 1, max: 80, step: 1, unit: '%' },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 18000, min: 100, max: 5000000, step: 100, unit: 'USD' },
        { key: 'lift', label: 'Win-rate lift from acting on findings', type: 'range', default: 4, min: 0, max: 30, step: 1, unit: 'points' },
        { key: 'interviews', label: 'Interviews per year', type: 'number', default: 24, min: 4, max: 500, step: 2 },
      ],
      outputs: [
        { key: 'wonNow', label: 'Deals won per year (today)', expr: 'deals * (winRate / 100)', format: 'decimal:0' },
        { key: 'wonNew', label: 'Deals won per year (after lift)', expr: 'deals * ((winRate + lift) / 100)', format: 'decimal:0' },
        { key: 'extraDeals', label: 'Extra deals won per year', expr: 'deals * (lift / 100)', format: 'decimal:0' },
        { key: 'extraRevenue', label: 'Added revenue per year', expr: 'deals * (lift / 100) * deal', format: 'currency', highlight: true },
        { key: 'perInterview', label: 'Added revenue per interview', expr: 'deals * (lift / 100) * deal / interviews', format: 'currency' },
      ],
    },
    {
      type: 'callout',
      tone: 'success',
      title: 'Why the per-interview number is the point',
      body: 'Even a few points of win-rate lift, divided across a couple dozen interviews, usually values each conversation in the thousands of dollars. That is the math that turns win-loss from a nice-to-have into a standing operating rhythm.',
    },
    {
      type: 'heading',
      text: 'Close the loop',
      eyebrow: 'Architecture',
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'The win-loss feedback loop, wired into the revenue system',
      caption: 'Interviews feed a coded evidence base; ranked themes route to the owners who can act; results are re-measured against the same deals. When this lives inside your CRM, the loop closes itself.',
      data: {
        layers: [
          { label: 'Capture', nodes: ['Closed-deal trigger', 'Interview request', 'Recorded call', 'Buyer survey'] },
          { label: 'Evidence base', nodes: ['Transcripts', 'Theme tags', 'Competitor named', 'Deal metadata'] },
          { label: 'Analysis', nodes: ['Rank by frequency', 'Rank by revenue impact', 'Segment and cohort', 'Trend over time'] },
          { label: 'Action owners', nodes: ['Product roadmap', 'Messaging', 'Sales enablement', 'Pricing'] },
          { label: 'Re-measure', nodes: ['Win rate by segment', 'Win rate vs competitor', 'Loss-reason shift'] },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'What happens to a single closed deal',
      data: {
        nodes: [
          { label: 'Deal closes', sub: 'won, lost, or no-decision' },
          { label: 'Interview scheduled', sub: 'neutral outreach' },
          { label: 'Coded to themes', sub: 'stable taxonomy' },
          { label: 'Rolled into patterns', sub: 'ranked by impact' },
          { label: 'Routed to an owner', sub: 'product, marketing, sales' },
          { label: 'Win rate re-measured', sub: 'next two quarters' },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'What a healthy program tends to produce',
      stats: [
        { value: 15, suffix: '%', label: 'Typical relative win-rate improvement teams attribute to acting on findings', trend: 'over 2 to 3 quarters', trendDir: 'up' },
        { value: 4, format: 'decimal:0', suffix: 'x', label: 'Gap between rep-reported and buyer-reported price as a loss reason', trend: 'the guessing tax', trendDir: 'down' },
        { value: 25, suffix: ' min', label: 'A well-run buyer interview, start to finish', trend: 'short by design', trendDir: 'neutral' },
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Ways to run win-loss, compared',
      rowHeader: 'Attribute',
      columns: ['Inside your CRM (Ardovo)', 'CRM dropdown only', 'Outside spreadsheet + third party'],
      highlightCol: 0,
      rows: [
        { feature: 'Triggered automatically on close', cells: [true, 'partial', false] },
        { feature: 'Captures the buyer voice, not the rep guess', cells: [true, false, true] },
        { feature: 'Themes ranked by revenue impact', cells: [true, false, 'partial'] },
        { feature: 'Findings routed back to deal records', cells: [true, false, false] },
        { feature: 'Win rate re-measured on the same cohort', cells: [true, false, 'partial'] },
        { feature: 'Ongoing cost', cells: ['Included', 'Included', 'High per-interview fee'] },
        { feature: 'Time to first insight', cells: ['Days', 'Never useful', 'Weeks'] },
      ],
      footnote: 'Third-party programs deliver real depth but at a per-interview cost and outside your system of record; verify current provider pricing.',
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Turning interviews into a decision',
      caption: 'A single quarter of interviews narrows to the handful of changes actually worth making.',
      data: {
        stages: [
          { label: 'Deals closed this quarter', value: 100, pct: 100 },
          { label: 'Interviews requested', value: 40, pct: 40 },
          { label: 'Interviews completed', value: 24, pct: 24 },
          { label: 'Recurring themes coded', value: 9, pct: 9 },
          { label: 'Changes actually shipped', value: 4, pct: 4 },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'A first quarter of win-loss',
      data: {
        milestones: [
          { date: 'Week 1', label: 'Define the questions', body: 'Two or three decisions worth changing over' },
          { date: 'Week 2', label: 'Set sampling and script', body: 'Wins, losses, and no-decisions' },
          { date: 'Weeks 3 to 9', label: 'Run interviews', body: 'Neutral outreach, code as you go' },
          { date: 'Week 10', label: 'Rank the findings', body: 'Frequency times revenue impact' },
          { date: 'Week 11', label: 'Assign owners', body: 'Product, messaging, enablement, pricing' },
          { date: 'Next quarter', label: 'Re-measure', body: 'Win rate by segment and competitor' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'How Ardovo makes the loop close itself',
      body: [
        'Most win-loss programs fail on logistics, not insight. The deal closes and nobody remembers to request the interview. The transcript lives in a folder nobody opens. The finding is real but never reaches the person who could ship the fix. The work is sound; the plumbing leaks.',
        'Ardovo is an AI-native CRM built so the plumbing does not leak. When a deal closes, Rook, the built-in operator, can flag it for a win-loss interview, draft the neutral outreach, and file the recording and coded themes against the deal record automatically. Because every closed deal, its revenue, its competitor, and its segment already live in one source of truth, the analysis rolls up on first load instead of waiting on a spreadsheet merge.',
        'The payoff is that ranked findings link straight back to the deals that produced them, and you can re-measure the win rate for exactly the cohort a change was meant to help. All of it sits inside one flat price, so a win-loss program is something you run continuously, not a project you fund once and quietly cancel.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'How many win-loss interviews do I need before I can trust the pattern?', a: 'A durable theme usually shows up after roughly six to ten interviews in a given segment or against a given competitor. You do not need statistical significance to act; you need the same reason from independent buyers who could not have coordinated. If three separate losses name the same missing integration, that is signal worth acting on.' },
        { q: 'Should the salesperson who owned the deal run the interview?', a: 'No. The deal owner is the one person the buyer will not be fully candid with, and the one most likely to hear what they want to hear. Use a neutral interviewer, whether that is a product marketer, a dedicated analyst, or a third party. The rep can read the transcript afterward.' },
        { q: 'How do I get lost buyers to agree to talk to me?', a: 'Reach out within two to three weeks, keep it short, and be explicit that you are not trying to reopen the deal, just to learn. Response rates climb when a neutral person asks, when you offer a small thank-you, and when you promise the buyer twenty minutes rather than an hour. Many buyers are surprisingly willing; they rarely get asked, and they want vendors to be better.' },
        { q: 'Is a CRM loss-reason dropdown enough on its own?', a: 'No. Dropdowns capture the rep theory, which over-indexes on price and under-indexes on product, trust, and process. A dropdown is fine as a first cut, but it is not win-loss analysis. The insight comes from talking to the buyer directly and coding what they actually say.' },
        { q: 'What is the biggest mistake teams make with win-loss?', a: 'Not closing the loop. Interviews get run, a slide gets presented, everyone agrees the findings are interesting, and nothing changes. Assign an owner to every ranked theme, ship the change, and re-measure the win rate for the affected cohort. A finding that never alters a behavior was a wasted conversation.' },
        { q: 'How often should I run win-loss?', a: 'Continuously, at a steady cadence, rather than as an occasional project. A rolling program of a handful of interviews per month keeps the signal fresh and lets you see whether your changes actually moved the win rate. When the loop is wired into your CRM, the marginal cost of keeping it running is low enough that there is no reason to stop.' },
      ],
    },
  ],
  related: ['sales-kpis-and-metrics', 'sales-forecasting-guide', 'handling-sales-objections'],
};

export default entry;
