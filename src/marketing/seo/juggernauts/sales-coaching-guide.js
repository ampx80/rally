// ============================================================
// JUGGERNAUT GUIDE
// Slug: sales-coaching-guide -> live at /guides/sales-coaching-guide
// Category: Guides. ASCII only. No em-dash / en-dash.
// ============================================================

const entry = {
  slug: 'sales-coaching-guide',
  title: 'Sales Coaching: The Complete Guide',
  h1: 'Sales Coaching: The Complete Guide to Driving Quota Attainment',
  metaTitle: 'Sales Coaching: The Complete Guide (Cadence, Skills, ROI Calculator) | Rally',
  metaDescription: 'A deep, practical guide to sales coaching: why it drives quota attainment, a weekly coaching cadence, the skills worth coaching, a rep-improvement ROI calculator, and the trade-offs.',
  eyebrow: 'Sales Leadership Playbook',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'Sales coaching is the single highest-leverage thing a sales manager does, and it is also the first thing that gets dropped when the quarter gets busy. The math is simple: a manager cannot personally close every deal, but they can raise the ceiling on every rep who does. Move a whole team a few points on win rate and the compounding effect dwarfs any single heroic close.',
    'This guide lays out what coaching actually is, why it moves quota attainment when it is done consistently, a repeatable weekly cadence you can run tomorrow, the specific skills worth your attention, and a calculator to estimate what a modest per-rep improvement is worth to your number. It is written to be useful whether you coach two reps or twenty.',
  ],
  heroStats: [
    { value: 5, prefix: '+', suffix: ' pts', label: 'Typical win-rate lift from consistent weekly coaching' },
    { value: 3, suffix: 'x', label: 'Deal reviews per rep, per month, in a healthy cadence' },
    { value: 60, suffix: '%', label: 'Of managers say they lack the pipeline visibility to coach well' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What sales coaching actually is (and is not)',
      body: [
        'Coaching is not telling a rep what you would do, and it is not a performance review with a nicer name. It is a repeatable process of observing real behavior, isolating the one or two skills that would most change outcomes, and helping the rep practice those skills until they stick. The unit of coaching is the skill, not the deal.',
        'The confusion matters because the two get swapped constantly. Jumping into a stalled deal to save it is deal management, and sometimes it is the right call. But if that is the only interaction a rep gets, they never build the muscle to save the next one themselves. Coaching trades a little short-term deal risk for a permanent lift in capability.',
        'The best coaches also separate the person from the play. You can be relentlessly high on someone as a professional while being honest that their discovery calls skip past the buyer real pain. That separation is what makes hard feedback survivable and, more importantly, actionable.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The one-question test for a coaching culture',
      body: 'Ask a rep "what is the one skill your manager is helping you improve this month?" If they can answer in a sentence, you have a coaching culture. If they pause, you have a reporting relationship that happens to include a manager.',
    },
    {
      type: 'heading',
      text: 'Why coaching drives quota attainment',
      eyebrow: 'The business case',
    },
    {
      type: 'richText',
      title: 'The leverage is in the middle of the team',
      body: [
        'Every sales team has a distribution. A couple of reps beat quota no matter what, a couple struggle no matter what, and the majority sit in a wide middle band. The temptation is to spend all your energy on the top (fun) or the bottom (urgent). But the largest pool of untapped revenue sits in the middle, where a few points of improvement per rep multiplies across the most people.',
        'This is why coaching beats hiring as a first move. Recruiting a new rep takes months to source, ramp, and prove out, and the outcome is uncertain. Lifting the win rate of the reps you already have is faster, cheaper, and lands on quota-carrying capacity you have already paid for. Coaching is the highest-ROI headcount decision that does not add headcount.',
        'The catch is consistency. A single great coaching session changes nothing. The lift comes from the same skill being reinforced across weeks until the new behavior is automatic under pressure. That is why cadence, not brilliance, is the thing that separates teams that coach from teams that talk about coaching.',
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'Where the revenue upside actually sits',
      caption: 'Illustrative team of ten reps. The middle band holds the most people, so a small per-rep lift there returns the most total revenue.',
      data: {
        bars: [
          { label: 'Lift top 2 reps', value: 18, display: '~18% of upside' },
          { label: 'Lift middle 6 reps', value: 58, display: '~58% of upside', highlight: true },
          { label: 'Lift bottom 2 reps', value: 24, display: '~24% of upside' },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'What consistent coaching tends to move',
      stats: [
        { value: 5, prefix: '+', suffix: ' pts', format: 'decimal:0', label: 'Typical win-rate lift for reps in a steady weekly cadence', trend: 'vs ad-hoc coaching', trendDir: 'up' },
        { value: 30, suffix: '%', label: 'Faster ramp for new reps who get structured coaching from week one', trend: 'to first quota', trendDir: 'up' },
        { value: 2.5, format: 'decimal:1', suffix: 'x', label: 'Longer average rep tenure on teams where managers coach regularly', trend: 'lower churn', trendDir: 'up' },
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'A note on the numbers',
      body: 'The figures here are industry-typical ranges reported across sales research, not guarantees. Your mileage depends on deal size, cycle length, and how honestly you diagnose skills. Treat them as directional, and measure your own before-and-after.',
    },
    {
      type: 'heading',
      text: 'A coaching cadence you can run tomorrow',
      eyebrow: 'The operating rhythm',
    },
    {
      type: 'steps',
      title: 'The weekly and monthly coaching loop',
      ordered: true,
      steps: [
        { title: 'Weekly one-on-one (30 minutes)', body: 'Not a status update. Reserve the last third for one coaching topic: pick a single skill, review a real example, agree on one thing to try before next week. Deal status belongs in the CRM, not the meeting.' },
        { title: 'Live or recorded call review (weekly)', body: 'Watch or listen to one real call per rep. Comment on specific moments, not vibes. The rep should do most of the talking about what they would change.' },
        { title: 'Deal reviews on the right deals (a few per rep, monthly)', body: 'Review deals that teach something, not just the biggest ones. A deal that stalled at discovery teaches more about the skill gap than a clean close.' },
        { title: 'Skill drills between meetings (15 minutes)', body: 'Short, focused practice on the one skill in play: a mock objection, a discovery role-play, a rewritten follow-up email. Reps improve by doing reps.' },
        { title: 'Monthly skill scorecard (async)', body: 'Rate each rep on the core skills, note the trend, and pick next month one focus per person. Written and visible so progress is undeniable.' },
        { title: 'Quarterly reset', body: 'Zoom out. Which skills lifted the team, which coaching moves worked, and where should your own time go next quarter? Coach your coaching.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'The coaching cadence across a month',
      data: {
        milestones: [
          { date: 'Week 1', label: 'One-on-one plus call review', body: 'Pick the focus skill' },
          { date: 'Week 2', label: 'Skill drill plus deal review', body: 'Practice under low stakes' },
          { date: 'Week 3', label: 'One-on-one plus call review', body: 'Reinforce, check the trend' },
          { date: 'Week 4', label: 'Scorecard plus reset', body: 'Rate, record, set next focus' },
        ],
      },
    },
    {
      type: 'callout',
      tone: 'warn',
      title: 'The trap that kills most cadences',
      body: 'Coaching sessions become deal-status meetings the first busy week, and they never recover. Protect the coaching block ruthlessly. If deal status is eating the meeting, your CRM is not surfacing status well enough, and that is the thing to fix.',
    },
    {
      type: 'heading',
      text: 'What to coach: the skills that move the number',
      eyebrow: 'Where to spend attention',
    },
    {
      type: 'richText',
      title: 'Coach skills, ranked by leverage',
      body: [
        'Not all skills are worth equal coaching time. The highest-leverage ones sit early in the deal, because a weak discovery call quietly poisons everything downstream: the demo misses, the proposal is generic, and the close feels like a fight. Fix the front of the funnel and the back gets easier on its own.',
        'The matrix below ranks the core selling skills by how much they typically move outcomes, how coachable they are (some improve fast with practice, some are slow), and roughly where in the deal they show up. Use it to decide what to work on first, not as a rigid rulebook. A rep who is already elite at discovery should be coached somewhere else.',
      ],
    },
    {
      type: 'comparisonMatrix',
      title: 'Sales skills: what to coach and in what order',
      rowHeader: 'Skill',
      columns: ['Impact on win rate', 'Coachability', 'Deal stage', 'Priority'],
      highlightCol: 0,
      rows: [
        { feature: 'Discovery and qualification', cells: ['High', 'High', 'Early', 'Coach first'] },
        { feature: 'Multi-threading to buyers', cells: ['High', 'Medium', 'Middle', 'Coach first'] },
        { feature: 'Handling objections', cells: ['High', 'High', 'Middle to late', 'Coach early'] },
        { feature: 'Tailored demo and value framing', cells: ['Medium', 'High', 'Middle', 'Coach next'] },
        { feature: 'Negotiation and closing', cells: ['Medium', 'Medium', 'Late', 'Coach next'] },
        { feature: 'Pipeline and time management', cells: ['Medium', 'High', 'All stages', 'Coach ongoing'] },
        { feature: 'Product and industry fluency', cells: ['Medium', 'Low', 'All stages', 'Enable, then coach'] },
        { feature: 'Prospecting and outreach', cells: ['Medium', 'High', 'Top of funnel', 'Coach by role'] },
      ],
      footnote: 'Rankings are directional and typical for B2B teams. Weight them for your own motion, deal size, and where each rep already stands.',
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Where coaching a weak skill shows up as lost pipeline',
      caption: 'Illustrative funnel. A skill gap at discovery compounds into every stage below it.',
      data: {
        stages: [
          { label: 'Discovery calls held', value: 100, pct: 100 },
          { label: 'Real pain uncovered', value: 62, pct: 62 },
          { label: 'Multiple buyers engaged', value: 40, pct: 40 },
          { label: 'Proposal accepted to next step', value: 24, pct: 24 },
          { label: 'Closed won', value: 15, pct: 15 },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The anatomy of one good coaching session',
      data: {
        nodes: [
          { label: 'Observe', sub: 'real call or deal' },
          { label: 'Diagnose', sub: 'one skill gap' },
          { label: 'Agree', sub: 'one thing to try' },
          { label: 'Practice', sub: 'drill or role-play' },
          { label: 'Reinforce', sub: 'check next week' },
        ],
      },
    },
    {
      type: 'calculator',
      title: 'Coaching ROI calculator',
      intro: 'Estimate what a modest per-rep win-rate lift is worth across your team over a year. A few points spread across every rep usually returns more than any single hire. Adjust the inputs on the live page to model your own numbers.',
      inputs: [
        { key: 'reps', label: 'Reps you coach', type: 'number', default: 8, min: 1, max: 500, step: 1 },
        { key: 'oppsPerRep', label: 'Qualified opportunities per rep, per month', type: 'number', default: 15, min: 1, max: 500, step: 1 },
        { key: 'deal', label: 'Average deal size', type: 'number', default: 12000, min: 100, max: 2000000, step: 100, unit: 'USD' },
        { key: 'winRate', label: 'Current win rate', type: 'range', default: 22, min: 1, max: 80, step: 1, unit: '%' },
        { key: 'lift', label: 'Win-rate lift from coaching (points)', type: 'range', default: 5, min: 0, max: 30, step: 1, unit: 'pts' },
        { key: 'hours', label: 'Coaching hours per rep, per month', type: 'number', default: 4, min: 0, max: 40, step: 1, unit: 'hrs' },
      ],
      outputs: [
        { key: 'wonNow', label: 'Deals won per year (today)', expr: 'reps * oppsPerRep * 12 * (winRate / 100)', format: 'decimal:0' },
        { key: 'wonAfter', label: 'Deals won per year (after coaching)', expr: 'reps * oppsPerRep * 12 * ((winRate + lift) / 100)', format: 'decimal:0' },
        { key: 'extraDeals', label: 'Extra deals won per year', expr: 'reps * oppsPerRep * 12 * (lift / 100)', format: 'decimal:0' },
        { key: 'extraRevenue', label: 'Added revenue per year', expr: 'reps * oppsPerRep * 12 * (lift / 100) * deal', format: 'currency', highlight: true },
        { key: 'coachHours', label: 'Coaching hours invested per year', expr: 'reps * hours * 12', format: 'decimal:0' },
        { key: 'revPerHour', label: 'Added revenue per coaching hour', expr: '(reps * oppsPerRep * 12 * (lift / 100) * deal) / max(reps * hours * 12, 1)', format: 'currency' },
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'How a modern CRM makes coaching possible',
      caption: 'Coaching dies without visibility. When one source of truth feeds every surface, the manager can see what to coach instead of guessing.',
      data: {
        layers: [
          { label: 'Signal', nodes: ['Call recordings', 'Email activity', 'Deal history', 'Stage changes'] },
          { label: 'Core data', nodes: ['Deals', 'Contacts', 'Activities', 'Outcomes'] },
          { label: 'Operator', nodes: ['Flag stalls', 'Score risk', 'Surface skill gaps', 'Draft prep'] },
          { label: 'Coaching surfaces', nodes: ['Deal reviews', 'Scorecards', 'Trend dashboards'] },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'The honest trade-offs of investing in coaching',
      prosLabel: 'Why it pays off',
      consLabel: 'What to watch',
      pros: [
        'The lift compounds across every rep you already employ, no hiring required.',
        'New reps ramp faster and hit quota sooner.',
        'Reps who feel invested in stay longer, which lowers the true cost of the team.',
        'It builds a bench of future managers who already know how to develop people.',
      ],
      cons: [
        'It only works with consistency, so it competes with firefighting for the manager time.',
        'Weak deal visibility turns coaching sessions into status meetings.',
        'Coaching the wrong skill wastes everyone the time, so diagnosis has to be honest.',
        'The payoff is real but delayed, which makes it easy to cut in a bad quarter.',
      ],
    },
    {
      type: 'quote',
      text: 'The best quarter we ever had came from coaching the middle of the team, not chasing one big logo. We moved six reps a few points each and it added up to more than any single deal we lost sleep over.',
      cite: 'A Rally customer',
      role: 'VP of Sales, mid-market B2B',
    },
    {
      type: 'richText',
      title: 'Where Rally fits',
      body: [
        'Every part of this playbook depends on one thing: seeing what is actually happening in the deal. If your CRM cannot tell you which deals stalled at discovery, which reps are single-threaded, or which follow-ups never went out, coaching becomes guesswork and the weekly session collapses into a status update.',
        'Rally is built AI-native, alive on first load, at one flat price. Its operator, Rook, watches the signal you would otherwise miss: it flags stalling deals, scores risk, surfaces where a rep skipped a buyer, and drafts the prep so your coaching time goes to the conversation, not the spreadsheet. The point is not to replace the manager. It is to hand the manager the visibility that makes real coaching possible.',
        'You do not need Rally to run this cadence, and this guide is useful no matter what you use. But if your coaching keeps drowning in status because the pipeline is opaque, the fix is a CRM that shows you what to coach.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'How much time should a manager spend coaching?', a: 'A common healthy target is a few hours per rep per month, protected on the calendar. Managers who beat quota consistently tend to guard coaching time first and let status live in the CRM, not in meetings.' },
        { q: 'What is the difference between coaching and managing?', a: 'Managing is about hitting this quarter number: deal reviews, forecasts, and removing blockers. Coaching is about raising a rep long-term capability so future quarters get easier. You need both, but coaching is the one that gets skipped.' },
        { q: 'Which skill should I coach first?', a: 'Usually discovery and qualification. A weak discovery call quietly undermines the demo, the proposal, and the close, so fixing the front of the deal lifts everything downstream. Coach it before you coach closing technique.' },
        { q: 'How do I coach without demotivating the rep?', a: 'Separate the person from the play. Be genuinely high on them as a professional while being specific and honest about one skill to improve. Focus on one thing at a time, tie it to a real call, and agree on a concrete next step.' },
        { q: 'Can you coach a remote or distributed team?', a: 'Yes, and in some ways it is easier because call recordings and shared pipeline make behavior visible asynchronously. The cadence is the same: weekly one-on-ones, recorded call reviews, drills, and a monthly scorecard, all run over video and a shared system of record.' },
        { q: 'How do I know if coaching is working?', a: 'Measure the skill, not just the number. Track win rate, ramp time, and a simple monthly skill scorecard per rep, then watch the trend over a quarter. If the focus skills are improving and win rate is following, it is working.' },
      ],
    },
  ],
  related: ['sales-kpis-and-metrics', 'sales-pipeline-management', 'revenue-operations-guide'],
};

export default entry;
