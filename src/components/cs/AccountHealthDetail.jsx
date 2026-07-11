// Account health detail panel. The full post-sale picture for one customer:
// health ring, the signal breakdown that drives the score, renewal + ARR,
// CSM, and either the churn reasons (at-risk) or expansion signals (growth),
// with a run-playbook action. Rendered inline beside the book, not a modal.
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, Ring, ProgressBar, moneyK, money, longDate, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';

const BAND_COLOR = { healthy: 'var(--ok)', watch: 'var(--warn)', risk: 'var(--risk)' };

// Turn raw signals into 0-100 bar values with a shared, honest scale.
function signalRows(a) {
  return [
    { label: 'Feature adoption', val: a.adoption, hint: `${a.adoption}% of licensed features in active use` },
    { label: 'Usage trend', val: Math.round(((a.usageTrend + 40) / 70) * 100), hint: `${a.usageTrend >= 0 ? '+' : ''}${a.usageTrend}% quarter over quarter` },
    { label: 'Engagement', val: Math.round(100 - Math.min(a.engagementDays, 60) / 60 * 100), hint: `Last exec touch ${a.engagementDays}d ago` },
    { label: 'Sentiment', val: a.sentiment, hint: `${a.sentiment}/100 from recent notes and replies` },
    { label: 'Seat utilization', val: a.seatUtilization, hint: `${a.seatUtilization}% of purchased seats active` },
    { label: 'Support load', val: Math.round(100 - Math.min(a.supportTickets, 6) / 6 * 100), hint: `${a.supportTickets} open escalation${a.supportTickets === 1 ? '' : 's'}` },
  ];
}
function barColor(v) { return v >= 70 ? 'var(--ok)' : v >= 45 ? 'var(--warn)' : 'var(--risk)'; }

export default function AccountHealthDetail({ account, onRunPlaybook, onClose }) {
  if (!account) {
    return (
      <Card className="col center gap-2" style={{ padding: '2.5rem 1.25rem', textAlign: 'center', minHeight: 260, justifyContent: 'center' }}>
        <Icon name="building" size={30} style={{ color: 'var(--n-400)' }} />
        <div className="fw-6">Select an account</div>
        <div className="muted t-sm" style={{ maxWidth: 260 }}>Pick any tile in the health heatmap to see its full post-sale picture.</div>
      </Card>
    );
  }
  const a = account;
  const ringColor = BAND_COLOR[a.band.key];

  return (
    <Card className="col gap-3 cs-panel-in" key={a.id}>
      <div className="row between gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <Link to={`/companies/${a.id}`} className="link fw-7 clip" style={{ fontSize: '1.05rem' }}>{a.name}</Link>
          <span className="t-sm muted clip">{a.industry} - {a.size} employees</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-quiet" aria-label="Close" style={{ padding: '.2rem .4rem', flex: 'none' }}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* headline row */}
      <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
        <Ring value={a.score} size={78} stroke={8} color={ringColor} label={a.score} />
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <Badge tone={a.band.tone}>{a.band.label}</Badge>
          <span className="t-sm muted">Churn risk {Math.round(a.churnProb * 100)}%</span>
        </div>
        <div className="col gap-1" style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span className="tnum fw-8" style={{ fontSize: '1.3rem' }}>{money(a.arr)}</span>
          <span className="t-xs muted">annual recurring revenue</span>
        </div>
      </div>

      {/* meta strip */}
      <div className="row gap-3 wrap" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '.7rem 0' }}>
        <div className="col gap-1"><span className="t-xs muted">CSM</span><span className="fw-6 t-sm">{a.csm}</span></div>
        <div className="col gap-1"><span className="t-xs muted">Renewal</span><span className="fw-6 t-sm">{a.daysToRenewal < 0 ? `${Math.abs(a.daysToRenewal)}d overdue` : relTime(a.renewalDate)}</span></div>
        <div className="col gap-1"><span className="t-xs muted">Contacts</span><span className="fw-6 t-sm">{a.contactCount}</span></div>
        <div className="col gap-1" style={{ marginLeft: 'auto' }}><span className="t-xs muted">Renews on</span><span className="fw-6 t-sm">{longDate(a.renewalDate)}</span></div>
      </div>

      {/* signal breakdown */}
      <div className="col gap-2">
        <span className="eyebrow">Health signals</span>
        {signalRows(a).map((s) => (
          <div key={s.label} className="col gap-1">
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="t-sm fw-6">{s.label}</span>
              <span className="t-xs muted">{s.hint}</span>
            </div>
            <ProgressBar value={s.val} color={barColor(s.val)} height={7} />
          </div>
        ))}
      </div>

      {/* reasons or expansion */}
      {a.isExpansion ? (
        <div className="col gap-2" style={{ background: 'var(--accent-50)', borderRadius: 'var(--r-md)', padding: '.8rem .9rem' }}>
          <span className="row gap-1" style={{ alignItems: 'center', color: 'var(--accent-600)' }}>
            <Icon name="trendUp" size={15} /><span className="fw-7 t-sm">Expansion signals - upside {moneyK(a.expansionArr)}</span>
          </span>
          {a.signals.map((s, i) => (
            <span key={i} className="row gap-1 t-sm" style={{ alignItems: 'center' }}><Icon name="check" size={13} style={{ color: 'var(--accent-600)' }} />{s}</span>
          ))}
        </div>
      ) : (
        <div className="col gap-2" style={{ background: 'var(--risk-bg)', borderRadius: 'var(--r-md)', padding: '.8rem .9rem' }}>
          <span className="row gap-1" style={{ alignItems: 'center', color: 'var(--risk)' }}>
            <Icon name="zap" size={15} /><span className="fw-7 t-sm">Why Rook flagged this account</span>
          </span>
          {a.reasons.map((r, i) => (
            <span key={i} className="row gap-1 t-sm" style={{ alignItems: 'center' }}><Icon name="chevronRight" size={13} style={{ color: 'var(--risk)' }} />{r}</span>
          ))}
        </div>
      )}

      <div className="row gap-2 wrap">
        <Button variant="primary" onClick={() => onRunPlaybook?.(a)} style={{ flex: '1 1 auto' }}>
          <Icon name="rocket" size={15} /> Run playbook
        </Button>
        <Button as={Link} to={`/companies/${a.id}`} variant="ghost" style={{ flex: '0 0 auto' }}>
          Open account
        </Button>
      </div>
    </Card>
  );
}
