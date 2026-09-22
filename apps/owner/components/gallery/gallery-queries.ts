import type { QueryClient } from '@tanstack/react-query';

import {
  getGetVenueQueryKey,
  getListVenueImagesQueryKey,
  getListVenuesQueryKey,
} from '@iziwellpass/api/generated';

/** Every gallery mutation moves the cover, so the venue and the venue list refresh too (spec G12). */
export async function invalidateGallery(queryClient: QueryClient, venueId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListVenueImagesQueryKey(venueId) }),
    queryClient.invalidateQueries({ queryKey: getGetVenueQueryKey(venueId) }),
    queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() }),
  ]);
}
