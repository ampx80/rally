// Leads workspace. Top-of-funnel demand, scored by a real deterministic AI
// model before it becomes an account. A ranked inbox (sorted by AI lead score
// shown as a Ring), a KPI rail, a by-source funnel, a lead-detail modal with a
// full "why this score" breakdown + one-click real conversion to a deal, and a
// web-to-lead capture tab with an embeddable form preview and a live simulate
// button. Reads live company/user data from the store; owns its lead book in
// leads-data.js, persisted to localStorage so the whole surface stays alive.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Badge, StatCard, Segmented, Tabs, Modal, Field, Input,
  Select, Textarea, EmptyState, useToast, Avatar, Ring, ProgressBar, relTime,
} from '../components/UI.jsx';
import { createContact, createDeal, getCurrentUser } from '../lib/store.js';
import {
  getLeads, subscribeLeads, setLeadStatus, removeLead, simulateInboundLead,
  scoreLead, scoreBand, SOURCES, LEAD_STATUSES,
} from '../lib/leads-data.js';

/* Inline icons (project convention: UI primitives draw their own SVG). */
function Icon({ name, size = 18 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    funnel: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></>,
    code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
    rocket: <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />,
  };
  return <svg {...p} style={{ display: 'block' }}>{paths[name] || null}</svg>;
}

/* Subscribe to the leads book; re-render on any mutation. */
function useLeads() {
  const [leads, setLeads] = useState(getLeads);
  useEffect(() => subscribeLeads(setLeads), []);
  return leads;
}

const STATUS_TONE = { New: 'info', Working: 'warn', Qualified: 'ok', Unqualified: 'default' };

export default function Leads() {
  const leads = useLeads();
  const toast = useToast();
  const me = getCurrentUser();
  const [tab, setTab] = useState('inbox');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  // Score every lead, then sort hottest-first. Memoized on the book.
  const scored = useMemo(
    () => leads
      .map(l => ({ ...l, ...scoreLead(l) }))
      .sort((a, b) => b.score - a.score),
    [leads],
  );

  const selected = scored.find(l => l.id === selectedId) || null;

  const filtered = statusFilter === 'All'
    ? scored
    : scored.filter(l => l.status === statusFilter);

  /* ---------- KPI stats ---------- */
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const newThisWeek = scored.filter(l => new Date(l.createdAt).getTime() >= weekAgo).length;
    const avg = scored.length ? Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length) : 0;
    const decided = scored.filter(l => l.status === 'Qualified' || l.status === 'Unqualified').length;
    const qualified = scored.filter(l => l.status === 'Qualified').length;
    const qualifiedRate = decided ? Math.round((qualified / decided) * 100) : 0;

    const bySource = {};
    for (const l of scored) bySource[l.source] = (bySource[l.source] || 0) + 1;
    const sourceRows = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
    const hottest = sourceRows[0]?.[0] || '-';
    return { newThisWeek, avg, qualifiedRate, hottest, sourceRows };
  }, [scored]);

  const statusCounts = useMemo(() => {
    const c = { All: scored.length };
    for (const s of LEAD_STATUSES) c[s] = scored.filter(l => l.status === s).length;
    return c;
  }, [scored]);

  /* ---------- actions ---------- */
  const changeStatus = (id, status) => {
    setLeadStatus(id, status);
    toast(`Marked ${status.toLowerCase()}`);
  };

  const convert = (lead) => {
    // Real conversion: create a contact and an open deal in the live store.
    const [firstName, ...rest] = lead.name.split(' ');
    const c = createContact({
      firstName,
      lastName: rest.join(' '),
      email: lead.email,
      phone: lead.phone,
      title: lead.title,
      companyId: lead.companyId || undefined,
      tags: ['inbound'],
    });
    if (c.error) return toast(c.message, 'risk');
    const d = createDeal({
      name: `${lead.company} - New opportunity`,
      companyId: lead.companyId || undefined,
      contactIds: [c.contact.id],
      value: 40000,
      stage: 'lead',
      ownerId: me?.id,
    });
    if (d.error) return toast(d.message, 'risk');
    removeLead(lead.id);
    setSelectedId(null);
    toast(`Converted ${lead.name} to a deal`);
  };

  const simulate = () => {
    const l = simulateInboundLead();
    toast(`New lead captured: ${l.name}`);
    setTab('inbox');
    setStatusFilter('All');
  };

  const maxSource = Math.max(1, ...stats.sourceRows.map(r => r[1]));

  return (
    <div className="fade-up">
      <div className="row between wrap" style={{ gap: '1rem', marginBottom: '1.15rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="eyebrow">Demand</div>
          <h2 style={{ margin: 0 }}>Leads</h2>
          <div className="muted t-sm">AI-scored inbound and outbound, ranked so you always work the hottest lead first.</div>
        </div>
        <Button variant="primary" size="sm" onClick={simulate}>
          <span className="row gap-1"><Icon name="bolt" size={16} /> Simulate lead</span>
        </Button>
      </div>

      <Tabs
        tabs={[
          { key: 'inbox', label: 'Lead inbox', count: scored.length },
          { key: 'capture', label: 'Web-to-lead form' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'inbox' ? (
        <>
          {/* KPI rail */}
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.15rem' }}>
            <StatCard label="New this week" value={stats.newThisWeek} icon={<Icon name="inbox" />} sub="fresh in the funnel" />
            <StatCard label="Avg AI score" value={stats.avg} icon={<Icon name="bolt" />} accent="var(--accent)" sub="lead quality index" />
            <StatCard label="Qualified rate" value={stats.qualifiedRate} format={(n) => `${Math.round(n)}%`} icon={<Icon name="check" />} accent="var(--ok)" sub="of decided leads" />
            <StatCard label="Hottest source" value={stats.hottest} icon={<Icon name="funnel" />} sub="most inbound volume" />
          </div>

          {/* Leads by source bar */}
          <Card className="card-pad" style={{ marginBottom: '1.15rem' }}>
            <div className="row between" style={{ marginBottom: '.9rem' }}>
              <div className="col gap-1"><div className="eyebrow">Pipeline top</div><h4 style={{ margin: 0 }}>Leads by source</h4></div>
              <Badge tone="accent">{scored.length} total</Badge>
            </div>
            <div className="col gap-3">
              {stats.sourceRows.map(([src, n]) => (
                <div key={src} className="col gap-1">
                  <div className="row between">
                    <span className="fw-6">{src}</span>
                    <span className="tnum muted t-sm">{n} - avg quality {Math.round((SOURCES[src] ?? 0.5) * 100)}</span>
                  </div>
                  <ProgressBar value={(n / maxSource) * 100} height={12} />
                </div>
              ))}
            </div>
          </Card>

          {/* Filter */}
          <div className="row between wrap" style={{ marginBottom: '.85rem', gap: '1rem' }}>
            <Segmented
              options={['All', ...LEAD_STATUSES].map(s => ({ value: s, label: `${s} ${statusCounts[s] ?? 0}` }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <span className="t-sm muted">{filtered.length} shown - sorted by AI score</span>
          </div>

          {/* Inbox list */}
          {filtered.length === 0 ? (
            <Card><EmptyState icon="📭" title="No leads here" body="No leads match this status. Try a different filter or simulate a new inbound lead." action={<Button variant="primary" size="sm" onClick={simulate}>Simulate a lead</Button>} /></Card>
          ) : (
            <div className="col gap-2">
              {filtered.map(l => {
                const band = scoreBand(l.score);
                return (
                  <Card key={l.id} hover className="card-pad" onClick={() => setSelectedId(l.id)} style={{ cursor: 'pointer' }}>
                    <div className="row gap-3" style={{ alignItems: 'center' }}>
                      <Ring value={l.score} size={54} stroke={6} color={band.color} label={l.score} />
                      <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
                        <div className="row gap-2" style={{ minWidth: 0 }}>
                          <Avatar name={l.name} size={28} />
                          <span className="fw-7" style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                          <Badge tone={band.tone} className="t-xs">{band.label}</Badge>
                        </div>
                        <div className="t-sm muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.title} - {l.company} - {l.companySize}
                        </div>
                      </div>
                      <div className="col gap-1" style={{ flex: 'none', textAlign: 'right', alignItems: 'flex-end' }}>
                        <Badge>{l.source}</Badge>
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                          <Badge tone={STATUS_TONE[l.status] || 'default'} className="t-xs">{l.status}</Badge>
                          <span className="t-xs muted">{relTime(l.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <CaptureTab onSimulate={simulate} />
      )}

      {/* Lead detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.name : ''}
        width={620}
        footer={selected && (
          <>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
            <Button variant="accent" onClick={() => convert(selected)}>
              <span className="row gap-1"><Icon name="rocket" size={16} /> Convert to deal</span>
            </Button>
          </>
        )}
      >
        {selected && <LeadDetail lead={selected} onStatus={changeStatus} />}
      </Modal>
    </div>
  );
}

/* ---------- Lead detail body: contact info + score breakdown + status ---------- */
function LeadDetail({ lead, onStatus }) {
  const band = scoreBand(lead.score);
  return (
    <div className="col gap-3">
      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <Ring value={lead.score} size={72} stroke={7} color={band.color} label={lead.score} />
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <div className="row gap-2"><span className="fw-7" style={{ fontSize: '1.05rem' }}>{lead.title}</span><Badge tone={band.tone}>{band.label} lead</Badge></div>
          <div className="muted">{lead.company} - {lead.companySize} employees</div>
        </div>
      </div>

      {/* contact info */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '.6rem' }}>
        <InfoCell label="Email" value={lead.email} />
        <InfoCell label="Phone" value={lead.phone} />
        <InfoCell label="Source" value={lead.source} />
        <InfoCell label="Age" value={relTime(lead.createdAt)} />
      </div>

      {/* why this score */}
      <div>
        <div className="row between" style={{ marginBottom: '.6rem' }}>
          <div className="eyebrow">AI lead score - why this score</div>
          <span className="tnum fw-7" style={{ color: band.color }}>{lead.score}/100</span>
        </div>
        <div className="col gap-3">
          {lead.parts.map(p => (
            <div key={p.key} className="col gap-1">
              <div className="row between">
                <span className="fw-6">{p.label} <span className="muted t-sm">- {p.detail}</span></span>
                <span className="tnum t-sm fw-6">+{Math.round(p.points)} <span className="muted">/ {p.max}</span></span>
              </div>
              <ProgressBar value={p.pct * 100} height={9} color={band.color} />
            </div>
          ))}
        </div>
      </div>

      {/* status control */}
      <div>
        <div className="eyebrow" style={{ marginBottom: '.5rem' }}>Status</div>
        <Segmented options={LEAD_STATUSES} value={lead.status} onChange={(s) => onStatus(lead.id, s)} />
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="col gap-1">
      <div className="t-xs muted">{label}</div>
      <div className="fw-6" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '-'}</div>
    </div>
  );
}

/* ---------- Web-to-lead capture tab: form preview + embed snippet ---------- */
function CaptureTab({ onSimulate }) {
  const embed = `<!-- Rally web-to-lead capture -->
<form action="https://api.rally.app/v1/leads/capture" method="POST">
  <input type="hidden" name="workspace" value="rally-prod" />
  <input name="name" placeholder="Full name" required />
  <input name="email" type="email" placeholder="Work email" required />
  <input name="company" placeholder="Company" />
  <input name="title" placeholder="Job title" />
  <button type="submit">Request a demo</button>
</form>
<script src="https://cdn.rally.app/embed.js" async></script>`;

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.15rem' }}>
      <Card className="card-pad">
        <div className="eyebrow" style={{ marginBottom: '.3rem' }}>Live preview</div>
        <h4 style={{ margin: '0 0 1rem' }}>What your prospect sees</h4>
        <div className="col gap-3">
          <Field label="Full name"><Input placeholder="Jamie Rivera" disabled /></Field>
          <Field label="Work email"><Input placeholder="jamie@northgate.com" disabled /></Field>
          <Field label="Company"><Input placeholder="Northgate Systems" disabled /></Field>
          <Field label="Job title"><Input placeholder="VP of Sales" disabled /></Field>
          <Field label="What are you looking to solve?"><Textarea placeholder="Tell us about your revenue goals..." disabled /></Field>
          <Field label="Best source">
            <Select disabled defaultValue="Web form">
              {Object.keys(SOURCES).map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Button variant="primary" disabled>Request a demo</Button>
          <div className="t-xs muted">Every capture is auto-scored by Rally AI and lands ranked in your inbox. No manual routing.</div>
        </div>
      </Card>

      <div className="col gap-3">
        <Card className="card-pad">
          <div className="eyebrow" style={{ marginBottom: '.3rem' }}>Embed</div>
          <h4 style={{ margin: '0 0 .8rem' }}>Drop this on any page</h4>
          <pre style={{ margin: 0, padding: '1rem', background: 'var(--n-100)', borderRadius: 'var(--r-sm)', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '.82rem', lineHeight: 1.55, color: 'var(--ink)' }}>{embed}</pre>
        </Card>
        <Card className="card-pad">
          <div className="row between wrap" style={{ gap: '.8rem', alignItems: 'center' }}>
            <div className="col gap-1" style={{ minWidth: 0 }}>
              <h4 style={{ margin: 0 }}>Test the pipe</h4>
              <div className="muted t-sm">Fire a realistic inbound lead through the capture endpoint and watch it get scored.</div>
            </div>
            <Button variant="accent" onClick={onSimulate} style={{ flex: 'none' }}>
              <span className="row gap-1"><Icon name="bolt" size={16} /> Simulate new lead</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
