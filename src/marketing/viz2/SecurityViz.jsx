// SecurityViz - calm, credible trust motion. A shield that assembles with a
// lock clicking in and pulse rings, an encrypted data-flow diagram (browser ->
// Ardovo edge -> encrypted store, packets in transit), and an animated compliance
// badge row. No em-dash / en-dash.
import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useInView, useReducedMotion } from './hooks.js';
import './viz2.css';

export function ShieldAssemble() {
  const [ref, inView] = useInView({ threshold: 0.3 });
  return (
    <div ref={ref} className={`v2 v2-shield-wrap`}>
      <svg className={`v2-shield${inView ? ' is-in' : ''}`} viewBox="0 0 240 264" role="img" aria-label="Encrypted shield">
        <defs>
          <linearGradient id="v2ShieldFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6d5cf7" />
            <stop offset="0.55" stopColor="#5b4bf5" />
            <stop offset="1" stopColor="#4a3ce0" />
          </linearGradient>
          <linearGradient id="v2ShieldStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="1" stopColor="#5b4bf5" />
          </linearGradient>
        </defs>
        <circle className="v2-shield-ring" cx="120" cy="128" r="74" />
        <circle className="v2-shield-ring" cx="120" cy="128" r="94" style={{ animationDelay: '1.3s' }} />
        <path className="v2-shield-plate" d="M120 20 L208 54 V132 C208 198 120 240 120 240 C120 240 32 198 32 132 V54 Z" />
        {/* lock */}
        <g className="v2-shield-lock">
          <rect x="94" y="128" width="52" height="42" rx="9" fill="none" stroke="#fff" strokeWidth="6" />
          <path d="M104 128 v-12 a16 16 0 0 1 32 0 v12" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <circle cx="120" cy="146" r="5.5" fill="#fff" />
          <rect x="117" y="148" width="6" height="12" rx="3" fill="#fff" />
        </g>
        {/* assemble seam */}
        <path className="v2-shield-seg" d="M120 20 L208 54 V132 C208 198 120 240 120 240" />
      </svg>
    </div>
  );
}

const NODES = [
  { icon: 'user', label: 'Your browser', accent: false },
  { icon: 'shield', label: 'Ardovo edge', accent: true },
  { icon: 'lock', label: 'Encrypted store', accent: false },
];
const SEALS = ['TLS 1.2+', 'AES-256'];

export function DataFlow() {
  return (
    <div className="v2 v2-flow" role="img" aria-label="Encrypted data flow: browser to Ardovo edge to encrypted store">
      <div className="v2-flow-row">
        {NODES.map((n, i) => (
          <React.Fragment key={n.label}>
            <div className="v2-flow-cell">
              <span className={`v2-flow-disc${n.accent ? ' v2-flow-disc-accent' : ''}`}>
                <Icon name={n.icon} size={30} />
              </span>
              <span className="v2-flow-lbl">{n.label}</span>
            </div>
            {i < NODES.length - 1 && (
              <div className="v2-flow-conn">
                <span className="v2-flow-seal"><Icon name="lock" size={12} /> {SEALS[i]}</span>
                <span className="v2-flow-wire" aria-hidden><span /></span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="v2-flow-legend">
        <span className="v2-flow-legitem"><span className="v2-flow-legdot" /> Encrypted in transit</span>
        <span className="v2-flow-legitem"><span className="v2-flow-legdot" /> Encrypted at rest</span>
        <span className="v2-flow-legitem"><span className="v2-flow-legdot" /> No plaintext at any layer</span>
      </div>
    </div>
  );
}

export function ComplianceBadges({ items }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  return (
    <div ref={ref} className="v2 v2-badges">
      {items.map((b, i) => (
        <div key={b.label} className={`v2-badge${inView ? ' is-in' : ''}`} style={{ animationDelay: `${i * 120}ms` }}>
          <span className="v2-badge-seal">
            <Icon name={b.icon} size={26} />
            <span className="v2-badge-check"><Icon name="check" size={13} stroke={3.2} /></span>
          </span>
          <span className="v2-badge-label">{b.label}</span>
          <span className="v2-badge-status">{b.status}</span>
        </div>
      ))}
    </div>
  );
}

// Small "your record, encrypted" chip: cycles plaintext -> ciphertext to show
// data never sits in the clear. Purely decorative.
const PLAIN = 'Acme Corp deal  $240,000';
const HEX = '0123456789abcdef';
export function EncryptChip() {
  const reduced = useReducedMotion();
  const [enc, setEnc] = useState(false);
  const [text, setText] = useState(PLAIN);
  useEffect(() => {
    if (reduced) return;
    let raf, t0;
    let phase = 'hold'; // hold -> scramble -> encHold -> unscramble
    let timer;
    const scrambleTo = (encrypted, done) => {
      let frame = 0;
      const run = () => {
        frame += 1;
        const progress = Math.min(1, frame / 14);
        const out = PLAIN.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          const settled = encrypted ? progress > (i / PLAIN.length) : progress > (1 - i / PLAIN.length);
          if (encrypted) return progress * PLAIN.length > (PLAIN.length - i) ? HEX[(Math.random() * 16) | 0] : (Math.random() < progress ? HEX[(Math.random() * 16) | 0] : ch);
          return progress > (i / PLAIN.length) ? PLAIN[i] : HEX[(Math.random() * 16) | 0];
        }).join('');
        setText(out);
        if (frame < 14) raf = requestAnimationFrame(run);
        else { setText(encrypted ? PLAIN.split('').map(c => c === ' ' ? ' ' : HEX[(Math.random() * 16) | 0]).join('') : PLAIN); done && done(); }
      };
      run();
    };
    const cycle = () => {
      setEnc(true);
      scrambleTo(true, () => {
        timer = setTimeout(() => {
          setEnc(false);
          scrambleTo(false, () => { timer = setTimeout(cycle, 2600); });
        }, 2200);
      });
    };
    timer = setTimeout(cycle, 1600);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [reduced]);
  return (
    <span className={`v2 v2-scramble${enc ? ' is-enc' : ''}`}>
      <span className="v2-scramble-lock"><Icon name={enc ? 'lock' : 'eye'} size={16} /></span>
      <span className="v2-scramble-text">{text}</span>
    </span>
  );
}
