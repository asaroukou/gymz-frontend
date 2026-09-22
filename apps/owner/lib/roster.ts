import type { SlotRosterEntry } from '@iziwellpass/api/schemas';

export interface RosterLabel {
  kind: 'member' | 'pass';
  name: string;
  /** True when the row shows no personal name (pass holder, coach view, or names withheld). */
  anonymous: boolean;
}

export function shortMemberId(id: string): string {
  return id.slice(-4).toUpperCase();
}

export function rosterLabel(
  entry: SlotRosterEntry,
  opts: { hideNames: boolean; passLabel: string; memberNumber: (id: string) => string },
): RosterLabel {
  if (entry.kind === 'pass_holder') {
    return { kind: 'pass', name: opts.passLabel, anonymous: true };
  }
  const full = `${entry.first_name ?? ''} ${entry.last_name ?? ''}`.trim();
  if (!opts.hideNames && full) {
    return { kind: 'member', name: full, anonymous: false };
  }
  return {
    kind: 'member',
    name: opts.memberNumber(shortMemberId(entry.member_id ?? entry.id)),
    anonymous: true,
  };
}

export function rosterInitials(entry: SlotRosterEntry): string {
  const initials =
    `${entry.first_name?.charAt(0) ?? ''}${entry.last_name?.charAt(0) ?? ''}`.toUpperCase();
  return initials || '?';
}
