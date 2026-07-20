// email-catalog.js - THE catalog of every transactional email Ardovo can send.
// Every system event maps to a real, pre-built email here: subject, body, detail
// rows, and a call to action, rendered on-brand (teal product accent, light
// layout) through one shared shell. This is the single source of truth the Email
// Center browses, previews, and test-sends, and that api/notify.js renders live
// through the hardened Resend layer (api/_lib-email.js).
//
// Design: events are compact declarations with {token} strings so we do not need
// 120 bespoke functions. renderEmailHtml() fills tokens (with sensible demo
// defaults for previews) and wraps everything in the branded shell.
// NO em-dash / en-dash anywhere. ASCII hyphen only.

export const APP_URL = 'https://rally-psi-five.vercel.app';
export const SUPPORT_EMAIL = 'help@ardovo.com';

// Domains group the whole product. color drives the accent bar per email.
export const DOMAINS = [
  { id: 'crm', label: 'Core CRM', icon: 'building', color: '#0e9f8f' },
  { id: 'sell', label: 'Sell', icon: 'deals', color: '#0e9f8f' },
  { id: 'marketing', label: 'Marketing', icon: 'sparkles', color: '#7c5cf7' },
  { id: 'deliver', label: 'Deliver', icon: 'checkSquare', color: '#0e9f8f' },
  { id: 'service', label: 'Service', icon: 'inbox', color: '#2563a8' },
  { id: 'revenue', label: 'Revenue', icon: 'chart', color: '#1a7f52' },
  { id: 'intelligence', label: 'Intelligence', icon: 'target', color: '#7c5cf7' },
  { id: 'automate', label: 'Automate', icon: 'command', color: '#7c5cf7' },
  { id: 'data', label: 'Data', icon: 'filter', color: '#2563a8' },
  { id: 'files', label: 'Files', icon: 'fileText', color: '#0e9f8f' },
  { id: 'admin', label: 'Admin & Security', icon: 'shield', color: '#c0392b' },
  { id: 'auth', label: 'Auth & Account', icon: 'lock', color: '#c0392b' },
  { id: 'agent', label: 'Agents & Training', icon: 'sparkles', color: '#7c5cf7' },
  { id: 'digest', label: 'Executive Digests', icon: 'calendar', color: '#7c5cf7' },
];
export const domainById = (id) => DOMAINS.find(d => d.id === id) || DOMAINS[0];

const SEV_COLOR = { info: '#2563a8', success: '#0e9f8f', warn: '#b3721a', critical: '#c0392b' };

// Demo tokens so every template previews with realistic content.
export const DEFAULT_TOKENS = {
  actor: 'Jordan Avery', user: 'Jordan Avery', invitee: 'Sam Rivera', assignee: 'Nina Kapoor',
  workspace: 'Northwind Traders', company: 'Contoso Group', contact: 'Marcus Hale',
  deal: 'Contoso - Platform Expansion', value: '$142,800', stage: 'Negotiation', pipeline: 'New Business',
  role: 'Manager', email: 'sam@northwind.com', keyName: 'Production API key', module: 'Forecasting',
  amount: '$12,400', invoice: 'INV-20482', quote: 'Q-3391', ticket: '#4821', project: 'Contoso onboarding',
  account: 'Contoso Group', campaign: 'Q3 Expansion', sequence: 'Enterprise nurture', report: 'Weekly pipeline',
  count: '6', score: '82', device: 'Chrome on macOS', location: 'Austin, TX', signer: 'Dana Reed',
  document: 'Master Services Agreement', form: 'Book a demo', lead: 'Priya Shah', product: 'Ardovo Enterprise',
  goal: 'Q3 net-new quota', percent: '112%', period: 'this week', plan: 'Scale', seats: '25',
};

function fill(str, tokens) {
  if (!str) return '';
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (tokens[k] != null ? tokens[k] : m));
}

// Compact event declaration helper.
const ev = (key, domain, label, audience, severity, subject, summary, extra = {}) =>
  ({ key, domain, label, audience, severity, subject, summary, ...extra });

// ============================================================
// THE EVENTS - every email, pre-built.
// ============================================================
export const EVENTS = [
  // ---- Core CRM ----
  ev('deal.created', 'crm', 'Deal created', ['owner', 'team'], 'info', 'New deal: {deal}', '{actor} added {deal} to the {pipeline} pipeline at {value}.', { cta: '/deals' }),
  ev('deal.stage_changed', 'crm', 'Deal stage changed', ['owner', 'team'], 'info', '{deal} moved to {stage}', '{actor} advanced {deal} to the {stage} stage.', { cta: '/deals' }),
  ev('deal.won', 'crm', 'Deal won', ['owner', 'team', 'executives'], 'success', 'Closed won: {deal} ({value})', 'Great news - {deal} is closed won at {value}. Nice work, {actor}.', { cta: '/deals' }),
  ev('deal.lost', 'crm', 'Deal lost', ['owner', 'team'], 'warn', 'Closed lost: {deal}', '{deal} was marked closed lost. The reason and timeline are on the record.', { cta: '/deals' }),
  ev('deal.reopened', 'crm', 'Deal reopened', ['owner', 'team'], 'info', '{deal} was reopened', '{actor} reopened {deal} back into active pipeline.', { cta: '/deals' }),
  ev('deal.owner_changed', 'crm', 'Deal reassigned', ['assignee', 'actor'], 'info', 'You now own {deal}', '{actor} assigned {deal} ({value}) to {assignee}.', { cta: '/deals' }),
  ev('deal.stakeholder_added', 'crm', 'Stakeholder added', ['owner'], 'info', 'New stakeholder on {deal}', '{contact} was added to the buying committee on {deal}.', { cta: '/deals' }),
  ev('deal.room_shared', 'crm', 'Deal room shared', ['owner'], 'info', 'Deal room link ready for {deal}', 'A buyer-facing deal room link for {deal} is ready to share.', { cta: '/deals' }),
  ev('contact.created', 'crm', 'Contact created', ['owner', 'team'], 'info', 'New contact: {contact}', '{actor} created a contact record for {contact}.', { cta: '/contacts' }),
  ev('contact.owner_changed', 'crm', 'Contact reassigned', ['assignee'], 'info', 'You now own {contact}', '{actor} assigned {contact} to {assignee}.', { cta: '/contacts' }),
  ev('contact.merged', 'crm', 'Contacts merged', ['admins', 'owner'], 'info', 'Contacts merged', '{actor} merged duplicate contacts; the master record was retained.', { cta: '/duplicates' }),
  ev('company.created', 'crm', 'Company created', ['team'], 'info', 'New account: {company}', '{actor} created a company record for {company}.', { cta: '/companies' }),
  ev('company.owner_changed', 'crm', 'Company reassigned', ['assignee'], 'info', 'You now own {company}', '{actor} assigned {company} to {assignee}.', { cta: '/companies' }),
  ev('activity.task_assigned', 'crm', 'Task assigned', ['assignee'], 'info', 'New task for you', '{actor} assigned you a task on {deal}. It is due soon.', { cta: '/app' }),
  ev('activity.task_due_soon', 'crm', 'Task due soon', ['assignee'], 'warn', 'Task due soon on {deal}', 'You have a task due within the next few days on {deal}.', { cta: '/app' }),
  ev('activity.task_overdue', 'crm', 'Task overdue', ['assignee', 'owner'], 'warn', 'Overdue task on {deal}', 'A task on {deal} is past due. A quick nudge to close it out.', { cta: '/app' }),
  ev('activity.meeting_scheduled', 'crm', 'Meeting scheduled', ['assignee'], 'info', 'Meeting booked: {company}', 'A meeting with {company} is on the calendar. Details are on the record.', { cta: '/scheduler' }),
  ev('mention.created', 'crm', 'You were mentioned', ['assignee'], 'info', '{actor} mentioned you', '{actor} mentioned you in a note on {deal}.', { cta: '/deals' }),
  ev('command_center.alert', 'crm', 'Command Center alert', ['owner', 'executives'], 'warn', 'Priority alert on your book', 'Command Center flagged {count} items that need attention today.', { cta: '/app' }),

  // ---- Sell ----
  ev('lead.created', 'sell', 'Lead created', ['team', 'assignee'], 'info', 'New lead: {lead}', 'A new lead, {lead}, just landed in the inbox.', { cta: '/leads' }),
  ev('lead.scored_high', 'sell', 'Hot lead', ['assignee', 'team'], 'success', 'Hot lead: {lead} scored {score}', '{lead} crossed the hot threshold with an AI score of {score}.', { cta: '/leads' }),
  ev('lead.qualified', 'sell', 'Lead qualified', ['assignee', 'team'], 'success', 'Lead qualified: {lead}', '{actor} marked {lead} as qualified.', { cta: '/leads' }),
  ev('lead.converted', 'sell', 'Lead converted', ['assignee', 'owner'], 'success', '{lead} converted', '{lead} was converted into a contact and deal.', { cta: '/deals' }),
  ev('lead.owner_assigned', 'sell', 'Lead routed', ['assignee'], 'info', 'New lead routed to you', '{lead} was routed to {assignee}.', { cta: '/leads' }),
  ev('forecast.quota_gap_critical', 'sell', 'Quota gap critical', ['executives', 'team'], 'critical', 'Committed forecast below quota', 'The committed forecast for {period} is tracking below quota. Review the gap.', { cta: '/forecasting' }),
  ev('forecast.rep_behind_pace', 'sell', 'Rep behind pace', ['assignee', 'executives'], 'warn', 'Behind pace this quarter', '{assignee} is behind the time-elapsed pace for the quarter.', { cta: '/forecasting' }),
  ev('goal.achieved', 'sell', 'Goal achieved', ['assignee', 'executives', 'team'], 'success', 'Goal hit: {goal}', '{goal} was reached at {percent} of target. Big moment.', { cta: '/goals' }),
  ev('goal.behind_pace', 'sell', 'Goal behind pace', ['assignee', 'executives'], 'warn', '{goal} is behind pace', '{goal} slipped behind its pacing target.', { cta: '/goals' }),
  ev('territory.rep_assigned', 'sell', 'Territory assigned', ['assignee', 'admins'], 'info', 'Territory assigned', '{assignee} was added to a territory book.', { cta: '/territories' }),
  ev('scheduler.meeting_booked', 'sell', 'Meeting booked via link', ['assignee', 'team'], 'success', 'New meeting booked', 'A visitor booked time via your scheduling link.', { cta: '/scheduler' }),
  ev('playbook.published', 'sell', 'Playbook published', ['team'], 'info', 'New playbook: guided selling', '{actor} published a sales playbook for the team.', { cta: '/playbooks' }),
  ev('warroom.close_plan_updated', 'sell', 'Close plan updated', ['owner'], 'info', 'Close plan updated on {deal}', 'The War Room close plan for {deal} was updated.', { cta: '/warroom' }),
  ev('handshake.settled', 'sell', 'Negotiation settled', ['owner', 'executives'], 'success', 'Handshake reached on {deal}', 'An in-mandate settlement was reached on {deal} at {value}.', { cta: '/deals' }),
  ev('handshake.escalated', 'sell', 'Negotiation escalated', ['owner', 'executives'], 'warn', 'Negotiation escalated: {deal}', 'A negotiation on {deal} hit a ceiling and was escalated for review.', { cta: '/deals' }),

  // ---- Marketing ----
  ev('campaign.launched', 'marketing', 'Campaign launched', ['team'], 'info', 'Campaign live: {campaign}', '{actor} launched the {campaign} campaign.', { cta: '/campaigns' }),
  ev('campaign.completed', 'marketing', 'Campaign completed', ['team', 'executives'], 'info', 'Campaign wrapped: {campaign}', 'The {campaign} campaign finished its run. Results are in.', { cta: '/campaigns' }),
  ev('campaign.budget_threshold', 'marketing', 'Budget threshold', ['executives', 'team'], 'warn', 'Campaign budget alert: {campaign}', '{campaign} crossed its spend or pacing threshold.', { cta: '/campaigns' }),
  ev('sequence.reply_received', 'marketing', 'Sequence reply', ['assignee'], 'success', 'Reply on {sequence}', 'A prospect replied on the {sequence} sequence thread.', { cta: '/sequences' }),
  ev('sequence.bounced', 'marketing', 'Sequence bounce', ['team', 'admins'], 'warn', 'Bounce on {sequence}', 'An email bounced on the {sequence} sequence.', { cta: '/sequences' }),
  ev('sequence.unsubscribed', 'marketing', 'Unsubscribe', ['team'], 'info', 'Contact unsubscribed', '{contact} unsubscribed from {sequence}.', { cta: '/sequences' }),
  ev('form.submitted', 'marketing', 'Form submitted', ['team', 'assignee'], 'success', 'New form submission: {form}', 'Someone submitted the {form} form. Lead details are inside.', { cta: '/forms' }),
  ev('landing_page.converted', 'marketing', 'Landing page conversion', ['admins', 'team'], 'success', 'Landing page conversion', 'A visitor converted on a hosted landing page.', { cta: '/landing-pages' }),
  ev('review.received', 'marketing', 'New review', ['team', 'executives'], 'success', 'New review received', 'A new public review just came in.', { cta: '/reviews' }),
  ev('social.post_failed', 'marketing', 'Social post failed', ['actor', 'admins'], 'warn', 'Social post failed', 'A scheduled social post failed to publish.', { cta: '/social' }),
  ev('ads.spend_alert', 'marketing', 'Ad spend alert', ['executives', 'team'], 'warn', 'Ad spend or ROAS alert', 'An ad campaign crossed a spend or ROAS threshold.', { cta: '/ads' }),
  ev('journey.completed', 'marketing', 'Journey completed', ['team'], 'info', 'Journey completed', 'A customer completed the {campaign} journey.', { cta: '/journeys' }),
  ev('broadcast.sent', 'marketing', 'Broadcast sent', ['actor', 'admins'], 'info', 'Broadcast sent', 'Your bulk broadcast finished sending to the audience.', { cta: '/campaigns' }),

  // ---- Deliver ----
  ev('project.created', 'deliver', 'Project created', ['assignee', 'team'], 'info', 'New project: {project}', '{actor} created the delivery project {project}.', { cta: '/projects' }),
  ev('project.milestone_reached', 'deliver', 'Milestone reached', ['team', 'owner'], 'success', 'Milestone reached on {project}', 'A milestone on {project} was completed.', { cta: '/projects' }),
  ev('project.task_overdue', 'deliver', 'Project task overdue', ['assignee'], 'warn', 'Overdue task on {project}', 'A task on {project} is past due.', { cta: '/projects' }),
  ev('success.health_degraded', 'deliver', 'Health degraded', ['assignee', 'executives'], 'warn', 'Account health dropped: {account}', '{account} moved into a lower health band. Worth a check-in.', { cta: '/success' }),
  ev('success.renewal_upcoming', 'deliver', 'Renewal upcoming', ['assignee', 'executives'], 'info', 'Renewal in 90 days: {account}', '{account} has a renewal coming up within 90 days.', { cta: '/success' }),
  ev('success.churn_risk_elevated', 'deliver', 'Churn risk elevated', ['assignee', 'executives'], 'critical', 'Churn risk: {account}', '{account} entered the churn-risk queue. Move early.', { cta: '/success' }),
  ev('success.expansion_opportunity', 'deliver', 'Expansion opportunity', ['assignee', 'executives'], 'success', 'Expansion signal: {account}', 'An expansion opportunity was flagged on {account}.', { cta: '/success' }),
  ev('academy.enrollment', 'deliver', 'Academy enrollment', ['team'], 'info', 'New Academy enrollment', 'A client enrolled in a course or portal.', { cta: '/academy' }),

  // ---- Service ----
  ev('inbox.sla_warning', 'service', 'SLA warning', ['assignee', 'admins'], 'warn', 'Approaching SLA on {ticket}', 'A conversation is approaching its SLA deadline.', { cta: '/inbox' }),
  ev('inbox.sla_breached', 'service', 'SLA breached', ['assignee', 'admins', 'executives'], 'critical', 'SLA breached on {ticket}', 'An SLA was breached on an open conversation.', { cta: '/inbox' }),
  ev('ticket.created', 'service', 'Ticket created', ['team', 'assignee'], 'info', 'New ticket {ticket}', 'A support ticket {ticket} was opened.', { cta: '/tickets' }),
  ev('ticket.assigned', 'service', 'Ticket assigned', ['assignee'], 'info', 'Ticket {ticket} assigned to you', '{actor} assigned ticket {ticket} to {assignee}.', { cta: '/tickets' }),
  ev('ticket.priority_escalated', 'service', 'Ticket escalated', ['assignee', 'admins'], 'warn', 'Ticket {ticket} escalated', 'Ticket {ticket} priority was raised to urgent.', { cta: '/tickets' }),
  ev('ticket.resolved', 'service', 'Ticket resolved', ['assignee', 'owner'], 'success', 'Ticket {ticket} resolved', 'Ticket {ticket} was closed as resolved.', { cta: '/tickets' }),
  ev('ticket.csat_submitted', 'service', 'CSAT received', ['team', 'executives'], 'info', 'CSAT received on {ticket}', 'A customer left a satisfaction rating on {ticket}.', { cta: '/tickets' }),
  ev('voice.call_missed', 'service', 'Missed call', ['team'], 'warn', 'Missed inbound call', 'An inbound call was missed or failed routing.', { cta: '/voice' }),
  ev('voice.voicemail_transcribed', 'service', 'Voicemail transcribed', ['assignee'], 'info', 'New voicemail transcript', 'A voicemail was transcribed and logged.', { cta: '/voice' }),
  ev('survey.detractor_alert', 'service', 'Detractor alert', ['assignee', 'executives'], 'warn', 'Detractor survey response', 'A low survey score came in and needs follow-up.', { cta: '/surveys' }),
  ev('kb.article_published', 'service', 'KB article published', ['team'], 'info', 'Knowledge base article published', '{actor} published a new knowledge base article.', { cta: '/kb' }),

  // ---- Revenue ----
  ev('quote.sent', 'revenue', 'Quote sent', ['owner', 'team'], 'info', 'Quote {quote} sent to {company}', '{actor} sent quote {quote} ({value}) to {company}.', { cta: '/quotes' }),
  ev('quote.viewed', 'revenue', 'Quote viewed', ['owner'], 'info', '{company} opened quote {quote}', 'The buyer opened quote {quote}.', { cta: '/quotes' }),
  ev('quote.accepted', 'revenue', 'Quote accepted', ['owner', 'executives', 'team'], 'success', 'Quote {quote} accepted', '{company} accepted quote {quote} at {value}.', { cta: '/quotes' }),
  ev('quote.discount_approval_requested', 'revenue', 'Discount approval requested', ['approver'], 'warn', 'Discount approval needed on {quote}', 'A discount on {quote} exceeds threshold and needs your approval.', { cta: '/quotes' }),
  ev('quote.discount_approved', 'revenue', 'Discount approved', ['owner', 'approver'], 'success', 'Discount approved on {quote}', 'The requested discount on {quote} was approved.', { cta: '/quotes' }),
  ev('invoice.sent', 'revenue', 'Invoice sent', ['owner', 'finance'], 'info', 'Invoice {invoice} sent', 'Invoice {invoice} ({amount}) was sent to {company}.', { cta: '/invoices' }),
  ev('invoice.paid', 'revenue', 'Invoice paid', ['owner', 'finance', 'executives'], 'success', 'Invoice {invoice} paid ({amount})', '{company} paid invoice {invoice}. Cash in.', { cta: '/invoices' }),
  ev('invoice.overdue', 'revenue', 'Invoice overdue', ['owner', 'finance', 'executives'], 'warn', 'Invoice {invoice} overdue', 'Invoice {invoice} ({amount}) is past due.', { cta: '/invoices' }),
  ev('signature.completed', 'revenue', 'Signatures completed', ['owner', 'team', 'executives'], 'success', 'Signed: {document}', 'All signatures were collected on {document}.', { cta: '/signatures' }),
  ev('signature.signer_signed', 'revenue', 'Signer signed', ['owner'], 'info', '{signer} signed {document}', '{signer} completed signing {document}.', { cta: '/signatures' }),
  ev('payment.link_paid', 'revenue', 'Payment link paid', ['owner', 'finance'], 'success', 'Payment received ({amount})', 'A payment link checkout succeeded for {amount}.', { cta: '/payments' }),
  ev('payment.charge_failed', 'revenue', 'Charge failed', ['owner', 'finance'], 'warn', 'Charge failed for {company}', 'A charge for {company} ({amount}) failed.', { cta: '/payments' }),
  ev('subscription.renewed', 'revenue', 'Subscription renewed', ['owner', 'finance'], 'success', 'Subscription renewed: {company}', '{company} renewed their subscription ({amount}).', { cta: '/payments' }),
  ev('subscription.payment_failed', 'revenue', 'Subscription payment failed', ['owner', 'finance'], 'warn', 'Dunning: {company} payment failed', 'A recurring charge failed for {company}. Dunning has started.', { cta: '/payments' }),
  ev('subscription.cancelled', 'revenue', 'Subscription cancelled', ['owner', 'finance', 'executives'], 'warn', 'Subscription cancelled: {company}', '{company} cancelled their subscription.', { cta: '/payments' }),
  ev('affiliate.commission_earned', 'revenue', 'Commission earned', ['team', 'finance'], 'info', 'Affiliate commission earned', 'A partner earned a commission worth {amount}.', { cta: '/affiliates' }),

  // ---- Intelligence ----
  ev('report.delivered', 'intelligence', 'Report delivered', ['assignee'], 'info', 'Your report: {report}', 'Your scheduled report, {report}, is ready.', { cta: '/reports' }),
  ev('report.delivery_failed', 'intelligence', 'Report delivery failed', ['actor', 'admins'], 'warn', 'Report delivery failed', 'The scheduled delivery of {report} failed to send.', { cta: '/reports' }),
  ev('dashboard.shared', 'intelligence', 'Dashboard shared', ['assignee'], 'info', 'A dashboard was shared with you', '{actor} shared a dashboard with you.', { cta: '/dashboards' }),
  ev('signal.churn_critical', 'intelligence', 'Critical churn signal', ['assignee', 'executives'], 'critical', 'Critical churn signal: {account}', 'A churn score for {account} crossed the critical threshold.', { cta: '/signals' }),
  ev('signal.expansion_hot', 'intelligence', 'Hot expansion signal', ['assignee'], 'success', 'Expansion signal hot: {account}', 'An expansion propensity crossed the hot threshold on {account}.', { cta: '/signals' }),
  ev('signal.intent_spike', 'intelligence', 'Intent spike', ['assignee', 'team'], 'info', 'Buyer intent spike: {company}', 'A buyer-intent spike was detected on {company}.', { cta: '/signals' }),
  ev('twin.simulation_complete', 'intelligence', 'Revenue Twin ready', ['executives'], 'info', 'Revenue Twin simulation ready', 'A Monte Carlo revenue simulation finished. Results are ready.', { cta: '/twin' }),
  ev('windtunnel.stress_complete', 'intelligence', 'Wind Tunnel complete', ['owner', 'executives'], 'info', 'Wind Tunnel stress test done', 'A deal stress test finished on {deal}.', { cta: '/wind-tunnel' }),
  ev('boardroom.memo_filed', 'intelligence', 'Board memo filed', ['executives', 'team'], 'info', 'Decision memo filed', 'A Boardroom decision memo was approved and filed.', { cta: '/app' }),

  // ---- Automate ----
  ev('workflow.activated', 'automate', 'Workflow activated', ['actor', 'admins'], 'info', 'Workflow live', '{actor} activated a workflow.', { cta: '/workflows' }),
  ev('workflow.enrollment_failed', 'automate', 'Workflow enrollment failed', ['owner', 'admins'], 'warn', 'Workflow step failed', 'A record failed a step and its enrollment stopped.', { cta: '/workflows' }),
  ev('autopilot.enabled', 'automate', 'Autopilot enabled', ['team', 'admins'], 'info', 'Autopilot is on', 'Autopilot SDR was turned on. Actions run inside your trust dial.', { cta: '/autopilot' }),
  ev('autopilot.action_queued', 'automate', 'Autopilot action queued', ['assignee'], 'info', 'Autopilot proposed a touch', 'A proposed touch is queued for your approval.', { cta: '/autopilot' }),
  ev('autopilot.daily_cap_reached', 'automate', 'Autopilot cap reached', ['admins', 'team'], 'warn', 'Autopilot daily cap reached', 'The daily auto-send cap was hit. Remaining actions are held.', { cta: '/autopilot' }),
  ev('nightshift.run_complete', 'automate', 'Night Shift complete', ['owner', 'team'], 'info', 'Night Shift proposals ready', 'Overnight, Night Shift prepared {count} proposals for review.', { cta: '/night-shift' }),
  ev('sms.alert_failed', 'automate', 'SMS failed', ['assignee', 'admins'], 'warn', 'SMS alert failed', 'An SMS alert failed to deliver.', { cta: '/sms' }),
  ev('queue.sla_breached', 'automate', 'Queue SLA breached', ['admins', 'assignee'], 'warn', 'Work queue SLA breached', 'A task queue item breached its SLA.', { cta: '/queue' }),

  // ---- Data ----
  ev('import.completed', 'data', 'Import completed', ['actor', 'admins'], 'success', 'Import finished', 'Your bulk import finished. {count} records were created.', { cta: '/import' }),
  ev('import.failed_rows', 'data', 'Import row failures', ['actor', 'admins'], 'warn', 'Import completed with failures', 'Your import finished, but some rows failed and need a look.', { cta: '/import' }),
  ev('migration.staged', 'data', 'Migration staged', ['actor', 'admins'], 'info', 'Migration staged for review', 'Your migration data is cleansed and staged. Review before pushing.', { cta: '/migrate' }),
  ev('migration.pushed', 'data', 'Migration pushed', ['admins', 'executives'], 'success', 'Migration pushed to production', 'The staged migration was pushed live to your production book.', { cta: '/migrate' }),
  ev('datasync.job_error', 'data', 'Data sync error', ['admins'], 'warn', 'Data sync connection error', 'A data sync connection is in an error state.', { cta: '/datasync' }),
  ev('datasync.health_degraded', 'data', 'Data health degraded', ['admins', 'executives'], 'warn', 'Data health score dropped', 'Your data health score dropped a band. Fix-queue items are waiting.', { cta: '/datasync' }),
  ev('duplicate.group_detected', 'data', 'Duplicate group found', ['admins', 'team'], 'info', 'New duplicate group', 'A new duplicate group was surfaced for review.', { cta: '/duplicates' }),
  ev('export.completed', 'data', 'Export completed', ['actor', 'security'], 'info', 'Your data export is ready', 'A workspace data export finished and is ready to download.', { cta: '/data-export' }),

  // ---- Files ----
  ev('drive.file_shared', 'files', 'File shared', ['assignee'], 'info', 'A file was shared with you', '{actor} shared a file with you in Drive.', { cta: '/drive' }),
  ev('drive.link_created', 'files', 'External link created', ['actor', 'security'], 'info', 'External share link created', 'An external share link was created for a Drive file.', { cta: '/drive' }),
  ev('sheets.comment_added', 'files', 'Sheet comment', ['owner'], 'info', 'New comment on a sheet', '{actor} commented on a shared spreadsheet.', { cta: '/sheets' }),

  // ---- Admin & Security ----
  ev('team.invite_sent', 'admin', 'Team invite sent', ['invitee', 'actor'], 'info', 'You are invited to {workspace} on Ardovo', '{actor} invited you to join the {workspace} workspace as {role}. Accept to get started.', { cta: '/login' }),
  ev('team.invite_accepted', 'admin', 'Invite accepted', ['admins', 'actor'], 'success', '{invitee} joined {workspace}', '{invitee} accepted the invite and joined the workspace.', { cta: '/team' }),
  ev('team.member_removed', 'admin', 'Member removed', ['admins', 'security'], 'warn', 'A member was removed', '{actor} removed a member from the workspace.', { cta: '/team' }),
  ev('team.role_changed', 'admin', 'Role changed', ['admins', 'assignee'], 'info', 'Your role changed to {role}', '{actor} changed your role in {workspace} to {role}.', { cta: '/team' }),
  ev('role.permissions_changed', 'admin', 'Role permissions changed', ['admins', 'security'], 'warn', 'Role permissions updated', '{actor} changed the capability matrix for the {role} role.', { cta: '/roles' }),
  ev('permissions.rule_changed', 'admin', 'Sharing rule changed', ['admins', 'security'], 'warn', 'Sharing rule updated', 'A sharing or field-level access rule was changed.', { cta: '/permissions' }),
  ev('module.enabled', 'admin', 'Module enabled', ['admins'], 'info', 'Module turned on: {module}', '{actor} enabled the {module} module for the workspace.', { cta: '/app-manager' }),
  ev('module.disabled', 'admin', 'Module disabled', ['admins'], 'info', 'Module turned off: {module}', '{actor} disabled the {module} module; its routes are now hidden.', { cta: '/app-manager' }),
  ev('integration.connected', 'admin', 'Integration connected', ['admins', 'actor'], 'info', 'Integration connected', '{actor} connected a new integration.', { cta: '/integrations' }),
  ev('integration.sync_error', 'admin', 'Integration sync error', ['admins'], 'warn', 'Integration sync error', 'A connected integration hit a sync or auth error.', { cta: '/integrations' }),
  ev('developers.api_key_created', 'admin', 'API key created', ['security', 'actor'], 'warn', 'New API key created', '{actor} minted a new API key ({keyName}). If this was not you, revoke it now.', { cta: '/developers' }),
  ev('developers.api_key_revoked', 'admin', 'API key revoked', ['security', 'admins'], 'info', 'API key revoked', 'The API key {keyName} was revoked.', { cta: '/developers' }),
  ev('developers.webhook_delivery_failed', 'admin', 'Webhook delivery failed', ['actor', 'admins'], 'warn', 'Webhook delivery failed', 'An outbound webhook delivery failed after retries.', { cta: '/developers' }),
  ev('audit.export_requested', 'admin', 'Audit export requested', ['security'], 'info', 'Audit log export requested', '{actor} requested an export of the audit log.', { cta: '/audit' }),
  ev('sandbox.promoted', 'admin', 'Sandbox promoted', ['admins', 'executives'], 'info', 'Sandbox promoted to production', 'Changes from a sandbox were promoted to production.', { cta: '/sandboxes' }),
  ev('marketplace.app_installed', 'admin', 'Marketplace app installed', ['admins'], 'info', 'Marketplace app installed', '{actor} installed a marketplace app.', { cta: '/marketplace' }),
  ev('workspace.created', 'admin', 'Workspace created', ['admins', 'executives'], 'info', 'New workspace created', 'A new sub-account workspace was created.', { cta: '/workspaces' }),
  ev('billing.payment_failed', 'admin', 'Billing payment failed', ['admins', 'finance'], 'critical', 'Ardovo payment failed', 'Your Ardovo subscription payment failed. Update billing to avoid disruption.', { cta: '/billing-plans' }),
  ev('billing.plan_changed', 'admin', 'Plan changed', ['admins', 'finance'], 'info', 'Plan changed to {plan}', 'Your Ardovo plan changed to {plan} ({seats} seats).', { cta: '/billing-plans' }),

  // ---- Auth & Account ----
  ev('auth.signup', 'auth', 'Welcome / signup', ['actor', 'admins'], 'success', 'Welcome to Ardovo', 'Welcome, {user}. Your account is ready. Here is how to get the most out of day one.', { cta: '/app' }),
  ev('auth.signin_new_device', 'auth', 'New device sign-in', ['actor', 'security'], 'warn', 'New sign-in to your Ardovo account', 'We noticed a sign-in from {device} near {location}. If this was you, no action needed.', { cta: '/security-center' }),
  ev('auth.signin_failed', 'auth', 'Failed sign-in', ['security'], 'warn', 'Failed sign-in attempt', 'There were repeated failed sign-in attempts on your account.', { cta: '/security-center' }),
  ev('auth.password_reset_requested', 'auth', 'Password reset requested', ['actor'], 'info', 'Reset your Ardovo password', 'Use the secure link inside to set a new password. It expires shortly.', { cta: '/recover' }),
  ev('auth.password_changed', 'auth', 'Password changed', ['actor', 'security'], 'warn', 'Your password was changed', 'Your Ardovo password was just changed. If this was not you, act now.', { cta: '/recover' }),
  ev('auth.2fa_enabled', 'auth', 'Two-factor enabled', ['actor', 'security'], 'success', 'Two-factor is on', 'Two-factor authentication was enabled on your account. Nice - you are locked down.', { cta: '/security-center' }),
  ev('auth.2fa_disabled', 'auth', 'Two-factor disabled', ['actor', 'security', 'admins'], 'warn', 'Two-factor was disabled', 'Two-factor authentication was turned off on your account.', { cta: '/security-center' }),
  ev('auth.recovery_codes_generated', 'auth', 'Recovery codes generated', ['actor', 'security'], 'info', 'New recovery codes issued', 'A fresh set of two-factor recovery codes was generated.', { cta: '/security-center' }),
  ev('auth.recovery_code_used', 'auth', 'Recovery code used', ['actor', 'security'], 'warn', 'A recovery code was used', 'A recovery code was used to sign in to your account.', { cta: '/security-center' }),

  // ---- Agents & Training ----
  ev('agent.deployed', 'agent', 'Agent deployed', ['admins', 'team'], 'info', 'Cloud agent deployed', 'A cloud agent was deployed to your workspace.', { cta: '/app' }),
  ev('agent.run_failed', 'agent', 'Agent run failed', ['admins', 'actor'], 'warn', 'Agent run failed', 'An agent run failed. The trace is available for review.', { cta: '/app' }),
  ev('agent.trust_policy_changed', 'agent', 'Trust policy changed', ['admins', 'security'], 'warn', 'Agent trust policy updated', 'The agent trust or model policy was updated.', { cta: '/app' }),
  ev('training.lesson_completed', 'agent', 'Training lesson done', ['actor'], 'success', 'Lesson complete - nice work', 'You completed a training lesson. Momentum is building.', { cta: '/app' }),
  ev('training.group_session_scheduled', 'agent', 'Group training scheduled', ['team'], 'info', 'Group training session scheduled', 'A group training session is on the calendar.', { cta: '/app' }),
  ev('liftoff.intake_complete', 'agent', 'Liftoff intake complete', ['executives', 'admins'], 'info', 'Onboarding intake complete', 'The Liftoff onboarding wizard was completed.', { cta: '/app' }),
  ev('rook.plan_executed', 'agent', 'Rook plan executed', ['actor', 'team'], 'info', 'Rook executed a plan', 'Rook completed a multi-step plan. Here is what changed.', { cta: '/app' }),
];

export const eventByKey = (key) => EVENTS.find(e => e.key === key);
export const eventsByDomain = (domainId) => EVENTS.filter(e => e.domain === domainId);

// ============================================================
// RENDERING - one branded shell, teal/light, email-safe tables.
// ============================================================
function shell({ accent, title, bodyHtml, ctaLabel, ctaHref, preheader }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a2030;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader || title}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -18px rgba(16,24,40,.25);">
<tr><td style="height:5px;background:${accent};"></td></tr>
<tr><td style="padding:26px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#14b8a6,#0e9f8f);text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-size:18px;font-family:'Space Grotesk',sans-serif;">A</td>
<td style="padding-left:10px;font-weight:800;font-size:17px;color:#0d1117;">Ardovo</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 32px 4px 32px;">
<h1 style="margin:0;font-size:21px;line-height:1.3;font-weight:800;color:#0d1117;font-family:'Space Grotesk',sans-serif;">${title}</h1>
</td></tr>
<tr><td style="padding:8px 32px 4px 32px;font-size:15px;line-height:1.6;color:#3a4150;">${bodyHtml}</td></tr>
${ctaLabel ? `<tr><td style="padding:20px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${accent};">
<a href="${ctaHref}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
</td></tr></table></td></tr>` : ''}
<tr><td style="padding:22px 32px 26px 32px;border-top:1px solid #e5e9ef;margin-top:12px;">
<p style="margin:14px 0 0 0;font-size:12.5px;line-height:1.6;color:#8a92a3;">You are getting this because of your notification settings in Ardovo. Manage what lands in your inbox in the <a href="${APP_URL}/email-center" style="color:#0e9f8f;text-decoration:none;">Email Center</a>, or reply to this email - we read every one.</p>
<p style="margin:10px 0 0 0;font-size:12.5px;color:#a0a7b4;">Ardovo - the AI-native revenue platform. Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#0e9f8f;text-decoration:none;">${SUPPORT_EMAIL}</a> &middot; &copy; ${year}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// Render a single event's email to full HTML. tokens override DEFAULT_TOKENS.
export function renderEmailHtml(eventKey, tokens = {}) {
  const e = eventByKey(eventKey);
  if (!e) return { subject: '(unknown event)', html: '<p>Unknown event.</p>' };
  const t = { ...DEFAULT_TOKENS, ...tokens };
  const accent = SEV_COLOR[e.severity] || SEV_COLOR.info;
  const subject = fill(e.subject, t);
  const summary = fill(e.summary, t);
  const rows = typeof e.rows === 'function' ? e.rows(t) : null;
  let body = `<p style="margin:0 0 6px 0;">${summary}</p>`;
  if (rows && rows.length) {
    body += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #e5e9ef;border-radius:10px;overflow:hidden;">';
    rows.forEach(([k, v], i) => {
      body += `<tr style="background:${i % 2 ? '#f7f8fc' : '#ffffff'};"><td style="padding:9px 14px;font-size:13px;color:#8a92a3;width:38%;">${k}</td><td style="padding:9px 14px;font-size:13.5px;color:#1a2030;font-weight:600;">${v}</td></tr>`;
    });
    body += '</table>';
  }
  const ctaHref = APP_URL + (e.cta || '/app');
  const html = shell({ accent, title: subject, bodyHtml: body, ctaLabel: 'Open in Ardovo', ctaHref, preheader: summary });
  return { subject, html, accent };
}

// Render an executive digest (a rollup, not a per-event blast).
export function renderDigestHtml(digest, tokens = {}) {
  const t = { ...DEFAULT_TOKENS, ...tokens };
  const accent = '#7c5cf7';
  const sections = (digest.sections || []).map(s => {
    const items = (s.items || []).map(it => `<li style="margin:4px 0;font-size:14px;color:#3a4150;">${fill(it, t)}</li>`).join('');
    return `<div style="margin-top:18px;"><div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#7c5cf7;">${s.title}</div><ul style="margin:8px 0 0 0;padding-left:18px;">${items}</ul></div>`;
  }).join('');
  const body = `<p style="margin:0;">${fill(digest.intro, t)}</p>${sections}<p style="margin:20px 0 0 0;font-size:12.5px;color:#8a92a3;">This is a batched summary. We do not send these more than once per ${digest.cadence}. Adjust cadence in the Email Center.</p>`;
  const html = shell({ accent, title: digest.title, bodyHtml: body, ctaLabel: 'Open dashboard', ctaHref: APP_URL + '/dashboards', preheader: fill(digest.intro, t) });
  return { subject: digest.title, html, accent };
}

// The executive digest definitions (batched rollups, anti-harassment by design).
export const DIGESTS = [
  { key: 'digest.daily_pipeline', title: 'Your daily pipeline pulse', cadence: 'day', audience: ['executives', 'team'],
    intro: 'A quick pulse on the pipeline since yesterday - one email, no firehose.',
    sections: [
      { title: 'Movement', items: ['{count} deals advanced a stage', '2 deals closed won ({value} total)', '1 deal slipped to next period'] },
      { title: 'Needs attention', items: ['3 tasks overdue across the team', '1 deal idle for 14+ days'] },
    ] },
  { key: 'digest.weekly_revenue', title: 'Weekly revenue summary', cadence: 'week', audience: ['executives', 'finance'],
    intro: 'Where revenue stands this week, at a glance.',
    sections: [
      { title: 'Booked', items: ['{count} quotes accepted', 'Invoices paid: {amount}', '2 subscriptions renewed'] },
      { title: 'At risk', items: ['{amount} in overdue AR', '1 subscription payment failed (dunning)'] },
    ] },
  { key: 'digest.weekly_customer', title: 'Weekly customer health', cadence: 'week', audience: ['executives'],
    intro: 'Account health and renewals for the week.',
    sections: [
      { title: 'Health', items: ['Health mix steady week over week', '1 account moved to watch'] },
      { title: 'Renewals + risk', items: ['3 renewals inside 90 days', '1 account entered the churn-risk queue'] },
    ] },
  { key: 'digest.monthly_board', title: 'Monthly board pack', cadence: 'month', audience: ['executives'],
    intro: 'The monthly rollup for leadership. Forecast, retention, and the top risks - nothing more.',
    sections: [
      { title: 'Performance', items: ['Forecast vs quota: {percent}', 'Net revenue retention trending up', 'Top 3 wins of the month'] },
      { title: 'Watch list', items: ['Top 3 at-risk accounts', 'Pipeline coverage for next quarter'] },
    ] },
  { key: 'digest.monthly_security', title: 'Monthly security summary', cadence: 'month', audience: ['security', 'executives'],
    intro: 'A calm monthly view of account security - only what matters.',
    sections: [
      { title: 'Access', items: ['2FA coverage across the team', 'New and revoked API keys this month'] },
      { title: 'Events', items: ['Sign-in anomalies reviewed', 'No unresolved security incidents'] },
    ] },
];
export const digestByKey = (key) => DIGESTS.find(d => d.key === key);
