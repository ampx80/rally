-- ============================================================
-- RALLY FUNCTIONS + TRIGGERS + RPCs
-- ============================================================
-- Run AFTER schema.sql and BEFORE rls.sql (rls.sql references the
-- membership helpers defined here). ASCII only, no em-dash / en-dash.
--
-- Contents
--   A. updated_at trigger (attached to every mutable table)
--   B. audit trigger (writes rally_audit_log on core-record changes)
--   C. tenancy helpers (SECURITY DEFINER, used by RLS and the app)
--   D. onboarding trigger (auto-create rally_users on auth signup)
--   E. business RPCs (current_org, pipeline_summary)
-- ============================================================

-- ------------------------------------------------------------
-- A. updated_at maintenance
-- ------------------------------------------------------------
create or replace function rally_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach the trigger to every table that has an updated_at column.
do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and c.table_name like 'rally_%'
      and c.table_name <> 'rally_waitlist'
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on %I
         for each row execute function rally_set_updated_at();', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- B. Audit trigger  (generalizes store-side logChange to the DB)
--    Writes one rally_audit_log row per INSERT / UPDATE / DELETE on the
--    core records. Field-level diffing stays in the app (audit.js) for
--    rich per-field history; this trigger guarantees a durable floor even
--    for writes that bypass the app writers.
-- ------------------------------------------------------------
create or replace function rally_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_rec uuid;
begin
  if (tg_op = 'DELETE') then
    v_org := old.org_id; v_rec := old.id;
  else
    v_org := new.org_id; v_rec := new.id;
  end if;

  insert into rally_audit_log (org_id, object_type, record_id, field, old_value, new_value, who, actor_id, at)
  values (
    v_org,
    replace(tg_table_name, 'rally_', ''),
    v_rec,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    coalesce((select name from rally_users where id = auth.uid()), 'system'),
    auth.uid(),
    now()
  );

  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;

-- Attach the audit trigger to the core mutable records only (not to the
-- append-only log itself, nor to high-churn config).
do $$
declare
  t text;
begin
  foreach t in array array[
    'rally_companies','rally_contacts','rally_deals','rally_activities',
    'rally_quotes','rally_invoices','rally_tickets','rally_leads',
    'rally_projects','rally_tasks','rally_automations'
  ]
  loop
    execute format('drop trigger if exists trg_audit on %I;', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on %I
         for each row execute function rally_audit_row();', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- C. Tenancy helpers  (the primitives RLS is built on)
--    SECURITY DEFINER so they read rally_memberships WITHOUT triggering
--    the memberships RLS policy (prevents infinite recursion).
-- ------------------------------------------------------------

-- Every org_id the current auth user belongs to.
create or replace function rally_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from rally_memberships
  where user_id = auth.uid() and status = 'active';
$$;

-- Is the current user a member of this org?
create or replace function rally_is_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from rally_memberships
    where user_id = auth.uid() and org_id = p_org and status = 'active'
  );
$$;

-- Does this org already have any membership row? Used only by the
-- memberships bootstrap INSERT policy so it never references its own table
-- inside a policy expression (which would re-apply RLS and can recurse).
create or replace function rally_org_has_members(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from rally_memberships where org_id = p_org);
$$;

-- Numeric rank of the current user's role in this org (admin 4 .. viewer 1,
-- 0 if not a member). RLS compares against this.
create or replace function rally_role_rank(p_org uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(
    case role
      when 'admin'   then 4
      when 'manager' then 3
      when 'rep'     then 2
      when 'viewer'  then 1
      else 0
    end), 0)
  from rally_memberships
  where user_id = auth.uid() and org_id = p_org and status = 'active';
$$;

-- ------------------------------------------------------------
-- D. Auth onboarding  (mirror auth.users into rally_users)
--    A new Supabase auth signup gets a rally_users profile row so the app
--    can attach a display name / quota. Org membership is created by the
--    invite flow or the "create workspace" RPC, not here.
-- ------------------------------------------------------------
create or replace function rally_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into rally_users (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_rally_new_user on auth.users;
create trigger trg_rally_new_user
  after insert on auth.users
  for each row execute function rally_handle_new_user();

-- ------------------------------------------------------------
-- E. Business RPCs
-- ------------------------------------------------------------

-- The caller's "current" org. Convenience for a single-workspace user;
-- multi-workspace clients pass org_id explicitly instead. Returns the
-- most-recently-joined active org.
create or replace function rally_current_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from rally_memberships
  where user_id = auth.uid() and status = 'active'
  order by created_at desc
  limit 1;
$$;

-- Pipeline summary for one org: per-stage deal count + open value +
-- weighted forecast. Mirrors store.js dealsByStage / pipelineValue /
-- weightedForecast so the dashboard can read it in one round trip.
-- RLS still applies to the underlying select because the function is
-- INVOKER for the data read (it only uses SECURITY DEFINER-free access);
-- callers see only orgs they belong to via the membership guard.
create or replace function rally_pipeline_summary(p_org uuid)
returns table (
  stage_key     text,
  stage_name    text,
  sort_order    int,
  deal_count    bigint,
  open_value    numeric,
  weighted_value numeric
)
language sql
stable
as $$
  select
    s.stage_key,
    s.name,
    s.sort_order,
    count(d.id) filter (where d.status = 'open')                              as deal_count,
    coalesce(sum(d.value) filter (where d.status = 'open'), 0)                as open_value,
    coalesce(sum(d.value * d.probability / 100.0) filter (where d.status = 'open'), 0) as weighted_value
  from rally_pipeline_stages s
  left join rally_deals d
    on d.org_id = s.org_id and d.stage = s.stage_key
  where s.org_id = p_org
    and rally_is_member(p_org)
  group by s.stage_key, s.name, s.sort_order
  order by s.sort_order;
$$;

-- ============================================================
-- END functions.sql
-- ============================================================
