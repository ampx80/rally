// ============================================================
// NOTIFICATIONS  (/notifications)
// The full activity feed: KPI strip, type filters, and the stream
// grouped by day (Today / Yesterday / date). Reads the persisted,
// derived notification store (lib/notifications-data.js). Clicking a
// row marks it read and deep-links into the record it is about.
// ============================================================
import React, { useMemo, useState } from 'react';
import { SectionHeader, StatCard, Card, Button, EmptyState } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useNotifications, markAllRead, notifMeta, NOTIF_FILTERS, NOTIF_TYPES,
} from '../lib/notifications-data.js';
import NotificationItem from '../components/notif/NotificationItem.jsx';
import '../components/notif/notif.css';

const dayKey = (n) => new Date(n.sortAt || n.at).toDateString();
function dayHeading(key) {
  const today = new Date().toDateString();
  const yest = new Date(Date.now() - 86400000).toDateString();
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return new Date(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Notifications() {
  const items = useNotifications(s => s);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | a type key

  const unread = items.reduce((n, x) => n + (x.read ? 0 : 1), 0);

  // count per type for the chips
  const counts = useMemo(() => {
    const m = {};
    for (const n of items) m[n.type] = (m[n.type] || 0) + 1;
    return m;
  }, [items]);

  const wonToday = useMemo(() => {
    const today = new Date().toDateString();
    return items.filter(n => n.type === 'deal_won' && new Date(n.at).toDateString() === today).length;
  }, [items]);
  const mentions = counts.mention || 0;

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter(n => !n.read);
    return items.filter(n => n.type === filter);
  }, [items, filter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const n of filtered) { const k = dayKey(n); if (!map.has(k)) map.set(k, []); map.get(k).push(n); }
    return [...map.entries()];
  }, [filtered]);

  const activeTypes = NOTIF_FILTERS.filter(t => counts[t]);

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        eyebrow="Stay in the loop"
        title="Notifications"
        sub="Everything happening across your book of business, newest first."
        action={unread > 0
          ? <Button variant="ghost" onClick={markAllRead}><Icon name="check" size={16} /> Mark all read</Button>
          : null}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard label="Unread" value={unread} icon={<Icon name="bell" size={18} />} sub="waiting on you" />
        <StatCard label="Mentions" value={mentions} icon={<Icon name="users" size={18} />} accent="var(--accent)" sub="you were tagged" />
        <StatCard label="Wins today" value={wonToday} icon={<Icon name="target" size={18} />} accent="var(--ok)" sub="deals closed won" />
        <StatCard label="Total" value={items.length} icon={<Icon name="activity" size={18} />} accent="var(--warn)" sub="in your feed" />
      </div>

      <Card pad={false}>
        <div className="row between wrap" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)', gap: '.6rem' }}>
          <div className="ntf-chips">
            <button className={`ntf-chip${filter === 'all' ? ' is-on' : ''}`} onClick={() => setFilter('all')}>
              All <span className="ntf-chip-count">{items.length}</span>
            </button>
            <button className={`ntf-chip${filter === 'unread' ? ' is-on' : ''}`} onClick={() => setFilter('unread')}>
              Unread <span className="ntf-chip-count">{unread}</span>
            </button>
            {activeTypes.map(t => {
              const meta = notifMeta(t);
              return (
                <button key={t} className={`ntf-chip${filter === t ? ' is-on' : ''}`} onClick={() => setFilter(t)}>
                  <Icon name={meta.icon} size={13} style={{ color: meta.color }} />
                  {NOTIF_TYPES[t].label} <span className="ntf-chip-count">{counts[t]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="bell" size={34} />}
            title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
            body={filter === 'unread'
              ? 'You are all caught up. New activity will show here the moment it happens.'
              : 'As deals move, tasks come due, and teammates tag you, it all lands here.'}
          />
        ) : (
          <div className="col" style={{ padding: '.25rem 1.1rem .75rem' }}>
            {groups.map(([key, rows]) => (
              <div key={key} className="col">
                <div className="ntf-day">
                  <span className="ntf-day-label">{dayHeading(key)}</span>
                  <span className="ntf-day-rule" />
                  <span className="t-xs muted">{rows.length}</span>
                </div>
                {rows.map(n => <NotificationItem key={n.id} n={n} />)}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
