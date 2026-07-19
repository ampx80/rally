// ============================================================
// Landing pages - Ardovo's Marketing hub page builder.
//
// Engine 6 (Marketing Hub unification): landing pages are now authored
// with the SAME visual block designer that powers email
// (src/components/email/VisualEmailBuilder with target="landing"). The
// page holds a `design` document; the hosted page renders it full-width
// via email-blocks.renderDoc(design, { target: 'landing' }). A page can
// link a real Ardovo form (by formId) so the public page captures leads
// through the same forms engine used everywhere else.
//
// Backed by the persisted src/lib/landing-pages.js slice (local-first
// pub/sub, Supabase-swappable). Dark-enterprise product theme; #5b4bf5
// accent. Reuses UI.jsx primitives + Icon. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  useLanding, getLandingPages, getLandingPage, landingStats,
  createPage, updatePage, deletePage, duplicatePage, togglePublished,
  setDesign, linkForm, slugify,
} from '../lib/landing-pages.js';
import { getForms } from '../lib/forms.js';
import { blankLandingDoc } from '../lib/email-blocks.js';
import VisualEmailBuilder from '../components/email/VisualEmailBuilder.jsx';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Textarea, Modal,
  StatCard, EmptyState, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const ACCENT = '#5b4bf5';

function spark(seed, len = 12, rise = 1) {
  const out = []; let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) { const w = ((seed * (i + 3)) % 17) - 8; v = Math.max(6, v + w + rise * 3); out.push(Math.round(v)); }
  return out;
}

/* ============================================================
   EDITOR - shared designer + page settings
   ============================================================ */
function Editor({ pageId, onBack }) {
  const toast = useToast();
  useLanding();
  const page = getLandingPage(pageId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const forms = getForms();
  const linkedForm = page && page.formId ? forms.find(f => f.id === page.formId) : null;

  if (!page) {
    return (
      <Card><EmptyState icon="404" title="Page not found" body="It may have been deleted." action={<Button variant="primary" size="sm" onClick={onBack}>Back to pages</Button>} /></Card>
    );
  }

  const liveUrl = `/l/${page.slug}`;
  const onPublish = () => {
    const r = togglePublished(page.id);
    toast(r.page?.published ? 'Published. Live at /l/' + r.page.slug : 'Unpublished');
  };
  const copyLink = async () => {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + liveUrl;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast('Could not copy', 'risk'); }
  };

  return (
    <div className="fade-up">
      <div className="row between wrap gap-2" style={{ marginBottom: '1rem', alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <Button variant="quiet" size="sm" onClick={onBack}><Icon name="arrowLeft" size={16} /> Pages</Button>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="fw-7 clip" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{page.title}</span>
            <span className="t-xs muted">/l/{page.slug} {page.published ? '' : '(draft)'}</span>
          </div>
          <Badge tone={page.published ? 'ok' : 'warn'}>{page.published ? 'Published' : 'Draft'}</Badge>
          {linkedForm && <Badge tone="accent"><Icon name="list" size={12} /> {linkedForm.name}</Badge>}
        </div>
        <div className="row gap-1" style={{ flex: 'none', flexWrap: 'wrap' }}>
          <Button variant="quiet" size="sm" onClick={() => setSettingsOpen(true)}><Icon name="settings" size={15} /> Settings</Button>
          <Button variant="quiet" size="sm" onClick={copyLink}><Icon name="copy" size={15} /> Copy link</Button>
          <Button variant="quiet" size="sm" as="a" href={liveUrl} target="_blank" rel="noopener noreferrer"><Icon name="eye" size={15} /> View live</Button>
          <Button variant="primary" size="sm" onClick={onPublish}>
            <Icon name={page.published ? 'eyeOff' : 'rocket'} size={15} /> {page.published ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="row gap-2 wrap" style={{ marginBottom: '.75rem', alignItems: 'center' }}>
        <span className="t-xs muted fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>Designed with the shared visual builder</span>
        <span className="t-xs muted">Same designer as email. Preview renders the real page.</span>
      </div>

      {/* THE SHARED DESIGNER, in landing mode */}
      <VisualEmailBuilder
        doc={page.design || blankLandingDoc()}
        onChange={(next) => setDesign(page.id, next)}
        target="landing"
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} page={page} forms={forms} />
    </div>
  );
}

function SettingsModal({ open, onClose, page, forms }) {
  const toast = useToast();
  const publishedForms = forms.filter(f => f.status === 'published');
  const draftForms = forms.filter(f => f.status !== 'published');
  return (
    <Modal open={open} onClose={onClose} title="Page settings" width={580}
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="col gap-3">
        <Field label="Page name">
          <Input value={page.title} onChange={e => updatePage(page.id, { title: e.target.value })} />
        </Field>
        <Field label="URL slug" hint={`Public URL: /l/${page.slug}`}>
          <Input value={page.slug} onChange={e => updatePage(page.id, { slug: e.target.value })}
            onBlur={e => { const r = updatePage(page.id, { slug: e.target.value }); if (r.page && r.page.slug !== e.target.value) toast('Slug adjusted to stay unique'); }} />
        </Field>

        <div style={{ height: 1, background: 'var(--line)' }} />
        <div className="t-xs muted fw-6">Lead capture</div>
        <Field label="Linked form" hint="The hosted page renders this real Ardovo form so submissions create contacts.">
          <Select value={page.formId || ''} onChange={e => { linkForm(page.id, e.target.value || null); }}>
            <option value="">No form (design only)</option>
            {publishedForms.length > 0 && (
              <optgroup label="Published">
                {publishedForms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
            )}
            {draftForms.length > 0 && (
              <optgroup label="Draft (publish before going live)">
                {draftForms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
            )}
          </Select>
        </Field>
        <div className="t-xs muted">Add a button in the designer with the link <b>#form</b> to scroll visitors to it.</div>

        <div style={{ height: 1, background: 'var(--line)' }} />
        <div className="t-xs muted fw-6">Page-level CTA (optional)</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
          <Field label="Button label"><Input value={page.ctaLabel || ''} placeholder="e.g. Get started" onChange={e => updatePage(page.id, { ctaLabel: e.target.value })} /></Field>
          <Field label="Button link" hint="/app or https://..."><Input value={page.ctaHref || ''} onChange={e => updatePage(page.id, { ctaHref: e.target.value })} /></Field>
        </div>

        <div style={{ height: 1, background: 'var(--line)' }} />
        <div className="t-xs muted fw-6">Search + share preview</div>
        <Field label="SEO title">
          <Input value={page.seo?.title || ''} onChange={e => updatePage(page.id, { seo: { title: e.target.value } })} />
        </Field>
        <Field label="SEO description">
          <Textarea rows={2} value={page.seo?.description || ''} onChange={e => updatePage(page.id, { seo: { description: e.target.value } })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function CreateModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  React.useEffect(() => { if (open) setTitle(''); }, [open]);
  const submit = () => {
    const r = createPage({ title });
    if (r.error) { toast(r.message, 'risk'); return; }
    toast('Page created');
    onCreated?.(r.page);
    onClose?.();
  };
  return (
    <Modal open={open} onClose={onClose} title="New landing page" width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create page</Button></>}>
      <Field label="Page name" hint="You design it with the same visual builder as email">
        <Input autoFocus placeholder="Q4 webinar" value={title}
          onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
      </Field>
    </Modal>
  );
}

function PageList({ onEdit }) {
  const toast = useToast();
  useLanding();
  const pages = getLandingPages();
  const stats = landingStats();
  const forms = getForms();
  const [createOpen, setCreateOpen] = useState(false);

  const onDelete = (p) => { deletePage(p.id); toast('Deleted'); };
  const onDup = (p) => { const r = duplicatePage(p.id); toast('Duplicated'); onEdit(r.page.id); };
  const onPub = (p) => { const r = togglePublished(p.id); toast(r.page?.published ? 'Published' : 'Unpublished'); };

  return (
    <div className="fade-up">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Pages" value={stats.total} sub={`${stats.drafts} draft${stats.drafts === 1 ? '' : 's'}`} icon={<Icon name="fileText" size={18} />} spark={spark(4, 12, 0.4)} />
        <StatCard label="Published" value={stats.published} sub="live now" icon={<Icon name="rocket" size={18} />} spark={spark(7, 12, 0.8)} accent="#0ea5a3" sparkColor="#0ea5a3" />
        <StatCard label="Total views" value={stats.views} icon={<Icon name="eye" size={18} />} spark={spark(6, 12, 1)} accent="#e0752d" sparkColor="#e0752d" />
        <StatCard label="Form leads" value={stats.submissions} sub={`${stats.convRate}% conversion`} icon={<Icon name="inbox" size={18} />} spark={spark(3, 12, 0.6)} />
      </div>

      <SectionHeader
        title="Landing pages"
        sub="Design with the same visual builder as email, link a form, and publish to a public URL"
        action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New page</Button>}
      />

      {pages.length === 0 ? (
        <Card>
          <EmptyState icon="🧱" title="No landing pages yet"
            body="Build your first page with the shared visual designer, link a form to capture leads, and publish it to a public link."
            action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New page</Button>} />
        </Card>
      ) : (
        <div className="col gap-3">
          {pages.map(p => {
            const linked = p.formId ? forms.find(f => f.id === p.formId) : null;
            const blockCount = (p.design?.blocks || []).length;
            return (
              <Card key={p.id} hover>
                <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                  <button type="button" onClick={() => onEdit(p.id)} className="col gap-1" style={{ minWidth: 0, flex: '1 1 320px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                    <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                      <span className="fw-7" style={{ color: 'var(--ink)', fontSize: '1.02rem' }}>{p.title}</span>
                      <Badge tone={p.published ? 'ok' : 'warn'}>{p.published ? 'Published' : 'Draft'}</Badge>
                      {linked && <Badge tone="accent"><Icon name="list" size={12} /> {linked.name}</Badge>}
                    </div>
                    <div className="t-sm muted clip">/l/{p.slug}</div>
                    <div className="row gap-3 t-xs muted" style={{ flexWrap: 'wrap', marginTop: 2 }}>
                      <span><Icon name="layers" size={13} /> {blockCount} blocks</span>
                      <span><Icon name="eye" size={13} /> {(p.views || 0).toLocaleString()} views</span>
                      <span><Icon name="inbox" size={13} /> {(p.submissions?.length || 0).toLocaleString()} leads</span>
                      <span><Icon name="clock" size={13} /> Updated {relTime(p.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="row gap-1" style={{ flex: 'none', flexWrap: 'wrap' }}>
                    <Button variant="quiet" size="sm" onClick={() => onEdit(p.id)} title="Edit"><Icon name="edit" size={15} /></Button>
                    {p.published && <Button variant="quiet" size="sm" as="a" href={`/l/${p.slug}`} target="_blank" rel="noopener noreferrer" title="View live"><Icon name="eye" size={15} /></Button>}
                    <Button variant="quiet" size="sm" onClick={() => onPub(p)} title={p.published ? 'Unpublish' : 'Publish'}><Icon name={p.published ? 'eyeOff' : 'rocket'} size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDup(p)} title="Duplicate"><Icon name="copy" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDelete(p)} title="Delete"><Icon name="trash" size={15} /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(p) => onEdit(p.id)} />
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function LandingPages() {
  const [editingId, setEditingId] = useState(null);
  return editingId
    ? <Editor pageId={editingId} onBack={() => setEditingId(null)} />
    : <PageList onEdit={setEditingId} />;
}
