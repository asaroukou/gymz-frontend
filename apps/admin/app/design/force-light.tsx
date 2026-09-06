'use client';

import { useEffect } from 'react';

/**
 * The preview shows light and dark side by side, so the page itself needs a
 * fixed ambient theme. Without this, a visitor whose OS is dark gets `.dark` on
 * <html>, every `dark:` utility inside the "light" pane matches `.dark *` too,
 * and that pane is a lie. CSS cannot resolve the dark variant by nearest
 * ancestor, so the fix is to make light ambient for this route and let the
 * `.dark` wrappers be the only dark context on the page.
 *
 * Restores whatever was there on unmount, so navigating back to the admin app
 * returns the visitor to their own theme.
 */
export function ForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const previousColorScheme = root.style.colorScheme;

    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    // next-themes re-applies the class if the OS preference flips while the
    // page is open. Keep light pinned for as long as we are on this route.
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (wasDark) {
        root.classList.add('dark');
      }
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  return null;
}
