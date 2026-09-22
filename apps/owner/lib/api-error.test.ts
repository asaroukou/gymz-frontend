import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import { overrideFieldMessages } from './api-error';

describe('overrideFieldMessages', () => {
  it('rewrites the message of matching validation details and keeps the rest', () => {
    const err = new ApiError(
      400,
      {
        code: 'VALIDATION_ERROR',
        message: 'x',
        details: [
          { field: 'instructor_staff_id', message: 'server' },
          { field: 'title', message: 'required' },
        ],
      },
      'req-1',
    );
    const out = overrideFieldMessages(err, {
      instructor_staff_id: "Cet intervenant n'a pas accès à cette salle.",
    }) as ApiError;
    expect(out).not.toBe(err);
    expect(out.details).toEqual([
      { field: 'instructor_staff_id', message: "Cet intervenant n'a pas accès à cette salle." },
      { field: 'title', message: 'required' },
    ]);
    expect(out.requestId).toBe('req-1');
  });
  it('returns the same value when nothing matches or it is not a validation error', () => {
    const plain = new Error('x');
    expect(overrideFieldMessages(plain, { a: 'b' })).toBe(plain);
    const other = new ApiError(400, {
      code: 'VALIDATION_ERROR',
      message: 'x',
      details: [{ field: 'title', message: 'r' }],
    });
    expect(overrideFieldMessages(other, { instructor_staff_id: 'y' })).toBe(other);
  });
});
