// Companies list. One DataTable over the whole book of accounts with health,
// owner, and computed open-deal exposure per row, bulk reassign, and a
// New-company modal. All reads flow through useStore() so mutations anywhere
// re-render this view live.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useStore, getCompanies, getDealsForCompany, getUsers, userName,
  getCurrentUser, createCompany, updateCompany,
} from '../lib/store.js';
import DataTable from '../components/DataTable.jsx';
import { SectionHeader, Button, Badge, Field, Input, Select, Modal, useToast, HealthDot, moneyK } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const INDUSTRY_OPTIONS = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy', 'Media', 'Real Estate', 'Construction', 'Biotech', 'Aerospace'];
const SIZE_OPTIONS = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const HEALTH_OPTIONS = [
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'red', label: 'Red' },
];
const HEALTH_RANK = { red: 0, yellow: 1, green: 2 };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');

// Open exposure for a company: count of open deals + summed value.
function openExposure(coId) {
  const open = getDealsForCompany(coId).filter(d => d.status === 'open');
  return { count: open.length, sum: open.reduce((s, d) => s + d.value, 0) };
}

export default function Companies() {
  useStore();                       // subscribe for reactivity
  const navigate = useNavigate();
  const toast = useToast();
  const companies = getCompanies();

  const [open, setOpen] = useState(false);
  const emptyForm = { name: '', domain: '', industry: 'SaaS', size: '51-200', location: '', ownerId: getCurrentUser().id, health: 'green' };
  const [form, setForm] = useState(emptyForm);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const r = createCompany({
      name: form.name,
      domain: form.domain,
      industry: form.industry,
      size: form.size,
      location: form.location,
      ownerId: form.ownerId,
      health: form.health,
    });
    if (r.error) return toast(r.message, 'risk');
    setOpen(false);
    setForm(emptyForm);
    toast('Company created');
    navigate(`/companies/${r.company.id}`);
  };

  const columns = [
    {
      key: 'name', header: 'Name', sortable: true,
      render: (r) => (
        <Link to={`/companies/${r.id}`} onClick={(e) => e.stopPropagation()}
          className="link fw-6 clip" style={{ minWidth: 0 }}>{r.name}</Link>
      ),
    },
    { key: 'industry', header: 'Industry', render: (r) => r.industry || '-' },
    { key: 'size', header: 'Size', render: (r) => r.size || '-' },
    { key: 'location', header: 'Location', render: (r) => r.location || <span className="muted">-</span> },
    {
      key: 'health', header: 'Health', sortable: true,
      sortValue: (r) => HEALTH_RANK[r.health] ?? 3,
      render: (r) => (
        <span className="row gap-2" style={{ alignItems: 'center' }}>
          <HealthDot health={r.health} /> {cap(r.health)}
        </span>
      ),
    },
    { key: 'owner', header: 'Owner', sortable: true, sortValue: (r) => userName(r.ownerId), render: (r) => userName(r.ownerId) },
    {
      key: 'openDeals', header: 'Open deals', sortable: true, align: 'right',
      sortValue: (r) => openExposure(r.id).sum,
      render: (r) => {
        const { count, sum } = openExposure(r.id);
        return count ? <span className="fw-6">{count} - {moneyK(sum)}</span> : <span className="muted">-</span>;
      },
    },
  ];

  const bulkActions = [
    { label: 'Reassign to me', onClick: (ids) => { const me = getCurrentUser().id; ids.forEach(id => updateCompany(id, { ownerId: me })); toast(`${ids.length} reassigned to you`); } },
  ];

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Companies"
        sub={`${companies.length} accounts in your book of business`}
        action={<Button variant="primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New company</Button>}
      />

      <DataTable
        columns={columns}
        rows={companies}
        getId={(r) => r.id}
        onRowClick={(r) => navigate(`/companies/${r.id}`)}
        searchable
        searchKeys={['name', 'industry', 'location']}
        searchPlaceholder="Filter companies..."
        initialSort={{ key: 'name', dir: 'asc' }}
        bulkActions={bulkActions}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New company"
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Create company</Button>
        </>}>
        <div className="col gap-3">
          <Field label="Company name"><Input value={form.name} onChange={set('name')} placeholder="Vertex Robotics" autoFocus /></Field>
          <Field label="Domain" hint="Optional. Defaults from the company name.">
            <Input value={form.domain} onChange={set('domain')} placeholder="vertexrobotics.com" />
          </Field>
          <div className="row gap-3 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Industry">
                <Select value={form.industry} onChange={set('industry')}>
                  {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Size">
                <Select value={form.size} onChange={set('size')}>
                  {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
          </div>
          <Field label="Location"><Input value={form.location} onChange={set('location')} placeholder="Austin, TX" /></Field>
          <div className="row gap-3 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Owner">
                <Select value={form.ownerId} onChange={set('ownerId')}>
                  {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Health">
                <Select value={form.health} onChange={set('health')}>
                  {HEALTH_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
