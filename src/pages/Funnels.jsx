// ============================================================
// Funnels - Ardovo's conversion funnel builder (Marketing hub).
//
// Engine 6 (Marketing Hub unification): a funnel is an ordered set of
// steps, each pointing at a REAL asset - a landing page (built with the
// shared visual designer) or a form. Every count is tracked, not
// simulated: landing views + submissions, form views + completions. The
// step-through and conversion figures derive from those real events and
// fall back to 0 / empty when an asset has no traffic yet.
//
// One local-first store (src/lib/funnels-data.js) plus live reads from
// the landing-pages + forms stores. Reuses UI.jsx primitives + Icon.
// Every button works, empty states designed. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  useFunnels, funnelMetrics, portfolioMetrics,
  STEP_KINDS, STEP_KIND_LIST, stepKindMeta, STATUSES, statusMeta,
  createFunnel, updateFunnel, deleteFunnel, duplicateFunnel,
  addStep, removeStep, moveStep, updateStep,
} from '../lib/funnels-data.js';
import { useLanding, getLandingPages } from '../lib/landing-pages.js';
import { useForms, getForms } from '../lib/forms.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select,
  Modal, EmptyState, Segmented, ProgressBar, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { Link } from 'react-router-dom';

const pct = (n) => `${(n || 0).toFixed(n >= 10 || n === 0 ? 0 : 1)}%`;
const num = (n) => Math.round(n || 0).toLocaleString();
const STATUS_TONE = { live: 'ok', draft: 'default', paused: 'warn' };

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ============================================================
   ROOT
   ============================================================ */
export default function Funnels() {
  const state = useFunnels();
  // Re-render on real asset changes so tracked counts stay live.
  useLanding();
  useForms();
  const [editingId, setEditingId] = useState(null);
  const editing = editingId ? state.funnels.find(f => f.id === editingId) : null;

  if (editing) return <FunnelEditor funnel={editing} onBack={() => setEditingId(null)} />;
  return <FunnelsGrid funnels={state.funnels} onOpen={setEditingId} />;
}

/* ============================================================
   GRID
   ============================================================ */
function FunnelsGrid({ funnels, onOpen }) {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const port = useMemo(() => portfolioMetrics(funnels), [funnels, getLandingPages(), getForms()]);
  const shown = filter === 'all' ? funnels : funnels.filter(f => f.status === filter);

  return (
    <div className="page-in col gap-3 fx-scene">
      <div className="fx-aurora" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }} />
      <PageTitle
        eyebrow="Marketing"
        title="Funnels"
        sub="Chain your landing pages and forms into a step-through flow. Counts come from each linked asset's real tracked views and submissions. Step hand-off is derived from those per-asset counters, not per-visitor session tracking."
        action={
          <>
            <Button variant="ghost" onClick={() => askRook('Which of my funnels has the biggest conversion drop between steps, and what should I change?')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="accent" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New funnel</Button>
          </>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Live funnels" value={`${port.live}`} sub={`${port.count} total`} icon="funnel" accent="var(--accent)" />
        <KpiTile label="Visitors (tracked)" value={num(port.visitors)} sub="entered step 1" icon="users" accent="var(--accent-teal)" />
        <KpiTile label="End-to-end" value={pct(port.conv)} sub={`${num(port.converted)} completed`} icon="trendUp" accent="var(--accent-purple)" />
        <KpiTile label="Leads captured" value={num(port.leads)} sub="final step of each funnel" icon="inbox" accent="var(--ok)" />
      </div>

      <div className="col gap-2">
        <div className="row between wrap" style={{ gap: '.75rem' }}>
          <SectionHeader title="Your funnels" sub="Real step-through conversion on every one." />
          <Segmented value={filter} onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'draft', label: 'Draft' }, { value: 'paused', label: 'Paused' }]} />
        </div>
        {shown.length === 0 ? (
          <Card><EmptyState icon="🧭" title="No funnels here yet" body="Create one, then add landing pages and forms as steps. Conversion fills in from real traffic." action={<Button variant="accent" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New funnel</Button>} /></Card>
        ) : (
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {shown.map(f => <FunnelCard key={f.id} funnel={f} onOpen={() => onOpen(f.id)} />)}
          </div>
        )}
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(id) => { setCreateOpen(false); onOpen(id); }} />
    </div>
  );
}

function KpiTile({ label, value, sub, icon, accent }) {
  return (
    <div className="card card-pad fx-glass fx-lift" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(8px)' }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        <span style={{ color: accent }}><Icon name={icon} size={18} /></span>
      </div>
      <div className="stat-value fx-holo" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', marginTop: 6 }}>{value}</div>
      <div className="t-xs muted" style={{ marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function FunnelCard({ funnel, onOpen }) {
  const toast = useToast();
  const m = useMemo(() => funnelMetrics(funnel), [funnel, getLandingPages(), getForms()]);
  return (
    <div className="card card-hover row-host fx-lift" style={{ padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer' }} onClick={onOpen}>
      <div className="row between" style={{ gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: funnel.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="funnel" size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="fw-7 clip" style={{ fontSize: '1.08rem' }}>{funnel.name}</div>
            <div className="t-xs muted">{funnel.steps.length} step{funnel.steps.length === 1 ? '' : 's'}{m.missing ? `  |  ${m.missing} unlinked` : ''}</div>
          </div>
        </div>
        <Badge tone={STATUS_TONE[funnel.status]} style={{ flex: 'none', textTransform: 'capitalize' }}>{funnel.status}</Badge>
      </div>

      {/* step ribbon */}
      <div className="row" style={{ gap: 4, overflow: 'hidden', flexWrap: 'wrap' }}>
        {funnel.steps.length === 0 && <span className="t-xs muted">No steps yet</span>}
        {funnel.steps.map((s, i) => {
          const meta = stepKindMeta(s.kind);
          return (
            <React.Fragment key={s.id}>
              <span title={meta.label} style={{ width: 26, height: 26, borderRadius: 7, background: meta.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={meta.icon} size={13} />
              </span>
              {i < funnel.steps.length - 1 && <span style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="chevronRight" size={12} /></span>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="row between" style={{ gap: '.5rem', alignItems: 'flex-end' }}>
        <MiniMetric label="Visitors" value={num(m.topEntered)} />
        <MiniMetric label="End-to-end" value={m.hasTraffic ? pct(m.endToEnd) : '0%'} accent={funnel.accent} />
        <MiniMetric label="Leads" value={num(m.totalLeads)} />
      </div>

      <div className="row gap-1 reveal" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <Button variant="quiet" size="sm" onClick={() => { duplicateFunnel(funnel.id); toast('Funnel duplicated'); }}><Icon name="copy" size={14} /> Duplicate</Button>
        <Button variant="quiet" size="sm" onClick={() => { const next = funnel.status === 'live' ? 'paused' : 'live'; updateFunnel(funnel.id, { status: next }); toast(next === 'live' ? 'Funnel is live' : 'Funnel paused'); }}>
          <Icon name={funnel.status === 'live' ? 'moon' : 'rocket'} size={14} /> {funnel.status === 'live' ? 'Pause' : 'Publish'}
        </Button>
        <Button variant="accent" size="sm" onClick={onOpen}>Open <Icon name="arrowRight" size={14} /></Button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <div className="fw-8" style={{ fontSize: '1.25rem', letterSpacing: '-.02em', color: accent || 'var(--ink)' }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '.68rem' }}>{label}</div>
    </div>
  );
}

/* ---------- create ---------- */
function CreateModal({ open, onClose, onCreate }) {
  const toast = useToast();
  const [name, setName] = useState('');
  React.useEffect(() => { if (open) setName(''); }, [open]);
  const submit = () => {
    const r = createFunnel({ name: name.trim() || 'Untitled funnel' });
    toast('Funnel created');
    if (r.funnel) onCreate(r.funnel.id);
  };
  return (
    <Modal open={open} onClose={onClose} title="New funnel" width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}>Create funnel</Button></>}>
      <Field label="Funnel name" hint="Add landing pages and forms as steps next">
        <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Q4 launch funnel" onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
      </Field>
    </Modal>
  );
}

/* ============================================================
   EDITOR
   ============================================================ */
function FunnelEditor({ funnel, onBack }) {
  const toast = useToast();
  const [rename, setRename] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const m = useMemo(() => funnelMetrics(funnel), [funnel, getLandingPages(), getForms()]);

  return (
    <div className="page-in col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <Button variant="ghost" size="sm" onClick={onBack}><Icon name="arrowLeft" size={16} /> Funnels</Button>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: funnel.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="funnel" size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="row gap-1" style={{ minWidth: 0 }}>
              <h3 className="clip fx-holo" style={{ margin: 0 }}>{funnel.name}</h3>
              <button className="btn btn-quiet btn-sm" aria-label="Rename" onClick={() => setRename(true)}><Icon name="edit" size={14} /></button>
            </div>
            <div className="t-xs muted">{funnel.steps.length} steps  |  {m.hasTraffic ? pct(m.endToEnd) : '0%'} end-to-end  |  {num(m.totalLeads)} leads</div>
          </div>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Badge tone={STATUS_TONE[funnel.status]} style={{ textTransform: 'capitalize' }}>{funnel.status}</Badge>
          <Button variant={funnel.status === 'live' ? 'ghost' : 'accent'} size="sm" onClick={() => { const next = funnel.status === 'live' ? 'paused' : 'live'; updateFunnel(funnel.id, { status: next }); toast(next === 'live' ? 'Funnel published' : 'Funnel paused'); }}>
            <Icon name={funnel.status === 'live' ? 'moon' : 'rocket'} size={15} /> {funnel.status === 'live' ? 'Pause' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: '1.15rem', alignItems: 'start' }}>
        {/* the flow */}
        <div className="col gap-1">
          {funnel.steps.length === 0 && (
            <Card><EmptyState icon="➕" title="No steps yet" body="Add a landing page or a form as the first step of this funnel." action={<Button variant="accent" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> Add step</Button>} /></Card>
          )}
          {m.rows.map((r, i) => (
            <React.Fragment key={r.step.id}>
              <StepCard row={r} funnel={funnel} isLast={i === m.rows.length - 1} isFirst={i === 0} />
              {i < m.rows.length - 1 && (
                <div className="row center" style={{ gap: '.5rem', padding: '.15rem 0' }}>
                  <div style={{ width: 2, height: 12, background: 'var(--line-strong)' }} />
                  <span className="t-xs muted" title="Hand-off ratio: the next step's visitors divided by this step's conversions">
                    {m.rows[i + 1].flowRate ? pct(m.rows[i + 1].flowRate) : ''}
                  </span>
                  <div style={{ width: 2, height: 12, background: 'var(--line-strong)' }} />
                </div>
              )}
            </React.Fragment>
          ))}
          {funnel.steps.length > 0 && (
            <button className="btn btn-ghost" style={{ marginTop: '.5rem', borderStyle: 'dashed' }} onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} /> Add a step
            </button>
          )}
        </div>

        {/* summary rail */}
        <div className="col gap-2" style={{ position: 'sticky', top: 12 }}>
          <Card className="col gap-2 fx-glass fx-lift">
            <SectionHeader title="Funnel math" sub="From each asset's tracked counters" />
            <SummaryRow label="Visitors (step 1)" value={num(m.topEntered)} />
            <SummaryRow label="Conversions (all steps)" value={num(m.stepConversions)} />
            <SummaryRow label="End-to-end conversion" value={m.hasTraffic ? pct(m.endToEnd) : '0%'} strong accent={funnel.accent} />
            <SummaryRow label="Leads captured (final step)" value={num(m.totalLeads)} strong accent="var(--ok)" />
            {!m.hasTraffic && <div className="t-xs muted">No tracked traffic yet. Publish the linked pages and drive visitors, and these fill in live.</div>}
            {m.missing > 0 && <div className="t-xs" style={{ color: 'var(--warn)' }}><Icon name="bell" size={12} /> {m.missing} step{m.missing === 1 ? '' : 's'} not linked to an asset.</div>}
          </Card>
          <Card className="col gap-1 fx-neon" style={{ background: 'var(--accent-50)', borderColor: 'var(--accent-300)' }}>
            <div className="row gap-1"><Icon name="sparkles" size={16} style={{ color: 'var(--accent-600)' }} /><span className="fw-7">Rook suggestion</span></div>
            <div className="t-sm" style={{ color: 'var(--ink-2)' }}>{rookHint(m, funnel)}</div>
            <Button variant="accent" size="sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={() => askRook(`For the "${funnel.name}" funnel, draft the copy changes for the step with the worst conversion.`)}>Draft the fix</Button>
          </Card>
        </div>
      </div>

      <RenameModal open={rename} funnel={funnel} onClose={() => setRename(false)} />
      <AddStepModal open={addOpen} funnel={funnel} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function rookHint(m, funnel) {
  if (!m.rows.length) return 'Add a landing page as the first step, then a form to capture the lead.';
  if (m.missing) return 'One or more steps are not linked to an asset yet. Link each step to a landing page or form so tracking can start.';
  if (!m.hasTraffic) return 'No tracked traffic yet. Publish the linked pages and share the link to start collecting real conversion data.';
  const worst = m.rows.filter(r => r.entered > 0).reduce((a, b) => (b.stepRate < a.stepRate ? b : a), m.rows[0]);
  return `"${worst.name}" converts at ${pct(worst.stepRate)}. That is the step to tune first.`;
}

function SummaryRow({ label, value, strong, accent }) {
  return (
    <div className="row between">
      <span className="t-sm muted">{label}</span>
      <span className={strong ? 'fw-8' : 'fw-6'} style={{ fontSize: strong ? '1.1rem' : '1rem', color: accent || 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function StepCard({ row, funnel, isLast, isFirst }) {
  const toast = useToast();
  const [pick, setPick] = useState(false);
  const meta = row.kind;
  const dropoff = Math.max(0, row.entered - row.converted);
  const dropPct = row.entered ? (dropoff / row.entered) * 100 : 0;

  return (
    <div className="card fx-rise fx-lift" style={{ padding: '1rem 1.1rem', display: 'flex', gap: '1rem', alignItems: 'center', border: row.exists ? '1px solid var(--line)' : '1.5px solid var(--warn)' }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: meta.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={meta.icon} size={19} />
      </span>
      <div className="col" style={{ minWidth: 0, flex: 1, gap: 4 }}>
        <div className="row gap-1" style={{ minWidth: 0, flexWrap: 'wrap' }}>
          <span className="fw-7 clip">{row.name}</span>
          <Badge className="t-xs" style={{ flex: 'none' }}>{meta.label}</Badge>
          {!row.exists && <Badge tone="warn" className="t-xs" style={{ flex: 'none' }}>Not linked</Badge>}
          {row.kind.key === 'landing' && row.exists && !row.published && <Badge tone="warn" className="t-xs" style={{ flex: 'none' }}>Draft</Badge>}
        </div>
        <div className="row gap-3 wrap t-xs muted" style={{ gap: '1rem' }}>
          <span><b className="tnum" style={{ color: 'var(--ink)' }}>{num(row.entered)}</b> {row.kind.key === 'form' ? 'views' : 'visitors'}</span>
          <span><b className="tnum" style={{ color: meta.color }}>{num(row.converted)}</b> {row.kind.key === 'form' ? 'completions' : 'leads'}</span>
          {row.entered > 0 && <span><b className="tnum" style={{ color: meta.color }}>{pct(row.stepRate)}</b> convert</span>}
          {dropoff > 0 && <span style={{ color: 'var(--risk)' }}><Icon name="arrowDown" size={11} /> {num(dropoff)} drop ({pct(dropPct)})</span>}
        </div>
        {row.entered > 0 && <ProgressBar value={row.stepRate} color={meta.color} height={6} />}
      </div>
      <div className="col gap-1" style={{ flex: 'none' }}>
        <div className="row gap-1">
          <button className="btn btn-quiet btn-sm" aria-label="Move up" disabled={isFirst} onClick={() => moveStep(funnel.id, row.step.id, -1)}><Icon name="arrowUp" size={14} /></button>
          <button className="btn btn-quiet btn-sm" aria-label="Move down" disabled={isLast} onClick={() => moveStep(funnel.id, row.step.id, 1)}><Icon name="arrowDown" size={14} /></button>
        </div>
        <div className="row gap-1">
          <button className="btn btn-quiet btn-sm" aria-label="Change asset" title="Change linked asset" onClick={() => setPick(true)}><Icon name="swap" size={14} /></button>
          <Link className="btn btn-quiet btn-sm" to={row.editTo || meta.route} aria-label="Open editor" title={`Open in ${meta.label} editor`}><Icon name="edit" size={14} /></Link>
          <button className="btn btn-quiet btn-sm" aria-label="Remove step" onClick={() => { removeStep(funnel.id, row.step.id); toast('Step removed'); }}><Icon name="trash" size={14} /></button>
        </div>
      </div>
      <LinkAssetModal open={pick} funnel={funnel} step={row.step} onClose={() => setPick(false)} />
    </div>
  );
}

function RenameModal({ open, funnel, onClose }) {
  const [name, setName] = useState(funnel.name);
  React.useEffect(() => { setName(funnel.name); }, [funnel.name, open]);
  return (
    <Modal open={open} onClose={onClose} title="Rename funnel" width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={() => { updateFunnel(funnel.id, { name: name.trim() || funnel.name }); onClose(); }}>Save</Button></>}>
      <Field label="Funnel name"><Input value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}

/* ---------- add-step picker (choose kind, then asset) ---------- */
function AddStepModal({ open, funnel, onClose }) {
  const toast = useToast();
  const [kind, setKind] = useState('landing');
  const pages = getLandingPages();
  const forms = getForms();
  const options = kind === 'form' ? forms : pages;

  const add = (asset) => {
    const name = kind === 'form' ? asset.name : asset.title;
    addStep(funnel.id, { kind, refId: asset.id, name });
    toast('Step added');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a step" width={560}>
      <div className="col gap-3">
        <Segmented value={kind} onChange={setKind}
          options={STEP_KIND_LIST.map(k => ({ value: k.key, label: k.label }))} />
        {options.length === 0 ? (
          <EmptyState
            title={kind === 'form' ? 'No forms yet' : 'No landing pages yet'}
            body={kind === 'form' ? 'Create a form first, then link it here.' : 'Create a landing page first, then link it here.'}
            action={<Link className="btn btn-accent btn-sm" to={stepKindMeta(kind).route}>Open {stepKindMeta(kind).label}s</Link>}
          />
        ) : (
          <div className="col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {options.map(a => (
              <button key={a.id} className="card card-hover" style={{ padding: '.7rem .85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.7rem', alignItems: 'center' }} onClick={() => add(a)}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: stepKindMeta(kind).color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={stepKindMeta(kind).icon} size={15} /></span>
                <div className="col" style={{ minWidth: 0 }}>
                  <div className="fw-6 clip">{kind === 'form' ? a.name : a.title}</div>
                  <div className="t-xs muted">{kind === 'form' ? (a.status === 'published' ? 'Published form' : 'Draft form') : (a.published ? `/l/${a.slug}` : 'Draft page')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- change a step's linked asset ---------- */
function LinkAssetModal({ open, funnel, step, onClose }) {
  const toast = useToast();
  const pages = getLandingPages();
  const forms = getForms();
  const [kind, setKind] = useState(step.kind);
  React.useEffect(() => { if (open) setKind(step.kind); }, [open, step.kind]);
  const options = kind === 'form' ? forms : pages;

  const relink = (asset) => {
    updateStep(funnel.id, step.id, { kind, refId: asset.id, name: kind === 'form' ? asset.name : asset.title });
    toast('Step relinked');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Link this step to an asset" width={560}>
      <div className="col gap-3">
        <Segmented value={kind} onChange={setKind} options={STEP_KIND_LIST.map(k => ({ value: k.key, label: k.label }))} />
        {options.length === 0 ? (
          <EmptyState title="Nothing to link" body={`Create a ${stepKindMeta(kind).label.toLowerCase()} first.`} action={<Link className="btn btn-accent btn-sm" to={stepKindMeta(kind).route}>Open {stepKindMeta(kind).label}s</Link>} />
        ) : (
          <div className="col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {options.map(a => {
              const on = kind === step.kind && a.id === step.refId;
              return (
                <button key={a.id} className="card" style={{ padding: '.7rem .85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.7rem', alignItems: 'center', border: on ? '2px solid var(--accent)' : '1px solid var(--line)', background: on ? 'var(--accent-50)' : 'var(--paper)' }} onClick={() => relink(a)}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: stepKindMeta(kind).color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={stepKindMeta(kind).icon} size={15} /></span>
                  <div className="col" style={{ minWidth: 0 }}>
                    <div className="fw-6 clip">{kind === 'form' ? a.name : a.title}</div>
                    <div className="t-xs muted">{kind === 'form' ? (a.status === 'published' ? 'Published form' : 'Draft form') : (a.published ? `/l/${a.slug}` : 'Draft page')}</div>
                  </div>
                  {on && <Icon name="check" size={16} style={{ color: 'var(--accent-600)', marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
