// ManifestoViz - cinematic editorial motion. Kinetic headline that reveals word
// by word on scroll (with a shimmering gradient phrase), and an animated
// through-line timeline whose gradient spine draws itself as the three eras of
// the CRM light up in sequence. No em-dash / en-dash.
import React from 'react';
import { Icon } from '../../components/icons.jsx';
import { useInView, useStagger } from './hooks.js';
import './viz2.css';

// parts: [{ text, grad? }]. Renders each word as an independently animating span.
export function KineticHeadline({ parts, className = '', style }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  let idx = 0;
  return (
    <h1 ref={ref} className={`v2 v2-kinetic mkt-h1 ${inView ? 'is-in' : ''} ${className}`} style={style}>
      {parts.map((p, pi) => {
        const words = p.text.split(' ');
        return (
          <span key={pi} className={p.grad ? 'v2-shimmer' : undefined}>
            {words.map((w, wi) => {
              const i = idx++;
              return (
                <React.Fragment key={wi}>
                  <span className="v2-kword" style={{ transitionDelay: `${i * 70}ms` }}>{w}</span>
                  {wi < words.length - 1 && <span className="v2-kspace" />}
                </React.Fragment>
              );
            })}
            {pi < parts.length - 1 && <span className="v2-kspace" />}
          </span>
        );
      })}
    </h1>
  );
}

const ERAS = [
  {
    icon: 'building',
    kicker: 'Then',
    title: 'A system of record',
    desc: 'The CRM became a filing cabinet with a login. Reps feed it, managers mine it for reports, and everyone agrees to pretend the data is clean.',
  },
  {
    icon: 'sparkles',
    kicker: 'The bolt-on',
    title: 'A chatbot in the corner',
    desc: 'The incumbents stapled a chat box onto a twenty-year-old architecture. It summarizes a record you already opened. It sits beside the work.',
  },
  {
    icon: 'zap',
    kicker: 'Now',
    title: 'An operator that runs the work',
    desc: 'Ardovo is AI-native from the first commit. Rook reaches your data, workflow, and actions natively. You set direction and approve. It executes.',
  },
];

export function Throughline() {
  const [ref, step] = useStagger(ERAS.length, { interval: 420, initialDelay: 320 });
  return (
    <div ref={ref} className={`v2 v2-thread${step > 0 ? ' is-in' : ''}`}>
      <div className="v2-thread-line" aria-hidden><span className="v2-thread-fill" /></div>
      {ERAS.map((e, i) => (
        <div key={e.title} className={`v2-step${step > i ? ' is-on' : ''}`}>
          <span className="v2-step-dot"><Icon name={e.icon} size={24} /></span>
          <div className="v2-step-body">
            <div className="v2-step-kicker">{e.kicker}</div>
            <h3 className="v2-step-title">{e.title}</h3>
            <p className="v2-step-desc">{e.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Reveal-on-scroll wrapper for the pull-quotes, with a shimmering gradient.
export function ShimmerQuote({ children }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  let idx = 0;
  const words = String(children).split(' ');
  return (
    <h3
      ref={ref}
      className={`v2 v2-kinetic v2-shimmer ${inView ? 'is-in' : ''}`}
      style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)', lineHeight: 1.16, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}
    >
      {words.map((w, wi) => {
        const i = idx++;
        return (
          <React.Fragment key={wi}>
            <span className="v2-kword" style={{ transitionDelay: `${i * 45}ms` }}>{w}</span>
            {wi < words.length - 1 && <span className="v2-kspace" />}
          </React.Fragment>
        );
      })}
    </h3>
  );
}
