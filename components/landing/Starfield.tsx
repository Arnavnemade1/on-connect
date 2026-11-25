"use client";
import { useEffect, useRef } from "react";

// A quiet star field. Stars drift slowly; near the pointer, close stars link into a constellation ("connect").
// Respects reduced motion (static render), pauses when off screen or the tab is hidden.
const TINTS = ["255,255,255", "255,255,255", "255,255,255", "170,200,255", "255,205,160"];
interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; vx: number; vy: number; c: string; }

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d"); if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, on = true, stars: Star[] = []; const mouse = { x: -999, y: -999 };
    const resize = () => {
      const r = c.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(380, Math.round((w * h) / 7000));
      stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() < 0.05 ? 1.7 : Math.random() * 0.9 + 0.3, a: Math.random() * 0.6 + 0.25,
        tw: Math.random() * 1.4 + 0.4, ph: Math.random() * 6.28, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05, c: TINTS[Math.floor(Math.random() * TINTS.length)] }));
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!reduce) { s.x += s.vx; s.y += s.vy; if (s.x < 0) s.x = w; else if (s.x > w) s.x = 0; if (s.y < 0) s.y = h; else if (s.y > h) s.y = 0; }
        const a = s.a * (reduce ? 1 : 0.72 + 0.28 * Math.sin((t / 1000) * s.tw + s.ph));
        ctx.fillStyle = `rgba(${s.c},${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      if (mouse.x > -900) {
        const near = stars.filter(s => Math.hypot(s.x - mouse.x, s.y - mouse.y) < 190);
        for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d < 100) { ctx.strokeStyle = `rgba(147,180,255,${(1 - d / 100) * 0.5})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(near[i].x, near[i].y); ctx.lineTo(near[j].x, near[j].y); ctx.stroke(); }
        }
      }
    };
    const loop = (t: number) => { if (on) draw(t); raf = requestAnimationFrame(loop); };
    resize(); if (reduce) draw(0); else raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(0); }); ro.observe(c);
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -999; };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting && !document.hidden; }, { threshold: 0 }); io.observe(c);
    const vis = () => { on = !document.hidden; }; document.addEventListener("visibilitychange", vis);
    addEventListener("pointermove", move); document.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return <canvas ref={ref} className="stars" aria-hidden />;
}
