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
 * Shared venue-context hook: lists venues for a `VenueSelect`, persists the
 * chosen venue id in localStorage, and auto-selects when only one venue
 * exists. Reused by SP5 (/venues), SP7 (/schedules), and SP9 (/checkins).
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

  // Auto-select when only one venue exists, or when the stored selection no
  // longer matches an existing venue.
  useEffect(() => {
    if (venues.length === 0) {
      return;
    }
    const stillValid = selectedVenueId !== null && venues.some((v) => v.id === selectedVenueId);
    if (stillValid) {
      return;
    }
    if (venues.length === 1) {
      const only = venues[0];
      if (only) {
        setSelectedVenueId(only.id);
      }
      return;
    }
    if (selectedVenueId === null) {
      return;
    }
    // Stored id points at a venue that no longer exists — clear it.
    setSelectedVenueIdState(null);
    writeStoredVenueId(null);
  }, [venues, selectedVenueId, setSelectedVenueId]);

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
