'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';

const STORAGE_KEY = 'iwp:venue';

function readStoredVenueId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode, disabled storage, etc.) — fall back to no selection.
    return null;
  }
}

function writeStoredVenueId(id: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore write failures — selection just won't persist across reloads
  }
}

export interface UseVenueSelectionResult {
  venues: Venue[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  selectedVenueId: string | null;
  selectedVenue: Venue | undefined;
  setSelectedVenueId: (id: string) => void;
}

/**
 * Shared venue-selection logic: lists venues, persists the chosen venue id in
 * localStorage, and always resolves a current venue while any exist (a valid
 * stored selection, else the first venue). Wrapped once by `VenueProvider`
 * (`lib/venue-context.tsx`) and consumed app-wide via `useVenueContext`.
 */
export function useVenueSelection(): UseVenueSelectionResult {
  const venuesQuery = useListVenues({ query: { select: unwrap } });
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);

  const [selectedVenueId, setSelectedVenueIdState] = useState<string | null>(() =>
    readStoredVenueId(),
  );

  const setSelectedVenueId = useCallback((id: string) => {
    setSelectedVenueIdState(id);
    writeStoredVenueId(id);
  }, []);

  // Always resolve a current venue when any exist: keep a still-valid stored
  // selection, otherwise fall back to the first venue. Clears only when the
  // list has loaded and is genuinely empty.
  //
  // The `isLoading` guard is essential: while the venues query is in flight
  // `venues` is `[]`, and without it the empty-list branch below would wipe the
  // stored selection on every reload (before the list arrives), snapping the
  // user back to the first venue. Wait for the list before resolving.
  useEffect(() => {
    if (venuesQuery.isLoading) {
      return;
    }
    if (venues.length === 0) {
      if (selectedVenueId !== null) {
        setSelectedVenueIdState(null);
        writeStoredVenueId(null);
      }
      return;
    }
    const stillValid = selectedVenueId !== null && venues.some((v) => v.id === selectedVenueId);
    if (stillValid) {
      return;
    }
    const first = venues[0];
    if (first) {
      setSelectedVenueId(first.id);
    }
  }, [venuesQuery.isLoading, venues, selectedVenueId, setSelectedVenueId]);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId),
    [venues, selectedVenueId],
  );

  return {
    venues,
    isLoading: venuesQuery.isLoading,
    isError: venuesQuery.isError,
    error: venuesQuery.error,
    selectedVenueId,
    selectedVenue,
    setSelectedVenueId,
  };
}
