/** Up to two initials from a name or an e-mail local part (« MD », « A »). */
export function initials(nameOrEmail: string): string {
  const local = nameOrEmail.split('@')[0] ?? '';
  const parts = local.split(/[\s._+-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '?';
}
