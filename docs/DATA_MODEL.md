# Rally Data Model

The production, multi-tenant Postgres schema that moves Rally off the
local-first localStorage stores (`src/lib/store*.js`) and onto real
per-org persistence in Supabase.

Files (run in this order):

1. `supabase/schema.sql` - tables, types, indexes
2. `supabase/functions.sql` - triggers, tenancy helpers, RPCs
3. `supabase/rls.sql` - row-level security (depends on the helpers)
4. `supabase/seed.sql` - one demo org so a fresh tenant is not empty

All app tables are prefixed `rally_` (they share the Supabase project with
the existing `rally_waitlist` table and match every `// SUPABASE: rally_*`
note in the store slices). ASCII only, no em-dash or en-dash anywhere.

---

## 1. Tenancy model

One line: **every business row carries `org_id`, and a user can touch a row
only if they hold an active `rally_memberships` row for that org.**

```
auth.users (Supabase Auth)
    |  1:1
rally_users            profile: name, title, quota, avatar   (id = auth.users.id)
    |  N:M via
rally_memberships      (org_id, user_id, role)   <- the tenancy join + RBAC role
    |  N:1
rally_orgs             the tenant / workspace
    |  1:N
every rally_* business table (org_id FK)
```

- A person can belong to several orgs, with a different role in each. That
  is why **role lives on the membership, not on the user** (the local
  `store.js` users[] carried `role` inline; in the real model that becomes
  `rally_memberships.role`).
- Roles: `admin`, `manager`, `rep`, `viewer` (matches `src/lib/rbac.js`
  ROLES). Ranked 4/3/2/1 by the `rally_role_rank()` helper.
- New auth signups get a `rally_users` row automatically (the
  `rally_handle_new_user` trigger on `auth.users`). Joining an org is a
  separate `rally_memberships` insert (invite flow or "create workspace").

### How RLS enforces it

Three `SECURITY DEFINER` helpers (in `functions.sql`) read
`rally_memberships` with the function-owner's rights, so policies never
reference the memberships table directly (which would recurse):

| helper | returns |
|---|---|
| `rally_org_ids()` | set of org_ids the caller belongs to |
| `rally_is_member(org)` | boolean |
| `rally_role_rank(org)` | int 0..4 (0 = not a member) |

Policy shape by table group (see `rls.sql`):

| group | tables | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| Owned | companies, contacts, deals, activities, quotes, leads, projects, saved_views | member | rep+ (own rows) / manager+ | manager+ or owning rep | manager+ |
| Tickets | tickets | member | rep+ | manager+ or assigned rep | manager+ |
| Child | deal_line_items, deal_contacts, deal_stakeholders, deal_competitors, deal_close_plan, quote_lines, quote_events, project_groups, tasks, task_assignees, subitems, field_values | member | rep+ | rep+ | rep+ |
| Config | products, campaigns, sequences, invoices, automations, automation_runs, pipeline_stages, custom_fields, role_grants, field_security | member | manager+ | manager+ | manager+ |
| Audit | audit_log | manager+ | member (append) | denied | denied |
| Per-user | mailboxes, notifications | self (+ admin) | self / member | self | self (+ admin) |
| Identity | orgs, users, memberships | member / self | see rls.sql | admin / self | admin |

Notes:
- `viewer` (rank 1) never matches a write policy, so it is read-only
  everywhere. This mirrors `rbac.js` DEFAULTS.viewer.
- The DB floor is intentionally a little looser than the app's `can()`
  matrix (e.g. custom-field management is admin-only in `rbac.js` but
  manager+ at the DB). The app's capability checks tighten it further; RLS
  is the backstop, not the whole policy.
- The **service role** (`SUPABASE_SERVICE_ROLE_KEY`, used by the `/api/*`
  serverless routes) has `BYPASSRLS`, so server-side writes (waitlist
  capture, webhooks, admin jobs) skip these policies. The browser client
  (anon / authenticated key) always goes through them.

---

## 2. Entities (ERD in prose)

### Core CRM
- **rally_companies** - accounts. `owner_id`, `health`(green/yellow/red),
  `lifecycle_stage`, `industry`, `size`, `is_flagship`, `tags[]`, `custom`.
- **rally_contacts** - people. `company_id`, `owner_id`, `lifecycle_stage`,
  lead fields (`lead_status/source/score`), `tags[]`, `last_activity_at`.
- **rally_deals** - opportunities. `company_id`, `primary_contact_id`,
  `stage` (soft FK to `rally_pipeline_stages.stage_key`), `status`
  (open/won/lost), `value`, `probability`, `forecast_category`,
  `close_date`, `owner_id`, `campaign_id`.
  - **rally_deal_contacts** - the deal `contactIds[]` normalized (M:N).
  - **rally_deal_line_items** - CPQ lines (`product_id`, qty, unit_price,
    term, discount).
  - **rally_deal_stakeholders** - buying committee (`contact_id`, role,
    influence).
  - **rally_deal_competitors** - competitor names on the deal.
  - **rally_deal_close_plan** - ordered close-plan steps (label, done).
- **rally_activities** - tasks/calls/emails/meetings/notes. Polymorphic
  `related_type` + `related_id`, plus `company_id`, `owner_id`, `done`.

### Catalog + revenue
- **rally_products** - price book (sku, category, price, billing, active).
- **rally_quotes** - quote records (`number`, `company_id`, `deal_id`,
  `amount` cached total, `status` draft/sent/accepted/expired, `terms`,
  `notes`, `shipping`, `expires_at`).
  - **rally_quote_lines** - quote line items (product, qty, price,
    discount, tax).
  - **rally_quote_events** - status timeline (status, who, note, at).
- **rally_invoices** - billing (`number`, `company_id`, amount, status
  draft/open/paid/overdue, due dates).

### Marketing + service
- **rally_leads** - top-of-funnel leads (kept distinct from contacts;
  `converted_contact_id` records promotion). status new/working/qualified/
  unqualified, `score`, `source`.
- **rally_campaigns** - funnel metrics (sent/opened/clicked/leads,
  revenue, budget).
- **rally_sequences** - cadences (steps, enrolled, open/reply rate,
  meetings, `definition` jsonb for the builder).
- **rally_tickets** - support (`subject`, `company_id`, `contact_id`,
  priority, status open/pending/solved, `assignee_id`).

### Automation
- **rally_automations** - executable rules (`trigger`, `conditions`,
  `actions` all jsonb; matches `automations.js` definition shape).
- **rally_automation_runs** - append-only run log (subject, actions_run,
  result). The store-ext "workflows" list is a display summary of these
  and folds into this table.

### Projects (in-CRM boards)
- **rally_projects** -> **rally_project_groups** -> **rally_tasks** ->
  **rally_subitems**; **rally_task_assignees** normalizes `assigneeIds[]`.
  Tasks carry status (todo/doing/blocked/done), priority, progress, dates,
  `tags[]`, `number`.

### Platform / config
- **rally_pipeline_stages** - per-org, per-pipeline stage config
  (`stage_key`, name, sort_order, probability, stage_type).
- **rally_custom_fields** - field registry (object_type + field_key
  unique). System canonical fields ship in code (`registry-seeds/*`); only
  user-created / customized fields need a row.
- **rally_field_values** - normalized custom-field values (see section 4).
- **rally_saved_views** - saved/executable views (filters/columns/sort/viz
  jsonb). `owner_id` null = shared org view.
- **rally_role_grants** - sparse RBAC overrides vs `rbac.js` DEFAULTS.
- **rally_field_security** - per-field view/edit min-role (from
  `rbac.js` FIELD_SECURITY).
- **rally_audit_log** - append-only org changelog (from `audit.js`;
  generalizes `dealExtras.history`).
- **rally_mailboxes** - connected email accounts (per user; secrets are a
  vault ref, never a raw password).
- **rally_notifications** - in-app notifications (per user; target of the
  `notify_owner` automation action).

### RPCs (functions.sql)
- `rally_current_org()` - the caller's most-recent active org.
- `rally_pipeline_summary(org)` - per-stage count + open value + weighted
  forecast in one call (mirrors `store.js` dealsByStage / pipelineValue /
  weightedForecast).

---

## 3. Migration path from the local-first stores

Each localStorage slice maps to tables as follows. The importer walks the
seed shape, assigns a fresh `uuid` per record, and records the old string
id in `legacy_id` so cross-references (`companyId`, `contactIds`,
`relatedId`, ...) can be rewritten to the new uuids in a second pass.

| localStorage key | slice | source array/shape | -> table(s) |
|---|---|---|---|
| `rally_state_v1` | `store.js` | `users[]` (`{id,name,email,role,title,quota}`) | `rally_users` (name/title/quota) + `rally_memberships` (role); `id` becomes `legacy_id`, real id = auth uuid |
| | | `companies[]` | `rally_companies` (health, lifecycleStage, size, ownerId->owner_id, flagship->is_flagship) |
| | | `contacts[]` | `rally_contacts` (tags[], lastActivityAt, lifecycleStage; `fieldValues` -> `custom` + `rally_field_values`) |
| | | `deals[]` | `rally_deals` (value, stage, probability, status, closeDate); `contactIds[]` -> `rally_deal_contacts` |
| | | `activities[]` | `rally_activities` (relatedType/relatedId, done, system->is_system) |
| | | `STAGES` (const) | `rally_pipeline_stages` (one row set per org) |
| `rally_depth_v2` | `store-depth.js` | `dealExtras[dealId].lineItems` | `rally_deal_line_items` |
| | | `dealExtras.stakeholders` | `rally_deal_stakeholders` |
| | | `dealExtras.competitors` | `rally_deal_competitors` |
| | | `dealExtras.closePlan` | `rally_deal_close_plan` |
| | | `dealExtras` scalars (nextStep, nextStepDue, forecastCategory, winReason, lossReason) | columns on `rally_deals` |
| | | `dealExtras.history` | `rally_audit_log` (object_type='deal') |
| | | `projects[]` | `rally_projects` |
| | | `project.groups[]` | `rally_project_groups` |
| | | `project.tasks[]` | `rally_tasks` (assigneeIds -> `rally_task_assignees`) |
| | | `task.subitems[]` | `rally_subitems` |
| `rally_ext_v1` | `store-ext.js` | `leads[]` | `rally_leads` |
| | | `products[]` | `rally_products` |
| | | `quotes[]` | `rally_quotes` (record only) |
| | | `invoices[]` | `rally_invoices` |
| | | `campaigns[]` | `rally_campaigns` |
| | | `sequences[]` | `rally_sequences` |
| | | `tickets[]` | `rally_tickets` (contactName/companyName resolve to FKs) |
| | | `workflows[]` | folded into `rally_automations` (display summary) |
| `rally_quote_v1` | `store-quote.js` | `extras[quoteId].lineItems` | `rally_quote_lines` |
| | | `extras.terms/notes/shipping` | columns on `rally_quotes` |
| | | `extras.timeline` | `rally_quote_events` |
| `rally_audit_v1` | `audit.js` | flat entry list | `rally_audit_log` |
| `rally_fields_v1` | `fields.js` | `{objectType: [def...]}` | `rally_custom_fields` |
| (record.fieldValues) | across slices | `{ key: value }` | `rally_field_values` + `custom` jsonb column |
| `rally_views_v1` | `views.js` | user views | `rally_saved_views` (system views stay in code) |
| `rally_rbac_v1` | `rbac.js` | `overrides` | `rally_role_grants`; `FIELD_SECURITY` -> `rally_field_security` |
| `rally_mailboxes_v1` | `mailboxes.js` | connection list | `rally_mailboxes` (strip/repoint SMTP password to a vault ref) |
| `rally_automations_v1` | `automations.js` | `rules[]` | `rally_automations` |
| `rally_automation_runlog_v1` | `automations.js` | run list | `rally_automation_runs` |

### Suggested import procedure
1. Create the org (`rally_orgs`) and the admin membership for the signed-in
   user.
2. Insert users/profiles + memberships; build a `legacy_id -> uuid` map.
3. Insert companies, then contacts (resolve `companyId`), then deals
   (resolve `companyId`, `primary_contact_id`, rewrite `contactIds[]` into
   `rally_deal_contacts`).
4. Insert dependent rows (line items, stakeholders, activities, quotes +
   lines + events, invoices, projects + groups + tasks + subitems).
5. Insert config (pipeline stages, custom fields, saved views, rbac).
6. Replay `fieldValues` into `rally_field_values` and the `custom` jsonb.

Because every read/write in the stores already carries a `// SUPABASE:`
note with the exact target table, the store function signatures do not
change: swap each function body for the Supabase query, keep the return
shape. `src/lib/supabase.js` already lazy-inits the client and
`hasBackend()` gates local-first vs live.

---

## 4. Custom fields: two representations

`record.fieldValues = { key: value }` in the stores maps two ways, kept in
sync:

- **`custom` jsonb column** on each business table - the fast path, a 1:1
  mirror of the current shape. Read the whole record in one row; no join.
- **`rally_field_values`** - the normalized, indexed, auditable form: one
  row per `(org_id, object_type, record_id, field_key)` with a `jsonb`
  value. Use it for cross-record filtered views ("all contacts where
  custom field X = Y"), history, and reporting.

`rally_field_values.record_id` is a polymorphic uuid (it points at
different tables by `object_type`), so it has no single FK. Integrity is
maintained by the app writer and by the parent table's `on delete cascade`
being complemented with a cleanup on delete (or a periodic sweep). The
`custom` jsonb is the source of truth for hot reads; `rally_field_values`
is derived and can be rebuilt from it.

---

## 5. Env + wiring to run the migration

Already present (per project memory / `waitlist.js`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - server-side (the `/api/*`
  routes and any import script). Service role bypasses RLS, which is what
  you want for the bulk import.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` - browser client
  (`src/lib/supabase.js`). These go through RLS. Set both to flip
  `hasBackend()` true and move the app off local-first.

### Applying the schema

Run the four files in order against the Supabase project. Either:

- **Supabase SQL editor** - paste and run `schema.sql`, `functions.sql`,
  `rls.sql`, then `seed.sql` (the editor runs as an owner role that can
  insert into `auth.users`, which the seed needs).
- **psql** -
  ```
  psql "$SUPABASE_DB_URL" -f supabase/schema.sql
  psql "$SUPABASE_DB_URL" -f supabase/functions.sql
  psql "$SUPABASE_DB_URL" -f supabase/rls.sql
  psql "$SUPABASE_DB_URL" -f supabase/seed.sql
  ```
  where `SUPABASE_DB_URL` is the project's direct Postgres connection
  string (Project Settings -> Database).

### Notes
- `schema.sql` needs `pgcrypto` (created at the top) for
  `gen_random_uuid()` and the seed's `crypt()`.
- `seed.sql` is optional and demo-only. Skip it for a real tenant; the
  first real workspace comes from the app's create-org flow (org insert +
  admin membership insert, both allowed by the RLS bootstrap policy).
- To wire the app: for each `// SUPABASE:`-annotated function in
  `src/lib/store*.js`, replace the local body with the Supabase query
  against the mapped table, passing `org_id` from `rally_current_org()` (or
  the active workspace) and letting RLS scope the rest. No app code was
  changed as part of this schema work; that swap is the next step.
