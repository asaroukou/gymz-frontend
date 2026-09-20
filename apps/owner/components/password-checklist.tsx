'use client';

import { CircleCheckIcon, CircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@iziwellpass/ui/lib/utils';

import { PASSWORD_RULES } from '@/lib/password';

/**
 * Muted checklist of the password policy that ticks live as the user types.
 * Predicates come from `lib/password.ts` so the checklist never drifts from
 * the schema. Shared between signup and login's new-password challenge.
 */
export function PasswordChecklist({ value }: { value: string }) {
  const t = useTranslations('auth.passwordChecklist');

  return (
    <ul className="grid gap-1.5" aria-label={t('label')}>
      {PASSWORD_RULES.map((rule) => {
        const satisfied = rule.test(value);
        return (
          <li
            key={rule.key}
            className={cn(
              'flex items-center gap-2 text-base transition-colors',
              satisfied ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {satisfied ? (
              <CircleCheckIcon aria-hidden className="size-4 shrink-0 text-success-foreground" />
            ) : (
              <CircleIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
            {t(rule.key)}
          </li>
        );
      })}
    </ul>
  );
}
