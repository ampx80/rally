# Rally programmatic-SEO entry schema

Every dataset file under `src/marketing/seo/data/*.js` default-exports an ARRAY of
page entries. Each entry becomes a live page at `/pages/<slug>` rendered by the
single flexible template in `src/marketing/SeoPage.jsx`. Follow this shape exactly.

## Hard rules
- NO em-dash (U+2014) or en-dash (U+2013) ANYWHERE. ASCII hyphen `-` only.
- `slug` is unique across the WHOLE site (kebab-case, no leading slash). Duplicates are dropped.
- Real, specific, useful content. No filler, no "lorem". Numbers where possible.
- Product context: Rally = AI-native CRM / revenue platform. Operator = "Rook" (executes work, not a chatbot). Alive with data on first load. One clean price. Modules: leads, deals, contacts, companies, forecasting, campaigns, sequences, projects, quotes/CPQ, billing, dashboards, reports, workflows/automation, Studio (proposal builder), audit log, RBAC.
- Every entry MUST have: `slug`, `type`, `title`, `shortAnswer` (40-60 word direct answer for AI overviews), `intro`, and `faqs` (3-5 real Q&A).
- Aim for depth: most entries also carry 2-4 `sections`, plus one of {`table`, `items`, `steps`, `valueProps`, `keyPoints`} appropriate to the type.

## Fields (all optional except slug/type/title)
```
{
  slug, type, title,
  metaTitle,          // <title>. Formula: "{Entity}: {2-3 intent keywords} (2026) | Rally"
  metaDescription,    // answer-first + a number, under 155 chars
  eyebrow,            // small label above H1 (defaults to category)
  h1,                 // page H1 (defaults to title)
  shortAnswer,        // REQUIRED. 40-60 word TL;DR, answer in the first sentence
  intro,              // string OR array of paragraph strings (lead)
  stats: [{ value, label }],        // 2-3 hero stat chips (value can be text like "Minutes")
  keyPoints: ["..."],               // glossary: 3-6 takeaways
  steps: [{ h, body, bullets? }],   // howto: numbered steps
  sections: [{ h, body, bullets?, table? }],  // free prose sections (body = string|string[])
  table: { columns: ["...","Rally","..."], rows: [["Feature", true|false|"text", ...]] },
  highlightCol,       // index of the column to accent (default 1 for comparison)
  tableHeading,       // heading above the table
  items: [{ name, blurb, score?(1-10), pros?:[..], cons?:[..], best?, featured? }], // rankings/alternatives
  itemsHeading,
  valueProps: [{ icon?, h, body }], // solution pages (3-6). icon names: sparkles rocket zap target shield users building plug workflow chart
  valuePropsHeading,
  pros: ["..."], cons: ["..."],     // honesty section (comparison)
  proLabel, conLabel,
  verdict,            // bottom-line paragraph (comparison/ranking)
  faqs: [{ q, a }],   // REQUIRED, 3-5
  related: ["other-slug", ...],     // optional; auto-filled from category if omitted
  featured: true,     // surfaces on the /pages hub (use for best backlink pages)
  published: "2026-07-10", updated: "2026-07-10",
}
```

## Types and which fields they lean on
- `glossary`  -> shortAnswer + keyPoints + sections + faqs. title like "What is a sales pipeline?"
- `howto`     -> shortAnswer + steps + sections + faqs. title like "How to build a sales pipeline"
- `template`  -> shortAnswer + sections (the template blocks) + faqs. title like "Cold email templates for sales"
- `usecase`   -> shortAnswer + valueProps + sections + faqs. title like "CRM for managing a sales pipeline"
- `industry`  -> shortAnswer + valueProps + sections + table? + faqs. title like "Best CRM for real estate"
- `role`      -> shortAnswer + valueProps + sections + faqs. title like "CRM for sales managers"
- `feature`   -> shortAnswer + valueProps + sections + faqs. title like "Sales forecasting software"
- `integration` -> shortAnswer + sections + steps? + faqs. title like "Rally + Slack integration"
- `comparison`  -> table(Rally vs X) + valueProps + pros/cons + verdict + faqs. slug "rally-vs-x"
- `versus`      -> table(A vs B) + sections + verdict + faqs. slug "x-vs-y". NEUTRAL third-party tone; include a "where Rally fits" section.
- `alternative` -> items (ranked alternatives incl Rally at #1) + sections + faqs. slug "x-alternatives"
- `ranking`     -> items (ranked, scored) + sections(methodology) + verdict + faqs. slug "best-...". featured: true
- `migration`   -> steps + sections + faqs. slug "migrate-from-x-to-rally"

`category`/`group`/`icon` are auto-assigned by type in registry.js. Do not set them.
```
