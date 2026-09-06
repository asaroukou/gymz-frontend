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

    const pinLight = () => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
      }
      if (root.style.colorScheme !== 'light') {
        root.style.colorScheme = 'light';
      }
    };

    pinLight();

    // next-themes re-applies both the class and color-scheme if the OS
    // preference flips while the page is open, so both are pinned here, not
    // just the class; color-scheme alone drives native UA styling (scrollbars,
    // form controls), and leaving it dark would be the same "light pane is a
    // lie" failure this mechanism exists to prevent. The two guards inside
    // pinLight are load-bearing: writing `style` from inside a `style`
    // observer would otherwise queue another record on every tick, so a
    // callback that finds nothing to change must mutate nothing for the
    // chain to terminate.
    const observer = new MutationObserver(pinLight);
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });

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
