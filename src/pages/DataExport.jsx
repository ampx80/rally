// DataExport - whole-workspace data portability at /data-export. A real, working
// answer to "can we get all our data out if we leave?": one-click full JSON
// backup plus per-entity CSV. Reads the live stores via data-export.js.
// NO em-dash / en-dash. ASCII only.
import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { EXPORTS, counts, downloadFullJson, downloadAllCsv, downloadEntityCsv } from '../lib/data-export.js';

export default function DataExport() {
  const [c] = useState(() => counts());
  const total = Object.values(c).reduce((s, n) => s + n, 0);

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--accent-50, #e6f6f3)', color: 'var(--accent, #0e9f8f)' }}>
          <Icon name="box" size={20} />
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.02em', margin: 0 }}>Export your data</h1>
      </div>
      <p style={{ color: 'var(--ink2, #5b6474)', maxWidth: 640, margin: '0 0 24px', lineHeight: 1.6 }}>
        Your data is yours. Export the entire workspace as a complete JSON backup, or pull any object as CSV.
        No tickets, no waiting, no lock-in. This is the same export available on termination under our{' '}
        <a href="/legal/dpa" style={{ color: 'var(--accent, #0e9f8f)', fontWeight: 700 }}>DPA</a>.
      </p>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Full workspace backup</div>
            <div style={{ color: 'var(--ink2, #5b6474)', fontSize: 14, marginTop: 4 }}>
              {total.toLocaleString()} records across {EXPORTS.length} collections, in one re-importable JSON file.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button onClick={downloadFullJson}><Icon name="box" size={16} /> Export all (JSON)</Button>
            <Button variant="quiet" onClick={downloadAllCsv}><Icon name="fileText" size={16} /> Export all (CSV)</Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {EXPORTS.map((e) => (
          <Card key={e.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{e.label}</div>
              <Badge tone={c[e.key] ? 'default' : 'muted'}>{(c[e.key] || 0).toLocaleString()} rows</Badge>
            </div>
            <Button variant="quiet" size="sm" onClick={() => downloadEntityCsv(e.key)} disabled={!c[e.key]}>
              <Icon name="download" size={15} /> CSV
            </Button>
          </Card>
        ))}
      </div>

      <p style={{ color: 'var(--ink3, #8a92a3)', fontSize: 13, marginTop: 22, lineHeight: 1.6 }}>
        Exports run entirely in your browser. The JSON backup preserves record ids and relationships so it can
        be re-imported or handed to another system. Attachments and audit history are included in Enterprise exports.
      </p>
    </div>
  );
}
