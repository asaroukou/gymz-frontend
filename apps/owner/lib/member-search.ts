import type { Member } from '@iziwellpass/api/schemas';

/** Lower-case, diacritics stripped: « Aïssatou » → « aissatou ». */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

/** « Awa Ndiaye · Actif » — what the command bar shows once a member is picked. */
export function memberLabel(member: Member, statusLabel: string): string {
  return `${memberName(member)} · ${statusLabel}`;
}

/** Never a raw id: two upper-cased initials, or « ? ». */
export function memberInitials(member: Member | undefined): string {
  if (!member) return '?';
  const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  return initials || '?';
}

/**
 * Type-ahead match for the walk-in command: the query must start a word of
 * the full name, or the full name itself (« awa n » → Awa Ndiaye). Case and
 * diacritics are ignored. Input order is preserved; `limit` caps the list.
 */
export function searchMembers(members: readonly Member[], query: string, limit = 8): Member[] {
  // Strip a trailing « · Actif » status suffix before folding: continuing to
  // type after picking a member (the field then reads « Awa Ndiaye · Actif »)
  // must keep searching the name, not match against the status text.
  const q = fold(query.replace(/\s·\s.*$/, '').trim());
  if (!q) return [];
  const out: Member[] = [];
  for (const member of members) {
    const full = fold(memberName(member));
    if (full.startsWith(q) || full.split(/\s+/).some((word) => word.startsWith(q))) {
      out.push(member);
      if (out.length >= limit) break;
    }
  }
  return out;
}
