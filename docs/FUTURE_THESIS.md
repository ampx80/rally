# Ardova Future Thesis (2026-2028)

What wins in the next 24 months in CRM + marketing platforms, what we build now to
be ahead, and where our agent layer is a durable moat. Concrete, sourced.
ASCII only. No em-dash or en-dash.

---

## 1. Where the incumbents are (mid-2026, researched)

**HubSpot Breeze.** AI is now embedded in every Hub, including the free tier. Two
moves matter: (1) HubSpot shipped the first production-grade **MCP server**, making
it the most interoperable major CRM - any MCP client can act on HubSpot data with
inherited permissions; (2) on 2026-04-14 they moved flagship agents to
**outcome-based pricing** ($0.50 per resolved conversation, $1.00 per qualified
lead). Breeze = speed to value, open protocol, SMB/mid-market.

**Salesforce Agentforce.** Enterprise autonomy: Atlas Reasoning Engine, Einstein
Trust Layer (zero-retention, dynamic RAG, toxicity detection), Data Cloud grounding,
Agent Script for deterministic control, A2A for cross-vendor agents. 18,500 customers,
3B+ workflows/month, but $50K-150K implementations and admin-heavy. Wins on governance
for regulated enterprises.

**GoHighLevel.** Agency operating system. **SaaS Mode** ($497/mo Agency Pro):
white-label the whole platform, define pricing tiers, auto-provision client
sub-accounts, automated Stripe rebilling with markup, white-label mobile app. **AI
Employee** ($97/mo/sub-account): Voice AI, Conversation AI, Reviews AI, Content AI,
Funnel AI. Operational/execution AI. Wins on agency resale + built-in comms.

**Zoho.** **Zia Agent Studio** is free to build/deploy; usage-based model cost with
30M free tokens/month on Zoho-hosted LLMs and BYOK for Claude/Gemini/OpenAI. 2026
direction: rule-based workflows to AI-driven "Customer Journey Orchestration" and
"Real-Time Interaction Management" (systems that self-govern on buyer signals). "CRM
for Everyone" UX redesign. No white-label. Wins on price + ecosystem breadth.

**The new bar: Attio + Clay.** The 2026 B2B GTM stack that startups actually adopt.
Attio = a radically flexible relational-database CRM (custom objects/relationships
that bend to the business, not a 2015 Salesforce template) with native agent blocks
and an MCP server. Clay = waterfall enrichment across 150+ providers (charge only on
hit) + Claygent research agents that turn unstructured web signals (funding, hiring,
tech stack) into structured CRM fields. The winning motion is
**signals -> enrichment -> scoring -> activation** as one automated flow.

---

## 2. Email + deliverability is now infrastructure, not a feature

Since Feb 2024 Gmail/Yahoo bulk-sender rules (and Microsoft high-volume enforcement),
these are non-negotiable for anyone sending at volume:

- **SPF + DKIM + DMARC** on every sending domain, verified before first send. DMARC
  starts at `p=none`, escalate to `p=quarantine`/`p=reject`.
- **One-click unsubscribe** (List-Unsubscribe + RFC 8058 POST) for marketing mail.
- **Spam complaint rate** under 0.3% (Yahoo) / 0.1% (Google) or you get filtered.
- **Warmup**: 3-6 weeks new domain, 2-3 weeks new mailbox; consistent volume, no spikes.
- Instantly / Smartlead own the high-volume outbound infra layer (bundled warmup,
  rotation, bounce handling). Their weakness is the compliance/governance layer
  (cross-campaign suppression, audit trail).

**The AI-SDR era raises the stakes:** agents send faster and at higher volume, so
deliverability problems materialize faster and larger. Whoever treats deliverability
as governed infrastructure - authenticated domains, suppression, complaint monitoring,
warmup pacing - wins the inbox. This is a concrete place Ardova can beat the
point-tools by making governance native, not a buyer-configured afterthought.

---

## 3. What wins in 24 months

1. **Agent-native, not agent-bolted-on.** The incumbents are retrofitting agents onto
   decades-old cores (Agentforce) or embedding task agents (Breeze). Ardova is
   agent-native from commit one. The durable version: agents are first-class users of
   every object and every engine, with a governed mandate + human countersignature.
2. **One flexible data model + one automation runner.** Attio's lesson: rigid schemas
   lose. Ardova's custom-objects + fields engine plus a SINGLE server-side automation
   runner (not three competing builders) is the spine everything hangs off.
3. **Signals -> enrichment -> scoring -> activation as one motion.** Clay proved the
   value is in the sequenced flow, not the tools. Ardova should own this end to end
   with the agent layer doing the research (Claygent-equivalent via Rook tools).
4. **Deliverability + compliance as native governance.** Beat Instantly/Smartlead by
   making authenticated domains, suppression, complaint monitoring, and one-click
   unsubscribe native and enforced, not bolted on.
5. **Agency SaaS mode.** GHL's moat is resale. Ardova already has `Workspaces` +
   white-label scaffolding; wiring Stripe Connect + auto-provisioning + rebilling makes
   Ardova a platform agencies resell, not just use.
6. **MCP + A2A openness.** Breeze won interoperability points by shipping MCP first.
   Ardova already exposes `/api/mcp`, `/api/agent`, and the `/api/handshake` A2A agent
   card. Keep that lead: every engine we build should be MCP-callable.

---

## 4. Where our agent layer is a moat

- **Handshake (counter-agent commerce).** No incumbent negotiates with the BUYER's
  agent over A2A + AP2 with a signed, human-countersigned mandate chain. This is a
  category nobody else has shipped.
- **Boardroom (autonomous revenue council).** Multi-agent debate grounded in the real
  book, filing a decision memo. Beyond Agentforce's Agent Network (which orchestrates
  the vendor's own agents around service/prospecting tasks).
- **Rook + Agent Studio.** An operator that can drive every engine by voice/chat and a
  studio to build governed agents. The moat compounds as each engine below becomes a
  set of MCP tools the agents can call.

The strategic instruction for every engine in the build plan: ship the engine AND
expose its capabilities as agent tools, so the agent layer gets stronger with each one.

---

## 5. Reuse plan (do not rebuild)

Ported from `C:\Users\Nate\Documents\Development Projects\Class Reunly\app`:

- **Konva visual designer** (`components/invite/*` - 13 files + `InvitationEditor.jsx`).
  Self-contained JSON document model (v3: canvas preset, background, elements[] of
  text/rect/ellipse/triangle/star/line/image), client-side export via
  `stage.toDataURL({ pixelRatio })`. Deps: `konva@^10.3.0`, `react-konva@^19.2.5`,
  `lucide-react@^0.460.0`. Coupling to swap lives ONLY in `InvitationEditor.jsx` +
  `brandImages.js` (WorkspaceContext + supabase + reunion copy). The 13 `invite/*`
  files are portable nearly as-is. This becomes the SHARED creative canvas for email,
  landing pages, and funnels (Marketing Hub goal). For email specifically we add a
  block-model export to email-safe HTML tables (not just canvas PNG).
- **Resend email engine.** Reusable core: `api/lib/send.js` (template render + branded
  shell + idempotent `email_log` insert), `api/lib/resend.js` (raw Resend HTTP client
  with exponential backoff + jitter, honors Retry-After), the `email_log` +
  `email_unsubscribes` schema with a UNIQUE idempotency key. Rip out the reunion
  campaign catalog/triggers/templates and the `class_workspaces`/`class_members` table
  wiring; rewire audience to Ardova contacts/lists/segments. Note the source repo has
  schema drift (lifecycle cron reads `class_workspaces`/`class_members` which have no
  migration; blast reads `workspaces`/`class_guests`) - we define clean Ardova tables.
  Also extend the webhook to handle `email.opened`/`email.clicked` and write
  `email_log.opened_at`/`clicked_at` (Class Reunly only tracks bounces/complaints).

---

## 6. Secrets required (surface once, keep shipping around them)

Server env (Vercel project `rally`):
- `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET` (Svix) - email engine
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - server persistence + RLS
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` - payments
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` - text-to-pay / SMS steps
- `ANTHROPIC_API_KEY` - AI blocks (already used)

Client env:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_DATA_BACKEND=supabase` (flip to make Supabase the real path)

Everything not dependent on a missing secret ships with a local-first fallback and a
clear "connect X to go live" state (never overpromising copy).
