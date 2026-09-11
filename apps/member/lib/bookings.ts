const LABELS: Record<string, string> = {
  confirmed: 'bookings.status.confirmed',
  cancelled: 'bookings.status.cancelled',
  canceled: 'bookings.status.cancelled',
  checked_in: 'bookings.status.checked_in',
  pending: 'bookings.status.pending',
};

export function bookingStatusLabelKey(status: string): string {
  return LABELS[status.toLowerCase()] ?? 'bookings.status.pending';
}

export function isCancellable(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'confirmed' || s === 'pending';
}
