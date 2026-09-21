import type { BookingStatus, SlotStatus } from '@iziwellpass/api/schemas';

export type StatusBadgeVariant = 'success' | 'warning' | 'info' | 'outline';

/** Canvas `s8ABF`: Disponible (success), Complet (sable), Annulée (outline). */
export function slotBadgeVariant(status: SlotStatus): StatusBadgeVariant {
  switch (status) {
    case 'available':
      return 'success';
    case 'full':
      return 'warning';
    case 'cancelled':
    default:
      return 'outline';
  }
}

/** Canvas `skmEM`: Enregistré (success), Confirmé (info), Absent (sable), Annulé (outline). */
export function bookingBadgeVariant(status: BookingStatus): StatusBadgeVariant {
  switch (status) {
    case 'checked_in':
      return 'success';
    case 'confirmed':
      return 'info';
    case 'no_show':
      return 'warning';
    case 'cancelled':
    default:
      return 'outline';
  }
}
