// Unified conversations inbox - a single queue for every email + chat thread
// tied to a real contact, built to beat the HubSpot inbox. Classic two-pane
// layout (thread list + transcript) that collapses to one pane on narrow
// screens. Replies persist, mark the thread read, and log a CRM activity so
// the conversation shows up on the contact timeline. All reads flow through a
// subscription so a reply re-renders the whole surface instantly.
import React, { useEffect, useMemo, useState } from 'react';
import {
  getThreads, getThread, inboxStats, subscribeInbox,
  markRead, sendReply, suggestReply,
} from '../lib/inbox-data.js';
import { createActivity } from '../lib/store.js';
import {
  SectionHeader, StatCard, Segmented, Badge, Avatar, Card, Button,
  Textarea, EmptyState, useToast, relTime, timeStr, shortDate,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const CHANNEL_ICON = { email: 'inbox', chat: 'activity' };
const FILTERS = ['All', 'Email', 'Chat', 'Unread'];

/* group a transcript's messages by calendar day for date separators */
function dayKey(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Inbox() {
  const toast = useToast();
  const [, force] = useState(0);
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');

  // Re-render on any inbox commit (reply / mark read).
  useEffect(() => subscribeInbox(() => force(n => n + 1)), []);

  const threads = getThreads();
  const stats = inboxStats();

  const filtered = useMemo(() => {
    if (filter === 'Email') return threads.filter(t => t.channel === 'email');
    if (filter === 'Chat') return threads.filter(t => t.channel === 'chat');
    if (filter === 'Unread') return threads.filter(t => t.unread);
    return threads;
  }, [threads, filter]);

  // Default the selection to the first thread once data is present.
  useEffect(() => {
    if (!selectedId && threads.length) setSelectedId(threads[0].id);
  }, [threads, selectedId]);

  const selected = selectedId ? getThread(selectedId) : null;

  const openThread = (id) => {
    setSelectedId(id);
    setDraft('');
    markRead(id);
  };

  const backToList = () => setSelectedId(null);

  const send = () => {
    if (!selected || !draft.trim()) return;
    const subject = selected.channel === 'email' ? selected.subject : `Chat with ${selected.contactName}`;
    sendReply(selected.id, draft);
    // Log to the CRM timeline so the reply lives on the contact record.
    createActivity({
      type: 'email',
      subject: `Replied: ${subject}`,
      body: draft.trim(),
      done: true,
      relatedType: 'contact',
      relatedId: selected.contactId,
    });
    setDraft('');
    toast(`Reply sent to ${selected.contactFirst}`);
  };

  const aiSuggest = () => {
    if (!selected) return;
    setDraft(suggestReply(selected));
    toast('AI drafted a reply - review and send', 'warn');
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
  };

  return (
    <div className="col gap-3">
      <SectionHeader
        title="Conversations"
        sub="Every email and chat with your accounts, in one unified inbox."
        eyebrow="Inbox"
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        <StatCard label="Unread" value={stats.unread} icon={<Icon name="bell" size={18} />}
          accent="var(--accent)" spark={[2, 4, 3, 5, 4, 6, stats.unread]} sub="new messages" />
        <StatCard label="Awaiting reply" value={stats.awaiting} icon={<Icon name="clock" size={18} />}
          accent="var(--warn)" sparkColor="var(--warn)" spark={[3, 2, 4, 3, 5, 4, stats.awaiting]} sub="need your response" />
        <StatCard label="Avg first response" value={stats.avgFirstResponseMins} format={(n) => `${Math.round(n)}m`}
          icon={<Icon name="zap" size={18} />} accent="var(--ok)" sparkColor="var(--ok)"
          spark={[68, 61, 55, 49, 47, 44, stats.avgFirstResponseMins]} sub="last 30 days" />
        <StatCard label="Resolved today" value={stats.resolvedToday} icon={<Icon name="check" size={18} />}
          accent="var(--ok)" sparkColor="var(--ok)" spark={[2, 3, 4, 3, 5, 5, stats.resolvedToday]} sub="closed out" />
      </div>

      <div className="row between wrap" style={{ gap: '.75rem', alignItems: 'center' }}>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        <span className="t-sm muted">{filtered.length} conversation{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* Two-pane. flex-wrap collapses to one column when narrow; on mobile the
          list hides once a thread is selected so it reads as a single pane. */}
      <div className="row" style={{ gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* LEFT: thread list */}
        <Card pad={false}
          className={selected ? 'inbox-list-collapsible' : ''}
          style={{ flex: '1 1 340px', minWidth: 300, maxWidth: 460, alignSelf: 'flex-start', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <EmptyState icon="📭" title="No conversations" body="Nothing matches this filter yet." />
          ) : (
            <div className="col" role="list">
              {filtered.map((t, i) => {
                const active = t.id === selectedId;
                return (
                  <button key={t.id} role="listitem" onClick={() => openThread(t.id)}
                    style={{
                      display: 'flex', gap: '.7rem', alignItems: 'flex-start', textAlign: 'left',
                      padding: '.85rem 1rem', border: 'none', cursor: 'pointer', width: '100%',
                      background: active ? 'var(--accent-50, rgba(91,75,245,.08))' : 'transparent',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                      borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--line)',
                    }}>
                    <div style={{ position: 'relative', flex: 'none' }}>
                      <Avatar name={t.contactName} size={40} />
                      {t.unread && <span className="dot" style={{ position: 'absolute', top: -2, right: -2, width: 11, height: 11, background: 'var(--accent)', border: '2px solid var(--paper)' }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row between" style={{ gap: '.5rem' }}>
                        <span className="clip" style={{ fontWeight: t.unread ? 800 : 700, minWidth: 0 }}>{t.contactName}</span>
                        <span className="t-xs muted" style={{ flex: 'none' }}>{relTime(t.lastAt)}</span>
                      </div>
                      <div className="row" style={{ gap: '.4rem', alignItems: 'center' }}>
                        <Icon name={CHANNEL_ICON[t.channel]} size={12} />
                        <span className="t-xs muted clip" style={{ minWidth: 0 }}>{t.companyName || t.channel}</span>
                      </div>
                      <div className="t-sm clip" style={{ marginTop: 2, color: t.unread ? 'var(--ink)' : 'var(--n-600)', fontWeight: t.unread ? 600 : 400 }}>
                        {t.snippet}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* RIGHT: transcript + composer */}
        <Card pad={false}
          className={selected ? '' : 'inbox-detail-collapsible'}
          style={{ flex: '2 1 460px', minWidth: 300, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
          {!selected ? (
            <EmptyState icon="💬" title="Select a conversation" body="Choose a thread on the left to read the full transcript and reply." />
          ) : (
            <Transcript
              key={selected.id}
              thread={selected}
              draft={draft}
              setDraft={setDraft}
              onSend={send}
              onSuggest={aiSuggest}
              onKeyDown={onKeyDown}
              onBack={backToList}
            />
          )}
        </Card>
      </div>

      {/* Local responsive rules scoped to this page (single class hooks, no
          global css edits). Under 720px we show one pane at a time. */}
      <style>{`
        @media (max-width: 720px) {
          .inbox-list-collapsible { display: none !important; }
          .inbox-detail-collapsible { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- transcript pane ---------- */
function Transcript({ thread, draft, setDraft, onSend, onSuggest, onKeyDown, onBack }) {
  // Auto-scroll to the newest bubble whenever the thread or its length changes.
  const endRef = React.useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.id, thread.messages.length]);

  const groups = useMemo(() => {
    const out = [];
    let currentKey = null;
    for (const m of thread.messages) {
      const k = dayKey(m.at);
      if (k !== currentKey) { out.push({ day: k, items: [] }); currentKey = k; }
      out[out.length - 1].items.push(m);
    }
    return out;
  }, [thread.id, thread.messages.length]);

  return (
    <>
      {/* header */}
      <div className="row between" style={{ gap: '.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
        <div className="row" style={{ gap: '.75rem', alignItems: 'center', minWidth: 0 }}>
          <button className="btn btn-quiet btn-sm inbox-back" onClick={onBack} aria-label="Back to list" style={{ flex: 'none' }}>
            <Icon name="x" size={14} />
          </button>
          <Avatar name={thread.contactName} size={40} />
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
              <span className="fw-7 clip" style={{ minWidth: 0 }}>{thread.contactName}</span>
              <Badge tone={thread.channel === 'email' ? 'info' : 'accent'}>{thread.channel}</Badge>
            </div>
            <div className="t-xs muted clip">{thread.contact?.title ? `${thread.contact.title} - ` : ''}{thread.companyName}</div>
          </div>
        </div>
        <div className="t-xs muted" style={{ flex: 'none' }} title="subject">{thread.channel === 'email' ? thread.subject : ''}</div>
      </div>

      {/* transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem', background: 'var(--n-50, rgba(0,0,0,.015))' }}>
        {groups.map((g) => (
          <React.Fragment key={g.day}>
            <div className="row center" style={{ margin: '.4rem 0' }}>
              <span className="t-xs muted" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 999, padding: '.15rem .6rem' }}>{g.day}</span>
            </div>
            {g.items.map((m) => <Bubble key={m.id} msg={m} name={thread.contactName} />)}
          </React.Fragment>
        ))}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="col gap-2" style={{ padding: '.9rem 1.25rem', borderTop: '1px solid var(--line)' }}>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder={`Reply to ${thread.contactFirst}...  (Cmd/Ctrl + Enter to send)`}
        />
        <div className="row between wrap" style={{ gap: '.5rem' }}>
          <Button variant="ghost" size="sm" onClick={onSuggest}>
            <Icon name="zap" size={14} /> AI suggest reply
          </Button>
          <Button variant="accent" size="sm" onClick={onSend} disabled={!draft.trim()}>
            <Icon name="rocket" size={14} /> Send
          </Button>
        </div>
      </div>
    </>
  );
}

/* ---------- one message bubble ---------- */
function Bubble({ msg, name }) {
  const mine = msg.from === 'me';
  return (
    <div className="row" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', gap: '.55rem', maxWidth: '76%', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
        {!mine && <Avatar name={name} size={28} />}
        <div className="col gap-1" style={{ alignItems: mine ? 'flex-end' : 'flex-start', minWidth: 0 }}>
          <div style={{
            padding: '.65rem .9rem', borderRadius: 14,
            borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
            background: mine ? 'var(--accent)' : 'var(--paper)',
            color: mine ? '#fff' : 'var(--ink)',
            border: mine ? 'none' : '1px solid var(--line)',
            boxShadow: 'var(--shadow-sm)', lineHeight: 1.5, wordBreak: 'break-word',
          }}>
            {msg.body}
          </div>
          <span className="t-xs muted">{shortDate(msg.at)} {timeStr(msg.at)}</span>
        </div>
      </div>
    </div>
  );
}
