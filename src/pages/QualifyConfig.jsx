// QualifyConfig - the admin cockpit for Ardova's early-release qualifying flow.
// The hero question ("How badly do you want to leave Salesforce?", 1-10) drives
// routing: HOT (>=7) / Nurture (4-6) / Waitlist (<=3). The pipeline sorts by
// urgency so you work the people who want out the most, first. Their pain quote
// is surfaced front and center - it is gold. Reads/writes the local-first engine
// (src/lib/prequalify.js) the /get-started flow uses. NO em-dash. ASCII only.
import React, { useState } from 'react';
import {
  SectionHeader, Card, Badge, Field, Input, StatCard, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  usePrequal, updateConfig, funnelStats, updateSubmission, deleteSubmission,
  submissionsByUrgency, ROUTE_META, toolLabel,
} from '../lib/prequalify.js';

const STATUS_FLOW = ['new', 'booked', 'called', 'won', 'lost'];
const routeTone = (r) => (ROUTE_META[r] || {}).tone || 'default';
const routeText = (r) => (ROUTE_META[r] || {}).label || r;

export default function QualifyConfig() {
  const { config } = usePrequal();
  const [tab, setTab] = useState('pipeline');
  const stats = funnelStats();

  return (
    <div className="fade-up">
      <SectionHeader
        title="Qualifying"
        sub="Early release, hand-picked. The hero question is how badly they want out of Salesforce - the pipeline sorts by exactly that."
        action={<a className="btn btn-ghost btn-sm" href="/get-started" target="_blank" rel="noreferrer"><Icon name="eye" size={16} /> View live form</a>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Leads" value={stats.total} icon={<Icon name="users" size={18} />} />
        <StatCard label="Hot (7+)" value={stats.hot} icon={<Icon name="bolt" size={18} />} accent="var(--ok)" />
        <StatCard label="Avg urgency" value={stats.avgUrgency} format={(n) => `${n}/10`} icon={<Icon name="trendUp" size={18} />} accent="#e0752d" />
        <StatCard label="Booked" value={stats.booked} icon={<Icon name="calendar" size={18} />} accent="var(--accent)" />
      </div>

      <div className="row gap-2" style={{ marginBottom: '1rem' }}>
        <button className={`btn btn-sm ${tab === 'pipeline' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pipeline')}><Icon name="funnel" size={15} /> Pipeline ({stats.total})</button>
        <button className={`btn btn-sm ${tab === 'config' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('config')}><Icon name="sliders" size={15} /> Configure</button>
      </div>

      {tab === 'config' ? <ConfigTab config={config} /> : <PipelineTab />}
    </div>
  );
}

function ConfigTab({ config }) {
  const patch = (p) => updateConfig(p);
  return (
    <div className="col gap-3">
      <Card>
        <div className="fw-6" style={{ marginBottom: '.8rem', color: 'var(--ink)' }}>Copy</div>
        <Field label="Headline"><Input value={config.headline} onChange={e => patch({ headline: e.target.value })} /></Field>
        <Field label="Subhead"><Input value={config.subhead} onChange={e => patch({ subhead: e.target.value })} /></Field>
      </Card>
      <Card>
        <div className="fw-6" style={{ marginBottom: '.8rem', color: 'var(--ink)' }}>Routing + booking</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          <Field label="Hot at urgency >=" hint="7 and up go white-glove."><Input type="number" value={config.hotThreshold} onChange={e => patch({ hotThreshold: Number(e.target.value) || 7 })} /></Field>
          <Field label="Nurture at urgency >=" hint="Below hot, above this = nurture."><Input type="number" value={config.nurtureThreshold} onChange={e => patch({ nurtureThreshold: Number(e.target.value) || 4 })} /></Field>
          <Field label="AE title" hint="Shown to hot leads."><Input value={config.aeTitle} onChange={e => patch({ aeTitle: e.target.value })} /></Field>
          <Field label="Booking URL" hint="In-app booking (always books)."><Input value={config.bookingUrl} onChange={e => patch({ bookingUrl: e.target.value })} /></Field>
          <Field label="Calendly URL" hint="Optional. If set, hot leads book here."><Input value={config.calendlyUrl} placeholder="https://calendly.com/you/migration" onChange={e => patch({ calendlyUrl: e.target.value })} /></Field>
        </div>
      </Card>
      <Card>
        <div className="fw-6" style={{ marginBottom: '.5rem', color: 'var(--ink)' }}>The questions (fixed)</div>
        <ul className="col gap-1" style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', fontSize: 14 }}>
          <li><b style={{ color: 'var(--ink)' }}>How badly do you want to leave Salesforce?</b> (1-10 slider - the score)</li>
          <li>What are you on now? (Salesforce / HubSpot / GoHighLevel / Zoho / spreadsheets / other)</li>
          <li>How many seats?</li>
          <li>What is the #1 thing that makes you want to leave? (free text)</li>
          <li>Name, work email, company, optional phone</li>
        </ul>
      </Card>
    </div>
  );
}

function PipelineTab() {
  const toast = useToast();
  usePrequal();
  const rows = submissionsByUrgency();
  if (!rows.length) {
    return <EmptyState icon="🎯" title="No leads yet" body="When someone tells us how badly they want out of Salesforce, they show up here - hottest first, with their pain quote." action={<a className="btn btn-primary" href="/get-started" target="_blank" rel="noreferrer"><Icon name="eye" size={16} /> Open the form</a>} />;
  }
  return (
    <div className="col gap-2">
      {rows.map(s => {
        const rm = ROUTE_META[s.route] || ROUTE_META.nurture;
        return (
          <Card key={s.id} style={{ borderLeft: `3px solid ${rm.color}` }}>
            <div className="row between wrap" style={{ gap: '.8rem', alignItems: 'flex-start' }}>
              <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
                <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="fw-7 tnum" style={{ color: rm.color, fontSize: '1.15rem' }}>{s.urgency}/10</span>
                  <span className="fw-6" style={{ color: 'var(--ink)' }}>{s.name || 'Unnamed'}</span>
                  <Badge tone={routeTone(s.route)}>{routeText(s.route)}</Badge>
                  <span className="t-sm muted">{s.urgencyLabel}</span>
                </div>
                <div className="t-sm muted">
                  {s.company ? `${s.company} - ` : ''}on {toolLabel(s.currentTool) || 'unknown'}{s.seats ? ` - ${s.seats} seats` : ''}
                </div>
                <div className="t-sm muted">{s.email}{s.phone ? ` - ${s.phone}` : ''}</div>
                {s.pain && (
                  <div style={{ marginTop: 6, padding: '10px 12px', borderRadius: 10, background: 'var(--page)', border: '1px solid var(--line)', fontStyle: 'italic', color: 'var(--ink)', fontSize: 14 }}>
                    "{s.pain}"
                  </div>
                )}
              </div>
              <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
                <select className="select" value={s.status} onChange={e => { updateSubmission(s.id, { status: e.target.value }); toast('Updated'); }} style={{ width: 130 }}>
                  {STATUS_FLOW.map(st => <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>)}
                </select>
                <button className="btn btn-quiet" title="Delete" onClick={() => deleteSubmission(s.id)} style={{ color: 'var(--muted)', padding: '.35rem .5rem' }}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
