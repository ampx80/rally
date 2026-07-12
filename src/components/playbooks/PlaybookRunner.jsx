// ============================================================
// PLAYBOOK RUNNER  (guided sales playbooks on a record)
// A record-mounted card that lists the sales playbooks available
// for this object type, steps a rep through a chosen playbook
// section by section (guidance + prompt checklist + property
// capture), and on finish: (1) logs the notes as a real activity
// on the record timeline, (2) optionally patches record fields
// through the field registry, (3) writes a per-record run row.
//
// Additive + self-contained. Reads/writes only through the store
// writers + fields registry + playbooks run log. Reduced-motion
// safe (all animation is opt-in CSS that respects the global
// prefers-reduced-motion rule). ASCII hyphens only.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  Card, Button, Badge, Modal, Input, Select, Textarea, ProgressBar,
  EmptyState, useToast, relTime,
} from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  playbooksFor, playbookIcon, usePlaybookRuns, recordPlaybookRun,
} from '../../lib/playbooks.js';
import { getField, setFieldValue } from '../../lib/fields.js';
import { updateDeal, updateContact, updateCompany } from '../../lib/store.js';

const WRITERS = { deal: updateDeal, contact: updateContact, company: updateCompany };

/* ---------- single capture-field input ---------- */
function CaptureField({ field, value, onChange }) {
  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value) };
  if (field.type === 'textarea') {
    return <Textarea rows={3} placeholder={field.placeholder || ''} {...common} />;
  }
  if (field.type === 'picklist') {
    return (
      <Select {...common}>
        <option value="">Select...</option>
        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </Select>
    );
  }
  if (field.type === 'rating') {
    const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return (
      <div className="row" style={{ gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i === n ? '' : i)}
            title={`${i} of 5`}
            aria-label={`${i} of 5`}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 2px', fontSize: '1.4rem', lineHeight: 1, color: i <= n ? 'var(--warn)' : 'var(--n-200)' }}
          >
            ★
          </button>
        ))}
      </div>
    );
  }
  const type = field.type === 'date' ? 'date'
    : field.type === 'currency' || field.type === 'number' || field.type === 'percent' ? 'number'
    : 'text';
  return <Input type={type} placeholder={field.placeholder || ''} {...common} />;
}

/* ---------- the stepper modal ---------- */
function RunnerModal({ playbook, objectType, record, onClose }) {
  const toast = useToast();
  const sections = playbook.sections || [];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});   // { fieldKey: value }
  const [checked, setChecked] = useState({});   // { sectionId: [promptIdx,...] }

  const section = sections[step];
  const pct = sections.length ? Math.round(((step + 1) / sections.length) * 100) : 100;
  const isLast = step === sections.length - 1;

  const setAnswer = (key, val) => setAnswers(a => ({ ...a, [key]: val }));
  const toggleCheck = (secId, idx) => setChecked(c => {
    const cur = c[secId] || [];
    return { ...c, [secId]: cur.includes(idx) ? cur.filter(x => x !== idx) : [...cur, idx] };
  });

  const finish = () => {
    // Build a combined patch: registry-mapped fields go through
    // setFieldValue (which resolves store columns vs fieldValues);
    // unmapped capture fields land under record.fieldValues by key.
    const patch = {};
    const fieldValues = {};
    const patchedLabels = [];
    for (const sec of sections) {
      for (const f of sec.fields || []) {
        const v = answers[f.key];
        if (v == null || v === '') continue;
        if (f.registryKey) {
          const fd = getField(objectType, f.registryKey);
          if (fd) {
            const p = setFieldValue(record, fd, v);
            if (p.fieldValues) Object.assign(fieldValues, p.fieldValues);
            else Object.assign(patch, p);
            patchedLabels.push(f.label);
            continue;
          }
        }
        // Unmapped: persist onto the record so it is not lost, namespaced
        // by capture key (descriptive keys avoid cross-playbook collisions).
        fieldValues[f.key] = v;
      }
    }
    if (Object.keys(fieldValues).length) patch.fieldValues = fieldValues;

    const writer = WRITERS[objectType];
    if (writer && Object.keys(patch).length) {
      const r = writer(record.id, patch);
      if (r && r.error) { toast(r.message || 'Could not save playbook fields.', 'risk'); return; }
    }

    const res = recordPlaybookRun({
      playbookId: playbook.id, objectType, recordId: record.id,
      answers, checked, patched: patchedLabels,
    });
    if (res.error) { toast(res.message, 'risk'); return; }
    toast(`${playbook.name} logged${patchedLabels.length ? ` - ${patchedLabels.length} field${patchedLabels.length > 1 ? 's' : ''} updated` : ''}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={playbook.name}
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))}>
              <Icon name="chevronRight" size={15} style={{ transform: 'rotate(180deg)' }} /> Back
            </Button>
          )}
          {isLast ? (
            <Button variant="primary" onClick={finish}>
              <Icon name="check" size={16} /> Finish and log
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(s => Math.min(sections.length - 1, s + 1))}>
              Next <Icon name="chevronRight" size={15} />
            </Button>
          )}
        </>
      }
    >
      <div className="col gap-3">
        {/* progress */}
        <div className="col gap-1">
          <div className="row between t-xs muted">
            <span className="eyebrow" style={{ margin: 0 }}>{playbook.methodology}</span>
            <span>Step {step + 1} of {sections.length}</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        {section && (
          <div key={section.id} className="col gap-3 fade-up">
            <div className="col gap-1">
              <h4 style={{ margin: 0 }}>{section.title}</h4>
              {section.guidance && <p className="t-sm muted" style={{ margin: 0, lineHeight: 1.55 }}>{section.guidance}</p>}
            </div>

            {/* prompt checklist */}
            {section.prompts && section.prompts.length > 0 && (
              <div className="col gap-1">
                {section.prompts.map((p, i) => {
                  const on = (checked[section.id] || []).includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleCheck(section.id, i)}
                      className="row gap-2"
                      style={{ alignItems: 'center', padding: '.55rem .65rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: on ? 'var(--ok-bg)' : 'var(--paper)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    >
                      <span className="row center" style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, border: `2px solid ${on ? 'var(--ok)' : 'var(--line-strong)'}`, background: on ? 'var(--ok)' : 'transparent', color: '#fff' }}>
                        {on && <Icon name="check" size={14} />}
                      </span>
                      <span className="t-sm" style={{ color: on ? 'var(--ok)' : 'var(--ink)' }}>{p}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* capture fields */}
            {section.fields && section.fields.length > 0 && (
              <div className="col gap-2" style={{ paddingTop: '.25rem', borderTop: '1px solid var(--line)' }}>
                {section.fields.map(f => (
                  <div key={f.key} className="field">
                    <label className="row gap-1" style={{ alignItems: 'center' }}>
                      {f.label}
                      {f.registryKey && <Badge tone="accent" className="t-xs" title="Writes back to the record field">on record</Badge>}
                    </label>
                    <CaptureField field={f} value={answers[f.key]} onChange={(v) => setAnswer(f.key, v)} />
                    {f.help && <span className="t-xs muted">{f.help}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   PlaybookRunner
   props: recordType ('deal' | 'contact' | 'company'), record.
   ============================================================ */
export default function PlaybookRunner({ recordType, record }) {
  const [active, setActive] = useState(null); // playbook being run
  // Subscribe to the run log so completed runs appear immediately, sorted
  // newest first, without depending on the parent record page re-rendering.
  const runs = usePlaybookRuns((all) => all
    .filter(r => r.objectType === recordType && r.recordId === record?.id)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)));
  const available = useMemo(() => playbooksFor(recordType), [recordType]);

  if (!record) return null;

  return (
    <Card>
      <div className="row between gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Icon name="book" size={18} style={{ color: 'var(--accent-600)', flex: 'none' }} />
          <h4 style={{ margin: 0 }} className="clip">Sales playbooks</h4>
        </div>
        {runs.length > 0 && <Badge tone="default" style={{ flex: 'none' }}>{runs.length} run{runs.length > 1 ? 's' : ''}</Badge>}
      </div>

      {available.length === 0 ? (
        <EmptyState icon="📘" title="No playbooks" body="No sales playbooks are configured for this record type yet." />
      ) : (
        <div className="col gap-1">
          {available.map(pb => (
            <div key={pb.id} className="row between gap-2 wrap" style={{ alignItems: 'center', padding: '.55rem .65rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0, flex: '1 1 200px' }}>
                <span className="row center" style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--r-sm)', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                  <Icon name={playbookIcon(pb)} size={16} />
                </span>
                <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                  <span className="fw-6 clip">{pb.name}</span>
                  <span className="t-xs muted clip">{pb.methodology} playbook</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActive(pb)} style={{ flex: 'none' }}>
                <Icon name="chevronRight" size={15} /> Run
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* past runs on this record */}
      {runs.length > 0 && (
        <div className="col gap-1" style={{ marginTop: '1rem', paddingTop: '.85rem', borderTop: '1px solid var(--line)' }}>
          <div className="eyebrow">Run history</div>
          {runs.slice(0, 5).map(r => (
            <div key={r.id} className="row between gap-2" style={{ alignItems: 'center', padding: '.35rem 0' }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <Icon name="check" size={14} style={{ color: 'var(--ok)', flex: 'none' }} />
                <span className="t-sm clip">{r.playbookName}</span>
                {r.patched && r.patched.length > 0 && <Badge tone="accent" className="t-xs" style={{ flex: 'none' }}>{r.patched.length} field{r.patched.length > 1 ? 's' : ''}</Badge>}
              </div>
              <span className="t-xs muted" style={{ flex: 'none' }}>{relTime(r.completedAt)}</span>
            </div>
          ))}
        </div>
      )}

      {active && (
        <RunnerModal
          playbook={active}
          objectType={recordType}
          record={record}
          onClose={() => setActive(null)}
        />
      )}
    </Card>
  );
}
