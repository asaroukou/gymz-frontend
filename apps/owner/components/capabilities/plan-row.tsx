'use client';

import Link from 'next/link';
import { SparklesIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { canManagePlan } from '@/lib/capabilities';

import { useCapabilities, usePlanLabel } from './capabilities-provider';

/** « Plan Starter · Changer » above the venue switcher (`zCLZV`, spec §6.4). */
export function PlanRow({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations('capabilities.row');
  const role = useRole();
  const { status, plan } = useCapabilities();
  const planLabel = usePlanLabel();
  if (status !== 'ready' || !plan || !canManagePlan(role)) return null;
  const label = t('plan', { plan: planLabel(plan) });

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/plan"
            aria-label={label}
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent/60"
          >
            <SparklesIcon aria-hidden="true" className="size-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex h-9 w-full items-center gap-2 px-3.5 text-sm max-md:h-11">
      <SparklesIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <Link
        href="/plan"
        className="ml-auto inline-flex h-full items-center font-medium text-foreground hover:underline"
      >
        {t('change')}
      </Link>
    </div>
  );
}
