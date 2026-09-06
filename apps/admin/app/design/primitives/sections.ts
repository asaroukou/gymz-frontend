import type { TocEntry } from '../_chrome/page-frame';
import { type PrimitiveEntry, primitivesInGroup } from '@/lib/design-registry';

const toEntry = (entry: PrimitiveEntry): TocEntry => ({ id: entry.id, label: entry.title });

/**
 * The primitives page numbers its sections continuously across both specimen
 * modules, so the entry list is built once here, from the registry, and passed
 * down. Deriving it in a plain module keeps page.tsx a server component: a
 * 'use client' module's exports become client-reference proxies when a Server
 * Component imports them, so reading them there would throw at runtime.
 */
export const PRIMITIVE_SECTIONS: readonly TocEntry[] = [
  ...primitivesInGroup('controls').map(toEntry),
  ...primitivesInGroup('display').map(toEntry),
];
