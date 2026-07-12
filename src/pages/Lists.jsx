// Lists - Rally's audience + segmentation hub (route /lists, Marketing group).
// A list is a named, resolvable audience over the contact book:
//   static  - an explicit membership snapshot you hand-pick.
//   active  - a saved-view filter (typed operators) that recomputes
//             membership live as the book of business changes.
// Lists feed every marketing send through the shared AudiencePicker.
// All membership resolution lives in src/lib/lists.js (built ON views.js).
// ASCII hyphens only. NO em-dash / en-dash.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, getContacts, contactName, getCompany, getUsers } from '../lib/store.js';
import { getFields, getField, getFieldOptions } from '../lib/fields.js';
import { opsForType, OP_LABEL } from '../lib/views.js';
import {
  useLists, getLists, getList, listStats,
  resolveListMembers, resolveListRecipients,
  audienceMemberCount, audienceRecipientCount,
  createList, updateList, deleteList, duplicateList,
} from '../lib/lists.js';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Textarea, Modal,
  StatCard, Segmented, EmptyState, Avatar, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const KIND_TONE = { static: 'info', active: 'accent' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------
   Active-list filter editor. Same typed operators the saved-view
   engine uses, so an active list behaves exactly like a view.
   ------------------------------------------------------------ */
function ValueInput({ objectType, filter, onChange }) {
  const fd = getField(objectType, filter.fieldKey);
  const op = filter.op;
  if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse', 'thisMonth'].includes(op)) return null;
  if (fd && (fd.type === 'picklist' || fd.type === 'status')) {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
        style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        {getFieldOptions(fd).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  }
  if (fd && fd.type === 'user') {
    return (
      <select className="select" value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
        style={{ padding: '.4rem .5rem', fontSize: '.9rem', minWidth: 120 }}>
        <option value="">Pick...</option>
        <option value="@me">Me (current user)</option>
        {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }
  const t = op === 'lastNDays' ? 'number'
    : (fd && ['date', 'datetime'].includes(fd.type) && op !== 'thisMonth') ? 'date'
    : (fd && ['number', 'currency', 'percent'].includes(fd.type)) ? 'number'
    : 'text';
  return <input className="input" type={t} value={filter.value ?? ''} onChange={e => onChange(e.target.value)}
    placeholder="value" style={{ padding: '.4rem .55rem', fontSize: '.9rem', maxWidth: 160 }} />;
}

function FilterEditor({ objectType, filters, onChange }) {
  const fields = useMemo(
    () => getFields(objectType).filter(f => !f.computed && f.type !== 'sublist' && f.type !== 'json'),
    [objectType],
  );
  const add = () => { const fd = fields[0] || {}; onChange([...(filters || []), { fieldKey: fd.key, op: opsForType(fd.type)[0], value: '' }]); };
  const patch = (i, p) => onChange((filters || []).map((f, j) => j === i ? { ...f, ...p } : f));
  const remove = (i) => onChange((filters || []).filter((_, j) => j !== i));
  return (
    <div className="col gap-2">
      {(filters || []).length === 0 && <div className="t-sm muted">No conditions yet. This active list would match every contact.</div>}
      {(filters || []).map((f, i) => {
        const fd = getField(objectType, f.fieldKey);
        const ops = opsForType(fd?.type);
        return (
          <div key={i} className="row gap-1 wrap" style={{ alignItems: 'center' }}>
            <select className="select" value={f.fieldKey}
              onChange={e => { const nf = getField(objectType, e.target.value); patch(i, { fieldKey: e.target.value, op: opsForType(nf?.type)[0], value: '' }); }}
              style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 180 }}>
              {fields.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <select className="select" value={f.op} onChange={e => patch(i, { op: e.target.value })}
              style={{ padding: '.4rem .5rem', fontSize: '.9rem', maxWidth: 150 }}>
              {ops.map(o => <option key={o} value={o}>{OP_LABEL[o] || o}</option>)}
            </select>
            <ValueInput objectType={objectType} filter={f} onChange={v => patch(i, { value: v })} />
            <button onClick={() => remove(i)} className="btn btn-quiet btn-sm" style={{ padding: '.2rem .35rem' }} title="Remove"><Icon name="x" size={14} /></button>
          </div>
        );
      })}
      <div><Button variant="ghost" size="sm" onClick={add}><Icon name="plus" size={14} /> Add condition</Button></div>
    </div>
  );
}

/* ------------------------------------------------------------
   Static-list member picker: search + checklist over contacts.
   ------------------------------------------------------------ */
function ContactPicker({ selected, onChange }) {
  const [q, setQ] = useState('');
  const sel = new Set(selected || []);
  const contacts = getContacts();
  const query = q.trim().toLowerCase();
  const rows = query
    ? contacts.filter(c => contactName(c).toLowerCase().includes(query) || (c.email || '').toLowerCase().includes(query))
    : contacts;
  const toggle = (id) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next]);
  };
  return (
    <div className="col gap-2">
      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <Input placeholder="Search contacts..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="t-sm muted">{sel.size} selected</span>
      </div>
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', maxHeight: 280, overflowY: 'auto' }}>
        {rows.slice(0, 200).map(c => {
          const on = sel.has(c.id);
          const co = getCompany(c.companyId);
          return (
            <button key={c.id} type="button" onClick={() => toggle(c.id)}
              className="row gap-2" style={{ width: '100%', textAlign: 'left', padding: '.5rem .65rem', borderBottom: '1px solid var(--line)', background: on ? 'var(--n-100)' : 'transparent', alignItems: 'center' }}>
              <span className="dot" style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid var(--line-strong)', background: on ? 'var(--accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {on && <Icon name="check" size={11} style={{ color: '#fff' }} />}
              </span>
              <Avatar name={contactName(c)} size={24} />
              <span className="col" style={{ minWidth: 0 }}>
                <span className="fw-6 clip" style={{ fontSize: '.92rem' }}>{contactName(c)}</span>
                <span className="t-xs muted clip">{c.email || 'no email'}{co ? ` - ${co.name}` : ''}</span>
              </span>
            </button>
          );
        })}
        {rows.length === 0 && <div className="t-sm muted" style={{ padding: '.8rem' }}>No contacts match.</div>}
      </div>
      {rows.length > 200 && <div className="t-xs muted">Showing first 200. Refine your search to narrow.</div>}
    </div>
  );
}

/* ------------------------------------------------------------
   Create / edit modal
   ------------------------------------------------------------ */
const EMPTY = { id: null, name: '', kind: 'static', description: '', filters: [], contactIds: [] };

function ListEditor({ open, onClose, initial, onSaved }) {
  const toast = useToast();
  useStore();
  const [d, setD] = useState(EMPTY);

  React.useEffect(() => {
    if (open) setD(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const isEdit = !!d.id;

  const previewCount = d.kind === 'active'
    ? audienceMemberCount({ type: 'filter', filters: d.filters })
    : (d.contactIds || []).length;
  const emailCount = d.kind === 'active'
    ? audienceRecipientCount({ type: 'filter', filters: d.filters })
    : (d.contactIds || []).map(id => getContacts().find(c => c.id === id)).filter(c => c && EMAIL_RE.test((c.email || '').trim())).length;

  const save = () => {
    if (!d.name.trim()) { toast('Name your list', 'risk'); return; }
    if (isEdit) {
      const patch = d.kind === 'active' ? { name: d.name, description: d.description, filters: d.filters } : { name: d.name, description: d.description, contactIds: d.contactIds };
      const r = updateList(d.id, patch);
      if (r.error) { toast(r.message, 'risk'); return; }
      toast('List updated');
      onSaved?.(r.list); onClose?.();
      return;
    }
    const r = createList({ name: d.name, kind: d.kind, description: d.description, filters: d.filters, contactIds: d.contactIds });
    if (r.error) { toast(r.message, 'risk'); return; }
    toast('List created');
    onSaved?.(r.list); onClose?.();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit list' : 'New list'} width={680}
      footer={
        <div className="row between" style={{ width: '100%', gap: '.75rem' }}>
          <span className="t-sm muted">{previewCount.toLocaleString()} contact{previewCount === 1 ? '' : 's'} - {emailCount.toLocaleString()} emailable</span>
          <div className="row gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save}>{isEdit ? 'Save list' : 'Create list'}</Button>
          </div>
        </div>
      }>
      <div className="col gap-3">
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px', gap: '.85rem' }}>
          <Field label="List name">
            <Input autoFocus placeholder="Q4 launch VIPs" value={d.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Type" hint={isEdit ? 'Type is fixed after creation' : (d.kind === 'active' ? 'Recomputes from a filter' : 'A fixed, hand-picked snapshot')}>
            {isEdit
              ? <div style={{ paddingTop: 6 }}><Badge tone={KIND_TONE[d.kind]}>{d.kind === 'active' ? 'Active (filter)' : 'Static (snapshot)'}</Badge></div>
              : <Segmented options={[{ value: 'static', label: 'Static' }, { value: 'active', label: 'Active' }]} value={d.kind} onChange={v => set('kind', v)} />}
          </Field>
        </div>

        <Field label="Description (optional)">
          <Textarea rows={2} placeholder="What is this audience for?" value={d.description} onChange={e => set('description', e.target.value)} />
        </Field>

        {d.kind === 'active' ? (
          <Field label="Membership filter">
            <FilterEditor objectType="contact" filters={d.filters} onChange={f => set('filters', f)} />
          </Field>
        ) : (
          <Field label="Members">
            <ContactPicker selected={d.contactIds} onChange={ids => set('contactIds', ids)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------
   Members viewer
   ------------------------------------------------------------ */
function MembersModal({ list, onClose }) {
  if (!list) return null;
  const members = resolveListMembers(list);
  const recipients = resolveListRecipients(list);
  return (
    <Modal open={!!list} onClose={onClose} title={`${list.name} - members`} width={620}
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="row gap-2 wrap" style={{ marginBottom: '.9rem' }}>
        <Badge tone={KIND_TONE[list.kind]}>{list.kind === 'active' ? 'Active (filter)' : 'Static (snapshot)'}</Badge>
        <Badge tone="accent">{members.length.toLocaleString()} contacts</Badge>
        <Badge>{recipients.length.toLocaleString()} emailable</Badge>
      </div>
      {members.length === 0 ? (
        <EmptyState icon="👥" title="No members yet" body={list.kind === 'active' ? 'No contacts match this filter right now.' : 'Add contacts to this list from the edit screen.'} />
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', maxHeight: '52vh', overflowY: 'auto' }}>
          {members.map(c => {
            const co = getCompany(c.companyId);
            const bad = !EMAIL_RE.test((c.email || '').trim());
            return (
              <div key={c.id} className="row gap-2" style={{ padding: '.55rem .7rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <Avatar name={contactName(c)} size={28} />
                <div className="col" style={{ minWidth: 0, flex: 1 }}>
                  <Link to={`/contacts/${c.id}`} className="link fw-6 clip" style={{ fontSize: '.94rem' }}>{contactName(c)}</Link>
                  <span className="t-xs muted clip">{c.email || 'no email'}{co ? ` - ${co.name}` : ''}</span>
                </div>
                {bad && <Badge tone="warn" className="t-xs">no email</Badge>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------
   Page
   ------------------------------------------------------------ */
export default function Lists() {
  useStore();     // live counts as contacts change
  useLists();     // re-render on list writes
  const toast = useToast();
  const [editor, setEditor] = useState({ open: false, initial: null });
  const [viewing, setViewing] = useState(null);

  const lists = getLists();
  const stats = listStats();

  const openNew = () => setEditor({ open: true, initial: null });
  const openEdit = (l) => setEditor({ open: true, initial: l });
  const onDuplicate = (l) => { duplicateList(l.id); toast('Duplicated'); };
  const onDelete = (l) => { deleteList(l.id); toast('Deleted'); };

  return (
    <div className="col gap-3 fade-up">
      <SectionHeader
        title="Lists"
        sub="Build the audiences your campaigns send to - static snapshots or live filters"
        action={<Button variant="primary" size="sm" onClick={openNew}><Icon name="plus" size={16} /> New list</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard label="Lists" value={stats.total} sub="in this workspace" icon={<Icon name="list" size={18} />} />
        <StatCard label="Active lists" value={stats.active} sub="filter-driven" icon={<Icon name="filter" size={18} />} accent="#0ea5a3" />
        <StatCard label="Static lists" value={stats.static} sub="hand-picked" icon={<Icon name="users" size={18} />} accent="#e0752d" />
        <StatCard label="Members" value={stats.totalMembers} sub="across all lists" icon={<Icon name="mail" size={18} />} />
      </div>

      {lists.length === 0 ? (
        <Card>
          <EmptyState icon="🎯" title="No lists yet"
            body="Create a static list of hand-picked contacts, or an active list that recomputes from a filter. Both feed your campaigns."
            action={<Button variant="primary" size="sm" onClick={openNew}><Icon name="plus" size={16} /> New list</Button>}
          />
        </Card>
      ) : (
        <div className="col gap-3">
          {lists.map(l => {
            const count = resolveListMembers(l).length;
            const emailable = resolveListRecipients(l).length;
            return (
              <Card key={l.id} hover>
                <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                  <div className="col gap-1" style={{ minWidth: 0, flex: '1 1 320px' }}>
                    <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                      <span className="fw-7" style={{ color: 'var(--ink)', fontSize: '1.02rem' }}>{l.name}</span>
                      <Badge tone={KIND_TONE[l.kind]}>{l.kind === 'active' ? 'Active' : 'Static'}</Badge>
                    </div>
                    {l.description && <div className="t-sm muted clip">{l.description}</div>}
                    <div className="row gap-3 t-xs muted wrap" style={{ marginTop: 2 }}>
                      <span><Icon name="users" size={13} /> {count.toLocaleString()} contact{count === 1 ? '' : 's'}</span>
                      <span><Icon name="mail" size={13} /> {emailable.toLocaleString()} emailable</span>
                      <span><Icon name="edit" size={13} /> Updated {relTime(l.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="row gap-1" style={{ flex: 'none' }}>
                    <Button variant="quiet" size="sm" onClick={() => setViewing(l)} title="View members"><Icon name="users" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => openEdit(l)} title="Edit"><Icon name="edit" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDuplicate(l)} title="Duplicate"><Icon name="copy" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDelete(l)} title="Delete"><Icon name="trash" size={15} /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ListEditor open={editor.open} initial={editor.initial} onClose={() => setEditor({ open: false, initial: null })} onSaved={() => {}} />
      <MembersModal list={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
