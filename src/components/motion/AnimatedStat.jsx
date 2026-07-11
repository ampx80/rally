// AnimatedStat - a premium KPI tile that comes alive on view: the value
// counts up and its sparkline draws itself in, both driven by a single
// IntersectionObserver so they fire together the moment the tile is seen.
// Mirrors the shape of the shared StatCard (label, value, icon, spark, sub /
// trend, corner glow) so it is a drop-in upgrade. ASCII only.
// No em-dash / en-dash.
import React from 'react';
import { useInView } from './useInView';
import CountUp from './CountUp';
import { Trend } from '../UI';
import './motion.css';

/* A sparkline whose stroke draws in when `inView` flips true. Same geometry
   as the shared Sparkline so it reads as the same family. */
function DrawSpark({ data, color, w = 96, h = 40, inView }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / span) * (h - 6) - 3,
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = 'pmspk' + Math.round(pts[0][1] * 100 + w + data.length);
  return (
    <svg
      className={'pm-spark' + (inView ? ' pm-in' : '')}
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', overflow: 'visible' }} aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="pm-spark-area" d={area} fill={`url(#${gid})`} />
      <path
        className="pm-spark-line" d={line} pathLength="1"
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AnimatedStat({
  label, value, format, trend, spark, sparkColor,
  icon, accent = 'var(--accent)', onClick, sub, dur = 1100,
}) {
  const [ref, inView] = useInView({ once: true });
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="card card-pad pm-stat"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="pm-stat__blob" style={{ background: accent }} />
      <div className="row between" style={{ position: 'relative' }}>
        <div className="stat-label">{label}</div>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 6, position: 'relative' }}>
        <div className="col gap-1">
          <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.5rem)' }}>
            <CountUp value={value} format={format} dur={dur} trigger={inView} />
          </div>
          {trend != null
            ? <Trend value={trend} />
            : (sub && <div className="t-xs muted">{sub}</div>)}
        </div>
        {spark && spark.length > 1 && (
          <div style={{ opacity: .95 }}>
            <DrawSpark data={spark} color={sparkColor || 'var(--accent)'} inView={inView} />
          </div>
        )}
      </div>
    </div>
  );
}
