import { describe, expect, it } from 'vitest';

import { attendanceRange, kindLabelKey, lastVisit, methodBadge, visitMoment } from './attendance';

const now = new Date('2026-09-28T12:34:56');

describe('attendanceRange', () => {
  it('ends at the current minute and spans N days', () => {
    const r = attendanceRange(30, now);
    expect(new Date(r.to).getSeconds()).toBe(0);
    expect(Date.parse(r.to) - Date.parse(r.from)).toBe(30 * 86_400_000);
  });
});

describe('lastVisit', () => {
  it('is none without a visit', () => {
    expect(lastVisit(null, 'fr', now)).toEqual({ kind: 'none' });
  });
  it('says today', () => {
    expect(lastVisit('2026-09-28T07:12:00', 'fr', now)).toEqual({ kind: 'today', time: '07:12' });
  });
  it('says yesterday', () => {
    expect(lastVisit('2026-09-27T18:04:00', 'fr', now)).toEqual({ kind: 'yesterday', time: '18:04' });
  });
  it('gives a full date otherwise', () => {
    expect(lastVisit('2026-06-12T10:00:00', 'fr', now)).toEqual({ kind: 'date', date: '12 juin 2026' });
  });
});

describe('visitMoment', () => {
  it('formats weekday, day, short month and time', () => {
    expect(visitMoment('2026-09-27T18:04:00', 'fr')).toEqual({ day: 'dim. 27 sept.', time: '18:04' });
  });
});

describe('badges and kinds', () => {
  it('maps methods', () => {
    expect(methodBadge('qr')).toEqual({ labelKey: 'attendance.method.qr', variant: 'info' });
    expect(methodBadge('manual')).toEqual({ labelKey: 'attendance.method.manual', variant: 'default' });
    expect(methodBadge('wallet')).toEqual({ labelKey: 'attendance.method.wallet', variant: 'outline' });
  });
  it('maps kinds', () => {
    expect(kindLabelKey('booked')).toBe('attendance.kind.booked');
    expect(kindLabelKey('walk_in')).toBe('attendance.kind.walkIn');
  });
});
