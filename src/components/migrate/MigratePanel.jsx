// ============================================================
// MigratePanel - "Migrate from Salesforce / HubSpot" for the Import page.
// Connect a source over OAuth, pick an object, preview what came back,
// then import it through the SAME importer the CSV path uses. When a
// source's API keys are not set on the workspace, it falls back to a
// clear "set up API keys or use CSV" message, so the CSV flow is never
// blocked. Drops into ImportData as a sibling card (see wiring note in
// docs/MIGRATION.md). NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { importObject } from '../../lib/importer.js';
import {
  MIGRATE_SOURCES, migrateSource, connectSource, readConnectFlag, pullObjects, importPulled,
} from '../../lib/migrate.js';

export default function MigratePanel() {
  const toast = useToast();
  const [source, setSource] = useState('');           // connected source id
  const [connecting, setConnecting] = useState('');   // source id mid-connect
  const [notice, setNotice] = useState(null);         // { tone, text }
  const [objectType, setObjectType] = useState('');
  const [pull, setPull] = useState(null);             // pullObjects() result
  const [pulling, setPulling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  // Read the ?migrate=1 flag the OAuth callback redirects back with.
  useEffect(() => {
    const flag = readConnectFlag();
    if (!flag) return;
    if (flag.status === 'connected' && flag.source) {
      setSource(flag.source);
      setNotice({ tone: 'ok', text: `${migrateSource(flag.source)?.label || flag.source} connected. Pick what to bring over.` });
    } else if (flag.status === 'notconfigured') {
      setNotice({ tone: 'warn', text: 'That source is not set up on this workspace yet. Add its API keys on Vercel, or import a CSV export.' });
    } else if (flag.status === 'error') {
      setNotice({ tone: 'risk', text: flag.message || 'The connection did not complete. Try again or import a CSV.' });
    }
    // Clear the query so a refresh does not re-fire the flag.
    try { window.history.replaceState({}, '', '/import'); } catch { /* ignore */ }
  }, []);

  const meta = source ? migrateSource(source) : null;
  const objectIds = meta ? meta.objects : [];

  async function onConnect(id) {
    setConnecting(id); setNotice(null);
    const r = await connectSource(id);
    setConnecting('');
    if (r && r.configured && r.url) { window.location.href = r.url; return; }
    setNotice({ tone: 'warn', text: (r && r.message) || `${migrateSource(id)?.label || id} is not set up yet. Import a CSV export instead.` });
  }

  async function onPull(id) {
    setObjectType(id); setPull(null); setResult(null); setPulling(true);
    const data = await pullObjects(source, id);
    setPulling(false);
    if (!data.connected) { setSource(''); setNotice({ tone: 'warn', text: data.message || 'Reconnect the source.' }); return; }
    if (data.error) { setNotice({ tone: 'risk', text: data.error }); return; }
    setPull(data);
    if (!data.count) setNotice({ tone: 'warn', text: `No ${importObject(id)?.label.toLowerCase() || 'records'} came back.` });
    else setNotice(null);
  }

  function onImport() {
    if (!pull || !pull.count) return;
    setImporting(true);
    try {
      const res = importPulled({ objectType, records: pull.records, mapping: pull.mapping, dedupe: true });
      setResult(res);
      toast(`Imported ${res.created} ${importObject(objectType)?.label.toLowerCase() || 'records'} from ${meta?.label}.`, 'ok');
    } catch (e) {
      setNotice({ tone: 'risk', text: e?.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  }

  const noticeColor = notice
    ? notice.tone === 'ok' ? 'var(--ok)' : notice.tone === 'risk' ? 'var(--risk)' : 'var(--warn)'
    : null;

  return (
    <Card className="col" style={{ gap: '1.1rem' }}>
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-1">
          <h4 style={{ margin: 0 }}>Migrate from Salesforce or HubSpot</h4>
          <span className="muted t-sm">Connect your old CRM and pull records straight over its API. No export file needed.</span>
        </div>
        {source && <Badge tone="accent">{meta?.label} connected</Badge>}
      </div>

      {notice && (
        <div className="row gap-2" style={{ alignItems: 'center', padding: '.65rem .85rem', borderRadius: 10, border: `1px solid ${noticeColor}`, background: `color-mix(in srgb, ${noticeColor} 6%, var(--paper))`, color: noticeColor }}>
          <Icon name={notice.tone === 'ok' ? 'check' : notice.tone === 'risk' ? 'x' : 'clock'} size={16} />
          <span className="t-sm" style={{ color: 'var(--n-700, inherit)' }}>{notice.text}</span>
        </div>
      )}

      {/* Not connected - choose a source */}
      {!source && (
        <div className="row gap-2 wrap">
          {MIGRATE_SOURCES.map(s => (
            <div key={s.id} className="col gap-2" style={{ flex: 1, minWidth: 240, padding: '1.1rem', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <span className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${s.accent} 16%, transparent)`, color: s.accent, flex: 'none', fontWeight: 800 }}>{s.label[0]}</span>
                <span className="fw-7">{s.label}</span>
              </span>
              <span className="t-sm muted" style={{ minHeight: 40 }}>{s.blurb}</span>
              <Button variant="accent" disabled={connecting === s.id} onClick={() => onConnect(s.id)}>
                {connecting === s.id ? 'Opening...' : <>Connect {s.label} <Icon name="chevronRight" size={16} /></>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Connected - pick an object to pull */}
      {source && (
        <div className="col gap-3">
          <div className="col gap-1">
            <span className="fw-6 t-sm">What do you want to bring over?</span>
            <div className="row gap-2 wrap">
              {objectIds.map(id => (
                <button key={id} onClick={() => onPull(id)}
                  style={{ padding: '.55rem .9rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${objectType === id ? 'var(--accent)' : 'var(--line)'}`, background: 'var(--surface)' }}>
                  <span className="row gap-2" style={{ alignItems: 'center' }}>
                    <Icon name={importObject(id)?.icon || 'inbox'} size={15} />
                    <span className="fw-6">{importObject(id)?.label || id}</span>
                  </span>
                </button>
              ))}
              <Button variant="quiet" onClick={() => { setSource(''); setObjectType(''); setPull(null); setResult(null); }}>Disconnect</Button>
            </div>
          </div>

          {pulling && <span className="t-sm muted">Pulling {importObject(objectType)?.label.toLowerCase()} from {meta?.label}...</span>}

          {/* Preview what came back */}
          {pull && pull.count > 0 && !result && (
            <div className="col gap-2">
              <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                <Badge tone="accent">{pull.count} {importObject(objectType)?.label.toLowerCase()}{pull.hasMore ? '+' : ''} ready</Badge>
                {pull.hasMore && <span className="t-xs muted">Showing the first {pull.count}. Run again after import for the rest.</span>}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--n-600)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {pull.fields.map(f => <th key={f.key} style={{ padding: '.55rem .85rem' }}>{f.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {pull.records.slice(0, 6).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                        {pull.fields.map(f => <td key={f.key} style={{ padding: '.5rem .85rem' }}>{String(row[f.key] ?? '') || <span className="muted">-</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row between">
                <span className="t-xs muted">Deduped on {importObject(objectType)?.dedupeKey}. Imports through the same path as a CSV.</span>
                <Button variant="accent" disabled={importing} onClick={onImport}>
                  <Icon name="download" size={16} /> {importing ? 'Importing...' : `Import ${pull.count} ${importObject(objectType)?.label.toLowerCase()}`}
                </Button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="row gap-3 wrap">
              <ResultTile label="Imported" value={result.created} tone="var(--ok)" icon="check" />
              <ResultTile label="Skipped (dupes)" value={result.skipped} tone="var(--warn)" icon="clock" />
              <ResultTile label="Errors" value={result.errors.length} tone="var(--risk)" icon="x" />
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Button variant="quiet" onClick={() => { setResult(null); setPull(null); setObjectType(''); }}>Bring over more</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ResultTile({ label, value, tone, icon }) {
  return (
    <div className="col gap-1" style={{ flex: 1, minWidth: 140, padding: '.9rem 1rem', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <span className="row gap-2" style={{ alignItems: 'center', color: tone }}><Icon name={icon} size={16} /><span className="stat-label">{label}</span></span>
      <span className="stat-value" style={{ fontSize: 34 }}>{value}</span>
    </div>
  );
}
