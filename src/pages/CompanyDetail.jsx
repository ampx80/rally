// Company detail. Header card with health + owner, three stat tiles, contacts
// and deals sections, and a right-rail activity timeline. Reads its id from
// useParams() ONLY; a missing company renders a Not-found card, never a
// permanent spinner. All reads flow through useStore() for live reactivity.
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useStore, getCompany, getContactsForCompany, getDealsForCompany,
  getUsers, userName, contactName, stageById, updateCompany,
} from '../lib/store.js';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import RecordDetailPanel from '../components/RecordDetailPanel.jsx';
import {
  Card, Button, Badge, Avatar, Stat, Field, Input, Select, Modal,
  EmptyState, useToast, HealthDot, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const INDUSTRY_OPTIONS = ['SaaS', 'Manufacturing', 'Healthcare', 'Financial Services', 'Logistics', 'Retail', 'Energy', 'Media', 'Real Estate', 'Construction', 'Biotech', 'Aerospace'];
const SIZE_OPTIONS = ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const HEALTH_OPTIONS = [
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'red', label: 'Red' },
];
const HEALTH_TONE = { green: 'ok', yellow: 'warn', red: 'risk' };
const STAGE_COLORS = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5', proposal: '#b3721a',
  negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');

export default function CompanyDetail() {
  useStore();                       // subscribe for reactivity
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const co = getCompany(id);

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(null);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!co) {
    return (
      <Card className="col center gap-3" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem' }}>🏢</div>
        <h3 style={{ margin: 0 }}>Company not found</h3>
        <div className="muted">This account may have been removed or the link is out of date.</div>
        <Link to="/companies" className="btn btn-primary">Back to companies</Link>
      </Card>
    );
  }

  const contacts = getContactsForCompany(id);
  const deals = getDealsForCompany(id);
  const openDeals = deals.filter(d => d.status === 'open');
  const openPipeline = openDeals.reduce((s, d) => s + d.value, 0);

  const openEditor = () => {
    setForm({
      name: co.name, domain: co.domain || '', industry: co.industry || 'SaaS',
      size: co.size || '51-200', location: co.location || '',
      ownerId: co.ownerId, health: co.health || 'green',
    });
    setEdit(true);
  };
  const saveEdit = () => {
    if (!form.name.trim()) return toast('Company name is required.', 'risk');
    updateCompany(id, {
      name: form.name.trim(), domain: form.domain, industry: form.industry,
      size: form.size, location: form.location, ownerId: form.ownerId, health: form.health,
    });
    setEdit(false);
    toast('Company updated');
  };

  const metaLine = [co.industry, co.size, co.location].filter(Boolean).join(' - ');

  return (
    <div className="col gap-3">
      {/* breadcrumb */}
      <div className="row gap-1 t-sm muted" style={{ alignItems: 'center' }}>
        <Link to="/companies" className="link">Companies</Link>
        <Icon name="chevronRight" size={14} />
        <span className="fw-6" style={{ color: 'var(--ink)' }}>{co.name}</span>
      </div>

      {/* header card */}
      <Card>
        <div className="row between gap-3 wrap" style={{ alignItems: 'flex-start' }}>
          <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar name={co.name} size={52} />
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0 }} className="clip">{co.name}</h2>
              <div className="muted t-sm clip">{metaLine || 'No details yet'}</div>
              <div className="row gap-2 wrap" style={{ alignItems: 'center', marginTop: 2 }}>
                <Badge tone={HEALTH_TONE[co.health] || 'default'}>
                  <span className="row gap-1" style={{ alignItems: 'center' }}>
                    <HealthDot health={co.health} /> {cap(co.health)}
                  </span>
                </Badge>
                {co.domain && (
                  <a href={`https://${co.domain}`} target="_blank" rel="noreferrer" className="link t-sm">{co.domain}</a>
                )}
              </div>
            </div>
          </div>
          <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <Avatar name={userName(co.ownerId)} size={30} />
              <div className="col">
                <span className="t-xs muted">Owner</span>
                <span className="fw-6 t-sm">{userName(co.ownerId)}</span>
              </div>
            </div>
            <Button variant="ghost" onClick={openEditor}><Icon name="edit" size={16} /> Edit</Button>
          </div>
        </div>
      </Card>

      {/* stat tiles */}
      <div className="row gap-3 wrap">
        <Card className="card-hover" style={{ flex: '1 1 200px' }}>
          <Stat value={moneyK(openPipeline)} label="Open pipeline" sub={`${openDeals.length} open deals`}
            icon={<Icon name="dollar" size={18} />} onClick={() => navigate('/deals')} />
        </Card>
        <Card style={{ flex: '1 1 200px' }}>
          <Stat value={openDeals.length} label="Open deals" icon={<Icon name="target" size={18} />} />
        </Card>
        <Card style={{ flex: '1 1 200px' }}>
          <Stat value={contacts.length} label="Contacts" icon={<Icon name="users" size={18} />} />
        </Card>
      </div>

      {/* two-column: main content + right-rail timeline */}
      <div className="row gap-3 wrap" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-3" style={{ flex: '1 1 460px', minWidth: 0 }}>

          {/* contacts */}
          <Card pad={false}>
            <div className="row between" style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
              <h4 style={{ margin: 0 }}>Contacts</h4>
              <Badge>{contacts.length}</Badge>
            </div>
            {contacts.length === 0 ? (
              <EmptyState icon="👤" title="No contacts yet" body="People linked to this account will appear here." />
            ) : (
              <div className="col">
                {contacts.map((c, i) => (
                  <div key={c.id} className="row between gap-2"
                    style={{ padding: '.75rem 1.25rem', borderBottom: i < contacts.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <Link to={`/contacts/${c.id}`} className="row gap-2 link fw-6" style={{ alignItems: 'center', minWidth: 0 }}>
                      <Avatar name={contactName(c)} size={30} />
                      <span className="clip">{contactName(c)}</span>
                    </Link>
                    <div className="col" style={{ textAlign: 'right', minWidth: 0 }}>
                      <span className="t-sm clip">{c.title || '-'}</span>
                      {c.email && <span className="t-xs muted clip">{c.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* deals */}
          <Card pad={false}>
            <div className="row between" style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
              <h4 style={{ margin: 0 }}>Deals</h4>
              <Badge>{deals.length}</Badge>
            </div>
            {deals.length === 0 ? (
              <EmptyState icon="🎯" title="No deals yet" body="Open opportunities for this account will appear here." />
            ) : (
              <div className="col">
                {deals.map((d, i) => {
                  const st = stageById(d.stage);
                  const color = STAGE_COLORS[d.stage] || 'var(--n-400)';
                  return (
                    <div key={d.id} className="row between gap-2"
                      style={{ padding: '.75rem 1.25rem', borderBottom: i < deals.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <Link to={`/deals/${d.id}`} className="link fw-6 clip" style={{ minWidth: 0 }}>{d.name}</Link>
                      <div className="row gap-3" style={{ alignItems: 'center', flex: 'none' }}>
                        <Badge style={{ background: color + '1a', color }}>
                          <span className="row gap-1" style={{ alignItems: 'center' }}>
                            <span className="dot" style={{ background: color }} /> {st?.name || cap(d.stage)}
                          </span>
                        </Badge>
                        <span className="fw-7">{moneyK(d.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* right rail: activity timeline */}
        <div className="col gap-2" style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 420 }}>
          <div className="eyebrow">Activity</div>
          <ActivityTimeline relatedType="company" relatedId={id} companyId={id} />
        </div>
      </div>

      {/* edit modal */}
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit company"
        footer={<>
          <Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit}>Save changes</Button>
        </>}>
        {form && (
          <div className="col gap-3">
            <Field label="Company name"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
            <Field label="Domain"><Input value={form.domain} onChange={set('domain')} placeholder="vertexrobotics.com" /></Field>
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
        )}
      </Modal>
      <RecordDetailPanel objectType="company" record={co} onPatch={(p) => updateCompany(co.id, p)} />
    </div>
  );
}
