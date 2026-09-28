'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { SuspendMemberDialog } from '../suspend-member-dialog';

/** « Zone sensible » (canvas `L6sMyP`): danger « Suspendre le membre » + secondary « Réactiver ». */
export function DangerZone({ member }: { member: StaffMemberView }) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = member.membership_status === 'suspended';

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.danger.title')}
        description={t('detail.danger.description')}
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={isSuspended}>
          {isSuspended ? t('detail.danger.suspended') : t('detail.danger.suspend')}
        </Button>
        {/*
          No unsuspend / reactivate endpoint exists in the API (only
          `suspendMember`). The affordance is rendered disabled with a
          "coming soon" tooltip rather than wired to a nonexistent path.
        */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" disabled aria-disabled className="pointer-events-none">
                {t('detail.danger.reactivate')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('detail.danger.reactivateSoon')}</TooltipContent>
        </Tooltip>
      </div>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
    </section>
  );
}
