'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import type { DirectoryScope } from '@/lib/member-search-query';
import { useVenueContext } from '@/lib/venue-context';

import { AddMemberDialog } from './add-member-dialog';
import { MembersDirectory } from './members-directory';

function MembersContent() {
  const t = useTranslations('members');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin' || role === 'receptionist';
  const { selectedVenue } = useVenueContext();

  // Lifted here (not in the directory) so the header subtitle follows it.
  const [scope, setScope] = useState<DirectoryScope>('venue');
  const [isEmpty, setIsEmpty] = useState(false);

  const subtitle = scope === 'all' ? t('scope.all') : selectedVenue?.name;

  return (
    <WorkingPage>
      <WorkingHeader
        title={t('title')}
        subtitle={subtitle}
        // cKk1G: the primary action moves into the empty state itself, so the
        // header shows no action while the directory has its first member to add.
        action={canManage && !isEmpty ? <AddMemberDialog /> : null}
      />

      <MembersDirectory
        canManage={canManage}
        scope={scope}
        onScopeChange={setScope}
        onEmptyChange={setIsEmpty}
      />
    </WorkingPage>
  );
}

export default function MembersPage() {
  return (
    <RequirePageAccess href="/members">
      <MembersContent />
    </RequirePageAccess>
  );
}
