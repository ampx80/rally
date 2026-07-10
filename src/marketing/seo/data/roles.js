// roles dataset - "CRM for <role/team>" pages. Compact role data mapped into
// full SeoPage `role` entries. NO em-dash / en-dash. ASCII hyphen only.
const PUB = '2026-07-10';

// Each role: slug (kebab), title (full "CRM for ..."), role (noun phrase for
// prose), kw (metaTitle keywords), md (metaDescription, under 155 chars),
// intro, shortAnswer (40-60 words), vp (4-5 valueProps {i,h,b}),
// sec (2 sections {h,body}), faqs (3 {q,a}).
const ROLES = [
  {
    slug: 'sales-managers',
    title: 'CRM for Sales Managers',
    role: 'sales managers',
    kw: 'forecasting, pipeline reviews, rep coaching',
    md: 'The CRM built for sales managers: a rollup forecast that ties out, one-click pipeline reviews, and rep coaching signals. Alive with data in minutes.',
    intro:
      'A sales manager lives between the number the company promised and the reps who have to hit it. The right CRM makes that gap visible early and turns weekly guesswork into a coached, forecastable plan.',
    shortAnswer:
      'A sales manager owns the number for a team of reps, running weekly pipeline reviews, building a forecast leaders can trust, coaching reps on stuck deals, and tracking quota attainment. The CRM they need surfaces stalled deals, rolls a bottoms-up forecast, and shows where each rep needs help without a spreadsheet export.',
    vp: [
      { i: 'chart', h: 'A forecast that ties out', b: 'Rally rolls a bottoms-up forecast from real deal amounts, stages, and close dates, so your commit is defensible in front of leadership instead of pieced together in a spreadsheet the night before.' },
      { i: 'target', h: 'Pipeline reviews in one view', b: 'Sort a rep\'s open deals by stalled days, next step, and amount, so a one-on-one becomes a working session on the deals that matter, not a status readout.' },
      { i: 'zap', h: 'Rook flags the risk', b: 'The operator surfaces deals with no next step, slipping close dates, or a single-threaded contact, so you coach the at-risk deals before they die, not after.' },
      { i: 'users', h: 'Rep coaching signals', b: 'See win rate, average deal size, sales cycle, and stage conversion per rep, so you know who needs help closing versus filling top of funnel.' },
      { i: 'workflow', h: 'Quota tracking without exports', b: 'Attainment, gap to goal, and coverage ratio update live as deals move, so you always know if the team has enough pipeline to hit the number.' },
    ],
    sec: [
      { h: 'Run a pipeline review that changes outcomes', body: 'Most reviews burn the hour reading deal status out loud. Rally flips that: open a rep\'s pipeline sorted by risk, see the deals stuck longest and the ones missing a next step, and spend the time on decisions. Rook pre-writes the follow-up so the actions from the review actually happen.' },
      { h: 'A forecast leadership believes', body: 'Rally builds the forecast from the same deal data your reps update every day, weighted by stage and close date, with a clear view of commit, best case, and pipeline. When a deal slips, the rollup moves, so there is no quarter-end surprise and no reconciling three versions of the truth.' },
    ],
    faqs: [
      { q: 'How does a CRM help a sales manager forecast?', a: 'A good CRM rolls a bottoms-up forecast from live deal amounts, stages, and close dates. Rally weights each deal and totals commit, best case, and pipeline automatically, so your forecast reflects reality instead of a manual spreadsheet.' },
      { q: 'Can I see which reps need coaching?', a: 'Yes. Rally shows win rate, average deal size, sales cycle length, and stage-by-stage conversion for each rep, so you can tell who struggles to close versus who needs more top-of-funnel activity, then coach the specific gap.' },
      { q: 'How fast can my team start using Rally?', a: 'Minutes. Rally is alive with data on first load and Rook can set up your stages, views, and pipeline from one sentence, so you are running real reviews the same day instead of waiting on an implementation.' },
    ],
  },
  {
    slug: 'sales-reps',
    title: 'CRM for Sales Reps',
    role: 'sales reps',
    kw: 'less data entry, next steps, quota',
    md: 'The CRM sales reps actually use: less data entry, a clear next step on every deal, and Rook logging calls and drafting follow-ups so you sell more.',
    intro:
      'Reps do not want a CRM, they want to close. Every field they fill in for the manager is a minute not spent selling. The right CRM earns its keep by doing the admin, not creating more of it.',
    shortAnswer:
      'A sales rep works a personal book of deals: prospecting, running discovery and demos, sending proposals, and closing to hit quota. The CRM they need cuts data entry to near zero, shows the next action on every deal, and drafts the follow-up automatically, so time goes to selling instead of updating fields for the manager.',
    vp: [
      { i: 'zap', h: 'Near-zero data entry', b: 'Rook logs calls, updates stages from your notes, and captures activity automatically, so your pipeline stays current without you living in the CRM after every meeting.' },
      { i: 'target', h: 'A clear next step on every deal', b: 'Every open deal shows its next action and when it is due, so you always know who to call next instead of scrolling a stale list.' },
      { i: 'sparkles', h: 'Follow-ups drafted for you', b: 'Rook writes the recap email, the proposal follow-up, and the check-in based on what actually happened on the call, ready for you to send in one click.' },
      { i: 'rocket', h: 'Your day, prioritized', b: 'A today view puts the deals closest to closing and the tasks past due at the top, so you work the highest-impact accounts first.' },
      { i: 'chart', h: 'Know where you stand', b: 'See attainment, open pipeline, and gap to quota live, so you know exactly how much you need to close and by when.' },
    ],
    sec: [
      { h: 'A CRM that does the admin, not adds it', body: 'The reason reps hate CRMs is the tax: log the call, update the stage, write the recap, set the next task. Rally hands that to Rook. You have the conversation, Rook captures it, updates the deal, and drafts the next touch. Your manager gets clean data and you get your afternoon back.' },
      { h: 'Never lose a deal to a dropped follow-up', body: 'Deals die from silence, not from losses. Rally puts a next step on every open opportunity and nudges you when one goes cold, and Rook can run the whole re-engagement sequence for accounts that stalled, so nothing slips through while you focus on the deals in front of you.' },
    ],
    faqs: [
      { q: 'Will I have to spend time on data entry?', a: 'No. Rally is built to remove data entry. Rook logs calls, updates deal stages from your notes, and drafts follow-ups, so your pipeline stays current without you manually filling in fields after every meeting.' },
      { q: 'How does Rally help me hit quota?', a: 'It keeps a clear next step on every deal, prioritizes your day around the opportunities closest to closing, and shows your live gap to quota, so you spend time on the deals that move your number.' },
      { q: 'Does it work on my phone between meetings?', a: 'Yes. Rally runs in the browser on any device, so you can check your next steps, log a quick note, or fire off a Rook-drafted follow-up from your phone right after a meeting.' },
    ],
  },
  {
    slug: 'account-executives',
    title: 'CRM for Account Executives',
    role: 'account executives',
    kw: 'deal management, buying committee, quotes',
    md: 'The CRM for account executives: a deep deal object with the buying committee, competitors, and quotes, plus Rook drafting every follow-up.',
    intro:
      'An AE closes complex deals with multiple stakeholders, real competition, and a proposal at the end. A thin contact-and-note CRM cannot hold that. The right one models the deal the way the AE actually runs it.',
    shortAnswer:
      'An account executive owns full-cycle deals from qualified opportunity to signature, managing multi-stakeholder buying committees, running demos, handling objections, and building quotes. The CRM they need carries a deep deal object with the buying committee, competitors, and line items, plus an operator that drafts follow-ups and keeps the deal moving between conversations.',
    vp: [
      { i: 'building', h: 'Map the whole buying committee', b: 'Track every stakeholder, their role, and their stance in one deal, so you can tell if you are single-threaded on a champion who could leave at any moment.' },
      { i: 'target', h: 'A deal object with real depth', b: 'Line items, competitors, close plan, and next step live on the opportunity, so the full picture of a complex deal is one screen, not five tools.' },
      { i: 'sparkles', h: 'Rook drafts every touch', b: 'Recap emails, mutual action plans, and stakeholder-specific follow-ups get written from your call notes, so momentum never stalls waiting on you to type.' },
      { i: 'workflow', h: 'Quotes without leaving the deal', b: 'Build a quote from line items right on the opportunity, so pricing, approvals, and the proposal live where the deal does instead of a separate CPQ tool.' },
      { i: 'zap', h: 'Nothing goes cold', b: 'Rally flags deals with no next step or a slipping close date, and Rook can re-engage a stalled stakeholder, so no deal dies from silence.' },
    ],
    sec: [
      { h: 'Model the deal the way you sell it', body: 'Complex deals have a committee, a competitor, a close plan, and a price. Rally puts all of it on the opportunity: who is involved and where they stand, what you are up against, the line items and quote, and the next step to advance. You stop stitching the picture together from your inbox and a spreadsheet.' },
      { h: 'Multi-thread before it costs you the deal', body: 'The fastest way to lose a deal is to bet it all on one champion. Rally shows your coverage across the buying committee and flags when you are single-threaded, and Rook can draft the intro to widen the deal. You see the risk while there is still time to fix it.' },
    ],
    faqs: [
      { q: 'Can Rally handle complex multi-stakeholder deals?', a: 'Yes. The deal object carries the full buying committee with roles and stances, competitors, line items, and a close plan, so a complex enterprise deal lives on one record instead of scattered across tools.' },
      { q: 'Do I need a separate tool to build quotes?', a: 'No. Rally builds quotes from line items directly on the opportunity, so pricing and the proposal live with the deal. There is no separate CPQ product to buy or context to lose.' },
      { q: 'How does Rally keep my deals moving?', a: 'It flags any deal missing a next step or with a slipping close date, and Rook drafts follow-ups and can re-engage stalled stakeholders, so deals keep advancing between your live conversations.' },
    ],
  },
  {
    slug: 'sdrs-and-bdrs',
    title: 'CRM for SDRs and BDRs',
    role: 'SDRs and BDRs',
    kw: 'sequences, prospecting, meetings booked',
    md: 'The CRM for SDRs and BDRs: built-in sequences, a prioritized prospecting queue, and Rook drafting personalized outreach so you book more meetings.',
    intro:
      'An SDR or BDR lives at the top of the funnel: high volume, fast tempo, one metric that matters, meetings booked. The right CRM is a prospecting machine, not a system of record you update after the fact.',
    shortAnswer:
      'SDRs and BDRs prospect at volume to book qualified meetings for AEs, running email and call sequences, researching accounts, and handling objections fast. The CRM they need has built-in sequences, a prioritized outreach queue, and an operator that drafts personalized first touches, so they hit activity targets and book more meetings.',
    vp: [
      { i: 'workflow', h: 'Sequences built in', b: 'Multi-step email and call cadences run inside Rally, so you do not bolt on a separate outreach tool that never syncs cleanly back to the CRM.' },
      { i: 'target', h: 'A prioritized queue', b: 'Your day loads as a ranked list of who to contact next based on engagement and stage, so you dial and send instead of deciding who to work.' },
      { i: 'sparkles', h: 'Rook personalizes the first touch', b: 'The operator drafts opener emails using real account context, so your outreach reads researched instead of blasted, without you writing every one from scratch.' },
      { i: 'chart', h: 'See what actually books meetings', b: 'Track replies, meetings booked, and conversion by sequence and step, so you double down on the messaging that works and cut what does not.' },
      { i: 'rocket', h: 'Clean handoff to the AE', b: 'When a meeting is booked, the account, contacts, and context convert into an opportunity in one step, so the AE picks up warm instead of cold.' },
    ],
    sec: [
      { h: 'A day that runs itself', body: 'Rally loads your prospecting queue ranked by who is most likely to respond, runs your sequences automatically, and lets Rook draft personalized openers from account context. You spend the day in conversations and sends, not deciding who to work next or copying data between an outreach tool and the CRM.' },
      { h: 'Prove your pipeline contribution', body: 'SDRs get judged on meetings booked and pipeline sourced. Rally ties every booked meeting and converted opportunity back to your outreach, so your contribution to pipeline is visible in the same numbers leadership forecasts on. No more fighting to get credit for the deals you started.' },
    ],
    faqs: [
      { q: 'Does Rally have sequences built in?', a: 'Yes. Multi-step email and call cadences run natively inside Rally, so you do not need a separate outreach tool. Everything you send and every reply syncs to the contact and account automatically.' },
      { q: 'Can it personalize my outreach?', a: 'Yes. Rook drafts personalized first-touch emails using real account context, so your messages read researched rather than mass-blasted, and you send more quality outreach in the same amount of time.' },
      { q: 'How does the handoff to an AE work?', a: 'When you book a meeting, Rally converts the account, contacts, and context into an opportunity in one step, so the AE inherits the full history and picks up the conversation warm instead of starting over.' },
    ],
  },
  {
    slug: 'vp-of-sales',
    title: 'CRM for a VP of Sales',
    role: 'a VP of sales',
    kw: 'forecast accuracy, pipeline coverage, team performance',
    md: 'The CRM for a VP of Sales: a defensible forecast, live pipeline coverage, and team performance by rep and segment, ready to present without exports.',
    intro:
      'A VP of Sales answers to the board for the number and to the team for how they hit it. The right CRM gives one source of truth for the forecast and the leverage points, so every review starts from agreed facts.',
    shortAnswer:
      'A VP of Sales owns the revenue number across multiple teams, presenting the forecast to leadership, managing pipeline coverage, and driving performance through frontline managers. The CRM they need gives an accurate rolled-up forecast, live coverage and conversion metrics, and rep-level and segment-level performance without waiting on an ops team to build a deck.',
    vp: [
      { i: 'chart', h: 'A forecast you can defend', b: 'Rally rolls commit, best case, and pipeline from live deal data across every team, so the number you present to the board is traceable to the deals behind it.' },
      { i: 'target', h: 'Coverage before it is a problem', b: 'See pipeline coverage by team and segment against quota, so you spot a thin quarter early enough to do something about it rather than explain it later.' },
      { i: 'users', h: 'Performance by rep and team', b: 'Win rate, sales cycle, and attainment roll up by rep, manager, and segment, so you know which teams to reinforce and which motions to scale.' },
      { i: 'zap', h: 'Rook watches the whole book', b: 'The operator surfaces slipping deals and coverage gaps across the org, so risk reaches you as a signal, not as a quarter-end miss.' },
      { i: 'building', h: 'One source of truth', b: 'Reps, managers, and leadership all read the same live data, so board decks and pipeline reviews start from agreed facts instead of dueling spreadsheets.' },
    ],
    sec: [
      { h: 'Walk into the board meeting with a number you trust', body: 'Rally builds the forecast from the deals your reps update daily, rolled through managers into a single commit, best case, and pipeline view. Because it is live, the number is the same one your teams see, so you present with confidence and can drill from the board-level total straight into the deals behind it if anyone asks.' },
      { h: 'Find the leverage across the org', body: 'Growth comes from fixing the one thing that moves the most revenue. Rally breaks win rate, conversion, and cycle time down by team, segment, and motion, so you can see whether the gap is coverage, close rate, or ramp, and invest where the return is largest instead of pushing every lever at once.' },
    ],
    faqs: [
      { q: 'How accurate is the forecast in Rally?', a: 'The forecast is built from live deal amounts, stages, and close dates rolled through your managers, weighted and totaled automatically. Because it updates as deals move, it reflects current reality rather than a snapshot someone assembled last week.' },
      { q: 'Can I see performance across multiple teams?', a: 'Yes. Win rate, attainment, sales cycle, and coverage roll up by rep, manager, segment, and motion, so you can compare teams, find the leverage point, and decide where to invest for the biggest revenue return.' },
      { q: 'Do I need an ops team to build reports?', a: 'No. Rally is alive with data on first load and its dashboards update live, so you can present the forecast and drill into the deals behind it without waiting on someone to build a deck each week.' },
    ],
  },
  {
    slug: 'cro',
    title: 'CRM for a CRO',
    role: 'a CRO',
    kw: 'revenue forecast, GTM efficiency, board reporting',
    md: 'The CRM for a CRO: a full-funnel revenue forecast, GTM efficiency metrics across sales, marketing, and CS, and board-ready reporting on day one.',
    intro:
      'A CRO owns the whole revenue engine, not just sales. New business, expansion, and retention all roll up to them. The right CRM connects the full funnel so the number the board sees reflects every motion.',
    shortAnswer:
      'A CRO owns revenue end to end across sales, marketing, and customer success, answering to the board for growth and efficiency. The CRM they need unifies the full funnel into one forecast, exposes GTM efficiency metrics like CAC payback and net revenue retention, and produces board-ready reporting without a stitched-together stack.',
    vp: [
      { i: 'chart', h: 'A full-funnel forecast', b: 'New business, expansion, and renewals roll into one revenue view, so the number you own reflects every motion, not just net-new sales.' },
      { i: 'target', h: 'GTM efficiency, visible', b: 'Track pipeline coverage, win rate, cycle time, and retention together, so you can reason about growth and efficiency from the same source of truth.' },
      { i: 'building', h: 'Sales, marketing, and CS in one system', b: 'Leads, deals, and accounts share one data model, so the handoffs between functions are traceable instead of lost between disconnected tools.' },
      { i: 'zap', h: 'Rook runs the reporting', b: 'The operator assembles the recurring board and leadership views from live data, so you spend your time on decisions, not on chasing numbers before every meeting.' },
      { i: 'shield', h: 'Governed and auditable', b: 'RBAC and a full audit log mean you can grant the right access and prove who changed what, which matters when revenue reporting feeds the board.' },
    ],
    sec: [
      { h: 'One revenue engine, one system', body: 'When sales, marketing, and CS run on separate tools, the CRO spends the quarter reconciling them. Rally puts leads, deals, accounts, and expansion in one data model, so the full funnel is traceable end to end. You can see how marketing-sourced pipeline converts, how new logos expand, and where revenue leaks, all from one place.' },
      { h: 'Board reporting that is always ready', body: 'Rally is alive with data on first load and Rook keeps the recurring leadership views current, so the board deck is a screenshot away rather than a fire drill. When the board asks how a segment is trending, you drill in live instead of promising a follow-up, and the audit log backs every number.' },
    ],
    faqs: [
      { q: 'Does Rally cover more than sales?', a: 'Yes. Rally unifies sales, marketing, and customer success on one data model, so leads, deals, accounts, and expansion roll into a single revenue view. The full funnel is traceable rather than split across disconnected tools.' },
      { q: 'What efficiency metrics can I track?', a: 'Pipeline coverage, win rate, sales cycle, conversion by source, and retention all live in the same system, so you can reason about growth and GTM efficiency together instead of exporting from three tools to compare.' },
      { q: 'Is Rally ready for board-level reporting?', a: 'Yes. Dashboards are live on first load, Rook keeps recurring leadership views current, and a full audit log plus role-based access mean the numbers you present to the board are governed and traceable.' },
    ],
  },
  {
    slug: 'revops-managers',
    title: 'CRM for RevOps Managers',
    role: 'RevOps managers',
    kw: 'clean data, automation, reporting',
    md: 'The CRM for RevOps managers: clean data by default, visual automation without scripts, and live reporting, so you engineer revenue instead of firefighting.',
    intro:
      'RevOps carries the weight of the stack: data hygiene, process, automation, and the reports everyone argues over. The right CRM removes the busywork so RevOps can design the revenue engine instead of babysitting it.',
    shortAnswer:
      'A RevOps manager owns the systems and process behind revenue: data hygiene, pipeline definitions, automation, territory and quota setup, and the reporting the whole org relies on. The CRM they need keeps data clean by default, offers visual automation without code, and produces trustworthy live reports, so RevOps engineers growth instead of firefighting.',
    vp: [
      { i: 'shield', h: 'Clean data by default', b: 'Rook keeps records deduplicated, stages accurate, and next steps present, so data hygiene is a background process rather than a quarterly cleanup project.' },
      { i: 'workflow', h: 'Automation without scripts', b: 'Build routing, alerts, and stage rules visually, so you ship process changes in an afternoon instead of filing a ticket and waiting on an admin.' },
      { i: 'chart', h: 'Reports the org trusts', b: 'Live dashboards read from one data model, so sales, marketing, and finance argue about strategy instead of about whose numbers are right.' },
      { i: 'target', h: 'Territories and quotas, managed', b: 'Set ownership, territories, and quota targets in the same system the forecast rolls from, so assignment and attainment stay consistent.' },
      { i: 'plug', h: 'One platform, fewer seams', b: 'Leads, deals, sequences, quotes, and reporting live in one system, so you maintain one source of truth instead of syncing five tools that drift.' },
    ],
    sec: [
      { h: 'Stop firefighting data hygiene', body: 'Most RevOps time disappears into cleanup: duplicates, missing next steps, deals in the wrong stage. Rally keeps data clean as work happens, with Rook deduplicating, updating stages from activity, and flagging incomplete records. The base data stays trustworthy, so the reports built on it are trustworthy too, and you get your quarter back.' },
      { h: 'Ship process changes without a ticket queue', body: 'When routing or a stage definition needs to change, RevOps should not wait on an admin backlog. Rally lets you build routing rules, alerts, and automation visually, test them, and roll them out the same day. Process becomes something you iterate on quickly rather than a change request that takes a sprint.' },
    ],
    faqs: [
      { q: 'How does Rally keep data clean?', a: 'Rook maintains hygiene as work happens: deduplicating records, updating deal stages from activity, and flagging opportunities missing a next step. Clean base data means the reports and forecast built on it stay trustworthy without a quarterly cleanup.' },
      { q: 'Can I build automation without code?', a: 'Yes. Rally offers visual automation for routing, alerts, and stage rules, so you can ship a process change in an afternoon instead of filing a ticket and waiting on an admin or a developer.' },
      { q: 'Will everyone report from the same numbers?', a: 'Yes. Rally runs sales, marketing, and reporting on one data model with live dashboards, so every function reads the same figures. Teams debate strategy instead of arguing about whose export is correct.' },
    ],
  },
  {
    slug: 'sales-operations',
    title: 'CRM for Sales Operations',
    role: 'sales operations',
    kw: 'process, territory management, sales analytics',
    md: 'The CRM for sales operations: enforceable process, territory and quota management, and live sales analytics, all in one governed platform.',
    intro:
      'Sales ops keeps the machine running: process, territories, comp inputs, and the analytics leadership acts on. The right CRM makes process enforceable and analytics live, so ops sets the rules instead of chasing exceptions.',
    shortAnswer:
      'Sales operations designs and enforces the selling process: stage definitions, territories, quotas, approvals, and the analytics behind decisions. The CRM they need enforces process with required fields and stage gates, manages territories and assignment, and delivers live analytics, so ops runs a consistent, measurable motion instead of policing spreadsheets.',
    vp: [
      { i: 'workflow', h: 'Enforceable process', b: 'Required fields, stage exit criteria, and approval steps keep the pipeline consistent, so your analytics are built on data that actually follows the process.' },
      { i: 'target', h: 'Territory and assignment', b: 'Define territories and routing rules so new accounts and leads land with the right owner automatically, without manual reassignment every week.' },
      { i: 'chart', h: 'Live sales analytics', b: 'Conversion, velocity, and attainment update as deals move, so leadership acts on current numbers rather than a report that was true last Monday.' },
      { i: 'zap', h: 'Rook handles the exceptions', b: 'The operator flags deals that break process and records that are incomplete, so you manage by exception instead of auditing the whole pipeline by hand.' },
      { i: 'shield', h: 'Governed access', b: 'Role-based permissions and an audit log let you control who can change what and prove it later, which matters when data feeds comp and the forecast.' },
    ],
    sec: [
      { h: 'Make the process stick', body: 'A process only helps if reps follow it. Rally enforces stage exit criteria, required fields, and approvals, so the pipeline reflects the motion you designed. When something breaks the rules, Rook flags it rather than letting a bad record quietly poison the forecast. You manage the exceptions instead of re-teaching the process every quarter.' },
      { h: 'Analytics leadership can act on', body: 'Sales ops is judged on whether leadership can trust the numbers. Rally computes conversion, sales velocity, and attainment live from clean data, broken down by segment, team, and motion. Because the analytics read from the same governed source the forecast rolls from, the answer to any question is one drill-down away, not a new report build.' },
    ],
    faqs: [
      { q: 'Can Rally enforce our sales process?', a: 'Yes. You can require fields, set stage exit criteria, and add approval steps, so the pipeline follows the motion you designed. Rook flags records that break the rules so you manage by exception instead of auditing everything by hand.' },
      { q: 'How does territory management work?', a: 'You define territories and routing rules, and Rally assigns new leads and accounts to the right owner automatically. That keeps ownership consistent and removes the weekly manual reassignment work from ops.' },
      { q: 'Are the analytics real-time?', a: 'Yes. Conversion, velocity, and attainment update live as deals move, broken down by segment, team, and motion, so leadership acts on current numbers instead of a report that was accurate several days ago.' },
    ],
  },
  {
    slug: 'account-managers',
    title: 'CRM for Account Managers',
    role: 'account managers',
    kw: 'renewals, expansion, account health',
    md: 'The CRM for account managers: renewal tracking, expansion pipeline, and account health in one view, with Rook nudging you before a renewal slips.',
    intro:
      'Account managers grow and keep the accounts sales won. Their number is retention plus expansion, and it hides in relationships and renewal dates a new-logo CRM never surfaces. The right CRM puts the book front and center.',
    shortAnswer:
      'An account manager owns a book of existing customers, driving renewals and expansion while keeping accounts healthy. The CRM they need tracks renewal dates, surfaces expansion opportunities, and shows account health at a glance, with an operator that flags at-risk renewals early so revenue is retained and grown, not lost to a missed date.',
    vp: [
      { i: 'target', h: 'Renewals never surprise you', b: 'Every account carries its renewal date and status, and Rook nudges you well before it lands, so you protect recurring revenue instead of scrambling at the last minute.' },
      { i: 'rocket', h: 'Expansion pipeline', b: 'Track upsell and cross-sell opportunities as real deals on the account, so growth in your book is forecastable, not a happy accident.' },
      { i: 'chart', h: 'Account health at a glance', b: 'See engagement, open issues, and usage signals per account, so you know which relationships need attention before they turn into churn risk.' },
      { i: 'building', h: 'The whole relationship on one record', b: 'Contacts, history, renewals, and expansion live on the account, so a quarterly business review is one screen instead of a scramble across tools.' },
      { i: 'sparkles', h: 'Rook preps your outreach', b: 'The operator drafts check-ins, renewal reminders, and QBR follow-ups from account context, so staying proactive across a large book is realistic.' },
    ],
    sec: [
      { h: 'Protect the revenue you already earned', body: 'It is cheaper to keep a customer than to win a new one, but renewals slip when nobody is watching the date. Rally puts renewal timing and status on every account and has Rook flag the ones at risk early, so you engage before the window closes. Retention becomes a managed motion instead of a scramble.' },
      { h: 'Grow the book, not just hold it', body: 'Expansion is where account managers make their number. Rally tracks upsell and cross-sell as real opportunities on the account with amounts and stages, so growth is a forecastable pipeline you work deliberately. Combined with health signals, you can tell which accounts are ready to expand and which need shoring up first.' },
    ],
    faqs: [
      { q: 'How does Rally help with renewals?', a: 'Every account carries its renewal date and status, and Rook flags at-risk renewals early, so you engage before the window closes. Recurring revenue becomes a managed motion instead of something you scramble to save at the last minute.' },
      { q: 'Can I track expansion opportunities?', a: 'Yes. Upsell and cross-sell live as real opportunities on the account with amounts and stages, so growth in your book is a forecastable pipeline you work deliberately rather than a happy accident you notice after the fact.' },
      { q: 'How do I keep track of account health?', a: 'Rally shows engagement, open issues, and usage signals per account, so you can spot which relationships need attention before they become churn risk and prioritize your outreach across a large book of business.' },
    ],
  },
  {
    slug: 'customer-success-managers',
    title: 'CRM for Customer Success Managers',
    role: 'customer success managers',
    kw: 'onboarding, health scores, churn prevention',
    md: 'The CRM for customer success managers: onboarding tracking, account health scores, and churn signals, with Rook flagging at-risk accounts early.',
    intro:
      'A CSM keeps customers successful so they renew and grow. Their work is proactive: onboarding, adoption, and catching risk before it becomes churn. The right CRM turns a book of accounts into a prioritized, health-scored queue.',
    shortAnswer:
      'A customer success manager drives adoption and retention across a portfolio of accounts, running onboarding, monitoring health, and preventing churn. The CRM they need tracks onboarding milestones, scores account health, and surfaces churn signals, with an operator that flags at-risk accounts early so the CSM intervenes before a customer decides to leave.',
    vp: [
      { i: 'workflow', h: 'Onboarding that stays on track', b: 'Track onboarding milestones per account, so you know which new customers are stuck and at risk of never reaching value, the moment it happens.' },
      { i: 'chart', h: 'Health scores you can act on', b: 'See engagement, adoption, and open issues rolled into a health view, so you prioritize the accounts that need you across a large portfolio.' },
      { i: 'shield', h: 'Catch churn before it happens', b: 'Rook surfaces the early signals of a slipping account, so you intervene while the relationship is still recoverable instead of reacting to a cancellation.' },
      { i: 'target', h: 'Renewals and expansion in view', b: 'Renewal dates and growth opportunities live on the account, so success work connects directly to the revenue outcomes leadership measures.' },
      { i: 'sparkles', h: 'Rook drafts the outreach', b: 'Check-ins, milestone nudges, and QBR recaps get drafted from account context, so proactive success is realistic even across a big book.' },
    ],
    sec: [
      { h: 'Turn a portfolio into a prioritized queue', body: 'A CSM cannot give every account equal attention, so the question is always which account needs you now. Rally rolls engagement, adoption, and open issues into a health view and has Rook flag the accounts trending down, so your day starts with the right list. You spend your attention where it changes the retention outcome.' },
      { h: 'Connect success work to revenue', body: 'Success is judged on retention and expansion, not activity. Rally keeps renewal dates and expansion opportunities on the same account record as your health and onboarding data, so the work you do is visibly tied to the number. When a renewal is at risk or an account is ready to grow, you and leadership see it in the same place.' },
    ],
    faqs: [
      { q: 'Can Rally track onboarding?', a: 'Yes. You can track onboarding milestones per account, so you immediately see which new customers are stuck and at risk of never reaching value, and can step in before a slow start turns into an early churn.' },
      { q: 'How does Rally help prevent churn?', a: 'Rally rolls engagement, adoption, and open issues into an account health view, and Rook surfaces early warning signals, so you intervene while a slipping account is still recoverable rather than reacting once the customer has decided to leave.' },
      { q: 'Does it connect success to revenue?', a: 'Yes. Renewal dates and expansion opportunities live on the same account record as health and onboarding data, so your success work ties directly to the retention and growth numbers leadership measures.' },
    ],
  },
  {
    slug: 'founders',
    title: 'CRM for Founders',
    role: 'founders',
    kw: 'founder-led sales, pipeline, no admin',
    md: 'The CRM for founders: run founder-led sales without the admin. Rook logs calls and drafts follow-ups so you keep selling while building the company.',
    intro:
      'In the early days the founder is the best salesperson and has the least time. The right CRM is not a system to feed, it is leverage: it does the admin so the founder can keep closing while running everything else.',
    shortAnswer:
      'A founder often runs sales personally in the early days, closing the first customers while building product, hiring, and raising. The CRM they need takes zero setup, stays out of the way, and does the admin: an operator that logs calls, drafts follow-ups, and keeps pipeline current, so the founder sells without babysitting a system.',
    vp: [
      { i: 'rocket', h: 'Alive on day one', b: 'Rally works from first load with no long setup, so you start tracking deals in minutes instead of spending a week configuring a system you may outgrow.' },
      { i: 'zap', h: 'Rook does the admin', b: 'Calls get logged, stages update from your notes, and follow-ups get drafted, so founder-led sales does not mean another job feeding a CRM at night.' },
      { i: 'target', h: 'Pipeline you can see', b: 'A clear view of every open deal and its next step means you always know where revenue stands, even when sales is one of five hats you wear.' },
      { i: 'chart', h: 'Numbers for the board', b: 'Pipeline, conversion, and forecast are ready to show investors without building a deck, so board prep is a screenshot rather than a late night.' },
      { i: 'sparkles', h: 'Grows into a team', b: 'When you hire your first reps, the process and history are already in place, so handing off sales is a transition, not a rebuild.' },
    ],
    sec: [
      { h: 'Leverage, not another system to feed', body: 'A founder does not have time to maintain a CRM, so most early-stage sales lives in a founder\'s head and inbox until it breaks. Rally flips the deal: Rook logs the calls, updates the pipeline, and drafts the follow-ups, so the system serves you. You get clean pipeline and never miss a follow-up without spending a single evening on data entry.' },
      { h: 'Set up the company to scale sales later', body: 'The messy part of hiring your first salesperson is that the pipeline lives nowhere they can inherit. Because Rally captures your founder-led selling from the start, the accounts, history, and process are already there when you hire. Your first rep ramps on real context, and you hand off a working motion instead of a shoebox of notes.' },
    ],
    faqs: [
      { q: 'Is Rally overkill for a founder still doing sales solo?', a: 'No. Rally is alive on day one with no heavy setup, and Rook does the admin, so it acts as leverage rather than overhead. You get clean pipeline and reliable follow-up without it becoming another job to maintain.' },
      { q: 'Will it help when I hire my first rep?', a: 'Yes. Because Rally captures your founder-led selling from the start, the accounts, history, and process are already in place, so your first rep ramps on real context and you hand off a working motion instead of a pile of notes.' },
      { q: 'Can I show pipeline to investors?', a: 'Yes. Pipeline, conversion, and forecast are live on first load, so board and investor updates are a screenshot away instead of a deck you build the night before the meeting.' },
    ],
  },
  {
    slug: 'startup-founders',
    title: 'CRM for Startup Founders',
    role: 'startup founders',
    kw: 'early-stage sales, fundraising pipeline, speed',
    md: 'The CRM for startup founders: track customer and investor pipeline in one place, move fast, and let Rook handle the admin so you focus on traction.',
    intro:
      'Startup founders run two pipelines at once: customers and investors. Both are relationship-driven and easy to drop when everything is on fire. The right CRM keeps both moving so nothing critical falls through the cracks.',
    shortAnswer:
      'A startup founder chases traction and often fundraising at the same time, working a customer pipeline and an investor pipeline in parallel. The CRM they need is fast to start, flexible enough to track both, and does the admin automatically, so the founder keeps every important relationship warm without a full-time ops function they do not have.',
    vp: [
      { i: 'rocket', h: 'Start in minutes', b: 'No implementation project. Rally is alive on first load, so an early-stage team gets value the same day instead of committing weeks to setup.' },
      { i: 'target', h: 'Track customers and investors', b: 'Model both pipelines in one flexible system, so your fundraise and your sales motion do not live in two different spreadsheets you forget to update.' },
      { i: 'zap', h: 'Rook keeps it warm', b: 'The operator drafts follow-ups and flags relationships going cold, so no key customer or investor slips while you are heads-down building.' },
      { i: 'chart', h: 'Traction on tap', b: 'Pipeline and conversion are ready to show investors and advisors without building a deck, so proving momentum is fast when a meeting comes up.' },
      { i: 'sparkles', h: 'One clean price', b: 'A single price with every module means you are not choosing which features you can afford while runway is tight.' },
    ],
    sec: [
      { h: 'Two pipelines, one system', body: 'Early-stage founders juggle customer deals and investor conversations, and both die from neglect. Rally lets you track them side by side with stages, next steps, and Rook-drafted follow-ups, so a hot investor lead gets the same discipline as a hot customer. Nothing important goes cold because it lived only in your head.' },
      { h: 'Built for speed, not process for its own sake', body: 'Startups cannot afford a CRM rollout. Rally is alive on first load, Rook removes the data entry, and there is one clean price, so the tool matches the pace of the company. You get real pipeline discipline without the overhead of a system designed for a hundred-rep org you are not yet.' },
    ],
    faqs: [
      { q: 'Can I track fundraising in Rally too?', a: 'Yes. Rally is flexible enough to run an investor pipeline alongside your customer pipeline, with stages, next steps, and Rook-drafted follow-ups, so both critical relationships stay warm from one system instead of two neglected spreadsheets.' },
      { q: 'Is it too heavy for an early-stage startup?', a: 'No. Rally is alive on day one with no rollout, Rook removes data entry, and there is one clean price, so it matches a startup\'s pace. You get pipeline discipline without the overhead of enterprise software.' },
      { q: 'How quickly can we get going?', a: 'Minutes. Rally loads with data and Rook can set up your stages and views from a single sentence, so an early team is tracking real pipeline the same day rather than committing to weeks of configuration.' },
    ],
  },
  {
    slug: 'small-business-owners',
    title: 'CRM for Small Business Owners',
    role: 'small business owners',
    kw: 'simple CRM, follow-ups, one price',
    md: 'The CRM for small business owners: simple, affordable, and it does the follow-up for you. One clean price, alive in minutes, no IT department needed.',
    intro:
      'A small business owner wears every hat and has no ops team. Most CRMs are built for sales orgs they are not. The right one is simple, affordable, and does the follow-up work an owner never has time for.',
    shortAnswer:
      'A small business owner runs sales alongside operations, service, and finance, with no dedicated sales team or admin. The CRM they need is simple to run, affordable at one clear price, and proactive: it tracks leads and customers, reminds them to follow up, and drafts the outreach, so relationships are never dropped in a busy week.',
    vp: [
      { i: 'rocket', h: 'Simple enough to actually use', b: 'Rally is alive on first load with no setup project, so you get value the same day instead of buying software that sits unused because it was too complex.' },
      { i: 'zap', h: 'It does the follow-up', b: 'Rook reminds you who to call and drafts the message, so leads and past customers stay warm even in your busiest weeks when follow-up usually slips.' },
      { i: 'sparkles', h: 'One clear price', b: 'Every feature at a single price means no surprise add-ons or upsells, so budgeting the tool is simple and predictable.' },
      { i: 'target', h: 'Every lead in one place', b: 'Leads from your site, calls, and referrals land in one list with a next step, so nothing lives in sticky notes and a shared inbox anymore.' },
      { i: 'users', h: 'No IT required', b: 'Rally runs in the browser with nothing to install or maintain, so you do not need a technical person to keep it working.' },
    ],
    sec: [
      { h: 'Built for an owner, not a sales floor', body: 'Most CRMs assume a full sales team and an admin to run them. A small business owner has neither. Rally is simple to start, does the busywork through Rook, and priced at one clear number, so it fits a business where the owner is also the salesperson, the service team, and the bookkeeper. It helps without becoming another thing to manage.' },
      { h: 'Never drop a customer again', body: 'The revenue a small business loses is usually a quote never followed up on or a past customer never contacted again. Rally keeps every lead and customer in one list with a next step, and Rook reminds you and drafts the outreach. Follow-up stops depending on whether you remembered, so more of the business you almost won actually closes.' },
    ],
    faqs: [
      { q: 'Is Rally too complicated for a small business?', a: 'No. Rally is alive on first load with no setup project and runs in the browser, so there is nothing to install or maintain. It is built to be simple enough that an owner without an ops team gets value the same day.' },
      { q: 'How much does it cost?', a: 'Rally is one clean price with every feature included, so there are no surprise add-ons or tiers to decode. That makes budgeting predictable, which matters when you are watching every expense in a small business.' },
      { q: 'Will it actually help me follow up?', a: 'Yes. Rook reminds you who to contact and drafts the message, so leads and past customers stay warm even in your busiest weeks. Follow-up stops depending on whether you happened to remember.' },
    ],
  },
  {
    slug: 'solopreneurs',
    title: 'CRM for Solopreneurs',
    role: 'solopreneurs',
    kw: 'one-person business, pipeline, automation',
    md: 'The CRM for solopreneurs: run your whole pipeline solo and let Rook handle the admin. One price, alive in minutes, built for a team of one.',
    intro:
      'A solopreneur is the whole company: sales, delivery, and admin. There is no one to delegate follow-up to. The right CRM becomes that teammate, doing the busywork so a one-person business runs like it has help.',
    shortAnswer:
      'A solopreneur runs an entire business alone, from finding clients to delivering the work to invoicing. The CRM they need acts like a teammate: it tracks the pipeline, remembers every follow-up, and drafts outreach through an operator, so a one-person business keeps deals moving without the admin swallowing the day.',
    vp: [
      { i: 'zap', h: 'Rook is your admin', b: 'The operator logs activity, reminds you to follow up, and drafts messages, so the one person running everything is not also buried in data entry.' },
      { i: 'target', h: 'Your whole pipeline in one view', b: 'Every prospect and client sits in one list with a clear next step, so nothing is lost between your inbox, notes, and memory.' },
      { i: 'rocket', h: 'Zero setup', b: 'Rally is alive on first load, so you spend your limited time on clients and delivery, not on configuring software.' },
      { i: 'sparkles', h: 'One simple price', b: 'Every feature at one price means the tool fits a solo budget without you decoding tiers or paying for a sales-team plan you do not need.' },
      { i: 'workflow', h: 'Sell and deliver in one place', b: 'Track deals through to projects and follow-through, so the handoff from won client to delivered work does not fall through the cracks.' },
    ],
    sec: [
      { h: 'The teammate you cannot hire yet', body: 'The hard part of running solo is that there is no one to hand the admin to. Rally makes Rook that teammate: it captures your activity, keeps the pipeline current, and drafts the follow-ups you would otherwise forget. Your one-person business runs with the discipline of a team, and you keep your time for the work only you can do.' },
      { h: 'From lead to paid, in one place', body: 'A solopreneur loses money in the seams: a lead never followed up, a won project never kicked off, an invoice forgotten. Rally keeps the whole arc in one system, from prospect to deal to project, so the handoffs happen even though you are the only one holding them. Fewer things slip, more of the work turns into revenue.' },
    ],
    faqs: [
      { q: 'Is a CRM worth it for a business of one?', a: 'Yes, when it acts as a teammate instead of a chore. Rally has Rook capture activity, track pipeline, and draft follow-ups, so a solo operator keeps deals moving with team-level discipline without the admin swallowing the day.' },
      { q: 'How much time will it take to set up?', a: 'Almost none. Rally is alive on first load and Rook can configure your stages and views from one sentence, so you spend your limited time on clients and delivery rather than on software setup.' },
      { q: 'Does it fit a solo budget?', a: 'Yes. Rally is one clean price with every feature included, so you are not paying for a large sales-team plan or decoding tiers. The tool matches a one-person business without hidden add-ons.' },
    ],
  },
  {
    slug: 'freelancers',
    title: 'CRM for Freelancers',
    role: 'freelancers',
    kw: 'client pipeline, proposals, follow-ups',
    md: 'The CRM for freelancers: track leads, send proposals, and never drop a follow-up. Rook does the admin so you spend time on billable work.',
    intro:
      'For a freelancer, every hour on admin is an unbilled hour. Feast-or-famine cycles come from letting the pipeline go quiet while heads-down on delivery. The right CRM keeps the next gig warm without stealing billable time.',
    shortAnswer:
      'A freelancer sells and delivers at once, chasing new clients while finishing current work, then feeling the gap when a project ends. The CRM they need keeps a lightweight client pipeline, tracks proposals, and reminds them to follow up, with an operator that drafts outreach, so the pipeline never goes quiet during a busy delivery stretch.',
    vp: [
      { i: 'target', h: 'A pipeline that never goes quiet', b: 'Track leads and prospects with next steps, so you keep the funnel warm while delivering, and avoid the dry spell when a project wraps.' },
      { i: 'sparkles', h: 'Proposals and follow-through', b: 'Send proposals and let Rook chase the ones that go silent, so you win more of the work you quoted instead of losing it to your inbox.' },
      { i: 'zap', h: 'Admin off your plate', b: 'Rook logs conversations and drafts follow-ups, so the hours you would spend on client admin stay billable or yours.' },
      { i: 'rocket', h: 'Nothing to set up', b: 'Rally is alive on first load, so you are not spending a weekend configuring a tool when you could be earning or resting.' },
      { i: 'workflow', h: 'Repeat clients stay close', b: 'Keep past clients and their history in one place, so re-engaging the people most likely to hire you again is a quick, drafted message.' },
    ],
    sec: [
      { h: 'Break the feast-or-famine cycle', body: 'Freelance income swings because the pipeline dies whenever delivery gets busy. Rally keeps prospects and follow-ups in one place with Rook nudging you and drafting outreach, so a little pipeline hygiene continues even in your busiest weeks. The next project is already in motion when the current one ends, and the dry spells shrink.' },
      { h: 'Keep every hour you can billable', body: 'A freelancer\'s time is the product, so admin is pure cost. Rally has Rook handle the follow-up drafting, activity logging, and proposal chasing, so the work that used to eat your evenings happens in the background. You protect billable hours and still run a disciplined pipeline, which is usually a trade freelancers cannot make.' },
    ],
    faqs: [
      { q: 'Do I really need a CRM as a freelancer?', a: 'If your income swings when delivery gets busy, yes. Rally keeps your pipeline warm and follow-ups on track through Rook, so the next project is already moving when the current one ends and the dry spells shrink.' },
      { q: 'Can it help me send and chase proposals?', a: 'Yes. You can track proposals and have Rook follow up on the ones that go silent, so you win more of the work you quoted instead of losing it because a busy week swallowed the follow-up.' },
      { q: 'Will it eat into my billable time?', a: 'No, the opposite. Rook handles activity logging, follow-up drafting, and proposal chasing in the background, so the admin that usually costs you billable hours largely takes care of itself.' },
    ],
  },
  {
    slug: 'consultants',
    title: 'CRM for Consultants',
    role: 'consultants',
    kw: 'relationship tracking, proposals, referrals',
    md: 'The CRM for consultants: nurture long relationships, track proposals, and mine referrals. Rook keeps every high-value contact warm for you.',
    intro:
      'Consulting sales run on trust built over long cycles, and the next engagement often comes from a relationship that has been quiet for months. The right CRM keeps that whole network warm so opportunities do not depend on memory.',
    shortAnswer:
      'A consultant sells expertise through long, relationship-driven cycles where referrals and past clients drive most new work. The CRM they need tracks relationships over time, manages proposals, and surfaces dormant contacts worth re-engaging, with an operator that drafts thoughtful outreach, so a network stays warm and referrals turn into engagements.',
    vp: [
      { i: 'building', h: 'Relationships over the long cycle', b: 'Keep the full history of every contact and client in one place, so a conversation that started two years ago picks up with context instead of a cold restart.' },
      { i: 'sparkles', h: 'Proposals that close', b: 'Track proposals and let Rook follow up on the ones gone quiet, so high-value engagements do not stall in a decision-maker\'s inbox.' },
      { i: 'users', h: 'Mine your referral network', b: 'See who has referred work and who has gone dormant, so you can deliberately re-engage the relationships most likely to send the next engagement.' },
      { i: 'zap', h: 'Rook keeps the network warm', b: 'The operator drafts periodic check-ins from real context, so staying top of mind across a large network is realistic instead of aspirational.' },
      { i: 'target', h: 'Know what is actually in play', b: 'A clear pipeline of live opportunities means you can see your book of business and forecast, even with long, lumpy consulting sales cycles.' },
    ],
    sec: [
      { h: 'Your network is the pipeline', body: 'For consultants, the next engagement usually comes from someone you already know. Rally keeps every relationship, its history, and its referral trail in one place, so you can see who to re-engage rather than relying on memory. Rook drafts the check-in, so staying present across a large network becomes a habit instead of a thing you meant to do.' },
      { h: 'Move proposals across long cycles', body: 'Consulting deals take time and involve senior stakeholders who go quiet. Rally tracks each proposal with its next step and has Rook follow up when a decision stalls, so a promising engagement does not quietly die in an inbox. You keep long cycles moving without nagging, and you always know what is genuinely in play.' },
    ],
    faqs: [
      { q: 'How does Rally help consultants specifically?', a: 'Consulting runs on long relationships and referrals. Rally keeps every contact\'s full history and referral trail in one place and has Rook draft check-ins, so your network stays warm and dormant relationships worth re-engaging surface instead of being forgotten.' },
      { q: 'Can it handle long, slow sales cycles?', a: 'Yes. Rally tracks each proposal and opportunity with a next step, and Rook follows up when senior stakeholders go quiet, so long cycles keep moving without nagging and you always know what is genuinely in play.' },
      { q: 'Does it help me get more referrals?', a: 'Rally shows who has referred work and who has gone dormant, so you can deliberately re-engage the relationships most likely to send your next engagement rather than hoping referrals arrive on their own.' },
    ],
  },
  {
    slug: 'financial-advisors',
    title: 'CRM for Financial Advisors',
    role: 'financial advisors',
    kw: 'client relationships, review cadence, referrals',
    md: 'The CRM for financial advisors: keep client relationships on a review cadence, track referrals, and let Rook draft timely, personal outreach.',
    intro:
      'A financial advisor grows a book by deepening trust over decades. The work is a steady cadence of reviews, life-event touches, and referrals. The right CRM makes that cadence reliable across hundreds of client households.',
    shortAnswer:
      'A financial advisor manages a book of client households, running periodic reviews, responding to life events, and growing through referrals and trust built over years. The CRM they need keeps a review cadence per client, tracks referral sources, and drafts timely personal outreach through an operator, so no relationship is neglected across a large book.',
    vp: [
      { i: 'target', h: 'A reliable review cadence', b: 'Track when each client is due for a review, so the annual and quarterly touches that build trust happen on schedule instead of slipping across a large book.' },
      { i: 'building', h: 'The whole household in view', b: 'Keep every contact, relationship, and interaction on the client record, so you walk into a review with full context rather than scrambling to remember.' },
      { i: 'users', h: 'Track referral sources', b: 'See which clients and centers of influence refer business, so you can nurture the relationships that actually grow your book.' },
      { i: 'sparkles', h: 'Rook drafts personal outreach', b: 'Timely, context-aware check-ins get drafted for you, so staying personally present with hundreds of clients is realistic.' },
      { i: 'shield', h: 'Governed and auditable', b: 'Role-based access and a full activity log mean client interactions are tracked and controlled, which matters in a regulated practice.' },
    ],
    sec: [
      { h: 'Never let a client relationship go cold', body: 'Trust erodes when a client does not hear from their advisor. Rally keeps a review cadence on every household and has Rook draft the outreach, so scheduled reviews and timely check-ins happen consistently across the whole book. The relationships that make referrals and consolidate assets get the attention they earn, not just the loudest clients.' },
      { h: 'Grow the book through relationships you already have', body: 'Most new advisory business comes from referrals and deeper relationships, not cold prospecting. Rally tracks who refers and surfaces households ready for a deeper conversation, so growth is deliberate. Combined with clean records and an audit trail, you run a practice that grows through trust while staying organized and compliant.' },
    ],
    faqs: [
      { q: 'How does Rally help a financial advisor?', a: 'It keeps a review cadence on every client household, tracks referral sources, and has Rook draft timely personal outreach, so no relationship is neglected across a large book and the reviews that build trust happen on schedule.' },
      { q: 'Can it handle a large book of clients?', a: 'Yes. Rally keeps full context on every household and has Rook draft context-aware check-ins, so staying personally present with hundreds of clients becomes realistic rather than something that slips as the book grows.' },
      { q: 'Is it suitable for a regulated practice?', a: 'Rally provides role-based access and a full activity log, so client interactions are tracked and controlled. That governance matters in a regulated advisory practice where you need to show who did what and when.' },
    ],
  },
  {
    slug: 'insurance-agents',
    title: 'CRM for Insurance Agents',
    role: 'insurance agents',
    kw: 'policy renewals, quotes, cross-sell',
    md: 'The CRM for insurance agents: track policy renewals, follow up on quotes, and spot cross-sell. Rook keeps every client and renewal on schedule.',
    intro:
      'An insurance agent grows by keeping policies renewed and finding the next coverage a client needs. Both hide in dates and details across a big book. The right CRM surfaces renewals and cross-sell before they slip.',
    shortAnswer:
      'An insurance agent manages a book of policyholders, chasing new quotes, keeping renewals on track, and cross-selling additional coverage. The CRM they need tracks renewal dates, follows up on open quotes, and surfaces cross-sell opportunities, with an operator that keeps outreach on schedule, so retention stays high and every client is fully covered.',
    vp: [
      { i: 'target', h: 'Renewals never slip', b: 'Every policy carries its renewal date, and Rook reminds you ahead of time, so you retain business instead of losing clients to a lapsed renewal you did not catch.' },
      { i: 'sparkles', h: 'Chase every quote', b: 'Track open quotes and let Rook follow up on the ones gone quiet, so more of the prospects you quoted actually bind a policy.' },
      { i: 'rocket', h: 'Spot the cross-sell', b: 'See which clients have gaps in coverage, so you can offer the next policy proactively instead of leaving revenue and clients exposed.' },
      { i: 'building', h: 'The whole client in one place', b: 'Policies, contacts, and history live on the client record, so servicing a call or a claim is one screen instead of digging through files.' },
      { i: 'zap', h: 'Rook keeps outreach on schedule', b: 'Renewal reminders, quote follow-ups, and check-ins get drafted and timed, so a large book stays serviced without you tracking every date.' },
    ],
    sec: [
      { h: 'Retention is the whole game', body: 'An insurance book grows only if it does not leak. Rally puts every renewal date on the client and has Rook remind you before it lands, so lapses become rare. The steady base of retained policies is what compounds, and Rally makes keeping it a scheduled routine rather than a scramble whenever a renewal notice happens to catch your eye.' },
      { h: 'Cover the client fully', body: 'Most agents leave coverage, and revenue, on the table because they cannot see the gaps across a big book. Rally surfaces which clients are underinsured or missing a policy type, so cross-sell becomes deliberate. You serve the client better by closing their coverage gaps, and each policy you add deepens the relationship and the retention.' },
    ],
    faqs: [
      { q: 'How does Rally handle policy renewals?', a: 'Every policy carries its renewal date, and Rook reminds you ahead of time, so renewals are worked on schedule. Lapses from a missed date become rare, which protects the retained base that makes an insurance book compound.' },
      { q: 'Can it help me cross-sell?', a: 'Yes. Rally surfaces which clients have coverage gaps or are missing a policy type, so you can offer the next policy proactively. Cross-sell becomes deliberate rather than something you notice by chance.' },
      { q: 'Does it help me follow up on quotes?', a: 'Yes. Rally tracks open quotes and Rook follows up on the ones that go quiet, so more of the prospects you quoted actually bind a policy instead of drifting away in an inbox.' },
    ],
  },
  {
    slug: 'real-estate-agents',
    title: 'CRM for Real Estate Agents',
    role: 'real estate agents',
    kw: 'lead follow-up, listings, past clients',
    md: 'The CRM for real estate agents: fast lead follow-up, listing and buyer pipelines, and past-client nurture. Rook drafts outreach so no lead goes cold.',
    intro:
      'In real estate, speed to a new lead and staying top of mind with past clients decide who wins. Both slip when an agent is showing homes all day. The right CRM makes fast follow-up and long nurture automatic.',
    shortAnswer:
      'A real estate agent works buyer and seller leads that go cold in minutes, while nurturing past clients and their referral network for repeat business. The CRM they need enables instant lead follow-up, separate buyer and listing pipelines, and long-term nurture, with an operator that drafts outreach, so no lead is lost and past clients keep referring.',
    vp: [
      { i: 'zap', h: 'Follow up before the lead cools', b: 'Rook can respond to a new lead in the moment and draft the next touch, so you win the deals that go to whoever calls first, even while you are showing a home.' },
      { i: 'target', h: 'Buyer and listing pipelines', b: 'Track buyers and listings as separate pipelines with their own stages, so each side of the business has a clear next step instead of one messy list.' },
      { i: 'users', h: 'Past clients keep referring', b: 'Keep every past client on a nurture cadence, so the anniversary note and check-in that drive referrals actually happen year after year.' },
      { i: 'sparkles', h: 'Rook writes the outreach', b: 'New-lead responses, showing follow-ups, and past-client check-ins get drafted from context, so you stay responsive without living on your phone.' },
      { i: 'rocket', h: 'Works from your phone', b: 'Everything runs in the browser on any device, so you can update a deal or fire off a follow-up between showings.' },
    ],
    sec: [
      { h: 'Speed wins the lead', body: 'Online real estate leads go to whoever responds first, and an agent in the field cannot always be the one. Rally lets Rook respond in the moment and draft the follow-up, so you compete on speed even when you are at a showing. The leads that used to cool off while you were busy now get a fast, personal first touch.' },
      { h: 'Your past clients are your best pipeline', body: 'Repeat and referral business is the backbone of a real estate career, and it depends on staying top of mind for years. Rally keeps every past client on a nurture cadence with Rook drafting the check-ins, so the relationships quietly compound into referrals. You stop losing future deals just because life got busy and the follow-up slipped.' },
    ],
    faqs: [
      { q: 'How does Rally help me respond to leads faster?', a: 'Rook can respond to a new lead in the moment and draft the next touch, so you compete on speed even while showing homes. Since real estate leads go to whoever calls first, fast follow-up directly wins more deals.' },
      { q: 'Can I keep buyers and listings separate?', a: 'Yes. Rally tracks buyer and listing pipelines separately, each with its own stages and next steps, so both sides of your business stay organized instead of collapsing into one confusing list.' },
      { q: 'Will it help me get repeat and referral business?', a: 'Yes. Rally keeps past clients on a nurture cadence with Rook drafting the check-ins, so the anniversary notes and touches that drive referrals actually happen year after year instead of slipping when you get busy.' },
    ],
  },
  {
    slug: 'recruiters',
    title: 'CRM for Recruiters',
    role: 'recruiters',
    kw: 'candidate pipeline, client roles, follow-ups',
    md: 'The CRM for recruiters: run candidate and client pipelines side by side, keep every role moving, and let Rook draft the follow-ups so nothing stalls.',
    intro:
      'Recruiting is two sales at once: winning client roles and moving candidates through them. Placements stall when either side goes quiet. The right CRM keeps both pipelines moving so fills happen faster.',
    shortAnswer:
      'A recruiter runs two pipelines: winning roles from clients and moving candidates through interview stages to placement. The CRM they need tracks both sides, keeps every open role and candidate on a next step, and drafts the constant follow-ups through an operator, so nothing stalls and time-to-fill drops.',
    vp: [
      { i: 'target', h: 'Two pipelines, side by side', b: 'Track client roles and candidate stages together, so you always see which roles are stuck and which candidates need a next touch.' },
      { i: 'zap', h: 'Follow-ups that never stop', b: 'Rook drafts candidate check-ins, client updates, and interview follow-ups, so the constant communication recruiting demands does not depend on you remembering.' },
      { i: 'building', h: 'The whole relationship on record', b: 'Every candidate and client carries their full history, so you can re-engage a strong candidate for a new role without starting from scratch.' },
      { i: 'chart', h: 'See time-to-fill and bottlenecks', b: 'Track how long roles sit in each stage, so you spot the interview step that is slowing placements and fix it.' },
      { i: 'sparkles', h: 'Rebuild your bench fast', b: 'Past candidates stay searchable and warm, so filling the next role often starts with people you already know instead of a fresh search.' },
    ],
    sec: [
      { h: 'Keep both sides of the desk moving', body: 'Placements die when a client goes quiet on a role or a candidate drifts between interviews. Rally tracks both pipelines with a next step on every role and candidate, and Rook drafts the follow-ups, so neither side stalls. You keep the process moving on volume without letting anyone fall through, which is exactly what shortens time-to-fill.' },
      { h: 'Your past candidates are an asset', body: 'The fastest fill is often someone you have placed or interviewed before. Rally keeps every candidate\'s history searchable and lets Rook re-engage strong past candidates for new roles, so your bench is a live resource. You stop starting each search from zero and start each one from the people who already know you.' },
    ],
    faqs: [
      { q: 'Can Rally track both candidates and clients?', a: 'Yes. Rally runs candidate and client-role pipelines side by side, each with its own stages and next steps, so you always see which roles are stuck and which candidates need a touch, without juggling two systems.' },
      { q: 'How does it help me fill roles faster?', a: 'Rally keeps a next step on every role and candidate and has Rook draft the constant follow-ups, so neither side stalls. It also tracks time in each stage, so you spot and fix the bottleneck slowing placements.' },
      { q: 'Can I reuse past candidates?', a: 'Yes. Every candidate\'s history stays searchable and warm, and Rook can re-engage strong past candidates for new roles, so filling the next role often starts with people you already know instead of a fresh search.' },
    ],
  },
  {
    slug: 'marketing-teams',
    title: 'CRM for Marketing Teams',
    role: 'marketing teams',
    kw: 'lead capture, attribution, campaign ROI',
    md: 'The CRM for marketing teams: capture and score leads, track attribution to closed revenue, and prove campaign ROI from one shared source of truth.',
    intro:
      'Marketing is judged on pipeline and revenue, not clicks, but the proof lives in sales data marketing rarely controls. The right CRM closes that loop so campaigns tie to closed deals and marketing gets credit.',
    shortAnswer:
      'A marketing team generates and qualifies demand, then has to prove it turned into pipeline and revenue. The CRM they need captures and scores leads, ties campaigns to closed deals for attribution, and shares one source of truth with sales, so marketing can measure real ROI and hand sales leads that convert.',
    vp: [
      { i: 'target', h: 'Capture and score leads', b: 'Leads from forms and campaigns land in Rally scored by fit and engagement, so sales works the hottest ones first and marketing sees what quality it is producing.' },
      { i: 'chart', h: 'Attribution to closed revenue', b: 'Tie campaigns and sources to the deals they influenced, so you can prove which programs drive pipeline instead of reporting clicks and MQLs.' },
      { i: 'building', h: 'One source of truth with sales', b: 'Marketing and sales share one data model, so the handoff is clean and both sides argue about strategy, not about whose numbers are right.' },
      { i: 'workflow', h: 'Nurture that runs itself', b: 'Sequences and automation nurture leads until they are sales-ready, so demand does not go cold waiting in a spreadsheet for someone to act on it.' },
      { i: 'sparkles', h: 'Rook enriches and routes', b: 'The operator enriches new leads and routes them to the right owner instantly, so speed-to-lead stays high and no inbound sits unworked.' },
    ],
    sec: [
      { h: 'Close the loop from campaign to revenue', body: 'Marketing loses budget fights because it reports activity while finance asks about revenue. Rally ties campaigns and sources to the deals they influenced all the way to closed won, so you can show which programs actually drive pipeline. The conversation shifts from cost-per-click to revenue, and you defend and grow budget with the sales system\'s own numbers.' },
      { h: 'Hand sales leads that convert', body: 'The oldest friction in go-to-market is marketing passing leads sales will not work. Rally scores leads by fit and engagement, enriches and routes them instantly through Rook, and keeps everything on one shared model, so sales gets prioritized, qualified handoffs. Marketing sees exactly what happens after the handoff, so both teams optimize toward the same closed-revenue number.' },
    ],
    faqs: [
      { q: 'Can Rally prove marketing ROI?', a: 'Yes. Rally ties campaigns and sources to the deals they influenced through to closed won, so you can show which programs drive real pipeline and revenue rather than reporting clicks and MQLs that finance discounts.' },
      { q: 'How does lead handoff to sales work?', a: 'Leads are scored by fit and engagement, enriched and routed instantly by Rook, and shared on one data model with sales. Sales gets prioritized, qualified handoffs, and marketing sees exactly what happens after, so both optimize the same number.' },
      { q: 'Does marketing share data with sales?', a: 'Yes. Rally runs marketing and sales on one source of truth, so the handoff is clean and both teams read the same figures. Debates move from whose numbers are right to what strategy to run next.' },
    ],
  },
  {
    slug: 'business-development',
    title: 'CRM for Business Development',
    role: 'business development teams',
    kw: 'partnerships, new markets, deal sourcing',
    md: 'The CRM for business development: track partnerships, new-market opportunities, and sourced deals through long, complex cycles from one system.',
    intro:
      'Business development chases growth beyond the standard sale: partnerships, new markets, and strategic deals with long cycles and many stakeholders. The right CRM flexes to model relationships that do not fit a simple pipeline.',
    shortAnswer:
      'A business development team pursues growth through partnerships, new markets, and strategic deals, working long cycles with many stakeholders that do not fit a standard sales pipeline. The CRM they need flexibly models these relationships, tracks complex multi-party opportunities, and keeps momentum through an operator, so strategic bets progress instead of stalling.',
    vp: [
      { i: 'building', h: 'Model any kind of deal', b: 'Track partnerships, alliances, and strategic opportunities with their own stages and stakeholders, so complex growth bets fit the system instead of being forced into a sales template.' },
      { i: 'users', h: 'Map every stakeholder', b: 'Strategic deals have many players. Rally captures the full set of stakeholders and their stance, so you see where a multi-party deal actually stands.' },
      { i: 'zap', h: 'Keep long cycles moving', b: 'Rook flags stalled opportunities and drafts follow-ups, so a partnership does not quietly die during the months a strategic deal takes to mature.' },
      { i: 'target', h: 'Prioritize the strategic bets', b: 'See which opportunities are progressing and which are stuck, so you invest your limited BD time in the deals with real momentum.' },
      { i: 'chart', h: 'Report on growth pipeline', b: 'Give leadership a clear view of the partnership and new-market pipeline, so strategic progress is visible alongside core sales.' },
    ],
    sec: [
      { h: 'A system flexible enough for BD', body: 'Business development deals rarely fit a clean sales pipeline: they involve partners, alliances, and multi-party structures with their own milestones. Rally lets you model each type with its own stages and stakeholders, so a partnership and a new-market entry are tracked properly rather than crammed into a template built for transactional selling.' },
      { h: 'Keep strategic bets from stalling', body: 'The risk in BD is that a promising deal goes quiet for months and dies without anyone noticing. Rally keeps a next step on every strategic opportunity and has Rook flag the ones losing momentum and draft the re-engagement, so long cycles keep advancing. Leadership sees the growth pipeline clearly, and the big bets get the follow-through they need.' },
    ],
    faqs: [
      { q: 'Can Rally handle partnership and strategic deals?', a: 'Yes. Rally flexibly models partnerships, alliances, and new-market opportunities with their own stages and stakeholders, so complex multi-party deals are tracked properly instead of being forced into a template built for transactional sales.' },
      { q: 'How does it keep long deals from stalling?', a: 'Rally keeps a next step on every strategic opportunity, and Rook flags the ones losing momentum and drafts re-engagement, so a partnership does not quietly die during the months a strategic deal can take to mature.' },
      { q: 'Can leadership see BD pipeline?', a: 'Yes. Rally gives a clear view of the partnership and new-market pipeline alongside core sales, so leadership can see strategic progress and where BD time is invested without a separate report.' },
    ],
  },
  {
    slug: 'inside-sales-teams',
    title: 'CRM for Inside Sales Teams',
    role: 'inside sales teams',
    kw: 'call volume, sequences, conversion',
    md: 'The CRM for inside sales teams: high-volume calling, built-in sequences, and live conversion metrics, with Rook handling logging and follow-ups.',
    intro:
      'Inside sales runs on tempo: high call and email volume from a desk, measured on conversion. Every second of admin is a lost dial. The right CRM maximizes selling time and makes conversion visible by rep and step.',
    shortAnswer:
      'An inside sales team sells remotely at high volume, running calls and email sequences from a desk and living or dying on conversion. The CRM they need supports fast dialing and native sequences, cuts logging to near zero, and shows conversion by rep and step, so the team maximizes dials and improves the rate that turns activity into revenue.',
    vp: [
      { i: 'workflow', h: 'Sequences built in', b: 'Native email and call cadences run inside Rally, so reps execute a consistent motion without bolting on a separate tool that never syncs cleanly.' },
      { i: 'zap', h: 'Logging handled by Rook', b: 'Calls, outcomes, and next steps get captured automatically, so reps spend their time dialing and talking, not typing up what just happened.' },
      { i: 'target', h: 'A prioritized calling queue', b: 'Each rep\'s day loads as a ranked list of who to work next, so high-volume calling stays focused on the best opportunities.' },
      { i: 'chart', h: 'Conversion by rep and step', b: 'See connect, conversation, and close rates per rep and per sequence step, so managers coach the exact point where deals leak.' },
      { i: 'rocket', h: 'Ramp new reps fast', b: 'A clear process and Rook doing the admin means new reps get productive quickly instead of drowning in tool training.' },
    ],
    sec: [
      { h: 'Maximize selling time', body: 'Inside sales performance is a function of dials times conversion, and admin steals from both. Rally has Rook log calls, capture outcomes, and set next steps automatically, and loads a prioritized queue, so reps stay in the conversation. More of the day goes to selling and less to updating fields, which is the whole game in a volume motion.' },
      { h: 'Coach the number, not the vibe', body: 'You improve inside sales by finding the exact step where conversion drops. Rally shows connect rates, conversation rates, and close rates by rep and by sequence step, so a manager can see whether a rep needs help getting connects or closing conversations. Coaching gets specific, and the fixes show up in the conversion metrics the next week.' },
    ],
    faqs: [
      { q: 'Does Rally support high-volume calling?', a: 'Yes. Rally loads a prioritized calling queue and has Rook log calls, outcomes, and next steps automatically, so reps stay in conversations instead of typing. More of the day goes to dialing, which drives a volume motion.' },
      { q: 'Are sequences included?', a: 'Yes. Native email and call cadences run inside Rally, so your team executes a consistent motion without bolting on a separate outreach tool that fails to sync cleanly back to the CRM.' },
      { q: 'How do managers improve conversion?', a: 'Rally shows connect, conversation, and close rates by rep and by sequence step, so managers coach the exact point where deals leak. Coaching gets specific and the improvements show up in the metrics the following week.' },
    ],
  },
  {
    slug: 'field-sales-teams',
    title: 'CRM for Field Sales Teams',
    role: 'field sales teams',
    kw: 'mobile, territory, visit tracking',
    md: 'The CRM for field sales teams: mobile-first, territory and route planning, and visit logging that takes seconds, with Rook drafting follow-ups on the go.',
    intro:
      'Field sales happens in cars and customer sites, not at a desk. Reps need the CRM in their pocket and managers need coverage across territories. The right CRM works mobile-first and logs a visit in seconds.',
    shortAnswer:
      'A field sales team sells in person across territories, driving to customer sites and meeting face to face. The CRM they need works mobile-first, supports territory and route planning, and lets reps log a visit in seconds, with an operator that drafts follow-ups, so time in the field turns into tracked, followed-up pipeline.',
    vp: [
      { i: 'rocket', h: 'Mobile-first', b: 'Rally runs in the browser on any phone, so a field rep has the full CRM in their pocket instead of a stripped-down app that misses half the data.' },
      { i: 'target', h: 'Territory and route planning', b: 'See accounts by territory and location, so reps plan efficient routes and managers can tell whether a territory is being covered.' },
      { i: 'zap', h: 'Log a visit in seconds', b: 'Rook captures a visit from a quick note or voice memo and drafts the follow-up, so reps update the CRM from the parking lot instead of at 9pm.' },
      { i: 'building', h: 'The account in your hand', b: 'Full history, contacts, and next steps are available on-site, so a rep walks into a meeting prepared instead of guessing what happened last time.' },
      { i: 'chart', h: 'Coverage visibility', b: 'Managers see visit activity and pipeline by territory, so they know which areas are being worked and which accounts are being neglected.' },
    ],
    sec: [
      { h: 'The whole CRM, in the field', body: 'Field reps abandon CRMs that only work at a desk, so the data rots. Rally runs fully in the mobile browser with the complete account history and next steps, and Rook logs the visit and drafts the follow-up from a quick note. Reps update in the moment from the parking lot, so the pipeline stays current and nobody spends their evening catching up.' },
      { h: 'Cover the territory deliberately', body: 'Field sales lives and dies on coverage: are reps visiting the right accounts often enough. Rally maps accounts by territory and location for efficient routing, and gives managers a view of visit activity and pipeline per territory. You can see which areas are worked and which are going quiet, so coverage is a managed number rather than a guess.' },
    ],
    faqs: [
      { q: 'Does Rally work well on mobile?', a: 'Yes. Rally runs fully in the mobile browser with complete account history and next steps, not a stripped-down app. A field rep has the whole CRM in their pocket and can update it in the moment from a customer site.' },
      { q: 'Can reps log visits quickly?', a: 'Yes. Rook captures a visit from a quick note or voice memo and drafts the follow-up, so reps update the CRM in seconds from the parking lot instead of spending their evening catching up on data entry.' },
      { q: 'How do managers track territory coverage?', a: 'Rally maps accounts by territory and location and shows visit activity and pipeline per territory, so managers can see which areas are being worked and which accounts are going neglected, making coverage a managed number.' },
    ],
  },
  {
    slug: 'remote-sales-teams',
    title: 'CRM for Remote Sales Teams',
    role: 'remote sales teams',
    kw: 'distributed teams, visibility, shared context',
    md: 'The CRM for remote sales teams: one live source of truth, full deal visibility for managers, and shared context so a distributed team stays aligned.',
    intro:
      'A remote sales team loses the hallway: the overheard update, the quick desk check-in. The right CRM replaces that with live shared context, so a distributed team coordinates as tightly as one in a room.',
    shortAnswer:
      'A remote sales team works distributed across locations and time zones, without the informal visibility of a shared office. The CRM they need is one live source of truth with full deal visibility for managers and shared context on every account, so a distributed team stays aligned and coordinated without constant status meetings.',
    vp: [
      { i: 'building', h: 'One live source of truth', b: 'Everyone reads the same current data from anywhere, so a distributed team is not making decisions off three different exports and stale spreadsheets.' },
      { i: 'target', h: 'Managers see everything remotely', b: 'Full pipeline and deal visibility means a manager coaches from the data, not from a hallway update they can no longer overhear.' },
      { i: 'users', h: 'Shared context on every account', b: 'Complete history on each deal means anyone can pick up an account across time zones, so coverage does not break when someone is offline.' },
      { i: 'zap', h: 'Rook keeps the team in sync', b: 'The operator flags what needs attention and drafts follow-ups, so alignment does not depend on catching each other in a meeting.' },
      { i: 'chart', h: 'Fewer status meetings', b: 'Live dashboards answer where things stand, so the team replaces status syncs with the work, which matters more when calendars span time zones.' },
    ],
    sec: [
      { h: 'Replace the office with shared context', body: 'In an office, sales coordination happens informally: overheard calls, quick desk check-ins, a manager walking the floor. Remote teams lose all of it. Rally replaces that with one live source of truth where every deal carries full context, so anyone can see where things stand and pick up an account. The team stays coordinated without needing to be in the same room.' },
      { h: 'Manage on data, not presence', body: 'A remote manager cannot read the room, so they have to read the numbers. Rally gives full deal visibility and live dashboards, and Rook surfaces what needs attention, so coaching and forecasting run on real data instead of who happened to mention a deal. The team gets tighter management remotely than most co-located teams get in person.' },
    ],
    faqs: [
      { q: 'How does Rally help a remote sales team stay aligned?', a: 'Rally is one live source of truth where every deal carries full context, so anyone can see where things stand from anywhere. It replaces the informal visibility of an office, keeping a distributed team coordinated without constant status meetings.' },
      { q: 'Can managers coach remotely?', a: 'Yes. Rally gives full pipeline and deal visibility plus live dashboards, and Rook surfaces what needs attention, so a remote manager coaches and forecasts from real data instead of a hallway update they can no longer overhear.' },
      { q: 'Does it work across time zones?', a: 'Yes. Because every account carries complete shared context in one live system, anyone can pick up a deal when a teammate is offline, so coverage and momentum do not break across time zones.' },
    ],
  },
  {
    slug: 'enterprise-sales-teams',
    title: 'CRM for Enterprise Sales Teams',
    role: 'enterprise sales teams',
    kw: 'complex deals, buying committees, governance',
    md: 'The CRM for enterprise sales teams: deep deal objects, buying-committee mapping, and the governance and RBAC large orgs require, alive on day one.',
    intro:
      'Enterprise selling means long cycles, big buying committees, and real governance requirements. A lightweight CRM cannot hold it. The right one models complex deals and enforces the access control large organizations demand.',
    shortAnswer:
      'An enterprise sales team runs long, high-value deals with large buying committees, multiple competitors, and procurement, inside organizations that require governance and access control. The CRM they need carries a deep deal object, maps buying committees, enforces role-based access with a full audit log, and stays alive on day one, so complex deals are managed and governed properly.',
    vp: [
      { i: 'building', h: 'A deal object with real depth', b: 'Line items, competitors, close plans, and the full buying committee live on the opportunity, so a complex enterprise deal is one governed record, not scattered tools.' },
      { i: 'users', h: 'Map the buying committee', b: 'Track every stakeholder, role, and stance, so teams see where they are single-threaded and multi-thread before a champion leaves and the deal dies.' },
      { i: 'shield', h: 'Governance and RBAC', b: 'Role-based access and a full audit log control who sees and changes what and prove it later, which enterprise security and compliance require.' },
      { i: 'workflow', h: 'Process and approvals', b: 'Enforce stage criteria and approval steps on high-value deals, so large deals follow the controls the business needs without slowing the team down.' },
      { i: 'zap', h: 'Rook manages the complexity', b: 'The operator flags single-threaded deals, slipping dates, and missing next steps across a big book, so risk surfaces early on deals worth a lot.' },
    ],
    sec: [
      { h: 'Model the complexity of enterprise deals', body: 'Enterprise deals have committees, competitors, procurement, and close plans, and they fail when that complexity lives in scattered notes. Rally puts it all on one deal object, so the team sees the full picture: who is involved, where they stand, what you are up against, and the plan to close. Rook watches for single-threading and slippage, so the risks on a high-value deal surface while there is time to act.' },
      { h: 'Governance the enterprise requires', body: 'Large organizations cannot run revenue on a tool without access control and an audit trail. Rally ships role-based access, approval steps, and a full audit log, so you grant the right visibility, enforce controls on big deals, and prove who changed what. The team gets enterprise-grade depth and governance while still being alive with data on day one rather than after a year-long rollout.' },
    ],
    faqs: [
      { q: 'Can Rally handle complex enterprise deals?', a: 'Yes. The deal object carries the full buying committee, competitors, line items, and close plan, so a long, multi-stakeholder enterprise deal lives on one governed record. Rook flags single-threading and slippage so risk surfaces early.' },
      { q: 'Does Rally meet enterprise governance needs?', a: 'Yes. Rally provides role-based access control, approval steps on high-value deals, and a full audit log, so you control who sees and changes what and can prove it, meeting the security and compliance requirements large organizations have.' },
      { q: 'How long does enterprise onboarding take?', a: 'Rally is alive with data on day one, so you avoid the year-long rollout enterprise CRMs are known for. You get the depth and governance a large team needs without the implementation project that usually comes with it.' },
    ],
  },
  {
    slug: 'sales-enablement',
    title: 'CRM for Sales Enablement',
    role: 'sales enablement teams',
    kw: 'rep ramp, playbooks, adoption',
    md: 'The CRM for sales enablement: ramp reps faster, embed playbooks in the workflow, and measure adoption against real conversion, all from one system.',
    intro:
      'Sales enablement makes reps productive: onboarding, playbooks, and coaching content. Its impact is invisible unless it connects to real selling data. The right CRM ties enablement to ramp time and conversion.',
    shortAnswer:
      'A sales enablement team ramps new reps, builds playbooks, and drives adoption of the sales process, then has to prove it moved the numbers. The CRM they need makes the process easy to follow, ties activity to conversion, and shows ramp and adoption, so enablement can point to faster ramp and higher win rates, not just training delivered.',
    vp: [
      { i: 'rocket', h: 'Ramp reps faster', b: 'A clear process with Rook doing the admin means new reps get productive quickly, so ramp time drops instead of new hires drowning in tools.' },
      { i: 'workflow', h: 'Playbooks in the workflow', b: 'Embed the winning motion into stages, next steps, and required fields, so the playbook is how the CRM works, not a slide deck nobody opens.' },
      { i: 'chart', h: 'Adoption against real results', b: 'See who follows the process and how it correlates with win rate, so you prove enablement impact with conversion data, not training attendance.' },
      { i: 'target', h: 'Coach with real deal data', b: 'Enablement and managers work from the same live pipeline, so coaching targets the actual deals and stages where reps struggle.' },
      { i: 'sparkles', h: 'Rook reinforces the motion', b: 'The operator drafts the next best step in line with the playbook, so reps get guided execution instead of remembering a training from months ago.' },
    ],
    sec: [
      { h: 'Turn the playbook into the workflow', body: 'Enablement fails when the playbook lives in a deck reps never reopen. Rally embeds the winning motion into stages, exit criteria, and next steps, and has Rook draft the next best action in line with it. The process becomes the way reps work day to day, so adoption is automatic rather than a thing you have to keep re-training into the team.' },
      { h: 'Prove enablement moved the number', body: 'Enablement is chronically underfunded because its impact is hard to see. Rally ties process adoption to real conversion, so you can show that reps following the playbook ramp faster and win more. When you can point to shorter ramp and higher win rates in the same system leadership forecasts on, enablement stops being a cost center and becomes a proven lever.' },
    ],
    faqs: [
      { q: 'How does Rally help ramp new reps?', a: 'Rally gives new reps a clear process with Rook handling the admin and drafting the next best step, so they get productive quickly instead of drowning in tools. That directly shortens ramp time, one of enablement\'s core metrics.' },
      { q: 'Can I embed our playbook in the CRM?', a: 'Yes. You embed the winning motion into stages, exit criteria, and required fields, and Rook reinforces it by drafting the next best action. The playbook becomes how the CRM works rather than a slide deck reps ignore.' },
      { q: 'Can enablement prove its impact?', a: 'Yes. Rally ties process adoption to real conversion, so you can show that reps following the playbook ramp faster and win more, using the same data leadership forecasts on instead of training-attendance numbers.' },
    ],
  },
  {
    slug: 'deal-desk',
    title: 'CRM for Deal Desk Teams',
    role: 'deal desk teams',
    kw: 'quotes, approvals, pricing governance',
    md: 'The CRM for deal desk teams: quotes and CPQ, approval workflows, and pricing governance on the deal, so nonstandard deals move fast and stay controlled.',
    intro:
      'A deal desk keeps nonstandard deals fast and compliant: quoting, discount approvals, and pricing governance. When these live outside the CRM, deals stall. The right CRM puts quotes and approvals right on the opportunity.',
    shortAnswer:
      'A deal desk manages complex and nonstandard deals: building quotes, approving discounts, and enforcing pricing rules so deals close fast without breaking margin or policy. The CRM they need has native quotes and CPQ, approval workflows, and pricing governance on the opportunity, so nonstandard deals move quickly while staying controlled and auditable.',
    vp: [
      { i: 'workflow', h: 'Quotes and CPQ on the deal', b: 'Build quotes from line items right on the opportunity, so pricing and the proposal live with the deal instead of in a disconnected CPQ tool.' },
      { i: 'shield', h: 'Approval workflows', b: 'Route discounts and nonstandard terms through the right approvers automatically, so deals stay compliant without the desk chasing sign-offs by email.' },
      { i: 'target', h: 'Pricing governance', b: 'Enforce pricing and discount rules on the quote, so reps stay within policy and margin is protected without the desk reviewing every line by hand.' },
      { i: 'zap', h: 'Rook moves approvals fast', b: 'The operator flags quotes waiting on approval and drafts the context approvers need, so nonstandard deals do not stall in a queue.' },
      { i: 'chart', h: 'Auditable pricing decisions', b: 'Every quote, discount, and approval is logged, so you can show why a deal was priced the way it was when finance or leadership asks.' },
    ],
    sec: [
      { h: 'Keep nonstandard deals moving', body: 'Deal desks exist because complex deals need pricing and approvals, but those steps are exactly where deals stall. Rally puts quotes and approval workflows on the opportunity and has Rook push waiting approvals forward with the context approvers need. Nonstandard deals get the review they require without sitting for days in an email thread, so speed and control stop being a trade-off.' },
      { h: 'Protect margin without slowing sales', body: 'The desk\'s job is to let sales move fast while keeping pricing sane. Rally enforces discount and pricing rules on the quote and logs every decision, so reps stay in policy automatically and the desk only touches the true exceptions. Margin is protected by the system, and every pricing decision is auditable when finance or leadership asks how a deal got its number.' },
    ],
    faqs: [
      { q: 'Does Rally have native quoting and CPQ?', a: 'Yes. Rally builds quotes from line items directly on the opportunity, so pricing and the proposal live with the deal. There is no separate CPQ tool to sync, which is where nonstandard deals usually lose time.' },
      { q: 'Can it enforce approval workflows?', a: 'Yes. Discounts and nonstandard terms route to the right approvers automatically, and Rook pushes waiting approvals forward with the context approvers need, so deals stay compliant without the desk chasing sign-offs by email.' },
      { q: 'Are pricing decisions auditable?', a: 'Yes. Every quote, discount, and approval is logged, so you can show exactly why a deal was priced the way it was when finance or leadership asks, and pricing governance is enforced by the system rather than by manual review.' },
    ],
  },
  {
    slug: 'revenue-teams',
    title: 'CRM for Revenue Teams',
    role: 'revenue teams',
    kw: 'full funnel, one platform, shared metrics',
    md: 'The CRM for revenue teams: sales, marketing, and CS on one platform with shared metrics, so the whole funnel runs from a single source of truth.',
    intro:
      'A revenue team unifies sales, marketing, and success under one number. That only works if they share one system. The right CRM puts the whole funnel on one platform so every function optimizes the same outcome.',
    shortAnswer:
      'A revenue team aligns sales, marketing, and customer success under one revenue number, owning the full funnel from lead to renewal. The CRM they need is one platform with shared metrics across every function, so handoffs are clean, the funnel is traceable end to end, and everyone optimizes toward the same revenue outcome instead of siloed goals.',
    vp: [
      { i: 'building', h: 'The whole funnel on one platform', b: 'Leads, deals, accounts, and renewals share one data model, so the path from first touch to expansion is traceable instead of split across tools.' },
      { i: 'chart', h: 'Shared metrics, one truth', b: 'Every function reads the same live numbers, so sales, marketing, and CS argue about strategy rather than about whose data is correct.' },
      { i: 'target', h: 'Clean handoffs', b: 'Lead-to-sales and sales-to-CS handoffs happen inside one system with full context, so nothing is lost in the seams between teams.' },
      { i: 'zap', h: 'Rook runs across the funnel', b: 'The operator works leads, deals, and accounts alike, so busywork is handled at every stage and the team focuses on revenue.' },
      { i: 'workflow', h: 'Automate across functions', b: 'Build workflows that span marketing, sales, and success, so a lead flows to a deal to a renewal without manual re-entry between silos.' },
    ],
    sec: [
      { h: 'One funnel, one source of truth', body: 'A revenue team is only as aligned as its data. When marketing, sales, and CS run on separate tools, the funnel breaks at every handoff and nobody agrees on the numbers. Rally puts leads, deals, accounts, and renewals on one model, so the full funnel is traceable and every function reads the same live truth. Alignment becomes structural rather than a quarterly reconciliation exercise.' },
      { h: 'Optimize the same outcome', body: 'The point of a revenue team is that everyone owns revenue, not a siloed metric. Rally gives shared dashboards and workflows that span functions, and Rook runs work across leads, deals, and accounts, so the team operates as one engine. When marketing sees what closes and CS sees what expands in the same system, the whole funnel optimizes toward revenue together.' },
    ],
    faqs: [
      { q: 'What makes Rally good for a revenue team?', a: 'Rally puts sales, marketing, and customer success on one data model with shared live metrics, so the full funnel from lead to renewal is traceable and every function reads the same truth. Alignment is structural, not a quarterly reconciliation.' },
      { q: 'How does Rally keep handoffs clean?', a: 'Lead-to-sales and sales-to-CS handoffs happen inside one system with full context carried on the record, and workflows span functions, so nothing is lost in the seams between teams and no data is re-entered between silos.' },
      { q: 'Does everyone see the same numbers?', a: 'Yes. Every function reads the same live dashboards from one source of truth, so sales, marketing, and CS optimize toward the same revenue outcome and debate strategy instead of arguing about whose data is right.' },
    ],
  },
  {
    slug: 'growth-teams',
    title: 'CRM for Growth Teams',
    role: 'growth teams',
    kw: 'experiments, funnel data, conversion',
    md: 'The CRM for growth teams: clean full-funnel data, fast conversion analytics, and automation to run experiments and scale what works.',
    intro:
      'Growth teams run experiments across the funnel and scale what converts. That needs clean data and fast iteration. The right CRM gives trustworthy funnel numbers and automation flexible enough to test and roll out quickly.',
    shortAnswer:
      'A growth team runs experiments across acquisition, activation, and conversion, then scales what works. The CRM they need provides clean full-funnel data, fast conversion analytics to read experiments, and no-code automation to ship and scale changes, so growth can iterate quickly on trustworthy numbers instead of waiting on engineering.',
    vp: [
      { i: 'chart', h: 'Trustworthy funnel data', b: 'Conversion is computed live from real lead and deal data, so you read experiments on numbers you trust instead of a stale export.' },
      { i: 'workflow', h: 'Ship experiments without code', b: 'Build routing, triggers, and automation visually, so growth tests and rolls out changes in an afternoon rather than waiting in an engineering queue.' },
      { i: 'target', h: 'Find the leverage point', b: 'Break conversion down by source, segment, and step, so you focus experiments on the stage where a win moves the most revenue.' },
      { i: 'zap', h: 'Rook scales what works', b: 'Once an experiment wins, the operator can run the motion at volume, so scaling a success does not create a pile of manual work.' },
      { i: 'rocket', h: 'Iterate fast', b: 'Live data and quick automation mean the loop from idea to test to result is short, which is the whole advantage a growth team is after.' },
    ],
    sec: [
      { h: 'Read experiments on clean data', body: 'Growth experiments are only as good as the data you measure them on. Rally computes conversion live across the funnel from real records, broken down by source, segment, and step, so you can tell a real lift from noise. You spend your time interpreting results and choosing the next test, not cleaning data or wondering whether the numbers are trustworthy.' },
      { h: 'Test and scale without an engineering queue', body: 'The bottleneck for most growth teams is waiting on engineering to ship a change. Rally lets you build routing, triggers, and automation visually, so you test an idea the same day and, when it wins, have Rook run it at volume. The iteration loop stays short and the winners scale without turning into a mountain of manual work.' },
    ],
    faqs: [
      { q: 'Is Rally good for running growth experiments?', a: 'Yes. Rally gives clean full-funnel data with live conversion by source, segment, and step, so you read experiments on trustworthy numbers, plus no-code automation to ship tests fast. The iterate loop stays short.' },
      { q: 'Do I need engineering to change automation?', a: 'No. Rally lets you build routing, triggers, and automation visually, so a growth team ships and rolls back experiments in an afternoon instead of waiting in an engineering queue for every change.' },
      { q: 'How does Rally help scale a winning experiment?', a: 'Once an experiment wins, Rook can run the motion at volume, so scaling a success does not create a pile of manual work. You move from validated idea to scaled program without a rebuild.' },
    ],
  },
  {
    slug: 'partnerships-teams',
    title: 'CRM for Partnerships Teams',
    role: 'partnerships teams',
    kw: 'partner pipeline, co-sell, sourced revenue',
    md: 'The CRM for partnerships teams: track partners, manage co-sell pipeline, and attribute partner-sourced revenue, all in the same system as direct sales.',
    intro:
      'Partnerships build revenue through others: partners who refer, co-sell, and resell. The work is relationship-heavy and easy to leave uncredited. The right CRM tracks partner pipeline and proves the revenue it sources.',
    shortAnswer:
      'A partnerships team drives revenue through partners who refer, co-sell, and resell, managing partner relationships and joint pipeline. The CRM they need tracks partners and their sourced and influenced deals, manages co-sell in the same system as direct sales, and attributes partner revenue, so the program\'s contribution is visible and partners stay engaged.',
    vp: [
      { i: 'users', h: 'Track partners and relationships', b: 'Keep every partner, contact, and interaction in one place, so relationship-driven partner work has the same discipline as a sales pipeline.' },
      { i: 'target', h: 'Co-sell pipeline', b: 'Manage partner-sourced and co-sell deals alongside direct pipeline, so joint opportunities get worked and forecast instead of living in a partner\'s inbox.' },
      { i: 'chart', h: 'Attribute partner revenue', b: 'Tie deals to the partners that sourced or influenced them, so you can prove the program\'s revenue contribution and defend its budget.' },
      { i: 'zap', h: 'Rook keeps partners engaged', b: 'The operator drafts partner check-ins and follow-ups, so a large partner ecosystem stays warm without manual effort on every relationship.' },
      { i: 'building', h: 'One system with direct sales', b: 'Partner deals live in the same platform as direct deals, so co-sell coordination between partner and sales teams is clean instead of cross-tool.' },
    ],
    sec: [
      { h: 'Give partner pipeline real discipline', body: 'Partner-sourced deals often live in a partner manager\'s inbox and never make it into the forecast. Rally tracks partners, their contacts, and their sourced and co-sell deals in the same system as direct sales, so joint pipeline is worked and forecast properly. Rook keeps the partner ecosystem warm with drafted check-ins, so relationships stay active across a large program.' },
      { h: 'Prove the program pays for itself', body: 'Partnerships budgets get cut when the revenue is invisible. Rally attributes deals to the partners that sourced or influenced them, so you can show exactly how much pipeline and revenue the program drives. When partner contribution shows up in the same numbers leadership forecasts on, the program is defensible and the case to invest more is easy to make.' },
    ],
    faqs: [
      { q: 'Can Rally track partner-sourced deals?', a: 'Yes. Rally ties deals to the partners that sourced or influenced them and manages co-sell pipeline alongside direct sales, so partner contribution is worked, forecast, and attributed rather than lost in a partner manager\'s inbox.' },
      { q: 'How does Rally help manage co-sell?', a: 'Partner and direct deals live in the same system, so co-sell coordination between partner and sales teams is clean instead of cross-tool. Both sides see the same opportunity with full context and a shared next step.' },
      { q: 'Can I prove partnership revenue?', a: 'Yes. Rally attributes pipeline and revenue to the partners behind it, so the program\'s contribution shows up in the same numbers leadership forecasts on, making the budget defensible and the case for more investment easy.' },
    ],
  },
  {
    slug: 'channel-sales',
    title: 'CRM for Channel Sales',
    role: 'channel sales teams',
    kw: 'partner deals, deal registration, reseller pipeline',
    md: 'The CRM for channel sales: manage reseller pipeline, deal registration, and partner performance, so indirect revenue is tracked as tightly as direct.',
    intro:
      'Channel sales run revenue through resellers and partners, which means deal registration, partner enablement, and pipeline you do not directly control. The right CRM tracks indirect deals and partner performance with real rigor.',
    shortAnswer:
      'A channel sales team sells through resellers and partners, managing deal registration, partner-submitted pipeline, and channel performance. The CRM they need tracks partner deals and registrations, gives visibility into indirect pipeline you do not run directly, and measures partner performance, so channel revenue is managed and forecast as tightly as direct sales.',
    vp: [
      { i: 'target', h: 'Deal registration', b: 'Track registered partner deals with clear ownership, so channel conflict is avoided and partners trust that their sourced deals are protected.' },
      { i: 'chart', h: 'Indirect pipeline visibility', b: 'See partner-submitted pipeline rolled into your forecast, so revenue you do not sell directly is still managed and predictable.' },
      { i: 'users', h: 'Measure partner performance', b: 'Track which partners register, close, and grow, so you invest enablement and attention in the channel relationships that actually produce.' },
      { i: 'zap', h: 'Rook keeps the channel active', b: 'The operator drafts partner follow-ups and flags stalled registered deals, so a broad partner network stays engaged without manual effort per partner.' },
      { i: 'building', h: 'Channel and direct in one view', b: 'Indirect and direct pipeline live in the same system, so leadership sees total revenue and where each motion contributes.' },
    ],
    sec: [
      { h: 'Manage revenue you do not sell directly', body: 'The hard part of channel is that the deals happen through partners, so visibility and control are weak. Rally tracks deal registration, partner-submitted pipeline, and channel performance in one system, so indirect revenue is forecast and managed like direct sales. You can see which registered deals are moving and step in through the partner when one stalls, instead of finding out at quarter end.' },
      { h: 'Invest in the partners who produce', body: 'A channel program spreads thin if you treat every partner the same. Rally measures which partners register, close, and grow, so you can focus enablement and co-selling on the relationships that drive revenue. Rook keeps the broader network warm with drafted follow-ups, so you scale the channel without needing a manager for every partner.' },
    ],
    faqs: [
      { q: 'Does Rally support deal registration?', a: 'Yes. Rally tracks registered partner deals with clear ownership, so channel conflict is avoided and partners trust that their sourced deals are protected, which is essential to keeping a channel program healthy.' },
      { q: 'Can I forecast indirect pipeline?', a: 'Yes. Partner-submitted pipeline rolls into your forecast alongside direct sales, so revenue you do not sell directly is still managed and predictable, and leadership sees total revenue across both motions in one view.' },
      { q: 'How do I know which partners perform?', a: 'Rally measures which partners register, close, and grow, so you invest enablement and co-selling in the relationships that actually produce revenue rather than spreading attention evenly across the whole network.' },
    ],
  },
  {
    slug: 'small-teams',
    title: 'CRM for Small Teams',
    role: 'small teams',
    kw: 'shared pipeline, no admin, one price',
    md: 'The CRM for small teams: shared pipeline everyone can see, zero admin overhead, and one price. Alive in minutes, no dedicated ops person required.',
    intro:
      'A small team cannot spare anyone to administer a CRM, yet still needs shared visibility so nothing is dropped. The right CRM gives that shared pipeline while doing the admin itself, so a lean team punches above its weight.',
    shortAnswer:
      'A small team shares a book of deals without a dedicated ops person to run the CRM. The CRM they need gives shared pipeline visibility, requires almost no administration, and costs one clear price, with an operator that handles the busywork, so a lean team stays coordinated and productive without hiring someone to manage the tool.',
    vp: [
      { i: 'users', h: 'Shared pipeline everyone sees', b: 'The whole team reads the same live pipeline, so coverage does not break when someone is out and deals do not get dropped between people.' },
      { i: 'zap', h: 'No admin overhead', b: 'Rook handles logging and follow-up drafting, so a small team gets clean data without anyone spending their week administering the CRM.' },
      { i: 'rocket', h: 'Alive in minutes', b: 'Rally works on first load with no rollout, so a lean team gets value the same day rather than committing time it does not have to setup.' },
      { i: 'sparkles', h: 'One clear price', b: 'Every feature at a single price means a small team gets the full platform without decoding tiers or paying enterprise rates.' },
      { i: 'target', h: 'Punch above your weight', b: 'With Rook doing the busywork, a small team runs the disciplined pipeline and follow-up usually only larger, staffed teams manage.' },
    ],
    sec: [
      { h: 'Shared visibility without an admin', body: 'A small team needs everyone to see the same pipeline, but cannot spare a person to keep the CRM clean. Rally solves both: one shared live pipeline the whole team reads, and Rook doing the logging and follow-up so the data stays current on its own. Coverage holds when someone is out, and no one has to become the accidental CRM administrator.' },
      { h: 'The full platform at a lean price', body: 'Small teams often settle for a stripped-down tool because the real ones are priced for big orgs. Rally is one clean price with every module included, alive on day one, so a lean team gets forecasting, sequences, and automation without an enterprise budget or rollout. You get the capabilities of a much larger operation without the overhead that usually comes with them.' },
    ],
    faqs: [
      { q: 'Do we need someone to administer Rally?', a: 'No. Rook handles logging and follow-up drafting, so a small team gets clean, shared pipeline data without anyone spending their week administering the CRM. There is no dedicated ops role required to keep it running.' },
      { q: 'How much does Rally cost for a small team?', a: 'Rally is one clear price with every feature included, so a small team gets the full platform without decoding tiers or paying enterprise rates. Budgeting is simple and predictable.' },
      { q: 'How fast can a small team get started?', a: 'Minutes. Rally is alive on first load with no rollout, and Rook can set up your pipeline from a sentence, so a lean team gets value the same day instead of committing time it does not have to a setup project.' },
    ],
  },
  {
    slug: '5-person-sales-team',
    title: 'CRM for a 5-Person Sales Team',
    role: 'a 5-person sales team',
    kw: 'shared pipeline, coaching, quota tracking',
    md: 'The CRM for a 5-person sales team: shared pipeline, simple coaching signals, and quota tracking, alive in minutes with no ops person to run it.',
    intro:
      'A five-person sales team is big enough to need coordination and coaching, small enough that no one is spare to run the system. The right CRM gives shared pipeline, forecast, and coaching signals without any overhead.',
    shortAnswer:
      'A five-person sales team needs shared pipeline visibility, a simple forecast, and light coaching, but has no ops person to run a CRM. The CRM they need gives one shared pipeline, rolls a forecast, surfaces coaching signals, and tracks quota, with an operator doing the admin, so a small team coordinates and improves without overhead.',
    vp: [
      { i: 'users', h: 'One pipeline the team shares', b: 'All five reps and the manager read the same live pipeline, so deals do not fall between people and coverage holds when someone is out.' },
      { i: 'chart', h: 'A forecast that just rolls up', b: 'Rally totals a bottoms-up forecast from the team\'s deals, so the manager has a real number without building a spreadsheet each week.' },
      { i: 'target', h: 'Coaching signals for five reps', b: 'Win rate and stalled deals per rep are easy to see, so a player-coach manager knows who needs help without a heavy reporting setup.' },
      { i: 'zap', h: 'Rook does the admin for everyone', b: 'Logging and follow-ups are handled across the team, so five reps sell instead of updating fields and the manager still gets clean data.' },
      { i: 'rocket', h: 'Running the same day', b: 'Alive on first load with one price, so a small team is running real pipeline immediately instead of committing to a rollout.' },
    ],
    sec: [
      { h: 'Coordinate five reps without overhead', body: 'At five people, a sales team needs shared visibility so deals do not get dropped, but no one can be spared to run a CRM. Rally gives one shared pipeline everyone reads and has Rook keep it current, so the team coordinates cleanly and the player-coach manager sees the whole board without a spreadsheet or a dedicated admin.' },
      { h: 'Forecast and coach at small-team scale', body: 'A five-person team still owns a number and still has reps who need coaching. Rally rolls a real forecast from the team\'s deals and surfaces win rate and stalled deals per rep, so the manager can commit a number and coach the right person. You get the forecasting and coaching of a larger operation sized and priced for a small team.' },
    ],
    faqs: [
      { q: 'Is Rally right-sized for a 5-person team?', a: 'Yes. Rally gives one shared pipeline, a bottoms-up forecast, and per-rep coaching signals, with Rook doing the admin, so a five-person team coordinates and improves without needing an ops person or an enterprise rollout.' },
      { q: 'Can our manager forecast and coach easily?', a: 'Yes. Rally rolls a forecast from the team\'s deals automatically and surfaces win rate and stalled deals per rep, so a player-coach manager commits a real number and knows who needs help without building reports by hand.' },
      { q: 'How quickly can five reps get going?', a: 'The same day. Rally is alive on first load with one clean price, and Rook can set up your pipeline from a sentence, so the team is running real pipeline immediately instead of committing to a setup project.' },
    ],
  },
  {
    slug: 'enterprise',
    title: 'CRM for Enterprise',
    role: 'enterprise organizations',
    kw: 'scale, governance, RBAC, audit',
    md: 'The CRM for enterprise: deep deal management, role-based access, full audit log, and cross-team governance, alive on day one without a year-long rollout.',
    intro:
      'Enterprise CRM means scale, security, and governance, and historically a year to deploy. The right one delivers the depth and control large organizations require while being alive with data on day one instead of after a project.',
    shortAnswer:
      'An enterprise organization runs revenue across many teams with strict requirements for security, governance, and control. The CRM they need offers deep deal management, role-based access, a full audit log, cross-team visibility, and enforced process, while being alive on day one, so a large org gets enterprise depth and governance without a year-long implementation.',
    vp: [
      { i: 'shield', h: 'RBAC and audit', b: 'Role-based access and a full audit log control who sees and changes what and prove it later, meeting the security and compliance needs of a large organization.' },
      { i: 'building', h: 'Depth for complex deals', b: 'A rich deal object with buying committees, competitors, and quotes handles the complex, high-value deals enterprise teams run every day.' },
      { i: 'users', h: 'Cross-team visibility', b: 'Many teams roll up into one governed source of truth, so leadership sees the whole revenue picture and each team sees its slice.' },
      { i: 'workflow', h: 'Enforced process at scale', b: 'Stage criteria, required fields, and approvals keep a large org consistent, so data quality and controls hold across hundreds of users.' },
      { i: 'rocket', h: 'Alive on day one', b: 'Rally is live with data on first load, so an enterprise avoids the multi-quarter rollout that legacy platforms are notorious for.' },
    ],
    sec: [
      { h: 'Enterprise depth without the rollout', body: 'Enterprise buyers expect deep deal management, cross-team rollups, and real governance, and have learned to expect a year to get there. Rally delivers the depth and control, a rich deal object, RBAC, audit, and enforced process, while being alive with data on first load. You get the enterprise-grade capability without the multi-quarter implementation and the six-figure services bill that usually come with it.' },
      { h: 'Governance that holds at scale', body: 'Across hundreds of users, revenue data has to be controlled and auditable. Rally enforces role-based access, approval workflows, and process rules, and logs every change, so you grant precise visibility, keep large deals compliant, and prove who did what. Rook manages complexity across the whole book, surfacing risk early, so scale does not mean losing sight of the deals that matter.' },
    ],
    faqs: [
      { q: 'Does Rally meet enterprise security and governance needs?', a: 'Yes. Rally provides role-based access control, approval workflows, and a full audit log, so you control who sees and changes what across hundreds of users and can prove it, meeting enterprise security and compliance requirements.' },
      { q: 'How long does enterprise deployment take?', a: 'Rally is alive with data on day one, so you avoid the multi-quarter rollout and heavy services bill legacy enterprise CRMs require. You get the depth and governance a large org needs without the year-long implementation.' },
      { q: 'Can Rally handle complex, high-value deals at scale?', a: 'Yes. A rich deal object with buying committees, competitors, and quotes handles complex enterprise deals, and Rook surfaces risk across the whole book, so scale does not mean losing sight of the deals that matter most.' },
    ],
  },
  {
    slug: 'agencies',
    title: 'CRM for Agencies',
    role: 'agencies',
    kw: 'new business, client accounts, retainers',
    md: 'The CRM for agencies: run new-business pipeline and client accounts in one place, track retainers, and let Rook keep every relationship warm.',
    intro:
      'An agency sells and serves at once: winning new business while growing existing client accounts and retainers. Both are relationship-driven. The right CRM tracks the pitch pipeline and the client book without two systems.',
    shortAnswer:
      'An agency runs new-business development alongside growing existing client relationships and retainers. The CRM they need tracks a pitch pipeline, manages client accounts and their history, and surfaces expansion within accounts, with an operator that keeps outreach warm, so an agency wins new work and grows the clients it already has from one system.',
    vp: [
      { i: 'target', h: 'New-business pipeline', b: 'Track pitches and prospects with stages and next steps, so the agency\'s new-business effort has discipline instead of living in the founders\' heads.' },
      { i: 'building', h: 'Client accounts in one place', b: 'Keep every client\'s contacts, history, and retainer status on the account, so account leads walk into a review with full context.' },
      { i: 'rocket', h: 'Grow retainers and scope', b: 'Track expansion opportunities within accounts, so growing existing clients is a deliberate pipeline, not something you notice after the fact.' },
      { i: 'zap', h: 'Rook keeps relationships warm', b: 'The operator drafts check-ins and follow-ups for prospects and clients alike, so a busy agency stays present without manual effort on every relationship.' },
      { i: 'chart', h: 'See the whole book', b: 'New business and client revenue in one view means leadership can see the pipeline and the base of retainers together.' },
    ],
    sec: [
      { h: 'Win new work with discipline', body: 'Agency new business often lives in the founders\' heads and stalls when delivery gets busy. Rally gives the pitch pipeline real stages and next steps, and Rook drafts the follow-ups, so promising prospects do not go cold during a crunch. New business becomes a managed motion rather than a thing that only happens when the team has spare time.' },
      { h: 'Grow the clients you already have', body: 'The cheapest growth for an agency is expanding existing accounts and retainers. Rally keeps every client\'s history and retainer status on the account and tracks expansion as real opportunities, so account leads can see where to grow scope. Combined with Rook-drafted check-ins that keep clients close, the agency deepens its best relationships deliberately instead of hoping they renew.' },
    ],
    faqs: [
      { q: 'Can Rally handle both new business and client accounts?', a: 'Yes. Rally tracks a new-business pitch pipeline and manages existing client accounts with full history and retainer status in one system, so an agency wins new work and grows the clients it already has without juggling two tools.' },
      { q: 'How does Rally help grow retainers?', a: 'Rally tracks expansion opportunities within each account as real deals, so growing scope and retainers is a deliberate pipeline. Rook-drafted check-ins keep clients close, so the agency deepens its best relationships instead of just hoping they renew.' },
      { q: 'Will it help a busy agency stay on top of follow-ups?', a: 'Yes. Rook drafts check-ins and follow-ups for both prospects and clients, so relationships stay warm even when the team is heads-down on delivery, and promising new business does not go cold during a crunch.' },
    ],
  },
  {
    slug: 'saas-companies',
    title: 'CRM for SaaS Companies',
    role: 'SaaS companies',
    kw: 'recurring revenue, expansion, net revenue retention',
    md: 'The CRM for SaaS companies: manage new business, expansion, and renewals in one platform built for recurring revenue and net revenue retention.',
    intro:
      'A SaaS company lives on recurring revenue, where retention and expansion matter as much as new logos. The right CRM models the whole recurring lifecycle so new business, renewals, and net revenue retention live in one place.',
    shortAnswer:
      'A SaaS company grows through new business plus expansion and retention of recurring revenue, where net revenue retention drives valuation. The CRM they need manages the full recurring lifecycle: new deals, renewals, and expansion, with health signals and one source of truth across sales and success, so a SaaS business grows and retains ARR from one platform.',
    vp: [
      { i: 'chart', h: 'Built for recurring revenue', b: 'Track new ARR, expansion, and renewals in one view, so the metrics that define a SaaS business live in the CRM instead of a separate spreadsheet.' },
      { i: 'rocket', h: 'Expansion as a pipeline', b: 'Upsell and cross-sell are tracked as real opportunities on the account, so net revenue retention is a managed motion, not an afterthought.' },
      { i: 'target', h: 'Renewals never slip', b: 'Renewal dates and health live on the account, and Rook flags at-risk renewals early, so you protect the ARR base that compounds.' },
      { i: 'building', h: 'Sales and success in one system', b: 'New business and post-sale live on one model, so the handoff to success is clean and the whole customer lifecycle is traceable.' },
      { i: 'zap', h: 'Rook runs the lifecycle', b: 'The operator works leads, deals, renewals, and expansion alike, so busywork is handled across the entire recurring-revenue motion.' },
    ],
    sec: [
      { h: 'Manage the whole recurring lifecycle', body: 'SaaS revenue is not won once, it is won, retained, and expanded. Rally puts new business, renewals, and expansion on one platform with account health, so the full recurring lifecycle is visible and traceable. Sales and success work from the same model, so the customer journey from first deal to expanded account is one continuous, managed motion rather than a set of disconnected stages.' },
      { h: 'Protect and grow ARR', body: 'Net revenue retention drives SaaS valuation, and it comes from renewals that do not slip and expansion that actually gets worked. Rally keeps renewal dates and health on every account with Rook flagging risk early, and tracks upsell as real pipeline. The recurring revenue base is protected and the expansion motion is deliberate, so ARR compounds instead of leaking.' },
    ],
    faqs: [
      { q: 'Is Rally built for recurring revenue?', a: 'Yes. Rally tracks new ARR, expansion, and renewals in one view with account health, so the metrics that define a SaaS business live in the CRM. The full recurring lifecycle from new deal to renewal is managed in one place.' },
      { q: 'How does Rally support net revenue retention?', a: 'Rally tracks upsell and cross-sell as real pipeline and keeps renewal dates and health on every account, with Rook flagging at-risk renewals early. Expansion becomes a managed motion and the ARR base is protected, so retention compounds.' },
      { q: 'Do sales and customer success share the system?', a: 'Yes. New business and post-sale live on one data model, so the handoff to success is clean and the whole customer lifecycle is traceable, letting a SaaS company run the entire recurring motion from one platform.' },
    ],
  },
  {
    slug: 'sales-directors',
    title: 'CRM for Sales Directors',
    role: 'sales directors',
    kw: 'team rollup, forecast, manager coaching',
    md: 'The CRM for sales directors: roll up multiple teams into one forecast, spot risk across managers, and coach the coaches, all from live data.',
    intro:
      'A sales director sits above frontline managers, owning several teams and the forecast that rolls from them. The right CRM gives a clean multi-team rollup and the signals to coach managers, not just reps, on live data.',
    shortAnswer:
      'A sales director manages multiple frontline managers and their teams, owning a rolled-up forecast and driving performance through the managers. The CRM they need rolls a multi-team forecast, exposes risk and performance by team and manager, and surfaces where to coach, so a director runs a larger org on live data instead of assembled reports.',
    vp: [
      { i: 'chart', h: 'Multi-team rollup', b: 'Forecast rolls from reps through managers into one director-level commit, so you own a defensible number without stitching team spreadsheets together.' },
      { i: 'target', h: 'Risk across every team', b: 'See coverage gaps and slipping deals by team, so you spot which team is heading for a miss early enough to intervene.' },
      { i: 'users', h: 'Coach the managers', b: 'Performance by manager and team shows which managers run tight pipelines and which need help, so you coach the coaches, not just watch reps.' },
      { i: 'zap', h: 'Rook watches the whole org', b: 'The operator surfaces risk across all your teams, so problems reach you as a signal instead of a quarter-end surprise from one manager.' },
      { i: 'building', h: 'One source of truth', b: 'Reps, managers, and you read the same live data, so every review starts from agreed facts rather than reconciling versions.' },
    ],
    sec: [
      { h: 'Own a number that rolls up cleanly', body: 'A sales director\'s forecast is only as good as the manager forecasts under it. Rally rolls commit, best case, and pipeline from reps through managers into one director-level view, all from live deal data. You present a defensible number and can drill from your total into any team or deal, so the rollup is trustworthy instead of a reconciliation of competing spreadsheets.' },
      { h: 'Coach the coaches', body: 'A director drives results through managers, so the leverage is in coaching them. Rally shows win rate, coverage, and pipeline discipline by manager and team, so you can see which managers run a tight motion and which need help. You spend your one-on-ones on the managers who most affect the number, backed by the same data they see with their reps.' },
    ],
    faqs: [
      { q: 'How does Rally roll up multiple teams?', a: 'Rally rolls commit, best case, and pipeline from reps through their managers into one director-level forecast, all from live deal data. You own a defensible number and can drill from your total into any team or deal on demand.' },
      { q: 'Can I see performance by manager?', a: 'Yes. Rally shows win rate, coverage, and pipeline discipline by manager and team, so you can tell which managers run a tight motion and which need coaching, and focus your time where it most affects the number.' },
      { q: 'How do I catch risk across teams early?', a: 'Rally surfaces coverage gaps and slipping deals by team, and Rook watches the whole org, so a team heading for a miss reaches you as an early signal rather than a surprise at quarter end.' },
    ],
  },
  {
    slug: 'head-of-sales',
    title: 'CRM for a Head of Sales',
    role: 'a head of sales',
    kw: 'building the motion, forecast, first hires',
    md: 'The CRM for a head of sales: stand up a repeatable motion, roll a forecast leadership trusts, and onboard your first reps, all alive on day one.',
    intro:
      'A head of sales is often building the motion from scratch: defining the process, standing up the forecast, and hiring the first reps. The right CRM gives structure without a rollout, so the machine is running while you build it.',
    shortAnswer:
      'A head of sales builds and owns the go-to-market motion, defining process, standing up a forecast, and hiring the first reps, often without an ops team. The CRM they need provides structure out of the box, rolls a trustworthy forecast, and onboards reps fast, all alive on day one, so the leader builds a repeatable machine quickly.',
    vp: [
      { i: 'workflow', h: 'A repeatable motion, fast', b: 'Define stages, next steps, and process in the system, so the motion you are building is enforced from day one instead of living in your head.' },
      { i: 'chart', h: 'A forecast leadership trusts', b: 'Rally rolls a bottoms-up forecast from real deals, so you give the CEO and board a defensible number as soon as you have pipeline.' },
      { i: 'rocket', h: 'Onboard reps quickly', b: 'A clear process with Rook doing the admin means your first hires ramp on real context fast instead of inheriting a shoebox of notes.' },
      { i: 'target', h: 'See what is working', b: 'Conversion and cycle data show which parts of the new motion work, so you iterate the process on evidence rather than instinct.' },
      { i: 'zap', h: 'Rook is your ops team', b: 'The operator handles logging, follow-ups, and risk flags, so you build the motion without waiting to hire a RevOps function first.' },
    ],
    sec: [
      { h: 'Build the machine while it runs', body: 'A head of sales cannot pause selling to build systems, so the CRM has to give structure immediately. Rally is alive on day one, lets you define the process in the system, and has Rook act as the ops function you have not hired yet. You stand up a repeatable motion and a forecast while actually selling, instead of choosing between building infrastructure and hitting the number.' },
      { h: 'Hire and forecast from a solid base', body: 'The two hardest early jobs are ramping first reps and giving leadership a credible forecast. Rally solves both: new reps inherit a clear process and real context so they ramp fast, and the forecast rolls from live deals so the number you commit to the board is defensible. You build the team and the predictability on the same foundation from the start.' },
    ],
    faqs: [
      { q: 'Can Rally help me build a sales motion from scratch?', a: 'Yes. Rally lets you define stages, next steps, and process in the system so the motion is enforced from day one, and Rook acts as the ops function you have not hired yet. You build a repeatable machine while you sell.' },
      { q: 'Will it give me a forecast for the board?', a: 'Yes. Rally rolls a bottoms-up forecast from real deal data, so as soon as you have pipeline you can give the CEO and board a defensible number instead of a guess, and drill into the deals behind it on demand.' },
      { q: 'How does it help onboard my first reps?', a: 'A clear process plus Rook doing the admin means your first hires ramp on real context fast. They inherit a working motion rather than a pile of notes, so the team gets productive quickly.' },
    ],
  },
  {
    slug: 'bootstrapped-startups',
    title: 'CRM for Bootstrapped Startups',
    role: 'bootstrapped startups',
    kw: 'affordable, efficient, no waste',
    md: 'The CRM for bootstrapped startups: one affordable price, no per-seat surprises, and Rook doing the work of an ops hire you have not made yet.',
    intro:
      'A bootstrapped startup spends its own revenue, so every tool has to earn its cost and do real work. The right CRM is one affordable price and acts like extra headcount, so a lean team competes without burning cash.',
    shortAnswer:
      'A bootstrapped startup grows on its own revenue, so every dollar and every hour counts. The CRM they need is affordable at one clear price with no per-seat surprises, and does real work through an operator, so a capital-efficient team gets the pipeline discipline and follow-up of a staffed operation without the cost of one.',
    vp: [
      { i: 'sparkles', h: 'One affordable price', b: 'Every feature at a single clear price with no per-cloud add-ons, so a bootstrapped team budgets the tool without fear of surprise upsells.' },
      { i: 'zap', h: 'Work, not just software', b: 'Rook logs activity and drafts follow-ups, so the CRM does the job of an ops hire you cannot justify yet on a self-funded budget.' },
      { i: 'rocket', h: 'No wasted time on setup', b: 'Alive on first load, so a lean team spends its hours on customers and product, not on configuring a system.' },
      { i: 'target', h: 'Every lead worked', b: 'Clean pipeline with next steps means a small team squeezes maximum revenue from every lead, which matters most when growth funds itself.' },
      { i: 'chart', h: 'Efficient growth, visible', b: 'Conversion and pipeline data show where to focus limited effort, so a bootstrapped team invests in what actually converts.' },
    ],
    sec: [
      { h: 'A tool that pays for itself', body: 'A bootstrapped startup cannot afford tools that just store data, they need tools that do work. Rally is one affordable price and has Rook handle the follow-up drafting, logging, and risk flags, so the CRM acts like the ops hire the budget cannot justify yet. It earns its cost by turning more of your existing pipeline into revenue, which is exactly what a self-funded business needs.' },
      { h: 'Compete without burning cash', body: 'Bootstrapped teams win by being efficient, not by outspending. Rally gives forecasting, sequences, and automation at one clear price with no per-seat surprises, so a lean team runs a disciplined motion without a venture budget. You get the capabilities of a much larger, funded operation while keeping the capital efficiency that lets a bootstrapped company survive and grow on its own terms.' },
    ],
    faqs: [
      { q: 'Is Rally affordable for a bootstrapped startup?', a: 'Yes. Rally is one clear price with every feature included and no per-cloud add-ons or per-seat surprises, so a self-funded team can budget the tool confidently without fear of the bill climbing as you grow.' },
      { q: 'Does it replace hiring an ops person?', a: 'Largely, in the early days. Rook handles logging, follow-up drafting, and risk flags, so the CRM does the work of an ops hire a bootstrapped budget cannot justify yet, letting a lean team run a disciplined motion.' },
      { q: 'Will a small team get value quickly?', a: 'Yes. Rally is alive on first load, so a lean team spends its hours on customers and product rather than setup, and starts turning more of its existing pipeline into revenue right away.' },
    ],
  },
  {
    slug: 'b2b-sales-teams',
    title: 'CRM for B2B Sales Teams',
    role: 'B2B sales teams',
    kw: 'accounts, buying committees, pipeline',
    md: 'The CRM for B2B sales teams: account-based deal management, buying-committee mapping, and a forecast that ties out, alive with data on day one.',
    intro:
      'B2B selling is account-based: multiple stakeholders, considered decisions, real pipeline. A CRM built for simple transactions cannot hold it. The right one models accounts, committees, and a forecast the way B2B teams actually sell.',
    shortAnswer:
      'A B2B sales team sells to organizations through multi-stakeholder, considered decisions across a pipeline of accounts. The CRM they need offers account-based deal management, buying-committee mapping, and a forecast that ties out, with an operator that handles busywork, so a B2B team runs complex accounts and forecasts reliably from one system.',
    vp: [
      { i: 'building', h: 'Account-based management', b: 'Deals live on accounts with the full company context, so a B2B team manages the organization it is selling to, not just isolated contacts.' },
      { i: 'users', h: 'Map the buying committee', b: 'Track every stakeholder and their stance on a deal, so reps see where they are single-threaded and multi-thread before it costs them.' },
      { i: 'chart', h: 'A forecast that ties out', b: 'Commit, best case, and pipeline roll from real deal data, so B2B forecasts are defensible instead of a gut-feel spreadsheet.' },
      { i: 'zap', h: 'Rook does the busywork', b: 'Logging, follow-ups, and risk flags are handled, so B2B reps spend time advancing complex deals instead of updating fields.' },
      { i: 'target', h: 'Deal depth out of the box', b: 'Line items, competitors, and close plans live on the opportunity, so the full picture of a considered B2B deal is one screen.' },
    ],
    sec: [
      { h: 'Sell to organizations, not just contacts', body: 'B2B deals involve a company, a committee, and a considered process, and a contact-centric CRM misses most of it. Rally is account-based: deals sit on the account with full company context and the buying committee mapped, so reps manage the whole organization they are selling to. They see where a deal is single-threaded and can act before a champion leaves and the deal stalls.' },
      { h: 'A forecast B2B leaders trust', body: 'B2B pipeline is lumpy and high-value, so a reliable forecast matters. Rally rolls commit, best case, and pipeline from the same deal data reps update daily, weighted by stage and close date. Because it is live and account-based, the number reflects reality and drills into the deals behind it, so leadership forecasts on facts instead of reconciling optimistic spreadsheets.' },
    ],
    faqs: [
      { q: 'Is Rally built for account-based B2B selling?', a: 'Yes. Deals live on accounts with full company context and the buying committee mapped, so a B2B team manages the whole organization it is selling to rather than isolated contacts, and reps see where they are single-threaded.' },
      { q: 'Can it handle considered, multi-stakeholder deals?', a: 'Yes. The deal object carries the buying committee, competitors, line items, and close plan, so a complex B2B deal lives on one record. Rook handles the busywork so reps spend time advancing the deal.' },
      { q: 'Does the forecast tie out?', a: 'Yes. Commit, best case, and pipeline roll from live deal data weighted by stage and close date, so B2B forecasts are defensible and drill into the deals behind them instead of being a gut-feel spreadsheet.' },
    ],
  },
  {
    slug: 'outbound-sales-teams',
    title: 'CRM for Outbound Sales Teams',
    role: 'outbound sales teams',
    kw: 'sequences, prospecting, reply rates',
    md: 'The CRM for outbound sales teams: native sequences, prioritized prospecting, and reply-rate analytics, with Rook personalizing outreach at scale.',
    intro:
      'Outbound teams create pipeline from cold, running sequences at volume and living on reply and meeting rates. The right CRM makes prospecting a machine: native sequences, a prioritized queue, and personalization that scales.',
    shortAnswer:
      'An outbound sales team generates pipeline through cold prospecting, running email and call sequences at volume and optimizing reply and meeting rates. The CRM they need has native sequences, a prioritized prospecting queue, and reply analytics, with an operator that personalizes outreach at scale, so the team books more meetings from cold outreach.',
    vp: [
      { i: 'workflow', h: 'Native sequences', b: 'Multi-step email and call cadences run inside Rally, so outbound reps execute a consistent motion without a separate tool that drifts out of sync.' },
      { i: 'target', h: 'A prioritized prospecting queue', b: 'Each rep\'s day loads ranked by likelihood to respond, so high-volume outbound stays focused on the accounts most worth working.' },
      { i: 'sparkles', h: 'Personalization at scale', b: 'Rook drafts personalized openers from account context, so cold outreach reads researched instead of blasted, without writing each one by hand.' },
      { i: 'chart', h: 'Reply and meeting analytics', b: 'Track reply, connect, and meeting rates by sequence and step, so you double down on the messaging that books meetings and cut what does not.' },
      { i: 'rocket', h: 'Clean conversion to pipeline', b: 'A booked meeting converts to an opportunity in one step, so outbound effort turns into tracked, attributable pipeline.' },
    ],
    sec: [
      { h: 'Make outbound a machine', body: 'Outbound performance is volume times quality of outreach times conversion. Rally runs native sequences, loads a prioritized queue, and has Rook personalize openers from real account context, so reps send more high-quality outreach in less time. The prospecting motion becomes a repeatable machine instead of each rep improvising in a separate outreach tool that never syncs back to the CRM.' },
      { h: 'Optimize on reply and meeting rates', body: 'You improve outbound by finding the message and step that books meetings. Rally tracks reply, connect, and meeting rates by sequence and step, so you can see which openers land and which cadences convert. The team doubles down on what works and cuts what does not, and every booked meeting converts cleanly into attributable pipeline for the AEs.' },
    ],
    faqs: [
      { q: 'Does Rally have native sequences for outbound?', a: 'Yes. Multi-step email and call cadences run inside Rally, so outbound reps execute a consistent motion without bolting on a separate outreach tool that fails to sync cleanly back to the CRM.' },
      { q: 'Can it personalize cold outreach at scale?', a: 'Yes. Rook drafts personalized openers from real account context, so cold outreach reads researched instead of mass-blasted. Reps send more high-quality outreach without writing every message by hand.' },
      { q: 'How do we optimize reply rates?', a: 'Rally tracks reply, connect, and meeting rates by sequence and step, so you see which openers land and which cadences convert. You double down on the messaging that books meetings and cut what does not.' },
    ],
  },
  {
    slug: 'account-based-marketing-teams',
    title: 'CRM for Account-Based Marketing Teams',
    role: 'account-based marketing teams',
    kw: 'target accounts, sales alignment, account engagement',
    md: 'The CRM for ABM teams: manage target account lists, align tightly with sales, and track account engagement to pipeline, all from one shared model.',
    intro:
      'ABM flips the funnel: pick target accounts and orchestrate sales and marketing against them. That demands tight alignment and account-level visibility. The right CRM shares one account model so marketing and sales work in lockstep.',
    shortAnswer:
      'An account-based marketing team targets a defined list of high-value accounts, orchestrating marketing and sales together against each one. The CRM they need manages target account lists, shares one account model with sales, and tracks account-level engagement through to pipeline, so ABM stays aligned and the team proves accounts turned into revenue.',
    vp: [
      { i: 'target', h: 'Manage target account lists', b: 'Define and track your target accounts in the CRM, so ABM effort is focused on the named accounts that matter, not sprayed across everyone.' },
      { i: 'building', h: 'One account model with sales', b: 'Marketing and sales share the same account records, so orchestration against a target account happens in lockstep instead of across disconnected tools.' },
      { i: 'chart', h: 'Account engagement to pipeline', b: 'Track engagement at the account level and tie it to opportunities, so you prove ABM moved target accounts into real pipeline and revenue.' },
      { i: 'users', h: 'See the whole buying committee', b: 'Every stakeholder on a target account is visible, so marketing and sales coordinate multi-threaded plays against the full committee.' },
      { i: 'zap', h: 'Rook orchestrates outreach', b: 'The operator drafts account-specific touches, so coordinated plays against many target accounts stay personal without manual effort on each.' },
    ],
    sec: [
      { h: 'Keep ABM aligned by design', body: 'ABM only works when marketing and sales act as one against each target account, which breaks when they run on separate tools. Rally shares one account model, so both see the same target list, engagement, and buying committee. Orchestration happens in lockstep: marketing warms the account, sales works the committee, and everyone sees the same picture, so the coordinated play actually stays coordinated.' },
      { h: 'Prove accounts turned into revenue', body: 'ABM budgets get questioned because impact is measured on engagement, not revenue. Rally tracks engagement at the account level and ties it to the opportunities and closed deals on that account, so you can show which target accounts ABM moved into pipeline. The program\'s contribution shows up in the same account-level revenue leadership already cares about.' },
    ],
    faqs: [
      { q: 'How does Rally support ABM?', a: 'Rally manages target account lists, shares one account model with sales, and tracks account-level engagement tied to pipeline, so marketing and sales orchestrate against named accounts in lockstep and prove those accounts turned into revenue.' },
      { q: 'Does it keep marketing and sales aligned?', a: 'Yes. Both work from the same account records, buying committee, and engagement data, so ABM plays happen in lockstep instead of across disconnected tools. Marketing warms the account while sales works the committee, all in one view.' },
      { q: 'Can I prove ABM drove revenue?', a: 'Yes. Rally ties account-level engagement to the opportunities and closed deals on that account, so you can show which target accounts ABM moved into pipeline, putting the program\'s impact in the revenue terms leadership cares about.' },
    ],
  },
  {
    slug: 'customer-success-teams',
    title: 'CRM for Customer Success Teams',
    role: 'customer success teams',
    kw: 'account health, retention, expansion',
    md: 'The CRM for customer success teams: portfolio health at a glance, churn signals, and expansion pipeline, with Rook flagging at-risk accounts early.',
    intro:
      'A customer success team owns retention and expansion across many accounts. The work is proactive and easy to spread too thin. The right CRM turns a portfolio into a health-scored, prioritized queue tied to revenue outcomes.',
    shortAnswer:
      'A customer success team drives retention and expansion across a portfolio of accounts, monitoring health and stepping in before customers churn. The CRM they need shows portfolio health at a glance, surfaces churn signals, and tracks renewal and expansion pipeline, with an operator that flags at-risk accounts early, so the team retains and grows revenue proactively.',
    vp: [
      { i: 'chart', h: 'Portfolio health at a glance', b: 'Engagement, adoption, and open issues roll into a health view across the whole portfolio, so the team prioritizes the accounts that need attention now.' },
      { i: 'shield', h: 'Churn signals early', b: 'Rook surfaces accounts trending down, so CSMs intervene while a relationship is recoverable instead of reacting to a cancellation notice.' },
      { i: 'target', h: 'Renewals and expansion tracked', b: 'Renewal dates and growth opportunities live on the account, so success work connects directly to the retention and expansion numbers leadership measures.' },
      { i: 'workflow', h: 'Consistent success motion', b: 'Standardize onboarding and review cadences across the team, so every account gets the same disciplined success process regardless of which CSM owns it.' },
      { i: 'zap', h: 'Rook drafts the outreach', b: 'Check-ins, milestone nudges, and QBR recaps are drafted from account context, so proactive success scales across a large portfolio.' },
    ],
    sec: [
      { h: 'Turn the portfolio into a prioritized queue', body: 'A success team cannot give every account equal attention, so the daily question is which accounts need help now. Rally rolls engagement, adoption, and open issues into a health view across the portfolio and has Rook flag the accounts trending down. The team starts each day with the right list and spends its attention where it changes the retention outcome, not on whoever emailed last.' },
      { h: 'Connect success to revenue', body: 'Customer success is judged on retention and expansion, not activity. Rally keeps renewal dates and expansion opportunities on the same account records as health and onboarding data, so the team\'s work is visibly tied to the number. When an account is at risk or ready to grow, CSMs and leadership see it in one place, so success operates as a revenue function, not a support cost.' },
    ],
    faqs: [
      { q: 'How does Rally help a customer success team retain revenue?', a: 'Rally rolls engagement, adoption, and open issues into portfolio health, and Rook surfaces at-risk accounts early, so CSMs intervene while a relationship is recoverable. Renewal dates on every account keep retention a managed, proactive motion.' },
      { q: 'Can the team standardize its success motion?', a: 'Yes. You can standardize onboarding and review cadences across the team, so every account gets the same disciplined process regardless of which CSM owns it, and Rook drafts the outreach so the motion scales.' },
      { q: 'Does it track expansion too?', a: 'Yes. Renewal and expansion opportunities live on the account alongside health data, so success work connects directly to the retention and growth numbers leadership measures, letting the team operate as a revenue function.' },
    ],
  },
  {
    slug: 'mortgage-brokers',
    title: 'CRM for Mortgage Brokers',
    role: 'mortgage brokers',
    kw: 'loan pipeline, referral partners, follow-ups',
    md: 'The CRM for mortgage brokers: track loans through every stage, nurture referral partners, and let Rook keep borrowers and agents updated on time.',
    intro:
      'A mortgage broker moves loans through many stages while depending on referral partners like real estate agents for a steady flow. Both demand constant follow-up. The right CRM keeps the loan pipeline and referral relationships on track.',
    shortAnswer:
      'A mortgage broker manages loans through application, processing, and closing while relying on referral partners like real estate agents for volume. The CRM they need tracks the loan pipeline by stage, nurtures referral partners, and keeps borrowers and partners updated through an operator, so loans close on time and referral relationships keep producing.',
    vp: [
      { i: 'target', h: 'Loan pipeline by stage', b: 'Track every loan through application, processing, underwriting, and closing, so you always know which files are stuck and need attention to close on time.' },
      { i: 'users', h: 'Nurture referral partners', b: 'Keep real estate agents and other referral sources on a cadence, so the partners who send you borrowers stay warm and keep referring.' },
      { i: 'zap', h: 'Keep everyone updated', b: 'Rook drafts timely status updates to borrowers and agents, so the constant communication a loan requires happens without you chasing every file.' },
      { i: 'building', h: 'The whole loan on one record', b: 'Borrower, contacts, partner, and status live together, so you handle a call or a status question from one screen instead of digging.' },
      { i: 'chart', h: 'See pipeline and referral sources', b: 'Track loan volume and which partners drive it, so you invest in the referral relationships that actually produce business.' },
    ],
    sec: [
      { h: 'Close loans on time', body: 'A loan touches many stages and stalls quietly if a file sits. Rally tracks every loan through its stages and has Rook keep borrowers and partners updated, so bottlenecks surface and communication stays constant. Files move on schedule and borrowers stay informed, which protects both the closing and the referral relationship that sent the deal your way.' },
      { h: 'Keep referral partners producing', body: 'Most of a broker\'s volume comes from a handful of referral partners, and those relationships fade without attention. Rally keeps agents and other sources on a nurture cadence with Rook drafting the touches, and tracks which partners actually send business. You invest in the relationships that produce and keep your referral pipeline flowing instead of watching it dry up when you get busy.' },
    ],
    faqs: [
      { q: 'How does Rally help a mortgage broker?', a: 'Rally tracks loans through every stage, nurtures referral partners, and has Rook keep borrowers and agents updated, so loans close on time and the referral relationships that drive your volume keep producing.' },
      { q: 'Can it manage my referral partners?', a: 'Yes. Rally keeps real estate agents and other referral sources on a nurture cadence with Rook-drafted touches, and tracks which partners actually send business, so you invest in the relationships that produce and keep your pipeline flowing.' },
      { q: 'Will borrowers stay informed?', a: 'Yes. Rook drafts timely status updates to borrowers and agents as a loan moves through its stages, so the constant communication a mortgage requires happens on time without you manually chasing every file.' },
    ],
  },
];

/* Expand each compact role into a full SeoPage `role` entry. */
export default ROLES.map((r) => ({
  slug: `crm-for-${r.slug}`,
  type: 'role',
  title: r.title,
  metaTitle: `${r.title}: ${r.kw} (2026) | Rally`,
  metaDescription: r.md,
  eyebrow: r.title,
  h1: r.title,
  shortAnswer: r.shortAnswer,
  intro: r.intro,
  stats: [
    { value: 'Minutes', label: 'Time to first value' },
    { value: 'Day one', label: 'Alive with your data' },
    { value: 'Rook', label: 'Runs the busywork' },
  ],
  valuePropsHeading: `The Rally fit for ${r.role}`,
  valueProps: r.vp.map((v) => ({ icon: v.i, h: v.h, body: v.b })),
  sections: r.sec,
  faqs: r.faqs,
  published: PUB,
  updated: PUB,
}));
