// Surveys. Rally's closed-loop feedback engine - NPS, CSAT and CES with
// automated follow-up. HubSpot charges for Service Hub to get this; GoHighLevel
// simply does not have it. Four surfaces over one local-first store
// (src/lib/surveys-data.js): a program list, a survey builder, a results
// dashboard (NPS gauge + verbatim stream), and follow-up rules that close the
// loop (detractor -> ticket, promoter -> review). 100% functional with seeded
// data + zero backend; real sends are env-gated and degrade to a local queue.
import React, { useEffect, useMemo, useState } from 'react';
import {
  useSurveys, getSurveys, getSurvey, getResponsesForSurvey, getRules, getFollowUps,
  surveyStats, programStats, triggerAudience, hasSendEnv,
  createSurvey, updateSurvey, deleteSurvey, toggleSurvey, sendSurvey,
  recordResponse, applyFollowUp, runRule, toggleRule, updateRule,
  SURVEY_TYPES, typeById, TRIGGERS, triggerById, CHANNELS, channelById,
  SEGMENTS, segmentById, BANDS, SENTIMENT_META, RULE_ACTIONS,
  bandOf, formatMetric, metricBand,
} from '../lib/surveys-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input, Select,
  Textarea, Modal, EmptyState, Tabs, Sparkline, ProgressBar, Segmented,
  GradientText, StatCard, useToast, relTime, avatarColor,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ---------- type chip ---------- */
function TypeChip({ type, size = 'sm' }) {
  const t = typeById(type);
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: size === 'lg' ? 26 : 20, height: size === 'lg' ? 26 : 20, borderRadius: 6, background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size === 'lg' ? 11 : 9, letterSpacing: '.02em', flex: 'none' }}>{t.label}</span>
    </span>
  );
}

/* ---------- semicircular gauge (the NPS hero) ---------- */
function Gauge({ value, min, max, color, big, sub }) {
  const w = 240, r = 96, cx = w / 2, cy = 116, sw = 16;
  const arcLen = Math.PI * r;
  const f = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const needleAngle = Math.PI * (1 - f); // 180deg (left) -> 0deg (right)
  const nx = cx + (r - 4) * Math.cos(needleAngle);
  const ny = cy - (r - 4) * Math.sin(needleAngle);
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
  return (
    <svg width={w} height={cy + 30} viewBox={`0 0 ${w} ${cy + 30}`} style={{ display: 'block', maxWidth: '100%' }}>
      <path d={track} fill="none" stroke="var(--n-100)" strokeWidth={sw} strokeLinecap="round" />
      <path d={track} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={arcLen} strokeDashoffset={arcLen * (1 - f)} style={{ transition: 'stroke-dashoffset .7s var(--ease)' }} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="var(--ink)" />
      <text x={cx} y={cy - 26} textAnchor="middle" style={{ fontWeight: 800, fontSize: 40, fill: 'var(--ink)', letterSpacing: '-.02em' }}>{big}</text>
      {sub && <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--n-600)' }}>{sub}</text>}
      <text x={cx - r} y={cy + 22} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: 'var(--n-400)' }}>{min}</text>
      <text x={cx + r} y={cy + 22} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: 'var(--n-400)' }}>{max}</text>
    </svg>
  );
}

/* ---------- promoter / passive / detractor segmented bar ---------- */
function BandBar({ breakdown, height = 20 }) {
  const total = breakdown.total || 1;
  return (
    <div className="col gap-2">
      <div className="row" style={{ height, borderRadius: 999, overflow: 'hidden', background: 'var(--n-100)' }}>
        {['promoter', 'passive', 'detractor'].map(k => {
          const v = breakdown[k];
          if (!v) return null;
          return <div key={k} title={`${BANDS[k].short}: ${v}`} style={{ width: `${(v / total) * 100}%`, background: BANDS[k].color, transition: 'width .6s var(--ease)' }} />;
        })}
      </div>
      <div className="row gap-3 wrap">
        {['promoter', 'passive', 'detractor'].map(k => (
          <span key={k} className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="dot" style={{ background: BANDS[k].color }} />
            <span className="fw-6 t-sm">{BANDS[k].short}</span>
            <span className="tnum muted t-sm">{breakdown[k]} ({Math.round((breakdown[k] / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- scale preview row (min..max buttons colored by band) ---------- */
function ScaleRow({ type, value, onPick }) {
  const t = typeById(type);
  const vals = [];
  for (let i = t.scale.min; i <= t.scale.max; i++) vals.push(i);
  return (
    <div className="col gap-1">
      <div className="row gap-1 wrap">
        {vals.map(v => {
          const band = bandOf(type, v);
          const on = value === v;
          return (
            <button key={v} onClick={onPick ? () => onPick(v) : undefined}
              className="btn" disabled={!onPick}
              style={{
                width: 40, height: 40, padding: 0, borderRadius: 'var(--r-sm)',
                background: on ? BANDS[band].color : 'var(--n-50)',
                color: on ? '#fff' : 'var(--ink-2)',
                border: `1px solid ${on ? BANDS[band].color : 'var(--line)'}`,
                fontWeight: 700, cursor: onPick ? 'pointer' : 'default', opacity: 1,
              }}>{v}</button>
          );
        })}
      </div>
      <div className="row between t-xs muted">
        <span>{t.lowLabel}</span><span>{t.highLabel}</span>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 1 - SURVEY LIST
   ============================================================ */
function SurveyList({ onOpen, onBuild, toast }) {
  const surveys = getSurveys();
  const p = programStats();
  const sentTotal = p.sentiment.positive + p.sentiment.neutral + p.sentiment.negative || 1;

  return (
    <div className="col gap-3">
      {/* program KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard label="Active surveys" value={p.active} icon={<Icon name="inbox" size={18} />} sub={`${p.total} total programs`} />
        <StatCard label="Responses" value={p.responded} icon={<Icon name="messages" size={18} />} accent="var(--accent-teal)" sub={`${p.sent.toLocaleString()} invitations sent`} />
        <StatCard label="Response rate" value={Math.round(p.responseRate * 100)} format={(n) => Math.round(n) + '%'} icon={<Icon name="chart" size={18} />} accent="var(--accent-purple)" sub="Across every program" />
        <StatCard label="Loops closed" value={p.loopsClosed} icon={<Icon name="check" size={18} />} accent="var(--ok)" sub={`${p.detractorsOpen} detractors still open`} />
      </div>

      {/* positioning banner */}
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Closed-loop feedback</div>
            <h3 style={{ margin: 0 }}>NPS, CSAT and CES that actually feed retention</h3>
            <div className="muted t-sm" style={{ maxWidth: 560 }}>Score every moment of truth, then let the loop close itself: a detractor opens a ticket, a promoter gets asked for a review. The Service Hub staple, free with Rally.</div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => askRook('Summarize my survey program. Which survey needs attention and what should I do about open detractors?')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => onBuild()}><Icon name="plus" size={16} /> New survey</Button>
          </div>
        </div>
      </Card>

      {/* survey cards */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {surveys.map(s => {
          const st = surveyStats(s.id);
          const tg = triggerById(s.trigger);
          const ch = channelById(s.channel);
          return (
            <Card key={s.id} hover className="col gap-3" style={{ cursor: 'pointer' }} onClick={() => onOpen(s.id)}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <TypeChip type={s.type} size="lg" />
                  <div className="col" style={{ gap: 2, minWidth: 0 }}>
                    <span className="fw-7 clip" style={{ fontSize: '1.05rem' }}>{s.name}</span>
                    <span className="t-xs muted">{typeById(s.type).full}</span>
                  </div>
                </div>
                <Badge tone={s.status === 'active' ? 'ok' : s.status === 'paused' ? 'warn' : 'default'}>{s.status}</Badge>
              </div>

              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div className="col" style={{ gap: 2 }}>
                  <span className="stat-label">{st.type.metricLabel}</span>
                  <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                    <span style={{ fontSize: '2.3rem', fontWeight: 800, letterSpacing: '-.03em', color: st.band.color }}>{st.metricStr}</span>
                    <span className="t-xs fw-6" style={{ color: st.band.color }}>{st.band.grade}</span>
                  </span>
                </div>
                <Sparkline data={st.trend} w={104} h={38} color={st.type.color} />
              </div>

              <BandBar breakdown={st.breakdown} height={12} />

              <div className="row between t-sm" style={{ borderTop: '1px solid var(--line)', paddingTop: '.8rem' }}>
                <span className="row gap-1 muted"><Icon name={tg.icon} size={14} /> {tg.label}</span>
                <span className="row gap-1 muted"><Icon name={ch.icon} size={14} /> {ch.label}</span>
              </div>
              <div className="row between t-sm">
                <span className="muted"><span className="fw-7 tnum" style={{ color: 'var(--ink)' }}>{st.responded}</span> of {s.sent.toLocaleString()} answered</span>
                <span className="fw-6" style={{ color: st.responseRate >= 0.4 ? 'var(--ok)' : 'var(--warn)' }}>{Math.round(st.responseRate * 100)}% rate</span>
              </div>
              {st.needsFollowUp > 0 && (
                <div className="row gap-1 t-xs fw-6" style={{ color: 'var(--risk)' }}>
                  <Icon name="bell" size={13} /> {st.needsFollowUp} detractor{st.needsFollowUp === 1 ? '' : 's'} awaiting follow-up
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 - BUILDER
   ============================================================ */
function Builder({ activeId, setActiveId, toast, onViewResults }) {
  const surveys = getSurveys();
  const survey = getSurvey(activeId) || surveys[0];
  const [form, setForm] = useState(() => survey ? { ...survey } : null);

  // Re-sync the form whenever the selected survey changes.
  useEffect(() => { if (survey) setForm({ ...survey }); }, [survey?.id]);
  if (!form) return <Card><EmptyState icon="📝" title="No survey selected" body="Create a survey to start building." action={<Button variant="accent" onClick={() => { const r = createSurvey({}); setActiveId(r.survey.id); }}>New survey</Button>} /></Card>;

  const t = typeById(form.type);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  // When the type changes, adopt that type's default copy if the operator has
  // not written their own yet (keeps the builder helpful, never destructive).
  const setType = (type) => {
    const nt = typeById(type);
    setForm(f => ({
      ...f, type,
      question: (f.question === typeById(f.type).question || !f.question) ? nt.question : f.question,
      followUp: (f.followUp === typeById(f.type).followUp || !f.followUp) ? nt.followUp : f.followUp,
    }));
  };

  const save = () => {
    const r = updateSurvey(form.id, {
      name: form.name, type: form.type, question: form.question,
      followUp: form.followUp, trigger: form.trigger, channel: form.channel,
    });
    if (r.error) return toast(r.message, 'risk');
    toast('Survey saved');
  };
  const send = () => {
    const r = sendSurvey(form.id, 25);
    if (r.error) return toast(r.message, 'risk');
    toast(hasSendEnv() ? '25 invitations sent' : '25 invitations queued (connect a provider to send)');
  };
  const audience = triggerAudience(form.trigger);

  return (
    <div className="col gap-3">
      {/* survey switcher */}
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6 muted">Editing</span>
          <Select value={form.id} onChange={e => setActiveId(e.target.value)} style={{ width: 240 }}>
            {surveys.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Badge tone={form.status === 'active' ? 'ok' : form.status === 'paused' ? 'warn' : 'default'}>{form.status}</Badge>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={() => { const r = createSurvey({}); setActiveId(r.survey.id); toast('Draft survey created'); }}><Icon name="plus" size={14} /> New</Button>
          <Button variant="ghost" size="sm" onClick={onViewResults}><Icon name="chart" size={14} /> Results</Button>
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1.05fr .95fr', alignItems: 'start' }}>
        {/* config */}
        <Card className="col gap-3">
          <SectionHeader title="Build the survey" sub="Pick a method, write the question, choose when it fires" />
          <Field label="Survey name"><Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Relationship NPS" /></Field>

          <div className="field">
            <label>Feedback method</label>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '.6rem' }}>
              {SURVEY_TYPES.map(ty => {
                const on = form.type === ty.id;
                return (
                  <button key={ty.id} onClick={() => setType(ty.id)} className="panel card-pad col gap-1"
                    style={{ textAlign: 'left', cursor: 'pointer', border: `1.5px solid ${on ? ty.color : 'var(--line)'}`, background: on ? 'var(--n-25)' : 'var(--paper)' }}>
                    <span className="row between"><TypeChip type={ty.id} /><span>{on && <Icon name="check" size={16} style={{ color: ty.color }} />}</span></span>
                    <span className="fw-7 t-sm">{ty.full}</span>
                    <span className="t-xs muted">{ty.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Question" hint={`Scored ${t.scale.min} to ${t.scale.max}`}>
            <Textarea rows={2} value={form.question} onChange={e => set({ question: e.target.value })} />
          </Field>
          <Field label="Follow-up question" hint="Shown after they pick a score, to capture the why">
            <Textarea rows={2} value={form.followUp} onChange={e => set({ followUp: e.target.value })} />
          </Field>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Trigger">
              <Select value={form.trigger} onChange={e => set({ trigger: e.target.value })}>
                {TRIGGERS.map(tr => <option key={tr.id} value={tr.id}>{tr.label}</option>)}
              </Select>
            </Field>
            <Field label="Channel">
              <Select value={form.channel} onChange={e => set({ channel: e.target.value })}>
                {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="panel card-pad row gap-2 t-sm" style={{ background: 'var(--n-25)', alignItems: 'center' }}>
            <Icon name={triggerById(form.trigger).icon} size={16} style={{ color: 'var(--accent)' }} />
            <span className="muted">{triggerById(form.trigger).desc}{audience > 0 && <> <span className="fw-7" style={{ color: 'var(--ink)' }}>{audience.toLocaleString()}</span> customers are queued behind this trigger.</>}</span>
          </div>

          <div className="row gap-1 wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <Button variant="accent" onClick={save}><Icon name="check" size={15} /> Save survey</Button>
            <Button variant="ghost" onClick={send}><Icon name="send" size={15} /> Send wave</Button>
            <Button variant="ghost" onClick={() => { toggleSurvey(form.id); }}><Icon name={form.status === 'active' ? 'moon' : 'zap'} size={15} /> {form.status === 'active' ? 'Pause' : 'Activate'}</Button>
            <div className="spacer" />
            <Button variant="quiet" onClick={() => askRook(`Write a ${t.full} question and a good follow-up prompt for a ${form.trigger} survey sent by ${form.channel}.`)}><Icon name="sparkles" size={15} /> Ask Rook to write it</Button>
          </div>
        </Card>

        {/* live preview */}
        <Card style={{ background: 'var(--n-25)', position: 'sticky', top: '1rem' }}>
          <SectionHeader title="Live preview" sub="Exactly what the customer sees" />
          <div style={{ borderRadius: 'var(--r-lg)', padding: '1.5rem', background: 'var(--paper)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)' }}>
            <div className="row gap-2" style={{ marginBottom: '1rem', alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--accent), var(--accent-600))', color: '#fff', fontWeight: 800 }}>R</div>
              <div className="col" style={{ gap: 0 }}>
                <span className="fw-7 t-sm">Northstar Home Services</span>
                <span className="t-xs muted">via {channelById(form.channel).label}</span>
              </div>
            </div>
            <p style={{ margin: '0 0 1.1rem', fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.35, color: 'var(--ink)' }}>{form.question}</p>
            <ScaleRow type={form.type} />
            <p style={{ margin: '1.2rem 0 .5rem', fontSize: '.92rem', fontWeight: 600, color: 'var(--ink-2)' }}>{form.followUp}</p>
            <div className="input" style={{ color: 'var(--n-400)', minHeight: 54, display: 'flex', alignItems: 'flex-start' }}>Type your answer...</div>
            <div className="row center" style={{ marginTop: '1rem' }}><span className="t-xs muted">Powered by Rally</span></div>
          </div>
          {!hasSendEnv() && <div className="t-xs muted row gap-1" style={{ marginTop: '.9rem' }}><Icon name="lock" size={13} /> No send provider connected. Waves queue locally and go out once email/SMS env is wired.</div>}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 - RESULTS
   ============================================================ */
function VerbatimCard({ r, onFollowUp }) {
  const meta = SENTIMENT_META[r.sentiment];
  const seg = segmentById(r.segment);
  const suggestedAction = r.band === 'detractor' ? 'ticket' : r.band === 'promoter' ? 'review' : 'notify';
  return (
    <Card className="col gap-2">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <Avatar name={r.respondent} size={38} color={avatarColor(r.respondent)} />
          <div className="col" style={{ gap: 2, minWidth: 0 }}>
            <span className="fw-7 clip">{r.respondent}</span>
            <span className="t-xs muted clip">{r.company || 'Customer'}</span>
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4, flex: 'none' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: BANDS[r.band].color, lineHeight: 1 }}>{r.score}</span>
          <Badge tone={BANDS[r.band].tone} className="t-xs">{BANDS[r.band].label}</Badge>
        </div>
      </div>
      {r.comment
        ? <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '.96rem', lineHeight: 1.55 }}>{r.comment}</p>
        : <p style={{ margin: 0, color: 'var(--n-400)', fontSize: '.92rem', fontStyle: 'italic' }}>No comment left.</p>}
      <div className="row between wrap" style={{ gap: '.5rem', alignItems: 'center' }}>
        <div className="row gap-1 wrap">
          <Badge tone="default" style={{ background: 'color-mix(in srgb, ' + seg.color + ' 16%, transparent)', color: seg.color }}>{seg.label}</Badge>
          <span className="row gap-1 t-xs muted"><span className="dot" style={{ background: meta.color }} />{meta.label}</span>
          <span className="t-xs muted">{relTime(r.createdAt)}</span>
        </div>
        {r.followedUp
          ? <Badge tone={RULE_ACTIONS[r.followUpAction]?.tone || 'ok'} className="t-xs"><Icon name="check" size={11} /> {RULE_ACTIONS[r.followUpAction]?.verb || 'Handled'}</Badge>
          : <Button variant="ghost" size="sm" onClick={() => onFollowUp(r, suggestedAction)}>
              <Icon name={RULE_ACTIONS[suggestedAction].icon} size={13} /> {suggestedAction === 'ticket' ? 'Open ticket' : suggestedAction === 'review' ? 'Ask for review' : 'Notify owner'}
            </Button>}
      </div>
    </Card>
  );
}

function Results({ activeId, setActiveId, toast }) {
  const surveys = getSurveys();
  const survey = getSurvey(activeId) || surveys[0];
  const [segment, setSegment] = useState('all');
  const [band, setBand] = useState('all');
  const [logOpen, setLogOpen] = useState(false);
  if (!survey) return <Card><EmptyState icon="📊" title="No surveys yet" body="Build a survey to collect results." /></Card>;

  const st = surveyStats(survey.id);
  const all = getResponsesForSurvey(survey.id).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const t = st.type;
  const filtered = all.filter(r => (segment === 'all' || r.segment === segment) && (band === 'all' || r.band === band));
  const withComment = filtered.filter(r => r.comment);
  const openDetractors = all.filter(r => r.band === 'detractor' && !r.followedUp).length;

  const doFollowUp = (r, action) => {
    const res = applyFollowUp(r.id, action);
    if (res.error) return toast(res.message, 'risk');
    toast(RULE_ACTIONS[action].verb);
  };

  return (
    <div className="col gap-3">
      {/* survey switcher */}
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6 muted">Results for</span>
          <Select value={survey.id} onChange={e => { setActiveId(e.target.value); setSegment('all'); setBand('all'); }} style={{ width: 240 }}>
            {surveys.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Badge tone={survey.status === 'active' ? 'ok' : survey.status === 'paused' ? 'warn' : 'default'}>{survey.status}</Badge>
        </div>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={() => askRook(`Analyze the results of my ${t.full} survey "${survey.name}". What themes are in the verbatim comments and what should I do first?`)}><Icon name="sparkles" size={14} /> Ask Rook</Button>
          <Button variant="accent" size="sm" onClick={() => setLogOpen(true)}><Icon name="plus" size={14} /> Log response</Button>
        </div>
      </Card>

      {/* hero: gauge + supporting KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr 1fr 1fr' }}>
        <Card className="col center gap-1">
          <div className="stat-label" style={{ alignSelf: 'flex-start' }}>{t.metricLabel} score</div>
          <Gauge value={st.metric} min={t.id === 'nps' ? -100 : t.id === 'csat' ? 0 : t.scale.min} max={t.id === 'nps' ? 100 : (t.id === 'csat' ? 100 : t.scale.max)}
            color={st.band.color} big={st.metricStr} sub={st.band.grade} />
          <div className="t-xs muted" style={{ marginTop: -8 }}>{t.metricLabel} range {t.range}</div>
        </Card>
        <StatCard label="Responses" value={st.responded} icon={<Icon name="messages" size={18} />} accent="var(--accent-teal)" sub={`${Math.round(st.responseRate * 100)}% of ${survey.sent.toLocaleString()} sent`} />
        <StatCard label={t.id === 'ces' ? 'Avg effort' : 'Avg rating'} value={st.avg} format={(n) => n.toFixed(1)} icon={<Icon name="star" size={18} />} accent="var(--accent-purple)" sub={`out of ${t.scale.max}`} />
        <StatCard label="New this month" value={st.newThisMonth} icon={<Icon name="activity" size={18} />} spark={st.trend} sparkColor={t.color} accent={t.color} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* distribution */}
        <Card className="col gap-3">
          <SectionHeader title="Response mix" sub="Promoters, passives and detractors" />
          <BandBar breakdown={st.breakdown} height={22} />
          <div className="panel card-pad row between" style={{ background: openDetractors ? 'var(--risk-bg)' : 'var(--ok-bg)' }}>
            <span className="row gap-2" style={{ alignItems: 'center' }}>
              <Icon name={openDetractors ? 'bell' : 'shield'} size={18} style={{ color: openDetractors ? 'var(--risk)' : 'var(--ok)' }} />
              <span className="fw-6 t-sm" style={{ color: openDetractors ? 'var(--risk)' : 'var(--ok)' }}>
                {openDetractors ? `${openDetractors} detractor${openDetractors === 1 ? '' : 's'} waiting to be recovered` : 'Every detractor loop is closed'}
              </span>
            </span>
            {openDetractors > 0 && <Button variant="danger" size="sm" onClick={() => { const rr = runRule('rule_detractor'); toast(`${rr.count} ticket${rr.count === 1 ? '' : 's'} opened`); }}>Recover all</Button>}
          </div>
        </Card>

        {/* score histogram */}
        <Card className="col gap-2">
          <SectionHeader title="Score distribution" sub={`Every answer, ${t.scale.min} to ${t.scale.max}`} />
          <ScoreHistogram type={survey.type} responses={all} />
        </Card>
      </div>

      {/* verbatim stream */}
      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ gap: '.75rem', paddingBottom: '.9rem' }}>
          <SectionHeader title="Verbatim responses" sub={`${withComment.length} comment${withComment.length === 1 ? '' : 's'} from ${filtered.length} response${filtered.length === 1 ? '' : 's'}`} />
          <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
            <Segmented value={band} onChange={setBand} options={[
              { value: 'all', label: 'All' }, { value: 'promoter', label: 'Promoters' },
              { value: 'passive', label: 'Passives' }, { value: 'detractor', label: 'Detractors' },
            ]} />
            <Select value={segment} onChange={e => setSegment(e.target.value)} style={{ width: 150 }}>
              <option value="all">All segments</option>
              {SEGMENTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="card-pad" style={{ paddingTop: 0 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {withComment.map(r => <VerbatimCard key={r.id} r={r} onFollowUp={doFollowUp} />)}
          </div>
          {!withComment.length && <EmptyState icon="💬" title="No comments match" body="Adjust the band or segment filters to see verbatim feedback." />}
        </div>
      </Card>

      {logOpen && <LogResponseModal survey={survey} onClose={() => setLogOpen(false)} toast={toast} />}
    </div>
  );
}

/* ---------- score histogram ---------- */
function ScoreHistogram({ type, responses }) {
  const t = typeById(type);
  const buckets = [];
  for (let i = t.scale.min; i <= t.scale.max; i++) buckets.push({ v: i, n: responses.filter(r => r.score === i).length, band: bandOf(type, i) });
  const max = Math.max(1, ...buckets.map(b => b.n));
  return (
    <div className="row" style={{ alignItems: 'flex-end', gap: 6, height: 140, paddingTop: 8 }}>
      {buckets.map(b => (
        <div key={b.v} className="col center" style={{ flex: 1, gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <span className="t-xs fw-6 tnum" style={{ color: b.n ? 'var(--ink)' : 'var(--n-400)' }}>{b.n}</span>
          <div title={`${b.v}: ${b.n}`} style={{ width: '100%', maxWidth: 30, height: `${(b.n / max) * 100}%`, minHeight: b.n ? 4 : 2, background: b.n ? BANDS[b.band].color : 'var(--n-100)', borderRadius: '4px 4px 0 0', transition: 'height .5s var(--ease)' }} />
          <span className="t-xs muted tnum">{b.v}</span>
        </div>
      ))}
    </div>
  );
}

function LogResponseModal({ survey, onClose, toast }) {
  const t = typeById(survey.type);
  const [score, setScore] = useState(t.scale.max);
  const [comment, setComment] = useState('');
  const [respondent, setRespondent] = useState('');
  const [segment, setSegment] = useState('growth');
  const band = bandOf(survey.type, score);

  const submit = () => {
    const r = recordResponse(survey.id, { score, comment, respondent: respondent || 'New respondent', segment });
    if (r.error) return toast(r.message, 'risk');
    const auto = BANDS[band].sentiment === 'negative' ? ' A ticket was opened automatically.' : BANDS[band].sentiment === 'positive' ? ' A review ask was queued automatically.' : '';
    toast('Response recorded.' + auto);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Log a response" width={560} footer={
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="check" size={15} /> Record</Button></>
    }>
      <div className="col gap-3">
        <div className="panel card-pad col gap-1" style={{ background: 'var(--n-25)' }}>
          <span className="row gap-2"><TypeChip type={survey.type} /><span className="fw-7">{survey.name}</span></span>
          <span className="t-sm muted">{survey.question}</span>
        </div>
        <div className="field">
          <label>Score <span className="muted fw-5">({BANDS[band].label})</span></label>
          <ScaleRow type={survey.type} value={score} onPick={setScore} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Respondent"><Input value={respondent} onChange={e => setRespondent(e.target.value)} placeholder="Jordan Lee" /></Field>
          <Field label="Segment">
            <Select value={segment} onChange={e => setSegment(e.target.value)}>
              {SEGMENTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Comment (optional)"><Textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder={survey.followUp} /></Field>
        <div className="t-xs muted row gap-1"><Icon name="zap" size={13} /> Follow-up rules fire automatically: a detractor opens a ticket, a promoter gets asked for a review.</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   TAB 4 - FOLLOW-UP RULES
   ============================================================ */
function Rules({ toast }) {
  const rules = getRules();
  const log = getFollowUps();
  const responses = useMemo(() => getSurveys().flatMap(s => getResponsesForSurvey(s.id)), []);
  const pending = (band) => responses.filter(r => r.band === band && !r.followedUp).length;

  return (
    <div className="col gap-3">
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 62%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Close the loop automatically</div>
            <h3 style={{ margin: 0 }}>Every score triggers the right next move</h3>
            <div className="muted t-sm" style={{ maxWidth: 540 }}>Feedback without action is just a number. Rally routes each response the moment it lands, so no detractor goes quiet and no promoter goes unasked.</div>
          </div>
          <Button variant="ghost" style={{ flex: 'none' }} onClick={() => askRook('Recommend follow-up rules for my NPS, CSAT and CES surveys and explain the retention impact.')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
        </div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {rules.map(rule => {
          const band = BANDS[rule.when];
          const act = RULE_ACTIONS[rule.action];
          const open = pending(rule.when);
          return (
            <Card key={rule.id} className="col gap-3" style={{ borderTop: `3px solid ${band.color}` }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="row gap-1"><span className="dot" style={{ background: band.color }} /><span className="fw-7">When a {band.label.toLowerCase()} responds</span></span>
                  <span className="t-xs muted">{rule.when === 'detractor' ? 'Recover the relationship before it churns' : rule.when === 'promoter' ? 'Turn goodwill into public proof' : 'Keep the account owner in the loop'}</span>
                </div>
                <button className={`switch ${rule.enabled ? 'on' : ''}`} role="switch" aria-checked={rule.enabled} aria-label="Toggle rule" onClick={() => { toggleRule(rule.id); toast(rule.enabled ? 'Rule paused' : 'Rule on'); }} />
              </div>

              <div className="panel card-pad row gap-2" style={{ background: 'var(--n-25)', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)' }}><Icon name="arrowRight" size={16} /></span>
                <Select value={rule.action} onChange={e => { updateRule(rule.id, { action: e.target.value }); }} style={{ flex: 1 }}>
                  {Object.entries(RULE_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </div>

              <div className="row between t-sm">
                <span className="muted">Closed all-time</span>
                <span className="fw-7 tnum">{rule.triggered}</span>
              </div>
              <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: '.8rem' }}>
                <span className="t-sm" style={{ color: open ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>
                  {open ? `${open} waiting now` : 'Nothing waiting'}
                </span>
                <Button variant="ghost" size="sm" disabled={!open || !rule.enabled} onClick={() => { const r = runRule(rule.id); toast(`${r.count} ${r.count === 1 ? 'loop' : 'loops'} closed`); }}>
                  <Icon name={act.icon} size={13} /> Run now
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* activity log */}
      <Card pad={false}>
        <div className="card-pad" style={{ paddingBottom: '.6rem' }}>
          <SectionHeader title="Recently closed loops" sub="Every automated follow-up, newest first" />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Action</th><th>Customer</th><th>Detail</th><th>When</th></tr></thead>
            <tbody>
              {log.slice(0, 12).map(l => {
                const act = RULE_ACTIONS[l.action] || RULE_ACTIONS.notify;
                return (
                  <tr key={l.id}>
                    <td><Badge tone={act.tone}><Icon name={act.icon} size={12} /> {act.verb}</Badge></td>
                    <td><div className="row gap-2"><Avatar name={l.who} size={28} /><span className="fw-6">{l.who}</span></div></td>
                    <td className="muted t-sm">{l.note}</td>
                    <td className="muted t-sm">{relTime(l.at)}</td>
                  </tr>
                );
              })}
              {!log.length && <tr><td colSpan={4}><EmptyState icon="🔁" title="No loops closed yet" body="Turn on a rule and run it to start closing the loop." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Surveys() {
  useSurveys();
  const toast = useToast();
  const [tab, setTab] = useState('surveys');
  const [activeId, setActiveId] = useState(() => getSurveys()[0]?.id || null);
  const p = programStats();

  const openResults = (id) => { setActiveId(id); setTab('results'); };
  const openBuilder = () => {
    const r = createSurvey({});
    setActiveId(r.survey.id);
    setTab('builder');
    toast('Draft survey created - start building');
  };

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Success & Delivery"
        title={<>Surveys <GradientText>&amp; Feedback</GradientText></>}
        sub="NPS, CSAT and CES in one place, with the follow-up built in. Score every moment of truth and let the loop close itself. The Service Hub staple, free with Rally."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Give me a read on my feedback program: scores, trends, and the single most important action to take today.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={openBuilder}><Icon name="plus" size={16} /> New survey</Button>
          </div>
        }
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'surveys', label: 'Surveys', count: p.total },
        { key: 'builder', label: 'Builder' },
        { key: 'results', label: 'Results' },
        { key: 'rules', label: 'Follow-up rules', count: p.detractorsOpen || undefined },
      ]} />

      {tab === 'surveys' && <SurveyList onOpen={openResults} onBuild={openBuilder} toast={toast} />}
      {tab === 'builder' && <Builder activeId={activeId} setActiveId={setActiveId} toast={toast} onViewResults={() => setTab('results')} />}
      {tab === 'results' && <Results activeId={activeId} setActiveId={setActiveId} toast={toast} />}
      {tab === 'rules' && <Rules toast={toast} />}
    </div>
  );
}
