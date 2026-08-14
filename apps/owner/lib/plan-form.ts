import { z } from 'zod';

import type {
  ActivityPlan,
  ActivityType,
  CreatePlanRequest,
  Currency,
  PlanKind,
  UpdatePlanRequest,
} from '@iziwellpass/api/schemas';

import { fromMinorUnits, toMinorUnits } from './money';

/**
 * Numeric fields are held as strings because they are text inputs: an empty
 * input must be distinguishable from zero (an entry_pack with `entry_count: 0`
 * is invalid, but a blank field is merely incomplete).
 */
export interface PlanFormValues {
  name: string;
  kind: PlanKind;
  price_major: string;
  price_currency: Currency;
  duration_days: string;
  entry_count: string;
  all_activities: boolean;
  /**
   * Held as `string[]`, not `ActivityType[]`: the zod schema validates this as
   * `z.array(z.string())`, and a narrower form type would not match what
   * `zodResolver` infers. Narrowed at the API boundary in `toCreatePlanRequest`.
   */
  activities: string[];
}

/** Validation copy, injected so the schema stays pure and testable. */
export interface PlanFormMessages {
  nameRequired: string;
  priceInvalid: string;
  durationRequired: string;
  entriesRequired: string;
  activitiesRequired: string;
}

/** Parses a positive integer from a text input; null when blank or invalid. */
function positiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * The API's rules, mirrored client-side so owners get inline errors instead of
 * a 400: a `subscription` needs `duration_days` and forbids `entry_count`; an
 * `entry_pack` needs `entry_count > 0` and may carry `duration_days` as an
 * expiry; a plan restricted to some activities needs a non-empty list.
 */
export function buildPlanSchema(m: PlanFormMessages) {
  return z
    .object({
      name: z.string().min(1, m.nameRequired),
      kind: z.enum(['subscription', 'entry_pack']),
      price_major: z.string(),
      price_currency: z.enum(['XOF', 'XAF', 'EUR', 'USD', 'GHS', 'NGN']),
      duration_days: z.string(),
      entry_count: z.string(),
      all_activities: z.boolean(),
      activities: z.array(z.string()),
    })
    .superRefine((val, ctx) => {
      const price = Number(val.price_major.trim());
      if (val.price_major.trim() === '' || Number.isNaN(price) || price < 0) {
        ctx.addIssue({ code: 'custom', path: ['price_major'], message: m.priceInvalid });
      }
      if (val.kind === 'subscription' && positiveInt(val.duration_days) === null) {
        ctx.addIssue({ code: 'custom', path: ['duration_days'], message: m.durationRequired });
      }
      if (val.kind === 'entry_pack' && positiveInt(val.entry_count) === null) {
        ctx.addIssue({ code: 'custom', path: ['entry_count'], message: m.entriesRequired });
      }
      if (!val.all_activities && val.activities.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['activities'], message: m.activitiesRequired });
      }
    });
}

/** Shared body fields for create and update. */
function commonFields(v: PlanFormValues) {
  return {
    name: v.name,
    price_amount_minor: toMinorUnits(Number(v.price_major.trim()), v.price_currency),
    price_currency: v.price_currency,
    all_activities: v.all_activities,
    // Narrowed here rather than in the form type — see PlanFormValues.activities.
    ...(v.all_activities ? {} : { activities: v.activities as ActivityType[] }),
  };
}

export function toCreatePlanRequest(v: PlanFormValues): CreatePlanRequest {
  const duration = positiveInt(v.duration_days);
  const entries = positiveInt(v.entry_count);
  return {
    ...commonFields(v),
    kind: v.kind,
    // A subscription must not carry entry_count at all, so omit rather than null.
    ...(duration !== null ? { duration_days: duration } : {}),
    ...(v.kind === 'entry_pack' && entries !== null ? { entry_count: entries } : {}),
  };
}

/** `kind`, `duration_days` and `entry_count` are not in UpdatePlanRequest. */
export function toUpdatePlanRequest(v: PlanFormValues): UpdatePlanRequest {
  return commonFields(v);
}

export function planToFormValues(plan: ActivityPlan): PlanFormValues {
  return {
    name: plan.name,
    kind: plan.kind,
    price_major: String(fromMinorUnits(plan.price_amount_minor, plan.price_currency)),
    price_currency: plan.price_currency,
    duration_days: plan.duration_days == null ? '' : String(plan.duration_days),
    entry_count: plan.entry_count == null ? '' : String(plan.entry_count),
    all_activities: plan.all_activities,
    activities: plan.activities,
  };
}
