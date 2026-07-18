// ============================================================
// ARDOVO - DEAL WAR ROOM  (WarRoom.jsx)
// A live collaboration cockpit for closing big deals. Pick a
// high-value war room, then work the whole deal from one surface:
// the vitals + a modeled win probability, the buying committee with
// live sentiment, the mutual close plan, open risks, the competitive
// landscape, a team collaboration rail, and Rook reading the room -
// the single biggest risk, the recommended next move, and a ranked
// list of what will actually move the deal.
//
// Enterprise deals are won in war rooms, not CRM fields.
// ADDITIVE: new file. Composes only shared primitives. No em/en dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field,
  Textarea, Ring, Sparkline, ProgressBar, Segmented, GradientText,
  HealthDot, useToast, moneyK, shortDate, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import {
  useWarRoom, getWarDeals, getWarDeal,
  computeWinProb, planProgress, committeeSentiment, openRisks,
  biggestRisk, recommendedMove, whatWillMove,
  noteAt, planDueDate, closeDate,
  ROLE_META, SENTIMENT_META, STAGE_META, PLAN_STATUS, NOTE_KINDS,
  togglePlanStep, setPlanStatus, cycleSentiment, mitigateRisk, reopenRisk,
  postNote, toggleNoteDone, applyLever,
} from '../lib/warroom-data.js';

const PHASE_ORDER = ['Align', 'Evaluate', 'Justify', 'Close'];
const THREAT_TONE = { high: 'risk', med: 'warn', low: 'default' };
const POSITION_META = {
  ahead:  { label: 'We are ahead', tone: 'ok'   },
  even:   { label: 'Even race',    tone: 'warn' },
  behind: { label: 'We are behind', tone: 'risk' },
};

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

function winColor(p) { return p >= 70 ? 'var(--ok)' : p >= 45 ? 'var(--accent)' : 'var(--risk)'; }

/* ---------- Sidebar: pick a war room ---------- */
function WarRoomCard({ deal, active, onClick }) {
  const p = computeWinProb(deal);
  const sent = committeeSentiment(deal);
  const health = sent >= 66 ? 'green' : sent >= 40 ? 'yellow' : 'red';
  const st = STAGE_META[deal.stage];
  return (
    <button
      onClick={onClick}
      className="card card-pad"
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%',
        border: active ? '1px solid var(--accent)' : '1px solid var(--line)',
        boxShadow: active ? 'var(--glow-ring, 0 0 0 3px var(--accent-50))' : 'var(--shadow-sm)',
        background: active ? 'var(--accent-50)' : 'var(--paper)',
        transition: 'border-color .15s, box-shadow .15s, background .15s',
      }}
    >
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.6rem' }}>
        <div className="col" style={{ minWidth: 0 }}>
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <HealthDot health={health} />
            <span className="fw-7 clip" style={{ fontSize: '1rem' }}>{deal.company}</span>
          </div>
          <span className="t-sm muted clip" style={{ marginTop: 2 }}>{deal.name}</span>
        </div>
        <span className="fw-8 tnum" style={{ color: winColor(p), fontSize: '1.15rem', flex: 'none' }}>{p}%</span>
      </div>
      <div className="row between" style={{ marginTop: '.7rem', alignItems: 'center' }}>
        <span className="fw-7 tnum" style={{ fontSize: '1.05rem' }}>{moneyK(deal.value)}</span>
        <Badge><span className="dot" style={{ background: st?.color }} />{st?.label}</Badge>
      </div>
      <div style={{ marginTop: '.6rem' }}>
        <ProgressBar value={p} color={winColor(p)} height={5} />
      </div>
    </button>
  );
}

/* ---------- Committee member row ---------- */
function MemberRow({ deal, m, toast }) {
  const role = ROLE_META[m.role] || { label: m.role, tone: 'default' };
  const sent = SENTIMENT_META[m.sentiment];
  return (
    <div className="row between" style={{ gap: '.75rem', padding: '.7rem 0', borderTop: '1px solid var(--n-50)' }}>
      <div className="row gap-2" style={{ minWidth: 0, alignItems: 'flex-start' }}>
        <Avatar name={m.name} size={40} />
        <div className="col" style={{ minWidth: 0 }}>
          <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
            <span className="fw-7 clip">{m.name}</span>
            <Badge tone={role.tone}>{role.label}</Badge>
            <Badge className="t-xs">{m.influence === 'high' ? 'High influence' : m.influence === 'med' ? 'Med influence' : 'Low influence'}</Badge>
          </div>
          <span className="t-sm muted" style={{ marginTop: 3 }}>{m.note}</span>
        </div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        title="Click to cycle sentiment"
        onClick={() => { cycleSentiment(deal.id, m.id); toast(`${m.name} sentiment updated`); }}
        style={{ flex: 'none', gap: '.4rem', minWidth: 104 }}
      >
        <span className="dot" style={{ background: sent.color, width: 9, height: 9 }} />
        <span className="fw-6" style={{ color: sent.color }}>{sent.label}</span>
      </button>
    </div>
  );
}

/* ---------- Plan step row ---------- */
function PlanRow({ deal, step, toast }) {
  const stat = PLAN_STATUS[step.status];
  const done = step.status === 'done';
  const blocked = step.status === 'blocked';
  const due = planDueDate(step);
  const overdue = !done && due.getTime() < Date.now();
  return (
    <div className="row between" style={{ gap: '.6rem', padding: '.6rem 0', borderTop: '1px solid var(--n-50)' }}>
      <div className="row gap-2" style={{ minWidth: 0, alignItems: 'flex-start' }}>
        <button
          onClick={() => {
            const r = togglePlanStep(deal.id, step.id);
            if (!r.error && r.step.status === 'done') { celebrate(); toast('Step complete'); }
          }}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          style={{
            flex: 'none', width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
            border: `2px solid ${done ? 'var(--ok)' : blocked ? 'var(--risk)' : 'var(--line-strong)'}`,
            background: done ? 'var(--ok)' : 'transparent', color: '#fff',
            display: 'grid', placeItems: 'center', marginTop: 1,
          }}
        >
          {done && <Icon name="check" size={14} />}
        </button>
        <div className="col" style={{ minWidth: 0 }}>
          <span className="fw-6 clip" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--n-600)' : 'var(--ink)' }}>
            {step.label}
          </span>
          <span className="t-xs muted" style={{ marginTop: 2 }}>
            {step.owner} <span style={{ opacity: .5 }}>|</span>{' '}
            <span style={{ color: overdue ? 'var(--risk)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
              {done ? 'done' : `due ${relTime(due.toISOString())}`}
            </span>
          </span>
        </div>
      </div>
      <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
        <Badge tone={stat.tone}>{stat.label}</Badge>
        {!done && (
          <button
            className="btn btn-quiet btn-sm reveal"
            title={blocked ? 'Unblock' : 'Mark blocked'}
            onClick={() => { setPlanStatus(deal.id, step.id, blocked ? 'active' : 'blocked'); toast(blocked ? 'Unblocked' : 'Marked blocked'); }}
            style={{ padding: '.3rem .5rem' }}
          >
            <Icon name={blocked ? 'rotateCcw' : 'shield'} size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Collaboration rail note ---------- */
function NoteRow({ deal, n, toast }) {
  const meta = NOTE_KINDS[n.kind] || NOTE_KINDS.note;
  const isAction = n.kind === 'action';
  return (
    <div className="row gap-2" style={{ padding: '.7rem 0', borderTop: '1px solid var(--n-50)', alignItems: 'flex-start' }}>
      <Avatar name={n.author} size={30} />
      <div className="col" style={{ minWidth: 0, flex: 1 }}>
        <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
          <span className="fw-7 t-sm">{n.author}</span>
          <Badge className="t-xs" style={{ color: meta.color }}>
            <Icon name={meta.icon} size={12} /> {meta.label}
          </Badge>
          <span className="t-xs muted">{relTime(noteAt(n).toISOString())}</span>
        </div>
        <div className="row gap-2" style={{ marginTop: 4, alignItems: 'flex-start' }}>
          {isAction && (
            <button
              onClick={() => { toggleNoteDone(deal.id, n.id); if (!n.done) toast('Action done'); }}
              aria-label={n.done ? 'Reopen action' : 'Complete action'}
              style={{
                flex: 'none', width: 18, height: 18, borderRadius: 5, cursor: 'pointer', marginTop: 2,
                border: `2px solid ${n.done ? 'var(--ok)' : 'var(--line-strong)'}`,
                background: n.done ? 'var(--ok)' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center',
              }}
            >
              {n.done && <Icon name="check" size={11} />}
            </button>
          )}
          <span className="t-sm" style={{ color: isAction && n.done ? 'var(--n-600)' : 'var(--ink-2)', textDecoration: isAction && n.done ? 'line-through' : 'none' }}>
            {n.body}
          </span>
        </div>
        {n.mentions && n.mentions.length > 0 && (
          <div className="row gap-1 wrap" style={{ marginTop: 5 }}>
            {n.mentions.map(mn => <span key={mn} className="badge badge-accent t-xs">@{mn}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WarRoom() {
  useWarRoom();
  const toast = useToast();
  const deals = getWarDeals();
  const [selId, setSelId] = useState(deals[0]?.id);
  const deal = getWarDeal(selId) || deals[0];

  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState('update');

  const p = useMemo(() => computeWinProb(deal), [deal]);
  const prog = planProgress(deal);
  const sent = committeeSentiment(deal);
  const risks = openRisks(deal);
  const read = biggestRisk(deal);
  const move = recommendedMove(deal);
  const levers = whatWillMove(deal);
  const momentum = deal.history || [];
  const since = momentum.length ? momentum[momentum.length - 1] - momentum[0] : 0;
  const st = STAGE_META[deal.stage];
  const days = deal.closeInDays;

  const notes = [...deal.notes].sort((a, b) => noteAt(b) - noteAt(a));
  const openActions = deal.notes.filter(n => n.kind === 'action' && !n.done).length;

  const submitNote = () => {
    const r = postNote(deal.id, { author: 'You', kind, body: draft, mentions: [] });
    if (r.error) return toast(r.message, 'risk');
    setDraft('');
    toast('Posted to the war room');
  };

  const dealPrompt = `You are Rook in the ${deal.company} deal war room (${deal.name}, ${moneyK(deal.value)}, ${st?.label}, win probability ${p}%, closing in ${days} days). `;

  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="PIPELINE / WAR ROOM"
        title={<>Deal <GradientText>War Room</GradientText></>}
        sub="Big deals are won in war rooms, not CRM fields. Buying committee, mutual close plan, and Rook - one live cockpit."
        action={
          <Button variant="ghost" size="sm" onClick={() => askRook(dealPrompt + 'Give me a full situation report and the three moves that most raise our odds of closing.')}>
            <Icon name="sparkles" size={16} /> Ask Rook about this deal
          </Button>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start', gap: '1.15rem' }}>
        {/* -------- War room list -------- */}
        <div className="col gap-2" style={{ minWidth: 0 }}>
          <SectionHeader title="War rooms" sub={`${deals.length} active`} />
          <div className="col gap-2 stagger" style={{ minWidth: 0 }}>
            {deals.map(d => (
              <WarRoomCard key={d.id} deal={d} active={d.id === deal.id} onClick={() => setSelId(d.id)} />
            ))}
          </div>
        </div>

        {/* -------- Command view -------- */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* Vitals hero */}
          <Card>
            <div className="row between wrap" style={{ gap: '1.2rem', alignItems: 'flex-start' }}>
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>{deal.company}</h2>
                  <Badge tone="accent">{deal.industry}</Badge>
                </div>
                <div className="muted" style={{ marginTop: 2 }}>{deal.name}</div>
                <div className="row gap-2 wrap t-sm muted" style={{ marginTop: 8 }}>
                  <span className="row gap-1"><Icon name="building" size={15} /> {deal.region}</span>
                  <span className="row gap-1"><Icon name="user" size={15} /> {deal.owner}</span>
                  <span className="row gap-1"><Icon name="calendar" size={15} /> closes {shortDate(closeDate(deal).toISOString())}</span>
                </div>
              </div>
              <div className="row gap-3" style={{ flex: 'none', alignItems: 'center' }}>
                <div className="col center gap-1">
                  <Ring value={p} size={92} stroke={9} color={winColor(p)} label={<span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{p}%</span>} />
                  <span className="stat-label">Win probability</span>
                </div>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <Sparkline data={momentum} w={140} h={44} color={winColor(p)} />
                  <span className="t-xs fw-6" style={{ color: since >= 0 ? 'var(--ok)' : 'var(--risk)' }}>
                    {since >= 0 ? '+' : ''}{since} pts since open
                  </span>
                </div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.2rem' }}>
              <div className="col gap-1">
                <span className="stat-label">Deal value</span>
                <span className="stat-value" style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2rem)' }}>{moneyK(deal.value)}</span>
                <span className="t-xs muted">annual recurring</span>
              </div>
              <div className="col gap-1">
                <span className="stat-label">Stage</span>
                <span className="fw-8" style={{ fontSize: '1.35rem', color: st?.color }}>{st?.label}</span>
                <span className="t-xs muted">{prog.done}/{prog.total} plan steps done</span>
              </div>
              <div className="col gap-1">
                <span className="stat-label">Close date</span>
                <span className="fw-8" style={{ fontSize: '1.35rem', color: days <= 14 ? 'var(--warn)' : 'var(--ink)' }}>
                  {days <= 0 ? 'today' : `${days} days`}
                </span>
                <span className="t-xs muted">{shortDate(closeDate(deal).toISOString())}</span>
              </div>
              <div className="col gap-1">
                <span className="stat-label">Committee mood</span>
                <span className="fw-8" style={{ fontSize: '1.35rem', color: sent >= 66 ? 'var(--ok)' : sent >= 40 ? 'var(--warn)' : 'var(--risk)' }}>{sent}%</span>
                <span className="t-xs muted">{deal.committee.length} stakeholders</span>
              </div>
            </div>
          </Card>

          <div className="grid" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start', gap: '1.15rem' }}>
            {/* Main column */}
            <div className="col gap-3" style={{ minWidth: 0 }}>
              {/* Buying committee */}
              <Card>
                <SectionHeader
                  title="Buying committee"
                  sub="Click a sentiment to update how the room is leaning"
                  action={<Badge tone={sent >= 66 ? 'ok' : sent >= 40 ? 'warn' : 'risk'}>{sent}% positive</Badge>}
                />
                <div className="col">
                  {deal.committee.map(m => <MemberRow key={m.id} deal={deal} m={m} toast={toast} />)}
                </div>
              </Card>

              {/* Mutual close plan */}
              <Card>
                <SectionHeader
                  title="Mutual close plan"
                  sub={`${prog.done} of ${prog.total} steps complete`}
                  action={
                    <Button variant="ghost" size="sm" onClick={() => askRook(dealPrompt + 'Review our mutual close plan and tell me the single step most likely to slip and how to de-risk it.')}>
                      <Icon name="sparkles" size={15} /> Rook review
                    </Button>
                  }
                />
                <div style={{ marginBottom: '.9rem' }}>
                  <ProgressBar value={prog.pct} color="var(--accent)" height={8} />
                </div>
                {PHASE_ORDER.map(phase => {
                  const steps = deal.plan.filter(s => s.phase === phase);
                  if (!steps.length) return null;
                  return (
                    <div key={phase} style={{ marginTop: '.4rem' }}>
                      <div className="eyebrow" style={{ marginTop: '.6rem' }}>{phase}</div>
                      {steps.map(s => <PlanRow key={s.id} deal={deal} step={s} toast={toast} />)}
                    </div>
                  );
                })}
              </Card>

              {/* Risks + competition */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.15rem', alignItems: 'start' }}>
                <Card>
                  <SectionHeader title="Risks + blockers" sub={`${risks.length} open`} />
                  <div className="col gap-2">
                    {deal.risks.map(r => (
                      <div key={r.id} className="panel" style={{ padding: '.8rem .9rem', opacity: r.mitigated ? .6 : 1 }}>
                        <div className="row between" style={{ alignItems: 'flex-start', gap: '.5rem' }}>
                          <span className="fw-6 t-sm" style={{ textDecoration: r.mitigated ? 'line-through' : 'none' }}>{r.label}</span>
                          <Badge tone={r.mitigated ? 'ok' : r.severity === 'high' ? 'risk' : r.severity === 'med' ? 'warn' : 'default'} style={{ flex: 'none' }}>
                            {r.mitigated ? 'mitigated' : r.severity}
                          </Badge>
                        </div>
                        <div className="t-xs muted" style={{ marginTop: 5 }}>{r.mitigation}</div>
                        <div style={{ marginTop: 7 }}>
                          {r.mitigated ? (
                            <button className="link t-xs" onClick={() => reopenRisk(deal.id, r.id)}>Reopen</button>
                          ) : (
                            <button className="link t-xs" onClick={() => { mitigateRisk(deal.id, r.id); toast('Risk mitigated'); }}>Mark mitigated</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader title="Competitive landscape" sub="Where we stand" />
                  <div className="col gap-2">
                    {deal.competitors.map(c => {
                      const pos = POSITION_META[c.us] || POSITION_META.even;
                      return (
                        <div key={c.id} className="panel" style={{ padding: '.8rem .9rem' }}>
                          <div className="row between" style={{ alignItems: 'center', gap: '.5rem' }}>
                            <span className="fw-7 clip">{c.name}</span>
                            <Badge tone={THREAT_TONE[c.threat]} style={{ flex: 'none' }}>{c.threat} threat</Badge>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <Badge tone={pos.tone}>{pos.label}</Badge>
                          </div>
                          <div className="t-xs muted" style={{ marginTop: 7 }}>{c.note}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            {/* Rail: Rook read + collaboration */}
            <div className="col gap-3" style={{ minWidth: 0 }}>
              {/* Rook's read */}
              <Card style={{ borderColor: 'var(--accent-300)' }}>
                <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.9rem' }}>
                  <span className="row center" style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #6d5cf7, #4a3ce0)', color: '#fff', flex: 'none' }}>
                    <Icon name="sparkles" size={18} fill="currentColor" stroke={0} />
                  </span>
                  <div className="col" style={{ lineHeight: 1.15 }}>
                    <span className="fw-8">Rook's read</span>
                    <span className="t-xs muted">Live on {deal.company}</span>
                  </div>
                </div>

                <div className="panel" style={{ padding: '.8rem .9rem', background: 'var(--risk-bg)', borderColor: 'transparent' }}>
                  <div className="eyebrow" style={{ color: 'var(--risk)' }}>Biggest risk</div>
                  <div className="fw-7 t-sm" style={{ marginTop: 4 }}>{read.title}</div>
                  <div className="t-xs" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{read.detail}</div>
                </div>

                <div className="panel" style={{ padding: '.8rem .9rem', background: 'var(--accent-50)', borderColor: 'transparent', marginTop: '.7rem' }}>
                  <div className="eyebrow">Recommended move</div>
                  <div className="fw-7 t-sm" style={{ marginTop: 4 }}>{move.title}</div>
                  <div className="t-xs" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{move.detail}</div>
                  <Button variant="primary" size="sm" style={{ marginTop: 10 }}
                    onClick={() => askRook(dealPrompt + `The recommended move is "${move.title}". ${move.detail} Draft exactly what I should do next.`)}>
                    <Icon name="sparkles" size={15} /> {move.cta}
                  </Button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div className="eyebrow" style={{ marginBottom: '.5rem' }}>What will move this deal</div>
                  {levers.length === 0 ? (
                    <div className="t-sm muted">The room is in strong shape. Keep the plan on schedule and protect the close date.</div>
                  ) : (
                    <div className="col gap-2">
                      {levers.map(l => (
                        <div key={l.id} className="row between" style={{ gap: '.6rem', alignItems: 'flex-start' }}>
                          <div className="col" style={{ minWidth: 0 }}>
                            <span className="fw-6 t-sm clip">{l.label}</span>
                            <span className="t-xs muted">{l.sub}</span>
                          </div>
                          <div className="row gap-1" style={{ flex: 'none', alignItems: 'center' }}>
                            <span className="badge badge-ok tnum" style={{ fontWeight: 800 }}>+{l.delta}</span>
                            <button className="btn btn-ghost btn-sm" title="Apply this move"
                              onClick={() => { applyLever(deal.id, l); celebrate(); toast(`Applied: win probability +${l.delta}`); }}>
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Collaboration rail */}
              <Card>
                <SectionHeader
                  title="War room feed"
                  sub={openActions > 0 ? `${openActions} open action${openActions === 1 ? '' : 's'}` : 'Team notes + next actions'}
                />
                <div className="col gap-2" style={{ marginBottom: '.4rem' }}>
                  <Segmented
                    options={[
                      { value: 'update', label: 'Update' },
                      { value: 'note', label: 'Note' },
                      { value: 'action', label: 'Action' },
                      { value: 'risk', label: 'Flag' },
                    ]}
                    value={kind}
                    onChange={setKind}
                  />
                  <Field label={null}>
                    <Textarea
                      rows={2}
                      placeholder={kind === 'action' ? 'Add a next action for the team...' : 'Post an update to the war room...'}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNote(); }}
                    />
                  </Field>
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <span className="t-xs muted">Cmd/Ctrl + Enter to post</span>
                    <Button variant="primary" size="sm" onClick={submitNote} disabled={!draft.trim()}>
                      <Icon name="send" size={15} /> Post
                    </Button>
                  </div>
                </div>
                <div className="col" style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {notes.map(n => <NoteRow key={n.id} deal={deal} n={n} toast={toast} />)}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
