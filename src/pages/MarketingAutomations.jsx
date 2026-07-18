// Marketing Automations. The send-orchestration surface for Ardovo's marketing
// engine (src/lib/marketing-engine.js): audience-segment automations that pair
// a lifecycle segment with an email template and dispatch through the hardened
// server primitive. KPI row, per-automation cards with a live funnel, an
// audience + template editor, and a live merge preview. Runs default to a
// SIMULATED send (records to the local events log, zero network); "Send live"
// posts to /api/marketing-run which no-ops without RESEND_API_KEY.
import React, { useMemo, useState } from 'react';
import {
  useMarketingEngine, getAutomations, automationStats, fleetStats,
  resolveAudience, audienceSize, composeSend, mergeContext, renderMergeTags,
  createAutomation, updateAutomation, toggleAutomation, deleteAutomation,
  runAutomation, AUDIENCE_STAGES, TRIGGERS,
} from '../lib/marketing-engine.js';
import { getUsers, getContacts } from '../lib/store.js';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Textarea, Modal,
  StatCard, ProgressBar, EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

function spark(seed, len = 12, rise = 1) {
  const out = [];
  let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) {
    const wobble = ((seed * (i + 3)) % 17) - 8;
    v = Math.max(6, v + wobble + rise * 3);
    out.push(Math.round(v));
  }
  return out;
}

// Chips a caller can toggle on/off (stages, tags).
function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fw-6 t-sm"
      style={{
        padding: '.32rem .7rem', borderRadius: 999, cursor: 'pointer',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--n-200)'}`,
        background: on ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'transparent',
        color: on ? 'var(--accent-600)' : 'var(--muted)',
        transition: 'all .12s',
      }}
    >
      {children}
    </button>
  );
}

function Funnel({ s }) {
  const openW = s.sent ? Math.round((s.opened / s.sent) * 100) : 0;
  const clickW = s.sent ? Math.round((s.clicked / s.sent) * 100) : 0;
  const Row = ({ label, val, w, color }) => (
    <div className="row gap-3" style={{ alignItems: 'center' }}>
      <div className="t-sm muted" style={{ width: 66, flex: 'none' }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}><ProgressBar value={w} height={8} color={color} /></div>
      <div className="tnum fw-6 t-sm" style={{ width: 52, textAlign: 'right', flex: 'none' }}>{val.toLocaleString()}</div>
    </div>
  );
  return (
    <div className="col gap-2" style={{ marginTop: '.6rem' }}>
      <Row label="Sent" val={s.sent} w={100} color="var(--accent)" />
      <Row label="Opened" val={s.opened} w={openW} color="#0ea5a3" />
      <Row label="Clicked" val={s.clicked} w={clickW} color="#e0752d" />
    </div>
  );
}

const emptyDraft = () => ({
  id: null,
  name: '',
  description: '',
  trigger: 'segment',
  audience: { stages: [], tags: [], owner: 'any', requireEmail: true },
  template: { subject: '', preheader: '', body: '', ctaLabel: '', ctaUrl: '' },
  throttleDays: 14,
});

export default function MarketingAutomations() {
  useMarketingEngine();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // draft object or null
  const [busy, setBusy] = useState('');

  const automations = getAutomations();
  const fleet = fleetStats();
  const users = getUsers();

  // Tag universe (for the audience editor) derived from the live book.
  const allTags = useMemo(() => {
    const set = new Set();
    for (const c of getContacts()) for (const t of (c.tags || [])) set.add(t);
    return [...set].sort();
  }, [automations]);

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (a) => setEditing({
    id: a.id, name: a.name, description: a.description, trigger: a.trigger,
    audience: { ...a.audience }, template: { ...a.template }, throttleDays: a.throttleDays,
  });

  const save = () => {
    const d = editing;
    if (!d.name.trim()) return toast('Name your automation', 'risk');
    if (!d.template.subject.trim()) return toast('A subject line is required', 'risk');
    if (d.id) updateAutomation(d.id, { name: d.name, description: d.description, trigger: d.trigger, audience: d.audience, template: d.template, throttleDays: Number(d.throttleDays) || 14 });
    else createAutomation({ name: d.name, description: d.description, trigger: d.trigger, audience: d.audience, template: d.template });
    setEditing(null);
    toast(d.id ? 'Automation updated' : 'Automation created');
  };

  const doRun = async (a, live) => {
    setBusy(a.id + (live ? ':live' : ':sim'));
    try {
      const r = await runAutomation(a.id, { live });
      if (live) {
        if (r.skipped === 'no-api-key' || r.sent === 0 && r.reason) toast('No sender configured (RESEND_API_KEY). Nothing sent.', 'warn');
        else toast(`Sent ${r.sent || 0} live via Resend`);
      } else {
        toast(r.sent ? `Simulated ${r.sent} sends (logged, no email sent)` : 'No one is due right now');
      }
    } finally {
      setBusy('');
    }
  };

  const remove = (a) => {
    if (!window.confirm(`Delete "${a.name}"? This also clears its events log.`)) return;
    deleteAutomation(a.id);
    toast('Automation deleted');
  };

  return (
    <div className="fade-up">
      <SectionHeader
        title="Marketing automations"
        sub={`${automations.length} automations orchestrating audience-based sends`}
        action={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Icon name="plus" size={16} /> New automation
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Emails sent" value={fleet.sent} icon={<Icon name="send" size={18} />} spark={spark(4, 12, 1.1)} />
        <StatCard label="Open rate" value={fleet.openRate} format={pct} icon={<Icon name="mail" size={18} />} accent="#0ea5a3" sparkColor="#0ea5a3" spark={spark(7, 12, 0.7)} />
        <StatCard label="Click rate" value={fleet.clickRate} format={pct} icon={<Icon name="bolt" size={18} />} accent="#e0752d" sparkColor="#e0752d" spark={spark(2, 12, 0.5)} />
        <StatCard label="Active" value={fleet.active} sub={`${fleet.due} recipients due`} icon={<Icon name="megaphone" size={18} />} spark={spark(5, 12, 0.4)} />
      </div>

      <Card className="fade-up" style={{ marginBottom: '1.25rem' }}>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent-600)', flex: 'none', marginTop: 2 }}><Icon name="sparkles" size={18} /></span>
          <div className="t-sm muted">
            Runs default to a <span className="fw-6" style={{ color: 'var(--ink)' }}>simulated send</span> that records to the events log without emailing anyone.
            <span className="fw-6" style={{ color: 'var(--ink)' }}> Send live</span> posts the composed batch to <span className="tnum">/api/marketing-run</span>, which routes every message through Ardovo's hardened email primitive and is a safe no-op until <span className="tnum">RESEND_API_KEY</span> is set. The same endpoint runs on a schedule to mail everyone who becomes due.
          </div>
        </div>
      </Card>

      {automations.length === 0 ? (
        <EmptyState icon="📣" title="No automations yet" body="Create your first audience-based marketing automation." action={<Button variant="primary" onClick={openNew}><Icon name="plus" size={16} /> New automation</Button>} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '1rem' }}>
          {automations.map(a => {
            const s = automationStats(a);
            return (
              <Card key={a.id} className="col" style={{ gap: '.55rem' }}>
                <div className="row between" style={{ alignItems: 'flex-start', gap: '.5rem' }}>
                  <div className="col gap-1" style={{ minWidth: 0 }}>
                    <div className="fw-6" style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                      <Badge tone={a.active ? 'ok' : 'default'}>{a.active ? 'Active' : 'Draft'}</Badge>
                      <Badge>{TRIGGERS[a.trigger]?.label || a.trigger}</Badge>
                    </div>
                  </div>
                  <button className="btn btn-quiet" title={a.active ? 'Pause' : 'Activate'} onClick={() => toggleAutomation(a.id)} style={{ flex: 'none', color: a.active ? 'var(--accent-600)' : 'var(--muted)', padding: '.3rem' }}>
                    <Icon name={a.active ? 'eye' : 'eyeOff'} size={18} />
                  </button>
                </div>

                <div className="t-sm muted" style={{ minHeight: 34 }}>{a.description}</div>

                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  <Badge tone="info">{s.recipients.toLocaleString()} in audience</Badge>
                  {a.active && <Badge tone={s.due ? 'warn' : 'default'}>{s.due} due</Badge>}
                  {(a.audience.stages || []).map(st => (
                    <Badge key={st}>{AUDIENCE_STAGES.find(x => x.id === st)?.label || st}</Badge>
                  ))}
                </div>

                <Funnel s={s} />

                <div className="row gap-3" style={{ marginTop: '.35rem' }}>
                  <div className="col"><span className="tnum fw-6">{pct(s.openRate)}</span><span className="t-xs muted">open</span></div>
                  <div className="col"><span className="tnum fw-6">{pct(s.clickRate)}</span><span className="t-xs muted">click</span></div>
                </div>

                <div className="row gap-2" style={{ marginTop: '.5rem', flexWrap: 'wrap' }}>
                  <Button size="sm" variant="primary" disabled={busy.startsWith(a.id)} onClick={() => doRun(a, false)}>
                    <Icon name="bolt" size={15} /> {busy === a.id + ':sim' ? 'Running...' : 'Simulate run'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy.startsWith(a.id)} onClick={() => doRun(a, true)}>
                    <Icon name="send" size={15} /> Send live
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Icon name="edit" size={15} /> Edit</Button>
                  <button className="btn btn-quiet" title="Delete" onClick={() => remove(a)} style={{ color: 'var(--muted)', padding: '.35rem .5rem' }}><Icon name="trash" size={15} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Editor
          draft={editing}
          setDraft={setEditing}
          users={users}
          allTags={allTags}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Editor({ draft, setDraft, users, allTags, onSave, onClose }) {
  const patch = (p) => setDraft(d => ({ ...d, ...p }));
  const patchAud = (p) => setDraft(d => ({ ...d, audience: { ...d.audience, ...p } }));
  const patchTpl = (p) => setDraft(d => ({ ...d, template: { ...d.template, ...p } }));

  const toggleStage = (id) => patchAud({ stages: draft.audience.stages.includes(id) ? draft.audience.stages.filter(x => x !== id) : [...draft.audience.stages, id] });
  const toggleTag = (t) => patchAud({ tags: draft.audience.tags.includes(t) ? draft.audience.tags.filter(x => x !== t) : [...draft.audience.tags, t] });

  const size = audienceSize(draft.audience);
  const sample = resolveAudience(draft.audience)[0] || null;
  const ctx = mergeContext(sample);
  const previewSubject = renderMergeTags(draft.template.subject, ctx);
  const previewBody = renderMergeTags(draft.template.body, ctx);

  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      title={draft.id ? 'Edit automation' : 'New automation'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>{draft.id ? 'Save automation' : 'Create automation'}</Button>
        </>
      }
    >
      <div className="col gap-3">
        <Field label="Name">
          <Input autoFocus placeholder="New lead welcome nurture" value={draft.name} onChange={e => patch({ name: e.target.value })} />
        </Field>
        <Field label="Description" hint="Shown on the card. Optional.">
          <Input placeholder="A warm first touch when a lead lands in the book." value={draft.description} onChange={e => patch({ description: e.target.value })} />
        </Field>

        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <Field label="Trigger">
            <Select value={draft.trigger} onChange={e => patch({ trigger: e.target.value })}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Throttle (days)" hint="Do not re-mail the same contact within this window.">
            <Input type="number" min={1} value={draft.throttleDays} onChange={e => patch({ throttleDays: e.target.value })} style={{ width: 120 }} />
          </Field>
          <Field label="Owner">
            <Select value={draft.audience.owner} onChange={e => patchAud({ owner: e.target.value })}>
              <option value="any">Anyone</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label={`Audience segment - ${size.toLocaleString()} contact${size === 1 ? '' : 's'}`} hint="Lifecycle stages to include (empty = all stages).">
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {AUDIENCE_STAGES.map(st => (
              <Chip key={st.id} on={draft.audience.stages.includes(st.id)} onClick={() => toggleStage(st.id)}>{st.label}</Chip>
            ))}
          </div>
        </Field>

        {allTags.length > 0 && (
          <Field label="Tags" hint="Match any of these tags (empty = no tag filter).">
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              {allTags.map(t => (
                <Chip key={t} on={draft.audience.tags.includes(t)} onClick={() => toggleTag(t)}>{t}</Chip>
              ))}
            </div>
          </Field>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--n-200)', margin: '.25rem 0' }} />

        <Field label="Subject" hint="Merge tags: {{firstName}} {{company}} {{senderName}} {{title}}">
          <Input placeholder="Welcome to the conversation, {{firstName}}" value={draft.template.subject} onChange={e => patchTpl({ subject: e.target.value })} />
        </Field>
        <Field label="Preheader" hint="The gray preview text after the subject. Optional.">
          <Input placeholder="A quick hello and one idea for {{company}}." value={draft.template.preheader} onChange={e => patchTpl({ preheader: e.target.value })} />
        </Field>
        <Field label="Body">
          <Textarea rows={6} placeholder={'Hi {{firstName}},\n\n...\n\n{{senderName}}'} value={draft.template.body} onChange={e => patchTpl({ body: e.target.value })} />
        </Field>
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <Field label="Button label"><Input placeholder="Book 20 minutes" value={draft.template.ctaLabel} onChange={e => patchTpl({ ctaLabel: e.target.value })} /></Field>
          <Field label="Button URL"><Input placeholder="https://ardovo.com/demo" value={draft.template.ctaUrl} onChange={e => patchTpl({ ctaUrl: e.target.value })} /></Field>
        </div>

        <Card style={{ background: 'var(--n-50)' }}>
          <div className="row between" style={{ marginBottom: '.4rem' }}>
            <div className="fw-6 t-sm">Live preview</div>
            <span className="t-xs muted">{sample ? `merged for ${ctx.firstName} at ${ctx.company}` : 'no audience match yet'}</span>
          </div>
          <div className="fw-6" style={{ color: 'var(--ink)', marginBottom: '.35rem' }}>{previewSubject || 'Subject preview'}</div>
          <div className="t-sm" style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{previewBody || 'Body preview'}</div>
          {draft.template.ctaLabel && (
            <div style={{ marginTop: '.7rem' }}>
              <span style={{ display: 'inline-block', background: 'var(--accent)', color: '#fff', padding: '.5rem .9rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem' }}>{draft.template.ctaLabel}</span>
            </div>
          )}
        </Card>
      </div>
    </Modal>
  );
}
