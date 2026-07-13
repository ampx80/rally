// ============================================================
// JUGGERNAUT: crm-roi-calculator -> /guides/crm-roi-calculator
// Calculator-first link magnet. ASCII only, no em/en dash.
// ============================================================

const entry = {
  slug: 'crm-roi-calculator',
  title: 'CRM ROI Calculator',
  h1: 'CRM ROI Calculator: What a Better Pipeline Is Worth',
  metaTitle: 'Free CRM ROI Calculator (2026): Model Your Return in Seconds | Rally',
  metaDescription: 'A free, interactive CRM ROI calculator. Enter your reps, leads, deal size, and close rate to see the revenue a disciplined pipeline unlocks, plus how to read the number.',
  eyebrow: 'Free Tool',
  category: 'Calculators',
  author: 'The Rally Team',
  readingTime: '7 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'Every CRM pitch promises ROI and almost none of them show the math. This page is the math. Enter a few real numbers and it estimates the revenue a disciplined, well-run pipeline is worth to you, before you spend a dollar on software.',
    'The calculator is free, needs no signup, and works on the live page. Below it, a short guide on how to read the result and which inputs move it the most.',
  ],
  heroStats: [
    { value: 4, suffix: ' inputs', label: 'All it takes to model your return' },
    { value: 0, prefix: '$', format: 'number', label: 'Cost to use, no signup required' },
    { value: 21, suffix: '%', label: 'Typical win-rate lift after real CRM adoption' },
  ],
  blocks: [
    {
      type: 'calculator',
      title: 'CRM ROI calculator',
      intro: 'Adjust the inputs to match your team. The result updates live.',
      inputs: [
        { key: 'reps', label: 'Number of salespeople', type: 'number', default: 5, min: 1, max: 1000, step: 1 },
        { key: 'leads', label: 'New leads per rep, per month', type: 'number', default: 100, min: 1, max: 10000, step: 5 },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 8000, min: 100, max: 1000000, step: 100, unit: 'USD' },
        { key: 'closeRate', label: 'Current close rate', type: 'range', default: 10, min: 1, max: 60, step: 1, unit: '%' },
        { key: 'lift', label: 'Expected close-rate lift from a better system', type: 'range', default: 20, min: 0, max: 100, step: 1, unit: '%' },
        { key: 'cost', label: 'CRM cost per rep, per month', type: 'number', default: 45, min: 0, max: 2000, step: 5, unit: 'USD' },
      ],
      outputs: [
        { key: 'baseRev', label: 'Revenue per year (today)', expr: 'reps * leads * 12 * (closeRate / 100) * deal', format: 'currency' },
        { key: 'newRev', label: 'Revenue per year (with a better system)', expr: 'reps * leads * 12 * (closeRate / 100) * (1 + lift / 100) * deal', format: 'currency' },
        { key: 'added', label: 'Added revenue per year', expr: 'reps * leads * 12 * (closeRate / 100) * (lift / 100) * deal', format: 'currency', highlight: true },
        { key: 'crmCost', label: 'CRM cost per year', expr: 'reps * cost * 12', format: 'currency' },
        { key: 'roi', label: 'Return on the CRM spend', expr: '(reps * leads * 12 * (closeRate / 100) * (lift / 100) * deal) / (reps * cost * 12)', format: 'decimal:1', suffix: 'x' },
      ],
    },
    {
      type: 'richText',
      title: 'How to read the result',
      body: [
        'The number that matters is added revenue per year, and the ratio next to it. A CRM that costs a few hundred dollars per rep per year but adds tens of thousands in recovered deals is not a cost. It is one of the highest-return line items in the business.',
        'The reason the return is usually large is simple. You already paid to acquire every lead. A better system does not buy you new demand, it stops you from wasting the demand you have.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Where the lift comes from',
      caption: 'The close-rate lift is driven by follow-up that never slips, not by magic.',
      data: {
        bars: [
          { label: 'Faster follow-up', value: 45, display: '45%', highlight: true },
          { label: 'Better prioritization', value: 30, display: '30%' },
          { label: 'No dropped deals', value: 25, display: '25%' },
        ],
      },
    },
    {
      type: 'steps',
      title: 'Which inputs move the number most',
      ordered: true,
      steps: [
        { title: 'Close-rate lift', body: 'The single biggest lever. Even a modest lift on existing volume compounds because it multiplies every deal you already source.' },
        { title: 'Average deal size', body: 'Higher deal sizes make each recovered deal worth more, so the ROI on discipline climbs with your price point.' },
        { title: 'Leads per rep', body: 'More volume means more leaks to plug, so high-volume teams see the fastest payback.' },
        { title: 'Rep count', body: 'The effect scales linearly with the team, which is why the ROI grows as you hire.' },
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'A fair way to use this',
      body: 'Be conservative on the lift input. Even at half the typical 20 percent, most teams see a return measured in multiples, not percentages. If the number is still large when you lowball it, the decision is easy.',
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'How does a CRM increase close rate?', a: 'Mostly by making sure no acquired lead is dropped and every deal has a clear next step. Faster, more consistent follow-up on the demand you already have is where the lift comes from.' },
        { q: 'What is a realistic close-rate lift?', a: 'Teams moving from a spreadsheet or a neglected CRM to a live, well-run system commonly see a 10 to 30 percent relative lift. Model the low end to be safe.' },
        { q: 'Is this calculator accurate for my business?', a: 'It is a model, not a guarantee. It is most accurate when your inputs are honest and your sales motion is repeatable. Use it to size the opportunity, then validate with a pilot.' },
        { q: 'What CRM should I use to capture this ROI?', a: 'Any system your team actually updates. Rally is built to be alive on first load and to have an AI operator do the follow-up work, which is exactly what drives the lift this calculator models.' },
      ],
    },
  ],
  related: ['hubspot-alternative', 'best-ai-crm', 'crm-for-startups'],
};

export default entry;
