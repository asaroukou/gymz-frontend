import type { MemberLoginMode, MemberLoginPolicy } from '@iziwellpass/api/schemas';

/**
 * Derives the Réglages page's three booleans from the tenant's member-login
 * policy and the radio selection (spec Flow 14, task 9). `locked` disables
 * the « Avec l'app » row when roster is configured and the plan lacks
 * `member_self_service`; `downgraded` shows the warning banner when `login`
 * is configured but no longer covered by the plan; `dirty` gates the save
 * button on the selection differing from what is configured.
 */
export function settingsView(
  policy: MemberLoginPolicy,
  selection: MemberLoginMode,
): { locked: boolean; downgraded: boolean; dirty: boolean } {
  return {
    locked: !policy.capability_available && policy.configured_mode === 'roster',
    downgraded: policy.configured_mode === 'login' && policy.downgrade_reason != null,
    dirty: selection !== policy.configured_mode,
  };
}
