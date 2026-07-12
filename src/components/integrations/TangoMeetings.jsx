// TangoMeetings - a compact "scheduling" panel for a contact or company detail.
// Shows the record's UPCOMING booked meetings (via Tango) plus the next open
// times a rep can hand the guest, each deep-linking straight into Tango.
//
// Additive + graceful: mount it with one line next to the ActivityTimeline.
// When Tango is not connected it still renders the deterministic seeded
// meetings as a preview (so it always demos) with a soft "Connect" nudge;
// when a record has no meetings and Tango is not connected, it renders
// nothing (keeps quiet timelines clean).
//
//   Contact:  <TangoMeetings recordType="contact" record={c} />
//   Company:  <TangoMeetings recordType="company" record={co} contacts={contacts} />
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, shortDate, timeStr } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { useConnections } from '../../lib/integrations/connections.js';
import {
  getTangoConnector, meetingsForRecord, upcomingAvailability, splitMeetings, TANGO_ID,
} from '../../lib/integrations/connectors/tango.js';

const STATUS_TONE = { confirmed: 'ok', completed: 'default', cancelled: 'warn', no_show: 'warn' };
const STATUS_LABEL = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Canceled', no_show: 'No-show' };

function MeetingRow({ m, tango }) {
  const tone = STATUS_TONE[m.status] || 'default';
  return (
    <div className="row between" style={{ gap: 10, padding: '.55rem 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="fw-6 clip" style={{ color: 'var(--ink)' }}>{m.title}</span>
          <Badge tone={tone}>{STATUS_LABEL[m.status] || m.status}</Badge>
        </div>
        <div className="t-xs clip" style={{ color: 'var(--n-600)', marginTop: 2 }}>
          {shortDate(m.startsAt)} at {timeStr(m.startsAt)} &middot; {m.duration} min
          {m.hostName ? ` · ${m.hostName}` : ''}
        </div>
      </div>
      <a
        href={tango.bookingUrl(m.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-sm"
        title="Open in Tango"
        aria-label="Open in Tango"
        style={{ flexShrink: 0 }}
      >
        <Icon name="arrowUp" size={14} style={{ transform: 'rotate(45deg)' }} />
      </a>
    </div>
  );
}

export default function TangoMeetings({ recordType = 'contact', record, contacts }) {
  const conns = useConnections();
  const connected = (conns[TANGO_ID]?.status) === 'connected';
  const tango = getTangoConnector();
  const [showPast, setShowPast] = useState(false);

  const meetings = useMemo(
    () => meetingsForRecord(recordType, record, contacts),
    [recordType, record, contacts]
  );
  const { upcoming, recent } = useMemo(() => splitMeetings(meetings), [meetings]);
  const slots = useMemo(() => (connected ? upcomingAvailability(4) : upcomingAvailability(3)), [connected]);

  // Quiet timelines stay clean: nothing seeded + not connected -> render nothing.
  if (!connected && meetings.length === 0) return null;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row between" style={{ alignItems: 'center', gap: 8 }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--accent-50, rgba(91,75,245,.12))', color: 'var(--accent)', flexShrink: 0 }}>
            <Icon name="calendar" size={15} />
          </span>
          <span className="fw-7" style={{ color: 'var(--ink)' }}>Tango meetings</span>
        </div>
        {connected ? (
          <Badge tone="ok">Synced</Badge>
        ) : (
          <Link to="/integrations" className="t-xs link" style={{ color: 'var(--accent-600, var(--accent))' }}>Connect</Link>
        )}
      </div>

      {upcoming.length > 0 ? (
        <div>
          <div className="t-xs" style={{ color: 'var(--n-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
            Upcoming
          </div>
          {upcoming.map(m => <MeetingRow key={m.id} m={m} tango={tango} />)}
        </div>
      ) : (
        <div className="t-sm" style={{ color: 'var(--n-600)' }}>No upcoming meetings booked.</div>
      )}

      {recent.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(v => !v)}
            className="btn btn-ghost btn-sm"
            style={{ padding: 0, color: 'var(--n-600)' }}
          >
            <Icon name={showPast ? 'chevronDown' : 'chevronRight'} size={14} /> {recent.length} past meeting{recent.length === 1 ? '' : 's'}
          </button>
          {showPast && recent.slice(0, 6).map(m => <MeetingRow key={m.id} m={m} tango={tango} />)}
        </div>
      )}

      {/* Next open times - hand a guest a slot without leaving Rally. */}
      {slots.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className="t-xs" style={{ color: 'var(--n-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
            Next open times
          </div>
          <div className="row gap-2 wrap">
            {slots.map((s, i) => (
              <a
                key={i}
                href={tango.bookUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)', color: 'var(--ink-2)' }}
                title="Open Tango to book this time"
              >
                {shortDate(s.startsAt)} {timeStr(s.startsAt)}
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
