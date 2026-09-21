'use client';

import { useCallback, useRef } from 'react';

/**
 * Keeps the « ··· » (or row) button of each row so a dialog opened from a row
 * menu can hand focus back to it on close (spec D12). `register(id)` is a ref
 * callback; `get(id)` feeds `restoreFocusTo`.
 */
export function useFocusRegistry() {
  const map = useRef(new Map<string, HTMLElement>());
  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) map.current.set(id, element);
      else map.current.delete(id);
    },
    [],
  );
  const get = useCallback(
    (id: string | null | undefined) => (id ? (map.current.get(id) ?? null) : null),
    [],
  );
  return { register, get };
}
