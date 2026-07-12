// ============================================================
// Landing pages - Rally's CMS-lite builder (Marketing hub).
// A block-based landing-page builder with a live preview and one-click
// publish. Authors compose a page from five block types (hero / text /
// image / form / cta), preview it exactly as it will render, then publish
// it to the PUBLIC hosted route at /l/:slug (see marketing/HostedLanding).
//
// Backed by the persisted src/lib/landing-pages.js slice (local-first
// pub/sub, Supabase-swappable). ADDITIVE - touches no existing surface.
// Dark-enterprise product theme; #5b4bf5 accent. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  useLanding, getLandingPages, getLandingPage, landingStats,
  createPage, updatePage, deletePage, duplicatePage, togglePublished,
  addBlock, updateBlock, removeBlock, moveBlock, newBlock, slugify,
  BLOCK_TYPES, blockLabel,
} from '../lib/landing-pages.js';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Textarea, Modal,
  StatCard, EmptyState, Segmented, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const ACCENT = '#5b4bf5';
const FIELD_TYPES = ['text', 'email', 'tel', 'textarea'];

function spark(seed, len = 12, rise = 1) {
  const out = []; let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) { const w = ((seed * (i + 3)) % 17) - 8; v = Math.max(6, v + w + rise * 3); out.push(Math.round(v)); }
  return out;
}

/* ============================================================
   PREVIEW CANVAS - a faithful light-page render of the blocks.
   Inline-styled + wrapped in a white canvas so the author sees the
   real page regardless of the dark product theme around it.
   ============================================================ */
function PreviewButton({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, background: `linear-gradient(100deg, ${ACCENT}, #7c5cf7)`, color: '#fff', fontWeight: 800, fontSize: 15 }}>
      {children}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </span>
  );
}

function PreviewBlock({ b }) {
  if (b.type === 'hero') {
    const c = (b.align || 'center') === 'center';
    return (
      <div style={{ padding: '52px 28px 40px', textAlign: c ? 'center' : 'left', background: `radial-gradient(60% 60% at 50% 0%, ${ACCENT}14, transparent 70%)` }}>
        {b.eyebrow && <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>{b.eyebrow}</div>}
        <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, color: '#0d1117', maxWidth: 640, marginInline: c ? 'auto' : 0 }}>{b.headline || 'Headline'}</div>
        {b.sub && <p style={{ fontSize: 17, lineHeight: 1.5, color: '#454c5e', marginTop: 16, maxWidth: 520, marginInline: c ? 'auto' : 0 }}>{b.sub}</p>}
        {b.ctaLabel && <div style={{ marginTop: 24 }}><PreviewButton>{b.ctaLabel}</PreviewButton></div>}
      </div>
    );
  }
  if (b.type === 'text') {
    const c = (b.align || 'left') === 'center';
    const paras = String(b.body || '').split(/\n{2,}/).filter(Boolean);
    return (
      <div style={{ padding: '30px 28px', textAlign: c ? 'center' : 'left' }}>
        {b.heading && <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-.02em', color: '#0d1117', marginBottom: 12 }}>{b.heading}</div>}
        {paras.map((p, i) => <p key={i} style={{ fontSize: 17, lineHeight: 1.7, color: '#454c5e', margin: i ? '12px 0 0' : 0, maxWidth: 640, marginInline: c ? 'auto' : 0 }}>{p}</p>)}
        {paras.length === 0 && <p style={{ color: '#9aa0b0', fontStyle: 'italic' }}>Body copy...</p>}
      </div>
    );
  }
  if (b.type === 'image') {
    return (
      <div style={{ padding: '24px 28px' }}>
        {b.url ? (
          <figure style={{ margin: 0 }}>
            <img src={b.url} alt={b.alt || ''} style={{ width: '100%', borderRadius: 14, border: '1px solid #eceef4', display: 'block' }} />
            {b.caption && <figcaption style={{ marginTop: 10, fontSize: 13, color: '#7c8399', textAlign: 'center' }}>{b.caption}</figcaption>}
          </figure>
        ) : (
          <div style={{ height: 180, borderRadius: 14, border: '1.5px dashed #d5d8e3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0b0', fontSize: 14, background: '#f7f8fc' }}>
            Add an image URL
          </div>
        )}
      </div>
    );
  }
  if (b.type === 'form') {
    const fields = Array.isArray(b.fields) ? b.fields : [];
    return (
      <div style={{ padding: '34px 28px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', border: '1px solid #eceef4', borderRadius: 18, padding: 26, boxShadow: '0 20px 50px -22px rgba(91,75,245,.35)', background: '#fff' }}>
          {b.heading && <div style={{ fontSize: 20, fontWeight: 800, color: '#0d1117', marginBottom: 6 }}>{b.heading}</div>}
          {b.sub && <p style={{ fontSize: 15, color: '#454c5e', margin: '0 0 16px', lineHeight: 1.5 }}>{b.sub}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map((f, i) => (
              <div key={f.key || i}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#454c5e', marginBottom: 5 }}>{f.label}{f.required ? ' *' : ''}</div>
                <div style={{ height: f.type === 'textarea' ? 72 : 42, borderRadius: 10, border: '1.5px solid #e0e3ec', background: '#fbfbfe' }} />
              </div>
            ))}
            {fields.length === 0 && <p style={{ color: '#9aa0b0', fontStyle: 'italic', fontSize: 14 }}>No fields yet.</p>}
          </div>
          <div style={{ marginTop: 18, height: 48, borderRadius: 12, background: `linear-gradient(100deg, ${ACCENT}, #7c5cf7)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>
            {b.submitLabel || 'Submit'}
          </div>
        </div>
      </div>
    );
  }
  if (b.type === 'cta') {
    const c = true;
    return (
      <div style={{ padding: '30px 28px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(120deg, ${ACCENT}, #7c5cf7 55%, #0e9f9a)`, color: '#fff', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          {b.headline && <div style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.08, maxWidth: 560, margin: '0 auto' }}>{b.headline}</div>}
          {b.sub && <p style={{ fontSize: 17, color: 'rgba(255,255,255,.88)', margin: '14px auto 0', maxWidth: 460, lineHeight: 1.5 }}>{b.sub}</p>}
          <div style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, background: '#fff', color: ACCENT, fontWeight: 800, fontSize: 15 }}>
            {b.buttonLabel || 'Get started'}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function PreviewCanvas({ page }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
      {/* faux browser chrome with the live URL */}
      <div className="row gap-2" style={{ padding: '10px 14px', borderBottom: '1px solid #eceef4', background: '#f7f8fc', alignItems: 'center' }}>
        <span className="row gap-1" style={{ gap: 6 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
        </span>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 12.5, color: '#7c8399', fontFamily: 'var(--font-mono, monospace)' }}>
          rally.app/l/{page.slug}
        </span>
      </div>
      <div style={{ maxHeight: 620, overflowY: 'auto' }}>
        {(page.blocks || []).length === 0
          ? <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9aa0b0' }}>Add a block to start building.</div>
          : (page.blocks || []).map(b => <PreviewBlock key={b.id} b={b} />)}
      </div>
    </div>
  );
}

/* ============================================================
   FIELD EDITOR (for a form block)
   ============================================================ */
function FormFieldsEditor({ pageId, block }) {
  const fields = Array.isArray(block.fields) ? block.fields : [];
  const write = (next) => updateBlock(pageId, block.id, { fields: next });

  const setField = (i, patch) => write(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const addField = () => write([...fields, { key: uniqueKey(fields, 'field'), label: 'New field', type: 'text', required: false }]);
  const removeField = (i) => write(fields.filter((_, idx) => idx !== i));

  return (
    <div className="col gap-2">
      <div className="t-xs muted fw-6">Form fields</div>
      {fields.map((f, i) => (
        <div key={i} className="row gap-2 wrap" style={{ alignItems: 'flex-end', padding: '.6rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
          <Field label="Label"><Input value={f.label} onChange={e => {
            const label = e.target.value;
            // Keep key stable once set; only auto-derive when key looks untouched.
            setField(i, { label });
          }} /></Field>
          <Field label="Key"><Input value={f.key} onChange={e => setField(i, { key: slugify(e.target.value).replace(/-/g, '') || `field${i}` })} style={{ maxWidth: 140 }} /></Field>
          <Field label="Type">
            <Select value={f.type} onChange={e => setField(i, { type: e.target.value })} style={{ maxWidth: 130 }}>
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <label className="row gap-1" style={{ alignItems: 'center', paddingBottom: '.4rem', fontSize: '.85rem', color: 'var(--n-600)' }}>
            <input type="checkbox" checked={!!f.required} onChange={e => setField(i, { required: e.target.checked })} /> Required
          </label>
          <Button variant="quiet" size="sm" onClick={() => removeField(i)} title="Remove field"><Icon name="trash" size={14} /></Button>
        </div>
      ))}
      <div><Button variant="quiet" size="sm" onClick={addField}><Icon name="plus" size={14} /> Add field</Button></div>
    </div>
  );
}

function uniqueKey(fields, base) {
  const taken = new Set(fields.map(f => f.key));
  let k = base, i = 2;
  while (taken.has(k)) { k = `${base}${i++}`; }
  return k;
}

/* ============================================================
   BLOCK EDITOR (per-type field forms)
   ============================================================ */
function BlockEditor({ pageId, block, index, count }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => updateBlock(pageId, block.id, patch);

  return (
    <Card pad={false} style={{ overflow: 'hidden' }}>
      <div className="row between" style={{ padding: '.7rem .85rem', alignItems: 'center', background: 'var(--n-50)', borderBottom: open ? '1px solid var(--line)' : 'none' }}>
        <button type="button" className="row gap-2" style={{ alignItems: 'center', minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }} onClick={() => setOpen(o => !o)}>
          <span style={{ color: ACCENT, display: 'inline-flex' }}><Icon name={(BLOCK_TYPES.find(t => t.type === block.type) || {}).icon || 'fileText'} size={16} /></span>
          <span className="fw-6" style={{ fontSize: '.95rem' }}>{blockLabel(block.type)}</span>
          <Icon name="chevronDown" size={14} style={{ transform: open ? 'none' : 'rotate(-90deg)', color: 'var(--n-500)' }} />
        </button>
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="quiet" size="sm" onClick={() => moveBlock(pageId, block.id, -1)} disabled={index === 0} title="Move up"><Icon name="arrowUp" size={14} /></Button>
          <Button variant="quiet" size="sm" onClick={() => moveBlock(pageId, block.id, 1)} disabled={index === count - 1} title="Move down"><Icon name="arrowDown" size={14} /></Button>
          <Button variant="quiet" size="sm" onClick={() => removeBlock(pageId, block.id)} title="Delete block"><Icon name="trash" size={14} /></Button>
        </div>
      </div>
      {open && (
        <div className="col gap-3" style={{ padding: '1rem .95rem' }}>
          {block.type === 'hero' && (<>
            <Field label="Eyebrow"><Input value={block.eyebrow || ''} onChange={e => set({ eyebrow: e.target.value })} /></Field>
            <Field label="Headline"><Input value={block.headline || ''} onChange={e => set({ headline: e.target.value })} /></Field>
            <Field label="Subhead"><Textarea rows={2} value={block.sub || ''} onChange={e => set({ sub: e.target.value })} /></Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <Field label="Button label"><Input value={block.ctaLabel || ''} onChange={e => set({ ctaLabel: e.target.value })} /></Field>
              <Field label="Button link" hint="/app, #form, or https://..."><Input value={block.ctaHref || ''} onChange={e => set({ ctaHref: e.target.value })} /></Field>
            </div>
            <Field label="Alignment"><Segmented options={[{ value: 'center', label: 'Center' }, { value: 'left', label: 'Left' }]} value={block.align || 'center'} onChange={v => set({ align: v })} /></Field>
          </>)}

          {block.type === 'text' && (<>
            <Field label="Heading"><Input value={block.heading || ''} onChange={e => set({ heading: e.target.value })} /></Field>
            <Field label="Body" hint="Blank line starts a new paragraph"><Textarea rows={5} value={block.body || ''} onChange={e => set({ body: e.target.value })} /></Field>
            <Field label="Alignment"><Segmented options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} value={block.align || 'left'} onChange={v => set({ align: v })} /></Field>
          </>)}

          {block.type === 'image' && (<>
            <Field label="Image URL"><Input placeholder="https://..." value={block.url || ''} onChange={e => set({ url: e.target.value })} /></Field>
            <Field label="Alt text" hint="Describe the image for accessibility"><Input value={block.alt || ''} onChange={e => set({ alt: e.target.value })} /></Field>
            <Field label="Caption"><Input value={block.caption || ''} onChange={e => set({ caption: e.target.value })} /></Field>
          </>)}

          {block.type === 'form' && (<>
            <Field label="Heading"><Input value={block.heading || ''} onChange={e => set({ heading: e.target.value })} /></Field>
            <Field label="Subhead"><Textarea rows={2} value={block.sub || ''} onChange={e => set({ sub: e.target.value })} /></Field>
            <FormFieldsEditor pageId={pageId} block={block} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <Field label="Submit button"><Input value={block.submitLabel || ''} onChange={e => set({ submitLabel: e.target.value })} /></Field>
              <Field label="Lead source" hint="Tags the CRM lead"><Input value={block.source || ''} onChange={e => set({ source: e.target.value })} /></Field>
            </div>
            <Field label="Success message"><Textarea rows={2} value={block.successMessage || ''} onChange={e => set({ successMessage: e.target.value })} /></Field>
          </>)}

          {block.type === 'cta' && (<>
            <Field label="Headline"><Input value={block.headline || ''} onChange={e => set({ headline: e.target.value })} /></Field>
            <Field label="Subhead"><Textarea rows={2} value={block.sub || ''} onChange={e => set({ sub: e.target.value })} /></Field>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <Field label="Button label"><Input value={block.buttonLabel || ''} onChange={e => set({ buttonLabel: e.target.value })} /></Field>
              <Field label="Button link" hint="/app, or https://..."><Input value={block.buttonHref || ''} onChange={e => set({ buttonHref: e.target.value })} /></Field>
            </div>
            <Field label="Style"><Segmented options={[{ value: 'band', label: 'Gradient band' }, { value: 'inline', label: 'Inline' }]} value={block.style || 'band'} onChange={v => set({ style: v })} /></Field>
          </>)}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   ADD-BLOCK PICKER
   ============================================================ */
function AddBlockBar({ pageId }) {
  return (
    <Card style={{ borderStyle: 'dashed' }}>
      <div className="t-xs muted fw-6" style={{ marginBottom: '.55rem' }}>Add a block</div>
      <div className="row gap-2 wrap">
        {BLOCK_TYPES.map(t => (
          <Button key={t.type} variant="quiet" size="sm" onClick={() => addBlock(pageId, t.type)} title={t.hint}>
            <Icon name={t.icon} size={15} /> {t.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   EDITOR VIEW (settings + blocks + live preview)
   ============================================================ */
function Editor({ pageId, onBack }) {
  const toast = useToast();
  useLanding();
  const page = getLandingPage(pageId);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      <div className="row gap-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LEFT - block stack */}
        <div className="col gap-2" style={{ flex: '1 1 380px', minWidth: 300 }}>
          {(page.blocks || []).map((b, i) => (
            <BlockEditor key={b.id} pageId={page.id} block={b} index={i} count={page.blocks.length} />
          ))}
          <AddBlockBar pageId={page.id} />
        </div>

        {/* RIGHT - live preview */}
        <div className="col gap-2" style={{ flex: '1 1 460px', minWidth: 320, position: 'sticky', top: 76 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="t-xs muted fw-6" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>Live preview</span>
            <span className="t-xs muted">{page.blocks?.length || 0} block{page.blocks?.length === 1 ? '' : 's'}</span>
          </div>
          <PreviewCanvas page={page} />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} page={page} />
    </div>
  );
}

function SettingsModal({ open, onClose, page }) {
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Page settings" width={560}
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
      <Field label="Page name" hint="You can change everything later">
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
        <StatCard label="Form leads" value={stats.submissions} sub="captured" icon={<Icon name="inbox" size={18} />} spark={spark(3, 12, 0.6)} />
      </div>

      <SectionHeader
        title="Landing pages"
        sub="Build a page from blocks, preview it live, and publish to a public URL"
        action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New page</Button>}
      />

      {pages.length === 0 ? (
        <Card>
          <EmptyState icon="🧱" title="No landing pages yet"
            body="Build your first block-based page, capture leads with a form, and publish it to a public link."
            action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> New page</Button>} />
        </Card>
      ) : (
        <div className="col gap-3">
          {pages.map(p => (
            <Card key={p.id} hover>
              <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                <button type="button" onClick={() => onEdit(p.id)} className="col gap-1" style={{ minWidth: 0, flex: '1 1 320px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                  <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    <span className="fw-7" style={{ color: 'var(--ink)', fontSize: '1.02rem' }}>{p.title}</span>
                    <Badge tone={p.published ? 'ok' : 'warn'}>{p.published ? 'Published' : 'Draft'}</Badge>
                  </div>
                  <div className="t-sm muted clip">/l/{p.slug}</div>
                  <div className="row gap-3 t-xs muted" style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    <span><Icon name="layers" size={13} /> {p.blocks?.length || 0} blocks</span>
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
          ))}
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
