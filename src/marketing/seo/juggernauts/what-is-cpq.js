// ============================================================
// JUGGERNAUT GUIDE
// Slug: what-is-cpq -> live at /guides/what-is-cpq
// Definitive explainer: Configure, Price, Quote. Deep, useful,
// LLM-quotable. NO em-dash / en-dash. ASCII hyphen only.
// ============================================================

const entry = {
  slug: 'what-is-cpq',
  title: 'What Is CPQ? Configure, Price, Quote Explained',
  h1: 'What Is CPQ? Configure, Price, Quote Explained (2026)',
  metaTitle: 'What Is CPQ? Configure, Price, Quote Explained (2026) | Rally',
  metaDescription: 'CPQ (Configure, Price, Quote) is software that turns a complex deal into an accurate quote in minutes. A deep explainer with the CPQ flow, a quote-error cost calculator, and when you actually need it.',
  eyebrow: 'Revenue Operations',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '13 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'CPQ stands for Configure, Price, Quote. It is the software layer that takes a rep from "what does the customer want" to an accurate, approved, sendable quote without a spreadsheet, a pricing email to finance, or a three-day wait. Configure decides what can be sold together, Price applies the right discounts and terms, and Quote produces the document the buyer signs.',
    'The reason CPQ exists is simple: manual quoting leaks revenue. Every hand-built quote is a chance to misprice a line, forget a discount cap, promise an invalid bundle, or lose the deal to a faster competitor. This guide explains exactly what CPQ does, walks the flow step by step, puts a dollar figure on quote errors, and shows when a business genuinely needs it versus when a well-built CRM already covers the job.',
  ],
  heroStats: [
    { value: 10, prefix: '', suffix: 'x', label: 'Typical speed-up from days of manual quoting to minutes' },
    { value: 20, suffix: '%', label: 'Of manual quotes carry a pricing or configuration error, industry-typical' },
    { value: 1, prefix: '$', suffix: '/seat', format: 'number', label: 'Rally: one flat price, quoting included, no CPQ add-on' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'CPQ in one paragraph',
      body: [
        'CPQ is quoting software that enforces the rules of your business while a rep builds a deal. It knows which products can be sold together, which options require others, what each customer tier is allowed to pay, how far a rep can discount before someone has to approve it, and how all of that rolls up into a total. The output is a clean, accurate quote or proposal, generated in the time it used to take to open the pricing spreadsheet.',
        'Without CPQ, those rules live in a rep is head, a shared workbook, and a chain of Slack messages to finance. That works at low volume and simple pricing. It breaks the moment you have real product complexity, tiered discounts, or more than a couple of people quoting at once, because there is no single place that guarantees the number on the quote is a number the company actually agreed to sell at.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The three letters, decoded',
      body: 'Configure: which products, options, and bundles are valid together. Price: the correct list price, discounts, terms, and approvals for this specific customer. Quote: the branded, accurate document the buyer receives and signs. CPQ is all three enforced in one flow instead of three disconnected steps.',
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The CPQ flow, end to end',
      caption: 'What happens between a rep choosing products and a buyer receiving a quote.',
      data: {
        nodes: [
          { label: 'Configure', sub: 'valid products + options' },
          { label: 'Price', sub: 'discounts + terms' },
          { label: 'Approve', sub: 'if past guardrails' },
          { label: 'Quote', sub: 'branded document' },
          { label: 'Sign', sub: 'order becomes revenue' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'How manual quoting leaks revenue',
      body: [
        'Revenue leakage from quoting is rarely one big mistake. It is a steady drip of small ones. A rep applies a 25 percent discount when policy caps it at 15. A bundle gets quoted without the required support line, so margin evaporates on delivery. A renewal reuses last year is price and misses the contractual uplift. A quote sits in a finance approval queue for three days and the buyer signs with someone else. None of these feel dramatic in the moment, but they compound across every deal, every rep, every quarter.',
        'The other half of the leak is speed. In competitive deals the first accurate quote often wins, because it lets the buyer move while intent is high. Manual quoting adds hours or days of back-and-forth, and every hour of delay is a chance for the deal to cool or for a rival to get there first. CPQ attacks both problems at once: it makes the number correct and it makes the number fast.',
      ],
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Where revenue leaks in a manual quote-to-close process',
      caption: 'Illustrative drop-off when quoting is spreadsheet-driven and approvals are ad hoc.',
      data: {
        stages: [
          { label: 'Deals ready to quote', value: 1000, pct: 100 },
          { label: 'Quoted within a day', value: 620, pct: 62 },
          { label: 'Quoted without an error', value: 500, pct: 50 },
          { label: 'Approved before buyer cools', value: 380, pct: 38 },
          { label: 'Closed at full intended margin', value: 300, pct: 30 },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The quiet cost',
      body: 'A quoting error that under-discounts loses a deal you could have won. One that over-discounts wins a deal at margin you can never get back. Manual processes produce both, and neither shows up cleanly in a report, which is why leakage stays invisible until you measure it.',
    },
    {
      type: 'heading',
      text: 'What a CPQ system actually does',
      eyebrow: 'Capabilities',
    },
    {
      type: 'steps',
      title: 'The core jobs of CPQ',
      ordered: true,
      steps: [
        { title: 'Guided configuration', body: 'Only lets a rep assemble valid combinations. If option A requires option B, or product X cannot ship with product Y, the system enforces it instead of trusting memory.' },
        { title: 'Pricing rules and rate cards', body: 'Applies the right list price, volume tiers, regional rates, and contracted terms automatically, so the number reflects policy rather than a guess.' },
        { title: 'Discount guardrails and approvals', body: 'Lets reps discount freely up to a threshold, then routes anything deeper to the right approver, with the context to decide quickly.' },
        { title: 'Document generation', body: 'Produces a clean, branded quote or proposal from the configured deal, so there is no copy-paste step where errors creep in.' },
        { title: 'Handoff to order and billing', body: 'A signed quote becomes an order and a billing schedule without re-keying, closing the gap where revenue used to fall through.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'How CPQ is wired into the revenue stack',
      caption: 'CPQ sits between your product catalog and your contracts, reading from one source of truth so quotes tie out to what you actually sell.',
      data: {
        layers: [
          { label: 'Inputs', nodes: ['Product catalog', 'Rate cards', 'Customer + deal', 'Discount policy'] },
          { label: 'CPQ engine', nodes: ['Configure', 'Price', 'Approve', 'Document'] },
          { label: 'Outputs', nodes: ['Quote', 'Order', 'Billing schedule'] },
          { label: 'Systems of record', nodes: ['CRM', 'Forecast', 'Finance'] },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'The manual-quoting tax',
      stats: [
        { value: 20, format: 'percent', label: 'Of manual quotes carry a pricing or configuration error (industry-typical)', trend: 'higher with complex catalogs', trendDir: 'up' },
        { value: 73, format: 'percent', label: 'Of deals where the faster accurate quote is a meaningful edge (typical in competitive B2B)', trend: 'speed compounds', trendDir: 'up' },
        { value: 3, format: 'number', suffix: ' days', label: 'Common wait when discounts route through finance email threads', trend: 'vs minutes with guardrails', trendDir: 'down' },
      ],
    },
    {
      type: 'calculator',
      title: 'Quote-error cost calculator',
      intro: 'Estimate what quoting errors cost you each year. Adjust the inputs on the live page to model your own numbers. The default error rate reflects a typical manual process.',
      inputs: [
        { key: 'quotes', label: 'Quotes sent per month', type: 'number', default: 200, min: 1, max: 20000, step: 10 },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 12000, min: 100, max: 5000000, step: 100, unit: 'USD' },
        { key: 'errorRate', label: 'Share of quotes with a pricing or config error', type: 'range', default: 20, min: 0, max: 60, step: 1, unit: '%' },
        { key: 'marginLoss', label: 'Average margin lost on an errored quote', type: 'range', default: 9, min: 0, max: 40, step: 1, unit: '%' },
        { key: 'winShare', label: 'Share of errored quotes that still close (leaking margin)', type: 'range', default: 55, min: 0, max: 100, step: 1, unit: '%' },
      ],
      outputs: [
        { key: 'erroredQuotes', label: 'Errored quotes per year', expr: 'quotes * 12 * (errorRate / 100)', format: 'decimal:0' },
        { key: 'leakingDeals', label: 'Errored deals that still close', expr: 'quotes * 12 * (errorRate / 100) * (winShare / 100)', format: 'decimal:0' },
        { key: 'marginLeak', label: 'Margin leaked per year from bad prices', expr: 'quotes * 12 * (errorRate / 100) * (winShare / 100) * deal * (marginLoss / 100)', format: 'currency', highlight: true },
        { key: 'lostDealValue', label: 'Deal value exposed on errored quotes that may not close', expr: 'quotes * 12 * (errorRate / 100) * (1 - winShare / 100) * deal', format: 'currency' },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'How to read the calculator',
      body: 'The highlighted number is pure margin you give away on deals you win with a mispriced quote. It is money already in the door that walks back out. The second number is the value at risk on errored quotes that stall or lose. Cutting the error rate in half usually pays for a quoting system many times over.',
    },
    {
      type: 'heading',
      text: 'When do you actually need CPQ?',
      eyebrow: 'Decision',
    },
    {
      type: 'steps',
      title: 'Signals it is time',
      ordered: true,
      steps: [
        { title: 'Your catalog has real combinations', body: 'When products have options, tiers, add-ons, or rules about what can be sold together, memory and spreadsheets stop being safe.' },
        { title: 'Discounts need approval', body: 'The moment there is a policy about how deep a rep can go before someone signs off, you need guardrails, not a Slack thread.' },
        { title: 'More than one person quotes', body: 'Two reps quoting from two copies of a workbook will drift. A shared engine keeps everyone on the same price.' },
        { title: 'Quotes are slowing deals', body: 'If turnaround is measured in days and you lose deals to speed, the quote step is the bottleneck.' },
        { title: 'Reports do not tie out', body: 'When quoted, booked, and billed numbers disagree, it is usually because quoting lives outside the system of record.' },
      ],
    },
    {
      type: 'prosCons',
      title: 'CPQ: the honest trade-offs',
      prosLabel: 'What you gain',
      consLabel: 'What to watch',
      pros: [
        'Every quote reflects prices and rules the company actually approved.',
        'Reps quote in minutes instead of waiting on finance.',
        'Discounts stay inside policy, so margin stops leaking silently.',
        'Quoted, booked, and billed finally tie out to one source of truth.',
      ],
      cons: [
        'A heavy standalone CPQ can take months to implement and configure.',
        'Bolt-on CPQ that lives outside your CRM adds another sync to maintain.',
        'Over-modeled pricing rules can make simple quotes slower, not faster.',
        'If your catalog and pricing are genuinely simple, CPQ can be overkill.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Spreadsheet quotes vs bolt-on CPQ vs built-in quoting',
      rowHeader: 'Capability',
      columns: ['Rally built-in', 'Spreadsheet quotes', 'Bolt-on CPQ'],
      highlightCol: 0,
      rows: [
        { feature: 'Enforces valid product configurations', cells: [true, false, true] },
        { feature: 'Applies pricing rules automatically', cells: [true, 'partial', true] },
        { feature: 'Discount guardrails and approvals', cells: [true, false, true] },
        { feature: 'Lives in the same system as the deal', cells: [true, false, false] },
        { feature: 'No separate CRM-to-CPQ sync to maintain', cells: [true, true, false] },
        { feature: 'AI operator can draft and check the quote', cells: [true, false, 'partial'] },
        { feature: 'Setup time', cells: ['Minutes', 'None', 'Weeks to months'] },
        { feature: 'Pricing model', cells: ['One flat price', 'Free but risky', 'Add-on per seat'] },
      ],
      footnote: 'Bolt-on CPQ column reflects a typical standalone product connected to a separate CRM. Verify current pricing and packaging with each vendor, since add-on tiers change often.',
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Time to send an accurate quote',
      data: {
        bars: [
          { label: 'Rally built-in', value: 5, display: '~5 min', highlight: true },
          { label: 'Spreadsheet + finance email', value: 480, display: '1-3 days' },
          { label: 'Bolt-on CPQ (once configured)', value: 20, display: '~20 min' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'CPQ, or a CRM that already quotes?',
      body: [
        'For a long time CPQ was a separate product you bolted onto a CRM, because early CRMs stored contacts but had no idea what you sold or what it should cost. That created a permanent seam: the deal lived in one system, the quote in another, and someone paid to keep them in sync. It is why "CPQ" became a category of its own and why implementations run into months.',
        'The modern answer is to collapse the seam. When quoting shares the same source of truth as your pipeline, contacts, and forecast, configure-price-quote stops being a bolt-on and becomes a native step in the deal. Rally takes this approach: the catalog, pricing rules, and guardrails live next to the deal, the AI operator Rook can draft and sanity-check a quote before it goes out, and it is all one flat price rather than a CPQ add-on stacked on a seat license. If your pricing is genuinely complex enough to need a dedicated configuration engine, a specialist CPQ still earns its keep. For most teams, built-in quoting closes the leak without the second system.',
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'From messy quoting to a clean process',
      data: {
        milestones: [
          { date: 'Week 0', label: 'Catalog and rate cards in one place', body: 'Products, options, and prices stop living in workbooks' },
          { date: 'Week 0', label: 'Discount guardrails set', body: 'Reps quote freely up to policy, approvals route above it' },
          { date: 'Week 1', label: 'Quotes generate from the deal', body: 'No copy-paste, no re-keying, no drift' },
          { date: 'Ongoing', label: 'Quoted equals booked equals billed', body: 'One source of truth, reports finally tie out' },
        ],
      },
    },
    {
      type: 'quote',
      text: 'We stopped emailing finance for every discount. The rules are in the tool now, so reps quote in minutes and nobody prices below margin by accident.',
      cite: 'A Rally customer',
      role: 'RevOps lead, B2B software',
    },
    {
      type: 'richText',
      title: 'How to roll out quoting discipline without slowing sales',
      body: [
        'Start with the two rules that leak the most money: your discount cap and your invalid combinations. Encode those first, leave everything freely quotable up to the cap, and you stop the biggest drips on day one without turning quoting into a maze. The goal is a system reps trust and use, not a perfect model of every edge case that nobody wants to touch.',
        'Add complexity only when a real deal demands it. A new bundle, a regional rate, a contractual uplift on renewals: model each one when it shows up, not in anticipation. A quoting process the team actually follows beats an exhaustively configured one that reps route around with a side spreadsheet, which is exactly how leakage sneaks back in.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'What does CPQ stand for?', a: 'CPQ stands for Configure, Price, Quote. Configure decides which products and options can be sold together, Price applies the correct discounts and terms, and Quote produces the document the buyer signs. It is one enforced flow instead of three disconnected steps.' },
        { q: 'What problem does CPQ solve?', a: 'It stops revenue leaking through manual quoting. Hand-built quotes invite mispriced lines, discounts past policy, invalid bundles, and slow turnaround that loses deals. CPQ makes the number correct and fast by enforcing your business rules while the rep builds the deal.' },
        { q: 'Do small businesses need CPQ?', a: 'Not always. If your catalog is simple, discounts do not need approval, and only one person quotes, a spreadsheet or a CRM with basic quoting is fine. CPQ starts paying off when you have real product complexity, discount guardrails, multiple people quoting, or quotes that slow deals down.' },
        { q: 'What is the difference between CPQ and a CRM?', a: 'A CRM tracks contacts, deals, and pipeline. CPQ turns a deal into an accurate, approved quote. Historically they were separate systems joined by a sync. Modern platforms like Rally build quoting into the CRM so configure-price-quote is a native step on the same source of truth, with no bolt-on to maintain.' },
        { q: 'How long does CPQ take to implement?', a: 'A heavy standalone CPQ connected to a separate CRM can take weeks to months to configure. Built-in quoting that shares your existing catalog and deal data can be live in minutes to days. Start with your discount cap and invalid combinations, then add rules as real deals require them.' },
        { q: 'How much does CPQ cost?', a: 'Standalone CPQ is usually an add-on priced per seat on top of a CRM license, so the bill climbs as you grow. Verify current pricing and packaging with each vendor. Rally includes quoting in one flat per-seat price with no separate CPQ tier, so quoting is not a line item you bolt on later.' },
      ],
    },
  ],
  related: ['revenue-operations-guide', 'sales-pipeline-management', 'what-is-a-crm'],
};

export default entry;
