-- ============================================================
-- RALLY PRODUCTION SCHEMA  (multi-tenant, Supabase / Postgres)
-- ============================================================
-- Full DDL for moving Rally off the local-first localStorage stores
-- (src/lib/store*.js) onto real per-org persistence.
--
-- Tenancy model in one line: every business row carries an org_id;
-- a user sees a row only if they hold a rally_memberships row for that
-- org. RLS (supabase/rls.sql) enforces it; this file only builds the
-- shape. Run order: schema.sql -> functions.sql -> rls.sql -> seed.sql.
--
-- Conventions
--   - All app tables are prefixed rally_ (shared Supabase project;
--     matches every "// SUPABASE: rally_*" note in the store slices and
--     lives alongside the existing rally_waitlist table).
--   - Primary keys are uuid (gen_random_uuid()). Each core table also
--     keeps a legacy_id text column so the local seed ids (co_1, d_7,
--     c_42 ...) can be mapped during the one-time import.
--   - created_at / updated_at timestamptz on every table; updated_at is
--     maintained by the set_updated_at() trigger in functions.sql.
--   - Small fixed vocabularies use text + CHECK (cleaner migrations than
--     pg enums). Open-ended pipeline stages live in rally_pipeline_stages.
--   - record.fieldValues from the stores maps two ways: a fast-path
--     jsonb `custom` column on each business table (mirrors the current
--     shape 1:1) AND the normalized rally_field_values table for indexed
--     / historical queries. Pick per read pattern; both are kept in sync.
--   - ASCII only. No em-dash or en-dash anywhere.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TENANCY  (orgs, auth-linked users, memberships)
-- ============================================================

-- One tenant / workspace. Everything else hangs off org_id.
create table if not exists rally_orgs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,
  plan         text not null default 'growth' check (plan in ('trial','growth','scale','enterprise')),
  logo_url     text,
  home_currency text not null default 'USD',
  settings     jsonb not null default '{}'::jsonb,   -- branding, pipeline defaults, feature flags
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- App-level user profile, one row per auth.users identity. Name / title /
-- quota / avatar live here; the role is NOT here (it belongs on the
-- membership, so the same person can be admin in one org and rep in
-- another). Mirrors store.js users[] minus the role.
create table if not exists rally_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  name         text not null default '',
  title        text,
  avatar_url   text,
  quota        numeric(14,2) not null default 0,      -- annual quota (0 for non-quota-carrying)
  legacy_id    text,                                   -- old store id (u_1 ...)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The join that makes Rally multi-tenant. A user is a member of an org
-- with exactly one role. This is the single source of truth RLS reads.
create table if not exists rally_memberships (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  user_id      uuid not null references rally_users(id) on delete cascade,
  role         text not null default 'rep' check (role in ('admin','manager','rep','viewer')),
  status       text not null default 'active' check (status in ('active','invited','disabled')),
  invited_by   uuid references rally_users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_memberships_user on rally_memberships(user_id);
create index if not exists idx_memberships_org  on rally_memberships(org_id);

-- ============================================================
-- 2. CONFIG  (pipeline stages, role grants, field security)
-- ============================================================

-- Per-org pipeline stage config (store.js STAGES). deals.stage is a soft
-- FK to stage_key within the same org (kept text so a stage rename does
-- not rewrite every deal).
create table if not exists rally_pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  stage_key    text not null,                          -- 'lead','qualified',...
  name         text not null,
  sort_order   int  not null default 0,
  probability  int  not null default 0 check (probability between 0 and 100),
  stage_type   text not null default 'open' check (stage_type in ('open','won','lost')),
  pipeline_id  text not null default 'default',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, pipeline_id, stage_key)
);
create index if not exists idx_stages_org on rally_pipeline_stages(org_id);

-- RBAC grant overrides vs the code defaults (rbac.js DEFAULTS). Sparse:
-- only rows that differ from the built-in matrix are stored.
create table if not exists rally_role_grants (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  role         text not null check (role in ('admin','manager','rep','viewer')),
  capability   text not null,                          -- 'records.edit', 'quotes.approve', ...
  granted      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, role, capability)
);

-- Field-level security (rbac.js FIELD_SECURITY): min role rank to view/edit
-- a sensitive field. Stored per org so admins can tune it.
create table if not exists rally_field_security (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  object_type  text not null,                          -- 'deal','company','contact'
  field_key    text not null,
  view_role    text not null default 'rep'    check (view_role in ('admin','manager','rep','viewer')),
  edit_role    text not null default 'manager' check (edit_role in ('admin','manager','rep','viewer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, object_type, field_key)
);

-- ============================================================
-- 3. FIELD REGISTRY  (custom fields + values)  fields.js
-- ============================================================

-- Custom + system-overridable field definitions per object type.
-- (Canonical fields ship in code registry-seeds/*; only user-created or
-- customized ones need a row here.)
create table if not exists rally_custom_fields (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references rally_orgs(id) on delete cascade,
  object_type   text not null,                         -- contact, company, deal, quote, product, campaign, ticket, activity, invoice
  field_key     text not null,
  label         text not null,
  field_type    text not null,                         -- fields.js FIELD_TYPES id (text, currency, picklist, ...)
  section       text not null default 'Custom fields',
  field_order   int  not null default 0,
  options       jsonb,                                 -- picklist / multiPicklist / status options
  link_target   text,                                  -- for link fields
  required      boolean not null default false,
  help_text     text,
  ai_fill_policy text not null default 'suggest' check (ai_fill_policy in ('suggest','auto','off')),
  is_system     boolean not null default false,
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, object_type, field_key)
);
create index if not exists idx_custom_fields_obj on rally_custom_fields(org_id, object_type);

-- Normalized custom-field values (the queryable / auditable form of the
-- jsonb `custom` column carried on each business table). One row per
-- (record, field). value is jsonb so any field type round-trips.
create table if not exists rally_field_values (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references rally_orgs(id) on delete cascade,
  object_type   text not null,                         -- contact, company, deal, ...
  record_id     uuid not null,                         -- polymorphic FK (see note in DATA_MODEL.md)
  field_key     text not null,
  value         jsonb,
  updated_by    uuid references rally_users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, object_type, record_id, field_key)
);
create index if not exists idx_field_values_rec on rally_field_values(org_id, object_type, record_id);

-- ============================================================
-- 4. CORE CRM  (companies, contacts, deals, activities)
-- ============================================================

create table if not exists rally_companies (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references rally_orgs(id) on delete cascade,
  legacy_id       text,
  name            text not null,
  domain          text,
  website         text,
  industry        text,
  size            text,                                -- employee range bucket ('51-200')
  employees       int,
  annual_revenue  numeric(16,2),
  location        text,
  health          text not null default 'green' check (health in ('green','yellow','red')),
  health_reason   text,
  lifecycle_stage text not null default 'lead',        -- picklists LIFECYCLE_STAGES
  owner_id        uuid references rally_users(id),
  parent_company_id uuid references rally_companies(id),
  is_flagship     boolean not null default false,
  tags            text[] not null default '{}',
  custom          jsonb not null default '{}'::jsonb,  -- mirrors record.fieldValues
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_companies_org   on rally_companies(org_id);
create index if not exists idx_companies_owner on rally_companies(org_id, owner_id);

create table if not exists rally_contacts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references rally_orgs(id) on delete cascade,
  legacy_id        text,
  first_name       text not null,
  last_name        text not null default '',
  email            text,
  phone            text,
  title            text,
  company_id       uuid references rally_companies(id) on delete set null,
  owner_id         uuid references rally_users(id),
  lifecycle_stage  text not null default 'lead',
  lead_status      text,
  lead_source      text,
  lead_score       int,
  tags             text[] not null default '{}',
  last_activity_at timestamptz,
  custom           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_contacts_org     on rally_contacts(org_id);
create index if not exists idx_contacts_company on rally_contacts(org_id, company_id);
create index if not exists idx_contacts_owner   on rally_contacts(org_id, owner_id);

create table if not exists rally_deals (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references rally_orgs(id) on delete cascade,
  legacy_id        text,
  name             text not null,
  company_id       uuid references rally_companies(id) on delete set null,
  primary_contact_id uuid references rally_contacts(id) on delete set null,
  pipeline_id      text not null default 'default',
  stage            text not null default 'lead',       -- soft FK -> rally_pipeline_stages.stage_key
  status           text not null default 'open' check (status in ('open','won','lost')),
  value            numeric(16,2) not null default 0 check (value >= 0),
  probability      int not null default 0 check (probability between 0 and 100),
  forecast_category text not null default 'pipeline',  -- picklists FORECAST_CATEGORIES
  close_date       date,
  owner_id         uuid references rally_users(id),
  lead_source      text,
  campaign_id      uuid,                                -- soft FK -> rally_campaigns (set FK below optionally)
  next_step        text,
  next_step_due_at timestamptz,
  win_reason       text,
  loss_reason      text,
  tags             text[] not null default '{}',
  custom           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_deals_org     on rally_deals(org_id);
create index if not exists idx_deals_company on rally_deals(org_id, company_id);
create index if not exists idx_deals_owner   on rally_deals(org_id, owner_id);
create index if not exists idx_deals_stage   on rally_deals(org_id, stage);
create index if not exists idx_deals_status  on rally_deals(org_id, status);

-- deal.contactIds[] normalized (a deal can involve many contacts).
create table if not exists rally_deal_contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  deal_id     uuid not null references rally_deals(id) on delete cascade,
  contact_id  uuid not null references rally_contacts(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (deal_id, contact_id)
);
create index if not exists idx_deal_contacts_deal on rally_deal_contacts(deal_id);

create table if not exists rally_activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references rally_orgs(id) on delete cascade,
  legacy_id     text,
  type          text not null default 'task' check (type in ('task','call','email','meeting','note')),
  subject       text not null,
  body          text not null default '',
  due_at        timestamptz,
  done          boolean not null default false,
  related_type  text,                                  -- 'deal' | 'contact' | 'company' (polymorphic)
  related_id    uuid,
  company_id    uuid references rally_companies(id) on delete set null,
  owner_id      uuid references rally_users(id),
  is_system     boolean not null default false,
  custom        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_activities_org     on rally_activities(org_id);
create index if not exists idx_activities_owner   on rally_activities(org_id, owner_id, done);
create index if not exists idx_activities_related on rally_activities(org_id, related_type, related_id);

-- ============================================================
-- 5. DEAL DEPTH  (line items, stakeholders, competitors, close plan)
--    store-depth.js dealExtras
-- ============================================================

create table if not exists rally_deal_line_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  deal_id     uuid not null references rally_deals(id) on delete cascade,
  product_id  uuid,                                    -- soft FK -> rally_products
  name        text not null,
  qty         numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  term        int not null default 12,                 -- months (12 for annual seat, 1 one-time)
  discount    numeric(5,2) not null default 0 check (discount between 0 and 100),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_deal_lines_deal on rally_deal_line_items(deal_id);

create table if not exists rally_deal_stakeholders (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  deal_id     uuid not null references rally_deals(id) on delete cascade,
  contact_id  uuid not null references rally_contacts(id) on delete cascade,
  role        text not null default 'Influencer',      -- store-depth STAKEHOLDER_ROLES
  influence   text not null default 'medium' check (influence in ('high','medium','low')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (deal_id, contact_id)
);
create index if not exists idx_deal_stake_deal on rally_deal_stakeholders(deal_id);

create table if not exists rally_deal_competitors (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  deal_id     uuid not null references rally_deals(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (deal_id, name)
);

create table if not exists rally_deal_close_plan (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  deal_id     uuid not null references rally_deals(id) on delete cascade,
  label       text not null,
  done        boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_deal_closeplan_deal on rally_deal_close_plan(deal_id);

-- ============================================================
-- 6. CATALOG + REVENUE  (products, quotes, quote lines, quote events, invoices)
--    store-ext.js + store-quote.js
-- ============================================================

create table if not exists rally_products (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  sku         text,
  name        text not null,
  category    text,
  price       numeric(14,2) not null default 0,
  billing     text,                                    -- 'monthly/seat', 'one-time', 'monthly'
  active      boolean not null default true,
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_products_org on rally_products(org_id);

create table if not exists rally_quotes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  legacy_id    text,
  number       text not null,                          -- 'Q-2401'
  company_id   uuid references rally_companies(id) on delete set null,
  deal_id      uuid references rally_deals(id) on delete set null,
  owner_id     uuid references rally_users(id),
  amount       numeric(16,2) not null default 0,       -- cached grand total
  seats        int not null default 0,
  status       text not null default 'draft' check (status in ('draft','sent','accepted','expired')),
  terms        text,
  notes        text,
  shipping     numeric(14,2) not null default 0,
  expires_at   timestamptz,
  custom       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_quotes_org     on rally_quotes(org_id);
create index if not exists idx_quotes_company on rally_quotes(org_id, company_id);

create table if not exists rally_quote_lines (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  quote_id    uuid not null references rally_quotes(id) on delete cascade,
  product_id  uuid,                                    -- soft FK -> rally_products
  name        text not null default 'Custom line',
  description text not null default '',
  qty         numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  discount    numeric(5,2) not null default 0 check (discount between 0 and 100),
  tax         numeric(5,2) not null default 0 check (tax between 0 and 100),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_quote_lines_quote on rally_quote_lines(quote_id);

create table if not exists rally_quote_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  quote_id    uuid not null references rally_quotes(id) on delete cascade,
  status      text not null,
  who         text,
  note        text,
  at          timestamptz not null default now()
);
create index if not exists idx_quote_events_quote on rally_quote_events(quote_id);

create table if not exists rally_invoices (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  legacy_id    text,
  number       text not null,                          -- 'INV-10500'
  company_id   uuid references rally_companies(id) on delete set null,
  deal_id      uuid references rally_deals(id) on delete set null,
  amount       numeric(16,2) not null default 0,
  status       text not null default 'draft' check (status in ('draft','open','paid','overdue')),
  issued_at    timestamptz,
  due_at       timestamptz,
  paid_at      timestamptz,
  custom       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_invoices_org     on rally_invoices(org_id);
create index if not exists idx_invoices_status  on rally_invoices(org_id, status);

-- ============================================================
-- 7. MARKETING  (leads, campaigns, sequences)
-- ============================================================

-- Top-of-funnel leads (store-ext leads). Kept distinct from contacts to
-- honor the current model; the single-entity path is a promote-to-contact
-- migration documented in DATA_MODEL.md.
create table if not exists rally_leads (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  first_name  text not null,
  last_name   text not null default '',
  company     text,
  title       text,
  email       text,
  source      text,
  status      text not null default 'new' check (status in ('new','working','qualified','unqualified')),
  score       int not null default 0,
  owner_id    uuid references rally_users(id),
  converted_contact_id uuid references rally_contacts(id) on delete set null,
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_leads_org on rally_leads(org_id, status);

create table if not exists rally_campaigns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  name        text not null,
  channel     text,
  status      text not null default 'draft' check (status in ('draft','scheduled','active','completed','archived')),
  sent        int not null default 0,
  opened      int not null default 0,
  clicked     int not null default 0,
  leads       int not null default 0,
  revenue     numeric(16,2) not null default 0,
  budget      numeric(16,2) not null default 0,
  start_at    timestamptz,
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_campaigns_org on rally_campaigns(org_id);

create table if not exists rally_sequences (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  name        text not null,
  steps       int not null default 0,
  active      boolean not null default true,
  enrolled    int not null default 0,
  open_rate   int not null default 0,
  reply_rate  int not null default 0,
  meetings    int not null default 0,
  definition  jsonb not null default '{}'::jsonb,      -- per-step config when the builder ships
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_sequences_org on rally_sequences(org_id);

-- ============================================================
-- 8. SERVICE  (tickets)
-- ============================================================

create table if not exists rally_tickets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  legacy_id    text,
  number       text not null,
  subject      text not null,
  company_id   uuid references rally_companies(id) on delete set null,
  contact_id   uuid references rally_contacts(id) on delete set null,
  priority     text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status       text not null default 'open' check (status in ('open','pending','solved')),
  assignee_id  uuid references rally_users(id),
  custom       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_tickets_org on rally_tickets(org_id, status);

-- ============================================================
-- 9. AUTOMATION  (automations + run log)  automations.js
--    (store-ext "workflows" is a display summary of these; folded in.)
-- ============================================================

create table if not exists rally_automations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  legacy_id    text,
  name         text not null,
  description  text,
  active       boolean not null default true,
  trigger      jsonb not null default '{}'::jsonb,     -- { type, config }
  conditions   jsonb not null default '[]'::jsonb,     -- [{ field, op, value }]
  actions      jsonb not null default '[]'::jsonb,     -- [{ type, config }]
  runs         int not null default 0,
  last_run     timestamptz,
  created_by   uuid references rally_users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_automations_org on rally_automations(org_id);

create table if not exists rally_automation_runs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references rally_orgs(id) on delete cascade,
  automation_id  uuid references rally_automations(id) on delete set null,
  automation_name text,
  trigger        text,
  subject_label  text,
  subject_id     text,
  actions_run    jsonb not null default '[]'::jsonb,
  result         text not null default 'fired' check (result in ('fired','partial','failed','test')),
  at             timestamptz not null default now()
);
create index if not exists idx_automation_runs_org on rally_automation_runs(org_id, at desc);

-- ============================================================
-- 10. PROJECTS  (boards, groups, tasks, subitems)  store-depth.js
-- ============================================================

create table if not exists rally_projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  name        text not null,
  color       text not null default '#5b4bf5',
  owner_id    uuid references rally_users(id),
  company_id  uuid references rally_companies(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_projects_org on rally_projects(org_id);

create table if not exists rally_project_groups (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  project_id  uuid not null references rally_projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#5b4bf5',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_project_groups_project on rally_project_groups(project_id);

create table if not exists rally_tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  legacy_id   text,
  project_id  uuid not null references rally_projects(id) on delete cascade,
  group_id    uuid references rally_project_groups(id) on delete set null,
  title       text not null,
  status      text not null default 'todo' check (status in ('todo','doing','blocked','done')),
  priority    text not null default 'medium' check (priority in ('low','medium','high')),
  start_date  timestamptz,
  due         timestamptz,
  progress    int not null default 0 check (progress between 0 and 100),
  number      int,
  tags        text[] not null default '{}',
  notes       text not null default '',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_tasks_project on rally_tasks(project_id);
create index if not exists idx_tasks_org on rally_tasks(org_id);

-- task.assigneeIds[] normalized (a task can have several assignees).
create table if not exists rally_task_assignees (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  task_id     uuid not null references rally_tasks(id) on delete cascade,
  user_id     uuid not null references rally_users(id) on delete cascade,
  is_primary  boolean not null default false,
  unique (task_id, user_id)
);
create index if not exists idx_task_assignees_task on rally_task_assignees(task_id);

create table if not exists rally_subitems (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  task_id     uuid not null references rally_tasks(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  assignee_id uuid references rally_users(id),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_subitems_task on rally_subitems(task_id);

-- ============================================================
-- 11. PLATFORM  (audit log, saved views, mailboxes, notifications)
-- ============================================================

-- Append-only org-wide changelog (audit.js). No update / delete in RLS.
create table if not exists rally_audit_log (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  object_type  text not null,
  record_id    uuid,
  field        text,
  old_value    jsonb,
  new_value    jsonb,
  who          text,                                   -- user name / 'system' / 'ai' / 'automation:<id>'
  actor_id     uuid references rally_users(id),
  at           timestamptz not null default now()
);
create index if not exists idx_audit_record on rally_audit_log(org_id, object_type, record_id, at desc);

-- Saved / executable views (views.js). system views ship in code; only
-- user-created + forked views need a row. owner_id null => shared/org view.
create table if not exists rally_saved_views (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references rally_orgs(id) on delete cascade,
  object_type text not null,
  name        text not null,
  owner_id    uuid references rally_users(id),         -- null = shared with the org
  is_shared   boolean not null default false,
  filters     jsonb not null default '[]'::jsonb,
  columns     jsonb,
  sort        jsonb,
  viz         text not null default 'table',
  group_by    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_saved_views_obj on rally_saved_views(org_id, object_type);

-- Connected email accounts (mailboxes.js). Per user. Secrets go in a
-- vaulted jsonb (do not store raw SMTP passwords; store a vault ref).
create table if not exists rally_mailboxes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  user_id      uuid not null references rally_users(id) on delete cascade,
  provider     text not null check (provider in ('google','microsoft','smtp')),
  email        text not null,
  display_name text,
  status       text not null default 'connected' check (status in ('connected','error','disconnected')),
  capabilities jsonb not null default '{}'::jsonb,     -- { send, read, calendar }
  smtp         jsonb,                                  -- host/port/username + vault ref (never raw password)
  scopes       jsonb,
  sync         jsonb not null default '{}'::jsonb,     -- { logEmails, logMeetings, direction }
  is_default   boolean not null default false,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, provider, email)
);
create index if not exists idx_mailboxes_user on rally_mailboxes(user_id);

-- In-app notifications (notify_owner action + system alerts). Per user.
create table if not exists rally_notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references rally_orgs(id) on delete cascade,
  user_id      uuid not null references rally_users(id) on delete cascade,
  type         text not null default 'info',
  title        text not null,
  body         text,
  related_type text,
  related_id   uuid,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on rally_notifications(user_id, is_read, created_at desc);

-- Optional hard FK for deals.campaign_id now that rally_campaigns exists.
do $$ begin
  alter table rally_deals
    add constraint rally_deals_campaign_fk
    foreign key (campaign_id) references rally_campaigns(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ============================================================
-- END schema.sql
-- ============================================================
