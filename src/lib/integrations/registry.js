// ============================================================
// ARDOVO INTEGRATION REGISTRY  (declarative descriptors)
// The sibling of src/lib/modules.js for the integration layer.
// One static array of connector DESCRIPTORS - the contract each
// real connector is built against. No network calls, no secrets,
// no side effects: this is the map, not the territory. Connectors
// (src/lib/integrations/connector.js) read a descriptor to know
// which events flow in, which flow out, and what a workspace has
// to supply to connect. The catalog page (src/pages/Integrations.jsx)
// stays as-is; this backbone drives real record + activity sync.
//
// Descriptor shape:
//   id             stable key (mirrors the source app's slug)
//   name           display name
//   category       grouping label (mirrors modules.js `section` idea)
//   logo           brand domain -> logo.clearbit.com/<logo> (monogram fallback)
//   operator       the app's in-product AI operator, for UI copy
//   summary        one line describing what connecting does
//   inboundEvents  events the source app emits INTO Ardovo
//                    [{ key, label, maps }]  maps = the Ardovo shape it becomes
//   outboundEvents events Ardovo emits OUT to the source app
//                    [{ key, label }]
//   connectFields  metadata a workspace supplies to connect
//                    [{ key, label, type, placeholder, required, secret }]
//                    secret:true fields are NEVER persisted client-side
//                    (see connections.js sanitize) - server-held only.
//
// SUPABASE: this becomes rally_integration_registry (seed/config table);
// per-workspace connection rows live in rally_connections (connections.js).
// ============================================================

// A stable, hand-curated seed: the three sibling Ardovo-network apps.
// Add a descriptor here to teach the backbone about a new source app.
export const INTEGRATIONS = [
  {
    id: 'tango',
    name: 'Tango',
    category: 'Scheduling',
    logo: 'tango-theta.vercel.app',
    operator: 'Rook',
    summary: 'Two-way sync of booked meetings, reschedules, and cancellations onto the right contact and deal.',
    inboundEvents: [
      { key: 'meeting.booked',      label: 'Meeting booked',      maps: 'activity:meeting' },
      { key: 'meeting.rescheduled', label: 'Meeting rescheduled', maps: 'activity:meeting' },
      { key: 'meeting.canceled',    label: 'Meeting canceled',    maps: 'activity:note' },
      { key: 'meeting.completed',   label: 'Meeting completed',   maps: 'activity:meeting' },
    ],
    outboundEvents: [
      { key: 'contact.upserted', label: 'Push contact + availability' },
      { key: 'deal.stage',       label: 'Push deal stage for routing' },
    ],
    connectFields: [
      { key: 'workspaceUrl', label: 'Tango workspace URL', type: 'url',  placeholder: 'https://tango-theta.vercel.app/acme', required: true,  secret: false },
      { key: 'apiKey',       label: 'Tango API key',       type: 'text', placeholder: 'tng_live_...',                       required: true,  secret: true  },
      { key: 'webhookSecret',label: 'Webhook signing secret', type: 'text', placeholder: 'whsec_...',                        required: false, secret: true  },
    ],
  },
  {
    id: 'resolve',
    name: 'Resolve',
    category: 'Support',
    logo: 'resolve-nine-beryl.vercel.app',
    operator: 'Reva',
    summary: 'Log support tickets, resolutions, and escalations against the customer record so revenue sees the full story.',
    inboundEvents: [
      { key: 'ticket.created',   label: 'Ticket opened',    maps: 'activity:note' },
      { key: 'ticket.resolved',  label: 'Ticket resolved',  maps: 'activity:note' },
      { key: 'ticket.escalated', label: 'Ticket escalated', maps: 'activity:task' },
      { key: 'csat.recorded',    label: 'CSAT recorded',    maps: 'activity:note' },
    ],
    outboundEvents: [
      { key: 'company.upserted', label: 'Push account + health' },
      { key: 'contact.upserted', label: 'Push contact roster' },
    ],
    connectFields: [
      { key: 'workspaceUrl', label: 'Resolve workspace URL', type: 'url',  placeholder: 'https://resolve-nine-beryl.vercel.app/acme', required: true,  secret: false },
      { key: 'apiKey',       label: 'Resolve API key',       type: 'text', placeholder: 'rsv_live_...',                              required: true,  secret: true  },
      { key: 'webhookSecret',label: 'Webhook signing secret', type: 'text', placeholder: 'whsec_...',                                required: false, secret: true  },
    ],
  },
  {
    id: 'theway',
    name: 'The Way',
    category: 'Coaching',
    logo: 'thewayhq.vercel.app',
    operator: 'The Way',
    summary: 'Bring coaching sessions, goals, and program enrollments into the timeline for post-sale delivery visibility.',
    inboundEvents: [
      { key: 'session.completed', label: 'Session completed', maps: 'activity:meeting' },
      { key: 'goal.updated',      label: 'Goal updated',      maps: 'activity:note' },
      { key: 'client.enrolled',   label: 'Client enrolled',   maps: 'activity:note' },
    ],
    outboundEvents: [
      { key: 'contact.upserted', label: 'Push client contact' },
      { key: 'deal.won',         label: 'Push closed-won to onboarding' },
    ],
    connectFields: [
      { key: 'workspaceUrl', label: 'The Way workspace URL', type: 'url',  placeholder: 'https://thewayhq.vercel.app/acme', required: true,  secret: false },
      { key: 'apiKey',       label: 'The Way API key',       type: 'text', placeholder: 'way_live_...',                      required: true,  secret: true  },
    ],
  },

  // ---- generic outbound connectors (additive) ----
  // Not sibling Ardovo apps but the universal escape hatches every CRM needs:
  // notify a channel, log mail, or fire an event at anything with a URL. They
  // route outbound through the SSRF-guarded /api/outbound proxy. Concrete
  // classes live in ./connectors/generic.js and read these descriptors by id.
  {
    id: 'slack',
    name: 'Slack',
    category: 'Comms',
    logo: 'slack.com',
    operator: 'Ardovo',
    summary: 'Post deal, contact, and activity alerts into any Slack channel through an incoming webhook.',
    inboundEvents: [],
    outboundEvents: [
      { key: 'record.alert', label: 'Post record alerts to a channel' },
      { key: 'deal.won',     label: 'Announce closed-won deals' },
    ],
    connectFields: [
      // A Slack incoming webhook URL is a capability URL, not a named secret;
      // it is stored as non-secret config so the browser can dispatch through
      // /api/outbound (the same pattern automations.js already uses). In a
      // server-backed deployment this moves into the server-only vault.
      { key: 'webhookUrl', label: 'Slack incoming webhook URL', type: 'url',  placeholder: 'https://hooks.slack.com/services/...', required: true,  secret: false },
      { key: 'channel',    label: 'Default channel',            type: 'text', placeholder: '#revenue',                            required: false, secret: false },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Email & calendar',
    logo: 'gmail.com',
    operator: 'Ardovo',
    summary: 'Log sent and received email against the matching contact and deal (OAuth exchanged server-side).',
    inboundEvents: [
      { key: 'email.received', label: 'Email received', maps: 'activity:email' },
      { key: 'email.sent',     label: 'Email sent',     maps: 'activity:email' },
    ],
    outboundEvents: [
      { key: 'email.send', label: 'Send email from Ardovo' },
    ],
    connectFields: [
      // OAuth tokens are exchanged and held server-side; nothing secret persists
      // client-side. The account email is the only non-secret pointer we keep.
      { key: 'accountEmail', label: 'Google account email', type: 'text', placeholder: 'you@company.com', required: true, secret: false },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook / Zapier',
    category: 'Automation',
    logo: 'zapier.com',
    operator: 'Ardovo',
    summary: 'Fire Ardovo record events as JSON to any HTTPS endpoint - Zapier, Make, or your own service.',
    inboundEvents: [],
    outboundEvents: [
      { key: 'record.event', label: 'Send record events as JSON' },
    ],
    connectFields: [
      { key: 'targetUrl', label: 'Destination webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/hooks/catch/...', required: true, secret: false },
    ],
  },
];

// ---- lookups (mirror modules.js helper style) ----

export function integrationById(id) {
  return INTEGRATIONS.find(i => i.id === id) || null;
}

export function integrationsByCategory() {
  const out = {};
  for (const i of INTEGRATIONS) (out[i.category] = out[i.category] || []).push(i);
  return out;
}

// The set of inbound event keys a source app can send (for webhook routing).
export function inboundEventKeys(id) {
  return (integrationById(id)?.inboundEvents || []).map(e => e.key);
}

// Which non-secret keys a connection may persist for this descriptor.
// connections.js also strips by name pattern; this is the allow-list.
export function nonSecretFieldKeys(id) {
  return (integrationById(id)?.connectFields || []).filter(f => !f.secret).map(f => f.key);
}

// Descriptor logo -> a display domain (used by ActivitySourceChip + any UI).
export function integrationLogoDomain(id) {
  return integrationById(id)?.logo || null;
}
