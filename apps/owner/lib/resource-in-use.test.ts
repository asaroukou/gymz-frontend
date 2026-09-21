import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import type { Schedule } from '@iziwellpass/api/schemas';
import { activeSchedulesUsing, isResourceInUse } from './resource-in-use';

const sched = (id: string, title: string, resource_id: string, is_active = true): Schedule => ({
  id,
  title,
  resource_id,
  is_active,
  tenant_id: 't',
  venue_id: 'v',
  start_time: '06:30:00',
  end_time: '07:30:00',
  effective_from: '2026-01-01',
  created_at: 'x',
  updated_at: 'x',
});

describe('isResourceInUse', () => {
  it('is true for a 409 ApiError only', () => {
    expect(
      isResourceInUse(
        new ApiError(409, { code: 'CONFLICT', message: 'Resource r has active schedules' }),
      ),
    ).toBe(true);
    expect(isResourceInUse(new ApiError(403, { code: 'FORBIDDEN', message: 'x' }))).toBe(false);
  });
});

describe('activeSchedulesUsing', () => {
  it('keeps active schedules of the resource, sorted by title', () => {
    const list = [
      sched('1', 'Yoga du soir', 'r1'),
      sched('2', 'Stretching', 'r1'),
      sched('3', 'Boxe', 'r2'),
      sched('4', 'Ancien', 'r1', false),
    ];
    expect(activeSchedulesUsing(list, 'r1').map((s) => s.title)).toEqual([
      'Stretching',
      'Yoga du soir',
    ]);
  });
});
