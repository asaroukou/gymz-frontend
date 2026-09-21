'use client';

import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

/**
 * True at Tailwind's `md` and above. Starts true on both server and first
 * client render (no hydration mismatch), then follows the media query. Use it
 * only for things CSS cannot switch — a placeholder attribute, a stat label.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isDesktop;
}
