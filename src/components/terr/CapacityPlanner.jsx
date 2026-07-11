// Capacity + ramp planning. Every rep carries a quota, but a ramping
// rep only delivers a fraction of it. Ramped capacity = quota x ramp
// factor; where quota outruns capacity, the team has a coverage gap
// that hiring or reassignment has to close.
import React from 'react';
import { Card, Avatar, Badge, StatCard, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import './terr.css';

const ACCENT = '#5b4bf5';

export default function CapacityPlanner({ model }) {
  const rows = [...model.repRows].filter(r => r.quota > 0);
  const { totals } = model;
  const capPct = totals.teamQuota ? Math.round((totals.teamCapacity / totals.teamQuota) * 100) : 100;
  const ramping = rows.filter(r => r.ramp.ramping);

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Team quota" value={totals.teamQuota} format={moneyK} icon={<Icon name="target" size={18} />} sub={model.range.label} />
        <StatCard label="Ramped capacity" value={totals.teamCapacity} format={moneyK} icon={<Icon name="zap" size={18} />} accent="#0ea5a3" sparkColor="#0ea5a3" sub={`${capPct}% of quota deliverable`} />
        <StatCard label="Coverage gap" value={totals.capacityGap} format={moneyK} icon={<Icon name="arrowDown" size={18} />} accent={totals.capacityGap ? 'var(--risk)' : 'var(--ok)'} sparkColor={totals.capacityGap ? 'var(--risk)' : 'var(--ok)'} sub={totals.capacityGap ? 'quota above capacity' : 'fully covered'} />
        <StatCard label="Ramping reps" value={ramping.length} icon={<Icon name="users" size={18} />} accent="var(--warn)" sub={ramping.length ? 'below full productivity' : 'all reps ramped'} />
      </div>

      <Card className="col gap-3">
        <div className="col gap-1">
          <div className="eyebrow">Per rep</div>
          <h4 style={{ margin: 0 }}>Capacity vs quota + ramp</h4>
          <div className="muted t-sm">Green fill is deliverable capacity today; the tick is full quota. New hires ramp over {rows[0]?.ramp.rampMonths || 6} months.</div>
        </div>

        <div className="col gap-3">
          {rows.map(r => {
            const capPctRep = r.quota ? Math.min(100, Math.round((r.capacity / r.quota) * 100)) : 100;
            const gap = Math.max(0, r.quota - r.capacity);
            const rampPct = Math.round(r.ramp.factor * 100);
            return (
              <div key={r.user.id} className="col gap-1">
                <div className="row between" style={{ gap: '.5rem' }}>
                  <div className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                    <Avatar name={r.user.name} size={30} />
                    <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                      <span className="fw-6 clip">{r.user.name}</span>
                      <span className="t-xs muted clip">{r.territory ? r.territory.name : 'No territory'} - {r.ramp.tenureMonths}mo tenure</span>
                    </div>
                  </div>
                  <div className="row gap-2" style={{ alignItems: 'center', flex: 'none' }}>
                    {r.ramp.ramping ? (
                      <span className="terr-ramp" style={{ background: 'var(--warn-bg, rgba(179,114,26,.12))', color: 'var(--warn)' }}>
                        <Icon name="clock" size={11} /> Ramping {rampPct}%
                      </span>
                    ) : (
                      <span className="terr-ramp" style={{ background: 'var(--ok-bg, rgba(26,127,82,.12))', color: 'var(--ok)' }}>
                        <Icon name="check" size={11} /> Full ramp
                      </span>
                    )}
                  </div>
                </div>
                <div className="terr-bar-track" style={{ height: 14 }}>
                  <div className="terr-bar-fill" style={{ '--terr-w': capPctRep + '%', width: capPctRep + '%', background: r.ramp.ramping ? '#0ea5a3' : 'var(--ok)' }} />
                  <span className="terr-pace-mark" title="Full quota" style={{ left: '100%', height: 20, top: -3 }} />
                </div>
                <div className="row between t-xs muted">
                  <span>{moneyK(r.capacity)} capacity</span>
                  <span>{gap > 0 ? <span style={{ color: 'var(--risk)' }}>{moneyK(gap)} gap</span> : 'covers quota'} - {moneyK(r.quota)} quota</span>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="muted t-sm">No quota-carrying reps.</div>}
        </div>
      </Card>

      {model.territories.some(t => t.capacityGap > 0) && (
        <Card className="col gap-2">
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="shield" size={16} />
            <h4 style={{ margin: 0 }}>Books with a capacity gap</h4>
          </div>
          <div className="row gap-1 wrap">
            {model.territories.filter(t => t.capacityGap > 0).map(t => (
              <Badge key={t.id} tone="risk">{t.name} - {moneyK(t.capacityGap)} short</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
