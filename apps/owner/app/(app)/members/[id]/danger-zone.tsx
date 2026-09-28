'use client';

import { useState } from 'react';
import { LogOutIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import type { AccountView } from '@/lib/member-account';

import { SuspendMemberDialog } from '../suspend-member-dialog';
import { ReactivateMemberDialog } from './reactivate-member-dialog';

/**
 * « Zone sensible » (canvas `caWdo`, board `WeVjb`): one lifecycle button at a
 * time (« Suspendre le membre » when active, « Réactiver » when suspended,
 * none when expired or cancelled), then « Déconnecter de tous les appareils »
 * for a member with app access, owner/admin only. Stacked: both do not fit
 * side by side in the column. Renders nothing when there is no button.
 */
export function DangerZone({
  member,
  view,
  onSignOut,
}: {
  member: StaffMemberProfile;
  view: AccountView;
  onSignOut: () => void;
}) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const status = member.membership_status;
  const lifecycle = status === 'active' || status === 'suspended';

  if (!lifecycle && !view.canSignOut) return null;

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.danger.title')}
        description={t('detail.danger.description')}
      />
      <div className="flex flex-col items-start gap-2.5">
        {status === 'active' ? (
          <Button variant="destructive" onClick={() => setSuspendOpen(true)}>
            {t('detail.danger.suspend')}
          </Button>
        ) : null}
        {status === 'suspended' ? (
          <Button variant="outline" onClick={() => setReactivateOpen(true)}>
            {t('detail.danger.reactivate')}
          </Button>
        ) : null}
        {view.canSignOut ? (
          <Button
            variant="outline"
            className="text-destructive-foreground disabled:opacity-45"
            disabled={view.status?.runningAction === 'signOut'}
            onClick={onSignOut}
          >
            <LogOutIcon aria-hidden strokeWidth={1.5} />
            {t('account.signOut.open')}
          </Button>
        ) : null}
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
