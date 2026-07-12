-- ============================================================
-- RALLY EMAIL PRIMITIVE  (idempotency + suppression)
-- ============================================================
-- Backing tables for api/_lib-email.js -> sendEmail(). All three are
-- optional: the primitive fails OPEN (sends without dedupe / suppression)
-- when Supabase env is absent or a query errors. Running this file just
-- lights up durable de-duplication and opt-out honoring.
--
-- Run alongside the other Rally migrations (order does not matter here;
-- these tables stand alone and reference nothing).
--
--   rally_email_log          - one row per attempted send, UNIQUE on
--                              idempotency_key. A second insert with the same
--                              key conflicts (23505) -> the "already claimed,
--                              skip" signal that eliminates double-sends across
--                              cron retries and concurrent invocations.
--   rally_email_unsubscribes - recipients who opted out of Rally email.
--   rally_email_excluded     - admin "never email" list (test/internal
--                              accounts, or anyone fully removed).
--
-- ASCII only. No em-dash or en-dash anywhere.
-- ============================================================

create extension if not exists pgcrypto;

-- Send log. idempotency_key is the dedupe pivot (UNIQUE). status walks
-- queued -> sent | failed. A 'failed' row may be re-claimed and retried.
create table if not exists rally_email_log (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  recipient       text,
  subject         text,
  category        text,
  status          text not null default 'queued' check (status in ('queued','sent','failed')),
  resend_id       text,
  error_message   text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

-- The UNIQUE index is what makes idempotency work: a concurrent / retried
-- insert of the same key fails with 23505 instead of writing a second row.
create unique index if not exists rally_email_log_idem_key on rally_email_log (idempotency_key);
create index if not exists rally_email_log_recipient on rally_email_log (lower(recipient));
create index if not exists rally_email_log_status on rally_email_log (status);

-- Global unsubscribe list. Match is case-insensitive; store lowercased.
create table if not exists rally_email_unsubscribes (
  email      text primary key,
  reason     text,
  created_at timestamptz not null default now()
);

-- Admin "never email" list. Hard exclude, belt-and-suspenders across every
-- send path.
create table if not exists rally_email_excluded (
  email      text primary key,
  reason     text,
  created_at timestamptz not null default now()
);
