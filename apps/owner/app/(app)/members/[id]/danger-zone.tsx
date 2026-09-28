'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { SuspendMemberDialog } from '../suspend-member-dialog';
import { ReactivateMemberDialog } from './reactivate-member-dialog';

/** « Zone sensible » (canvas `L6sMyP`): danger « Suspendre le membre » + secondary « Réactiver ». */
export function DangerZone({ member }: { member: StaffMemberView }) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const isSuspended = member.membership_status === 'suspended';
  const canSuspend = member.membership_status === 'active';

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.danger.title')}
        description={t('detail.danger.description')}
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={!canSuspend}>
          {isSuspended ? t('detail.danger.suspended') : t('detail.danger.suspend')}
        </Button>
        <Button variant="outline" onClick={() => setReactivateOpen(true)} disabled={!isSuspended}>
          {t('detail.danger.reactivate')}
        </Button>
      </div>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <ReactivateMemberDialog
        member={member}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
      />
    </section>
  );
}
