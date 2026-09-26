'use client';

import type { ReactNode } from 'react';

import type { Capability } from '@iziwellpass/api/schemas';

import { useCapabilities } from './capabilities-provider';
import { LockedPage } from './locked-page';

/** Swaps a page body for the locked page when the plan lacks `capability`. */
export function RequireCapability({
  capability,
  title,
  when = true,
  children,
}: {
  capability: Capability;
  title: string;
  /** Extra condition, e.g. « a venue already exists » for `multi_venue`. */
  when?: boolean;
  children: ReactNode;
}) {
  const { isLocked } = useCapabilities();
  if (when && isLocked(capability)) return <LockedPage capability={capability} title={title} />;
  return <>{children}</>;
}
