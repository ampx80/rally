// designer/ColorControl.jsx
// A premium color control for non-designers: one click opens a popover with a
// curated palette, the colors you have used recently (remembered across
// sessions), a native custom picker, and a screen eyedropper where the browser
// supports it. It is a drop-in replacement for a bare <input type="color"> and
// keeps the same (value, onChange) contract, so nothing downstream changes.
//
// ASCII hyphen only anywhere in this file.

import { useEffect, useRef, useState } from 'react';
import { Pipette, Check } from 'lucide-react';

const INK = '#0f172a';
const BORDER = 'var(--border, #e2e8f0)';
const label = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 };

// Curated, tasteful palette. Brand accent first, then deep formals, warm
// metallics, soft pastels and clean neutrals, so anyone lands on something that
// reads well.
export const DESIGNER_PALETTE = [
  '#5B4BF5', '#0E2348', '#13294F', '#241A52', '#0A3A2A', '#16351F', '#0B3A44',
  '#4A0D16', '#3D1030', '#B23A6E', '#B2543A', '#8A6D1E', '#B9922E',
  '#E6BE56', '#F2CC63', '#F4D77C', '#FBF3DE', '#F5EFE1', '#FFFFFF',
  '#F7D3E0', '#E6CF9C', '#CFDCC0', '#C8D8E8', '#6F8A5B', '#5A7FA6',
  '#475569', '#2B2F38', '#0B1220', '#000000',
];

/* ---- recently-used colors (persisted) ---------------------------------- */
const RECENT_KEY = 'ardova.designer.recentColors';
let recentCache = null;

export function getRecentColors() {
  if (recentCache) return recentCache;
  try { recentCache = JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { recentCache = []; }
  return Array.isArray(recentCache) ? recentCache : (recentCache = []);
}

export function pushRecentColor(raw) {
  const hex = toHex(raw);
  if (!hex) return getRecentColors();
  const cur = getRecentColors().filter((c) => c.toLowerCase() !== hex.toLowerCase());
  cur.unshift(hex);
  recentCache = cur.slice(0, 14);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentCache)); } catch { /* private mode */ }
  return recentCache;
}

/* ---- component --------------------------------------------------------- */

// title:   optional row label (renders a labeled row when present)
// compact: render just the swatch button (for inline use next to other text)
export default function ColorControl({ title, value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(getRecentColors);
  const wrapRef = useRef(null);
  const cur = toHex(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (hex, remember = true) => {
    const h = toHex(hex);
    onChange(h);
    if (remember) setRecent(pushRecentColor(h));
  };

  const eyedrop = async () => {
    if (typeof window === 'undefined' || !window.EyeDropper) return;
    try {
      const res = await new window.EyeDropper().open();
      if (res?.sRGBHex) pick(res.sRGBHex);
    } catch { /* user cancelled */ }
  };

  const swatchBtn = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-label={title ? `${title}: ${cur}` : `Color: ${cur}`}
      title={cur}
      style={{
        width: compact ? 40 : 44, height: compact ? 30 : 32, borderRadius: 8, cursor: 'pointer',
        border: `1.5px solid ${BORDER}`, background: '#fff', padding: 3,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 5, background: cur, boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.12)' }} />
    </button>
  );

  const popover = open && (
    <div
      role="dialog"
      aria-label="Choose a color"
      style={{
        position: 'absolute', zIndex: 60, top: 'calc(100% + 6px)', right: 0, width: 244,
        background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 12,
        boxShadow: '0 18px 48px rgba(15,23,42,0.22)', padding: 12,
      }}
    >
      <div style={{ ...label, marginBottom: 7 }}>Palette</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 }}>
        {DESIGNER_PALETTE.map((c) => (
          <Swatch key={c} color={c} active={c.toLowerCase() === cur.toLowerCase()} onClick={() => pick(c)} />
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <div style={{ ...label, margin: '12px 0 7px' }}>Recently used</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 }}>
            {recent.map((c) => (
              <Swatch key={c} color={c} active={c.toLowerCase() === cur.toLowerCase()} onClick={() => pick(c, false)} />
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: INK, cursor: 'pointer' }}>
          <input type="color" value={cur} onChange={(e) => pick(e.target.value)}
            style={{ width: 34, height: 30, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: 2, background: '#fff', cursor: 'pointer' }} />
          Custom
        </label>
        {typeof window !== 'undefined' && window.EyeDropper && (
          <button type="button" onClick={eyedrop} title="Pick a color from the screen"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8,
              border: `1.5px solid ${BORDER}`, background: '#fff', color: INK, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700 }}>
            <Pipette size={14} /> Eyedropper
          </button>
        )}
      </div>
    </div>
  );

  if (compact) {
    return <span ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>{swatchBtn}{popover}</span>;
  }

  return (
    <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
      {title && <div style={{ ...label, margin: 0, flex: 1 }}>{title}</div>}
      {swatchBtn}
      {popover}
    </div>
  );
}

function Swatch({ color, active, onClick }) {
  return (
    <button
      type="button" onClick={onClick} title={color} aria-label={color}
      style={{
        position: 'relative', width: '100%', aspectRatio: '1 / 1', minHeight: 20, borderRadius: 6, cursor: 'pointer',
        background: color, border: active ? `2px solid ${INK}` : '1px solid rgba(15,23,42,0.14)', padding: 0,
      }}
    >
      {active && <Check size={12} color={pickReadable(color)} style={{ position: 'absolute', inset: 0, margin: 'auto' }} />}
    </button>
  );
}

/* ---- helpers ----------------------------------------------------------- */

export function toHex(v) {
  if (!v) return '#000000';
  if (v[0] === '#') return (v.length === 4 ? '#' + v.slice(1).split('').map((c) => c + c).join('') : v.slice(0, 7)).toLowerCase();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

function pickReadable(hex) {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h || '000000', 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0E2348' : '#ffffff';
}
