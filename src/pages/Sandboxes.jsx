// Sandboxes / test environments. Rally's answer to a HubSpot Enterprise
// staple, shipped in the box: spin up a sandbox that copies your pipelines,
// automations, custom objects, fields and templates, change it without
// touching live data, review a clean diff versus Production, then promote
// only the changes you approve. Test in a sandbox, promote to prod, zero
// surprises. One local-first store (src/lib/sandboxes-data.js) drives an
// environments list, a per-sandbox config + diff view, a promote flow, and
// a change-tracking log. Promote is a SIMULATED apply that logs entries and
// never mutates real data; a live sync provider is env-gated.
import React, { useState } from 'react';
import {
  useSandboxes, getEnvironment, getProduction, getSandboxes,
  getChanges, getPendingChanges, getLog, sandboxStats, diffSummary,
  createSandbox, refreshFromProd, promoteChanges, discardChange, deleteSandbox,
  hasSyncEnv, CONFIG_CATEGORIES, categoryById, CHANGE_TYPES, SANDBOX_TYPES,
  ENV_STATUS, LOG_KINDS,
} from '../lib/sandboxes-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input,
  Modal, EmptyState, Tabs, GradientText, HealthDot,
  useToast, relTime, longDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

const num = (n) => (n == null ? '-' : Number(n).toLocaleString());

/* ---------- small shared bits ---------- */
function TypeBadge({ type }) {
  const t = SANDBOX_TYPES[type] || SANDBOX_TYPES.development;
  return <Badge tone={t.tone}>{t.label}</Badge>;
}

function StatusBadge({ status }) {
  const s = ENV_STATUS[status] || ENV_STATUS.active;
  return <span className="row gap-1"><HealthDot health={s.dot} /><span className="t-sm fw-6" style={{ color: 'var(--ink-2)' }}>{s.label}</span></span>;
}

function CategoryGlyph({ id, size = 16 }) {
  const c = categoryById(id);
  return <span style={{ color: c.color, display: 'inline-flex' }}><Icon name={c.icon} size={size} /></span>;
}

function ChangeTag({ type }) {
  const t = CHANGE_TYPES[type];
  return <Badge tone={t.tone} className="t-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.sign} {t.label}</Badge>;
}

/* ============================================================
   ENVIRONMENTS LIST
   ============================================================ */
function EnvKpis({ stats }) {
  const cards = [
    { label: 'Environments', value: num(stats.total), sub: `${stats.sandboxCount} sandbox${stats.sandboxCount === 1 ? '' : 'es'} plus Production`, icon: 'layers', color: 'var(--accent)' },
    { label: 'Changes ready', value: num(stats.pending), sub: 'Awaiting review across sandboxes', icon: 'gitBranch', color: 'var(--accent-teal)' },
    { label: 'Sync overdue', value: num(stats.stale), sub: stats.stale ? 'Refresh from Production' : 'Everything is current', icon: 'rotateCcw', color: stats.stale ? 'var(--warn)' : 'var(--ok)' },
    { label: 'Last promotion', value: stats.lastPromoteAt ? relTime(stats.lastPromoteAt) : 'None yet', sub: 'To live Production', icon: 'arrowUp', color: 'var(--ok)', raw: true },
  ];
  return (
    <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cards.map(c => (
        <Card key={c.label} className="col gap-1" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: c.color, opacity: .08, filter: 'blur(8px)' }} />
          <div className="row between" style={{ position: 'relative' }}>
            <div className="stat-label">{c.label}</div>
            <span style={{ color: c.color }}><Icon name={c.icon} size={18} /></span>
          </div>
          <div className="stat-value" style={{ fontSize: c.raw ? 'clamp(1.4rem,2.4vw,1.9rem)' : 'clamp(1.9rem,3vw,2.5rem)', position: 'relative' }}>{c.value}</div>
          <div className="t-xs muted">{c.sub}</div>
        </Card>
      ))}
    </div>
  );
}

function ProductionRow({ env, onOpen }) {
  return (
    <Card className="row between wrap" style={{ gap: '1rem', background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)', borderColor: 'var(--accent-300)' }}>
      <div className="row gap-2" style={{ minWidth: 0 }}>
        <span style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--grad-accent, linear-gradient(135deg,#6d5cf7,#4a3ce0))', color: '#fff' }} className="grad-accent"><Icon name="shield" size={22} /></span>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="fw-8 t-lg">Production</span>
            <Badge tone="ok"><Icon name="check" size={11} /> Live</Badge>
          </div>
          <div className="t-sm muted">The environment your customers touch. Promote changes here from any sandbox below.</div>
        </div>
      </div>
      <div className="row gap-3 wrap" style={{ flex: 'none' }}>
        <div className="col" style={{ gap: 0, textAlign: 'right' }}>
          <span className="fw-8 tnum" style={{ fontSize: '1.25rem' }}>{num(env.counts.records)}</span>
          <span className="t-xs muted">records</span>
        </div>
        <div className="col" style={{ gap: 0, textAlign: 'right' }}>
          <span className="fw-8 tnum" style={{ fontSize: '1.25rem' }}>{env.config.automation + env.config.pipeline + env.config.object + env.config.field + env.config.template}</span>
          <span className="t-xs muted">config assets</span>
        </div>
        <Button variant="ghost" onClick={() => onOpen(env.id)}><Icon name="history" size={16} /> Promotion log</Button>
      </div>
    </Card>
  );
}

function SandboxRow({ env, onOpen, toast }) {
  const pending = getPendingChanges(env.id).length;
  const assets = env.config.automation + env.config.pipeline + env.config.object + env.config.field + env.config.template;
  const doRefresh = (e) => { e.stopPropagation(); const r = refreshFromProd(env.id); if (!r.error) toast(`${env.name} refreshed from Production`); };
  return (
    <Card hover className="row between wrap row-host" style={{ gap: '1rem', cursor: 'pointer' }} onClick={() => onOpen(env.id)}>
      <div className="row gap-2" style={{ minWidth: 0, flex: 1 }}>
        <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--n-100)', color: 'var(--accent-600)' }}><Icon name="box" size={20} /></span>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
            <span className="fw-7 clip" style={{ fontSize: '1.05rem' }}>{env.name}</span>
            <TypeBadge type={env.type} />
            {pending > 0 && <Badge tone="accent" className="t-xs"><Icon name="gitBranch" size={11} /> {pending} to promote</Badge>}
          </div>
          <div className="row gap-3 wrap t-sm muted">
            <span className="row gap-1"><Avatar name={env.owner} size={18} /> {env.owner}</span>
            <span className="row gap-1"><Icon name="clock" size={13} /> synced {relTime(env.lastSyncedAt)}</span>
            <span className="hide-520">created {relTime(env.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="row gap-3 wrap" style={{ flex: 'none' }}>
        <div className="col hide-520" style={{ gap: 0, textAlign: 'right' }}>
          <span className="fw-7 tnum">{num(env.counts.records)}</span>
          <span className="t-xs muted">records</span>
        </div>
        <div className="col hide-520" style={{ gap: 0, textAlign: 'right' }}>
          <span className="fw-7 tnum">{assets}</span>
          <span className="t-xs muted">assets</span>
        </div>
        <StatusBadge status={env.status} />
        <Button variant="ghost" size="sm" className="reveal desktop-only" onClick={doRefresh}><Icon name="rotateCcw" size={14} /> Refresh</Button>
        <span style={{ color: 'var(--n-400)' }}><Icon name="chevronRight" size={18} /></span>
      </div>
    </Card>
  );
}

function EnvironmentsList({ onOpen, onNew, toast }) {
  const prod = getProduction();
  const sandboxes = getSandboxes();
  const stats = sandboxStats();

  return (
    <div className="col gap-3">
      <EnvKpis stats={stats} />

      {/* positioning banner */}
      <Card className="row between wrap" style={{ gap: '1rem', background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 65%)' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--accent)' }} className="floaty"><Icon name="shield" size={26} /></span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7"><GradientText>Change safely.</GradientText> Test in a sandbox, promote to prod.</span>
            <span className="t-sm muted" style={{ maxWidth: 560 }}>Serious teams never edit live config by hand. Clone Production, prove the change, review the diff, then promote only what you approve. Enterprise-grade governance, no extra subscription.</span>
          </div>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="ghost" onClick={() => askRook('Review my open sandboxes and tell me which changes are safe to promote to Production first.')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
          <Button variant="accent" onClick={onNew}><Icon name="plus" size={16} /> New sandbox</Button>
        </div>
      </Card>

      {prod && <ProductionRow env={prod} onOpen={onOpen} />}

      <div className="col gap-2">
        <SectionHeader title="Sandboxes" sub={`${sandboxes.length} test environment${sandboxes.length === 1 ? '' : 's'}`}
          action={<Button variant="ghost" size="sm" onClick={onNew}><Icon name="plus" size={14} /> Create</Button>} />
        <div className="col gap-2 stagger">
          {sandboxes.map(env => <SandboxRow key={env.id} env={env} onOpen={onOpen} toast={toast} />)}
        </div>
        {!sandboxes.length && (
          <Card><EmptyState icon="🧪" title="No sandboxes yet" body="Spin up a safe copy of Production to test pipeline, automation and field changes before they go live."
            action={<Button variant="accent" onClick={onNew}><Icon name="plus" size={15} /> New sandbox</Button>} /></Card>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   NEW SANDBOX MODAL
   ============================================================ */
function NewSandboxModal({ onClose, onCreated, toast }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('development');
  const submit = () => {
    const r = createSandbox({ name, type });
    if (r.error) return toast(r.message, 'risk');
    toast(`Sandbox "${r.environment.name}" created from Production`);
    onCreated(r.environment.id);
  };
  return (
    <Modal open onClose={onClose} title="New sandbox" width={560} footer={
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="box" size={15} /> Create sandbox</Button></>
    }>
      <div className="col gap-3">
        <Field label="Sandbox name" hint="Name it for the change you are testing">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 Pipeline Redesign" autoFocus />
        </Field>
        <div className="field">
          <label>Type</label>
          <div className="col gap-2">
            {['development', 'standard'].map(t => {
              const meta = SANDBOX_TYPES[t];
              const on = type === t;
              return (
                <button key={t} onClick={() => setType(t)} className="panel card-pad row between" style={{ textAlign: 'left', cursor: 'pointer', border: on ? '2px solid var(--accent)' : '1px solid var(--line)', background: on ? 'var(--accent-50)' : 'var(--paper)' }}>
                  <div className="row gap-2" style={{ minWidth: 0 }}>
                    <span style={{ color: on ? 'var(--accent-600)' : 'var(--n-600)' }}><Icon name={t === 'standard' ? 'layers' : 'zap'} size={20} /></span>
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="fw-7">{meta.label}</span>
                      <span className="t-sm muted">{meta.blurb}</span>
                    </div>
                  </div>
                  {on && <span style={{ color: 'var(--accent)' }}><Icon name="check" size={18} /></span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="panel card-pad t-sm col gap-1" style={{ background: 'var(--n-25)' }}>
          <span className="fw-6 row gap-1"><Icon name="copy" size={14} /> What gets copied</span>
          <span className="muted">Every pipeline, automation, custom object, field and template from Production is cloned into the sandbox. Your live data is never touched.</span>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   SANDBOX DETAIL - OVERVIEW (what config is copied)
   ============================================================ */
function OverviewTab({ env, onGoDiff, toast }) {
  const prod = getProduction();
  const pending = getPendingChanges(env.id).length;
  const doRefresh = () => { const r = refreshFromProd(env.id); if (!r.error) toast('Refreshed from Production'); };

  const countRows = [
    { label: 'Contacts', value: env.counts.contacts, icon: 'users' },
    { label: 'Companies', value: env.counts.companies, icon: 'building' },
    { label: 'Deals', value: env.counts.deals, icon: 'target' },
    { label: 'Records total', value: env.counts.records, icon: 'layers' },
  ];

  return (
    <div className="col gap-3">
      {env.status === 'stale' && (
        <Card className="row between wrap" style={{ gap: '1rem', background: 'var(--warn-bg)', borderColor: 'var(--warn)' }}>
          <span className="row gap-2" style={{ color: 'var(--warn)', minWidth: 0 }}><Icon name="clock" size={18} /><span className="fw-6" style={{ color: 'var(--ink)' }}>This sandbox last synced {relTime(env.lastSyncedAt)}. Refresh to test against current Production config.</span></span>
          <Button variant="ghost" onClick={doRefresh}><Icon name="rotateCcw" size={15} /> Refresh from prod</Button>
        </Card>
      )}

      {/* copied config */}
      <Card>
        <SectionHeader title="Configuration copied from Production" sub="A full snapshot, taken when the sandbox was created or last refreshed"
          action={<Button variant="ghost" size="sm" onClick={doRefresh}><Icon name="rotateCcw" size={14} /> Refresh</Button>} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {CONFIG_CATEGORIES.map(cat => {
            const here = env.config[cat.id] || 0;
            const there = prod ? (prod.config[cat.id] || 0) : here;
            const delta = here - there;
            return (
              <div key={cat.id} className="panel card-pad col gap-2">
                <span style={{ color: cat.color }}><Icon name={cat.icon} size={20} /></span>
                <div className="col gap-1">
                  <span className="fw-8" style={{ fontSize: '1.7rem', letterSpacing: '-.02em' }}>{here}</span>
                  <span className="t-sm muted">{cat.label}</span>
                </div>
                {delta !== 0
                  ? <span className="t-xs fw-6" style={{ color: delta > 0 ? 'var(--ok)' : 'var(--risk)' }}>{delta > 0 ? '+' : ''}{delta} vs prod</span>
                  : <span className="t-xs muted">matches prod</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* diff summary + promote CTA */}
        <Card className="col gap-2">
          <SectionHeader title="Uncommitted changes" sub="What differs from Production in this sandbox" />
          {pending > 0 ? (
            <>
              <div className="row gap-2 wrap">
                {['added', 'modified', 'removed'].map(t => {
                  const n = diffSummary(env.id).byType[t];
                  if (!n) return null;
                  const meta = CHANGE_TYPES[t];
                  return <span key={t} className="row gap-1 panel card-pad" style={{ padding: '.5rem .8rem' }}><span className="dot" style={{ background: meta.color }} /><span className="fw-7 tnum">{n}</span><span className="t-sm muted">{meta.label.toLowerCase()}</span></span>;
                })}
              </div>
              <p className="t-sm muted" style={{ margin: 0 }}>{pending} change{pending === 1 ? '' : 's'} are staged in this sandbox. Review the diff and promote the ones you approve to Production.</p>
              <div className="row gap-1">
                <Button variant="accent" onClick={onGoDiff}><Icon name="gitBranch" size={16} /> Review diff and promote</Button>
                <Button variant="ghost" onClick={() => askRook(`Summarize the changes staged in the "${env.name}" sandbox and flag anything risky before I promote it.`)}><Icon name="sparkles" size={15} /> Ask Rook</Button>
              </div>
            </>
          ) : (
            <EmptyState icon="✅" title="Nothing staged" body="This sandbox matches Production. Make a config change here to see it appear in the diff." />
          )}
        </Card>

        {/* data snapshot */}
        <Card className="col gap-2">
          <SectionHeader title="Data snapshot" sub={env.type === 'standard' ? 'A representative slice of records' : 'Lean config-only clone'} />
          <div className="col gap-2">
            {countRows.map(r => (
              <div key={r.label} className="row between">
                <span className="row gap-2 muted"><Icon name={r.icon} size={15} /> {r.label}</span>
                <span className="fw-7 tnum">{num(r.value)}</span>
              </div>
            ))}
          </div>
          <div className="t-xs muted row gap-1" style={{ marginTop: 4 }}><Icon name="lock" size={13} /> Sandbox data is isolated. Nothing here can reach a live customer.</div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   SANDBOX DETAIL - DIFF + PROMOTE
   ============================================================ */
function DiffRow({ c, checked, onToggle }) {
  const disabled = c.promoted;
  return (
    <div className="panel row-host" style={{ padding: '.9rem 1rem', borderLeft: `3px solid ${CHANGE_TYPES[c.type].color}`, opacity: disabled ? .62 : 1 }}>
      <div className="row between wrap" style={{ gap: '.6rem', alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0, alignItems: 'flex-start' }}>
          {!disabled ? (
            <input type="checkbox" checked={checked} onChange={() => onToggle(c.id)} aria-label={`Select change ${c.name}`}
              style={{ width: 18, height: 18, marginTop: 3, accentColor: 'var(--accent)', flex: 'none', cursor: 'pointer' }} />
          ) : (
            <span style={{ color: 'var(--ok)', marginTop: 2 }}><Icon name="check" size={17} /></span>
          )}
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <CategoryGlyph id={c.category} />
              <span className="fw-7 clip">{c.name}</span>
              <ChangeTag type={c.type} />
              {c.promoted && <Badge tone="ok" className="t-xs">Promoted {relTime(c.promotedAt)}</Badge>}
            </div>
            <span className="t-sm muted">{c.detail}</span>
            <div className="row gap-2 wrap" style={{ marginTop: 4, alignItems: 'center' }}>
              <span className="mono t-xs" style={{ padding: '.15rem .5rem', borderRadius: 6, background: 'var(--risk-bg)', color: 'var(--risk)', textDecoration: c.type === 'removed' ? 'line-through' : 'none' }}>{c.before}</span>
              <span style={{ color: 'var(--n-400)' }}><Icon name="arrowRight" size={14} /></span>
              <span className="mono t-xs" style={{ padding: '.15rem .5rem', borderRadius: 6, background: c.type === 'removed' ? 'var(--n-100)' : 'var(--ok-bg)', color: c.type === 'removed' ? 'var(--n-600)' : 'var(--ok)' }}>{c.after}</span>
            </div>
          </div>
        </div>
        <div className="row gap-2" style={{ flex: 'none' }}>
          <span className="t-xs muted row gap-1 hide-520"><Avatar name={c.author} size={18} /> {relTime(c.at)}</span>
          {!disabled && <button className="btn btn-quiet btn-sm reveal" title="Discard change" onClick={() => onToggle(c.id, 'discard')}><Icon name="trash" size={14} /></button>}
        </div>
      </div>
    </div>
  );
}

function DiffTab({ env, toast }) {
  const changes = getChanges(env.id);
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(() => new Set());
  const [confirm, setConfirm] = useState(false);

  const pending = changes.filter(c => !c.promoted);
  const visible = filter === 'all' ? changes : changes.filter(c => c.category === filter);
  const selectablePending = visible.filter(c => !c.promoted);
  const allSelected = selectablePending.length > 0 && selectablePending.every(c => sel.has(c.id));

  const onToggle = (id, action) => {
    if (action === 'discard') {
      const r = discardChange(env.id, id);
      if (!r.error) { toast('Change discarded'); setSel(prev => { const n = new Set(prev); n.delete(id); return n; }); }
      return;
    }
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSel(prev => {
      if (allSelected) { const n = new Set(prev); selectablePending.forEach(c => n.delete(c.id)); return n; }
      const n = new Set(prev); selectablePending.forEach(c => n.add(c.id)); return n;
    });
  };
  const selectedList = changes.filter(c => sel.has(c.id) && !c.promoted);

  const doPromote = () => {
    const r = promoteChanges(env.id, [...sel]);
    if (r.error) { setConfirm(false); return toast(r.message, 'risk'); }
    toast(r.simulated ? `${r.count} change${r.count === 1 ? '' : 's'} promoted (simulated apply, logged)` : `${r.count} change${r.count === 1 ? '' : 's'} promoted to Production`);
    setSel(new Set());
    setConfirm(false);
  };

  const cats = CONFIG_CATEGORIES.filter(cat => changes.some(c => c.category === cat.id));

  return (
    <div className="col gap-3">
      {/* filter + promote bar */}
      <Card className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6 muted">Filter</span>
          <button className="btn btn-sm" style={{ background: filter === 'all' ? 'var(--accent)' : 'var(--n-100)', color: filter === 'all' ? '#fff' : 'var(--n-600)', border: 'none' }} onClick={() => setFilter('all')}>All ({changes.length})</button>
          {cats.map(cat => (
            <button key={cat.id} className="btn btn-sm row gap-1" style={{ background: filter === cat.id ? 'var(--accent)' : 'var(--n-100)', color: filter === cat.id ? '#fff' : 'var(--n-600)', border: 'none' }} onClick={() => setFilter(cat.id)}>
              <Icon name={cat.icon} size={13} /> {cat.label}
            </button>
          ))}
        </div>
        <div className="row gap-2" style={{ flex: 'none' }}>
          {selectablePending.length > 0 && (
            <Button variant="quiet" size="sm" onClick={toggleAll}>{allSelected ? 'Clear' : 'Select all'}</Button>
          )}
          <Button variant="accent" disabled={!sel.size} onClick={() => setConfirm(true)}>
            <Icon name="arrowUp" size={16} /> Promote{sel.size ? ` ${sel.size}` : ''} to Production
          </Button>
        </div>
      </Card>

      {!hasSyncEnv() && (
        <div className="row gap-1 t-sm muted" style={{ padding: '0 .25rem' }}>
          <Icon name="shield" size={14} /> Promote runs as a simulated apply and records every change in the log. Connect a sync provider to push to live Production.
        </div>
      )}

      {/* the diff list */}
      <div className="col gap-2">
        {visible.map(c => <DiffRow key={c.id} c={c} checked={sel.has(c.id)} onToggle={onToggle} />)}
        {!visible.length && <Card><EmptyState icon="🔍" title="No changes in this view" body="Clear the filter or make a config change in the sandbox." /></Card>}
      </div>

      {confirm && (
        <Modal open onClose={() => setConfirm(false)} title="Promote changes to Production" width={620} footer={
          <><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="accent" onClick={doPromote}><Icon name="arrowUp" size={15} /> Promote {selectedList.length} to Production</Button></>
        }>
          <div className="col gap-3">
            <div className="panel card-pad row gap-2" style={{ background: 'var(--accent-50)' }}>
              <span style={{ color: 'var(--accent-600)' }}><Icon name="shield" size={20} /></span>
              <span className="t-sm">You are about to apply <span className="fw-7">{selectedList.length} change{selectedList.length === 1 ? '' : 's'}</span> from <span className="fw-7">{env.name}</span> to Production. {hasSyncEnv() ? 'This will update your live environment.' : 'This is a simulated apply that logs every entry. No live data is touched.'}</span>
            </div>
            <div className="col gap-1">
              {selectedList.map(c => (
                <div key={c.id} className="row gap-2" style={{ padding: '.5rem 0', borderBottom: '1px solid var(--n-50)' }}>
                  <CategoryGlyph id={c.category} />
                  <span className="fw-6 clip" style={{ minWidth: 0, flex: 1 }}>{c.name}</span>
                  <ChangeTag type={c.type} />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   SANDBOX DETAIL - CHANGE LOG
   ============================================================ */
function LogTab({ env }) {
  const log = getLog(env.id);
  return (
    <Card>
      <SectionHeader title="Change-tracking log" sub="Every action taken in this environment, newest first" />
      {log.length ? (
        <div className="col" style={{ position: 'relative' }}>
          {log.map((l, i) => {
            const meta = LOG_KINDS[l.kind] || LOG_KINDS.edit;
            return (
              <div key={l.id} className="row gap-2" style={{ alignItems: 'flex-start', paddingBottom: i === log.length - 1 ? 0 : '1.1rem', position: 'relative' }}>
                <div className="col center" style={{ flex: 'none', width: 34 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--n-100)', color: meta.color, flex: 'none', zIndex: 1 }}><Icon name={meta.icon} size={16} /></span>
                  {i !== log.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--line)', marginTop: 2 }} />}
                </div>
                <div className="col gap-1" style={{ minWidth: 0, paddingTop: 4 }}>
                  <span className="fw-6">{l.summary}{l.count != null && <Badge tone="ok" className="t-xs" style={{ marginLeft: 8 }}>{l.count}</Badge>}</span>
                  <span className="t-xs muted row gap-2"><span className="row gap-1"><Avatar name={l.author} size={16} /> {l.author}</span><span>{relTime(l.at)}</span><span className="hide-520">{longDate(l.at)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState icon="📋" title="No log entries" body="Actions in this sandbox will appear here." />}
    </Card>
  );
}

/* ============================================================
   PRODUCTION DETAIL (promotion history)
   ============================================================ */
function ProductionDetail({ env }) {
  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Records', value: num(env.counts.records), icon: 'layers' },
          { label: 'Contacts', value: num(env.counts.contacts), icon: 'users' },
          { label: 'Automations', value: num(env.config.automation), icon: 'workflow' },
          { label: 'Fields', value: num(env.config.field), icon: 'sliders' },
        ].map(c => (
          <Card key={c.label} className="col gap-1">
            <div className="row between"><span className="stat-label">{c.label}</span><span style={{ color: 'var(--accent-600)' }}><Icon name={c.icon} size={17} /></span></div>
            <span className="fw-8" style={{ fontSize: '1.9rem', letterSpacing: '-.02em' }}>{c.value}</span>
          </Card>
        ))}
      </div>
      <LogTab env={env} />
    </div>
  );
}

/* ============================================================
   SANDBOX DETAIL SHELL
   ============================================================ */
function SandboxDetail({ envId, onBack, onDeleted, toast }) {
  const env = getEnvironment(envId);
  const [tab, setTab] = useState('overview');
  const [delOpen, setDelOpen] = useState(false);

  if (!env) {
    return <Card><EmptyState icon="🗂️" title="Environment not found" body="It may have been deleted." action={<Button variant="ghost" onClick={onBack}><Icon name="arrowLeft" size={15} /> Back to environments</Button>} /></Card>;
  }

  if (env.isProd) {
    return (
      <div className="col gap-3">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Button variant="quiet" size="sm" onClick={onBack}><Icon name="arrowLeft" size={16} /> Environments</Button>
        </div>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span className="grad-accent" style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}><Icon name="shield" size={24} /></span>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}><h2 style={{ margin: 0 }}>Production</h2><Badge tone="ok"><Icon name="check" size={11} /> Live</Badge></div>
              <span className="t-sm muted">The environment your customers touch. Promotions from every sandbox land here.</span>
            </div>
          </div>
        </div>
        <ProductionDetail env={env} />
      </div>
    );
  }

  const pending = getPendingChanges(env.id).length;
  const doDelete = () => { const r = deleteSandbox(env.id); if (r.error) return toast(r.message, 'risk'); toast('Sandbox deleted'); setDelOpen(false); onDeleted(); };
  const doRefresh = () => { const r = refreshFromProd(env.id); if (!r.error) toast('Refreshed from Production'); };

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <Button variant="quiet" size="sm" onClick={onBack}><Icon name="arrowLeft" size={16} /> Environments</Button>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={doRefresh}><Icon name="rotateCcw" size={14} /> Refresh from prod</Button>
          <Button variant="ghost" size="sm" onClick={() => askRook(`Walk me through the "${env.name}" sandbox: what changed, and is it ready to promote?`)}><Icon name="sparkles" size={14} /> Ask Rook</Button>
          <Button variant="danger" size="sm" onClick={() => setDelOpen(true)}><Icon name="trash" size={14} /> Delete</Button>
        </div>
      </div>

      <div className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center', background: 'var(--n-100)', color: 'var(--accent-600)', flex: 'none' }}><Icon name="box" size={24} /></span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{env.name}</h2>
              <TypeBadge type={env.type} />
              <StatusBadge status={env.status} />
            </div>
            <span className="t-sm muted row gap-3 wrap">
              <span className="row gap-1"><Avatar name={env.owner} size={17} /> {env.owner}</span>
              <span>Created {longDate(env.createdAt)}</span>
              <span>Synced {relTime(env.lastSyncedAt)} from Production</span>
            </span>
          </div>
        </div>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'diff', label: 'Diff vs production', count: pending || undefined },
        { key: 'log', label: 'Change log', count: getLog(env.id).length },
      ]} />

      {tab === 'overview' && <OverviewTab env={env} onGoDiff={() => setTab('diff')} toast={toast} />}
      {tab === 'diff' && <DiffTab env={env} toast={toast} />}
      {tab === 'log' && <LogTab env={env} />}

      {delOpen && (
        <Modal open onClose={() => setDelOpen(false)} title="Delete sandbox" width={480} footer={
          <><Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button><Button variant="danger" onClick={doDelete}><Icon name="trash" size={15} /> Delete sandbox</Button></>
        }>
          <div className="col gap-2">
            <p style={{ margin: 0 }}>Delete <span className="fw-7">{env.name}</span> and its {pending} staged change{pending === 1 ? '' : 's'}? This cannot be undone.</p>
            <div className="t-sm muted row gap-1"><Icon name="shield" size={14} /> Production and its data are never affected.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Sandboxes() {
  useSandboxes();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Admin"
        title={<>Sandboxes <GradientText>&amp; environments</GradientText></>}
        sub="Clone Production into a safe sandbox, test pipeline, automation and field changes, review the diff, and promote only what you approve. Enterprise change management, built in."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Give me a status report on my sandboxes and recommend which staged changes to promote to Production.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New sandbox</Button>
          </div>
        }
      />

      {selectedId
        ? <SandboxDetail envId={selectedId} onBack={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)} toast={toast} />
        : <EnvironmentsList onOpen={setSelectedId} onNew={() => setNewOpen(true)} toast={toast} />}

      {newOpen && <NewSandboxModal onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setSelectedId(id); }} toast={toast} />}
    </div>
  );
}
