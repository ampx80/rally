// Developers - the Rally public API console.
//
// A real developer surface: create / copy / reveal / revoke API keys, subscribe
// to outbound webhooks (with a live "send test event" that hits the SSRF-guarded
// dispatcher), a copyable endpoint reference with curl examples, and the rate
// limit contract. A billion-dollar platform is extensible, and this is where a
// developer starts. Keys + subscriptions persist locally for the demo console.
//
// ASCII only. No em-dash / en-dash.
import React, { useMemo, useState } from 'react';
import { Card, Badge, Button, SectionHeader, Field, Input, Select, Modal, useToast, EmptyState } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { useApiKeys, createKey, revokeKey, deleteKey } from '../lib/apikeys.js';

// Mirror of api/webhooks-dispatch.js WEBHOOK_EVENTS (client cannot import the
// server module, which pulls node:crypto). Keep in sync.
const WEBHOOK_EVENTS = [
  'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'contact.created', 'contact.updated',
  'company.created', 'company.updated',
  'activity.created', 'activity.completed',
];

const WEBHOOK_LS = 'rally_webhooks_v1';
const loadHooks = () => { try { return JSON.parse(localStorage.getItem(WEBHOOK_LS)) || []; } catch { return []; } };
const saveHooks = (h) => { try { localStorage.setItem(WEBHOOK_LS, JSON.stringify(h)); } catch {} };

const apiBase = () => (typeof window !== 'undefined' ? window.location.origin : 'https://rally.app');

/* ---------- clipboard helper ---------- */
function useCopy() {
  const toast = useToast();
  return (text, label = 'Copied') => {
    const done = () => toast(label);
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done)); }
      else fallback(text, done);
    } catch { fallback(text, done); }
  };
}
function fallback(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done();
  } catch {}
}

/* ---------- copyable code block ---------- */
function CodeBlock({ code, lang = 'bash' }) {
  const copy = useCopy();
  return (
    <div style={{ position: 'relative', background: 'var(--nav)', borderRadius: 'var(--r-sm)', border: '1px solid var(--nav-line)' }}>
      <button onClick={() => copy(code, 'Snippet copied')} className="btn btn-quiet btn-sm"
        style={{ position: 'absolute', top: 8, right: 8, color: 'var(--nav-muted)', padding: '.3rem .5rem', zIndex: 1 }}
        aria-label="Copy snippet">
        <Icon name="copy" size={15} />
      </button>
      <pre style={{ margin: 0, padding: '1rem 1.1rem', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '.82rem', lineHeight: 1.6, color: '#d6d9f0' }}>
        <code data-lang={lang}>{code}</code>
      </pre>
    </div>
  );
}

/* ---------- endpoint reference row ---------- */
const METHOD_TONE = { GET: 'info', POST: 'accent', DELETE: 'risk' };
function Endpoint({ method, path, desc, curl }) {
  const [open, setOpen] = useState(false);
  return (
    <Card pad={false} style={{ overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} className="row between" style={{ width: '100%', gap: 12, padding: '.85rem 1.1rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Badge tone={METHOD_TONE[method] || 'default'} style={{ fontFamily: 'var(--font-mono)', minWidth: 52, justifyContent: 'center' }}>{method}</Badge>
          <span className="clip" style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--ink)', fontWeight: 600 }}>{path}</span>
        </span>
        <span className="row gap-2" style={{ alignItems: 'center', flex: 'none' }}>
          <span className="t-sm muted hide-520">{desc}</span>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        </span>
      </button>
      {open && <div style={{ padding: '0 1.1rem 1.1rem' }}><CodeBlock code={curl} /></div>}
    </Card>
  );
}

/* ============================================================
   KEYS
   ============================================================ */
function CreatedKeyModal({ created, onClose }) {
  const copy = useCopy();
  if (!created) return null;
  return (
    <Modal open onClose={onClose} title="Save your API key" width={560}
      footer={<Button onClick={onClose}>Done</Button>}>
      <div className="col gap-3">
        <div className="row gap-2" style={{ alignItems: 'flex-start', background: 'var(--warn-bg, rgba(224,117,45,.1))', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.8rem 1rem' }}>
          <Icon name="shield" size={18} style={{ color: 'var(--warn)', flex: 'none', marginTop: 2 }} />
          <div className="t-sm">This is the only time the full key is shown. Copy it now and store it somewhere safe. You can revoke it any time.</div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center', background: 'var(--nav)', borderRadius: 'var(--r-sm)', padding: '.7rem .9rem' }}>
          <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: '#d6d9f0', wordBreak: 'break-all' }}>{created.secret}</code>
          <Button size="sm" onClick={() => copy(created.secret, 'API key copied')}><Icon name="copy" size={15} /> Copy</Button>
        </div>
      </div>
    </Modal>
  );
}

function KeysPanel() {
  const keys = useApiKeys();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [env, setEnv] = useState('live');
  const [created, setCreated] = useState(null);

  const submit = () => {
    const rec = createKey({ name, env });
    setCreated(rec);
    setShowNew(false); setName(''); setEnv('live');
  };
  const revoke = (k) => { revokeKey(k.id); toast('Key revoked. It can no longer authenticate.', 'warn'); };

  const active = keys.filter(k => !k.revoked).length;

  return (
    <Card>
      <SectionHeader
        title="API keys"
        sub={`${active} active. Authenticate every request with an Authorization: Bearer header.`}
        action={<Button size="sm" onClick={() => setShowNew(true)}><Icon name="plus" size={15} /> New key</Button>}
      />
      {keys.length === 0 ? (
        <EmptyState icon="&#128273;" title="No API keys yet" body="Create a key to start calling the Rally REST API." action={<Button onClick={() => setShowNew(true)}>Create your first key</Button>} />
      ) : (
        <div className="col gap-2" style={{ marginTop: '.5rem' }}>
          {keys.map(k => (
            <div key={k.id} className="row between" style={{ gap: 12, padding: '.75rem .9rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', opacity: k.revoked ? 0.55 : 1 }}>
              <div className="col" style={{ minWidth: 0 }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="fw-6 clip" style={{ color: 'var(--ink)' }}>{k.name}</span>
                  <Badge tone={k.env === 'live' ? 'accent' : 'default'} className="t-xs">{k.env}</Badge>
                  {k.revoked && <Badge tone="risk" className="t-xs">revoked</Badge>}
                </div>
                <code className="clip" style={{ fontFamily: 'var(--font-mono)', fontSize: '.8rem', color: 'var(--n-600)' }}>{k.preview}</code>
              </div>
              <div className="row gap-1" style={{ flex: 'none' }}>
                {!k.revoked
                  ? <Button size="sm" variant="ghost" onClick={() => revoke(k)}>Revoke</Button>
                  : <Button size="sm" variant="ghost" onClick={() => deleteKey(k.id)} aria-label="Delete key"><Icon name="trash" size={15} /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create API key" width={480}
        footer={<><Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button><Button onClick={submit}>Create key</Button></>}>
        <div className="col gap-3">
          <Field label="Key name" hint="A label so you can recognize this key later.">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Production server" autoFocus />
          </Field>
          <Field label="Environment">
            <Select value={env} onChange={e => setEnv(e.target.value)}>
              <option value="live">Live (rk_live_)</option>
              <option value="test">Test (rk_test_)</option>
            </Select>
          </Field>
        </div>
      </Modal>
      <CreatedKeyModal created={created} onClose={() => setCreated(null)} />
    </Card>
  );
}

/* ============================================================
   WEBHOOKS
   ============================================================ */
function WebhooksPanel() {
  const toast = useToast();
  const [hooks, setHooks] = useState(loadHooks);
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState(WEBHOOK_EVENTS[0]);
  const [busy, setBusy] = useState(null);

  const persist = (next) => { setHooks(next); saveHooks(next); };

  const add = () => {
    const clean = url.trim();
    if (!/^https:\/\//i.test(clean)) { toast('Webhook URL must be a public https URL.', 'risk'); return; }
    const secret = 'whsec_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const rec = { id: 'wh_' + Math.random().toString(36).slice(2, 10), url: clean, event, secret, createdAt: new Date().toISOString() };
    persist([rec, ...hooks]);
    setUrl('');
    toast('Webhook subscription added.');
  };

  const remove = (id) => persist(hooks.filter(h => h.id !== id));

  const sendTest = async (h) => {
    setBusy(h.id);
    try {
      const r = await fetch('/api/webhooks-dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: h.url, event: h.event, secret: h.secret, data: { sample: true, note: 'Test event from the Rally developer console.' } }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ok) toast(`Delivered ${h.event} (HTTP ${j.status}).`);
      else toast(`Delivery failed: ${j.error || 'endpoint unreachable'}.`, 'risk');
    } catch (e) {
      toast('Could not reach the dispatcher.', 'risk');
    } finally { setBusy(null); }
  };

  return (
    <Card>
      <SectionHeader title="Webhooks" sub="Get a signed POST the moment something changes in Rally. Deliveries are HMAC-SHA256 signed." />
      <div className="row gap-2 wrap" style={{ alignItems: 'flex-end', marginTop: '.4rem' }}>
        <div style={{ flex: '2 1 260px' }}>
          <Field label="Subscriber URL">
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.yourapp.com/webhooks/rally" />
          </Field>
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <Field label="Event">
            <Select value={event} onChange={e => setEvent(e.target.value)}>
              {WEBHOOK_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </Select>
          </Field>
        </div>
        <Button onClick={add}><Icon name="plus" size={15} /> Subscribe</Button>
      </div>

      {hooks.length > 0 && (
        <div className="col gap-2" style={{ marginTop: '1rem' }}>
          {hooks.map(h => (
            <div key={h.id} className="row between" style={{ gap: 12, padding: '.75rem .9rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
              <div className="col" style={{ minWidth: 0 }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Badge tone="accent" className="t-xs" style={{ fontFamily: 'var(--font-mono)' }}>{h.event}</Badge>
                </div>
                <code className="clip" style={{ fontFamily: 'var(--font-mono)', fontSize: '.8rem', color: 'var(--n-600)' }}>{h.url}</code>
              </div>
              <div className="row gap-1" style={{ flex: 'none' }}>
                <Button size="sm" variant="ghost" onClick={() => sendTest(h)} disabled={busy === h.id}>{busy === h.id ? 'Sending...' : 'Send test'}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(h.id)} aria-label="Remove"><Icon name="trash" size={15} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Developers() {
  const base = apiBase();
  const endpoints = useMemo(() => ([
    { method: 'GET', path: '/api/v1/deals', desc: 'List deals', curl:
`curl ${base}/api/v1/deals?limit=10&stage=negotiation \\
  -H "Authorization: Bearer rk_live_demo_rally"` },
    { method: 'GET', path: '/api/v1/deals?id=d_1', desc: 'Get a deal', curl:
`curl ${base}/api/v1/deals?id=d_1 \\
  -H "Authorization: Bearer rk_live_demo_rally"` },
    { method: 'POST', path: '/api/v1/deals', desc: 'Create a deal', curl:
`curl -X POST ${base}/api/v1/deals \\
  -H "Authorization: Bearer rk_live_demo_rally" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme - Platform rollout","value":120000,"stage":"proposal"}'` },
    { method: 'GET', path: '/api/v1/contacts', desc: 'List contacts', curl:
`curl ${base}/api/v1/contacts?limit=10 \\
  -H "Authorization: Bearer rk_live_demo_rally"` },
    { method: 'POST', path: '/api/v1/contacts', desc: 'Create a contact', curl:
`curl -X POST ${base}/api/v1/contacts \\
  -H "Authorization: Bearer rk_live_demo_rally" \\
  -H "Content-Type: application/json" \\
  -d '{"first_name":"Jordan","last_name":"Avery","email":"jordan@acme.com"}'` },
    { method: 'GET', path: '/api/v1/companies', desc: 'List companies', curl:
`curl ${base}/api/v1/companies?industry=SaaS \\
  -H "Authorization: Bearer rk_live_demo_rally"` },
    { method: 'POST', path: '/api/v1/companies', desc: 'Create a company', curl:
`curl -X POST ${base}/api/v1/companies \\
  -H "Authorization: Bearer rk_live_demo_rally" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme Robotics","industry":"Manufacturing"}'` },
  ]), [base]);

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 60%, var(--accent-700) 130%)', color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '56ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="command" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Developers</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)', lineHeight: 1.08, color: '#fff' }}>
              Build on Rally.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.05rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              A versioned REST API, signed outbound webhooks, and first-class key management.
              Everything your systems need to read and write revenue data programmatically.
            </p>
          </div>
          <div className="row gap-4" style={{ flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>v1</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>stable API</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1, color: 'var(--accent-300)' }}>120<span style={{ fontSize: '1rem' }}>/min</span></div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>rate limit</div>
            </div>
          </div>
        </div>
      </Card>

      {/* quick start */}
      <Card>
        <SectionHeader title="Quick start" sub="Every request is authenticated with a Bearer API key. Try the demo key below, then mint your own." />
        <div style={{ marginTop: '.6rem' }}>
          <CodeBlock code={`curl ${base}/api/v1/deals \\
  -H "Authorization: Bearer rk_live_demo_rally"`} />
        </div>
      </Card>

      <KeysPanel />
      <WebhooksPanel />

      {/* endpoint reference */}
      <Card>
        <SectionHeader title="API reference" sub="Click any endpoint for a copyable curl example. Full docs in docs/API.md." />
        <div className="col gap-2" style={{ marginTop: '.5rem' }}>
          {endpoints.map((e, i) => <Endpoint key={i} {...e} />)}
        </div>
      </Card>

      {/* rate limits + envelopes */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Card>
          <SectionHeader title="Rate limits" />
          <p className="t-sm muted" style={{ margin: '.4rem 0 .8rem' }}>Each key is limited to 120 requests per rolling 60 second window. Every response carries the current budget.</p>
          <CodeBlock lang="http" code={`X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1752192000

# 429 Too Many Requests when exceeded
Retry-After: 42`} />
        </Card>
        <Card>
          <SectionHeader title="Response envelope" />
          <p className="t-sm muted" style={{ margin: '.4rem 0 .8rem' }}>Lists return a data array plus pagination meta. Errors return a typed error object. Every response includes a request_id.</p>
          <CodeBlock lang="json" code={`{
  "data": [ { "id": "d_1", "name": "..." } ],
  "meta": { "pagination": {
    "total": 24, "count": 10,
    "limit": 10, "offset": 0,
    "has_more": true, "next_offset": 10
  } },
  "request_id": "req_9f2a..."
}`} />
        </Card>
      </div>

      {/* webhook signature verification */}
      <Card>
        <SectionHeader title="Verifying webhook signatures" sub="Every delivery is signed. Reject any request whose signature does not match." />
        <div style={{ marginTop: '.6rem' }}>
          <CodeBlock lang="javascript" code={`import crypto from 'node:crypto';

// header: X-Rally-Signature: t=<unix>,v1=<hex>
function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const expected = crypto
    .createHmac('sha256', secret)
    .update(parts.t + '.' + rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(parts.v1)
  );
}`} />
        </div>
      </Card>
    </div>
  );
}
