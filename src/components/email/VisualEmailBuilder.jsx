// VisualEmailBuilder - Ardova's drag-drop, block-model email builder. Produces
// email-safe responsive HTML (via src/lib/email-blocks.renderEmailHtml) that the
// real send path (api/broadcast.js) ships verbatim. Reorder by drag or arrows;
// live device-framed preview; starter templates. NO em-dash / en-dash. ASCII.
import React, { useMemo, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Button, Input, Select, Textarea } from '../UI.jsx';
import { applyTokens } from '../../lib/marketing-campaigns.js';
import {
  BLOCK_TYPES, makeBlock, renderEmailHtml, renderDoc, EMAIL_TEMPLATES, DEFAULT_SETTINGS,
} from '../../lib/email-blocks.js';
import './email-builder.css';

function LField({ label, children, wide }) {
  return (
    <label className="eb-f" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const ALIGN_OPTS = [['left', 'Left'], ['center', 'Center'], ['right', 'Right']];
function AlignPicker({ value, onChange }) {
  return (
    <div className="eb-align">
      {ALIGN_OPTS.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)} title={l}>
          <Icon name={v === 'left' ? 'list' : v === 'center' ? 'columns' : 'list'} size={13} />{l[0]}
        </button>
      ))}
    </div>
  );
}

// Editor for one simple element (top-level or inside a column cell).
function ElementFields({ el, onPatch }) {
  const p = (k, v) => onPatch({ ...el, [k]: v });
  switch (el.type) {
    case 'heading':
      return (
        <div className="eb-grid">
          <LField label="Heading text" wide><Input value={el.text} onChange={e => p('text', e.target.value)} /></LField>
          <LField label="Level"><Select value={el.level} onChange={e => p('level', e.target.value)}><option value="h1">H1</option><option value="h2">H2</option></Select></LField>
          <LField label="Size"><Input type="number" value={el.size} onChange={e => p('size', +e.target.value)} /></LField>
          <LField label="Align"><AlignPicker value={el.align} onChange={v => p('align', v)} /></LField>
          <LField label="Color"><input type="color" value={el.color || DEFAULT_SETTINGS.textColor} onChange={e => p('color', e.target.value)} /></LField>
        </div>
      );
    case 'text':
      return (
        <div className="eb-grid">
          <LField label="Text" wide><Textarea rows={4} value={el.text} onChange={e => p('text', e.target.value)} /></LField>
          <LField label="Size"><Input type="number" value={el.size} onChange={e => p('size', +e.target.value)} /></LField>
          <LField label="Align"><AlignPicker value={el.align} onChange={v => p('align', v)} /></LField>
          <LField label="Color"><input type="color" value={el.color || DEFAULT_SETTINGS.textColor} onChange={e => p('color', e.target.value)} /></LField>
        </div>
      );
    case 'button':
      return (
        <div className="eb-grid">
          <LField label="Label"><Input value={el.text} onChange={e => p('text', e.target.value)} /></LField>
          <LField label="Link URL"><Input value={el.href} onChange={e => p('href', e.target.value)} placeholder="https://" /></LField>
          <LField label="Align"><AlignPicker value={el.align} onChange={v => p('align', v)} /></LField>
          <LField label="Radius"><Input type="number" value={el.radius} onChange={e => p('radius', +e.target.value)} /></LField>
          <LField label="Fill"><input type="color" value={el.bg || DEFAULT_SETTINGS.accent} onChange={e => p('bg', e.target.value)} /></LField>
          <LField label="Text color"><input type="color" value={el.color || '#ffffff'} onChange={e => p('color', e.target.value)} /></LField>
        </div>
      );
    case 'image':
      return (
        <div className="eb-grid">
          <LField label="Image URL" wide><Input value={el.src} onChange={e => p('src', e.target.value)} placeholder="https://..." /></LField>
          <LField label="Alt text"><Input value={el.alt} onChange={e => p('alt', e.target.value)} /></LField>
          <LField label="Link (optional)"><Input value={el.href} onChange={e => p('href', e.target.value)} placeholder="https://" /></LField>
          <LField label="Align"><AlignPicker value={el.align} onChange={v => p('align', v)} /></LField>
          <LField label={`Width ${el.width}%`}><input type="range" min="20" max="100" value={el.width} onChange={e => p('width', +e.target.value)} /></LField>
        </div>
      );
    case 'divider':
      return (
        <div className="eb-grid">
          <LField label="Color"><input type="color" value={el.color} onChange={e => p('color', e.target.value)} /></LField>
          <LField label="Thickness"><Input type="number" value={el.thickness} onChange={e => p('thickness', +e.target.value)} /></LField>
        </div>
      );
    case 'spacer':
      return <div className="eb-grid"><LField label={`Height ${el.height}px`} wide><input type="range" min="4" max="80" value={el.height} onChange={e => p('height', +e.target.value)} /></LField></div>;
    case 'social':
      return (
        <div className="eb-social">
          {(el.links || []).map((l, i) => (
            <div key={i} className="eb-social-row">
              <Select value={l.platform} onChange={e => { const links = [...el.links]; links[i] = { ...l, platform: e.target.value }; p('links', links); }}>
                {['x', 'linkedin', 'facebook', 'instagram', 'youtube', 'github', 'web'].map(pf => <option key={pf} value={pf}>{pf}</option>)}
              </Select>
              <Input value={l.href} placeholder="https://" onChange={e => { const links = [...el.links]; links[i] = { ...l, href: e.target.value }; p('links', links); }} />
              <button type="button" className="eb-x" onClick={() => p('links', el.links.filter((_, j) => j !== i))}><Icon name="x" size={13} /></button>
            </div>
          ))}
          <Button variant="quiet" size="sm" onClick={() => p('links', [...(el.links || []), { platform: 'web', href: 'https://' }])}><Icon name="plus" size={13} /> Add link</Button>
        </div>
      );
    default:
      return null;
  }
}

function ColumnCell({ side, el, onPatch }) {
  return (
    <div className="eb-col-cell">
      <div className="eb-col-head">
        <span>{side}</span>
        <Select value={el.type} onChange={e => onPatch({ ...makeBlock(e.target.value), align: el.align })}>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="button">Button</option>
        </Select>
      </div>
      <ElementFields el={el} onPatch={onPatch} />
    </div>
  );
}

// `target` defaults to 'email' so every existing caller (Campaigns) is
// byte-for-byte unchanged. When target='landing', the live preview renders
// through the shared landing renderer (renderDoc) instead of the email one,
// and a couple of setting labels adapt to the channel. Everything else - the
// block palette, editor, drag/reorder, templates - is identical.
export default function VisualEmailBuilder({ doc, onChange, sampleVars, target = 'email' }) {
  const isLanding = target === 'landing';
  const [selected, setSelected] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [showAdd, setShowAdd] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const dragIdx = useRef(null);

  const settings = { ...DEFAULT_SETTINGS, ...(doc?.settings || {}) };
  const blocks = Array.isArray(doc?.blocks) ? doc.blocks : [];

  const setBlocks = (next) => onChange({ ...doc, blocks: next });
  const setSettings = (patch) => onChange({ ...doc, settings: { ...settings, ...patch } });
  const patchBlock = (id, next) => setBlocks(blocks.map(b => b.id === id ? next : b));
  const addBlock = (type) => { const b = makeBlock(type); setBlocks([...blocks, b]); setSelected(b.id); setShowAdd(false); };
  const removeBlock = (id) => { setBlocks(blocks.filter(b => b.id !== id)); if (selected === id) setSelected(null); };
  const dupBlock = (id) => { const i = blocks.findIndex(b => b.id === id); if (i < 0) return; const copy = { ...blocks[i], id: makeBlock(blocks[i].type).id }; const next = [...blocks]; next.splice(i + 1, 0, copy); setBlocks(next); };
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= blocks.length) return; const next = [...blocks]; const [x] = next.splice(i, 1); next.splice(j, 0, x); setBlocks(next); };
  const onDrop = (i) => { const from = dragIdx.current; dragIdx.current = null; if (from == null || from === i) return; const next = [...blocks]; const [x] = next.splice(from, 1); next.splice(i, 0, x); setBlocks(next); };

  const previewHtml = useMemo(() => {
    const raw = isLanding
      ? renderDoc(doc, { target: 'landing', subject: 'Preview' })
      : renderEmailHtml(doc, { subject: 'Preview' });
    return applyTokens(raw, sampleVars || {});
  }, [doc, sampleVars, isLanding]);

  return (
    <div className="eb">
      {/* toolbar */}
      <div className="eb-toolbar">
        <div className="eb-menu-wrap">
          <Button variant="primary" size="sm" onClick={() => { setShowAdd(s => !s); setShowTpl(false); }}><Icon name="plus" size={15} /> Add block</Button>
          {showAdd && (
            <div className="eb-menu">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}><Icon name={bt.icon} size={14} /> {bt.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="eb-menu-wrap">
          <Button variant="quiet" size="sm" onClick={() => { setShowTpl(s => !s); setShowAdd(false); }}><Icon name="grid" size={15} /> Templates</Button>
          {showTpl && (
            <div className="eb-menu">
              {EMAIL_TEMPLATES.map(t => (
                <button key={t.id} type="button" onClick={() => { onChange(t.build()); setSelected(null); setShowTpl(false); }}>
                  <b>{t.name}</b><span className="eb-tpl-sub">{t.preview}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <div className="eb-device">
          <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')} title="Desktop"><Icon name="grid" size={14} /></button>
          <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')} title="Mobile"><Icon name="box" size={14} /></button>
        </div>
      </div>

      <div className="eb-body">
        {/* editor column */}
        <div className="eb-editor">
          <div className="eb-settings">
            <LField label={isLanding ? 'Page background' : 'Background'}><input type="color" value={settings.bg} onChange={e => setSettings({ bg: e.target.value })} /></LField>
            <LField label={isLanding ? 'Content card' : 'Email card'}><input type="color" value={settings.contentBg} onChange={e => setSettings({ contentBg: e.target.value })} /></LField>
            <LField label="Accent"><input type="color" value={settings.accent} onChange={e => setSettings({ accent: e.target.value })} /></LField>
            {isLanding
              ? <LField label="SEO description" wide><Input value={settings.seoDescription || ''} placeholder="Shown in search + social previews" onChange={e => setSettings({ seoDescription: e.target.value })} /></LField>
              : <LField label="Preheader" wide><Input value={settings.preheader} placeholder="Inbox preview text" onChange={e => setSettings({ preheader: e.target.value })} /></LField>}
          </div>

          {blocks.length === 0 && <div className="eb-empty">No blocks yet. Use <b>Add block</b> or pick a template.</div>}

          {blocks.map((b, i) => {
            const meta = BLOCK_TYPES.find(t => t.type === b.type);
            const open = selected === b.id;
            return (
              <div key={b.id} className={`eb-block ${open ? 'open' : ''}`} draggable
                onDragStart={() => { dragIdx.current = i; }} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)}>
                <div className="eb-block-head" onClick={() => setSelected(open ? null : b.id)}>
                  <span className="eb-drag" title="Drag to reorder"><Icon name="move" size={13} /></span>
                  <Icon name={meta?.icon || 'list'} size={14} />
                  <span className="eb-block-name">{meta?.label || b.type}</span>
                  <span style={{ flex: 1 }} />
                  <button type="button" title="Move up" onClick={e => { e.stopPropagation(); move(i, -1); }}><Icon name="arrowUp" size={13} /></button>
                  <button type="button" title="Move down" onClick={e => { e.stopPropagation(); move(i, 1); }}><Icon name="arrowDown" size={13} /></button>
                  <button type="button" title="Duplicate" onClick={e => { e.stopPropagation(); dupBlock(b.id); }}><Icon name="copy" size={13} /></button>
                  <button type="button" title="Delete" onClick={e => { e.stopPropagation(); removeBlock(b.id); }}><Icon name="trash" size={13} /></button>
                </div>
                {open && (
                  <div className="eb-block-body">
                    {b.type === 'columns' ? (
                      <div className="eb-cols">
                        <ColumnCell side="Left" el={b.left} onPatch={(el) => patchBlock(b.id, { ...b, left: el })} />
                        <ColumnCell side="Right" el={b.right} onPatch={(el) => patchBlock(b.id, { ...b, right: el })} />
                      </div>
                    ) : (
                      <ElementFields el={b} onPatch={(el) => patchBlock(b.id, el)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* live preview */}
        <div className="eb-preview">
          <div className="eb-preview-lab">Live preview</div>
          <div className={`eb-frame-wrap ${device}`}>
            <iframe title={isLanding ? 'Landing page preview' : 'Email preview'} className="eb-frame" srcDoc={previewHtml} />
          </div>
        </div>
      </div>
    </div>
  );
}
