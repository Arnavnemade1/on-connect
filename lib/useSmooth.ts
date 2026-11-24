"use client";
import { useEffect, useRef, useState } from "react";
/** Reveals `target` progressively, catching up faster the further behind it is. Works while the target is still growing (streaming). */
export function useSmooth(target: string, animate: boolean, onCaughtUp?: () => boolean | void): string {
  const [n, setN] = useState(animate ? 0 : target.length);
  const pos = useRef(animate ? 0 : target.length); const tgt = useRef(target); tgt.current = target;
  const cb = useRef(onCaughtUp); cb.current = onCaughtUp; const fired = useRef(false);
  useEffect(() => {
    if (!animate) { pos.current = tgt.current.length; setN(pos.current); return; }
    fired.current = false; let raf = 0;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = () => {
      const len = tgt.current.length; if (pos.current > len) pos.current = len;
      const gap = len - pos.current;
      if (gap > 0) { pos.current = reduce ? len : Math.min(len, pos.current + Math.max(1, Math.ceil(gap / 10))); setN(pos.current); }
      else if (!fired.current && cb.current && len > 0 && cb.current() !== false) { fired.current = true; return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [animate]);
  return animate ? target.slice(0, n) : target;
}
