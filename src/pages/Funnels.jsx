// Funnels - Rally's visual funnel + website builder. This is the flagship
// GoHighLevel surface Rally was missing: a funnel is an ordered set of steps
// (Opt-in -> Sales -> Order -> Upsell -> Thank you), each a page of stacked
// blocks with a live, per-step conversion rate. Four surfaces over one
// local-first store (src/lib/funnels-data.js): a funnels grid with a template
// gallery, a vertical step-flow editor, a page-block editor preview, and a
// conversion analytics tab (waterfall + traffic sources + A/B split). 100%
// functional with seeded data and zero backend.
import React, { useMemo, useState } from 'react';
import {
  useFunnels, getFunnels, getFunnel, funnelMetrics, portfolioMetrics,
  TEMPLATES, templateById, STEP_TYPES, STEP_TYPE_LIST, stepMeta,
  BLOCK_TYPES, blockMeta, TRAFFIC_SOURCES,
  createFunnel, updateFunnel, deleteFunnel, duplicateFunnel,
  addStep, removeStep, moveStep, updateStep,
  updateBlock, addBlock, removeBlock, moveBlock, promoteVariant,
} from '../lib/funnels-data.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select,
  Textarea, Modal, EmptyState, Tabs, Segmented, ProgressBar, Sparkline,
  GradientText, useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
const pct = (n) => `${(n || 0).toFixed(n >= 10 || n === 0 ? 0 : 1)}%`;
const num = (n) => Math.round(n || 0).toLocaleString();

const STATUS_TONE = { live: 'ok', draft: 'default', paused: 'warn' };

/* ---------- small step glyph ---------- */
function StepGlyph({ type, size = 34 }) {
  const m = stepMeta(type);
  return (
    <span style={{ width: size, height: size, borderRadius: 9, background: m.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--shadow-sm)' }}>
      <Icon name={m.icon} size={size * 0.5} />
    </span>
  );
}

/* ============================================================
   ROOT - switches between the grid and the editor
   ============================================================ */
export default function Funnels() {
  const state = useFunnels();
  const [editingId, setEditingId] = useState(null);
  const editing = editingId ? state.funnels.find(f => f.id === editingId) : null;

  if (editing) {
    return <FunnelEditor funnel={editing} onBack={() => setEditingId(null)} />;
  }
  return <FunnelsGrid funnels={state.funnels} onOpen={setEditingId} />;
}

/* ============================================================
   SURFACE 1 - FUNNELS GRID + TEMPLATE GALLERY
   ============================================================ */
function FunnelsGrid({ funnels, onOpen }) {
  const toast = useToast();
  const [tmplOpen, setTmplOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const port = useMemo(() => portfolioMetrics(funnels), [funnels]);

  const shown = filter === 'all' ? funnels : funnels.filter(f => f.status === filter);

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Marketing"
        title="Funnels"
        sub="Build the pages that turn traffic into revenue. Every step, every conversion, one canvas. The builder marketers pay GoHighLevel for, native to Rally."
        action={
          <>
            <Button variant="ghost" onClick={() => askRook('Which of my funnels has the biggest conversion leak, and what one change would recover the most revenue?')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="accent" onClick={() => setTmplOpen(true)}>
              <Icon name="plus" size={16} /> New funnel
            </Button>
          </>
        }
      />

      {/* portfolio KPIs */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Live funnels" value={`${port.live}`} sub={`${port.count} total`} icon="funnel" accent="var(--accent)" />
        <KpiTile label="Visitors (30d)" value={num(port.visitors)} sub="across all funnels" icon="users" accent="var(--accent-teal)" />
        <KpiTile label="Blended conversion" value={pct(port.conv)} sub={`${num(port.converted)} completed`} icon="trendUp" accent="var(--accent-purple)" />
        <KpiTile label="Attributed revenue" value={moneyK(port.revenue)} sub="from funnel steps" icon="dollar" accent="var(--ok)" />
      </div>

      {/* template gallery */}
      <Card pad={false}>
        <div className="row between wrap" style={{ padding: '1.15rem 1.35rem', gap: '.75rem' }}>
          <SectionHeader title="Start from a proven template" sub="Five funnels that print. Each lands editable with real pages and seeded conversion." />
          <Badge tone="accent"><Icon name="layers" size={13} /> {TEMPLATES.length} templates</Badge>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '.9rem', padding: '0 1.35rem 1.35rem' }}>
          {TEMPLATES.map(t => (
            <TemplateCard key={t.id} tmpl={t} onUse={() => {
              const r = createFunnel({ name: t.name, templateId: t.id, status: 'draft', visitors: 0 });
              toast('Funnel created from ' + t.name);
              if (r.funnel) onOpen(r.funnel.id);
            }} />
          ))}
        </div>
      </Card>

      {/* your funnels */}
      <div className="col gap-2">
        <div className="row between wrap" style={{ gap: '.75rem' }}>
          <SectionHeader title="Your funnels" sub="Live conversion and revenue on every one." />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'draft', label: 'Draft' }, { value: 'paused', label: 'Paused' }]}
          />
        </div>
        {shown.length === 0 ? (
          <Card><EmptyState icon="🧭" title="No funnels here yet" body="Spin one up from a template above and it lands fully editable." action={<Button variant="accent" onClick={() => setTmplOpen(true)}><Icon name="plus" size={16} /> New funnel</Button>} /></Card>
        ) : (
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {shown.map(f => <FunnelCard key={f.id} funnel={f} onOpen={() => onOpen(f.id)} />)}
          </div>
        )}
      </div>

      <TemplateModal open={tmplOpen} onClose={() => setTmplOpen(false)} onCreate={(id) => { setTmplOpen(false); onOpen(id); }} />
    </div>
  );
}

function KpiTile({ label, value, sub, icon, accent }) {
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: accent, opacity: .08, filter: 'blur(8px)' }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        <span style={{ color: accent }}><Icon name={icon} size={18} /></span>
      </div>
      <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', marginTop: 6 }}>{value}</div>
      <div className="t-xs muted" style={{ marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function TemplateCard({ tmpl, onUse }) {
  return (
    <div className="card card-hover" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.6rem', cursor: 'pointer' }} onClick={onUse}>
      <span style={{ width: 42, height: 42, borderRadius: 11, background: tmpl.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={tmpl.icon} size={21} />
      </span>
      <div className="fw-7" style={{ fontSize: '1rem' }}>{tmpl.name}</div>
      <div className="t-xs muted" style={{ flex: 1, lineHeight: 1.45 }}>{tmpl.tagline}</div>
      <div className="row between" style={{ marginTop: 2 }}>
        <Badge className="t-xs">{tmpl.steps.length} steps</Badge>
        <span className="t-xs fw-6" style={{ color: tmpl.accent }}>Use <Icon name="arrowRight" size={12} /></span>
      </div>
    </div>
  );
}

function FunnelCard({ funnel, onOpen }) {
  const toast = useToast();
  const m = useMemo(() => funnelMetrics(funnel), [funnel]);
  const tmpl = templateById(funnel.templateId);
  return (
    <div className="card card-hover row-host" style={{ padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer' }} onClick={onOpen}>
      <div className="row between" style={{ gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: funnel.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name={tmpl?.icon || 'funnel'} size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="fw-7 clip" style={{ fontSize: '1.08rem' }}>{funnel.name}</div>
            <div className="t-xs muted">{funnel.steps.length} steps  |  {tmpl?.name || 'Custom'}</div>
          </div>
        </div>
        <Badge tone={STATUS_TONE[funnel.status]} style={{ flex: 'none', textTransform: 'capitalize' }}>{funnel.status}</Badge>
      </div>

      {/* step ribbon */}
      <div className="row" style={{ gap: 4, overflow: 'hidden' }}>
        {funnel.steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <span title={stepMeta(s.type).label} style={{ width: 26, height: 26, borderRadius: 7, background: stepMeta(s.type).color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name={stepMeta(s.type).icon} size={13} />
            </span>
            {i < funnel.steps.length - 1 && <span style={{ color: 'var(--n-400)', flex: 'none' }}><Icon name="chevronRight" size={12} /></span>}
          </React.Fragment>
        ))}
      </div>

      {/* metrics */}
      <div className="row between" style={{ gap: '.5rem', alignItems: 'flex-end' }}>
        <MiniMetric label="Visitors" value={num(m.visitorsIn)} />
        <MiniMetric label="Conversion" value={pct(m.endToEnd)} accent={funnel.accent} />
        <MiniMetric label="Revenue" value={moneyK(m.revenue)} />
        <div style={{ flex: 1 }} />
        <Sparkline data={funnel.trend} w={110} h={38} color={funnel.accent} />
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

/* ---------- template picker modal ---------- */
function TemplateModal({ open, onClose, onCreate }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('product-launch');
  const [status, setStatus] = useState('draft');
  const tmpl = templateById(templateId);

  const submit = () => {
    const r = createFunnel({ name: name.trim() || tmpl.name, templateId, status, visitors: 0 });
    toast('Funnel created');
    setName('');
    if (r.funnel) onCreate(r.funnel.id);
  };

  return (
    <Modal open={open} onClose={onClose} title="New funnel" width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}>Create funnel</Button></>}>
      <div className="col gap-3">
        <Field label="Funnel name"><Input value={name} onChange={e => setName(e.target.value)} placeholder={tmpl.name} /></Field>
        <div>
          <div className="stat-label" style={{ marginBottom: '.6rem' }}>Choose a template</div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
            {TEMPLATES.map(t => {
              const on = t.id === templateId;
              return (
                <button key={t.id} onClick={() => setTemplateId(t.id)} className="card" style={{ textAlign: 'left', padding: '.8rem', border: on ? '2px solid var(--accent)' : '1px solid var(--line)', cursor: 'pointer', background: on ? 'var(--accent-50)' : 'var(--paper)' }}>
                  <div className="row gap-2">
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: t.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={t.icon} size={16} /></span>
                    <div className="col" style={{ minWidth: 0 }}>
                      <div className="fw-7 clip">{t.name}</div>
                      <div className="t-xs muted">{t.steps.length} steps  |  {t.category}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   SURFACE 2/3/4 - FUNNEL EDITOR (flow + blocks + analytics)
   ============================================================ */
function FunnelEditor({ funnel, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('flow');
  const [selectedStepId, setSelectedStepId] = useState(funnel.steps[0]?.id || null);
  const [rename, setRename] = useState(false);
  const m = useMemo(() => funnelMetrics(funnel), [funnel]);

  // Keep a valid selection if steps change.
  const selectedStep = funnel.steps.find(s => s.id === selectedStepId) || funnel.steps[0];

  return (
    <div className="page-in col gap-3">
      {/* editor header */}
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <Button variant="ghost" size="sm" onClick={onBack}><Icon name="arrowLeft" size={16} /> Funnels</Button>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: funnel.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name={templateById(funnel.templateId)?.icon || 'funnel'} size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <div className="row gap-1" style={{ minWidth: 0 }}>
              <h3 className="clip" style={{ margin: 0 }}>{funnel.name}</h3>
              <button className="btn btn-quiet btn-sm" aria-label="Rename" onClick={() => setRename(true)}><Icon name="edit" size={14} /></button>
            </div>
            <div className="t-xs muted">{funnel.steps.length} steps  |  {pct(m.endToEnd)} end-to-end  |  {moneyK(m.revenue)} revenue</div>
          </div>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Badge tone={STATUS_TONE[funnel.status]} style={{ textTransform: 'capitalize' }}>{funnel.status}</Badge>
          <Button variant="ghost" size="sm" onClick={() => askRook(`Analyze the "${funnel.name}" funnel. Where is the biggest drop-off and what should I change on that step?`)}><Icon name="sparkles" size={15} /> Ask Rook</Button>
          <Button variant={funnel.status === 'live' ? 'ghost' : 'accent'} size="sm" onClick={() => { const next = funnel.status === 'live' ? 'paused' : 'live'; updateFunnel(funnel.id, { status: next }); toast(next === 'live' ? 'Funnel published' : 'Funnel paused'); }}>
            <Icon name={funnel.status === 'live' ? 'moon' : 'rocket'} size={15} /> {funnel.status === 'live' ? 'Pause' : 'Publish'}
          </Button>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'flow', label: 'Step flow' },
          { key: 'blocks', label: 'Page editor' },
          { key: 'analytics', label: 'Analytics' },
        ]}
      />

      {tab === 'flow' && <StepFlow funnel={funnel} metrics={m} selectedStepId={selectedStep?.id} onSelect={(id) => { setSelectedStepId(id); }} onEditPage={(id) => { setSelectedStepId(id); setTab('blocks'); }} />}
      {tab === 'blocks' && <PageEditor funnel={funnel} step={selectedStep} onPickStep={setSelectedStepId} />}
      {tab === 'analytics' && <Analytics funnel={funnel} metrics={m} />}

      <RenameModal open={rename} funnel={funnel} onClose={() => setRename(false)} />
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

/* ============================================================
   SURFACE 2 - STEP FLOW (vertical, add / reorder / branch)
   ============================================================ */
function StepFlow({ funnel, metrics, selectedStepId, onSelect, onEditPage }) {
  const toast = useToast();
  const [addAfter, setAddAfter] = useState(null); // stepId or 'end'
  const [tuning, setTuning] = useState(null);      // step being tuned

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: '1.15rem', alignItems: 'start' }}>
      {/* the flow */}
      <div className="col gap-1">
        {metrics.rows.map((r, i) => {
          const s = r.step;
          const meta = stepMeta(s.type);
          const isLast = i === metrics.rows.length - 1;
          const on = s.id === selectedStepId;
          const dropPct = r.visitorsIn ? (r.dropoff / r.visitorsIn) * 100 : 0;
          return (
            <React.Fragment key={s.id}>
              <div className="card" onClick={() => onSelect(s.id)}
                style={{ padding: '1rem 1.1rem', cursor: 'pointer', border: on ? '2px solid var(--accent)' : '1px solid var(--line)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* thumbnail placeholder */}
                <div style={{ width: 78, height: 58, borderRadius: 8, flex: 'none', background: 'linear-gradient(160deg, var(--n-50), var(--n-100))', border: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 8, left: 8, right: 8, height: 8, borderRadius: 3, background: meta.color, opacity: .9 }} />
                  <div style={{ position: 'absolute', top: 22, left: 8, right: 20, height: 5, borderRadius: 3, background: 'var(--n-200)' }} />
                  <div style={{ position: 'absolute', top: 32, left: 8, right: 30, height: 5, borderRadius: 3, background: 'var(--n-200)' }} />
                  <div style={{ position: 'absolute', bottom: 8, left: 8, width: 28, height: 9, borderRadius: 3, background: meta.color, opacity: .55 }} />
                </div>

                <div className="col" style={{ minWidth: 0, flex: 1, gap: 3 }}>
                  <div className="row gap-1" style={{ minWidth: 0 }}>
                    <StepGlyph type={s.type} size={22} />
                    <span className="fw-7 clip">{s.name}</span>
                    <Badge className="t-xs" style={{ flex: 'none' }}>{meta.label}</Badge>
                    {meta.purchase && s.price > 0 && <Badge tone="ok" className="t-xs" style={{ flex: 'none' }}>{money(s.price)}</Badge>}
                  </div>
                  <div className="row gap-3 wrap t-xs muted" style={{ gap: '1rem' }}>
                    <span><b className="tnum" style={{ color: 'var(--ink)' }}>{num(r.visitorsIn)}</b> visitors in</span>
                    {!isLast && <span><b className="tnum" style={{ color: meta.color }}>{pct(r.rate)}</b> convert</span>}
                    {!isLast && r.dropoff > 0 && <span style={{ color: 'var(--risk)' }}><Icon name="arrowDown" size={11} /> {num(r.dropoff)} drop-off ({pct(dropPct)})</span>}
                    {r.purchase && r.revenue > 0 && <span style={{ color: 'var(--ok)' }}>{money(r.revenue)} earned</span>}
                  </div>
                  {!isLast && <ProgressBar value={r.rate} color={meta.color} height={6} />}
                </div>

                <div className="col gap-1" style={{ flex: 'none' }} onClick={(e) => e.stopPropagation()}>
                  <div className="row gap-1">
                    <button className="btn btn-quiet btn-sm" aria-label="Move up" disabled={i === 0} onClick={() => moveStep(funnel.id, s.id, -1)}><Icon name="arrowUp" size={14} /></button>
                    <button className="btn btn-quiet btn-sm" aria-label="Move down" disabled={isLast} onClick={() => moveStep(funnel.id, s.id, 1)}><Icon name="arrowDown" size={14} /></button>
                  </div>
                  <div className="row gap-1">
                    <button className="btn btn-quiet btn-sm" aria-label="Tune step" onClick={() => setTuning(s)}><Icon name="sliders" size={14} /></button>
                    <button className="btn btn-quiet btn-sm" aria-label="Edit page" onClick={() => onEditPage(s.id)}><Icon name="edit" size={14} /></button>
                    <button className="btn btn-quiet btn-sm" aria-label="Delete step" onClick={() => { const r2 = removeStep(funnel.id, s.id); if (r2.error) toast(r2.message, 'warn'); else toast('Step removed'); }}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>

              {/* connector + inline add */}
              {!isLast && (
                <div className="row center" style={{ gap: '.5rem', padding: '.15rem 0' }}>
                  <div style={{ width: 2, height: 14, background: 'var(--line-strong)' }} />
                  <button className="btn btn-ghost btn-sm" style={{ padding: '.3rem .7rem' }} onClick={() => setAddAfter(s.id)}><Icon name="plus" size={13} /> Add step</button>
                  <div style={{ width: 2, height: 14, background: 'var(--line-strong)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        <button className="btn btn-ghost" style={{ marginTop: '.5rem', borderStyle: 'dashed' }} onClick={() => setAddAfter('end')}>
          <Icon name="plus" size={16} /> Add a step to the end
        </button>
      </div>

      {/* flow summary rail */}
      <div className="col gap-2" style={{ position: 'sticky', top: 12 }}>
        <Card className="col gap-2">
          <SectionHeader title="Funnel math" />
          <SummaryRow label="Top-of-funnel visitors" value={num(metrics.visitorsIn)} />
          <SummaryRow label="Reached the end" value={num(metrics.converted)} />
          <SummaryRow label="End-to-end conversion" value={pct(metrics.endToEnd)} strong accent={funnel.accent} />
          <SummaryRow label="Orders" value={num(metrics.orders)} />
          <SummaryRow label="Revenue" value={money(metrics.revenue)} strong accent="var(--ok)" />
          <SummaryRow label="Revenue / visitor" value={metrics.rpv >= 100 ? money(metrics.rpv) : `$${metrics.rpv.toFixed(2)}`} />
          <div style={{ height: 1, background: 'var(--line)', margin: '.3rem 0' }} />
          <div className="col gap-1">
            <div className="stat-label">Traffic entry</div>
            <Field label="Monthly visitors">
              <Input type="number" min="0" value={funnel.visitors} onChange={(e) => updateFunnel(funnel.id, { visitors: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
            <div className="t-xs muted">Drives every downstream number in real time.</div>
          </div>
        </Card>
        <Card className="col gap-1" style={{ background: 'var(--accent-50)', borderColor: 'var(--accent-300)' }}>
          <div className="row gap-1"><Icon name="sparkles" size={16} style={{ color: 'var(--accent-600)' }} /><span className="fw-7">Rook suggestion</span></div>
          <div className="t-sm" style={{ color: 'var(--ink-2)' }}>{rookHint(metrics)}</div>
          <Button variant="accent" size="sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} onClick={() => askRook(`For the "${funnel.name}" funnel, draft the exact copy changes for the step with the worst conversion.`)}>Draft the fix</Button>
        </Card>
      </div>

      <AddStepModal open={!!addAfter} funnel={funnel} afterStepId={addAfter} onClose={() => setAddAfter(null)} />
      <TuneStepModal step={tuning} funnel={funnel} onClose={() => setTuning(null)} />
    </div>
  );
}

function rookHint(metrics) {
  // Find the open step with the worst conversion rate.
  const openRows = metrics.rows.filter(r => r.index < metrics.rows.length - 1);
  if (!openRows.length) return 'Add an order step to start attributing revenue on this funnel.';
  const worst = openRows.reduce((a, b) => (b.rate < a.rate ? b : a));
  return `The "${worst.step.name}" step is your biggest leak at ${pct(worst.rate)} conversion. Recovering 5 points there is worth roughly ${moneyK(metrics.rpv * worst.visitorsIn * 0.05)} a month.`;
}

function SummaryRow({ label, value, strong, accent }) {
  return (
    <div className="row between">
      <span className="t-sm muted">{label}</span>
      <span className={strong ? 'fw-8' : 'fw-6'} style={{ fontSize: strong ? '1.1rem' : '1rem', color: accent || 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function AddStepModal({ open, funnel, afterStepId, onClose }) {
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Add a step" width={560}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        {STEP_TYPE_LIST.map(t => (
          <button key={t.key} className="card card-hover" style={{ padding: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.7rem', alignItems: 'center' }}
            onClick={() => { addStep(funnel.id, t.key, afterStepId === 'end' ? null : afterStepId); toast(t.label + ' step added'); onClose(); }}>
            <StepGlyph type={t.key} size={34} />
            <div className="col" style={{ minWidth: 0 }}>
              <div className="fw-7 clip">{t.label}</div>
              <div className="t-xs muted clip">{t.blurb}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function TuneStepModal({ step, funnel, onClose }) {
  const [name, setName] = useState('');
  const [conv, setConv] = useState(30);
  const [price, setPrice] = useState(0);
  React.useEffect(() => { if (step) { setName(step.name); setConv(step.convRate); setPrice(step.price || 0); } }, [step]);
  if (!step) return null;
  const meta = stepMeta(step.type);
  return (
    <Modal open={!!step} onClose={onClose} title={`Tune: ${step.name}`} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={() => { updateStep(funnel.id, step.id, { name: name.trim() || step.name, convRate: conv, price }); onClose(); }}>Save</Button></>}>
      <div className="col gap-3">
        <Field label="Step name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={`Conversion to next step (${pct(Number(conv))})`} hint="Share of visitors who advance to the following step.">
          <input type="range" min="1" max="100" value={conv} onChange={e => setConv(Number(e.target.value))} style={{ width: '100%', accentColor: meta.color }} />
        </Field>
        {meta.purchase && (
          <Field label="Price" hint="Revenue attributed for each visitor who advances through this step.">
            <Input type="number" min="0" value={price} onChange={e => setPrice(Number(e.target.value) || 0)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   SURFACE 3 - PAGE-BLOCK EDITOR PREVIEW
   ============================================================ */
function PageEditor({ funnel, step, onPickStep }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // block being edited
  const [adding, setAdding] = useState(false);
  if (!step) return <Card><EmptyState title="No step selected" body="Pick a step to edit its page." /></Card>;
  const blocks = step.blocks || [];

  return (
    <div className="grid" style={{ gridTemplateColumns: '220px 1fr', gap: '1.15rem', alignItems: 'start' }}>
      {/* step switcher */}
      <div className="col gap-1" style={{ position: 'sticky', top: 12 }}>
        <div className="stat-label" style={{ marginBottom: 4 }}>Pages</div>
        {funnel.steps.map(s => {
          const on = s.id === step.id;
          const meta = stepMeta(s.type);
          return (
            <button key={s.id} className="card" onClick={() => onPickStep(s.id)}
              style={{ padding: '.6rem .7rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.55rem', alignItems: 'center', border: on ? '2px solid var(--accent)' : '1px solid var(--line)', background: on ? 'var(--accent-50)' : 'var(--paper)' }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: meta.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={meta.icon} size={12} /></span>
              <span className="clip fw-6 t-sm">{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* device-framed page preview */}
      <div className="col gap-2">
        <div className="row between wrap" style={{ gap: '.5rem' }}>
          <SectionHeader title={`${step.name} - page blocks`} sub="Click any block to edit its copy. Reorder or remove to shape the page." />
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> Add block</Button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 640, margin: '0 auto', width: '100%' }}>
          {/* browser chrome */}
          <div className="row between" style={{ padding: '.55rem .8rem', borderBottom: '1px solid var(--line)', background: 'var(--n-25)' }}>
            <div className="row gap-1">
              <span className="dot" style={{ background: 'var(--risk)', width: 10, height: 10 }} />
              <span className="dot" style={{ background: 'var(--warn)', width: 10, height: 10 }} />
              <span className="dot" style={{ background: 'var(--ok)', width: 10, height: 10 }} />
            </div>
            <div className="t-xs mono muted clip" style={{ maxWidth: 260 }}>rally.page/{funnel.id.replace('fnl_', 'f')}/{step.type}</div>
            <span style={{ width: 40 }} />
          </div>

          <div className="col" style={{ background: 'var(--paper)' }}>
            {blocks.length === 0 && <div style={{ padding: '2.5rem' }}><EmptyState title="Empty page" body="Add a block to start building this step." action={<Button variant="accent" size="sm" onClick={() => setAdding(true)}>Add block</Button>} /></div>}
            {blocks.map((b, i) => (
              <div key={b.id} className="row-host" style={{ position: 'relative' }}>
                <BlockPreview block={b} accent={funnel.accent} />
                {/* hover controls */}
                <div className="row gap-1 reveal" style={{ position: 'absolute', top: 8, right: 8, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: 3, boxShadow: 'var(--shadow-sm)' }}>
                  <button className="btn btn-quiet btn-sm" aria-label="Move up" disabled={i === 0} onClick={() => moveBlock(funnel.id, step.id, b.id, -1)}><Icon name="arrowUp" size={13} /></button>
                  <button className="btn btn-quiet btn-sm" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => moveBlock(funnel.id, step.id, b.id, 1)}><Icon name="arrowDown" size={13} /></button>
                  <button className="btn btn-quiet btn-sm" aria-label="Edit block" onClick={() => setEditing(b)}><Icon name="edit" size={13} /></button>
                  <button className="btn btn-quiet btn-sm" aria-label="Remove block" onClick={() => { removeBlock(funnel.id, step.id, b.id); toast('Block removed'); }}><Icon name="trash" size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BlockEditModal block={editing} funnel={funnel} step={step} onClose={() => setEditing(null)} />
      <AddBlockModal open={adding} funnel={funnel} step={step} onClose={() => setAdding(false)} />
    </div>
  );
}

function BlockPreview({ block, accent }) {
  const b = block;
  const pad = { padding: '1.6rem 1.8rem' };
  switch (b.type) {
    case 'hero':
      return (
        <div style={{ ...pad, textAlign: 'center', background: 'linear-gradient(180deg, var(--n-25), var(--paper))', borderBottom: '1px solid var(--line)' }}>
          {b.eyebrow && <div className="eyebrow" style={{ color: accent }}>{b.eyebrow}</div>}
          <div className="fw-8" style={{ fontSize: '1.7rem', letterSpacing: '-.02em', lineHeight: 1.15, margin: '.4rem 0' }}>{b.headline || 'Headline'}</div>
          {b.subhead && <div className="muted" style={{ fontSize: '1.02rem', maxWidth: 440, margin: '0 auto' }}>{b.subhead}</div>}
        </div>
      );
    case 'video':
      return (
        <div style={{ ...pad }}>
          {b.headline && <div className="fw-7" style={{ fontSize: '1.15rem', marginBottom: '.6rem', textAlign: 'center' }}>{b.headline}</div>}
          <div style={{ aspectRatio: '16/9', borderRadius: 10, background: 'linear-gradient(135deg, var(--n-100), var(--n-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
            <span style={{ width: 54, height: 54, borderRadius: '50%', background: accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}><Icon name="arrowRight" size={24} /></span>
          </div>
          {b.caption && <div className="t-sm muted" style={{ textAlign: 'center', marginTop: '.6rem' }}>{b.caption}</div>}
        </div>
      );
    case 'form':
      return (
        <div style={{ ...pad, background: 'var(--n-25)' }}>
          {b.headline && <div className="fw-7" style={{ fontSize: '1.1rem', marginBottom: '.7rem', textAlign: 'center' }}>{b.headline}</div>}
          <div className="col gap-1" style={{ maxWidth: 360, margin: '0 auto' }}>
            <div style={{ height: 42, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--paper)', display: 'flex', alignItems: 'center', padding: '0 .85rem', color: 'var(--n-400)' }}>you@company.com</div>
            <div style={{ height: 44, borderRadius: 8, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{b.button || 'Submit'}</div>
          </div>
        </div>
      );
    case 'bullets': {
      const items = (b.items || '').split('|').map(s => s.trim()).filter(Boolean);
      return (
        <div style={{ ...pad }}>
          {b.headline && <div className="fw-7" style={{ fontSize: '1.15rem', marginBottom: '.7rem' }}>{b.headline}</div>}
          <div className="col gap-1">
            {(items.length ? items : ['Benefit one', 'Benefit two']).map((it, i) => (
              <div key={i} className="row gap-1"><span style={{ color: accent, flex: 'none' }}><Icon name="check" size={17} /></span><span>{it}</span></div>
            ))}
          </div>
        </div>
      );
    }
    case 'pricing':
      return (
        <div style={{ ...pad, textAlign: 'center', background: 'var(--n-25)' }}>
          {b.headline && <div className="stat-label" style={{ marginBottom: 4 }}>{b.headline}</div>}
          <div className="fw-8" style={{ fontSize: '2.4rem', letterSpacing: '-.03em', color: accent }}>{b.price || '$0'}</div>
          {b.note && <div className="t-sm muted" style={{ marginTop: 2 }}>{b.note}</div>}
        </div>
      );
    case 'testimonial':
      return (
        <div style={{ ...pad, background: 'var(--n-25)' }}>
          <div className="row gap-1" style={{ color: '#f5a623', marginBottom: '.5rem', justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" /></svg>)}
          </div>
          <div style={{ fontSize: '1.12rem', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>&ldquo;{b.quote || 'A glowing quote from a happy customer.'}&rdquo;</div>
          <div className="t-sm muted fw-6" style={{ textAlign: 'center', marginTop: '.6rem' }}>{b.author || 'Customer name, Title'}</div>
        </div>
      );
    case 'cta':
      return (
        <div style={{ ...pad, textAlign: 'center' }}>
          {b.headline && <div className="fw-7" style={{ fontSize: '1.3rem', marginBottom: '.7rem' }}>{b.headline}</div>}
          <div style={{ display: 'inline-flex', height: 48, borderRadius: 10, background: accent, color: '#fff', alignItems: 'center', padding: '0 1.6rem', fontWeight: 700, fontSize: '1.05rem', boxShadow: 'var(--accent-glow)' }}>{b.button || 'Get started'}</div>
        </div>
      );
    case 'text':
    default:
      return (
        <div style={{ ...pad }}>
          {b.headline && <div className="fw-7" style={{ fontSize: '1.15rem', marginBottom: '.4rem' }}>{b.headline}</div>}
          <div className="muted" style={{ lineHeight: 1.6 }}>{b.body || 'Body copy for this section.'}</div>
        </div>
      );
  }
}

function BlockEditModal({ block, funnel, step, onClose }) {
  const [vals, setVals] = useState({});
  React.useEffect(() => { if (block) setVals({ ...block }); }, [block]);
  if (!block) return null;
  const meta = blockMeta(block.type);
  const isLong = (f) => f === 'body' || f === 'subhead' || f === 'items' || f === 'quote' || f === 'caption';
  const labelFor = (f) => ({ eyebrow: 'Eyebrow', headline: 'Headline', subhead: 'Subheadline', button: 'Button label', items: 'Items (separate with | )', price: 'Price', note: 'Note', quote: 'Quote', author: 'Author', body: 'Body', caption: 'Caption' }[f] || f);
  return (
    <Modal open={!!block} onClose={onClose} title={`Edit ${meta.label} block`} width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={() => { const patch = {}; for (const f of meta.fields) patch[f] = vals[f] || ''; updateBlock(funnel.id, step.id, block.id, patch); onClose(); }}>Save block</Button></>}>
      <div className="col gap-3">
        {meta.fields.map(f => (
          <Field key={f} label={labelFor(f)}>
            {isLong(f)
              ? <Textarea rows={f === 'items' ? 4 : 3} value={vals[f] || ''} onChange={e => setVals(v => ({ ...v, [f]: e.target.value }))} />
              : <Input value={vals[f] || ''} onChange={e => setVals(v => ({ ...v, [f]: e.target.value }))} />}
          </Field>
        ))}
      </div>
    </Modal>
  );
}

function AddBlockModal({ open, funnel, step, onClose }) {
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Add a block" width={520}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        {Object.values(BLOCK_TYPES).map(t => (
          <button key={t.key} className="card card-hover" style={{ padding: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.7rem', alignItems: 'center' }}
            onClick={() => { addBlock(funnel.id, step.id, t.key); toast(t.label + ' block added'); onClose(); }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={t.icon} size={17} /></span>
            <div className="fw-7">{t.label}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ============================================================
   SURFACE 4 - ANALYTICS (waterfall + sources + A/B)
   ============================================================ */
function Analytics({ funnel, metrics }) {
  const toast = useToast();
  const maxV = Math.max(1, ...metrics.rows.map(r => r.visitorsIn));
  const totalSrc = funnel.sources.reduce((a, s) => a + s.visitors, 0) || 1;

  return (
    <div className="col gap-3">
      {/* headline KPIs */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiTile label="Visitors" value={num(metrics.visitorsIn)} sub="entered the funnel" icon="users" accent="var(--accent)" />
        <KpiTile label="Conversion" value={pct(metrics.endToEnd)} sub={`${num(metrics.converted)} reached the end`} icon="trendUp" accent={funnel.accent} />
        <KpiTile label="Revenue" value={money(metrics.revenue)} sub={`${num(metrics.orders)} orders`} icon="dollar" accent="var(--ok)" />
        <KpiTile label="Avg order value" value={metrics.aov ? money(metrics.aov) : '$0'} sub={`${metrics.rpv >= 1 ? money(metrics.rpv) : '$' + metrics.rpv.toFixed(2)} / visitor`} icon="receipt" accent="var(--accent-purple)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: '1.15rem', alignItems: 'start' }}>
        {/* conversion waterfall */}
        <Card className="col gap-2">
          <SectionHeader title="Conversion waterfall" sub="How visitors flow and fall away, step by step." />
          <Waterfall rows={metrics.rows} maxV={maxV} accent={funnel.accent} />
        </Card>

        {/* traffic sources */}
        <Card className="col gap-2">
          <SectionHeader title="Traffic sources" />
          <div className="col gap-2">
            {funnel.sources.map(s => {
              const share = (s.visitors / totalSrc) * 100;
              return (
                <div key={s.key} className="col gap-1">
                  <div className="row between">
                    <span className="row gap-1"><span className="dot" style={{ background: s.color, width: 9, height: 9 }} /><span className="fw-6 t-sm">{s.label}</span></span>
                    <span className="t-sm muted tnum">{num(s.visitors)}  |  {pct(share)}</span>
                  </div>
                  <ProgressBar value={share} color={s.color} height={7} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* A/B split test */}
      {funnel.ab ? (
        <Card className="col gap-2">
          <SectionHeader
            title="A/B split test"
            sub={`Running on the "${funnel.ab.stepName}" step. Promote the winner to lock it in.`}
            action={<Badge tone="info"><Icon name="activity" size={13} /> Live test</Badge>}
          />
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {['a', 'b'].map(k => {
              const v = funnel.ab[k];
              const winning = funnel.ab.b.conv > funnel.ab.a.conv ? 'b' : 'a';
              const isWin = k === winning;
              return (
                <div key={k} className="card" style={{ padding: '1.1rem', border: isWin ? '2px solid var(--ok)' : '1px solid var(--line)' }}>
                  <div className="row between">
                    <span className="fw-7">{v.name}</span>
                    {isWin && <Badge tone="ok"><Icon name="check" size={12} /> Leading</Badge>}
                  </div>
                  <div className="stat-value" style={{ fontSize: '2.2rem', margin: '.4rem 0', color: isWin ? 'var(--ok)' : 'var(--ink)' }}>{pct(v.conv)}</div>
                  <div className="t-sm muted">{num(v.visitors)} visitors in this arm</div>
                  <ProgressBar value={v.conv} color={isWin ? 'var(--ok)' : 'var(--n-400)'} height={7} />
                  <Button variant={isWin ? 'accent' : 'ghost'} size="sm" style={{ marginTop: '.8rem', width: '100%' }}
                    onClick={() => { const r = promoteVariant(funnel.id, k); if (!r.error) toast(`${v.name} promoted to ${pct(r.conv)}`); }}>
                    Promote {v.name}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="t-xs muted">Winner lifts this step by {pct(Math.abs(funnel.ab.b.conv - funnel.ab.a.conv))} versus the control.</div>
        </Card>
      ) : (
        <Card>
          <EmptyState icon="🧪" title="No test running on this funnel" body="The winning variant was promoted into the live step. Rook can spin up a fresh test on your worst-performing page." action={<Button variant="ghost" onClick={() => askRook(`Set up an A/B test on the weakest step of the "${funnel.name}" funnel and suggest the variant to try.`)}><Icon name="sparkles" size={15} /> Ask Rook to test</Button>} />
        </Card>
      )}
    </div>
  );
}

function Waterfall({ rows, maxV, accent }) {
  const W = 640, H = 260, padL = 8, padR = 8, padT = 10, padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = rows.length;
  const slot = innerW / n;
  const bw = Math.min(74, slot * 0.62);
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 460, display: 'block' }} role="img" aria-label="Conversion waterfall">
        <defs>
          <linearGradient id="wf-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {rows.map((r, i) => {
          const h = Math.max(3, (r.visitorsIn / maxV) * innerH);
          const x = padL + i * slot + (slot - bw) / 2;
          const y = padT + (innerH - h);
          const meta = stepMeta(r.step.type);
          // connector ribbon to the next bar (drop-off shading)
          let ribbon = null;
          if (i < rows.length - 1) {
            const nh = Math.max(3, (rows[i + 1].visitorsIn / maxV) * innerH);
            const nx = padL + (i + 1) * slot + (slot - bw) / 2;
            const ny = padT + (innerH - nh);
            ribbon = (
              <path d={`M${x + bw},${y} L${nx},${ny} L${nx},${padT + innerH} L${x + bw},${padT + innerH} Z`} fill={accent} opacity="0.08" />
            );
          }
          return (
            <g key={r.step.id}>
              {ribbon}
              <rect x={x} y={y} width={bw} height={h} rx={6} fill="url(#wf-bar)" />
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{num(r.visitorsIn)}</text>
              <text x={x + bw / 2} y={padT + innerH + 15} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--n-600)">{meta.label}</text>
              {i < rows.length - 1 && (
                <text x={x + bw / 2} y={padT + innerH + 28} textAnchor="middle" fontSize="10" fill={meta.color} fontWeight="700">{pct(r.rate)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
