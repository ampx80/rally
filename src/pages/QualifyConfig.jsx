// QualifyConfig - the admin cockpit for Rally's sales pre-qualification.
// Two tabs: (1) Configure - edit the questions, per-option fit points, the
// qualify/review thresholds, the AE title, booking URL, and business-email +
// voice toggles; (2) Pipeline - review every submission with its computed fit
// tier and move it through new -> booked -> won/lost. Reads/writes the same
// local-first engine (src/lib/prequalify.js) the /get-started form uses.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import {
  SectionHeader, Card, Button, Badge, Field, Input, Select, StatCard, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  usePrequal, updateConfig, updateQuestion, addQuestion, removeQuestion,
  maxPossibleScore, funnelStats, updateSubmission, deleteSubmission,
} from '../lib/prequalify.js';

const TIER_TONE = { qualified: 'ok', review: 'warn', low: 'default' };
const STATUS_FLOW = ['new', 'booked', 'called', 'won', 'lost'];

export default function QualifyConfig() {
  const { config, submissions } = usePrequal();
  const [tab, setTab] = useState('config');
  const stats = funnelStats();
  const max = maxPossibleScore(config);

  return (
    <div className="fade-up">
      <SectionHeader
        title="Pre-qualification"
        sub="The front door to Rally sales. Configure the qualifying questions and fit rules, then work the pipeline of leads they produce."
        action={<a className="btn btn-ghost btn-sm" href="/get-started" target="_blank" rel="noreferrer"><Icon name="eye" size={16} /> View live form</a>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Submissions" value={stats.total} icon={<Icon name="users" size={18} />} />
        <StatCard label="Qualified" value={stats.qualified} icon={<Icon name="check" size={18} />} accent="var(--ok)" />
        <StatCard label="Qualify rate" value={stats.qualifyRate} format={(n) => `${Math.round(n)}%`} icon={<Icon name="trendUp" size={18} />} />
        <StatCard label="Booked" value={stats.booked} icon={<Icon name="calendar" size={18} />} accent="var(--accent)" />
      </div>

      <div className="row gap-2" style={{ marginBottom: '1rem' }}>
        <button className={`btn btn-sm ${tab === 'config' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('config')}><Icon name="sliders" size={15} /> Configure</button>
        <button className={`btn btn-sm ${tab === 'pipeline' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pipeline')}><Icon name="funnel" size={15} /> Pipeline ({stats.total})</button>
      </div>

      {tab === 'config' ? <ConfigTab config={config} max={max} /> : <PipelineTab submissions={submissions} />}
    </div>
  );
}

function ConfigTab({ config, max }) {
  const toast = useToast();
  const patch = (p) => { updateConfig(p); };
  return (
    <div className="col gap-3">
      <Card>
        <div className="fw-6" style={{ marginBottom: '.8rem', color: 'var(--ink)' }}>Fit rules</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          <Field label="AE title" hint="Shown to qualified leads.">
            <Input value={config.aeTitle} onChange={e => patch({ aeTitle: e.target.value })} />
          </Field>
          <Field label="Booking URL" hint="Where qualified leads book.">
            <Input value={config.bookingUrl} onChange={e => patch({ bookingUrl: e.target.value })} />
          </Field>
          <Field label={`Qualify threshold (of ${max})`} hint="Score at or above this qualifies.">
            <Input type="number" value={config.qualifyThreshold} onChange={e => patch({ qualifyThreshold: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Review threshold" hint="At or above this goes to review.">
            <Input type="number" value={config.reviewThreshold} onChange={e => patch({ reviewThreshold: Number(e.target.value) || 0 })} />
          </Field>
        </div>
        <div className="row gap-3 wrap" style={{ marginTop: '.8rem' }}>
          <Toggle on={config.requireBusinessEmail} onChange={v => patch({ requireBusinessEmail: v })} label="Require business email to qualify" />
          <Toggle on={config.voiceEnabled} onChange={v => patch({ voiceEnabled: v })} label="Offer instant AI voice qualifier" />
        </div>
      </Card>

      <Card>
        <div className="fw-6" style={{ marginBottom: '.4rem', color: 'var(--ink)' }}>Headline + subhead</div>
        <Field label="Headline"><Input value={config.headline} onChange={e => patch({ headline: e.target.value })} /></Field>
        <Field label="Subhead"><Input value={config.subhead} onChange={e => patch({ subhead: e.target.value })} /></Field>
      </Card>

      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="fw-6" style={{ color: 'var(--ink)' }}>Questions</div>
        <Button size="sm" variant="ghost" onClick={() => { addQuestion(); toast('Question added'); }}><Icon name="plus" size={15} /> Add question</Button>
      </div>
      {(config.questions || []).map(q => <QuestionEditor key={q.id} q={q} />)}
    </div>
  );
}

function QuestionEditor({ q }) {
  const toast = useToast();
  const setOpt = (idx, patch) => {
    const options = q.options.map((o, i) => i === idx ? { ...o, ...patch } : o);
    updateQuestion(q.id, { options });
  };
  const addOpt = () => updateQuestion(q.id, { options: [...(q.options || []), { value: `opt${(q.options?.length || 0) + 1}`, label: 'New option', points: 10 }] });
  const rmOpt = (idx) => updateQuestion(q.id, { options: q.options.filter((_, i) => i !== idx) });
  return (
    <Card className="col" style={{ gap: '.7rem' }}>
      <div className="row gap-2 wrap" style={{ alignItems: 'flex-end' }}>
        <Field label="Question" style={{ flex: 1, minWidth: 200 }}>
          <Input value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value })}>
            <option value="select">Choice</option>
            <option value="text">Free text</option>
          </Select>
        </Field>
        <Toggle on={!!q.required} onChange={v => updateQuestion(q.id, { required: v })} label="Required" />
        <button className="btn btn-quiet" title="Remove question" onClick={() => { removeQuestion(q.id); toast('Question removed'); }} style={{ color: 'var(--muted)' }}><Icon name="trash" size={15} /></button>
      </div>

      {q.type === 'select' && (
        <div className="col gap-2">
          <div className="t-xs muted fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>Options and fit points</div>
          {(q.options || []).map((o, i) => (
            <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
              <Input value={o.label} onChange={e => setOpt(i, { label: e.target.value, value: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || o.value })} style={{ flex: 1 }} />
              <div className="row gap-1" style={{ alignItems: 'center', flex: 'none' }}>
                <span className="t-xs muted">pts</span>
                <Input type="number" value={o.points} onChange={e => setOpt(i, { points: Number(e.target.value) || 0 })} style={{ width: 76 }} />
              </div>
              <button className="btn btn-quiet" title="Remove option" onClick={() => rmOpt(i)} style={{ color: 'var(--muted)', padding: '.35rem' }}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={addOpt} style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={14} /> Add option</Button>
        </div>
      )}
    </Card>
  );
}

function PipelineTab({ submissions }) {
  const toast = useToast();
  if (!submissions.length) {
    return <EmptyState icon="🎯" title="No submissions yet" body="When prospects complete the pre-qualification form, they show up here scored and ready to work." action={<a className="btn btn-primary" href="/get-started" target="_blank" rel="noreferrer"><Icon name="eye" size={16} /> Open the form</a>} />;
  }
  return (
    <div className="col gap-2">
      {submissions.map(s => (
        <Card key={s.id} className="row between wrap" style={{ gap: '.8rem', alignItems: 'center' }}>
          <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
            <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="fw-6" style={{ color: 'var(--ink)' }}>{s.name || 'Unnamed'}</span>
              <Badge tone={TIER_TONE[s.tier]}>{s.tier === 'qualified' ? 'Qualified' : s.tier === 'review' ? 'Review' : 'Self-serve'}</Badge>
              <span className="t-sm muted">Fit {s.pct}/100</span>
              {!s.businessEmail && <Badge tone="warn">Personal email</Badge>}
            </div>
            <div className="t-sm muted">{s.email}{s.phone ? ` - ${s.phone}` : ''}{s.company ? ` - ${s.company}` : ''}</div>
          </div>
          <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
            <Select value={s.status} onChange={e => { updateSubmission(s.id, { status: e.target.value }); toast('Updated'); }} style={{ width: 130 }}>
              {STATUS_FLOW.map(st => <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>)}
            </Select>
            <button className="btn btn-quiet" title="Delete" onClick={() => deleteSubmission(s.id)} style={{ color: 'var(--muted)', padding: '.35rem .5rem' }}><Icon name="trash" size={15} /></button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="row gap-2" style={{ alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '.3rem 0' }}>
      <span style={{ position: 'relative', width: 40, height: 23, flex: 'none', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--n-400, #98a1b0)', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
      <span className="t-sm fw-6" style={{ color: 'var(--ink)' }}>{label}</span>
    </button>
  );
}
