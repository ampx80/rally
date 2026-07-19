// designer/Inspector.jsx
// The Canva/Word-style properties panel for the selected element.
//
// TEXT STYLING has two scopes:
//   - Not editing (element selected): changes apply to the WHOLE text box and
//     clear per-word overrides, so the whole sentence adopts the new style.
//   - Editing (double-clicked in, text selected): the same controls apply ONLY
//     to the selected words/characters, driving true per-word / per-character
//     fonts, sizes, colors, weight, italic, underline and letter spacing.
//
// Plus gradient text, curved text, image filters, lock, layer order, duplicate,
// and delete.
//
// ASCII hyphen only anywhere in this file.

import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  BringToFront, SendToBack, ArrowUp, ArrowDown, Copy, Trash2, Square, SquareStack,
  Lock, Unlock, Type, Sparkles, Spline, ImageIcon, Wand2,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyEnd,
} from 'lucide-react';
import FontPicker from './FontPicker';
import ColorControl from './ColorControl';

const INK = '#0f172a';
const BORDER = 'var(--border, #e2e8f0)';

const label = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 6px' };
const groupBox = { padding: '12px 14px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', marginBottom: 12 };

function Field({ children, title }) {
  return <div style={{ marginBottom: 10 }}>{title && <div style={label}>{title}</div>}{children}</div>;
}

// Thin wrapper so every existing <ColorRow> now gets the palette + recent-colors
// + eyedropper popover for free, with the same (title, value, onChange) contract.
function ColorRow({ title, value, onChange }) {
  return <ColorControl title={title} value={value} onChange={onChange} />;
}

function NumRow({ title, value, min, max, step = 1, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ ...label, margin: 0, width: 92 }}>{title}</div>
      <input type="range" min={min} max={max} step={step} value={clampNum(value, min, max)}
        onChange={(e) => onChange(+e.target.value)} style={{ flex: 1, accentColor: INK }} />
      <input type="number" min={min} max={max} step={step} value={round(value)}
        onChange={(e) => onChange(e.target.value === '' ? min : +e.target.value)}
        style={{ width: 62, padding: '6px 8px', border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
      {suffix && <span style={{ fontSize: 12, color: '#64748b', width: 16 }}>{suffix}</span>}
    </div>
  );
}

function iconBtn(active) {
  return {
    width: 38, height: 36, borderRadius: 8, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 0,
    border: `1.5px solid ${active ? INK : BORDER}`, background: active ? INK : '#fff', color: active ? '#fff' : '#475569',
  };
}

export default function Inspector({ el, onPatch, onWholeText, onLayer, onDuplicate, onDelete, onLock, onEditText, onAlign, onAutoFit, textEditor }) {
  if (!el) {
    return (
      <div style={{ ...groupBox, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
        Select an element on the canvas to edit it, or add one from the toolbar. Double-click any text to type inside it, then select words or letters to give each its own font.
      </div>
    );
  }
  const p = (patch) => onPatch(patch, { commit: true });
  const isText = el.type === 'text';
  const isLine = el.type === 'line';
  const isImage = el.type === 'image';
  const isStar = el.type === 'star';
  const hasFill = el.type === 'rect' || el.type === 'ellipse' || el.type === 'triangle' || el.type === 'star';

  const editing = isText && textEditor && textEditor.id === el.id;
  const cur = editing ? textEditor.current : {
    fontFamily: el.fontFamily, fontSize: el.fontSize, fill: el.fill,
    bold: el.fontWeight === 'bold', italic: !!el.italic, underline: !!el.underline,
    letterSpacing: el.letterSpacing || 0,
  };
  const styleText = (patch) => { if (editing) textEditor.applyToSelection(patch); else onWholeText(patch); };
  const tg = el.textGradient || {};

  return (
    <div>
      {/* Arrange + lock + actions */}
      <div style={{ ...groupBox, marginBottom: 12 }}>
        <div style={{ ...label, marginTop: 0 }}>Arrange</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" title="Bring to front" style={iconBtn(false)} onClick={() => onLayer('front')}><BringToFront size={16} /></button>
          <button type="button" title="Forward" style={iconBtn(false)} onClick={() => onLayer('forward')}><ArrowUp size={16} /></button>
          <button type="button" title="Backward" style={iconBtn(false)} onClick={() => onLayer('backward')}><ArrowDown size={16} /></button>
          <button type="button" title="Send to back" style={iconBtn(false)} onClick={() => onLayer('back')}><SendToBack size={16} /></button>
          <button type="button" title={el.locked ? 'Unlock' : 'Lock'} style={iconBtn(!!el.locked)} onClick={onLock}>{el.locked ? <Lock size={16} /> : <Unlock size={16} />}</button>
          <div style={{ flex: 1 }} />
          <button type="button" title="Duplicate (Ctrl+D)" style={iconBtn(false)} onClick={onDuplicate}><Copy size={16} /></button>
          <button type="button" title="Delete (Del)" style={{ ...iconBtn(false), color: '#b91c1c', borderColor: '#f0c4c4' }} onClick={onDelete}><Trash2 size={16} /></button>
        </div>

        {onAlign && (
          <>
            <div style={{ ...label, marginTop: 12 }}>Align on the canvas</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" title="Align left edge" style={iconBtn(false)} onClick={() => onAlign('left')}><AlignHorizontalJustifyStart size={16} /></button>
              <button type="button" title="Center left to right" style={iconBtn(false)} onClick={() => onAlign('centerH')}><AlignHorizontalJustifyCenter size={16} /></button>
              <button type="button" title="Align right edge" style={iconBtn(false)} onClick={() => onAlign('right')}><AlignHorizontalJustifyEnd size={16} /></button>
              <div style={{ width: 8 }} />
              <button type="button" title="Align top edge" style={iconBtn(false)} onClick={() => onAlign('top')}><AlignVerticalJustifyStart size={16} /></button>
              <button type="button" title="Center top to bottom" style={iconBtn(false)} onClick={() => onAlign('centerV')}><AlignVerticalJustifyCenter size={16} /></button>
              <button type="button" title="Align bottom edge" style={iconBtn(false)} onClick={() => onAlign('bottom')}><AlignVerticalJustifyEnd size={16} /></button>
            </div>
          </>
        )}
      </div>

      {/* Text controls */}
      {isText && (
        <div style={groupBox}>
          <div style={{ ...label, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Type size={13} /> Text
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: editing ? '#5b4bf5' : '#94a3b8', marginBottom: 8 }}>
            {editing ? (cur.hasSelection ? 'Styling selected words / letters' : 'Styling the whole text box') : 'Styling the whole text box'}
          </div>
          {!editing && (onEditText || onAutoFit) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {onEditText && (
                <button type="button" onClick={onEditText}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px',
                    borderRadius: 8, border: `1.5px solid ${INK}`, background: INK, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700 }}>
                  <Type size={15} /> Edit words
                </button>
              )}
              {onAutoFit && (
                <button type="button" onClick={onAutoFit} title="Resize the text so it fills the box without clipping"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px',
                    borderRadius: 8, border: `1.5px solid ${INK}`, background: '#fff', color: INK, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700 }}>
                  <Wand2 size={15} /> Auto-fit size
                </button>
              )}
            </div>
          )}
          <Field>
            <FontPicker value={cur.fontFamily} onChange={(name) => styleText({ fontFamily: name })} />
          </Field>
          <NumRow title="Size" value={cur.fontSize} min={8} max={400} onChange={(v) => styleText({ fontSize: v })} suffix="px" />
          <ColorRow title="Text color" value={cur.fill} onChange={(v) => styleText({ fill: v })} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button type="button" title="Bold" style={{ ...iconBtn(cur.bold), fontWeight: 900 }} onClick={() => styleText({ bold: !cur.bold })}><Bold size={16} /></button>
            <button type="button" title="Italic" style={iconBtn(cur.italic)} onClick={() => styleText({ italic: !cur.italic })}><Italic size={16} /></button>
            <button type="button" title="Underline" style={iconBtn(cur.underline)} onClick={() => styleText({ underline: !cur.underline })}><Underline size={16} /></button>
            <div style={{ width: 8 }} />
            <button type="button" title="Align left" style={iconBtn(el.align === 'left')} onClick={() => p({ align: 'left' })}><AlignLeft size={16} /></button>
            <button type="button" title="Align center" style={iconBtn(el.align === 'center')} onClick={() => p({ align: 'center' })}><AlignCenter size={16} /></button>
            <button type="button" title="Align right" style={iconBtn(el.align === 'right')} onClick={() => p({ align: 'right' })}><AlignRight size={16} /></button>
            <button type="button" title="Justify" style={iconBtn(el.align === 'justify')} onClick={() => p({ align: 'justify' })}><AlignJustify size={16} /></button>
          </div>
          <NumRow title="Letter space" value={cur.letterSpacing} min={-5} max={40} step={0.5} onChange={(v) => styleText({ letterSpacing: v })} />
          <NumRow title="Line height" value={el.lineHeight} min={0.8} max={2.5} step={0.05} onChange={(v) => p({ lineHeight: v })} />
        </div>
      )}

      {/* Gradient text + curve (element level) */}
      {isText && (
        <div style={groupBox}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tg.enabled ? 10 : 0, fontSize: 14, fontWeight: 700, color: INK, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!tg.enabled} onChange={(e) => p({ textGradient: { ...tg, enabled: e.target.checked } })} style={{ width: 16, height: 16, accentColor: INK }} />
            <Sparkles size={14} /> Gradient text
          </label>
          {tg.enabled && (
            <>
              <div style={{ display: 'flex', gap: 14, margin: '4px 0 10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INK }}>
                  From <input type="color" value={toHex(tg.from)} onChange={(e) => p({ textGradient: { ...tg, from: e.target.value } })} style={{ width: 38, height: 30, border: `1.5px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INK }}>
                  To <input type="color" value={toHex(tg.to)} onChange={(e) => p({ textGradient: { ...tg, to: e.target.value } })} style={{ width: 38, height: 30, border: `1.5px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }} />
                </label>
              </div>
              <NumRow title="Angle" value={tg.angle ?? 90} min={0} max={360} onChange={(v) => p({ textGradient: { ...tg, angle: v } })} suffix="deg" />
            </>
          )}
          <div style={{ ...label, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Spline size={13} /> Curve text</div>
          <NumRow title="Arc" value={el.curve || 0} min={-100} max={100} onChange={(v) => p({ curve: v })} />
        </div>
      )}

      {/* Box: fill + border + radius */}
      {(isText || hasFill) && (
        <div style={groupBox}>
          <div style={{ ...label, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Square size={13} /> {isText ? 'Text box' : 'Fill & border'}
          </div>
          {isText && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14, fontWeight: 700, color: INK, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!el.boxEnabled} onChange={(e) => p({ boxEnabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: INK }} />
              Fill the box behind the text
            </label>
          )}
          {(isText ? el.boxEnabled : true) && <ColorRow title="Fill color" value={el.boxFill} onChange={(v) => p({ boxFill: v })} />}
          <NumRow title="Border" value={el.strokeWidth} min={0} max={40} onChange={(v) => p({ strokeWidth: v })} suffix="px" />
          {el.strokeWidth > 0 && <ColorRow title="Border color" value={el.stroke} onChange={(v) => p({ stroke: v })} />}
          {el.type !== 'ellipse' && el.type !== 'triangle' && !isStar && <NumRow title="Corner" value={el.cornerRadius} min={0} max={120} onChange={(v) => p({ cornerRadius: v })} suffix="px" />}
          {isStar && (
            <>
              <NumRow title="Points" value={el.points || 5} min={3} max={16} onChange={(v) => p({ points: Math.round(v) })} />
              <NumRow title="Inner" value={el.innerRatio || 0.5} min={0.2} max={0.9} step={0.05} onChange={(v) => p({ innerRatio: v })} />
            </>
          )}
        </div>
      )}

      {/* Line controls */}
      {isLine && (
        <div style={groupBox}>
          <div style={{ ...label, marginTop: 0 }}>Line</div>
          <ColorRow title="Color" value={el.stroke} onChange={(v) => p({ stroke: v })} />
          <NumRow title="Thickness" value={el.strokeWidth} min={1} max={40} onChange={(v) => p({ strokeWidth: v })} suffix="px" />
        </div>
      )}

      {/* Image controls + filters */}
      {isImage && (
        <div style={groupBox}>
          <div style={{ ...label, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><ImageIcon size={13} /> Image</div>
          <NumRow title="Corner" value={el.cornerRadius} min={0} max={400} onChange={(v) => p({ cornerRadius: v })} suffix="px" />
          <NumRow title="Border" value={el.strokeWidth} min={0} max={40} onChange={(v) => p({ strokeWidth: v })} suffix="px" />
          {el.strokeWidth > 0 && <ColorRow title="Border color" value={el.stroke} onChange={(v) => p({ stroke: v })} />}
          <div style={{ ...label, marginTop: 6 }}>Filters</div>
          {(() => { const f = el.filters || {}; const setF = (patch) => p({ filters: { ...f, ...patch } }); return (
            <>
              <NumRow title="Grayscale" value={f.grayscale || 0} min={0} max={1} step={0.05} onChange={(v) => setF({ grayscale: v })} />
              <NumRow title="Sepia" value={f.sepia || 0} min={0} max={1} step={0.05} onChange={(v) => setF({ sepia: v })} />
              <NumRow title="Brightness" value={f.brightness ?? 1} min={0.4} max={1.8} step={0.05} onChange={(v) => setF({ brightness: v })} />
              <NumRow title="Contrast" value={f.contrast ?? 1} min={0.4} max={1.8} step={0.05} onChange={(v) => setF({ contrast: v })} />
              <NumRow title="Blur" value={f.blur || 0} min={0} max={12} step={0.5} onChange={(v) => setF({ blur: v })} suffix="px" />
            </>
          ); })()}
        </div>
      )}

      {/* Shadow (everything except line) */}
      {!isLine && (
        <div style={groupBox}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: el.shadowEnabled ? 10 : 0, fontSize: 14, fontWeight: 700, color: INK, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!el.shadowEnabled} onChange={(e) => p({ shadowEnabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: INK }} />
            <SquareStack size={14} /> Shadow (3D depth)
          </label>
          {el.shadowEnabled && (
            <>
              <ColorRow title="Shadow color" value={el.shadowColor} onChange={(v) => p({ shadowColor: v })} />
              <NumRow title="Blur" value={el.shadowBlur} min={0} max={80} onChange={(v) => p({ shadowBlur: v })} />
              <NumRow title="Distance" value={el.shadowOffsetY} min={-40} max={60} onChange={(v) => p({ shadowOffsetY: v, shadowOffsetX: Math.round(v * 0.2) })} />
              <NumRow title="Strength" value={el.shadowOpacity} min={0} max={1} step={0.05} onChange={(v) => p({ shadowOpacity: v })} />
            </>
          )}
        </div>
      )}

      {/* Position / size / rotation / opacity */}
      <div style={groupBox}>
        <div style={{ ...label, marginTop: 0 }}>Position & size</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <MiniNum title="X" value={el.x} onChange={(v) => p({ x: v })} />
          <MiniNum title="Y" value={el.y} onChange={(v) => p({ y: v })} />
        </div>
        {!isLine && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <MiniNum title="W" value={el.width} onChange={(v) => p({ width: Math.max(10, v) })} />
            {!isText && <MiniNum title="H" value={el.height} onChange={(v) => p({ height: Math.max(10, v) })} />}
          </div>
        )}
        {isLine && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <MiniNum title="Len" value={el.width} onChange={(v) => p({ width: Math.max(10, v) })} />
          </div>
        )}
        <NumRow title="Rotation" value={el.rotation} min={0} max={360} onChange={(v) => p({ rotation: v })} suffix="deg" />
        <NumRow title="Opacity" value={el.opacity} min={0} max={1} step={0.05} onChange={(v) => p({ opacity: v })} />
      </div>
    </div>
  );
}

function MiniNum({ title, value, onChange }) {
  return (
    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: '4px 8px', background: '#fff' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>{title}</span>
      <input type="number" value={round(value)} onChange={(e) => onChange(e.target.value === '' ? 0 : +e.target.value)}
        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: INK, background: 'transparent' }} />
    </label>
  );
}

function toHex(v) {
  if (!v) return '#000000';
  if (v[0] === '#') return v.length === 4 ? '#' + v.slice(1).split('').map((c) => c + c).join('') : v.slice(0, 7);
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  return '#000000';
}
const round = (v) => (Number.isFinite(+v) ? Math.round(+v) : 0);
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : lo));
