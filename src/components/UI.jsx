// Rally shared UI primitives. Every page composes from here so the whole
// product feels like one surface. Keep prop shapes stable.
import React, { useEffect, useId, useRef, useState } from 'react';
import { useFocusTrap, useEscapeKey, announce } from '../lib/a11y.js';

/* Count a number up from 0 on mount (wow-factor for dashboard stats). Only
   runs for finite numbers; formatted strings render as-is. rAF with a timeout
   fallback so the final value always lands even if frames are throttled. */
function useCountUp(value, dur = 900) {
  const numeric = typeof value === 'number' && isFinite(value);
  const [n, setN] = useState(numeric ? 0 : value);
  useEffect(() => {
    if (!numeric) { setN(value); return; }
    let raf, start;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setN(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    const fb = setTimeout(() => setN(value), dur + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [value, numeric, dur]);
  return numeric ? Math.round(n).toLocaleString() : n;
}

/* Number that flips from its previous value to the new one whenever it changes
   (pipeline sums as deals move). Pass a format fn (e.g. moneyK). */
export function AnimatedNumber({ value, format, dur = 650, className = '', style }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value; prev.current = value;
    if (typeof to !== 'number' || typeof from !== 'number' || from === to) { setDisplay(to); return; }
    let raf, start;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setDisplay(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    const fb = setTimeout(() => setDisplay(to), dur + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [value, dur]);
  const out = typeof display === 'number' ? (format ? format(display) : Math.round(display).toLocaleString()) : display;
  return <span className={className} style={style}>{out}</span>;
}

/* ---------- Button ----------
   variant: 'primary' | 'accent' | 'ghost' | 'quiet' | 'danger'   size: 'sm'|'md'|'lg' */
export function Button({ variant = 'primary', size = 'md', as: As = 'button', className = '', children, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size !== 'md' ? `btn-${size}` : '', className].filter(Boolean).join(' ');
  return <As className={cls} {...rest}>{children}</As>;
}

/* ---------- Card ---------- */
export function Card({ pad = true, hover = false, className = '', children, ...rest }) {
  const cls = ['card', pad ? 'card-pad' : '', hover ? 'card-hover' : '', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}

/* ---------- Stat ---------- */
export function Stat({ value, label, sub, trend, icon, onClick }) {
  const trendColor = trend == null ? '' : trend >= 0 ? 'var(--ok)' : 'var(--risk)';
  const shown = useCountUp(value);
  const interactive = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': typeof label === 'string' ? label : undefined,
        onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } },
        style: { cursor: 'pointer' },
      }
    : {};
  return (
    <div className="col gap-1" {...interactive}>
      {icon && <div style={{ color: 'var(--accent-600)', marginBottom: 2 }}>{icon}</div>}
      <div className="stat-value">{shown}</div>
      <div className="stat-label">{label}</div>
      {sub != null && <div className="t-sm muted">{sub}</div>}
      {trend != null && (
        <div className="t-sm fw-6" style={{ color: trendColor }}>
          {trend >= 0 ? '+' : ''}{trend}% vs last period
        </div>
      )}
    </div>
  );
}

/* ---------- Badge ----------  tone: default|ok|warn|risk|info|accent */
export function Badge({ tone = 'default', children, className = '', style }) {
  const cls = ['badge', tone !== 'default' ? `badge-${tone}` : '', className].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

/* ---------- Avatar ---------- deterministic color from name ---------- */
const AV_COLORS = ['#5b4bf5', '#0ea5a3', '#e0752d', '#c0392b', '#2563a8', '#8b3fd4', '#1a7f52', '#d4a017'];
export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
export function Avatar({ name = '', src, size = 38, color }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: color || avatarColor(name) }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initials || '?')}
    </span>
  );
}

/* ---------- PageTitle ----------
   The top-of-page H1 tier, one step above SectionHeader (which renders an h3).
   Use once per product page for the primary heading; SectionHeader stays for
   the card/section sub-heads below it. */
export function PageTitle({ title, sub, eyebrow, action, children }) {
  return (
    <div className="page-title">
      <div className="col gap-1" style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-h1">{title}</h1>
        {sub && <div className="muted t-sm">{sub}</div>}
        {children}
      </div>
      {action && <div className="row gap-1" style={{ flex: 'none' }}>{action}</div>}
    </div>
  );
}

/* ---------- SectionHeader ---------- */
export function SectionHeader({ title, sub, action, eyebrow }) {
  return (
    <div className="section-head">
      <div className="col gap-1" style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h3 style={{ margin: 0 }}>{title}</h3>
        {sub && <div className="muted t-sm">{sub}</div>}
      </div>
      {action && <div className="row gap-1" style={{ flex: 'none' }}>{action}</div>}
    </div>
  );
}

/* ---------- Field / Input / Select / Textarea ---------- */
export function Field({ label, hint, id: fixedId, children }) {
  const autoId = useId();
  const id = fixedId || autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  // Associate the label with its control and wire aria-describedby to the hint.
  // Only clones a single valid React element child; other children pass through.
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || id,
        'aria-describedby': [children.props['aria-describedby'], hintId].filter(Boolean).join(' ') || undefined,
      })
    : children;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {child}
      {hint && <span id={hintId} className="t-xs muted">{hint}</span>}
    </div>
  );
}
export const Input = (p) => <input className="input" {...p} />;
export const Select = ({ children, ...p }) => <select className="select" {...p}>{children}</select>;
export const Textarea = (p) => <textarea className="textarea" rows={4} {...p} />;

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  const panelRef = useRef(null);
  const titleId = useId();
  // Trap focus inside the panel while open and restore it to the trigger on
  // close (both handled by useFocusTrap). Escape closes via useEscapeKey.
  useFocusTrap(panelRef, open);
  useEscapeKey(() => onClose?.(), open);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(16,20,30,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: '100%', maxWidth: width, background: 'var(--paper)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {title && (
          <div className="row between" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid var(--line)' }}>
            <h4 id={titleId} style={{ margin: 0 }}>{title}</h4>
            <button onClick={onClose} className="btn btn-quiet" aria-label="Close" style={{ fontSize: '1.3rem', padding: '.1rem .5rem', lineHeight: 1 }}>&times;</button>
          </div>
        )}
        <div style={{ padding: '1.4rem', overflowY: 'auto' }}>{children}</div>
        {footer && <div className="row gap-2" style={{ padding: '1rem 1.4rem', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon = '✨', title, body, action }) {
  return (
    <div className="col center gap-2" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem' }}>{icon}</div>
      <h4 style={{ margin: 0 }}>{title}</h4>
      {body && <div className="muted" style={{ maxWidth: 420 }}>{body}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="row gap-1 wrap" style={{ borderBottom: '1px solid var(--line)', marginBottom: '1.15rem' }}>
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} className="btn btn-quiet"
            style={{ borderRadius: 0, borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent', color: on ? 'var(--ink)' : 'var(--n-600)', fontWeight: on ? 700 : 600, padding: '.6rem .85rem' }}>
            {t.label}{t.count != null && <Badge tone={on ? 'accent' : 'default'} className="t-xs">{t.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Progress ring ---------- */
export function Ring({ value = 0, size = 56, stroke = 6, color = 'var(--accent)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--n-100)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.28 }}>{label ?? value}</div>
    </div>
  );
}

/* ---------- Sparkline ---------- inline SVG trend line */
export function Sparkline({ data = [], w = 120, h = 34, color = 'var(--accent)', fill = true, strokeWidth = 2 }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = 'sg' + Math.round(pts[0][1] * 1000 + w);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (<><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.24" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><path d={area} fill={`url(#${id})`} /></>)}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- MiniBars ---------- tiny bar chart */
export function MiniBars({ data = [], w = 120, h = 34, color = 'var(--accent)', gap = 2 }) {
  if (!data.length) return null;
  const max = Math.max(...data) || 1;
  const bw = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {data.map((v, i) => { const bh = Math.max(2, (v / max) * (h - 2)); return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={Math.min(2, bw / 2)} fill={color} opacity={0.35 + 0.65 * (v / max)} />; })}
    </svg>
  );
}

/* ---------- GradientText ---------- */
export function GradientText({ children, style, className = '' }) {
  return <span className={className} style={{ background: 'linear-gradient(100deg, var(--accent), var(--accent-purple) 60%, var(--accent-teal))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...style }}>{children}</span>;
}

/* ---------- Trend chip ---------- */
export function Trend({ value, suffix = '%' }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className="row" style={{ gap: 3, fontSize: '.82rem', fontWeight: 700, color: up ? 'var(--ok)' : 'var(--risk)' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'scaleY(-1)' }}><path d="M4 16l6-6 4 4 6-8" /><path d="M16 6h4v4" /></svg>
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="row" style={{ background: 'var(--n-100)', borderRadius: 'var(--r-sm)', padding: 3, gap: 2 }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value; const label = typeof o === 'string' ? o : o.label;
        const on = v === value;
        return <button key={v} onClick={() => onChange(v)} className="btn btn-sm" style={{ background: on ? 'var(--paper)' : 'transparent', color: on ? 'var(--ink)' : 'var(--n-600)', boxShadow: on ? 'var(--shadow-sm)' : 'none', fontWeight: on ? 700 : 600, padding: '.4rem .8rem' }}>{label}</button>;
      })}
    </div>
  );
}

/* ---------- Progress bar ---------- */
export function ProgressBar({ value = 0, color = 'var(--accent)', height = 8, track = 'var(--n-100)' }) {
  return (
    <div style={{ background: track, borderRadius: 999, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .7s var(--ease)' }} />
    </div>
  );
}

/* ---------- Keyboard hint ---------- */
export function Kbd({ children }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', fontWeight: 600, padding: '.1rem .4rem', border: '1px solid var(--line-strong)', borderBottomWidth: 2, borderRadius: 5, background: 'var(--paper)', color: 'var(--n-600)' }}>{children}</span>;
}

/* ---------- StatCard ---------- a premium KPI tile with optional spark + trend + glow */
export function StatCard({ label, value, format, trend, spark, sparkColor, icon, accent = 'var(--accent)', onClick, sub }) {
  const interactive = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': typeof label === 'string' ? label : undefined,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } },
      }
    : {};
  return (
    <div onClick={onClick} {...interactive} className="card card-pad" style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: accent, opacity: .07, filter: 'blur(8px)' }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 6, position: 'relative' }}>
        <div className="col gap-1">
          <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)' }}>
            <AnimatedNumber value={value} format={format} />
          </div>
          {trend != null ? <Trend value={trend} /> : (sub && <div className="t-xs muted">{sub}</div>)}
        </div>
        {spark && <div style={{ opacity: .95 }}><Sparkline data={spark} color={sparkColor || accent} w={96} h={38} /></div>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
export function useToast() {
  const show = (msg, tone = 'ok') => {
    // Announce through the aria-live region so screen readers hear the toast.
    // Errors are assertive; confirmations are polite.
    announce(msg, { assertive: tone === 'risk' });
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99;padding:.75rem 1.25rem;border-radius:var(--r-sm);font-weight:600;box-shadow:var(--shadow-lg);background:${tone === 'risk' ? 'var(--risk)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)'};color:#fff;animation:fadeUp .3s var(--ease)`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2400);
  };
  return show;
}

/* ---------- Health dot ---------- */
export function HealthDot({ health }) {
  const map = { green: 'var(--ok)', yellow: 'var(--warn)', red: 'var(--risk)' };
  return <span className="dot" style={{ background: map[health] || 'var(--n-400)' }} />;
}

/* ---------- Money / date helpers ---------- */
export const money = (n) => (n == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n));
export const moneyK = (n) => {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};
export const shortDate = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
export const longDate = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }));
export const monthDay = (d) => (d == null ? '-' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
export const timeStr = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export function relTime(d) {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const day = 86400000;
  if (diff < 0) {
    const ahead = Math.round(-diff / day);
    if (ahead === 0) return 'today';
    if (ahead === 1) return 'tomorrow';
    return `in ${ahead}d`;
  }
  const days = Math.floor(diff / day);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
