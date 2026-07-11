// ============================================================
// RALLY BLOG DATA
// Long-form content marketing posts. Real insight, written to rank
// and to be worth reading. Each post is a normalized record the
// Blog index and BlogPost renderer both read from.
// Structure: { slug, title, excerpt, author, role, date, readMins,
//   tag, gradient, sections: [{ h, paragraphs: [], bullets?: [] }] }
// NO em-dash / en-dash. ASCII hyphen only.
// ============================================================

export const TAGS = [
  'AI and CRM',
  'RevOps',
  'Forecasting',
  'Sales Process',
  'Playbooks',
  'Migration',
  'Email',
];

export const POSTS = [
  /* ---------------------------------------------------------- 1 */
  {
    slug: 'crms-became-data-entry-prisons',
    title: 'Why CRMs became data-entry prisons (and how AI ends that)',
    excerpt:
      'The CRM was sold as a memory for your revenue team. It became a tax on it. Here is how the system inverted, and what an AI-native CRM does differently.',
    author: 'The Rally Team',
    role: 'Product',
    date: '2026-07-02',
    readMins: 7,
    tag: 'AI and CRM',
    gradient: 'linear-gradient(120deg, #5b4bf5, #a855f7 55%, #0e9f9a)',
    sections: [
      {
        h: 'The original promise',
        paragraphs: [
          'The pitch for the CRM was simple and genuinely good. Your revenue team carries a huge amount of context in their heads: who said what on the last call, which champion just changed jobs, why a deal slipped a quarter. That context is fragile. People forget, people leave, and the knowledge walks out the door with them. A CRM was supposed to be the shared memory that outlived any one rep.',
          'For a while it worked. Then something quietly inverted. The system that was meant to remember things for your team became a system your team had to feed. The memory started asking for tribute.',
        ],
      },
      {
        h: 'How the inversion happened',
        paragraphs: [
          'Three forces turned a memory aid into a chore. None of them were malicious. They were the natural result of how the software was priced, sold, and configured.',
          'First, reporting demand. Executives wanted dashboards, and dashboards need clean structured fields. Every field a leader wanted to slice by became a field a rep had to fill in. Multiply that by forecast category, next step, competitor, loss reason, and stage-specific qualification, and a two-minute update becomes a fifteen-minute form.',
          'Second, the admin economy. Because the software was flexible, it needed configuring. Because it needed configuring, it needed administrators. Once a full-time admin exists, complexity has a permanent advocate. Every request becomes another required field, another validation rule, another reason the rep cannot save the record until they have answered a question that helps the company but not the deal.',
          'Third, per-seat pricing rewarded surface area. Vendors made more money the more the platform did, so the platform kept doing more. Modules multiplied. The interface that a seller touched forty times a day grew heavier every year.',
        ],
      },
      {
        h: 'The real cost is not the minutes',
        paragraphs: [
          'It is tempting to measure the problem in time. Reps spend somewhere between a fifth and a third of their week on non-selling administrative work, and a big slice of that is CRM hygiene. That is a real number and it is bad enough.',
          'But the deeper cost is what the data-entry burden does to data quality. When updating the record is painful, reps update it late, in a batch, from memory, right before the forecast call. A pipeline built from Friday-afternoon guesses is not a system of record. It is a system of good intentions. The forecast that leadership stakes the quarter on is downstream of a rep trying to remember Tuesday on Friday.',
          'So you get the worst of both worlds. The team pays the tax, and the data still is not trustworthy. The prison has bars and no security.',
        ],
      },
      {
        h: 'What AI-native actually changes',
        paragraphs: [
          'The phrase AI-native gets thrown around loosely, so here is a concrete test. A bolt-on AI feature helps you fill the form faster. An AI-native system removes the reason the form exists.',
          'The form exists because the software cannot observe your work, so it makes you transcribe it. But the work already happened somewhere the software can see. The call happened. The email thread exists. The meeting had a transcript. An operator that reads those sources can maintain the record instead of asking you to.',
        ],
        bullets: [
          'Calls and emails become structured updates automatically, so the record reflects what happened without a human retyping it.',
          'Next steps and stage changes are proposed from the actual conversation, and the rep approves rather than authors.',
          'The fields leadership wants get populated as a byproduct of selling, not as a separate second job.',
          'When something is genuinely ambiguous, the system asks one sharp question instead of showing twelve empty boxes.',
        ],
      },
      {
        h: 'Approve, do not author',
        paragraphs: [
          'The important design shift is the direction of effort. In the old model the human is the author and the software is the filing cabinet. In an AI-native model the software drafts and the human approves. Approval is fast because judgment is fast. Authoring is slow because typing is slow.',
          'This is not about trusting a model blindly. It is about matching the tool to the task. Reading a call and turning it into a clean set of updates is exactly the kind of high-volume, low-ambiguity work that machines are good at. Deciding whether the deal is really going to close this quarter is human judgment, and it should stay that way. The point is to stop spending human judgment on data entry so there is more of it left for the deal.',
        ],
      },
      {
        h: 'The test to run on any vendor',
        paragraphs: [
          'When you evaluate a CRM now, ignore the feature list and ask one question: how does a record stay current? If the honest answer is that a person has to remember to update it, you are buying another prison, however nice the walls look. If the answer is that the system observes the work and maintains itself while the person approves, you are buying back your team\'s week.',
          'The CRM was a good idea that got heavy. Making it observe instead of interrogate is how it gets light again.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 2 */
  {
    slug: 'the-ai-native-revenue-stack',
    title: 'The AI-native revenue stack',
    excerpt:
      'Most revenue teams run eight tools held together by integrations and a person who knows how the wiring works. Here is what the stack looks like when an operator sits at the center instead of glue code.',
    author: 'The Rally Team',
    role: 'Product',
    date: '2026-06-24',
    readMins: 8,
    tag: 'AI and CRM',
    gradient: 'linear-gradient(120deg, #2563a8, #5b4bf5 55%, #a855f7)',
    sections: [
      {
        h: 'The stack you actually have',
        paragraphs: [
          'Draw your real revenue stack on a whiteboard and it is rarely one system. It is a CRM in the middle, a marketing platform on one side, a CPQ and billing tool on the other, a sales engagement tool for sequences, a conversation intelligence tool listening to calls, a data enrichment vendor, a BI tool for the numbers leadership trusts, and a spreadsheet doing the work none of them quite do.',
          'Between every box is an arrow, and every arrow is an integration someone owns. The stack works as long as the arrows hold. The person who understands the arrows becomes quietly indispensable, and the org has accidentally hired a full-time job whose only output is keeping tools talking to each other.',
        ],
      },
      {
        h: 'Why integration is the tax',
        paragraphs: [
          'Each tool has its own model of the world. The CRM thinks in accounts and opportunities. The billing tool thinks in customers and subscriptions. The marketing tool thinks in contacts and campaigns. These are not the same objects wearing different names. They are genuinely different data models that have to be reconciled, and reconciliation is lossy.',
          'So a customer becomes an account becomes a subscription, and at each hop a field drops or a definition drifts. The classic symptom is the meeting where sales, finance, and marketing each bring a number and none of them match. Nobody is lying. They are reading three systems that were never truly one.',
          'The integrations do not remove this problem. They move data across the gaps fast enough that you can pretend the gaps are not there, until a reconciliation breaks and someone spends a day finding out which system is right.',
        ],
      },
      {
        h: 'One data model, one operator',
        paragraphs: [
          'The AI-native alternative is not a better integration. It is fewer integrations, because the modules share one data model and one operator sits across all of them.',
          'When leads, deals, quotes, billing, campaigns, and projects are records in the same system, a customer is one object from first touch to renewal. There is no hop where the definition drifts because there is no hop. The number is the number because there is only one source for it.',
          'The operator is what makes that unification useful rather than just tidy. An AI operator with read access to the entire model can answer a question that used to require three tools and a human to join them by hand.',
        ],
        bullets: [
          'Which enterprise deals closing this quarter have an open support issue that could stall the signature?',
          'Show me every account whose usage dropped this month but whose renewal is within ninety days.',
          'Draft the renewal outreach for the ten accounts most likely to churn, grounded in their actual account history.',
        ],
      },
      {
        h: 'The operator is the interface',
        paragraphs: [
          'In the old stack, the interface is navigation. You learn where things live, you click between modules, you export to a spreadsheet to do the thing the software cannot. Skill with the tool is largely skill at getting around it.',
          'In an AI-native stack, the primary interface is intent. You describe the outcome and the operator assembles the steps. Build a full account for this new company and its buying committee. Generate the quarterly business review for this customer from real usage. Find the stalled deals and schedule the rescue. The work that used to be a sequence of clicks becomes a sentence.',
          'This does not delete the traditional views. Pipelines, tables, and dashboards still matter for scanning and for trust. But they stop being the only way to get work done, and that is the difference between software you operate and software that operates for you.',
        ],
      },
      {
        h: 'What consolidation is really worth',
        paragraphs: [
          'The obvious win is cost. Collapsing eight tools into one platform removes seven bills, several renewals, and the negotiation calendar that comes with them. That alone often pays for the switch.',
          'The larger win is that the reconciliation job disappears. When the marketing number and the finance number come from the same records, nobody spends the first twenty minutes of the meeting arguing about whose data is right. That reclaimed trust compounds. Decisions get made on the number instead of on the debate about the number.',
          'And the person who used to own the arrows gets promoted from plumber to analyst. Their time moves from keeping tools in sync to asking the questions the unified data can finally answer.',
        ],
      },
      {
        h: 'How to move without a big-bang migration',
        paragraphs: [
          'You do not have to rip everything out on a single weekend to get here. The practical path is to consolidate around the object that touches the most tools, usually the account or the deal, and let the operator prove its value on that before you retire the next tool.',
          'Start by unifying the system of record so the customer is one object. Then fold in the adjacent modules one at a time, retiring an integration with each. Each step removes an arrow from the whiteboard. The goal is not a heroic rip and replace. It is a whiteboard with fewer arrows every month until the glue code, and the job of maintaining it, is simply gone.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 3 */
  {
    slug: 'forecasting-you-can-actually-trust',
    title: 'Forecasting you can actually trust',
    excerpt:
      'Most forecasts are a negotiation dressed up as a number. Here is how to build one that survives contact with the quarter, and what an AI operator adds that a spreadsheet cannot.',
    author: 'The Rally Team',
    role: 'RevOps',
    date: '2026-06-16',
    readMins: 8,
    tag: 'Forecasting',
    gradient: 'linear-gradient(120deg, #0e9f9a, #2563a8 55%, #5b4bf5)',
    sections: [
      {
        h: 'Why most forecasts are fiction',
        paragraphs: [
          'A forecast is supposed to be a prediction. In many companies it is actually a negotiation. The rep sandbags so they can beat it. The manager pads it because they got burned last quarter. The VP applies a haircut because they do not trust the managers. By the time a number reaches the board it has been through three rounds of politics and reflects everyone\'s incentives more than the state of the pipeline.',
          'The tell is simple. Ask why a specific deal is in commit and listen for whether the answer is about the buyer or about the rep. If the reasons are all internal, hope, momentum, this one always comes through, you do not have a forecast. You have a mood.',
        ],
      },
      {
        h: 'The three questions a real forecast answers',
        paragraphs: [
          'A forecast you can trust is not a single number. It is a defensible answer to three separate questions, each of which fails in a different way.',
        ],
        bullets: [
          'How much will close, the point estimate leadership plans around.',
          'How confident are we, the range, because a number without a range hides whether you are guessing or predicting.',
          'What has changed since last week, the deltas, because the movement is where the risk lives, not the total.',
        ],
      },
      {
        h: 'Stop forecasting on stage alone',
        paragraphs: [
          'The most common forecasting mistake is treating pipeline stage as probability. A deal in stage four is not seventy percent likely to close because it is in stage four. Stage is a measure of process, not of intent. A deal can sit in late stage for a quarter because the champion is stalled and the rep will not move it back.',
          'Better signals are behavioral. Has the buyer given you access to the economic decision maker? Is there a mutual action plan with real dates the buyer agreed to? Has activity gone quiet, and for how long? Is there a compelling event with a real deadline, or an invented one the rep is leaning on? These signals predict outcomes far better than the stage field, because they describe the buyer rather than your process.',
          'The problem is that these signals are expensive to gather by hand. Reading every thread and every call to judge whether a deal is really moving is a full-time job nobody has time for. This is exactly where an operator earns its keep.',
        ],
      },
      {
        h: 'What the operator does that the spreadsheet cannot',
        paragraphs: [
          'A spreadsheet can only compute on the fields you already typed in. If the next-step field is stale, the spreadsheet cheerfully forecasts on stale data and gives you false precision. Garbage in, confident garbage out.',
          'An AI operator reads the underlying activity, not just the summary fields. It can flag that a commit deal has gone silent for eleven days, that a deal the rep is confident about has never involved anyone with signing authority, or that the close date has slipped three times and is about to slip again. It surfaces the gap between the story in the pipeline and the evidence in the record.',
          'That does not replace the human call. The rep and manager still decide what to commit. But they decide with the discrepancies on the table instead of buried in a thread nobody had time to read.',
        ],
      },
      {
        h: 'Run the forecast as a variance review',
        paragraphs: [
          'The highest-leverage change to a forecast meeting is to stop reviewing the pipeline top to bottom and start reviewing the changes. What moved into commit and why? What fell out and what did we learn? Which deals slipped, and is that a pattern with one rep, one segment, or one competitor?',
          'Reviewing every deal every week trains everyone to tune out. Reviewing what changed keeps the meeting short and puts attention exactly where the risk moved. A good operator can produce that delta automatically, so the meeting starts with the movement already summarized instead of a manager reading a list aloud.',
        ],
      },
      {
        h: 'Separate commit from best case, and defend the line',
        paragraphs: [
          'A single forecast number blurs two very different claims. Commit is what you are willing to be held to, the deals you would bet your quarter on. Best case is what could happen if the wind is at your back. Collapsing them into one number is how teams end up simultaneously sandbagging and over-promising, because the number is asked to mean both at once.',
          'The discipline is to keep the two categories genuinely distinct and to guard what earns a spot in commit. A deal enters commit when there is evidence, a named economic buyer, an agreed next step, a real deadline, not when a rep feels good about it. Best case is where hope is allowed to live. When those definitions hold across the team, the commit number becomes something leadership can actually plan around, and the best-case number becomes a useful measure of upside rather than a second helping of optimism.',
        ],
      },
      {
        h: 'Close the loop or you never improve',
        paragraphs: [
          'A forecast is a prediction, and predictions can be scored. The teams that get good at forecasting are the ones that go back after the quarter and ask where they were wrong and why. Did commit deals close at the rate you assumed? Which stage consistently over-promises? Which rep is reliably optimistic and by how much?',
          'Without that loop, the forecast never gets better, it just gets re-argued every quarter. With it, you build a calibration you can trust, because it is grounded in your own history rather than in this quarter\'s optimism. The number stops being a negotiation and starts being a measurement, and measurements you can actually plan around.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 4 */
  {
    slug: 'how-to-run-a-pipeline-review',
    title: 'How to run a pipeline review that is not a status meeting',
    excerpt:
      'Most pipeline reviews are a rep reading a list while a manager nods. Here is a format that finds risk, moves deals, and ends on time.',
    author: 'The Rally Team',
    role: 'Sales Leadership',
    date: '2026-06-09',
    readMins: 7,
    tag: 'Playbooks',
    gradient: 'linear-gradient(120deg, #a855f7, #5b4bf5 55%, #2563a8)',
    sections: [
      {
        h: 'The meeting almost everyone runs wrong',
        paragraphs: [
          'The default pipeline review is a recital. The manager pulls up the rep\'s deals, the rep narrates each one, the manager nods and occasionally asks what the next step is. Forty-five minutes later everyone has heard a list and nothing has changed. The deals that were going to close still are, the deals that were going to slip still will, and the meeting produced status rather than progress.',
          'The reason it fails is that it optimizes for coverage. Touching every deal feels responsible. But attention spread evenly is attention wasted, because most deals do not need discussion and the few that do get the same two minutes as the rest.',
        ],
      },
      {
        h: 'Decide what the meeting is for',
        paragraphs: [
          'A pipeline review has exactly one job: change the trajectory of deals that can still be changed. It is not a forecast meeting, which is about the number. It is not a coaching session, which is about the rep. It is about specific deals and the specific next action that moves each one.',
          'Once you accept that, the format follows. You do not review deals that are on track, because there is nothing to change. You do not review deals that are dead, because there is nothing to save. You review the deals in the middle, where a manager\'s help this week actually alters the outcome.',
        ],
      },
      {
        h: 'Triage before the meeting, not during it',
        paragraphs: [
          'The worst use of a live meeting is figuring out which deals to talk about. That triage should happen before anyone joins the call. Come in with the shortlist already built so the whole meeting is spent on the deals that matter.',
        ],
        bullets: [
          'Deals that slipped their close date, especially more than once, because slippage is the clearest signal of trouble.',
          'Deals in commit with no activity in the last two weeks, because silence in a late-stage deal is rarely good news.',
          'Deals missing a key qualification signal, no economic buyer, no next step, no compelling event.',
          'Large deals where a small manager intervention has outsized leverage on the number.',
        ],
      },
      {
        h: 'Ask about the buyer, not the rep',
        paragraphs: [
          'The quality of a pipeline review lives in the questions. Weak questions are about the rep\'s activity: did you follow up, when is the next call, did you send the deck. Strong questions are about the buyer\'s reality: who else has to say yes, what happens if they do nothing, what is the actual deadline and who set it.',
          'The shift matters because rep-activity questions can be answered with motion, and motion is not progress. Buyer-reality questions expose whether the deal is real. A rep who cannot name the economic buyer or the compelling event does not have a late-stage deal, they have an early-stage deal in a late-stage costume, and the review is where that gets caught.',
        ],
      },
      {
        h: 'End every deal with an owner and a date',
        paragraphs: [
          'A review that does not change anything is theater. Every deal you discuss should end with a specific action, a named owner, and a date. Not we should loop in the champion, but the rep will get the champion to forward the business case to the CFO by Thursday. The specificity is the point. Vague commitments are how deals die politely.',
          'This is also where the review connects to the rest of the week. The actions you agree on are the actions that should show up in the rep\'s day, and the next review should open by checking whether they happened. A review with no follow-through teaches everyone that the review does not matter.',
        ],
      },
      {
        h: 'Get the cadence and the room right',
        paragraphs: [
          'Weekly is the right default for most teams, because a week is long enough that things change and short enough that you can still act on them. Monthly reviews let deals drift too far before anyone intervenes. Daily reviews turn into surveillance and train reps to manage the meeting instead of the deal. If you run a longer sales cycle, biweekly can work, but err toward more frequent and shorter rather than rare and exhaustive.',
          'Keep the room small. A pipeline review is a working session between a rep and their manager, not an audience. When skip-level leaders or peers sit in, the rep starts performing for the room, hiding the shaky deals instead of surfacing them, which is the exact opposite of what the meeting is for. The whole value comes from honesty about which deals are in trouble, and honesty needs a small room. Save the broad visibility for the forecast call, which has a different job.',
        ],
      },
      {
        h: 'Let the system do the prep',
        paragraphs: [
          'Everything above assumes someone did the triage, read the activity, and spotted the stalled deals before the meeting. Done by hand, that prep is an hour a manager rarely has, so the meeting defaults back to the recital.',
          'This is the part worth automating. An operator that reads the pipeline can build the shortlist, flag the silent commit deals, surface the missing qualification, and summarize what changed since last week, so the manager walks in with the agenda already written. The human still runs the meeting and makes the calls. The machine just makes sure the meeting is spent on the right ten deals instead of all sixty.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 5 */
  {
    slug: 'meddic-in-practice',
    title: 'MEDDIC in practice, not on a poster',
    excerpt:
      'MEDDIC is the most used and least practiced qualification framework in sales. Here is how to run it as a working discipline instead of a checklist nobody fills in.',
    author: 'The Rally Team',
    role: 'Sales Enablement',
    date: '2026-05-30',
    readMins: 9,
    tag: 'Sales Process',
    gradient: 'linear-gradient(120deg, #5b4bf5, #2563a8 55%, #0e9f9a)',
    sections: [
      {
        h: 'The framework everyone has and few use',
        paragraphs: [
          'MEDDIC is on the wall of half the sales floors in software. It stands for Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, and Champion, sometimes extended to MEDDPICC with Paper process and Competition. As a checklist it is famous. As a practice it is rare, because most teams treat it as fields to fill in rather than questions to answer.',
          'The difference is everything. A rep who types a name into the economic buyer field has completed the field. A rep who has actually met the person who controls the budget and understood what they care about has done MEDDIC. The framework only works when it changes what you do in the deal, not just what you record about it.',
        ],
      },
      {
        h: 'Metrics: quantify the pain or you are a nice-to-have',
        paragraphs: [
          'Metrics are the numbers that make the problem worth solving. Not your product\'s stats, the buyer\'s. How much is the current situation costing them, in money, in time, in risk? If you cannot express the pain as a number the buyer agrees with, your deal is a preference, and preferences lose to budget cuts.',
          'The practice is to build the metric with the buyer, not for them. A metric you calculated in a slide is a claim. A metric the champion helped you build is ammunition they will carry into the room you are not in.',
        ],
      },
      {
        h: 'Economic buyer: the person who can say yes alone',
        paragraphs: [
          'The economic buyer is the one person who can approve the spend without asking anyone else. Not the champion, not the user, not the manager who loves your product. The test is authority over the budget.',
          'Most stalled enterprise deals share one root cause: the rep never reached the economic buyer and built the whole deal with a champion who cannot actually sign. When that deal reaches the end, the economic buyer appears for the first time, asks a question nobody prepared for, and the deal slips a quarter. Reaching this person early is uncomfortable, which is exactly why weak deals avoid it.',
        ],
      },
      {
        h: 'Decision criteria and process: how they buy',
        paragraphs: [
          'Decision criteria are what the buyer will judge the options on. Decision process is the sequence of steps and approvals between now and a signature. These two are where deals quietly die, because a rep can run a flawless sales process while being completely wrong about how the customer actually buys.',
        ],
        bullets: [
          'If you do not know the criteria, you cannot shape them, and a competitor who does will write them in their favor.',
          'If you do not know the process, you cannot forecast, because you do not know what still has to happen before money moves.',
          'If procurement, security review, or legal is a step you discover late, your close date was always fiction.',
        ],
      },
      {
        h: 'Identify pain and Champion: the human core',
        paragraphs: [
          'Pain is the reason the buyer will act despite the friction of change. Not a mild inefficiency, a real cost that someone is accountable for fixing. Deals without genuine pain stall the moment the quarter gets busy, because doing nothing is always the easiest option and only real pain overcomes it.',
          'A champion is someone inside the account who wants you to win and has the credibility to influence the decision. The two tests are simple: do they sell for you when you are not in the room, and do they have the standing to matter? A friendly contact who likes you but cannot move anyone is not a champion, they are a coach. You need both, but do not confuse them.',
        ],
      },
      {
        h: 'Use it to disqualify, not just to qualify',
        paragraphs: [
          'The highest-value use of MEDDIC is not proving a deal is good, it is catching early that a deal is bad. A pipeline full of deals that will never close is worse than a smaller honest one, because it wastes the scarcest resource a seller has, which is time. Every hour spent nursing a deal with no economic buyer and no real pain is an hour stolen from a deal that could actually be won.',
          'So run the framework as a set of go or no-go gates, not just a scorecard. If after real effort there is no identifiable pain worth paying to solve, no path to the economic buyer, and no champion with standing, that is not a deal to keep warming, it is a deal to set down. Good reps are ruthless about this, and it is why their forecasts are trustworthy: the deals that survive their qualification are the ones with a real reason to close. Disqualifying early is not giving up, it is refusing to let a dead deal quietly consume the quarter.',
        ],
      },
      {
        h: 'Run it as a living map, not an audit',
        paragraphs: [
          'The reason MEDDIC decays into dead fields is that filling it in is tedious and the payoff is invisible until a deal blows up. So reps update it right before the deal review, from memory, and the qualification is as stale as the pipeline it feeds.',
          'The fix is to treat MEDDIC as a map the system helps maintain from the actual conversations. An operator that reads calls and threads can flag that a commit deal still has no economic buyer identified, that the decision process has a procurement step nobody logged, or that the champion has gone quiet for two weeks. It turns the framework from a form the rep resents into a live risk map that updates as the deal moves. The judgment stays human. The bookkeeping stops being the reason the discipline dies.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 6 */
  {
    slug: 'the-end-of-the-six-month-crm-rollout',
    title: 'The end of the six-month CRM rollout',
    excerpt:
      'CRM migrations became legendary projects with consultants, phases, and a launch date that slips. They do not have to be. Here is why the six-month rollout is a choice, not a law.',
    author: 'The Rally Team',
    role: 'Implementation',
    date: '2026-05-21',
    readMins: 7,
    tag: 'Migration',
    gradient: 'linear-gradient(120deg, #2563a8, #0e9f9a 55%, #5b4bf5)',
    sections: [
      {
        h: 'How a tool switch became a saga',
        paragraphs: [
          'Ask anyone who has changed CRMs at a company of any size and they describe a project, not a purchase. There is a discovery phase, a data mapping phase, a configuration phase, a testing phase, a training phase, and a go-live date that everyone privately expects to slip. Consultants are involved. A steering committee meets. The whole thing takes two quarters and costs more than the software.',
          'It is worth asking why. Moving contacts, companies, and deals from one database to another is not, on its face, a six-month problem. The saga is not caused by the data. It is caused by everything the team decided to do to the data on the way across.',
        ],
      },
      {
        h: 'The complexity is mostly self-inflicted',
        paragraphs: [
          'Most of a long rollout is not migration, it is redesign. The team uses the switch as an excuse to rethink the sales process, rename every stage, invent new required fields, and rebuild every report. Each of those is a legitimate project. Bolting all of them onto the migration is what turns a move into a saga.',
          'The old system also accumulated years of customization, and untangling which of it still matters is genuine archaeology. But that archaeology is a choice too. A lot of it can be left behind rather than faithfully recreated, and most teams discover after the switch that half the custom fields nobody could explain were not load-bearing at all.',
        ],
      },
      {
        h: 'Separate the move from the redesign',
        paragraphs: [
          'The single most useful decision is to split the project in two. First, move the data and get the team working. Second, and only after, improve the process. Conflating them is what makes both take forever and lets the go-live date slip endlessly, because you can always find one more thing to fix before launch.',
          'Move first means the customer object, the pipeline, the history, and the activity come across cleanly and the team can sell on day one. The stage names can be imperfect. The reports can be rebuilt next month. What matters is that nobody loses their deals and nobody loses a day. Improvement is a follow-up, not a blocker.',
        ],
      },
      {
        h: 'What a modern migration looks like',
        paragraphs: [
          'When the system on the receiving end is designed for it, the mechanical part of a migration is fast. The objects map to obvious equivalents. The history comes across attached to the right records. The new system arrives populated instead of empty, so the team recognizes their pipeline instead of facing a blank database.',
        ],
        bullets: [
          'Connect the old system read-only and map the objects automatically, with a human approving the mapping rather than building it from scratch.',
          'Move accounts, contacts, deals, and history together so the customer stays one object with its full timeline intact.',
          'Run the two systems side by side for a window so nothing is truly at risk during the cutover.',
          'Keep a rollback option open long enough that the decision to switch is reversible, which is what makes it easy to make.',
        ],
      },
      {
        h: 'De-risking is what makes it fast',
        paragraphs: [
          'The reason old migrations move slowly is fear, and the fear is rational. If the switch is a cliff, with the old system gone the moment the new one turns on, then every possible failure has to be prevented in advance, which is why the testing phase alone takes a month.',
          'Remove the cliff and you remove the fear. Side-by-side operation and a real rollback window mean a problem discovered after launch is an inconvenience, not a catastrophe. When failure is recoverable, you can move quickly, because you are no longer trying to be perfect before you begin. Reversibility is not a safety net you hope never to use. It is the thing that lets you go fast in the first place.',
        ],
      },
      {
        h: 'Adoption is the real risk, so make Monday easy',
        paragraphs: [
          'The part of a migration that actually fails is rarely the data. It is the people. A team that loved the old system, or at least knew where everything was, resents being made slower, and a new tool that makes reps slower on day one gets quietly abandoned no matter how clean the migration was. Shadow spreadsheets reappear, updates stop, and within a quarter the expensive new system is a system of record for nobody.',
          'The defense is to make the first day feel like a relief, not a tax. The team logs in and their deals are already there, in a layout they recognize, with the history attached. The operator has already done the tedious catch-up so nobody faces a blank screen. When the new system is visibly easier than the old one from the first login, adoption takes care of itself, because people do not abandon tools that make them faster. Change management stops being a training program and becomes a good first impression.',
        ],
      },
      {
        h: 'A weekend, not two quarters',
        paragraphs: [
          'Put it together and the six-month rollout stops being inevitable. Move the data over a weekend with the mapping approved, not hand-built. Let the team log in Monday to a system that already has their deals. Do the process improvements as a calm follow-up rather than a launch blocker. Keep the escape hatch open until everyone is confident.',
          'The long rollout was never a law of physics. It was the sum of a lot of choices to do everything at once, on a cliff, by hand. Make different choices and the saga is just a switch.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 7 */
  {
    slug: 'building-a-revops-function',
    title: 'Building a RevOps function from scratch',
    excerpt:
      'RevOps is either the team that makes revenue predictable or the team that owns the CRM tickets. Here is how to build the first version and avoid becoming the second.',
    author: 'The Rally Team',
    role: 'RevOps',
    date: '2026-05-12',
    readMins: 9,
    tag: 'RevOps',
    gradient: 'linear-gradient(120deg, #0e9f9a, #5b4bf5 55%, #a855f7)',
    sections: [
      {
        h: 'What RevOps is actually for',
        paragraphs: [
          'Revenue operations exists to make revenue predictable and efficient across the whole customer lifecycle, from first marketing touch to renewal. It unifies what used to be three separate operations teams, sales ops, marketing ops, and customer success ops, under one function that owns the systems, the data, and the process end to end.',
          'The promise is that when one team owns the full funnel, the handoffs stop leaking. Marketing and sales agree on what a qualified lead is. Sales and success agree on what a clean handoff looks like. The number means the same thing everywhere because one team is responsible for defining it. That is the job. Everything else is a means to it.',
        ],
      },
      {
        h: 'The trap: becoming the CRM help desk',
        paragraphs: [
          'The most common failure mode is that RevOps gets hired to make revenue predictable and instead becomes the team that resets dashboards and fields CRM tickets. It happens gradually. The tooling is complex, someone has to maintain it, and the maintenance expands to fill all the time there is. Within a year the strategic mandate has quietly been replaced by a queue.',
          'The irony is sharp. The function meant to reduce operational drag becomes the operational drag, because the systems it inherited require so much hand-holding that keeping them alive is a full-time job. Avoiding this trap is the central design problem of building RevOps, and it starts with the tools you choose to run on.',
        ],
      },
      {
        h: 'Start with definitions, not dashboards',
        paragraphs: [
          'The instinct of a new RevOps team is to build dashboards, because dashboards are visible and make it look like progress is happening. The better first move is to nail down definitions, because a dashboard built on fuzzy definitions is a fast way to be confidently wrong.',
        ],
        bullets: [
          'What exactly is a qualified lead, and who agrees, marketing and sales both?',
          'What are the pipeline stages and what has to be true to enter each one?',
          'What counts as an opportunity, and when does a deal become one?',
          'How is the forecast built, and what does each forecast category actually mean?',
        ],
      },
      {
        h: 'Own the funnel, not just the CRM',
        paragraphs: [
          'A RevOps team that only owns the CRM owns the middle of the funnel and none of the edges. But the leaks are at the edges. The worst losses happen at the handoff from marketing to sales, where leads go cold in a gap nobody owns, and at the handoff from sales to success, where the context of the deal evaporates and the customer has to re-explain themselves to their new contact.',
          'Owning the full lifecycle means owning those seams. It is only possible when the data is unified, because you cannot manage a handoff between two systems that disagree about who the customer is. This is the practical reason RevOps and platform consolidation are linked. A fragmented stack makes true RevOps almost impossible, because half the team\'s energy goes to reconciling the tools instead of improving the funnel.',
        ],
      },
      {
        h: 'Automate the maintenance or it eats you',
        paragraphs: [
          'The way out of the help-desk trap is to make sure the systems do not require constant human maintenance to stay accurate. If data hygiene depends on reps remembering to update fields and RevOps remembering to clean up after them, the team will drown in hygiene forever and never get to strategy.',
          'This is where an AI operator changes the economics of the function. When the system maintains its own records from the actual work, keeps the data clean without a human doing data entry, and can answer analytical questions directly, RevOps stops being the team that keeps the CRM alive and becomes the team that uses it. The headcount you would have spent on maintenance goes to analysis and to fixing the funnel instead.',
        ],
      },
      {
        h: 'The first ninety days',
        paragraphs: [
          'A new RevOps function drowns if it tries to fix everything at once. The first quarter should be narrow and sequenced, earning trust with a few visible wins before taking on the harder structural work. Spread too thin, the team becomes a reactive queue before it ever gets to set an agenda.',
        ],
        bullets: [
          'Weeks one to three, map the current reality: the tools, the data flows, the definitions people actually use, and where the funnel leaks.',
          'Weeks four to six, fix the definitions and the worst handoff, usually the marketing-to-sales lead gap, because that is where trust is won or lost early.',
          'Weeks seven to twelve, stand up the forecast process and the core reporting on top of clean definitions, not before them.',
          'Throughout, resist every request to become the CRM help desk, and route hygiene into automation rather than into the team\'s calendar.',
        ],
      },
      {
        h: 'Measure yourself on outcomes, not tickets',
        paragraphs: [
          'How you measure the RevOps team decides what it becomes. Measure it on tickets closed and system uptime and you get a help desk, because that is what those metrics reward. Measure it on forecast accuracy, funnel conversion, sales cycle length, and time reps spend actually selling, and you get the strategic function you meant to build.',
          'The metrics are a statement of purpose. RevOps is not there to keep the lights on. It is there to make revenue predictable, and the only honest scoreboard is whether revenue got more predictable. Build the team around that number, run it on tools that do not demand endless upkeep, and you get the function the mandate promised instead of the queue it so often becomes.',
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- 8 */
  {
    slug: 'sales-email-that-gets-replies',
    title: 'Sales email that gets replies',
    excerpt:
      'The cold email playbook everyone copied stopped working because everyone copied it. Here is what actually earns a reply now, and where AI helps without making it worse.',
    author: 'The Rally Team',
    role: 'Sales',
    date: '2026-05-02',
    readMins: 7,
    tag: 'Email',
    gradient: 'linear-gradient(120deg, #a855f7, #0e9f9a 55%, #2563a8)',
    sections: [
      {
        h: 'Why the old playbook stopped working',
        paragraphs: [
          'For years the cold email formula was public and it worked. A pattern-interrupt opener, a line of fake personalization pulled from a job title, a value prop, a bit of social proof, and a low-friction call to action. Whole companies were built teaching it. Then it stopped working, for the most boring reason possible: everyone learned it. When every inbox gets twenty emails that all follow the same template, the template becomes invisible, and the buyer\'s pattern recognition tunes out the whole genre.',
          'The tell that you are sending the dead playbook is that the personalization is fake and the recipient knows it. Congratulations on the new role and I saw your company is growing are not personalization. They are a mail merge wearing a costume, and modern buyers spot the costume in half a second.',
        ],
      },
      {
        h: 'Relevance beats personalization',
        paragraphs: [
          'The word personalization got hijacked to mean inserting the recipient\'s name and company. That is not personalization, it is variable substitution, and it fools no one. What actually earns attention is relevance: evidence that you understand something real and specific about their situation and that your reason for writing follows from it.',
          'The difference is whether the email could have been sent to a thousand people with the fields swapped. If it could, it is spam with good grammar. If it genuinely only makes sense sent to this person because of something true about their business, it is relevant, and relevant is what gets opened, read, and answered.',
        ],
      },
      {
        h: 'The anatomy of an email that earns a reply',
        paragraphs: [
          'The structure that works now is short, specific, and built around the reader instead of the sender. Nobody owes you a reply, so every line has to earn the next one.',
        ],
        bullets: [
          'A first line that proves you did your homework, tied to something specific and recent about them, not a generic flatter.',
          'A single clear reason you are reaching out, framed as their problem rather than your product.',
          'One idea, not five, because an email that tries to say everything gets deleted before it says anything.',
          'A specific, low-friction ask, a real question they can answer in one line, not a demo request dressed as a question.',
          'Brevity that respects their time, short enough to read on a phone without scrolling.',
        ],
      },
      {
        h: 'Write for a reply, not a click',
        paragraphs: [
          'A subtle mindset shift changes everything: optimize for a reply, not a click or a booked meeting. The instant you ask for a demo, you have asked a stranger for thirty minutes, and strangers do not give thirty minutes. Ask a genuine question they can answer in one sentence and you have started a conversation, which is the actual goal.',
          'The best cold emails often do not mention a meeting at all. They ask something specific enough that answering is easy and interesting, and the meeting comes later, once you are two replies into a real exchange rather than one cold ask into an ambush. The ask should feel like the beginning of a conversation, not the end of a pitch.',
        ],
      },
      {
        h: 'Where AI helps, and where it makes things worse',
        paragraphs: [
          'AI can make cold email dramatically better or dramatically worse, and the difference is what you point it at. Point it at volume and you get more of the dead playbook, faster: ten thousand generic emails with the name swapped, which is exactly the flood that killed the channel. That is not a strategy, it is a way to burn your domain reputation at scale.',
          'Point it at relevance and it becomes genuinely useful. An operator grounded in your CRM knows the real history with an account, what was discussed on the last call, where a deal stalled, what a similar customer cared about. It can draft an email that references something true and specific because it has read the actual context, and then a human edits and sends. That is the good version: AI doing the research and the first draft, a human providing the judgment and the voice.',
        ],
      },
      {
        h: 'The follow-up is where deals are actually made',
        paragraphs: [
          'Most replies do not come from the first email. They come from the third or fourth, and yet most reps quit after one or two, which means they do the work of researching and writing the opener and then abandon it right before it would have paid off. Persistence, done well, is the highest-return habit in outbound.',
          'The line to walk is between persistent and annoying, and the difference is whether each follow-up adds something. A follow-up that just says bumping this or checking in again is noise, and noise gets you blocked. A follow-up that brings a new angle, a relevant example, a piece of research, a different way the problem might be showing up for them, earns its place in the inbox. Space them out sensibly, a few business days apart, and make each one a reason to reply rather than a reminder that they did not. Then know when to stop: a graceful final note that closes the loop often pulls a reply precisely because it asks for nothing.',
        ],
      },
      {
        h: 'The one rule underneath all of it',
        paragraphs: [
          'Every tactic here reduces to a single principle: earn the reply by being worth replying to. Buyers are not avoiding email, they are avoiding email that wastes their time, and there is an enormous amount of it. The bar is not cleverness or a better subject line. The bar is relevance and respect.',
          'Say something true and specific, ask for something small and real, and keep it short. That was always what worked. The templates obscured it for a while, and now that they have stopped working, the fundamentals are all that is left, which is good news for anyone willing to do the actual work of being relevant.',
        ],
      },
    ],
  },
];

/* ---------- lookups ---------- */
export const getPost = (slug) => POSTS.find((p) => p.slug === slug) || null;

export function relatedPosts(post, n = 3) {
  if (!post) return [];
  const sameTag = POSTS.filter((p) => p.slug !== post.slug && p.tag === post.tag);
  const rest = POSTS.filter((p) => p.slug !== post.slug && p.tag !== post.tag);
  return [...sameTag, ...rest].slice(0, n);
}

/* Approx word count for a post body (used for read-time fallbacks). */
export function wordCount(post) {
  let n = 0;
  for (const s of post.sections || []) {
    for (const p of s.paragraphs || []) n += p.split(/\s+/).length;
    for (const b of s.bullets || []) n += b.split(/\s+/).length;
  }
  return n;
}
