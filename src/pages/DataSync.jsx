// DataSync - Operations Hub. The data-ops depth HubSpot sells as Ops Hub,
// bundled into Rally. Four surfaces over one local-first store
// (src/lib/datasync-data.js): sync jobs to a warehouse / Sheets / ERP / CRM,
// a field-mapping editor, a data-health monitor with a health score and a
// fix-queue, and programmable scheduled data jobs. 100% functional with
// seeded deterministic data and zero backend; real runs are env-gated and
// degrade to a local simulation. Data sync plus a health score make Rally
// trustworthy as the system of record.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useDataSync, getSyncJobs, getSyncJob, getMappings, getHealth, getFixQueue,
  getScheduled, healthScore, scoreBand, syncSummary, runSync, toggleSyncPause,
  addMapping, updateMapping, toggleMapping, removeMapping, resolveFix,
  toggleScheduled, runScheduled, hasSyncEnv,
  systemById, directionById, statusMeta, OBJECTS,
  objectById, RALLY_FIELDS, TRANSFORMS,
} from '../lib/datasync-data.js';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select,
  Modal, EmptyState, Tabs, Ring, Sparkline, ProgressBar,
  GradientText, StatCard, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}
const fmtInt = (n) => (n == null ? '-' : n.toLocaleString());

const SEV_META = {
  high: { label: 'High', tone: 'risk' },
  med: { label: 'Medium', tone: 'warn' },
  low: { label: 'Low', tone: 'default' },
};

/* ---------- system tile ---------- */
function SystemMark({ id, size = 34 }) {
  const s = systemById(id);
  return (
    <span style={{ width: size, height: size, borderRadius: 9, background: s.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, flex: 'none', letterSpacing: '.02em' }}>{s.short}</span>
  );
}

function DirectionChip({ id }) {
  const d = directionById(id);
  return (
    <Badge tone={d.tone} className="t-xs" style={{ gap: 5 }}>
      <Icon name={d.icon} size={12} /> {d.label}
    </Badge>
  );
}

function StatusChip({ status }) {
  const m = statusMeta(status);
  return (
    <span className="row gap-1" style={{ alignItems: 'center' }}>
      <span className="dot" style={{ background: m.dot, animation: status === 'healthy' ? 'pulseDot 2.4s infinite' : 'none' }} />
      <span className="t-sm fw-6" style={{ color: m.dot }}>{m.label}</span>
    </span>
  );
}

/* ============================================================
   TAB 1 - SYNC JOBS
   ============================================================ */
function SyncJobCard({ job, onEditMap, toast }) {
  const s = systemById(job.systemId);
  const pct = job.recordsTotal ? Math.round((job.recordsSynced / job.recordsTotal) * 100) : 0;
  const erroring = job.status === 'erroring';
  const paused = job.status === 'paused';

  const doSync = () => {
    const r = runSync(job.id);
    if (r.error) return toast(r.message, 'risk');
    toast(r.synced ? `${fmtInt(r.synced)} records synced` : 'Sync complete, already up to date');
  };

  return (
    <Card className="col gap-2" style={{ borderColor: erroring ? 'var(--risk)' : undefined }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <SystemMark id={job.systemId} size={40} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7 clip" style={{ fontSize: '1.02rem' }}>{job.name}</span>
            <span className="row gap-1 wrap" style={{ alignItems: 'center' }}>
              <span className="t-sm muted">{s.kind}</span>
              <DirectionChip id={job.direction} />
            </span>
          </div>
        </div>
        <StatusChip status={job.status} />
      </div>

      {erroring && (
        <div className="panel card-pad t-sm row gap-2" style={{ background: 'var(--risk-bg)', color: 'var(--risk)', alignItems: 'flex-start' }}>
          <Icon name="shield" size={15} style={{ flex: 'none', marginTop: 2 }} />
          <span>{job.errorMsg}</span>
        </div>
      )}

      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 2 }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <span className="stat-label">Records synced</span>
          <span className="row gap-1" style={{ alignItems: 'baseline' }}>
            <span className="fw-8 tnum" style={{ fontSize: '1.5rem', letterSpacing: '-.02em' }}>{fmtInt(job.recordsSynced)}</span>
            <span className="t-sm muted tnum">/ {fmtInt(job.recordsTotal)}</span>
          </span>
        </div>
        <div style={{ opacity: .95 }}><Sparkline data={job.throughput} w={96} h={34} color={erroring ? 'var(--risk)' : s.color} /></div>
      </div>
      <ProgressBar value={pct} color={erroring ? 'var(--risk)' : 'var(--accent)'} height={7} />

      <div className="row between wrap t-sm muted" style={{ gap: '.5rem' }}>
        <span className="row gap-1"><Icon name="clock" size={13} /> {job.frequency}</span>
        <span className="row gap-1"><Icon name="layers" size={13} /> {job.mappingCount} field maps</span>
        <span>Last {relTime(job.lastSyncAt)}</span>
      </div>

      <div className="row gap-1 wrap" style={{ marginTop: 2 }}>
        <Button variant="accent" size="sm" onClick={doSync} disabled={paused}><Icon name="rotateCcw" size={14} /> Sync now</Button>
        <Button variant="ghost" size="sm" onClick={() => onEditMap(job.id)}><Icon name="sliders" size={14} /> Field maps</Button>
        <Button variant="quiet" size="sm" onClick={() => { const r = toggleSyncPause(job.id); toast(r.job.status === 'paused' ? 'Sync paused' : 'Sync resumed'); }}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </Card>
  );
}

function SyncJobsTab({ onEditMap, toast }) {
  const jobs = getSyncJobs();
  const sum = syncSummary();

  const runAll = () => {
    const active = jobs.filter(j => j.status !== 'paused');
    active.forEach(j => runSync(j.id));
    toast(`${active.length} connection${active.length === 1 ? '' : 's'} synced`);
  };

  return (
    <div className="col gap-3">
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">System of record</div>
            <h3 style={{ margin: 0 }}>Every source, synced and reconciled</h3>
            <div className="muted t-sm" style={{ maxWidth: 560 }}>
              Two-way connections to your warehouse, spreadsheets, ERP and legacy CRM. Rally stays clean and current, so the numbers tie out no matter which tool asks.
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => askRook('Which of my sync connections is erroring and what is the fix?')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
            <Button variant="accent" onClick={runAll}><Icon name="rotateCcw" size={16} /> Sync all</Button>
          </div>
        </div>
      </Card>

      {sum.erroring > 0 && (
        <Card className="row between wrap" style={{ gap: '.75rem', borderLeft: '3px solid var(--risk)' }}>
          <span className="row gap-2"><Icon name="shield" size={18} style={{ color: 'var(--risk)' }} /><span className="fw-6">{sum.erroring} connection{sum.erroring === 1 ? '' : 's'} need attention.</span></span>
          <span className="t-sm muted">Reconnect the source, then run a sync to clear the error.</span>
        </Card>
      )}

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {jobs.map(j => <SyncJobCard key={j.id} job={j} onEditMap={onEditMap} toast={toast} />)}
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 - FIELD MAPPING EDITOR
   ============================================================ */
function MappingRow({ syncId, m, toast }) {
  const targets = RALLY_FIELDS[m.object] || [];
  return (
    <tr style={{ opacity: m.active ? 1 : 0.5 }}>
      <td className="mono t-sm">{m.source}</td>
      <td style={{ color: 'var(--n-400)', textAlign: 'center', width: 34 }}><Icon name="arrowRight" size={15} /></td>
      <td>
        <Select value={m.target} onChange={e => updateMapping(syncId, m.id, { target: e.target.value })} style={{ width: 170, padding: '.4rem .6rem', fontSize: '.9rem' }}>
          {targets.map(f => <option key={f} value={f}>{f}</option>)}
        </Select>
      </td>
      <td>
        <Select value={m.transform} onChange={e => updateMapping(syncId, m.id, { transform: e.target.value })} style={{ width: 180, padding: '.4rem .6rem', fontSize: '.9rem' }}>
          {TRANSFORMS.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </td>
      <td style={{ width: 120 }}>
        <div className="row gap-1" style={{ alignItems: 'center' }}>
          <ProgressBar value={m.coverage} color={m.coverage >= 90 ? 'var(--ok)' : m.coverage >= 70 ? 'var(--warn)' : 'var(--risk)'} height={6} />
          <span className="t-xs muted tnum" style={{ width: 34, flex: 'none' }}>{m.coverage}%</span>
        </div>
      </td>
      <td style={{ width: 60, textAlign: 'center' }}>
        <button className={`switch ${m.active ? 'on' : ''}`} role="switch" aria-checked={m.active} aria-label="Toggle mapping" style={{ transform: 'scale(.82)' }} onClick={() => toggleMapping(syncId, m.id)} />
      </td>
      <td style={{ width: 40, textAlign: 'right' }}>
        <Button variant="quiet" size="sm" aria-label="Remove mapping" style={{ padding: '.3rem .45rem' }} onClick={() => { removeMapping(syncId, m.id); toast('Mapping removed'); }}><Icon name="trash" size={14} /></Button>
      </td>
    </tr>
  );
}

function FieldMappingTab({ selected, setSelected, toast }) {
  const jobs = getSyncJobs();
  const syncId = selected || jobs[0]?.id;
  const job = getSyncJob(syncId);
  const maps = getMappings(syncId);
  const [addOpen, setAddOpen] = useState(false);

  const byObject = useMemo(() => {
    const g = {};
    for (const m of maps) (g[m.object] = g[m.object] || []).push(m);
    return g;
  }, [maps]);

  if (!job) return <Card><EmptyState icon="🔌" title="No sync selected" body="Add a sync connection first." /></Card>;

  const activeCount = maps.filter(m => m.active).length;

  return (
    <div className="grid" style={{ gridTemplateColumns: '260px 1fr', alignItems: 'start' }}>
      {/* connection picker */}
      <Card pad={false} className="col">
        <div className="card-pad" style={{ paddingBottom: '.6rem' }}><SectionHeader title="Connections" /></div>
        <div className="col">
          {jobs.map(j => {
            const on = j.id === syncId;
            return (
              <button key={j.id} onClick={() => setSelected(j.id)} className="row gap-2"
                style={{ padding: '.7rem 1rem', border: 'none', borderLeft: on ? '3px solid var(--accent)' : '3px solid transparent', background: on ? 'var(--accent-50)' : 'transparent', cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}>
                <SystemMark id={j.systemId} size={28} />
                <span className="col" style={{ minWidth: 0, gap: 1 }}>
                  <span className="fw-6 clip t-sm" style={{ color: on ? 'var(--accent-700)' : 'var(--ink)' }}>{systemById(j.systemId).label}</span>
                  <span className="t-xs muted">{j.mappingCount} maps</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* mapping table */}
      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ gap: '.75rem' }}>
          <SectionHeader title={`${job.name}`} sub={`${activeCount} of ${maps.length} mappings active - ${systemById(job.systemId).label} ${directionById(job.direction).desc.toLowerCase()}`} />
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" size="sm" onClick={() => askRook(`Suggest field mappings I might be missing for my ${systemById(job.systemId).label} sync.`)}><Icon name="sparkles" size={14} /> Suggest</Button>
            <Button variant="accent" size="sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Add mapping</Button>
          </div>
        </div>

        {maps.length === 0 ? (
          <EmptyState icon="🧭" title="No mappings yet" body="Add a mapping to route an external column into a Rally field." action={<Button variant="accent" size="sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> Add mapping</Button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Source column</th><th></th><th>Rally field</th><th>Transform</th><th>Coverage</th><th style={{ textAlign: 'center' }}>On</th><th></th>
                </tr>
              </thead>
              <tbody>
                {OBJECTS.filter(o => byObject[o.id]?.length).map(o => (
                  <React.Fragment key={o.id}>
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--n-25)', padding: '.5rem 1rem' }}>
                        <span className="row gap-1 eyebrow" style={{ color: 'var(--n-600)' }}><Icon name={o.icon} size={13} /> {o.label}</span>
                      </td>
                    </tr>
                    {byObject[o.id].map(m => <MappingRow key={m.id} syncId={syncId} m={m} toast={toast} />)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {addOpen && <AddMappingModal syncId={syncId} job={job} onClose={() => setAddOpen(false)} toast={toast} />}
    </div>
  );
}

function AddMappingModal({ syncId, job, onClose, toast }) {
  const [object, setObject] = useState(job.objects[0] || 'contacts');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState(RALLY_FIELDS[job.objects[0] || 'contacts'][0]);
  const [transform, setTransform] = useState('Direct copy');

  const targets = RALLY_FIELDS[object] || [];

  const submit = () => {
    const r = addMapping(syncId, { object, source, target, transform });
    if (r.error) return toast(r.message, 'risk');
    toast('Mapping added');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Add field mapping" width={560} footer={
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="plus" size={15} /> Add mapping</Button></>
    }>
      <div className="col gap-3">
        <Field label="Rally object">
          <Select value={object} onChange={e => { const o = e.target.value; setObject(o); setTarget(RALLY_FIELDS[o][0]); }}>
            {job.objects.map(o => <option key={o} value={o}>{objectById(o).label}</option>)}
          </Select>
        </Field>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Source column" hint="The external field name">
            <Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. account_name" />
          </Field>
          <Field label="Rally field">
            <Select value={target} onChange={e => setTarget(e.target.value)}>
              {targets.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Transform">
          <Select value={transform} onChange={e => setTransform(e.target.value)}>
            {TRANSFORMS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="panel card-pad t-sm row gap-2" style={{ background: 'var(--n-25)', alignItems: 'center' }}>
          <span className="mono t-sm">{source || 'source_column'}</span>
          <Icon name="arrowRight" size={14} style={{ color: 'var(--accent)' }} />
          <span className="fw-6 t-sm">{objectById(object).label}.{target}</span>
          <Badge tone="accent" className="t-xs" style={{ marginLeft: 'auto' }}>{transform}</Badge>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   TAB 3 - DATA HEALTH MONITOR
   ============================================================ */
function DataHealthTab({ toast }) {
  const health = getHealth();
  const fixes = getFixQueue();
  const score = healthScore();
  const band = scoreBand(score);

  const staleTotal = health.stale.reduce((a, s) => a + s.count, 0);
  const fmtTotal = health.formatting.reduce((a, f) => a + f.count, 0);
  const compAvg = Math.round(health.objects.reduce((a, o) => a + o.pct, 0) / (health.objects.length || 1));

  const doResolve = (fx) => {
    const r = resolveFix(fx.id);
    if (r.error) return toast(r.message, 'risk');
    toast(fx.autoFixable ? 'Auto-fix applied' : 'Fix queued to owners');
  };

  return (
    <div className="col gap-3">
      {/* hero: score + KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr 1fr 1fr' }}>
        <Card className="row gap-3" style={{ alignItems: 'center' }}>
          <Ring value={score} size={104} stroke={10} color={band.color} label={
            <span className="col center" style={{ gap: 0 }}>
              <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{score}</span>
              <span className="t-xs muted" style={{ fontWeight: 600 }}>/ 100</span>
            </span>
          } />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Data health score</div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: band.color }}>{band.grade}</div>
            <div className="t-sm muted">Completeness, duplicates, formatting and freshness in one number.</div>
          </div>
        </Card>

        <StatCard label="Completeness" value={compAvg} format={(n) => `${Math.round(n)}%`} icon={<Icon name="checkSquare" size={18} />} sub="Fields filled across objects" accent="var(--ok)" />
        <Link to="/duplicates" style={{ display: 'block' }}>
          <StatCard label="Duplicate rate" value={health.duplicateRate} format={(n) => `${n.toFixed(1)}%`} icon={<Icon name="merge" size={18} />} sub={`${fmtInt(health.duplicateCount)} in Duplicates`} accent="var(--warn)" />
        </Link>
        <StatCard label="Stale records" value={staleTotal} icon={<Icon name="clock" size={18} />} sub="No activity in 90 days" accent="var(--risk)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        {/* completeness by object */}
        <Card>
          <SectionHeader title="Completeness by object" sub="Required-field fill rate, and where the gaps are" />
          <div className="col gap-3">
            {health.objects.map(o => (
              <div key={o.object} className="col gap-1">
                <div className="row between">
                  <span className="row gap-1 fw-6"><Icon name={o.icon} size={15} style={{ color: 'var(--accent-600)' }} /> {o.label}</span>
                  <span className="tnum fw-7">{o.pct}%<span className="muted fw-5 t-sm"> of {fmtInt(o.total)}</span></span>
                </div>
                <ProgressBar value={o.pct} color={o.pct >= 90 ? 'var(--ok)' : o.pct >= 78 ? 'var(--warn)' : 'var(--risk)'} height={9} />
                <div className="row gap-1 wrap" style={{ marginTop: 2 }}>
                  {o.missing.map(m => (
                    <Badge key={m.field} tone="default" className="t-xs">{m.field} <span className="muted">{m.pct}% empty</span></Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* formatting issues */}
        <Card>
          <SectionHeader title="Formatting issues" sub={`${fmtInt(fmtTotal)} values need cleanup`} />
          <div className="col gap-2">
            {health.formatting.map(f => (
              <div key={f.id} className="row between panel card-pad" style={{ padding: '.7rem .85rem' }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <span style={{ color: 'var(--warn)' }}><Icon name={objectById(f.object).icon} size={16} /></span>
                  <div className="col" style={{ gap: 1, minWidth: 0 }}>
                    <span className="fw-6 t-sm clip">{f.label}</span>
                    <span className="t-xs muted">{objectById(f.object).label} . {f.field}</span>
                  </div>
                </div>
                <Badge tone="warn" className="tnum">{f.count}</Badge>
              </div>
            ))}
          </div>
          <div className="t-xs muted row gap-1" style={{ marginTop: '.9rem' }}>
            <Icon name="shield" size={13} /> Formatting is validated on every sync write by the Format validator job.
          </div>
        </Card>
      </div>

      {/* fix queue */}
      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ gap: '.75rem' }}>
          <SectionHeader title="Fix queue" sub={fixes.length ? `${fixes.length} issue${fixes.length === 1 ? '' : 's'} lowering your score` : 'All clear'} />
          <Button variant="ghost" size="sm" onClick={() => askRook('Walk me through my data health fix queue and which to resolve first.')}><Icon name="sparkles" size={14} /> Ask Rook</Button>
        </div>
        {fixes.length === 0 ? (
          <EmptyState icon="✅" title="Fix queue is empty" body="Your data is clean. New issues surface here as syncs run." />
        ) : (
          <div className="col">
            {fixes.map(fx => (
              <div key={fx.id} className="row between wrap" style={{ gap: '.75rem', padding: '.9rem 1.4rem', borderTop: '1px solid var(--line)' }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <span style={{ color: SEV_META[fx.severity].tone === 'risk' ? 'var(--risk)' : SEV_META[fx.severity].tone === 'warn' ? 'var(--warn)' : 'var(--n-400)' }}><Icon name={objectById(fx.object).icon} size={18} /></span>
                  <div className="col" style={{ gap: 2, minWidth: 0 }}>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                      <span className="fw-6 clip">{fx.title}</span>
                      <Badge tone={SEV_META[fx.severity].tone} className="t-xs">{SEV_META[fx.severity].label}</Badge>
                    </span>
                    <span className="t-sm muted">{fx.detail}</span>
                  </div>
                </div>
                <div className="row gap-1" style={{ flex: 'none' }}>
                  {fx.autoFixable
                    ? <Button variant="accent" size="sm" onClick={() => doResolve(fx)}><Icon name="zap" size={14} /> Auto-fix</Button>
                    : <Button variant="ghost" size="sm" onClick={() => doResolve(fx)}><Icon name="check" size={14} /> Resolve</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 4 - SCHEDULED DATA JOBS (programmable automation)
   ============================================================ */
function ScheduledTab({ toast }) {
  const jobs = getScheduled();
  const enabled = jobs.filter(j => j.enabled).length;

  return (
    <div className="col gap-3">
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span style={{ color: 'var(--accent)' }} className="floaty"><Icon name="workflow" size={26} /></span>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <div className="eyebrow">Programmable data ops</div>
              <h3 style={{ margin: 0 }}>Scheduled jobs keep the book clean on its own</h3>
              <div className="muted t-sm" style={{ maxWidth: 540 }}>Dedupe, enrich, validate and snapshot on a cadence. {enabled} of {jobs.length} jobs are running.</div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => askRook('Draft a new scheduled data job to keep my contacts enriched.')} style={{ flex: 'none' }}><Icon name="sparkles" size={15} /> Design a job</Button>
        </div>
      </Card>

      <Card pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Job</th><th>Schedule</th><th>Action</th><th>Scope</th><th>Last run</th><th style={{ textAlign: 'center' }}>On</th><th></th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} style={{ opacity: j.enabled ? 1 : 0.55 }}>
                  <td><span className="fw-6">{j.name}</span></td>
                  <td><span className="row gap-1 t-sm"><Icon name="clock" size={13} style={{ color: 'var(--accent-600)' }} /> {j.schedule}</span></td>
                  <td className="muted t-sm">{j.action}</td>
                  <td><Badge tone="default" className="t-xs">{j.target === 'all' ? 'All objects' : objectById(j.target).label}</Badge></td>
                  <td className="muted t-sm">{relTime(j.lastRun)}</td>
                  <td style={{ textAlign: 'center', width: 60 }}>
                    <button className={`switch ${j.enabled ? 'on' : ''}`} role="switch" aria-checked={j.enabled} aria-label="Toggle job" style={{ transform: 'scale(.82)' }} onClick={() => { toggleScheduled(j.id); toast(j.enabled ? 'Job paused' : 'Job enabled'); }} />
                  </td>
                  <td style={{ textAlign: 'right', width: 90 }}>
                    <Button variant="quiet" size="sm" disabled={!j.enabled} onClick={() => { runScheduled(j.id); toast(`${j.name} ran`); }}>Run now</Button>
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
   PAGE
   ============================================================ */
export default function DataSync() {
  useDataSync();
  const toast = useToast();
  const [tab, setTab] = useState('jobs');
  const [selectedSync, setSelectedSync] = useState(null);
  const sum = syncSummary();
  const score = healthScore();
  const openFixes = getFixQueue().length;

  const goMap = (syncId) => { setSelectedSync(syncId); setTab('mapping'); };

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Admin"
        title={<>DataSync <GradientText>Operations Hub</GradientText></>}
        sub="Sync every source, map every field, and score your data health. The Ops Hub depth that makes Rally trustworthy as the system of record - no second subscription."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Give me a one-line summary of my data health and sync status.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => setTab('health')}><Icon name="shield" size={16} /> Data health</Button>
          </div>
        }
      />

      {/* KPI band */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Active syncs" value={sum.healthy + sum.erroring} icon={<Icon name="plug" size={18} />} sub={`${sum.total} connections total`} />
        <StatCard label="Records synced" value={sum.recordsSynced} icon={<Icon name="layers" size={18} />} sub={`${sum.mappings} field maps`} accent="var(--accent-teal)" />
        <StatCard label="Health score" value={score} format={(n) => `${Math.round(n)}`} icon={<Icon name="shield" size={18} />} sub={scoreBand(score).grade} accent={scoreBand(score).color} onClick={() => setTab('health')} />
        <StatCard label="Open fixes" value={openFixes} icon={<Icon name="merge" size={18} />} sub={openFixes ? 'In the fix queue' : 'All clear'} accent="var(--warn)" onClick={() => setTab('health')} />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'jobs', label: 'Sync jobs', count: sum.total },
        { key: 'mapping', label: 'Field mapping' },
        { key: 'health', label: 'Data health' },
        { key: 'scheduled', label: 'Scheduled jobs' },
      ]} />

      {tab === 'jobs' && <SyncJobsTab onEditMap={goMap} toast={toast} />}
      {tab === 'mapping' && <FieldMappingTab selected={selectedSync} setSelected={setSelectedSync} toast={toast} />}
      {tab === 'health' && <DataHealthTab toast={toast} />}
      {tab === 'scheduled' && <ScheduledTab toast={toast} />}

      {!hasSyncEnv() && (
        <div className="t-xs muted row gap-1" style={{ padding: '0 .25rem' }}>
          <Icon name="lock" size={13} /> Live provider not connected. Sync runs simulate locally and persist; wire VITE_SYNC_PROVIDER to push to real systems.
        </div>
      )}
    </div>
  );
}
