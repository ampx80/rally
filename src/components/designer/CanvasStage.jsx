// designer/CanvasStage.jsx
// The direct-manipulation canvas. Renders the background + every element with
// Konva, wires drag / resize / rotate via a Transformer, shows alignment guides
// while dragging, and overlays a real contenteditable for RICH inline text
// editing (per-word / per-character styling).
//
// RICH TEXT: a text element's content is a run model (see richtext.js). We lay
// the runs out ourselves and draw each contiguous same-style segment as its own
// single-line Konva.Text, so mixed fonts/sizes/colors render in one Konva scene
// and export pixel-accurately via stage.toDataURL(). Editing happens in a
// transparent contenteditable positioned over the (hidden) Konva text; the
// browser gives us native caret + selection, and we read per-character styles
// straight off the DOM's computed styles, so the run model always matches what
// the user sees.
//
// ASCII hyphen only anywhere in this file.

import { useEffect, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import { Stage, Layer, Rect, Text, Ellipse, Line, Star, Image as KImage, Group, Transformer } from 'react-konva';
import { CANVAS_PRESETS } from './model';
import { layoutText, layoutCurved, elDefaults } from './richtext';
import { getTheme, themeDataUrl } from './backgrounds';
import { loadFonts } from './fonts';
import useImage from './useImage';

const ACCENT = '#5b4bf5';
const INK = '#0f172a';

/* Gradient endpoints spanning the box for a given angle (degrees). */
function gradientPoints(angle, w, h) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
  return {
    start: { x: w / 2 - dx * half, y: h / 2 - dy * half },
    end: { x: w / 2 + dx * half, y: h / 2 + dy * half },
  };
}

function shadowProps(el) {
  if (!el.shadowEnabled) return { shadowEnabled: false };
  return {
    shadowEnabled: true,
    shadowColor: el.shadowColor || '#000000',
    shadowBlur: el.shadowBlur ?? 16,
    shadowOffsetX: el.shadowOffsetX ?? 0,
    shadowOffsetY: el.shadowOffsetY ?? 8,
    shadowOpacity: el.shadowOpacity ?? 0.35,
  };
}

/* -------------------------------------------------------------------------- */
/* Background                                                                 */
/* -------------------------------------------------------------------------- */

// Intrinsic render multiplier for SVG theme backgrounds (keeps export crisp).
const THEME_SCALE = 2;

function ThemeBackground({ bg, w, h }) {
  const theme = getTheme(bg?.key);
  const src = theme ? themeDataUrl(theme, Math.round(w * THEME_SCALE), Math.round(h * THEME_SCALE)) : null;
  const [img] = useImage(src);
  const tint = bg?.tint || { color: '#000000', alpha: 0 };
  return (
    <>
      <Rect x={0} y={0} width={w} height={h} fill={theme?.dark ? '#0b1220' : '#f5efe1'} listening={false} />
      {img && <KImage image={img} x={0} y={0} width={w} height={h} opacity={bg?.opacity ?? 1} listening={false} />}
      {tint.alpha > 0 && <Rect x={0} y={0} width={w} height={h} fill={tint.color} opacity={tint.alpha} listening={false} />}
    </>
  );
}

function Background({ bg, w, h }) {
  const [img] = useImage(bg?.type === 'image' ? bg.image?.src : null);
  if (bg?.type === 'solid') {
    return <Rect x={0} y={0} width={w} height={h} fill={bg.color || INK} listening={false} />;
  }
  if (bg?.type === 'theme') {
    return <ThemeBackground bg={bg} w={w} h={h} />;
  }
  if (bg?.type === 'image') {
    return (
      <>
        <Rect x={0} y={0} width={w} height={h} fill={bg.color || INK} listening={false} />
        {img && (
          <KImage
            image={img} x={0} y={0} width={w} height={h}
            opacity={bg.image?.opacity ?? 1} listening={false}
            {...coverCrop(img, w, h)}
          />
        )}
      </>
    );
  }
  const g = bg?.gradient || { angle: 120, from: '#1e293b', to: '#0f172a' };
  const { start, end } = gradientPoints(g.angle ?? 120, w, h);
  return (
    <Rect
      x={0} y={0} width={w} height={h} listening={false}
      fillLinearGradientStartPoint={start}
      fillLinearGradientEndPoint={end}
      fillLinearGradientColorStops={[0, g.from, 1, g.to]}
    />
  );
}

function coverCrop(img, w, h) {
  const iw = img.width, ih = img.height;
  if (!iw || !ih) return {};
  const scale = Math.max(w / iw, h / ih);
  const cw = w / scale, ch = h / scale;
  return { crop: { x: (iw - cw) / 2, y: (ih - ch) / 2, width: cw, height: ch } };
}

/* -------------------------------------------------------------------------- */
/* Text node (run layout -> positioned Konva.Text segments)                   */
/* -------------------------------------------------------------------------- */

function TextNode({ el, onSelect, onChange, onDblClick, onDragMove, activeAnchorRef, hidden }) {
  const groupRef = useRef(null);

  const curved = (el.curve || 0) !== 0;
  const layout = curved ? layoutCurved(el) : layoutText(el);
  const boxH = Math.max(layout.height, (el.fontSize || 20) + (el.padding || 0) * 2);
  const framed = el.boxEnabled || el.strokeWidth > 0;

  // Box-wide gradient endpoints (element-local) when text gradient is on.
  const tg = el.textGradient || {};
  const grad = tg.enabled ? gradientPoints(tg.angle ?? 90, el.width || 200, boxH) : null;

  const segFill = (seg) => {
    if (grad) {
      return {
        fillLinearGradientStartPoint: { x: grad.start.x - seg.x, y: grad.start.y - seg.top },
        fillLinearGradientEndPoint: { x: grad.end.x - seg.x, y: grad.end.y - seg.top },
        fillLinearGradientColorStops: [0, tg.from || ACCENT, 1, tg.to || '#3b2fd6'],
      };
    }
    return { fill: seg.style.fill };
  };

  return (
    <Group
      id={el.id} name="element" ref={groupRef}
      x={el.x} y={el.y} rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      visible={!hidden}
      draggable={!el.locked}
      onClick={onSelect} onTap={onSelect}
      onDblClick={onDblClick} onDblTap={onDblClick}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => {
        const node = groupRef.current;
        const sx = node.scaleX(), sy = node.scaleY();
        node.scaleX(1); node.scaleY(1);
        const anchor = activeAnchorRef.current || '';
        const patch = { x: node.x(), y: node.y(), rotation: node.rotation() };
        patch.width = Math.max(60, (el.width || 200) * sx);
        if (anchor !== 'middle-left' && anchor !== 'middle-right') {
          const factor = sy;
          patch.fontSize = Math.max(8, Math.round((el.fontSize || 40) * factor));
          // Scale every run's explicit fontSize so mixed sizes stay proportional.
          const runs = Array.isArray(el.richText) ? el.richText : null;
          if (runs) {
            patch.richText = runs.map((r) => (r.fontSize != null ? { ...r, fontSize: Math.max(6, Math.round(r.fontSize * factor)) } : r));
          }
        }
        onChange(patch, { commit: true });
      }}
    >
      <Rect
        x={0} y={0} width={el.width} height={boxH}
        fill={el.boxEnabled ? el.boxFill : 'rgba(0,0,0,0)'}
        stroke={el.strokeWidth > 0 ? el.stroke : undefined}
        strokeWidth={el.strokeWidth || 0}
        cornerRadius={el.cornerRadius || 0}
        {...(framed ? shadowProps(el) : { shadowEnabled: false })}
      />
        {curved
          ? layout.chars.map((c, i) => (
            <Text
              key={i} x={c.x} y={c.y} rotation={c.rotation}
              offsetX={(c.w || 0) / 2} offsetY={(c.style.fontSize || 20) / 2}
              text={c.ch}
              fontFamily={c.style.fontFamily}
              fontSize={c.style.fontSize}
              fontStyle={`${c.style.italic ? 'italic ' : ''}${c.style.bold ? 'bold' : 'normal'}`}
              textDecoration={c.style.underline ? 'underline' : ''}
              align="center"
              listening={false}
              {...(framed ? {} : shadowProps(el))}
              {...segFill({ x: 0, top: 0, style: c.style })}
            />
          ))
        : layout.lines.map((ln, li) => ln.segments.map((seg, si) => (
            <Text
              key={`${li}-${si}`}
              x={seg.x} y={seg.top}
              text={seg.text}
              fontFamily={seg.style.fontFamily}
              fontSize={seg.style.fontSize}
              fontStyle={`${seg.style.italic ? 'italic ' : ''}${seg.style.bold ? 'bold' : 'normal'}`}
              textDecoration={seg.style.underline ? 'underline' : ''}
              letterSpacing={seg.style.letterSpacing || 0}
              lineHeight={1}
              listening={false}
              {...(framed ? {} : shadowProps(el))}
              {...segFill(seg)}
            />
          )))}
    </Group>
  );
}

/* -------------------------------------------------------------------------- */
/* Shape + image nodes                                                        */
/* -------------------------------------------------------------------------- */

function RectNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  return (
    <Rect
      id={el.id} name="element" ref={ref}
      x={el.x} y={el.y} width={el.width} height={el.height}
      rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      fill={el.boxFill} stroke={el.strokeWidth > 0 ? el.stroke : undefined}
      strokeWidth={el.strokeWidth || 0} cornerRadius={el.cornerRadius || 0}
      draggable={!el.locked} {...shadowProps(el)}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => commitBox(ref.current, el, onChange)}
    />
  );
}

function EllipseNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  return (
    <Group
      id={el.id} name="element" ref={ref}
      x={el.x} y={el.y} rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      draggable={!el.locked}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => commitBox(ref.current, el, onChange)}
    >
      <Ellipse
        x={el.width / 2} y={el.height / 2}
        radiusX={el.width / 2} radiusY={el.height / 2}
        fill={el.boxFill} stroke={el.strokeWidth > 0 ? el.stroke : undefined}
        strokeWidth={el.strokeWidth || 0} {...shadowProps(el)}
      />
    </Group>
  );
}

function TriangleNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  const w = el.width, h = el.height;
  return (
    <Group
      id={el.id} name="element" ref={ref}
      x={el.x} y={el.y} rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      draggable={!el.locked}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => commitBox(ref.current, el, onChange)}
    >
      <Line
        points={[w / 2, 0, w, h, 0, h]} closed
        fill={el.boxFill} stroke={el.strokeWidth > 0 ? el.stroke : undefined}
        strokeWidth={el.strokeWidth || 0} {...shadowProps(el)}
      />
    </Group>
  );
}

function StarNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  const outer = Math.min(el.width, el.height) / 2;
  return (
    <Group
      id={el.id} name="element" ref={ref}
      x={el.x} y={el.y} rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      draggable={!el.locked}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => commitBox(ref.current, el, onChange)}
    >
      <Star
        x={el.width / 2} y={el.height / 2}
        numPoints={el.points || 5}
        innerRadius={outer * (el.innerRatio || 0.5)} outerRadius={outer}
        fill={el.boxFill} stroke={el.strokeWidth > 0 ? el.stroke : undefined}
        strokeWidth={el.strokeWidth || 0} {...shadowProps(el)}
      />
    </Group>
  );
}

function LineNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  return (
    <Line
      id={el.id} name="element" ref={ref}
      x={el.x} y={el.y} points={[0, 0, el.width, 0]}
      rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      stroke={el.stroke} strokeWidth={el.strokeWidth || 4}
      lineCap={el.lineCap || 'round'} hitStrokeWidth={Math.max(20, el.strokeWidth || 4)}
      draggable={!el.locked}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => {
        const node = ref.current;
        const sx = node.scaleX();
        node.scaleX(1); node.scaleY(1);
        onChange({ x: node.x(), y: node.y(), rotation: node.rotation(), width: Math.max(20, (el.width || 100) * sx) }, { commit: true });
      }}
    />
  );
}

// CSS filter string for an image element (applied at draw time). We bake a CSS
// filter onto an offscreen source canvas so Konva (and export) show it.
function ImageNode({ el, onSelect, onChange, onDragMove }) {
  const ref = useRef(null);
  const [img] = useImage(el.src);
  const f = el.filters || {};
  const filterStr = imageFilterCss(f);

  // Bake CSS filters into an offscreen canvas so Konva (and export) show them.
  const [filtered, setFiltered] = useState(null);
  useEffect(() => {
    if (!img) { setFiltered(null); return; }
    if (!filterStr) { setFiltered(img); return; }
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      const ctx = c.getContext('2d');
      ctx.filter = filterStr;
      ctx.drawImage(img, 0, 0);
      setFiltered(c);
    } catch { setFiltered(img); }
  }, [img, filterStr]);

  return (
    <KImage
      id={el.id} name="element" ref={ref}
      image={filtered || img} x={el.x} y={el.y} width={el.width} height={el.height}
      rotation={el.rotation || 0} opacity={el.opacity ?? 1}
      cornerRadius={el.cornerRadius || 0}
      stroke={el.strokeWidth > 0 ? el.stroke : undefined} strokeWidth={el.strokeWidth || 0}
      draggable={!el.locked} {...shadowProps(el)}
      onClick={onSelect} onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() }, { commit: true })}
      onTransformEnd={() => commitBox(ref.current, el, onChange)}
    />
  );
}

function imageFilterCss(f) {
  const parts = [];
  if (f.grayscale) parts.push(`grayscale(${f.grayscale})`);
  if (f.sepia) parts.push(`sepia(${f.sepia})`);
  if (f.brightness != null && f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
  if (f.contrast != null && f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.join(' ');
}

function commitBox(node, el, onChange) {
  if (!node) return;
  const sx = node.scaleX(), sy = node.scaleY();
  node.scaleX(1); node.scaleY(1);
  onChange({
    x: node.x(), y: node.y(), rotation: node.rotation(),
    width: Math.max(10, (el.width || 100) * sx),
    height: Math.max(10, (el.height || 100) * sy),
  }, { commit: true });
}

/* -------------------------------------------------------------------------- */
/* Rich text editing helpers (DOM is the editing surface, runs are derived)   */
/* -------------------------------------------------------------------------- */

function toHex(v) {
  if (!v) return '#000000';
  if (v[0] === '#') return (v.length === 4 ? '#' + v.slice(1).split('').map((c) => c + c).join('') : v.slice(0, 7)).toLowerCase();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

const FAMILY_CLEAN = (s) => (s || '').split(',')[0].replace(/["']/g, '').trim();

// Build editor HTML from runs, styled to match the canvas at the given scale.
function runsToHtml(runs, def, scale) {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '';
  for (const run of runs) {
    const st = {
      fontFamily: run.fontFamily ?? def.fontFamily,
      fontSize: run.fontSize ?? def.fontSize,
      fill: run.fill ?? def.fill,
      bold: run.bold ?? def.bold,
      italic: run.italic ?? def.italic,
      underline: run.underline ?? def.underline,
      letterSpacing: run.letterSpacing ?? def.letterSpacing,
    };
    const css = `font-family:"${st.fontFamily}";font-size:${st.fontSize * scale}px;color:${st.fill};` +
      `font-weight:${st.bold ? 700 : 400};font-style:${st.italic ? 'italic' : 'normal'};` +
      `text-decoration:${st.underline ? 'underline' : 'none'};letter-spacing:${(st.letterSpacing || 0) * scale}px;`;
    const parts = (run.text || '').split('\n');
    parts.forEach((p, i) => {
      if (i > 0) html += '<br>';
      if (p.length) html += `<span style="${css}">${esc(p)}</span>`;
    });
  }
  return html || '<span></span>';
}

// Serialize the editor DOM back into runs, reading per-character style from the
// browser's computed styles (robust to however the browser split spans).
function domToRuns(root, def, scale) {
  const chars = []; // { ch, ov }
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const ov = styleOverrides(child.parentElement, def, scale);
        for (const ch of child.nodeValue) chars.push({ ch, ov });
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'br') chars.push({ ch: '\n', ov: {} });
        else walk(child);
      }
    }
  };
  walk(root);
  // Coalesce.
  const runs = [];
  for (const c of chars) {
    const last = runs[runs.length - 1];
    if (last && sameOv(lastOv(last), c.ov)) last.text += c.ch;
    else runs.push({ text: c.ch, ...c.ov });
  }
  return runs.length ? runs : [{ text: '' }];
}
function lastOv(run) { const o = {}; for (const k of ['fontFamily', 'fontSize', 'fill', 'bold', 'italic', 'underline', 'letterSpacing']) if (run[k] !== undefined) o[k] = run[k]; return o; }
function sameOv(a, b) { const ks = ['fontFamily', 'fontSize', 'fill', 'bold', 'italic', 'underline', 'letterSpacing']; return ks.every((k) => (a[k] ?? null) === (b[k] ?? null)); }

function styleOverrides(elm, def, scale) {
  if (!elm) return {};
  const cs = window.getComputedStyle(elm);
  const family = FAMILY_CLEAN(cs.fontFamily);
  const size = Math.round(parseFloat(cs.fontSize) / scale);
  const color = toHex(cs.color);
  const bold = parseInt(cs.fontWeight, 10) >= 600;
  const italic = cs.fontStyle.includes('italic');
  const underline = (cs.textDecorationLine || cs.textDecoration || '').includes('underline');
  const ls = cs.letterSpacing === 'normal' ? 0 : Math.round((parseFloat(cs.letterSpacing) || 0) / scale);
  const ov = {};
  if (family && family !== def.fontFamily) ov.fontFamily = family;
  if (Number.isFinite(size) && size !== def.fontSize) ov.fontSize = size;
  if (color !== toHex(def.fill)) ov.fill = color;
  if (bold !== def.bold) ov.bold = bold;
  if (italic !== def.italic) ov.italic = italic;
  if (underline !== def.underline) ov.underline = underline;
  if (Number.isFinite(ls) && ls !== (def.letterSpacing || 0)) ov.letterSpacing = ls;
  return ov;
}

/* -------------------------------------------------------------------------- */
/* Stage                                                                       */
/* -------------------------------------------------------------------------- */

const CanvasStage = forwardRef(function CanvasStage(
  { doc, selectedId, onSelect, onPatchElement, onEditorState, editApiRef, pulseSignal = 0, maxHeight = 620, presets = CANVAS_PRESETS },
  stageRef,
) {
  const wrapRef = useRef(null);
  const trRef = useRef(null);
  const editorRef = useRef(null);
  const activeAnchorRef = useRef('');
  const [containerW, setContainerW] = useState(520);
  // Touch devices need fatter, easier-to-grab handles.
  const [coarse] = useState(() => typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches : false);
  const [editingId, setEditingId] = useState(null);
  const [editStyle, setEditStyle] = useState(null); // screen geometry + base css
  const [guides, setGuides] = useState({ v: [], h: [] });
  const [pulse, setPulse] = useState(null); // { x, y, width, height, key } screen-space ring

  const preset = presets[doc.canvas] || CANVAS_PRESETS[doc.canvas] || CANVAS_PRESETS.portrait;
  const { w: cw, h: ch } = preset;

  useEffect(() => {
    const measure = () => { const el = wrapRef.current; if (el) setContainerW(el.clientWidth || 520); };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const displayW = Math.min(containerW, cw, maxHeight * (cw / ch));
  const scale = displayW / cw;
  const displayH = ch * scale;

  const selected = doc.elements.find((e) => e.id === selectedId);
  const trConfig = transformerConfigFor(selected);

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef?.current;
    if (!tr || !stage) return;
    if (!selectedId || editingId || selected?.locked) { tr.nodes([]); tr.getLayer()?.batchDraw(); return; }
    const node = stage.findOne('#' + selectedId);
    if (node) { tr.nodes([node]); tr.getLayer()?.batchDraw(); }
    else tr.nodes([]);
  }, [selectedId, doc.elements, editingId, scale, stageRef, selected]);

  /* ---- selected-element pulse -------------------------------------------- */
  // When an inspector edit lands (pulseSignal bumps), flash a ring around the
  // selected element so it is obvious the right-hand panel drives that cell.
  useEffect(() => {
    if (!pulseSignal) return;
    const stage = stageRef?.current;
    if (!stage || !selectedId || editingId) { setPulse(null); return; }
    const node = stage.findOne('#' + selectedId);
    if (!node) { setPulse(null); return; }
    const r = node.getClientRect({ relativeTo: stage });
    const pad = 6;
    setPulse({ x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2, key: pulseSignal });
  }, [pulseSignal, selectedId, editingId, stageRef]);

  // Self-contained pulse cleanup (does not depend on external CSS keyframes).
  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(null), 700);
    return () => clearTimeout(t);
  }, [pulse]);

  /* ---- snapping ---------------------------------------------------------- */
  const snapDuringDrag = (el) => (e) => {
    const node = e.target;
    const w = el.width || 0;
    const h = el.type === 'text' ? layoutText({ ...el }).height : (el.height || 0);
    const T = 7 / scale;
    let x = node.x(), y = node.y();
    const vg = [], hg = [];
    const trySnap = (val, target, set, guide, list) => {
      if (Math.abs(val - target) < T) { set(); list.push(guide); }
    };
    // Vertical guides: left edge, center, right edge to canvas.
    trySnap(x, 0, () => { x = 0; }, 0, vg);
    trySnap(x + w / 2, cw / 2, () => { x = cw / 2 - w / 2; }, cw / 2, vg);
    trySnap(x + w, cw, () => { x = cw - w; }, cw, vg);
    // Horizontal guides.
    trySnap(y, 0, () => { y = 0; }, 0, hg);
    trySnap(y + h / 2, ch / 2, () => { y = ch / 2 - h / 2; }, ch / 2, hg);
    trySnap(y + h, ch, () => { y = ch - h; }, ch, hg);
    node.x(x); node.y(y);
    setGuides({ v: vg, h: hg });
  };
  const clearGuides = () => setGuides({ v: [], h: [] });

  /* ---- rich text editing ------------------------------------------------- */
  const openEditor = (el) => {
    const def = elDefaults(el);
    setEditingId(el.id);
    setEditStyle({
      x: el.x * scale, y: el.y * scale,
      width: (el.width || 200) * scale,
      padding: (el.padding || 0) * scale,
      rotation: el.rotation || 0,
      align: el.align || 'left',
      lineHeight: el.lineHeight || 1.2,
      html: runsToHtml(Array.isArray(el.richText) && el.richText.length ? el.richText : [{ text: el.text || '' }], def, scale),
    });
  };

  // Populate the editor DOM once when it opens.
  useLayoutEffect(() => {
    if (editingId && editorRef.current && editStyle) {
      editorRef.current.innerHTML = editStyle.html;
      editorRef.current.focus();
      // Place caret at end.
      const r = document.createRange();
      r.selectNodeContents(editorRef.current);
      r.collapse(false);
      const s = window.getSelection();
      s.removeAllRanges(); s.addRange(r);
      reportSelection();
    }
    // eslint-disable-next-line
  }, [editingId]);

  const editingEl = doc.elements.find((e) => e.id === editingId) || null;

  const commitFromDom = (commit) => {
    if (!editorRef.current || !editingEl) return;
    const def = elDefaults(editingEl);
    const runs = domToRuns(editorRef.current, def, scale);
    const text = runs.map((r) => r.text || '').join('');
    onPatchElement(editingEl.id, { richText: runs, text }, { commit: !!commit });
  };

  const closeEditor = () => {
    commitFromDom(true);
    setEditingId(null);
    setEditStyle(null);
    if (onEditorState) onEditorState(null);
  };

  // Apply an inline style patch to the current DOM selection (per-word/char).
  const applyToSelection = (patch) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
    }
    const span = document.createElement('span');
    if (patch.fontFamily !== undefined) { span.style.fontFamily = `"${patch.fontFamily}"`; loadFonts([patch.fontFamily]); }
    if (patch.fontSize !== undefined) span.style.fontSize = `${patch.fontSize * scale}px`;
    if (patch.fill !== undefined) span.style.color = patch.fill;
    if (patch.bold !== undefined) span.style.fontWeight = patch.bold ? '700' : '400';
    if (patch.italic !== undefined) span.style.fontStyle = patch.italic ? 'italic' : 'normal';
    if (patch.underline !== undefined) span.style.textDecoration = patch.underline ? 'underline' : 'none';
    if (patch.letterSpacing !== undefined) span.style.letterSpacing = `${patch.letterSpacing * scale}px`;
    try {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.removeAllRanges(); sel.addRange(nr);
    } catch { /* selection edge cases */ }
    commitFromDom(true);
    reportSelection();
  };

  // Read the active selection's resolved style so the toolbar can reflect it.
  const reportSelection = () => {
    if (!onEditorState || !editorRef.current || !editingEl) return;
    const def = elDefaults(editingEl);
    const sel = window.getSelection();
    let node = sel && sel.focusNode;
    if (node && node.nodeType === 3) node = node.parentElement;
    if (!node || !editorRef.current.contains(node)) node = editorRef.current;
    const cs = window.getComputedStyle(node);
    const current = {
      fontFamily: FAMILY_CLEAN(cs.fontFamily) || def.fontFamily,
      fontSize: Math.round(parseFloat(cs.fontSize) / scale) || def.fontSize,
      fill: toHex(cs.color),
      bold: parseInt(cs.fontWeight, 10) >= 600,
      italic: cs.fontStyle.includes('italic'),
      underline: (cs.textDecorationLine || cs.textDecoration || '').includes('underline'),
      letterSpacing: cs.letterSpacing === 'normal' ? 0 : Math.round((parseFloat(cs.letterSpacing) || 0) / scale),
      hasSelection: !!(sel && !sel.isCollapsed),
    };
    onEditorState({ id: editingEl.id, applyToSelection, current });
  };

  // Keep an imperative "open editor for id" control fresh every render so the
  // inspector's Edit button and double-click share the same entry point.
  useEffect(() => {
    if (!editApiRef) return;
    editApiRef.current = {
      openEditor: (id) => { const el = doc.elements.find((e) => e.id === id); if (el && el.type === 'text') openEditor(el); },
    };
  });

  useEffect(() => {
    if (editingId) reportSelection();
    else if (onEditorState) onEditorState(null);
    // eslint-disable-next-line
  }, [editingId]);

  useEffect(() => {
    const onSelChange = () => { if (editingId) reportSelection(); };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
    // eslint-disable-next-line
  }, [editingId, editingEl]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: displayW, margin: '0 auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(15,23,42,0.28)', touchAction: 'none' }}>
        <Stage
          ref={stageRef}
          width={displayW}
          height={displayH}
          onMouseDown={(e) => { if (e.target === e.target.getStage()) { onSelect(null); if (editingId) closeEditor(); } }}
          onTouchStart={(e) => { if (e.target === e.target.getStage()) { onSelect(null); if (editingId) closeEditor(); } }}
          onMouseUp={clearGuides}
          onTouchEnd={clearGuides}
        >
          <Layer scaleX={scale} scaleY={scale}>
            <Background bg={doc.background} w={cw} h={ch} />
            {doc.elements.map((el) => {
              const common = {
                el,
                onSelect: () => onSelect(el.id),
                onChange: (patch, opts) => onPatchElement(el.id, patch, opts),
                onDragMove: snapDuringDrag(el),
              };
              if (el.type === 'text') return <TextNode key={el.id} {...common} activeAnchorRef={activeAnchorRef} hidden={editingId === el.id} onDblClick={() => { onSelect(el.id); openEditor(el); }} />;
              if (el.type === 'rect') return <RectNode key={el.id} {...common} />;
              if (el.type === 'ellipse') return <EllipseNode key={el.id} {...common} />;
              if (el.type === 'triangle') return <TriangleNode key={el.id} {...common} />;
              if (el.type === 'star') return <StarNode key={el.id} {...common} />;
              if (el.type === 'line') return <LineNode key={el.id} {...common} />;
              if (el.type === 'image') return <ImageNode key={el.id} {...common} />;
              return null;
            })}
            {/* Alignment guides */}
            {guides.v.map((x, i) => <Line key={'v' + i} points={[x, 0, x, ch]} stroke="#e11d48" strokeWidth={1 / scale} dash={[6 / scale, 6 / scale]} listening={false} />)}
            {guides.h.map((y, i) => <Line key={'h' + i} points={[0, y, cw, y]} stroke="#e11d48" strokeWidth={1 / scale} dash={[6 / scale, 6 / scale]} listening={false} />)}
            <Transformer
              ref={trRef}
              rotateEnabled={trConfig.rotate}
              enabledAnchors={trConfig.anchors}
              keepRatio={trConfig.keepRatio}
              // On-brand handles: accent fill with a dark outline reads clearly on
              // both dark and light canvases.
              anchorSize={(coarse ? 26 : 15) / scale}
              anchorCornerRadius={(coarse ? 6 : 4) / scale}
              anchorStroke={INK}
              anchorStrokeWidth={2 / scale}
              anchorFill={ACCENT}
              borderStroke={ACCENT}
              borderStrokeWidth={2 / scale}
              borderDash={[7 / scale, 5 / scale]}
              padding={(coarse ? 10 : 6) / scale}
              rotateAnchorOffset={(coarse ? 40 : 28) / scale}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              onTransformStart={() => { activeAnchorRef.current = trRef.current?.getActiveAnchor() || ''; }}
              onDragEnd={clearGuides}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
            />
          </Layer>
        </Stage>

        {pulse && (
          <div
            key={pulse.key}
            onAnimationEnd={() => setPulse(null)}
            style={{
              position: 'absolute', left: pulse.x, top: pulse.y, width: pulse.width, height: pulse.height,
              border: `2px solid ${ACCENT}`, borderRadius: 8, boxShadow: `0 0 0 3px rgba(91,75,245,0.25)`,
              pointerEvents: 'none', zIndex: 15,
            }}
          />
        )}

        {editingId && editStyle && (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={() => commitFromDom(false)}
            onBlur={closeEditor}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              left: editStyle.x, top: editStyle.y,
              width: editStyle.width,
              padding: editStyle.padding,
              transform: editStyle.rotation ? `rotate(${editStyle.rotation}deg)` : undefined,
              transformOrigin: '0 0',
              textAlign: editStyle.align,
              lineHeight: editStyle.lineHeight,
              outline: '2px solid #2563eb',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              boxSizing: 'border-box',
              margin: 0, zIndex: 20, cursor: 'text',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          />
        )}
      </div>
      {editingId && (
        <div style={{ fontSize: 12.5, color: '#2563eb', textAlign: 'center', marginTop: 6, fontWeight: 700 }}>
          Editing text. Select any word or letters, then restyle them in the panel. Click outside to finish.
        </div>
      )}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Static preview (template thumbnails + read-only rendering)                  */
/* -------------------------------------------------------------------------- */

// A non-interactive render of a document at a small width. Reuses the exact same
// Background + element node renderers as the live editor, so a preview is a
// faithful, pixel-for-pixel render of what the document produces.
const NOOP = () => {};
const STATIC_ANCHOR = { current: '' };

export function StaticInvite({ doc, width = 220, presets = CANVAS_PRESETS, stageRef }) {
  const preset = presets[doc.canvas] || CANVAS_PRESETS[doc.canvas] || CANVAS_PRESETS.portrait;
  const { w: cw, h: ch } = preset;
  const scale = width / cw;
  const height = Math.round(ch * scale);
  return (
    <Stage ref={stageRef} width={Math.round(width)} height={height} listening={false}>
      <Layer scaleX={scale} scaleY={scale} listening={false}>
        <Background bg={doc.background} w={cw} h={ch} />
        {doc.elements.map((el) => {
          const common = { el, onSelect: NOOP, onChange: NOOP, onDragMove: NOOP };
          if (el.type === 'text') return <TextNode key={el.id} {...common} onDblClick={NOOP} activeAnchorRef={STATIC_ANCHOR} hidden={false} />;
          if (el.type === 'rect') return <RectNode key={el.id} {...common} />;
          if (el.type === 'ellipse') return <EllipseNode key={el.id} {...common} />;
          if (el.type === 'triangle') return <TriangleNode key={el.id} {...common} />;
          if (el.type === 'star') return <StarNode key={el.id} {...common} />;
          if (el.type === 'line') return <LineNode key={el.id} {...common} />;
          if (el.type === 'image') return <ImageNode key={el.id} {...common} />;
          return null;
        })}
      </Layer>
    </Stage>
  );
}

function transformerConfigFor(el) {
  if (!el || el.locked) return { rotate: false, anchors: [], keepRatio: false };
  if (el.type === 'text') {
    return { rotate: true, keepRatio: false, anchors: ['middle-left', 'middle-right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] };
  }
  if (el.type === 'line') {
    return { rotate: true, keepRatio: false, anchors: ['middle-left', 'middle-right'] };
  }
  if (el.type === 'image' || el.type === 'star') {
    return { rotate: true, keepRatio: true, anchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] };
  }
  return { rotate: true, keepRatio: false, anchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'] };
}

export default CanvasStage;
