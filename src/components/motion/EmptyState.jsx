// EmptyState - a delightful, animated "nothing here yet" moment. The glyph
// sits in an accent halo with two soft ripple rings and a gentle bob, so an
// empty view still feels alive and intentional instead of broken. Accepts an
// icon name (from the shared icon set) or any node. ASCII only.
// No em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons';
import './motion.css';

export default function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
  accent = 'var(--accent-600)',
}) {
  const glyph = typeof icon === 'string'
    ? <Icon name={icon} size={30} className="pm-empty__icon" />
    : <span className="pm-empty__icon">{icon}</span>;

  return (
    <div className="col center gap-2" style={{ padding: '2.75rem 1.5rem', textAlign: 'center' }}>
      <div className="pm-empty__glyph" style={{ color: accent, background: 'var(--accent-50)' }}>
        {glyph}
      </div>
      {title && <h4 style={{ margin: 0 }}>{title}</h4>}
      {body && <div className="muted" style={{ maxWidth: 420 }}>{body}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
