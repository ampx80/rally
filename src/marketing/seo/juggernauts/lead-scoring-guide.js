// ============================================================
// JUGGERNAUT GUIDE  (isolated best-in-class SEO track)
// Slug: lead-scoring-guide -> live at /guides/lead-scoring-guide
// Fit vs intent, rule-based vs AI scoring, a scoring model with a
// live calculator, scored-routing flow, trade-offs, and FAQ.
// NO em-dash / en-dash. ASCII only.
// ============================================================

const entry = {
  slug: 'lead-scoring-guide',
  title: 'Lead Scoring: The Complete Guide',
  h1: 'Lead Scoring: The Complete Guide for 2026',
  metaTitle: 'Lead Scoring: The Complete Guide (Fit, Intent, and AI Models) | Ardovo',
  metaDescription: 'A practical guide to lead scoring in 2026: fit vs intent, rule-based vs AI models, a scoring framework you can build today, a live score calculator, and scored routing.',
  eyebrow: 'Revenue Operations',
  category: 'Guides',
  author: 'The Ardovo Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'Lead scoring is the practice of ranking every lead by how likely it is to become a customer, so your team spends its limited hours on the deals most worth winning. Done well, it turns a chaotic inbox of leads into an ordered queue where the best opportunities rise to the top automatically.',
    'This guide covers the two dimensions every good model measures, fit and intent, the difference between rule-based and AI scoring, a concrete framework you can build this week, a live calculator to price a single point of lift, and how to route scored leads so the right rep works the right deal at the right moment.',
  ],
  heroStats: [
    { value: 50, suffix: '%', label: 'Typical share of leads that are not yet sales-ready' },
    { value: 2, prefix: '~', suffix: 'x', format: 'number', label: 'Higher conversion when reps work highest-fit leads first' },
    { value: 5, prefix: '<', suffix: ' min', label: 'Speed-to-lead window where contact rates are highest' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What lead scoring actually is',
      body: [
        'Lead scoring assigns each lead a number that predicts its likelihood to convert. The score is built from signals you already collect: who the person is, what company they work at, and how they behave with your product and content. A lead with a high score gets fast, human attention. A lead with a low score gets nurtured until it earns one.',
        'The point is not the number itself. The point is prioritization. Every sales team has more leads than hours, and without a score the queue defaults to whatever is loudest or most recent, which is rarely the same as most valuable. A good model replaces gut feel with a repeatable ranking that everyone trusts.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The two-question test',
      body: 'Every strong score answers two questions at once: should we want this lead (fit), and does this lead want us right now (intent). A model that measures only one of them will mislead you.',
    },
    {
      type: 'heading',
      text: 'Fit vs intent: the two axes',
      eyebrow: 'The core model',
    },
    {
      type: 'richText',
      title: 'Fit is who they are. Intent is what they do.',
      body: [
        'Fit measures how closely a lead matches your ideal customer profile. It is made of relatively stable attributes: company size, industry, role and seniority, geography, tech stack, and budget. Fit answers whether this is a lead you would want to close even if they are not ready today. A CFO at a 500-person company is a strong fit for enterprise software regardless of what she clicked this week.',
        'Intent measures how actively a lead is showing buying behavior right now. It is made of signals that decay: pricing-page visits, demo requests, repeat sessions, email replies, and content downloads. Intent answers whether the timing is right. A student downloading your whitepaper for a class project may show high intent with zero fit, which is exactly why you need both axes.',
        'Plotting fit against intent gives you four quadrants. High-fit high-intent leads are your priority queue and deserve a call within minutes. High-fit low-intent leads are worth patient nurture because the timing will come. Low-fit high-intent leads get self-serve or a light touch. Low-fit low-intent leads should be deprioritized so they never crowd out the deals that matter.',
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'The signals that feed a score',
      caption: 'Fit signals are stable attributes. Intent signals are decaying behaviors. A complete score blends both.',
      data: {
        layers: [
          { label: 'Fit signals', nodes: ['Company size', 'Industry', 'Role', 'Geography', 'Budget'] },
          { label: 'Intent signals', nodes: ['Pricing visits', 'Demo request', 'Email replies', 'Repeat sessions'] },
          { label: 'Negative signals', nodes: ['Free email', 'Student role', 'Competitor', 'Unsubscribed'] },
          { label: 'Output', nodes: ['Fit score', 'Intent score', 'Priority tier'] },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Do not forget negative scoring',
      body: 'The fastest way to clean a queue is to subtract points, not just add them. Personal email domains, unsubscribes, job titles like student or intern, and competitor domains should pull a score down so junk never masquerades as a hot lead.',
    },
    {
      type: 'heading',
      text: 'Rule-based vs AI scoring',
      eyebrow: 'Two approaches',
    },
    {
      type: 'richText',
      title: 'Points you set by hand, or weights the model learns',
      body: [
        'Rule-based scoring is the classic approach: a human assigns point values to attributes and actions. Enterprise company, plus 20. Visited pricing page, plus 15. Free email address, minus 10. It is transparent, easy to explain, and works on day one with no historical data. The weakness is that the weights are guesses. They reflect what you believe drives conversion, not what actually does, and they go stale as your market shifts unless someone maintains them.',
        'AI or predictive scoring flips the logic. Instead of you assigning weights, the model studies your historical wins and losses and learns which signals actually correlate with closing. It can weigh dozens of variables and their interactions in ways a human point sheet never could, and it updates itself as new outcomes arrive. The tradeoff is that it needs a meaningful volume of past deals to train on, and a pure black box can be hard to trust if it cannot show its reasoning.',
        'The best systems in 2026 are hybrid. They start rule-based so you get value immediately, layer predictive learning on top as data accumulates, and keep the reasoning visible so a rep can see why a lead scored the way it did. Ardovo is built this way: Rook, the AI operator, scores and ranks leads the moment they arrive using sensible defaults, then sharpens against your real outcomes, and always shows its work.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Rule-based vs AI lead scoring',
      rowHeader: 'Attribute',
      columns: ['Ardovo hybrid', 'Rule-based', 'Pure AI'],
      highlightCol: 0,
      rows: [
        { feature: 'Works with zero history', cells: [true, true, false] },
        { feature: 'Improves from real outcomes', cells: [true, false, true] },
        { feature: 'Weighs dozens of signals', cells: [true, 'partial', true] },
        { feature: 'Reasoning is explainable', cells: [true, true, 'partial'] },
        { feature: 'Self-maintaining over time', cells: [true, false, true] },
        { feature: 'Setup effort', cells: ['Minutes', 'Hours', 'Weeks'] },
        { feature: 'Handles signal decay automatically', cells: [true, false, true] },
      ],
      footnote: 'Rule-based and pure-AI columns reflect typical implementations. Verify any specific vendor current capabilities, since scoring features change often.',
    },
    {
      type: 'prosCons',
      title: 'Choosing your approach',
      prosLabel: 'Reach for AI scoring when',
      consLabel: 'Stay rule-based when',
      pros: [
        'You have hundreds of past wins and losses to learn from.',
        'Lead volume is high enough that manual triage cannot keep up.',
        'Your buying signals are complex and interact in non-obvious ways.',
        'You want the model to keep improving without constant tuning.',
      ],
      cons: [
        'You are early and have little or no historical outcome data.',
        'Your team needs to explain every score to a skeptical exec.',
        'Volume is low enough that a human can sanity-check each lead.',
        'Your ideal customer profile is simple and rarely changes.',
      ],
    },
    {
      type: 'heading',
      text: 'Build a scoring model in five steps',
      eyebrow: 'Framework',
    },
    {
      type: 'steps',
      title: 'From blank page to working score',
      ordered: true,
      steps: [
        { title: 'Define your ideal customer profile', body: 'Look at your best existing customers and list the attributes they share: size, industry, role, geography. These become your fit signals. Be specific enough that a lead can clearly match or miss.' },
        { title: 'List the intent signals that precede a deal', body: 'Review recent wins and note what buyers did in the weeks before they bought. Pricing visits, demo requests, and repeat sessions usually rank high. These become your intent signals.' },
        { title: 'Assign weights and negative scores', body: 'Give each signal a point value that reflects its importance, and subtract points for disqualifiers like free-email domains or competitor addresses. Keep the total on a simple scale, such as 0 to 100.' },
        { title: 'Set thresholds and tiers', body: 'Decide the score at which a lead becomes sales-ready. A common split is hot, warm, and cold. This is where scoring turns into action, so agree on it with sales, not just marketing.' },
        { title: 'Measure, then recalibrate', body: 'After a quarter, compare scores against what actually closed. If low-scored leads are converting, your weights are wrong. Adjust the model, or let an AI operator learn the correction for you.' },
      ],
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The most common mistake',
      body: 'Scoring built by marketing in isolation and never validated against closed deals. If sales does not trust the score, they will ignore it, and an ignored score is worse than none because it creates false confidence. Build the thresholds together and check them against real outcomes.',
    },
    {
      type: 'animatedStat',
      title: 'Why prioritization pays',
      stats: [
        { value: 50, format: 'number', suffix: '%', label: 'Of leads in a typical funnel are not yet ready to buy', trend: 'nurture, do not discard', trendDir: 'flat' },
        { value: 21, format: 'number', suffix: 'x', label: 'Higher odds of qualifying a lead when contacted within 5 minutes vs 30', trend: 'speed-to-lead effect', trendDir: 'up' },
        { value: 79, format: 'number', suffix: '%', label: 'Of marketing leads never convert, often from missing follow-up', trend: 'the leak scoring plugs', trendDir: 'down' },
      ],
    },
    {
      type: 'calculator',
      title: 'What is one point of scored lift worth?',
      intro: 'Scoring pays off by concentrating effort on winnable leads, which lifts your conversion rate. Estimate the annual revenue that lift is worth. Adjust the inputs on the live page to model your own numbers.',
      inputs: [
        { key: 'leads', label: 'New leads per month', type: 'number', default: 800, min: 10, max: 100000, step: 10 },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 7000, min: 100, max: 1000000, step: 100, unit: 'USD' },
        { key: 'baseRate', label: 'Current lead-to-close rate', type: 'range', default: 4, min: 1, max: 40, step: 1, unit: '%' },
        { key: 'lift', label: 'Conversion lift from prioritizing by score', type: 'range', default: 25, min: 0, max: 100, step: 1, unit: '%' },
      ],
      outputs: [
        { key: 'wonNow', label: 'Deals won per year (today)', expr: 'leads * 12 * (baseRate / 100)', format: 'decimal:0' },
        { key: 'wonNew', label: 'Deals won per year (with scoring)', expr: 'leads * 12 * (baseRate / 100) * (1 + lift / 100)', format: 'decimal:0' },
        { key: 'extraDeals', label: 'Extra deals per year', expr: 'leads * 12 * (baseRate / 100) * (lift / 100)', format: 'decimal:0' },
        { key: 'extraRevenue', label: 'Added revenue per year', expr: 'leads * 12 * (baseRate / 100) * (lift / 100) * deal', format: 'currency', highlight: true },
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'How reps spend an hour, by queue design',
      caption: 'Minutes of a working hour spent on leads that can actually close.',
      data: {
        bars: [
          { label: 'Scored queue', value: 44, display: '44 min on winnable leads', highlight: true },
          { label: 'Newest-first queue', value: 27, display: '27 min' },
          { label: 'Loudest-first queue', value: 19, display: '19 min' },
        ],
      },
    },
    {
      type: 'heading',
      text: 'Routing scored leads',
      eyebrow: 'Score into action',
    },
    {
      type: 'richText',
      title: 'A score is only useful if it moves the lead',
      body: [
        'Scoring without routing is a report nobody reads. The value comes when the score automatically decides what happens next: who gets the lead, how fast, and through which channel. High-fit high-intent leads should route to a human rep within minutes, because the speed-to-lead window is real and short. Everything else should flow into the treatment that fits its tier.',
        'The routing logic itself is simple to describe and should run without anyone watching. A lead arrives, gets enriched, gets scored on both axes, and lands in the right lane. Hot leads alert a rep instantly. Warm leads enter a nurture sequence that keeps them engaged until intent climbs. Cold and low-fit leads get self-serve resources so they cost you nothing until they qualify themselves.',
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'Scored routing, end to end',
      data: {
        nodes: [
          { label: 'Lead in', sub: 'form or inbox' },
          { label: 'Enriched', sub: 'firmographics' },
          { label: 'Scored', sub: 'fit + intent' },
          { label: 'Tiered', sub: 'hot / warm / cold' },
          { label: 'Routed', sub: 'rep or nurture' },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'The same funnel, before and after scoring',
      caption: 'Scoring does not add leads. It stops the winnable ones from leaking out the middle.',
      data: {
        stages: [
          { label: 'Leads captured', value: 1000, pct: 100 },
          { label: 'Correctly prioritized', value: 720, pct: 72 },
          { label: 'Worked in time', value: 430, pct: 43 },
          { label: 'Qualified', value: 210, pct: 21 },
          { label: 'Closed won', value: 74, pct: 7 },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'From raw lead to routed in seconds',
      data: {
        milestones: [
          { date: '0s', label: 'Lead submitted', body: 'Form, inbox, or API' },
          { date: '2s', label: 'Enriched', body: 'Company and role filled in' },
          { date: '3s', label: 'Scored', body: 'Fit and intent computed' },
          { date: '4s', label: 'Routed', body: 'Rep alerted or nurture started' },
        ],
      },
    },
    {
      type: 'quote',
      text: 'Once the queue ranked itself, my reps stopped asking which lead to call next. They just worked the top of the list, and the top of the list was finally the right leads.',
      cite: 'A Ardovo customer',
      role: 'Head of Sales, B2B services',
    },
    {
      type: 'richText',
      title: 'How Ardovo scores leads by default',
      body: [
        'Ardovo treats scoring as a built-in operator function rather than a module you configure for weeks. The moment a lead lands, Rook enriches it, scores fit and intent against sensible defaults drawn from your pipeline, and routes it, all before a human has touched the record. Because the platform is alive on first load, you get a working ranked queue immediately instead of a blank scoring engine waiting for setup.',
        'As your closed-won and closed-lost data accumulates, the model sharpens against your real outcomes, so the score stops reflecting assumptions and starts reflecting what actually converts for you. And because it is one flat price across every module, the scoring, routing, and forecasting that other vendors sell as add-ons are simply part of the platform. You can still override any weight by hand, since the best scoring keeps a human in the loop.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What is the difference between fit and intent in lead scoring?', a: 'Fit measures how well a lead matches your ideal customer profile using stable attributes like company size, industry, and role. Intent measures active buying behavior like pricing visits and demo requests. Fit tells you whether you want the lead. Intent tells you whether the timing is right. A complete score measures both, because a lead can be a perfect fit with no intent, or high intent with no fit.' },
        { q: 'Is rule-based or AI lead scoring better?', a: 'It depends on your data. Rule-based scoring works immediately with no history and is fully transparent, but its weights are guesses that go stale. AI scoring learns which signals actually drive conversion from your past deals and updates itself, but it needs a meaningful volume of outcomes to train on. The strongest approach in 2026 is hybrid: rule-based defaults for day-one value, predictive learning layered on as data grows, with the reasoning always visible.' },
        { q: 'What is a good lead score threshold?', a: 'There is no universal number, because it depends on your scale and how you weight signals. The right method is to set thresholds with sales, not just marketing, then validate them against closed deals. If leads below your sales-ready line are converting, the threshold is too high. Most teams use three tiers, such as hot, warm, and cold, and adjust the cutoffs each quarter based on real outcomes.' },
        { q: 'How does negative scoring work?', a: 'Negative scoring subtracts points for signals that predict a poor fit or a non-buyer, such as personal email domains, competitor addresses, unsubscribes, and titles like student or intern. It keeps junk leads from appearing hot just because they were active, and it is often the single fastest way to clean up a noisy queue.' },
        { q: 'Does lead scoring replace human judgment?', a: 'No, and it should not try to. Scoring is a prioritization aid that ranks the queue so reps spend time on the most winnable leads first. The best systems keep a human able to override any weight or score, because context that never appears in the data, like a warm referral or a board connection, still matters. Scoring makes judgment faster and more consistent, it does not remove it.' },
        { q: 'How quickly should a high-scoring lead be contacted?', a: 'As fast as possible. Contact and qualification rates are dramatically higher when a lead is worked within about five minutes of arriving versus even thirty. That is the entire reason to automate routing: a hot lead that waits in a queue for hours loses much of the intent that made it hot. Ardovo routes and alerts on high-score leads within seconds so the window is never missed.' },
      ],
    },
  ],
  related: ['lead-management-guide', 'sales-automation-guide', 'revenue-operations-guide'],
};

export default entry;
