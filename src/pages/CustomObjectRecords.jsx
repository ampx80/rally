// Generic records surface for ANY custom object (route /objects/:type).
// One page = list + detail. The list is the shared DataTable with columns
// derived from the object's fields; the detail reuses the field-registry
// renderer (FieldInput + formatFieldValue) so a custom object edits exactly
// like a built-in record. Engine: src/lib/custom-objects.js. ASCII hyphens only.
import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FieldInput, { formatFieldValue, isFieldReadOnly, isEmptyValue } from '../components/FieldInput.jsx';
import {
  PageTitle, Card, Button, Badge, EmptyState, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getFieldValue, setFieldValue } from '../lib/fields.js';
import {
  useCustomObjects, getObject, getRecord, createRecord, updateRecord,
  deleteRecord, primaryField, recordTitle, DEFAULT_ICON,
} from '../lib/custom-objects.js';

/* ---------- one editable field row in the detail view ---------- */
function FieldRow({ fieldDef, record, type }) {
  const toast = useToast();
  const value = getFieldValue(record, fieldDef);
  const save = (v) => {
    const patch = setFieldValue(record, fieldDef, v);
    const res = updateRecord(type, record.id, patch);
    if (res.error) toast(res.message, 'risk');
  };
  return (
    <div className="row wrap" style={{ gap: '.2rem .9rem', padding: '.45rem 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
      <div style={{ flex: '0 1 200px', minWidth: 150 }}>
        <span className="t-sm fw-6" style={{ color: 'var(--ink-2)' }}>{fieldDef.label}</span>
        {fieldDef.required && !fieldDef.primary && <span className="t-xs" style={{ color: 'var(--warn)', marginLeft: 4 }}>*</span>}
        {fieldDef.helpText ? <div className="t-xs muted">{fieldDef.helpText}</div> : null}
      </div>
      <div style={{ flex: '1 1 260px', minWidth: 200 }}>
        <FieldInput fieldDef={fieldDef} value={value} onSave={save} />
      </div>
    </div>
  );
}

/* ---------- record detail ---------- */
function RecordDetail({ type, obj, record, onBack }) {
  const toast = useToast();
  const del = () => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    const res = deleteRecord(type, record.id);
    if (res.error) return toast(res.message, 'risk');
    toast('Record deleted');
    onBack();
  };
  return (
    <div className="col gap-3">
      <PageTitle
        eyebrow={<Link to="/objects" style={{ color: 'var(--accent-600)' }}>Custom objects</Link>}
        title={recordTitle(obj, record)}
        sub={`${obj.name} - updated ${relTime(record.updatedAt)}`}
        action={<div className="row gap-2">
          <Button variant="quiet" onClick={onBack}><Icon name="arrowLeft" size={16} /> Back to {obj.plural}</Button>
          <Button variant="danger" onClick={del}><Icon name="trash" size={16} /> Delete</Button>
        </div>}
      />
      <Card className="col gap-2">
        {obj.fields.map(fd => <FieldRow key={fd.id} fieldDef={fd} record={record} type={type} />)}
      </Card>
    </div>
  );
}

export default function CustomObjectRecords() {
  const { type } = useParams();
  useCustomObjects(); // reactive to definition + record changes
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('record');

  const obj = getObject(type);
  const records = useCustomObjectsRecords(type);

  // Columns: primary field, then up to 5 more, plus an updated column.
  const columns = useMemo(() => {
    if (!obj) return [];
    const pf = primaryField(obj);
    const rest = obj.fields.filter(f => f !== pf).slice(0, 5);
    const cols = [];
    const mkCol = (fd, primary) => ({
      key: fd.key,
      header: fd.label,
      value: (r) => formatFieldValue(fd, getFieldValue(r, fd)) || '',
      sortValue: (r) => { const v = getFieldValue(r, fd); return v == null ? '' : String(formatFieldValue(fd, v) ?? v); },
      render: (r) => {
        const shown = formatFieldValue(fd, getFieldValue(r, fd));
        if (primary) return <span className="fw-7" style={{ color: 'var(--accent-600)' }}>{recordTitle(obj, r)}</span>;
        return <span className={isEmptyValue(getFieldValue(r, fd)) ? 'muted' : ''}>{shown ?? '-'}</span>;
      },
    });
    if (pf) cols.push(mkCol(pf, true));
    rest.forEach(fd => cols.push(mkCol(fd, false)));
    cols.push({ key: '__updated', header: 'Updated', sortable: true, sortValue: (r) => r.updatedAt, value: (r) => relTime(r.updatedAt), render: (r) => <span className="t-sm muted">{relTime(r.updatedAt)}</span> });
    return cols;
  }, [obj, records]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!obj) {
    return (
      <div className="col gap-3">
        <PageTitle eyebrow="Admin" title="Object not found" sub="This custom object does not exist or was deleted." />
        <EmptyState icon="🧱" title="Nothing to show here"
          body="The object you are looking for is not defined."
          action={<Button as={Link} to="/objects" variant="accent">Back to custom objects</Button>} />
      </div>
    );
  }

  const selected = selectedId ? getRecord(type, selectedId) : null;
  const openRecord = (id) => { setParams({ record: id }); };
  const clearRecord = () => { const p = new URLSearchParams(params); p.delete('record'); setParams(p); };

  if (selected) return <RecordDetail type={type} obj={obj} record={selected} onBack={clearRecord} />;

  const addNew = () => {
    const res = createRecord(type, {});
    if (res.error) return toast(res.message, 'risk');
    openRecord(res.record.id);
  };

  return (
    <div className="col gap-3">
      <PageTitle
        eyebrow={<Link to="/objects" style={{ color: 'var(--accent-600)' }}>Custom objects</Link>}
        title={<span className="row gap-2" style={{ alignItems: 'center' }}><Icon name={obj.icon || DEFAULT_ICON} size={22} /> {obj.plural}</span>}
        sub={obj.description || `${records.length} ${records.length === 1 ? 'record' : 'records'}`}
        action={<Button variant="accent" onClick={addNew}><Icon name="plus" size={16} /> New {obj.name.toLowerCase()}</Button>}
      />

      {records.length === 0 ? (
        <EmptyState icon="✨" title={`No ${obj.plural.toLowerCase()} yet`}
          body={`Create your first ${obj.name.toLowerCase()} record. Every field you defined for this object is editable in the detail view.`}
          action={<Button variant="accent" onClick={addNew}><Icon name="plus" size={16} /> New {obj.name.toLowerCase()}</Button>} />
      ) : (
        <DataTable
          columns={columns}
          rows={records}
          getId={(r) => r.id}
          onRowClick={(r) => openRecord(r.id)}
          searchPlaceholder={`Filter ${obj.plural.toLowerCase()}...`}
          empty={<EmptyState icon="🔍" title="No matches" body="No records match your filter." />}
        />
      )}
    </div>
  );
}

/* Reactive records selector for the active type. Kept as a hook so the table
   re-renders on every create / update / delete. */
function useCustomObjectsRecords(type) {
  return useCustomObjects((s) => s.records[type] || []);
}
