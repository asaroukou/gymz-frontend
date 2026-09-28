import type { CheckIn, CheckInMethod, Staff } from '@iziwellpass/api/schemas';

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

export type MethodBadge = {
  labelKey: 'methodQr' | 'methodWallet' | 'methodManual';
  variant: 'info' | 'default';
};

/** Feed badge per check-in method: self-service scans (QR, wallet) in blue, staff entry neutral. */
export function methodBadge(method: CheckInMethod): MethodBadge {
  switch (method) {
    case 'qr':
      return { labelKey: 'methodQr', variant: 'info' };
    case 'wallet':
      return { labelKey: 'methodWallet', variant: 'info' };
    default:
      return { labelKey: 'methodManual', variant: 'default' };
  }
}
