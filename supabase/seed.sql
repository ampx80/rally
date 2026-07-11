-- ============================================================
-- RALLY DEMO SEED  (one org, a small but alive book of business)
-- ============================================================
-- Run LAST (after schema.sql, functions.sql, rls.sql). Gives a fresh
-- tenant a non-empty workspace: 1 org, a revenue team, pipeline config,
-- and a handful of linked records across every module. Fixed uuids +
-- ON CONFLICT DO NOTHING make it safe to re-run.
--
-- Auth note: rally_users.id references auth.users(id). This seed inserts
-- matching auth.users rows (the standard Supabase seeding pattern; run it
-- in the SQL editor or via psql as the service role). If your auth.users
-- column set differs by version, instead sign up one real user and swap
-- that uuid in below. Passwords here are placeholders; sign-in for demo
-- users should go through a real magic-link / OAuth in production.
--
-- All uuids below are hex-only (0-9 a-f). ASCII only, no em/en dash.
-- ============================================================

-- id map
--   ORG   00000000-0000-0000-0000-0000000000aa
--   USERS 11111111-...-1101 (Jordan) .. 1106 (Elena, admin/owner)
--   PROD  ...-00000000f001 .. f004
--   CO    ...-00000000c001 .. c003
--   CT    ...-0000000cc001 .. cc003
--   DEAL  ...-0000000d0001 .. d0002
--   QUOTE ...-0000000ee001
--   PROJ  ...-0000000fa001 / GROUPS fb001 fb002 / TASK fc001

-- ------------------------------------------------------------
-- 0. Auth users  (demo identities)
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111101','authenticated','authenticated','jordan@rally.app', crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Jordan Avery"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111102','authenticated','authenticated','simone@rally.app', crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Simone Diaz"}',  '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111103','authenticated','authenticated','theo@rally.app',   crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Theo Bennett"}',  '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111104','authenticated','authenticated','nina@rally.app',   crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Nina Kapoor"}',   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111105','authenticated','authenticated','marcus@rally.app', crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Marcus Hale"}',   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111106','authenticated','authenticated','elena@rally.app',  crypt('demo-password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Elena Ross"}',    '', '', '', '')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 1. Org + user profiles + memberships
-- ------------------------------------------------------------
insert into rally_orgs (id, name, slug, plan, home_currency)
values ('00000000-0000-0000-0000-0000000000aa', 'Rally Demo Co', 'rally-demo', 'enterprise', 'USD')
on conflict (id) do nothing;

insert into rally_users (id, email, name, title, quota, legacy_id) values
  ('11111111-1111-1111-1111-111111111101','jordan@rally.app','Jordan Avery','Senior Account Executive', 900000,'u_1'),
  ('11111111-1111-1111-1111-111111111102','simone@rally.app','Simone Diaz','Account Executive',        750000,'u_2'),
  ('11111111-1111-1111-1111-111111111103','theo@rally.app','Theo Bennett','Account Executive',          750000,'u_3'),
  ('11111111-1111-1111-1111-111111111104','nina@rally.app','Nina Kapoor','Enterprise AE',              1200000,'u_4'),
  ('11111111-1111-1111-1111-111111111105','marcus@rally.app','Marcus Hale','Account Executive',         700000,'u_5'),
  ('11111111-1111-1111-1111-111111111106','elena@rally.app','Elena Ross','VP of Revenue',                    0,'u_6')
on conflict (id) do nothing;

insert into rally_memberships (org_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111106','admin'),
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111101','rep'),
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111102','rep'),
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111103','rep'),
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111104','rep'),
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111105','viewer')
on conflict (org_id, user_id) do nothing;

-- ------------------------------------------------------------
-- 2. Pipeline stages  (store.js STAGES)
-- ------------------------------------------------------------
insert into rally_pipeline_stages (org_id, stage_key, name, sort_order, probability, stage_type) values
  ('00000000-0000-0000-0000-0000000000aa','lead','Lead',1,10,'open'),
  ('00000000-0000-0000-0000-0000000000aa','qualified','Qualified',2,25,'open'),
  ('00000000-0000-0000-0000-0000000000aa','discovery','Discovery',3,45,'open'),
  ('00000000-0000-0000-0000-0000000000aa','proposal','Proposal',4,65,'open'),
  ('00000000-0000-0000-0000-0000000000aa','negotiation','Negotiation',5,85,'open'),
  ('00000000-0000-0000-0000-0000000000aa','won','Closed Won',6,100,'won'),
  ('00000000-0000-0000-0000-0000000000aa','lost','Closed Lost',7,0,'lost')
on conflict (org_id, pipeline_id, stage_key) do nothing;

-- ------------------------------------------------------------
-- 3. Products  (store-ext PRODUCTS, a subset)
-- ------------------------------------------------------------
insert into rally_products (id, org_id, sku, name, category, price, billing, legacy_id) values
  ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-0000000000aa','RLY-1000','Rally CRM','Platform',90,'monthly/seat','p_1'),
  ('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-0000000000aa','RLY-1001','Rally CRM Enterprise','Platform',165,'monthly/seat','p_2'),
  ('00000000-0000-0000-0000-00000000f003','00000000-0000-0000-0000-0000000000aa','RLY-1002','Rook AI Operator','AI',60,'monthly/seat','p_3'),
  ('00000000-0000-0000-0000-00000000f004','00000000-0000-0000-0000-0000000000aa','RLY-1010','Implementation - Enterprise','Services',45000,'one-time','p_12')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. Companies + contacts  (flagship Vertex Robotics + 2 accounts)
-- ------------------------------------------------------------
insert into rally_companies (id, org_id, legacy_id, name, domain, industry, size, location, health, lifecycle_stage, owner_id, is_flagship) values
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000aa','co_flagship','Vertex Robotics','vertexrobotics.com','Manufacturing','1001-5000','Austin, TX','green','opportunity','11111111-1111-1111-1111-111111111101',true),
  ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000aa','co_2','Cascade Health','cascadehealth.com','Healthcare','501-1000','Denver, CO','yellow','customer','11111111-1111-1111-1111-111111111104',false),
  ('00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-0000000000aa','co_3','Northwind Logistics','northwindlogistics.com','Logistics','201-500','Chicago, IL','green','sql','11111111-1111-1111-1111-111111111102',false)
on conflict (id) do nothing;

insert into rally_contacts (id, org_id, legacy_id, first_name, last_name, email, title, company_id, owner_id, lifecycle_stage, tags) values
  ('00000000-0000-0000-0000-0000000cc001','00000000-0000-0000-0000-0000000000aa','c_1','Maria','Chen','maria.chen@vertexrobotics.com','Chief Revenue Officer','00000000-0000-0000-0000-00000000c001','11111111-1111-1111-1111-111111111101','opportunity','{champion,"economic buyer"}'),
  ('00000000-0000-0000-0000-0000000cc002','00000000-0000-0000-0000-0000000000aa','c_2','David','Patel','david.patel@vertexrobotics.com','VP Engineering','00000000-0000-0000-0000-00000000c001','11111111-1111-1111-1111-111111111101','opportunity','{technical}'),
  ('00000000-0000-0000-0000-0000000cc003','00000000-0000-0000-0000-0000000000aa','c_3','Sarah','Kim','sarah.kim@cascadehealth.com','COO','00000000-0000-0000-0000-00000000c002','11111111-1111-1111-1111-111111111104','customer','{"decision maker"}')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 5. Deals  (flagship negotiation + one qualified)  + linked contacts
-- ------------------------------------------------------------
insert into rally_deals (id, org_id, legacy_id, name, company_id, primary_contact_id, stage, status, value, probability, forecast_category, close_date, owner_id, next_step) values
  ('00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000000aa','d_flagship','Vertex Robotics - Enterprise platform rollout','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000cc001','negotiation','open',420000,85,'commit', current_date + 21,'11111111-1111-1111-1111-111111111101','Send redlined MSA to legal'),
  ('00000000-0000-0000-0000-0000000d0002','00000000-0000-0000-0000-0000000000aa','d_2','Northwind Logistics - New logo','00000000-0000-0000-0000-00000000c003',null,'qualified','open',75000,25,'best_case', current_date + 40,'11111111-1111-1111-1111-111111111102','Schedule discovery call')
on conflict (id) do nothing;

insert into rally_deal_contacts (org_id, deal_id, contact_id, is_primary) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000cc001',true),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000cc002',false)
on conflict (deal_id, contact_id) do nothing;

insert into rally_deal_line_items (org_id, deal_id, product_id, name, qty, unit_price, term, discount) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-00000000f002','Rally CRM Enterprise',180,165,12,10),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-00000000f003','Rook AI Operator',180,60,12,0);

insert into rally_deal_stakeholders (org_id, deal_id, contact_id, role, influence) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000cc001','Champion','high'),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000cc002','Technical Evaluator','medium')
on conflict (deal_id, contact_id) do nothing;

-- ------------------------------------------------------------
-- 6. Activities  (my-day tasks on the flagship)
-- ------------------------------------------------------------
insert into rally_activities (org_id, type, subject, due_at, done, related_type, related_id, company_id, owner_id) values
  ('00000000-0000-0000-0000-0000000000aa','call','Negotiation call with Vertex Robotics', now(), false,'deal','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-00000000c001','11111111-1111-1111-1111-111111111101'),
  ('00000000-0000-0000-0000-0000000000aa','task','Send redlined MSA to Vertex legal', now() + interval '1 day', false,'deal','00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-00000000c001','11111111-1111-1111-1111-111111111101');

-- ------------------------------------------------------------
-- 7. Quote + lines + events + invoice
-- ------------------------------------------------------------
insert into rally_quotes (id, org_id, number, company_id, deal_id, owner_id, amount, seats, status, expires_at) values
  ('00000000-0000-0000-0000-0000000ee001','00000000-0000-0000-0000-0000000000aa','Q-2401','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000d0001','11111111-1111-1111-1111-111111111101',486000,180,'sent', now() + interval '20 days')
on conflict (id) do nothing;

insert into rally_quote_lines (org_id, quote_id, product_id, name, qty, unit_price, discount, tax) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000ee001','00000000-0000-0000-0000-00000000f002','Rally CRM Enterprise (annual)',180,1980,10,0),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000ee001','00000000-0000-0000-0000-00000000f003','Rook AI Operator (annual)',180,720,0,0);

insert into rally_quote_events (org_id, quote_id, status, who, note) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000ee001','draft','Jordan Avery','Quote created'),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000ee001','sent','Jordan Avery','Sent to customer');

insert into rally_invoices (org_id, number, company_id, deal_id, amount, status, issued_at, due_at) values
  ('00000000-0000-0000-0000-0000000000aa','INV-10500','00000000-0000-0000-0000-00000000c002',null,42000,'open', now() - interval '10 days', now() + interval '20 days');

-- ------------------------------------------------------------
-- 8. Marketing  (lead, campaign, sequence)
-- ------------------------------------------------------------
insert into rally_leads (org_id, first_name, last_name, company, title, email, source, status, score, owner_id) values
  ('00000000-0000-0000-0000-0000000000aa','Alex','Cohen','Brightwave Labs','RevOps Lead','alex@brightwavelabs.com','Inbound','qualified',88,'11111111-1111-1111-1111-111111111102');

insert into rally_campaigns (org_id, name, channel, status, sent, opened, clicked, leads, revenue, budget, start_at) values
  ('00000000-0000-0000-0000-0000000000aa','Q3 Enterprise ABM','ABM','active',12000,4200,780,64,320000,60000, now() - interval '14 days');

insert into rally_sequences (org_id, name, steps, active, enrolled, open_rate, reply_rate, meetings) values
  ('00000000-0000-0000-0000-0000000000aa','New inbound - 7 touch',7,true,240,62,14,18);

-- ------------------------------------------------------------
-- 9. Service  (ticket)
-- ------------------------------------------------------------
insert into rally_tickets (org_id, number, subject, company_id, contact_id, priority, status, assignee_id) values
  ('00000000-0000-0000-0000-0000000000aa','4801','SSO login failing','00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000cc003','high','open','11111111-1111-1111-1111-111111111104');

-- ------------------------------------------------------------
-- 10. Automation  (one active rule)
-- ------------------------------------------------------------
insert into rally_automations (org_id, name, description, active, trigger, conditions, actions, runs, created_by) values
  ('00000000-0000-0000-0000-0000000000aa','Won deal kicks off onboarding','When a deal reaches Closed Won, spin up an onboarding project and alert the owner.', true,
   '{"type":"deal_stage_changed","config":{"stage":"won"}}'::jsonb,
   '[]'::jsonb,
   '[{"type":"create_onboarding_project","config":{}},{"type":"notify_owner","config":{}}]'::jsonb,
   42,'11111111-1111-1111-1111-111111111106');

-- ------------------------------------------------------------
-- 11. Projects  (board + groups + task)
-- ------------------------------------------------------------
insert into rally_projects (id, org_id, name, color, owner_id, company_id) values
  ('00000000-0000-0000-0000-0000000fa001','00000000-0000-0000-0000-0000000000aa','Vertex Robotics onboarding','#5b4bf5','11111111-1111-1111-1111-111111111101','00000000-0000-0000-0000-00000000c001')
on conflict (id) do nothing;

insert into rally_project_groups (id, org_id, project_id, name, color, sort_order) values
  ('00000000-0000-0000-0000-0000000fb001','00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000fa001','This week','#5b4bf5',0),
  ('00000000-0000-0000-0000-0000000fb002','00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000fa001','Up next','#0ea5a3',1)
on conflict (id) do nothing;

insert into rally_tasks (id, org_id, project_id, group_id, title, status, priority, due, progress) values
  ('00000000-0000-0000-0000-0000000fc001','00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000fa001','00000000-0000-0000-0000-0000000fb001','Kickoff call','doing','high', now() + interval '3 days',40)
on conflict (id) do nothing;

insert into rally_task_assignees (org_id, task_id, user_id, is_primary) values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000fc001','11111111-1111-1111-1111-111111111101',true)
on conflict (task_id, user_id) do nothing;

-- ------------------------------------------------------------
-- 12. Saved view + notification
-- ------------------------------------------------------------
insert into rally_saved_views (org_id, object_type, name, owner_id, is_shared, filters, sort) values
  ('00000000-0000-0000-0000-0000000000aa','deal','My open pipeline','11111111-1111-1111-1111-111111111101',false,
   '[{"fieldKey":"status","op":"is","value":"open"}]'::jsonb,
   '{"key":"value","dir":"desc"}'::jsonb);

insert into rally_notifications (org_id, user_id, type, title, body, related_type, related_id) values
  ('00000000-0000-0000-0000-0000000000aa','11111111-1111-1111-1111-111111111101','deal','Vertex Robotics is in Negotiation','Marquee enterprise deal, close date in 21 days.','deal','00000000-0000-0000-0000-0000000d0001');

-- ============================================================
-- END seed.sql
-- ============================================================
