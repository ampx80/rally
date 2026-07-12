// KnowledgeBase - the native knowledge base manager + reader. A Service Hub
// companion that gives Rally its own help-desk depth: browse by category,
// search, read an article with helpful voting and view tracking, and create
// or edit articles inline. Built on the local-first knowledge-base.js slice
// (persisted, pub/sub) and the shared UI kit + motion system.
//
// Additive + self-contained. Nothing here mutates another slice. Dark-enterprise
// surface, #5b4bf5 accent, animated (Reveal) and reduced-motion safe.
// ASCII only. No em-dash or en-dash.
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Badge, Button, StatCard, Segmented, Select, Input, Textarea, Field, Modal,
  EmptyState, useToast, GradientText, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import Reveal from '../components/motion/Reveal.jsx';
import {
  useKb, getArticles, getArticle, KB_CATEGORIES, kbCategory, articlesByCategory,
  searchArticles, kbStats, helpfulScore, createArticle, updateArticle, deleteArticle,
  setArticleStatus, recordView, voteArticle,
} from '../lib/knowledge-base.js';

const STATUS_META = {
  published: { label: 'Published', tone: 'ok' },
  draft: { label: 'Draft', tone: 'warn' },
  archived: { label: 'Archived', tone: 'default' },
};
const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;
const fmtViews = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k' : String(n));

/* ---------- category chip row ---------- */
function CategoryChips({ value, onChange, counts }) {
  const opts = [{ id: 'all', name: 'All', icon: 'grid' }, ...KB_CATEGORIES];
  return (
    <div className="row gap-2 wrap">
      {opts.map(c => {
        const on = c.id === value;
        const n = c.id === 'all' ? counts.all : (counts[c.id] || 0);
        return (
          <button key={c.id} onClick={() => onChange(c.id)} className="row gap-2"
            style={{
              alignItems: 'center', padding: '.5rem .8rem', borderRadius: 'var(--r-pill)',
              border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line-strong)'),
              background: on ? 'var(--accent)' : 'var(--paper)',
              color: on ? '#fff' : 'var(--ink)', fontWeight: 600, cursor: 'pointer',
              transition: 'background .15s, border-color .15s, color .15s',
            }}>
            <Icon name={c.icon} size={15} />
            <span>{c.name}</span>
            <span className="t-xs" style={{ opacity: .75, fontWeight: 700 }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- one article card ---------- */
function ArticleCard({ a, onOpen, onEdit }) {
  const cat = kbCategory(a.category);
  const sm = statusMeta(a.status);
  const help = helpfulScore(a);
  return (
    <Card hover className="col gap-2" style={{ cursor: 'pointer', height: '100%' }} onClick={() => onOpen(a.id)}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
        <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name={cat.icon} size={17} />
          </span>
          <span className="t-xs fw-6" style={{ color: 'var(--n-600)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{cat.name}</span>
        </span>
        {a.status !== 'published' && <Badge tone={sm.tone} className="t-xs">{sm.label}</Badge>}
      </div>
      <h4 style={{ margin: '2px 0 0', lineHeight: 1.25 }}>{a.title}</h4>
      <p className="t-sm muted" style={{ margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.summary}</p>
      <div className="row between" style={{ marginTop: 'auto', paddingTop: 8, alignItems: 'center' }}>
        <div className="row gap-3 t-xs muted" style={{ alignItems: 'center' }}>
          <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="eye" size={13} /> {fmtViews(a.views || 0)}</span>
          {help != null && <span className="row gap-1" style={{ alignItems: 'center', color: help >= 70 ? 'var(--ok)' : undefined }}><Icon name="check" size={13} /> {help}%</span>}
          <span>{relTime(a.updatedAt)}</span>
        </div>
        <button className="btn btn-quiet btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(a.id); }} title="Edit" aria-label="Edit article">
          <Icon name="edit" size={14} />
        </button>
      </div>
    </Card>
  );
}

/* ---------- reader ---------- */
function ArticleReader({ id, onBack, onEdit }) {
  const toast = useToast();
  const a = useKb(() => getArticle(id));
  const [voted, setVoted] = useState(null);

  // Count a view once per open (guarded to a single write per mount).
  useEffect(() => {
    if (!id) return;
    recordView(id);
    setVoted(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vote = useCallback((dir) => {
    if (voted) return;
    voteArticle(id, dir);
    setVoted(dir);
    toast(dir === 'up' ? 'Thanks for the feedback' : 'Noted, we will improve this');
  }, [id, voted, toast]);

  if (!a) return <EmptyState icon="📄" title="Article not found" body="It may have been deleted." action={<Button onClick={onBack}>Back to articles</Button>} />;
  const cat = kbCategory(a.category);
  const sm = statusMeta(a.status);
  const help = helpfulScore(a);

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <button className="btn btn-quiet btn-sm" onClick={onBack}><Icon name="arrowLeft" size={15} /> All articles</button>
        <span className="t-sm muted">/</span>
        <span className="t-sm muted">{cat.name}</span>
      </div>

      <Reveal>
        <Card className="col gap-3" style={{ maxWidth: 820 }}>
          <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
            <span className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="row center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-50)', color: 'var(--accent-600)' }}><Icon name={cat.icon} size={16} /></span>
              <span className="t-xs fw-6" style={{ color: 'var(--accent-600)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{cat.name}</span>
            </span>
            <Badge tone={sm.tone} className="t-xs">{sm.label}</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.2vw, 2.3rem)', lineHeight: 1.15 }}>{a.title}</h1>
          <p className="muted" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.55 }}>{a.summary}</p>
          <div className="row gap-3 t-xs muted wrap" style={{ alignItems: 'center' }}>
            <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="user" size={13} /> {a.author}</span>
            <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="eye" size={13} /> {(a.views || 0).toLocaleString()} views</span>
            {help != null && <span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="check" size={13} /> {help}% found this helpful</span>}
            <span>Updated {relTime(a.updatedAt)}</span>
            <span className="spacer" />
            <button className="btn btn-quiet btn-sm" onClick={() => onEdit(a.id)}><Icon name="edit" size={13} /> Edit</button>
          </div>
        </Card>
      </Reveal>

      <div className="col gap-4" style={{ maxWidth: 820 }}>
        {(a.sections || []).map((s, i) => (
          <Reveal key={i} delay={Math.min(i * 60, 300)}>
            <Card className="col gap-2">
              {s.heading && <h3 style={{ margin: 0 }}>{s.heading}</h3>}
              {String(s.body || '').split(/\n{2,}/).map((para, j) => (
                <p key={j} style={{ margin: 0, lineHeight: 1.65, color: 'var(--ink)', fontSize: '1.02rem', whiteSpace: 'pre-wrap' }}>{para}</p>
              ))}
            </Card>
          </Reveal>
        ))}
      </div>

      {a.tags?.length > 0 && (
        <div className="row gap-2 wrap" style={{ maxWidth: 820 }}>
          {a.tags.map(t => <Badge key={t} className="t-xs">#{t}</Badge>)}
        </div>
      )}

      {/* helpful footer */}
      <Card className="row between wrap" style={{ maxWidth: 820, gap: 16, alignItems: 'center', background: 'var(--paper-2, var(--paper))' }}>
        <div className="col gap-1">
          <span className="fw-6">Was this article helpful?</span>
          <span className="t-sm muted">Your feedback shapes what we write next.</span>
        </div>
        <div className="row gap-2">
          <Button variant={voted === 'up' ? 'primary' : 'ghost'} onClick={() => vote('up')} disabled={!!voted}>
            <Icon name="check" size={16} /> Yes
          </Button>
          <Button variant={voted === 'down' ? 'primary' : 'ghost'} onClick={() => vote('down')} disabled={!!voted}>
            <Icon name="x" size={16} /> No
          </Button>
        </div>
      </Card>

      <div className="row gap-2 wrap" style={{ maxWidth: 820, alignItems: 'center' }}>
        <span className="t-sm muted">Still stuck?</span>
        <Link to="/service" className="link t-sm">Open the Service Hub</Link>
        <span className="t-sm muted">or</span>
        <Link to="/tickets" className="link t-sm">see support tickets</Link>
      </div>
    </div>
  );
}

/* ---------- create / edit modal ---------- */
const BLANK_SECTION = () => ({ heading: '', body: '' });
function EditorModal({ open, onClose, editingId }) {
  const toast = useToast();
  const existing = editingId ? getArticle(editingId) : null;
  const [form, setForm] = useState(() => blankForm());
  function blankForm() { return { title: '', category: 'getting-started', summary: '', tags: '', status: 'draft', sections: [BLANK_SECTION()] }; }

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({
        title: existing.title,
        category: existing.category,
        summary: existing.summary || '',
        tags: (existing.tags || []).join(', '),
        status: existing.status,
        sections: existing.sections?.length ? existing.sections.map(s => ({ ...s })) : [BLANK_SECTION()],
      });
    } else {
      setForm(blankForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setSection = (i, k, v) => setForm(f => ({ ...f, sections: f.sections.map((s, j) => j === i ? { ...s, [k]: v } : s) }));
  const addSection = () => setForm(f => ({ ...f, sections: [...f.sections, BLANK_SECTION()] }));
  const removeSection = (i) => setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }));

  const save = () => {
    const payload = {
      title: form.title, category: form.category, summary: form.summary,
      tags: form.tags, status: form.status, sections: form.sections,
    };
    const res = editingId ? updateArticle(editingId, payload) : createArticle(payload);
    if (res.error) { toast(res.message || 'Could not save', 'risk'); return; }
    toast(editingId ? 'Article updated' : 'Article created');
    onClose();
  };

  const doDelete = () => {
    if (!editingId) return;
    const res = deleteArticle(editingId);
    if (res.error) { toast(res.message, 'risk'); return; }
    toast('Article deleted');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={720}
      title={editingId ? 'Edit article' : 'New article'}
      footer={<>
        {editingId && <Button variant="danger" onClick={doDelete} style={{ marginRight: 'auto' }}><Icon name="trash" size={15} /> Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>{editingId ? 'Save changes' : 'Create article'}</Button>
      </>}>
      <div className="col gap-3">
        <Field label="Title"><Input value={form.title} onChange={set('title')} placeholder="How to..." /></Field>
        <div className="row gap-3 wrap">
          <div style={{ flex: '1 1 220px' }}>
            <Field label="Category">
              <Select value={form.category} onChange={set('category')}>
                {KB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
        </div>
        <Field label="Summary" hint="One or two sentences shown in the directory and search."><Textarea rows={2} value={form.summary} onChange={set('summary')} /></Field>
        <Field label="Tags" hint="Comma separated, used for search."><Input value={form.tags} onChange={set('tags')} placeholder="import, csv, dedupe" /></Field>

        <div className="col gap-2">
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="fw-6 t-sm">Sections</span>
            <Button variant="ghost" size="sm" onClick={addSection}><Icon name="plus" size={14} /> Add section</Button>
          </div>
          {form.sections.map((s, i) => (
            <Card key={i} className="col gap-2" style={{ background: 'var(--n-50, var(--paper))' }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Input value={s.heading} onChange={e => setSection(i, 'heading', e.target.value)} placeholder={`Section ${i + 1} heading`} style={{ flex: 1 }} />
                {form.sections.length > 1 && <button className="btn btn-quiet btn-sm" onClick={() => removeSection(i)} aria-label="Remove section"><Icon name="x" size={15} /></button>}
              </div>
              <Textarea rows={4} value={s.body} onChange={e => setSection(i, 'body', e.target.value)} placeholder="Write the section body. Separate paragraphs with a blank line." />
            </Card>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- main page ---------- */
export default function KnowledgeBase() {
  const snap = useKb();
  const articles = snap.articles;
  const stats = useMemo(() => kbStats(), [snap]);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('updated');
  const [reading, setReading] = useState(null);   // article id in reader
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const counts = useMemo(() => {
    const c = { all: articles.length };
    for (const k of KB_CATEGORIES) c[k.id] = articlesByCategory(k.id).length;
    return c;
  }, [articles]);

  const list = useMemo(() => {
    let rows = q.trim() ? searchArticles(q, 60) : articles.slice();
    if (cat !== 'all') rows = rows.filter(a => a.category === cat);
    if (!q.trim()) {
      if (sort === 'updated') rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      else if (sort === 'views') rows.sort((a, b) => (b.views || 0) - (a.views || 0));
      else if (sort === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));
    }
    return rows;
  }, [articles, q, cat, sort]);

  const openEditor = (id = null) => { setEditingId(id); setEditorOpen(true); };

  if (reading) {
    return <ArticleReader id={reading} onBack={() => setReading(null)} onEdit={(id) => { setReading(null); openEditor(id); }} />;
  }

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 58%, var(--accent-700) 128%)', color: '#fff', border: 'none', overflow: 'hidden' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '60ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="fileText" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Knowledge base</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', lineHeight: 1.1, color: '#fff' }}>
              Every answer, <GradientText style={{ background: 'linear-gradient(100deg,#c9c3ff,#fff)' }}>one search away</GradientText>.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.02rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              The native help center behind your Service Hub. Write once, and your team plus every customer gets the same crisp answer, tracked by views and helpfulness.
            </p>
          </div>
          <div className="row gap-2" style={{ flex: 'none', flexWrap: 'wrap' }}>
            <Button variant="ghost" as={Link} to="/service" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}><Icon name="shield" size={16} /> Service Hub</Button>
            <Button variant="primary" onClick={() => openEditor(null)}><Icon name="plus" size={16} /> New article</Button>
          </div>
        </div>
      </Card>

      {/* stat tiles */}
      <div className="row gap-3 wrap">
        <div style={{ flex: '1 1 200px' }}><StatCard label="Articles" value={stats.total} icon={<Icon name="fileText" size={18} />} sub={`${stats.published} published`} /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="Total views" value={stats.totalViews} accent="var(--accent)" icon={<Icon name="eye" size={18} />} /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="Avg helpful" value={stats.avgHelpful} accent="var(--ok)" icon={<Icon name="check" size={18} />} sub="percent yes" /></div>
        <div style={{ flex: '1 1 200px' }}><StatCard label="Categories" value={stats.categories} accent="var(--accent-purple, var(--accent))" icon={<Icon name="grid" size={18} />} sub={`${stats.drafts} drafts`} /></div>
      </div>

      {/* search + sort */}
      <div className="row between gap-3 wrap" style={{ alignItems: 'center' }}>
        <div className="row gap-1" style={{ alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', padding: '.5rem .75rem', flex: '1 1 320px', maxWidth: 460 }}>
          <Icon name="search" size={17} color="var(--n-400)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles, topics, or tags"
            style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', flex: 1, minWidth: 0, fontSize: '.98rem' }} />
          {q && <button onClick={() => setQ('')} className="btn btn-quiet btn-sm" aria-label="Clear search"><Icon name="x" size={14} /></button>}
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="t-sm muted">Sort</span>
          <Segmented options={[{ value: 'updated', label: 'Recent' }, { value: 'views', label: 'Popular' }, { value: 'title', label: 'A-Z' }]} value={sort} onChange={setSort} />
        </div>
      </div>

      {/* category chips */}
      <CategoryChips value={cat} onChange={setCat} counts={counts} />

      {/* directory */}
      {list.length === 0 ? (
        <EmptyState icon="🔎" title={q.trim() ? 'No articles match' : 'No articles yet'}
          body={q.trim() ? 'Try a different term, or clear the search to browse every guide.' : 'Write the first article for this category.'}
          action={<Button variant="primary" onClick={() => openEditor(null)}><Icon name="plus" size={16} /> New article</Button>} />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {list.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i * 40, 320)} style={{ height: '100%' }}>
              <ArticleCard a={a} onOpen={setReading} onEdit={openEditor} />
            </Reveal>
          ))}
        </div>
      )}

      <EditorModal open={editorOpen} onClose={() => setEditorOpen(false)} editingId={editingId} />
    </div>
  );
}
