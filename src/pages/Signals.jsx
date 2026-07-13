// Revenue Signals. Rally's predictive revenue intelligence - churn risk,
// expansion propensity, and buyer intent surfaced as ONE prioritized action
// feed with a recommended play on every card. This is the leapfrog on
// HubSpot Breeze Intelligence + GoHighLevel: nobody else blends all three
// into a single decision stream. Four surfaces over one local-first store
// (src/lib/signals-data.js): the Signals feed, a Churn radar, an Expansion
// radar, and a Buyer-intent board. 100% functional with seeded data + zero
// backend; real enrichment is env-gated and degrades to the local model.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useSignals, getSignals, getAccounts, getIntent, getAccount,
  openSignals, churnRadar, expansionRadar, signalStats, signalsForAccount,
  signalPriority, signalMeta, bandFor, expansionBand, hasEnrichEnv,
  actOnSignal, dismissSignal, snoozeSignal, reopenSignal,
  FEED_FILTERS,
} from '../lib/signals-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Modal, EmptyState,
  Tabs, Ring, Sparkline, ProgressBar, Segmented, GradientText, StatCard,
  HealthDot, useToast, money, moneyK, relTime, Trend, avatarColor,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

// A signed dollar chip: green upside, red risk, neutral lifecycle.
function ValueChip({ value, sign }) {
  if (value == null) return null;
  const positive = sign > 0 || (sign === 0 ? null : false);
  const color = sign > 0 ? 'var(--ok)' : sign < 0 ? 'var(--risk)' : 'var(--info)';
  const prefix = sign > 0 ? '+' : sign < 0 ? '-' : '';
  return <span className="fw-8 tnum" style={{ color, fontSize: '1.02rem', letterSpacing: '-.01em' }}>{prefix}{moneyK(Math.abs(value))}</span>;
}

function TypeGlyph({ type, size = 34 }) {
  const meta = signalMeta(type);
  const bg = { risk: 'var(--risk-bg)', warn: 'var(--warn-bg)', ok: 'var(--ok-bg)', info: 'var(--info-bg)', accent: 'var(--accent-50)' }[meta.tone] || 'var(--n-100)';
  const fg = { risk: 'var(--risk)', warn: 'var(--warn)', ok: 'var(--ok)', info: 'var(--info)', accent: 'var(--accent-600)' }[meta.tone] || 'var(--ink-2)';
  return (
    <span style={{ width: size, height: size, borderRadius: 10, background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icon name={meta.icon} size={size * 0.5} />
    </span>
  );
}

/* ============================================================
   SIGNAL DECISION CARD (the heart of the feed)
   ============================================================ */
function SignalCard({ sig, onOpen, toast, onChange }) {
  const meta = signalMeta(sig.type);
  const conf = sig.confidence || 60;
  const confColor = conf >= 80 ? 'var(--ok)' : conf >= 60 ? 'var(--accent)' : 'var(--warn)';

  const act = () => { actOnSignal(sig.id); toast(`Play started on ${sig.accountName}`); onChange?.(); };
  const snooze = () => { snoozeSignal(sig.id, 7); toast('Snoozed for 7 days', 'warn'); onChange?.(); };
  const dismiss = () => { dismissSignal(sig.id); toast('Signal dismissed'); onChange?.(); };

  return (
    <Card className="col gap-2" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: meta.tone === 'ok' ? 'var(--ok)' : meta.tone === 'accent' ? 'var(--accent)' : meta.tone === 'info' ? 'var(--info)' : meta.tone === 'warn' ? 'var(--warn)' : 'var(--risk)' }} />
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <TypeGlyph type={sig.type} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
              <span className="fw-8" style={{ fontSize: '1.02rem' }}>{meta.label}</span>
              <Badge tone={meta.tone} className="t-xs">{meta.category}</Badge>
            </div>
            <button onClick={() => onOpen(sig.accountId)} className="row gap-1 link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0 }}>
              <Avatar name={sig.accountName} size={18} color={avatarColor(sig.accountName)} />
              <span className="fw-6 clip" style={{ color: 'var(--ink)' }}>{sig.accountName}</span>
              <span className="t-xs muted">{sig.industry}</span>
            </button>
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 2, flex: 'none' }}>
          <ValueChip value={sig.value} sign={meta.sign} />
          <span className="t-xs muted">{meta.sign > 0 ? 'upside' : meta.sign < 0 ? 'at risk' : 'renewal'}</span>
        </div>
      </div>

      {/* evidence */}
      <div className="col gap-1" style={{ paddingLeft: 2 }}>
        {sig.evidence.slice(0, 3).map((e, i) => (
          <div key={i} className="row gap-1" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--n-400)', marginTop: 2, flex: 'none' }}><Icon name="chevronRight" size={13} /></span>
            <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{e}</span>
          </div>
        ))}
      </div>

      {/* confidence + recommended play */}
      <div className="panel card-pad col gap-2" style={{ background: 'var(--n-25)', padding: '.85rem 1rem' }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <span className="eyebrow" style={{ color: 'var(--accent-600)' }}>Recommended play</span>
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="t-xs muted fw-6">Confidence</span>
            <span className="fw-8 tnum" style={{ color: confColor }}>{conf}%</span>
          </span>
        </div>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7">{sig.play.title}</span>
            <span className="t-sm muted">{sig.play.detail}</span>
          </div>
        </div>
        <div className="row gap-1 wrap">
          <Button variant="accent" size="sm" onClick={act}><Icon name="check" size={14} /> {sig.play.cta}</Button>
          <Button variant="ghost" size="sm" onClick={() => askRook(sig.rookPrompt)}><Icon name="sparkles" size={14} /> Ask Rook</Button>
          <span className="spacer" />
          <Button variant="quiet" size="sm" onClick={snooze} aria-label="Snooze signal"><Icon name="clock" size={14} /></Button>
          <Button variant="quiet" size="sm" onClick={dismiss} aria-label="Dismiss signal"><Icon name="x" size={14} /></Button>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   TAB 1 - SIGNALS FEED
   ============================================================ */
function Feed({ stats, onOpenAccount, toast }) {
  const snap = useSignals();                       // re-derive on any store commit (e.g. acting from the account modal), not just in-feed actions
  const [filter, setFilter] = useState('all');
  const [bump, setBump] = useState(0);            // force re-read after a status change
  const onChange = () => setBump(b => b + 1);

  const all = useMemo(() => openSignals().sort((a, b) => signalPriority(b) - signalPriority(a)), [bump, snap]);
  const rows = filter === 'all' ? all : all.filter(s => s.category === filter);
  const counts = useMemo(() => {
    const c = { all: all.length };
    for (const f of FEED_FILTERS) if (f.value !== 'all') c[f.value] = all.filter(s => s.category === f.value).length;
    return c;
  }, [all]);

  const top = rows[0];

  return (
    <div className="col gap-3">
      {/* headline banner */}
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">One feed, every revenue signal</div>
            <h3 style={{ margin: 0 }}>Churn, expansion and intent, ranked by what to do next</h3>
            <div className="muted t-sm" style={{ maxWidth: 560 }}>The model scores your whole book every night and surfaces the highest-leverage move first. Every card ships with the evidence, a confidence score, and a play you can run or hand to Rook.</div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => askRook('Walk me through my top revenue signals right now and tell me which account to act on first and why.')}><Icon name="sparkles" size={16} /> Brief me</Button>
            {top && <Button variant="accent" onClick={() => onOpenAccount(top.accountId)}><Icon name="zap" size={16} /> Act on top signal</Button>}
          </div>
        </div>
      </Card>

      {/* filter row */}
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="row gap-1 wrap">
          {FEED_FILTERS.map(f => {
            const on = filter === f.value;
            const n = counts[f.value] || 0;
            return (
              <button key={f.value} onClick={() => setFilter(f.value)} className="btn btn-sm"
                style={{ background: on ? 'var(--accent)' : 'var(--paper)', color: on ? '#fff' : 'var(--ink-2)', border: on ? 'none' : '1px solid var(--line-strong)' }}>
                {f.label}<span className="tnum" style={{ opacity: .8, marginLeft: 4 }}>{n}</span>
              </button>
            );
          })}
        </div>
        <span className="t-sm muted tnum">{rows.length} open signal{rows.length === 1 ? '' : 's'}</span>
      </div>

      {/* the prioritized stream */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
        {rows.map(s => <SignalCard key={s.id} sig={s} onOpen={onOpenAccount} toast={toast} onChange={onChange} />)}
      </div>
      {!rows.length && (
        <Card>
          <EmptyState icon="✅" title="Inbox zero on signals" body="Every open signal in this view has been actioned, snoozed or dismissed. Nicely done - the radar keeps watching in the background." />
        </Card>
      )}

      {!hasEnrichEnv() && (
        <div className="t-xs muted row gap-1"><Icon name="lock" size={13} /> Running on the built-in prediction model. Connect an enrichment provider (VITE_ENRICH_API) to blend third-party intent and firmographics.</div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 2 - CHURN RADAR
   ============================================================ */
function DriverBars({ drivers }) {
  if (!drivers?.length) return <span className="t-xs muted">No active risk drivers</span>;
  return (
    <div className="col gap-1" style={{ width: '100%' }}>
      {drivers.map((d, i) => (
        <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="t-xs" style={{ width: 190, flex: 'none', color: 'var(--ink-2)' }} title={d.label}>{d.label}</span>
          <div style={{ flex: 1 }}><ProgressBar value={d.impact} color={d.impact >= 70 ? 'var(--risk)' : d.impact >= 45 ? 'var(--warn)' : 'var(--info)'} height={7} /></div>
        </div>
      ))}
    </div>
  );
}

function ChurnRadar({ onOpenAccount, toast }) {
  const rows = useMemo(() => churnRadar(), []);
  const atRisk = rows.filter(a => a.churnScore >= 55);
  const arrAtRisk = atRisk.reduce((s, a) => s + a.valueAtRisk, 0);
  const worst = rows[0];

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr 1fr' }}>
        <Card className="row gap-3" style={{ alignItems: 'center' }}>
          <Ring value={worst ? worst.churnScore : 0} size={96} stroke={10} color={bandFor(worst?.churnScore || 0).color}
            label={<span className="col center" style={{ gap: 0 }}><span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{worst?.churnScore || 0}</span><span className="t-xs muted">risk</span></span>} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Highest churn risk</div>
            <button onClick={() => worst && onOpenAccount(worst.id)} className="fw-8 clip link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.2rem', color: 'var(--ink)', textAlign: 'left' }}>{worst?.name}</button>
            <div className="t-sm muted">{worst?.drivers[0]?.label || 'Stable'}</div>
          </div>
        </Card>
        <StatCard label="Accounts at risk" value={atRisk.length} icon={<Icon name="shield" size={18} />} accent="var(--risk)" sub={`${rows.length} accounts scored`} />
        <StatCard label="ARR at risk" value={arrAtRisk} format={moneyK} icon={<Icon name="dollar" size={18} />} accent="var(--risk)" sub="Weighted by churn probability" />
      </div>

      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ paddingBottom: '.9rem' }}>
          <SectionHeader title="Churn radar" sub="Every account ranked by probability, with the drivers behind the score" />
          <Button variant="ghost" size="sm" onClick={() => askRook('Which of my at-risk accounts should I prioritize this week and what save play do you recommend for each?')}><Icon name="sparkles" size={15} /> Ask Rook to triage</Button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Account</th><th>Churn</th><th>Health trend</th><th>Top risk drivers</th><th style={{ textAlign: 'right' }}>ARR at risk</th><th></th></tr></thead>
            <tbody>
              {rows.map(a => {
                const band = bandFor(a.churnScore);
                return (
                  <tr key={a.id}>
                    <td>
                      <button onClick={() => onOpenAccount(a.id)} className="row gap-2 link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar name={a.name} size={30} color={avatarColor(a.name)} />
                        <span className="col" style={{ gap: 0, minWidth: 0, alignItems: 'flex-start' }}>
                          <span className="fw-7 clip" style={{ color: 'var(--ink)' }}>{a.name}</span>
                          <span className="t-xs muted">{a.industry} - {a.owner}</span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="fw-8 tnum" style={{ color: band.color, fontSize: '1.05rem' }}>{a.churnScore}</span>
                        <Badge tone={band.tone} className="t-xs">{band.label}</Badge>
                      </div>
                    </td>
                    <td>
                      <div className="row gap-1" style={{ alignItems: 'center' }}>
                        <Sparkline data={a.healthTrend} w={72} h={26} color={a.healthDelta >= 0 ? 'var(--ok)' : 'var(--risk)'} />
                        <Trend value={a.healthDelta} />
                      </div>
                    </td>
                    <td style={{ minWidth: 230 }}><DriverBars drivers={a.drivers.slice(0, 2)} /></td>
                    <td style={{ textAlign: 'right' }}><span className="fw-7 tnum" style={{ color: a.churnScore >= 55 ? 'var(--risk)' : 'var(--n-600)' }}>{money(a.valueAtRisk)}</span></td>
                    <td style={{ textAlign: 'right' }}><Button variant="quiet" size="sm" onClick={() => onOpenAccount(a.id)}>View <Icon name="chevronRight" size={14} /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 3 - EXPANSION RADAR
   ============================================================ */
function ExpansionRadar({ onOpenAccount, toast }) {
  const rows = useMemo(() => expansionRadar(), []);
  const hot = rows.filter(a => a.expansionScore >= 64);
  const pipeline = hot.reduce((s, a) => s + a.expansionValue, 0);
  const best = rows[0];

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr 1fr' }}>
        <Card className="row gap-3" style={{ alignItems: 'center' }}>
          <Ring value={best ? best.expansionScore : 0} size={96} stroke={10} color={expansionBand(best?.expansionScore || 0).color}
            label={<span className="col center" style={{ gap: 0 }}><span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{best?.expansionScore || 0}</span><span className="t-xs muted">ready</span></span>} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Hottest expansion</div>
            <button onClick={() => best && onOpenAccount(best.id)} className="fw-8 clip link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.2rem', color: 'var(--ink)', textAlign: 'left' }}>{best?.name}</button>
            <div className="t-sm muted">{best?.suggestedOffer}</div>
          </div>
        </Card>
        <StatCard label="Expansion-ready" value={hot.length} icon={<Icon name="trendUp" size={18} />} accent="var(--ok)" sub={`${rows.length} accounts scored`} />
        <StatCard label="Expansion pipeline" value={pipeline} format={moneyK} icon={<Icon name="rocket" size={18} />} accent="var(--ok)" sub="Untapped ARR upside" />
      </div>

      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ paddingBottom: '.9rem' }}>
          <SectionHeader title="Expansion radar" sub="Accounts ranked by propensity, with the signal and the offer to lead with" />
          <Button variant="ghost" size="sm" onClick={() => askRook('Rank my expansion opportunities by likely ARR and draft an opener for the top one.')}><Icon name="sparkles" size={15} /> Ask Rook to sequence</Button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Account</th><th>Propensity</th><th>Usage trend</th><th>Signal</th><th>Suggested offer</th><th style={{ textAlign: 'right' }}>ARR upside</th><th></th></tr></thead>
            <tbody>
              {rows.map(a => {
                const band = expansionBand(a.expansionScore);
                return (
                  <tr key={a.id}>
                    <td>
                      <button onClick={() => onOpenAccount(a.id)} className="row gap-2 link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar name={a.name} size={30} color={avatarColor(a.name)} />
                        <span className="col" style={{ gap: 0, minWidth: 0, alignItems: 'flex-start' }}>
                          <span className="fw-7 clip" style={{ color: 'var(--ink)' }}>{a.name}</span>
                          <span className="t-xs muted">{money(a.arr)} ARR - {Math.round((a.seatsUsed / a.seats) * 100)}% seats</span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="fw-8 tnum" style={{ color: band.color, fontSize: '1.05rem' }}>{a.expansionScore}</span>
                        <Badge tone={band.tone} className="t-xs">{band.label}</Badge>
                      </div>
                    </td>
                    <td>
                      <div className="row gap-1" style={{ alignItems: 'center' }}>
                        <Sparkline data={a.usageTrend} w={72} h={26} color={a.usageDelta >= 0 ? 'var(--ok)' : 'var(--warn)'} />
                        <Trend value={a.usageDelta} />
                      </div>
                    </td>
                    <td className="t-sm muted" style={{ maxWidth: 200 }}>{a.expansionSignal}</td>
                    <td><Badge tone="accent">{a.suggestedOffer}</Badge></td>
                    <td style={{ textAlign: 'right' }}><span className="fw-7 tnum" style={{ color: a.expansionScore >= 64 ? 'var(--ok)' : 'var(--n-600)' }}>+{money(a.expansionValue)}</span></td>
                    <td style={{ textAlign: 'right' }}><Button variant="quiet" size="sm" onClick={() => onOpenAccount(a.id)}>View <Icon name="chevronRight" size={14} /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 4 - BUYER INTENT
   ============================================================ */
function IntentBoard({ onOpenAccount, toast }) {
  const rows = useMemo(() => getIntent(), []);
  const [scope, setScope] = useState('all');    // all | known | anon
  const shown = scope === 'all' ? rows : scope === 'known' ? rows.filter(r => r.known) : rows.filter(r => !r.known);

  // topic roll-up for the summary bars
  const byTopic = useMemo(() => {
    const m = {};
    for (const r of rows) { m[r.topic] = m[r.topic] || { topic: r.topic, sessions: 0, count: 0 }; m[r.topic].sessions += r.sessions; m[r.topic].count++; }
    return Object.values(m).sort((a, b) => b.sessions - a.sessions).slice(0, 6);
  }, [rows]);
  const maxSessions = Math.max(1, ...byTopic.map(t => t.sessions));

  const known = rows.filter(r => r.known).length;

  return (
    <div className="col gap-3">
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 65%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Buyer intent</div>
            <h3 style={{ margin: 0 }}>See who is researching, before they raise a hand</h3>
            <div className="muted t-sm" style={{ maxWidth: 540 }}>Known accounts and anonymous fit-profile companies, spiking on the topics that predict a buying cycle. Intent decays fast - the first vendor to respond sets the frame.</div>
          </div>
          <Button variant="accent" onClick={() => askRook('Which buyer-intent spikes should I act on today, and draft an outreach for the strongest known account.')} style={{ flex: 'none' }}><Icon name="sparkles" size={16} /> Draft outreach</Button>
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr' }}>
        <Card>
          <SectionHeader title="Top topics" sub="Where research is concentrating" />
          <div className="col gap-2">
            {byTopic.map(t => (
              <div key={t.topic} className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="t-sm" style={{ width: 150, flex: 'none' }}>{t.topic}</span>
                <div style={{ flex: 1 }}><ProgressBar value={(t.sessions / maxSessions) * 100} color="var(--accent)" height={9} /></div>
                <span className="t-xs muted tnum" style={{ width: 78, textAlign: 'right', flex: 'none' }}>{t.sessions} sess</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Signal mix" sub="Resolved vs anonymous" />
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="panel card-pad col gap-1">
              <div className="stat-label">Known accounts</div>
              <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{known}</div>
              <div className="t-sm muted">Matched to your book</div>
            </div>
            <div className="panel card-pad col gap-1">
              <div className="stat-label">Anonymous</div>
              <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{rows.length - known}</div>
              <div className="t-sm muted">Fit-profile, enrichment ready</div>
            </div>
          </div>
          <div className="t-xs muted row gap-1" style={{ marginTop: '.9rem' }}><Icon name="globe" size={13} /> {hasEnrichEnv() ? 'Enrichment connected - anonymous spikes resolve automatically.' : 'Connect enrichment to de-anonymize fit-profile spikes.'}</div>
        </Card>
      </div>

      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ paddingBottom: '.9rem' }}>
          <SectionHeader title="Intent stream" sub={`${shown.length} active spike${shown.length === 1 ? '' : 's'}`} />
          <Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: 'All' }, { value: 'known', label: 'Known' }, { value: 'anon', label: 'Anonymous' }]} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Account</th><th>Topic</th><th>Intent</th><th>Sessions</th><th>Trend</th><th>First seen</th><th></th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="row gap-2" style={{ minWidth: 0 }}>
                      {r.known
                        ? <Avatar name={r.accountName} size={28} color={avatarColor(r.accountName)} />
                        : <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--n-100)', color: 'var(--n-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="eyeOff" size={14} /></span>}
                      <div className="col" style={{ gap: 0, minWidth: 0 }}>
                        <span className="fw-6 clip">{r.accountName}</span>
                        <span className="t-xs muted">{r.industry} - {r.region}</span>
                      </div>
                    </div>
                  </td>
                  <td><Badge tone="accent">{r.topic}</Badge></td>
                  <td>
                    <div className="row gap-1" style={{ alignItems: 'center' }}>
                      <span className="fw-8 tnum" style={{ color: r.score >= 70 ? 'var(--accent-600)' : 'var(--ink-2)' }}>{r.score}</span>
                      <div style={{ width: 46 }}><ProgressBar value={r.score} color="var(--accent)" height={5} /></div>
                    </div>
                  </td>
                  <td className="tnum fw-6">{r.sessions}</td>
                  <td><span className="fw-7 tnum" style={{ color: 'var(--ok)' }}>+{r.deltaPct}%</span></td>
                  <td className="muted t-sm">{r.firstSeenDays}d ago</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.known
                      ? <Button variant="quiet" size="sm" onClick={() => onOpenAccount(r.accountId)}>Open <Icon name="chevronRight" size={14} /></Button>
                      : <Button variant="quiet" size="sm" onClick={() => askRook(`An anonymous ${r.industry} company in ${r.region} is spiking on "${r.topic}". Suggest how to identify and reach them.`)}><Icon name="sparkles" size={14} /> Identify</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   ACCOUNT DETAIL DRAWER (opens from any surface)
   ============================================================ */
function AccountModal({ accountId, onClose, onOpenAccount, toast }) {
  const [bump, setBump] = useState(0);
  const a = getAccount(accountId);
  const sigs = useMemo(() => signalsForAccount(accountId), [accountId, bump]);
  if (!a) return null;
  const churn = bandFor(a.churnScore);
  const exp = expansionBand(a.expansionScore);

  return (
    <Modal open onClose={onClose} width={720} title={a.name} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="accent" onClick={() => askRook(`Give me a full account plan for ${a.name}: churn risk ${a.churnScore}, expansion propensity ${a.expansionScore}. What is my next best action?`)}><Icon name="sparkles" size={15} /> Ask Rook for a plan</Button>
      </>
    }>
      <div className="col gap-3">
        {/* header stats */}
        <div className="row gap-2 wrap between">
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <Avatar name={a.name} size={44} color={avatarColor(a.name)} />
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <div className="row gap-1" style={{ alignItems: 'center' }}><HealthDot health={a.health} /><span className="fw-7">{a.industry}</span><span className="t-xs muted">{a.region}</span></div>
              <span className="t-sm muted">{money(a.arr)} ARR - {a.seatsUsed}/{a.seats} seats - owner {a.owner}</span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="panel card-pad col gap-2">
            <div className="row between"><span className="stat-label">Churn risk</span><Badge tone={churn.tone} className="t-xs">{churn.label}</Badge></div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="stat-value" style={{ fontSize: '2rem', color: churn.color }}>{a.churnScore}</span>
              <Sparkline data={a.healthTrend} w={90} h={32} color={a.healthDelta >= 0 ? 'var(--ok)' : 'var(--risk)'} />
            </div>
            <DriverBars drivers={a.drivers} />
          </div>
          <div className="panel card-pad col gap-2">
            <div className="row between"><span className="stat-label">Expansion propensity</span><Badge tone={exp.tone} className="t-xs">{exp.label}</Badge></div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="stat-value" style={{ fontSize: '2rem', color: exp.color }}>{a.expansionScore}</span>
              <Sparkline data={a.usageTrend} w={90} h={32} color={a.usageDelta >= 0 ? 'var(--ok)' : 'var(--warn)'} />
            </div>
            <div className="col gap-1">
              <span className="t-sm"><span className="muted">Signal: </span>{a.expansionSignal}</span>
              <span className="t-sm"><span className="muted">Offer: </span><span className="fw-6">{a.suggestedOffer}</span></span>
              <span className="t-sm"><span className="muted">Upside: </span><span className="fw-7" style={{ color: 'var(--ok)' }}>+{money(a.expansionValue)}</span></span>
            </div>
          </div>
        </div>

        {/* active signals on this account */}
        <div className="col gap-2">
          <SectionHeader title="Signals on this account" sub={`${sigs.length} tracked`} />
          {sigs.map(s => {
            const meta = signalMeta(s.type);
            const statusTone = { open: 'accent', acted: 'ok', dismissed: 'default', snoozed: 'warn' }[s.status] || 'default';
            return (
              <div key={s.id} className="panel card-pad row between wrap" style={{ gap: '.6rem' }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <TypeGlyph type={s.type} size={30} />
                  <div className="col gap-1" style={{ minWidth: 0 }}>
                    <span className="fw-7">{meta.label}</span>
                    <span className="t-xs muted clip">{s.play.title} - {s.confidence}% confidence</span>
                  </div>
                </div>
                <div className="row gap-1" style={{ flex: 'none' }}>
                  <Badge tone={statusTone} className="t-xs">{s.status}</Badge>
                  {s.status === 'open'
                    ? <Button variant="quiet" size="sm" onClick={() => { actOnSignal(s.id); toast('Play started'); setBump(b => b + 1); }}>Act</Button>
                    : <Button variant="quiet" size="sm" onClick={() => { reopenSignal(s.id); setBump(b => b + 1); }}>Reopen</Button>}
                </div>
              </div>
            );
          })}
          {!sigs.length && <span className="t-sm muted">No signals on this account. It is scored and watched in the background.</span>}
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Signals() {
  useSignals();
  const toast = useToast();
  const [tab, setTab] = useState('feed');
  const [openId, setOpenId] = useState(null);
  const stats = signalStats();

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Analytics"
        title={<>Revenue <GradientText>Signals</GradientText></>}
        sub="Predictive churn, expansion and buyer intent in one prioritized action feed. Not three tools stitched together - one AI-native revenue intelligence layer over your whole book."
        action={
          <div className="row gap-1">
            <Button variant="ghost" as={Link} to="/forecasting"><Icon name="trendUp" size={16} /> Forecast</Button>
            <Button variant="accent" onClick={() => askRook('Summarize my revenue signals: where am I about to lose money, where can I grow it, and who is showing intent?')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
          </div>
        }
      />

      {/* portfolio KPI row - always visible above the tabs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Open signals" value={stats.openCount} icon={<Icon name="zap" size={18} />} accent="var(--accent)" sub={`${stats.churnCount} churn - ${stats.expansionCount} expansion`} onClick={() => setTab('feed')} />
        <StatCard label="ARR at risk" value={stats.arrAtRisk} format={moneyK} icon={<Icon name="shield" size={18} />} accent="var(--risk)" sub={`${stats.atRiskAccounts} accounts elevated`} onClick={() => setTab('churn')} />
        <StatCard label="Expansion pipeline" value={stats.expansionPipeline} format={moneyK} icon={<Icon name="trendUp" size={18} />} accent="var(--ok)" sub="Untapped upside" onClick={() => setTab('expansion')} />
        <StatCard label="Intent spikes" value={stats.intentSpikes} icon={<Icon name="globe" size={18} />} accent="var(--accent)" sub="Known + anonymous" onClick={() => setTab('intent')} />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'feed', label: 'Signals feed', count: stats.openCount },
        { key: 'churn', label: 'Churn radar', count: stats.atRiskAccounts },
        { key: 'expansion', label: 'Expansion radar', count: stats.expansionCount },
        { key: 'intent', label: 'Buyer intent', count: getIntent().length },
      ]} />

      {tab === 'feed' && <Feed stats={stats} onOpenAccount={setOpenId} toast={toast} />}
      {tab === 'churn' && <ChurnRadar onOpenAccount={setOpenId} toast={toast} />}
      {tab === 'expansion' && <ExpansionRadar onOpenAccount={setOpenId} toast={toast} />}
      {tab === 'intent' && <IntentBoard onOpenAccount={setOpenId} toast={toast} />}

      {openId && <AccountModal accountId={openId} onClose={() => setOpenId(null)} onOpenAccount={setOpenId} toast={toast} />}
    </div>
  );
}
