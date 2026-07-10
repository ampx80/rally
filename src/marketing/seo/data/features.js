// features dataset - generated feature/software-category pages. NO em-dash / en-dash.
// Each entry is a `feature` page rendered by SeoPage.jsx. Built from a compact
// per-entry spec so every page carries unique shortAnswer, valueProps, sections, faqs.

const YEAR = 2026;
const ICONS = ['sparkles', 'rocket', 'zap', 'target', 'shield', 'workflow', 'chart', 'plug'];

function f(slug, title, kw, short, intro, vp, sec, faqs, table) {
  return {
    slug,
    type: 'feature',
    title,
    metaTitle: `${title}: ${kw} (${YEAR}) | Rally`,
    metaDescription: short.length > 152 ? short.slice(0, 149).trim() + '...' : short,
    eyebrow: 'Feature',
    shortAnswer: short,
    intro,
    stats: [
      { value: 'Minutes', label: 'Time to first value' },
      { value: 'Day one', label: 'Alive with data' },
      { value: 'One price', label: 'Every module included' },
    ],
    valuePropsHeading: `How Rally delivers ${title.toLowerCase()}`,
    valueProps: vp.map((v, i) => ({ icon: ICONS[i % ICONS.length], h: v[0], body: v[1] })),
    ...(table
      ? {
          tableHeading: `${title} vs the old way`,
          table: { columns: ['Capability', 'Rally', 'Legacy tools'], rows: table },
          highlightCol: 1,
        }
      : {}),
    sections: sec.map((s) => ({ h: s[0], body: s[1], ...(s[2] ? { bullets: s[2] } : {}) })),
    faqs: faqs.map((q) => ({ q: q[0], a: q[1] })),
    published: '2026-07-10',
  };
}

const FEATURES = [
  f(
    'sales-forecasting-software',
    'Sales forecasting software',
    'AI forecasting, pipeline coverage, quota attainment',
    'Sales forecasting software predicts how much revenue a team will close in a period by weighting pipeline by stage, deal health, and history. Rally forecasts natively: every deal already carries amount, close date, and stage, so Rook rolls up a call in seconds and flags risk before the quarter slips.',
    'Most CRMs bolt forecasting on as a report you build by hand. Rally treats the forecast as a living object that updates the moment a deal moves.',
    [
      ['Live roll-up by rep and team', 'Rally rolls pipeline into a weighted and committed forecast the instant a deal changes stage or amount, with no spreadsheet export.'],
      ['Rook flags at-risk deals', 'Rook watches for stalled close dates, missing next steps, and slipping amounts, then surfaces the exact deals putting the number at risk.'],
      ['Coverage and gap math', 'See pipeline coverage against quota (3x is a common target) and the exact dollar gap you need to source to hit plan.'],
      ['Scenario and category views', 'Toggle best case, commit, and worst case, and drill from a number straight into the deals behind it.'],
    ],
    [
      ['What to look for in forecasting software', 'A strong forecasting tool ties directly to your deal data instead of a parallel spreadsheet, supports weighted and category forecasts, and shows the deals behind every number.', ['Weighted pipeline plus commit and best-case categories', 'Snapshots so you can compare this week to last', 'Rep, team, and company roll-ups in one click', 'Risk signals on individual deals, not just totals']],
      ['How Rally does forecasting', 'Rally builds the forecast from the same deal records reps already update, so there is nothing to reconcile. Rook narrates the call in plain language, points to the two or three deals that will decide the quarter, and drafts the follow-ups to de-risk them.'],
    ],
    [
      ['How accurate is Rally forecasting?', 'Accuracy comes from clean, current deal data. Because Rally forecasts from live records and Rook nudges reps to keep close dates and next steps current, the forecast reflects reality instead of quarter-end guesses.'],
      ['Can I forecast by rep, team, and product?', 'Yes. Roll up by owner, team, region, or product line, and drill from any total into the underlying deals.'],
      ['Do I need a separate BI tool?', 'No. Forecasting, dashboards, and revenue analytics are built into Rally at one price, so you do not need a separate BI or spreadsheet layer.'],
    ]
  ),
  f(
    'lead-scoring-software',
    'Lead scoring software',
    'predictive lead scoring, fit and intent, routing',
    'Lead scoring software ranks leads by how likely they are to buy, using fit signals (title, company size, industry) and engagement signals (opens, visits, replies). Rally scores every lead on arrival, so reps work the hottest ones first and Rook routes and follows up automatically instead of leads aging out.',
    'A lead score is only useful if it drives action. Rally connects the score to routing, sequences, and Rook so a hot lead gets worked in minutes, not days.',
    [
      ['Fit plus engagement scoring', 'Combine firmographic fit with real engagement so a great-fit prospect who is also active rises to the top of every queue.'],
      ['Instant scoring on capture', 'New leads are scored the moment they hit Rally from a form, import, or integration, with no nightly batch delay.'],
      ['Rook works the top of the list', 'Rook drafts the first outreach, books the meeting, and re-scores as engagement changes so priority stays current.'],
      ['Transparent, tunable models', 'See exactly which signals moved a score and adjust weights without a data-science project.'],
    ],
    [
      ['What to look for in lead scoring software', 'Good scoring is transparent, updates in real time, and is wired to action so high scores actually get worked.', ['Explainable scores, not a black box', 'Real-time recalculation as behavior changes', 'Routing and sequence triggers tied to the score', 'Fit and intent handled separately then combined']],
      ['How Rally does lead scoring', 'Rally scores on fit and engagement as leads arrive, routes the best ones to the right rep, and lets Rook open the conversation. As a lead engages more, the score climbs and Rally reprioritizes the queue automatically.'],
    ],
    [
      ['Does Rally score leads automatically?', 'Yes. Every lead is scored on capture and re-scored as engagement changes, with no manual tagging required.'],
      ['Can I customize scoring rules?', 'Yes. Adjust the weight of fit and engagement signals and see how scores shift before you commit the change.'],
      ['What happens to a high-scoring lead?', 'Rally can route it to the right owner and trigger a sequence, and Rook can draft and send the first touch so nothing hot goes cold.'],
    ]
  ),
  f(
    'lead-management-software',
    'Lead management software',
    'lead capture, routing, nurture, conversion',
    'Lead management software captures, organizes, routes, and nurtures leads from first touch to a qualified opportunity. Rally captures leads from forms and integrations, scores and routes them instantly, and lets Rook run first-touch outreach so no lead sits untouched and every source is measured end to end.',
    'Leads leak at the handoffs: capture, routing, first response, and nurture. Rally closes each gap so a lead moves forward the moment it arrives.',
    [
      ['Capture from every source', 'Web forms, integrations, imports, and manual entry all land in one lead inbox with source attribution attached.'],
      ['Instant routing and assignment', 'Route by territory, round-robin, or score so the right rep owns the lead in seconds.'],
      ['Rook runs first touch', 'Rook drafts and sends the opening outreach, books meetings, and logs every step so speed-to-lead stays fast.'],
      ['Convert with full context', 'Turn a qualified lead into a deal with contact, company, and activity history carried over, no re-keying.'],
    ],
    [
      ['What to look for in lead management software', 'Look for fast capture, reliable routing, built-in nurture, and clean conversion into opportunities.', ['Multi-source capture with attribution', 'Rules-based and score-based routing', 'Automated first-response and follow-up', 'One-click conversion to a deal']],
      ['How Rally does lead management', 'Rally unifies capture, scoring, routing, and nurture in one place. Rook keeps first response fast, and conversion into a deal carries the full history so account executives start with context instead of a blank record.'],
    ],
    [
      ['How fast can Rally respond to a new lead?', 'Rook can respond within minutes of capture with a drafted, on-brand message, which is where most speed-to-lead advantage comes from.'],
      ['Can I track lead source ROI?', 'Yes. Every lead carries its source, so Rally reports conversion and revenue by channel without extra tagging.'],
      ['How do leads become deals?', 'A qualified lead converts to a deal in one click, carrying contact, company, and activity history so nothing is lost in the handoff.'],
    ]
  ),
  f(
    'contact-management-software',
    'Contact management software',
    'contact database, activity history, relationships',
    'Contact management software stores people, their details, and every interaction in one searchable place. Rally keeps a full contact record with roles, company links, and a complete activity timeline, and Rook enriches and de-duplicates automatically so your database stays clean without manual upkeep.',
    'A contact record is only as good as its context. Rally links every person to their company, deals, and full history so anyone can pick up the relationship instantly.',
    [
      ['Unified contact timeline', 'Emails, calls, meetings, and notes attach to each contact automatically for a complete history at a glance.'],
      ['People linked to companies and deals', 'Every contact ties to their company and any deals they touch, so you see the whole relationship in one view.'],
      ['Rook keeps data clean', 'Rook merges duplicates, fills missing fields, and flags stale records so the database stays trustworthy.'],
      ['Fast search and segments', 'Find any contact instantly and build saved segments by role, industry, or activity.'],
    ],
    [
      ['What to look for in contact management software', 'You want a clean, linked, searchable database with automatic activity capture and easy segmentation.', ['Automatic email and calendar logging', 'Company and deal relationships on every contact', 'Duplicate detection and merge', 'Fast search and reusable segments']],
      ['How Rally does contact management', 'Rally captures activity automatically, links people to companies and deals, and lets Rook enrich and de-dupe in the background so the record you open is complete and current.'],
    ],
    [
      ['Does Rally log emails and meetings automatically?', 'Yes. Connected email and calendar activity attaches to the right contact automatically, so the timeline builds itself.'],
      ['How does Rally handle duplicate contacts?', 'Rook detects likely duplicates and can merge them, preserving history so you keep one clean record per person.'],
      ['Can I segment contacts?', 'Yes. Build saved segments by role, industry, company size, or activity and reuse them across campaigns and reports.'],
    ]
  ),
  f(
    'pipeline-management-software',
    'Pipeline management software',
    'sales pipeline, stages, deal velocity',
    'Pipeline management software visualizes deals across stages so teams can move opportunities forward and spot where revenue stalls. Rally ships a visual pipeline that is alive on day one, with drag-to-advance stages, weighted values, and Rook watching for stuck deals and missing next steps.',
    'A pipeline should answer three questions instantly: what is here, what is stuck, and what to do next. Rally answers all three without a report build.',
    [
      ['Visual, drag-to-advance stages', 'Move deals through stages by drag or from the record, with amounts and close dates rolling up live.'],
      ['Velocity and aging signals', 'See how long deals sit in each stage and get flagged when one ages past your norm.'],
      ['Rook chases stuck deals', 'Rook surfaces deals with no next step or a slipping close date and drafts the nudge to move them.'],
      ['Multiple pipelines', 'Run separate pipelines for new business, renewals, and partnerships without cross-contaminating your forecast.'],
    ],
    [
      ['What to look for in pipeline management software', 'Look for a clear visual board, stage velocity insight, and automation that keeps deals moving.', ['Drag-to-advance stages with live roll-ups', 'Stage aging and velocity metrics', 'Next-step enforcement and reminders', 'Support for multiple pipelines']],
      ['How Rally does pipeline management', 'Rally gives every team a live pipeline the day they start. Deals carry amount, stage, and next step, velocity is visible per stage, and Rook flags the deals that need attention before they slip.'],
    ],
    [
      ['Can I run more than one pipeline?', 'Yes. Create separate pipelines for new business, renewals, or partner deals, each with its own stages.'],
      ['How does Rally show stuck deals?', 'Rally tracks stage aging and missing next steps, and Rook surfaces the specific deals stalling so you can act.'],
      ['Is the pipeline customizable?', 'Yes. Rename stages, set stage probabilities, and choose which fields show on the board.'],
    ]
  ),
  f(
    'deal-management-software',
    'Deal management software',
    'deal tracking, line items, buying committee',
    'Deal management software tracks each opportunity through to close with its value, stakeholders, and next steps in one record. Rally ships a deep deal object with line items, buying committee, competitors, and a full activity timeline, and Rook keeps next steps and close dates honest so deals do not drift.',
    'Shallow deal records lose the details that decide the outcome. Rally makes the deal the richest object in the CRM.',
    [
      ['Deep deal object', 'Line items, amounts, buying committee, competitors, and stage all live on the deal, not scattered across notes.'],
      ['Next-step enforcement', 'Every deal carries an owner and a next step, and Rally flags any deal missing one.'],
      ['Rook advances deals', 'Rook drafts follow-ups, updates close dates, and surfaces risk so momentum holds between meetings.'],
      ['Full activity timeline', 'Emails, calls, and meetings attach automatically so anyone can catch up on a deal in seconds.'],
    ],
    [
      ['What to look for in deal management software', 'You want a rich deal record, enforced next steps, and automation that keeps deals current.', ['Line items and product-level detail', 'Buying committee and competitor tracking', 'Required next steps and close dates', 'Automatic activity capture']],
      ['How Rally does deal management', 'Rally treats the deal as a first-class object with everything the outcome depends on. Rook watches for missing next steps and slipping dates and drafts the actions to keep each deal moving.'],
    ],
    [
      ['Can I track line items on a deal?', 'Yes. Add products and quantities to a deal so amounts roll up accurately into the forecast.'],
      ['Does Rally track the buying committee?', 'Yes. Capture every stakeholder, their role, and their sentiment on the deal record.'],
      ['How does Rally prevent deals from stalling?', 'Rally requires a next step on every deal and Rook surfaces any that lack one or have a slipping close date.'],
    ]
  ),
  f(
    'opportunity-management-software',
    'Opportunity management software',
    'opportunity tracking, stages, win rate',
    'Opportunity management software manages qualified deals from creation to close, tracking stage, value, and probability. Rally structures opportunities with stages, weighted amounts, and required next steps, and Rook monitors win-rate patterns and at-risk deals so managers coach on the deals that will move the number.',
    'Opportunity management is where forecasting, coaching, and execution meet. Rally keeps all three on one record.',
    [
      ['Stage-based probability', 'Each stage carries a probability so weighted pipeline and forecast stay accurate as deals advance.'],
      ['Win-rate insight', 'See win rates by stage, source, and rep to find where opportunities are really won and lost.'],
      ['Rook flags risk early', 'Rook watches for opportunities with no movement, missing stakeholders, or slipping dates and surfaces them for coaching.'],
      ['Clean handoff from lead', 'Opportunities inherit full lead and contact history so nothing is lost at qualification.'],
    ],
    [
      ['What to look for in opportunity management software', 'Look for structured stages, probability-weighted values, and visibility into win rates and risk.', ['Stage probabilities feeding the forecast', 'Win-rate reporting by segment', 'Risk signals on individual opportunities', 'Full history carried from the lead']],
      ['How Rally does opportunity management', 'Rally links each opportunity to its contacts, company, and history, weights it by stage, and lets Rook surface the ones that need attention so time goes to the deals that matter.'],
    ],
    [
      ['What is the difference between a lead and an opportunity in Rally?', 'A lead is an unqualified contact or inquiry; an opportunity is a qualified deal with a value and stage. Rally converts one into the other in a click.'],
      ['Can I see win rates by rep?', 'Yes. Rally reports win rate by rep, stage, source, and product so you can coach precisely.'],
      ['How are probabilities set?', 'Each stage has a default probability you control, and it feeds the weighted forecast automatically.'],
    ]
  ),
  f(
    'cpq-software',
    'CPQ software',
    'configure price quote, discounting, approvals',
    'CPQ (configure, price, quote) software turns product selections into accurate, approved quotes fast. Rally builds quotes from your product catalog with line items, discounts, and approval rules, and Rook assembles a first-draft quote from the deal so reps stop rebuilding pricing in spreadsheets.',
    'CPQ removes the two things that slow quoting: pricing errors and approval delays. Rally handles both inside the deal.',
    [
      ['Catalog-driven quotes', 'Pull products, prices, and terms from a managed catalog so every quote is consistent and current.'],
      ['Discount and approval rules', 'Set guardrails so standard discounts flow through and only exceptions need a manager sign-off.'],
      ['Rook drafts the quote', 'Rook proposes line items and pricing from the deal, so the rep edits instead of starting from zero.'],
      ['Quote to proposal to signature', 'Move from an approved quote to a branded proposal and e-signature without leaving Rally.'],
    ],
    [
      ['What to look for in CPQ software', 'Look for a managed catalog, discount guardrails, approval workflows, and a clean path to signature.', ['Product catalog with rules and bundles', 'Automated discount approvals', 'Accurate line-item totals feeding the forecast', 'Quote to e-signature in one flow']],
      ['How Rally does CPQ', 'Rally keeps quoting inside the deal. The catalog drives pricing, approval rules keep discounts in bounds, and Rook drafts the first quote so reps send accurate pricing in minutes.'],
    ],
    [
      ['Does Rally handle discount approvals?', 'Yes. Set thresholds so standard discounts auto-approve and larger ones route to the right approver.'],
      ['Can quotes become proposals?', 'Yes. An approved quote flows into Rally Studio as a branded proposal and on to e-signature.'],
      ['Do quote totals affect the forecast?', 'Yes. Line-item totals roll into the deal amount and the weighted forecast automatically.'],
    ]
  ),
  f(
    'proposal-software',
    'Proposal software',
    'proposal builder, templates, tracking',
    'Proposal software helps teams create, send, and track branded sales proposals. Rally Studio builds proposals from reusable templates that pull deal and pricing data automatically, tracks when a prospect opens and reads each section, and lets Rook draft the first version so reps send in minutes, not hours.',
    'A proposal is a sales tool, not a document chore. Rally makes it fast to build and easy to learn from.',
    [
      ['Templates that pull live data', 'Proposals populate contact, company, and pricing from the deal so there is no copy-paste.'],
      ['Read tracking', 'See when a proposal is opened, which sections get attention, and when to follow up.'],
      ['Rook drafts the first version', 'Rook assembles a proposal from the deal and your template so the rep refines instead of starting blank.'],
      ['On-brand and consistent', 'Central templates keep every proposal on brand and legally consistent.'],
    ],
    [
      ['What to look for in proposal software', 'Look for reusable templates, live data merge, engagement tracking, and a fast path to signature.', ['Branded, reusable templates', 'Automatic merge of deal and pricing data', 'Open and section-level read tracking', 'Built-in e-signature']],
      ['How Rally does proposals', 'Rally Studio turns the deal into a proposal in a click, tracks how the prospect engages, and hands off to e-signature, all in one price with the rest of the platform.'],
    ],
    [
      ['Can Rally track when a proposal is viewed?', 'Yes. Studio shows opens and which sections get the most attention so you can time follow-up.'],
      ['Do proposals pull data from the deal?', 'Yes. Contact, company, line items, and pricing merge automatically, so nothing is re-keyed.'],
      ['Can I send proposals for signature?', 'Yes. E-signature is built in, so a proposal goes from draft to signed inside Rally.'],
    ]
  ),
  f(
    'e-signature-software',
    'E-signature software',
    'electronic signatures, audit trail, legality',
    'E-signature software lets you send documents for legally binding electronic signature and track their status. Rally includes e-signature on proposals and quotes with a full audit trail, reminders, and status on the deal, so contracts close inside the CRM instead of bouncing to a separate signing tool.',
    'The signature is the last mile of the deal. Rally keeps it attached to the record so status is never a mystery.',
    [
      ['Sign inside the deal', 'Send a quote or proposal for signature and watch status update on the deal without leaving Rally.'],
      ['Audit trail and reminders', 'Every signature carries a timestamped audit trail, and Rook can nudge signers who go quiet.'],
      ['No separate signing tool', 'E-signature is bundled, so there is no extra per-envelope bill or second login.'],
      ['Status feeds the forecast', 'A signed document can move the deal to closed-won automatically, keeping the forecast honest.'],
    ],
    [
      ['What to look for in e-signature software', 'Look for legal validity, an audit trail, reminders, and tight CRM integration.', ['Legally binding signatures with audit trail', 'Automatic reminders to signers', 'Status synced to the deal record', 'No per-envelope surprise fees']],
      ['How Rally does e-signature', 'Rally sends proposals and quotes for signature from the deal, tracks status inline, and can advance the deal on signing, so the whole close happens in one system.'],
    ],
    [
      ['Are Rally e-signatures legally binding?', 'Yes. Signatures carry a timestamped audit trail consistent with common e-signature standards.'],
      ['Is there a per-envelope charge?', 'No. E-signature is included in Rally at one price, with no per-document metering.'],
      ['Does signing update the deal?', 'Yes. A signed document can move the deal to closed-won and update the forecast automatically.'],
    ]
  ),
  f(
    'invoicing-software',
    'Invoicing software',
    'invoices, payment tracking, accounts receivable',
    'Invoicing software creates, sends, and tracks invoices so you get paid on time. Rally generates invoices from closed deals and line items, tracks payment status, and lets Rook chase overdue balances, so billing flows straight from the sale instead of being re-entered in a separate accounting tool.',
    'When the deal already holds the line items, the invoice should write itself. Rally connects the sale to the money owed.',
    [
      ['Invoices from closed deals', 'Generate an invoice from the deal line items so amounts match what was sold.'],
      ['Payment status tracking', 'See sent, viewed, paid, and overdue at a glance across every account.'],
      ['Rook chases receivables', 'Rook drafts polite, escalating reminders for overdue invoices so cash comes in faster.'],
      ['Clean handoff to accounting', 'Export or sync invoice and payment data to your accounting stack without re-keying.'],
    ],
    [
      ['What to look for in invoicing software', 'Look for invoices generated from real sales data, clear status tracking, and automated collections.', ['One-click invoice from a closed deal', 'Status from sent to paid', 'Automated overdue reminders', 'Sync to accounting tools']],
      ['How Rally does invoicing', 'Rally turns a closed deal into an invoice with the correct line items, tracks payment status on the account, and lets Rook handle the follow-up so receivables do not slip.'],
    ],
    [
      ['Can Rally create invoices from deals?', 'Yes. A closed deal generates an invoice from its line items, so the amounts match the sale.'],
      ['Does Rally track overdue invoices?', 'Yes. Rally shows overdue balances and Rook can send escalating reminders automatically.'],
      ['Can I sync invoices to accounting?', 'Yes. Invoice and payment data can export or integrate with tools like QuickBooks and Xero.'],
    ]
  ),
  f(
    'billing-software',
    'Billing software',
    'recurring billing, usage, payment collection',
    'Billing software manages what customers owe, including one-time, recurring, and usage-based charges, and collects payment. Rally connects billing to the deal and account so subscriptions, renewals, and invoices stay in sync with the revenue record, and Rook flags failed payments and upcoming renewals before they cost you.',
    'Billing that lives apart from the CRM drifts out of sync. Rally keeps what a customer pays tied to the account it belongs to.',
    [
      ['Recurring and usage billing', 'Handle subscriptions, seats, and usage charges tied to the account they belong to.'],
      ['Renewal and dunning awareness', 'Rally surfaces upcoming renewals and failed payments so revenue is protected proactively.'],
      ['Rook protects revenue', 'Rook flags failed charges and expiring cards and drafts the outreach to recover them.'],
      ['One source of truth', 'Billing, deals, and accounts share one record so finance and sales see the same numbers.'],
    ],
    [
      ['What to look for in billing software', 'Look for flexible billing models, renewal awareness, dunning, and tight CRM alignment.', ['Recurring, seat, and usage-based billing', 'Renewal and expiration tracking', 'Automated dunning on failed payments', 'Shared record with deals and accounts']],
      ['How Rally does billing', 'Rally ties billing to the account and deal, tracks recurring and usage charges, and lets Rook catch failed payments and upcoming renewals so revenue does not leak.'],
    ],
    [
      ['Does Rally support recurring billing?', 'Yes. Rally handles subscriptions and usage-based charges tied to each account.'],
      ['How does Rally handle failed payments?', 'Rally flags failed charges and Rook can run dunning outreach to recover them.'],
      ['Is billing connected to the CRM record?', 'Yes. Billing shares the same account and deal records, so sales and finance see one source of truth.'],
    ]
  ),
  f(
    'sales-automation-software',
    'Sales automation software',
    'workflow triggers, auto follow-up, task automation',
    'Sales automation software removes repetitive selling tasks like data entry, follow-ups, and handoffs. Rally automates activity logging, task creation, routing, and reminders, and Rook executes multi-step work such as drafting emails and updating deals, so reps spend time selling instead of maintaining the CRM.',
    'Most sales automation stops at reminders. Rally goes further because Rook actually does the work, not just prompts you to.',
    [
      ['Automatic data capture', 'Emails, meetings, and calls log themselves to the right records, ending manual entry.'],
      ['Trigger-based workflows', 'When a deal changes stage or a lead is scored, Rally fires the right task, email, or handoff.'],
      ['Rook executes work', 'Rook drafts and sends follow-ups, updates deals, and books meetings rather than only reminding you to.'],
      ['Consistent process', 'Automated plays keep every rep following the winning motion without micromanagement.'],
    ],
    [
      ['What to look for in sales automation software', 'Look for automatic data capture, flexible triggers, and automation that executes rather than just reminds.', ['Auto-logging of activity', 'Event-driven workflow triggers', 'Automation that takes action, not just notifies', 'Guardrails so reps stay in control']],
      ['How Rally does sales automation', 'Rally captures activity automatically and fires workflows on real events. Where other tools stop at a reminder, Rook completes the task, so the automation produces finished work.'],
    ],
    [
      ['What can Rook automate?', 'Rook can draft and send follow-ups, update deal fields, create tasks, book meetings, and prepare quotes and proposals from the deal.'],
      ['Do I lose control with automation?', 'No. You set guardrails and can require review before anything sends, so automation stays on-brand and accurate.'],
      ['Does automation reduce data entry?', 'Yes. Activity capture and Rook together eliminate most manual logging and updates.'],
    ]
  ),
  f(
    'workflow-automation-software',
    'Workflow automation software',
    'visual workflows, triggers, no-code rules',
    'Workflow automation software runs multi-step business processes automatically based on triggers and conditions. Rally includes a visual workflow builder where any event, from a new lead to a closed deal, can drive tasks, emails, field updates, and routing, and Rook can be a step that performs real work inside the flow.',
    'A workflow engine is only useful if non-engineers can build it. Rally makes automations visual and puts Rook inside them.',
    [
      ['Visual, no-code builder', 'Assemble triggers, conditions, and actions on a canvas without writing code.'],
      ['Any event as a trigger', 'Start a workflow from a stage change, form submission, score threshold, or date.'],
      ['Rook as a workflow step', 'Insert Rook to draft an email, summarize a deal, or update records mid-flow.'],
      ['Cross-module actions', 'One workflow can touch leads, deals, contacts, tasks, and campaigns together.'],
    ],
    [
      ['What to look for in workflow automation software', 'Look for a visual builder, rich triggers and conditions, and actions that span your whole CRM.', ['No-code visual canvas', 'Event, schedule, and condition triggers', 'Actions across leads, deals, and contacts', 'AI steps that perform real work']],
      ['How Rally does workflow automation', 'Rally lets anyone build automations visually across every module, and Rook can be dropped in as a step that drafts, summarizes, or updates, so workflows produce finished output.'],
    ],
    [
      ['Do I need code to build workflows?', 'No. Rally workflows are built visually with triggers, conditions, and actions, no code required.'],
      ['Can a workflow update multiple objects?', 'Yes. A single workflow can update leads, deals, contacts, and tasks together.'],
      ['Can AI be part of a workflow?', 'Yes. Rook can be a workflow step that drafts content, summarizes, or updates records automatically.'],
    ]
  ),
  f(
    'marketing-automation-software',
    'Marketing automation software',
    'nurture campaigns, segmentation, lead handoff',
    'Marketing automation software nurtures leads with targeted campaigns and hands qualified ones to sales. Rally runs campaigns and sequences off the same contact data sales uses, so segmentation is accurate, handoffs are clean, and revenue is attributed end to end without stitching a separate marketing platform to the CRM.',
    'Marketing and sales fail at the seam between their tools. Rally removes the seam by sharing one database.',
    [
      ['Campaigns on shared data', 'Segment and nurture off the same records sales works, so targeting is always current.'],
      ['Clean sales handoff', 'When a lead is ready, it routes to a rep with full campaign history attached.'],
      ['Rook drafts campaign content', 'Rook writes and personalizes nurture emails so marketing ships faster.'],
      ['Closed-loop attribution', 'Because leads become deals in the same system, revenue ties back to the campaign that sourced it.'],
    ],
    [
      ['What to look for in marketing automation software', 'Look for shared data with sales, strong segmentation, and real revenue attribution.', ['Segmentation on live CRM data', 'Multi-step nurture campaigns', 'Automatic handoff to sales', 'Revenue attribution by campaign']],
      ['How Rally does marketing automation', 'Rally runs nurture and campaigns on the same database as sales, so segments are accurate, handoffs carry history, and attribution ties campaigns to closed revenue.'],
    ],
    [
      ['Does Rally replace a separate marketing platform?', 'For most teams, yes. Campaigns, sequences, and segmentation run natively on your CRM data at one price.'],
      ['Can I attribute revenue to campaigns?', 'Yes. Because leads convert to deals in the same system, Rally attributes closed revenue to source campaigns.'],
      ['How are qualified leads handed to sales?', 'Rally routes them to the right rep automatically with full campaign and activity history attached.'],
    ]
  ),
  f(
    'email-marketing-software',
    'Email marketing software',
    'email campaigns, segmentation, deliverability',
    'Email marketing software sends targeted email campaigns and measures how they perform. Rally sends campaigns to segments built from live CRM data, tracks opens, clicks, and replies against the contact record, and lets Rook draft and personalize copy, so email connects directly to pipeline instead of living in a silo.',
    'Email marketing works best when the list and the results live where deals live. Rally keeps both in the CRM.',
    [
      ['Live-segment sends', 'Target campaigns to segments built from current CRM fields and behavior.'],
      ['Per-contact tracking', 'Opens, clicks, and replies attach to the contact so sales sees engagement in context.'],
      ['Rook writes and personalizes', 'Rook drafts subject lines and body copy tuned to each segment.'],
      ['Pipeline connection', 'Engagement can raise lead scores and trigger follow-up so email drives deals.'],
    ],
    [
      ['What to look for in email marketing software', 'Look for live segmentation, reliable deliverability, and results tied to the CRM record.', ['Segments from live CRM data', 'Open, click, and reply tracking per contact', 'AI-assisted copy', 'Engagement that feeds scoring and follow-up']],
      ['How Rally does email marketing', 'Rally sends to CRM segments, records engagement on each contact, and lets Rook draft copy, so email feeds scoring, routing, and pipeline rather than sitting apart.'],
    ],
    [
      ['Can I segment email lists from CRM data?', 'Yes. Build segments from any field or behavior, and they stay current as records change.'],
      ['Does email engagement affect scoring?', 'Yes. Opens, clicks, and replies can raise lead scores and trigger follow-up automatically.'],
      ['Can Rook write campaign emails?', 'Yes. Rook drafts and personalizes subject lines and body copy for each segment.'],
    ]
  ),
  f(
    'email-tracking-software',
    'Email tracking software',
    'open tracking, click tracking, reply detection',
    'Email tracking software tells you when a prospect opens your email, clicks a link, or replies. Rally tracks sent emails against the contact and deal, notifies the rep on opens and clicks, and lets Rook time follow-up around real engagement, so reps reach out when interest is highest instead of guessing.',
    'Knowing the moment a prospect engages changes when and how you follow up. Rally puts that signal on the record.',
    [
      ['Open and click alerts', 'Get notified the moment a tracked email is opened or a link is clicked.'],
      ['Engagement on the record', 'Every tracked event attaches to the contact and deal timeline for full context.'],
      ['Rook times follow-up', 'Rook can trigger a follow-up when engagement spikes so you reach out at the right moment.'],
      ['Team-wide visibility', 'Managers see engagement across the team to coach on messaging that lands.'],
    ],
    [
      ['What to look for in email tracking software', 'Look for reliable open and click detection, record-level logging, and follow-up triggers.', ['Open, click, and reply detection', 'Events logged to contact and deal', 'Real-time notifications', 'Automated follow-up on engagement']],
      ['How Rally does email tracking', 'Rally tracks engagement on every sent email, attaches it to the record, and lets Rook act on spikes, so follow-up is timed to real interest.'],
    ],
    [
      ['Does Rally notify me when an email is opened?', 'Yes. You get real-time alerts on opens and link clicks for tracked emails.'],
      ['Where is tracking data stored?', 'Every event attaches to the contact and deal timeline so the whole team sees engagement in context.'],
      ['Can follow-up be automated on engagement?', 'Yes. Rook can trigger a follow-up when a prospect opens or clicks so you strike while interest is high.'],
    ]
  ),
  f(
    'email-sequence-software',
    'Email sequence software',
    'automated sequences, cadences, multi-step outreach',
    'Email sequence software sends a scheduled series of emails and tasks until a prospect replies or the sequence ends. Rally runs multi-step sequences that pause on reply, branch on engagement, and mix email with call and task steps, and Rook personalizes each send so cadences feel human instead of mass-blasted.',
    'A sequence should feel like a person, not a machine. Rally personalizes every step and stops the moment someone replies.',
    [
      ['Multi-channel steps', 'Combine emails, calls, and manual tasks into one cadence per persona or stage.'],
      ['Auto-pause on reply', 'Sequences stop instantly when a prospect responds so no one gets an awkward next touch.'],
      ['Rook personalizes each send', 'Rook tailors each step to the contact so outreach reads one-to-one, not templated.'],
      ['Performance by step', 'See reply and meeting rates at each step to cut what does not work.'],
    ],
    [
      ['What to look for in email sequence software', 'Look for multi-channel steps, reliable reply detection, and per-step analytics.', ['Email, call, and task steps', 'Automatic pause on reply', 'AI personalization per step', 'Reply and meeting analytics by step']],
      ['How Rally does sequences', 'Rally runs sequences that branch on engagement and pause on reply, with Rook personalizing each touch, so reps scale outreach without sounding automated.'],
    ],
    [
      ['Do sequences stop when someone replies?', 'Yes. Rally pauses a sequence the moment a prospect responds so follow-up never feels robotic.'],
      ['Can sequences include calls and tasks?', 'Yes. Mix email, call, and manual task steps in a single cadence.'],
      ['Can Rook personalize each email?', 'Yes. Rook tailors every step to the contact so the cadence reads one-to-one.'],
    ]
  ),
  f(
    'cold-outreach-software',
    'Cold outreach software',
    'cold email, prospecting cadences, deliverability',
    'Cold outreach software helps teams prospect new accounts at scale with personalized, compliant campaigns. Rally combines list building, sequences, and deliverability safeguards with Rook writing tailored openers, so cold outreach lands in inboxes and books meetings instead of getting flagged as spam or ignored.',
    'Cold outreach lives or dies on relevance and deliverability. Rally protects both while keeping volume high.',
    [
      ['Targeted list building', 'Build prospect lists from CRM data and enrichment so you reach the right accounts.'],
      ['Deliverability safeguards', 'Sending limits and warmup-friendly pacing protect domain reputation.'],
      ['Rook writes relevant openers', 'Rook drafts personalized first lines from company and role context so cold reads warm.'],
      ['Meeting-focused cadences', 'Sequences push toward a booked meeting and hand off cleanly to the calendar.'],
    ],
    [
      ['What to look for in cold outreach software', 'Look for good targeting, deliverability protection, personalization, and meeting booking.', ['List building from CRM and enrichment', 'Sending limits that protect reputation', 'AI-personalized first touches', 'Direct path to a booked meeting']],
      ['How Rally does cold outreach', 'Rally builds targeted lists, paces sends to protect deliverability, and lets Rook personalize openers, so campaigns book meetings rather than burn domains.'],
    ],
    [
      ['How does Rally protect email deliverability?', 'Rally paces sends and enforces limits that keep volume within healthy ranges for your domain.'],
      ['Can Rook personalize cold emails?', 'Yes. Rook writes tailored opening lines from company and role data so cold outreach feels relevant.'],
      ['Does outreach book meetings automatically?', 'Cadences drive toward a meeting and hand off to scheduling so booked time lands on the calendar.'],
    ]
  ),
  f(
    'sales-engagement-software',
    'Sales engagement software',
    'multi-channel engagement, cadences, activity',
    'Sales engagement software orchestrates every rep touch (email, call, social, task) across accounts and measures what works. Rally unifies engagement on the CRM record so every touch is logged in context, and Rook runs cadences and drafts messages, giving reps one place to execute outreach and managers one place to coach it.',
    'Engagement tools that sit beside the CRM create double entry. Rally makes the CRM the engagement layer.',
    [
      ['Unified touch history', 'Every email, call, and task logs to the contact and deal automatically.'],
      ['Cadence execution', 'Run and manage multi-channel cadences from the same records deals live on.'],
      ['Rook drives the day', 'Rook prioritizes the queue, drafts messages, and books meetings so reps stay in flow.'],
      ['Coaching visibility', 'Managers see engagement and outcomes per rep to coach on what converts.'],
    ],
    [
      ['What to look for in sales engagement software', 'Look for unified logging, multi-channel cadences, and manager visibility, all tied to the CRM.', ['Automatic touch logging', 'Multi-channel cadences', 'AI-prioritized daily queue', 'Rep-level engagement analytics']],
      ['How Rally does sales engagement', 'Rally runs engagement on the CRM record itself, so there is no separate tool to sync. Rook prioritizes and drafts, and managers coach from real activity and outcomes.'],
    ],
    [
      ['Is sales engagement separate from the CRM in Rally?', 'No. Engagement runs natively on the CRM record, so every touch is logged in context with no sync.'],
      ['Can Rook run a rep day?', 'Yes. Rook prioritizes the queue, drafts messages, and books meetings so reps execute faster.'],
      ['Can managers see engagement by rep?', 'Yes. Rally reports touches, replies, and outcomes per rep for precise coaching.'],
    ]
  ),
  f(
    'sales-dialer-software',
    'Sales dialer software',
    'power dialer, click-to-call, call logging',
    'Sales dialer software lets reps call prospects from the CRM with click-to-call, logging, and recording. Rally connects to your phone system so calls launch from the contact, log automatically with notes and outcomes, and feed conversation insights, so reps make more connects and managers coach from real calls, not memory.',
    'Every call a rep makes should enrich the record automatically. Rally turns dialing into data.',
    [
      ['Click-to-call from records', 'Launch a call from any contact or deal and skip manual dialing.'],
      ['Automatic call logging', 'Calls log with duration, outcome, and notes attached to the right record.'],
      ['Recording and insights', 'Recordings and transcripts feed conversation intelligence for coaching.'],
      ['Rook preps and follows up', 'Rook briefs the rep before a call and drafts the follow-up after it.'],
    ],
    [
      ['What to look for in sales dialer software', 'Look for CRM-native calling, automatic logging, recording, and coaching insight.', ['Click-to-call and power dialing', 'Automatic logging with outcomes', 'Recording and transcription', 'Follow-up drafted from the call']],
      ['How Rally does dialing', 'Rally connects your phone system to the CRM so calls launch from records, log themselves, and feed insights, while Rook preps the call and drafts the follow-up.'],
    ],
    [
      ['Does Rally log calls automatically?', 'Yes. Calls log with duration, outcome, and notes attached to the contact and deal.'],
      ['Can I record and transcribe calls?', 'Yes. Recordings and transcripts feed conversation intelligence for coaching and search.'],
      ['Does Rally bring its own phone system?', 'Rally connects to phone providers like Aircall, RingCentral, and Dialpad so calling works from the record.'],
    ]
  ),
  f(
    'meeting-scheduling-software',
    'Meeting scheduling software',
    'booking links, round-robin, calendar sync',
    'Meeting scheduling software lets prospects book time without the back-and-forth by sharing availability. Rally provides booking links and round-robin routing tied to the CRM, so a booked meeting creates or updates the right record, notifies the owner, and lets Rook prep an agenda, turning a calendar hold into pipeline context.',
    'A booked meeting should do more than block time. Rally makes it update the CRM and prep the rep.',
    [
      ['Booking links and availability', 'Share a link so prospects self-book without email tennis.'],
      ['Round-robin routing', 'Distribute inbound meetings across a team fairly and by territory or product.'],
      ['CRM-linked bookings', 'Each booking creates or updates the contact and deal automatically.'],
      ['Rook preps the meeting', 'Rook assembles an agenda and context brief before the call.'],
    ],
    [
      ['What to look for in meeting scheduling software', 'Look for shared availability, team routing, and CRM-linked bookings.', ['Personal and team booking links', 'Round-robin and territory routing', 'Automatic record creation on booking', 'Reminders that cut no-shows']],
      ['How Rally does scheduling', 'Rally booking links and round-robin routing tie to the CRM, so every meeting updates the record, notifies the owner, and gets a Rook-prepared brief.'],
    ],
    [
      ['Does a booked meeting update the CRM?', 'Yes. Bookings create or update the contact and deal and notify the owner automatically.'],
      ['Can meetings round-robin across a team?', 'Yes. Route inbound meetings fairly by team, territory, or product.'],
      ['Can Rook prepare for the meeting?', 'Yes. Rook assembles an agenda and context brief so reps walk in ready.'],
    ]
  ),
  f(
    'calendar-software',
    'Calendar software',
    'calendar sync, availability, scheduling',
    'Calendar software organizes meetings and availability and syncs across tools. Rally two-way syncs with Google and Outlook calendars so meetings, availability, and CRM activity stay aligned, every meeting attaches to the right contact and deal, and Rook can schedule, reschedule, and prep on your behalf without leaving the record.',
    'The calendar is where selling time actually gets spent. Rally connects it to the deals that time is for.',
    [
      ['Two-way calendar sync', 'Google and Outlook events sync both directions so nothing is double-booked.'],
      ['Meetings on the record', 'Each event links to the relevant contact and deal for full context.'],
      ['Availability for booking', 'Real-time availability powers booking links and round-robin routing.'],
      ['Rook manages the calendar', 'Rook can schedule, move, and prep meetings from a request.'],
    ],
    [
      ['What to look for in calendar software', 'Look for reliable two-way sync, CRM linkage, and easy availability sharing.', ['Two-way Google and Outlook sync', 'Events linked to CRM records', 'Real-time availability', 'AI scheduling assistance']],
      ['How Rally does calendar', 'Rally syncs your calendar both ways, links every meeting to the record, and lets Rook schedule and prep, so calendar time maps to pipeline.'],
    ],
    [
      ['Which calendars does Rally sync with?', 'Rally two-way syncs with Google Calendar and Outlook Calendar.'],
      ['Do meetings link to CRM records?', 'Yes. Each event attaches to the relevant contact and deal automatically.'],
      ['Can Rook schedule for me?', 'Yes. Rook can book, reschedule, and prep meetings on your behalf.'],
    ]
  ),
  f(
    'sales-reporting-software',
    'Sales reporting software',
    'sales reports, activity, pipeline metrics',
    'Sales reporting software turns CRM activity and pipeline into reports leaders use to run the business. Rally ships live reports on pipeline, activity, conversion, and win rates that update as records change, so you skip the weekly export-and-format ritual and Rook can answer reporting questions in plain language on demand.',
    'A report you rebuild every Monday is a tax. Rally makes reports live so the number is always current.',
    [
      ['Live, no-build reports', 'Pipeline, activity, and conversion reports update automatically as records change.'],
      ['Drill to the records', 'Click any number to see the exact deals or activities behind it.'],
      ['Rook answers questions', 'Ask Rook a reporting question in plain language and get an answer with the data.'],
      ['Shareable and scheduled', 'Share reports with the team or schedule a recurring digest.'],
    ],
    [
      ['What to look for in sales reporting software', 'Look for live data, drill-down, and the ability to answer ad hoc questions fast.', ['Auto-updating reports', 'Drill-down to underlying records', 'Natural-language querying', 'Scheduled report delivery']],
      ['How Rally does sales reporting', 'Rally reports update live from CRM data and let you drill into records, while Rook answers ad hoc questions in plain language, so reporting stops eating your week.'],
    ],
    [
      ['Do I have to build reports by hand?', 'No. Rally ships live pipeline, activity, and conversion reports that update automatically.'],
      ['Can I drill into a report number?', 'Yes. Click any metric to see the exact deals or activities behind it.'],
      ['Can I just ask a reporting question?', 'Yes. Ask Rook in plain language and it answers with the underlying data.'],
    ]
  ),
  f(
    'revenue-reporting-software',
    'Revenue reporting software',
    'revenue reports, bookings, recurring revenue',
    'Revenue reporting software tracks bookings, recognized revenue, and recurring revenue so finance and sales see one number. Rally reports revenue from the same deals, invoices, and subscriptions the team works, so bookings, ARR, and attainment tie out without spreadsheet reconciliation, and Rook can explain any movement on demand.',
    'When sales and finance report from different tools, the numbers never match. Rally reports revenue from one source.',
    [
      ['One source for revenue', 'Bookings, invoices, and subscriptions report from the same records, so figures tie out.'],
      ['Recurring and one-time views', 'See new, recurring, and total revenue separately for a true picture.'],
      ['Attainment and pacing', 'Track revenue against plan and pace to period end.'],
      ['Rook explains movement', 'Ask Rook why revenue moved and get the deals and changes behind it.'],
    ],
    [
      ['What to look for in revenue reporting software', 'Look for a single source of truth, recurring-revenue support, and clear attainment views.', ['Bookings and recognized revenue in one place', 'Recurring vs one-time breakdown', 'Attainment against plan', 'Explainable movement']],
      ['How Rally does revenue reporting', 'Rally derives revenue reports from the deals, invoices, and subscriptions on the account, so sales and finance share one number, and Rook explains any change.'],
    ],
    [
      ['Does revenue reporting match finance?', 'Yes. Reports derive from the same records, so bookings, ARR, and attainment tie out.'],
      ['Can I see recurring revenue separately?', 'Yes. Rally separates new, recurring, and total revenue for a true picture.'],
      ['Can Rook explain a revenue change?', 'Yes. Ask Rook why revenue moved and it surfaces the deals and changes behind it.'],
    ]
  ),
  f(
    'dashboard-software',
    'Dashboard software',
    'sales dashboards, KPIs, real-time metrics',
    'Dashboard software displays key metrics in one live view so teams act on current numbers. Rally ships role-based dashboards for reps, managers, and leaders that are alive on day one, update as records change, and drill straight into the underlying deals, so everyone works from the same real-time picture instead of stale slides.',
    'A dashboard that is a day old drives yesterday decisions. Rally keeps every tile live and clickable.',
    [
      ['Live, role-based views', 'Reps, managers, and execs each get a dashboard tuned to their job, updated in real time.'],
      ['Clickable tiles', 'Every KPI drills into the exact records behind it, so numbers are never a mystery.'],
      ['Alive on day one', 'Dashboards populate immediately, no long configuration project.'],
      ['Rook surfaces insight', 'Rook highlights what changed and what needs attention on each dashboard.'],
    ],
    [
      ['What to look for in dashboard software', 'Look for live data, role-based layouts, and drill-down on every metric.', ['Real-time KPI tiles', 'Role-based dashboards', 'Drill-down to records', 'AI-surfaced changes']],
      ['How Rally does dashboards', 'Rally dashboards are live and role-based from day one, every tile drills to records, and Rook flags what moved, so the team acts on current reality.'],
    ],
    [
      ['Are Rally dashboards real-time?', 'Yes. Tiles update as records change, so you always see current numbers.'],
      ['Can I click into a dashboard metric?', 'Yes. Every KPI drills into the exact deals or activities behind it.'],
      ['Do dashboards work on day one?', 'Yes. Rally is alive with data immediately, so dashboards populate without a setup project.'],
    ]
  ),
  f(
    'revenue-analytics-software',
    'Revenue analytics software',
    'revenue trends, cohort, retention, drivers',
    'Revenue analytics software finds the drivers behind revenue: what grows it, what leaks it, and where to act. Rally analyzes pipeline, conversion, retention, and expansion off live data, so you see cohort trends, churn risk, and expansion opportunity in one place, and Rook can point to the specific accounts moving each metric.',
    'Revenue analytics should end in an action, not a chart. Rally connects the trend to the accounts behind it.',
    [
      ['Cohort and retention trends', 'See how revenue cohorts retain and expand over time to find durable growth.'],
      ['Leak detection', 'Spot where revenue leaks in conversion, churn, or discounting.'],
      ['Expansion signals', 'Surface accounts ripe for upsell based on usage and engagement.'],
      ['Rook names the accounts', 'Rook connects a metric to the specific accounts driving it so you can act.'],
    ],
    [
      ['What to look for in revenue analytics software', 'Look for cohort analysis, leak detection, and a path from insight to account-level action.', ['Cohort and retention views', 'Conversion and churn leak analysis', 'Expansion opportunity signals', 'Account-level drill-down']],
      ['How Rally does revenue analytics', 'Rally analyzes live pipeline, retention, and expansion, and Rook ties each trend to the accounts behind it, so analysis produces an action list, not just a dashboard.'],
    ],
    [
      ['Can Rally show revenue by cohort?', 'Yes. See how cohorts retain and expand over time to find durable growth.'],
      ['Does Rally flag churn risk?', 'Yes. Rally surfaces accounts at risk based on engagement and usage signals.'],
      ['Can I act on an analytics insight?', 'Yes. Rook connects each metric to the specific accounts driving it so you can take action.'],
    ]
  ),
  f(
    'sales-analytics-software',
    'Sales analytics software',
    'win rate, cycle time, rep performance',
    'Sales analytics software measures how selling actually works: win rates, cycle time, stage conversion, and rep performance. Rally computes these from live deal data so you see where deals slow and which motions win, and Rook highlights the patterns worth coaching, turning raw activity into decisions instead of a wall of charts.',
    'Sales analytics is about finding the two changes that move the number. Rally surfaces them from live data.',
    [
      ['Win rate and cycle time', 'Track conversion and how long deals take by stage, segment, and rep.'],
      ['Stage conversion analysis', 'See where deals fall out so you fix the leakiest stage first.'],
      ['Rep and team benchmarks', 'Compare performance to coach precisely and spread what works.'],
      ['Rook finds the pattern', 'Rook highlights the trends and outliers most worth acting on.'],
    ],
    [
      ['What to look for in sales analytics software', 'Look for win-rate, cycle-time, and stage-conversion analysis with clear coaching signal.', ['Win rate by segment and rep', 'Cycle time and velocity', 'Stage conversion and drop-off', 'AI-surfaced patterns']],
      ['How Rally does sales analytics', 'Rally computes win rate, cycle time, and stage conversion from live deals, and Rook surfaces the patterns most worth coaching, so analysis leads to action.'],
    ],
    [
      ['Can I see win rate by rep and stage?', 'Yes. Rally reports win rate, cycle time, and conversion by rep, stage, segment, and product.'],
      ['Where do deals slow down?', 'Rally shows stage conversion and drop-off so you fix the leakiest stage first.'],
      ['Does Rally surface what to coach?', 'Yes. Rook highlights the patterns and outliers most worth acting on.'],
    ]
  ),
  f(
    'territory-management-software',
    'Territory management software',
    'territory assignment, balancing, coverage',
    'Territory management software divides accounts among reps by geography, segment, or vertical and keeps coverage balanced. Rally assigns and rebalances territories with rules, routes new leads to the right owner automatically, and shows coverage gaps, so no account falls through the cracks and rebalancing does not mean a spreadsheet weekend.',
    'Territory design decides who owns what and how fairly. Rally keeps assignment and routing in sync automatically.',
    [
      ['Rule-based assignment', 'Assign accounts by geography, segment, size, or vertical with clear rules.'],
      ['Automatic lead routing', 'New leads route to the correct territory owner the moment they arrive.'],
      ['Coverage and balance views', 'See gaps and overloaded reps so you rebalance with data, not guesswork.'],
      ['Clean reassignment', 'Move accounts between reps with history intact when territories change.'],
    ],
    [
      ['What to look for in territory management software', 'Look for flexible rules, automatic routing, and clear coverage visibility.', ['Geo, segment, and vertical rules', 'Automatic ownership and routing', 'Coverage and workload balancing', 'History-preserving reassignment']],
      ['How Rally does territory management', 'Rally assigns and rebalances territories by rule, routes leads to the right owner automatically, and shows coverage gaps, so territory changes are fast and fair.'],
    ],
    [
      ['Can Rally route leads by territory?', 'Yes. New leads route automatically to the correct territory owner on arrival.'],
      ['How do I rebalance territories?', 'Adjust the rules and Rally reassigns accounts, preserving history, without a spreadsheet exercise.'],
      ['Can I see coverage gaps?', 'Yes. Rally shows uncovered accounts and overloaded reps so you balance with data.'],
    ]
  ),
  f(
    'commission-tracking-software',
    'Commission tracking software',
    'sales commissions, quota, payout calculation',
    'Commission tracking software calculates what reps earn from closed deals against a comp plan. Rally computes commissions from the same deals it forecasts, applies your plan rules and accelerators, and gives reps a live view of earnings, so payouts are accurate, disputes drop, and finance is not rebuilding a comp spreadsheet each month.',
    'Comp disputes come from opaque math. Rally computes commissions from the deals reps already see.',
    [
      ['Plan-driven calculation', 'Apply rates, tiers, and accelerators to closed deals automatically.'],
      ['Live earnings for reps', 'Reps see attainment and expected payout in real time, cutting disputes.'],
      ['One source of deal truth', 'Commissions calculate from the same deals in the forecast, so numbers agree.'],
      ['Audit-ready detail', 'Every payout shows the deals and rules behind it for clean approvals.'],
    ],
    [
      ['What to look for in commission tracking software', 'Look for flexible plan rules, rep transparency, and auditable calculations.', ['Tiered rates and accelerators', 'Real-time attainment and payout', 'Calculation from live deal data', 'Auditable payout breakdowns']],
      ['How Rally does commission tracking', 'Rally computes commissions from closed deals using your plan rules and shows reps live earnings, so payouts are accurate and finance skips the monthly rebuild.'],
    ],
    [
      ['Can reps see their commissions live?', 'Yes. Reps see attainment and expected payout in real time, which cuts disputes.'],
      ['Does Rally support accelerators and tiers?', 'Yes. Apply tiered rates and accelerators from your comp plan automatically.'],
      ['Is the calculation auditable?', 'Yes. Every payout shows the deals and rules behind it for clean approvals.'],
    ]
  ),
  f(
    'sales-performance-management-software',
    'Sales performance management software',
    'quota, attainment, scorecards, goals',
    'Sales performance management (SPM) software sets quotas and goals and tracks attainment across the team. Rally ties quotas, activity goals, and scorecards to live CRM data, so every rep and manager sees attainment and pacing in real time, and Rook flags who is off pace early enough to change the outcome.',
    'Performance management works when the scorecard is live, not a month-end surprise. Rally keeps it current.',
    [
      ['Quotas and goals', 'Set revenue and activity targets by rep, team, and period.'],
      ['Live attainment and pacing', 'See attainment and pace to plan update as deals and activity change.'],
      ['Scorecards', 'Combine outcome and activity metrics into a clear per-rep scorecard.'],
      ['Rook flags off-pace early', 'Rook surfaces reps drifting off pace while there is still time to act.'],
    ],
    [
      ['What to look for in sales performance management software', 'Look for flexible quotas, live attainment, and scorecards tied to real data.', ['Revenue and activity quotas', 'Real-time attainment and pacing', 'Combined outcome-and-activity scorecards', 'Early off-pace alerts']],
      ['How Rally does performance management', 'Rally ties quotas and scorecards to live CRM data so attainment is always current, and Rook flags who is off pace early enough to coach.'],
    ],
    [
      ['Can I set both revenue and activity goals?', 'Yes. Rally supports revenue and activity quotas by rep, team, and period.'],
      ['Is attainment real-time?', 'Yes. Attainment and pacing update as deals and activity change.'],
      ['Does Rally warn when a rep is off pace?', 'Yes. Rook surfaces reps drifting off pace early enough to change the outcome.'],
    ]
  ),
  f(
    'sales-coaching-software',
    'Sales coaching software',
    'call coaching, scorecards, rep development',
    'Sales coaching software helps managers improve reps using call reviews, scorecards, and data on what works. Rally combines conversation intelligence, deal analytics, and scorecards so managers coach from real calls and outcomes, and Rook flags coachable moments, turning coaching from a gut-feel 1:1 into a targeted, repeatable habit.',
    'Good coaching is specific and evidence-based. Rally puts the evidence in front of the manager.',
    [
      ['Coach from real calls', 'Review recorded calls and transcripts with the deal context attached.'],
      ['Skill scorecards', 'Score reps on the behaviors that drive wins and track improvement.'],
      ['Rook flags coachable moments', 'Rook surfaces calls and deals where a coaching intervention would help most.'],
      ['Tie coaching to outcomes', 'Connect coaching to win rate and cycle time to prove what works.'],
    ],
    [
      ['What to look for in sales coaching software', 'Look for call review, scorecards, and a link between coaching and outcomes.', ['Call recording and transcript review', 'Behavior-based scorecards', 'AI-flagged coachable moments', 'Outcome linkage']],
      ['How Rally does sales coaching', 'Rally gives managers call intelligence, deal analytics, and scorecards in one place, and Rook flags where coaching matters most, so development is targeted and measurable.'],
    ],
    [
      ['Can managers review calls in Rally?', 'Yes. Recorded calls and transcripts sit alongside the deal for context-rich review.'],
      ['Does Rally score rep behaviors?', 'Yes. Build scorecards on the behaviors that drive wins and track improvement over time.'],
      ['Can Rally show what to coach?', 'Yes. Rook flags the calls and deals where coaching would have the biggest impact.'],
    ]
  ),
  f(
    'customer-relationship-management-software',
    'Customer relationship management software',
    'CRM, contacts, deals, pipeline',
    'Customer relationship management (CRM) software stores every customer, conversation, and deal in one place so teams sell and serve from shared context. Rally is an AI-native CRM that is alive with data on day one, unifies leads, contacts, companies, and deals, and puts Rook to work executing the follow-ups instead of just recording them.',
    'A CRM should reduce work, not create a second job of data entry. Rally is built so the record maintains itself.',
    [
      ['Unified customer record', 'Leads, contacts, companies, deals, and activity live on one linked record any team member can pick up.'],
      ['Alive on day one', 'Rally loads with working data and dashboards immediately, so there is no blank-database rollout.'],
      ['Rook does the work', 'Rook drafts follow-ups, updates records, and books meetings, so the CRM produces output, not just storage.'],
      ['One clean price', 'Every module is included at one price, with no per-cloud upsell to unlock the basics.'],
    ],
    [
      ['What to look for in CRM software', 'The best CRM is fast to adopt, keeps itself current, and connects every part of the customer lifecycle.', ['Fast setup with data on day one', 'Automatic activity capture', 'Linked leads, contacts, and deals', 'AI that executes, not just chats']],
      ['How Rally does CRM', 'Rally unifies the whole revenue lifecycle in one system and lets Rook run the routine work, so reps spend time on customers rather than maintaining the database.'],
    ],
    [
      ['What makes Rally an AI-native CRM?', 'Rally is built around Rook, an operator that executes multi-step work like drafting emails, updating deals, and building quotes, rather than a chatbot bolted onto legacy CRM.'],
      ['How long does Rally take to set up?', 'Most teams are productive in minutes because Rally is alive with data on first load and Rook can configure pipelines and views from a sentence.'],
      ['Is every feature included?', 'Yes. Leads, deals, forecasting, quotes, dashboards, and automation come at one price with no premium tiers to unlock core features.'],
    ],
    [
      ['Alive with data on day one', true, 'Blank database'],
      ['AI operator executes work', true, 'Chatbot at best'],
      ['All modules at one price', true, 'Per-cloud add-ons'],
      ['Automatic activity capture', true, 'Manual logging'],
      ['Unified lead-to-deal record', true, 'Siloed objects'],
    ]
  ),
  f(
    'sales-crm-software',
    'Sales CRM software',
    'sales CRM, pipeline, deals, forecasting',
    'Sales CRM software gives reps and managers one place to run pipeline, track deals, and forecast revenue. Rally is a sales-first CRM with a deep deal object, a visual pipeline, and native forecasting, and Rook handles the busywork of follow-ups and updates, so reps sell more and managers get a forecast they can trust.',
    'A sales CRM should make the next action obvious and the forecast honest. Rally does both from live data.',
    [
      ['Built for the deal', 'A deep deal object with line items, buying committee, and competitors, not just a name and amount.'],
      ['Visual pipeline', 'Drag-to-advance stages with live value roll-ups feed the forecast automatically.'],
      ['Native forecasting', 'The forecast reads from real deals, so it updates the moment a rep works a deal.'],
      ['Rook runs the busywork', 'Rook logs activity, drafts follow-ups, and flags risk so reps focus on selling.'],
    ],
    [
      ['What to look for in sales CRM software', 'Look for deal depth, a live pipeline, native forecasting, and automation that removes admin.', ['Rich deal records', 'Visual pipeline with live values', 'Forecasting tied to deals', 'Automatic activity capture']],
      ['How Rally does sales CRM', 'Rally centers on the deal and pipeline, forecasts from live data, and lets Rook handle the admin, so the team runs a tighter process with less overhead.'],
    ],
    [
      ['Is Rally good for a small sales team?', 'Yes. Rally is alive on day one and needs no admin to run, so small teams get enterprise-grade pipeline and forecasting without the overhead.'],
      ['Does Rally forecast automatically?', 'Yes. The forecast rolls up from live deals and updates as reps work, with Rook flagging at-risk deals.'],
      ['Can reps avoid manual data entry?', 'Yes. Activity capture and Rook remove most logging and updates, so reps spend time with customers.'],
    ],
    [
      ['Deep deal object', true, 'Name + amount only'],
      ['Native forecasting', true, 'Separate spreadsheet'],
      ['Automatic activity logging', true, 'Manual entry'],
      ['Live pipeline board', true, 'Static list'],
      ['AI executes follow-ups', true, false],
    ]
  ),
  f(
    'ai-crm-software',
    'AI CRM software',
    'AI CRM, AI operator, automation',
    'AI CRM software uses artificial intelligence to prioritize work, draft communication, and automate updates. Rally is AI-native rather than AI-added: Rook, its operator, executes multi-step work like writing follow-ups, updating deals, building quotes, and answering questions from your data, so the CRM does work instead of only storing it.',
    'Most AI CRM features are a chat box beside the same old CRM. Rally makes the AI the operator that runs the work.',
    [
      ['Rook executes work', 'Rook completes tasks end to end, from drafting outreach to updating deals and building quotes.'],
      ['Prioritized every day', 'Rally ranks leads and deals so reps always know the highest-value next action.'],
      ['Ask your data anything', 'Ask Rook a question in plain language and get an answer grounded in your records.'],
      ['Automation that acts', 'Workflows can include Rook as a step that produces finished output, not just a reminder.'],
    ],
    [
      ['What to look for in AI CRM software', 'Look for AI that takes action and is grounded in your data, not a generic chatbot.', ['AI that executes multi-step work', 'Answers grounded in your CRM data', 'Prioritization of leads and deals', 'AI steps inside automations']],
      ['How Rally does AI CRM', 'Rally is built around Rook, so the AI is the operator that runs routine revenue work, grounded in your live data and guarded by rules you control.'],
    ],
    [
      ['How is Rally different from a CRM with an AI add-on?', 'Rally is AI-native: Rook is the operator that executes work across the platform, not a chat widget bolted onto legacy CRM.'],
      ['Does the AI make things up?', 'Rook is grounded in your CRM data and you can require review before anything sends, so output stays accurate and on-brand.'],
      ['What can the AI actually do?', 'Rook drafts and sends outreach, updates deals, builds quotes and proposals, answers questions, and runs steps inside workflows.'],
    ],
    [
      ['AI executes multi-step work', true, 'Chat suggestions only'],
      ['Grounded in your data', true, 'Generic responses'],
      ['AI inside workflows', true, false],
      ['Human review guardrails', true, 'All or nothing'],
      ['Prioritized daily queue', true, 'Manual triage'],
    ]
  ),
  f(
    'b2b-crm-software',
    'B2B CRM software',
    'B2B CRM, accounts, buying committee, pipeline',
    'B2B CRM software manages complex, multi-stakeholder deals across accounts and long sales cycles. Rally models accounts, buying committees, and multi-threaded deals natively, tracks competitors and line items, and lets Rook keep every stakeholder warm, so B2B teams run committee-based deals without losing the thread between meetings.',
    'B2B deals are won across a committee over months. Rally is built to track every stakeholder and stage of that.',
    [
      ['Account and committee model', 'Track every stakeholder, role, and sentiment on the deal so multi-threading is visible.'],
      ['Deep deal object', 'Line items, competitors, and stage criteria live on the deal, not scattered in notes.'],
      ['Long-cycle awareness', 'Rally flags stalled stakeholders and slipping dates across long cycles.'],
      ['Rook keeps threads warm', 'Rook drafts stakeholder-specific follow-ups so no contact goes cold mid-cycle.'],
    ],
    [
      ['What to look for in B2B CRM software', 'Look for account and committee modeling, deal depth, and multi-thread tracking.', ['Buying committee tracking', 'Account-based structure', 'Competitor and line-item detail', 'Multi-thread follow-up']],
      ['How Rally does B2B CRM', 'Rally structures accounts and committees, keeps deal detail rich, and lets Rook maintain every relationship thread, so complex deals stay on track over long cycles.'],
    ],
    [
      ['Does Rally track the buying committee?', 'Yes. Every stakeholder, role, and sentiment is captured on the deal so multi-threaded selling is visible.'],
      ['Can Rally handle long sales cycles?', 'Yes. Rally flags stalled stakeholders and slipping dates so long-cycle deals do not drift.'],
      ['Is Rally account-based?', 'Yes. Accounts, contacts, and deals link together for a full account view.'],
    ],
    [
      ['Buying committee tracking', true, 'Single contact'],
      ['Account-based structure', true, 'Contact-centric'],
      ['Competitor tracking', true, false],
      ['Multi-thread follow-up', true, 'Manual'],
      ['Long-cycle risk flags', true, false],
    ]
  ),
  f(
    'small-business-crm-software',
    'Small business CRM software',
    'small business CRM, simple, affordable',
    'Small business CRM software gives lean teams pipeline, contacts, and follow-up without enterprise complexity or cost. Rally is alive on day one, needs no admin to run, and lets Rook handle the follow-ups a small team has no time for, so owners and small sales teams get a full revenue platform at one simple price.',
    'Small teams cannot afford a CRM that needs a specialist to run. Rally runs itself and Rook fills the gaps.',
    [
      ['No admin required', 'Rally is alive on day one and configures with a sentence, so no consultant is needed.'],
      ['Rook is your extra rep', 'Rook drafts follow-ups and books meetings, covering the work a lean team cannot get to.'],
      ['One simple price', 'Every module is included, so a small team gets forecasting and quotes without upsells.'],
      ['Grows with you', 'The same platform scales from a founder-led team to a full sales org.'],
    ],
    [
      ['What to look for in small business CRM software', 'Look for fast setup, low admin, fair pricing, and automation that stretches a small team.', ['Alive on day one', 'No dedicated admin needed', 'All features at one price', 'AI that covers follow-up']],
      ['How Rally does small business CRM', 'Rally gives small teams a full revenue platform that runs itself, with Rook handling follow-up, so owners can sell without babysitting software.'],
    ],
    [
      ['Do I need someone to administer Rally?', 'No. Rally is alive on day one and configures from plain language, so no dedicated admin is required.'],
      ['Is Rally affordable for a small team?', 'Yes. One clean price includes every module, so there are no surprise upsells for core features.'],
      ['Can Rally grow with my business?', 'Yes. The same platform scales from a founder-led team to a full sales organization.'],
    ],
    [
      ['Alive on day one', true, 'Weeks of setup'],
      ['No admin required', true, 'Needs a specialist'],
      ['All features one price', true, 'Paywalled tiers'],
      ['AI covers follow-up', true, false],
      ['Scales as you grow', true, 'Replatform later'],
    ]
  ),
  f(
    'revenue-operations-software',
    'Revenue operations software',
    'RevOps, process, data, forecasting alignment',
    'Revenue operations software aligns sales, marketing, and success on shared data, process, and metrics. Rally gives RevOps one source of truth across the funnel, native forecasting, and workflow automation to enforce process, so RevOps teams stop stitching tools together and instead run a single system where the numbers already tie out.',
    'RevOps spends most of its time reconciling tools. Rally removes the reconciliation by unifying the data.',
    [
      ['One source of truth', 'Leads, deals, campaigns, and revenue share one database, so metrics tie out by default.'],
      ['Process enforcement', 'Workflows enforce stage criteria, routing, and handoffs across teams.'],
      ['Native forecasting', 'Forecasting reads from live deals, so RevOps does not maintain a parallel model.'],
      ['Rook automates ops', 'Rook can run data hygiene, routing, and reporting so RevOps focuses on strategy.'],
    ],
    [
      ['What to look for in revenue operations software', 'Look for unified data, process automation, and forecasting that does not require reconciliation.', ['Single source of truth across the funnel', 'Workflow-based process enforcement', 'Native forecasting and reporting', 'Automated data hygiene']],
      ['How Rally does RevOps', 'Rally unifies the funnel in one system so metrics agree, enforces process with workflows, and lets Rook automate the operational grind.'],
    ],
    [
      ['Does Rally give RevOps one source of truth?', 'Yes. Marketing, sales, and success data share one database, so metrics tie out without reconciliation.'],
      ['Can I enforce process in Rally?', 'Yes. Workflows enforce stage criteria, routing, and handoffs across teams.'],
      ['Does RevOps need a separate BI tool?', 'No. Forecasting, dashboards, and reporting are native, so there is no parallel model to maintain.'],
    ],
    [
      ['Unified funnel data', true, 'Stitched tools'],
      ['Process enforcement', true, 'Manual policing'],
      ['Native forecasting', true, 'Separate BI'],
      ['Automated data hygiene', true, false],
      ['Metrics tie out by default', true, 'Constant reconciliation'],
    ]
  ),
  f(
    'sales-operations-software',
    'Sales operations software',
    'sales ops, process, territory, enablement',
    'Sales operations software gives ops teams the tools to design process, manage territories, and keep the sales engine running. Rally combines territory rules, workflow automation, forecasting, and clean reporting in one platform, so sales ops can set up the motion once and let Rook and workflows enforce it instead of chasing reps for updates.',
    'Sales ops should design the machine, not manually run it. Rally automates the enforcement.',
    [
      ['Territory and routing rules', 'Design territories and routing once and let Rally enforce ownership automatically.'],
      ['Workflow automation', 'Automate handoffs, tasks, and field updates so process runs without policing.'],
      ['Clean reporting', 'Live reports and dashboards give ops the truth without manual builds.'],
      ['Rook enforces hygiene', 'Rook keeps data clean and next steps current so the pipeline stays reliable.'],
    ],
    [
      ['What to look for in sales operations software', 'Look for territory management, workflow automation, and reliable reporting in one place.', ['Territory and routing rules', 'Workflow-based process', 'Live, no-build reporting', 'Automated data hygiene']],
      ['How Rally does sales operations', 'Rally lets ops design territories and process once and enforces them with workflows and Rook, so the engine runs without constant manual intervention.'],
    ],
    [
      ['Can sales ops manage territories in Rally?', 'Yes. Design territories and routing by rule and Rally enforces ownership automatically.'],
      ['Does Rally reduce manual process policing?', 'Yes. Workflows and Rook enforce handoffs, next steps, and hygiene so ops does not chase reps.'],
      ['Is reporting easy for ops?', 'Yes. Live reports and dashboards update automatically with drill-down to records.'],
    ],
    [
      ['Territory rules and routing', true, 'Spreadsheet maps'],
      ['Workflow automation', true, 'Manual process'],
      ['Live reporting', true, 'Built by hand'],
      ['Automated hygiene', true, false],
      ['One platform', true, 'Many bolt-ons'],
    ]
  ),
  f(
    'revenue-intelligence-software',
    'Revenue intelligence software',
    'revenue intelligence, deal risk, forecast accuracy',
    'Revenue intelligence software analyzes deals, activity, and conversations to predict outcomes and surface risk. Rally reads signals from live deals, emails, and calls to flag at-risk pipeline and forecast slippage early, and Rook explains why a deal is at risk and drafts the action to fix it, so intelligence turns into a next step.',
    'Revenue intelligence is only useful if it ends in an action. Rally connects the signal to the fix.',
    [
      ['Deal risk signals', 'Rally flags stalled activity, single-threading, and slipping dates before they cost the quarter.'],
      ['Forecast accuracy', 'Signals feed the forecast so the number reflects real momentum, not hope.'],
      ['Conversation signals', 'Call and email engagement inform which deals are truly progressing.'],
      ['Rook turns signal to action', 'Rook explains the risk and drafts the outreach to de-risk the deal.'],
    ],
    [
      ['What to look for in revenue intelligence software', 'Look for deal-risk detection, forecast signal, and a path from insight to action.', ['At-risk deal detection', 'Forecast-accuracy signals', 'Conversation and engagement analysis', 'Action drafted from the insight']],
      ['How Rally does revenue intelligence', 'Rally reads live deal and activity signals to flag risk early, and Rook explains and acts on it, so intelligence produces a next step rather than a chart.'],
    ],
    [
      ['How does Rally detect deal risk?', 'Rally watches for stalled activity, single-threading, and slipping close dates and flags the specific deals at risk.'],
      ['Does revenue intelligence improve the forecast?', 'Yes. Risk and momentum signals feed the forecast so the number reflects reality.'],
      ['Can Rally act on the insight?', 'Yes. Rook explains why a deal is at risk and drafts the outreach to fix it.'],
    ],
    [
      ['At-risk deal detection', true, 'Gut feel'],
      ['Signals feed the forecast', true, 'Static roll-up'],
      ['Conversation analysis', true, false],
      ['Action drafted automatically', true, false],
      ['Grounded in live data', true, 'Manual review'],
    ]
  ),
  f(
    'sales-intelligence-software',
    'Sales intelligence software',
    'account data, enrichment, buying signals',
    'Sales intelligence software gives reps data on accounts and contacts, including firmographics, enrichment, and buying signals. Rally enriches records automatically, surfaces intent and engagement signals, and lets Rook brief a rep on any account in seconds, so reps walk into every conversation informed instead of scrambling for context beforehand.',
    'Sales intelligence should arrive on the record, not in a separate tab. Rally enriches in place.',
    [
      ['Automatic enrichment', 'Rally fills firmographic and contact detail so records stay complete without manual research.'],
      ['Buying and intent signals', 'Surface engagement and intent so reps prioritize accounts showing interest.'],
      ['Account briefs on demand', 'Rook summarizes an account and its history in seconds before a call.'],
      ['In-context data', 'Intelligence lives on the record, so reps do not juggle separate research tools.'],
    ],
    [
      ['What to look for in sales intelligence software', 'Look for automatic enrichment, buying signals, and in-context briefing.', ['Firmographic and contact enrichment', 'Intent and engagement signals', 'On-demand account briefs', 'Data on the record, not a separate tool']],
      ['How Rally does sales intelligence', 'Rally enriches records in place, surfaces intent signals, and lets Rook brief reps on any account, so every conversation starts informed.'],
    ],
    [
      ['Does Rally enrich records automatically?', 'Yes. Rally fills firmographic and contact detail so records stay complete without manual research.'],
      ['Can Rally show buying signals?', 'Yes. Engagement and intent signals surface accounts worth prioritizing.'],
      ['Can I get an account brief before a call?', 'Yes. Rook summarizes the account and its history in seconds.'],
    ],
    [
      ['Automatic enrichment', true, 'Manual research'],
      ['Buying and intent signals', true, false],
      ['On-demand account briefs', true, false],
      ['Data in context', true, 'Separate tab'],
      ['Included at one price', true, 'Add-on subscription'],
    ]
  ),
  f(
    'conversation-intelligence-software',
    'Conversation intelligence software',
    'call recording, transcription, coaching signals',
    'Conversation intelligence software records and analyzes sales calls to surface coaching moments and deal signals. Rally captures calls, transcribes them, and ties insights to the deal, so managers coach from real conversations and Rook can flag risk, next steps, and objections raised on the call, turning talk time into structured pipeline data.',
    'Every recorded call holds coaching gold and deal signals. Rally extracts both and attaches them to the deal.',
    [
      ['Recording and transcription', 'Calls are captured and transcribed automatically and attached to the deal.'],
      ['Coaching signals', 'Surface talk ratios, objections, and key moments for targeted coaching.'],
      ['Deal signals on the record', 'Next steps and risks raised on a call flow into the deal timeline.'],
      ['Rook summarizes calls', 'Rook drafts a call summary and follow-up so nothing said is lost.'],
    ],
    [
      ['What to look for in conversation intelligence software', 'Look for reliable transcription, coaching signal, and deal linkage.', ['Automatic recording and transcription', 'Talk ratio and objection detection', 'Insights tied to the deal', 'AI summary and follow-up']],
      ['How Rally does conversation intelligence', 'Rally records and transcribes calls, ties insight to the deal, and lets Rook summarize and draft follow-up, so conversations become structured pipeline data.'],
    ],
    [
      ['Does Rally transcribe sales calls?', 'Yes. Calls are recorded and transcribed automatically and attached to the deal.'],
      ['Can managers coach from calls?', 'Yes. Talk ratios, objections, and key moments surface for targeted coaching.'],
      ['Does Rally summarize calls?', 'Yes. Rook drafts a summary and follow-up so nothing from the call is lost.'],
    ],
    [
      ['Recording and transcription', true, 'Manual notes'],
      ['Coaching signals', true, false],
      ['Insights tied to the deal', true, 'Separate tool'],
      ['AI call summaries', true, false],
      ['Follow-up drafted', true, false],
    ]
  ),
  f(
    'relationship-intelligence-software',
    'Relationship intelligence software',
    'relationship mapping, warm intros, network',
    'Relationship intelligence software maps who on your team knows whom at target accounts and how strong each connection is. Rally builds relationship maps from your communication history, surfaces the warmest path into an account, and lets Rook draft the intro request, so teams open doors through existing relationships instead of cold outreach.',
    'The warmest path into an account usually already exists on your team. Rally finds it and opens it.',
    [
      ['Relationship mapping', 'See who on the team has a real connection to each account and how strong it is.'],
      ['Warm-path discovery', 'Surface the best internal route into a target account for a warm introduction.'],
      ['Strength from real activity', 'Connection strength is inferred from actual communication history, not a guess.'],
      ['Rook drafts the intro', 'Rook writes the internal intro request so the warm path gets used.'],
    ],
    [
      ['What to look for in relationship intelligence software', 'Look for accurate mapping, warm-path discovery, and easy intro requests.', ['Team-wide relationship maps', 'Warm-path into accounts', 'Strength from communication history', 'Assisted intro requests']],
      ['How Rally does relationship intelligence', 'Rally maps team relationships from real activity, surfaces the warmest path into an account, and lets Rook draft the intro, so warm connections beat cold outreach.'],
    ],
    [
      ['Can Rally show who knows an account?', 'Yes. Rally maps which team members have a real connection to each account and how strong it is.'],
      ['How is connection strength determined?', 'Strength is inferred from actual communication history rather than a manual rating.'],
      ['Can Rally help request an intro?', 'Yes. Rook drafts the internal intro request so the warm path gets used.'],
    ],
    [
      ['Team relationship maps', true, false],
      ['Warm-path discovery', true, 'Cold lists'],
      ['Strength from real activity', true, 'Manual guess'],
      ['Assisted intro requests', true, false],
      ['Built into the CRM', true, 'Separate tool'],
    ]
  ),
  f(
    'sales-enablement-software',
    'Sales enablement software',
    'content, playbooks, training, readiness',
    'Sales enablement software gives reps the content, playbooks, and guidance to sell effectively. Rally surfaces the right collateral and next-best action inside the deal, keeps playbooks tied to stages, and lets Rook answer product and objection questions instantly, so reps get enablement in the flow of work instead of hunting through a separate portal.',
    'Enablement that lives in a separate portal goes unused. Rally puts it inside the deal where reps work.',
    [
      ['Content in the deal', 'The right collateral surfaces on the deal based on stage and context.'],
      ['Stage-tied playbooks', 'Playbooks guide the next-best action at each stage of the deal.'],
      ['Instant answers', 'Rook answers product, pricing, and objection questions from your knowledge base.'],
      ['Usage insight', 'See which content actually advances deals so enablement invests in what works.'],
    ],
    [
      ['What to look for in sales enablement software', 'Look for in-context content, stage playbooks, and instant answers.', ['Content surfaced in the deal', 'Stage-based playbooks', 'AI answers to rep questions', 'Content usage analytics']],
      ['How Rally does sales enablement', 'Rally surfaces content and playbooks inside the deal and lets Rook answer questions instantly, so reps get enablement in the flow of work.'],
    ],
    [
      ['Does enablement live inside the deal?', 'Yes. The right collateral and next-best action surface on the deal by stage and context.'],
      ['Can reps get instant answers?', 'Yes. Rook answers product, pricing, and objection questions from your knowledge base.'],
      ['Can I see which content works?', 'Yes. Rally shows which collateral actually advances deals so you invest in what works.'],
    ],
    [
      ['Content inside the deal', true, 'Separate portal'],
      ['Stage-based playbooks', true, 'Static docs'],
      ['Instant AI answers', true, false],
      ['Content usage analytics', true, false],
      ['In the flow of work', true, 'Context switch'],
    ]
  ),
  f(
    'sales-onboarding-software',
    'Sales onboarding software',
    'rep ramp, onboarding, guided selling',
    'Sales onboarding software ramps new reps faster with guided process, embedded playbooks, and in-context help. Rally shortens ramp by making the CRM alive on day one, guiding new reps through each stage with playbooks, and letting Rook answer questions and draft outreach, so a new hire is productive in days instead of months of shadowing.',
    'New reps ramp slowly when the CRM is a blank maze. Rally guides them and Rook covers the gaps.',
    [
      ['Guided from day one', 'New reps see a live, working CRM with stage guidance instead of an empty database.'],
      ['Embedded playbooks', 'Stage playbooks show the next-best action so new hires follow the winning motion.'],
      ['Rook answers questions', 'Rook answers product and process questions instantly, reducing shoulder-tapping.'],
      ['Faster first deal', 'With drafting help and guidance, new reps reach their first deal sooner.'],
    ],
    [
      ['What to look for in sales onboarding software', 'Look for guided process, embedded playbooks, and in-context help that speed ramp.', ['Live CRM on day one', 'Stage-based guidance', 'Instant answers to rep questions', 'Drafting help for outreach']],
      ['How Rally does sales onboarding', 'Rally makes the CRM alive and guided from day one and lets Rook answer questions and draft outreach, so new reps ramp in days.'],
    ],
    [
      ['How does Rally speed up ramp?', 'Rally is alive on day one with stage guidance and playbooks, and Rook answers questions and drafts outreach, so new hires get productive fast.'],
      ['Do new reps need heavy training?', 'Less than usual, because the process is guided in the tool and Rook covers product and process questions.'],
      ['Can new reps get help while selling?', 'Yes. Rook provides answers and drafts in the flow of work, reducing the need to shadow.'],
    ],
    [
      ['Guided on day one', true, 'Blank database'],
      ['Embedded playbooks', true, 'PDF binders'],
      ['Instant AI answers', true, false],
      ['Drafting assistance', true, false],
      ['Faster time to first deal', true, 'Long ramp'],
    ]
  ),
  f(
    'lead-generation-software',
    'Lead generation software',
    'lead capture, forms, sourcing, conversion',
    'Lead generation software helps teams attract and capture new prospects and turn them into pipeline. Rally captures leads from forms and integrations, scores and routes them instantly, and lets Rook run first-touch outreach, so generated leads convert into real conversations instead of sitting in a list waiting for someone to notice them.',
    'Generating leads is wasted if they are not worked fast. Rally captures, scores, and works them instantly.',
    [
      ['Multi-source capture', 'Forms, integrations, and imports land in one lead inbox with source attribution.'],
      ['Instant scoring and routing', 'New leads are scored and routed to the right rep the moment they arrive.'],
      ['Rook works first touch', 'Rook drafts and sends the opening outreach so speed-to-lead stays fast.'],
      ['Source ROI', 'Every lead carries its source, so you measure which channels actually convert.'],
    ],
    [
      ['What to look for in lead generation software', 'Look for fast capture, instant routing, and channel-level ROI.', ['Multi-source capture with attribution', 'Instant scoring and routing', 'Automated first touch', 'Source-level conversion reporting']],
      ['How Rally does lead generation', 'Rally captures leads from every source, scores and routes them instantly, and lets Rook work first touch, so generated leads become conversations fast.'],
    ],
    [
      ['How fast are new leads worked?', 'Rook can respond within minutes of capture, which is where most conversion advantage comes from.'],
      ['Can I measure lead-source ROI?', 'Yes. Every lead carries its source, so Rally reports conversion and revenue by channel.'],
      ['Where do captured leads go?', 'Into one lead inbox where they are scored and routed to the right owner automatically.'],
    ],
    [
      ['Multi-source capture', true, 'Manual entry'],
      ['Instant routing', true, 'Sits in a queue'],
      ['Automated first touch', true, false],
      ['Source-level ROI', true, 'Hard to trace'],
      ['Scoring on arrival', true, false],
    ]
  ),
  f(
    'lead-routing-software',
    'Lead routing software',
    'lead assignment, round-robin, territory routing',
    'Lead routing software assigns incoming leads to the right rep instantly by rules like territory, round-robin, or score. Rally routes leads the moment they arrive, respects territory and availability, and notifies the owner in real time, so no lead waits in an unassigned queue and speed-to-lead stays measured in seconds, not hours.',
    'A lead sitting unassigned is a lead going cold. Rally routes and notifies the instant it arrives.',
    [
      ['Rule-based routing', 'Assign by territory, round-robin, segment, or score with rules you control.'],
      ['Instant assignment', 'Leads route the moment they land, so no one waits in an unassigned queue.'],
      ['Availability aware', 'Routing respects rep availability so leads go to someone who can act.'],
      ['Real-time notification', 'The owner is notified instantly and Rook can open the first touch.'],
    ],
    [
      ['What to look for in lead routing software', 'Look for flexible rules, instant assignment, and real-time notification.', ['Territory, round-robin, and score rules', 'Instant assignment on arrival', 'Availability-aware distribution', 'Real-time owner notification']],
      ['How Rally does lead routing', 'Rally routes leads by rule the moment they arrive, respects availability, and notifies the owner instantly, so speed-to-lead stays fast.'],
    ],
    [
      ['How fast does Rally route a lead?', 'Instantly. Leads route the moment they arrive, so they never sit in an unassigned queue.'],
      ['Can I route by territory and score?', 'Yes. Combine territory, round-robin, segment, and score rules to fit your process.'],
      ['Does routing notify the rep?', 'Yes. The owner is notified in real time and Rook can start the first touch.'],
    ],
    [
      ['Instant assignment', true, 'Manual triage'],
      ['Rule-based routing', true, 'One inbox'],
      ['Availability aware', true, false],
      ['Real-time notification', true, 'Delayed'],
      ['First touch by AI', true, false],
    ]
  ),
  f(
    'lead-nurturing-software',
    'Lead nurturing software',
    'nurture campaigns, drip, engagement scoring',
    'Lead nurturing software keeps not-yet-ready leads warm with relevant, automated touches until they are ready to buy. Rally nurtures leads with multi-step campaigns off live CRM data, raises the lead score as engagement grows, and hands off to a rep when a lead heats up, so nurture flows straight into pipeline instead of a marketing dead end.',
    'Nurture should end in a warm handoff, not an endless drip. Rally hands off the moment a lead heats up.',
    [
      ['Data-driven nurture', 'Nurture campaigns run off live CRM segments so messaging stays relevant.'],
      ['Engagement scoring', 'As a lead engages, its score climbs and priority rises automatically.'],
      ['Warm handoff', 'When a lead is ready, it routes to a rep with full nurture history attached.'],
      ['Rook personalizes touches', 'Rook tailors nurture content so it reads relevant, not generic.'],
    ],
    [
      ['What to look for in lead nurturing software', 'Look for data-driven campaigns, engagement scoring, and a warm handoff to sales.', ['Nurture on live CRM data', 'Engagement-based scoring', 'Automatic handoff when ready', 'Personalized content']],
      ['How Rally does lead nurturing', 'Rally nurtures off live data, raises the score as leads engage, and hands off warm leads to a rep, so nurture feeds pipeline directly.'],
    ],
    [
      ['When does a nurtured lead go to sales?', 'When engagement pushes the score past your threshold, Rally routes it to a rep with full history.'],
      ['Is nurture personalized?', 'Yes. Rook tailors content to the segment so nurture reads relevant rather than generic.'],
      ['Does nurture connect to pipeline?', 'Yes. A heated lead converts to a deal in the same system, carrying its nurture history.'],
    ],
    [
      ['Nurture on live data', true, 'Static lists'],
      ['Engagement scoring', true, false],
      ['Warm handoff to sales', true, 'Dead-ends in marketing'],
      ['Personalized content', true, 'One-size drip'],
      ['History carried to the deal', true, false],
    ]
  ),
  f(
    'lead-capture-software',
    'Lead capture software',
    'web forms, capture, enrichment, routing',
    'Lead capture software collects prospect information from forms and channels and gets it into the CRM cleanly. Rally captures leads from web forms and integrations directly into the CRM, enriches and de-dupes them, and routes them instantly, so a captured lead becomes a scored, assigned, worked record without a manual import or a spreadsheet in between.',
    'A captured lead should land ready to work, not in a spreadsheet. Rally captures straight into pipeline.',
    [
      ['Direct-to-CRM capture', 'Web forms and integrations write leads straight into Rally with no import step.'],
      ['Enrich and de-dupe', 'Rook enriches missing fields and merges duplicates so captured records are clean.'],
      ['Instant routing', 'Captured leads are scored and routed to the right owner immediately.'],
      ['Source attribution', 'Each captured lead carries its source for accurate channel reporting.'],
    ],
    [
      ['What to look for in lead capture software', 'Look for direct capture, enrichment, and instant routing.', ['Direct-to-CRM web forms', 'Automatic enrichment and de-dupe', 'Instant scoring and routing', 'Source attribution']],
      ['How Rally does lead capture', 'Rally captures leads straight into the CRM, enriches and de-dupes them, and routes them instantly, so a captured lead is immediately workable.'],
    ],
    [
      ['Do captured leads need a manual import?', 'No. Web forms and integrations write straight into Rally, so there is no spreadsheet step.'],
      ['Are captured leads cleaned automatically?', 'Yes. Rook enriches missing fields and merges duplicates on capture.'],
      ['Are captured leads routed?', 'Yes. They are scored and routed to the right owner immediately.'],
    ],
    [
      ['Direct-to-CRM capture', true, 'Manual import'],
      ['Enrichment on capture', true, false],
      ['Duplicate merge', true, 'Dirty data'],
      ['Instant routing', true, 'Sits in a queue'],
      ['Source attribution', true, false],
    ]
  ),
  f(
    'web-form-software',
    'Web form software',
    'forms, lead capture, embedded forms',
    'Web form software builds forms that capture leads and feed them into your systems. Rally forms write submissions straight into the CRM as scored, routed leads, with enrichment and duplicate handling built in, so a form is not just a data collector but the front door to your pipeline, with Rook ready to run first touch on every submission.',
    'A web form should start a sales motion, not just email a notification. Rally makes the form pipeline-native.',
    [
      ['CRM-native forms', 'Form submissions become scored, routed CRM leads with no middleware.'],
      ['Built-in enrichment', 'Rally fills missing detail and de-dupes so form leads are clean.'],
      ['Instant follow-up', 'Rook can run first touch the moment a form is submitted.'],
      ['Attribution built in', 'Each submission carries its source and campaign for reporting.'],
    ],
    [
      ['What to look for in web form software', 'Look for direct CRM capture, enrichment, and instant follow-up.', ['Forms that write to the CRM', 'Enrichment and de-dupe', 'Instant first-touch automation', 'Source and campaign attribution']],
      ['How Rally does web forms', 'Rally forms feed the CRM directly as scored, routed leads, and Rook can run first touch, so a form submission starts a sales motion instantly.'],
    ],
    [
      ['Do Rally forms need middleware?', 'No. Submissions become scored, routed CRM leads directly, with no connector to maintain.'],
      ['Can a form trigger follow-up?', 'Yes. Rook can run first touch the moment a form is submitted.'],
      ['Do forms capture attribution?', 'Yes. Each submission carries its source and campaign for reporting.'],
    ],
    [
      ['Forms write to the CRM', true, 'Email notification'],
      ['Enrichment built in', true, false],
      ['Instant first touch', true, false],
      ['Attribution captured', true, 'Manual tagging'],
      ['No middleware', true, 'Zapier glue'],
    ]
  ),
  f(
    'sales-prospecting-software',
    'Sales prospecting software',
    'prospecting, list building, outreach',
    'Sales prospecting software helps reps find and reach new potential customers efficiently. Rally combines list building from CRM and enrichment data, multi-channel sequences, and Rook writing tailored openers, so reps spend time on live conversations rather than building lists and rewriting the same cold email fifty times a day.',
    'Prospecting time should go to conversations, not list building. Rally automates the grind around it.',
    [
      ['Targeted list building', 'Build prospect lists from CRM data and enrichment to reach the right accounts.'],
      ['Multi-channel sequences', 'Combine email, call, and task steps into a cadence per persona.'],
      ['Rook writes openers', 'Rook drafts tailored first lines from company and role context.'],
      ['Meeting-focused', 'Sequences push toward a booked meeting and hand off to the calendar.'],
    ],
    [
      ['What to look for in sales prospecting software', 'Look for targeting, multi-channel cadences, and personalization.', ['List building from CRM and enrichment', 'Email, call, and task steps', 'AI-personalized openers', 'Direct path to a meeting']],
      ['How Rally does prospecting', 'Rally builds targeted lists, runs multi-channel cadences, and lets Rook personalize openers, so reps spend time in live conversations.'],
    ],
    [
      ['Can Rally build prospect lists?', 'Yes. Build targeted lists from CRM data and enrichment to reach the right accounts.'],
      ['Does Rally personalize outreach?', 'Yes. Rook drafts tailored first lines from company and role context.'],
      ['Do sequences book meetings?', 'Cadences drive toward a booked meeting and hand off to scheduling.'],
    ],
    [
      ['Targeted list building', true, 'Manual research'],
      ['Multi-channel cadences', true, 'Email only'],
      ['AI-personalized openers', true, 'Copy-paste'],
      ['Meeting-focused handoff', true, false],
      ['One platform', true, 'Multiple tools'],
    ]
  ),
  f(
    'outbound-sales-software',
    'Outbound sales software',
    'outbound cadences, dialer, sequencing',
    'Outbound sales software powers proactive, rep-driven outreach at scale across email, phone, and social. Rally unifies list building, sequences, dialing, and follow-up on the CRM record, with Rook personalizing and pacing outreach, so outbound teams run high volume without losing personalization or letting activity go unlogged.',
    'Outbound at scale usually sacrifices personalization. Rally keeps both by letting Rook tailor every touch.',
    [
      ['Unified outbound stack', 'List building, sequences, and dialing live on the CRM record, not separate tools.'],
      ['Personalized at volume', 'Rook tailors each touch so high-volume outreach still reads one-to-one.'],
      ['Everything logged', 'Every email, call, and task logs automatically for clean reporting.'],
      ['Deliverability safeguards', 'Sending limits protect domain reputation as volume grows.'],
    ],
    [
      ['What to look for in outbound sales software', 'Look for a unified stack, personalization at scale, and automatic logging.', ['Sequences and dialing on the record', 'AI personalization at volume', 'Automatic activity logging', 'Deliverability protection']],
      ['How Rally does outbound', 'Rally unifies the outbound stack on the CRM, lets Rook personalize at volume, and logs everything, so teams scale outreach without losing quality.'],
    ],
    [
      ['Can outbound stay personalized at scale?', 'Yes. Rook tailors each touch so high-volume outreach still reads one-to-one.'],
      ['Is outbound activity logged automatically?', 'Yes. Every email, call, and task logs to the record for clean reporting.'],
      ['Does Rally protect deliverability?', 'Yes. Sending limits keep volume within healthy ranges for your domain.'],
    ],
    [
      ['Unified outbound stack', true, 'Several tools'],
      ['Personalized at volume', true, 'Mass blast'],
      ['Automatic logging', true, 'Manual entry'],
      ['Deliverability safeguards', true, false],
      ['On the CRM record', true, 'Separate app'],
    ]
  ),
  f(
    'inbound-sales-software',
    'Inbound sales software',
    'inbound leads, speed-to-lead, routing',
    'Inbound sales software captures interest from marketing and converts it fast before it cools. Rally captures inbound leads, scores and routes them in seconds, and lets Rook respond immediately with a relevant first touch, so inbound demand converts at its peak instead of aging in a queue while a competitor answers first.',
    'Inbound demand cools by the minute. Rally responds in seconds so interest converts at its peak.',
    [
      ['Instant capture and routing', 'Inbound leads are captured, scored, and routed in seconds.'],
      ['Immediate response', 'Rook responds with a relevant first touch the moment interest lands.'],
      ['Full context', 'Reps get the lead with source, campaign, and engagement history attached.'],
      ['Conversion reporting', 'See inbound conversion by source so marketing invests in what works.'],
    ],
    [
      ['What to look for in inbound sales software', 'Look for instant capture, immediate response, and clear conversion reporting.', ['Instant capture and routing', 'Immediate first touch', 'Full lead context for reps', 'Source-level conversion reporting']],
      ['How Rally does inbound sales', 'Rally captures and routes inbound leads in seconds and lets Rook respond immediately, so demand converts at its peak.'],
    ],
    [
      ['How fast does Rally respond to inbound?', 'Rook can respond within minutes, capturing interest at its peak before it cools.'],
      ['Do reps get context on inbound leads?', 'Yes. Leads arrive with source, campaign, and engagement history attached.'],
      ['Can I measure inbound conversion?', 'Yes. Rally reports conversion by source so marketing invests in what works.'],
    ],
    [
      ['Instant capture and routing', true, 'Delayed'],
      ['Immediate first touch', true, 'Hours later'],
      ['Full lead context', true, 'Bare record'],
      ['Conversion reporting', true, false],
      ['Beat competitors to reply', true, false],
    ]
  ),
  f(
    'sales-cadence-software',
    'Sales cadence software',
    'cadences, sequences, multi-touch outreach',
    'Sales cadence software structures a repeatable series of touches across channels so reps follow a proven outreach rhythm. Rally runs cadences that mix email, call, and task steps, pause on reply, and adapt by persona, with Rook personalizing each touch, so every rep follows the winning cadence without manually tracking who is due for what.',
    'A cadence keeps reps consistent when volume is high. Rally runs it and Rook keeps it personal.',
    [
      ['Multi-touch structure', 'Define a repeatable rhythm of email, call, and task steps per persona.'],
      ['Pause on reply', 'Cadences stop the instant a prospect responds so no touch is awkward.'],
      ['Rook personalizes', 'Each step is tailored to the contact so the cadence reads one-to-one.'],
      ['Step analytics', 'See which steps drive replies so you cut what does not work.'],
    ],
    [
      ['What to look for in sales cadence software', 'Look for multi-channel steps, reply detection, and per-step analytics.', ['Email, call, and task steps', 'Automatic pause on reply', 'AI personalization per step', 'Reply analytics by step']],
      ['How Rally does cadences', 'Rally runs multi-touch cadences that pause on reply and adapt by persona, with Rook personalizing each step, so reps stay consistent and human.'],
    ],
    [
      ['Do cadences pause when someone replies?', 'Yes. A cadence stops the moment a prospect responds so follow-up never feels robotic.'],
      ['Can cadences mix channels?', 'Yes. Combine email, call, and task steps in one rhythm per persona.'],
      ['Are cadence steps personalized?', 'Yes. Rook tailors each step so the cadence reads one-to-one.'],
    ],
    [
      ['Multi-channel steps', true, 'Email only'],
      ['Pause on reply', true, 'Keeps sending'],
      ['AI personalization', true, 'Templated'],
      ['Per-step analytics', true, false],
      ['On the CRM record', true, 'Separate tool'],
    ]
  ),
  f(
    'buyer-intent-software',
    'Buyer intent software',
    'intent signals, engagement, prioritization',
    'Buyer intent software identifies which accounts are actively researching so teams reach them at the right moment. Rally surfaces intent from engagement signals across email, site, and activity, raises priority on accounts showing interest, and lets Rook draft timely outreach, so reps engage buyers when they are in-market rather than guessing who is ready.',
    'Reaching a buyer while they are researching changes everything. Rally surfaces that moment and acts on it.',
    [
      ['Intent from real signals', 'Engagement across email, site, and activity reveals which accounts are in-market.'],
      ['Priority on interest', 'Accounts showing intent rise in the queue automatically.'],
      ['Timely outreach', 'Rook drafts outreach tied to the intent signal so timing is right.'],
      ['On the account record', 'Intent lives on the record, so reps see it in context.'],
    ],
    [
      ['What to look for in buyer intent software', 'Look for real engagement signals, prioritization, and timely action.', ['Intent from first-party engagement', 'Priority on interested accounts', 'Timely, signal-based outreach', 'Intent on the account record']],
      ['How Rally does buyer intent', 'Rally surfaces intent from engagement, prioritizes interested accounts, and lets Rook draft timely outreach, so reps reach buyers in-market.'],
    ],
    [
      ['Where does Rally get intent signals?', 'From first-party engagement across email, site, and activity tied to your records.'],
      ['Does intent change prioritization?', 'Yes. Accounts showing intent rise in the queue automatically.'],
      ['Can Rally act on intent?', 'Yes. Rook drafts outreach tied to the signal so timing is right.'],
    ],
    [
      ['Intent from engagement', true, false],
      ['Priority on interest', true, 'Flat queue'],
      ['Timely signal-based outreach', true, false],
      ['Intent on the record', true, 'Separate tool'],
      ['Included at one price', true, 'Costly add-on'],
    ]
  ),
  f(
    'account-management-software',
    'Account management software',
    'account view, relationships, whitespace',
    'Account management software gives teams a full view of each account, its contacts, deals, and history to grow the relationship. Rally links every contact, deal, activity, and invoice to the account, surfaces whitespace and expansion signals, and lets Rook prep account reviews, so account managers grow relationships from a complete picture, not scattered notes.',
    'Managing an account well requires seeing all of it at once. Rally puts the whole relationship on one record.',
    [
      ['Full account view', 'Contacts, deals, activity, and billing link to the account for one complete picture.'],
      ['Whitespace and expansion', 'Surface products not yet sold and accounts ripe for growth.'],
      ['Relationship health', 'See engagement and risk across the account, not just one contact.'],
      ['Rook preps reviews', 'Rook assembles an account brief for QBRs and renewals in seconds.'],
    ],
    [
      ['What to look for in account management software', 'Look for a full account view, whitespace insight, and relationship health.', ['Contacts and deals linked to the account', 'Whitespace and expansion signals', 'Account-level health', 'Assisted account reviews']],
      ['How Rally does account management', 'Rally links everything to the account, surfaces whitespace and health, and lets Rook prep reviews, so managers grow accounts from a complete picture.'],
    ],
    [
      ['Does Rally give a full account view?', 'Yes. Contacts, deals, activity, and billing link to the account for one complete picture.'],
      ['Can Rally show expansion opportunity?', 'Yes. Whitespace and engagement signals surface accounts ripe for growth.'],
      ['Can Rook prepare an account review?', 'Yes. Rook assembles an account brief for QBRs and renewals in seconds.'],
    ],
    [
      ['Full account view', true, 'Scattered records'],
      ['Whitespace insight', true, false],
      ['Account-level health', true, 'Contact-level only'],
      ['Assisted account reviews', true, false],
      ['Billing on the account', true, 'Separate system'],
    ]
  ),
  f(
    'account-planning-software',
    'Account planning software',
    'account plans, stakeholders, growth strategy',
    'Account planning software helps teams map stakeholders, set goals, and plan growth for strategic accounts. Rally captures the account plan alongside live data on the account, maps the buying committee and whitespace, and lets Rook keep the plan current and flag stalled stakeholders, so account plans stay living documents rather than a slide made once a year.',
    'Most account plans die in a slide deck. Rally keeps the plan attached to the live account and current.',
    [
      ['Living account plans', 'The plan sits on the account with live data, not a stale deck.'],
      ['Stakeholder mapping', 'Map the buying committee, roles, and relationships for strategic accounts.'],
      ['Whitespace and goals', 'Set growth goals against whitespace and track progress.'],
      ['Rook keeps it current', 'Rook updates the plan and flags stalled stakeholders automatically.'],
    ],
    [
      ['What to look for in account planning software', 'Look for living plans, stakeholder maps, and goal tracking tied to live data.', ['Plans attached to live accounts', 'Buying-committee mapping', 'Whitespace and growth goals', 'Automatic plan updates']],
      ['How Rally does account planning', 'Rally keeps account plans on the live account with stakeholder maps and goals, and Rook keeps them current, so plans stay living documents.'],
    ],
    [
      ['Are account plans tied to live data?', 'Yes. The plan sits on the account with live deals and activity, not a static deck.'],
      ['Can I map the buying committee?', 'Yes. Map stakeholders, roles, and relationships for each strategic account.'],
      ['Does the plan stay current?', 'Yes. Rook updates the plan and flags stalled stakeholders automatically.'],
    ],
    [
      ['Living account plans', true, 'Static slides'],
      ['Stakeholder mapping', true, false],
      ['Whitespace and goals', true, false],
      ['Automatic updates', true, 'Manual refresh'],
      ['On the live account', true, 'Separate doc'],
    ]
  ),
  f(
    'contact-database-software',
    'Contact database software',
    'contact database, search, enrichment, hygiene',
    'Contact database software stores and organizes your people records so they stay searchable, clean, and current. Rally keeps a linked contact database with automatic activity capture, enrichment, and duplicate handling, so the database stays trustworthy without manual upkeep, and Rook can find, segment, and act on any contact in seconds.',
    'A contact database is only worth having if it stays clean. Rally keeps it clean automatically.',
    [
      ['Linked, searchable records', 'Every contact links to company, deals, and activity and is searchable instantly.'],
      ['Automatic hygiene', 'Rook enriches, de-dupes, and flags stale records so the database stays trustworthy.'],
      ['Activity capture', 'Emails, calls, and meetings attach to contacts automatically.'],
      ['Segments on demand', 'Build reusable segments by role, industry, or activity in seconds.'],
    ],
    [
      ['What to look for in contact database software', 'Look for linked records, automatic hygiene, and easy segmentation.', ['Contacts linked to companies and deals', 'Automatic enrichment and de-dupe', 'Automatic activity capture', 'Reusable segments']],
      ['How Rally does the contact database', 'Rally keeps a linked, searchable contact database that cleans itself through Rook, so records stay current without manual upkeep.'],
    ],
    [
      ['Does Rally keep contacts clean automatically?', 'Yes. Rook enriches, de-dupes, and flags stale records so the database stays trustworthy.'],
      ['Are contacts linked to companies and deals?', 'Yes. Every contact links to its company and any deals it touches.'],
      ['Can I segment the database?', 'Yes. Build reusable segments by role, industry, or activity in seconds.'],
    ],
    [
      ['Linked records', true, 'Flat list'],
      ['Automatic hygiene', true, 'Manual cleanup'],
      ['Activity capture', true, false],
      ['On-demand segments', true, 'Static exports'],
      ['Fast search', true, 'Slow lookup'],
    ]
  ),
  f(
    'sales-tracking-software',
    'Sales tracking software',
    'activity tracking, pipeline, performance',
    'Sales tracking software records what reps do and how deals progress so managers see performance clearly. Rally tracks activity, pipeline movement, and outcomes automatically, so managers see who is doing what and where deals stand without asking, and Rook surfaces the reps and deals that need attention before a problem shows up in the number.',
    'Tracking should not mean nagging reps for updates. Rally tracks activity and pipeline automatically.',
    [
      ['Automatic activity tracking', 'Emails, calls, and meetings log themselves, so activity data is complete.'],
      ['Pipeline movement', 'See how deals move through stages and where they stall.'],
      ['Performance visibility', 'Managers see rep and team performance without status meetings.'],
      ['Rook flags attention', 'Rook surfaces the reps and deals that need attention early.'],
    ],
    [
      ['What to look for in sales tracking software', 'Look for automatic activity tracking, pipeline visibility, and early warnings.', ['Automatic activity logging', 'Pipeline movement tracking', 'Rep and team performance views', 'Early attention flags']],
      ['How Rally does sales tracking', 'Rally tracks activity and pipeline automatically and lets Rook flag what needs attention, so managers see performance without nagging reps.'],
    ],
    [
      ['Is activity tracked automatically?', 'Yes. Emails, calls, and meetings log themselves, so activity data is complete without manual entry.'],
      ['Can managers see performance without meetings?', 'Yes. Rally shows rep and team performance live, so status meetings are not needed.'],
      ['Does Rally warn about problems early?', 'Yes. Rook surfaces the reps and deals that need attention before they hit the number.'],
    ],
    [
      ['Automatic activity tracking', true, 'Manual logging'],
      ['Pipeline movement view', true, 'Static list'],
      ['Performance without meetings', true, 'Weekly check-ins'],
      ['Early attention flags', true, false],
      ['Alive on day one', true, 'Empty database'],
    ]
  ),
  f(
    'activity-tracking-software',
    'Activity tracking software',
    'activity capture, logging, timeline',
    'Activity tracking software records every rep interaction so the CRM reflects real work without manual entry. Rally captures emails, calls, and meetings automatically and attaches them to the right contact and deal, so the timeline builds itself and managers get accurate activity data, while Rook uses that activity to draft follow-ups and flag stalled deals.',
    'Manual activity logging is where CRM data goes to die. Rally captures it automatically instead.',
    [
      ['Automatic capture', 'Emails, calls, and meetings attach to the right records with no manual entry.'],
      ['Complete timeline', 'Each contact and deal shows a full, self-building activity history.'],
      ['Accurate metrics', 'Because capture is automatic, activity reports reflect reality.'],
      ['Rook acts on activity', 'Rook drafts follow-ups and flags stalled deals from the activity signal.'],
    ],
    [
      ['What to look for in activity tracking software', 'Look for automatic capture, a complete timeline, and accurate metrics.', ['Automatic email and call capture', 'Self-building activity timeline', 'Accurate activity metrics', 'Action from the activity signal']],
      ['How Rally does activity tracking', 'Rally captures activity automatically and attaches it to records, so the timeline builds itself and Rook acts on the signal.'],
    ],
    [
      ['Do reps have to log activity manually?', 'No. Emails, calls, and meetings are captured and attached automatically.'],
      ['Is the activity timeline complete?', 'Yes. Each contact and deal shows a full, self-building history.'],
      ['Does Rally act on activity?', 'Yes. Rook drafts follow-ups and flags stalled deals from the activity signal.'],
    ],
    [
      ['Automatic capture', true, 'Manual entry'],
      ['Self-building timeline', true, 'Gaps and holes'],
      ['Accurate metrics', true, 'Underreported'],
      ['Action from activity', true, false],
      ['On every record', true, 'Partial coverage'],
    ]
  ),
  f(
    'sales-call-tracking-software',
    'Sales call tracking software',
    'call logging, recording, outcomes',
    'Sales call tracking software records and logs sales calls with outcomes so nothing is lost to memory. Rally logs every call to the right contact and deal with duration, outcome, and notes, records and transcribes for coaching, and lets Rook draft the follow-up, so call activity becomes structured pipeline data instead of scribbled notes that never make the CRM.',
    'A call that never makes the CRM never happened. Rally logs and learns from every one automatically.',
    [
      ['Automatic call logging', 'Calls log with duration, outcome, and notes attached to the record.'],
      ['Recording and transcription', 'Recordings and transcripts feed coaching and search.'],
      ['Outcome tracking', 'Track connect, meeting-set, and no-answer outcomes for accurate metrics.'],
      ['Rook drafts follow-up', 'Rook writes the post-call follow-up so momentum holds.'],
    ],
    [
      ['What to look for in sales call tracking software', 'Look for automatic logging, recording, and outcome tracking.', ['Automatic logging with outcomes', 'Recording and transcription', 'Connect and outcome metrics', 'Follow-up drafted from the call']],
      ['How Rally does call tracking', 'Rally logs every call with outcome, records and transcribes it, and lets Rook draft follow-up, so calls become structured pipeline data.'],
    ],
    [
      ['Are calls logged automatically?', 'Yes. Calls log with duration, outcome, and notes attached to the contact and deal.'],
      ['Can I record and review calls?', 'Yes. Recordings and transcripts feed coaching and search.'],
      ['Does Rally draft call follow-up?', 'Yes. Rook writes the post-call follow-up so momentum holds.'],
    ],
    [
      ['Automatic call logging', true, 'Manual notes'],
      ['Recording and transcription', true, false],
      ['Outcome metrics', true, 'Guesswork'],
      ['Follow-up drafted', true, false],
      ['On the deal record', true, 'Separate tool'],
    ]
  ),
  f(
    'deal-tracking-software',
    'Deal tracking software',
    'deal status, stages, next steps',
    'Deal tracking software follows each opportunity through its stages with status, value, and next step visible. Rally tracks every deal on a live pipeline with a deep deal record, enforces a next step on each one, and lets Rook flag slipping dates and stalled deals, so a deal never goes dark and managers always know exactly where every opportunity stands.',
    'A tracked deal is one that never goes dark. Rally keeps status, value, and next step current on every one.',
    [
      ['Live deal status', 'See stage, value, and next step on every deal in real time.'],
      ['Next-step enforcement', 'Each deal carries a next step, and Rally flags any without one.'],
      ['Slip detection', 'Rook flags slipping close dates and stalled deals early.'],
      ['Full history', 'Every touch attaches to the deal so status is always explainable.'],
    ],
    [
      ['What to look for in deal tracking software', 'Look for live status, enforced next steps, and slip detection.', ['Real-time deal status', 'Required next steps', 'Slip and stall detection', 'Complete deal history']],
      ['How Rally does deal tracking', 'Rally tracks every deal live with a next step and full history, and Rook flags slips, so no deal goes dark.'],
    ],
    [
      ['Does every deal show a next step?', 'Yes. Rally enforces a next step on each deal and flags any that lack one.'],
      ['Does Rally catch slipping deals?', 'Yes. Rook flags slipping close dates and stalled deals early.'],
      ['Is deal history complete?', 'Yes. Every touch attaches to the deal so status is always explainable.'],
    ],
    [
      ['Live deal status', true, 'Stale snapshot'],
      ['Next-step enforcement', true, false],
      ['Slip detection', true, 'Found at quarter end'],
      ['Complete history', true, 'Partial notes'],
      ['Alive on day one', true, 'Empty board'],
    ]
  ),
  f(
    'sales-pipeline-software',
    'Sales pipeline software',
    'pipeline stages, coverage, velocity',
    'Sales pipeline software visualizes deals by stage so teams manage flow and coverage against quota. Rally ships a live pipeline that is alive on day one, shows coverage and velocity, and feeds the forecast directly, and Rook flags stalled deals and missing next steps, so the pipeline reflects reality instead of a hopeful roll-up nobody has scrubbed.',
    'A pipeline should show flow, coverage, and truth at a glance. Rally shows all three without a report build.',
    [
      ['Live visual pipeline', 'Drag-to-advance stages with value roll-ups that feed the forecast.'],
      ['Coverage and velocity', 'See pipeline coverage against quota and how fast deals move.'],
      ['Honest pipeline', 'Rook flags stalled and unrealistic deals so the roll-up is trustworthy.'],
      ['Multiple pipelines', 'Run new business, renewals, and partner pipelines separately.'],
    ],
    [
      ['What to look for in sales pipeline software', 'Look for a live board, coverage and velocity, and honest roll-ups.', ['Live pipeline with value roll-ups', 'Coverage against quota', 'Stage velocity', 'Stalled-deal flags']],
      ['How Rally does the sales pipeline', 'Rally gives a live pipeline with coverage and velocity that feeds the forecast, and Rook keeps it honest, so the roll-up reflects reality.'],
    ],
    [
      ['Does the pipeline feed the forecast?', 'Yes. Pipeline value rolls into the weighted forecast automatically.'],
      ['Can I see coverage against quota?', 'Yes. Rally shows pipeline coverage and the gap to plan.'],
      ['Can I run multiple pipelines?', 'Yes. Run new business, renewals, and partner pipelines separately.'],
    ],
    [
      ['Live pipeline board', true, 'Static list'],
      ['Coverage and velocity', true, false],
      ['Feeds the forecast', true, 'Separate export'],
      ['Stalled-deal flags', true, false],
      ['Multiple pipelines', true, 'One only'],
    ]
  ),
  f(
    'pipeline-forecasting-software',
    'Pipeline forecasting software',
    'pipeline forecast, weighting, coverage',
    'Pipeline forecasting software projects revenue from open pipeline using stage weighting and deal health. Rally forecasts from the live pipeline so weighted, commit, and best-case views update as deals move, shows coverage against quota, and lets Rook flag the deals putting the number at risk, so the forecast is a live picture rather than a quarter-end guess.',
    'Forecasting from pipeline works when the pipeline is honest and live. Rally keeps both true automatically.',
    [
      ['Weighted pipeline forecast', 'Weighted, commit, and best-case views update as deals move.'],
      ['Coverage math', 'See coverage against quota and the exact gap to close.'],
      ['Risk on the number', 'Rook flags the specific deals putting the forecast at risk.'],
      ['No parallel model', 'The forecast reads the pipeline, so there is no spreadsheet to reconcile.'],
    ],
    [
      ['What to look for in pipeline forecasting software', 'Look for live weighting, coverage math, and deal-level risk.', ['Weighted and commit views', 'Coverage and gap-to-goal', 'Deal-level risk flags', 'No parallel spreadsheet']],
      ['How Rally does pipeline forecasting', 'Rally forecasts from the live pipeline with weighting and coverage, and Rook flags risk, so the forecast is a live picture, not a guess.'],
    ],
    [
      ['Does the forecast update as deals move?', 'Yes. Weighted, commit, and best-case views update in real time.'],
      ['Can I see coverage and the gap?', 'Yes. Rally shows coverage against quota and the exact dollar gap.'],
      ['Is there a separate forecast model?', 'No. The forecast reads the pipeline directly, so nothing is reconciled.'],
    ],
    [
      ['Live weighted forecast', true, 'Manual spreadsheet'],
      ['Coverage and gap math', true, false],
      ['Deal-level risk', true, 'Totals only'],
      ['No reconciliation', true, 'Constant drift'],
      ['Reads live pipeline', true, 'Stale snapshot'],
    ]
  ),
  f(
    'revenue-forecasting-software',
    'Revenue forecasting software',
    'revenue forecast, bookings, recurring',
    'Revenue forecasting software projects total revenue across new business, renewals, and recurring streams. Rally forecasts revenue from the same deals, renewals, and subscriptions the team works, so new, recurring, and total revenue project from one source and tie out with reporting, and Rook explains any change, so finance and sales forecast from one honest number.',
    'Revenue forecasting fails when new and recurring live in different tools. Rally forecasts both from one source.',
    [
      ['One-source revenue forecast', 'New, recurring, and total revenue project from the same records.'],
      ['Recurring awareness', 'Renewals and subscriptions factor into the forecast automatically.'],
      ['Ties to reporting', 'The forecast and revenue reports read the same data, so they agree.'],
      ['Rook explains change', 'Ask Rook why the forecast moved and see the deals behind it.'],
    ],
    [
      ['What to look for in revenue forecasting software', 'Look for a single source, recurring-revenue support, and reporting alignment.', ['New and recurring in one forecast', 'Renewal and subscription awareness', 'Alignment with revenue reporting', 'Explainable movement']],
      ['How Rally does revenue forecasting', 'Rally projects new, recurring, and total revenue from one source that ties to reporting, and Rook explains change, so finance and sales share one number.'],
    ],
    [
      ['Does Rally forecast recurring revenue?', 'Yes. Renewals and subscriptions factor into the forecast automatically.'],
      ['Does the forecast match revenue reports?', 'Yes. Both read the same records, so they tie out.'],
      ['Can Rook explain a forecast change?', 'Yes. Ask Rook why revenue moved and see the deals behind it.'],
    ],
    [
      ['New + recurring in one forecast', true, 'Split tools'],
      ['Renewal awareness', true, false],
      ['Ties to reporting', true, 'Reconciled by hand'],
      ['Explainable movement', true, false],
      ['One source of truth', true, 'Multiple sources'],
    ]
  ),
  f(
    'sales-forecasting-tools',
    'Sales forecasting tools',
    'forecast roll-up, scenarios, quota',
    'Sales forecasting tools help teams predict how much they will close by weighting pipeline and tracking attainment. Rally forecasts natively from live deals, so weighted, commit, and best-case roll-ups update in real time, coverage and gap-to-quota are always visible, and Rook flags at-risk deals, giving teams a forecast they can trust without a spreadsheet.',
    'The best forecasting tool is the one wired to your deals. Rally forecasts from live data, not a copy of it.',
    [
      ['Live roll-ups', 'Weighted, commit, and best-case forecasts update as deals move.'],
      ['Quota and coverage', 'Track attainment, coverage, and gap-to-goal in real time.'],
      ['Scenario views', 'Toggle best, commit, and worst case and drill into the deals behind each.'],
      ['Rook flags risk', 'Rook surfaces the deals threatening the number early.'],
    ],
    [
      ['What to look for in sales forecasting tools', 'Look for live roll-ups, quota tracking, and scenario views tied to deals.', ['Weighted and commit roll-ups', 'Quota, coverage, and gap', 'Best, commit, and worst case', 'Deal-level risk flags']],
      ['How Rally does forecasting tools', 'Rally forecasts from live deals with weighted roll-ups, quota tracking, and scenarios, and Rook flags risk, so the forecast is trustworthy without a spreadsheet.'],
    ],
    [
      ['Do Rally forecasting tools need a spreadsheet?', 'No. The forecast reads live deals, so there is nothing to export or reconcile.'],
      ['Can I see scenarios?', 'Yes. Toggle best, commit, and worst case and drill into the underlying deals.'],
      ['Is quota tracked?', 'Yes. Attainment, coverage, and gap-to-goal update in real time.'],
    ],
    [
      ['Live weighted roll-ups', true, 'Manual spreadsheet'],
      ['Quota and coverage', true, false],
      ['Scenario views', true, 'Single guess'],
      ['Deal-level risk', true, false],
      ['Reads live deals', true, 'Copy of data'],
    ]
  ),
  f(
    'predictive-sales-software',
    'Predictive sales software',
    'predictive scoring, deal outcomes, risk',
    'Predictive sales software uses patterns in your data to predict which leads convert and which deals close. Rally scores leads and flags deal risk from signals in your own history, so predictions reflect how your business actually wins, and Rook turns each prediction into an action, so the insight ends in a drafted next step rather than a probability nobody uses.',
    'A prediction is only useful if it changes what a rep does next. Rally turns predictions into actions.',
    [
      ['Predictive lead scoring', 'Rank leads by likelihood to convert based on your own won-deal patterns.'],
      ['Deal outcome signals', 'Predict which deals are likely to slip or stall and why.'],
      ['Grounded in your data', 'Predictions learn from your history, not a generic model.'],
      ['Rook acts on it', 'Each prediction comes with a drafted next step, not just a number.'],
    ],
    [
      ['What to look for in predictive sales software', 'Look for predictions grounded in your data and tied to action.', ['Predictive lead and deal scoring', 'Outcome and risk prediction', 'Models trained on your history', 'Action from every prediction']],
      ['How Rally does predictive sales', 'Rally predicts lead conversion and deal risk from your own data, and Rook turns each prediction into a drafted next step, so insight becomes action.'],
    ],
    [
      ['What data drives Rally predictions?', 'Your own won and lost history, so predictions reflect how your business actually wins.'],
      ['Do predictions come with an action?', 'Yes. Rook drafts the next step, so a prediction is not just a number.'],
      ['Can it predict deal risk?', 'Yes. Rally predicts which deals are likely to slip or stall and why.'],
    ],
    [
      ['Grounded in your data', true, 'Generic model'],
      ['Deal risk prediction', true, false],
      ['Action from prediction', true, 'Number only'],
      ['Predictive lead scoring', true, 'Static rules'],
      ['Included at one price', true, 'Premium tier'],
    ]
  ),
  f(
    'ai-sales-assistant-software',
    'AI sales assistant software',
    'AI assistant, drafting, prioritization',
    'AI sales assistant software helps reps by drafting outreach, prioritizing work, and answering questions. Rally gives every rep Rook, an operator that drafts and sends follow-ups, updates deals, builds quotes, and answers questions from live data, so the assistant executes real work rather than only suggesting it, and reps get hours back every week.',
    'Most AI assistants suggest; Rook executes. Rally gives every rep an operator that does the work.',
    [
      ['Drafts and sends', 'Rook drafts follow-ups, emails, and quotes and can send on approval.'],
      ['Prioritizes the day', 'Rook ranks the queue so reps always work the highest-value action.'],
      ['Answers from your data', 'Ask Rook anything about an account or deal and get a grounded answer.'],
      ['Executes multi-step work', 'Rook completes tasks end to end, not just one suggestion at a time.'],
    ],
    [
      ['What to look for in an AI sales assistant', 'Look for an assistant that executes, prioritizes, and is grounded in your data.', ['Drafting and sending', 'Daily prioritization', 'Grounded answers', 'Multi-step execution']],
      ['How Rally does the AI sales assistant', 'Rally gives reps Rook, which drafts, prioritizes, answers, and executes multi-step work from live data, so the assistant produces finished output.'],
    ],
    [
      ['What can the AI sales assistant do?', 'Rook drafts and sends outreach, updates deals, builds quotes, prioritizes the day, and answers questions from your data.'],
      ['Does it just suggest, or take action?', 'It executes. Rook completes multi-step work end to end, with review guardrails you control.'],
      ['Is it grounded in my data?', 'Yes. Rook answers and acts from your live CRM records, not a generic model.'],
    ],
    [
      ['Executes multi-step work', true, 'Suggestions only'],
      ['Drafts and sends', true, 'Manual writing'],
      ['Daily prioritization', true, false],
      ['Grounded in your data', true, 'Generic'],
      ['Review guardrails', true, 'All or nothing'],
    ]
  ),
  f(
    'sales-productivity-software',
    'Sales productivity software',
    'rep efficiency, automation, focus',
    'Sales productivity software helps reps spend more time selling and less on admin. Rally removes manual logging with automatic activity capture, prioritizes the day so reps work the right deals, and lets Rook handle follow-ups and updates, so reps reclaim the hours usually lost to data entry and get a clear next action instead of a cluttered to-do list.',
    'Rep productivity is mostly about removing admin. Rally deletes the data entry and Rook does the busywork.',
    [
      ['No manual logging', 'Automatic activity capture removes the biggest admin drain.'],
      ['Prioritized queue', 'Rally ranks the day so reps work the highest-value action first.'],
      ['Rook does busywork', 'Rook drafts follow-ups and updates records so reps stay in flow.'],
      ['Fewer tools', 'One platform means less context switching and fewer logins.'],
    ],
    [
      ['What to look for in sales productivity software', 'Look for automatic capture, prioritization, and less tool sprawl.', ['Automatic activity capture', 'Prioritized daily queue', 'AI-handled busywork', 'One consolidated platform']],
      ['How Rally does sales productivity', 'Rally removes logging, prioritizes the day, and lets Rook handle busywork on one platform, so reps get hours back for selling.'],
    ],
    [
      ['How does Rally save reps time?', 'By removing manual logging, prioritizing the day, and letting Rook handle follow-ups and updates.'],
      ['Does Rally reduce tool switching?', 'Yes. One platform covers pipeline, engagement, quotes, and reporting, so reps log in once.'],
      ['What is the biggest productivity gain?', 'Eliminating manual data entry through automatic activity capture is usually the largest single win.'],
    ],
    [
      ['Automatic activity capture', true, 'Manual entry'],
      ['Prioritized daily queue', true, 'Cluttered list'],
      ['AI handles busywork', true, false],
      ['One platform', true, 'Many tools'],
      ['Clear next action', true, 'Guesswork'],
    ]
  ),
  f(
    'sales-workflow-software',
    'Sales workflow software',
    'process automation, stages, handoffs',
    'Sales workflow software automates the steps of a sales process so nothing falls through the cracks. Rally lets teams build visual workflows that fire tasks, emails, routing, and field updates on real events, with Rook available as a step that produces finished work, so the sales process runs consistently without a manager policing every handoff.',
    'A sales process only holds if it runs itself. Rally automates the steps and Rook does the work in them.',
    [
      ['Visual workflow builder', 'Assemble triggers, conditions, and actions with no code.'],
      ['Event-driven', 'Fire workflows on stage changes, scores, forms, or dates.'],
      ['Rook as a step', 'Insert Rook to draft, summarize, or update inside the flow.'],
      ['Consistent process', 'Automated handoffs keep every deal following the winning motion.'],
    ],
    [
      ['What to look for in sales workflow software', 'Look for a visual builder, rich triggers, and AI steps.', ['No-code visual builder', 'Event and condition triggers', 'Cross-object actions', 'AI steps that do work']],
      ['How Rally does sales workflow', 'Rally lets anyone build visual workflows on real events, with Rook as a step that produces finished work, so the process runs consistently.'],
    ],
    [
      ['Do I need code to build workflows?', 'No. Rally workflows are visual, with triggers, conditions, and actions.'],
      ['Can workflows enforce handoffs?', 'Yes. Automated routing and tasks keep handoffs consistent across the process.'],
      ['Can AI be a workflow step?', 'Yes. Rook can draft, summarize, or update inside a workflow.'],
    ],
    [
      ['No-code visual builder', true, 'Admin-only config'],
      ['Event-driven triggers', true, 'Manual steps'],
      ['AI steps', true, false],
      ['Cross-object actions', true, 'Single-object'],
      ['Consistent handoffs', true, 'Manual policing'],
    ]
  ),
  f(
    'sales-team-management-software',
    'Sales team management software',
    'team visibility, coaching, performance',
    'Sales team management software gives managers visibility into rep activity, pipeline, and performance to lead effectively. Rally shows live activity, pipeline, and attainment per rep, surfaces coaching moments from real calls and deals, and lets Rook flag who needs help, so managers coach from evidence and run the team without a wall of status meetings.',
    'Managing a team should run on evidence, not status meetings. Rally puts the evidence in front of managers.',
    [
      ['Live team visibility', 'See activity, pipeline, and attainment per rep in real time.'],
      ['Evidence-based coaching', 'Coach from real calls and deals, not gut feel.'],
      ['Early intervention', 'Rook flags reps drifting off pace while there is time to act.'],
      ['Fair workload view', 'See coverage and workload to balance the team.'],
    ],
    [
      ['What to look for in sales team management software', 'Look for live visibility, evidence-based coaching, and early warnings.', ['Per-rep activity and attainment', 'Call and deal-based coaching', 'Off-pace alerts', 'Workload and coverage views']],
      ['How Rally does team management', 'Rally gives managers live per-rep visibility, coaching evidence, and Rook alerts, so they lead the team from data rather than meetings.'],
    ],
    [
      ['Can I see each rep performance live?', 'Yes. Activity, pipeline, and attainment update per rep in real time.'],
      ['Does Rally help with coaching?', 'Yes. Coach from real calls and deals, and Rook flags coachable moments.'],
      ['Can I balance workload?', 'Yes. Coverage and workload views help you balance the team fairly.'],
    ],
    [
      ['Live per-rep visibility', true, 'Status meetings'],
      ['Evidence-based coaching', true, 'Gut feel'],
      ['Off-pace alerts', true, false],
      ['Workload views', true, false],
      ['Alive on day one', true, 'Setup project'],
    ]
  ),
  f(
    'quota-management-software',
    'Quota management software',
    'quotas, attainment, gap-to-goal',
    'Quota management software sets and tracks sales targets so every rep and team knows where they stand. Rally ties quotas to live CRM data, so attainment, pacing, and gap-to-goal update as deals close, and Rook flags who is off pace early, so quota tracking is a live scoreboard instead of a month-end spreadsheet nobody trusts.',
    'Quota tracking works when the scoreboard is live. Rally updates attainment as deals close, not at month end.',
    [
      ['Flexible quotas', 'Set revenue and activity quotas by rep, team, and period.'],
      ['Live attainment', 'Attainment and pacing update as deals close.'],
      ['Gap-to-goal', 'See exactly how much is left to hit plan and the pipeline to source it.'],
      ['Rook flags off pace', 'Rook surfaces reps drifting off pace early enough to act.'],
    ],
    [
      ['What to look for in quota management software', 'Look for flexible quotas, live attainment, and gap-to-goal.', ['Revenue and activity quotas', 'Real-time attainment and pacing', 'Gap-to-goal math', 'Early off-pace alerts']],
      ['How Rally does quota management', 'Rally ties quotas to live data so attainment and gap-to-goal update as deals close, and Rook flags who is off pace.'],
    ],
    [
      ['Are quotas tracked in real time?', 'Yes. Attainment and pacing update as deals close.'],
      ['Can I set activity quotas too?', 'Yes. Set both revenue and activity quotas by rep, team, and period.'],
      ['Does Rally show the gap to goal?', 'Yes. See exactly how much is left and the pipeline needed to source it.'],
    ],
    [
      ['Live attainment', true, 'Month-end spreadsheet'],
      ['Revenue and activity quotas', true, 'Revenue only'],
      ['Gap-to-goal math', true, false],
      ['Off-pace alerts', true, false],
      ['Tied to live data', true, 'Manual updates'],
    ]
  ),
  f(
    'sales-compensation-software',
    'Sales compensation software',
    'comp plans, commissions, accelerators',
    'Sales compensation software models comp plans and calculates what reps earn accurately. Rally computes commissions from the same deals it forecasts, applies plan rules, tiers, and accelerators, and shows reps live expected earnings, so payouts are accurate and transparent, disputes drop, and finance stops rebuilding a comp spreadsheet at the end of every period.',
    'Comp trust comes from transparent math on real deals. Rally computes it from the deals reps already see.',
    [
      ['Plan modeling', 'Model rates, tiers, and accelerators to match your comp plan.'],
      ['Accurate calculation', 'Commissions compute from live closed deals, so numbers agree.'],
      ['Live rep earnings', 'Reps see expected payout in real time, cutting disputes.'],
      ['Audit-ready', 'Every payout shows the deals and rules behind it.'],
    ],
    [
      ['What to look for in sales compensation software', 'Look for flexible plans, accurate calculation, and rep transparency.', ['Tiered rates and accelerators', 'Calculation from live deals', 'Real-time rep earnings', 'Auditable payouts']],
      ['How Rally does sales compensation', 'Rally models comp plans and computes commissions from closed deals with live rep visibility, so payouts are accurate and disputes drop.'],
    ],
    [
      ['Does Rally support accelerators and tiers?', 'Yes. Model tiered rates and accelerators to match your plan.'],
      ['Can reps see expected earnings?', 'Yes. Reps see live expected payout, which cuts disputes.'],
      ['Is the calculation auditable?', 'Yes. Every payout shows the deals and rules behind it.'],
    ],
    [
      ['Plan modeling', true, 'Spreadsheet formulas'],
      ['Calculation from live deals', true, 'Manual rebuild'],
      ['Live rep earnings', true, false],
      ['Auditable payouts', true, 'Opaque math'],
      ['Ties to the forecast', true, 'Separate data'],
    ]
  ),
  f(
    'sales-goal-tracking-software',
    'Sales goal tracking software',
    'goals, targets, progress, pacing',
    'Sales goal tracking software sets targets and tracks progress toward them across reps and teams. Rally ties revenue and activity goals to live CRM data, so progress and pacing update automatically, everyone sees the same scoreboard, and Rook flags goals at risk early, so goal tracking motivates the team instead of surprising them at the deadline.',
    'A goal you check once a month is a goal you miss. Rally keeps progress live and flags risk early.',
    [
      ['Revenue and activity goals', 'Set goals for outcomes and the activities that drive them.'],
      ['Live progress', 'Progress and pacing update automatically as work happens.'],
      ['Shared scoreboard', 'Everyone sees the same live goal view, from rep to leadership.'],
      ['Rook flags risk', 'Rook surfaces goals trending to a miss early enough to change course.'],
    ],
    [
      ['What to look for in sales goal tracking software', 'Look for live progress, shared visibility, and early risk flags.', ['Revenue and activity goals', 'Real-time progress and pacing', 'Shared scoreboard', 'Early risk alerts']],
      ['How Rally does goal tracking', 'Rally ties goals to live data so progress updates automatically and Rook flags risk, so goals motivate instead of surprising.'],
    ],
    [
      ['Are goals tracked in real time?', 'Yes. Progress and pacing update automatically as work happens.'],
      ['Can I track activity goals too?', 'Yes. Set goals for both outcomes and the activities that drive them.'],
      ['Does Rally warn about missed goals?', 'Yes. Rook flags goals trending to a miss early enough to act.'],
    ],
    [
      ['Live progress', true, 'Monthly check'],
      ['Revenue and activity goals', true, 'Revenue only'],
      ['Shared scoreboard', true, 'Siloed views'],
      ['Early risk alerts', true, false],
      ['Tied to live data', true, 'Manual tallies'],
    ]
  ),
  f(
    'sales-kpi-software',
    'Sales KPI software',
    'KPIs, metrics, scorecards, dashboards',
    'Sales KPI software tracks the metrics that show whether the sales engine is healthy: win rate, cycle time, activity, and attainment. Rally computes these live from CRM data on role-based dashboards, every tile drills into the records behind it, and Rook highlights which KPI moved and why, so leaders act on current numbers rather than stale slides.',
    'A KPI is only useful if it is live and you can act on it. Rally keeps every metric current and clickable.',
    [
      ['Core sales KPIs', 'Win rate, cycle time, activity, coverage, and attainment in one place.'],
      ['Live and clickable', 'Every KPI updates in real time and drills into the records behind it.'],
      ['Role-based views', 'Reps, managers, and execs each see the KPIs for their job.'],
      ['Rook explains moves', 'Rook highlights which KPI changed and why.'],
    ],
    [
      ['What to look for in sales KPI software', 'Look for live metrics, drill-down, and role-based views.', ['Core sales KPIs computed live', 'Drill-down on every tile', 'Role-based dashboards', 'AI explanation of changes']],
      ['How Rally does sales KPIs', 'Rally computes core KPIs live on role-based dashboards with drill-down, and Rook explains changes, so leaders act on current numbers.'],
    ],
    [
      ['Which KPIs does Rally track?', 'Win rate, cycle time, activity, coverage, attainment, and more, computed live from CRM data.'],
      ['Can I drill into a KPI?', 'Yes. Every tile drills into the exact records behind it.'],
      ['Does Rally explain KPI changes?', 'Yes. Rook highlights which metric moved and why.'],
    ],
    [
      ['Live KPIs', true, 'Stale slides'],
      ['Drill-down on tiles', true, false],
      ['Role-based views', true, 'One-size dashboard'],
      ['AI explains changes', true, false],
      ['Alive on day one', true, 'Build project'],
    ]
  ),
  f(
    'call-recording-software',
    'Call recording software',
    'call recording, transcription, compliance',
    'Call recording software captures sales and support calls with transcription for review, coaching, and compliance. Rally records connected calls, transcribes them, and attaches the recording to the contact and deal, so nothing said on a call is lost, reps skip manual notes, and managers coach from what actually happened.',
    'A call you cannot revisit is a call you learn nothing from. Rally keeps every call searchable on the record.',
    [
      ['Automatic recording and transcript', 'Connected calls record and transcribe, then attach to the right record.'],
      ['Searchable call history', 'Search transcripts across the team to find objections, competitors, and commitments.'],
      ['Compliance-friendly', 'Consent prompts and retention controls support common compliance needs.'],
      ['Rook summarizes calls', 'Rook writes a summary and next steps from each call automatically.'],
    ],
    [
      ['What to look for in call recording software', 'Look for reliable capture, accurate transcription, search, and compliance controls.', ['Automatic recording and transcription', 'Searchable transcripts', 'Consent and retention controls', 'AI call summaries']],
      ['How Rally does call recording', 'Rally records and transcribes connected calls, attaches them to the record, and lets Rook summarize each one, so calls become searchable data and clean notes.'],
    ],
    [
      ['Does Rally transcribe calls?', 'Yes. Connected calls are transcribed and attached to the contact and deal.'],
      ['Can I search call transcripts?', 'Yes. Search across transcripts to find objections, competitors, and commitments.'],
      ['Does Rally summarize calls?', 'Yes. Rook writes a summary and next steps from each recorded call automatically.'],
    ]
  ),
  f(
    'buying-committee-tracking-software',
    'Buying committee tracking software',
    'stakeholders, champions, decision-makers',
    'Buying committee tracking software maps everyone involved in a purchase and their role, sentiment, and influence. Rally tracks the full committee on each deal, including champions, economic buyers, and blockers, so reps know who to engage next, and Rook flags single-threaded deals and missing stakeholders before they cost the deal.',
    'Deals die when they are single-threaded. Rally makes the whole committee visible so no stakeholder is missed.',
    [
      ['Full committee on the deal', 'Track every stakeholder, role, sentiment, and influence level on the record.'],
      ['Champion and blocker signals', 'See who supports and who resists so you engage the right people.'],
      ['Single-thread warnings', 'Rally flags deals hanging on one contact so you multi-thread in time.'],
      ['Rook recommends outreach', 'Rook suggests who to engage next and drafts the message.'],
    ],
    [
      ['What to look for in buying committee tracking software', 'Look for stakeholder mapping, sentiment, and single-threading alerts.', ['Role and influence per stakeholder', 'Champion and blocker tracking', 'Single-thread risk alerts', 'AI-recommended next contact']],
      ['How Rally does buying committee tracking', 'Rally maps the full committee on each deal with role and sentiment, warns on single-threaded deals, and lets Rook recommend and draft the next stakeholder touch.'],
    ],
    [
      ['Can Rally track every stakeholder on a deal?', 'Yes. Capture each person, their role, sentiment, and influence on the deal record.'],
      ['Does Rally warn about single-threaded deals?', 'Yes. It flags deals hanging on one contact so you can multi-thread in time.'],
      ['Can Rook suggest who to engage?', 'Yes. Rook recommends the next stakeholder to reach and drafts the outreach.'],
    ]
  ),
  f(
    'content-management-software',
    'Sales content management software',
    'content library, versioning, access',
    'Sales content management software organizes decks, case studies, and collateral so reps always use the current, approved version. Rally keeps a central content library tied to deals and stages, tracks versions and usage, and lets Rook surface the right asset, so no rep sends an outdated deck or hunts through folders for a case study.',
    'The wrong version sent to a buyer erodes trust. Rally keeps one approved source and surfaces it in context.',
    [
      ['Central approved library', 'One source of current, approved collateral for the whole team.'],
      ['Version control', 'Retire old versions automatically so only the latest goes out.'],
      ['Usage tracking', 'See what reps send and what prospects engage with.'],
      ['Rook surfaces the right asset', 'Rook recommends the right content for the deal and stage.'],
    ],
    [
      ['What to look for in sales content management software', 'Look for a central library, version control, and usage insight.', ['Central approved content library', 'Automatic version control', 'Usage and engagement tracking', 'AI content surfacing']],
      ['How Rally does content management', 'Rally holds one approved library tied to deals and stages, controls versions, and lets Rook surface the right asset, so reps always send current, on-brand content.'],
    ],
    [
      ['How does Rally prevent outdated collateral?', 'Version control retires old files so only the current, approved version is available.'],
      ['Can I see which content reps use?', 'Yes. Rally tracks usage and prospect engagement across the library.'],
      ['Does Rook help find content?', 'Yes. Rook recommends the right asset for the deal and stage.'],
    ]
  ),
  f(
    'document-tracking-software',
    'Document tracking software',
    'link tracking, engagement, page-level analytics',
    'Document tracking software tells you when a shared document is opened and how it is read. Rally shares proposals, decks, and one-pagers as tracked links, showing opens, time per page, and forwards on the deal, so reps know when interest spikes and Rook can time follow-up to the moment a buyer is actively reading.',
    'Sending a document blind wastes your best timing signal. Rally shows exactly how buyers engage.',
    [
      ['Page-level engagement', 'See which pages a buyer reads and how long they spend on each.'],
      ['Open and forward alerts', 'Get notified when a document is opened or forwarded to a new stakeholder.'],
      ['Deal-linked tracking', 'Engagement attaches to the deal, revealing hidden committee members.'],
      ['Rook times follow-up', 'Rook triggers outreach when engagement spikes so you catch buyers in the moment.'],
    ],
    [
      ['What to look for in document tracking software', 'Look for page-level analytics, forward detection, and CRM linkage.', ['Page-level read analytics', 'Open and forward alerts', 'Engagement tied to the deal', 'Follow-up on engagement spikes']],
      ['How Rally does document tracking', 'Rally shares documents as tracked links, records page-level engagement on the deal, and lets Rook time follow-up to the moment a buyer is reading.'],
    ],
    [
      ['Can Rally show which pages were read?', 'Yes. See page-level read time so you know what a buyer focused on.'],
      ['Does Rally detect forwards?', 'Yes. Forwarding alerts can reveal hidden committee members on the deal.'],
      ['Can follow-up be automated on engagement?', 'Yes. Rook can trigger outreach when document engagement spikes.'],
    ]
  ),
  f(
    'data-enrichment-software',
    'Data enrichment software',
    'contact enrichment, firmographics, data hygiene',
    'Data enrichment software fills in and updates missing contact and company details automatically. Rally enriches records on capture and on a schedule, adding titles, firmographics, and verified emails, and Rook flags stale or conflicting data, so your database stays accurate without reps manually researching and typing in fields.',
    'Sales runs on accurate data. Rally enriches records automatically so reps stop doing manual research.',
    [
      ['Enrich on capture', 'New leads and contacts fill in with firmographics and verified details on arrival.'],
      ['Scheduled refresh', 'Records refresh over time so titles and company data do not go stale.'],
      ['Verified emails', 'Reduce bounces with validated contact emails.'],
      ['Rook flags bad data', 'Rook surfaces conflicting or outdated fields for review.'],
    ],
    [
      ['What to look for in data enrichment software', 'Look for enrichment on capture, scheduled refresh, and email verification.', ['Firmographic and contact enrichment', 'Scheduled data refresh', 'Email verification', 'Stale-data detection']],
      ['How Rally does data enrichment', 'Rally enriches records on capture and on a schedule, verifies emails, and lets Rook flag stale data, so the database stays accurate without manual research.'],
    ],
    [
      ['Does Rally enrich new leads automatically?', 'Yes. New leads and contacts fill in firmographics and verified details on capture.'],
      ['Does enrichment keep data fresh over time?', 'Yes. Scheduled refresh updates titles and company data so records do not go stale.'],
      ['Can Rally verify emails?', 'Yes. Email verification reduces bounces on outbound sends.'],
    ]
  ),
  f(
    'landing-page-software',
    'Landing page software',
    'landing pages, conversion, lead capture',
    'Landing page software builds focused web pages designed to convert visitors into leads. Rally landing pages capture directly into the CRM with built-in forms and tracking, so every conversion becomes a scored, attributed lead and Rook can follow up instantly, connecting campaign spend to pipeline without stitching separate page and CRM tools together.',
    'A landing page is only as good as what happens after the click. Rally connects conversions straight to pipeline.',
    [
      ['CRM-native capture', 'Page conversions become scored, attributed leads directly in the CRM.'],
      ['Built-in tracking', 'Traffic and conversion data tie to the campaign and the resulting deals.'],
      ['Fast to publish', 'Launch focused pages quickly without a developer.'],
      ['Rook follows up', 'Rook responds to conversions in minutes to keep momentum.'],
    ],
    [
      ['What to look for in landing page software', 'Look for CRM-native capture, conversion tracking, and fast publishing.', ['Direct CRM lead capture', 'Conversion and attribution tracking', 'No-code publishing', 'Automated follow-up']],
      ['How Rally does landing pages', 'Rally landing pages capture straight into the CRM with tracking, so conversions become attributed leads and Rook follows up fast, tying spend to pipeline.'],
    ],
    [
      ['Do landing page conversions go into the CRM?', 'Yes. Each conversion becomes a scored, attributed lead directly in Rally.'],
      ['Can I attribute revenue to a landing page?', 'Yes. Conversion tracking ties pages to the campaigns and deals they produce.'],
      ['Does Rook follow up on conversions?', 'Yes. Rook can respond to a conversion within minutes.'],
    ]
  ),
  f(
    'chatbot-software',
    'Chatbot software',
    'website chatbot, qualification, routing',
    'Chatbot software engages website visitors, answers questions, and qualifies leads automatically. Rally chat runs on your CRM data, so it can qualify, book meetings, and create leads in real time, and Rook powers responses that understand the account, turning your website into a 24/7 rep instead of a form that emails someone later.',
    'A chatbot should qualify and book, not just collect an email. Rally chat acts on the CRM in real time.',
    [
      ['Qualify in real time', 'The bot asks the right questions and scores visitors on the spot.'],
      ['Book and route instantly', 'Qualified visitors can book a meeting or route to a live rep immediately.'],
      ['CRM-native context', 'Chat creates and updates leads directly, with source and transcript attached.'],
      ['Rook powers responses', 'Rook answers account-aware questions and hands off cleanly to a human.'],
    ],
    [
      ['What to look for in chatbot software', 'Look for real-time qualification, booking, and CRM-native lead creation.', ['On-the-spot qualification and scoring', 'Instant meeting booking or live handoff', 'Direct CRM lead creation', 'AI responses with human handoff']],
      ['How Rally does chatbots', 'Rally chat qualifies, books, and creates leads in real time on your CRM data, with Rook powering account-aware answers and clean handoff to reps.'],
    ],
    [
      ['Can the chatbot book meetings?', 'Yes. Qualified visitors can book time or route to a live rep instantly.'],
      ['Does chat create CRM leads?', 'Yes. Conversations create and update leads directly, with transcript and source attached.'],
      ['Can it hand off to a human?', 'Yes. Rook answers what it can and hands off cleanly to a rep when needed.'],
    ]
  ),
  f(
    'live-chat-software',
    'Live chat software',
    'website live chat, routing, sales handoff',
    'Live chat software lets visitors and customers talk to your team in real time on your site. Rally live chat routes conversations to the right rep with full CRM context, logs the transcript to the record, and lets Rook triage and draft replies, so chat becomes a pipeline and support channel instead of a disconnected widget.',
    'Live chat is a sales channel when it knows who is on the other end. Rally gives every chat CRM context.',
    [
      ['Context-rich conversations', 'Reps see the visitor account, deals, and history as they chat.'],
      ['Smart routing', 'Route chats to the right rep or team by account, page, or intent.'],
      ['Transcript on the record', 'Every conversation logs to the contact and deal automatically.'],
      ['Rook triages and drafts', 'Rook handles common questions and drafts replies for reps to send.'],
    ],
    [
      ['What to look for in live chat software', 'Look for CRM context, smart routing, and transcript logging.', ['Visitor context from the CRM', 'Account and intent-based routing', 'Automatic transcript logging', 'AI-assisted replies']],
      ['How Rally does live chat', 'Rally live chat gives reps full CRM context, routes by account and intent, logs transcripts to the record, and lets Rook triage, so chat drives pipeline and support.'],
    ],
    [
      ['Do reps see who they are chatting with?', 'Yes. Reps see the account, deals, and history as they chat.'],
      ['Are chat transcripts saved to the CRM?', 'Yes. Every conversation logs to the contact and deal automatically.'],
      ['Can Rook help answer chats?', 'Yes. Rook handles common questions and drafts replies for reps to send.'],
    ]
  ),
  f(
    'help-desk-software',
    'Help desk software',
    'support tickets, queues, SLAs',
    'Help desk software manages customer support requests as tickets through queues and SLAs. Rally handles tickets on the same customer record as sales and billing, so support sees the full relationship, SLAs are tracked, and Rook can triage, tag, and draft responses, giving customers faster resolutions without a support tool that is blind to the account.',
    'Support is better when it can see the whole customer. Rally puts tickets on the same record as the deal.',
    [
      ['Tickets on the customer record', 'Support sees deals, billing, and history alongside every ticket.'],
      ['Queues and SLAs', 'Route tickets to the right queue and track response and resolution SLAs.'],
      ['Rook triages tickets', 'Rook tags, prioritizes, and drafts responses to speed resolution.'],
      ['Sales and support aligned', 'One record means account managers see support issues before renewals.'],
    ],
    [
      ['What to look for in help desk software', 'Look for account context, SLA tracking, and automation.', ['Tickets tied to the customer record', 'Queues and SLA tracking', 'AI triage and response drafts', 'Sales and support on one record']],
      ['How Rally does help desk', 'Rally manages tickets on the same customer record as sales and billing, tracks SLAs, and lets Rook triage and draft, so support resolves faster with full context.'],
    ],
    [
      ['Do support tickets share the customer record?', 'Yes. Tickets sit on the same record as deals and billing, so support sees the full relationship.'],
      ['Does Rally track SLAs?', 'Yes. Route tickets to queues and track response and resolution SLAs.'],
      ['Can Rook help with tickets?', 'Yes. Rook triages, tags, prioritizes, and drafts responses.'],
    ]
  ),
  f(
    'ticketing-software',
    'Ticketing software',
    'issue tickets, tracking, resolution',
    'Ticketing software captures issues and requests as trackable tickets from open to resolved. Rally ticketing sits on the customer record with statuses, priorities, and SLAs, so every request is tracked with full account context, and Rook can categorize, route, and draft replies, keeping resolution fast and nothing slipping through the cracks.',
    'Untracked requests get forgotten. Rally turns every issue into a tracked ticket with account context.',
    [
      ['Trackable tickets', 'Every request gets a status, priority, and owner from open to resolved.'],
      ['Account context built in', 'Tickets carry the customer, deals, and history so responses are informed.'],
      ['SLA and escalation', 'Track SLAs and escalate before a deadline is missed.'],
      ['Rook categorizes and drafts', 'Rook tags, routes, and drafts responses to speed resolution.'],
    ],
    [
      ['What to look for in ticketing software', 'Look for status tracking, SLAs, and account context on every ticket.', ['Status, priority, and ownership', 'SLA tracking and escalation', 'Account context on tickets', 'AI categorization and drafts']],
      ['How Rally does ticketing', 'Rally tracks every request as a ticket on the customer record with SLAs, and Rook categorizes, routes, and drafts, so resolution stays fast and accountable.'],
    ],
    [
      ['Does every ticket have an owner and status?', 'Yes. Tickets carry status, priority, and an owner from open to resolved.'],
      ['Do tickets show customer context?', 'Yes. Each ticket carries the customer, deals, and history.'],
      ['Can Rook route tickets?', 'Yes. Rook categorizes, routes, and drafts replies automatically.'],
    ]
  ),
  f(
    'customer-support-software',
    'Customer support software',
    'omnichannel support, tickets, self-service',
    'Customer support software helps teams resolve customer issues across channels quickly and consistently. Rally handles support on the same record as sales and billing across email, chat, and tickets, so agents see the full relationship, and Rook triages and drafts, giving customers faster, more informed answers than a support tool cut off from the account.',
    'Great support depends on context. Rally gives agents the full customer relationship on every conversation.',
    [
      ['Omnichannel on one record', 'Email, chat, and tickets resolve on the same customer record.'],
      ['Full relationship context', 'Agents see deals, billing, and history before they reply.'],
      ['Self-service ready', 'Deflect common questions so agents focus on the hard ones.'],
      ['Rook triages and drafts', 'Rook prioritizes and drafts responses so agents move faster.'],
    ],
    [
      ['What to look for in customer support software', 'Look for omnichannel handling, account context, and automation.', ['Email, chat, and ticket support', 'Full customer context', 'Self-service deflection', 'AI triage and drafts']],
      ['How Rally does customer support', 'Rally resolves support across channels on the customer record, so agents work with full context and Rook speeds every response.'],
    ],
    [
      ['Is support connected to sales data?', 'Yes. Support runs on the same customer record as sales and billing.'],
      ['Does Rally support multiple channels?', 'Yes. Email, chat, and tickets all resolve on one record.'],
      ['Can Rook help agents?', 'Yes. Rook triages and drafts responses so agents resolve faster.'],
    ]
  ),
  f(
    'customer-success-software',
    'Customer success software',
    'health scores, renewals, expansion',
    'Customer success software helps teams keep customers healthy, renewing, and expanding. Rally tracks health signals, renewals, and expansion opportunities on the same record as the original deal, so CSMs act on real usage and engagement data, and Rook flags at-risk accounts and expansion openings before a renewal date sneaks up.',
    'Retention is won long before the renewal date. Rally surfaces risk and expansion while there is still time to act.',
    [
      ['Account health scores', 'Combine usage, engagement, and support signals into a health score per account.'],
      ['Renewal tracking', 'See upcoming renewals early so no account is a last-minute scramble.'],
      ['Expansion signals', 'Surface accounts ready for upsell based on real usage.'],
      ['Rook flags risk early', 'Rook surfaces at-risk accounts and drafts the save play.'],
    ],
    [
      ['What to look for in customer success software', 'Look for health scoring, renewal tracking, and expansion signals.', ['Usage-based health scores', 'Early renewal visibility', 'Expansion opportunity signals', 'AI risk alerts and plays']],
      ['How Rally does customer success', 'Rally tracks health, renewals, and expansion on the customer record, and Rook flags risk and opportunity early, so CSMs protect and grow revenue proactively.'],
    ],
    [
      ['Does Rally score account health?', 'Yes. It combines usage, engagement, and support signals into a health score.'],
      ['Can I see renewals in advance?', 'Yes. Upcoming renewals surface early so nothing is a last-minute scramble.'],
      ['Does Rally flag churn risk?', 'Yes. Rook surfaces at-risk accounts and drafts the save play.'],
    ]
  ),
  f(
    'customer-onboarding-software',
    'Customer onboarding software',
    'onboarding plans, milestones, time to value',
    'Customer onboarding software guides new customers to value with structured plans and milestones. Rally runs onboarding as projects tied to the account, so tasks, owners, and milestones are tracked from the closed deal forward, and Rook nudges stalled steps, cutting time to value and setting up the renewal from day one.',
    'A slow onboarding puts the renewal at risk before it starts. Rally makes time-to-value a tracked plan.',
    [
      ['Structured onboarding plans', 'Templated plans with tasks, owners, and milestones per customer.'],
      ['Tied to the account', 'Onboarding lives on the same record as the deal and future renewal.'],
      ['Time-to-value tracking', 'See how fast each customer reaches key milestones.'],
      ['Rook nudges stalls', 'Rook flags stalled steps and drafts the nudge to keep onboarding moving.'],
    ],
    [
      ['What to look for in customer onboarding software', 'Look for structured plans, milestone tracking, and account linkage.', ['Templated onboarding plans', 'Tasks, owners, and milestones', 'Time-to-value metrics', 'Automated stall alerts']],
      ['How Rally does customer onboarding', 'Rally runs onboarding as account-linked projects with milestones, and Rook keeps stalled steps moving, so customers reach value fast and renewals start strong.'],
    ],
    [
      ['Does onboarding connect to the account?', 'Yes. Onboarding runs as a project on the same record as the deal and renewal.'],
      ['Can I template onboarding plans?', 'Yes. Reuse structured plans with tasks, owners, and milestones.'],
      ['Does Rally track time to value?', 'Yes. See how fast each customer hits key milestones.'],
    ]
  ),
  f(
    'project-management-software',
    'Project management software',
    'projects, tasks, milestones, delivery',
    'Project management software plans and tracks work to deliver it on time. Rally includes projects tied to deals and accounts, so post-sale delivery, onboarding, and services run on the same platform as the revenue, with tasks, owners, and milestones visible to everyone, and Rook flagging slipping work before it affects the customer.',
    'When delivery lives apart from the deal, revenue and work drift out of sync. Rally keeps them together.',
    [
      ['Projects tied to revenue', 'Delivery projects link to the deal and account they serve.'],
      ['Tasks, owners, milestones', 'Plan work with clear ownership and deadlines.'],
      ['Shared visibility', 'Sales, delivery, and the customer see the same plan and status.'],
      ['Rook flags slippage', 'Rook surfaces slipping tasks and milestones before they hit the customer.'],
    ],
    [
      ['What to look for in project management software', 'Look for task tracking, milestones, and linkage to revenue.', ['Task and milestone planning', 'Clear ownership and deadlines', 'Projects linked to deals and accounts', 'Slippage alerts']],
      ['How Rally does project management', 'Rally runs delivery projects tied to deals and accounts, so work and revenue stay in sync, and Rook flags slippage before it reaches the customer.'],
    ],
    [
      ['Are projects connected to deals?', 'Yes. Delivery projects link to the deal and account they serve.'],
      ['Can I track tasks and milestones?', 'Yes. Plan work with owners, deadlines, and milestones.'],
      ['Does Rally warn about slipping work?', 'Yes. Rook surfaces slipping tasks and milestones early.'],
    ]
  ),
  f(
    'task-management-software',
    'Task management software',
    'tasks, reminders, follow-ups',
    'Task management software organizes what needs doing so nothing falls through the cracks. Rally attaches tasks to leads, deals, and accounts with due dates and owners, surfaces them in a prioritized daily list, and lets Rook create and complete routine tasks, so reps spend the day on the right work instead of a scattered to-do list.',
    'A to-do list detached from the deal is just noise. Rally ties every task to the record it moves forward.',
    [
      ['Tasks on every record', 'Attach tasks to leads, deals, and accounts with owners and due dates.'],
      ['Prioritized daily list', 'Reps see the right next actions ranked for the day.'],
      ['Recurring and templated', 'Automate routine follow-ups so they never get forgotten.'],
      ['Rook handles routine work', 'Rook creates and completes routine tasks automatically.'],
    ],
    [
      ['What to look for in task management software', 'Look for record linkage, prioritization, and automation.', ['Tasks tied to records', 'Prioritized daily queue', 'Recurring task automation', 'AI task handling']],
      ['How Rally does task management', 'Rally attaches tasks to the records they move, ranks them for the day, and lets Rook handle routine ones, so reps focus on work that matters.'],
    ],
    [
      ['Are tasks connected to deals?', 'Yes. Attach tasks to leads, deals, and accounts with owners and due dates.'],
      ['Does Rally prioritize my tasks?', 'Yes. Reps get a prioritized daily list of the right next actions.'],
      ['Can Rook complete tasks?', 'Yes. Rook creates and completes routine tasks automatically.'],
    ]
  ),
  f(
    'sales-tax-software',
    'Sales tax software',
    'tax calculation, compliance, invoicing',
    'Sales tax software calculates the right tax on each sale and supports compliance. Rally applies tax to quotes and invoices based on product and location, so amounts are correct at quote time and flow into billing, keeping the numbers accurate end to end instead of bolting a tax tool onto a disconnected invoicing step.',
    'Tax errors surface at invoicing when they are expensive to fix. Rally gets it right at quote time.',
    [
      ['Tax on quotes and invoices', 'Apply correct tax by product and location as quotes are built.'],
      ['Accurate end to end', 'Tax flows from quote to invoice with no recalculation.'],
      ['Compliance-friendly', 'Keep records that support filing and audits.'],
      ['Connected to accounting', 'Tax data syncs to your accounting stack cleanly.'],
    ],
    [
      ['What to look for in sales tax software', 'Look for accurate calculation, quote-to-invoice flow, and compliance support.', ['Location and product-based tax', 'Quote-to-invoice consistency', 'Audit-ready records', 'Accounting sync']],
      ['How Rally does sales tax', 'Rally applies tax on quotes and invoices by product and location, so amounts are right from quote to invoice and sync cleanly to accounting.'],
    ],
    [
      ['Does Rally calculate tax on quotes?', 'Yes. Tax applies by product and location as quotes are built.'],
      ['Is tax consistent from quote to invoice?', 'Yes. Tax flows through with no recalculation, so amounts stay correct.'],
      ['Does tax data sync to accounting?', 'Yes. Tax and invoice data sync to your accounting stack.'],
    ]
  ),
];

export default FEATURES;
