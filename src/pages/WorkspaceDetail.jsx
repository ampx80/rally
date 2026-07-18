// ============================================================
// WORKSPACE DETAIL - one client sub-account, end to end.
// Branding override, plan + seats, live usage with rebilling margin,
// the economics that make this client worth running, activity, and a
// danger zone (pause / delete). Everything mutates the local agency
// store and recomputes instantly. Rook is one click away for a churn
// read or an upsell play.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Card, Button, Badge, StatCard, SectionHeader, Field, Input, Select, Modal,
  Sparkline, ProgressBar, Ring, HealthDot, GradientText, useToast,
  money, moneyK, relTime, longDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useWorkspacesStore, getWorkspace, getAgency, getSnapshot, PLANS, METERS, STATUSES,
  planById, workspaceEconomics, usageBreakdown,
  cloneWorkspace, setWorkspacePlan, setWorkspaceStatus, deleteWorkspace, updateWorkspace,
} from '../lib/workspaces-data.js';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

export default function WorkspaceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const snap = useWorkspacesStore();
  const agency = getAgency();
  const ws = getWorkspace(id);

  const [brandOpen, setBrandOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  // Recompute economics on any store commit.
  const econ = useMemo(() => (ws ? workspaceEconomics(ws, agency.rebill) : null), [ws, agency.rebill, snap]);
  const breakdown = useMemo(() => (ws ? usageBreakdown(ws, agency.rebill) : []), [ws, agency.rebill, snap]);

  if (!ws) {
    return (
      <div className="fade-up col gap-3">
        <Card className="col center gap-2" style={{ padding: '3rem' }}>
          <Icon name="building2" size={36} style={{ color: 'var(--n-400)' }} />
          <h3 style={{ margin: 0 }}>Workspace not found</h3>
          <span className="muted">It may have been removed.</span>
          <Button as={Link} to="/workspaces" variant="ghost"><Icon name="arrowLeft" size={16} /> Back to workspaces</Button>
        </Card>
      </div>
    );
  }

  const st = STATUSES[ws.status] || STATUSES.active;
  const sourceSnap = ws.snapshotId ? getSnapshot(ws.snapshotId) : null;
  const seatPct = ws.seats ? Math.round((ws.seatsUsed / ws.seats) * 100) : 0;

  const changePlan = (planId) => { setWorkspacePlan(ws.id, planId); toast(`Moved ${ws.name} to ${planById(planId).name}`); };
  const toggleStatus = () => {
    const next = ws.status === 'paused' ? 'active' : 'paused';
    setWorkspaceStatus(ws.id, next);
    toast(next === 'paused' ? `${ws.name} paused` : `${ws.name} reactivated`);
  };
  const doClone = () => { const r = cloneWorkspace(ws.id); if (!r.error) { toast('Workspace cloned'); nav(`/workspaces/${r.workspace.id}`); } };
  const doDelete = () => { deleteWorkspace(ws.id); toast(`${ws.name} deleted`); nav('/workspaces'); };

  const usageMax = Math.max(1, ...breakdown.map(b => b.billed));

  return (
    <div className="fade-up col gap-3">
      {/* Breadcrumb + header */}
      <div className="row gap-1 t-sm muted">
        <Link className="link" to="/workspaces" style={{ color: 'var(--n-600)' }}>Workspaces</Link>
        <Icon name="chevronRight" size={14} />
        <span className="fw-6" style={{ color: 'var(--ink)' }}>{ws.name}</span>
      </div>

      <Card className="col gap-3">
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span className="avatar" style={{ width: 60, height: 60, fontSize: 22, borderRadius: 16, background: ws.color, flex: 'none' }}>
              {ws.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')}
            </span>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{ws.name}</h2>
                <Badge tone={st.tone}>{st.label}</Badge>
                <span className="row gap-1 t-sm muted"><HealthDot health={ws.health} /> {ws.health === 'green' ? 'Healthy' : ws.health === 'yellow' ? 'Watch' : 'At risk'}</span>
              </div>
              <span className="t-sm muted">{ws.industry} <span style={{ opacity: .5 }}>|</span> Managed by {ws.ownerName} <span style={{ opacity: .5 }}>|</span> Client since {longDate(ws.createdAt)}</span>
            </div>
          </div>
          <div className="row gap-1 wrap" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => askRook(`Give me a health read and one upsell play for the ${ws.name} workspace.`)}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="ghost" onClick={doClone}><Icon name="copy" size={16} /> Clone</Button>
            <Button variant="ghost" as="a" href={agency.domain ? `https://${agency.domain}` : '#'} onClick={(e) => { if (!agency.domain) e.preventDefault(); toast('Opening client workspace (demo)'); }}><Icon name="logout" size={16} /> Open</Button>
          </div>
        </div>

        {/* Snapshot origin ribbon */}
        {sourceSnap && (
          <div className="panel card-pad row gap-2" style={{ alignItems: 'center', background: 'var(--accent-50)', borderColor: 'var(--accent-300)' }}>
            <Icon name="layers" size={18} style={{ color: 'var(--accent-600)', flex: 'none' }} />
            <span className="t-sm">Deployed from the <Link className="link" to="/workspaces">{sourceSnap.name}</Link> snapshot - {sourceSnap.includes.automations} automations and {sourceSnap.includes.pipelines} pipelines were prewired at launch.</span>
          </div>
        )}
      </Card>

      {/* Economics rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <StatCard label="Client MRR" value={Math.round(econ.mrr)} format={money} icon={<Icon name="dollar" size={18} />} sub={`${money(econ.subRevenue)} plan + ${money(Math.round(econ.usageRevenue))} usage`} />
        <StatCard label="Your margin / mo" value={Math.round(econ.margin)} format={money} icon={<Icon name="trendUp" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" sub={`${econ.marginPct}% after Ardovo cost`} spark={ws.trend} />
        <StatCard label="Ardovo wholesale" value={Math.round(econ.rallyCost)} format={money} icon={<Icon name="receipt" size={18} />} accent="var(--n-600)" sub="what you pay per month" />
        <StatCard label="Contacts" value={ws.contacts} icon={<Icon name="users" size={18} />} accent="var(--accent-teal)" sub={`${ws.deals} open deals`} />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, .7fr)' }}>
        {/* Usage + rebilling breakdown */}
        <Card className="col gap-3">
          <SectionHeader title="Usage and rebilling" sub="Live metered usage this month, base cost, your markup, and the margin it throws off." />
          <div className="col gap-3">
            {breakdown.map(b => (
              <div key={b.id} className="col gap-1">
                <div className="row between">
                  <span className="row gap-1 fw-6"><Icon name={b.icon} size={16} style={{ color: b.color }} /> {b.name}</span>
                  <span className="t-sm muted">{b.units.toLocaleString()} {b.unit}</span>
                </div>
                <ProgressBar value={(b.billed / usageMax) * 100} color={b.color} height={10} />
                <div className="row between t-sm">
                  <span className="muted">Cost {money(b.base)} <span style={{ opacity: .5 }}>x</span> <span className="mono">{b.markup.toFixed(2)}x</span></span>
                  <span>Billed <span className="fw-7">{money(b.billed)}</span> <span style={{ color: 'var(--ok)', fontWeight: 700 }}>(+{money(b.margin)})</span></span>
                </div>
              </div>
            ))}
          </div>
          <div className="panel card-pad row between" style={{ background: 'var(--n-25)' }}>
            <span className="fw-6">Usage margin this month</span>
            <span className="fw-8" style={{ fontSize: '1.3rem', color: 'var(--ok)' }}>{money(Math.round(econ.usageMargin))}</span>
          </div>
          <div className="t-xs muted">Adjust markup for every client at once on the <Link className="link" to="/workspaces">Rebilling</Link> tab.</div>
        </Card>

        {/* Plan + seats + margin ring */}
        <div className="col gap-3">
          <Card className="col gap-2 center" style={{ textAlign: 'center' }}>
            <span className="stat-label">Blended margin</span>
            <Ring value={Math.max(0, Math.min(100, econ.marginPct))} size={128} stroke={12} color="var(--ok)" label={`${econ.marginPct}%`} />
            <span className="t-sm muted">{money(Math.round(econ.margin))} of {money(Math.round(econ.mrr))} MRR is yours</span>
          </Card>

          <Card className="col gap-2">
            <SectionHeader title="Plan" />
            <div className="col gap-1">
              {PLANS.map(p => {
                const on = p.id === ws.planId;
                return (
                  <button key={p.id} onClick={() => changePlan(p.id)} className="row between"
                    style={{ textAlign: 'left', width: '100%', padding: '.7rem .85rem', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`, background: on ? 'var(--accent-50)' : 'transparent' }}>
                    <span className="col" style={{ gap: 2 }}>
                      <span className="fw-7">{p.name}</span>
                      <span className="t-xs muted">{p.seats} seats included</span>
                    </span>
                    <span className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                      <span className="fw-7">{money(p.price)}</span>
                      {on && <Icon name="check" size={16} style={{ color: 'var(--accent)' }} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="col gap-1" style={{ marginTop: 4 }}>
              <div className="row between t-sm"><span className="muted">Seats used</span><span className="fw-6">{ws.seatsUsed} / {ws.seats}</span></div>
              <ProgressBar value={seatPct} color={seatPct > 85 ? 'var(--warn)' : 'var(--accent)'} />
            </div>
          </Card>
        </div>
      </div>

      {/* Branding override + activity */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card className="col gap-2">
          <SectionHeader title="Branding" sub="Inherited from your agency white-label, overridable per client." action={<Button size="sm" variant="ghost" onClick={() => setBrandOpen(true)}><Icon name="edit" size={15} /> Edit</Button>} />
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, background: agency.logoColor, flex: 'none' }}>{agency.logoText}</span>
            <div className="col">
              <span className="fw-7">{agency.productName}</span>
              <span className="t-sm mono muted">{ws.domain || agency.domain}</span>
            </div>
          </div>
          <div className="row gap-1 wrap t-sm">
            <Badge><Icon name="globe" size={13} /> {ws.domain ? 'Custom domain' : 'Agency domain'}</Badge>
            <Badge><Icon name="mail" size={13} /> {agency.supportEmail}</Badge>
          </div>
        </Card>

        <Card className="col gap-2">
          <SectionHeader title="Snapshot origin" sub="What this client was stamped from." />
          {sourceSnap ? (
            <div className="col gap-2">
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }} className="grad-accent"><Icon name="layers" size={18} /></span>
                <div className="col"><span className="fw-7">{sourceSnap.name}</span><span className="t-xs mono muted">{sourceSnap.blueprint}</span></div>
              </div>
              <div className="row gap-1 wrap t-sm">
                <Badge>{sourceSnap.includes.pipelines} pipelines</Badge>
                <Badge>{sourceSnap.includes.automations} automations</Badge>
                <Badge>{sourceSnap.includes.templates} templates</Badge>
                <Badge>{sourceSnap.includes.dashboards} dashboards</Badge>
              </div>
            </div>
          ) : (
            <span className="t-sm muted">Built blank. You can <Link className="link" to="/workspaces">save its config as a snapshot</Link> once it is dialed in.</span>
          )}
          <div className="row between t-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
            <span className="muted">Automations live</span><span className="fw-6">{ws.automations}</span>
          </div>
        </Card>
      </div>

      {/* Danger zone */}
      <Card className="col gap-2" style={{ borderColor: 'var(--line-strong)' }}>
        <SectionHeader title="Lifecycle" sub="Pause billing, reactivate, or remove this client workspace." />
        <div className="row gap-1 wrap">
          <Button variant={ws.status === 'paused' ? 'primary' : 'ghost'} onClick={toggleStatus}>
            <Icon name={ws.status === 'paused' ? 'rocket' : 'clock'} size={16} /> {ws.status === 'paused' ? 'Reactivate' : 'Pause billing'}
          </Button>
          <Button variant="danger" onClick={() => setDelOpen(true)}><Icon name="trash" size={16} /> Delete workspace</Button>
        </div>
      </Card>

      {/* Branding override modal */}
      <BrandModal open={brandOpen} onClose={() => setBrandOpen(false)} ws={ws} />

      {/* Delete confirm */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete workspace" width={480}
        footer={<><Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button><Button variant="danger" onClick={doDelete}><Icon name="trash" size={16} /> Delete {ws.name}</Button></>}>
        <div className="col gap-2">
          <p style={{ margin: 0 }}>This removes <span className="fw-7">{ws.name}</span> and stops its {money(Math.round(econ.mrr))}/mo billing. In production this is a soft-delete you can restore for 30 days.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- per-client branding override ---------- */
function BrandModal({ open, onClose, ws }) {
  const toast = useToast();
  const [domain, setDomain] = useState(ws.domain || '');
  React.useEffect(() => { if (open) setDomain(ws.domain || ''); }, [open, ws.domain]);
  const save = () => { updateWorkspace(ws.id, { domain: domain.trim() }); toast('Client branding updated'); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title={`Branding - ${ws.name}`} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}><Icon name="check" size={16} /> Save</Button></>}>
      <div className="col gap-3">
        <div className="panel card-pad t-sm muted">This client inherits your agency white-label. Set a custom domain to serve their workspace from their own URL.</div>
        <Field label="Custom domain" hint="Leave blank to use the agency domain.">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} className="mono" placeholder="crm.clientdomain.com" />
        </Field>
      </div>
    </Modal>
  );
}
