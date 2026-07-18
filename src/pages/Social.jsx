// Social planner. One surface to run every channel: a content calendar of
// scheduled posts across Facebook, Instagram, LinkedIn, X, Google Business and
// TikTok; a write-once composer with per-network customization, Rook caption +
// hashtag drafting, media placeholder and live per-network preview cards; a
// scheduling queue plus an evergreen recycling queue; and per-channel analytics
// with a best-time heatmap. Local-first with seeded content, zero backend.
//
// Positioning baked into the copy: owners juggle five tabs to post everywhere.
// Ardovo runs all six from one planner, with AI captions and real previews.
//
// ADDITIVE: new file only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Card, Badge, StatCard, SectionHeader, PageTitle, Field, Input,
  Select, Textarea, Modal, EmptyState, Segmented, Tabs, Sparkline, MiniBars,
  ProgressBar, Trend, GradientText, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  NETWORKS, networkById, STATUSES, HEAT_DAYS, HEAT_SLOTS, CAPTION_TONES,
  useSocial, getPosts, getPost, getAnalytics, getHeat, textForNetwork,
  scheduledPosts, evergreenPosts, draftPosts, postsOnDay, socialStats,
  channelRows, bestSlot, rookCaption, hashtagIdeas,
  createPost, updatePost, deletePost, duplicatePost, publishNow,
  toggleEvergreen, recyclePost,
} from '../lib/social-data.js';

/* ---------- small formatters (ASCII only) ---------- */
const nf = (n) => (n == null ? '0' : Number(n).toLocaleString());
const kfmt = (n) => {
  const a = Math.abs(Number(n) || 0);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(Math.round(n || 0));
};
const timeStr = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayMonth = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const SAME_DAY = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ---------- network glyph chip ---------- */
function NetChip({ id, size = 26, title }) {
  const n = networkById(id);
  if (!n) return null;
  return (
    <span title={title || n.label} aria-label={n.label} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: n.color, color: '#fff', fontWeight: 800,
      fontSize: size * (n.glyph.length > 1 ? 0.38 : 0.5), letterSpacing: '.01em', flex: 'none',
    }}>{n.glyph}</span>
  );
}

function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/* ---------- one network's preview card ---------- */
function PreviewCard({ networkId, text, media, hashtags = [] }) {
  const n = networkById(networkId);
  if (!n) return null;
  const body = text || '';
  const over = body.length > n.limit;
  const remaining = n.limit - body.length;
  const showTags = hashtags.length > 0;
  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div className="row gap-2" style={{ padding: '.7rem .85rem', borderBottom: '1px solid var(--line)' }}>
        <NetChip id={networkId} size={34} />
        <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
          <span className="fw-7" style={{ fontSize: '.95rem' }}>Ardovo</span>
          <span className="t-xs muted">@ardovo.com  |  {n.kind}</span>
        </div>
      </div>
      {/* body */}
      <div style={{ padding: '.85rem', display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1 }}>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '.96rem', lineHeight: 1.5 }}>
          {body || <span className="muted">Your caption preview will appear here.</span>}
          {showTags && <span style={{ color: 'var(--accent-600)', fontWeight: 600 }}>{'\n' + hashtags.join(' ')}</span>}
        </div>
        {media && (
          <div className="center" style={{
            height: 128, borderRadius: 'var(--r-sm)', border: '1px dashed var(--line-strong)',
            background: 'var(--n-50)', color: 'var(--n-400)', gap: '.4rem', flexDirection: 'column',
          }}>
            <Icon name={media === 'video' ? 'eye' : 'copy'} size={22} />
            <span className="t-xs fw-6">{media === 'video' ? 'Video' : 'Image'} placeholder</span>
          </div>
        )}
      </div>
      {/* footer */}
      <div className="row between" style={{ padding: '.55rem .85rem', borderTop: '1px solid var(--line)' }}>
        <span className="row gap-2 muted t-xs">
          <span className="row gap-1"><Icon name="activity" size={13} /> Like</span>
          <span className="row gap-1"><Icon name="mail" size={13} /> Comment</span>
          <span className="row gap-1"><Icon name="send" size={13} /> Share</span>
        </span>
        <span className="t-xs mono" style={{ color: over ? 'var(--risk)' : 'var(--n-600)' }}>
          {over ? `${Math.abs(remaining)} over` : `${nf(remaining)} left`}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   COMPOSER
   ============================================================ */
const emptyDraft = () => ({
  id: null, topic: '', content: '', tone: 'friendly',
  networks: ['linkedin', 'x'], overrides: {}, media: null,
  date: '', time: '09:00', evergreen: false, customize: false,
  activeNet: 'linkedin', hashtags: [],
});

function Composer({ draft, setDraft, onSaved }) {
  const toast = useToast();
  const nav = useNavigate();
  const selected = draft.networks;
  const toggleNet = (id) => setDraft(d => {
    const on = d.networks.includes(id);
    const networks = on ? d.networks.filter(x => x !== id) : [...d.networks, id];
    const activeNet = networks.includes(d.activeNet) ? d.activeNet : networks[0] || 'linkedin';
    return { ...d, networks, activeNet };
  });

  const askRook = () => {
    const r = rookCaption({ topic: draft.topic || draft.content.slice(0, 40), tone: draft.tone, network: draft.activeNet });
    setDraft(d => ({ ...d, content: r.caption, hashtags: r.hashtags }));
    toast('Rook drafted a caption');
  };
  const addHashtag = (h) => setDraft(d => d.hashtags.includes(h) ? d : ({ ...d, hashtags: [...d.hashtags, h] }));
  const removeHashtag = (h) => setDraft(d => ({ ...d, hashtags: d.hashtags.filter(x => x !== h) }));

  const composedText = (net) => {
    // Match the data layer's textForNetwork: an empty/whitespace override falls
    // back to the shared content (the hint promises "leave blank to use the
    // shared text"), so the live preview never disagrees with what gets saved.
    const o = draft.overrides[net];
    return draft.customize && o && o.trim() ? o : draft.content;
  };

  const buildScheduledAt = () => {
    if (!draft.date) return null;
    const [h, m] = (draft.time || '09:00').split(':').map(Number);
    const d = new Date(draft.date + 'T00:00:00');
    d.setHours(h || 9, m || 0, 0, 0);
    return d.toISOString();
  };

  const persist = (status) => {
    // fold hashtags into the content once so they ride along to every network
    let content = draft.content.trim();
    if (draft.hashtags.length && !content.includes(draft.hashtags[0])) {
      content = `${content}\n\n${draft.hashtags.join(' ')}`.trim();
    }
    const payload = {
      topic: draft.topic, content, tone: draft.tone,
      networks: draft.networks, overrides: draft.customize ? draft.overrides : {},
      media: draft.media, evergreen: draft.evergreen,
      scheduledAt: status === 'scheduled' ? buildScheduledAt() : (draft.date ? buildScheduledAt() : null),
      status,
    };
    let r;
    if (draft.id) {
      r = updatePost(draft.id, { ...payload, scheduledAt: payload.scheduledAt || getPost(draft.id)?.scheduledAt });
      if (!r.error) toast(status === 'scheduled' ? 'Post rescheduled' : 'Draft updated');
    } else {
      r = createPost(payload);
      if (!r.error) toast(status === 'scheduled' ? 'Post scheduled across ' + draft.networks.length + ' networks' : 'Draft saved');
    }
    if (r.error) return toast(r.message, 'risk');
    onSaved && onSaved(r.post);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', alignItems: 'start' }}>
      {/* left: authoring */}
      <div className="col gap-3">
        <Card>
          <div className="col gap-3">
            <div className="row between wrap gap-2">
              <div className="col gap-1">
                <div className="eyebrow">Compose</div>
                <h3 style={{ margin: 0 }}>Write once, post everywhere</h3>
              </div>
              {draft.id && <Badge tone="accent">Editing existing post</Badge>}
            </div>

            {/* network picker */}
            <Field label="Publish to">
              <div className="row wrap gap-1">
                {NETWORKS.map(n => {
                  const on = selected.includes(n.id);
                  return (
                    <button key={n.id} type="button" onClick={() => toggleNet(n.id)} aria-pressed={on}
                      className="row gap-1"
                      style={{
                        cursor: 'pointer', border: on ? `1.5px solid ${n.color}` : '1.5px solid var(--line-strong)',
                        background: on ? 'var(--n-50)' : 'var(--paper)', color: 'var(--ink)',
                        borderRadius: 'var(--r-pill)', padding: '.32rem .7rem .32rem .35rem', fontWeight: 600,
                        opacity: on ? 1 : 0.7, transition: 'all .15s var(--ease)', fontSize: '.9rem',
                      }}>
                      <NetChip id={n.id} size={22} /> {n.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* body */}
            <Field label="Post content" hint={`${draft.content.length} characters`}>
              <Textarea rows={6} placeholder="Share an update, a win, or a question with your audience..."
                value={draft.content}
                onChange={e => setDraft(d => ({ ...d, content: e.target.value }))} />
            </Field>

            {/* hashtags */}
            {draft.hashtags.length > 0 && (
              <div className="row wrap gap-1">
                {draft.hashtags.map(h => (
                  <button key={h} type="button" onClick={() => removeHashtag(h)} className="badge badge-accent" style={{ cursor: 'pointer', border: 'none' }}>
                    {h} <Icon name="x" size={11} />
                  </button>
                ))}
              </div>
            )}

            {/* media + evergreen */}
            <div className="row between wrap gap-2">
              <div className="row gap-1">
                <span className="t-sm fw-6 muted">Media:</span>
                {['image', 'video'].map(m => (
                  <button key={m} type="button"
                    onClick={() => setDraft(d => ({ ...d, media: d.media === m ? null : m }))}
                    className={`btn btn-sm ${draft.media === m ? 'btn-primary' : 'btn-ghost'}`}>
                    <Icon name={m === 'video' ? 'eye' : 'copy'} size={14} /> {m === 'video' ? 'Video' : 'Image'}
                  </button>
                ))}
              </div>
              <label className="row gap-1" style={{ cursor: 'pointer', fontSize: '.92rem', fontWeight: 600 }}>
                <button type="button" className={`switch ${draft.evergreen ? 'on' : ''}`} onClick={() => setDraft(d => ({ ...d, evergreen: !d.evergreen }))} aria-pressed={draft.evergreen} aria-label="Evergreen" />
                Add to evergreen
              </label>
            </div>

            {/* per-network customization */}
            <div className="col gap-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              <label className="row gap-1" style={{ cursor: 'pointer', fontWeight: 600 }}>
                <button type="button" className={`switch ${draft.customize ? 'on' : ''}`} onClick={() => setDraft(d => ({ ...d, customize: !d.customize }))} aria-pressed={draft.customize} aria-label="Customize per network" />
                Customize text per network
              </label>
              {draft.customize && selected.length > 0 && (
                <div className="col gap-2">
                  <div className="row wrap gap-1">
                    {selected.map(id => (
                      <button key={id} type="button" onClick={() => setDraft(d => ({ ...d, activeNet: id }))}
                        className="btn btn-sm" style={{
                          background: draft.activeNet === id ? 'var(--n-100)' : 'transparent',
                          fontWeight: draft.activeNet === id ? 700 : 600,
                        }}>
                        <NetChip id={id} size={18} /> {networkById(id)?.label}
                      </button>
                    ))}
                  </div>
                  <Textarea rows={4}
                    placeholder={`Override for ${networkById(draft.activeNet)?.label || 'this network'} (leave blank to use the shared text)`}
                    value={draft.overrides[draft.activeNet] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, overrides: { ...d.overrides, [draft.activeNet]: e.target.value } }))} />
                </div>
              )}
            </div>

            {/* schedule */}
            <div className="row wrap gap-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem', alignItems: 'flex-end' }}>
              <Field label="Date"><Input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} /></Field>
              <Field label="Time"><Input type="time" value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} /></Field>
              <div className="spacer" />
              <div className="row gap-1">
                <Button variant="ghost" onClick={() => persist('draft')}>Save draft</Button>
                <Button variant="primary" onClick={() => persist('scheduled')} disabled={!draft.date}>
                  <Icon name="calendar" size={16} /> Schedule
                </Button>
              </div>
            </div>
            {!draft.date && <div className="t-xs muted">Pick a date to schedule, or save as a draft for later.</div>}
          </div>
        </Card>

        {/* Rook assist */}
        <Card style={{ background: 'linear-gradient(120deg, var(--accent-50), var(--paper) 70%)' }}>
          <div className="col gap-2">
            <div className="row gap-1">
              <Icon name="sparkles" size={18} style={{ color: 'var(--accent-600)' }} />
              <h4 style={{ margin: 0 }}>Ask Rook to write it</h4>
            </div>
            <div className="t-sm muted">Give Rook a topic and a tone. It drafts a caption tuned to the active network and suggests hashtags. You stay in control of the final word.</div>
            <div className="row wrap gap-2" style={{ alignItems: 'flex-end' }}>
              <Field label="Topic"><Input placeholder="Q3 growth webinar" value={draft.topic} onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))} /></Field>
              <Field label="Tone">
                <Select value={draft.tone} onChange={e => setDraft(d => ({ ...d, tone: e.target.value }))}>
                  {CAPTION_TONES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </Select>
              </Field>
              <Button variant="accent" onClick={askRook}><Icon name="sparkles" size={16} /> Draft with Rook</Button>
            </div>
            <div className="col gap-1">
              <span className="t-xs fw-6 muted" style={{ letterSpacing: '.04em' }}>SUGGESTED HASHTAGS</span>
              <div className="row wrap gap-1">
                {hashtagIdeas(draft.topic).map(h => (
                  <button key={h} type="button" onClick={() => addHashtag(h)} className="badge" style={{ cursor: 'pointer', border: '1px solid var(--line)' }}>
                    <Icon name="plus" size={11} /> {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="t-xs muted">Want a full campaign plan?  <Link to="/canvas" className="link">Open Rook in Canvas</Link></div>
          </div>
        </Card>
      </div>

      {/* right: live previews */}
      <div className="col gap-2" style={{ position: 'sticky', top: '1rem' }}>
        <SectionHeader title="Live preview" sub={selected.length ? `${selected.length} network${selected.length === 1 ? '' : 's'}` : 'Pick a network'} />
        {selected.length === 0 ? (
          <Card><EmptyState icon="📱" title="No networks selected" body="Choose where this goes and the preview cards render here." /></Card>
        ) : (
          <div className="col gap-2">
            {selected.map(id => (
              <PreviewCard key={id} networkId={id} text={composedText(id)} media={draft.media} hashtags={draft.hashtags} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CALENDAR
   ============================================================ */
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday-first
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function Calendar({ onNewOnDay, onOpenPost }) {
  const [calView, setCalView] = useState('month');
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const today = new Date();

  const shiftMonth = (n) => setCursor(c => { const d = new Date(c); d.setMonth(d.getMonth() + n); return d; });
  const shiftWeek = (n) => setCursor(c => { const d = new Date(c); d.setDate(d.getDate() + n * 7); return d; });

  // Month grid: 6 weeks from the Monday on/just before the 1st.
  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const weekCells = useMemo(() => {
    const start = startOfWeek(calView === 'week' ? cursor : new Date());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor, calView]);

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekLabel = (() => { const s = weekCells[0], e = weekCells[6]; return `${dayMonth(s)} - ${dayMonth(e)}`; })();

  const DayCell = ({ d, tall }) => {
    const inMonth = d.getMonth() === cursor.getMonth();
    const isToday = SAME_DAY(d, today);
    const posts = postsOnDay(d.toISOString());
    return (
      <div className="col" style={{
        minHeight: tall ? 200 : 104, padding: '.4rem', borderRadius: 'var(--r-sm)',
        border: '1px solid var(--line)', background: inMonth || tall ? 'var(--paper)' : 'var(--n-25)',
        opacity: inMonth || tall ? 1 : 0.55, gap: '.3rem', overflow: 'hidden',
      }}>
        <div className="row between">
          <span className="t-sm fw-7" style={{
            width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#fff' : 'var(--ink)',
          }}>{d.getDate()}</span>
          <button type="button" className="btn btn-quiet reveal" title="New post" onClick={() => onNewOnDay(d)}
            style={{ padding: '.1rem .3rem', lineHeight: 1 }}><Icon name="plus" size={14} /></button>
        </div>
        <div className="col gap-1" style={{ overflow: 'hidden' }}>
          {posts.slice(0, tall ? 12 : 3).map(p => (
            <button key={p.id} type="button" onClick={() => onOpenPost(p.id)}
              className="row gap-1" style={{
                cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--n-25)',
                borderRadius: 6, padding: '.2rem .35rem', textAlign: 'left', width: '100%',
                borderLeft: `3px solid ${p.status === 'published' ? 'var(--ok)' : p.status === 'scheduled' ? 'var(--info)' : 'var(--n-400)'}`,
              }}>
              <span style={{ display: 'inline-flex', gap: 2, flex: 'none' }}>
                {p.networks.slice(0, 3).map(id => <NetChip key={id} id={id} size={14} />)}
              </span>
              <span className="clip t-xs" style={{ flex: 1 }}>{timeStr(p.scheduledAt)} {p.topic}</span>
            </button>
          ))}
          {posts.length > (tall ? 12 : 3) && <span className="t-xs muted">+{posts.length - (tall ? 12 : 3)} more</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="col gap-3">
      <div className="row between wrap gap-2">
        <div className="row gap-1">
          <Button variant="ghost" size="sm" onClick={() => calView === 'month' ? shiftMonth(-1) : shiftWeek(-1)} aria-label="Previous"><Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /></Button>
          <h3 style={{ margin: 0, minWidth: 180, textAlign: 'center' }}>{calView === 'month' ? monthLabel : weekLabel}</h3>
          <Button variant="ghost" size="sm" onClick={() => calView === 'month' ? shiftMonth(1) : shiftWeek(1)} aria-label="Next"><Icon name="chevronRight" size={16} /></Button>
          <Button variant="quiet" size="sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(calView === 'week' ? new Date() : d); }}>Today</Button>
        </div>
        <Segmented options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} value={calView} onChange={setCalView} />
      </div>

      <Card pad={false} style={{ padding: '.75rem' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: '.4rem' }}>
          {HEAT_DAYS.map(d => <div key={d} className="t-xs fw-7 muted" style={{ textAlign: 'center', padding: '.25rem 0', letterSpacing: '.05em' }}>{d.toUpperCase()}</div>)}
          {(calView === 'month' ? monthCells : weekCells).map((d, i) => (
            <div className="row-host" key={i}><DayCell d={d} tall={calView === 'week'} /></div>
          ))}
        </div>
      </Card>
      <div className="row gap-3 wrap t-xs muted">
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--ok)' }} /> Published</span>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--info)' }} /> Scheduled</span>
        <span className="row gap-1"><span className="dot" style={{ background: 'var(--n-400)' }} /> Draft</span>
        <span className="spacer" />
        <span>Hover any day and click + to compose for that date.</span>
      </div>
    </div>
  );
}

/* ============================================================
   QUEUE
   ============================================================ */
function QueueRow({ post, onOpen, actions }) {
  return (
    <div className="row between gap-2 row-host" style={{ padding: '.75rem .25rem', borderBottom: '1px solid var(--n-50)' }}>
      <div className="row gap-2" style={{ minWidth: 0, flex: 1 }}>
        <div className="col center" style={{ width: 58, flex: 'none' }}>
          <span className="fw-8" style={{ fontSize: '1.15rem', lineHeight: 1 }}>{new Date(post.scheduledAt).getDate()}</span>
          <span className="t-xs muted">{new Date(post.scheduledAt).toLocaleDateString('en-US', { month: 'short' })}</span>
          <span className="t-xs mono muted">{timeStr(post.scheduledAt)}</span>
        </div>
        <button type="button" onClick={() => onOpen(post.id)} className="col gap-1" style={{ cursor: 'pointer', textAlign: 'left', minWidth: 0, background: 'transparent', border: 'none', flex: 1 }}>
          <span className="row gap-1 wrap">
            {post.networks.map(id => <NetChip key={id} id={id} size={18} />)}
            {post.evergreen && <Badge tone="accent"><Icon name="rotateCcw" size={11} /> Evergreen</Badge>}
          </span>
          <span className="clip fw-6">{post.topic || post.content.slice(0, 60)}</span>
          <span className="clip t-sm muted">{post.content}</span>
        </button>
      </div>
      <div className="row gap-1 reveal" style={{ flex: 'none' }}>{actions}</div>
    </div>
  );
}

function Queue({ onOpen, onEdit }) {
  const toast = useToast();
  const scheduled = scheduledPosts();
  const drafts = draftPosts();
  const evergreen = evergreenPosts();
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', alignItems: 'start' }}>
      <Card>
        <SectionHeader title="Scheduled queue" sub={`${scheduled.length} post${scheduled.length === 1 ? '' : 's'} lined up`} />
        {scheduled.length === 0 ? (
          <EmptyState icon="🗓" title="Nothing scheduled" body="Compose a post and pick a date to fill your queue." />
        ) : scheduled.map(p => (
          <QueueRow key={p.id} post={p} onOpen={onOpen} actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(p.id)}><Icon name="edit" size={14} /></Button>
              <Button variant="primary" size="sm" onClick={() => { publishNow(p.id); toast('Published now'); }}>Publish now</Button>
            </>
          } />
        ))}
        {drafts.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <SectionHeader title="Drafts" sub={`${drafts.length} waiting`} />
            {drafts.map(p => (
              <div key={p.id} className="row between gap-2 row-host" style={{ padding: '.6rem .25rem', borderBottom: '1px solid var(--n-50)' }}>
                <button type="button" onClick={() => onOpen(p.id)} className="row gap-2" style={{ cursor: 'pointer', minWidth: 0, flex: 1, background: 'transparent', border: 'none', textAlign: 'left' }}>
                  <span className="row gap-1" style={{ flex: 'none' }}>{p.networks.map(id => <NetChip key={id} id={id} size={16} />)}</span>
                  <span className="clip">{p.topic || p.content.slice(0, 50)}</span>
                </button>
                <Button variant="ghost" size="sm" className="reveal" onClick={() => onEdit(p.id)}>Edit</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Evergreen recycling" sub="Proven content, replayed" action={<Badge tone="accent">{evergreen.length}</Badge>} />
        <div className="t-sm muted" style={{ marginBottom: '.75rem' }}>Your best posts do not have to be one-and-done. Recycle an evergreen post to re-queue it for the next open slot, no rewrite required.</div>
        {evergreen.length === 0 ? (
          <EmptyState icon="♻" title="No evergreen posts yet" body="Toggle 'Add to evergreen' on any post to build your recycling library." />
        ) : evergreen.map(p => (
          <div key={p.id} className="col gap-1 row-host" style={{ padding: '.7rem 0', borderBottom: '1px solid var(--n-50)' }}>
            <div className="row between gap-1">
              <span className="row gap-1" style={{ minWidth: 0 }}>
                {p.networks.slice(0, 4).map(id => <NetChip key={id} id={id} size={16} />)}
                <span className="clip fw-6">{p.topic || p.content.slice(0, 40)}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { recyclePost(p.id); toast('Recycled to tomorrow 9am'); }}>
                <Icon name="rotateCcw" size={14} /> Recycle
              </Button>
            </div>
            <span className="clip t-sm muted">{p.content}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ============================================================
   ANALYTICS
   ============================================================ */
function heatColor(v) {
  // accent-tinted intensity ramp, readable in light + dark
  const a = Math.max(0.06, Math.min(0.92, v / 100));
  return `rgba(91, 75, 245, ${a.toFixed(2)})`;
}
function Analytics() {
  const rows = channelRows();
  const heat = getHeat();
  const best = bestSlot();
  const maxReach = Math.max(...rows.map(r => r.reach || 0), 1);
  return (
    <div className="col gap-3">
      {/* per-network cards */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {rows.map(r => (
          <Card key={r.network.id} hover>
            <div className="row between" style={{ marginBottom: '.6rem' }}>
              <span className="row gap-1"><NetChip id={r.network.id} size={26} /> <span className="fw-7">{r.network.label}</span></span>
              <Trend value={r.followerGrowth} />
            </div>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div className="col gap-1">
                <span className="stat-value" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.2rem)' }}>{kfmt(r.reach)}</span>
                <span className="stat-label">Reach (28d)</span>
              </div>
              <Sparkline data={r.spark} color={r.network.color} w={92} h={40} />
            </div>
            <div className="row between t-sm" style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px solid var(--line)' }}>
              <span className="muted">{nf(r.followers)} followers</span>
              <span className="fw-6">{r.engagementRate}% engaged</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
        {/* reach comparison */}
        <Card>
          <SectionHeader title="Reach by channel" sub="Where your audience actually is" />
          <div className="col gap-2">
            {rows.slice().sort((a, b) => (b.reach || 0) - (a.reach || 0)).map(r => (
              <div key={r.network.id} className="col gap-1">
                <div className="row between t-sm">
                  <span className="row gap-1"><NetChip id={r.network.id} size={18} /> {r.network.label}</span>
                  <span className="fw-6 mono">{kfmt(r.reach)}</span>
                </div>
                <ProgressBar value={(r.reach / maxReach) * 100} color={r.network.color} />
              </div>
            ))}
          </div>
        </Card>

        {/* best-time heatmap */}
        <Card>
          <SectionHeader title="Best time to post" sub="Engagement by day and daypart" action={<Icon name="sparkles" size={18} style={{ color: 'var(--accent-600)' }} />} />
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `44px repeat(${HEAT_SLOTS.length}, 1fr)`, gap: 4, minWidth: 320 }}>
              <span />
              {HEAT_SLOTS.map(s => <span key={s} className="t-xs fw-6 muted" style={{ textAlign: 'center' }}>{s}</span>)}
              {HEAT_DAYS.map((day, di) => (
                <React.Fragment key={day}>
                  <span className="t-xs fw-6 muted" style={{ display: 'flex', alignItems: 'center' }}>{day}</span>
                  {HEAT_SLOTS.map((slot, si) => {
                    const v = heat[di][si];
                    const isBest = di === best.day && si === best.slot;
                    return (
                      <div key={slot} title={`${day} ${slot}: ${v}`} style={{
                        height: 30, borderRadius: 6, background: heatColor(v),
                        border: isBest ? '2px solid var(--accent)' : '1px solid var(--line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: v > 55 ? '#fff' : 'var(--n-600)', fontWeight: 700, fontSize: '.68rem',
                      }}>{isBest ? '★' : ''}</div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="row gap-1" style={{ marginTop: '.9rem', padding: '.6rem .75rem', background: 'var(--accent-50)', borderRadius: 'var(--r-sm)' }}>
            <Icon name="sparkles" size={16} style={{ color: 'var(--accent-600)', flex: 'none' }} />
            <span className="t-sm"><span className="fw-7">Rook recommends</span> posting <span className="fw-7">{best.dayLabel} at {best.slotLabel}</span> for peak engagement this week.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   POST DETAIL MODAL
   ============================================================ */
function PostDetail({ id, onClose, onEdit }) {
  const toast = useToast();
  const post = id ? getPost(id) : null;
  if (!post) return null;
  const totalReach = Object.values(post.metrics || {}).reduce((s, m) => s + (m.reach || 0), 0);
  return (
    <Modal open={!!id} onClose={onClose} title={post.topic || 'Post'} width={720}
      footer={
        <>
          <Button variant="danger" onClick={() => { deletePost(post.id); toast('Post deleted'); onClose(); }}><Icon name="trash" size={15} /> Delete</Button>
          <div className="spacer" />
          <Button variant="ghost" onClick={() => { duplicatePost(post.id); toast('Duplicated as draft'); }}><Icon name="copy" size={15} /> Duplicate</Button>
          <Button variant="ghost" onClick={() => { toggleEvergreen(post.id); toast(post.evergreen ? 'Removed from evergreen' : 'Added to evergreen'); }}>
            <Icon name="rotateCcw" size={15} /> {post.evergreen ? 'Unmark' : 'Evergreen'}
          </Button>
          {post.status !== 'published' && <Button variant="primary" onClick={() => { publishNow(post.id); toast('Published now'); onClose(); }}>Publish now</Button>}
          <Button variant="accent" onClick={() => { onEdit(post.id); onClose(); }}><Icon name="edit" size={15} /> Edit</Button>
        </>
      }>
      <div className="col gap-3">
        <div className="row between wrap gap-2">
          <div className="row gap-1">{post.networks.map(id2 => <span key={id2} className="row gap-1 badge" style={{ paddingLeft: 4 }}><NetChip id={id2} size={18} /> {networkById(id2)?.label}</span>)}</div>
          <div className="row gap-1"><StatusBadge status={post.status} />{post.evergreen && <Badge tone="accent">Evergreen</Badge>}</div>
        </div>
        <div className="row gap-2 wrap t-sm muted">
          <span className="row gap-1"><Icon name="calendar" size={14} /> {post.status === 'published' ? 'Published ' : 'Scheduled '}{new Date(post.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })} at {timeStr(post.scheduledAt)}</span>
          {post.status === 'published' && <span className="row gap-1"><Icon name="activity" size={14} /> {kfmt(totalReach)} total reach</span>}
        </div>

        {post.status === 'published' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {post.networks.map(id2 => {
              const m = post.metrics[id2] || {};
              return (
                <div key={id2} className="panel card-pad" style={{ padding: '.8rem' }}>
                  <div className="row gap-1" style={{ marginBottom: '.4rem' }}><NetChip id={id2} size={18} /> <span className="fw-6 t-sm">{networkById(id2)?.label}</span></div>
                  <div className="row between t-xs muted"><span>Reach</span><span className="fw-7" style={{ color: 'var(--ink)' }}>{nf(m.reach)}</span></div>
                  <div className="row between t-xs muted"><span>Likes</span><span>{nf(m.likes)}</span></div>
                  <div className="row between t-xs muted"><span>Comments</span><span>{nf(m.comments)}</span></div>
                  <div className="row between t-xs muted"><span>Clicks</span><span>{nf(m.clicks)}</span></div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {post.networks.map(id2 => <PreviewCard key={id2} networkId={id2} text={textForNetwork(post, id2)} media={post.media} />)}
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
const TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'composer', label: 'Composer' },
  { key: 'queue', label: 'Queue' },
  { key: 'analytics', label: 'Analytics' },
];

export default function Social() {
  useSocial();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') && TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'calendar');
  const [draft, setDraft] = useState(emptyDraft);
  const [detailId, setDetailId] = useState(null);

  const stats = socialStats();

  const goTab = (k) => { setTab(k); const p = new URLSearchParams(params); p.set('tab', k); setParams(p, { replace: true }); };

  const startNew = (date) => {
    const d = emptyDraft();
    if (date) { d.date = new Date(date).toISOString().slice(0, 10); }
    setDraft(d);
    goTab('composer');
  };

  const editPost = (id) => {
    const p = getPost(id);
    if (!p) return;
    const when = new Date(p.scheduledAt);
    setDraft({
      id: p.id, topic: p.topic || '', content: p.content || '', tone: p.tone || 'friendly',
      networks: p.networks || [], overrides: p.overrides || {}, media: p.media || null,
      date: when.toISOString().slice(0, 10),
      time: `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`,
      evergreen: !!p.evergreen, customize: Object.keys(p.overrides || {}).length > 0,
      activeNet: (p.networks || ['linkedin'])[0], hashtags: [],
    });
    goTab('composer');
  };

  const counts = { calendar: getPosts().length, composer: null, queue: stats.scheduled + stats.drafts, analytics: null };

  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="Marketing"
        title="Social"
        sub="Five tabs become one planner. Schedule, preview and recycle across every network, with Rook writing the captions."
        action={<Button variant="primary" onClick={() => startNew()}><Icon name="plus" size={16} /> New post</Button>}
      />

      {/* KPI row */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '1.4rem' }}>
        <StatCard label="Scheduled" value={stats.scheduled} icon={<Icon name="calendar" size={18} />} onClick={() => goTab('queue')} sub={`${stats.drafts} drafts waiting`} />
        <StatCard label="Published this month" value={stats.publishedThisMonth} icon={<Icon name="check" size={18} />} accent="var(--ok)" onClick={() => goTab('calendar')} sub="across all channels" />
        <StatCard label="Total reach (28d)" value={stats.totalReach} format={kfmt} icon={<Icon name="activity" size={18} />} accent="var(--accent-teal)" onClick={() => goTab('analytics')} spark={getAnalytics().linkedin?.spark} />
        <StatCard label="Avg engagement" value={stats.avgEngagementRate} format={(v) => v + '%'} icon={<Icon name="sparkles" size={18} />} accent="var(--accent-purple)" onClick={() => goTab('analytics')} sub={`${stats.evergreen} evergreen posts`} />
      </div>

      <Tabs tabs={TABS.map(t => ({ ...t, count: counts[t.key] }))} active={tab} onChange={goTab} />

      {tab === 'calendar' && <Calendar onNewOnDay={startNew} onOpenPost={setDetailId} />}
      {tab === 'composer' && <Composer draft={draft} setDraft={setDraft} onSaved={() => goTab('queue')} />}
      {tab === 'queue' && <Queue onOpen={setDetailId} onEdit={editPost} />}
      {tab === 'analytics' && <Analytics />}

      <PostDetail id={detailId} onClose={() => setDetailId(null)} onEdit={editPost} />
    </div>
  );
}
