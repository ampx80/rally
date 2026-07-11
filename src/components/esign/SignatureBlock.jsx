// SignatureBlock - the draw-to-sign field. Two modes: DRAW (pointer/touch
// strokes on a canvas) and TYPE (a name rendered in a script face). Both
// produce a data URL passed up via onChange(dataUrl) so the parent can persist
// it on the signature request. Controlled-ish: pass `value` to show an existing
// signature; the component owns the transient drawing state. Mobile-first -
// pointer events cover mouse + touch + pen, and the canvas scales to its box.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons.jsx';
import { typedSignatureDataUrl } from '../../lib/esign-data.js';

export default function SignatureBlock({ value, onChange, typedName = '', height = 150, disabled = false }) {
  const [mode, setMode] = useState('draw');       // 'draw' | 'type'
  const [typed, setTyped] = useState(typedName);
  const [hasInk, setHasInk] = useState(!!value);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  // Size the canvas backing store to its rendered box (crisp on retina).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || mode !== 'draw') return;
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(rect.width * dpr));
    cv.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(cv).getPropertyValue('--ink')?.trim() || '#1c2333';
  }, [mode]);

  const pos = (e) => {
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };
  const draw = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emitDrawn();
  };

  const emitDrawn = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    try { onChange && onChange(cv.toDataURL('image/png')); } catch {}
  };

  const clear = () => {
    const cv = canvasRef.current;
    if (cv) { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); }
    setHasInk(false);
    onChange && onChange(null);
  };

  const applyTyped = (name) => {
    setTyped(name);
    const trimmed = name.trim();
    onChange && onChange(trimmed ? typedSignatureDataUrl(trimmed) : null);
    setHasInk(!!trimmed);
  };

  // A previously-captured signature shows as a read-only preview.
  if (value && disabled) {
    return (
      <div className="es-sig es-sig-done">
        <img src={value} alt="Signature" className="es-sig-img" style={{ maxHeight: height }} />
      </div>
    );
  }

  return (
    <div className="es-sig">
      <div className="es-sig-modes">
        <button type="button" className={`es-sig-mode${mode === 'draw' ? ' on' : ''}`} onClick={() => setMode('draw')}>
          <Icon name="edit" size={14} /> Draw
        </button>
        <button type="button" className={`es-sig-mode${mode === 'type' ? ' on' : ''}`} onClick={() => setMode('type')}>
          <Icon name="fileText" size={14} /> Type
        </button>
        <span className="es-sig-spacer" />
        <button type="button" className="es-sig-clear" onClick={clear} disabled={!hasInk}>Clear</button>
      </div>

      {mode === 'draw' ? (
        <div className="es-sig-pad" style={{ height }}>
          <canvas
            ref={canvasRef}
            className="es-sig-canvas"
            onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          />
          {!hasInk && <span className="es-sig-hint">Sign here</span>}
          <span className="es-sig-baseline" />
        </div>
      ) : (
        <div className="es-sig-typewrap" style={{ height }}>
          <input
            className="es-sig-typed"
            value={typed}
            onChange={(e) => applyTyped(e.target.value)}
            placeholder="Type your full name"
            aria-label="Typed signature"
            autoFocus
          />
          <span className="es-sig-baseline" />
        </div>
      )}
    </div>
  );
}
