'use client';

import Link from 'next/link';
import { CheckIcon, LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

import {
  BENEFIT_CAPABILITIES,
  canManagePlan,
  CONSOLE_CAPABILITIES,
  minPlanFor,
  upgradeHref,
} from '@/lib/capabilities';

import { useCapabilities, usePlanLabel } from './capabilities-provider';

/** Full-page locked state (`zCLZV`, spec §6.2). */
export function LockedPage({ capability, title }: { capability: Capability; title: string }) {
  const t = useTranslations('capabilities');
  const role = useRole();
  const { has } = useCapabilities();
  const planLabel = usePlanLabel();
  const plan = planLabel(minPlanFor(capability));
  const benefit = BENEFIT_CAPABILITIES.includes(capability)
    ? t(`benefit.${capability as 'staff_accounts'}`)
    : '';
  const locked = CONSOLE_CAPABILITIES.filter((cap) => !has(cap));
  const granted = CONSOLE_CAPABILITIES.filter((cap) => has(cap));
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  const upgrade = upgradeHref(salesEmail, t('page.mailSubject', { plan }));
  // No sales e-mail configured: `upgradeHref` falls back to the internal
  // `/plan` route, which must go through next/link — a raw <a> would force a
  // full page reload for a same-app navigation.
  const isMailUpgrade = upgrade.startsWith('mailto:');

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-secondary">
          <LockIcon aria-hidden="true" className="size-6" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-normal">{title}</h1>
          <p className="text-md text-muted-foreground">
            {t('locked.description', { plan, benefit }).trim()}
          </p>
        </div>
        <ul className="w-full divide-y divide-border text-left">
          {[...locked, ...granted].map((cap) => {
            const isLocked = locked.includes(cap);
            return (
              <li key={cap} className="flex h-[38px] items-center gap-2.5 text-md">
                {isLocked ? (
                  <LockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                ) : (
                  <CheckIcon aria-hidden="true" className="size-4 text-success-foreground" />
                )}
                <span className={cn('flex-1', isLocked && 'text-muted-foreground')}>
                  {t(`cap.${cap}`)}
                </span>
                <span className="text-sm text-muted-strong">{planLabel(minPlanFor(cap))}</span>
              </li>
            );
          })}
        </ul>
        {canManagePlan(role) ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              {isMailUpgrade ? (
                <a href={upgrade}>{t('locked.upgrade', { plan })}</a>
              ) : (
                <Link href={upgrade}>{t('locked.upgrade', { plan })}</Link>
              )}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/plan">{t('locked.compare')}</Link>
            </Button>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">{t('locked.relogin')}</p>
      </div>
    </div>
  );
}
