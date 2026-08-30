"use client";

import { useEffect, useState } from "react";

// Small rAF-based count-up for StatCard's real numbers (Motion Design SRS
// Core Experience 04). No animation library in this project -- this is
// deliberately tiny rather than pulling one in for a single effect. Counts
// once on mount (the card only renders once its real data has loaded, so by
// the time this runs the number is already about to be shown) and always
// lands on the exact final value. Renders the final value immediately under
// `prefers-reduced-motion` -- the global CSS rule in globals.css only
// forces *CSS* animation/transition durations, it can't reach this rAF loop.
export function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}
