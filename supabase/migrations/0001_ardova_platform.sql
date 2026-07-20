-- ============================================================
-- Ardova platform schema - multi-tenant foundation for every engine.
--
-- Design:
--   * org_id tenancy on every app table + a memberships table mapping
--     auth.uid() -> org_id -> role. RLS scopes rows to the caller's orgs.
--   * Server routes (api/*) use the SERVICE ROLE key, which BYPASSES RLS, so
--     the email/payments/cron tables work for the backend regardless of RLS.
--   * The client (anon/authenticated) is fenced by RLS to its own org rows.
--   * Column names for the server-referenced tables (rally_email_log,
--     rally_email_events, rally_email_unsubscribes, rally_email_excluded,
--     rally_payment_events, rally_sequence_outbox, rally_scheduled_sends,
--     rally_cron_heartbeat) match exactly what api/_lib-email.js,
--     api/resend-webhook.js, api/marketing-cron.js, and api/payments-webhook.js
--     already read/write - so they light up the moment the keys are set.
--
-- Apply: psql "$DATABASE_URL" -f supabase/migrations/0001_ardova_platform.sql
--   (or paste into the Supabase SQL editor). Idempotent: uses IF NOT EXISTS.
-- ASCII only. NO em-dash / en-dash.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tenancy ----------
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null,               -- auth.users.id
  role text not null default 'member', -- owner | admin | manager | member | viewer
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists memberships_user_idx on memberships(user_id);

-- Orgs a caller belongs to. SECURITY DEFINER so RLS policies can call it
-- without recursing into memberships' own RLS.
create or replace function current_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid()
$$;

-- Helper macro pattern used below:
--   using (org_id in (select current_org_ids()))

-- ---------- CRM core ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, domain text, industry text, size text, location text,
  owner_id uuid, health text, lifecycle_stage text,
  field_values jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_org_idx on companies(org_id);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  first_name text, last_name text, email text, phone text, title text,
  company_id uuid references companies(id) on delete set null,
  owner_id uuid, tags text[] default '{}', lifecycle_stage text,
  source text, field_values jsonb not null default '{}',
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_org_idx on contacts(org_id);
create index if not exists contacts_email_idx on contacts(org_id, lower(email));

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, company_id uuid references companies(id) on delete set null,
  contact_ids uuid[] default '{}', value numeric not null default 0,
  stage text, probability numeric, status text default 'open',
  close_date date, owner_id uuid, pipeline_id text,
  field_values jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deals_org_idx on deals(org_id);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  type text, subject text, body text, due_at timestamptz, done boolean default false,
  related_type text, related_id uuid, company_id uuid, owner_id uuid, system boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists activities_org_idx on activities(org_id);

-- ---------- engine app tables (org-scoped) ----------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, type text default 'email', subject text, body text,
  design jsonb, design_mode text default 'text', audience text, custom_list text,
  status text default 'draft', scheduled_at timestamptz, sent_at timestamptz,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_org_idx on campaigns(org_id);

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, kind text default 'static', segment jsonb, member_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists lists_org_idx on lists(org_id);

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, slug text, fields jsonb not null default '[]', steps jsonb,
  settings jsonb not null default '{}', status text default 'draft',
  analytics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forms_org_idx on forms(org_id);

create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  form_id uuid references forms(id) on delete cascade,
  contact_id uuid, values jsonb not null default '{}', meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_form_idx on form_submissions(form_id);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, status text default 'draft', trigger jsonb, steps jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automations_org_idx on automations(org_id);

create table if not exists automation_enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  automation_id uuid references automations(id) on delete cascade,
  entity_type text, entity_id uuid, status text default 'active', cursor int default 0,
  context jsonb not null default '{}', history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enrollments_automation_idx on automation_enrollments(automation_id);

create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, slug text, design jsonb, form_id uuid, status text default 'draft',
  views int default 0, conversions int default 0, seo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists landing_org_idx on landing_pages(org_id);

create table if not exists funnels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, steps jsonb not null default '[]', status text default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists funnels_org_idx on funnels(org_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, definition jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_org_idx on reports(org_id);

create table if not exists dashboards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, tiles jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists dashboards_org_idx on dashboards(org_id);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, sku text, price numeric default 0, currency text default 'usd',
  billing text default 'one_time', interval text, active boolean default true,
  created_at timestamptz not null default now()
);
create index if not exists products_org_idx on products(org_id);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  number text, contact_id uuid, company_id uuid, line_items jsonb not null default '[]',
  subtotal numeric default 0, tax numeric default 0, total numeric default 0,
  status text default 'draft', due_date date, paid_at timestamptz, stripe_session_id text,
  created_at timestamptz not null default now()
);
create index if not exists invoices_org_idx on invoices(org_id);

-- ---------- server-only tables (service role; RLS on, no anon policy) ----------
-- Matches api/_lib-email.js + api/resend-webhook.js EXACTLY.
create table if not exists rally_email_log (
  id bigserial primary key,
  idempotency_key text not null,
  org_id uuid,
  campaign_id text,
  recipient text,
  subject text,
  category text,
  status text not null default 'queued',   -- queued | sent | failed
  resend_id text,
  error_message text,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists rally_email_log_idem_uq on rally_email_log(idempotency_key);
create index if not exists rally_email_log_resend_idx on rally_email_log(resend_id);

create table if not exists rally_email_events (
  id bigserial primary key,
  resend_id text, org_id uuid, email text, type text, meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rally_email_events_email_idx on rally_email_events(lower(email));

create table if not exists rally_email_unsubscribes (
  id bigserial primary key,
  email text not null, org_id uuid, campaign_id text, reason text,
  unsubscribed_at timestamptz not null default now()
);
create unique index if not exists rally_email_unsub_uq on rally_email_unsubscribes(lower(email), coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(campaign_id, ''));

create table if not exists rally_email_excluded (
  email text primary key, reason text, created_at timestamptz not null default now()
);

create table if not exists rally_sequence_outbox (
  id bigserial primary key,
  org_id uuid, recipient text not null, subject text, body_html text, body_text text,
  campaign_id text, sequence_id text, step_index int,
  send_after timestamptz not null default now(), status text not null default 'pending',
  attempts int default 0, error_message text, sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists rally_seq_outbox_due_idx on rally_sequence_outbox(status, send_after);

create table if not exists rally_scheduled_sends (
  id bigserial primary key,
  org_id uuid, campaign_id text, recipient text not null, subject text,
  design_html text, body_text text,
  send_after timestamptz not null default now(), status text not null default 'pending',
  sent_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists rally_sched_due_idx on rally_scheduled_sends(status, send_after);

create table if not exists rally_cron_heartbeat (
  id bigserial primary key, job text not null, detail text, at timestamptz not null default now()
);

create table if not exists rally_payment_events (
  id bigserial primary key,
  org_id uuid, type text, stripe_session_id text, stripe_invoice_id text,
  invoice_id text, email text, amount numeric, currency text, status text,
  raw jsonb, created_at timestamptz not null default now()
);
create index if not exists rally_payment_events_created_idx on rally_payment_events(created_at);

-- ============================================================
-- RLS
-- ============================================================
-- App tables: enable RLS + org-scoped policy for authenticated callers.
do $$
declare t text;
begin
  foreach t in array array[
    'companies','contacts','deals','activities','campaigns','lists','forms',
    'form_submissions','automations','automation_enrollments','landing_pages',
    'funnels','reports','dashboards','products','invoices'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$
      create policy %1$s_org_rw on %1$I
        for all to authenticated
        using (org_id in (select current_org_ids()))
        with check (org_id in (select current_org_ids()));
    $p$, t);
  end loop;
exception when duplicate_object then null;
end $$;

-- memberships + orgs: a caller sees only their own memberships / orgs.
alter table memberships enable row level security;
do $$ begin
  create policy memberships_self on memberships for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

alter table orgs enable row level security;
do $$ begin
  create policy orgs_member on orgs for select to authenticated using (id in (select current_org_ids()));
exception when duplicate_object then null; end $$;

-- Server-only tables: RLS ON with NO anon/authenticated policy => only the
-- service role (used by api/*) can touch them. Fenced from the browser.
do $$
declare t text;
begin
  foreach t in array array[
    'rally_email_log','rally_email_events','rally_email_unsubscribes','rally_email_excluded',
    'rally_sequence_outbox','rally_scheduled_sends','rally_cron_heartbeat','rally_payment_events'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ---------- qualifying leads (early release) ----------
-- Every /get-started submission. urgency_score is a first-class column so the
-- pipeline sorts by how badly they want out of Salesforce. Written by
-- api/prequalify.js (service role). RLS on, no anon policy.
create table if not exists rally_prequal (
  id bigserial primary key,
  name text, email text, phone text, company text,
  urgency_score int,          -- 1-10, the hero question
  route text,                 -- hot | nurture | waitlist
  current_tool text,          -- salesforce | hubspot | gohighlevel | zoho | spreadsheets | other
  seats text,
  pain text,                  -- their words on why they want to leave (gold)
  lead_source text,
  source_url text,
  status text default 'new',  -- new | booked | called | won | lost
  created_at timestamptz not null default now()
);
create index if not exists rally_prequal_urgency_idx on rally_prequal(urgency_score desc, created_at desc);
alter table rally_prequal enable row level security;

-- Public hosted surfaces (hosted forms / landing pages) are served through the
-- service-role api layer, so no anon RLS policy is granted here on purpose.
