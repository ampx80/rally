// HeroCurrent - "The Revenue Current". A living pipeline flowing behind the
// hero copy: deal particles stream left to right through invisible stage
// gates, shifting color as they advance (lead -> qualified -> proposal ->
// negotiation -> closed), then CLOSE in a burst of sparks at the end. The
// cursor is Rook: a gravity well that pulls nearby deals and accelerates
// them. Canvas 2D, rAF, DPR-aware, pauses offscreen, honors reduced motion.
import React, { useEffect, useRef } from 'react';

const STAGE_COLORS = [
  [139, 147, 164], // lead slate
  [37, 99, 168],   // qualified blue
  [14, 159, 143],  // proposal teal
  [124, 92, 247],  // negotiation sparse AI violet
  [14, 159, 143],  // closed teal
];
const lerp = (a, b, t) => a + (b - a) * t;
function stageColor(p) {
  const x = Math.max(0, Math.min(0.999, p));
  const seg = x * (STAGE_COLORS.length - 1);
  const i = Math.floor(seg), t = seg - i;
  const A = STAGE_COLORS[i], B = STAGE_COLORS[i + 1];
  return [Math.round(lerp(A[0], B[0], t)), Math.round(lerp(A[1], B[1], t)), Math.round(lerp(A[2], B[2], t))];
}

export default function HeroCurrent() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // CSS aurora stays; no motion for reduced users.

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, running = true, tPrev = performance.now();
    const mouse = { x: -9999, y: -9999 };
    const parent = canvas.parentElement;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // Belt and suspenders: some embedded renderers report clientWidth 0 at
      // mount. Fall back through rect -> viewport so the canvas never dies.
      const rect = parent.getBoundingClientRect();
      W = parent.clientWidth || rect.width || window.innerWidth || 1200;
      H = parent.clientHeight || rect.height || Math.max(680, window.innerHeight * 0.9) || 800;
      canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    // Track the hero's real size (handles late layout, font swaps, rotation).
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(parent);

    const COUNT = W < 720 ? 60 : 130;
    const parts = [];
    const sparks = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    function spawn(p, fresh) {
      p.x = fresh ? rnd(-40, -10) : rnd(0, W);
      p.y = rnd(H * 0.04, H * 0.96);
      p.baseY = p.y;
      p.v = rnd(18, 46);            // px/s baseline
      p.r = Math.random() < 0.16 ? rnd(2.6, 3.6) : rnd(1.1, 2.4);
      p.card = Math.random() < 0.07; // a few are tiny deal cards
      p.amp = rnd(6, 26);
      p.phase = rnd(0, Math.PI * 2);
      p.freq = rnd(0.25, 0.7);
      p.boost = 0;
      return p;
    }
    for (let i = 0; i < COUNT; i++) parts.push(spawn({}, false));

    function burst(x, y, big) {
      const n = big ? 14 : 7;
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(30, big ? 150 : 90);
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: rnd(1, big ? 2.6 : 1.8) });
      }
    }

    const onMove = (e) => {
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);

    // pause when the hero scrolls away or the tab hides
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) { tPrev = performance.now(); loop(tPrev); } });
    io.observe(parent);
    const onVis = () => { if (!document.hidden) { tPrev = performance.now(); } };
    document.addEventListener('visibilitychange', onVis);

    function loop(t) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - tPrev) / 1000); tPrev = t;
      ctx.clearRect(0, 0, W, H);

      // faint stage gate lines
      ctx.save();
      for (let g = 1; g < 5; g++) {
        const gx = (W * g) / 5;
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(14,159,143,0)');
        grad.addColorStop(0.5, 'rgba(14,159,143,0.07)');
        grad.addColorStop(1, 'rgba(14,159,143,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      ctx.restore();

      // constellation links (only among larger particles to stay cheap)
      const big = parts.filter(p => p.r > 2.2);
      for (let i = 0; i < big.length; i++) {
        for (let j = i + 1; j < big.length; j++) {
          const a = big[i], b = big[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const al = (1 - Math.sqrt(d2) / 120) * 0.13;
            const c = stageColor(a.x / W);
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${al})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // particles
      for (const p of parts) {
        // Rook gravity well: attract + accelerate near the cursor
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 170 * 170) {
          const d = Math.sqrt(d2) || 1, pull = (1 - d / 170);
          p.x += (dx / d) * pull * 46 * dt;
          p.y += (dy / d) * pull * 30 * dt;
          p.boost = Math.min(1, p.boost + dt * 2.2);
        } else {
          p.boost = Math.max(0, p.boost - dt * 1.2);
        }
        p.phase += p.freq * dt;
        p.x += (p.v + p.boost * 90) * dt;
        p.y = p.baseY + Math.sin(p.phase * Math.PI * 2) * p.amp * 0.4 + (p.y - p.baseY) * 0.9;

        const prog = p.x / W;
        // close the deal at the right edge
        if (p.x > W + 10) { burst(W - rnd(10, 60), p.y, Math.random() < 0.18); spawn(p, true); continue; }

        const c = stageColor(prog);
        const alpha = 0.28 + prog * 0.5 + p.boost * 0.25;
        if (p.card) {
          // tiny deal card
          const w = 16 + p.r * 3, h = 10 + p.r * 1.6;
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, alpha + 0.25)})`;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(0.8, alpha + 0.2)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 3); else ctx.rect(p.x - w / 2, p.y - h / 2, w, h);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(0.85, alpha + 0.2)})`;
          ctx.fillRect(p.x - w / 2 + 3, p.y - 1, w * rnd(0.35, 0.5), 2);
        } else {
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(0.75, alpha)})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.boost * 0.9, 0, Math.PI * 2); ctx.fill();
          if (p.boost > 0.1) { // Rook trail
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.boost * 0.3})`;
            ctx.lineWidth = p.r * 0.9;
            ctx.beginPath(); ctx.moveTo(p.x - 14 * p.boost, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
        }
      }

      // closing sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt * 1.6;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt;
        ctx.fillStyle = `rgba(14,159,154,${s.life * 0.85})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life + 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro?.disconnect();
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
