// Recent activity - the team's latest logged touches across the book.
// Resolves each row's related record to a deep link. Read-only.
import React from 'react';
import { Link } from 'react-router-dom';
import {
  getDeal, getContact, getCompany, contactName, userName,
} from '../../lib/store.js';
import { SectionHeader, relTime } from '../UI.jsx';
import { Icon, typeIcon } from '../icons.jsx';

function relatedFor(a) {
  if (a.relatedType === 'deal') { const d = getDeal(a.relatedId); if (d) return { label: d.name, to: `/deals/${d.id}` }; }
  if (a.relatedType === 'contact') { const c = getContact(a.relatedId); if (c) return { label: contactName(c), to: `/contacts/${c.id}` }; }
  if (a.companyId) { const co = getCompany(a.companyId); if (co) return { label: co.name, to: `/companies/${co.id}` }; }
  return null;
}

export default function ActivityFeed({ items = [], action }) {
  return (
    <div className="card card-pad col">
      <SectionHeader title="Recent activity" sub="Across the whole team" action={action} />
      {items.length === 0 ? (
        <div className="muted t-sm" style={{ padding: '.5rem 0' }}>No activity logged yet.</div>
      ) : (
        <div className="col">
          {items.map((a) => {
            const rel = relatedFor(a);
            return (
              <div key={a.id} className="cc-row">
                <span className="cc-actico"><Icon name={typeIcon[a.type] || 'activity'} size={15} /></span>
                <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                  <span className="fw-6 clip">{a.subject}</span>
                  <span className="t-sm muted clip">
                    {userName(a.ownerId)}{rel && <> - <Link to={rel.to} className="link" style={{ color: 'var(--n-600)' }}>{rel.label}</Link></>}
                  </span>
                </div>
                <span className="t-sm muted" style={{ flex: 'none' }}>{relTime(a.dueAt || a.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
