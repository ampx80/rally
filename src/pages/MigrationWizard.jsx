// MigrationWizard - Ardovo's talk-through data migration. Most migrations drag
// out for months of meetings and spreadsheets. Here it is one guided session:
// drop your files, Mira (our migration specialist) reads them and walks you
// through mapping, custom fields, and cleanup, you preview the exact records,
// then push to production. Nothing goes live until you say so. Multi-file,
// custom-column aware, and you can run it live with your whole team.
// Powered by src/lib/migration.js + migration-agent.js. NO em-dash / en-dash.
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader, Card, Button, Badge, Select, StatCard, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import {
  TARGETS, CUSTOM_TARGETS, parseAny, autoMap, mapDetails, analyze, buildStaged, applyToProduction,
  recordJob, inferTarget, suggestCustomFields, addCustomField, analyzeLinks, undoMigration, SAMPLE_CSV,
} from '../lib/migration.js';
import { createSession, updateSession } from '../lib/migration-session.js';
import MigrationSpecialist from '../components/migration/MigrationSpecialist.jsx';
import '../components/migration/migration.css';

const STAGES = [
  { key: 'upload', label: 'Drop', sub: 'Your files', icon: 'download' },
  { key: 'review', label: 'Review', sub: 'Map + clean', icon: 'beaker' },
  { key: 'stage', label: 'Preview', sub: 'See it land', icon: 'layers' },
  { key: 'push', label: 'Go live', sub: 'Production', icon: 'rocket' },
];

const defaultOptions = () => ({ splitNames: true, fixEmails: true, dedupe: true, dropMissingRequired: false });
let fid = 0;

export default function MigrationWizard() {
  const nav = useNavigate();
  const toast = useToast();
  const [stage, setStage] = useState('upload');
  const [files, setFiles] = useState([]);       // [{ id, name, raw, target, headers, rows, mapping, options, customMap, staged, result }]
  const [activeId, setActiveId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef(null);

  const active = useMemo(() => files.find(f => f.id === activeId) || null, [files, activeId]);

  const report = useMemo(() => {
    if (!active || !active.rows.length) return null;
    return analyze({ headers: active.headers, rows: active.rows, mapping: active.mapping, target: active.target });
  }, [active]);

  const suggestions = useMemo(() => {
    if (!active || !active.rows.length) return [];
    return suggestCustomFields({ headers: active.headers, rows: active.rows, mapping: active.mapping, target: active.target });
  }, [active]);

  const links = useMemo(() => (files.length > 1 ? analyzeLinks(files) : null), [files]);

  const updateActive = (patch) => {
    setFiles(fs => fs.map(f => f.id === activeId ? { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } : f));
  };

  const ingest = (name, text) => {
    const p = parseAny(text, { name });
    if (!p.headers.length) { toast(`Could not read any rows in ${name}. Check the file.`, 'risk'); return null; }
    const target = inferTarget(p.headers);
    const md = mapDetails(p.headers, target, p.rows);
    const entry = {
      id: `f${fid++}`, name: name || 'pasted.csv', raw: text, target, format: p.format,
      headers: p.headers, rows: p.rows, mapping: md.mapping, mapMeta: md,
      options: defaultOptions(), customMap: {}, staged: null, result: null,
    };
    return entry;
  };

  const addFiles = (list) => {
    const added = [];
    for (const item of list) added.push(item);
    if (!added.length) return;
    setFiles(fs => [...fs, ...added]);
    setActiveId(a => a || added[0].id);
    setStage('review');
    const total = added.reduce((s, f) => s + f.rows.length, 0);
    toast(`Loaded ${added.length} file${added.length > 1 ? 's' : ''}, ${total} rows. Mira analyzed them for you.`);
  };

  const onFiles = (fileList) => {
    const arr = Array.from(fileList || []).filter(f => /\.csv$/i.test(f.name) || f.type.includes('csv') || f.type.includes('text'));
    if (!arr.length) { toast('Drop CSV files (exports from your old system work great).', 'risk'); return; }
    let pending = arr.length; const collected = [];
    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const e = ingest(file.name, String(reader.result || ''));
        if (e) collected.push(e);
        if (--pending === 0) addFiles(collected);
      };
      reader.onerror = () => { if (--pending === 0) addFiles(collected); };
      reader.readAsText(file);
    });
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files); };
  const loadSample = () => { const e = ingest('sample-messy-export.csv', SAMPLE_CSV); if (e) addFiles([e]); };

  const setTarget = (t) => updateActive(f => { const md = mapDetails(f.headers, t, f.rows); return { target: t, mapping: md.mapping, mapMeta: md, customMap: {} }; });
  const setMap = (h, v) => updateActive(f => ({ mapping: { ...f.mapping, [h]: v } }));
  const setOpt = (k, v) => updateActive(f => ({ options: { ...f.options, [k]: v } }));

  const toggleCustom = (sug) => {
    updateActive(f => {
      const cm = { ...f.customMap };
      if (cm[sug.sourceHeader]) delete cm[sug.sourceHeader];
      else { cm[sug.sourceHeader] = sug.key; addCustomField(f.target, sug); }
      return { customMap: cm };
    });
  };
  const createAllCustom = () => {
    if (!active) return;
    updateActive(f => {
      const cm = { ...f.customMap };
      suggestions.forEach(s => { cm[s.sourceHeader] = s.key; addCustomField(f.target, s); });
      return { customMap: cm };
    });
  };

  const toPreview = () => {
    if (!active) return;
    const s = buildStaged({ rows: active.rows, mapping: active.mapping, target: active.target, options: active.options, customMap: active.customMap });
    updateActive({ staged: s });
    setStage('stage');
  };

  const push = () => {
    if (!active?.staged) return;
    const r = applyToProduction({ records: active.staged.records, target: active.target });
    updateActive({ result: r });
    recordJob({ target: active.target, total: active.rows.length, created: r.created, failed: r.failed });
    setStage('push');
    if (r.created) celebrate({ x: window.innerWidth / 2, y: 200, count: 80 });
    toast(`Pushed ${r.created} ${TARGETS[active.target].label.toLowerCase()} to production`);
  };

  const startGuidedSession = () => {
    const summaryFiles = files.length ? files.map(f => ({ name: f.name, target: f.target, rows: f.rows.length })) : [];
    const s = createSession({ title: 'Data migration session', target: active?.target || 'contact', files: summaryFiles });
    if (report) updateSession(s.id, { summary: { rows: report.total, readiness: report.readiness, duplicates: report.duplicateRows, missing: report.missingRequiredRows, files: summaryFiles } });
    toast('Session created. Share the link so your team can join.');
    nav(`/migrate/session/${s.id}`);
  };

  const reset = () => { setFiles([]); setActiveId(null); setStage('upload'); };
  const stageIdx = STAGES.findIndex(s => s.key === stage);
  const approvedCustom = active ? Object.keys(active.customMap).length : 0;

  return (
    <div className="fade-up mw-root">
      <SectionHeader
        title="Migration studio"
        sub="Most migrations drag out for months. This one is a single guided session. Drop your files, Mira walks you through every decision, you preview the exact records, then push. Nothing goes live until you say so."
        action={<div className="row gap-2">
          <Button variant="ghost" size="sm" onClick={startGuidedSession}><Icon name="users" size={15} /> Run a guided session</Button>
          {files.length ? <Button variant="ghost" size="sm" onClick={reset}><Icon name="rotateCcw" size={15} /> Start over</Button> : null}
        </div>}
      />

      <div className="mw-rail">
        {STAGES.map((s, i) => (
          <div key={s.key} className={`mw-stage${i === stageIdx ? ' is-on' : ''}${i < stageIdx ? ' is-done' : ''}`}>
            <span className="mw-stage-ic"><Icon name={i < stageIdx ? 'check' : s.icon} size={17} /></span>
            <div className="mw-stage-txt"><span className="mw-stage-label">{s.label}</span><span className="mw-stage-sub">{s.sub}</span></div>
            {i < STAGES.length - 1 && <span className="mw-stage-line" />}
          </div>
        ))}
      </div>

      <div className="mw-grid">
        <div className="col gap-3">
          {stage === 'upload' && (
            <div
              ref={dropRef} data-mw="dropzone"
              className={`mw-drop${dragging ? ' is-drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="mw-drop-ic"><Icon name="download" size={30} /></span>
              <div className="mw-drop-title">Drop your files here</div>
              <div className="mw-drop-sub">Exports from your old CRM, spreadsheets, contact lists. Messy is fine, that is the point. You can drop several at once.</div>
              <div className="row gap-2" style={{ justifyContent: 'center', marginTop: '.4rem' }}>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  <Icon name="download" size={16} /> Choose files
                  <input type="file" accept=".csv,text/csv" multiple onChange={e => onFiles(e.target.files)} style={{ display: 'none' }} />
                </label>
                <Button variant="ghost" onClick={loadSample}><Icon name="fileText" size={16} /> Try a messy sample</Button>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mw-files" data-mw="files">
              {files.map(f => (
                <button key={f.id} className={`mw-file${f.id === activeId ? ' is-active' : ''}`} onClick={() => { setActiveId(f.id); setStage(f.result ? 'push' : f.staged ? 'stage' : 'review'); }}>
                  <span className="mw-file-ic"><Icon name={TARGETS[f.target].icon} size={15} /></span>
                  <span className="mw-file-meta"><span className="mw-file-name">{f.name}</span><span className="mw-file-sub">{f.rows.length} rows, {TARGETS[f.target].label}</span></span>
                  {f.result ? <Badge tone="ok">live</Badge> : f.staged ? <Badge tone="info">staged</Badge> : null}
                </button>
              ))}
              <label className="mw-file mw-file--add">
                <Icon name="plus" size={16} /> Add more
                <input type="file" accept=".csv,text/csv" multiple onChange={e => onFiles(e.target.files)} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {links && links.summary?.length > 0 && stage !== 'push' && (
            <Card data-mw="links">
              <div className="mw-h" style={{ marginBottom: '.35rem' }}>How your files connect</div>
              <div className="mw-note">Mira matched records across your files, so relationships come over intact instead of breaking.</div>
              <div className="col gap-2" style={{ marginTop: '.7rem' }}>
                {links.summary.map((s, i) => (
                  <div key={i} className="mw-link-row"><Icon name="merge" size={16} /> <span><b>{s.matched}</b> of {s.total} {relLabel(s.type)}</span></div>
                ))}
              </div>
            </Card>
          )}

          {stage === 'review' && active && report && (
            <ReviewStage
              active={active} report={report} suggestions={suggestions}
              setTarget={setTarget} setMap={setMap} setOpt={setOpt}
              toggleCustom={toggleCustom} toPreview={toPreview}
            />
          )}

          {stage === 'stage' && active?.staged && (
            <StageStage active={active} onBack={() => setStage('review')} onPush={push} />
          )}

          {stage === 'push' && active?.result && (
            <PushStage
              active={active}
              onOpen={() => nav(active.target === 'contact' ? '/contacts' : active.target === 'deal' ? '/deals' : '/companies')}
              onMore={() => setStage('upload')}
              onUndo={() => {
                const r = undoMigration(active.result.batchId);
                toast(`Rolled back ${r?.removed || 0} record${(r?.removed || 0) === 1 ? '' : 's'}. Your book is back to before this import.`);
                updateActive({ result: null, staged: null });
                setStage('review');
              }}
            />
          )}
        </div>

        <MigrationSpecialist
          stage={stage} target={active?.target || 'contact'}
          files={files.map(f => ({ name: f.name, target: f.target, rows: f.rows.length }))}
          report={report} suggestions={suggestions}
          staged={active?.staged || null} result={active?.result || null}
          onCreateCustomFields={createAllCustom}
          onPreview={toPreview} onPush={push}
          onStartSession={startGuidedSession}
        />
      </div>

      <MigrationStyles />
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="row gap-2" style={{ alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '.25rem 0' }}>
      <span style={{ position: 'relative', width: 44, height: 25, flex: 'none', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--n-400, #98a1b0)', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
      <span className="fw-6" style={{ color: 'var(--ink)', fontSize: 15 }}>{label}</span>
    </button>
  );
}

function ReviewStage({ active, report, suggestions, setTarget, setMap, setOpt, toggleCustom, toPreview }) {
  const target = active.target;
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '.8rem' }}>
        <div data-mw="readiness"><StatCard label="Ready to import" value={report.readiness} format={n => `${Math.round(n)}%`} icon={<Icon name="check" size={19} />} accent={report.readiness > 70 ? 'var(--ok)' : 'var(--warn)'} /></div>
        <StatCard label="Rows found" value={report.total} icon={<Icon name="list" size={19} />} />
        <div data-mw="duplicates"><StatCard label="Duplicates" value={report.duplicateRows} icon={<Icon name="merge" size={19} />} accent="var(--warn)" /></div>
        <StatCard label="Missing required" value={report.missingRequiredRows} icon={<Icon name="activity" size={19} />} accent="var(--risk)" />
      </div>

      <Card data-mw="mapping">
        <div className="row between" style={{ alignItems: 'center', marginBottom: '.8rem' }}>
          <div className="mw-h">Map your columns</div>
          <label className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="fw-6" style={{ color: 'var(--n-600)', fontSize: 14 }}>Importing as</span>
            <Select value={target} onChange={e => setTarget(e.target.value)} style={{ width: 170 }}>
              {Object.entries(TARGETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </label>
        </div>
        <div className="col gap-2">
          {active.headers.map(h => {
            const conf = active.mapMeta?.confidence?.[h];
            const reason = active.mapMeta?.reasons?.[h];
            const mapped = !!active.mapping[h];
            return (
              <div key={h} className={`mw-map${!mapped ? ' is-unmapped' : ''}`}>
                <span className="mw-map-src">{h} {!mapped && <Badge tone="warn">unmapped</Badge>}</span>
                {mapped && conf != null && (
                  <span className={`mw-conf ${conf >= 0.8 ? 'is-sure' : 'is-maybe'}`} title={reason || ''}>
                    <Icon name={conf >= 0.8 ? 'check' : 'activity'} size={12} /> {Math.round(conf * 100)}%
                  </span>
                )}
                <Icon name="chevronRight" size={15} className="muted" />
                <Select value={active.mapping[h] || ''} onChange={e => setMap(h, e.target.value)} style={{ minWidth: 180 }}>
                  <option value="">Do not import</option>
                  {TARGETS[target].fields.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                </Select>
              </div>
            );
          })}
        </div>
        {report.missingTargets.length > 0 && (
          <div className="mw-flag" data-mw="required-flag"><Icon name="activity" size={15} /> Required field{report.missingTargets.length > 1 ? 's' : ''} not mapped: {report.missingTargets.join(', ')}</div>
        )}
      </Card>

      {suggestions.length > 0 && (
        <Card data-mw="custom">
          <div className="mw-h" style={{ marginBottom: '.35rem' }}>Keep the rest as custom fields</div>
          <div className="mw-note">These columns did not match an Ardovo field. Rather than drop them, keep each as a custom field on your {CUSTOM_TARGETS.find(c => c.key === target)?.label || 'record view'}. Nothing is lost.</div>
          <div className="col gap-2" style={{ marginTop: '.7rem' }}>
            {suggestions.map(s => {
              const on = !!active.customMap[s.sourceHeader];
              return (
                <button key={s.sourceHeader} type="button" className={`mw-custom${on ? ' is-on' : ''}`} onClick={() => toggleCustom(s)}>
                  <span className="mw-custom-check">{on ? <Icon name="check" size={15} /> : <Icon name="plus" size={15} />}</span>
                  <span className="mw-custom-meta">
                    <span className="mw-custom-name">{s.label} <Badge tone="info">{s.type}</Badge></span>
                    <span className="mw-custom-sub">Filled on {s.fillRate}% of rows{s.samples.length ? ` - e.g. ${s.samples.slice(0, 2).join(', ')}` : ''}</span>
                  </span>
                  <span className="mw-custom-cta">{on ? 'Keeping' : 'Keep'}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card data-mw="cleanse">
        <div className="mw-h" style={{ marginBottom: '.2rem' }}>Clean it up on the way in</div>
        <div className="mw-note" style={{ marginBottom: '.7rem' }}>Mira applies these as the data lands. All reversible until you push.</div>
        <div className="col gap-2">
          <Toggle on={active.options.splitNames} onChange={v => setOpt('splitNames', v)} label="Split full names into first + last" />
          <Toggle on={active.options.fixEmails} onChange={v => setOpt('fixEmails', v)} label="Keep the first email, lowercase it" />
          <Toggle on={active.options.dedupe} onChange={v => setOpt('dedupe', v)} label="Merge duplicate records" />
          <Toggle on={active.options.dropMissingRequired} onChange={v => setOpt('dropMissingRequired', v)} label="Set aside rows missing a required field" />
        </div>
        <div className="row gap-2" style={{ marginTop: '1.1rem' }} data-mw="preview">
          <Button variant="primary" onClick={toPreview}><Icon name="layers" size={17} /> Preview clean data</Button>
        </div>
      </Card>
    </>
  );
}

function StageStage({ active, onBack, onPush }) {
  const target = active.target;
  const staged = active.staged;
  const customCols = Object.values(active.customMap);
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '.8rem' }}>
        <StatCard label="Ready to import" value={staged.records.length} icon={<Icon name="check" size={19} />} accent="var(--ok)" />
        <StatCard label="Duplicates merged" value={staged.problems.droppedDupes} icon={<Icon name="merge" size={19} />} />
        <StatCard label="Rows set aside" value={staged.problems.droppedMissing} icon={<Icon name="x" size={19} />} />
      </div>
      <Card>
        <div className="mw-h" style={{ marginBottom: '.6rem' }}>Preview (first 8 of {staged.records.length})</div>
        <div className="mw-table-wrap">
          <table className="mw-table">
            <thead><tr>{TARGETS[target].fields.map(f => <th key={f.key}>{f.label}</th>)}{customCols.map(k => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>
              {staged.records.slice(0, 8).map((rec, i) => (
                <tr key={i}>
                  {TARGETS[target].fields.map(f => <td key={f.key}>{rec[f.key] || <span className="muted">-</span>}</td>)}
                  {customCols.map(k => <td key={k}>{rec.custom?.[k] || <span className="muted">-</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row gap-2" style={{ marginTop: '1.1rem' }} data-mw="push">
          <Button variant="ghost" onClick={onBack}><Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Back to review</Button>
          <Button variant="primary" disabled={!staged.records.length} onClick={onPush}><Icon name="rocket" size={17} /> Push {staged.records.length} to production</Button>
        </div>
      </Card>
    </>
  );
}

function PushStage({ active, onOpen, onMore, onUndo }) {
  const target = active.target;
  return (
    <Card className="col" style={{ gap: '.9rem', alignItems: 'center', textAlign: 'center', padding: '2.6rem' }}>
      <span style={{ width: 72, height: 72, borderRadius: 22, display: 'grid', placeItems: 'center', background: 'var(--ok-bg)', color: 'var(--ok)' }}><Icon name="check" size={34} /></span>
      <h2 style={{ margin: 0, fontSize: '1.7rem', color: 'var(--ink)' }}>Migration complete</h2>
      <p className="muted" style={{ maxWidth: 480, margin: 0, fontSize: 16, lineHeight: 1.55 }}>
        {active.result.created} {TARGETS[target].label.toLowerCase()} are now live in your Ardovo book{active.result.failed ? `, ${active.result.failed} could not be created` : ''}. Real records you can open, edit, and work right now.
      </p>
      <div className="row gap-2" style={{ marginTop: '.5rem' }}>
        <Button variant="primary" onClick={onOpen}><Icon name="chevronRight" size={17} /> Open {TARGETS[target].label}</Button>
        <Button variant="ghost" onClick={onMore}><Icon name="download" size={17} /> Migrate more</Button>
      </div>
      <button className="mw-undo" onClick={onUndo}><Icon name="rotateCcw" size={14} /> Undo this migration</button>
    </Card>
  );
}

function relLabel(type) {
  if (type === 'contact-company') return 'contacts linked to an account';
  if (type === 'deal-company') return 'deals linked to an account';
  if (type === 'deal-contact') return 'deals linked to a contact';
  return 'records linked';
}

function MigrationStyles() {
  return (
    <style>{`
    .mw-root { --mw-fs: 16px; }
    .mw-rail { display: flex; align-items: center; gap: 0; margin-bottom: 1.6rem; flex-wrap: wrap; }
    .mw-stage { display: flex; align-items: center; gap: 11px; position: relative; padding-right: 8px; }
    .mw-stage-ic { width: 40px; height: 40px; border-radius: 12px; flex: none; display: grid; place-items: center; background: var(--n-100); color: var(--n-600); }
    .mw-stage.is-on .mw-stage-ic { background: var(--accent); color: #fff; box-shadow: 0 6px 16px -6px var(--accent); }
    .mw-stage.is-done .mw-stage-ic { background: var(--ok-bg); color: var(--ok); }
    .mw-stage-txt { display: flex; flex-direction: column; line-height: 1.2; }
    .mw-stage-label { font-weight: 800; font-size: 15px; color: var(--ink); }
    .mw-stage-sub { font-size: 13px; color: var(--n-600); }
    .mw-stage-line { width: 36px; height: 2px; background: var(--line-strong); margin: 0 12px 0 14px; }
    .mw-stage.is-done .mw-stage-line { background: var(--ok); }
    @media (max-width: 560px) { .mw-stage-line { display: none; } .mw-rail { gap: 12px; } }

    .mw-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 1.1rem; align-items: start; }
    @media (max-width: 980px) { .mw-grid { grid-template-columns: 1fr; } }

    .mw-drop { border: 2px dashed var(--line-strong); border-radius: 18px; padding: 2.6rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .5rem; transition: all .18s; background: var(--n-25, #fafbfc); }
    .mw-drop.is-drag { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); transform: scale(1.005); }
    .mw-drop-ic { width: 66px; height: 66px; border-radius: 20px; display: grid; place-items: center; background: linear-gradient(135deg, var(--accent), var(--accent-700, #096b61)); color: #fff; margin-bottom: .3rem; }
    .mw-drop-title { font-size: 21px; font-weight: 800; color: var(--ink); }
    .mw-drop-sub { font-size: 15px; color: var(--n-600); max-width: 460px; line-height: 1.55; }

    .mw-files { display: flex; flex-wrap: wrap; gap: .6rem; }
    .mw-file { display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 12px; border: 1px solid var(--line-strong); background: var(--surface, #fff); cursor: pointer; font-family: inherit; transition: all .16s; }
    .mw-file:hover { border-color: var(--accent); }
    .mw-file.is-active { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
    .mw-file-ic { width: 30px; height: 30px; border-radius: 9px; flex: none; display: grid; place-items: center; background: var(--n-100); color: var(--n-700); }
    .mw-file-meta { display: flex; flex-direction: column; line-height: 1.25; text-align: left; }
    .mw-file-name { font-size: 14.5px; font-weight: 700; color: var(--ink); }
    .mw-file-sub { font-size: 12.5px; color: var(--n-600); }
    .mw-file--add { color: var(--n-600); font-weight: 700; font-size: 14px; border-style: dashed; }

    .mw-h { font-weight: 800; font-size: 17px; color: var(--ink); }
    .mw-note { font-size: 14.5px; color: var(--n-600); line-height: 1.55; }

    .mw-map { display: flex; align-items: center; gap: 12px; padding: 3px 0; }
    .mw-map-src { flex: 1; min-width: 0; font-size: 15.5px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mw-map.is-unmapped .mw-map-src { color: var(--warn); }
    .mw-flag { display: flex; align-items: center; gap: 9px; font-size: 14.5px; font-weight: 700; color: var(--risk); background: var(--risk-bg, #fdecea); border-radius: 10px; padding: 11px 13px; margin-top: 1rem; }

    .mw-custom { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--line-strong); background: var(--n-25, #fafbfc); cursor: pointer; font-family: inherit; text-align: left; transition: all .16s; }
    .mw-custom:hover { border-color: var(--ai); }
    .mw-custom.is-on { border-color: var(--ai); background: color-mix(in srgb, var(--ai) 8%, transparent); }
    .mw-custom-check { width: 28px; height: 28px; border-radius: 8px; flex: none; display: grid; place-items: center; background: var(--n-100); color: var(--n-600); }
    .mw-custom.is-on .mw-custom-check { background: var(--ai); color: #fff; }
    .mw-custom-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .mw-custom-name { font-size: 15px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; }
    .mw-custom-sub { font-size: 13px; color: var(--n-600); }
    .mw-custom-cta { font-size: 13.5px; font-weight: 800; color: var(--ai); flex: none; }

    .mw-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
    .mw-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
    .mw-table th { text-align: left; padding: 10px 13px; background: var(--n-25); color: var(--n-600); font-weight: 700; font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--line); white-space: nowrap; }
    .mw-table td { padding: 10px 13px; border-bottom: 1px solid var(--line); color: var(--ink); white-space: nowrap; }
    .mw-table tr:last-child td { border-bottom: none; }

    .mw-conf { display: inline-flex; align-items: center; gap: 3px; flex: none; font-size: 11.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
    .mw-conf.is-sure { color: var(--ok); background: var(--ok-bg, #e7f6ee); }
    .mw-conf.is-maybe { color: var(--warn); background: var(--warn-bg, #fdf3e1); }
    .mw-link-row { display: flex; align-items: center; gap: 9px; font-size: 15px; color: var(--ink-2, #465063); }
    .mw-link-row b { color: var(--ink); }
    .mw-undo { margin-top: .4rem; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--n-600); background: transparent; border: none; cursor: pointer; }
    .mw-undo:hover { color: var(--risk); text-decoration: underline; }
    `}</style>
  );
}
