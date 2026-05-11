"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Mounts Lenis to provide butter-smooth inertial scrolling across the homepage.
 *
 * Auto-disables when:
 *   - The user has prefers-reduced-motion set
 *   - On touch/coarse-pointer devices (mobile) — native scroll feels better there
 *
 * Touches no DOM beyond the page scroll, so it's safe to wrap the whole app.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isCoarse             = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || isCoarse) return;

    const lenis = new Lenis({
      duration:        1.15,
      easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:     true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
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
