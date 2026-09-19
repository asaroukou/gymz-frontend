'use client';

import { useEffect } from 'react';

/**
 * Each specimen renders a "clair" and a "sombre" pane side by side for
 * comparison, so this route needs a fixed ambient theme regardless of the
 * visitor's OS preference: `color-scheme` drives native UA chrome
 * (scrollbars, form controls) independently of any class, so a visitor whose
 * OS prefers dark would otherwise get that chrome painted dark across the
 * whole page, "clair" pane included, and the comparison would be a lie.
 * Pinning `color-scheme` (and the inert `.dark` class alongside it, in case a
 * future style ever keys off it) to light for this route keeps the "clair"
 * pane honest.
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

    // The OS preference can flip while the page is open, so both the class
    // and color-scheme are re-pinned on every mutation, not just once on
    // mount; color-scheme alone drives native UA styling (scrollbars,
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
