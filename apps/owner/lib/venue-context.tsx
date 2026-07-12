'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useVenueSelection, type UseVenueSelectionResult } from '@/lib/use-venue-selection';

const VenueContext = createContext<UseVenueSelectionResult | null>(null);

/**
 * App-wide venue context. Mounted once in the (app) layout so every page and
 * the shell switcher share a single selection (in-memory synced, persisted to
 * localStorage by the underlying hook).
 */
export function VenueProvider({ children }: { children: ReactNode }) {
  const selection = useVenueSelection();
  return <VenueContext.Provider value={selection}>{children}</VenueContext.Provider>;
}

/** Read the shared venue selection. Throws if used outside `VenueProvider`. */
export function useVenueContext(): UseVenueSelectionResult {
  const ctx = useContext(VenueContext);
  if (ctx === null) {
    throw new Error('useVenueContext must be used within a VenueProvider');
  }
  return ctx;
}
