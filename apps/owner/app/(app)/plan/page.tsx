'use client';

/**
 * The comparison page behind the plan row and the nav locks (spec §7,
 * canvas `zCLZV`). Reads `NEXT_PUBLIC_SALES_EMAIL` (optional; no
 * `apps/owner/.env.example` exists to document it) — when unset, the
 * "contact us" action is hidden and the page falls back to `/plan` itself.
 */

import { CheckIcon, MinusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Plan } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { useCapabilities, usePlanLabel } from '@/components/capabilities/capabilities-provider';
import { RequirePageAccess } from '@/components/page-access';
import { ALL_CAPABILITIES, PLAN_CAPABILITIES, upgradeHref } from '@/lib/capabilities';

const COLUMNS: readonly Plan[] = ['free', 'starter', 'pro'];

/** Enterprise grants what Pro grants; it sits in the Pro column (spec §7). */
function columnOf(plan: string | undefined): Plan | null {
  if (plan === 'enterprise') return 'pro';
  return COLUMNS.find((c) => c === plan) ?? null;
}

function PlanContent() {
  const t = useTranslations('capabilities');
  const planLabel = usePlanLabel();
  const { status, plan } = useCapabilities();
  const current = columnOf(plan);
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  // The next tier up: free (or unknown) → Starter, anything else → Pro.
  const contactPlan: Plan = current === 'free' || current === null ? 'starter' : 'pro';

  const description =
    status === 'loading' ? (
      <Skeleton className="h-4 w-48" />
    ) : status === 'ready' && plan ? (
      t('page.current', { plan: planLabel(plan) })
    ) : (
      t('page.unknown')
    );

  const mark = (included: boolean) =>
    included ? (
      <CheckIcon aria-label={t('page.included')} className="size-4 text-success-foreground" />
    ) : (
      <MinusIcon aria-label={t('page.notIncluded')} className="size-4 text-muted-foreground" />
    );

  return (
    <WorkingPage>
      <WorkingHeader title={t('page.title')} subtitle={description} />
      <div className="flex max-w-[720px] flex-col gap-10">
        {/* Desktop: comparison grid. */}
        <div className="hidden md:block" role="table" aria-label={t('page.title')}>
          <div role="row" className="grid grid-cols-[1fr_repeat(3,7rem)] items-end gap-2 pb-3">
            <span role="columnheader" className="text-sm text-muted-foreground">
              {t('page.feature')}
            </span>
            {COLUMNS.map((column) => (
              <span
                key={column}
                role="columnheader"
                className="flex flex-col items-center gap-1.5 text-base font-medium"
              >
                {current === column ? (
                  <Badge>{plan === 'enterprise' ? planLabel('enterprise') : t('page.yours')}</Badge>
                ) : null}
                {planLabel(column)}
              </span>
            ))}
          </div>
          <div className="divide-y divide-border border-t border-border">
            {ALL_CAPABILITIES.map((cap) => (
              <div
                key={cap}
                role="row"
                className="grid min-h-12 grid-cols-[1fr_repeat(3,7rem)] items-center gap-2"
              >
                <span role="rowheader" className="text-base">
                  {t(`cap.${cap}`)}
                </span>
                {COLUMNS.map((column) => (
                  <span key={column} role="cell" className="flex justify-center">
                    {mark(PLAN_CAPABILITIES[column].includes(cap))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Phone: one block per plan. */}
        <div className="flex flex-col gap-8 md:hidden">
          {COLUMNS.map((column) => (
            <section key={column} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                {planLabel(column)}
                {current === column ? (
                  <Badge>{plan === 'enterprise' ? planLabel('enterprise') : t('page.yours')}</Badge>
                ) : null}
              </h2>
              <ul className="divide-y divide-border">
                {ALL_CAPABILITIES.map((cap) => (
                  <li key={cap} className="flex min-h-11 items-center justify-between gap-4">
                    <span className="text-base">{t(`cap.${cap}`)}</span>
                    {mark(PLAN_CAPABILITIES[column].includes(cap))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col items-start gap-3">
          {salesEmail?.trim() ? (
            <Button asChild>
              <a
                href={upgradeHref(
                  salesEmail,
                  t('page.mailSubject', { plan: planLabel(contactPlan) }),
                )}
              >
                {t('page.contact')}
              </a>
            </Button>
          ) : null}
          <p className="text-sm text-muted-foreground">{t('locked.relogin')}</p>
        </div>
      </div>
    </WorkingPage>
  );
}

export default function PlanPage() {
  return (
    <RequirePageAccess href="/plan">
      <PlanContent />
    </RequirePageAccess>
  );
}
