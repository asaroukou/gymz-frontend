import type { CheckIn, Staff } from '@iziwellpass/api/schemas';

/** Newest first; `limit` slices (the dashboard tab shows eight). */
export function feedRows(checkIns: readonly CheckIn[] | undefined, limit?: number): CheckIn[] {
  const rows = [...(checkIns ?? [])].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
  return limit === undefined ? rows : rows.slice(0, limit);
}

export interface RecordedByLabels {
  /** « Auto (QR) » — a QR self check-in has no recorder. */
  self: string;
  /** « l'équipe » — a recorder we cannot resolve; never the raw user id. */
  unknownStaff: string;
  /** « par {name} ». */
  by: (name: string) => string;
}

export function recordedByLabel(
  checkIn: CheckIn,
  staffByUserId: ReadonlyMap<string, Staff>,
  labels: RecordedByLabels,
): string {
  if (!checkIn.checked_in_by) return labels.self;
  const staff = staffByUserId.get(checkIn.checked_in_by);
  return labels.by(staff ? `${staff.first_name} ${staff.last_name}`.trim() : labels.unknownStaff);
}
