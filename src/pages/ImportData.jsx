// Import / migrate - the Salesforce Data Import Wizard equivalent. A five-step
// flow: pick the object, choose the source + drop a CSV, map columns onto the
// Rally field registry (auto-mapped, per-source presets), preview + dedupe,
// then write real records through the store. Everything maps onto the same
// field registry that powers the record editors, so imported data is native.
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SectionHeader, Card, Button, Badge, Select, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import MigratePanel from '../components/migrate/MigratePanel.jsx';
import {
  IMPORT_OBJECTS, importObject, SOURCES, parseCsv, autoMap, targetFields, runImport,
} from '../lib/importer.js';

const STEPS = ['Object', 'Upload', 'Map', 'Preview', 'Done'];

function StepRail({ step }) {
  return (
    <div className="row gap-2 wrap" style={{ alignItems: 'center', marginBottom: '1.25rem' }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="row gap-2" style={{ alignItems: 'center', opacity: i <= step ? 1 : 0.45 }}>
            <span className="row center" style={{
              width: 26, height: 26, borderRadius: 999, flex: 'none', fontSize: 13, fontWeight: 700,
              background: i < step ? 'var(--ok)' : i === step ? 'var(--accent)' : 'var(--surface-2, #eef0f5)',
              color: i <= step ? '#fff' : 'var(--n-600)',
            }}>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
            <span className="fw-6" style={{ fontSize: 14 }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <span style={{ width: 22, height: 2, background: 'var(--line)', flex: 'none' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ImportData() {
  const nav = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [objectType, setObjectType] = useState('');
  const [sourceId, setSourceId] = useState('generic');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, records }
  const [mapping, setMapping] = useState({});
  const [dedupe, setDedupe] = useState(true);
  const [result, setResult] = useState(null);

  const tf = useMemo(() => (objectType ? targetFields(objectType) : []), [objectType]);
  const requiredKeys = useMemo(() => tf.filter(f => f.required).map(f => f.key), [tf]);
  const mappedKeys = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const missingRequired = requiredKeys.filter(k => !mappedKeys.has(k));

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, records } = parseCsv(String(e.target.result || ''));
      if (!headers.length) { toast('That file has no readable rows.', 'risk'); return; }
      setParsed({ headers, records });
      setMapping(autoMap(objectType, headers));
      setStep(2);
    };
    reader.readAsText(file);
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function doImport() {
    const res = runImport({ objectType, records: parsed.records, mapping, dedupe });
    setResult(res);
    setStep(4);
    toast(`Imported ${res.created} ${importObject(objectType).label.toLowerCase()}.`, 'ok');
  }

  const autoCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="fade-up col gap-3" style={{ maxWidth: 940 }}>
      <SectionHeader
        eyebrow="Data import + migration"
        title="Import data"
        sub="Bring your world into Rally. Upload a CSV or migrate straight from Salesforce, HubSpot, or Pipedrive."
        action={<Button variant="quiet" onClick={() => nav('/settings')}><Icon name="settings" size={16} /> Connections</Button>}
      />

      <Card className="col" style={{ gap: '1.1rem' }}>
        <StepRail step={step} />

        {/* STEP 0 - object */}
        {step === 0 && (
          <div className="col gap-3">
            <div className="col gap-1"><h4 style={{ margin: 0 }}>What are you importing?</h4>
              <span className="muted t-sm">Pick the object these rows become. You can run the wizard again for each type.</span></div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.8rem' }}>
              {IMPORT_OBJECTS.map(o => (
                <button key={o.id} onClick={() => { setObjectType(o.id); setStep(1); }}
                  className="col gap-2" style={{
                    textAlign: 'left', padding: '1.1rem', borderRadius: 14, cursor: 'pointer',
                    border: `1px solid ${objectType === o.id ? 'var(--accent)' : 'var(--line)'}`, background: 'var(--surface)',
                  }}>
                  <span className="row center" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft, rgba(91,75,245,.1))', color: 'var(--accent)', flex: 'none' }}>
                    <Icon name={o.icon} size={20} />
                  </span>
                  <span className="fw-7">{o.label}</span>
                  <span className="t-xs muted">Dedupes on {o.dedupeKey}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 - source + upload */}
        {step === 1 && (
          <div className="col gap-3">
            <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
              <div className="col gap-1"><h4 style={{ margin: 0 }}>Where is it coming from?</h4>
                <span className="muted t-sm">We pre-map the columns each tool exports. Pick the closest match.</span></div>
              <Badge tone="accent">{importObject(objectType)?.label}</Badge>
            </div>
            <div className="row gap-2 wrap">
              {SOURCES.map(s => (
                <button key={s.id} onClick={() => setSourceId(s.id)} className="col gap-1"
                  style={{ padding: '.7rem .9rem', borderRadius: 11, cursor: 'pointer', minWidth: 150, textAlign: 'left',
                    border: `1px solid ${sourceId === s.id ? 'var(--accent)' : 'var(--line)'}`, background: 'var(--surface)' }}>
                  <span className="fw-6">{s.label}</span>
                  <span className="t-xs muted">{s.hint}</span>
                </button>
              ))}
            </div>
            <div onDragOver={e => e.preventDefault()} onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="col center gap-2" style={{
                padding: '2.4rem 1rem', borderRadius: 16, border: '2px dashed var(--line2, #d7dce3)',
                background: 'var(--surface-2, #f7f8fc)', cursor: 'pointer', textAlign: 'center',
              }}>
              <span className="row center" style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft, rgba(91,75,245,.1))', color: 'var(--accent)' }}>
                <Icon name="download" size={24} />
              </span>
              <span className="fw-7" style={{ fontSize: 17 }}>Drop a CSV here, or click to choose</span>
              <span className="t-sm muted">First row is treated as column headers. Up to a few thousand rows.</span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])} />
            </div>
            <div className="row gap-2"><Button variant="quiet" onClick={() => setStep(0)}>Back</Button></div>
          </div>
        )}

        {/* STEP 2 - mapping */}
        {step === 2 && parsed && (
          <div className="col gap-3">
            <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
              <div className="col gap-1"><h4 style={{ margin: 0 }}>Map your columns</h4>
                <span className="muted t-sm">{autoCount} of {parsed.headers.length} columns auto-mapped. Adjust any row.</span></div>
              <div className="row gap-2"><Badge>{parsed.records.length} rows</Badge>{missingRequired.length > 0 && <Badge tone="warn">Missing: {missingRequired.join(', ')}</Badge>}</div>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <th style={{ padding: '.6rem .9rem' }}>CSV column</th>
                  <th style={{ padding: '.6rem .9rem' }}>Sample</th>
                  <th style={{ padding: '.6rem .9rem' }}>Rally field</th>
                </tr></thead>
                <tbody>
                  {parsed.headers.map(h => (
                    <tr key={h} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '.55rem .9rem', fontWeight: 600 }}>{h}</td>
                      <td style={{ padding: '.55rem .9rem', color: 'var(--n-600)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsed.records[0]?.[h] || <span className="muted">empty</span>}</td>
                      <td style={{ padding: '.4rem .9rem' }}>
                        <Select value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))} style={{ minWidth: 200 }}>
                          <option value="">Skip this column</option>
                          {tf.map(f => <option key={f.key} value={f.key} disabled={mappedKeys.has(f.key) && mapping[h] !== f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row between">
              <Button variant="quiet" onClick={() => setStep(1)}>Back</Button>
              <Button variant="accent" disabled={missingRequired.length > 0} onClick={() => setStep(3)}>Preview import <Icon name="chevronRight" size={16} /></Button>
            </div>
          </div>
        )}

        {/* STEP 3 - preview */}
        {step === 3 && parsed && (
          <div className="col gap-3">
            <div className="col gap-1"><h4 style={{ margin: 0 }}>Preview</h4>
              <span className="muted t-sm">First rows, mapped. Confirm it looks right before importing.</span></div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {tf.filter(f => mappedKeys.has(f.key)).map(f => <th key={f.key} style={{ padding: '.6rem .9rem' }}>{f.label}</th>)}
                </tr></thead>
                <tbody>
                  {parsed.records.slice(0, 8).map((row, i) => {
                    const inv = Object.fromEntries(Object.entries(mapping).filter(([, k]) => k).map(([h, k]) => [k, row[h]]));
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                        {tf.filter(f => mappedKeys.has(f.key)).map(f => <td key={f.key} style={{ padding: '.5rem .9rem' }}>{String(inv[f.key] ?? '') || <span className="muted">-</span>}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <label className="row gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={dedupe} onChange={e => setDedupe(e.target.checked)} />
              <span className="t-sm">Skip duplicates (match existing records on <b>{importObject(objectType).dedupeKey}</b>)</span>
            </label>
            <div className="row between">
              <Button variant="quiet" onClick={() => setStep(2)}>Back to mapping</Button>
              <Button variant="accent" onClick={doImport}><Icon name="download" size={16} /> Import {parsed.records.length} rows</Button>
            </div>
          </div>
        )}

        {/* STEP 4 - done */}
        {step === 4 && result && (
          <div className="col gap-3">
            <div className="row gap-3 wrap">
              <ResultTile label="Imported" value={result.created} tone="var(--ok)" icon="check" />
              <ResultTile label="Skipped (dupes)" value={result.skipped} tone="var(--warn)" icon="clock" />
              <ResultTile label="Errors" value={result.errors.length} tone="var(--risk)" icon="x" />
            </div>
            {result.errors.length > 0 && (
              <Card style={{ background: 'color-mix(in srgb, var(--risk) 4%, var(--paper))', border: '1px solid var(--risk)' }}>
                <div className="fw-6" style={{ marginBottom: 6 }}>Rows that did not import</div>
                <div className="col gap-1" style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {result.errors.slice(0, 30).map((e, i) => <span key={i} className="t-xs muted" style={{ fontFamily: 'var(--font-mono)' }}>{e}</span>)}
                </div>
              </Card>
            )}
            <div className="row gap-2">
              <Button variant="accent" onClick={() => nav(objectType === 'company' ? '/companies' : objectType === 'deal' ? '/deals' : objectType === 'lead' ? '/leads' : '/contacts')}>
                View imported {importObject(objectType).label.toLowerCase()} <Icon name="chevronRight" size={16} />
              </Button>
              <Button variant="quiet" onClick={() => { setStep(0); setObjectType(''); setParsed(null); setMapping({}); setResult(null); setFileName(''); }}>Import another file</Button>
            </div>
          </div>
        )}
      </Card>
      <MigratePanel />
    </div>
  );
}

function ResultTile({ label, value, tone, icon }) {
  return (
    <div className="col gap-1" style={{ flex: 1, minWidth: 150, padding: '1rem 1.1rem', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <span className="row gap-2" style={{ alignItems: 'center', color: tone }}><Icon name={icon} size={16} /><span className="stat-label">{label}</span></span>
      <span className="stat-value" style={{ fontSize: 40 }}>{value}</span>
    </div>
  );
}
