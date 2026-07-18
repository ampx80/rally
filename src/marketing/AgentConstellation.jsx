// AgentConstellation - a full-bleed dark "operator constellation" showcase for
// the home page. Backdrop is the same living neural mesh as the sign-up gate
// (drifting teal/violet particles, links, cursor-reactive), with a glowing
// Ardovo/Rook core and the AI capabilities orbiting it on energy-pulsed spokes.
// Each capability lights up + explains itself (panel sits BELOW the stage, so
// nothing overlaps). Canvas for mesh/spokes/pulses, crisp HTML nodes on top.
// DPR-aware, capped, reduced-motion safe. NO em-dash / en-dash.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Reveal, MktButton } from './kit.jsx';

const CAPS = [
  { id: 'rook', label: 'Rook Operator', icon: 'sparkles', desc: 'The AI that runs the actual work, grounded in your live book of business.' },
  { id: 'agent', label: 'Agent Cloud', icon: 'command', desc: 'A governed fleet of agents that execute, not just suggest.' },
  { id: 'atlas', label: 'Atlas', icon: 'radar', desc: 'Your pipeline as a living map. Win-likelihood, predicted from your own history.' },
  { id: 'night', label: 'Night Shift', icon: 'moon', desc: 'Autonomous overnight moves, every one reversible by morning.' },
  { id: 'voice', label: 'Voice', icon: 'mic', desc: 'Talk to Ardovo hands-free. It navigates, drafts, and dials.' },
  { id: 'migrate', label: 'Migration', icon: 'swap', desc: 'Salesforce to live in a weekend, cleansed on the way in.' },
  { id: 'forecast', label: 'Forecasting', icon: 'trendUp', desc: 'A forecast that updates itself from real signal.' },
  { id: 'training', label: 'Training', icon: 'rocket', desc: 'Every rep onboarded by a patient AI, not a manual.' },
];

export default function AgentConstellation() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const posRef = useRef([]);
  const coreRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(-1);
  const [pos, setPos] = useState([]);
  const [core, setCore] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(-1);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TEAL = [22, 209, 201], VIOLET = [124, 92, 247];
    let w = 0, h = 0, dpr = 1, particles = [], raf = 0, running = true, t0 = performance.now();
    const pointer = { x: -9999, y: -9999, active: false };
    const LINK = 138, REACH = 200;

    function layout() {
      w = wrap.clientWidth; h = wrap.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w / 2, cy = h * 0.5;
      coreRef.current = { x: cx, y: cy };
      const rx = Math.min(w * 0.40, 470), ry = Math.min(h * 0.36, 248);
      const n = CAPS.length;
      const p = CAPS.map((_, i) => {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return { x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry };
      });
      posRef.current = p;
      setPos(p); setCore({ x: cx, y: cy });
      // Dense drifting mesh, same feel as the sign-up gate.
      const count = Math.min(96, Math.max(40, Math.floor((w * h) / 15000)));
      particles = [];
      for (let i = 0; i < count; i++) particles.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: .8 + Math.random() * 1.7, violet: Math.random() < .17 });
    }

    function draw(now) {
      const time = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const core = coreRef.current, p = posRef.current, act = activeRef.current;

      // ---- ambient neural mesh (gate-style) ----
      for (const nd of particles) {
        nd.x += nd.vx; nd.y += nd.vy;
        if (nd.x < -20) nd.x = w + 20; else if (nd.x > w + 20) nd.x = -20;
        if (nd.y < -20) nd.y = h + 20; else if (nd.y > h + 20) nd.y = -20;
        if (pointer.active) {
          const dx = pointer.x - nd.x, dy = pointer.y - nd.y, d = Math.hypot(dx, dy);
          if (d < 150 && d > 0.5) { nd.x += (dx / d) * 0.22; nd.y += (dy / d) * 0.22; }
        }
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            const tt = 1 - d / LINK; const c = (a.violet || b.violet) ? VIOLET : TEAL;
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${tt * 0.2})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (pointer.active) {
          const dx = a.x - pointer.x, dy = a.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < REACH) { const tt = 1 - d / REACH; ctx.strokeStyle = `rgba(22,209,201,${tt * 0.45})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke(); }
        }
      }
      for (const nd of particles) { const c = nd.violet ? VIOLET : TEAL; ctx.beginPath(); ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.85)`; ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},.9)`; ctx.shadowBlur = 7; ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0;

      // ---- core -> capability spokes + traveling pulses ----
      for (let i = 0; i < p.length; i++) {
        const node = p[i]; if (!node) continue;
        const isActive = i === act;
        const c = (CAPS[i].id === 'rook' || CAPS[i].id === 'agent') ? VIOLET : TEAL;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${isActive ? 0.9 : 0.34})`;
        ctx.lineWidth = isActive ? 2.4 : 1.2;
        ctx.beginPath(); ctx.moveTo(core.x, core.y); ctx.lineTo(node.x, node.y); ctx.stroke();
        if (!reduce) {
          const frac = isActive ? (time * 1.1 + i * 0.13) % 1 : (time * 0.5 + i / p.length) % 1;
          const px = core.x + (node.x - core.x) * frac, py = core.y + (node.y - core.y) * frac;
          ctx.beginPath(); ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${isActive ? 1 : 0.85})`;
          ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},1)`; ctx.shadowBlur = isActive ? 15 : 9;
          ctx.arc(px, py, isActive ? 3.6 : 2.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      // ---- core glow ----
      const pulse = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(time * 1.6));
      const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 104 + pulse * 30);
      g.addColorStop(0, 'rgba(22,209,201,.5)'); g.addColorStop(0.5, 'rgba(124,92,247,.2)'); g.addColorStop(1, 'rgba(22,209,201,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(core.x, core.y, 104 + pulse * 30, 0, Math.PI * 2); ctx.fill();

      if (running && !reduce) raf = requestAnimationFrame(draw);
    }

    layout();
    let ro;
    try { ro = new ResizeObserver(() => layout()); ro.observe(wrap); } catch { window.addEventListener('resize', layout); }
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = pointer.x >= -40 && pointer.x <= w + 40 && pointer.y >= -40 && pointer.y <= h + 40; };
    const onLeave = () => { pointer.active = false; };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(draw);
    if (reduce) draw(performance.now());
    return () => { running = false; cancelAnimationFrame(raf); try { ro && ro.disconnect(); } catch {} window.removeEventListener('resize', layout); window.removeEventListener('pointermove', onMove); document.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <section className="ac-band">
      <div className="ac-inner">
        <Reveal>
          <div className="ac-head">
            <span className="ac-eyebrow"><span className="ac-dot" /> The operator, not another CRM</span>
            <h2 className="ac-h2">One AI at the center of <span className="ac-grad">everything you sell.</span></h2>
            <p className="ac-lead">Every capability plugs into one operator that works your live book. Hover a node to see what it does. This is not a chatbot bolted onto a database - it is the engine.</p>
          </div>
        </Reveal>

        <div className="ac-stage" ref={wrapRef}>
          <canvas ref={canvasRef} className="ac-canvas" aria-hidden />
          <div className="ac-core" style={{ left: core.x, top: core.y }}>
            <span className="ac-core-mark"><Icon name="sparkles" size={32} fill="currentColor" stroke={0} /></span>
            <span className="ac-core-label">Ardovo<br /><b>Rook</b></span>
          </div>
          {pos.map((p, i) => (
            <button
              key={CAPS[i].id}
              className={`ac-node${active === i ? ' is-active' : ''}`}
              style={{ left: p.x, top: p.y }}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(-1)}
              onFocus={() => setActive(i)} onBlur={() => setActive(-1)}
              aria-label={CAPS[i].label}
            >
              <span className="ac-node-ic"><Icon name={CAPS[i].icon} size={20} /></span>
              <span className="ac-node-label">{CAPS[i].label}</span>
            </button>
          ))}
        </div>

        {/* description sits BELOW the stage so it never overlaps a node */}
        <div className={`ac-desc${active >= 0 ? ' is-on' : ''}`}>
          {active >= 0 ? (
            <>
              <span className="ac-desc-title"><Icon name={CAPS[active].icon} size={18} /> {CAPS[active].label}</span>
              <span className="ac-desc-text">{CAPS[active].desc}</span>
            </>
          ) : (
            <span className="ac-desc-text ac-desc-idle">Hover any capability to see how the operator uses it.</span>
          )}
        </div>

        <div className="ac-cta">
          <MktButton to="/app" size="lg">Start free <Icon name="chevronRight" size={18} /></MktButton>
          <a href="/demo" className="mkt-btn mkt-btn-lg ac-ghost"><Icon name="eye" size={18} /> Watch it run</a>
        </div>
      </div>
      <AgentConstellationStyles />
    </section>
  );
}

function AgentConstellationStyles() {
  return (
    <style>{`
    .ac-band { position: relative; background: radial-gradient(120% 100% at 50% 0%, #0b1020, #070810 60%); color: #eef0f8; overflow: hidden; padding: 96px 0 104px; }
    /* Soft edge blends sit BEHIND the content (z-index 1) so they never wash out
       the eyebrow or the CTA, and are short enough not to bleed into the card below. */
    .ac-band::before, .ac-band::after { content: ''; position: absolute; left: 0; right: 0; height: 72px; pointer-events: none; z-index: 1; }
    .ac-band::before { top: 0; background: linear-gradient(#fff, rgba(255,255,255,0)); }
    .ac-band::after { bottom: 0; background: linear-gradient(rgba(255,255,255,0), #fff); }
    .ac-inner { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .ac-head { text-align: center; max-width: 860px; margin: 0 auto; }
    .ac-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #8fe6dc; }
    .ac-dot { width: 8px; height: 8px; border-radius: 50%; background: #16d1c9; box-shadow: 0 0 10px 1px rgba(22,209,201,.8); animation: acPulse 1.8s ease-in-out infinite; }
    @keyframes acPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .ac-h2 { font-size: clamp(2.5rem, 5.4vw, 4.2rem); font-weight: 900; letter-spacing: -.03em; line-height: 1.03; margin: 20px 0 0; color: #fff; }
    .ac-grad { background: linear-gradient(100deg, #16d1c9, #14b8a6 45%, #7c5cf7); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: acShine 6s linear infinite; }
    @keyframes acShine { to { background-position: 220% center; } }
    .ac-lead { font-size: clamp(1.2rem, 1.9vw, 1.5rem); color: #b7bdd6; line-height: 1.55; max-width: 720px; margin: 20px auto 0; }

    .ac-stage { position: relative; width: 100%; height: clamp(600px, 66vh, 760px); margin: 20px auto 0; }
    .ac-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    .ac-core { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 9px; pointer-events: none; }
    .ac-core-mark { width: 92px; height: 92px; border-radius: 26px; display: grid; place-items: center; color: #fff;
      background: linear-gradient(135deg, #7c5cf7, #16d1c9); box-shadow: 0 0 70px -4px rgba(22,209,201,.75), 0 0 0 1px rgba(255,255,255,.12) inset; animation: acCore 3.4s ease-in-out infinite; }
    @keyframes acCore { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .ac-core-label { font-size: 14px; font-weight: 700; text-align: center; color: #cdd3ea; line-height: 1.2; }
    .ac-core-label b { font-size: 17px; color: #fff; }

    .ac-node { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
      font-family: inherit; font-size: 16px; font-weight: 700; color: #eaeefb; white-space: nowrap;
      background: rgba(18,22,38,.74); border: 1px solid rgba(120,140,190,.3); border-radius: 999px; padding: 10px 18px 10px 11px; backdrop-filter: blur(8px);
      box-shadow: 0 8px 28px -12px rgba(0,0,0,.85); transition: transform .18s cubic-bezier(.34,1.56,.64,1), border-color .18s, box-shadow .18s, background .18s; }
    .ac-node:hover, .ac-node.is-active { transform: translate(-50%, -50%) scale(1.09); border-color: rgba(22,209,201,.8); background: rgba(20,32,48,.92); box-shadow: 0 14px 40px -10px rgba(22,209,201,.55); }
    .ac-node-ic { width: 36px; height: 36px; border-radius: 50%; flex: none; display: grid; place-items: center; color: #16d1c9; background: rgba(22,209,201,.15); }
    .ac-node.is-active .ac-node-ic { color: #fff; background: linear-gradient(135deg, #14b8a6, #7c5cf7); }

    .ac-desc { max-width: 640px; margin: 8px auto 0; text-align: center; min-height: 96px;
      background: rgba(10,14,26,.66); border: 1px solid rgba(120,140,190,.2); border-radius: 16px; padding: 18px 24px; backdrop-filter: blur(10px);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; transition: border-color .2s, background .2s; }
    .ac-desc.is-on { border-color: rgba(22,209,201,.42); background: rgba(12,20,32,.8); }
    .ac-desc-title { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; color: #fff; }
    .ac-desc-title svg { color: #16d1c9; }
    .ac-desc-text { display: block; font-size: 16px; color: #b7bdd6; line-height: 1.5; }

    .ac-cta { display: flex; gap: 12px; justify-content: center; margin-top: 30px; flex-wrap: wrap; }
    .ac-ghost { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.22); color: #eaf0fb; backdrop-filter: blur(6px); box-shadow: none; }
    .ac-ghost:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.42); color: #fff; transform: translateY(-2px); }

    @media (max-width: 720px) {
      .ac-stage { height: 600px; }
      .ac-node { font-size: 13px; padding: 8px 12px 8px 8px; }
      .ac-node-label { display: none; }
      .ac-node-ic { width: 40px; height: 40px; }
      .ac-core-mark { width: 80px; height: 80px; }
    }
    @media (prefers-reduced-motion: reduce) { .ac-dot, .ac-grad, .ac-core-mark { animation: none; } }
    `}</style>
  );
}
