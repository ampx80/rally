# Ardova - Supabase + live-secrets runbook

The six engines run local-first today and degrade cleanly. This is the exact
path to flip Ardova onto a real multi-tenant Supabase backend with enforced RLS
and to light up live email + payments. ASCII only. No em-dash / en-dash.

## 1. Provision
1. Create a Supabase project (or reuse the studio project).
2. Apply the schema:
   `psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_ardova_platform.sql`
   (or paste it into the Supabase SQL editor). It is idempotent.
3. This creates: tenancy (`orgs`, `memberships`, `current_org_ids()`), the CRM
   core (`companies`, `contacts`, `deals`, `activities`), the engine app tables
   (`campaigns`, `lists`, `forms`, `form_submissions`, `automations`,
   `automation_enrollments`, `landing_pages`, `funnels`, `reports`,
   `dashboards`, `products`, `invoices`), and the server-only tables the API
   already uses (`rally_email_log`, `rally_email_events`,
   `rally_email_unsubscribes`, `rally_email_excluded`, `rally_sequence_outbox`,
   `rally_scheduled_sends`, `rally_cron_heartbeat`, `rally_payment_events`).
4. RLS is ON everywhere. App tables are org-scoped for `authenticated` callers;
   server tables have no anon policy (only the service role touches them).

## 2. Env vars (Vercel project `rally`)
Server:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`  (dedupe, suppression, tracking, cron, payment log)
- `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`  (text-to-pay / SMS steps)
- `CRON_SECRET`  (guards /api/marketing-cron)

Client:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_DATA_BACKEND=supabase`  (flips the data layer off local-first)

## 3. Provider webhooks
- Resend: add a webhook to `https://<host>/api/resend-webhook`, sign with
  `RESEND_WEBHOOK_SECRET`. Subscribe to `email.opened`, `email.clicked`,
  `email.bounced`, `email.complained`. This writes `opened_at`/`clicked_at`/
  `bounced_at`/`complained_at` back to `rally_email_log` + `rally_email_events`.
- Stripe: add `https://<host>/api/payments-webhook`, secret `STRIPE_WEBHOOK_SECRET`.
  Subscribe to `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`. Writes to `rally_payment_events`; the client
  reconciles on load (marks paid, logs a CRM activity, fires `rally:payment`).
- Sending domain: verify SPF, DKIM, and DMARC (start DMARC at `p=none`, then
  escalate). The Deliverability panel (Marketing > Automations) surfaces status.

## 4. Crons (already in vercel.json)
- `/api/marketing-cron` daily 09:00 - drains `rally_sequence_outbox` +
  `rally_scheduled_sends`. Tighten to `*/15 * * * *` on a Pro plan for near-realtime drip.
- `/api/sequence-tick` daily 10:00.

## 5. Verify each engine live (post-flip checklist)
- Email: design a visual campaign, send to a segment, confirm real open/click in
  the per-recipient timeline; unsubscribe removes from future sends.
- Forms: hosted submit creates a contact row in Supabase; automation enrolls.
- Automation: enrollment rows persist in `automation_enrollments` across devices.
- Reporting: cross-object report reads the live tables; schedule delivers.
- Payments: create a product, send a payment link, pay in Stripe test mode, see
  `rally_payment_events` + the CRM activity from the webhook.
- Marketing Hub: landing page + email from the same designer; attribution rolls up.

## 6. Client data-layer flip (engineering note)
`src/lib/data-layer/` already has a local adapter (default) and a Supabase
adapter seam. With `VITE_DATA_BACKEND=supabase` the data layer routes reads/
writes through the Supabase adapter; the per-engine `*-data.js` stores keep the
same export surface, so pages do not change. Wire each store's `// SUPABASE:`
seam to the adapter and run the verify checklist above against a seeded org.
Every store already carries `// SUPABASE:` markers at the exact call sites.
