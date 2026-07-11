// FieldPalette - the left pane of the Report Builder. Lists every field
// the active source exposes, grouped by role (dimension / measure / date),
// each draggable onto the canvas dropzones. Also click-to-add for touch /
// keyboard users (drag is an enhancement, not the only path). ASCII only.
// NO em-dash / en-dash.
import React from 'react';
import { Icon } from '../icons';
import { fieldsFor } from '../../lib/report-builder';
import './reports2.css';

const ROLE_LABEL = { dim: 'Dimensions', measure: 'Measures', date: 'Date fields' };
const ROLE_ORDER = ['dim', 'measure', 'date'];

function FieldChip({ field, onDragStart, onDragEnd, onAdd, dragging }) {
  return (
    <div
      className={'rb-field' + (dragging ? ' rb-dragging' : '')}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/rb-field', field.id); e.dataTransfer.effectAllowed = 'copy'; onDragStart(field); }}
      onDragEnd={onDragEnd}
      onClick={() => onAdd(field)}
      title={`Drag onto the canvas, or click to add ${field.label}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(field); } }}
    >
      <span className="rb-grip"><Icon name="grid" size={13} /></span>
      <span className="clip">{field.label}</span>
      <span className={`rb-field-role rb-role-${field.role}`}>{field.role === 'dim' ? 'DIM' : field.role === 'measure' ? 'NUM' : 'DATE'}</span>
    </div>
  );
}

export default function FieldPalette({ source, onAddField, dragField, setDragField }) {
  const fields = fieldsFor(source);
  const byRole = ROLE_ORDER.map(role => ({ role, items: fields.filter(f => f.role === role) })).filter(g => g.items.length);
  return (
    <div className="rb-pane">
      <div className="rb-pane-title">Fields</div>
      <div className="rb-muted">Drag a field onto the canvas, or click to add it.</div>
      {byRole.map(group => (
        <div key={group.role} className="col gap-1">
          <div className="t-xs fw-7" style={{ color: 'var(--n-600)', marginTop: 2 }}>{ROLE_LABEL[group.role]}</div>
          <div className="rb-fieldgroup">
            {group.items.map(f => (
              <FieldChip
                key={f.id} field={f}
                dragging={dragField?.id === f.id}
                onDragStart={setDragField}
                onDragEnd={() => setDragField(null)}
                onAdd={onAddField}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
