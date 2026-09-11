import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import { ApiError } from '@iziwellpass/api/client';
import type { FieldErrorSchema } from '@iziwellpass/api/schemas';

/**
 * Shared error-to-toast message for every mutation/query error in the app.
 * Surfaces the caller's plain-language fallback and, when the server sent a
 * request id, a short `ref:` suffix support can grep logs for. The raw
 * machine code (FORBIDDEN, CONFLICT, …) is deliberately NOT shown: a
 * non-technical operator at the counter should never have to decode an enum
 * (PRODUCT.md principle 5). The code still travels in the ApiError for logging
 * and for callers that map a specific code to bespoke copy at the call site.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return fallback;
  }
  const ref = err.requestId ? ` · ref: ${err.requestId.slice(0, 8)}` : '';
  return `${fallback}${ref}`;
}

/**
 * `VALIDATION_ERROR` responses carry `details: { field, message }[]` (see
 * `FieldErrorSchema` / the Rust `AppError::Validation` serialization). This
 * is a defensive runtime check, not a type assertion — `details` is
 * `unknown` on the wire.
 */
function parseFieldErrorDetails(details: unknown): FieldErrorSchema[] | null {
  if (!Array.isArray(details)) {
    return null;
  }
  const parsed: FieldErrorSchema[] = [];
  for (const entry of details) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).field === 'string' &&
      typeof (entry as Record<string, unknown>).message === 'string'
    ) {
      parsed.push({
        field: (entry as Record<string, unknown>).field as string,
        message: (entry as Record<string, unknown>).message as string,
      });
    }
  }
  return parsed;
}

/**
 * Applies server-side field errors from a `VALIDATION_ERROR` ApiError onto
 * a react-hook-form instance, for every detail whose `field` matches a key
 * already present on the form's current values. Returns whether at least
 * one error was applied — callers should skip their toast fallback when
 * this returns true.
 */
export function applyFieldErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  err: unknown,
): boolean {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR') {
    return false;
  }
  const details = parseFieldErrorDetails(err.details);
  if (!details || details.length === 0) {
    return false;
  }

  const knownFields = new Set<string>(Object.keys(form.getValues()));
  let applied = false;
  for (const { field, message } of details) {
    if (knownFields.has(field)) {
      form.setError(field as Path<TFieldValues>, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
