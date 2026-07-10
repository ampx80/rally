// PipelineBoard - a live kanban where a deal advances stage on a loop. The
// traveling deal springs into the next column, the weighted forecast ticks up,
// and a Won ring pulses when it lands in Closing. Illustrates "pipeline you can
// actually run". Reduced motion renders the deal already in Closing.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const COLS = [
  { name: 'Qualified', dot: '#5b4bf5', cards: [['Atlas expansion', '$22k'], ['Cedar renewal', '$18k']] },
  { name: 'Proposal', dot: '#a855f7', cards: [['Beacon platform', '$91k']] },
  { name: 'Closing', dot: '#0e9f9a', cards: [['Orbit seats', '$34k']] },
];
const WEIGHTED = ['$248k', '$272k', '$301k'];
const PCT = ['40%', '70%', '92%'];

export default function PipelineBoard() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [stage, setStage] = useState(reduced ? 2 : 0);
  const [won, setWon] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setStage(0); setWon(false);
    T(() => setStage(1), 1300);
    T(() => setStage(2), 2600);
    T(() => setWon(true), 3050);
    done();
  }, [], 2600);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-head">
        <span className="vz-head-title"><Icon name="target" size={15} /> Pipeline</span>
        <span key={stage} className="vz-chip vz-chip-accent vz-pop">
          <Icon name="trendUp" size={13} /> Weighted {WEIGHTED[stage]}
        </span>
      </div>

      <div className="vz-board">
        {COLS.map((col, ci) => (
          <div key={col.name} className={`vz-col${ci === stage ? ' is-active' : ''}`}>
            <div className="vz-col-head">
              <span className="vz-col-dot" style={{ background: col.dot }} />
              {col.name}
              <span className="vz-col-count">{col.cards.length + (ci === stage ? 1 : 0)}</span>
            </div>
            <div className="vz-col-body">
              {ci === stage && (
                <div className={`vz-deal vz-deal-live vz-spring${won && ci === 2 ? ' vz-won' : ''}`} key={`live-${stage}`}>
                  <div className="vz-deal-top">
                    <span className="vz-deal-name">Vertex platform</span>
                    <span className="vz-deal-amt">$156k</span>
                  </div>
                  <div className="vz-deal-foot">
                    <span className="vz-mini-rail"><span className="vz-mini-fill" style={{ width: PCT[stage] }} /></span>
                    <span className="vz-deal-pct">{PCT[stage]}</span>
                  </div>
                </div>
              )}
              {col.cards.map(([t, v]) => (
                <div key={t} className="vz-deal vz-deal-idle">
                  <div className="vz-deal-top">
                    <span className="vz-deal-name">{t}</span>
                    <span className="vz-deal-amt vz-deal-amt-idle">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
