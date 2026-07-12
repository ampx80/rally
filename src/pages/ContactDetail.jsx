// Contact detail. Two-column record view: a profile + related-deals main
// column and an ActivityTimeline right rail. Reads its id from useParams()
// (store is synchronous, so a missing record renders a clean Not-found card,
// never a spinner). Edit opens a modal that patches through updateContact.
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  useStore, getContact, contactName, getCompany, getCompanies,
  getDealsForContact, getUsers, userName, updateContact, stageById,
} from '../lib/store.js';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import RecordFields, { LifecycleStagePill } from '../components/RecordFields.jsx';
import AuditPanel from '../components/AuditPanel.jsx';
import { getFields } from '../lib/fields.js';
import { Card, Button, Avatar, Badge, Field, Input, Select, Modal, EmptyState, Tabs, useToast, moneyK } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DraftWithAI from '../components/outreach/DraftWithAI.jsx';
import TangoMeetings from '../components/integrations/TangoMeetings.jsx';
import RecordTickets from '../components/integrations/RecordTickets.jsx';
import ConnectedApps from '../components/integrations/ConnectedApps.jsx';
import AssociationsPanel from '../components/associations/AssociationsPanel.jsx';

const STAGE_DOT = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5',
  proposal: '#b3721a', negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};

export default function ContactDetail() {
  useStore();                       // subscribe for reactivity
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const c = getContact(id);

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('overview');

  if (!c) {
    return (
      <Card>
        <EmptyState
          icon="🔍"
          title="Contact not found"
          body="This contact may have been removed or the link is out of date."
          action={<Link to="/contacts" className="btn btn-primary">Back to contacts</Link>}
        />
      </Card>
    );
  }

  const co = getCompany(c.companyId);
  const deals = getDealsForContact(id);

  return (
    <div className="col gap-3">
      <div className="row gap-1 t-sm muted">
        <Link to="/contacts" className="link">Contacts</Link>
        <Icon name="chevronRight" size={14} />
        <span className="fw-6" style={{ color: 'var(--ink)' }}>{contactName(c)}</span>
      </div>

      <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
        {/* MAIN COLUMN */}
        <div className="col gap-3" style={{ flex: '1 1 480px', minWidth: 0 }}>
          <Card>
            <div className="row gap-3 wrap" style={{ alignItems: 'flex-start' }}>
              <Avatar name={contactName(c)} size={64} />
              <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
                <div className="row between gap-2 wrap">
                  <div className="row gap-2 wrap" style={{ alignItems: 'center', minWidth: 0 }}>
                    <h2 style={{ margin: 0 }}>{contactName(c)}</h2>
                    <LifecycleStagePill
                      value={c.lifecycleStage}
                      onChange={(v) => {
                        const r = updateContact(c.id, { lifecycleStage: v });
                        if (r.error) return toast(r.message, 'risk');
                        toast('Lifecycle stage updated');
                      }}
                    />
                  </div>
                  <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
                    <DraftWithAI contact={c} company={co} />
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Icon name="edit" size={15} /> Edit</Button>
                  </div>
                </div>
                {c.title && <div className="muted fw-6">{c.title}</div>}
                {co && (
                  <div className="row gap-1" style={{ alignItems: 'center' }}>
                    <Icon name="building" size={15} style={{ color: 'var(--n-400)' }} />
                    <Link to={`/companies/${co.id}`} className="link">{co.name}</Link>
                  </div>
                )}
                <div className="row gap-3 wrap" style={{ marginTop: '.35rem' }}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="row gap-1 link" style={{ alignItems: 'center' }}>
                      <Icon name="mail" size={15} /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <span className="row gap-1 muted" style={{ alignItems: 'center' }}>
                      <Icon name="phone" size={15} /> {c.phone}
                    </span>
                  )}
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="row gap-1 wrap" style={{ marginTop: '.5rem' }}>
                    {c.tags.map(t => <Badge key={t} tone="accent">{t}</Badge>)}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Tabs
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'fields', label: 'All fields', count: getFields('contact').length },
              { key: 'history', label: 'History' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'fields' && (
            <Card>
              <RecordFields objectType="contact" record={c} onPatch={(patch) => updateContact(c.id, patch)} />
            </Card>
          )}

          {tab === 'history' && (
            <Card>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
                <Icon name="clock" size={18} style={{ color: 'var(--accent-600)' }} />
                <h4 style={{ margin: 0 }}>History</h4>
              </div>
              <AuditPanel objectType="contact" recordId={c.id} />
            </Card>
          )}

          {tab === 'overview' && (
          <Card>
            <div className="row between" style={{ marginBottom: '.9rem' }}>
              <h4 style={{ margin: 0 }}>Related deals</h4>
              <Badge>{deals.length}</Badge>
            </div>
            {deals.length === 0 ? (
              <EmptyState icon="🤝" title="No deals yet" body="Deals that include this contact will appear here." />
            ) : (
              <div className="col gap-2">
                {deals.map(d => {
                  const st = stageById(d.stage);
                  return (
                    <div key={d.id} className="row between gap-2 wrap" style={{ padding: '.7rem 0', borderBottom: '1px solid var(--line)' }}>
                      <div className="col" style={{ minWidth: 0 }}>
                        <Link to={`/deals/${d.id}`} className="link fw-6 clip">{d.name}</Link>
                        <span className="t-sm muted">{moneyK(d.value)}</span>
                      </div>
                      <Badge className="row gap-1" style={{ alignItems: 'center', flex: 'none' }}>
                        <span className="dot" style={{ background: STAGE_DOT[d.stage] || 'var(--n-400)' }} />
                        {st?.name || d.stage}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          )}
        </div>

        {/* RIGHT RAIL */}
        <div className="col gap-3" style={{ flex: '1 1 360px', maxWidth: 400, minWidth: 0 }}>
          <h4 style={{ margin: 0 }}>Activity</h4>
          <ActivityTimeline relatedType="contact" relatedId={id} companyId={c.companyId} />
          <TangoMeetings recordType="contact" record={c} />
          <RecordTickets contactId={c.id} />
          <ConnectedApps relatedType="contact" relatedId={id} companyId={c.companyId} />
          <AssociationsPanel recordType="contact" recordId={c.id} />
        </div>
      </div>

      <EditContactModal open={editing} onClose={() => setEditing(false)} contact={c} toast={toast} />
    </div>
  );
}

function EditContactModal({ open, onClose, contact, toast }) {
  const [form, setForm] = useState(() => toForm(contact));
  // Re-seed the form each time the modal opens against the current record.
  React.useEffect(() => { if (open) setForm(toForm(contact)); }, [open, contact]);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = () => {
    const patch = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      title: form.title,
      companyId: form.companyId || null,
      ownerId: form.ownerId,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    const r = updateContact(contact.id, patch);
    if (r.error) return toast(r.message, 'risk');
    onClose();
    toast('Contact updated');
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit contact"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save changes</Button>
      </>}>
      <div className="col gap-3">
        <div className="row gap-3 wrap">
          <div style={{ flex: '1 1 200px' }}><Field label="First name"><Input value={form.firstName} onChange={set('firstName')} /></Field></div>
          <div style={{ flex: '1 1 200px' }}><Field label="Last name"><Input value={form.lastName} onChange={set('lastName')} /></Field></div>
        </div>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <div className="row gap-3 wrap">
          <div style={{ flex: '1 1 200px' }}><Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field></div>
          <div style={{ flex: '1 1 200px' }}><Field label="Title"><Input value={form.title} onChange={set('title')} /></Field></div>
        </div>
        <Field label="Company">
          <Select value={form.companyId} onChange={set('companyId')}>
            <option value="">No company</option>
            {getCompanies().map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
          </Select>
        </Field>
        <Field label="Owner">
          <Select value={form.ownerId} onChange={set('ownerId')}>
            {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Tags" hint="Comma-separated">
          <Input value={form.tags} onChange={set('tags')} placeholder="champion, technical" />
        </Field>
      </div>
    </Modal>
  );
}

function toForm(c) {
  return {
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email || '',
    phone: c.phone || '',
    title: c.title || '',
    companyId: c.companyId || '',
    ownerId: c.ownerId || '',
    tags: (c.tags || []).join(', '),
  };
}
