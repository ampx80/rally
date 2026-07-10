// Compact audit timeline (Wave 2). Renders the org-wide audit log for one
// record (src/lib/audit.js) as who changed what, from -> to, with relative
// time. `extra` merges in legacy per-object history rows (e.g. dealExtras
// .history) so older entries and audit-engine entries read as one stream.
// ASCII hyphens only.
import React from 'react';
import { useAudit, getAudit } from '../lib/audit.js';
import { relTime, monthDay } from './UI.jsx';
import { Icon } from './icons.jsx';

const fmt = (v) => {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  const s = String(v);
  return s.length > 48 ? s.slice(0, 45) + '...' : s;
};

export default function AuditPanel({ objectType, recordId, extra = [], limit = 50 }) {
  useAudit(); // re-render when the log changes
  const entries = [...getAudit(objectType, recordId), ...(extra || [])]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);

  if (entries.length === 0) {
    return <div className="muted t-sm">No changes recorded yet. Edits to any field land here.</div>;
  }

  return (
    <div className="col">
      {entries.map((h, i) => {
        const from = fmt(h.from);
        const to = fmt(h.to);
        return (
          <div key={h.id || `${h.at}-${i}`} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.55rem 0', borderBottom: i < entries.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="row center" style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-pill)', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
              <Icon name="edit" size={13} />
            </span>
            <div className="col" style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
              <span className="t-sm" style={{ overflowWrap: 'anywhere' }}>
                <span className="fw-6">{h.who || 'System'}</span>
                {' '}changed <span className="fw-6">{h.field}</span>
                {from ? <> from <span className="muted">{from}</span></> : null}
                {to ? <> to <span className="fw-6">{to}</span></> : <> (cleared)</>}
              </span>
              <span className="t-xs muted">{relTime(h.at)} - {monthDay(h.at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
