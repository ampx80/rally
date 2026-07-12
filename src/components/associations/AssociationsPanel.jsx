// ============================================================
// ASSOCIATIONS PANEL  (record-linking, HubSpot-style)
// A right-rail card for any record detail page. Shows every record
// associated with the current one, grouped by its labeled role
// (e.g. "decision maker", "billing contact", "partner"), with
// add + remove and a typed record picker.
//
// ADDITIVE + read-only over the book of business. It renders on top
// of src/lib/associations.js and only READS store records to display
// their names/links. Mount it with (recordType, recordId):
//   <AssociationsPanel recordType="contact" recordId={c.id} />
//   <AssociationsPanel recordType="company" recordId={id} />
//   <AssociationsPanel recordType="deal"    recordId={deal.id} />
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store.js';
import {
  useAssociations, associationsGrouped, associationCount,
  createAssociation, removeAssociation, resolveRecord, searchRecords,
  ASSOCIABLE_TYPES, ASSOCIATION_LABELS, typeMeta,
} from '../../lib/associations.js';
import { Card, Button, Badge, EmptyState, Modal, Field, Input, Select, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';

export default function AssociationsPanel({ recordType, recordId }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  // Re-render on association changes AND on core-store changes (resolved
  // names/links live in the core store).
  useAssociations();
  useStore();

  if (!recordType || !recordId) return null;

  const groups = associationsGrouped(recordType, recordId);
  const count = associationCount(recordType, recordId);
  const self = resolveRecord(recordType, recordId);

  const onRemove = (id) => {
    const r = removeAssociation(id);
    if (r.error) return toast(r.message, 'risk');
    toast('Association removed');
  };

  return (
    <Card>
      <div className="row between gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Icon name="gitBranch" size={16} />
          <h4 style={{ margin: 0 }}>Associations</h4>
          {count > 0 && <Badge tone="info">{count}</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} /> Link
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="No associations yet"
          body="Link this record to related contacts, companies, deals, or quotes with a labeled role."
          action={<Button variant="primary" size="sm" onClick={() => setAdding(true)}>Add a link</Button>}
        />
      ) : (
        <div className="col gap-3">
          {groups.map(g => (
            <div key={g.label} className="col gap-2">
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="t-sm fw-6" style={{ textTransform: 'capitalize' }}>{g.label}</span>
                <span className="t-sm muted">{g.items.length}</span>
              </div>
              <div className="col gap-1">
                {g.items.map(it => (
                  <AssociationRow key={it.association.id} item={it} onRemove={onRemove} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAssociationModal
        open={adding}
        onClose={() => setAdding(false)}
        recordType={recordType}
        recordId={recordId}
        selfName={self.found ? self.name : 'this record'}
        toast={toast}
      />
    </Card>
  );
}

function AssociationRow({ item, onRemove }) {
  const { record, direction } = item;
  const meta = typeMeta(record.type);
  const inner = (
    <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
      <span className="assoc-ico" title={meta.label} style={{ flex: 'none', color: 'var(--n-600)' }}>
        <Icon name={record.icon} size={15} />
      </span>
      <div className="col" style={{ minWidth: 0 }}>
        <span className="fw-6 clip">{record.name}</span>
        {record.sub ? <span className="t-sm muted clip">{record.sub}</span> : null}
      </div>
    </div>
  );
  return (
    <div className="row between gap-2" style={{ alignItems: 'center', padding: '.5rem 0', borderBottom: '1px solid var(--line)', minWidth: 0 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {record.to
          ? <Link to={record.to} className="link" style={{ display: 'block', minWidth: 0 }}>{inner}</Link>
          : inner}
      </div>
      <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
        {direction === 'in' && (
          <span className="t-sm muted" title="Linked from the other record">
            <Icon name="arrowLeft" size={13} />
          </span>
        )}
        <button
          onClick={() => onRemove(item.association.id)}
          className="btn btn-quiet btn-sm"
          aria-label="Remove association"
          title="Remove association"
          style={{ padding: '.1rem .35rem', lineHeight: 1 }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

function AddAssociationModal({ open, onClose, recordType, recordId, selfName, toast }) {
  const [toType, setToType] = useState('contact');
  const [label, setLabel] = useState(ASSOCIATION_LABELS[0]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null); // { type, id, name, sub }
  useStore(); // keep candidate results live

  // Reset the form each time the picker opens.
  React.useEffect(() => {
    if (open) { setToType(recordType === 'contact' ? 'company' : 'contact'); setLabel(ASSOCIATION_LABELS[0]); setQuery(''); setPicked(null); }
  }, [open, recordType]);

  const results = useMemo(
    () => (open ? searchRecords(toType, query, { excludeType: recordType, excludeId: recordId, limit: 30 }) : []),
    [open, toType, query, recordType, recordId]
  );

  const save = () => {
    if (!picked) return toast('Pick a record to link.', 'risk');
    const r = createAssociation({
      fromType: recordType, fromId: recordId,
      toType: picked.type, toId: picked.id,
      label,
    });
    if (r.error) return toast(r.message, 'risk');
    toast('Association added');
    onClose();
  };

  const datalistId = 'assoc-label-suggestions';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link a record"
      width={520}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={!picked}>Add link</Button>
      </>}
    >
      <div className="col gap-3">
        <div className="muted t-sm">
          Link <span className="fw-6" style={{ color: 'var(--ink)' }}>{selfName}</span> to another record with a labeled role.
        </div>

        <div className="row gap-2 wrap">
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <Field label="Record type">
              <Select value={toType} onChange={(e) => { setToType(e.target.value); setPicked(null); }}>
                {ASSOCIABLE_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <Field label="Label / role">
              <Input
                list={datalistId}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. decision maker"
              />
              <datalist id={datalistId}>
                {ASSOCIATION_LABELS.map(l => <option key={l} value={l} />)}
              </datalist>
            </Field>
          </div>
        </div>

        <Field label={`Search ${typeMeta(toType).plural.toLowerCase()}`}>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to search..." autoFocus />
        </Field>

        <div className="col gap-1" style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md, 10px)', padding: '.35rem' }}>
          {results.length === 0 ? (
            <div className="muted t-sm" style={{ padding: '.75rem' }}>No matching records.</div>
          ) : results.map(r => {
            const active = picked && picked.type === r.type && picked.id === r.id;
            return (
              <button
                key={`${r.type}:${r.id}`}
                type="button"
                onClick={() => setPicked(r)}
                className="row between gap-2"
                style={{
                  alignItems: 'center', textAlign: 'left', width: '100%',
                  padding: '.5rem .6rem', borderRadius: 8, border: '1px solid transparent',
                  background: active ? 'var(--accent-weak, rgba(91,75,245,.12))' : 'transparent',
                  borderColor: active ? 'var(--accent)' : 'transparent', cursor: 'pointer',
                }}
              >
                <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                  <Icon name={r.icon} size={15} />
                  <div className="col" style={{ minWidth: 0 }}>
                    <span className="fw-6 clip">{r.name}</span>
                    {r.sub ? <span className="t-sm muted clip">{r.sub}</span> : null}
                  </div>
                </div>
                {active && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
