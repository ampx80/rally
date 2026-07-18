// SwitchScene - the "old way vs Ardovo way" comparison, dramatized. LEFT is the
// legacy CRM visibly thrashing: eleven crammed tabs, skeleton rows that shimmer
// forever and never load, a setup bar stuck at month 7 of 11, a spinner, and red
// required-field flags. RIGHT is Ardovo: the deal card springs together and Rook
// TYPES a real follow-up email, then shows "ready to send". The contrast in
// motion (endless futile churn vs one decisive assembly) is the whole pitch.
// Honors prefers-reduced-motion. NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';

const OLD_TABS = ['Account', 'Contacts', 'Activities', 'Opportunity', 'Products', 'Quotes', 'Forecast', 'Reports'];
const OLD_ROWS = [
  { w: 92, req: false }, { w: 64, req: true }, { w: 78, req: false }, { w: 55, req: true },
  { w: 84, req: false }, { w: 48, req: false }, { w: 70, req: false },
];

const EMAIL = "Hi Dana, great talking through the rollout. Confirming the exec demo Thursday at 2pm - I'll bring the security review and a phased plan for the 4 regions. Anything else the committee needs first?";

export default function SwitchScene() {
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [built, setBuilt] = useState(reduced);       // right card assembled
  const [typed, setTyped] = useState(reduced ? EMAIL.length : 0);
  const [ready, setReady] = useState(reduced);
  const timers = useRef([]);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };

    function run() {
      if (cancelled) return;
      setBuilt(false); setTyped(0); setReady(false);
      T(() => setBuilt(true), 500);
      T(startType, 1500);
    }
    function startType() {
      if (cancelled) return;
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        i += 1; setTyped(i);
        if (i < EMAIL.length) T(tick, 14 + Math.random() * 26);
        else { T(() => setReady(true), 500); T(run, 4200); } // hold, then loop
      };
      tick();
    }
    run();
    return () => { cancelled = true; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [reduced]);

  return (
    <div className="mkt-switch">
      {/* ============ THE OLD WAY ============ */}
      <div className="mkt-switch-card mkt-oldway">
        <div className="mkt-switch-head">
          <span className="mkt-switch-kicker mkt-oldway-kicker">THE OLD WAY</span>
          <span className="mkt-oldway-loading">
            <span className="mkt-spinner" /> Still loading
          </span>
        </div>

        {/* crammed tab bar */}
        <div className="mkt-oldtabs">
          {OLD_TABS.map((t, i) => (
            <span key={t} className={`mkt-oldtab${i === 3 ? ' is-active' : ''}`}>{t}</span>
          ))}
          <span className="mkt-oldtab mkt-oldtab-more">+5</span>
        </div>

        {/* stuck setup bar */}
        <div className="mkt-oldbar-wrap">
          <div className="mkt-oldbar-row">
            <span>Setup: month 7 of 11</span><span className="mkt-oldbar-pct">63%</span>
          </div>
          <div className="mkt-oldbar-track"><span className="mkt-oldbar-fill" /></div>
        </div>

        {/* skeleton form that never loads */}
        <div className="mkt-oldform">
          {OLD_ROWS.map((r, i) => (
            <div key={i} className="mkt-oldrow">
              <span className="mkt-sk mkt-sk-label" style={{ width: `${34 + (i % 3) * 10}%` }} />
              <span className="mkt-oldfield">
                <span className="mkt-sk mkt-sk-input" style={{ width: `${r.w}%` }} />
                {r.req && <span className="mkt-req">required</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="mkt-olderror">
          <span className="mkt-olderror-glyph">!</span> 4 required fields nobody understands
        </div>
        <p className="mkt-switch-cap">Eleven tabs, fields no one can explain, and a consultant on retainer.</p>
      </div>

      {/* ============ THE ARDOVO WAY ============ */}
      <div className="mkt-switch-card mkt-rallyway">
        <div className="mkt-switch-head">
          <span className="mkt-switch-kicker mkt-rally-kicker">THE ARDOVO WAY</span>
          <span className="mkt-rally-live"><span className="mkt-dot m-pulse" /> LIVE IN 3 SECONDS</span>
        </div>

        <div className={`mkt-dealcard${built ? ' is-in' : ''}`}>
          <div className="mkt-dealcard-top">
            <span className="mkt-dealcard-name">Meridian Health - platform rollout</span>
            <span className="mkt-dealcard-amt">$240K</span>
          </div>
          <div className="mkt-dealcard-meta">
            <span className="mkt-dealcard-stage">QUALIFIED</span>
            <span className="mkt-dealcard-next">Next step: exec demo Thursday</span>
          </div>

          {/* Rook follow-up that types itself */}
          <div className="mkt-rook-mail">
            <div className="mkt-rook-mailhead">
              <Icon name="sparkles" size={13} /> Rook drafted your follow-up
              {ready && <span className="mkt-rook-ready"><Icon name="check" size={11} stroke={3} /> ready to send</span>}
            </div>
            <div className="mkt-rook-mailbody">
              {EMAIL.slice(0, typed)}
              {built && typed < EMAIL.length && <span className="m-cursor" />}
            </div>
            <div className="mkt-rook-mailfoot">
              <span className="mkt-rook-to">To: Dana Whitfield, VP Ops</span>
              <span className={`mkt-rook-send${ready ? ' is-on' : ''}`}>Send <Icon name="chevronRight" size={13} /></span>
            </div>
          </div>
        </div>

        <p className="mkt-switch-cap">One card, everything on it, and the follow-up already written. That is the whole workflow.</p>
      </div>
    </div>
  );
}
