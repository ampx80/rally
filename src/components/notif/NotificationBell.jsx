// NotificationBell - the bell in the top bar. Shows an unread count badge and
// opens a dropdown panel with the most recent notifications, a mark-all-read
// action, and a link to the full /notifications page. Closes on outside click
// or Escape. Purely presentational over lib/notifications-data.js.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { useNotifications, markAllRead } from '../../lib/notifications-data.js';
import NotificationItem from './NotificationItem.jsx';
import './notif.css';

export default function NotificationBell() {
  const items = useNotifications(s => s);
  const unread = items.reduce((n, x) => n + (x.read ? 0 : 1), 0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const recent = items.slice(0, 8);

  return (
    <div className="ntf-bell" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`btn btn-quiet${unread ? ' ntf-bell-live' : ''}`}
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        style={{ padding: '.5rem', position: 'relative' }}
      >
        <Icon name="bell" size={18} />
        {unread > 0
          ? <span className="ntf-bell-badge">{unread > 9 ? '9+' : unread}</span>
          : null}
      </button>

      {open && (
        <div className="ntf-panel" role="dialog" aria-label="Notifications">
          <div className="ntf-panel-head">
            <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
              <strong style={{ fontSize: '1rem' }}>Notifications</strong>
              {unread > 0 && <span className="badge badge-accent t-xs">{unread} new</span>}
            </div>
            {unread > 0 && (
              <button className="btn btn-quiet btn-sm" onClick={markAllRead} style={{ color: 'var(--accent-600)', padding: '.25rem .4rem' }}>
                <Icon name="check" size={15} /> Mark all
              </button>
            )}
          </div>

          <div className="ntf-panel-body">
            {recent.length === 0 ? (
              <div className="col center gap-2" style={{ padding: '2.5rem 1.25rem', textAlign: 'center' }}>
                <span className="row center" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ok-bg)', color: 'var(--ok)' }}>
                  <Icon name="check" size={22} stroke={2.5} />
                </span>
                <div className="fw-6">You are all caught up</div>
                <div className="t-sm muted">No new notifications right now.</div>
              </div>
            ) : (
              recent.map(n => (
                <NotificationItem key={n.id} n={n} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>

          <div className="ntf-panel-foot">
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setOpen(false); nav('/notifications'); }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
