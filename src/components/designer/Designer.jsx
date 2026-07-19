// designer/Designer.jsx
// A generic, CONTROLLED WYSIWYG visual designer ported from Class Reunly's
// invitation editor and fully decoupled from that product. It is a direct-
// manipulation studio: drag, resize, and rotate real elements on a canvas, style
// them in a Word/Canva-like properties panel, swap backgrounds, start from a
// template, and export a print-ready PNG or JPG.
//
// CONTROLLED CONTRACT: the parent owns the document and persistence.
//   <Designer
//     doc={doc}                       // v3 model document: { v, canvas, background, elements[] }
//     onChange={(nextDoc) => ...}      // called on every edit (parent persists)
//     presets={CANVAS_PRESETS}         // optional canvas-size map override
//     title="Designer"                 // optional header title
//     onExportPng={(pngDataUrl) => ...} // optional: receives a PNG data URL on Export
//     onUploadImage={(file) => Promise<url>} // optional; falls back to a local data URL
//     vars={{ title, subtitle, ... }}  // optional template text substitution
//     accent="#5b4bf5"                 // optional brand accent
//   />
//
// Undo/redo, the toolbar, inspector, template gallery, background picker, font
// picker, color control and image upload are all internal.
//
// ASCII hyphen only anywhere in this file.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Type, Square, Circle, Minus, Triangle, Star, ImagePlus, Undo2, Redo2, Download,
  LayoutTemplate, Palette, Sparkles, Keyboard, X,
} from 'lucide-react';
import CanvasStage from './CanvasStage';
import Inspector from './Inspector';
import BackgroundPicker from './BackgroundPicker';
import TemplateGallery from './TemplateGallery';
import ColorControl from './ColorControl';
import {
  CANVAS_PRESETS, BG_PRESETS, blankDoc, normalizeDoc, clone,
  makeText, makeRect, makeEllipse, makeTriangle, makeStar, makeLine, makeImage,
} from './model';
import { clearOverrideAll, familiesInEl, layoutText } from './richtext';
import { TEMPLATES, buildTemplate } from './templates';
import { injectFontLink, ensureFontsReady } from './fonts';

const INK = '#0f172a';
const BORDER = 'var(--border, #e2e8f0)';
const DEFAULT_ACCENT = '#5b4bf5';

const label = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 6px' };

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = rej;
  fr.readAsDataURL(file);
});

export default function Designer({
  doc: docProp,
  onChange,
  presets = CANVAS_PRESETS,
  title = 'Designer',
  onExportPng,
  onUploadImage,
  vars,
  accent = DEFAULT_ACCENT,
}) {
  const stageRef = useRef(null);
  const fileRef = useRef(null);
  const bgFileRef = useRef(null);
  const editApiRef = useRef(null);

  const toolBtn = useMemo(() => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 10,
    border: `1.5px solid ${BORDER}`, background: '#fff', color: INK, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
  }), []);

  const presetOf = useCallback((d) => presets[d.canvas] || CANVAS_PRESETS[d.canvas] || CANVAS_PRESETS.portrait, [presets]);

  const [doc, setDocState] = useState(() => normalizeDoc(docProp || blankDoc()));
  const docRef = useRef(doc);
  const lastEmittedRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [exportScale, setExportScale] = useState(2);
  const [bgTab, setBgTab] = useState('themes');
  const [uploadErr, setUploadErr] = useState('');
  const [textEditor, setTextEditor] = useState(null); // rich-text edit state from the canvas
  const [pulseSignal, setPulseSignal] = useState(0); // bumped to flash the selected element
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [, forceRedraw] = useState(0);

  const past = useRef([]);
  const future = useRef([]);

  const pulseSelected = useCallback(() => setPulseSignal((n) => n + 1), []);

  useEffect(() => { injectFontLink(); }, []);

  // Emit a new document up to the parent (controlled) and mirror it locally.
  const emit = useCallback((next) => {
    docRef.current = next;
    lastEmittedRef.current = next;
    setDocState(next);
    if (onChange) onChange(next);
  }, [onChange]);

  // Re-seed from the doc prop ONLY on a genuine external change (not our own
  // echo). Compares content so a parent that clones our emit does not thrash.
  useEffect(() => {
    if (!docProp) return;
    if (docProp === lastEmittedRef.current) return;
    try {
      if (JSON.stringify(docProp) === JSON.stringify(docRef.current)) return;
    } catch { /* fall through and reseed */ }
    past.current = []; future.current = [];
    const nd = normalizeDoc(docProp);
    docRef.current = nd;
    setDocState(nd);
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docProp]);

  const pushHistory = (prev) => {
    past.current.push(prev);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
  };

  // Commit-aware document mutation. Snapshots the previous doc for undo.
  const mutate = useCallback((fn) => {
    const prev = docRef.current;
    pushHistory(prev);
    emit(fn(prev));
  }, [emit]);

  const patchElement = useCallback((id, patch, opts = {}) => {
    if (opts.commit) {
      mutate((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    } else {
      const prev = docRef.current;
      emit({ ...prev, elements: prev.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
    }
  }, [mutate, emit]);

  const undo = useCallback(() => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(docRef.current);
    emit(p);
  }, [emit]);

  const redo = useCallback(() => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(docRef.current);
    emit(n);
  }, [emit]);

  // Redraw the Konva canvas once webfonts are ready (text first paints in a
  // fallback face; Konva does not auto-repaint on font load).
  useEffect(() => {
    let alive = true;
    const fams = [...new Set(doc.elements.filter((e) => e.type === 'text').flatMap((e) => familiesInEl(e)))];
    ensureFontsReady(fams).then(() => {
      if (!alive) return;
      forceRedraw((n) => n + 1);
      stageRef.current?.getLayers?.().forEach((l) => l.batchDraw());
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.canvas]);

  /* ---- element operations ------------------------------------------------ */
  const sizeNow = () => { const { w, h } = presetOf(doc); return { w, h }; };

  const addElement = (el) => {
    mutate((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
  };

  const addText = () => {
    const { w, h } = sizeNow();
    addElement(makeText({ text: 'Your text', x: (w - 700) / 2, y: h / 2 - 70, width: 700, fontSize: 72, fill: bgIsLight(doc.background) ? '#0f172a' : '#f8fafc' }));
  };
  const addBoxText = () => {
    const { w, h } = sizeNow();
    addElement(makeText({ text: 'Bordered text box', x: (w - 640) / 2, y: h / 2 - 90, width: 640, fontSize: 60, fill: '#ffffff', boxEnabled: true, boxFill: accent, stroke: accent, strokeWidth: 0, cornerRadius: 18, shadowEnabled: true, shadowColor: '#000000', shadowBlur: 24, shadowOpacity: 0.4 }));
  };
  const addRect = () => { const { w, h } = sizeNow(); addElement(makeRect({ x: (w - 460) / 2, y: (h - 300) / 2 })); };
  const addCircle = () => { const { w, h } = sizeNow(); addElement(makeEllipse({ x: (w - 340) / 2, y: (h - 340) / 2 })); };
  const addTriangle = () => { const { w, h } = sizeNow(); addElement(makeTriangle({ x: (w - 360) / 2, y: (h - 320) / 2 })); };
  const addStar = () => { const { w, h } = sizeNow(); addElement(makeStar({ x: (w - 340) / 2, y: (h - 340) / 2 })); };
  const addLine = () => { const { w, h } = sizeNow(); addElement(makeLine({ x: (w - 600) / 2, y: h / 2 })); };

  const selectedEl = doc.elements.find((e) => e.id === selectedId) || null;

  // Whole-box text styling: set the element default AND clear the matching
  // per-word override so the entire sentence adopts the new style at once.
  const applyWholeText = useCallback((patch) => {
    if (!selectedId) return;
    mutate((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => {
        if (e.id !== selectedId || e.type !== 'text') return e;
        const next = { ...e };
        const clearKeys = [];
        for (const k of Object.keys(patch)) {
          if (k === 'bold') { next.fontWeight = patch.bold ? 'bold' : 'normal'; clearKeys.push('bold'); }
          else { next[k] = patch[k]; clearKeys.push(k); }
        }
        if (Array.isArray(next.richText)) next.richText = clearOverrideAll(next.richText, clearKeys);
        return next;
      }),
    }));
  }, [selectedId, mutate]);

  const toggleLock = () => {
    if (!selectedId) return;
    mutate((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === selectedId ? { ...e, locked: !e.locked } : e)) }));
  };

  const layerOp = (op) => {
    if (!selectedId) return;
    mutate((prev) => {
      const arr = [...prev.elements];
      const i = arr.findIndex((e) => e.id === selectedId);
      if (i < 0) return prev;
      const [it] = arr.splice(i, 1);
      if (op === 'front') arr.push(it);
      else if (op === 'back') arr.unshift(it);
      else if (op === 'forward') arr.splice(Math.min(arr.length, i + 1), 0, it);
      else if (op === 'backward') arr.splice(Math.max(0, i - 1), 0, it);
      return { ...prev, elements: arr };
    });
  };

  const duplicateEl = () => {
    if (!selectedEl) return;
    const copy = clone(selectedEl);
    copy.id = makeText().id + '_c';
    copy.x = (copy.x || 0) + 30; copy.y = (copy.y || 0) + 30;
    mutate((prev) => ({ ...prev, elements: [...prev.elements, copy] }));
    setSelectedId(copy.id);
  };

  const deleteEl = () => {
    if (!selectedId) return;
    mutate((prev) => ({ ...prev, elements: prev.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  };

  // Rendered bounds of an element (text grows to its laid-out height; a line is
  // as tall as its stroke). Used by the align-on-the-canvas tools.
  const boundsOf = (el) => {
    if (el.type === 'line') return { w: el.width || 0, h: el.strokeWidth || 0 };
    if (el.type === 'text') { try { return { w: el.width || 0, h: layoutText(el).height }; } catch { return { w: el.width || 0, h: el.fontSize || 0 }; } }
    return { w: el.width || 0, h: el.height || 0 };
  };

  // One-click align of the selected element to the canvas.
  const alignEl = (kind) => {
    if (!selectedEl) return;
    const { w: cw, h: ch } = presetOf(doc);
    const { w, h } = boundsOf(selectedEl);
    const patch = {};
    if (kind === 'left') patch.x = 0;
    else if (kind === 'right') patch.x = Math.round(cw - w);
    else if (kind === 'centerH') patch.x = Math.round((cw - w) / 2);
    else if (kind === 'top') patch.y = 0;
    else if (kind === 'bottom') patch.y = Math.round(ch - h);
    else if (kind === 'centerV') patch.y = Math.round((ch - h) / 2);
    patchElement(selectedId, patch, { commit: true });
    pulseSelected();
  };

  // Resize a text element's type so it fills its box width without clipping,
  // scaling every per-word run proportionally.
  const autoFitText = () => {
    if (!selectedEl || selectedEl.type !== 'text') return;
    const el = selectedEl;
    const { h: ch } = presetOf(doc);
    const pad = el.padding || 0;
    const innerW = Math.max(10, (el.width || 200) - pad * 2);
    const availH = Math.max(40, ch - (el.y || 0) - pad);
    const runs = Array.isArray(el.richText) ? el.richText : null;
    const scaled = (f) => {
      const c = { ...el, fontSize: Math.max(6, (el.fontSize || 48) * f) };
      if (runs) c.richText = runs.map((r) => (r.fontSize != null ? { ...r, fontSize: Math.max(6, r.fontSize * f) } : r));
      return c;
    };
    const fits = (f) => {
      try { const lo = layoutText(scaled(f)); return lo.contentWidth <= innerW && lo.height <= availH; }
      catch { return f <= 1; }
    };
    let lo = 0.15, hi = 4;
    if (fits(hi)) lo = hi;
    else for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    const patch = { fontSize: Math.max(6, Math.round((el.fontSize || 48) * lo)) };
    if (runs) patch.richText = runs.map((r) => (r.fontSize != null ? { ...r, fontSize: Math.max(6, Math.round(r.fontSize * lo)) } : r));
    patchElement(selectedId, patch, { commit: true });
    pulseSelected();
  };

  /* ---- background / canvas / templates ----------------------------------- */
  const setBackground = (bg) => mutate((prev) => ({ ...prev, background: bg }));
  const setCanvas = (key) => mutate((prev) => ({ ...prev, canvas: key }));

  const applyTemplate = (key, opts = {}) => {
    if (!opts.skipConfirm && !window.confirm('Start from this template? It replaces the current design (undo brings it back).')) return;
    const built = normalizeDoc(buildTemplate(key, vars));
    mutate(() => built);
    setSelectedId(null);
  };

  /* ---- uploads ----------------------------------------------------------- */
  // Upload via the optional onUploadImage prop; otherwise fall back to a local
  // data URL so the designer works with no backend (and the doc stays portable).
  const uploadImage = async (file) => {
    if (!file) throw new Error('Choose an image file.');
    if (!/^image\//.test(file.type)) throw new Error('Please choose an image file.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Keep the image under 8 MB.');
    if (onUploadImage) {
      const url = await onUploadImage(file);
      if (!url) throw new Error('Upload did not return a URL.');
      return url;
    }
    return fileToDataUrl(file);
  };

  const onAddImage = async (e) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!f) return;
    setUploadErr('');
    try {
      const url = await uploadImage(f);
      const img = new window.Image();
      img.onload = () => {
        const { w } = sizeNow();
        const maxW = w * 0.6;
        const ratio = img.height / img.width || 1;
        const ew = Math.min(maxW, img.width);
        addElement(makeImage(url, Math.round(ew), Math.round(ew * ratio), { x: (w - ew) / 2, y: 200 }));
      };
      img.src = url;
    } catch (err) { setUploadErr(err?.message || 'Upload failed.'); }
  };

  const onBgImage = async (e) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!f) return;
    setUploadErr('');
    try {
      const url = await uploadImage(f);
      setBackground({ type: 'image', image: { src: url, opacity: 1 }, color: '#0f172a' });
    } catch (err) { setUploadErr(err?.message || 'Upload failed.'); }
  };

  /* ---- export ------------------------------------------------------------ */
  const captureDataUrl = useCallback(async (mime, quality) => {
    setSelectedId(null);
    await new Promise((r) => setTimeout(r, 60));
    const cur = docRef.current;
    const fams = [...new Set(cur.elements.filter((e) => e.type === 'text').flatMap((e) => familiesInEl(e)))];
    await ensureFontsReady(fams);
    await new Promise((r) => requestAnimationFrame(() => r()));
    const stage = stageRef.current;
    if (!stage) return null;
    // Hide any selection handles so they never bake into the exported image.
    const trs = stage.find('Transformer');
    trs.forEach((t) => t.visible(false));
    stage.getLayers?.().forEach((l) => l.batchDraw());
    const pixelRatio = (presetOf(cur).w / stage.width()) * exportScale;
    let uri;
    try {
      uri = stage.toDataURL({ mimeType: mime, quality: quality ?? 0.95, pixelRatio });
    } finally {
      trs.forEach((t) => t.visible(true));
      stage.getLayers?.().forEach((l) => l.batchDraw());
    }
    return uri;
  }, [exportScale, presetOf]);

  const exportImage = async (fmt) => {
    setDownloading(true);
    try {
      const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      const uri = await captureDataUrl(mime, 0.95);
      if (!uri) return;
      if (fmt === 'png' && onExportPng) {
        onExportPng(uri);
      } else {
        const a = document.createElement('a');
        a.href = uri;
        a.download = `design.${fmt}`;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (err) {
      alert(err?.message || 'Could not export the image. If you added an uploaded image, try re-uploading it.');
    } finally { setDownloading(false); }
  };

  /* ---- keyboard ---------------------------------------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      const meta = e.ctrlKey || e.metaKey;
      const editableEl = document.activeElement?.isContentEditable;
      if (meta && e.key.toLowerCase() === 'z') { if (editableEl) return; e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (meta && e.key.toLowerCase() === 'y') { if (editableEl) return; e.preventDefault(); redo(); return; }
      if (meta && e.key.toLowerCase() === 'd' && selectedId) { e.preventDefault(); duplicateEl(); return; }
      if (typing || editableEl) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteEl(); return; }
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
        const el = docRef.current.elements.find((x) => x.id === selectedId);
        if (el) patchElement(selectedId, { x: (el.x || 0) + d[0], y: (el.y || 0) + d[1] }, { commit: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, undo, redo, patchElement]);

  const p = presetOf(doc);

  /* ---- render ------------------------------------------------------------ */
  return (
    <div>
      <style>{`
        @media (max-width: 860px) {
          .ards-designer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <h2 style={{ color: INK, fontSize: 26, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
        <Sparkles size={22} /> {title}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 16, fontSize: 15, lineHeight: 1.5 }}>
        Design it like Word or Canva. Add bordered text boxes, fill them with color, choose any font, and drag everything into place.
        Double-click any text to type. When it looks right, export a print-ready image.
      </p>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <button type="button" style={toolBtn} onClick={addText}><Type size={16} /> Text</button>
        <button type="button" style={{ ...toolBtn, borderColor: accent, background: '#f5f3ff' }} onClick={addBoxText}><Square size={16} /> Text box</button>
        <button type="button" style={toolBtn} onClick={addRect}><Square size={16} /> Box</button>
        <button type="button" style={toolBtn} onClick={addCircle}><Circle size={16} /> Circle</button>
        <button type="button" style={toolBtn} onClick={addTriangle}><Triangle size={16} /> Triangle</button>
        <button type="button" style={toolBtn} onClick={addStar}><Star size={16} /> Star</button>
        <button type="button" style={toolBtn} onClick={addLine}><Minus size={16} /> Line</button>
        <button type="button" style={toolBtn} onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Image</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAddImage} />

        <span style={{ width: 1, height: 26, background: BORDER, margin: '0 4px' }} />
        <button type="button" style={toolBtn} onClick={undo} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
        <button type="button" style={toolBtn} onClick={redo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={16} /></button>
        <button type="button" style={toolBtn} onClick={() => setHelpOpen(true)} title="Keyboard shortcuts"><Keyboard size={16} /></button>

        <div style={{ flex: 1 }} />

        <select value={exportScale} onChange={(e) => setExportScale(+e.target.value)} title="Export quality" aria-label="Export quality"
          style={{ ...toolBtn, padding: '9px 10px' }}>
          {[[1, 'Standard'], [2, 'High'], [3, 'Ultra / Print']].map(([s, name]) => (
            <option key={s} value={s}>
              {`${name} (${Math.round(p.w * s)} x ${Math.round(p.h * s)})`}
            </option>
          ))}
        </select>
        <button type="button" style={{ ...toolBtn, borderColor: accent, background: accent, color: '#fff' }} onClick={() => exportImage('png')} disabled={downloading}>
          <Download size={16} /> {downloading ? 'Preparing...' : 'PNG'}
        </button>
        <button type="button" style={toolBtn} onClick={() => exportImage('jpg')} disabled={downloading}><Download size={16} /> JPG</button>
      </div>

      {uploadErr && <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 10 }}>{uploadErr}</div>}

      {/* Editor grid: canvas + right panel (stacks on tablets / phones) */}
      <div className="ards-designer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 340px', gap: 20, alignItems: 'start' }}>
        {/* Canvas column */}
        <div>
          <CanvasStage
            ref={stageRef}
            doc={doc}
            presets={presets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPatchElement={patchElement}
            onEditorState={setTextEditor}
            editApiRef={editApiRef}
            pulseSignal={pulseSignal}
          />
          <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 10 }}>
            Double-click text to edit. Drag to move, corner handles to resize, top handle to rotate.
            Export size: <strong>{Math.round(p.w * exportScale)} x {Math.round(p.h * exportScale)}</strong>.
          </div>
        </div>

        {/* Right panel */}
        <div>
          {/* Canvas size */}
          <div style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', marginBottom: 12 }}>
            <div style={{ ...label, marginTop: 0 }}>Canvas shape</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(presets).map(([key, c]) => {
                const on = doc.canvas === key;
                return (
                  <button key={key} type="button" onClick={() => setCanvas(key)}
                    style={{ flex: '1 1 0', minWidth: 66, padding: '8px 6px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${on ? INK : BORDER}`, background: on ? INK : '#fff', color: on ? '#fff' : INK, fontWeight: 700, fontSize: 12.5, textAlign: 'center' }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates */}
          <div style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', marginBottom: 12 }}>
            <div style={{ ...label, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><LayoutTemplate size={13} /> Templates</div>
            <button type="button" onClick={() => setGalleryOpen(true)}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 12px',
                borderRadius: 10, border: `1.5px solid ${INK}`, background: INK, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 800 }}>
              <LayoutTemplate size={16} /> Browse {TEMPLATES.length} templates
            </button>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
              See a live preview of every design, then apply the one you like.
            </div>
          </div>

          {/* Background */}
          <div style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', marginBottom: 12 }}>
            <div style={{ ...label, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={13} /> Background</div>
            <div style={{ display: 'inline-flex', border: `1.5px solid ${BORDER}`, borderRadius: 9, overflow: 'hidden', marginBottom: 10, flexWrap: 'wrap' }}>
              {[['themes', 'Themes'], ['quick', 'Quick'], ['solid', 'Solid'], ['gradient', 'Gradient'], ['image', 'Image']].map(([k, lbl]) => (
                <button key={k} type="button" onClick={() => setBgTab(k)}
                  style={{ padding: '7px 11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                    background: bgTab === k ? INK : '#fff', color: bgTab === k ? '#fff' : '#475569' }}>
                  {lbl}
                </button>
              ))}
            </div>

            {bgTab === 'themes' && (
              <BackgroundPicker background={doc.background} onChange={setBackground} />
            )}
            {bgTab === 'quick' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {BG_PRESETS.map((pr) => (
                  <button key={pr.key} type="button" title={pr.label} onClick={() => setBackground(clone(pr.bg))}
                    style={{ height: 44, borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${BORDER}`, background: swatchCss(pr.bg) }} />
                ))}
              </div>
            )}
            {bgTab === 'solid' && (
              <ColorControl title="Color"
                value={doc.background?.type === 'solid' ? (doc.background.color || '#0f172a') : '#0f172a'}
                onChange={(hex) => setBackground({ type: 'solid', color: hex })} />
            )}
            {bgTab === 'gradient' && (
              <GradientControls bg={doc.background} onChange={setBackground} />
            )}
            {bgTab === 'image' && (
              <div>
                <button type="button" style={{ ...toolBtn, width: '100%', justifyContent: 'center' }} onClick={() => bgFileRef.current?.click()}>
                  <ImagePlus size={16} /> Upload background image
                </button>
                <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onBgImage} />
                {doc.background?.type === 'image' && doc.background.image?.src && (
                  <div style={{ marginTop: 10 }}>
                    <div style={label}>Image dimness</div>
                    <input type="range" min={0.2} max={1} step={0.05} value={doc.background.image.opacity ?? 1}
                      onChange={(e) => setBackground({ ...doc.background, image: { ...doc.background.image, opacity: +e.target.value } })}
                      style={{ width: '100%', accentColor: INK }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inspector for the selected element */}
          <Inspector
            el={selectedEl}
            onPatch={(patch, opts) => { if (selectedId) { patchElement(selectedId, patch, opts); pulseSelected(); } }}
            onWholeText={(patch) => { applyWholeText(patch); pulseSelected(); }}
            onLayer={layerOp}
            onDuplicate={duplicateEl}
            onDelete={deleteEl}
            onLock={toggleLock}
            onEditText={() => editApiRef.current?.openEditor(selectedId)}
            onAlign={alignEl}
            onAutoFit={autoFitText}
            textEditor={textEditor}
          />
        </div>
      </div>

      {galleryOpen && (
        <TemplateGallery
          vars={vars}
          onApply={(key) => { applyTemplate(key, { skipConfirm: true }); setGalleryOpen(false); }}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const SHORTCUTS = [
  ['Ctrl / Cmd + Z', 'Undo'],
  ['Ctrl / Cmd + Shift + Z', 'Redo'],
  ['Ctrl / Cmd + D', 'Duplicate the selected item'],
  ['Delete or Backspace', 'Remove the selected item'],
  ['Arrow keys', 'Nudge by 1 pixel'],
  ['Shift + Arrow keys', 'Nudge by 10 pixels'],
  ['Double-click text', 'Type, then style single words or letters'],
];

function ShortcutsHelp({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9,17,32,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onMouseDown={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 30px 80px rgba(9,17,32,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Keyboard size={18} color={INK} />
          <div style={{ flex: 1, color: INK, fontSize: 18, fontWeight: 800 }}>Keyboard shortcuts</div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: INK, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} />
          </button>
        </div>
        <div style={{ padding: '10px 20px 18px' }}>
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
              <kbd style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, color: INK, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, padding: '4px 9px', whiteSpace: 'nowrap' }}>{keys}</kbd>
              <span style={{ fontSize: 14, color: '#475569' }}>{what}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function GradientControls({ bg, onChange }) {
  const g = bg?.type === 'gradient' ? bg.gradient : { angle: 120, from: '#5b4bf5', to: '#1e1b4b' };
  const set = (patch) => onChange({ type: 'gradient', gradient: { ...g, ...patch } });
  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INK }}>
          From <ColorControl compact value={g.from} onChange={(hex) => set({ from: hex })} />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INK }}>
          To <ColorControl compact value={g.to} onChange={(hex) => set({ to: hex })} />
        </span>
      </div>
      <div style={{ ...label }}>Angle</div>
      <input type="range" min={0} max={360} value={g.angle ?? 120} onChange={(e) => set({ angle: +e.target.value })} style={{ width: '100%', accentColor: INK }} />
    </div>
  );
}

function swatchCss(bg) {
  if (bg.type === 'solid') return bg.color;
  const g = bg.gradient || {};
  return `linear-gradient(${(g.angle ?? 120)}deg, ${g.from}, ${g.to})`;
}

function bgIsLight(bg) {
  if (!bg) return false;
  let hex = bg.type === 'solid' ? bg.color : bg.gradient?.from;
  hex = (hex || '').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex || '000000', 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}
