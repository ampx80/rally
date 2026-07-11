// Customer Success - the post-sale command surface. Health of the book,
// renewals, churn-risk queue, expansion pipeline, and NRR/GRR - all derived
// live from the CRM via src/lib/success-data.js. Rook is framed as the layer
// watching signals and flagging risk. This is Rally's answer to Gainsight and
// ChurnZero: the same book of business the sales side closed, now operated for
// retention and growth.
import React, { useState } from 'react';
import { useStore } from '../lib/store.js';
import {
  getCsAccounts, csSummary, churnQueue, renewalBuckets, expansionQueue,
} from '../lib/success-data.js';
import { SectionHeader, StatCard, Card, Button, Badge, Tabs, Modal, moneyK, money } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import HealthGrid from '../components/cs/HealthGrid.jsx';
import NrrCard from '../components/cs/NrrCard.jsx';
import RenewalTimeline from '../components/cs/RenewalTimeline.jsx';
import ChurnRiskList from '../components/cs/ChurnRiskList.jsx';
import AccountHealthDetail from '../components/cs/AccountHealthDetail.jsx';
import PlaybookRunner from '../components/cs/PlaybookRunner.jsx';
import '../components/cs/cs.css';

const BAND_COLOR = { healthy: 'var(--ok)', watch: 'var(--warn)', risk: 'var(--risk)' };

// Portfolio band-mix bar - one glance at how the book splits across health.
function BandMix({ summary }) {
  const total = summary.count || 1;
  const parts = [
    { key: 'healthy', label: 'Healthy', n: summary.healthyCount },
    { key: 'watch', label: 'Watch', n: summary.watchCount },
    { key: 'risk', label: 'At risk', n: summary.atRiskCount },
  ];
  return (
    <Card className="col gap-3">
      <div className="col gap-1">
        <h4 style={{ margin: 0 }}>Portfolio health mix</h4>
        <div className="muted t-sm">{summary.count} customers, {moneyK(summary.startingArr)} ARR under management.</div>
      </div>
      <div className="row" style={{ height: 16, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
        {parts.map((p, i) => p.n > 0 && (
          <div key={p.key} className="cs-bar-grow" title={`${p.label}: ${p.n}`}
            style={{ width: `${(p.n / total) * 100}%`, background: BAND_COLOR[p.key], animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <div className="row gap-3 wrap">
        {parts.map(p => (
          <div key={p.key} className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="dot" style={{ background: BAND_COLOR[p.key] }} />
            <span className="fw-7 tnum">{p.n}</span>
            <span className="t-sm muted">{p.label}</span>
          </div>
        ))}
        <div className="row gap-2" style={{ alignItems: 'center', marginLeft: 'auto' }}>
          <Icon name="trendUp" size={15} style={{ color: 'var(--accent-600)' }} />
          <span className="fw-7 tnum">{summary.expansionCount}</span>
          <span className="t-sm muted">expansion-ready</span>
        </div>
      </div>
    </Card>
  );
}

export default function CustomerSuccess() {
  useStore(); // re-render + re-derive whenever the underlying CRM mutates

  // Cheap to recompute (~20 accounts) and the top-level useStore() above
  // guarantees this runs on every store commit, so the view stays live.
  const accounts = getCsAccounts();
  const summary = csSummary(accounts);
  const queue = churnQueue(accounts);
  const buckets = renewalBuckets(accounts);
  const expansions = expansionQueue(accounts);

  const [tab, setTab] = useState('book');
  const [selected, setSelected] = useState(accounts[0] || null);
  const [detailOpen, setDetailOpen] = useState(false); // detail modal for non-book tabs
  const [pbAccount, setPbAccount] = useState(null);     // playbook runner target

  // Keep the selected account fresh after store mutations (re-derived object).
  const liveSelected = selected ? (accounts.find(a => a.id === selected.id) || selected) : null;

  const selectInline = (a) => setSelected(a);              // book tab: right rail
  const selectModal = (a) => { setSelected(a); setDetailOpen(true); }; // other tabs
  const openPlaybook = (a) => setPbAccount(a);

  const TABS = [
    { key: 'book', label: 'Book of business', count: summary.count },
    { key: 'renewals', label: 'Renewals', count: summary.renewals90Count },
    { key: 'churn', label: 'Churn risk', count: queue.length },
    { key: 'expansion', label: 'Expansion', count: summary.expansionCount },
  ];

  return (
    <div className="cs-root fade-up col gap-3">
      <SectionHeader
        title="Customer Success"
        sub="Post-sale health, renewals, and expansion - operated off the same book the team closed."
      />

      {/* Rook flag banner */}
      <Card pad={false} style={{ overflow: 'hidden', position: 'relative', background: 'linear-gradient(120deg, var(--nav), var(--nav-2))', color: 'var(--nav-text)' }}>
        <span className="cs-shimmer" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="row between gap-3 wrap" style={{ position: 'relative', padding: '1.05rem 1.25rem', alignItems: 'center' }}>
          <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
            <span className="row center floaty" style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff', flex: 'none', boxShadow: 'var(--accent-glow)' }}>
              <Icon name="sparkles" size={22} fill="currentColor" stroke={0} />
            </span>
            <div className="col" style={{ minWidth: 0 }}>
              <span className="fw-7">Rook is watching {summary.count} accounts</span>
              <span className="t-sm" style={{ color: 'var(--nav-muted)' }}>
                {summary.atRiskCount} flagged at risk ({moneyK(summary.atRiskArr)} ARR) - {summary.renewals90Count} renewals in the next 90 days ({moneyK(summary.renewals90Arr)}).
              </span>
            </div>
          </div>
          <Button variant="primary" onClick={() => setTab('churn')} style={{ flex: 'none' }}>
            <Icon name="zap" size={15} /> Work the risk queue
          </Button>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard label="Net revenue retention" value={summary.nrr} format={(n) => Math.round(n) + '%'}
          icon={<Icon name="trendUp" size={18} />} accent={summary.nrr >= 100 ? 'var(--ok)' : 'var(--risk)'}
          sub={summary.nrr >= 100 ? 'expanding net of churn' : 'below breakeven'} />
        <StatCard label="Gross revenue retention" value={summary.grr} format={(n) => Math.round(n) + '%'}
          icon={<Icon name="shield" size={18} />} accent="var(--info)" sub="churn + contraction only" />
        <StatCard label="ARR under management" value={summary.startingArr} format={moneyK}
          icon={<Icon name="dollar" size={18} />} sub={`${summary.count} customers`} />
        <StatCard label="ARR at risk" value={summary.atRiskArr} format={moneyK}
          icon={<Icon name="zap" size={18} />} accent="var(--risk)" sub={`${summary.atRiskCount} accounts`} />
        <StatCard label="Expansion pipeline" value={summary.expansionArr} format={moneyK}
          icon={<Icon name="rocket" size={18} />} accent="var(--accent)" sub={`${summary.expansionCount} accounts ready`} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'book' && (
        <div className="col gap-3">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            <NrrCard summary={summary} />
            <BandMix summary={summary} />
          </div>
          <div className="cs-book" style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1fr)' }}>
            <Card className="col gap-3">
              <div className="col gap-1">
                <h4 style={{ margin: 0 }}>Book of business health</h4>
                <div className="muted t-sm">Every customer, colored by health band and sized by ARR.</div>
              </div>
              <HealthGrid accounts={accounts} selectedId={liveSelected?.id} onSelect={selectInline} />
            </Card>
            <div style={{ position: 'sticky', top: 84, alignSelf: 'start' }}>
              <AccountHealthDetail account={liveSelected} onRunPlaybook={openPlaybook} />
            </div>
          </div>
        </div>
      )}

      {tab === 'renewals' && (
        <Card className="col gap-3">
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Renewal calendar</h4>
            <div className="muted t-sm">Contracts up for renewal over the next five months. Click an account for its health.</div>
          </div>
          <RenewalTimeline buckets={buckets} onSelect={selectModal} />
        </Card>
      )}

      {tab === 'churn' && (
        <Card className="col gap-3">
          <div className="row between gap-2 wrap">
            <div className="col gap-1">
              <h4 style={{ margin: 0 }}>Churn-risk queue</h4>
              <div className="muted t-sm">Ranked by weighted exposure - ARR times churn probability. Work top-down.</div>
            </div>
            <Badge tone="risk">{moneyK(queue.reduce((s, a) => s + Math.round(a.arr * a.churnProb), 0))} weighted exposure</Badge>
          </div>
          <ChurnRiskList queue={queue} onSelect={selectModal} onRunPlaybook={openPlaybook} />
        </Card>
      )}

      {tab === 'expansion' && (
        <Card className="col gap-3">
          <div className="col gap-1">
            <h4 style={{ margin: 0 }}>Expansion pipeline</h4>
            <div className="muted t-sm">Healthy accounts sending buying signals. Upside is a modeled uplift on current ARR.</div>
          </div>
          {expansions.length === 0 ? (
            <div className="col center gap-1" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <Icon name="rocket" size={28} style={{ color: 'var(--n-400)' }} />
              <div className="fw-6">No expansion signals yet</div>
              <div className="muted t-sm">Accounts light up here as adoption and usage climb.</div>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {expansions.map((a, i) => (
                <div key={a.id} className="cs-row-in card" style={{ animationDelay: `${i * 50}ms`, borderTop: '3px solid var(--accent)' }}>
                  <div className="row between gap-2" style={{ alignItems: 'flex-start' }}>
                    <button onClick={() => selectModal(a)} className="col gap-1" style={{ textAlign: 'left', minWidth: 0 }}>
                      <span className="fw-7 clip">{a.name}</span>
                      <span className="t-sm muted clip">{a.industry} - CSM {a.csm}</span>
                    </button>
                    <div className="col gap-1" style={{ textAlign: 'right', flex: 'none' }}>
                      <span className="tnum fw-8" style={{ color: 'var(--accent-600)' }}>+{moneyK(a.expansionArr)}</span>
                      <span className="t-xs muted">on {moneyK(a.arr)}</span>
                    </div>
                  </div>
                  <div className="row gap-2 wrap" style={{ marginTop: '.7rem' }}>
                    {a.signals.slice(0, 3).map((s, j) => (
                      <span key={j} className="t-xs" style={{ color: 'var(--accent-600)', background: 'var(--accent-50)', borderRadius: 999, padding: '.2rem .55rem' }}>{s}</span>
                    ))}
                  </div>
                  <div className="row between" style={{ marginTop: '.8rem', alignItems: 'center' }}>
                    <Badge tone="ok">Health {a.score}</Badge>
                    <Button size="sm" variant="primary" onClick={() => openPlaybook(a)}>
                      <Icon name="rocket" size={14} /> Expansion play
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Detail modal for non-book tabs */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={null} width={520}>
        <AccountHealthDetail account={liveSelected} onRunPlaybook={(a) => { setDetailOpen(false); openPlaybook(a); }} onClose={() => setDetailOpen(false)} />
      </Modal>

      {/* Playbook runner */}
      <PlaybookRunner account={pbAccount} open={!!pbAccount} onClose={() => setPbAccount(null)} onRan={() => {}} />
    </div>
  );
}
