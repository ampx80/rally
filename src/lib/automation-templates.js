// ============================================================
// RALLY AUTOMATION TEMPLATE LIBRARY  (additive to automations.js)
//
// A curated shelf of ~30 ready-to-run automations. Each template
// is expressed in the EXACT shape the automation engine expects
// (automations.js): a trigger + conditions + actions built ONLY
// from the existing TRIGGERS / OPERATORS / FIELDS / ACTIONS
// vocabularies. install() writes a REAL, live automation through
// the engine's own writer (saveAutomation), so an installed
// template fires on live pipeline events exactly like a rule the
// user hand-built.
//
// Nothing here mutates automations.js. This module only READS the
// engine vocabulary (to self-verify at load) and CALLS its public
// writers. ASCII hyphen only, no long dashes.
// ============================================================
import {
  saveAutomation, getAutomations,
  TRIGGERS, ACTIONS, OPERATORS, FIELDS_BY_OBJECT,
} from './automations.js';

// A stable marker we stamp onto every installed rule so the
// library can tell which templates are already live. saveAutomation
// spreads the whole rule object, so this field is persisted for free.
const TPL_MARK = 'templateId';

/* Categories - the shelves of the library, in display order. */
export const CATEGORIES = [
  { id: 'lead-response', name: 'Lead response', icon: 'inbox', blurb: 'Never let a fresh lead go cold.' },
  { id: 'pipeline-hygiene', name: 'Pipeline hygiene', icon: 'funnel', blurb: 'Keep every deal moving and clean.' },
  { id: 'handoffs', name: 'Handoffs', icon: 'layers', blurb: 'Clean baton passes across the team.' },
  { id: 'renewals-cs', name: 'Renewals + CS', icon: 'shield', blurb: 'Protect and grow the accounts you win.' },
  { id: 'outreach', name: 'Outreach', icon: 'megaphone', blurb: 'Draft the right message at the right moment.' },
  { id: 'notifications', name: 'Notifications', icon: 'bell', blurb: 'Push the signal to the people and tools that need it.' },
  { id: 'data-quality', name: 'Data quality', icon: 'sliders', blurb: 'Enrich, sync, and keep records trustworthy.' },
];
export const categoryById = (id) => CATEGORIES.find(c => c.id === id);

/* ------------------------------------------------------------
   The raw template definitions. `def` is the runnable body that
   goes straight into the engine. Keep configs minimal - the engine
   supplies sensible fallbacks for anything omitted.
   ------------------------------------------------------------ */
const RAW = [
  /* ---------------- Lead response ---------------- */
  {
    id: 'tpl_instant_lead_call', category: 'lead-response', icon: 'phone',
    name: 'Instant new-lead call task',
    description: 'The moment a new deal is created, task the owner to call within five minutes. Speed to lead wins.',
    def: {
      trigger: { type: 'deal_created', config: {} },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Call this new lead within 5 minutes', dueDays: 0 } }],
    },
  },
  {
    id: 'tpl_research_new_deal', category: 'lead-response', icon: 'search',
    name: 'Research every new opportunity',
    description: 'Every new deal gets an owner task to research the account and map the buying committee within a day.',
    def: {
      trigger: { type: 'deal_created', config: {} },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Research account + map the buying committee', dueDays: 1 } }],
    },
  },
  {
    id: 'tpl_new_contact_touch', category: 'lead-response', icon: 'user',
    name: 'First touch on new contacts',
    description: 'When a contact enters the CRM, task the owner to send an intro and connect the same day.',
    def: {
      trigger: { type: 'contact_created', config: {} },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Send intro + connect on LinkedIn', dueDays: 0 } }],
    },
  },
  {
    id: 'tpl_route_enterprise', category: 'lead-response', icon: 'rocket',
    name: 'Fast-track enterprise leads',
    description: 'A brand-new deal over $250k alerts the owner and books a same-day qualification call.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 250000 } },
      conditions: [],
      actions: [
        { type: 'notify_owner', config: { who: 'Enterprise team' } },
        { type: 'create_task', config: { subject: 'Qualify enterprise lead + book exec intro', dueDays: 0 } },
      ],
    },
  },
  {
    id: 'tpl_qualify_inbound', category: 'lead-response', icon: 'checkSquare',
    name: 'Qualify inbound at Lead stage',
    description: 'When a deal lands in Lead, task the rep to score budget, authority, need, and timeline.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'lead' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Qualify: budget, authority, need, timeline', dueDays: 1 } }],
    },
  },

  /* ---------------- Pipeline hygiene ---------------- */
  {
    id: 'tpl_advance_qualified', category: 'pipeline-hygiene', icon: 'deals',
    name: 'Book discovery on Qualified',
    description: 'Reaching Qualified tasks the owner to book the discovery call so momentum never stalls.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'qualified' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Book discovery call', dueDays: 1 } }],
    },
  },
  {
    id: 'tpl_discovery_forecast', category: 'pipeline-hygiene', icon: 'sliders',
    name: 'Set forecast on Discovery',
    description: 'Entering Discovery bumps probability to 45% and logs the momentum for the forecast.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'discovery' } },
      conditions: [],
      actions: [
        { type: 'set_field', config: { field: 'probability', value: 45 } },
        { type: 'log_activity', config: { subject: 'Entered Discovery - forecast updated' } },
      ],
    },
  },
  {
    id: 'tpl_proposal_checklist', category: 'pipeline-hygiene', icon: 'fileText',
    name: 'Proposal-sent checklist',
    description: 'When a deal enters Proposal, task the owner to confirm receipt and book the review.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'proposal' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Confirm proposal received + book review', dueDays: 1 } }],
    },
  },
  {
    id: 'tpl_chase_negotiation', category: 'pipeline-hygiene', icon: 'clock',
    name: 'Chase stalled negotiations',
    description: 'Reaching Negotiation tasks the owner to confirm terms and lock a signature date.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'negotiation' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Confirm terms + set a signature date', dueDays: 2 } }],
    },
  },
  {
    id: 'tpl_overdue_rescue', category: 'pipeline-hygiene', icon: 'history',
    name: 'Rescue overdue activities',
    description: 'When a real activity (call, email, meeting) goes overdue, task the owner to reschedule it today.',
    def: {
      trigger: { type: 'activity_overdue', config: {} },
      conditions: [{ field: 'type', op: 'neq', value: 'note' }],
      actions: [{ type: 'create_task', config: { subject: 'Reschedule this overdue step', dueDays: 0 } }],
    },
  },
  {
    id: 'tpl_lost_retro', category: 'pipeline-hygiene', icon: 'arrowDown',
    name: 'Loss retro on Closed Lost',
    description: 'A deal that reaches Closed Lost logs the moment and tasks the owner to capture the loss reason.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'lost' } },
      conditions: [],
      actions: [
        { type: 'log_activity', config: { subject: 'Deal lost - capture reason' } },
        { type: 'create_task', config: { subject: 'Log loss reason + schedule nurture', dueDays: 2 } },
      ],
    },
  },

  /* ---------------- Handoffs ---------------- */
  {
    id: 'tpl_won_onboarding', category: 'handoffs', icon: 'target',
    name: 'Onboarding kickoff on Closed Won',
    description: 'Reaching Closed Won spins up an onboarding project with kickoff tasks and alerts the owner.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [
        { type: 'create_onboarding_project', config: {} },
        { type: 'notify_owner', config: {} },
      ],
    },
  },
  {
    id: 'tpl_cs_handoff', category: 'handoffs', icon: 'users',
    name: 'Sales to CS handoff',
    description: 'A won deal logs the handoff and tasks the owner to write transition notes for Customer Success.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [
        { type: 'log_activity', config: { subject: 'Sales to CS handoff started' } },
        { type: 'create_task', config: { subject: 'Write handoff notes for Customer Success', dueDays: 1 } },
      ],
    },
  },
  {
    id: 'tpl_impl_kickoff_big', category: 'handoffs', icon: 'layers',
    name: 'Implementation project for big wins',
    description: 'A won deal over $100k spins up a full implementation project with a tailored task list.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [{ field: 'value', op: 'gt', value: 100000 }],
      actions: [{
        type: 'create_onboarding_project',
        config: { tasks: ['Assign implementation lead', 'Kickoff call', 'Provision environment', 'Migrate historical data', 'Training session', 'Go-live review'] },
      }],
    },
  },
  {
    id: 'tpl_loop_solutions', category: 'handoffs', icon: 'sparkles',
    name: 'Loop in Solutions Engineering',
    description: 'A proposal on a deal over $100k alerts Solutions Engineering and books technical validation.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'proposal' } },
      conditions: [{ field: 'value', op: 'gt', value: 100000 }],
      actions: [
        { type: 'notify_owner', config: { who: 'Solutions Engineering' } },
        { type: 'create_task', config: { subject: 'Schedule technical validation', dueDays: 2 } },
      ],
    },
  },

  /* ---------------- Renewals + CS ---------------- */
  {
    id: 'tpl_high_value_review', category: 'renewals-cs', icon: 'shield',
    name: 'Deal-desk review over $100k',
    description: 'A new deal over $100k logs a review activity and notifies the VP of Revenue.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 100000 } },
      conditions: [],
      actions: [
        { type: 'log_activity', config: { subject: 'High-value deal - deal desk review' } },
        { type: 'notify_owner', config: { who: 'VP of Revenue' } },
      ],
    },
  },
  {
    id: 'tpl_success_review', category: 'renewals-cs', icon: 'calendar',
    name: 'Schedule the 30-day success review',
    description: 'Every won deal tasks the owner to book a 30-day success review so value lands early.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Schedule 30-day success review', dueDays: 30 } }],
    },
  },
  {
    id: 'tpl_expansion_flag', category: 'renewals-cs', icon: 'trendUp',
    name: 'Flag expansion opportunities',
    description: 'A new deal over $50k tasks the owner to map expansion and multi-year options up front.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 50000 } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Map expansion + multi-year options', dueDays: 3 } }],
    },
  },
  {
    id: 'tpl_renewal_prep', category: 'renewals-cs', icon: 'history',
    name: 'Set up renewal tracking on win',
    description: 'A won deal tasks the owner to record the renewal date and assign a renewal owner.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [{ type: 'create_task', config: { subject: 'Add renewal date + assign renewal owner', dueDays: 1 } }],
    },
  },

  /* ---------------- Outreach ---------------- */
  {
    id: 'tpl_proposal_email', category: 'outreach', icon: 'mail',
    name: 'Draft the proposal cover email',
    description: 'Entering Proposal drafts the cover email for the rep to review and tasks them to send it.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'proposal' } },
      conditions: [],
      actions: [
        { type: 'send_email', config: { template: 'Proposal cover note' } },
        { type: 'create_task', config: { subject: 'Send proposal', dueDays: 1 } },
      ],
    },
  },
  {
    id: 'tpl_overdue_nudge', category: 'outreach', icon: 'send',
    name: 'Nudge overdue follow-ups',
    description: 'When an activity goes overdue, draft a gentle nudge email to keep the thread moving.',
    def: {
      trigger: { type: 'activity_overdue', config: {} },
      conditions: [{ field: 'type', op: 'neq', value: 'note' }],
      actions: [{ type: 'send_email', config: { template: 'Gentle nudge' } }],
    },
  },
  {
    id: 'tpl_reengage_negotiation', category: 'outreach', icon: 'mail',
    name: 'Re-engage on Negotiation',
    description: 'Reaching Negotiation drafts a close-focused email so the deal keeps its momentum.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'negotiation' } },
      conditions: [],
      actions: [{ type: 'send_email', config: { template: 'Lets get this signed' } }],
    },
  },
  {
    id: 'tpl_welcome_contact', category: 'outreach', icon: 'mail',
    name: 'Welcome new contacts',
    description: 'A new contact gets a drafted welcome email for the owner to personalize and send.',
    def: {
      trigger: { type: 'contact_created', config: {} },
      conditions: [],
      actions: [{ type: 'send_email', config: { template: 'Welcome / intro' } }],
    },
  },
  {
    id: 'tpl_post_demo_recap', category: 'outreach', icon: 'fileText',
    name: 'Post-discovery recap',
    description: 'Entering Discovery drafts a recap-and-next-steps email and tasks the owner to send it.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'discovery' } },
      conditions: [],
      actions: [
        { type: 'send_email', config: { template: 'Recap + next steps' } },
        { type: 'create_task', config: { subject: 'Send recap + confirm next step', dueDays: 1 } },
      ],
    },
  },

  /* ---------------- Notifications ---------------- */
  {
    id: 'tpl_slack_won', category: 'notifications', icon: 'bell',
    name: 'Post won deals to Slack',
    description: 'A deal that reaches Closed Won posts to your Slack channel. Paste a Slack Incoming Webhook to post for real.',
    def: {
      trigger: { type: 'deal_stage_changed', config: { stage: 'won' } },
      conditions: [],
      actions: [{ type: 'send_slack', config: { webhook: '', message: 'Closed Won: {name} - {value} ({owner})' } }],
    },
  },
  {
    id: 'tpl_teams_bigdeal', category: 'notifications', icon: 'activity',
    name: 'Post big deals to Microsoft Teams',
    description: 'A new deal over $100k posts to your Teams channel. Paste a Teams Incoming Webhook to post for real.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 100000 } },
      conditions: [],
      actions: [{ type: 'send_teams', config: { webhook: '', message: 'New high-value deal: {name} - {value} ({owner})' } }],
    },
  },
  {
    id: 'tpl_alert_highvalue', category: 'notifications', icon: 'dollar',
    name: 'Alert on new deals over $150k',
    description: 'A new deal over $150k notifies the owner and logs an alert for the deal desk.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 150000 } },
      conditions: [],
      actions: [
        { type: 'notify_owner', config: { who: 'VP of Revenue' } },
        { type: 'log_activity', config: { subject: 'High-value deal - review' } },
      ],
    },
  },

  /* ---------------- Data quality ---------------- */
  {
    id: 'tpl_webhook_new_deal', category: 'data-quality', icon: 'plug',
    name: 'Send new deals to a webhook',
    description: 'Every new deal is POSTed as JSON to your Zapier, Make, or custom endpoint. Paste a URL to sync for real.',
    def: {
      trigger: { type: 'deal_created', config: {} },
      conditions: [],
      actions: [{ type: 'post_webhook', config: { url: '' } }],
    },
  },
  {
    id: 'tpl_sync_hubspot', category: 'data-quality', icon: 'plug',
    name: 'Sync high-value deals to HubSpot',
    description: 'A new deal over $100k is queued to sync into your system of record and the owner is notified.',
    def: {
      trigger: { type: 'deal_value_over', config: { amount: 100000 } },
      conditions: [],
      actions: [
        { type: 'sync_record', config: { target: 'HubSpot' } },
        { type: 'notify_owner', config: {} },
      ],
    },
  },
  {
    id: 'tpl_enrich_contacts', category: 'data-quality', icon: 'sparkles',
    name: 'Enrich new contacts',
    description: 'Every new contact is queued for enrichment from your data provider so records stay complete.',
    def: {
      trigger: { type: 'contact_created', config: {} },
      conditions: [],
      actions: [{ type: 'enrich_contact', config: { provider: 'Clearbit' } }],
    },
  },
];

/* ------------------------------------------------------------
   SELF-VERIFICATION - at module load, assert that every template
   only references trigger / action / field / operator ids that
   actually exist in the engine. Throws loudly in dev if a template
   drifts from the engine vocabulary. Returns the list of problems
   (empty when healthy) for anyone who wants to surface it in UI.
   ------------------------------------------------------------ */
export function verifyTemplates(list = RAW) {
  const problems = [];
  for (const t of list) {
    const d = t.def || {};
    const trig = TRIGGERS[d.trigger?.type];
    if (!trig) { problems.push(`${t.id}: unknown trigger "${d.trigger?.type}"`); continue; }
    const fields = FIELDS_BY_OBJECT[trig.object] || {};
    for (const c of (d.conditions || [])) {
      if (!fields[c.field]) problems.push(`${t.id}: field "${c.field}" not valid for ${trig.object}`);
      if (!OPERATORS[c.op]) problems.push(`${t.id}: unknown operator "${c.op}"`);
    }
    for (const a of (d.actions || [])) {
      if (!ACTIONS[a.type]) problems.push(`${t.id}: unknown action "${a.type}"`);
    }
    if (!(d.actions || []).length) problems.push(`${t.id}: has no actions`);
  }
  return problems;
}

const _problems = verifyTemplates();
if (_problems.length && typeof console !== 'undefined') {
  // Loud in dev, harmless in prod. A broken template is a codegen-contract bug.
  console.error('[automation-templates] template/engine drift:\n' + _problems.join('\n'));
}

/* ------------------------------------------------------------
   PUBLIC API
   ------------------------------------------------------------ */

// Deep clone so an install never shares config references with the
// template shelf (the engine mutates rule state over its lifetime).
const clone = (v) => JSON.parse(JSON.stringify(v));

/* Every template, decorated with a live install() that writes a
   real automation through the engine's own writer and returns its
   new id. install() is idempotent-friendly: if the same template is
   already installed it returns the existing automation id instead
   of creating a duplicate. */
export const TEMPLATES = RAW.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  category: t.category,
  icon: t.icon,
  // the runnable definition, in the exact engine shape
  trigger: t.def.trigger,
  conditions: t.def.conditions || [],
  actions: t.def.actions || [],
  install() {
    const existing = getAutomations().find(r => r[TPL_MARK] === t.id);
    if (existing) return existing.id;
    return saveAutomation({
      name: t.name,
      description: t.description,
      trigger: clone(t.def.trigger),
      conditions: clone(t.def.conditions || []),
      actions: clone(t.def.actions || []),
      active: true,
      [TPL_MARK]: t.id,
    });
  },
}));

export const templateById = (id) => TEMPLATES.find(t => t.id === id);
export const templatesByCategory = (catId) => TEMPLATES.filter(t => t.category === catId);

/* Which templateIds are currently live in the user's library.
   Reads the engine's rule list and collects our marker field. */
export function installedTemplateIds(rules = getAutomations()) {
  const set = new Set();
  for (const r of rules) if (r[TPL_MARK]) set.add(r[TPL_MARK]);
  return set;
}
export const isTemplateInstalled = (id, rules = getAutomations()) =>
  installedTemplateIds(rules).has(id);
