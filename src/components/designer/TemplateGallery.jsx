// designer/TemplateGallery.jsx
// A popup gallery of every template with a REAL, live preview of the document
// each one produces (prefilled from `vars`). Previews render with the exact same
// Konva renderer as the editor (StaticInvite), so what you see is what you get.
// Thumbnails are virtualized (only rendered when near the viewport) and wait for
// their webfonts before painting, so the grid stays smooth and never flashes a
// fallback face.
//
// ASCII hyphen only anywhere in this file.

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES, buildTemplate } from './templates';
import { normalizeDoc } from './model';
import { familiesInEl } from './richtext';
import { ensureFontsReady } from './fonts';
import { StaticInvite } from './CanvasStage';

const INK = '#0f172a';
const ACCENT = '#5b4bf5';
const THUMB_W = 208;

export default function TemplateGallery({ vars, onApply, onClose }) {
  const [cat, setCat] = useState('All');

  // Build (and prefill) every template document once.
  const items = useMemo(() => TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    category: t.category || 'Basic',
    doc: normalizeDoc(buildTemplate(t.key, vars)),
  })), [vars]);

  const cats = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return ['All', ...TEMPLATE_CATEGORIES.filter((c) => present.has(c))];
  }, [items]);

  const shown = cat === 'All' ? items : items.filter((i) => i.category === cat);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Design templates"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9,17,32,0.62)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 1000, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(9,17,32,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: INK, fontSize: 20, fontWeight: 800 }}>Choose a template</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
              {TEMPLATES.length} designs, each a live preview. Click one to apply it.
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 38, height: 38, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: INK, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Category chips */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {cats.map((c) => {
            const on = c === cat;
            return (
              <button key={c} type="button" onClick={() => setCat(c)}
                style={{ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${on ? INK : '#e2e8f0'}`, background: on ? INK : '#fff', color: on ? '#fff' : '#475569' }}>
                {c}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div style={{ padding: 18, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${THUMB_W}px)`, gap: 16, justifyContent: 'center' }}>
            {shown.map((it) => (
              <TemplateCard key={it.key} item={it} onApply={() => onApply(it.key)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ item, onApply }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onApply}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Apply ${item.name}`}
      style={{
        display: 'block', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        border: `2px solid ${hover ? ACCENT : '#e2e8f0'}`, borderRadius: 12, background: '#fff', overflow: 'hidden',
        boxShadow: hover ? '0 12px 30px rgba(9,17,32,0.22)' : '0 2px 8px rgba(9,17,32,0.06)',
        transition: 'box-shadow 140ms ease, border-color 140ms ease, transform 140ms ease',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ position: 'relative', width: THUMB_W, background: '#0b1220' }}>
        <TemplateThumb doc={item.doc} width={THUMB_W} />
        {hover && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,17,32,0.32)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', fontWeight: 800, fontSize: 13, padding: '8px 14px', borderRadius: 999 }}>
              <Check size={15} /> Use this
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: '9px 11px' }}>
        <div style={{ color: INK, fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>{item.category}</div>
      </div>
    </button>
  );
}

// Virtualized, font-aware thumbnail. Renders the real Konva document only when
// near the viewport and after its fonts are ready (no fallback-face flash).
function TemplateThumb({ doc, width }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  // Reserve the right height (portrait 4:5) so the grid never jumps.
  const height = Math.round(width * (1350 / 1080));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { setNear(true); io.disconnect(); break; }
    }, { rootMargin: '500px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let alive = true;
    const fams = [...new Set(doc.elements.filter((e) => e.type === 'text').flatMap((e) => familiesInEl(e)))];
    // Always resolve (font timeout guard) so a thumbnail never gets stuck blank.
    const guard = setTimeout(() => { if (alive) setReady(true); }, 2500);
    ensureFontsReady(fams).then(() => { if (alive) { clearTimeout(guard); setReady(true); } });
    return () => { alive = false; clearTimeout(guard); };
  }, [near, doc]);

  return (
    <div ref={ref} style={{ width, height, position: 'relative' }}>
      {near && ready
        ? <StaticInvite doc={doc} width={width} />
        : <div style={{ width, height, background: 'linear-gradient(135deg,#111a2e,#0b1220)' }} />}
    </div>
  );
}
