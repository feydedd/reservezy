"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Mounts Lenis for smooth inertial scrolling on the homepage (scroll-story scrub).
 * Skipped on touch-primary viewports (coarse pointer): Lenis syncTouch + extra RAF
 * caused noticeable lag on phones; native scroll stays smooth enough there.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const lenis = new Lenis({
      duration:    1.15,
      easing:      (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
