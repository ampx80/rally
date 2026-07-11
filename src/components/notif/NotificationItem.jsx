// A single notification row, shared by the bell dropdown and the full
// /notifications page so both surfaces stay visually identical. Renders the
// type icon chip, title (with @mention highlighting), body, relative time,
// and an unread dot. Clicking marks read and (if the item has a target)
// navigates to the record.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { Avatar, relTime, moneyK } from '../UI.jsx';
import { notifMeta, markRead } from '../../lib/notifications-data.js';

/* Split a title on @Name tokens so mentions can be highlighted inline. */
function renderTitle(title) {
  if (!title) return null;
  const parts = String(title).split(/(@[A-Za-z][\w'-]*(?:\s[A-Z][\w'-]*)?)/g);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="ntf-mention">{p}</span>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

export default function NotificationItem({ n, onNavigate }) {
  const nav = useNavigate();
  const meta = notifMeta(n.type);
  const won = n.type === 'deal_won';

  const go = () => {
    if (!n.read) markRead(n.id);
    if (n.target?.to) { onNavigate?.(); nav(n.target.to); }
  };

  return (
    <button
      className={`ntf-item${n.read ? '' : ' is-unread'}${won ? ' is-won' : ''}`}
      onClick={go}
      style={{ animationDelay: '0ms' }}
    >
      {won && <span className="ntf-spark" aria-hidden><Icon name="sparkles" size={13} style={{ color: 'var(--ok)' }} /></span>}
      <span className="ntf-ic" style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}>
        {n.type === 'mention'
          ? <Avatar name={n.actor} size={34} />
          : <Icon name={meta.icon} size={17} />}
      </span>
      <span className="col" style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <span className="ntf-title ntf-clip-2">{renderTitle(n.title)}</span>
        {won && n.amount != null
          ? <span className="ntf-body"><span className="ntf-won-amount">{moneyK(n.amount)}</span> won</span>
          : (n.body ? <span className="ntf-body ntf-clip-2">{renderTitle(n.body)}</span> : null)}
        <span className="ntf-time" style={{ marginTop: 2 }}>{relTime(n.at)}</span>
      </span>
      {!n.read && <span className="ntf-unread-dot" aria-label="unread" />}
    </button>
  );
}
