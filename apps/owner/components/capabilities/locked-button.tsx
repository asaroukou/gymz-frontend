'use client';

import type { ComponentProps, ReactNode } from 'react';
import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
import { cn } from '@iziwellpass/ui/lib/utils';

import { BENEFIT_CAPABILITIES, minPlanFor } from '@/lib/capabilities';

import { usePlanLabel } from './capabilities-provider';
import { useUpgradeToast } from './use-upgrade-toast';

/**
 * A plan-locked action (`p6hCM`): focusable (`aria-disabled`, never
 * `disabled` — spec T11), tooltip on hover/focus, upgrade toast on activation
 * (touch has no hover). Never calls the API.
 */
export function LockedButton({
  capability,
  action,
  children,
  variant = 'outline',
  size,
  className,
}: {
  capability: Capability;
  /** Toast phrase, e.g. « ajouter un établissement ». */
  action: string;
  children: ReactNode;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const t = useTranslations('capabilities');
  const planLabel = usePlanLabel();
  const showUpgrade = useUpgradeToast();
  const plan = planLabel(minPlanFor(capability));
  const hasBenefit = BENEFIT_CAPABILITIES.includes(capability);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-disabled="true"
          className={cn('text-muted-foreground', className)}
          onClick={() => showUpgrade(capability, action)}
        >
          <LockIcon aria-hidden="true" />
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex max-w-[280px] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-left">
        <span className="text-md font-medium">{t('locked.availableWith', { plan })}</span>
        {hasBenefit ? (
          <span className="text-md font-normal text-primary-foreground/70">
            {t(`benefit.${capability as 'staff_accounts'}`)}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
