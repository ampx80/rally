// ForecastChart - a dashboard that builds itself. Bars grow from the baseline,
// a trend line self-draws across them, and the headline forecast counts up.
// Illustrates "charts off real data, live". Reduced motion shows the final chart.
// NO em-dash / en-dash. ASCII hyphen only.
import React from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, CountUp } from './useAnim.jsx';
import './viz.css';

const BARS = [38, 52, 46, 63, 58, 74, 69, 88];
const LABELS = ['Win rate', 'Avg cycle', 'Deals won'];
const VALUES = [{ to: 34, suffix: '%' }, { to: 19, suffix: 'd' }, { to: 42 }];

export default function ForecastChart() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView(0.4);
  const play = reduced || inView;
  const max = Math.max(...BARS);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="chart" size={15} /> Revenue forecast</span>
        <span className="vz-chip vz-chip-teal"><Icon name="trendUp" size={13} /> +18%</span>
      </div>

      <div className="vz-forecast-value">
        <CountUp to={1.24} prefix="$" suffix="M" decimals={2} /> <span className="vz-forecast-sub">weighted this quarter</span>
      </div>

      <div className={`vz-chart${play ? ' is-in' : ''}`}>
        <div className="vz-bars">
          {BARS.map((h, i) => (
            <span key={i} className="vz-bar-wrap">
              <span className="vz-bar" style={{ height: `${(h / max) * 100}%`, transitionDelay: `${i * 70}ms` }} />
            </span>
          ))}
        </div>
        <svg className="vz-line-svg" viewBox="0 0 320 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="vzLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5b4bf5" /><stop offset="0.55" stopColor="#a855f7" /><stop offset="1" stopColor="#0e9f9a" />
            </linearGradient>
            <linearGradient id="vzLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(91,75,245,.18)" /><stop offset="1" stopColor="rgba(91,75,245,0)" />
            </linearGradient>
          </defs>
          <path className="vz-line-area" d="M6 92 L50 78 L94 84 L138 58 L182 66 L226 40 L270 48 L314 20 L314 120 L6 120 Z" fill="url(#vzLineFill)" />
          <path className="vz-line-path" d="M6 92 L50 78 L94 84 L138 58 L182 66 L226 40 L270 48 L314 20" fill="none" stroke="url(#vzLineStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="vz-statrow">
        {LABELS.map((l, i) => (
          <div key={l} className="vz-stat">
            <div className="vz-stat-val">
              <CountUp to={VALUES[i].to} prefix={VALUES[i].prefix || ''} suffix={VALUES[i].suffix || ''} decimals={VALUES[i].dec || 0} />
            </div>
            <div className="vz-stat-label">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
