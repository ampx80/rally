// Autopilot - Ardovo's autonomous SDR/AE cockpit.
//
// The autonomous worker that actually books meetings, with a TRUST DIAL so
// humans stay in control. Autopilot researches each lead, drafts a
// personalized multi-channel opener, sequences follow-ups, and books the
// meeting - every proposed send passes through a governed approval queue you
// tune with one slider. GHL's Conversation AI answers chats; Autopilot runs
// outbound with governed autonomy.
//
// Purely additive: reads + mutates the local-first worker sim in
// src/lib/autopilot-data.js, reuses the shared UI primitives, and pokes Rook
// through the existing window event. No backend required.
import React, { useMemo, useState } from 'react';
import {
  PageTitle, Card, SectionHeader, Button, Badge, Avatar, StatCard,
  Modal, Field, Textarea, ProgressBar, EmptyState, useToast,
  relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useAutopilot, CHANNELS, CHANNEL_KEYS, STEP_META, LEAD_STATUS,
  riskBand, trustPosture, wouldAutoSend, autoSendableCount, statusCounts,
  getLead, pendingDecisions, timeSavedHours,
  setTrust, toggleChannel, approveDecision, rejectDecision, editDecision,
  approveAllSafe, pauseLead, runShift, resetAutopilot,
} from '../lib/autopilot-data.js';

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ---------- small building blocks ---------- */
function ChannelChip({ ch, size = 14 }) {
  const c = CHANNELS[ch];
  if (!c) return null;
  return (
    <span className="badge" style={{ background: 'transparent', border: '1px solid var(--line-strong)', color: c.tint }}>
      <Icon name={c.icon} size={size} /> {c.label}
    </span>
  );
}

function RiskMeter({ risk }) {
  const band = riskBand(risk);
  return (
    <div className="col gap-1" style={{ minWidth: 120 }}>
      <div className="row between" style={{ fontSize: '.78rem', fontWeight: 700 }}>
        <span style={{ color: band.color }}>{band.label}</span>
        <span className="tnum muted">{risk}</span>
      </div>
      <ProgressBar value={risk} color={band.color} height={7} />
    </div>
  );
}

/* ---------- the trust dial (the differentiator) ---------- */
function TrustDial({ trust }) {
  const posture = trustPosture(trust.threshold);
  const autoCount = autoSendableCount(trust);
  const pending = pendingDecisions().length;
  const fillPct = trust.threshold;
  const postureTone = posture.key === 'draft' ? 'var(--info)' : posture.key === 'full' ? 'var(--risk)' : 'var(--accent)';
  return (
    <Card className="ap-dial">
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="shield" size={22} />
          </span>
          <div className="col" style={{ lineHeight: 1.25 }}>
            <div className="row gap-1" style={{ alignItems: 'center' }}>
              <span className="fw-8" style={{ fontSize: '1.15rem' }}>Trust dial</span>
              <Badge tone={trust.enabled ? 'ok' : 'default'}>{trust.enabled ? 'Autopilot on' : 'Paused'}</Badge>
            </div>
            <span className="muted t-sm">Governed autonomy. You decide how much Autopilot may send on its own.</span>
          </div>
        </div>
        <button type="button" className={`ap-master${trust.enabled ? ' on' : ''}`} onClick={() => setTrust({ enabled: !trust.enabled })} aria-pressed={trust.enabled} aria-label="Toggle Autopilot">
          <span className="ap-master__dot" />
          <span className="ap-master__label">{trust.enabled ? 'Running' : 'Paused'}</span>
        </button>
      </div>

      <div className="ap-dial__slider">
        <div className="row between" style={{ marginBottom: 8 }}>
          <span className="t-xs fw-7" style={{ color: 'var(--info)' }}>Draft only</span>
          <span className="t-xs fw-7" style={{ color: 'var(--accent-600)' }}>Governed</span>
          <span className="t-xs fw-7" style={{ color: 'var(--risk)' }}>Full autopilot</span>
        </div>
        <input
          type="range" min="0" max="100" step="5" value={trust.threshold}
          onChange={(e) => setTrust({ threshold: Number(e.target.value) })}
          className="ap-range" aria-label="Trust threshold"
          style={{ background: `linear-gradient(90deg, var(--accent) ${fillPct}%, var(--n-200) ${fillPct}%)` }}
        />
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="t-xs muted">Auto-send anything at or below</span>
          <span className="tnum fw-8" style={{ fontSize: '1.1rem', color: postureTone }}>{trust.threshold} risk</span>
        </div>
      </div>

      <div className="ap-posture" style={{ borderColor: postureTone }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Badge tone={posture.key === 'full' ? 'risk' : posture.key === 'draft' ? 'info' : 'accent'}>{posture.label}</Badge>
          <span className="t-sm">{posture.blurb}</span>
        </div>
        <div className="row gap-2 wrap" style={{ marginTop: 10, alignItems: 'center' }}>
          <span className="stat-value" style={{ fontSize: '1.7rem' }}>{autoCount}</span>
          <span className="t-sm muted">of {pending} queued actions would send automatically at this setting. The rest wait for you.</span>
        </div>
      </div>

      <div className="row between wrap gap-2" style={{ marginTop: 4 }}>
        <div className="row gap-1 wrap">
          {CHANNEL_KEYS.map(ch => {
            const on = trust.channels[ch];
            return (
              <button key={ch} type="button" onClick={() => toggleChannel(ch)} aria-pressed={on}
                className="badge" style={{ cursor: 'pointer', padding: '.4rem .7rem', border: '1px solid var(--line-strong)', background: on ? 'var(--accent-50)' : 'transparent', color: on ? 'var(--accent-600)' : 'var(--n-600)' }}>
                <Icon name={CHANNELS[ch].icon} size={14} /> {CHANNELS[ch].label}
                <Icon name={on ? 'check' : 'x'} size={12} />
              </button>
            );
          })}
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="t-xs muted tnum">Daily cap {trust.sentToday}/{trust.dailyCap}</span>
          <div style={{ width: 90 }}><ProgressBar value={(trust.sentToday / trust.dailyCap) * 100} height={6} /></div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- decision card ---------- */
function DecisionCard({ dec, onEdit, onOpenLead }) {
  const lead = getLead(dec.leadId);
  const toast = useToast();
  if (!lead) return null;
  const band = riskBand(dec.risk);
  const willAuto = wouldAutoSend(dec);
  const ch = CHANNELS[dec.channel];
  const step = STEP_META[dec.step];
  const act = (fn, msg, tone) => { fn(); toast(msg, tone); };
  return (
    <Card className="ap-card" pad>
      <div className="row between wrap gap-2" style={{ alignItems: 'flex-start' }}>
        <button type="button" className="row gap-2" onClick={() => onOpenLead(lead)} style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', minWidth: 0, alignItems: 'center' }}>
          <Avatar name={lead.name} size={40} />
          <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
            <span className="fw-7 clip">{lead.name}</span>
            <span className="t-xs muted clip">{lead.title} at {lead.company}</span>
          </div>
        </button>
        <div className="row gap-1 wrap" style={{ flex: 'none', alignItems: 'center' }}>
          <ChannelChip ch={dec.channel} />
          <Badge>{step?.label || dec.step}</Badge>
          {willAuto ? <Badge tone="ok"><Icon name="zap" size={12} /> Within threshold</Badge> : <Badge tone="warn"><Icon name="shield" size={12} /> Needs you</Badge>}
        </div>
      </div>

      <div className="ap-draft">
        {dec.channel === 'email' && dec.draft.subject !== 'SMS' && (
          <div className="ap-draft__subj">Subject: {dec.draft.subject}</div>
        )}
        <div className="ap-draft__body">{dec.draft.body}</div>
        {dec.edited && <div className="t-xs" style={{ color: 'var(--accent-600)', marginTop: 6 }}><Icon name="check" size={12} /> Edited by you</div>}
      </div>

      <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
        <details className="ap-why">
          <summary className="row gap-1" style={{ cursor: 'pointer', fontWeight: 700, fontSize: '.9rem' }}>
            <Icon name="sparkles" size={15} style={{ color: 'var(--accent-600)' }} /> Why Autopilot drafted this
          </summary>
          <ul className="ap-why__list">
            {dec.reasoning.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </details>
        <RiskMeter risk={dec.risk} />
      </div>

      <div className="row between wrap gap-2" style={{ marginTop: 4 }}>
        <span className="t-xs muted">Drafted {relTime(dec.createdAt)} &middot; confidence {dec.confidence}%</span>
        <div className="row gap-1 wrap">
          <Button size="sm" variant="ghost" onClick={() => onEdit(dec)}><Icon name="edit" size={15} /> Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => act(() => rejectDecision(dec.id), 'Rejected. Nothing was sent.', 'warn')}><Icon name="x" size={15} /> Reject</Button>
          {willAuto
            ? <Button size="sm" variant="accent" onClick={() => act(() => approveDecision(dec.id, 'auto'), 'Auto-sent within your trust threshold.')}><Icon name="zap" size={15} /> Auto-send</Button>
            : <Button size="sm" variant="primary" onClick={() => act(() => approveDecision(dec.id, 'approve'), 'Approved and sent.')}><Icon name="check" size={15} /> Approve</Button>}
        </div>
      </div>
    </Card>
  );
}

/* ---------- edit modal ---------- */
function EditModal({ dec, onClose }) {
  const [subject, setSubject] = useState(dec?.draft.subject || '');
  const [body, setBody] = useState(dec?.draft.body || '');
  const toast = useToast();
  if (!dec) return null;
  const isEmail = dec.channel === 'email' && dec.draft.subject !== 'SMS';
  const save = () => { editDecision(dec.id, { subject, body }); toast('Draft updated. Risk lowered after your edit.'); onClose(); };
  return (
    <Modal open={!!dec} onClose={onClose} title="Edit the draft" width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}><Icon name="check" size={16} /> Save draft</Button></>}>
      <div className="col gap-3">
        <div className="row gap-1"><ChannelChip ch={dec.channel} /><Badge>{STEP_META[dec.step]?.label}</Badge></div>
        {isEmail && <Field label="Subject"><input className="input" value={subject} onChange={e => setSubject(e.target.value)} /></Field>}
        <Field label="Message"><Textarea rows={10} value={body} onChange={e => setBody(e.target.value)} /></Field>
        <div className="t-xs muted">A human edit tells Autopilot you reviewed this touch - its risk score drops so similar actions can flow faster next time.</div>
      </div>
    </Modal>
  );
}

/* ---------- enrichment card modal ---------- */
function EnrichmentModal({ lead, onClose }) {
  if (!lead) return null;
  const st = LEAD_STATUS[lead.status];
  return (
    <Modal open={!!lead} onClose={onClose} title="Enrichment card" width={640}>
      <div className="col gap-4">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Avatar name={lead.name} size={52} />
          <div className="col" style={{ lineHeight: 1.3, minWidth: 0 }}>
            <span className="fw-8" style={{ fontSize: '1.15rem' }}>{lead.name}</span>
            <span className="t-sm muted clip">{lead.title} at {lead.company}</span>
            <div className="row gap-1 wrap" style={{ marginTop: 4 }}>
              <Badge tone={st?.tone}>{st?.label}</Badge>
              <Badge tone="accent">Fit {lead.score}</Badge>
              <Badge>Intent {lead.intent}</Badge>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.8rem' }}>
          {[['Industry', lead.industry], ['Company size', lead.size], ['Location', lead.location], ['Touches', String(lead.touches)]].map(([k, v]) => (
            <div key={k} className="panel" style={{ padding: '.7rem .85rem' }}>
              <div className="stat-label" style={{ fontSize: '.7rem' }}>{k}</div>
              <div className="fw-7" style={{ marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="stat-label" style={{ marginBottom: 8 }}>Signals Autopilot found</div>
          <div className="col gap-1">
            {lead.signals.map((s, i) => (
              <div key={i} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent-600)', flex: 'none', marginTop: 2 }}><Icon name="sparkles" size={15} /></span>
                <span className="t-sm">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="stat-label" style={{ marginBottom: 8 }}>Tech stack detected</div>
          <div className="row gap-1 wrap">{lead.techStack.map(t => <Badge key={t}>{t}</Badge>)}</div>
        </div>

        <div className="row gap-1 wrap">
          <Button variant="ghost" size="sm" onClick={() => askRook(`Draft a next-best outreach step for ${lead.name} at ${lead.company}`)}><Icon name="sparkles" size={15} /> Ask Rook for a next step</Button>
          <Button variant="ghost" size="sm" as="a" href={`mailto:${lead.email}`}><Icon name="mail" size={15} /> {lead.email}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- feed + shift log ---------- */
function FeedList({ feed, onOpenLead }) {
  return (
    <Card pad={false}>
      <div className="col">
        {feed.slice(0, 22).map((ev, i) => {
          const lead = ev.leadId ? getLead(ev.leadId) : null;
          return (
            <div key={ev.id} className="row gap-2 ap-feed__row" style={{ padding: '.8rem 1.15rem', borderTop: i ? '1px solid var(--n-50)' : 'none', alignItems: 'flex-start' }}>
              <span className="row center" style={{ width: 30, height: 30, borderRadius: 9, background: ev.auto ? 'var(--accent-50)' : 'var(--n-100)', color: ev.auto ? 'var(--accent-600)' : 'var(--n-600)', flex: 'none' }}>
                <Icon name={ev.icon} size={15} />
              </span>
              <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.35 }}>
                <span className="t-sm">{ev.text}</span>
                <span className="t-xs muted">{relTime(ev.at)}{ev.auto ? ' · automatic' : ''}</span>
              </div>
              {lead && <button className="link t-xs" style={{ flex: 'none' }} onClick={() => onOpenLead(lead)}>View</button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShiftLog({ shift }) {
  const tiles = [
    ['Researched', shift.researched, 'search'],
    ['Drafted', shift.drafted, 'edit'],
    ['Auto-sent', shift.autoSent, 'zap'],
    ['Queued for you', shift.queuedForApproval, 'shield'],
    ['Replies', shift.replies, 'mail'],
    ['Booked', shift.booked, 'calendar'],
  ];
  return (
    <div className="col gap-3">
      <Card>
        <SectionHeader eyebrow="While you slept" title={shift.label}
          sub={`${relTime(shift.startedAt)} to ${relTime(shift.endedAt)}`} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.8rem' }}>
          {tiles.map(([k, v, ic]) => (
            <div key={k} className="panel" style={{ padding: '.85rem .9rem' }}>
              <div className="row between"><span className="stat-label" style={{ fontSize: '.68rem' }}>{k}</span><Icon name={ic} size={15} style={{ color: 'var(--accent-600)' }} /></div>
              <div className="stat-value" style={{ fontSize: '2rem', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card pad={false}>
        <div className="col">
          {shift.steps.map((s, i) => (
            <div key={i} className="row gap-2" style={{ padding: '.75rem 1.15rem', borderTop: i ? '1px solid var(--n-50)' : 'none', alignItems: 'flex-start' }}>
              <span className="ap-timeline__dot" />
              <div className="col" style={{ lineHeight: 1.35 }}>
                <span className="t-sm">{s.text}</span>
                <span className="t-xs muted">{relTime(s.at)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- workqueue table ---------- */
function Workqueue({ leads, onOpenLead }) {
  const toast = useToast();
  return (
    <Card pad={false} style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr>
            <th>Lead</th><th>Company</th><th className="hide-520">Status</th><th className="hide-520">Fit</th><th className="hide-520">Touches</th><th></th>
          </tr></thead>
          <tbody>
            {leads.map(l => {
              const st = LEAD_STATUS[l.status];
              return (
                <tr key={l.id} className="row-host">
                  <td>
                    <button type="button" className="row gap-2" onClick={() => onOpenLead(l)} style={{ background: 'transparent', cursor: 'pointer', alignItems: 'center' }}>
                      <Avatar name={l.name} size={30} />
                      <div className="col" style={{ lineHeight: 1.2, minWidth: 0, textAlign: 'left' }}>
                        <span className="fw-6 clip">{l.name}</span>
                        <span className="t-xs muted clip">{l.title}</span>
                      </div>
                    </button>
                  </td>
                  <td className="clip">{l.company}</td>
                  <td className="hide-520"><Badge tone={st?.tone}>{st?.label}</Badge></td>
                  <td className="hide-520 tnum fw-7">{l.score}</td>
                  <td className="hide-520 tnum">{l.touches}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row gap-1 reveal" style={{ justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="quiet" onClick={() => { const wasPaused = l.status === 'paused'; pauseLead(l.id); toast(wasPaused ? 'Resumed Autopilot for this lead.' : 'Paused Autopilot for this lead.'); }}>
                        {l.status === 'paused' ? 'Resume' : 'Pause'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onOpenLead(l)}>Open</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Autopilot() {
  const s = useAutopilot();
  const toast = useToast();
  const [tab, setTab] = useState('queue');
  const [editing, setEditing] = useState(null);
  const [lead, setLead] = useState(null);

  const pending = useMemo(() => pendingDecisions(), [s]);
  const counts = useMemo(() => statusCounts(), [s]);
  const safeNow = autoSendableCount(s.trust);
  const savedHrs = timeSavedHours();

  const TABS = [
    { key: 'queue', label: 'Approval queue', count: pending.length },
    { key: 'feed', label: 'Live feed' },
    { key: 'shift', label: 'Shift log' },
    { key: 'workqueue', label: 'Workqueue', count: s.leads.length },
  ];

  const doRunShift = () => { const r = runShift(); toast(r.queued ? 'Shift pass complete. A new draft is in your queue.' : 'Shift pass complete. Workqueue is caught up.'); };
  const doApproveAll = () => {
    if (!safeNow) return toast('Nothing is within your trust threshold right now. Raise the dial or approve manually.', 'warn');
    const r = approveAllSafe();
    toast(`Auto-sent ${r.count} action${r.count === 1 ? '' : 's'} within your threshold.`);
  };

  return (
    <div className="col gap-4">
      <PageTitle
        eyebrow="Automation"
        title="Autopilot"
        sub="The autonomous SDR that actually books meetings - governed by a trust dial, so a human is always in control."
        action={
          <div className="row gap-1 wrap" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => askRook('Which actions in the Autopilot queue are safe to auto-send, and which should I review?')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="primary" onClick={doRunShift}>
              <Icon name="zap" size={16} /> Run a shift
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <StatCard label="Leads worked" value={s.stats.leadsWorked} icon={<Icon name="users" size={18} />} spark={s.stats.sparkWorked} sub="last 14 days" />
        <StatCard label="Meetings booked" value={s.stats.meetingsBooked} icon={<Icon name="calendar" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" spark={s.stats.sparkBooked} sub="straight to calendar" />
        <StatCard label="Replies" value={s.stats.replies} icon={<Icon name="mail" size={18} />} accent="var(--accent-teal)" sparkColor="var(--accent-teal)" spark={s.stats.sparkReplies} sub="classified + routed" />
        <StatCard label="Hours saved" value={savedHrs} format={(n) => `${Math.round(n)}h`} icon={<Icon name="clock" size={18} />} accent="var(--info)" sparkColor="var(--info)" spark={s.stats.sparkSaved} sub="research + drafting" />
      </div>

      {/* trust dial */}
      <TrustDial trust={s.trust} />

      {/* worker surfaces */}
      <Card pad={false}>
        <div className="row between wrap gap-2" style={{ padding: '1rem 1.35rem 0' }}>
          <div className="ap-tabs">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`ap-tab${tab === t.key ? ' on' : ''}`}>
                {t.label}{t.count != null && <span className="ap-tab__count">{t.count}</span>}
              </button>
            ))}
          </div>
          {tab === 'queue' && (
            <Button size="sm" variant="accent" onClick={doApproveAll} disabled={!safeNow}>
              <Icon name="zap" size={15} /> Approve all safe{safeNow ? ` (${safeNow})` : ''}
            </Button>
          )}
        </div>

        <div style={{ padding: '1.15rem 1.35rem 1.35rem' }}>
          {tab === 'queue' && (
            pending.length === 0
              ? <EmptyState icon="✓" title="Queue is clear" body="Autopilot has nothing waiting on you. It keeps researching and drafting - new actions land here the moment they are ready." action={<Button variant="ghost" onClick={doRunShift}><Icon name="zap" size={16} /> Run a shift</Button>} />
              : <div className="col gap-3">
                  <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                    <span className="t-sm muted">{pending.length} action{pending.length === 1 ? '' : 's'} waiting.</span>
                    <span className="t-sm"><span className="fw-7" style={{ color: 'var(--accent-600)' }}>{safeNow}</span> within your trust threshold.</span>
                  </div>
                  {pending.map(d => <DecisionCard key={d.id} dec={d} onEdit={setEditing} onOpenLead={setLead} />)}
                </div>
          )}
          {tab === 'feed' && <FeedList feed={s.feed} onOpenLead={setLead} />}
          {tab === 'shift' && <ShiftLog shift={s.shift} />}
          {tab === 'workqueue' && (
            <div className="col gap-3">
              <div className="row gap-1 wrap">
                {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <Badge key={k} tone={LEAD_STATUS[k]?.tone}>{LEAD_STATUS[k]?.label} {v}</Badge>
                ))}
              </div>
              <Workqueue leads={s.leads} onOpenLead={setLead} />
            </div>
          )}
        </div>
      </Card>

      <div className="row between wrap gap-2">
        <span className="t-xs muted">Local-first worker sim. Live drafting activates when /api/outreach-draft is wired; until then every draft is generated on-device.</span>
        <Button variant="quiet" size="sm" onClick={() => { resetAutopilot(); toast('Autopilot workqueue reset to the seeded demo.'); }}>
          <Icon name="rotateCcw" size={14} /> Reset demo
        </Button>
      </div>

      <EditModal dec={editing} onClose={() => setEditing(null)} />
      <EnrichmentModal lead={lead} onClose={() => setLead(null)} />

      <AutopilotStyles />
    </div>
  );
}

function AutopilotStyles() {
  return (
    <style>{`
    .ap-dial { display: flex; flex-direction: column; gap: 1.15rem; }
    .ap-master { display: inline-flex; align-items: center; gap: .5rem; padding: .5rem .85rem; border-radius: var(--r-pill);
      border: 1px solid var(--line-strong); background: var(--n-50); color: var(--n-600); cursor: pointer; font-weight: 700; font-size: .85rem; font-family: inherit; transition: all .18s var(--ease); }
    .ap-master.on { background: var(--accent-50); border-color: var(--accent-300); color: var(--accent-600); }
    .ap-master__dot { width: 9px; height: 9px; border-radius: 50%; background: var(--n-400); }
    .ap-master.on .ap-master__dot { background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 25%, transparent); animation: apPulse 2s ease-in-out infinite; }
    @keyframes apPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

    .ap-dial__slider { padding: .2rem .1rem; }
    .ap-range { -webkit-appearance: none; appearance: none; width: 100%; height: 10px; border-radius: 999px; outline: none; cursor: pointer; }
    .ap-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 3px solid var(--accent); box-shadow: var(--shadow-md); cursor: grab; transition: transform .12s var(--ease); }
    .ap-range::-webkit-slider-thumb:active { transform: scale(1.12); cursor: grabbing; }
    .ap-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 3px solid var(--accent); box-shadow: var(--shadow-md); cursor: grab; }
    .ap-range:focus-visible { box-shadow: 0 0 0 3px var(--accent-50); }

    .ap-posture { border: 1px solid var(--line); border-left-width: 4px; border-radius: var(--r-md); padding: .9rem 1.05rem; background: var(--n-25); }

    .ap-card { display: flex; flex-direction: column; gap: 1rem; animation: fadeUp .35s var(--ease) both; }
    .ap-draft { border: 1px solid var(--line); border-radius: var(--r-md); background: var(--n-25); padding: .9rem 1rem; }
    .ap-draft__subj { font-weight: 700; font-size: .9rem; color: var(--n-700); margin-bottom: .5rem; }
    .ap-draft__body { white-space: pre-wrap; font-size: .96rem; line-height: 1.55; color: var(--ink-2); }

    .ap-why { max-width: 60ch; }
    .ap-why__list { list-style: none; margin: .6rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .45rem; }
    .ap-why__list li { position: relative; padding-left: 1.1rem; font-size: .9rem; color: var(--ink-2); line-height: 1.45; }
    .ap-why__list li::before { content: ''; position: absolute; left: 0; top: .5rem; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }

    .ap-tabs { display: flex; gap: .15rem; flex-wrap: wrap; }
    .ap-tab { position: relative; background: transparent; border: none; cursor: pointer; font-family: inherit; font-weight: 600; font-size: .98rem; color: var(--n-600);
      padding: .6rem .85rem; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: .45rem; transition: color .14s; }
    .ap-tab:hover { color: var(--ink); }
    .ap-tab.on { color: var(--ink); border-bottom-color: var(--accent); font-weight: 700; }
    .ap-tab__count { font-size: .72rem; font-weight: 700; padding: .05rem .45rem; border-radius: 999px; background: var(--n-100); color: var(--n-700); }
    .ap-tab.on .ap-tab__count { background: var(--accent-50); color: var(--accent-600); }

    .ap-feed__row:hover { background: var(--n-25); }
    .ap-timeline__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex: none; margin-top: .35rem; box-shadow: 0 0 0 4px var(--accent-50); }

    @media (prefers-reduced-motion: reduce) { .ap-card, .ap-master.on .ap-master__dot { animation: none !important; } }
    `}</style>
  );
}
