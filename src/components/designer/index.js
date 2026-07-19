// designer/index.js
// Public surface of the generic visual designer.
//
//   import Designer, {
//     blankDoc, normalizeDoc, CANVAS_PRESETS, StaticPreview, exportDocToPngDataUrl,
//   } from '@/components/designer';
//
// - Designer                 controlled WYSIWYG editor (default export)
// - blankDoc(canvasKey)       an empty v3 document
// - normalizeDoc(doc)         defensive normalizer for any stored/foreign blob
// - CANVAS_PRESETS            the built-in canvas-size map
// - StaticPreview             read-only Konva render of a document (thumbnails)
// - exportDocToPngDataUrl     pure(ish) offscreen render of a doc to a PNG data URL
//
// ASCII hyphen only anywhere in this file.

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { StaticInvite } from './CanvasStage';
import { normalizeDoc, CANVAS_PRESETS } from './model';
import { familiesInEl } from './richtext';
import { ensureFontsReady } from './fonts';

export { default } from './Designer';
export { blankDoc, normalizeDoc, CANVAS_PRESETS } from './model';

// Read-only preview: the exact same Konva renderer as the live editor, no
// interaction. Renders a document at a target display width.
export { StaticInvite as StaticPreview } from './CanvasStage';

// Render a document to a PNG (or JPEG) data URL off-screen, without mounting the
// full editor. Useful for landing-page / funnel thumbnails and server-free
// previews.
//
// opts: { pixelRatio=2, width, presets, mimeType='image/png', quality=0.95 }
// Returns a data URL string, or null if rendering was not possible (for example
// a cross-origin image without CORS that would taint the canvas).
export async function exportDocToPngDataUrl(rawDoc, opts = {}) {
  if (typeof document === 'undefined') return null;
  const doc = normalizeDoc(rawDoc);
  const presets = opts.presets || CANVAS_PRESETS;
  const preset = presets[doc.canvas] || CANVAS_PRESETS[doc.canvas] || CANVAS_PRESETS.portrait;
  const pixelRatio = opts.pixelRatio || 2;
  const width = opts.width || preset.w;
  const mimeType = opts.mimeType || 'image/png';
  const quality = opts.quality ?? 0.95;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;';
  document.body.appendChild(host);

  const stageRef = { current: null };
  const root = createRoot(host);
  try {
    const fams = [...new Set(doc.elements.filter((e) => e.type === 'text').flatMap((e) => familiesInEl(e)))];
    await ensureFontsReady(fams);
    root.render(createElement(StaticInvite, { doc, width, presets, stageRef }));
    // Allow the Konva stage to mount and any data-URL images to load + paint.
    await new Promise((res) => setTimeout(res, 180));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const stage = stageRef.current;
    if (!stage) return null;
    const ratio = pixelRatio * (preset.w / (stage.width() || preset.w));
    try {
      return stage.toDataURL({ mimeType, quality, pixelRatio: ratio });
    } catch {
      return null; // tainted canvas (cross-origin image without CORS)
    }
  } finally {
    try { root.unmount(); } catch { /* ignore */ }
    try { document.body.removeChild(host); } catch { /* ignore */ }
  }
}
