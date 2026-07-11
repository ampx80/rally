// Recent wins - a small celebration rail of the latest closed-won deals.
// A thin shine sweeps the card header to give the moment a little life.
import React from 'react';
import { Link } from 'react-router-dom';
import { getCompany, userName } from '../../lib/store.js';
import { Avatar, SectionHeader, moneyK, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';

export default function RecentWins({ wins = [], action }) {
  const total = wins.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card card-pad col cc-win">
      <SectionHeader
        title="Recent wins"
        sub={wins.length ? `${moneyK(total)} closed across ${wins.length} deal${wins.length === 1 ? '' : 's'}` : 'No wins logged yet'}
        action={action}
      />
      {wins.length === 0 ? (
        <div className="muted t-sm" style={{ padding: '.5rem 0' }}>Close a deal and it lands here.</div>
      ) : (
        <div className="col">
          {wins.map((d) => {
            const co = getCompany(d.companyId);
            return (
              <div key={d.id} className="cc-row">
                <span className="cc-win-medal"><Icon name="check" size={16} stroke={3} /></span>
                <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                  <Link to={`/deals/${d.id}`} className="fw-6 clip link" style={{ color: 'var(--ink)' }}>{d.name}</Link>
                  <span className="t-sm muted clip">{co?.name || 'No company'} - {userName(d.ownerId)}</span>
                </div>
                <div className="col" style={{ flex: 'none', alignItems: 'flex-end', gap: '.2rem' }}>
                  <span className="fw-7 tnum" style={{ color: 'var(--ok)' }}>{moneyK(d.value)}</span>
                  <span className="t-xs muted">{relTime(d.closeDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
