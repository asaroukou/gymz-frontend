const LABELS: Record<string, string> = {
  confirmed: 'bookings.status.confirmed',
  cancelled: 'bookings.status.cancelled',
  canceled: 'bookings.status.cancelled',
  checked_in: 'bookings.status.checked_in',
  no_show: 'bookings.status.no_show',
};

export function bookingStatusLabelKey(status: string): string {
  return LABELS[status.toLowerCase()] ?? 'bookings.status.unknown';
}

export function isCancellable(status: string): boolean {
  return status.toLowerCase() === 'confirmed';
}
