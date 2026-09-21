'use client';

import { useCallback, useRef } from 'react';

/**
 * Keeps every mounted « ··· » (or row) button registered under its row's id —
 * the desktop and phone variants of a row share the same id, since only one
 * of them is actually visible at a time (the other is `display:none` via
 * `md:hidden`/`hidden md:block`) — so a dialog opened from a row menu can
 * hand focus back to the visible one on close (spec D12). `register(id)` is a
 * ref callback; `get(id)` returns whichever registered element currently has
 * layout (falls back to any registered element), feeding `restoreFocusTo`.
 */
export function useFocusRegistry() {
  const map = useRef(new Map<string, Set<HTMLElement>>());
  const register = useCallback((id: string) => {
    let current: HTMLElement | null = null;
    return (element: HTMLElement | null) => {
      const set = map.current.get(id);
      if (current && set) {
        set.delete(current);
        if (set.size === 0) map.current.delete(id);
      }
      if (element) {
        const next = map.current.get(id) ?? new Set<HTMLElement>();
        next.add(element);
        map.current.set(id, next);
      }
      current = element;
    };
  }, []);
  const get = useCallback((id: string | null | undefined): HTMLElement | null => {
    if (!id) return null;
    const set = map.current.get(id);
    if (!set) return null;
    const elements = [...set];
    return elements.find((el) => el.getClientRects().length > 0) ?? elements[0] ?? null;
  }, []);
  return { register, get };
}
