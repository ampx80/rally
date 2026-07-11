// RiskList - the deal-risk board. A filterable grid of scored deals with a
// compact risk-band summary up top. Reads dealScores() straight off the live
// store, so it re-ranks the instant a deal moves stage or gets touched.
import React, { useMemo, useState } from 'react';
import { Card, SectionHeader, Segmented, Badge } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { dealScores } from '../../lib/intelligence-data.js';
import DealScoreCard from './DealScoreCard.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High risk' },
  { value: 'medium', label: 'Watch' },
  { value: 'low', label: 'Healthy' },
];

export default function RiskList() {
  const [filter, setFilter] = useState('high');
  const scores = useMemo(() => dealScores(), []);

  const bands = useMemo(() => ({
    high: scores.filter(s => s.tier === 'high'),
    medium: scores.filter(s => s.tier === 'medium'),
    low: scores.filter(s => s.tier === 'low'),
  }), [scores]);

  const shown = filter === 'all' ? scores : bands[filter];
  const val = (arr) => arr.reduce((s, x) => s + x.deal.value, 0);

  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Deal risk"
        title="Deals at risk, scored and explained"
        sub="Every open deal graded on close-date pressure, stage age, activity, and threading. Riskiest first."
        action={<Segmented options={FILTERS} value={filter} onChange={setFilter} />}
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '.7rem' }}>
        {[
          { key: 'high', label: 'High risk', color: 'var(--risk)', tone: 'risk' },
          { key: 'medium', label: 'Watch', color: 'var(--warn)', tone: 'warn' },
          { key: 'low', label: 'Healthy', color: 'var(--ok)', tone: 'ok' },
        ].map(b => (
          <button
            key={b.key}
            onClick={() => setFilter(b.key)}
            className="panel"
            style={{ padding: '.85rem 1rem', textAlign: 'left', cursor: 'pointer', borderColor: filter === b.key ? b.color : 'var(--line)', background: filter === b.key ? 'var(--n-25)' : 'var(--paper)' }}
          >
            <div className="row between">
              <span className="stat-label">{b.label}</span>
              <span className="dot" style={{ background: b.color }} />
            </div>
            <div className="fw-8" style={{ fontSize: '1.7rem', lineHeight: 1.1, color: b.color }}>{bands[b.key].length}</div>
            <div className="t-xs muted">{val(bands[b.key]) >= 1000 ? '$' + Math.round(val(bands[b.key]) / 1000) + 'K' : '$' + val(bands[b.key])} in play</div>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <Icon name="shield" size={28} style={{ color: 'var(--ok)' }} />
          <div className="fw-6">Nothing in this band</div>
          <div className="muted t-sm">No open deals are scored {filter}. Switch bands to see the rest of the book.</div>
        </div>
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))' }}>
          {shown.map(s => <DealScoreCard key={s.deal.id} item={s} />)}
        </div>
      )}
    </Card>
  );
}
