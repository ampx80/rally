// VoiceLog - talk to log. A live waveform pulses while Rook listens, the spoken
// update transcribes itself, then it lands on the right record with a "Logged"
// confirmation. Illustrates "speak an update, Rook writes it to the record".
// Reduced motion shows the logged state. NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useReducedMotion, useInView, useLoop } from './useAnim.jsx';
import './viz.css';

const SAID = "Log a call with Jordan, 20 minutes, agreed to send the security packet.";
const BARS = [10, 20, 32, 16, 26, 38, 22, 30, 14, 24, 34, 18, 28, 12];

export default function VoiceLog() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [listening, setListening] = useState(!reduced);
  const [typed, setTyped] = useState(reduced ? SAID.length : 0);
  const [logged, setLogged] = useState(reduced);

  useLoop(inView && !reduced, (T, done) => {
    setListening(true); setTyped(0); setLogged(false);
    let i = 0;
    const type = () => {
      i += 1; setTyped(i);
      if (i < SAID.length) T(type, 16 + Math.random() * 22);
      else { setListening(false); T(() => setLogged(true), 450); T(done, 2400); }
    };
    T(type, 700);
  }, [], 900);

  return (
    <div className="vz-frame" ref={ref} aria-hidden>
      <div className="vz-voice-top">
        <span className={`vz-voice-orb${listening ? ' is-live' : ''}`}>
          <Icon name="mic" size={22} fill="#fff" stroke={0} />
        </span>
        <div className={`vz-wave${listening ? ' is-live' : ''}`}>
          {BARS.map((h, i) => (
            <span key={i} className="vz-wave-bar" style={{ height: h, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>

      <div className="vz-voice-said">
        <span className="vz-voice-q">"</span>{SAID.slice(0, typed)}{listening && typed < SAID.length && <span className="m-cursor" />}<span className="vz-voice-q">"</span>
      </div>

      <div className={`vz-voice-logged${logged ? ' is-in' : ''}`}>
        <span className="vz-voice-check"><Icon name="check" size={13} stroke={3} /></span>
        Logged to <b>Jordan Reyes</b> as a call activity
      </div>
    </div>
  );
}
