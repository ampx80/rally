// ============================================================
// EmailActivityTimeline - the engagement surface for Ardovo's email
// engine. Real open / click / bounce / complaint events flow in
// server-side via api/resend-webhook.js (Svix-verified) and land in
// Supabase (rally_email_events). This component renders that stream
// as:
//   - a fleet engagement KPI row (opens / clicks / bounces),
//   - a searchable recipient list, each row a mini engagement strip,
//   - a per-recipient TIMELINE (chronological event story),
//   - a CLICK MAP (which links got the clicks, ranked).
//
// It hydrates real events from the backend on mount (best-effort) and
// falls back to a seeded local store when no backend is wired, so it is
// never empty and always demonstrable. A "simulate" affordance lets you
// log a local open/click for a recipient to see the timeline move.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { Card, Badge, Input, Button, StatCard, EmptyState, Avatar, useToast, relTime, timeStr } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  useEmailEvents, recipientSummaries, eventsForRecipient, clickMap,
  engagementStats, hydrateFromApi, simulateEvent, eventMeta,
} from './email-events-store.js';

const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

function EventDot({ type }) {
  const m = eventMeta(type);
  return (
    <span className="row center" style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', background: m.color + '22', color: m.color }}>
      <Icon name={m.icon} size={15} />
    </span>
  );
}

// Compact colored pills summarizing a recipient's engagement counts.
function EngagementStrip({ r }) {
  const chips = [
    r.opened ? { t: 'opened', n: r.opened } : null,
    r.clicked ? { t: 'clicked', n: r.clicked } : null,
    r.bounced ? { t: 'bounced', n: r.bounced } : null,
    r.complained ? { t: 'complained', n: r.complained } : null,
  ].filter(Boolean);
  if (!chips.length) return <span className="t-xs muted">Sent, no engagement yet</span>;
  return (
    <div className="row gap-1 wrap">
      {chips.map(c => {
        const m = eventMeta(c.t);
        return (
          <span key={c.t} className="row gap-1 t-xs fw-6" style={{ alignItems: 'center', color: m.color }}>
            <Icon name={m.icon} size={12} /> {c.n} {m.label.toLowerCase()}
          </span>
        );
      })}
    </div>
  );
}

function RecipientTimeline({ email, onSimulate }) {
  const events = eventsForRecipient(email);
  if (!events.length) return <EmptyState icon="📭" title="No events" body="No engagement recorded for this recipient yet." />;
  return (
    <div className="col gap-2">
      <div className="row gap-2 wrap" style={{ marginBottom: '.35rem' }}>
        <Button variant="quiet" size="sm" onClick={() => onSimulate(email, 'opened')}><Icon name="eye" size={14} /> Log open</Button>
        <Button variant="quiet" size="sm" onClick={() => onSimulate(email, 'clicked')}><Icon name="bolt" size={14} /> Log click</Button>
      </div>
      {events.map((e, i) => {
        const m = eventMeta(e.type);
        const last = i === events.length - 1;
        return (
          <div key={e.id} className="row" style={{ gap: '.75rem', alignItems: 'stretch' }}>
            <div className="col center" style={{ flex: 'none', width: 30 }}>
              <EventDot type={e.type} />
              {!last && <div style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 4 }} />}
            </div>
            <div className="col gap-1" style={{ paddingBottom: last ? 0 : '.8rem', minWidth: 0 }}>
              <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                <span className="fw-6" style={{ color: m.color }}>{m.label}</span>
                {e.subject && <span className="t-sm muted clip">{e.subject}</span>}
              </div>
              {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="link t-xs" style={{ wordBreak: 'break-all' }}><Icon name="link" size={11} /> {e.link}</a>}
              <span className="t-xs muted">{relTime(e.at)} at {timeStr(e.at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClickMapPanel() {
  const rows = clickMap();
  const max = rows.reduce((m, r) => Math.max(m, r.clicks), 0) || 1;
  if (!rows.length) {
    return <EmptyState icon="🖱️" title="No clicks yet" body="Clicked links will appear here, ranked by engagement, once recipients start clicking." />;
  }
  return (
    <div className="col gap-2">
      {rows.map(r => (
        <div key={r.link} className="col gap-1">
          <div className="row between gap-2" style={{ alignItems: 'baseline' }}>
            <a href={r.link} target="_blank" rel="noreferrer" className="link t-sm clip" style={{ minWidth: 0 }}>{r.link}</a>
            <span className="tnum fw-6 t-sm" style={{ flex: 'none' }}>{r.clicks} click{r.clicks === 1 ? '' : 's'} - {r.recipients} recipient{r.recipients === 1 ? '' : 's'}</span>
          </div>
          <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((r.clicks / max) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EmailActivityTimeline() {
  useEmailEvents();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [hydrating, setHydrating] = useState(false);

  // Best-effort backend hydration on mount (real webhook events merge on top of
  // the local seed). Silent no-op when no backend is configured.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await hydrateFromApi();
      if (alive && r && r.ok && r.merged) toast(`Loaded ${r.merged} live event${r.merged === 1 ? '' : 's'}`);
    })();
    return () => { alive = false; };
  }, []);

  const stats = engagementStats();
  const recipients = recipientSummaries();
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return recipients;
    return recipients.filter(r => r.email.includes(needle) || (r.name || '').toLowerCase().includes(needle) || (r.company || '').toLowerCase().includes(needle));
  }, [q, recipients]);

  const activeEmail = selected || (filtered[0] && filtered[0].email) || null;

  const doSimulate = (email, type) => {
    const link = type === 'clicked' ? 'https://ardovo.com/demo' : null;
    simulateEvent({ email, type, link });
    toast(`Logged a ${type} for ${email}`);
  };

  const refresh = async () => {
    setHydrating(true);
    try {
      const r = await hydrateFromApi();
      if (r && r.ok) toast(r.configured ? `Synced ${r.merged || 0} live event${r.merged === 1 ? '' : 's'}` : 'No backend wired - showing local demo events', r.configured ? 'ok' : 'info');
      else toast('Live events unavailable - showing local demo events', 'info');
    } finally { setHydrating(false); }
  };

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard label="Opens" value={stats.opened} sub={`${stats.uniqueOpens} unique - ${pct(stats.openRate)}`} icon={<Icon name="eye" size={18} />} accent="#0ea5a3" />
        <StatCard label="Clicks" value={stats.clicked} sub={`${stats.uniqueClicks} unique - ${pct(stats.clickRate)}`} icon={<Icon name="bolt" size={18} />} accent="#5b4bf5" />
        <StatCard label="Bounces" value={stats.bounced} sub="auto-suppressed" icon={<Icon name="rotateCcw" size={18} />} accent="#c0392b" />
        <StatCard label="Complaints" value={stats.complained} sub="auto-unsubscribed" icon={<Icon name="flag" size={18} />} accent="#e0752d" />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.2fr)', alignItems: 'start' }}>
        <Card className="col gap-2">
          <div className="row between gap-2" style={{ alignItems: 'center' }}>
            <div className="fw-7">Recipients</div>
            <Button variant="quiet" size="sm" onClick={refresh} disabled={hydrating}><Icon name="rotateCcw" size={14} /> {hydrating ? 'Syncing...' : 'Sync'}</Button>
          </div>
          <Input placeholder="Search recipients..." value={q} onChange={e => setQ(e.target.value)} />
          {filtered.length === 0 ? (
            <EmptyState icon="👥" title="No recipients" body="No matching recipients. Sends will show up here once mail goes out." />
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', maxHeight: 420, overflowY: 'auto' }}>
              {filtered.map(r => {
                const on = r.email === activeEmail;
                return (
                  <button key={r.email} type="button" onClick={() => setSelected(r.email)}
                    className="row gap-2" style={{ width: '100%', textAlign: 'left', padding: '.6rem .7rem', borderBottom: '1px solid var(--line)', background: on ? 'var(--n-100)' : 'transparent', alignItems: 'center' }}>
                    <Avatar name={r.name} size={30} />
                    <div className="col" style={{ minWidth: 0, flex: 1 }}>
                      <span className="fw-6 clip" style={{ fontSize: '.92rem' }}>{r.name}</span>
                      <EngagementStrip r={r} />
                    </div>
                    {r.complained ? <Badge tone="warn">complaint</Badge> : r.bounced ? <Badge tone="risk">bounced</Badge> : null}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="col gap-3">
          <Card className="col gap-2">
            <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}>
              <Icon name="activity" size={16} /> {activeEmail ? `Timeline - ${activeEmail}` : 'Timeline'}
            </div>
            {activeEmail
              ? <RecipientTimeline email={activeEmail} onSimulate={doSimulate} />
              : <EmptyState icon="📬" title="Pick a recipient" body="Select a recipient to see their full engagement timeline." />}
          </Card>

          <Card className="col gap-2">
            <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}><Icon name="bolt" size={16} /> Click map</div>
            <ClickMapPanel />
          </Card>
        </div>
      </div>
    </div>
  );
}
