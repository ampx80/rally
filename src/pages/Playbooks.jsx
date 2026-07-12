// ============================================================
// PLAYBOOKS  (sales playbook library + editor)
// The library of guided sales motions reps run on records via the
// PlaybookRunner card. Seeded playbooks (discovery, MEDDIC, BANT,
// demo, negotiation, closing) are read only; a rep or admin can
// duplicate any of them into an editable custom copy, or build a
// new one from scratch. Every playbook here is the same config the
// runner consumes on deal + contact records.
//
// Additive page. Reads/writes only through src/lib/playbooks.js.
// ASCII hyphens only. No em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  PageTitle, Card, Button, Badge, Segmented, Modal, Field, Input, Select,
  Textarea, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  usePlaybooks, PLAYBOOK_CATEGORIES, PB_FIELD_TYPES, addPlaybook,
  duplicatePlaybook, updatePlaybook, removePlaybook, isCustomPlaybook,
  playbookIcon, playbookFieldCount,
} from '../lib/playbooks.js';

const OBJECT_LABEL = { deal: 'Deals', contact: 'Contacts', company: 'Companies', any: 'Any record' };
const OBJECT_OPTIONS = [
  { value: 'deal', label: 'Deals' },
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'any', label: 'Any record' },
];

/* ---------- library card ---------- */
function PlaybookCard({ pb, onPreview, onEdit, onDuplicate, onDelete }) {
  const custom = isCustomPlaybook(pb.id);
  const fieldCount = playbookFieldCount(pb);
  return (
    <Card hover className="col gap-2" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -28, right: -28, width: 96, height: 96, borderRadius: '50%', background: 'var(--accent)', opacity: .06, filter: 'blur(8px)' }} />
      <div className="row gap-2" style={{ alignItems: 'center', position: 'relative' }}>
        <span className="row center floaty" style={{ width: 38, height: 38, flex: 'none', borderRadius: 'var(--r-sm)', background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
          <Icon name={playbookIcon(pb)} size={20} />
        </span>
        <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
          <span className="fw-7 clip">{pb.name}</span>
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="t-xs muted">{pb.methodology}</span>
            {custom ? <Badge tone="accent" className="t-xs">Custom</Badge> : <Badge tone="default" className="t-xs">System</Badge>}
          </span>
        </div>
      </div>

      {pb.blurb && <p className="t-sm muted" style={{ margin: 0, lineHeight: 1.5, minHeight: 40 }}>{pb.blurb}</p>}

      <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
        <Badge tone="info">{OBJECT_LABEL[pb.forObject] || pb.forObject}</Badge>
        <Badge tone="default">{(pb.sections || []).length} section{(pb.sections || []).length === 1 ? '' : 's'}</Badge>
        <Badge tone="default">{fieldCount} field{fieldCount === 1 ? '' : 's'}</Badge>
      </div>

      <div className="row gap-1 wrap" style={{ marginTop: '.15rem' }}>
        <Button variant="ghost" size="sm" onClick={() => onPreview(pb)}><Icon name="eye" size={15} /> Preview</Button>
        {custom ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => onEdit(pb)}><Icon name="edit" size={15} /> Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(pb)} style={{ color: 'var(--risk)' }}><Icon name="trash" size={15} /> Delete</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onDuplicate(pb)}><Icon name="copy" size={15} /> Duplicate</Button>
        )}
      </div>
    </Card>
  );
}

/* ---------- preview modal (read-only structure) ---------- */
function PreviewModal({ pb, onClose }) {
  if (!pb) return null;
  return (
    <Modal open onClose={onClose} title={pb.name} width={640}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="col gap-3">
        <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
          <Badge tone="accent">{pb.methodology}</Badge>
          <Badge tone="info">{OBJECT_LABEL[pb.forObject] || pb.forObject}</Badge>
          <Badge tone="default">{pb.category}</Badge>
        </div>
        {pb.blurb && <p className="t-sm muted" style={{ margin: 0, lineHeight: 1.55 }}>{pb.blurb}</p>}
        <div className="col gap-2 stagger">
          {(pb.sections || []).map((s, i) => (
            <div key={s.id} className="col gap-2" style={{ padding: '.85rem 1rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--n-25)' }}>
              <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                <span className="stat-label" style={{ flex: 'none' }}>Step {i + 1}</span>
                <span className="fw-7">{s.title}</span>
              </div>
              {s.guidance && <p className="t-sm muted" style={{ margin: 0, lineHeight: 1.5 }}>{s.guidance}</p>}
              {s.prompts && s.prompts.length > 0 && (
                <ul className="col gap-1" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {s.prompts.map((p, j) => <li key={j} className="t-sm" style={{ color: 'var(--ink-2)' }}>{p}</li>)}
                </ul>
              )}
              {s.fields && s.fields.length > 0 && (
                <div className="row gap-1 wrap">
                  {s.fields.map(f => (
                    <span key={f.key} className="row gap-1" style={{ alignItems: 'center', padding: '.2rem .55rem', borderRadius: 'var(--r-pill)', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '.8rem', fontWeight: 600 }}>
                      <Icon name="sliders" size={13} style={{ color: 'var(--accent-600)' }} />
                      {f.label}
                      <span className="muted" style={{ fontWeight: 500 }}>{f.type}</span>
                      {f.registryKey && <Badge tone="accent" className="t-xs">on record</Badge>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- section + field editors (custom playbooks) ---------- */
function FieldRow({ field, onChange, onRemove }) {
  return (
    <div className="col gap-1" style={{ padding: '.6rem .7rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
        <Input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })} placeholder="Field label" style={{ flex: '2 1 180px' }} />
        <Select value={field.type} onChange={e => onChange({ ...field, type: e.target.value })} style={{ flex: '1 1 130px' }}>
          {PB_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Button variant="quiet" size="sm" onClick={onRemove} title="Remove field" style={{ color: 'var(--n-400)', flex: 'none' }}>
          <Icon name="x" size={16} />
        </Button>
      </div>
      {field.type === 'picklist' && (
        <Input
          value={(field.options || []).join(', ')}
          onChange={e => onChange({ ...field, options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
          placeholder="Options, comma separated"
        />
      )}
    </div>
  );
}

function SectionEditor({ section, index, onChange, onRemove }) {
  const setField = (i, next) => onChange({ ...section, fields: section.fields.map((f, j) => (j === i ? next : f)) });
  const addField = () => onChange({ ...section, fields: [...(section.fields || []), { key: `f_${Date.now().toString(36)}`, label: '', type: 'text' }] });
  const removeField = (i) => onChange({ ...section, fields: section.fields.filter((_, j) => j !== i) });
  return (
    <div className="col gap-2" style={{ padding: '.9rem 1rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--n-25)' }}>
      <div className="row between gap-2" style={{ alignItems: 'center' }}>
        <span className="stat-label">Step {index + 1}</span>
        <Button variant="quiet" size="sm" onClick={onRemove} title="Remove section" style={{ color: 'var(--risk)' }}>
          <Icon name="trash" size={15} /> Remove
        </Button>
      </div>
      <Field label="Section title">
        <Input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} placeholder="e.g. Pain and impact" />
      </Field>
      <Field label="Guidance" hint="What the rep should read out or keep in mind.">
        <Textarea rows={2} value={section.guidance} onChange={e => onChange({ ...section, guidance: e.target.value })} />
      </Field>
      <Field label="Prompts" hint="One prompt per line. Reps check these off as they go.">
        <Textarea
          rows={3}
          value={(section.prompts || []).join('\n')}
          onChange={e => onChange({ ...section, prompts: e.target.value.split('\n').map(p => p.trim()).filter(Boolean) })}
          placeholder={'What do they use today?\nWho owns it?'}
        />
      </Field>
      <div className="col gap-1">
        <div className="row between" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6">Capture fields</span>
          <Button variant="ghost" size="sm" onClick={addField}><Icon name="plus" size={15} /> Field</Button>
        </div>
        {(section.fields || []).length === 0 ? (
          <span className="t-xs muted">No capture fields on this section.</span>
        ) : (
          <div className="col gap-1">
            {section.fields.map((f, i) => (
              <FieldRow key={f.key || i} field={f} onChange={next => setField(i, next)} onRemove={() => removeField(i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- editor modal (create or edit a custom playbook) ---------- */
function EditorModal({ playbook, onClose, toast }) {
  const [draft, setDraft] = useState(() => ({
    name: playbook?.name || '',
    category: playbook?.category || 'Discovery',
    methodology: playbook?.methodology || 'Custom',
    forObject: playbook?.forObject || 'deal',
    blurb: playbook?.blurb || '',
    icon: playbook?.icon || 'book',
    sections: playbook ? JSON.parse(JSON.stringify(playbook.sections || [])) : [],
  }));
  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const setSection = (i, next) => setDraft(d => ({ ...d, sections: d.sections.map((s, j) => (j === i ? next : s)) }));
  const addSection = () => setDraft(d => ({ ...d, sections: [...d.sections, { id: `s_${Date.now().toString(36)}`, title: '', guidance: '', prompts: [], fields: [] }] }));
  const removeSection = (i) => setDraft(d => ({ ...d, sections: d.sections.filter((_, j) => j !== i) }));

  const save = () => {
    if (!draft.name.trim()) return toast('A playbook name is required.', 'risk');
    const r = playbook
      ? updatePlaybook(playbook.id, draft)
      : addPlaybook(draft);
    if (r.error) return toast(r.message, 'risk');
    toast(playbook ? 'Playbook updated' : 'Playbook created');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={playbook ? 'Edit playbook' : 'New playbook'} width={680}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}><Icon name="check" size={16} /> {playbook ? 'Save changes' : 'Create playbook'}</Button>
      </>}>
      <div className="col gap-3">
        <div className="row gap-3 wrap">
          <div style={{ flex: '2 1 240px' }}><Field label="Name"><Input value={draft.name} onChange={set('name')} placeholder="e.g. Enterprise Discovery" /></Field></div>
          <div style={{ flex: '1 1 150px' }}><Field label="Methodology"><Input value={draft.methodology} onChange={set('methodology')} placeholder="e.g. SPIN" /></Field></div>
        </div>
        <div className="row gap-3 wrap">
          <div style={{ flex: '1 1 180px' }}>
            <Field label="Category">
              <Select value={draft.category} onChange={set('category')}>
                {PLAYBOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <Field label="Runs on">
              <Select value={draft.forObject} onChange={set('forObject')}>
                {OBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <Field label="Summary" hint="One line describing when to reach for this playbook.">
          <Textarea rows={2} value={draft.blurb} onChange={set('blurb')} />
        </Field>

        <div className="row between" style={{ alignItems: 'center', paddingTop: '.35rem', borderTop: '1px solid var(--line)' }}>
          <h4 style={{ margin: 0 }}>Sections</h4>
          <Button variant="ghost" size="sm" onClick={addSection}><Icon name="plus" size={15} /> Add section</Button>
        </div>
        {draft.sections.length === 0 ? (
          <EmptyState icon="🧩" title="No sections yet" body="Add a section to build the guided flow reps step through." />
        ) : (
          <div className="col gap-2">
            {draft.sections.map((s, i) => (
              <SectionEditor key={s.id || i} section={s} index={i} onChange={next => setSection(i, next)} onRemove={() => removeSection(i)} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   Playbooks page
   ============================================================ */
export default function Playbooks() {
  const playbooks = usePlaybooks();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null);
  const [editor, setEditor] = useState(null);   // { playbook } | { playbook: null } for new
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return playbooks;
    if (filter === 'custom') return playbooks.filter(p => isCustomPlaybook(p.id));
    return playbooks.filter(p => p.category === filter);
  }, [playbooks, filter]);

  const segOptions = [
    { value: 'all', label: 'All' },
    ...PLAYBOOK_CATEGORIES.map(c => ({ value: c, label: c })),
    { value: 'custom', label: 'Custom' },
  ];

  const onDuplicate = (pb) => {
    const r = duplicatePlaybook(pb.id);
    if (r.error) return toast(r.message, 'risk');
    toast('Duplicated to an editable copy');
    setEditor({ playbook: r.playbook });
  };
  const doDelete = () => {
    if (!confirmDel) return;
    const r = removePlaybook(confirmDel.id);
    if (r.error) return toast(r.message, 'risk');
    toast('Playbook deleted', 'warn');
    setConfirmDel(null);
  };

  const systemCount = playbooks.filter(p => !isCustomPlaybook(p.id)).length;
  const customCount = playbooks.length - systemCount;

  return (
    <div className="col gap-3">
      <PageTitle
        eyebrow="Pipeline"
        title="Sales playbooks"
        sub="Guided sales motions reps run on deals and contacts. Capture answers, log the call, and update the record in one pass."
        action={<Button variant="primary" onClick={() => setEditor({ playbook: null })}><Icon name="plus" size={16} /> New playbook</Button>}
      />

      <div className="row between gap-2 wrap" style={{ alignItems: 'center' }}>
        <Segmented options={segOptions} value={filter} onChange={setFilter} />
        <span className="t-sm muted">{systemCount} system, {customCount} custom</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="📘"
            title="No playbooks here"
            body={filter === 'custom' ? 'Duplicate a system playbook or create a new one to build your own.' : 'Nothing matches this filter yet.'}
            action={<Button variant="primary" onClick={() => setEditor({ playbook: null })}><Icon name="plus" size={16} /> New playbook</Button>}
          />
        </Card>
      ) : (
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.map(pb => (
            <PlaybookCard
              key={pb.id}
              pb={pb}
              onPreview={setPreview}
              onEdit={(p) => setEditor({ playbook: p })}
              onDuplicate={onDuplicate}
              onDelete={setConfirmDel}
            />
          ))}
        </div>
      )}

      {preview && <PreviewModal pb={preview} onClose={() => setPreview(null)} />}
      {editor && <EditorModal playbook={editor.playbook} onClose={() => setEditor(null)} toast={toast} />}

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete playbook"
        width={440}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button variant="danger" onClick={doDelete}><Icon name="trash" size={16} /> Delete</Button>
        </>}
      >
        <p className="t-sm" style={{ margin: 0 }}>
          Delete <span className="fw-7">{confirmDel?.name}</span>? Reps will no longer see it on records. Past run history stays on the timeline.
        </p>
      </Modal>
    </div>
  );
}
