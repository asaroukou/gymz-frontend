import { ApiError } from '@iziwellpass/api/client';
import type { Schedule } from '@iziwellpass/api/schemas';

/** `DELETE /venues/{vid}/resources/{rid}` → 409 when active schedules still use the room. */
export function isResourceInUse(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function activeSchedulesUsing(schedules: Schedule[], resourceId: string): Schedule[] {
  return schedules
    .filter((s) => s.is_active && s.resource_id === resourceId)
    .sort((a, b) => a.title.localeCompare(b.title));
}
