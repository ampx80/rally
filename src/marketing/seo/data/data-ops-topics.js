// data-ops-topics dataset - ~200 search-intent pages on CRM data ops:
// data hygiene, deduping, enrichment, import/migration, field mapping,
// records + relationships, lead routing, lead scoring, territory management,
// automation + workflows, activity capture, admin/setup, permissions +
// governance, and segmentation. Compact rows expanded by .map() (see
// glossary.js pattern). NO em-dash / en-dash. ASCII hyphen only.
const PUB = '2026-07-10';

// Clip to a word boundary at or under n chars (keeps metaDescription <= 155).
const clip = (s, n = 152) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ')).trim();
};

// Each row: { slug, type:'guide'|'glossary', title, eyebrow, shortAnswer,
//   intro:[p1,p2], keyPoints:[] (glossary) | steps:[{h,body,bullets?}] (guide),
//   sections:[{h,body,bullets?}], faqs:[{q,a}], stats?, metaTitle?, metaDescription? }
const ROWS = [
  // ===================================================================
  // CLUSTER A - CRM data hygiene / cleanup
  // ===================================================================
  { slug: `how-to-clean-crm-data`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to clean CRM data`,
    shortAnswer: `Clean CRM data by auditing what you have, deleting dead records, merging duplicates, standardizing formats, filling critical gaps, and then setting rules that keep it clean going forward. Do the big one-time cleanup first, then automate maintenance so the data never rots back to where it started.`,
    intro: [`Dirty CRM data quietly breaks everything downstream: routing misfires, reports lie, and reps stop trusting the system. Cleaning it is a one-time project followed by ongoing maintenance, not a single afternoon.`, `The sequence below fixes the worst problems first, then locks in the gains with validation and automation so the same mess does not build back up.`],
    steps: [
      { h: `Audit what you actually have`, body: `Pull counts of total records, records missing an owner, missing email, no activity in 90 days, and obvious duplicates. This tells you where the rot is before you touch anything.`, bullets: [`Records with no owner or no activity`, `Missing critical fields (email, company, stage)`, `Duplicate rate by object`] },
      { h: `Delete or archive dead records`, body: `Close-lost or archive anything with no activity in the last 6 to 12 months and no path forward. A smaller clean database beats a huge rotten one.` },
      { h: `Merge duplicates`, body: `Find and merge duplicate contacts, accounts, and leads into one golden record, keeping the most complete and recent values for each field.` },
      { h: `Standardize formats`, body: `Normalize job titles, industries, states, and phone formats to consistent values so filtering and segmentation work. Convert free text to picklists where you can.` },
      { h: `Fill critical gaps and lock it down`, body: `Enrich missing company, industry, and contact fields, then add required fields, validation rules, and duplicate blocking so the data stays clean.` },
    ],
    sections: [
      { h: `Do the big cleanup once, then maintain`, body: [`The trap is treating cleanup as recurring heroics. Do one thorough pass, then shift to prevention: required fields, validation, dedupe rules, and a monthly review of new gaps. Prevention costs a fraction of another full cleanup.`] },
      { h: `How Ardovo helps`, body: `Ardovo ships with duplicate blocking, field validation, and enrichment on by default, so the data starts clean and stays clean. Rook runs the busywork - flagging stale records, merging duplicates, standardizing values, and filling gaps - so your team never faces a giant cleanup again.` },
    ],
    faqs: [
      { q: `How often should you clean CRM data?`, a: `Do one deep cleanup, then maintain continuously. A light monthly review of new duplicates, missing fields, and stale records prevents the buildup that forces another full project. Automated validation and dedupe rules handle most of it in the background.` },
      { q: `What is the first step in cleaning CRM data?`, a: `Audit before you edit. Count records missing critical fields, with no owner, with no recent activity, and likely duplicates. The audit tells you where the real problems are so you fix the biggest issues first instead of guessing.` },
      { q: `Should you delete old CRM records?`, a: `Archive or close-lost records with no activity in 6 to 12 months and no realistic path forward. Keeping dead records inflates reports and slows the system. Archive rather than hard-delete when you may need the history for analysis or compliance.` },
    ] },

  { slug: `what-is-crm-data-hygiene`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is CRM data hygiene?`,
    shortAnswer: `CRM data hygiene is the ongoing practice of keeping records accurate, complete, consistent, and current. It covers removing duplicates, filling missing fields, standardizing formats, and purging stale data. Good hygiene means reports are trustworthy, automation fires correctly, and reps rely on the CRM instead of working around it.`,
    intro: [`Data hygiene is not a one-time cleanup, it is a discipline. Records decay constantly as people change jobs, companies move, and reps enter data inconsistently.`, `Teams with strong hygiene get accurate forecasts and reliable automation. Teams without it slowly lose trust in the CRM until it becomes a place data goes to die.`],
    keyPoints: [`Covers accuracy, completeness, consistency, and freshness of records.`, `Prevents duplicates, missing fields, and stale data from accumulating.`, `Best maintained continuously with validation and automation, not periodic heroics.`, `Directly determines whether reports, routing, and forecasts can be trusted.`],
    sections: [
      { h: `Why it matters`, body: `Every downstream system depends on the data underneath it. Bad hygiene means leads route to the wrong rep, dedupe fails, campaigns email the wrong people, and forecasts are built on fiction. Clean data is the foundation everything else stands on.` },
      { h: `How Ardovo handles it`, body: `Ardovo treats hygiene as a platform job, not a chore for reps. Rook continuously dedupes, validates, standardizes, and enriches records in the background, so the database stays clean without anyone running a cleanup project.` },
    ],
    faqs: [
      { q: `What is the difference between data hygiene and data quality?`, a: `Data quality is the state of the data at a moment - how accurate and complete it is. Data hygiene is the ongoing practice that keeps quality high over time. Hygiene is the process, quality is the result.` },
      { q: `Why does CRM data hygiene matter?`, a: `Because every report, automation, and routing rule is only as good as the data beneath it. Poor hygiene causes misrouted leads, duplicate outreach, and forecasts nobody believes. Good hygiene is what makes the CRM trustworthy enough that people actually use it.` },
      { q: `Whose job is data hygiene?`, a: `Ideally the platform's, not the reps'. Relying on busy salespeople to keep data clean fails. The durable approach is automated validation, dedupe, and enrichment that maintain hygiene continuously, with an admin owning the rules.` },
    ] },

  { slug: `how-to-improve-crm-data-quality`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to improve CRM data quality`,
    shortAnswer: `Improve CRM data quality by measuring it first with a scorecard, fixing the highest-impact gaps like missing emails and duplicates, standardizing values into picklists, enriching thin records, and preventing new bad data with validation rules. Measure, fix, and prevent - in that order - so quality climbs and holds.`,
    intro: [`Data quality is measurable: completeness, accuracy, consistency, uniqueness, and timeliness. You cannot improve what you do not measure, so quality work starts with a baseline.`, `Once you can see the gaps, you fix the ones that hurt most, then put guardrails in place so quality does not slide back.`],
    steps: [
      { h: `Define and measure quality`, body: `Build a scorecard: percent of records with a valid email, an owner, a complete company, and recent activity. Score by object so you know where to focus.` },
      { h: `Fix the highest-impact gaps`, body: `Prioritize the fields that break routing, dedupe, and outreach: email, company, owner, and stage. Fixing these first delivers the most value fastest.` },
      { h: `Standardize into picklists`, body: `Replace free-text fields that people fill inconsistently (industry, title, country) with picklists so filtering and segmentation stay reliable.` },
      { h: `Enrich thin records`, body: `Append firmographic and contact data to fill gaps machines can fill, so reps do not waste time researching what a data provider already knows.` },
      { h: `Prevent new bad data`, body: `Add required fields, format validation, and duplicate blocking at the point of entry so quality holds instead of decaying again.` },
    ],
    sections: [
      { h: `Measure, fix, prevent`, body: `Most teams jump straight to fixing and skip measuring and preventing. Without a baseline you cannot prove progress, and without prevention the gains evaporate. The full loop - measure, fix, prevent - is what makes quality durable.` },
      { h: `How Ardovo helps`, body: `Ardovo scores data quality live per object and field, so you always see the baseline. Rook does the fixing and preventing automatically: standardizing values, enriching gaps, and blocking duplicates at entry, so quality climbs without a manual project.` },
    ],
    faqs: [
      { q: `How do you measure CRM data quality?`, a: `Score records on completeness (are key fields filled), accuracy (are values correct), consistency (are formats standardized), uniqueness (no duplicates), and timeliness (is it current). Track these as percentages per object so you can see gaps and prove improvement over time.` },
      { q: `What causes poor CRM data quality?`, a: `Manual entry with no validation, no required fields, no dedupe rules, importing dirty data, and natural decay as people change jobs. Most quality problems trace back to a lack of guardrails at the point of entry, not lazy reps.` },
      { q: `How long does it take to improve CRM data quality?`, a: `The initial cleanup of a mid-size database takes days to a few weeks depending on size and mess. But quality only stays high if you add prevention. With automated validation and dedupe, quality improves continuously rather than in one-off projects.` },
    ] },

  { slug: `crm-data-cleanup-checklist`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `CRM data cleanup checklist`,
    shortAnswer: `A CRM data cleanup checklist covers auditing record counts and gaps, removing dead and duplicate records, standardizing formats, filling critical fields, fixing ownership, and adding prevention rules. Work top to bottom once for a deep clean, then keep the prevention items running so the database stays healthy.`,
    intro: [`A checklist turns a vague "our data is a mess" into a concrete, finishable project. Each item is a specific, verifiable task.`, `Run the full list once for a deep clean, then keep the prevention items on permanently so you never need another giant cleanup.`],
    steps: [
      { h: `Audit`, body: `Count records, duplicates, missing critical fields, records with no owner, and records with no activity in 90 or 180 days.`, bullets: [`Total records per object`, `Duplicate rate`, `Missing email / company / owner`, `Stale records with no recent activity`] },
      { h: `Purge`, body: `Archive or close-lost dead records with no path forward, and remove test and junk entries.` },
      { h: `Dedupe`, body: `Merge duplicate contacts, accounts, and leads into golden records, preserving the best value per field.` },
      { h: `Standardize`, body: `Normalize industry, title, state, country, and phone formats; convert free text to picklists where possible.` },
      { h: `Enrich and reassign`, body: `Fill missing firmographic and contact data, then fix ownership so every active record has a real owner.` },
      { h: `Prevent`, body: `Turn on required fields, validation rules, and duplicate blocking so the cleanup holds.` },
    ],
    sections: [
      { h: `Run it once, keep prevention on forever`, body: `The audit, purge, dedupe, standardize, and enrich steps are a one-time deep clean. The prevention step is permanent. Teams that skip prevention repeat the whole checklist every year; teams that keep it on never do it again.` },
      { h: `How Ardovo helps`, body: `Ardovo automates most of this checklist. Rook runs the audit continuously, merges duplicates, standardizes values, enriches gaps, and blocks bad data at entry, so the cleanup is ongoing and automatic rather than a dreaded annual project.` },
    ],
    faqs: [
      { q: `How long does a CRM data cleanup take?`, a: `A first deep clean of a mid-size database usually takes a few days to two weeks depending on record count and how bad the mess is. Deduping and standardizing are the slowest steps. Automation cuts this dramatically and prevents the need to repeat it.` },
      { q: `What should you do before a CRM cleanup?`, a: `Back up or export the data first, agree on the rules (what counts as stale, which fields are required, how to pick the surviving value in a merge), and communicate the change so reps are not surprised when records move or merge.` },
      { q: `How do you keep a CRM clean after a cleanup?`, a: `Keep the prevention items running: required fields, validation rules, and duplicate blocking at entry, plus a short monthly review of new gaps. Prevention is what separates a one-time cleanup from an annual firefight.` },
    ] },

  { slug: `what-is-data-decay`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data decay?`,
    shortAnswer: `Data decay is the gradual loss of accuracy in CRM records as the real world changes. People switch jobs, companies rebrand or move, and emails stop working. B2B contact data decays roughly 25 to 30 percent per year, which is why a database left alone slowly becomes unreliable.`,
    intro: [`Even a perfectly clean database rots on its own. Nobody enters bad data on purpose - the world just changes underneath the records.`, `Because decay is constant, the fix is not a one-time cleanup but ongoing enrichment and verification that refresh records as reality shifts.`],
    keyPoints: [`Records lose accuracy over time as jobs, companies, and contact details change.`, `B2B contact data decays around 25 to 30 percent per year.`, `Decay happens even to data that was perfectly clean when entered.`, `The remedy is continuous re-verification and enrichment, not a single cleanup.`],
    sections: [
      { h: `Why it matters`, body: `Decay silently erodes everything: outreach bounces, reps call disconnected numbers, and routing sends leads to people who left. A database that was accurate a year ago can be a quarter wrong today if nothing refreshes it.` },
      { h: `How Ardovo handles it`, body: `Ardovo continuously re-verifies and enriches records, so Rook flags when a contact likely changed jobs or an email stopped resolving. Decay gets caught and corrected as it happens instead of discovered when a campaign bounces.` },
    ],
    faqs: [
      { q: `How fast does CRM data decay?`, a: `B2B contact data typically decays 25 to 30 percent per year as people change jobs and companies change details. That means a meaningful share of your database is wrong within a year unless something actively refreshes it.` },
      { q: `How do you fight data decay?`, a: `Continuously re-verify and enrich records rather than cleaning once. Track email deliverability and job-change signals, refresh firmographic data on a schedule, and flag records that have not been touched or confirmed in a long time.` },
      { q: `What causes data decay?`, a: `Real-world change: people switch roles or companies, businesses rebrand, relocate, or shut down, and phone numbers and emails get retired. None of it is a data-entry mistake - the record was right when created and reality moved.` },
    ] },

  { slug: `how-to-fix-incomplete-crm-records`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to fix incomplete CRM records`,
    shortAnswer: `Fix incomplete CRM records by finding which critical fields are missing, enriching what a data provider can fill automatically, prompting reps for the fields only they know, and requiring those fields at entry so records stop arriving half-empty. Automate the machine-fillable gaps and reserve human effort for judgment fields.`,
    intro: [`Incomplete records break routing, scoring, and segmentation. A lead with no company cannot be scored; a contact with no email cannot be emailed.`, `The fix splits into two: gaps a machine can fill from external data, and gaps only a person knows. Automate the first, prompt for the second.`],
    steps: [
      { h: `Identify the critical fields`, body: `Decide which fields actually matter for routing, scoring, and outreach - usually email, company, industry, title, and owner - and measure completeness on just those.` },
      { h: `Enrich the machine-fillable gaps`, body: `Use a data provider to append company size, industry, location, and verified contact details automatically. Most firmographic gaps do not need a human.` },
      { h: `Prompt reps for judgment fields`, body: `For fields only a rep knows - use case, budget, next step - surface a targeted prompt at the right moment rather than a giant required form up front.` },
      { h: `Require critical fields at entry`, body: `Make the truly essential fields required so new records cannot be created half-empty, but keep the required list short so it does not become friction.` },
    ],
    sections: [
      { h: `Split machine gaps from human gaps`, body: `The mistake is making reps fill everything, including data a provider already has. That creates friction and resentment. Enrich what machines can fill, and only ask people for the judgment fields they alone know.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches firmographic and contact fields automatically, so records arrive mostly complete. Rook fills the machine-knowable gaps and prompts reps only for the judgment fields at the moment they matter, so completeness rises without a data-entry tax.` },
    ],
    faqs: [
      { q: `Which CRM fields are most important to fill?`, a: `The ones that drive automation and outreach: a valid email, company, industry, title, owner, and deal stage. Completeness on these matters far more than filling every field. Focus effort where an empty value actually breaks something.` },
      { q: `Should you make every field required?`, a: `No. Requiring too many fields creates friction and garbage data as reps type anything to get past the form. Require only the few fields that are truly critical, and fill the rest through enrichment or well-timed prompts.` },
      { q: `How do you fill missing CRM data at scale?`, a: `Enrichment. A data provider can append company size, industry, location, and verified contacts automatically across thousands of records. Reserve manual effort for judgment fields like use case and budget that no external source knows.` },
    ] },

  { slug: `how-to-standardize-crm-data`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to standardize CRM data`,
    shortAnswer: `Standardize CRM data by picking one canonical format for each field, converting free-text fields to picklists, running a one-time normalization pass on existing values, and validating new entries against the standard. Consistent values make filtering, segmentation, and reporting reliable instead of scattering the same thing across dozens of spellings.`,
    intro: [`"USA", "U.S.", "United States", and "us" are the same country to a human and four different values to a database. Inconsistent values silently break every filter and segment.`, `Standardizing means choosing one canonical form per field and enforcing it going forward, then cleaning up the mess that already exists.`],
    steps: [
      { h: `Choose canonical formats`, body: `For each field that gets filtered on - country, state, industry, title, phone - decide the one correct format and write it down.` },
      { h: `Convert free text to picklists`, body: `Replace open text fields with picklists wherever the set of valid values is finite. A picklist makes inconsistency impossible.` },
      { h: `Normalize existing values`, body: `Run a one-time mapping pass that collapses variant spellings into the canonical value across the whole database.`, bullets: [`Map "US", "U.S.A", "America" to "United States"`, `Map title variants to a standard set`, `Format all phone numbers the same way`] },
      { h: `Validate new entries`, body: `Add format validation and picklist enforcement so new records match the standard automatically instead of adding new variants.` },
    ],
    sections: [
      { h: `Standardize the fields you filter on`, body: `You do not need to standardize every field, only the ones used in filters, segments, and reports. A perfectly formatted "notes" field helps nobody, but a standardized industry or country field makes every downstream report trustworthy.` },
      { h: `How Ardovo helps`, body: `Ardovo uses picklists and validation for the fields that matter, so values stay consistent by design. Rook normalizes messy existing values into the canonical form and standardizes new entries automatically, so segments and reports never scatter across spellings.` },
    ],
    faqs: [
      { q: `Why does standardizing CRM data matter?`, a: `Because filters and segments match on exact values. If the same industry is spelled five ways, a segment for that industry misses most of it and every report undercounts. Standardized values are what make filtering, segmentation, and reporting actually reliable.` },
      { q: `Which fields should be picklists instead of free text?`, a: `Any field with a finite set of valid values you filter or report on: country, state, industry, lead source, title tier, deal stage, and status. Free text invites inconsistency; a picklist makes the wrong value impossible to enter.` },
      { q: `How do you standardize data that is already messy?`, a: `Run a one-time normalization pass that maps every variant spelling to a single canonical value, then turn on validation so new entries stay clean. Doing the historical cleanup without adding prevention just lets the mess rebuild.` },
    ] },

  { slug: `what-is-data-standardization`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data standardization?`,
    shortAnswer: `Data standardization is converting values into one consistent format across all records, so the same real-world thing is always represented the same way. It covers formatting countries, states, titles, phone numbers, and industries into canonical values. Standardized data makes filtering, deduplication, segmentation, and reporting accurate instead of fragmented across variant spellings.`,
    intro: [`Standardization is about consistency, not correctness. A value can be accurate but still non-standard if it is written differently from every other record.`, `It is a prerequisite for almost everything else: dedupe, segmentation, and reporting all depend on matching values exactly, which only works when values are consistent.`],
    keyPoints: [`Converts variant values into one canonical format per field.`, `Focuses on fields used for filtering, matching, and reporting.`, `A prerequisite for reliable deduplication and segmentation.`, `Best enforced with picklists and validation, not manual cleanup.`],
    sections: [
      { h: `Why it matters`, body: `Matching is exact. Deduplication cannot merge two records if their company names are formatted differently, and a segment cannot capture accounts whose industry is spelled inconsistently. Standardization is the quiet foundation that makes matching-based features work.` },
      { h: `How Ardovo handles it`, body: `Ardovo standardizes on entry through picklists and validation, and Rook normalizes historical values into canonical form. Consistent data means dedupe, segmentation, and reporting all operate on values that actually match.` },
    ],
    faqs: [
      { q: `What is the difference between standardization and normalization?`, a: `They overlap and are often used interchangeably. Standardization means enforcing one consistent format for a value. Normalization more broadly means organizing data into a consistent, non-redundant structure. In CRM practice both aim at consistent, matchable values.` },
      { q: `Why is data standardization important for deduplication?`, a: `Because dedupe matches records by comparing values. If two records for the same company have differently formatted names or addresses, the matcher may not see them as duplicates. Standardizing first makes duplicate detection far more accurate.` },
      { q: `How is data standardization enforced?`, a: `Best through picklists and validation rules at the point of entry, so non-standard values cannot be saved. Historical data is standardized with a one-time normalization pass that maps variants to canonical values.` },
    ] },

  { slug: `how-to-remove-bad-data-from-your-crm`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to remove bad data from your CRM`,
    shortAnswer: `Remove bad data by defining what "bad" means for you (junk, invalid emails, test records, stale dead records), finding each category with a saved filter, reviewing before deleting, archiving rather than hard-deleting where history matters, and blocking the sources that create bad data going forward.`,
    intro: [`"Bad data" is several different problems: fake entries, invalid contact details, test records, and genuinely dead accounts. Each needs a different treatment.`, `The goal is to remove what hurts without deleting anything you might need, so archive over hard-delete when history or compliance is in play.`],
    steps: [
      { h: `Define your categories of bad`, body: `List what counts as removable: obvious junk and test records, invalid or bounced emails, and dead records with no activity and no path forward.` },
      { h: `Find each category with a filter`, body: `Build a saved view for each: test-name patterns, bounced-email flags, and no-activity-in-12-months. Filters make the scope visible before you act.` },
      { h: `Review before deleting`, body: `Spot-check each batch so you do not delete a big customer that simply has a quiet quarter. Deletion is easy to regret.` },
      { h: `Archive instead of hard-deleting`, body: `Where you may need the history for reporting or compliance, archive or mark inactive rather than permanently deleting.` },
      { h: `Block the source`, body: `Add validation and dedupe so the same bad data does not flow back in. Removing bad data without fixing the intake just repeats the work.` },
    ],
    sections: [
      { h: `Archive over hard-delete`, body: `Hard-deleting feels satisfying but destroys history you may need for churn analysis, compliance, or re-engagement. Archiving or flagging inactive removes records from active views while keeping the trail. Reserve permanent deletion for genuine junk.` },
      { h: `How Ardovo helps`, body: `Ardovo flags likely-bad records - bounced emails, test entries, long-dead accounts - so you review a curated list instead of hunting. Rook archives what it should keep, and validation plus dedupe stop bad data at the source so removal is not a recurring chore.` },
    ],
    faqs: [
      { q: `Should you delete or archive bad CRM records?`, a: `Archive when you might need the history for reporting, compliance, or re-engagement; hard-delete only genuine junk and test data. Archiving removes records from active views without destroying the trail, which is safer and reversible.` },
      { q: `What counts as bad CRM data?`, a: `Junk and test entries, invalid or bounced emails, duplicate records, and stale accounts with no activity and no realistic path forward. Note that stale is not the same as bad - a quiet long-term customer is not junk, so review before removing.` },
      { q: `How do you stop bad data from coming back?`, a: `Fix the intake. Add email validation, required fields, duplicate blocking, and cleaner import processes so bad data cannot enter in the first place. Removing bad data without fixing the source just means doing it again next quarter.` },
    ] },

  { slug: `what-is-dirty-data`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is dirty data?`,
    shortAnswer: `Dirty data is any CRM record that is inaccurate, incomplete, duplicated, outdated, or inconsistently formatted. It includes wrong emails, missing companies, duplicate contacts, stale records, and mismatched value formats. Dirty data breaks routing, inflates reports, wastes rep time, and slowly erodes trust in the whole system.`,
    intro: [`Dirty data is the umbrella term for everything wrong with a database: duplicates, gaps, staleness, and inconsistency all count.`, `It is costly precisely because it is invisible until something breaks - a bounced campaign, a misrouted lead, a report that does not add up.`],
    keyPoints: [`Covers inaccurate, incomplete, duplicate, stale, and inconsistent records.`, `Usually invisible until it causes a downstream failure.`, `Erodes trust in the CRM, causing reps to work around it.`, `Prevented with validation, dedupe, and enrichment rather than periodic cleanups.`],
    sections: [
      { h: `Why it matters`, body: `Dirty data has a compounding cost. One bad record wastes a little time; a database full of them breaks automation, corrupts forecasts, and pushes reps back to spreadsheets. The damage is rarely dramatic, which is what makes it dangerous.` },
      { h: `How Ardovo handles it`, body: `Ardovo attacks the sources of dirty data - duplicates, gaps, and inconsistency - at the point of entry, and Rook cleans what slips through. The database stays clean enough that people trust it, which is the whole point.` },
    ],
    faqs: [
      { q: `What are examples of dirty data?`, a: `A contact with a bounced email, two records for the same person, an account with no industry, a lead created two years ago with no activity, and a country field with five different spellings of the same country. All of it is dirty data.` },
      { q: `What does dirty data cost a business?`, a: `It wastes rep time on bad contacts, misroutes leads, sends duplicate outreach, and produces reports leadership cannot trust. The bigger cost is erosion of confidence: once people stop trusting the CRM, they stop using it and revert to spreadsheets.` },
      { q: `How do you prevent dirty data?`, a: `Stop it at the source with validation rules, required fields, duplicate blocking, and enrichment, rather than cleaning periodically. Prevention at the point of entry is far cheaper than repeated cleanup projects.` },
    ] },

  { slug: `how-to-audit-crm-data`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to audit CRM data`,
    shortAnswer: `Audit CRM data by measuring five dimensions - completeness, accuracy, consistency, uniqueness, and timeliness - across your key objects. Pull counts of missing fields, duplicates, stale records, and format inconsistencies, then turn the findings into a prioritized fix list. The audit is the baseline that tells you where cleanup effort pays off most.`,
    intro: [`An audit answers a simple question: how bad is it, and where? Without it, cleanup is guesswork and you cannot prove progress.`, `A good audit is repeatable, so you can run it again after cleanup and show quality actually improved.`],
    steps: [
      { h: `Pick the objects and fields that matter`, body: `Focus the audit on contacts, accounts, leads, and deals, and on the fields that drive routing, scoring, and outreach.` },
      { h: `Measure the five dimensions`, body: `Score completeness, accuracy, consistency, uniqueness, and timeliness for each object.`, bullets: [`Completeness: percent with key fields filled`, `Uniqueness: duplicate rate`, `Timeliness: percent with recent activity`, `Consistency: percent using standard formats`] },
      { h: `Quantify the gaps`, body: `Turn each finding into a number: 22 percent of accounts have no industry, 8 percent of contacts are duplicates. Numbers make the problem concrete and prioritizable.` },
      { h: `Build a prioritized fix list`, body: `Rank fixes by impact and effort. Missing emails that block outreach beat a rarely-used field, even if the rarely-used field is emptier.` },
    ],
    sections: [
      { h: `Make it repeatable`, body: `A one-time audit tells you the state today; a repeatable audit proves cleanup worked and catches regressions. Save the queries or dashboard so you can rerun the exact same measurement next quarter and compare.` },
      { h: `How Ardovo helps`, body: `Ardovo runs the audit continuously and shows data quality live per object and field. Rook surfaces the biggest gaps and their downstream cost, so the audit is always current rather than a report that goes stale the day after you run it.` },
    ],
    faqs: [
      { q: `What should a CRM data audit measure?`, a: `Five dimensions: completeness (are key fields filled), accuracy (are values correct), consistency (are formats standard), uniqueness (duplicate rate), and timeliness (is the data current). Measure these across contacts, accounts, leads, and deals for a full picture.` },
      { q: `How often should you audit CRM data?`, a: `Run a full audit before any major cleanup and after, then a lighter check quarterly. If your platform measures quality continuously, the audit is always live and you only need to review it periodically rather than run it from scratch.` },
      { q: `What is the output of a data audit?`, a: `A prioritized fix list backed by numbers: which fields are most incomplete, the duplicate rate, how many records are stale, and where formats are inconsistent - ranked by downstream impact so you fix what matters first.` },
    ] },

  { slug: `how-to-maintain-clean-crm-data`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to maintain clean CRM data`,
    shortAnswer: `Maintain clean CRM data by shifting from periodic cleanups to continuous prevention: validation and required fields at entry, always-on duplicate blocking, scheduled enrichment to fight decay, and a short monthly review of new gaps. Prevention keeps quality flat and high instead of letting it decay and forcing another big cleanup.`,
    intro: [`Cleaning data once is easy; keeping it clean is the real challenge. Left alone, any database decays back to messy within a year.`, `The durable answer is to make cleanliness the default state through automation, so maintenance is mostly the system's job, not a recurring project.`],
    steps: [
      { h: `Validate at the point of entry`, body: `Enforce required fields, format rules, and picklists so bad data cannot be created in the first place. Prevention beats cleanup every time.` },
      { h: `Block duplicates automatically`, body: `Run always-on duplicate detection so a new record that matches an existing one is caught before it splits history in two.` },
      { h: `Enrich on a schedule to fight decay`, body: `Re-verify and refresh records periodically so job changes and stale details get corrected as the world moves.` },
      { h: `Review new gaps monthly`, body: `Spend 30 minutes a month scanning for new missing fields, duplicates, and stale records. Small regular reviews prevent big cleanups.` },
    ],
    sections: [
      { h: `Prevention over cleanup`, body: `Every hour spent on prevention saves many on cleanup. Validation, dedupe, and enrichment running continuously keep quality flat instead of sawtoothing - decaying, then a painful cleanup, then decaying again. Aim for a flat, high line.` },
      { h: `How Ardovo helps`, body: `Ardovo makes clean the default: validation and dedupe are on by entry, and Rook re-verifies and enriches records continuously. Maintenance becomes something the platform does in the background rather than a quarterly fire drill for your team.` },
    ],
    faqs: [
      { q: `How do you keep CRM data clean over time?`, a: `Shift from cleanup to prevention. Validate at entry, block duplicates automatically, enrich on a schedule to fight decay, and review new gaps briefly each month. Continuous prevention keeps quality high instead of letting it slide and forcing another cleanup.` },
      { q: `Why does CRM data get dirty again after cleanup?`, a: `Because cleanup fixes the past but not the intake. Without validation, dedupe, and enrichment running continuously, new bad data enters and existing data decays. The fix is prevention, so the same mess cannot rebuild.` },
      { q: `Can data hygiene be automated?`, a: `Most of it, yes. Validation, duplicate blocking, standardization, and enrichment all run automatically. Human judgment is only needed for edge cases and for fields no external source knows. Automation is what makes clean data sustainable.` },
    ] },

  { slug: `what-is-a-data-quality-score`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is a data quality score?`,
    shortAnswer: `A data quality score is a single measure of how healthy your CRM data is, combining completeness, accuracy, consistency, uniqueness, and timeliness into one number or grade. It lets you track data health over time, compare objects, and prove that cleanup and prevention efforts are actually working.`,
    intro: [`A quality score turns a fuzzy sense that "our data is bad" into a trackable metric. What gets measured gets managed.`, `It can be scored per record, per field, or per object, and the real value is the trend: is quality climbing, flat, or decaying?`],
    keyPoints: [`Combines completeness, accuracy, consistency, uniqueness, and timeliness into one measure.`, `Can be computed per record, per field, or per object.`, `The trend over time matters more than any single reading.`, `Makes data health visible and cleanup progress provable.`],
    sections: [
      { h: `Why it matters`, body: `Without a score, data quality is invisible and improvement is unprovable. A score makes it a managed metric with a target and a trend, so leaders can see whether the database is getting healthier or quietly rotting.` },
      { h: `How Ardovo handles it`, body: `Ardovo computes a live data quality score per object and field, so health is always visible. Rook works to raise it - deduping, enriching, and standardizing - and you can watch the score climb as prevention takes hold.` },
    ],
    faqs: [
      { q: `How is a data quality score calculated?`, a: `By scoring records on completeness, accuracy, consistency, uniqueness, and timeliness, then combining those into one weighted number or grade. Weighting usually favors the fields that drive routing, scoring, and outreach, since their quality matters most.` },
      { q: `What is a good data quality score?`, a: `There is no universal number - what matters is the trend and hitting your own target. Set a threshold for the fields that drive automation (say 95 percent completeness on email and company), and track whether the score is climbing or decaying.` },
      { q: `Why track a data quality score?`, a: `Because it makes data health a managed metric instead of a vague worry. You can set targets, prove cleanup worked, catch regressions early, and justify prevention investments with a number leadership can see move.` },
    ] },

  { slug: `how-to-validate-crm-data`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to validate CRM data`,
    shortAnswer: `Validate CRM data by enforcing rules at the point of entry: required fields, format checks on emails and phones, picklist constraints, and duplicate blocking. Validation stops bad data before it saves, which is far cheaper than cleaning it later. Keep rules focused on the fields that actually drive downstream systems.`,
    intro: [`Validation is prevention at the moment of entry - the single highest-leverage hygiene tactic. A rule that blocks a bad value costs nothing later.`, `The art is validating enough to keep data clean without so much friction that reps start entering garbage to escape the form.`],
    steps: [
      { h: `Require the critical fields`, body: `Make the few fields that drive routing and outreach mandatory, so records cannot be saved half-empty. Keep the list short.` },
      { h: `Check formats`, body: `Validate that emails look like emails, phones like phones, and URLs like URLs, so obviously broken values are caught at entry.` },
      { h: `Constrain with picklists`, body: `Use picklists for finite-value fields so reps pick a standard value instead of typing a new variant.` },
      { h: `Block duplicates on save`, body: `Check new records against existing ones and warn or block before a duplicate is created.` },
    ],
    sections: [
      { h: `Validate without creating friction`, body: `Over-validation backfires: if a form demands twelve fields, reps type "x" into half of them. Validate only what matters, explain why a value is rejected, and let enrichment fill what a machine can fill so reps are not asked for it.` },
      { h: `How Ardovo helps`, body: `Ardovo validates at entry by default - required fields, format checks, picklists, and duplicate blocking - so bad data rarely gets in. Rook fills the machine-knowable fields automatically, keeping the required list short so validation protects quality without punishing reps.` },
    ],
    faqs: [
      { q: `What is data validation in a CRM?`, a: `Rules enforced at the point of entry that stop bad data before it saves: required fields, format checks on emails and phones, picklist constraints, and duplicate blocking. It is prevention rather than cleanup, which makes it the cheapest way to keep data clean.` },
      { q: `Can too much validation hurt data quality?`, a: `Yes. If a form demands too many fields, reps enter junk to get past it, which is worse than an empty field. Validate only the fields that truly matter and fill machine-knowable ones through enrichment so reps are not over-burdened.` },
      { q: `What is the difference between validation and enrichment?`, a: `Validation stops bad values from entering. Enrichment fills missing values from external data. They work together: enrichment reduces how many fields reps must enter, and validation ensures what they do enter is correct.` },
    ] },

  { slug: `what-is-data-normalization-in-a-crm`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data normalization in a CRM?`,
    shortAnswer: `Data normalization in a CRM is organizing and formatting values into a consistent, non-redundant structure so the same information is stored the same way everywhere. It covers standardizing formats, splitting combined fields, and linking related records instead of duplicating data. Normalized data is easier to match, segment, and report on accurately.`,
    intro: [`Normalization has two senses in CRM: formatting values consistently, and structuring data so facts are stored once and referenced rather than copied.`, `Both reduce redundancy and inconsistency, which is what makes matching, deduplication, and reporting reliable.`],
    keyPoints: [`Formats values consistently and structures data to avoid redundancy.`, `Stores each fact once and links related records instead of duplicating.`, `A prerequisite for accurate matching, dedupe, and segmentation.`, `Reduces the inconsistency that breaks filters and reports.`],
    sections: [
      { h: `Why it matters`, body: `Redundant, inconsistent data is where duplicates and reporting errors breed. Normalizing - one canonical format, facts stored once and referenced - removes the ambiguity that makes matching fail and reports disagree with each other.` },
      { h: `How Ardovo handles it`, body: `Ardovo's data model links contacts to accounts and stores shared facts once, so company details are not copied onto every contact. Rook normalizes value formats too, keeping the whole database consistent and matchable.` },
    ],
    faqs: [
      { q: `What does it mean to normalize CRM data?`, a: `To format values consistently and structure them so each fact is stored once and linked rather than duplicated. For example, storing a company's industry on the account and linking contacts to it, instead of copying the industry onto every contact record.` },
      { q: `Why is normalized data better?`, a: `Because it removes redundancy and inconsistency. When a fact is stored once and referenced, updating it updates everywhere, and matching works because values are consistent. Denormalized, copied data drifts out of sync and breeds duplicates and reporting errors.` },
      { q: `Is normalization the same as standardization?`, a: `Related but not identical. Standardization means enforcing one consistent format for values. Normalization is broader, also covering how data is structured to avoid redundancy. In everyday CRM work both aim at consistent, matchable, non-duplicated data.` },
    ] },

  // ===================================================================
  // CLUSTER B - Deduping
  // ===================================================================
  { slug: `how-to-dedupe-contacts`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to dedupe contacts`,
    shortAnswer: `Dedupe contacts by choosing match keys (email, then name plus company), finding matches with exact and fuzzy rules, reviewing the candidates, merging each set into one golden record that keeps the best value per field, and then turning on duplicate blocking so new duplicates cannot form. Merge, do not just delete, to preserve history.`,
    intro: [`Duplicate contacts split one person's history across two records, so activity, ownership, and email preferences scatter. Deduping stitches them back together.`, `The safe approach is match, review, merge into a golden record, then prevent - not a blind bulk delete that loses history.`],
    steps: [
      { h: `Choose your match keys`, body: `Email is the strongest key. Add fuzzy matching on name plus company to catch duplicates with different or missing emails.` },
      { h: `Find match candidates`, body: `Run exact matches on email and fuzzy matches on name and company to surface likely duplicate sets for review.` },
      { h: `Review before merging`, body: `Confirm the candidates are truly the same person. Two people named John Smith at a big company may not be duplicates.` },
      { h: `Merge into a golden record`, body: `Combine each set into one record, keeping the most complete and recent value per field and preserving all activity history.` },
      { h: `Block new duplicates`, body: `Turn on duplicate detection at entry so a new contact matching an existing one is caught before it splits history again.` },
    ],
    sections: [
      { h: `Merge, do not delete`, body: `Deleting a duplicate throws away its activity, emails, and relationships. Merging preserves all of it under one surviving record. Always merge into a golden record so no history is lost, and let the merge pick the best value for each field.` },
      { h: `How Ardovo helps`, body: `Ardovo detects duplicates with exact and fuzzy matching, presents clean merge candidates, and builds the golden record automatically. Rook handles the busywork of merging and keeps duplicate blocking on at entry, so contacts stay unified without a manual dedupe project.` },
    ],
    faqs: [
      { q: `How do you find duplicate contacts?`, a: `Match on strong keys first - primarily email - then use fuzzy matching on name plus company to catch duplicates with missing or different emails. Exact-only matching misses the messy real-world duplicates, so combine both approaches.` },
      { q: `Should you delete or merge duplicate contacts?`, a: `Merge, almost always. Deleting a duplicate discards its activity history, email engagement, and relationships. Merging combines everything into one golden record that keeps the best value per field and all the history, which is both safer and more useful.` },
      { q: `How do you prevent duplicate contacts?`, a: `Turn on duplicate detection at the point of entry so a new contact that matches an existing record is flagged or blocked before it saves. Prevention at entry is the only way to stop duplicates from rebuilding after a dedupe pass.` },
    ] },

  { slug: `what-is-data-deduplication`, type: `glossary`, eyebrow: `Deduplication`,
    title: `What is data deduplication?`,
    shortAnswer: `Data deduplication is finding records that represent the same real-world entity and merging them into one. In a CRM it means combining duplicate contacts, accounts, or leads so a person or company has a single record. Deduplication preserves history by merging into a golden record rather than deleting, and prevents new duplicates at entry.`,
    intro: [`Duplicates are one of the most common and damaging data problems: they split history, confuse ownership, and cause double outreach.`, `Deduplication is both a cleanup (merge existing duplicates) and a prevention discipline (stop new ones from forming).`],
    keyPoints: [`Finds records representing the same entity and merges them into one.`, `Applies to contacts, accounts, and leads.`, `Merges into a golden record to preserve history, rather than deleting.`, `Includes prevention at entry, not just one-time cleanup.`],
    sections: [
      { h: `Why it matters`, body: `Duplicates break trust and automation. A rep sees half a person's history, two reps work the same account unaware, and a customer gets emailed twice. Deduplication restores a single source of truth per entity so everything downstream works.` },
      { h: `How Ardovo handles it`, body: `Ardovo detects duplicates with exact and fuzzy matching and merges them into golden records automatically, preserving all history. Rook keeps duplicate blocking on at entry, so the database stays deduplicated instead of drifting back apart.` },
    ],
    faqs: [
      { q: `What is a golden record in deduplication?`, a: `The single surviving record created when duplicates are merged, holding the best value for each field and all the combined history. It becomes the one source of truth for that person or company, replacing the scattered duplicates.` },
      { q: `Is deduplication the same as merging?`, a: `Merging is the action of combining specific duplicate records. Deduplication is the broader process of finding all duplicates and merging them, plus preventing new ones. Merging is a step within deduplication.` },
      { q: `How do you deduplicate without losing data?`, a: `Merge into a golden record instead of deleting. The merge keeps the most complete and recent value for each field and preserves every record's activity history under one surviving record, so nothing is lost.` },
    ] },

  { slug: `how-to-merge-duplicate-records`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to merge duplicate records`,
    shortAnswer: `Merge duplicate records by confirming they are the same entity, choosing a master record, deciding which value survives for each conflicting field (usually the most complete and recent), and merging so all activity, relationships, and history combine under one record. Review conflicts carefully, because a bad merge is hard to undo.`,
    intro: [`Merging is where deduplication gets real: two records become one without losing anything that mattered on either.`, `The critical decisions are which record is master and, for each conflicting field, which value wins. Get those right and the merge is clean.`],
    steps: [
      { h: `Confirm they are the same entity`, body: `Verify the records truly represent one person or company before merging. A wrong merge blends two different entities and is painful to reverse.` },
      { h: `Pick the master record`, body: `Choose the record to keep - usually the most complete, most recently active, or the one with the correct owner.` },
      { h: `Resolve field conflicts`, body: `For each field where the records disagree, decide which value survives.`, bullets: [`Prefer the most recent value for changing fields`, `Prefer the most complete value for empty-vs-filled`, `Keep the verified value over the unverified one`] },
      { h: `Merge and preserve history`, body: `Complete the merge so all activity, notes, emails, and relationships from both records live under the surviving master.` },
    ],
    sections: [
      { h: `A bad merge is expensive`, body: `Merging is destructive: it collapses two records into one. If they were not actually duplicates, you have blended two entities and lost the boundary. Always confirm identity first, and prefer platforms that let you review conflicts before committing.` },
      { h: `How Ardovo helps`, body: `Ardovo proposes merges only for high-confidence matches, shows every field conflict with a recommended surviving value, and preserves all history on the master. Rook handles routine merges automatically and escalates ambiguous ones for a quick human check.` },
    ],
    faqs: [
      { q: `Which value should survive a merge?`, a: `Generally the most recent value for fields that change over time, the most complete value when one record is empty, and the verified value over an unverified one. Good merge tools recommend a surviving value per field so you review rather than guess.` },
      { q: `Can you undo a record merge?`, a: `Sometimes, but it is often difficult or impossible depending on the system, which is why confirming identity before merging matters so much. Treat a merge as near-permanent and review conflicts carefully before committing.` },
      { q: `What happens to activity history when records merge?`, a: `In a proper merge, all activity, notes, emails, and relationships from both records combine under the surviving master, so nothing is lost. If merging deletes one record's history instead of combining it, that is a data-losing merge to avoid.` },
    ] },

  { slug: `how-to-find-duplicate-contacts-in-a-crm`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to find duplicate contacts in a CRM`,
    shortAnswer: `Find duplicate contacts by running exact matches on email, then fuzzy matches on name plus company to catch duplicates with missing or different emails, and cross-object matches for leads that duplicate existing contacts. Combine exact and fuzzy logic, because exact matching alone misses most real-world duplicates created by typos and job changes.`,
    intro: [`Duplicates rarely look identical. The same person appears with a work email on one record and a personal email on another, or with a nickname and a typo.`, `Finding them means layering match strategies: exact where you can, fuzzy where you must, and across objects where leads shadow contacts.`],
    steps: [
      { h: `Exact-match on email`, body: `Start with the strongest signal: two contacts sharing an email are almost always the same person. This catches the easy duplicates first.` },
      { h: `Fuzzy-match on name and company`, body: `Catch duplicates with different or missing emails by matching similar names at the same company, allowing for typos and nicknames.` },
      { h: `Match across objects`, body: `Check whether new leads duplicate existing contacts, so a lead is not worked as net-new when the person is already in the system.` },
      { h: `Score and review candidates`, body: `Rank candidate pairs by match confidence so you can auto-merge the obvious ones and review the uncertain ones.` },
    ],
    sections: [
      { h: `Why exact matching is not enough`, body: `Exact matching on email misses the messiest duplicates: the same person with two emails, a typo in the name, or a lead that shadows a contact. Fuzzy matching on name plus company is what catches the real-world duplicates that cause double outreach.` },
      { h: `How Ardovo helps`, body: `Ardovo runs exact and fuzzy matching across contacts and leads continuously, scoring each candidate by confidence. Rook auto-merges the high-confidence duplicates and surfaces the rest for a quick review, so duplicates get caught as they form rather than piling up.` },
    ],
    faqs: [
      { q: `What is the best way to find duplicate contacts?`, a: `Layer your matching: exact on email first for the easy wins, then fuzzy on name plus company to catch duplicates with missing or different emails, plus cross-object matching so leads that duplicate contacts surface. No single rule catches them all.` },
      { q: `Why does exact matching miss duplicates?`, a: `Because real duplicates rarely match exactly. The same person shows up with a work and a personal email, a nickname, or a typo. Exact-only matching finds the obvious cases and leaves the messy majority that cause double outreach and split history.` },
      { q: `How do you catch duplicates between leads and contacts?`, a: `Run cross-object matching that checks new leads against existing contacts. This is called lead-to-account or lead-to-contact matching, and it stops a person already in the system from being worked as a brand-new lead by a different rep.` },
    ] },

  { slug: `what-is-a-duplicate-record`, type: `glossary`, eyebrow: `Deduplication`,
    title: `What is a duplicate record?`,
    shortAnswer: `A duplicate record is a second CRM entry that represents the same real-world person, company, or deal already stored elsewhere in the system. Duplicates split activity history, confuse ownership, and cause repeated outreach. They form from manual re-entry, imports, and form fills, and are fixed by merging into one golden record.`,
    intro: [`A duplicate is not always an exact copy - it is any record pointing at an entity that already exists, however differently it is spelled.`, `Duplicates are among the costliest data problems because they fragment the single view of a customer that a CRM is supposed to provide.`],
    keyPoints: [`A second record for an entity that already exists in the system.`, `Splits activity, ownership, and preferences across records.`, `Forms from re-entry, imports, and form submissions.`, `Resolved by merging into a golden record, prevented by entry-time blocking.`],
    sections: [
      { h: `Why it matters`, body: `Duplicates defeat the core purpose of a CRM: one view of each customer. When history splits, reps make decisions on half the picture, two people work the same account, and customers get double-emailed. Every duplicate is a small crack in the single source of truth.` },
      { h: `How Ardovo handles it`, body: `Ardovo catches duplicates at entry with exact and fuzzy matching and merges existing ones into golden records. Rook keeps the database unified so each person and company has exactly one living record with its full history intact.` },
    ],
    faqs: [
      { q: `How do duplicate records get created?`, a: `From manual re-entry when a rep does not find an existing record, from imports that do not check against current data, and from web forms where a returning person submits again. Without duplicate blocking at entry, all three quietly create duplicates.` },
      { q: `Why are duplicate records a problem?`, a: `They split a single entity's history, activity, and preferences across two records, so reps see half the picture, ownership gets confused, outreach doubles up, and reports overcount. Duplicates directly undermine the single-source-of-truth a CRM is meant to be.` },
      { q: `How do you fix duplicate records?`, a: `Merge them into one golden record that keeps the best value per field and all combined history, rather than deleting. Then turn on duplicate blocking at entry so new duplicates cannot form and rebuild the problem.` },
    ] },

  { slug: `how-to-prevent-duplicate-records`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to prevent duplicate records`,
    shortAnswer: `Prevent duplicate records by checking every new entry against existing data at the point of creation - in manual entry, imports, and form fills - and blocking or flagging matches before they save. Standardize values so matching works, use both exact and fuzzy rules, and route returning people to their existing record instead of a new one.`,
    intro: [`Deduping is cleanup; prevention is what keeps you from doing it again. The cheapest duplicate is the one that never gets created.`, `Prevention means catching matches at every entry point - reps, imports, and forms - not just periodically merging the results.`],
    steps: [
      { h: `Block on manual entry`, body: `When a rep creates a record, check it against existing ones and warn or block if it matches, offering the existing record instead.` },
      { h: `De-dupe imports before load`, body: `Match incoming import rows against current records and against each other, so an import does not bulk-create duplicates.` },
      { h: `Match form submissions`, body: `When a web form comes in, match it to an existing contact and update that record rather than creating a new one.` },
      { h: `Standardize so matching works`, body: `Normalize company names, emails, and formats so the matcher can actually recognize duplicates that are spelled differently.` },
    ],
    sections: [
      { h: `Every entry point needs a guard`, body: `Duplicates enter through three doors: manual entry, imports, and forms. Guarding only one leaves the others open. Prevention has to cover all three, and standardization underneath makes the matching reliable enough to trust with blocking.` },
      { h: `How Ardovo helps`, body: `Ardovo checks every entry point - manual, import, and form - against existing records with exact and fuzzy matching, and routes returning people to their existing record. Rook does this automatically so duplicates are stopped at the door instead of merged after the fact.` },
    ],
    faqs: [
      { q: `How do you stop duplicates before they are created?`, a: `Check each new record against existing data at the moment of entry and block or flag matches. Cover all three entry points - manual creation, imports, and web forms - since guarding only one leaves duplicates flowing in through the others.` },
      { q: `Why do imports create so many duplicates?`, a: `Because a naive import loads every row as a new record without checking against what already exists or against other rows in the same file. De-duping the import against current data and within itself before loading prevents this.` },
      { q: `Does duplicate prevention need clean data first?`, a: `They reinforce each other. Standardized values make matching reliable, and reliable matching makes prevention trustworthy enough to block on. Start standardization and prevention together so the matcher can actually recognize duplicates spelled differently.` },
    ] },

  { slug: `what-is-fuzzy-matching`, type: `glossary`, eyebrow: `Deduplication`,
    title: `What is fuzzy matching?`,
    shortAnswer: `Fuzzy matching is finding records that are similar but not identical, so duplicates with typos, nicknames, abbreviations, or formatting differences are caught. Instead of requiring exact equality, it scores how alike two values are. Fuzzy matching is what catches the messy real-world duplicates that exact matching misses, like "Bob Smith" versus "Robert Smith".`,
    intro: [`Real data is messy. The same company is "Acme Inc", "Acme, Incorporated", and "acme"; the same person is Bob and Robert. Exact matching treats these as different.`, `Fuzzy matching measures similarity rather than demanding equality, which is what makes deduplication work on real-world data.`],
    keyPoints: [`Matches similar-but-not-identical values by scoring similarity.`, `Handles typos, nicknames, abbreviations, and formatting differences.`, `Catches duplicates that exact matching misses.`, `Usually tuned with a confidence threshold to balance false matches against misses.`],
    sections: [
      { h: `Why it matters`, body: `Exact matching only catches perfect copies, which are the minority of real duplicates. Fuzzy matching catches the rest - the typos, nicknames, and format differences that cause most double outreach and split history. It is what makes dedupe effective on actual data.` },
      { h: `How Ardovo handles it`, body: `Ardovo uses fuzzy matching alongside exact rules and scores every candidate by confidence, so it catches messy duplicates without wrongly merging distinct records. Rook auto-merges high-confidence matches and flags borderline ones for review.` },
    ],
    faqs: [
      { q: `How is fuzzy matching different from exact matching?`, a: `Exact matching requires values to be identical; fuzzy matching scores how similar they are and matches above a threshold. Exact catches perfect copies, fuzzy catches the typos, nicknames, and formatting differences that make up most real duplicates.` },
      { q: `What is a match confidence threshold?`, a: `The similarity score above which two records are treated as a match. A high threshold means fewer false matches but more missed duplicates; a lower one catches more but risks wrong merges. Tuning it balances precision against recall for your data.` },
      { q: `Can fuzzy matching create wrong merges?`, a: `If the threshold is too loose, yes - it can flag distinct records as duplicates. That is why good systems score confidence and auto-merge only high-confidence matches while routing borderline candidates to a human for review.` },
    ] },

  { slug: `how-to-set-up-duplicate-rules`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to set up duplicate rules`,
    shortAnswer: `Set up duplicate rules by choosing match keys per object (email for contacts, domain plus name for accounts), deciding whether each rule blocks or just warns, tuning fuzzy thresholds, and defining merge logic for which value survives. Start strict on blocking the obvious duplicates, then widen fuzzy matching as you gain confidence.`,
    intro: [`Duplicate rules encode how your CRM decides two records are the same. Get them right and duplicates never form; too loose and you get false merges, too strict and duplicates slip through.`, `Set rules per object, because what makes two contacts duplicates differs from what makes two accounts duplicates.`],
    steps: [
      { h: `Choose match keys per object`, body: `Pick the fields that identify each object: email for contacts, web domain plus company name for accounts, email or name plus company for leads.` },
      { h: `Decide block versus warn`, body: `For high-confidence keys like email, block creation of a duplicate. For fuzzy matches, warn and let the rep decide, to avoid false blocks.` },
      { h: `Tune fuzzy thresholds`, body: `Set the similarity threshold so it catches typos and variants without flagging genuinely different records. Start conservative and loosen as you validate.` },
      { h: `Define merge logic`, body: `Specify which value survives for each field when a merge happens, so merges are consistent and do not need a manual decision every time.` },
    ],
    sections: [
      { h: `Block the obvious, warn on the fuzzy`, body: `The safe pattern is to hard-block exact high-confidence duplicates (same email) and only warn on fuzzy matches, so you never wrongly block a legitimate record. As your fuzzy matching proves accurate, you can promote some fuzzy rules to blocking.` },
      { h: `How Ardovo helps`, body: `Ardovo ships sensible duplicate rules per object out of the box - exact blocking on strong keys, confidence-scored fuzzy matching with review. Rook tunes and applies them automatically, so you get duplicate prevention without hand-building and babysitting rule sets.` },
    ],
    faqs: [
      { q: `What match keys should duplicate rules use?`, a: `Per object: email for contacts, web domain plus company name for accounts, and email or name-plus-company for leads. Strong unique identifiers like email make the best blocking keys; softer signals like name are better for fuzzy warn rules.` },
      { q: `Should duplicate rules block or warn?`, a: `Block on high-confidence exact matches like a shared email, where a duplicate is almost certain. Warn on fuzzy matches so reps can judge borderline cases, avoiding false blocks that frustrate users and hide legitimate new records.` },
      { q: `How do you avoid false duplicate matches?`, a: `Use strict thresholds for blocking rules and looser ones only for warn rules, score matches by confidence, and require review before merging borderline candidates. Starting conservative and loosening as accuracy proves out avoids wrong merges.` },
    ] },

  { slug: `what-is-a-golden-record`, type: `glossary`, eyebrow: `Deduplication`,
    title: `What is a golden record?`,
    shortAnswer: `A golden record is the single, authoritative version of a customer created by merging all duplicate records for that entity into one. It holds the best value for each field and the combined history of every source record. The golden record is the trusted source of truth that the whole business relies on for that person or company.`,
    intro: [`When duplicates merge, the survivor is the golden record: the one true version everyone works from.`, `Its value is being authoritative - the record you can trust for outreach, reporting, and decisions because it consolidates everything known about the entity.`],
    keyPoints: [`The single authoritative record for an entity after duplicates merge.`, `Holds the best value per field and all combined history.`, `Serves as the trusted source of truth across the business.`, `Maintained by ongoing dedupe and enrichment, not created once.`],
    sections: [
      { h: `Why it matters`, body: `Without a golden record, each team works from a different partial copy and no one agrees on the truth. The golden record consolidates scattered data into one trustworthy version, which is the entire promise of a CRM as a single source of truth.` },
      { h: `How Ardovo handles it`, body: `Ardovo builds golden records automatically when it merges duplicates, choosing the best value per field and preserving all history. Rook keeps them golden over time by enriching, re-verifying, and blocking new duplicates that would fragment them.` },
    ],
    faqs: [
      { q: `How is a golden record created?`, a: `By merging all duplicate records for an entity into one surviving record that takes the best value for each field - most recent, most complete, or verified - and combines the activity history from every source record. The result is one authoritative version.` },
      { q: `What is the difference between a golden record and a master record?`, a: `They are often used interchangeably. Master record usually refers to the record chosen to survive a merge; golden record emphasizes that the survivor is the trusted, consolidated source of truth. In practice the golden record is the well-maintained master.` },
      { q: `How do you keep a golden record accurate?`, a: `Continuously: block new duplicates that would fragment it, enrich and re-verify to fight decay, and standardize its values. A golden record is not created once and left alone; it stays golden only through ongoing hygiene.` },
    ] },

  { slug: `how-to-merge-duplicate-accounts`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to merge duplicate accounts`,
    shortAnswer: `Merge duplicate accounts by matching on web domain plus company name, confirming they are the same company (not a parent and subsidiary), choosing the master, resolving field conflicts, and reparenting all related contacts, deals, and activity to the survivor. Account merges are higher-stakes than contact merges because they carry deals and relationships.`,
    intro: [`Merging accounts is riskier than merging contacts because an account carries contacts, deals, and revenue history. A wrong account merge scrambles the pipeline.`, `The extra care goes into confirming identity - especially distinguishing true duplicates from parent-child relationships - and reparenting everything cleanly.`],
    steps: [
      { h: `Match on domain and name`, body: `Use web domain as the strongest account key, supported by fuzzy company-name matching, to find likely duplicate accounts.` },
      { h: `Confirm they are truly one company`, body: `Check that the accounts are the same entity, not a parent and subsidiary or two divisions that should stay separate under a hierarchy.` },
      { h: `Choose the master and resolve conflicts`, body: `Pick the surviving account and decide which value wins for each conflicting field, favoring the most complete and recent.` },
      { h: `Reparent related records`, body: `Move all contacts, deals, activities, and notes from the duplicates onto the master so nothing is orphaned.` },
    ],
    sections: [
      { h: `Duplicate versus parent-child`, body: `The classic account-merge mistake is merging a subsidiary into its parent because the names are similar. They are not duplicates - they are a hierarchy. Confirm whether two similar accounts are the same legal entity or a related pair before merging; the wrong call loses a real business relationship.` },
      { h: `How Ardovo helps`, body: `Ardovo matches accounts on domain and name, distinguishes true duplicates from hierarchy relationships, and reparents all contacts, deals, and activity onto the master automatically. Rook handles the reparenting busywork so no deal or contact is orphaned in a merge.` },
    ],
    faqs: [
      { q: `How do you match duplicate accounts?`, a: `Use web domain as the strongest identifier, supported by fuzzy matching on company name to catch formatting differences. Domain matching is reliable because a company's domain is far more unique and stable than its variously-spelled name.` },
      { q: `What is the risk of merging accounts?`, a: `An account carries contacts, deals, and revenue history, so a wrong merge scrambles the pipeline and can blend two real companies. The biggest specific risk is merging a subsidiary into its parent when they should be a hierarchy, not one record.` },
      { q: `What happens to contacts and deals when accounts merge?`, a: `In a proper merge they are reparented onto the surviving master account, so every contact, deal, activity, and note moves over and nothing is orphaned. If a merge deletes related records instead of reparenting them, that is a data-losing merge to avoid.` },
    ] },

  { slug: `best-crm-deduplication-tools`, type: `guide`, eyebrow: `Deduplication`,
    title: `What to look for in CRM deduplication tools`,
    shortAnswer: `Good CRM deduplication tools combine exact and fuzzy matching, work across objects (leads, contacts, accounts), score match confidence, merge into golden records without losing history, and prevent duplicates at entry rather than only cleaning after the fact. The best option is a CRM with dedupe built in, so prevention is native instead of bolted on.`,
    intro: [`Dedupe tools range from bulk cleanup utilities to always-on prevention engines. The difference matters: cleanup alone means the problem returns.`, `The strongest setup is native prevention inside the CRM, because a bolt-on tool can only react after duplicates already formed.`],
    steps: [
      { h: `Require exact plus fuzzy matching`, body: `A tool that only does exact matching misses most real duplicates. Insist on fuzzy matching that handles typos, nicknames, and formatting.` },
      { h: `Check cross-object coverage`, body: `Duplicates span leads, contacts, and accounts. The tool should match across objects, not just within one.` },
      { h: `Demand confidence scoring and safe merges`, body: `Look for confidence scores, merge preview, and golden-record merges that preserve history rather than delete.` },
      { h: `Prioritize prevention at entry`, body: `The best tools block duplicates as they form, at manual entry, import, and form fill, not just clean up afterward.` },
    ],
    sections: [
      { h: `Cleanup tools versus prevention`, body: `A bolt-on dedupe utility can merge existing duplicates but cannot stop new ones, so you re-run it forever. Native prevention inside the CRM guards every entry point, so duplicates rarely form. Prefer prevention; treat cleanup-only tools as a temporary fix.` },
      { h: `How Ardovo helps`, body: `Ardovo has deduplication built in, not bolted on: exact and fuzzy matching across leads, contacts, and accounts, confidence-scored merges into golden records, and blocking at every entry point. Rook runs it continuously, so you never buy or babysit a separate dedupe tool.` },
    ],
    faqs: [
      { q: `What makes a good deduplication tool?`, a: `Exact plus fuzzy matching, cross-object coverage, confidence scoring, safe golden-record merges that preserve history, and - most important - prevention at the point of entry. A tool that only cleans up after the fact leaves you re-running it forever.` },
      { q: `Is a standalone dedupe tool or a built-in one better?`, a: `Built-in is better when available. A standalone tool can merge existing duplicates but cannot block new ones as they form, so the problem returns. A CRM with native dedupe guards every entry point and keeps the database unified continuously.` },
      { q: `Do deduplication tools delete data?`, a: `Good ones do not - they merge duplicates into a golden record that keeps the best value per field and all history. Avoid any tool that resolves duplicates by deleting records, since that discards activity and relationships you may need.` },
    ] },

  // ===================================================================
  // CLUSTER C - Data enrichment
  // ===================================================================
  { slug: `what-is-crm-data-enrichment`, type: `glossary`, eyebrow: `Data enrichment`,
    title: `What is CRM data enrichment?`,
    shortAnswer: `CRM data enrichment is automatically filling and updating records with data from external sources, so contacts and accounts carry accurate company size, industry, location, titles, and verified contact details without manual research. Enrichment fights incomplete and decaying data by keeping records current from trusted providers instead of relying on reps to look things up.`,
    intro: [`Enrichment answers the question "what do we not know about this record that a data provider does?" and fills it in automatically.`, `It turns a bare email into a full profile - company, industry, size, role - so reps spend time selling instead of researching.`],
    keyPoints: [`Fills and updates records from external data providers automatically.`, `Adds firmographic, technographic, and verified contact data.`, `Reduces manual research and fights data decay.`, `Works best continuously, refreshing records as the world changes.`],
    sections: [
      { h: `Why it matters`, body: `A thin record cannot be scored, routed, or segmented well. Enrichment turns sparse data into complete profiles, which powers better routing, scoring, and targeting - and it fights decay by refreshing records as companies and people change.` },
      { h: `How Ardovo handles it`, body: `Ardovo enriches records automatically on creation and on a refresh schedule, so profiles are complete and current. Rook fills firmographic and contact gaps without a rep lifting a finger, and re-verifies data as it decays.` },
    ],
    faqs: [
      { q: `What data does enrichment add?`, a: `Firmographic data like company size, industry, revenue, and location; technographic data about the tools a company uses; and verified contact details like titles, corrected emails, and phone numbers. It fills what a machine can know so reps do not research it manually.` },
      { q: `Is data enrichment a one-time thing?`, a: `No. Because data decays 25 to 30 percent per year, enrichment works best as a continuous refresh, re-verifying and updating records on a schedule. One-time enrichment goes stale as people change jobs and companies change details.` },
      { q: `How is enrichment different from data cleaning?`, a: `Cleaning fixes what is wrong or duplicated in your existing data. Enrichment adds and refreshes data from external sources. They complement each other: cleaning corrects the record, enrichment completes and keeps it current.` },
    ] },

  { slug: `how-to-enrich-crm-data`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to enrich CRM data`,
    shortAnswer: `Enrich CRM data by identifying the fields worth filling automatically, connecting a trusted data provider, enriching on creation so new records arrive complete, refreshing existing records on a schedule to fight decay, and validating the appended data. Automate the machine-knowable fields and reserve rep effort for judgment fields no provider has.`,
    intro: [`Enrichment is the fastest way to make a database more complete without asking reps to type more. The data already exists somewhere; you just connect it.`, `The pattern is enrich-on-create plus scheduled-refresh, so records start complete and stay current as the world changes.`],
    steps: [
      { h: `Decide what to enrich`, body: `Pick the fields that drive routing, scoring, and outreach and that a provider can supply: company size, industry, location, title, verified email.` },
      { h: `Connect a trusted provider`, body: `Wire in a data source with good coverage and accuracy for your market, so appended values are reliable enough to route and score on.` },
      { h: `Enrich on creation`, body: `Enrich new records the moment they are created, so a bare email becomes a full profile before a rep ever touches it.` },
      { h: `Refresh on a schedule`, body: `Re-enrich existing records periodically to fight decay, catching job changes and updated company details.` },
    ],
    sections: [
      { h: `Enrich on create, refresh on schedule`, body: `One-time enrichment leaves you with a database that was complete last year. The durable pattern is enriching at creation so records start full, plus a scheduled refresh so they stay current. Together they beat both incompleteness and decay.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches records at creation and refreshes them on a schedule automatically. Rook fills company size, industry, location, and verified contact details the moment a record appears, and keeps them current, so reps inherit complete profiles instead of blank forms.` },
    ],
    faqs: [
      { q: `When should you enrich CRM records?`, a: `Both at creation and on a recurring schedule. Enriching on creation means new records start complete; scheduled refresh keeps them current as data decays. Doing only one leaves you either with thin new records or stale old ones.` },
      { q: `What should you not rely on enrichment for?`, a: `Judgment fields no external source knows: use case, budget, pain, and next step. Enrichment fills machine-knowable firmographic and contact data. The judgment fields still come from reps, gathered through well-timed prompts rather than upfront forms.` },
      { q: `How do you keep enriched data accurate?`, a: `Use a trusted provider, refresh on a schedule, and validate appended values against format rules. Because contact data decays quickly, a one-time enrichment is not enough - the refresh cadence is what keeps enriched data reliable over time.` },
    ] },

  { slug: `how-to-enrich-leads`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to enrich leads`,
    shortAnswer: `Enrich leads by appending company and role data the moment a lead is captured, so a bare form fill becomes a scored, routable profile. Add firmographics for fit scoring, verify the email, and infer seniority from title. Enriching at capture is what lets you route and prioritize leads instantly instead of waiting for a rep to research them.`,
    intro: [`A raw lead is often just a name and email. That is not enough to score fit, route to the right rep, or prioritize follow-up.`, `Enriching at the moment of capture turns a thin lead into a complete profile in real time, which is the difference between routing in seconds and hours.`],
    steps: [
      { h: `Enrich at capture`, body: `The instant a lead comes in, append company size, industry, location, and role, so it is ready to score and route immediately.` },
      { h: `Add firmographics for fit scoring`, body: `Fill the company attributes your fit score depends on - size, industry, revenue - so the lead can be scored the moment it arrives.` },
      { h: `Verify the email`, body: `Check deliverability so you route real leads and flag the fake or mistyped ones before a rep wastes time on them.` },
      { h: `Infer seniority from title`, body: `Normalize the job title into a seniority tier so routing and scoring can treat a VP differently from an intern.` },
    ],
    sections: [
      { h: `Enrichment enables instant routing`, body: `Speed-to-lead depends on knowing enough about a lead to route it correctly the moment it lands. If routing has to wait for a rep to research the company, minutes become hours and conversion drops. Enrichment at capture is what makes instant, accurate routing possible.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches leads at capture, so each one arrives with company, role, and fit data already filled. Rook scores and routes it instantly on that enriched profile, and flags undeliverable emails, so reps get real, prioritized leads in seconds.` },
    ],
    faqs: [
      { q: `Why enrich leads at capture?`, a: `Because routing and scoring need company and role data, and if that has to wait for manual research, speed-to-lead collapses. Enriching the instant a lead is captured lets you score fit and route to the right rep in seconds, when conversion odds are highest.` },
      { q: `What data helps most for lead enrichment?`, a: `Firmographics for fit scoring (company size, industry, revenue), verified email for deliverability, and normalized title for seniority-based routing. These turn a bare form fill into a lead you can prioritize and route accurately right away.` },
      { q: `Does lead enrichment improve conversion?`, a: `Indirectly but meaningfully. It enables instant, accurate routing and prioritization, so the right rep works the best leads fast. Faster response to well-qualified leads is one of the most reliable drivers of higher conversion.` },
    ] },

  { slug: `how-to-fill-missing-crm-fields`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to fill missing CRM fields`,
    shortAnswer: `Fill missing CRM fields by separating machine-knowable gaps from judgment gaps: enrich firmographic and contact fields automatically from a data provider, and prompt reps only for the fields no external source knows, like use case and budget, at the moment they matter. Automate the bulk of gaps and reserve human effort for judgment.`,
    intro: [`Missing fields have two causes: data that exists externally but was never appended, and data only a person knows but never entered.`, `Treating both the same way - by nagging reps - wastes effort. Enrich the first kind and prompt sparingly for the second.`],
    steps: [
      { h: `Categorize the gaps`, body: `Split missing fields into machine-knowable (company, industry, title) and judgment (use case, budget, pain). They need different fixes.` },
      { h: `Enrich the machine-knowable gaps`, body: `Append firmographic and verified contact data automatically, closing most gaps with no human effort.` },
      { h: `Prompt for judgment gaps in context`, body: `Ask reps for the human-only fields at the right moment - after a call, at a stage change - not in a giant upfront form.` },
      { h: `Require only the critical few`, body: `Make just the essential fields mandatory so records are not created empty, keeping the required list short to avoid friction.` },
    ],
    sections: [
      { h: `Do not nag reps for machine-knowable data`, body: `Asking a rep to fill in company size or industry - data a provider already has - is wasted effort that breeds resentment and garbage entries. Enrich those automatically. Reserve the rare prompt for judgment fields that genuinely require a human.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches machine-knowable fields automatically and prompts reps only for judgment fields, at the moment they are relevant. Rook does the filling so completeness rises without a data-entry tax, and reps are asked only for what they alone know.` },
    ],
    faqs: [
      { q: `What is the best way to fill missing CRM fields?`, a: `Split the gaps: enrich machine-knowable fields like company and title automatically from a data provider, and prompt reps only for judgment fields like budget and use case, at the moment they matter. Automate the bulk, reserve human effort for judgment.` },
      { q: `Should reps fill in company data manually?`, a: `No. Company size, industry, and location are machine-knowable and should be enriched automatically. Asking reps to research and type them wastes selling time and produces inconsistent values. Reserve manual entry for fields no external source has.` },
      { q: `How do you get reps to fill judgment fields?`, a: `Prompt them in context - right after a call or at a stage change - rather than with a big upfront form, and keep the ask to the few fields that genuinely need a human. Well-timed, minimal prompts get filled; giant forms get gamed.` },
    ] },

  { slug: `what-is-firmographic-data`, type: `glossary`, eyebrow: `Data enrichment`,
    title: `What is firmographic data?`,
    shortAnswer: `Firmographic data describes the attributes of a company: industry, size, revenue, employee count, location, and structure. It is the B2B equivalent of demographics for people. Firmographic data powers fit scoring, segmentation, territory assignment, and targeting, letting teams focus on accounts that match their ideal customer profile.`,
    intro: [`Firmographics are how B2B teams describe and segment companies, the way demographics describe people.`, `They are the backbone of fit scoring and targeting: whether an account matches your ICP is mostly a firmographic question.`],
    keyPoints: [`Company attributes: industry, size, revenue, headcount, location, structure.`, `The B2B analog of demographic data for individuals.`, `Drives fit scoring, segmentation, and territory assignment.`, `Commonly filled through enrichment rather than manual entry.`],
    sections: [
      { h: `Why it matters`, body: `Fit scoring, territory routing, and account targeting all rest on firmographics. Without industry and size on a record, you cannot tell whether an account matches your ideal profile, route it correctly, or segment your outreach. It is foundational B2B data.` },
      { h: `How Ardovo handles it`, body: `Ardovo enriches firmographic fields automatically, so every account carries industry, size, revenue, and location. Rook uses that data to score fit, assign territories, and segment lists without anyone researching companies by hand.` },
    ],
    faqs: [
      { q: `What are examples of firmographic data?`, a: `Industry, number of employees, annual revenue, company size tier, headquarters and office locations, ownership structure, and growth stage. These attributes describe the company itself, as opposed to any individual person who works there.` },
      { q: `How is firmographic data used?`, a: `To score account fit against your ideal customer profile, segment outreach by industry or size, assign territories, and prioritize target accounts. It answers whether a company is the kind of business you sell to, which drives most B2B targeting decisions.` },
      { q: `Where does firmographic data come from?`, a: `Mostly from data enrichment providers that maintain company databases, appended automatically to your records. Some comes from form fills or manual research, but enrichment is how teams fill firmographics accurately at scale without reps looking up each company.` },
    ] },

  { slug: `what-is-technographic-data`, type: `glossary`, eyebrow: `Data enrichment`,
    title: `What is technographic data?`,
    shortAnswer: `Technographic data describes the technology stack a company uses: the software, platforms, and tools it has deployed. It helps sellers find accounts that use complementary or competing products, tailor messaging to a known stack, and prioritize prospects whose tools signal a fit. Technographics are appended through enrichment alongside firmographics.`,
    intro: [`Technographics answer "what does this company run on?" - which CRM, cloud, or tools they use.`, `For many sellers this is a powerful qualifier: a company using a competing or complementary tool is often a better-timed prospect.`],
    keyPoints: [`Describes the software and technology a company uses.`, `Signals fit, timing, and competitive displacement opportunities.`, `Lets sellers tailor messaging to a known stack.`, `Appended through enrichment alongside firmographic data.`],
    sections: [
      { h: `Why it matters`, body: `Knowing a prospect's stack sharpens both targeting and messaging. A company running a tool you integrate with, or a competitor you displace, is a higher-value, better-timed lead - and you can speak directly to their setup instead of guessing.` },
      { h: `How Ardovo handles it`, body: `Ardovo can enrich accounts with technographic signals, so Rook surfaces prospects whose stack indicates fit or a displacement opening. Reps get accounts pre-qualified by the tools they use, with messaging angles ready.` },
    ],
    faqs: [
      { q: `What is the difference between firmographic and technographic data?`, a: `Firmographic data describes the company itself - industry, size, revenue, location. Technographic data describes the technology the company uses. Firmographics tell you if an account fits your profile; technographics tell you about their stack and buying context.` },
      { q: `How do sellers use technographic data?`, a: `To find accounts using complementary or competing tools, prioritize better-timed prospects, and tailor messaging to a known stack. A company running a competitor is a displacement target; one running a tool you integrate with is a natural fit.` },
      { q: `Where does technographic data come from?`, a: `From enrichment providers that detect the technologies companies use, appended to account records alongside firmographics. It is machine-gathered data, so it is best filled through enrichment rather than rep research.` },
    ] },

  { slug: `how-to-append-company-data-to-contacts`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to append company data to contacts`,
    shortAnswer: `Append company data to contacts by matching each contact to its account through the email domain, then enriching the account with firmographics and linking the contact to it, so company attributes live once on the account and every contact inherits them. Store company data on the account, not copied onto each contact, to keep it consistent and current.`,
    intro: [`Contacts need company context - industry, size, location - to be scored and segmented. But copying that onto every contact record creates redundancy that drifts out of sync.`, `The clean pattern is to enrich the account once and link contacts to it, so they inherit company data rather than each storing a stale copy.`],
    steps: [
      { h: `Match contacts to accounts by domain`, body: `Use the email domain to associate each contact with the right company account, so the relationship is explicit.` },
      { h: `Enrich the account`, body: `Append firmographic data - industry, size, revenue, location - to the account record once, from a data provider.` },
      { h: `Link, do not copy`, body: `Relate contacts to the account so they inherit its company data by reference, rather than duplicating those values onto each contact.` },
      { h: `Refresh the account on a schedule`, body: `Re-enrich the account periodically so every linked contact stays current as the company changes.` },
    ],
    sections: [
      { h: `Store company data once, on the account`, body: `Copying industry and size onto every contact means updating in a hundred places and drift the moment one changes. Storing it once on the account and linking contacts keeps company data consistent - update the account, and every contact reflects it instantly.` },
      { h: `How Ardovo helps`, body: `Ardovo links contacts to accounts by domain and enriches the account once, so contacts inherit company data by reference. Rook keeps the account enriched and current, and every related contact reflects the latest firmographics without redundant copies.` },
    ],
    faqs: [
      { q: `Should company data be stored on the contact or the account?`, a: `On the account, with contacts linked to it. Storing company attributes once on the account and letting contacts inherit them keeps data consistent - one update flows everywhere. Copying company data onto every contact creates redundancy that drifts out of sync.` },
      { q: `How do you match a contact to the right company?`, a: `Primarily through the email domain, which reliably maps a person to their employer. Domain matching connects contacts to accounts so they inherit enriched firmographic data, and it also powers lead-to-account matching for routing.` },
      { q: `How do contacts stay current with company changes?`, a: `By inheriting company data from a linked account that is re-enriched on a schedule. Because the data lives once on the account, refreshing the account updates every linked contact at once, rather than requiring a separate update per contact.` },
    ] },

  { slug: `what-is-a-data-provider`, type: `glossary`, eyebrow: `Data enrichment`,
    title: `What is a data provider?`,
    shortAnswer: `A data provider is a service that maintains a database of company and contact information and supplies it to enrich your CRM records. Providers offer firmographic, technographic, and verified contact data through integrations or APIs. Choosing one comes down to coverage and accuracy for your market, since enriched data is only as good as its source.`,
    intro: [`A data provider is the external source enrichment draws from - the company that keeps a fresh database of firms and people so you do not have to.`, `Provider quality is decisive: enrichment inherits whatever accuracy and coverage the source has, good or bad.`],
    keyPoints: [`Maintains and supplies company and contact data for enrichment.`, `Offers firmographic, technographic, and verified contact information.`, `Delivered via integration or API into the CRM.`, `Chosen on coverage and accuracy for your specific market.`],
    sections: [
      { h: `Why it matters`, body: `Enrichment is only as good as the provider behind it. A source with poor coverage of your market leaves records thin; one with stale data appends decay. The provider choice determines whether enrichment helps or quietly introduces bad data.` },
      { h: `How Ardovo handles it`, body: `Ardovo connects to trusted data sources and validates appended values, so enrichment adds reliable data rather than noise. Rook applies it automatically, and you get complete profiles without managing provider integrations yourself.` },
    ],
    faqs: [
      { q: `How do you choose a data provider?`, a: `Evaluate coverage and accuracy for your specific market - a provider strong in one region or industry may be weak in another. Test it against records you can verify, and weigh freshness, since stale provider data appends decay rather than fixing it.` },
      { q: `What data do providers supply?`, a: `Firmographic data (industry, size, revenue, location), technographic data (technology stack), and verified contact details (corrected emails, phone numbers, titles). Different providers specialize, so some teams use more than one to cover their needs.` },
      { q: `Why does provider quality matter so much?`, a: `Because enrichment inherits the provider's accuracy and coverage. A poor source leaves gaps or appends outdated values, quietly degrading your data. The provider is effectively the ceiling on how good your enriched data can be.` },
    ] },

  { slug: `how-to-verify-email-addresses-in-a-crm`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to verify email addresses in a CRM`,
    shortAnswer: `Verify email addresses by checking format, confirming the domain exists and accepts mail, and validating the mailbox where possible, then flagging or correcting bad addresses before they are used. Verify at capture so undeliverable emails never route as real leads, and re-verify periodically because addresses decay as people change jobs.`,
    intro: [`An invalid email is worse than a blank one: it looks usable, so a rep or campaign wastes effort on it and outreach bounces.`, `Verification catches bad addresses at capture and on refresh, protecting deliverability and rep time.`],
    steps: [
      { h: `Check format and domain`, body: `Confirm the address is well-formed and its domain exists and accepts mail. This catches typos and dead domains immediately.` },
      { h: `Validate the mailbox where possible`, body: `Where the provider allows, confirm the specific mailbox exists, distinguishing a real address from a plausible-looking fake.` },
      { h: `Flag or correct at capture`, body: `When a lead comes in, verify before routing, so undeliverable addresses are flagged or corrected rather than worked as real.` },
      { h: `Re-verify on a schedule`, body: `Because emails decay as people leave jobs, re-verify periodically and flag addresses that have started bouncing.` },
    ],
    sections: [
      { h: `Verify at capture, not after a bounce`, body: `Discovering a bad email when a campaign bounces is too late - deliverability already took the hit and the rep already wasted time. Verifying at capture stops undeliverable addresses from ever routing as real leads, and scheduled re-verification catches decay before it bounces.` },
      { h: `How Ardovo helps`, body: `Ardovo verifies emails at capture and re-verifies on a schedule, so undeliverable addresses are flagged before they route and caught as they decay. Rook keeps deliverability high and stops reps from wasting time on dead addresses.` },
    ],
    faqs: [
      { q: `Why verify email addresses in a CRM?`, a: `Because an invalid email looks usable but bounces, wasting rep time and hurting sender reputation. Verifying catches typos, dead domains, and fake addresses before they are worked or emailed, protecting both deliverability and productivity.` },
      { q: `When should you verify emails?`, a: `At capture, so undeliverable addresses never route as real leads, and periodically after that, because emails decay as people change jobs. Verifying only once lets addresses go bad silently until a campaign bounces off them.` },
      { q: `What makes an email address invalid?`, a: `A malformed format, a domain that does not exist or reject mail, or a mailbox that is not real - plus addresses that were valid but decayed when the person left. Verification checks format, domain, and, where possible, the mailbox itself.` },
    ] },

  { slug: `what-is-an-ideal-customer-profile`, type: `glossary`, eyebrow: `Data enrichment`,
    title: `What is an ideal customer profile?`,
    shortAnswer: `An ideal customer profile, or ICP, is a description of the company that gets the most value from your product and is easiest to win and keep. It is defined by firmographic and technographic attributes - industry, size, and stack - and drives fit scoring, targeting, and territory design so effort concentrates on the accounts most likely to become good customers.`,
    intro: [`The ICP is the answer to "who should we actually sell to?" - a data-backed profile of your best-fit accounts.`, `It is the anchor for fit scoring and targeting: nearly every prioritization decision measures an account against the ICP.`],
    keyPoints: [`Describes the accounts that get the most value and are easiest to win and keep.`, `Built from firmographic and technographic attributes.`, `Drives fit scoring, targeting, and territory design.`, `Refined over time from the traits of your best actual customers.`],
    sections: [
      { h: `Why it matters`, body: `Selling to everyone wastes effort on accounts that will not close or will churn. The ICP concentrates time on the accounts most likely to become good, lasting customers, which lifts win rate, retention, and efficiency all at once.` },
      { h: `How Ardovo handles it`, body: `Ardovo scores every account's fit against your ICP using enriched firmographic data, so Rook can prioritize the best-fit accounts and flag poor-fit ones. The ICP becomes an active filter on where the team spends time, not a slide.` },
    ],
    faqs: [
      { q: `How do you define an ideal customer profile?`, a: `Analyze your best current customers - the ones who get the most value, close fastest, and stay longest - and find the firmographic and technographic traits they share. Those shared attributes become the ICP you score and target new accounts against.` },
      { q: `What is the difference between an ICP and a buyer persona?`, a: `An ICP describes the ideal company or account to sell to, using firmographics. A buyer persona describes the individual people within that account you engage. ICP is account-level fit; persona is person-level role and motivation.` },
      { q: `How does an ICP improve targeting?`, a: `By giving fit scoring a clear standard, so effort concentrates on accounts that resemble your best customers and steers away from poor-fit ones. That focus raises win rate and retention because you sell to companies genuinely likely to succeed with your product.` },
    ] },

  { slug: `how-to-build-a-fit-score`, type: `guide`, eyebrow: `Data enrichment`,
    title: `How to build a fit score`,
    shortAnswer: `Build a fit score by defining your ideal customer profile, choosing the firmographic and technographic attributes that predict a good customer, weighting each by importance, enriching records so the attributes are present, and combining them into a single score. The fit score tells you how well an account matches your ICP, separate from how engaged it is.`,
    intro: [`Fit score answers "is this the right kind of account?" - a question about the company, not its behavior.`, `It pairs with an engagement score: fit says whether an account is worth pursuing, engagement says whether now is the time.`],
    steps: [
      { h: `Define the ICP attributes`, body: `List the firmographic and technographic traits that mark a good-fit account: industry, size, revenue, region, stack.` },
      { h: `Weight each attribute`, body: `Assign weights by how strongly each trait predicts a good customer, so the score reflects what actually matters.` },
      { h: `Enrich so the data is present`, body: `Fill the scoring attributes through enrichment, because a fit score cannot be computed on missing firmographics.` },
      { h: `Combine into one score`, body: `Roll the weighted attributes into a single fit score or grade you can route and prioritize on.` },
    ],
    sections: [
      { h: `Keep fit and engagement separate`, body: `Fit and engagement measure different things and mixing them hides signal. A great-fit account with no engagement needs nurturing; a poor-fit account that is very active is often a bad use of time. Score them separately, then combine for prioritization.` },
      { h: `How Ardovo helps`, body: `Ardovo computes fit scores from enriched firmographic data against your ICP, kept separate from engagement. Rook enriches the underlying attributes automatically, so fit scores are always based on complete data rather than the gaps a manual model would inherit.` },
    ],
    faqs: [
      { q: `What is the difference between a fit score and a lead score?`, a: `Fit score measures how well an account matches your ideal profile, based on firmographics. Lead score often blends fit and engagement into one number. Keeping fit separate from engagement gives clearer signal about which accounts to pursue versus when to act.` },
      { q: `What data does a fit score need?`, a: `Firmographic and technographic attributes: industry, company size, revenue, region, and technology stack. These must be present on the record, which is why enrichment is a prerequisite - you cannot score fit on missing company data.` },
      { q: `Why separate fit from engagement?`, a: `Because they answer different questions. Fit tells you if an account is worth pursuing at all; engagement tells you whether the timing is right. Blending them hides a great-fit account that is quiet and flatters a poor-fit account that happens to be active.` },
    ] },

  // ===================================================================
  // CLUSTER D - Importing / migrating data
  // ===================================================================
  { slug: `how-to-import-data-into-a-crm`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to import data into a CRM`,
    shortAnswer: `Import data into a CRM by cleaning the source file first, mapping each column to the right CRM field, de-duping against existing records, running a small test import, reviewing the results, then loading the full set. Clean and map before you load, and always test on a sample, because a bad import is far harder to undo than to prevent.`,
    intro: [`Importing looks simple - upload a file - but a careless import creates duplicates, mismaps fields, and pollutes a clean database in minutes.`, `The disciplined sequence is clean, map, dedupe, test, then load, so problems surface on a sample instead of across thousands of records.`],
    steps: [
      { h: `Clean the source file`, body: `Fix formats, remove junk rows, and standardize values in the file before importing, so you are not loading a mess into a clean system.` },
      { h: `Map columns to fields`, body: `Match each source column to the correct CRM field, converting picklist values to the CRM's accepted options.` },
      { h: `De-dupe against existing records`, body: `Check import rows against current records and against each other, so the import updates matches instead of creating duplicates.` },
      { h: `Test on a sample`, body: `Import a small batch first, review how it landed, and fix the mapping or data before running the full load.` },
      { h: `Load and verify`, body: `Run the full import, then verify counts and spot-check records to confirm everything mapped and matched correctly.` },
    ],
    sections: [
      { h: `Test before the full load`, body: `The single most valuable import habit is a small test batch. Mapping errors and format problems that would corrupt thousands of records show up on twenty, where they are trivial to fix. Never run a full import you have not tested on a sample.` },
      { h: `How Ardovo helps`, body: `Ardovo guides imports with automatic field mapping, de-dupes incoming rows against existing records, and previews results before committing. Rook flags mapping and format problems on a test batch, so the full load lands clean instead of creating a duplicate mess.` },
    ],
    faqs: [
      { q: `What is the most important step when importing CRM data?`, a: `Testing on a small sample before the full load. Field mapping mistakes and format issues that would corrupt thousands of records appear on a batch of twenty, where they cost nothing to fix. Skipping the test is how imports create big messes.` },
      { q: `How do you avoid creating duplicates on import?`, a: `De-dupe the import against existing records and against itself before loading, matching on strong keys like email. This lets the import update existing records instead of blindly creating new ones for people and companies already in the system.` },
      { q: `Should you clean data before or after importing?`, a: `Before. Cleaning and standardizing the source file first means you load good data into a clean system, rather than importing a mess and cleaning it afterward inside the CRM, which is slower and risks polluting existing records.` },
    ] },

  { slug: `crm-data-migration-checklist`, type: `guide`, eyebrow: `Data import & migration`,
    title: `CRM data migration checklist`,
    shortAnswer: `A CRM data migration checklist covers auditing and cleaning the source data, mapping objects and fields, planning how to migrate relationships and history, running a test migration, validating record counts and links, cutting over, and verifying after go-live. Migrate clean data, preserve relationships, and always test on a subset before the full cutover.`,
    intro: [`A migration is not just moving rows; it is moving relationships, history, and ownership from one system's model into another's.`, `A checklist keeps a high-stakes project from missing a step - the linked records, the history, the validation - that only surfaces after cutover when it is expensive to fix.`],
    steps: [
      { h: `Audit and clean the source`, body: `Do not migrate dirty data. Dedupe, standardize, and purge dead records in the source first, so you move a clean database, not a mess.`, bullets: [`Dedupe and standardize before moving`, `Purge dead and test records`, `Document what will and will not migrate`] },
      { h: `Map objects and fields`, body: `Map every source object and field to its destination, including how picklist values and custom fields translate.` },
      { h: `Plan relationships and history`, body: `Decide how contact-to-account links, deal associations, and activity history carry over, since these are the hardest part.` },
      { h: `Run a test migration`, body: `Migrate a representative subset, then validate counts, field values, and relationships before the full run.` },
      { h: `Cut over and verify`, body: `Run the full migration, validate again, and spot-check that history and links survived before switching teams onto the new system.` },
    ],
    sections: [
      { h: `Relationships and history are the hard part`, body: `Moving flat records is easy; moving the links between them - which contacts belong to which accounts, which activities belong to which deals - is where migrations fail. Plan and test the relationship and history migration explicitly, not as an afterthought.` },
      { h: `How Ardovo helps`, body: `Ardovo's migration tooling maps objects and fields, preserves contact-account links and activity history, and runs a validated test migration first. Rook handles the mapping and relationship busywork, so the cutover keeps your history and structure intact instead of arriving as flat, disconnected rows.` },
    ],
    faqs: [
      { q: `What is the hardest part of a CRM migration?`, a: `Preserving relationships and history. Moving flat records is straightforward, but carrying over which contacts belong to which accounts, which activities attach to which deals, and the full timeline is where migrations break. Plan and test that explicitly.` },
      { q: `Should you clean data before migrating?`, a: `Yes, always. Migrate clean data by deduping, standardizing, and purging dead records in the source first. Moving a mess into the new system just recreates the mess and wastes the fresh start a migration offers.` },
      { q: `How do you reduce migration risk?`, a: `Run a test migration on a representative subset and validate counts, field values, and relationships before the full cutover. Testing surfaces mapping and relationship problems on a small set, where they are cheap to fix instead of catastrophic after go-live.` },
    ] },

  { slug: `how-to-migrate-crm-data`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to migrate CRM data`,
    shortAnswer: `Migrate CRM data by exporting and cleaning the source, mapping objects and fields to the new system, migrating relationships and history (not just flat records), testing on a subset, validating counts and links, then cutting over and verifying. The goal is a clean, connected database in the new system, with history and structure intact, not a pile of disconnected rows.`,
    intro: [`Migrating means recreating your data's structure in a new system, not just copying values. The relationships and history are what make the data useful.`, `Done well, a migration is a fresh start on a clean database. Done carelessly, it imports the old mess and loses the history that made the old system worth anything.`],
    steps: [
      { h: `Export and clean the source`, body: `Pull the source data and clean it - dedupe, standardize, purge dead records - so you migrate a clean database.` },
      { h: `Map to the new model`, body: `Map objects, fields, and picklist values to the destination's data model, accounting for structural differences between systems.` },
      { h: `Migrate relationships and history`, body: `Carry over contact-account links, deal associations, and activity history, not just the top-level records.` },
      { h: `Test, validate, and cut over`, body: `Migrate a subset, validate counts and relationships, then run the full migration and verify before switching teams over.` },
    ],
    sections: [
      { h: `Migrate structure, not just rows`, body: `A migration that copies contacts and accounts but drops the links between them, or loses activity history, technically moved the data but destroyed its value. Treat relationships and history as first-class migration objects that get their own mapping and validation.` },
      { h: `How Ardovo helps`, body: `Ardovo migrates from major CRMs with field mapping and relationship preservation built in, so contact-account links and activity history survive the move. Rook runs a validated test migration first and handles the mapping busywork, so you land on a clean, connected database.` },
    ],
    faqs: [
      { q: `How long does a CRM migration take?`, a: `Anywhere from days to a few weeks depending on data volume, how many custom objects and fields you have, and how much cleanup the source needs. Most of the time goes into cleaning, mapping, and validating relationships - the actual data transfer is usually fast.` },
      { q: `What gets lost in a bad migration?`, a: `Relationships and history, most commonly - the links between contacts and accounts, deal associations, and activity timelines. A migration that moves flat records but drops these leaves you with disconnected rows that lost the context that made the data useful.` },
      { q: `Can you migrate CRM data without downtime?`, a: `Largely, with planning. Test the migration on a subset first, validate thoroughly, and schedule the final cutover during a low-activity window. A tested, validated migration keeps the switch quick and avoids the scramble of fixing problems live.` },
    ] },

  { slug: `what-is-crm-data-migration`, type: `glossary`, eyebrow: `Data import & migration`,
    title: `What is CRM data migration?`,
    shortAnswer: `CRM data migration is moving records - contacts, accounts, deals, and activity history - from one system into another, remapping them into the new platform's data model while preserving relationships and history. It is more than a data transfer: a good migration recreates the structure and context, not just the raw values, so the new CRM is usable from day one.`,
    intro: [`Migration is the process of relocating your data when you change CRMs, translating it from the old system's model to the new one.`, `The defining challenge is fidelity: keeping relationships, history, and structure intact so nothing valuable is lost in the move.`],
    keyPoints: [`Moves records and history from one CRM into another.`, `Remaps data into the destination's model and field structure.`, `Must preserve relationships and activity history, not just values.`, `Best done on clean source data with a tested subset first.`],
    sections: [
      { h: `Why it matters`, body: `A migration decides whether the new CRM starts alive and useful or arrives as a disconnected data dump. Preserving relationships and history means reps keep their context; losing them means the team effectively starts over despite the data technically being there.` },
      { h: `How Ardovo handles it`, body: `Ardovo migrates from major CRMs with field mapping and relationship preservation, and validates a test migration before the full run. Rook handles the mapping and relationship work so the new database is clean, connected, and alive on day one.` },
    ],
    faqs: [
      { q: `What is the difference between data migration and data import?`, a: `Import loads a batch of records, often from a file, into an existing CRM. Migration is the larger project of moving an entire system's data - all objects, relationships, and history - into a new platform and remapping it to the new model. Import is a step; migration is the whole move.` },
      { q: `Why is CRM migration considered risky?`, a: `Because it moves everything at once and mistakes surface after cutover when they are expensive to fix. The main risks are dropping relationships and history, mismapping fields, and creating duplicates. Testing on a subset and validating relationships mitigates most of it.` },
      { q: `What should you migrate first?`, a: `Clean, foundational data: accounts and contacts with their relationships, then deals, then activity history. Cleaning the source before migrating and testing on a subset ensures you build the new system on good, connected data rather than importing old problems.` },
    ] },

  { slug: `how-to-import-contacts-from-a-csv`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to import contacts from a CSV`,
    shortAnswer: `Import contacts from a CSV by cleaning the file (consistent columns, standardized values, no junk rows), mapping each column to a CRM field, de-duping against existing contacts on email, testing a small batch, then loading the rest. A well-formatted CSV and a mapping check up front prevent the duplicates and mismapped fields that plague careless imports.`,
    intro: [`A CSV import is the most common way data enters a CRM, and the most common way duplicates and mismapped fields get created.`, `The fix is preparation: a clean file and a checked mapping mean the import lands right the first time.`],
    steps: [
      { h: `Format the CSV cleanly`, body: `One header row, consistent columns, standardized values, and no merged cells or junk rows. A messy file imports as messy data.` },
      { h: `Map columns to fields`, body: `Match each column to the correct CRM field and translate picklist values to the CRM's accepted options.` },
      { h: `De-dupe on email`, body: `Match rows against existing contacts by email so returning people update their record instead of creating a duplicate.` },
      { h: `Test then load`, body: `Import a few rows first, confirm they landed correctly, then run the full file.` },
    ],
    sections: [
      { h: `A clean file is half the battle`, body: `Most import problems trace back to the file: inconsistent columns, values that do not match the CRM's picklists, and stray junk rows. Ten minutes formatting the CSV cleanly prevents hours untangling a bad import. Prepare the file, then the mapping is easy.` },
      { h: `How Ardovo helps`, body: `Ardovo auto-maps CSV columns to fields, de-dupes rows against existing contacts, and previews the import before committing. Rook flags format and mapping issues on a test batch, so a CSV import updates the right records and never quietly floods the database with duplicates.` },
    ],
    faqs: [
      { q: `How do you avoid duplicates when importing a CSV?`, a: `De-dupe the import against existing contacts on a strong key like email before loading, so returning people update their existing record instead of creating a duplicate. Also de-dupe within the file itself, since CSVs often contain their own repeats.` },
      { q: `How should a CSV be formatted for import?`, a: `One header row, consistent columns, standardized values that match the CRM's picklists, and no merged cells, blank rows, or junk. A cleanly formatted file is the single biggest factor in whether an import lands correctly or creates a mess.` },
      { q: `Why test a CSV import before loading everything?`, a: `Because mapping errors and format mismatches that would corrupt every row show up on a small test batch, where they are trivial to fix. Testing a few rows first turns a potential large-scale mess into a quick correction before the full load.` },
    ] },

  { slug: `how-to-migrate-from-spreadsheets-to-a-crm`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to migrate from spreadsheets to a CRM`,
    shortAnswer: `Migrate from spreadsheets to a CRM by consolidating your sheets, cleaning and de-duping the data, deciding how columns become objects and fields, importing accounts and contacts with their relationships, then adding the structure a spreadsheet lacks - stages, ownership, and activity tracking. The move is a chance to add structure, not just relocate flat rows.`,
    intro: [`Spreadsheets store flat rows with no relationships, no history, and no shared truth. A CRM adds all three, which is the whole reason to move.`, `Migrating is not just copying cells across - it is imposing the structure a spreadsheet never had, so the data becomes a system rather than a list.`],
    steps: [
      { h: `Consolidate and clean the sheets`, body: `Combine scattered spreadsheets into one clean source, deduping and standardizing values, since separate sheets usually overlap and conflict.` },
      { h: `Decide the structure`, body: `Map columns to CRM objects and fields: which become accounts, which contacts, which deals, and how they relate.` },
      { h: `Import with relationships`, body: `Load accounts and contacts and link them, so the CRM knows which people belong to which companies - something the sheet did not track.` },
      { h: `Add what spreadsheets lack`, body: `Set up pipeline stages, ownership, and activity tracking, so the data becomes a working system rather than a static list.` },
    ],
    sections: [
      { h: `Add structure, do not just copy rows`, body: `The point of leaving spreadsheets is structure: relationships, stages, ownership, and history. A migration that just dumps the sheet into a CRM as flat records misses the upgrade. Use the move to link records and add the pipeline and tracking the spreadsheet never had.` },
      { h: `How Ardovo helps`, body: `Ardovo imports spreadsheet data, links contacts to accounts, and comes with pipeline stages, ownership, and activity tracking ready. Rook cleans and structures the incoming rows, so a flat spreadsheet becomes a live, connected CRM that is useful on day one.` },
    ],
    faqs: [
      { q: `Why move from spreadsheets to a CRM?`, a: `Spreadsheets store flat rows with no relationships, no shared source of truth, no activity history, and no automation. A CRM adds all of that: linked records, pipeline stages, ownership, tracking, and reporting. The migration is worth it precisely because a CRM is structurally more than a sheet.` },
      { q: `How do you structure spreadsheet data in a CRM?`, a: `Map columns to objects and fields: company columns become accounts, people become contacts, opportunities become deals, and you link them so relationships exist. Then add stages, ownership, and activity tracking - the structure that turns a flat list into a working system.` },
      { q: `What is the hardest part of leaving spreadsheets?`, a: `Consolidating multiple overlapping sheets into one clean, de-duped source, and deciding how flat columns become linked objects. The data cleanup and structural mapping take more effort than the import itself, but they are what make the CRM actually better than the sheet.` },
    ] },

  { slug: `what-is-a-data-migration-plan`, type: `glossary`, eyebrow: `Data import & migration`,
    title: `What is a data migration plan?`,
    shortAnswer: `A data migration plan is the documented approach for moving data from one system to another: what will migrate, how objects and fields map, how relationships and history transfer, the testing and validation steps, the cutover timing, and rollback if something fails. It turns a risky one-shot move into a tested, reversible, verifiable project.`,
    intro: [`A migration plan is the difference between a controlled move and a hopeful data dump. It writes down every decision before anything moves.`, `Its core purpose is de-risking: testing, validation, and a rollback path so a problem is caught on a subset, not discovered live.`],
    keyPoints: [`Documents scope, field mapping, and how relationships and history transfer.`, `Defines testing, validation, and cutover steps.`, `Includes a rollback path if the migration fails.`, `Turns a one-shot move into a tested, reversible project.`],
    sections: [
      { h: `Why it matters`, body: `Migrations move everything at once, so mistakes are expensive and often surface after cutover. A plan forces the hard decisions - mapping, relationships, validation, rollback - up front, so the actual move is executing a tested procedure rather than improvising.` },
      { h: `How Ardovo handles it`, body: `Ardovo structures migrations with mapping, a validated test run, and preserved relationships, so the plan is built into the tooling. Rook executes the mapping and validation steps, turning the plan into an automated, verifiable process rather than a manual scramble.` },
    ],
    faqs: [
      { q: `What should a data migration plan include?`, a: `Scope (what migrates and what does not), object and field mapping, how relationships and history transfer, testing and validation steps, cutover timing, and a rollback path. Writing these down before moving anything is what turns a risky move into a controlled project.` },
      { q: `Why do migrations need a rollback plan?`, a: `Because a migration moves everything at once and problems can surface after cutover. A rollback path - a clean backup and a way to revert - means a failed or flawed migration is recoverable rather than a disaster, which lets you cut over with confidence.` },
      { q: `Who owns the migration plan?`, a: `Usually a CRM admin or RevOps lead, working with the teams whose data moves. They make the mapping and scope decisions, but the plan should be reviewed by the people who use the data, since they know which relationships and history actually matter.` },
    ] },

  { slug: `how-to-test-a-crm-data-import`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to test a CRM data import`,
    shortAnswer: `Test a CRM data import by loading a small representative sample, then checking that fields mapped correctly, values kept their format, records matched existing ones instead of duplicating, and relationships linked properly. Fix any issue in the mapping or source file, then re-test before the full load. The test is where import problems are cheap to fix.`,
    intro: [`Testing an import is the cheapest insurance in data ops: problems that would corrupt thousands of records show up on a sample of twenty.`, `A good test checks not just that data loaded, but that it loaded correctly - right fields, right formats, right matches, right links.`],
    steps: [
      { h: `Load a representative sample`, body: `Import a small batch that includes the tricky cases - records with special characters, missing fields, likely duplicates - not just the easy ones.` },
      { h: `Check field mapping`, body: `Confirm each value landed in the intended field and picklist values translated correctly, so nothing is silently misplaced.` },
      { h: `Verify matching and relationships`, body: `Check that rows matched existing records instead of duplicating, and that links to accounts and deals formed correctly.`, bullets: [`No duplicates created`, `Relationships linked, not orphaned`, `Formats and picklists preserved`] },
      { h: `Fix and re-test`, body: `Correct the mapping or source file for any problem found, then re-run the test until a sample lands clean before the full load.` },
    ],
    sections: [
      { h: `Test the hard cases, not the easy ones`, body: `A test batch of clean, simple records passes trivially and proves nothing. Include the records most likely to break: special characters, missing fields, duplicates, and complex relationships. If those load correctly, the full import will too.` },
      { h: `How Ardovo helps`, body: `Ardovo previews and validates a test import before committing, flagging mapping mismatches, format problems, and duplicate matches. Rook surfaces exactly what would go wrong, so you fix it on the sample and the full load lands clean.` },
    ],
    faqs: [
      { q: `How big should a test import be?`, a: `Small but representative - a few dozen records that include the hard cases: special characters, missing fields, likely duplicates, and complex relationships. Size matters less than coverage; a test that only includes easy records passes without proving anything.` },
      { q: `What should you check in a test import?`, a: `That fields mapped to the right places, formats and picklist values were preserved, rows matched existing records instead of duplicating, and relationships linked correctly. The test verifies the import loaded correctly, not merely that it loaded.` },
      { q: `What if the test import has problems?`, a: `Fix the root cause in the field mapping or the source file, then re-run the test until a sample lands clean. Never proceed to the full load with known issues - the test exists precisely so those issues are fixed cheaply before scale.` },
    ] },

  { slug: `how-to-plan-a-crm-migration`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to plan a CRM migration`,
    shortAnswer: `Plan a CRM migration by defining scope (what moves and what does not), auditing and cleaning the source, mapping objects and fields to the new model, planning relationship and history transfer, scheduling a tested cutover with a rollback path, and lining up validation and training. The plan front-loads every hard decision so the move itself is executing a tested procedure.`,
    intro: [`The migration itself is a few hours of data transfer; the planning is where success or failure is decided.`, `A good plan resolves scope, mapping, relationships, testing, timing, and rollback before anything moves, so cutover is calm and reversible.`],
    steps: [
      { h: `Define scope`, body: `Decide what migrates and what stays behind. Not every stale record or legacy field is worth moving; a migration is a chance to leave junk behind.` },
      { h: `Audit, clean, and map`, body: `Clean the source first, then map objects and fields - including picklist and custom-field translation - to the new system's model.` },
      { h: `Plan relationships and rollback`, body: `Decide how links and history transfer, schedule the cutover in a low-activity window, and prepare a backup and rollback path.` },
      { h: `Validate and train`, body: `Line up post-migration validation and user training so the team lands ready on a verified database.` },
    ],
    sections: [
      { h: `A migration is a chance to leave junk behind`, body: `Do not reflexively migrate everything. Stale records, unused fields, and dead pipeline are baggage. Scope the migration to what has value, and the new system starts lean and clean instead of inheriting years of accumulated cruft.` },
      { h: `How Ardovo helps`, body: `Ardovo structures the migration with mapping, relationship preservation, and a validated test run, and comes alive with data on day one. Rook handles the mapping and validation busywork, so your plan becomes an automated procedure and the team lands on a clean, connected system.` },
    ],
    faqs: [
      { q: `What decisions come first in a CRM migration plan?`, a: `Scope and cleanup: what data moves, what gets left behind, and cleaning the source before anything transfers. Deciding scope early keeps the migration lean, and cleaning first ensures you build the new system on good data rather than importing old problems.` },
      { q: `Should you migrate all your old data?`, a: `No. A migration is a chance to shed baggage - stale records, unused fields, dead pipeline. Migrate what has value and leave the junk behind, so the new CRM starts clean and lean instead of inheriting years of accumulated cruft.` },
      { q: `When should you schedule the cutover?`, a: `During a low-activity window, after a tested migration has validated cleanly, with a backup and rollback path ready. Cutover should be executing a procedure you have already tested on a subset, not the first time you run the full migration live.` },
    ] },

  { slug: `how-to-avoid-duplicate-imports`, type: `guide`, eyebrow: `Data import & migration`,
    title: `How to avoid duplicate imports`,
    shortAnswer: `Avoid duplicate imports by de-duping the file against existing records and against itself before loading, matching on a strong key like email, choosing update-or-create behavior so matches update instead of duplicate, and testing on a sample. The core rule is match before you load, so an import updates known records rather than blindly creating new ones.`,
    intro: [`Imports are the number-one source of duplicate records: a naive load creates a new record for every row, including people and companies already in the system.`, `Avoiding this is entirely preventable - it just requires matching incoming rows against existing data before, not after, the load.`],
    steps: [
      { h: `De-dupe the file against itself`, body: `Files often contain internal repeats. Collapse duplicates within the file first, so it does not create duplicates on its own.` },
      { h: `Match against existing records`, body: `Compare each row to current records on a strong key like email, so you know which rows are new and which already exist.` },
      { h: `Use update-or-create behavior`, body: `Configure the import to update matched records and only create genuinely new ones, rather than inserting everything as new.` },
      { h: `Test on a sample`, body: `Run a small batch and confirm matches updated instead of duplicated before loading the full file.` },
    ],
    sections: [
      { h: `Match before you load`, body: `The entire trick to avoiding duplicate imports is matching incoming rows to existing records before loading, and choosing update-over-insert for matches. An import that inserts every row is guaranteed to duplicate everyone already in the system. Match first, and duplicates never form.` },
      { h: `How Ardovo helps`, body: `Ardovo matches every import row against existing records and within the file, updating matches instead of creating duplicates, and previews the outcome first. Rook handles the matching automatically, so imports enrich known records rather than flooding the database with copies.` },
    ],
    faqs: [
      { q: `Why do imports create duplicates?`, a: `Because a naive import inserts every row as a new record without checking whether that person or company already exists. Every row for someone already in the system becomes a duplicate. Matching rows against existing data before loading is what prevents it.` },
      { q: `What is update-or-create on import?`, a: `Import behavior that matches each row to existing records and updates the match if found, only creating a new record when there is no match. It is the setting that turns an import from a duplicate factory into a safe way to enrich and add records.` },
      { q: `How do you match import rows to existing records?`, a: `On a strong, unique key - primarily email for contacts, domain for accounts. Matching on these reliably identifies rows that already exist so the import updates them. Weak keys like name alone risk both false matches and missed duplicates.` },
    ] },

  // ===================================================================
  // CLUSTER E - Field mapping / required fields / custom fields
  // ===================================================================
  { slug: `what-is-field-mapping`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is field mapping?`,
    shortAnswer: `Field mapping is defining how each field in a source - a file, another CRM, or an integration - corresponds to a field in the destination, so data lands in the right place. It includes translating value formats and picklist options between systems. Correct field mapping is what makes an import or integration load clean, usable data instead of misplaced values.`,
    intro: [`Field mapping is the translation layer between two systems that name and structure their data differently.`, `It is where imports and integrations succeed or fail: a wrong mapping silently puts the right data in the wrong field.`],
    keyPoints: [`Defines how source fields correspond to destination fields.`, `Includes translating value formats and picklist options.`, `Central to imports, migrations, and integrations.`, `A wrong mapping misplaces data silently, without an error.`],
    sections: [
      { h: `Why it matters`, body: `A mapping mistake does not throw an error - it just loads phone numbers into a notes field or one picklist value as another. Because it fails silently, bad mapping corrupts data invisibly, which is why testing a mapping on a sample matters so much.` },
      { h: `How Ardovo handles it`, body: `Ardovo auto-maps common fields and lets you adjust the rest, translating picklist values between systems, and previews the result before committing. Rook flags likely mismaps on a test batch, so data lands where it belongs instead of failing silently.` },
    ],
    faqs: [
      { q: `Why is field mapping important?`, a: `Because it determines whether data lands in the right place. A wrong mapping fails silently - no error, just values in the wrong field or picklist options that did not translate. Since the failure is invisible, correct mapping and a test are what keep imports and integrations clean.` },
      { q: `What does field mapping include besides matching field names?`, a: `Translating value formats and picklist options between systems. Two CRMs might both have a "stage" field but use different stage names, or format dates and phones differently. Good mapping handles the value translation, not just the field-name pairing.` },
      { q: `How do you check a field mapping is correct?`, a: `Test it on a small sample and verify each value landed in the intended field with its format and picklist value preserved. Because mapping errors are silent, a test is the only reliable way to catch them before they corrupt the full load.` },
    ] },

  { slug: `how-to-map-fields-during-import`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to map fields during an import`,
    shortAnswer: `Map fields during an import by matching each source column to the correct CRM field, translating picklist values to the CRM's accepted options, handling fields that need to be split or combined, deciding where unmapped columns go, and testing the mapping on a sample. Verify the mapping on a test batch, because mapping errors load silently without any error.`,
    intro: [`Mapping is the step where you tell the import which column goes where. It looks mechanical but is where most silent import errors originate.`, `Careful mapping plus a test batch is the whole difference between a clean load and thousands of misplaced values.`],
    steps: [
      { h: `Match columns to fields`, body: `Pair each source column with the correct destination field, watching for near-matches that are actually different (billing vs shipping address).` },
      { h: `Translate picklist values`, body: `Convert the source's picklist values to the CRM's accepted options, so "Closed Won" maps to your equivalent stage rather than failing.` },
      { h: `Handle splits and combines`, body: `Split combined fields (full name into first and last) or combine as needed so values land in the CRM's structure.` },
      { h: `Decide on unmapped columns`, body: `Choose whether to ignore, store, or create a field for columns with no obvious home, rather than dropping data silently.` },
      { h: `Test the mapping`, body: `Run a sample and verify each value landed correctly before the full load.` },
    ],
    sections: [
      { h: `Watch for near-match fields`, body: `The subtle mapping trap is fields that look like matches but are not: billing versus shipping address, company name versus account name, created date versus close date. These map cleanly by name but load wrong data. Read field meanings, not just labels.` },
      { h: `How Ardovo helps`, body: `Ardovo auto-maps obvious columns, prompts you on ambiguous ones, and translates picklist values between systems. Rook previews the mapped result on a sample and flags near-match mistakes, so values land in the field you actually meant.` },
    ],
    faqs: [
      { q: `What is the hardest part of field mapping?`, a: `Near-match fields that look like a clean pairing but mean different things - billing versus shipping address, company versus account name, created versus close date. They map by label but load wrong data. Reading what each field means, not just its name, is what avoids this.` },
      { q: `How do you map picklist values on import?`, a: `Translate each source value to the CRM's accepted option, so the source's stage or status names map to your equivalents. Unmapped picklist values either fail or land as blanks, so the value translation matters as much as pairing the fields.` },
      { q: `What do you do with columns that do not match a field?`, a: `Decide deliberately: ignore them, store them in a notes or custom field, or create a new field if the data matters. The mistake is letting unmapped columns silently drop - if the data is worth importing, give it a home.` },
    ] },

  { slug: `how-to-set-up-required-fields`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to set up required fields`,
    shortAnswer: `Set up required fields by making mandatory only the few fields that truly drive routing, scoring, and outreach - like email, company, and owner - keeping the list short, and filling machine-knowable fields through enrichment instead of requiring them. Too many required fields breed garbage data as reps type anything to escape the form, so require sparingly.`,
    intro: [`Required fields are a blunt instrument: they guarantee a field is filled, but they cannot guarantee it is filled honestly.`, `The skill is requiring just enough to keep records usable without creating a form so long that reps game it with junk.`],
    steps: [
      { h: `Identify the truly critical fields`, body: `List the few fields that break something downstream when empty: email, company, owner, and stage. These are the candidates for required.` },
      { h: `Keep the required list short`, body: `Require only those critical fields. Every additional required field raises friction and the odds reps enter garbage to get past it.` },
      { h: `Enrich instead of requiring`, body: `For machine-knowable fields like industry and size, enrich automatically rather than requiring reps to fill them.` },
      { h: `Require judgment fields at the right stage`, body: `Make a field like next step required to advance a stage, not at creation, so it is asked when the rep actually knows it.` },
    ],
    sections: [
      { h: `Too many required fields backfire`, body: `A twelve-field required form does not produce complete data - it produces reps typing "x" and "n/a" to escape. Requiring fewer, truly critical fields, and enriching the rest, yields cleaner data than a long mandatory form that everyone games.` },
      { h: `How Ardovo helps`, body: `Ardovo keeps the required list short by enriching machine-knowable fields automatically, so reps are only asked for what truly needs a human. Rook fills the rest and prompts for judgment fields at the right stage, so required fields protect quality without breeding junk.` },
    ],
    faqs: [
      { q: `How many fields should be required in a CRM?`, a: `As few as possible - just the fields that break routing, scoring, or outreach when empty, typically email, company, owner, and stage. Every extra required field raises friction and the risk reps enter garbage to get past the form. Require sparingly.` },
      { q: `Why can too many required fields hurt data quality?`, a: `Because reps facing a long mandatory form type "x" or "n/a" to escape it, producing filled-but-worthless fields. That is worse than an empty field, which at least honestly signals missing data. Fewer required fields plus enrichment yields cleaner data.` },
      { q: `Should machine-knowable fields be required?`, a: `No - enrich them instead. Requiring reps to fill industry, company size, or location wastes selling time on data a provider already has and produces inconsistent values. Reserve required status for judgment fields no external source knows.` },
    ] },

  { slug: `what-is-a-required-field`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is a required field?`,
    shortAnswer: `A required field is a CRM field that must be filled before a record can be saved or advanced to the next stage. Required fields enforce completeness on the data that matters most. Used sparingly they keep records usable; overused they backfire, because reps enter junk values to get past a form that demands too much.`,
    intro: [`Required fields are the simplest data-quality control: no value, no save. They guarantee presence, though not accuracy.`, `Their power and their danger are the same - they force entry, which produces either useful data or garbage depending on how sparingly they are used.`],
    keyPoints: [`A field that must be filled before saving or advancing a record.`, `Enforces completeness on the most critical data.`, `Best applied to a few truly essential fields only.`, `Overuse breeds garbage values as reps bypass the form.`],
    sections: [
      { h: `Why it matters`, body: `Required fields decide whether records arrive usable. The right few keep every record routable and scoreable; too many turn the form into an obstacle reps defeat with junk. Restraint is what makes them work.` },
      { h: `How Ardovo handles it`, body: `Ardovo keeps required fields minimal by enriching machine-knowable data automatically, so reps are asked only for the judgment fields that genuinely need a human. Rook fills the rest, so completeness comes from enrichment rather than a long mandatory form.` },
    ],
    faqs: [
      { q: `When should a field be required?`, a: `When an empty value breaks something downstream - routing, scoring, or outreach - and only a human can supply it. Email, company, owner, and stage are common examples. If a provider can fill the field, enrich it instead of requiring it.` },
      { q: `Can you require a field only at certain stages?`, a: `Yes, and it is often better. Requiring a field like next step to advance a stage, rather than at creation, asks for it when the rep actually knows the answer. Stage-based requirements gather judgment data at the right moment instead of upfront.` },
      { q: `Why do overused required fields cause bad data?`, a: `Because a form demanding too many fields pushes reps to enter placeholder junk like "x" or "n/a" to save the record. Those filled-but-meaningless values are worse than honest blanks, so requiring too much actively degrades data quality.` },
    ] },

  { slug: `how-to-create-custom-fields`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to create custom fields`,
    shortAnswer: `Create custom fields by first confirming the data is not already captured, defining exactly what the field means and who fills it, choosing the right type (picklist over free text where possible), placing it on the correct object, and documenting it. Add custom fields deliberately, because every unused or vague field is clutter that degrades the whole data model.`,
    intro: [`Custom fields let you capture what your business specifically needs, but they multiply quietly until a form has eighty fields nobody fills.`, `The discipline is adding fields deliberately - each with a clear purpose, owner, and type - so the data model stays lean and usable.`],
    steps: [
      { h: `Confirm it is not already captured`, body: `Check whether an existing field already holds this data. Duplicate fields for the same concept fragment data and confuse reps.` },
      { h: `Define meaning and owner`, body: `Write down exactly what the field captures and who fills it, so it is used consistently rather than interpreted five ways.` },
      { h: `Choose the right type`, body: `Prefer picklists over free text wherever values are finite, so the field stays standardized and filterable.` },
      { h: `Place it and document it`, body: `Put the field on the correct object, and record its purpose so future admins know why it exists.` },
    ],
    sections: [
      { h: `Every field is a liability until it earns its place`, body: `Custom fields are easy to add and hard to remove, so they accumulate into bloated, half-empty forms. Add each one only when the data is genuinely needed, not already captured, and clearly owned. A lean, well-defined field set beats a sprawling one every time.` },
      { h: `How Ardovo helps`, body: `Ardovo makes custom fields easy to add with the right type and placement, and flags redundant or unused fields so the model stays lean. Rook enriches machine-knowable fields, so you add custom fields only for the judgment data your business genuinely needs.` },
    ],
    faqs: [
      { q: `When should you create a custom field?`, a: `When you genuinely need to capture data no existing field holds, the data drives a decision or workflow, and someone clearly owns filling it. If none of those are true, the field will sit empty and add clutter, so skip it.` },
      { q: `Should custom fields be picklists or free text?`, a: `Picklists wherever the valid values are finite, so the field stays standardized and filterable. Free text invites inconsistency that breaks segmentation and reporting. Reserve free text for genuinely open-ended notes, not for data you will filter or report on.` },
      { q: `How do you avoid custom field bloat?`, a: `Add fields deliberately, each with a clear purpose and owner, check that the data is not already captured, and periodically remove unused ones. A model with fifty empty custom fields is worse than a lean one, because clutter hides the fields that matter.` },
    ] },

  { slug: `what-is-a-custom-field`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is a custom field?`,
    shortAnswer: `A custom field is a field you add to a CRM object to capture data specific to your business that the default fields do not cover. Custom fields tailor the CRM to how you actually sell, but each one adds complexity, so they should be added deliberately, well-defined, and removed when unused to keep the data model lean.`,
    intro: [`Custom fields are how a generic CRM becomes yours - capturing the specific attributes your business tracks that no standard field anticipates.`, `They are powerful and dangerous in the same way: easy to add, and prone to multiplying into bloat that buries the fields that matter.`],
    keyPoints: [`A user-added field for business-specific data beyond the defaults.`, `Tailors the CRM to how a specific team sells.`, `Each field adds complexity and maintenance cost.`, `Best kept lean, well-defined, and pruned of unused fields.`],
    sections: [
      { h: `Why it matters`, body: `Custom fields determine how well the CRM fits your business, but unchecked they become clutter - dozens of half-empty fields that slow reps and hide the important data. The value is in a lean, deliberate set, not in how many you can add.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports custom fields with the right types and placement, and surfaces unused or redundant ones so the model stays lean. Rook enriches machine-knowable data, so custom fields are reserved for the judgment data unique to your business.` },
    ],
    faqs: [
      { q: `What is the difference between a standard and a custom field?`, a: `Standard fields ship with the CRM and cover common data like name, email, and stage. Custom fields are ones you add for business-specific data the defaults do not capture. Standard fields make the CRM work; custom fields make it fit your specific way of selling.` },
      { q: `Do too many custom fields cause problems?`, a: `Yes. Every custom field adds form length, maintenance, and cognitive load, and unused ones bury the fields that matter. A bloated model of half-empty custom fields is worse than a lean one, so add deliberately and prune what goes unused.` },
      { q: `What type should a custom field be?`, a: `Match the type to the data: picklists for finite values so they stay standardized and filterable, numbers for quantities, dates for dates, and free text only for genuinely open-ended notes. The right type keeps the field clean and useful for reporting.` },
    ] },

  { slug: `how-to-choose-crm-fields`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to choose which CRM fields to use`,
    shortAnswer: `Choose CRM fields by starting from the decisions and workflows you need to support, keeping only fields that drive an action, report, or automation, preferring enrichment over rep entry for machine-knowable data, and pruning fields nobody fills. A lean, purposeful field set beats a comprehensive one, because every unused field is friction that hides the data that matters.`,
    intro: [`The temptation is to capture everything "just in case." That path leads to eighty-field forms reps ignore and data nobody trusts.`, `The better approach works backward from decisions: a field earns its place only if some action, report, or automation depends on it.`],
    steps: [
      { h: `Start from decisions and workflows`, body: `List what you route, score, report, and automate on. Those needs define which fields are worth capturing.` },
      { h: `Keep only fields that drive something`, body: `If no action, report, or automation uses a field, it is clutter. Cut fields that exist only "just in case."` },
      { h: `Prefer enrichment over entry`, body: `For machine-knowable fields, enrich rather than asking reps, so the field set that reps actually fill stays small.` },
      { h: `Prune what goes unused`, body: `Periodically review field usage and remove fields that sit empty, so the model stays lean over time.` },
    ],
    sections: [
      { h: `Work backward from what you act on`, body: `The right question is not "what could we capture?" but "what do we act on?" Every field should trace to a routing rule, a report, or an automation. Fields with no downstream use are pure cost - form length, maintenance, and noise - with no benefit.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches machine-knowable fields and flags unused ones, so the fields reps fill map to real decisions. Rook keeps the model lean by filling what it can and surfacing clutter, so your field set stays purposeful instead of sprawling.` },
    ],
    faqs: [
      { q: `How do you decide which CRM fields to keep?`, a: `Work backward from decisions: keep a field only if some routing rule, report, or automation depends on it. Fields captured "just in case" with no downstream use are clutter. If nothing acts on a field, it costs form length and trust while adding no value.` },
      { q: `Is more CRM data always better?`, a: `No. Beyond the fields you act on, more data means longer forms, more maintenance, and more empty fields that hide the important ones. A lean, purposeful field set that reps actually fill is more valuable than a comprehensive one they ignore.` },
      { q: `How often should you review CRM fields?`, a: `Periodically - a quick review each quarter or two to prune fields that sit unused and confirm the ones that remain still drive decisions. Field sets sprawl over time as people add "just in case" fields, so occasional pruning keeps the model lean.` },
    ] },

  { slug: `what-is-a-picklist`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is a picklist?`,
    shortAnswer: `A picklist is a CRM field that limits input to a defined set of options rather than free text, so users choose a value instead of typing one. Picklists keep data standardized and filterable by making inconsistent values impossible to enter. They are the primary tool for keeping fields like industry, stage, and status clean and reportable.`,
    intro: [`A picklist trades flexibility for consistency: you cannot enter just anything, which is exactly the point.`, `It is the simplest and most effective standardization tool a CRM offers, preventing the variant-spelling mess that free text invites.`],
    keyPoints: [`Restricts a field to a defined set of options.`, `Prevents inconsistent values by design.`, `Keeps fields filterable, segmentable, and reportable.`, `Best for any field with a finite, known set of valid values.`],
    sections: [
      { h: `Why it matters`, body: `Filtering, segmentation, and reporting all match on exact values. A free-text field scatters the same concept across variant spellings and breaks every one of them. A picklist guarantees consistency, which is why it is the default choice for any finite-value field.` },
      { h: `How Ardovo handles it`, body: `Ardovo uses picklists for the fields that need standardizing, so values stay consistent and reportable by design. Rook normalizes any legacy free-text values into the picklist options, so segments and reports operate on clean, matchable data.` },
    ],
    faqs: [
      { q: `When should a field be a picklist instead of free text?`, a: `Whenever the valid values are finite and you filter, segment, or report on the field - industry, stage, status, lead source, region. A picklist keeps those consistent by design. Reserve free text for genuinely open-ended data like notes that you do not filter on.` },
      { q: `What is the benefit of a picklist?`, a: `Consistency. Because users choose from defined options rather than typing, the same value is always represented the same way, which keeps filtering, segmentation, and reporting accurate. It is the simplest tool for preventing the variant-spelling mess free text creates.` },
      { q: `What is the downside of picklists?`, a: `They require maintaining the option set, and too many options or missing ones frustrate users. If the valid values genuinely are not finite or change constantly, a picklist can be limiting - but for most standardizable fields, the consistency is well worth it.` },
    ] },

  { slug: `how-to-standardize-picklist-values`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to standardize picklist values`,
    shortAnswer: `Standardize picklist values by auditing existing values for duplicates and near-duplicates, consolidating them into a clean canonical set, mapping legacy free-text and variant entries onto the standard options, and controlling who can add new values so the list does not sprawl again. A tight, governed picklist keeps segmentation and reporting accurate.`,
    intro: [`Picklists drift: over time they accumulate near-duplicate options ("Tech", "Technology", "Software/Tech") that fragment the very data they were meant to standardize.`, `Standardizing means consolidating to a clean set and governing additions, so the list stays tight instead of sprawling.`],
    steps: [
      { h: `Audit the current values`, body: `List every option and its usage, spotting duplicates, near-duplicates, and options nobody selects.` },
      { h: `Consolidate to a canonical set`, body: `Merge overlapping options into a single clean value each, and remove dead options, to get a tight, meaningful list.` },
      { h: `Map legacy values onto the standard`, body: `Reassign records on old or variant values to the canonical options, so historical data matches the new set.` },
      { h: `Govern new additions`, body: `Control who can add picklist values, so the list does not sprawl back into near-duplicates over time.` },
    ],
    sections: [
      { h: `Govern additions or the list re-sprawls`, body: `Standardizing a picklist once does nothing if anyone can add "Tech" back next to "Technology." The lasting fix is governance: restrict who adds options and require they check for an existing match first. A governed picklist stays clean; an open one drifts right back.` },
      { h: `How Ardovo helps`, body: `Ardovo keeps picklists tight by consolidating near-duplicate values and mapping legacy entries to the canonical set. Rook governs additions and normalizes stray values, so the option list stays clean and segmentation and reporting keep matching correctly.` },
    ],
    faqs: [
      { q: `Why do picklists get messy over time?`, a: `Because people add near-duplicate options - "Tech" next to "Technology" next to "Software/Tech" - fragmenting the data the picklist was meant to standardize. Without governance on who can add values, the list sprawls into overlapping options that break segmentation.` },
      { q: `How do you consolidate picklist values?`, a: `Audit all options and their usage, merge overlapping ones into a single canonical value each, remove dead options, then reassign records on the old values to the standard set. The result is a tight, meaningful list where each option means one distinct thing.` },
      { q: `How do you keep a picklist clean after standardizing?`, a: `Govern additions: restrict who can add options and require checking for an existing match first. Standardizing once without governance just lets the near-duplicates creep back. Controlled additions are what keep the list tight long-term.` },
    ] },

  { slug: `what-is-a-field-validation-rule`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is a field validation rule?`,
    shortAnswer: `A field validation rule is a condition a value must satisfy before a record can be saved, such as a properly formatted email, a phone with enough digits, or a close date not in the past. Validation rules catch bad data at entry, enforcing quality at the source rather than requiring cleanup later.`,
    intro: [`Validation rules are the CRM's guardrails, rejecting values that fail a defined test before they ever save.`, `They are prevention in its purest form: a rule that blocks a bad value costs nothing downstream, unlike the cleanup that value would otherwise require.`],
    keyPoints: [`A condition a value must meet before a record saves.`, `Enforces format, range, and logical consistency at entry.`, `Prevents bad data rather than cleaning it later.`, `Should target the fields that matter, to avoid excess friction.`],
    sections: [
      { h: `Why it matters`, body: `Catching a malformed email or an impossible date at entry is far cheaper than discovering it when a campaign bounces or a report breaks. Validation rules move quality control to the source, which is the highest-leverage place to enforce it.` },
      { h: `How Ardovo handles it`, body: `Ardovo validates key fields at entry by default - formats, ranges, and logical checks - so bad values are caught before they save. Rook keeps the rules focused on fields that matter, so validation protects quality without turning entry into a fight.` },
    ],
    faqs: [
      { q: `What can a validation rule check?`, a: `Format (a well-formed email or URL), range (a positive amount, a future close date), and logical consistency (a stage that matches a status). Anything expressible as a pass-or-fail condition on a value can be a validation rule enforced at save time.` },
      { q: `What is the difference between a required field and a validation rule?`, a: `A required field enforces that a value is present. A validation rule enforces that the value present is valid - correctly formatted or logically consistent. They complement each other: required ensures presence, validation ensures correctness.` },
      { q: `Can validation rules be too strict?`, a: `Yes. Overly aggressive rules block legitimate values and frustrate users into workarounds. Target validation at the fields where correctness genuinely matters, and make the rules match real-world valid values, so they catch errors without blocking good data.` },
    ] },

  { slug: `how-to-set-up-field-validation`, type: `guide`, eyebrow: `Fields & data model`,
    title: `How to set up field validation`,
    shortAnswer: `Set up field validation by identifying the fields where bad values cause real problems, writing rules for format, range, and logical consistency, testing them against real data so they do not block legitimate entries, and pairing validation with clear error messages. Validate the fields that matter, and make rules match real-world valid values to avoid frustrating users.`,
    intro: [`Field validation enforces correctness at entry, but a badly tuned rule blocks good data and teaches reps to resent the system.`, `The goal is rules that catch genuine errors while never rejecting a legitimate value, paired with messages that explain the fix.`],
    steps: [
      { h: `Target high-impact fields`, body: `Validate the fields where a bad value causes real downstream harm: email, phone, amount, close date. Skip low-stakes fields.` },
      { h: `Write format, range, and logic rules`, body: `Add checks for correct formats, sensible ranges, and logical consistency between related fields.` },
      { h: `Test against real data`, body: `Run rules against actual records to confirm they do not reject legitimate values, since real data is messier than examples.` },
      { h: `Pair with clear error messages`, body: `Tell the user exactly what is wrong and how to fix it, so validation guides rather than just blocks.` },
    ],
    sections: [
      { h: `Test rules against messy real data`, body: `A validation rule that looks right on clean examples often rejects legitimate real-world values - international phone formats, valid but unusual emails. Test every rule against actual data before turning it on, or you will block good entries and train reps to work around the system.` },
      { h: `How Ardovo helps`, body: `Ardovo validates key fields with sensible defaults tuned to real-world values, and clear inline messages. Rook keeps validation focused where correctness matters, so rules catch genuine errors without rejecting the messy-but-valid data that trips up naive validation.` },
    ],
    faqs: [
      { q: `Which fields need validation rules?`, a: `The ones where a bad value causes real harm: email and phone for deliverability, amount and close date for forecasting, and any field where a wrong format breaks a downstream system. Low-stakes fields rarely need validation and adding it just creates friction.` },
      { q: `How do you avoid validation rules blocking good data?`, a: `Test every rule against real, messy data before enabling it. Rules that look correct on clean examples often reject legitimate values like international phone formats or unusual-but-valid emails. Testing against actual records catches these before they frustrate users.` },
      { q: `Should validation rules have error messages?`, a: `Yes. A rule that blocks a save without explaining why just frustrates users. A clear message stating what is wrong and how to fix it turns validation from an obstacle into guidance, so reps correct the value rather than fighting the system.` },
    ] },

  // ===================================================================
  // CLUSTER F - Contact vs account vs lead / account hierarchy
  // ===================================================================
  { slug: `contact-vs-account-vs-lead`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `Contact vs account vs lead: what is the difference?`,
    shortAnswer: `A lead is an unqualified individual who showed interest, a contact is a qualified person you have a relationship with, and an account is the company those contacts belong to. Leads convert into contacts, contacts link to accounts, and accounts hold the deals. Understanding the three is the foundation of a well-structured CRM.`,
    intro: [`These three objects are the backbone of every CRM, and confusing them is a common source of messy data and broken reporting.`, `The clean mental model: accounts are companies, contacts are people at those companies, and leads are people not yet qualified into that structure.`],
    keyPoints: [`Lead: an unqualified individual who expressed interest.`, `Contact: a qualified person you have a real relationship with.`, `Account: the company that contacts belong to and deals attach to.`, `Leads convert into contacts; contacts link to accounts.`],
    sections: [
      { h: `Why it matters`, body: `Using the wrong object scrambles reporting and routing. Treating companies as contacts loses the account structure; never converting leads clogs the pipeline with unqualified noise. A clear model keeps data clean and reports meaningful.` },
      { h: `How Ardovo handles it`, body: `Ardovo ships leads, contacts, and accounts as distinct, properly linked objects, so the structure is right by default. Rook converts qualified leads into contacts, links them to the correct account, and keeps the relationships clean without manual bookkeeping.` },
    ],
    faqs: [
      { q: `What is the difference between a lead and a contact?`, a: `A lead is an unqualified individual who expressed interest but has not been vetted. A contact is a qualified person you have an established relationship with, usually linked to an account. Leads convert into contacts once qualified, moving from raw interest into your relationship structure.` },
      { q: `What is the difference between a contact and an account?`, a: `A contact is a person; an account is the company they work for. An account can hold many contacts, and deals attach to the account. The account is the company-level record that gathers all its people, deals, and history in one place.` },
      { q: `When does a lead become a contact?`, a: `When it is qualified - vetted for fit and genuine interest - it converts into a contact, typically linked to an account and often an opportunity. Converting only qualified leads keeps contacts meaningful and the pipeline free of unvetted noise.` },
    ] },

  { slug: `what-is-an-account-in-a-crm`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `What is an account in a CRM?`,
    shortAnswer: `An account in a CRM is the record representing a company you sell to or work with. It gathers all the contacts at that company, the deals in progress, the activity history, and firmographic data in one place. The account is the company-level source of truth that ties a customer relationship together across many people and deals.`,
    intro: [`The account is the CRM's model of a company - the hub that everything about that customer connects to.`, `It is what lets you see a whole relationship at once, rather than a scattering of disconnected people and deals.`],
    keyPoints: [`Represents a company you sell to or work with.`, `Gathers contacts, deals, activity, and firmographics in one place.`, `The company-level source of truth for a relationship.`, `Deals and hierarchies attach at the account level.`],
    sections: [
      { h: `Why it matters`, body: `B2B selling is to companies, not just people. The account is where you see every contact, deal, and interaction for a customer together, which is essential for coordinated selling, account planning, and understanding the full relationship.` },
      { h: `How Ardovo handles it`, body: `Ardovo's account object gathers contacts, deals, activity, and enriched firmographics, and supports hierarchies for complex organizations. Rook keeps the account complete and current, so the whole relationship is visible in one place.` },
    ],
    faqs: [
      { q: `What is the difference between an account and a contact?`, a: `An account is a company; a contact is a person at that company. One account holds many contacts. Deals and firmographic data live at the account level, while contacts hold the individual people's details and roles within it.` },
      { q: `Why are accounts important in B2B CRM?`, a: `Because B2B deals involve companies with multiple stakeholders. The account gathers every contact, deal, and interaction for a customer in one place, enabling coordinated selling and account planning. Without it, you have scattered people and deals with no company-level view.` },
      { q: `Can an account have multiple deals?`, a: `Yes. An account can have many open and closed deals over time - new business, expansions, and renewals - all attached to the same company record. This is how the account serves as the running history of an entire customer relationship.` },
    ] },

  { slug: `what-is-a-contact-in-a-crm`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `What is a contact in a CRM?`,
    shortAnswer: `A contact in a CRM is the record for an individual person you have a relationship with, holding their name, role, contact details, and activity history. Contacts link to the account they work for and to the deals they are involved in. The contact is the people-level record that captures who you are actually talking to.`,
    intro: [`If the account is the company, the contact is the person - the human you email, call, and build a relationship with.`, `Contacts are where the interpersonal side of selling lives: roles, history, and the buying committee that actually makes decisions.`],
    keyPoints: [`Represents an individual person you have a relationship with.`, `Holds role, contact details, and activity history.`, `Links to an account and to deals.`, `Together, contacts on an account form the buying committee.`],
    sections: [
      { h: `Why it matters`, body: `Deals are won by people, not companies. Contacts capture who those people are, their role in the decision, and your history with them - the information that lets reps multithread and reach the real decision-makers.` },
      { h: `How Ardovo handles it`, body: `Ardovo links contacts to their account and the deals they touch, and enriches their role and details. Rook keeps contact data current, logs activity automatically, and maps the buying committee, so reps always know who they are working and where each person stands.` },
    ],
    faqs: [
      { q: `What is the difference between a lead and a contact?`, a: `A lead is an unqualified individual who showed interest; a contact is a qualified person you have an established relationship with, usually linked to an account. Leads convert into contacts once vetted, so a contact represents a real, working relationship rather than raw interest.` },
      { q: `Can a contact belong to more than one account?`, a: `Usually a contact is linked to one primary account, their employer. Some CRMs support related or secondary account links for people who influence deals across companies, but the primary relationship is one contact to one account for clean structure.` },
      { q: `What information does a contact record hold?`, a: `Name, title and role, contact details like email and phone, the linked account, associated deals, and the full activity history of interactions. Together this captures who the person is, their part in the buying decision, and your relationship with them.` },
    ] },

  { slug: `what-is-a-lead-in-a-crm`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `What is a lead in a CRM?`,
    shortAnswer: `A lead in a CRM is an unqualified individual who has shown some interest but has not yet been vetted for fit or genuine intent. Leads are the top of the funnel - raw interest that gets qualified, scored, and routed. Qualified leads convert into contacts and opportunities; unqualified ones are nurtured or disqualified.`,
    intro: [`A lead is potential, not yet proven: someone who filled a form, downloaded content, or was sourced, but has not been confirmed as a real prospect.`, `Keeping leads separate from contacts protects your relationship data from unvetted noise while the qualification work happens.`],
    keyPoints: [`An unqualified individual who has shown interest.`, `The top of the funnel, before qualification.`, `Gets scored, routed, and either converted or disqualified.`, `Kept separate from contacts to protect relationship data.`],
    sections: [
      { h: `Why it matters`, body: `Leads are where volume enters and where qualification filters it. Treating every lead as a contact pollutes your relationship data with unvetted noise; a proper lead stage lets you score, route, and qualify before anyone becomes part of the trusted contact base.` },
      { h: `How Ardovo handles it`, body: `Ardovo captures, enriches, scores, and routes leads, then converts the qualified ones into contacts linked to accounts. Rook handles the qualification busywork - scoring fit, routing to the right rep, flagging the leads worth working - so reps focus on real prospects.` },
    ],
    faqs: [
      { q: `What makes someone a lead versus a contact?`, a: `A lead is unqualified - they showed interest but have not been vetted for fit or genuine intent. A contact is qualified and part of your relationship structure, linked to an account. The qualification step is what converts a lead into a contact.` },
      { q: `What happens to a lead in a CRM?`, a: `It gets enriched, scored for fit and engagement, and routed to a rep. Qualified leads convert into contacts and opportunities; unqualified ones are nurtured until they are ready or disqualified. The lead stage exists to filter raw interest before it enters your contact base.` },
      { q: `Should you keep leads and contacts separate?`, a: `Yes. Separating them keeps unvetted interest from polluting your trusted relationship data. Leads can be noisy and low-quality; converting only qualified ones into contacts means your contact base stays meaningful and your reports on real relationships stay accurate.` },
    ] },

  { slug: `what-is-account-hierarchy`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `What is account hierarchy?`,
    shortAnswer: `Account hierarchy is the parent-child structure that links related company records, such as a corporate parent with its subsidiaries, divisions, or regional offices. It lets you see the whole organization and roll up deals and revenue across it, while still working each entity separately. Hierarchy is essential for selling into large, multi-entity companies.`,
    intro: [`Big organizations are not single accounts - they are parents, subsidiaries, and divisions that relate to each other.`, `Account hierarchy models that structure, so you can both work each entity and see the whole enterprise's revenue and relationships together.`],
    keyPoints: [`Links related company records in a parent-child structure.`, `Models corporate parents, subsidiaries, divisions, and offices.`, `Lets you roll up deals and revenue across the whole organization.`, `Essential for selling into large, multi-entity accounts.`],
    sections: [
      { h: `Why it matters`, body: `Without hierarchy, a global customer looks like a dozen disconnected accounts, hiding the true size and structure of the relationship. Hierarchy reveals the whole organization, enabling enterprise account planning and accurate revenue rollups across every entity.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports account hierarchies, linking parents to subsidiaries and rolling up deals and revenue across the tree. Rook keeps the structure accurate and distinguishes true hierarchy relationships from duplicates, so large accounts are seen whole rather than fragmented.` },
    ],
    faqs: [
      { q: `Why is account hierarchy important?`, a: `Because large customers are multi-entity organizations - parents, subsidiaries, divisions. Without hierarchy they appear as disconnected accounts, hiding the relationship's true size. Hierarchy lets you see the whole organization and roll up deals and revenue across it for real enterprise account planning.` },
      { q: `What is a parent-child account relationship?`, a: `A link where one account (the parent) sits above related accounts (the children), such as a corporate headquarters over its regional offices or subsidiaries. The children remain separate workable records, but the hierarchy connects them so you can view and report on the whole tree.` },
      { q: `How is hierarchy different from a duplicate?`, a: `A hierarchy links distinct but related entities that should stay separate; duplicates are two records for the same entity that should merge. Confusing them is a costly mistake - merging a subsidiary into its parent destroys a real relationship. Confirm which case you have before acting.` },
    ] },

  { slug: `how-to-set-up-account-hierarchy`, type: `guide`, eyebrow: `Records & relationships`,
    title: `How to set up account hierarchy`,
    shortAnswer: `Set up account hierarchy by identifying the parent organizations and their subsidiaries or divisions, creating a parent-child link between the related accounts, deciding how deals and revenue roll up, and distinguishing true hierarchy relationships from duplicates. Model the real corporate structure so large accounts are seen whole while each entity stays workable.`,
    intro: [`Setting up hierarchy is mapping the real corporate structure of your larger customers into linked account records.`, `The care goes into getting the relationships right - true parent-child versus duplicate - and deciding how rollups work.`],
    steps: [
      { h: `Identify parents and children`, body: `Determine which accounts are corporate parents and which are their subsidiaries, divisions, or regional offices.` },
      { h: `Link them in a parent-child structure`, body: `Create the hierarchy relationships so each child points to its parent and the whole tree is connected.` },
      { h: `Decide how rollups work`, body: `Choose how deals and revenue aggregate up the hierarchy, so leaders can see enterprise-wide totals as well as per-entity numbers.` },
      { h: `Separate hierarchy from duplicates`, body: `Confirm that similar-named related accounts are genuine distinct entities to link, not duplicates to merge.` },
    ],
    sections: [
      { h: `Do not merge what you should link`, body: `The central hierarchy mistake is merging a subsidiary into its parent because the names match. They are distinct entities that should be linked, not one record. Before merging any similar accounts, confirm whether they are duplicates or a real hierarchy - the wrong call loses a relationship.` },
      { h: `How Ardovo helps`, body: `Ardovo links parent and child accounts, rolls up deals and revenue across the tree, and distinguishes hierarchy relationships from duplicates. Rook maintains the structure as the organization changes, so enterprise accounts stay accurately modeled and seen whole.` },
    ],
    faqs: [
      { q: `How do you decide the parent account?`, a: `The parent is the top corporate entity - usually the headquarters or holding company - with subsidiaries, divisions, and regional offices as children beneath it. Model the real legal and organizational structure so rollups reflect how the company is actually arranged.` },
      { q: `Should related accounts be linked or merged?`, a: `Linked, if they are distinct entities like a parent and its subsidiary. Merge only true duplicates - two records for the same entity. Merging related-but-distinct accounts destroys a real business relationship, so confirm which case you have before acting.` },
      { q: `How do deals roll up in an account hierarchy?`, a: `Deals attach to their specific entity, and the hierarchy aggregates them upward so you can see totals for a single subsidiary or the whole organization. This dual view - per-entity and enterprise-wide - is the main reason to model hierarchy for large accounts.` },
    ] },

  { slug: `how-to-link-contacts-to-accounts`, type: `guide`, eyebrow: `Records & relationships`,
    title: `How to link contacts to accounts`,
    shortAnswer: `Link contacts to accounts by matching each contact to its company - most reliably through the email domain - creating the relationship so the contact appears under the account, and keeping company data on the account rather than copied onto each contact. Proper linking is what turns scattered people into a coherent view of who you know at each company.`,
    intro: [`A contact with no account is an orphan - a person floating with no company context. Linking them is basic CRM hygiene that many databases neglect.`, `The email domain is the workhorse here: it reliably maps people to their employer, powering both linking and lead-to-account matching.`],
    steps: [
      { h: `Match contacts by email domain`, body: `Use the email domain to identify each contact's company and find or create the matching account.` },
      { h: `Create the relationship`, body: `Link the contact to the account so the person appears under the company and inherits its context.` },
      { h: `Keep company data on the account`, body: `Store firmographics once on the account and let contacts inherit them, rather than copying company data onto each person.` },
      { h: `Fix orphaned contacts`, body: `Find contacts with no linked account and match them, so no person is floating without company context.` },
    ],
    sections: [
      { h: `Domain matching is the workhorse`, body: `Email domain is the most reliable way to connect a person to their company, because it is far more unique and stable than a variously-spelled company name. Domain matching powers contact-to-account linking and lead-to-account matching alike, so getting it right pays off across the whole data model.` },
      { h: `How Ardovo helps`, body: `Ardovo links contacts to accounts by domain automatically, so people are grouped under their company with no manual bookkeeping. Rook fixes orphaned contacts and keeps company data on the account, so every contact carries accurate company context by inheritance.` },
    ],
    faqs: [
      { q: `How do you match a contact to the right account?`, a: `Primarily through the email domain, which reliably maps a person to their employer and is far more stable than a company name that gets spelled many ways. Match on domain to find or create the account, then link the contact so it appears under the company.` },
      { q: `What is an orphaned contact?`, a: `A contact with no linked account - a person floating with no company context. Orphaned contacts break account-level views and reporting because you cannot see them alongside the company's other people and deals. Matching them to an account is basic hygiene.` },
      { q: `Should company data live on the contact or the account?`, a: `On the account, with contacts inheriting it. Storing firmographics once on the account keeps company data consistent - one update flows to every contact - while copying it onto each person creates redundancy that drifts out of sync as details change.` },
    ] },

  { slug: `what-is-a-parent-child-account`, type: `glossary`, eyebrow: `Records & relationships`,
    title: `What is a parent-child account?`,
    shortAnswer: `A parent-child account is a hierarchy relationship where one account (the parent) sits above one or more related accounts (the children), such as a corporate headquarters over its subsidiaries or regional offices. The children remain separate workable records while the link lets you view and roll up deals and revenue across the whole organization.`,
    intro: [`Parent-child is the basic unit of account hierarchy - the link that connects a corporate entity to the smaller entities beneath it.`, `It preserves the ability to work each entity separately while revealing the larger organization they all belong to.`],
    keyPoints: [`Links a parent account above related child accounts.`, `Models headquarters-to-subsidiary and division relationships.`, `Children stay separately workable; the link enables rollups.`, `The building block of account hierarchy.`],
    sections: [
      { h: `Why it matters`, body: `Large customers are structured, not flat. Parent-child links model that structure, so a global account is not a dozen disconnected records but one visible organization with enterprise-wide rollups and per-entity detail both available.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports parent-child relationships and rolls up deals and revenue across them, while distinguishing them from duplicates. Rook keeps the links accurate as organizations restructure, so hierarchies reflect reality.` },
    ],
    faqs: [
      { q: `What is an example of a parent-child account?`, a: `A corporate headquarters as the parent, with regional offices or subsidiaries as children beneath it - for instance, a global company parent over its country-level entities. Each child is worked separately, but the hierarchy connects them for organization-wide visibility and rollups.` },
      { q: `Do child accounts work independently?`, a: `Yes. Child accounts remain separate, workable records with their own contacts and deals. The parent-child link adds a layer of connection and rollup on top, so you get both per-entity working detail and an enterprise-wide view of the whole organization.` },
      { q: `Is a parent-child account the same as a duplicate?`, a: `No, and confusing them is costly. Parent-child links distinct entities that should stay separate; duplicates are two records for the same entity that should merge. Merging a child into its parent destroys a real relationship, so confirm the case before acting.` },
    ] },

  { slug: `how-to-manage-multiple-contacts-per-account`, type: `guide`, eyebrow: `Records & relationships`,
    title: `How to manage multiple contacts per account`,
    shortAnswer: `Manage multiple contacts per account by linking every relevant person to the account, capturing each one's role in the buying decision, mapping the buying committee, and tracking engagement per contact so you can multithread. Seeing all the people at an account together - and their roles - is what lets you sell to the committee instead of a single point of contact.`,
    intro: [`B2B deals are decided by groups, not individuals. An account with one contact is a single point of failure if that person leaves or goes quiet.`, `Managing the full set of contacts - with roles and engagement - is what enables multithreading, the practice that de-risks and wins complex deals.`],
    steps: [
      { h: `Link every relevant person`, body: `Add all the stakeholders at an account as contacts linked to it, so the whole cast of the deal is visible.` },
      { h: `Capture each contact's role`, body: `Record who is the champion, decision-maker, economic buyer, and blocker, so you know each person's part in the decision.` },
      { h: `Map the buying committee`, body: `Assemble the contacts into a picture of the buying group, revealing who you have covered and who you are missing.` },
      { h: `Track engagement per contact`, body: `Monitor each person's activity so you can see whether you are multithreaded or reliant on one champion.` },
    ],
    sections: [
      { h: `Single-threaded deals are fragile`, body: `A deal with one engaged contact collapses if that person leaves, loses influence, or goes cold. Managing multiple contacts per account and multithreading across the committee is the single biggest way to de-risk complex deals. Coverage of the buying group is what wins.` },
      { h: `How Ardovo helps`, body: `Ardovo gathers all of an account's contacts with their roles and engagement, and maps the buying committee. Rook flags single-threaded deals and the missing stakeholders, so reps multithread deliberately instead of relying on one contact and hoping.` },
    ],
    faqs: [
      { q: `Why manage multiple contacts per account?`, a: `Because B2B deals are decided by committees, not individuals. Relying on one contact is fragile - if they leave or go quiet, the deal stalls. Managing all the stakeholders with their roles lets you multithread, which is the most reliable way to de-risk and win complex deals.` },
      { q: `What is multithreading in sales?`, a: `Building relationships with multiple stakeholders at an account rather than a single champion. Multithreaded deals are far more resilient because they do not depend on one person's continued interest and influence. Managing multiple contacts per account is what makes multithreading possible.` },
      { q: `How do you track roles across an account's contacts?`, a: `Capture each contact's part in the buying decision - champion, decision-maker, economic buyer, blocker - on their record, then assemble them into a buying-committee view. This shows who you have covered and, crucially, which roles you are still missing.` },
    ] },

  { slug: `how-to-match-leads-to-accounts`, type: `guide`, eyebrow: `Records & relationships`,
    title: `How to match leads to accounts`,
    shortAnswer: `Match leads to accounts by using the email domain to connect each inbound lead to the company account it belongs to, so leads are routed to the account owner, scored with account context, and never worked as net-new when the company is already a customer or active opportunity. Lead-to-account matching prevents cross-rep collisions and reveals account-level intent.`,
    intro: [`Without lead-to-account matching, a fresh lead from an existing customer looks like a brand-new prospect, and a different rep may start working an account someone already owns.`, `Matching leads to accounts connects individual interest to the company context, which fixes routing, prevents collisions, and surfaces account-based intent.`],
    steps: [
      { h: `Match on email domain`, body: `Connect each lead to its company account through the email domain, the most reliable link between a person and their employer.` },
      { h: `Route to the account owner`, body: `Send matched leads to whoever owns the account, so existing relationships are respected and reps do not collide.` },
      { h: `Add account context to scoring`, body: `Score the lead with its account's fit and existing engagement, so a lead from a target account is prioritized accordingly.` },
      { h: `Flag existing customers and open deals`, body: `Surface when a lead belongs to a current customer or active opportunity, so it is handled as expansion, not net-new.` },
    ],
    sections: [
      { h: `Matching prevents cross-rep collisions`, body: `The worst routing failure is two reps working the same company because a lead was not matched to its existing account. Lead-to-account matching routes inbound interest to the account owner, so relationships are respected and no one steps on an active deal or customer.` },
      { h: `How Ardovo helps`, body: `Ardovo matches leads to accounts by domain automatically, routing them to the account owner with full account context. Rook flags leads from existing customers and open opportunities, so inbound interest is handled correctly instead of restarting a relationship someone already owns.` },
    ],
    faqs: [
      { q: `What is lead-to-account matching?`, a: `Connecting an inbound lead to the company account it belongs to, usually through the email domain. It ensures leads are routed to the account owner, scored with account context, and recognized when they come from existing customers or open deals rather than treated as net-new.` },
      { q: `Why does lead-to-account matching matter?`, a: `Because without it, a lead from an existing customer looks brand-new and may go to a different rep, causing collisions and stepping on active deals. Matching respects existing ownership, surfaces account-level intent, and stops the same company being worked twice.` },
      { q: `How are leads matched to accounts?`, a: `Primarily on the email domain, which reliably maps a person to their employer. The domain finds the existing account, so the lead can be routed to its owner and scored with account context. Domain matching is more stable than trying to match on company name.` },
    ] },

  // ===================================================================
  // CLUSTER G - Lead routing + assignment
  // ===================================================================
  { slug: `what-is-lead-routing-in-a-crm`, type: `glossary`, eyebrow: `Lead routing`,
    title: `What is lead routing in a CRM?`,
    shortAnswer: `Lead routing in a CRM is automatically directing each incoming lead to the right rep based on rules like territory, company size, product interest, or round-robin. Good routing gets leads to the best-matched, available rep in seconds, so follow-up is fast and no lead falls through the cracks. It is the mechanism behind speed-to-lead.`,
    intro: [`Lead routing is the traffic control of a sales operation: it decides who works each lead the instant it arrives.`, `Because speed and fit both drive conversion, routing is one of the highest-leverage automations a revenue team can get right.`],
    keyPoints: [`Automatically assigns each lead to the right rep by rule.`, `Rules include territory, company size, product, and round-robin.`, `Aims to route in seconds so follow-up is fast.`, `The mechanism that makes speed-to-lead possible.`],
    sections: [
      { h: `Why it matters`, body: `A lead's conversion odds drop sharply with every hour of delay. Routing that instantly sends each lead to the right available rep is what makes fast follow-up possible and ensures no lead is dropped or worked by the wrong person.` },
      { h: `How Ardovo handles it`, body: `Ardovo routes leads instantly by your rules - territory, size, product, round-robin - matching each to the account owner where one exists. Rook enriches and scores the lead first, so routing decisions use complete data and the best-fit rep gets it in seconds.` },
    ],
    faqs: [
      { q: `How does lead routing work?`, a: `Incoming leads are evaluated against rules - territory, company size, product interest, round-robin, or account ownership - and automatically assigned to the matching rep. Good routing enriches and scores the lead first, then assigns it to the best-fit, available rep in seconds.` },
      { q: `Why is fast lead routing important?`, a: `Because a lead's likelihood of converting falls sharply with delay - responding in minutes rather than hours can multiply contact and conversion rates. Fast routing is what makes fast follow-up possible, so the routing speed directly affects revenue.` },
      { q: `What rules can lead routing use?`, a: `Territory or region, company size, industry, product interest, lead score, and round-robin for even distribution, often combined with lead-to-account matching so leads go to the account owner. The right mix depends on how your team is organized and specialized.` },
    ] },

  { slug: `how-to-set-up-lead-routing-rules`, type: `guide`, eyebrow: `Lead routing`,
    title: `How to set up lead routing rules`,
    shortAnswer: `Set up lead routing rules by mapping how your team is organized (territory, segment, product), enriching leads so the routing data is present, writing rules in priority order with a fallback, adding round-robin for even distribution within a group, and monitoring for leads that fall through. Enrich first, route on complete data, and always have a catch-all so no lead is stranded.`,
    intro: [`Routing rules encode who should work each lead. The logic is only as good as the data it runs on, so enrichment comes first.`, `The discipline is ordering rules by priority, distributing evenly within groups, and never leaving a lead with nowhere to go.`],
    steps: [
      { h: `Map your team structure`, body: `Determine how leads should be split - by territory, segment, industry, or product - so the rules mirror how your team is actually organized.` },
      { h: `Enrich before routing`, body: `Fill company size, industry, and location so routing rules have the data they depend on. Routing on missing data misfires.` },
      { h: `Write rules in priority order`, body: `Order the rules so the most specific match wins, and add a catch-all fallback so every lead lands somewhere.` },
      { h: `Add round-robin within groups`, body: `Distribute leads evenly among the reps in a matched group, respecting availability, so no one is overloaded or starved.` },
      { h: `Monitor for fall-through`, body: `Watch for leads that match no rule or sit unassigned, and fix the gaps so nothing is stranded.` },
    ],
    sections: [
      { h: `Enrich first, then route`, body: `Routing rules that depend on company size or industry fail on leads missing that data - they hit the fallback or route wrong. Enriching leads before routing ensures the rules have what they need, so leads reach the right rep instead of defaulting to a catch-all.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches and scores leads before routing, then applies your prioritized rules with round-robin and a fallback so nothing is stranded. Rook monitors for fall-through and rebalances load, so routing stays fair and every lead reaches the best-fit rep fast.` },
    ],
    faqs: [
      { q: `What is the first step in setting up lead routing?`, a: `Mapping how your team is organized - by territory, segment, industry, or product - so the rules mirror reality. And enriching leads first, since routing rules that depend on company size or location misfire on leads missing that data. Enrich, then route on complete information.` },
      { q: `Why do you need a fallback routing rule?`, a: `Because some leads will match no specific rule - unusual companies, missing data. Without a catch-all, those leads sit unassigned and go stale. A fallback ensures every lead lands with someone, so nothing falls through the cracks while you refine the specific rules.` },
      { q: `How do you distribute leads evenly among reps?`, a: `Add round-robin within each matched group, so leads rotate through the available reps rather than piling on one. Good round-robin respects availability and capacity, so reps who are out or overloaded are skipped, keeping distribution both even and sensible.` },
    ] },

  { slug: `what-are-assignment-rules`, type: `glossary`, eyebrow: `Lead routing`,
    title: `What are assignment rules?`,
    shortAnswer: `Assignment rules are the logic a CRM uses to decide who owns each new record - which rep gets a lead, which owner an account belongs to. They evaluate attributes like territory, size, or product and assign accordingly, often with round-robin for even distribution. Assignment rules automate ownership so records never sit unassigned or land with the wrong person.`,
    intro: [`Assignment rules are the engine underneath lead routing and account ownership - the if-this-then-assign logic that gives every record an owner.`, `They matter because an unassigned or misassigned record is a dropped ball: nobody works it, or the wrong person does.`],
    keyPoints: [`Logic that decides who owns each new record.`, `Evaluate attributes like territory, size, and product.`, `Often include round-robin for even distribution.`, `Ensure records get an owner automatically, not by hand.`],
    sections: [
      { h: `Why it matters`, body: `Ownership is accountability. Without assignment rules, records land unassigned and get ignored, or a manager hand-assigns them slowly. Rules make ownership instant and consistent, which is what keeps leads worked and accounts covered.` },
      { h: `How Ardovo handles it`, body: `Ardovo applies assignment rules to route leads and set account ownership automatically, with round-robin and fallbacks. Rook enriches records first so the rules have accurate data, and rebalances assignments as territories and capacity change.` },
    ],
    faqs: [
      { q: `What is the difference between assignment rules and lead routing?`, a: `Lead routing is the specific application of assignment rules to incoming leads. Assignment rules are the broader logic that decides ownership of any record - leads, accounts, cases. Routing is assignment rules pointed at leads, focused on speed to the right rep.` },
      { q: `What attributes do assignment rules use?`, a: `Territory or region, company size, industry, product interest, lead score, and round-robin position, often combined with account ownership so records go to whoever owns the related account. The mix reflects how the team is organized and specialized.` },
      { q: `Why automate record assignment?`, a: `Because manual assignment is slow and inconsistent, leaving records unassigned and ignored or landing with the wrong person. Automated rules give every record an owner instantly and consistently, which is what keeps leads worked promptly and accounts reliably covered.` },
    ] },

  { slug: `how-to-set-up-assignment-rules`, type: `guide`, eyebrow: `Lead routing`,
    title: `How to set up assignment rules`,
    shortAnswer: `Set up assignment rules by deciding what determines ownership (territory, segment, product, account), ordering the rules so the most specific match wins, adding round-robin for even distribution within a group, including a fallback owner, and testing with sample records. Order matters and a fallback is essential, so every record gets a sensible owner and none is stranded.`,
    intro: [`Assignment rules give every new record an owner automatically. Getting them right means mirroring how your team divides work and handling the edge cases.`, `The two things people miss are rule order - most specific first - and a fallback so no record is orphaned.`],
    steps: [
      { h: `Decide what determines ownership`, body: `Choose the attributes that assign records: territory, segment, industry, product, or the owner of a related account.` },
      { h: `Order rules specific-to-general`, body: `Put the most specific rules first so they win, with broader rules beneath, so records match the most precise applicable rule.` },
      { h: `Add round-robin within groups`, body: `Distribute evenly among reps in a matched group, respecting capacity, so assignment is fair.` },
      { h: `Set a fallback and test`, body: `Add a catch-all owner for unmatched records, then test with sample records to confirm they assign as intended.` },
    ],
    sections: [
      { h: `Order and fallback are what people miss`, body: `Two failure modes dominate assignment rules: rules in the wrong order (a broad rule fires before a specific one, so records land generically) and no fallback (unmatched records sit ownerless). Order specific-to-general and always include a catch-all, and assignment stays reliable.` },
      { h: `How Ardovo helps`, body: `Ardovo applies ordered assignment rules with round-robin and a fallback, and previews how sample records would assign. Rook enriches records first so rules match accurately, and rebalances as your team and territories change, so ownership stays fair and current.` },
    ],
    faqs: [
      { q: `Why does the order of assignment rules matter?`, a: `Because records usually match the first applicable rule, so a broad rule placed before a specific one fires first and assigns generically. Ordering rules from most specific to most general ensures each record matches the most precise applicable rule rather than a catch-all.` },
      { q: `Do assignment rules need a fallback?`, a: `Yes. Some records match no specific rule, and without a fallback owner they sit unassigned and ignored. A catch-all rule ensures every record lands with someone, so nothing is stranded while you refine the more specific logic.` },
      { q: `How do you test assignment rules?`, a: `Run sample records representing your common and edge cases through the rules and confirm each assigns to the intended owner. Testing catches ordering mistakes and gaps before real records route wrong, which is far cheaper than discovering the problem in production.` },
    ] },

  { slug: `what-is-round-robin-lead-assignment`, type: `glossary`, eyebrow: `Lead routing`,
    title: `What is round-robin lead assignment?`,
    shortAnswer: `Round-robin lead assignment distributes leads evenly by rotating them one at a time through a group of reps, so each gets roughly the same volume. Good round-robin respects availability and capacity, skipping reps who are out or overloaded. It ensures fair distribution within a team or territory rather than piling leads on whoever is fastest to grab them.`,
    intro: [`Round-robin is the fairness mechanism of lead routing: it takes turns, so no rep hoards leads and no rep is starved.`, `The refined versions add awareness - skipping reps who are unavailable or at capacity - so fairness does not become a lead dumped on someone who is out.`],
    keyPoints: [`Rotates leads one at a time through a group of reps.`, `Aims for roughly even volume per rep.`, `Better versions respect availability and capacity.`, `Ensures fair distribution within a team or territory.`],
    sections: [
      { h: `Why it matters`, body: `Without even distribution, leads pile on the quickest or favored reps and others starve, which is both unfair and inefficient. Round-robin balances volume, and capacity-aware round-robin ensures leads go to reps actually able to work them promptly.` },
      { h: `How Ardovo handles it`, body: `Ardovo runs capacity-aware round-robin within matched groups, skipping reps who are out or overloaded. Rook balances distribution against real availability, so leads are shared fairly and reach someone able to follow up fast, not just next in line.` },
    ],
    faqs: [
      { q: `How does round-robin lead assignment work?`, a: `Leads are handed out one at a time in rotation through a group of reps, so over time each receives roughly equal volume. The basic version simply cycles through the list; refined versions skip reps who are unavailable or at capacity so leads still get worked promptly.` },
      { q: `What is the downside of basic round-robin?`, a: `It ignores availability and capacity, so a lead can rotate to a rep who is out of office or already overloaded, where it sits unworked. Capacity- and availability-aware round-robin fixes this by skipping reps who cannot act on the lead right now.` },
      { q: `When should you use round-robin?`, a: `When you want fair, even distribution among interchangeable reps in a team or territory - typically after routing rules have narrowed to the right group. Round-robin handles the who-within-the-group question once territory or segment rules decide the group.` },
    ] },

  { slug: `how-to-set-up-round-robin-routing`, type: `guide`, eyebrow: `Lead routing`,
    title: `How to set up round-robin routing`,
    shortAnswer: `Set up round-robin routing by defining the rep group that shares leads, making the rotation capacity- and availability-aware so out or overloaded reps are skipped, combining it with routing rules that pick the group first, and monitoring for balance. Route to the right group by rule, then round-robin within it, respecting who can actually work the lead now.`,
    intro: [`Round-robin answers "which rep in this group?" after routing rules answer "which group?" Used alone it ignores fit; used together with rules it distributes fairly within the right team.`, `The key upgrade over naive rotation is awareness of availability and capacity, so fairness does not strand a lead on someone who is out.`],
    steps: [
      { h: `Define the sharing group`, body: `Decide which reps share leads evenly - usually a team, territory, or segment pod of interchangeable reps.` },
      { h: `Make it capacity-aware`, body: `Configure the rotation to skip reps who are out of office or at capacity, so leads go to someone able to act.` },
      { h: `Combine with routing rules`, body: `Use routing rules to select the right group first, then round-robin within it, so leads are both well-matched and evenly shared.` },
      { h: `Monitor balance`, body: `Track distribution and adjust, so no rep is quietly over- or under-fed as availability changes.` },
    ],
    sections: [
      { h: `Group first, then round-robin`, body: `Round-robin alone ignores fit - it would rotate an enterprise lead to an SMB rep. The right pattern is routing rules to pick the correct group by territory or segment, then round-robin to distribute fairly within it. Fit first, fairness second.` },
      { h: `How Ardovo helps`, body: `Ardovo combines routing rules with capacity-aware round-robin, selecting the right group then rotating within it while skipping unavailable reps. Rook monitors balance and rebalances as availability changes, so distribution stays fair and every lead reaches someone ready to work it.` },
    ],
    faqs: [
      { q: `Should you use round-robin alone for routing?`, a: `No - alone it ignores fit and would send a mismatched lead to the wrong rep. Use routing rules to select the correct group by territory or segment first, then round-robin to distribute evenly within that group. Fit first, fairness second.` },
      { q: `How do you make round-robin fair when reps are out?`, a: `Make the rotation capacity- and availability-aware so it skips reps who are out of office or at capacity, rather than blindly cycling. This keeps distribution even among reps who can actually work the lead now, instead of stranding leads on someone unavailable.` },
      { q: `How do you monitor round-robin balance?`, a: `Track lead volume per rep over time and watch for imbalance caused by availability, capacity, or reps grabbing leads outside the rotation. Adjust the group or rules as needed, since teams and availability shift and static round-robin can drift out of balance.` },
    ] },

  { slug: `what-is-speed-to-lead`, type: `glossary`, eyebrow: `Lead routing`,
    title: `What is speed to lead?`,
    shortAnswer: `Speed to lead is how quickly a rep responds to a new lead after it comes in, measured from submission to first contact. It is one of the strongest predictors of conversion: responding within minutes rather than hours dramatically raises the odds of connecting and winning. Fast routing and instant notification are what make strong speed to lead possible.`,
    intro: [`Speed to lead captures a simple, ruthless truth: the faster you respond, the more you win, and the advantage decays by the minute.`, `It is downstream of routing and notification - you cannot respond fast to a lead that took an hour to reach the right rep.`],
    keyPoints: [`Time from lead submission to first rep contact.`, `A top predictor of contact and conversion rates.`, `Advantage decays sharply within the first hour.`, `Enabled by fast routing and instant notification.`],
    sections: [
      { h: `Why it matters`, body: `Studies consistently show contact rates fall off a cliff as response time stretches from minutes to hours. A lead responded to in five minutes is far more likely to convert than the same lead reached an hour later. Speed to lead is where fast routing pays off in revenue.` },
      { h: `How Ardovo handles it`, body: `Ardovo enriches, scores, and routes leads in seconds and notifies the rep instantly, so response can happen while intent is hot. Rook can even draft the first outreach, so speed to lead is measured in minutes rather than hours.` },
    ],
    faqs: [
      { q: `Why is speed to lead so important?`, a: `Because contact and conversion rates drop sharply as response time grows. Reaching a lead within minutes rather than hours can multiply the odds of connecting and winning, since intent is highest right after submission. It is one of the most reliable levers on conversion.` },
      { q: `What is a good speed-to-lead time?`, a: `Faster is always better, with the biggest gains in the first few minutes. Leading teams aim to respond within five minutes. The exact target matters less than the principle: every minute of delay costs conversion, so route and notify as fast as possible.` },
      { q: `How do you improve speed to lead?`, a: `Route leads instantly to the right rep, notify that rep immediately, enrich the lead so no research delays contact, and remove manual steps between submission and response. Speed to lead is mostly a routing and notification problem, so automate that path end to end.` },
    ] },

  { slug: `how-to-improve-speed-to-lead`, type: `guide`, eyebrow: `Lead routing`,
    title: `How to improve speed to lead`,
    shortAnswer: `Improve speed to lead by removing every manual step between submission and response: enrich and route leads instantly, notify the assigned rep immediately on their preferred channel, pre-draft first outreach, and measure response time to find where delay creeps in. The goal is minutes, not hours, because conversion odds fall sharply with every hour a lead waits.`,
    intro: [`Speed to lead is won by deleting delay. Every manual handoff, research step, and unread notification is time a competitor is using to respond first.`, `The playbook is to automate the whole path from submission to first touch, then measure it so delay cannot creep back in.`],
    steps: [
      { h: `Enrich and route instantly`, body: `Enrich the lead and route it to the right rep the moment it arrives, so no time is lost to research or manual assignment.` },
      { h: `Notify the rep immediately`, body: `Alert the assigned rep on the channel they actually watch, so the lead does not sit unseen in a queue.` },
      { h: `Pre-draft first outreach`, body: `Have a first email or call script ready so the rep can respond in seconds rather than composing from scratch.` },
      { h: `Measure and close the gaps`, body: `Track response time per rep and source, and fix wherever delay appears, so speed does not silently regress.` },
    ],
    sections: [
      { h: `Delete every manual step`, body: `Speed to lead dies in the gaps: a lead waiting for enrichment, an unassigned queue, a notification nobody saw. Each manual step adds minutes that cost conversion. Automate enrichment, routing, and notification end to end so the only human step is the response itself.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches, scores, routes, and notifies in seconds, and Rook can draft the first outreach so reps respond immediately. Response time is tracked per rep and source, so delay is visible and fixable, and speed to lead stays in minutes rather than drifting back to hours.` },
    ],
    faqs: [
      { q: `What slows down speed to lead?`, a: `Manual steps: leads waiting to be enriched or researched, unassigned queues, routing that takes minutes, and notifications reps do not see. Each gap adds delay that costs conversion. The fix is automating the whole path from submission to notification so only the response is manual.` },
      { q: `How fast should reps respond to leads?`, a: `As fast as possible, ideally within five minutes, because conversion odds fall sharply with delay. The exact number matters less than minimizing every minute - a lead reached in five minutes vastly outperforms the same lead reached an hour later.` },
      { q: `How do you keep speed to lead from regressing?`, a: `Measure response time per rep and source continuously, so delay becomes visible the moment it creeps in. Speed to lead silently degrades as processes change or volume grows; tracking it turns a vague goal into a metric you can hold and defend.` },
    ] },

  { slug: `how-to-automate-lead-assignment`, type: `guide`, eyebrow: `Lead routing`,
    title: `How to automate lead assignment`,
    shortAnswer: `Automate lead assignment by enriching leads so routing data is present, defining rules that mirror your team structure, adding round-robin within groups, matching leads to existing account owners, and setting a fallback. Automated assignment gives every lead an owner in seconds instead of waiting on a manager, which is the foundation of fast follow-up.`,
    intro: [`Manual lead assignment - a manager parceling out leads - is slow, inconsistent, and a bottleneck that kills speed to lead.`, `Automating it means encoding the assignment logic once so every lead gets the right owner instantly, freeing managers and speeding follow-up.`],
    steps: [
      { h: `Enrich so rules can match`, body: `Fill company size, industry, and location first, so assignment rules that depend on them route accurately.` },
      { h: `Define rules from your structure`, body: `Encode how leads should be assigned - territory, segment, product - mirroring how the team is organized.` },
      { h: `Match to account owners`, body: `Route leads from existing accounts to the account owner, so relationships are respected and reps do not collide.` },
      { h: `Add round-robin and a fallback`, body: `Distribute evenly within groups and add a catch-all, so every lead lands with someone and none is stranded.` },
    ],
    sections: [
      { h: `Automation removes the manager bottleneck`, body: `When a person hand-assigns leads, follow-up waits on their availability and judgment, and consistency suffers. Automated assignment applies the same logic instantly to every lead, so ownership is immediate and fair, and managers spend time coaching instead of triaging a queue.` },
      { h: `How Ardovo helps`, body: `Ardovo automates assignment with enrichment, rules, account matching, round-robin, and fallbacks, so every lead gets the right owner in seconds. Rook rebalances as the team changes and flags any lead that slips, so assignment runs itself without a manager in the loop.` },
    ],
    faqs: [
      { q: `Why automate lead assignment?`, a: `Because manual assignment is slow, inconsistent, and a bottleneck - follow-up waits on a manager's availability. Automated assignment applies consistent logic instantly, giving every lead an owner in seconds. That immediacy is the foundation of strong speed to lead and fair distribution.` },
      { q: `What does automated lead assignment need to work well?`, a: `Enriched data so rules can match, rules that mirror the team structure, account matching so leads reach existing owners, round-robin for fairness, and a fallback so nothing is stranded. Enrichment first is key - rules that depend on missing data misassign leads.` },
      { q: `Does automation replace manager oversight?`, a: `It replaces the manual triage, not the oversight. Managers still set the rules and watch the balance, but they stop hand-assigning every lead. That frees them to coach and handle exceptions while routine assignment runs consistently and instantly on its own.` },
    ] },

  { slug: `what-is-a-lead-queue`, type: `glossary`, eyebrow: `Lead routing`,
    title: `What is a lead queue?`,
    shortAnswer: `A lead queue is a holding area where incoming leads wait to be claimed or assigned, rather than being routed directly to an individual. Reps or an automated process pull from the queue. Queues suit shared coverage models, but the risk is leads sitting unclaimed, so the best setups pair queues with alerts and time-based escalation.`,
    intro: [`A lead queue is the pull model of lead handling: leads land in a shared pool that reps work from, instead of being pushed to one owner.`, `It offers flexibility but carries a danger - leads that nobody claims sit and go stale, undermining speed to lead.`],
    keyPoints: [`A shared holding area where leads wait to be claimed or assigned.`, `Reps or automation pull leads from it.`, `Suits shared-coverage and specialized-team models.`, `Risks leads sitting unclaimed without alerts and escalation.`],
    sections: [
      { h: `Why it matters`, body: `Queues can distribute work flexibly, but a pure pull model lets leads languish when everyone assumes someone else will grab them. Pairing queues with instant alerts and time-based escalation keeps the flexibility without sacrificing response speed.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports queues with instant alerts and escalation, so a lead that sits unclaimed too long is reassigned or surfaced. Rook watches the queue and pushes leads to owners when needed, so the pull model never becomes a place leads go to die.` },
    ],
    faqs: [
      { q: `What is the difference between a lead queue and direct assignment?`, a: `Direct assignment pushes each lead to a specific owner; a queue holds leads in a shared pool that reps pull from. Assignment guarantees an owner and speed; queues offer flexibility but risk leads sitting unclaimed unless paired with alerts and escalation.` },
      { q: `When should you use a lead queue?`, a: `When coverage is shared - a pod of reps, a specialized team, or a follow-the-sun model - and flexibility to pull matters more than fixed ownership. Even then, pair the queue with alerts and time-based escalation so leads do not sit unworked.` },
      { q: `What is the risk of a lead queue?`, a: `Leads sitting unclaimed because everyone assumes someone else will take them, which kills speed to lead. The fix is instant alerts when leads arrive and time-based escalation that reassigns or surfaces any lead sitting too long, so nothing languishes in the pool.` },
    ] },

  // ===================================================================
  // CLUSTER H - Lead scoring
  // ===================================================================
  { slug: `how-lead-scoring-works`, type: `glossary`, eyebrow: `Lead scoring`,
    title: `How lead scoring works`,
    shortAnswer: `Lead scoring assigns each lead a number representing how likely it is to convert, based on fit (how well the company matches your ICP) and engagement (how actively the person is interacting). Higher scores get prioritized for fast follow-up. Scoring lets reps focus on the leads most likely to buy instead of working them in the order they arrived.`,
    intro: [`Lead scoring turns a pile of undifferentiated leads into a ranked list, so the best ones get worked first.`, `The strongest scoring keeps fit and engagement distinct, because a great-fit-but-quiet lead needs different handling than an active-but-poor-fit one.`],
    keyPoints: [`Assigns a conversion-likelihood score to each lead.`, `Combines fit (ICP match) and engagement (activity).`, `Prioritizes the highest-scoring leads for fast follow-up.`, `Keeps fit and engagement separate for clearer signal.`],
    sections: [
      { h: `Why it matters`, body: `Reps have limited time, and working leads in arrival order wastes it on poor prospects while good ones cool. Scoring focuses effort on the leads most likely to convert, raising efficiency and conversion without adding headcount.` },
      { h: `How Ardovo handles it`, body: `Ardovo scores leads on fit and engagement separately using enriched data and real activity, and Rook prioritizes the queue accordingly. Reps get a ranked list with the best leads on top, so time goes where it converts rather than to whoever came in first.` },
    ],
    faqs: [
      { q: `What factors go into a lead score?`, a: `Two categories: fit, meaning how well the company matches your ideal customer profile (industry, size, role), and engagement, meaning how actively the person interacts (visits, opens, replies, demo requests). Combining both predicts conversion likelihood better than either alone.` },
      { q: `Why keep fit and engagement separate in scoring?`, a: `Because they signal different things. A great-fit lead who is quiet needs nurturing; an engaged lead who is a poor fit is often a bad use of time. Blending them into one number hides which situation you have, so keeping them distinct sharpens the decision.` },
      { q: `Does lead scoring replace rep judgment?`, a: `No, it focuses it. Scoring ranks leads so reps spend time on the most promising first, but reps still apply judgment on how to work each one. Scoring is a prioritization aid, not a replacement for the human read on a specific lead.` },
    ] },

  { slug: `how-to-set-up-lead-scoring-in-a-crm`, type: `guide`, eyebrow: `Lead scoring`,
    title: `How to set up lead scoring in a CRM`,
    shortAnswer: `Set up lead scoring by defining your ICP for fit, choosing the engagement signals that predict intent, scoring fit and engagement separately, enriching leads so fit can be computed, setting thresholds for action, and refining against actual conversions. Enrich for fit, watch real engagement, keep the two scores separate, and tune the model with outcomes.`,
    intro: [`Lead scoring is only as good as its inputs and its calibration. A model built on gut weights and thin data misranks leads and erodes trust.`, `The disciplined build defines fit and engagement, feeds them complete data, and tunes the weights against what actually converted.`],
    steps: [
      { h: `Define fit from your ICP`, body: `List the firmographic traits that mark a good-fit account and weight them, so fit reflects your real ideal customer.` },
      { h: `Choose engagement signals`, body: `Pick the behaviors that predict intent - demo requests, pricing views, repeat visits, replies - and weight them by strength.` },
      { h: `Score fit and engagement separately`, body: `Keep the two as distinct scores so you can tell a quiet good-fit lead from an active poor-fit one.` },
      { h: `Enrich so fit can be computed`, body: `Fill firmographic data through enrichment, since fit cannot be scored on missing company attributes.` },
      { h: `Set thresholds and refine on outcomes`, body: `Define score levels that trigger action, then tune the weights against which leads actually converted.` },
    ],
    sections: [
      { h: `Tune against real conversions`, body: `A scoring model built on assumptions misranks leads until it is calibrated against reality. Periodically check which scores actually converted and adjust the weights, so the model reflects what predicts a real customer rather than what you guessed would. Calibration is what earns rep trust.` },
      { h: `How Ardovo helps`, body: `Ardovo scores fit and engagement separately on enriched data and real activity, and Rook tunes the model against actual conversions. The score reflects what truly predicts a customer, so reps trust the ranking and work the right leads first.` },
    ],
    faqs: [
      { q: `What data do you need for lead scoring?`, a: `Firmographic data for the fit score (industry, size, revenue, role) and behavioral data for engagement (visits, opens, replies, demo requests). Fit requires enriched company data, which is why enrichment is a prerequisite - you cannot score fit on missing firmographics.` },
      { q: `How do you know if a lead scoring model is good?`, a: `Check whether high-scoring leads actually convert more than low-scoring ones. If they do not, the weights are miscalibrated. Tuning the model against real conversion outcomes - not assumptions - is what makes the score predictive and worth reps trusting.` },
      { q: `Should lead scoring be one number or two?`, a: `Two is better: a fit score and an engagement score. One blended number hides whether a lead is a quiet good fit that needs nurturing or an active poor fit that is a bad use of time. Separate scores make the right action clear.` },
    ] },

  { slug: `what-is-an-engagement-score`, type: `glossary`, eyebrow: `Lead scoring`,
    title: `What is an engagement score?`,
    shortAnswer: `An engagement score measures how actively a lead or account is interacting with you - website visits, email opens and replies, content downloads, demo requests, and meeting attendance. It signals intent and timing, telling you when a prospect is warming up. Paired with a fit score, engagement answers whether now is the right moment to act.`,
    intro: [`Engagement score is the behavior half of lead scoring: it tracks what a prospect does, which signals how interested and ready they are.`, `It pairs with fit: fit says whether an account is worth pursuing, engagement says whether the timing is right.`],
    keyPoints: [`Measures a prospect's activity and interaction level.`, `Draws on visits, opens, replies, downloads, and meetings.`, `Signals intent and timing rather than fit.`, `Pairs with a fit score to prioritize who and when.`],
    sections: [
      { h: `Why it matters`, body: `A rising engagement score is a buying signal - the moment to reach out while interest is hot. Tracking engagement lets teams time outreach to intent, catching prospects when they are leaning in rather than guessing when to follow up.` },
      { h: `How Ardovo handles it`, body: `Ardovo computes engagement scores from captured activity across email, web, and meetings, kept separate from fit. Rook flags when a lead or account's engagement spikes, so reps reach out at the moment intent is highest instead of on a fixed cadence.` },
    ],
    faqs: [
      { q: `What is the difference between an engagement score and a fit score?`, a: `Fit measures how well an account matches your ideal profile, from firmographics. Engagement measures how actively a prospect is interacting, from behavior. Fit answers whether to pursue an account; engagement answers when to act. Together they prioritize both who and when.` },
      { q: `What signals raise an engagement score?`, a: `High-intent behaviors weigh most: demo requests, pricing-page views, replies, and meeting attendance. Lower-intent signals like a single email open count less. Weighting signals by how strongly they predict intent keeps the engagement score meaningful rather than inflated by noise.` },
      { q: `Why track engagement separately from fit?`, a: `Because a spike in engagement is a timing signal you would miss if it were blended into one score. Watching engagement on its own lets you catch a good-fit account warming up and reach out at the peak moment, which is when outreach converts best.` },
    ] },

  { slug: `what-is-predictive-lead-scoring`, type: `glossary`, eyebrow: `Lead scoring`,
    title: `What is predictive lead scoring?`,
    shortAnswer: `Predictive lead scoring uses a model trained on your historical won and lost deals to score leads by likelihood to convert, instead of relying on manually assigned point weights. It finds the patterns in your actual outcomes - which traits and behaviors preceded wins - and applies them, producing scores that are calibrated to reality rather than to guesswork.`,
    intro: [`Traditional scoring uses hand-set point weights that reflect assumptions. Predictive scoring learns the weights from what actually converted.`, `It tends to be more accurate because it is grounded in your real outcomes, though it depends on having enough historical data to learn from.`],
    keyPoints: [`Scores leads using a model trained on historical outcomes.`, `Learns which traits and behaviors preceded wins.`, `More calibrated than manual point-based scoring.`, `Requires sufficient historical data to be reliable.`],
    sections: [
      { h: `Why it matters`, body: `Manual scoring is only as good as the guesses behind its weights. Predictive scoring replaces guesses with patterns from your actual wins and losses, so the score reflects what truly precedes a customer - often catching signals a human would not have weighted.` },
      { h: `How Ardovo handles it`, body: `Ardovo can score leads predictively from your own won and lost history, so the model is calibrated to your business, not a generic template. Rook keeps it tuned as outcomes accumulate, so the score stays accurate as your market and product evolve.` },
    ],
    faqs: [
      { q: `How is predictive lead scoring different from traditional scoring?`, a: `Traditional scoring uses point weights a human assigns based on assumptions. Predictive scoring learns the weights from your historical won and lost deals, finding the traits and behaviors that actually preceded wins. It is calibrated to real outcomes rather than to guesswork.` },
      { q: `What does predictive lead scoring need to work?`, a: `Enough historical won and lost deal data for the model to learn patterns from, plus quality data on the leads being scored. With too little history the model cannot find reliable patterns, so predictive scoring suits teams with a meaningful track record of outcomes.` },
      { q: `Is predictive scoring better than manual scoring?`, a: `Usually more accurate, because it is grounded in real outcomes rather than assumptions, and it can catch subtle predictive signals a human would miss. But it depends on sufficient clean historical data; without that, a well-designed manual model can be a sensible start.` },
    ] },

  { slug: `how-to-score-leads-in-a-crm`, type: `guide`, eyebrow: `Lead scoring`,
    title: `How to score leads in a CRM`,
    shortAnswer: `Score leads in a CRM by enriching them so fit can be computed, defining fit from your ICP and engagement from behavioral signals, scoring the two separately, setting thresholds that trigger routing and follow-up actions, and refining the weights against actual conversions. Enrich, score fit and engagement apart, act on thresholds, and calibrate with real outcomes.`,
    intro: [`Scoring leads in the CRM turns raw inflow into a prioritized, actionable queue. The mechanics are straightforward; the value is in good inputs and honest calibration.`, `Done right, scoring drives action automatically - high scores route fast and trigger follow-up - rather than just displaying a number.`],
    steps: [
      { h: `Enrich for fit`, body: `Fill firmographic data so the fit score can be computed, since fit depends on company attributes a lead often arrives without.` },
      { h: `Define fit and engagement`, body: `Set fit from your ICP traits and engagement from weighted behavioral signals, keeping them as separate scores.` },
      { h: `Set action thresholds`, body: `Define score levels that trigger routing priority and follow-up, so the score drives action rather than sitting idle.` },
      { h: `Refine against conversions`, body: `Tune the weights based on which scored leads actually converted, so the model stays predictive.` },
    ],
    sections: [
      { h: `Make the score drive action`, body: `A score that only displays a number changes nothing. The value comes when thresholds trigger behavior - high-scoring leads jump the routing queue and kick off immediate follow-up, low-scoring ones enter nurture. Wire the score to action, or it is just decoration.` },
      { h: `How Ardovo helps`, body: `Ardovo scores fit and engagement on enriched, real-time data and wires thresholds to routing and follow-up, so high scores act automatically. Rook tunes the model against conversions and drives the follow-up, so scoring produces action, not just numbers.` },
    ],
    faqs: [
      { q: `What is the first step to score leads?`, a: `Enrich them, so the fit score can be computed. Fit depends on firmographic attributes like industry and company size that leads often arrive without. Without enrichment, fit scoring runs on missing data and misranks leads, so enrichment comes before scoring.` },
      { q: `How should lead scores trigger action?`, a: `Set thresholds that drive behavior: high-scoring leads get routing priority and immediate follow-up, mid-range leads get standard handling, low-scoring leads enter nurture. A score that only displays a number changes nothing - wiring thresholds to action is what makes scoring useful.` },
      { q: `How do you keep lead scores accurate?`, a: `Refine the weights against actual conversions periodically, so the model reflects what really predicts a customer rather than initial assumptions. Lead behavior and your market shift over time, so a score left untuned drifts out of calibration and loses rep trust.` },
    ] },

  { slug: `what-is-a-lead-score-threshold`, type: `glossary`, eyebrow: `Lead scoring`,
    title: `What is a lead score threshold?`,
    shortAnswer: `A lead score threshold is the score level at which a lead triggers an action - being routed to sales, entering a nurture track, or getting immediate follow-up. Thresholds turn a continuous score into clear decisions, defining the line between a sales-ready lead and one that needs more nurturing. Setting them well is what makes scoring actionable.`,
    intro: [`A score is just a number until a threshold gives it meaning. The threshold is where scoring becomes a decision.`, `Set thresholds too high and good leads wait in nurture; too low and reps drown in unqualified leads. Calibration is everything.`],
    keyPoints: [`The score level that triggers a specific action.`, `Separates sales-ready leads from nurture-stage ones.`, `Turns a continuous score into clear decisions.`, `Needs calibration to balance volume against quality.`],
    sections: [
      { h: `Why it matters`, body: `Thresholds define the handoff between marketing and sales and the pace of follow-up. A well-set threshold sends sales exactly the leads worth their time; a badly set one either starves reps of good leads or floods them with noise.` },
      { h: `How Ardovo handles it`, body: `Ardovo lets you set thresholds that trigger routing and follow-up, and Rook calibrates them against conversion data so the line between sales-ready and nurture reflects reality. The threshold sends sales the right volume of genuinely qualified leads.` },
    ],
    faqs: [
      { q: `How do you set a lead score threshold?`, a: `Start from your capacity and conversion data: set the threshold so sales receives the volume of leads it can work and that actually convert at an acceptable rate. Then calibrate against outcomes - if too many threshold-crossing leads are poor, raise it; if good leads wait, lower it.` },
      { q: `What happens at a lead score threshold?`, a: `Crossing it triggers an action: routing to sales, immediate follow-up, or moving into a nurture track for lower scores. The threshold is where the continuous score becomes a concrete decision about how the lead is handled, which is what makes scoring actionable.` },
      { q: `Can you have multiple thresholds?`, a: `Yes, and it is common. Different levels can trigger different actions - a high score for instant sales follow-up, a mid score for standard routing, a low score for nurture. Multiple thresholds create a tiered handling model matched to how promising each lead is.` },
    ] },

  { slug: `lead-grading-vs-lead-scoring`, type: `glossary`, eyebrow: `Lead scoring`,
    title: `What is lead grading vs lead scoring?`,
    shortAnswer: `Lead grading rates how well a lead fits your ideal customer profile, usually as a letter grade from firmographic data, while lead scoring often measures engagement or overall conversion likelihood. Grading answers whether a lead is the right type of company; scoring answers how interested they are. Used together, grade and score prioritize both fit and intent.`,
    intro: [`Grading and scoring are two lenses on a lead: one on fit, one on behavior. Many teams use them together, as a grade plus a score.`, `The distinction mirrors fit versus engagement - grading is the fit view, expressed as a grade rather than a number.`],
    keyPoints: [`Grading rates fit against the ICP, often as a letter grade.`, `Scoring often measures engagement or conversion likelihood.`, `Grade answers "right company"; score answers "how interested".`, `Used together to prioritize on both fit and intent.`],
    sections: [
      { h: `Why it matters`, body: `Separating fit (grade) from intent (score) prevents the classic mistake of chasing an engaged but poor-fit lead or ignoring a quiet ideal one. A grade-plus-score view makes both dimensions visible, so reps prioritize leads that are both good-fit and interested.` },
      { h: `How Ardovo handles it`, body: `Ardovo scores fit and engagement separately, which is the grade-and-score model in practice. Rook enriches for the fit grade and tracks activity for the engagement score, so reps see both dimensions and work the leads that are the right company and warming up.` },
    ],
    faqs: [
      { q: `What is the difference between lead grading and lead scoring?`, a: `Grading rates how well a lead fits your ideal customer profile, typically a letter grade from firmographic data. Scoring often measures engagement or overall conversion likelihood as a number. Grade answers whether it is the right company; score answers how interested they are.` },
      { q: `Should you use both grading and scoring?`, a: `Yes - together they give a fuller picture. A high grade with a low score is a good-fit lead to nurture; a low grade with a high score is an engaged but poor fit to be cautious with. Both dimensions visible lets you prioritize leads that are right-fit and interested.` },
      { q: `Is lead grading the same as a fit score?`, a: `Essentially, yes - both measure how well a lead matches your ICP from firmographic attributes. Grading expresses it as a letter grade and scoring as a number, but they answer the same fit question. The key is keeping fit distinct from engagement, whatever you call it.` },
    ] },

  // ===================================================================
  // CLUSTER I - Territory management
  // ===================================================================
  { slug: `what-is-territory-management`, type: `glossary`, eyebrow: `Territory management`,
    title: `What is territory management?`,
    shortAnswer: `Territory management is dividing accounts and prospects among reps by defined boundaries - geography, industry, company size, or named accounts - so coverage is clear and balanced. It prevents reps from colliding on the same accounts, ensures no market is neglected, and gives each rep a focused, fair patch. Good territory management underpins routing, quotas, and coverage.`,
    intro: [`Territory management answers "who owns what?" at the market level, drawing the lines that keep reps from overlapping or leaving gaps.`, `It is the structure beneath lead routing and quota setting - the map that everything else assigns against.`],
    keyPoints: [`Divides accounts and prospects among reps by defined boundaries.`, `Boundaries can be geography, industry, size, or named accounts.`, `Prevents rep collisions and neglected markets.`, `Underpins routing, quotas, and coverage planning.`],
    sections: [
      { h: `Why it matters`, body: `Without clear territories, reps chase the same attractive accounts and ignore the rest, creating conflict and coverage gaps. Territory management gives every account a clear owner and every rep a fair, focused patch, which makes routing, quotas, and coverage all coherent.` },
      { h: `How Ardovo handles it`, body: `Ardovo models territories by geography, industry, size, or named accounts, and routes leads to the territory owner automatically. Rook flags coverage gaps and imbalances, so territories stay fair and every account has a clear, current owner.` },
    ],
    faqs: [
      { q: `What are territories based on?`, a: `Commonly geography (region, country), but also industry vertical, company size or segment, or named-account lists for strategic selling. Many teams combine dimensions - for example region plus segment. The right basis reflects how your market is structured and how reps specialize.` },
      { q: `Why is territory management important?`, a: `Because without clear boundaries, reps collide on the same desirable accounts and neglect the rest, causing conflict and coverage gaps. Territory management gives every account an owner and every rep a fair patch, which is the foundation routing, quotas, and coverage planning all rely on.` },
      { q: `How does territory management relate to lead routing?`, a: `Territories define the ownership map that routing assigns against. When a lead comes in, routing sends it to the territory owner. So territory management sets the boundaries, and lead routing applies them in real time to direct each lead to the right rep.` },
    ] },

  { slug: `how-to-set-up-sales-territories`, type: `guide`, eyebrow: `Territory management`,
    title: `How to set up sales territories`,
    shortAnswer: `Set up sales territories by choosing the dimensions that divide your market (geography, industry, size, or named accounts), balancing them for roughly equal opportunity per rep, assigning clear ownership, wiring routing to the territory owner, and reviewing as the market shifts. Balance for fairness and keep ownership unambiguous so no account is contested or neglected.`,
    intro: [`Setting up territories is drawing a fair, clear map of who owns which accounts. The hard part is balance - equal opportunity, not just equal area.`, `The other essential is unambiguous ownership, so no account has two claimants or none.`],
    steps: [
      { h: `Choose the dividing dimensions`, body: `Pick how to split the market - geography, industry, segment, or named accounts - based on how your team specializes.` },
      { h: `Balance for equal opportunity`, body: `Size territories by potential, not just count or area, so each rep has a comparable shot at quota. A huge low-value region is not equal to a small dense one.` },
      { h: `Assign clear ownership`, body: `Give every account exactly one territory owner, so nothing is contested or ownerless.` },
      { h: `Wire routing and review`, body: `Route leads to the territory owner automatically, and review the map as the market and team change.` },
    ],
    sections: [
      { h: `Balance opportunity, not just geography`, body: `The classic territory mistake is dividing by area or account count, which leaves one rep with a dense high-value patch and another with a sprawling thin one. Balance by opportunity - potential revenue - so territories are genuinely fair and quotas are achievable across the team.` },
      { h: `How Ardovo helps`, body: `Ardovo models territories on any dimension, uses account data to balance them by opportunity, and routes leads to the owner. Rook flags imbalance and coverage gaps as the market shifts, so territories stay fair and every account keeps a clear owner.` },
    ],
    faqs: [
      { q: `How do you balance sales territories?`, a: `Balance by opportunity - potential revenue and account value - not just geography or account count. A rep with a sprawling low-value region is not equal to one with a dense high-value patch. Sizing territories by potential makes quotas fair and achievable across the team.` },
      { q: `What dimensions should territories use?`, a: `Choose based on how your team specializes: geography for field or regional teams, industry for vertical specialists, company size or segment for tiered selling, or named-account lists for strategic accounts. Many teams combine dimensions, like region plus segment.` },
      { q: `How often should you review territories?`, a: `Whenever the market or team changes meaningfully - new hires, shifting demand, or growth in a segment - and at least annually. Territories drift out of balance as accounts grow and markets shift, so periodic review keeps coverage fair and current.` },
    ] },

  { slug: `what-is-a-sales-territory`, type: `glossary`, eyebrow: `Territory management`,
    title: `What is a sales territory?`,
    shortAnswer: `A sales territory is the defined set of accounts and prospects a rep is responsible for, bounded by geography, industry, company size, or a named-account list. It gives the rep a clear, focused patch to own and prevents overlap with others. Territories are the units that quotas, routing, and coverage are organized around.`,
    intro: [`A territory is a rep's assigned patch of the market - the accounts they own and are accountable for.`, `Defining territories clearly is what makes coverage, quota, and routing coherent instead of a scramble.`],
    keyPoints: [`The set of accounts and prospects a rep owns.`, `Bounded by geography, industry, size, or named accounts.`, `Gives reps a focused patch and prevents overlap.`, `The unit quotas, routing, and coverage organize around.`],
    sections: [
      { h: `Why it matters`, body: `A clear territory gives a rep focus and accountability, and gives the organization clean coverage with no gaps or collisions. It is the boundary that makes it obvious who owns each account and who is responsible for each part of the market.` },
      { h: `How Ardovo handles it`, body: `Ardovo defines territories on any dimension and ties account ownership and lead routing to them. Rook keeps territory assignments current and flags gaps or overlaps, so each rep's patch stays clear and coverage stays complete.` },
    ],
    faqs: [
      { q: `What defines a sales territory?`, a: `A boundary rule - a geography, an industry, a company-size segment, or a named-account list - that assigns a specific set of accounts and prospects to a rep. The rep owns everything within that boundary, which gives them a focused patch and prevents overlap with other reps.` },
      { q: `Why give reps defined territories?`, a: `Focus and accountability. A defined territory tells a rep exactly which accounts are theirs to own, and tells the organization who is responsible for each part of the market. That clarity prevents collisions and coverage gaps and makes quotas and routing coherent.` },
      { q: `Can a territory be non-geographic?`, a: `Yes. Territories can be based on industry vertical, company size or segment, or a named-account list rather than geography. Many modern teams use non-geographic territories - a rep who owns all mid-market SaaS accounts, for instance - to match how they specialize.` },
    ] },

  { slug: `how-to-balance-sales-territories-fairly`, type: `guide`, eyebrow: `Territory management`,
    title: `How to balance sales territories`,
    shortAnswer: `Balance sales territories by measuring each one's opportunity - account count, potential revenue, and existing pipeline - comparing them to find imbalance, then reallocating accounts so each rep has a comparable shot at quota. Balance on opportunity rather than raw geography, and rebalance periodically, because territories drift as accounts grow and markets shift.`,
    intro: [`Balanced territories are fair territories: each rep has a comparable chance to hit quota. Imbalance breeds resentment and missed numbers.`, `Balancing means measuring opportunity, not area, and reallocating to even it out - then doing it again as things change.`],
    steps: [
      { h: `Measure each territory's opportunity`, body: `Quantify account count, potential revenue, and current pipeline per territory, so imbalance is visible in numbers.` },
      { h: `Compare and find the gaps`, body: `Rank territories by opportunity to see which reps are over- or under-resourced relative to quota.` },
      { h: `Reallocate accounts`, body: `Move accounts between territories to even out opportunity, minimizing disruption to existing relationships where possible.` },
      { h: `Rebalance periodically`, body: `Recheck as accounts grow and markets shift, since even a balanced map drifts over time.` },
    ],
    sections: [
      { h: `Balance on opportunity, and expect drift`, body: `Two principles: balance by potential revenue, not geography or count, so fairness is real; and accept that territories drift as accounts grow and demand shifts, so balancing is periodic, not one-time. A map balanced last year is likely uneven now.` },
      { h: `How Ardovo helps`, body: `Ardovo measures territory opportunity from live account and pipeline data, surfaces imbalance, and models reallocation. Rook flags when territories have drifted out of balance, so you rebalance on evidence rather than complaints, keeping quotas fair as the market moves.` },
    ],
    faqs: [
      { q: `What does it mean to balance a territory?`, a: `To size territories so each rep has comparable opportunity - potential revenue and pipeline - and thus a fair shot at quota. Balancing on opportunity rather than area or account count is what makes territories genuinely equitable and quotas achievable across the team.` },
      { q: `Why do territories become unbalanced?`, a: `Because accounts grow, markets shift, and reps develop pipeline at different rates, so even a well-balanced map drifts over time. A territory that was fair last year can be a high-value goldmine or a thin patch now, which is why rebalancing is periodic rather than one-time.` },
      { q: `How do you rebalance without disrupting relationships?`, a: `Reallocate at the margins - move unworked or early-stage accounts rather than active deals - and time changes to natural breakpoints like the start of a period. Minimizing disruption to live relationships while evening out opportunity keeps balance fair without damaging deals in flight.` },
    ] },

  { slug: `what-is-territory-planning`, type: `glossary`, eyebrow: `Territory management`,
    title: `What is territory planning?`,
    shortAnswer: `Territory planning is the process of designing how a market is divided among reps to maximize coverage and balance opportunity, deciding the dividing dimensions, sizing territories by potential, and assigning them to reps. It happens before a selling period and sets the structure that routing, quotas, and coverage run on for that period.`,
    intro: [`Territory planning is the upfront design work that sets the map for a selling period - a strategic exercise, not a live routing decision.`, `Good planning balances opportunity and coverage before the period starts, so the team runs on a fair, complete map rather than fixing it mid-flight.`],
    keyPoints: [`Designing how a market is divided among reps for a period.`, `Decides dividing dimensions and sizes territories by potential.`, `Aims to maximize coverage and balance opportunity.`, `Sets the structure routing, quotas, and coverage run on.`],
    sections: [
      { h: `Why it matters`, body: `The territory plan determines whether the whole market is covered and whether reps have fair, achievable patches. A good plan set before the period prevents the gaps, overlaps, and imbalances that otherwise get discovered painfully mid-quarter.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports territory planning with account and opportunity data to size and balance territories before a period, then operationalizes the plan through routing and ownership. Rook flags where the plan leaves gaps, so coverage is complete from day one.` },
    ],
    faqs: [
      { q: `When does territory planning happen?`, a: `Before a selling period - typically at the start of a fiscal year or when the team restructures - as an upfront design exercise. It sets the map that routing, quotas, and coverage run on for the period, so it is strategic planning rather than a live, moment-to-moment decision.` },
      { q: `What goes into a territory plan?`, a: `Choosing the dividing dimensions (geography, industry, size, named accounts), sizing territories by opportunity for balance, assigning them to reps, and confirming complete coverage with no gaps or overlaps. The plan then becomes the structure routing and quotas are built against.` },
      { q: `How is territory planning different from territory management?`, a: `Planning is the upfront design of the territory map for a period; management is the ongoing operation and adjustment of it. Planning sets the structure; management maintains balance, handles changes, and keeps coverage clean as the market shifts during the period.` },
    ] },

  { slug: `how-to-assign-territories-to-reps`, type: `guide`, eyebrow: `Territory management`,
    title: `How to assign territories to reps`,
    shortAnswer: `Assign territories to reps by matching each balanced territory to a rep's strengths and experience, ensuring every account has exactly one owner, documenting the assignments clearly, and wiring routing so leads flow to the territory owner. Match reps to territories deliberately, keep ownership unambiguous, and make the assignments visible so no account is contested.`,
    intro: [`Assigning territories is the step where a balanced map meets the actual team - matching reps to patches and locking in ownership.`, `The essentials are deliberate matching (fit rep to territory), unambiguous ownership (one owner per account), and clear routing that follows the assignments.`],
    steps: [
      { h: `Match reps to territories`, body: `Assign each territory to a rep whose experience and strengths fit it - a vertical specialist to an industry patch, a senior rep to strategic accounts.` },
      { h: `Ensure one owner per account`, body: `Confirm every account has exactly one territory owner, so nothing is contested or ownerless.` },
      { h: `Document the assignments`, body: `Make the territory-to-rep map visible to the whole team, so ownership is clear and disputes are avoided.` },
      { h: `Wire routing to the owner`, body: `Configure lead routing to send each lead to its territory owner, so the assignments drive real-time flow.` },
    ],
    sections: [
      { h: `One owner per account, made visible`, body: `The failures in territory assignment are contested accounts (two reps claim one) and orphaned accounts (nobody owns them). Both come from unclear assignment. Ensure exactly one owner per account and publish the map, so ownership is unambiguous and routing has a clear target.` },
      { h: `How Ardovo helps`, body: `Ardovo ties account ownership and lead routing to territory assignments, so every account has one clear owner and leads flow to them automatically. Rook flags contested or orphaned accounts, so the assignment map stays clean as reps and territories change.` },
    ],
    faqs: [
      { q: `How do you match reps to territories?`, a: `Deliberately, by fit: assign vertical specialists to industry patches, senior reps to strategic or complex territories, and balance experience across the map. Matching a rep's strengths to a territory's needs improves coverage quality, not just fairness of size.` },
      { q: `What goes wrong in territory assignment?`, a: `Contested accounts, where two reps both claim ownership, and orphaned accounts, where nobody does. Both stem from unclear assignment and cause conflict or neglect. Ensuring exactly one owner per account and publishing the map prevents both problems.` },
      { q: `How do territory assignments connect to routing?`, a: `Routing uses the assignment map to direct each lead to its territory owner in real time. So assignment sets who owns what, and routing applies it automatically as leads arrive. Keeping assignments current and unambiguous is what lets routing send leads to the right rep.` },
    ] },

  // ===================================================================
  // CLUSTER J - Sales automation / workflows / triggers / tasks
  // ===================================================================
  { slug: `crm-automation-examples`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `CRM automation examples that save hours`,
    shortAnswer: `Practical CRM automation examples include auto-assigning leads on arrival, creating follow-up tasks after meetings, updating deal stages from activity, sending internal alerts on key events, logging emails and calls automatically, and enriching records on creation. The best automations remove repetitive busywork - data entry, reminders, handoffs - so reps spend time selling instead of maintaining the CRM.`,
    intro: [`CRM automation earns its keep by deleting the small repetitive tasks that eat a rep's day: logging, reminding, assigning, updating.`, `The examples below are high-value because they target work that is frequent, rule-based, and better done by the system than a person.`],
    steps: [
      { h: `Auto-assign leads on arrival`, body: `Route and assign each new lead instantly by rule, so follow-up starts fast and no lead sits unowned.` },
      { h: `Create follow-up tasks automatically`, body: `Generate the next task after a meeting, stage change, or set interval, so nothing slips through the cracks.`, bullets: [`Task after every completed meeting`, `Reminder when a deal goes quiet`, `Renewal task ahead of contract end`] },
      { h: `Update deal stages from activity`, body: `Advance or flag deals based on real activity, so the pipeline reflects reality without manual updating.` },
      { h: `Alert on key events`, body: `Notify the right person when a deal stalls, a high-value lead arrives, or an account shows buying signals.` },
    ],
    sections: [
      { h: `Automate the frequent and rule-based`, body: `The automations worth building target work that is repetitive and follows clear rules: assignment, reminders, logging, stage updates, alerts. Leave judgment to reps and hand the mechanical work to the system. That split is what frees selling time without losing the human touch where it matters.` },
      { h: `How Ardovo helps`, body: `Ardovo ships these automations ready to run, and Rook executes the busywork - assigning leads, creating tasks, updating stages, logging activity, and alerting the right people - so reps inherit an automated CRM instead of configuring one. The mechanical work happens on its own.` },
    ],
    faqs: [
      { q: `What are the best CRM automations to start with?`, a: `The high-frequency, rule-based ones: auto-assigning leads, creating follow-up tasks after meetings, logging emails and calls, updating deal stages from activity, and alerting on key events. These target daily busywork, so they free the most selling time for the least setup effort.` },
      { q: `What should not be automated in a CRM?`, a: `Judgment work - qualifying a nuanced deal, crafting a strategic message, reading a relationship. Automate the mechanical and rule-based; keep the human where nuance matters. Over-automating judgment produces robotic outreach and bad decisions that erode trust with buyers.` },
      { q: `How much time can CRM automation save?`, a: `Reps often spend a large share of their week on non-selling admin - logging, updating, reminding. Automating that work can return meaningful hours weekly per rep. The exact savings depend on how much manual busywork exists today, but the frequent, rule-based tasks add up fast.` },
    ] },

  { slug: `sales-automation-ideas`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `Sales automation ideas for busy teams`,
    shortAnswer: `High-value sales automation ideas include instant lead routing, automated follow-up sequences, meeting-to-task creation, deal-stage nudges when activity stalls, auto-logged emails and calls, renewal and expansion reminders, and enrichment on record creation. Focus automation on the repetitive work between selling moments, so reps spend their time in conversations, not maintaining records.`,
    intro: [`Sales automation is about reclaiming the hours reps lose to the connective tissue of selling - the logging, reminding, and updating between real conversations.`, `The ideas here all target that busywork, chosen because they are frequent, rule-based, and reliably better handled by the system.`],
    steps: [
      { h: `Route and enrich leads instantly`, body: `Enrich and assign each lead the moment it arrives, so reps get complete, prioritized leads without waiting.` },
      { h: `Automate follow-up cadence`, body: `Run sequences that send timed follow-ups and surface replies, so no prospect goes cold from a missed touch.` },
      { h: `Turn meetings into next steps`, body: `Auto-create the follow-up task and log the meeting, so the next action is set before the rep leaves the call.` },
      { h: `Nudge stalled deals and renewals`, body: `Flag deals that go quiet and surface upcoming renewals and expansion moments, so nothing valuable is forgotten.` },
    ],
    sections: [
      { h: `Automate between the selling moments`, body: `The real conversations - discovery, negotiation, closing - stay human. Automation targets the connective work around them: routing, logging, reminding, nudging. Automating that tissue is what lets reps spend more of their week actually selling instead of feeding the CRM.` },
      { h: `How Ardovo helps`, body: `Ardovo runs these automations natively, and Rook does the connective busywork - routing, sequencing, logging, and nudging - so reps stay in conversations while the CRM maintains itself. The system handles the between-moments work that used to eat the day.` },
    ],
    faqs: [
      { q: `Where does sales automation add the most value?`, a: `In the repetitive connective work between selling moments: routing leads, running follow-up cadence, logging activity, and nudging stalled deals and renewals. The real conversations stay human, but automating the tissue around them reclaims hours reps otherwise lose to admin.` },
      { q: `What is the risk of over-automating sales?`, a: `Robotic, impersonal outreach and misapplied judgment. Automation should handle mechanical, rule-based work, not the nuanced conversations and strategic decisions that require a human read. Over-automating the human parts erodes trust with buyers and produces worse outcomes than doing them by hand.` },
      { q: `How do you prioritize which automations to build?`, a: `Target work that is frequent and rule-based first, since it delivers the most time saved for the least risk. Auto-routing, activity logging, and follow-up tasks recur constantly and follow clear rules, so they pay back immediately compared to automating rare or judgment-heavy work.` },
    ] },

  { slug: `what-is-sales-automation`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is sales automation?`,
    shortAnswer: `Sales automation is using software to handle the repetitive, rule-based tasks in a sales process - routing leads, logging activity, creating follow-up tasks, updating records, and sending alerts - so reps spend more time selling. It targets mechanical busywork, not the human judgment of qualifying and negotiating, freeing reps for the conversations that actually win deals.`,
    intro: [`Sales automation offloads the mechanical parts of selling to software, so the humans focus on the human parts.`, `The line that matters is mechanical versus judgment: automate the first, protect the second, and you gain time without losing the relationship.`],
    keyPoints: [`Software handling repetitive, rule-based sales tasks.`, `Covers routing, logging, task creation, updates, and alerts.`, `Targets busywork, not qualifying and negotiating.`, `Frees rep time for the conversations that win deals.`],
    sections: [
      { h: `Why it matters`, body: `Reps lose a large share of their week to non-selling admin. Sales automation returns those hours by handling the mechanical work automatically, which raises selling capacity without adding headcount - as long as it stays out of the judgment work that needs a human.` },
      { h: `How Ardovo handles it`, body: `Ardovo automates the mechanical work through Rook, which routes leads, logs activity, creates tasks, updates records, and alerts the right people. Reps get the time back for real conversations, while the judgment work stays firmly in their hands.` },
    ],
    faqs: [
      { q: `What tasks can sales automation handle?`, a: `Repetitive, rule-based work: routing and assigning leads, logging emails and calls, creating follow-up tasks, updating deal stages from activity, sending alerts, and enriching records. These recur constantly and follow clear rules, making them ideal for software to handle.` },
      { q: `What should sales automation not do?`, a: `The judgment work - qualifying a nuanced deal, crafting strategic messaging, reading a relationship, negotiating. Automation should free reps for these human moments, not replace them. Automating judgment produces robotic outreach and poor decisions that damage trust with buyers.` },
      { q: `Does sales automation replace salespeople?`, a: `No - it removes their busywork so they sell more. Automation handles the mechanical tasks that consume rep time, letting people focus on the conversations and judgment that actually win deals. It raises each rep's capacity rather than replacing the human role in selling.` },
    ] },

  { slug: `what-is-a-crm-workflow`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is a CRM workflow?`,
    shortAnswer: `A CRM workflow is an automated sequence of actions triggered by an event or condition - when a lead is created, a deal changes stage, or a date arrives, the workflow runs steps like assigning an owner, creating a task, updating a field, or sending an alert. Workflows encode a repeatable process so it runs consistently without manual effort.`,
    intro: [`A workflow is the if-this-then-that of a CRM: a trigger fires, and a defined series of actions follows automatically.`, `It is how a team turns a manual process into a reliable, consistent one that runs the same way every time.`],
    keyPoints: [`An automated sequence triggered by an event or condition.`, `Runs actions like assigning, tasking, updating, and alerting.`, `Encodes a repeatable process for consistent execution.`, `Removes manual effort and the errors that come with it.`],
    sections: [
      { h: `Why it matters`, body: `Manual processes are inconsistent - people forget steps, do them differently, or skip them under pressure. A workflow runs the same steps every time a trigger fires, making the process reliable and freeing people from remembering to execute it.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports workflows that trigger on events and run multi-step actions, and Rook can build and run them from a plain-language description. Processes execute consistently without anyone remembering to trigger them, and Rook handles the steps in between.` },
    ],
    faqs: [
      { q: `What can a CRM workflow do?`, a: `Run a sequence of actions when a trigger fires: assign an owner, create a task, update a field, change a stage, send an alert or email, or start another process. Workflows chain these steps so a whole process executes automatically from a single triggering event or condition.` },
      { q: `What is the difference between a workflow and automation?`, a: `Automation is the broad idea of software doing work automatically; a workflow is a specific automated sequence tied to a trigger. A workflow is one concrete implementation of automation - the defined trigger-and-actions unit that encodes a particular process.` },
      { q: `Why use workflows instead of manual processes?`, a: `Consistency and reliability. Manual processes get done differently by different people, or skipped under pressure. A workflow runs the exact same steps every time its trigger fires, so the process is dependable and no one has to remember to execute it, which removes both effort and error.` },
    ] },

  { slug: `how-to-build-a-crm-workflow`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to build a CRM workflow`,
    shortAnswer: `Build a CRM workflow by defining the trigger (the event or condition that starts it), specifying the actions in order, adding conditions so it only runs when it should, testing on sample records, and monitoring after launch. Start with a clear trigger and a narrow condition, test before enabling, and keep workflows simple so they stay reliable.`,
    intro: [`Building a workflow is translating a manual process into a trigger and a set of actions the system runs automatically.`, `The craft is in precision: a well-scoped trigger and condition so the workflow fires exactly when intended, and a test before it touches real records.`],
    steps: [
      { h: `Define the trigger`, body: `Decide the exact event or condition that starts the workflow - a lead created, a stage changed, a date reached - so it fires at the right moment.` },
      { h: `Specify the actions in order`, body: `List the steps the workflow runs: assign, create a task, update a field, send an alert. Keep the sequence clear and minimal.` },
      { h: `Add conditions to scope it`, body: `Constrain when it runs - only for certain segments or values - so it does not fire on records it should not touch.` },
      { h: `Test then monitor`, body: `Run it against sample records to confirm it behaves, then watch it after launch for unexpected firing.` },
    ],
    sections: [
      { h: `Keep workflows simple and tested`, body: `Complex, sprawling workflows are hard to reason about and break in surprising ways. Favor simple, single-purpose workflows with a clear trigger and tight conditions, and always test on samples before enabling. A workflow that fires wrongly on real records is worse than no automation.` },
      { h: `How Ardovo helps`, body: `Ardovo lets you build workflows with clear triggers, conditions, and actions, and Rook can assemble one from a plain-language description and test it before it goes live. Complexity stays manageable, and the workflow fires exactly when intended instead of misbehaving on real data.` },
    ],
    faqs: [
      { q: `What is the first step in building a workflow?`, a: `Defining the trigger - the exact event or condition that starts it, like a lead being created or a deal changing stage. A precise trigger ensures the workflow fires at the right moment. Everything else follows from getting the starting condition clear.` },
      { q: `Why test a workflow before enabling it?`, a: `Because a workflow that fires wrongly acts on real records automatically - misassigning, mis-updating, or spamming alerts at scale. Testing on sample records confirms it behaves as intended before it can do damage, which is far cheaper than untangling a misfiring workflow in production.` },
      { q: `Should workflows be simple or complex?`, a: `Simple. Single-purpose workflows with a clear trigger and tight conditions are easy to reason about, test, and maintain. Sprawling, multi-branch workflows break in surprising ways and are hard to debug. Favor several simple workflows over one complex one.` },
    ] },

  { slug: `what-is-a-workflow-trigger`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is a workflow trigger?`,
    shortAnswer: `A workflow trigger is the event or condition that starts an automated workflow - a record being created or updated, a field reaching a value, a stage changing, or a date arriving. The trigger defines exactly when the workflow runs. Choosing a precise trigger is what makes automation fire at the right moment instead of too often or not enough.`,
    intro: [`The trigger is the starting gun of a workflow: nothing runs until it fires.`, `Its precision determines whether the automation is helpful or a nuisance - a vague trigger fires too much, a wrong one misses the moment entirely.`],
    keyPoints: [`The event or condition that starts a workflow.`, `Can be a record change, field value, stage change, or date.`, `Defines exactly when the automation runs.`, `Precision determines whether it fires at the right moments.`],
    sections: [
      { h: `Why it matters`, body: `The trigger is where automation succeeds or annoys. A precise trigger fires exactly when the process should run; a loose one spams tasks and alerts, and a wrong one never fires when needed. Getting the trigger right is most of getting the workflow right.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports triggers on record events, field values, stage changes, and dates, with conditions to scope them tightly. Rook helps pick the right trigger from a described intent, so workflows fire at the intended moments rather than too broadly.` },
    ],
    faqs: [
      { q: `What kinds of triggers can start a workflow?`, a: `Record events (created or updated), field conditions (a value reaching a threshold), stage changes (a deal moving forward), and time-based triggers (a date arriving or an interval passing). The trigger type you choose defines exactly what moment sets the automation running.` },
      { q: `Why does trigger precision matter?`, a: `Because a loose trigger fires too often - spamming tasks and alerts - while a wrong one never fires when needed. A precise trigger, often paired with conditions, ensures the workflow runs at exactly the right moments. Getting the trigger right is most of getting the automation right.` },
      { q: `What is the difference between a trigger and a condition?`, a: `The trigger is the event that starts evaluating the workflow; conditions further constrain whether it actually runs. For example, a trigger might be any deal update, with a condition that it only proceeds for deals over a certain value. Trigger starts it, conditions scope it.` },
    ] },

  { slug: `how-to-set-up-workflow-triggers`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to set up workflow triggers`,
    shortAnswer: `Set up workflow triggers by choosing the precise event or condition that should start the workflow, adding conditions to narrow when it fires, avoiding overlapping triggers that cause double-firing, and testing that it runs at the right moments and not others. A precise, well-scoped trigger is the difference between helpful automation and a flood of misfired actions.`,
    intro: [`Setting up a trigger is deciding the exact moment automation should run - and, just as important, the moments it should not.`, `The common failures are triggers that are too broad (constant firing) and overlapping triggers that double-fire, both fixed by precision and testing.`],
    steps: [
      { h: `Choose the precise starting event`, body: `Pick the exact event or condition - a specific stage change, a field reaching a value, a date - that should start the workflow.` },
      { h: `Narrow with conditions`, body: `Add conditions so the workflow only runs for the right records, not every one that hits the trigger event.` },
      { h: `Avoid overlapping triggers`, body: `Check that multiple workflows do not fire on the same event in conflicting ways, causing double-actions.` },
      { h: `Test the firing`, body: `Confirm the trigger fires when intended and stays quiet otherwise, before enabling it on real data.` },
    ],
    sections: [
      { h: `Too-broad and overlapping triggers are the traps`, body: `Most trigger problems are one of two kinds: a trigger so broad it fires constantly, flooding reps with tasks and alerts, or multiple triggers overlapping on one event so actions double up. Tight conditions fix the first; checking for overlap fixes the second. Test for both before going live.` },
      { h: `How Ardovo helps`, body: `Ardovo scopes triggers with conditions and flags overlapping workflows that would double-fire, and Rook tests firing before a workflow goes live. Triggers fire at the intended moments only, so automation helps rather than floods reps with misfired actions.` },
    ],
    faqs: [
      { q: `How do you stop a workflow from firing too often?`, a: `Narrow the trigger with conditions so it only runs for the right records, not every one that hits the triggering event. A trigger on any deal update fires constantly; the same trigger with a condition limiting it to deals crossing a value threshold fires only when it should.` },
      { q: `What causes a workflow to double-fire?`, a: `Overlapping triggers - multiple workflows set to run on the same event in conflicting ways - so a single change kicks off duplicate actions. Checking for trigger overlap across your workflows, and testing, prevents the double-actions that confuse reps and corrupt data.` },
      { q: `Should you test triggers before enabling them?`, a: `Always. A misconfigured trigger acts on real records automatically and at scale. Testing confirms it fires when intended and stays quiet otherwise, catching too-broad or overlapping triggers before they flood reps or double-fire. Testing is cheap; a misfiring live trigger is not.` },
    ] },

  { slug: `what-is-task-automation`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is task automation?`,
    shortAnswer: `Task automation is having the CRM create and assign follow-up tasks automatically based on triggers - after a meeting, when a deal stalls, before a renewal, or at a set interval - so reps never rely on memory for their next steps. It ensures consistent follow-up and prevents the dropped balls that cost deals, without a rep manually setting every reminder.`,
    intro: [`Task automation makes sure the next step always exists, generated by the system rather than a rep's memory.`, `It targets one of the most common causes of lost deals: a follow-up that simply never happened because no one remembered to set it.`],
    keyPoints: [`The CRM creates and assigns follow-up tasks automatically.`, `Triggered by meetings, stalls, renewals, or intervals.`, `Ensures consistent follow-up without relying on memory.`, `Prevents the dropped balls that cost deals.`],
    sections: [
      { h: `Why it matters`, body: `Deals are lost less to bad selling than to missed follow-up - a next step that never got scheduled. Task automation guarantees the next action exists, turning reliable follow-up from a matter of discipline into a property of the system.` },
      { h: `How Ardovo handles it`, body: `Ardovo auto-creates follow-up tasks on meetings, stalls, and renewals, and Rook assigns and surfaces them at the right time. The next step always exists without a rep setting it, so follow-up stays consistent and nothing valuable is forgotten.` },
    ],
    faqs: [
      { q: `What triggers automated tasks?`, a: `Common triggers include a completed meeting (create a follow-up), a deal going quiet (create a re-engagement task), an approaching renewal (create a renewal task), and set intervals (periodic check-ins). Any repeatable moment that should prompt a next step can trigger an automated task.` },
      { q: `Why automate follow-up tasks?`, a: `Because missed follow-up is a leading cause of lost deals, and it happens when a next step relies on a rep's memory. Task automation guarantees the next action exists by having the system create it, turning consistent follow-up from a discipline problem into a system property.` },
      { q: `Does task automation replace a rep's planning?`, a: `No - it backstops it. Reps still plan their strategy and priorities, but automation ensures the mechanical next steps are always created so none is forgotten. It removes the risk of a dropped ball while leaving the judgment of how to work each task to the rep.` },
    ] },

  { slug: `how-to-automate-follow-up-tasks`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to automate follow-up tasks`,
    shortAnswer: `Automate follow-up tasks by identifying the moments that should always prompt a next step - after meetings, when deals stall, before renewals - creating rules that generate and assign the task automatically, setting sensible due dates, and surfacing tasks so they are actually done. Automate the creation of next steps so follow-up never depends on a rep remembering.`,
    intro: [`Automating follow-up tasks means the CRM, not the rep's memory, guarantees the next step exists after every key moment.`, `The work is identifying those moments and wiring each to an automatic, well-timed, clearly-owned task.`],
    steps: [
      { h: `Identify the follow-up moments`, body: `List the events that should always trigger a next step: completed meetings, stalled deals, upcoming renewals, and set intervals.` },
      { h: `Create tasks automatically`, body: `Wire each moment to a rule that generates and assigns the follow-up task to the right owner without manual effort.` },
      { h: `Set sensible due dates`, body: `Give each automated task a due date matched to its urgency, so follow-up happens on the right timeline.` },
      { h: `Surface tasks so they get done`, body: `Make tasks visible in the rep's daily flow, so automation creates them and reps actually complete them.` },
    ],
    sections: [
      { h: `Creating the task is not enough - surface it`, body: `Automated tasks that pile up unseen in a list do not prevent dropped balls. The automation has to surface tasks in the rep's daily flow with clear due dates, so they are actually done. Creation plus visibility is what turns task automation into reliable follow-up.` },
      { h: `How Ardovo helps`, body: `Ardovo auto-creates follow-up tasks at every key moment, assigns them, sets due dates, and surfaces them in the rep's flow. Rook nudges on overdue tasks, so automation does not just generate next steps but ensures they get done, closing the follow-up gap end to end.` },
    ],
    faqs: [
      { q: `What moments should trigger an automated follow-up task?`, a: `The ones that should always prompt a next step: a completed meeting, a deal going quiet, an approaching renewal, and set check-in intervals. Wiring each of these to an automatic task guarantees a next step exists at every point where follow-up matters most.` },
      { q: `Why do automated tasks sometimes still get missed?`, a: `Because creating a task is not the same as surfacing it - tasks that pile up unseen in a list get ignored. Effective task automation surfaces tasks in the rep's daily flow with clear due dates and nudges on overdue ones, so they are actually completed, not just created.` },
      { q: `How do you set due dates on automated tasks?`, a: `Match the due date to the task's urgency: a post-meeting follow-up within a day or two, a stalled-deal nudge after a defined quiet period, a renewal task well ahead of the contract end. Sensible timing ensures follow-up happens on the right cadence rather than too early or late.` },
    ] },

  { slug: `how-to-automate-data-entry`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to automate CRM data entry`,
    shortAnswer: `Automate CRM data entry by capturing activity automatically (emails, calls, meetings logged without typing), enriching records from external data instead of manual research, updating fields and stages from real signals, and reserving manual entry for judgment fields only. The goal is a CRM that fills itself from what reps already do, so they stop typing and start selling.`,
    intro: [`Manual data entry is the tax reps hate most and skip most, which is why CRMs full of gaps are so common.`, `Automating it means the CRM captures what happens automatically - activity, enrichment, updates - so reps rarely type anything at all.`],
    steps: [
      { h: `Capture activity automatically`, body: `Log emails, calls, and meetings without manual entry, so the interaction history fills itself from what reps already do.` },
      { h: `Enrich instead of researching`, body: `Fill company and contact fields from external data automatically, so reps never look up firmographics by hand.` },
      { h: `Update fields from real signals`, body: `Advance stages and update fields based on activity and events, so records stay current without manual editing.` },
      { h: `Reserve manual entry for judgment`, body: `Ask reps only for the fields no system can capture - use case, budget, next step - and automate everything else.` },
    ],
    sections: [
      { h: `Let the CRM fill itself`, body: `The best data entry is none. Activity capture, enrichment, and signal-based updates let the CRM populate itself from what reps already do and what external data already knows. Manual entry shrinks to the handful of judgment fields only a human can supply, which is the only entry reps should face.` },
      { h: `How Ardovo helps`, body: `Ardovo captures activity, enriches records, and updates fields from real signals automatically, so the CRM fills itself. Rook does the entry busywork, leaving reps only the judgment fields, so data stays complete and current without the manual tax that leaves other CRMs full of gaps.` },
    ],
    faqs: [
      { q: `Can CRM data entry be fully automated?`, a: `Nearly - activity capture, enrichment, and signal-based updates fill most fields automatically from what reps do and what external data knows. The exception is judgment fields like use case and budget that only a human can supply. Automate everything else, and manual entry shrinks to a minimum.` },
      { q: `Why do reps skip manual data entry?`, a: `Because it is tedious, time-consuming, and feels like a tax on selling. That is exactly why CRMs full of gaps are so common. Automating entry through activity capture and enrichment removes the tax, so records fill in without depending on reps to type what they would rather skip.` },
      { q: `What data entry still needs a human?`, a: `Judgment fields no system can capture: the customer's use case, budget, decision process, pain, and the rep's chosen next step. These require a human read and cannot be enriched or auto-captured. Reserving manual entry for just these keeps the burden minimal and the data meaningful.` },
    ] },

  { slug: `how-to-automate-deal-stage-updates`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to automate deal stage updates`,
    shortAnswer: `Automate deal stage updates by defining what activity or milestone marks each stage transition, letting the CRM advance or flag deals based on real signals, alerting reps to confirm ambiguous moves, and catching stalled deals automatically. Base updates on real activity, not wishful data entry, so the pipeline reflects reality and the forecast stays honest.`,
    intro: [`Manually updated stages drift into fiction: reps forget to advance deals, or park them optimistically. The pipeline stops matching reality.`, `Automating stage updates from real activity keeps the pipeline honest, which is the foundation of a trustworthy forecast.`],
    steps: [
      { h: `Define stage-transition signals`, body: `Decide what real activity marks each transition - a proposal sent, a contract in legal - so updates are grounded in evidence.` },
      { h: `Advance or flag from signals`, body: `Let the CRM move deals or flag them for review when the defining activity happens, rather than waiting on manual entry.` },
      { h: `Confirm ambiguous moves`, body: `For transitions that need judgment, prompt the rep to confirm rather than moving silently, keeping accuracy high.` },
      { h: `Catch stalls automatically`, body: `Flag deals sitting too long in a stage or with no recent activity, so the pipeline surfaces its own risks.` },
    ],
    sections: [
      { h: `Base stages on activity, not optimism`, body: `The reason pipelines become fiction is manual stages set by hope or forgotten entirely. Grounding stage updates in real activity - what actually happened - keeps the pipeline honest without relying on reps to update accurately. An honest pipeline is what makes the forecast trustworthy.` },
      { h: `How Ardovo helps`, body: `Ardovo updates deal stages from real activity and flags stalls automatically, and Rook confirms ambiguous moves with the rep. The pipeline reflects what is actually happening rather than wishful entry, so the forecast built on it is honest and reps trust the numbers.` },
    ],
    faqs: [
      { q: `Why automate deal stage updates?`, a: `Because manually updated stages drift into fiction - reps forget to advance deals or park them optimistically, so the pipeline stops matching reality. Automating updates from real activity keeps stages honest without relying on manual entry, which is the foundation of a trustworthy forecast.` },
      { q: `What should deal stage updates be based on?`, a: `Real activity and milestones - a proposal sent, a contract in legal, a meeting held - not wishful data entry. Grounding transitions in evidence of what actually happened keeps the pipeline honest, whereas stages set by hope produce a forecast nobody can trust.` },
      { q: `Should all stage updates be automatic?`, a: `Not entirely - some transitions need human judgment. The best approach automates clear-cut moves from unambiguous signals and prompts the rep to confirm ambiguous ones, rather than moving deals silently. That balance keeps stages both current and accurate.` },
    ] },

  { slug: `what-is-a-trigger-based-workflow`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is a trigger-based workflow?`,
    shortAnswer: `A trigger-based workflow is automation that runs in response to a specific event or condition rather than on a fixed schedule - when a record changes, a field hits a value, or a stage advances, the workflow fires and runs its actions. It is the event-driven model behind most CRM automation, reacting to what happens in real time instead of running at set times.`,
    intro: [`Trigger-based means event-driven: the workflow waits for something to happen, then acts, as opposed to running on a clock.`, `This real-time responsiveness is what makes automation feel immediate - a lead routes the instant it arrives, not in the next batch run.`],
    keyPoints: [`Automation that runs in response to an event or condition.`, `Event-driven rather than schedule-driven.`, `Reacts in real time to record and field changes.`, `The dominant model behind CRM automation.`],
    sections: [
      { h: `Why it matters`, body: `Event-driven automation acts the moment something happens, which is what enables instant lead routing, immediate alerts, and real-time updates. A scheduled batch model would delay all of these; trigger-based workflows make the CRM responsive as events unfold.` },
      { h: `How Ardovo handles it`, body: `Ardovo's workflows are trigger-based, firing on record events, field conditions, and stage changes in real time. Rook builds and runs them from described intent, so automation reacts the instant something happens rather than waiting for a scheduled pass.` },
    ],
    faqs: [
      { q: `What is the difference between trigger-based and scheduled automation?`, a: `Trigger-based automation runs in response to an event the moment it happens - a record changes, so the workflow fires. Scheduled automation runs at fixed times regardless of events. Trigger-based is real-time and responsive; scheduled is periodic. Most CRM automation is trigger-based for immediacy.` },
      { q: `Why is event-driven automation useful?`, a: `Because it acts instantly when something happens - routing a lead the second it arrives, alerting on a stall as it occurs, updating a field the moment a signal fires. That immediacy is what makes automation feel responsive, which a periodic scheduled model cannot match.` },
      { q: `Can workflows also run on a schedule?`, a: `Yes - some automation is time-based, running at set intervals or dates, which suits periodic tasks like weekly reports or renewal checks. But most CRM automation is trigger-based because it reacts to events in real time, and many setups combine both models as needed.` },
    ] },

  { slug: `how-to-automate-lead-nurturing`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to automate lead nurturing`,
    shortAnswer: `Automate lead nurturing by segmenting leads not yet ready to buy, enrolling them in timed sequences of relevant content, watching for engagement signals that indicate readiness, and automatically handing hot leads to sales. Nurture keeps not-yet-ready leads warm without manual effort, and the crucial step is auto-detecting when a lead heats up so sales acts at the right moment.`,
    intro: [`Most leads are not ready to buy when they arrive. Nurturing keeps them warm until they are, instead of discarding them or pestering them prematurely.`, `Automation makes this scalable, and the key is detecting readiness - so a warming lead is handed to sales at the peak moment, not left in a sequence forever.`],
    steps: [
      { h: `Segment not-yet-ready leads`, body: `Identify leads with fit but low current intent, and separate them into nurture rather than pushing them to sales prematurely.` },
      { h: `Enroll in timed sequences`, body: `Send a cadence of relevant content over time, keeping the lead engaged without a rep manually following up.` },
      { h: `Watch for readiness signals`, body: `Monitor engagement for the signals - pricing views, repeat visits, replies - that indicate a lead is heating up.` },
      { h: `Hand hot leads to sales`, body: `Automatically route a lead that crosses the readiness threshold to a rep, so sales acts while intent is highest.` },
    ],
    sections: [
      { h: `Detecting readiness is the whole point`, body: `A nurture sequence that runs forever without noticing when a lead heats up wastes the moment that matters. The critical automation is engagement detection that flags readiness and hands the lead to sales at the peak. Nurture keeps leads warm; readiness detection cashes them in.` },
      { h: `How Ardovo helps`, body: `Ardovo runs nurture sequences and watches engagement for readiness signals, and Rook hands hot leads to sales the moment they cross the threshold. Not-yet-ready leads stay warm automatically, and the warming ones reach a rep at the peak moment rather than languishing in a sequence.` },
    ],
    faqs: [
      { q: `What is lead nurturing automation?`, a: `Automatically keeping not-yet-ready leads warm through timed sequences of relevant content, while watching for engagement signals that indicate readiness to buy. It lets you maintain many leads without manual follow-up and, crucially, hands each to sales automatically once it heats up.` },
      { q: `When should a nurtured lead go to sales?`, a: `When engagement signals indicate readiness - pricing-page views, repeat visits, replies, or a rising engagement score. Detecting that moment and handing the lead to sales at the peak is the most important part of nurture automation; a sequence that never notices readiness wastes the opportunity.` },
      { q: `How is nurturing different from a sales sequence?`, a: `Nurturing keeps not-yet-ready leads warm over a longer horizon with lighter, educational touches until they show readiness. A sales sequence is a rep's active outreach cadence to a qualified prospect. Nurture precedes and feeds sales; it warms leads until they are ready for the sales sequence.` },
    ] },

  { slug: `sales-workflow-automation-examples`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `Sales workflow automation examples`,
    shortAnswer: `Sales workflow automation examples include routing leads to owners on arrival, creating onboarding tasks when a deal closes, alerting managers when a deal stalls or a discount exceeds a threshold, generating renewal tasks before contracts end, and updating forecast category from deal signals. Each encodes a repeatable process so it runs consistently, removing manual steps and the errors that come with them.`,
    intro: [`Workflow automation shines on the repeatable processes every sales team runs the same way each time - handoffs, alerts, task creation, updates.`, `The examples below are proven because the processes are frequent and rule-based, so encoding them as workflows pays back immediately in consistency and saved effort.`],
    steps: [
      { h: `Route leads on arrival`, body: `Assign each new lead to the right owner automatically, so follow-up starts fast and consistently.` },
      { h: `Kick off onboarding on close`, body: `When a deal closes, generate the onboarding and handoff tasks automatically, so nothing is dropped at the crucial transition.` },
      { h: `Alert on thresholds and stalls`, body: `Notify managers when a discount exceeds policy or a deal goes quiet, so exceptions and risks surface immediately.` },
      { h: `Generate renewal tasks early`, body: `Create renewal tasks ahead of contract end, so renewals are worked on time rather than discovered late.` },
    ],
    sections: [
      { h: `Encode the processes you repeat`, body: `Any process your team runs the same way every time - a handoff, an alert, a task at a milestone - is a candidate for a workflow. Encoding it means it happens consistently and automatically, removing both the manual effort and the risk that someone forgets a step under pressure.` },
      { h: `How Ardovo helps`, body: `Ardovo ships these workflows ready to run, and Rook builds new ones from a described process and executes the steps. Repeatable processes run consistently without anyone remembering to trigger them, so handoffs, alerts, and milestone tasks just happen.` },
    ],
    faqs: [
      { q: `What sales processes are worth automating as workflows?`, a: `The repeatable ones your team runs identically every time: lead routing, closing-to-onboarding handoffs, threshold and stall alerts, and renewal task creation. Encoding these as workflows makes them consistent and automatic, removing manual effort and the risk of a forgotten step.` },
      { q: `How do workflow automations prevent dropped balls?`, a: `By generating the right actions automatically at each milestone - a handoff task when a deal closes, a renewal task before a contract ends, an alert when a deal stalls. Because the workflow fires every time its trigger occurs, no step depends on someone remembering, so nothing slips.` },
      { q: `Can you automate manager alerts?`, a: `Yes, and it is one of the highest-value workflows. Alerts that fire when a discount exceeds policy, a deal stalls, or a high-value opportunity appears surface exceptions and risks the moment they happen, so managers act in time rather than discovering problems in a weekly review.` },
    ] },

  { slug: `what-is-a-sales-trigger`, type: `glossary`, eyebrow: `Automation & workflows`,
    title: `What is a sales trigger?`,
    shortAnswer: `A sales trigger is an event that signals a good moment to act - a prospect visits your pricing page, a company hires for a relevant role, a contract nears renewal, or a champion changes jobs. Sales triggers cue timely, relevant outreach. Detecting them automatically lets reps reach out at the moment of highest intent instead of on a fixed cadence.`,
    intro: [`A sales trigger is a real-world or behavioral event that says "now is a good time." Timing outreach to triggers beats blasting on a schedule.`, `The challenge is detection: triggers are only useful if you notice them as they happen, which is where automation comes in.`],
    keyPoints: [`An event signaling a timely moment to reach out.`, `Includes buying signals, job changes, and renewals.`, `Cues relevant, well-timed outreach.`, `Valuable only if detected as it happens.`],
    sections: [
      { h: `Why it matters`, body: `Outreach timed to a trigger - right after a buying signal or a relevant change - lands far better than the same message on a random day. Triggers turn timing from guesswork into signal, but only if the system catches them in real time for the rep to act on.` },
      { h: `How Ardovo handles it`, body: `Ardovo watches for sales triggers across activity and account signals, and Rook surfaces them to reps as they happen, sometimes with drafted outreach. Reps act at the moment of highest intent rather than on a fixed cadence, so their timing is driven by signal.` },
    ],
    faqs: [
      { q: `What are examples of sales triggers?`, a: `Behavioral signals like a pricing-page visit or repeat website visits, and real-world events like a company hiring for a relevant role, an approaching renewal, a funding round, or a champion changing jobs. Each marks a moment when timely, relevant outreach is far more likely to land.` },
      { q: `Why time outreach to sales triggers?`, a: `Because a message timed to a trigger - right after a buying signal or a relevant change - is relevant and well-timed, so it lands far better than the same message sent on a random day. Triggers replace guesswork about timing with real signal about when a prospect is receptive.` },
      { q: `How do you detect sales triggers?`, a: `Through automation that watches behavioral activity and account signals in real time and surfaces the trigger to the rep as it happens. Triggers are only useful if caught in the moment - a pricing visit noticed a week later is a missed opportunity - so real-time detection is essential.` },
    ] },

  { slug: `how-to-automate-crm-notifications`, type: `guide`, eyebrow: `Automation & workflows`,
    title: `How to automate CRM notifications`,
    shortAnswer: `Automate CRM notifications by deciding which events truly warrant an alert, sending each to the right person on the channel they watch, keeping the volume low so alerts stay meaningful, and including enough context to act. The discipline is restraint - alert only on events that need action - because too many notifications train people to ignore all of them.`,
    intro: [`Notifications are powerful and easily overused. A well-placed alert prompts timely action; a flood of them becomes noise everyone tunes out.`, `The craft is choosing the few events that genuinely need attention and routing them to the right person with the context to act.`],
    steps: [
      { h: `Choose action-worthy events`, body: `Alert only on events that need a human to do something - a hot lead, a stalled deal, a threshold breach - not routine changes.` },
      { h: `Send to the right person and channel`, body: `Direct each alert to whoever must act, on the channel they actually watch, so it is seen and acted on.` },
      { h: `Keep volume low`, body: `Ruthlessly limit alert count, because too many notifications train people to ignore all of them.` },
      { h: `Include context to act`, body: `Give each alert enough detail - what happened, which record, what to do - so the recipient can act without hunting.` },
    ],
    sections: [
      { h: `Alert fatigue is the real risk`, body: `The failure mode of notifications is volume: alert on everything, and people learn to ignore everything, including the alerts that matter. Restraint is the discipline - notify only on action-worthy events. A few meaningful alerts beat a constant stream that trains everyone to tune out.` },
      { h: `How Ardovo helps`, body: `Ardovo sends notifications only on action-worthy events, to the right person, on their channel, with context to act. Rook tunes alert volume to prevent fatigue, so notifications stay meaningful and prompt action rather than becoming background noise reps ignore.` },
    ],
    faqs: [
      { q: `What events should trigger a CRM notification?`, a: `Only action-worthy ones: a high-value lead arriving, a deal stalling, a discount exceeding policy, an account showing buying signals. Alerting on routine changes floods people with noise. Reserve notifications for events where a human genuinely needs to do something in response.` },
      { q: `How do you avoid notification fatigue?`, a: `Keep volume low by alerting only on events that need action, sending each to just the person who must act, and cutting routine or duplicate alerts. Too many notifications train people to ignore all of them, so restraint is what keeps alerts meaningful and acted on.` },
      { q: `What makes a good CRM notification?`, a: `Relevance and context: it goes to the person who must act, on a channel they watch, and includes enough detail - what happened, which record, what to do - to act without hunting. A relevant, contextual, low-volume alert prompts action; a vague or excessive one gets ignored.` },
    ] },

  // ===================================================================
  // CLUSTER K - Activity capture / email logging / calendar sync / notifications
  // ===================================================================
  { slug: `what-is-activity-capture`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is activity capture?`,
    shortAnswer: `Activity capture is automatically recording sales interactions - emails, calls, and meetings - into the CRM without reps typing them in. It builds a complete interaction history on every contact and deal from what reps already do. Automatic capture solves the biggest data-quality problem in CRMs: the activity reps never bother to log manually.`,
    intro: [`Activity capture answers the perennial CRM gap: reps interact constantly but log a fraction of it. Automatic capture records the rest.`, `It matters because the activity history is the raw material for engagement scoring, forecasting signals, and simply knowing what happened with a deal.`],
    keyPoints: [`Automatically records emails, calls, and meetings into the CRM.`, `Builds complete interaction history without manual logging.`, `Solves the chronic problem of unlogged activity.`, `Feeds engagement scoring, forecasting, and deal context.`],
    sections: [
      { h: `Why it matters`, body: `Manually logged CRMs capture maybe a fraction of real activity, so the interaction history is full of holes that break engagement scoring and hide what happened on deals. Automatic capture fills those holes from what reps already do, making the history complete and trustworthy.` },
      { h: `How Ardovo handles it`, body: `Ardovo captures emails, calls, and meetings automatically and attaches them to the right contact and deal. Rook keeps the timeline complete without reps logging anything, so engagement scores, forecasts, and deal context all run on a full picture of what actually happened.` },
    ],
    faqs: [
      { q: `What does activity capture record?`, a: `Emails sent and received, calls made and taken, and meetings held - automatically attached to the relevant contact and deal. It builds a complete interaction timeline from what reps already do, rather than depending on them to type each interaction into the CRM afterward.` },
      { q: `Why is automatic activity capture important?`, a: `Because manually logged CRMs capture only a fraction of real activity, leaving the interaction history full of gaps that break engagement scoring and hide deal context. Automatic capture fills those gaps from actual activity, making the history complete enough to trust and score on.` },
      { q: `How is activity capture different from manual logging?`, a: `Manual logging depends on reps typing each interaction in, which they do inconsistently. Activity capture records interactions automatically from email, calendar, and phone systems, so the history is complete without rep effort. Capture solves the incompleteness that manual logging inevitably suffers.` },
    ] },

  { slug: `how-to-log-emails-in-a-crm`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to log emails in a CRM`,
    shortAnswer: `Log emails in a CRM by connecting reps' inboxes so messages are captured automatically and matched to the right contact and deal, rather than relying on manual copy-paste or BCC. Automatic email logging builds a complete communication history with zero rep effort, which is the only reliable way to keep it current given how little reps log by hand.`,
    intro: [`Email is where most sales conversations happen, yet manually logging it is exactly the busywork reps skip.`, `The reliable fix is connecting the inbox so logging is automatic - the history fills itself instead of depending on discipline.`],
    steps: [
      { h: `Connect the inbox`, body: `Integrate reps' email so messages are captured automatically, rather than relying on manual copy-paste or a BCC address reps forget.` },
      { h: `Match to contacts and deals`, body: `Automatically attach each email to the right contact and open deal, so the history lands in context.` },
      { h: `Set privacy boundaries`, body: `Define which emails are logged - work correspondence, not personal - so capture is complete without overreaching.` },
      { h: `Verify completeness`, body: `Confirm the communication history is filling in, so no important thread is missing from a deal's record.` },
    ],
    sections: [
      { h: `Automatic beats BCC and copy-paste`, body: `Manual email logging methods - copy-paste, a BCC address - all depend on the rep remembering, which means they capture a fraction of real correspondence. Connecting the inbox for automatic capture is the only approach that reliably logs everything, because it removes the human step that gets skipped.` },
      { h: `How Ardovo helps`, body: `Ardovo connects inboxes and logs emails automatically, matching each to the right contact and deal with privacy boundaries respected. Rook keeps the communication history complete without reps copying or BCCing anything, so every deal shows the full email thread.` },
    ],
    faqs: [
      { q: `What is the best way to log emails in a CRM?`, a: `Connect reps' inboxes so emails are captured automatically and matched to the right contact and deal. Manual methods like copy-paste or a BCC address depend on the rep remembering, so they capture only a fraction. Automatic inbox capture is the only reliably complete approach.` },
      { q: `Does automatic email logging capture personal emails?`, a: `Well-designed capture respects privacy boundaries - logging work correspondence with contacts and prospects, not personal email. Setting clear rules about which messages are captured keeps the communication history complete for sales purposes without overreaching into personal messages.` },
      { q: `Why not just use BCC to log emails?`, a: `Because BCC depends on the rep remembering to add the address every time, so it captures only the emails they think to log - a fraction of the real correspondence. Automatic inbox capture logs everything without a human step, which is what keeps the history actually complete.` },
    ] },

  { slug: `what-is-email-logging`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is email logging?`,
    shortAnswer: `Email logging is recording sales emails into the CRM and attaching them to the relevant contact and deal, so the communication history is complete and visible. Done automatically by connecting the inbox, it captures every message without rep effort. Email logging is a core part of activity capture and the foundation of an accurate interaction timeline.`,
    intro: [`Email logging is the specific practice of getting email correspondence into the CRM where the whole team can see it.`, `Its value depends entirely on completeness, which is why automatic capture beats any manual method that relies on reps remembering.`],
    keyPoints: [`Records sales emails into the CRM against contacts and deals.`, `Best done automatically by connecting the inbox.`, `Builds a complete, visible communication history.`, `A core part of activity capture.`],
    sections: [
      { h: `Why it matters`, body: `Email is where most of a deal's conversation lives. Without logging, that history is trapped in individual inboxes, invisible to managers and teammates and lost when a rep leaves. Logging makes the communication a shared, durable part of the record.` },
      { h: `How Ardovo handles it`, body: `Ardovo logs emails automatically by connecting inboxes and matching each message to the right contact and deal. Rook keeps the history complete, so the full conversation is visible to the team and survives rep turnover instead of living in one person's inbox.` },
    ],
    faqs: [
      { q: `Why log emails in a CRM at all?`, a: `Because email is where most of a deal's conversation happens, and without logging it stays trapped in individual inboxes - invisible to managers and teammates, and lost when a rep leaves. Logging makes the communication a shared, durable part of the deal record everyone can see.` },
      { q: `Should email logging be manual or automatic?`, a: `Automatic. Manual logging depends on reps remembering, so it captures only a fraction of real correspondence. Connecting the inbox for automatic capture logs every message without a human step, which is the only way to keep the communication history genuinely complete.` },
      { q: `Is email logging the same as email tracking?`, a: `No. Email logging records the message into the CRM as part of the history. Email tracking tells you whether a recipient opened an email or clicked a link. Logging builds the record; tracking measures engagement. Many teams use both together.` },
    ] },

  { slug: `how-to-log-calls-automatically`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to log calls automatically`,
    shortAnswer: `Log calls automatically by connecting your calling system to the CRM so each call is recorded against the right contact and deal, capturing time, duration, and outcome without manual entry. Automatic call logging fills the activity history that reps rarely complete by hand, and pairing it with call notes or transcription captures what was actually discussed.`,
    intro: [`Calls are central to sales and almost never logged completely by hand - reps finish a call and move to the next thing.`, `Connecting the phone system automates the record, and adding notes or transcription captures the substance, not just that a call happened.`],
    steps: [
      { h: `Connect the calling system`, body: `Integrate your phone or dialer so each call is logged to the CRM automatically against the right contact and deal.` },
      { h: `Capture call metadata`, body: `Record time, duration, and outcome automatically, building the activity history without manual entry.` },
      { h: `Add notes or transcription`, body: `Capture what was discussed via quick notes or automatic transcription, so the log has substance, not just a timestamp.` },
      { h: `Match to the deal`, body: `Ensure each call attaches to the relevant open deal, so the deal's timeline reflects every conversation.` },
    ],
    sections: [
      { h: `Log the substance, not just the event`, body: `A call log that only shows "call, 12 minutes" tells you little. Pairing automatic logging with notes or transcription captures what was actually discussed and agreed, which is what makes the log useful for forecasting, coaching, and the next rep who picks up the deal.` },
      { h: `How Ardovo helps`, body: `Ardovo logs calls automatically against the right contact and deal, capturing metadata and, with transcription, the substance. Rook attaches the record to the timeline and can summarize what was discussed, so the call history is complete and actually informative, not just a list of timestamps.` },
    ],
    faqs: [
      { q: `How do you log calls automatically in a CRM?`, a: `Connect your calling system or dialer to the CRM so each call is recorded against the right contact and deal, capturing time, duration, and outcome without manual entry. This fills the activity history that reps rarely complete by hand after finishing a call.` },
      { q: `Should call logs include what was discussed?`, a: `Yes - a log showing only that a call happened tells you little. Pairing automatic logging with quick notes or automatic transcription captures the substance of the conversation, which is what makes the log useful for forecasting, coaching, and handing the deal to another rep.` },
      { q: `Why not just have reps log calls manually?`, a: `Because reps finish a call and move to the next task, so manual call logging captures only a fraction of real calls. Automatic logging records every call without a human step, keeping the activity history complete rather than dependent on discipline reps rarely maintain.` },
    ] },

  { slug: `what-is-calendar-sync`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is calendar sync?`,
    shortAnswer: `Calendar sync connects a rep's calendar to the CRM so meetings are automatically logged as activities against the right contacts and deals, and CRM data reflects real scheduling. It captures meeting history without manual entry and keeps availability and follow-ups aligned. Calendar sync is a key part of activity capture for the meetings side of selling.`,
    intro: [`Calendar sync brings meetings into the CRM automatically, the way email and call logging bring in those interactions.`, `It closes the meetings gap in activity capture - so a deal's timeline shows every meeting held, not just the emails and calls.`],
    keyPoints: [`Connects a rep's calendar to the CRM.`, `Logs meetings automatically against contacts and deals.`, `Captures meeting history without manual entry.`, `Completes the meetings side of activity capture.`],
    sections: [
      { h: `Why it matters`, body: `Meetings are where deals advance, so a timeline missing them is missing the most important interactions. Calendar sync captures every meeting automatically, completing the activity history and letting the CRM tie follow-ups and engagement to real meeting activity.` },
      { h: `How Ardovo handles it`, body: `Ardovo syncs calendars so meetings log automatically against the right contact and deal, and Rook can create the follow-up task from the meeting. The meetings side of the timeline stays complete without manual entry, alongside captured emails and calls.` },
    ],
    faqs: [
      { q: `What does calendar sync do?`, a: `It connects a rep's calendar to the CRM so meetings are automatically logged as activities against the right contacts and deals. This captures meeting history without manual entry and keeps CRM activity aligned with real scheduling, completing the meetings side of activity capture.` },
      { q: `Why sync your calendar with a CRM?`, a: `Because meetings are where deals advance, and a timeline missing them lacks the most important interactions. Calendar sync captures every meeting automatically, so the activity history is complete and follow-ups and engagement can be tied to real meeting activity rather than guesswork.` },
      { q: `Does calendar sync work two ways?`, a: `Often, yes - meetings from the calendar log into the CRM, and CRM-scheduled meetings appear on the calendar. Two-way sync keeps both systems aligned, so reps work from one accurate schedule and the CRM reflects every meeting without duplicate manual entry.` },
    ] },

  { slug: `how-to-set-up-calendar-sync`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to set up calendar sync`,
    shortAnswer: `Set up calendar sync by connecting each rep's calendar to the CRM, choosing one-way or two-way sync, defining which meetings log (external, with contacts) and which stay private, matching meetings to contacts and deals, and confirming meetings appear on the timeline. Sync work meetings automatically while keeping personal events private, so the meeting history fills itself.`,
    intro: [`Setting up calendar sync is connecting calendars and defining the boundaries - which meetings become CRM activity and which stay personal.`, `Done right, meetings log themselves onto the deal timeline while private events stay private.`],
    steps: [
      { h: `Connect each rep's calendar`, body: `Integrate the calendar so meetings flow into the CRM automatically, rather than being entered by hand.` },
      { h: `Choose one-way or two-way`, body: `Decide whether meetings only log into the CRM, or also flow from CRM to calendar, based on how reps schedule.` },
      { h: `Set privacy boundaries`, body: `Define which meetings sync - external meetings with contacts - and keep personal events private.` },
      { h: `Match and verify`, body: `Ensure meetings attach to the right contact and deal, and confirm they appear on the timeline.` },
    ],
    sections: [
      { h: `Sync work meetings, keep personal private`, body: `The key configuration decision is scope: capture external meetings with contacts and prospects onto the deal timeline, while personal and internal-private events stay off the record. Clear privacy boundaries make calendar sync complete for sales purposes without exposing a rep's whole calendar.` },
      { h: `How Ardovo helps`, body: `Ardovo connects calendars with one-way or two-way sync and privacy boundaries, logging external meetings against the right contact and deal. Rook creates follow-up tasks from meetings, so the meeting timeline fills itself while personal events stay private.` },
    ],
    faqs: [
      { q: `What is the difference between one-way and two-way calendar sync?`, a: `One-way sync logs meetings from the calendar into the CRM. Two-way sync also pushes CRM-scheduled meetings onto the calendar, keeping both aligned. Two-way suits reps who schedule from the CRM; one-way is simpler if the calendar is the only place meetings are booked.` },
      { q: `How do you keep personal events private in calendar sync?`, a: `Set privacy boundaries so only external meetings with contacts and prospects sync to the CRM, while personal and private events stay off the record. Clear scope makes the meeting history complete for sales without exposing a rep's entire calendar to the team.` },
      { q: `Do synced meetings attach to deals automatically?`, a: `With proper setup, yes - meetings match to the relevant contact and open deal so they appear on the deal timeline. This is what makes calendar sync useful: the meeting history lands in context automatically, tying every meeting to the deal it advanced.` },
    ] },

  { slug: `what-is-email-tracking`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is email tracking?`,
    shortAnswer: `Email tracking tells you whether a recipient opened your email, clicked a link, or viewed an attachment, giving real-time signals of engagement. It helps reps time follow-up to interest and gauge which messages resonate. Tracking measures engagement with sent emails, complementing email logging, which records the messages themselves into the CRM.`,
    intro: [`Email tracking turns a sent email into a signal: did they open it, when, and did they click?`, `It is an engagement lens - useful for timing follow-up - distinct from logging, which is about recording the message.`],
    keyPoints: [`Shows opens, clicks, and views of sent emails.`, `Provides real-time engagement signals.`, `Helps reps time follow-up and gauge resonance.`, `Complements email logging, which records the messages.`],
    sections: [
      { h: `Why it matters`, body: `Knowing a prospect just opened your email several times is a timing signal - a moment to follow up while you are top of mind. Tracking turns silent sends into engagement data reps can act on, and reveals which messaging resonates across many sends.` },
      { h: `How Ardovo handles it`, body: `Ardovo tracks opens and clicks and feeds them into engagement signals, so Rook can flag when a prospect is engaging and prompt timely follow-up. Tracking data joins the logged email history, so reps see both what was sent and how it landed.` },
    ],
    faqs: [
      { q: `What does email tracking show?`, a: `Whether a recipient opened your email, when, how many times, and whether they clicked a link or viewed an attachment. These are real-time engagement signals that tell a rep a prospect is paying attention, which is useful for timing follow-up while the message is fresh.` },
      { q: `What is the difference between email tracking and email logging?`, a: `Logging records the message into the CRM as part of the history. Tracking measures engagement with a sent email - opens and clicks. Logging builds the record of what was sent; tracking reveals how it landed. They complement each other and are often used together.` },
      { q: `How do reps use email tracking?`, a: `To time follow-up to interest - reaching out when a prospect is actively opening or clicking, while top of mind - and to learn which messaging resonates across many sends. Tracking turns silent emails into engagement signals reps can act on rather than guessing whether anyone read them.` },
    ] },

  { slug: `what-is-a-crm-activity-timeline`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is a CRM activity timeline?`,
    shortAnswer: `A CRM activity timeline is the chronological record of every interaction with a contact or deal - emails, calls, meetings, notes, and field changes - in one place. It gives anyone a complete history of what has happened, so reps, managers, and teammates can pick up a relationship with full context. A complete timeline depends on automatic activity capture.`,
    intro: [`The activity timeline is the story of a relationship, told in order: every touch, in one view.`, `Its usefulness is only as good as its completeness, which is why automatic capture matters - a timeline with holes tells a misleading story.`],
    keyPoints: [`Chronological record of all interactions with a contact or deal.`, `Includes emails, calls, meetings, notes, and changes.`, `Gives anyone full context to pick up a relationship.`, `Only as useful as it is complete, so it relies on activity capture.`],
    sections: [
      { h: `Why it matters`, body: `When a rep is out, a deal changes hands, or a manager reviews an account, the timeline is what lets them understand the relationship instantly. A complete timeline is institutional memory; a patchy one forces people to guess or ask around.` },
      { h: `How Ardovo handles it`, body: `Ardovo builds a complete timeline from automatically captured emails, calls, meetings, and changes, and Rook can summarize it. Anyone can pick up a deal with full context because the history is complete, not dependent on what a rep happened to log by hand.` },
    ],
    faqs: [
      { q: `What appears on a CRM activity timeline?`, a: `Every interaction with a contact or deal in chronological order: emails, calls, meetings, notes, task completions, and key field or stage changes. Together they form a complete history of the relationship that anyone can read to understand what has happened and where things stand.` },
      { q: `Why is a complete activity timeline important?`, a: `Because it is the institutional memory of a relationship. When a rep is out, a deal changes hands, or a manager reviews an account, the timeline lets them understand the full context instantly. A patchy timeline forces people to guess or ask around, losing knowledge.` },
      { q: `What makes an activity timeline complete?`, a: `Automatic activity capture. A timeline built from what reps manually log has holes, because reps log only a fraction of their interactions. Capturing emails, calls, and meetings automatically fills the timeline from actual activity, making it complete enough to rely on.` },
    ] },

  { slug: `how-to-capture-sales-activity-automatically`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to capture sales activity automatically`,
    shortAnswer: `Capture sales activity automatically by connecting email, calendar, and calling systems so interactions log themselves against the right contacts and deals, matching each activity to its record, respecting privacy boundaries, and reserving manual notes only for substance a system cannot infer. Automatic capture builds a complete activity history from what reps already do, ending the manual-logging gap.`,
    intro: [`Automatic activity capture is the antidote to the empty CRM: instead of asking reps to log, you connect the systems where activity already happens.`, `The result is a complete, current history that fills itself - emails, meetings, and calls all captured without a rep typing.`],
    steps: [
      { h: `Connect email, calendar, and calls`, body: `Integrate the systems where interactions happen so emails, meetings, and calls log automatically, not manually.` },
      { h: `Match activity to records`, body: `Attach each captured interaction to the right contact and open deal, so the history lands in context.` },
      { h: `Respect privacy boundaries`, body: `Capture work interactions while keeping personal communication private, so the history is complete without overreaching.` },
      { h: `Reserve notes for substance`, body: `Ask reps only to add the substance a system cannot infer - what was decided - and automate the record of what happened.` },
    ],
    sections: [
      { h: `Connect the systems, do not ask reps to log`, body: `The reason CRMs are empty is that manual logging asks reps to duplicate work they already did. Automatic capture connects email, calendar, and calling systems so the record fills itself. Reps add only the judgment - what was decided - while the system captures the rest.` },
      { h: `How Ardovo helps`, body: `Ardovo captures activity across email, calendar, and calls automatically, matching each to the right record with privacy respected. Rook fills the timeline and can summarize what happened, so reps add only substance and the activity history stays complete without the manual-logging tax.` },
    ],
    faqs: [
      { q: `How do you capture sales activity without manual logging?`, a: `Connect the systems where activity already happens - email, calendar, and calling - so interactions log themselves against the right contacts and deals. This builds a complete history from what reps already do, ending the manual-logging gap that leaves most CRMs full of holes.` },
      { q: `What activity can be captured automatically?`, a: `Emails, meetings, and calls, along with their metadata like time and duration, plus opens and clicks for tracked emails. What automation cannot infer is the substance - what was decided or agreed - so reps still add brief notes for that, while the record of what happened fills itself.` },
      { q: `Does automatic capture respect privacy?`, a: `Well-designed capture does, distinguishing work interactions with contacts and prospects from personal communication and logging only the former. Clear privacy boundaries make the activity history complete for sales purposes without exposing a rep's personal emails or calendar to the team.` },
    ] },

  { slug: `how-to-reduce-manual-data-logging`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to reduce manual data logging for reps`,
    shortAnswer: `Reduce manual logging by capturing activity automatically, enriching records instead of asking reps to research, updating fields from real signals, keeping required fields minimal, and reserving manual entry for judgment only. Every field the system can fill is one less a rep types, which both frees selling time and produces more complete, consistent data than manual logging ever does.`,
    intro: [`Manual logging is the tax reps resent and skip, and the direct cause of empty, unreliable CRMs.`, `Reducing it is not about nagging reps to log more - it is about removing the need to log at all through capture, enrichment, and automation.`],
    steps: [
      { h: `Capture activity automatically`, body: `Connect email, calendar, and calls so interactions log themselves, removing the biggest source of manual entry.` },
      { h: `Enrich instead of researching`, body: `Fill company and contact data automatically, so reps never look up firmographics by hand.` },
      { h: `Update fields from signals`, body: `Advance stages and update fields from real activity, so records stay current without manual editing.` },
      { h: `Minimize required fields`, body: `Keep the mandatory list to the few judgment fields only a human can supply, and automate the rest.` },
    ],
    sections: [
      { h: `Remove the need to log, do not demand more logging`, body: `The failing approach is pressuring reps to log more diligently, which never lasts. The winning approach removes the need: capture, enrichment, and signal-based updates fill the data automatically, so manual entry shrinks to judgment fields. Less logging asked of reps yields more complete data, not less.` },
      { h: `How Ardovo helps`, body: `Ardovo captures activity, enriches records, and updates fields automatically through Rook, so reps log almost nothing. The data ends up more complete and consistent than manual logging achieves, because it comes from actual activity and external sources rather than reps remembering to type.` },
    ],
    faqs: [
      { q: `How do you get reps to keep the CRM updated?`, a: `Stop relying on them to. The durable fix is removing the need for manual entry through automatic activity capture, enrichment, and signal-based field updates, so the CRM fills itself. Pressuring reps to log more never lasts; removing the logging burden does.` },
      { q: `Does less manual logging mean worse data?`, a: `The opposite. Data captured automatically from real activity and enriched from external sources is more complete and consistent than what reps type by hand, because it does not depend on memory or diligence. Reducing manual logging improves data quality rather than degrading it.` },
      { q: `What logging should reps still do?`, a: `Only the judgment a system cannot infer: what was decided, the customer's use case and budget, the chosen next step. Everything mechanical - who was emailed, when a meeting happened, company firmographics - should be captured or enriched automatically, leaving reps just the substance.` },
    ] },

  { slug: `what-is-email-sync`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is email sync?`,
    shortAnswer: `Email sync connects a rep's inbox to the CRM so emails flow automatically into the contact and deal records, keeping the communication history complete and current without copy-paste or BCC. It underpins automatic email logging and lets reps work from either the inbox or the CRM while both stay aligned. Email sync is foundational to activity capture.`,
    intro: [`Email sync is the pipe between inbox and CRM that makes automatic email logging possible.`, `Without it, email lives in individual inboxes; with it, correspondence becomes shared, searchable CRM history.`],
    keyPoints: [`Connects a rep's inbox to the CRM.`, `Flows emails automatically into contact and deal records.`, `Keeps communication history complete without manual effort.`, `Underpins automatic email logging.`],
    sections: [
      { h: `Why it matters`, body: `Email sync turns private inbox correspondence into shared CRM history, visible to the team and durable beyond any one rep. It is what makes the communication history complete and current without the manual copy-paste that reps inevitably skip.` },
      { h: `How Ardovo handles it`, body: `Ardovo syncs inboxes so emails flow into the right contact and deal automatically, with privacy respected. Rook keeps the history complete, so the full conversation is shared and searchable rather than trapped in one rep's inbox.` },
    ],
    faqs: [
      { q: `What does email sync do?`, a: `It connects a rep's inbox to the CRM so emails flow automatically into the relevant contact and deal records. This keeps the communication history complete and current without copy-paste or BCC, and lets reps work from either the inbox or the CRM while both stay aligned.` },
      { q: `Is email sync the same as email logging?`, a: `Closely related - email sync is the connection that makes automatic email logging possible. Sync is the pipe between inbox and CRM; logging is the result of emails landing on the records. In practice, setting up email sync is how you enable automatic email logging.` },
      { q: `Does email sync keep the inbox and CRM aligned?`, a: `Yes - that is its purpose. Emails flow into the CRM automatically so the communication history stays current no matter where the rep works. The correspondence becomes shared, searchable CRM history rather than living only in an individual inbox, aligned across both systems.` },
    ] },

  { slug: `how-to-track-email-engagement`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to track email engagement`,
    shortAnswer: `Track email engagement by enabling open and click tracking, feeding those signals into an engagement score, timing follow-up to spikes in activity, and learning which messages resonate across many sends. Use engagement as a timing and messaging signal, not a certainty, since opens can be imperfect - but a burst of activity is a reliable cue to reach out.`,
    intro: [`Tracking email engagement turns sent messages into signals about who is paying attention and when.`, `The value is timing and learning: follow up when interest spikes, and refine messaging based on what actually gets opened and clicked.`],
    steps: [
      { h: `Enable open and click tracking`, body: `Turn on tracking so you see when recipients open emails and click links, generating real-time engagement signals.` },
      { h: `Feed signals into engagement scoring`, body: `Roll opens and clicks into an engagement score, so email activity contributes to the overall intent picture.` },
      { h: `Time follow-up to spikes`, body: `Reach out when a prospect is actively engaging - repeated opens or clicks - while you are top of mind.` },
      { h: `Learn what resonates`, body: `Compare engagement across sends to see which subject lines and messages land, and refine accordingly.` },
    ],
    sections: [
      { h: `Use engagement as a signal, not a certainty`, body: `Open tracking is imperfect - privacy features and preview panes can inflate or hide opens - so treat a single open cautiously. What is reliable is a pattern: a burst of repeated opens and clicks is a strong timing cue. Use engagement to inform timing and messaging, not to make hard judgments off one open.` },
      { h: `How Ardovo helps`, body: `Ardovo tracks opens and clicks, feeds them into engagement scoring, and Rook flags spikes worth acting on. Reps time follow-up to real interest and learn what resonates across sends, using engagement as the timing signal it is rather than an unreliable certainty.` },
    ],
    faqs: [
      { q: `How do you track email engagement?`, a: `Enable open and click tracking so you see when recipients interact with your emails, then feed those signals into an engagement score and watch for spikes. Comparing engagement across many sends also reveals which subject lines and messages resonate, so you can refine your outreach.` },
      { q: `Is email open tracking reliable?`, a: `Imperfectly - privacy features and preview panes can inflate or suppress open counts, so a single open should be read cautiously. What is reliable is the pattern: repeated opens and clicks form a strong signal. Use engagement to inform timing and messaging rather than making hard calls off one open.` },
      { q: `How should reps act on email engagement?`, a: `Time follow-up to spikes in activity - reaching out when a prospect is repeatedly opening or clicking, while top of mind - and learn which messaging resonates across sends. Engagement is a timing and learning signal, best used to be relevant and well-timed, not as proof of intent.` },
    ] },

  { slug: `how-to-set-up-meeting-scheduling`, type: `guide`, eyebrow: `Activity capture`,
    title: `How to set up meeting scheduling in a CRM`,
    shortAnswer: `Set up meeting scheduling by connecting calendars so availability is accurate, offering prospects a booking link that respects real availability, auto-creating the CRM activity and follow-up task when a meeting is booked, and syncing the meeting to the timeline. Automated scheduling removes the back-and-forth of finding times and logs the meeting without manual entry.`,
    intro: [`Meeting scheduling automation deletes the tedious email ping-pong of finding a time, and captures the result in the CRM automatically.`, `Connected calendars are the foundation - accurate availability is what makes self-service booking trustworthy.`],
    steps: [
      { h: `Connect calendars for real availability`, body: `Sync calendars so booking reflects true availability, avoiding double-bookings and offers of times that are actually taken.` },
      { h: `Offer a booking link`, body: `Let prospects self-schedule from real availability, removing the back-and-forth of proposing times by email.` },
      { h: `Auto-create activity and tasks`, body: `When a meeting is booked, log it to the CRM and create the follow-up task automatically, so nothing is manual.` },
      { h: `Sync to the timeline`, body: `Attach the meeting to the right contact and deal, so it appears on the timeline in context.` },
    ],
    sections: [
      { h: `Accurate availability makes booking trustworthy`, body: `Self-service scheduling only works if the availability shown is real. Connected calendars ensure a prospect never books a time that is actually taken, which is what makes the booking experience smooth. Get availability right, and scheduling automation removes friction; get it wrong, and it creates conflicts.` },
      { h: `How Ardovo helps`, body: `Ardovo connects calendars for accurate availability, offers booking that respects it, and auto-logs the meeting plus a follow-up task on the timeline. Rook handles the capture, so scheduling removes the back-and-forth and records the meeting without any manual entry.` },
    ],
    faqs: [
      { q: `How does automated meeting scheduling work?`, a: `Connected calendars expose real availability, prospects self-schedule from a booking link, and when a meeting is booked the CRM auto-creates the activity and a follow-up task and syncs it to the timeline. It removes the email back-and-forth of finding a time and logs the meeting without manual entry.` },
      { q: `Why do calendars need to be connected for scheduling?`, a: `Because self-service booking is only trustworthy if the availability shown is real. Connected calendars ensure a prospect never books a slot that is actually taken, preventing double-bookings and conflicts. Accurate availability is what makes automated scheduling smooth rather than a source of errors.` },
      { q: `Does scheduling automation log the meeting?`, a: `Yes - a well-set-up scheduler auto-creates the CRM activity when a meeting is booked, attaches it to the right contact and deal, and can create the follow-up task too. So scheduling both removes the friction of finding a time and captures the meeting on the timeline automatically.` },
    ] },

  { slug: `what-is-two-way-sync`, type: `glossary`, eyebrow: `Activity capture`,
    title: `What is two-way sync?`,
    shortAnswer: `Two-way sync keeps data consistent between the CRM and another system - email, calendar, or an integrated app - by flowing changes in both directions, so an update in either place appears in the other. It prevents the drift and duplicate entry that one-way or manual syncing causes, keeping both systems aligned as a single, current picture.`,
    intro: [`Two-way sync means both systems stay in step: change something in one, and the other reflects it.`, `It is the difference between two systems that agree and two that slowly diverge into conflicting versions of the truth.`],
    keyPoints: [`Flows changes between two systems in both directions.`, `An update in either system appears in the other.`, `Prevents drift and duplicate manual entry.`, `Keeps both systems aligned as one current picture.`],
    sections: [
      { h: `Why it matters`, body: `One-way or manual syncing lets two systems drift apart until nobody knows which is right. Two-way sync keeps them aligned automatically, so reps can work from either system trusting both are current, and no one re-enters the same change twice.` },
      { h: `How Ardovo handles it`, body: `Ardovo uses two-way sync for calendars, inboxes, and integrations, so changes flow both directions and both systems stay current. Rook resolves conflicts sensibly, so the CRM and connected tools present one aligned picture rather than diverging copies.` },
    ],
    faqs: [
      { q: `What is the difference between one-way and two-way sync?`, a: `One-way sync copies changes in a single direction - from system A to system B only. Two-way sync flows changes both ways, so an update in either system appears in the other. Two-way keeps both fully aligned; one-way leaves the source system unaware of changes made downstream.` },
      { q: `Why is two-way sync better?`, a: `Because it keeps both systems consistently current, so reps can work from either one trusting both reflect the latest data, and no one re-enters the same change twice. One-way or manual syncing lets systems drift apart into conflicting versions, which two-way sync prevents automatically.` },
      { q: `What can conflict in two-way sync?`, a: `When the same field is changed differently in both systems at once, sync must decide which wins. Good two-way sync resolves these conflicts with clear rules - usually most recent or a designated source of truth - so the systems reconcile sensibly rather than overwriting good data.` },
    ] },

  // ===================================================================
  // CLUSTER L - CRM setup / onboarding / admin
  // ===================================================================
  { slug: `how-to-set-up-a-crm`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to set up a CRM`,
    shortAnswer: `Set up a CRM by defining your sales process first, configuring the data model (objects, fields, pipeline stages) to match it, importing clean data, wiring routing and automation, connecting email and calendar for activity capture, then onboarding the team. Design around your actual process, start lean, and get data and activity capture right so the CRM is alive and trusted from day one.`,
    intro: [`Setting up a CRM well is mostly about restraint and sequence: model your real process, keep it lean, and get the foundations right before piling on customization.`, `The teams that fail rush to configure everything; the ones that succeed start with process and clean data, then grow the system as needs prove out.`],
    steps: [
      { h: `Define your sales process first`, body: `Map how you actually sell - stages, handoffs, key data - before configuring anything, so the CRM mirrors reality rather than a generic template.` },
      { h: `Configure the data model to match`, body: `Set up objects, fields, and pipeline stages that reflect your process, keeping fields lean and required lists short.` },
      { h: `Import clean data and wire automation`, body: `Bring in de-duped, standardized data, then set up routing, activity capture, and core automations so the system runs itself.`, bullets: [`Import clean, de-duped data`, `Connect email and calendar for capture`, `Set routing and core workflows`] },
      { h: `Onboard the team`, body: `Train reps on the workflow, show them the value, and reinforce adoption, since a CRM nobody uses is worthless.` },
    ],
    sections: [
      { h: `Start lean, grow deliberately`, body: `The temptation is to configure every field, workflow, and report on day one. That produces a bloated system reps resist. Start with the lean essentials that match your process, launch, and add customization only as real needs prove out. A simple CRM people use beats a comprehensive one they avoid.` },
      { h: `How Ardovo helps`, body: `Ardovo comes alive with data and sensible defaults, so setup is configuring to your process rather than building from an empty shell. Rook handles data cleanup, routing, and activity capture setup, so the CRM is trustworthy and useful from day one instead of after months of configuration.` },
    ],
    faqs: [
      { q: `What is the first step in setting up a CRM?`, a: `Defining your sales process - the stages, handoffs, and key data of how you actually sell - before configuring anything. The CRM should mirror your real process, so mapping it first ensures the data model, pipeline, and automation reflect reality rather than a generic template.` },
      { q: `How do you avoid over-configuring a new CRM?`, a: `Start lean. Configure only the essentials that match your process, launch, and add fields, workflows, and reports as real needs prove out. Building everything up front produces a bloated system reps resist. A simple CRM people actually use beats a comprehensive one they avoid.` },
      { q: `What makes a CRM setup successful?`, a: `Clean data, working activity capture, a model that matches your real process, and team adoption. A CRM that is alive with trustworthy data and captures activity automatically earns rep trust, which is what drives adoption. An empty, hard-to-use system gets abandoned regardless of features.` },
    ] },

  { slug: `crm-setup-checklist`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `CRM setup checklist`,
    shortAnswer: `A CRM setup checklist covers defining your sales process, configuring objects and fields, setting pipeline stages, importing clean data, wiring lead routing and automation, connecting email and calendar, setting permissions, and onboarding the team. Work through it in order - process first, data and capture before launch - so the CRM launches alive, clean, and adopted.`,
    intro: [`A setup checklist keeps a CRM launch from missing a foundational step that is painful to add later.`, `The order matters: process before configuration, clean data and activity capture before you invite the team in.`],
    steps: [
      { h: `Define process and model`, body: `Map your sales process, then configure objects, fields, and pipeline stages to match it, keeping the model lean.`, bullets: [`Sales process mapped`, `Objects and fields configured`, `Pipeline stages with exit criteria`] },
      { h: `Import clean data`, body: `De-dupe and standardize data, then import with matching so you launch on a clean, connected database.` },
      { h: `Wire routing, automation, and capture`, body: `Set up lead routing, core workflows, and email and calendar sync so the system runs and records itself.` },
      { h: `Set permissions and onboard`, body: `Configure roles and permissions, then train the team and reinforce adoption.` },
    ],
    sections: [
      { h: `Foundations before features`, body: `The checklist front-loads foundations - process, clean data, activity capture - because they are painful to retrofit. Fancy reports and custom workflows can wait; a launched CRM with dirty data or no activity capture never earns trust. Get the foundations right, then layer on the rest.` },
      { h: `How Ardovo helps`, body: `Ardovo automates most of this checklist: it arrives alive with data and defaults, and Rook handles cleanup, routing, capture, and permissions setup. The foundational items are done for you, so launch is fast and the CRM is clean and adopted from the start.` },
    ],
    faqs: [
      { q: `What should be on a CRM setup checklist?`, a: `Defining the sales process, configuring objects and fields, setting pipeline stages, importing clean data, wiring routing and automation, connecting email and calendar, setting permissions, and onboarding the team. Working through these in order - process and data first - launches the CRM alive and adopted.` },
      { q: `What order should you set up a CRM in?`, a: `Process first, then the data model to match it, then clean data import, then routing, automation, and activity capture, then permissions and onboarding. Foundations before features - a CRM launched with dirty data or no capture never earns trust, and those are painful to retrofit.` },
      { q: `What is most often missed in CRM setup?`, a: `Activity capture and clean data. Teams rush to configure fields and reports but launch with a manually-logged, dirty database, so the CRM is empty and distrusted from day one. Getting clean data in and activity capture working before launch is what makes the CRM actually useful.` },
    ] },

  { slug: `crm-onboarding-checklist`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `CRM onboarding checklist for your team`,
    shortAnswer: `A CRM onboarding checklist covers showing reps the value first, training on the core daily workflow (not every feature), starting them with real data and pipeline, setting clear expectations for what to log, and reinforcing adoption with early wins. Focus onboarding on the handful of daily actions and the value, because adoption comes from usefulness, not feature tours.`,
    intro: [`Onboarding a team to a CRM is a change-management problem more than a training problem: people adopt tools that visibly help them.`, `The checklist focuses on value and the core daily workflow, because reps who see the CRM make their day easier stick, and feature tours do not.`],
    steps: [
      { h: `Show the value first`, body: `Open with what is in it for the rep - less busywork, warmer leads, easier follow-up - so they want to use it, not just comply.` },
      { h: `Train the core daily workflow`, body: `Teach the handful of actions reps do every day, not every feature, so they get competent fast and are not overwhelmed.` },
      { h: `Start them with real data`, body: `Give reps a CRM alive with their pipeline and contacts, so it is useful on day one rather than an empty chore.` },
      { h: `Set expectations and reinforce`, body: `Be clear about what to log and what is automated, and celebrate early wins to build the habit.` },
    ],
    sections: [
      { h: `Adoption comes from usefulness, not tours`, body: `The reason CRM onboarding fails is treating it as a feature tour and a compliance mandate. Reps adopt tools that make their day easier. Lead with value, teach only the daily workflow, and start them on a CRM alive with real data, and adoption follows because the tool genuinely helps.` },
      { h: `How Ardovo helps`, body: `Ardovo is alive with data on day one and automates the busywork, so reps experience value immediately rather than an empty system. Rook handles the logging and follow-up, so onboarding is about the few actions reps take and the value they get, which is what actually drives adoption.` },
    ],
    faqs: [
      { q: `How do you onboard a team to a new CRM?`, a: `Lead with the value to the rep, train only the core daily workflow rather than every feature, start them on a CRM alive with real data, set clear expectations for what to log, and reinforce with early wins. Adoption comes from the tool visibly helping, not from a feature tour.` },
      { q: `Why do reps resist new CRMs?`, a: `Because they often experience them as empty systems that add data-entry busywork with no clear payoff. Reps adopt tools that make their day easier. A CRM that arrives alive with data, automates logging, and is taught around daily value overcomes resistance because it genuinely helps.` },
      { q: `What should CRM training focus on?`, a: `The handful of actions reps take every day and the value they get, not a comprehensive feature tour. Overwhelming reps with every capability slows competence and buries what matters. Teaching the core daily workflow gets reps productive fast and lets them discover more as they go.` },
    ] },

  { slug: `crm-admin-best-practices`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `CRM admin best practices`,
    shortAnswer: `CRM admin best practices include keeping the data model lean, enforcing data quality with validation and dedupe, documenting configuration and changes, managing permissions on least-privilege lines, testing automation before launch, and pruning unused fields and workflows. A good admin fights complexity and protects data quality, because a bloated, dirty CRM is what erodes trust and adoption.`,
    intro: [`The CRM admin is the steward of the system's health - the person who decides whether it stays lean and trusted or bloats into a mess.`, `The best practices all pull in one direction: fight complexity, protect data quality, and document what you do.`],
    steps: [
      { h: `Keep the model lean`, body: `Resist field and workflow bloat, adding only what earns its place and pruning what goes unused, so the system stays usable.` },
      { h: `Enforce data quality`, body: `Keep validation, required-field discipline, and dedupe running, so the database stays clean without periodic cleanups.` },
      { h: `Document configuration and changes`, body: `Record why fields, workflows, and rules exist and log changes, so the system is maintainable and no change is a mystery.` },
      { h: `Manage permissions and test changes`, body: `Apply least-privilege access and test automation and changes before they hit production.` },
    ],
    sections: [
      { h: `Fight complexity, protect quality`, body: `Every request to add a field or workflow is easy to grant and hard to reverse, so systems bloat over time. The best admins push back, keep the model lean, and guard data quality relentlessly. A lean, clean CRM stays trusted; a bloated, dirty one gets abandoned no matter how many features it has.` },
      { h: `How Ardovo helps`, body: `Ardovo keeps the model lean by enriching and capturing automatically, so fewer custom fields and workflows are needed, and Rook flags unused fields and bloat. Data quality is protected by default, so the admin spends less time fighting complexity and cleanup and more on genuine improvements.` },
    ],
    faqs: [
      { q: `What are the top CRM admin best practices?`, a: `Keep the data model lean, enforce data quality with validation and dedupe, document configuration and changes, manage permissions on least-privilege lines, test automation before launch, and prune unused fields and workflows. They all serve two goals: fighting complexity and protecting data quality.` },
      { q: `How do CRM admins prevent bloat?`, a: `By pushing back on every field and workflow request, adding only what earns its place, and periodically pruning what goes unused. Bloat accumulates because additions are easy and removals are hard, so a good admin actively resists it to keep the system lean and usable.` },
      { q: `Why is documentation important for CRM admins?`, a: `Because undocumented configuration becomes a mystery no one can safely change - fields and workflows nobody remembers the purpose of. Documenting why things exist and logging changes keeps the system maintainable, so future admins can improve it without breaking things or leaving dead cruft in place.` },
    ] },

  { slug: `what-is-a-crm-administrator`, type: `glossary`, eyebrow: `CRM setup & admin`,
    title: `What is a CRM administrator?`,
    shortAnswer: `A CRM administrator is the person responsible for configuring, maintaining, and governing the CRM - managing the data model, fields, workflows, permissions, integrations, and data quality. They are the steward who keeps the system aligned with the business, lean, and trustworthy. The admin's judgment largely determines whether a CRM stays useful or bloats into a mess.`,
    intro: [`The CRM administrator owns the health of the system - the configuration, the data quality, the access, and the evolution of it over time.`, `It is a stewardship role as much as a technical one: the admin's restraint and discipline decide whether the CRM stays trusted.`],
    keyPoints: [`Configures and maintains the CRM's model, workflows, and access.`, `Governs data quality and integrations.`, `Keeps the system aligned with the business and lean.`, `Their judgment shapes whether the CRM stays useful.`],
    sections: [
      { h: `Why it matters`, body: `A CRM drifts toward bloat and mess without active stewardship. The administrator is who keeps it lean, clean, and aligned with how the business actually sells, which is what preserves trust and adoption over years, not just at launch.` },
      { h: `How Ardovo handles it`, body: `Ardovo reduces the admin burden by enriching, capturing, and deduping automatically, so the administrator spends less time on cleanup and configuration. Rook handles routine maintenance, freeing the admin to focus on aligning the system with the business rather than firefighting.` },
    ],
    faqs: [
      { q: `What does a CRM administrator do?`, a: `Configures and maintains the CRM - the data model, fields, pipeline, workflows, permissions, and integrations - and governs data quality. They keep the system aligned with how the business sells, lean rather than bloated, and trustworthy, acting as the steward of the CRM's overall health.` },
      { q: `Does every team need a CRM administrator?`, a: `Some form of ownership, yes - even a small team needs someone accountable for configuration and data quality, though it may be a part-time role. Without a steward, a CRM drifts toward bloat and dirty data. Modern CRMs that automate cleanup and capture reduce how much admin effort this requires.` },
      { q: `What skills make a good CRM administrator?`, a: `Restraint against bloat, discipline about data quality, understanding of the sales process, and clear documentation habits. The technical configuration is learnable; the harder skills are judgment - knowing when to say no to a new field - and stewardship that keeps the system lean and trusted over time.` },
    ] },

  { slug: `what-is-crm-adoption`, type: `glossary`, eyebrow: `CRM setup & admin`,
    title: `What is CRM adoption?`,
    shortAnswer: `CRM adoption is the degree to which a team actually uses the CRM as intended in their daily work. High adoption means reps log activity, update deals, and rely on the system; low adoption means they work around it in spreadsheets and inboxes. Adoption determines the CRM's entire value, because an unused CRM produces no benefit regardless of its features.`,
    intro: [`Adoption is the make-or-break metric for any CRM: all the features and data in the world are worthless if the team does not use it.`, `It is driven less by training than by usefulness - reps adopt what visibly makes their day easier and abandon what adds busywork.`],
    keyPoints: [`How much a team actually uses the CRM as intended.`, `High adoption: reps log, update, and rely on it.`, `Low adoption: reps work around it in spreadsheets.`, `Determines the CRM's entire value.`],
    sections: [
      { h: `Why it matters`, body: `A CRM's value is entirely contingent on adoption. Low adoption means unreliable data, broken forecasts, and no single source of truth, no matter how good the platform is. Adoption is the metric that gates every other benefit, so it is the one that matters most.` },
      { h: `How Ardovo handles it`, body: `Ardovo drives adoption by being useful, not by mandate: it arrives alive with data and automates the busywork reps hate, so using it makes their day easier. Rook does the logging and follow-up, so reps rely on the system because it genuinely helps rather than because they are told to.` },
    ],
    faqs: [
      { q: `Why does CRM adoption matter so much?`, a: `Because a CRM's entire value depends on it. Low adoption means reps work around the system, so the data is unreliable, forecasts break, and there is no single source of truth - no matter how capable the platform. Adoption gates every other benefit, making it the most important metric.` },
      { q: `What drives CRM adoption?`, a: `Usefulness, above all. Reps adopt tools that visibly make their day easier and abandon ones that add busywork. A CRM alive with data that automates logging and surfaces value earns adoption; an empty system that demands manual entry gets worked around, regardless of training or mandates.` },
      { q: `How do you measure CRM adoption?`, a: `Through usage signals: how consistently reps log activity, update deals, and work from the system versus around it in spreadsheets and inboxes. Declining data completeness or reps maintaining shadow spreadsheets are warning signs that adoption is low and the CRM is not earning its keep.` },
    ] },

  { slug: `how-to-improve-crm-adoption`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to improve CRM adoption`,
    shortAnswer: `Improve CRM adoption by making the system genuinely useful: automate the busywork reps hate, keep it alive with real data, reduce manual entry to near zero, streamline to the daily workflow, and surface value like warm leads and next steps. Adoption follows usefulness - remove friction and add value, and reps use the CRM because it helps, not because they are told to.`,
    intro: [`You cannot mandate real adoption - you can force logins, but not genuine use. Adoption is earned by making the CRM worth using.`, `The levers are all about value and friction: automate what reps hate, surface what helps them, and the resistance dissolves.`],
    steps: [
      { h: `Automate the busywork`, body: `Capture activity, enrich records, and update fields automatically, so the CRM stops feeling like a data-entry chore.` },
      { h: `Keep it alive with data`, body: `Ensure reps see real pipeline, warm leads, and useful context, so the CRM is a tool that helps rather than an empty form.` },
      { h: `Streamline to the daily workflow`, body: `Cut clutter down to the actions reps take every day, so the system is fast and focused rather than overwhelming.` },
      { h: `Surface value continuously`, body: `Push next steps, hot leads, and insights to reps, so using the CRM visibly makes them more effective.` },
    ],
    sections: [
      { h: `Remove friction, add value`, body: `Adoption is a simple equation: reps use a CRM when its value exceeds its friction. So attack both sides - automate away the manual entry that creates friction, and surface warm leads and next steps that create value. When the CRM clearly helps more than it costs, adoption stops being a fight.` },
      { h: `How Ardovo helps`, body: `Ardovo maximizes value and minimizes friction by design: Rook automates the logging and busywork, and the system surfaces warm leads, next steps, and insights. Reps adopt it because using it makes them more effective, which is the only durable driver of adoption.` },
    ],
    faqs: [
      { q: `How do you increase CRM adoption?`, a: `Make the system genuinely useful: automate the busywork reps hate, keep it alive with real data, cut manual entry to near zero, streamline to the daily workflow, and surface value like warm leads and next steps. Adoption follows usefulness - reduce friction and add value, and reps use it because it helps.` },
      { q: `Can you force CRM adoption with mandates?`, a: `You can force logins, but not genuine use - mandated reps do the minimum and keep real work in spreadsheets. Durable adoption is earned by making the CRM worth using: automating friction away and surfacing value. When the tool clearly helps, mandates become unnecessary.` },
      { q: `What is the biggest barrier to CRM adoption?`, a: `Manual data entry with no clear payoff. When the CRM feels like a data-entry chore that benefits managers more than reps, reps resist and work around it. Removing that friction through automatic capture and enrichment, while surfacing rep-facing value, is what overcomes the barrier.` },
    ] },

  { slug: `what-is-crm-implementation`, type: `glossary`, eyebrow: `CRM setup & admin`,
    title: `What is CRM implementation?`,
    shortAnswer: `CRM implementation is the full project of getting a CRM live and adopted: planning, configuring the system to your process, migrating clean data, wiring integrations and automation, training the team, and driving adoption. It spans more than technical setup - a successful implementation ends with a trusted system people actually use, not just a configured one nobody adopted.`,
    intro: [`Implementation is the end-to-end project of standing up a CRM, from planning through adoption - not just the configuration.`, `Its success is measured by adoption, not by whether every feature is turned on, which is why change management is as central as technical setup.`],
    keyPoints: [`The full project of getting a CRM live and adopted.`, `Spans planning, configuration, migration, and training.`, `Success is measured by adoption, not configuration.`, `Change management matters as much as technical setup.`],
    sections: [
      { h: `Why it matters`, body: `Many CRM implementations technically succeed - the system is configured - but fail in practice because no one adopts it. Treating implementation as ending at adoption, not configuration, is what separates a CRM that transforms a business from one that becomes shelfware.` },
      { h: `How Ardovo handles it`, body: `Ardovo shortens implementation by arriving alive with data and defaults and automating cleanup, capture, and routing setup. Rook handles much of the configuration and data work, so implementation focuses on aligning the system to your process and driving adoption rather than months of build.` },
    ],
    faqs: [
      { q: `What does CRM implementation involve?`, a: `The full project of getting a CRM live and adopted: planning, configuring the system to your sales process, migrating clean data, wiring integrations and automation, training the team, and driving adoption. It is far more than technical setup - it ends when people actually use the system.` },
      { q: `Why do CRM implementations fail?`, a: `Usually not technically - the system gets configured - but in adoption. The team never genuinely uses it, so the data is unreliable and the value never materializes. Implementations fail when they treat configuration as the finish line instead of adoption, neglecting the change management that drives use.` },
      { q: `How long does CRM implementation take?`, a: `Traditionally weeks to months, driven mostly by configuration, data migration, and change management rather than the software itself. Modern CRMs that arrive alive with data and automate setup shorten this considerably, shifting the focus from lengthy build to process alignment and adoption.` },
    ] },

  { slug: `how-to-configure-a-new-crm`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to configure a new CRM`,
    shortAnswer: `Configure a new CRM by setting up the data model to match your sales process, defining pipeline stages with exit criteria, adding only the fields you will act on, wiring lead routing and core automations, connecting email and calendar, and setting permissions. Configure to your real process and start lean, adding customization only as genuine needs prove out.`,
    intro: [`Configuration is where a generic CRM becomes yours - and where it either stays lean and usable or bloats into a mess.`, `The discipline is to configure to your actual process and keep it minimal, resisting the urge to build every possible field and workflow up front.`],
    steps: [
      { h: `Model your process`, body: `Set up objects, relationships, and pipeline stages that mirror how you actually sell, with clear stage exit criteria.` },
      { h: `Add only fields you will act on`, body: `Configure the lean set of fields that drive routing, scoring, or reporting, and enrich the rest rather than requiring it.` },
      { h: `Wire routing and automation`, body: `Set up lead routing, activity capture, and the core workflows that remove daily busywork.` },
      { h: `Set permissions`, body: `Configure roles and access on least-privilege lines, so people see and edit what their role needs.` },
    ],
    sections: [
      { h: `Configure to your process, not the template`, body: `A CRM's defaults reflect a generic process, not yours. Configuring to how you actually sell - your stages, your key data, your handoffs - is what makes the system fit. But fit does not mean maximal: start lean and add only as needs prove out, or you trade a generic mess for a custom one.` },
      { h: `How Ardovo helps`, body: `Ardovo arrives with sensible defaults and alive with data, so configuration is tailoring to your process rather than building from empty. Rook sets up routing, capture, and cleanup, so you configure the parts unique to your business and inherit the rest working.` },
    ],
    faqs: [
      { q: `What do you configure first in a new CRM?`, a: `The data model to match your sales process - objects, relationships, and pipeline stages with clear exit criteria. Everything else builds on this, so getting the model aligned to how you actually sell comes before fields, automation, and permissions.` },
      { q: `How many fields should a new CRM have?`, a: `As few as drive real action. Configure the lean set of fields used for routing, scoring, and reporting, and enrich the rest automatically rather than requiring reps to fill them. Starting with a minimal field set and adding only as needs prove out prevents the bloat that buries the fields that matter.` },
      { q: `Should you configure everything before launch?`, a: `No - start lean and launch with the essentials that match your process, then add customization as genuine needs emerge. Building every possible field and workflow up front produces a bloated system reps resist. A simple, working CRM you extend deliberately beats an over-configured one at launch.` },
    ] },

  { slug: `what-is-a-crm-data-model`, type: `glossary`, eyebrow: `CRM setup & admin`,
    title: `What is a CRM data model?`,
    shortAnswer: `A CRM data model is the structure of objects (leads, contacts, accounts, deals) and the relationships between them that organizes all your data. It defines what each record represents and how records connect - which contacts belong to which accounts, which deals to which companies. A well-designed data model is the foundation everything else in the CRM is built on.`,
    intro: [`The data model is the skeleton of the CRM: the objects and the links between them that give data its structure and meaning.`, `Get it right and everything downstream works; get it wrong and reporting, routing, and relationships all inherit the confusion.`],
    keyPoints: [`The structure of objects and their relationships.`, `Defines what each record represents and how records connect.`, `Underpins reporting, routing, and relationship views.`, `A sound model is the foundation for everything else.`],
    sections: [
      { h: `Why it matters`, body: `Every feature stands on the data model. If contacts are not linked to accounts, or leads are muddled with contacts, then routing, reporting, and the single-customer view all break. A clean model is the quiet foundation that makes the rest of the CRM coherent.` },
      { h: `How Ardovo handles it`, body: `Ardovo ships a sound data model - leads, contacts, accounts, and deals properly linked - so the foundation is right by default. Rook maintains the relationships, keeping contacts tied to accounts and leads matched, so the structure stays clean as data flows in.` },
    ],
    faqs: [
      { q: `What are the core objects in a CRM data model?`, a: `Typically leads, contacts, accounts, and deals (opportunities), plus activities and sometimes products or quotes. Contacts link to accounts, deals attach to accounts, and leads convert into contacts. These objects and their relationships form the structure all CRM data is organized around.` },
      { q: `Why is the CRM data model important?`, a: `Because every feature is built on it. If the model is wrong - contacts not linked to accounts, leads muddled with contacts - then routing, reporting, and the single-customer view all break. A clean, well-designed model is the foundation that makes everything else in the CRM coherent and reliable.` },
      { q: `Can you change a CRM data model later?`, a: `Yes, but it is harder once data and processes depend on it, which is why getting the core model right early matters. Adding fields is easy; restructuring relationships or object usage after the fact is disruptive. Design the foundational model thoughtfully, then evolve at the edges.` },
    ] },

  { slug: `how-to-train-your-team-on-a-crm`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to train your team on a CRM`,
    shortAnswer: `Train your team on a CRM by focusing on the daily workflow rather than every feature, teaching in the context of real work, leading with the value to each rep, keeping sessions short and hands-on, and reinforcing with quick reference and follow-up. Effective training builds competence on the few daily actions and shows the value, because reps adopt what they understand and find useful.`,
    intro: [`CRM training fails when it is a comprehensive feature tour that overwhelms reps and skips the "why should I care."`, `Effective training is narrow and value-led: teach the daily workflow, in context, and show each rep what is in it for them.`],
    steps: [
      { h: `Focus on the daily workflow`, body: `Teach the handful of actions reps take every day, not every feature, so they get competent fast without being overwhelmed.` },
      { h: `Teach in the context of real work`, body: `Train on reps' actual pipeline and tasks, so the CRM connects to their real job rather than abstract demos.` },
      { h: `Lead with rep value`, body: `Show each person how the CRM makes their day easier - less busywork, warmer leads - so they want to use it.` },
      { h: `Keep it short and reinforce`, body: `Run short hands-on sessions, provide quick reference, and follow up, so the learning sticks and habits form.` },
    ],
    sections: [
      { h: `Teach the workflow, not the feature list`, body: `Reps do not need to know every capability - they need to be fluent in the few actions they take daily. Training that covers the whole feature set overwhelms and buries what matters. Narrow, value-led, hands-on training on the daily workflow builds real competence and adoption.` },
      { h: `How Ardovo helps`, body: `Ardovo minimizes what reps must learn by automating the busywork, so training focuses on a few daily actions and the value. Rook handles logging and follow-up, so there is less to teach and reps experience the payoff immediately, which is what makes training translate into adoption.` },
    ],
    faqs: [
      { q: `How should you train a team on a CRM?`, a: `Focus on the daily workflow rather than every feature, teach in the context of reps' real work and pipeline, lead with the value to each rep, keep sessions short and hands-on, and reinforce with quick reference and follow-up. Narrow, value-led training builds competence and adoption.` },
      { q: `Why does CRM training often fail?`, a: `Because it is treated as a comprehensive feature tour that overwhelms reps and never answers why they should care. Reps adopt what they understand and find useful, so training that covers everything but connects to nothing produces confusion, not adoption. Narrow and value-led works better.` },
      { q: `How long should CRM training take?`, a: `Short and focused beats long and exhaustive. Reps need fluency in a few daily actions, which a short hands-on session on their real work can build, with follow-up reinforcement. Modern CRMs that automate busywork reduce how much there is to teach, shortening training further.` },
    ] },

  { slug: `how-to-structure-a-crm-for-a-small-team`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to structure a CRM for a small team`,
    shortAnswer: `Structure a CRM for a small team by keeping it deliberately simple: a lean data model, a single clear pipeline, minimal fields, light automation for the biggest busywork, and no enterprise complexity you do not need yet. Small teams win with simplicity - a CRM everyone actually uses beats a powerful one that adds overhead nobody has time to manage.`,
    intro: [`Small teams have a superpower in CRM setup: they can stay simple. There is no need for the elaborate structure large orgs require.`, `The trap is copying enterprise complexity - heavy fields, many pipelines, elaborate permissions - that a small team has no capacity to maintain and no need for.`],
    steps: [
      { h: `Keep the model lean`, body: `Use the core objects simply - contacts, accounts, deals - without elaborate custom structure a small team will not maintain.` },
      { h: `Use one clear pipeline`, body: `Start with a single well-defined pipeline, since multiple pipelines add complexity a small team rarely needs early.` },
      { h: `Minimize fields`, body: `Capture only the few fields you act on, and enrich the rest, so reps are not burdened with data entry.` },
      { h: `Automate the biggest busywork`, body: `Add light automation for the highest-value repetitive tasks - capture, routing - without over-engineering.` },
    ],
    sections: [
      { h: `Simplicity is a small team's advantage`, body: `Small teams do not need enterprise complexity, and adopting it is a self-inflicted wound - overhead nobody has capacity to manage. A lean, simple CRM that the whole team actually uses delivers far more than a powerful, complex one that becomes a maintenance burden. Stay simple deliberately.` },
      { h: `How Ardovo helps`, body: `Ardovo is powerful but arrives simple and alive with data, so a small team gets value without configuration overhead. Rook handles the busywork automatically, so a small team runs a capable CRM without needing a dedicated admin or elaborate setup.` },
    ],
    faqs: [
      { q: `How should a small team set up a CRM?`, a: `Simply and deliberately: a lean data model, a single clear pipeline, minimal fields with enrichment for the rest, and light automation for the biggest busywork. Small teams win with simplicity - a CRM everyone uses beats a powerful one that adds overhead nobody has time to manage.` },
      { q: `Do small teams need multiple pipelines?`, a: `Usually not early on. A single well-defined pipeline is simpler to maintain and understand, and most small teams sell in one motion. Add pipelines only when you genuinely have distinct sales processes that need separate stages, not preemptively copying enterprise structure.` },
      { q: `What CRM mistakes do small teams make?`, a: `Copying enterprise complexity they do not need - heavy custom fields, multiple pipelines, elaborate permissions - which becomes maintenance overhead nobody has capacity for. The result is a burdensome system reps avoid. Staying simple is a small team's advantage, and abandoning it is a self-inflicted wound.` },
    ] },

  { slug: `how-to-keep-a-crm-simple`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to keep a CRM simple`,
    shortAnswer: `Keep a CRM simple by resisting every unnecessary field, workflow, and pipeline, adding only what earns its place, pruning unused elements regularly, automating busywork instead of adding manual steps, and always favoring the version reps will actually use. Complexity accumulates by default, so keeping a CRM simple takes active, ongoing restraint against constant pressure to add.`,
    intro: [`CRMs bloat naturally - every request adds a field or workflow, and nothing ever gets removed. Simplicity is not the default; it is a fight.`, `Keeping a CRM simple means saying no often, pruning regularly, and automating rather than adding manual complexity.`],
    steps: [
      { h: `Resist unnecessary additions`, body: `Treat every new field, workflow, and pipeline as a cost, and add only what clearly earns its place with a real use.` },
      { h: `Prune regularly`, body: `Periodically remove unused fields, dead workflows, and obsolete pipelines, since bloat accumulates if never cleaned up.` },
      { h: `Automate instead of adding steps`, body: `Solve problems by automating busywork, not by adding manual fields and processes that increase complexity.` },
      { h: `Favor what reps will use`, body: `When choosing between a powerful complex option and a simple usable one, pick usable, because adoption beats capability.` },
    ],
    sections: [
      { h: `Simplicity requires active restraint`, body: `Complexity is the default state a CRM drifts toward, because additions are easy and removals are hard, and every stakeholder wants one more field. Keeping it simple means actively resisting that pressure - saying no, pruning, and automating. Left alone, any CRM bloats into a mess reps avoid.` },
      { h: `How Ardovo helps`, body: `Ardovo keeps things simple by design: enrichment and automatic capture mean fewer fields and manual steps, and Rook flags bloat to prune. The system solves problems by doing the busywork rather than adding complexity, so the CRM stays simple without constant admin vigilance.` },
    ],
    faqs: [
      { q: `Why do CRMs become complex over time?`, a: `Because additions are easy and removals are hard: every stakeholder requests one more field or workflow, and nothing gets pruned. Complexity accumulates by default. Keeping a CRM simple requires active, ongoing restraint against this constant pressure to add, since left alone any CRM bloats.` },
      { q: `How do you keep a CRM simple?`, a: `Resist unnecessary fields, workflows, and pipelines, adding only what earns its place; prune unused elements regularly; automate busywork instead of adding manual steps; and favor the version reps will actually use over the most powerful one. Simplicity takes active effort, not neglect.` },
      { q: `Is a simple CRM less capable?`, a: `Not in the ways that matter. A simple CRM that reps actually use and that automates busywork delivers more real value than a complex one they avoid. Capability that goes unused is worthless. The goal is a system that is simple to use while automation handles the complexity behind the scenes.` },
    ] },

  { slug: `what-is-a-sales-process`, type: `glossary`, eyebrow: `CRM setup & admin`,
    title: `What is a sales process?`,
    shortAnswer: `A sales process is the defined, repeatable set of stages and actions a team follows to move a prospect from first contact to closed deal. It standardizes how selling happens - what qualifies a lead, what advances a stage, what closes a deal - so results are consistent and coachable. The sales process is what the CRM's pipeline and stages are configured to mirror.`,
    intro: [`A sales process is the playbook: the repeatable sequence that turns prospects into customers the same way each time.`, `It is the thing a CRM should be configured around - the pipeline stages, fields, and automation all exist to support the process.`],
    keyPoints: [`A defined, repeatable sequence from first contact to close.`, `Standardizes qualification, stage advancement, and closing.`, `Makes results consistent and coachable.`, `The blueprint the CRM's pipeline mirrors.`],
    sections: [
      { h: `Why it matters`, body: `Without a defined process, every rep sells differently, results are inconsistent, and coaching is guesswork. A clear sales process makes selling repeatable and improvable, and gives the CRM a real structure to model rather than a generic template.` },
      { h: `How Ardovo handles it`, body: `Ardovo configures its pipeline, stages, and automation to mirror your sales process, and Rook enforces and supports it - flagging deals that skip stages, prompting the right next actions. The process lives in the system rather than in reps' heads.` },
    ],
    faqs: [
      { q: `What is the difference between a sales process and a pipeline?`, a: `A sales process is the defined sequence of stages and actions a team follows to sell. A pipeline is the CRM's visual representation of deals moving through those stages. The process is the methodology; the pipeline is how it is tracked. The pipeline should mirror the process.` },
      { q: `Why does a sales process matter?`, a: `Because without one, every rep sells differently, results are inconsistent, and coaching is guesswork. A defined process makes selling repeatable and improvable - you can see where deals stall and fix it - and it gives the CRM a real structure to model rather than a generic default.` },
      { q: `How does a sales process relate to the CRM?`, a: `The CRM should be configured to mirror the sales process - pipeline stages match the process stages, fields capture what each stage needs, and automation supports the defined actions. Configuring the CRM around your actual process is what makes it fit how you sell rather than imposing a generic template.` },
    ] },

  { slug: `how-to-document-your-sales-process`, type: `guide`, eyebrow: `CRM setup & admin`,
    title: `How to document your sales process`,
    shortAnswer: `Document your sales process by mapping the real stages deals move through, defining clear entry and exit criteria for each, specifying the actions and data required at every stage, capturing the handoffs between teams, and configuring the CRM to mirror it. Base the documented process on how you actually sell and win, not an idealized version, so it reflects reality and is worth following.`,
    intro: [`Documenting your sales process turns tribal knowledge into a shared, coachable playbook - and gives the CRM a blueprint to model.`, `The essential discipline is basing it on what actually happens in won deals, not an aspirational version nobody follows.`],
    steps: [
      { h: `Map the real stages`, body: `Study recent won and lost deals to document the stages deals actually move through, not the ones you wish they did.` },
      { h: `Define entry and exit criteria`, body: `Give each stage clear, objective criteria for what advances a deal into and out of it, so stages mean the same thing to everyone.` },
      { h: `Specify actions and data per stage`, body: `Document what a rep should do and capture at each stage, so the process guides behavior, not just labels deals.` },
      { h: `Capture handoffs and mirror it in the CRM`, body: `Document the transitions between teams, then configure the CRM's pipeline and fields to match the documented process.` },
    ],
    sections: [
      { h: `Document what actually wins, not the ideal`, body: `A process documented as an idealized version nobody follows is useless. Base it on how your best deals actually progress - the real stages, the real criteria - so the documented process reflects reality and is worth following. Then the CRM configured to mirror it captures how you genuinely sell.` },
      { h: `How Ardovo helps`, body: `Ardovo configures the pipeline and stages to your documented process, and Rook enforces the exit criteria and prompts the required actions per stage. The documented process becomes a living part of the system that guides reps, rather than a document that sits unread.` },
    ],
    faqs: [
      { q: `How do you document a sales process?`, a: `Map the real stages deals move through, define clear entry and exit criteria for each, specify the actions and data required at every stage, capture the handoffs between teams, and configure the CRM to mirror it. Base it on how you actually sell and win, so it reflects reality.` },
      { q: `Should a documented process be ideal or realistic?`, a: `Realistic. A process documented as an idealized version nobody follows is useless. Study how your best deals actually progress and document that - the real stages and criteria. A process grounded in reality is worth following and gives the CRM an accurate blueprint to model.` },
      { q: `Why document the sales process in the CRM?`, a: `So it becomes a living guide rather than an unread document. Configuring pipeline stages and fields to mirror the documented process, with exit criteria and prompted actions, makes the process something the system enforces and supports daily, turning a static document into how reps actually work.` },
    ] },

  // ===================================================================
  // CLUSTER M - Permissions / roles / data governance
  // ===================================================================
  { slug: `what-are-crm-permissions`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What are CRM permissions?`,
    shortAnswer: `CRM permissions are the settings that control what each user can see, edit, and do in the system - which records they access, which fields they can change, and which actions they can take. Permissions protect sensitive data, prevent accidental changes, and enforce process. They are typically managed through roles, so access matches each person's job rather than being set one user at a time.`,
    intro: [`Permissions are the access-control layer of a CRM: who can do what, and to which data.`, `They balance two needs - giving people the access they require to work, and protecting data from unnecessary exposure or accidental change.`],
    keyPoints: [`Control what each user can see, edit, and do.`, `Protect sensitive data and prevent accidental changes.`, `Usually managed through roles rather than per user.`, `Balance necessary access against data protection.`],
    sections: [
      { h: `Why it matters`, body: `Permissions protect against both accidents and misuse - a rep bulk-editing records they should not touch, sensitive data exposed too widely. Set well, they let everyone work while keeping data safe; set poorly, they either block work or leave data unprotected.` },
      { h: `How Ardovo handles it`, body: `Ardovo manages permissions through roles with least-privilege defaults, so access matches each job. Rook flags overly broad access and unusual actions, so permissions protect data without getting in the way of legitimate work.` },
    ],
    faqs: [
      { q: `What do CRM permissions control?`, a: `What each user can see (which records), edit (which fields), and do (which actions like deleting or exporting). Permissions determine the scope of access, protecting sensitive data and preventing accidental or unauthorized changes while giving each person the access their job requires.` },
      { q: `How are CRM permissions managed?`, a: `Usually through roles - you define access levels for roles like rep, manager, and admin, then assign users to roles, rather than setting permissions one user at a time. Role-based management keeps access consistent and maintainable as people join, move, and leave.` },
      { q: `Why do CRM permissions matter?`, a: `They protect data from unnecessary exposure and accidental change while ensuring people have the access they need to work. Poorly set permissions either block legitimate work or leave sensitive data too widely accessible. Good permissions balance necessary access against data protection.` },
    ] },

  { slug: `what-is-role-based-access-control`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is role-based access control?`,
    shortAnswer: `Role-based access control (RBAC) grants permissions based on a user's role rather than to each user individually - you define what a rep, manager, or admin can access, then assign people to roles. RBAC makes permissions consistent, scalable, and easy to maintain, since access is managed at the role level and every person in a role inherits the same rights.`,
    intro: [`RBAC is the standard way to manage access at scale: permissions attach to roles, and users get permissions by holding a role.`, `It replaces the unmanageable practice of setting access per person with a clean, consistent, role-driven model.`],
    keyPoints: [`Grants permissions by role, not per individual user.`, `Users inherit access by being assigned a role.`, `Makes permissions consistent and scalable.`, `Simplifies maintenance as people join and move.`],
    sections: [
      { h: `Why it matters`, body: `Setting permissions per user does not scale and drifts into inconsistency as people join and move. RBAC keeps access consistent - everyone in a role has the same rights - and maintainable, since changing a role updates everyone in it at once.` },
      { h: `How Ardovo handles it`, body: `Ardovo uses role-based access control with sensible least-privilege roles out of the box, so access matches each job consistently. Rook flags when a user's access exceeds their role's norm, keeping the model clean as the team changes.` },
    ],
    faqs: [
      { q: `How does role-based access control work?`, a: `You define permission sets for roles - what a rep, manager, or admin can see and do - then assign each user a role, so they inherit that role's access. Access is managed at the role level, so every person in a role has the same consistent rights rather than individually configured ones.` },
      { q: `Why use RBAC instead of per-user permissions?`, a: `Because per-user permissions do not scale and drift into inconsistency as people join, move, and leave. RBAC keeps access consistent - everyone in a role has identical rights - and maintainable, since updating a role's permissions changes everyone in it at once rather than one user at a time.` },
      { q: `What are common CRM roles?`, a: `Typically sales rep (access to own and team records), manager (broader visibility and reporting), and admin (full configuration access), often with variations like read-only or restricted roles. The exact roles reflect your org structure, with each granting the access that job needs and no more.` },
    ] },

  { slug: `how-to-set-up-crm-permissions`, type: `guide`, eyebrow: `Permissions & governance`,
    title: `How to set up CRM permissions`,
    shortAnswer: `Set up CRM permissions by defining roles that match your org, granting each role the least access it needs to do its job, protecting sensitive fields and actions like export and delete, testing that each role sees the right scope, and reviewing access periodically. Start from least privilege and open up as needed, rather than granting broad access and locking down later.`,
    intro: [`Setting up permissions is translating your org structure and data-sensitivity needs into roles and access rules.`, `The guiding principle is least privilege: grant the minimum access each role needs, and widen only where the work requires it.`],
    steps: [
      { h: `Define roles from your org`, body: `Map roles - rep, manager, admin, and any variants - to how your team is actually structured and what each needs to access.` },
      { h: `Grant least privilege`, body: `Give each role the minimum access to do its job, rather than broad access you later try to restrict.` },
      { h: `Protect sensitive fields and actions`, body: `Restrict access to sensitive data and powerful actions like bulk export, delete, and configuration to the roles that truly need them.` },
      { h: `Test and review`, body: `Confirm each role sees the intended scope, and review access periodically as roles and people change.` },
    ],
    sections: [
      { h: `Start from least privilege`, body: `The safe default is granting minimal access and opening up as needs prove out, not granting broad access and restricting later. Least privilege limits the blast radius of accidents and misuse, and it is far easier to widen access on request than to claw back access people have grown used to.` },
      { h: `How Ardovo helps`, body: `Ardovo ships least-privilege roles by default and makes access easy to tune, and Rook flags overly broad grants and unusual access. Permissions start safe and stay clean, so you protect sensitive data without a heavy manual configuration project.` },
    ],
    faqs: [
      { q: `How do you set up CRM permissions?`, a: `Define roles that match your org, grant each the least access it needs, protect sensitive fields and powerful actions like export and delete, test that each role sees the right scope, and review periodically. Start from least privilege and widen as needed rather than granting broadly and restricting later.` },
      { q: `What is the least-privilege principle?`, a: `Granting each role the minimum access required to do its job, rather than broad access restricted later. It limits the damage from accidents and misuse and is easier to manage, since widening access on request is simpler than clawing back access people have grown used to having.` },
      { q: `What actions should be restricted in a CRM?`, a: `Powerful, hard-to-reverse ones: bulk export, mass delete, merging records, changing configuration, and accessing sensitive fields. Limiting these to the roles that genuinely need them prevents both accidental damage and misuse, while everyday work stays unrestricted for the roles that do it.` },
    ] },

  { slug: `what-is-data-governance`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is data governance?`,
    shortAnswer: `Data governance is the set of policies, roles, and processes that ensure data is accurate, secure, consistent, and used appropriately across an organization. In a CRM it covers who owns data, quality standards, access controls, retention, and privacy compliance. Governance is what keeps data trustworthy and compliant as an asset, rather than an ungoverned mess that erodes over time.`,
    intro: [`Data governance is the management framework around data: the rules and responsibilities that keep it accurate, secure, and properly used.`, `It elevates data from something that just accumulates to a governed asset with owners, standards, and accountability.`],
    keyPoints: [`Policies, roles, and processes for managing data.`, `Covers ownership, quality, access, retention, and privacy.`, `Keeps data accurate, secure, and used appropriately.`, `Turns data into a governed, trustworthy asset.`],
    sections: [
      { h: `Why it matters`, body: `Ungoverned data decays, sprawls, and creates compliance risk. Governance assigns ownership and standards so data quality is maintained, access is controlled, and privacy rules are followed, which is what lets an organization trust and safely use its data at scale.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports governance with role-based access, audit logging, retention controls, and automated quality enforcement. Rook maintains data quality and flags governance gaps, so the framework is upheld continuously rather than depending on periodic manual audits.` },
    ],
    faqs: [
      { q: `What does data governance cover?`, a: `Data ownership (who is responsible for what), quality standards, access controls, retention policies, and privacy compliance. In a CRM it spans keeping records accurate, controlling who can access them, deciding how long to keep data, and following privacy regulations - the full framework for managing data as an asset.` },
      { q: `Why is data governance important?`, a: `Because ungoverned data decays, sprawls, and creates compliance and security risk. Governance assigns ownership and standards that keep data accurate and controlled, so the organization can trust and safely use it. Without governance, data quality erodes and privacy obligations go unmet.` },
      { q: `Who owns data governance?`, a: `Usually a combination - a data or RevOps owner sets policy, CRM admins enforce access and quality controls, and data stewards own specific domains. The key is clear accountability: someone must own each policy and standard, or governance becomes rules nobody enforces.` },
    ] },

  { slug: `how-to-set-up-data-governance-in-a-crm`, type: `guide`, eyebrow: `Permissions & governance`,
    title: `How to set up data governance in a CRM`,
    shortAnswer: `Set up data governance by assigning clear ownership for data domains, defining quality standards and enforcing them with validation and dedupe, controlling access with roles, setting retention and privacy policies, and auditing regularly. Make governance mostly automatic - validation, dedupe, and access rules running continuously - so standards hold without depending on manual enforcement.`,
    intro: [`Setting up governance is turning good intentions about data into enforced policies with owners and automation behind them.`, `The difference between governance that works and governance that is a document is enforcement - automated where possible, so standards hold without heroics.`],
    steps: [
      { h: `Assign data ownership`, body: `Give each data domain a clear owner accountable for its quality and rules, so standards have someone behind them.` },
      { h: `Define and enforce quality standards`, body: `Set standards for completeness, accuracy, and consistency, and enforce them with validation, required fields, and dedupe.` },
      { h: `Control access and privacy`, body: `Apply role-based access, protect sensitive data, and set retention and privacy policies to meet compliance obligations.` },
      { h: `Audit regularly`, body: `Review data quality, access, and policy adherence periodically, so governance gaps surface and get closed.` },
    ],
    sections: [
      { h: `Automate enforcement or governance stays a document`, body: `Governance that relies on people manually following rules erodes under pressure. The durable approach automates enforcement - validation, dedupe, and access controls running continuously - so standards hold by default. Automated governance is upheld; documented-only governance becomes a policy nobody follows.` },
      { h: `How Ardovo helps`, body: `Ardovo enforces governance automatically: validation and dedupe protect quality, role-based access controls exposure, audit logs track changes, and retention rules apply. Rook maintains the standards continuously and flags gaps, so governance is a working system rather than a document that sits unenforced.` },
    ],
    faqs: [
      { q: `How do you set up data governance in a CRM?`, a: `Assign clear ownership for data domains, define quality standards and enforce them with validation and dedupe, control access with roles, set retention and privacy policies, and audit regularly. Automate enforcement where possible so standards hold continuously rather than depending on manual effort.` },
      { q: `Why does data governance need automation?`, a: `Because governance that relies on people manually following rules erodes under pressure and inconsistency. Automating enforcement - validation, dedupe, and access controls running continuously - makes standards hold by default. Automated governance is upheld; documented-only governance becomes a policy nobody follows.` },
      { q: `What is the first step in data governance?`, a: `Assigning ownership. Each data domain and policy needs a clear owner accountable for it, or governance becomes rules nobody enforces. With ownership established, you can define standards, enforce them with automation, control access, and audit - all anchored to someone responsible for each area.` },
    ] },

  { slug: `what-is-a-crm-role`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is a CRM role?`,
    shortAnswer: `A CRM role is a named set of permissions assigned to users based on their job - defining what records, fields, and actions someone in that role can access. Roles like sales rep, manager, and admin let you manage access consistently by assigning people to roles rather than configuring each user. Roles are the backbone of role-based access control.`,
    intro: [`A role bundles the permissions a job needs into one named unit you can assign to people.`, `It is the mechanism that makes access manageable: change the role, and everyone in it updates, instead of editing users one by one.`],
    keyPoints: [`A named permission set assigned by job.`, `Defines the records, fields, and actions a user can access.`, `Common roles: rep, manager, admin.`, `The backbone of role-based access control.`],
    sections: [
      { h: `Why it matters`, body: `Roles make access consistent and maintainable. Everyone with the same job has the same access, and updating a role changes all its users at once. This scales cleanly as the team grows, unlike configuring permissions per individual, which drifts into an unmanageable mess.` },
      { h: `How Ardovo handles it`, body: `Ardovo provides sensible roles out of the box with least-privilege defaults, and lets you tune them to your org. Rook flags access that deviates from a role's norm, so roles stay clean and access matches each job as the team changes.` },
    ],
    faqs: [
      { q: `What is the difference between a role and a permission?`, a: `A permission is a single access right - view a record, edit a field, export data. A role is a named bundle of permissions assigned to users by job. Permissions are the building blocks; roles group them so you manage access by job rather than granting individual permissions one by one.` },
      { q: `Why assign access by role?`, a: `Because it is consistent and maintainable. Everyone with the same job gets identical access, and updating a role changes all its users at once. Configuring permissions per individual drifts into inconsistency and becomes unmanageable as the team grows, while roles scale cleanly.` },
      { q: `Can a user have more than one role?`, a: `Depending on the CRM, yes - some systems let a user hold multiple roles and inherit the combined permissions, useful for people who span functions. Others assign one role per user. Either way, the principle holds: access is granted through roles rather than configured per individual.` },
    ] },

  { slug: `what-is-field-level-security`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is field-level security?`,
    shortAnswer: `Field-level security controls access to individual fields, so a user might see a record but not certain sensitive fields on it - like margin, personal data, or internal notes. It provides finer control than record-level access, letting you expose most of a record while protecting specific fields. Field-level security is how sensitive data stays hidden from users who should not see it.`,
    intro: [`Field-level security is the fine-grained layer of permissions: control not just which records a user sees, but which fields within them.`, `It lets you share a record broadly while keeping specific sensitive fields visible only to the roles that need them.`],
    keyPoints: [`Controls access to individual fields, not just records.`, `Hides sensitive fields while exposing the rest of a record.`, `Finer-grained than record-level access.`, `Protects data like margin, personal info, and internal notes.`],
    sections: [
      { h: `Why it matters`, body: `Some fields are sensitive even on records people should otherwise see - cost and margin, personal data, internal-only notes. Field-level security protects exactly those fields without hiding the whole record, giving precise control where record-level access is too blunt.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports field-level security so sensitive fields are visible only to authorized roles, even on widely-shared records. Rook flags fields exposed more broadly than their sensitivity warrants, so protection is precise rather than all-or-nothing at the record level.` },
    ],
    faqs: [
      { q: `What is the difference between field-level and record-level security?`, a: `Record-level security controls which records a user can access at all. Field-level security controls which fields within a record they can see or edit. Field-level is finer-grained, letting you expose most of a record while hiding specific sensitive fields from users who should not see them.` },
      { q: `What fields need field-level security?`, a: `Sensitive ones users might otherwise see on records they access: cost and margin figures, personal or regulated data, internal-only notes, and compensation details. Field-level security protects exactly these while keeping the rest of the record visible, which record-level access cannot do.` },
      { q: `Why use field-level security?`, a: `Because record-level access is sometimes too blunt - you want people to see a record but not certain fields on it. Field-level security gives precise control, protecting sensitive fields like margin or personal data without hiding the whole record, so people get the access they need and no more.` },
    ] },

  { slug: `what-is-an-audit-log`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is an audit log?`,
    shortAnswer: `An audit log is a record of who did what and when in the CRM - which user changed a field, deleted a record, exported data, or altered configuration. It provides accountability, supports compliance, and helps diagnose problems by showing the history of changes. An audit log is essential for security, troubleshooting, and meeting regulatory requirements.`,
    intro: [`An audit log is the CRM's memory of actions: a trail of changes attributed to users and timestamped.`, `It answers "who changed this and when," which is indispensable for accountability, compliance, and figuring out what went wrong.`],
    keyPoints: [`Records who did what and when in the system.`, `Tracks changes, deletions, exports, and configuration edits.`, `Supports accountability, compliance, and troubleshooting.`, `Essential for security and regulatory requirements.`],
    sections: [
      { h: `Why it matters`, body: `Without an audit log, changes are anonymous and irreversible mysteries - you cannot tell who deleted a record or altered a field, or diagnose how data got corrupted. The log provides accountability and the forensic trail needed for security, compliance, and troubleshooting.` },
      { h: `How Ardovo handles it`, body: `Ardovo maintains an audit log of changes, deletions, exports, and configuration edits, attributed and timestamped. Rook can surface unusual activity from the log, so the trail supports both compliance and quick diagnosis when something goes wrong.` },
    ],
    faqs: [
      { q: `What does an audit log record?`, a: `Who did what and when: which user changed a field, deleted or merged a record, exported data, or altered configuration, each timestamped and attributed. It builds a history of actions in the system that provides accountability and a forensic trail for security and compliance.` },
      { q: `Why is an audit log important?`, a: `Because without it, changes are anonymous and untraceable - you cannot tell who deleted a record or how data got corrupted. The audit log provides accountability, supports compliance and regulatory requirements, and gives you the history needed to diagnose problems and investigate misuse.` },
      { q: `How is an audit log used for troubleshooting?`, a: `By showing the history of changes to a record or the system, so you can trace how it reached its current state - who changed what and when. When data looks wrong or something breaks, the audit log reveals the sequence of actions that caused it, turning a mystery into a traceable chain.` },
    ] },

  { slug: `what-is-data-retention`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is data retention?`,
    shortAnswer: `Data retention is the policy governing how long data is kept before being archived or deleted. In a CRM it balances keeping records useful for history and analysis against privacy obligations and storage that require removing old data. A retention policy defines what to keep, for how long, and when to purge, so data lifecycle is deliberate rather than infinite accumulation.`,
    intro: [`Data retention decides the lifespan of data: how long records live before they are archived or removed.`, `It balances competing pressures - keep data for history and analysis, but purge it to meet privacy rules and avoid infinite accumulation.`],
    keyPoints: [`Policy for how long data is kept before archive or deletion.`, `Balances usefulness against privacy and storage.`, `Defines what to keep, for how long, and when to purge.`, `Makes the data lifecycle deliberate, not infinite.`],
    sections: [
      { h: `Why it matters`, body: `Keeping everything forever creates privacy risk, compliance exposure, and a database cluttered with stale records. A retention policy makes removal deliberate and defensible, keeping what has value and purging what is only liability, which is increasingly required by privacy regulation.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports retention policies that archive or purge data on defined schedules, with the controls to meet privacy obligations. Rook applies the policy consistently, so old data is handled deliberately rather than accumulating indefinitely as unmanaged risk.` },
    ],
    faqs: [
      { q: `What is a data retention policy?`, a: `A defined rule for how long each type of data is kept before it is archived or deleted, including what to keep, for how long, and when to purge. It makes the data lifecycle deliberate, balancing the usefulness of history against privacy obligations and the cost of infinite accumulation.` },
      { q: `Why do you need data retention policies?`, a: `Because keeping everything forever creates privacy risk, compliance exposure, and a cluttered database of stale records. Retention makes removal deliberate and defensible, and privacy regulations increasingly require that personal data not be kept longer than necessary, making retention policy a compliance obligation.` },
      { q: `What is the difference between archiving and deleting?`, a: `Archiving removes data from active use while preserving it for history or compliance; deleting permanently removes it. Retention policies use both - archiving data that may be needed for analysis or legal reasons, and deleting data that is only liability once its useful and required life has passed.` },
    ] },

  { slug: `how-to-manage-crm-data-privacy`, type: `guide`, eyebrow: `Permissions & governance`,
    title: `How to manage CRM data privacy`,
    shortAnswer: `Manage CRM data privacy by knowing what personal data you hold, controlling access to it with roles and field-level security, honoring consent and data-subject requests, setting retention limits so data is not kept longer than needed, and logging access for accountability. Treat personal data as a responsibility with controls and processes, not just records to be collected and kept forever.`,
    intro: [`Data privacy is both a legal obligation and a trust issue: the personal data in a CRM must be protected and handled responsibly.`, `Managing it means knowing what you hold, controlling access, honoring rights, and limiting retention - backed by processes that actually run.`],
    steps: [
      { h: `Know what personal data you hold`, body: `Inventory the personal data in the CRM - contact details, communications, sensitive fields - so you can protect what you actually have.` },
      { h: `Control access`, body: `Use roles and field-level security so personal and sensitive data is visible only to those who need it.` },
      { h: `Honor consent and requests`, body: `Track consent and be able to fulfill data-subject requests like access and deletion, as privacy regulations require.` },
      { h: `Limit retention and log access`, body: `Purge personal data when it is no longer needed, and log access so handling is accountable and auditable.` },
    ],
    sections: [
      { h: `Personal data is a responsibility, not just a record`, body: `The mindset shift is treating personal data as something you are accountable for, not just data to collect and keep. That means controlling access, honoring the rights of the people it describes, limiting how long you hold it, and being able to prove responsible handling. Privacy is a process, not a checkbox.` },
      { h: `How Ardovo helps`, body: `Ardovo provides the controls for privacy - role-based and field-level access, retention rules, consent tracking, and audit logging - and Rook helps fulfill data-subject requests and flag over-retention. Personal data is handled responsibly by design rather than left as unmanaged risk.` },
    ],
    faqs: [
      { q: `How do you manage data privacy in a CRM?`, a: `Know what personal data you hold, control access with roles and field-level security, honor consent and data-subject requests like access and deletion, limit retention so data is not kept longer than needed, and log access for accountability. Treat personal data as a responsibility backed by real processes.` },
      { q: `What are data-subject requests?`, a: `Requests from the people your data describes to exercise their privacy rights - to access the data you hold on them, correct it, or have it deleted. Privacy regulations require you to fulfill these, so a CRM needs to locate and act on a person's data across records to honor such requests.` },
      { q: `How does retention relate to privacy?`, a: `Privacy regulations generally require that personal data not be kept longer than necessary for its purpose. Retention limits enforce this by purging personal data once its useful and required life passes. Keeping personal data forever is both a privacy violation and unnecessary risk, so retention is a core privacy control.` },
    ] },

  { slug: `what-is-least-privilege-access`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is least-privilege access?`,
    shortAnswer: `Least-privilege access is the security principle of granting each user only the minimum access needed to do their job, and no more. It limits the damage from accidents, misuse, and breaches by keeping access tightly scoped. In a CRM, least privilege means reps, managers, and admins each get exactly the records, fields, and actions their role requires.`,
    intro: [`Least privilege is a foundational security principle: default to the minimum access, and grant more only when the job requires it.`, `It shrinks the blast radius of anything going wrong - a mistake, a misuse, a compromised account can only reach what that user could access.`],
    keyPoints: [`Grant only the minimum access each job requires.`, `Limits damage from accidents, misuse, and breaches.`, `Access is scoped tightly to role.`, `A foundational security principle for any system.`],
    sections: [
      { h: `Why it matters`, body: `Broad access multiplies risk: every over-granted permission is a larger surface for accidents and misuse. Least privilege keeps that surface small, so a mistake or compromised account can only affect what that user genuinely needed, which is the safest default for sensitive CRM data.` },
      { h: `How Ardovo handles it`, body: `Ardovo defaults to least-privilege roles, granting each job the access it needs and no more, and Rook flags access that exceeds a role's norm. Security is the default posture, so data stays protected without locking down after the fact.` },
    ],
    faqs: [
      { q: `Why use least-privilege access?`, a: `Because it limits the damage from accidents, misuse, and breaches. Every over-granted permission enlarges the surface for something to go wrong. Granting only the minimum each job needs keeps that surface small, so a mistake or compromised account can only reach what that user genuinely required.` },
      { q: `How do you apply least privilege in a CRM?`, a: `Default each role to the minimum access its job requires - records, fields, and actions - and widen only on demonstrated need. Reserve powerful actions like bulk export and delete for roles that truly need them. Start restrictive and open up, rather than granting broadly and clawing back later.` },
      { q: `Is least privilege inconvenient for users?`, a: `Done well, no - it grants the access each job genuinely needs, so legitimate work is unimpeded. The friction comes only from over-restriction, which is fixable on request. Widening access when someone shows a real need is far easier and safer than reclaiming access that was granted too broadly.` },
    ] },

  { slug: `what-is-data-ownership-in-a-crm`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is data ownership in a CRM?`,
    shortAnswer: `Data ownership in a CRM has two senses: record ownership, meaning which rep is responsible for a given lead, account, or deal, and data-governance ownership, meaning who is accountable for the quality and rules of a data domain. Clear ownership - of records and of standards - is what makes accountability, routing, and governance work instead of everything being everyone's and no one's job.`,
    intro: [`Ownership answers "whose is this?" at two levels: the rep who owns a record, and the steward who owns a data domain's quality.`, `Both matter because unowned things get neglected - an account nobody owns goes unworked, a data standard nobody owns goes unenforced.`],
    keyPoints: [`Record ownership: which rep is responsible for a record.`, `Governance ownership: who is accountable for a data domain.`, `Clear ownership drives accountability and routing.`, `Unowned records and standards get neglected.`],
    sections: [
      { h: `Why it matters`, body: `Accountability requires ownership. A record with no owner is worked by no one; a data standard with no owner is enforced by no one. Clear ownership at both the record and governance levels is what ensures accounts get worked and quality gets maintained.` },
      { h: `How Ardovo handles it`, body: `Ardovo assigns clear record ownership through routing and territory rules, and supports governance ownership of data domains. Rook flags orphaned records and unowned data issues, so nothing valuable falls into the gap of being everyone's and no one's responsibility.` },
    ],
    faqs: [
      { q: `What are the two meanings of data ownership?`, a: `Record ownership - which rep is responsible for a specific lead, account, or deal - and governance ownership - who is accountable for the quality and rules of a data domain. Both matter: record ownership drives accountability and routing, governance ownership ensures standards are enforced.` },
      { q: `Why does record ownership matter?`, a: `Because a record with no clear owner is worked by no one - an unowned account goes unworked, an unowned lead goes cold. Clear record ownership ensures every account and lead has someone accountable for it, which is what drives follow-up, coverage, and results.` },
      { q: `What happens without data governance ownership?`, a: `Data standards go unenforced because they are everyone's job and therefore no one's. Quality erodes, rules drift, and no one is accountable for fixing it. Assigning ownership of each data domain ensures someone maintains its quality and standards, rather than letting governance become a document nobody upholds.` },
    ] },

  // ===================================================================
  // CLUSTER N - Pipeline setup
  // ===================================================================
  { slug: `how-to-set-up-a-sales-pipeline-in-a-crm`, type: `guide`, eyebrow: `Pipeline setup`,
    title: `How to set up a sales pipeline in a CRM`,
    shortAnswer: `Set up a sales pipeline in a CRM by defining stages that mirror how buyers actually decide, writing clear exit criteria for each, keeping the stage count to five to seven, wiring the forecast rollup, and loading real deals. Base stages on buyer commitments rather than seller activities, and give each a clear exit test, so the pipeline is an honest forecast engine.`,
    intro: [`Setting up a pipeline in the CRM is configuring the stages, criteria, and rollup that turn deals into a forecast.`, `The quality of a pipeline comes from buyer-based stages with clear exit criteria, not from how many stages or fields you add.`],
    steps: [
      { h: `Define buyer-based stages`, body: `Create five to seven stages that map to buyer commitments - took a meeting, agreed to a proposal - not seller activities like "sent email".` },
      { h: `Write exit criteria`, body: `Give each stage a clear, objective test a deal must pass to advance, so stages mean the same thing to every rep.` },
      { h: `Wire the forecast rollup`, body: `Connect stages to probabilities and the forecast, so the pipeline produces a weighted revenue view automatically.` },
      { h: `Load real deals and keep it clean`, body: `Import open deals, age out stale ones, and keep the pipeline current so the forecast reflects reality.` },
    ],
    sections: [
      { h: `Buyer-based stages with exit criteria`, body: `The two things that make a pipeline trustworthy are stages based on buyer commitments (not seller activity) and clear exit criteria for each. Activity-based stages inflate the pipeline and break the forecast; buyer-based stages with objective exit tests keep it honest and consistent across reps.` },
      { h: `How Ardovo helps`, body: `Ardovo ships a deep deal object with configurable buyer-based stages, exit criteria, and forecast rollup, and Rook updates stages from real activity and flags stale deals. The pipeline stays an honest forecast engine rather than a list reps update by hope.` },
    ],
    faqs: [
      { q: `How many stages should a sales pipeline have?`, a: `Five to seven for most B2B teams. Fewer than five hides where deals stall; more than seven creates busywork and forces reps to guess which stage a deal is in. Each stage should map to a distinct buyer commitment with a clear exit criterion.` },
      { q: `Should pipeline stages be based on buyer or seller actions?`, a: `Buyer actions. Stages like "sent proposal" describe seller activity and inflate the pipeline; stages like "buyer agreed to a proposal" reflect real progress. Buyer-based stages with objective exit criteria produce an honest pipeline and a trustworthy forecast, which activity-based stages do not.` },
      { q: `What makes a sales pipeline trustworthy?`, a: `Buyer-based stages, clear exit criteria for each, consistent application across reps, and freshness - stale deals aged out. Together these make the pipeline reflect reality rather than wishful data entry, which is what lets the forecast built on it be believed.` },
    ] },

  { slug: `what-is-a-pipeline-stage`, type: `glossary`, eyebrow: `Pipeline setup`,
    title: `What is a pipeline stage?`,
    shortAnswer: `A pipeline stage is a defined step a deal occupies on its way from first contact to close, each mapped to a buyer milestone with a clear exit criterion. Stages give the team a shared language for where a deal stands and what has to happen next. Consistent, buyer-based stages are the foundation of an honest pipeline and an accurate forecast.`,
    intro: [`A pipeline stage marks where a deal is in the buying journey - a milestone, not a task.`, `Its value depends on a clear definition and exit criterion, so every rep interprets the same stage the same way.`],
    keyPoints: [`A defined step a deal occupies in the pipeline.`, `Maps to a buyer milestone, not a seller activity.`, `Has a clear exit criterion to advance.`, `Consistent stages are the basis of an honest forecast.`],
    sections: [
      { h: `Why it matters`, body: `Stages are the shared language of the pipeline. When they are defined by buyer milestones with clear exit criteria, everyone agrees on where a deal stands and the forecast is trustworthy. When they are vague or activity-based, the pipeline becomes noise reps interpret differently.` },
      { h: `How Ardovo handles it`, body: `Ardovo lets you define stages with exit criteria and probabilities, and Rook updates a deal's stage from real activity and flags deals stuck too long. Stages reflect genuine buyer progress rather than wishful entry, keeping the pipeline honest.` },
    ],
    faqs: [
      { q: `What is a stage exit criterion?`, a: `A specific, verifiable condition a deal must meet to advance to the next stage, such as "economic buyer confirmed" or "proposal accepted". Exit criteria keep stage data consistent across reps, so a deal in a given stage means the same thing no matter who owns it.` },
      { q: `What is the difference between a pipeline stage and a deal stage?`, a: `They usually refer to the same thing - the step a deal occupies in the pipeline. "Pipeline stage" emphasizes the overall structure; "deal stage" emphasizes the individual deal's position. Both describe the buyer-milestone step a specific opportunity currently sits in.` },
      { q: `How many pipeline stages should there be?`, a: `Five to seven for most B2B teams. Too few hide where deals stall; too many create busywork and guessing. Each stage should represent a distinct buyer milestone with a clear exit criterion, so the count reflects the real steps of your buying process, not arbitrary granularity.` },
    ] },

  { slug: `how-to-define-pipeline-stages`, type: `guide`, eyebrow: `Pipeline setup`,
    title: `How to define pipeline stages`,
    shortAnswer: `Define pipeline stages by studying how buyers actually progress in your won deals, naming each stage after a buyer commitment, writing an objective exit criterion for each, keeping the count to five to seven, and assigning a win probability per stage. Base stages on real buyer behavior with clear exit tests, so the pipeline is consistent and the forecast honest.`,
    intro: [`Defining stages is the highest-leverage pipeline decision: it sets whether the pipeline reflects reality or fiction.`, `The discipline is grounding stages in real buyer behavior and giving each an objective exit criterion, not inventing seller-centric steps.`],
    steps: [
      { h: `Study how buyers actually progress`, body: `Review recent won and lost deals to see the real sequence of buyer commitments, so stages mirror reality rather than assumption.` },
      { h: `Name stages after buyer commitments`, body: `Define each stage by what the buyer has committed to, not what the seller did, so stages reflect genuine progress.` },
      { h: `Write objective exit criteria`, body: `Give each stage a clear, verifiable test to advance, so two reps would agree on whether a deal qualifies.` },
      { h: `Assign win probabilities`, body: `Attach a default probability to each stage from historical data, so the pipeline can weight and forecast automatically.` },
    ],
    sections: [
      { h: `Ground stages in real buyer behavior`, body: `Stages invented from how you think selling should go, rather than how buyers actually decide, produce a pipeline that does not match reality. Studying won and lost deals reveals the real commitments buyers make, and stages built on those - with objective exit criteria - keep the pipeline honest and consistent.` },
      { h: `How Ardovo helps`, body: `Ardovo supports stages with exit criteria and data-driven probabilities, and Rook can derive realistic stage definitions and probabilities from your historical deals. Stages reflect how your buyers genuinely progress, so the pipeline and forecast are grounded in reality.` },
    ],
    faqs: [
      { q: `How do you define good pipeline stages?`, a: `Study how buyers actually progress in your won and lost deals, name each stage after a buyer commitment rather than a seller activity, write an objective exit criterion for each, keep the count to five to seven, and assign a win probability per stage from historical data.` },
      { q: `Why base stages on buyer behavior?`, a: `Because stages invented from how you think selling should go do not match how buyers actually decide, so the pipeline misrepresents reality. Grounding stages in the real commitments buyers make - drawn from won and lost deals - keeps the pipeline honest and the forecast accurate.` },
      { q: `How do you make stages consistent across reps?`, a: `Give each stage an objective, verifiable exit criterion, so two reps would agree on whether a deal qualifies to advance. Vague stage definitions get interpreted differently, scattering the pipeline. Clear exit criteria are what make a given stage mean the same thing regardless of who owns the deal.` },
    ] },

  { slug: `how-to-set-up-multiple-pipelines`, type: `guide`, eyebrow: `Pipeline setup`,
    title: `How to set up multiple pipelines`,
    shortAnswer: `Set up multiple pipelines when you have genuinely distinct sales processes - new business versus renewals, or different products with different buying journeys - giving each its own stages and criteria. Add pipelines only for real process differences, not preemptively, because unnecessary pipelines fragment reporting and add complexity a single well-designed pipeline would avoid.`,
    intro: [`Multiple pipelines let different sales motions each have stages that fit them, rather than forcing everything through one ill-fitting process.`, `But they are easy to overuse. The rule is to add a pipeline only when a genuinely different process demands different stages.`],
    steps: [
      { h: `Confirm the processes are truly distinct`, body: `Verify that the motions differ enough to need different stages - new business versus renewal, distinct products - not just cosmetically.` },
      { h: `Design stages for each process`, body: `Give each pipeline stages and exit criteria that fit its specific buying journey, rather than reusing a generic set.` },
      { h: `Route deals to the right pipeline`, body: `Ensure deals land in the correct pipeline by type, so each process is tracked in the pipeline built for it.` },
      { h: `Keep reporting coherent`, body: `Set up reporting that rolls up across pipelines where needed, so multiple pipelines do not fragment the overall view.` },
    ],
    sections: [
      { h: `Add pipelines only for real process differences`, body: `Every extra pipeline fragments reporting and adds complexity. Add one only when a sales motion genuinely needs different stages - a renewal process is nothing like new-business acquisition. If two motions share stages, one pipeline with a deal-type field is simpler than two pipelines.` },
      { h: `How Ardovo helps`, body: `Ardovo supports multiple pipelines with their own stages and rolls reporting up across them, and Rook routes deals to the right pipeline by type. You get process-fit pipelines where genuinely needed without fragmenting the overall forecast, and guidance against unnecessary ones.` },
    ],
    faqs: [
      { q: `When should you use multiple pipelines?`, a: `When you have genuinely distinct sales processes that need different stages - new business versus renewals, or products with different buying journeys. Add pipelines only for real process differences, not preemptively, since unnecessary pipelines fragment reporting and add complexity.` },
      { q: `What is the downside of too many pipelines?`, a: `They fragment reporting and add complexity. Each pipeline is a separate process to maintain and roll up, and reps must pick the right one. If two motions share the same stages, one pipeline with a deal-type field is simpler and cleaner than splitting into two pipelines unnecessarily.` },
      { q: `How do you report across multiple pipelines?`, a: `Set up reporting that rolls up across pipelines for the overall view while letting each pipeline be analyzed on its own. Without cross-pipeline reporting, multiple pipelines fragment the forecast. Good setup preserves both the per-process detail and the aggregate picture leadership needs.` },
    ] },

  { slug: `how-to-clean-up-your-sales-pipeline`, type: `guide`, eyebrow: `Pipeline setup`,
    title: `How to clean up your sales pipeline`,
    shortAnswer: `Clean up your sales pipeline by aging out stale deals with no recent activity, closing deals with no realistic path forward, correcting deals parked in the wrong stage, updating unrealistic close dates, and adding rules to keep it clean. A pipeline stuffed with dead deals produces a fantasy forecast, so a ruthless one-time cleanup plus ongoing freshness rules keeps it honest.`,
    intro: [`A cluttered pipeline is a lying pipeline: dead deals, wrong stages, and fantasy close dates inflate the forecast into fiction.`, `Cleaning it means a ruthless pass to remove and correct, then freshness rules so it does not clog up again.`],
    steps: [
      { h: `Age out stale deals`, body: `Close-lost or archive deals with no activity in 30 to 60 days and no path forward, since they are noise, not pipeline.` },
      { h: `Fix wrong stages`, body: `Move deals parked in a stage they no longer belong in, so each deal's stage reflects its real status.` },
      { h: `Correct unrealistic close dates`, body: `Update close dates that ignore the real sales cycle, so the forecast timing reflects reality rather than hope.` },
      { h: `Add freshness rules`, body: `Set rules that flag stale deals and missing next steps automatically, so the pipeline stays clean after the cleanup.` },
    ],
    sections: [
      { h: `A cluttered pipeline is a fantasy forecast`, body: `Every dead deal, wrong stage, and fantasy close date distorts the forecast. Cleaning the pipeline once is necessary, but the lasting fix is freshness rules that flag staleness automatically, so the pipeline reflects reality continuously rather than clogging up again between manual cleanups.` },
      { h: `How Ardovo helps`, body: `Ardovo flags stale deals, wrong stages, and unrealistic close dates automatically, and Rook updates stages from real activity and ages out dead deals. The pipeline stays clean and honest continuously, so the forecast reflects reality without recurring manual cleanup projects.` },
    ],
    faqs: [
      { q: `How do you clean up a sales pipeline?`, a: `Age out stale deals with no recent activity and no path forward, close deals that are dead, correct deals parked in the wrong stage, update unrealistic close dates, and add freshness rules to keep it clean. A one-time ruthless pass plus ongoing rules keeps the pipeline honest.` },
      { q: `Why does pipeline hygiene matter?`, a: `Because a pipeline stuffed with dead deals, wrong stages, and fantasy close dates produces a fantasy forecast. Leadership plans hiring and spending on revenue that will not arrive. Clean pipeline data is what makes the forecast trustworthy, so pipeline hygiene directly affects business decisions.` },
      { q: `How do you keep a pipeline clean after cleanup?`, a: `Add freshness rules that automatically flag stale deals, missing next steps, and unrealistic close dates, and update stages from real activity. Cleaning once without prevention just lets clutter rebuild. Continuous freshness enforcement is what keeps the pipeline reflecting reality between deals closing and new ones entering.` },
    ] },

  // ===================================================================
  // CLUSTER O - List segmentation
  // ===================================================================
  { slug: `what-is-list-segmentation`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is list segmentation?`,
    shortAnswer: `List segmentation is dividing your contacts or accounts into groups that share attributes or behavior - by industry, size, role, stage, or engagement - so you can target each group with relevant messaging. Segmentation makes outreach specific instead of one-size-fits-all, and it depends on clean, standardized data, since segments match on exact field values.`,
    intro: [`Segmentation turns an undifferentiated list into targeted groups you can speak to differently.`, `Its accuracy rests entirely on data quality - a segment can only be as good as the standardized fields it filters on.`],
    keyPoints: [`Divides contacts or accounts into attribute- or behavior-based groups.`, `Enables relevant, targeted messaging per group.`, `Common bases: industry, size, role, stage, engagement.`, `Depends on clean, standardized data to match accurately.`],
    sections: [
      { h: `Why it matters`, body: `Generic outreach to an undifferentiated list underperforms targeted outreach to a relevant segment. Segmentation lets you match message to audience, but it only works if the underlying data is standardized - inconsistent values scatter a segment and miss members.` },
      { h: `How Ardovo handles it`, body: `Ardovo segments on standardized, enriched fields and behavioral signals, so segments are accurate and complete. Rook keeps the underlying data clean, so a segment captures everyone it should rather than missing members whose fields were spelled inconsistently.` },
    ],
    faqs: [
      { q: `What can you segment a CRM list by?`, a: `Firmographic attributes (industry, size, region), role and seniority, deal or lifecycle stage, lead score, and behavior or engagement. Many segments combine dimensions - for example, mid-market SaaS accounts with high engagement. The bases you use reflect how you want to target different groups.` },
      { q: `Why does segmentation depend on data quality?`, a: `Because segments match on exact field values. If an industry or region is spelled inconsistently, a segment for it misses the records with variant spellings, so it undercounts and misfires. Standardized, complete data is what lets a segment capture everyone it should.` },
      { q: `Why segment instead of messaging everyone the same?`, a: `Because relevant, targeted messaging to a specific segment outperforms generic outreach to an undifferentiated list. Segmentation lets you speak to each group about what matters to them - their industry, role, or stage - which lifts engagement and conversion compared to one-size-fits-all.` },
    ] },

  { slug: `how-to-segment-your-crm-contacts`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to segment your CRM contacts`,
    shortAnswer: `Segment CRM contacts by first ensuring the fields you will segment on are clean and standardized, choosing meaningful dimensions (industry, role, stage, engagement), building filters that combine them, saving segments as dynamic lists that update automatically, and using them to target outreach. Clean the data first, then build dynamic segments that stay current as records change.`,
    intro: [`Segmenting contacts is building the targeted groups you will actually message - but it starts upstream, with clean data.`, `The best segments are dynamic: they update automatically as records change, rather than being static snapshots that go stale.`],
    steps: [
      { h: `Clean the fields you will segment on`, body: `Standardize industry, role, region, and other segment fields first, since segments match on exact values and inconsistent data scatters them.` },
      { h: `Choose meaningful dimensions`, body: `Pick the attributes that matter for targeting - industry, role, stage, engagement - rather than segmenting on fields you will not act on.` },
      { h: `Build combined filters`, body: `Layer criteria to define precise segments, like high-engagement contacts at mid-market accounts in a target industry.` },
      { h: `Save as dynamic lists`, body: `Save segments as dynamic lists that update automatically as records change, so they stay current without manual rebuilding.` },
    ],
    sections: [
      { h: `Clean data first, then dynamic segments`, body: `Two principles make segmentation work: standardize the fields you segment on, because segments match exact values, and save segments as dynamic lists that auto-update, so they never go stale. A segment on messy data misses members, and a static list is outdated the moment a record changes.` },
      { h: `How Ardovo helps`, body: `Ardovo keeps segment fields clean and enriched through Rook, and supports dynamic lists that update automatically as records change. Segments are accurate and always current, so targeted outreach reaches everyone it should without manual list maintenance.` },
    ],
    faqs: [
      { q: `How do you segment contacts in a CRM?`, a: `Ensure the fields you will segment on are clean and standardized first, choose meaningful dimensions like industry, role, stage, and engagement, build filters that combine them, and save the results as dynamic lists that update automatically. Clean data plus dynamic segments keeps targeting accurate and current.` },
      { q: `What is a dynamic segment?`, a: `A saved segment defined by criteria that updates automatically as records change - contacts that newly match the filter join, and ones that no longer match leave. Unlike a static list snapshot, a dynamic segment stays current, so a segment for high-engagement contacts always reflects who currently qualifies.` },
      { q: `Why clean data before segmenting?`, a: `Because segments match on exact field values, so inconsistent data scatters a segment and misses members. A segment for a given industry misses records where that industry is spelled differently. Standardizing the segment fields first ensures each segment captures everyone it should rather than undercounting.` },
    ] },

  { slug: `what-is-a-dynamic-list`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is a dynamic list?`,
    shortAnswer: `A dynamic list is a segment defined by criteria that updates automatically as records change - contacts that start matching join, and ones that stop matching drop off. It contrasts with a static list, a fixed snapshot that must be manually maintained. Dynamic lists stay current on their own, so a segment always reflects who qualifies right now.`,
    intro: [`A dynamic list is a living segment: you define the rules, and membership updates itself as data changes.`, `It solves the core problem of static lists - going stale the moment a record changes - by re-evaluating membership continuously.`],
    keyPoints: [`A segment defined by criteria, not a fixed membership.`, `Updates automatically as records change.`, `Contrasts with a static, manually maintained list.`, `Always reflects who currently qualifies.`],
    sections: [
      { h: `Why it matters`, body: `A static list is outdated the instant a record changes - a contact who newly qualifies is missed, one who no longer fits stays. Dynamic lists keep segments accurate automatically, so targeting always hits the right current audience without manual list rebuilding.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports dynamic lists that re-evaluate membership as records change, and Rook keeps the underlying data clean so membership is accurate. Segments stay current on their own, so outreach always reaches exactly who qualifies now.` },
    ],
    faqs: [
      { q: `What is the difference between a dynamic list and a static list?`, a: `A dynamic list is defined by criteria and updates membership automatically as records change. A static list is a fixed snapshot that must be manually maintained. Dynamic lists stay current on their own; static lists go stale the moment a record changes and need manual rebuilding.` },
      { q: `When should you use a dynamic list?`, a: `Whenever the segment should stay current - an ongoing target audience, an engagement tier, a lifecycle stage. Dynamic lists suit any segment you will use repeatedly, since they update themselves. Static lists suit one-time snapshots, like the exact recipients of a specific past campaign.` },
      { q: `How does a dynamic list stay accurate?`, a: `By re-evaluating its criteria against records continuously, so contacts that newly match join and ones that no longer match leave. Its accuracy depends on clean underlying data - if segment fields are inconsistent, membership is wrong - so dynamic lists work best on standardized, enriched data.` },
    ] },

  { slug: `how-to-create-crm-filters`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to create CRM filters and views`,
    shortAnswer: `Create CRM filters by choosing the fields and conditions that define the records you want, combining criteria with and/or logic, testing that the filter returns the right set, and saving useful filters as named views you can reuse. Build filters on clean, standardized fields, and save the ones you use repeatedly as views so you are not rebuilding them each time.`,
    intro: [`Filters are how you find the records you need; saved views are how you stop rebuilding the same filter every day.`, `Their reliability depends on standardized data, since a filter matches exact values.`],
    steps: [
      { h: `Choose fields and conditions`, body: `Pick the fields and criteria that define the records you want - stage, owner, industry, activity - to build the filter.` },
      { h: `Combine with and/or logic`, body: `Layer conditions to narrow precisely, using and to require all criteria and or to include any, for exactly the set you need.` },
      { h: `Test the results`, body: `Confirm the filter returns the intended records and does not miss or over-include, adjusting the logic if needed.` },
      { h: `Save reusable filters as views`, body: `Save the filters you use repeatedly as named views, so you and the team can reuse them instead of rebuilding.` },
    ],
    sections: [
      { h: `Save what you reuse`, body: `Rebuilding the same filter every day is wasted effort. Saving frequently-used filters as named views - my open deals, stalled deals, this quarter's target segment - makes them one click away and shareable. Views turn ad-hoc filtering into a reusable, consistent way the whole team finds records.` },
      { h: `How Ardovo helps`, body: `Ardovo makes filtering easy on clean, standardized fields and lets you save and share named views. Rook keeps the underlying data consistent so filters match reliably, and surfaces the views you use most, so finding the right records is fast and repeatable.` },
    ],
    faqs: [
      { q: `How do you create a filter in a CRM?`, a: `Choose the fields and conditions that define the records you want, combine them with and/or logic to narrow precisely, test that the result returns the intended set, and save reusable filters as named views. Building on standardized fields ensures the filter matches reliably.` },
      { q: `What is the difference between a filter and a saved view?`, a: `A filter is the set of conditions that selects records. A saved view is a named, reusable filter you can return to or share. Filters are ad-hoc; views make a useful filter permanent and one click away, so you are not rebuilding the same criteria repeatedly.` },
      { q: `Why do filters sometimes miss records?`, a: `Usually because the data is inconsistent - a filter matches exact field values, so records with variant spellings or missing values fall outside it. A filter for a given industry misses records where that industry is spelled differently. Standardizing the filtered fields fixes this.` },
    ] },

  { slug: `what-is-customer-segmentation`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is customer segmentation?`,
    shortAnswer: `Customer segmentation is grouping customers by shared characteristics - industry, size, value, behavior, or lifecycle stage - so you can tailor selling, marketing, and service to each group. It focuses effort where it pays off, letting teams treat high-value or high-potential segments differently. Effective segmentation depends on clean, complete data to define the groups accurately.`,
    intro: [`Customer segmentation divides your customer base into meaningful groups so you can treat them differently and deliberately.`, `It is how a team moves from one-size-fits-all to focused, differentiated strategies for different kinds of customers.`],
    keyPoints: [`Groups customers by shared characteristics.`, `Bases include industry, size, value, behavior, and lifecycle.`, `Enables tailored selling, marketing, and service.`, `Requires clean, complete data to define groups accurately.`],
    sections: [
      { h: `Why it matters`, body: `Not all customers are equal in value or needs. Segmentation lets teams concentrate effort on high-value and high-potential groups and tailor their approach to each, which is far more effective than treating a diverse customer base uniformly.` },
      { h: `How Ardovo handles it`, body: `Ardovo segments customers on enriched, standardized attributes and behavioral signals, and Rook keeps the data complete so segments are accurate. Teams can target high-value segments and tailor their approach, grounded in reliable data rather than guesswork.` },
    ],
    faqs: [
      { q: `How do you segment customers?`, a: `Group them by shared characteristics - industry, company size, account value, behavior, or lifecycle stage - based on how you want to differentiate your approach. Many segmentations combine dimensions, like high-value accounts in a specific industry. Clean, complete data is what makes the groups accurate.` },
      { q: `Why segment customers?`, a: `Because customers differ in value and needs, and treating them uniformly wastes effort. Segmentation lets you concentrate on high-value and high-potential groups and tailor selling, marketing, and service to each. Differentiated treatment of meaningful segments outperforms a one-size-fits-all approach.` },
      { q: `What is the difference between customer and list segmentation?`, a: `They overlap heavily. List segmentation is the general practice of dividing contacts or accounts into targeted groups, often for outreach. Customer segmentation specifically groups existing customers, often for account strategy, service levels, and expansion. Both group records by shared traits to tailor treatment.` },
    ] },

  { slug: `how-to-build-a-target-account-list-from-crm-data`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to build a target account list from CRM data`,
    shortAnswer: `Build a target account list by defining your ideal customer profile, enriching accounts so the ICP attributes are present, filtering to accounts that match the profile, scoring or ranking them by fit and potential, and saving the result as a dynamic list. Ground the list in your ICP and enriched data, so it captures the accounts genuinely worth pursuing.`,
    intro: [`A target account list focuses the team on the accounts most worth pursuing - a filtered, ranked set drawn from your data against your ICP.`, `Its quality depends on enrichment: you cannot filter accounts by attributes they are missing.`],
    steps: [
      { h: `Define the ICP`, body: `Specify the firmographic and technographic traits of your ideal accounts, so the list has a clear standard to match against.` },
      { h: `Enrich so attributes are present`, body: `Fill the ICP attributes through enrichment, since accounts missing industry or size cannot be filtered against the profile.` },
      { h: `Filter to matching accounts`, body: `Build a filter that selects accounts fitting the ICP, narrowing to the ones worth targeting.` },
      { h: `Rank and save as a dynamic list`, body: `Score matches by fit and potential, then save the list dynamically so it updates as accounts change and enrich.` },
    ],
    sections: [
      { h: `Enrichment makes the list possible`, body: `A target list filters accounts by ICP attributes - industry, size, stack - so accounts missing those attributes cannot be evaluated and drop out or get missed. Enriching first ensures the whole account base can be assessed against the profile, so the list captures every account genuinely worth pursuing.` },
      { h: `How Ardovo helps`, body: `Ardovo enriches accounts and scores them against your ICP, so a target account list draws on complete data. Rook keeps the list dynamic and current as accounts enrich and change, so the team always works from an accurate, up-to-date set of the accounts worth pursuing.` },
    ],
    faqs: [
      { q: `How do you build a target account list?`, a: `Define your ideal customer profile, enrich accounts so the ICP attributes are present, filter to accounts that match the profile, rank them by fit and potential, and save the result as a dynamic list. Grounding it in your ICP and enriched data captures the accounts genuinely worth pursuing.` },
      { q: `Why does a target list need enriched data?`, a: `Because it filters accounts by ICP attributes like industry and size, so accounts missing those attributes cannot be evaluated and get missed. Enriching first ensures the entire account base can be assessed against the profile, so the list captures every worthwhile account rather than only the already-complete ones.` },
      { q: `Should a target account list be static or dynamic?`, a: `Dynamic, so it stays current as accounts change and newly enriched accounts become evaluable against the ICP. A static list goes stale as new accounts enter and existing ones change. A dynamic target list continuously reflects the accounts that currently match your profile.` },
    ] },

  { slug: `how-to-use-tags-in-a-crm`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to use tags in a CRM`,
    shortAnswer: `Use tags in a CRM to flag records with informal, cross-cutting attributes that do not warrant a full field - event attendees, a campaign audience, a special interest. Keep a controlled tag vocabulary so tags do not sprawl into near-duplicates, use them for flexible ad-hoc grouping, and promote a tag to a real field if it becomes structurally important. Govern tags or they become noise.`,
    intro: [`Tags are the flexible, lightweight way to label records for grouping without adding a formal field for every attribute.`, `Their strength is flexibility and their weakness is sprawl - ungoverned tags multiply into near-duplicate noise that helps no one.`],
    steps: [
      { h: `Use tags for cross-cutting attributes`, body: `Tag records with informal, flexible labels that do not deserve a full field - event attendee, campaign audience, special interest.` },
      { h: `Keep a controlled vocabulary`, body: `Maintain an agreed set of tags so people reuse existing ones instead of creating near-duplicates that fragment grouping.` },
      { h: `Group and segment by tag`, body: `Filter and build segments on tags for flexible, ad-hoc grouping that complements structured fields.` },
      { h: `Promote important tags to fields`, body: `If a tag becomes structurally important and widely used, convert it to a proper field with a picklist.` },
    ],
    sections: [
      { h: `Govern tags or they become noise`, body: `Tags sprawl exactly like picklists: without governance, people create "vip", "VIP", and "v.i.p" as separate tags, fragmenting the grouping. Keep a controlled vocabulary, reuse existing tags, and prune duplicates, so tags stay a useful flexible layer rather than a chaotic mess of near-duplicates.` },
      { h: `How Ardovo helps`, body: `Ardovo supports tags with a governed vocabulary and lets you segment on them, and Rook flags near-duplicate tags and suggests promoting heavily-used tags to fields. Tags stay a clean, flexible grouping layer instead of sprawling into noise.` },
    ],
    faqs: [
      { q: `When should you use a tag instead of a field?`, a: `Use a tag for informal, cross-cutting attributes that do not warrant a full field - event attendees, a campaign audience, a special interest - where you want flexible ad-hoc grouping. Use a field for structured, consistently-captured data you filter and report on formally. Promote a tag to a field if it becomes structurally important.` },
      { q: `How do you keep tags from getting messy?`, a: `Govern them with a controlled vocabulary so people reuse existing tags rather than creating near-duplicates like "vip" and "VIP", and prune duplicates periodically. Without governance, tags sprawl into fragmented noise. A maintained tag set keeps them a useful, flexible grouping layer.` },
      { q: `Can you segment by tags?`, a: `Yes - tags are a flexible grouping mechanism you can filter and build segments on, complementing structured fields. A segment for everyone tagged as a past event attendee, for example, groups records by an informal attribute. Governed tags make such segments reliable; sprawling ones fragment them.` },
    ] },

  { slug: `what-is-behavioral-segmentation`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is behavioral segmentation?`,
    shortAnswer: `Behavioral segmentation groups contacts or accounts by what they do - website visits, email engagement, product usage, content consumed, or buying signals - rather than by static attributes like industry or size. It captures intent and readiness, letting teams target based on behavior. Behavioral segmentation depends on captured activity data, which is why activity capture underpins it.`,
    intro: [`Behavioral segmentation groups by action rather than attribute - what a prospect does, not just what they are.`, `It complements firmographic segmentation: firmographics say who fits, behavior says who is interested and ready.`],
    keyPoints: [`Groups records by behavior, not static attributes.`, `Captures intent and readiness signals.`, `Complements firmographic (attribute-based) segmentation.`, `Depends on captured activity and engagement data.`],
    sections: [
      { h: `Why it matters`, body: `Attribute-based segments say who fits your profile, but behavior says who is actually engaged and ready. Behavioral segmentation lets teams target the prospects showing intent right now - the highest-value moment to reach out - which static attributes alone cannot reveal.` },
      { h: `How Ardovo handles it`, body: `Ardovo builds behavioral segments from captured activity and engagement signals, and Rook flags accounts and contacts whose behavior indicates readiness. Because Ardovo captures activity automatically, the behavioral data underneath these segments is complete and current.` },
    ],
    faqs: [
      { q: `What is behavioral segmentation based on?`, a: `What contacts or accounts do: website visits, email opens and clicks, product usage, content consumed, and buying signals. Unlike firmographic segmentation, which groups by static attributes like industry and size, behavioral segmentation groups by action, capturing intent and readiness.` },
      { q: `How is behavioral segmentation different from firmographic?`, a: `Firmographic segmentation groups by static attributes - industry, size, region - answering who fits your profile. Behavioral segmentation groups by actions and engagement, answering who is interested and ready. They complement each other: fit plus behavior identifies the best accounts to act on now.` },
      { q: `What does behavioral segmentation require?`, a: `Captured activity and engagement data - website, email, product, and meeting signals. Behavioral segments are only as good as the underlying activity data, so automatic activity capture underpins them. Without complete captured behavior, behavioral segments miss the very signals they are meant to group on.` },
    ] },

  { slug: `how-to-segment-leads-for-outreach`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to segment leads for outreach`,
    shortAnswer: `Segment leads for outreach by grouping them on fit (ICP match), stage (where they are in the funnel), and behavior (engagement and intent), then tailoring messaging to each segment. Enrich and standardize the data first so segments are accurate, and combine fit, stage, and behavior so outreach reaches the right leads with a relevant message at the right time.`,
    intro: [`Segmenting leads for outreach turns a generic blast into targeted, relevant messaging that lands.`, `The strongest segmentation combines fit, stage, and behavior - who they are, where they are, and what they are doing.`],
    steps: [
      { h: `Enrich and standardize first`, body: `Fill and standardize the segment fields, since accurate lead segments depend on clean fit and behavioral data.` },
      { h: `Segment by fit`, body: `Group leads by how well they match your ICP, so high-fit leads get prioritized, tailored outreach.` },
      { h: `Segment by stage and behavior`, body: `Layer in funnel stage and engagement, so a hot, high-fit lead is messaged differently from a cold, early one.` },
      { h: `Tailor messaging per segment`, body: `Match the message to each segment's fit, stage, and intent, so outreach is relevant rather than generic.` },
    ],
    sections: [
      { h: `Combine fit, stage, and behavior`, body: `The most effective lead segments layer three dimensions: fit (is this the right kind of lead), stage (where in the funnel), and behavior (how engaged). A high-fit, highly-engaged lead deserves immediate personal outreach; a low-fit, cold one does not. Combining the dimensions targets the right leads with the right message.` },
      { h: `How Ardovo helps`, body: `Ardovo segments leads on enriched fit data, funnel stage, and captured behavioral signals, and Rook keeps the underlying data clean so segments are accurate. Outreach reaches the right leads with relevant messaging at the right moment, tailored to each segment's fit, stage, and intent.` },
    ],
    faqs: [
      { q: `How should you segment leads for outreach?`, a: `Combine three dimensions: fit (how well they match your ICP), stage (where they are in the funnel), and behavior (engagement and intent). Enrich and standardize the data first so segments are accurate, then tailor messaging to each segment so outreach is relevant and well-timed rather than generic.` },
      { q: `Why combine fit, stage, and behavior?`, a: `Because each answers a different question - who the lead is, where they are, and what they are doing. A high-fit, highly-engaged lead deserves immediate personal outreach; a low-fit, cold one does not. Combining the dimensions targets the right leads with the right message at the right time.` },
      { q: `What makes lead segments accurate?`, a: `Clean, enriched, standardized data. Fit segments need enriched firmographics, behavioral segments need captured activity, and all segments match on exact field values, so inconsistency scatters them. Ensuring the segment fields are complete and standardized first is what makes lead segments reliable rather than misfiring.` },
    ] },

  { slug: `what-is-a-saved-view`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is a saved view?`,
    shortAnswer: `A saved view is a named, reusable filter and layout in a CRM - a defined set of records with chosen columns and sorting you can return to or share. Saved views like "my open deals" or "stalled accounts" make finding the right records one click away instead of rebuilding a filter each time. They turn ad-hoc filtering into a consistent, shareable way to work.`,
    intro: [`A saved view is a filter you name and keep, so a useful way of looking at your data is always at hand.`, `It is a small productivity multiplier: the difference between rebuilding a filter every day and clicking a saved view.`],
    keyPoints: [`A named, reusable filter and layout of records.`, `Includes chosen columns and sorting, not just criteria.`, `Makes finding records one click instead of a rebuild.`, `Can be shared for consistent team workflows.`],
    sections: [
      { h: `Why it matters`, body: `Reps look at the same slices of data constantly - their open deals, stalled accounts, this week's tasks. Saved views make those one click away and consistent across the team, turning repetitive filtering into a fast, shared way of working.` },
      { h: `How Ardovo handles it`, body: `Ardovo lets you save and share named views with filters, columns, and sorting, and Rook surfaces the views you use most. Finding the right records is instant and consistent, so reps and managers work from the same reliable slices of data.` },
    ],
    faqs: [
      { q: `What does a saved view include?`, a: `The filter criteria that select records, plus the chosen columns, sorting, and layout - so it captures both which records to show and how to display them. That makes a saved view a complete, reusable way of looking at a slice of your data, not just a set of filter conditions.` },
      { q: `How is a saved view different from a segment?`, a: `They overlap. A segment is a defined group of records, often for targeting. A saved view is a reusable filter and layout for working with records day to day. A view can display a segment; the emphasis differs - segments for targeting, views for finding and working records.` },
      { q: `Why use saved views?`, a: `Because reps look at the same slices of data repeatedly - open deals, stalled accounts, this week's tasks - and rebuilding those filters each time wastes effort. Saved views make them one click away and shareable, turning repetitive filtering into a fast, consistent workflow across the team.` },
    ] },

  { slug: `how-to-standardize-company-names`, type: `guide`, eyebrow: `Segmentation`,
    title: `How to standardize company names`,
    shortAnswer: `Standardize company names by choosing a canonical form (drop or normalize suffixes like Inc and LLC consistently), mapping variant spellings to one value, using the web domain as the reliable account identifier instead of the name, and validating new entries. Because company names vary endlessly, lean on the domain for matching and standardize the display name for consistency.`,
    intro: [`Company names are a standardization nightmare: "Acme", "Acme Inc", "Acme, Incorporated", and "ACME LLC" are one company in four forms.`, `The practical answer is twofold: standardize the display name, but match and dedupe on the domain, which is far more stable and unique.`],
    steps: [
      { h: `Choose a canonical name form`, body: `Decide how to handle suffixes (Inc, LLC, Ltd) and capitalization consistently, so display names follow one convention.` },
      { h: `Map variants to the canonical value`, body: `Collapse the endless spelling variants of each company into one standard display name.` },
      { h: `Match on domain, not name`, body: `Use the web domain as the account identifier for matching and dedupe, since it is far more unique and stable than the name.` },
      { h: `Validate new entries`, body: `Standardize and check company names at entry, and enrich the domain, so new accounts stay consistent and matchable.` },
    ],
    sections: [
      { h: `Match on domain, standardize the name`, body: `Trying to match companies on name alone is a losing battle because names vary endlessly. The reliable identifier is the web domain, which is unique and stable, so use it for matching and dedupe. Standardize the display name for consistency in reports and segments, but let the domain do the identity work.` },
      { h: `How Ardovo helps`, body: `Ardovo matches and dedupes accounts on domain, the stable identifier, and standardizes display names for consistency. Rook enriches the domain and normalizes name variants, so accounts are reliably matched and cleanly presented without the futile effort of matching on endlessly-varying names.` },
    ],
    faqs: [
      { q: `Why are company names so hard to standardize?`, a: `Because one company appears in endless forms - "Acme", "Acme Inc", "Acme, Incorporated", "ACME LLC" - varying by suffix, punctuation, and capitalization. Matching on name alone is a losing battle. The practical fix is standardizing the display name for consistency while matching on the more stable web domain.` },
      { q: `Should you match accounts on name or domain?`, a: `Domain. A company's web domain is far more unique and stable than its variously-spelled name, so it is the reliable identifier for matching and deduplication. Use the domain for identity work, and standardize the display name separately for clean reports and segments.` },
      { q: `How do you standardize company display names?`, a: `Choose a canonical convention for suffixes like Inc and LLC and for capitalization, then map the variant spellings of each company to one standard form, and validate new entries against the convention. This keeps names consistent in reports and segments, while the domain handles matching.` },
    ] },

  { slug: `what-is-a-crm-tag`, type: `glossary`, eyebrow: `Segmentation`,
    title: `What is a CRM tag?`,
    shortAnswer: `A CRM tag is a flexible, informal label you attach to records to group them by a cross-cutting attribute that does not warrant a full field - like event attendees, a campaign audience, or a special interest. Tags enable ad-hoc grouping and segmentation, but need a governed vocabulary, or they sprawl into near-duplicate noise that fragments the grouping they were meant to enable.`,
    intro: [`A tag is the lightweight, flexible alternative to a formal field - a quick label for grouping records however you need.`, `Its flexibility is the appeal and the risk: ungoverned, tags multiply into near-duplicates that defeat their own purpose.`],
    keyPoints: [`A flexible, informal label attached to records.`, `Groups by cross-cutting attributes not worth a full field.`, `Enables ad-hoc grouping and segmentation.`, `Needs a governed vocabulary to avoid sprawl.`],
    sections: [
      { h: `Why it matters`, body: `Tags fill the gap between structured fields and no structure at all, letting teams group records flexibly for one-off needs. But their value collapses without governance: near-duplicate tags fragment the grouping, so the same discipline that keeps picklists clean applies to tags.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports tags with a governed vocabulary and segmentation on them, and Rook flags near-duplicate tags and suggests promoting heavily-used ones to fields. Tags stay a clean, flexible layer rather than degrading into noise.` },
    ],
    faqs: [
      { q: `What is a CRM tag used for?`, a: `Grouping records by a flexible, cross-cutting attribute that does not warrant a full field - event attendees, a campaign audience, a special interest. Tags enable ad-hoc grouping and segmentation, complementing structured fields with a lightweight way to label records however a team needs.` },
      { q: `What is the difference between a tag and a field?`, a: `A field is structured, consistently captured data you filter and report on formally. A tag is a flexible, informal label for ad-hoc grouping. Use tags for cross-cutting attributes not worth a field, and promote a tag to a field if it becomes structurally important and widely used.` },
      { q: `Do CRM tags need governance?`, a: `Yes. Ungoverned tags sprawl into near-duplicates - "vip", "VIP", "v.i.p" as separate tags - fragmenting the grouping they were meant to enable. A controlled tag vocabulary, tag reuse, and periodic pruning keep tags a clean, useful layer rather than degrading them into noise.` },
    ] },

  // ===================================================================
  // CLUSTER P1 - Data-ops fundamentals + quality
  // ===================================================================
  { slug: `what-is-a-single-source-of-truth`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is a single source of truth?`,
    shortAnswer: `A single source of truth is one authoritative, trusted place where a piece of data lives, so everyone works from the same accurate version instead of conflicting copies. In a CRM it means one record per customer, one agreed set of numbers, one place that is definitively right. It depends on clean data, deduplication, and integration to keep everything aligned.`,
    intro: [`A single source of truth is the goal a CRM exists to serve: one trusted version of the data everyone agrees on.`, `It is undermined by duplicates, silos, and conflicting copies, which is why data hygiene and integration are what make it real.`],
    keyPoints: [`One authoritative, trusted place for each piece of data.`, `Everyone works from the same version, not conflicting copies.`, `In a CRM: one record per customer, one agreed set of numbers.`, `Requires dedupe, clean data, and integration to hold.`],
    sections: [
      { h: `Why it matters`, body: `When teams work from different copies of the data, they disagree on basic facts and decisions are made on the wrong numbers. A single source of truth ends the arguments about whose data is right, which is the foundational value a CRM is supposed to deliver.` },
      { h: `How Ardovo handles it`, body: `Ardovo maintains a single source of truth through deduplication, clean data, and integration, so each customer has one golden record and reports tie out. Rook keeps the data unified and aligned, so the whole business works from one version that is genuinely trustworthy.` },
    ],
    faqs: [
      { q: `What does single source of truth mean?`, a: `One authoritative, trusted place where each piece of data lives, so everyone works from the same accurate version rather than conflicting copies. In a CRM it means one record per customer and one agreed set of numbers - a definitive place that is right, ending disputes over whose data to believe.` },
      { q: `What undermines a single source of truth?`, a: `Duplicates that split a customer across records, data silos where systems hold conflicting copies, and dirty data that makes the trusted version unreliable. Achieving a single source of truth requires deduplication, integration, and data hygiene working together to keep everything unified and aligned.` },
      { q: `Why is a single source of truth important?`, a: `Because when teams work from different copies, they disagree on basic facts and make decisions on wrong numbers. A single source of truth ends those disputes and gives the business one reliable version to act on. It is the foundational value a CRM is meant to deliver.` },
    ] },

  { slug: `what-is-master-data-management`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is master data management?`,
    shortAnswer: `Master data management (MDM) is the discipline of maintaining one consistent, authoritative version of an organization's core data - customers, accounts, products - across all systems. It uses matching, deduplication, and governance to create golden records and keep them aligned everywhere. MDM is how large organizations achieve a single source of truth across many connected systems.`,
    intro: [`Master data management is single-source-of-truth thinking scaled across an entire organization's systems.`, `It formalizes the practices - matching, deduplication, governance - that keep core data consistent everywhere it lives.`],
    keyPoints: [`Maintains one authoritative version of core data across systems.`, `Covers customers, accounts, products, and other master data.`, `Uses matching, dedupe, and governance to build golden records.`, `How large organizations achieve a cross-system single source of truth.`],
    sections: [
      { h: `Why it matters`, body: `In an organization with many systems, the same customer exists in each, and they drift out of sync. MDM keeps one authoritative version aligned across all of them, so the whole business shares consistent core data rather than every system telling a different story.` },
      { h: `How Ardovo handles it`, body: `Ardovo applies MDM principles - matching, deduplication, and golden records - within the CRM and across integrations, so core data stays consistent everywhere it connects. Rook maintains the golden records and alignment, giving even complex setups a single authoritative version of customers and accounts.` },
    ],
    faqs: [
      { q: `What is master data management?`, a: `The discipline of maintaining one consistent, authoritative version of core data - customers, accounts, products - across all of an organization's systems. It uses matching, deduplication, and governance to create golden records and keep them aligned everywhere, achieving a cross-system single source of truth.` },
      { q: `How is MDM different from data hygiene?`, a: `Data hygiene keeps records clean within a system. MDM is broader, maintaining one authoritative version of core data consistent across many systems. Hygiene is a component of MDM, which adds cross-system matching, golden records, and governance to keep the whole organization aligned on core data.` },
      { q: `Who needs master data management?`, a: `Organizations with multiple systems holding overlapping core data - where the same customer exists in the CRM, billing, support, and marketing tools and drifts out of sync. MDM keeps one authoritative version aligned across them. Smaller single-system setups get similar benefits from strong in-CRM dedupe and hygiene.` },
    ] },

  { slug: `what-is-data-integrity`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data integrity?`,
    shortAnswer: `Data integrity is the accuracy, consistency, and reliability of data over its whole lifecycle - the assurance that data is correct, unaltered except by intended changes, and trustworthy. It covers preventing corruption, unauthorized changes, and inconsistency. In a CRM, data integrity is what lets people trust that the records reflect reality and have not been degraded.`,
    intro: [`Data integrity is the trustworthiness of data - that it is correct and stays correct as it moves and changes.`, `It is protected by validation, access controls, audit trails, and backups, which together prevent corruption and unauthorized alteration.`],
    keyPoints: [`The accuracy, consistency, and reliability of data over time.`, `Assurance data is correct and only intentionally changed.`, `Protected by validation, access controls, and audit trails.`, `What lets people trust the records reflect reality.`],
    sections: [
      { h: `Why it matters`, body: `Data with poor integrity cannot be trusted, so every decision built on it is suspect. Integrity is what makes data a reliable asset - guarding against corruption, unauthorized change, and inconsistency so the records genuinely reflect reality.` },
      { h: `How Ardovo handles it`, body: `Ardovo protects data integrity with validation, role-based access, audit logging, and consistent structure, so records stay accurate and changes are traceable. Rook maintains consistency and flags anomalies, so the data remains trustworthy across its lifecycle.` },
    ],
    faqs: [
      { q: `What is the difference between data integrity and data quality?`, a: `Data quality is how good the data is at a point in time - accurate, complete, consistent. Data integrity is the assurance that data stays correct and reliable over its lifecycle, protected from corruption and unauthorized change. Quality is the state; integrity is the ongoing trustworthiness.` },
      { q: `How is data integrity protected?`, a: `Through validation that prevents bad values, access controls that limit who can change data, audit trails that record changes, and backups that guard against loss. Together these ensure data is only altered by intended changes and stays accurate and traceable across its lifecycle.` },
      { q: `Why does data integrity matter in a CRM?`, a: `Because every decision, report, and automation depends on the data being correct and trustworthy. If integrity is compromised - by corruption, unauthorized change, or inconsistency - people cannot trust the records, and the CRM stops being a reliable source of truth. Integrity is what makes the data dependable.` },
    ] },

  { slug: `what-is-a-data-steward`, type: `glossary`, eyebrow: `Permissions & governance`,
    title: `What is a data steward?`,
    shortAnswer: `A data steward is the person accountable for the quality, consistency, and proper use of a specific data domain - ensuring records are accurate, standards are followed, and issues get fixed. Stewards are a key role in data governance, giving each data area a clear owner. Without stewards, data quality is everyone's job and therefore no one's.`,
    intro: [`A data steward is the named owner of a data domain's health - the person who answers for its quality.`, `Stewardship is what turns data governance from policy on paper into accountability with a name attached.`],
    keyPoints: [`Accountable for the quality of a specific data domain.`, `Ensures accuracy, standards, and proper use.`, `A key role in data governance.`, `Gives each data area a clear owner.`],
    sections: [
      { h: `Why it matters`, body: `Data quality erodes when it belongs to no one. A steward gives a data domain a clear owner accountable for its health, so standards are enforced and issues are fixed rather than ignored. Stewardship is the accountability that makes governance actually work.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports stewardship by assigning ownership of data domains and surfacing quality issues to the responsible steward. Rook does much of the maintenance automatically, so a steward oversees and directs rather than manually cleaning, making the role sustainable even for lean teams.` },
    ],
    faqs: [
      { q: `What does a data steward do?`, a: `Owns the quality, consistency, and proper use of a specific data domain - ensuring records are accurate, standards are followed, and issues get fixed. The steward is accountable for that data area's health, making them the go-to person for its quality and the enforcer of its governance rules.` },
      { q: `Why do you need data stewards?`, a: `Because data quality erodes when it is everyone's job and therefore no one's. A steward gives a data domain a clear, accountable owner, so standards are enforced and problems are fixed rather than ignored. Stewardship is the accountability that turns governance policy into maintained quality.` },
      { q: `Is a data steward the same as a CRM admin?`, a: `Related but distinct. A CRM admin configures and maintains the whole system; a data steward is accountable for the quality of a specific data domain. On small teams one person may do both, but stewardship is specifically about owning data quality, while admin is about system configuration.` },
    ] },

  { slug: `how-to-measure-crm-data-quality`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to measure CRM data quality`,
    shortAnswer: `Measure CRM data quality by scoring five dimensions - completeness, accuracy, consistency, uniqueness, and timeliness - across your key objects and fields, tracking each as a percentage, weighting the fields that drive automation most, and watching the trend over time. Measure continuously if you can, so quality is a live metric you can prove is improving rather than a one-off audit.`,
    intro: [`Measuring data quality turns a vague worry into a number you can manage, target, and prove you are improving.`, `The five dimensions give a complete picture, and the trend over time matters more than any single reading.`],
    steps: [
      { h: `Score the five dimensions`, body: `Measure completeness, accuracy, consistency, uniqueness, and timeliness for your key objects and fields, each as a percentage.` },
      { h: `Weight the fields that matter`, body: `Emphasize the fields that drive routing, scoring, and outreach, so the score reflects quality where it counts most.` },
      { h: `Track the trend`, body: `Watch the scores over time, since the trajectory - improving, flat, or decaying - matters more than a single snapshot.` },
      { h: `Measure continuously`, body: `Automate the measurement where possible, so quality is a live metric rather than a periodic manual audit that goes stale.` },
    ],
    sections: [
      { h: `The trend matters more than the number`, body: `A single data-quality reading tells you the state today; the trend tells you whether prevention is working or quality is decaying. Measure continuously and watch the trajectory, so you catch regressions early and can prove that cleanup and prevention efforts are actually moving the number.` },
      { h: `How Ardovo helps`, body: `Ardovo measures data quality live per object and field across the five dimensions, so the score is always current. Rook works to raise it and you watch the trend climb, so quality is a managed, provable metric rather than a number from an audit that is stale the next day.` },
    ],
    faqs: [
      { q: `What dimensions measure data quality?`, a: `Five: completeness (are key fields filled), accuracy (are values correct), consistency (are formats standardized), uniqueness (duplicate rate), and timeliness (is the data current). Scoring these as percentages across your key objects gives a complete, trackable picture of data health.` },
      { q: `How often should you measure data quality?`, a: `Continuously if you can, so it is a live metric rather than a one-off audit that goes stale. If measuring manually, do it before and after cleanups and periodically between. The trend over time matters more than any single reading, which is why continuous measurement is ideal.` },
      { q: `What is a good data quality score?`, a: `There is no universal number - it depends on your data and needs. Set targets for the fields that drive automation, such as high completeness on email and company, and focus on the trend. Whether the score is climbing or decaying tells you more than comparing it to an arbitrary benchmark.` },
    ] },

  { slug: `what-is-record-matching`, type: `glossary`, eyebrow: `Deduplication`,
    title: `What is record matching?`,
    shortAnswer: `Record matching is determining whether two records represent the same real-world entity, using exact keys and fuzzy comparison of fields like name, email, and company. It is the engine behind deduplication, lead-to-account matching, and merging. Good record matching combines strong identifiers like email and domain with fuzzy logic to catch the messy duplicates exact matching misses.`,
    intro: [`Record matching is the underlying capability that powers dedupe, lead-to-account matching, and merges - deciding when two records are really one entity.`, `It blends exact matching on strong keys with fuzzy comparison, because real-world data rarely matches perfectly.`],
    keyPoints: [`Determines whether two records are the same entity.`, `Combines exact keys with fuzzy field comparison.`, `Powers dedupe, lead-to-account matching, and merges.`, `Strong identifiers plus fuzzy logic catch real duplicates.`],
    sections: [
      { h: `Why it matters`, body: `Matching is the foundation under several data-ops capabilities. Get it right and dedupe, lead-to-account matching, and merges all work; get it wrong and you either miss duplicates or wrongly merge distinct records. The quality of matching determines the quality of everything built on it.` },
      { h: `How Ardovo handles it`, body: `Ardovo matches on strong identifiers like email and domain plus fuzzy comparison, scoring each candidate by confidence. Rook auto-acts on high-confidence matches and flags borderline ones, so dedupe, lead-to-account matching, and merges all rest on reliable matching.` },
    ],
    faqs: [
      { q: `What is record matching used for?`, a: `Determining whether two records are the same entity, which powers deduplication, lead-to-account matching, and record merging. Any capability that needs to know "are these the same person or company" relies on record matching underneath, making it a foundational data-ops function.` },
      { q: `How does record matching work?`, a: `It combines exact matching on strong identifiers - email for people, web domain for companies - with fuzzy comparison of fields like name and address that catches typos, nicknames, and formatting differences. Candidates are scored by confidence, so strong matches auto-resolve and borderline ones get review.` },
      { q: `Why not just match on exact values?`, a: `Because real-world duplicates rarely match exactly - the same person has two emails, a typo in the name, or a company written five ways. Exact matching catches only perfect copies. Combining exact keys with fuzzy comparison catches the messy majority of real duplicates that exact-only matching misses.` },
    ] },

  { slug: `what-is-data-mapping`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is data mapping?`,
    shortAnswer: `Data mapping is defining how data elements in one system correspond to those in another - which source field goes to which destination field, and how values translate between them. It is essential for imports, migrations, and integrations, where data moves between systems that structure it differently. Correct data mapping is what makes data land in the right place with the right meaning.`,
    intro: [`Data mapping is the translation layer between systems that name and structure their data differently.`, `It underpins every data movement - imports, migrations, integrations - and a mistake in it silently misplaces data.`],
    keyPoints: [`Defines how fields in one system correspond to another.`, `Includes translating value formats between systems.`, `Essential for imports, migrations, and integrations.`, `Errors misplace data silently, without an error.`],
    sections: [
      { h: `Why it matters`, body: `Whenever data moves between systems, mapping decides whether it lands correctly. A wrong mapping does not throw an error - it silently puts values in the wrong field or fails to translate them. Because the failure is invisible, correct mapping and testing are essential to data movement.` },
      { h: `How Ardovo handles it`, body: `Ardovo auto-maps common fields and translates values for imports, migrations, and integrations, previewing the result before committing. Rook flags likely mismaps, so data moving into Ardovo lands in the right field with the right meaning rather than failing silently.` },
    ],
    faqs: [
      { q: `Where is data mapping used?`, a: `In imports (file columns to CRM fields), migrations (one system's model to another's), and integrations (syncing fields between connected tools). Anywhere data moves between systems that structure it differently, mapping defines the correspondence, making it essential to all data movement.` },
      { q: `Why is data mapping error-prone?`, a: `Because a wrong mapping fails silently - no error, just values in the wrong field or untranslated picklist values. The failure is invisible until someone notices misplaced data. This is why correct mapping, careful attention to near-match fields, and testing on a sample are essential to any data movement.` },
      { q: `What does data mapping include besides pairing fields?`, a: `Translating value formats and picklist options between systems, splitting or combining fields, and deciding where unmatched fields go. Two systems might both have a status field but use different values, or format dates differently. Good mapping handles the value translation, not just the field-to-field pairing.` },
    ] },

  { slug: `how-to-prevent-data-entry-errors`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to prevent data entry errors`,
    shortAnswer: `Prevent data entry errors by minimizing manual entry through activity capture and enrichment, validating what reps do enter with format rules and picklists, blocking duplicates at creation, and keeping required fields minimal so reps are not rushed into junk. The most reliable way to prevent entry errors is to reduce how much reps type in the first place.`,
    intro: [`Data entry errors are inevitable wherever humans type - typos, wrong fields, inconsistent values, accidental duplicates.`, `The best prevention is twofold: reduce how much reps enter at all, and validate the little they do.`],
    steps: [
      { h: `Minimize manual entry`, body: `Capture activity and enrich records automatically, so reps type far less and there is less opportunity for error.` },
      { h: `Validate what reps enter`, body: `Use format rules and picklists so bad values and inconsistent entries are caught or prevented at the point of entry.` },
      { h: `Block duplicates at creation`, body: `Check new records against existing ones, so accidental duplicate entry is stopped before it saves.` },
      { h: `Keep required fields minimal`, body: `Require only what matters, so reps are not rushed into typing junk to escape a long form.` },
    ],
    sections: [
      { h: `Less typing means fewer errors`, body: `Every field a rep types by hand is a chance for an error. The highest-leverage prevention is reducing manual entry through capture and enrichment, so there is simply less to get wrong. Validation catches the rest, but the biggest win is eliminating the entry rather than policing it.` },
      { h: `How Ardovo helps`, body: `Ardovo minimizes manual entry through automatic activity capture and enrichment, validates what reps do enter, and blocks duplicates at creation. Rook fills machine-knowable fields so reps type almost nothing, which prevents entry errors by removing most of the entry that causes them.` },
    ],
    faqs: [
      { q: `What is the best way to prevent data entry errors?`, a: `Reduce how much reps type in the first place through automatic activity capture and enrichment, then validate the little they do enter with format rules and picklists, and block duplicates at creation. Less manual entry means fewer opportunities for error, which is more effective than policing entry.` },
      { q: `How does validation prevent entry errors?`, a: `By catching bad values at the point of entry - format rules reject malformed emails and phones, picklists prevent inconsistent values, and duplicate blocking stops accidental duplicates. Validation stops errors before they save, which is far cheaper than finding and fixing them later in cleanup.` },
      { q: `Do required fields reduce or cause errors?`, a: `Both, depending on restraint. A few well-chosen required fields ensure critical data is captured. Too many push rushed reps to type junk like "x" to escape the form, creating errors. Keeping required fields minimal - just the essentials - captures what matters without provoking garbage entry.` },
    ] },

  { slug: `what-is-data-completeness`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data completeness?`,
    shortAnswer: `Data completeness is the degree to which records have all the fields they need filled in - no critical gaps. It is one of the core dimensions of data quality, measured as the percentage of records with key fields populated. Completeness matters most on the fields that drive routing, scoring, and outreach, since an empty critical field breaks the systems that depend on it.`,
    intro: [`Data completeness measures whether records have what they need - the presence of the values that matter.`, `It is not about filling every field, but about the critical fields being populated, because those are the ones that break things when empty.`],
    keyPoints: [`How fully records have their needed fields filled.`, `A core dimension of data quality.`, `Measured as percent of records with key fields populated.`, `Matters most on fields that drive automation.`],
    sections: [
      { h: `Why it matters`, body: `An incomplete record cannot be fully used - a lead with no company cannot be scored, a contact with no email cannot be reached. Completeness on the critical fields is what lets routing, scoring, and outreach work. Gaps in the fields that matter directly break downstream systems.` },
      { h: `How Ardovo handles it`, body: `Ardovo drives completeness through enrichment that fills machine-knowable fields and well-timed prompts for judgment fields, and measures completeness live. Rook keeps critical fields populated automatically, so records are complete enough to route, score, and reach without a manual filling effort.` },
    ],
    faqs: [
      { q: `How is data completeness measured?`, a: `As the percentage of records with their key fields populated, usually focused on the fields that drive routing, scoring, and outreach rather than every field. Measuring completeness on critical fields tells you whether records are usable, which matters more than raw fill rate across all fields.` },
      { q: `Which fields need to be complete?`, a: `The ones that break something when empty: email, company, industry, owner, and stage, depending on your automation. Completeness on these matters far more than filling every field. An empty rarely-used field is harmless; an empty critical field breaks routing, scoring, or outreach.` },
      { q: `How do you improve data completeness?`, a: `Enrich machine-knowable fields automatically, prompt reps for judgment fields at the right moment, and require only the few truly critical fields. Automating the fillable gaps and reserving human effort for judgment fields raises completeness where it matters without burdening reps with data entry.` },
    ] },

  { slug: `how-to-consolidate-duplicate-data`, type: `guide`, eyebrow: `Deduplication`,
    title: `How to consolidate duplicate data`,
    shortAnswer: `Consolidate duplicate data by finding all the duplicate sets with exact and fuzzy matching, reviewing them, merging each set into one golden record that keeps the best value per field and all history, and then preventing new duplicates at entry. Merge into golden records rather than deleting, and add prevention, so consolidation is permanent instead of a recurring cleanup.`,
    intro: [`Consolidating duplicate data is stitching a fragmented database back into one record per entity, without losing anything.`, `The lasting version pairs a thorough merge with prevention, so the data does not fragment again after you consolidate it.`],
    steps: [
      { h: `Find all duplicate sets`, body: `Use exact and fuzzy matching across objects to surface every set of records representing the same entity.` },
      { h: `Review and merge into golden records`, body: `Confirm the sets, then merge each into one record keeping the best value per field and all combined history.` },
      { h: `Preserve history, do not delete`, body: `Merge rather than delete, so activity, relationships, and engagement from every source record survive under the golden record.` },
      { h: `Prevent new duplicates`, body: `Turn on duplicate blocking at every entry point, so the consolidation holds instead of fragmenting again.` },
    ],
    sections: [
      { h: `Consolidate once, prevent forever`, body: `Consolidating duplicates without prevention means the database fragments again and you repeat the work. Pair the one-time merge with duplicate blocking at manual entry, imports, and forms, so once consolidated the data stays unified. Consolidation plus prevention is permanent; consolidation alone is temporary.` },
      { h: `How Ardovo helps`, body: `Ardovo finds duplicates with exact and fuzzy matching, merges them into golden records preserving history, and blocks new duplicates at every entry point. Rook does the consolidation busywork and keeps prevention on, so the database stays unified rather than needing repeated consolidation.` },
    ],
    faqs: [
      { q: `How do you consolidate duplicate data?`, a: `Find all duplicate sets with exact and fuzzy matching, review them, merge each into one golden record that keeps the best value per field and all history, and then prevent new duplicates at entry. Merging into golden records rather than deleting preserves everything, and prevention makes it permanent.` },
      { q: `Should you delete or merge to consolidate duplicates?`, a: `Merge into golden records. Deleting duplicates discards their activity, relationships, and engagement history. Merging combines everything under one surviving record that keeps the best value per field, so consolidation loses nothing. Always merge rather than delete when consolidating duplicate data.` },
      { q: `How do you keep data consolidated?`, a: `Turn on duplicate blocking at every entry point - manual creation, imports, and forms - so new duplicates cannot form after you consolidate. Without prevention, the database fragments again and you repeat the consolidation. Prevention is what makes consolidation a one-time project rather than a recurring chore.` },
    ] },

  { slug: `what-is-data-consistency`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data consistency?`,
    shortAnswer: `Data consistency is the degree to which the same information is represented the same way across records and systems - one format per value, one version of each fact everywhere. It is a core dimension of data quality, and it underpins matching, segmentation, and reporting, all of which compare values that must be consistent to work. Inconsistent data quietly breaks every feature that matches on values.`,
    intro: [`Data consistency is about uniformity: the same thing looks the same everywhere it appears.`, `It is the quiet prerequisite for matching-based features, which fail when the same value is represented differently across records.`],
    keyPoints: [`The same information represented the same way everywhere.`, `A core dimension of data quality.`, `Underpins matching, segmentation, and reporting.`, `Inconsistency silently breaks value-matching features.`],
    sections: [
      { h: `Why it matters`, body: `Matching, segmentation, and reporting all compare values, and comparison only works if values are consistent. Inconsistent data - the same industry spelled five ways, one fact stored differently in two systems - silently breaks dedupe, scatters segments, and makes reports disagree. Consistency is foundational.` },
      { h: `How Ardovo handles it`, body: `Ardovo enforces consistency with picklists, validation, and normalization, and keeps facts stored once and referenced rather than copied. Rook standardizes values across records and systems, so matching, segmentation, and reporting all operate on consistent, comparable data.` },
    ],
    faqs: [
      { q: `Why does data consistency matter?`, a: `Because matching, segmentation, and reporting all compare values, and comparison only works when values are consistent. Inconsistent data - the same value formatted differently across records - silently breaks deduplication, scatters segments, and makes reports disagree. Consistency is the quiet prerequisite for every value-matching feature.` },
      { q: `How do you achieve data consistency?`, a: `Enforce it with picklists and validation so values are entered uniformly, normalize existing variant values into canonical forms, and store each fact once and reference it rather than copying it. Consistency comes from standardizing entry and structure, not from periodic cleanup of the mess inconsistency creates.` },
      { q: `What is the difference between consistency and accuracy?`, a: `Accuracy is whether a value is correct; consistency is whether the same information is represented uniformly. A value can be accurate but inconsistent - correctly identifying a country, but written differently from other records. Both are data-quality dimensions, and consistency specifically enables matching and comparison.` },
    ] },

  { slug: `what-is-a-unique-identifier`, type: `glossary`, eyebrow: `Fields & data model`,
    title: `What is a unique identifier?`,
    shortAnswer: `A unique identifier is a value that reliably distinguishes one record from all others - like an email for a contact, a web domain for a company, or a system-assigned ID. Unique identifiers are the strongest keys for matching, deduplication, and integration, because they map to exactly one entity. Choosing good unique identifiers is what makes record matching reliable.`,
    intro: [`A unique identifier is the value that says "this record, and no other" - the anchor for matching and integration.`, `Its uniqueness and stability determine how reliably you can match, dedupe, and sync records across systems.`],
    keyPoints: [`A value that reliably distinguishes one record from all others.`, `Examples: email, web domain, system ID.`, `The strongest key for matching, dedupe, and integration.`, `Good identifiers are unique and stable over time.`],
    sections: [
      { h: `Why it matters`, body: `Matching, deduplication, and integration all rely on identifying the same entity across records or systems, and unique identifiers are the most reliable way to do it. A good identifier - unique and stable - makes matching trustworthy; matching on weak keys like name alone produces false matches and misses.` },
      { h: `How Ardovo handles it`, body: `Ardovo uses strong unique identifiers - email for contacts, domain for accounts, plus system IDs - as the backbone of matching, dedupe, and integration. Rook relies on these reliable keys, so records match to exactly one entity across the system and connected tools.` },
    ],
    faqs: [
      { q: `What makes a good unique identifier?`, a: `Uniqueness and stability - a value that maps to exactly one entity and does not change over time. Email for contacts and web domain for companies are strong because they are highly unique and reasonably stable. System-assigned IDs are perfectly unique. Names make poor identifiers because they repeat and vary.` },
      { q: `Why are unique identifiers important for matching?`, a: `Because matching, dedupe, and integration all need to identify the same entity reliably, and a unique identifier maps to exactly one entity. Matching on strong identifiers like email and domain is reliable, while matching on weak keys like name alone produces false matches and misses real duplicates.` },
      { q: `What is used as a unique identifier in a CRM?`, a: `For contacts, the email address; for accounts, the web domain; and system-assigned record IDs behind the scenes. These strong identifiers anchor matching, deduplication, and integration. They are chosen because they are far more unique and stable than names, which vary and repeat too much to identify reliably.` },
    ] },

  { slug: `how-to-back-up-crm-data`, type: `guide`, eyebrow: `Permissions & governance`,
    title: `How to back up CRM data`,
    shortAnswer: `Back up CRM data by exporting or replicating records on a regular schedule, storing backups securely and separately, including relationships and history not just flat records, testing that a backup can actually be restored, and keeping backups before risky operations like bulk changes or migrations. A backup you have never tested restoring is a hope, not a safeguard.`,
    intro: [`Backing up CRM data protects against the disasters that do happen: a bad bulk update, a botched migration, accidental mass deletion.`, `The often-skipped step is verifying that a backup can actually be restored, because an untested backup may not work when you need it.`],
    steps: [
      { h: `Back up on a schedule`, body: `Export or replicate data regularly, so you always have a recent recovery point rather than relying on ad-hoc exports.` },
      { h: `Include relationships and history`, body: `Capture the links between records and activity history, not just flat records, so a restore preserves structure and context.` },
      { h: `Store securely and separately`, body: `Keep backups secure and separate from the live system, so they survive whatever affects the primary data.` },
      { h: `Test restoring`, body: `Periodically verify that a backup can actually be restored, since an untested backup may fail exactly when you need it.` },
    ],
    sections: [
      { h: `Back up before risky operations`, body: `The moments you most need a backup are bulk updates, imports, migrations, and mass deletions - exactly the operations that can go wrong at scale. Taking a fresh, verified backup right before any risky operation means a mistake is recoverable rather than catastrophic. Never run a bulk change without a backup you trust.` },
      { h: `How Ardovo helps`, body: `Ardovo protects data with regular backups that preserve relationships and history, and audit logging that traces changes. Combined with duplicate blocking and safe merges, this means risky operations are recoverable and accidental damage is traceable, so your data is safeguarded rather than one bad bulk action from disaster.` },
    ],
    faqs: [
      { q: `How often should you back up CRM data?`, a: `On a regular schedule so you always have a recent recovery point, plus a fresh backup right before any risky operation like a bulk update, import, or migration. Regular scheduled backups protect against gradual problems, and pre-operation backups protect against the specific changes most likely to go wrong.` },
      { q: `Why test restoring a backup?`, a: `Because a backup you have never restored is a hope, not a safeguard - it may be incomplete, corrupted, or missing relationships and history. Periodically verifying that a backup actually restores confirms it will work when you need it, which is the whole point of having one.` },
      { q: `What should a CRM backup include?`, a: `Not just flat records but the relationships between them and activity history, so a restore preserves structure and context rather than disconnected rows. A backup that loses which contacts belong to which accounts, or the activity timeline, restores data without the context that made it useful.` },
    ] },

  { slug: `what-is-data-accuracy`, type: `glossary`, eyebrow: `CRM data hygiene`,
    title: `What is data accuracy?`,
    shortAnswer: `Data accuracy is whether the values in your records are correct and reflect reality - the right email, the current company, the true deal amount. It is a core dimension of data quality, distinct from completeness (whether fields are filled) and consistency (whether values are uniform). Accuracy erodes through data decay, and it is maintained through verification and enrichment.`,
    intro: [`Data accuracy is the most basic quality question: is the value actually right?`, `It is constantly under threat from decay - values that were correct when entered become wrong as the world changes - so accuracy is maintained, not achieved once.`],
    keyPoints: [`Whether values are correct and reflect reality.`, `A core dimension of data quality.`, `Distinct from completeness and consistency.`, `Eroded by decay, maintained by verification and enrichment.`],
    sections: [
      { h: `Why it matters`, body: `Inaccurate data is actively misleading - worse than missing data, because people act on it. A wrong email bounces, an outdated company misroutes, a stale amount corrupts the forecast. Accuracy is what makes data trustworthy enough to act on, and it requires ongoing verification because it decays.` },
      { h: `How Ardovo handles it`, body: `Ardovo maintains accuracy through verification and continuous enrichment that re-checks and refreshes values as they decay. Rook flags likely-stale data - a contact who probably changed jobs, an email that stopped resolving - so records stay accurate rather than silently drifting wrong.` },
    ],
    faqs: [
      { q: `What is the difference between data accuracy and completeness?`, a: `Completeness is whether fields are filled; accuracy is whether the filled values are correct. A record can be complete but inaccurate - every field populated, but with a wrong email or an outdated company. Both are quality dimensions: completeness is about presence, accuracy is about correctness.` },
      { q: `Why does data accuracy decay?`, a: `Because the real world changes - people switch jobs, companies rebrand or move, emails and phones get retired. A value that was accurate when entered becomes wrong as reality shifts, even though no one made an error. This decay, around 25 to 30 percent yearly for contact data, is why accuracy requires ongoing verification.` },
      { q: `How do you maintain data accuracy?`, a: `Through verification that checks values are correct and continuous enrichment that refreshes them as they decay. Because accuracy erodes constantly, a one-time correction is not enough - ongoing re-verification, especially of contact details that decay fast, is what keeps records accurate over time.` },
    ] },

  { slug: `how-to-set-up-data-quality-rules`, type: `guide`, eyebrow: `CRM data hygiene`,
    title: `How to set up data quality rules`,
    shortAnswer: `Set up data quality rules by defining standards for the fields that matter, enforcing them with validation, required fields, and picklists at entry, adding duplicate blocking, scheduling enrichment to fight decay, and monitoring quality scores. Encode your standards as automated rules that run continuously, so quality is maintained by the system rather than by periodic manual cleanup.`,
    intro: [`Data quality rules turn your standards into enforcement the system applies automatically, at entry and over time.`, `The goal is quality that holds by default, so the database stays clean without recurring cleanup projects.`],
    steps: [
      { h: `Define standards for key fields`, body: `Decide the completeness, format, and consistency standards for the fields that drive routing, scoring, and outreach.` },
      { h: `Enforce at entry`, body: `Apply validation, required fields, and picklists so records cannot be created violating the standards.` },
      { h: `Block duplicates and enrich`, body: `Turn on duplicate blocking and schedule enrichment, so uniqueness and accuracy are maintained automatically.` },
      { h: `Monitor quality scores`, body: `Track the quality metrics so you can see whether the rules are holding and catch regressions early.` },
    ],
    sections: [
      { h: `Encode standards as automated rules`, body: `Standards that live in a document and depend on people following them erode. Encoding them as automated rules - validation, required fields, dedupe, scheduled enrichment - makes quality hold by default. Automated rules maintain quality continuously; documented-only standards become guidelines nobody enforces under pressure.` },
      { h: `How Ardovo helps`, body: `Ardovo enforces data quality rules automatically - validation, required fields, dedupe, and scheduled enrichment - and measures quality live. Rook maintains the standards continuously and flags regressions, so quality is upheld by the system rather than depending on manual discipline that fades.` },
    ],
    faqs: [
      { q: `What are data quality rules?`, a: `Encoded standards the system enforces automatically: validation for formats, required fields for completeness, picklists for consistency, duplicate blocking for uniqueness, and scheduled enrichment for accuracy. They turn your data-quality standards into continuous automated enforcement rather than guidelines people are supposed to follow.` },
      { q: `Why automate data quality rules?`, a: `Because standards that depend on people following them erode under pressure and inconsistency. Encoding them as automated rules - enforced at entry and over time - makes quality hold by default. Automated rules maintain quality continuously, while documented-only standards become guidelines nobody enforces when busy.` },
      { q: `Where should data quality rules apply?`, a: `Primarily at the point of entry, where validation, required fields, and duplicate blocking prevent bad data from being created, plus continuously through scheduled enrichment that fights decay. Enforcing quality at entry is far cheaper than cleaning up afterward, so that is where the rules deliver the most value.` },
    ] },

  // ===================================================================
  // CLUSTER P2 - Integrations in practice
  // ===================================================================
  { slug: `what-is-a-crm-integration`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is a CRM integration?`,
    shortAnswer: `A CRM integration is a connection that lets the CRM exchange data with another system - email, calendar, marketing, support, billing - so information flows between them automatically instead of being re-entered. Integrations keep data consistent across tools and eliminate manual copying. Their value depends on clean mapping and sync, since a bad integration spreads dirty data faster.`,
    intro: [`A CRM integration wires the CRM to the other tools a business runs on, so data moves between them without manual re-entry.`, `Done well it keeps systems aligned; done poorly it propagates duplicates and inconsistencies across every connected tool.`],
    keyPoints: [`A connection for exchanging data between the CRM and another system.`, `Flows data automatically instead of manual re-entry.`, `Keeps information consistent across tools.`, `Value depends on clean field mapping and sync.`],
    sections: [
      { h: `Why it matters`, body: `Businesses run on many tools, and without integration the same data is re-entered in each and drifts out of sync. Integrations keep systems aligned and eliminate manual copying, but they must be built on clean mapping and dedupe, or they simply spread dirty data faster across everything connected.` },
      { h: `How Ardovo handles it`, body: `Ardovo integrates with the tools teams run on, with clean field mapping and sync that respects deduplication. Rook keeps data consistent across connections, so integrations propagate a single clean source of truth rather than multiplying inconsistencies across systems.` },
    ],
    faqs: [
      { q: `What can a CRM integrate with?`, a: `The tools a business runs on: email and calendar for activity capture, marketing platforms for lead flow, support systems for customer context, billing for revenue data, and many others. Integrations let data flow between the CRM and these systems automatically instead of being manually re-entered in each.` },
      { q: `Why do CRM integrations matter?`, a: `Because businesses run on many tools, and without integration the same data is re-entered everywhere and drifts out of sync. Integrations keep systems aligned and eliminate manual copying, which saves time and prevents the conflicting-copies problem that undermines a single source of truth.` },
      { q: `Can a bad integration hurt data quality?`, a: `Yes - a poorly-built integration propagates dirty data faster, spreading duplicates and inconsistencies across every connected system. Integrations must rest on clean field mapping and deduplication, or they multiply data problems. A good integration spreads a single clean source of truth; a bad one spreads the mess.` },
    ] },

  { slug: `what-is-a-data-silo`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is a data silo?`,
    shortAnswer: `A data silo is data trapped in one system or team, inaccessible to others who need it - sales data the support team cannot see, marketing data isolated from sales. Silos cause conflicting copies, blind spots, and duplicated effort. Integration and a shared source of truth break silos down, so everyone works from the same connected data instead of isolated fragments.`,
    intro: [`A data silo is what happens when data lives in a walled-off system, invisible to the rest of the business that needs it.`, `Silos are the enemy of a single source of truth: they fragment the customer picture across disconnected tools and teams.`],
    keyPoints: [`Data trapped in one system or team, inaccessible to others.`, `Causes conflicting copies, blind spots, and duplicated effort.`, `Fragments the customer picture across the business.`, `Broken down by integration and a shared source of truth.`],
    sections: [
      { h: `Why it matters`, body: `Silos mean no one sees the whole customer - sales cannot see support history, support cannot see the deal. Decisions get made on partial information, effort is duplicated, and copies conflict. Breaking silos through integration is what gives the business one connected view instead of fragments.` },
      { h: `How Ardovo handles it`, body: `Ardovo breaks down silos by integrating the tools around it and unifying customer data into one connected view. Rook keeps data flowing and consistent across systems, so sales, support, and marketing work from the same source of truth rather than isolated, conflicting fragments.` },
    ],
    faqs: [
      { q: `What causes data silos?`, a: `Systems and teams that hold data without connecting it - sales data in the CRM, support data in a separate tool, marketing data isolated - each walled off from the others. Silos form when tools are not integrated and no shared source of truth exists, so data stays trapped where it was created.` },
      { q: `Why are data silos a problem?`, a: `Because they fragment the customer picture: no one sees the whole relationship, decisions are made on partial information, effort is duplicated across teams, and copies of data conflict. Silos undermine the single source of truth, leaving the business with disconnected fragments instead of one connected view.` },
      { q: `How do you break down data silos?`, a: `Through integration that connects systems and a shared source of truth that unifies the data. When tools exchange data automatically and one authoritative version exists, silos dissolve - sales, support, and marketing all work from the same connected customer view rather than isolated, conflicting copies.` },
    ] },

  { slug: `how-to-keep-data-in-sync-across-tools`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to keep data in sync across tools`,
    shortAnswer: `Keep data in sync across tools by choosing a system of record for each data type, using two-way sync where both systems change data, mapping fields cleanly, resolving conflicts with clear rules, and monitoring for sync errors. Designate which system owns each fact, sync on clean mapping, and watch for failures, so connected tools stay aligned instead of drifting apart.`,
    intro: [`Keeping tools in sync is about preventing drift - the slow divergence where connected systems end up disagreeing about the same data.`, `The foundations are a clear system of record per data type and clean field mapping, with conflict rules and monitoring on top.`],
    steps: [
      { h: `Choose a system of record`, body: `Decide which system owns each data type, so there is a definitive source when values conflict rather than two competing versions.` },
      { h: `Use two-way sync where needed`, body: `Where both systems change data, sync both directions so a change in either appears in the other and neither drifts.` },
      { h: `Map fields cleanly`, body: `Map fields and translate values accurately between systems, since a bad mapping syncs data into the wrong place.` },
      { h: `Resolve conflicts and monitor`, body: `Set clear rules for which value wins in a conflict, and monitor for sync errors so failures surface and get fixed.` },
    ],
    sections: [
      { h: `Designate a system of record per data type`, body: `The root cause of sync chaos is two systems both claiming to own the same data with no tiebreaker. Designating a system of record for each data type - the definitive owner - resolves conflicts cleanly: when values disagree, the system of record wins. Without it, sync loops and overwrites good data.` },
      { h: `How Ardovo helps`, body: `Ardovo syncs with connected tools using clean mapping, two-way sync, and clear conflict rules, and Rook monitors for sync errors. With a designated system of record per data type, connected tools stay aligned as one consistent picture rather than drifting into conflicting versions.` },
    ],
    faqs: [
      { q: `How do you keep data in sync across systems?`, a: `Choose a system of record for each data type, use two-way sync where both systems change data, map fields cleanly, resolve conflicts with clear rules, and monitor for sync errors. Designating which system owns each fact and syncing on clean mapping keeps connected tools aligned rather than drifting apart.` },
      { q: `What is a system of record?`, a: `The designated authoritative source for a given type of data - the system that definitively owns it, so when values conflict across tools, its version wins. Designating a system of record per data type resolves sync conflicts cleanly, preventing the loops and overwrites that happen when two systems both claim ownership.` },
      { q: `What causes data to fall out of sync?`, a: `No clear system of record so conflicting changes overwrite each other, bad field mapping that syncs data wrong, sync errors that go unnoticed, and one-way sync where the source is unaware of downstream changes. Clear ownership, clean mapping, conflict rules, and monitoring prevent the drift.` },
    ] },

  { slug: `what-is-a-system-of-record`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is a system of record?`,
    shortAnswer: `A system of record is the designated authoritative source for a given type of data - the system that definitively owns it, so its version is the one everyone trusts when copies conflict. Designating a system of record per data type is what makes integration and sync reliable, because it resolves conflicts: when connected systems disagree, the system of record wins.`,
    intro: [`A system of record is the answer to "which system is right?" for a given data type - the designated owner and tiebreaker.`, `It is the concept that makes multi-system sync coherent, because it decides whose version wins when copies diverge.`],
    keyPoints: [`The authoritative source for a given data type.`, `Its version wins when copies conflict.`, `Designated per data type across integrated systems.`, `Makes integration and sync conflict resolution reliable.`],
    sections: [
      { h: `Why it matters`, body: `When multiple systems hold the same data, conflicts are inevitable, and without a designated owner they overwrite each other unpredictably. A system of record resolves this: the CRM might own customer data, billing might own invoices. Clear ownership per data type is what keeps sync from becoming chaos.` },
      { h: `How Ardovo handles it`, body: `Ardovo acts as the system of record for customer and revenue data and respects other systems' ownership of their domains, syncing with clear conflict rules. Rook enforces the ownership, so integrations resolve conflicts by the system of record rather than overwriting good data unpredictably.` },
    ],
    faqs: [
      { q: `What is a system of record used for?`, a: `Resolving conflicts when multiple systems hold the same data. The system of record is the designated authoritative source for a data type, so when copies disagree, its version wins. This makes integration and sync reliable by giving every conflict a clear tiebreaker instead of unpredictable overwrites.` },
      { q: `How do you decide the system of record?`, a: `By data type and where that data is authoritatively managed - the CRM for customer and deal data, billing for invoices, a marketing tool for campaign engagement. Each data type gets one designated owner, chosen as the system where that data genuinely originates and is managed.` },
      { q: `What happens without a system of record?`, a: `Sync becomes chaos - when connected systems hold conflicting values, there is no tiebreaker, so changes overwrite each other unpredictably and good data gets lost. Designating a system of record per data type is what makes multi-system integration coherent instead of a source of constant conflict.` },
    ] },

  { slug: `how-to-prevent-sync-conflicts`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to prevent sync conflicts`,
    shortAnswer: `Prevent sync conflicts by designating a system of record for each data type so there is always a tiebreaker, defining clear rules for which value wins, avoiding overlapping edits to the same field in multiple systems, using reliable two-way sync, and monitoring for errors. Clear ownership and conflict rules are what stop connected systems from overwriting each other's good data.`,
    intro: [`Sync conflicts happen when two systems change the same data and there is no agreed rule for whose change wins.`, `Preventing them is mostly about clear ownership - a system of record per data type - plus explicit conflict rules.`],
    steps: [
      { h: `Designate a system of record`, body: `Give each data type a definitive owner, so a conflict always has a clear tiebreaker rather than two competing versions.` },
      { h: `Define conflict-resolution rules`, body: `Specify which value wins when systems disagree - usually the system of record, or most recent - so resolution is consistent.` },
      { h: `Avoid overlapping edits`, body: `Where possible, let each field be edited in one system, so the same data is not changed in two places at once.` },
      { h: `Use reliable sync and monitor`, body: `Use dependable two-way sync and monitor for conflicts and errors, so problems surface and get resolved.` },
    ],
    sections: [
      { h: `Ownership is the root fix`, body: `Most sync conflicts trace to unclear ownership - two systems both editing the same data with no tiebreaker. Designating a system of record per data type, and ideally confining edits of each field to one system, removes the ambiguity at the root. Conflict rules handle the rest, but clear ownership prevents most conflicts from arising.` },
      { h: `How Ardovo helps`, body: `Ardovo prevents sync conflicts with a clear system-of-record model, defined conflict rules, and reliable two-way sync, and Rook monitors for conflicts and errors. Connected systems resolve disagreements by ownership rather than overwriting each other, so good data is not lost to sync chaos.` },
    ],
    faqs: [
      { q: `What causes sync conflicts?`, a: `Two systems changing the same data with no agreed rule for whose change wins. Without a designated owner, conflicting edits overwrite each other unpredictably. Sync conflicts are fundamentally an ownership problem - they arise when multiple systems both claim the same data with no tiebreaker.` },
      { q: `How do you resolve sync conflicts?`, a: `Designate a system of record for each data type so there is always a tiebreaker, define clear rules for which value wins (usually the system of record or the most recent change), and ideally confine edits of each field to one system. Clear ownership and rules resolve conflicts consistently.` },
      { q: `Can sync conflicts corrupt data?`, a: `Yes - without clear resolution rules, conflicting changes overwrite each other and good data gets lost, sometimes in loops where two systems keep overwriting one another. This is why a system of record and defined conflict rules matter: they ensure conflicts resolve predictably rather than destroying data.` },
    ] },

  { slug: `how-to-connect-your-crm-to-other-tools`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to connect your CRM to other tools`,
    shortAnswer: `Connect your CRM to other tools by identifying which integrations deliver real value (email, calendar, marketing, support), setting up each connection, mapping fields cleanly, designating a system of record per data type, and testing the sync before relying on it. Connect the tools that eliminate manual re-entry, and build each integration on clean mapping so it spreads good data, not mess.`,
    intro: [`Connecting your CRM to other tools is how you stop re-entering the same data everywhere and unify the customer picture.`, `The discipline is connecting the integrations that genuinely help, and building each on clean mapping and clear ownership.`],
    steps: [
      { h: `Identify valuable integrations`, body: `Prioritize the connections that eliminate real manual work or unify data - email, calendar, marketing, support - over connecting everything possible.` },
      { h: `Set up and map cleanly`, body: `Establish each connection and map fields and values accurately, since a bad mapping syncs data into the wrong place.` },
      { h: `Designate a system of record`, body: `Decide which system owns each data type, so sync conflicts have a clear tiebreaker.` },
      { h: `Test before relying on it`, body: `Verify the sync works correctly on sample data before depending on it, so problems surface before they spread.` },
    ],
    sections: [
      { h: `Connect what helps, on clean foundations`, body: `Not every possible integration is worth it - each adds complexity and a sync to maintain. Connect the ones that eliminate real manual work or unify data. And build each on clean field mapping and a clear system of record, so the integration spreads a single clean source of truth rather than propagating mess.` },
      { h: `How Ardovo helps`, body: `Ardovo connects to the tools teams run on with clean mapping and a clear system-of-record model, and Rook tests and monitors the sync. Integrations eliminate manual re-entry and unify data on clean foundations, so connecting tools strengthens the source of truth rather than fragmenting it.` },
    ],
    faqs: [
      { q: `Which tools should you integrate with your CRM?`, a: `The ones that eliminate real manual work or unify data: email and calendar for activity capture, marketing platforms for lead flow, support for customer context, and billing for revenue data. Prioritize integrations that deliver genuine value over connecting everything possible, since each adds complexity to maintain.` },
      { q: `What makes a CRM integration reliable?`, a: `Clean field mapping so data lands in the right place, a clear system of record per data type so conflicts resolve, reliable two-way sync where needed, and monitoring for errors. Built on these foundations, an integration spreads a single clean source of truth rather than propagating duplicates and inconsistencies.` },
      { q: `Should you connect every possible integration?`, a: `No - each integration adds complexity and a sync to maintain, so connect only the ones that eliminate real manual work or unify data meaningfully. Connecting everything possible creates maintenance burden and more places for sync problems, without proportional value. Prioritize the integrations that genuinely help.` },
    ] },

  { slug: `how-to-clean-data-before-syncing`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to clean data before syncing systems`,
    shortAnswer: `Clean data before syncing by deduplicating and standardizing both systems first, aligning field formats and picklist values so they map cleanly, and resolving obvious errors, so the integration spreads clean data rather than propagating mess across tools. A sync built on dirty data multiplies the problems into every connected system, so cleaning before connecting is far easier than cleaning after.`,
    intro: [`Syncing dirty data does not fix it - it spreads it, duplicating the mess across every connected system at machine speed.`, `Cleaning before you connect means the integration propagates a clean source of truth, not the problems.`],
    steps: [
      { h: `Dedupe both systems first`, body: `Remove duplicates in each system before connecting, so the sync does not multiply or entangle duplicate records across both.` },
      { h: `Standardize and align formats`, body: `Standardize values and align field formats and picklists between the systems, so data maps cleanly rather than scattering.` },
      { h: `Resolve obvious errors`, body: `Fix clear inaccuracies and invalid values before syncing, so the integration does not spread known-bad data everywhere.` },
      { h: `Then connect and monitor`, body: `Sync the cleaned systems, and monitor to confirm the integration keeps them aligned rather than reintroducing mess.` },
    ],
    sections: [
      { h: `Clean before you connect`, body: `An integration built on dirty data spreads the mess into every connected system, at scale and speed. Duplicates entangle, inconsistent values fail to map, and errors propagate. Cleaning both systems before syncing means the integration multiplies a clean source of truth instead - and cleaning first is far easier than untangling a synced mess after.` },
      { h: `How Ardovo helps`, body: `Ardovo dedupes and standardizes data and Rook cleans it continuously, so what syncs to connected tools is already clean. Integrations built on Ardovo's clean source of truth spread good data, and Rook monitors the sync so mess is not reintroduced from the other side.` },
    ],
    faqs: [
      { q: `Why clean data before syncing systems?`, a: `Because syncing dirty data spreads it - duplicates entangle across both systems, inconsistent values fail to map, and errors propagate everywhere at machine speed. Cleaning both systems before connecting means the integration multiplies a clean source of truth. Cleaning first is far easier than untangling a synced mess.` },
      { q: `What should you clean before an integration?`, a: `Deduplicate both systems so the sync does not multiply duplicates, standardize values and align field formats and picklists so data maps cleanly, and resolve obvious errors so known-bad data is not spread. Getting both systems clean and aligned first is what makes the integration propagate good data.` },
      { q: `Can an integration fix dirty data?`, a: `No - it spreads dirty data rather than fixing it, duplicating problems across connected systems. Integrations move and align data; they do not clean it. Cleaning must happen first, in both systems, so the sync propagates a clean source of truth instead of multiplying the existing mess.` },
    ] },

  { slug: `what-is-data-syncing`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is data syncing?`,
    shortAnswer: `Data syncing is automatically keeping data consistent between two or more systems, so a change in one is reflected in the others. It can be one-way or two-way, and it relies on field mapping and conflict resolution. Syncing eliminates manual re-entry and keeps connected tools aligned, but it must be built on clean data and clear ownership to avoid spreading conflicts.`,
    intro: [`Data syncing is the ongoing exchange that keeps connected systems holding the same, current data.`, `It is the mechanism behind integration, and its reliability depends on mapping, a system of record, and clean data underneath.`],
    keyPoints: [`Automatically keeps data consistent across systems.`, `Can be one-way or two-way.`, `Relies on field mapping and conflict resolution.`, `Needs clean data and clear ownership to be reliable.`],
    sections: [
      { h: `Why it matters`, body: `Syncing is what keeps integrated tools from drifting apart - a change in one system flows to the others, so everyone works from current data. But sync built on dirty data or unclear ownership spreads conflicts and duplicates, so the foundations of mapping, a system of record, and clean data are what make it reliable.` },
      { h: `How Ardovo handles it`, body: `Ardovo syncs with connected tools using clean mapping, a clear system-of-record model, and conflict rules, and Rook monitors it. Connected systems stay consistently aligned on clean data, so syncing keeps everyone current rather than propagating conflicts across tools.` },
    ],
    faqs: [
      { q: `What is the difference between one-way and two-way syncing?`, a: `One-way syncing flows data in a single direction, from one system to another. Two-way syncing flows changes in both directions, so an update in either system appears in the other. Two-way keeps both fully aligned; one-way suits cases where only one system should update the other.` },
      { q: `What does data syncing rely on?`, a: `Field mapping so data lands in the right place, a system of record so conflicts have a tiebreaker, conflict-resolution rules, and clean underlying data. Without these, syncing spreads duplicates and conflicts across systems. Reliable syncing rests on clean data and clear ownership, not just the connection itself.` },
      { q: `Why does data syncing sometimes cause problems?`, a: `Because sync built on dirty data or unclear ownership propagates the problems - duplicates multiply, conflicting values overwrite each other, and errors spread across systems. Syncing is only as good as the mapping, system-of-record model, and data quality underneath it, so those foundations determine whether it helps or harms.` },
    ] },

  { slug: `how-to-troubleshoot-crm-sync-issues`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to troubleshoot CRM sync issues`,
    shortAnswer: `Troubleshoot CRM sync issues by checking sync error logs first, verifying field mappings are still correct, confirming the system of record and conflict rules, looking for data that fails validation on one side, and testing with a single record to isolate the problem. Most sync issues trace to mapping changes, conflicts, or data that one system rejects, so check those systematically.`,
    intro: [`Sync issues are frustrating because they are often silent - data quietly stops flowing or values disagree, with no obvious alarm.`, `Troubleshooting is systematic: check the logs, the mapping, the ownership rules, and isolate with a test record.`],
    steps: [
      { h: `Check the sync error logs`, body: `Start with the error logs, which usually reveal what is failing - a rejected value, a mapping error, an auth problem.` },
      { h: `Verify field mappings`, body: `Confirm the mappings are still correct, since a changed field on either side silently breaks the mapping.` },
      { h: `Check ownership and conflict rules`, body: `Verify the system of record and conflict rules, since a conflict with no clear winner can stall or loop the sync.` },
      { h: `Isolate with a test record`, body: `Sync a single record to reproduce and isolate the problem, so you can see exactly where and why it fails.` },
    ],
    sections: [
      { h: `Most issues are mapping, conflicts, or rejected data`, body: `Sync problems cluster into a few causes: a field mapping broke because a field changed, a conflict has no clear resolution, or data valid in one system fails the other's validation. Checking the logs, mappings, and conflict rules systematically finds most issues fast, and a test record isolates the stubborn ones.` },
      { h: `How Ardovo helps`, body: `Ardovo surfaces sync errors clearly, and Rook monitors sync health and flags mapping breaks, conflicts, and rejected data proactively. Many issues are caught before they cause drift, and when troubleshooting is needed, the logs and clear system-of-record model make the cause easy to isolate.` },
    ],
    faqs: [
      { q: `What causes CRM sync issues?`, a: `Most commonly a broken field mapping because a field changed on one side, a sync conflict with no clear resolution, or data that is valid in one system but fails the other's validation. Auth and connection problems also occur. These few causes account for the majority of sync issues.` },
      { q: `How do you troubleshoot a sync problem?`, a: `Check the sync error logs first, since they usually reveal what is failing; verify field mappings are still correct; confirm the system of record and conflict rules; look for data one side rejects; and isolate the problem by syncing a single test record. Work through these systematically to find the cause.` },
      { q: `Why do sync issues often go unnoticed?`, a: `Because they are frequently silent - data quietly stops flowing or values disagree without an obvious alarm. This is why monitoring sync health matters: proactive alerts on mapping breaks, conflicts, and rejected data catch issues before they cause drift, rather than discovering them when reports disagree.` },
    ] },

  { slug: `what-is-a-webhook`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is a webhook?`,
    shortAnswer: `A webhook is an automated message a system sends to another the instant an event happens - a real-time notification with data, delivered to a URL the receiving system listens on. Webhooks let systems react immediately to events like a new lead or a closed deal, powering real-time integrations without one system constantly polling the other for changes.`,
    intro: [`A webhook is event-driven integration: when something happens, the source system pushes a message rather than waiting to be asked.`, `It is what makes integrations react in real time, instead of on a delayed polling schedule.`],
    keyPoints: [`An automated message sent the instant an event happens.`, `Pushes data to a URL the receiving system listens on.`, `Enables real-time reactions across systems.`, `More immediate than polling for changes.`],
    sections: [
      { h: `Why it matters`, body: `Webhooks make integrations instant. Instead of one system repeatedly asking another "anything new?", the source pushes an event the moment it occurs, so a new lead or closed deal triggers action in another system immediately. This real-time responsiveness is what many modern integrations depend on.` },
      { h: `How Ardovo handles it`, body: `Ardovo supports webhooks so events like new leads and closed deals push to connected systems in real time, and Rook can trigger workflows on incoming webhook events. Integrations react instantly rather than on a delay, keeping connected tools responsive to what happens in the CRM.` },
    ],
    faqs: [
      { q: `How does a webhook work?`, a: `When a defined event happens in the source system - a new lead, a closed deal - it automatically sends a message containing the event data to a URL the receiving system listens on. The receiver acts on it immediately. It is a push model, so the source notifies rather than waiting to be asked.` },
      { q: `What is the difference between a webhook and polling?`, a: `Polling has one system repeatedly ask another for changes on a schedule, introducing delay and wasted requests. A webhook has the source push an event the instant it happens. Webhooks are real-time and efficient; polling is periodic and slower. Webhooks are preferred for immediate reactions across systems.` },
      { q: `What are webhooks used for?`, a: `Real-time integrations: triggering an action in one system the moment an event happens in another - notifying a tool when a lead is created, kicking off a workflow when a deal closes, updating an external system instantly on a change. Webhooks power any integration that needs to react immediately to events.` },
    ] },

  { slug: `how-to-avoid-data-duplication-across-systems`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to avoid data duplication across systems`,
    shortAnswer: `Avoid data duplication across systems by matching records on strong shared identifiers like email and domain during sync, designating a system of record so one system owns each entity, updating matched records instead of creating new ones, and deduping each system before connecting. Match on shared keys and update rather than insert, so an integration links entities instead of duplicating them everywhere.`,
    intro: [`Integrations can multiply duplicates fast: without matching, syncing creates a fresh record in each system for every entity, everywhere.`, `Avoiding it means matching on shared identifiers and updating existing records, so the same entity is linked across systems rather than copied.`],
    steps: [
      { h: `Match on shared identifiers`, body: `Match records across systems on strong shared keys - email for people, domain for companies - so the same entity is recognized in both.` },
      { h: `Designate a system of record`, body: `Give each entity type one owning system, so there is a definitive version rather than competing copies in every tool.` },
      { h: `Update instead of insert`, body: `Configure sync to update matched records rather than create new ones, so it links entities instead of duplicating them.` },
      { h: `Dedupe before connecting`, body: `Clean duplicates in each system first, so the sync does not entangle existing duplicates across both.` },
    ],
    sections: [
      { h: `Match and update, do not insert`, body: `The cause of cross-system duplication is sync that inserts a new record for every entity instead of matching to existing ones. Matching on shared identifiers and updating matched records means the integration links the same entity across systems rather than copying it. Match-and-update is the whole discipline.` },
      { h: `How Ardovo helps`, body: `Ardovo matches records across integrations on strong identifiers, designates systems of record, and updates rather than duplicates. Rook keeps entities linked across connected tools instead of copied, so an integration unifies each customer into one linked entity rather than scattering duplicates across every system.` },
    ],
    faqs: [
      { q: `How do integrations create duplicate data?`, a: `By syncing without matching - a naive integration inserts a new record in each system for every entity, so the same person or company ends up duplicated across all connected tools. Without matching on shared identifiers and updating existing records, sync multiplies duplicates rather than linking entities.` },
      { q: `How do you prevent cross-system duplication?`, a: `Match records on strong shared identifiers like email and domain during sync, designate a system of record so one system owns each entity, update matched records instead of inserting new ones, and dedupe each system before connecting. Match-and-update links entities across systems rather than copying them.` },
      { q: `Why designate a system of record to avoid duplication?`, a: `Because it establishes one owning system per entity type, so there is a definitive version rather than each tool creating and holding its own copy. With a system of record and matching, the same entity is linked across systems as one authoritative record, instead of duplicated separately in every connected tool.` },
    ] },

  { slug: `how-to-sync-crm-and-marketing-data`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to sync CRM and marketing data`,
    shortAnswer: `Sync CRM and marketing data by matching leads and contacts on email so records link instead of duplicate, agreeing which system owns which data (marketing owns engagement, CRM owns deals), flowing leads and engagement into the CRM and status back to marketing, and mapping fields and lifecycle stages cleanly. Align on ownership and match on email, so sales and marketing share one connected view.`,
    intro: [`Syncing CRM and marketing data is what aligns the two teams around one view of the funnel, from first touch to closed deal.`, `The essentials are matching on email so records link, and agreeing which system owns which data so the two do not fight over it.`],
    steps: [
      { h: `Match on email to link records`, body: `Match leads and contacts across the two systems on email, so the same person links rather than duplicating in each.` },
      { h: `Agree on data ownership`, body: `Decide which system owns which data - marketing owns engagement, the CRM owns deals and status - to avoid conflicts.` },
      { h: `Flow leads and engagement into the CRM`, body: `Sync leads and their marketing engagement into the CRM, so sales sees the full context and can act on intent.` },
      { h: `Sync status back and map stages`, body: `Flow deal and lifecycle status back to marketing, and map lifecycle stages cleanly, so both systems agree on where each person is.` },
    ],
    sections: [
      { h: `Match on email, agree on ownership`, body: `The two failure modes of CRM-marketing sync are duplicate records (fixed by matching on email) and turf conflicts over data (fixed by agreeing ownership - marketing owns engagement, the CRM owns deals). Get those two right and the sync unifies the funnel; get them wrong and it duplicates records and picks fights.` },
      { h: `How Ardovo helps`, body: `Ardovo syncs with marketing tools by matching on email and a clear ownership split, flowing leads and engagement in and status back. Rook keeps the data linked and consistent, so sales and marketing share one connected view of the funnel rather than duplicated, conflicting records.` },
    ],
    faqs: [
      { q: `How do you sync CRM and marketing data?`, a: `Match leads and contacts on email so records link instead of duplicate, agree which system owns which data (marketing owns engagement, the CRM owns deals and status), flow leads and engagement into the CRM and status back to marketing, and map fields and lifecycle stages cleanly.` },
      { q: `Who owns which data between CRM and marketing?`, a: `Typically marketing owns engagement and campaign data, while the CRM owns deals, opportunities, and sales status. Agreeing this ownership split prevents the two systems from fighting over the same data. Clear ownership per data type is what makes the sync align the teams rather than causing conflicts.` },
      { q: `How do you avoid duplicates between CRM and marketing?`, a: `Match leads and contacts on email during sync, so the same person links across both systems rather than creating a duplicate in each. Without email matching, syncing marketing and CRM data multiplies records. Matching on the shared email identifier is what keeps the person as one linked record across both.` },
    ] },

  { slug: `what-is-api-integration`, type: `glossary`, eyebrow: `Integrations in practice`,
    title: `What is API integration?`,
    shortAnswer: `API integration is connecting systems through their application programming interfaces, so they can exchange data and trigger actions programmatically. APIs are the standard, flexible way modern tools integrate, allowing custom, real-time connections beyond prebuilt integrations. API integration powers the data flows that keep a CRM synced with the other systems a business runs on.`,
    intro: [`An API integration connects systems through the programmatic interfaces they expose, rather than manual export and import.`, `APIs are the backbone of modern integration - flexible, real-time, and capable of custom connections that prebuilt integrations do not cover.`],
    keyPoints: [`Connects systems through their APIs.`, `Exchanges data and triggers actions programmatically.`, `The standard, flexible way modern tools integrate.`, `Enables custom, real-time connections.`],
    sections: [
      { h: `Why it matters`, body: `APIs make integration flexible and powerful. Prebuilt integrations cover common cases, but APIs allow custom, real-time connections tailored to a business's specific needs. They are how systems exchange data and trigger actions programmatically, powering the data flows that keep a CRM synced with everything around it.` },
      { h: `How Ardovo handles it`, body: `Ardovo exposes an API for custom integrations and connects to common tools out of the box, so both prebuilt and custom data flows are supported. Rook works with the data these integrations move, keeping it clean and consistent across programmatic connections.` },
    ],
    faqs: [
      { q: `What is an API in the context of integration?`, a: `An application programming interface - a defined way for one system to exchange data and trigger actions in another programmatically. API integration connects systems through these interfaces, so data flows and actions happen automatically between them, rather than through manual export and import.` },
      { q: `Why use API integration instead of prebuilt connectors?`, a: `Prebuilt connectors cover common integrations quickly, but APIs allow custom, real-time connections tailored to specific needs that no prebuilt connector covers. API integration is more flexible and powerful, making it the standard for custom data flows, while prebuilt connectors handle the common cases with less setup.` },
      { q: `What can API integration do?`, a: `Exchange data between systems and trigger actions programmatically in real time - creating records, updating fields, kicking off workflows, and pushing events. APIs power the flexible, custom data flows that keep a CRM synced with the specific systems a business runs on, beyond what prebuilt integrations provide.` },
    ] },

  { slug: `how-to-choose-crm-integrations`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to choose CRM integrations`,
    shortAnswer: `Choose CRM integrations by prioritizing the ones that eliminate real manual work or unify important data - email, calendar, marketing, support - over connecting everything possible, checking each has clean field mapping and reliable sync, and confirming a clear system of record. Connect integrations that deliver genuine value on clean foundations, since each one adds complexity and a sync to maintain.`,
    intro: [`Choosing integrations is about value and restraint: connect the ones that genuinely help, not every one available.`, `Each integration is a commitment - complexity, a sync to maintain, a place data can go wrong - so it should earn its place.`],
    steps: [
      { h: `Prioritize by real value`, body: `Rank integrations by how much manual work they eliminate or how much they unify important data, and connect the highest-value ones first.` },
      { h: `Check mapping and sync quality`, body: `Confirm each integration maps fields cleanly and syncs reliably, since a poor one spreads dirty data across systems.` },
      { h: `Confirm a clear system of record`, body: `Ensure each integration has clear ownership per data type, so sync conflicts resolve rather than corrupting data.` },
      { h: `Avoid unnecessary connections`, body: `Skip integrations that do not deliver clear value, since each one adds complexity and a sync to maintain.` },
    ],
    sections: [
      { h: `Each integration must earn its place`, body: `An integration is not free - it adds complexity, a sync to monitor, and a place data can go wrong. So each should earn its place by eliminating real manual work or unifying important data. Connecting every possible integration creates maintenance burden and risk without proportional value. Choose deliberately.` },
      { h: `How Ardovo helps`, body: `Ardovo connects to the tools teams genuinely run on, with clean mapping, reliable sync, and a clear system-of-record model, and Rook monitors sync health. You get the high-value integrations on solid foundations, without the burden of maintaining connections that do not earn their place.` },
    ],
    faqs: [
      { q: `Which CRM integrations are worth setting up?`, a: `The ones that eliminate real manual work or unify important data: email and calendar for activity capture, marketing for lead flow, support for customer context, and billing for revenue. Prioritize integrations that deliver genuine value, since each one you connect adds complexity and a sync to maintain.` },
      { q: `Should you connect every available integration?`, a: `No - each integration adds complexity, a sync to monitor, and a place data can go wrong, so each should earn its place by delivering clear value. Connecting everything possible creates maintenance burden and risk without proportional benefit. Choose deliberately based on real manual work eliminated or data unified.` },
      { q: `What makes an integration worth keeping?`, a: `That it genuinely eliminates manual work or unifies important data, on clean foundations - reliable field mapping, dependable sync, and a clear system of record. An integration that delivers real value and stays reliable earns its place; one that adds complexity without clear benefit, or spreads dirty data, does not.` },
    ] },

  { slug: `how-to-map-fields-between-systems`, type: `guide`, eyebrow: `Integrations in practice`,
    title: `How to map fields between systems`,
    shortAnswer: `Map fields between systems by matching each field to its counterpart, translating value formats and picklist options, handling fields that must split or combine, deciding where fields with no counterpart go, and testing the mapping on sample records. Watch for near-match fields that map by name but mean different things, and test, since mapping errors sync data silently into the wrong place.`,
    intro: [`Mapping fields between integrated systems is the translation layer that decides whether synced data lands correctly.`, `It is the same discipline as import mapping, with the added stakes that a bad mapping keeps syncing wrong data continuously.`],
    steps: [
      { h: `Match fields to counterparts`, body: `Pair each field with its counterpart in the other system, watching for near-matches that look similar but mean different things.` },
      { h: `Translate values and picklists`, body: `Convert value formats and picklist options between systems, since a value valid in one may not exist in the other.` },
      { h: `Handle splits, combines, and orphans`, body: `Split or combine fields as the systems require, and decide where fields with no counterpart go rather than dropping them.` },
      { h: `Test on sample records`, body: `Verify the mapping on samples before relying on it, since mapping errors sync data silently into the wrong place.` },
    ],
    sections: [
      { h: `Near-match fields are the trap, and errors are silent`, body: `Two things make cross-system mapping risky: near-match fields that map cleanly by name but mean different things (billing versus shipping address), and the fact that mapping errors are silent - no alarm, just data continuously syncing into the wrong place. Read field meanings, not labels, and test before relying on the sync.` },
      { h: `How Ardovo helps`, body: `Ardovo auto-maps common fields, translates values between systems, and previews the mapping, and Rook flags likely near-match mistakes. Because the mapping is tested before it runs, synced data lands in the field you meant rather than silently accumulating in the wrong place.` },
    ],
    faqs: [
      { q: `What is the hardest part of mapping fields between systems?`, a: `Near-match fields that map cleanly by name but mean different things - billing versus shipping address, company versus account name, created versus close date. They pair by label but sync wrong data. Reading what each field actually means, not just its name, is what avoids these silent mismaps.` },
      { q: `Why test field mapping before syncing?`, a: `Because mapping errors are silent - no alarm, just data continuously syncing into the wrong field. Unlike a one-time import, a bad sync mapping keeps propagating wrong data until caught. Testing on sample records verifies the mapping is correct before the integration relies on it, catching errors cheaply.` },
      { q: `What do you do with fields that have no counterpart?`, a: `Decide deliberately: map them to a notes or custom field, create a matching field in the other system, or intentionally leave them out - but do not let them silently drop if the data matters. Fields with no obvious counterpart need a conscious decision, not accidental data loss during the sync.` },
    ] },

];

export default ROWS.map((r) => {
  const isGuide = r.type === 'guide';
  const out = {
    slug: r.slug,
    type: r.type,
    title: r.title,
    metaTitle: r.metaTitle || `${r.title.replace(/\?$/, '')} (2026) | Ardovo`,
    metaDescription: r.metaDescription || clip(r.shortAnswer),
    eyebrow: r.eyebrow || (isGuide ? 'CRM playbook' : 'CRM glossary'),
    h1: r.h1 || r.title,
    shortAnswer: r.shortAnswer,
    intro: r.intro,
    sections: r.sections,
    faqs: r.faqs,
    published: PUB,
    updated: PUB,
  };
  if (r.keyPoints) out.keyPoints = r.keyPoints;
  if (r.steps) out.steps = r.steps;
  if (r.stats) out.stats = r.stats;
  return out;
});
