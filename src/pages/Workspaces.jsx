// ============================================================
// WORKSPACES - Agency sub-accounts + white-label + rebilling.
// This is Ardovo's distribution wedge: run Ardovo as your own product,
// spin up client sub-accounts, resell under your brand, and mark up
// usage for margin. The reason agencies keep GoHighLevel - and the
// thing HubSpot cannot answer. Four surfaces, all live over the local
// agency book: Sub-accounts, Snapshots, White-label, Rebilling.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PageTitle, SectionHeader, StatCard, Card, Button, Badge, Tabs, Field, Input, Select,
  Modal, Segmented, Sparkline, ProgressBar, HealthDot, EmptyState, GradientText, useToast,
  money, moneyK, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useWorkspacesStore, getWorkspaces, getSnapshots, getAgency, PLANS, METERS, STATUSES,
  planById, agencyRollup, workspaceEconomics, usageBreakdown,
  createWorkspace, cloneWorkspace, saveSnapshot, updateAgency, updateRebill,
} from '../lib/workspaces-data.js';

const INDUSTRIES = ['Healthcare', 'Fitness', 'Wellness', 'Home Services', 'Legal', 'Real Estate', 'Beauty', 'Professional Services', 'Other'];

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ============================================================
   SUB-ACCOUNT CARD
   ============================================================ */
function WorkspaceCard({ ws, rebill, onClone }) {
  const nav = useNavigate();
  const e = workspaceEconomics(ws, rebill);
  const st = STATUSES[ws.status] || STATUSES.active;
  const seatPct = ws.seats ? Math.round((ws.seatsUsed / ws.seats) * 100) : 0;
  return (
    <Card hover className="col gap-2" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => nav(`/workspaces/${ws.id}`)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: ws.color, borderRadius: 12 }}>
            {ws.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')}
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="row gap-1" style={{ minWidth: 0 }}>
              <HealthDot health={ws.health} />
              <span className="fw-7 clip" style={{ fontSize: '1.02rem' }}>{ws.name}</span>
            </div>
            <span className="t-sm muted clip">{ws.industry}</span>
          </div>
        </div>
        <Badge tone={st.tone} style={{ flex: 'none' }}>{st.label}</Badge>
      </div>

      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div className="col gap-1">
          <span className="stat-label">MRR</span>
          <span className="fw-8" style={{ fontSize: '1.55rem', letterSpacing: '-.02em' }}>{money(Math.round(e.mrr))}</span>
          <span className="t-xs" style={{ color: 'var(--ok)', fontWeight: 700 }}>{money(Math.round(e.margin))} margin / mo</span>
        </div>
        <div style={{ opacity: .95 }}><Sparkline data={ws.trend} w={104} h={40} color={ws.color} /></div>
      </div>

      <div className="row between t-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
        <Badge style={{ background: 'var(--accent-50)', color: 'var(--accent-600)' }}>{planById(ws.planId).name}</Badge>
        <span className="muted">{ws.seatsUsed}/{ws.seats} seats</span>
        <span className="muted">{relTime(ws.lastActivityAt)}</span>
      </div>

      <div className="row gap-1 reveal" style={{ position: 'absolute', top: 12, right: 12 }} onClick={(ev) => ev.stopPropagation()}>
        <button className="btn btn-quiet btn-sm" title="Clone workspace" onClick={() => onClone(ws)} style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="copy" size={15} />
        </button>
      </div>
    </Card>
  );
}

/* ============================================================
   CREATE / CLONE MODAL
   ============================================================ */
function CreateModal({ open, onClose, preselectSnapshot }) {
  const nav = useNavigate();
  const toast = useToast();
  const snapshots = getSnapshots();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [planId, setPlanId] = useState('growth');
  const [snapshotId, setSnapshotId] = useState(preselectSnapshot || '');
  const [status, setStatus] = useState('trial');

  React.useEffect(() => { if (open) { setSnapshotId(preselectSnapshot || ''); setName(''); } }, [open, preselectSnapshot]);

  const submit = () => {
    const res = createWorkspace({ name, industry, planId, snapshotId: snapshotId || null, status });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`${res.workspace.name} created${snapshotId ? ' from snapshot' : ''}`);
    onClose();
    nav(`/workspaces/${res.workspace.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New client workspace" width={600}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}><Icon name="plus" size={16} /> Create workspace</Button></>}>
      <div className="col gap-3">
        <Field label="Client name" hint="This is the business you are onboarding as a sub-account.">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Fitness Co" autoFocus />
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Industry"><Select value={industry} onChange={(e) => setIndustry(e.target.value)}>{INDUSTRIES.map(i => <option key={i}>{i}</option>)}</Select></Field>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="trial">Trial</option><option value="active">Active</option></Select></Field>
        </div>
        <Field label="Plan">
          <div className="row gap-1 wrap">
            {PLANS.map(p => (
              <button key={p.id} onClick={() => setPlanId(p.id)} className="btn"
                style={{ flex: 1, minWidth: 150, flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '.7rem .9rem',
                  border: `1.5px solid ${planId === p.id ? 'var(--accent)' : 'var(--line-strong)'}`, background: planId === p.id ? 'var(--accent-50)' : 'var(--paper)' }}>
                <span className="fw-7">{p.name}</span>
                <span className="t-sm muted">{money(p.price)}/mo client price</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Deploy a snapshot" hint="Optional. Clone a fully configured workspace - pipelines, automations, templates, dashboards - in one click.">
          <Select value={snapshotId} onChange={(e) => setSnapshotId(e.target.value)}>
            <option value="">Start blank</option>
            {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   SNAPSHOTS TAB
   ============================================================ */
function SnapshotCard({ snap, onDeploy }) {
  const parts = snap.includes;
  const chips = [
    { k: 'pipelines', label: 'pipelines' }, { k: 'automations', label: 'automations' },
    { k: 'templates', label: 'templates' }, { k: 'dashboards', label: 'dashboards' }, { k: 'sequences', label: 'sequences' },
  ];
  return (
    <Card className="col gap-2">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }} className="grad-accent">
            <Icon name="layers" size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="fw-7 clip" style={{ fontSize: '1.05rem' }}>{snap.name}</span>
            <span className="t-xs mono muted clip">{snap.blueprint}</span>
          </div>
        </div>
        {snap.featured && <Badge tone="accent" style={{ flex: 'none' }}>Featured</Badge>}
      </div>
      <p className="t-sm muted" style={{ margin: 0 }}>{snap.description}</p>
      <div className="row gap-1 wrap">
        {chips.map(c => <Badge key={c.k}>{parts[c.k]} {c.label}</Badge>)}
      </div>
      <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
        <span className="t-sm muted"><span className="fw-7" style={{ color: 'var(--ink)' }}>{snap.deployCount}</span> deploys</span>
        <Button size="sm" onClick={() => onDeploy(snap)}><Icon name="rocket" size={15} /> Deploy to new client</Button>
      </div>
    </Card>
  );
}

function SaveSnapshotModal({ open, onClose }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  React.useEffect(() => { if (open) { setName(''); setDescription(''); } }, [open]);
  const submit = () => {
    const res = saveSnapshot({ name, description });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`Snapshot "${res.snapshot.name}" saved`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Save current workspace as a snapshot" width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}><Icon name="layers" size={16} /> Save snapshot</Button></>}>
      <div className="col gap-3">
        <div className="panel card-pad col gap-1" style={{ background: 'var(--accent-50)', borderColor: 'var(--accent-300)' }}>
          <span className="t-sm fw-6" style={{ color: 'var(--accent-700)' }}>Captures the live config</span>
          <span className="t-sm muted">Pipelines, automations, message templates, and dashboards are serialized into a reusable blueprint you can deploy into any new client in one click. This ties into Genesis blueprints.</span>
        </div>
        <Field label="Snapshot name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dental Practice Launch Kit" autoFocus /></Field>
        <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this configuration is for" /></Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   WHITE-LABEL TAB
   ============================================================ */
function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="row gap-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: 46, height: 42, padding: 2, border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', background: 'var(--n-0)', cursor: 'pointer' }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mono" style={{ maxWidth: 140 }} />
      </div>
    </Field>
  );
}

function WhiteLabel() {
  const agency = getAgency();
  const toast = useToast();
  const [f, setF] = useState(() => ({ ...agency }));
  const set = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const dirty = JSON.stringify({ ...f }) !== JSON.stringify({ ...agency });
  const save = () => { updateAgency(f); toast('Branding saved. Every client login now wears your brand.'); };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, .95fr)' }}>
      <Card className="col gap-3">
        <SectionHeader title="Brand identity" sub="Resold as your own product. Your clients never see the word Ardovo." />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Product name"><Input value={f.productName} onChange={(e) => set('productName')(e.target.value)} /></Field>
          <Field label="Logo monogram" hint="1-2 characters"><Input value={f.logoText} maxLength={2} onChange={(e) => set('logoText')(e.target.value.toUpperCase())} /></Field>
        </div>
        <Field label="Custom domain" hint="Point a CNAME here and the whole app serves from your domain.">
          <div className="row gap-1">
            <span style={{ padding: '.68rem .7rem', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', background: 'var(--n-50)', color: 'var(--n-600)', flex: 'none' }}><Icon name="globe" size={16} /></span>
            <Input value={f.domain} onChange={(e) => set('domain')(e.target.value)} className="mono" placeholder="app.youragency.com" />
          </div>
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <ColorField label="Accent color" value={f.accent} onChange={set('accent')} />
          <ColorField label="Logo color" value={f.logoColor} onChange={set('logoColor')} />
        </div>
        <Field label="Support email"><Input value={f.supportEmail} onChange={(e) => set('supportEmail')(e.target.value)} /></Field>
        <SectionHeader title="Login page" sub="The first thing every client sees." />
        <Field label="Headline"><Input value={f.loginHeadline} onChange={(e) => set('loginHeadline')(e.target.value)} /></Field>
        <Field label="Subtext"><Input value={f.loginSubtext} onChange={(e) => set('loginSubtext')(e.target.value)} /></Field>
        <div className="row gap-1">
          <Button onClick={save} disabled={!dirty}><Icon name="check" size={16} /> {dirty ? 'Save branding' : 'Saved'}</Button>
          <Button variant="ghost" onClick={() => setF({ ...agency })} disabled={!dirty}>Reset</Button>
        </div>
      </Card>

      {/* Live login preview */}
      <div className="col gap-2">
        <span className="eyebrow">Live preview</span>
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <div style={{ background: `radial-gradient(1000px 500px at 50% -10%, ${f.accent}22, transparent 70%)`, padding: '2.4rem 1.6rem', minHeight: 320 }} className="col center gap-3">
            <span style={{ width: 60, height: 60, borderRadius: 16, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 22, background: f.logoColor, boxShadow: `0 12px 30px -8px ${f.logoColor}88` }}>{f.logoText || '?'}</span>
            <div className="col center gap-1" style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0 }}>{f.loginHeadline || 'Sign in'}</h3>
              <span className="muted t-sm">{f.loginSubtext}</span>
            </div>
            <div className="col gap-1" style={{ width: '100%', maxWidth: 300 }}>
              <div style={{ height: 42, borderRadius: 'var(--r-sm)', border: '1px solid var(--line-strong)', background: 'var(--n-0)', display: 'flex', alignItems: 'center', padding: '0 .8rem', color: 'var(--n-400)' }} className="t-sm">you@company.com</div>
              <div style={{ height: 42, borderRadius: 'var(--r-sm)', border: '1px solid var(--line-strong)', background: 'var(--n-0)', display: 'flex', alignItems: 'center', padding: '0 .8rem', color: 'var(--n-400)' }} className="t-sm">Password</div>
              <button className="btn" style={{ background: f.accent, color: '#fff', width: '100%', marginTop: 4 }}>Sign in to {f.productName}</button>
            </div>
            <span className="t-xs muted">Need help? {f.supportEmail}</span>
          </div>
        </Card>
        <div className="panel card-pad row gap-2" style={{ alignItems: 'center' }}>
          <Icon name="shield" size={20} style={{ color: 'var(--accent)', flex: 'none' }} />
          <span className="t-sm muted">Zero Ardovo branding reaches your clients. Custom domain, login, colors, emails, support address - the platform is yours.</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REBILLING TAB
   ============================================================ */
function MarkupControl({ meter, value, onChange }) {
  return (
    <div className="col gap-1">
      <div className="row between">
        <span className="row gap-1 fw-6"><Icon name={meter.icon} size={16} style={{ color: meter.color }} /> {meter.name}</span>
        <span className="mono fw-7" style={{ color: meter.color }}>{value.toFixed(2)}x</span>
      </div>
      <input type="range" min="1" max="6" step="0.05" value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: meter.color }} />
      <div className="row between t-xs muted">
        <span>Cost {'$'}{meter.base.toFixed(3)}/{meter.unit}</span>
        <span>Bill {'$'}{(meter.base * value).toFixed(3)}/{meter.unit}</span>
      </div>
    </div>
  );
}

function Rebilling() {
  const agency = getAgency();
  const toast = useToast();
  const [rebill, setRebill] = useState(() => ({ ...agency.rebill }));
  const roll = useMemo(() => agencyRollup(rebill), [rebill]);
  const workspaces = getWorkspaces().filter(w => w.status !== 'paused');
  const dirty = JSON.stringify(rebill) !== JSON.stringify(agency.rebill);
  const save = () => { updateRebill(rebill); toast('Rebilling markup saved'); };

  // per-meter agency-wide margin for the profit bars
  const meterMargin = METERS.map(m => {
    let margin = 0, billed = 0;
    for (const w of workspaces) {
      const units = w.usage?.[m.id] || 0;
      const base = units * m.base;
      const bl = base * (rebill[m.id] ?? 1);
      margin += bl - base; billed += bl;
    }
    return { ...m, margin, billed };
  });
  const maxMargin = Math.max(1, ...meterMargin.map(m => m.margin));

  return (
    <div className="col gap-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, .9fr) minmax(0, 1.1fr)' }}>
        <Card className="col gap-3">
          <SectionHeader title="Usage markup" sub="Set your margin on every metered unit. Clients are billed base cost times your multiplier." />
          {METERS.map(m => <MarkupControl key={m.id} meter={m} value={rebill[m.id] ?? 1} onChange={(v) => setRebill(s => ({ ...s, [m.id]: v }))} />)}
          <div className="row gap-1">
            <Button onClick={save} disabled={!dirty}><Icon name="check" size={16} /> {dirty ? 'Save markup' : 'Saved'}</Button>
            <Button variant="ghost" onClick={() => setRebill({ ...agency.rebill })} disabled={!dirty}>Reset</Button>
          </div>
        </Card>

        <div className="col gap-3">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <StatCard label="Usage margin / mo" value={Math.round(roll.usageRevenue - workspaces.reduce((s, w) => s + METERS.reduce((a, m) => a + (w.usage?.[m.id] || 0) * m.base, 0), 0))} format={money} icon={<Icon name="dollar" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" sub="profit on rebilled usage" />
            <StatCard label="Billed usage / mo" value={Math.round(roll.usageRevenue)} format={money} icon={<Icon name="receipt" size={18} />} accent="var(--accent-teal)" sub="across all clients" />
          </div>
          <Card className="col gap-2">
            <span className="stat-label">Margin by meter</span>
            {meterMargin.map(m => (
              <div key={m.id} className="col gap-1">
                <div className="row between t-sm">
                  <span className="row gap-1"><Icon name={m.icon} size={14} style={{ color: m.color }} /> {m.name}</span>
                  <span className="fw-7">{money(Math.round(m.margin))}/mo</span>
                </div>
                <ProgressBar value={(m.margin / maxMargin) * 100} color={m.color} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Per-client margin table */}
      <Card pad={false}>
        <div className="row between card-pad" style={{ paddingBottom: '.9rem' }}>
          <SectionHeader title="Per-client margin" sub="What each workspace nets you after Ardovo wholesale cost." />
          <Badge tone="ok" style={{ flex: 'none' }}>{money(Math.round(roll.margin))}/mo total</Badge>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Client</th><th>Plan</th><th style={{ textAlign: 'right' }}>Subscription</th><th style={{ textAlign: 'right' }}>Usage billed</th><th style={{ textAlign: 'right' }}>Ardovo cost</th><th style={{ textAlign: 'right' }}>Margin</th><th style={{ textAlign: 'right' }}>Margin %</th></tr></thead>
            <tbody>
              {workspaces.map(w => {
                const e = workspaceEconomics(w, rebill);
                return (
                  <tr key={w.id}>
                    <td><Link className="row gap-1 link" to={`/workspaces/${w.id}`} style={{ color: 'var(--ink)' }}><HealthDot health={w.health} /> <span className="fw-6">{w.name}</span></Link></td>
                    <td><Badge style={{ background: 'var(--accent-50)', color: 'var(--accent-600)' }}>{e.plan.name}</Badge></td>
                    <td style={{ textAlign: 'right' }} className="tnum">{money(e.subRevenue)}</td>
                    <td style={{ textAlign: 'right' }} className="tnum">{money(Math.round(e.usageRevenue))}</td>
                    <td style={{ textAlign: 'right' }} className="tnum muted">{money(Math.round(e.rallyCost))}</td>
                    <td style={{ textAlign: 'right', color: 'var(--ok)' }} className="tnum fw-7">{money(Math.round(e.margin))}</td>
                    <td style={{ textAlign: 'right' }} className="tnum">{e.marginPct}%</td>
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
   PAGE
   ============================================================ */
export default function Workspaces() {
  const snap = useWorkspacesStore();
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('accounts');
  const [createOpen, setCreateOpen] = useState(false);
  const [preselect, setPreselect] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const agency = getAgency();
  const roll = useMemo(() => agencyRollup(), [snap]);
  const workspaces = getWorkspaces();
  const snapshots = getSnapshots();

  const filtered = workspaces.filter(w =>
    (statusFilter === 'all' || w.status === statusFilter) &&
    (!q.trim() || w.name.toLowerCase().includes(q.toLowerCase()) || w.industry.toLowerCase().includes(q.toLowerCase()))
  );

  const doClone = (ws) => { const res = cloneWorkspace(ws.id); if (!res.error) toast(`Cloned ${ws.name}`); };
  const doDeploy = (snapshot) => { setPreselect(snapshot.id); setCreateOpen(true); };

  return (
    <div className="fade-up col gap-3">
      <PageTitle
        eyebrow="Agency mode"
        title={<>Workspaces</>}
        sub={<>Run Ardovo as your own product. Spin up client sub-accounts, resell under your brand, and mark up usage for margin. This is how Ardovo becomes your distribution channel.</>}
        action={<>
          <Button variant="ghost" onClick={() => askRook('Which of my client workspaces are unhealthy or at churn risk, and what should I do this week?')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
          <Button onClick={() => { setPreselect(''); setCreateOpen(true); }}><Icon name="plus" size={16} /> New workspace</Button>
        </>}
      />

      {/* Agency KPI rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <StatCard label="Agency MRR" value={Math.round(roll.mrr)} format={money} icon={<Icon name="dollar" size={18} />} sub={`${moneyK(Math.round(roll.arr))} ARR`} />
        <StatCard label="Rebilling margin / mo" value={Math.round(roll.margin)} format={money} icon={<Icon name="trendUp" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" sub={`${roll.marginPct}% blended margin`} />
        <StatCard label="Client workspaces" value={roll.count} icon={<Icon name="building2" size={18} />} accent="var(--accent-teal)" sub={`${roll.trial} on trial, ${roll.paused} paused`} />
        <StatCard label="Healthy clients" value={roll.health.green} icon={<Icon name="shield" size={18} />} accent="var(--accent-purple)" sub={`${roll.health.yellow} watch, ${roll.health.red} at risk`} />
      </div>

      <Tabs
        tabs={[
          { key: 'accounts', label: 'Sub-accounts', count: workspaces.length },
          { key: 'snapshots', label: 'Snapshots', count: snapshots.length },
          { key: 'brand', label: 'White-label' },
          { key: 'rebilling', label: 'Rebilling' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'accounts' && (
        <div className="col gap-3">
          <div className="row between wrap gap-2">
            <div className="row gap-1" style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
              <span style={{ position: 'relative', flex: 1 }}>
                <Icon name="search" size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" style={{ paddingLeft: 36 }} />
              </span>
            </div>
            <Segmented
              options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'trial', label: 'Trial' }, { value: 'paused', label: 'Paused' }]}
              value={statusFilter} onChange={setStatusFilter}
            />
          </div>
          {filtered.length ? (
            <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filtered.map(w => <WorkspaceCard key={w.id} ws={w} rebill={agency.rebill} onClone={doClone} />)}
            </div>
          ) : (
            <EmptyState icon="🏢" title="No workspaces match" body="Try a different search or filter, or create a new client sub-account."
              action={<Button onClick={() => { setPreselect(''); setCreateOpen(true); }}><Icon name="plus" size={16} /> New workspace</Button>} />
          )}
        </div>
      )}

      {tab === 'snapshots' && (
        <div className="col gap-3">
          <div className="panel card-pad row between wrap gap-2" style={{ background: 'linear-gradient(120deg, var(--accent-50), transparent)' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <span className="fw-7" style={{ fontSize: '1.05rem' }}><GradientText>Configure once. Deploy forever.</GradientText></span>
              <span className="t-sm muted">Save a fully built workspace as a snapshot, then stamp it into every new client in one click. Same engine as Genesis blueprints.</span>
            </div>
            <Button onClick={() => setSaveOpen(true)} style={{ flex: 'none' }}><Icon name="layers" size={16} /> Save snapshot</Button>
          </div>
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {snapshots.map(s => <SnapshotCard key={s.id} snap={s} onDeploy={doDeploy} />)}
          </div>
        </div>
      )}

      {tab === 'brand' && <WhiteLabel />}
      {tab === 'rebilling' && <Rebilling />}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} preselectSnapshot={preselect} />
      <SaveSnapshotModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}
