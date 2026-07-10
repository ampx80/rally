// Contacts list. One DataTable over the whole book of contacts with inline
// email edit, bulk reassign, and a New-contact modal. All reads come from the
// store via useStore() so mutations anywhere re-render this view live.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useStore, getContacts, contactName, getCompany, getCompanies,
  getUsers, userName, getCurrentUser, createContact, updateContact,
} from '../lib/store.js';
import DataTable from '../components/DataTable.jsx';
import ViewBar from '../components/ViewBar.jsx';
import { applyView } from '../lib/views.js';
import { SectionHeader, Button, Avatar, Badge, Field, Input, Select, Modal, useToast, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

export default function Contacts() {
  useStore();                       // subscribe for reactivity
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState(null);
  const allContacts = getContacts();
  const contacts = applyView(allContacts, view, 'contact', { currentUserId: getCurrentUser().id });

  const [open, setOpen] = useState(false);
  const emptyForm = { firstName: '', lastName: '', email: '', phone: '', title: '', companyId: '', ownerId: getCurrentUser().id };
  const [form, setForm] = useState(emptyForm);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const r = createContact({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      title: form.title,
      companyId: form.companyId || null,
      ownerId: form.ownerId,
    });
    if (r.error) return toast(r.message, 'risk');
    setOpen(false);
    setForm(emptyForm);
    toast('Contact created');
    navigate(`/contacts/${r.contact.id}`);
  };

  const columns = [
    {
      key: 'name', header: 'Name', sortable: true,
      sortValue: (r) => contactName(r),
      render: (r) => (
        <Link to={`/contacts/${r.id}`} onClick={(e) => e.stopPropagation()}
          className="row gap-2 link fw-6" style={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar name={contactName(r)} size={26} />
          <span className="clip">{contactName(r)}</span>
        </Link>
      ),
    },
    { key: 'title', header: 'Title', render: (r) => r.title || '-' },
    {
      key: 'company', header: 'Company', sortable: true,
      sortValue: (r) => getCompany(r.companyId)?.name || '',
      render: (r) => {
        const co = getCompany(r.companyId);
        return co
          ? <Link to={`/companies/${co.id}`} onClick={(e) => e.stopPropagation()} className="link">{co.name}</Link>
          : <span className="muted">-</span>;
      },
    },
    { key: 'email', header: 'Email', editable: true, render: (r) => r.email || '-' },
    {
      key: 'tags', header: 'Tags', sortable: false,
      render: (r) => (r.tags && r.tags.length)
        ? <span className="row gap-1 wrap">{r.tags.map(t => <Badge key={t} tone="accent">{t}</Badge>)}</span>
        : <span className="muted">-</span>,
    },
    { key: 'owner', header: 'Owner', sortable: true, sortValue: (r) => userName(r.ownerId), render: (r) => userName(r.ownerId) },
    {
      key: 'lastActivity', header: 'Last activity', sortable: true,
      sortValue: (r) => new Date(r.lastActivityAt).getTime(),
      render: (r) => <span className="muted">{relTime(r.lastActivityAt)}</span>,
    },
  ];

  const bulkActions = [
    { label: 'Reassign to me', onClick: (ids) => { const me = getCurrentUser().id; ids.forEach(id => updateContact(id, { ownerId: me })); toast(`${ids.length} reassigned to you`); } },
  ];

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Contacts"
        sub={`${contacts.length} of ${allContacts.length} people`}
        action={<Button variant="primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New contact</Button>}
      />

      <ViewBar objectType="contact" onView={setView} />

      <DataTable
        columns={columns}
        rows={contacts}
        getId={(r) => r.id}
        onRowClick={(r) => navigate(`/contacts/${r.id}`)}
        searchable
        searchKeys={['firstName', 'lastName', 'email', 'title']}
        searchPlaceholder="Filter contacts..."
        initialSort={{ key: 'lastActivity', dir: 'desc' }}
        bulkActions={bulkActions}
        onEdit={(row, key, value) => { if (key === 'email') { updateContact(row.id, { email: value }); toast('Email updated'); } }}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New contact"
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Create contact</Button>
        </>}>
        <div className="col gap-3">
          <div className="row gap-3 wrap">
            <div style={{ flex: '1 1 200px' }}><Field label="First name"><Input value={form.firstName} onChange={set('firstName')} placeholder="Jane" autoFocus /></Field></div>
            <div style={{ flex: '1 1 200px' }}><Field label="Last name"><Input value={form.lastName} onChange={set('lastName')} placeholder="Doe" /></Field></div>
          </div>
          <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" /></Field>
          <div className="row gap-3 wrap">
            <div style={{ flex: '1 1 200px' }}><Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" /></Field></div>
            <div style={{ flex: '1 1 200px' }}><Field label="Title"><Input value={form.title} onChange={set('title')} placeholder="VP of Sales" /></Field></div>
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
        </div>
      </Modal>
    </div>
  );
}
