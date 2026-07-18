// MigrationWizard - Rally's talk-through data migration flow. Replaces the
// months-long conversion project with four stages the customer never runs
// alone: Upload (Development) -> Review + cleanse (Testing) -> Stage -> Push
// (Production). Rally analyzes the export for unmapped columns, empty required
// fields, jammed data, and duplicates, and the customer fixes it all in-app
// before anything touches the live book. A migration assistant coaches the
// whole way. Powered by src/lib/migration.js. NO em-dash / en-dash.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SectionHeader, Card, Button, Badge, Select, StatCard, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import {
  TARGETS, parseCsv, autoMap, analyze, buildStaged, applyToProduction, recordJob, SAMPLE_CSV,
} from '../lib/migration.js';

const STAGES = [
  { key: 'upload', label: 'Development', sub: 'Upload', icon: 'download' },
  { key: 'review', label: 'Testing', sub: 'Review + cleanse', icon: 'beaker' },
  { key: 'stage', label: 'Staging', sub: 'Preview', icon: 'layers' },
  { key: 'push', label: 'Production', sub: 'Go live', icon: 'rocket' },
];

const defaultOptions = () => ({ splitNames: true, fixEmails: true, dedupe: true, dropMissingRequired: false });

export default function MigrationWizard() {
  const nav = useNavigate();
  const toast = useToast();
  const [stage, setStage] = useState('upload');
  const [target, setTarget] = useState('contact');
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [options, setOptions] = useState(defaultOptions());
  const [staged, setStaged] = useState(null);
  const [result, setResult] = useState(null);

  const report = useMemo(() => {
    if (!parsed.rows.length) return null;
    return analyze({ ...parsed, mapping, target });
  }, [parsed, mapping, target]);

  const doParse = (text) => {
    const p = parseCsv(text);
    if (!p.headers.length) { toast('Could not read any rows. Check the CSV.', 'risk'); return; }
    setParsed(p);
    setMapping(autoMap(p.headers, target));
    setStage('review');
    toast(`Loaded ${p.rows.length} rows. Rally analyzed them for you.`);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const t = String(reader.result || ''); setRaw(t); doParse(t); };
    reader.readAsText(file);
  };

  const toPreview = () => {
    const s = buildStaged({ rows: parsed.rows, mapping, target, options });
    setStaged(s);
    setStage('stage');
  };

  const push = () => {
    if (!staged) return;
    const r = applyToProduction({ records: staged.records, target });
    setResult(r);
    recordJob({ target, total: parsed.rows.length, created: r.created, failed: r.failed });
    setStage('push');
    if (r.created) celebrate({ x: window.innerWidth / 2, y: 200, count: 80 });
    toast(`Pushed ${r.created} ${TARGETS[target].label.toLowerCase()} to production`);
  };

  const reset = () => {
    setStage('upload'); setRaw(''); setParsed({ headers: [], rows: [] });
    setMapping({}); setOptions(defaultOptions()); setStaged(null); setResult(null);
  };

  const stageIdx = STAGES.findIndex(s => s.key === stage);

  return (
    <div className="fade-up">
      <SectionHeader
        title="Migration wizard"
        sub="Bring your data into Rally without a year-long project. Upload once, cleanse it in the app, stage it, then push to production. You never touch a spreadsheet alone."
        action={stage !== 'upload' ? <Button variant="ghost" size="sm" onClick={reset}><Icon name="rotateCcw" size={15} /> Start over</Button> : null}
      />

      {/* Stage rail */}
      <div className="mw-rail">
        {STAGES.map((s, i) => (
          <div key={s.key} className={`mw-stage${i === stageIdx ? ' is-on' : ''}${i < stageIdx ? ' is-done' : ''}`}>
            <span className="mw-stage-ic"><Icon name={i < stageIdx ? 'check' : s.icon} size={16} /></span>
            <div className="mw-stage-txt"><span className="mw-stage-label">{s.label}</span><span className="mw-stage-sub">{s.sub}</span></div>
            {i < STAGES.length - 1 && <span className="mw-stage-line" />}
          </div>
        ))}
      </div>

      {stage === 'upload' && (
        <div className="mw-grid">
          <Card className="col" style={{ gap: '.9rem' }}>
            <div className="row gap-2" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label className="col gap-1">
                <span className="t-sm fw-6" style={{ color: 'var(--ink)' }}>What are you importing?</span>
                <Select value={target} onChange={e => setTarget(e.target.value)} style={{ width: 200 }}>
                  {Object.entries(TARGETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </label>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                <Icon name="download" size={15} /> Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
              </label>
              <Button variant="ghost" size="sm" onClick={() => { setRaw(SAMPLE_CSV); }}><Icon name="fileText" size={15} /> Load a messy sample</Button>
            </div>
            <textarea className="mw-ta" rows={12} value={raw} onChange={e => setRaw(e.target.value)}
              placeholder={'Paste your CSV export here, headers on the first row...\n\nName,Email,Phone,Company\nJordan Avery,jordan@acme.com,555-1234,Acme'} />
            <div className="row gap-2">
              <Button variant="primary" disabled={!raw.trim()} onClick={() => doParse(raw)}><Icon name="beaker" size={16} /> Analyze my data</Button>
            </div>
          </Card>
          <Assistant stage="upload" />
        </div>
      )}

      {stage === 'review' && report && (
        <div className="mw-grid">
          <div className="col gap-3">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '.75rem' }}>
              <StatCard label="Rows found" value={report.total} icon={<Icon name="list" size={18} />} />
              <StatCard label="Ready to import" value={report.readiness} format={n => `${Math.round(n)}%`} icon={<Icon name="check" size={18} />} accent={report.readiness > 70 ? 'var(--ok)' : 'var(--warn)'} />
              <StatCard label="Duplicates" value={report.duplicateRows} icon={<Icon name="merge" size={18} />} accent="var(--warn)" />
              <StatCard label="Missing required" value={report.missingRequiredRows} icon={<Icon name="activity" size={18} />} accent="var(--risk)" />
            </div>

            <Card>
              <div className="fw-6" style={{ marginBottom: '.7rem', color: 'var(--ink)' }}>Map your columns</div>
              <div className="col gap-2">
                {parsed.headers.map(h => (
                  <div key={h} className="mw-map">
                    <span className="mw-map-src">{h} {!mapping[h] && <Badge tone="warn">unmapped</Badge>}</span>
                    <Icon name="chevronRight" size={14} className="muted" />
                    <Select value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))} style={{ minWidth: 170 }}>
                      <option value="">Do not import</option>
                      {TARGETS[target].fields.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
              {report.missingTargets.length > 0 && (
                <div className="mw-flag"><Icon name="activity" size={14} /> Required field{report.missingTargets.length > 1 ? 's' : ''} not mapped: {report.missingTargets.join(', ')}</div>
              )}
            </Card>

            {report.jammed.length > 0 && (
              <Card>
                <div className="fw-6" style={{ marginBottom: '.6rem', color: 'var(--ink)' }}>What Rally found</div>
                <div className="col gap-2">
                  {report.jammed.map((j, i) => (
                    <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--warn)', flex: 'none' }} />
                      <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{j.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <div className="fw-6" style={{ marginBottom: '.6rem', color: 'var(--ink)' }}>Cleanse on the way in</div>
              <div className="col gap-2">
                <Toggle on={options.splitNames} onChange={v => setOptions(o => ({ ...o, splitNames: v }))} label="Split full names into first + last" />
                <Toggle on={options.fixEmails} onChange={v => setOptions(o => ({ ...o, fixEmails: v }))} label="Keep the first email, lowercase it" />
                <Toggle on={options.dedupe} onChange={v => setOptions(o => ({ ...o, dedupe: v }))} label="Merge duplicate records" />
                <Toggle on={options.dropMissingRequired} onChange={v => setOptions(o => ({ ...o, dropMissingRequired: v }))} label="Skip rows missing a required field" />
              </div>
              <div className="row gap-2" style={{ marginTop: '1rem' }}>
                <Button variant="primary" onClick={toPreview}><Icon name="layers" size={16} /> Preview clean data</Button>
              </div>
            </Card>
          </div>
          <Assistant stage="review" report={report} target={target} />
        </div>
      )}

      {stage === 'stage' && staged && (
        <div className="mw-grid">
          <div className="col gap-3">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '.75rem' }}>
              <StatCard label="Ready to import" value={staged.records.length} icon={<Icon name="check" size={18} />} accent="var(--ok)" />
              <StatCard label="Duplicates merged" value={staged.problems.droppedDupes} icon={<Icon name="merge" size={18} />} />
              <StatCard label="Rows skipped" value={staged.problems.droppedMissing} icon={<Icon name="x" size={18} />} />
            </div>
            <Card>
              <div className="fw-6" style={{ marginBottom: '.6rem', color: 'var(--ink)' }}>Preview (first 8 of {staged.records.length})</div>
              <div className="mw-table-wrap">
                <table className="mw-table">
                  <thead><tr>{TARGETS[target].fields.map(f => <th key={f.key}>{f.label}</th>)}</tr></thead>
                  <tbody>
                    {staged.records.slice(0, 8).map((rec, i) => (
                      <tr key={i}>{TARGETS[target].fields.map(f => <td key={f.key}>{rec[f.key] || <span className="muted">-</span>}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row gap-2" style={{ marginTop: '1rem' }}>
                <Button variant="ghost" onClick={() => setStage('review')}><Icon name="chevronRight" size={15} style={{ transform: 'rotate(180deg)' }} /> Back to cleanse</Button>
                <Button variant="primary" disabled={!staged.records.length} onClick={push}><Icon name="rocket" size={16} /> Push {staged.records.length} to production</Button>
              </div>
            </Card>
          </div>
          <Assistant stage="stage" staged={staged} target={target} />
        </div>
      )}

      {stage === 'push' && result && (
        <Card className="col" style={{ gap: '.8rem', alignItems: 'center', textAlign: 'center', padding: '2.5rem' }}>
          <span style={{ width: 68, height: 68, borderRadius: 20, display: 'grid', placeItems: 'center', background: 'var(--ok-bg)', color: 'var(--ok)' }}><Icon name="check" size={32} /></span>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--ink)' }}>Migration complete</h2>
          <p className="muted" style={{ maxWidth: 440, margin: 0 }}>
            {result.created} {TARGETS[target].label.toLowerCase()} are now live in your Rally book{result.failed ? `, ${result.failed} could not be created` : ''}. They are real records you can open, edit, and work right now.
          </p>
          <div className="row gap-2" style={{ marginTop: '.5rem' }}>
            <Button variant="primary" onClick={() => nav(target === 'contact' ? '/contacts' : '/companies')}><Icon name="chevronRight" size={16} /> Open {TARGETS[target].label}</Button>
            <Button variant="ghost" onClick={reset}><Icon name="download" size={16} /> Migrate more</Button>
          </div>
        </Card>
      )}

      <MigrationStyles />
    </div>
  );
}

function Assistant({ stage, report, staged, target }) {
  const lines = useMemo(() => {
    if (stage === 'upload') return [
      'Paste a CSV export or upload a file. Even a messy one - that is the point.',
      'Not sure? Load the messy sample and watch how Rally cleans it up.',
      'I will map your columns automatically and flag anything that needs a human.',
    ];
    if (stage === 'review' && report) {
      const out = [`I read ${report.total} rows. About ${report.readiness}% are ready as-is.`];
      if (report.unmapped.length) out.push(`${report.unmapped.length} column${report.unmapped.length > 1 ? 's are' : ' is'} not mapped yet. Map or skip ${report.unmapped.length > 1 ? 'them' : 'it'} on the left.`);
      if (report.missingTargets.length) out.push(`Map a column to ${report.missingTargets.join(' and ')} - it is required.`);
      if (report.duplicateRows) out.push(`${report.duplicateRows} duplicate${report.duplicateRows > 1 ? 's' : ''} found. Keep "merge duplicates" on and I will collapse them.`);
      report.jammed.forEach(j => out.push(j.label + '. I can fix that with the toggles below.'));
      if (out.length === 1) out.push('This looks clean. Preview it and push when you are ready.');
      return out;
    }
    if (stage === 'stage' && staged) return [
      `Staged ${staged.records.length} clean ${TARGETS[target].label.toLowerCase()}.`,
      staged.problems.droppedDupes ? `Merged ${staged.problems.droppedDupes} duplicate${staged.problems.droppedDupes > 1 ? 's' : ''}.` : 'No duplicates left.',
      staged.problems.droppedMissing ? `Skipped ${staged.problems.droppedMissing} row${staged.problems.droppedMissing > 1 ? 's' : ''} missing required data.` : 'Every row has its required fields.',
      'Nothing is live yet. Review the preview, then push to production.',
    ].filter(Boolean);
    return [];
  }, [stage, report, staged, target]);

  const ask = () => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt: 'I am migrating data into Rally. Walk me through mapping columns and cleaning up duplicates.' } }));

  return (
    <Card className="mw-assistant col" style={{ gap: '.7rem' }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="mw-assistant-mark"><Icon name="sparkles" size={16} /></span>
        <div className="fw-6" style={{ color: 'var(--ink)' }}>Migration assistant</div>
      </div>
      <div className="col gap-2">
        {lines.map((l, i) => <div key={i} className="mw-assistant-line">{l}</div>)}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={ask} style={{ alignSelf: 'flex-start', marginTop: '.2rem' }}><Icon name="mic" size={14} /> Talk it through with Rook</button>
    </Card>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="row gap-2" style={{ alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '.2rem 0' }}>
      <span style={{ position: 'relative', width: 40, height: 23, flex: 'none', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--n-400, #98a1b0)', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
      <span className="t-sm fw-6" style={{ color: 'var(--ink)' }}>{label}</span>
    </button>
  );
}

function MigrationStyles() {
  return (
    <style>{`
    .mw-rail { display: flex; align-items: center; gap: 0; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .mw-stage { display: flex; align-items: center; gap: 10px; position: relative; padding-right: 8px; }
    .mw-stage-ic { width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center; background: var(--n-100); color: var(--n-600); }
    .mw-stage.is-on .mw-stage-ic { background: var(--accent); color: #fff; box-shadow: 0 6px 16px -6px var(--accent); }
    .mw-stage.is-done .mw-stage-ic { background: var(--ok-bg); color: var(--ok); }
    .mw-stage-txt { display: flex; flex-direction: column; line-height: 1.2; }
    .mw-stage-label { font-weight: 800; font-size: 13.5px; color: var(--ink); }
    .mw-stage-sub { font-size: 11.5px; color: var(--n-600); }
    .mw-stage-line { width: 34px; height: 2px; background: var(--line-strong); margin: 0 12px 0 14px; }
    .mw-stage.is-done .mw-stage-line { background: var(--ok); }
    @media (max-width: 560px) { .mw-stage-line { display: none; } .mw-rail { gap: 12px; } }

    .mw-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1rem; align-items: start; }
    @media (max-width: 900px) { .mw-grid { grid-template-columns: 1fr; } }
    .mw-ta { width: 100%; border: 1px solid var(--line-strong); border-radius: 12px; padding: 12px 14px; font-size: 13.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ink); background: var(--n-25); outline: none; resize: vertical; box-sizing: border-box; }
    .mw-ta:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(14,159,143,.15); }

    .mw-map { display: flex; align-items: center; gap: 10px; }
    .mw-map-src { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mw-flag { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--risk); background: var(--risk-bg, #fdecea); border-radius: 9px; padding: 9px 11px; margin-top: .8rem; }

    .mw-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
    .mw-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .mw-table th { text-align: left; padding: 9px 12px; background: var(--n-25); color: var(--n-600); font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--line); white-space: nowrap; }
    .mw-table td { padding: 9px 12px; border-bottom: 1px solid var(--line); color: var(--ink); white-space: nowrap; }
    .mw-table tr:last-child td { border-bottom: none; }

    .mw-assistant { position: sticky; top: 84px; background: var(--ai-50); border-color: color-mix(in srgb, var(--ai) 30%, var(--ai-50)); }
    .mw-assistant-mark { width: 30px; height: 30px; border-radius: 9px; flex: none; display: grid; place-items: center; background: linear-gradient(135deg, var(--ai), var(--ai-600)); color: #fff; }
    .mw-assistant-line { font-size: 13px; line-height: 1.5; color: var(--ink-2); padding-left: 12px; position: relative; }
    .mw-assistant-line::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--ai); }
    `}</style>
  );
}
