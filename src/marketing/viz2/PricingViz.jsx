// PricingViz - animated plan cards (spring in, popular plan glows + pulses,
// checklist ticks on in-view), plus an ROI / savings counter with a legacy-vs-
// Rally comparison toggle and count-up totals. No em-dash / en-dash.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';
import { useInView, useStagger, useCountUp } from './hooks.js';
import './viz2.css';

function PlanCard({ tier, annual, index }) {
  const [cardRef, inView] = useInView({ threshold: 0.18 });
  const [listRef, step] = useStagger(tier.features.length, { interval: 120, initialDelay: 260 });

  const isPaid = !tier.custom && tier.monthly > 0;
  const annualPerMonth = (m) => Math.round((m * 10) / 12);
  const price = tier.custom ? 'Custom' : tier.monthly === 0 ? '$0' : `$${annual ? annualPerMonth(tier.monthly) : tier.monthly}`;
  const unit = isPaid ? (annual ? 'per seat / mo, billed annually' : tier.unit) : tier.unit;

  return (
    <div
      ref={cardRef}
      className={`v2-plan${tier.popular ? ' v2-plan-pop' : ''}${inView ? ' is-in' : ''}`}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      {tier.popular && <span className="v2-plan-glowbar" aria-hidden />}
      <div className="v2-plan-head">
        <h3 className="v2-plan-name">{tier.name}</h3>
        {tier.popular && <span className="v2-plan-badge">Most popular</span>}
      </div>
      <div className="v2-plan-pricerow">
        <span key={price} className="v2-plan-price v2-pricepop">{price}</span>
      </div>
      <div className="v2-plan-unit">{unit}</div>
      <p className="v2-plan-line">{tier.line}</p>
      <hr className="v2-plan-rule" />
      <ul ref={listRef} className="v2-checks">
        {tier.features.map((f, i) => (
          <li key={f} className={`v2-check${step > i ? ' is-on' : ''}`}>
            <span className="v2-check-mark"><Icon name="check" size={13} stroke={3.2} /></span>
            <span className="v2-check-text">{f}</span>
          </li>
        ))}
      </ul>
      <div className="v2-plan-cta">
        <Link
          to={tier.to}
          className={`mkt-btn ${tier.popular ? 'mkt-btn-primary' : 'mkt-btn-ghost'} m-magnet`}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {tier.cta} <Icon name="chevronRight" size={18} />
        </Link>
      </div>
    </div>
  );
}

export function PlanCards({ tiers, annual }) {
  return (
    <div className="v2 v2-plans">
      {tiers.map((t, i) => (
        <PlanCard key={t.name} tier={t} annual={annual} index={i} />
      ))}
    </div>
  );
}

// Illustrative legacy-stack vs Rally cost comparison. Toggling swaps the panel;
// the total animates up on view. Figures are illustrative for this preview.
const STACKS = {
  legacy: {
    label: 'Legacy stack',
    total: 2140,
    rows: [
      ['Seat licenses (5)', 1225, 100],
      ['AI add-on tax', 495, 40],
      ['Implementation / admin', 320, 26],
      ['Integration glue', 100, 8],
    ],
  },
  rally: {
    label: 'Rally',
    total: 245,
    rows: [
      ['Seats (5, all-in)', 245, 100],
      ['Rook operator', 0, 0],
      ['Implementation', 0, 0],
      ['Integration tax', 0, 0],
    ],
  },
};

export function RoiCompare() {
  const [mode, setMode] = useState('legacy');
  const stack = STACKS[mode];
  const savings = STACKS.legacy.total - STACKS.rally.total;
  const [saveRef, saveVal] = useCountUp(savings * 12, { duration: 1600 });
  const [totalRef, totalVal] = useCountUp(stack.total, { duration: 900 });

  return (
    <div className="v2 v2-roi">
      <div>
        <div className="v2-roi-toggle" role="group" aria-label="Compare monthly cost">
          <button
            className={`v2-roi-tbtn v2-legacy${mode === 'legacy' ? ' is-on' : ''}`}
            onClick={() => setMode('legacy')}
          >
            Legacy stack
          </button>
          <button
            className={`v2-roi-tbtn v2-rally${mode === 'rally' ? ' is-on' : ''}`}
            onClick={() => setMode('rally')}
          >
            Rally
          </button>
        </div>
        <h3 className="v2-roi-title">One price replaces the whole stack.</h3>
        <p className="v2-roi-sub">
          The incumbents charge for seats, then again for AI, then again for the consultant who wires it
          together. Rally is one all-in price with the operator included. Toggle to see the difference.
        </p>
        <div ref={saveRef} style={{ marginTop: 24 }}>
          <div className="v2-roi-big mkt-grad">${Math.round(saveVal).toLocaleString()}</div>
          <div className="v2-roi-biglabel">Estimated first-year savings, team of 5</div>
        </div>
        <p className="v2-roi-note">Illustrative for this preview. Actual savings vary by stack and seat count.</p>
      </div>

      <div className="v2-roi-panel">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: 'var(--m-ink)' }}>{stack.label}</div>
          <div ref={totalRef} style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.03em', color: mode === 'rally' ? 'var(--m-accent)' : 'var(--m-ink)' }}>
            ${Math.round(totalVal).toLocaleString()}<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink3)' }}> / mo</span>
          </div>
        </div>
        <div className="v2-roi-bars">
          {stack.rows.map(([label, val, pct]) => (
            <div key={label} className="v2-roi-bar">
              <div className="v2-roi-barrow">
                <span>{label}</span>
                <span className="v2-roi-barval">{val === 0 ? 'Included' : `$${val.toLocaleString()}`}</span>
              </div>
              <div className="v2-roi-track">
                <div className={`v2-roi-fill v2-${mode}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
