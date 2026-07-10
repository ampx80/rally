// DocBuilder - the three-pane proposal editor. LEFT: block palette (click or
// drag to add). CENTER: a live document canvas rendering the same beautiful
// BlockBody the PDF uses, with drag-to-reorder (animated insertion line),
// click-to-select, inline text editing, and per-block controls. RIGHT: the
// inspector (edit the selected block's config + doc settings - name, accent,
// link-to-deal). Top bar: name, Preview, Download PDF (window.print of a
// print-styled DocRender), Save. Reads id from useParams().id only; a missing
// doc renders a Not found card (data is synchronous, never a permanent spinner).
// All writes flow through store-docs so every pane is reactive via useDocs().
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDocs, getDoc, updateDoc, addBlock, updateBlock, removeBlock, reorderBlock,
  linkDocToDeal, resolvePricing, BLOCK_TYPES, blockMeta,
} from '../lib/store-docs.js';
import { getDeals, getDeal, getCompany } from '../lib/store.js';
import { Button, Card, Badge, Field, Input, Select, Textarea, Modal, useToast, money } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DocRender, { BlockBody } from '../components/DocRender.jsx';

const ACCENTS = ['#5b4bf5', '#0ea5a3', '#8b3fd4', '#2563a8', '#c0392b', '#b3721a', '#1a7f52', '#e0752d'];

export default function DocBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  useDocs();

  const [selected, setSelected] = useState(null);   // blockId
  const [preview, setPreview] = useState(false);
  const [drag, setDrag] = useState(null);           // { kind:'new'|'move', type?, blockId? }
  const [overIndex, setOverIndex] = useState(null);

  const doc = getDoc(id);

  // keep selection valid when blocks change / doc missing
  useEffect(() => {
    if (doc && selected && !doc.blocks.some(b => b.id === selected)) setSelected(null);
  }, [doc, selected]);

  if (!doc) {
    return (
      <div className="rl-page">
        <Card className="col center gap-2" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 460, margin: '3rem auto' }}>
          <div style={{ fontSize: '2.2rem' }}>📄</div>
          <h3 style={{ margin: 0 }}>Document not found</h3>
          <p className="muted" style={{ margin: 0 }}>This document may have been deleted or the link is out of date.</p>
          <Button variant="accent" onClick={() => nav('/studio')} style={{ marginTop: 4 }}>
            <Icon name="layers" size={16} /> Back to Studio
          </Button>
        </Card>
      </div>
    );
  }

  const accent = doc.accent || '#5b4bf5';
  const deals = getDeals().filter(d => d.status === 'open');
  const selBlock = doc.blocks.find(b => b.id === selected) || null;

  /* ---------- drag + drop (palette -> canvas, canvas reorder) ---------- */
  const onCanvasDrop = () => {
    if (!drag || overIndex == null) { setDrag(null); setOverIndex(null); return; }
    if (drag.kind === 'new') {
      const { block } = addBlock(id, drag.type, overIndex);
      setSelected(block.id);
    } else if (drag.kind === 'move' && drag.blockId) {
      reorderBlock(id, drag.blockId, overIndex);
    }
    setDrag(null); setOverIndex(null);
  };

  const addAtEnd = (type) => {
    const { block } = addBlock(id, type);
    setSelected(block.id);
    toast(`${blockMeta(type).label} block added.`);
  };

  const doRemove = (blockId) => {
    removeBlock(id, blockId);
    if (selected === blockId) setSelected(null);
  };

  const move = (blockId, dir) => {
    const idx = doc.blocks.findIndex(b => b.id === blockId);
    reorderBlock(id, blockId, idx + dir);
  };

  return (
    <div className="db-shell page-in">
      <BuilderStyles />

      {/* ---------- top bar ---------- */}
      <div className="db-topbar">
        <button className="btn btn-quiet" onClick={() => nav('/studio')} style={{ padding: '.4rem .6rem' }}>
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} /> Studio
        </button>
        <input className="db-name" value={doc.name}
          onChange={e => updateDoc(id, { name: e.target.value })}
          placeholder="Untitled document" />
        <div className="row gap-1" style={{ flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={() => setPreview(true)}><Icon name="receipt" size={15} /> <span className="hide-520">Preview</span></Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Icon name="download" size={15} /> <span className="hide-520">PDF</span></Button>
          <Button variant="accent" size="sm" onClick={() => toast('Saved. Every edit autosaves.')}><Icon name="check" size={15} /> Save</Button>
        </div>
      </div>

      {/* ---------- three panes ---------- */}
      <div className="db-panes">
        {/* LEFT: palette */}
        <aside className="db-palette">
          <div className="db-pane-head">Blocks</div>
          <div className="db-palette-list">
            {BLOCK_TYPES.map(b => (
              <button key={b.type} className="db-chip"
                draggable
                onDragStart={() => { setDrag({ kind: 'new', type: b.type }); }}
                onDragEnd={() => { setDrag(null); setOverIndex(null); }}
                onClick={() => addAtEnd(b.type)}
                title={`Add ${b.label}`}>
                <span className="db-chip-icon" style={{ color: accent }}><Icon name={b.icon} size={17} /></span>
                <span className="col" style={{ gap: 0, minWidth: 0, textAlign: 'left' }}>
                  <strong className="clip">{b.label}</strong>
                  <span className="t-xs muted clip">{b.blurb}</span>
                </span>
                <Icon name="plus" size={14} className="db-chip-plus" />
              </button>
            ))}
          </div>
          <div className="db-palette-hint">Click to append, or drag onto the canvas to place.</div>
        </aside>

        {/* CENTER: canvas */}
        <main className="db-canvas"
          onDragOver={(e) => { if (drag) { e.preventDefault(); if (overIndex == null) setOverIndex(doc.blocks.length); } }}
          onDrop={onCanvasDrop}
          onClick={() => setSelected(null)}>
          <div className="db-paper" onClick={(e) => e.stopPropagation()}>
            {doc.blocks.length === 0 && (
              <div className="db-empty">
                <Icon name="layers" size={30} />
                <strong>Empty canvas</strong>
                <span className="muted">Add a block from the left, or drag one here.</span>
              </div>
            )}

            {doc.blocks.map((b, i) => (
              <React.Fragment key={b.id}>
                <DropZone index={i} active={drag && overIndex === i} onOver={() => setOverIndex(i)} />
                <BlockShell
                  block={b}
                  accent={accent}
                  selected={selected === b.id}
                  first={i === 0}
                  last={i === doc.blocks.length - 1}
                  dragging={drag && drag.kind === 'move' && drag.blockId === b.id}
                  onSelect={() => setSelected(b.id)}
                  onDragStart={() => setDrag({ kind: 'move', blockId: b.id })}
                  onDragEnd={() => { setDrag(null); setOverIndex(null); }}
                  onRemove={() => doRemove(b.id)}
                  onMoveUp={() => move(b.id, -1)}
                  onMoveDown={() => move(b.id, 2)}
                  onInline={(patch) => updateBlock(id, b.id, patch)}
                />
              </React.Fragment>
            ))}
            <DropZone index={doc.blocks.length} active={drag && overIndex === doc.blocks.length} onOver={() => setOverIndex(doc.blocks.length)} tail />
          </div>
        </main>

        {/* RIGHT: inspector */}
        <aside className="db-inspector">
          <div className="db-pane-head">{selBlock ? `${blockMeta(selBlock.type).label} block` : 'Document'}</div>
          <div className="db-inspector-body">
            {selBlock
              ? <BlockInspector docId={id} block={selBlock} accent={accent} deals={deals} onClose={() => setSelected(null)} />
              : <DocInspector doc={doc} deals={deals} />}
          </div>
        </aside>
      </div>

      {/* preview modal */}
      {preview && (
        <Modal open onClose={() => setPreview(false)} width={840}
          title={`Preview - ${doc.name}`}
          footer={
            <>
              <Button variant="quiet" onClick={() => setPreview(false)}>Close</Button>
              <Button variant="ghost" onClick={() => window.print()}><Icon name="download" size={16} /> Download PDF</Button>
            </>
          }>
          <DocRender doc={doc} accent={accent} />
        </Modal>
      )}

      {/* hidden print doc (owns the print stylesheet) */}
      <DocRender doc={doc} accent={accent} printRoot />
    </div>
  );
}

/* ============================================================
   DROP ZONE  (animated insertion line)
   ============================================================ */
function DropZone({ index, active, onOver, tail }) {
  return (
    <div className={`db-dropzone${tail ? ' db-dropzone-tail' : ''}${active ? ' db-dropzone-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); onOver(); }}>
      <span className="db-dropline" />
    </div>
  );
}

/* ============================================================
   BLOCK SHELL  (canvas wrapper: select, drag, controls, inline edit)
   ============================================================ */
function BlockShell({ block, accent, selected, first, last, dragging, onSelect, onDragStart, onDragEnd, onRemove, onMoveUp, onMoveDown, onInline }) {
  const inlineType = block.type === 'heading' || block.type === 'text';
  return (
    <div className={`db-block${selected ? ' db-block-sel' : ''}${dragging ? ' db-block-dragging' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={selected ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}>

      {/* floating controls */}
      <div className="db-block-tools" onClick={(e) => e.stopPropagation()}>
        <button className="db-tool db-grip" title="Drag to reorder"
          draggable onDragStart={onDragStart} onDragEnd={onDragEnd}><Icon name="list" size={14} /></button>
        <button className="db-tool" title="Move up" disabled={first} onClick={onMoveUp}><Icon name="arrowUp" size={14} /></button>
        <button className="db-tool" title="Move down" disabled={last} onClick={onMoveDown}><Icon name="arrowDown" size={14} /></button>
        <button className="db-tool db-tool-del" title="Remove" onClick={onRemove}><Icon name="x" size={14} /></button>
      </div>

      <span className="db-block-tag" style={{ color: accent }}>{blockMeta(block.type).label}</span>

      {/* inline editable for text/heading when selected; else the real render */}
      {selected && inlineType ? (
        <div className="db-inline-wrap">
          {block.type === 'heading'
            ? <input className="db-inline-h" value={block.config.text || ''} onChange={e => onInline({ text: e.target.value })} placeholder="Section heading" autoFocus />
            : <textarea className="db-inline-t" value={block.config.text || ''} onChange={e => onInline({ text: e.target.value })} placeholder="Write your narrative..." rows={4} autoFocus />}
          <span className="db-inline-hint">Editing inline - formatting shown in preview</span>
        </div>
      ) : (
        <BlockBody block={block} accent={accent} />
      )}
    </div>
  );
}

/* ============================================================
   DOC INSPECTOR  (settings when nothing is selected)
   ============================================================ */
function DocInspector({ doc, deals }) {
  const linkedCo = doc.dealId ? getCompany(getDeal(doc.dealId)?.companyId) : null;
  return (
    <div className="col gap-3">
      <Field label="Document name">
        <Input value={doc.name} onChange={e => updateDoc(doc.id, { name: e.target.value })} />
      </Field>

      <Field label="Accent color" hint="Drives the cover, headings, and pricing highlight.">
        <div className="db-swatches">
          {ACCENTS.map(c => (
            <button key={c} className={`db-swatch${doc.accent === c ? ' on' : ''}`} style={{ background: c }}
              onClick={() => updateDoc(doc.id, { accent: c })} aria-label={`Accent ${c}`} />
          ))}
        </div>
      </Field>

      <Field label="Link to deal" hint="Pricing tables auto-fill from the deal's live line items.">
        <Select value={doc.dealId || ''} onChange={e => linkDocToDeal(doc.id, e.target.value || null)}>
          <option value="">No deal (manual pricing)</option>
          {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>

      {linkedCo && (
        <Card className="col gap-1" style={{ padding: '.9rem 1rem', background: 'var(--n-25)' }}>
          <span className="eyebrow">Bound account</span>
          <strong>{linkedCo.name}</strong>
          <span className="t-sm muted">{linkedCo.industry} - {linkedCo.location}</span>
        </Card>
      )}

      <div className="db-tip">
        <Icon name="sparkles" size={15} /> Select any block on the canvas to edit its content here.
      </div>
    </div>
  );
}

/* ============================================================
   BLOCK INSPECTOR  (per-type config editors)
   ============================================================ */
function BlockInspector({ docId, block, accent, deals, onClose }) {
  const c = block.config || {};
  const set = (patch) => updateBlock(docId, block.id, patch);
  const t = block.type;

  return (
    <div className="col gap-3">
      {t === 'cover' && (
        <>
          <Field label="Eyebrow"><Input value={c.eyebrow || ''} onChange={e => set({ eyebrow: e.target.value })} /></Field>
          <Field label="Title"><Textarea rows={2} value={c.title || ''} onChange={e => set({ title: e.target.value })} /></Field>
          <Field label="Subtitle"><Textarea rows={2} value={c.subtitle || ''} onChange={e => set({ subtitle: e.target.value })} /></Field>
          <Field label="Prepared for"><Input value={c.preparedFor || ''} onChange={e => set({ preparedFor: e.target.value })} /></Field>
          <Field label="Prepared by"><Input value={c.preparedBy || ''} onChange={e => set({ preparedBy: e.target.value })} /></Field>
        </>
      )}

      {t === 'heading' && (
        <>
          <Field label="Text"><Input value={c.text || ''} onChange={e => set({ text: e.target.value })} /></Field>
          <Field label="Alignment">
            <div className="db-swatches">
              {['left', 'center', 'right'].map(a => (
                <button key={a} className={`db-align${(c.align || 'left') === a ? ' on' : ''}`} onClick={() => set({ align: a })}>{a}</button>
              ))}
            </div>
          </Field>
        </>
      )}

      {t === 'text' && (
        <Field label="Body" hint="Line breaks become paragraphs.">
          <Textarea rows={8} value={c.text || ''} onChange={e => set({ text: e.target.value })} />
        </Field>
      )}

      {t === 'pricingTable' && <PricingInspector docId={docId} block={block} deals={deals} set={set} />}

      {t === 'team' && <TeamInspector c={c} set={set} />}

      {t === 'testimonial' && (
        <>
          <Field label="Quote"><Textarea rows={4} value={c.quote || ''} onChange={e => set({ quote: e.target.value })} /></Field>
          <Field label="Author"><Input value={c.author || ''} onChange={e => set({ author: e.target.value })} /></Field>
          <Field label="Role"><Input value={c.role || ''} onChange={e => set({ role: e.target.value })} /></Field>
          <Field label="Company"><Input value={c.company || ''} onChange={e => set({ company: e.target.value })} /></Field>
        </>
      )}

      {t === 'image' && (
        <>
          <Field label="Image URL" hint="Any public image link."><Input value={c.url || ''} onChange={e => set({ url: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Caption"><Input value={c.caption || ''} onChange={e => set({ caption: e.target.value })} /></Field>
          <Field label="Max height"><Input type="number" value={c.height || 260} onChange={e => set({ height: Number(e.target.value) || 260 })} /></Field>
        </>
      )}

      {t === 'signature' && (
        <>
          <Field label="Party label"><Input value={c.partyLabel || ''} onChange={e => set({ partyLabel: e.target.value })} /></Field>
          <Field label="Signer name"><Input value={c.name || ''} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Signer title"><Input value={c.title || ''} onChange={e => set({ title: e.target.value })} /></Field>
        </>
      )}

      {t === 'cta' && (
        <>
          <Field label="Headline"><Input value={c.headline || ''} onChange={e => set({ headline: e.target.value })} /></Field>
          <Field label="Subtext"><Textarea rows={2} value={c.sub || ''} onChange={e => set({ sub: e.target.value })} /></Field>
          <Field label="Button text"><Input value={c.buttonText || ''} onChange={e => set({ buttonText: e.target.value })} /></Field>
        </>
      )}

      {t === 'divider' && <p className="muted" style={{ margin: 0 }}>A divider has no settings. Use it to break sections.</p>}

      <button className="btn btn-quiet" onClick={onClose} style={{ justifyContent: 'flex-start' }}>
        <Icon name="chevronRight" size={15} style={{ transform: 'rotate(180deg)' }} /> Back to document settings
      </button>
    </div>
  );
}

function PricingInspector({ docId, block, deals, set }) {
  const c = block.config || {};
  const source = c.source || (c.dealId ? 'deal' : 'manual');
  const resolved = resolvePricing(c);
  const lines = c.lines || [];

  const setLine = (lid, patch) => set({ lines: lines.map(l => l.id === lid ? { ...l, ...patch } : l) });
  const addLine = () => set({ lines: [...lines, { id: `dl_${Date.now().toString(36)}`, name: 'New line', qty: 1, unitPrice: 0 }] });
  const rmLine = (lid) => set({ lines: lines.filter(l => l.id !== lid) });

  return (
    <div className="col gap-3">
      <Field label="Table title"><Input value={c.title || ''} onChange={e => set({ title: e.target.value })} /></Field>

      <Field label="Pricing source">
        <div className="db-swatches">
          {[['deal', 'Deal'], ['quote', 'Quote'], ['manual', 'Manual']].map(([v, label]) => (
            <button key={v} className={`db-align${source === v ? ' on' : ''}`}
              onClick={() => set({ source: v })}>{label}</button>
          ))}
        </div>
      </Field>

      {source === 'deal' && (
        <Field label="Deal" hint="Line items bind live - edits on the deal flow here.">
          <Select value={c.dealId || ''} onChange={e => set({ dealId: e.target.value || null })}>
            <option value="">Pick a deal...</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      )}

      {source === 'quote' && (
        <Field label="Quote ID" hint="Bind to an existing quote's lines.">
          <Input value={c.quoteId || ''} onChange={e => set({ quoteId: e.target.value || null })} placeholder="q_..." />
        </Field>
      )}

      {source === 'manual' && (
        <Field label="Line items">
          <div className="col gap-1">
            {lines.map(l => (
              <div key={l.id} className="db-priceline">
                <input className="db-pl-name" value={l.name} onChange={e => setLine(l.id, { name: e.target.value })} placeholder="Item" />
                <input className="db-pl-num" type="number" min="0" value={l.qty} onChange={e => setLine(l.id, { qty: Number(e.target.value) || 0 })} title="Qty" />
                <input className="db-pl-num" type="number" min="0" value={l.unitPrice} onChange={e => setLine(l.id, { unitPrice: Number(e.target.value) || 0 })} title="Unit price" />
                <button className="db-tool db-tool-del" onClick={() => rmLine(l.id)}><Icon name="x" size={13} /></button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addLine} style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={14} /> Add line</Button>
          </div>
        </Field>
      )}

      <div className="db-price-total">
        <span className="muted">Resolved total</span>
        <strong style={{ fontSize: '1.15rem' }}>{money(resolved.total)}</strong>
      </div>

      <Field label="Note"><Input value={c.note || ''} onChange={e => set({ note: e.target.value })} /></Field>
    </div>
  );
}

function TeamInspector({ c, set }) {
  const members = c.members || [];
  const setM = (i, patch) => set({ members: members.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const add = () => set({ members: [...members, { name: '', title: '', blurb: '' }] });
  const rm = (i) => set({ members: members.filter((_, idx) => idx !== i) });
  return (
    <div className="col gap-3">
      <Field label="Section title"><Input value={c.title || ''} onChange={e => set({ title: e.target.value })} /></Field>
      {members.map((m, i) => (
        <Card key={i} className="col gap-2" style={{ padding: '.9rem 1rem', background: 'var(--n-25)' }}>
          <div className="row between"><span className="eyebrow">Member {i + 1}</span>
            <button className="db-tool db-tool-del" onClick={() => rm(i)}><Icon name="x" size={13} /></button></div>
          <Input value={m.name} onChange={e => setM(i, { name: e.target.value })} placeholder="Name" />
          <Input value={m.title} onChange={e => setM(i, { title: e.target.value })} placeholder="Title" />
          <Textarea rows={2} value={m.blurb} onChange={e => setM(i, { blurb: e.target.value })} placeholder="Short bio" />
        </Card>
      ))}
      <Button variant="ghost" size="sm" onClick={add} style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={14} /> Add member</Button>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
function BuilderStyles() {
  return (
    <style>{`
      .db-shell { display: flex; flex-direction: column; height: calc(100vh - 2rem); min-height: 520px; }
      @media (max-width: 860px) { .db-shell { height: auto; } }

      .db-topbar { display: flex; align-items: center; gap: .75rem; padding: .6rem .5rem 1rem; }
      .db-name { flex: 1; min-width: 0; font-size: 1.15rem; font-weight: 700; letter-spacing: -.01em; border: 1px solid transparent;
        background: transparent; border-radius: var(--r-sm); padding: .4rem .55rem; color: var(--ink); }
      .db-name:hover { border-color: var(--line); }
      .db-name:focus { outline: none; border-color: var(--accent); background: var(--paper); box-shadow: 0 0 0 3px rgba(91,75,245,.14); }

      .db-panes { flex: 1; min-height: 0; display: grid; grid-template-columns: 236px minmax(0, 1fr) 320px; gap: 1rem; }
      @media (max-width: 1100px) { .db-panes { grid-template-columns: 200px minmax(0,1fr) 280px; } }
      @media (max-width: 860px) { .db-panes { grid-template-columns: 1fr; height: auto; } }

      .db-palette, .db-inspector { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg);
        display: flex; flex-direction: column; min-height: 0; box-shadow: var(--shadow-sm); }
      .db-pane-head { padding: .9rem 1.1rem; border-bottom: 1px solid var(--line); font-weight: 700; font-size: .78rem;
        letter-spacing: .08em; text-transform: uppercase; color: var(--n-600); flex: none; }
      .db-palette-list { padding: .7rem; overflow-y: auto; display: flex; flex-direction: column; gap: .4rem; flex: 1; }
      .db-inspector-body { padding: 1.1rem; overflow-y: auto; flex: 1; }

      .db-chip { display: flex; align-items: center; gap: .65rem; width: 100%; text-align: left; cursor: grab;
        padding: .6rem .7rem; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper);
        transition: border-color .15s, background .15s, transform .12s var(--ease); }
      .db-chip:hover { border-color: var(--accent-300); background: var(--n-25); transform: translateY(-1px); }
      .db-chip:active { cursor: grabbing; }
      .db-chip-icon { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none; background: var(--accent-50); }
      .db-chip-plus { color: var(--n-400); flex: none; margin-left: auto; }
      .db-palette-hint { padding: .8rem 1.1rem; border-top: 1px solid var(--line); font-size: .78rem; color: var(--n-600); flex: none; }

      .db-canvas { overflow-y: auto; padding: 1.5rem; background: var(--page); border-radius: var(--r-lg); border: 1px solid var(--line); }
      @media (max-width: 860px) { .db-canvas { max-height: 70vh; } }
      .db-paper { max-width: 780px; margin: 0 auto; background: var(--paper); border-radius: var(--r-lg);
        box-shadow: var(--shadow-md); padding: 1.5rem; min-height: 400px; }

      .db-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem;
        min-height: 340px; color: var(--n-400); text-align: center; }
      .db-empty strong { color: var(--ink); font-size: 1.05rem; }

      .db-block { position: relative; border-radius: var(--r-md); padding: .5rem; transition: box-shadow .15s var(--ease), transform .18s var(--ease); animation: dbSlideIn .34s var(--ease) both; }
      .db-block:hover { box-shadow: 0 0 0 1px var(--line-strong); }
      .db-block-sel { }
      .db-block-dragging { opacity: .4; }
      @keyframes dbSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

      .db-block-tag { position: absolute; top: -8px; left: 10px; font-size: .62rem; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; background: var(--paper); padding: 0 .4rem; opacity: 0; transition: opacity .15s; z-index: 3; }
      .db-block:hover .db-block-tag, .db-block-sel .db-block-tag { opacity: 1; }

      .db-block-tools { position: absolute; top: -13px; right: 8px; display: flex; gap: 3px; opacity: 0;
        transition: opacity .15s; z-index: 4; }
      .db-block:hover .db-block-tools, .db-block-sel .db-block-tools { opacity: 1; }
      .db-tool { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; cursor: pointer;
        background: var(--paper); border: 1px solid var(--line-strong); color: var(--n-600); box-shadow: var(--shadow-sm); }
      .db-tool:hover { color: var(--ink); border-color: var(--accent); }
      .db-tool:disabled { opacity: .35; cursor: not-allowed; }
      .db-grip { cursor: grab; } .db-grip:active { cursor: grabbing; }
      .db-tool-del:hover { color: #fff; background: var(--risk); border-color: var(--risk); }

      .db-dropzone { height: 8px; margin: 2px 0; display: flex; align-items: center; }
      .db-dropzone-tail { min-height: 20px; }
      .db-dropline { display: block; width: 100%; height: 3px; border-radius: 999px; background: transparent; transition: background .15s, transform .15s; transform: scaleX(.4); }
      .db-dropzone-active .db-dropline { background: var(--accent); transform: scaleX(1); box-shadow: 0 0 0 3px rgba(91,75,245,.18); }

      .db-inline-wrap { display: flex; flex-direction: column; gap: .4rem; padding: .3rem; }
      .db-inline-h { font-size: clamp(1.4rem, 2.4vw, 1.9rem); font-weight: 700; letter-spacing: -.02em; border: 1px dashed var(--accent-300);
        border-radius: var(--r-sm); padding: .3rem .5rem; background: var(--n-25); color: var(--ink); }
      .db-inline-t { font-size: 1.05rem; line-height: 1.6; border: 1px dashed var(--accent-300); border-radius: var(--r-sm);
        padding: .5rem .6rem; background: var(--n-25); color: var(--ink); resize: vertical; }
      .db-inline-h:focus, .db-inline-t:focus { outline: none; border-style: solid; border-color: var(--accent); }
      .db-inline-hint { font-size: .72rem; color: var(--n-500, var(--n-600)); }

      .db-swatches { display: flex; gap: .4rem; flex-wrap: wrap; }
      .db-swatch { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; box-shadow: var(--shadow-sm); }
      .db-swatch.on { border-color: var(--ink); transform: scale(1.05); }
      .db-align { padding: .4rem .7rem; border-radius: var(--r-sm); border: 1px solid var(--line-strong); background: var(--paper);
        cursor: pointer; font-size: .85rem; font-weight: 600; text-transform: capitalize; color: var(--n-600); }
      .db-align.on { background: var(--accent); border-color: var(--accent); color: #fff; }

      .db-tip { display: flex; gap: .5rem; align-items: flex-start; padding: .8rem .9rem; border-radius: var(--r-md);
        background: var(--accent-50); color: var(--accent-700); font-size: .85rem; line-height: 1.45; }

      .db-priceline { display: grid; grid-template-columns: 1fr 56px 74px 26px; gap: .3rem; align-items: center; }
      .db-pl-name, .db-pl-num { border: 1px solid var(--line-strong); border-radius: 6px; padding: .4rem .5rem; font: inherit; color: var(--ink); background: var(--paper); min-width: 0; }
      .db-pl-num { text-align: right; }
      .db-pl-name:focus, .db-pl-num:focus { outline: none; border-color: var(--accent); }
      .db-price-total { display: flex; justify-content: space-between; align-items: baseline; padding: .7rem .9rem;
        border-radius: var(--r-md); background: var(--n-25); border: 1px solid var(--line); }
    `}</style>
  );
}
