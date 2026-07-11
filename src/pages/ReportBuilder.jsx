// Report Builder v2 - a drag-to-build reporting workspace for Rally.
//   BUILDER tab: a 3-pane layout (field palette -> canvas with a live
//     preview chart + data table -> config), save / run, export CSV.
//   COHORTS tab: cohort retention / conversion analysis as a heatmap.
//   Plus a "schedule delivery" dialog and a saved-report library, all
//     driven off the deterministic engine in src/lib/report-builder.js.
// Everything computes off the live store. Custom report defs + schedules
// persist to localStorage (pub/sub). ASCII only. NO em-dash / en-dash.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card, Button, Badge, SectionHeader, Tabs, Field, Input, Select, Textarea,
  Segmented, useToast,
} from '../components/UI';
import { Icon } from '../components/icons';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import { useStore } from '../lib/store';
import FieldPalette from '../components/reports2/FieldPalette';
import VizPreview from '../components/reports2/VizPreview';
import CohortGrid from '../components/reports2/CohortGrid';
import ScheduleDialog from '../components/reports2/ScheduleDialog';
import {
  SOURCES, sourceMeta, VIZ_TYPES, AGGREGATIONS, DATE_PRESETS, FILTER_OPS,
  fieldById, dimsFor, measureFieldsFor, dateFieldsFor, dimValueOptions,
  emptyDefinition, reconcileDefinition, runReport, reportToCsv, downloadCsv,
  saveReport, deleteReport, duplicateReport, getReport, allReports, subscribeReports,
  cohortAnalysis, cohortMetricsFor, formatValue,
  loadSchedules, subscribeSchedules, deleteSchedule, toggleSchedule,
} from '../lib/report-builder';
import '../components/reports2/reports2.css';

/* ---------- canvas dropzone ---------- */
function DropZone({ label, hint, token, accept, onDrop, onClear, dragRole }) {
  const [over, setOver] = useState(false);
  const canAccept = !dragRole || accept.includes(dragRole);
  return (
    <div className="col gap-1" style={{ flex: '1 1 150px', minWidth: 140 }}>
      <span className="t-xs fw-7" style={{ color: 'var(--n-600)' }}>{label}</span>
      <div
        className={'rb-dropzone' + (over && canAccept ? ' rb-over' : '')}
        onDragOver={(e) => { if (canAccept) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/rb-field'); if (id) onDrop(id); }}
      >
        {token ? (
          <span className={'rb-token' + (token.role === 'measure' ? ' rb-token-measure' : '')}>
            {token.label}
            <button onClick={onClear} aria-label={`Remove ${token.label}`}>&times;</button>
          </span>
        ) : <span className="rb-dropzone-hint">{hint}</span>}
      </div>
    </div>
  );
}

/* ---------- filter editor ---------- */
function FilterRow({ source, filter, onChange, onRemove }) {
  const dims = dimsFor(source);
  const field = fieldById(source, filter.field);
  const options = field && field.role === 'dim' ? dimValueOptions(source, field.id) : null;
  return (
    <div className="rb-filter-row">
      <Select value={filter.field} onChange={e => onChange({ ...filter, field: e.target.value, value: '' })}>
        {dims.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
      </Select>
      <Select value={filter.op} onChange={e => onChange({ ...filter, op: e.target.value })}>
        {FILTER_OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
      {options && options.length ? (
        <Select value={filter.value} onChange={e => onChange({ ...filter, value: e.target.value })}>
          <option value="">Any</option>
          {options.map(v => <option key={v} value={v}>{v}</option>)}
        </Select>
      ) : (
        <Input value={filter.value} onChange={e => onChange({ ...filter, value: e.target.value })} placeholder="value" />
      )}
      <Button variant="quiet" size="sm" onClick={onRemove} aria-label="Remove filter"><Icon name="trash" size={15} /></Button>
    </div>
  );
}

/* ============================================================
   BUILDER TAB
   ============================================================ */
function BuilderTab() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [def, setDef] = useState(() => {
    const load = params.get('load');
    if (load) { const r = getReport(load) || allReports().find(x => x.id === load); if (r) return reconcileDefinition(r); }
    return emptyDefinition('deals');
  });
  const [dragField, setDragField] = useState(null);
  const [library, setLibrary] = useState(() => allReports());
  const [schedules, setSchedules] = useState(() => loadSchedules());
  const [schedFor, setSchedFor] = useState(null); // { report, existing }

  useEffect(() => subscribeReports(() => setLibrary(allReports())), []);
  useEffect(() => subscribeSchedules(setSchedules), []);

  const computed = useMemo(() => runReport(def), [def]);
  const patch = (p) => setDef(d => reconcileDefinition({ ...d, ...p }));

  const primaryDim = def.dimensions[0];
  const secondaryDim = def.dimensions[1] || null;
  const measure = def.measure || { field: null, agg: 'count' };

  // route a field onto the definition (drop or click)
  const routeField = (fieldId, zone) => {
    const f = fieldById(def.source, fieldId);
    if (!f) return;
    if (zone === 'group' || (!zone && f.role === 'dim' && !def.dimensions.includes(fieldId) && def.dimensions.length === 0)) {
      patch({ dimensions: [fieldId, ...(secondaryDim ? [secondaryDim] : [])] });
    } else if (zone === 'split') {
      if (f.role === 'dim') patch({ dimensions: [primaryDim, fieldId] });
    } else if (zone === 'measure') {
      if (f.role === 'measure') patch({ measure: { field: fieldId, agg: measure.agg === 'count' ? 'sum' : measure.agg } });
    } else if (!zone) {
      // auto route by role
      if (f.role === 'measure') patch({ measure: { field: fieldId, agg: measure.agg === 'count' ? 'sum' : measure.agg } });
      else if (f.role === 'date') patch({ dateRange: { ...def.dateRange, field: fieldId } });
      else if (f.role === 'dim') {
        if (def.dimensions.includes(fieldId)) return;
        if (def.dimensions.length < 2) patch({ dimensions: [...def.dimensions, fieldId] });
        else patch({ dimensions: [fieldId, def.dimensions[1]] });
      }
    }
  };

  const onSave = () => {
    const saved = saveReport(def);
    setDef(reconcileDefinition(saved));
    setParams({ load: saved.id }, { replace: true });
    toast('Report saved to your library');
  };
  const onExport = () => { downloadCsv(def.title, reportToCsv(def, computed)); toast('CSV exported'); };
  const onNew = () => { setDef(emptyDefinition('deals')); setParams({}, { replace: true }); };
  const loadInto = (r) => { setDef(reconcileDefinition(r)); setParams({ load: r.id }, { replace: true }); toast(`Loaded "${r.title}"`); };

  const measureFields = measureFieldsFor(def.source);
  const dateFields = dateFieldsFor(def.source);
  const aggs = AGGREGATIONS.filter(a => a.id === 'count' ? true : measureFields.length);

  return (
    <div className="col gap-3">
      {/* action bar */}
      <div className="row between wrap gap-2">
        <Input value={def.title} onChange={e => setDef(d => ({ ...d, title: e.target.value }))}
          placeholder="Name this report" style={{ maxWidth: 340, fontWeight: 700 }} />
        <div className="row gap-1 wrap">
          <Button variant="ghost" size="sm" onClick={onNew}><Icon name="plus" size={15} /> New</Button>
          <Button variant="ghost" size="sm" onClick={onExport}><Icon name="download" size={15} /> Export CSV</Button>
          <Button size="sm" onClick={onSave}><Icon name="check" size={16} /> Save report</Button>
        </div>
      </div>

      <div className="rb-shell">
        {/* LEFT: field palette */}
        <FieldPalette source={def.source} onAddField={(f) => routeField(f.id)} dragField={dragField} setDragField={setDragField} />

        {/* CENTER: canvas */}
        <div className="col gap-2" style={{ minWidth: 0 }}>
          <Card className="col" style={{ gap: '.85rem' }}>
            <div className="row gap-2 wrap">
              <DropZone label="Group by" hint="Drop a dimension" accept={['dim']} dragRole={dragField?.role}
                token={primaryDim ? { ...fieldById(def.source, primaryDim) } : null}
                onDrop={(id) => routeField(id, 'group')} onClear={() => secondaryDim ? patch({ dimensions: [secondaryDim] }) : toast('A report needs at least one dimension', 'warn')} />
              <DropZone label="Split by (optional)" hint="Drop a 2nd dimension" accept={['dim']} dragRole={dragField?.role}
                token={secondaryDim ? { ...fieldById(def.source, secondaryDim) } : null}
                onDrop={(id) => routeField(id, 'split')} onClear={() => patch({ dimensions: [primaryDim] })} />
              <DropZone label="Measure" hint="Drop a number" accept={['measure']} dragRole={dragField?.role}
                token={measure.agg !== 'count' && measure.field ? { ...fieldById(def.source, measure.field), role: 'measure' } : null}
                onDrop={(id) => routeField(id, 'measure')} onClear={() => patch({ measure: { field: null, agg: 'count' } })} />
            </div>

            {/* viz switch */}
            <div className="rb-viz-switch">
              {VIZ_TYPES.map(v => (
                <button key={v.id} className={'rb-viz-btn' + (def.viz === v.id ? ' rb-on' : '')} onClick={() => setDef(d => ({ ...d, viz: v.id }))}>
                  <Icon name={v.icon} size={14} /> {v.label}
                </button>
              ))}
            </div>

            {/* live preview */}
            <div style={{ minHeight: 300 }}>
              <VizPreview def={def} computed={computed} height={320} />
            </div>
            <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
              <span className="rb-muted">{computed.rows.length} groups, {computed.recordCount} records in range</span>
              <span className="fw-7 tnum">{computed.measureLabel}: {formatValue(computed.kpi, computed.valueFormat)}</span>
            </div>
          </Card>

          {/* data table under the chart (skip if the viz already IS a table) */}
          {def.viz !== 'table' && computed.rows.length > 0 && (
            <Card className="col" style={{ gap: '.6rem' }}>
              <span className="fw-7">Underlying data</span>
              <VizPreview def={{ ...def, viz: 'table' }} computed={computed} />
            </Card>
          )}
        </div>

        {/* RIGHT: config */}
        <div className="rb-pane">
          <div className="rb-pane-title">Configure</div>
          <Field label="Data source">
            <Select value={def.source} onChange={e => setDef(reconcileDefinition({ ...emptyDefinition(e.target.value), title: def.title, desc: def.desc, viz: def.viz }))}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Aggregation">
            <Select value={measure.agg} onChange={e => {
              const agg = e.target.value;
              if (agg === 'count') patch({ measure: { field: null, agg } });
              else patch({ measure: { field: measure.field || measureFields[0]?.id || null, agg } });
            }}>
              {aggs.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
          </Field>
          {measure.agg !== 'count' && (
            <Field label="Measure field">
              <Select value={measure.field || ''} onChange={e => patch({ measure: { ...measure, field: e.target.value } })}>
                {measureFields.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Date range">
            <div className="col gap-1">
              <Select value={def.dateRange?.field || ''} onChange={e => patch({ dateRange: { ...def.dateRange, field: e.target.value } })}>
                {dateFields.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
              <Select value={def.dateRange?.preset || 'all'} onChange={e => patch({ dateRange: { ...def.dateRange, preset: e.target.value } })}>
                {DATE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
          </Field>

          <div className="col gap-1">
            <div className="row between">
              <span className="t-xs fw-7" style={{ color: 'var(--n-600)' }}>FILTERS</span>
              <Button variant="quiet" size="sm" onClick={() => patch({ filters: [...(def.filters || []), { field: dimsFor(def.source)[0].id, op: 'is', value: '' }] })}>
                <Icon name="plus" size={14} /> Add
              </Button>
            </div>
            {(def.filters || []).length === 0 && <span className="rb-muted">No filters. Showing all records.</span>}
            <div className="col gap-1">
              {(def.filters || []).map((f, i) => (
                <FilterRow key={i} source={def.source} filter={f}
                  onChange={(nf) => patch({ filters: def.filters.map((x, xi) => xi === i ? nf : x) })}
                  onRemove={() => patch({ filters: def.filters.filter((_, xi) => xi !== i) })} />
              ))}
            </div>
          </div>

          <Field label="Description">
            <Textarea value={def.desc} onChange={e => setDef(d => ({ ...d, desc: e.target.value }))} rows={2} placeholder="What question does this answer?" />
          </Field>

          <Button variant="ghost" onClick={() => { const saved = saveReport(def); setDef(reconcileDefinition(saved)); setParams({ load: saved.id }, { replace: true }); setSchedFor({ report: saved, existing: null }); }}>
            <Icon name="clock" size={16} /> Schedule delivery
          </Button>
        </div>
      </div>

      {/* library + schedules */}
      <Reveal>
        <div className="col gap-2">
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div className="col gap-1">
              <h4 style={{ margin: 0 }}>Your report library</h4>
              <span className="muted t-sm">Saved reports and starters. Load one to keep building.</span>
            </div>
            <Badge>{library.length} reports</Badge>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.85rem' }}>
            {library.map(r => (
              <Card key={r.id} hover className="col" style={{ gap: '.6rem', cursor: 'pointer' }} onClick={() => loadInto(r)}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
                    <Icon name={sourceMeta(r.source).icon} size={16} />
                  </span>
                  {r.starter ? <Badge>Starter</Badge> : <Badge tone="accent">Saved</Badge>}
                </div>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="fw-7 clip">{r.title}</span>
                  <span className="muted t-xs" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.desc || `${r.source} report`}</span>
                </div>
                <div className="row gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="quiet" size="sm" onClick={() => { const c = duplicateReport(r); toast('Duplicated'); loadInto(c); }}><Icon name="copy" size={14} /></Button>
                  <Button variant="quiet" size="sm" onClick={() => setSchedFor({ report: r.starter ? saveReport(r) : r, existing: null })}><Icon name="clock" size={14} /></Button>
                  {!r.starter && <Button variant="quiet" size="sm" onClick={() => { if (confirm('Delete this report?')) { deleteReport(r.id); toast('Deleted'); } }}><Icon name="trash" size={14} /></Button>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Reveal>

      {schedules.length > 0 && (
        <Reveal>
          <div className="col gap-2">
            <h4 style={{ margin: 0 }}>Scheduled deliveries</h4>
            <div className="col gap-1">
              {schedules.map(s => (
                <div key={s.id} className={'rb-sched' + (s.enabled ? '' : ' rb-off')}>
                  <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
                    <Icon name="clock" size={16} />
                  </span>
                  <div className="col" style={{ minWidth: 0, flex: 1 }}>
                    <span className="fw-7 clip">{s.reportTitle || 'Report'}</span>
                    <span className="rb-muted">{s.cadence} at {String(s.hour).padStart(2, '0')}:00, {s.recipients.length} recipient(s). Next {new Date(s.nextRunAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</span>
                  </div>
                  <Button variant="quiet" size="sm" onClick={() => toggleSchedule(s.id)}>{s.enabled ? 'Pause' : 'Resume'}</Button>
                  <Button variant="quiet" size="sm" onClick={() => { const r = getReport(s.reportId); if (r) setSchedFor({ report: r, existing: s }); else toast('Report was deleted', 'warn'); }}><Icon name="edit" size={14} /></Button>
                  <Button variant="quiet" size="sm" onClick={() => { deleteSchedule(s.id); toast('Schedule removed'); }}><Icon name="trash" size={14} /></Button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <ScheduleDialog open={!!schedFor} onClose={() => setSchedFor(null)} report={schedFor?.report} existing={schedFor?.existing}
        onSaved={() => setSchedFor(null)} />
    </div>
  );
}

/* ============================================================
   COHORTS TAB
   ============================================================ */
function CohortsTab() {
  useStore();
  const [source, setSource] = useState('deals');
  const [metric, setMetric] = useState('conversion');
  const [maxOffset, setMaxOffset] = useState(6);
  const metrics = cohortMetricsFor(source);
  const safeMetric = metrics.some(m => m.id === metric) ? metric : metrics[0].id;
  const computed = useMemo(() => cohortAnalysis({ source, metric: safeMetric, maxOffset }), [source, safeMetric, maxOffset]);
  const metricMeta = metrics.find(m => m.id === safeMetric);

  return (
    <div className="col gap-3">
      <Card className="col" style={{ gap: '1rem' }}>
        <div className="row between wrap gap-2">
          <div className="col gap-1">
            <span className="fw-7">Cohort analysis</span>
            <span className="rb-muted">Records grouped by creation month, tracked across the months that follow.</span>
          </div>
          <div className="row gap-1 wrap" style={{ alignItems: 'flex-end' }}>
            <Field label="Cohort of">
              <Select value={source} onChange={e => { setSource(e.target.value); }}>
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Metric">
              <Select value={safeMetric} onChange={e => setMetric(e.target.value)}>
                {metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Window">
              <Segmented options={[{ value: 4, label: '4 mo' }, { value: 6, label: '6 mo' }, { value: 9, label: '9 mo' }]} value={maxOffset} onChange={setMaxOffset} />
            </Field>
          </div>
        </div>
        <CohortGrid computed={computed} />
        <div className="rb-muted">
          {metricMeta?.label}. {safeMetric === 'conversion' ? 'Each cell is the share of the cohort won by that month. ' : safeMetric === 'value' ? 'Each cell is cumulative won value by that month. ' : 'Each cell counts records created in that month. '}
          Darker cells are higher.
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function ReportBuilder() {
  useStore(); // subscribe for reactivity across the whole page
  const [tab, setTab] = useState('builder');
  return (
    <PageTransition className="col gap-3">
      <SectionHeader
        eyebrow="Reports v2"
        title="Report builder"
        sub="Drag fields to build any report, analyze cohorts, and schedule delivery to your inbox."
      />
      <Tabs
        tabs={[{ key: 'builder', label: 'Builder' }, { key: 'cohorts', label: 'Cohorts' }]}
        active={tab} onChange={setTab}
      />
      {tab === 'builder' ? <BuilderTab /> : <CohortsTab />}
    </PageTransition>
  );
}
