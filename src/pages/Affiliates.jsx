// Affiliates + Partners. Rally's referral engine - a GoHighLevel revenue
// staple, bundled in. An affiliate army is distribution: every Rally customer
// can turn happy users into a paid sales force. Five surfaces over one
// local-first store (src/lib/affiliates-data.js): a program dashboard, the
// partner table with an add-affiliate flow, commission plans, a payout queue
// (approve/pay are status changes only - money never moves here), and a
// partner-portal preview. 100% functional with seeded data + zero backend.
import React, { useMemo, useState } from 'react';
import {
  useAffiliates, getAffiliates, getAffiliate, getPlans, getPayouts, getProgram,
  affiliateStats, payoutStats, portalView, attributedDealSamples,
  planById, commissionRateLabel, referralLink, hasPayoutEnv,
  createAffiliate, setAffiliateStatus, setAffiliatePlan, queuePayout,
  advancePayout, approveAllPending,
  RECURRENCE_META, STATUS_META, PAYOUT_META,
} from '../lib/affiliates-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input, Select,
  Modal, EmptyState, Tabs, StatCard, Sparkline, MiniBars, ProgressBar, Segmented,
  GradientText, useToast, relTime, money, moneyK, avatarColor,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
function copyText(text, toast) {
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
    toast?.('Referral link copied', 'ok');
  } catch { toast?.('Copy the link manually', 'warn'); }
}
const pct = (n) => `${Math.round((n || 0) * 100)}%`;

/* ---------- plan chip ---------- */
function PlanChip({ planId, withRecurrence = false }) {
  const p = planById(planId);
  if (!p) return null;
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color, flex: 'none' }} />
      <span className="fw-6 t-sm">{p.name}</span>
      <span className="muted t-sm">{commissionRateLabel(p)}</span>
      {withRecurrence && <Badge tone={RECURRENCE_META[p.recurrence].tone} className="t-xs">{RECURRENCE_META[p.recurrence].label}</Badge>}
    </span>
  );
}

/* ============================================================
   TAB 1 - PROGRAM DASHBOARD
   ============================================================ */
function Dashboard({ stats, pstats, onGoPartners, onGoPayouts }) {
  const deals = useMemo(() => attributedDealSamples(5), []);
  const maxLead = Math.max(1, ...stats.leaderboard.map(a => a.revenue));

  return (
    <div className="col gap-3">
      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Attributed revenue" value={stats.revenue} format={moneyK} icon={<Icon name="dollar" />}
          spark={stats.trend} sub={`${stats.sales} customers referred`} accent="var(--accent)" onClick={onGoPartners} />
        <StatCard label="Active partners" value={stats.activeCount} icon={<Icon name="share2" />}
          sub={`${stats.pendingCount} pending approval`} accent="var(--accent-teal)" onClick={onGoPartners} />
        <StatCard label="Commissions owed" value={stats.owed} format={moneyK} icon={<Icon name="clock" />}
          sub={`${pstats.pendingCount} payouts in queue`} accent="var(--warn)" onClick={onGoPayouts} />
        <StatCard label="Program ROI" value={Number(stats.programRoi.toFixed(1))} format={(n) => `${n}x`} icon={<Icon name="trendUp" />}
          sub={`${moneyK(stats.paid)} paid to date`} accent="var(--ok)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* funnel */}
        <Card>
          <SectionHeader title="Referral funnel" sub="Clicks become signups become paying customers."
            action={<Button variant="ghost" size="sm" onClick={() => askRook('Which of my affiliate partners has the best click-to-customer conversion, and how can I get more partners to that level?')}><Icon name="sparkles" size={15} /> Ask Rook</Button>} />
          <div className="col gap-2">
            <FunnelBar label="Clicks" value={stats.clicks} max={stats.clicks} color="var(--accent)" note="Tracked referral visits" />
            <FunnelBar label="Signups" value={stats.signups} max={stats.clicks} color="var(--accent-purple)" note={`${pct(stats.clickToSignup)} of clicks`} />
            <FunnelBar label="Customers" value={stats.sales} max={stats.clicks} color="var(--accent-teal)" note={`${pct(stats.signupToSale)} of signups convert`} />
          </div>
          <div className="row between wrap gap-2" style={{ marginTop: '1.2rem', paddingTop: '1.1rem', borderTop: '1px solid var(--line)' }}>
            <div className="col gap-1">
              <div className="stat-label">Lifetime commission</div>
              <div className="fw-8" style={{ fontSize: '1.5rem' }}>{money(stats.lifetime)}</div>
            </div>
            <div className="col gap-1">
              <div className="stat-label">Avg revenue / customer</div>
              <div className="fw-8" style={{ fontSize: '1.5rem' }}>{money(stats.sales ? Math.round(stats.revenue / stats.sales) : 0)}</div>
            </div>
            <div className="col gap-1">
              <div className="stat-label">Signup conversion</div>
              <div className="fw-8" style={{ fontSize: '1.5rem' }}>{pct(stats.clickToSignup)}</div>
            </div>
          </div>
        </Card>

        {/* leaderboard */}
        <Card>
          <SectionHeader title="Top partners" sub="By attributed revenue" />
          <div className="col gap-2">
            {stats.leaderboard.map((a, i) => (
              <div key={a.id} className="row gap-2" style={{ alignItems: 'center' }}>
                <div className="fw-8 muted" style={{ width: 18, textAlign: 'center' }}>{i + 1}</div>
                <Avatar name={a.name} size={34} />
                <div className="col" style={{ minWidth: 0, flex: 1, gap: 2 }}>
                  <div className="fw-7 clip">{a.name}</div>
                  <div className="muted t-xs clip">{a.company}</div>
                  <div style={{ marginTop: 3 }}><ProgressBar value={(a.revenue / maxLead) * 100} height={5} color={planById(a.planId)?.color || 'var(--accent)'} /></div>
                </div>
                <div className="fw-8 tnum" style={{ fontSize: '.98rem' }}>{moneyK(a.revenue)}</div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" style={{ marginTop: '1rem', width: '100%' }} onClick={onGoPartners}>See all partners <Icon name="arrowRight" size={15} /></Button>
        </Card>
      </div>

      {/* attribution proof */}
      <Card>
        <SectionHeader title="Attributed to real revenue" sub="Partner commissions ride your live closed-won deals, not a separate ledger."
          action={<Badge tone="accent"><Icon name="check" size={13} /> Anchored to CRM</Badge>} />
        {deals.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.9rem' }}>
            {deals.map(d => (
              <div key={d.id} className="panel" style={{ padding: '.9rem 1rem' }}>
                <div className="fw-7 clip">{d.company || d.name}</div>
                <div className="muted t-xs clip" style={{ marginTop: 2 }}>{d.name}</div>
                <div className="row between" style={{ marginTop: '.6rem', alignItems: 'baseline' }}>
                  <span className="fw-8 tnum">{moneyK(d.value)}</span>
                  <Badge tone="ok" className="t-xs">Won</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="🎯" title="No closed-won deals yet" body="Once deals close, attributed partner revenue anchors to them automatically." />
        )}
      </Card>
    </div>
  );
}

function FunnelBar({ label, value, max, color, note }) {
  const w = max ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="col gap-1">
      <div className="row between">
        <span className="fw-7">{label}</span>
        <span className="row gap-2" style={{ alignItems: 'baseline' }}>
          <span className="fw-8 tnum" style={{ fontSize: '1.05rem' }}>{value.toLocaleString()}</span>
          <span className="muted t-xs">{note}</span>
        </span>
      </div>
      <div style={{ background: 'var(--n-100)', borderRadius: 8, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 8, transition: 'width .7s var(--ease)' }} />
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 - PARTNERS TABLE
   ============================================================ */
function Partners({ affiliates, onAdd, onOpen, toast }) {
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [sort, setSort] = useState('revenue');

  const rows = useMemo(() => {
    let list = affiliates.filter(a => {
      if (statusF !== 'all' && a.status !== statusF) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return a.name.toLowerCase().includes(s) || a.company.toLowerCase().includes(s) || a.code.toLowerCase().includes(s);
    });
    list = [...list].sort((a, b) => sort === 'revenue' ? b.revenue - a.revenue : sort === 'clicks' ? b.clicks - a.clicks : sort === 'owed' ? b.owed - a.owed : b.sales - a.sales);
    return list;
  }, [affiliates, q, statusF, sort]);

  return (
    <div className="col gap-3">
      <Card pad={false}>
        <div className="row between wrap gap-2" style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-2 wrap" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }}><Icon name="search" size={16} /></span>
              <Input placeholder="Search partners, companies, codes" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
            <Segmented value={statusF} onChange={setStatusF} options={[
              { value: 'all', label: 'All' }, { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' }, { value: 'paused', label: 'Paused' },
            ]} />
          </div>
          <div className="row gap-2">
            <Select value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto' }}>
              <option value="revenue">Sort: Revenue</option>
              <option value="clicks">Sort: Clicks</option>
              <option value="sales">Sort: Customers</option>
              <option value="owed">Sort: Owed</option>
            </Select>
            <Button variant="primary" onClick={onAdd}><Icon name="plus" size={16} /> Add partner</Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Partner</th><th>Plan</th><th>Clicks</th><th>Conv.</th>
                <th>Customers</th><th>Revenue</th><th>Owed</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const conv = a.clicks ? a.signups / a.clicks : 0;
                return (
                  <tr key={a.id} className="row-host" style={{ cursor: 'pointer' }} onClick={() => onOpen(a.id)}>
                    <td>
                      <div className="row gap-2" style={{ minWidth: 0 }}>
                        <Avatar name={a.name} size={34} />
                        <div className="col" style={{ minWidth: 0, gap: 1 }}>
                          <span className="fw-7 clip row gap-1" style={{ alignItems: 'center' }}>{a.name}{a.flagship && <Icon name="star" size={12} title="Top partner" style={{ color: 'var(--warn)', flex: 'none' }} />}</span>
                          <span className="muted t-xs clip mono">{referralLink(a)}</span>
                        </div>
                      </div>
                    </td>
                    <td><PlanChip planId={a.planId} /></td>
                    <td className="tnum">{a.clicks.toLocaleString()}</td>
                    <td className="tnum">{pct(conv)}</td>
                    <td className="tnum">{a.sales}</td>
                    <td className="tnum fw-7">{moneyK(a.revenue)}</td>
                    <td className="tnum">{a.owed > 0 ? <span className="fw-7" style={{ color: 'var(--warn)' }}>{money(a.owed)}</span> : <span className="muted">-</span>}</td>
                    <td><Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row gap-1 reveal" style={{ justifyContent: 'flex-end' }}>
                        <Button variant="quiet" size="sm" title="Copy referral link" onClick={() => copyText(referralLink(a), toast)}><Icon name="copy" size={15} /></Button>
                        <Button variant="quiet" size="sm" onClick={() => onOpen(a.id)}><Icon name="chevronRight" size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <EmptyState icon="🤝" title="No partners match" body="Adjust the filters or add your first partner to start building distribution." action={<Button variant="primary" onClick={onAdd}><Icon name="plus" size={16} /> Add partner</Button>} />}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 3 - COMMISSION PLANS
   ============================================================ */
function Plans({ affiliates }) {
  const plans = getPlans();
  const countOn = (id) => affiliates.filter(a => a.planId === id).length;
  const revOn = (id) => affiliates.filter(a => a.planId === id).reduce((s, a) => s + a.revenue, 0);

  return (
    <div className="col gap-3">
      <Card>
        <SectionHeader title="Commission plans" sub="Flat bounty or a share of revenue. One-time or recurring for the life of the account." />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {plans.map(p => (
            <div key={p.id} className="panel" style={{ padding: '1.2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: p.color, opacity: .1 }} />
              <div className="row between" style={{ position: 'relative' }}>
                <div className="row gap-2">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: p.color, flex: 'none' }} />
                  <span className="fw-8" style={{ fontSize: '1.1rem' }}>{p.name}</span>
                </div>
                <Badge tone={RECURRENCE_META[p.recurrence].tone}>{RECURRENCE_META[p.recurrence].label}</Badge>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 6, marginTop: '.8rem' }}>
                <span className="fw-8" style={{ fontSize: '2.2rem', letterSpacing: '-.03em', color: p.color }}>{commissionRateLabel(p)}</span>
                <span className="muted t-sm">{p.type === 'flat' ? 'per customer' : 'of revenue'}</span>
              </div>
              <div className="muted t-sm" style={{ marginTop: '.5rem', minHeight: 46 }}>{p.desc}</div>
              <div className="row between" style={{ marginTop: '.9rem', paddingTop: '.8rem', borderTop: '1px solid var(--line)' }}>
                <span className="row gap-1 muted t-xs"><Icon name="clock" size={13} /> {p.cookieDays}d cookie</span>
                <span className="t-xs"><span className="fw-7">{countOn(p.id)}</span> partners</span>
              </div>
              <div className="t-xs muted" style={{ marginTop: 6 }}>{moneyK(revOn(p.id))} attributed</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="How attribution works" sub="Deterministic, explainable, and tied to your real pipeline." />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'share2', t: 'Partner shares their link', b: 'Every partner gets a unique tracked link and a live portal.' },
            { icon: 'clock', t: 'Click sets the cookie', b: 'A referred visitor is attributed for the plan cookie window.' },
            { icon: 'target', t: 'Deal closes in Rally', b: 'When the referred account converts, the commission is booked.' },
            { icon: 'dollar', t: 'Payout enters the queue', b: 'Commission owed accrues until you approve and settle it.' },
          ].map((s, i) => (
            <div key={i} className="col gap-1">
              <div className="row gap-2" style={{ color: 'var(--accent-600)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={16} /></span>
                <span className="fw-7">{s.t}</span>
              </div>
              <div className="muted t-sm">{s.b}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 4 - PAYOUT QUEUE
   ============================================================ */
function Payouts({ payouts, pstats, toast }) {
  const [filter, setFilter] = useState('all');
  const env = hasPayoutEnv();

  const rows = useMemo(() => payouts.filter(p => filter === 'all' || p.status === filter), [payouts, filter]);

  const advance = (p) => {
    const r = advancePayout(p.id);
    if (r.error) { toast(r.message, 'risk'); return; }
    toast(r.settled ? `Marked ${money(r.payout.amount)} paid` : `Payout ${PAYOUT_META[r.payout.status].label.toLowerCase()}`, 'ok');
  };
  const approveAll = () => {
    const r = approveAllPending();
    toast(r.count ? `Approved ${r.count} payout${r.count > 1 ? 's' : ''}` : 'No pending payouts', r.count ? 'ok' : 'warn');
  };

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Pending approval" value={pstats.pendingAmt} format={moneyK} icon={<Icon name="clock" />} accent="var(--warn)" sub={`${pstats.pendingCount} in queue`} />
        <StatCard label="Approved, awaiting settlement" value={pstats.approvedAmt} format={moneyK} icon={<Icon name="check" />} accent="var(--info)" sub={`${pstats.approvedCount} ready`} />
        <StatCard label="Paid to date" value={pstats.paidAmt} format={moneyK} icon={<Icon name="dollar" />} accent="var(--ok)" sub={`${pstats.paidCount} settled`} />
      </div>

      {!env && (
        <Card className="row between wrap gap-2" style={{ background: 'var(--warn-bg)', borderColor: 'transparent' }}>
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <Icon name="shield" size={18} style={{ color: 'var(--warn)' }} />
            <span className="t-sm"><span className="fw-7">Demo mode.</span> Approving and paying are status changes only - no money moves. Connect a payout provider to settle for real.</span>
          </div>
        </Card>
      )}

      <Card pad={false}>
        <div className="row between wrap gap-2" style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--line)' }}>
          <Segmented value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'All' }, { value: 'pending', label: `Pending (${pstats.pendingCount})` },
            { value: 'approved', label: `Approved (${pstats.approvedCount})` }, { value: 'paid', label: 'Paid' },
          ]} />
          <Button variant="primary" onClick={approveAll} disabled={!pstats.pendingCount}><Icon name="check" size={16} /> Approve all pending</Button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Partner</th><th>Period</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(p => {
                const a = getAffiliate(p.affiliateId);
                return (
                  <tr key={p.id} className="row-host">
                    <td>
                      <div className="row gap-2" style={{ minWidth: 0 }}>
                        <Avatar name={a?.name || '?'} size={30} />
                        <div className="col" style={{ minWidth: 0, gap: 1 }}>
                          <span className="fw-7 clip">{a?.name || 'Partner'}</span>
                          <span className="muted t-xs clip">{a?.company}</span>
                        </div>
                      </div>
                    </td>
                    <td className="t-sm">{p.period}</td>
                    <td><Badge>{p.method}</Badge></td>
                    <td className="tnum fw-7">{money(p.amount)}</td>
                    <td><Badge tone={PAYOUT_META[p.status].tone}>{PAYOUT_META[p.status].label}</Badge></td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => advance(p)}><Icon name="check" size={15} /> Approve</Button>}
                      {p.status === 'approved' && <Button variant="primary" size="sm" onClick={() => advance(p)}><Icon name="dollar" size={15} /> Mark paid</Button>}
                      {p.status === 'paid' && <span className="muted t-xs row gap-1" style={{ justifyContent: 'flex-end' }}><Icon name="check" size={14} /> {relTime(p.paidAt)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <EmptyState icon="💸" title="Queue is clear" body="No payouts in this view. Owed balances become payouts from a partner's profile." />}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 5 - PARTNER PORTAL PREVIEW
   ============================================================ */
function Portal({ affiliates, toast }) {
  const active = affiliates.filter(a => a.status !== 'pending');
  const [sel, setSel] = useState(active[0]?.id || affiliates[0]?.id);
  const view = portalView(sel);
  if (!view) return <EmptyState icon="🪪" title="No partner selected" />;
  const { affiliate: a, plan, link, rank, conv, nextPayout } = view;

  return (
    <div className="col gap-3">
      <Card className="row between wrap gap-2">
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Partner portal preview</div>
          <div className="muted t-sm">Exactly what this partner sees when they log in. Their numbers only, never yours.</div>
        </div>
        <Field label="Preview as">
          <Select value={sel} onChange={e => setSel(e.target.value)} style={{ minWidth: 220 }}>
            {affiliates.map(a => <option key={a.id} value={a.id}>{a.name} - {a.company}</option>)}
          </Select>
        </Field>
      </Card>

      {/* the portal surface */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="grad-rev" style={{ padding: '1.6rem 1.6rem 1.4rem', color: '#fff' }}>
          <div className="row between wrap gap-2">
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Avatar name={a.name} size={46} color="rgba(255,255,255,.22)" />
              <div className="col" style={{ gap: 2 }}>
                <div className="fw-8" style={{ fontSize: '1.25rem' }}>Welcome back, {a.name.split(' ')[0]}</div>
                <div style={{ opacity: .85 }} className="t-sm">{getProgram().name} {rank ? `- ranked #${rank}` : ''}</div>
              </div>
            </div>
            <PlanChip planId={a.planId} withRecurrence />
          </div>
        </div>

        <div style={{ padding: '1.4rem 1.6rem' }}>
          {/* referral link */}
          <div className="panel row between wrap gap-2" style={{ padding: '.9rem 1rem', marginBottom: '1.2rem' }}>
            <div className="col" style={{ minWidth: 0, gap: 2 }}>
              <span className="stat-label">Your referral link</span>
              <span className="mono fw-7 clip" style={{ fontSize: '1.02rem' }}>{link}</span>
            </div>
            <div className="row gap-1">
              <Button variant="ghost" size="sm" onClick={() => copyText(link, toast)}><Icon name="copy" size={15} /> Copy</Button>
              <Button variant="primary" size="sm" onClick={() => askRook(`Draft a short, friendly outreach message ${a.name} can send to promote their Rally referral link ${link}.`)}><Icon name="send" size={15} /> Share kit</Button>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <PortalStat label="Clicks" value={a.clicks.toLocaleString()} icon="share2" />
            <PortalStat label="Signups" value={a.signups.toLocaleString()} icon="users" sub={pct(conv)} />
            <PortalStat label="Customers" value={a.sales} icon="target" />
            <PortalStat label="Lifetime earned" value={money(a.owed + a.paid)} icon="dollar" accent="var(--ok)" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: '1rem', marginTop: '1.2rem' }}>
            <div className="panel" style={{ padding: '1.1rem 1.2rem' }}>
              <div className="row between" style={{ marginBottom: '.6rem' }}>
                <span className="fw-7">Weekly clicks</span>
                <Badge tone="accent">Last 12 weeks</Badge>
              </div>
              <MiniBars data={a.spark} w={420} h={64} color={plan?.color || 'var(--accent)'} />
            </div>
            <div className="panel col between" style={{ padding: '1.1rem 1.2rem' }}>
              <div>
                <div className="stat-label">Next payout</div>
                <div className="fw-8" style={{ fontSize: '1.8rem', color: nextPayout > 0 ? 'var(--ink)' : 'var(--n-400)' }}>{money(nextPayout)}</div>
                <div className="muted t-xs" style={{ marginTop: 2 }}>{nextPayout > 0 ? `Paid via ${a.method}` : 'No balance owed right now'}</div>
              </div>
              <div className="muted t-xs" style={{ marginTop: '.8rem' }}>Joined {relTime(a.joinedAt)} on the {plan?.name} plan.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalStat({ label, value, icon, sub, accent = 'var(--accent)' }) {
  return (
    <div className="panel" style={{ padding: '1rem 1.1rem' }}>
      <div className="row between">
        <span className="stat-label">{label}</span>
        <span style={{ color: accent }}><Icon name={icon} size={16} /></span>
      </div>
      <div className="fw-8" style={{ fontSize: '1.6rem', marginTop: 4 }}>{value}</div>
      {sub && <div className="muted t-xs">{sub} conversion</div>}
    </div>
  );
}

/* ============================================================
   ADD-PARTNER MODAL
   ============================================================ */
function AddPartnerModal({ open, onClose, toast }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', planId: 'pl_starter', status: 'active' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    const r = createAffiliate(form);
    if (r.error) { toast(r.message, 'risk'); return; }
    toast(`${r.affiliate.name} added to the program`, 'ok');
    setForm({ name: '', company: '', email: '', planId: 'pl_starter', status: 'active' });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add partner" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}><Icon name="plus" size={16} /> Add partner</Button></>}>
      <div className="col gap-2">
        <Field label="Partner name"><Input autoFocus value={form.name} onChange={e => set('name', e.target.value)} placeholder="Maya Chen" /></Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.9rem' }}>
          <Field label="Company"><Input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Loop Digital" /></Field>
          <Field label="Email"><Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="maya@loop.co" /></Field>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.9rem' }}>
          <Field label="Commission plan">
            <Select value={form.planId} onChange={e => set('planId', e.target.value)}>
              {getPlans().map(p => <option key={p.id} value={p.id}>{p.name} - {commissionRateLabel(p)}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="pending">Pending approval</option>
            </Select>
          </Field>
        </div>
        <div className="panel t-sm muted" style={{ padding: '.7rem .9rem' }}>
          A unique referral link is generated automatically. The partner gets a live portal the moment they are added.
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   PARTNER DETAIL MODAL
   ============================================================ */
function PartnerDetail({ id, onClose, toast }) {
  const a = id ? getAffiliate(id) : null;
  useAffiliates(); // subscribe so status/plan/owed edits re-render live
  const fresh = id ? getAffiliate(id) : null;
  const p = fresh || a;
  if (!p) return null;
  const plan = planById(p.planId);
  const conv = p.clicks ? p.signups / p.clicks : 0;

  const changeStatus = (s) => { const r = setAffiliateStatus(p.id, s); if (!r.error) toast(`Partner ${STATUS_META[s].label.toLowerCase()}`, 'ok'); };
  const changePlan = (pl) => { const r = setAffiliatePlan(p.id, pl); if (!r.error) toast('Plan updated', 'ok'); };
  const pay = () => { const r = queuePayout(p.id); if (r.error) { toast(r.message, 'warn'); return; } toast(`Queued ${money(r.payout.amount)} for payout`, 'ok'); };

  return (
    <Modal open={!!id} onClose={onClose} title={null} width={620}>
      <div className="col gap-3">
        <div className="row between wrap gap-2">
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <Avatar name={p.name} size={52} />
            <div className="col" style={{ minWidth: 0, gap: 2 }}>
              <div className="fw-8" style={{ fontSize: '1.3rem' }}>{p.name}</div>
              <div className="muted t-sm clip">{p.company} - {p.email}</div>
              <div className="mono t-xs clip" style={{ color: 'var(--accent-600)' }}>{referralLink(p)}</div>
            </div>
          </div>
          <Badge tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Badge>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '.8rem' }}>
          <MiniStat label="Clicks" value={p.clicks.toLocaleString()} />
          <MiniStat label="Conversion" value={pct(conv)} />
          <MiniStat label="Customers" value={p.sales} />
          <MiniStat label="Revenue" value={moneyK(p.revenue)} />
        </div>

        <div className="panel" style={{ padding: '1rem 1.1rem' }}>
          <div className="row between wrap gap-2">
            <div className="col gap-1">
              <span className="stat-label">Commission owed</span>
              <span className="fw-8" style={{ fontSize: '1.7rem', color: p.owed > 0 ? 'var(--warn)' : 'var(--n-400)' }}>{money(p.owed)}</span>
              <span className="muted t-xs">{money(p.paid)} paid lifetime</span>
            </div>
            <Button variant="primary" onClick={pay} disabled={p.owed <= 0}><Icon name="dollar" size={16} /> Queue payout</Button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.9rem' }}>
          <Field label="Commission plan">
            <Select value={p.planId} onChange={e => changePlan(e.target.value)}>
              {getPlans().map(pl => <option key={pl.id} value={pl.id}>{pl.name} - {commissionRateLabel(pl)}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={p.status} onChange={e => changeStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
            </Select>
          </Field>
        </div>

        <div className="row gap-2 between wrap">
          <span className="muted t-xs">Plan: {plan?.name} - {commissionRateLabel(plan)} {RECURRENCE_META[plan?.recurrence]?.label?.toLowerCase()} - {plan?.cookieDays}d cookie</span>
          <div className="row gap-1">
            <Button variant="ghost" size="sm" onClick={() => copyText(referralLink(p), toast)}><Icon name="copy" size={15} /> Copy link</Button>
            <Button variant="ghost" size="sm" onClick={() => askRook(`Give me 3 concrete ways to help my affiliate partner ${p.name} (${p.company}) send more converting referrals to Rally.`)}><Icon name="sparkles" size={15} /> Coach with Rook</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
function MiniStat({ label, value }) {
  return (
    <div className="panel" style={{ padding: '.8rem .9rem' }}>
      <div className="stat-label">{label}</div>
      <div className="fw-8" style={{ fontSize: '1.3rem', marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ============================================================
   PAGE SHELL
   ============================================================ */
export default function Affiliates() {
  const snap = useAffiliates();
  const toast = useToast();
  const [tab, setTab] = useState('dashboard');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  const affiliates = snap.affiliates;
  const stats = useMemo(() => affiliateStats(), [snap]);
  const pstats = useMemo(() => payoutStats(), [snap]);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'partners', label: 'Partners', count: affiliates.length },
    { key: 'plans', label: 'Commission plans', count: getPlans().length },
    { key: 'payouts', label: 'Payouts', count: pstats.pendingCount || null },
    { key: 'portal', label: 'Partner portal' },
  ];

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Revenue"
        title={<>Affiliates <GradientText>&</GradientText> Partners</>}
        sub="An affiliate army is distribution. Turn happy customers into a paid sales force - the referral engine GoHighLevel charges extra for, built into Rally."
        action={
          <div className="row gap-2">
            <Button variant="ghost" onClick={() => askRook('Summarize how my Rally affiliate program is performing this month and tell me the single highest-leverage move to grow partner-sourced revenue.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Add partner</Button>
          </div>
        }
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'dashboard' && <Dashboard stats={stats} pstats={pstats} onGoPartners={() => setTab('partners')} onGoPayouts={() => setTab('payouts')} />}
      {tab === 'partners' && <Partners affiliates={affiliates} onAdd={() => setAdding(true)} onOpen={setOpenId} toast={toast} />}
      {tab === 'plans' && <Plans affiliates={affiliates} />}
      {tab === 'payouts' && <Payouts payouts={snap.payouts} pstats={pstats} toast={toast} />}
      {tab === 'portal' && <Portal affiliates={affiliates} toast={toast} />}

      <AddPartnerModal open={adding} onClose={() => setAdding(false)} toast={toast} />
      <PartnerDetail id={openId} onClose={() => setOpenId(null)} toast={toast} />
    </div>
  );
}
