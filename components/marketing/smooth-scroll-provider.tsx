"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Mounts Lenis for smooth inertial scrolling (homepage scroll-story scrub feels best with this).
 *
 * Disabled only when `prefers-reduced-motion: reduce` is set (accessibility).
 * Touch devices use gentler multipliers so the phone-frame section still scrubs smoothly.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const lenis = new Lenis({
      duration:         coarse ? 1.35 : 1.15,
      easing:           (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:      true,
      wheelMultiplier:  coarse ? 0.85 : 1,
      touchMultiplier:  coarse ? 1.15 : 1.35,
      syncTouch:        coarse,
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
