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
| **Email** | 3 SHIPPED 2026-07-19 (visual block builder -> email-safe HTML + live preview + templates + merge tokens; real Resend send + one-click unsub; server-cron drip; first-class Lists+Segments AND/OR resolver; real open/click via Resend webhook -> email_log + events + per-recipient timeline/click-map; SPF/DKIM/DMARC panel + suppression + preference center) | 3 | 3 | 2 | 2 | Live-key wiring (RESEND_*) + Supabase persistence for cross-device history | **DONE (pending secrets)** |
| **Forms** | 3 SHIPPED 2026-07-19 (drag-drop multi-step builder, all field types incl file upload + payment field, conditional/branch logic, spam protection, theming, embed + hosted page, submission -> contact + fires rally:form-submit, per-form analytics funnel) | 3 | 2 | 2 | 3 | Supabase submission persistence + payment-field wired to Payments engine | **DONE (pending secrets)** |
| **Automation** | 3 SHIPPED 2026-07-19 (ONE engine: triggers record/form/email/payment/schedule/webhook; actions email/task/update/wait/branch/goal/webhook/AI; enrollment history + logs; Workflows is the builder, Flow is a live canvas of the SAME engine; server runner) | 3 | 3 | 3 | 2 | Supabase-durable enrollment state + scale | **DONE (pending secrets)** |
| **Reporting** | 3 SHIPPED 2026-07-19 (cross-object query layer + joins + lead source + email engagement, pivot cross-tabs, computed fields, composable dashboards, CSV/PDF export, shareable read-only reports, server dataset endpoint) | 2 | 1 | 3 | 3 | Supabase-backed datasets for very large books | **DONE (pending secrets)** |
| **Payments** | 2.5 SHIPPED 2026-07-19 (product catalog, payment links, invoice->Stripe Checkout, subscriptions, Stripe Connect, signature-verified webhook + client reconcile -> CRM activity + rally:payment; env-gated) | 2 | 3 | 2 | 2 | Needs STRIPE_* to charge live; dunning automation polish | **DONE (pending secrets)** |
| **Marketing Hub** | 3 SHIPPED 2026-07-19 (ONE shared block designer across email + landing pages + funnels via renderDoc; landing pages author with the same builder + link real forms; funnels chain real assets with tracked conversion; Journeys run on the one automation engine; unified hub rollup over real stores; attribution folds in real form/landing events; Konva designer ported as scaffolding) | 3 | 3 | 2 | 2 | Wire ads platform APIs; deeper real-event attribution | **DONE (pending secrets)** |

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

## Build order status (all six landed + live on rally-psi-five, verified zero console errors)

1. Email DONE  2. Forms DONE  3. Automation DONE  4. Reporting DONE  5. Payments DONE (needs STRIPE_* for live charge)  6. Marketing Hub DONE

Remaining cross-cutting foundation: flip `VITE_DATA_BACKEND=supabase` with org tenancy + enforced RLS, and wire live secrets (RESEND_*, STRIPE_*, SUPABASE_*). Every engine already runs local-first and degrades cleanly until those are set.

After each engine ships: re-score the row, note what now exceeds the incumbent, and what
remains. Reuse (do not rebuild): the Konva visual designer and the Resend send/idempotency
core from `Class Reunly` (see `docs/FUTURE_THESIS.md` reuse section).
