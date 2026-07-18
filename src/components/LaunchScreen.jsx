// The launch moment. A short, branded intro the first time the workspace
// loads in a session. Sets the tone: this is a serious, premium platform.
import React, { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';

export default function LaunchScreen() {
  const [gone, setGone] = useState(() => {
    try { return sessionStorage.getItem('rally_launched') === '1'; } catch { return false; }
  });
  useEffect(() => {
    if (gone) return;
    try { sessionStorage.setItem('rally_launched', '1'); } catch {}
    const t = setTimeout(() => setGone(true), 2600);
    return () => clearTimeout(t);
  }, [gone]);
  if (gone) return null;
  return (
    <div className="launch" aria-hidden>
      <div className="launch__mark"><img src="/brand/ardovo-icon.png" alt="Ardovo" /></div>
      <div className="launch__word">Ardovo</div>
      <div className="launch__tag">Run your revenue on Ardovo</div>
      <div className="launch__bar"><i /></div>
    </div>
  );
}
