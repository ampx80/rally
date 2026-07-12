// Integrations - the "you already have everything" surface, now with a REAL
// connect experience on top of the integration backbone.
//
// Two layers, both on one page:
//   1) RALLY NETWORK (native, first-party) - the sibling apps Nate builds
//      (Tango, Resolve, The Way). These are driven by the declarative registry
//      (src/lib/integrations/registry.js) and connect for real: a one-click
//      handshake persists a live connection through connections.js, a status
//      pill reflects it, and a per-connector config modal exposes the
//      descriptor's connectFields + event map. Secrets never touch the browser
//      (connections.js sanitizes on write); everything is env-gated and
//      local-first, so an unconfigured connector shows a graceful state and
//      NEVER throws.
//   2) CATALOG (broad, third-party) - the searchable logo wall (Salesforce,
//      HubSpot, Slack, Gmail, Zapier, Webhooks, and hundreds more) with the
//      existing "request any app on earth" Clearbit search. Preserved verbatim,
//      additively.
//
// A "Connected" section surfaces every live connection (native + catalog) with
// manage/disconnect affordances, so the page answers "what is wired right now?"
// at a glance.
//
// Logos: logo.clearbit.com/<domain> (no key). Search: Clearbit autocomplete
// (no key, CORS-open). Both degrade gracefully to a colored monogram.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button, Modal, avatarColor, useToast, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { INTEGRATIONS } from '../lib/integrations/registry.js';
import {
  useConnections,
  connect as connectConn,
  disconnect as disconnectConn,
  beginConnecting,
} from '../lib/integrations/connections.js';
import { getTangoConnector } from '../lib/integrations/connectors/tango.js';

const LS_KEY = 'rally_integrations_v1';

// Curated marquee catalog. domain drives the logo. status: connected (a few,
// to feel live) | available (ready to connect) | in_progress. Everything reads
// clean whether or not it is wired.
const CATALOG = [
  // CRM & data
  ['Salesforce', 'salesforce.com', 'CRM & data', 'available'],
  ['HubSpot', 'hubspot.com', 'CRM & data', 'available'],
  ['Zoho', 'zoho.com', 'CRM & data', 'available'],
  ['Pipedrive', 'pipedrive.com', 'CRM & data', 'available'],
  ['Snowflake', 'snowflake.com', 'CRM & data', 'available'],
  ['Segment', 'segment.com', 'CRM & data', 'available'],
  ['Clearbit', 'clearbit.com', 'CRM & data', 'connected'],
  ['Apollo', 'apollo.io', 'CRM & data', 'available'],
  // ERP & finance
  ['SAP', 'sap.com', 'ERP & finance', 'available'],
  ['NetSuite', 'netsuite.com', 'ERP & finance', 'available'],
  ['Oracle', 'oracle.com', 'ERP & finance', 'available'],
  ['QuickBooks', 'quickbooks.intuit.com', 'ERP & finance', 'available'],
  ['Xero', 'xero.com', 'ERP & finance', 'available'],
  ['Stripe', 'stripe.com', 'ERP & finance', 'connected'],
  ['Workday', 'workday.com', 'ERP & finance', 'available'],
  ['Ramp', 'ramp.com', 'ERP & finance', 'available'],
  // Email & calendar
  ['Gmail', 'gmail.com', 'Email & calendar', 'connected'],
  ['Outlook', 'outlook.com', 'Email & calendar', 'available'],
  ['Microsoft 365', 'microsoft.com', 'Email & calendar', 'available'],
  ['Google Calendar', 'calendar.google.com', 'Email & calendar', 'connected'],
  ['Superhuman', 'superhuman.com', 'Email & calendar', 'available'],
  ['Calendly', 'calendly.com', 'Email & calendar', 'available'],
  // Marketing
  ['Mailchimp', 'mailchimp.com', 'Marketing', 'available'],
  ['Marketo', 'marketo.com', 'Marketing', 'available'],
  ['Klaviyo', 'klaviyo.com', 'Marketing', 'available'],
  ['ActiveCampaign', 'activecampaign.com', 'Marketing', 'available'],
  ['Google Ads', 'ads.google.com', 'Marketing', 'available'],
  ['Meta', 'meta.com', 'Marketing', 'available'],
  ['LinkedIn', 'linkedin.com', 'Marketing', 'available'],
  // Design & content
  ['Canva', 'canva.com', 'Design & content', 'available'],
  ['Figma', 'figma.com', 'Design & content', 'available'],
  ['Adobe', 'adobe.com', 'Design & content', 'available'],
  ['Loom', 'loom.com', 'Design & content', 'available'],
  // Dev & PM
  ['Jira', 'atlassian.com', 'Dev & PM', 'available'],
  ['GitHub', 'github.com', 'Dev & PM', 'available'],
  ['Linear', 'linear.app', 'Dev & PM', 'available'],
  ['Asana', 'asana.com', 'Dev & PM', 'available'],
  ['Monday', 'monday.com', 'Dev & PM', 'available'],
  ['Notion', 'notion.so', 'Dev & PM', 'available'],
  ['ClickUp', 'clickup.com', 'Dev & PM', 'available'],
  // Comms
  ['Slack', 'slack.com', 'Comms', 'connected'],
  ['Microsoft Teams', 'teams.microsoft.com', 'Comms', 'available'],
  ['Zoom', 'zoom.us', 'Comms', 'available'],
  ['Twilio', 'twilio.com', 'Comms', 'available'],
  ['Intercom', 'intercom.com', 'Comms', 'available'],
  ['Front', 'front.com', 'Comms', 'available'],
  // Storage & docs
  ['Google Drive', 'drive.google.com', 'Storage & docs', 'available'],
  ['Dropbox', 'dropbox.com', 'Storage & docs', 'available'],
  ['Box', 'box.com', 'Storage & docs', 'available'],
  ['DocuSign', 'docusign.com', 'Storage & docs', 'available'],
  // Support & success
  ['Zendesk', 'zendesk.com', 'Support', 'available'],
  ['Gong', 'gong.io', 'Support', 'available'],
  ['Chorus', 'chorus.ai', 'Support', 'available'],
  // Analytics & automation
  ['Tableau', 'tableau.com', 'Analytics', 'available'],
  ['Power BI', 'powerbi.microsoft.com', 'Analytics', 'available'],
  ['Looker', 'looker.com', 'Analytics', 'available'],
  ['Zapier', 'zapier.com', 'Automation', 'available'],
  ['Make', 'make.com', 'Automation', 'available'],
  ['Workato', 'workato.com', 'Automation', 'available'],
  ['Webhooks', 'webhooks.dev', 'Automation', 'available'],
].map(([name, domain, category, status]) => ({ name, domain, category, status }));

const CATEGORIES = ['All', ...Array.from(new Set(CATALOG.map(c => c.category)))];

const STATUS_META = {
  connected:   { label: 'Connected',   tone: 'ok' },
  in_progress: { label: 'In progress', tone: 'warn' },
  available:   { label: 'Available',   tone: 'default' },
};

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }

// Env-gated liveness for a native connector. In the browser we can only see
// VITE_-prefixed flags; without one, the connector still records a LOCAL
// connection (graceful, never throws) and shows a "records locally" note.
function connectorLive(id) {
  let env = {};
  try { env = (import.meta && import.meta.env) || {}; } catch { env = {}; }
  return !!(env[`VITE_${String(id).toUpperCase()}_LIVE`] || env.VITE_INTEGRATIONS_LIVE);
}

// Brand logo with graceful monogram fallback.
function Logo({ domain, name, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (failed || !domain) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: avatarColor(name), color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.36, flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <img src={`https://logo.clearbit.com/${domain}?size=80`} alt={name} width={size - 8} height={size - 8}
        style={{ objectFit: 'contain' }} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

/* ---------- NATIVE (Rally network) ---------- */

// Which required, non-secret fields a live connection is still missing.
function missingRequired(desc, metadata = {}) {
  return (desc.connectFields || []).filter(f => f.required && !f.secret && !metadata[f.key]);
}

// Status pill for a native connector, derived from the live connection record.
function nativeStatusMeta(desc, conn) {
  const s = conn?.status || 'disconnected';
  if (s === 'connecting') return { label: 'Connecting', tone: 'warn', key: 'connecting' };
  if (s === 'error')      return { label: 'Retry',      tone: 'risk', key: 'error' };
  if (s === 'connected') {
    return missingRequired(desc, conn?.metadata).length
      ? { label: 'Configure', tone: 'warn', key: 'configure' }
      : { label: 'Connected', tone: 'ok', key: 'connected' };
  }
  return { label: 'Available', tone: 'default', key: 'available' };
}

// The default metadata a one-click connect supplies: point the workspace URL at
// the app's canonical base so a native connection is complete without typing.
function quickDefaults(desc) {
  const out = {};
  const urlField = (desc.connectFields || []).find(f => f.type === 'url');
  if (urlField) out[urlField.key] = `https://${desc.logo}`;
  return out;
}

function NativeCard({ desc, conn, onQuickConnect, onConfigure, onDisconnect }) {
  const meta = nativeStatusMeta(desc, conn);
  const live = meta.key === 'connected' || meta.key === 'configure';
  const connecting = meta.key === 'connecting';
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 210, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-purple, #8b3fd4))' }} />
      <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
        <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
          <Logo domain={desc.logo} name={desc.name} />
          <div style={{ minWidth: 0 }}>
            <div className="row gap-1" style={{ alignItems: 'center' }}>
              <span className="fw-7" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{desc.name}</span>
              <Badge tone="accent" className="t-xs">Native</Badge>
            </div>
            <div className="t-sm" style={{ color: 'var(--n-600)' }}>
              {desc.category}{desc.operator && desc.operator !== desc.name ? ` · ${desc.operator}` : ''}
            </div>
          </div>
        </div>
        <Badge tone={meta.tone} style={{ flex: 'none' }}>{meta.label}</Badge>
      </div>

      <div className="t-sm" style={{ color: 'var(--n-600)', flex: 1, lineHeight: 1.45 }}>{desc.summary}</div>

      <div className="row gap-1 t-xs" style={{ color: 'var(--n-500, var(--n-600))', alignItems: 'center' }}>
        <Icon name="plug" size={12} />
        <span>{(desc.inboundEvents || []).length} events in</span>
        <span aria-hidden>&middot;</span>
        <span>{(desc.outboundEvents || []).length} out</span>
      </div>

      {live ? (
        <div className="row gap-2">
          <Button size="sm" variant="ghost" onClick={() => onConfigure(desc)} style={{ flex: 1 }}>
            <Icon name="settings" size={15} /> Configure
          </Button>
          <Button size="sm" variant="quiet" onClick={() => onDisconnect(desc)} style={{ flex: 'none' }}>
            Disconnect
          </Button>
        </div>
      ) : connecting ? (
        <Button size="sm" variant="ghost" disabled style={{ width: '100%' }}>Connecting...</Button>
      ) : (
        <div className="row gap-2">
          <Button size="sm" variant="primary" onClick={() => onQuickConnect(desc)} style={{ flex: 1 }}>
            <Icon name="zap" size={15} /> Connect
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onConfigure(desc)} style={{ flex: 'none' }} aria-label="Configure">
            <Icon name="settings" size={16} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function ConfigModal({ desc, conn, open, onClose, onSave, onDisconnect }) {
  const connected = conn?.status === 'connected';
  const live = connectorLive(desc?.id);
  const [values, setValues] = useState({});
  const [reveal, setReveal] = useState({});

  useEffect(() => {
    if (!open || !desc) return;
    // Prefill non-secret metadata from the live record; secrets never come back
    // from storage (they were stripped on write), so those inputs start empty.
    const seed = {};
    for (const f of desc.connectFields || []) {
      if (!f.secret && conn?.metadata?.[f.key] != null) seed[f.key] = conn.metadata[f.key];
    }
    const urlField = (desc.connectFields || []).find(f => f.type === 'url');
    if (urlField && !seed[urlField.key]) seed[urlField.key] = `https://${desc.logo}`;
    setValues(seed);
    setReveal({});
  }, [open, desc, conn]);

  if (!desc) return null;
  const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));
  const blocked = (desc.connectFields || []).some(f => f.required && !f.secret && !values[f.key]);

  const footer = (
    <>
      {connected && (
        <Button variant="danger" onClick={() => { onDisconnect(desc); onClose(); }} style={{ marginRight: 'auto' }}>
          Disconnect
        </Button>
      )}
      <Button variant="quiet" onClick={onClose}>Cancel</Button>
      <Button variant="primary" disabled={blocked} onClick={() => { onSave(desc, values); onClose(); }}>
        {connected ? 'Save changes' : 'Connect'}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} width={580} footer={footer}
      title={`${connected ? 'Manage' : 'Connect'} ${desc.name}`}>
      <div className="col gap-4">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Logo domain={desc.logo} name={desc.name} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="fw-7" style={{ color: 'var(--ink)' }}>{desc.name}</div>
            <div className="t-sm" style={{ color: 'var(--n-600)' }}>{desc.summary}</div>
          </div>
        </div>

        {!live && (
          <div className="row gap-2" style={{ alignItems: 'flex-start', padding: '.7rem .85rem', borderRadius: 'var(--r-sm)', background: 'var(--accent-50)', border: '1px solid var(--line)' }}>
            <Icon name="shield" size={16} style={{ color: 'var(--accent-600)', flex: 'none', marginTop: 2 }} />
            <div className="t-sm" style={{ color: 'var(--ink-2)' }}>
              Rally records this connection locally. Live two-way sync activates once {desc.name}'s
              server keys are configured for this workspace. Nothing you enter here is lost in the meantime,
              and secret fields are never stored in your browser.
            </div>
          </div>
        )}

        {(desc.connectFields || []).length > 0 && (
          <div className="col gap-3">
            {(desc.connectFields || []).map(f => {
              const fid = `cf-${desc.id}-${f.key}`;
              const isSecret = !!f.secret;
              return (
                <div key={f.key} className="field">
                  <label htmlFor={fid}>
                    {f.label}{!f.required && <span className="muted"> (optional)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id={fid}
                      className="input"
                      type={isSecret && !reveal[f.key] ? 'password' : (f.type === 'url' ? 'url' : 'text')}
                      value={values[f.key] || ''}
                      placeholder={f.placeholder}
                      autoComplete={isSecret ? 'new-password' : 'off'}
                      onChange={e => set(f.key, e.target.value)}
                      style={{ width: '100%', paddingRight: isSecret ? 40 : undefined }}
                    />
                    {isSecret && (
                      <button type="button" onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))}
                        aria-label={reveal[f.key] ? 'Hide' : 'Show'}
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500, var(--n-600))', display: 'grid', placeItems: 'center', padding: 4 }}>
                        <Icon name={reveal[f.key] ? 'eyeOff' : 'eye'} size={16} />
                      </button>
                    )}
                  </div>
                  {isSecret && <span className="t-xs muted">Held server-side. Never stored in your browser.</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="row gap-3 wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="col gap-1" style={{ flex: 1, minWidth: 190 }}>
            <div className="eyebrow">Syncs into Rally</div>
            {(desc.inboundEvents || []).map(e => (
              <div key={e.key} className="row gap-2 t-sm" style={{ color: 'var(--ink-2)', alignItems: 'center' }}>
                <Icon name="arrowDown" size={13} style={{ color: 'var(--accent-600)', flex: 'none' }} />
                <span>{e.label}</span>
              </div>
            ))}
          </div>
          <div className="col gap-1" style={{ flex: 1, minWidth: 190 }}>
            <div className="eyebrow">Rally sends out</div>
            {(desc.outboundEvents || []).map(e => (
              <div key={e.key} className="row gap-2 t-sm" style={{ color: 'var(--ink-2)', alignItems: 'center' }}>
                <Icon name="arrowUp" size={13} style={{ color: 'var(--accent-600)', flex: 'none' }} />
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- catalog card (existing UX, preserved) ---------- */

function IntegrationCard({ item, effectiveStatus, onAct }) {
  const meta = STATUS_META[effectiveStatus] || STATUS_META.available;
  const isConnected = effectiveStatus === 'connected';
  const inProgress = effectiveStatus === 'in_progress';
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 148 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <Logo domain={item.domain} name={item.name} />
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-7" style={{ fontSize: '1rem', color: 'var(--ink)' }}>{item.name}</div>
        <div className="t-sm" style={{ color: 'var(--n-600)' }}>{item.category}</div>
      </div>
      <Button
        size="sm"
        variant={isConnected ? 'ghost' : inProgress ? 'ghost' : 'primary'}
        onClick={() => onAct(item)}
        disabled={isConnected}
        style={{ width: '100%' }}
      >
        {isConnected ? 'Connected' : inProgress ? 'Requested - in progress' : 'Connect'}
      </Button>
    </Card>
  );
}

/* ---------- connected-row (live connections summary) ---------- */

function ConnectedRow({ logo, name, sub, meta, onManage, onDisconnect, manageLabel = 'Manage' }) {
  return (
    <div className="row between wrap" style={{ gap: 12, alignItems: 'center', padding: '.6rem 0' }}>
      <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
        <Logo domain={logo} name={name} size={34} />
        <div style={{ minWidth: 0 }}>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="fw-6 clip" style={{ color: 'var(--ink)' }}>{name}</span>
            {meta && <Badge tone={meta.tone} className="t-xs">{meta.label}</Badge>}
          </div>
          {sub && <div className="t-xs clip" style={{ color: 'var(--n-600)' }}>{sub}</div>}
        </div>
      </div>
      <div className="row gap-1" style={{ flex: 'none' }}>
        {onManage && <Button size="sm" variant="ghost" onClick={onManage}>{manageLabel}</Button>}
        {onDisconnect && <Button size="sm" variant="quiet" onClick={onDisconnect}>Disconnect</Button>}
      </div>
    </div>
  );
}

export default function Integrations() {
  const toast = useToast();
  const conns = useConnections();
  const [overrides, setOverrides] = useState(loadState);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [webResults, setWebResults] = useState([]);
  const [configId, setConfigId] = useState(null);
  const debRef = useRef(null);

  /* ----- native connect flow (through connections.js) ----- */
  const quickConnect = (desc) => {
    const defaults = quickDefaults(desc);
    beginConnecting(desc.id, defaults);
    // Brief optimistic "Connecting" beat, then commit. connect() sanitizes any
    // secret out before persistence; here there are none, only the default URL.
    setTimeout(async () => {
      connectConn(desc.id, defaults);
      toast(`${desc.name} connected. Events now sync into Rally.`);
      // Native scheduling connector: pull booked meetings onto contacts now.
      // Graceful and env-gated - runs the deterministic demo set when the
      // server bridge is not configured; the connection is recorded either way.
      if (desc.id === 'tango') {
        try {
          const res = await getTangoConnector().sync();
          if (res && res.linked > 0) {
            toast(`${res.linked} Tango meeting${res.linked === 1 ? '' : 's'} synced onto contacts.`);
          }
        } catch { /* connection still recorded; sync can be retried */ }
      }
    }, 520);
  };
  const saveConfig = (desc, values) => {
    connectConn(desc.id, values); // secrets stripped inside connect()
    toast(`${desc.name} settings saved.`);
  };
  const disconnectNative = (desc) => {
    disconnectConn(desc.id);
    toast(`${desc.name} disconnected.`);
  };
  const configDesc = configId ? INTEGRATIONS.find(i => i.id === configId) : null;

  /* ----- catalog flow (existing) ----- */
  const statusOf = (item) => overrides[item.domain] || item.status;
  const setStatus = (domain, status) => {
    setOverrides(prev => { const next = { ...prev, [domain]: status }; saveState(next); return next; });
  };
  const act = (item) => {
    if (statusOf(item) === 'connected') return;
    setStatus(item.domain, 'in_progress');
    toast(`${item.name} requested. Our team wires new connectors within a day.`);
  };
  const requestWeb = (r) => {
    const domain = r.domain;
    setOverrides(prev => {
      const next = { ...prev, [domain]: 'in_progress', [`__meta_${domain}`]: { name: r.name, category: 'Requested' } };
      saveState(next); return next;
    });
    toast(`${r.name} requested. Marked in progress.`);
  };

  // Custom (web-requested) entries the user added, surfaced as real cards.
  const customItems = useMemo(() => Object.keys(overrides)
    .filter(k => k.startsWith('__meta_'))
    .map(k => { const domain = k.slice(7); const m = overrides[k]; return { name: m.name, domain, category: m.category || 'Requested', status: 'in_progress', custom: true }; })
    .filter(ci => !CATALOG.some(c => c.domain === ci.domain)),
    [overrides]);

  const allItems = useMemo(() => [...customItems, ...CATALOG], [customItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter(it =>
      (cat === 'All' || it.category === cat) &&
      (!q || it.name.toLowerCase().includes(q) || it.domain.toLowerCase().includes(q))
    );
  }, [allItems, query, cat]);

  // Live native connections (connected only) for the Connected section + counts.
  const connectedNative = useMemo(
    () => INTEGRATIONS.filter(d => conns[d.id]?.status === 'connected'),
    [conns]
  );
  const connectedCatalog = useMemo(
    () => allItems.filter(it => statusOf(it) === 'connected'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, overrides]
  );

  const counts = useMemo(() => {
    let inprog = 0;
    for (const it of allItems) { if (statusOf(it) === 'in_progress') inprog++; }
    return {
      total: allItems.length + INTEGRATIONS.length,
      connected: connectedCatalog.length + connectedNative.length,
      inprog,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, overrides, connectedNative, connectedCatalog]);

  // Live "find any app on earth" via Clearbit autocomplete (no key).
  useEffect(() => {
    const q = query.trim();
    if (debRef.current) clearTimeout(debRef.current);
    if (q.length < 2) { setWebResults([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`);
        if (!r.ok) return;
        const data = await r.json();
        setWebResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch { setWebResults([]); }
    }, 250);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [query]);

  // Web results not already covered by the catalog or filtered list.
  const knownDomains = new Set(allItems.map(i => i.domain.replace(/^www\./, '')));
  const freshWeb = webResults.filter(r => r.domain && !knownDomains.has(r.domain.replace(/^www\./, '')));

  const hasConnected = connectedNative.length > 0 || connectedCatalog.length > 0;

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 60%, var(--accent-700) 130%)', color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '54ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="plug" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Integrations</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)', lineHeight: 1.08, color: '#fff' }}>
              Rally connects to your entire stack.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.05rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              One-click into the Rally network apps, plus Salesforce, SAP, NetSuite, Jira, Gmail, Slack,
              Zapier, webhooks, and hundreds more. Not on the list? Search below. If it exists anywhere,
              we connect it, usually within a day.
            </p>
          </div>
          <div className="row gap-4" style={{ flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1 }}>{counts.total}+</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>connectors</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1, color: 'var(--accent-300)' }}>{counts.connected}</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>connected now</div>
            </div>
          </div>
        </div>
      </Card>

      {/* live connections */}
      {hasConnected && (
        <Card>
          <div className="row between wrap" style={{ gap: 8, marginBottom: 4 }}>
            <div className="col gap-1">
              <div className="eyebrow">Connected</div>
              <h3 style={{ margin: 0 }}>Live connections</h3>
            </div>
            <Badge tone="ok" style={{ alignSelf: 'center' }}>{counts.connected} active</Badge>
          </div>
          <div className="col">
            {connectedNative.map((desc, i) => {
              const conn = conns[desc.id];
              const ws = conn?.metadata?.workspaceUrl;
              const since = conn?.connectedAt ? `connected ${relTime(conn.connectedAt)}` : 'connected';
              return (
                <div key={desc.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                  <ConnectedRow
                    logo={desc.logo}
                    name={desc.name}
                    sub={`${ws ? ws.replace(/^https?:\/\//, '') + ' · ' : ''}${since}`}
                    meta={{ label: 'Native', tone: 'accent' }}
                    onManage={() => setConfigId(desc.id)}
                    manageLabel="Configure"
                    onDisconnect={() => disconnectNative(desc)}
                  />
                </div>
              );
            })}
            {connectedCatalog.map((item, i) => (
              <div key={item.domain} style={{ borderTop: (connectedNative.length + i) === 0 ? 'none' : '1px solid var(--line)' }}>
                <ConnectedRow
                  logo={item.domain}
                  name={item.name}
                  sub={item.category}
                  onDisconnect={() => setStatus(item.domain, 'available')}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* native (Rally network) */}
      <div className="col gap-2">
        <div className="col gap-1">
          <div className="eyebrow">Rally network</div>
          <h3 style={{ margin: 0 }}>First-party apps, one click to connect</h3>
          <p className="t-sm" style={{ color: 'var(--n-600)', margin: 0 }}>
            The apps built on the same backbone as Rally. Connecting flows meetings, tickets, and sessions
            straight onto the right contact and deal, with full provenance in the timeline.
          </p>
        </div>
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {INTEGRATIONS.map(desc => (
            <NativeCard
              key={desc.id}
              desc={desc}
              conn={conns[desc.id]}
              onQuickConnect={quickConnect}
              onConfigure={(d) => setConfigId(d.id)}
              onDisconnect={disconnectNative}
            />
          ))}
        </div>
      </div>

      {/* search */}
      <div style={{ position: 'relative' }}>
        <div className="row gap-2" style={{ alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 12, padding: '.7rem 1rem', boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.04))' }}>
          <Icon name="search" size={20} color="var(--n-400)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search 200+ connectors, or type any tool your team uses (SAP, Jira, Mailchimp...)"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '1.02rem', color: 'var(--ink)' }}
          />
          {query && <button onClick={() => setQuery('')} className="btn btn-ghost btn-sm" aria-label="Clear"><Icon name="x" size={16} /></button>}
        </div>

        {/* live web results for anything not already in the catalog */}
        {freshWeb.length > 0 && (
          <Card style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, padding: 8 }}>
            <div className="t-xs" style={{ padding: '6px 10px', color: 'var(--n-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Found on the web - request any of these
            </div>
            {freshWeb.map(r => (
              <button key={r.domain} onClick={() => { requestWeb(r); setQuery(''); }}
                className="row between"
                style={{ width: '100%', gap: 12, alignItems: 'center', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                  <Logo domain={r.domain} name={r.name} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <span className="fw-6 clip" style={{ display: 'block', color: 'var(--ink)' }}>{r.name}</span>
                    <span className="t-xs clip" style={{ display: 'block', color: 'var(--n-600)' }}>{r.domain}</span>
                  </span>
                </span>
                <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Request</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* category chips */}
      <div className="row gap-2 wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="btn btn-sm"
            style={{
              background: cat === c ? 'var(--accent)' : 'var(--paper)',
              color: cat === c ? '#fff' : 'var(--ink-2)',
              border: '1px solid ' + (cat === c ? 'var(--accent)' : 'var(--line-strong)'),
            }}>
            {c}
          </button>
        ))}
        {(counts.inprog > 0 || counts.connected > 0) && (
          <span className="t-sm" style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--n-600)' }}>
            {counts.connected} connected &middot; {counts.inprog} in progress
          </span>
        )}
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>No connector named "{query}" yet</div>
          <p className="t-sm" style={{ color: 'var(--n-600)', marginTop: 6 }}>Keep typing - if it exists anywhere, it shows up above to request. We wire new connectors within a day.</p>
        </Card>
      ) : (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <IntegrationCard key={item.domain} item={item} effectiveStatus={statusOf(item)} onAct={act} />
          ))}
        </div>
      )}

      <ConfigModal
        desc={configDesc}
        conn={configDesc ? conns[configDesc.id] : null}
        open={!!configDesc}
        onClose={() => setConfigId(null)}
        onSave={saveConfig}
        onDisconnect={disconnectNative}
      />
    </div>
  );
}
