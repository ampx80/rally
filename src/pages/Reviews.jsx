// Reviews + Reputation. Rally's reputation engine - a GoHighLevel staple that
// HubSpot lacks, bundled in. Four surfaces over one local-first store
// (src/lib/reviews-data.js): a reputation dashboard, ask-after-win request
// campaigns, an incoming review stream with an AI responder, and a configurable
// embeddable widget. 100% functional with seeded data + zero backend; real
// posting + real asks are env-gated and degrade to a local queue.
import React, { useMemo, useState } from 'react';
import {
  useReviews, getReviews, getRequests, getWidget, getAutomation,
  reviewStats, requestStats, scoreBand, draftReply, generateDraft, postReply,
  sendRequests, advanceRequest, updateWidget, updateAutomation, wonDealTriggers,
  widgetReviews, hasPublishEnv, SOURCES, sourceById, CHANNELS, REQUEST_META,
  SENTIMENT_META,
} from '../lib/reviews-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input, Select,
  Textarea, Modal, EmptyState, Tabs, Ring, Sparkline, ProgressBar, Segmented,
  GradientText, useToast, relTime, avatarColor,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* ---------- star row ---------- */
function Stars({ rating = 0, size = 15, gap = 1 }) {
  const full = Math.round(rating);
  return (
    <span className="row" style={{ gap, lineHeight: 0 }} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= full ? '#f5a623' : 'var(--n-200)'} stroke="none" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function SourceDot({ id, withLabel = false }) {
  const s = sourceById(id);
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, background: s.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flex: 'none' }}>{s.short}</span>
      {withLabel && <span className="fw-6 t-sm">{s.label}</span>}
    </span>
  );
}

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ============================================================
   TAB 1 - REPUTATION DASHBOARD
   ============================================================ */
function Reputation({ stats, onGoStream }) {
  const band = scoreBand(stats.score);
  const maxDist = Math.max(1, ...stats.distribution);
  const sentTotal = stats.sentiment.positive + stats.sentiment.neutral + stats.sentiment.negative || 1;

  return (
    <div className="col gap-3">
      {/* hero row: score ring + headline KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr 1fr 1fr' }}>
        <Card className="row gap-3" style={{ alignItems: 'center' }}>
          <Ring value={stats.score} size={104} stroke={10} color={band.color} label={
            <span className="col center" style={{ gap: 0 }}>
              <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{stats.score}</span>
              <span className="t-xs muted" style={{ fontWeight: 600 }}>/ 100</span>
            </span>
          } />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Reputation score</div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', color: band.color }}>{band.grade}</div>
            <div className="t-sm muted">Rating, response rate, freshness and volume in one number.</div>
          </div>
        </Card>

        <Card className="col gap-1">
          <div className="stat-label">Overall rating</div>
          <div className="row gap-2" style={{ alignItems: 'baseline' }}>
            <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{stats.avg.toFixed(2)}</div>
            <Stars rating={stats.avg} size={17} />
          </div>
          <div className="t-sm muted">{stats.total} reviews all-time</div>
        </Card>

        <Card className="col gap-1">
          <div className="stat-label">Response rate</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{Math.round(stats.responseRate * 100)}%</div>
          <div className="t-sm" style={{ color: stats.needsReply ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>
            {stats.needsReply ? `${stats.needsReply} awaiting a reply` : 'All caught up'}
          </div>
        </Card>

        <Card className="col gap-1">
          <div className="stat-label">New this month</div>
          <div className="stat-value" style={{ fontSize: 'clamp(2rem,3vw,2.6rem)' }}>{stats.newThisMonth}</div>
          <div className="row gap-1" style={{ alignItems: 'flex-end' }}>
            <Sparkline data={stats.trend} w={110} h={30} color="var(--accent)" />
            <span className="t-xs muted">6mo rating trend</span>
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* rating distribution */}
        <Card>
          <SectionHeader title="Rating distribution" sub="Where your stars land" />
          <div className="col gap-2">
            {[5, 4, 3, 2, 1].map(star => {
              const n = stats.distribution[star - 1];
              return (
                <div key={star} className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="row" style={{ gap: 3, width: 58, flex: 'none' }}>
                    <span className="fw-7 tnum">{star}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" /></svg>
                  </span>
                  <div style={{ flex: 1 }}><ProgressBar value={(n / maxDist) * 100} color={star >= 4 ? 'var(--ok)' : star === 3 ? 'var(--warn)' : 'var(--risk)'} height={10} /></div>
                  <span className="tnum fw-6 muted" style={{ width: 30, textAlign: 'right', flex: 'none' }}>{n}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* sentiment breakdown */}
        <Card>
          <SectionHeader title="Sentiment" sub="Derived from every star rating" />
          <div className="row" style={{ height: 16, borderRadius: 999, overflow: 'hidden', marginBottom: '1.1rem' }}>
            {['positive', 'neutral', 'negative'].map(k => {
              const v = stats.sentiment[k];
              if (!v) return null;
              return <div key={k} title={`${SENTIMENT_META[k].label}: ${v}`} style={{ width: `${(v / sentTotal) * 100}%`, background: SENTIMENT_META[k].color }} />;
            })}
          </div>
          <div className="col gap-2">
            {['positive', 'neutral', 'negative'].map(k => (
              <div key={k} className="row between">
                <span className="row gap-1"><span className="dot" style={{ background: SENTIMENT_META[k].color }} />{SENTIMENT_META[k].label}</span>
                <span className="fw-7 tnum">{Math.round((stats.sentiment[k] / sentTotal) * 100)}%<span className="muted fw-5"> ({stats.sentiment[k]})</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* volume + rating by source */}
      <Card>
        <SectionHeader title="Volume by source" sub="Google, Facebook and Yelp in one view"
          action={<Button variant="ghost" size="sm" onClick={onGoStream}><Icon name="inbox" size={15} /> Open stream</Button>} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {stats.bySource.map(s => (
            <div key={s.id} className="panel card-pad col gap-2">
              <div className="row between">
                <SourceDot id={s.id} withLabel />
                <Badge tone="default" className="tnum">{s.count}</Badge>
              </div>
              <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-.02em' }}>{s.avg ? s.avg.toFixed(1) : '-'}</span>
                <Stars rating={s.avg} size={13} />
              </div>
              <ProgressBar value={(s.count / Math.max(1, stats.total)) * 100} color={s.color} height={6} />
              <span className="t-xs muted">{Math.round((s.count / Math.max(1, stats.total)) * 100)}% of total volume</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TAB 2 - REVIEW REQUESTS (ask after a win)
   ============================================================ */
function FunnelStep({ label, value, pct, color, last }) {
  return (
    <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ height: 74, background: color, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', position: 'relative' }}>
        <span style={{ fontSize: '1.7rem', fontWeight: 800 }}>{value}</span>
        {!last && <span style={{ position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color }}><Icon name="chevronRight" size={22} /></span>}
      </div>
      <div className="row between">
        <span className="t-sm fw-6">{label}</span>
        {pct != null && <span className="t-xs muted tnum">{pct}%</span>}
      </div>
    </div>
  );
}

function Requests({ toast }) {
  const q = getRequests();
  const rstats = requestStats();
  const auto = getAutomation();
  const [newOpen, setNewOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const rows = filter === 'all' ? q : q.filter(r => r.status === filter);
  const pctOf = (n) => rstats.sent ? Math.round((n / rstats.sent) * 100) : 0;

  return (
    <div className="col gap-3">
      <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 60%)' }}>
        <div className="row between wrap" style={{ gap: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Ask after a win</div>
            <h3 style={{ margin: 0 }}>Turn a won deal into a five star review</h3>
            <div className="muted t-sm" style={{ maxWidth: 520 }}>Every completed job is your best moment to ask. Rally fires the request by SMS or email while the win is still warm.</div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" onClick={() => askRook('Which of my won deals should I ask for a review right now, and should I use SMS or email?')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => setNewOpen(true)}><Icon name="send" size={16} /> New request campaign</Button>
          </div>
        </div>
      </Card>

      {/* conversion funnel */}
      <Card>
        <SectionHeader title="Request funnel" sub={`${Math.round(rstats.conversion * 100)}% of asks turn into a public review`} />
        <div className="row gap-3" style={{ alignItems: 'stretch' }}>
          <FunnelStep label="Sent" value={rstats.sent} pct={100} color="var(--n-400)" />
          <FunnelStep label="Opened" value={rstats.opened} pct={pctOf(rstats.opened)} color="var(--info)" />
          <FunnelStep label="Clicked" value={rstats.clicked} pct={pctOf(rstats.clicked)} color="var(--accent)" />
          <FunnelStep label="Reviewed" value={rstats.completed} pct={pctOf(rstats.completed)} color="var(--ok)" last />
        </div>
      </Card>

      {/* auto-ask automation */}
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--accent)' }}><Icon name="zap" size={22} /></span>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7">Auto-ask after every win</span>
            <span className="t-sm muted">Send a {auto.channel === 'sms' ? 'text' : 'email'} {auto.delayDays} day{auto.delayDays === 1 ? '' : 's'} after a deal is marked won.</span>
          </div>
        </div>
        <div className="row gap-2" style={{ flex: 'none' }}>
          <Select value={auto.delayDays} onChange={e => updateAutomation({ delayDays: Number(e.target.value) })} style={{ width: 130 }}>
            {[0, 1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d === 0 ? 'Same day' : `${d} day${d === 1 ? '' : 's'} after`}</option>)}
          </Select>
          <button className={`switch ${auto.enabled ? 'on' : ''}`} role="switch" aria-checked={auto.enabled} aria-label="Toggle auto-ask" onClick={() => { updateAutomation({ enabled: !auto.enabled }); toast(auto.enabled ? 'Auto-ask paused' : 'Auto-ask on'); }} />
        </div>
      </Card>

      {/* queue */}
      <Card pad={false}>
        <div className="row between wrap card-pad" style={{ gap: '.75rem', paddingBottom: '.9rem' }}>
          <SectionHeader title="Request queue" sub={`${q.length} asks`} />
          <Segmented value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'All' }, { value: 'sent', label: 'Sent' },
            { value: 'opened', label: 'Opened' }, { value: 'clicked', label: 'Clicked' },
            { value: 'completed', label: 'Reviewed' },
          ]} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Customer</th><th>Job</th><th>Channel</th><th>Site</th><th>Status</th><th>Sent</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><div className="row gap-2"><Avatar name={r.customer} size={30} /><span className="fw-6">{r.customer}</span></div></td>
                  <td className="muted">{r.job}</td>
                  <td><span className="row gap-1"><Icon name={r.channel === 'sms' ? 'phone' : 'mail'} size={14} />{r.channel.toUpperCase()}</span></td>
                  <td><SourceDot id={r.source} /></td>
                  <td><Badge tone={REQUEST_META[r.status].tone}>{REQUEST_META[r.status].label}</Badge></td>
                  <td className="muted t-sm">{relTime(r.sentAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!['completed', 'bounced'].includes(r.status)
                      ? <Button variant="quiet" size="sm" onClick={() => { advanceRequest(r.id); }}>Advance <Icon name="chevronRight" size={14} /></Button>
                      : <span className="t-xs muted">{r.status === 'completed' ? 'Left a review' : 'Undeliverable'}</span>}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><EmptyState icon="📨" title="No requests here" body="Fire a new request campaign to fill this queue." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {newOpen && <NewRequestModal onClose={() => setNewOpen(false)} toast={toast} />}
    </div>
  );
}

function NewRequestModal({ onClose, toast }) {
  const wins = useMemo(() => wonDealTriggers(), []);
  const [mode, setMode] = useState(wins.length ? 'deal' : 'manual');
  const [dealId, setDealId] = useState(wins[0]?.id || '');
  const [manual, setManual] = useState('');
  const [channel, setChannel] = useState('sms');
  const [source, setSource] = useState('google');
  const [job, setJob] = useState('');

  const selectedDeal = wins.find(w => w.id === dealId);

  const submit = () => {
    let customers = [];
    let jobLabel = job;
    if (mode === 'deal' && selectedDeal) {
      customers = [selectedDeal.company || selectedDeal.name];
      jobLabel = jobLabel || selectedDeal.name;
    } else {
      customers = manual.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }
    const r = sendRequests({ customers, channel, source, job: jobLabel });
    if (r.error) return toast(r.message, 'risk');
    toast(`${r.count} review ${r.count === 1 ? 'ask' : 'asks'} queued`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="New review request" width={560} footer={
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={submit}><Icon name="send" size={15} /> Send request</Button></>
    }>
      <div className="col gap-3">
        {wins.length > 0 && (
          <Segmented value={mode} onChange={setMode} options={[{ value: 'deal', label: 'From a won deal' }, { value: 'manual', label: 'Enter customers' }]} />
        )}
        {mode === 'deal' && wins.length > 0 ? (
          <Field label="Won deal to ask" hint="Pulled live from your closed-won pipeline">
            <Select value={dealId} onChange={e => setDealId(e.target.value)}>
              {wins.map(w => <option key={w.id} value={w.id}>{w.company || w.name}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="Customers" hint="One per line, or comma separated">
            <Textarea rows={4} value={manual} onChange={e => setManual(e.target.value)} placeholder={'Grace Whitman\nHassan Reyes'} />
          </Field>
        )}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Channel">
            <Select value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Point them to">
            <Select value={source} onChange={e => setSource(e.target.value)}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Job or service (optional)">
          <Input value={job} onChange={e => setJob(e.target.value)} placeholder="Water heater install" />
        </Field>
        <div className="panel card-pad t-sm" style={{ background: 'var(--n-25)' }}>
          <span className="fw-6">Preview: </span>
          <span className="muted">Hi, thanks for choosing us! If you have a minute, a quick {sourceById(source).label} review would mean a lot: {sourceById(source).handle}</span>
        </div>
        {!hasPublishEnv() && <div className="t-xs muted row gap-1"><Icon name="lock" size={13} /> Provider not connected. Asks queue locally and send once SMS/email env is wired.</div>}
      </div>
    </Modal>
  );
}

/* ============================================================
   TAB 3 - REVIEW STREAM + AI RESPONDER
   ============================================================ */
function ReviewCard({ r, onRespond }) {
  return (
    <Card className="col gap-2">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <Avatar name={r.author} size={40} color={avatarColor(r.author)} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="fw-7 clip">{r.author}</span>
              {r.verified && <Badge tone="ok" className="t-xs"><Icon name="check" size={11} /> Verified</Badge>}
            </div>
            <div className="row gap-2"><Stars rating={r.rating} /><span className="t-xs muted">{relTime(r.createdAt)}</span></div>
          </div>
        </div>
        <SourceDot id={r.source} />
      </div>

      <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '.98rem', lineHeight: 1.55 }}>{r.body}</p>

      {r.responded ? (
        <div className="panel card-pad col gap-1" style={{ background: 'var(--n-25)', borderLeft: '3px solid var(--accent)' }}>
          <div className="row between">
            <span className="eyebrow">Your reply</span>
            {r.postPending && <Badge tone="warn" className="t-xs">Queued</Badge>}
          </div>
          <span className="t-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{r.response}</span>
        </div>
      ) : (
        <div className="row gap-1 wrap">
          <Button variant="accent" size="sm" onClick={() => onRespond(r)}><Icon name="sparkles" size={14} /> Draft AI reply</Button>
          <Button variant="ghost" size="sm" onClick={() => onRespond(r)}>Reply</Button>
        </div>
      )}
    </Card>
  );
}

function Stream({ toast }) {
  const all = getReviews();
  const [rating, setRating] = useState('all');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [active, setActive] = useState(null); // review being responded to

  const filtered = all.filter(r =>
    (rating === 'all' || r.rating === Number(rating)) &&
    (source === 'all' || r.source === source) &&
    (status === 'all' || (status === 'needs' ? !r.responded : r.responded))
  );
  const needs = all.filter(r => !r.responded).length;

  return (
    <div className="col gap-3">
      <Card className="row between wrap" style={{ gap: '1rem' }}>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <span className="t-sm fw-6 muted">Filter</span>
          <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'needs', label: `Needs reply (${needs})` }, { value: 'done', label: 'Responded' }]} />
          <Select value={rating} onChange={e => setRating(e.target.value)} style={{ width: 130 }}>
            <option value="all">Any rating</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
          </Select>
          <Select value={source} onChange={e => setSource(e.target.value)} style={{ width: 140 }}>
            <option value="all">All sources</option>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
        <span className="t-sm muted tnum">{filtered.length} of {all.length}</span>
      </Card>

      {needs > 0 && status === 'all' && (
        <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 65%)' }} className="row between wrap">
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="fw-7"><GradientText>AI responder</GradientText> can clear your queue</span>
            <span className="t-sm muted">{needs} review{needs === 1 ? '' : 's'} waiting. Draft on-brand replies in one click, approve, and post.</span>
          </div>
          <Button variant="accent" onClick={() => { const first = all.find(r => !r.responded); if (first) setActive(first); }}>
            <Icon name="sparkles" size={16} /> Respond to next
          </Button>
        </Card>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {filtered.map(r => <ReviewCard key={r.id} r={r} onRespond={setActive} />)}
      </div>
      {!filtered.length && <Card><EmptyState icon="⭐" title="No reviews match" body="Adjust the filters to see more of your reputation." /></Card>}

      {active && <ResponderModal review={active} onClose={() => setActive(null)} toast={toast} />}
    </div>
  );
}

function ResponderModal({ review, onClose, toast }) {
  const [text, setText] = useState(review.aiDraft || '');
  const [drafting, setDrafting] = useState(false);

  const doDraft = () => {
    setDrafting(true);
    // Local synth is instant; a small delay reads as "thinking" for the demo.
    setTimeout(() => {
      const r = generateDraft(review.id);
      setText(r.draft || draftReply(review));
      setDrafting(false);
    }, 480);
  };

  const doPost = () => {
    const r = postReply(review.id, text);
    if (r.error) return toast(r.message, 'risk');
    toast(r.posted ? 'Reply posted' : 'Reply saved and queued to post');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Respond to review" width={620} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="accent" onClick={doPost}><Icon name="send" size={15} /> {hasPublishEnv() ? 'Post reply' : 'Approve and queue'}</Button>
      </>
    }>
      <div className="col gap-3">
        <div className="panel card-pad col gap-2" style={{ background: 'var(--n-25)' }}>
          <div className="row between">
            <div className="row gap-2"><Avatar name={review.author} size={34} /><div className="col"><span className="fw-7">{review.author}</span><Stars rating={review.rating} size={13} /></div></div>
            <SourceDot id={review.source} withLabel />
          </div>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '.96rem', lineHeight: 1.55 }}>{review.body}</p>
        </div>

        <div className="row between">
          <span className="eyebrow">Your reply</span>
          <Button variant="quiet" size="sm" onClick={doDraft} disabled={drafting}>
            <Icon name="sparkles" size={14} /> {drafting ? 'Drafting...' : text ? 'Redraft with AI' : 'Draft with AI'}
          </Button>
        </div>
        <Textarea rows={7} value={text} onChange={e => setText(e.target.value)} placeholder="Write a warm, specific reply. Or let the AI responder draft one you can edit." />
        <div className="t-xs muted row gap-1"><Icon name="shield" size={13} /> The AI drafts on-brand. You always approve and can edit before anything posts.</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   TAB 4 - EMBEDDABLE WIDGET
   ============================================================ */
function WidgetTab({ toast }) {
  const w = getWidget();
  const [embedOpen, setEmbedOpen] = useState(false);
  const shown = widgetReviews(w, 6);
  const set = (patch) => updateWidget(patch);
  const toggleSource = (id) => {
    const has = w.sources.includes(id);
    set({ sources: has ? w.sources.filter(s => s !== id) : [...w.sources, id] });
  };

  return (
    <div className="col gap-3">
      <div className="grid" style={{ gridTemplateColumns: '340px 1fr' }}>
        {/* config */}
        <Card className="col gap-3">
          <SectionHeader title="Widget" sub="Embed your best reviews anywhere" />
          <Field label="Business name"><Input value={w.business} onChange={e => set({ business: e.target.value })} /></Field>
          <Field label="Layout">
            <Segmented value={w.layout} onChange={v => set({ layout: v })} options={[{ value: 'carousel', label: 'Carousel' }, { value: 'grid', label: 'Grid' }, { value: 'badge', label: 'Badge' }]} />
          </Field>
          <Field label="Theme">
            <Segmented value={w.theme} onChange={v => set({ theme: v })} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' }]} />
          </Field>
          <Field label="Minimum rating to show">
            <Select value={w.minRating} onChange={e => set({ minRating: Number(e.target.value) })}>
              {[5, 4, 3].map(n => <option key={n} value={n}>{n} stars and up</option>)}
            </Select>
          </Field>
          <div className="field">
            <label>Sources</label>
            <div className="row gap-1 wrap">
              {SOURCES.map(s => (
                <button key={s.id} onClick={() => toggleSource(s.id)} className="btn btn-sm"
                  style={{ background: w.sources.includes(s.id) ? s.color : 'var(--n-100)', color: w.sources.includes(s.id) ? '#fff' : 'var(--n-600)', border: 'none' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="accent" onClick={() => setEmbedOpen(true)}><Icon name="command" size={15} /> Get embed code</Button>
        </Card>

        {/* live preview */}
        <Card style={{ background: 'var(--n-25)' }}>
          <SectionHeader title="Live preview" sub={`Updates as you edit - showing ${shown.length} review${shown.length === 1 ? '' : 's'}`} />
          <div style={{
            borderRadius: 'var(--r-lg)', padding: '1.4rem',
            background: w.theme === 'dark' ? '#141924' : '#ffffff',
            color: w.theme === 'dark' ? '#eef1f6' : '#0e1116',
            border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)',
          }}>
            <div className="row between wrap" style={{ marginBottom: '1rem' }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{w.business}</span>
                <span className="row gap-1"><Stars rating={reviewStats().avg} size={15} /><span style={{ fontWeight: 700 }}>{reviewStats().avg.toFixed(1)}</span></span>
              </div>
              <div className="row gap-1">{w.sources.map(s => <span key={s} style={{ width: 22, height: 22, borderRadius: 6, background: sourceById(s).color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{sourceById(s).short}</span>)}</div>
            </div>
            {w.layout === 'badge' ? (
              <div className="col center gap-1" style={{ padding: '1rem 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-.03em' }}>{reviewStats().avg.toFixed(1)}</span>
                <Stars rating={reviewStats().avg} size={22} />
                <span style={{ opacity: .7 }}>{reviewStats().total} reviews</span>
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: w.layout === 'grid' ? '1fr 1fr' : '1fr', gap: '.85rem' }}>
                {shown.slice(0, w.layout === 'grid' ? 6 : 3).map(r => (
                  <div key={r.id} style={{ padding: '.85rem', borderRadius: 'var(--r-md)', background: w.theme === 'dark' ? 'rgba(255,255,255,.04)' : 'var(--n-25)' }}>
                    <div className="row between"><span className="fw-7 t-sm">{r.author}</span><Stars rating={r.rating} size={12} /></div>
                    <p style={{ margin: '.4rem 0 0', fontSize: '.85rem', opacity: .85, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="row center" style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '.72rem', opacity: .5, fontWeight: 600 }}>Powered by Rally</span>
            </div>
          </div>
        </Card>
      </div>

      {embedOpen && <EmbedModal widget={w} onClose={() => setEmbedOpen(false)} toast={toast} />}
    </div>
  );
}

function EmbedModal({ widget, onClose, toast }) {
  const snippet = `<!-- Rally reviews widget -->
<div id="rally-reviews"
     data-business="${widget.business}"
     data-layout="${widget.layout}"
     data-theme="${widget.theme}"
     data-min-rating="${widget.minRating}"
     data-sources="${widget.sources.join(',')}"></div>
<script async src="https://widgets.rally.app/reviews.js"></script>`;
  const copy = () => {
    try { navigator.clipboard.writeText(snippet); toast('Embed code copied'); }
    catch { toast('Copy failed, select and copy manually', 'warn'); }
  };
  return (
    <Modal open onClose={onClose} title="Embed code" width={620} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="accent" onClick={copy}><Icon name="copy" size={15} /> Copy code</Button></>}>
      <div className="col gap-2">
        <div className="t-sm muted">Paste this once before the closing body tag. The widget renders your live reviews and honors every filter above.</div>
        <pre className="mono" style={{ margin: 0, padding: '1rem', background: 'var(--n-900)', color: '#e6e9f0', borderRadius: 'var(--r-md)', overflowX: 'auto', fontSize: '.82rem', lineHeight: 1.6 }}>{snippet}</pre>
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Reviews() {
  useReviews();
  const toast = useToast();
  const [tab, setTab] = useState('reputation');
  const stats = reviewStats();
  const rstats = requestStats();

  return (
    <div className="page-in col gap-3">
      <PageTitle
        eyebrow="Marketing"
        title={<>Reviews <GradientText>&amp; Reputation</GradientText></>}
        sub="Monitor every site, ask happy customers after a win, and let the AI responder keep your reply rate perfect. One product, not five subscriptions."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => askRook('Summarize my reputation this month and tell me which review I should respond to first.')}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={() => setTab('requests')}><Icon name="send" size={16} /> Request reviews</Button>
          </div>
        }
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'reputation', label: 'Reputation' },
        { key: 'requests', label: 'Requests', count: rstats.total },
        { key: 'stream', label: 'Review stream', count: stats.needsReply || undefined },
        { key: 'widget', label: 'Widget' },
      ]} />

      {tab === 'reputation' && <Reputation stats={stats} onGoStream={() => setTab('stream')} />}
      {tab === 'requests' && <Requests toast={toast} />}
      {tab === 'stream' && <Stream toast={toast} />}
      {tab === 'widget' && <WidgetTab toast={toast} />}
    </div>
  );
}
