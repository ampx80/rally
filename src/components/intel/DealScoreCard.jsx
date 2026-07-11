// DealScoreCard - one deal, scored and explained. The card a rep opens to
// understand WHY a deal is at risk, not just that it is. Reasons render as
// an AI-styled "here is what I see" list. Click anywhere to open the deal.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Ring, money, moneyK, shortDate } from '../UI.jsx';
import { Icon } from '../icons.jsx';

const TIER = {
  high: { tone: 'risk', color: 'var(--risk)', label: 'High risk' },
  medium: { tone: 'warn', color: 'var(--warn)', label: 'Watch' },
  low: { tone: 'ok', color: 'var(--ok)', label: 'Healthy' },
};

export default function DealScoreCard({ item }) {
  const navigate = useNavigate();
  const t = TIER[item.tier] || TIER.low;
  const { deal, company, owner, factors } = item;

  return (
    <div
      className="intel-insight"
      data-tier={item.tier}
      onClick={() => navigate(`/deals/${deal.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/deals/${deal.id}`); }}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-pad col gap-2">
        <div className="row between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="intel-ai-tag"><span className="intel-spark" />Risk read</span>
            <h4 className="clip" style={{ margin: 0 }}>{company?.name || deal.name}</h4>
            <span className="t-sm muted clip">{deal.name}</span>
          </div>
          <div style={{ flex: 'none', textAlign: 'center' }}>
            <Ring value={item.score} size={58} stroke={6} color={t.color} label={<span className="intel-score" style={{ fontSize: 18, color: t.color }}>{item.score}</span>} />
            <div className="t-xs muted" style={{ marginTop: 2 }}>risk score</div>
          </div>
        </div>

        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <Badge tone={t.tone}>{t.label}</Badge>
          <Badge>{factors.stage}</Badge>
          <span className="fw-7 tnum">{money(deal.value)}</span>
          <span className="t-sm muted">
            {factors.daysToClose < 0 ? `${-factors.daysToClose}d overdue` : `closes ${shortDate(deal.closeDate)}`}
          </span>
        </div>

        <div className="col gap-1" style={{ marginTop: 2 }}>
          {item.reasons.length === 0 ? (
            <div className="intel-reason" data-tone="low">
              <span className="intel-bul" />
              <span>No risk signals firing. {item.positives.join(' ') || 'On a clean path.'}</span>
            </div>
          ) : item.reasons.map((r, i) => (
            <div key={i} className="intel-reason" data-tone={item.tier} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="intel-bul" />
              <span>{r}</span>
            </div>
          ))}
        </div>

        <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem', marginTop: 2 }}>
          <span className="t-sm muted clip">Owner {owner} - {factors.contacts} contact{factors.contacts === 1 ? '' : 's'} - touched {factors.touchDays}d ago</span>
          <span className="row gap-1 fw-6 t-sm" style={{ color: 'var(--accent-600)', flex: 'none' }}>
            Open <Icon name="chevronRight" size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
