// ============================================================
// JUGGERNAUT GUIDE
// Slug: sales-discovery-call-guide -> live at /guides/sales-discovery-call-guide
// The Sales Discovery Call: A Complete Playbook.
// NO em-dash / en-dash. ASCII only.
// ============================================================

const entry = {
  slug: 'sales-discovery-call-guide',
  title: 'The Sales Discovery Call: A Complete Playbook',
  h1: 'The Sales Discovery Call: A Complete Playbook',
  metaTitle: 'The Sales Discovery Call: A Complete Playbook (Framework, Questions, Scoring) | Rally',
  metaDescription: 'A deep, practical guide to running sales discovery calls that actually qualify: the purpose, a repeatable framework, a question flow, a scoring calculator, the timeline of a great call, and the mistakes that kill deals.',
  eyebrow: 'Sales Playbook',
  category: 'Guides',
  author: 'The Rally Team',
  readingTime: '15 min read',
  published: '2026-07-13',
  updated: '2026-07-13',
  intro: [
    'A discovery call has one job: to find out, honestly and fast, whether there is a real problem you can solve and whether this is the right moment to solve it. Everything else is theater. The reps who close the most are not the smoothest talkers; they are the best at asking a few sharp questions and then getting out of the way while the buyer explains their own pain.',
    'This playbook is the full method. It covers what a discovery call is actually for, a framework you can run the same way every time, the exact question flow that surfaces truth instead of politeness, a simple way to score qualification so you stop chasing dead deals, and the timeline of a call that ends with a real next step.',
  ],
  heroStats: [
    { value: 70, suffix: '%', label: 'Of a great discovery call is the buyer talking, not you' },
    { value: 4, label: 'Questions that separate a real deal from a nice chat' },
    { value: 2, prefix: '<', suffix: ' min', label: 'To score a call in Rally after you hang up' },
  ],
  blocks: [
    {
      type: 'richText',
      title: 'What a discovery call is actually for',
      body: [
        'A discovery call is not a pitch. It is a diagnosis. Before a doctor prescribes anything, they ask where it hurts, how long it has hurt, and what you have already tried. A discovery call is the same act applied to a business problem. Your goal is to leave the call understanding the buyer better than they understood themselves when they picked up the phone.',
        'The paradox is that the less you sell on a discovery call, the more you sell over the life of the deal. When you rush to demo, you are guessing at what matters. When you slow down and diagnose, the buyer tells you exactly which features to show, which objections are real, and who actually signs. A call spent listening buys you a demo that lands.',
        'The output of a good discovery call is a decision, not a good feeling. By the end you should be able to say, out loud, either "this is a qualified opportunity and here is the next step" or "this is not a fit right now and here is why." Both are wins. The only loss is a warm, ambiguous call that leaves you unsure whether to keep spending time on it.',
      ],
    },
    {
      type: 'callout',
      tone: 'accent',
      title: 'The one-sentence test',
      body: 'If you cannot finish the sentence "They need to solve this because ___, by ___, or ___ happens" after the call, you did not run discovery. You had a conversation.',
    },
    {
      type: 'heading',
      text: 'A framework you can run every time',
      eyebrow: 'The method',
    },
    {
      type: 'steps',
      title: 'The five-stage discovery framework',
      ordered: true,
      steps: [
        { title: 'Open and set the agenda', body: 'Spend two minutes earning permission. Confirm how long they have, state what you want to cover, and ask what they most want to get out of the time. This turns an interrogation into a shared session.' },
        { title: 'Diagnose the current state', body: 'Get them describing how the problem shows up today: what the process looks like now, what breaks, and who feels it. Facts before feelings. You are mapping the terrain before you talk about the destination.' },
        { title: 'Quantify the pain and the stakes', body: 'Attach numbers and consequences. How often does it happen, what does it cost, what have they already tried, and what happens if nothing changes? This is where a nice-to-have separates from a must-fix.' },
        { title: 'Map the decision', body: 'Understand who else is involved, what the buying process looks like, whether there is budget, and what their timeline is driven by. A problem with no owner, no budget, and no deadline is not yet a deal.' },
        { title: 'Confirm fit and lock the next step', body: 'Summarize what you heard, check that you got it right, and agree on a concrete next action with a date on it. Never end a qualified call without a scheduled next step.' },
      ],
    },
    {
      type: 'diagram',
      variant: 'flow',
      title: 'The question flow, stage by stage',
      caption: 'Each stage feeds the next. Skip the diagnosis and your qualifying questions land on a problem you never actually understood.',
      data: {
        nodes: [
          { label: 'Open', sub: 'agenda + permission' },
          { label: 'Diagnose', sub: 'current state' },
          { label: 'Quantify', sub: 'cost of pain' },
          { label: 'Decide', sub: 'who, budget, when' },
          { label: 'Next step', sub: 'dated + agreed' },
        ],
      },
    },
    {
      type: 'richText',
      title: 'The questions that surface truth',
      body: [
        'The best discovery questions are open, specific, and slightly uncomfortable. Open, so the buyer has room to explain. Specific, so you get facts instead of platitudes. Slightly uncomfortable, because the truth about budget, priority, and internal politics rarely comes out when you keep things cozy.',
        'Diagnosis questions sound like: "Walk me through how you handle this today." "What made you take this call now, as opposed to six months ago?" "Where does the current process break down most often?" Notice that none of these mention your product. You are not steering toward a pitch; you are letting the problem reveal its own shape.',
        'Quantifying questions add stakes: "How much time does that cost the team each week?" "What has it cost you to leave it unsolved?" "What have you already tried, and why did it not stick?" And the single most clarifying question in all of sales: "What happens if you do nothing?" If the honest answer is "not much," you have learned something priceless before wasting a demo on it.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'The mute-button rule',
      body: 'After you ask a real question, stop talking. Count to five in your head if you have to. The most valuable sentence on the whole call is usually the one the buyer says right after an awkward silence you did not rush to fill.',
    },
    {
      type: 'heading',
      text: 'Qualification: score it, do not guess it',
      eyebrow: 'Turning a call into a decision',
    },
    {
      type: 'richText',
      title: 'Why you need a score, not a hunch',
      body: [
        'Reps are optimists by trade, which is a strength on a cold call and a liability after a discovery call. A warm conversation feels like progress even when nothing was actually qualified. The cure is a simple, repeatable score you assign right after you hang up, before the good feeling fades and rewrites your memory.',
        'You do not need a fifteen-factor model. Four dimensions carry almost all the signal: is there a real, painful Problem; is there an Owner who feels it and can champion a fix; is there Budget or a plausible path to it; and is there a Timeline with a reason behind it. Score each from zero to five and add them up. The total tells you how hard to lean in, and the low scores tell you exactly what to chase on the next call.',
        'The point of a score is not bureaucracy. It is honesty at scale. When every rep scores the same way, your pipeline stops being a wish list and starts being a forecast. In Rally, Rook captures the call, drafts the score from what was actually said, and flags the weakest dimension so the follow-up writes itself.',
      ],
    },
    {
      type: 'calculator',
      title: 'Discovery qualification scorer',
      intro: 'Rate each dimension from 0 (nothing there) to 5 (rock solid) based on what the buyer actually said. Adjust the inputs on the live page to score your own call. A total of 14 or higher is a strong, worth-pursuing opportunity.',
      inputs: [
        { key: 'problem', label: 'Problem: is the pain real and named?', type: 'range', default: 3, min: 0, max: 5, step: 1 },
        { key: 'owner', label: 'Owner: is there a champion who feels it?', type: 'range', default: 3, min: 0, max: 5, step: 1 },
        { key: 'budget', label: 'Budget: is there money or a path to it?', type: 'range', default: 2, min: 0, max: 5, step: 1 },
        { key: 'timeline', label: 'Timeline: is there a deadline with a reason?', type: 'range', default: 2, min: 0, max: 5, step: 1 },
      ],
      outputs: [
        { key: 'total', label: 'Qualification score (out of 20)', expr: 'problem + owner + budget + timeline', format: 'decimal:0', highlight: true },
        { key: 'pct', label: 'Percent of a perfect deal', expr: '(problem + owner + budget + timeline) / 20 * 100', format: 'decimal:0' },
        { key: 'weakest', label: 'Lowest dimension score (chase this next)', expr: 'min(problem, owner, budget, timeline)', format: 'decimal:0' },
        { key: 'gap', label: 'Points to a rock-solid deal', expr: '20 - (problem + owner + budget + timeline)', format: 'decimal:0' },
      ],
    },
    {
      type: 'diagram',
      variant: 'comparison-bars',
      title: 'How to read your score',
      data: {
        bars: [
          { label: 'Pursue hard (14-20)', value: 17, display: 'Strong fit', highlight: true },
          { label: 'Develop (9-13)', value: 11, display: 'Needs work' },
          { label: 'Nurture (5-8)', value: 6, display: 'Too early' },
          { label: 'Disqualify (0-4)', value: 3, display: 'Let it go' },
        ],
      },
    },
    {
      type: 'animatedStat',
      title: 'Why discipline on discovery pays',
      stats: [
        { value: 2.3, format: 'decimal:1', suffix: 'x', label: 'Typical win-rate difference between scored and unscored pipelines', trend: 'consistency effect', trendDir: 'up' },
        { value: 40, suffix: '%', label: 'Of a typical pipeline is deals that never qualified in the first place', trend: 'wasted rep time', trendDir: 'down' },
        { value: 5, suffix: 'x', label: 'More likely to close when a next step is booked on the call itself', trend: 'vs "we will follow up"', trendDir: 'up' },
      ],
    },
    {
      type: 'diagram',
      variant: 'timeline',
      title: 'The timeline of a great 30-minute call',
      caption: 'The clock is a discipline. If you are still in your own agenda at minute ten, you are talking too much.',
      data: {
        milestones: [
          { date: '0-2 min', label: 'Open and agenda', body: 'Permission, time check, their goal for the call' },
          { date: '2-6 min', label: 'Context and rapport', body: 'Their role, their world, an honest reason you are talking' },
          { date: '6-16 min', label: 'Diagnose current state', body: 'How it works today, where it breaks, who feels it' },
          { date: '16-24 min', label: 'Quantify and map the decision', body: 'Cost of the pain, budget, process, timeline' },
          { date: '24-28 min', label: 'Summarize and confirm', body: 'Play it back, check you got it right' },
          { date: '28-30 min', label: 'Lock the next step', body: 'A specific action with a date, booked live' },
        ],
      },
    },
    {
      type: 'diagram',
      variant: 'funnel',
      title: 'Where discovery calls leak without a system',
      caption: 'Typical drop-off when calls are run from memory and notes live in a notebook nobody rereads.',
      data: {
        stages: [
          { label: 'Discovery calls booked', value: 100, pct: 100 },
          { label: 'Actually held', value: 82, pct: 82 },
          { label: 'Qualified with a real score', value: 44, pct: 44 },
          { label: 'Next step booked on the call', value: 27, pct: 27 },
          { label: 'Advanced to a real opportunity', value: 19, pct: 19 },
        ],
      },
    },
    {
      type: 'prosCons',
      title: 'The mistakes that kill discovery calls',
      prosLabel: 'Run it this way',
      consLabel: 'These quietly kill deals',
      pros: [
        'Let the buyer talk for most of the call and follow their thread.',
        'Ask what happens if they do nothing, and believe the answer.',
        'Quantify the pain in time or money before you show anything.',
        'Confirm who else is involved before you assume this person decides.',
        'Book the next step live, with a date, before you hang up.',
        'Score the call honestly within a few minutes of ending it.',
      ],
      cons: [
        'Pitching in the first five minutes before you know the problem.',
        'Asking closed questions that get a yes and teach you nothing.',
        'Happy ears: hearing interest and skipping budget and timeline.',
        'Filling every silence instead of letting the buyer finish thinking.',
        'Ending on "we will send some info" with no dated next step.',
        'Confusing a friendly champion with an actual decision maker.',
      ],
    },
    {
      type: 'diagram',
      variant: 'architecture',
      title: 'How Rally runs discovery for you',
      caption: 'The call becomes structured data the moment it ends, so nothing lives only in a notebook or a memory.',
      data: {
        layers: [
          { label: 'Capture', nodes: ['Call notes', 'Transcript', 'Email thread', 'Calendar'] },
          { label: 'Understand', nodes: ['Problem', 'Owner', 'Budget', 'Timeline'] },
          { label: 'Operator', nodes: ['Score', 'Flag gaps', 'Draft follow-up', 'Set next step'] },
          { label: 'Surfaces', nodes: ['Pipeline', 'Forecast', 'Rep coaching'] },
        ],
      },
    },
    {
      type: 'comparisonMatrix',
      title: 'Running discovery: notebook vs spreadsheet vs Rally',
      rowHeader: 'Capability',
      columns: ['Rally', 'Notebook', 'Spreadsheet CRM'],
      highlightCol: 0,
      rows: [
        { feature: 'Structured qualification score', cells: [true, false, 'partial'] },
        { feature: 'Score drafted from what was said', cells: [true, false, false] },
        { feature: 'Weakest dimension flagged automatically', cells: [true, false, false] },
        { feature: 'Follow-up drafted for you', cells: [true, false, false] },
        { feature: 'Next step tracked to a date', cells: [true, 'partial', true] },
        { feature: 'Rolls up into a real forecast', cells: [true, false, 'partial'] },
        { feature: 'Setup time', cells: ['Minutes', 'None', 'Weeks'] },
      ],
      footnote: 'Spreadsheet CRM column reflects a typical hand-built pipeline sheet. Verify current product capabilities before buying.',
    },
    {
      type: 'quote',
      text: 'The rep who wins is not the one with the best pitch. It is the one who understood the problem so well that the pitch became obvious.',
      cite: 'A Rally sales lead',
      role: 'Head of Revenue',
    },
    {
      type: 'richText',
      title: 'How to get better at discovery, fast',
      body: [
        'The fastest way to improve is to review your own calls against the framework. Pick one call a week and ask three questions: did I talk less than the buyer, did I quantify the pain, and did I leave with a dated next step? Most reps fail one of the three consistently, and fixing that single habit moves the number more than any script.',
        'Then make the score a ritual, not an afterthought. Assign it within a few minutes of every call, while the memory is fresh and the optimism has not yet rewritten what actually happened. The gap between your gut feeling and your honest score is exactly the coaching you needed and would otherwise never have seen.',
        'Discovery is a skill, which means it compounds. A rep who runs the same disciplined call five hundred times becomes very hard to beat, because they have heard every version of the problem and can diagnose it in minutes. The framework is what makes those five hundred reps add up instead of blur together.',
      ],
    },
    {
      type: 'faq',
      title: 'Frequently asked questions',
      items: [
        { q: 'How long should a discovery call be?', a: 'Thirty minutes is the sweet spot for most B2B deals. It is long enough to diagnose the problem and map the decision, and short enough to force discipline. Complex or enterprise deals may warrant a longer first call, but if you cannot qualify in thirty minutes, you are usually talking too much rather than needing more time.' },
        { q: 'How much should the salesperson talk?', a: 'As a rule of thumb, aim for the buyer to talk around seventy percent of the time. Your job is to ask a sharp question, then get out of the way. The calls that close are the ones where the buyer, not the rep, does most of the explaining.' },
        { q: 'What is the single best discovery question?', a: 'What happens if you do nothing? It cuts straight to whether the problem is a real must-fix or a nice-to-have. If the honest answer is that nothing much happens, you have saved yourself weeks of chasing a deal that was never going to close.' },
        { q: 'What is the difference between discovery and qualifying?', a: 'Discovery is understanding the problem. Qualifying is deciding whether it is a deal worth pursuing. You cannot qualify well without discovering first: a score based on a problem you never understood is just a guess with a number attached.' },
        { q: 'How do I qualify without sounding like an interrogation?', a: 'Set an agenda up front so the buyer knows why you are asking, and tie every question to their goals rather than your checklist. When you ask about budget or timeline in service of solving their problem, it reads as diligence, not pressure. Framing is everything.' },
        { q: 'Should I disqualify a deal on the first call?', a: 'Yes, when the honest score is low. Disqualifying early is a win, not a failure: it frees the time you would have spent nurturing a dead deal to spend on a live one. A good discovery process produces clear disqualifications as often as it produces clear opportunities.' },
      ],
    },
  ],
  related: ['b2b-sales-process', 'lead-scoring-guide', 'handling-sales-objections'],
};

export default entry;
