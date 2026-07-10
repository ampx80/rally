// Mailbox manager - connect email accounts three ways: Google OAuth, Microsoft
// OAuth, or manual SMTP + IMAP. Lives in Settings > Email. OAuth uses the
// /api/oauth-* foundation (real when the org sets provider keys, graceful SMTP
// fallback otherwise). SMTP is fully functional as a stored connection.
import React, { useEffect, useState } from 'react';
import {
  Card, Button, Badge, Field, Input, Select, Modal, useToast, EmptyState, Avatar,
} from './UI.jsx';
import { Icon } from './icons.jsx';
import {
  PROVIDERS, SMTP_PRESETS, useMailboxes, addMailbox, removeMailbox, setDefaultMailbox,
  testMailbox, startOAuth, providerMeta,
} from '../lib/mailboxes.js';

const STATUS_TONE = { connected: 'ok', pending: 'warn', error: 'risk' };

export default function MailboxManager() {
  const toast = useToast();
  const mailboxes = useMailboxes();
  const [modal, setModal] = useState(null); // null | 'choose' | 'smtp'

  // Finalize an OAuth round trip (redirected back with ?mailbox=1&status=...).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('mailbox') !== '1') return;
    const status = p.get('status'), provider = p.get('provider'), email = p.get('email');
    if (status === 'connected' && email) {
      addMailbox({ provider, email, displayName: p.get('name') || email, status: 'connected' });
      toast(`${email} connected.`, 'ok');
    } else if (status === 'notconfigured') {
      toast('That provider is not configured yet. Connect via SMTP instead.', 'warn');
    } else if (status === 'error') {
      toast(`Could not connect: ${p.get('message') || 'unknown error'}`, 'risk');
    }
    // clean the querystring
    window.history.replaceState({}, '', window.location.pathname + '?tab=email');
  }, []);

  async function connectOAuth(provider) {
    toast(`Opening ${providerMeta(provider).short} sign in...`);
    const res = await startOAuth(provider);
    if (res.configured && res.url) { window.location.href = res.url; return; }
    toast(res.message || 'Provider not configured. Use SMTP.', 'warn');
    setModal('smtp');
  }

  return (
    <Card className="col" style={{ gap: '1.25rem' }}>
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1">
          <h4 style={{ margin: 0 }}>Email + calendar</h4>
          <span className="muted t-sm" style={{ maxWidth: '56ch' }}>
            Connect a mailbox so Rally can send from your address and log email + meetings on the timeline.
            Use one-click Google or Microsoft, or connect any provider with SMTP.
          </span>
        </div>
        <Button size="sm" onClick={() => setModal('choose')}><Icon name="plus" size={15} /> Connect a mailbox</Button>
      </div>

      {mailboxes.length === 0 ? (
        <EmptyState icon="📬" title="No mailbox connected yet"
          body="Connect your email to send from Rally and capture every reply automatically."
          action={<Button variant="accent" onClick={() => setModal('choose')}>Connect a mailbox</Button>} />
      ) : (
        <div className="col gap-2">
          {mailboxes.map(m => {
            const pm = providerMeta(m.provider);
            return (
              <div key={m.id} className="row between gap-2 wrap" style={{ padding: '.85rem 1rem', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
                  <span className="row center" style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', background: `${pm.color}1a`, color: pm.color }}>
                    <Icon name={pm.icon} size={19} />
                  </span>
                  <div className="col" style={{ minWidth: 0, gap: 1 }}>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                      <span className="fw-7" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</span>
                      {m.isDefault && <Badge tone="accent" className="t-xs">Default</Badge>}
                    </span>
                    <span className="t-xs muted">{pm.label} {m.provider === 'smtp' && m.smtp?.host ? `- ${m.smtp.host}:${m.smtp.port}` : ''}</span>
                  </div>
                </div>
                <div className="row gap-1" style={{ alignItems: 'center' }}>
                  <Badge tone={STATUS_TONE[m.status] || 'default'} className="t-xs">{m.status}</Badge>
                  <Button variant="quiet" size="sm" onClick={() => { const r = testMailbox(m.id); toast(r.message, r.ok ? 'ok' : 'risk'); }}>Test</Button>
                  {!m.isDefault && <Button variant="quiet" size="sm" onClick={() => { setDefaultMailbox(m.id); toast('Default mailbox set.'); }}>Make default</Button>}
                  <Button variant="quiet" size="sm" aria-label="Disconnect" onClick={() => { if (window.confirm(`Disconnect ${m.email}?`)) { removeMailbox(m.id); toast('Mailbox disconnected.'); } }}><Icon name="trash" size={15} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal === 'choose' && (
        <Modal open onClose={() => setModal(null)} title="Connect a mailbox" width={520}>
          <div className="col gap-2">
            <ProviderRow provider="google" onClick={() => connectOAuth('google')} />
            <ProviderRow provider="microsoft" onClick={() => connectOAuth('microsoft')} />
            <ProviderRow provider="smtp" onClick={() => setModal('smtp')} />
            <span className="t-xs muted" style={{ marginTop: 6 }}>
              One-click Google and Microsoft use OAuth; when your workspace has not set provider keys yet, we route you to SMTP so you are never blocked.
            </span>
          </div>
        </Modal>
      )}

      {modal === 'smtp' && <SmtpModal onClose={() => setModal(null)} onDone={() => setModal(null)} />}
    </Card>
  );
}

function ProviderRow({ provider, onClick }) {
  const pm = providerMeta(provider);
  return (
    <button onClick={onClick} className="row between gap-2" style={{
      padding: '.9rem 1rem', border: '1px solid var(--line)', borderRadius: 12, cursor: 'pointer',
      background: 'var(--surface)', textAlign: 'left', width: '100%',
    }}>
      <span className="row gap-3" style={{ alignItems: 'center' }}>
        <span className="row center" style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', background: `${pm.color}1a`, color: pm.color }}>
          <Icon name={pm.icon} size={19} />
        </span>
        <span className="col" style={{ gap: 1 }}>
          <span className="fw-7">{pm.oauth ? `Connect ${pm.short}` : 'Connect via SMTP + IMAP'}</span>
          <span className="t-xs muted">{pm.label}</span>
        </span>
      </span>
      <Icon name="chevronRight" size={18} />
    </button>
  );
}

function SmtpModal({ onClose, onDone }) {
  const toast = useToast();
  const [presetId, setPresetId] = useState('gmail');
  const preset = SMTP_PRESETS.find(p => p.id === presetId) || SMTP_PRESETS[0];
  const [form, setForm] = useState({
    email: '', displayName: '', username: '', password: '',
    host: preset.host, port: preset.port, secure: preset.secure, imapHost: preset.imapHost, imapPort: preset.imapPort,
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function choosePreset(id) {
    const p = SMTP_PRESETS.find(x => x.id === id) || SMTP_PRESETS[0];
    setPresetId(id);
    setForm(f => ({ ...f, host: p.host, port: p.port, secure: p.secure, imapHost: p.imapHost, imapPort: p.imapPort }));
  }

  function save() {
    const res = addMailbox({
      provider: 'smtp', email: form.email, displayName: form.displayName,
      smtp: { host: form.host, port: Number(form.port), secure: form.secure, username: form.username || form.email, password: form.password, imapHost: form.imapHost, imapPort: Number(form.imapPort) },
    });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`${res.mailbox.email} connected over SMTP.`, 'ok');
    onDone();
  }

  return (
    <Modal open onClose={onClose} title="Connect via SMTP + IMAP" width={620}
      footer={<><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" onClick={save}>Connect mailbox</Button></>}>
      <div className="col gap-2">
        <Field label="Provider preset" hint="Prefills the server settings. Choose Custom for anything else.">
          <Select value={presetId} onChange={e => choosePreset(e.target.value)}>
            {SMTP_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Email address"><Input value={form.email} onChange={set('email')} placeholder="you@company.com" autoFocus /></Field>
          <Field label="From name"><Input value={form.displayName} onChange={set('displayName')} placeholder="Your Name" /></Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <Field label="SMTP host"><Input value={form.host} onChange={set('host')} placeholder="smtp.company.com" /></Field>
          <Field label="Port"><Input value={form.port} onChange={set('port')} inputMode="numeric" /></Field>
          <Field label="Encryption">
            <Select value={form.secure} onChange={set('secure')}>
              <option value="starttls">STARTTLS</option>
              <option value="ssl">SSL / TLS</option>
              <option value="none">None</option>
            </Select>
          </Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Username"><Input value={form.username} onChange={set('username')} placeholder="Usually your email" /></Field>
          <Field label="Password / app password"><Input type="password" value={form.password} onChange={set('password')} placeholder="App password recommended" /></Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <Field label="IMAP host" hint="For logging replies into Rally."><Input value={form.imapHost} onChange={set('imapHost')} placeholder="imap.company.com" /></Field>
          <Field label="IMAP port"><Input value={form.imapPort} onChange={set('imapPort')} inputMode="numeric" /></Field>
        </div>
        <span className="t-xs muted">Passwords are stored for this local workspace only. In production, mailbox secrets move to an encrypted vault and sending runs server-side.</span>
      </div>
    </Modal>
  );
}
