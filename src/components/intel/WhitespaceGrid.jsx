// WhitespaceGrid - where the next dollar hides. Healthy customers with no open
// deal (expansion) and thinly-threaded active accounts (land-and-widen), sized
// by estimated upside. Click a tile to open the account. Derives off
// whitespaceSignals().
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeader, Badge, HealthDot, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { whitespaceSignals } from '../../lib/intelligence-data.js';

const KIND = {
  expansion: { icon: 'trendUp', tone: 'ok', tint: 'var(--ok)', label: 'Expansion' },
  multithread: { icon: 'users', tone: 'info', tint: 'var(--info)', label: 'Widen' },
};

export default function WhitespaceGrid() {
  const navigate = useNavigate();
  const items = useMemo(() => whitespaceSignals(), []);
  const total = items.reduce((s, x) => s + x.potential, 0);

  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Growth"
        title="Whitespace and expansion"
        sub="Accounts with room to grow, ranked by estimated upside. The pipeline you have not built yet."
        action={<Badge tone="ok">{moneyK(total)} upside</Badge>}
      />

      {items.length === 0 ? (
        <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <Icon name="target" size={28} style={{ color: 'var(--n-400)' }} />
          <div className="fw-6">No whitespace surfaced</div>
          <div className="muted t-sm">Every customer already has an open deal. Good problem to have.</div>
        </div>
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '.8rem' }}>
          {items.map(w => {
            const kind = KIND[w.kind] || KIND.expansion;
            return (
              <div
                key={w.company.id}
                className="intel-ws"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/companies/${w.company.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/companies/${w.company.id}`); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="row between" style={{ position: 'relative' }}>
                  <span className="row gap-1" style={{ minWidth: 0 }}>
                    <HealthDot health={w.company.health} />
                    <span className="fw-7 clip">{w.company.name}</span>
                  </span>
                  <span className="intel-move__ic" style={{ background: kind.tint + '1a', color: kind.tint, width: 28, height: 28 }}>
                    <Icon name={kind.icon} size={15} />
                  </span>
                </div>
                <div className="row gap-1" style={{ margin: '.4rem 0', position: 'relative' }}>
                  <Badge tone={kind.tone} className="t-xs">{kind.label}</Badge>
                  <span className="t-xs muted clip">{w.company.industry}</span>
                </div>
                <div className="fw-8" style={{ fontSize: '1.4rem', lineHeight: 1.1, color: kind.tint, position: 'relative' }}>{moneyK(w.potential)}</div>
                <div className="t-xs muted" style={{ position: 'relative' }}>estimated upside</div>
                <div className="t-sm" style={{ color: 'var(--ink-2)', marginTop: '.5rem', position: 'relative' }}>{w.reason}</div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
