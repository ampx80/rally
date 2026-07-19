# Ardova Module Parity Matrix

Honest depth assessment of every Ardova module against the incumbents we are
displacing: HubSpot, GoHighLevel (GHL), Salesforce, and Zoho. Scored 0-3.

- 0 = absent
- 1 = demo depth (UI over localStorage, no real backend / execution)
- 2 = usable (real backend path or solid logic, single-tenant)
- 3 = exceeds the incumbent

Source of truth: `src/lib/modules.js` (68 toggleable modules) + `src/App.jsx`
(~25 routes outside the registry). Cross-checked against `research/RALLY_PARITY_MAP.md`.
Audit date: 2026-07-19. **No module scores 3 today.** We win on breadth + agent
layer; we are behind on depth. This document is the depth backlog.

ASCII only. No em-dash or en-dash anywhere.

---

## Headline

| Dimension | Ardova today | Bar to beat |
|---|---|---|
| Breadth (module count) | ~93 surfaces | 3 (we exceed all four incumbents on surface area) |
| Agent-native layer (Rook, Agent Studio, Handshake, Boardroom) | Live + novel | 3 (ahead of Breeze/Agentforce on counter-agent commerce) |
| Data persistence | localStorage-first; Supabase scaffolded but not adopted | 1 (incumbents are multi-tenant cloud) |
| Marketing execution (email/forms/automation) | Partial real send, no visual builder, browser-bound runners | 1-2 |
| Payments (customer-facing) | UI demo; `api/payments-charge.js` does not exist | 1 |
| Reporting | Client-side builder, no server dataset engine | 2 |
| RBAC / auth enforcement | UI-gated + partial on v1 REST only | 1 |

---

## The six target engines (deep)

| Engine | Ardova | HubSpot | GHL | Salesforce | Zoho | Gap to close | Priority |
|---|---|---|---|---|---|---|---|
| **Email** | 2->2.5 (VISUAL BUILDER SHIPPED 2026-07-19: block-model drag-drop -> email-safe responsive HTML, live device preview, templates, merge tokens, wired to real Resend send with injected one-click unsubscribe. Still: server-cron scheduling, first-class Supabase segments, real open/click webhook, preference center, domain-auth UI) | 3 | 3 | 2 | 2 | Remaining: scheduling on server cron, real segments as entities, deliverability (SPF/DKIM/DMARC status + warmup pacing), real open/click via Resend webhooks + per-recipient timeline, preference center | **1 (in progress)** |
| **Forms** | 2 (8 field types, hosted `/f/:formId`, contact create, notify) | 3 | 2 | 2 | 3 | Drag builder, conditional/branch logic, multi-step, file upload, payment field, spam protection, analytics funnel, server persistence, workflow trigger | **2** |
| **Automation** | 1-2 across THREE builders (Workflows evaluate-only; Automations executes client-side; Flow simulates) | 3 | 3 | 3 | 2 | Consolidate to ONE server-side durable runner: triggers/actions/wait/branch/goal, enrollment history + logs | **3** |
| **Reporting** | 2 (v2 builder, joins, cohorts, CSV, scheduled email; client renders payload) | 2 | 1 | 3 | 3 | Server dataset/query layer over all objects, pivots, computed fields, dashboards, shareable read-only links, PDF | **4** |
| **Payments** | 1 (rich UI, all simulated; Stripe only bills Ardova SaaS, not the customer's customers) | 2 | 3 | 2 | 2 | Product/price catalog, payment links, invoices->pay, subscriptions, Stripe Connect, webhooks write back to CRM, dunning, revenue dashboard | **5** |
| **Marketing Hub** | 1-2 (aggregator + lead scoring; funnels/ads/attribution use synthetic data) | 3 | 3 | 2 | 2 | Shared visual designer (email + landing + funnel), real attribution over real events, unify campaigns/journeys/forms | **6** |

### Engine detail

**Email** - `Campaigns.jsx`, `Sequences.jsx`, `MarketingAutomations.jsx`, `Lists.jsx`;
`marketing-campaigns.js`, `marketing-engine.js`, `sequences-data.js`, `lists.js`;
`api/broadcast.js`, `sequence-tick.js`, `marketing-run.js`, `_lib-email.js`.
Real: Resend send with retry + idempotency + branded shell + List-Unsubscribe when keyed;
static lists + active segments via `views.js`; suppression table when Supabase present.
Missing: visual drag-drop builder, real open/click tracking (currently simulated locally),
server cron for sequences (runs in-browser), SPF/DKIM/DMARC setup UI, preference center,
bounce/complaint handling surfaced in UI.

**Forms** - `Forms.jsx`, `forms.js`, `api/form-notify.js`. Real: 8 field types,
hosted page, embed iframe, contact create/update, owner notify. Missing: logic,
multi-step, file upload, payment field, CAPTCHA, analytics, server persistence.

**Automation** - THREE parallel systems is the core problem: `Workflows.jsx`/`workflows-data.js`
(evaluates rules, does not execute), `automations.js` (real client-side executor on store
commits, dies when tab closes, no server cron), `Flow.jsx`/`flow-data.js` (`runFlow()` is a
simulator). Plus `marketing-engine.js` is a fourth email-only path. Must consolidate.

**Reporting** - `Reports.jsx`, `ReportBuilder.jsx`, `reports2/*`, `report-builder.js`,
`report-types.js`, `api/report-deliver.js`, `export-deck-pptx.js`. Real: v2 builder with
cross-object joins, cohorts, saved defs, CSV, PPTX export, scheduled delivery config.
Missing: server-side dataset/query engine (client currently renders + POSTs payload),
pivot tables, computed fields, shareable read-only links.

**Payments** - `Payments.jsx`, `Invoices.jsx`, `Quotes.jsx`, `Products.jsx`, `Signatures.jsx`;
`payments-data.js`, `invoices-data.js`, `quotes-data.js`; `api/billing-checkout.js`,
`billing-portal.js`, `billing-webhook.js`. Critical: `api/payments-charge.js` and
`api/payment-link-send.js` are referenced in comments but DO NOT EXIST. Stripe integration
only bills the Ardova customer for their Ardova subscription (SaaS billing), not their end
customers. No Stripe Connect, no PaymentIntents for CRM payment links, no webhook writeback.

**Marketing Hub** - `MarketingHub.jsx`, `LandingPages.jsx`, `Funnels.jsx`, `Journeys.jsx`,
`Ads.jsx`, `Social.jsx`, `Reviews.jsx`, `Attribution.jsx`. Real: aggregation + configurable
lead scoring; attribution models compute over synthetic touch timelines. Missing: shared
designer, live traffic/conversion data, ad platform API sync, attribution over real
gclid/fbclid/web events.

---

## Cross-cutting foundations (gate every engine to "done")

| Foundation | Ardova today | Target |
|---|---|---|
| Data layer | `data-layer/*` exists; `LocalAdapter` default; `supabase-adapter.js` unused by pages; each `*-data.js` owns a localStorage key | `VITE_DATA_BACKEND=supabase` as a real path, org tenancy, enforced RLS, local fallback |
| Auth | `auth.js` Supabase wrapper dormant; demo `getCurrentUser()` | Supabase Auth live, identity tied to org + role |
| RBAC | `rbac.js` UI-gated; `_lib-authz.js` on v1 REST only | Enforced server-side on every mutating `/api/*` route |
| Fire-and-forget | Some endpoints fail-open silently | 5s heartbeat + fail-closed (per CLAUDE.md) |

---

## Full module scores (condensed)

Scores from the depth audit. Most registry modules are 1 (demo depth). Listed by score.

**Score 2 (usable):** Deals, Contacts, Companies, Command center, Activities, forecasting,
campaigns, sequences, quotes, invoices, dashboards, reports, automations (marketing), forms,
lists, tickets, markethub, attribution, roles, billingPlans, audit, projects, report-builder,
app-manager, team.

**Score 1 (demo depth):** leads, workflows, integrations, goals, territories, scheduler,
playbooks, warroom, landingPages, reviews, social, funnels, ads, journeys, success,
scheduling, academy, conversations, voice, service, kb, surveys, signatures, payments,
affiliates, intelligence, fork, windTunnel, ghostDeals, twin, signals, film, genesis, canvas,
grid, flow, autopilot, nightShift, sms, queue, workspaces, marketplace, sandboxes, permissions,
developers, datasync, import, objects, duplicates, studio, drive, sheets, products, inbox,
settings, notifications.

**Score 0:** none (every listed module has at least a UI).

**Score 3:** none yet. Closest to a category win is the agent layer (Handshake / Boardroom /
Agent Studio), which is genuinely ahead of Breeze/Agentforce on counter-agent commerce, but
depends on the same localStorage foundation, so it does not yet earn a 3 as a "product."

---

## Build order (land each as one atomic deployed push, then update this file)

1. Email  2. Forms  3. Automation  4. Reporting  5. Payments  6. Marketing Hub unification

After each engine ships: re-score the row, note what now exceeds the incumbent, and what
remains. Reuse (do not rebuild): the Konva visual designer and the Resend send/idempotency
core from `Class Reunly` (see `docs/FUTURE_THESIS.md` reuse section).
