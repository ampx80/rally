// SupportTickets - the tickets inbox, an inbound view of everything Resolve
// (the sibling support app, operator "Reva") has logged against the book of
// business. This is the delivery-side companion to the deal: every account's
// open issues, AI-resolved wins, priorities, and CSAT in one revenue-facing
// list, each ticket deep-linking back into Resolve.
//
// Built on the integration backbone: reads the local-first Resolve connector
// cache (deterministic demo tickets when not live), connects/syncs through the
// env-gated server bridge, and resolves every ticket onto the right Rally
// company + contact. Additive + self-contained. No em-dash or en-dash.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Badge, Button, StatCard, Segmented, Select, Input, Field, Modal,
  EmptyState, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getCompany, getContact, contactName } from '../lib/store.js';
import { integrationById } from '../lib/integrations/registry.js';
import {
  useResolveTickets, resolveTicketStats, syncResolve, connectResolve, disconnectResolve,
  isResolveConnected, getResolveCacheMeta, ticketStatusMeta, ticketPriorityMeta, isOpenTicket,
  resolveWorkspaceUrl,
} from '../lib/integrations/connectors/resolve.js';

const CHANNEL_LABEL = { email: 'Email', chat: 'Chat', form: 'Form', 'in-app': 'In-app' };
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'ai_resolved', label: 'AI resolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'feature_request', label: 'Features' },
];

function matchStatus(t, f) {
  if (f === 'all') return true;
  if (f === 'open') return isOpenTicket(t);
  if (f === 'resolved') return ticketStatusMeta(t.status).group === 'resolved';
  return t.status === f;
}

function TicketItem({ t }) {
  const co = t.companyId ? getCompany(t.companyId) : null;
  const contact = t.contactId ? getContact(t.contactId) : null;
  const sm = ticketStatusMeta(t.status);
  const pm = ticketPriorityMeta(t.priority);
  return (
    <div className="row gap-3" style={{ alignItems: 'flex-start', padding: '.85rem 1.15rem', borderBottom: '1px solid var(--line)' }}>
      <span className="row center" style={{ width: 34, height: 34, borderRadius: 'var(--r-pill)', background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
        <Icon name="mail" size={16} />
      </span>
      <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
          <span className="fw-6 clip" style={{ minWidth: 0 }}>{t.subject}</span>
          <Badge tone={sm.tone} className="t-xs">{sm.label}</Badge>
          {(t.priority === 'urgent' || t.priority === 'high') && <Badge tone={pm.tone} className="t-xs">{pm.label}</Badge>}
        </div>
        <div className="row gap-2 t-xs muted" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {t.number != null && <span>#{t.number}</span>}
          {co && <><Link to={`/companies/${co.id}`} className="link">{co.name}</Link><span>-</span></>}
          {contact && <Link to={`/contacts/${contact.id}`} className="link">{contactName(contact)}</Link>}
          <span>{CHANNEL_LABEL[t.channel] || t.channel}</span>
          <span>{relTime(t.createdAt)}</span>
          {t.resolvedBy === 'ai' && t.aiConfidence != null && <span>AI {t.aiConfidence}%</span>}
          {t.csat != null && <span>CSAT {t.csat}/5</span>}
        </div>
      </div>
      {t.externalUrl && (
        <a href={t.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm"
          title="Open in Resolve" style={{ flex: 'none', color: 'var(--accent-600)' }}>
          Open <Icon name="arrowUp" size={13} style={{ transform: 'rotate(45deg)' }} />
        </a>
      )}
    </div>
  );
}

function ConnectModal({ open, onClose, onConnected }) {
  const desc = integrationById('resolve');
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      await connectResolve(form);
      const r = await syncResolve();
      toast(r.live ? `Connected. Synced ${r.imported} tickets.` : 'Connected. Showing sample tickets until the server key is set.');
      onConnected?.();
      onClose();
    } catch (e) {
      toast('Could not connect to Resolve', 'risk');
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Resolve"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={busy}>{busy ? 'Connecting...' : 'Connect'}</Button>
      </>}>
      <div className="col gap-3">
        <p className="t-sm muted" style={{ margin: 0 }}>
          Link your Resolve workspace to pull support tickets onto the matching company and contact.
          Keys are held server-side and never stored in your browser.
        </p>
        {(desc?.connectFields || []).map(f => (
          <Field key={f.key} label={f.label} hint={f.secret ? 'Held server-side, never persisted client-side.' : undefined}>
            <Input type={f.type === 'url' ? 'url' : 'text'} value={form[f.key] || ''} onChange={set(f.key)}
              placeholder={f.placeholder} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

export default function SupportTickets() {
  const rows = useResolveTickets();
  const toast = useToast();
  const connected = isResolveConnected();
  const meta = getResolveCacheMeta();
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [q, setQ] = useState('');
  const [connectOpen, setConnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => resolveTicketStats(rows), [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = rows.filter(t => {
      if (!matchStatus(t, status)) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      if (query) {
        const co = t.companyId ? getCompany(t.companyId) : null;
        const hay = `${t.subject} ${co?.name || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    // Open first (urgent floats up), resolved after, each newest-first.
    return list.sort((a, b) => {
      const ao = isOpenTicket(a) ? 0 : 1, bo = isOpenTicket(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (ao === 0) {
        const ar = ticketPriorityMeta(a.priority).rank, br = ticketPriorityMeta(b.priority).rank;
        if (ar !== br) return ar - br;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [rows, status, priority, q]);

  const doSync = async () => {
    setBusy(true);
    try {
      const r = await syncResolve();
      toast(r.live ? `Synced ${r.imported} tickets from Resolve` : 'Refreshed sample tickets from Resolve');
    } finally { setBusy(false); }
  };
  const doDisconnect = async () => { await disconnectResolve(); toast('Disconnected Resolve'); };

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 60%, var(--accent-700) 130%)', color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '58ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="mail" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Support tickets</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', lineHeight: 1.1, color: '#fff' }}>
              Every account's support story, next to the revenue.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.02rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              Synced from Resolve and matched to the right company and contact. Open issues, AI-resolved
              wins, priorities, and CSAT, so the deal team sees the whole picture.
            </p>
          </div>
          <div className="row gap-2" style={{ flex: 'none', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={doSync} disabled={busy} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
              <Icon name="rotateCcw" size={16} /> {busy ? 'Syncing...' : 'Sync'}
            </Button>
            {connected ? (
              <Button variant="ghost" onClick={doDisconnect} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Disconnect</Button>
            ) : (
              <Button variant="primary" onClick={() => setConnectOpen(true)}><Icon name="plug" size={16} /> Connect Resolve</Button>
            )}
          </div>
        </div>
      </Card>

      {/* connection status line */}
      <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
        <span className="row gap-1 t-sm" style={{ alignItems: 'center', color: 'var(--n-600)' }}>
          <span className="dot" style={{ background: connected && meta.live ? 'var(--ok)' : connected ? 'var(--warn)' : 'var(--n-400)' }} />
          {connected && meta.live ? 'Live sync active' : connected ? 'Connected - sample data until the server key is set' : 'Not connected - showing sample tickets'}
        </span>
        <a href={resolveWorkspaceUrl()} target="_blank" rel="noopener noreferrer" className="link t-sm">Open Resolve workspace</a>
        {meta.degraded && <span className="t-xs muted">{meta.degraded}</span>}
      </div>

      {/* stat tiles */}
      <div className="row gap-3 wrap">
        <div style={{ flex: '1 1 190px' }}><StatCard label="All tickets" value={stats.total} icon={<Icon name="mail" size={18} />} /></div>
        <div style={{ flex: '1 1 190px' }}><StatCard label="Open" value={stats.open} accent="var(--warn)" icon={<Icon name="inbox" size={18} />} sub={stats.urgent > 0 ? `${stats.urgent} urgent` : 'none urgent'} /></div>
        <div style={{ flex: '1 1 190px' }}><StatCard label="AI resolved" value={stats.aiResolved} accent="var(--accent)" icon={<Icon name="sparkles" size={18} />} /></div>
        <div style={{ flex: '1 1 190px' }}><StatCard label="CSAT" value={stats.csat != null ? stats.csat : 0} accent="var(--ok)" icon={<Icon name="check" size={18} />} sub="out of 5" /></div>
      </div>

      {/* filter bar */}
      <div className="row between gap-3 wrap" style={{ alignItems: 'center' }}>
        <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Select value={priority} onChange={e => setPriority(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
          <div className="row gap-1" style={{ alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', padding: '.35rem .6rem' }}>
            <Icon name="search" size={16} color="var(--n-400)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tickets or accounts"
              style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', minWidth: 180 }} />
            {q && <button onClick={() => setQ('')} className="btn btn-quiet btn-sm" aria-label="Clear"><Icon name="x" size={14} /></button>}
          </div>
        </div>
      </div>

      {/* list */}
      <Card pad={false}>
        <div className="row between" style={{ padding: '1rem 1.15rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Inbox</h4>
          <Badge>{filtered.length}</Badge>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="🎫" title="No tickets match" body="Adjust the filters, or sync from Resolve to pull the latest support tickets." />
        ) : (
          <div className="col">
            {filtered.map(t => <TicketItem key={t.id} t={t} />)}
          </div>
        )}
      </Card>

      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} onConnected={() => {}} />
    </div>
  );
}
