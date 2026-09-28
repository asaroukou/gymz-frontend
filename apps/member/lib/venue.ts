/**
 * The membership shown on the Carte (spec M7): the one for the first venue the
 * member is entitled to (the QR venue), else the first membership.
 */
export function pickMembership<T extends { venue_id: string }>(
  memberships: readonly T[] | undefined,
  venueIds: readonly string[] | undefined,
): T | null {
  if (!memberships || memberships.length === 0) return null;
  const first = venueIds?.[0];
  return memberships.find((m) => m.venue_id === first) ?? memberships[0] ?? null;
}
