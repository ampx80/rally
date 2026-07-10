// RecordDetailPanel - drop-in "All fields" + "History" block for any record
// detail page (Wave 2). One import, one line per page: it wraps the full-field
// editor (RecordFields) and the change history (AuditPanel) behind a tab.
// ASCII hyphens only.
import React, { useState } from 'react';
import { getFields } from '../lib/fields.js';
import RecordFields from './RecordFields.jsx';
import AuditPanel from './AuditPanel.jsx';
import { Card, Tabs } from './UI.jsx';
import { Icon } from './icons.jsx';

export default function RecordDetailPanel({ objectType, record, onPatch }) {
  const [tab, setTab] = useState('fields');
  if (!record) return null;
  return (
    <div style={{ marginTop: '1.15rem' }}>
      <Tabs
        tabs={[
          { key: 'fields', label: 'All fields', count: getFields(objectType).length },
          { key: 'history', label: 'History' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'fields' && (
        <Card>
          <RecordFields objectType={objectType} record={record} onPatch={onPatch} />
        </Card>
      )}
      {tab === 'history' && (
        <Card>
          <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
            <Icon name="clock" size={18} style={{ color: 'var(--accent-600)' }} />
            <h4 style={{ margin: 0 }}>Change history</h4>
          </div>
          <AuditPanel objectType={objectType} recordId={record.id} />
        </Card>
      )}
    </div>
  );
}
