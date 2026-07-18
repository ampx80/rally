// Scheduling - Ardovo's fleet-wide view of meetings booked through Tango.
//
// Where the TangoMeetings panel answers "what is booked with THIS record",
// this page answers "what is on the calendar across the whole book of
// business": every upcoming booked meeting, resolved to its contact/company,
// plus the next open times to hand a prospect. It is powered entirely by the
// Tango connector (src/lib/integrations/connectors/tango.js) - the same
// deterministic demo set the panels use, so it always demos, and the same
// live bridge when TANGO_API_KEY is wired.
//
// Additive: a brand-new route, no existing surface changes. Dark-enterprise.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, getContacts, getContact, getCompany } from '../lib/store.js';
import { Card, Badge, Button, Stat, PageTitle, EmptyState, shortDate, timeStr, longDate, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { useConnections } from '../lib/integrations/connections.js';
import {
  getTangoConnector, meetingsForContact, upcomingAvailability, splitMeetings, TANGO_ID,
} from '../lib/integrations/connectors/tango.js';

const STATUS_TONE = { confirmed: 'ok', completed: 'default', cancelled: 'warn', no_show: 'warn' };
const STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Canceled', no_show: 'No-show' };

function recordLabel(m) {
  const c = m.contactId ? getContact(m.contactId) : null;
  if (c) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || c.email;
    return { name, to: `/contacts/${c.id}` };
  }
  const co = m.companyId ? getCompany(m.companyId) : null;
  if (co) return { name: co.name, to: `/companies/${co.id}` };
  return { name: m.guestName || m.guestEmail || 'Guest', to: null };
}

function MeetingCard({ m, tango }) {
  const who = recordLabel(m);
  const tone = STATUS_TONE[m.status] || 'default';
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="fw-7 clip" style={{ color: 'var(--ink)' }}>{m.title}</div>
          <div className="t-xs" style={{ color: 'var(--n-600)', marginTop: 2 }}>{m.hostName}</div>
        </div>
        <Badge tone={tone}>{STATUS_LABEL[m.status] || m.status}</Badge>
      </div>
      <div className="t-sm" style={{ color: 'var(--ink-2)' }}>
        <Icon name="calendar" size={13} /> {longDate(m.startsAt)} at {timeStr(m.startsAt)} &middot; {m.duration} min
      </div>
      <div className="row between" style={{ alignItems: 'center', gap: 8, marginTop: 2 }}>
        {who.to ? (
          <Link to={who.to} className="link t-sm clip fw-6" style={{ minWidth: 0 }}>{who.name}</Link>
        ) : (
          <span className="t-sm clip" style={{ color: 'var(--n-600)', minWidth: 0 }}>{who.name}</span>
        )}
        <a href={tango.bookingUrl(m.id)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} title="Open in Tango">
          Open in Tango <Icon name="arrowUp" size={12} style={{ transform: 'rotate(45deg)' }} />
        </a>
      </div>
    </Card>
  );
}

export default function Scheduling() {
  useStore();                        // subscribe for reactivity
  const conns = useConnections();
  const toast = useToast();
  const connected = (conns[TANGO_ID]?.status) === 'connected';
  const tango = getTangoConnector();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('upcoming');

  const all = useMemo(() => {
    const out = [];
    for (const c of getContacts()) out.push(...meetingsForContact(c));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conns]);
  const { upcoming, recent } = useMemo(() => splitMeetings(all), [all]);
  const slots = useMemo(() => upcomingAvailability(6), [conns]);

  const stats = useMemo(() => {
    const now = Date.now();
    const week = upcoming.filter(m => m.startsAt < now + 7 * 86400000).length;
    const completed = recent.filter(m => m.status === 'completed').length;
    return { upcoming: upcoming.length, week, completed };
  }, [upcoming, recent]);

  async function connect() {
    setBusy(true);
    try {
      const r = await tango.connect({ workspaceUrl: 'https://tango-theta.vercel.app' });
      const res = await tango.sync();
      toast(`Tango connected. ${res.linked} meeting${res.linked === 1 ? '' : 's'} synced onto contacts.`);
      if (r?.authorizeUrl) window.open(r.authorizeUrl, '_blank', 'noopener');
    } catch (e) {
      toast('Could not reach Tango. Showing demo meetings.');
    } finally { setBusy(false); }
  }

  async function sync() {
    setBusy(true);
    try {
      const res = await tango.sync();
      toast(res.linked > 0 ? `${res.linked} new meeting${res.linked === 1 ? '' : 's'} synced.` : 'Already up to date.');
    } finally { setBusy(false); }
  }

  const list = tab === 'upcoming' ? upcoming : recent;

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      <PageTitle
        eyebrow="Scheduling"
        title="Meetings booked through Tango"
        sub="Every booking lands on the right contact with a link back to Tango. Connect to sync live."
        action={
          connected
            ? <Button variant="ghost" size="sm" onClick={sync} disabled={busy}><Icon name="rotateCcw" size={15} /> Sync</Button>
            : <Button variant="primary" size="sm" onClick={connect} disabled={busy}><Icon name="calendar" size={15} /> Connect Tango</Button>
        }
      />

      {/* hero band */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 60%, var(--accent-700) 130%)', color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div className="row gap-4" style={{ flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1 }}>{stats.upcoming}</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>upcoming meetings</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1, color: 'var(--accent-300)' }}>{stats.week}</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>this week</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1 }}>{stats.completed}</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>completed</div>
            </div>
          </div>
          <div style={{ maxWidth: '40ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
              <Icon name="calendar" size={16} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Next open times</span>
            </div>
            <div className="row gap-2 wrap">
              {slots.map((s, i) => (
                <a key={i} href={tango.bookUrl()} target="_blank" rel="noopener noreferrer"
                  className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', color: '#fff' }}>
                  {shortDate(s.startsAt)} {timeStr(s.startsAt)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* tabs */}
      <div className="row gap-2">
        {['upcoming', 'recent'].map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn btn-sm"
            style={{
              background: tab === t ? 'var(--accent)' : 'var(--paper)',
              color: tab === t ? '#fff' : 'var(--ink-2)',
              border: '1px solid ' + (tab === t ? 'var(--accent)' : 'var(--line-strong)'),
              textTransform: 'capitalize',
            }}>
            {t} ({t === 'upcoming' ? upcoming.length : recent.length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon="📅" title={tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
          body="Bookings made through Tango land here automatically, resolved onto the matching contact."
          action={!connected ? <Button variant="primary" onClick={connect} disabled={busy}>Connect Tango</Button> : null} />
      ) : (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {list.slice(0, 60).map(m => <MeetingCard key={m.id} m={m} tango={tango} />)}
        </div>
      )}
    </div>
  );
}
