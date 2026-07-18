// AgentConstellation - a full-bleed dark "operator constellation" showcase for
// the home page. A glowing Ardovo/Rook core sits at the center with the new AI
// capabilities orbiting it; energy pulses flow along the links, an ambient
// neural mesh drifts behind, and each capability lights up + explains itself on
// hover. Same futuristic vocabulary as the gate constellation, applied to the
// product. Canvas for mesh/links/pulses, crisp HTML nodes on top for text +
// interactivity. DPR-aware, capped, reduced-motion safe. NO em-dash / en-dash.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Reveal, MktButton } from './kit.jsx';

const CAPS = [
  { id: 'rook', label: 'Rook Operator', icon: 'sparkles', desc: 'The AI that runs the actual work, grounded in your live book.' },
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
  const posRef = useRef([]);        // [{x,y}] px for each cap
  const coreRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(-1);
  const [pos, setPos] = useState([]); // px positions for HTML nodes
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

    function layout() {
      w = wrap.clientWidth; h = wrap.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w / 2, cy = h * 0.5;
      coreRef.current = { x: cx, y: cy };
      const rx = Math.min(w * 0.40, 460), ry = Math.min(h * 0.40, 300);
      const n = CAPS.length;
      const p = CAPS.map((_, i) => {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return { x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry };
      });
      posRef.current = p;
      setPos(p); setCore({ x: cx, y: cy });
      const count = Math.min(70, Math.max(28, Math.floor((w * h) / 20000)));
      particles = [];
      for (let i = 0; i < count; i++) particles.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: .7 + Math.random() * 1.5, violet: Math.random() < .18 });
    }

    function draw(now) {
      const time = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const core = coreRef.current, p = posRef.current, act = activeRef.current;

      // ambient mesh
      for (const n of particles) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 116) { const tt = 1 - d / 116; ctx.strokeStyle = `rgba(120,150,180,${tt * 0.12})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      for (const n of particles) { ctx.beginPath(); ctx.fillStyle = `rgba(150,170,190,.35)`; ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }

      // core -> capability links + traveling pulses
      for (let i = 0; i < p.length; i++) {
        const node = p[i]; if (!node) continue;
        const isActive = i === act;
        const c = CAPS[i].id === 'rook' || CAPS[i].id === 'agent' ? VIOLET : TEAL;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${isActive ? 0.85 : 0.32})`;
        ctx.lineWidth = isActive ? 2.2 : 1.1;
        ctx.beginPath(); ctx.moveTo(core.x, core.y); ctx.lineTo(node.x, node.y); ctx.stroke();
        // pulse dot travels core -> node
        if (!reduce) {
          const speed = 0.5, phase = (time * speed + i / p.length) % 1;
          const frac = isActive ? (time * 1.1 + i * 0.13) % 1 : phase;
          const px = core.x + (node.x - core.x) * frac, py = core.y + (node.y - core.y) * frac;
          ctx.beginPath(); ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${isActive ? 1 : 0.8})`;
          ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},1)`; ctx.shadowBlur = isActive ? 14 : 8;
          ctx.arc(px, py, isActive ? 3.4 : 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      // core glow
      const pulse = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(time * 1.6));
      const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 90 + pulse * 26);
      g.addColorStop(0, 'rgba(22,209,201,.5)'); g.addColorStop(0.5, 'rgba(124,92,247,.18)'); g.addColorStop(1, 'rgba(22,209,201,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(core.x, core.y, 90 + pulse * 26, 0, Math.PI * 2); ctx.fill();

      if (running && !reduce) raf = requestAnimationFrame(draw);
    }

    layout();
    let ro;
    try { ro = new ResizeObserver(() => layout()); ro.observe(wrap); } catch { window.addEventListener('resize', layout); }
    raf = requestAnimationFrame(draw);
    if (reduce) { draw(performance.now()); }
    return () => { running = false; cancelAnimationFrame(raf); try { ro && ro.disconnect(); } catch {} window.removeEventListener('resize', layout); };
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
          {/* core */}
          <div className="ac-core" style={{ left: core.x, top: core.y }}>
            <span className="ac-core-mark"><Icon name="sparkles" size={26} fill="currentColor" stroke={0} /></span>
            <span className="ac-core-label">Ardovo<br /><b>Rook</b></span>
          </div>
          {/* capability nodes */}
          {pos.map((p, i) => (
            <button
              key={CAPS[i].id}
              className={`ac-node${active === i ? ' is-active' : ''}`}
              style={{ left: p.x, top: p.y }}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(-1)}
              onFocus={() => setActive(i)} onBlur={() => setActive(-1)}
              aria-label={CAPS[i].label}
            >
              <span className="ac-node-ic"><Icon name={CAPS[i].icon} size={18} /></span>
              <span className="ac-node-label">{CAPS[i].label}</span>
            </button>
          ))}
          {/* description panel */}
          <div className={`ac-desc${active >= 0 ? ' is-on' : ''}`}>
            {active >= 0 ? (
              <>
                <span className="ac-desc-title"><Icon name={CAPS[active].icon} size={15} /> {CAPS[active].label}</span>
                <span className="ac-desc-text">{CAPS[active].desc}</span>
              </>
            ) : (
              <span className="ac-desc-text ac-desc-idle">Hover any capability to see how the operator uses it.</span>
            )}
          </div>
        </div>

        <div className="ac-cta">
          <MktButton to="/app" size="lg">Start free <Icon name="chevronRight" size={18} /></MktButton>
          <a href="/demo" className="mkt-btn mkt-btn-ghost mkt-btn-lg" style={{ color: '#dfe4f5', borderColor: 'rgba(255,255,255,.2)' }}><Icon name="eye" size={18} /> Watch it run</a>
        </div>
      </div>
      <AgentConstellationStyles />
    </section>
  );
}

function AgentConstellationStyles() {
  return (
    <style>{`
    .ac-band { position: relative; background: radial-gradient(120% 100% at 50% 0%, #0b1020, #070810 60%); color: #eef0f8; overflow: hidden; padding: 84px 0 92px; }
    .ac-band::before, .ac-band::after { content: ''; position: absolute; left: 0; right: 0; height: 120px; pointer-events: none; z-index: 3; }
    .ac-band::before { top: 0; background: linear-gradient(#fff, rgba(255,255,255,0)); }
    .ac-band::after { bottom: 0; background: linear-gradient(rgba(255,255,255,0), #fff); }
    .ac-inner { position: relative; z-index: 2; max-width: 1160px; margin: 0 auto; padding: 0 24px; }
    .ac-head { text-align: center; max-width: 760px; margin: 0 auto; }
    .ac-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #8fe6dc; }
    .ac-dot { width: 7px; height: 7px; border-radius: 50%; background: #16d1c9; box-shadow: 0 0 10px 1px rgba(22,209,201,.8); animation: acPulse 1.8s ease-in-out infinite; }
    @keyframes acPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .ac-h2 { font-size: clamp(2rem, 4.6vw, 3.4rem); font-weight: 900; letter-spacing: -.03em; line-height: 1.04; margin: 18px 0 0; color: #fff; }
    .ac-grad { background: linear-gradient(100deg, #16d1c9, #14b8a6 45%, #7c5cf7); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: acShine 6s linear infinite; }
    @keyframes acShine { to { background-position: 220% center; } }
    .ac-lead { font-size: clamp(1rem, 1.6vw, 1.18rem); color: #aab0cc; line-height: 1.6; max-width: 620px; margin: 16px auto 0; }

    .ac-stage { position: relative; width: 100%; height: clamp(520px, 66vh, 720px); margin: 24px auto 0; }
    .ac-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    .ac-core { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
    .ac-core-mark { width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; color: #fff;
      background: linear-gradient(135deg, #7c5cf7, #16d1c9); box-shadow: 0 0 60px -6px rgba(22,209,201,.7), 0 0 0 1px rgba(255,255,255,.12) inset; animation: acCore 3.4s ease-in-out infinite; }
    @keyframes acCore { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .ac-core-label { font-size: 12.5px; font-weight: 700; text-align: center; color: #cdd3ea; line-height: 1.2; }
    .ac-core-label b { font-size: 15px; color: #fff; }

    .ac-node { position: absolute; transform: translate(-50%, -50%); z-index: 2; display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
      font-family: inherit; font-size: 14px; font-weight: 700; color: #dfe4f5; white-space: nowrap;
      background: rgba(18,22,38,.72); border: 1px solid rgba(120,140,190,.28); border-radius: 999px; padding: 9px 15px 9px 10px; backdrop-filter: blur(8px);
      box-shadow: 0 8px 28px -12px rgba(0,0,0,.8); transition: transform .18s cubic-bezier(.34,1.56,.64,1), border-color .18s, box-shadow .18s, background .18s; }
    .ac-node:hover, .ac-node.is-active { transform: translate(-50%, -50%) scale(1.08); border-color: rgba(22,209,201,.75); background: rgba(20,32,48,.9); box-shadow: 0 12px 36px -10px rgba(22,209,201,.5); }
    .ac-node-ic { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center; color: #16d1c9; background: rgba(22,209,201,.14); }
    .ac-node.is-active .ac-node-ic { color: #fff; background: linear-gradient(135deg, #14b8a6, #7c5cf7); }

    .ac-desc { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 3; width: min(460px, 84%); text-align: center;
      background: rgba(10,14,26,.82); border: 1px solid rgba(120,140,190,.22); border-radius: 14px; padding: 13px 18px; backdrop-filter: blur(10px);
      opacity: .7; transition: opacity .2s, border-color .2s; }
    .ac-desc.is-on { opacity: 1; border-color: rgba(22,209,201,.4); }
    .ac-desc-title { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: #fff; }
    .ac-desc-title svg { color: #16d1c9; }
    .ac-desc-text { display: block; font-size: 13.5px; color: #aab0cc; line-height: 1.5; margin-top: 4px; }
    .ac-desc-idle { margin-top: 0; }

    .ac-cta { display: flex; gap: 12px; justify-content: center; margin-top: 30px; flex-wrap: wrap; }

    @media (max-width: 720px) {
      .ac-stage { height: 560px; }
      .ac-node { font-size: 12px; padding: 7px 11px 7px 8px; }
      .ac-node-label { display: none; }
      .ac-node-ic { width: 34px; height: 34px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ac-dot, .ac-grad, .ac-core-mark { animation: none; }
    }
    `}</style>
  );
}
