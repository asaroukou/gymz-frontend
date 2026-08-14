'use client';

export function PlansList({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  return <div data-venue={venueId} data-can-manage={canManage} />;
}
