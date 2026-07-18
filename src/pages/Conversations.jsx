// Conversations - Ardovo's unified omni-channel inbox. One threaded view per
// contact that merges SMS, email, WhatsApp, Instagram DM, Facebook Messenger,
// Google Business messages, and voice/call transcripts into a single stream.
// Left: filterable conversation list with channel badges + unread. Center: the
// mixed-channel thread with a channel-picking composer, quick replies, and a
// one-click Rook draft. Right: contact context, the live deal, tags, recent
// activity, and the missed-call text-back automation with a working demo.
//
// This is the feature SMBs never leave GoHighLevel for. Ardovo does it with Rook
// drafting and missed-call text-back built in. Local-first + deterministic seed;
// live sends are env-gated and dormant offline. No em-dash or en-dash anywhere.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button, Card, Badge, Avatar, StatCard, PageTitle, Segmented, Field, Textarea,
  Select, EmptyState, useToast, moneyK, relTime, timeStr,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { getCurrentUser, getUsers, userName } from '../lib/store.js';
import {
  useConversations, getConversations, getConversation, lastMessage, inboxStats,
  channelBreakdown, CHANNELS, CHANNEL_ORDER, channelMeta, QUICK_REPLIES,
  MISSED_CALL_RECIPE, aiDraftFor, sendMessage, markRead, assignConversation,
  togglePin, simulateMissedCall,
} from '../lib/conversations-data.js';

/* ---------- self-contained channel glyphs (no icon-set dependency) ---------- */
const GLYPHS = {
  sms: ['M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4V5z', 'M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01'],
  email: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 7l-10 6L2 7'],
  whatsapp: ['M20.5 3.6a10 10 0 0 0-15.4 12.7L4 21l4.9-1.3A10 10 0 1 0 20.5 3.6z', 'M9 8.4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2s.9 2.4 1 2.6c.2.2 1.8 2.8 4.4 3.8 2.2.9 2.7.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1 .1-1.1-.1-.1-.3-.2-.6-.4'],
  instagram: ['M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z', 'M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z', 'M17.4 6.6h.01'],
  messenger: ['M12 2C6.5 2 2 6.1 2 11.1c0 2.9 1.4 5.4 3.6 7.1V22l3.3-1.8c1 .3 2 .4 3.1.4 5.5 0 10-4.1 10-9.5S17.5 2 12 2z', 'M6.8 14.2l3.1-3.3 2 1.5 2.9-1.6-3.1 3.2-1.9-1.5z'],
  gbm: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z', 'M12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z'],
  call: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'],
};
function ChannelGlyph({ channel, size = 15 }) {
  const paths = GLYPHS[channel] || GLYPHS.sms;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
function ChannelChip({ channel, label = true }) {
  const m = channelMeta(channel);
  return (
    <span className="row" style={{
      gap: 5, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.01em',
      padding: '.16rem .5rem', borderRadius: 'var(--r-pill)',
      color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
    }}>
      <span style={{ color: m.color }}><ChannelGlyph channel={channel} size={13} /></span>
      {label && m.label}
    </span>
  );
}
function ChannelDot({ channel, size = 22 }) {
  const m = channelMeta(channel);
  return (
    <span className="row center" title={m.label} style={{
      width: size, height: size, borderRadius: 7, flex: 'none', color: m.color,
      background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
    }}>
      <ChannelGlyph channel={channel} size={size * 0.62} />
    </span>
  );
}

/* ---------- narrow viewport hook (single-pane on phones) ---------- */
function useIsNarrow(q = '(max-width: 820px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    h(); mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'mine', label: 'Mine' },
  { value: 'unassigned', label: 'Unassigned' },
];

export default function Conversations() {
  useConversations();
  const nav = useNavigate();
  const toast = useToast();
  const narrow = useIsNarrow();
  const me = getCurrentUser();

  const all = getConversations();
  const stats = inboxStats();
  const breakdown = channelBreakdown();

  const [filter, setFilter] = useState('all');
  const [chan, setChan] = useState('all'); // channel filter
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(() => (all[0] ? all[0].id : null));
  const [pane, setPane] = useState('list'); // mobile: 'list' | 'thread'

  // Composer state
  const [replyChan, setReplyChan] = useState('sms');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const list = useMemo(() => {
    let out = all.filter(c => {
      if (filter === 'unread' && !c.unread) return false;
      if (filter === 'mine' && c.assignedTo !== me?.id) return false;
      if (filter === 'unassigned' && c.assignedTo) return false;
      if (chan !== 'all' && !c.channels.includes(chan)) return false;
      if (q.trim()) {
        const hay = `${c.contactName} ${c.company} ${c.handle} ${(c.messages || []).map(m => m.body).join(' ')}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
    // pinned first, then most-recent activity
    return out.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      const ta = new Date(lastMessage(a)?.at || 0).getTime();
      const tb = new Date(lastMessage(b)?.at || 0).getTime();
      return tb - ta;
    });
  }, [all, filter, chan, q, me]);

  const conv = getConversation(selId) || list[0] || null;

  // Keep a valid selection as filters change.
  useEffect(() => {
    if (!conv && list[0]) setSelId(list[0].id);
  }, [list, conv]);

  // On selecting a conversation: mark read, default the reply channel to the
  // last channel used, clear the draft, and scroll the thread to the bottom.
  useEffect(() => {
    if (!conv) return;
    markRead(conv.id);
    const lm = lastMessage(conv);
    setReplyChan(lm ? lm.channel : (conv.channels[0] || 'sms'));
    setDraft('');
  }, [selId]); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selId, conv?.messages?.length]);

  const openConv = (id) => { setSelId(id); setPane('thread'); };

  const doSend = () => {
    if (!conv) return;
    const r = sendMessage(conv.id, { channel: replyChan, body: draft });
    if (r.error) return toast(r.message, 'risk');
    setDraft('');
    toast(`Sent via ${channelMeta(replyChan).label}`);
  };

  const doDraft = () => {
    if (!conv) return;
    setDraft(aiDraftFor(conv));
    toast('Rook drafted a reply');
  };

  const askRook = () => {
    if (!conv) return;
    const prompt = `Summarize my conversation with ${conv.contactName} at ${conv.company} across all channels and suggest the best next step.`;
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
  };

  const doMissedCall = () => {
    if (!conv) return;
    const r = simulateMissedCall(conv.id);
    if (r.error) return toast(r.message, 'risk');
    toast('Missed call recovered - text-back sent');
  };

  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="Customers"
        title="Conversations"
        sub="One inbox for every channel. SMS, email, WhatsApp, Instagram, Messenger, Google, and calls in a single thread - with Rook drafting and missed-call text-back built in."
        action={<Button variant="ghost" size="sm" onClick={askRook} disabled={!conv}><Icon name="sparkles" size={16} /> Ask Rook</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.15rem' }}>
        <StatCard label="Unread" value={stats.unread} icon={<Icon name="inbox" size={18} />} accent="var(--accent)" sub="across all channels" />
        <StatCard label="Open conversations" value={stats.open} icon={<Icon name="users" size={18} />} accent="#0ea5a3" sub="one thread per contact" />
        <StatCard label="Missed calls recovered" value={stats.recoveries} icon={<Icon name="phone" size={18} />} accent="#1a7f52" sub={`${MISSED_CALL_RECIPE.recoveryRate}% of callers reply back`} />
        <StatCard label="Avg first response" value={stats.avgMins} format={(n) => `${Math.round(n)}m`} icon={<Icon name="clock" size={18} />} accent="#b3721a" sub="faster with Rook drafts" />
      </div>

      <div className="cv-shell" data-pane={pane}>
        {/* ---------------- LEFT: list ---------------- */}
        <Card pad={false} className="cv-col cv-list">
          <div className="cv-listhead">
            <div className="cv-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people, companies, messages..." aria-label="Search conversations" />
            </div>
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
            <div className="row gap-1 wrap" style={{ marginTop: 2 }}>
              <button className={`cv-chanfilter${chan === 'all' ? ' is-on' : ''}`} onClick={() => setChan('all')}>All channels</button>
              {CHANNEL_ORDER.map(id => (
                <button key={id} className={`cv-chanfilter${chan === id ? ' is-on' : ''}`} onClick={() => setChan(chan === id ? 'all' : id)}
                  title={channelMeta(id).label} style={chan === id ? { color: channelMeta(id).color, borderColor: channelMeta(id).color } : undefined}>
                  <span style={{ color: channelMeta(id).color }}><ChannelGlyph channel={id} size={13} /></span>
                  <span className="cv-cf-count">{breakdown[id] || 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="cv-listscroll">
            {list.length === 0 ? (
              <EmptyState icon="🔎" title="No conversations" body="Try a different filter or clear the search." />
            ) : list.map(c => {
              const lm = lastMessage(c);
              const on = conv && c.id === conv.id;
              return (
                <button key={c.id} className={`cv-item${on ? ' is-on' : ''}`} onClick={() => openConv(c.id)}>
                  <div style={{ position: 'relative', flex: 'none' }}>
                    <Avatar name={c.contactName} size={42} />
                    {lm && <span className="cv-item__ch" style={{ color: channelMeta(lm.channel).color, background: 'var(--paper)' }}><ChannelGlyph channel={lm.channel} size={12} /></span>}
                  </div>
                  <div className="col" style={{ minWidth: 0, flex: 1, gap: 2 }}>
                    <div className="row between" style={{ gap: 6 }}>
                      <span className="clip fw-7" style={{ fontSize: '.98rem' }}>{c.contactName}</span>
                      <span className="t-xs muted" style={{ flex: 'none' }}>{lm ? relTime(lm.at) : ''}</span>
                    </div>
                    <div className="row between" style={{ gap: 6 }}>
                      <span className="clip t-sm" style={{ color: c.unread ? 'var(--ink)' : 'var(--n-600)', fontWeight: c.unread ? 600 : 400 }}>
                        {lm ? (lm.dir === 'out' ? 'You: ' : '') + snippet(lm) : 'No messages yet'}
                      </span>
                      {c.unread ? <span className="cv-unread">{c.unread}</span> : null}
                    </div>
                    <div className="row gap-1" style={{ marginTop: 2 }}>
                      {c.pinned && <Icon name="target" size={12} style={{ color: 'var(--accent)' }} />}
                      <span className="clip t-xs muted">{c.company}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---------------- CENTER: thread ---------------- */}
        <Card pad={false} className="cv-col cv-thread">
          {!conv ? (
            <EmptyState icon="💬" title="Pick a conversation" body="Select someone on the left to see every channel in one thread." />
          ) : (
            <>
              <div className="cv-threadhead">
                {narrow && (
                  <button className="btn btn-quiet btn-sm" onClick={() => setPane('list')} aria-label="Back to list" style={{ padding: '.35rem' }}>
                    <Icon name="arrowLeft" size={18} />
                  </button>
                )}
                <Avatar name={conv.contactName} size={40} />
                <div className="col" style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <div className="row gap-1" style={{ minWidth: 0 }}>
                    <span className="clip fw-7" style={{ fontSize: '1.05rem' }}>{conv.contactName}</span>
                    {conv.pinned && <Badge tone="accent" className="t-xs">Pinned</Badge>}
                  </div>
                  <span className="clip t-sm muted">{conv.title ? conv.title + ' at ' : ''}{conv.company}</span>
                </div>
                <div className="row gap-1" style={{ flex: 'none' }}>
                  {conv.channels.map(ch => <ChannelDot key={ch} channel={ch} size={26} />)}
                </div>
                <div className="row gap-1" style={{ flex: 'none' }}>
                  <button className="btn btn-quiet btn-sm desktop-only" onClick={askRook} title="Ask Rook about this thread" style={{ padding: '.4rem' }}>
                    <Icon name="sparkles" size={17} />
                  </button>
                  <button className="btn btn-quiet btn-sm" onClick={() => { const r = togglePin(conv.id); toast(r.pinned ? 'Pinned' : 'Unpinned'); }} title={conv.pinned ? 'Unpin' : 'Pin'} style={{ padding: '.4rem' }}>
                    <Icon name={conv.pinned ? 'check' : 'target'} size={17} />
                  </button>
                </div>
              </div>

              <div className="cv-msgs" ref={scrollRef}>
                {(conv.messages || []).map((m, i) => <Bubble key={m.id || i} m={m} name={conv.contactName} />)}
              </div>

              <div className="cv-composer">
                <div className="row between wrap" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="row gap-1 wrap" style={{ minWidth: 0 }}>
                    <span className="t-xs muted fw-6" style={{ alignSelf: 'center' }}>Reply on</span>
                    {conv.channels.map(ch => {
                      const m = channelMeta(ch); const on = replyChan === ch;
                      return (
                        <button key={ch} className={`cv-replych${on ? ' is-on' : ''}`} onClick={() => setReplyChan(ch)}
                          style={on ? { color: m.color, borderColor: m.color, background: `color-mix(in srgb, ${m.color} 10%, transparent)` } : undefined}>
                          <span style={{ color: m.color }}><ChannelGlyph channel={ch} size={13} /></span> {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <button className="cv-draftbtn" onClick={doDraft}>
                    <Icon name="sparkles" size={15} /> Rook draft
                  </button>
                </div>
                <Textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder={`Message ${conv.contactName} via ${channelMeta(replyChan).label}...`}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doSend(); }} />
                <div className="row between wrap" style={{ gap: 8, marginTop: 8 }}>
                  <div className="row gap-1 wrap" style={{ minWidth: 0 }}>
                    {QUICK_REPLIES.map(qr => (
                      <button key={qr.id} className="cv-quick" onClick={() => setDraft(qr.body)} title={qr.body}>{qr.label}</button>
                    ))}
                  </div>
                  <div className="row gap-1" style={{ flex: 'none' }}>
                    <span className="t-xs muted desktop-only" style={{ alignSelf: 'center' }}>Ctrl+Enter</span>
                    <Button variant="primary" size="sm" onClick={doSend} disabled={!draft.trim()}>
                      <Icon name="send" size={15} /> Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ---------------- RIGHT: context ---------------- */}
        <div className="cv-col cv-context">
          {conv && <ContextPanel conv={conv} me={me} nav={nav} toast={toast} onMissedCall={doMissedCall} />}
        </div>
      </div>

      <ConvStyles />
    </div>
  );
}

/* ---------- a single message bubble (channel-aware) ---------- */
function Bubble({ m, name }) {
  const out = m.dir === 'out';
  const meta = channelMeta(m.channel);
  if (m.kind === 'voice') {
    const missed = m.outcome === 'missed';
    return (
      <div className="cv-callcard">
        <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', color: missed ? 'var(--risk)' : '#1a7f52', background: missed ? 'var(--risk-bg)' : 'var(--ok-bg)' }}>
          <ChannelGlyph channel="call" size={17} />
        </span>
        <div className="col" style={{ minWidth: 0, flex: 1, gap: 2 }}>
          <div className="row gap-1">
            <span className="fw-7 t-sm">{missed ? 'Missed call' : 'Call'}</span>
            {m.duration && <Badge className="t-xs">{m.duration}</Badge>}
            <span className="t-xs muted">{timeStr(m.at)}</span>
          </div>
          <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{m.body}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`cv-row ${out ? 'out' : 'in'}`}>
      {!out && <Avatar name={name} size={28} />}
      <div className="col" style={{ maxWidth: '76%', alignItems: out ? 'flex-end' : 'flex-start', gap: 4 }}>
        <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
          <ChannelChip channel={m.channel} />
          {m.auto && <Badge tone="accent" className="t-xs" style={{ gap: 4 }}><Icon name="zap" size={11} /> {m.autoLabel || 'Automated'}</Badge>}
          <span className="t-xs muted">{timeStr(m.at)}</span>
        </div>
        <div className="cv-bubble" style={out
          ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: 5 }
          : { background: 'var(--paper)', border: '1px solid var(--line)', borderBottomLeftRadius: 5 }}>
          {m.subject && <div className="fw-7 t-sm" style={{ marginBottom: 4, opacity: out ? .95 : 1, color: out ? '#fff' : 'var(--ink)' }}>{m.subject}</div>}
          <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- right context panel ---------- */
function ContextPanel({ conv, me, nav, toast, onMissedCall }) {
  const users = getUsers();
  return (
    <div className="col gap-3">
      <Card>
        <div className="col center gap-1" style={{ textAlign: 'center' }}>
          <Avatar name={conv.contactName} size={56} />
          <div className="fw-7" style={{ fontSize: '1.08rem', marginTop: 6 }}>{conv.contactName}</div>
          <div className="t-sm muted">{conv.title}</div>
          <div className="t-sm muted">{conv.company}</div>
        </div>
        <div className="col gap-1" style={{ marginTop: 14 }}>
          {conv.channels.map(ch => (
            <div key={ch} className="row between" style={{ padding: '.4rem .1rem', borderTop: '1px solid var(--line)' }}>
              <span className="row gap-1"><ChannelDot channel={ch} size={22} /> <span className="t-sm fw-6">{channelMeta(ch).label}</span></span>
              <span className="t-xs muted clip" style={{ maxWidth: 140, textAlign: 'right' }}>{handleFor(conv, ch)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Field label="Assigned to">
          <Select value={conv.assignedTo || ''} onChange={e => { assignConversation(conv.id, e.target.value || null); toast(e.target.value ? `Assigned to ${userName(e.target.value)}` : 'Unassigned'); }}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.id === me?.id ? ' (me)' : ''}</option>)}
          </Select>
        </Field>
        {(conv.tags && conv.tags.length > 0) && (
          <div className="row gap-1 wrap" style={{ marginTop: 12 }}>
            {conv.tags.map(t => <Badge key={t} tone="default">{t}</Badge>)}
          </div>
        )}
      </Card>

      {conv.deal && (
        <Card hover>
          <div className="stat-label" style={{ marginBottom: 6 }}>Linked deal</div>
          <div className="fw-7">{conv.deal.name}</div>
          <div className="row between" style={{ marginTop: 8 }}>
            <span className="stat-value" style={{ fontSize: '1.7rem' }}>{moneyK(conv.deal.value)}</span>
            <Badge tone="info">{conv.deal.stage}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => nav(conv.dealId ? `/deals/${conv.dealId}` : '/deals')} style={{ width: '100%', marginTop: 12 }}>
            Open in pipeline <Icon name="chevronRight" size={15} />
          </Button>
        </Card>
      )}

      {/* Missed-call text-back automation - the lead-recovery machine */}
      <Card style={{ borderColor: 'var(--accent-300)' }}>
        <div className="row gap-1" style={{ marginBottom: 6 }}>
          <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', color: 'var(--accent-600)', background: 'var(--accent-50)' }}><Icon name="zap" size={16} /></span>
          <div className="col" style={{ lineHeight: 1.15 }}>
            <span className="fw-7 t-sm">{MISSED_CALL_RECIPE.name}</span>
            <span className="t-xs muted">Automation - live</span>
          </div>
          <span className="spacer" />
          <Badge tone="ok" className="t-xs">On</Badge>
        </div>
        <div className="t-sm" style={{ color: 'var(--ink-2)' }}>
          {MISSED_CALL_RECIPE.trigger}, {MISSED_CALL_RECIPE.action.toLowerCase()} ({MISSED_CALL_RECIPE.windowLabel}).
        </div>
        <div className="row gap-2" style={{ marginTop: 10, alignItems: 'baseline' }}>
          <span className="stat-value" style={{ fontSize: '1.9rem', color: 'var(--accent-600)' }}>{MISSED_CALL_RECIPE.recoveryRate}%</span>
          <span className="t-xs muted">of missed callers reply to the auto text</span>
        </div>
        <Button variant="primary" size="sm" onClick={onMissedCall} style={{ width: '100%', marginTop: 10 }}>
          <Icon name="phone" size={15} /> Simulate a missed call
        </Button>
        <div className="t-xs muted" style={{ marginTop: 6, textAlign: 'center' }}>Adds a missed call and fires the recovery text into this thread.</div>
      </Card>

      {(conv.activity && conv.activity.length > 0) && (
        <Card>
          <div className="stat-label" style={{ marginBottom: 10 }}>Recent activity</div>
          <div className="col gap-2">
            {conv.activity.slice(0, 5).map((a, i) => (
              <div key={i} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span className="dot" style={{ background: 'var(--accent)', marginTop: 7 }} />
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="t-sm">{a.label}</span>
                  <span className="t-xs muted">{relTime(a.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */
function snippet(m) {
  if (!m) return '';
  if (m.kind === 'voice') return m.outcome === 'missed' ? 'Missed call' : 'Call - ' + (m.duration || '');
  const s = (m.subject ? m.subject + ' - ' : '') + (m.body || '');
  return s.length > 64 ? s.slice(0, 63) + '...' : s;
}
function handleFor(conv, ch) {
  const kind = channelMeta(ch).handleKind;
  if (kind === 'email') return conv.handle.includes('@') && !conv.handle.startsWith('@') ? conv.handle : `${conv.contactName.split(' ')[0].toLowerCase()}@${(conv.company || 'company').toLowerCase().replace(/[^a-z]/g, '')}.com`;
  if (kind === 'handle') return conv.igHandle || conv.handle;
  return conv.handle;
}

/* ---------- scoped layout styles (new file only; index.css untouched) ---------- */
function ConvStyles() {
  return (
    <style>{`
    .cv-shell { display: grid; grid-template-columns: 340px minmax(0, 1fr) 320px; gap: 1rem; height: calc(100vh - 300px); min-height: 520px; }
    .cv-col { min-height: 0; }
    .cv-list, .cv-thread { display: flex; flex-direction: column; overflow: hidden; }
    .cv-context { overflow-y: auto; padding-right: 2px; }

    .cv-listhead { padding: .85rem .85rem .7rem; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: .55rem; flex: none; }
    .cv-search { display: flex; align-items: center; gap: .5rem; background: var(--page); border: 1px solid var(--line-strong); border-radius: var(--r-sm); padding: .5rem .7rem; color: var(--n-600); }
    .cv-search input { flex: 1; border: none; background: transparent; outline: none; font-size: .95rem; color: var(--ink); }
    .cv-chanfilter { display: inline-flex; align-items: center; gap: 5px; font-size: .74rem; font-weight: 700; font-family: inherit; color: var(--n-600); background: var(--paper); border: 1px solid var(--line); border-radius: 999px; padding: .28rem .55rem; cursor: pointer; transition: border-color .12s, color .12s; }
    .cv-chanfilter:hover { border-color: var(--n-400); color: var(--ink); }
    .cv-chanfilter.is-on { color: var(--accent-600); border-color: var(--accent); }
    .cv-cf-count { font-variant-numeric: tabular-nums; opacity: .8; }

    .cv-listscroll { flex: 1; overflow-y: auto; }
    .cv-item { display: flex; gap: .7rem; align-items: flex-start; width: 100%; text-align: left; font-family: inherit; color: var(--ink);
      background: transparent; border: none; border-bottom: 1px solid var(--n-50); border-left: 3px solid transparent; padding: .8rem .85rem; cursor: pointer; transition: background .1s; }
    .cv-item:hover { background: var(--n-25); }
    .cv-item.is-on { background: var(--accent-50); border-left-color: var(--accent); }
    .cv-item__ch { position: absolute; right: -3px; bottom: -3px; width: 18px; height: 18px; border-radius: 6px; display: grid; place-items: center; box-shadow: var(--shadow-sm); }
    .cv-unread { flex: none; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; background: var(--accent); color: #fff; font-size: .7rem; font-weight: 800; display: grid; place-items: center; font-variant-numeric: tabular-nums; }

    .cv-threadhead { display: flex; align-items: center; gap: .7rem; padding: .8rem .95rem; border-bottom: 1px solid var(--line); flex: none; }
    .cv-msgs { flex: 1; overflow-y: auto; padding: 1.1rem .95rem; display: flex; flex-direction: column; gap: 1rem; background: var(--page); }
    .cv-row { display: flex; gap: .55rem; align-items: flex-start; }
    .cv-row.out { flex-direction: row-reverse; }
    .cv-bubble { font-size: .96rem; line-height: 1.5; padding: .6rem .85rem; border-radius: 14px; box-shadow: var(--shadow-sm); }
    .cv-callcard { display: flex; gap: .7rem; align-items: center; align-self: center; width: 100%; max-width: 460px; background: var(--paper); border: 1px dashed var(--line-strong); border-radius: var(--r-md); padding: .7rem .85rem; }

    .cv-composer { border-top: 1px solid var(--line); padding: .85rem .95rem 1rem; background: var(--paper); flex: none; }
    .cv-replych { display: inline-flex; align-items: center; gap: 5px; font-size: .78rem; font-weight: 700; font-family: inherit; color: var(--n-600); background: var(--paper); border: 1px solid var(--line); border-radius: 999px; padding: .3rem .6rem; cursor: pointer; transition: border-color .12s, color .12s; }
    .cv-replych:hover { border-color: var(--n-400); color: var(--ink); }
    .cv-draftbtn { display: inline-flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 700; font-family: inherit; color: var(--accent-600); background: var(--accent-50); border: 1px solid var(--accent-300); border-radius: 999px; padding: .34rem .7rem; cursor: pointer; flex: none; transition: filter .14s, transform .14s; }
    .cv-draftbtn:hover { filter: brightness(.97); transform: translateY(-1px); }
    .cv-quick { font-size: .78rem; font-weight: 600; font-family: inherit; color: var(--n-600); background: var(--n-50); border: 1px solid var(--line); border-radius: 999px; padding: .3rem .65rem; cursor: pointer; transition: border-color .12s, color .12s; }
    .cv-quick:hover { border-color: var(--accent); color: var(--accent-600); }

    @media (max-width: 1160px) {
      .cv-shell { grid-template-columns: 320px minmax(0, 1fr); }
      .cv-context { display: none; }
    }
    @media (max-width: 820px) {
      .cv-shell { grid-template-columns: 1fr; height: calc(100vh - 210px); }
      .cv-shell[data-pane="list"] .cv-thread { display: none; }
      .cv-shell[data-pane="thread"] .cv-list { display: none; }
    }
    `}</style>
  );
}
