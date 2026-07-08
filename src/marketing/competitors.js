// Data that drives the programmatic /compare/:slug pages. One template, many
// pages - the first seeds of the SEO engine. Add a competitor here and a new
// ranked comparison page exists. NO em-dash / en-dash.
export const COMPETITORS = {
  salesforce: {
    name: 'Salesforce',
    tagline: 'The incumbent. Powerful, and a decade of bolt-on complexity.',
    summary: 'Salesforce can do almost anything after months of consultants, admins, and add-ons. Rally does the core job on day one, with an AI operator that actually runs the work instead of a chatbot pinned in the corner.',
    theyStruggle: [
      'AI (Einstein) bolted on late and priced as a premium add-on',
      'Setup measured in months and specialist admins',
      'Per-seat pricing that balloons with every cloud you add',
      'A UI that feels like 2010 enterprise software',
    ],
    rallyWins: [
      'AI-native from the first commit - Rook runs the work, not just answers',
      'Alive on first load with a full book of business, no 3-month rollout',
      'One clean price, one design, one operator across every module',
      'The polish of Linear with the depth of a real revenue platform',
    ],
    rows: [
      ['AI operator that executes multi-step work', true, false],
      ['One-sentence account setup (Juggernaut)', true, false],
      ['Alive with data on first load', true, false],
      ['Deep deal object (line items, committee, competitors)', true, true],
      ['Visual automation builder', true, true],
      ['Time to first value', 'Minutes', 'Months'],
      ['Admin team required', 'No', 'Usually'],
    ],
  },
  hubspot: {
    name: 'HubSpot',
    tagline: 'Friendly and clean, until you need real depth and the price jumps.',
    summary: 'HubSpot nailed the onboarding experience, but power features live behind steep tier jumps and its AI is assistive, not operational. Rally gives you the depth without the upsell wall, and an operator that does the work.',
    theyStruggle: [
      'Real power gated behind expensive Professional and Enterprise tiers',
      'AI that suggests, but does not execute end to end',
      'Reporting that hits a ceiling fast',
      'Costs that climb sharply with contacts and seats',
    ],
    rallyWins: [
      'Enterprise depth without the tier wall',
      'Rook executes plays, not just drafts copy',
      'A deal object built for complex, multi-stakeholder sales',
      'One operator across CRM, projects, outreach, and billing',
    ],
    rows: [
      ['AI that executes multi-step work', true, false],
      ['One-sentence account setup', true, false],
      ['Deep deal object out of the box', true, false],
      ['Marketing + sequences included', true, true],
      ['In-CRM team project board', true, false],
      ['Pricing that stays sane at scale', true, false],
      ['Clean, modern UI', true, true],
    ],
  },
  zoho: {
    name: 'Zoho',
    tagline: 'Cheap and broad, but disjointed and dated.',
    summary: 'Zoho gives you a lot of apps for a little money, but they feel stitched together and the experience shows its age. Rally is one coherent platform with a single operator and a design bar that earns enterprise trust.',
    theyStruggle: [
      'Dozens of apps that feel bolted together, not designed as one',
      'Dated interface and clunky workflows',
      'AI (Zia) is shallow and assistive at best',
      'Configuration burden to make it feel cohesive',
    ],
    rallyWins: [
      'One platform, one design, one operator - genuinely coherent',
      'AI-native experience, not a bolted-on assistant',
      'Enterprise polish that a CRO takes seriously',
      'Deep, modern deal and pipeline management',
    ],
    rows: [
      ['Designed as one coherent product', true, false],
      ['AI operator that executes work', true, false],
      ['Modern, enterprise-grade UI', true, false],
      ['Broad module coverage', true, true],
      ['One-sentence account setup', true, false],
      ['Feels like one system', true, false],
    ],
  },
  netsuite: {
    name: 'NetSuite',
    tagline: 'Heavyweight ERP that treats CRM as an afterthought.',
    summary: 'NetSuite is a serious ERP, but its CRM and front-office experience are heavy, dated, and slow to change. Rally leads with a world-class revenue platform and grows into the ERP surface, without the six-figure implementation.',
    theyStruggle: [
      'CRM is secondary to the ERP core',
      'Six-figure implementations and long timelines',
      'Rigid, dated interface',
      'No modern AI operator',
    ],
    rallyWins: [
      'A revenue platform first, ERP surface as you grow',
      'Live in minutes, not a year-long implementation',
      'A modern operator (Rook) across the whole stack',
      'Quotes, billing, and CPQ that feel human',
    ],
    rows: [
      ['Modern revenue platform', true, false],
      ['AI operator across the stack', true, false],
      ['Fast time to value', true, false],
      ['Quotes / CPQ / billing', true, true],
      ['Enterprise-grade UI', true, false],
      ['No six-figure rollout', true, false],
    ],
  },
  pipedrive: {
    name: 'Pipedrive',
    tagline: 'Simple pipeline tracking that stops where real revenue work begins.',
    summary: 'Pipedrive is a clean pipeline tracker for small teams, but it lacks the depth, automation, and intelligence that serious revenue orgs need. Rally is just as easy to start, with a ceiling that goes all the way up.',
    theyStruggle: [
      'Thin beyond basic pipeline tracking',
      'Limited automation and reporting',
      'No real AI operator',
      'Outgrown quickly as teams scale',
    ],
    rallyWins: [
      'Easy to start, enterprise depth when you need it',
      'Rook runs the busywork automatically',
      'A deal object built for complex sales',
      'Marketing, service, and billing in the same platform',
    ],
    rows: [
      ['Easy to start', true, true],
      ['AI operator that executes', true, false],
      ['Deep deal + committee tracking', true, false],
      ['Visual automation builder', true, false],
      ['Scales to enterprise', true, false],
      ['One platform for the whole funnel', true, false],
    ],
  },
};
export const COMPETITOR_SLUGS = Object.keys(COMPETITORS);
