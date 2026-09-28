import type {
  MemberAccountMode,
  MembershipType,
  UpdateMemberRequest,
} from '@iziwellpass/api/schemas';

/** The edit form's values (strings as typed; empty means « not set »). */
export interface MemberFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type: MembershipType;
  membership_end: string;
  notes: string;
}

/**
 * The `PUT /gms/v1/members/{mid}` payload. Never carries `is_active` (the
 * backend rejects unknown fields). A login member's e-mail changes only through
 * the secure flow, so the key is left out entirely for them. `expected_version`
 * is the member's `version` as last loaded, echoed verbatim (optimistic
 * concurrency: a mismatch is a 409 and nothing is written).
 */
export function buildMemberUpdate(
  values: MemberFormValues,
  ctx: { mode: MemberAccountMode; version: string },
): { data: UpdateMemberRequest; params: { expected_version: string } } {
  const data: UpdateMemberRequest = {
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone || null,
    membership_type: values.membership_type,
    membership_end: values.membership_end || null,
    notes: values.notes || null,
  };
  if (ctx.mode !== 'login') {
    data.email = values.email || null;
  }
  return { data, params: { expected_version: ctx.version } };
}
