// RecordTickets - a compact Resolve support-tickets panel for a record.
//
// Drop-in for a Contact or Company detail page. Give it a companyId OR a
// contactId and it renders the support tickets Resolve has on that account,
// each with status, priority, channel, and an open-in-Resolve deep link.
// Self-contained + additive: it reads the local-first Resolve connector cache
// (deterministic demo tickets when the connector is not live), so it always
// has something honest to show and never blocks the page.
import React from 'react';
import { Card, Badge, Button, EmptyState, useToast, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  useResolveTickets, resolveTicketStats, syncResolve, isResolveConnected,
  getResolveCacheMeta, ticketStatusMeta, ticketPriorityMeta,
} from '../../lib/integrations/connectors/resolve.js';

const CHANNEL_LABEL = { email: 'Email', chat: 'Chat', form: 'Form', 'in-app': 'In-app' };

function TicketRow({ t, last }) {
  const sm = ticketStatusMeta(t.status);
  const pm = ticketPriorityMeta(t.priority);
  const showPriority = t.priority === 'urgent' || t.priority === 'high';
  return (
    <div className="row gap-2" style={{ alignItems: 'flex-start', padding: '.65rem 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="fw-6 clip" style={{ minWidth: 0 }}>{t.subject}</span>
          {showPriority && <Badge tone={pm.tone} className="t-xs">{pm.label}</Badge>}
        </div>
        <div className="row gap-2 t-xs muted" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {t.number != null && <span>#{t.number}</span>}
          <span>{CHANNEL_LABEL[t.channel] || t.channel}</span>
          <span>{relTime(t.createdAt)}</span>
          {t.resolvedBy === 'ai' && t.aiConfidence != null && <span>AI {t.aiConfidence}%</span>}
          {t.csat != null && <span>CSAT {t.csat}/5</span>}
        </div>
      </div>
      <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
        <Badge tone={sm.tone} className="t-xs">{sm.label}</Badge>
        {t.externalUrl && (
          <a href={t.externalUrl} target="_blank" rel="noopener noreferrer"
            title="Open in Resolve" aria-label="Open in Resolve"
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-600)', padding: '.15rem' }}>
            <Icon name="arrowUp" size={13} style={{ transform: 'rotate(45deg)' }} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function RecordTickets({ companyId, contactId, title = 'Support tickets', limit = 6 }) {
  const toast = useToast();
  const allRows = useResolveTickets();
  const rows = contactId
    ? allRows.filter(t => t.contactId === contactId)
    : allRows.filter(t => t.companyId === companyId);
  const meta = getResolveCacheMeta();
  const connected = isResolveConnected();
  const stats = resolveTicketStats(rows);
  const shown = rows.slice(0, limit);

  const doSync = async () => {
    const r = await syncResolve();
    if (r.live) toast(`Synced ${r.imported} tickets from Resolve`);
    else toast('Showing sample tickets from Resolve');
  };

  return (
    <Card pad={false}>
      <div className="row between gap-2" style={{ padding: '1rem 1.15rem', borderBottom: '1px solid var(--line)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <h4 style={{ margin: 0 }}>{title}</h4>
          <Badge>{rows.length}</Badge>
          <span className="row gap-1 t-xs" style={{ alignItems: 'center', color: 'var(--n-600)', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)', padding: '.1rem .45rem' }}>
            <img src="https://logo.clearbit.com/resolve-nine-beryl.vercel.app?size=32" alt="" width={12} height={12}
              loading="lazy" style={{ borderRadius: 3, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            {connected && meta.live ? 'Live via Resolve' : 'Sample via Resolve'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={doSync}><Icon name="rotateCcw" size={14} /> Sync</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🎫" title="No support tickets" body="Tickets Resolve logs for this account will appear here with status and priority." />
      ) : (
        <div style={{ padding: '.3rem 1.15rem .6rem' }}>
          {stats.open > 0 && (
            <div className="t-xs muted" style={{ padding: '.5rem 0 .3rem' }}>
              {stats.open} open{stats.urgent > 0 ? `, ${stats.urgent} urgent` : ''} - {stats.aiResolved} AI resolved{stats.csat != null ? ` - CSAT ${stats.csat}/5` : ''}
            </div>
          )}
          {shown.map((t, i) => <TicketRow key={t.id} t={t} last={i === shown.length - 1} />)}
          {rows.length > shown.length && (
            <div className="t-xs muted" style={{ paddingTop: '.55rem' }}>{rows.length - shown.length} more in the tickets inbox</div>
          )}
        </div>
      )}
    </Card>
  );
}
