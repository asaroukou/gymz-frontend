'use client';

import * as React from 'react';

/**
 * True while a portalled overlay dropdown (a Radix Select, Popover/Combobox, or
 * Dropdown menu) is open anywhere in the document.
 *
 * Radix portals these layers to `document.body`, i.e. outside a modal's DOM
 * subtree, so a click that dismisses the dropdown reads to a Dialog/Sheet as an
 * interaction *outside* itself. (See emilkowalski's writeup on this class of
 * bug.) `[data-state="open"]` ignores layers still in their close animation.
 */
export function isOverlayDropdownOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.querySelector(
      '[data-slot="select-content"][data-state="open"],' +
        '[data-slot="popover-content"][data-state="open"],' +
        '[data-slot="dropdown-menu-content"][data-state="open"]',
    ) !== null
  );
}

/**
 * Guard for a Dialog/Sheet's `onInteractOutside`: returns a ref that is `true`
 * when the current outside interaction started while a dropdown was open.
 *
 * The naive "is a dropdown open *now*?" check inside `onInteractOutside` fails.
 * A Radix Select sets `pointer-events: none` on the modal while open, so an
 * outside click lands on the overlay, and the Select's own dismissable layer
 * closes it *first*. Radix runs its outside-detection in the bubble phase, so by
 * the time the modal's `onInteractOutside` fires the dropdown is already gone
 * and the check reads false.
 *
 * So we snapshot the answer during the **capture** phase of the same pointer
 * event, which runs before Radix's bubble-phase dismiss. The modal reads the
 * snapshot: if a dropdown was open, it keeps itself open, so the first outside
 * click only dismisses the dropdown and a second click closes the modal, the
 * behavior users expect from a native select inside a modal.
 */
export function useOverlayDismissGuard(): React.RefObject<boolean> {
  const dropdownWasOpenRef = React.useRef(false);

  React.useEffect(() => {
    const snapshot = () => {
      dropdownWasOpenRef.current = isOverlayDropdownOpen();
    };
    // Capture phase: runs before Radix's bubble-phase outside-detection, while
    // the dropdown is still open. `pointerup`/`click` cover the tail of the same
    // gesture so the flag is still set when the modal evaluates dismissal.
    document.addEventListener('pointerdown', snapshot, true);
    return () => {
      document.removeEventListener('pointerdown', snapshot, true);
    };
  }, []);

  return dropdownWasOpenRef;
}
