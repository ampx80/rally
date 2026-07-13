# Rally SEO Domination Playbook

For: Nate (founder). Rally is live at https://rally-psi-five.vercel.app on a
custom-domain-ready Vite SPA with a static prerender step
(`scripts/prerender-seo.mjs`). Current state: ~1977 legacy static pages under
`/pages/*` plus a new juggernaut track under `/guides/<slug>`. Sitemap, robots,
and llms.txt are auto-generated at build.

This is an execution manual, not theory. Every section tells you exactly what to
click, what file to touch, and what to skip because it is already wired.

ASCII only. No em-dashes anywhere in Rally output (build rule already enforces
this in prerender; keep it that way in every page you add).

---

## 0. The 60-second orientation (what is already true)

Already wired (do NOT redo):
- `dist/sitemap.xml` is generated every build, 1978 URLs, with `<lastmod>` on
  the content pages. Juggernaut `/guides/*` pages get priority 0.9 spliced in.
- `dist/robots.txt` allows all and points at the sitemap.
- `dist/llms.txt` is generated with a full page index plus a Guides section.
- Every generated page ships real HTML in the initial response (prerender emits
  a static file per page, then the SPA boots). Crawlers and LLMs see full
  content, meta, and JSON-LD without running JS. This is the single biggest
  thing most SPAs get wrong, and Rally already does it right.
- JSON-LD helpers exist: `orgLd`, `breadcrumbLd`, `articleLd`, `faqLd`,
  `definedTermLd`, `itemListLd` in `src/marketing/seo/head.js`.

What is NOT wired yet (this playbook fixes):
1. Google Search Console + Bing Webmaster verification (needs a file or tag +
   Nate's DNS access).
2. IndexNow key file (instant Bing/Yandex ping on publish).
3. A custom domain (recommended before you pour link equity into the vercel.app
   subdomain, see Section 1.5).
4. The 50-150 triage on the 1971 thin pages.
5. A weekly publish cadence and internal-linking hub discipline.

---

## 1. Google Search Console + Bing Webmaster setup

### 1.1 Which verification method to use

You have three options. Use the one that matches how much domain control you have.

| Method | When to use | Who does it |
|---|---|---|
| DNS TXT record | Verifies the WHOLE domain (all subdomains, http+https). Best if Rally will get a custom domain. Survives redeploys. | Nate (needs registrar/DNS login) |
| HTML file in `public/` | Fast, no DNS needed, works on the vercel.app URL today. Verifies that one URL prefix only. | Claude can drop the file, Nate pastes the token |
| HTML meta tag | Same scope as the file, but injected in `index.html` head. | Claude can add it, Nate pastes the token |

Recommendation: do BOTH the DNS method (domain property, once you have a custom
domain) AND the HTML-file method now so you can start today on the vercel.app
URL. GSC lets you hold multiple properties.

### 1.2 The exact HTML-file approach (do this today, no DNS needed)

Rally serves `public/` at the site root. Google gives you a file named like
`google1a2b3c4d5e6f7g8h.html` containing a single line of text.

Steps:
1. Nate: go to https://search.google.com/search-console, click "Add property",
   choose the "URL prefix" box, enter `https://rally-psi-five.vercel.app`.
2. Google offers verification methods. Pick "HTML file". Download the file, or
   just copy the exact filename and the one-line content it shows you.
3. Claude/Nate: drop that file into `public/` in the rally repo. Example:
   `public/google1a2b3c4d5e6f7g8h.html` with Google's exact contents. Vercel
   serves `public/*` at the root, so it lands at
   `https://rally-psi-five.vercel.app/google1a2b3c4d5e6f7g8h.html`.
4. Commit, push, wait for Vercel to deploy (about 60-120s), confirm the URL
   loads in a browser and shows the token text.
5. Back in GSC, click "Verify".

IMPORTANT: verify the file is NOT caught by the SPA fallback. Rally's
`vercel.json` should serve real files before the catch-all rewrite. Test by
loading the file URL directly; if you get the app shell instead of the token
text, the rewrite is too greedy. Fix by adding an explicit route/exclusion for
the verification file (or just confirm static assets in `public/` win, which is
Vercel's default). This is the same class of bug noted in
`deploy-vercel-static-seo-plus-spa.md` (do not let cleanUrls or a broad rewrite
swallow static files).

### 1.3 The meta-tag alternative (if you prefer not to add a file)

In GSC pick "HTML tag". It gives you:
`<meta name="google-site-verification" content="TOKEN" />`

Add that line inside the `<head>` of `index.html` (the SPA shell) AND make sure
the prerender-emitted pages also carry it, or just rely on the homepage since
GSC verifies against the property root. The file method is cleaner because it
does not depend on head injection surviving the prerender pass. Prefer the file.

### 1.4 Bing Webmaster Tools (do this same day)

Bing feeds Bing, DuckDuckGo, and (indirectly) some LLM answer engines. Two ways:
1. Easiest: in Bing Webmaster Tools (https://www.bing.com/webmasters) choose
   "Import from Google Search Console". Once GSC is verified, Bing imports the
   verification and your sitemaps in one click. Do this.
2. Manual fallback: Bing offers the same three methods (XML file
   `BingSiteAuth.xml` in `public/`, meta tag, or DNS CNAME/TXT). The XML-file
   approach mirrors 1.2 exactly.

### 1.5 Custom domain first (strong recommendation)

Do not build years of backlinks and brand equity on `rally-psi-five.vercel.app`.
A random Vercel preview-style subdomain is harder to rank, looks untrustworthy in
LLM citations, and you cannot move the link equity cleanly later. Before heavy
link building:
1. Nate: buy `rally.com`-style domain (or the best available brandable), add it
   in Vercel Project Settings > Domains.
2. Set it as the PRIMARY domain and 308-redirect the vercel.app URL to it.
3. Update `SITE` in `src/marketing/seo/head.js` so every canonical, sitemap loc,
   llms.txt link, and JSON-LD `url` points at the real domain. Rebuild. This is a
   one-line change that fixes canonicals everywhere because everything derives
   from `SITE`.
4. Re-add the domain as a new GSC/Bing property (DNS method now) and submit the
   sitemap there too. Use GSC's Change of Address tool if migrating from the
   vercel.app property.

### 1.6 Submit the sitemap

Already generated at `/sitemap.xml`. In GSC: Sitemaps > enter `sitemap.xml` >
Submit. In Bing: Sitemaps > Submit > full URL. That is it. Do not manually list
individual URLs.

Because the sitemap is ~1978 URLs today and will grow past the 50,000-URL /
50MB single-file limit as you scale the juggernaut track, plan a sitemap INDEX
now (see Section 3.5).

### 1.7 Request indexing (use sparingly, correctly)

- In GSC, the "URL Inspection" tool has a "Request Indexing" button. Use it for
  your 10-20 MOST important pages (homepage, pricing, top juggernaut guides, top
  comparison pages). It is rate-limited to roughly a dozen a day and is NOT how
  you index 2000 pages.
- Do NOT try to manually request-index the whole fleet. That is what the sitemap
  plus the Indexing/IndexNow APIs are for (Section 3).

Division of labor:
- Nate (owns the domain and the Google/Bing accounts): create the properties,
  paste the tokens, click Verify, click Submit sitemap, buy the custom domain,
  set DNS.
- Already wired / Claude can do: generate the verification file into `public/`,
  update `SITE`, keep the sitemap and llms.txt generating, ship the IndexNow key.

---

## 2. The 50-150 Strategy (why fewer huge pages win, and what to do with 1971 thin ones)

### 2.1 The thesis

In 2026, 50 to 150 genuinely excellent pages beat 1000 thin ones. Three reasons:

1. Crawl budget. Google allots a finite crawl to a site by its authority. 1971
   thin near-duplicate pages burn that budget on low-value URLs, so your best
   pages get crawled and refreshed less often. Fewer, richer pages concentrate
   crawl on what converts.
2. E-E-A-T and the Helpful Content system. Google's site-wide quality signals
   average across your pages. A large mass of thin, templated, low-engagement
   pages drags down the whole domain's perceived quality, including your good
   pages. This is a classifier that can suppress an entire site.
3. LLM citation. ChatGPT, Perplexity, and Gemini cite pages that are
   comprehensive, factual, well-structured, and quotable. A 300-word templated
   "best CRM for X" page rarely gets cited. A 3000-word definitive guide with
   original data, a comparison table, and clear entity statements gets cited
   repeatedly. LLM answer engines are now a top-of-funnel channel, and they
   reward depth, not volume.

A juggernaut page is: 2000-4000+ words, original angle or original data, a
comparison table, an FAQ block with FAQ schema, breadcrumb schema, internal
links to 5-10 related pages, updated `lastmod`, and a clear primary keyword it
actually deserves to rank for. Rally's `/guides/<slug>` track is exactly this.

### 2.2 Concrete triage rule for the 1971 existing pages

Do NOT delete them all, and do NOT keep them all. Triage into three buckets using
one deterministic rule set. If you have GSC data, use it; if not (brand new),
use the structural proxy.

Rule (once GSC has ~30 days of data):

- KEEP + UPGRADE (target: the strongest 50-150). A page qualifies if it meets
  ANY of: it gets >= 5 impressions/month in GSC, OR it ranks in the top 30 for
  any query, OR it targets a keyword with real search demand that Rally can
  plausibly win (the "best CRM for X", top comparison, and category pages). For
  these, rewrite them up to juggernaut depth over time (Section 3) or at minimum
  ensure 800+ words of genuinely useful, non-duplicative content.

- CONSOLIDATE (merge many-into-one). Where you have 10 near-identical thin pages
  that all serve one intent (for example a swarm of "X vs Y" pages that are 80%
  boilerplate), merge the weak ones into one strong hub or into the surviving
  KEEP page, and 301-redirect the merged URLs to it. One strong page with the
  combined content and links beats ten thin ones splitting the equity.

- NOINDEX or REDIRECT (the long tail that earns nothing). A page qualifies if
  ALL are true: 0 impressions after 60+ days indexed, no top-100 ranking, and
  it is a near-duplicate of a stronger page. Action: if a clearly better page
  exists, 301-redirect to it (passes equity). If not, add
  `<meta name="robots" content="noindex,follow">` so crawlers stop wasting budget
  but still follow internal links. Keep `follow` so any link equity flows onward.

Structural proxy rule (use NOW, before GSC data exists), so you are not stalled:
- KEEP the pages that map to real, high-demand queries: all "best CRM for X"
  rankings, all head-term comparisons (hubspot-vs-salesforce class), all category
  definition pages, and anything Rally has a genuine POV on.
- Mark for likely-noindex the deep long-tail combinatorial pages that exist only
  because the generator could make them (obscure vs-pages between two tools
  nobody compares, redundant metric-vs-metric definitions that duplicate a
  broader glossary page).
- Do not act destructively yet; tag them in the registry with a
  `tier: 'keep' | 'consolidate' | 'noindex'` field and let the prerender honor
  it. Then flip the low tier to noindex after 60 days of GSC confirms zero value.

### 2.3 How to implement the triage in Rally's engine

The registry (`src/marketing/seo/registry.js`) is the single source of truth. Add
a per-entry field, then teach the prerender to honor it:

1. Add `tier` to each `ENTRIES` item (default `'keep'`).
2. In `scripts/prerender-seo.mjs`, when `tier === 'noindex'`, emit
   `<meta name="robots" content="noindex,follow">` into that page's head AND drop
   it from the sitemap loop (do not list noindexed URLs in the sitemap).
3. When `tier === 'consolidate'`, either stop emitting the page and add a Vercel
   redirect in `vercel.json` to the survivor, OR keep it as a thin stub that
   canonicals to the survivor. Prefer the redirect for true duplicates.
4. Rebuild. The sitemap URL count drops to only the pages you want crawled, which
   immediately improves crawl efficiency.

Target end state: roughly 100-150 KEEP pages in the sitemap (the 30-ish head
ranking pages + top comparisons + the juggernaut guides), everything else
redirected or noindexed. That is the 50-150 strategy made real.

---

## 3. Weekly cadence (publish 50-100 juggernaut pages/week without tripping spam signals)

The risk when you add pages fast is looking like a content farm. The mitigation
is batching, staggering, real internal linking, honest lastmod, and using the
indexing APIs instead of blasting request-indexing. Here is the repeatable loop.

### 3.1 Batch size and rhythm

- Publish in batches of 10-20 pages per push, 3-5 pushes across the week, to hit
  50-100/week. Do not drop 100 URLs in one commit; a smooth publish curve looks
  organic and lets you catch quality problems early.
- Every page in a batch must clear the juggernaut bar (2000+ words, table, FAQ
  schema, 5-10 internal links, original angle). Volume without depth reactivates
  the exact thin-content problem Section 2 solves.

### 3.2 The weekly checklist (repeat every week)

1. Pick a cluster (one pillar topic, for example "sales forecasting" or "CRM
   migration"). Write 10-20 spoke guides that all serve that pillar.
2. Register each as a juggernaut entry so it renders under `/guides/<slug>` at
   priority 0.9.
3. Interlink: every new spoke links UP to the pillar hub and SIDEWAYS to 3-5
   sibling spokes. The pillar hub links DOWN to every spoke. (Section 5.)
4. Set `updated` (lastmod) to today's date for the new pages only. Do not touch
   the lastmod of unchanged pages (fake-freshness across the whole sitemap is a
   spam signal and trains Google to ignore your lastmod).
5. Build and deploy. The prerender regenerates the sitemap with the new URLs and
   correct lastmod, splices the guide URLs at priority 0.9, and appends them to
   llms.txt automatically.
6. Ping the sitemap + fire IndexNow (Section 3.4). Do NOT manually
   request-index each URL.
7. Request-index only the ONE pillar hub in GSC (the strongest URL of the batch)
   to seed discovery; Google crawls the spokes from the hub's links + sitemap.

### 3.3 Staggered submission

- Google discovers new URLs from the sitemap on its own crawl schedule; you do
  not need to poke it per URL. Submitting the sitemap once is enough; it re-reads
  it. GSC's "ping" via resubmission is optional.
- For Bing, use IndexNow (below), which is instant and built for exactly this.

### 3.4 IndexNow (instant Bing/Yandex indexing on publish) - SHIP THIS

IndexNow lets you notify Bing and Yandex the moment a URL changes. Set it up once:

1. Generate a key (a random 32+ char hex string). Create
   `public/<key>.txt` whose contents are exactly that key. It serves at
   `https://<domain>/<key>.txt` and proves ownership. (Same public/ mechanism as
   the GSC file.)
2. On each deploy, POST the new/changed URLs to the IndexNow endpoint:
   `https://api.indexnow.org/indexnow` with a JSON body listing `host`, `key`,
   `keyLocation`, and up to 10,000 `urlList` entries.
3. Wire it as a post-build step: after `prerender-seo.mjs` writes the sitemap,
   diff against the previous sitemap (or just submit the current batch's guide
   URLs) and fire one IndexNow POST. A small `scripts/indexnow-ping.mjs` that
   reads the freshly written guide URLs and POSTs them is ~30 lines. Run it in
   the Vercel build or a post-deploy hook.

This gets Bing indexing within minutes and costs nothing. Google does not use
IndexNow; for Google, rely on the sitemap + internal links + the optional
Indexing API (below).

### 3.5 Google Indexing API (optional, use correctly)

Google's official Indexing API is officially only for JobPosting and
BroadcastEvent page types. It often works for other pages in practice, but it is
not guaranteed and can be a support burden. Recommendation: do NOT build your
strategy on it. The reliable Google path is: excellent pages + clean sitemap +
strong internal linking from already-indexed pages + real backlinks. If you want
to experiment, gate it behind a flag and measure; do not depend on it.

### 3.6 Sitemap index (do this before you cross ~50k URLs)

A single sitemap caps at 50,000 URLs / 50MB. You are at ~1978 now but the
juggernaut cadence will grow. Convert to a sitemap index:
- `sitemap.xml` becomes a `<sitemapindex>` pointing at child sitemaps:
  `sitemap-pages.xml`, `sitemap-guides.xml`, `sitemap-core.xml`.
- Split by section so you can watch indexation per bucket in GSC (guides vs
  legacy pages) and diagnose which track Google favors.
- The prerender already writes the sitemap in one place; extend it to shard the
  URL list into the three child files plus the index. Submit only the index in
  GSC/Bing.

---

## 4. Backlink + authority strategy (ranked by ROI for a 2026 SaaS)

Ranked best-to-worst by realistic ROI (link quality x achievability x durability)
for Rally specifically. Rally already has calculator pages, data-study pages, and
comparison pages, which are the raw materials for the top plays.

### 4.1 Free tools and calculators as link magnets (HIGHEST ROI)

Rally already ships calculator/metric pages (ARR vs MRR, CAC vs CPA, ACV vs ARR,
etc). Turn the best of these into standalone interactive tools with an embeddable
widget:
- A "CAC Payback Calculator", "SaaS Sales Forecast Calculator", "Pipeline Coverage
  Calculator", "Commission Calculator". Interactive, instant answer, shareable
  result URL.
- Add an "Embed this calculator" snippet (an iframe with a backlink). Every site
  that embeds it links back. This is the single most durable, scalable,
  white-hat link source for a SaaS because people link to tools without you
  asking.
- Promote each tool once to relevant communities and newsletters; embeds compound
  on their own after that.

### 4.2 Original data studies / research reports (HIGH ROI, high authority)

Rally sits on CRM/revenue data patterns and can generate defensible studies:
- "State of AI in CRM 2026", "SaaS Sales Benchmark Report", "How long does a B2B
  deal really take (analysis of N pipelines)". Publish the methodology and a
  downloadable chart pack.
- Journalists and bloggers cite statistics. A single quotable stat ("teams using
  an AI operator close X% faster") gets picked up and linked across dozens of
  articles. This also directly feeds LLM citation (Section 6): quotable factual
  claims are exactly what models surface.
- Pitch the study to newsletters and reporters (ties into digital PR below).

### 4.3 Digital PR (HIGH ROI, needs effort)

- Package the data study or a strong opinion ("Why the CRM is dead and the
  operator won") as a press angle and pitch tech/SaaS/sales-media outlets.
- Founder POV pieces: Nate has a genuine, contrarian, AI-native story. Op-eds and
  podcast appearances earn high-authority editorial links that move the whole
  domain.
- Newsjacking: when a big CRM raises prices or ships an AI feature, publish a fast
  reaction piece and pitch it same-day.

### 4.4 Expert quotes / HARO-style sourcing (MEDIUM-HIGH ROI)

- Use Connectively (formerly HARO), Featured, Qwoted, and Help a B2B Writer.
  Reporters request expert quotes daily on CRM, sales, AI, SaaS. Nate answers as
  a founder-expert; a published quote is an editorial link from a real outlet.
- Cheap in dollars, steady in output. Budget 2-3 quality responses/week.

### 4.5 Comparison and alternatives pages (MEDIUM ROI, mostly rankings + some links)

- Rally already has these ("best HubSpot alternatives", "X vs Y"). They earn
  fewer raw backlinks but they rank for high-intent bottom-funnel queries and get
  cited by LLMs answering "what is the best X". Keep them as juggernaut-grade
  (Section 2 KEEP bucket) and make them the honest, best comparison on the web
  (include competitors' real strengths; honesty gets you cited and linked).

### 4.6 Integration and partner links (MEDIUM ROI, durable)

- Every integration Rally ships (Slack, Gmail, calendar, Zapier-style) usually
  earns a listing on the partner's marketplace/directory with a backlink from a
  high-authority domain. Get listed in every relevant marketplace and app
  directory. These are permanent, high-trust links.
- SaaS review directories (G2, Capterra, GetApp, Product Hunt launch). Real
  profiles, real links, real referral traffic.

### 4.7 Guest content and podcasts (MEDIUM ROI)

- Guest posts on reputable sales/RevOps/SaaS blogs, podcast guesting (founder
  story converts to a link in show notes plus audience). Prioritize relevance and
  domain authority over volume.

### 4.8 Community and unlinked-mention reclamation (LOW-MEDIUM ROI, cheap)

- Be genuinely useful in RevOps/sales/founder communities (relevant subreddits,
  Slack groups, LinkedIn). Do not spam links; earn brand mentions.
- Reclamation: find sites that mention Rally without linking (Google:
  `"Rally" -site:yourdomain`) and ask for a link. Easy wins once you have brand
  presence.

### 4.9 What to AVOID (negative ROI, can get you penalized)

Paid link networks, PBNs, mass directory-submission services, comment/forum spam,
excessive exact-match anchor text, and reciprocal-link schemes. In 2026 these are
detected and discounted at best, penalized at worst. Do not do them.

Priority order to execute: (1) calculators/tools, (2) data study, (3) get listed
in every marketplace + review directory, (4) HARO/expert quotes weekly, (5)
digital PR of the study, (6) podcasts + guest posts. That sequence front-loads
the durable, compounding sources.

---

## 5. Internal linking + site architecture

Internal links are the highest-leverage, fully-in-your-control ranking lever. They
distribute PageRank, define topical clusters, and help crawlers and LLMs
understand entity relationships. Rally's prerender makes this easy because links
are emitted in real HTML.

### 5.1 Hub-and-spoke / pillar-cluster (the core model)

- One PILLAR page per major topic (broad, authoritative, for example
  `/guides/crm-guide` or `/guides/sales-forecasting`). It targets the head term.
- Many SPOKE pages, each a juggernaut on a sub-topic, all linking UP to the
  pillar and the pillar linking DOWN to all of them.
- Spokes link SIDEWAYS to 3-5 sibling spokes in the same cluster (contextual,
  in-body links with descriptive anchor text, not a generic footer dump).
- This tells Google "this site is the authority on topic X" and concentrates
  ranking signals on the pillar for the head term while spokes win the long tail.

### 5.2 How the juggernaut track should interlink

- Each `/guides/<slug>` page must carry: an up-link to its pillar/hub, 3-5
  sideways links to related guides, and a down/cross link to the relevant legacy
  `/pages/*` KEEP page (for example a guide on "CRM for startups" links to the
  `best-crm-for-startups` ranking page). This funnels equity from the deep guides
  into the commercial ranking pages that convert.
- Rally already has a `relatedFor` helper in the registry. Extend it so
  juggernaut entries return related guides + the matching legacy pages, and emit
  those as an in-body "Related" section AND contextual body links. Contextual
  body links (inside prose) carry more weight than a related-links list.
- Reverse the flow too: the KEEP `/pages/*` pages should link OUT to the deeper
  `/guides/*` page on the same topic ("For the full breakdown, see our guide to
  X"). This passes the legacy pages' existing equity into the new juggernauts.

### 5.3 Breadcrumbs + schema (partly wired, finish it)

- Breadcrumb navigation is already rendered (`renderBody` emits a Breadcrumb nav)
  and `breadcrumbLd` exists. Ensure EVERY page (legacy, guide, and core) emits
  `breadcrumbLd` JSON-LD, not just the nav HTML. Breadcrumb schema gives you the
  breadcrumb display in SERPs and reinforces hierarchy.
- Emit `articleLd` on guides, `itemListLd` on ranking/comparison pages,
  `faqLd` wherever there is an FAQ block, `definedTermLd` on glossary/definition
  pages, and `orgLd` sitewide. The helpers all exist in `head.js`; the job is
  making sure the prerender attaches the right one per page type. This is the
  cheapest LLM + rich-result win available.

### 5.4 Flat, shallow architecture

- Keep every important page within 3 clicks of the homepage. The `/pages` and
  `/guides` hub pages plus cluster pillars make this automatic. Do not bury
  juggernauts 5 levels deep.
- The `/pages` index and a new `/guides` index should be linked from the site's
  main nav or footer so crawlers always have a fresh path to every cluster.

### 5.5 Anchor text discipline

- Use descriptive, varied anchor text that names the target topic ("sales
  forecasting guide") not "click here" and not the exact money keyword every
  time. Over-optimized identical anchors look manipulative even internally.

---

## 6. LLM / AI-search optimization (rank inside ChatGPT, Perplexity, Gemini answers)

AI answer engines are now a primary discovery channel. They do not "rank" like
Google; they retrieve and synthesize. You win by being the most retrievable,
quotable, and unambiguous source. Rally is already ahead here (prerendered HTML +
llms.txt + JSON-LD). Finish the job.

### 6.1 llms.txt (already generated, keep it excellent)

- `dist/llms.txt` is auto-generated with a full page index plus a Guides section,
  each entry carrying a one-line summary. This is the emerging convention for
  telling models what your site contains and where the canonical content lives.
- Keep the summaries genuinely descriptive and factual (they already are). As you
  publish guides, they get appended automatically by the prerender.
- Consider also emitting a richer `llms-full.txt` with the full text of your top
  20-30 juggernaut guides concatenated, so a model that fetches it gets your best
  content in one pull.

### 6.2 Quotable, factual, self-contained content

- Models cite sentences that state a fact cleanly and stand alone. Write
  paragraphs where the FIRST sentence answers the question directly (the
  `shortAnswer` field the engine already supports is perfect for this - lead every
  page with a crisp, quotable short answer).
- Include specific numbers, dates, and named entities. "Rally forecasts natively
  so most teams skip a second system" is quotable; vague marketing fluff is not.
- Comparison tables and clear "best for X" verdicts get lifted verbatim into AI
  answers. Rally's tables and rankings are ideal; keep them honest and specific.

### 6.3 Structured data = machine-readable facts

- The JSON-LD from Section 5.3 is not just for Google rich results; LLMs and their
  retrieval layers parse structured data to extract entities and relationships.
  `orgLd` (what Rally is), `faqLd` (Q/A pairs models love to lift),
  `definedTermLd` (glossary entities), and `itemListLd` (rankings) directly feed
  AI extraction. Ship them on every eligible page.

### 6.4 Entity clarity (who/what is Rally)

- Make Rally an unambiguous entity: consistent name, one-sentence definition
  repeated across the site and in `orgLd` ("Rally is the AI-native CRM and revenue
  platform; its operator is Rook"), and a strong /manifesto and /product/rook
  page that define the entity and its differentiators.
- Get Rally into knowledge bases models trust: a Crunchbase profile, a G2/Capterra
  listing, a Product Hunt page, and (once notable enough) a Wikipedia-eligible
  footprint. Consistent entity facts across authoritative sources is how a model
  learns "Rally = the AI-native CRM with an operator named Rook" as a fact rather
  than a guess.
- Keep the naming consistent everywhere (do not let placeholder or alternate names
  like the old "Helm" working name leak into public content; conflicting names
  fracture the entity).

### 6.5 Do not block the AI crawlers

- `robots.txt` currently allows all (`User-agent: *  Allow: /`). Keep it that
  way. Do NOT block GPTBot, PerplexityBot, Google-Extended, ClaudeBot, etc. if
  your goal is to be cited. (Blocking them removes you from the answer, which is
  the opposite of what you want for top-of-funnel visibility.) Only revisit this
  if you later decide content licensing matters more than reach.

### 6.6 Freshness and specificity signals

- Models and their retrieval favor recent, dated content for time-sensitive
  queries ("best CRM 2026"). Keep titles and `lastmod` current on your KEEP and
  guide pages, and put the year in titles where intent is time-sensitive (already
  done: "Best CRM Software (2026)").

---

## 7. The 30/60/90 execution sequence (do this in order)

Day 0-7 (foundations, mostly Nate + a few file drops):
1. Verify GSC via HTML file in `public/` on the vercel.app URL. Submit sitemap.
2. Import to Bing Webmaster from GSC. Confirm sitemap there.
3. Buy the custom domain, point it in Vercel, set primary + redirect, update
   `SITE`. Re-verify GSC/Bing on the domain (DNS method).
4. Ship IndexNow: key file in `public/` + `scripts/indexnow-ping.mjs` post-build.
5. Request-index the homepage, pricing, and top 10 pages in GSC.

Day 8-30 (triage + first cadence):
6. Add `tier` to the registry. Mark the obvious long-tail junk `noindex`, keep
   the 100-150 head pages, redirect true duplicates. Rebuild; sitemap shrinks to
   quality URLs.
7. Convert `sitemap.xml` to a sitemap index (pages/guides/core).
8. Ship the first 2 calculator tools with embed codes.
9. Start the weekly juggernaut cadence: 1 cluster/week, 10-20 spokes + 1 pillar,
   fully interlinked, IndexNow-pinged.

Day 31-90 (authority + compounding):
10. Publish the first original data study; pitch it (digital PR).
11. Get listed on G2, Capterra, Product Hunt, and every integration marketplace.
12. Start weekly HARO/expert-quote responses (2-3/week).
13. Keep the cadence: by day 90 you should have ~40-60 juggernaut guides live,
    all interlinked, plus a shrinking-but-stronger legacy set, plus the first
    wave of editorial + tool-embed backlinks.

Measure in GSC weekly: impressions, average position, indexed-page count per
sitemap bucket (guides should climb faster than legacy). In Bing, watch IndexNow
coverage. Track AI citations by periodically asking ChatGPT/Perplexity/Gemini
"best AI CRM" and "best CRM for X" and noting whether Rally is named and linked.

---

## 8. File/where-it-lives quick reference

| Thing | Location | Auto or manual |
|---|---|---|
| Static prerender engine | `scripts/prerender-seo.mjs` | auto at build |
| Page registry (source of truth) | `src/marketing/seo/registry.js` | edit to add/retire pages |
| Meta + JSON-LD helpers | `src/marketing/seo/head.js` (`SITE`, `canonicalFor`, `orgLd`, `breadcrumbLd`, `articleLd`, `faqLd`, `definedTermLd`, `itemListLd`) | edit `SITE` for custom domain |
| Sitemap | `dist/sitemap.xml` | auto |
| Robots | `dist/robots.txt` | auto |
| llms.txt | `dist/llms.txt` | auto |
| Legacy thin pages | `dist/pages/*` (1971) | triage via `tier` |
| Juggernaut guides | `dist/guides/<slug>/index.html` | grow weekly |
| GSC verification file | `public/google<token>.html` | drop in, Nate pastes token |
| IndexNow key | `public/<key>.txt` + `scripts/indexnow-ping.mjs` | to build |

Keep every addition ASCII-only with no em-dashes; the prerender enforces this and
it is a hard Rally rule.
