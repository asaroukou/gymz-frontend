'use client';

import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { minPlanFor } from '@/lib/capabilities';

import { usePlanLabel } from './capabilities-provider';

/** Trailing lock on a nav item (`p6hCM` compact tooltip, title only). */
export function NavLock({ capability }: { capability: Capability }) {
  const t = useTranslations('capabilities.locked');
  const planLabel = usePlanLabel();
  const label = t('availableWith', { plan: planLabel(minPlanFor(capability)) });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center">
          <LockIcon aria-hidden="true" className="size-3.5!" />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
