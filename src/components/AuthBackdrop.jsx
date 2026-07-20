// AuthBackdrop - a living neural-network constellation for the auth pages,
// lifted from the /app gate so sign-in shares that "operator is alive" feel.
// Nodes drift, link when near, brighten and reach toward the cursor. Teal with
// violet AI accents (or violet-forward when tint="violet"). Plus soft drifting
// orbs, a faint grid, and a vignette. DPR-aware, node count capped, cleans up on
// unmount, and holds a single static frame under prefers-reduced-motion.
// Sits absolutely behind the panel content (z-index 0). NO em-dash. ASCII only.
import React, { useEffect, useRef } from 'react';

export default function AuthBackdrop({ tint = 'teal', warp = false }) {
  const ref = useRef(null);
  const warpRef = useRef(false);
  useEffect(() => { warpRef.current = warp; }, [warp]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TEAL = [22, 209, 201], VIOLET = [124, 92, 247];
    const primary = tint === 'violet' ? VIOLET : TEAL;
    const accent = tint === 'violet' ? TEAL : VIOLET;
    let w = 0, h = 0, dpr = 1, nodes = [], raf = 0, running = true;
    const pointer = { x: -9999, y: -9999, active: false };
    const LINK = 128, REACH = 180;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(78, Math.max(28, Math.floor((w * h) / 17000)));
      nodes = [];
      for (let i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.24, vy: (Math.random() - 0.5) * 0.24,
          r: 0.8 + Math.random() * 1.7, accent: Math.random() < 0.18,
        });
      }
    }

    let warpV = 0; // 0..1 ramp for the hyperspace "warp to workspace" moment
    function frame() {
      if (w === 0 || h === 0) { raf = 0; return; } // paused (e.g. aside hidden on mobile)
      const warping = warpRef.current;
      warpV += ((warping ? 1 : 0) - warpV) * 0.08;

      if (warpV > 0.02) {
        // Trail effect: paint a translucent wash instead of clearing.
        ctx.fillStyle = `rgba(6,10,18,${0.16 + warpV * 0.14})`;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const cx = w / 2, cy = h / 2;
      for (const n of nodes) {
        if (warpV > 0.02) {
          // accelerate radially outward from center -> hyperspace streaks
          const dx = n.x - cx, dy = n.y - cy, d = Math.hypot(dx, dy) || 1;
          const push = warpV * warpV * (0.6 + d * 0.05);
          n.px = n.x; n.py = n.y;
          n.x += (dx / d) * push * 6; n.y += (dy / d) * push * 6;
          if (n.x < -30 || n.x > w + 30 || n.y < -30 || n.y > h + 30) {
            n.x = cx + (Math.random() - 0.5) * 40; n.y = cy + (Math.random() - 0.5) * 40; n.px = n.x; n.py = n.y;
          }
        } else {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
          if (pointer.active) {
            const dx = pointer.x - n.x, dy = pointer.y - n.y, d = Math.hypot(dx, dy);
            if (d < 150 && d > 0.5) { n.x += (dx / d) * 0.2; n.y += (dy / d) * 0.2; }
          }
        }
      }

      // During warp, draw streaks and skip the (expensive) link/pointer pass.
      if (warpV > 0.02) {
        for (const n of nodes) {
          const c = n.accent ? accent : primary;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 * warpV})`;
          ctx.lineWidth = n.r * (1 + warpV);
          ctx.beginPath(); ctx.moveTo(n.px ?? n.x, n.py ?? n.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        }
        if (running && !reduce) raf = requestAnimationFrame(frame);
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            const t = 1 - d / LINK;
            const c = (a.accent || b.accent) ? accent : primary;
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${t * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (pointer.active) {
          const dx = a.x - pointer.x, dy = a.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < REACH) {
            const t = 1 - d / REACH;
            ctx.strokeStyle = `rgba(${primary[0]},${primary[1]},${primary[2]},${t * 0.45})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const c = n.accent ? accent : primary;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.9)`;
        ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},.9)`; ctx.shadowBlur = 7;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    const onResize = () => { resize(); if (running && !reduce && !raf && w > 0 && h > 0) raf = requestAnimationFrame(frame); };
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = pointer.x >= 0 && pointer.x <= w && pointer.y >= 0 && pointer.y <= h; };
    const onLeave = () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999; };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('mouseleave', onLeave);
    frame();
    if (!reduce) raf = requestAnimationFrame(frame);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [tint]);

  return (
    <div className={`abd abd-${tint}`} aria-hidden>
      <span className="abd-orb o1" /><span className="abd-orb o2" /><span className="abd-orb o3" />
      <canvas ref={ref} className="abd-canvas" />
      <div className="abd-grid" />
      <div className="abd-vignette" />
      <style>{`
      .abd { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
      .abd-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .abd-orb { position: absolute; border-radius: 50%; filter: blur(60px); animation: abdDrift 16s ease-in-out infinite; }
      .abd-teal .o1 { width: 360px; height: 360px; background: #0e9f8f; opacity: .5; top: -70px; right: -80px; }
      .abd-teal .o2 { width: 280px; height: 280px; background: #7c5cf7; opacity: .34; bottom: 30px; left: -70px; animation-delay: -5s; }
      .abd-teal .o3 { width: 220px; height: 220px; background: #2563a8; opacity: .3; bottom: -70px; right: 28%; animation-delay: -9s; }
      .abd-violet .o1 { width: 360px; height: 360px; background: #7c5cf7; opacity: .5; top: -70px; right: -80px; }
      .abd-violet .o2 { width: 280px; height: 280px; background: #0e9f8f; opacity: .3; bottom: 30px; left: -70px; animation-delay: -5s; }
      .abd-violet .o3 { width: 220px; height: 220px; background: #4f46e5; opacity: .32; bottom: -70px; right: 28%; animation-delay: -9s; }
      @keyframes abdDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(18px,-14px) scale(1.08); } }
      .abd-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 46px 46px; mask-image: radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 75%); -webkit-mask-image: radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 75%); }
      .abd-vignette { position: absolute; inset: 0; background: radial-gradient(120% 120% at 30% 30%, transparent 45%, rgba(0,0,0,.35)); }
      @media (prefers-reduced-motion: reduce) { .abd-orb { animation: none; } }
      `}</style>
    </div>
  );
}
