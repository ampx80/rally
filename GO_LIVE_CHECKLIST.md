# Rally: Go-Live Gap Analysis

Honest, complete list of what stands between "extraordinary live demo" and "real
companies paying real money with their real data." ASCII only.

## The one-line truth

Every surface of Rally is built, beautiful, and works - on **local-first seeded
demo data, per browser**. To go live you turn on the **backend** (auth, database,
multi-tenancy, billing, comms, AI keys) and stand up the **business layer**
(domain, security enforcement, compliance, payments account, monitoring). Most of
this is the "APIs later" bucket plus things only you can do (accounts, domain,
keys, legal). Nothing here is a rewrite - it is activation and wiring.

Legend: [BLOCKER] cannot charge customers without it. [ME] I can build it (needs
env/keys to activate). [YOU] only you can do it (account/domain/legal/money).

---

## 1. Auth and multi-tenancy  [BLOCKER]
The single biggest gap. Today the whole app is behind one coming-soon access CODE
and runs on a shared seeded dataset. There is no real per-user login and no
per-company data isolation.
- Real login is env-gated (Supabase) and OFF. [ME to wire, YOU to set env]
- No multi-tenant isolation: every company needs its own workspace with row-level
  security so Company A never sees Company B. [ME to build schema + RLS]
- Super admin: DONE in code (ampx80@gmail.com + nate@amptekgrowth.com in
  src/lib/access.js), enforced by session email the moment auth is on. Today
  (auth off) /admin is open so it is usable. [DONE]
- Missing: email verification, password reset (partially built), MFA, SSO/SAML +
  SCIM for enterprise, session management, invite + seat assignment.

## 2. Backend / database of record  [BLOCKER]
- Everything persists to localStorage/seed. No shared database. Need Supabase
  (or equiv) with schema + migrations + RLS for: users, companies/workspaces,
  contacts, deals, all module data, signups, billing. [ME to build, YOU env]
- The /api routes exist but many are env-gated stubs that fall back to local
  behavior. They need real Supabase wiring. [ME]
- Admin panel data is per-browser today. A true company-wide back office (you see
  ALL signups from ALL users) needs a `signups` table + /api/signups. [ME]
- Backups, data export, GDPR/CCPA delete + export. [ME + YOU policy]

## 3. Billing and payments  [BLOCKER - you literally cannot take money yet]
- Stripe is not activated. Need: plans wired to Stripe Prices, checkout,
  subscription + seat-based billing, trials, proration, dunning, real invoices,
  Stripe Tax. The Payments + Plans pages are demo UI. [ME to wire, YOU Stripe acct]
- Trial -> paid conversion flow from signup. [ME]

## 4. Provisioning (Liftoff -> a real workspace)
Liftoff generates a beautiful plan and decks, but does not PROVISION anything.
- On completion it must create the real tenant, apply activated modules, set the
  seat count, and invite/seat the team (the exec/manager/sales/finance/... layers
  become real users with the right permissions). [ME]
- Real CRM data import from their old tool (Salesforce/HubSpot/CSV). Importer UI
  exists; needs real parsing + mapping + a backend. [ME]
- Implementation-team workflow (your ask): a guided rollout console. [ME]

## 5. Comms: email + SMS (transactional AND product)  [BLOCKER for email verify/receipts]
- Transactional email (verify, password reset, receipts, invites, notifications):
  needs Resend/Postmark. Env-gated now. [ME to wire, YOU provider + domain auth]
- Product comms (sequences, campaigns, Conversations, Voice, SMS): all demo. Need
  Resend + Twilio (+ WhatsApp/Meta, telephony for Voice AI). [ME + YOU accounts]
- Email domain auth: SPF, DKIM, DMARC on your sending domain. [YOU]

## 6. AI activation (Rook)  [makes "AI-native" real]
- ANTHROPIC_API_KEY + the AI endpoints power Rook, Genesis, Autopilot,
  Liftoff generation, etc. They are env-gated and fall back to deterministic sims
  today. Set the key and they go live. [ME wired, YOU key + cost]

## 7. Security and compliance  [BLOCKER for selling to companies]
- CSP is Report-Only (not enforced) - flip to enforced after testing. [ME]
- RBAC/permissions are UI today; real enforcement must be server-side (RLS +
  API authz). [ME]
- Rate limiting, bot protection (BotID), abuse controls on public + auth endpoints. [ME + YOU]
- Real audit logging (server-side), secrets management, dependency scanning. [ME]
- Legal/compliance: privacy policy, terms, DPA, subprocessor list, GDPR/CCPA,
  cookie consent (pages exist, need real/reviewed content), and a security review
  or pen test before enterprise deals. SOC 2 is a longer track. [YOU + counsel]
- /deck/:role iframe embed is currently blocked by X-Frame-Options DENY +
  CSP frame-ancestors none; needs a per-path header exception to embed on other
  sites. [ME]

## 8. Domain and infra  [BLOCKER - do this BEFORE pouring in SEO/link equity]
- Custom domain: today it is rally-psi-five.vercel.app (a Vercel preview alias).
  Buy the real domain, point DNS, set canonical SITE in code. Moving domains later
  loses SEO equity, so do this early. [YOU domain, ME the one-line SITE change]
- Production Vercel project + prod env vars, error monitoring (Sentry), uptime +
  alerting, product analytics, log drains. [ME + YOU accounts]

## 9. SEO / growth go-live (mostly done)
- DONE: 64 cinematic guides, sitemap trimmed to lean URLs, 1970 thin pages
  noindexed, cinematic renderer, tiering.
- TODO: verify Google Search Console + Bing Webmaster (needs your domain +
  tokens), submit sitemap, add IndexNow key, backlink outreach. Do AFTER the
  custom domain is live. [YOU verify, ME the file drops]

## 10. Mobile
- Expo iOS + Android project is built and committed. Needs: your Mac, Apple
  Developer + Google Play accounts, app icons/splash, `eas build`, store review.
  [YOU accounts + submit, ME any code fixes]

## 11. QA / reliability / CI
- No automated test suite or CI gate today (I verify via a jsdom render harness
  by hand). Need unit/integration tests + a CI pipeline + load testing before
  scale. [ME]

## 12. Business ops
- Company entity, payment processor onboarding (KYC), support process + SLA,
  refund policy, status page. [YOU]

---

## Recommended order to actually launch
1. **Custom domain** (cheap, unblocks SEO + email + branding). [YOU]
2. **Auth + multi-tenant database + RLS** - nothing real works without this. [ME+YOU]
3. **Provisioning**: Liftoff creates a real workspace + invites the team. [ME]
4. **Billing (Stripe)** - so trials convert to paid. [ME+YOU]
5. **Transactional email + AI key** - verify, receipts, real Rook. [ME+YOU]
6. **Security enforcement** (CSP on, RLS authz, rate limits) + legal pages. [ME+YOU]
7. **Monitoring + CI + a security review**, then **GSC/Bing submit** + **mobile submit**. [ME+YOU]

Almost all of the [ME] items are blocked only by the **monthly spend cap** (raise
at claude.ai/settings/usage) and by having the **env keys/accounts** to point at.
The build is done; go-live is activation.
