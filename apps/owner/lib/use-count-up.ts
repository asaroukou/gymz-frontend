'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Eases an integer up to `target` over `durationMs` whenever it increases —
 * used for the front-desk occupancy figure so a recorded check-in nudges the
 * number rather than snapping it. Deliberately one-directional and mount-quiet:
 *
 * - the first real value (from 0, i.e. arriving out of the loading state) snaps,
 *   so the page doesn't animate on load;
 * - a decrease snaps (a reset or a corrected figure shouldn't crawl downward);
 * - only a genuine increase animates.
 *
 * Reduced-motion is honoured directly (the global CSS guard can't reach a JS
 * tween): when the OS prefers reduced motion, the value snaps.
 */
export function useCountUp(target: number, durationMs = 400): number {
  const [display, setDisplay] = useState(target);
  const previous = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = previous.current;
    const to = target;
    previous.current = to;

    if (from === to) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Snap on the first real value, on any decrease, or under reduced motion.
    if (from === 0 || to < from || prefersReduced) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return display;
}
