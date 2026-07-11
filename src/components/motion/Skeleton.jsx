// Skeleton - loading shimmer primitives. A single box by default, plus a
// couple of composed helpers (text lines, a chart placeholder) so a page
// can show a polished loading state that matches the shape of whatever is
// about to render. Pure CSS shimmer (see motion.css), reduced-motion safe.
// ASCII only. No em-dash / en-dash.
import React from 'react';
import './motion.css';

export default function Skeleton({ w = '100%', h = 16, radius = 8, className = '', style }) {
  return (
    <span
      className={'pm-skel' + (className ? ' ' + className : '')}
      style={{ width: w, height: h, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/* A block of shimmer text lines (last line shorter, like real copy). */
export function SkeletonText({ lines = 3, gap = 10, style }) {
  return (
    <span className="col" style={{ gap, width: '100%', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={12} w={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </span>
  );
}

/* A chart-shaped placeholder: a row of bars of varied height. Matches the
   footprint of the recharts container it stands in for so nothing jumps. */
export function SkeletonChart({ height = 300, bars = 8 }) {
  const heights = [52, 76, 40, 88, 64, 96, 58, 72, 46, 82];
  return (
    <div className="pm-skel-chart" style={{ height, paddingTop: 8 }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton key={i} w="100%" h={`${heights[i % heights.length]}%`} radius={6} />
      ))}
    </div>
  );
}
