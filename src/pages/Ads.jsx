// Ads - Ardovo's cross-channel ad manager + reporting. HubSpot Marketing Hub
// parity, GoHighLevel's weakness, bundled in. Owners run paid media in four
// dashboards (Google, Meta, LinkedIn, TikTok) and none of them know which click
// became a closed-won deal. Ardovo unifies spend, results and ROAS in one board
// AND ties every dollar back to the CRM pipeline, closing the loop from click to
// closed-won. Four surfaces over one local-first store (src/lib/ads-data.js):
// an overview with a spend-vs-revenue chart, a campaigns table with real
// pause/enable toggles, channel breakdown + best creatives, and CRM attribution.
// 100% functional with seeded data + zero backend; real platform sync is
// env-gated and stays dormant offline.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAds, getCampaigns, getCreatives, adsOverview, rollup, monthlySeries,
  channelBreakdown, bestCreatives, attributedDeals, createCampaign,
  toggleCampaign, deleteCampaign, hasAdsSyncEnv,
  CHANNELS, channelById, OBJECTIVES, objectiveById, STATUS_META,
  ctr, cpc, cpl, roas,
} from '../lib/ads-data.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select,
  Textarea, Modal, EmptyState, Tabs, Segmented, ProgressBar, Sparkline,
  GradientText, useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* ---------- format helpers ---------- */
const compact = (n) => {
  if (n == null) return '-';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
  return String(Math.round(n));
};
const pct1 = (n) => (n * 100).toFixed(2) + '%';
const dollars2 = (n) => '$' + (n || 0).toFixed(2);
const roasFmt = (n) => (n || 0).toFixed(2) + 'x';
const roasColor = (n) => (n >= 3 ? 'var(--ok)' : n >= 1 ? 'var(--warn)' : 'var(--risk)');

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ---------- channel glyph ---------- */
function ChannelChip({ id, withLabel = false, size = 22 }) {
  const ch = channelById(id);
  return (
    <span className="row" style={{ gap: 7, minWidth: 0 }}>
      <span style={{ width: size, height: size, borderRadius: 6, background: ch.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.5, flex: 'none', letterSpacing: '-.02em' }}>{ch.short}</span>
      {withLabel && <span className="fw-6 clip">{ch.label}</span>}
    </span>
  );
}

/* ============================================================
   SPEND vs REVENUE CHART  (grouped bars, inline SVG)
   ============================================================ */
function SpendRevenueChart({ series }) {
  const W = 760, H = 250, padL = 46, padR = 10, padT = 14, padB = 30;
  const max = Math.max(1, ...series.flatMap(s => [s.spend, s.revenue]));
  const plotH = H - padT - padB;
  const plotW = W - padL - padR;
  const groupW = plotW / series.length;
  const barW = Math.min(30, groupW * 0.28);
  const yOf = (v) => padT + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', minWidth: 460 }} role="img" aria-label="Spend versus revenue by month">
        {ticks.map((t, i) => {
          const y = padT + plotH - t * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--n-400)" className="mono">{moneyK(Math.round(max * t))}</text>
            </g>
          );
        })}
        {series.map((s, i) => {
          const gx = padL + i * groupW + groupW / 2;
          const sX = gx - barW - 2;
          const rX = gx + 2;
          return (
            <g key={i}>
              <rect x={sX} y={yOf(s.spend)} width={barW} height={Math.max(1, padT + plotH - yOf(s.spend))} rx="4" fill="var(--accent)" opacity="0.92">
                <title>{s.label} spend: {money(s.spend)}</title>
              </rect>
              <rect x={rX} y={yOf(s.revenue)} width={barW} height={Math.max(1, padT + plotH - yOf(s.revenue))} rx="4" fill="var(--accent-teal)" opacity="0.92">
                <title>{s.label} revenue: {money(s.revenue)}</title>
              </rect>
              <text x={gx} y={H - 10} textAnchor="middle" fontSize="12" fill="var(--n-600)" fontWeight="600">{s.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   TAB 1 - OVERVIEW
   ============================================================ */
function KpiTile({ label, value, sub, subColor, spark }) {
  return (
    <div className="panel card-pad col gap-1" style={{ minWidth: 0 }}>
      <div className="stat-label">{label}</div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 2.4vw, 1.95rem)', letterSpacing: '-.02em', lineHeight: 1 }} className="tnum">{value}</div>
        {spark && <Sparkline data={spark} w={64} h={26} color="var(--accent)" />}
      </div>
      {sub != null && <div className="t-xs fw-6" style={{ color: subColor || 'var(--n-600)' }}>{sub}</div>}
    </div>
  );
}

function Overview({ ov, onGoCampaigns, onGoAttribution }) {
  const spendSpark = ov.series.map(s => s.spend);
  const revSpark = ov.series.map(s => s.revenue);
  const topCampaigns = useMemo(() => [...getCampaigns()].sort((a, b) => roas(b) - roas(a)).slice(0, 5), [ov.spend]);

  return (
    <div className="col gap-3">
      {/* headline: spend + ROAS hero */}
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr' }}>
        <Card className="col gap-1" style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
          <div className="eyebrow">Total ad spend</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2.2rem,4vw,3rem)' }}>{money(ov.spend)}</div>
          <div className="row gap-2 wrap">
            <span className="t-sm fw-6" style={{ color: ov.trend.spend >= 0 ? 'var(--ink-2)' : 'var(--ok)' }}>{ov.trend.spend >= 0 ? '+' : ''}{ov.trend.spend}% vs last month</span>
            <span className="t-sm muted">across {ov.campaigns} campaigns, {ov.active} active</span>
          </div>
        </Card>
        <Card className="col gap-1">
          <div className="stat-label">Blended ROAS</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)', color: roasColor(ov.roas) }}>{roasFmt(ov.roas)}</div>
          <div className="t-sm muted">{money(ov.revenue)} attributed revenue</div>
        </Card>
        <Card className="col gap-1">
          <div className="stat-label">Leads</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{ov.leads.toLocaleString()}</div>
          <div className="t-sm muted">{dollars2(ov.cpl)} cost per lead</div>
        </Card>
      </div>

      {/* KPI ribbon */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Impressions" value={compact(ov.impressions)} sub="reach across networks" />
        <KpiTile label="Clicks" value={compact(ov.clicks)} sub={`${pct1(ov.ctr)} CTR`} />
        <KpiTile label="Avg CPC" value={dollars2(ov.cpc)} sub="cost per click" />
        <KpiTile label="Revenue" value={moneyK(ov.revenue)} sub={`${ov.trend.revenue >= 0 ? '+' : ''}${ov.trend.revenue}% vs last month`} subColor={ov.trend.revenue >= 0 ? 'var(--ok)' : 'var(--risk)'} spark={revSpark} />
      </div>

      {/* spend vs revenue chart */}
      <Card>
        <SectionHeader
          title="Spend vs revenue"
          sub="Every network, six months, one view. The loop dashboards cannot close on their own."
          action={
            <div className="row gap-2" style={{ flex: 'none' }}>
              <span className="row gap-1 t-sm fw-6"><span className="dot" style={{ background: 'var(--accent)' }} /> Spend</span>
              <span className="row gap-1 t-sm fw-6"><span className="dot" style={{ background: 'var(--accent-teal)' }} /> Revenue</span>
            </div>
          }
        />
        <SpendRevenueChart series={ov.series} />
      </Card>

      {/* channel mini-split + top campaigns */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.35fr' }}>
        <Card>
          <SectionHeader title="Spend by channel" sub="Where the budget lives" />
          <div className="col gap-2">
            {channelBreakdown().map(ch => (
              <div key={ch.id} className="row gap-2" style={{ alignItems: 'center' }}>
                <div style={{ width: 108, flex: 'none' }}><ChannelChip id={ch.id} withLabel /></div>
                <div style={{ flex: 1 }}><ProgressBar value={ov.spend ? (ch.spend / ov.spend) * 100 : 0} color={ch.color} height={10} /></div>
                <span className="tnum fw-6" style={{ width: 62, textAlign: 'right', flex: 'none' }}>{moneyK(ch.spend)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card pad={false}>
          <div className="card-pad" style={{ paddingBottom: '.75rem' }}>
            <SectionHeader title="Top campaigns by ROAS" sub="Your best return, ranked"
              action={<Button variant="ghost" size="sm" onClick={onGoCampaigns}>All campaigns <Icon name="chevronRight" size={14} /></Button>} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Campaign</th><th>Channel</th><th style={{ textAlign: 'right' }}>Spend</th><th style={{ textAlign: 'right' }}>ROAS</th></tr></thead>
              <tbody>
                {topCampaigns.map(c => (
                  <tr key={c.id}>
                    <td><span className="fw-6 clip" style={{ maxWidth: 220, display: 'block' }}>{c.name}</span></td>
                    <td><ChannelChip id={c.channel} /></td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{moneyK(c.spend)}</td>
                    <td className="tnum fw-7" style={{ textAlign: 'right', color: roasColor(roas(c)) }}>{roasFmt(roas(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* attribution teaser */}
      <Card className="row between wrap" style={{ gap: '1rem', background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 65%)' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--accent)' }}><Icon name="key" size={24} /></span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7">Close the loop: <GradientText>click to closed-won</GradientText></span>
            <span className="t-sm muted">See which ad channel sourced each deal in your pipeline. No ad platform can show you this.</span>
          </div>
        </div>
        <Button variant="accent" onClick={onGoAttribution} style={{ flex: 'none' }}><Icon name="target" size={16} /> View attribution</Button>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 2 - CAMPAIGNS
   ============================================================ */
function Campaigns({ toast, onNew }) {
  useAds();
  const all = getCampaigns();
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');

  const rows = all.filter(c =>
    (channel === 'all' || c.channel === channel) &&
    (status === 'all' || c.status === status)
  );

  return (
    <div className="col gap-3">
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6 muted">Filter</span>
          <Segmented value={status} onChange={setStatus} options={[
            { value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' },
          ]} />
          <Select value={channel} onChange={e => setChannel(e.target.value)} style={{ width: 160 }}>
            <option value="all">All channels</option>
            {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <span className="t-sm muted tnum">{rows.length} of {all.length}</span>
          <Button variant="accent" size="sm" onClick={onNew}><Icon name="plus" size={15} /> New campaign</Button>
        </div>
      </Card>

      <Card pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th><th>Channel</th><th>Enabled</th>
                <th style={{ textAlign: 'right' }}>Budget/mo</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th style={{ textAlign: 'right' }}>Clicks</th>
                <th style={{ textAlign: 'right' }}>CTR</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
                <th style={{ textAlign: 'right' }}>CPL</th>
                <th style={{ textAlign: 'right' }}>ROAS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const on = c.status === 'active';
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="col" style={{ gap: 2, minWidth: 0 }}>
                        <span className="fw-6 clip" style={{ maxWidth: 240 }}>{c.name}</span>
                        <span className="t-xs muted">{objectiveById(c.objective).label}</span>
                      </div>
                    </td>
                    <td><ChannelChip id={c.channel} withLabel /></td>
                    <td>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on}
                          aria-label={`${on ? 'Pause' : 'Enable'} ${c.name}`}
                          onClick={() => { toggleCampaign(c.id); toast(on ? 'Campaign paused' : 'Campaign enabled', on ? 'warn' : 'ok'); }} />
                        <Badge tone={STATUS_META[c.status].tone} className="t-xs hide-520">{STATUS_META[c.status].label}</Badge>
                      </div>
                    </td>
                    <td className="tnum muted" style={{ textAlign: 'right' }}>{money(c.budget)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{money(c.spend)}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{compact(c.clicks)}</td>
                    <td className="tnum muted" style={{ textAlign: 'right' }}>{pct1(ctr(c))}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{c.leads.toLocaleString()}</td>
                    <td className="tnum muted" style={{ textAlign: 'right' }}>{c.leads ? dollars2(cpl(c)) : '-'}</td>
                    <td className="tnum fw-7" style={{ textAlign: 'right', color: roasColor(roas(c)) }}>{roasFmt(roas(c))}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-quiet reveal" aria-label={`Delete ${c.name}`}
                        onClick={() => { if (deleteCampaign(c.id).ok) toast('Campaign removed', 'warn'); }}
                        style={{ padding: '.3rem .45rem' }}>
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={11}><EmptyState icon="📣" title="No campaigns here" body="Adjust the filters or launch a new campaign to fill this board." action={<Button variant="accent" onClick={onNew}><Icon name="plus" size={15} /> New campaign</Button>} /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NewCampaignModal({ onClose, toast }) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('google');
  const [objective, setObjective] = useState('leads');
  const [budget, setBudget] = useState('4000');
  const [audience, setAudience] = useState('');

  const submit = () => {
    const r = createCampaign({ name, channel, objective, budget, audience });
    if (r.error) return toast(r.message, 'risk');
    toast('Campaign launched');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="New campaign" width={580} footer={
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="rocket" size={15} /> Launch campaign</Button></>
    }>
      <div className="col gap-3">
        <Field label="Campaign name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q3 Demand Gen - Search" autoFocus />
        </Field>
        <div className="field">
          <label>Channel</label>
          <div className="row gap-1 wrap">
            {CHANNELS.map(c => (
              <button key={c.id} onClick={() => setChannel(c.id)} className="btn btn-sm"
                style={{ background: channel === c.id ? c.color : 'var(--n-100)', color: channel === c.id ? '#fff' : 'var(--n-600)', border: 'none' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Objective">
            <Select value={objective} onChange={e => setObjective(e.target.value)}>
              {OBJECTIVES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Monthly budget" hint="USD">
            <Input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="4000" />
          </Field>
        </div>
        <Field label="Audience (optional)">
          <Textarea rows={3} value={audience} onChange={e => setAudience(e.target.value)} placeholder="In-market: CRM, sales software, revenue ops" />
        </Field>
        {!hasAdsSyncEnv() && <div className="t-xs muted row gap-1"><Icon name="lock" size={13} /> Platform sync not connected. Campaigns launch on the local board and push once ad-network env is wired.</div>}
      </div>
    </Modal>
  );
}

/* ============================================================
   TAB 3 - CHANNELS + CREATIVES
   ============================================================ */
function Channels() {
  const channels = channelBreakdown();
  const creatives = bestCreatives();
  const totalSpend = channels.reduce((s, c) => s + c.spend, 0);

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {channels.map(ch => (
          <Card key={ch.id} className="col gap-2">
            <div className="row between">
              <ChannelChip id={ch.id} withLabel size={26} />
              <Badge tone="default" className="t-xs">{ch.campaigns} camp.</Badge>
            </div>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="col gap-1">
                <div className="stat-label">Spend</div>
                <div style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-.02em' }}>{moneyK(ch.spend)}</div>
              </div>
              <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
                <div className="stat-label">ROAS</div>
                <div style={{ fontWeight: 800, fontSize: '1.6rem', color: roasColor(ch.roas) }}>{roasFmt(ch.roas)}</div>
              </div>
            </div>
            <ProgressBar value={totalSpend ? (ch.spend / totalSpend) * 100 : 0} color={ch.color} height={6} />
            <div className="row between t-xs muted">
              <span>{compact(ch.impressions)} impr.</span>
              <span>{pct1(ch.ctr)} CTR</span>
              <span>{ch.leads.toLocaleString()} leads</span>
              <span>{dollars2(ch.cpc)} CPC</span>
            </div>
          </Card>
        ))}
      </div>

      <Card pad={false}>
        <div className="card-pad" style={{ paddingBottom: '.75rem' }}>
          <SectionHeader title="Best performing creatives" sub="Ranked by click-through rate across every network" />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Creative</th><th>Channel</th><th>Format</th>
                <th style={{ textAlign: 'right' }}>Impressions</th>
                <th style={{ textAlign: 'right' }}>Clicks</th>
                <th style={{ textAlign: 'right' }}>CTR</th>
                <th style={{ textAlign: 'right' }}>Conv.</th>
                <th style={{ textAlign: 'right' }}>CPC</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map((cr, i) => (
                <tr key={cr.id}>
                  <td>
                    <div className="row gap-2" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '1.4rem', flex: 'none', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--n-100)', borderRadius: 8 }}>{cr.thumb}</span>
                      <div className="col" style={{ gap: 1, minWidth: 0 }}>
                        <span className="fw-6 clip" style={{ maxWidth: 280 }}>{cr.headline}</span>
                        {i === 0 && <span className="t-xs" style={{ color: 'var(--ok)', fontWeight: 700 }}>Top performer</span>}
                      </div>
                    </div>
                  </td>
                  <td><ChannelChip id={cr.channel} /></td>
                  <td className="muted t-sm">{cr.format}</td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{compact(cr.impressions)}</td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{compact(cr.clicks)}</td>
                  <td className="tnum fw-7" style={{ textAlign: 'right' }}>{pct1(cr.ctr)}</td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{cr.conversions}</td>
                  <td className="tnum muted" style={{ textAlign: 'right' }}>{dollars2(cr.cpc)}</td>
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
   TAB 4 - ATTRIBUTION (click to closed-won)
   ============================================================ */
function Attribution() {
  useAds();
  const att = useMemo(() => attributedDeals(), []);
  const maxRev = Math.max(1, ...att.byChannel.map(c => c.revenue));

  return (
    <div className="col gap-3">
      <Card className="row between wrap" style={{ gap: '1rem', background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 66%)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Click to closed-won</div>
          <h3 style={{ margin: 0 }}>Paid media, tied to real pipeline revenue</h3>
          <div className="muted t-sm" style={{ maxWidth: 560 }}>Ardovo maps every closed-won deal back to the ad channel that sourced it. That is the loop Google, Meta, LinkedIn and TikTok can never close on their own.</div>
        </div>
        <div className="row gap-3" style={{ flex: 'none' }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="stat-label">Sourced revenue</span>
            <span style={{ fontWeight: 800, fontSize: '1.7rem' }}>{money(att.totalRevenue)}</span>
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span className="stat-label">Blended ROAS</span>
            <span style={{ fontWeight: 800, fontSize: '1.7rem', color: roasColor(att.blendedRoas) }}>{roasFmt(att.blendedRoas)}</span>
          </div>
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {att.byChannel.map(ch => (
          <Card key={ch.id} className="col gap-2">
            <ChannelChip id={ch.id} withLabel size={24} />
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="col gap-1">
                <span className="stat-label">Revenue</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>{moneyK(ch.revenue)}</span>
              </div>
              <Badge tone="accent">{ch.count} deal{ch.count === 1 ? '' : 's'}</Badge>
            </div>
            <ProgressBar value={(ch.revenue / maxRev) * 100} color={ch.color} height={8} />
          </Card>
        ))}
      </div>

      <Card pad={false}>
        <div className="card-pad" style={{ paddingBottom: '.75rem' }}>
          <SectionHeader title="Sourced deals" sub={`${att.totalDeals} closed-won deals mapped to a channel`} />
        </div>
        {att.rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Deal</th><th>Account</th><th>Sourced by</th><th style={{ textAlign: 'right' }}>Value</th><th></th></tr></thead>
              <tbody>
                {att.rows.slice(0, 30).map(r => (
                  <tr key={r.dealId}>
                    <td><span className="fw-6 clip" style={{ maxWidth: 280, display: 'block' }}>{r.name}</span></td>
                    <td className="muted">{r.company || '-'}</td>
                    <td><ChannelChip id={r.channel} withLabel /></td>
                    <td className="tnum fw-6" style={{ textAlign: 'right' }}>{money(r.value)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to="/deals" className="link t-sm row" style={{ gap: 3, justifyContent: 'flex-end' }}>Open <Icon name="chevronRight" size={13} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="🎯" title="No closed-won deals yet" body="Once deals close in your pipeline, Ardovo maps each one back to the ad channel that sourced it." />
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Ads() {
  useAds();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [newOpen, setNewOpen] = useState(false);
  const ov = adsOverview();

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Marketing"
        title={<>Ads <GradientText>Manager</GradientText></>}
        sub="Google, Meta, LinkedIn and TikTok in one board, with ROAS and CRM attribution. Owners run ads in four dashboards. Ardovo closes the loop from click to closed-won."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Look at my ad channels and tell me where to shift budget for the best ROAS this month.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New campaign</Button>
          </div>
        }
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'campaigns', label: 'Campaigns', count: ov.campaigns },
        { key: 'channels', label: 'Channels' },
        { key: 'attribution', label: 'Attribution' },
      ]} />

      {tab === 'overview' && <Overview ov={ov} onGoCampaigns={() => setTab('campaigns')} onGoAttribution={() => setTab('attribution')} />}
      {tab === 'campaigns' && <Campaigns toast={toast} onNew={() => setNewOpen(true)} />}
      {tab === 'channels' && <Channels />}
      {tab === 'attribution' && <Attribution />}

      {newOpen && <NewCampaignModal onClose={() => setNewOpen(false)} toast={toast} />}
    </div>
  );
}
