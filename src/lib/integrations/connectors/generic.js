// ============================================================
// ARDOVO GENERIC OUTBOUND CONNECTORS
// The universal escape hatches every CRM needs, built on the same
// Connector base contract as the sibling-app connectors:
//   - SlackConnector   post alerts to a channel (incoming webhook)
//   - GmailConnector   log/send mail (server-side OAuth; stub client-side)
//   - WebhookConnector generic Webhook / Zapier / Make outbound
//
// All outbound goes through the EXISTING same-origin /api/outbound proxy
// (SSRF-guarded: https only, no internal hosts, 8s timeout). The browser
// cannot POST to Slack/Zapier directly (CORS), so this route forwards it
// server-side - the exact pattern src/lib/automations.js already uses.
//
// ENV-GATED / NEVER-THROWS: a connector that is not connected, or has no
// destination URL configured, returns a graceful { ok:false, skipped:true }
// result instead of throwing. Nothing here fabricates data or fails loud.
//
// SECURITY: destination URLs (Slack incoming webhook, Zapier catch hook)
// are capability URLs stored as NON-secret connection metadata so the
// browser can dispatch them - identical to how automations.js holds a
// workflow's configured webhook. Named secrets (OAuth tokens, signing
// secrets) are stripped by connections.js and live server-side only.
// ============================================================
import { Connector } from '../connector.js';
import { integrationById } from '../registry.js';
import { getConnection } from '../connections.js';

const OUTBOUND_ENDPOINT = '/api/outbound';

// Minimal self-contained descriptor fallbacks so a connector NEVER throws in
// construction even if the registry descriptor is absent. When the registry
// has the id (it does - see registry.js), that richer descriptor wins.
const FALLBACK = {
  slack:   { id: 'slack',   name: 'Slack',           category: 'Comms',            logo: 'slack.com' },
  gmail:   { id: 'gmail',   name: 'Gmail',           category: 'Email & calendar', logo: 'gmail.com' },
  webhook: { id: 'webhook', name: 'Webhook / Zapier', category: 'Automation',      logo: 'zapier.com' },
};

function descriptorFor(id) {
  return integrationById(id) || FALLBACK[id];
}

// Dispatch one outbound call through the SSRF-guarded proxy. Fully defensive:
// no fetch (SSR/tests) or no url -> graceful skip; /api/outbound always answers
// 200 with { ok, ... } so we tolerate any shape and never reject.
async function postOutbound({ kind, url, message, payload }) {
  if (!url) return { ok: false, error: 'no-destination-url', skipped: true };
  if (typeof fetch !== 'function') return { ok: false, error: 'no-fetch', skipped: true };
  try {
    const r = await fetch(OUTBOUND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ kind, url, message, payload }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: !!data.ok, status: data.status, response: data.response, error: data.error || null };
  } catch (e) {
    return { ok: false, error: e?.message || 'request-failed' };
  }
}

/* ---------- Slack: outbound channel alerts ---------- */
export class SlackConnector extends Connector {
  constructor() { super(descriptorFor('slack')); }

  // The incoming-webhook URL captured at connect time (non-secret capability url).
  get webhookUrl() { return getConnection(this.id)?.metadata?.webhookUrl || null; }

  // Post a message to Slack. `url` overrides the stored webhook (e.g. a per-channel
  // hook). Returns a graceful skip when not connected or unconfigured.
  async notify(message, { payload = null, url = null } = {}) {
    if (!this.isConnected()) return { ok: false, error: 'not-connected', skipped: true };
    const target = url || this.webhookUrl;
    return postOutbound({ kind: 'slack', url: target, message, payload });
  }

  // Slack is outbound-only: override the base seams with graceful no-ops so
  // callers that loop every connector do not hit NotImplemented.
  async sync() { return { imported: 0, linked: 0, unlinked: 0, note: 'Slack is outbound-only.' }; }
}

/* ---------- Gmail: mail logging (server-side OAuth; client-side stub) ---------- */
export class GmailConnector extends Connector {
  constructor() { super(descriptorFor('gmail')); }

  // Real pull happens server-side against the OAuth grant. Until that route
  // exists this is a graceful stub - it never throws, never fabricates mail.
  async sync() {
    if (!this.isConnected()) return { imported: 0, linked: 0, unlinked: 0, error: 'not-connected' };
    return { imported: 0, linked: 0, unlinked: 0, note: 'Gmail sync runs server-side; no client-side pull yet.' };
  }

  // Normalize one inbound email into a Ardovo activity draft, stamped with
  // provenance so the timeline renders a "via Gmail" chip + open-in-Gmail link.
  mapRecord(email = {}) {
    return {
      type: 'email',
      subject: email.subject || '(no subject)',
      body: email.snippet || email.body || '',
      ...this.via(email.id, email.permalink || email.url || null),
    };
  }

  // Route one inbound email webhook: resolve who it belongs to, return a draft.
  // The caller decides whether to commit it via createActivity or park it.
  handleWebhook(payload = {}) {
    const from = payload.from || payload.email || null;
    const resolution = this.resolveIdentity({ email: from, name: payload.fromName || payload.name });
    return { resolution, draft: this.mapRecord(payload) };
  }
}

/* ---------- Webhook / Zapier: generic outbound JSON ---------- */
export class WebhookConnector extends Connector {
  constructor() { super(descriptorFor('webhook')); }

  get targetUrl() { return getConnection(this.id)?.metadata?.targetUrl || null; }

  // Fire an event as JSON at the configured endpoint. `event` is a short label,
  // `payload` any structured body. Graceful skip when not connected/unconfigured.
  async send(event, payload = null, { url = null } = {}) {
    if (!this.isConnected()) return { ok: false, error: 'not-connected', skipped: true };
    const target = url || this.targetUrl;
    return postOutbound({ kind: 'webhook', url: target, message: event || 'rally.event', payload: { event: event || null, ...(payload || {}) } });
  }

  async sync() { return { imported: 0, linked: 0, unlinked: 0, note: 'Webhook connector is outbound-only.' }; }
}

/* ---------- registry / factory ---------- */
const GENERIC = { slack: SlackConnector, gmail: GmailConnector, webhook: WebhookConnector };

// Stable ids for the generic connectors (used by UI + capability checks).
export const GENERIC_CONNECTOR_IDS = Object.keys(GENERIC);

// Build a generic connector instance by id. Returns null for an unknown id so
// callers can feature-detect without a try/catch.
export function genericConnector(id) {
  const C = GENERIC[id];
  return C ? new C() : null;
}

// True if `id` names one of the generic outbound connectors.
export function isGenericConnector(id) {
  return Object.prototype.hasOwnProperty.call(GENERIC, id);
}
